#!/usr/bin/env node
/**
 * Join Atlas factors (research/data/factors.json) to first-party site measurements.
 * For each measurable factor, computes how many sites pass a stated predicate, overall and by
 * rank band / CDN. No network. Re-run after any dataset refresh:
 *
 *   node scripts/derive-factor-measurements.mjs [--study src/content/data/top-sites-study-1k.json]
 *
 * Writes src/content/data/factor-measurements.json
 *
 * Honesty rules:
 *  - `kind: "direct"` = the predicate tests what the factor claims; `"proxy"` = a weaker stand-in
 *    (stated in `caveat`). Factors we cannot measure from the crawl are listed, never guessed.
 *  - Denominators exclude not-measured (null) rows, so n differs per measurement.
 *  - Homepage-only unless the dataset says otherwise (deep-pages = one inner page per site).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i !== -1 && argv[i + 1] ? argv[i + 1] : d; };
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const studyPath = arg("--study", "src/content/data/top-sites-study-1k.json");
const study = read(studyPath);
const factors = read("research/data/factors.json");
const byDomain = (file) => new Map(read(file).rows.map((r) => [r.domain, r]));
const SIG = byDomain("src/content/data/site-signals.json");
const AR = byDomain("src/content/data/agent-readiness.json");
const SD = byDomain("src/content/data/structured-data.json");
const DP = byDomain("src/content/data/deep-pages.json");

const crawlers = study.meta.crawlers;
const idx = (t) => crawlers.indexOf(t);
const SEARCH = ["OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Googlebot", "Bingbot"];
const TRAIN = ["GPTBot", "ClaudeBot", "CCBot", "Google-Extended", "Applebot-Extended", "Bytespider", "Meta-ExternalAgent", "anthropic-ai"];
const blocked = (s, tokens) => tokens.some((t) => s.robots.codes[idx(t)] === "b");

const sites = study.sites.map((s) => ({ s, sig: SIG.get(s.domain), ar: AR.get(s.domain), sd: SD.get(s.domain), dp: DP.get(s.domain) }));
const hasRobots = ({ s }) => s.robots?.status === 200 && Boolean(s.robots.codes);
const measured = ({ s }) => s.classification === "measured" && s.metrics;
const nn = (v) => v !== null && v !== undefined;

/* test(site) → true | false | null (null = not measured, excluded from n) */
const M = [
  { factor: "disc.robots-allow", id: "robots-retrieval-open", kind: "direct", dataset: "top-sites-study (robots.txt policy per crawler)",
    label: "No search/retrieval crawler is hard-blocked at the root", predicate: `none of ${SEARCH.join(", ")} resolves to 'block'`,
    denominator: "sites with a fetchable robots.txt (HTTP 200)", test: (x) => (hasRobots(x) ? !blocked(x.s, SEARCH) : null) },
  { factor: "disc.crawler-taxonomy", id: "robots-differentiated", kind: "proxy", dataset: "top-sites-study",
    label: "Blocks at least one training crawler while keeping search crawlers open", predicate: "≥1 training token blocked AND no search/retrieval token blocked",
    denominator: "sites with a fetchable robots.txt", caveat: "Measures a differentiated policy exists, not that it matches the site's intent.",
    test: (x) => (hasRobots(x) ? blocked(x.s, TRAIN) && !blocked(x.s, SEARCH) : null) },
  { factor: "disc.sitemap-coverage", id: "sitemap-present", kind: "proxy", dataset: "site-signals",
    label: "Publishes an XML sitemap", predicate: "Sitemap: line in robots.txt or valid /sitemap.xml",
    denominator: "sites where the sitemap check ran", caveat: "Presence only — says nothing about coverage or lastmod accuracy.", test: (x) => x.sig?.hasSitemap ?? null },
  { factor: "geo.access.bot-walls", id: "no-bot-wall", kind: "direct", dataset: "top-sites-study (raw vs rendered classification)",
    label: "Homepage readable over plain HTTP (no bot wall or empty shell blocking non-browser fetches)", predicate: "classification not raw_blocked / both_blocked",
    denominator: "all crawled sites not excluded by robots.txt", caveat: "Single vantage point and one UA; some walls are UA- or IP-specific.",
    test: ({ s }) => (s.classification === "robots_excluded" ? null : !["raw_blocked", "both_blocked"].includes(s.classification)) },
  { factor: "geo.render.server-html", id: "raw-coverage-80", kind: "direct", dataset: "top-sites-study",
    label: "≥80% of rendered words are present in raw HTML", predicate: "metrics.coverage ≥ 80", denominator: "measured homepages",
    caveat: "Threshold is ours; the factor says 'main content', we compare all visible words.", test: (x) => (measured(x) ? x.s.metrics.coverage >= 80 : null) },
  { factor: "geo.render.headings-raw", id: "headings-raw-80", kind: "direct", dataset: "top-sites-study",
    label: "≥80% of rendered headings are present in raw HTML", predicate: "metrics.headingsCoverage ≥ 80", denominator: "measured homepages with headings",
    test: (x) => (measured(x) && nn(x.s.metrics.headingsCoverage) ? x.s.metrics.headingsCoverage >= 80 : null) },
  { factor: "geo.render.jsonld-raw", id: "jsonld-not-js-injected", kind: "direct", dataset: "structured-data",
    label: "JSON-LD is in raw HTML (none injected only by JavaScript)", predicate: "no type in typesMissingFromRaw", denominator: "measured homepages that have JSON-LD after render",
    test: (x) => (x.sd?.measured && x.sd.typesRendered?.length ? !x.sd.injectedByJs : null) },
  { factor: "geo.entity.organization-schema", id: "org-schema", kind: "proxy", dataset: "structured-data",
    label: "Homepage declares Organization (or Corporation) JSON-LD", predicate: "hasOrganization", denominator: "measured homepages",
    caveat: "Type presence only; @id, logo and sameAs chain not checked.", test: (x) => (x.sd?.measured ? x.sd.hasOrganization : null) },
  { factor: "ia.breadcrumbs", id: "breadcrumb-html-inner", kind: "proxy", dataset: "deep-pages (one inner page per site)",
    label: "Inner page has HTML breadcrumb navigation", predicate: "breadcrumb nav/ol present in raw HTML", denominator: "sites with an audited inner page",
    caveat: "HTML half only; BreadcrumbList schema measured separately (breadcrumb-schema-home).", test: (x) => x.dp?.hasBreadcrumb ?? null },
  { factor: "ia.breadcrumbs", id: "breadcrumb-schema-home", kind: "proxy", dataset: "structured-data",
    label: "Homepage declares BreadcrumbList JSON-LD", predicate: "hasBreadcrumb", denominator: "measured homepages",
    caveat: "Homepages rarely need breadcrumbs; see inner-page measurement.", test: (x) => (x.sd?.measured ? x.sd.hasBreadcrumb : null) },
  { factor: "geo.extract.tables", id: "inner-has-table", kind: "direct", dataset: "deep-pages",
    label: "Inner page contains an HTML table", predicate: "tableCount > 0 in raw HTML", denominator: "sites with an audited inner page",
    caveat: "Inner page chosen by nav heuristic, not a comparison page.", test: (x) => (nn(x.dp?.tableCount) ? x.dp.tableCount > 0 : null) },
  { factor: "geo.extract.faq-parity", id: "faq-markup-inner", kind: "proxy", dataset: "deep-pages",
    label: "Inner page has FAQ-style markup (details/summary or question headings)", predicate: "hasFaqSignal", denominator: "sites with an audited inner page",
    caveat: "Presence only; byte-parity with FAQPage schema not checked.", test: (x) => x.dp?.hasFaqSignal ?? null },
  { factor: "geo.render.heading-hierarchy", id: "single-h1-valid-sequence", kind: "direct", dataset: "deep-pages",
    label: "Inner page has exactly one H1 and no skipped heading levels", predicate: "h1Count = 1 AND headingSequenceValid", denominator: "sites with an audited inner page",
    test: (x) => (nn(x.dp?.h1Count) ? x.dp.h1Count === 1 && x.dp.headingSequenceValid === true : null) },
  { factor: "rel.title-h1", id: "single-h1-inner", kind: "proxy", dataset: "deep-pages",
    label: "Inner page has exactly one H1", predicate: "h1Count = 1", denominator: "sites with an audited inner page",
    caveat: "Does not check title/H1/intent match or uniqueness.", test: (x) => (nn(x.dp?.h1Count) ? x.dp.h1Count === 1 : null) },
  { factor: "geo.render.alt-text", id: "alt-text-90", kind: "proxy", dataset: "deep-pages",
    label: "≥90% of inner-page images have alt text", predicate: "imagesWithAltPct ≥ 90", denominator: "inner pages with images",
    caveat: "Presence of alt attribute, not descriptiveness.", test: (x) => (nn(x.dp?.imagesWithAltPct) ? x.dp.imagesWithAltPct >= 90 : null) },
  { factor: "rel.canonical-consistency", id: "canonical-present-home", kind: "proxy", dataset: "site-signals",
    label: "Homepage declares a canonical link", predicate: "hasCanonical", denominator: "homepages fetched (HTTP < 400)",
    caveat: "Presence only; self-consistency not checked.", test: (x) => x.sig?.hasCanonical ?? null },
  { factor: "geo.freshness.maintenance", id: "last-modified-header", kind: "proxy", dataset: "agent-readiness",
    label: "Homepage sends a Last-Modified header", predicate: "hasLastModified", denominator: "homepages fetched",
    caveat: "Weak proxy: dateModified in markup and visible 'last updated' text are not checked; many CDNs omit the header.", test: (x) => x.ar?.hasLastModified ?? null },
  { factor: "exp.cwv", id: "ttfb-under-800ms", kind: "proxy", dataset: "site-signals",
    label: "Homepage responds in ≤800 ms", predicate: "ttfbMs ≤ 800", denominator: "homepages fetched",
    caveat: "TTFB from one location, NOT Core Web Vitals. Use CrUX for the real thing.", test: (x) => (nn(x.sig?.ttfbMs) ? x.sig.ttfbMs <= 800 : null) },
  { factor: "idx.indexable", id: "snippet-eligible", kind: "proxy", dataset: "agent-readiness",
    label: "Homepage does not use nosnippet / data-nosnippet", predicate: "metaNosnippet = false", denominator: "homepages fetched",
    caveat: "Does not check noindex or index status.", test: (x) => (nn(x.ar?.metaNosnippet) ? !x.ar.metaNosnippet : null) },
];

