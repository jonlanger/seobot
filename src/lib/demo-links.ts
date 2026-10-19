/**
 * Formerly the `?view=` demo-router bridge. Real path routes now exist
 * (`src/routes.ts`), so content hrefs resolve as-is. Kept as a pass-through so
 * call sites don't churn; delete with the next component sweep.
 */
export function demoHref(href: string): string {
  return href;
}
