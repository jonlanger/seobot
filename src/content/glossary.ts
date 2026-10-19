/**
 * Glossary — `/glossary/{slug}`
 *
 * Purpose (content-models.md §11): own the definitional layer of the category.
 * These pages are what AI engines quote — the `definition` string must work
 * out of context, and every stat must carry a source.
 *
 * Rules:
 * - 20 great terms beat 200 stubs: don't add a term without real added value.
 * - `relatedTerms` values must be slugs that exist in this array.
 * - Facts here are re-verified against `docs/geo-research.md` (Oct 2026).
 */
import type { Cta, PageSeo, ProofStat, SourceRef } from "./types";
import { definedTermSchema } from "./schema";

export interface GlossaryTermPage extends PageSeo {
  /** Display term, e.g. "Generative engine optimization (GEO)". */
  term: string;
  /** URL slug — rendered at `/glossary/${slug}`. */
  slug: string;
  /** 1–2 sentences, standalone-quotable. Leads the page above the fold. */
  definition: string;
  /** Usage, examples, how it relates to Seobot. Markdown. */
  longForm: string;
  /** Sourced stats the page can display. */
  keyFacts?: ProofStat[];
  sources?: SourceRef[];
  relatedTerms: string[];
  cta: Cta;
  publishedAt: string;
  updatedAt: string;
}

const GLOSSARY_PATH = "/glossary";
const publishedAt = "2026-10-16";
const updatedAt = "2026-10-16";

type GlossaryTermInput = Omit<
  GlossaryTermPage,
  "path" | "robots" | "jsonLd" | "publishedAt" | "updatedAt"
>;

function buildGlossaryTerm(input: GlossaryTermInput): GlossaryTermPage {
  const path = `${GLOSSARY_PATH}/${input.slug}`;
  return {
    ...input,
    path,
    robots: "index, follow",
    publishedAt,
    updatedAt,
    jsonLd: [
      definedTermSchema({
        name: input.term,
        description: input.definition,
        path,
        setPath: GLOSSARY_PATH,
        setLabel: "Seobot glossary",
      }),
    ],
  };
}

