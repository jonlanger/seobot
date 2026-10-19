# Content Models — Seobot Site + App

> Companion to `docs/seo-research.md`. Defines the content model for every page template: fields, SEO rules, schema, CTAs, and internal-linking contract. These models are the contract between content, the design system components, and the prerender pipeline.

**Status:** Draft v1 — slots marked `{like this}` are decisions to make as positioning lands.
**Conventions:** examples use a placeholder Seobot product (automated SEO auditing/fixing) — replace with real product facts as they're defined.

---

## 0. Shared primitives

Every indexable page extends `PageSeo`; components consume the rest.

```ts
/** Every page supplies exactly one of these. Consumed by <Seo> during render (prerender-safe). */
interface PageSeo {
  /** Final <title> tag. Target 30–60 chars. Formula per template (see §1). */
  title: string;
  /** Meta description. Target 120–160 chars. Persuasive, ends with a concrete next step. */
  description: string;
  /** Absolute path, e.g. "/pricing". Drives canonical + sitemap. */
  path: string;
  /** Defaults to "index, follow". App/error routes must set "noindex". */
  robots?: "index, follow" | "noindex";
  /** 1200×630 social card. Falls back to brand default. */
  ogImage?: string;
  /** JSON-LD objects rendered as <script type="application/ld+json">. Must match visible copy. */
  jsonLd?: Record<string, unknown>[];
}

interface CtaLink { label: string; href: string; }

interface Cta {
  headline: string;
  subhead?: string;
  primary: CtaLink;
  secondary?: CtaLink;
}

interface Hero {
  eyebrow?: string;
  /** Rendered as the page's single <h1>. */
  headline: string;
  subhead: string;
  primaryCta?: CtaLink;
  secondaryCta?: CtaLink;
  media?: MediaRef;
}

/** width/height are REQUIRED — they reserve layout space and prevent CLS. */
interface MediaRef {
  src: string;
  alt: string;      // empty string only for decorative images
  width: number;
  height: number;
}

interface FaqItem { question: string; answer: string; }   // answers 40–60 words, self-contained

interface ProofStat { value: string; label: string; source?: string; }  // stats must be sourced

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  avatar?: MediaRef;
}

interface Crumb { label: string; href: string; }
```

**Definition-first rule (all templates):** the first paragraph of every commercial page answers "What is this?" in 2–3 standalone sentences an AI engine can quote verbatim. No throat-clearing, no "In today's fast-paced world…".

---

## 1. Template overview

| # | Template | URL | Index | Primary schema | Title formula |
|---|---|---|---|---|---|
| 1 | Home | `/` | index | `Organization`, `WebSite`, `SoftwareApplication` | `Seobot — {category promise}` |
| 2 | Pricing | `/pricing` | index | `SoftwareApplication`+`Offer`, `FAQPage` | `Pricing — Seobot` (plans visible up front) |
| 3 | Feature | `/features/{feature}` | index | `SoftwareApplication`, `BreadcrumbList` | `{Feature}: {benefit} \| Seobot` |
| 4 | Integration | `/integrations/{tool}` | index | `BreadcrumbList` | `{Tool} Integration — {outcome} \| Seobot` |
| 5 | Use case | `/use-cases/{segment}` | index | `BreadcrumbList` | `SEO for {Segment} — {outcome} \| Seobot` |
| 6 | Comparison | `/vs/{competitor}`, `/alternatives/{tool}` | index | `FAQPage`, `BreadcrumbList` | `Seobot vs {Competitor} — {differentiator}` |
| 7 | Blog post | `/blog/{slug}` | index | `Article`, `BreadcrumbList` | `{Post title} \| Seobot Blog` |
| 8 | Docs | `/docs/{path}` | index | `BreadcrumbList` | `{Page title} — Seobot Docs` |
| 9 | Changelog | `/changelog` | index | — | `Changelog — Seobot` |
| 10 | Glossary term | `/glossary/{term}` | index | `DefinedTerm` (optional) | `What is {term}? Definition & examples \| Seobot` |
| 11 | Reference (AI crawlers) | `/ai-crawlers` | index | `TechArticle`, `FAQPage`, `BreadcrumbList` | `{Topic}: The Complete Reference \| Seobot` — see §16 |

