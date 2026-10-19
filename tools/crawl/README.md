# @seobot/crawl-tools

Research crawlers for Seobot data studies. Deliberately isolated from the site build: nothing here runs during `npm run build`, and it has its own dependencies — safe to iterate on while the site sessions work.

Background and the full study plan: `docs/data-assets-and-interactives.md` (§3 pipeline, §6 PoCs).

## Scripts

### `top-sites.mjs` — build the pinned site list

Takes a Tranco CSV export and produces a filtered, rank-annotated site list. The exact Tranco list version is pinned by list ID for reproducibility.

```sh
# Get the latest Tranco list metadata, then download the CSV it points to:
curl -s https://tranco-list.eu/api/lists/date/latest
# → {"list_id":"64VVX","download":"https://tranco-list.eu/download/64VVX/1000000", ...}

node top-sites.mjs --csv /path/to/tranco-64VVX.csv --list-id 64VVX --n 500
```

Infrastructure domains (CDNs, DNS/hosting backends, telemetry/ad networks, auth portals, shorteners) are filtered via an exact list + risky-substring patterns + allowlist — all recorded in `data/top-500.json` under `filters`. Residual non-content domains are curated post-crawl (with reasons) at analysis time.

### `analyze.mjs` — deep cuts

Reproducible companion to `summary.md`: thematic group stats (search, AI products, social, news, e-commerce…), robots-policy vs. JS-wall correlation, blocked-site lists, caveat lists, and `analysis.json` for downstream use.

```sh
npm run analyze
```

### `compare-runs.mjs` — median-of-N stability

Compares the two most recent runs per site from the append-only histories: classification changes, coverage deltas, retry fixes, and sites that broke. Feeds the "median-of-N" methodology claim.

```sh
npm run compare
```

### `js-wall.mjs` — rendered-vs-raw content coverage

**Production runs complete (2026-10-16, list `64VVX`, n=500, two passes): 324 measured · median coverage 71.4% (run 1: 326 / 70.2%) · 112 raw_blocked · 18 both_blocked · 23 robots_excluded · GPTBot hard-blocked by 81/500 · two-run classification flips 15/500, median |Δcoverage| 0pp. Full results: `out/summary.md` + `docs/data-assets-and-interactives.md` §6.3.**

How much of a page's visible content would a non-JS AI crawler receive? Two passes with the same user agent — plain HTTP vs headless Chromium — so JavaScript execution is the only variable. Also scores robots.txt policy per crawler token (RFC 9309 group semantics, specific group over AI wildcard).

```sh
npm install && npx playwright install chromium   # once

npm run js-wall -- --list data/top-500.json --concurrency 4   # production run
npm run js-wall -- --limit 10                                  # quick sanity (built-in 20-site list)
npm run js-wall -- --list data/top-500.json --force            # re-crawl (appends a new run per site)
```

Flags: `--list <file>` · `--out <dir>` · `--concurrency <n>` (default 3) · `--limit <n>` · `--force` (ignore cached results; appends a new run) · `--save-raw` (store raw HTML snapshots) · `--settle <ms>` (render settle time, default 2500).

Resume-safe: per-site records are written to `out/sites/{domain}.json` immediately and appended per run, so a crash or Ctrl-C loses at most one site in flight, and repeated runs build the median-of-N history.

## Outputs

| Path | Content |
|---|---|
| `out/sites/{domain}.json` | Append-only array of run records (raw status/tokens, rendered tokens, coverage %, JSON-LD diff, heading coverage, classification) |
| `out/robots/{domain}.txt` | Raw robots.txt when fetchable |
| `out/raw/{domain}.html` | Raw HTML snapshot (only with `--save-raw`) |
| `out/results.json` | Aggregated latest-run records + summary stats (written at end of run) |
| `out/summary.md` | Study summary tables: headline numbers, lowest-coverage sites, robots policy by token |

## Downstream — the dashboard dataset

The app never reads `out/` directly (it is gitignored). From the repo root, `npm run data:top-sites`
(`scripts/build-top-sites-data.mjs`) distills `data/top-500.json` + `out/results.json` +
`out/analysis.json` + `out/run-comparison.json` into the committed
`src/content/data/top-sites-study.json`, which the dashboard renders via `src/content/top-sites.ts`.
Re-run it after every new crawl.

## Classification values

| Class | Meaning |
|---|---|
| `measured` | Raw HTML readable; coverage % is meaningful |
| `raw_blocked` | Non-browser clients get a wall (403/202/empty shell) — browser-only access |
| `both_blocked` | Neither pass yielded usable content (hard bot wall) |
| `render_incomplete` | Browser pass got a shell/interstitial |
| `robots_excluded` | robots.txt wildcard disallows — skipped by policy |
| `crawl_error` | Network/timeout failure |

## Publishing (per decisions in the doc)

- Dataset: **CC BY 4.0** + methodology page. Publish derived metrics (coverage %, classifications, robots policies) — not raw third-party HTML.
- Pin the Tranco `listId`; publish the exclusion list; state run dates and caveats (single pass, homepage only, token-set overlap is an upper bound).
- Politeness: identifying UA, ≤ concurrency sites in flight, sequential per domain, wildcard robots rules honoured.
