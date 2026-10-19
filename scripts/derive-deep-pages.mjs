#!/usr/bin/env node
/**
 * Distill inner-page (deep link) audit records into src/content/data/deep-pages.json.
 *   node scripts/derive-deep-pages.mjs --in <dir of per-domain json> [--out src/content/data/deep-pages.json]
 * Input records come from tools/crawl/deep-page-audit.mjs. null = not measured.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i !== -1 && argv[i + 1] ? argv[i + 1] : d; };
const inDir = resolve(arg("--in", join(root, "tools/crawl/out/deep-pages")));

const rows = readdirSync(inDir).filter((f) => f.endsWith(".json")).map((f) => {
  const r = JSON.parse(readFileSync(join(inDir, f), "utf8"));
  const raw = r.raw, ren = r.rendered;
  const ok = r.rawStatus === 200 && raw && ren;
  const rw = ok ? raw.content.wordCount : null, dw = ren ? ren.content.wordCount : null;
  const faq = (x) => x ? x.faqSignals.details + x.faqSignals.summaryQuestions + x.faqSignals.headingQuestions > 0 : null;
  return {
    domain: r.domain, url: r.url, rawStatus: r.rawStatus ?? null,
    rawWords: rw, renderedWords: dw,
    coverage: ok && dw > 0 ? +Math.min(100, (100 * rw) / dw).toFixed(1) : null,
    jsonLdTypesRaw: ok ? raw.structuredData.jsonLdTypes : null,
    jsonLdTypesRendered: ren ? ren.structuredData.jsonLdTypes : null,
    h1Count: ok ? raw.h1Count : null, headingSequenceValid: ok ? raw.headingSequenceValid : null,
    semanticRatio: ok ? raw.semanticRatio : null,
    tableCount: ok ? raw.tables.count : null,
    hasBreadcrumb: ok ? raw.breadcrumbs.nav + raw.breadcrumbs.ol > 0 : null,
    hasFaqSignal: ok ? faq(raw) : null,
    imagesWithAltPct: ok && raw.images.total ? +(100 * raw.images.withAlt / raw.images.total).toFixed(1) : null,
    internalLinks: ok ? raw.links.internal : null,
  };
}).sort((a, b) => a.domain.localeCompare(b.domain));

const m = rows.filter((r) => r.coverage !== null);
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const pct = (k) => { const x = rows.filter((r) => r[k] !== null); return x.length ? +(100 * x.filter((r) => r[k]).length / x.length).toFixed(1) : null; };
const out = {
  meta: {
    source: "First-party inner-page audit: one internal deep link per site (discovered from homepage), plain HTTP vs headless Chromium",
    license: "CC BY 4.0", generatedAt: new Date().toISOString(),
    method: "Deep link chosen heuristically from homepage nav (pricing/features/product/about style paths). Raw = plain HTTP, rendered = Chromium after settle. Coverage = raw words / rendered words, capped at 100. Sites with no discoverable deep link or non-200 raw responses are null.",
    fields: {
      url: { label: "Inner page audited", type: "text" }, rawWords: { label: "Words in raw HTML", unit: "words", type: "number" },
      renderedWords: { label: "Words after JS render", unit: "words", type: "number" }, coverage: { label: "Inner-page raw/rendered coverage", unit: "%", type: "number" },
      h1Count: { label: "H1 count (raw)", type: "number" }, semanticRatio: { label: "Semantic element ratio (raw)", type: "number" },
      tableCount: { label: "HTML tables (raw)", type: "number" }, hasBreadcrumb: { label: "Breadcrumb nav (raw)", type: "boolean" },
      hasFaqSignal: { label: "FAQ-style markup (raw)", type: "boolean" }, imagesWithAltPct: { label: "Images with alt text", unit: "%", type: "number" },
    },
    summary: { audited: rows.length, measured: m.length, medianCoverage: med(m.map((r) => r.coverage)), breadcrumbPct: pct("hasBreadcrumb"), faqSignalPct: pct("hasFaqSignal"), withTablePct: +(100 * rows.filter((r) => r.tableCount > 0).length / Math.max(1, rows.filter((r) => r.tableCount !== null).length)).toFixed(1) },
  },
  rows,
};
const outPath = join(root, arg("--out", "src/content/data/deep-pages.json"));
writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${outPath}`, out.meta.summary);