/* Signals the crawl measures that the Atlas has no factor for yet (candidates to add). */
const CANDIDATES = [
  { id: "llms-txt", label: "Publishes /llms.txt", dataset: "site-signals", test: (x) => x.sig?.hasLlmsTxt ?? null, sourceHint: "ahrefs-llmstxt-2026, llmstxt-org" },
  { id: "markdown-negotiation", label: "Serves Markdown via Accept: text/markdown", dataset: "agent-readiness", test: (x) => x.ar?.markdownNegotiation ?? null, sourceHint: "cloudflare-agent-readiness-2026" },
  { id: "content-signal", label: "Declares Content-Signal in robots.txt", dataset: "agent-readiness", test: (x) => x.ar?.contentSignal ?? null, sourceHint: "cloudflare-agent-readiness-2026" },
  { id: "mcp-server-card", label: "Publishes an MCP server card", dataset: "agent-readiness", test: (x) => x.ar?.mcpServerCard ?? null, sourceHint: "cloudflare-agent-readiness-2026" },
  { id: "api-catalog", label: "Publishes /.well-known/api-catalog", dataset: "agent-readiness", test: (x) => x.ar?.apiCatalog ?? null, sourceHint: "RFC 9727" },
  { id: "hreflang", label: "Homepage declares hreflang", dataset: "site-signals", test: (x) => x.sig?.hasHreflang ?? null, sourceHint: "none yet" },
  { id: "noai-directive", label: "Uses noai / noimageai directives", dataset: "agent-readiness", test: (x) => x.ar?.metaNoai ?? null, sourceHint: "none yet" },
];

