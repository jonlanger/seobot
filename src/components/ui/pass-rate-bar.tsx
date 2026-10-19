import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export interface PassRateBarProps extends Omit<ComponentProps<"div">, "children"> {
  /** 0–100. */
  pct: number;
  /** Sites the percentage is computed over — always shown, never assumed. */
  n: number;
  /** What was measured; used for the accessible label. */
  label: string;
  size?: "sm" | "md";
}

/**
 * A pass rate: animated track (scaleX only), the percentage, and its denominator.
 * The `n` is part of the component on purpose — a rate without its sample size
 * is not a finding.
 */
export function PassRateBar({ pct, n, label, size = "md", className, ...props }: PassRateBarProps) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div
      data-slot="pass-rate-bar"
      role="img"
      aria-label={`${label}: ${pct}% of ${n.toLocaleString()} sites`}
      className={cn("grid grid-cols-[1fr_auto] items-center gap-3", className)}
      {...props}
    >
      <span className={cn("relative block overflow-hidden rounded-full bg-muted", size === "md" ? "h-2" : "h-1.5")}>
        <span
          className="absolute inset-0 origin-left rounded-full bg-chart-1 transition-transform duration-700 ease-out-expo"
          style={{ transform: `scaleX(${clamped / 100})` }}
        />
      </span>
      <span className="numeric flex items-baseline gap-1.5 font-mono">
        <span className={cn("font-medium", size === "md" ? "text-sm" : "text-xs")}>{pct}%</span>
        <span className="text-[0.6875rem] text-muted-foreground">n={n.toLocaleString()}</span>
      </span>
    </div>
  );
}
