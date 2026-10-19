import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/cn";
import { home } from "@/content/home";

/**
 * Crawler coverage strip — the crawlers the study measures. Replaces the
 * generic customer-logo cloud: the claim *is* the product (docs/content-models.md §2).
 *
 * Rendered as a slow ambient marquee. The list is duplicated for a seamless
 * loop and the second copy is aria-hidden; `prefers-reduced-motion` collapses
 * the animation to a static row (globals.css). Because the loop runs longer
 * than five seconds it ships a real pause control (WCAG 2.2.2) — hidden when
 * reduced motion already made the strip static.
 */
export function Coverage({ className }: { className?: string }) {
  const { caption, items } = home.coverage;
  const [paused, setPaused] = useState(false);

  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-center gap-6 pr-6 text-base font-semibold tracking-tight whitespace-nowrap text-muted-foreground"
        >
          {item}
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary/60" />
        </li>
      ))}
    </ul>
  );

  return (
    <section className={cn("border-t border-border bg-muted/40 py-16 sm:py-20", className)}>
      <div className="container flex flex-col items-start gap-4">
        <span className="text-sm font-semibold tracking-tight text-primary-soft-foreground">
          {caption}
        </span>
        <h2 className="text-left text-display-md font-black sm:text-display-lg">
          {items.length} crawlers
        </h2>
        <p className="max-w-xl text-pretty text-xl leading-relaxed text-muted-foreground">
          measured in the Seobot study: robots.txt policy and raw-HTML access, site by site.
        </p>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-pressed={paused}
            aria-label={paused ? "Play coverage animation" : "Pause coverage animation"}
            className="hidden size-7 shrink-0 place-items-center rounded-full border border-border bg-surface text-muted-foreground shadow-xs transition-colors hover:text-foreground focus-ring motion-safe:grid"
          >
            {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
          </button>
        </div>
      </div>
      <div className="mask-fade-x mt-8 overflow-hidden">
        <div
          className="flex w-max motion-safe:animate-marquee hover:[animation-play-state:paused]"
          style={paused ? { animationPlayState: "paused" } : undefined}
        >
          {row(false)}
          {row(true)}
        </div>
      </div>
    </section>
  );
}
