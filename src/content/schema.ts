/**
 * JSON-LD builders.
 *
 * Keep schema construction in one place so values always match visible copy
 * (a Google requirement for rich results) and builders stay testable.
 * Validate changes against the Rich Results Test before shipping.
 */
import { site } from "./site";
import type { Crumb, FaqItem, JsonLd, SourceRef } from "./types";

/** Absolute URL for a path — pages pass paths, schema needs full URLs. */
export function absoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${site.url}${path}`;
}

/** Organization identity — render sitewide for entity disambiguation. */
export function organizationSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    legalName: site.legalName,
    url: site.url,
    logo: `${site.url}${site.logoPath}`,
    ...(site.sameAs.length > 0 ? { sameAs: site.sameAs } : {}),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: site.supportEmail,
    },
  };
}

export function websiteSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.url,
  };
}

/**
 * SoftwareApplication markup for the product.
 *
 * `offers.price` may be 0 when a free tier exists; describe paid pricing in
 * `offer.description` so AI answers pull accurate numbers.
 */
export function softwareApplicationSchema(options: {
  description: string;
  offer: { price: number; priceCurrency?: string; description?: string };
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: site.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: options.description,
    offers: {
      "@type": "Offer",
      price: options.offer.price,
      priceCurrency: options.offer.priceCurrency ?? "USD",
      ...(options.offer.description
        ? { description: options.offer.description }
        : {}),
    },
  };
}

/**
 * FAQPage markup. Always pass the page's rendered FAQ items — the schema text
 * must be byte-identical to the visible answers.
 */
export function faqPageSchema(items: FaqItem[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

/** Breadcrumb trails must match the page's real navigation hierarchy. */
export function breadcrumbListSchema(crumbs: Crumb[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      item: absoluteUrl(crumb.href),
    })),
  };
}

/** DefinedTerm markup for glossary pages — entity-clean, no rich result. */
export function definedTermSchema(options: {
  name: string;
  description: string;
  path: string;
  setPath: string;
  setLabel: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: options.name,
    description: options.description,
    url: absoluteUrl(options.path),
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: options.setLabel,
      url: absoluteUrl(options.setPath),
    },
  };
}

/** TechArticle markup for reference/editorial pages. Citations use the page's source list. */
export function techArticleSchema(options: {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified: string;
  citations?: SourceRef[];
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: options.headline,
    description: options.description,
    url: absoluteUrl(options.path),
    datePublished: options.datePublished,
    dateModified: options.dateModified,
    author: { "@type": "Organization", name: site.name, url: site.url },
    publisher: { "@type": "Organization", name: site.name, url: site.url },
    ...(options.citations && options.citations.length > 0
      ? {
          citation: options.citations.map((source) => ({
            "@type": "CreativeWork",
            name: source.label,
            url: source.url,
          })),
        }
      : {}),
  };
}
