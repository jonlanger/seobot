import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface LinkedBarItem {
  id: string;
  label: ReactNode;
  /** Full-dataset magnitude — drawn as the muted context bar behind the fill. */
  total: number;
  /** In-view magnitude — the animated fill. */
  value: number;
  /** Native title / screen-reader detail. */
  hint?: string;
}

interface LinkedBarsBaseProps {
  items: LinkedBarItem[];
  /** Scale ceiling shared by `total` and `value`. */
  max: number;
  /** Ids currently selected as a filter. When non-empty, the rest recede. */
  activeIds: string[];
  onToggle: (id: string) => void;
  formatValue?: (item: LinkedBarItem) => ReactNode;
  className?: string;
}

const scale = (n: number, max: number) => (max > 0 ? Math.min(1, Math.max(0, n / max)) : 0);

/** Horizontal bars: label · track · value. Fill and context bars animate via `scaleX` only. */
export function LinkedBarList({ items, max, activeIds, onToggle, formatValue, className }: LinkedBarsBaseProps) {
  const anyActive = activeIds.length > 0;
  return (
    <ul data-slot="linked-bar-list" className={cn("grid gap-0.5", className)}>
      {items.map((item) => {
        const active = activeIds.includes(item.id);
        return (
          <li key={item.id}>
            <button
              type="button"
              aria-pressed={active}
              title={item.hint}
              onClick={() => onToggle(item.id)}
              className={cn(
                "grid w-full grid-cols-[minmax(0,7.5rem)_1fr_3rem] items-center gap-3 rounded-md px-2 py-1.5 text-left",
                "transition-[background-color,opacity] duration-200 hover:bg-accent focus-ring",
                active && "bg-primary-soft",
                anyActive && !active && "opacity-55",
              )}
            >
              <span className={cn("truncate text-xs", active ? "font-medium text-primary-soft-foreground" : "text-foreground")}>
                {item.label}
              </span>
              <span className="relative h-2 overflow-hidden rounded-full bg-muted">
                <span
                  className="absolute inset-0 origin-left rounded-full bg-border transition-transform duration-700 ease-out-expo"
                  style={{ transform: `scaleX(${scale(item.total, max)})` }}
                />
                <span
                  className="absolute inset-0 origin-left rounded-full bg-chart-1 transition-transform duration-700 ease-out-expo"
                  style={{ transform: `scaleX(${scale(item.value, max)})` }}
                />
              </span>
              <span className="numeric text-right font-mono text-xs text-muted-foreground">
                {formatValue ? formatValue(item) : item.value}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export interface LinkedColumnsProps extends LinkedBarsBaseProps {
  /** Small label under each column. */
  columnLabel?: (item: LinkedBarItem) => ReactNode;
}

/** Vertical columns (a histogram that is also a filter). Animates via `scaleY` only. */
export function LinkedColumns({ items, max, activeIds, onToggle, columnLabel, formatValue, className }: LinkedColumnsProps) {
  const anyActive = activeIds.length > 0;
  return (
    <ul data-slot="linked-columns" className={cn("grid auto-cols-fr grid-flow-col gap-1.5", className)}>
      {items.map((item) => {
        const active = activeIds.includes(item.id);
        return (
          <li key={item.id} className="min-w-0">
            <button
              type="button"
              aria-pressed={active}
              title={item.hint}
              onClick={() => onToggle(item.id)}
              className={cn(
                "group grid w-full gap-1.5 rounded-md p-1 text-center transition-[background-color,opacity] duration-200 hover:bg-accent focus-ring",
                active && "bg-primary-soft",
                anyActive && !active && "opacity-55",
              )}
            >
              <span className="numeric font-mono text-[0.625rem] text-muted-foreground">
                {formatValue ? formatValue(item) : item.value}
              </span>
              <span className="relative block h-32 overflow-hidden rounded-sm">
                <span
                  className="absolute inset-0 origin-bottom rounded-sm bg-border transition-transform duration-700 ease-out-expo"
                  style={{ transform: `scaleY(${scale(item.total, max)})` }}
                />
                <span
                  className="absolute inset-0 origin-bottom rounded-sm bg-chart-1 transition-transform duration-700 ease-out-expo"
                  style={{ transform: `scaleY(${scale(item.value, max)})` }}
                />
              </span>
              <span className="numeric font-mono text-[0.625rem] text-muted-foreground">
                {columnLabel ? columnLabel(item) : item.label}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
