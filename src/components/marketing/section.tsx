import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Vertical rhythm wrapper for marketing page sections. */
export function Section({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      data-slot="section"
      className={cn("scroll-mt-20 py-20 sm:py-28", className)}
      {...props}
    />
  );
}

export interface SectionHeaderProps extends Omit<ComponentProps<"div">, "title"> {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "center" | "start";
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
  className,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      data-slot="section-header"
      className={cn(
        "flex max-w-3xl flex-col gap-5",
        align === "center" ? "mx-auto items-center text-center" : "items-start",
        className,
      )}
      {...props}
    >
      {eyebrow && (
        <span className="text-sm font-semibold tracking-tight text-primary-soft-foreground">
          {eyebrow}
        </span>
      )}
      <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
          {description}
        </p>
      )}
    </div>
  );
}
