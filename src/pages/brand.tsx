import { Seo } from "@/components/seo";
import { Check, X } from "lucide-react";
import type { ReactNode } from "react";
import { Logo, LogoMark, LogoStack, LogoWordmark } from "@/components/logo";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  boilerplate,
  brandAssets,
  colorRules,
  copyPatterns,
  taglines,
  toneMatrix,
  typeRoles,
  voiceOneLiner,
  voicePrinciples,
  wordsAvoid,
  wordsUse,
} from "@/content/brand";

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

const lockupSizes = [
  { size: "sm" as const, label: "sm — in-app chrome, dense tables" },
  { size: "md" as const, label: "md — nav, footer (default)" },
  { size: "lg" as const, label: "lg — marketing headers" },
  { size: "xl" as const, label: "xl — section hero, decks" },
];

const markSizes = ["sm", "md", "lg", "xl", "2xl"] as const;

export function BrandPage() {
  return (
    <>
    <Seo title="Brand guidelines — Seobot design system" description="Seobot logo system, voice principles, tone matrix, and copy patterns — the internal brand reference." path="/design/brand" robots="noindex" />
    <div className="container max-w-5xl py-12 pb-36">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold text-primary-soft-foreground">Design system</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Brand</h1>
        <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
          The identity layer: one mark, one wordmark, one voice. Logos come from{" "}
          <code className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
            @/components/logo
          </code>
          {"; the rules below are data in "}
          <code className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
            @/content/brand
          </code>
          {", so pages and tooling read the same source. Full prose: "}
          <code className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
            docs/copy-style.md
          </code>
          {"."}
        </p>
      </header>

      <div className="mt-14 grid gap-16">
        {/* ------------------------------ Wordmark ------------------------------ */}
        <SubSection
          title="The wordmark"
          description="Lowercase, Geist Black (900), tracking -5%. The period is the signal dot — green means shipped, fixed, or working. Never 'SeoBot', never 'SEO Bot'."
        >
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="flex items-center justify-center bg-grid px-6 py-16">
              <LogoWordmark className="text-6xl sm:text-8xl" />
            </div>
            <div className="border-t border-border px-5 py-3 font-mono text-[11px] text-muted-foreground">
              Geist · 900 · tracking-tighter · the dot is brand-500 (brand-400 in dark)
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {lockupSizes.map((row) => (
              <div key={row.size} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-5 py-4">
                <Logo size={row.size} />
                <span className="text-right font-mono text-[11px] text-muted-foreground">
                  {row.label}
                </span>
              </div>
            ))}
          </div>
        </SubSection>

        {/* -------------------------------- Mark -------------------------------- */}
        <SubSection
          title="The mark"
          description="'From origin to signal' — drawn as a physical thing. The mark is the climb as a folded ribbon in axonometric view, flat faces only: the dark mouth opens the first rise, the ribbon folds once (the honest slip) where the light lands, then commits to the lit summit. Four discrete tones of signal green — no tile, no chart line, no gradient anywhere in the form."
        >
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <div className="flex items-center justify-center rounded-xl border border-border bg-surface py-12">
              <LogoMark size="2xl" className="h-16" />
            </div>
            <div className="rounded-xl border border-border bg-surface p-6">
              <ul className="grid gap-4 text-sm leading-relaxed">
                <li className="flex gap-3">
                  <span className="mt-1.5 size-2.5 shrink-0 rounded-xs bg-brand-900" aria-hidden />
                  <span>
                    <strong className="font-semibold">Origin mouth</strong> — every audit starts
                    at the dark end of the ribbon: small, solid, square-cut.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2.5 w-5 shrink-0 rounded-full border-t-2 border-foreground/70" aria-hidden />
                  <span>
                    <strong className="font-semibold">The fold</strong> — first push, one honest
                    slip, then commit. It is where the light breaks across the climb.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 size-2.5 shrink-0 rounded-full bg-brand-300" aria-hidden />
                  <span>
                    <strong className="font-semibold">Lit summit</strong> — the signal, in the
                    brightest tone of the logo. The wordmark's green period makes the same promise.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid place-items-center gap-3 rounded-xl border border-border bg-surface p-6">
              <LogoMark size="xl" />
              <span className="font-mono text-[11px] text-muted-foreground">brand (default)</span>
            </div>
            <div className="grid place-items-center gap-3 rounded-xl border border-border bg-background p-6 text-foreground">
              <LogoMark size="xl" tone="mono" />
              <span className="font-mono text-[11px] text-muted-foreground">mono (one-color)</span>
            </div>
            <div className="grid place-items-center gap-3 rounded-xl bg-brand-950 p-6">
              <Logo size="lg" tone="mono" className="text-brand-50" />
              <span className="font-mono text-[11px] text-brand-200">reversed on brand-950</span>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-x-8 gap-y-4 rounded-xl border border-border bg-surface p-6">
            {markSizes.map((size) => (
              <div key={size} className="grid justify-items-center gap-2">
                <LogoMark size={size} />
                <span className="font-mono text-[11px] text-muted-foreground">{size}</span>
              </div>
            ))}
            <p className="basis-full text-xs leading-relaxed text-muted-foreground">
              Minimum 16px tall — the silhouette still reads as a deliberate fold, not a
              ripple. Mono is the reversed and one-color build; below 12px, use the plain
              favicon.
            </p>
          </div>
        </SubSection>

        {/* ------------------------------ Asset specs ----------------------------- */}
        <SubSection
          title="Lockups, clear space, minimum sizes"
          description="Space is part of the logo. Clear space keeps the mark from colliding with headlines, buttons, and screen edges — it is ½ × mark height on every side, and it is not negotiable."
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <div className="flex flex-col justify-between gap-6 rounded-xl border border-border bg-surface p-6">
              <div className="inline-flex w-fit rounded-2xl border border-dashed border-primary/50 p-5">
                <Logo size="2xl" />
              </div>
              <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                clear space = 20px = ½ × 40px mark (2xl). When space is tight, remove the
                wordmark — never the clear space.
              </p>
            </div>

            <div className="flex flex-col justify-between gap-6 rounded-xl border border-border bg-surface p-6">
              <LogoStack size="md" tagline="Grow organic traffic on autopilot." />
              <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                stacked lockup — splash screens, social cards, merch. Optional tagline
                sits under the wordmark, never above the mark.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium">Asset</th>
                  <th className="px-4 py-3 font-medium">Minimum size</th>
                  <th className="px-4 py-3 font-medium">Use it for</th>
                </tr>
              </thead>
              <tbody>
                {brandAssets.map((asset) => (
                  <tr key={asset.name} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium">{asset.name}</div>
                      <div className="text-xs text-muted-foreground">{asset.description}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top font-mono text-xs text-muted-foreground">
                      {asset.minSize}
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground">{asset.usage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Don't stretch or squash", cls: "[transform:scaleX(1.55)]" },
              { label: "Don't recolor", cls: "[filter:hue-rotate(140deg)_saturate(1.4)]" },
              { label: "Don't rotate or add effects", cls: "rotate-6 drop-shadow-lg" },
            ].map((item) => (
              <div key={item.label} className="overflow-hidden rounded-xl border border-border">
                <div className="grid h-24 place-items-center overflow-hidden bg-muted/40 px-4">
                  <Logo size="md" className={cn(item.cls)} />
                </div>
                <div className="flex items-center gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
                  <X className="size-3.5 shrink-0 text-destructive" aria-hidden />
                  {item.label}
                </div>
              </div>
            ))}
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="grid h-24 place-items-center bg-muted/40 px-4">
                <span className="font-serif text-2xl italic">SeoBot</span>
              </div>
              <div className="flex items-center gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
                <X className="size-3.5 shrink-0 text-destructive" aria-hidden />
                Don't re-typeset or re-case
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <ul className="grid gap-2.5 text-sm leading-relaxed sm:grid-cols-2">
              {[
                "Use the variants as shipped — they scale cleanly from 16px to billboards.",
                "Keep ½ × mark height of clear space on every side.",
                "One logo per surface. No lockup next to a second logo without a divider.",
                "Mono when production only allows one color.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </SubSection>

        {/* -------------------------------- Voice -------------------------------- */}
        <SubSection
          title="Voice"
          description="Voice is constant; tone flexes by surface. Four principles, each with a rewrite you can pattern-match. If a line can't survive a screenshot, rewrite it."
        >
          <p className="max-w-3xl text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            “{voiceOneLiner}”
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            {voicePrinciples.map((principle, index) => (
              <article key={principle.title} className="grid content-start gap-4 rounded-xl border border-border bg-surface p-6">
                <div className="grid gap-1.5">
                  <h3 className="text-base font-semibold tracking-tight">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {principle.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {principle.description}
                  </p>
                </div>
                <div className="grid gap-2 text-sm">
                  <p className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    {principle.does}
                  </p>
                  <p className="flex items-start gap-2.5 text-muted-foreground">
                    <X className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                    {principle.doesnt}
                  </p>
                </div>
                <div className="grid gap-1.5 rounded-lg border border-border bg-muted/40 p-4 text-sm">
                  <p className="text-muted-foreground line-through decoration-destructive/60">
                    {principle.before}
                  </p>
                  <p className="font-medium">{principle.after}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-160 text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium">Surface</th>
                  <th className="px-4 py-3 font-medium">Reader</th>
                  <th className="px-4 py-3 font-medium">Tone</th>
                  <th className="px-4 py-3 font-medium">Sample</th>
                </tr>
              </thead>
              <tbody>
                {toneMatrix.map((row) => (
                  <tr key={row.surface} className="border-b border-border align-top last:border-b-0">
                    <td className="whitespace-nowrap px-4 py-3.5 font-medium">{row.surface}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{row.reader}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-muted-foreground">{row.tone}</td>
                    <td className="px-4 py-3.5">{row.sample}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SubSection>

        {/* ----------------------------- Copy library ----------------------------- */}
        <SubSection
          title="Taglines & copy patterns"
          description="One flagship line, three situational alternatives, and the formulas behind every button, error, and empty state in the product."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {taglines.map((tagline, index) => (
              <div key={tagline.text} className="grid content-start gap-2 rounded-xl border border-border bg-surface p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-lg font-semibold tracking-tight">{tagline.text}</p>
                  {index === 0 && <Badge variant="primary">Flag</Badge>}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{tagline.note}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
            <div className="rounded-xl border border-border bg-surface p-6">
              <h3 className="text-sm font-semibold">CTA samples, in production variants</h3>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button>Start free trial</Button>
                <Button variant="secondary">Book a demo</Button>
                <Button variant="soft">Run site audit</Button>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Verb + object, always. "Start free trial" — not "Get started"; "Run site
                audit" — not "Submit".
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-140 text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left">
                    <th className="px-4 py-3 font-medium">Moment</th>
                    <th className="px-4 py-3 font-medium">Formula</th>
                    <th className="px-4 py-3 font-medium">Example</th>
                  </tr>
                </thead>
                <tbody>
                  {copyPatterns.map((pattern) => (
                    <tr key={pattern.moment} className="border-b border-border last:border-b-0">
                      <td className="whitespace-nowrap px-4 py-3.5 align-top font-medium">
                        {pattern.moment}
                      </td>
                      <td className="px-4 py-3.5 align-top font-mono text-xs text-muted-foreground">
                        {pattern.formula}
                      </td>
                      <td className="px-4 py-3.5 align-top">{pattern.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-6">
              <h3 className="text-sm font-semibold">Words we use</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {wordsUse.map((word) => (
                  <Badge key={word} variant="primary">
                    {word}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-6">
              <h3 className="text-sm font-semibold">Words we don't</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {wordsAvoid.map((word) => (
                  <Badge key={word} variant="danger">
                    {word}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-6">
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Boilerplate — quote verbatim
            </div>
            <p className="mt-3 max-w-3xl text-pretty leading-relaxed">{boilerplate}</p>
          </div>
        </SubSection>

        {/* ------------------------------ Usage rules ----------------------------- */}
        <SubSection
          title="Color & type, in brand terms"
          description="The full token system lives in Foundations. These are the two rules that keep the brand recognizable when the tokens are in someone else's hands."
        >
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <div className="rounded-xl border border-border bg-surface p-6">
              <h3 className="text-sm font-semibold">Signal green means:</h3>
              <ul className="mt-4 grid gap-3 text-sm leading-relaxed">
                {colorRules.map((rule) => (
                  <li key={rule} className="flex gap-3">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-500" aria-hidden />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-surface p-6">
              <h3 className="text-sm font-semibold">Type roles</h3>
              <ul className="mt-4 grid gap-3">
                {typeRoles.map((role) => (
                  <li key={role.role} className="flex items-baseline justify-between gap-4 border-b border-border pb-3 last:border-b-0 last:pb-0">
                    <div className="grid gap-0.5">
                      <span className="text-sm font-medium">{role.role}</span>
                      <span className="text-xs text-muted-foreground">{role.sample}</span>
                    </div>
                    <span className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                      {role.spec}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </SubSection>
      </div>
    </div>
    </>
  );
}
