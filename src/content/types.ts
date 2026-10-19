/**
 * Shared content primitives — code mirror of `docs/content-models.md` §0.
 *
 * These types are the contract between content modules (`src/content/*`), the
 * design-system components, and the prerender pipeline. Keep this file in sync
 * with the doc. Template interfaces live here once more than one module needs
 * them (currently: Home, Pricing, Glossary, crawler reference).
 */

/** A JSON-LD object, rendered as <script type="application/ld+json">. */
export type JsonLd = Record<string, unknown>;

/** Every page supplies exactly one of these. Consumed by <Seo> during render (prerender-safe). */
export interface PageSeo {
  /** Final <title> tag. Target 30–60 chars. Formula per template (see content-models.md §1). */
  title: string;
  /** Meta description. Target 120–160 chars. Persuasive; ends with a concrete next step. */
  description: string;
  /** Absolute path, e.g. "/pricing". Drives canonical + sitemap. */
  path: string;
  /** Defaults to "index, follow". App/error routes must set "noindex". */
  robots?: "index, follow" | "noindex";
  /** 1200×630 social card. Falls back to brand default. */
  ogImage?: string;
  /** JSON-LD objects. Must match visible copy. */
  jsonLd?: JsonLd[];
}

export interface CtaLink {
  label: string;
  href: string;
}

export interface Cta {
  headline: string;
  subhead?: string;
  primary: CtaLink;
  secondary?: CtaLink;
  /** Small print under the buttons, e.g. "14 days free · No credit card". */
  note?: string;
}

export interface Hero {
  eyebrow?: string;
  /** Optional announcement pill above the headline. */
  announcement?: CtaLink;
  /** Rendered as the page's single <h1>. */
  headline: string;
  subhead: string;
  primaryCta?: CtaLink;
  secondaryCta?: CtaLink;
  /** Small print under the CTAs. */
  note?: string;
  media?: MediaRef;
}

/** width/height are REQUIRED — they reserve layout space and prevent CLS. */
export interface MediaRef {
  src: string;
  /** Empty string only for decorative images. */
  alt: string;
  width: number;
  height: number;
}

/** Answers 40–60 words, self-contained, answer-first. */
export interface FaqItem {
  question: string;
  answer: string;
}

/** Stats must be sourced: number + unit + source + year. */
export interface ProofStat {
  value: string;
  label: string;
  source?: string;
}

export interface Crumb {
  label: string;
  href: string;
}

/** A source line rendered at the foot of reference/editorial pages. */
export interface SourceRef {
  label: string;
  url: string;
}

/** Eyebrow + title + description used above any section. */
export interface SectionHeading {
  eyebrow: string;
  title: string;
  description: string;
}

/** Home page — `/` (content-models.md §2). */
export interface HomePage extends PageSeo {
  hero: Hero;
  /** Definition-first paragraph. First sentence must stand alone as a "What is Seobot?" answer. Rendered as a dedicated band directly under the hero. */
  definition: string;
  /** Source coverage strip — the crawlers the study measures. Rendered as a marquee. */
  coverage: { caption: string; items: string[] };
  /**
   * The evidence layer: sourced industry stats plus one comparison table.
   * AI engines preferentially extract tables and cite sourced numbers
   * (docs/geo-research.md §5.2) — every stat carries a source + year.
   */
  evidence: {
    heading: SectionHeading;
    stats: ProofStat[];
    table: {
      title: string;
      columns: [string, string];
      rows: { label: string; values: [string, string] }[];
      /** Sourced caption rendered with the table (number + source + year). */
      source: string;
    };
  };
  features: {
    heading: SectionHeading;
    items: { featureSlug: string; title: string; description: string }[];
  };
  howItWorks: {
    heading: SectionHeading;
    steps: { title: string; description: string }[];
  };
  faq: { heading: SectionHeading; items: FaqItem[] };
  finalCta: Cta;
}
