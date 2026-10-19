/**
 * Cross-filter model for the linked site explorer.
 *
 * Pure functions, no React. Every panel asks `filterSites(sites, filters, omit)`
 * for "the sites in view, ignoring my own dimension" — the classic crossfilter
 * contract, so a panel keeps showing its full distribution while it is the one
 * being filtered.
 */
import type { SiteClassification, StudySite } from "@/content/top-sites";

export type LayoutMode = "rank" | "vertical" | "outcome" | "metric";

export interface SiteFilters {
  query: string;
  /** Vertical names (StudySite.group). */
  groups: string[];
  /** Crawler tokens — keeps sites whose robots.txt blocks ANY selected token. */
  blockedBy: string[];
  classes: SiteClassification[];
  /** Coverage decile indices (0 = 0–9%, 9 = 90–100%). */
  bands: number[];
  /**
   * Selected option ids per facet panel (schema flags, CDN, CMS…). Within a facet a
   * site needs ANY selected option; across facets it needs all of them.
   */
  facets: Record<string, string[]>;
}

/** A dimension a panel can omit from its own count: a built-in key, or `facet:<id>`. */
export type FilterKey = Exclude<keyof SiteFilters, "facets"> | `facet:${string}`;

export const EMPTY_FILTERS: SiteFilters = {
  query: "",
  groups: [],
  blockedBy: [],
  classes: [],
  bands: [],
  facets: {},
};

export const BAND_COUNT = 10;

export function coverageBand(coverage: number): number {
  return Math.min(BAND_COUNT - 1, Math.max(0, Math.floor(coverage / 10)));
}

export function isFiltered(filters: SiteFilters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.groups.length > 0 ||
    filters.blockedBy.length > 0 ||
    filters.classes.length > 0 ||
    filters.bands.length > 0 ||
    Object.values(filters.facets).some((ids) => ids.length > 0)
  );
}

/** domain → option ids, for a facet that lives outside StudySite (schema flags, CDN, CMS…). */
export type TraitIndex = Map<string, Set<string>>;

/** facet id → its trait index. */
export type FacetIndex = Record<string, TraitIndex>;

/** A filter panel: its copy, its options, and which domains carry each option. */
export interface FacetDef {
  id: string;
  title: string;
  caption: string;
  options: { id: string; label: string }[];
  traits: TraitIndex;
}

export function matchesFilters(site: StudySite, filters: SiteFilters, omit?: FilterKey, facets?: FacetIndex): boolean {
  const needle = filters.query.trim().toLowerCase();
  if (omit !== "query" && needle && !site.domain.includes(needle)) return false;
  if (omit !== "groups" && filters.groups.length && !(site.group && filters.groups.includes(site.group))) return false;
  if (omit !== "classes" && filters.classes.length && !filters.classes.includes(site.classification)) return false;
  if (
    omit !== "blockedBy" &&
    filters.blockedBy.length &&
    !filters.blockedBy.some((token) => site.robots.verdicts[token] === "block")
  ) {
    return false;
  }
  for (const [facetId, selected] of Object.entries(filters.facets)) {
    if (!selected.length || omit === `facet:${facetId}`) continue;
    const own = facets?.[facetId]?.get(site.domain);
    if (!own || !selected.some((id) => own.has(id))) return false;
  }
  if (omit !== "bands" && filters.bands.length) {
    if (site.coverage === null || !filters.bands.includes(coverageBand(site.coverage))) return false;
  }
  return true;
}

export function filterSites(sites: StudySite[], filters: SiteFilters, omit?: FilterKey, facets?: FacetIndex): StudySite[] {
  return sites.filter((site) => matchesFilters(site, filters, omit, facets));
}

export function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function medianCoverage(sites: StudySite[]): number | null {
  const values = sites
    .filter((site) => site.classification === "measured" && site.coverage !== null)
    .map((site) => site.coverage as number)
    .sort((a, b) => a - b);
  if (!values.length) return null;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 ? values[mid]! : (values[mid - 1]! + values[mid]!) / 2;
}

export function share(sites: StudySite[], predicate: (site: StudySite) => boolean): number {
  if (!sites.length) return 0;
  return (sites.filter(predicate).length / sites.length) * 100;
}

/* --------------------------------- Layouts --------------------------------- */

export interface LayoutColumn {
  id: string;
  label: string;
  title?: string;
  /** Center, 0–1. */
  x: number;
  /** Column width, 0–1 (0 when the layout has no column bands). */
  width?: number;
}

export interface SiteLayout {
  positions: Map<string, { x: number; y: number }>;
  columns: LayoutColumn[];
  /** Horizontal reference lines. Omitted → the default 0–100% coverage rows. */
  rows?: { id: string; label: string; at: number }[];
}

/** A per-domain number the explorer can put on the vertical axis. */
export interface NumericMetric {
  id: string;
  label: string;
  /** What the axis means, for the caption. */
  description: string;
  scale: "linear" | "log";
  min: number;
  max: number;
  /** Labelled gridlines, low to high. */
  ticks: { value: number; label: string }[];
  /** Formats a raw value for hover cards. */
  format: (value: number) => string;
  values: Map<string, number>;
}

