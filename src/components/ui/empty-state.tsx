import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps extends ComponentProps<"div"> {
  /** Icon or illustration shown above the title. */
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  /** Primary call to action. */
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-center",
        className,
      )}
      {...props}
    >
      {icon && (
        <div className="mb-2 grid size-11 place-items-center rounded-full bg-muted text-muted-foreground [&_svg:not([class*='size-'])]:size-5">
          {icon}
        </div>
      )}
      <div className="text-sm font-medium tracking-tight">{title}</div>
      {description && (
        <div className="max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</div>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
