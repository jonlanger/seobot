/**
 * AI crawlers & robots.txt reference — `/ai-crawlers`
 *
 * GEO-native template (not yet in content-models.md; flag for the doc when the
 * template set is next revised): a factual, frequently-updated reference page.
 * Reference pages like this are what AI engines, agent tooling, and bloggers
 * retrieve and cite — and accurate crawler/robots.txt data is on-brand for an
 * SEO product.
 *
 * Accuracy rules for this page:
 * - Only vendor-documented crawlers. No speculative user agents.
 * - Every claim about "what blocking does" must trace to vendor docs (sources below).
 * - Re-verify quarterly; bump `lastUpdated` and extend `faq`/stats when facts change.
 */
import { fmt, studyFacts as f } from "./study-facts";
import type { Cta, FaqItem, Hero, PageSeo, ProofStat, SourceRef } from "./types";
import {
  breadcrumbListSchema,
  faqPageSchema,
  techArticleSchema,
} from "./schema";

export type CrawlerCategory = "search" | "user" | "training";

export type RobotsRecommendation = "allow" | "block";

export interface AiCrawler {
  /** robots.txt user-agent token (exact match). */
  userAgent: string;
  operator: string;
  category: CrawlerCategory;
  /** What the crawler does, in one sentence. */
  purpose: string;
  /** What actually changes when a site blocks it. */
  blockEffect: string;
  recommendation: RobotsRecommendation;
  /** True when the entry is a robots.txt token, not a standalone crawler. */
  tokenNotCrawler?: boolean;
  docsUrl?: string;
  ipRangesUrl?: string;
  notes?: string;
}

export interface CrawlerReferencePage extends PageSeo {
  hero: Hero;
  /** Standalone-quotable definition of an AI crawler. Leads the page. */
  definition: string;
  publishedAt: string;
  lastUpdated: string;
  keyStats: ProofStat[];
  crawlers: AiCrawler[];
  /** Copy-paste robots.txt block shown on the page. */
  robotsTemplate: string;
  verify: {
    intro: string;
    commands: { label: string; command: string; expect: string }[];
    checklist: string[];
  };
  faq: FaqItem[];
  sources: SourceRef[];
  cta: Cta;
}

const lastUpdated = "2026-10-16";

const faq: FaqItem[] = [
  {
    question: "Do AI crawlers execute JavaScript?",
    answer:
      "No. Testing across 500M+ crawler fetches found that GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot, and Bytespider never run client-side JavaScript — they read the raw HTML your server returns. The exception is Google: its AI surfaces share Googlebot's renderer. Serve complete HTML at build time or client-rendered content is invisible to every AI engine except Google.",
  },
  {
    question: "Which AI crawlers should I allow in robots.txt?",
    answer:
      "Allow the search and answer crawlers — OAI-SearchBot, PerplexityBot, Claude-SearchBot, Bingbot, and Googlebot — or your site cannot be cited in AI answers. Also allow user-triggered agents like ChatGPT-User, Perplexity-User, and Claude-User. Training crawlers such as GPTBot, Google-Extended, and CCBot are a separate policy choice that does not affect search visibility.",
  },
  {
    question: "Does blocking Google-Extended remove my site from AI Overviews?",
    answer:
      "No. Google-Extended is a robots.txt token that controls Gemini model training and grounding in Gemini Apps and Vertex AI — it is not a crawler, and it does not affect Google Search, AI Overviews, or AI Mode. Those surfaces run on the Googlebot index. Google states the token is neither an inclusion factor nor a ranking signal in Search.",
  },
  {
    question: "How do I check whether AI crawlers can read my pages?",
    answer:
      "Run curl with each crawler's user agent and grep for visible page text — if the text is missing, that crawler sees an empty shell. Then check server logs for Tier-1 crawler hits with 200 status codes; 403s and 429s usually mean a WAF or rate limit is blocking them. Verify crawler IPs against each vendor's published ranges before acting on suspicious traffic.",
  },
  {
    question: "How fast do AI crawlers find new pages?",
    answer:
      "Faster than most people expect. In a 300-page first-party study, GPTBot requested its first page 14 minutes after publish, OAI-SearchBot arrived in about 2 hours, and all major crawlers combined had discovered 43% of pages within 24 hours. Submitting sitemaps with accurate lastmod dates and using IndexNow accelerate discovery further.",
  },
  {
    question: "Is llms.txt required for AI search visibility?",
    answer:
      "No. Google Search ignores llms.txt entirely, and an Ahrefs study of 137,210 domains found that 97% of llms.txt files received zero crawler requests. It remains useful as orientation for IDE coding agents and developer tooling. Ship it as cheap hygiene if you like, but it is not a lever for AI citations.",
  },
];

