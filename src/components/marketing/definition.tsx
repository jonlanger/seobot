import { home } from "@/content/home";

/**
 * Definition-first band — directly under the hero, before any other section.
 *
 * The question-shaped H2 matches how people (and AI engines) ask, and the
 * paragraph below it is written to survive alone as an extracted answer
 * (docs/geo-research.md §10.1). Do not move other sections above it.
 */
export function Definition() {
  return (
    <section id="what-is-seobot" className="border-t border-border bg-muted/40">
      <div className="container flex flex-col items-start gap-6 py-16 text-left sm:py-20">
        <h2 className="text-display-sm font-extrabold">What is Seobot?</h2>
        <p className="max-w-4xl text-pretty text-xl font-medium leading-relaxed text-muted-foreground sm:text-2xl">
          {home.definition}
        </p>
      </div>
    </section>
  );
}
