/**
 * Signal map — the dashboard's primary view model.
 *
 * "What makes a top site readable to AI" as one connected map: six distinct
 * groupings (reach, access, the read gate, coverage, structure, vertical
 * context) joined by the relationships the two-pass crawl actually measured.
 *
 * Every value, edge label, and exemplar in this module is derived at import
 * time from `topSitesStudy` — nothing here is hand-copied from the crawl, so
 * the map cannot drift from the dataset. The companion component is
 * `src/components/app/signal-map.tsx`; node coordinates are logical canvas
 * units (see `SIGNAL_CANVAS`).
 */
import { crawlerGroups, topSitesStudy } from "./top-sites";
import type { StudySite } from "./top-sites";

/* --------------------------------- Types ---------------------------------- */

export type SignalClusterId = "reach" | "access" | "read" | "coverage" | "structure" | "verticals";

/** Chart-token hues — the component maps these to literal Tailwind classes. */
export type SignalHue = "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5" | "chart-6";

export interface SignalCluster {
  id: SignalClusterId;
  /** Short name — legend and cluster label. */
  title: string;
  /** The plain-language question this grouping answers. */
  tagline: string;
  hue: SignalHue;
  /** Cluster label position on the canvas. */
  labelX: number;
  labelY: number;
}

export interface SignalNode {
  id: string;
  cluster: SignalClusterId;
  kind: "hub" | "stat" | "chip" | "site";
  /** Small label — what is measured. */
  label: string;
  /** The reading, big. */
  value: string;
  /** One line of context. */
  sub: string;
  /** The takeaway in show-the-number form, for the detail panel and table. */
  note: string;
  x: number;
  y: number;
  /** Site chips carry the study record; clicking opens its full profile. */
  site?: StudySite;
  /** Related sites shown in the detail panel. */
  sites?: StudySite[];
}

export interface SignalEdge {
  id: string;
  from: string;
  to: string;
  /**
   * strong  — the study's headline relationships
   * linked  — definitional connections
   * none    — measured absence of a relationship
   * context — vertical → gate relationships
   * lead    — grouping recto (chip → parent, stacked stats)
   */
  kind: "strong" | "linked" | "none" | "context" | "lead";
  label?: string;
  /** Label position; defaults to the curve midpoint. */
  labelAt?: { x: number; y: number };
  /** Quadratic control point for the connector curve. */
  bend?: { x: number; y: number };
  /** Table-view description of the relationship. */
  note?: string;
}

/* ------------------------------- Derivations ------------------------------- */

const sites = topSitesStudy.sites;
const measuredSites = sites.filter((site) => site.coverage !== null);
const { counts, coverage, gptBot, rankCoverage } = topSitesStudy.summary;

const tokensOf = (groupId: string) =>
  crawlerGroups.find((group) => group.id === groupId)?.tokens ?? [];
const retrievalTokens = tokensOf("ai-retrieval");
const trainingTokens = tokensOf("training-policy");
const classicTokens = tokensOf("classic-search");

const blocksAny = (site: StudySite, tokens: string[]) =>
  tokens.some((token) => site.robots.verdicts[token] === "block");
const blocksCount = (site: StudySite, tokens: string[]) =>
  tokens.filter((token) => site.robots.verdicts[token] === "block").length;
const isWalled = (site: StudySite) =>
  site.classification === "raw_blocked" || site.classification === "both_blocked";
const isOpenToRetrieval = (site: StudySite) => !blocksAny(site, retrievalTokens);

const robotsFiles = topSitesStudy.summary.robots.sitesWithRobots;
const share = (count: number, total = robotsFiles) =>
  `${Math.round((100 * count) / total)}%`;

const retrievalBlockers = sites.filter((site) => blocksAny(site, retrievalTokens));
const trainingBlockers = sites.filter((site) => blocksAny(site, trainingTokens));
const classicBlockers = sites.filter((site) => blocksAny(site, classicTokens));
const walledSites = sites.filter(isWalled);
const invitedButBarricaded = walledSites.filter(isOpenToRetrieval);
const excludedSites = sites.filter((site) => site.classification === "robots_excluded");
const clubSites = measuredSites
  .filter((site) => (site.coverage ?? 0) >= 90)
  .sort((a, b) => a.rank - b.rank);
const byRank = (a: StudySite, b: StudySite) => a.rank - b.rank;

const readableShare = Math.round((100 * measuredSites.length) / sites.length);

