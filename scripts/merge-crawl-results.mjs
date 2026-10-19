#!/usr/bin/env node
/**
 * Merge several js-wall results.json files (disjoint domain sets) into one, recomputing
 * the summary block so scripts/build-top-sites-data.mjs can consume it.
 *   node scripts/merge-crawl-results.mjs --out merged.json a/results.json b/results.json
 */
import { readFileSync, writeFileSync } from "node:fs";

const argv = process.argv.slice(2);
const oi = argv.indexOf("--out");
const out = argv[oi + 1];
const inputs = argv.filter((_, i) => i !== oi && i !== oi + 1);
const parts = inputs.map((f) => JSON.parse(readFileSync(f, "utf8")));
const sites = parts.flatMap((p) => p.sites);
const seen = new Set();
for (const s of sites) { if (seen.has(s.domain)) throw new Error(`duplicate domain ${s.domain}`); seen.add(s.domain); }

const pctile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
const measured = sites.filter((s) => s.classification === "measured" && s.metrics);
const cov = measured.map((s) => s.metrics.coverage).sort((a, b) => a - b);
const tokens = {};
let sitesWithRobots = 0;
for (const s of sites) {
  if (!s.robots?.policies) continue;
  sitesWithRobots++;
  for (const [tok, p] of Object.entries(s.robots.policies)) {
    tokens[tok] ??= { block: 0, allow: 0, partial: 0, unset: 0 };
    tokens[tok][p.verdict in tokens[tok] ? p.verdict : "unset"]++;
  }
}
const summary = {
  generatedAt: new Date().toISOString(),
  list: { ...parts[0].summary.list, requested: sites.length },
  runs: 1,
  counts: sites.reduce((a, s) => ((a[s.classification] = (a[s.classification] ?? 0) + 1), a), {}),
  coverage: { measured: measured.length, median: cov[Math.floor(cov.length / 2)], p25: pctile(cov, 0.25), p75: pctile(cov, 0.75), min: cov[0], max: cov[cov.length - 1] },
  robots: { sitesWithRobots, tokens },
};
writeFileSync(out, JSON.stringify({ summary, sites }, null, 2));
console.log(`Merged ${sites.length} sites → ${out}; measured ${measured.length}, median ${summary.coverage.median}%`);
