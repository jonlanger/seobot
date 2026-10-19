import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const badgeVariants = cva(
  [
    "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden",
    "whitespace-nowrap rounded-full font-medium",
    "[&_svg:not([class*='size-'])]:size-3.5",
  ],
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground",
        outline: "border border-border text-foreground",
        primary: "bg-primary-soft text-primary-soft-foreground",
        success: "bg-success-soft text-success-soft-foreground",
        warning: "bg-warning-soft text-warning-soft-foreground",
        danger: "bg-destructive-soft text-destructive-soft-foreground",
        info: "bg-info-soft text-info-soft-foreground",
      },
      size: {
        sm: "h-5.5 px-2 text-[0.6875rem] leading-none",
        md: "h-6 px-2.5 text-xs leading-none",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "md",
    },
  },
);

export interface BadgeProps
  extends ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  /** Render a small leading status dot. */
  dot?: boolean;
  /** Render as child element (Radix Slot pattern). */
  asChild?: boolean;
}

export function Badge({ className, variant, size, dot = false, asChild = false, children, ...props }: BadgeProps) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {dot && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />}
      {children}
    </Comp>
  );
}
