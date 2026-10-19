import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/**
 * Seobot logo system — one mark, one wordmark, three sizes of lockup.
 *
 * Concept: "from origin to signal," drawn as a physical thing. The mark is
 * the climb as a folded ribbon in axonometric view — flat faces, no tile:
 * the dark mouth (origin) opens into the first rise, the ribbon folds once
 * (the honest slip), the light lands on the fold, and it commits to the lit
 * summit (signal). Four flat tones of signal green; no gradient in the mark.
 *
 * Pass 3 (Oct 2026, `docs/brand-research.md` §6): the chart-line glyph was
 * retired. The form was explored as a 3D solid in Blender, then rebuilt as
 * flat vector faces for production — three candidates became one fold.
 *
 * Usage rules (full guidance in `docs/copy-style.md` + the Brand view):
 * - The wordmark is always lowercase, Geist Black (900), tracking-tighter.
 *   Never "SeoBot" or "SEO Bot".
 * - The wordmark's period is the signal dot: green means shipped, fixed, or
 *   working — the mark shows the climb, the dot marks the moment.
 * - `tone="mono"` is the one-color silhouette; it is also the reversed build
 *   for dark and low-fidelity surfaces.
 * - Clear space = ½ × mark height on every side. Never recolor, stretch,
 *   rotate, or add effects.
 */

export type LogoSize = "sm" | "md" | "lg" | "xl" | "2xl";

export type LogoTone = "brand" | "mono";

/** Mark heights; width follows the 35.7:33.6 drawing ratio. */
const markHeights: Record<LogoSize, string> = {
  sm: "h-4.5",
  md: "h-5",
  lg: "h-6",
  xl: "h-7.5",
  "2xl": "h-10",
};

const wordSizes: Record<LogoSize, string> = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
  xl: "text-2xl",
  "2xl": "text-3xl",
};

const lockupGaps: Record<LogoSize, string> = {
  sm: "gap-2",
  md: "gap-2.5",
  lg: "gap-3",
  xl: "gap-3.5",
  "2xl": "gap-4",
};

/** Display scale for the stacked lockup — one step bolder than the horizontal one. */
const stackWordSizes: Record<LogoSize, string> = {
  sm: "text-2xl",
  md: "text-3xl",
  lg: "text-4xl",
  xl: "text-5xl",
  "2xl": "text-6xl",
};

export function LogoMark({
  size = "md",
  tone = "brand",
  className,
  ...props
}: { size?: LogoSize; tone?: LogoTone } & ComponentProps<"div">) {
  return (
    <div data-slot="logo-mark" data-tone={tone} className="shrink-0" {...props}>
      <svg
        viewBox="0 0 35.7 33.6"
        fill="none"
        aria-hidden
        className={cn("w-auto", markHeights[size], className)}
      >
        {tone === "brand" ? (
          <>
            {/* Top surface — the climb, from mouth to summit. */}
            <path
              d="M 10.6 30.8 L 22.03 19.83 Q 22.9 19 24.1 19 L 27.2 19 Q 28.4 19 29.06 18 L 35.7 8 L 25.1 0 L 17.8 11 L 12.3 11 L 0 22.8 Z"
              className="fill-brand-500"
            />
            {/* Lit summit — everything past the fold, where the signal lands. */}
            <path
              d="M 22.9 19 L 27.2 19 Q 28.4 19 29.06 18 L 35.7 8 L 25.1 0 L 17.8 11 L 12.3 11 Z"
              className="fill-brand-300"
            />
            {/* Tip cap — the cut at the summit. */}
            <path
              d="M 35.7 8 L 35.7 10.8 L 25.1 2.8 L 25.1 0 Z"
              className="fill-brand-600"
            />
            {/* Origin mouth — where every audit starts. */}
            <path
              d="M 10.6 30.8 L 10.6 33.6 L 0 25.6 L 0 22.8 Z"
              className="fill-brand-900"
            />
            {/* Front band — the ribbon's edge, catching the least light. */}
            <path
              d="M 10.6 30.8 L 22.03 19.83 Q 22.9 19 24.1 19 L 27.2 19 Q 28.4 19 29.06 18 L 35.7 8 L 35.7 10.8 L 29.06 20.8 Q 28.4 21.8 27.2 21.8 L 24.1 21.8 Q 22.9 21.8 22.03 22.63 L 10.6 33.6 Z"
              className="fill-brand-700"
            />
          </>
        ) : (
          <path
            d="M 25.1 0 L 35.7 8 L 35.7 10.8 L 28.4 21.8 L 22.9 21.8 L 10.6 33.6 L 0 25.6 L 0 22.8 L 12.3 11 L 17.8 11 Z"
            className="fill-current"
          />
        )}
      </svg>
    </div>
  );
}

export function LogoWordmark({
  size = "md",
  dot = true,
  className,
  ...props
}: { size?: LogoSize; dot?: boolean } & ComponentProps<"span">) {
  return (
    <span
      data-slot="logo-wordmark"
      className={cn(
        "font-black leading-none tracking-tighter",
        wordSizes[size],
        className,
      )}
      {...props}
    >
      seobot
      {dot && (
        <span
          aria-hidden
          className="ml-[0.04em] inline-block size-[0.13em] rounded-full bg-brand-500 dark:bg-brand-400"
        />
      )}
    </span>
  );
}

/** Horizontal lockup — the default identity, used in nav, footer, and app chrome. */
export function Logo({
  size = "md",
  tone = "brand",
  dot = true,
  className,
  ...props
}: { size?: LogoSize; tone?: LogoTone; dot?: boolean } & ComponentProps<"div">) {
  return (
    <div
      data-slot="logo"
      className={cn("flex items-center", lockupGaps[size], className)}
      {...props}
    >
      <LogoMark size={size} tone={tone} />
      <LogoWordmark size={size} dot={dot} />
    </div>
  );
}

/** Stacked lockup — splash screens, social cards, campaigns, merch. */
export function LogoStack({
  size = "md",
  tagline,
  className,
  ...props
}: {
  size?: LogoSize;
  /** Optional one-line descriptor set under the wordmark. */
  tagline?: string;
} & ComponentProps<"div">) {
  return (
    <div
      data-slot="logo-stack"
      className={cn("flex flex-col items-start gap-4", className)}
      {...props}
    >
      <LogoMark size={size} />
      <div className="flex flex-col gap-2">
        <LogoWordmark size={size} className={stackWordSizes[size]} />
        {tagline && (
          <p className="text-sm font-medium tracking-wide text-muted-foreground">
            {tagline}
          </p>
        )}
      </div>
    </div>
  );
}
