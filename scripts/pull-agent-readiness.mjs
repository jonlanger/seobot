#!/usr/bin/env node
/**
 * Agent-readiness + freshness + snippet-control signals per domain (plain HTTP).
 * Writes src/content/data/agent-readiness.json
 *
 * Fields are flat and per-domain; null = not measured. Politeness: identifying UA,
 * 6 domains in flight, sequential per domain, 10s timeouts, no retries.
 *
 *   node scripts/pull-agent-readiness.mjs [--list tools/crawl/data/top-1000.json] [--limit N]
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
const DAY = 86_400_000;

let domains = JSON.parse(readFileSync(listPath, "utf8")).sites.map((s) => s.domain);
if (limit) domains = domains.slice(0, limit);

async function get(url, accept = "text/html,*/*", maxBytes = 400_000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { redirect: "follow", signal: ctl.signal, headers: { "user-agent": UA, accept } });
    const text = await res.text();
    return { ok: true, status: res.status, headers: res.headers, body: text.slice(0, maxBytes) };
  } catch { return { ok: false, status: 0, headers: new Headers(), body: "" }; }
  finally { clearTimeout(timer); }
}
const parseJson = (r) => { if (r.status !== 200 || /^\s*</.test(r.body)) return null; try { return JSON.parse(r.body); } catch { return null; } };
// Strict shape checks so catch-all JSON responses (errors, SPA fallbacks) are not counted.
const isMcpCard = (j) => j && typeof j === "object" && !Array.isArray(j) && (j.serverInfo || j.name) && (j.transport || j.endpoint || j.url || j.endpoints);
const isApiCatalog = (j) => j && typeof j === "object" && Array.isArray(j.linkset);

async function probe(domain) {
  const base = `https://${domain}`;
  const row = {
    domain, markdownNegotiation: null, markdownAlternateLink: null,
    contentSignal: null, contentSignalSearch: null, contentSignalAiInput: null, contentSignalAiTrain: null,
    crawlDelaySeconds: null, mcpServerCard: null, apiCatalog: null,
    lastModifiedAgeDays: null, hasLastModified: null, hasEtag: null, cacheMaxAgeSeconds: null,
    xRobotsTag: null, metaNosnippet: null, metaMaxSnippet: null, metaNoai: null,
    contentEncoding: null, hasHsts: null, jsonLdScriptCount: null,
  };
  // 1) markdown content negotiation
  const md = await get(`${base}/`, "text/markdown, text/html;q=0.5", 20_000);
  if (!md.ok) return row;
  row.markdownNegotiation = /text\/markdown/i.test(md.headers.get("content-type") || "");
  // 2) normal homepage
  const home = await get(`${base}/`);
  if (home.ok && home.status < 400) {
    const h = home.headers, html = home.body;
    row.hasLastModified = h.has("last-modified");
    const lm = Date.parse(h.get("last-modified") || "");
    row.lastModifiedAgeDays = Number.isFinite(lm) ? Math.max(0, Math.round((Date.now() - lm) / DAY)) : null;
    row.hasEtag = h.has("etag");
    const ma = (h.get("cache-control") || "").match(/(?:s-maxage|max-age)=(\d+)/i);
    row.cacheMaxAgeSeconds = ma ? Number(ma[1]) : null;
    row.xRobotsTag = h.get("x-robots-tag") || null;
    row.contentEncoding = h.get("content-encoding") || null;
    row.hasHsts = h.has("strict-transport-security");
    const robotsMeta = (html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)/i) || [])[1] || "";
    const all = `${robotsMeta} ${row.xRobotsTag || ""}`.toLowerCase();
    row.metaNosnippet = /nosnippet/.test(all) || /data-nosnippet/i.test(html);
    const msn = all.match(/max-snippet:\s*(-?\d+)/);
    row.metaMaxSnippet = msn ? Number(msn[1]) : null;
    row.metaNoai = /noai|noimageai/.test(all);
    row.markdownAlternateLink = /<link[^>]+rel=["']alternate["'][^>]+type=["']text\/markdown/i.test(html)
      || /type=["']text\/markdown["'][^>]+rel=["']alternate/i.test(html)
      || /text\/markdown/i.test(h.get("link") || "");
    row.jsonLdScriptCount = (html.match(/<script[^>]+application\/ld\+json/gi) || []).length;
  }
  // 3) robots.txt directives
  const rb = await get(`${base}/robots.txt`, "text/plain,*/*", 200_000);
  if (rb.ok && rb.status === 200 && !/^\s*<(!doctype|html)/i.test(rb.body)) {
    const cs = rb.body.match(/^\s*content-signal:\s*(.+)$/im);
    row.contentSignal = Boolean(cs);
    const val = (k) => { const m = cs?.[1].match(new RegExp(`${k}\\s*=\\s*(yes|no)`, "i")); return m ? m[1].toLowerCase() === "yes" : null; };
    row.contentSignalSearch = cs ? val("search") : null;
    row.contentSignalAiInput = cs ? val("ai-input") : null;
    row.contentSignalAiTrain = cs ? val("ai-train") : null;
    const cd = rb.body.match(/^\s*crawl-delay:\s*(\d+(?:\.\d+)?)/im);
    row.crawlDelaySeconds = cd ? Number(cd[1]) : null;
  }
  // 4) well-known discovery documents (JSON only; soft-404 HTML rejected)
  const mcp = await get(`${base}/.well-known/mcp/server-card.json`, "application/json", 50_000);
  row.mcpServerCard = mcp.ok ? Boolean(isMcpCard(parseJson(mcp))) : null;
  const cat = await get(`${base}/.well-known/api-catalog`, "application/linkset+json,application/json", 50_000);
  row.apiCatalog = cat.ok ? isApiCatalog(parseJson(cat)) : null;
  return row;
}