App routes (`app.seobot.{tld}/**`: login, dashboard, settings, billing, onboarding): **`noindex` + robots.txt disallow, excluded from sitemap.** Error routes: noindex.

**Sitewide constants** (rendered on every page, one definition):
- `Organization` JSON-LD with `sameAs` → LinkedIn, X, GitHub, Crunchbase, G2/Capterra profiles.
- `WebSite` JSON-LD with `SearchAction` (if site search exists).
- Nav + footer link every money page from every page (home, features index, pricing, use cases, integrations, blog, docs, changelog).

---

## 2. Home — `/`

**Purpose:** establish the entity ("what is Seobot"), route visitors to money pages, rank for brand + category terms, and carry the evidence layer AI engines extract.

```ts
interface HomePage extends PageSeo {
  hero: Hero;
  /** Definition-first paragraph. First sentence must stand alone as a "What is Seobot?" answer. Rendered as a band directly under the hero. */
  definition: string;
  /** Source coverage strip (marquee): the search surfaces every account is checked against. */
  coverage: { caption: string; items: string[] };
  /** Sourced industry stats + one comparison table (GEO: stats + citations + tables are the top extraction levers). */
  evidence: {
    heading: SectionHeading;
    stats: ProofStat[];              // 3 stats, each number + unit + source + year
    table: {
      title: string;
      columns: [string, string];     // e.g. "Google Search" vs "AI answers"
      rows: { label: string; values: [string, string] }[];
      source: string;                // caption line: number + source + year
    };
  };
  /** 3–6 cards, each linking to a feature page. Slug must exist. */
  features: { heading: SectionHeading; items: { featureSlug: string; title: string; description: string }[] };
  /** Exactly 3 steps: how the product works end-to-end. */
  howItWorks: { heading: SectionHeading; steps: { title: string; description: string }[] };
  /** One attributed quote. Hard numbers live in `evidence`, where they can be sourced. */
  testimonial: Testimonial;
  faq: { heading: SectionHeading; items: FaqItem[] };   // 3–6 top objections; emit FAQPage schema
  finalCta: Cta;
}
```

**Rules**
- H1: names the mechanism and both outcomes. Current: *"The SEO data behind Google rankings and AI citations."* The category noun ("SEO platform" — locked sitewide) appears in the `<title>`, the definition paragraph, and section copy; the hero eyebrow carries the positioning hook (*"Researched. Sourced. Verified."*). Positioning (2026-10-16): Seobot sells researched, source-backed data — not "AI magic"; copy names the mechanism and cites its numbers.
- Meta description: benefit + proof + next step. Current: *"Seobot researches your site, competitors, and the sources Google and AI engines read. It turns that data into audits, briefs, and fixes. Run the free check."*
- Definition band sits directly under the hero, before any other section — question-shaped H2 ("What is Seobot?") + the quotable paragraph.
- Evidence: every stat carries source + year (no unsourced claims on the home page); the comparison table is the page's one structured artifact.
- No `<h1>` competition: the coverage-strip caption, etc. use `<p>`/`<div>`.
- Above-the-fold content must be visible in raw HTML (no scroll-reveal on hero; entry motion is one-shot CSS and the text is present without it).
- CTAs are working destinations only: the hero and final CTA pair the free SEO check (a functioning tool) with an on-page explore anchor ("See how it works"). Trial CTAs return when the signup flow lands (`TODO(launch)`) — no dead buttons on the home page.
- Pricing is not a home section (decision 2026-10-16): tier data lives in `src/content/pricing.ts` for the future `/pricing` page. The home page links no pricing.
- The coverage strip replaced the customer-logo cloud (2026-10-16): the six surfaces are the product claim; customer logos return only with real customers.
- The marketing sections render `home.ts` directly — copy changes ship through this module, then `npm run check:seo` re-validates titles, canonicals, schema, and FAQ parity.
- Landing type runs on the display scale (hero `display-md → xl`, definition/quote/CTA `display-sm → md`) — big type is the brand (see `docs/design-system.md` §4).
- Motion follows the design system's motion rules (§4 "Motion"): entrance animations are one-shot; ambient loops (aurora, coverage marquee) are slow; transform/opacity only; `prefers-reduced-motion` collapses everything.

