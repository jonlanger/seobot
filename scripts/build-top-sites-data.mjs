#!/usr/bin/env node
/**
 * Derive the app's study dataset from the crawl-tool output.
 *
 * The site build must never depend on `tools/crawl/out/` (gitignored, heavy):
 * this script distills the pinned crawl artifacts into one committed JSON that
 * `src/content/top-sites.ts` types and decodes for the dashboard.
 *
 * Inputs
 *   tools/crawl/data/top-500.json        pinned, filtered Tranco list (ranks)
 *   tools/crawl/out/results.json         latest-run per-site records + summary
 *   tools/crawl/out/analysis.json        vertical cuts (thematic groups)
 *   tools/crawl/out/run-comparison.json  two-run stability (median-of-N claim)
 *
 * Output
 *   src/content/data/top-sites-study.json
 *
 * Run from the repo root after a crawl:  node scripts/build-top-sites-data.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relative) => JSON.parse(readFileSync(join(root, relative), "utf8"));

/* --------------------------------- Inputs --------------------------------- */

// Optional overrides (used for the 1k build): --list, --results, --crawl-out (analysis + run-comparison dir), --out. Defaults reproduce the 500-site study.
const argv = process.argv.slice(2);
const opt = (name, fallback) => { const i = argv.indexOf(name); return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback; };
const readPath = (p) => JSON.parse(readFileSync(resolve(root, p), "utf8"));
const listFile = readPath(opt("--list", "tools/crawl/data/top-500.json"));
const results = readPath(opt("--results", "tools/crawl/out/results.json"));
const crawlOut = opt("--crawl-out", "tools/crawl/out");
const analysis = readPath(`${crawlOut}/analysis.json`);
const comparison = readPath(`${crawlOut}/run-comparison.json`);

const sites = [...results.sites].sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999));

/* Crawler tokens, in the crawl tool's order (shared by every site record). */
const withPolicies = sites.find((site) => site.robots?.policies);
const crawlers = withPolicies ? Object.keys(withPolicies.robots.policies) : [];
if (crawlers.length === 0) throw new Error("No robots policies found in results.json — run the crawl first.");

if (sites.length !== listFile.sites.length) {
  throw new Error(`Site count mismatch: results ${sites.length} vs list ${listFile.sites.length}`);
}

/* Tranco configuration for the pinned list, captured from the Tranco list API. */
const tranco = {
  source: "Tranco",
  listId: listFile.listId,
  createdOn: "2026-10-16T22:00:02.378749",
  window: { start: "2026-09-17", end: "2026-10-16" },
  combinationMethod: "dowdall",
  providers: ["crux", "farsight", "majestic", "radar", "umbrella"],
  note: listFile.note,
};

/* ------------------------------ Per-site rows ------------------------------ */

const CODE = { block: "b", allow: "a", partial: "p", unset: "u" };

// Vertical membership per domain (analysis.json groups), so views can join
// sites to their vertical without shipping a second artifact.
const groupByDomain = new Map();
for (const [name, group] of Object.entries(analysis.groups)) {
  for (const member of group.sites) groupByDomain.set(member.domain, name);
}

const siteRows = sites.map((site) => {
  const policies = site.robots?.policies;
  const row = {
    rank: site.rank,
    domain: site.domain,
    group: groupByDomain.get(site.domain) ?? null,
    classification: site.classification,
    coverage: site.classification === "measured" && site.metrics ? site.metrics.coverage : null,
    robots: {
      status: site.robots?.status ?? 0,
      wildcard: site.robots?.wildcardVerdict ?? "unset",
      codes: policies ? crawlers.map((token) => CODE[policies[token]?.verdict] ?? "u").join("") : null,
    },
  };
  if (site.metrics) {
    row.metrics = {
      rawWords: site.metrics.rawWords,
      renderedWords: site.metrics.renderedWords,
      coverage: site.metrics.coverage,
      jsonLdRaw: site.metrics.jsonLdRaw ?? [],
      jsonLdRendered: site.metrics.jsonLdRendered ?? [],
      jsonLdMissingFromRaw: site.metrics.jsonLdMissingFromRaw ?? [],
      headingsCoverage: site.metrics.headingsCoverage,
      titleDiffers: site.metrics.titleDiffers,
      challengeLike: site.metrics.challengeLike ?? false,
      cjk: site.metrics.cjk ?? false,
    };
  }
  if (site.skipped) row.note = site.skipped;
  if (site.renderError) row.note = site.renderError.slice(0, 200);
  if (site.error) row.note = String(site.error).slice(0, 200);
  return row;
});

