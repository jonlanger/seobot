# Docs Index

Research notes, specs, and contracts behind the Seobot site + app. Each file is **self-contained and owned by the session that maintains it** — prefer appending a dated section over rewriting someone else's doc; cross-link instead of duplicating.

## The map

| Doc | Covers | Read it when |
|---|---|---|
| `seo-research.md` | Classic SEO fundamentals: prerender decision (§2.1), money-page inventory, on-page contracts, structured data | building pages/templates, making SEO decisions |
| `geo-research.md` | The AI-search layer: crawler taxonomy, engine-by-engine mechanics, Princeton levers, llms.txt verdict, robots profile | anything AI-visibility related |
| `geo-recommendation-engine.md` | **GEO scoring model** (per-engine readiness, weights, gates), ~40-check catalog, 8-question form, report UX, Vercel render tiers, calibration loop | building the GEO auditor / grader / scoring |
| `audit-engine.md` | **Whole-product audit engine**: health score, opportunity model, priority formula, rule catalog (~48 rules), input tiers T0–T5, crawl architecture on Vercel | building the main product audit pipeline |
| `data-assets-and-interactives.md` | Dataset inventory (Tranco, AI Crawler Census, CrUX…), Playwright study plan, interactive/viz catalog, prerender guardrails | planning research studies or interactives |
| `content-models.md` | Page-template content contracts: fields, SEO rules, schema per template, component handoff | writing content modules or template components |
| `design-system.md` | System structure (layer model, placement rules), atomic-design decisions, data direction | adding or changing components |
| `brand-research.md` | Brand strategy research behind the identity | brand/voice questions |
| `copy-style.md` | Prose style guide | writing any copy |

## The two audit docs — how they relate

`audit-engine.md` is the **whole-product engine contract**: scoring formulas (health / opportunity / priority), the rule engine architecture, input tiers, crawl/job architecture, and product phasing P0–P4.

`geo-recommendation-engine.md` is its **GEO-layer deep-dive**: the 5 `geo.*` rules in audit-engine §6 (5–10% category weight there) expanded into a standalone per-engine readiness model, a ~40-check GEO catalog (Access → Render → Extract → Evidence → Entity → Freshness + off-site checklist), the GEO questionnaire, reporting UX, and the weight-calibration loop.

Rules of reconciliation:

- **Infrastructure overlaps** (serverless job pattern, SSRF hardening, storage, phasing): `audit-engine.md` §8–9 is the contract; the GEO doc only specifies what's GEO-specific (per-engine gates, render tiers, shareability).
- **Phase mapping**: audit-engine P0 ≈ GEO doc v0–v1 (instant URL scan); audit-engine P4 "AI visibility" ≈ GEO doc v2–v3 (prompt runs, calibration).
- **Rule IDs**: GEO doc uses `A#/R#/X#/Q#/E#/F#` working ids for its check catalog; treat them as the expansion of the `geo.*` namespace in audit-engine §6, not a separate system.

## Conventions

- Companions are declared in each doc's header blockquote — keep those links truthful when renaming files.
- The root `README.md` teaches the repo; these docs teach the decisions. If you change a decision, update the doc that owns it and leave a cross-link in any doc that assumed the old one.