---

## 3. Pricing — `/pricing`

**Purpose:** convert high-intent buyers; rank for `seobot pricing` + "[category] pricing"; the page AI engines pull pricing facts from.

```ts
interface PricingPage extends PageSeo {
  hero: Hero;
  billingNote?: string;              // e.g. "Save 20% on annual"
  plans: PricingPlan[];              // 2–4; at least one self-serve entry point
  comparison: ComparisonTable;       // full feature matrix (NOT in an accordion — keep crawlable)
  faq: FaqItem[];                    // REQUIRED (6–10): billing, trials, limits, cancellation, security
  guarantees: string[];              // "14-day trial", "cancel anytime", SOC 2, etc.
  finalCta: Cta;
}

interface PricingPlan {
  name: string;
  tagline: string;
  monthlyPrice: number | null;       // null = "Custom"
  annualPrice?: number;              // per-month price billed annually
  currency: "USD";
  badge?: string;                    // "Most popular"
  highlighted?: boolean;
  features: string[];                // what's INCLUDED (matrix covers the rest)
  cta: CtaLink;                      // "Start free trial" / "Talk to sales"
  trialDays?: number;                // must match visible copy — feeds Offer schema
}

interface ComparisonTable {
  columns: string[];                 // ["Seobot", "Competitor"]
  rows: { feature: string; values: (string | boolean)[] }[];
}
```

**Rules**
- **Pricing must be visible — never "contact us for pricing" for the entry tier.** Ranks and converts; AI assistants quote it.
- `SoftwareApplication` + `Offer` per plan: `price` (0 allowed for free tier), `priceCurrency`, `availability`. Schema values must equal visible values exactly.
- FAQ answers address the actual objections from sales calls; each is quotable standalone.
- Title: keep branded & short (`Pricing — Seobot | Free 14-day trial`). Do not stuff "plans pricing cost".

---

## 4. Feature — `/features/{feature}`

**Purpose:** rank for `[feature] software/tool` queries; one page per capability (expect 6–12 pages, not one "Features" page).

```ts
interface FeaturePage extends PageSeo {
  breadcrumb: Crumb[];               // Home / Features / {Feature}
  featureName: string;               // canonical short name, matches nav
  hero: Hero;                        // H1 = job-to-be-done outcome, not just the feature name
  problem: { headline: string; body: string };   // why this is hard/painful today
  steps: { title: string; description: string }[];
  capabilities: { title: string; description: string; icon?: string }[];   // 4–8
  proof: { stat: ProofStat; testimonial?: Testimonial };
  pricingNote?: string;              // plan it's included in + link to /pricing
  faq?: FaqItem[];                   // 2–4 feature-specific; emit FAQPage if present
  related: string[];                 // 2–3 related feature slugs
  finalCta: Cta;
}
```

**Rules**
- Page structure doubles as an SEO funnel: problem → how it works → proof → pricing transparency → CTA.
- H1 example: *"Find every SEO issue before your traffic feels it"* — with the feature name in the eyebrow.
- Every feature page links to: `/pricing`, 2–3 sibling features, 1 relevant integration, 1 comparison page.
- Minimum ~600 words of unique copy; the capability grid alone is not enough.

---

## 5. Integration — `/integrations/{tool}`

**Purpose:** capture `{tool} seo integration` long-tail; support partner co-marketing. **≥300 unique words or noindex/merge** — the classic thin-page trap.

```ts
interface IntegrationPage extends PageSeo {
  breadcrumb: Crumb[];
  integration: { name: string; logo: MediaRef; category: string; url?: string };
  hero: Hero;
  whatYouCanDo: string[];            // ≥3 concrete outcomes, specific to this tool
  setupSteps: { title: string; description: string }[];
  body: string;                      // unique prose — why THIS pairing matters
  related: string[];                 // related integrations + features
  finalCta: Cta;
}
```

