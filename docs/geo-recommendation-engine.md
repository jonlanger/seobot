# GEO Recommendation Engine — Scoring Model, Inputs, and Architecture

> Companion to `docs/geo-research.md` (the facts and levers), `docs/data-assets-and-interactives.md` (§4.3 items #8 "see your site as GPTBot sees it" and #13 "AI visibility quiz/grader" — this document is their design), and `docs/seo-research.md` (§2.1 prerendering). Compiled October 2026. This answers four questions: **is there a formula? what form does the user fill in? what inputs do we need? what runs where on Vercel?**
>
> Layer map: `docs/audit-engine.md` is the whole-product audit engine (health score, opportunity model, rule catalog, full-crawl phasing). **This document is its GEO-layer deep-dive** — the `geo.*` rules there (§6, 5 rules at 5–10% category weight) expanded into a standalone per-engine readiness model, a ~40-check catalog, and a calibration loop. Where the two overlap on infrastructure (Vercel job pattern, SSRF hardening, storage), `audit-engine.md` §8 is the contract; this doc only specifies what is GEO-specific.

---

## TL;DR — the decisions

1. **There is no validated public formula that predicts AI citations — so we don't ship a fake one.** What we ship is a deterministic **GEO Readiness rubric**: a weighted score over the six on-site stages of the citation pipeline (Access → Render → Extract → Evidence → Entity → Freshness), plus an **off-site presence checklist** that is deliberately *not* folded into the score in v1.
2. **Readiness ≠ visibility. Two separate meters, never merged.** Readiness is auditable facts about the site (we own it, deterministic, explainable). Visibility is measured citations in real prompts (needs prompt runs, later). A single "AI visibility score" is misleading — our own research says so (§5.3) — so the score is always shown **per engine**, not just aggregated.
3. **Three input layers, each deepening the last**: (a) **URL only** — ~40 automated checks from robots.txt, raw HTML, sitemap, Wikidata, CrUX, Wayback; (b) **8-question form** — context a crawler can't see (target prompts, vertical, render control, off-site presence, measurement setup); (c) **connected accounts (OAuth)** — GSC, Bing Webmaster Tools, GA4 for ground truth. URL-only must work standalone; the form improves recommendations; accounts upgrade precision.
4. **A "formula" exists at three levels**: (1) per-dimension pass/partial/fail rubrics; (2) weighted aggregation with **per-engine weights**; (3) a **gate flag** (e.g., robots.txt blocks `OAI-SearchBot`) that pins a critical finding to the top and floors that engine's Access score. Every point is traceable to an evidence snippet ("here is what GPTBot actually received").
5. **The recommendation engine is a rule engine, not an LLM.** Checks carry severity + effort + fix playbook metadata; findings are ranked by impact/effort; each fix shows its **expected point gain** ("+6.2 pts"). An LLM is used only for personalizing fix copy and drafting reviewer-editable scaffolds — never for scoring.
6. **On Vercel, the fast path fits in one serverless function.** ~10 parallel HTTP fetches with an 8s budget, streamed response, KV-cached 24h per domain. The one thing serverless can't do — render JS with a real browser — is deferred behind tiers: heuristic estimate (v1) → external render API or GSC URL Inspection API (v1.5) → own Playwright worker shared with the product's crawl engine (v2).
7. **The score's weights are v0 priors from research; the product calibrates them.** Instrument every audit run from day one. Once prompt-set citation data exists (§11), fit empirical weights and version the ruleset ("Scoring v2 — reweighted freshness using 500 audits"). That calibration loop is the moat; nobody else can do it.

---

## 1. What "improving GEO" actually means — the lift ladder

Improving GEO is not one thing; it's a sequence of gates where **failure at an earlier stage zeroes everything later**. This ordering is the formula's skeleton:

| # | Stage | Failure mode | Where the fix lives |
|---|---|---|---|
| 1 | **Access** — the engine's crawler is allowed and not walled | robots.txt blocks `OAI-SearchBot` → zero ChatGPT citations | robots.txt, WAF/CDN bot rules |
| 2 | **Render** — content exists in raw HTML | SPA ships empty shell → invisible to every AI crawler except Google's surfaces | SSG/SSR, server-rendered schema |
| 3 | **Extract** — passages are self-contained and quotable | prose buries the answer; no tables; no FAQ | page structure, definition blocks |
| 4 | **Evidence** — claims carry numbers, quotes, citations | adjective-heavy copy; no stats → nothing to lift | editorial layer (Princeton levers) |
| 5 | **Entity** — the brand is a "known thing" | no Organization schema / sameAs / Wikidata → unresolved entity | schema, Wikidata, profile consistency |
| 6 | **Fresh** — pages are maintained | stale `dateModified`, no real refresh cadence | content ops, changelog |
| 7 | **Off-site** — third parties mention you | 82.9% of citations point elsewhere; a clean site alone loses | G2, Reddit, YouTube, listicles |
| 8 | **Measure** — you can see what's happening | optimising blind, no prompt set, no AI-referrer tracking | GSC/BWT/GA4, prompt runs, logs |

The audit scores stages 1–6 on-site, checklists 7, and badges 8. That's the entire product surface.

---

## 2. The scoring model

### 2.1 Structure

For each engine `e` in {Google AIO/AI Mode, ChatGPT, Copilot, Perplexity, Claude}:

```
Readiness_e = Σ_d ( weight[d][e] × Score_d )          // d over the 6 dimensions
Overall     = Σ_e ( userWeight[e] × Readiness_e ) / Σ_e userWeight[e]
```

- `Score_d ∈ [0..100]` — dimension score, shared across engines **except Access**, which is scored per engine (a site can allow PerplexityBot but block OAI-SearchBot).
- `weight[d][e]` — priors below; calibrated later (§11).
- `userWeight[e]` — from the questionnaire ("which engines matter to you?"), pre-filled by vertical.

### 2.2 Dimension weights (v0 priors — hypotheses, not truth)

| Dimension | Google | ChatGPT | Copilot | Perplexity | Claude | Rationale anchor |
|---|---|---|---|---|---|---|
| Access | .22 | .26 | .26 | .24 | .22 | hard gate for all; ChatGPT/Copilot also need Bing pipeline |
| Render | .10 | .20 | .20 | .18 | .20 | Google renders JS; nobody else does (`geo-research.md` §3) |
| Extract | .22 | .16 | .15 | .16 | .20 | Google fan-out = passage selection; Claude is docs-grade |
| Evidence | .18 | .16 | .16 | .15 | .16 | Princeton levers apply everywhere |
| Entity | .12 | .12 | .12 | .12 | .10 | KG grounding for all; weakest for Claude |
| Freshness | .16 | .10 | .11 | .15 | .12 | Perplexity is the freshness maximalist (§4.2) |

### 2.3 Gates and criticals

Some failures are not points, they're **red flags pinned to the top of the report** regardless of score:

| Flag | Condition | Consequence shown |
|---|---|---|
| `ROBOTS_BLOCK_<engine>` | engine's search crawler disallowed | "Invisible to {engine} while this stands" |
| `BOT_WALL` | AI-UA fetch returns 403/challenge vs browser-UA 200 | "Your CDN is silent-blocking AI crawlers" |
| `JS_ONLY_CONTENT` | raw-HTML coverage < 20% of rendered words | "AI crawlers receive an empty shell" |
| `NOINDEX_KEY_PAGE` | meta robots noindex on homepage/money page | "Page excluded by your own directive" |
| `STALE_ENTITY` | no Organization schema, no sameAs, no Wikidata | "AI can't resolve who you are" |
| `STALE_CONTENT` | `dateModified` > 12 months on key pages | "Below the freshness threshold engines weight" |

A gate doesn't zero the score (ChatGPT still draws on Bing's index even if `OAI-SearchBot` is blocked) — it floors the Access dimension for that engine at 5 and raises the flag.

