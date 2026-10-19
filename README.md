# seobot design system

A modern-minimalist design system for a SaaS marketing site + app UI, built as a running demo you can browse, copy from, and extend. Clean and whitespace-forward, hairline borders, subtle layered shadows, one strong accent (a green-teal "signal green"), and full light/dark theming.

## Stack

- **React 19** + **TypeScript 5.9**
- **Vite 6** (dev server + build)
- **Tailwind CSS v4** (CSS-first config — no `tailwind.config.js`)
- **Zero UI dependencies.** Beyond `clsx` / `tailwind-merge` / `class-variance-authority` / `lucide-react`, everything (dialog, dropdown, toast, charts, …) is hand-rolled.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

`App.tsx` renders one view per URL path (`src/routes.ts` is the route table). Marketing and study routes (`/`, `/seo-check`, `/dashboard`, `/research/semantics`) are **prerendered to static HTML at build time** (`scripts/prerender.mjs`, React `react-dom/static`) and hydrated on the client, so crawlers that don't run JavaScript get full content. Reference views live under `/design/*` (noindex, client-rendered); company deep dives are `/company/<domain>`. Old `?view=` links redirect to the real paths. `vercel.json` carries the SPA rewrites; unknown paths serve the prerendered `404.html` (noindex). The theme toggle lives in the marketing navbar and the dashboard topbar.

| View | What it shows |
|---|---|
| **Landing** | Full marketing page: navbar, hero (animated), definition band, coverage marquee, AI-search evidence, features, how-it-works, FAQ, CTA, footer — rendered from `src/content/home.ts`. No pricing section by design |
| **Dashboard** | The top-sites study: AI-readability charts, robots.txt crawler policies, a cross-filtered explorer over every crawled site with per-site detail, and the Tranco ranking methodology — rendered from the derived crawl dataset (`src/content/top-sites.ts`) |
| **SEO Check** | Free 3-minute, in-browser site assessment (wizard → scored report) — the growth-loop tool |
| **Components** | Gallery of every UI primitive with usage demos |
| **Foundations** | Design tokens: color ramps, semantic swatches, the display type scale, chart + sequential palettes, shadows |
| **Brand** | Living brand guidelines: logo system, clear space, do/don'ts, voice principles, tone matrix, taglines, copy patterns — rendered from the machine-readable brand layer |

The theme toggle persists to `localStorage` (`seobot-theme`) and is applied pre-paint via a small script in `index.html`, so there is no flash of the wrong theme.

## Project structure

```
src/
  components/
    ui/          26 UI primitives — atoms & molecules (barrel export in index.ts)
    marketing/   12 landing-page sections — organisms (navbar, hero, coverage, ai-search, faq, …)
    app/         App-shell organisms (sidebar, topbar, stat card, site explorer, crawler policies)
    logo.tsx     Logo system (mark, wordmark, lockup, stack)
    seo.tsx      Seo primitive — title/meta/canonical/OG + JSON-LD, hoisted to <head> during render
    theme-toggle.tsx  Light/dark toggle used by the navbar and the app topbar
  pages/         The six views above
  content/       Typed marketing copy + brand rules + JSON-LD schema + the derived study
                 dataset (has its own README)
  lib/           cn() class merge helper, ThemeProvider
  styles/        globals.css — all design tokens live here
scripts/
  build-top-sites-data.mjs  Derives a study JSON from tools/crawl output (the extended build writes top-sites-study-1k.json)
  build-study-facts.mjs     Derives src/content/study-facts.json — the headline figures every page of copy quotes (runs first in `build`)
  check-contrast.mjs   Contrast + sequential-ramp audit (exits 1 on failure)
  check-seo.mjs        Content/SEO audit (titles, canonicals, schema, FAQ parity)
public/          favicon.svg, robots.txt, llms.txt, brand/ (logo + OG card assets)
docs/            Research notes + specs — design system, content models, SEO/GEO, audit engines
                 → start at docs/README.md for the index
tools/crawl/     The isolated research crawlers behind the dashboard dataset (own README)
```

## Structure & atomic design

The system follows atomic design as a *mental model*, not a folder religion: tokens (subatomic) → UI atoms & molecules (`components/ui/`) → organisms (`components/marketing/`, `components/app/`) → templates (planned: `src/templates/`, binding organisms to typed content structures) → pages (the demo views now; real routes once content wiring lands). Folders are named semantically on purpose. The full mapping, placement rules, brand-role alignment, and the data-viz component roadmap live in `docs/design-system.md`.

## Design tokens

Tokens live in `src/styles/globals.css` in two layers:

**Layer 1 — primitives.** Raw scales with no meaning attached: the `--color-brand-50…950` ramp (OKLCH, hue 172), fonts, shadows, easing, keyframes.

**Layer 2 — semantic tokens.** The public API. Everything in the UI reads from these, so re-theming means editing one block:

- Surfaces: `--background`, `--foreground`, `--surface`, `--muted`, `--accent`, `--border`, `--input`, `--ring`
- Status pairs: `--primary`, `--success`, `--warning`, `--destructive`, `--info` — each with `-foreground` (text on solid) and `-soft` / `-soft-foreground` (tinted backgrounds)
- Charts: `--chart-1…8` (categorical) and `--seq-1…8` — a brand-derived sequential ramp for heatmaps and treemaps whose direction flips in dark mode
- Type & data: `--text-display-sm…xl` — the Brand display role as a fluid clamp scale (−5% tracking, weight 800–900) — and `@utility numeric` for tabular figures in tables, KPIs, and tooltips