export const glossaryTerms: GlossaryTermPage[] = [
  buildGlossaryTerm({
    term: "Generative engine optimization (GEO)",
    slug: "generative-engine-optimization",
    title: "What is generative engine optimization (GEO)? | Seobot",
    description:
      "Generative engine optimization (GEO) is how sites get cited by ChatGPT, Perplexity, and AI Overviews. Learn the tactics that measurably lift AI visibility.",
    definition:
      "Generative engine optimization (GEO) is the practice of structuring web content so that AI-powered answer engines — such as ChatGPT, Perplexity, Google AI Overviews, and Microsoft Copilot — retrieve, cite, and recommend it. It combines technical crawlability for AI crawlers with content tactics like direct answers, sourced statistics, and quotations.",
    longForm: `## How GEO differs from SEO

SEO competes for a position in a ranked list of links. GEO competes for a citation inside a synthesized answer, where the engine has already read the page. The two overlap heavily — crawlable HTML, clear structure, and authority all matter in both — but GEO adds levers that only affect retrieval-based answers: passages that answer a question directly, statistics with sources, quotations, and freshness signals.

## What the research says works

The foundational GEO study (Aggarwal et al., Princeton, KDD 2024) measured nine content tactics across 10,000 queries. Quotation addition delivered the strongest visibility lift (+41% relative), followed by statistics addition (+31%), fluency optimization, and citing sources (+28%). Keyword stuffing — a classic SEO habit — was the only tactic that reduced visibility. The study also found the biggest gains for lower-ranked sites: adding sources lifted a fifth-ranked page by more than 100%.

## The technical half

GEO is not only editorial. Most major AI crawlers do not execute JavaScript, so content that only appears after client-side rendering is invisible to ChatGPT, Claude, and Perplexity. Server-rendered HTML, an explicit robots.txt allow-list for AI search crawlers, and an accurate sitemap are prerequisites before any content tactic can work.`,
    keyFacts: [
      {
        value: "+40%",
        label: "Maximum visibility lift measured for quotation addition across 10,000 test queries",
        source: "Aggarwal et al., KDD 2024",
      },
      {
        value: "82.9%",
        label: "Share of AI citations pointing to third-party sources rather than the brand's own site",
        source: "83,670-citation dataset, 2026",
      },
    ],
    sources: [
      {
        label: "Aggarwal et al. — GEO: Generative Engine Optimization (KDD 2024)",
        url: "https://arxiv.org/abs/2311.09735",
      },
      {
        label: "Google Search Central — Optimizing for generative AI features in Search",
        url: "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide",
      },
    ],
    relatedTerms: ["answer-engine-optimization", "ai-crawler", "llms-txt"],
    cta: {
      headline: "Make your site citable by AI engines",
      subhead:
        "Seobot keeps your pages crawlable and optimized for both search engines and AI answer engines.",
      primary: { label: "Run a free SEO check", href: "/seo-check" },
      secondary: { label: "See the AI crawler reference", href: "/ai-crawlers" },
    },
  }),

  buildGlossaryTerm({
    term: "Answer engine optimization (AEO)",
    slug: "answer-engine-optimization",
    title: "What is answer engine optimization (AEO)? | Seobot",
    description:
      "Answer engine optimization (AEO) formats content so search engines and AI assistants can surface it as a direct answer. Learn how AEO works and what to do.",
    definition:
      "Answer engine optimization (AEO) is the practice of formatting content to directly answer a user's question so that search engines and AI assistants can surface it as a featured answer, snippet, or citation. AEO emphasizes question-shaped headings, concise answer-first passages, and FAQ markup that matches the visible text.",
    longForm: `## AEO vs SEO vs GEO

AEO emerged with featured snippets and voice assistants: format a clear answer, and the search engine may surface it directly. GEO extends the idea to generative engines, where the answer is synthesized from multiple sources and the win is being one of the cited passages. Google's official position is that AEO and GEO are still SEO at their core — its AI features are grounded in the same ranking and quality systems as regular results.

## What AEO looks like in practice

Question-shaped headings that match how people ask. A one-sentence answer directly under each heading, followed by detail. FAQ blocks with concise, standalone answers. Schema markup that matches the visible text — helpful for rich results, though not required for AI features. The goal is that a system extracting a passage can lift your answer without needing the rest of the page.`,
    sources: [
      {
        label: "Google Search Central — Optimizing for generative AI features in Search",
        url: "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide",
      },
    ],
    relatedTerms: [
      "generative-engine-optimization",
      "ai-overviews",
      "query-fan-out",
    ],
    cta: {
      headline: "Answer-first pages, working for you",
      primary: { label: "Run a free SEO check", href: "/seo-check" },
    },
  }),

  buildGlossaryTerm({
    term: "AI crawler",
    slug: "ai-crawler",
    title: "What is an AI crawler? Definition & examples | Seobot",
    description:
      "AI crawlers fetch pages for AI training and answer engines — and most don't run JavaScript. The crawlers, the robots.txt rules, and how to verify access.",
    definition:
      "An AI crawler is an automated web agent operated by an AI company that fetches pages to build training datasets (GPTBot, CCBot) or answer-engine search indexes (OAI-SearchBot, PerplexityBot, Claude-SearchBot). Unlike Googlebot, most AI crawlers do not execute JavaScript, so content that only renders client-side is invisible to them.",
    longForm: `## Three classes of AI crawler

Search crawlers build the indexes that answer engines cite: OAI-SearchBot (ChatGPT), PerplexityBot, and Claude-SearchBot, plus Bingbot and Googlebot, whose indexes ground Copilot, ChatGPT's retrieval pool, and Google's AI features. User-triggered agents — ChatGPT-User, Perplexity-User, Claude-User — fetch a specific page when a person asks about it. Training crawlers such as GPTBot, CCBot, and the Google-Extended token collect content for future models. Blocking one does not block the others: each is a separate robots.txt decision.

## Why AI crawlers behave differently

Unlike Googlebot, most AI crawlers do not execute JavaScript — analysis of more than 500 million crawler fetches found zero JavaScript execution across GPTBot, ClaudeBot, PerplexityBot, and others. They read the raw HTML the server returns. They are also faster than most people assume: in a first-party study of 300 new pages, GPTBot fetched its first page 14 minutes after publish, and all major crawlers combined covered 43% of pages within 24 hours.

## Managing them

robots.txt is the standard control. Allow the search crawlers to stay eligible for citations, treat training crawlers as a separate policy decision, and verify traffic against vendor-published IP ranges — user-agent strings alone can be spoofed.`,
    keyFacts: [
      {
        value: "0 of 6",
        label: "Major AI crawlers that execute client-side JavaScript",
        source: "Vercel/MERJ analysis of 500M+ fetches",
      },
      {
        value: "43%",
        label: "New pages discovered by major AI crawlers within 24 hours of publish",
        source: "Presenc AI first-party study, 2026",
      },
    ],
    sources: [
      {
        label: "OpenAI — Overview of OpenAI crawlers",
        url: "https://developers.openai.com/api/docs/bots",
      },
      {
        label: "Perplexity — Perplexity crawlers documentation",
        url: "https://docs.perplexity.ai/docs/resources/perplexity-crawlers",
      },
      {
        label: "Vercel — The rise of the AI crawler (500M+ fetch analysis)",
        url: "https://vercel.com/blog/the-rise-of-the-ai-crawler",
      },
      {
        label: "Presenc AI — How fast AI crawlers index new pages",
        url: "https://presenc.ai/research/how-fast-ai-crawlers-index-new-pages",
      },
    ],
    relatedTerms: ["oai-searchbot", "perplexitybot", "llms-txt"],
    cta: {
      headline: "Check how AI crawlers see your site",
      subhead:
        "Seobot verifies that your pages render for crawlers that don't run JavaScript — and flags when they can't.",
      primary: { label: "Run a free SEO check", href: "/seo-check" },
      secondary: { label: "Full crawler reference", href: "/ai-crawlers" },
    },
  }),

  buildGlossaryTerm({
    term: "OAI-SearchBot",
    slug: "oai-searchbot",
    title: "OAI-SearchBot: OpenAI's ChatGPT search crawler | Seobot",
    description:
      "OAI-SearchBot crawls for the ChatGPT search index and decides which sites get cited. What it does, how it differs from GPTBot, and how to stay eligible.",
    definition:
      "OAI-SearchBot is OpenAI's crawler for ChatGPT's search features. It builds the index that determines which sites can be cited and linked in ChatGPT search answers; blocking it in robots.txt removes a site from that source pool, with changes taking effect in about 24 hours.",
    longForm: `## OAI-SearchBot vs GPTBot vs ChatGPT-User

OpenAI operates three separate agents. GPTBot collects training data. OAI-SearchBot crawls for the ChatGPT search index — it is the one that determines whether your site can be cited. ChatGPT-User fetches a page live when a user asks about it. The decisions are independent: a site can opt out of training (GPTBot) while staying fully citable in search (OAI-SearchBot).

## How ChatGPT chooses sources

ChatGPT's retrieval has been built on Bing's web index; in a Seer Interactive analysis, 87% of sources cited by ChatGPT search appeared in Bing's top 20 results for the same query. OpenAI's own crawler feeds an additional index layer on top. Practically, that means Bing visibility — sitemap submission, IndexNow, clean technical SEO — is a prerequisite for ChatGPT visibility, not an alternative to it.`,
    keyFacts: [
      {
        value: "87%",
        label: "Sources cited by ChatGPT search that appear in Bing's top 20 results",
        source: "Seer Interactive",
      },
      {
        value: "~24 h",
        label: "Time for robots.txt changes to take effect in ChatGPT search",
        source: "OpenAI documentation",
      },
    ],
    sources: [
      {
        label: "OpenAI — Overview of OpenAI crawlers",
        url: "https://developers.openai.com/api/docs/bots",
      },
      {
        label: "Seer Interactive — AI search research",
        url: "https://www.seerinteractive.com/insights",
      },
    ],
    relatedTerms: ["ai-crawler", "generative-engine-optimization", "indexnow"],
    cta: {
      headline: "Get on the shortlist ChatGPT cites",
      primary: { label: "Run a free SEO check", href: "/seo-check" },
      secondary: { label: "See the AI crawler reference", href: "/ai-crawlers" },
    },
  }),

  buildGlossaryTerm({
    term: "PerplexityBot",
    slug: "perplexitybot",
    title: "What is PerplexityBot? How Perplexity crawls sites | Seobot",
    description:
      "PerplexityBot indexes pages for Perplexity's answer engine. How the crawler works, what it rewards, and why Perplexity citations convert so well.",
    definition:
      "PerplexityBot is Perplexity's indexing crawler. It respects robots.txt and feeds Perplexity's answer engine, which retrieves pages live for every query and cites three to eight sources per answer; Perplexity also blends Bing's index, so Bing visibility matters as well.",
    longForm: `## How Perplexity retrieves and cites pages

Perplexity searches the live web on every query: it decomposes the question, retrieves roughly ten candidate pages, and cites three to eight inline sources. Its retrieval blends its own index (built by PerplexityBot) with Bing's. A page that Bing or PerplexityBot cannot fetch cannot be cited, regardless of its quality.

## What the crawler rewards

PerplexityBot recrawls established sites that publish regularly on a weekly-to-monthly cadence, uses sitemap freshness (the lastmod date) as a recrawl signal, and backs off from pages with errors or stale dates. Freshness carries unusual weight: a recently updated page can out-cite older, higher-authority content. Being named favorably on third-party sites — review platforms, industry publications, community threads — also feeds Perplexity's source selection.

## Worth the effort

Perplexity referral traffic is small but exceptional: in one B2B client study, it converted at 10.5% versus 1.76% for Google organic.`,
    keyFacts: [
      {
        value: "3–8",
        label: "Sources cited per Perplexity answer, from roughly 10 pages fetched",
        source: "Perplexity retrieval analyses, 2026",
      },
      {
        value: "10.5% vs 1.76%",
        label: "Perplexity referral conversion vs Google organic (one B2B client)",
        source: "Seer Interactive case study",
      },
    ],
    sources: [
      {
        label: "Perplexity — Perplexity crawlers documentation",
        url: "https://docs.perplexity.ai/docs/resources/perplexity-crawlers",
      },
      {
        label: "Seer Interactive — AI search research",
        url: "https://www.seerinteractive.com/insights",
      },
    ],
    relatedTerms: ["ai-crawler", "generative-engine-optimization", "indexnow"],
    cta: {
      headline: "Win the citations Perplexity converts",
      primary: { label: "Run a free SEO check", href: "/seo-check" },
    },
  }),

  buildGlossaryTerm({
    term: "Google-Extended",
    slug: "google-extended",
    title: "Google-Extended: what it controls (and doesn't) | Seobot",
    description:
      "Google-Extended is a robots.txt token for Gemini training and grounding — not an AI Overviews opt-out. What it controls and when to use it.",
    definition:
      "Google-Extended is a robots.txt token — not a crawler — that controls whether content Google has already crawled may be used to train Gemini models and ground answers in Gemini Apps and Vertex AI. It does not affect inclusion or ranking in Google Search, AI Overviews, or AI Mode, which run on the Googlebot index.",
    longForm: `## What Google-Extended actually controls

Google-Extended is a robots.txt token, not a crawler — no request ever arrives under that name. It governs two downstream uses of content Googlebot has already crawled: training future Gemini models, and grounding answers in Gemini Apps and the Vertex AI API. Google states it does not impact a site's inclusion in Google Search or act as a ranking signal.

## The mistake everyone makes

Blocking Google-Extended is often sold as an opt-out from AI Overviews. It is not: AI Overviews and AI Mode are features inside Google Search, grounded in the normal Search index via Googlebot. An analysis of major news publishers found 92.3% of sites that blocked Google-Extended still appeared in AI citations. The only real lever over AI Overview quoting is the nosnippet meta tag — and it removes your regular search snippet too.

## When to use it

If a publisher wants to refuse Gemini training while staying in Google Search, Google-Extended (with Googlebot allowed) is exactly the right control. For most marketing sites, allowing it costs nothing and increases the odds AI models recognize the brand.`,
    keyFacts: [
      {
        value: "92.3%",
        label: "Top news sites blocking Google-Extended that still appear in AI citations",
        source: "BuzzStream analysis, 2026",
      },
    ],
    sources: [
      {
        label: "Google Search Central — List of Google crawlers (Google-Extended)",
        url: "https://developers.google.com/crawling/docs/crawlers-fetchers/overview-google-crawlers",
      },
      {
        label: "ppc.land — Explaining Google-Extended",
        url: "https://ppc.land/google-extended/",
      },
    ],
    relatedTerms: [
      "ai-overviews",
      "ai-crawler",
      "generative-engine-optimization",
    ],
    cta: {
      headline: "Keep Search and its AI features working for you",
      primary: { label: "Run a free SEO check", href: "/seo-check" },
    },
  }),

  buildGlossaryTerm({
    term: "AI Overviews",
    slug: "ai-overviews",
    title: "What are Google AI Overviews? How to appear | Seobot",
    description:
      "Google AI Overviews summarize the web with inline citations. How they're built (RAG + query fan-out), how pages get cited, and what doesn't matter.",
    definition:
      "AI Overviews are AI-generated summary blocks shown above Google search results that synthesize information from multiple web pages with inline source links. A page must be indexed and snippet-eligible to appear in them; roughly 38% of AI Overview citations go to pages that also rank in the top 10 for the query.",
    longForm: `## What AI Overviews are

AI Overviews are AI-generated summary blocks shown above Google results, synthesized from multiple pages with inline source links. Google describes the mechanism as retrieval-augmented generation over the Search index plus query fan-out: one question becomes several parallel sub-queries, and sources are selected across all of them.

## How pages get in

A page must be indexed and eligible to appear with a snippet — there is no special file, schema, or markup required, and Google explicitly says it ignores llms.txt. Overlap with classic rankings is real but shrinking: 38% of pages cited in AI Overviews also rank in the top 10 for the query, down from about 76% in mid-2025 as fan-out source selection plays a bigger role. AI Overviews now appear for 83% of branded searches.

## The trade-off

When an AI Overview appears, top-position click-through rates drop sharply — around 58% at position one in Ahrefs' latest study. But being cited is associated with more clicks per impression than not being cited, which is why the practical goal is citation-worthy content: direct answers, sourced statistics, quotes, and tables.`,
    keyFacts: [
      {
        value: "83%",
        label: "Branded searches showing an AI Overview (September 2026)",
        source: "Ahrefs",
      },
      {
        value: "38%",
        label: "AI Overview citations that also rank in the top 10 organic results",
        source: "Ahrefs, 2026",
      },
    ],
    sources: [
      {
        label: "Google Search Central — Optimizing for generative AI features in Search",
        url: "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide",
      },
      {
        label: "Ahrefs — AI Overview citations and the top 10",
        url: "https://ahrefs.com/blog/ai-overview-citations-top-10/",
      },
      {
        label: "Ahrefs — AI Overviews on branded searches",
        url: "https://ahrefs.com/blog/ai-overviews-on-branded-searches",
      },
    ],
    relatedTerms: [
      "query-fan-out",
      "google-extended",
      "generative-engine-optimization",
    ],
    cta: {
      headline: "Be the source, not just the summary",
      primary: { label: "Run a free SEO check", href: "/seo-check" },
      secondary: { label: "See the AI crawler reference", href: "/ai-crawlers" },
    },
  }),

  buildGlossaryTerm({
    term: "Query fan-out",
    slug: "query-fan-out",
    title: "What is query fan-out in AI search? Definition | Seobot",
    description:
      "Query fan-out expands one question into several parallel searches before AI answers are written. How it works and what it means for content strategy.",
    definition:
      "Query fan-out is the technique AI search systems use to expand one user question into several parallel sub-queries, retrieve results for each, and synthesize a combined answer. Google describes fan-out as core to AI Overviews and AI Mode, which means pages can be cited for sub-intents the original query never mentioned.",
    longForm: `## How fan-out works

A user asks one question; the model generates several related sub-queries and retrieves results for each in parallel, then synthesizes a single answer. Google describes this as the core retrieval strategy behind AI Overviews and AI Mode. A query about fixing a weedy lawn, for example, might fan out into queries about herbicides, chemical-free removal methods, and prevention.

## Why it changes content strategy

Pages are now cited for sub-intents the original query never mentioned, so breadth-within-a-topic on one strong page beats thin pages per query variant. Google warns explicitly that manufacturing pages for every fan-out variation violates its scaled-content-abuse policy. The durable play is coverage: one authoritative page per topic that answers the natural follow-up questions, with clear headings so each answer can be extracted on its own.`,
    sources: [
      {
        label: "Google Search Central — Optimizing for generative AI features in Search",
        url: "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide",
      },
    ],
    relatedTerms: [
      "ai-overviews",
      "answer-engine-optimization",
      "generative-engine-optimization",
    ],
    cta: {
      headline: "Cover the topic, not just the keyword",
      primary: { label: "Run a free SEO check", href: "/seo-check" },
    },
  }),

  buildGlossaryTerm({
    term: "llms.txt",
    slug: "llms-txt",
    title: "What is llms.txt? (And does it help AI visibility?) | Seobot",
    description:
      "llms.txt is a curated Markdown index for AI agents. Google ignores it and 97% of files get zero crawler requests — here's what it's actually good for.",
    definition:
      "llms.txt is a proposed convention, published by Jeremy Howard in 2024, for placing a curated Markdown index of a site's key pages at /llms.txt so AI agents and developer tools can orient quickly. Google Search ignores it, and log studies show it does not drive AI citations today — it is hygiene for agent-facing sites, not a ranking lever.",
    longForm: `## What llms.txt is

Proposed by Jeremy Howard in September 2024, llms.txt is a Markdown file at a site's root that gives AI systems a curated index of the most useful pages, each with a one-line description. A companion file, llms-full.txt, can concatenate full page content for direct ingestion. The format is minimal: an H1, a blockquote summary, and sections of links.

## What it does not do

Google Search ignores llms.txt entirely, and there is no evidence it improves citations in ChatGPT, Perplexity, or Claude. The strongest data point: an Ahrefs analysis of 137,210 domains found 97% of llms.txt files received zero requests from crawlers. Anyone selling it as a GEO ranking factor is selling something the data does not support.

## Where it earns its keep

Developer tooling. IDE agents such as Cursor and Claude Code look for llms.txt to orient themselves on a site's documentation, and documentation platforms now generate the file by default. For an API or docs-heavy product, a curated file reduces hallucinated integrations and bad answers. Treat it as hygiene for agent-facing surfaces — not a lever for AI search visibility.`,
    keyFacts: [
      {
        value: "97%",
        label: "llms.txt files that received zero crawler requests in a 137,210-domain log study",
        source: "Ahrefs, 2026",
      },
      {
        value: "66%",
        label: "Share of traffic to a major docs platform coming from agents",
        source: "Mintlify, July 2026",
      },
    ],
    sources: [
      {
        label: "llmstxt.org — The /llms.txt file, v2",
        url: "https://llmstxt.org/",
      },
      {
        label: "Metavert — State of AI Search Citations, Q4 2026 (roundup incl. Ahrefs llms.txt log study)",
        url: "https://metavert.io/state-of-ai-search-citations",
      },
    ],
    relatedTerms: [
      "ai-crawler",
      "generative-engine-optimization",
      "oai-searchbot",
    ],
    cta: {
      headline: "Agent-friendly docs, without the guesswork",
      primary: { label: "Run a free SEO check", href: "/seo-check" },
    },
  }),

  buildGlossaryTerm({
    term: "IndexNow",
    slug: "indexnow",
    title: "What is IndexNow? Bing & Copilot instant indexing | Seobot",
    description:
      "IndexNow notifies search engines the moment a URL changes. Why it matters for Bing, Microsoft Copilot, and ChatGPT's retrieval — and how to set it up.",
    definition:
      "IndexNow is an open protocol that lets a site instantly notify participating search engines — including Bing, which powers Microsoft Copilot and supplies part of ChatGPT's retrieval pool — when a URL is created, updated, or deleted. Microsoft says it helps keep Copilot answers from pointing at stale pages.",
    longForm: `## What IndexNow is

IndexNow is an open protocol that lets a site notify search engines the moment a URL is created, updated, or deleted, instead of waiting for the next crawl. A site hosts a key file, then pings an endpoint (or uses a plugin or API) whenever content changes. Bing, Naver, Seznam, Yandex, and Yep participate; Microsoft recommends it for keeping Copilot answers current.

## Why it matters for AI answers

Bing's index does double duty: it powers Microsoft Copilot and supplies part of the candidate pool for ChatGPT's web retrieval. Microsoft says IndexNow notifications help Bing refresh its index and reduce outdated or incorrect URL references in Copilot responses and grounding results. For fast-moving sites, that means fewer AI answers citing last month's prices or features.

## Setting expectations

IndexNow is a notification, not a guarantee — submitting a URL does not force immediate indexing. It works best alongside accurate sitemaps, regular publishing, and clean internal linking.`,
    sources: [
      {
        label: "IndexNow — Protocol overview",
        url: "https://www.indexnow.org/",
      },
      {
        label: "Bing Webmaster Tools",
        url: "https://www.bing.com/webmasters",
      },
    ],
    relatedTerms: ["oai-searchbot", "perplexitybot", "ai-crawler"],
    cta: {
      headline: "Never let a stale page answer for you",
      primary: { label: "Run a free SEO check", href: "/seo-check" },
    },
  }),
];

export function findGlossaryTerm(slug: string): GlossaryTermPage | undefined {
  return glossaryTerms.find((term) => term.slug === slug);
}
