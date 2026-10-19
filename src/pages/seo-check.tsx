import { useMemo, useState } from "react";
import { ArrowRight, Globe, ShieldCheck } from "lucide-react";
import { QuestionStep, ReportView } from "@/components/assessment";
import { Footer, Navbar } from "@/components/marketing";
import { Seo } from "@/components/seo";
import {
  Button,
  Card,
  CardContent,
  Field,
  Input,
  Progress,
  Radio,
  RadioGroup,
} from "@/components/ui";
import { questionsForSiteType, seoCheckHero, seoCheckPage, siteTypes } from "@/content/seo-check";
import { scoreAssessment } from "@/lib/audit";
import type { Answer, SiteType } from "@/lib/audit";
import { cn } from "@/lib/cn";

type Phase = "basics" | "quiz" | "report";

const optionClassName =
  "w-full items-center rounded-xl border border-border bg-surface px-4 py-3.5 shadow-2xs transition-colors hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary-soft/40";

/**
 * SEO Check — `/seo-check` (docs/seo-check.md).
 *
 * Entirely client-side: answers in state, scoring from `@/lib/audit`. The URL
 * is never fetched — it personalizes copy and prefills deep links only.
 */
export function SeoCheckPage({
  onHome,
  onOpenDashboard,
  onSectionLink,
}: {
  onHome?: () => void;
  /** Demo hook: opens the research dashboard without a full reload. */
  onOpenDashboard?: () => void;
  /** Demo hook: resolves the navbar's landing-page anchors without a reload. */
  onSectionLink?: (href: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>("basics");
  const [siteUrl, setSiteUrl] = useState("");
  const [siteType, setSiteType] = useState<SiteType | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});

  const questions = useMemo(() => (siteType ? questionsForSiteType(siteType) : []), [siteType]);
  const question = questions[stepIndex];
  const answeredCount = questions.filter((item) => answers[item.id] !== undefined).length;

  const result = useMemo(
    () => (siteType ? scoreAssessment(questions, answers, siteType) : null),
    [questions, answers, siteType],
  );

  const start = () => {
    if (!siteType) return;
    setStepIndex(0);
    setPhase("quiz");
    window.scrollTo({ top: 0 });
  };

  const restart = () => {
    setAnswers({});
    setStepIndex(0);
    setPhase("basics");
    window.scrollTo({ top: 0 });
  };

  const advance = () => {
    if (!question || !answers[question.id]) return;
    if (stepIndex >= questions.length - 1) {
      setPhase("report");
    } else {
      setStepIndex((index) => index + 1);
    }
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-dvh bg-background">
      {/* Title, meta, canonical, and JSON-LD render with the page — prerender-safe. */}
      <Seo {...seoCheckPage} />
      {/* CTA hidden here (you're on the tool); the logo walks back to the landing page. */}
      <Navbar
        showCta={false}
        onHome={onHome}
        onOpenDashboard={onOpenDashboard}
        onSectionLink={onSectionLink}
      />
      <main className="pb-20 sm:pb-28">
        {phase === "basics" ? (
          <section className="scroll-mt-20 pb-12 pt-10 sm:pb-16 sm:pt-14">
            <div className="container">
              <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
                {seoCheckHero.eyebrow && (
                  <span className="text-sm font-semibold tracking-tight text-primary-soft-foreground">
                    {seoCheckHero.eyebrow}
                  </span>
                )}
                <h1 className="text-display-sm font-semibold tracking-tight text-balance">
                  {seoCheckHero.headline}
                </h1>
                <p className="text-pretty text-lg leading-relaxed text-muted-foreground">
                  {seoCheckHero.subhead}
                </p>
                <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <ShieldCheck className="size-4 text-primary" aria-hidden />
                  {seoCheckHero.note}
                </p>
              </div>
            </div>
          </section>
        ) : (
          <h1 className="sr-only">{seoCheckHero.headline}</h1>
        )}

        <div className={cn("container", phase !== "basics" && "pt-10 sm:pt-16")}>
          {phase === "basics" && (
            <div className="mx-auto max-w-2xl">
              <Card>
                <CardContent className="grid gap-8">
                  <Field
                    label="Your site"
                    hint="Optional — used to personalize this report and prefill verification links. It is never fetched or uploaded."
                  >
                    <Input
                      type="url"
                      inputMode="url"
                      autoComplete="url"
                      placeholder="https://yoursite.com"
                      leading={<Globe />}
                      value={siteUrl}
                      onChange={(event) => setSiteUrl(event.target.value)}
                    />
                  </Field>

                  <div className="grid gap-3">
                    <span className="text-sm font-medium">What kind of site is it?</span>
                    <RadioGroup>
                      {siteTypes.map((type) => (
                        <Radio
                          key={type.id}
                          name="site-type"
                          value={type.id}
                          checked={siteType === type.id}
                          onChange={() => setSiteType(type.id)}
                          label={type.label}
                          description={type.description}
                          className={optionClassName}
                        />
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="grid gap-3">
                    <Button size="lg" onClick={start} disabled={!siteType}>
                      Start the check
                      <ArrowRight className="size-4" />
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      {siteType
                        ? `${questionsForSiteType(siteType).length} questions · about 2 minutes`
                        : "Choose a site type to begin · about 2 minutes"}{" "}
                      · No signup required
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {phase === "quiz" && question && (
            <div className="grid gap-8">
              <div className="mx-auto w-full max-w-2xl">
                <Progress
                  value={answeredCount}
                  max={questions.length}
                  aria-label="Questions answered"
                />
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>Questions</span>
                  <span className="numeric font-mono">
                    {answeredCount} of {questions.length} answered
                  </span>
                </div>
              </div>
              <QuestionStep
                key={question.id}
                question={question}
                value={answers[question.id]}
                index={stepIndex}
                total={questions.length}
                isFirst={stepIndex === 0}
                isLast={stepIndex === questions.length - 1}
                onAnswer={(answer) =>
                  setAnswers((current) => ({ ...current, [question.id]: answer }))
                }
                onBack={() => {
                  setStepIndex((index) => Math.max(0, index - 1));
                  window.scrollTo({ top: 0 });
                }}
                onNext={advance}
              />
            </div>
          )}

          {phase === "report" && result && siteType && (
            <ReportView result={result} siteType={siteType} siteUrl={siteUrl} onRestart={restart} />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
