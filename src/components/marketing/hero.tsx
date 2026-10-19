import { LayoutDashboard, SearchCheck } from "lucide-react";
import type { MouseEvent } from "react";
import { buttonVariants } from "@/components/ui";
import { BlockRateFloor } from "@/components/marketing/block-rate-floor";
import { home } from "@/content/home";
import { demoHref } from "@/lib/demo-links";

export function Hero({ onRunSeoCheck, onOpenDashboard }: { onRunSeoCheck?: () => void; onOpenDashboard?: () => void }) {
  const { headline, subhead, primaryCta, secondaryCta } = home.hero;

  const handlePrimaryClick = onOpenDashboard
    ? (event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        onOpenDashboard();
      }
    : undefined;

  const handleSecondaryClick = onRunSeoCheck
    ? (event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        onRunSeoCheck();
      }
    : undefined;

  return (
    <section className="relative min-h-[34rem] sm:min-h-[42rem]">
      {/* Aurora — slow-drifting color fields behind the headline. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute left-1/2 top-[-16rem] h-[34rem] w-[46rem] -translate-x-[30%] rounded-full bg-brand-500/15 blur-3xl motion-safe:animate-drift" />
        <div className="absolute left-1/2 top-[-9rem] h-[30rem] w-[40rem] -translate-x-[72%] rounded-full bg-chart-2/12 blur-3xl motion-safe:animate-drift [animation-delay:-13s] [animation-duration:32s]" />
      </div>

      {/* Crawler × Vertical block-rate bars (3D) — full-bleed behind the hero copy. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-45 lg:opacity-100"
      >
        <BlockRateFloor className="h-full w-full" />
        {/* Dissolve into the next section. */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Readability veil on the left so the copy stays legible. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent"
      />

      <div className="container relative z-10 flex flex-col items-start gap-7 py-20 text-left sm:py-28">
        <h1 className="max-w-2xl text-balance text-display-md font-black motion-safe:animate-rise-in sm:text-display-lg lg:text-display-xl">
          {headline}
        </h1>

        <p className="max-w-xl text-pretty text-xl leading-relaxed text-muted-foreground motion-safe:animate-rise-in [animation-delay:80ms] sm:text-2xl">
          {subhead}
        </p>

        <div className="flex flex-col gap-3 pt-3 motion-safe:animate-rise-in [animation-delay:160ms] sm:flex-row">
          {primaryCta && (
            <a
              href={demoHref(primaryCta.href)}
              onClick={handlePrimaryClick}
              className={buttonVariants({ size: "xl", className: "rounded-xl" })}
            >
              <LayoutDashboard className="size-4.5" />
              {primaryCta.label}
            </a>
          )}
          {secondaryCta && (
            <a
              href={secondaryCta.href}
              onClick={handleSecondaryClick}
              className={buttonVariants({
                variant: "secondary",
                size: "xl",
                className: "rounded-xl",
              })}
            >
              <SearchCheck className="size-4.5" />
              {secondaryCta.label}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}