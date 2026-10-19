#!/usr/bin/env node
/**
 * Per-domain HTTP signals for the top-1000 Tranco list (plain HTTP, no browser).
 * Writes src/content/data/site-signals.json
 *
 * Fields are flat and per-domain; null = not measured (blocked, timeout, non-HTML).
 * Politeness: identifying UA, ≤6 domains in flight, sequential requests per domain,
 * 10s timeouts, no retries on 4xx/5xx.
 *
 *   node scripts/pull-site-signals.mjs [--list tools/crawl/data/top-1000.json] [--limit N]
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i !== -1 && argv[i + 1] ? argv[i + 1] : d; };
const listPath = join(root, arg("--list", "tools/crawl/data/top-1000.json"));
const limit = Number(arg("--limit", "0"));
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36; SeobotResearchBot/0.1 (+https://seobot.example/bot)";
const TIMEOUT = 10_000;

let domains = JSON.parse(readFileSync(listPath, "utf8")).sites.map((s) => s.domain);
if (limit) domains = domains.slice(0, limit);

async function get(url, { head = false, maxBytes = 0 } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT);
  const t0 = performance.now();
  try {
    const res = await fetch(url, {
      method: head ? "HEAD" : "GET", redirect: "follow", signal: ctl.signal,
      headers: { "user-agent": UA, accept: "text/html,text/plain,*/*" },
    });
    const ttfb = Math.round(performance.now() - t0);
    let body = "";
    if (!head) {
      const text = await res.text();
      body = maxBytes ? text.slice(0, maxBytes) : text;
    }
    return { ok: true, status: res.status, headers: res.headers, body, ttfb, finalUrl: res.url };
  } catch {
    return { ok: false, status: 0, headers: new Headers(), body: "", ttfb: null, finalUrl: url };
  } finally { clearTimeout(timer); }
}

// A "file exists" check that rejects soft-404 HTML pages.
// Also requires markdown/robots-style structure, so catch-all plain-text answers ("OK", an echoed IP) don't count.
const looksLikeText = (r) =>
  r.status === 200 && !/^\s*<(!doctype|html)/i.test(r.body) && r.body.trim().length >= 30 &&
  /(^|\n)\s*#|\]\(|(^|\n)\s*[-*]\s|user-agent|allow|disallow/i.test(r.body);

function detectCdn(h) {
  const server = (h.get("server") || "").toLowerCase();
  if (h.get("cf-ray") || server.includes("cloudflare")) return "Cloudflare";
  if (h.get("x-amz-cf-id") || (h.get("via") || "").includes("CloudFront")) return "CloudFront";
  if (h.get("x-akamai-transformed") || server.includes("akamai") || h.get("akamai-grn")) return "Akamai";
  if (h.get("x-served-by") && (h.get("x-cache") || h.get("x-fastly-request-id"))) return "Fastly";
  if (h.get("x-vercel-id") || server === "vercel") return "Vercel";
  if (h.get("x-nf-request-id") || server === "netlify") return "Netlify";
  if (h.get("x-azure-ref") || h.get("x-msedge-ref")) return "Azure";
  if (h.get("x-goog-generation") || server.includes("gws") || server.includes("gse") || server.includes("esf")) return "Google";
  if (h.get("x-sucuri-id") || server.includes("sucuri")) return "Sucuri";
  if (h.get("x-iinfo") || h.get("x-cdn") === "Imperva") return "Imperva";
  return null;
}
const detectBotWall = (h, status, body) =>
  h.get("cf-mitigated") === "challenge" || status === 403 && h.get("cf-ray") ? "Cloudflare"
  : /px-captcha|perimeterx/i.test(body) ? "PerimeterX"
  : /datadome/i.test(h.get("set-cookie") || "") || h.get("x-datadome") ? "DataDome"
  : h.get("x-akamai-bot") || /_abck=/.test(h.get("set-cookie") || "") ? "Akamai Bot Manager"
  : null;