const coverageOf = (site) =>
  site.classification === "measured" && site.metrics ? site.metrics.coverage : null;
const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

/* ------------------------------- Aggregates -------------------------------- */

const measured = sites.filter((site) => site.classification === "measured");

// Coverage distribution in 10-point bins, for the histogram.
const bins = new Array(10).fill(0);
for (const site of measured) {
  const coverage = coverageOf(site) ?? 0;
  bins[Math.min(9, Math.floor(coverage / 10))] += 1;
}

// The study's headline correlation: do AI-blockers also build JS walls?
const gptBotVerdict = (site) => site.robots?.policies?.GPTBot?.verdict ?? "unset";
const correlationFor = (set) => {
  const readable = set.filter((site) => site.classification === "measured");
  const walled = set.filter((site) => ["raw_blocked", "both_blocked"].includes(site.classification));
  return {
    n: set.length,
    measured: readable.length,
    measuredShare: Number(((100 * readable.length) / Math.max(1, set.length)).toFixed(1)),
    medianCoverage: median(readable.map(coverageOf).filter((value) => value !== null)),
    unreadable: walled.length,
    unreadableShare: Number(((100 * walled.length) / Math.max(1, set.length)).toFixed(1)),
  };
};
const gptBotBlocked = sites.filter((site) => gptBotVerdict(site) === "block");
const gptBotOpen = sites.filter((site) => site.robots?.policies && gptBotVerdict(site) !== "block");

// Rank vs coverage — does being bigger predict a worse raw-HTML story?
const rankCoverage = (() => {
  const pairs = measured.map((site) => [site.rank, coverageOf(site)]);
  const n = pairs.length;
  const meanRank = pairs.reduce((sum, [rank]) => sum + rank, 0) / n;
  const meanCoverage = pairs.reduce((sum, [, coverage]) => sum + coverage, 0) / n;
  let cov = 0;
  let varRank = 0;
  let varCoverage = 0;
  for (const [rank, coverage] of pairs) {
    cov += (rank - meanRank) * (coverage - meanCoverage);
    varRank += (rank - meanRank) ** 2;
    varCoverage += (coverage - meanCoverage) ** 2;
  }
  return {
    n,
    r: Number((cov / Math.sqrt(varRank * varCoverage)).toFixed(2)),
    note: "Pearson correlation between Tranco rank and coverage among readable sites",
  };
})();

const groups = Object.entries(analysis.groups).map(([name, group]) => ({
  name,
  n: group.n,
  measured: group.measured,
  medianCoverage: group.median,
  blocked: group.blocked,
  robotsExcluded: group.robotsExcluded,
}));

/* --------------------------------- Output ---------------------------------- */

const output = {
  meta: {
    study: "State of AI indexation — JavaScript wall",
    method:
      "Two passes per homepage with the same user agent — plain HTTP vs. headless Chromium — so JavaScript execution is the only variable.",
    runDate: "2026-10-16",
    generatedAt: results.summary.generatedAt,
    runs: 2,
    license: "CC BY 4.0",
    tranco,
    crawlers,
  },
  summary: {
    counts: results.summary.counts,
    coverage: results.summary.coverage,
    histogram: { binSize: 10, bins },
    robots: results.summary.robots,
    rankCoverage,
    gptBot: { blocked: correlationFor(gptBotBlocked), open: correlationFor(gptBotOpen) },
  },
  stability: {
    sitesCompared: comparison.sitesCompared,
    classificationChanged: comparison.stability.classificationChanged,
    bothMeasured: comparison.stability.bothMeasured,
    medianAbsDelta: comparison.stability.medianAbsDelta,
    p90AbsDelta: Number(comparison.stability.p90AbsDelta.toFixed(1)),
    movedOver5pp: comparison.stability.movedOver5pp,
  },
  groups,
  sites: siteRows,
};

const outPath = resolve(root, opt("--out", "src/content/data/top-sites-study.json"));
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);

console.log(
  `Wrote ${outPath} — ${output.sites.length} sites, ${crawlers.length} crawler tokens, ` +
    `${measured.length} measured (median ${output.summary.coverage.median}% coverage).`,
);