**Rules**
- Title from template data, never the same for all: `Connect {Tool} to Seobot — {specific outcome}`.
- Hub page at `/integrations` links to every child (discovery + internal linking).
- Include the tool name, the workflow, and a screenshot of the actual integration — no generic copy.

---

## 6. Use case — `/use-cases/{segment}`

**Purpose:** `seo for {segment}` queries (agencies, e-commerce, SaaS, publishers, indie makers…). Shorter than feature pages but must still be differentiated.

```ts
interface UseCasePage extends PageSeo {
  breadcrumb: Crumb[];
  segment: string;                   // "Marketing agencies"
  hero: Hero;
  painPoints: { title: string; description: string }[];   // 3–4, segment-specific
  workflow: { title: string; description: string }[];     // how Seobot fits their week
  results: { stat: ProofStat; testimonial?: Testimonial };
  related: string[];                 // 2–3 other use cases
  finalCta: Cta;
}
```

**Rules**
- Copy must pass the swap test: if you can swap the segment name and it still reads fine, it's not differentiated. Reference segment-specific rituals (client reporting, product launches, editorial calendars).
- Hub page at `/use-cases`.

---

## 7. Comparison — `/vs/{competitor}` and `/alternatives/{tool}`

**Purpose:** MOFU/switch intent. Highest-ROI SaaS SEO page type. **Highest duplicate-content risk — every page must be genuinely unique.**

```ts
interface ComparisonPage extends PageSeo {
  breadcrumb: Crumb[];
  competitor: { name: string; url?: string };
  hero: Hero;
  /** Summary table above the fold. This table is what AI engines extract — keep it factual. */
  summary: ComparisonTable;
  fullComparison?: ComparisonTable;
  chooseThem: string[];              // honest "choose {Competitor} if…" — 2–3
  chooseUs: string[];                // "choose Seobot if…"
  migration?: { title: string; steps: string[] };
  faq: FaqItem[];                    // REQUIRED — powers FAQPage schema
  finalCta: Cta;
}
```

**Rules**
- Factual and fair — never misstate the competitor's pricing/features (they will notice, and so will Google). Verify claims quarterly; put "Last verified {date}" on the page.
- `/alternatives/{tool}` targets "alternative to X" and may compare 3–5 options with Seobot as one row — again factual.
- FAQ must include: "Is there a free plan?", "Can I migrate from {Competitor}?", "What's different about Seobot?".
- Canonicals: one canonical per comparison; do not create near-duplicate `/vs/x` and `/alternatives/x` targeting the same query — merge if intent overlaps.

---

## 8. Blog post — `/blog/{slug}`

**Purpose:** TOFU/MOFU education that links up into money pages. **Not the starting point** — ships after the money pages.

```ts
interface BlogPost extends PageSeo {
  slug: string;
  articleTitle: string;              // H1 (PageSeo.title is the <title> tag)
  excerpt: string;                   // used in listings + og:description fallback
  author: Author;
  publishedAt: string;               // ISO
  updatedAt?: string;                // shown when set ("Updated {date}")
  tags: string[];
  heroImage?: MediaRef;
  body: string;                      // markdown/MDX — renderer TBD by content pipeline
  /** ≥2 links to money pages, selected per post. */
  related: { label: string; href: string }[];
}

interface Author { name: string; role: string; avatar?: MediaRef; sameAs?: string[]; }
```

**Rules**
- Each post inherits the definition-first rule within its topic.
- Long-form posts include ≥1 table, ≥2 sourced stats, and, where credible, a first-hand example (E-E-A-T: experience beats summary).
- `Article` JSON-LD: author, `datePublished`, `dateModified`. Update `dateModified` only on meaningful edits.
- Post → money-page internal links are **mandatory and editorial** (contextual anchors, not footers).
- Authors are real people with bios (E-E-A-T); byline + updated date visible on page.

---

## 9. Docs — `/docs/{path}`