const sources: SourceRef[] = [
  {
    label: "OpenAI — Overview of OpenAI crawlers (GPTBot, OAI-SearchBot, ChatGPT-User)",
    url: "https://developers.openai.com/api/docs/bots",
  },
  {
    label: "Perplexity — Perplexity crawlers documentation",
    url: "https://docs.perplexity.ai/docs/resources/perplexity-crawlers",
  },
  {
    label: "Anthropic — ClaudeBot documentation",
    url: "https://www.anthropic.com/claude-bot",
  },
  {
    label: "Google Search Central — List of Google crawlers",
    url: "https://developers.google.com/crawling/docs/crawlers-fetchers/overview-google-crawlers",
  },
  {
    label: "Google Search Central — Optimizing for generative AI features in Search",
    url: "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide",
  },
  {
    label: "Vercel — How AI is changing SEO (500M+ crawler fetches; AI crawlers do not execute JavaScript)",
    url: "https://vercel.com/blog/the-rise-of-the-ai-crawler",
  },
  {
    label: "Presenc AI — How fast AI crawlers index new pages (first-party crawl study, 2026)",
    url: "https://presenc.ai/research/how-fast-ai-crawlers-index-new-pages",
  },
  {
    label:
      "Metavert — State of AI Search Citations, Q4 2026 (roundup incl. Ahrefs llms.txt log study across 137,210 domains)",
    url: "https://metavert.io/state-of-ai-search-citations",
  },
];

const robotsTemplate = `# AI search / answer crawlers — required for citation visibility
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

# Training crawlers — policy choice. Allow / block independently of search.
User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: CCBot
Allow: /

# Aggressive crawler with no citation value to us
User-agent: Bytespider
Disallow: /

User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://seobot.example/sitemap.xml`;

