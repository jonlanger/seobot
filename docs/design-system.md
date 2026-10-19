# Design System — Structure, Atomic Design & the Data Direction

> v1 · October 16, 2026 · Maintained by the design-system session.
> Companions: `docs/content-models.md` §13 (template → component handoff), `docs/data-assets-and-interactives.md` (data-viz catalog + guardrails), `docs/brand-research.md`, `docs/copy-style.md`, and `src/content/brand.ts` (the machine-readable brand layer).

The README covers how to run and what exists. This doc covers **how the system is organized and why**, and the direction it's being built for: **data-rich visuals + big bold typography, on brand**.

## 1. The layer model

| Layer | What it is | Where | Examples |
|---|---|---|---|
| **Tokens** (subatomic) | Raw + semantic variables; the contract between brand and UI | `src/styles/globals.css` | `--color-brand-*`, `--primary-soft`, `--text-display-*`, `--seq-1…8` |
| **Atoms** | Indivisible controls — can't break down further and stay functional | `src/components/ui/` | `Button`, `Input`, `Badge`, `Avatar`, `Separator`, `Skeleton` |
| **Molecules** | A few atoms working as one unit, single responsibility | `src/components/ui/` | `Field` (label + input + hint + error), `Alert`, `Tooltip`, `Tabs`, `Progress` |
| **Organisms** | Distinct sections of an interface, composed and reusable | `ui/` (complex ones), `marketing/`, `app/` | `Table`, charts, `Navbar`, `Hero`, `Coverage`, `AppSidebar`, `StatCard` |
| **Templates** *(next)* | Page layouts that bind organisms to **content structure** | `src/templates/` (planned) | `HomeTemplate`, `GlossaryTermTemplate`, `StudyTemplate` |
| **Pages** | Templates + real content from `src/content/` | Demo views today; routes as wiring lands | Landing view → future `/`, `/pricing`, `/research/*` |

## 2. Atomic design, applied — not cargo-culted

Brad Frost's methodology (2013, *Atomic Design*) defines five stages — atoms, molecules, organisms, templates, pages — as **a mental model, not a linear process**. The properties that matter for us:

- **Not sequential.** You can assemble bottom-up or deconstruct top-down ("start from real pages, abstract after"). We do both: the demo pages came first, the kit was extracted from them.
- **Part and whole.** Every piece is reviewable at two zoom levels: the component in the kit, and the component in a real page. The Components view is level one; the Landing and Dashboard views are level two.
- **Structure vs content.** *Templates articulate the underlying content structure; pages pour real content in.* This is exactly the `src/content/` ↔ `src/templates/` split planned in §1 — content modules already exist, templates are the missing layer.
- **Labels are optional.** Frost (2025): the biggest misconception is that the labels are required. The taxonomy should serve the team; GE renamed the stages entirely and kept the method. Modern practice adds tokens ("ions") below atoms and organizes folders semantically — which is what we do.
- **It's not a CSS/JS methodology.** We express it with React composition, typed props, `cva` variants, and tokens — not with folder names or build tooling.

Critiques worth knowing (and what we take from them):
- *Taxonomy is not a dependency boundary* (Feature-Sliced Design). Organisms must not import domain data — they take props; pages bind `src/content`. This keeps the kit reusable and the parallel content workstream unblocked.
- *Contract-driven* design: a component's promise (props, variants, contrast, prerender-safety) should be **executable**. That's what `check:contrast`, `check:seo`, and `tsc` are — see §6.

### Deliberately not doing
- No `/atoms`, `/molecules`, `/organisms` folders — `ui/`, `marketing/`, `app/` are the semantic equivalent, and renaming would break every import for zero behavior change.
- No atom for every HTML tag (`<p>`, `<em>`… stay plain HTML with utilities).
- No duplicate "pattern library" site — the running app *is* the pattern library.

## 3. Placement rules — where does a new component go?

