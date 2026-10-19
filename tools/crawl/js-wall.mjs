#!/usr/bin/env node
/**
 * JS-wall study crawler — how much of a page's visible content would a
 * non-JavaScript AI crawler actually receive?
 *
 * For each site, two passes with the SAME user agent (so JavaScript execution
 * is the only variable):
 *
 *   1. RAW      — plain HTTP fetch, no JS (what GPTBot/PerplexityBot/etc. get)
 *   2. RENDERED — headless Chromium, hydrated DOM (what humans/browser agents get)
 *
 * Plus a full robots.txt policy scoring pass across the major AI + search
 * crawler tokens (RFC 9309 group semantics, specific-group-over-wildcard).
 *
 * Output (per run):
 *   out/sites/{domain}.json   — append-only run records (median-of-N ready)
 *   out/robots/{domain}.txt   — raw robots.txt when fetchable
 *   out/raw/{domain}.html     — raw HTML snapshot (only with --save-raw)
 *   out/results.json          — aggregated latest-run records (written at end)
 *   out/summary.md            — study summary tables (written at end)
 *
 * Politeness: wildcard robots.txt rules honoured; per-domain requests are
 * sequential; ≤ concurrency sites in flight; identifying UA; hard timeouts.
 *
 * Usage:
 *   node js-wall.mjs --list data/top-500.json --concurrency 3    # production
 *   node js-wall.mjs --limit 10                                   # quick sanity (20-site built-in list)
 *   node js-wall.mjs --list data/top-500.json --force             # re-crawl (appends a new run)
 */
import { chromium } from "playwright";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

/* ------------------------------- config ------------------------------- */

const SANITY_LIST = [
  "nytimes.com", "bbc.com", "theguardian.com", "medium.com",
  "amazon.com", "walmart.com", "etsy.com", "shopify.com",
  "github.com", "microsoft.com", "apple.com", "cloudflare.com",
  "stripe.com", "vercel.com", "notion.so", "webflow.com", "figma.com",
  "en.wikipedia.org", "reddit.com", "stackoverflow.com",
];

const ROBOTS_TOKENS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",
  "ClaudeBot", "Claude-SearchBot", "Claude-User",
  "PerplexityBot", "Perplexity-User",
  "Google-Extended", "Applebot-Extended", "CCBot", "Bytespider",
  "Meta-ExternalAgent", "Amazonbot", "anthropic-ai",
  "Googlebot", "Bingbot",
];

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36; " +
  "SeobotResearchBot/0.1 (+https://seobot.example/bot)";

const RAW_TIMEOUT_MS = 20_000;
const RENDER_TIMEOUT_MS = 30_000;
const DEFAULT_SETTLE_MS = 2_500;

/* ------------------------------- args ------------------------------- */

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};
const flag = (name) => argv.includes(name);

const OUT_DIR = path.resolve(arg("--out", path.join(import.meta.dirname, "out")));
const CONCURRENCY = Number(arg("--concurrency", "3"));
const LIMIT = Number(arg("--limit", "0"));
const SETTLE_MS = Number(arg("--settle", String(DEFAULT_SETTLE_MS)));
const FORCE = flag("--force");
const SAVE_RAW = flag("--save-raw");
const LIST_PATH = arg("--list", "");

/* ------------------------------- helpers ------------------------------- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (n) => `${n.toFixed(1)}%`;
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);
const median = (arr) => (arr.length ? [...arr].sort((a, b) => a - b)[Math.floor(arr.length / 2)] : null);
const percentile = (arr, p) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

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

/* ----------------------------- robots.txt ----------------------------- */

function parseRobotsGroups(text) {
  const groups = [];
  let current = null;
  let sawRule = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split("#")[0]?.trim() ?? "";
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (field === "user-agent") {
      if (!current || sawRule) {
        current = { agents: [], rules: [] };
        groups.push(current);
        sawRule = false;
      }
      current.agents.push(value.toLowerCase());
    } else if ((field === "allow" || field === "disallow") && current) {
      current.rules.push({ field, value });
      sawRule = true;
    }
  }
  return groups;
}