const BANDS = [[1, 250], [251, 500], [501, 1000], [1001, Infinity]];
const bandLabel = ([a, b]) => (b === Infinity ? `${a}+` : `${a}-${b}`);
const pct = (p, n) => (n ? +((100 * p) / n).toFixed(1) : null);
function tally(list, test) {
  let n = 0, pass = 0;
  for (const x of list) { const v = test(x); if (v === null || v === undefined) continue; n++; if (v) pass++; }
  return { n, pass, passPct: pct(pass, n) };
}
function run(m) {
  const overall = tally(sites, m.test);
  const byRankBand = BANDS.map((b) => ({ band: bandLabel(b), ...tally(sites.filter((x) => x.s.rank >= b[0] && x.s.rank <= b[1]), m.test) })).filter((r) => r.n > 0);
  const cdns = [...new Set(sites.map((x) => x.sig?.cdn).filter(Boolean))];
  const byCdn = cdns.map((c) => ({ cdn: c, ...tally(sites.filter((x) => x.sig?.cdn === c), m.test) })).filter((r) => r.n >= 20).sort((a, b) => b.n - a.n);
  return { ...overall, byRankBand, byCdn };
}

const factorById = new Map(factors.map((f) => [f.id, f]));
for (const m of M) if (!factorById.has(m.factor)) throw new Error(`Unknown factor id in mapping: ${m.factor}`);

