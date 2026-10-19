import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { Badge, Button, Dialog, Input, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { classificationMeta, topSitesStudy, verdictBadgeVariant, verdictMeta } from "@/content/top-sites";
import type { SiteClassification, StudySite } from "@/content/top-sites";
import { SiteDetail } from "./site-explorer";
import { ChevronLeft, ChevronRight, Table2 } from "lucide-react";

const PAGE_SIZE = 25;

type SortKey = "rank" | "domain" | "coverage-desc" | "coverage-asc";
type LayoutMode = "scatter" | "clustered" | "grid";

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "rank", label: "Sort: Tranco rank" },
  { value: "coverage-desc", label: "Sort: coverage, high → low" },
  { value: "coverage-asc", label: "Sort: coverage, low → high" },
  { value: "domain", label: "Sort: domain A–Z" },
];

const classificationColors: Record<SiteClassification, string> = {
  measured: "bg-chart-2",
  raw_blocked: "bg-chart-5",
  both_blocked: "bg-destructive",
  robots_excluded: "bg-chart-4",
  render_incomplete: "bg-chart-3",
  render_failed: "bg-chart-6",
  crawl_error: "bg-muted-foreground",
};

function coverageTone(coverage: number) {
  if (coverage >= 70) return "bg-success";
  if (coverage >= 40) return "bg-warning";
  return "bg-destructive";
}

/* ---------------------------- Node Visualization ----------------------------- */

interface NodePosition {
  x: number;
  y: number;
  site: StudySite;
  visible: boolean;
}

function computeScatterLayout(sites: StudySite[]): NodePosition[] {
  const maxX = Math.max(2, ...sites.map((s) => s.rank));
  const minX = 1;
  const maxY = 100;
  const minY = 0;
  return sites.map((s) => ({
    x: ((s.rank - minX) / (maxX - minX)) * 100,
    y: s.coverage !== null ? 100 - ((s.coverage - minY) / (maxY - minY)) * 100 : 98,
    site: s,
    visible: true,
  }));
}

function computeClusteredLayout(sites: StudySite[]): NodePosition[] {
  // Group by classification, arrange in clusters
  const groups = new Map<SiteClassification, StudySite[]>();
  for (const s of sites) {
    if (!groups.has(s.classification)) groups.set(s.classification, []);
    groups.get(s.classification)!.push(s);
  }

  const groupKeys = [...groups.keys()];
  const clusterCenters: Record<string, { cx: number; cy: number }> = {};
  const angleStep = (2 * Math.PI) / groupKeys.length;
  groupKeys.forEach((key, i) => {
    clusterCenters[key] = {
      cx: 50 + 30 * Math.cos(i * angleStep - Math.PI / 2),
      cy: 50 + 30 * Math.sin(i * angleStep - Math.PI / 2),
    };
  });

  const positions: NodePosition[] = [];
  for (const [cls, groupSites] of groups) {
    const center = clusterCenters[cls]!;
    const radius = Math.max(5, Math.min(15, groupSites.length / 5));
    groupSites.forEach((s, i) => {
      const angle = (i / groupSites.length) * 2 * Math.PI;
      const r = radius * Math.sqrt(i / groupSites.length);
      positions.push({
        x: center.cx + r * Math.cos(angle),
        y: center.cy + r * Math.sin(angle),
        site: s,
        visible: true,
      });
    });
  }
  return positions;
}

function computeGridLayout(sites: StudySite[]): NodePosition[] {
  const cols = 25;
  return sites.map((s, i) => ({
    x: ((i % cols) / (cols - 1)) * 96 + 2,
    y: (Math.floor(i / cols) / Math.ceil(sites.length / cols)) * 96 + 2,
    site: s,
    visible: true,
  }));
}

