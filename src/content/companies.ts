import profilesRaw from "./data/company-profiles.json";
import { enrichmentFor } from "./enrichment";
import { crawlerGroups, topSitesStudy } from "./top-sites";
import type { StudySite } from "./top-sites";
import type { PageSeo } from "./types";
import structuredRaw from "./data/structured-data.json";
import deepPagesRaw from "./data/deep-pages.json";
import signalsRaw from "./data/site-signals.json";
import agentRaw from "./data/agent-readiness.json";

export interface CompanyProfile {
  domain: string;
  term: string;
  found: boolean;
  title?: string | null;
  extract?: string | null;
  description?: string | null;
  thumbnail?: string | null;
  url?: string | null;
  error?: string;
}

export const companyProfiles = (profilesRaw as { rows: CompanyProfile[] }).rows;
export const companyProfileByDomain = new Map(companyProfiles.map((p) => [p.domain, p]));

export function studySiteByDomain(domain: string) {
  return topSitesStudy.sites.find((s) => s.domain === domain) ?? null;
}

/**
 * Wikipedia search is best-effort; these domains resolved to an unrelated
 * article (checked by hand against the Tranco list). Shown as "no profile"
 * rather than a wrong one. Remove an entry once the pull script returns a
 * correct article for it.
 */
const PROFILE_MISMATCH = new Set([
  "adriver.ru",
  "amazonalexa.com",
  "ampproject.org",
  "bitrix24.ru",
  "braze.com",
  "eye4.cn",
  "expireddomains.com",
  "geobasket.ru",
  "hotjar.com",
  "ipinfo.io",
  "launchdarkly.com",
  "primevideo.com",
  "stackadapt.com",
  "timeweb.ru",
  "trendmicro.com",
  "vivoglobal.com",
  "withgoogle.com",
  "www.gov.br",
  "www.gov.uk",
  "yellowblue.io",
  "3gppnetwork.org",
  "allaboutcookies.org",
  "bugsnag.com",
  "crpt.ru",
  "drom.ru",
  "erome.com",
  "hugedomains.com",
  "iiko.it",
  "immedia-semi.com",
  "one.one",
  "pki.goog",
  "porkbun.com",
  "quickconnect.to",
  "tagomi.com",
  "trueconf.net",
  "twc.com",
  "unpkg.com",
]);

export interface StructuredDataRow {
  domain: string;
  measured: boolean;
  typesRaw: string[];
  typesRendered: string[];
  typesMissingFromRaw: string[];
  typeCountRaw: number;
  hasOrganization: boolean;
  hasWebSite: boolean;
  hasBreadcrumb: boolean;
  hasFaq: boolean;
  hasProduct: boolean;
  hasArticle: boolean;
  injectedByJs: boolean;
}

export interface DeepPageRow {
  domain: string;
  url: string;
  rawStatus: number;
  rawWords: number;
  renderedWords: number;
  coverage: number | null;
  jsonLdTypesRaw: string[];
  h1Count: number;
  headingSequenceValid: boolean;
  semanticRatio: number;
  hasBreadcrumb: boolean;
  hasFaqSignal: boolean;
  imagesWithAltPct: number | null;
  internalLinks: number;
}

export interface SiteSignalRow {
  domain: string;
  homeStatus: number;
  ttfbMs: number | null;
  htmlBytes: number | null;
  cdn: string | null;
  cms: string | null;
  hasHreflang: boolean;
  hasCanonical: boolean;
  hasLlmsTxt: boolean;
  hasSitemap: boolean;
  sitemapInRobots: boolean;
}

export interface AgentReadinessRow {
  domain: string;
  markdownNegotiation: boolean;
  contentSignal: boolean;
  mcpServerCard: boolean;
  apiCatalog: boolean;
  hasEtag: boolean;
  hasHsts: boolean;
}

const byDomain = <T extends { domain: string }>(rows: T[]) => new Map(rows.map((r) => [r.domain, r]));
const structuredByDomain = byDomain((structuredRaw as unknown as { rows: StructuredDataRow[] }).rows);
const deepPageByDomain = byDomain((deepPagesRaw as unknown as { rows: DeepPageRow[] }).rows);
const signalsByDomain = byDomain((signalsRaw as unknown as { rows: SiteSignalRow[] }).rows);
const agentByDomain = byDomain((agentRaw as unknown as { rows: AgentReadinessRow[] }).rows);

/* ------------------------------ Peer comparison ----------------------------- */

const measuredCoverages = topSitesStudy.sites
  .filter((s): s is StudySite & { coverage: number } => s.classification === "measured" && s.coverage !== null)
  .map((s) => s.coverage)
  .sort((a, b) => a - b);

export interface PeerComparison {
  /** Share of measured sites with lower coverage (0–100); null if this site was not measured. */
  percentile: number | null;
  overallMedian: number;
  groupName: string | null;
  groupMedian: number | null;
  groupMeasured: number;
}