const grouped = new Map();
for (const m of M) {
  const r = run(m);
  const entry = { id: m.id, label: m.label, kind: m.kind, dataset: m.dataset, predicate: m.predicate, denominator: m.denominator, caveat: m.caveat ?? null, ...r };
  if (!grouped.has(m.factor)) grouped.set(m.factor, []);
  grouped.get(m.factor).push(entry);
}

const out = {
  meta: {
    source: "Join of research/data/factors.json with first-party site datasets",
    license: "CC BY 4.0",
    generatedAt: new Date().toISOString(),
    studyFile: studyPath,
    sitesCrawled: study.sites.length,
    sitesMeasured: study.sites.filter((s) => s.classification === "measured").length,
    method: "Each measurement is a boolean predicate per site; n excludes sites where the underlying field is null (not measured). 'direct' predicates test the factor's own claim; 'proxy' predicates are weaker stand-ins with the gap stated in `caveat`. Homepage-only except deep-pages (one inner page per site, chosen by nav heuristic). One vantage point, one identifying UA.",
    fields: {
      passPct: { label: "Sites passing", unit: "%", type: "number" }, n: { label: "Sites measured", type: "number" },
      kind: { label: "Direct test or proxy", type: "category" },
    },
    factorsMapped: grouped.size, factorsTotal: factors.length,
  },
  factors: [...grouped.entries()].map(([fid, measurements]) => {
    const f = factorById.get(fid);
    return { factorId: fid, label: f.label, layer: f.layer, stage: f.stage ?? null, gate: Boolean(f.gate), confidence: f.confidence, surface: f.surface, effort: f.effort, measurements };
  }),
  candidateFactors: CANDIDATES.map((c) => ({ id: c.id, label: c.label, dataset: c.dataset, sourceHint: c.sourceHint, ...tally(sites, c.test) })),
  notMeasurable: factors.filter((f) => !grouped.has(f.id)).map((f) => ({ factorId: f.id, label: f.label, layer: f.layer, why: f.layer === "authority" || f.id.startsWith("geo.offsite") || f.id.startsWith("geo.measure") ? "needs off-site, account-level or private data" : f.id.startsWith("geo.evidence") || f.id.startsWith("geo.extract") ? "needs content/NLP analysis not in the crawl" : "not captured by the current crawl" })),
};

const outPath = join(root, "src/content/data/factor-measurements.json");
writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${outPath}: ${out.meta.factorsMapped}/${out.meta.factorsTotal} factors mapped, ${M.length} measurements, ${out.candidateFactors.length} candidate factors.`);
for (const f of out.factors) for (const m of f.measurements) console.log(`${f.factorId.padEnd(32)} ${m.id.padEnd(26)} ${String(m.passPct).padStart(5)}%  n=${m.n}  [${m.kind}]`);
for (const c of out.candidateFactors) console.log(`CANDIDATE ${c.id.padEnd(22)} ${String(c.passPct).padStart(5)}%  n=${c.n}`);
