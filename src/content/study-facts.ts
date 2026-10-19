/**
 * Headline figures for copy — crawled and readable counts, wall and robots shares,
 * coverage quartiles — generated from the study by `scripts/build-study-facts.mjs`.
 *
 * Marketing and SEO copy import THIS (~2 KB) instead of the study JSON (~1 MB) so the
 * landing bundle stays lean, and nothing is typed by hand: when the crawl grows,
 * re-run the script and every sentence follows.
 */
import raw from "./study-facts.json";

export interface StudyFacts {
  listId: string;
  runDate: string;
  crawled: number;
  readable: number;
  readablePct: number;
  readableShare: number;
  unreadableShare: number;
  robotsExcluded: number;
  unreadable: number;
  unreadablePct: number;
  highestRankCrawled: number | null;
  /** Last rank of the range crawled twice for stability. */
  doublePassThrough: number | null;
  walled: number;
  walledShare: number;
  invitedButBarricaded: number;
  coverage: { median: number; p25: number; p75: number };
  robotsFiles: number;
  blocks: Record<"GPTBot" | "ClaudeBot" | "PerplexityBot" | "Googlebot", { n: number; pctOfRobotsFiles: number }>;
  retrievalBlockers: number;
  retrievalBlockedPct: number;
  trainingBlockers: number;
  trainingBlockedPct: number;
  classicBlockers: number;
  retrievalTokenCount: number;
  trainingTokenCount: number;
  verticalMedians: { search: number | null; social: number | null };
  render: { sitesCompared: number; invisibleWords: number; injectedJsonLdSites: number; withMetrics: number };
  waffle: { cells: number; readable: number; unreadable: number };
}

export const studyFacts = raw as unknown as StudyFacts;

/** 1700 → "1,700". */
export const fmt = (value: number) => value.toLocaleString("en-US");

/** "1,700 top sites" — the sample as prose. Ranks skip (infrastructure domains are filtered), so it is a count, not "the top N". */
export const sampleSites = `${fmt(studyFacts.crawled)} top sites`;