function groupVerdict(group) {
  if (!group || group.rules.length === 0) return "unset";
  const disallowAll = group.rules.some((r) => r.field === "disallow" && (r.value === "/" || r.value === "/*"));
  const allowRoot = group.rules.some((r) => r.field === "allow" && r.value === "/");
  if (disallowAll && !allowRoot) return "block";
  if (disallowAll && allowRoot) return "partial";
  if (allowRoot) return "allow";
  return "partial";
}

/** Verdict for one token: specific group wins over wildcard (RFC 9309 practice). */
function robotsPolicy(groups, token) {
  const specific = groups.find((g) => g.agents.includes(token.toLowerCase()));
  if (specific) return { verdict: groupVerdict(specific), basis: "specific" };
  const wildcard = groups.find((g) => g.agents.includes("*"));
  if (wildcard) return { verdict: groupVerdict(wildcard), basis: "wildcard" };
  return { verdict: "unset", basis: "none" };
}

function robotsAllPolicies(groups) {
  const out = {};
  for (const token of ROBOTS_TOKENS) out[token] = robotsPolicy(groups, token);
  return out;
}

/* ------------------------------ extraction ----------------------------- */

function textFromHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<template[\s\S]*?<\/template>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]{2,8};/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CJK_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;

/** CJK-dominant pages get character bigrams (word regex under-segments them). */
function tokenize(text) {
  const cjkCount = (text.match(CJK_RE) ?? []).length;
  const cjkDominant = text.length > 0 && cjkCount / text.length > 0.15;
  const tokens = new Set();
  if (cjkDominant) {
    const runs = text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{L}\p{N}]+/gu) ?? [];
    for (const run of runs) {
      const chars = [...run];
      if (chars.length === 1) tokens.add(chars[0].toLowerCase());
      for (let i = 0; i < chars.length - 1; i++) tokens.add((chars[i] + chars[i + 1]).toLowerCase());
    }
    return { tokens, cjkDominant };
  }
  const match = text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'-]{1,}/gu) ?? [];
  for (const t of match) if (t.length >= 3) tokens.add(t);
  return { tokens, cjkDominant };
}

function jsonLdTypesFromText(texts) {
  const types = new Set();
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    const t = node["@type"];
    if (typeof t === "string") types.add(t.toLowerCase());
    else if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && types.add(x.toLowerCase()));
    if (Array.isArray(node["@graph"])) node["@graph"].forEach(visit);
  };
  for (const text of texts) {
    try {
      visit(JSON.parse(text));
    } catch {
      /* malformed JSON-LD — noted implicitly by absence */
    }
  }
  return [...types].sort();
}