function pearson(pairs: [number, number][]): number {
  const n = pairs.length;
  const meanX = pairs.reduce((sum, [x]) => sum + x, 0) / n;
  const meanY = pairs.reduce((sum, [, y]) => sum + y, 0) / n;
  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (const [x, y] of pairs) {
    cov += (x - meanX) * (y - meanY);
    varX += (x - meanX) ** 2;
    varY += (y - meanY) ** 2;
  }
  return cov / Math.sqrt(varX * varY || 1);
}

// Headings vs coverage — the strongest same-page signal in the study.
const headingsPairs = measuredSites
  .filter((site) => site.metrics && site.metrics.headingsCoverage !== null)
  .map((site) => [site.metrics?.headingsCoverage as number, site.coverage as number] as [number, number]);
const headingsR = pearson(headingsPairs);

// JSON-LD vs coverage — an independent layer.
const jsonLdPairs = measuredSites
  .filter((site) => site.metrics)
  .map((site) => [site.metrics?.jsonLdRendered.length ?? 0, site.coverage as number] as [number, number]);
const jsonLdR = pearson(jsonLdPairs);

const jsonLdSites = measuredSites.filter((site) => site.metrics);
const serverSideJsonLd = jsonLdSites.filter(
  (site) => (site.metrics?.jsonLdRendered.length ?? 0) > 0 && (site.metrics?.jsonLdMissingFromRaw.length ?? 0) === 0,
);
const titleParity = jsonLdSites.filter((site) => !site.metrics?.titleDiffers);

// Scale vs policy — bigger homepages block more.
const wordCounts = measuredSites.map((site) => site.metrics?.rawWords ?? 0).sort((a, b) => a - b);
const wordMedian = wordCounts[Math.floor(wordCounts.length / 2)] ?? 0;
const largeSites = measuredSites.filter((site) => (site.metrics?.rawWords ?? 0) >= wordMedian);
const smallSites = measuredSites.filter((site) => (site.metrics?.rawWords ?? 0) < wordMedian);
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / (values.length || 1);
const largeBlocks = mean(largeSites.map((site) => blocksCount(site, retrievalTokens)));
const smallBlocks = mean(smallSites.map((site) => blocksCount(site, retrievalTokens)));
const wordsBlocksR = pearson(
  measuredSites.map((site) => [site.metrics?.rawWords ?? 0, blocksCount(site, retrievalTokens)] as [number, number]),
);

/** Vertical cuts, ascending by median coverage — a gradient across the band. */
const verticals = [...topSitesStudy.groups]
  .sort((a, b) => (a.medianCoverage ?? 0) - (b.medianCoverage ?? 0))
  .map((group) => {
    const members = sites.filter((site) => site.group === group.name);
    const aiBlocks = members.filter((site) => !isOpenToRetrieval(site)).length;
    return { ...group, aiBlocks };
  });

const lowestVertical = verticals[0];
const highestVertical = verticals[verticals.length - 1];
const newsVertical = verticals.find((group) => group.name === "News & media");
const gptBlocked = topSitesStudy.summary.robots.tokens.GPTBot?.block ?? 0;
const googlebotBlocked = topSitesStudy.summary.robots.tokens.Googlebot?.block ?? 0;
/** Walled sites whose robots.txt blocks neither retrieval nor training crawlers. */
const openButWalled = walledSites.filter(
  (site) => !blocksAny(site, retrievalTokens) && !blocksAny(site, trainingTokens),
).length;
const fmtN = (n: number) => n.toLocaleString("en-US");

/* -------------------------------- Clusters --------------------------------- */

export const SIGNAL_CANVAS = { width: 1840, height: 1340 };

export const signalClusters: SignalCluster[] = [
  {
    id: "reach",
    title: "Reach",
    tagline: "the ticket in",
    hue: "chart-2",
    labelX: 300,
    labelY: 110,
  },
  {
    id: "access",
    title: "Access",
    tagline: "who may come in",
    hue: "chart-4",
    labelX: 350,
    labelY: 590,
  },
  {
    id: "read",
    title: "The read gate",
    tagline: "what a non-browser gets",
    hue: "chart-5",
    labelX: 950,
    labelY: 140,
  },
  {
    id: "coverage",
    title: "Coverage",
    tagline: "how much survives",
    hue: "chart-1",
    labelX: 1360,
    labelY: 415,
  },
  {
    id: "structure",
    title: "Structure",
    tagline: "what survives intact",
    hue: "chart-3",
    labelX: 1600,
    labelY: 110,
  },
  {
    id: "verticals",
    title: "Context",
    tagline: "verticals set the odds",
    hue: "chart-6",
    labelX: 560,
    labelY: 1005,
  },
];