Semantic tokens are wired into Tailwind via `@theme inline`, so they are used as normal utilities — `bg-background`, `text-muted-foreground`, `border-border`, `bg-primary-soft`, `text-destructive-soft-foreground`, etc. Dark mode is class-based (`@custom-variant dark`): toggling `.dark` on `<html>` swaps the semantic layer; components never change.

**Accessibility is enforced, not implied.** `npm run check:contrast` parses `globals.css`, converts OKLCH → sRGB, and checks every meaningful pairing (body text, buttons, badges, all 8 chart series on page and card surfaces, borders) against WCAG thresholds — plus the sequential ramp's monotonicity and step separation. It exits non-zero on any failure — run it after touching color tokens.

## Components

All primitives export from `@/components/ui` (see `src/components/ui/index.ts`):

`accordion` · `alert` · `avatar` · `badge` · `button` · `card` · `chart` (Area, Bar, Sparkline, Scatter, Histogram, Heatmap — 8 series colors + the sequential ramp) · `chart-frame` (title · sourced caption · aria-label · optional no-JS table view) · `checkbox` · `dialog` · `dropdown-menu` · `empty-state` · `field` · `input` · `label` · `progress` (+ ring) · `radio` · `select` · `separator` · `skeleton` · `switch` · `table` · `tabs` · `textarea` · `toast` · `tooltip`

Marketing sections export from `@/components/marketing`; app-shell pieces from `@/components/app`. The Components view in the running app doubles as living documentation, and the Brand view is the identity's living spec — check both before reading source.

Notes on the tricky ones:

- **Dialog** uses native `<dialog>` with CSS animations in `globals.css`; focus trapping and Escape come from the platform.
- **DropdownMenu** takes a single `trigger` element and injects props via `cloneElement` — it never wraps your trigger in a `<button>`, so it composes with icon buttons, avatars, etc.
- **Charts** are hand-rolled: the AreaChart has a pointer-tracking crosshair with tooltip; `ScatterChart`, `Histogram`, and `Heatmap` are HTML-positioned, so marks never distort with the container. No charting library. Wrap charts in **ChartFrame** to get the study contract — sourced caption, `role="img"` label, and a no-JS table view of the same numbers.
- **Toast** is provider-based (`<ToastProvider>` + `useToast()`), rendered in a fixed container at `z-100`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc` + client build + SSR build + prerender to `dist/` (HTML per route, `404.html`, `sitemap.xml`) |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc` only |
| `npm run check:contrast` | WCAG audit of all token pairings incl. the 8 chart series and the sequential ramp (fails build on violation) |
| `npm run check:seo` | Audits content modules: title/description lengths, canonical paths, JSON-LD well-formedness, FAQ text ↔ schema parity |
| `npm run check:seo-check` | Audits the SEO Check scoring engine (questions, categories, profiles, link parsing) |
| `npm run data:top-sites` | Rebuilds the dashboard's study dataset from `tools/crawl/out/` (run after a crawl) |
| `npm run data:study-facts` | Regenerates `src/content/study-facts.json` (crawled/readable counts, wall and robots shares, coverage quartiles) from the study — copy imports this instead of typing numbers |

Recommended gate before merging: `npm run typecheck && npm run check:contrast && npm run check:seo`.

## Content layer

`src/content/` is a typed, render-ready content layer — marketing copy, glossary terms, JSON-LD builders, and the machine-readable brand layer (`brand.ts`) that the Brand view renders — with its own conventions in `src/content/README.md`; the design contracts and research live in `docs/`. Content modules are plain data typed against `docs/content-models.md` — they carry no components. The landing sections render `home.ts` directly, so the copy the SEO audit validates is the copy that ships. Every page in the SEO audit is validated against its schema before shipping.

## Brand layer

The identity is part of the system, not a PDF beside it:

- **Logo system** (`src/components/logo.tsx`) — mark, wordmark, horizontal lockup, and stacked lockup with size (`sm`–`2xl`) and tone (`brand` / `mono`) variants. The mark is the climb drawn as a folded ribbon in axonometric view (flat faces, no container); the wordmark's period keeps the signal dot.
- **Brand rules as data** (`src/content/brand.ts`) — voice principles with rewrites, the tone matrix, taglines, copy patterns, asset specs, and color/type rules. The Brand view renders these objects directly, so docs and UI can't drift.
- **Standalone assets** (`public/brand/`) — `logo-mark.svg`, `logo-lockup.svg`, and a 1200×630 `og-card.svg` for social cards. Prose guidance lives in `docs/copy-style.md`; the research behind it in `docs/brand-research.md`.

## Design decisions worth knowing

- **One accent, used sparingly.** Signal green marks exactly three things: primary actions, active states, and the current data highlight — nothing else. The chart palette and sequential ramp are brand-derived, so data is "in brand" by default.
- **Big type is the brand.** Display headlines run Geist Black 900 at −5% tracking (the *Brand display* role from `src/content/brand.ts`); data figures run Geist Mono with tabular numerals.
- **Borders over shadows for structure; shadows for layering.** Cards and inputs use hairline borders; only floating layers (dropdowns, dialogs, toasts) get elevation.
- **Motion is a token family, not a garnish.** Three registers — micro (UI feedback), entrance (one-shot, ≤ 600ms), ambient (≥ 20s loops) — transform/opacity only, one entrance moment per viewport, and a single `prefers-reduced-motion` kill-switch in `globals.css` (rules: `docs/design-system.md` §4).
- **Geist** for UI text, **Geist Mono** for numerals/code, both self-hosted via `@fontsource-variable` (no Google Fonts requests).
- **React 19 ref-as-prop** throughout — no `forwardRef` wrappers.
- The stack is intentionally pinned (Vite 6 / plugin-react 4 / TS 5.9) so it runs on Node **20.15+**; newer Vite/TS majors require Node ≥ 20.19.
# seobot