function jsonLdScriptsFromHtml(html) {
  const out = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

function metaFromHtml(html) {
  const pick = (re) => (html.match(re)?.[1] ?? "").trim();
  return {
    title: pick(/<title[^>]*>([\s\S]*?)<\/title>/i),
    description: pick(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i),
    canonical: pick(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i),
  };
}

function headingsFromHtml(html) {
  const out = [];
  const re = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m;
  while ((m = re.exec(html))) {
    const text = textFromHtml(m[2]);
    if (text) out.push(text);
  }
  return out;
}

/* ------------------------------ crawl one ------------------------------ */

async function crawlSite(site, context, outDir) {
  const domain = site.domain;
  const url = `https://${domain}/`;
  const record = { domain, rank: site.rank ?? null, url, runAt: new Date().toISOString() };

  /* robots.txt */
  const robotsFetch = await fetchText(`https://${domain}/robots.txt`, RAW_TIMEOUT_MS);
  const robotsText = robotsFetch.status === 200 ? robotsFetch.body : null;
  if (robotsText) {
    await writeFile(path.join(outDir, "robots", `${domain}.txt`), robotsText);
  }
  const groups = robotsText ? parseRobotsGroups(robotsText) : [];
  const policies = robotsText ? robotsAllPolicies(groups) : null;
  const wildcard = policies
    ? Object.values(policies).find((p) => p.basis === "wildcard")?.verdict ?? "unset"
    : "unset";
  record.robots = {
    status: robotsFetch.status,
    bytes: robotsFetch.body.length,
    wildcardVerdict: wildcard,
  };
  if (policies) record.robots.policies = policies;

  if (robotsText && wildcard === "block") {
    record.classification = "robots_excluded";
    record.skipped = "wildcard group disallows /";
    return record;
  }

  /* pass 1 — raw HTML */
  const rawFetch = await fetchText(url, RAW_TIMEOUT_MS);
  record.raw = {
    status: rawFetch.status,
    finalUrl: rawFetch.finalUrl,
    bytes: rawFetch.body.length,
    error: rawFetch.error,
  };
  if (rawFetch.body && SAVE_RAW) {
    await writeFile(path.join(outDir, "raw", `${domain}.html`), rawFetch.body);
  }
  const rawText = textFromHtml(rawFetch.body);
  const rawTokenized = tokenize(rawText);
  const rawMeta = metaFromHtml(rawFetch.body);
  const rawJsonLdTypes = jsonLdTypesFromText(jsonLdScriptsFromHtml(rawFetch.body));
  const rawHeadings = new Set(headingsFromHtml(rawFetch.body).map((h) => h.toLowerCase()));

  /* pass 2 — rendered DOM */
  const page = await context.newPage();
  let rendered = null;
  try {
    await page.goto(url, { waitUntil: "load", timeout: RENDER_TIMEOUT_MS });
    await page.waitForTimeout(SETTLE_MS);
    rendered = await page.evaluate(() => {
      const clone = document.body ? document.body.cloneNode(true) : null;
      if (clone) clone.querySelectorAll("script,style,noscript,template,svg").forEach((el) => el.remove());
      return {
        title: document.title,
        canonical: document.querySelector('link[rel="canonical"]')?.href ?? "",
        jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent ?? ""),
        headings: [...document.querySelectorAll("h1,h2,h3")].map((h) => h.textContent?.trim() ?? "").filter(Boolean),
        text: clone ? clone.textContent ?? "" : "",
      };
    });
  } catch (error) {
    record.renderError = String(error?.message ?? error).slice(0, 300);
  } finally {
    await page.close();
  }

  if (rendered) {
    const renderedTokenized = tokenize(rendered.text.replace(/\s+/g, " "));
    const renderedTokens = renderedTokenized.tokens;
    const rawTokens = rawTokenized.tokens;
    let inter = 0;
    for (const t of renderedTokens) if (rawTokens.has(t)) inter += 1;
    const coverage = renderedTokens.size ? (100 * inter) / renderedTokens.size : 0;
    const renderedJsonLdTypes = jsonLdTypesFromText(rendered.jsonLd);
    const renderedHeadings = new Set(rendered.headings.map((h) => h.toLowerCase()));
    const headingHits = [...renderedHeadings].filter(
      (h) => rawHeadings.has(h) || rawText.toLowerCase().includes(h.slice(0, 60)),
    ).length;
    const challengeLike =
      /just a moment|checking your browser|enable javascript|attention required|verify you are human|unusual traffic/i.test(
        rendered.text.slice(0, 500),
      );

    record.rendered = {
      title: rendered.title,
      canonical: rendered.canonical,
      words: renderedTokens.size,
      jsonLdTypes: renderedJsonLdTypes,
      headings: renderedHeadings.size,
      challengeLike,
    };
    record.metrics = {
      rawWords: rawTokens.size,
      renderedWords: renderedTokens.size,
      coverage: Number(coverage.toFixed(1)),
      rawOnlyTokens: rawTokens.size - inter,
      renderedOnlyTokens: renderedTokens.size - inter,
      renderedOnlySample: [...renderedTokens].filter((t) => !rawTokens.has(t)).slice(0, 25),
      jsonLdRaw: rawJsonLdTypes,
      jsonLdRendered: renderedJsonLdTypes,
      jsonLdMissingFromRaw: renderedJsonLdTypes.filter((t) => !rawJsonLdTypes.includes(t)),
      headingsRendered: renderedHeadings.size,
      headingsAlsoInRaw: headingHits,
      headingsCoverage: renderedHeadings.size
        ? Number(((100 * headingHits) / renderedHeadings.size).toFixed(1))
        : null,
      titleDiffers: rawMeta.title !== rendered.title,
      rawTitle: rawMeta.title,
      renderedTitle: rendered.title,
      cjk: rawTokenized.cjkDominant || renderedTokenized.cjkDominant,
    };
  }

  /* classification */
  const m = record.metrics;
  const rawEmptyShell = Boolean(m && m.rawWords < 20 && m.renderedWords >= 100);
  const rawBlocked = record.raw.status !== 200 || rawEmptyShell;
  if (record.renderError || !m) {
    record.classification = record.raw.status !== 200 ? "raw_blocked" : "render_failed";
  } else if (rawBlocked && m.renderedWords < 20) {
    record.classification = "both_blocked";
  } else if (rawBlocked) {
    record.classification = "raw_blocked";
  } else if (m.renderedWords < 20) {
    record.classification = "render_incomplete";
  } else {
    record.classification = "measured";
  }
  return record;
}

