import { useMemo, useState, useRef, useCallback } from "react";
import type { WheelEvent as ReactWheelEvent, MouseEvent as ReactMouseEvent } from "react";
import { Badge, Button, Dialog, Input, Select } from "@/components/ui";
import { classificationMeta, topSitesStudy } from "@/content/top-sites";
import type { SiteClassification, StudySite } from "@/content/top-sites";
import { SiteDetail } from "./site-explorer";

/* ---------------------------- Types ---------------------------- */

interface BubbleNode {
  site: StudySite;
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  clusterX: number;
  clusterY: number;
}

/* ---------------------------- Constants ---------------------------- */

const BUBBLE_MIN_R = 4;
const BUBBLE_MAX_R = 18;
const CANVAS_W = 1200;
const CANVAS_H = 800;

const classificationColors: Record<SiteClassification, string> = {
  measured: "#22c55e",
  raw_blocked: "#f97316",
  both_blocked: "#ef4444",
  robots_excluded: "#a855f7",
  render_incomplete: "#eab308",
  render_failed: "#6366f1",
  crawl_error: "#71717a",
};

/* ---------------------------- Layout ---------------------------- */

function computeBubbleLayout(sites: StudySite[]): BubbleNode[] {
  // Group by vertical
  const groups = new Map<string, StudySite[]>();
  const ungrouped: StudySite[] = [];
  for (const s of sites) {
    if (s.group) {
      if (!groups.has(s.group)) groups.set(s.group, []);
      groups.get(s.group)!.push(s);
    } else {
      ungrouped.push(s);
    }
  }

  const groupNames = [...groups.keys()];
  if (ungrouped.length > 0) groupNames.push("Other");

  // Arrange cluster centers in a circle
  const centerX = CANVAS_W / 2;
  const centerY = CANVAS_H / 2;
  const clusterRadius = Math.min(CANVAS_W, CANVAS_H) * 0.35;
  const clusterCenters: { name: string; cx: number; cy: number }[] = groupNames.map((name, i) => {
    const angle = (i / groupNames.length) * 2 * Math.PI - Math.PI / 2;
    return {
      name,
      cx: centerX + clusterRadius * Math.cos(angle),
      cy: centerY + clusterRadius * Math.sin(angle),
    };
  });

  const nodes: BubbleNode[] = [];

  for (const center of clusterCenters) {
    const groupSites = center.name === "Other" ? ungrouped : (groups.get(center.name) ?? []);
    if (groupSites.length === 0) continue;

    // Sort by coverage descending
    const sorted = [...groupSites].sort((a, b) => (b.coverage ?? -1) - (a.coverage ?? -1));

    // Arrange in a spiral within the cluster
    const clusterR = Math.max(60, Math.min(180, Math.sqrt(groupSites.length) * 12));
    sorted.forEach((site, i) => {
      const coverage = site.coverage ?? 0;
      const r = BUBBLE_MIN_R + (coverage / 100) * (BUBBLE_MAX_R - BUBBLE_MIN_R);
      const angle = i * 0.5;
      const spiralR = Math.sqrt(i) * 6;
      const x = center.cx + (spiralR > clusterR ? clusterR : spiralR) * Math.cos(angle);
      const y = center.cy + (spiralR > clusterR ? clusterR : spiralR) * Math.sin(angle);
      nodes.push({
        site,
        x,
        y,
        r,
        vx: 0,
        vy: 0,
        clusterX: center.cx,
        clusterY: center.cy,
      });
    });
  }

  return nodes;
}

/* ---------------------------- Component ---------------------------- */