/** 0 (min) to 1 (max) along a metric's scale, clamped. */
export function metricFraction(metric: NumericMetric, value: number): number {
  const v = Math.min(metric.max, Math.max(metric.min, value));
  const t =
    metric.scale === "log"
      ? (Math.log(v) - Math.log(metric.min)) / (Math.log(metric.max) - Math.log(metric.min))
      : (v - metric.min) / (metric.max - metric.min);
  return Math.min(1, Math.max(0, t));
}

/** Share of plot height used for coverage; the rest is the "no readable page" strip. */
export const COVERAGE_SPAN = 0.88;
export const NO_COVERAGE_Y = 0.975;

/** Deterministic 0–1 jitter so layouts are stable across renders and reloads. */
function jitter(rank: number, salt = 0): number {
  return ((rank + salt) * 0.6180339887) % 1;
}

function coverageY(site: StudySite): number {
  return site.coverage === null ? NO_COVERAGE_Y : (1 - site.coverage / 100) * COVERAGE_SPAN;
}

export interface LayoutOptions {
  /** Ordered vertical names → short column labels. */
  groups: { id: string; label: string }[];
  outcomes: { id: SiteClassification; label: string }[];
  /** The numeric measure plotted on the vertical axis in the "metric" layout. */
  metric?: NumericMetric;
}

/**
 * Every layout keeps y = coverage, so switching modes only re-spreads x —
 * which is what makes the morph legible.
 */
export function layoutSites(sites: StudySite[], mode: LayoutMode, options: LayoutOptions): SiteLayout {
  const positions = new Map<string, { x: number; y: number }>();

  if (mode === "rank") {
    const maxRank = Math.max(...sites.map((site) => site.rank), 1);
    for (const site of sites) {
      positions.set(site.domain, { x: (site.rank - 1) / Math.max(1, maxRank - 1), y: coverageY(site) });
    }
    const ticks = [1, Math.round(maxRank / 4), Math.round(maxRank / 2), Math.round((maxRank * 3) / 4), maxRank];
    return {
      positions,
      columns: ticks.map((rank) => ({ id: `r${rank}`, label: `#${rank}`, x: (rank - 1) / Math.max(1, maxRank - 1) })),
    };
  }

  if (mode === "metric" && options.metric) {
    // x = homepage coverage, y = the chosen metric. Sites missing either sit in the n/a strip.
    const metric = options.metric;
    for (const site of sites) {
      const value = metric.values.get(site.domain);
      const has = site.coverage !== null && value !== undefined;
      positions.set(site.domain, {
        x: has ? site.coverage! / 100 : 0.03 + jitter(site.rank) * 0.94,
        y: has ? (1 - metricFraction(metric, value!)) * COVERAGE_SPAN : NO_COVERAGE_Y,
      });
    }
    return {
      positions,
      columns: [0, 25, 50, 75, 100].map((value) => ({ id: `h${value}`, label: `${value}%`, x: value / 100 })),
      rows: [
        ...metric.ticks.map((tick) => ({
          id: `m${tick.value}`,
          label: tick.label,
          at: (1 - metricFraction(metric, tick.value)) * COVERAGE_SPAN,
        })),
        { id: "na", label: "n/a", at: NO_COVERAGE_Y },
      ],
    };
  }

  const buckets: { id: string; label: string; title?: string; test: (site: StudySite) => boolean }[] =
    mode === "vertical"
      ? [
          ...options.groups.map((group) => ({
            id: group.id,
            label: group.label,
            title: group.id,
            test: (site: StudySite) => site.group === group.id,
          })),
          { id: "__other", label: "Other", title: "Not in a curated vertical", test: (site: StudySite) => !site.group },
        ]
      : options.outcomes.map((outcome) => ({
          id: outcome.id,
          label: outcome.label,
          test: (site: StudySite) => site.classification === outcome.id,
        }));

  const indexOf = (site: StudySite) => Math.max(0, buckets.findIndex((bucket) => bucket.test(site)));
  const counts = buckets.map(() => 0);
  for (const site of sites) counts[indexOf(site)]! += 1;

  // Column width grows with sqrt(count): a 400-site bucket stays readable without starving the small ones.
  const weights = counts.map((count) => Math.max(2.5, Math.sqrt(count) / 2));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const spans: { start: number; width: number }[] = [];
  let cursor = 0;
  for (const weight of weights) {
    const width = weight / totalWeight;
    spans.push({ start: cursor, width });
    cursor += width;
  }

  const columns: LayoutColumn[] = buckets.map((bucket, index) => ({
    id: bucket.id,
    label: bucket.label,
    title: bucket.title,
    x: spans[index]!.start + spans[index]!.width / 2,
    width: spans[index]!.width,
  }));

  for (const site of sites) {
    const index = indexOf(site);
    const span = spans[index]!;
    positions.set(site.domain, {
      x: span.start + span.width * (0.5 + (jitter(site.rank) - 0.5) * 0.8),
      y: coverageY(site),
    });
  }
  return { positions, columns };
}

/** Toggle one option inside a facet, dropping the facet key when it empties. */
export function toggleFacet(filters: SiteFilters, facetId: string, optionId: string): SiteFilters {
  const next = toggleValue(filters.facets[facetId] ?? [], optionId);
  const facets = { ...filters.facets };
  if (next.length) facets[facetId] = next;
  else delete facets[facetId];
  return { ...filters, facets };
}
