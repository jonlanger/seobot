/**
 * SEO Check — `/seo-check` (docs/seo-check.md)
 *
 * The on-site, client-side assessment: question catalog + page copy + deep
 * link builders. Everything runs in the visitor's browser; nothing is
 * uploaded and no URL is ever fetched. The URL is used to personalize the
 * report and to prefill verification links to Google's own tools.
 *
 * Rules that keep this production-grade:
 * - Every question IS a rule: its `id` is shared with the automated engine's
 *   catalog (docs/audit-engine.md §6), so P1 reuses the same scoring + report.
 * - `fix` / `verify` copy is user-facing — write it like product copy, not notes.
 * - No invented benchmarks. Severity is the honest, qualitative impact input.
 * - Keep `npm run check:seo-check` green (uniqueness, copy completeness,
 *   coverage, weight sums, scoring smoke tests, link resolution).
 */
import type {
  AssessableQuestion,
  Answer,
  Confidence,
  Effort,
  PriorityBand,
  SiteType,
} from "@/lib/audit";
import { fmt, studyFacts as f } from "./study-facts";
import { breadcrumbListSchema } from "./schema";
import type { Cta, Hero, PageSeo } from "./types";

/* ------------------------------- Types ---------------------------------- */

export type AssessmentLink =
  | { kind: "tool"; label: string; href: string }
  /** A path on the visitor's own site (e.g. /robots.txt). */
  | { kind: "site"; label: string; path: string }
  /** Prefilled Google `site:` search for the visitor's domain. */
  | { kind: "search"; label: string }
  /** Prefilled PageSpeed Insights analysis for the visitor's site. */
  | { kind: "pageSpeed"; label: string };

export interface AssessmentQuestion extends AssessableQuestion {
  /** The question as asked, one per screen. Second person, plain English. */
  prompt: string;
  /** One line: why this matters. Shown under the question. */
  why: string;
  /** Imperative title used on the report's action card. */
  action: string;
  /** Fix steps when answered "no". 2–3 steps. */
  fix: string[];
  /** Verify steps when answered "not sure". 1–2 steps. */
  verify: string[];
  /** Optional one-click check, deep-linked with the visitor's URL. */
  link?: AssessmentLink;
  /** Restrict to site types (omitted = everyone). */
  siteTypes?: SiteType[];
}

/* ------------------------------ Page meta -------------------------------- */

export const seoCheckPage: PageSeo = {
  title: "Free SEO Check — Score your site in 2 minutes | Seobot",
  description:
    "Answer about 15 questions for a prioritized SEO plan covering Google and AI search: what's broken, what to fix first, how to verify. Nothing is uploaded.",
  path: "/seo-check",
  robots: "index, follow",
  jsonLd: [
    breadcrumbListSchema([
      { label: "Home", href: "/" },
      { label: "SEO Check", href: "/seo-check" },
    ]),
  ],
};

export const seoCheckHero: Hero = {
  eyebrow: "Free tool",
  headline: "Score your site's SEO in two minutes",
  subhead:
    "Answer about 15 plain-English questions. Get a prioritized plan for Google and AI search: what's broken, what to fix first, and how to check each fix.",
  note: "No signup · Runs entirely in your browser · Nothing is uploaded",
};

export const seoCheckCta: Cta = {
  headline: "Want the evidence behind your score?",
  subhead:
    `The Seobot study of ${fmt(f.crawled)} top sites shows how Google and AI crawlers read real sites, so you can compare your fixes against what the biggest sites get right and wrong.`,
  // TODO(launch): swap for the signup flow (/signup) when auth lands.
  primary: { label: "Explore the research", href: "/dashboard" },
  secondary: { label: "See how it works", href: "/#how-it-works" },
  note: "No signup required to explore",
};

/* ---------------------------- Display copy -------------------------------- */

