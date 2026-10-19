import { Button } from "@/components/ui";
import { CompanyDirectory } from "@/components/app";
import { topSitesStudy } from "@/content/top-sites";
import { companyProfileByDomain } from "@/content/companies";

export function CompaniesPage({
  onHome,
  onOpenDashboard,
  onOpenCompany,
}: {
  onHome?: () => void;
  onOpenDashboard?: () => void;
  onOpenCompany?: (domain: string) => void;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <button onClick={onHome} className="text-sm font-medium">
            Home
          </button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onOpenDashboard}>
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Company directory</h1>
        <CompanyDirectory
          sites={topSitesStudy.sites}
          counts={topSitesStudy.summary.counts}
          profileFor={(domain) => companyProfileByDomain.get(domain)}
          onOpenCompany={onOpenCompany}
        />
      </main>
    </div>
  );
}
