# SEO Best Practices Research — Seobot Site + App

> Research compiled October 2026. Sources listed at the bottom. This document drives what content to build and what technical decisions the design system needs to accommodate.

---

## TL;DR — what matters most for us

1. **A client-rendered Vite SPA is invisible to most crawlers.** Google renders JS eventually (second-pass, days–weeks late), but AI crawlers (GPTBot, PerplexityBot, Claude-SearchBot) largely **do not execute JavaScript at all**. Build-time prerendering (SSG) of all marketing routes is the single highest-leverage technical decision before any content work.
2. **Build "money pages" before a blog.** Product, pricing, feature, integration, use-case, and comparison pages capture buyers who are ready to act. Blog content supports them via internal links.
3. **AI search ("GEO") is 90% the same discipline as good SEO in 2026.** Google's official position: AI Overviews/AI Mode are grounded in core Search ranking — no special files, markup, or "chunking" required. What wins citations: definition-first paragraphs, stats, tables, comparisons, original expertise, and being mentioned in "best of" listicles.
4. **Every template needs a defined SEO contract**: one title formula, one H1, meta description, self-referencing canonical, robots directive, structured data type, and CTA. Build these into the page templates, not bolted on later.
5. **Core Web Vitals budgets belong in the design system**: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 (at p75, mobile). Self-hosted variable fonts (already doing — Geist via Fontsource) and low-JS, CSS-driven motion help.

---

## 1. The 2026 landscape: three surfaces to optimize for

| Surface | Who crawls it | What it rewards |
|---|---|---|
| **Classic Google Search** | Googlebot (renders JS, with delay) | Helpful content, technical health, links, CWV |
| **AI search (ChatGPT, Perplexity, Gemini, AI Overviews)** | Mostly raw HTML only; some use search APIs | Crawlable HTML, clear entities, quotable stats/definitions, listicle mentions |
| **Agentic browsing** (emerging) | Browser agents (DOM, a11y tree, screenshots) | Semantic HTML, layout stability, `llms.txt` (Chrome Lighthouse now checks it) |

Key data points:
- ~13% of top-5,000 sites currently block at least one AI **search** crawler (PerplexityBot 13.0%, Claude-SearchBot 9.0%, OAI-SearchBot 8.7%); GPTBot is blocked by 19.3%. **We must not accidentally do this** — for an SEO product, being invisible to AI answers is a credibility problem.
- In AI answers, ~**78% of cited sources are corporate websites**; the single most-cited content format is the ranked **"best-of" listicle (~21% of citations)**; YouTube leads non-corporate sources.
- GEO research (Princeton/Georgia Tech, arXiv) found up to **40% visibility lift** from: citing sources with quotes, adding statistics, and fluency optimization. Keyword stuffing did *nothing*.

---

## 2. Technical foundation (React + Vite + Tailwind v4)

### 2.1 Prerendering is existential — decide this first

What ships today: a raw `index.html` shell with an empty `#root`. That means:
- Social/AI crawlers see **no title, no description, no content** for any route other than what's hardcoded.
- Google sees content only after JS execution — typically a **second crawl wave, days to weeks later**.
- Non-JS AI crawlers see **nothing** on every route.

**Recommended approach: build-time prerendering (SSG) for all marketing routes.** Options evaluated:

| Option | Trade-off | Verdict |
|---|---|---|
| **Vike** (vite-plugin-ssr successor) | Full framework; partial prerender, SSR later if needed | Strong if we want a framework |
| **Custom prerender script** (puppeteer-core after `vite build`) | ~150 lines, no framework lock-in, scales to a few thousand pages | Good for lean start |
| **vite-plugin-prerender-static** | Turns the Vite build itself into an SSG via a `render(route)` callback | Simplest; newer/less proven |
| **React Router v7 framework mode** | Static pre-render + file routing built in | Bigger migration |
| **React 19 `react-dom/static` APIs** | `prerender()` / `prerenderToNodeStream()` render routes to HTML at build time | The "primitives" path all of the above use |