export const siteTypes: { id: SiteType; label: string; description: string }[] = [
  {
    id: "saas",
    label: "SaaS product",
    description: "Software or subscription product with a marketing site",
  },
  { id: "ecommerce", label: "E-commerce store", description: "Sells products online" },
  { id: "local", label: "Local business", description: "Serves customers in a city or region" },
  { id: "publisher", label: "Publisher or blog", description: "Publishes content for an audience" },
  { id: "other", label: "Something else", description: "Agency, docs, community, and so on" },
];

export const answerOptions: { id: Answer; label: string; description: string }[] = [
  { id: "yes", label: "Yes", description: "Confident — this is handled." },
  { id: "unsure", label: "Not sure", description: "I don't know off-hand." },
  { id: "no", label: "No", description: "I know this is a gap." },
];

export const effortLabels: Record<Effort, string> = {
  quick: "Quick fix",
  moderate: "Half-day",
  involved: "Project",
};

export const effortDescriptions: Record<Effort, string> = {
  quick: "Under an hour",
  moderate: "About half a day",
  involved: "Ongoing effort",
};

export const priorityBands: { id: PriorityBand; label: string; description: string }[] = [
  { id: "now", label: "Fix now", description: "High impact and usually quick — start at the top." },
  { id: "month", label: "This month", description: "Solid wins once the blockers above are cleared." },
  { id: "later", label: "Later", description: "Compounding work — valuable, but not urgent." },
];

export const confidenceCopy: Record<Confidence, string> = {
  high: "High confidence — nearly every answer was a firm yes or no.",
  medium:
    "Medium confidence — some answers were “not sure”. Run the verify tasks first; the score may move once you know.",
  low: "Low confidence — many answers were “not sure”. Treat this as a to-check list before a score.",
};

export function verdictFor(score: number): string {
  if (score >= 80) return "Strong foundation. The wins below are how you compound an advantage.";
  if (score >= 60) return "Solid, with clear gaps. The list below is the shortest path forward.";
  if (score >= 40) return "You're leaving obvious wins on the table. Start at the top of the list.";
  return "Big, fixable gaps. Work top to bottom — the first few fixes move the score fast.";
}

/* ------------------------------ Deep links -------------------------------- */

const linkGsc: AssessmentLink = {
  kind: "tool",
  label: "Open Search Console",
  href: "https://search.google.com/search-console",
};
const linkRobots: AssessmentLink = { kind: "site", label: "View robots.txt", path: "/robots.txt" };
const linkSiteSearch: AssessmentLink = { kind: "search", label: "Run the site: check" };
const linkPageSpeed: AssessmentLink = {
  kind: "pageSpeed",
  label: "Run the mobile speed test",
};
const linkRichResults: AssessmentLink = {
  kind: "tool",
  label: "Open the Rich Results Test",
  href: "https://search.google.com/test/rich-results",
};
const linkGbp: AssessmentLink = {
  kind: "tool",
  label: "Open Google Business Profile",
  href: "https://business.google.com",
};

/* ------------------------------- Catalog ---------------------------------- */

