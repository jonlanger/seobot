/**
 * Home page content — `/`
 *
 * The verbatim source of truth for the landing sections in
 * `src/components/marketing/*`, which render these values directly — the copy
 * this file describes is the copy that ships (and the copy the SEO audit
 * validates).
 *
 * Positioning (2026-10-18): Seobot is **research plus a free check** — a
 * sourced study of how Google and AI crawlers read the top sites, and a
 * free in-browser SEO check that applies it. Nothing here may promise a
 * feature that does not ship (rank tracking, briefs, trials, pricing); add
 * claims back only when the product exists.
 *
 * SEO/GEO shape (docs/content-models.md §2, docs/geo-research.md §10.1):
 * - Definition-first paragraph directly under the hero — the passage engines quote.
 * - Sourced statistics + one comparison table (the evidence layer).
 * - FAQ text is shared with FAQPage JSON-LD so schema always matches visible copy.
 *
 * TODO(launch): CTA hrefs (`/seo-check`) resolve through the `?view=` demo
 * router (`src/lib/demo-links.ts`) until real routing and the signup flow land.
 */
import {
  faqPageSchema,
  organizationSchema,
  softwareApplicationSchema,
  websiteSchema,
} from "./schema";
import { fmt, studyFacts as f } from "./study-facts";
import type { FaqItem, HomePage } from "./types";

/** FAQ copy — shared with FAQPage JSON-LD so schema always matches visible text. */
const faqItems: FaqItem[] = [
  {
    question: "What is Seobot?",
    answer:
      `Seobot is an SEO research site. It publishes a sourced study of how Google and AI crawlers read ${fmt(f.crawled)} top websites, and a free two-minute SEO check that turns those findings into a prioritized fix list for your own site.`,
  },
  {
    question: "How was the study run?",
    answer:
      `We crawled ${fmt(f.crawled)} homepages from Tranco list ${f.listId} with the same user agent: once over plain HTTP and once in headless Chromium (the first ${fmt(f.doublePassThrough ?? 0)} twice, to test stability), and kept going down the list until ${fmt(f.readable)} were readable. JavaScript execution is the only variable, so the gap between the passes shows what a non-rendering AI crawler misses.`,
  },
  {
    question: "What does the free SEO check cover?",
    answer:
      "About 15 questions across Search Console, indexing, content, links, speed, and AI visibility. Two come straight from the study: whether your content survives without JavaScript, and whether your robots.txt and firewall let AI search crawlers in. Each answer becomes a fix or a verify step, ranked by impact.",
  },
  {
    question: "Does the free SEO check upload my site?",
    answer:
      "No. The check runs entirely in your browser, with nothing to install and no account to create. You answer about 15 plain-English questions, and the score is calculated on your device. The URL you enter only personalizes the report and prefills links to Google's own tools. Nothing is fetched or stored.",
  },
  {
    question: "How is the score calculated?",
    answer:
      "Each answer scores Yes = 1, Not sure = 0.5, or No = 0, weighted by how much the issue matters and by your site type. “Not sure” lowers the report's confidence rather than counting as a failure. There are no industry benchmarks, because we only publish numbers we have measured.",
  },
  {
    question: "Can I reuse the study data?",
    answer:
      "Yes. The first-party study data is licensed CC BY 4.0, so you can reuse and republish it with attribution to Seobot. Third-party sources keep their own licenses and are cited rather than republished.",
  },
];

