import { useState } from "react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
  xl: "size-16 text-xl",
};

const statusClasses = {
  online: "bg-success",
  away: "bg-warning",
  busy: "bg-destructive",
  offline: "bg-muted-foreground",
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export interface AvatarProps extends Omit<ComponentProps<"span">, "children"> {
  src?: string;
  alt?: string;
  /** Used for the fallback initials and the accessible label. */
  name: string;
  size?: keyof typeof sizeClasses;
  status?: keyof typeof statusClasses;
}

export function Avatar({
  src,
  alt,
  name,
  size = "md",
  status,
  className,
  ...props
}: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <span
      data-slot="avatar"
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center rounded-full bg-muted font-medium text-muted-foreground ring-2 ring-surface",
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt ?? name}
          onError={() => setFailed(true)}
          className="size-full rounded-full object-cover"
        />
      ) : (
        <>
          <span aria-hidden>{getInitials(name)}</span>
          <span className="sr-only">{name}</span>
        </>
      )}
      {status && (
        <span
          aria-hidden
          className={cn(
            "absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-surface",
            statusClasses[status],
          )}
        />
      )}
    </span>
  );
}

/** Overlaps avatars into a stacked group. */
export function AvatarGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn("flex items-center -space-x-3", className)}
      {...props}
    />
  );
}
