# Data Assets & Interactive Elements — Brainstorm Brief

> Companion to `docs/seo-research.md` (§10.2 original data study), `docs/geo-research.md` (§5.2 statistics/quotation levers, §10.2 first GEO content) and `docs/content-models.md` (component contracts). v1, October 2026 — for the three build sessions.
>
> Two questions this answers: **(1)** can we research/build a dataset on the top sites' SEO/GEO posture from open sources? **(2)** can Playwright scrape the rest? Short version: **yes to both** — four or five open datasets already cover a surprising slice, and the one study nobody has published at scale (rendered-vs-raw content gaps on top sites) is exactly the Playwright gap and exactly the kind of original stat that earns citations (Princeton GEO paper: +31% visibility for statistics).

---

## TL;DR

1. **Original data is the #1 GEO asset** per our own research docs (stats + quotes + citations = the top-3 measured levers). A "State of AI Indexation" study is the single highest-leverage content program we can run that isn't a money page.
2. **Existing open datasets cover the baseline**: Tranco (top-sites list), **AI Crawler Census** (which crawlers the Tranco top 5,000 allow/block, CC BY 4.0), AI Discovery Radar (llms.txt/robots.txt publication, CC BY 4.0), Cloudflare Radar (AI bot traffic; ⚠ CC BY-NC 4.0 — internal use only), plus HTTP Archive / CrUX for performance and tech context.
3. **The gap we can own** is the one data nobody has at scale: the **JavaScript wall measured on top sites** — what % of visible content and JSON-LD a non-rendering AI crawler actually receives, per site. The only study of its kind covered 405 small businesses (SSRN, June 2026). Playwright closes this gap in ~a week of work.
4. **Playwright is the right tool, but only for the rendered half.** robots.txt censuses, sitemap checks, raw-HTML/JSON-LD presence, and curl canaries are plain HTTP — faster, politer, zero browser overhead. Reserve Chromium for rendered DOM comparison, screenshots, and CI canaries on our own site.
5. **Every interactive must be prerender-safe and low-JS** per `seo-research.md` §2.4: static table/SVG in raw HTML, enhancement on top, tables always present (they're the extraction format AI engines prefer). We already have the primitives: `src/components/ui/chart.tsx` (Sparkline, AreaChart, BarChart), tokens, and `check:seo` conventions.
6. **Today's PoC** (22 hand-picked top sites, robots.txt only, 30 min of work): GPTBot blocked by 8/22, OAI-SearchBot by 6/22 — including by Amazon, BBC, CNN, and NYT. Reddit and Stack Overflow block everything via wildcard; Netflix/Medium run default-deny + named allowlists. The methodology problems are visible already (wildcard semantics, bot walls, 418s) — see §7.

---

## 1. How this plugs into the three docs

| Research doc | What it already says | What this brief adds |
|---|---|---|
| `seo-research.md` §10.2 | "Original data study at launch" is the #1 GEO content piece; pricing/definitions are extraction targets | Concrete dataset inventory + Playwright pipeline to produce the study |
| `geo-research.md` §5.2, §10 | Statistics +31%, quotes +41%; citation half-life ~39–68 days; content must survive passage chunking | Viz/study formats that are quotable per-passage and refreshable quarterly |
| `content-models.md` §13 | Component handoff: `ComparisonTable`, `FaqAccordion`, charts; prerender + DOM-visibility rules | Page-level mapping for each interactive idea + guardrails section |

**State of play in code** (for coordination): typed content layer exists (`src/content/*` — home, pricing, ai-crawlers, jsonld, schema); `scripts/check-seo.mjs` enforces title/description budgets, canonical paths, JSON-LD well-formedness, and FAQ↔schema byte-parity. **`check:seo` currently fails**: `schema.ts` expects a richer `site` object export (`site.name`, `site.legalName`, `site.sameAs`, `site.supportEmail`…) while `site.ts` still exports flat `SITE_*` constants and `jsonld.ts` consumes those. One of the parallel sessions is mid-refactor on that convention — pick one shape before adding new content modules.

---

## 2. Open dataset landscape (what we can use today)

| Dataset | What's in it | Access | License | Use for us |
|---|---|---|---|---|
| **Tranco** | Manipulation-hardened top 1M sites, 30-day averaged, downloadable + API + per-domain rank lookup | [tranco-list.eu](https://tranco-list.eu) | Free; cite the NDSS paper; provider data carries CC variants | The "top 500" backbone list and rank axis for every chart |
| **AI Crawler Census** | Which AI crawlers the **Tranco top 5,000** allow/block, per-domain raw JSON, repeated runs for time series | [ai-visibility.lastminutedealshq.com/data](https://ai-visibility.lastminutedealshq.com/data) | **CC BY 4.0** | Baseline dataset for a robots.txt explorer; our own refresh adds recency + commentary |
| **AI Discovery Radar** | Monthly: how many sites publish `robots.txt` / `llms.txt` / `ai.txt` / `tdmrep.json` and whether they're fetchable | [GitHub](https://github.com/flober81/ai-discovery-radar) | **CC BY 4.0** | llms.txt-adoption chart — perfect myth-vs-reality content (pairs with the Ahrefs 97% finding) |
| **KI-Zugangsindex** | Fixed 600-domain panel of the German `.de` web, re-checked over time | [peppe1337.github.io/ki-zugangsindex](https://peppe1337.github.io/ki-zugangsindex/) | Open | EU/DE comparison angle later; methodology template for panels |
| **Cloudflare Radar** | AI bot share of traffic, per-crawler trends, robots.txt directive adoption across top 10k domains, crawl-to-refer ratios; free API | [radar.cloudflare.com](https://radar.cloudflare.com) + API token | ⚠ **CC BY-NC 4.0** | Internal benchmarking + methodology reference; **do not republish NC data inside a commercial page without checking terms** — prefer our own crawl for anything published |
| **HTTP Archive + Web Almanac** | Monthly crawl of ~16M sites; SEO chapter; robots.txt custom metric; rank buckets (top 1k → 10M) | BigQuery public dataset (`httparchive.crawl`) | Attribution (CC-style) | "How the top N do X" context; rank-bucket distributions without crawling ourselves |
| **CrUX (Chrome UX Report)** | Field Core Web Vitals for 18M+ origins, rank buckets, BigQuery + API | BigQuery public dataset / CrUX API | Google API terms | CWV-vs-rank charts with **field** data; no Lighthouse runs needed |
| **Common Crawl** | Raw web corpus incl. historical robots.txt records | S3 public | Common Crawl ToU | Long-horizon robots.txt change analysis |
| **ai.robots.txt** (GitHub) | ~175 AI agents with operator/purpose/status; auto-generated robots.txt/nginx/htaccess variants | [GitHub](https://github.com/ai-robots-txt/ai.robots.txt) | MIT | Crawler directory data for the `/ai-crawlers` reference page |
| **Known Agents** (was Dark Visitors) | Live agent directory + identification API; analytics | [knownagents.com](https://knownagents.com) | Vendor ToS | Cross-check for crawler metadata; verify before relying |
| **AI Crawler & Bot Registry** | 109 documented crawlers, operators, IP ranges — CSV / NDJSON / JSON | [proxies.sx/crawlers](https://www.proxies.sx/crawlers) | **CC BY 4.0** | IP-range verification feature / content |
| **Crackle PR AI Visibility Index** | Raw scored CSV + JSON for a fixed 25-query citation benchmark across engines | [cracklepr.com](https://www.cracklepr.com/ai-visibility-index) | Check license | Template for how we publish our own citation-run dataset |
| **aicrawlercheck top-10,000 study** | GPTBot blocked by 14.3% of top 10k; top 1k block ~1.5× more often than ranks 5k–10k | [aicrawlercheck.com](https://aicrawlercheck.com/blog/ai-crawler-robots-txt-study-2026) | Check before reusing data | Benchmark numbers to cite in content today |

**The open gaps we can own:**

1. **Rendered-vs-raw content gap on top sites.** Only measured for 405 small-business sites (SSRN 6915818). Nobody has done it for the Tranco top 500 across money pages. This is Playwright's job (§3) — and the flagship stat.
2. **Per-site structured-data reality check**: does the JSON-LD on top sites' pages match visible content? Is it in raw HTML or injected client-side? (The docs put heavy weight on JSON-LD parity; nobody audits it externally at scale.)
3. **Open citation-share benchmarks with transparent methodology.** Vendor datasets (Profound, Ahrefs, Seer) are closed; the public ones are niche panels. A repeatable, methodology-first prompt set for our category is defensible and citable.
4. **Agent-readiness at scale**: semantic HTML / a11y-tree quality / `llms.txt` presence on top sites (Cloudflare's isitagentready does single sites; nobody publishes the aggregate).

---

## 3. Playwright: yes — and precisely where it fits

| Task | Tool | Why |
|---|---|---|
| robots.txt / sitemap / llms.txt census | **Plain HTTP** (`fetch`/`curl`) | Text files; browser adds nothing; 500 domains in minutes; politer |
| Raw-HTML checks: JSON-LD, meta, canonical, FAQ text | **Plain HTTP** | This is literally what non-rendering AI crawlers see |
| Crawler-access canary (`curl -A "GPTBot" ... \| grep`) | **Plain HTTP** | Already specced on `/ai-crawlers`; automate in CI later |
| **JS-wall measurement** (what browsers see vs what AI crawlers get) | **Playwright (Chromium)** | Requires JS execution; extract rendered visible-text + DOM after `networkidle` |
| Screenshots / filmstrips for content and thumbnails | Playwright | Also useful as page hero images for study pages |
| Lab audits (Lighthouse) for a hand-picked subset | Playwright + CDP | Only for demo sites; field CWV comes from CrUX instead |
| Soft-404 / client-render verification of **our own** site | Playwright in CI | Post-build canary per `seo-research.md` §2.2 |

### Pipeline sketch (one-off study → monthly refresh)

1. **Input**: Tranco top 500 (CSV) minus infrastructure domains (cdn/cloud infra like `gstatic`, `googleapis`, `akamai.net`). Pin the exact Tranco list version in the methodology — reproducibility is what makes it citable.
2. **URL set**: homepage + one representative deep page per site (e.g., pricing/docs where detectable). Keep it fixed across runs for comparability.
3. **Two passes per URL**: (a) raw fetch (undici/curl, browser-like UA, no JS); (b) rendered fetch in headless Chromium. Store: status, redirects, HTML snapshot hash, extracted fields — title, meta, canonical, JSON-LD `@type`s, headings, visible word count, nav links.
4. **Metric**: *content coverage* = share of rendered visible-text tokens present in the raw HTML. Same for JSON-LD and headings. That's the "AI-visible %" per site.
5. **Enrich**: robots.txt policy per site (plain fetch, RFC 9309 group parsing), AI Crawler Census flags, CrUX field CWV (BigQuery/API), HTTP Archive tech stack.
6. **Output**: Parquet/JSON artifacts in `scripts/data/` → a small build step imports the summary JSON into `src/content/` so the site renders **tables from raw HTML** + progressive-enhancement charts. Publish the dataset CC BY 4.0 with a methodology page (that's the citation magnet; the charts are the distribution).

### Politeness, legality, and credibility notes

- Respect `robots.txt` for everything we crawl, ≤1 req/s/domain, identify the UA (`SeobotResearchBot/0.1 (+https://seobot.example/bot)`), back off on 429/403, cache everything.
- Do **not** automate SERP scraping (Google ToS) or AI-engine answer harvesting via browser automation; citation benchmarks should use sanctioned surfaces (APIs where offered) and transparent manual/semi-manual prompt runs. Publishing the method keeps us on the right side of the credibility line we're selling.
- Cloudflare Radar is **NC** — fine for internal dashboards and background, not for republishing inside commercial pages.
- Treat single-run numbers as provisional; churn in the AI ecosystem (65% of cited sources change day-to-day per our GEO doc) means trend lines beat snapshots — build the refresh from day one.

**Effort estimate**: 20-site PoC < 1 day; full 500-site study + report ~1 week of build + a refresh job; ongoing cost ≈ local Chromium, ~$0 infra (BigQuery free tier covers CrUX/HTTP Archive queries).

**PoC status (done)**: passes 1–4 are implemented in `tools/crawl/js-wall.mjs`, an isolated package so it never touches the site build; `tools/crawl/top-sites.mjs` builds the pinned, filtered Tranco list (`data/top-500.json`, list ID `64VVX`). The crawler is resume-safe, appends per-run history per site (median-of-N ready), and scores robots.txt policy for 17 crawler tokens in the same pass. Production run of the Tranco top 500 **completed 2026-10-16 — results in §6.3**; run: `cd tools/crawl && npm run study`.

---

## 4. Interactive elements & data-visualization catalog

Format note: every entry assumes **static HTML first** (table or SVG rendered at build/request), interaction as enhancement. "Prerender-safe" is not optional here — a lazy-mounted chart that AI crawlers never see is worse than no chart.

### 4.1 Flagship data studies (the citable assets)

| # | Element | Where it lives | Data source | Effort | Notes |
|---|---|---|---|---|---|
| 1 | **"State of AI Indexation" report** — scatter (rank vs AI-visible %), distribution histogram, worst/best offenders table, per-site permalinks | `/research/ai-indexation` + gated PDF? (keep HTML open) | Own Playwright crawl + AI Crawler Census | L | The launch study; CC BY 4.0 dataset download; refresh quarterly |
| 2 | **robots.txt policy explorer** — filterable matrix (crawler × site), treemap of allow/block policies, "named by X%" counters | `/research/robots-policies` or section on `/ai-crawlers` | AI Crawler Census + own monthly refresh | M | Filters must not hide the table in source; render all rows server-side |
| 3 | **Crawler discovery race** — GPTBot 14 min vs OAI-SearchBot 2h18 vs ClaudeBot 4h42 vs PerplexityBot 6h11 as an animated bar-chart race | `/ai-crawlers` + glossary | Presenc study (already in content) | S | Pure presentation; static bar chart fallback = the quotable table |
| 4 | **Citation-share benchmark** — engine × domain heatmap, churn timeline ("top sources change daily"), engine-overlap matrix (~14% shared) | `/research/ai-citations` | Own prompt-set runs (30–50 queries/month) | L | Methodology-first; start as a quarterly report, not a dashboard |
| 5 | **llms.txt adoption tracker** — % of top sites publishing/fetchable files over time | Blog / glossary | AI Discovery Radar + Ahrefs 137k finding | S | Myth-busting angle already researched; tiny dataset |

### 4.2 Explainer interactives (education that converts)

| # | Element | Where it lives | Data / content | Effort | Notes |
|---|---|---|---|---|---|
| 6 | **Crawl → index → retrieve → re-rank → cite pipeline stepper** — click through 5 stages; each shows "where you lose visibility" | `/ai-crawlers`, `/glossary` | `geo-research.md` §1 diagram | S | Content-first; each stage is a quotable standalone passage with a stat |
| 7 | **Query fan-out visualizer** — one query animating into sub-queries then cited sources | `/glossary/query-fan-out` | GEO doc §1 | M | SVG + CSS; static diagram in raw HTML |
| 8 | **"See your site as GPTBot sees it"** — input URL → raw-fetch vs rendered-text side-by-side; highlights missing content | Landing page or `/tools/ai-visibility` | Serverless fetch proxy (Phase 2) | M/L | True lead magnet + product demo; needs a backend (or proxy through the app subdomain). v1 can ship with 3 pre-fetched example sites |
| 9 | **robots.txt builder** — toggle crawler categories (allow search / policy on training), live preview, copy/download | `/ai-crawlers` | Existing `robotsTemplate` content | S | State in URL params for shareability; static default config in HTML |
| 10 | **Crawler reference with filters** — category/operator/recommendation filters + compare view | `/ai-crawlers` | Existing `crawlers` array | S | Enhancement over the existing table; keep full table server-rendered |

### 4.3 Calculators & lead-gen tools (money-page support)

| # | Element | Where it lives | Data | Effort | Notes |
|---|---|---|---|---|---|
| 11 | **Organic-value calculator** — keywords × volume × CPC → estimated monthly value clawed back by fixing issues | `/pricing`, feature pages | CTR curve + CPC inputs (publish assumptions) | S | Classic SaaS lead tool; assumptions table keeps it honest |
| 12 | **CWV budget simulator** — sliders vs the 2.5s / 200ms / 0.1 thresholds; pass-fail states | Feature page (audits) | Thresholds from `seo-research.md` §2.4 | S | Educational; ties directly to audit feature |
| 13 | **AI visibility quiz / grader** — domain in → robots.txt AI rules, schema presence, llms.txt, CWV (CrUX API) → scored report | `/ai-crawlers` or standalone tool | CrUX API + plain fetch (serverless) | M | Phase 2; needs backend. Print/shareable score card = citation bait |

### 4.4 Product-demo & micro-interactions

| # | Element | Where it lives | Data | Effort | Notes |
|---|---|---|---|---|---|
| 14 | **Live audit snapshot** — example app dashboard with charts (AreaChart/BarChart primitives already exist) | Landing + feature pages | Demo fixtures in `src/content/` | S/M | Already half-built in `src/pages/dashboard.tsx`; make fixtures static + deterministic |
| 15 | **Rank-tracking animation** — positions sliding as days tick; small-multiples per keyword | Feature page (rank tracking) | Demo fixtures | S | CSS transform only; static table fallback |
| 16 | **Glossary hover-cards + term graph** — definition popovers, interconnected term SVG | `/glossary/*` | Content layer | M | Entity-rich; definitions already standalone-quotable |
| 17 | **Comparison table with "show differences only" toggle** + sticky header | `/vs/*` | Comparison models | S | Table fully present in HTML; toggle is pure CSS/JS enhancement |
| 18 | **Freshness timeline** — "Last updated" + refresh history chips on study pages | Study + blog pages | Content metadata | S | Doubles as the freshness signal the GEO doc requires |
| 19 | **Pricing feature-matrix filter** — highlight plan differences inline | `/pricing` | Existing matrix | S | Careful: matrix stays crawlable per `content-models.md` §3 |

**Recommended first wave** (best ratio of effort × GEO impact, lowest dependency risk): **#2 robots.txt explorer** (data exists today), **#3 crawler race** (content exists), **#6 pipeline stepper** (content exists), **#1 AI-indexation study** (the Playwright build), then **#9 robots.txt builder**.

---

## 5. Technical guardrails (non-negotiable, from the research docs)

1. **Prerender-safe**: tables/charts/stat cards exist in raw HTML. No `IntersectionObserver`-gated mounting of anything substantive; no `useEffect`-only data. Verify with `curl -A "GPTBot" … | grep` per `geo-research.md` §3.
2. **CWV budget**: reuse `chart.tsx` primitives (no chart library); animate only `transform`/`opacity`; inline data JSON per page only when < ~50–100KB, else static SVG/table + shared JSON fetch as enhancement.
3. **Table-first, chart-second**: every visualization ships with its underlying table (GEO extraction + accessibility + graceful degradation). Charts get `role="img"` + `aria-label` and a visually-hidden data table or adjacent caption.
4. **Quotable captions**: each chart gets one standalone sentence with number + unit + source + year (the `content-models.md` §14 stats format) — that's the line AI engines lift.
5. **Data artifacts convention**: study outputs as `scripts/data/*.json` produced by the crawl script → imported by `src/content/` modules with TypeScript types (same pattern as `ai-crawlers.ts`). Extend `check:seo.mjs` to validate study pages (e.g., every chart has a caption with a source, dataset `lastUpdated` present).
6. **Methodology + license on every study page**: what was crawled, when, how many sites, caveats, data license. Trust is the product.

---

## 6. Evidence — PoCs and the production run (October 16, 2026)

### 6.1 robots.txt mini-census (22 sites)

Method: single polite `GET /robots.txt` per site with an identifying UA, RFC 9309 group parsing, `blocked` = exact `Disallow: /` in the crawler's group with no `Allow: /`. Sample is hand-picked for recognizability, not Tranco.

| Site | GPTBot | OAI-SearchBot | PerplexityBot | ClaudeBot | CCBot | Bytespider | Notes |
|---|---|---|---|---|---|---|---|
| amazon.com | block | block | block | block | block | block | blocks AI *search* crawlers explicitly |
| nytimes.com | block | block | block | block | block | block | blocks all named + training |
| bbc.com | block | block | block | block | block | block | same pattern |
| cnn.com | block | block | block | block | block | block | same pattern |
| reddit.com | ✱ block | ✱ block | ✱ block | ✱ block | ✱ block | ✱ block | single wildcard `Disallow: /` |
| stackoverflow.com | ✱ block | ✱ block | ✱ block | ✱ block | ✱ block | ✱ block | HTTP **418** + `Content-Signal: search=no, ai-train=no` |
| medium.com | block | — | — | block | — | block | default-deny + allowlist of paths |
| netflix.com | allow | allow | allow | allow | ✱ | ✱ | wildcard denies all; named groups override and allow AI search crawlers |
| theguardian.com | — | — | block | block | block | block | varies by crawler |
| washingtonpost.com | — | — | block | block | block | block | varies by crawler |
| airbnb.com | block | allow | allow | block | — | — | blocks training, allows search |
| github.com | allow | allow | allow | allow | — | block | explicit allow list |
| cloudflare.com | allow | — | allow | — | allow | — | mostly open |
| apple.com, en.wikipedia.org, etsy.com, microsoft.com, shopify.com, spotify.com, target.com, walmart.com | — | — | — | — | — | — | no AI-specific rules (wildcard permissive) |
| linkedin.com | n/a | n/a | n/a | n/a | n/a | n/a | served an HTML challenge page to curl — bot wall |

Sample counts: **GPTBot blocked by 8/22** (6 explicit + 2 via wildcard), OAI-SearchBot by 6/22, PerplexityBot by 8/22, ClaudeBot by 10/22, CCBot by 9/22. Findings echo published benchmarks (aicrawlercheck: 14.3% of top 10k block GPTBot; top-1k sites block ~1.5× more than 5k–10k) — so the full study's job is **scale + the rendered-content axis**, not just re-counting robots.txt.

Methodology issues surfaced (must be handled in the real study): UA treatment differs (bot walls answer differently to curl vs real crawlers), wildcard-vs-named group semantics trip naive parsers, some files are HTML challenge pages with 200 status, and robots tokens appear in comments. These are the exact footnotes that make a study credible.

### 6.2 JS-wall measurement (20 sites, Playwright)

Method: `tools/crawl/js-wall.mjs`. Same user agent on both passes (JS execution is the only variable); robots.txt honoured; images/fonts/media blocked in the browser pass; homepage only, desktop, single run, 2026-10-16. Two axes: **accessibility** (can a non-browser client get content at all?) and **coverage** (of the content a browser sees, how much is in the raw HTML?).

Results — 14 of 20 sites measurable without a browser (sorted by coverage):

| Site | Coverage | Raw tokens | Rendered tokens | Headings in raw |
|---|---|---|---|---|
| vercel.com | 50.0% | 236 | 190 | 94.4% |
| figma.com | 52.9% | 282 | 289 | 97.0% |
| shopify.com | 59.3% | 472 | 460 | 42.9% |
| github.com | 64.0% | 458 | 486 | 96.3% |
| cloudflare.com | 65.9% | 433 | 551 | 83.3% |
| walmart.com | 67.4% | 218 | 221 | 100.0% |
| notion.so | 69.2% | 184 | 172 | 62.5% |
| webflow.com | 70.0% | 716 | 846 | 96.8% |
| stripe.com | 70.2% | 663 | 755 | 96.8% |
| theguardian.com | 75.0% | 1402 | 1492 | 20.7% |
| bbc.com | 79.3% | 1245 | 1300 | 73.9% |
| apple.com | 79.3% | 633 | 791 | 14.5% |
| microsoft.com | 80.6% | 371 | 391 | 87.9% |
| en.wikipedia.org | 82.8% | 1039 | 837 | 90.0% |

**Not measurable without a browser — 6 of 20** (nytimes.com, medium.com, etsy.com 403 walls; stackoverflow.com 403; amazon.com serves a 200-status anti-bot flow with zero readable content; reddit.com excluded by its own robots.txt wildcard block). For engines that don't render JavaScript, these sites are effectively unquotable — by choice or by defense.

Findings that shape the production study:

1. **The accessibility axis is as big as the coverage axis.** 30% of this top-brand sample can't be read at all by a non-browser client. The study needs both numbers: "% of top 500 whose content is unreachable without a browser" and "median coverage among readable sites (70.0% here)".
2. **JS walls are real even on modern sites**: Vercel 50%, Figma 52.9%, Shopify 59.3% — a third to half of homepage copy is browser-only. Wikipedia, expected to be the gold standard, led at 82.8%.
3. **Heading coverage is noisy** (Apple 14.5%, Guardian 20.7%): rendered headlines are often dynamic text absent from raw HTML — genuinely interesting, but the metric needs normalization (n-gram matching) before publishing.
4. **Run-to-run variance exists**: walmart.com's raw pass varied between runs (anti-bot serving variants); NYT/Etsy rendered 0 tokens (anti-headless or interstitial). The production study needs median-of-N runs and a documented exclusion list.
5. **Structured data was mostly server-rendered** in the readable set (no JSON-LD types missing from raw except on walled sites) — so the schema story is healthier than the content story; keep the schema-parity check but the flagship stat is content coverage.

Caveats: single run, homepage only, token-set overlap is an upper bound (not order/context-aware), consent interstitials and anti-bot behavior confound both passes, 20 sites are not the top 500. The methodology write-up is half the deliverable — these caveats belong on the study page.

---

### 6.3 Production run — pinned Tranco top 500 (October 16, 2026)

**Dataset**: Tranco list `64VVX` (created 2026-10-16; sources CrUX, Farsight, Majestic, Radar, Umbrella; Dowdall method). Infrastructure filtering removed **380 of the first 880 Tranco entries (43%)** — CDNs, DNS/hosting backends, ad/telemetry networks, auth portals, shorteners — via the published filter (exact list + patterns in `tools/crawl/data/top-500.json` → `filters`). The final **500 content sites span original Tranco ranks 1–880**. Single identifying UA, robots.txt wildcard rules honoured, ≤4 sites in flight, sequential per domain, homepage only. **Two back-to-back runs** (2026-10-16, ≈10 min each; `results.json` = latest run, per-site histories keep both). Full output: `tools/crawl/out/` (`results.json`, `summary.md`, `analysis.json`, `run-comparison.json`, per-site histories, 413 robots.txt snapshots).

**Headline (n=500, two back-to-back runs):**

| Outcome | Run 1 | Run 2 |
|---|---|---|
| `measured` (raw HTML readable) | 326 | **324** |
| `raw_blocked` (wall/empty shell to non-browser) | 109 | **112** |
| `both_blocked` (unreadable in both passes) | 19 | **18** |
| `robots_excluded` (wildcard disallow) | 23 | 23 |
| `render_incomplete` / `render_failed` | 11 / 12 | 11 / 12 |

Median coverage among readable: **71.4%** of rendered tokens present in raw HTML (p25 48.8%, p75 93.0%; run 1: 70.2% / 48.3 / 91.5).

**Two-run stability (median-of-N evidence).** Classification changed for only 15/500 sites (3%); among sites measured in both runs the median coverage delta is **0pp** (p90 0.6pp; only 7 sites moved >5pp). Movement is concentrated at the walls: anti-bot/server-variant sites flicker (crashlytics.com +39pp, google.co.uk −9.2pp, walmart.com +4.5pp) and a handful of sites swapped classification between passes (booking.com, canva.com, elpais.com, tumblr.com, perplexity.ai: readable → raw-walled; alibaba.com, windows.com: render failures; britannica.com, ft.com, miui.com, slack.com, discogs.com, imgur.com: recovered by retry). This is why per-site verdicts near a wall need a volatility flag, while headline aggregates are already stable.

**Robots.txt policy (411 sites with parsed robots.txt in run 2; verdicts incl. wildcard inheritance):**

- Hard-blocked (root disallow): **GPTBot 81 · ClaudeBot 84 · CCBot 96 · Bytespider 95 · PerplexityBot 62 · OAI-SearchBot 43 · Googlebot 4**
- 220–300 sites per token sit in "partial" (path-level rules only) — the AI policy story is selective path rules more than blanket blocks
- `robots_excluded` names: Facebook, Mail.ru, Twitter/X, LinkedIn, Netflix, Pinterest, Baidu, ChatGPT, Reddit, Flickr, IMDb, Reuters, Weibo, Naver, Trustpilot, WSJ, Quora, Gosuslugi, Yelp, Disney+, Academia.edu, Linktree
- robots.txt fetch: 413×200, 24×403 challenge, 17×404, 36 no response — fetch success itself wobbles slightly between runs (408 → 411 parsable)

**The cite-worthy correlation — two gates align:** sites that hard-block GPTBot are **3× less likely** to be readable without a browser:

| Group | n | measured | median coverage | raw/both blocked |
|---|---|---|---|---|
| GPTBot blocked | 81 | 40.7% | 48.2% | 34.6% |
| GPTBot not blocked | 330 | 81.8% | 71.5% | 10.9% |

(Run 1: 43.8% / 46.9% / 32.5% vs 82.3% / 71.1% / 10.4% — the correlation is the most stable thing in the study.)

**Vertical cuts (median coverage of readable sites):**

| Vertical | n | median cov | blocked* | robots-excl. |
|---|---|---|---|---|
| Reference & edu | 8 | 94.5% | 1 | 0 |
| News & media | 14 | 79.3% | 5 | 2 |
| Cloud & dev | 9 | 64% | 3 | 0 |
| E-commerce | 15 | 48.8% | 6 | 0 |
| Streaming & entertainment | 9 | 33.2% | 3 | 2 |
| Search engines | 9 | 12.6% | 0 | 2 |
| Social | 15 | 3% | 1 | 7 |

*blocked = raw_blocked or both_blocked. Small-n caveats apply; AI products excluded from the table (only 2–3 of 5 measurable per run — see narrative).

**Narrative highlights:** the AI discovery layer's own front doors are among the least machine-readable sites in the study — openai.com 27.1%, perplexity.ai and claude.ai raw-walled, chatgpt.com robots-excluded. Search engines: Google 43.6%, Bing 3%, DuckDuckGo 6.1%, Yandex 0.6%, Baidu robots-excluded. Classical SEO peers (reference/media) are the glass-half-full story: Wikipedia 99.9%, arXiv/NIH 100%, Le Monde/CBSNews 100% server-rendered — while NYT is both_blocked and BBC sits at 20.8%.

**Caveats carried into the methodology page:** two runs completed (median-of-3 + per-site volatility flags planned — headline aggregates were stable, wall-adjacent verdicts flicker); homepage only (money-page pass open); token-set overlap is an upper bound; 13 CJK pages use character bigrams; sohu.com flagged encoding-suspect; 12 render_failed sites per pass (heavy CN/BR portals, HTTP2 errors, a download response — sets partially differ: retry fixed 6, new failures appeared elsewhere); adult sites remain in the neutral dataset; residual infrastructure curation is documented in the filter file.

### 6.4 Shipped — the dashboard renders the dataset (Oct 16, 2026)

The app dashboard is no longer a fixture mock. `scripts/build-top-sites-data.mjs` (root `npm run data:top-sites`) distills `data/top-500.json` + `out/results.json` + `out/analysis.json` + `out/run-comparison.json` into the committed `src/content/data/top-sites-study.json`, typed and decoded in `src/content/top-sites.ts`. `src/pages/dashboard.tsx` renders it: four headline stats, coverage histogram + vertical cuts + rank-vs-coverage scatter, per-token robots verdict bars (17 tokens, grouped retrieval/training/classic), a filterable all-500 explorer with a per-site detail dialog (coverage, raw/rendered tokens, JSON-LD diff, heading coverage, all 17 verdicts), and the Tranco ranking methodology — list `64VVX` configuration (five providers, Dowdall aggregation, 30-day window) captured from the Tranco API. The route is client-only and code-split (≈31 KB gzipped, separate from the marketing bundle); derived metrics only are published, no third-party HTML.

---

## 7. Open decisions

- [x] **"Top 500" definition** → **Tranco top 500** (decided). Exclude infrastructure domains; pin the exact Tranco list version in the methodology; a curated vertical cut can follow later.
- [x] **Publish the dataset?** → **Yes, CC BY 4.0 + methodology page** (decided). The dataset is the citation magnet; interactives are distribution.
- [x] **First wave** → **Playwright JS-wall study** (decided; PoC delivered — `tools/crawl/js-wall.mjs`; **production run complete, n=500 — §6.3**). robots.txt explorer is the immediate follow-on since the data largely exists.
- [ ] **Backend availability** for Phase-2 widgets ("see your site as GPTBot", AI grader): serverless fetch proxy acceptable, or static-only until the app backend exists?
- [ ] **Production crawl scope**: homepage only vs. homepage + 1 money page per site (study comparability vs. depth)?
- [ ] **Citation benchmark cadence**: 30–50 fixed buyer prompts monthly (manual/API-assisted) — who owns the prompt set?
- [ ] **Reconcile `schema.ts`/`site.ts` convention** so `npm run check:seo` passes before new content modules land.

---

## Sources

**Datasets**
- Tranco — tranco-list.eu (NDSS 2019 paper; sources incl. Cisco Umbrella, Majestic, CrUX, Cloudflare Radar)
- AI Crawler Census — ai-visibility.lastminutedealshq.com/data (CC BY 4.0)
- AI Discovery Radar — github.com/flober81/ai-discovery-radar (CC BY 4.0)
- KI-Zugangsindex — peppe1337.github.io/ki-zugangsindex
- Cloudflare Radar — radar.cloudflare.com + developers.cloudflare.com/radar (⚠ CC BY-NC 4.0)
- HTTP Archive / Web Almanac — httparchive.org, almanac.httparchive.org/en/2025/seo
- Chrome UX Report — developer.chrome.com/docs/crux, BigQuery public dataset
- Common Crawl — commoncrawl.org
- ai.robots.txt — github.com/ai-robots-txt/ai.robots.txt (MIT)
- Known Agents — knownagents.com
- AI Crawler & Bot Registry — proxies.sx/crawlers (CC BY 4.0)
- Crackle PR AI Visibility Index — cracklepr.com/ai-visibility-index

**Research cited in this brief**
- Aggarwal et al., GEO (KDD 2024, arXiv:2311.09735) — +31% statistics, +41% quotations (via `geo-research.md`)
- SSRN 6915818 — JS rendering gaps, 405 small-business sites (via `geo-research.md`)
- Vercel/MERJ — 500M+ crawler fetches, no JS execution
- Presenc AI — 300-page crawler discovery study
- aicrawlercheck.com — top-10,000 robots.txt study (2026)
- Ahrefs — llms.txt request-log study (137,210 domains)
