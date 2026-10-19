/**
 * Per-domain enrichment joined onto the study sites. Source files are produced by
 * the data-enrichment scripts (never hand-edit) — flat rows keyed by `domain`,
 * where `null` or a missing key means "not measured":
 *   - `data/structured-data.json`  — homepage JSON-LD, raw vs rendered
 *   - `data/site-signals.json`     — CDN, CMS, bot wall, llms.txt, sitemap…
 *   - `data/agent-readiness.json`  — markdown negotiation, Content-Signal, MCP card…
 *   - `data/deep-pages.json`       — one inner page per site, raw vs rendered coverage
 *
 * Each filterable dimension is exported as a `FacetDef` so the explorer renders
 * every one with the same panel.
 */
import structuredRaw from "./data/structured-data.json";
import signalsRaw from "./data/site-signals.json";
import agentRaw from "./data/agent-readiness.json";
import deepRaw from "./data/deep-pages.json";
import type { FacetDef, NumericMetric, TraitIndex } from "@/lib/crossfilter";

type Row = { domain: string } & Record<string, unknown>;
const rowsOf = (raw: unknown) => (raw as { rows: Row[] }).rows;

/** Build a domain → option-ids index from one rule per option. */
function indexBy(rows: Row[], rules: { id: string; test: (row: Row) => boolean }[]): TraitIndex {
  const index: TraitIndex = new Map();
  for (const row of rows) {
    const own = new Set<string>();
    for (const rule of rules) if (rule.test(row)) own.add(rule.id);
    if (own.size) index.set(row.domain, own);
  }
  return index;
}

/** One option per distinct value of a category field, most common first. */
function categoryFacet(
  rows: Row[],
  field: string,
  meta: Pick<FacetDef, "id" | "title" | "caption">,
  limit = 8,
): FacetDef {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = row[field];
    if (typeof value === "string" && value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const options = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => ({ id, label: id }));
  return { ...meta, options, traits: indexBy(rows, options.map((o) => ({ id: o.id, test: (row) => row[field] === o.id }))) };
}

/** One option per boolean field; an option is "on" only when the field is exactly true. */
function flagFacet(
  rows: Row[],
  flags: { id: string; label: string; test: (row: Row) => boolean }[],
  meta: Pick<FacetDef, "id" | "title" | "caption">,
): FacetDef {
  return {
    ...meta,
    options: flags.map(({ id, label }) => ({ id, label })),
    traits: indexBy(rows, flags),
  };
}

const structuredRows = rowsOf(structuredRaw).filter((row) => row.measured === true);
const signalRows = rowsOf(signalsRaw);
const agentRows = rowsOf(agentRaw);
const is = (field: string) => (row: Row) => row[field] === true;

export const schemaFacet = flagFacet(
  structuredRows,
  [
    { id: "organization", label: "Organization", test: is("hasOrganization") },
    { id: "website", label: "WebSite", test: is("hasWebSite") },
    { id: "breadcrumb", label: "BreadcrumbList", test: is("hasBreadcrumb") },
    { id: "faq", label: "FAQPage", test: is("hasFaq") },
    { id: "product", label: "Product", test: is("hasProduct") },
    { id: "article", label: "Article", test: is("hasArticle") },
    { id: "injected", label: "Injected by JS", test: is("injectedByJs") },
  ],
  { id: "schema", title: "Structured data", caption: "Homepage JSON-LD in the raw HTML. Click to keep sites that have it." },
);

export const cdnFacet = categoryFacet(signalRows, "cdn", {
  id: "cdn",
  title: "CDN / edge",
  caption: "Detected from response headers. Sites with no detected CDN are not listed.",
});

export const cmsFacet = categoryFacet(signalRows, "cms", {
  id: "cms",
  title: "CMS / framework",
  caption: "Detected from homepage markup and headers.",
});

export const botWallFacet = categoryFacet(signalRows, "botWall", {
  id: "botwall",
  title: "Bot protection",
  caption: "Vendor challenging non-browser clients on the homepage.",
});

