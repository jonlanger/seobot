import { Fragment, useId, useMemo, useRef, useState } from "react";
import type { ComponentProps, PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/lib/cn";

export type ChartColor =
  | "chart-1"
  | "chart-2"
  | "chart-3"
  | "chart-4"
  | "chart-5"
  | "chart-6"
  | "chart-7"
  | "chart-8";

const chartColorClasses: Record<ChartColor, { text: string; stroke: string; fill: string; bg: string }> = {
  "chart-1": {
    text: "text-chart-1",
    stroke: "stroke-chart-1",
    fill: "fill-chart-1",
    bg: "bg-chart-1",
  },
  "chart-2": {
    text: "text-chart-2",
    stroke: "stroke-chart-2",
    fill: "fill-chart-2",
    bg: "bg-chart-2",
  },
  "chart-3": {
    text: "text-chart-3",
    stroke: "stroke-chart-3",
    fill: "fill-chart-3",
    bg: "bg-chart-3",
  },
  "chart-4": {
    text: "text-chart-4",
    stroke: "stroke-chart-4",
    fill: "fill-chart-4",
    bg: "bg-chart-4",
  },
  "chart-5": {
    text: "text-chart-5",
    stroke: "stroke-chart-5",
    fill: "fill-chart-5",
    bg: "bg-chart-5",
  },
  "chart-6": {
    text: "text-chart-6",
    stroke: "stroke-chart-6",
    fill: "fill-chart-6",
    bg: "bg-chart-6",
  },
  "chart-7": {
    text: "text-chart-7",
    stroke: "stroke-chart-7",
    fill: "fill-chart-7",
    bg: "bg-chart-7",
  },
  "chart-8": {
    text: "text-chart-8",
    stroke: "stroke-chart-8",
    fill: "fill-chart-8",
    bg: "bg-chart-8",
  },
};

interface Point {
  x: number;
  y: number;
}

/** Catmull-Rom → cubic Bézier smoothing for organic line charts. */
function smoothPath(points: Point[]): string {
  if (points.length === 0) return "";
  const first = points[0]!;
  if (points.length === 1) return `M ${first.x} ${first.y}`;

  let d = `M ${first.x} ${first.y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(3)} ${c1y.toFixed(3)}, ${c2x.toFixed(3)} ${c2y.toFixed(3)}, ${p2.x.toFixed(3)} ${p2.y.toFixed(3)}`;
  }
  return d;
}

function buildPoints(data: number[], width: number, height: number, padding: number): Point[] {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const innerHeight = height - padding * 2;
  return data.map((value, index) => ({
    x: (index / Math.max(1, data.length - 1)) * width,
    y: padding + (1 - (value - min) / range) * innerHeight,
  }));
}

/* -------------------------------- Sparkline ------------------------------- */

export interface SparklineProps {
  data: number[];
  className?: string;
  color?: ChartColor;
}

export function Sparkline({ data, className, color = "chart-1" }: SparklineProps) {
  const points = buildPoints(data, 100, 32, 3);
  const line = smoothPath(points);

  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      aria-hidden
      className={cn("h-8 w-full overflow-visible", chartColorClasses[color].text, className)}
    >
      <path
        d={`${line} L 100 32 L 0 32 Z`}
        fill="currentColor"
        opacity={0.12}
      />
      <path
        d={line}
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className={chartColorClasses[color].stroke}
      />
    </svg>
  );
}

/* -------------------------------- AreaChart ------------------------------- */

export interface AreaChartProps extends ComponentProps<"div"> {
  data: number[];
  /** X-axis labels, positioned under their data points. */
  labels?: string[];
  /** Plot height in px. */
  height?: number;
  valueFormatter?: (value: number) => string;
  color?: ChartColor;
  showGrid?: boolean;
}

