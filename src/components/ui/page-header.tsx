import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface PageHeaderProps extends Omit<ComponentProps<"header">, "title"> {
  /** Small label above the title (section or study name). */
  eyebrow?: ReactNode;
  /** The page's single `h1`. */
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned controls (buttons, filters) that wrap below on narrow screens. */
  actions?: ReactNode;
}

/**
 * The big, bold title block that opens every app page. Uses the display scale
 * (`text-display-sm`, `md:text-display-md`, 800) so page titles clearly outrank section (`h2`) and
 * card titles; render exactly one per page.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header
      data-slot="page-header"
      className={cn("flex flex-wrap items-end justify-between gap-x-8 gap-y-4", className)}
      {...props}
    >
      <div className="grid min-w-0 max-w-3xl gap-2">
        {eyebrow && (
          <p className="text-sm font-semibold text-primary-soft-foreground">{eyebrow}</p>
        )}
        <h1 className="text-display-sm font-extrabold text-balance md:text-display-md">{title}</h1>
        {description && (
          <p className="text-base leading-relaxed text-pretty text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
