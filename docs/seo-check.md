# SEO Check — On-Site Assessment Tool (P0 Spec)

> **The first shipped version of the audit engine — deliberately serverless.** Everything runs in the visitor's browser on the marketing site. No crawler, no queue, no database, no auth.
>
> **Scope rule:** proof of concept, production quality — typed catalog, shared rule IDs with the future automated engine, a11y + perf budgets, honest scoring. The automated upgrade (P1) swaps the evidence source and reuses everything else.
>
> Companions: `audit-engine.md` (full rule catalog, scoring math, future tiers), `content-models.md` (page templates), `geo-research.md`.

---

## 1. Why this shape

- **Zero infrastructure**: static Vite build → Vercel. Nothing to operate, nothing to leak.
- **The growth loop**: free personalized report → email capture (optional) → product CTA. The tool *is* a content asset: an honest, visualized, prioritized self-audit nobody else frames this way.
- **The upgrade path is free**: every question maps to a rule ID from the automated engine's catalog. When P1 adds crawling/GSC, the same report component renders both.

## 2. Non-goals (explicit)

- **No fetching the visitor's site.** CORS + no backend = impossible, and pretending otherwise breaks trust. (Deep links to Google's own tools do the fetching — see §7.)
- **No fake data.** No invented benchmarks ("average site scores 62"), no syndicated percentiles, no usage counters unless real. We can add real benchmarks only once real data exists.
- **No account. Nothing leaves the browser.** That promise is a feature — put it in the hero copy.

## 3. Flow

1. **Start** — `/seo-check`: "Your personalized SEO plan in 2 minutes. Runs in your browser — nothing is uploaded."
2. **Basics** — site URL (optional), site type (required — sets profile weights + branch questions).
3. **Questions** — one per screen, grouped by layer, progress + section label, back/forward, "Not sure" always an option.
4. **Reveal** — score ring + verdict + biggest gap. Email optional for: full roadmap persist, score-card PNG, PDF (print).
5. **CTA** — "Want this done automatically every week?" → trial / demo.

## 4. Question catalog (v2 — 18 questions: 15 core + 3 branch; 14–15 per visitor)

Each question **is** a rule: `id` is shared with the automated engine's catalog (`audit-engine.md` §6). Answer → score; `No` → fix task; `Not sure` → "verify" task (2-minute check, may convert to a fix).

**v2 (2026-10-18)** cut the quiz from 21–23 questions to 14–15 and added the two gates our top-500 study measured. Merged: sitemap → `setup.gsc`; `site:` search → `idx.noindex`; reporting → `setup.analytics`; keyword map → `cnt.dedicated-pages`; link awareness → `aut.link-earning`; mobile → `prf.cwv`. Cut: `idx.nav-links`, `cnt.freshness` (folded into `cnt.qa-coverage` fix steps), `cnt.cadence`, and the second branch question per site type. `check:seo-check` enforces 14–16 questions per site type.

### Layer 0 — Setup & measurement (`setup.*`)

| id | Question | Sev | Effort | Deep link |
|---|---|---|---|---|
| `setup.gsc` | Verified in Search Console, with a sitemap submitted? | 4 | quick | Search Console |
| `setup.analytics` | Organic traffic tracked, and reviewed at least monthly? | 3 | quick | — |

### Layers 1–2 — Crawlability, access & indexability (`idx.*`)

| id | Question | Sev | Effort | Deep link |
|---|---|---|---|---|
| `idx.robots` | Is robots.txt free of `Disallow` rules on important pages? | 5 | quick | your `/robots.txt` |
| `idx.noindex` | Key pages indexed (`site:` search) and free of `noindex`? | 5 | quick | prefilled Google query |
| `idx.js-gated-content` | With JavaScript off, does the main content still appear? | 5 | involved | — |
| `idx.bot-walls` | Does the site respond normally to bots (no WAF/CDN block)? | 5 | moderate | — |

`idx.js-gated-content` and `idx.bot-walls` come from the top-500 study (35% of sites unreadable to a non-rendering client; 26% returned a wall or empty shell to a non-browser client, 100 of them with robots.txt open to AI retrieval crawlers). They are gates in the research (`geo.render.server-html`, `geo.access.bot-walls`), so they live in the gated `indexability` category and rank first.

### Layer 3 — On-page & content (`onp.*`, `cnt.*`)

| id | Question | Sev | Effort | Deep link |
|---|---|---|---|---|
| `onp.titles` | Unique, searcher-written titles + descriptions on key pages? | 4 | quick | — |
| `cnt.dedicated-pages` | Each key topic has its own page aimed at one target query? | 4 | moderate | — |
| `cnt.qa-coverage` | Key pages answer up front, with specific numbers and sources? | 3 | moderate | — |
| `cnt.comparison-pages` *(SaaS)* | Do you have vs/alternatives pages? | 3 | moderate | — |

### Layer 4 — Authority (`aut.*`)

| id | Question | Sev | Effort | Deep link |
|---|---|---|---|---|
| `aut.link-earning` | Know who links to you, and actively earning more? | 3 | involved | — |

### Layer 5 — Experience (`prf.*`)

| id | Question | Sev | Effort | Deep link |
|---|---|---|---|---|
| `prf.cwv` | Passes Core Web Vitals and feels quick on a phone? | 4 | moderate | PageSpeed Insights, prefilled with URL |

### Layer 6 — AI visibility (`geo.*`) — the differentiator

| id | Question | Sev | Effort | Deep link |
|---|---|---|---|---|
| `geo.ai-crawlers` | Does robots.txt let AI search crawlers in (OAI-SearchBot, PerplexityBot, Claude-SearchBot)? | 4 | quick | your `/robots.txt` |
| `geo.brand-answers` | Does your brand appear in ChatGPT/Perplexity answers for category questions? | 3 | moderate | — |

