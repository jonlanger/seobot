#!/usr/bin/env node
/**
 * Deep-page (money-page) semantic audit: for each site, discover one internal
 * deep link from the homepage, then run the same semantic audit on that page.
 * Purpose: measure breadcrumbs, tables, FAQ, headings adoption where they
 * actually live (not on homepages).
 */
import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36; SeobotResearchBot/0.1 (+https://seobot.example/bot)";
const RAW_TIMEOUT_MS = 20_000;
const RENDER_TIMEOUT_MS = 30_000;
const SETTLE_MS = 2_500;

const argv = process.argv.slice(2);
const arg = (name, fallback) => { const i = argv.indexOf(name); return i !== -1 && argv[i+1] && !argv[i+1].startsWith("--") ? argv[i+1] : fallback; };
const flag = (name) => argv.includes(name);
const OUT_DIR = path.resolve(arg("--out", path.join(import.meta.dirname, "out", "deep-pages")));
const CONCURRENCY = Number(arg("--concurrency", "2"));
const LIMIT = Number(arg("--limit", "0"));
const LIST_PATH = arg("--list", "");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function fetchText(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { redirect: "follow", signal: controller.signal, headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,*/*" } });
    const body = await res.text();
    return { status: res.status, finalUrl: res.url, body };
  } catch (e) { return { status: 0, finalUrl: url, body: "", error: String(e?.message ?? e) }; }
  finally { clearTimeout(timer); }
}

// Reuse the same audit function as semantics-audit.mjs
const AUDIT_FN = (domain) => {
  const BASE = "https://" + domain;
  const ORIGIN = BASE;
  const q = (sel) => Array.from(document.querySelectorAll(sel));
  const headings = {}; for (let i=1;i<=6;i++) headings["h"+i]=q("h"+i).length;
  const allH = q("h1,h2,h3,h4,h5,h6");
  let skipped=0, first=true, prev=0, validSeq=true;
  for (const h of allH){ const lvl=parseInt(h.tagName[1],10); if(first){if(lvl!==1)validSeq=false;first=false;} else {if(lvl>prev+1)skipped++;} prev=lvl; }
  if(allH.length===0) validSeq=false;
  const landmarkTags=["header","nav","main","article","section","aside","footer","time","figure","figcaption","details","summary","mark","address"];
  const landmarkCounts={}; let semanticCount=0;
  for(const t of landmarkTags){const c=q(t).length;landmarkCounts[t]=c;semanticCount+=c;}
  const ariaRoles=q("[role]").length; const ariaLabel=q("[aria-label]").length; const ariaLabelledby=q("[aria-labelledby]").length;
  const ul=q("ul").length, ol=q("ol").length, dl=q("dl").length, li=q("li").length;
  const tables=q("table").length, th=q("th").length, tableCaptions=q("caption").length;
  const links=q("a[href]"); let internal=0,external=0; const uniqueInternal=new Set();
  for(const a of links){ try{const u=new URL(a.getAttribute("href"), BASE+"/"); if(u.origin===ORIGIN||u.origin==="null"){internal++;uniqueInternal.add(u.pathname);}else external++;}catch{internal++;} }
  const navLinks=q("nav a[href]").length; const footerLinks=q("footer a[href]").length;
  const imgs=q("img"); let imgAlt=0,imgEmptyAlt=0,imgNoAlt=0;
  imgs.forEach(i=>{const alt=i.getAttribute("alt"); if(alt===null)imgNoAlt++; else if(alt.trim()==="")imgEmptyAlt++; else imgAlt++;});
  const forms=q("form").length; const inputs=q("input,select,textarea").length; const labels=q("label").length;
  const jsonLdScripts=q('script[type="application/ld+json"]'); const jsonLdTypes=[];
  for(const s of jsonLdScripts){ try{const data=JSON.parse(s.textContent); const collect=o=>{if(!o||typeof o!=="object")return; if(Array.isArray(o)){o.forEach(collect);return;} if(o["@type"]){const t=Array.isArray(o["@type"])?o["@type"]:[o["@type"]]; t.forEach(x=>{if(!jsonLdTypes.includes(x))jsonLdTypes.push(x);});} for(const k of Object.keys(o)) if(typeof o[k]==="object") collect(o[k]);}; collect(data);}catch{} }
  const microdata=q("[itemscope]").length; const rdfa=q("[property]").length;
  const metaDesc=document.querySelector('meta[name="description"]')?.getAttribute("content")||"";
  const canonical=document.querySelector('link[rel="canonical"]')?.getAttribute("href")||"";
  const ogTitle=document.querySelector('meta[property="og:title"]')?.getAttribute("content")||"";
  const ogDesc=document.querySelector('meta[property="og:description"]')?.getAttribute("content")||"";
  const ogImage=document.querySelector('meta[property="og:image"]')?.getAttribute("content")||"";
  const twitterCard=document.querySelector('meta[name="twitter:card"]')?.getAttribute("content")||"";
  const robotsMeta=document.querySelector('meta[name="robots"]')?.getAttribute("content")||"";
  const viewport=document.querySelector('meta[name="viewport"]')?.getAttribute("content")||"";
  const lang=document.documentElement.getAttribute("lang")||"";
  const charset=document.characterSet||"";
  const bodyText=document.body?document.body.innerText:"";
  const words=bodyText.trim().split(/\s+/).filter(Boolean).length;
  const paragraphs=q("p"); const paraCount=paragraphs.length;
  const avgPara=paraCount?Math.round(paragraphs.reduce((a,p)=>a+(p.innerText||"").trim().split(/\s+/).filter(Boolean).length,0)/paraCount):0;
  const sectionsWithHeading=q("section").filter(s=>s.querySelector("h1,h2,h3,h4,h5,h6")).length;
  const details=q("details").length;
  const summaryQ=q("summary").filter(s=>/\?/.test(s.textContent)).length;
  const headingQuestions=q("h2,h3,h4").filter(h=>/\?$/.test(h.textContent.trim())).length;
  const breadcrumbNav=q("nav").filter(n=>/breadcrumb/i.test(n.getAttribute("aria-label")||"")||/breadcrumb/i.test(n.className||"")).length;
  const breadcrumbOl=q("ol").filter(o=>o.querySelector("li a")&&/breadcrumb/i.test(o.className||"")).length;
  const skipLink=q("a").some(a=>/skip to (main|content)/i.test(a.textContent));
  const totalElements=document.querySelectorAll("*").length;
  const semanticRatio=totalElements?+(semanticCount/totalElements).toFixed(4):0;
  const title=document.title||"";
  return {
    titleLength:title.length, metaDescriptionLength:metaDesc.length, hasCanonical:!!canonical, hasOgTitle:!!ogTitle, hasOgDesc:!!ogDesc, hasOgImage:!!ogImage, hasTwitterCard:!!twitterCard, hasViewport:!!viewport, hasLang:!!lang, lang, robotsMeta, charset,
    headings, h1Count:headings.h1, headingSequenceValid:validSeq&&skipped===0, skippedHeadingLevels:skipped, multipleH1:headings.h1>1,
    landmarkCounts, semanticElementCount:semanticCount, totalElements, semanticRatio, ariaRoles, ariaLabel, ariaLabelledby,
    lists:{ul,ol,dl,li}, tables:{count:tables,th,captions:tableCaptions},
    links:{total:links.length,internal,external,nav:navLinks,footer:footerLinks,uniqueInternal:uniqueInternal.size},
    images:{total:imgs.length,withAlt:imgAlt,emptyAlt:imgEmptyAlt,noAlt:imgNoAlt},
    forms:{count:forms,inputs,labels},
    structuredData:{jsonLdTypes,jsonLdScripts:jsonLdScripts.length,microdata,rdfa},
    content:{wordCount:words,paragraphCount:paraCount,avgParagraphWords:avgPara},
    sectionsWithHeading, faqSignals:{details,summaryQuestions:summaryQ,headingQuestions}, breadcrumbs:{nav:breadcrumbNav,ol:breadcrumbOl}, skipLink,
  };
};

function pickDeepLink(html, baseDomain) {
  const matches = [...html.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
  const base = "https://" + baseDomain;
  const KEYWORDS = ["pricing","features","product","docs","documentation","blog","about","solutions","resources","learn","guides","customers","case-studies","enterprise","platform","security"];
  const candidates = [];
  for (const href of matches) {
    try {
      const u = new URL(href, base);
      if (u.origin !== base) continue;
      if (u.search) continue;
      const p = u.pathname;
      if (p === "/" || p.length < 3 || p.length > 60) continue;
      if (/\.[a-z0-9]{2,6}$/i.test(p)) continue;
      const segs = p.split("/").filter(Boolean);
      if (segs.length < 1 || segs.length > 4) continue;
      if (segs.some((s) => s.length > 40)) continue;
      if (/_/.test(p) && p.length > 30) continue;
      if (/font|css|assets|static|_next|webpack|login|signup|signin|api/i.test(p)) continue;
      const score = KEYWORDS.reduce((a,k)=> a + (p.toLowerCase().includes(k)?10:0), 0) + (4 - segs.length);
      candidates.push({ url: u.href, score });
    } catch {}
  }
  if (candidates.length === 0) return null;
  candidates.sort((a,b)=>b.score-a.score);
  return candidates[0].url;
}

async function auditUrl(browser, url) {
  const domain = new URL(url).host;
  const rawFetch = await fetchText(url, RAW_TIMEOUT_MS);
  const rawCtx = await browser.newContext({ javaScriptEnabled: false, userAgent: UA });
  const rawPage = await rawCtx.newPage();
  let raw = null;
  try {
    await rawPage.setContent(rawFetch.body || "", { waitUntil: "domcontentloaded", timeout: RAW_TIMEOUT_MS });
    raw = await rawPage.evaluate(AUDIT_FN, domain);
  } catch (e) { /* ignore */ }
  finally { await rawPage.close(); await rawCtx.close(); }
  const renderCtx = await browser.newContext({ userAgent: UA });
  const renderPage = await renderCtx.newPage();
  let rendered = null;
  try {
    await renderPage.goto(url, { waitUntil: "networkidle", timeout: RENDER_TIMEOUT_MS });
    await sleep(SETTLE_MS);
    rendered = await renderPage.evaluate(AUDIT_FN, domain);
  } catch (e) {
    try {
      await renderPage.goto(url, { waitUntil: "domcontentloaded", timeout: RENDER_TIMEOUT_MS });
      await sleep(SETTLE_MS);
      rendered = await renderPage.evaluate(AUDIT_FN, domain);
    } catch (e2) {}
  } finally { await renderPage.close(); await renderCtx.close(); }
  return { url, rawStatus: rawFetch.status, raw, rendered };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  let sites = [];
  if (LIST_PATH) {
    const data = JSON.parse(await readFile(LIST_PATH, "utf8"));
    sites = (data.sites || data).map(s => (typeof s === "string" ? s : s.domain));
  }
  if (LIMIT > 0) sites = sites.slice(0, LIMIT);

  const browser = await chromium.launch({ headless: true });
  const results = [];
  let i = 0;
  const worker = async () => {
    while (i < sites.length) {
      const idx = i++;
      const domain = sites[idx];
      const homeUrl = "https://" + domain;
      const homeFetch = await fetchText(homeUrl, RAW_TIMEOUT_MS);
      const deepUrl = pickDeepLink(homeFetch.body, domain);
      if (!deepUrl) { console.log(`[${idx+1}/${sites.length}] ${domain} no deep link`); continue; }
      try {
        const rec = await auditUrl(browser, deepUrl);
        rec.domain = domain;
        await writeFile(path.join(OUT_DIR, `${domain.replace(/[^a-z0-9.-]/gi,"_")}.json`), JSON.stringify(rec, null, 2));
        results.push(rec);
        console.log(`[${idx+1}/${sites.length}] ${domain} -> ${deepUrl} raw=${rec.rawStatus} rendered=${rec.rendered?"ok":"fail"}`);
      } catch (e) { console.error(`[${idx+1}/${sites.length}] ${domain} FAILED ${e?.message||e}`); }
      await sleep(300);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  await browser.close();
  await writeFile(path.join(OUT_DIR, "..", "deep-page-results.json"), JSON.stringify(results, null, 2));
  console.log(`Done. ${results.length} deep pages.`);
}
main().catch(e=>{console.error(e);process.exit(1);});