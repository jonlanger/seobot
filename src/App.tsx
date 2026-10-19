import { lazy, Suspense, useEffect, useState } from "react";
import { ToastProvider } from "@/components/ui";
import { ThemeProvider } from "@/lib/theme";
import { LandingPage } from "@/pages/landing";
import { SeoCheckPage } from "@/pages/seo-check";
import { NotFoundPage } from "@/pages/not-found";
import { locationFromPath, pathForView } from "@/routes";
import type { Location, View } from "@/routes";
// The /design/* reference pages are noindex and client-rendered. They pull in company cards and
// the study dataset, so they load on demand — never in the bundle the marketing pages ship.
const ComponentsPage = lazy(() =>
  import("@/pages/components").then((module) => ({ default: module.ComponentsPage })),
);
const FoundationsPage = lazy(() =>
  import("@/pages/foundations").then((module) => ({ default: module.FoundationsPage })),
);
const BrandPage = lazy(() => import("@/pages/brand").then((module) => ({ default: module.BrandPage })));
const CompanyPage = lazy(() =>
  import("@/pages/company").then((module) => ({ default: module.CompanyPage })),
);
const SemanticsStudyPage = lazy(() =>
  import("@/pages/semantics-study").then((module) => ({ default: module.SemanticsStudyPage })),
);

// The dashboard carries the full study dataset (~1 MB raw) — split
// it out so the marketing pages keep their lean JS budget (docs/seo-research.md §2.4).
const DashboardPage = lazy(() =>
  import("@/pages/dashboard").then((module) => ({ default: module.DashboardPage })),
);

function currentLocation(path?: string): Location {
  return locationFromPath(path ?? window.location.pathname);
}

/**
 * Scrolls to a section id, honoring the sticky navbar — every section carries
 * `scroll-mt-20`, which `scrollIntoView` respects like a native hash jump.
 */
function scrollToSection(id: string) {
  if (!id) return;
  document.getElementById(decodeURIComponent(id))?.scrollIntoView({ block: "start" });
}

/** `path` is only passed at build time (prerender); in the browser the URL decides. */
export function App({ path }: { path?: string }) {
  const [{ view, domain: companyDomain }, setLocation] = useState<Location>(() => currentLocation(path));

  // Fragment deep links (shared "/#features" URLs, refreshes, new tabs, the
  // SEO Check page's navbar without the harness) load before React mounts the
  // section, so the browser's own fragment scroll finds nothing and gives up.
  // Scroll ourselves once the view that owns the section is committed.
  useEffect(() => {
    if (view === "landing") scrollToSection(window.location.hash.slice(1));
  }, [view]);

  // Keep the view in sync with the URL so Back/Forward works across views
  // and intercepted section links.
  useEffect(() => {
    const sync = () => setLocation(currentLocation());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const navigate = (next: View, domain = "") => {
    setLocation({ view: next, domain });
    // Each view has one canonical URL — never carry a fragment across views.
    window.history.pushState(null, "", pathForView(next, domain));
    window.scrollTo({ top: 0 });
  };

  const handleOpenCompany = (domain: string) => navigate("company", domain);
  const handleSelect = (next: View) => navigate(next);

  /**
   * Demo hook for the navbar's in-page anchors ("/#features" …). Switches back
   * to the landing view without a reload, then lets the effect above scroll
   * once the section is mounted. Native on the landing page itself.
   */
  const handleSectionLink = (href: string) => {
    window.history.pushState(null, "", href);
    if (view === "landing") {
      scrollToSection(href.split("#")[1] ?? "");
    } else {
      setLocation({ view: "landing", domain: "" });
    }
  };

  return (
    <ThemeProvider>
      <ToastProvider>
        {view === "landing" && (
          <LandingPage
            onRunSeoCheck={() => handleSelect("seo-check")}
            onOpenDashboard={() => handleSelect("dashboard")}
          />
        )}
        {view === "dashboard" && (
          <Suspense
            fallback={
              <div className="grid min-h-dvh place-items-center bg-background text-sm text-muted-foreground">
                Loading the study…
              </div>
            }
          >
            <DashboardPage onHome={() => handleSelect("landing")} onOpenCompany={handleOpenCompany} />
          </Suspense>
        )}
        {view === "seo-check" && (
          <SeoCheckPage
            onHome={() => handleSelect("landing")}
            onOpenDashboard={() => handleSelect("dashboard")}
            onSectionLink={handleSectionLink}
          />
        )}
        {view === "not-found" && <NotFoundPage onHome={() => handleSelect("landing")} />}
        {(view === "components" || view === "foundations" || view === "brand") && (
          <Suspense
            fallback={
              <div className="grid min-h-dvh place-items-center bg-background text-sm text-muted-foreground">
                Loading…
              </div>
            }
          >
            {view === "components" && <ComponentsPage />}
            {view === "foundations" && <FoundationsPage />}
            {view === "brand" && <BrandPage />}
          </Suspense>
        )}
        {view === "company" && (
          <Suspense
            fallback={
              <div className="grid min-h-dvh place-items-center bg-background text-sm text-muted-foreground">
                Loading company…
              </div>
            }
          >
            <CompanyPage domain={companyDomain} onHome={() => handleSelect("landing")} onOpenDashboard={() => handleSelect("dashboard")} onOpenCompany={handleOpenCompany} onOpenSeoCheck={() => handleSelect("seo-check")} />
          </Suspense>
        )}
        {view === "semantics-study" && (
          <Suspense
            fallback={
              <div className="grid min-h-dvh place-items-center bg-background text-sm text-muted-foreground">
                Loading study…
              </div>
            }
          >
            <SemanticsStudyPage />
          </Suspense>
        )}

      </ToastProvider>
    </ThemeProvider>
  );
}
