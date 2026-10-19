#!/usr/bin/env node
/**
 * Compare the two most recent runs per site from out/sites/{domain}.json
 * histories — classification stability and coverage variance for median-of-N.
 *
 * Usage: node compare-runs.mjs [--out out]
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};
const OUT = path.resolve(arg("--out", path.join(import.meta.dirname, "out")));

const sitesDir = path.join(OUT, "sites");
const files = readdirSync(sitesDir).filter((f) => f.endsWith(".json"));

const rows = [];
for (const file of files) {
  const history = JSON.parse(readFileSync(path.join(sitesDir, file), "utf8"));
  if (!Array.isArray(history) || history.length < 2) continue;
  const [a, b] = history.slice(-2);
  rows.push({ domain: a.domain, rank: a.rank ?? null, a, b });
}

const cov = (r) => (r.classification === "measured" ? r.metrics?.coverage ?? null : null);
const measuredCount = (set, k) => set.filter((r) => r[k].classification === "measured").length;
const median = (arr) => (arr.length ? [...arr].sort((x, y) => x - y)[Math.floor(arr.length / 2)] : null);

const changed = rows.filter((r) => r.a.classification !== r.b.classification);
const bothMeasured = rows.filter((r) => cov(r.a) !== null && cov(r.b) !== null);
const deltas = bothMeasured.map((r) => Math.abs(cov(r.b) - cov(r.a)));
const moved = bothMeasured.filter((r) => Math.abs(cov(r.b) - cov(r.a)) > 5);
const fixed = rows.filter((r) => r.a.classification !== "measured" && r.b.classification === "measured");
const broke = rows.filter((r) => r.a.classification === "measured" && r.b.classification !== "measured");

const summary = {
  generatedAt: new Date().toISOString(),
  sitesCompared: rows.length,
  run1: {
    measured: measuredCount(rows, "a"),
    medianCoverage: median(rows.map((r) => cov(r.a)).filter((x) => x !== null)),
  },
  run2: {
    measured: measuredCount(rows, "b"),
    medianCoverage: median(rows.map((r) => cov(r.b)).filter((x) => x !== null)),
  },
  stability: {
    classificationChanged: changed.length,
    bothMeasured: bothMeasured.length,
    medianAbsDelta: median(deltas),
    p90AbsDelta: deltas.length ? [...deltas].sort((x, y) => x - y)[Math.floor(0.9 * deltas.length)] : null,
    movedOver5pp: moved.length,
  },
  changedList: changed.map((r) => ({ domain: r.domain, from: r.a.classification, to: r.b.classification })),
  topMovers: bothMeasured
    .map((r) => ({ domain: r.domain, run1: cov(r.a), run2: cov(r.b), delta: Number((cov(r.b) - cov(r.a)).toFixed(1)) }))
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
    .slice(0, 20),
  fixed: fixed.map((r) => `${r.domain}: ${r.a.classification} → measured (${cov(r.b)}%)`),
  broke: broke.map((r) => `${r.domain}: measured → ${r.b.classification}`),
};

writeFileSync(path.join(OUT, "run-comparison.json"), JSON.stringify(summary, null, 2));

console.log(`# Run comparison — ${rows.length} sites with ≥2 runs`);
console.log(`run1: measured ${summary.run1.measured}, median cov ${summary.run1.medianCoverage}%`);
console.log(`run2: measured ${summary.run2.measured}, median cov ${summary.run2.medianCoverage}%`);
console.log(`classification changed: ${summary.stability.classificationChanged}`);
console.log(`median |Δcoverage| among both-measured: ${summary.stability.medianAbsDelta}pp | p90 ${summary.stability.p90AbsDelta}pp | >5pp: ${summary.stability.movedOver5pp}`);
if (summary.changedList.length) {
  console.log(`\nchanged:`);
  for (const c of summary.changedList) console.log(`- ${c.domain}: ${c.from} → ${c.to}`);
}
console.log(`\ntop movers (|Δcoverage|):`);
for (const m of summary.topMovers.slice(0, 12)) console.log(`- ${m.domain}: ${m.run1}% → ${m.run2}% (${m.delta > 0 ? "+" : ""}${m.delta}pp)`);
if (summary.fixed.length) console.log(`\nfixed by retry:\n- ${summary.fixed.join("\n- ")}`);
if (summary.broke.length) console.log(`\nbroke in run2:\n- ${summary.broke.join("\n- ")}`);
console.log(`\nWrote ${path.join(OUT, "run-comparison.json")}`);
