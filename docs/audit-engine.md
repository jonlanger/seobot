# Audit Engine — Inputs, Scoring & Recommendation Design

> The engine behind the home-page promise: *"Paste your URL → prioritized audit → ship fixes → watch rankings climb."*
> Covers: the scoring formulas, the input tiers (URL-only → connected), the onboarding questionnaire, the rule catalog, and the Vercel deployment reality.
>
> Companions: `seo-research.md` (what ranks), `geo-research.md` (AI-search layer), `content-models.md` §12 (app surfaces), `src/content/ai-crawlers.ts` (our own crawler reference — on brand).

---

## 1. The causal model — what "improving SEO" actually is

Ranking is the output. The **layers** are the levers, and they gate each other in order:

| # | Layer | Question it answers | Levers | Detectable from |
|---|---|---|---|---|
| 1 | Discoverability | Can crawlers find the pages? | robots.txt, sitemaps, internal links, no orphans | URL crawl |
| 2 | Indexability | Are they allowed in the index? | noindex, canonicals, status codes, redirects, duplicates | URL crawl |
| 3 | Relevance | Does the page match a real query? | titles, H1s, content depth, keyword→page mapping, schema/entities | crawl + keyword data (+ GSC) |
| 4 | Authority | Does it deserve to rank? | backlinks, internal link equity, E-E-A-T proxies | backlink data, crawl |
| 5 | Experience | Do users (and CWV) stay? | LCP/INP/CLS, mobile, stability | CrUX + Lighthouse |
| 6 | Citation | Do AI engines quote it? | AI-crawler access, entity clarity, quotable structure | crawl + AI-visibility APIs |

**Dependency rule for prioritization**: a finding on layer *n* is suppressed while a layer <*n* blocking issue affects the same URLs. Content work on a noindexed page is worth $0, and the engine must say so.

**CTA example**: "24 pages are blocked by robots.txt — nothing else on those URLs matters yet." That's the product's whole character: *the single next thing to fix.*

---

## 2. The formulas

Three numbers, three jobs. Only #2 and #3 should ever drive action ordering; #1 is for progress tracking.

### 2.1 Health score (0–100) — diagnosis

```
score = Σ_cat [ w_cat × ( Σ_rules sev × pass ÷ Σ_rules sev × 100 ) ]
```

Category weights shift by **site profile** (set by onboarding answers, step 2–3):

| Category | SaaS | Ecommerce | Local | Publisher |
|---|---|---|---|---|
| Technical / indexability | 25 | 20 | 25 | 20 |
| On-page | 15 | 20 | 25 | 15 |
| Content | 20 | 20 | 15 | 30 |
| Performance (CWV) | 20 | 25 | 15 | 15 |
| Authority | 10 | 10 | 10 | 10 |
| AI visibility (GEO) | 10 | 5 | 10 | 10 |

Rules carry severity 1–5; the subscore is severity-weighted pass rate. **Caveat to display honestly**: composite scores are estimates — the action list is the product, the score is the scoreboard.

### 2.2 Opportunity estimate — quantification

Per finding:

```
gain_mo ≈ Σ_queries [ volume × ( ctr_target − ctr_current ) ] × confidence
```

- **`ctr_current`**: site's *measured* CTR (GSC, per query×page) when connected; otherwise a position-curve prior **adjusted for AI Overview exposure**.
- **`ctr_target`**: the position the fix plausibly reaches (next band up, or a stated target like top-3).
- **Volume**: keyword provider (Tier 2+); without it, findings fall back to severity bands (no fake precision).

