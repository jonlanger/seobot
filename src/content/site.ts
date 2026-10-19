/**
 * Sitewide constants used by content modules and JSON-LD builders.
 *
 * TODO(launch): replace the placeholder url with the production domain before
 * deploy — the support email in home-page copy suggests seobot.io; confirm.
 * A wrong canonical/JSON-LD origin is worse than an obvious placeholder.
 */
export interface SiteConfig {
  name: string;
  /** TODO(launch): verify the legal entity name. */
  legalName: string;
  url: string;
  /** Path to the square logo used in Organization schema. */
  logoPath: string;
  supportEmail: string;
  /** TODO(launch): LinkedIn, X, GitHub, Crunchbase, G2/Capterra — the sameAs chain. */
  sameAs: string[];
  /** Canonical category noun — locked ("SEO platform"); see content-models.md §15. */
  category: string;
}

export const site: SiteConfig = {
  name: "Seobot",
  legalName: "Seobot, Inc.",
  url: "https://seobot.example",
  logoPath: "/favicon.svg",
  supportEmail: "support@seobot.io",
  sameAs: [],
  category: "SEO platform",
};