The SPA still hydrates on top — users get the same app experience; crawlers get complete HTML. The **app** (behind login) can stay a pure client-side SPA; only marketing/docs routes need prerendering.

### 2.2 Meta/head management must be prerender-safe

- Page titles/meta must be **rendered synchronously during render** (not in `useEffect`) so the prerenderer captures them. Pattern: a `<Seo>` component or `usePageSeo()` hook that upserts `document.title`, meta tags, canonical, and JSON-LD during render.
- This should be a first-class part of the design system — every page template consumes it. **Flag for the parallel session: a `Seo`/`PageMeta` primitive with typed props (title, description, canonical, ogImage, jsonLd, robots).**
- Router: use History API routes (`/features/audits`), never hash routes (`#/features`) — hash URLs are unreliable for Googlebot discovery.
- Soft 404s: client-side "not found" views must either redirect to a real 404 or set `noindex`.

### 2.3 Indexation rules

- **Marketing site** (`seobot.example`): everything public is indexable, self-referencing canonicals.
- **App subdomain** (`app.seobot.example`): `noindex` + robots.txt disallow; target is *zero* results for `site:app.seobot.example`. Login, dashboard, onboarding, settings, checkout — all noindex. Don't let account screens pollute brand SERPs.
- **Staging**: blocked by robots.txt *and* auth — remember the classic failure where a staging robots.txt ships to prod.
- One canonical URL per page; consolidate query params (`?ref=`, `?utm_`) via canonical; no trailing-slash duplicates.
- Sitemap: only canonical, indexable, 200-status URLs. Auto-generate it at build time from the route manifest.
- Docs: if docs live on a subdomain, they need their own sitemap submitted and their own robots.txt checked.

### 2.4 Core Web Vitals budgets (design-system enforced)

| Metric | Target (p75) | What protects it in our stack |
|---|---|---|
| **LCP** | ≤ 2.5s | Static HTML (fast TTFB), hero image `fetchpriority="high"` + explicit dimensions, preloaded fonts, minimal critical CSS (Tailwind v4 emits small CSS), CDN |
| **INP** | ≤ 200ms | Low client JS on marketing pages, no heavy client hydration for static content, break up long tasks, small DOM |
| **CLS** | ≤ 0.1 | Explicit `width`/`height` on images, `font-display: swap` + fallback metrics (Fontsource handles this), reserve space for embeds, animate only `transform`/`opacity` (our tokens already do), never inject above-fold content post-load |

Notes for the design system:
- Motion tokens (`rise-in`, `dialog-in` etc.) already animate only transform/opacity — keep it that way for anything above the fold.
- Avoid scroll-triggered reveal animations that hide LCP content (e.g., IntersectionObserver-gated hero text). Content should be visible in raw HTML, animate *on top* of it.
- Theme flash script in `index.html` is inline-blocking by design — it's tiny and prevents CLS/FOUC; keep it that way. Also extend it to write the correct `theme-color` per scheme.

### 2.5 HTML head hygiene (current `index.html` is a shell)

What index.html needs (now, and per-route once prerendering lands):
- `meta name="description"` (missing today)
- Open Graph + Twitter card tags (`og:title`, `og:description`, `og:image` 1200×630, `twitter:card`)
- `<link rel="canonical">` per route
- `<html lang="en">` ✓ (already present)
- JSON-LD (`Organization`, `WebSite` + `SearchAction` at minimum)
- Favicon set: SVG ✓ + `apple-touch-icon`, `site.webmanifest` eventually
- `robots.txt` + `sitemap.xml` in `public/` (generated at build)
- Title formula for pages: `[Feature/Page] — [Benefit/Differentiator] | Seobot` (keep under ~60 chars where possible)

---

## 3. Content architecture: build money pages first

The consensus playbook for SaaS (multiple 2026 sources agree): **start with pages closest to revenue**, then expand education content.

