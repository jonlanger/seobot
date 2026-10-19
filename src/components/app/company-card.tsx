import { Badge, Card, CardContent } from "@/components/ui";
import type { StudySite } from "@/content/top-sites";
import type { CompanyProfile } from "@/content/companies";
import { classificationMeta } from "@/content/top-sites";

export interface CompanyCardProps {
  site: StudySite;
  profile?: CompanyProfile | null;
  onClick?: () => void;
}

export function CompanyCard({ site, profile, onClick }: CompanyCardProps) {
  const meta = classificationMeta[site.classification];
  return (
    <button
      type="button"
      onClick={onClick}
      className="group block w-full text-left focus:outline-none"
    >
      <Card className="h-full gap-4 overflow-hidden py-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring">
        <div className="px-4 pt-4">
          {profile?.thumbnail ? (
            <img
              src={profile.thumbnail}
              alt={profile.title ?? site.domain}
              className="h-36 w-full rounded-lg object-cover"
              loading="lazy"
            />
          ) : (
            <div className="grid h-36 w-full place-items-center rounded-lg bg-muted text-muted-foreground">
              <span className="font-mono text-xs">{site.domain}</span>
            </div>
          )}
        </div>
        <CardContent className="grid gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-semibold">{profile?.title ?? site.domain}</h3>
            <Badge variant={meta.tone} size="sm" dot>
              {meta.label}
            </Badge>
          </div>
          <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
            {profile?.extract ?? "No company profile available."}
          </p>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span className="numeric font-mono">#{site.rank}</span>
            <span className="numeric font-mono">
              {site.coverage !== null ? `${site.coverage}% visible` : "n/a"}
            </span>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
