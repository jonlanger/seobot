import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Card, CardContent, Sparkline, type ChartColor } from "@/components/ui";
import { cn } from "@/lib/cn";

const deltaTones = {
  positive: "text-success-soft-foreground",
  negative: "text-destructive-soft-foreground",
  neutral: "text-muted-foreground",
};

export interface StatCardProps extends ComponentProps<"div"> {
  label: string;
  value: ReactNode;
  /** Small muted suffix rendered after the value (e.g. "/ 100"). */
  valueSuffix?: ReactNode;
  icon?: ReactNode;
  /** Change indicator text, e.g. "12.4%". */
  delta?: string;
  deltaDirection?: "up" | "down";
  deltaTone?: keyof typeof deltaTones;
  /** Muted text after the delta (e.g. "vs last 30 days"). */
  deltaLabel?: string;
  /** Mini trend line at the bottom of the card. */
  sparkData?: number[];
  sparkColor?: ChartColor;
}

export function StatCard({
  label,
  value,
  valueSuffix,
  icon,
  delta,
  deltaDirection = "up",
  deltaTone = "positive",
  deltaLabel,
  sparkData,
  sparkColor = "chart-1",
  className,
  ...props
}: StatCardProps) {
  const DeltaIcon = deltaDirection === "up" ? ArrowUpRight : ArrowDownRight;

  return (
    <Card
      data-slot="stat-card"
      className={cn("gap-4 py-5", className)}
      {...props}
    >
      <CardContent className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="numeric font-mono text-2xl font-medium">
            {value}
            {valueSuffix && (
              <span className="text-base font-normal text-muted-foreground">{valueSuffix}</span>
            )}
          </div>
        </div>
        {icon && (
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground [&_svg:not([class*='size-'])]:size-4.5">
            {icon}
          </div>
        )}
      </CardContent>

      {(delta || sparkData) && (
        <CardContent className="mt-auto flex items-center justify-between gap-4">
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-sm font-medium tabular-nums",
                deltaTones[deltaTone],
              )}
            >
              <DeltaIcon aria-hidden className="size-4" />
              {delta}
              {deltaLabel && (
                <span className="ml-1 font-normal text-muted-foreground">{deltaLabel}</span>
              )}
            </span>
          )}
          {sparkData && (
            <Sparkline
              data={sparkData}
              color={sparkColor}
              className="h-8 w-24 shrink-0"
            />
          )}
        </CardContent>
      )}
    </Card>
  );
}