// --incremental: keep existing measured rows from the output file and probe only new domains.
const outPath = join(root, "src/content/data/agent-readiness.json");
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
const out = {
  meta: {
    source: "Direct HTTP probes (homepage with Accept: text/markdown, homepage HTML, /robots.txt, /.well-known/mcp/server-card.json, /.well-known/api-catalog)",
    license: "Own measurements; CC BY 4.0",
    fetchedAt: new Date().toISOString(),
    method: "Single GET per URL, https only, redirects followed, identifying UA. null = not measured. JSON well-known checks reject HTML soft-404s. Homepage only; results reflect the vantage point and may differ for bot user agents.",
    benchmark: "Cloudflare Agent Readiness scan of the 200,000 most-visited domains: ~3.9% support markdown negotiation, ~4% declare AI usage preferences, <15 sites expose MCP server cards.",
    count: rows.length,
    fields: {
      markdownNegotiation: { label: "Serves Markdown via Accept header", type: "boolean" },
      markdownAlternateLink: { label: "Advertises a Markdown alternate", type: "boolean" },
      contentSignal: { label: "Declares Content-Signal in robots.txt", type: "boolean" },
      contentSignalSearch: { label: "Content-Signal: search allowed", type: "boolean" },
      contentSignalAiInput: { label: "Content-Signal: AI input/grounding allowed", type: "boolean" },
      contentSignalAiTrain: { label: "Content-Signal: AI training allowed", type: "boolean" },
      crawlDelaySeconds: { label: "robots.txt Crawl-delay", unit: "s", type: "number" },
      mcpServerCard: { label: "Publishes MCP server card", type: "boolean" },
      apiCatalog: { label: "Publishes /.well-known/api-catalog", type: "boolean" },
      hasLastModified: { label: "Homepage sends Last-Modified", type: "boolean" },
      lastModifiedAgeDays: { label: "Homepage Last-Modified age", unit: "days", type: "number" },
      hasEtag: { label: "Homepage sends ETag", type: "boolean" },
      cacheMaxAgeSeconds: { label: "Cache max-age / s-maxage", unit: "s", type: "number" },
      xRobotsTag: { label: "X-Robots-Tag header value", type: "text" },
      metaNosnippet: { label: "Uses nosnippet / data-nosnippet", type: "boolean" },
      metaMaxSnippet: { label: "max-snippet directive", unit: "chars", type: "number" },
      metaNoai: { label: "Uses noai / noimageai", type: "boolean" },
      contentEncoding: { label: "Homepage compression", type: "category" },
      hasHsts: { label: "Sends HSTS", type: "boolean" },
      jsonLdScriptCount: { label: "JSON-LD scripts in raw homepage HTML", type: "number" },
    },
    summary: {
      markdownNegotiationPct: pct("markdownNegotiation"), contentSignalPct: pct("contentSignal"),
      mcpServerCardPct: pct("mcpServerCard"), apiCatalogPct: pct("apiCatalog"),
      lastModifiedPct: pct("hasLastModified"), nosnippetPct: pct("metaNosnippet"), noaiPct: pct("metaNoai"),
    },
  },
  rows,
};
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${outPath} — ${rows.length} domains.`, out.meta.summary);
