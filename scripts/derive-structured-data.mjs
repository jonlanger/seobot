#!/usr/bin/env node
/**
 * Derive a per-domain structured-data dataset (JSON-LD types, raw vs rendered) from a
 * study file. No network. Homepage only.
 *   node scripts/derive-structured-data.mjs [--study src/content/data/top-sites-study.json] [--out src/content/data/structured-data.json]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i !== -1 && argv[i + 1] ? argv[i + 1] : d; };
const study = JSON.parse(readFileSync(join(root, arg("--study", "src/content/data/top-sites-study.json")), "utf8"));

const rows = study.sites.map((s) => {
  const m = s.metrics;
  if (s.classification !== "measured" || !m) {
    return { domain: s.domain, measured: false, typesRaw: null, typesRendered: null, typesMissingFromRaw: null, typeCountRaw: null, hasOrganization: null, hasWebSite: null, hasBreadcrumb: null, hasFaq: null, hasProduct: null, hasArticle: null, injectedByJs: null };
  }
  const raw = m.jsonLdRaw ?? [], rend = m.jsonLdRendered ?? [], miss = m.jsonLdMissingFromRaw ?? [];
  const any = (re) => rend.concat(raw).some((t) => re.test(t));
  return {
    domain: s.domain, measured: true,
    typesRaw: raw, typesRendered: rend, typesMissingFromRaw: miss, typeCountRaw: raw.length,
    hasOrganization: any(/organization|corporation/), hasWebSite: any(/^website$/), hasBreadcrumb: any(/breadcrumblist/),
    hasFaq: any(/faqpage/), hasProduct: any(/^product$/), hasArticle: any(/article|newsarticle|blogposting/),
    injectedByJs: miss.length > 0,
  };
});
const meas = rows.filter((r) => r.measured);
const freq = {};
for (const r of meas) for (const t of new Set(r.typesRendered)) freq[t] = (freq[t] ?? 0) + 1;
const pct = (n) => +(100 * n / meas.length).toFixed(1);
const out = {
  meta: {
    source: "Derived from the first-party JS-wall crawl (homepage raw vs rendered JSON-LD)",
    license: "CC BY 4.0", derivedFrom: arg("--study", "src/content/data/top-sites-study.json"), generatedAt: new Date().toISOString(),
    method: "Type names are lowercased @type values found in JSON-LD scripts. Homepage only — product/article/FAQ schema mostly lives on inner pages, so those flags understate real adoption. null = not measured.",
    fields: {
      typesRaw: { label: "JSON-LD types in raw HTML", type: "list" }, typesRendered: { label: "JSON-LD types after JS render", type: "list" },
      typesMissingFromRaw: { label: "Types only present after JS render", type: "list" }, typeCountRaw: { label: "Distinct raw JSON-LD types", type: "number" },
      hasOrganization: { label: "Organization schema", type: "boolean" }, hasWebSite: { label: "WebSite schema", type: "boolean" },
      hasBreadcrumb: { label: "BreadcrumbList schema", type: "boolean" }, hasFaq: { label: "FAQPage schema", type: "boolean" },
      hasProduct: { label: "Product schema", type: "boolean" }, hasArticle: { label: "Article schema", type: "boolean" },
      injectedByJs: { label: "Some JSON-LD only exists after JS render", type: "boolean" },
    },
    summary: {
      measured: meas.length, anyJsonLdRenderedPct: pct(meas.filter((r) => r.typesRendered.length).length),
      anyJsonLdRawPct: pct(meas.filter((r) => r.typesRaw.length).length), injectedByJsPct: pct(meas.filter((r) => r.injectedByJs).length),
      organizationPct: pct(meas.filter((r) => r.hasOrganization).length), breadcrumbPct: pct(meas.filter((r) => r.hasBreadcrumb).length),
      faqPct: pct(meas.filter((r) => r.hasFaq).length), topTypes: Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([type, sites]) => ({ type, sites })),
    },
  },
  rows,
};
const outPath = join(root, arg("--out", "src/content/data/structured-data.json"));
writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${outPath}`, out.meta.summary);
