import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface ExplorerTemplateProps {
  /** KPI row — recomputes with the filters. */
  stats?: ReactNode;
  /** Search, layout switch, applied-filter chips. */
  toolbar: ReactNode;
  /** The primary canvas (the thing the filters act on). */
  canvas: ReactNode;
  /** Linked panels that both display and drive the filters. Omit when the page hosts them elsewhere (e.g. a right sidebar). */
  aside?: ReactNode;
  /** Optional trailing block, e.g. the full data table. */
  footer?: ReactNode;
  className?: string;
}

/**
 * Template: the layout contract for a cross-filtered explorer — stats row,
 * toolbar, canvas beside a stack of linked panels, then an optional footer.
 * Knows nothing about sites or crawlers; pages pour content into the slots
 * (atomic design: templates articulate structure, pages supply content).
 */
export function ExplorerTemplate({ stats, toolbar, canvas, aside, footer, className }: ExplorerTemplateProps) {
  return (
    <div data-slot="explorer-template" className={cn("grid gap-4", className)}>
      {stats && <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">{stats}</div>}
      {toolbar}
      {aside ? (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_23rem]">
          <div className="min-w-0 xl:sticky xl:top-20">{canvas}</div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">{aside}</div>
        </div>
      ) : (
        <div className="min-w-0">{canvas}</div>
      )}
      {footer}
    </div>
  );
}