**Purpose:** support + long-tail; commonly noindexed by accident — don't.

```ts
interface DocPage extends PageSeo {
  docTitle: string;
  section: string;                   // sidebar group
  order: number;                     // sort within section
  body: string;
  related?: { label: string; href: string }[];
  lastUpdated: string;               // ISO — shown on page
}
```

**Rules**
- Indexable unless it's a duplicate of product UI with zero search value.
- Each docs page needs a unique title/description — not "Docs — Seobot" sitewide.
- If docs live on a subdomain, they need their own sitemap + robots.txt submitted in GSC.
- `BreadcrumbList` from the sidebar hierarchy.

---

## 10. Changelog — `/changelog`

```ts
interface ChangelogEntry {
  date: string;                      // ISO
  version?: string;
  title: string;
  changes: { kind: "added" | "improved" | "fixed"; text: string; href?: string }[];
}
```

**Rules**
- Keep indexable (freshness signal; a common accidental `noindex` trap).
- Entries link to the relevant feature/docs pages — changelog becomes an internal-linking surface over time.

---

## 11. Glossary term — `/glossary/{term}`

**Purpose:** own the definitional layer of our category ("what is technical SEO", "what is an SEO audit"). These pages are what AI engines quote.

```ts
interface GlossaryTermPage extends PageSeo {
  term: string;
  /** 1–2 sentences, standalone-quotable. Leads the page above the fold. */
  definition: string;
  longForm: string;                  // usage, examples, how it relates to Seobot
  relatedTerms: string[];
  cta: Cta;                          // contextual, e.g. "See how Seobot automates this"
}
```

