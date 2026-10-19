import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { InfoPopover } from "./info-popover";

export interface ChartFrameProps extends ComponentProps<"figure"> {
  /** Short chart title — also the default aria-label for the plot. */
  title: string;
  /** Accessible description of the plot. Defaults to `title`. */
  ariaLabel?: string;
  /** The takeaway, in show-the-number form: value + unit + source + year. */
  caption?: ReactNode;
  /** Longer explanation, shown in a hover/focus popover beside the title instead of under it. */
  info?: ReactNode;
  /** Optional action area beside the title (period pickers, export…). */
  actions?: ReactNode;
  /** Table-first view of the same data, rendered in a no-JS disclosure. */
  table?: ReactNode;
  children: ReactNode;
}

/**
 * The standard container for every data visualization: title, accessible plot
 * label, takeaway caption (number + unit + source + year), optional actions,
 * and an optional `<details>` table view so the numbers exist in the HTML
 * without JavaScript (table-first, chart-second).
 */
export function ChartFrame({
  title,
  ariaLabel,
  caption,
  info,
  actions,
  table,
  children,
  className,
  ...props
}: ChartFrameProps) {
  return (
    <figure data-slot="chart-frame" className={cn("grid gap-3", className)} {...props}>
      <div className="flex items-start justify-between gap-4">
        <figcaption className="grid gap-1">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            {title}
            {info && (
              <InfoPopover label={`About: ${title}`}>{info}</InfoPopover>
            )}
          </span>
          {caption && (
            <span className="text-xs leading-relaxed text-muted-foreground">{caption}</span>
          )}
        </figcaption>
        {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
      </div>

      <div role="img" aria-label={ariaLabel ?? title}>
        {children}
      </div>

      {table && (
        <details className="grid gap-0">
          <summary className="w-fit cursor-pointer select-none rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-ring">
            View as table
          </summary>
          <div className="mt-3">{table}</div>
        </details>
      )}
    </figure>
  );
}