### 3.1 Page inventory (priority order)

| # | Template | URL | Query intent | Schema | Notes |
|---|---|---|---|---|---|
| 1 | Home | `/` | Brand + category | `Organization`, `WebSite`, `SoftwareApplication` | Definition-first: first paragraph answers "What is Seobot?" in 2–3 sentences, entity bolded |
| 2 | Pricing | `/pricing` | `seo bot pricing`, commercial | `SoftwareApplication` + `Offer`, `FAQPage` | Pricing transparency ranks + converts; never gate; FAQ addresses objections |
| 3 | Feature pages (one per capability, not one "features" page) | `/features/[feature]` | `[feature] software/tool` | `SoftwareApplication`, `BreadcrumbList` | Problem → how it works → proof → pricing transparency → CTA |
| 4 | Integrations | `/integrations/[tool]` | `[tool] integration/seo` | `BreadcrumbList` | Top-10 partners; each ≥300 unique words or noindex (avoid thin programmatic pages) |
| 5 | Use cases | `/use-cases/[job]` | `seo for [segment]` | `BreadcrumbList` | e.g., agencies, e-commerce, indie hackers |
| 6 | Comparisons / alternatives | `/vs/[competitor]`, `/alternatives/[tool]` | `[competitor] alternative`, `A vs B` | `FAQPage`, `BreadcrumbList` | High dup-risk — unique content per page, careful canonicals |
| 7 | Blog / resources | `/blog/[slug]` | TOFU informational | `Article` + `BreadcrumbList` | Supports money pages via internal links; not the starting point |
| 8 | Docs / help | `/docs` (or subdomain) | Support + long-tail | `BreadcrumbList` | Often accidentally noindexed — audit it |
| 9 | Changelog | `/changelog` | Freshness signal | — | Frequently noindexed by accident; keep indexable |
| 10 | Glossary / templates | `/glossary/[term]` | Definitions AI engines cite | `DefinedTerm` (optional) | "What is X?" pages are GEO gold when definition-first |

App routes (login, dashboard, settings, onboarding, billing): `noindex`, excluded from sitemap.

### 3.2 Funnel keyword mapping (TOFU/MOFU/BOFU)

- **TOFU** (learn): "what is technical SEO", "seo audit checklist", "how to track rankings" → glossary/blog.
- **MOFU** (evaluate): "best SEO automation tools", "Seobot vs [X]", "[X] alternatives", "SEO tool for agencies" → comparisons, use cases, listicles.
- **BOFU** (decide): "Seobot pricing", "SEO bot free trial", "[feature] software" → pricing, features, integrations.
- One keyword cluster per page; never let two pages target the same head term (cannibalization). Track rankings at 200–500 keywords grouped by funnel stage.

### 3.3 On-page contract per template