/** The AI-agent discovery surface: files and headers an agent can use before it parses a page. */
export const agentFacet = flagFacet(
  Array.from(
    [...signalRows, ...agentRows]
      .reduce((merged, row) => {
    // site-signals and agent-readiness are separate files; merge per domain so one rule set can test both.
        const existing = merged.get(row.domain);
        merged.set(row.domain, existing ? { ...existing, ...row } : { ...row });
        return merged;
      }, new Map<string, Row>())
      .values(),
  ),
  [
    { id: "llms", label: "llms.txt", test: is("hasLlmsTxt") },
    { id: "llms-full", label: "llms-full.txt", test: is("hasLlmsFullTxt") },
    { id: "ai-txt", label: "ai.txt", test: is("hasAiTxt") },
    { id: "markdown", label: "Markdown for agents", test: (row) => row.markdownNegotiation === true || row.markdownAlternateLink === true },
    { id: "content-signal", label: "Content-Signal", test: is("contentSignal") },
    { id: "mcp", label: "MCP server card", test: is("mcpServerCard") },
    { id: "api-catalog", label: "API catalog", test: is("apiCatalog") },
    { id: "sitemap-robots", label: "Sitemap in robots.txt", test: is("sitemapInRobots") },
  ],
  { id: "agent", title: "Agent-readiness", caption: "Discovery files and headers for AI agents. Click to keep sites that publish them." },
);

/** Panels in display order. */
export const explorerFacets: FacetDef[] = [schemaFacet, agentFacet, cdnFacet, cmsFacet, botWallFacet];

/** domain → a finite number from `field`, where measured. */
function numbersFrom(rows: Row[], field: string): Map<string, number> {
  return new Map(
    rows
      .filter((row) => typeof row[field] === "number" && Number.isFinite(row[field]))
      .map((row) => [row.domain, row[field] as number] as const),
  );
}

const kb = (bytes: number) => (bytes >= 1024 * 10 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024).toFixed(1)} KB`);
const ms = (value: number) => (value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${Math.round(value)} ms`);
const days = (value: number) =>
  value >= 365 ? `${(value / 365).toFixed(1)} yr` : value >= 30 ? `${Math.round(value / 30)} mo` : `${Math.round(value)} d`;

/**
 * Numbers the explorer can plot against homepage coverage. Log scales for anything
 * that spans orders of magnitude; values outside min–max are clamped onto the edge.
 */
export const numericMetrics: NumericMetric[] = [
  {
    id: "inner",
    label: "Inner-page coverage",
    description: "coverage of one inner page",
    scale: "linear",
    min: 0,
    max: 100,
    ticks: [0, 25, 50, 75, 100].map((value) => ({ value, label: `${value}%` })),
    format: (value) => `${value}%`,
    values: numbersFrom(rowsOf(deepRaw), "coverage"),
  },
  {
    id: "ttfb",
    label: "Response time (TTFB)",
    description: "homepage time to first byte (log scale)",
    scale: "log",
    min: 100,
    max: 10000,
    ticks: [100, 300, 1000, 3000, 10000].map((value) => ({ value, label: ms(value) })),
    format: ms,
    values: numbersFrom(signalRows, "ttfbMs"),
  },
  {
    id: "html-size",
    label: "HTML size",
    description: "raw homepage HTML size (log scale, capped at 400 KB by the crawl)",
    scale: "log",
    min: 2048,
    max: 409600,
    ticks: [2048, 10240, 51200, 204800, 409600].map((value) => ({ value, label: kb(value) })),
    format: kb,
    values: numbersFrom(signalRows, "htmlBytes"),
  },
  {
    id: "last-modified",
    label: "Last-Modified age",
    description: "days since the homepage's Last-Modified header (log scale; only sites that send one)",
    scale: "log",
    min: 1,
    max: 3650,
    ticks: [1, 7, 30, 365, 3650].map((value) => ({ value, label: days(value) })),
    format: days,
    values: numbersFrom(agentRows, "lastModifiedAgeDays"),
  },
];
