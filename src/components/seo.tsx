import { absoluteUrl } from "@/content/schema";
import { site } from "@/content/site";
import type { PageSeo } from "@/content/types";

/**
 * Page-level metadata + JSON-LD (`docs/seo-research.md` §2.2).
 *
 * React 19 hoists <title>, <meta>, and <link> into <head> at render time —
 * not in an effect — so the prerender pipeline (and the browser) sees them
 * without any client JS. JSON-LD scripts render with the page markup; the
 * values must match the visible copy exactly (they come from the same
 * content module, so they can't drift).
 */
export function Seo({ title, description, path, robots, ogImage, jsonLd }: PageSeo) {
  const url = absoluteUrl(path);

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots ?? "index, follow"} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={site.name} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      {ogImage ? <meta property="og:image" content={absoluteUrl(ogImage)} /> : null}

      <meta
        name="twitter:card"
        content={ogImage ? "summary_large_image" : "summary"}
      />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />

      {(jsonLd ?? []).map((document, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(document) }}
        />
      ))}
    </>
  );
}