Every indexable page must have:
1. **One H1** stating the value proposition (not a question, not the brand name alone).
2. **Definition-first opening** — 2–3 sentences answering "what is this?" that an AI engine can quote. Keep it tight and factual.
3. **Descriptive H2/H3s** — benefit-led, not "Benefits"/"Features".
4. Meta description ~150–160 chars, persuasive, with a concrete next step ("Free 14-day trial, no credit card required").
5. Internal links: each new page links to 2–4 relevant pages (money pages first); pillar pages link out to 5–15 cluster posts.
6. At least one **table or structured comparison** in long-form content (AI engines preferentially extract tables).
7. Stats and quotes with attribution (GEO research: quotes + statistics are the biggest visibility levers after fluency).
8. A CTA matched to the funnel stage (comparison pages → trial; sales-led pages → demo — don't mix).
9. Visible last-updated date on content pages (freshness/trust signal).

### 3.4 Programmatic-page guardrails (integrations, use cases, comparisons)

- ≥300 unique words per page or noindex/merge.
- Unique title + meta per page from the template — never "Integrations | Seobot" × 40.
- Self-referencing canonicals; watch for near-duplicate variants.
- Hub pages that link out to the whole set (discovery compounds indexation).
- Never generate pages for fan-out query variants purely to capture AI queries — that's Google's scaled-content-abuse line.

---

## 4. Structured data plan

Google requires markup to **match visible content exactly**. Apply per template:

| Template | JSON-LD |
|---|---|
| All pages | `Organization` (sitewide, with `sameAs` → LinkedIn, X, GitHub, Crunchbase) |
| Home | + `WebSite` (with `SearchAction`), `SoftwareApplication` |
| Pricing / features | `SoftwareApplication` (`name`, `offers.price` — 0 allowed for free tier; `applicationCategory: BusinessApplication`; `operatingSystem`) + `Offer` |
| Any page with visible Q&A | `FAQPage` (byte-identical to visible text) |
| All pages | `BreadcrumbList` matching real hierarchy |
| Blog | `Article` (author, datePublished, dateModified) |

Notes:
- `SoftwareApplication` needs `name` + either `offers.price` or a rating/review. Use `WebApplication` subtype for a web app.
- Structured data is **not** required for AI Overviews eligibility (Google says so explicitly) — it's for rich results. Still worth it: star ratings/pricing in SERPs lift CTR ~20–30%.
- Validate with Rich Results Test; re-validate per template after any change.

---

## 5. GEO / AI search layer — what actually works vs. myths

### Do (works for both Google and AI engines)
- Crawlable, non-JS HTML of all content (prerendering — again, existential).
- Definition-first paragraphs, entity-rich copy (name competitors, integrations, industries, founder).
- Tables, structured comparisons, stats, sourced quotes.
- Original research and first-hand experience (Google's "non-commodity content" doctrine — this is also E-E-A-T).
- Get included in fair "best-of" listicles and review platforms (G2, Capterra) — the most-cited format in AI answers.
- Clean semantic HTML (helps Google, AI, *and* agentic browsers).
- `robots.txt`: allow AI **search** crawlers — `OAI-SearchBot`, `PerplexityBot`, `Claude-SearchBot` (they decide whether ChatGPT/Perplexity/Claude can cite us). Train-only crawlers (`GPTBot`, `CCBot`, `Google-Extended`) are a policy choice; blocking search crawlers while allowing Googlebot = "visible in Google, invisible in AI answers".

### Ignore (Google's own mythbusting, July 2026)
- ❌ `llms.txt` and other "special" AI files — **Google Search ignores them**. They're experimental for agents (Chrome Lighthouse now *checks* for one), and studies (Ahrefs 137k domains: 97% of files got zero crawler traffic; SE Ranking 300k domains: no citation impact) show near-zero effect today. **Status: optional, zero-risk, low-value.** We can ship one as a cheap signal for agentic tools, but it's not a priority and must not distract from prerendering.
- ❌ "Chunking" content for AI — unnecessary.
- ❌ Rewriting copy in an "AI-friendly" style or chasing every fan-out query.
- ❌ Inauthentic mentions/links — actively risky.
- ❌ "Overfocusing on structured data" for AI — no special schema exists.

### Measurement
- Search Console: **Generative AI performance report** (new) + AI Overview impressions in the Performance report.
- Weekly manual spot-check: 30–50 buyer prompts across ChatGPT/Perplexity/Gemini, count citations of our domain.
- GSC property must be opted into generative AI features for eligibility metrics.

---

## 6. Off-page & authority

- Patterns that still work: product mentions, comparison roundups, brand citations in AI training data, founder-led community participation, digital PR/data assets, partner (integration) content.
- Mass guest posting has diminishing returns; inauthentic mentions are spam-risk.
- Priority targets: 3–5 direct competitors' "alternatives" pages, category listicles, review platforms (G2/Capterra profiles — they feed AI answers).

---

## 7. Measurement stack

| Cadence | What |
|---|---|
| Weekly | GSC (indexation, queries), rankings by intent cluster, conversion events from organic, broken links |
| Monthly | Technical crawl (Screaming Frog/Sitebulb), content refresh of decaying pages, AI citation spot-check, keyword priorities |
| Quarterly | Content decay audit, backlink quality, topic-cluster coverage, revenue attribution |

Track: organic sessions, **trials/signups from organic**, pipeline from organic, AI citation volume, share of voice vs. competitors. Rankings without conversion attribution don't count.

---

## 8. Immediate action list (ordered)

1. **Decide the prerendering strategy** (Section 2.1). Everything else in this doc is capped by this. Cheapest credible path: build-time prerender script or `vite-plugin-prerender-static`; strongest long-term: Vike or React Router v7.
2. ~~**Add a `Seo`/`PageMeta` primitive to the design system** (typed props, render-time writes, JSON-LD). Needed by every template.~~ **Shipped 2026-10-16**: `src/components/seo.tsx` — React 19 hoists title/meta/canonical/OG into `<head>` during render; JSON-LD renders with the page. Landing and SEO Check consume it.
3. **Fill in `index.html`** (description, OG/Twitter, canonical, Organization+WebSite JSON-LD) and add `robots.txt` + sitemap generation. (`robots.txt` + `llms.txt` exist; head tags and sitemap land with the prerender pipeline.)
4. **Define page templates + content models** for the 10 templates in Section 3.1 — each with title formula, H1 rule, schema, CTA.
5. **Write the 5 money pages first**: Home, Pricing, 2–3 feature pages, 1 comparison page.
6. **Noindex the app subdomain** and verify with `site:` search.
7. Blog/glossary after money pages exist; comparisons + integrations second wave.
8. Set up GSC + GA4 conversion events before launch; opt into generative AI reporting.

---

## Sources

**Official (Google)**
- Optimizing for generative AI features in Search (Google Search Central, 2026) — developers.google.com/search/docs/fundamentals/ai-optimization-guide
- JavaScript SEO basics — developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- Software app structured data — developers.google.com/search/docs/appearance/structured-data/software-app
- Core Web Vitals & thresholds — web.dev/articles/vitals, web.dev/articles/defining-core-web-vitals-thresholds, developers.google.com/search/docs/appearance/core-web-vitals

**Core Web Vitals optimization**
- web.dev: Optimize LCP, Optimize INP, Optimize CLS, Most effective ways to improve CWV

**SaaS SEO playbooks (2026)**
- AY Rank — SaaS SEO Checklist 2026 (60-point + GEO section)
- Illucrum — SaaS SEO Checklist (54 checks; app subdomain rendering checks)
- The Stacc — SaaS SEO Audit step-by-step (template-by-template audit tables)
- querymint, AuspiaAI, Monolit, Pristren — technical/on-page SaaS checklists

**GEO / AI search**
- arXiv:2311.09735 — GEO: Generative Engine Optimization (Princeton et al.)
- arXiv:2606.20065 — GEO at Scale: Measuring Brand Visibility Across AI Search Engines (2026)
- AI Crawler Census Q3 2026 (crawler blocking statistics)

**llms.txt evidence**
- Ahrefs study via dev.to (137,210 domains); SE Ranking study (300,000 domains); Search Engine Land (Lighthouse agentic audits)

**Vite/SPA prerendering**
- Vike pre-rendering docs; Vite build/SSR guides; community case studies (Puppeteer prerender pipelines, react.dev static prerender APIs)

---

## 9. Semantics, page structure & information architecture — research pass (Oct 2026)

Companion to `geo-research.md` §3 (citation pipeline) and the factor DB entries `geo.extract.semantic-html`, `geo.render.landmarks`, `geo.render.heading-hierarchy`, `ia.*`. New first-party evidence: `research/data/semantics-study.json` (59 pinned Tranco top-500 homepages, raw vs. rendered).

### 9.1 Semantics that matter (HTML + schema)

1. **Landmark regions bound main content.** `<main>`, `<nav>`, `<header>`, `<footer>`, `<article>` are the single biggest extraction aid for AI engines and agentic browsers. Our audit: only 42% of top sites expose `<main>`, 39% `<nav>`, 36% `<header>`, 39% `<footer>` in raw HTML (rendered counts are higher — JS-injected landmarks). Netpeak: 80%+ semantic markup indexes 25–40% quicker. Momentic/LLMrefs: >70% semantic compliance → 2.8× citation rate in Perplexity/Gemini for entity queries.
2. **One H1, valid sequence.** 53% of audited top sites had exactly one H1; only 39% had a non-skipping heading outline in raw HTML (rendered: 53% / 26%). Headings are the chunking contract — invalid outlines break passage extraction.
3. **Schema must match visible content.** JSON-LD present on 32% (raw) / 37% (rendered) of audited sites; types stable across passes where present (mostly server-rendered). Ahrefs controlled test + LLMrefs: schema spam and conflicting signals are anti-patterns; field-level parity is the bar.
4. **Meta + social cards.** Canonical 49%, OG title 64%, OG image 47%, viewport 81%, lang 76% adoption in raw HTML on top sites. Gaps here are cheap wins.
5. **Alt text.** 3.6% of raw images (43/1207) lacked alt; 5.3% after render (JS-injected images are worse). Alt is the only text fallback for image content.
6. **Skip links.** 19% adoption — a low-cost accessibility + agent signal.

### 9.2 Page structure best practices

- **Answer-first sections:** lead each section with a 40–60 word direct answer; use definition-first phrasing; keep one topic per section (`geo.extract.answer-first-sections`, `geo.extract.single-purpose`, `geo.extract.thin-guard`).
- **Tables for comparison/decision content.** Real HTML `<table>` with `<th>`/`<caption>` — AI engines lift tables verbatim; our audit found tables on only 2/59 top homepages (deep pages are the real target).
- **FAQ blocks with parity.** FAQPage schema must mirror visible Q&A; `details`/`summary` or heading+paragraph both work; 1/59 top sites used `<details>` on the homepage.
- **Quotable captions.** Every chart/stat gets one standalone sentence with number + unit + source + year (content-models §14).

### 9.3 Information architecture best practices

- **Click depth ≤ 3** from home for money pages; orphan-page elimination; hub-and-spoke topic clusters with a pillar page.
- **Persistent, crawlable nav** as real `<a href>` (not buttons/JS) — AI crawlers execute no JS; our IA factor `ia.navigation-persistence` covers this.
- **Breadcrumbs** in HTML + BreadcrumbList schema (only ~2% adoption on homepages in our audit; check deep pages).
- **Clean hierarchical URLs** (lowercase, hyphenated, no opaque IDs).
- **XML sitemap** covering all indexable pages with lastmod, as the fallback discovery path.
- **Internal linking** with descriptive, entity-rich anchor text; vary anchors across similar pages; fix broken/outdated links on a schedule.

### 9.4 First-party evidence summary

`research/data/semantics-study.json` — 59 sites, Oct 17 2026, CC BY 4.0. Headlines:
- Landmark adoption (raw): main 42%, nav 39%, header 36%, footer 39%, article 2%, section 36%.
- Single H1 53%; valid heading sequence 39%; multiple H1 8%.
- JSON-LD 32% raw / 37% rendered; canonical 49%; OG title 64%; OG image 47%; viewport 81%; lang 76%; skip link 19%.
- Semantic ratio (landmark tags / total elements) median 0.65% raw / 0.77% rendered — landmarks are rare relative to div soup.
- Images missing alt: 3.6% raw, 5.3% rendered.

### 9.5 Open gaps

- Homepage-only sample; deep/money-page pass needed for breadcrumbs, tables, FAQ adoption.
- Rendered pass shows JS-injected landmarks/content that raw crawlers never see — supports the JS-wall finding.
- Heading coverage is noisy on dynamic pages; normalize (n-gram) before publishing.
