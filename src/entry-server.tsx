import { prerender } from "react-dom/static";
import { App } from "@/App";

/**
 * Build-time render of one route to an HTML string (react-dom/static waits for
 * Suspense, so lazy views resolve). Consumed by `scripts/prerender.mjs`.
 */
export async function render(path: string): Promise<string> {
  const { prelude } = await prerender(<App path={path} />);
  return new Response(prelude).text();
}

export { routes } from "@/routes";
export { companyDomains, companyPath } from "@/content/companies";