/* ---------------------------------- Nodes ---------------------------------- */

const clubChips = clubSites.slice(0, 3);
const excludedChip = [...excludedSites].sort(byRank)[0];
const walledChips = [...walledSites].sort(byRank).slice(0, 2);

function chipNote(site: StudySite): string {
  if (site.classification === "robots_excluded") {
    return `Rank #${site.rank} — robots.txt disallows every crawler with a wildcard rule; the page is off-limits by policy, so it was skipped.`;
  }
  if (isWalled(site)) {
    return `Rank #${site.rank} — a non-rendering client (and most AI crawlers) receives a wall, not the page${
      isOpenToRetrieval(site) ? ", despite robots.txt allowing AI crawlers in" : ""
    }.`;
  }
  return `Rank #${site.rank} — keeps ${site.coverage}% of the homepage readable without JavaScript, and leaves AI crawlers unblocked.`;
}

export const signalNodes: SignalNode[] = [
  /* Reach */
  {
    id: "reach-rank",
    cluster: "reach",
    kind: "hub",
    label: "Tranco rank · audience reach",
    value: `#1–${fmtN(topSitesStudy.meta.highestRankCrawled ?? Math.max(...sites.map((site) => site.rank)))}`,
    sub: "30-day reach across five providers — the ticket into this list",
    note: `A rank measures how much of the world's browsing and looking-up a domain accounts for. It does not predict machine readability — rank vs coverage measured r = ${rankCoverage.r} across ${rankCoverage.n} readable sites.`,
    x: 300,
    y: 230,
  },
  {
    id: "reach-consensus",
    cluster: "reach",
    kind: "stat",
    label: "Built from",
    value: "5 providers",
    sub: "Chrome UX, Farsight DNS, Majestic, Radar, Umbrella",
    note: "Daily rankings from five independent providers, combined with the Dowdall position-weighted method and pinned as list 64VVX — so every number on this map is reproducible.",
    x: 300,
    y: 400,
  },

  /* Access */
  {
    id: "access-ai",
    cluster: "access",
    kind: "hub",
    label: "AI search & retrieval",
    value: share(retrievalBlockers.length),
    sub: `of ${fmtN(robotsFiles)} robots.txt files block at least one of ${retrievalTokens.length} retrieval crawlers`,
    note: `Retrieval crawlers (OAI-SearchBot, ChatGPT-User, Claude-SearchBot, PerplexityBot, Amazonbot…) decide what AI engines can read and quote. ${share(retrievalBlockers.length)} of robots.txt files turn at least one of them away.`,
    x: 350,
    y: 720,
  },
  {
    id: "access-training",
    cluster: "access",
    kind: "stat",
    label: "Model training & policy",
    value: share(trainingBlockers.length),
    sub: `block at least one of ${trainingTokens.length} corpus crawlers — GPTBot alone: ${fmtN(gptBlocked)} of ${fmtN(robotsFiles)}`,
    note: "Corpus builders (GPTBot, ClaudeBot, CCBot, Bytespider) and provider controls (Google-Extended, Applebot-Extended) are blocked more often than search crawlers — the default-deny middle path.",
    x: 350,
    y: 890,
  },
  {
    id: "access-scale",
    cluster: "access",
    kind: "stat",
    label: "Scale vs policy",
    value: `${(largeBlocks / (smallBlocks || 1)).toFixed(1)}×`,
    sub: `large homepages block more AI crawlers (${largeBlocks.toFixed(2)} vs ${smallBlocks.toFixed(2)} avg)`,
    note: `The bigger the site, the more likely it blocks: raw token count correlates with retrieval blocks at r = ${wordsBlocksR.toFixed(2)} — brand-scale sites defend more aggressively.`,
    x: 350,
    y: 1060,
  },
  {
    id: "access-classic",
    cluster: "access",
    kind: "stat",
    label: "Classic search",
    value: share(classicBlockers.length),
    sub: `Googlebot hard-blocked by ${fmtN(googlebotBlocked)} of ${fmtN(robotsFiles)} robots.txt files`,
    note: "Traditional search is universally welcome — the negotiation is entirely about AI. Googlebot renders JavaScript; the retrieval crawlers above mostly do not, which is what the study measures.",
    x: 350,
    y: 1230,
  },

  /* Read gate */
  {
    id: "read-readable",
    cluster: "read",
    kind: "hub",
    label: "Readable without a browser",
    value: `${readableShare}%`,
    sub: `${fmtN(measuredSites.length)} of ${fmtN(sites.length)} homepages serve usable content to a non-rendering client`,
    note: `The gate that matters for AI indexation: a plain-HTTP fetch receives meaningfully more than a shell. The other ${100 - readableShare}% of the ${fmtN(sites.length)} sites crawled are absent from any engine that does not execute JavaScript.`,
    x: 950,
    y: 480,
  },
  {
    id: "read-walled",
    cluster: "read",
    kind: "stat",
    label: "Walled to non-browsers",
    value: `${fmtN(walledSites.length)} sites`,
    sub: `403 / 202 / empty shells — ${fmtN(invitedButBarricaded.length)} of them allow AI crawlers in`,
    note: `Invited, then barricaded: robots.txt says yes, the server says no. The study's largest failure mode — ${fmtN(openButWalled)} sites block neither search nor training crawlers, yet return an empty shell to them.`,
    x: 640,
    y: 430,
    sites: [...walledSites].sort(byRank).slice(0, 4),
  },
  {
    id: "read-excluded",
    cluster: "read",
    kind: "stat",
    label: "Robots-excluded",
    value: `${fmtN(excludedSites.length)} sites`,
    sub: "wildcard disallow — skipped by policy, never fetched",
    note: "Facebook, X, LinkedIn, Reddit, Netflix, Baidu, ChatGPT… closed by their own robots.txt before a request is made. Exclusion is not a readability verdict — it is a door that never opens.",
    x: 950,
    y: 230,
    sites: [...excludedSites].sort(byRank).slice(0, 4),
  },
  {
    id: "read-render",
    cluster: "read",
    kind: "stat",
    label: "Render failed or incomplete",
    value: `${counts.render_incomplete + counts.render_failed} sites`,
    sub: `${counts.render_incomplete} incomplete + ${counts.render_failed} failed browser passes`,
    note: "Heavy portals, HTTP/2 errors, and download responses — even the headless browser could not complete the picture. These sites are excluded from the coverage distribution.",
    x: 1270,
    y: 430,
  },
  ...walledChips.map(
    (site, index): SignalNode => ({
      id: `chip-fortress-${index}`,
      cluster: "read",
      kind: "chip",
      label: site.domain,
      value: `#${site.rank} · walled`,
      sub: "non-browser clients get a shell",
      note: chipNote(site),
      x: index === 1 ? 600 : 490,
      y: index === 1 ? 700 : 545,
      site,
    }),
  ),
  ...(excludedChip
    ? [
        {
          id: "chip-fortress-fb",
          cluster: "read",
          kind: "chip",
          label: excludedChip.domain,
          value: `#${excludedChip.rank} · excluded`,
          sub: "wildcard disallow",
          note: chipNote(excludedChip),
          x: 1190,
          y: 230,
          site: excludedChip,
        } satisfies SignalNode,
      ]
    : []),

  /* Coverage */
  {
    id: "coverage-median",
    cluster: "coverage",
    kind: "hub",
    label: "Median coverage",
    value: `${coverage.median}%`,
    sub: "of browser-visible content present in raw HTML",
    note: `Coverage = share of the rendered page's tokens that a non-rendering crawler receives. Half the readable sites keep more than ${coverage.median}% server-rendered; a quarter keep more than ${coverage.p75}%.`,
    x: 1360,
    y: 520,
  },
  {
    id: "coverage-top",
    cluster: "coverage",
    kind: "stat",
    label: "The 90%+ club",
    value: `${fmtN(clubSites.length)} sites`,
    sub: "nearly all visible content survives without JavaScript",
    note: "Comparable to Wikipedia's model: the copy ships in the initial HTML, so it is readable to every crawler and quotable by every engine.",
    x: 1130,
    y: 690,
    sites: clubChips,
  },
  {
    id: "coverage-spread",
    cluster: "coverage",
    kind: "stat",
    label: "The middle half",
    value: `${Math.round(coverage.p25)}–${Math.round(coverage.p75)}%`,
    sub: `p25 → p75 across ${fmtN(measuredSites.length)} readable sites`,
    note: "The top quartile approaches full server-rendering; the bottom quartile ships less than half its content to non-browsers. Same list, very different machines.",
    x: 1590,
    y: 660,
  },
  ...clubChips.map(
    (site, index): SignalNode => ({
      id: `chip-club-${index}`,
      cluster: "coverage",
      kind: "chip",
      label: site.domain,
      value: `#${site.rank} · ${site.coverage}%`,
      sub: "90%+ club · open to AI",
      note: chipNote(site),
      x: [1150, 1340, 1530][index] ?? 1150,
      y: [840, 880, 840][index] ?? 840,
      site,
    }),
  ),

  /* Structure */
  {
    id: "structure-headings",
    cluster: "structure",
    kind: "hub",
    label: "Headings in raw HTML",
    value: `r = ${headingsR.toFixed(2)}`,
    sub: `strongest link in the study (${headingsPairs.length} readable sites)`,
    note: "Pages whose headings arrive in raw HTML are the pages whose content arrives too — headings and coverage move together more than any other pair of signals measured.",
    x: 1500,
    y: 200,
  },
  {
    id: "structure-jsonld",
    cluster: "structure",
    kind: "stat",
    label: "Server-side JSON-LD",
    value: `${Math.round((100 * serverSideJsonLd.length) / jsonLdSites.length)}%`,
    sub: `of readable sites ship schema raw — r = ${jsonLdR.toFixed(2)} vs coverage`,
    note: `Structured data is an independent layer: ${serverSideJsonLd.length} sites declare schema server-side, ${jsonLdSites.length - serverSideJsonLd.length} declare none or client-only, and it barely correlates with how much content survives. Schema is a table stake, not a substitute for readable content.`,
    x: 1690,
    y: 380,
  },
  {
    id: "structure-title",
    cluster: "structure",
    kind: "stat",
    label: "Title parity",
    value: `${Math.round((100 * titleParity.length) / jsonLdSites.length)}%`,
    sub: `serve the same <title> to browsers and non-browsers`,
    note: `A quarter of readable homepages hand a non-rendering crawler a different title than the browser shows — a quiet signal of JavaScript-first templating, ${jsonLdSites.length - titleParity.length} sites strong.`,
    x: 1620,
    y: 560,
  },

  /* Context */
  {
    id: "vert-band",
    cluster: "verticals",
    kind: "hub",
    label: "Eight verticals",
    value: `${verticals[verticals.length - 1]?.medianCoverage ?? "—"}% → ${verticals[0]?.medianCoverage ?? "—"}%`,
    sub: "median coverage, reference & education → social",
    note: `Context sets the odds: the vertical a site lives in predicts machine readability better than its rank does. Reference and education sites keep a median ${highestVertical?.medianCoverage ?? "—"}% of content server-rendered; social platforms ${lowestVertical?.medianCoverage ?? "—"}%.`,
    x: 560,
    y: 1090,
  },
  ...verticals.map(
    (group, index): SignalNode => ({
      id: `vert-${group.name.toLowerCase().replace(/[^a-z]+/g, "-")}`,
      cluster: "verticals",
      kind: "chip",
      label: group.name.replace(" & media", "").replace(" & education", "").replace(" & entertainment", "").replace(" & dev", "").replace("E-commerce", "Commerce"),
      value: `${group.medianCoverage ?? "—"}%`,
      sub: `n=${group.n} · ${group.aiBlocks > 0 ? group.aiBlocks : "no"} AI ${group.aiBlocks === 1 ? "block" : "blocks"}`,
      note: `${group.name}: ${group.measured} of ${group.n} readable, median coverage ${group.medianCoverage}%, ${group.blocked} walled, ${group.robotsExcluded} robots-excluded${group.aiBlocks > 0 ? `, ${group.aiBlocks} blocking at least one AI-search crawler` : ", none blocking AI-search crawlers"}.`,
      x: 620 + index * 156,
      y: 1180,
    }),
  ),
];