export function AreaChart({
  data,
  labels,
  height = 240,
  valueFormatter = (value) => value.toLocaleString(),
  color = "chart-1",
  showGrid = true,
  className,
  ...props
}: AreaChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const gradientId = useId().replace(/:/g, "");

  const width = 100;
  const plotHeight = 40;
  const points = useMemo(() => buildPoints(data, width, plotHeight, 3), [data]);
  const line = useMemo(() => smoothPath(points), [points]);

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect || data.length < 2) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    setHoverIndex(Math.round(ratio * (data.length - 1)));
  };

  const hovered = hoverIndex !== null ? points[hoverIndex] : undefined;
  const hoveredX = hoverIndex !== null ? (hoverIndex / Math.max(1, data.length - 1)) * 100 : 0;
  const hoveredY = hovered ? (hovered.y / plotHeight) * 100 : 0;

  const labelStep = labels ? Math.max(1, Math.ceil(labels.length / 8)) : 1;

  return (
    <div
      data-slot="area-chart"
      className={cn("flex flex-col gap-2", chartColorClasses[color].text, className)}
      {...props}
    >
      <div
        ref={wrapperRef}
        className="relative"
        style={{ height }}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        {showGrid &&
          [25, 50, 75].map((top) => (
            <div
              key={top}
              aria-hidden
              className="absolute inset-x-0 border-t border-dashed border-border/80"
              style={{ top: `${top}%` }}
            />
          ))}

        <svg
          viewBox={`0 0 ${width} ${plotHeight}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.22} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={`${line} L ${width} ${plotHeight} L 0 ${plotHeight} Z`} fill={`url(#${gradientId})`} />
          <path
            d={line}
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className={chartColorClasses[color].stroke}
          />
        </svg>

        {hoverIndex !== null && hovered && (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 border-l border-border"
              style={{ left: `${hoveredX}%` }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-current"
              style={{ left: `${hoveredX}%`, top: `${hoveredY}%` }}
            />
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%_+_14px)] whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground shadow-md"
              style={{ left: `${hoveredX}%`, top: `${hoveredY}%` }}
            >
              <span className="numeric font-mono font-medium">
                {valueFormatter(data[hoverIndex]!)}
              </span>
              {labels?.[hoverIndex] && (
                <span className="ml-1.5 text-muted-foreground">{labels[hoverIndex]}</span>
              )}
            </div>
          </>
        )}
      </div>

      {labels && (
        <div className="relative h-5 text-xs text-muted-foreground">
          {labels.map((label, index) =>
            index % labelStep === 0 || index === labels.length - 1 ? (
              <span
                key={`${label}-${index}`}
                className="absolute top-0 -translate-x-1/2 whitespace-nowrap first:translate-x-0 last:-translate-x-full"
                style={{ left: `${(index / Math.max(1, labels.length - 1)) * 100}%` }}
              >
                {label}
              </span>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- BarChart -------------------------------- */

export interface BarChartProps extends ComponentProps<"div"> {
  data: number[];
  labels?: string[];
  height?: number;
  valueFormatter?: (value: number) => string;
  color?: ChartColor;
}

export function BarChart({
  data,
  labels,
  height = 180,
  valueFormatter = (value) => value.toLocaleString(),
  color = "chart-1",
  className,
  ...props
}: BarChartProps) {
  const max = Math.max(...data, 1);

  return (
    <div data-slot="bar-chart" className={cn("flex flex-col gap-2", className)} {...props}>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((value, index) => (
          <div key={index} className="group/bar relative flex h-full min-w-0 flex-1 items-end">
            <div
              className={cn(
                "relative w-full rounded-t-md transition-opacity group-hover/bar:opacity-85",
                chartColorClasses[color].bg,
              )}
              style={{ height: `${Math.max(2, (value / max) * 100)}%` }}
            >
              <span className="numeric pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 font-mono text-xs font-medium text-background shadow-md group-hover/bar:block">
                {valueFormatter(value)}
              </span>
            </div>
          </div>
        ))}
      </div>
      {labels && (
        <div className="flex gap-1.5 text-xs text-muted-foreground">
          {labels.map((label, index) => (
            <span key={`${label}-${index}`} className="min-w-0 flex-1 truncate text-center">
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- ScatterChart ------------------------------ */

export interface ScatterPoint {
  x: number;
  y: number;
  /** Point name, surfaced in the native tooltip. */
  label?: string;
  /** Emphasized mark for the points worth calling out in the caption. */
  highlight?: boolean;
}

export interface ScatterChartProps extends ComponentProps<"div"> {
  points: ScatterPoint[];
  /** Plot height in px. */
  height?: number;
  color?: ChartColor;
  xLabel?: string;
  yLabel?: string;
  xFormatter?: (value: number) => string;
  yFormatter?: (value: number) => string;
}

export function ScatterChart({
  points,
  height = 240,
  color = "chart-1",
  xLabel,
  yLabel,
  xFormatter = (value) => value.toLocaleString(),
  yFormatter = (value) => value.toLocaleString(),
  className,
  ...props
}: ScatterChartProps) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = xs.length ? Math.min(...xs) : 0;
  const maxX = xs.length ? Math.max(...xs) : 0;
  const minY = ys.length ? Math.min(...ys) : 0;
  const maxY = ys.length ? Math.max(...ys) : 0;
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  return (
    <div
      data-slot="scatter-chart"
      className={cn("flex flex-col gap-2", chartColorClasses[color].text, className)}
      {...props}
    >
      <div className="relative rounded-lg border border-border/60" style={{ height }}>
        {[25, 50, 75].map((position) => (
          <div
            key={`v${position}`}
            aria-hidden
            className="absolute inset-y-0 border-l border-dashed border-border/70"
            style={{ left: `${position}%` }}
          />
        ))}
        {[25, 50, 75].map((position) => (
          <div
            key={`h${position}`}
            aria-hidden
            className="absolute inset-x-0 border-t border-dashed border-border/70"
            style={{ top: `${position}%` }}
          />
        ))}

        {points.map((point, index) => (
          <span
            key={index}
            title={`${point.label ? `${point.label} — ` : ""}${xFormatter(point.x)}, ${yFormatter(point.y)}`}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-current transition-transform hover:scale-150",
              point.highlight ? "size-2.5 ring-2 ring-surface" : "size-1.5",
            )}
            style={{
              left: `${2 + ((point.x - minX) / rangeX) * 94}%`,
              top: `${2 + (1 - (point.y - minY) / rangeY) * 94}%`,
            }}
          />
        ))}

        <span className="numeric pointer-events-none absolute left-2 top-1.5 font-mono text-[11px] text-muted-foreground">
          {yFormatter(maxY)}
        </span>
        <span className="numeric pointer-events-none absolute bottom-1.5 left-2 font-mono text-[11px] text-muted-foreground">
          {xFormatter(minX)}
        </span>
        <span className="numeric pointer-events-none absolute bottom-1.5 right-2 font-mono text-[11px] text-muted-foreground">
          {xFormatter(maxX)}
        </span>
      </div>

      {(xLabel || yLabel) && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{yLabel}</span>
          <span>{xLabel}</span>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Histogram -------------------------------- */

export interface HistogramProps extends ComponentProps<"div"> {
  /** Bin counts, left to right. */
  data: number[];
  /** Bin labels — the first, middle, and last are rendered under the axis. */
  labels?: string[];
  /** Plot height in px. */
  height?: number;
  valueFormatter?: (value: number) => string;
  color?: ChartColor;
}

export function Histogram({
  data,
  labels,
  height = 180,
  valueFormatter = (value) => value.toLocaleString(),
  color = "chart-1",
  className,
  ...props
}: HistogramProps) {
  const max = Math.max(...data, 1);
  const mid = labels ? Math.floor(labels.length / 2) : 0;

  return (
    <div data-slot="histogram" className={cn("flex flex-col gap-2", className)} {...props}>
      <div className="flex items-end gap-px" style={{ height }}>
        {data.map((value, index) => (
          <div key={index} className="group/hist relative h-full min-w-0 flex-1">
            <div
              className={cn(
                "absolute inset-x-0 bottom-0 rounded-[3px] transition-opacity group-hover/hist:opacity-85",
                chartColorClasses[color].bg,
              )}
              style={{ height: `${Math.max(2, (value / max) * 100)}%` }}
            >
              <span className="numeric pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 font-mono text-xs font-medium text-background shadow-md group-hover/hist:block">
                {valueFormatter(value)}
              </span>
            </div>
          </div>
        ))}
      </div>
      {labels && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="numeric font-mono">{labels[0]}</span>
          <span className="numeric font-mono">{labels[mid]}</span>
          <span className="numeric font-mono">{labels[labels.length - 1]}</span>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Heatmap --------------------------------- */

/** Index = intensity step (0 renders as "no data"). Literal classes for Tailwind. */
const heatmapStepClasses = [
  "bg-muted/60",
  "bg-seq-1",
  "bg-seq-2",
  "bg-seq-3",
  "bg-seq-4",
  "bg-seq-5",
  "bg-seq-6",
  "bg-seq-7",
  "bg-seq-8",
];

export interface HeatmapProps extends ComponentProps<"div"> {
  /** Row labels, top to bottom. */
  rows: string[];
  /** Column labels, left to right. */
  columns: string[];
  /** Value matrix — `values[rowIndex][columnIndex]`. */
  values: number[][];
  /** Scale ceiling. Defaults to the highest value in the matrix. */
  max?: number;
  /** Values at or below this render as "no data". Defaults to 0. */
  emptyValue?: number;
  formatValue?: (value: number) => string;
}

export function Heatmap({
  rows,
  columns,
  values,
  max,
  emptyValue = 0,
  formatValue = (value) => value.toLocaleString(),
  className,
  ...props
}: HeatmapProps) {
  const scaleMax = max ?? Math.max(...values.flat(), 1);

  return (
    <div data-slot="heatmap" className={cn("grid gap-2", className)} {...props}>
      <div
        className="grid items-center gap-1"
        style={{
          gridTemplateColumns: `minmax(6rem, max-content) repeat(${columns.length}, minmax(2.5rem, 1fr))`,
        }}
      >
        <div aria-hidden />
        {columns.map((column) => (
          <div
            key={column}
            className="truncate pb-1 text-center font-mono text-[11px] text-muted-foreground"
          >
            {column}
          </div>
        ))}

        {rows.map((row, rowIndex) => (
          <Fragment key={row}>
            <div className="max-w-40 truncate pr-2 text-xs text-muted-foreground">{row}</div>
            {columns.map((column, columnIndex) => {
              const value = values[rowIndex]?.[columnIndex] ?? 0;
              const step =
                value <= emptyValue
                  ? 0
                  : Math.min(8, Math.max(1, Math.ceil((value / scaleMax) * 8)));
              return (
                <div
                  key={column}
                  title={`${row} · ${column}: ${formatValue(value)}`}
                  className={cn("h-9 rounded-[4px]", heatmapStepClasses[step])}
                />
              );
            })}
          </Fragment>
        ))}
      </div>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>Fewer</span>
        <div className="flex gap-0.5" aria-hidden>
          {heatmapStepClasses.slice(1).map((stepClass) => (
            <span key={stepClass} className={cn("h-2 w-4 rounded-[2px]", stepClass)} />
          ))}
        </div>
        <span>More</span>
        <span className="numeric ml-auto font-mono">
          {formatValue(emptyValue)} – {formatValue(scaleMax)}
        </span>
      </div>
    </div>
  );
}
