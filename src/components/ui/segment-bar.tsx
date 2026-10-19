import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type SegmentTone = "primary" | "success" | "warning" | "danger" | "info" | "muted";

export interface SegmentBarItem {
  id: string;
  label: ReactNode;
  value: number;
  /** Semantic color. Defaults to `primary`. */
  tone?: SegmentTone;
}

const toneClasses: Record<SegmentTone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
  muted: "bg-muted-foreground/40",
};

export interface SegmentBarProps extends ComponentProps<"div"> {
  items: SegmentBarItem[];
  /** Denominator for share-of-total. Defaults to the sum of the item values. */
  total?: number;
  /** Show the legend below the bar (recommended — values must be readable). */
  legend?: boolean;
  size?: "sm" | "md";
}

/**
 * Parts-of-a-whole as one horizontal bar plus a value legend — status mixes,
 * answer distributions, crawler splits. The bar is presentational; the legend
 * carries the numbers in text, so color is never the only signal.
 */
export function SegmentBar({
  items,
  total,
  legend = true,
  size = "md",
  className,
  ...props
}: SegmentBarProps) {
  const sum = items.reduce((acc, item) => acc + item.value, 0);
  const denominator = total ?? sum;
  const share = (value: number) =>
    denominator <= 0 ? 0 : Math.min(100, Math.max(0, (value / denominator) * 100));

  return (
    <div data-slot="segment-bar" className={cn("grid gap-3", className)} {...props}>
      <div
        aria-hidden
        className={cn(
          "flex w-full overflow-hidden rounded-full bg-muted",
          size === "sm" ? "h-2" : "h-2.5",
        )}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "h-full transition-[width] duration-700 ease-out",
              toneClasses[item.tone ?? "primary"],
            )}
            style={{ width: `${share(item.value)}%` }}
          />
        ))}
      </div>

      {legend && (
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={cn("size-2 shrink-0 rounded-full", toneClasses[item.tone ?? "primary"])}
              />
              <span className="text-muted-foreground">{item.label}</span>
              <span className="numeric font-mono font-medium">{item.value.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