/* ---------------------------------- Edges ---------------------------------- */

export const signalEdges: SignalEdge[] = [
  {
    id: "e-reach-coverage",
    from: "reach-rank",
    to: "coverage-median",
    kind: "none",
    label: `r = ${rankCoverage.r} · no link`,
    labelAt: { x: 680, y: 247 },
    bend: { x: 868, y: 197 },
    note: `Tranco rank vs coverage: r = ${rankCoverage.r} across ${rankCoverage.n} readable sites — reach and machine readability are independent.`,
  },
  {
    id: "e-access-read",
    from: "access-ai",
    to: "read-readable",
    kind: "strong",
    label: `two gates align · ${Math.round(gptBot.blocked.measuredShare)}% vs ${Math.round(gptBot.open.measuredShare)}% readable`,
    labelAt: { x: 760, y: 625 },
    bend: { x: 702, y: 730 },
    note: `Sites hard-blocking GPTBot are readable without a browser ${Math.round(gptBot.blocked.measuredShare)}% of the time (n=${gptBot.blocked.n}); among the rest, ${Math.round(gptBot.open.measuredShare)}% (n=${gptBot.open.n}) — the study's most stable correlation.`,
  },
  {
    id: "e-read-coverage",
    from: "read-readable",
    to: "coverage-median",
    kind: "linked",
    note: "Coverage is only measurable when a non-rendering client receives usable content — the read gate feeds every coverage number on this map.",
  },
  {
    id: "e-headings-coverage",
    from: "structure-headings",
    to: "coverage-median",
    kind: "strong",
    label: `r = ${headingsR.toFixed(2)} · strongest link`,
    labelAt: { x: 1480, y: 340 },
    bend: { x: 1640, y: 300 },
    note: `Headings and coverage travel together (r = ${headingsR.toFixed(2)}, n = ${headingsPairs.length}) — the clearest same-page signal in the study.`,
  },
  {
    id: "e-jsonld-coverage",
    from: "structure-jsonld",
    to: "coverage-median",
    kind: "none",
    label: `orthogonal · r = ${jsonLdR.toFixed(2)}`,
    labelAt: { x: 1480, y: 450 },
    note: `JSON-LD presence and content coverage are close to independent (r = ${jsonLdR.toFixed(2)}) — schema is its own layer.`,
  },
  {
    id: "e-vert-read",
    from: "vert-band",
    to: "read-readable",
    kind: "context",
    label: `vertical sets the odds · ${verticals[verticals.length - 1]?.medianCoverage ?? "—"}% → ${verticals[0]?.medianCoverage ?? "—"}%`,
    labelAt: { x: 790, y: 795 },
    bend: { x: 790, y: 800 },
    note: `Vertical medians span ${highestVertical?.medianCoverage ?? "—"}% (${highestVertical?.name ?? "—"}) to ${lowestVertical?.medianCoverage ?? "—"}% (${lowestVertical?.name ?? "—"}) — context predicts readability more than rank does.`,
  },
  {
    id: "e-vert-access",
    from: "vert-band",
    to: "access-ai",
    kind: "context",
    label: `${newsVertical?.aiBlocks ?? 0} of ${newsVertical?.n ?? 0} news sites block AI search`,
    labelAt: { x: 533, y: 955 },
    bend: { x: 520, y: 780 },
    note: `News & media: median coverage ${newsVertical?.medianCoverage ?? "—"}% yet ${newsVertical?.aiBlocks ?? 0} of ${newsVertical?.n ?? 0} sites block at least one AI-search crawler — the study's sharpest contradiction.`,
  },

  /* Grouping leads */
  { id: "l-consensus-rank", from: "reach-consensus", to: "reach-rank", kind: "lead" },
  { id: "l-training-ai", from: "access-training", to: "access-ai", kind: "lead" },
  { id: "l-scale-training", from: "access-scale", to: "access-training", kind: "lead" },
  { id: "l-classic-scale", from: "access-classic", to: "access-scale", kind: "lead" },
  { id: "l-amazon-walled", from: "chip-fortress-0", to: "read-walled", kind: "lead" },
  { id: "l-whatsapp-walled", from: "chip-fortress-1", to: "read-walled", kind: "lead" },
  { id: "l-facebook-excluded", from: "chip-fortress-fb", to: "read-excluded", kind: "lead" },
  { id: "l-wiki-club", from: "chip-club-0", to: "coverage-top", kind: "lead" },
  { id: "l-wordpress-club", from: "chip-club-1", to: "coverage-top", kind: "lead" },
  { id: "l-opera-club", from: "chip-club-2", to: "coverage-top", kind: "lead" },
];

export const signalMapCaption = `Every value is derived from the two-pass crawl of ${fmtN(sites.length)} top sites from the pinned Tranco list ${topSitesStudy.meta.tranco.listId} (crawled ${topSitesStudy.meta.runDate}; CC BY 4.0). Drag to pan, scroll to zoom — or jump between groupings with the legend.`;