/* ------------------------------- main ------------------------------- */

const listData = LIST_PATH
  ? JSON.parse(await readFile(LIST_PATH, "utf8"))
  : { source: "built-in sanity list", sites: SANITY_LIST.map((domain) => ({ domain })) };
let sites = Array.isArray(listData) ? listData.map((d) => (typeof d === "string" ? { domain: d } : d)) : listData.sites;
const seen = new Set();
sites = sites.filter((s) => (seen.has(s.domain) ? false : (seen.add(s.domain), true)));
if (LIMIT > 0) sites = sites.slice(0, LIMIT);

await mkdir(path.join(OUT_DIR, "sites"), { recursive: true });
await mkdir(path.join(OUT_DIR, "robots"), { recursive: true });
if (SAVE_RAW) await mkdir(path.join(OUT_DIR, "raw"), { recursive: true });

const siteFile = (domain) => path.join(OUT_DIR, "sites", `${domain}.json`);

console.log(
  `JS-wall study — ${sites.length} sites | concurrency ${CONCURRENCY} | list ${listData.listId ?? "sanity"} | out ${OUT_DIR}`,
);

const browser = await chromium.launch({ headless: true });
const contexts = [];
for (let i = 0; i < CONCURRENCY; i++) {
  const ctx = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
  });
  await ctx.route("**/*", (route) => {
    const type = route.request().resourceType();
    if (type === "image" || type === "font" || type === "media") return route.abort();
    return route.continue();
  });
  contexts.push(ctx);
}

let done = 0;
let skipped = 0;
let nextIndex = 0;
const started = Date.now();
const results = new Array(sites.length);

async function worker(workerId) {
  const context = contexts[workerId];
  while (true) {
    const claim = nextIndex++;
    if (claim >= sites.length) return;
    const target = sites[claim];

    // resume: skip if already measured in a previous run
    if (!FORCE && existsSync(siteFile(target.domain))) {
      const existing = JSON.parse(await readFile(siteFile(target.domain), "utf8"));
      results[claim] = existing[existing.length - 1];
      skipped += 1;
      const n = skipped + done;
      console.log(
        `[${n}/${sites.length}] ${pad(target.domain, 24)} cached (${results[claim].classification})`,
      );
      continue;
    }

    let record;
    try {
      record = await crawlSite(target, context, OUT_DIR);
    } catch (error) {
      record = {
        domain: target.domain,
        rank: target.rank ?? null,
        url: `https://${target.domain}/`,
        runAt: new Date().toISOString(),
        classification: "crawl_error",
        error: String(error?.message ?? error).slice(0, 300),
      };
    }

    // append-only per-site history
    let history = [];
    if (existsSync(siteFile(target.domain))) {
      try {
        history = JSON.parse(await readFile(siteFile(target.domain), "utf8"));
        if (!Array.isArray(history)) history = [];
      } catch {
        history = [];
      }
    }
    history.push(record);
    await writeFile(siteFile(target.domain), JSON.stringify(history, null, 2));
    results[claim] = record;
    done += 1;

    const total = done + skipped;
    const elapsed = (Date.now() - started) / 1000;
    const etaMin = done > 0 ? ((elapsed / done) * (sites.length - total)) / 60 : null;
    const m = record.metrics;
    console.log(
      `[${total}/${sites.length}] ${pad(target.domain, 24)} ${pad(record.classification, 17)}` +
        (m ? ` cov ${padL(pct(m.coverage), 6)} (raw ${m.rawWords} / rendered ${m.renderedWords})` : "") +
        (etaMin ? `  eta ${etaMin.toFixed(0)}m` : ""),
    );
    await sleep(300 + Math.random() * 400);
  }
}

// worker pool with explicit claim counter
await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));

