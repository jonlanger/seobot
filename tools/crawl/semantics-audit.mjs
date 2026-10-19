#!/usr/bin/env node
/**
 * Semantics / page-structure / information-architecture audit crawler.
 *
 * For each site, two passes with the SAME extraction logic:
 *   1. RAW      — plain HTTP fetch, parsed in a JS-disabled browser context
 *   2. RENDERED — headless Chromium, hydrated DOM
 *
 * Collects semantic-HTML, heading, landmark, structured-data, link, image,
 * form, content, FAQ and IA signals so we can compare what crawlers vs
 * browsers actually see, and publish a "state of semantic HTML on top sites"
 * dataset.
 *
 * Output:
 *   out/semantics/{domain}.json   — per-site record (raw + rendered metrics)
 *   out/semantics-results.json    — aggregated records + summary stats
 *   out/semantics-summary.md      — study summary tables
 *
 * Usage:
 *   cd tools/crawl
 *   node semantics-audit.mjs --list data/top-500.json --limit 60 --concurrency 3
 */
import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SANITY_LIST = [
  "nytimes.com", "bbc.com", "theguardian.com", "medium.com",
  "amazon.com", "walmart.com", "etsy.com", "shopify.com",
  "github.com", "microsoft.com", "apple.com", "cloudflare.com",
  "stripe.com", "vercel.com", "notion.so", "webflow.com", "figma.com",
  "en.wikipedia.org", "reddit.com", "stackoverflow.com",
];

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36; " +
  "SeobotResearchBot/0.1 (+https://seobot.example/bot)";

const RAW_TIMEOUT_MS = 20_000;
const RENDER_TIMEOUT_MS = 30_000;
const SETTLE_MS = 2_500;

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};
const flag = (name) => argv.includes(name);

