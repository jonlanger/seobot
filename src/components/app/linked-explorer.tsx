import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Box, Grid2x2, Table2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  ChartFrame,
  CollapsibleSearch,
  Dialog,
  DotField,
  FilterChip,
  LinkedBarList,
  LinkedColumns,
  SelectMenu,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import type { Dot, LinkedBarItem } from "@/components/ui";
import { classificationMeta, crawlerGroups, verdictBadgeVariant, verdictMeta } from "@/content/top-sites";
import type { SiteClassification, StudyGroup, StudySite } from "@/content/top-sites";
import {
  BAND_COUNT,
  COVERAGE_SPAN,
  NO_COVERAGE_Y,
  coverageBand,
  filterSites,
  isFiltered,
  layoutSites,
  share,
} from "@/lib/crossfilter";
import type { FacetDef, FacetIndex, LayoutMode, NumericMetric } from "@/lib/crossfilter";
import { useSiteFilters } from "@/lib/use-site-filters";
import { cn } from "@/lib/cn";
import { buildDimensions, NO_DIMENSION } from "@/lib/dimensions";
import { InfoPopover } from "@/components/ui";
import { DotField3D } from "./dot-field-3d";
import type { Dot3 } from "./dot-field-3d";
import { SiteDetail } from "./site-explorer";

const LAYOUT_LABELS: Record<LayoutMode, string> = {
  rank: "Rank",
  vertical: "Vertical",
  outcome: "Outcome",
  metric: "Metric",
};

const LAYOUT_CAPTIONS: Record<LayoutMode, string> = {
  rank: "Height is the share of the rendered page present in raw HTML; left to right is Tranco rank.",
  vertical: "Height is the share of the rendered page present in raw HTML; columns are curated verticals.",
  outcome: "Height is the share of the rendered page present in raw HTML; columns are what a non-rendering client received.",
  metric: "Left to right is homepage coverage; height is the chosen metric. Sites missing either value sit in the n/a strip.",
};

const GROUP_SHORT_NAMES: Record<string, string> = {
  "Streaming & entertainment": "Streaming",
  "Reference & edu": "Reference",
  "News & media": "News",
  "Cloud & dev": "Cloud",
  "Search engines": "Search",
};

const OUTCOME_SHORT_NAMES: Partial<Record<SiteClassification, string>> = {
  raw_blocked: "Browser wall",
  both_blocked: "Hard wall",
  robots_excluded: "Robots-out",
  render_incomplete: "Incomplete",
  render_failed: "Failed",
  crawl_error: "Error",
};

/** Dot color encodes coverage with the semantic tones; unmeasured sites fall back to outcome colors. */
function dotTone(site: StudySite): string {
  if (site.coverage !== null) {
    if (site.coverage >= 70) return "bg-success";
    if (site.coverage >= 40) return "bg-warning";
    return "bg-destructive";
  }
  return site.classification === "both_blocked" ? "bg-destructive" : "bg-muted-foreground";
}

/* ------------------------------- Hover card -------------------------------- */

function SiteHoverCard({ site, metricValue }: { site: StudySite; metricValue?: { label: string; text: string } }) {
  const meta = classificationMeta[site.classification];
  const gpt = site.robots.verdicts.GPTBot ?? "unset";
  const words = site.metrics;
  return (
    <div className="grid gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-mono text-sm font-medium">{site.domain}</span>
        <span className="numeric font-mono text-xs text-muted-foreground">#{site.rank}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge variant={meta.tone} size="sm" dot>
          {meta.label}
        </Badge>
        <Badge variant={verdictBadgeVariant[gpt]} size="sm">
          GPTBot: {verdictMeta[gpt].label.toLowerCase()}
        </Badge>
      </div>
      {site.coverage !== null && words ? (
        <div className="grid gap-1.5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">AI-visible</span>
            <span className="numeric font-mono font-medium">{site.coverage}%</span>
          </div>
          <div className="grid gap-1" aria-hidden>
            <div className="h-1.5 rounded-full bg-muted">
              <div className="h-full origin-left rounded-full bg-chart-2" style={{ width: "100%" }} />
            </div>
            <div className="h-1.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-chart-1"
                style={{ width: `${Math.min(100, (words.rawWords / Math.max(1, words.renderedWords)) * 100)}%` }}
              />
            </div>
          </div>
          <div className="numeric flex justify-between font-mono text-[0.625rem] text-muted-foreground">
            <span>{words.renderedWords.toLocaleString()} rendered words</span>
            <span>{words.rawWords.toLocaleString()} raw</span>
          </div>
        </div>
      ) : (
        <p className="text-xs leading-relaxed text-muted-foreground">{meta.description}</p>
      )}
      {metricValue && (
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">{metricValue.label}</span>
          <span className="numeric font-mono font-medium">{metricValue.text}</span>
        </div>
      )}
      <span className="text-[0.625rem] text-muted-foreground">{site.group ?? "No curated vertical"} · click for details</span>
    </div>
  );
}

