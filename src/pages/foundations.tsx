import { Seo } from "@/components/seo";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* ---------------------------------- Data ---------------------------------- */

const brandSwatches = [
  { step: 50, className: "bg-brand-50" },
  { step: 100, className: "bg-brand-100" },
  { step: 200, className: "bg-brand-200" },
  { step: 300, className: "bg-brand-300" },
  { step: 400, className: "bg-brand-400" },
  { step: 500, className: "bg-brand-500" },
  { step: 600, className: "bg-brand-600" },
  { step: 700, className: "bg-brand-700" },
  { step: 800, className: "bg-brand-800" },
  { step: 900, className: "bg-brand-900" },
  { step: 950, className: "bg-brand-950" },
];

const semanticPairs = [
  { name: "background / foreground", bg: "bg-background", fg: "text-foreground", ratio: "18.3:1" },
  { name: "surface / surface-foreground", bg: "bg-surface", fg: "text-surface-foreground", ratio: "18.6:1" },
  { name: "muted / muted-foreground", bg: "bg-muted", fg: "text-muted-foreground", ratio: "5.7:1" },
  { name: "accent / accent-foreground", bg: "bg-accent", fg: "text-accent-foreground", ratio: "13.7:1" },
  { name: "primary / primary-foreground", bg: "bg-primary", fg: "text-primary-foreground", ratio: "5.0:1" },
  { name: "primary-soft / …-foreground", bg: "bg-primary-soft", fg: "text-primary-soft-foreground", ratio: "6.6:1" },
  { name: "destructive / …-foreground", bg: "bg-destructive", fg: "text-destructive-foreground", ratio: "5.1:1" },
  { name: "destructive-soft / …-foreground", bg: "bg-destructive-soft", fg: "text-destructive-soft-foreground", ratio: "6.4:1" },
  { name: "success / success-foreground", bg: "bg-success", fg: "text-success-foreground", ratio: "4.5:1" },
  { name: "success-soft / …-foreground", bg: "bg-success-soft", fg: "text-success-soft-foreground", ratio: "6.6:1" },
  { name: "warning / warning-foreground", bg: "bg-warning", fg: "text-warning-foreground", ratio: "6.0:1" },
  { name: "warning-soft / …-foreground", bg: "bg-warning-soft", fg: "text-warning-soft-foreground", ratio: "6.3:1" },
  { name: "info / info-foreground", bg: "bg-info", fg: "text-info-foreground", ratio: "4.7:1" },
  { name: "info-soft / …-foreground", bg: "bg-info-soft", fg: "text-info-soft-foreground", ratio: "6.0:1" },
];

const chartSwatches = [
  { name: "chart-1", className: "bg-chart-1" },
  { name: "chart-2", className: "bg-chart-2" },
  { name: "chart-3", className: "bg-chart-3" },
  { name: "chart-4", className: "bg-chart-4" },
  { name: "chart-5", className: "bg-chart-5" },
  { name: "chart-6", className: "bg-chart-6" },
  { name: "chart-7", className: "bg-chart-7" },
  { name: "chart-8", className: "bg-chart-8" },
];

const sequentialSteps = [
  { name: "seq-1", className: "bg-seq-1" },
  { name: "seq-2", className: "bg-seq-2" },
  { name: "seq-3", className: "bg-seq-3" },
  { name: "seq-4", className: "bg-seq-4" },
  { name: "seq-5", className: "bg-seq-5" },
  { name: "seq-6", className: "bg-seq-6" },
  { name: "seq-7", className: "bg-seq-7" },
  { name: "seq-8", className: "bg-seq-8" },
];