### 2.4 Transparency mechanics

- Every check contributes `weight_of_check × (100 | 50 | 0)` within its dimension — the report can show the arithmetic on click.
- Every fix carries an **expected gain**: `Δ = (100 − Score_d) × weight[d]̄` (averaged over the user's selected engines), displayed as "+6.2 pts".
- Results are banded: **0–39 At risk · 40–64 Foundation · 65–84 Citation-ready · 85–100 Durable.**
- The ruleset is versioned (`scoring-v1.2`) and shown in the report footer; "what changed since your last audit" is a v2 feature.

### 2.5 Worked example — a client-rendered SaaS marketing site

| Dimension | Score | Cause |
|---|---|---|
| Access | 72 | robots.txt clean; sitemap ok; no BWT/IndexNow attestation |
| Render | 12 | empty `#root` in raw HTML (the Seobot design system's *own* pre-prerender state, `seo-research.md` §2.1) |
| Extract | 45 | decent headings, no tables, no FAQ, buried definitions |
| Evidence | 22 | zero statistics, zero quotes, zero outbound citations on money pages |
| Entity | 28 | Organization schema present, no sameAs chain, no Wikidata |
| Freshness | 48 | `dateModified` missing; most recent Wayback snapshot 9 months old |

Weighted (average weights): **~42/100 — "Foundation"**. Top three fixes by expected gain: *prerender the site (+17 pts)*, *add an evidence layer with stats/quotes/citations (+12 pts)*, *complete the entity chain — sameAs + Wikidata (+8 pts)*. That output — score, causes, three ordered actions with point values — is the whole product promise. Everything below is how it's computed.

---

## 3. The check catalog

**Method legend** — `HTTP` plain fetch as `SeobotAuditBot` (raw HTML is exactly what non-rendering AI crawlers see; not an impersonation, a diagnostic) · `UA-CMP` same URL fetched with several AI UAs, responses compared · `RENDER` headless browser · `ASK` questionnaire · `CONNECT` OAuth to GSC/BWT/GA4 · `API` CrUX / Wikidata SPARQL / Wayback CDX.

### 3.1 Access (7 checks)

| # | Check | Detection | Method | Fix effort |
|---|---|---|---|---|
| A1 | robots.txt allows the engine's search crawler | RFC 9309 group parsing incl. wildcard/named-group semantics (the parsing traps are catalogued in `data-assets-and-interactives.md` §6) | HTTP, per engine | S |
| A2 | robots.txt parses as valid text (not an HTML challenge page served with 200) | content sniff + status | HTTP | S |
| A3 | No bot wall: AI-UA fetch returns 200 + real content vs browser-UA 200 | response diff (status, body fingerprint) | UA-CMP | M |
| A4 | Key pages not `noindex`/`nofollow` | meta robots + X-Robots-Tag | HTTP | S |
| A5 | Sitemap exists, valid, canonical-200 URLs only, honest `lastmod` | XML parse, HEAD-check sample | HTTP | M |
| A6 | Status/redirect hygiene: HTTPS, ≤1 redirect hop, no soft-404 on key routes | fetch trace | HTTP | S |
| A7 | Bing pipeline live: BWT verified + IndexNow adopted | self-report or API verification | ASK / CONNECT | S |

Per-engine sub-scores: A1–A4 are evaluated **for each engine's crawler** (`Googlebot`, `OAI-SearchBot`+`Bingbot`, `Bingbot`, `PerplexityBot`, `Claude-SearchBot`). Footnote for honesty: `Google-Extended` controls Gemini-app grounding and training, **not** AI Overviews — blocking it is a policy choice, not an AIO opt-out (§2, §8.3).

### 3.2 Render (5 checks)

| # | Check | Detection | Method | Fix effort |
|---|---|---|---|---|
| R1 | Raw-HTML content coverage — homepage | % of tokens present in raw HTML that a browser renders (the flagship metric nobody has measured on top sites; our study's axis, `data-assets-and-interactives.md` §3) | RENDER + HTTP | dev |
| R2 | Same, on one money page (pricing/docs) | as above | RENDER + HTTP | dev |
| R3 | JSON-LD present in **raw** HTML (tag-manager-injected schema is invisible, §8.2) | parse raw HTML directly | HTTP | S |
| R4 | Critical facts not locked in images/screenshots (prices, specs) | price-keyword presence in text vs image-only detection | HTTP heuristics | M |
| R5 | App-shell signature when no renderer is available (estimate) | empty `#root`/`#app`, content:HTML ratio, framework markers; **labeled "estimated"** | HTTP | — |

### 3.3 Extract (7 checks)

| # | Check | Detection | Method | Fix effort |
|---|---|---|---|---|
| X1 | Definition block — answer-first opening with the entity named | first substantive paragraph heuristics (position, length, entity nouns, no windup patterns) | HTTP | S |
| X2 | Question-shaped H2/H3s, clean hierarchy, exactly one H1 | heading tree parse | HTTP | S |
| X3 | One structured artifact per money page (table / numbered steps / checklist) | table/list/steps detection | HTTP | S |
| X4 | FAQ block with FAQPage schema matching visible text byte-for-byte (our `check:seo` parity rule, applied externally) | DOM text vs JSON-LD diff | HTTP | S |
| X5 | Title/meta/canonical hygiene per template | length budgets, self-canonical | HTTP | S |
| X6 | Internal links with descriptive anchors; hub pages link out | anchor-text analysis, crawl depth of sample | HTTP | M |
| X7 | Thin-content guardrails: ≥300 unique words on money pages; no near-duplicate template variants | word counts, shingle similarity across sampled pages | HTTP | M |

### 3.4 Evidence / Quotability (6 checks — the Princeton levers, measured)

| # | Check | Detection | Method | Fix effort |
|---|---|---|---|---|
| Q1 | Statistics density — numeric claims per 100 words (+31% lever) | regex + context heuristics (exclude dates/nav counters) | HTTP | M |
| Q2 | Attributed quotations — real quotes with named speaker (+41% lever) | quote-mark + attribution-name patterns | HTTP | M |
| Q3 | Outbound citations to credible domains with links (+28% lever) | link graph + allowlist of credible TLDs/domains | HTTP | S |
| Q4 | Fluency / anti-stuffing: sentence-length distribution, repeated n-gram detection (stuffing was the one *negative* lever, −8%) | NLP heuristics | HTTP | M |
| Q5 | Numeric explicitness — real prices, dates, units, not "contact us" | pricing-page number presence | HTTP | S |
| Q6 | Original-data assets exist (a `/research` or study page) | route pattern + stats density | HTTP / ASK | L |

### 3.5 Entity / Trust (6 checks)

| # | Check | Detection | Method | Fix effort |
|---|---|---|---|---|
| E1 | Organization JSON-LD complete: `@id`, name, url, logo, `sameAs[]` | schema parse | HTTP | S |
| E2 | `sameAs` profiles live and consistent (LinkedIn, X, GitHub, Crunchbase, G2, Product Hunt) | fetch each URL, compare name/description | HTTP | M |
| E3 | Wikidata entity exists + bidirectional link (`P856` official website ↔ our `sameAs`) | SPARQL query by domain | API | M |
| E4 | Author bylines + credentials on editorial pages (`Person` schema) | page template detection | HTTP | S |
| E5 | Canonical brand spelling consistent across self + profiles | string comparison across fetched sources | HTTP | S |
| E6 | Trust furniture in raw HTML: contact, about, legal | parse | HTTP | S |

### 3.6 Freshness (4 checks)

| # | Check | Detection | Method | Fix effort |
|---|---|---|---|---|
| F1 | `dateModified` in JSON-LD + visible "Last updated" line | parse | HTTP | S |
| F2 | Real recency: sitemap `lastmod` and Wayback CDX last-snapshot as evidence proxy | CDX API | API | — |
| F3 | Refresh cadence exists as a policy (not one-off edits) | self-report | ASK | M |
| F4 | Changelog indexable and maintained | route + recency | HTTP / ASK | S |

### 3.7 Off-site presence — checklist, unscored in v1 (5 items)

| # | Item | v1 detection |
|---|---|---|
| O1 | G2 / Capterra / Product Hunt listing accurate | ASK + user-pasted URL verified by fetch |
| O2 | Reddit / community footprint (genuine participation) | ASK |
| O3 | YouTube presence with transcripts | ASK |
| O4 | "Best-of" listicle mentions | ASK (real measurement = prompt runs, §11) |
| O5 | Digital PR / original study cadence | ASK |

Why unscored: 82.9% of AI citations point to third-party sources (§5.4) — off-site is genuinely half of GEO. But it's not reliably measurable from outside in v1, and a self-report shouldn't move a score that claims to be auditable. Keep it a checklist with targets; score it once prompt runs exist.

### 3.8 Measurement badges (5 items — gates for "you can see your progress")

M1 GSC verified + **opted into generative AI features** (the Generative AI performance report requires it) · M2 BWT + AI Performance / **Citation Share** · M3 GA4 with an AI-referrer channel group · M4 server-log monitoring for Tier-1 crawler hits and 403/429s · M5 a 30–50 prompt buyer-prompt set tracked monthly across engines.

---

## 4. The form — 8 questions, 60 seconds

Design principle: **URL first, questions second, accounts third.** The URL scan returns an instant partial report; each answer refines weights, unlocks checks, and re-personalizes the action queue. Nothing is mandatory except the URL.

| # | Question | Type | What it changes |
|---|---|---|---|
| 1 | What should you be cited for? Paste 3–5 queries a customer would ask. | free text | target-intent framing; recommendation examples use their real queries; seeds the future prompt set |
| 2 | What kind of site is this? (SaaS / e-commerce / local / publisher / agency / nonprofit) | select | engine defaults, off-site targets, weighing of commercial vs informational templates |
| 3 | Which engines matter to you? | multi-select, pre-checked from #2 | `userWeight[e]` in the aggregate score |
| 4 | Do you control how pages are rendered, or is it a platform/CMS? | select | fix copy switches between "add SSG/SSR" and "talk to your platform — here's the exact ask" |
| 5 | Your role? (founder / marketer / developer) | select | tone and depth of the action queue |
| 6 | Off-site presence — check what's live: G2/Capterra, Product Hunt, Crunchbase, Wikidata, Reddit, YouTube. | multi-select | verifies claims by fetch; converts unchecked items into tasks |
| 7 | Publishing reality: who writes content, and can you add stats/quotes? | select | recommendation realism (never tell a solo founder to "run a quarterly data study") |
| 8 | Measurement setup: GSC, BWT, GA4 — which exist? | multi-select | M1–M3 badges + prompts to connect (§5) |

Guardrail: each question must visibly change the output on the report ("because you said X, weight for Perplexity rose") — otherwise it's friction, cut it.

---

## 5. Connected accounts — the precision upgrade (v2)

| Connection | Unlocks | Notes |
|---|---|---|
| **Google Search Console** | real indexation status, canonical selection, AI Performance report opt-in; **URL Inspection API returns Google's rendered HTML + index verdict** — the single best rendering ground truth available, free | OAuth; 2,000 inspections/day/property |
| **Bing Webmaster Tools** | index coverage for the Bing pipeline (feeds ChatGPT + Copilot); **AI Performance report incl. Citation Share** | API available; this is the ChatGPT-adjacent ground truth |
| **GA4** | AI-referrer channel group (chatgpt.com, perplexity.ai, copilot.microsoft.com, gemini.google.com…) with landing pages + conversion rate vs organic baseline | OAuth; read-only scope |
| *(later)* Cloudflare/CDN | audit for **silent AI-crawler blocks** in bot-management rules (Cloudflare can block even when robots.txt allows — §2) | read-only token |

---

## 6. The report — what the user receives

Order matters; it is a diagnosis, not a dashboard dump.

1. **Verdict** — band label + the per-engine bars (Google 71 · ChatGPT 48 · Perplexity 62 …). Never one number alone.
2. **The one thing** — largest gate flag as a sentence: *"GPTBot's cousin `OAI-SearchBot` is blocked — you are invisible to ChatGPT search right now."*
3. **What AI sees** — side-by-side: our raw fetch vs (when renderer available) the rendered page, missing regions highlighted. This is the demo, the lead magnet, and the evidence in one artifact (`data-assets-and-interactives.md` §4.2 #8).
4. **Action queue** — all findings ranked by expected gain ÷ effort, grouped **This week / This month / This quarter**, each with: evidence receipt (their actual HTML snippet), fix playbook (static per check), expected points, engines affected.
5. **Off-site checklist** — presence targets with honest labeling of what v1 can't verify.
6. **Measurement badges** — M1–M5 with connect buttons.
7. **Methodology + limitations** — ruleset version, sample size ("homepage + 1 money page + robots + sitemap — sampled, not sitewide"), fetch timestamps, what we couldn't check and why. Trust is the product (§5.4 of the data brief).

**Shareability**: a templated OG score-card image — band, top finding, and the biggest blocker in one sentence. The live report itself stays **noindex, token-URL** — do not spawn public thin pages per audited domain; that is exactly the scaled-content-abuse line our own docs warn about (`seo-research.md` §3.4). The score card links to a methodology page, which *is* indexable and is the citation bait.

---

## 7. Recommendation engine mechanics

```
check results ──▶ findings (check, severity, evidence, engines)
                    │
                    ▼   rule engine (static per check)
              fix playbook + effort (S/M/L) + expected gain Δ
                    │
                    ▼   rank: severity, then Δ/effort
              action queue ──▶ LLM garnish (optional): personalized copy
```

- **Scoring, gates, robots parsing, schema validation: deterministic.** Defensible, reproducible, cheap, testable against fixtures. This also lets the report say "every point is explained below" — an LLM-scored audit can't.
- **LLM where it earns its keep**: (1) rewrite fix copy using the user's actual page/snippet; (2) classify sampled pages and infer target intents from question #1; (3) draft editor-reviewable artifacts — a definition block rewrite, FAQ questions from their content, a comparison-table skeleton; (4) generate the 5-sentence executive summary. Temperature 0, cached per finding, always labeled "draft — review before publishing."
- **Never** auto-publish generated content suggestions as finished copy (scaled-content-abuse guardrail), and never let the LLM touch the score.
- Ruleset version pinning makes audits reproducible; the fixture suite (a set of synthetic sites exercising every check) becomes the QA gate.

---

## 8. Vercel architecture

### 8.1 Request flow (v1 — URL scan)

```
POST /api/audit { url, answers? }
  1  validate + normalize URL (SSRF guard, §8.4)          ~0ms
  2  rate-limit check (Upstash Ratelimit) + KV cache hit? TTL 24h/domain
  3  fetch batch — all parallel, 6s budget:
       robots.txt · homepage (raw) · deep page (pricing/docs, discovered)
       sitemap.xml · llms.txt · UA-compare fetches (GPTBot/OAI-SearchBot/PerplexityBot/ClaudeBot/Bingbot headers)
       Wikidata SPARQL · Wayback CDX · CrUX API
  4  extract + score (scoring-vN ruleset)
  5  store report (KV/Postgres, keyed by reportId) → respond
```

- Fast path p95 target ≤ 8s — stream the response section-by-section if needed (Vercel supports streaming responses), or fall back to job+polling for the render-augmented variant.
- Set `export const maxDuration` explicitly per route; verify current plan limits before launch (Hobby is tight — the design must not depend on long invocations).
- **Caching is politeness**: one audit per domain per 24h globally cached; ≤1 concurrent fetch per target domain; honest UA (`SeobotAuditBot/1.0 (+https://seobot.example/bot)`); back off on 429; never more than ~4 pages per site in v1.
- Weekly re-scores for saved domains via **Vercel Cron** (`vercel.json` → `crons`) writing "what changed" deltas.

### 8.2 The rendering problem — tiered, not all-or-nothing

A headless Chromium does not belong in a Vercel function (cold starts, size, timeout). Tiers:

| Tier | Method | Cost | When |
|---|---|---|---|
| T0 | **Heuristic estimate** — app-shell signatures, raw word count (R5). Labeled "estimated." | ~0 | v1 |
| T1 | **External render API** (Browserless / Browserbase / ScrapingBee render endpoint) — one fetch per audited page | cents | v1.5, for the flagship "what AI sees" diff |
| T2 | **GSC URL Inspection API** — Google's own rendered HTML + index verdict, when the user connects GSC | free | v1.5, connected users |
| T3 | **Own Playwright worker** (Fly.io / Cloud Run) — shared with the product's crawl engine (`data-assets-and-interactives.md` §3) | infra | v2, when full-site audits need it |

Decision: v1 ships T0 and says so; the JS-wall diff (T1/T2) is the *v1.5 flagship* because it's both the best demo and the check with the largest typical point swing.

### 8.3 Storage and shape

- **KV/Redis (Upstash)**: 24h audit cache + rate limits. **Postgres (Neon)** when saved reports, accounts, and history arrive.
- Report payload = one typed JSON (`AuditReport`, §9) with an embedded ruleset version — the UI renders from it and the raw report is also the support/debug artifact.
- Data artifacts convention stays as in the data brief (§5.5): study outputs as `scripts/data/*.json` → typed `src/content/` modules. The audit engine consumes the *same* crawler-list module as `/ai-crawlers` — one source of truth for user agents, operators, and recommendation tiers.

### 8.4 SSRF + abuse guard (non-negotiable for a "paste a URL" endpoint)

Scheme allowlist (http/https only) · resolve DNS and reject private/loopback/link-local/reserved ranges and cloud metadata IPs (v4 + v6) · re-validate at every redirect hop, cap at 3 · connect-to-resolved-IP with the resolved Host/SNI to defeat DNS rebinding · 5MB response cap, 8s timeout, content-type allowlist · no cookies, no auth headers forwarded · per-IP rate limit (e.g., 3 free audits/day) + optional Turnstile · strip query strings from stored URLs (privacy) · never fetch `file:`, `gopher:`, or non-default ports.

### 8.5 What stays static on the marketing site

Per the site's own guardrails (`data-assets-and-interactives.md` §5): the quiz can ship a **static, prerendered questionnaire with a self-assessment score** (pure client-side, zero backend) as v0 marketing content — clearly labeled "self-assessment." The URL scan is server-side from day one; never fake it client-side.

---

## 9. Data model (TypeScript sketch)

```ts
type Engine = "google" | "chatgpt" | "copilot" | "perplexity" | "claude";
type Dimension = "access" | "render" | "extract" | "evidence" | "entity" | "freshness";
type CheckStatus = "pass" | "partial" | "fail" | "unknown" | "skipped";
type Method = "http" | "ua-compare" | "render" | "ask" | "connect" | "api";

interface CheckResult {
  id: string;                       // "A1" | "R3" | "Q1" | ...
  dimension: Dimension;
  engine?: Engine;                  // access checks are per-engine
  status: CheckStatus;
  evidence?: string;                // the snippet we actually saw
  note?: string;                    // why we couldn't check, if skipped
  method: Method;
}

interface Finding {
  checkId: string;
  severity: "critical" | "high" | "medium" | "low";
  flag?: string;                    // "ROBOTS_BLOCK_CHATGPT" | "JS_ONLY_CONTENT" | ...
  engines: Engine[];                // who is affected
  fix: { summary: string; playbook: string; effort: "S" | "M" | "L" };
  expectedGain: number;             // points, computed from the score model
}

interface AuditReport {
  ruleset: string;                  // "scoring-v1.0"
  target: { url: string; domain: string; pagesSampled: string[] };
  createdAt: string;
  scores: {
    dimensions: Record<Dimension, number>;      // 0..100
    engines: Record<Engine, number>;            // per-engine readiness
    overall: number;                            // userWeighted
    band: "at-risk" | "foundation" | "citation-ready" | "durable";
  };
  checks: CheckResult[];
  findings: Finding[];              // ranked
  offsite: { item: string; claimed: boolean; verified: boolean | null }[];
  measurement: { badge: string; status: CheckStatus; connect?: string }[];
  limitations: string[];            // sampling, renderer tier, fetch failures
}
```

---

## 10. Roadmap

| Phase | Scope | Depends on |
|---|---|---|
| **v0 — static** | Prerendered questionnaire with self-assessment score on `/tools/geo-check`; static "see what GPTBot gets" examples using 3 pre-fetched sites | none — pure site content; adds an indexable tool page |
| **v1 — URL scan** | Vercel function: robots/UA-compare/raw HTML/sitemap/schema/Wikidata/CrUX/Wayback + T0 render estimate; KV cache; rate limits; full report UI | Vercel deploy, KV |
| **v1.5 — the flagship diff** | T1/T2 rendering; "what AI sees" side-by-side; share card; saved report links | render vendor or GSC OAuth |
| **v2 — accounts** | GSC/BWT/GA4 connect, saved domains, weekly cron re-audit + change alerts, badges M1–M4 | Postgres, OAuth apps |
| **v3 — calibration + monitoring** | Prompt-set citation runs (30–50 prompts/month), empirical weight fitting (§11), competitor comparisons, full-site crawl via T3 worker | prompt-set ops, enough audit volume |

Cross-reference: v0/v1 satisfy items #8 and #13 of `data-assets-and-interactives.md` §4 at "M/L effort — needs backend." This document is the backend spec.

---

## 11. Calibration — how the formula stops being a hypothesis

1. **Instrument from day one**: store every audit (anonymized) with its dimension scores; store every prompt-run citation outcome once the prompt set exists.
2. **Fit**: once there are ~100+ site observations across engines, fit a simple model (`cited ~ dimension scores`, logistic per engine) and publish reweighted `scoring-v2` with a changelog: *"freshness weight for Perplexity raised after N=… audits."*
3. **Say so in the methodology**: "weights are priors informed by published research (KDD 2024; Seer; Ahrefs), calibrated on our own audit corpus; versioned." No competitor can copy the calibration without the corpus.
4. **Never promise the outcome.** The deliverable is *readiness* — the set of gates you control. Visibility varies by prompt, region, session, and day (65% citation churn, §5.3). The report says this plainly; that honesty is itself a differentiator in a category full of fake "AI visibility scores."

---

## 12. Open questions

- [ ] Default engine presets per vertical (Q2) — who defines the mapping table?
- [ ] Render tier for launch: T0-only honesty vs. shipping T1 earlier because the side-by-side diff is the demo?
- [ ] Free-tier limits (audits/day, pages/site) and what is gated vs. open — the tool's job is lead-gen for the product; the score card should never be gated.
- [ ] Share card: image-only, or also a public-but-noindex report URL with a token? (Recommend image + noindex token URL.)
- [ ] Where does the v1 function live: same Vercel project as the site, or `app.` subdomain from day one (the audit engine is product infrastructure; the site tool is its first client)?
- [ ] Who owns the prompt set (M5) — the piece every other GEO vendor keeps closed; our methodology-first posture argues for eventually publishing the fixed prompt list and cadence.

---

## Sources

Primary facts and levers: `docs/geo-research.md` and `docs/seo-research.md` (both with full source lists — Princeton/KDD 2024 GEO paper, Vercel/MERJ crawler study, SSRN JS-rendering gap study, Seer, Ahrefs, Google Search Central, OpenAI/Anthropic/Perplexity crawler docs).

Added in this brief:
- RFC 9309 — Robots Exclusion Protocol (group semantics, wildcard rules)
- Google Search Console — URL Inspection API (rendered HTML + index verdict; 2,000/day/property)
- Google — Generative AI performance report opt-in requirements
- Microsoft — Bing Webmaster Tools AI Performance / Citation Share
- Chrome UX Report API (crux) — field CWV by origin
- Wikidata SPARQL endpoint — `P856` (official website) entity lookup
- Internet Archive — Wayback CDX API (last-snapshot freshness proxy)
- Vercel — Functions limits & streaming, Cron Jobs, `@vercel/kv`; serverless + headless-browser pattern (external render providers: Browserless / Browserbase / ScrapingBee)
- OWASP — SSRF Prevention Cheat Sheet (the §8.4 guard checklist)