const core: AssessmentQuestion[] = [
  /* Layer 0 — setup & measurement */
  {
    id: "setup.gsc",
    category: "setup",
    severity: 4,
    effort: "quick",
    prompt: "Is your site verified in Google Search Console, with a sitemap submitted?",
    why: "Search Console is Google's own report card: the queries you appear for, the pages it has indexed, and every error it found. A submitted sitemap gets new pages discovered faster.",
    action: "Verify Search Console and submit a sitemap",
    fix: [
      "Create a property at Search Console and verify ownership — the DNS record method covers every subdomain and protocol.",
      "Open /sitemap.xml (most platforms generate one), add a Sitemap: line to robots.txt, and submit it under Sitemaps.",
      "Wait a day or two, then open the Pages and Performance reports to see what Google knows about your site.",
    ],
    verify: [
      "Sign in to Search Console: is your domain a verified property, with a sitemap listed under Sitemaps?",
    ],
    link: linkGsc,
  },
  {
    id: "setup.analytics",
    category: "setup",
    severity: 3,
    effort: "quick",
    prompt: "Is organic traffic tracked in analytics, and do you review it at least monthly?",
    why: "If organic traffic isn't measured, you can't tell which fixes worked. A ten-minute install and a monthly look at top pages and biggest movers make every later decision cheaper.",
    action: "Track organic traffic and review it monthly",
    fix: [
      "Install GA4 — or a lighter alternative like Plausible — on every page, and connect Search Console so queries and conversions line up.",
      "Watch chatgpt.com and perplexity.ai as referral sources to see AI traffic as it grows.",
      "Block 30 minutes a month for top pages and biggest movers, and turn on alerts so sudden drops find you.",
    ],
    verify: [
      "Open your analytics tool: does it record organic sessions, and did you look at it in the last 30 days?",
    ],
  },

  /* Layers 1–2 — crawlability, access & indexability */
  {
    id: "idx.robots",
    category: "indexability",
    severity: 5,
    effort: "quick",
    prompt: "Is your robots.txt free of rules blocking pages you want indexed?",
    why: "An accidental Disallow is the most common way a site silently disappears from Google. It only takes one line.",
    action: "Clear blocking rules from robots.txt",
    fix: [
      "Open /robots.txt and read it top to bottom.",
      "Delete Disallow: / or any rules covering pages you want indexed — use noindex tags instead when hiding a specific page.",
      "Re-check the Pages report in Search Console after a few days to confirm recovery.",
    ],
    verify: [
      "Open /robots.txt and scan for Disallow: lines — especially a bare Disallow: / or rules covering whole sections.",
    ],
    link: linkRobots,
  },
  {
    id: "idx.noindex",
    category: "indexability",
    severity: 5,
    effort: "quick",
    prompt: "Do your key pages show up in Google, and are they free of noindex tags?",
    why: "A noindex tag or header quietly removes a page from results — a staging setting copied to production is the usual culprit. One site: search shows what Google has actually indexed.",
    action: "Get key pages indexed and remove stray noindex",
    fix: [
      "Run the site: check and list which important pages are missing.",
      "For each, view the page source and search for noindex; remove the tag or server header from the template, and check staging-to-production copies and CMS defaults.",
      "Request indexing in Search Console's URL Inspection tool, and link to pages that stay missing from your navigation.",
    ],
    verify: [
      "Run the site: check below and compare the results with the pages that matter most. Then view source on your most important page and search for noindex.",
    ],
    link: linkSiteSearch,
  },
  {
    id: "idx.js-gated-content",
    category: "indexability",
    severity: 5,
    effort: "involved",
    prompt: "With JavaScript turned off, does your main content still appear?",
    why: `None of the major AI crawlers run JavaScript, so text added by scripts doesn't exist for them. In the Seobot study of ${fmt(f.crawled)} top sites, ${f.unreadableShare}% were unreadable to a non-rendering client, and the median readable homepage kept ${Math.round(f.coverage.median)}% of its content in plain HTML.`,
    action: "Serve your main content as plain HTML",
    fix: [
      "Fetch your key pages without JavaScript (view source, or curl the URL) and search for your headline, first paragraph, and pricing.",
      "Move headings, body copy, and navigation links into server-rendered or pre-rendered HTML — server rendering, static generation, or a prerender service.",
      "Keep client-side scripts for interaction only, then re-test.",
    ],
    verify: [
      "View source on your homepage (not Inspect) and search for your main headline. If the text isn't there, AI crawlers can't see it.",
    ],
  },
  {
    id: "idx.bot-walls",
    category: "indexability",
    severity: 5,
    effort: "moderate",
    prompt: "Does your site respond normally to bots — no firewall, CDN, or bot-protection block?",
    why: `robots.txt can say yes while your server says no. In the Seobot study, ${f.walledShare}% of ${fmt(f.crawled)} top sites returned a wall or an empty page to a non-browser client — and ${fmt(f.invitedButBarricaded)} of those had a robots.txt that welcomes AI search crawlers.`,
    action: "Let search and AI crawlers through your firewall",
    fix: [
      "Test the response a crawler gets: curl -I -A \"GPTBot\" https://yoursite.com should return 200, not 403, 429, or a challenge page.",
      "Review bot rules in your CDN or firewall — managed bot protection, rate limits, challenge pages — and allow the search crawlers you want, verified by IP.",
      "Re-test each crawler's user agent after every change.",
    ],
    verify: [
      "Run curl -I -A \"GPTBot\" https://yoursite.com in a terminal. A 200 is good; anything else means crawlers are walled out. No terminal? Ask whoever manages your CDN or firewall.",
    ],
  },
  {
    id: "geo.ai-crawlers",
    category: "geo",
    severity: 4,
    effort: "quick",
    prompt: "Does robots.txt let AI search crawlers in (OAI-SearchBot, PerplexityBot, Claude-SearchBot)?",
    why: `Blocking a retrieval crawler removes you from that engine's answers. Across ${fmt(f.crawled)} top sites, ${fmt(f.blocks.GPTBot.n)} of ${fmt(f.robotsFiles)} parsable robots.txt files hard-block GPTBot and ${fmt(f.blocks.ClaudeBot.n)} block ClaudeBot — while only ${fmt(f.blocks.Googlebot.n)} block Googlebot.`,
    action: "Unblock AI search crawlers in robots.txt",
    fix: [
      "Open /robots.txt and look for rules naming GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot, or Claude-SearchBot — and for User-agent: * rules that catch them all.",
      "Allow the search-side crawlers. Training crawlers (GPTBot, ClaudeBot, CCBot) are a separate policy choice — blocking one crawler doesn't block the others.",
      "Google-Extended does not affect Search. Changes reach ChatGPT search in about a day.",
    ],
    verify: [
      "Open /robots.txt and search for “Bot” — are there Disallow rules that lump every crawler together?",
    ],
    link: linkRobots,
  },

  /* Layer 3 — on-page & content */
  {
    id: "onp.titles",
    category: "content",
    severity: 4,
    effort: "quick",
    prompt: "Do your important pages have unique titles and descriptions written for searchers?",
    why: "Titles are the search result itself — they decide clicks and teach Google what the page is about. Duplicated or auto-generated titles waste both jobs.",
    action: "Rewrite titles and descriptions",
    fix: [
      "List your ten most important pages and their current titles.",
      "Rewrite each to front-load what the searcher gets: under 60 characters for the title, under 160 for the description, written like an ad.",
    ],
    verify: ["Google one of your pages. Does the title read like a message to a searcher — or like a template artifact?"],
  },
  {
    id: "cnt.dedicated-pages",
    category: "content",
    severity: 4,
    effort: "moderate",
    prompt: "Does each key topic have its own page, aimed at one target query?",
    why: "One page chasing five topics ranks for none of them well. Search engines and AI answers both reward pages that own a single subject.",
    action: "Give each key topic its own page",
    fix: [
      "Split multi-topic pages into one page per topic — each with its own title, URL, and content.",
      "Keep a one-page map: topic, target query, owning URL. A new keyword usually means a new page, not a line added to an old one.",
      "Fold thin pages into fuller ones instead of leaving two pages to compete for the same queries.",
    ],
    verify: [
      "Pick any key page: can you name the one query it should rank for? Does anything in your navigation lump several topics together?",
    ],
  },
  {
    id: "cnt.qa-coverage",
    category: "content",
    severity: 3,
    effort: "moderate",
    prompt: "Do your key pages answer the question up front, with specific numbers and sources?",
    why: "Engines quote the first passage that answers “what is this?” In Princeton's GEO study, adding statistics and quotations were the strongest levers tested, and keyword stuffing was the only tactic that hurt.",
    action: "Rewrite key pages answer-first",
    fix: [
      "Open each key page with a two- or three-sentence plain answer that names the product or topic.",
      "Replace adjectives with figures, dates, and cited sources — and refresh any stat older than a year.",
      "Add a short FAQ of three to six real buyer questions. If you add FAQ markup, keep every word identical to the visible text.",
    ],
    verify: ["Read the first two sentences of your top page. Would they stand alone as an answer to “what is this?”"],
  },
  {
    id: "cnt.comparison-pages",
    category: "content",
    severity: 3,
    effort: "moderate",
    siteTypes: ["saas"],
    prompt: "Do you have comparison or alternative pages (yours vs. others)?",
    why: "Comparison queries sit at the bottom of the funnel — buyers search them days before talking to sales, and AI engines quote comparison content heavily.",
    action: "Publish comparison pages",
    fix: [
      "Pick the three competitors you're asked about most.",
      "Write honest /vs/ pages with a comparison table: the differences, who each option suits, and where you genuinely win.",
      "Keep claims factual and dated — fairness earns trust and citations.",
    ],
    verify: ["Search your brand versus a competitor. Does a page of yours show up — or only theirs?"],
  },

  /* Layer 4 — authority */
  {
    id: "aut.link-earning",
    category: "authority",
    severity: 3,
    effort: "involved",
    prompt: "Do you know who links to you, and are you actively earning more links?",
    why: "Backlinks remain the clearest authority signal, and links don't happen on their own. The sites that rank for competitive terms run some deliberate, repeatable link habit.",
    action: "Start a simple link-earning habit",
    fix: [
      "Open Search Console → Links to see who links to you today; a backlink tool's free tier gives a deeper view.",
      "Pick one channel: partner mentions, digital PR on data you already have, or a free tool others cite.",
      "Make it quarterly-repeatable before you make it bigger.",
    ],
    verify: [
      "Open Search Console's Links report (free). How many links did you earn in the last six months? Zero means there's no engine yet — only luck.",
    ],
  },

  /* Layer 5 — experience & speed */
  {
    id: "prf.cwv",
    category: "experience",
    severity: 4,
    effort: "moderate",
    prompt: "Does your site pass Core Web Vitals and feel quick and usable on a phone?",
    why: "Google measures how real phones experience your site — speed, responsiveness, layout stability. Failing doesn't just nick rankings; it costs conversions.",
    action: "Fix Core Web Vitals on mobile",
    fix: [
      "Run the test below on your homepage and your most important page.",
      "Fix the biggest failing metric first: LCP → image weight and hosting; INP → heavy scripts; CLS → reserving space for embeds.",
      "Then use the site on a real phone — tap the main actions, read a page, submit a form — and fix the worst offender. Re-test after each change.",
    ],
    verify: ["Run the mobile test below. If you haven't run it in six months, assume it fails."],
    link: linkPageSpeed,
  },

  /* Layer 6 — AI visibility */
  {
    id: "geo.brand-answers",
    category: "geo",
    severity: 3,
    effort: "moderate",
    prompt: "Does your brand come up when people ask AI engines about your category?",
    why: "Most AI citations point at third-party sources — Reddit, YouTube, Wikipedia, review sites, and roundups. If you're not mentioned there, your competitors are.",
    action: "Check how AI engines describe your category",
    fix: [
      "Ask two or three AI engines the question your buyers would ask (“best X for Y”).",
      "If you're absent: strengthen the pages that get quoted — comparisons, clear definitions, sourced stats — and get listed in the third-party roundups that dominate answers.",
    ],
    verify: [
      "Run one real buyer question through ChatGPT and Perplexity. Note whether you're mentioned, cited, or absent.",
    ],
  },

  /* Trust & hygiene */
  {
    id: "trs.pages",
    category: "trust",
    severity: 2,
    effort: "quick",
    prompt: "Do About, Contact, and Privacy pages exist and work?",
    why: "These are trust artifacts — for visitors deciding whether to buy, and for the quality signals search engines check to see who stands behind a site.",
    action: "Publish the trust pages",
    fix: [
      "Create About (who's behind this and why), Contact (a reachable channel), and Privacy (what you collect).",
      "Link all three from the footer on every page.",
    ],
    verify: ["Check your footer: can you reach all three pages in one click?"],
  },
];

