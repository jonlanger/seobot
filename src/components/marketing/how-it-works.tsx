import { Section, SectionHeader } from "@/components/marketing/section";
import { home } from "@/content/home";

export function HowItWorks() {
  const { heading, steps } = home.howItWorks;

  return (
    <Section id="how-it-works" className="border-t border-border">
      <div className="container">
        <SectionHeader
          eyebrow={heading.eyebrow}
          title={heading.title}
          description={heading.description}
        />

        <ol className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {steps.map((step, index) => (
            <li key={step.title} className="relative flex flex-col gap-4">
              {/* Connector line between steps on desktop */}
              {index < steps.length - 1 && (
                <div
                  aria-hidden
                  className="absolute left-13 right-0 top-5 hidden border-t border-dashed border-border sm:block"
                />
              )}
              <div className="relative flex size-10 items-center justify-center rounded-lg border border-border bg-surface font-mono text-base font-semibold text-primary-soft-foreground shadow-xs">
                {index + 1}
              </div>
              <h3 className="text-xl font-semibold tracking-tight">{step.title}</h3>
              <p className="text-base leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