export function peerComparison(site: StudySite): PeerComparison {
  const group = site.group ? topSitesStudy.groups.find((g) => g.name === site.group) : undefined;
  let percentile: number | null = null;
  if (site.classification === "measured" && site.coverage !== null) {
    const below = measuredCoverages.filter((c) => c < site.coverage!).length;
    percentile = Math.round((below / measuredCoverages.length) * 100);
  }
  return {
    percentile,
    overallMedian: topSitesStudy.summary.coverage.median,
    groupName: group?.name ?? null,
    groupMedian: group?.medianCoverage ?? null,
    groupMeasured: group?.measured ?? 0,
  };
}

/* ------------------------------ AI crawler policy --------------------------- */

export interface CrawlerPolicySummary {
  retrieval: { block: number; allow: number; partial: number; unset: number; total: number };
  training: { block: number; allow: number; partial: number; unset: number; total: number };
  headline: string;
}

function tally(site: StudySite, groupId: string) {
  const tokens = crawlerGroups.find((g) => g.id === groupId)?.tokens ?? [];
  const out = { block: 0, allow: 0, partial: 0, unset: 0, total: tokens.length };
  for (const t of tokens) out[site.robots.verdicts[t] ?? "unset"] += 1;
  return out;
}

export function crawlerPolicy(site: StudySite): CrawlerPolicySummary {
  const retrieval = tally(site, "ai-retrieval");
  const training = tally(site, "training-policy");
  let headline: string;
  if (site.classification === "robots_excluded") {
    headline = "robots.txt disallows everything for the wildcard group — all crawlers are kept out.";
  } else if (site.robots.status === 0 || site.robots.status >= 400) {
    headline = "No usable robots.txt — no crawler-specific rules, so nothing is explicitly blocked.";
  } else if (retrieval.block === 0 && training.block === 0) {
    headline =
      retrieval.partial + training.partial > 0
        ? "No AI crawler is blocked outright, but some paths are restricted."
        : "Doesn't block any AI crawler by name.";
  } else if (retrieval.block === 0) {
    const restricted = retrieval.partial > 0 ? "Doesn't block AI retrieval crawlers outright (some paths are restricted)" : "Open to AI search and retrieval";
    headline = `${restricted}, blocks ${training.block} of ${training.total} training and policy crawlers.`;
  } else if (training.block === 0) {
    headline = `Blocks ${retrieval.block} of ${retrieval.total} AI retrieval crawlers but not training crawlers.`;
  } else {
    headline = `Blocks ${retrieval.block} of ${retrieval.total} AI retrieval and ${training.block} of ${training.total} training crawlers.`;
  }
  return { retrieval, training, headline };
}

/* --------------------------------- Findings --------------------------------- */

export type FindingSeverity = "critical" | "warning" | "good" | "info";

export interface Finding {
  id: string;
  severity: FindingSeverity;
  title: string;
  detail: string;
}

const AI_RETRIEVAL = crawlerGroups.find((g) => g.id === "ai-retrieval")?.tokens ?? [];

/**
 * Rule-based observations from the crawl. Deterministic and traceable: every
 * finding names the measurement behind it. Mirrors the gate flags in
 * docs/geo-recommendation-engine.md §2.3, limited to what the study measured.
 */
