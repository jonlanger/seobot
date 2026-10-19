/**
 * Derive the headline figures every marketing and SEO surface quotes — crawled
 * and readable counts, wall and robots shares, coverage quartiles — from the study
 * dataset, into one tiny JSON (`src/content/study-facts.json`).
 *
 * Why a generated file and not an import of the study: the landing page must stay
 * lean (docs/seo-research.md §2.4), and the study JSON is ~1 MB. Copy imports this
 * ~2 KB file instead, so no figure is ever typed by hand and none drifts when the
 * crawl grows.
 *
 * Run after any change to src/content/data/top-sites-study-1k.json (the `build`
 * script runs it first):   node scripts/build-study-facts.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));

const study = read("src/content/data/top-sites-study-1k.json");
const groups = read("src/content/crawler-groups.json");
const { meta, summary, sites } = study;

const tokensOf = (id) => groups.find((group) => group.id === id)?.tokens ?? [];
const retrieval = tokensOf("ai-retrieval");
const training = tokensOf("training-policy");
const classic = tokensOf("classic-search");

/** robots.txt verdict codes are positional against meta.crawlers: b(lock) a(llow) p(artial) u(nset). */
const blocks = (site, token) => site.robots.codes?.[meta.crawlers.indexOf(token)] === "b";
const blocksAny = (site, tokens) => tokens.some((token) => blocks(site, token));

const crawled = sites.length;
const counts = summary.counts;
const readable = counts.measured;
const excluded = counts.robots_excluded ?? 0;
const walledSites = sites.filter((site) => ["raw_blocked", "both_blocked"].includes(site.classification));
const robotsFiles = summary.robots.sitesWithRobots;

const round1 = (n) => Math.round(n * 10) / 10;
const pctOf = (n, total) => (total ? round1((100 * n) / total) : 0);

const blockedBy = (token) => {
  const n = sites.filter((site) => blocks(site, token)).length;
  return { n, pctOfRobotsFiles: pctOf(n, robotsFiles) };
};

// Words that only exist after JavaScript runs, summed over pages with both measurements.
// CJK pages are excluded: their token counts are character bigrams, not comparable word counts.
const withMetrics = sites.filter((site) => site.metrics);
const comparable = withMetrics.filter((site) => !site.metrics.cjk);
const invisibleWords = comparable.reduce(
  (sum, site) => sum + Math.max(0, site.metrics.renderedWords - site.metrics.rawWords),
  0,
);
const injectedJsonLdSites = withMetrics.filter((site) => site.metrics.jsonLdMissingFromRaw.length > 0).length;

const medianOfGroup = (name) => study.groups.find((group) => group.name === name)?.medianCoverage ?? null;

const waffleCells = 500;
const readableCells = Math.round((readable / crawled) * waffleCells);
const unreadableCells = Math.round(((crawled - readable - excluded) / crawled) * waffleCells);

const [doublePassRange] = Object.entries(meta.runsByRankRange ?? {}).find(([, passes]) => passes >= 2) ?? [];

const facts = {
  _generated: "by scripts/build-study-facts.mjs from src/content/data/top-sites-study-1k.json — do not edit",
  listId: meta.tranco.listId,
  runDate: meta.runDate,
  crawled,
  readable,
  readablePct: pctOf(readable, crawled),
  readableShare: Math.round((100 * readable) / crawled),
  unreadableShare: Math.round((100 * (crawled - readable)) / crawled),
  robotsExcluded: excluded,
  /** Not readable and not robots-excluded: walled, empty, or failed to render. */
  unreadable: crawled - readable - excluded,
  unreadablePct: pctOf(crawled - readable - excluded, crawled),
  highestRankCrawled: meta.highestRankCrawled ?? null,
  /** Last rank of the range crawled twice for stability, e.g. 500. */
  doublePassThrough: doublePassRange ? Number(doublePassRange.split("-")[1]) : null,
  counts,
  walled: walledSites.length,
  walledShare: Math.round((100 * walledSites.length) / crawled),
  /** Walled sites whose robots.txt nonetheless allows every AI retrieval crawler. */
  invitedButBarricaded: walledSites.filter((site) => !blocksAny(site, retrieval)).length,
  coverage: { median: summary.coverage.median, p25: summary.coverage.p25, p75: summary.coverage.p75 },
  robotsFiles,
  blocks: {
    GPTBot: blockedBy("GPTBot"),
    ClaudeBot: blockedBy("ClaudeBot"),
    PerplexityBot: blockedBy("PerplexityBot"),
    Googlebot: blockedBy("Googlebot"),
  },
  retrievalBlockers: sites.filter((site) => blocksAny(site, retrieval)).length,
  retrievalBlockedPct: pctOf(sites.filter((site) => blocksAny(site, retrieval)).length, robotsFiles),
  trainingBlockers: sites.filter((site) => blocksAny(site, training)).length,
  trainingBlockedPct: pctOf(sites.filter((site) => blocksAny(site, training)).length, robotsFiles),
  classicBlockers: sites.filter((site) => blocksAny(site, classic)).length,
  retrievalTokenCount: retrieval.length,
  trainingTokenCount: training.length,
  verticalMedians: { search: medianOfGroup("Search engines"), social: medianOfGroup("Social") },
  render: { sitesCompared: comparable.length, invisibleWords, injectedJsonLdSites, withMetrics: withMetrics.length },
  /** The 500-cell waffle in the landing highlight, scaled to the real mix. */
  waffle: { cells: waffleCells, readable: readableCells, unreadable: unreadableCells },
  stability: study.stability,
};

writeFileSync(resolve(root, "src/content/study-facts.json"), `${JSON.stringify(facts, null, 2)}\n`);
console.log(
  `study-facts: ${crawled} crawled, ${readable} readable (${facts.readablePct}%), ` +
    `${facts.walledShare}% walled, GPTBot blocked by ${facts.blocks.GPTBot.n}/${robotsFiles}`,
);