/* -------------------------------- Explorer --------------------------------- */

export interface ExplorerDataset {
  id: string;
  label: string;
  sites: StudySite[];
  groups: StudyGroup[];
  /** Sample caveat shown under the chart title, e.g. how many crawl passes each rank range got. */
  note?: string;
}

export interface LinkedExplorerProps {
  /** One or more site sets; a switch appears when there is more than one. */
  datasets: ExplorerDataset[];
  /** Extra filter panels (schema, CDN, CMS…), rendered in order. */
  facets?: FacetDef[];
  /** Numbers that can be plotted against homepage coverage in the "By metric" arrangement. */
  metrics?: NumericMetric[];
  onOpenCompany?: (domain: string) => void;
  /**
   * Controlled selection. When `onSelect` is given the parent shows the detail
   * (e.g. in a right sidebar) and the built-in dialog is not rendered.
   */
  selected?: StudySite | null;
  onSelect?: (site: StudySite | null) => void;
  /**
   * When set, the linked filter panels render into this element (a page-level
   * right sidebar) instead of beside the chart, and the chart takes the full width.
   */
  asideTarget?: HTMLElement | null;
  /** When set, search + view + arrangement controls render into this element (the page's top bar). */
  toolbarTarget?: HTMLElement | null;
  /** Page title block. In 3D it floats over the viewer on a flat surface; otherwise it sits above the chart. */
  heading?: React.ReactNode;
  /** Method note, shown in an info popover. */
  footnote?: React.ReactNode;
  className?: string;
}

/**
 * The cross-filtered explorer: one dot per site, morphing between layouts, with
 * stats and three linked panels that both show and drive the same filters.
 * Binds data via props — the page decides which study to pour in.
 */