const typeScale = [
  { label: "Display XL", cls: "text-display-xl font-black", sample: "Make the number go up.", spec: "clamp 64→108px · 900 · −5%" },
  { label: "Display LG", cls: "text-display-lg font-black", sample: "Find out what to fix first.", spec: "clamp 52→76px · 900 · −5%" },
  { label: "Display MD", cls: "text-display-md font-extrabold", sample: "Every issue, ranked by impact.", spec: "clamp 40→56px · 800 · −5%" },
  { label: "Display SM", cls: "text-display-sm font-extrabold", sample: "See your site as GPTBot sees it.", spec: "clamp 30→40px · 800 · −5%" },
  { label: "Title", cls: "text-5xl font-semibold tracking-tight", sample: "Grow traffic", spec: "text-5xl · 48px · semibold" },
  { label: "Heading 1", cls: "text-4xl font-semibold tracking-tight", sample: "One platform for SEO", spec: "text-4xl · 36px · semibold" },
  { label: "Heading 2", cls: "text-3xl font-semibold tracking-tight", sample: "Rankings you can trust", spec: "text-3xl · 30px · semibold" },
  { label: "Heading 3", cls: "text-2xl font-semibold tracking-tight", sample: "Organic clicks", spec: "text-2xl · 24px · semibold" },
  { label: "Heading 4", cls: "text-xl font-semibold", sample: "Top keywords", spec: "text-xl · 20px · semibold" },
  { label: "Body large", cls: "text-lg", sample: "Seobot audits your site every week.", spec: "text-lg · 18px · regular" },
  { label: "Body", cls: "text-base", sample: "Briefs grounded in the live SERP.", spec: "text-base · 16px · regular" },
  { label: "Small", cls: "text-sm", sample: "Rankings updated 2 hours ago", spec: "text-sm · 14px · regular" },
  { label: "Caption", cls: "text-xs", sample: "vs last 30 days", spec: "text-xs · 12px · regular" },
  { label: "Mono", cls: "font-mono text-sm", sample: "npm run check:contrast", spec: "Geist Mono · 14px" },
  { label: "Data numerics", cls: "numeric font-mono text-2xl font-medium", sample: "1,284,309 · 47% · 2.4×", spec: "Geist Mono · tabular · data role" },
];

const spacingSteps = [
  { token: "1", width: "w-1", px: "4px" },
  { token: "2", width: "w-2", px: "8px" },
  { token: "3", width: "w-3", px: "12px" },
  { token: "4", width: "w-4", px: "16px" },
  { token: "6", width: "w-6", px: "24px" },
  { token: "8", width: "w-8", px: "32px" },
  { token: "12", width: "w-12", px: "48px" },
  { token: "16", width: "w-16", px: "64px" },
];

const radiusSteps = [
  { name: "xs", cls: "rounded-xs" },
  { name: "sm", cls: "rounded-sm" },
  { name: "md", cls: "rounded-md" },
  { name: "lg", cls: "rounded-lg" },
  { name: "xl", cls: "rounded-xl" },
  { name: "2xl", cls: "rounded-2xl" },
  { name: "3xl", cls: "rounded-3xl" },
  { name: "full", cls: "rounded-full" },
];

const shadowSteps = [
  { name: "shadow-2xs", cls: "shadow-2xs" },
  { name: "shadow-xs", cls: "shadow-xs" },
  { name: "shadow-sm", cls: "shadow-sm" },
  { name: "shadow-md", cls: "shadow-md" },
  { name: "shadow-lg", cls: "shadow-lg" },
  { name: "shadow-xl", cls: "shadow-xl" },
];

const motionTokens = [
  "--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)",
  "--animate-fade-in: 250ms ease-out",
  "--animate-rise-in: 550ms expo",
  "--animate-dialog-in: 200ms expo",
  "--animate-dialog-backdrop-in: 200ms ease-out",
  "--animate-toast-in: 300ms expo",
];

/* --------------------------------- Layout --------------------------------- */

function SubSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-6">
      <div className="grid max-w-2xl gap-1.5">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function FoundationsPage() {
  return (
    <>
    <Seo title="Foundations — Seobot design system" description="Seobot design tokens: color ramps, type scale, chart palettes, and shadows — the internal reference." path="/design/foundations" robots="noindex" />
    <div className="container max-w-5xl py-12 pb-36">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold text-primary-soft-foreground">Design system</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Foundations</h1>
        <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
          Tokens live in{" "}
          <code className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
            src/styles/globals.css
          </code>{" "}
          as CSS variables, mapped into Tailwind utilities. Components only consume
          the semantic layer — dark mode swaps the variables, never the markup. All
          text pairings below are machine-verified with{" "}
          <code className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
            npm run check:contrast
          </code>
          .
        </p>
      </header>

      <div className="mt-14 grid gap-16">
        <SubSection
          title="Brand palette"
          description="The raw scale. Never used directly in components — semantic tokens are built from it. Hue is tuned to a green-teal ('signal green') that reads as growth without shouting."
        >
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-11">
            {brandSwatches.map((swatch) => (
              <div key={swatch.step} className="grid gap-2">
                <div
                  className={cn(
                    "h-14 rounded-lg border border-border/60",
                    swatch.className,
                  )}
                />
                <div className="text-center font-mono text-[11px] text-muted-foreground">
                  {swatch.step}
                </div>
              </div>
            ))}
          </div>
        </SubSection>

        <SubSection
          title="Semantic colors"
          description="Every pair below passes WCAG 2.2 AA in both themes (ratios shown for light mode). -soft variants are for badges, alerts, and inline highlights."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {semanticPairs.map((pair) => (
              <div key={pair.name} className="overflow-hidden rounded-xl border border-border">
                <div
                  className={cn(
                    "flex h-20 items-center justify-between gap-3 px-4",
                    pair.bg,
                    pair.fg,
                  )}
                >
                  <span className="text-base font-medium">Aa</span>
                  <span className="font-mono text-xs opacity-80">AA · {pair.ratio}</span>
                </div>
                <div className="border-t border-border bg-surface px-3 py-2 font-mono text-[11px] text-muted-foreground">
                  {pair.name}
                </div>
              </div>
            ))}
          </div>
        </SubSection>

        <SubSection
          title="Data visualization"
          description="Eight categorical chart colors, each checked at ≥ 3:1 against the page background in both themes, plus a brand-derived sequential ramp for heatmaps, treemaps, and intensity encodings. Ramp direction flips in dark mode; the strongest step always clears 3:1."
        >
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {chartSwatches.map((swatch) => (
              <div key={swatch.name} className="grid gap-2">
                <div className={cn("h-16 rounded-lg border border-border/60", swatch.className)} />
                <div className="text-center font-mono text-[11px] text-muted-foreground">
                  {swatch.name}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-2">
            <div className="grid grid-cols-8 overflow-hidden rounded-lg border border-border/60">
              {sequentialSteps.map((step) => (
                <div key={step.name} className={cn("h-12", step.className)} />
              ))}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground">
              seq-1 (low) → seq-8 (high) · brand-derived · dark mode runs the ramp reversed
            </div>
          </div>
        </SubSection>

        <SubSection
          title="Typography"
          description="The four type roles from src/content/brand.ts: Brand display (900 · −5% tracking), Headings (600 · tracking-tight), Body & UI (400–500), Data & code (Geist Mono · tabular figures). Display sizes are fluid — the brand's big-type mandate without breakpoint juggling."
        >
          <div className="rounded-xl border border-border bg-surface px-6">
            {typeScale.map((row) => (
              <div
                key={row.label}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-border py-5 last:border-b-0"
              >
                <span className={cn("min-w-0 text-ellipsis", row.cls)}>{row.sample}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {row.label} — {row.spec}
                </span>
              </div>
            ))}
          </div>
        </SubSection>

        <SubSection
          title="Spacing"
          description="Tailwind's 4px base unit, used consistently for padding, gaps, and layout rhythm."
        >
          <div className="grid gap-3 rounded-xl border border-border bg-surface p-6">
            {spacingSteps.map((step) => (
              <div key={step.token} className="flex items-center gap-4">
                <span className="w-24 shrink-0 font-mono text-[11px] text-muted-foreground">
                  space-{step.token} · {step.px}
                </span>
                <div className={cn("h-2 rounded-full bg-primary", step.width)} />
              </div>
            ))}
          </div>
        </SubSection>

        <SubSection
          title="Radius"
          description="Controls use rounded-lg / rounded-md; cards and panels use rounded-xl / rounded-2xl; badges are fully rounded."
        >
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {radiusSteps.map((step) => (
              <div key={step.name} className="grid gap-2">
                <div className={cn("h-16 border border-border bg-muted", step.cls)} />
                <div className="text-center font-mono text-[11px] text-muted-foreground">
                  {step.name}
                </div>
              </div>
            ))}
          </div>
        </SubSection>

        <SubSection
          title="Elevation"
          description="Soft, layered, low-opacity shadows. Dark mode leans on borders and surface lightness instead."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {shadowSteps.map((step) => (
              <div key={step.name} className="grid gap-3">
                <div
                  className={cn(
                    "grid h-20 place-items-center rounded-xl border border-border/60 bg-surface",
                    step.cls,
                  )}
                >
                  <span className="font-mono text-[10px] text-muted-foreground">Aa</span>
                </div>
                <div className="text-center font-mono text-[11px] text-muted-foreground">
                  {step.name}
                </div>
              </div>
            ))}
          </div>
        </SubSection>

        <SubSection
          title="Motion"
          description="One shared easing for entrances (ease-out-expo) and short durations. Motion is subtle and always in service of orientation."
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <div className="rounded-xl border border-border bg-surface p-5">
              <ul className="grid gap-2.5">
                {motionTokens.map((token) => (
                  <li key={token} className="font-mono text-xs text-muted-foreground">
                    {token}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="grid h-full min-h-24 animate-rise-in place-items-center rounded-xl border border-border bg-surface"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  <span className="text-xs text-muted-foreground">rise-in</span>
                </div>
              ))}
            </div>
          </div>
        </SubSection>
      </div>
    </div>
    </>
  );
}