1. **Single element or single behavior, no composition** → atom in `ui/` (e.g., `Badge`).
2. **Two–five atoms with one responsibility** → molecule in `ui/` (e.g., `Field`).
3. **A named section you'd sketch in a wireframe** → organism: `marketing/` if it belongs to a public page, `app/` if it's product chrome.
4. **Owns page layout / content structure** → template in `src/templates/` (planned), taking typed props from `src/content` interfaces (per `content-models.md` §13).
5. **Renders a route with real content** → page.

Data-display rule of thumb: a bare chart mark (`Sparkline`, `ScatterChart`) is a molecule; **a chart *block*** — title, caption with source, aria-label, optional data table — is an organism: `ChartFrame` (§5).

## 4. Brand alignment — what "big bold + data" means in tokens

From `brand.ts typeRoles`:

| Brand role | Spec | Design-system implementation |
|---|---|---|
| **Brand display** | Geist · 900 · tracking ≤ −5% | `text-display-xl/lg/md/sm` — fluid clamp scale, −5% tracking baked in; pair with `font-black` (lg/xl) or `font-extrabold` (md/sm). Hero headlines, splash moments, giant stats. |
| **Headings** | Geist · 600 · tracking-tight | `text-xl…5xl` + `font-semibold tracking-tight` |
| **Body & UI** | Geist · 400–500 | default type utilities |
| **Data & code** | Geist Mono · 400–500 | `font-mono` + `@utility numeric` (tabular figures) for stats, KPIs, tooltips, timestamps |

