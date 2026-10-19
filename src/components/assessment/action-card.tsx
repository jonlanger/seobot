import { ExternalLink } from "lucide-react";
import { Badge, buttonVariants, Card, CardContent } from "@/components/ui";
import { effortDescriptions, effortLabels, resolveQuestionLink } from "@/content/seo-check";
import type { AssessmentQuestion } from "@/content/seo-check";
import type { AssessmentFinding } from "@/lib/audit";
import { cn } from "@/lib/cn";

const impactLabel = (severity: number) =>
  severity >= 4 ? "High impact" : severity >= 3 ? "Medium impact" : "Low impact";

export interface ActionCardProps {
  question: AssessmentQuestion;
  finding: AssessmentFinding;
  /** Visitor's URL — used only to build deep links; never fetched. */
  siteUrl: string;
  className?: string;
}

/** One prioritized task: why it matters, the steps, and a one-click check. */
export function ActionCard({ question, finding, siteUrl, className }: ActionCardProps) {
  const link = resolveQuestionLink(question.link, siteUrl);
  const steps = finding.kind === "fix" ? question.fix : question.verify;

  return (
    <Card
      data-slot="action-card"
      className={cn("gap-4 py-5", finding.kind === "verify" && "border-dashed bg-muted/40", className)}
    >
      <CardContent className="grid gap-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={finding.kind === "fix" ? "warning" : "info"} size="sm" dot>
            {finding.kind === "fix" ? "Fix" : "Verify"}
          </Badge>
          <Badge variant="outline" size="sm">
            {impactLabel(finding.severity)}
          </Badge>
          <Badge variant="neutral" size="sm" title={effortDescriptions[finding.effort]}>
            {effortLabels[finding.effort]}
          </Badge>
        </div>

        <div className="grid gap-1.5">
          <h4 className="text-balance text-base font-semibold leading-snug tracking-tight">
            {question.action}
          </h4>
          <p className="text-sm leading-relaxed text-muted-foreground">{question.why}</p>
        </div>

        <ol className="grid list-decimal gap-1.5 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-muted-foreground/70">
          {steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>

        {link && (
          <div>
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              {link.label}
              <ExternalLink className="size-3.5" />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
