import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ComponentProps, ComponentType } from "react";
import { cn } from "@/lib/cn";

const alertVariants = cva("relative flex gap-3 rounded-xl border p-4 text-sm", {
  variants: {
    variant: {
      neutral: "border-border bg-muted text-foreground",
      info: "border-info/25 bg-info-soft text-info-soft-foreground",
      success: "border-success/25 bg-success-soft text-success-soft-foreground",
      warning: "border-warning/35 bg-warning-soft text-warning-soft-foreground",
      danger: "border-destructive/25 bg-destructive-soft text-destructive-soft-foreground",
    },
  },
  defaultVariants: {
    variant: "info",
  },
});

const defaultIcons: Record<string, ComponentType<{ className?: string }>> = {
  neutral: Info,
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
};

export interface AlertProps
  extends ComponentProps<"div">,
    VariantProps<typeof alertVariants> {
  /** Override the default variant icon. */
  icon?: ComponentProps<typeof Info>;
}

export function Alert({ className, variant = "info", icon, children, ...props }: AlertProps) {
  const Icon = defaultIcons[variant ?? "info"];
  return (
    <div
      role="alert"
      data-slot="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <span aria-hidden className="mt-px shrink-0">
        {icon ? <Icon {...icon} /> : <Icon className="size-4.5" />}
      </span>
      <div className="grid min-w-0 flex-1 gap-1">{children}</div>
    </div>
  );
}

export function AlertTitle({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("font-medium leading-snug tracking-tight", className)}
      {...props}
    />
  );
}

export function AlertDescription({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-sm leading-relaxed opacity-90", className)}
      {...props}
    />
  );
}
