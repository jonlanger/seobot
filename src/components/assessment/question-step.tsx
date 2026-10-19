import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Badge, Button, Radio, RadioGroup } from "@/components/ui";
import { answerOptions } from "@/content/seo-check";
import type { AssessmentQuestion } from "@/content/seo-check";
import { CATEGORY_LABELS } from "@/lib/audit";
import type { Answer } from "@/lib/audit";

export interface QuestionStepProps {
  question: AssessmentQuestion;
  /** Selected answer for this question, if any. */
  value?: Answer;
  /** 0-based position in the quiz. */
  index: number;
  total: number;
  isFirst: boolean;
  isLast: boolean;
  onAnswer: (answer: Answer) => void;
  onBack: () => void;
  onNext: () => void;
}

/** One question per screen — radiogroup semantics, focus moved to the heading. */
export function QuestionStep({
  question,
  value,
  index,
  total,
  isFirst,
  isLast,
  onAnswer,
  onBack,
  onNext,
}: QuestionStepProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = `q-${question.id}-heading`;

  useEffect(() => {
    headingRef.current?.focus();
  }, [question.id]);

  return (
    <div data-slot="question-step" className="mx-auto grid w-full max-w-2xl gap-6">
      <div className="flex items-center justify-between gap-3">
        <Badge variant="outline" size="sm">
          {CATEGORY_LABELS[question.category]}
        </Badge>
        <span className="numeric font-mono text-xs text-muted-foreground">
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>

      <div className="grid gap-2.5">
        <h2
          ref={headingRef}
          id={headingId}
          tabIndex={-1}
          className="text-balance text-2xl font-semibold tracking-tight outline-none sm:text-3xl"
        >
          {question.prompt}
        </h2>
        <p className="text-pretty leading-relaxed text-muted-foreground">{question.why}</p>
      </div>

      <RadioGroup aria-labelledby={headingId} className="gap-2">
        {answerOptions.map((option) => (
          <Radio
            key={option.id}
            name={question.id}
            value={option.id}
            checked={value === option.id}
            onChange={() => onAnswer(option.id)}
            label={option.label}
            description={option.description}
            className="w-full items-center rounded-xl border border-border bg-surface px-4 py-3.5 shadow-2xs transition-colors hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary-soft/40"
          />
        ))}
      </RadioGroup>

      <div className="flex items-center justify-between gap-3 pt-1">
        <Button variant="ghost" onClick={onBack} disabled={isFirst}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button size="lg" onClick={onNext} disabled={!value}>
          {isLast ? "See my report" : "Continue"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