const OUT_DIR = path.resolve(arg("--out", path.join(import.meta.dirname, "out", "semantics")));
const CONCURRENCY = Number(arg("--concurrency", "3"));
const LIMIT = Number(arg("--limit", "0"));
const LIST_PATH = arg("--list", "");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,*/*" },
    });
    const body = await res.text();
    return { status: res.status, finalUrl: res.url, body };
  } catch (error) {
    return { status: 0, finalUrl: url, body: "", error: String(error?.message ?? error) };
  } finally {
    clearTimeout(timer);
  }
}

const AUDIT_FN = (domain) => {
  const BASE = "https://" + domain;
  const ORIGIN = BASE;
  const q = (sel) => Array.from(document.querySelectorAll(sel));
  const headings = {};
  for (let i = 1; i <= 6; i++) headings["h" + i] = q("h" + i).length;
  const allH = q("h1,h2,h3,h4,h5,h6");
  let skipped = 0;
  let first = true;
  let prev = 0;
  let validSeq = true;
  for (const h of allH) {
    const lvl = parseInt(h.tagName[1], 10);
    if (first) { if (lvl !== 1) validSeq = false; first = false; }
    else { if (lvl > prev + 1) skipped++; }
    prev = lvl;
  }
  if (allH.length === 0) validSeq = false;

  const landmarkTags = ["header", "nav", "main", "article", "section", "aside", "footer", "time", "figure", "figcaption", "details", "summary", "mark", "address"];
  const landmarkCounts = {};
  let semanticCount = 0;
  for (const t of landmarkTags) {
    const c = q(t).length;
    landmarkCounts[t] = c;
    semanticCount += c;
  }

  const ariaRoles = q("[role]").length;
  const ariaLabel = q("[aria-label]").length;
  const ariaLabelledby = q("[aria-labelledby]").length;

  const ul = q("ul").length, ol = q("ol").length, dl = q("dl").length;
  const li = q("li").length;

  const tables = q("table").length;
  const th = q("th").length;
  const tableCaptions = q("caption").length;

  const links = q("a[href]");
  let internal = 0, external = 0;
  const uniqueInternal = new Set();
  for (const a of links) {
    try {
      const u = new URL(a.getAttribute("href"), BASE + "/");
      if (u.origin === ORIGIN || u.origin === "null") { internal++; uniqueInternal.add(u.pathname); }
      else external++;
    } catch { internal++; }
  }
  const navLinks = q("nav a[href]").length;
  const footerLinks = q("footer a[href]").length;

  const imgs = q("img");
  let imgAlt = 0, imgEmptyAlt = 0, imgNoAlt = 0;
  imgs.forEach((i) => {
    const alt = i.getAttribute("alt");
    if (alt === null) imgNoAlt++;
    else if (alt.trim() === "") imgEmptyAlt++;
    else imgAlt++;
  });

  const forms = q("form").length;
  const inputs = q("input,select,textarea").length;
  const labels = q("label").length;

  const jsonLdScripts = q('script[type="application/ld+json"]');
  const jsonLdTypes = [];
  for (const s of jsonLdScripts) {
    try {
      const data = JSON.parse(s.textContent);
      const collect = (o) => {
        if (!o || typeof o !== "object") return;
        if (Array.isArray(o)) { o.forEach(collect); return; }
        if (o["@type"]) {
          const t = Array.isArray(o["@type"]) ? o["@type"] : [o["@type"]];
          t.forEach((x) => { if (!jsonLdTypes.includes(x)) jsonLdTypes.push(x); });
        }
        for (const k of Object.keys(o)) if (typeof o[k] === "object") collect(o[k]);
      };
      collect(data);
    } catch {}
  }
  const microdata = q("[itemscope]").length;
  const rdfa = q("[property]").length;

  const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute("content") || "";
  const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "";
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content") || "";
  const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute("content") || "";
  const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute("content") || "";
  const twitterCard = document.querySelector('meta[name="twitter:card"]')?.getAttribute("content") || "";
  const robotsMeta = document.querySelector('meta[name="robots"]')?.getAttribute("content") || "";
  const viewport = document.querySelector('meta[name="viewport"]')?.getAttribute("content") || "";
  const lang = document.documentElement.getAttribute("lang") || "";
  const charset = document.characterSet || "";

  const bodyText = document.body ? document.body.innerText : "";
  const words = bodyText.trim().split(/\s+/).filter(Boolean).length;
  const paragraphs = q("p");
  const paraCount = paragraphs.length;
  const avgPara = paraCount
    ? Math.round(paragraphs.reduce((a, p) => a + (p.innerText || "").trim().split(/\s+/).filter(Boolean).length, 0) / paraCount)
    : 0;

  const sectionsWithHeading = q("section").filter((s) => s.querySelector("h1,h2,h3,h4,h5,h6")).length;

  const details = q("details").length;
  const summaryQ = q("summary").filter((s) => /\?/.test(s.textContent)).length;
  const headingQuestions = q("h2,h3,h4").filter((h) => /\?$/.test(h.textContent.trim())).length;

  const breadcrumbNav = q("nav").filter((n) => /breadcrumb/i.test(n.getAttribute("aria-label") || "") || /breadcrumb/i.test(n.className || "")).length;
  const breadcrumbOl = q("ol").filter((o) => o.querySelector("li a") && /breadcrumb/i.test(o.className || "")).length;

  const skipLink = q("a").some((a) => /skip to (main|content)/i.test(a.textContent));

  const totalElements = document.querySelectorAll("*").length;
  const semanticRatio = totalElements ? +(semanticCount / totalElements).toFixed(4) : 0;

  const title = document.title || "";

  return {
    titleLength: title.length,
    metaDescriptionLength: metaDesc.length,
    hasCanonical: !!canonical,
    hasOgTitle: !!ogTitle,
    hasOgDesc: !!ogDesc,
    hasOgImage: !!ogImage,
    hasTwitterCard: !!twitterCard,
    hasViewport: !!viewport,
    hasLang: !!lang,
    lang,
    robotsMeta,
    charset,
    headings,
    h1Count: headings.h1,
    headingSequenceValid: validSeq && skipped === 0,
    skippedHeadingLevels: skipped,
    multipleH1: headings.h1 > 1,
    landmarkCounts,
    semanticElementCount: semanticCount,
    totalElements,
    semanticRatio,
    ariaRoles,
    ariaLabel,
    ariaLabelledby,
    lists: { ul, ol, dl, li },
    tables: { count: tables, th, captions: tableCaptions },
    links: { total: links.length, internal, external, nav: navLinks, footer: footerLinks, uniqueInternal: uniqueInternal.size },
    images: { total: imgs.length, withAlt: imgAlt, emptyAlt: imgEmptyAlt, noAlt: imgNoAlt },
    forms: { count: forms, inputs, labels },
    structuredData: { jsonLdTypes, jsonLdScripts: jsonLdScripts.length, microdata, rdfa },
    content: { wordCount: words, paragraphCount: paraCount, avgParagraphWords: avgPara },
    sectionsWithHeading,
    faqSignals: { details, summaryQuestions: summaryQ, headingQuestions },
    breadcrumbs: { nav: breadcrumbNav, ol: breadcrumbOl },
    skipLink,
  };
};

async function auditSite(browser, domain) {
  const url = `https://${domain}`;
  const record = { domain, url, fetchedAt: new Date().toISOString(), raw: null, rendered: null, error: null };

  // raw fetch
  const rawFetch = await fetchText(url, RAW_TIMEOUT_MS);
  record.rawStatus = rawFetch.status;
  record.rawFinalUrl = rawFetch.finalUrl;
  if (rawFetch.error) record.rawError = rawFetch.error;

  // parse raw in JS-disabled context
  const rawCtx = await browser.newContext({ javaScriptEnabled: false, userAgent: UA });
  const rawPage = await rawCtx.newPage();
  try {
    await rawPage.setContent(rawFetch.body || "", { waitUntil: "domcontentloaded", timeout: RAW_TIMEOUT_MS });
    record.raw = await rawPage.evaluate(AUDIT_FN, domain);
  } catch (e) {
    record.rawError = String(e?.message ?? e);
  } finally {
    await rawPage.close();
    await rawCtx.close();
  }

  // rendered pass
  const renderCtx = await browser.newContext({ userAgent: UA });
  const renderPage = await renderCtx.newPage();
  try {
    await renderPage.goto(url, { waitUntil: "networkidle", timeout: RENDER_TIMEOUT_MS });
    await sleep(SETTLE_MS);
    record.renderedStatus = 200;
    record.rendered = await renderPage.evaluate(AUDIT_FN, domain);
  } catch (e) {
    record.renderedError = String(e?.message ?? e);
    // try domcontentloaded fallback
    try {
      await renderPage.goto(url, { waitUntil: "domcontentloaded", timeout: RENDER_TIMEOUT_MS });
      await sleep(SETTLE_MS);
      record.rendered = await renderPage.evaluate(AUDIT_FN, domain);
      record.renderedStatus = 200;
    } catch (e2) {
      record.renderedError = String(e2?.message ?? e2);
    }
  } finally {
    await renderPage.close();
    await renderCtx.close();
  }

  return record;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  let sites = [];
  if (LIST_PATH) {
    const data = JSON.parse(await readFile(LIST_PATH, "utf8"));
    sites = (data.sites || data).map((s) => (typeof s === "string" ? s : s.domain));
  } else {
    sites = [...SANITY_LIST];
  }
  if (LIMIT > 0) sites = sites.slice(0, LIMIT);

  console.log(`Auditing ${sites.length} sites (concurrency ${CONCURRENCY})...`);

  const browser = await chromium.launch({ headless: true });
  const results = [];
  let i = 0;
  const worker = async () => {
    while (i < sites.length) {
      const idx = i++;
      const domain = sites[idx];
      const outPath = path.join(OUT_DIR, `${domain.replace(/[^a-z0-9.-]/gi, "_")}.json`);
      try {
        const rec = await auditSite(browser, domain);
        await writeFile(outPath, JSON.stringify(rec, null, 2));
        results.push(rec);
        console.log(`[${idx + 1}/${sites.length}] ${domain} raw=${rec.rawStatus} rendered=${rec.rendered ? "ok" : "fail"}`);
      } catch (e) {
        console.error(`[${idx + 1}/${sites.length}] ${domain} FAILED: ${e?.message ?? e}`);
      }
      await sleep(500);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  await browser.close();

  await writeFile(path.join(OUT_DIR, "..", "semantics-results.json"), JSON.stringify(results, null, 2));
  console.log(`Done. ${results.length} records → ${OUT_DIR}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