**Position-curve prior** (blended desktop/mobile, no AI Overview — calibrate to the site's own GSC data over time):

| Pos | 1 | 2 | 3 | 4 | 5 | 6–7 | 8–10 |
|---|---|---|---|---|---|---|---|
| CTR | ~28% | ~15% | ~10% | ~7% | ~5% | ~3% | ~1.5–2.5% |

**AI Overview multiplier** (the 2026 reality — CTR fell hard through 2025, partially recovered in early 2026, and *cited* brands out-click uncited ones):

- AIO exposure by intent (Seer, Feb 2026): comparison **95%**, question **86%**, informational **36%**, transactional **5%**.
- CTR shrink when an AIO is present: use a **35–58% band** (Ahrefs Dec 2025: −58% at pos 1, decaying down the page). Seer's early-2026 recovery (1.3% → 2.4%) bounds the low end.
- Citation premium: cited brands earn **+35% organic CTR** vs uncited on the same queries; AI-referred visitors convert ~23× better (Ahrefs, Jun 2025) — this number belongs in the GEO upsell copy.

**Confidence weights**: GSC-measured 0.9 · provider data 0.6 · heuristic 0.35. Always output a **range + confidence label** (`+120–400 clicks/mo · medium`), never a single pretend-precise number.

### 2.3 Priority score — action ordering

```
priority = gain_mid × confidence ÷ effort_pts        (effort: quick 1, moderate 3, involved 9)
```

Band the output: **Do now** (quick wins incl. unquantifiable-but-certain fixes like robots errors) → **This month** → **Backlog**. Layer-gate as in §1. The UI tells the same story as the marketing site: *"Your single next thing to fix: …"*

---

## 3. Input tiers

| Tier | Input | Provides | Unlocks | Cost/effort |
|---|---|---|---|---|
| **T0** | URL only | own crawl (pages, status, titles, canonicals…), robots.txt, sitemaps, TLS/DNS, PSI (Lighthouse), CrUX (field CWV if enough traffic) | ~30 of ~50 rules; instant audit, no auth, no per-user cost (PSI/CrUX are free — verify quotas) | crawl infra |
| **T1** | Google Search Console (OAuth) | queries×pages×clicks×impressions×CTR×position (16 mo), index coverage, sitemaps, CWV field data | striking distance, CTR outliers, cannibalization, decay; **quantified $ opportunities**; site's own CTR curve | OAuth + token storage |
| **T2** | Onboarding answers | goal, site type, market/language, CMS, implementer, money pages | weights, rule packs, CMS-specific fix instructions | 4–6 questions |
| **T3** | Keywords + competitors (SERP provider) | volumes, SERP composition (AIO present?), competitor overlap, ranking history | content-gap briefs (the thing we already sell), rank tracking | DataForSEO SERP $0.60/1K (standard queue) |
| **T4** | Backlinks (DataForSEO Backlinks API) | profile, anchors, new/lost, spam score | link reclamation, toxic cleanup | $0.024/task + $0.000036/row (~$0.06/1K rows) |
| **T5** | AI visibility (DataForSEO LLM Mentions / LLM Responses / AI Mode SERP) | whether AI engines mention/cite the brand for a prompt set | the "AI visibility tracking" feature on the roadmap | LLM Mentions API; AI Mode ~$1.20/1K |

Notes: **Ahrefs API is $1,499/mo Enterprise-only** → not viable at our scale; **Moz API** ($20+/mo, row-metered) is a fallback for link metrics. DataForSEO is the pragmatic primary — pay-as-you-go, $50 min deposit, also covers rank tracking + AI endpoints. Abstract all of it behind one `SearchDataProvider` interface so the vendor is swappable.

---

## 4. The onboarding questionnaire

**Principle: value before questions.** The scan starts the moment the URL is entered; questions are asked *while it runs* and sharpened progressively. Cap the pre-value set at 5.

| # | Question | Why the engine asks | Effect |
|---|---|---|---|
| 1 | **Site URL** | crawl target; auto-detects CMS from meta generator/paths (confirm in Q5) | starts audit |
| 2 | **Primary goal** (signups, sales, bookings, ad/pageviews, brand+AI visibility) | money-page heuristics + category weights | ranking model + CTA copy in fixes |
| 3 | **Site type** (SaaS, ecommerce, local, publisher, other) | selects the **rule pack** (Product schema vs local pack vs Article…) | weights table §2.1; rule relevance |
| 4 | **Market: country + language** | SERP locale, keyword volumes, hreflang checks | provider queries localized |
| 5 | **Who ships changes?** (founder / dev team / agency) + CMS confirm | calibrates "effort" and the *format* of fixes | step-by-step CMS instructions vs dev ticket with code |
| 6 | **Google Search Console connect** (offered *after* the instant report, with a "sharpen your report:" pitch) | the single highest-value input | unlocks Tier 1 — quantified opportunities |
| 7 | **1–3 competitors** (optional) | gap analysis + comparison content | Tier 3 |
| 8 | **Money pages / priority topics** (optional, pre-suggested from nav) | impact weighting | prioritization |

Verification: claiming a site for **full crawl / repeat audits** requires proof (file, meta tag, or DNS TXT; GSC connection doubles as verification). Unverified free audits get a capped crawl.

---

## 5. Rule engine architecture

Rules are **data**: pure `detect → finding` functions over normalized evidence, each with an impact model, an effort class, and a fix renderer (CMS-aware). Proposed home: `src/lib/audit/` in the app repo; can graduate to a package later.

```ts
interface SiteContext {
  url: string;
  goal: "signups" | "sales" | "bookings" | "traffic" | "brand";
  siteType: "saas" | "ecommerce" | "local" | "publisher" | "other";
  market: { country: string; language: string };
  cms: "wordpress" | "webflow" | "shopify" | "nextjs" | "custom" | "unknown";
  implementer: "founder" | "dev" | "agency";
  moneyPages?: string[];
  competitors?: string[];
}

/** Everything collected per audit, regardless of source tier. */
interface Evidence {
  context: SiteContext;
  crawl: CrawlResult;        // pages[], statuses, titles, canonicals, links, depth
  renderSample?: RenderDiff; // raw HTML vs rendered DOM, for JS-gating checks
  robots?: RobotsFile;
  sitemaps: SitemapReport;
  dns: DnsReport;
  psi?: PsiReport;           // Lighthouse lab data
  crux?: CruxReport;         // field Core Web Vitals
  gsc?: GscSnapshot;         // tier 1
  serp?: SerpSnapshot;       // tier 3
  links?: LinkSnapshot;      // tier 4
  ai?: AiVisibilitySnapshot; // tier 5
}

interface Finding {
  ruleId: string;
  urls: string[];            // affected
  severity: 1 | 2 | 3 | 4 | 5;
  title: string;             // "12 pages return a redirect chain"
  evidence: string[];        // human-readable proofs, per URL
}

interface Impact {
  gain?: { low: number; mid: number; high: number }; // clicks/mo, when modelable
  confidence: number;        // 0-1
  note?: string;
}

interface FixPlan {
  summary: string;
  steps: { text: string; for?: SiteContext["cms"][]; code?: { lang: string; snippet: string } }[];
  verify: string;            // "Re-run audit; finding should disappear"
  learnMore?: string;        // docs/blog link (content-plan hook)
}

interface Rule {
  id: string;                // "idx.noindex-unexpected"
  category: "technical" | "onpage" | "content" | "performance" | "authority" | "trust" | "geo";
  layer: 1 | 2 | 3 | 4 | 5 | 6;
  sourceTier: 0 | 1 | 3 | 4 | 5;
  detect(e: Evidence): Finding | null;
  impact(f: Finding, e: Evidence): Impact;
  effort: "quick" | "moderate" | "involved";
  fix(f: Finding, e: Evidence): FixPlan;
}
```

Findings persist per audit; scores recompute per run so the dashboard can chart **score over time** and closed findings (that's the retention loop, and it matches "Weekly/Daily audits" in pricing).

---

## 6. Rule catalog (v1 — ~48 rules)

Tier = minimum input needed. Severity drives the health score; effort drives priority.

### Indexability & crawl (T0)

| ID | Detects | Sev | Effort |
|---|---|---|---|
| `idx.robots-blocks-important` | robots.txt rules blocking nav-linked/money pages | 5 | quick |
| `idx.robots-missing-or-invalid` | no robots.txt / unparsable | 2 | quick |
| `idx.sitemap-missing` | no sitemap, or none referenced in robots.txt | 3 | quick |
| `idx.sitemap-stale-or-broken` | sitemap URLs that 404/redirect/noindex | 3 | quick |
| `idx.noindex-unexpected` | indexable-looking pages serving noindex (meta or header) | 5 | quick |
| `idx.canonical-foreign` | canonical points at a different domain/page | 4 | quick |
| `idx.redirect-chain` | >1 hop redirects, loops, http→https→www chains | 3 | quick |
| `idx.broken-internal-links` | 4xx targets of internal links | 4 | quick |
| `idx.5xx-sample` | server errors during crawl | 5 | involved |
| `idx.crawl-depth` | money pages >4 clicks from home | 3 | moderate |
| `idx.orphan-pages` | in sitemap but 0 internal links | 3 | quick |
| `idx.duplicate-clusters` | near-duplicate content (simhash) | 3 | involved |
| `idx.pagination-js-only` | paginated lists not linked in raw HTML | 3 | moderate |
| `idx.hreflang-issues` | multilingual sites: missing/conflicting hreflang | 3 | moderate |
| `idx.js-gated-content` | main content absent in raw HTML (render-diff sample) | 4 | involved |

### On-page (T0)

| ID | Detects | Sev | Effort |
|---|---|---|---|
| `onp.title-missing` | missing `<title>` | 4 | quick |
| `onp.title-duplicate` | identical titles across pages | 3 | quick |
| `onp.title-length` | >60 chars (truncation) / <30 (wasted space) | 2 | quick |
| `onp.description-missing-dup` | missing or duplicated meta descriptions | 2 | quick |
| `onp.h1-missing-multiple` | no H1 or multiple H1s | 3 | quick |
| `onp.alt-text-coverage` | image alt coverage < threshold | 2 | quick |
| `onp.anchor-text-generic` | "click here"-style internal anchors | 2 | quick |
| `onp.schema-missing` | expected schema by site type absent (Org on home, Product on PDPs, Article on posts) | 3 | quick |
| `onp.schema-invalid` | invalid JSON-LD / rich-result-ineligible | 3 | moderate |

### Content (T0 basic → T1/T3 quantified)

| ID | Detects | Sev | Effort |
|---|---|---|---|
| `cnt.thin-pages` | <300 words on indexable pages (excl. utility) | 3 | moderate |
| `cnt.striking-distance` | queries stuck at pos 5–20 with real impressions (GSC) | 4 | moderate |
| `cnt.ctr-outlier` | high impressions, CTR far below site curve → rewrite title/meta | 3 | quick |
| `cnt.cannibalization` | multiple pages competing for the same query (GSC) | 4 | involved |
| `cnt.decay` | pages losing impressions/clicks vs prior period | 3 | moderate |
| `cnt.competitor-gap` | competitor-ranked queries we don't cover (Tier 3) → **content brief** | 3 | involved |
| `cnt.entity-coverage` | topics where we rank for no entity-adjacent queries | 2 | involved |

### Performance (T0 — CrUX + PSI)

| ID | Detects | Sev | Effort |
|---|---|---|---|
| `prf.cwv-fail-lcp` | field LCP > 2.5s (p75, mobile) | 4 | moderate |
| `prf.cwv-fail-inp` | field INP > 200ms | 4 | involved |
| `prf.cwv-fail-cls` | field CLS > 0.1 | 4 | moderate |
| `prf.lcp-element` | LCP element diagnosis (unpreloaded hero, late font, etc.) | 3 | moderate |
| `prf.render-blocking` | render-blocking CSS/JS in the critical path | 3 | moderate |
| `prf.image-optimization` | non-WebP/AVIF, unsized, oversized images | 3 | quick |
| `prf.caching-headers` | missing cache headers on static assets | 2 | quick |
| `prf.third-party-weight` | heavy third-party scripts (tag managers, chat widgets) | 2 | moderate |
| `prf.mobile-usability` | viewport issues, tap targets (Lighthouse) | 2 | moderate |

### Authority (T4; internal-link checks are T0)

| ID | Detects | Sev | Effort |
|---|---|---|---|
| `aut.money-pages-low-internal-links` | money pages with below-median internal links | 3 | quick |
| `aut.lost-links` | referring domains lost recently (reclaim outreach) | 3 | moderate |
| `aut.toxic-anchors` | spam-score outliers in anchor profile | 2 | moderate |
| `aut.unlinked-mentions` | brand mentions without links | 2 | quick |

### Trust & hygiene (T0)

| ID | Detects | Sev | Effort |
|---|---|---|---|
| `trs.https-mixed-content` | TLS errors or mixed content | 4 | quick |
| `trs.about-contact-missing` | no about/contact pages linked from footer | 2 | quick |
| `trs.legal-pages-missing` | privacy/terms missing | 2 | quick |

### AI visibility / GEO (T0 + T5) — the differentiator

| ID | Detects | Sev | Effort |
|---|---|---|---|
| `geo.ai-crawlers-blocked` | robots.txt blocks GPTBot / OAI-SearchBot / PerplexityBot / ClaudeBot etc. — with per-crawler impact copy (see `ai-crawlers.ts` data) | 3 | quick |
| `geo.entity-schema` | Organization + `sameAs` absent → weak entity disambiguation | 3 | quick |
| `geo.citation-coverage` | brand absent from AI answers for its prompt set (LLM Mentions API) | 4 | ongoing |
| `geo.aio-exposed-queries` | comparison/question queries (AIO exposure 86–95%) flagged for GEO-quality content | 3 | moderate |
| `geo.llms-txt` | *informational only* — research says low value; never rank it as a fix | 0 | — |

---

## 7. Worked examples (what the user sees)

**1. Striking distance (T1)** — query *"seo audit tool"*, 4,400/mo, position 8.
`ctr(8)≈2.5% → target pos 3 ≈ 10% → 4,400 × 7.5% ≈ 330 clicks/mo` (range 150–500, confidence **high**, GSC-measured). Effort: moderate (brief + rewrite). → *"Do now — refresh this page: rewrite H1, add comparison table, update since-date. Est. +150–500 clicks/mo."*

**2. AI crawlers blocked (T0)** — GPTBot disallowed, 40 pages affected.
No click model — but strategic and 10 minutes of work: gain quoted as AI-visibility terms (citation premium +35% CTR for cited brands; AI referrals convert 23×). Effort quick → **Do now**, top of list despite no number.

**3. LCP 4.1s on mobile (T0)** — field data, all pages.
Honest modeling: no direct click math; severity 4, confidence low (0.35), banded "3–10% on affected pages once in the good range". Effort moderate → **This month**, with the LCP-element diagnosis attached so it's actionable, not a lecture.

---

## 8. Architecture on Vercel

**Constraint (verified June 2026, Vercel docs):** functions default 300s; Hobby max 300s; Pro/Enterprise max 800s (13 min), with a 30-min (1800s) beta on Node 20/22/24 via per-function config. Fluid compute default; Active-CPU billing makes I/O-wait cheap. A 5,000-page polite crawl (~2 req/s) is ~42 minutes — **no single invocation fits a real site**, and users must never hold an HTTP request for minutes.

**Pattern:**

```
POST /api/audits                → create audit row (status: queued), enqueue job (QStash or Inngest)
worker (maxDuration 800)        → crawl a chunk (e.g., 400 pages), persist, re-enqueue until done
finalizer                       → run rules, score, diff vs previous audit, notify
GET /api/audits/:id             → poll status (or SSE stream); dashboard reads Postgres
```

- **Discovery**: sitemaps first, then nav BFS; dedupe on canonicalized URLs; per-host concurrency 1, global cap; `Crawl-delay` respected.
- **Cron**: Vercel Cron for scheduled re-audits — **weekly on Starter, daily on Growth** (mirrors the pricing table exactly), Scale custom. Create the cron endpoints now; frequency is a plan flag.
- **Storage**: Postgres (Neon/Supabase) — `users, sites, audits, pages, findings, keywords, rank_history, citations`; Vercel Blob for HTML snapshots/screenshots; Upstash Redis for per-host rate limits + job locks.
- **Rendering checks**: MVP = raw-HTML analysis + PSI; full headless render sampling on an external worker later (keep Playwright out of the request path).
- **SSRF hardening** (user-supplied URLs on serverless): http/https only; resolve DNS and reject loopback/RFC1918/link-local/metadata ranges; re-validate after every redirect (≤5); 10s connect / 30s read timeouts; ≤5MB body; reject non-HTML for page checks.
- **Identity & ethics**: `User-Agent: SeobotBot/0.1 (+https://seobot.io/ai-crawlers)` — our own reference page doubles as our crawler documentation. Verified sites may be crawled beyond robots (standard audit-tool practice — document it); unverified free audits stay polite and capped.
- **Unit economics** (DataForSEO): 250 keywords checked daily ≈ 250 × $0.0006 × 30 ≈ **$4.50/project/mo**; a 1,000-row backlink profile refresh ≈ **$0.06**; AI Mode / LLM Mentions ≈ $1.20/1K. CrUX + PSI free. Comfortably inside the $29–199/mo tiers.

---

## 9. Phasing

> **P0 revised (Oct 2026):** the first ship is an **on-site, client-side assessment** ("SEO Check") — no backend, no crawl, nothing leaves the browser. The crawl-based phases below become the automated upgrade of the same rule catalog. See `docs/seo-check.md`.

| Phase | Scope | Unlocks |
|---|---|---|
| **P0 — On-site SEO Check** | client-side questionnaire → scored, visualized report; catalog subset; ships on the static site — see `docs/seo-check.md` | Lead magnet; validates the rule catalog + scoring; front door to the product |
| **P1 — Accounts + GSC + crawl** | T0 URL crawl (~100 pages) + PSI/CrUX, GSC OAuth, quantified opportunities, score history, weekly cron | The actual product (Starter tier) |
| **P2 — Keywords & briefs** | SERP provider: rank tracking, gaps, briefs (generation pipeline separate) | Growth tier features |
| **P3 — Competitors & backlinks** | compare-mode, link monitoring (DataForSEO) | Growth/Scale |
| **P4 — AI visibility** | LLM Mentions + AI Mode tracking, citation dashboard, per-crawler recommendations | The "New: AI visibility tracking" pill — the differentiator |

---

## 10. Open decisions

- [ ] Free instant audit limits (page cap, runs/IP/day) + email gate placement.
- [ ] Publish the scoring methodology? (Recommend a public explainer page — trust + content marketing; keep exact weights private.)
- [ ] Full-crawl verification method (meta tag vs file vs DNS TXT) — GSC connection can double as verification.
- [ ] Provider abstraction: `SearchDataProvider` interface now, so DataForSEO ↔ Moz swaps don't leak into rules.
- [ ] IndexNow ping after fixes ship (Bing/Copilot instant re-index) — ties directly to the `/ai-crawlers` brand.
- [ ] Where the engine lives: `src/lib/audit/` in this repo vs a service split later (monorepo when volume demands).
