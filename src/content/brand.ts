/**
 * Brand content — voice, tone, taglines, copy patterns, and asset specs.
 *
 * This is the machine-readable half of the brand guidelines (the prose half is
 * `docs/copy-style.md`; the research behind both is `docs/brand-research.md`).
 * The Brand view in the demo renders these objects directly, so voice rules
 * and logo usage are versioned with the code that ships them.
 *
 * Conventions:
 * - Voice is constant; tone flexes by surface (see `toneMatrix`).
 * - Examples are illustrative sample copy, not published claims.
 * - Brand-copy strings are deliberately NOT shaped like `PageSeo` — the SEO
 *   audit (`scripts/check-seo.mjs`) treats any export with title+description+path
 *   as a page and would try to validate it.
 */

/* ---------------------------------- Types --------------------------------- */

export interface VoicePrinciple {
  title: string;
  description: string;
  /** One line of copy that follows the principle. */
  does: string;
  /** One line that violates it. */
  doesnt: string;
  /** Rewrite example — the "before". */
  before: string;
  /** Rewrite example — the "after". */
  after: string;
}

export interface ToneRow {
  /** Where the copy appears. */
  surface: string;
  /** Who is reading, and in what state of mind. */
  reader: string;
  /** The tonal dial for that moment. */
  tone: string;
  /** A line written at exactly that tone. */
  sample: string;
}

export interface TaglineOption {
  text: string;
  /** When to reach for this line. */
  note: string;
}

export interface CopyPattern {
  /** The moment: button, error, empty state, … */
  moment: string;
  /** The formula, in bracket notation. */
  formula: string;
  /** A filled-in example. */
  example: string;
}

export interface BrandAssetSpec {
  name: string;
  description: string;
  /** Minimum rendered size before legibility breaks. */
  minSize: string;
  /** Where it is the right choice. */
  usage: string;
}

/* --------------------------------- Content -------------------------------- */

/** The one-liner the team repeats back when copy feels off. */
export const voiceOneLiner =
  "Precise about the data, direct about the next step, allergic to hype.";

export const voicePrinciples: VoicePrinciple[] = [
  {
    title: "Answer first.",
    description:
      "Open every block with the conclusion — pages, emails, errors, tooltips. The first sentence must survive alone in an AI answer, a Slack unfurl, or a support search.",
    does: "Seobot audits your site daily and ranks every issue by traffic impact.",
    doesnt: "In today's fast-paced digital landscape, SEO matters more than ever.",
    before:
      "Looking to take your organic growth to the next level? You've come to the right place.",
    after:
      "Seobot finds the SEO fixes that move traffic, in priority order. Here's this week's list.",
  },
  {
    title: "Show the number.",
    description:
      "Specifics build trust; superlatives burn it. Every stat carries a value, a source, and a year — if we can't source it, we don't say it.",
    does: "47% of sites fail Core Web Vitals (Chrome UX Report, 2026).",
    doesnt: "The world's most powerful SEO platform, trusted by everyone.",
    before: "Dramatically improve your rankings with cutting-edge AI.",
    after: "Ranking wins within ~2 weeks for the median customer (2026 onboarding cohort).",
  },
  {
    title: "Talk like an operator.",
    description:
      "Write the way a good SEO lead talks in standup: verbs, tools, tasks, deadlines. If a word only exists in marketing decks, it doesn't ship.",
    does: "Send this week's briefs to your writers, then watch rankings on the dashboard.",
    doesnt: "Leverage synergistic AI solutions to unlock holistic growth.",
    before: "Utilize our seamless platform to seamlessly optimize your workflow.",
    after: "Connect your site. Fix the top issue. Publish one brief. Repeat.",
  },
  {
    title: "Keep the promise small and true.",
    description:
      "No fake countdowns, no fake freshness, no guaranteed #1 rankings. State exactly what happens, when it happens, and what's included — and honor it in the product.",
    does: "Free 14-day trial. No credit card. Cancel in two clicks.",
    doesnt: "Get guaranteed page-one rankings in 24 hours!",
    before: "Instantly dominate Google with zero effort!",
    after: "Your first audit lands in ~10 minutes. First ranking wins usually arrive within two weeks.",
  },
];

export const toneMatrix: ToneRow[] = [
  {
    surface: "Landing hero",
    reader: "A skeptical buyer comparing three tabs.",
    tone: "Confident, concrete, zero hype.",
    sample: "SEO that ranks on Google and gets cited in AI answers.",
  },
  {
    surface: "Product UI",
    reader: "An SEO manager mid-task, 40 other things queued.",
    tone: "Quiet, precise, second person.",
    sample: "3 issues need review. Start with the broken canonical on /pricing.",
  },
  {
    surface: "Empty states",
    reader: "A new user one step away from first value.",
    tone: "Warm, directional, exactly one action.",
    sample: "No audits yet. Connect your site and we'll crawl it in about 3 minutes.",
  },
  {
    surface: "Errors",
    reader: "A blocked user deciding whether to trust us.",
    tone: "Calm, factual, recovery-first.",
    sample:
      "We couldn't reach your site — the server timed out. We'll retry in 15 minutes, or you can run a manual crawl now.",
  },
  {
    surface: "Billing",
    reader: "A nervous buyer reading the small print.",
    tone: "Plain, unambiguous, no dark patterns.",
    sample:
      "Your plan renews March 14 at $79. Cancel anytime — you keep access until then.",
  },
  {
    surface: "Docs & API",
    reader: "An implementer who wants to be finished.",
    tone: "Dry, complete, example-led.",
    sample: "POST /v1/audits returns 202 with a job ID. Poll GET /v1/audits/{id} for status.",
  },
];