From `brand.ts colorRules`:
- Signal green = primary actions, active states, **current data highlight** — nothing else. `chart-1` is brand-600 by construction, and the sequential ramp *is* the brand ramp, so data visuals are "in brand" by default.
- Dataviz extension this pass: chart series went **5 → 8** (`--chart-6…8`, contrast-checked), and **`--seq-1…8`** was added for heatmaps, treemaps, and intensity encodings (direction flips in dark mode; strongest step 7.11:1 light / 12.72:1 dark).
- **One wording drift to fix:** `brand.ts` `colorRules` still says "chart-1…5" — update that string to "chart-1…8" next time the brand session touches the file. (The design system deliberately doesn't write to `src/content/`.)

The Landing page now runs on the display scale end to end (2026-10-16): hero `text-display-md → xl`, definition band and testimonial quote `text-display-sm`, final CTA `text-display-sm → md`, section headers at `text-4xl → 5xl`, and all marketing sections render from `src/content/home.ts`.

### Motion

Motion is a token family like type and color — three registers, defined in `globals.css`, applied with utilities:

| Register | Tokens | Budget | Used for |
|---|---|---|---|
| **Micro** | `--ease-out-expo` on `transition-*` | 120–250ms | Hover, focus, color changes — the existing UI feedback |
| **Entrance** | `--animate-rise-in`, `--animate-fade-in` (+ `[animation-delay:…]` staggers) | ≤ 600ms, one-shot | Hero stagger (eyebrow → h1 → subhead → CTAs → preview), preview chips, dialog/toast |
| **Ambient** | `--animate-drift` (aurora, 26–34s), `--animate-marquee` (48s) | ≥ 20s, loop | Hero + CTA aurora fields, the coverage strip |

**Rules** — the contract, mirroring the dataviz guardrails (§5):

1. **Transform and opacity only.** No `width`/`top`/`margin` animation, ever — it forces layout and wrecks the 60fps budget.
2. **Content first, motion second.** Everything animated is in the raw HTML and readable with CSS off — same rule as charts ("never gate substantive content"). No scroll-reveal on anything a crawler needs; entrance animations play on load, not on intersection.
3. **One entrance moment per viewport.** Below-the-fold sections don't fade in as you scroll; loops (aurora, marquee) are what carry motion past the fold. A page of staggered reveals reads as a template, not a brand.
4. **Loops must be slow, subtle, and stoppable.** ≥ 20s cycles, low-contrast fields; text marquees ship a real pause control (WCAG 2.2.2: the coverage strip pauses on hover *and* on button), and nothing blinks or flashes (WCAG 2.3.1).
5. **One kill-switch.** `prefers-reduced-motion: reduce` collapses animations and transitions globally in `globals.css` — components opt in with `motion-safe:` utilities and never re-implement the check.
6. **Motion agrees with meaning.** The signal dot pulses where "live" is true; chips rise in the order the product checks engines; the marquee moves toward the reader (left). Decorative-only motion is the first thing cut.

Applied so far: hero entrance stagger, dual aurora drift (hero + final CTA), product-preview rise + citation-chip stagger, coverage marquee with edge mask, floating rank chip. The floating-copy moments (`rise-in` delays) live inline on the elements they belong to — no shared motion wrapper, so a removed element can't leave a gap in the sequence.

## 5. Data-viz component roadmap

Exists today: `ChartFrame` (title · sourced caption · `role="img"` + `aria-label` · no-JS table view), `AreaChart` (hover crosshair + tooltip), `BarChart`, `ScatterChart`, `Histogram`, `Heatmap`; `StatCard`; `Table`; 8-color categorical palette + sequential ramp, all contrast-checked. The new pieces have live demos in the Components view ("Data display") and browser-verified dark-mode behavior.

Mapped to `data-assets-and-interactives.md` §4:

| Need (from the brief) | Component work | Status |
|---|---|---|
| Scatter — rank vs AI-visible % (study #1) | `ScatterChart` (HTML-positioned marks, native tooltips, highlight ring) | **shipped** |
| Distribution / histogram | `Histogram` (contiguous bins, hover values, sparse axis labels) | **shipped** |
| Heatmap — engine × domain, churn (study #4) | `Heatmap` (consumes `--seq-*`, hover values, legend + range) | **shipped** |
| Treemap — robots policy mix | `Treemap` | next wave |
| Filterable matrix — crawler × site explorer | `DataTable` enhancements: sort, filter, sticky header, all rows in source | next wave |
| Animated bar race — crawler discovery | `BarChart` + transform-only animation + static fallback | partial |
| Cross-filtered explorer (dots + linked panels) | `DotField`, `LinkedBarList`, `LinkedColumns`, `AnimatedNumber`, `FilterChip` (ui) · `ExplorerTemplate` (templates) · `LinkedExplorer` (app) · `crossfilter.ts` + `useSiteFilters` (lib; filter state is URL-shareable) · extra filter panels are `FacetDef`s built in `src/content/site-enrichment.ts` (structured data, agent-readiness, CDN, CMS, bot protection) | **shipped** — default dashboard view; live demo in Components |
| Quotable caption + source line on every chart | `ChartFrame` (title · caption in `number + unit + source + year` form · `role="img"` + `aria-label` · optional data table) | **shipped** |

**Non-negotiables** for all of it (from the brief §5): static SVG/table in raw HTML first, enhancement on top; never IntersectionObserver-gate substantive content; table-first chart-second; animate only `transform`/`opacity`; no chart library.

## 6. Executable contracts

- `npm run check:contrast` — every token pairing (text, fills, all 8 chart series on page *and* card surfaces) plus the sequential ramp (monotonic, ΔL ≥ 0.035, strongest ≥ 3:1). 90 checks, fails on violation.
- `npm run check:seo` — content contracts; will grow to validate study pages (chart captions carry sources, dataset `lastUpdated` present).
- `npm run typecheck` / `npm run build` — typed props and composition.
- Components expose typed props + `cva` variants; every component has a live demo in the Components view.

## 7. Open items

- [ ] `brand.ts` `colorRules`: "chart-1…5" → "chart-1…8" (1-line edit, brand session).
- [ ] `src/templates/` — start with `HomeTemplate` once the content wiring lands (per `content-models.md` §13).
- [x] Dataviz wave 1: `ChartFrame` + `ScatterChart` + `Histogram` + `Heatmap` — shipped with Components-view demos.
- [ ] Dataviz wave 2: `Treemap`, then `DataTable` enhancements (sort, filter, sticky header) ahead of the robots.txt explorer.
- [x] Migrate remaining marketing organisms to the display scale as they're wired to `src/content/` (2026-10-16: hero, definition, quote, and CTA on the display scale; section headers at 4xl/5xl).
- [x] Motion rules shipped (§4 "Motion") with the hero pass — tokens in `globals.css`, reduced-motion kill-switch, applied to hero, preview, coverage strip, and final CTA (2026-10-16).