export function companyFindings(site: StudySite): Finding[] {
  const out: Finding[] = [];
  const m = site.metrics;
  const sd = structuredByDomain.get(site.domain);
  const signals = signalsByDomain.get(site.domain);

  if (site.classification === "robots_excluded") {
    out.push({
      id: "robots-all",
      severity: "critical",
      title: "robots.txt blocks every crawler",
      detail: "The wildcard group disallows the whole site, so AI and search crawlers alike are asked to stay away.",
    });
  }
  if (site.classification === "both_blocked" || site.classification === "raw_blocked") {
    out.push({
      id: "bot-wall",
      severity: "critical",
      title: site.classification === "both_blocked" ? "Hard wall for all clients" : "Browser-only wall",
      detail:
        site.classification === "both_blocked"
          ? "Neither a plain HTTP fetch nor a headless browser got usable content. AI crawlers will not read this site."
          : "Plain HTTP clients get a block page or empty shell while a browser works — the pattern AI crawlers hit behind CDN bot rules.",
    });
  }
  const blockedRetrieval = AI_RETRIEVAL.filter((t) => site.robots.verdicts[t] === "block");
  if (blockedRetrieval.length > 0 && site.classification !== "robots_excluded") {
    out.push({
      id: "retrieval-blocked",
      severity: "critical",
      title: `Blocks AI retrieval crawlers (${blockedRetrieval.length})`,
      detail: `${blockedRetrieval.join(", ")} cannot fetch pages to answer user questions, so the site is less likely to be cited.`,
    });
  }
  if (site.coverage !== null && site.classification === "measured") {
    if (site.coverage < 50) {
      out.push({
        id: "js-wall",
        severity: "critical",
        title: `Only ${site.coverage}% of content is in the raw HTML`,
        detail: "Crawlers that do not run JavaScript see less than half of what a browser shows. Server-side rendering or prerendering closes the gap.",
      });
    } else if (site.coverage < 80) {
      out.push({
        id: "js-partial",
        severity: "warning",
        title: `${site.coverage}% of content is in the raw HTML`,
        detail: "A noticeable share of the page only appears after JavaScript runs, and non-rendering AI crawlers miss it.",
      });
    } else {
      out.push({
        id: "js-ok",
        severity: "good",
        title: `${site.coverage}% of content is server-rendered`,
        detail: "Non-rendering crawlers receive nearly everything a browser does.",
      });
    }
  }
  if (m && m.jsonLdMissingFromRaw.length > 0) {
    out.push({
      id: "jsonld-js",
      severity: "warning",
      title: "Structured data is added by JavaScript",
      detail: `${m.jsonLdMissingFromRaw.join(", ")} only appear in the rendered page, so crawlers that skip JS never see them.`,
    });
  }
  if (sd?.measured) {
    if (sd.typeCountRaw === 0) {
      out.push({
        id: "no-schema",
        severity: "warning",
        title: "No JSON-LD in the raw homepage HTML",
        detail: "Nothing machine-readable describes the organization, site or page to a non-rendering crawler.",
      });
    } else if (!sd.hasOrganization) {
      out.push({
        id: "no-org",
        severity: "info",
        title: "No Organization schema",
        detail: "Organization markup helps engines resolve who the site belongs to (name, logo, sameAs profiles).",
      });
    } else {
      out.push({
        id: "org-ok",
        severity: "good",
        title: "Organization schema present",
        detail: "Declared in the raw HTML, so crawlers can read it without running JavaScript.",
      });
    }
  }
  if (m?.titleDiffers) {
    out.push({
      id: "title-differs",
      severity: "info",
      title: "<title> changes after rendering",
      detail: "The title in the raw HTML differs from the one a browser ends up with; crawlers that skip JS index the first.",
    });
  }
  if (signals && !signals.hasSitemap) {
    out.push({
      id: "no-sitemap",
      severity: "warning",
      title: "No sitemap detected",
      detail: "No sitemap was found at the standard locations, which makes discovery of deeper pages harder.",
    });
  } else if (signals && !signals.sitemapInRobots) {
    out.push({
      id: "sitemap-robots",
      severity: "info",
      title: "Sitemap not referenced in robots.txt",
      detail: "A Sitemap: line in robots.txt is the standard way for crawlers to find it.",
    });
  }
  if (signals && !signals.hasLlmsTxt) {
    out.push({
      id: "no-llms",
      severity: "info",
      title: "No llms.txt",
      detail: "Optional and not yet widely honored, but a cheap signal for AI tools.",
    });
  }
  return out;
}

const SEVERITY_ORDER: Record<FindingSeverity, number> = { critical: 0, warning: 1, info: 2, good: 3 };
export const sortFindings = (f: Finding[]) =>
  [...f].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

/* -------------------------------- Neighbors --------------------------------- */

export function companyNeighbors(site: StudySite) {
  const sites = [...topSitesStudy.sites].sort((a, b) => a.rank - b.rank);
  const i = sites.findIndex((s) => s.domain === site.domain);
  const sameGroup = site.group
    ? sites.filter((s) => s.group === site.group && s.domain !== site.domain).slice(0, 8)
    : [];
  return {
    previous: i > 0 ? sites[i - 1] : null,
    next: i >= 0 && i < sites.length - 1 ? sites[i + 1] : null,
    sameGroup,
  };
}

export function companyDeepDive(domain: string) {
  const site = studySiteByDomain(domain);
  const rawProfile = companyProfileByDomain.get(domain) ?? null;
  const profile = rawProfile && PROFILE_MISMATCH.has(domain) ? { domain: rawProfile.domain, term: rawProfile.term, found: false } : rawProfile;
  const enrichment = site ? enrichmentFor(domain, site.rank) : null;
  return {
    domain,
    site,
    profile,
    enrichment,
    structured: structuredByDomain.get(domain) ?? null,
    deepPage: deepPageByDomain.get(domain) ?? null,
    signals: signalsByDomain.get(domain) ?? null,
    agent: agentByDomain.get(domain) ?? null,
  };
}

/* ----------------------------------- SEO ------------------------------------ */

export const companyPath = (domain: string) => `/company/${encodeURIComponent(domain)}`;

/** Every study domain that gets a prerendered company page. */
export const companyDomains = topSitesStudy.sites.map((s) => s.domain);

export function companySeo(domain: string): PageSeo {
  const site = studySiteByDomain(domain);
  const path = companyPath(domain);
  if (!site) {
    return {
      title: `${domain} — not in the study | Seobot`,
      description: `${domain} is not part of the Seobot AI-readiness study.`,
      path,
      robots: "noindex",
    };
  }
  const policy = crawlerPolicy(site);
  const coverage =
    site.coverage !== null && site.classification === "measured"
      ? `${site.coverage}% of its homepage content is in the raw HTML. `
      : "";
  return {
    title: `${domain}: AI crawler access & readiness | Seobot`,
    description: `${coverage}${policy.headline} Tranco rank #${site.rank}.`.slice(0, 200),
    path,
  };
}
