import type { ComponentProps, ReactNode } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";

export type MeterTone = "primary" | "success" | "warning" | "danger" | "info";

export interface MeterListItem {
  id: string;
  label: ReactNode;
  /** Secondary line under the label. */
  hint?: ReactNode;
  value: number;
  /** Defaults to 100. */
  max?: number;
  /** Semantic color for the indicator. Defaults to `primary`. */
  tone?: MeterTone;
}

const toneIndicator: Record<MeterTone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
};

export interface MeterListProps extends ComponentProps<"div"> {
  items: MeterListItem[];
}

/**
 * Labeled meter rows — category scores, area health, budget usage. Each row
 * pairs a labeled `<Progress>` bar with its value in text, so the numbers
 * exist without color or hover.
 */
export function MeterList({ items, className, ...props }: MeterListProps) {
  return (
    <div data-slot="meter-list" className={cn("grid gap-4", className)} {...props}>
      {items.map((item) => {
        const max = item.max ?? 100;
        return (
          <div key={item.id} className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <div className="grid gap-0.5">
                <span className="text-sm font-medium">{item.label}</span>
                {item.hint && <span className="text-xs text-muted-foreground">{item.hint}</span>}
              </div>
              <span className="numeric font-mono text-sm text-muted-foreground">
                {item.value}
                {max !== 100 ? ` / ${max}` : ""}
              </span>
            </div>
            <Progress
              value={item.value}
              max={max}
              indicatorClassName={toneIndicator[item.tone ?? "primary"]}
              aria-label={
                typeof item.label === "string" ? `${item.label}: ${item.value} of ${max}` : undefined
              }
            />
          </div>
        );
      })}
    </div>
  );
}