/** One branch question per site type — the highest-impact check for that kind of site. */
const branchPacks: AssessmentQuestion[] = [
  /* E-commerce */
  {
    id: "ecom.product-schema",
    category: "content",
    severity: 3,
    effort: "quick",
    siteTypes: ["ecommerce"],
    prompt: "Do your product pages use Product structured data?",
    why: "Product markup powers price, availability, and review rich results — free visibility that plain HTML simply doesn't get.",
    action: "Add Product structured data",
    fix: [
      "Test a product page in Google's Rich Results Test.",
      "Implement Product + Offer schema — most platforms have a plugin or built-in setting — in the server-rendered HTML, with values identical to the page.",
    ],
    verify: ["Test one product URL. Does Product appear without errors?"],
    link: linkRichResults,
  },
  /* Local */
  {
    id: "lcl.gbp",
    category: "content",
    severity: 4,
    effort: "quick",
    siteTypes: ["local"],
    prompt: "Is your Google Business Profile claimed and complete?",
    why: "For local searches, the map pack outranks everything — and the profile is your storefront inside it.",
    action: "Complete your Google Business Profile",
    fix: [
      "Claim your profile at business.google.com.",
      "Fill everything: hours, services, photos, attributes — and keep your name, address, and phone identical everywhere else online.",
    ],
    verify: ["Search your business name: is the profile claimed, with current hours and photos?"],
    link: linkGbp,
  },
  /* Publisher */
  {
    id: "pub.authors",
    category: "content",
    severity: 3,
    effort: "moderate",
    siteTypes: ["publisher"],
    prompt: "Do your articles show a real author with credentials?",
    why: "Google's quality guidance leans on experience and expertise — anonymous articles read as commodity content to people, search engines, and AI answers alike.",
    action: "Add author identity to articles",
    fix: [
      "Give every article a byline linked to a bio page: role, background, and what that person has actually done.",
      "Keep bios specific — “Content Team” is not an author.",
    ],
    verify: ["Open three recent posts: is there a named author with a linked bio?"],
  },
];

