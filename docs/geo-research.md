# GEO Deep Research — How AI Crawlers, Indexes, and Answer Engines Work

> Companion to `docs/seo-research.md` (classic SEO fundamentals). This document goes one level deeper on the AI layer: who crawls the web, what they can actually read, how answer engines choose sources, what earns citations, and what to build. Compiled October 2026. Sources listed at the bottom; key claims cited inline.

---

## TL;DR — the 12 findings that matter most

1. **Every AI answer goes through the same 5-stage pipeline**: crawl → index → retrieve (live, per query) → re-rank/re-select → synthesize + cite. We only control the first two stages directly; the last three are won with content quality, structure, and freshness.
2. **The JavaScript wall is real and is the single biggest technical gate.** Major AI crawlers (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot, Bytespider) **do not execute JavaScript** — verified across 500M+ crawler fetches (Vercel/MERJ). Only Google renders JS for its AI surfaces (Googlebot's Web Rendering Service is shared with Gemini). A client-rendered Vite SPA ships an empty shell to every AI engine except Google. This confirms the SSG/prerender decision in `seo-research.md` §2.1 — treat it as existential.
3. **There are three classes of AI crawler, and they are separate robots.txt decisions**: training crawlers (GPTBot, CCBot, Google-Extended token), **search/answer-index crawlers (OAI-SearchBot, PerplexityBot, Claude-SearchBot — allow these or you are invisible in AI answers)**, and user-fetching agents (ChatGPT-User, Perplexity-User, Claude-User — these fire when a user or agent requests a page and may ignore robots.txt).
4. **ChatGPT search runs on Bing's index.** Reported Seer data: 87% of sources cited by ChatGPT Search appear in Bing's top 20 (vs 56% overlap with Google's top 20). Bing Webmaster Tools, sitemaps, and IndexNow are now AI-search infrastructure, not an afterthought.
5. **Google's AI Overviews / AI Mode run on the core Search index via Googlebot** — no special files, markup, or "chunking" required. Google explicitly ignores `llms.txt` and says there is no special schema for AI. Measurement lives in the new GSC **Generative AI performance report** (requires opting the property into generative AI features).
6. **Google-Extended is not an AI Overviews opt-out** (top misconception). It's a token controlling Gemini training/grounding outside Search. Blocking it doesn't affect Search inclusion or ranking — and 92.3% of top news sites that blocked it still appear in AI citations.
7. **Perplexity is the freshness maximalist**: it searches live, re-crawls established sites weekly-to-monthly, uses sitemap `lastmod` as a recrawl signal, fetches ~10 pages per query, cites 3–8, and passes referral traffic that converted at **10.5% vs 1.76% for Google organic** on one B2B client (Seer).
8. **What earns extraction (Princeton GEO paper, the field's foundational study)**: quotation addition (+41% visibility), statistics addition (+31%), cite sources (+28%), fluency (+28%). **Keyword stuffing did nothing.** Best combo: fluency + statistics. Lower-ranked sites benefit most (+115% for a rank-5 site adding citations).
9. **~83% of AI citations point to third-party sources**, not the brand's own site (83,670-citation dataset). Reddit, YouTube, Wikipedia, review platforms, and "best-of" listicles dominate citation shares in AI Overviews, ChatGPT, and Perplexity. Off-site presence is half of GEO.
10. **Get on Wikidata with a full `sameAs` chain.** LLMs and Google's Knowledge Graph both build on entity layers; a consistent Organization schema + Wikidata Q-number + aligned profiles is the cheapest durable way to be a "known thing" rather than "unresolved text."
11. **Freshness is a retrieval signal.** ~75% of pages cited by AI engines were updated within the last year; citation half-life runs ~39 days for timely queries. `dateModified`, changelogs, and a real refresh cadence matter.
12. **AI referrals are small but convert.** All AI assistants combined are still ~0.3% of site traffic vs ~42% for Google — but AI traffic converts at multiples of organic (Perplexity 10.5% vs Google 1.76% on a Seer client; Adobe measured AI retail conversions 31% better than non-AI). Track it from day one.

---

## 1. The pipeline: how an AI answer is built

```
                       ┌──────────────┐   ┌──────────────┐   ┌────────────────────────────┐
  your site ──────────▶│  1  CRAWL    │──▶│  2  INDEX    │──▶│  3  RETRIEVE (live query)  │
                       │ bots fetch   │   │ embed/store  │   │ fan-out → search index →  │
                       │ raw HTML     │   │ chunks+meta  │   │ fetch top ~10-50 pages     │
                       └──────────────┘   └──────────────┘   └──────────────┬─────────────┘
                          we control        we control                      │
                                                                           ▼
                       ┌──────────────────────────────┐   ┌────────────────────────────┐
                       │  5  SYNTHESIZE + CITE        │◀──│  4  RE-RANK / RE-SELECT    │
                       │  answer w/ inline citations  │   │ model picks which pages/   │
                       │  (0-20 citations per answer) │   │ passages to actually use   │
                       └──────────────────────────────┘   └────────────────────────────┘
```

- **Crawl + index**: gated by robots.txt, rendering (JS!), sitemaps, discovery links. If a bot can't fetch real HTML, everything downstream is zero.
- **Retrieve**: engines decompose the query ("query fan-out" in Google's terms — one user question becomes several concurrent sub-queries), hit their search index (Google's, Bing's, Perplexity's own), and fetch candidate pages per sub-query.
- **Re-rank/re-select**: the model evaluates candidate passages for relevance, extractability, and evidence quality. Being *retrieved* is not the same as being *cited*.
- **Synthesize + cite**: answers include a limited set of inline citations. Studies of "selection vs absorption" (Zhang et al., 2026) show engines differ: ChatGPT cites ~6.9 sources per answer, Google ~12, Perplexity ~16 — but per-source influence on the answer runs the other way.

**Implications:** technical crawlability gets you into the pipeline; content structure and evidence quality decide whether you survive stage 4. Off-site signals (entity, third-party mentions) influence stages 3–4 too.

---

## 2. Crawler taxonomy — who is who, and what blocking each one actually does

Each vendor runs multiple crawlers for different jobs. Blocking one does **not** block the others.

### Tier 1 — search/answer crawlers (allow these; blocking = invisible in AI answers)

| User agent | Operator | Purpose | If you block it |
|---|---|---|---|
| `OAI-SearchBot` | OpenAI | Builds the index behind ChatGPT search citations | Removed from ChatGPT search answers (robots.txt changes take ~24h) |
| `PerplexityBot` | Perplexity | Indexes pages for Perplexity citations | Removed from Perplexity's retrieval pool |
| `Claude-SearchBot` | Anthropic | Search quality / retrieval for Claude answers | Less visibility in Claude's web-search answers |
| `Bingbot` | Microsoft | Bing index — which also powers Copilot and feeds ChatGPT retrieval | Removed from Copilot, Bing AI summaries, and a large slice of ChatGPT's candidate pool |
| `Googlebot` | Google | Search index — which powers AI Overviews and AI Mode | Removed from Search entirely (including all Google AI surfaces) |

### Tier 2 — user-fetching agents (allow; they fire when a person or agent targets your URL)

| User agent | Operator | Behavior |
|---|---|---|
| `ChatGPT-User` | OpenAI | Fetches a page inside a live ChatGPT session (user clicked/asked); OpenAI notes robots.txt may not apply to these fetches |
| `Perplexity-User` | Perplexity | Real-time fetch for a user query; "generally ignores robots.txt" per docs |
| `Claude-User` | Anthropic | User-requested fetches |

These behave like an assistant opening your page for a user — blocking them yields 403s in front of real users and agents. Allow them.

### Tier 3 — training crawlers (policy choice, not visibility)

| User agent | Operator | What blocking opts out of |
|---|---|---|
| `GPTBot` | OpenAI | Future OpenAI model training |
| `ClaudeBot` | Anthropic | Claude model training |
| `Google-Extended` (token, not a crawler) | Google | Gemini model training + grounding in Gemini Apps/Vertex AI. **Does not affect Search, AI Overviews, or AI Mode.** |
| `Applebot-Extended` (token) | Apple | Apple Intelligence training |
| `CCBot` | Common Crawl | Open web archive used in many training sets |
| `Bytespider` | ByteDance | TikTok/ByteDance models (aggressive; often blocked) |
| `Meta-ExternalAgent`, `cohere-ai`, `Amazonbot` | Meta, Cohere, Amazon | Training/retrieval for their products |

**Our recommendation for Seobot:** allow everything except `Bytespider` (aggressive, no citation value to us). We are an SEO product; being invisible to AI answers is a credibility problem, and our public content is our marketing. Keep only `/app` and private routes disallowed for all agents.

### How fast do they discover new pages? (first-party crawl data, 300 new pages, 24h window)

| Crawler | First request after publish | Pages covered in 24h |
|---|---|---|
| GPTBot | **14 minutes** | 37.3% |
| OAI-SearchBot | 2h 18m | 13.7% |
| ClaudeBot | 4h 42m | 2.3% |
| PerplexityBot | 6h 11m | 1.7% |
| All combined | 14 min | 43% |

Takeaway: publish → submitted in sitemap with correct `lastmod` → expect meaningful AI coverage within ~24h; completeness takes days. New/updated sitemaps + IndexNow (Bing/Copilot) + strong internal links accelerate discovery.

### Verification hygiene

- Bot user-agents are spoofable. For allow/block decisions at the WAF level, verify against each vendor's published IP ranges (OpenAI, Perplexity, Anthropic all publish JSON endpoints).
- Cloudflare and similar WAFs can silently block AI crawlers even when robots.txt allows them — audit bot-management rules explicitly (Cloudflare found stealth crawling by some vendors, but that doesn't change our allow policy).
- Watch `403`/`429` status codes in logs for the Tier 1 user agents; those are config bugs, not content problems.

---

## 3. Rendering: the JavaScript wall

This is the most consequential technical fact in GEO, so it gets its own section.

**What the data says:**

- **Vercel/MERJ analysis of 500M+ crawler fetches (2025–26):** none of the major AI crawlers execute JavaScript — GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot, and Bytespider all fetch raw HTML. They download `.js` files in some cases (ChatGPT ~11.5% of fetches, Claude ~23.8%) but never run them.
- **GSQi controlled experiment:** ChatGPT told a user it "could not read the content of the page because it relied on JavaScript-based rendering" — then successfully read the identical content after it was server-rendered.
- **SSRN study (405 small-business sites, June 2026):** 25.0% had at least one answer-critical element (headings, body copy, contact info, JSON-LD) visible in a rendered browser but **absent from the raw HTML a non-rendering crawler receives**; 14.7% had contact info invisible. Sites on platforms that server-render by default were AI-invisible 4% of the time vs 28.3% for the rest.
- **The Google exception:** Google's AI surfaces (AI Overviews, AI Mode, Gemini) share Googlebot's Web Rendering Service, so they *can* execute JS — eventually, in a second wave. That's why a CSR app can rank in Google while being invisible to ChatGPT, Claude, and Perplexity.

**What this means for Seobot:**
1. Every marketing route must ship **complete HTML at build time (SSG/prerender)** — hero copy, headings, FAQ text, comparison tables, JSON-LD, links. Same conclusion as `seo-research.md` §2.1; the crawler data above is the proof.
2. The app (behind login, `noindex`) can stay a client SPA — nothing about it should be AI-visible anyway.
3. Keep JSON-LD server-rendered. Tag-manager-injected schema is invisible to every non-Google AI crawler.
4. **Test with curl, not DevTools.** The one-line canary:

```bash
curl -s -A "GPTBot" https://seobot.example/pricing | grep -i "14-day free trial"
curl -s -A "OAI-SearchBot" https://seobot.example/pricing | grep -i "14-day free trial"
```

If the grep misses, AI engines see an empty shell — regardless of what the browser shows.

---

## 4. Engine-by-engine mechanics

### 4.1 ChatGPT (OAI-SearchBot + Bing index + its own re-ranking)

- **Candidate pool:** ChatGPT's web retrieval has been built on **Bing's web index**; OAI-SearchBot crawls separately to build OpenAI's own search index. Reported overlap: **87% of ChatGPT Search citations were found in Bing's top 20** for the same query; only 56% overlapped Google's top 20 (Seer Interactive, via Am I Cited).
- **Selection:** after retrieval, ChatGPT re-ranks for directness of answer, specificity, extractability, recency, and source quality. It typically cites 3–8 sources; reported mean ~6.9.
- **Controls:** allow `OAI-SearchBot` (robots.txt changes take effect ~24h); allow traffic from published IP ranges at the CDN; `GPTBot` is only relevant to training.
- **Read this as:** a Bing visibility program is a ChatGPT visibility program. Bing Webmaster Tools + sitemaps + IndexNow are not optional for us.

### 4.2 Perplexity (own index + Bing; freshness-weighted)

- **Mechanics:** every query triggers live search — query decomposition into sub-queries, ~10 pages fetched, 3–8 cited as numbered inline sources. Retrieval blends Perplexity's own index (PerplexityBot) with Bing.
- **Recrawl cadence:** weekly-to-monthly for established sites publishing regularly; monthly initial for newer sites; faster with strong backlink profiles and fresh sitemaps; slower for stale `dateModified` values and pages with 5xx errors.
- **What it rewards:** direct answers in the first ~100 words, single-purpose pages over sprawling ones, format matching intent (tables for comparisons, steps for how-tos), and notably **freshness** — a recent update can out-cite older, higher-authority content.
- **Unique asset:** Perplexity referral traffic. One Seer B2B client: **10.5% conversion vs 1.76% for Google organic**. Even small citation volumes are worth chasing.

### 4.3 Google AI Overviews / AI Mode (core Search index)

- **Official mechanics (Google Search Central, July 2026):** AI features are grounded in core Search ranking — **RAG over the Search index** plus **query fan-out** (one query spawns several parallel related queries; sources are selected across the fan-out).
- **Prerequisites:** page must be indexed, snippet-eligible, and the site must be verified and **opted into generative AI features in Search Console** for measurement.
- **What Google says you do NOT need:** `llms.txt` or other special files ("Google Search ignores them"), content "chunking," AI-specific rewrites, inauthentic mentions, or special schema. It also warns that manufacturing content for every fan-out query variant violates the scaled-content-abuse policy.
- **What correlates with citation:** 38% of AI Overview citations come from pages already ranking in the top 10 for the query (down from ~76% in mid-2025 — the overlap is shrinking as fan-out source selection grows); AI Overviews now appear for **83% of branded searches** (up from 61% in July 2026).
- **AI Overviews bias:** heavy on YouTube (22.9% of top-50 citations), Reddit (18.5%), Facebook, Google properties, Wikipedia — and it shows what's said *about* products across the web, including forums and videos.
- **Economics:** being in an AI Overview reduced position-1 CTR by ~58% when present (Ahrefs, Dec 2025), but *being cited* is associated with **+120% more organic clicks per impression** than not being cited (Seer, 2026). The right goal: get cited or get clicked — not just rank.

### 4.4 Microsoft Copilot / Bing

- Copilot grounds answers in Bing search; "Bing's crawl, index, and ranking" are the foundation. Bing Webmaster guidelines ≈ what Microsoft tells sites to do for AI visibility.
- **IndexNow**: instant URL-change notifications; Microsoft says it reduces stale URLs in Copilot grounding results. Cheap to implement, do it.
- **`NOARCHIVE`** tag keeps a page out of Copilot answers (us; don't use it).
- **Measurement:** Bing Webmaster Tools **AI Performance report** (since Feb 2026; June 2026 added Intents, Topics, **Citation Share**, and Compare) tracks citations across Copilot and Bing AI summaries. Free. Enable on day one.

### 4.5 Claude / Anthropic

- Separate crawlers: `ClaudeBot` (training + retrieval corpus), `Claude-SearchBot` (search answers), `Claude-User` (user-requested). Allow all three; no downside for a public marketing site.
- Anthropic leans heavily on grounded search in the Claude consumer apps; docs-heavy content (our future docs/API pages) is over-represented in Claude citations relative to other engines (highest brand-domain citation share in one dataset at 22.2%).

### 4.6 The rest

- **Grok (xAI):** Reddit/YouTube/X-heavy citation mix (Reddit 16.3%, YouTube 15.1%, Facebook 13.9% of top-50 cited sources). Little site-level leverage today beyond having a clean entity and presence on those platforms.
- **Apple Intelligence / Applebot-Extended:** token controls model training; Siri/Spotlight use Applebot. Low priority; allow by default.
- **Meta AI, Amazon, Cohere:** training-side; allow unless we have a reason not to.

---

## 5. What makes content retrievable and quotable

### 5.1 How retrieval sees your page

RAG systems split pages into passages (~256–512 token chunks at index time) and retrieve at passage level. You do not need to "chunk" your content (Google explicitly says so) — but the implication stands: **each section of a page should be self-contained and quotable**. A standalone passage that fully answers a sub-query is what gets retrieved. That's why "answer-first, then detail" beats a slow build to the point.

Structural translation:
- One idea per section; question-shaped H2/H3s that match how people ask.
- Lead each section with a direct, complete answer sentence (the "extraction point"), then expand.
- Comparison tables for "X vs Y" and "best of" queries; numbered steps for how-tos; bullet lists for options.
- Keep entity names, numbers, and dates explicit in the passage — pronouns and "as mentioned above" don't survive chunking.

### 5.2 The measured GEO levers (Princeton GEO paper, KDD 2024)

Baseline visibility index: 19.3. Relative improvements on position-adjusted word count:

| Method | Index | Relative lift | Verdict |
|---|---|---|---|
| **Quotation Addition** (real quotes with attribution) | 27.2 | **+41%** | Best single method |
| **Statistics Addition** (quantitative data) | 25.2 | +31% | Best pairing (with fluency) |
| **Fluency Optimization** (clear, readable prose) | 24.7 | +28% | Compounds with everything |
| **Cite Sources** (credible outbound citations) | 24.6 | +28% | Biggest lift for low-ranked sites (+115% for rank-5; −30% for rank-1) |
| Technical Terms | 22.7 | +18% | Mild |
| Easy-to-Understand | 22.0 | +14% | Mild |
| Authoritative tone | 21.3 | +10% | Weak |
| Unique Words | 20.5 | +6% | Negligible |
| **Keyword Stuffing** | 17.7 | **−8%** | Actively counterproductive |

Reproduced on live Perplexity: quotation/statistics additions improved visibility up to 37% in the wild. Domain notes: statistics matter most for law/gov/opinion; quotes for people/society/history; citations for factual content.

**Read:** every real stat, quoted expert with attribution, and outbound citation is a retrieval-bait asset. Every adjective and keyword run is noise.

### 5.3 Facts, freshness, and third parties

- **Freshness:** ~75% of AI-cited pages were updated within a year (Gemini 78%, ChatGPT 73%, Perplexity 65%); fitted citation half-life ≈ 39 days for high-timeliness queries, 68 days otherwise. Update `dateModified`, refresh examples/stats, and republish meaningfully.
- **Third-party dominance:** in an 83,670-citation dataset, **82.9% of AI citations pointed to non-brand sites** (Reddit, YouTube, Wikipedia, review platforms, listicles); brand sites earn only 13.5% (ChatGPT) to 22.2% (Claude) of mentions. In AI Overviews, YouTube leads all sources (22.9%), then Reddit (18.5%).
- **Engine divergence:** only 14% of the top-50 mentioned sources were shared across ChatGPT, Perplexity, and AI Overviews (Ahrefs); ~65% of cited sources change from day to day. A single "AI visibility score" is misleading — track engines separately.
- **Schema ≠ citations:** a controlled Ahrefs study (1,885 pages, May 2026) found schema markup produced no measurable citation uplift (differences within noise). Keep schema for rich results + entity clarity, but don't expect citations from it alone. (Consistent with Google's "no special schema" statement.)

### 5.4 Off-site citations (the half of GEO that isn't on our site)

Because most citations point elsewhere, the businesses AI engines trust are those discussed on the platforms the engines retrieve: Reddit threads, YouTube videos with transcripts, review platforms (G2/Capterra), and "best-of" listicles. For Seobot, the practical targets:

1. Get Seobot listed and accurate on G2/Capterra/Product Hunt (review platforms feed AI answers directly).
2. Seed genuine Reddit/community participation where our audience asks questions (r/SEO, r/bigseo, Indie Hackers) — no astroturfing.
3. Publish original data studies that others cite (see §7) — the most durable citation magnet.
4. Keep NAP-style consistency: identical brand name, description, and links everywhere.

---

## 6. The entity layer — becoming a "known thing"

How LLMs and knowledge graphs resolve "who is this brand?":

1. **Our Organization JSON-LD** with `@id`, `name`, `url`, `logo`, `foundingDate`, `sameAs[]` — our self-declaration.
2. **`sameAs` chain to authoritative profiles**: LinkedIn, X, GitHub, Crunchbase, G2, Product Hunt — and ideally a **Wikidata Q-number**.
3. **Wikidata**: the structured data layer feeding Google's Knowledge Graph and present in most LLM training corpora. Notability bar is "verifiable existence" (e.g., presence in Crunchbase or a business registry), far lower than Wikipedia's. One-time setup, durable payoff.
4. **Wikidata ← → our site should be bidirectional**: Wikidata's `official website` property points to us; our `sameAs` points to the Q-number.
5. **Consistent naming**: one canonical brand spelling everywhere; mismatches hand models conflicting entities.

Vendor claims of "3× AI Overview citations with entity completion" are not independently verified — but the mechanism (KG/entity grounding in retrieval) is well-established, and the work is cheap. Do it in week one of launch marketing.

---

## 7. `llms.txt` and special files — the honest verdict

- **What it is:** a proposed convention (Jeremy Howard, Sept 2024; v2 Aug 2026) for a curated Markdown index at `/llms.txt` (+ optional `/llms-full.txt` with full content). Related: `.md` versions of pages via content negotiation, `rel="alternate" type="text/markdown"`.
- **What Google says:** Search ignores it entirely — won't help, won't hurt. No ranking or AI-surface effect.
- **What the logs say:** Ahrefs analyzed 137,210 domains (May 2026): **97% of `llms.txt` files received zero requests.** AI retrieval bots accounted for ~1.1% of traffic to those files; coding agents (Cursor, Claude Code, etc.) were 10.5% of requests — the largest AI category. Mintlify reports 66% of traffic to its hosted docs now comes from agents.
- **Verdict for Seobot:** ship a curated `llms.txt` + generate `.md` versions of docs pages at build time — it costs one build script, helps dev-tool agents and IDE assistants (a real audience for an SEO/dev product), and is expected hygiene for developer SaaS. **But it is not a lever for AI search visibility.** Budget accordingly; never let it displace prerendering or content quality. Same for `ai.txt` variants: skip.

---

## 8. Recommended technical configuration for Seobot

### 8.1 robots.txt (maximum-visibility profile)

```txt
# --- AI search / answer crawlers: REQUIRED for citation visibility ---
User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Googlebot
Allow: /

# --- Training crawlers: policy choice. We allow (public marketing content,
#     and inclusion aids LLM familiarity with the Seobot entity). ---
User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: Amazonbot
Allow: /

User-agent: Meta-ExternalAgent
Allow: /

# --- Aggressive, low-value ---
User-agent: Bytespider
Disallow: /

# --- Private surface exists: it is served from the app domain, not here.
#     Keep staging and /api/* out below. ---
User-agent: *
Allow: /
Disallow: /api/
Disallow: /*.json$

Sitemap: https://seobot.example/sitemap.xml
```

Notes:
- Do not rely on `User-agent: *` alone for the AI tier — be explicit so the intent survives template edits and reviews.
- `Crawl-delay` is not part of the robots.txt standard; use CDN rate limits if needed.
- Re-check monthly: vendors add crawlers (e.g., OpenAI's `OAI-AdsBot`), and new user agents appear.

### 8.2 Index pipeline (Bing-first for AI)

1. **Bing Webmaster Tools**: verify, import from GSC, submit sitemap, enable **IndexNow** (ping on every publish/update). This feeds Copilot *and* a large share of ChatGPT's candidate pool.
2. **Google Search Console**: verify, submit sitemap, **opt into generative AI features** (required for the Generative AI performance report).
3. Sitemap with accurate `lastmod`; regenerated at build; only canonical 200-status URLs.
4. `dateModified` in Article JSON-LD + visible "Last updated" line on content pages.
5. Per-URL canary tests with `curl -A` for the four non-Google crawlers (§3), plus log checks for 403/429s.

### 8.3 Do NOT do (myth busting, with sources)

| Myth | Reality |
|---|---|
| "Block Google-Extended to opt out of AI Overviews" | Wrong lever — that's Gemini training/grounding. AI Overviews run on Googlebot. (Google docs; BuzzStream: 92.3% of blockers still cited) |
| "Add llms.txt to improve AI rankings" | Google ignores it; 97% of files get zero crawler requests. Keep for agents/docs hygiene only |
| "Chunk content into tiny sections for AI" | Google explicitly debunks; passage retrieval works fine with normal heading structure |
| "AI crawlers will render our React app" | They do not execute JS — raw HTML or nothing |
| "Keyword-jammed copy wins citations" | Princeton study: keyword stuffing was the only method that *reduced* visibility |
| "Rewrite everything in 'AI-friendly' style" | Fluency matters; anti-human keyword-speak hurts. Write clearly for humans, add stats/quotes/citations |
| "Chase every fan-out query with a page" | Google names this scaled content abuse |

---

## 9. Measurement

| Source | What it gives us | Cadence |
|---|---|---|
| GSC → **Generative AI performance report** | Impressions/visibility in AI Overviews & AI Mode | Weekly (needs opt-in) |
| Bing Webmaster Tools → **AI Performance** | Citations across Copilot + Bing AI summaries; Intents, Topics, **Citation Share** | Monthly |
| Prompt-set tracking | 30–50 real buyer prompts run across ChatGPT (Search), Perplexity, Gemini/AI Mode, Copilot; log who's cited (us vs competitors vs Reddit/listicles) | Monthly |
| GA4 | AI referrers (`chatgpt.com`, `perplexity.ai`, `copilot.microsoft.com`, `gemini.google.com`, etc.) as a channel group; landing pages; conversion rate vs organic baseline | Weekly |
| Server logs | Tier-1 crawler hits per URL, status codes, coverage %, first-visit latency after publish | Monthly |
| Bing/GSC index checks | `site:` checks; URL Inspection for key pages; IndexNow coverage | On publish |

Industry reference points for interpreting it: AI-referred visitors convert at multiples of organic search (Seer: Perplexity 10.5% vs Google organic 1.76%; ChatGPT 15.9% on the same client); AI citations in AI Overviews correlate with +120% clicks-per-impression vs uncited pages. Meanwhile ~65% of cited sources churn day-to-day and only ~14% of top sources are shared across engines — so trendlines beat snapshots, and each engine needs its own tracking.

---

## 10. Content playbook — what this means for Seobot's pages

### 10.1 The per-page GEO contract (add to `seo-research.md` §3.3's on-page contract)

Every money page and article should contain, in server-rendered HTML:

1. **Definition block** — 2–3 sentences answering "What is X?" with the entity named; this is what engines quote. Placed at the very top, no windup.
2. **Extraction-first sections** — each H2 opens with a complete, standalone answer sentence; details follow. Question-shaped H2s where natural ("How much does Seobot cost?").
3. **Evidence layer** — at least one: original statistic, external statistic with source link, or attributed quote (the Princeton top-3 levers). Numbers > adjectives everywhere.
4. **One structured artifact** — comparison table, numbered workflow, or checklist (format matches intent).
5. **FAQ block** — 3–6 real questions with concise answers; FAQPage JSON-LD matching the visible text byte-for-byte.
6. **Freshness markers** — visible "Last updated" date, `dateModified` in JSON-LD, and real refreshes at least quarterly (citation half-life is ~39–68 days for timely queries).
7. **Entity furniture** — internal links with descriptive anchors; `sameAs` in sitewide Organization schema; author bylines with credentials on editorial content.
8. **A CTA matched to funnel stage** (`seo-research.md` §3.3).

### 10.2 First content pieces with highest GEO leverage

Beyond the money pages already prioritized in `seo-research.md` §3.1, these are the GEO-native additions:

1. **"AI Crawlers & Robots.txt Reference" page** (`/ai-crawlers` or `/resources/ai-crawlers`): the canonical, constantly-updated table of every AI crawler, user agent, purpose, and recommended robots.txt config. This is exactly the content AI engines, dev-tool agents, and bloggers retrieve and cite — on-brand for an SEO bot product. (Every competitor guide cites the same third-party GitHub gists; we can own the canonical version, with crawl-rate data we collect ourselves.)
2. **Original data study at launch**: e.g., "We launched 300 pages and measured AI crawler coverage" (reproduce the Presenc-style study on our own site) or an annual "State of AI Indexation" report. Original stats are the #1 citation magnet (statistics addition +31%) and earned-mention driver.
3. **Glossary / "what is" pages** (`/glossary/[term]`): definition-first format is the cheapest printable citation unit ("What is GEO?", "What is IndexNow?", "What is query fan-out?"). Each 300–600 words, entity-rich, `DefinedTerm` or FAQ schema.
4. **Pricing page as an extraction target**: OpenAI/Bing/Perplexity all get asked "how much does [product] cost." Structure: answer sentence with real numbers up top ("Seobot costs $X/month..."), then a comparison table of tiers, then the pricing FAQ. Most SaaS pricing pages bury the number in screenshots — screenshots are invisible to AI crawlers.
5. **Comparison pages** (`/vs/[competitor]`): tables + "Who should pick X" summary sections; each is a passage-level answer for "X vs Y" fan-out queries. Keep genuinely fair — AI Overviews surface what third parties say about products, and fairness is what gets quoted.

### 10.3 Per-engine cheat sheet (condensed)

| Engine | Candidate pool | Must-allow crawler | Freshness weight | Biggest lever |
|---|---|---|---|---|
| ChatGPT Search | Bing index + OAI-SearchBot index | `OAI-SearchBot`, `Bingbot` | Medium | Bing presence + direct answers |
| Perplexity | Own index + Bing | `PerplexityBot` | **Very high** | Recency, single-purpose pages, first-100-word answers |
| Google AIO / AI Mode | Google Search index | `Googlebot` (+GSC opt-in) | Medium | Core SEO + fan-out coverage of related intents |
| Copilot | Bing index | `Bingbot` (+IndexNow) | Medium | BWT hygiene + structure |
| Claude | Claude retrieval | `ClaudeBot`/`Claude-SearchBot` | Medium | Docs-grade clarity, grounded claims |
| Grok | X/Bing + own | — | High | Community/entity presence |

---

## 11. What we still can't verify (open questions)

- **Stealth crawling**: Cloudflare documented some vendors fetching with rotated/spoofed UAs when blocked. Assume "deny and rely on robots.txt" is not airtight; blocking only matters if you actually want opt-out.
- **Actual weighting of llms.txt** in agent flows is anecdotal (vendor reports only); treat as hygiene, not a rank factor.
- **Personalization effects**: AI answers vary by user, region, and session state; our prompt tests are samples, not ground truth.
- **Wikimedia/Knowledge-Graph causality**: entity work is strongly supported by mechanism and practitioner reports, but rigorous public causal studies are thin.

---

## Sources

**Official documentation**
- Google Search Central — Optimizing your website for generative AI features on Google Search (updated 2026-07-10)
- Google — AI features and your website; Google-Extended documentation (Search Console/crawler docs)
- Google — Generative AI performance report, Search Console help; opt-in requirements
- OpenAI — Overview of OpenAI crawlers (GPTBot, OAI-SearchBot, ChatGPT-User, IP ranges); ChatGPT Search help center
- Anthropic — ClaudeBot / Claude-SearchBot / Claude-User documentation (anthropic.com/claude-bot)
- Perplexity — Perplexity Crawlers documentation (docs.perplexity.ai); published bot IP ranges
- Microsoft — Copilot transparency note; Bing Webmaster guidelines; Bing Webmaster Tools AI Performance report announcements (Feb & June 2026); IndexNow FAQ
- llmstxt.org — The /llms.txt file, v2 (Jeremy Howard; original proposal Sept 2024, v2 Aug 2026)

**Research papers**
- Aggarwal et al. — GEO: Generative Engine Optimization, KDD 2024 (arXiv:2311.09735) — method table, in-the-wild Perplexity results
- Gutierrez — AI Crawler Visibility and JavaScript Rendering Gaps in Small Business Websites, SSRN 6915818 (June 2026)
- Zhang, He, Yao — selection vs absorption metrics (April 2026), as summarized in Metavert State of AI Search Citations Q4 2026
- RAG structure/chunking literature: EMNLP 2025 Findings (RDR²), TREC 2025 RAG track, chunking strategy studies (context for passage-level retrieval)

**Crawl & rendering studies**
- Vercel — How AI is changing SEO: lessons from a billion crawler requests (500M+ fetches; no JS execution by major AI crawlers)
- Presenc AI — How Fast AI Crawlers Index New Pages (300-page first-party study, March 2026)
- Cloudflare Radar — AI crawler traffic data; stealth crawling findings

**Citation, traffic & behavior data**
- Ahrefs — Top mentioned sources not shared across AI assistants (June 2025); AI Overview citations from top 10 (March 2026); AI Overviews on branded searches (October 2026); schema markup controlled study (May 2026); llms.txt request logs study (June 2026); CTR impact studies (April 2025 → December 2025 → France September 2026)
- Seer Interactive — AI search citation/CTR studies; Perplexity conversion case study (Oct 2024–Apr 2025): 10.5% vs 1.76% Google organic
- Metavert — State of AI Search Citations, Q4 2026 (roundup: engine divergence, citation churn, freshness half-lives, schema non-effect)
- Pew Research (July 2025) — AI Overview click behavior (8% vs 15% click-through; 1% click citations)
- Adobe Analytics (2025 holiday) — AI referral conversion +31%, revenue per visit +254% YoY
- BuzzStream (via ppc.land) — 92.3% of top news sites blocking Google-Extended still cited in AI answers

**Entity / Wikidata**
- Search Engine Land, WordLift/MLforSEO, and entity-SEO practitioner guides (2026) on Wikidata notability criteria, sameAs chains, and Knowledge Graph mechanics