function SiteNodeVisualization({
  sites,
  layoutMode,
  onSelect,
  selected,
  filteredDomains,
}: {
  sites: StudySite[];
  layoutMode: LayoutMode;
  onSelect: (site: StudySite) => void;
  selected: StudySite | null;
  filteredDomains: Set<string>;
}) {
  const positions = useMemo(() => {
    let layout: NodePosition[];
    switch (layoutMode) {
      case "clustered":
        layout = computeClusteredLayout(sites);
        break;
      case "grid":
        layout = computeGridLayout(sites);
        break;
      default:
        layout = computeScatterLayout(sites);
    }
    return layout.map((p) => ({
      ...p,
      visible: filteredDomains.has(p.site.domain),
    }));
  }, [sites, layoutMode, filteredDomains]);

  return (
    <div className="relative h-[500px] w-full overflow-hidden rounded-xl border border-border bg-surface/50">
      {/* Background grid for scatter mode */}
      {layoutMode === "scatter" && (
        <div className="absolute inset-4">
          {[0, 25, 50, 75, 100].map((y) => (
            <div
              key={`y-${y}`}
              className="absolute inset-x-0 border-t border-dashed border-border/30"
              style={{ top: `${y}%` }}
            />
          ))}
          {[0, 25, 50, 75, 100].map((x) => (
            <div
              key={`x-${x}`}
              className="absolute inset-y-0 border-l border-dashed border-border/30"
              style={{ left: `${x}%` }}
            />
          ))}
          <div className="pointer-events-none absolute -bottom-6 left-0 right-0 flex justify-between text-[10px] text-muted-foreground">
            <span>Rank #1</span>
            <span>Rank #{Math.max(...sites.map((s) => s.rank))}</span>
          </div>
          <div className="pointer-events-none absolute -left-8 top-0 bottom-0 flex flex-col justify-between text-[10px] text-muted-foreground">
            <span>100%</span>
            <span>0%</span>
          </div>
        </div>
      )}

      {/* Nodes */}
      <div className="absolute inset-0">
        {positions.map((pos) => {
          const isSelected = selected?.domain === pos.site.domain;
          const isVisible = pos.visible;
          return (
            <button
              key={pos.site.domain}
              type="button"
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500 ease-out hover:scale-150 focus-ring",
                isSelected ? "z-20 size-3.5 ring-2 ring-primary" : "z-10 size-2",
                isVisible
                  ? pos.site.coverage !== null
                    ? coverageTone(pos.site.coverage)
                    : classificationColors[pos.site.classification]
                  : "bg-muted-foreground/20",
                !isVisible && "opacity-20 scale-75",
              )}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transition: "left 0.6s ease-out, top 0.6s ease-out, opacity 0.3s, transform 0.3s",
              }}
              onClick={() => onSelect(pos.site)}
              title={`${pos.site.domain} — #${pos.site.rank} — ${pos.site.coverage !== null ? `${pos.site.coverage}%` : classificationMeta[pos.site.classification].label}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 flex flex-wrap gap-2 rounded-lg border border-border bg-surface/90 px-3 py-2 backdrop-blur">
        {layoutMode === "scatter" ? (
          <>
            <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
              <span className="size-2 rounded-full bg-success" /> ≥70%
            </span>
            <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
              <span className="size-2 rounded-full bg-warning" /> 40-69%
            </span>
            <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
              <span className="size-2 rounded-full bg-destructive" /> &lt;40%
            </span>
          </>
        ) : (
          Object.entries(classificationColors)
            .filter(([key]) => key === "measured" || key === "raw_blocked" || key === "both_blocked")
            .map(([key, color]) => (
              <span key={key} className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <span className={cn("size-2 rounded-full", color)} />
                {classificationMeta[key as SiteClassification].label}
              </span>
            ))
        )}
      </div>
    </div>
  );
}

/* ---------------------------- Main Component ----------------------------- */

export function SiteExplorerVisual() {
  const [query, setQuery] = useState("");
  const [classification, setClassification] = useState<"all" | SiteClassification>("all");
  const [sort, setSort] = useState<SortKey>("rank");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<StudySite | null>(null);
  const [detailSite, setDetailSite] = useState<StudySite | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("scatter");
  const [showTable, setShowTable] = useState(false);

  const classificationCounts = topSitesStudy.summary.counts;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = topSitesStudy.sites.filter((site) => {
      if (classification !== "all" && site.classification !== classification) return false;
      if (needle && !site.domain.includes(needle)) return false;
      return true;
    });
    const sorted = [...rows];
    switch (sort) {
      case "rank":
        sorted.sort((a, b) => a.rank - b.rank);
        break;
      case "domain":
        sorted.sort((a, b) => a.domain.localeCompare(b.domain));
        break;
      case "coverage-desc":
        sorted.sort((a, b) => (b.coverage ?? -1) - (a.coverage ?? -1) || a.rank - b.rank);
        break;
      case "coverage-asc":
        sorted.sort((a, b) => (a.coverage ?? 101) - (b.coverage ?? 101) || a.rank - b.rank);
        break;
    }
    return sorted;
  }, [query, classification, sort]);

  const filteredDomains = useMemo(() => new Set(filtered.map((s) => s.domain)), [filtered]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="grid gap-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-xs">
            <Input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Filter by domain…"
              aria-label="Filter by domain"
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:flex lg:items-center">
            <Select
              value={classification}
              onChange={(event) => {
                setClassification(event.target.value as "all" | SiteClassification);
                setPage(1);
              }}
              aria-label="Filter by classification"
              className="lg:w-52"
            >
              <option value="all">All classifications ({topSitesStudy.sites.length})</option>
              {(Object.keys(classificationMeta) as SiteClassification[])
                .filter((key) => (classificationCounts[key] ?? 0) > 0)
                .map((key) => (
                  <option key={key} value={key}>
                    {classificationMeta[key].label} ({classificationCounts[key]})
                  </option>
                ))}
            </Select>
            <Select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as SortKey);
                setPage(1);
              }}
              aria-label="Sort sites"
              className="lg:w-60"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Layout mode toggle */}
          <div className="flex gap-1 rounded-lg border border-border bg-background p-1">
            {(["scatter", "clustered", "grid"] as const).map((mode) => (
              <Button
                key={mode}
                variant={layoutMode === mode ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setLayoutMode(mode)}
                className="capitalize"
              >
                {mode}
              </Button>
            ))}
          </div>

          <Button
            variant={showTable ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowTable(!showTable)}
          >
            <Table2 className="size-4" />
            Table
          </Button>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {filtered.length} of {topSitesStudy.sites.length} sites
            {filtered.length !== topSitesStudy.sites.length && " (filtered)"}
          </span>
          <span>Click any node to explore · Hover for details</span>
        </div>
      </div>

      {/* Primary Node Visualization */}
      <SiteNodeVisualization
        sites={topSitesStudy.sites}
        layoutMode={layoutMode}
        onSelect={setSelected}
        selected={selected}
        filteredDomains={filteredDomains}
      />

      {/* Selected site info panel */}
      {selected && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="grid gap-1">
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium">{selected.domain}</span>
                <Badge variant={classificationMeta[selected.classification].tone} size="sm" dot>
                  {classificationMeta[selected.classification].label}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                Rank #{selected.rank} · {selected.coverage !== null ? `${selected.coverage}% AI-visible` : "No coverage"} · {selected.group ?? "No vertical"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="View full details"
                onClick={() => setDetailSite(selected)}
              >
                <ChevronRight />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Close"
                onClick={() => setSelected(null)}
              >
                <ChevronLeft className="rotate-45" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table view (collapsible) */}
      {showTable && (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-20 pl-5">Rank</TableHead>
                <TableHead>Site</TableHead>
                <TableHead className="min-w-40">AI-visible</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead>GPTBot</TableHead>
                <TableHead className="w-14 pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((site) => {
                const meta = classificationMeta[site.classification];
                const gptBot = site.robots.verdicts.GPTBot ?? "unset";
                return (
                  <TableRow
                    key={site.domain}
                    className="cursor-pointer"
                    onClick={() => setSelected(site)}
                  >
                    <TableCell className="numeric pl-5 font-mono text-xs text-muted-foreground">
                      #{site.rank}
                    </TableCell>
                    <TableCell className="font-medium">{site.domain}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        {site.coverage !== null ? (
                          <>
                            <div className="h-1.5 w-20 rounded-full bg-muted">
                              <div
                                className={cn("h-1.5 rounded-full", coverageTone(site.coverage))}
                                style={{ width: `${site.coverage}%` }}
                              />
                            </div>
                            <span className="numeric font-mono text-xs">{site.coverage}%</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={meta.tone} size="sm">
                        {meta.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={verdictBadgeVariant[gptBot]} size="sm">
                        {verdictMeta[gptBot].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`View details for ${site.domain}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelected(site);
                        }}
                      >
                        <ChevronRight />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3.5 sm:px-5">
            <span className="numeric text-xs text-muted-foreground">
              Showing {filtered.length === 0 ? 0 : start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} of{" "}
              {filtered.length} sites
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Previous page"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
              >
                <ChevronLeft />
              </Button>
              <span className="numeric px-2 font-mono text-xs">
                Page {safePage} / {pageCount}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Next page"
                disabled={safePage >= pageCount}
                onClick={() => setPage(safePage + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Site detail dialog */}
      <Dialog open={detailSite !== null} onOpenChange={(open) => !open && setDetailSite(null)} className="max-w-2xl">
        {detailSite && <SiteDetail site={detailSite} />}
      </Dialog>
    </div>
  );
}
