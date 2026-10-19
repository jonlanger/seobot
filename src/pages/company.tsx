import {
  ArrowLeft,
  BarChart3,
  Braces,
  Building2,
  Grid3x3,
  Info,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Radar,
  SquaresIntersect,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  AppNavItem,
  AppSidebar,
  AppTopbar,
  Breadcrumbs,
} from "@/components/app";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo, LogoMark } from "@/components/logo";
import { CompanyDeepDive } from "@/components/app/company-deep-dive";
import { companyDeepDive, companySeo } from "@/content/companies";
import { Seo } from "@/components/seo";
import { topSitesStudy } from "@/content/top-sites";
import { cn } from "@/lib/cn";
import {
  Button,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui";

const studyDate = new Date(`${topSitesStudy.meta.runDate}T12:00:00Z`).toLocaleDateString("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export function CompanyPage({
  domain,
  onHome,
  onOpenDashboard,
  onOpenCompany,
  onOpenSeoCheck,
}: {
  domain: string;
  onHome?: () => void;
  onOpenDashboard?: () => void;
  onOpenCompany?: (domain: string) => void;
  onOpenSeoCheck?: () => void;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { site } = useMemo(() => companyDeepDive(domain), [domain]);

  if (!site) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background text-sm text-muted-foreground">
        No study data for {domain}.
      </div>
    );
  }

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Companies", href: "/companies" },
    { label: site.domain, href: `/company/${encodeURIComponent(site.domain)}` },
  ];

  const navSections = [
    {
      label: "Data visualizations",
      items: [
        { label: "Crawler × Vertical", icon: <Grid3x3 className="size-4" />, onClick: () => { onOpenDashboard?.(); } },
        { label: "Co-blocking Matrix", icon: <SquaresIntersect className="size-4" />, onClick: () => { onOpenDashboard?.(); } },
        { label: "Anti-Bot Radar", icon: <Radar className="size-4" />, onClick: () => { onOpenDashboard?.(); } },
        { label: "JSON-LD Flow", icon: <Braces className="size-4" />, onClick: () => { onOpenDashboard?.(); } },
        { label: "Raw vs Rendered", icon: <BarChart3 className="size-4" />, onClick: () => { onOpenDashboard?.(); } },
        { label: "Company Directory", icon: <Building2 className="size-4" />, active: true, onClick: () => { onOpenDashboard?.(); } },
        { label: "Info", icon: <Info className="size-4" />, onClick: () => { onOpenDashboard?.(); } },
      ],
    },
  ];

  const datasetFooter = sidebarCollapsed ? (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => onHome?.()}
      aria-label="Back to homepage"
    >
      <ArrowLeft />
    </Button>
  ) : (
    <div className="grid gap-3">
      <div className="grid gap-1 rounded-lg border border-border bg-background p-3">
        <span className="text-xs font-medium">Dataset</span>
        <span className="text-xs leading-relaxed text-muted-foreground">
          Tranco list <span className="font-mono">{topSitesStudy.meta.tranco.listId}</span> ·{" "}
          {topSitesStudy.sites.length} sites · crawled {studyDate} · {topSitesStudy.meta.license}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="justify-start"
        onClick={() => onHome?.()}
      >
        <ArrowLeft />
        Back to homepage
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-background">
      <Seo {...companySeo(domain)} />
      {/* Desktop sidebar */}
      <AppSidebar
        className="sticky top-0 hidden h-dvh lg:flex"
        collapsed={sidebarCollapsed}
        header={
          <a
            href="/"
            onClick={(event) => {
              if (!onHome) return;
              event.preventDefault();
              onHome();
            }}
            aria-label="Seobot home"
            className="rounded-lg focus-ring"
          >
            {sidebarCollapsed ? <LogoMark size="sm" /> : <Logo size="sm" />}
          </a>
        }
        sections={navSections}
        footer={datasetFooter}
      />

      {/* Mobile navigation */}
      <Dialog
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        className="w-[calc(100%-2rem)] max-w-sm"
      >
        <DialogHeader>
          <DialogTitle>Study navigation</DialogTitle>
          <DialogDescription>Jump to a section, or head back to the homepage.</DialogDescription>
        </DialogHeader>
        <nav className="grid gap-4">
          {navSections.map((section, index) => (
            <div key={section.label ?? index} className="grid gap-1">
              {section.label && (
                <div className="px-3 text-xs font-medium text-muted-foreground">
                  {section.label}
                </div>
              )}
              {section.items.map((item) => (
                <AppNavItem
                  key={item.label}
                  item={item}
                  onSelect={() => setMobileNavOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors [&_svg:not([class*='size-'])]:size-4.5",
                    item.active
                      ? "bg-primary-soft font-medium text-primary-soft-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                />
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-border pt-4">{datasetFooter}</div>
      </Dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar>
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileNavOpen(true)}
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-ring lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          <button
            type="button"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-ring lg:grid"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="size-5" />
            ) : (
              <PanelLeftClose className="size-5" />
            )}
          </button>

          <a
            href="/"
            onClick={(event) => {
              if (!onHome) return;
              event.preventDefault();
              onHome();
            }}
            aria-label="Seobot home"
            className="rounded-lg focus-ring lg:hidden"
          >
            <Logo size="sm" />
          </a>

          <div className="hidden text-sm text-muted-foreground lg:block">
            Company detail
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => onOpenDashboard?.()}>
              Dashboard
            </Button>
          </div>
        </AppTopbar>

        <main className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <Breadcrumbs items={breadcrumbs} />
          <CompanyDeepDive domain={domain} onOpenCompany={onOpenCompany} onOpenSeoCheck={onOpenSeoCheck} />
        </main>
      </div>
    </div>
  );
}