export const taglines: TaglineOption[] = [
  {
    text: "Grow organic traffic on autopilot.",
    note: "Flagship line. Final CTA band, OG cards, paid search. Pair with the wordmark only when a sentence is needed.",
  },
  {
    text: "The SEO platform for modern teams.",
    note: "Positioning line for listings, directories, and boilerplate — says the category out loud.",
  },
  {
    text: "Audit. Fix. Rank. Repeat.",
    note: "Campaign and deck line. Four verb beats, one loop — good for slides and conference walls.",
  },
  {
    text: "Make the number go up.",
    note: "The internal rallying cry. Fine on swag and splash screens; too casual for pricing pages.",
  },
];

/** Definition-first boilerplate — the paragraph every page, deck, and directory can quote verbatim. */
export const boilerplate =
  "Seobot is the SEO platform for modern teams. It audits your site daily, tracks keyword rankings, and drafts AI-grounded content briefs — surfacing the highest-impact work so organic growth keeps moving without a tool pile.";

export const copyPatterns: CopyPattern[] = [
  {
    moment: "Button",
    formula: "[Verb] + [object]",
    example: '"Run site audit" — not "Submit", never "Click here".',
  },
  {
    moment: "Error",
    formula: "[What happened] → [what to do]",
    example:
      '"We couldn\'t reach your site — the server timed out. We\'ll retry in 15 minutes."',
  },
  {
    moment: "Empty state",
    formula: "No [thing] yet → [action] to [outcome]",
    example: '"No reports yet. Schedule one to get your first digest on Monday."',
  },
  {
    moment: "Toast (success)",
    formula: "[Object] + [past-tense verb], under 5 words",
    example: '"Report scheduled." "Brief sent to Slack."',
  },
  {
    moment: "Upgrade nudge",
    formula: "[Value received] → [the limit] → [one action]",
    example:
      '"You\'ve tracked 2,500 of 2,500 keywords. Upgrade to keep tracking — your history stays put."',
  },
  {
    moment: "Confirming a destructive action",
    formula: "Say exactly what gets deleted, and what doesn't.",
    example:
      '"Delete the Northwind project? Audits and reports are removed for everyone. Exports stay."',
  },
];

export const wordsUse = [
  "audit",
  "fix",
  "brief",
  "crawl",
  "rank",
  "ship",
  "monitor",
  "prioritized",
  "sourced",
  "verified",
  "weekly",
  "impact",
];

export const wordsAvoid = [
  "leverage",
  "utilize",
  "seamless",
  "supercharge",
  "unlock",
  "revolutionary",
  "game-changing",
  "best-in-class",
  "cutting-edge",
  "synergy",
  "guaranteed rankings",
  "Oops!",
];

export const brandAssets: BrandAssetSpec[] = [
  {
    name: "Mark",
    description: "The climb — folded ribbon mark alone.",
    minSize: "16px tall / favicon scale",
    usage: "App icons, favicons, avatars, watermark on dark product screens.",
  },
  {
    name: "Horizontal lockup",
    description: "Mark + wordmark, the default identity.",
    minSize: "96px wide (height ≥ 24px)",
    usage: "Nav, footer, app chrome, docs header, email signatures.",
  },
  {
    name: "Stacked lockup",
    description: "Mark above an oversized wordmark; optional tagline.",
    minSize: "48px wide",
    usage: "Splash screens, social cards, event banners, merch.",
  },
  {
    name: "Wordmark only",
    description: '"seobot." — Geist Black with the signal-dot period.',
    minSize: "14px text / 64px wide",
    usage: "Space-constrained headers; never bare next to another logo without the mark.",
  },
  {
    name: "Mono mark",
    description: "One-color silhouette for constrained production.",
    minSize: "16px tall",
    usage: "One-color print, embroidery, fax-grade legal docs.",
  },
  {
    name: "OG card",
    description: "1200×630 social card template (dark, grid + glow).",
    minSize: "1200×630",
    usage: "Default social/Open Graph image; swap the tagline line per campaign.",
  },
];

export const colorRules = [
  "Signal green marks exactly three things: primary actions, active states, and the current data highlight. Nothing else earns the color.",
  "The mark is the climb — four flat tones of signal green, no gradient. The wordmark stays ink; only its period takes the dot.",
  "Dark surfaces use brand-400 for the dot; light surfaces use brand-500. That is the entire per-theme change.",
  "Marketing pages put UI reads on the semantic tokens (primary, chart-1…8); brand-* primitives stay in brand surfaces like the OG card.",
];

export const typeRoles = [
  {
    role: "Brand display",
    spec: "Geist · 900 · tracking ≤ -5%",
    sample: "seobot, hero headlines, splash screens",
  },
  {
    role: "Headings",
    spec: "Geist · 600 · tracking-tight",
    sample: "Section titles and page h1s",
  },
  {
    role: "Body & UI",
    spec: "Geist · 400–500",
    sample: "Everything a person reads at length",
  },
  {
    role: "Data & code",
    spec: "Geist Mono · 400–500",
    sample: "Numbers, stats, code, tokens, timestamps",
  },
];