**Rules**
- The `definition` string must work out of context — it's the snippet AI engines will cite.
- Don't publish a term until it has genuine added value beyond Wikipedia/the first SERP result; thin glossary pages are scaled-content risk. 20 great terms > 200 stubs.
- Optional `DefinedTerm` schema (no Google rich result for it, but it's entity-clean).

---

## 12. App routes (noindex perimeter)

| Route | Indexing | Notes |
|---|---|---|
| `app.*/login`, `/signup` | noindex | Landing pages for auth can stay on marketing site if they have content value |
| `app.*/dashboard`, `/settings`, `/billing`, `/onboarding` | noindex + robots.txt | Target: `site:app.seobot.{tld}` → 0 results |
| Marketing 404 / error views | noindex | See SPA soft-404 handling in `docs/seo-research.md` §2.2 |
| Unsubscribe/confirmation pages | noindex | |

---

## 13. Template → components needed (handoff to the design system)

| Template | UI components consumed |
|---|---|
| All | `Seo` (head/JSON-LD, render-time), `Nav`, `Footer`, `Breadcrumbs`, `CtaBanner` |
| Home | `Hero`, `LogoCloud`, `DefinitionBlock`, `FeatureCard`×n, `StepList`, `UseCaseCard`×n, `Testimonial`, `FaqAccordion` |
| Pricing | `Hero`, `BillingToggle`, `PricingCard`×n, `ComparisonTable`, `FaqAccordion`, `TrustStrip` |
| Feature | `Hero`, `SectionHeader`, `StepList`, `CapabilityGrid`, `StatBlock`, `Testimonial`, `FaqAccordion`, `RelatedGrid` |
| Integration | `Hero`, `IntegrationCard`, `StepList`, `ProseBlock`, `RelatedGrid` |
| Use case | `Hero`, `PainPointGrid`, `StepList`, `ResultsBlock`, `RelatedGrid` |
| Comparison | `Hero`, `ComparisonTable` (sticky header), `CheckList`, `MigrationSteps`, `FaqAccordion` |
| Blog index / post | `PostCard`×n, `ProseBlock` (typography scale for h2/h3/table/blockquote/code), `AuthorCard`, `TableOfContents`, `RelatedPosts` |
| Docs | `DocLayout` (sidebar + content), `ProseBlock`, `Callout`, `PrevNext` |
| Changelog | `TimelineEntry`, `Badge` (added/improved/fixed) |

Notes for the parallel session:
- `Seo` must write during **render**, not `useEffect` (prerender capture — see research §2.2).
- `ComparisonTable` and pricing matrix must render as semantic `<table>` in raw HTML (crawlable + GEO-extractable); don't lazy-mount them on scroll into view.
- `FaqAccordion` content must exist in the DOM when closed (either always-rendered with CSS hiding, or `<details>`), so it's in the prerendered HTML and matches FAQPage schema byte-for-byte.
- `ProseBlock` styles must cover: h2/h3, `table`, `blockquote`, `code`, figure/figcaption — blog/docs depend on it.

---

## 14. Content authoring conventions

1. **Brand entity**: write "Seobot" consistently (never "Seo Bot"); first mention on a page states the category ("Seobot, an automated SEO platform, …") so entity extraction is unambiguous.
2. **No unsourced superlatives** ("the world's best") — they're filler for AI engines and a trust liability. Prefer specific, sourced claims.
3. **Stats format**: number + unit + source + year. `47% of sites fail Core Web Vitals (Chrome UX Report, 2026).`
4. **FAQ answers**: 40–60 words, standalone, answer-first sentence.
5. **Tables beat bullets** for any 2+ way comparison (AI engines preferentially extract tables).
6. **CTAs match funnel stage**: TOFU content → newsletter/free tool; MOFU comparison/use-case → free trial; BOFU pricing/features → start trial / talk to sales.
7. **Dates**: every content page shows `Published`/`Updated`. Never fake freshness.

---

## 15. Open decisions

- [x] Category noun: **"SEO platform"** — locked in `src/content/site.ts` (`category`) and used in the home `<title>` + definition paragraph. ("automated" dropped as an unnecessary qualifier.) The home H1 leads with the mechanism instead — see §2 rules.
- [x] Feature set (first six): AI visibility, keyword research, site audits, AI content briefs, rank tracking, automated reports — shipped on the home page (`src/content/home.ts`); each gets a `/features/{slug}` page next. (Backlink monitoring is real but sold as part of audit/report pages; it no longer has a home-page card.)
- [x] Home page evidence layer: 3 sourced stats + the "How AI answers differ from Google Search" table, rendered from `home.evidence` (2026-10-16).
- [x] `Seo` primitive shipped (`src/components/seo.tsx`) — title/description/canonical/robots/OG + JSON-LD hoisted to `<head>` during render; Landing and SEO Check consume it (2026-10-16).
- [x] Home page, pass 2 (2026-10-16): pricing section removed (tiers stay in `src/content/pricing.ts` for `/pricing`); hero re-headed around researched, sourced data; CTAs are working destinations only (free SEO check + explore anchor — no signup CTA until auth lands); customer-logo cloud replaced by the six-surface coverage marquee; footer text-only until real link destinations exist; hero + preview motion shipped under the new motion rules (design-system §4).
- [ ] Which 3–5 competitors get comparison pages first.
- [ ] Top 10 integrations for page one — seeded with Slack, GA4, Search Console, Looker Studio, and Zapier (home FAQ); confirm the remaining five.
- [ ] Content pipeline for blog/docs bodies (MDX at build time vs CMS) — affects `body` field type.
- [ ] Docs on main domain vs subdomain (indexing + sitemap consequences).

---

## 16. Reference page — `/ai-crawlers` (added after the initial template pass)

High-accuracy, frequently-updated reference content — exactly what AI engines, agent tooling, and bloggers retrieve and cite (see `docs/geo-research.md`). Implemented in `src/content/ai-crawlers.ts`.

- **Index**: index, follow. **Schema**: `TechArticle` + `FAQPage` + `BreadcrumbList`.
- **Title formula**: `{Topic}: The Complete Reference | Seobot`.
- **Accuracy rules**: vendor-documented facts only; every claim traces to a source (`SourceRef`); re-verify quarterly and bump `lastUpdated` (which drives `dateModified`).
- **Shape**: definition → key stats (sourced) → structured records table → copy-paste config → verification checklist → FAQ → sources.
- Cross-link with related glossary terms (§11); together they own the definitional/entity layer.