export const home: HomePage = {
  /* ---------------------------------- SEO ---------------------------------- */
  title: "Seobot — SEO data for Google rankings and AI citations",
  description:
    `Original research on how Google and AI crawlers read ${fmt(f.crawled)} top sites, plus a free two-minute SEO check for your own. Nothing is uploaded.`,
  path: "/",
  jsonLd: [
    organizationSchema(),
    websiteSchema(),
    softwareApplicationSchema({
      description:
        `A free, in-browser SEO check that scores a site in about two minutes and returns a prioritized fix list, built on a sourced study of how Google and AI crawlers read ${fmt(f.crawled)} top sites.`,
      offer: {
        price: 0,
        priceCurrency: "USD",
        description: "Free. No signup; runs entirely in the browser.",
      },
    }),

    faqPageSchema(faqItems),
  ],

  /* --------------------------------- Hero ---------------------------------- */
  hero: {
    headline: "SEO and GEO data visualization and analysis",
    subhead:
      "Explore search engine optimization and generative engine optimization data through interactive visualizations, research dashboards, and evidence-based insights.",
    primaryCta: { label: "View Data", href: "/dashboard" },
    secondaryCta: { label: "Run a free SEO check", href: "/seo-check" },
  },

  /* ------------------------------- Definition ------------------------------ */
  // Definition-first: the first sentence must stand alone as a quotable
  // "What is Seobot?" answer for AI engines. Rendered directly under the hero.
  definition:
    `Seobot is an SEO research site and free SEO check. It measures how Google and AI search crawlers read the web — starting with a two-pass crawl of ${fmt(f.crawled)} top sites — and turns the findings into a prioritized fix list for your own site.`,

  /* -------------------------------- Coverage ------------------------------- */
  // Source coverage strip — replaces the generic customer-logo cloud. The claim
  // is the product: these are the surfaces every account is checked against.
  coverage: {
    caption: "Crawlers measured in the study",
    items: ["Googlebot", "Bingbot", "GPTBot", "OAI-SearchBot", "ClaudeBot", "PerplexityBot"],
  },


  /* -------------------------------- Evidence ------------------------------- */
  evidence: {
    heading: {
      eyebrow: "The study",
      title: "What the top sites reveal",
      description:
        `Two passes over ${fmt(f.crawled)} homepages — plain HTTP versus headless Chromium — isolate JavaScript as the only variable. Every number below comes from that crawl, dated and reproducible.`,
    },
    stats: [
      {
        value: `${f.readablePct}%`,
        label:
          "of the top sites are readable as plain HTML — the rest are a wall to any crawler that does not run JavaScript",
        source: `Seobot study of ${fmt(f.crawled)} top sites, 2026`,
      },
      {
        value: `${f.unreadablePct}%`,
        label:
          "are walled off from non-JavaScript clients — blocked, empty, or failed to render",
        source: `Seobot study of ${fmt(f.crawled)} top sites, 2026`,
      },
      {
        value: `${f.coverage.median}%`,
        label:
          "median share of the rendered page a non-rendering client receives, among the readable sites",
        source: `Seobot study of ${fmt(f.crawled)} top sites, 2026`,
      },
      {
        value: `${f.blocks.GPTBot.pctOfRobotsFiles}%`,
        label: "of robots.txt files block GPTBot, OpenAI's crawler",
        source: `Seobot study of ${fmt(f.robotsFiles)} robots.txt files, 2026`,
      },
    ],
    table: {
      title: "How AI answers differ from Google Search",
      columns: ["Google Search", "AI answers — ChatGPT, Perplexity, AI Overviews"],
      rows: [
        {
          label: "Who reads your pages",
          values: ["Googlebot, which renders JavaScript", "AI crawlers, which read raw HTML only"],
        },
        {
          label: "How you get in",
          values: ["Crawl, index, rank, click", "Crawl, index, retrieve, cite"],
        },
        {
          label: "What wins",
          values: [
            "Helpful content, links, and Core Web Vitals",
            "Answer-first passages, sourced stats, and tables",
          ],
        },
        {
          label: "What the Seobot study measures",
          values: [
            "Whether pages are readable and indexable, via the free SEO check",
            "Raw-HTML coverage and robots.txt policy for AI crawlers, across the top sites",
          ],
        },
      ],
      source: "Crawler behavior: Vercel's analysis of 500M+ crawler fetches, 2026.",
    },
  },

  /* -------------------------------- Features ------------------------------- */
  // Capabilities grounded in the crawled study: machine readability, crawler
  // access, data visualizations, the linked explorer, the best-practices scorecard, and per-site pages.
  features: {
    heading: {
      eyebrow: "Built on the research",
      title: "The study, running on your site",
      description:
        `This study asked two questions of ${fmt(f.crawled)} top sites: does a non-rendering AI crawler receive the page, and do the robots.txt rules let AI search in? The free SEO check asks the same of yours — and the dashboard visualizes the answers.`,
    },
    items: [
      {
        featureSlug: "machine-readability",
        title: "Machine readability",
        description:
          `See how much of your page a non-rendering AI crawler actually receives — raw HTML versus the rendered page, scored the same way this study scored ${fmt(f.crawled)} top sites.`,
      },
      {
        featureSlug: "crawler-access",
        title: "AI crawler access",
        description:
          "Your robots.txt, checked token by token against GPTBot, OAI-SearchBot, ClaudeBot, and PerplexityBot — so AI search is blocked on purpose, never by accident.",
      },
      {
        featureSlug: "data-visualizations",
        title: "Data visualizations",
        description:
          "Interactive heatmaps, radar charts, and flow diagrams showing crawler blocking patterns, anti-bot barriers by vertical, JSON-LD structured data, and raw vs. rendered content gaps.",
      },
      {
        featureSlug: "linked-explorer",
        title: "Linked explorer",
        description:
          `Every one of ${fmt(f.crawled)} crawled sites as a dot you can re-arrange by rank, vertical, outcome, or any measured metric — then filter by crawler policy, structured data, CDN, CMS, and agent-readiness. Every view is a shareable link.`,
      },
      {
        featureSlug: "best-practices",
        title: "Best practices scorecard",
        description:
          "How many studied sites pass each measurable SEO and GEO ranking factor, with the sample size behind every rate and a label for whether the test is direct or a proxy.",
      },
      {
        featureSlug: "company-pages",
        title: "A page for every site",
        description:
          `Per-crawler robots.txt verdicts, raw-versus-rendered content metrics, and an SEO and GEO deep dive for each of the ${fmt(f.crawled)} sites crawled — readable or not.`,
      },
    ],
  },

  /* ------------------------------- How it works ---------------------------- */
  howItWorks: {
    heading: {
      eyebrow: "How it works",
      title: "From research to your fix list in three steps",
      description: "Read the evidence, run the check, fix what matters first. No signup at any step.",
    },
    steps: [
      {
        title: "Read the research",
        description:
          "Explore the top-sites study: what AI crawlers can read, which robots.txt rules let them in, and how the numbers were measured.",
      },
      {
        title: "Run the free check",
        description:
          "Answer about 15 plain-English questions. Scoring happens in your browser, and nothing about your site is uploaded.",
      },
      {
        title: "Fix what ranks first",
        description:
          "Get a prioritized list of issues, each with fix steps and a link to verify it in Google's own tools.",
      },
    ],
  },

  /* ----------------------------------- FAQ --------------------------------- */
  faq: {
    heading: {
      eyebrow: "FAQ",
      title: "Questions, answered",
      description:
        "The research, the free SEO check, and the data behind both.",
    },
    items: faqItems,
  },

  /* --------------------------------- Final CTA ----------------------------- */
  finalCta: {
    headline: "Find out what to fix first.",
    subhead:
      "Start with the free check — about two minutes, nothing uploaded — and get a prioritized list of what to fix on your site.",
    primary: { label: "Run a free SEO check", href: "/seo-check" },
    secondary: { label: "See how it works", href: "/#how-it-works" },
    note: "No signup required · Runs in your browser · Nothing is uploaded",
  },
};
