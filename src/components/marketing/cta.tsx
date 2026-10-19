import { ArrowUp, SearchCheck } from "lucide-react";
import type { MouseEvent } from "react";
import { buttonVariants } from "@/components/ui";
import { Section } from "@/components/marketing/section";
import { home } from "@/content/home";
import { demoHref } from "@/lib/demo-links";

export function Cta({ onRunSeoCheck }: { onRunSeoCheck?: () => void }) {
  const { headline, subhead, primary, secondary, note } = home.finalCta;

  const handleCheckClick = onRunSeoCheck
    ? (event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        onRunSeoCheck();
      }
    : undefined;

  return (
    <Section className="border-t border-border">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface px-6 py-20 text-center shadow-sm sm:px-16 sm:py-28">
          <div aria-hidden className="absolute inset-0 bg-grid mask-fade-edges opacity-80" />
          <div
            aria-hidden
            className="absolute -top-28 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-brand-500/15 blur-3xl motion-safe:animate-drift"
          />

          <div className="relative flex flex-col items-center gap-7">
            {/* Splash moment — the flagship line at the display scale. */}
            <h2 className="max-w-3xl text-balance text-display-sm font-black sm:text-display-md">
              {headline}
            </h2>
            <p className="max-w-2xl text-pretty text-xl leading-relaxed text-muted-foreground">
              {subhead}
            </p>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <a
                href={demoHref(primary.href)}
                onClick={handleCheckClick}
                className={buttonVariants({ size: "xl", className: "rounded-xl" })}
              >
                <SearchCheck className="size-4.5" />
                {primary.label}
              </a>
              {secondary && (
                <a
                  href={secondary.href}
                  className={buttonVariants({
                    variant: "secondary",
                    size: "xl",
                    className: "rounded-xl",
                  })}
                >
                  <ArrowUp className="size-4.5" />
                  {secondary.label}
                </a>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{note}</p>
          </div>
        </div>
      </div>
    </Section>
  );
}