export function LinkedExplorer({
  datasets,
  facets = [],
  metrics = [],
  onOpenCompany,
  selected: controlled,
  onSelect,
  asideTarget,
  toolbarTarget,
  heading,
  footnote,
  className,
}: LinkedExplorerProps) {
  const { filters, toggle, toggleFacet, setQuery, reset, layout, setLayout, metricId, setMetricId } = useSiteFilters();
  const metric = metrics.find((m) => m.id === metricId) ?? metrics[0];
  const facetIndex: FacetIndex = useMemo(() => Object.fromEntries(facets.map((facet) => [facet.id, facet.traits])), [facets]);
  const [datasetId, setDatasetId] = useState(datasets[0]!.id);
  /** Whether the narrow-width search field is expanded over the tabs. */
  const [searchOpen, setSearchOpen] = useState(false);
  const { sites, groups, note } = datasets.find((dataset) => dataset.id === datasetId) ?? datasets[0]!;
  const [localSelected, setLocalSelected] = useState<StudySite | null>(null);
  const external = onSelect !== undefined;
  const selected = external ? (controlled ?? null) : localSelected;
  const setSelected = external ? onSelect : setLocalSelected;

  /* 3D: depth (Z) and sphere size are picked from the same measures. 3D is the default; 2D is the flat scatter. */
  const [dimension, setDimension] = useState<"3d" | "2d" | "table">("3d");
  const [depthId, setDepthId] = useState("words");
  const [sizeId, setSizeId] = useState("rank");
  const dimensions = useMemo(() => buildDimensions(sites, metrics), [sites, metrics]);
  const depthDim = dimensions.find((d) => d.id === depthId);
  const sizeDim = dimensions.find((d) => d.id === sizeId);

  const byDomain = useMemo(() => new Map(sites.map((site) => [site.domain, site])), [sites]);
  const view = useMemo(() => filterSites(sites, filters, undefined, facetIndex), [sites, filters, facetIndex]);
  const viewIds = useMemo(() => new Set(view.map((site) => site.domain)), [view]);
  const filtered = isFiltered(filters);

  /* Layout + dots ---------------------------------------------------------- */
  const groupColumns = useMemo(
    () => groups.map((group) => ({ id: group.name, label: GROUP_SHORT_NAMES[group.name] ?? group.name })),
    [groups],
  );
  const outcomeColumns = useMemo(
    () =>
      (Object.keys(classificationMeta) as SiteClassification[])
        .filter((id) => sites.some((site) => site.classification === id))
        .map((id) => ({ id, label: OUTCOME_SHORT_NAMES[id] ?? classificationMeta[id].label })),
    [sites],
  );
  const layoutResult = useMemo(
    () => layoutSites(sites, layout, { groups: groupColumns, outcomes: outcomeColumns, metric }),
    [sites, layout, groupColumns, outcomeColumns, metric],
  );
  const dots: Dot[] = useMemo(
    () =>
      sites.map((site) => {
        const position = layoutResult.positions.get(site.domain) ?? { x: 0, y: 0 };
        return {
          id: site.domain,
          x: position.x,
          y: position.y,
          tone: dotTone(site),
          active: viewIds.has(site.domain),
          label: `${site.domain}, rank ${site.rank}`,
        };
      }),
    [sites, layoutResult, viewIds],
  );

  const dots3: Dot3[] = useMemo(
    () =>
      dots.map((dot, index) => {
        const site = sites[index]!;
        return {
          ...dot,
          z: depthDim ? (depthDim.fraction(site) ?? 0) : 0.5,
          size: sizeDim ? (sizeDim.fraction(site) ?? 0) : 0.5,
        };
      }),
    [dots, sites, depthDim, sizeDim],
  );

  /* Linked panels (each ignores its own dimension) ------------------------- */
  const bandItems: LinkedBarItem[] = useMemo(() => {
    const count = (list: StudySite[]) => {
      const bins = Array<number>(BAND_COUNT).fill(0);
      for (const site of list) if (site.coverage !== null) bins[coverageBand(site.coverage)]! += 1;
      return bins;
    };
    const all = count(sites);
    const now = count(filterSites(sites, filters, "bands", facetIndex));
    return all.map((total, index) => ({
      id: String(index),
      label: `${index * 10}`,
      total,
      value: now[index]!,
      hint: `${index * 10}–${index === BAND_COUNT - 1 ? 100 : index * 10 + 9}% AI-visible: ${now[index]} of ${total} sites`,
    }));
  }, [sites, filters, facetIndex]);

  const groupItems: LinkedBarItem[] = useMemo(() => {
    const base = filterSites(sites, filters, "groups", facetIndex);
    return groups.map((group) => {
      const value = base.filter((site) => site.group === group.name).length;
      return { id: group.name, label: GROUP_SHORT_NAMES[group.name] ?? group.name, total: group.n, value, hint: `${group.name}: ${value} of ${group.n}` };
    });
  }, [sites, groups, filters, facetIndex]);

  const outcomeItems: LinkedBarItem[] = useMemo(() => {
    const base = filterSites(sites, filters, "classes", facetIndex);
    return outcomeColumns.map((outcome) => ({
      id: outcome.id,
      label: classificationMeta[outcome.id].label,
      total: sites.filter((site) => site.classification === outcome.id).length,
      value: base.filter((site) => site.classification === outcome.id).length,
      hint: classificationMeta[outcome.id].description,
    }));
  }, [sites, filters, outcomeColumns, facetIndex]);

  /** Per facet: the full count (context bar) and the count in view ignoring that facet's own selection. */
  const facetItems: Record<string, LinkedBarItem[]> = useMemo(() => {
    const out: Record<string, LinkedBarItem[]> = {};
    for (const facet of facets) {
      const base = filterSites(sites, filters, `facet:${facet.id}`, facetIndex);
      const has = (list: StudySite[], id: string) => list.filter((site) => facet.traits.get(site.domain)?.has(id)).length;
      out[facet.id] = facet.options.map((option) => ({
        id: option.id,
        label: option.label,
        total: has(sites, option.id),
        value: has(base, option.id),
        hint: `${facet.title}: ${option.label}. Click to keep only sites that have it.`,
      }));
    }
    return out;
  }, [sites, filters, facets, facetIndex]);

  const crawlerItems: LinkedBarItem[] = useMemo(() => {
    const base = filterSites(sites, filters, "blockedBy", facetIndex);
    const pct = (list: StudySite[], token: string) => share(list, (site) => site.robots.verdicts[token] === "block");
    return crawlerGroups
      .flatMap((group) => group.tokens)
      .map((token) => ({
        id: token,
        label: <span className="font-mono">{token}</span>,
        total: pct(sites, token),
        value: pct(base, token),
        hint: `Click to keep only sites that block ${token}`,
      }));
  }, [sites, filters, facetIndex]);

  const max = (items: LinkedBarItem[]) => Math.max(1, ...items.map((item) => Math.max(item.total, item.value)));

  /* Toolbar ------------------------------------------------------------------ */
  const chips = [
    ...filters.groups.map((id) => ({ key: `v:${id}`, label: id, remove: () => toggle("groups", id) })),
    ...filters.classes.map((id) => ({ key: `c:${id}`, label: classificationMeta[id].label, remove: () => toggle("classes", id) })),
    ...filters.blockedBy.map((id) => ({ key: `b:${id}`, label: `Blocks ${id}`, remove: () => toggle("blockedBy", id) })),
    ...facets.flatMap((facet) =>
      (filters.facets[facet.id] ?? []).map((id) => ({
        key: `f:${facet.id}:${id}`,
        label: `${facet.title}: ${facet.options.find((option) => option.id === id)?.label ?? id}`,
        remove: () => toggleFacet(facet.id, id),
      })),
    ),
    ...filters.bands.map((id) => ({
      key: `a:${id}`,
      label: `${id * 10}–${id === BAND_COUNT - 1 ? 100 : id * 10 + 9}% visible`,
      remove: () => toggle("bands", id),
    })),
  ];

  /**
   * Controls adapt to the room they actually have, not the viewport: the topbar's free width depends
   * on both sidebars. `@container` makes the container-query classes below respond to this wrapper.
   * Wide: search field + labelled tabs. Narrower: icon-only tabs. Narrowest: the search becomes an
   * icon button that expands over the tabs until it is cleared or submitted.
   */
  const tabClass = "flex-1 gap-1.5 px-2.5 text-xs @xl:flex-none @xl:px-3 @2xl:text-sm";
  const tabLabel = "hidden @xl:inline";
  const controls = (
    <div className="@container min-w-0 w-full">
      <div className="flex items-center gap-2">
        <CollapsibleSearch
          value={filters.query}
          onValueChange={setQuery}
          placeholder="Find a domain…"
          aria-label="Find a domain"
          open={searchOpen}
          onOpenChange={setSearchOpen}
          inlineClassName="@md:w-44 @xl:w-64"
        />
        <div className={cn("flex min-w-0 items-center gap-2", searchOpen && "@max-md:hidden")}>
          {datasets.length > 1 && (
            <Tabs
              value={datasetId}
              onValueChange={(value) => {
                setDatasetId(value);
                setSelected(null);
              }}
            >
              <TabsList aria-label="Site set">
                {datasets.map((dataset) => (
                  <TabsTrigger key={dataset.id} value={dataset.id}>
                    {dataset.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          <Tabs value={dimension} onValueChange={(value) => setDimension(value as "3d" | "2d" | "table")}>
            <TabsList aria-label="Chart dimensions">
              <TabsTrigger value="3d" aria-label="3D" title="3D" className={tabClass}>
                <Box className="size-4" aria-hidden />
                <span className={tabLabel}>3D</span>
              </TabsTrigger>
              <TabsTrigger value="2d" aria-label="2D" title="2D" className={tabClass}>
                <Grid2x2 className="size-4" aria-hidden />
                <span className={tabLabel}>2D</span>
              </TabsTrigger>
              <TabsTrigger value="table" aria-label="Table" title="Table" className={tabClass}>
                <Table2 className="size-4" aria-hidden />
                <span className={tabLabel}>Table</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </div>
  );

  const chipsRow = (
  <div className="flex flex-wrap items-center gap-2">
    {chips.map((chip) => (
      <FilterChip key={chip.key} onRemove={chip.remove}>
        {chip.label}
      </FilterChip>
    ))}
    {filtered && (
      <Button variant="ghost" size="sm" onClick={reset} className="ml-auto">
        Reset
      </Button>
    )}
  </div>
  );

  const toolbar = toolbarTarget ? (
    chips.length > 0 ? <div className="rounded-xl border border-border bg-surface p-3">{chipsRow}</div> : null
  ) : (
    // Tablet and mobile: no outer card — the controls sit directly on the page.
    <div className="grid gap-3">
      {controls}
      {chips.length > 0 && chipsRow}
    </div>
  );

  const topbarControls = toolbarTarget ? createPortal(controls, toolbarTarget) : null;

  /* Table fallback (also the keyboard path) -------------------------------- */
  const table = (
    <div className="max-h-[calc(100dvh-16rem)] overflow-y-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-16 pl-4">Rank</TableHead>
            <TableHead>Site</TableHead>
            <TableHead>Vertical</TableHead>
            <TableHead>AI-visible</TableHead>
            <TableHead>Outcome</TableHead>
            <TableHead className="pr-4">GPTBot</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {view.map((site) => (
            <TableRow key={site.domain}>
              <TableCell className="numeric pl-4 font-mono text-xs text-muted-foreground">#{site.rank}</TableCell>
              <TableCell>
                <button type="button" onClick={() => setSelected(site)} className="rounded-sm font-medium hover:underline focus-ring">
                  {site.domain}
                </button>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{site.group ?? "—"}</TableCell>
              <TableCell className="numeric font-mono text-xs">{site.coverage !== null ? `${site.coverage}%` : "—"}</TableCell>
              <TableCell>
                <Badge variant={classificationMeta[site.classification].tone} size="sm">
                  {classificationMeta[site.classification].label}
                </Badge>
              </TableCell>
              <TableCell className="pr-4">
                <Badge variant={verdictBadgeVariant[site.robots.verdicts.GPTBot ?? "unset"]} size="sm">
                  {verdictMeta[site.robots.verdicts.GPTBot ?? "unset"].label}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const guideColumns = layoutResult.columns.map((column) => ({ id: column.id, label: column.label, title: column.title, at: column.x, width: column.width }));
  const guideRows =
    layoutResult.rows ??
    [100, 75, 50, 25, 0]
      .map((value) => ({ id: `y${value}`, label: `${value}%`, at: (1 - value / 100) * COVERAGE_SPAN }))
      .concat([{ id: "na", label: "n/a", at: NO_COVERAGE_Y }]);
  const tooltip = (id: string) => {
    const site = byDomain.get(id);
    return site ? <SiteHoverCard site={site} metricValue={layout === "metric" && metric && metric.values.has(site.domain) ? { label: metric.label, text: metric.format(metric.values.get(site.domain)!) } : undefined} /> : null;
  };

  const percent = (item: LinkedBarItem) => `${Math.round(item.value)}%`;

  const panels = (
    <>
      <div className="grid gap-3">
          <ViewField label="Arrange by">
            <SelectMenu
              aria-label="Arrange dots by"
              value={layout}
              onValueChange={(value) => setLayout(value as LayoutMode)}
              options={(Object.keys(LAYOUT_LABELS) as LayoutMode[])
                .filter((mode) => mode !== "metric" || metrics.length > 0)
                .map((mode) => ({ value: mode, label: LAYOUT_LABELS[mode] }))}
            />
          </ViewField>
          {layout === "metric" && metric && metrics.length > 1 && (
            <ViewField label="Vertical axis metric">
              <SelectMenu
                aria-label="Metric on the vertical axis"
                value={metric.id}
                onValueChange={setMetricId}
                options={metrics.map((option) => ({ value: option.id, label: option.label }))}
              />
            </ViewField>
          )}
          {dimension === "3d" && (
            <>
              <ViewField label="Depth (Z axis)">
                <SelectMenu
                  aria-label="Measure on the depth axis"
                  value={depthId}
                  onValueChange={setDepthId}
                  options={[{ value: NO_DIMENSION, label: "None (flat)" }, ...dimensions.map((d) => ({ value: d.id, label: d.label }))]}
                />
              </ViewField>
              <ViewField label="Sphere size">
                <SelectMenu
                  aria-label="Measure that sizes the spheres"
                  value={sizeId}
                  onValueChange={setSizeId}
                  options={[{ value: NO_DIMENSION, label: "Uniform" }, ...dimensions.map((d) => ({ value: d.id, label: d.label }))]}
                />
              </ViewField>
            </>
          )}
      </div>
      <LinkedPanel title="AI-visible content" caption="Sites per 10% band. Click to filter.">
        <LinkedColumns
          items={bandItems}
          max={max(bandItems)}
          activeIds={filters.bands.map(String)}
          onToggle={(id) => toggle("bands", Number(id))}
          formatValue={(item) => item.value}
        />
      </LinkedPanel>
      <LinkedPanel title="Verticals" caption="Curated cuts of the list.">
        <LinkedBarList
          items={groupItems}
          max={max(groupItems)}
          activeIds={filters.groups}
          onToggle={(id) => toggle("groups", id)}
        />
      </LinkedPanel>
      <LinkedPanel title="Outcome" caption="What a non-rendering client actually received.">
        <LinkedBarList
          items={outcomeItems}
          max={max(outcomeItems)}
          activeIds={filters.classes}
          onToggle={(id) => toggle("classes", id as SiteClassification)}
        />
      </LinkedPanel>
      {facets
        .filter((facet) => facet.options.length > 0)
        .map((facet) => (
          <LinkedPanel key={facet.id} title={facet.title} caption={facet.caption}>
            <LinkedBarList
              items={facetItems[facet.id] ?? []}
              max={max(facetItems[facet.id] ?? [])}
              activeIds={filters.facets[facet.id] ?? []}
              onToggle={(id) => toggleFacet(facet.id, id)}
            />
          </LinkedPanel>
        ))}
      <LinkedPanel title="Who blocks which crawler" caption="Share of sites in view whose robots.txt blocks it.">
        <LinkedBarList
          items={crawlerItems}
          max={100}
          activeIds={filters.blockedBy}
          onToggle={(id) => toggle("blockedBy", id)}
          formatValue={percent}
        />
      </LinkedPanel>
    </>
  );

  const infoText = `${layout === "metric" && metric ? `Left to right is homepage coverage; height is ${metric.description}. Sites missing either value sit in the n/a strip.` : LAYOUT_CAPTIONS[layout]} ${sites.length.toLocaleString()} homepages, Tranco list.${note ? ` ${note}` : ""} ${dimension === "3d" ? `Depth is ${depthDim ? depthDim.description : "off (flat)"}; sphere size is ${sizeDim ? sizeDim.description : "uniform"}. Sites missing a value sit at the front and render smallest.` : ""} Switch arrangement, then filter — dots glide, the panels follow.`;
  const ariaLabel = `${dimension === "3d" ? "3D scatter" : "Scatter"} of ${sites.length} sites by AI-visible content, arranged by ${LAYOUT_LABELS[layout].toLowerCase()}. Use the table view for the same data.`;
  const legend = [
    ["bg-success", "70%+ visible"],
    ["bg-warning", "40–69%"],
    ["bg-destructive", "under 40%"],
    ["bg-muted-foreground", "no readable page"],
  ].map(([tone, label]) => (
    <span key={label} className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
      <span className={cn("size-2 rounded-full", tone)} /> {label}
    </span>
  ));

  const sidebar = asideTarget
    ? createPortal(
        <>
          <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">Filters</h3>
              <p aria-live="polite" className="numeric truncate text-xs text-muted-foreground">
                {view.length} of {sites.length} sites in view
              </p>
            </div>
            {filtered && (
              <Button variant="ghost" size="sm" onClick={reset}>
                Reset
              </Button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
            <div className="grid gap-4">{panels}</div>
          </div>
        </>,
        asideTarget,
      )
    : null;

  return (
    <>
      {sidebar}
      {topbarControls}
      {!toolbarTarget && <div className="px-4 pt-6 sm:px-6 lg:px-8">{toolbar}</div>}

      {dimension === "3d" ? (
        <div className={cn("relative h-[calc(100dvh-4rem)] min-h-[34rem] overflow-hidden", className)}>
          <div role="img" aria-label={ariaLabel} className="absolute inset-0">
            <DotField3D
              className="absolute inset-0 h-full rounded-none border-0 bg-transparent sm:h-full"
              topInset={176}
              dots={dots3}
              columns={guideColumns}
              columnLines={layout !== "rank"}
              rows={guideRows}
              zLabels={{
                low: depthDim?.lowLabel ?? "",
                high: depthDim?.highLabel ?? "",
                title: depthDim?.label ?? "flat",
              }}
              selectedId={selected?.domain ?? null}
              onSelect={(id) => setSelected(byDomain.get(id) ?? null)}
              onUnavailable={() => setDimension("2d")}
              renderTooltip={(id) => {
                const site = byDomain.get(id);
                if (!site) return null;
                const extras = [
                  depthDim && { label: depthDim.label, text: depthDim.format(site) },
                  sizeDim && sizeDim !== depthDim && { label: sizeDim.label, text: sizeDim.format(site) },
                ].filter((row): row is { label: string; text: string | null } => Boolean(row));
                return (
                  <div className="grid gap-2.5">
                    {tooltip(id)}
                    <div className="grid gap-1 border-t border-border pt-2">
                      {extras.map((row) => (
                        <div key={row.label} className="flex items-baseline justify-between gap-2 text-xs">
                          <span className="truncate text-muted-foreground">{row.label}</span>
                          <span className="numeric font-mono font-medium">{row.text ?? "n/a"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }}
            />
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 grid gap-3 bg-gradient-to-b from-background via-background/90 to-transparent px-4 pb-12 pt-6 sm:px-6 lg:px-8">
            {heading}
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                Every site, one sphere
                <span className="pointer-events-auto">
                  <InfoPopover label="About: Every site, one sphere">{infoText}</InfoPopover>
                </span>
              </span>
              {toolbarTarget && chips.length > 0 && <div className="pointer-events-auto ml-2">{chipsRow}</div>}
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-3 left-4 z-10 flex flex-wrap items-center gap-x-4 gap-y-1 sm:left-6 lg:left-8">
            {legend}
            {footnote && (
              <span className="pointer-events-auto">
                <InfoPopover label="About this study" placement="above">
                  {footnote}
                </InfoPopover>
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className={cn("grid gap-6 px-4 py-6 sm:px-6 lg:px-8", className)}>
          {heading}
          {toolbarTarget && toolbar}
          {dimension === "table" ? (
            <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">{table}</div>
          ) : (
            <ChartFrame
              title="Every site, one dot"
              info={infoText}
              ariaLabel={ariaLabel}
              className="rounded-xl border border-border bg-surface p-4 sm:p-5 motion-safe:animate-rise-in"
            >
              <DotField
                dots={dots}
                guideKey={layout === "metric" ? `metric:${metric?.id}` : layout}
                columns={guideColumns}
                columnLines={layout !== "rank"}
                rows={guideRows}
                selectedId={selected?.domain ?? null}
                onSelect={(id) => setSelected(byDomain.get(id) ?? null)}
                renderTooltip={tooltip}
              />
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.6875rem] text-muted-foreground">{legend}</div>
            </ChartFrame>
          )}
          {footnote && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              About this study
              <InfoPopover label="About this study" placement="above">
                {footnote}
              </InfoPopover>
            </div>
          )}
        </div>
      )}

      {!asideTarget && <div className="grid gap-4 px-4 pb-6 sm:px-6 md:grid-cols-2 lg:px-8">{panels}</div>}

      {!external && (
        <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)} className="max-w-2xl">
          {selected && <SiteDetail site={selected} onOpenCompany={onOpenCompany} />}
        </Dialog>
      )}
    </>
  );
}

function LinkedPanel({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent>
        <ChartFrame title={title} caption={caption}>
          {children}
        </ChartFrame>
      </CardContent>
    </Card>
  );
}

function ViewField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