for (const ctx of contexts) await ctx.close();
await browser.close();

/* ------------------------------ aggregate ------------------------------ */

const records = results.filter(Boolean);
const measured = records.filter((r) => r.classification === "measured");
const coverageValues = measured.map((r) => r.metrics.coverage);

const robotsSites = records.filter((r) => r.robots?.policies);
const robotsStats = {};
for (const token of ROBOTS_TOKENS) {
  const stat = { block: 0, allow: 0, partial: 0, unset: 0 };
  for (const r of robotsSites) {
    const v = r.robots.policies[token]?.verdict ?? "unset";
    stat[v] = (stat[v] ?? 0) + 1;
  }
  robotsStats[token] = stat;
}

const summary = {
  generatedAt: new Date().toISOString(),
  list: { listId: listData.listId ?? null, source: listData.source ?? null, requested: sites.length },
  runs: 1,
  counts: records.reduce((acc, r) => ((acc[r.classification] = (acc[r.classification] ?? 0) + 1), acc), {}),
  coverage: {
    measured: measured.length,
    median: median(coverageValues),
    p25: percentile(coverageValues, 25),
    p75: percentile(coverageValues, 75),
    min: coverageValues.length ? Math.min(...coverageValues) : null,
    max: coverageValues.length ? Math.max(...coverageValues) : null,
  },
  robots: { sitesWithRobots: robotsSites.length, tokens: robotsStats },
};

await writeFile(
  path.join(OUT_DIR, "results.json"),
  JSON.stringify({ summary, sites: records }, null, 2),
);

/* summary.md */
const cls = summary.counts;
const lines = [];
lines.push(`# JS-wall study — summary`);
lines.push("");
lines.push(`Generated ${summary.generatedAt} | Tranco list \`${summary.list.listId ?? "sanity"}\` | ${records.length} sites`);
lines.push("");
lines.push(`## Headline`);
lines.push("");
lines.push(`- **Could not be read at all without a browser**: ${(cls.raw_blocked ?? 0) + (cls.both_blocked ?? 0)} sites (raw_blocked ${cls.raw_blocked ?? 0}, both_blocked ${cls.both_blocked ?? 0})`);
lines.push(`- **Robots-excluded**: ${cls.robots_excluded ?? 0}`);
lines.push(`- **Measured**: ${summary.coverage.measured} sites — median coverage **${summary.coverage.median}%** (p25 ${summary.coverage.p25}%, p75 ${summary.coverage.p75}%, min ${summary.coverage.min}%, max ${summary.coverage.max}%)`);
lines.push("");
lines.push(`## Classification counts`);
lines.push("");
for (const [k, v] of Object.entries(cls)) lines.push(`- ${k}: ${v}`);
lines.push("");
lines.push(`## Lowest content coverage (measured sites)`);
lines.push("");
lines.push(`| site | rank | coverage | raw tokens | rendered tokens |`);
lines.push(`|---|---|---|---|---|`);
for (const r of [...measured].sort((a, b) => a.metrics.coverage - b.metrics.coverage).slice(0, 30)) {
  lines.push(`| ${r.domain} | ${r.rank ?? "—"} | ${r.metrics.coverage}% | ${r.metrics.rawWords} | ${r.metrics.renderedWords} |`);
}
lines.push("");
lines.push(`## robots.txt policy by crawler token (${robotsSites.length} sites with robots.txt)`);
lines.push("");
lines.push(`| token | block | allow | partial | unset |`);
lines.push(`|---|---|---|---|---|`);
for (const token of ROBOTS_TOKENS) {
  const s = robotsStats[token];
  lines.push(`| ${token} | ${s.block} | ${s.allow} | ${s.partial} | ${s.unset} |`);
}
lines.push("");
await writeFile(path.join(OUT_DIR, "summary.md"), lines.join("\n"));

console.log(`\n=== DONE ===`);
console.log(
  `${summary.coverage.measured} measured | median coverage ${summary.coverage.median}% | raw_blocked ${cls.raw_blocked ?? 0} | both_blocked ${cls.both_blocked ?? 0} | robots_excluded ${cls.robots_excluded ?? 0}`,
);
console.log(`Wrote ${path.join(OUT_DIR, "results.json")} and summary.md`);