### Trust & hygiene (`trs.*`)

| id | Question | Sev | Effort |
|---|---|---|---|
| `trs.pages` | Visible About, Contact, and Privacy pages? | 2 | quick |

### Branch packs (site type)

- **Ecommerce**: `ecom.product-schema` (Product/Offer schema, sev 3)
- **Local**: `lcl.gbp` (Business Profile claimed and complete, sev 4)
- **Publisher**: `pub.authors` (author bios / E-E-A-T, sev 3)

## 5. Scoring

- Answer score: **Yes = 1 · Not sure = 0.5 · No = 0**.
- Category score = severity-weighted mean of its answers × 100.
- Overall score = profile-weighted mean of category scores.

| Category | SaaS | Ecom | Local | Publisher |
|---|---|---|---|---|
| Setup & measurement | 10 | 10 | 10 | 10 |
| Crawlability & indexability | 20 | 20 | 20 | 20 |
| On-page & content | 25 | 20 | 15 | 30 |
| Authority | 10 | 10 | 15 | 10 |
| Experience (CWV) | 20 | 25 | 20 | 15 |
| AI visibility | 10 | 5 | 10 | 10 |
| Trust & hygiene | 5 | 10 | 10 | 5 |

- **Confidence meter**: driven by unanswered + "Not sure" density → Low / Med / High, shown **next to** the score. A score computed from mostly-guesses is labeled as such. (Production honesty.)
- **Priority bands**: layer gate first (`setup.*` and `idx.*` findings always ahead), then rank by `severity × 2 − effortPoints` → **Fix now / This month / Later**.
- **No click/traffic math in P0** — impact is qualitative (severity), and the UI says so. Volume-based estimates wait for P1's real data.

## 6. Report spec (the data visualization)

Big, obvious sections — eyebrow → title → description, then content — separated by generous spacing:

1. **Header (score hero)** — score ring (0–100, `ui/progress` `ProgressRing` with banded stroke), verdict sentence, confidence chip, "for `acme.com` · SaaS", fix/verify counts.
2. **Results** — "How you answered" (`SegmentBar`: yes / not sure / no) and "Score by area" (`MeterList`, 7 categories, banded colors), each wrapped in `ChartFrame` with a sourced caption and a no-JS table view of the same numbers.
3. **Biggest gap callout** — the highest-priority `No` in a gated category.
4. **Run these checks now** — deep-link panel: prefilled `site:` query, PageSpeed analysis for their URL, their `robots.txt`. One click each, browser-side.
5. **Roadmap** — three groups (**Fix now / This month / Later**) of action cards: title, why it matters, 2–3 step fix, effort chip, deep link. "Verify" tasks (from *Not sure*) styled distinctly. Search (text) + filters (type: all/fix/verify; area) narrow the list in place; empty state offers a clear. No CTA band in the report.
6. **Share** (phase 2) — score-card PNG (canvas) + link with answers encoded in the URL fragment.

Charts: **inline SVG over design tokens, no chart library** (perf + a11y controls). Report graphics are design-system primitives (`ui/progress` `ProgressRing`, `ui/segment-bar` `SegmentBar`, `ui/meter-list` `MeterList`) shown inside `ui/chart-frame` `ChartFrame`.

## 7. The URL's role (the "passthrough", simplified)

The URL the visitor types is **never fetched**. It:
1. **Personalizes** the report ("Your report for acme.com").
2. **Prefills deep links to Google's own tools** — PageSpeed analysis, `site:` search, robots.txt view. The *browser* makes those requests, in a new tab, with full user context.
3. **Becomes the conversion hook** for P1: "Automate weekly checks for acme.com →"

## 8. Production requirements (what "treat it as production" means here)

- **Typed catalog** — `src/content/seo-check.ts` with an `AssessmentQuestion` interface; engine in `src/lib/audit/` as pure functions sharing rule IDs with the automated catalog.
- **A11y** — radiogroup semantics, focus management between steps, `aria-live` progress + score reveal, keyboard-complete, color-blind-safe score bands.
- **Perf budget** — route-level lazy load; report bundle small; no chart lib; print stylesheet for PDF.
- **Privacy copy** — "runs in your browser, nothing uploaded" must stay true; analytics (Vercel Analytics events: `seo_check_started`, `question_answered`, `report_viewed`, `cta_clicked`) sends no answers.
- **Honesty guardrails** — no invented benchmarks; *Not sure* is surfaced, not punished; clear self-assessment-vs-automated-audit disclaimer.
- **Validation script** — extend the `check:*` pattern: `check:seo-check` verifying every question has fix + verify copy, ids unique, deep-link builders encode URLs safely.

## 9. Repo placement & build order

```
src/content/seo-check.ts        question catalog + copy + deep-link builders
src/lib/audit/types.ts          Rule, Finding, Answer, Impact (shared with P1)
src/lib/audit/score.ts          scoring, confidence, priority bands, answer breakdown
src/components/assessment/*     QuestionStep (wizard), ActionCard, ReportView
src/components/ui/*             report graphics as kit primitives: ProgressRing, SegmentBar, MeterList, ChartFrame
/seo-check route                first fully-composed marketing page
```

Build order: **catalog → engine (+ validation) → wizard → report → route wiring** (coordinate page assembly + router with the design-system session).

## 10. Upgrade path

P1 replaces `answersAsEvidence()` with crawl/GSC evidence against the same rule IDs; report components, scoring, and fix copy render identically. The free tool becomes the front door of the app ("you scored 47 — Seobot can raise that automatically").
