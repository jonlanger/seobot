# Data sources feasibility — pulling external data into Seobot

Companion to `docs/data-assets-and-interactives.md`. Answers: which of the
proposed third-party sources can actually be pulled into the app (build-time,
static JSON under `src/content/data/`), and on what terms.

## Summary

| Source | Pullable? | Auth | Bulk? | License / terms | Verdict |
|---|---|---|---|---|---|
| Tranco (already used) | Yes | None (list API) | Yes | Free, cite paper | Backbone list — keep |
| Cloudflare Radar Top Domains | Yes | Free API token | Yes (top 100 ordered; buckets to 1M) | ⚠ CC BY-NC 4.0 | Internal/benchmark only — do not republish in commercial pages |
| Cisco Umbrella Popularity List | Yes | None | Yes (top 1M CSV) | Public download | **Implemented** — `scripts/pull-umbrella.mjs` |
| CrUX (Chrome UX Report) | Yes | Free Google Cloud API key | Yes (per-origin POST) | Google API terms | **Script ready** — `scripts/pull-crux.mjs` (needs `CRUX_API_KEY`) |
| DomCop Open PageRank | Yes | Free API key (30k domains/mo) | Yes (100/request) | Free tier | **Script ready** — `scripts/pull-openpagerank.mjs` (needs `OPENPAGERANK_API_KEY`) |
| SEO Score API | Partially | Free API key (2 audits/day) | No (rate-limited) | Free tier, commercial OK | Use for our own site / CI gates, not for 500-site bulk |
| Geoptie | No (as a dataset) | Paid ($99/mo) API | Brand/prompt tracking only | Paid | GEO monitoring service for *our* brand, not an ingestible dataset |
| HubSpot AEO/GEO Grader | No (as a dataset) | One-time free scan, no API | Single brand scan | Free, no account | Manual benchmarking only |
| Mangools AI Search Grader / Watcher | Partially | Free account + API token | Monitor-based, requires setup | Paid tiers for volume | Could track our brand; not a bulk domain dataset |
| Botric (free tier) | No (as a dataset) | Free tier (5 prompts) | Brand tracking only | Free tier | Manual benchmarking only |
| Google Search Console / Bing Webmaster | Yes (our own site only) | OAuth, site ownership verification | N/A (only verified properties) | Platform terms | Integrate for *our own* site performance dashboard only |
| Ahrefs Webmaster Tools | Partially | Verified sites; API mostly paid | Public endpoints: crawler IPs, DR top domains | Free for verified sites | Use public DR top-domains endpoint for a popularity cross-check; bulk needs paid plan |
| Semrush (free tier) | No (programmatically) | Business subscription for API | UI only on free tier | Paid | Not feasible for ingestion |
| Moz free tools | Partially | Free API access (limited V1 metrics) | Rate-limited | Free tier limited | Could pull DA/PA for top-500 with free keys; V2 requires paid. Not implemented (complex auth) |

## Recommended approach

1. **Previously shipped (now removed):** Cisco Umbrella ranks (no key) were merged into a
   dashboard "Cross-source popularity" section via `src/content/enrichment.ts`; that
   section has been removed from the dashboard pages. The enrichment data is still
   available per-domain on company pages.
2. **Run when keys are available:** `npm run data:crux` and `npm run data:openpagerank`
   populate `src/content/data/crux-cwv.json` and `openpagerank.json`; the enrichment
   module and dashboard pick them up automatically.
3. **Do not ingest:** the GEO grader tools (Geoptie, HubSpot, Mangools, Botric) and SERP
   rank checkers (Semrush, GSC/Bing for third parties) are either brand-scoped, paid, or
   require site ownership — they are *tools we use*, not datasets we redistribute. Link to
   them from docs/content instead.
4. **License guardrails:** Cloudflare Radar data is CC BY-NC 4.0 — never republish inside
   commercial pages; keep it to internal benchmarks. CrUX and Open PageRank are fine to
   publish with attribution.

## Scripts

| Script | Env var | Output |
|---|---|---|
| `npm run data:umbrella` | none | `src/content/data/umbrella-ranks.json` |
| `npm run data:crux` | `CRUX_API_KEY` | `src/content/data/crux-cwv.json` |
| `npm run data:openpagerank` | `OPENPAGERANK_API_KEY` | `src/content/data/openpagerank.json` |

## Not implemented (and why)

- **Moz free API**: V1 requires HMAC-signed requests with access id/secret; doable but
  adds a crypto dependency. Revisit if DA/PA becomes a priority.
- **Ahrefs public endpoints**: only crawler-IP and DR top-domains lists; low value for
  our enrichment. Revisit if we want a DR cross-check.
- **Cloudflare Radar**: NC license means we cannot ship it; kept as an internal option.
EOF
echo done