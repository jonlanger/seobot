import { SegmentBar } from "@/components/ui";
import type { SegmentTone } from "@/components/ui";
import { crawlerGroups, topSitesStudy, verdictMeta } from "@/content/top-sites";
import type { RobotsVerdict } from "@/content/top-sites";

/** Worst → best, so every row reads the same direction. */
const VERDICT_ORDER: RobotsVerdict[] = ["block", "partial", "allow", "unset"];

const verdictTones: Record<RobotsVerdict, SegmentTone> = {
  block: "danger",
  partial: "warning",
  allow: "success",
  unset: "muted",
};

const dotClasses: Record<RobotsVerdict, string> = {
  block: "bg-destructive",
  partial: "bg-warning",
  allow: "bg-success",
  unset: "bg-muted-foreground/40",
};

/**
 * robots.txt verdicts per crawler token — one parts-of-a-whole bar per token,
 * grouped by what the crawler actually does (AI retrieval, training, classic
 * search). Counts are carried in text next to every bar, never color-only.
 */
export function CrawlerPolicyList() {
  const tokens = topSitesStudy.summary.robots.tokens;
  const total = topSitesStudy.summary.robots.sitesWithRobots;

  return (
    <div className="grid gap-8">
      {crawlerGroups.map((group) => (
        <section key={group.id} className="grid gap-4">
          <div className="grid gap-1">
            <h3 className="text-sm font-medium">{group.label}</h3>
            <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
              {group.blurb}
            </p>
          </div>

          <ul className="grid gap-3.5">
            {group.tokens.map((token) => {
              const stats = tokens[token];
              if (!stats) return null;
              const items = VERDICT_ORDER.map((verdict) => ({
                id: verdict,
                label: verdictMeta[verdict].label,
                value: stats[verdict],
                tone: verdictTones[verdict],
              }));
              return (
                <li
                  key={token}
                  className="grid items-center gap-x-4 gap-y-2 sm:grid-cols-[9.5rem_minmax(0,1fr)_auto]"
                >
                  <span className="truncate font-mono text-xs font-medium">{token}</span>
                  <SegmentBar items={items} total={total} legend={false} size="sm" />
                  <span className="numeric flex items-center gap-3 font-mono text-xs text-muted-foreground">
                    {VERDICT_ORDER.map((verdict) => (
                      <span key={verdict} className="flex items-center gap-1.5">
                        <span aria-hidden className={`size-2 rounded-full ${dotClasses[verdict]}`} />
                        {stats[verdict]}
                      </span>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Shared legend for the policy bars — order matches the rows. */
export function CrawlerPolicyLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {VERDICT_ORDER.map((verdict) => (
        <li key={verdict} className="flex items-center gap-1.5" title={verdictMeta[verdict].description}>
          <span aria-hidden className={`size-2 rounded-full ${dotClasses[verdict]}`} />
          {verdictMeta[verdict].label}
        </li>
      ))}
      <li className="text-muted-foreground/80">— per crawler token, across sites with a parsable robots.txt</li>
    </ul>
  );
}
