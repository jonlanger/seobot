import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface Dot {
  id: string;
  /** 0–1 across the plot. */
  x: number;
  /** 0–1 down the plot. */
  y: number;
  /** Tailwind background class for the mark (a token color). */
  tone: string;
  /** In the current filter. Inactive dots recede and stop receiving pointer events. */
  active: boolean;
  label: string;
}

export interface DotFieldGuide {
  id: string;
  label: string;
  title?: string;
  /** 0–1. */
  at: number;
  /** Available label width, 0–1 of the plot. Labels truncate to it. */
  width?: number;
}

export interface DotFieldProps {
  dots: Dot[];
  /** Horizontal reference lines, labelled on the left (y axis). */
  rows?: DotFieldGuide[];
  /** Column / tick labels along the bottom (x axis). */
  columns?: DotFieldGuide[];
  /** Draw a faint vertical hairline per column. */
  columnLines?: boolean;
  /** Changes when the x layout changes so the labels re-enter. */
  guideKey?: string;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Rich hover content for a dot. */
  renderTooltip?: (id: string) => ReactNode;
  className?: string;
}

/**
 * A dense, animated point field: every mark is an HTML button positioned with
 * container-query units, so moving it is a pure `transform` transition (design
 * system motion rule 1) and server and client markup agree without measuring.
 * Purely presentational — callers own the data, layout, and filtering.
 *
 * Marks are pointer targets only; the keyboard path is the table view that
 * `ChartFrame` renders alongside.
 */
export function DotField({
  dots,
  rows = [],
  columns = [],
  columnLines = false,
  guideKey,
  selectedId,
  onSelect,
  renderTooltip,
  className,
}: DotFieldProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const hovered = useMemo(() => dots.find((dot) => dot.id === hoverId) ?? null, [dots, hoverId]);

  return (
    <div
      data-slot="dot-field"
      className={cn("relative h-[26rem] rounded-xl border border-border bg-surface/50 sm:h-[30rem]", className)}
    >
      <div className="absolute bottom-9 left-14 right-4 top-4 [container-type:size]">
        {rows.map((row) => (
          <div key={row.id} className="absolute inset-x-0" style={{ top: `${row.at * 100}%` }}>
            <div className="border-t border-dashed border-border" />
            <span className="numeric absolute right-full -translate-y-1/2 whitespace-nowrap pr-2 font-mono text-[0.625rem] text-muted-foreground">
              {row.label}
            </span>
          </div>
        ))}

        <div key={guideKey} className="motion-safe:animate-fade-in">
          {columns.map((column) => (
            <div key={column.id} className="absolute inset-y-0" style={{ left: `${column.at * 100}%` }}>
              {columnLines && <div className="h-full border-l border-dashed border-border/60" />}
              <span
                title={column.title ?? column.label}
                style={column.width ? { width: `calc(${column.width} * 100cqw)` } : undefined}
                className="absolute left-0 top-full -translate-x-1/2 truncate px-0.5 pt-2 text-center text-[0.625rem] leading-tight text-muted-foreground"
              >
                {column.label}
              </span>
            </div>
          ))}
        </div>

        {dots.map((dot, index) => {
          const selected = dot.id === selectedId;
          return (
            <button
              key={dot.id}
              type="button"
              tabIndex={-1}
              aria-label={dot.label}
              disabled={!dot.active}
              onClick={() => onSelect?.(dot.id)}
              onPointerEnter={() => setHoverId(dot.id)}
              onPointerLeave={() => setHoverId((current) => (current === dot.id ? null : current))}
              style={
                {
                  "--x": dot.x,
                  "--y": dot.y,
                  // Stagger by index so a layout change reads as a wave, not a jump.
                  transition: `transform 0.9s var(--ease-out-expo) ${(index % 60) * 7}ms`,
                } as CSSProperties
              }
              className={cn(
                "group absolute left-0 top-0 grid size-4 place-items-center rounded-full focus-ring",
                "[transform:translate(calc(var(--x)*100cqw),calc(var(--y)*100cqh))_translate(-50%,-50%)]",
                selected ? "z-20" : "z-10 hover:z-20",
                !dot.active && "pointer-events-none",
              )}
            >
              <span
                className={cn(
                  "block size-2 rounded-full transition-[transform,opacity] duration-300 ease-out",
                  dot.tone,
                  dot.active ? "opacity-90 group-hover:scale-[1.8]" : "scale-50 opacity-[0.12]",
                  selected && "scale-[1.8] opacity-100",
                )}
              />
              {selected && (
                <span aria-hidden className="absolute size-4 rounded-full ring-2 ring-primary motion-safe:animate-fade-in" />
              )}
            </button>
          );
        })}

        {hovered && renderTooltip && (
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 z-30 transition-transform duration-150 ease-out"
            style={
              {
                "--x": hovered.x,
                "--y": hovered.y,
                transform: `translate(calc(var(--x)*100cqw),calc(var(--y)*100cqh)) translate(${
                  hovered.x > 0.55 ? "calc(-100% - 14px)" : "14px"
                },${hovered.y > 0.55 ? "calc(-100% - 6px)" : "-6px"})`,
              } as CSSProperties
            }
          >
            <div className="w-56 rounded-lg border border-border bg-surface p-3 shadow-lg motion-safe:animate-fade-in">
              {renderTooltip(hovered.id)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