function detectCms(html, h) {
  const gen = (html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)/i) || [])[1] || "";
  if (/wordpress/i.test(gen) || /\/wp-content\//.test(html)) return "WordPress";
  if (/drupal/i.test(gen) || h.get("x-drupal-cache") || h.get("x-generator")?.includes("Drupal")) return "Drupal";
  if (/shopify/i.test(gen) || h.get("x-shopid") || /cdn\.shopify\.com/.test(html)) return "Shopify";
  if (/wix/i.test(gen) || h.get("x-wix-request-id")) return "Wix";
  if (/squarespace/i.test(gen) || /static1\.squarespace\.com/.test(html)) return "Squarespace";
  if (/webflow/i.test(gen) || /data-wf-(page|site)/.test(html)) return "Webflow";
  if (/ghost/i.test(gen)) return "Ghost";
  if (/joomla/i.test(gen)) return "Joomla";
  if (/__NEXT_DATA__|_next\/static/.test(html)) return "Next.js";
  if (/__NUXT__|_nuxt\//.test(html)) return "Nuxt";
  if (/gatsby/i.test(gen)) return "Gatsby";
  if (/hugo|jekyll|docusaurus|astro/i.test(gen)) return gen.split(/\s/)[0];
  return null;
}

async function probe(domain) {
  const base = `https://${domain}`;
  const home = await get(`${base}/`, { maxBytes: 400_000 });
  const row = {
    domain, homeStatus: home.ok ? home.status : null, ttfbMs: home.ok && home.status < 400 ? home.ttfb : null,
    htmlBytes: home.ok && home.status < 400 ? home.body.length : null,
    cdn: home.ok ? detectCdn(home.headers) : null,
    botWall: home.ok ? detectBotWall(home.headers, home.status, home.body) : null,
    cms: home.ok && home.status < 400 ? detectCms(home.body, home.headers) : null,
    hasHreflang: home.ok && home.status < 400 ? /<link[^>]+hreflang=/i.test(home.body) : null,
    hasCanonical: home.ok && home.status < 400 ? /<link[^>]+rel=["']canonical["']/i.test(home.body) : null,
    hasLlmsTxt: null, hasLlmsFullTxt: null, hasAiTxt: null, hasSitemap: null, sitemapInRobots: null,
  };
  if (!home.ok) return row;
  const r1 = await get(`${base}/llms.txt`, { maxBytes: 2000 });
  row.hasLlmsTxt = r1.ok ? looksLikeText(r1) : null;
  const r2 = await get(`${base}/llms-full.txt`, { maxBytes: 2000 });
  row.hasLlmsFullTxt = r2.ok ? looksLikeText(r2) : null;
  const r3 = await get(`${base}/ai.txt`, { maxBytes: 2000 });
  row.hasAiTxt = r3.ok ? looksLikeText(r3) : null;
  const rb = await get(`${base}/robots.txt`, { maxBytes: 200_000 });
  row.sitemapInRobots = rb.ok && rb.status === 200 ? /^\s*sitemap:\s*\S+/im.test(rb.body) : null;
  const sm = await get(`${base}/sitemap.xml`, { maxBytes: 2000 });
  row.hasSitemap = row.sitemapInRobots === true ? true
    : sm.ok ? sm.status === 200 && /<(urlset|sitemapindex)/i.test(sm.body) : null;
  return row;
}

// --incremental: keep existing measured rows from the output file and probe only new domains.
const outPath = join(root, "src/content/data/site-signals.json");
const prior = new Map();
if (argv.includes("--incremental")) {
  try { for (const r of JSON.parse(readFileSync(outPath, "utf8")).rows) if (Object.keys(r).length > 1) prior.set(r.domain, r); } catch {}
}
const todo = domains.filter((d) => !prior.has(d));
console.log(`${prior.size} reused, ${todo.length} to probe`);
const fresh = new Array(todo.length);
let next = 0, done = 0;
async function worker() {
  while (next < todo.length) {
    const i = next++;
    fresh[i] = await Promise.race([
      probe(todo[i]),
      new Promise((r) => setTimeout(() => r({ domain: todo[i] }), 90_000)), // hard per-domain deadline: unmeasured row
    ]);
    if (++done % 50 === 0) console.log(`${done}/${todo.length}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
const freshBy = new Map(todo.map((d, i) => [d, fresh[i]]));
const rows = domains.map((d) => prior.get(d) ?? freshBy.get(d));

const pct = (k) => { const m = rows.filter((r) => r[k] != null); return m.length ? +(100 * m.filter((r) => r[k] === true).length / m.length).toFixed(1) : null; };
const output = {
  meta: {
    source: "Direct HTTP probes (homepage, /robots.txt, /llms.txt, /llms-full.txt, /ai.txt, /sitemap.xml)",
    license: "Own measurements; CC BY 4.0",
    fetchedAt: new Date().toISOString(),
    method: "Single GET per URL, https only, redirects followed, identifying UA. null = not measured (timeout/network error/blocked). File checks reject HTML soft-404s.",
    listId: "64VVX",
    count: rows.length,
    fields: {
      homeStatus: { label: "Homepage HTTP status", unit: "code", type: "number" },
      ttfbMs: { label: "Time to first response", unit: "ms", type: "number", note: "Headers + body of the homepage from a single US-residential vantage point; indicative only." },
      htmlBytes: { label: "Raw HTML size (capped at 400 KB)", unit: "bytes", type: "number" },
      cdn: { label: "CDN / edge", type: "category" },
      botWall: { label: "Bot-protection vendor", type: "category" },
      cms: { label: "CMS / framework", type: "category" },
      hasHreflang: { label: "Homepage declares hreflang", type: "boolean" },
      hasCanonical: { label: "Homepage declares canonical", type: "boolean" },
      hasLlmsTxt: { label: "Publishes /llms.txt", type: "boolean" },
      hasLlmsFullTxt: { label: "Publishes /llms-full.txt", type: "boolean" },
      hasAiTxt: { label: "Publishes /ai.txt", type: "boolean" },
      hasSitemap: { label: "Has sitemap (robots.txt or /sitemap.xml)", type: "boolean" },
      sitemapInRobots: { label: "Sitemap declared in robots.txt", type: "boolean" },
    },
    summary: {
      llmsTxtPct: pct("hasLlmsTxt"), aiTxtPct: pct("hasAiTxt"), sitemapPct: pct("hasSitemap"),
      hreflangPct: pct("hasHreflang"), canonicalPct: pct("hasCanonical"),
    },
  },
  rows,
};
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${outPath} — ${rows.length} domains.`, output.meta.summary);