export function CompanyExplorer() {
  const [query, setQuery] = useState("");
  const [classification, setClassification] = useState<"all" | SiteClassification>("all");
  const [selected, setSelected] = useState<StudySite | null>(null);
  const [detailSite, setDetailSite] = useState<StudySite | null>(null);
  const [hovered, setHovered] = useState<StudySite | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const classificationCounts = topSitesStudy.summary.counts;

  const filteredSites = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return topSitesStudy.sites.filter((site) => {
      if (classification !== "all" && site.classification !== classification) return false;
      if (needle && !site.domain.includes(needle)) return false;
      return true;
    });
  }, [query, classification]);

  const filteredDomains = useMemo(() => new Set(filteredSites.map((s) => s.domain)), [filteredSites]);

  const nodes = useMemo(() => computeBubbleLayout(topSitesStudy.sites), []);

  const handleWheel = useCallback((e: ReactWheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.3, Math.min(3, z * factor)));
  }, []);

  const handleMouseDown = useCallback((e: ReactMouseEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
  }, [dragging]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  const handleNodeClick = useCallback((site: StudySite) => {
    setSelected(site);
  }, []);

  const handleNodeHover = useCallback((site: StudySite | null) => {
    setHovered(site);
  }, []);

  // Reset view
  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  return (
    <div className="grid gap-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-xs">
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by domain…"
              aria-label="Filter by domain"
              className="pl-9"
            />
          </div>
          <Select
            value={classification}
            onChange={(e) => setClassification(e.target.value as "all" | SiteClassification)}
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

          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={resetView}>
              Reset view
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.min(3, z * 1.2))}>
              Zoom in
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.max(0.3, z * 0.8))}>
              Zoom out
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {filteredSites.length} of {topSitesStudy.sites.length} sites
          </span>
          <span>Scroll to zoom · Drag to pan · Click a bubble for details</span>
        </div>
      </div>

      {/* Bubble Chart */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-surface/50">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          className="w-full cursor-grab active:cursor-grabbing"
          style={{ height: 600 }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Cluster labels */}
            {(() => {
              const groups = new Map<string, StudySite[]>();
              for (const s of topSitesStudy.sites) {
                const g = s.group ?? "Other";
                if (!groups.has(g)) groups.set(g, []);
                groups.get(g)!.push(s);
              }
              const groupNames = [...groups.keys()];
              const centerX = CANVAS_W / 2;
              const centerY = CANVAS_H / 2;
              const clusterRadius = Math.min(CANVAS_W, CANVAS_H) * 0.35;
              return groupNames.map((name, i) => {
                const angle = (i / groupNames.length) * 2 * Math.PI - Math.PI / 2;
                const cx = centerX + clusterRadius * Math.cos(angle);
                const cy = centerY + clusterRadius * Math.sin(angle);
                return (
                  <text
                    key={name}
                    x={cx}
                    y={cy - Math.max(60, Math.min(180, Math.sqrt((groups.get(name) ?? []).length) * 12)) - 10}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[10px] font-medium uppercase tracking-wider"
                  >
                    {name.replace(" & media", "").replace(" & education", "").replace(" & entertainment", "").replace(" & dev", "")}
                  </text>
                );
              });
            })()}

            {/* Bubbles */}
            {nodes.map((node) => {
              const isVisible = filteredDomains.has(node.site.domain);
              const isSelected = selected?.domain === node.site.domain;
              const isHovered = hovered?.domain === node.site.domain;
              return (
                <g key={node.site.domain}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.r}
                    fill={classificationColors[node.site.classification]}
                    opacity={isVisible ? (isSelected || isHovered ? 1 : 0.7) : 0.1}
                    stroke={isSelected ? "#fff" : "none"}
                    strokeWidth={isSelected ? 2 : 0}
                    className="cursor-pointer transition-all duration-200"
                    onClick={() => handleNodeClick(node.site)}
                    onMouseEnter={() => handleNodeHover(node.site)}
                    onMouseLeave={() => handleNodeHover(null)}
                  />
                  {(isSelected || isHovered) && (
                    <text
                      x={node.x}
                      y={node.y - node.r - 4}
                      textAnchor="middle"
                      className="fill-foreground text-[9px] font-medium pointer-events-none"
                    >
                      {node.site.domain.length > 20 ? node.site.domain.slice(0, 18) + "…" : node.site.domain}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Hover tooltip */}
        {hovered && (
          <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-lg border border-border bg-surface/95 px-3 py-2 shadow-lg backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium">{hovered.domain}</span>
              <Badge variant={classificationMeta[hovered.classification].tone} size="sm" dot>
                {classificationMeta[hovered.classification].label}
              </Badge>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Rank #{hovered.rank} · {hovered.coverage !== null ? `${hovered.coverage}% AI-visible` : "No coverage"} · {hovered.group ?? "No vertical"}
            </div>
          </div>
        )}
      </div>

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
              <Button variant="ghost" size="icon-sm" aria-label="View full details" onClick={() => setDetailSite(selected)}>
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={() => setSelected(null)}>
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Site detail dialog */}
      <Dialog open={detailSite !== null} onOpenChange={(open) => !open && setDetailSite(null)} className="max-w-2xl">
        {detailSite && <SiteDetail site={detailSite} />}
      </Dialog>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {Object.entries(classificationColors).map(([key, color]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
            {classificationMeta[key as SiteClassification].label}
          </span>
        ))}
        <span className="ml-auto">Bubble size = AI-visible coverage %</span>
      </div>
    </div>
  );
}