export const crawlerReferencePage: CrawlerReferencePage = {
  title: "AI Crawlers & Robots.txt: The Complete Reference | Seobot",
  description:
    "GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot and every other AI crawler — what each one does, what blocking changes, and a copy-paste robots.txt config.",
  path: "/ai-crawlers",
  robots: "index, follow",
  jsonLd: [
    techArticleSchema({
      headline: "AI Crawlers & Robots.txt: The Complete Reference",
      description:
        "Every vendor-documented AI crawler with user agents, purposes, blocking effects, and recommended robots.txt rules.",
      path: "/ai-crawlers",
      datePublished: "2026-10-16",
      dateModified: lastUpdated,
      citations: sources,
    }),
    breadcrumbListSchema([
      { label: "Home", href: "/" },
      { label: "AI crawlers", href: "/ai-crawlers" },
    ]),
    faqPageSchema(faq),
  ],

  hero: {
    eyebrow: "Reference",
    headline: "AI crawlers, explained — with the robots.txt config that keeps you citable",
    subhead:
      "Every crawler the AI companies actually operate, what each one is for, and what blocking it really changes. Free to copy, updated as vendors ship new bots.",
  },

  definition:
    "AI crawlers are automated agents operated by AI companies that fetch web pages to build either training datasets (GPTBot, CCBot) or answer-engine search indexes (OAI-SearchBot, PerplexityBot, Claude-SearchBot, Bingbot, Googlebot). Each crawler is a separate robots.txt user agent: allowing the search crawlers is required for your pages to be cited in AI answers, and most of them cannot execute JavaScript.",

  publishedAt: "2026-10-16",
  lastUpdated,

  keyStats: [
    {
      value: "0 of 6",
      label: "Major AI crawlers that execute JavaScript (verify with curl)",
      source: "Vercel/MERJ analysis of 500M+ crawler fetches, 2025–26",
    },
    {
      value: "14 min",
      label: "Fastest discovery of a new page after publish (GPTBot); 43% of pages covered within 24h",
      source: "Presenc AI first-party crawl study, 2026",
    },
    {
      value: "~24 h",
      label: "Time for robots.txt changes to take effect in ChatGPT search",
      source: "OpenAI crawler documentation",
    },
  ],

  crawlers: [
    // ---- Search / answer crawlers — allow these ----
    {
      userAgent: "OAI-SearchBot",
      operator: "OpenAI",
      category: "search",
      purpose:
        "Builds and maintains the index used to surface and cite websites in ChatGPT search answers.",
      blockEffect:
        "Your site is removed from ChatGPT's search citations (navigational links may still appear). Robots.txt changes take effect in about 24 hours.",
      recommendation: "allow",
      docsUrl: "https://developers.openai.com/api/docs/bots",
    },
    {
      userAgent: "PerplexityBot",
      operator: "Perplexity",
      category: "search",
      purpose:
        "Indexes pages so Perplexity's answer engine can surface and cite them. Not used to train foundation models.",
      blockEffect:
        "Your site drops out of Perplexity's retrieval pool and cannot be cited in answers.",
      recommendation: "allow",
      docsUrl: "https://docs.perplexity.ai/docs/resources/perplexity-crawlers",
      ipRangesUrl: "https://www.perplexity.com/perplexitybot.json",
      notes:
        "Perplexity also blends Bing's index, so Bingbot coverage matters for Perplexity visibility too.",
    },
    {
      userAgent: "Claude-SearchBot",
      operator: "Anthropic",
      category: "search",
      purpose:
        "Supports search quality — determines visibility in Claude's web-search answers and citations.",
      blockEffect:
        "Your site is less likely to be retrieved and cited in Claude answers that search the web.",
      recommendation: "allow",
      docsUrl: "https://www.anthropic.com/claude-bot",
    },
    {
      userAgent: "Googlebot",
      operator: "Google",
      category: "search",
      purpose:
        "Crawls for the Google Search index — the same index that grounds AI Overviews and AI Mode.",
      blockEffect:
        "Removal from Google Search entirely, including all of its AI surfaces. Rarely the right choice.",
      recommendation: "allow",
      docsUrl:
        "https://developers.google.com/crawling/docs/crawlers-fetchers/overview-google-crawlers",
    },
    {
      userAgent: "Bingbot",
      operator: "Microsoft",
      category: "search",
      purpose:
        "Crawls for the Bing search index, which powers Microsoft Copilot and feeds part of ChatGPT's retrieval.",
      blockEffect:
        "Removal from Bing, Copilot, and the share of ChatGPT's candidate pool that comes from Bing's index.",
      recommendation: "allow",
      docsUrl: "https://www.bing.com/webmasters",
    },

    // ---- User-triggered agents — allow these ----
    {
      userAgent: "ChatGPT-User",
      operator: "OpenAI",
      category: "user",
      purpose:
        "Fetches a page in real time when a ChatGPT user or custom GPT explicitly asks about it. Not used for automatic crawling.",
      blockEffect:
        "Live requests from ChatGPT users return errors instead of your page. OpenAI notes robots.txt may not apply to these user-initiated fetches.",
      recommendation: "allow",
      docsUrl: "https://developers.openai.com/api/docs/bots",
      ipRangesUrl: "https://openai.com/chatgpt-user.json",
    },
    {
      userAgent: "Perplexity-User",
      operator: "Perplexity",
      category: "user",
      purpose:
        "Real-time fetch triggered by a Perplexity user request; not used to train foundation models.",
      blockEffect:
        "User-requested fetches fail. Perplexity's documentation notes this fetcher generally ignores robots.txt rules since a user requested the fetch.",
      recommendation: "allow",
      docsUrl: "https://docs.perplexity.ai/docs/resources/perplexity-crawlers",
      ipRangesUrl: "https://www.perplexity.com/perplexity-user.json",
    },
    {
      userAgent: "Claude-User",
      operator: "Anthropic",
      category: "user",
      purpose:
        "Fetches pages at the request of a Claude user — for example when asked to analyze a specific URL.",
      blockEffect:
        "Claude users asking about your page get an error instead of the content.",
      recommendation: "allow",
      docsUrl: "https://www.anthropic.com/claude-bot",
    },

    // ---- Training crawlers — policy choice (we allow) ----
    {
      userAgent: "GPTBot",
      operator: "OpenAI",
      category: "training",
      purpose:
        "Collects web content that may be used to train and improve OpenAI's generative AI foundation models.",
      blockEffect:
        "Content is excluded from future OpenAI training runs. No effect on ChatGPT search citation eligibility — that is OAI-SearchBot's job.",
      recommendation: "allow",
      docsUrl: "https://developers.openai.com/api/docs/bots",
    },
    {
      userAgent: "ClaudeBot",
      operator: "Anthropic",
      category: "training",
      purpose:
        "Collects web content used for Claude's model training and retrieval systems.",
      blockEffect:
        "Content is excluded from future Claude training. Search visibility is governed separately by Claude-SearchBot.",
      recommendation: "allow",
      docsUrl: "https://www.anthropic.com/claude-bot",
      notes:
        "Anthropic has historically also used the token anthropic-ai; consider allowing both.",
    },
    {
      userAgent: "Google-Extended",
      operator: "Google",
      category: "training",
      tokenNotCrawler: true,
      purpose:
        "A robots.txt token — not a crawler — controlling whether crawled content may be used to train Gemini models and ground answers in Gemini Apps and Vertex AI.",
      blockEffect:
        "Gemini training and Gemini grounding opt out. Google Search, AI Overviews, and AI Mode are unaffected; no requests ever arrive under this name.",
      recommendation: "allow",
      docsUrl:
        "https://developers.google.com/crawling/docs/crawlers-fetchers/overview-google-crawlers",
    },
    {
      userAgent: "Applebot-Extended",
      operator: "Apple",
      category: "training",
      tokenNotCrawler: true,
      purpose:
        "A robots.txt token controlling whether content collected by Applebot may be used to train Apple's generative models.",
      blockEffect:
        "Apple Intelligence training opt out. Siri and Spotlight crawls via Applebot are unaffected.",
      recommendation: "allow",
      notes:
        "Apple documents Applebot and Applebot-Extended on its Applebot support page; verify current rules there before changing.",
    },
    {
      userAgent: "CCBot",
      operator: "Common Crawl",
      category: "training",
      purpose:
        "Builds the Common Crawl open web archive, which is widely used to assemble AI training datasets.",
      blockEffect:
        "Content is absent from future Common Crawl archives — and therefore from future training sets built on them.",
      recommendation: "allow",
      docsUrl: "https://commoncrawl.org/",
      notes:
        "Some publishers block CCBot because archive use is indirect. We allow: being in the archive increases the odds models \"know\" the Seobot entity.",
    },
    {
      userAgent: "Meta-ExternalAgent",
      operator: "Meta",
      category: "training",
      purpose: "Collects web content for Meta's AI products and model training.",
      blockEffect: "Content is excluded from Meta AI training pipelines.",
      recommendation: "allow",
    },
    {
      userAgent: "Amazonbot",
      operator: "Amazon",
      category: "training",
      purpose:
        "Collects web content to improve Amazon's products and services, including AI features.",
      blockEffect: "Content is excluded from Amazon's crawls.",
      recommendation: "allow",
    },
    {
      userAgent: "cohere-ai",
      operator: "Cohere",
      category: "training",
      purpose: "Collects web content for Cohere's model training.",
      blockEffect: "Content is excluded from Cohere training datasets.",
      recommendation: "allow",
    },

    // ---- Blocked ----
    {
      userAgent: "Bytespider",
      operator: "ByteDance",
      category: "training",
      purpose:
        "ByteDance's crawler, used for AI training and content discovery across ByteDance products. Known for aggressive crawl rates.",
      blockEffect:
        "Removed from ByteDance's crawls. No known citation loss for Western AI answer engines.",
      recommendation: "block",
      notes: "Blocked by many publishers for crawl-rate reasons. Our default: Disallow.",
    },
  ],

  robotsTemplate,

  verify: {
    intro:
      "Crawler access is testable in minutes. These commands fetch a page as each crawler would (no JavaScript, raw HTML) and check for visible copy. Run them against production after every deploy that touches rendering.",
    commands: [
      {
        label: "What ChatGPT's crawler sees",
        command:
          'curl -s -A "OAI-SearchBot" https://seobot.example/ | grep -c "Seobot"',
        expect: "Non-zero when the page's copy is present in raw HTML.",
      },
      {
        label: "What Perplexity's crawler sees",
        command:
          'curl -s -A "PerplexityBot" https://seobot.example/ | grep -c "Seobot"',
        expect: "Non-zero. If zero, the page is client-rendered — AI engines see a shell.",
      },
      {
        label: "Loop across the tier-1 crawlers",
        command:
          'for bot in GPTBot OAI-SearchBot PerplexityBot Claude-SearchBot; do echo "== $bot =="; curl -s -A "$bot" https://seobot.example/ | grep -c "Seobot"; done',
        expect: "Every bot should match at least once.",
      },
    ],
    checklist: [
      "Server logs: tier-1 crawlers arriving with 200 status codes — 403s and 429s mean a WAF, CDN rule, or rate limit is blocking them.",
      "CDN/WAF: bot-management rules explicitly allow the tier-1 user agents and each vendor's published IP ranges.",
      "Sitemaps: every indexable URL present, with accurate lastmod dates (sitemap freshness accelerates recrawls).",
      "Rendering: the curl tests above pass on every marketing route — hero copy, FAQs, tables, and JSON-LD all in raw HTML.",
      "Bing Webmaster Tools: site verified, sitemap submitted, IndexNow enabled (Bing feeds Copilot and part of ChatGPT retrieval).",
      "Google Search Console: property opted into generative AI features so the Generative AI performance report collects data.",
    ],
  },

  faq,
  sources,

  cta: {
    headline: "Crawlable by AI, then optimized for it",
    subhead:
      `The Seobot study measures how search engines and AI crawlers see ${fmt(f.crawled)} top sites — and the free check shows which technical issues keep your pages from being read, cited, and clicked.`,
    primary: { label: "Run a free SEO check", href: "/seo-check" },
    secondary: { label: "Browse the glossary", href: "/glossary" },
  },
};
