# Research — the SEO/GEO Excellence Atlas

A growing, structured knowledge base of **what makes an excellent SEO and GEO site**, plus the first-party evidence we've measured ourselves. It answers three questions the product roadmap needs:

1. **What are the levers?** — a factor database organized by the citation pipeline (discover → index → relevance → authority → experience → citation), each factor carrying its evidence, confidence, and effort.
2. **Does it depend on industry, question, or taxonomy?** — industry profiles, a question-type taxonomy, and a content-format taxonomy that modulate which factors matter and how.
3. **What surprises us?** — outliers and contradictions where the data disagrees with common wisdom.

## Layout

```
research/
  README.md            this file — schema + growth protocol
  data/                the machine-readable knowledge base (JSON, hand-curated)
    sources.json       every study, paper, dataset, and first-party crawl we cite
    factors.json       the factor database — levers, gates, evidence
    industries.json    industry profiles — what changes by vertical
    questions.json     question/query-type taxonomy — what gets answered and cited
    formats.json       content-format taxonomy — what gets extracted
    outliers.json      contradictions, counterexamples, surprising data
    first-party-study.json  derived slice of the Tranco top-500 crawl (our own data)
    semantics-study.json    first-party semantic-HTML / page-structure / IA audit of 59 top sites (raw vs. rendered)
  build-atlas.mjs      generates atlas.html from data/ (and validates references)
  atlas.html           the generated interactive explorer — open it in a browser
  findings.md          the narrative synthesis: patterns, commonalities, distinctions, outliers
```

## Schema

Ids are kebab-case and stable; **never reuse or renumber an id** — append new items and mark superseded ones in `notes`. Every claim in a factor must cite at least one `sourceId` from `sources.json`; the build script fails on unknown references.

### `sources.json`

```jsonc
{
  "id": "princeton-geo-2024",       // stable citation key
  "org": "Princeton et al.",
  "title": "GEO: Generative Engine Optimization",
  "url": "https://arxiv.org/abs/2311.09735",
  "date": "2024-06",                // publication or study date (YYYY-MM)
  "type": "paper",                  // paper | vendor-study | first-party | official | dataset | industry | book
  "sampleSize": "10,000 queries; 9 methods",
  "license": null,                  // for datasets
  "notes": "KDD 2024 — the field's foundational study.",
  "added": "2026-10-17"
}
```

### `factors.json`

```jsonc
{
  "id": "geo.render.server-html",
  "label": "Server-rendered main content",
  "layer": "citation",              // discover | index | relevance | authority | experience | citation
  "stage": "render",                // citation layer only: access | render | extract | evidence | entity | freshness | offsite | measure
  "surface": ["geo"],               // which surface it moves: "seo", "geo", or both
  "gate": true,                     // true = later layers are worth ~0 until this passes
  "claim": "One-sentence assertion an audit can check against a page.",
  "evidence": [
    {
      "sourceId": "vercel-merj-2025",
      "finding": "What the source actually measured.",
      "effect": "quantified effect, if any",
      "strength": "strong"          // strong | moderate | weak | contested
    }
  ],
  "confidence": "high",             // high | medium | low — our overall read
  "effort": "L",                    // S | M | L (fix effort)
  "tags": ["javascript", "crawlability"],
  "seobotRuleIds": ["idx.js-gated-content"],
  "appliesTo": { "industries": "all", "questions": "all" },
  "added": "2026-10-17",
  "notes": "Caveats, boundary conditions, open questions."
}
```

### `industries.json`

```jsonc
{
  "id": "ecommerce",
  "name": "E-commerce",
  "blurb": "One-line characterization.",
  "priorityFactors": ["factor-id", "..."],   // must exist in factors.json
  "deprioritized": ["factor-id"],            // factors that matter *less* here than average
  "questionMix": ["comparison", "transactional"],  // question ids, most → least common
  "engineMix": { "google": 0.6, "chatgpt": 0.15, "perplexity": 0.1, "copilot": 0.1, "claude": 0.05 },  // model preset — mark it as such
  "data": [
    { "stat": "Measured statement with numbers", "sourceId": "seobot-top500-2026", "strength": "strong" }
  ],
  "added": "2026-10-17"
}
```

### `questions.json`

```jsonc
{
  "id": "comparison",
  "name": "Comparison & alternatives",
  "examples": ["X vs Y", "best X", "alternatives to X"],
  "intent": "commercial",           // informational | commercial | transactional | navigational | local
  "aiExposure": { "value": 95, "unit": "% of queries with an AI Overview", "sourceId": "seer-aio-intent-2026" },
  "winningFormats": ["comparison-table", "listicle"],
  "evidence": [{ "sourceId": "...", "finding": "...", "strength": "moderate" }],
  "added": "2026-10-17"
}
```

### `formats.json`

```jsonc
{
  "id": "comparison-table",
  "name": "Comparison table",
  "what": "A real HTML table comparing options on stated criteria.",
  "extractionNotes": "Why AI engines lift it — passage-level, entity-rich, decision-ready.",
  "evidence": [{ "sourceId": "...", "finding": "...", "strength": "moderate" }],
  "added": "2026-10-17"
}
```

### `outliers.json`

```jsonc
{
  "id": "reddit-dominates-citations",
  "title": "Reddit dominates AI citations while blocking everyone",
  "claim": "The most-cited community source is robots.txt-closed to the crawlers citing it.",
  "why": "What we think it means / what to do about it.",
  "sourceIds": ["seobot-top500-2026", "metavert-q4-2026"],
  "kind": "counterexample",          // contradiction | counterexample | extreme | myth | open-question
  "added": "2026-10-17"
}
```

## Growth protocol

1. **New source** → append to `sources.json` with a real URL, date, and sample size. Vendor studies stay labeled `vendor-study`; independent/academic `paper`; our own crawls `first-party`.
2. **New fact** → attach it to the smallest fitting item (a factor, an industry, a question, a format) as an `evidence` entry. Never write an uncited claim.
3. **New factor** → only when an audit could check it and it isn't a duplicate; link `seobotRuleIds` when the product catalog has a matching rule.
4. **Conflicts** → encode both sides in `evidence` with `strength: "contested"`, and add an `outliers.json` entry explaining the disagreement.
5. **Run** `node research/build-atlas.mjs` — it validates ids/references and regenerates `atlas.html`.
6. **Quarterly** — refresh the first-party study, re-run the build, and date-stamp the refresh in `findings.md`.

## Provenance & method

- This atlas is **documentation, not frontmatter of the product**. It exists to keep audit rules, content priorities, and research docs from drifting apart.
- The `docs/` research set (`seo-research.md`, `geo-research.md`, `geo-recommendation-engine.md`, `audit-engine.md`, `data-assets-and-interactives.md`) is the narrative companion; this folder is the structured layer that can be queried, charted, and diffed.
- First-party data is CC BY 4.0 (see `data/first-party-study.json`); third-party data keeps its own license and is cited, never republished wholesale.
