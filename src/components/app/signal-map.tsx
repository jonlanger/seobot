import { ChevronRight, Maximize2, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Badge, Button, Dialog, Separator, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { Tooltip } from "@/components/ui/tooltip";
import {
  SIGNAL_CANVAS,
  signalClusters,
  signalEdges,
  signalMapCaption,
  signalNodes,
} from "@/content/signal-map";
import type { SignalCluster, SignalEdge, SignalNode } from "@/content/signal-map";
import { classificationMeta } from "@/content/top-sites";
import type { StudySite, SiteClassification } from "@/content/top-sites";
import { topSitesStudy } from "@/content/top-sites";
import { cn } from "@/lib/cn";
import { SiteDetail } from "./site-explorer";

/* ------------------------------- View model -------------------------------- */

interface ViewState {
  x: number;
  y: number;
  k: number;
}

interface PointerPos {
  x: number;
  y: number;
}

type Gesture =
  | { mode: "pan"; startX: number; startY: number; view: ViewState; moved: boolean }
  | { mode: "pinch"; distance: number; midX: number; midY: number; view: ViewState };

const MIN_K = 0.42;
const MAX_K = 1.9;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const distance = (a: PointerPos, b: PointerPos) => Math.hypot(a.x - b.x, a.y - b.y);

/** Approximate node footprints (logical units) — used for framing and fit. */
const NODE_HALF_WIDTH: Record<string, number> = { hub: 120, stat: 108, chip: 84, site: 8 };
const NODE_HALF_HEIGHT: Record<string, number> = { hub: 52, stat: 48, chip: 30, site: 8 };

const hueClasses = {
  "chart-1": { dot: "bg-chart-1" },
  "chart-2": { dot: "bg-chart-2" },
  "chart-3": { dot: "bg-chart-3" },
  "chart-4": { dot: "bg-chart-4" },
  "chart-5": { dot: "bg-chart-5" },
  "chart-6": { dot: "bg-chart-6" },
} as const;

const edgeStroke: Record<SignalEdge["kind"], string> = {
  strong: "stroke-foreground",
  linked: "stroke-foreground",
  none: "stroke-muted-foreground",
  context: "stroke-chart-6",
  lead: "stroke-muted-foreground",
};

const edgeOpacity: Record<SignalEdge["kind"], number> = {
  strong: 0.55,
  linked: 0.32,
  none: 0.55,
  context: 0.8,
  lead: 0.38,
};

const edgeWidth: Record<SignalEdge["kind"], number> = {
  strong: 2,
  linked: 1.5,
  none: 1.5,
  context: 1.6,
  lead: 1,
};

const edgeDash: Record<SignalEdge["kind"], string | undefined> = {
  strong: undefined,
  linked: undefined,
  none: "2 5",
  context: "6 4",
  lead: undefined,
};

const nodeBox: Record<string, string> = {
  hub: "w-60 gap-1 p-3.5",
  stat: "w-[13.5rem] gap-0.5 p-3",
  chip: "w-[10.5rem] gap-0.5 p-2.5",
  site: "",
};

const nodeValueSize: Record<string, string> = {
  hub: "text-2xl",
  stat: "text-xl",
  chip: "text-sm",
  site: "",
};

function edgePath(fromNode: SignalNode, toNode: SignalNode, edge: SignalEdge): string {
  if (!edge.bend) return `M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}`;
  return `M ${fromNode.x} ${fromNode.y} Q ${edge.bend.x} ${edge.bend.y} ${toNode.x} ${toNode.y}`;
}

/** Screen position of a logical point under the current view. */
function project(x: number, y: number, view: ViewState) {
  return { x: x * view.k + view.x, y: y * view.k + view.y };
}

/* --------------------------------- Canvas ---------------------------------- */

/**
 * The signal map — the study's primary view. An open, pan-and-zoom canvas
 * connecting every measured aspect of machine readability in clusters, with
 * exemplar sites as nodes. Values, edge labels, and exemplars all derive from
 * the committed study dataset (src/content/signal-map.ts).
 */
export function SignalMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ViewState>({ x: 0, y: 0, k: 0.8 });
  const [smooth, setSmooth] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<StudySite | null>(null);
  const [showSiteNodes, setShowSiteNodes] = useState(true);
  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef(new Map<number, PointerPos>());
  const suppressClick = useRef(false);
  const autoFit = useRef(true);

  const siteNodes = useMemo(() => {
    const sites = topSitesStudy.sites;
    
    // Cluster bounding boxes on the canvas
    const clusterBounds: Record<string, { x: number; y: number; w: number; h: number }> = {
      reach: { x: 50, y: 50, w: 550, h: 450 },
      access: { x: 50, y: 550, w: 550, h: 750 },
      read: { x: 650, y: 50, w: 600, h: 450 },
      coverage: { x: 1050, y: 400, w: 650, h: 400 },
      structure: { x: 1350, y: 50, w: 450, h: 500 },
      verticals: { x: 450, y: 950, w: 400, h: 350 },
    };
    
    // Group sites by cluster
    const grouped: Record<string, typeof sites> = {};
    for (const site of sites) {
      let cluster = "reach";
      if (site.classification === "raw_blocked" || site.classification === "both_blocked") {
        cluster = "read";
      } else if (site.classification === "robots_excluded") {
        cluster = "access";
      } else if (site.coverage !== null && site.coverage >= 70) {
        cluster = "coverage";
      } else if (site.group) {
        cluster = "verticals";
      }
      if (!grouped[cluster]) grouped[cluster] = [];
      grouped[cluster].push(site);
    }
    
    const result: any[] = [];
    for (const [cluster, clusterSites] of Object.entries(grouped)) {
      const bounds = clusterBounds[cluster] ?? clusterBounds.reach!;
      const cols = Math.ceil(Math.sqrt(clusterSites.length * (bounds.w / bounds.h)));
      const rows = Math.ceil(clusterSites.length / cols);
      const cellW = bounds.w / cols;
      const cellH = bounds.h / rows;
      
      clusterSites.forEach((site, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        result.push({
          id: `site-${site.domain}`,
          cluster,
          kind: "site" as const,
          label: site.domain,
          value: `#${site.rank}`,
          sub: site.coverage !== null ? `${site.coverage}%` : classificationMeta[site.classification].label,
          note: site.note ?? classificationMeta[site.classification].description,
          x: bounds.x + col * cellW + cellW / 2,
          y: bounds.y + row * cellH + cellH / 2,
          site,
        });
      });
    }
    
    return result;
  }, []);

  const nodeById = useMemo(() => new Map([...signalNodes, ...siteNodes].map((node) => [node.id, node])), [siteNodes]);
  const clusterById = useMemo(
    () => new Map(signalClusters.map((cluster) => [cluster.id, cluster])),
    [],
  );
  const neighbours = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const edge of signalEdges) {
      if (!map.has(edge.from)) map.set(edge.from, new Set());
      if (!map.has(edge.to)) map.set(edge.to, new Set());
      map.get(edge.from)?.add(edge.to);
      map.get(edge.to)?.add(edge.from);
    }
    return map;
  }, []);

  const selectedNode = selectedId ? nodeById.get(selectedId) ?? null : null;
  const activeCluster = selectedNode?.cluster ?? null;
  /* ------------------------------ Positioning ------------------------------ */

  /** Readable opening view: horizontally framed, centred on the read gate. */
  const positionInitial = useCallback(() => {
    const element = containerRef.current;
    if (!element) return;
    const { width, height } = element.getBoundingClientRect();
    const k = clamp(width / SIGNAL_CANVAS.width, 0.62, 1.05);
    setSmooth(false);
    setView({ k, x: width * 0.5 - 930 * k, y: height * 0.5 - 520 * k });
  }, []);

  const fitView = useCallback(() => {
    const element = containerRef.current;
    if (!element) return;
    const { width, height } = element.getBoundingClientRect();
    const k = clamp(
      Math.min(width / SIGNAL_CANVAS.width, height / SIGNAL_CANVAS.height) * 0.96,
      MIN_K,
      MAX_K,
    );
    setSmooth(true);
    setView({
      k,
      x: (width - SIGNAL_CANVAS.width * k) / 2,
      y: (height - SIGNAL_CANVAS.height * k) / 2,
    });
  }, []);

  const flyTo = useCallback((x: number, y: number, k: number, fx = 0.5, fy = 0.5) => {
    const element = containerRef.current;
    if (!element) return;
    const { width, height } = element.getBoundingClientRect();
    autoFit.current = false;
    setSmooth(true);
    setView({ k, x: width * fx - x * k, y: height * fy - y * k });
  }, []);

  const flyToCluster = useCallback(
    (cluster: SignalCluster) => {
      const element = containerRef.current;
      if (!element) return;
      const { width, height } = element.getBoundingClientRect();
      const members = [...signalNodes, ...siteNodes].filter((node) => node.cluster === cluster.id);
      if (members.length === 0) return;
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const node of members) {
        minX = Math.min(minX, node.x - NODE_HALF_WIDTH[node.kind]);
        maxX = Math.max(maxX, node.x + NODE_HALF_WIDTH[node.kind]);
        minY = Math.min(minY, node.y - NODE_HALF_HEIGHT[node.kind]);
        maxY = Math.max(maxY, node.y + NODE_HALF_HEIGHT[node.kind]);
      }
      const spanX = maxX - minX + 120;
      const spanY = maxY - minY + 120;
      const k = clamp(Math.min(width / spanX, height / spanY), 0.55, 1.25);
      flyTo((minX + maxX) / 2, (minY + maxY) / 2, k);
    },
    [flyTo],
  );

  /* ------------------------------ Interactions ------------------------------ */

  const zoomBy = useCallback(
    (factor: number, origin?: { x: number; y: number }) => {
      const element = containerRef.current;
      if (!element) return;
      const { width, height } = element.getBoundingClientRect();
      const cx = origin?.x ?? width / 2;
      const cy = origin?.y ?? height / 2;
      autoFit.current = false;
      setSmooth(true);
      setView((current) => {
        const k = clamp(current.k * factor, MIN_K, MAX_K);
        const scale = k / current.k;
        return { k, x: cx - (cx - current.x) * scale, y: cy - (cy - current.y) * scale };
      });
    },
    [],
  );

  // Wheel zoom, around the pointer. Non-passive so the page doesn't scroll.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      autoFit.current = false;
      const rect = element.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const factor = Math.exp(-event.deltaY * 0.0014);
      setSmooth(false);
      setView((current) => {
        const k = clamp(current.k * factor, MIN_K, MAX_K);
        const scale = k / current.k;
        return { k, x: px - (px - current.x) * scale, y: py - (py - current.y) * scale };
      });
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  // Frame the map once measured, and keep it framed on resize until first touch.
  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    positionInitial();
    const observer = new ResizeObserver(() => {
      if (autoFit.current) positionInitial();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [positionInitial]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-map-node],[data-map-overlay]")) return;
    element_pointerDown(event);
  };

  // Kept separate so the early return reads clearly above.
  const element_pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    element.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    autoFit.current = false;

    if (pointers.current.size === 1) {
      gesture.current = {
        mode: "pan",
        startX: event.clientX,
        startY: event.clientY,
        view,
        moved: false,
      };
    } else if (pointers.current.size === 2) {
      const [first, second] = [...pointers.current.values()] as [PointerPos, PointerPos];
      gesture.current = {
        mode: "pinch",
        distance: distance(first, second),
        midX: (first.x + second.x) / 2,
        midY: (first.y + second.y) / 2,
        view,
      };
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const current = gesture.current;
    if (!current) return;

    if (current.mode === "pan" && pointers.current.size === 1) {
      const dx = event.clientX - current.startX;
      const dy = event.clientY - current.startY;
      if (!current.moved && Math.hypot(dx, dy) > 4) {
        current.moved = true;
        setDragging(true);
      }
      if (current.moved) {
        suppressClick.current = true;
        setSmooth(false);
        setView({ k: current.view.k, x: current.view.x + dx, y: current.view.y + dy });
      }
    } else if (current.mode === "pinch" && pointers.current.size >= 2) {
      const [first, second] = [...pointers.current.values()] as [PointerPos, PointerPos];
      const nextDistance = distance(first, second);
      if (nextDistance <= 0) return;
      suppressClick.current = true;
      const midX = (first.x + second.x) / 2;
      const midY = (first.y + second.y) / 2;
      const factor = nextDistance / current.distance;
      setSmooth(false);
      const k = clamp(current.view.k * factor, MIN_K, MAX_K);
      const scale = k / current.view.k;
      setView({
        k,
        x: midX - (current.midX - current.view.x) * scale,
        y: midY - (current.midY - current.view.y) * scale,
      });
    }
  };

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 0) {
      gesture.current = null;
      setDragging(false);
    }
  };

  const selectNode = (node: SignalNode) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    setSelectedId(node.id);
    const element = containerRef.current;
    if (!element) return;
    const { width, height } = element.getBoundingClientRect();
    const desktop = width >= 1024;
    const k = Math.max(view.k, desktop ? 0.85 : 0.72);
    const fx = desktop ? 0.38 : 0.5;
    const fy = desktop ? 0.5 : 0.34;
    // Keep the node where it is when it already sits comfortably in view.
    const screen = project(node.x, node.y, view);
    const targetX = width * fx;
    const targetY = height * fy;
    if (Math.abs(screen.x - targetX) < width * 0.1 && Math.abs(screen.y - targetY) < height * 0.14) {
      if (k !== view.k) return;
      setSmooth(true);
      return;
    }
    autoFit.current = false;
    setSmooth(true);
    setView({ k, x: targetX - node.x * k, y: targetY - node.y * k });
  };

  const isEdgeActive = (edge: SignalEdge) =>
    selectedId === null || edge.from === selectedId || edge.to === selectedId;
  const isNodeActive = (node: SignalNode) =>
    selectedId === null ||
    node.id === selectedId ||
    (neighbours.get(selectedId)?.has(node.id) ?? false);

  /* --------------------------------- Render -------------------------------- */

  return (
    <figure data-slot="signal-map" className="grid gap-3">
      <div
        ref={containerRef}
        aria-label="Signal map — an interactive network connecting the study's machine-readability findings, grouped into reach, access, the read gate, coverage, structure, and vertical context"
        className={cn(
          "relative isolate h-[560px] touch-none select-none overflow-hidden rounded-2xl border border-border bg-background sm:h-[620px] xl:h-[680px]",
          dragging ? "cursor-grabbing" : "cursor-grab",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onKeyDown={(event) => {
          if (event.key === "Escape") setSelectedId(null);
        }}
      >
        {/* Canvas furniture — viewport-fixed grid */}
        <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--background)_100%)]" />

        <p className="sr-only">
          Use Tab to move between nodes and Enter to open a node's details. Drag to pan, scroll
          or pinch to zoom.
        </p>

        {/* The transformed canvas */}
        <div
          className={cn(
            "absolute left-0 top-0 origin-top-left",
            smooth && "transition-transform duration-500 ease-out",
          )}
          style={{
            width: SIGNAL_CANVAS.width,
            height: SIGNAL_CANVAS.height,
            transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.k})`,
          }}
        >
          {/* Edges */}
          <svg
            aria-hidden
            className="absolute left-0 top-0"
            width={SIGNAL_CANVAS.width}
            height={SIGNAL_CANVAS.height}
          >
            {signalEdges.map((edge) => {
              const fromNode = nodeById.get(edge.from);
              const toNode = nodeById.get(edge.to);
              if (!fromNode || !toNode) return null;
              const active = isEdgeActive(edge);
              return (
                <g key={edge.id}>
                  <path
                    d={edgePath(fromNode, toNode, edge)}
                    fill="none"
                    strokeWidth={edgeWidth[edge.kind]}
                    strokeDasharray={edgeDash[edge.kind]}
                    vectorEffect="non-scaling-stroke"
                    className={cn(
                      edgeStroke[edge.kind],
                      "transition-opacity duration-200",
                    )}
                    style={{ opacity: edgeOpacity[edge.kind] * (active ? 1 : 0.12) }}
                  />
                  {edge.label && (
                    <text
                      x={edge.labelAt?.x ?? (fromNode.x + toNode.x) / 2}
                      y={edge.labelAt?.y ?? (fromNode.y + toNode.y) / 2}
                      textAnchor="middle"
                      className="fill-muted-foreground transition-opacity duration-200"
                      style={{
                        paintOrder: "stroke",
                        stroke: "var(--background)",
                        strokeWidth: 5,
                        strokeLinejoin: "round",
                        fontSize: 13,
                        fontWeight: 500,
                        opacity: active ? 1 : 0.15,
                      }}
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Cluster labels */}
          {signalClusters.map((cluster) => (
            <div
              key={cluster.id}
              aria-hidden
              className={cn(
                "pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 transition-opacity duration-200",
                activeCluster && activeCluster !== cluster.id ? "opacity-30" : "opacity-100",
              )}
              style={{ left: cluster.labelX, top: cluster.labelY }}
            >
              <span className={cn("size-2 rounded-full", hueClasses[cluster.hue].dot)} />
              <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {cluster.title}
              </span>
              <span className="text-[13px] text-muted-foreground/70">— {cluster.tagline}</span>
            </div>
          ))}

          {/* Nodes */}
          {[...signalNodes, ...(showSiteNodes ? siteNodes : [])].map((node) => {
            const selected = node.id === selectedId;
            const active = isNodeActive(node);
            const isSiteNode = node.kind === "site";
            const vertical = node.cluster === "verticals" && !isSiteNode;
            return (
              <button
                key={node.id}
                type="button"
                data-map-node
                aria-pressed={selected}
                aria-label={`${node.label}: ${node.value}. ${node.sub}`}
                onClick={() => selectNode(node)}
                onFocus={(event) => {
                  const element = containerRef.current;
                  if (!element) return;
                  const rect = element.getBoundingClientRect();
                  const screen = project(node.x, node.y, view);
                  const margin = 60;
                  if (
                    screen.x < margin ||
                    screen.x > rect.width - margin ||
                    screen.y < margin ||
                    screen.y > rect.height - margin
                  ) {
                    event.currentTarget.blur();
                    setSmooth(true);
                    setView((current) => ({
                      k: current.k,
                      x: rect.width / 2 - node.x * current.k,
                      y: rect.height / 2 - node.y * current.k,
                    }));
                    event.currentTarget.focus({ preventScroll: true });
                  }
                }}
                style={{
                  left: node.x,
                  top: node.y,
                  zIndex: selected ? 30 : isSiteNode ? 5 : (node.kind === "hub" ? 20 : 10),
                  backgroundColor: isSiteNode && node.site
                    ? (node.site.coverage !== null
                      ? (node.site.coverage >= 70 ? "rgb(34 197 94)" : node.site.coverage >= 40 ? "rgb(234 179 8)" : "rgb(239 68 68)")
                      : "rgb(113 113 122)")
                    : undefined,
                }}
                className={cn(
                  "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border bg-surface text-left shadow-sm transition-[opacity,border-color,box-shadow] duration-200 focus-ring",
                  isSiteNode
                    ? "size-2.5 rounded-full p-0 border-0"
                    : (vertical ? "w-36 gap-0.5 p-2" : nodeBox[node.kind]),
                  selected
                    ? "ring-2 ring-primary scale-150"
                    : isSiteNode
                      ? "hover:scale-150"
                      : "border-border hover:border-input hover:shadow-md",
                  !active && "opacity-30",
                )}
              >
                {!isSiteNode && (
                  <>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        aria-hidden
                        className={cn("size-1.5 shrink-0 rounded-full", hueClasses[clusterById.get(node.cluster)?.hue ?? "chart-1"].dot)}
                      />
                      <span className="truncate text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                        {node.label}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "numeric block truncate font-mono font-semibold tracking-tight",
                        vertical ? "text-base" : nodeValueSize[node.kind],
                      )}
                    >
                      {node.value}
                    </span>
                    <span className="block text-[11px] leading-snug text-muted-foreground">
                      <Tooltip content={node.sub}>{node.sub}</Tooltip>
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend + controls (viewport-fixed) */}
        <div data-map-overlay className="absolute inset-x-3 top-3 z-40 flex items-start justify-between gap-3">
          <div className="pointer-events-auto flex max-w-[75%] flex-wrap gap-1">
            {signalClusters.map((cluster) => (
              <button
                key={cluster.id}
                type="button"
                onClick={() => flyToCluster(cluster)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border bg-surface/90 px-2.5 py-1 text-[11px] font-medium backdrop-blur transition-colors focus-ring",
                  activeCluster === cluster.id
                    ? "border-primary text-foreground"
                    : "border-border text-muted-foreground hover:border-input hover:text-foreground",
                )}
              >
                <span aria-hidden className={cn("size-1.5 rounded-full", hueClasses[cluster.hue].dot)} />
                {cluster.title}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowSiteNodes(!showSiteNodes)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border bg-surface/90 px-2.5 py-1 text-[11px] font-medium backdrop-blur transition-colors focus-ring",
                showSiteNodes
                  ? "border-primary text-foreground"
                  : "border-border text-muted-foreground hover:border-input hover:text-foreground",
              )}
            >
              <span aria-hidden className="size-1.5 rounded-full bg-muted-foreground" />
              {showSiteNodes ? "Hide" : "Show"} sites
            </button>
          </div>

          <div className="pointer-events-auto flex flex-col items-center gap-1 rounded-full border border-border bg-surface/90 p-1 backdrop-blur">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Zoom in"
              onClick={() => zoomBy(1.25)}
            >
              <ZoomIn />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Zoom out"
              onClick={() => zoomBy(0.8)}
            >
              <ZoomOut />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Fit the whole map"
              onClick={fitView}
            >
              <Maximize2 />
            </Button>
          </div>
        </div>

        <p
          data-map-overlay
          className="pointer-events-none absolute bottom-3 left-3 z-40 rounded-full border border-border bg-surface/90 px-2.5 py-1 text-[11px] text-muted-foreground backdrop-blur"
        >
          Drag to pan · scroll to zoom · click a node · {showSiteNodes ? `${topSitesStudy.sites.length} sites visible` : "sites hidden"}
        </p>

        {/* Node detail panel */}
        {selectedNode && (
          <aside
            data-map-overlay
            aria-label={`Details for ${selectedNode.label}`}
            className="absolute inset-x-3 bottom-3 z-50 grid max-h-[62%] gap-3 overflow-auto rounded-xl border border-border bg-surface/95 p-4 shadow-lg backdrop-blur md:inset-x-auto md:bottom-3 md:right-3 md:top-14 md:max-h-none md:w-80"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 rounded-full",
                    hueClasses[clusterById.get(selectedNode.cluster)?.hue ?? "chart-1"].dot,
                  )}
                />
                {clusterById.get(selectedNode.cluster)?.title} —{" "}
                {clusterById.get(selectedNode.cluster)?.tagline}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Close details"
                onClick={() => setSelectedId(null)}
                className="-mr-1.5 -mt-1.5"
              >
                <X />
              </Button>
            </div>

            <div className="grid gap-0.5">
              <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {selectedNode.label}
              </span>
              <span className="numeric font-mono text-3xl font-semibold tracking-tight">
                {selectedNode.value}
              </span>
              <span className="text-xs leading-relaxed text-muted-foreground">
                {selectedNode.sub}
              </span>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
                  <Tooltip content={selectedNode.note}>Note: {selectedNode.note}</Tooltip>
                </p>

            {selectedNode.site && (
              <>
                <Separator />
                <div className="grid gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Site record
                  </span>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div className="grid gap-0.5 rounded-lg border border-border bg-background px-2.5 py-2">
                      <dt className="text-muted-foreground">Tranco rank</dt>
                      <dd className="numeric font-mono font-medium">#{selectedNode.site.rank}</dd>
                    </div>
                    <div className="grid gap-0.5 rounded-lg border border-border bg-background px-2.5 py-2">
                      <dt className="text-muted-foreground">AI-visible</dt>
                      <dd className="numeric font-mono font-medium">
                        {selectedNode.site.coverage !== null ? `${selectedNode.site.coverage}%` : "—"}
                      </dd>
                    </div>
                  </dl>
                  <Badge
                    variant={classificationMeta[(selectedNode.site as any).classification as SiteClassification].tone}
                    size="sm"
                    dot
                    className="w-fit"
                  >
                    {classificationMeta[(selectedNode.site as any).classification as SiteClassification].label}
                  </Badge>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="justify-between"
                    onClick={() => setProfile(selectedNode.site ?? null)}
                  >
                    Full site profile
                    <ChevronRight />
                  </Button>
                </div>
              </>
            )}

            {(selectedNode as any).sites && (selectedNode as any).sites.length > 0 && (
              <>
                <Separator />
                <div className="grid gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Examples in this group
                  </span>
                  {(selectedNode as any).sites.map((site: StudySite) => (
                    <button
                      key={site.domain}
                      type="button"
                      onClick={() => setProfile(site)}
                      className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent focus-ring"
                    >
                      <span className="truncate font-mono">{site.domain}</span>
                      <span className="numeric shrink-0 font-mono text-muted-foreground">
                        #{site.rank} ·{" "}
                        {site.coverage !== null
                          ? `${site.coverage}%`
                          : classificationMeta[site.classification].label}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </aside>
        )}
      </div>

      <figcaption className="text-xs leading-relaxed text-muted-foreground">
        {signalMapCaption}
      </figcaption>

      <details className="grid gap-0">
        <summary className="w-fit cursor-pointer select-none rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-ring">
          View as table
        </summary>
        <div className="mt-3 grid gap-6">
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Grouping</TableHead>
                  <TableHead>Aspect</TableHead>
                  <TableHead>Reading</TableHead>
                  <TableHead className="pr-4">What it means</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signalNodes.map((node) => (
                  <TableRow key={node.id}>
                    <TableCell className="pl-4 align-top text-muted-foreground">
                      {clusterById.get(node.cluster)?.title}
                    </TableCell>
                    <TableCell className="align-top font-medium">{node.label}</TableCell>
                    <TableCell className="numeric align-top font-mono">{node.value}</TableCell>
                    <TableCell className="pr-4 align-top text-muted-foreground">
                      <Tooltip content={node.note}>{node.note}</Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead className="pr-4">Measured relationship</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signalEdges
                  .filter((edge) => edge.kind !== "lead")
                  .map((edge) => (
                    <TableRow key={edge.id}>
                      <TableCell className="pl-4 align-top font-medium">
                        {nodeById.get(edge.from)?.label}
                      </TableCell>
                      <TableCell className="align-top font-medium">
                        {nodeById.get(edge.to)?.label}
                      </TableCell>
                      <TableCell className="align-top text-muted-foreground">
                        {edge.kind === "strong"
                          ? "Headline link"
                          : edge.kind === "none"
                            ? "No relationship"
                            : edge.kind === "context"
                              ? "Context"
                              : "Linked"}
                      </TableCell>
                      <TableCell className="pr-4 align-top text-muted-foreground">
                        {edge.note ?? edge.label}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </details>

      <Dialog
        open={profile !== null}
        onOpenChange={(open) => !open && setProfile(null)}
        className="max-w-2xl"
      >
        {profile && <SiteDetail site={profile} />}
      </Dialog>
    </figure>
  );
}