export const seoCheckQuestions: AssessmentQuestion[] = [...core, ...branchPacks];

/** Questions shown for a given site type, in quiz order. */
export function questionsForSiteType(siteType: SiteType): AssessmentQuestion[] {
  return seoCheckQuestions.filter(
    (question) => !question.siteTypes || question.siteTypes.includes(siteType),
  );
}

/* --------------------------- Link resolution ------------------------------ */

/** Parse a visitor-entered URL into a usable origin + host. Tolerant of bare domains. */
export function parseSiteUrl(input: string | null | undefined): { origin: string; host: string } | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".")) return null;
    return { origin: url.origin, host: url.hostname };
  } catch {
    return null;
  }
}

export interface ResolvedLink {
  href: string;
  label: string;
  external: boolean;
}

/**
 * Resolve a question link for display. Returns null when the link needs a
 * site URL the visitor hasn't provided (or provided badly) — callers hide
 * the button rather than showing a dead one.
 */
export function resolveQuestionLink(
  link: AssessmentLink | undefined,
  siteUrl: string | null | undefined,
): ResolvedLink | null {
  if (!link) return null;
  if (link.kind === "tool") {
    return link.href ? { href: link.href, label: link.label, external: true } : null;
  }

  const site = parseSiteUrl(siteUrl);
  if (link.kind === "search") {
    if (!site) return null;
    return {
      href: `https://www.google.com/search?q=${encodeURIComponent(`site:${site.host}`)}`,
      label: link.label,
      external: true,
    };
  }
  if (link.kind === "pageSpeed") {
    if (!site) return null;
    return {
      href: `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(site.origin)}&form_factor=mobile`,
      label: link.label,
      external: true,
    };
  }
  // kind === "site"
  if (!site || !link.path) return null;
  return { href: `${site.origin}${link.path}`, label: link.label, external: true };
}
