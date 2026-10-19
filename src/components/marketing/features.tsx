import {
  BarChart3,
  Bot,
  Building2,
  FileSearch,
  ListChecks,
  Network,
} from "lucide-react";
import type { ComponentType } from "react";
import { Card, CardContent, CardDescription } from "@/components/ui";
import { Section, SectionHeader } from "@/components/marketing/section";
import { home } from "@/content/home";

/** Icon per feature slug — features grounded in the crawled study and dashboard. */
const icons: Record<string, ComponentType<{ className?: string }>> = {
  "machine-readability": FileSearch,
  "crawler-access": Bot,
  "data-visualizations": BarChart3,
  "linked-explorer": Network,
  "best-practices": ListChecks,
  "company-pages": Building2,
};

export function Features() {
  const { heading, items } = home.features;

  return (
    <Section id="features" className="border-t border-border">
      <div className="container">
        <SectionHeader
          eyebrow={heading.eyebrow}
          title={heading.title}
          description={heading.description}
        />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((feature, index) => {
            const Icon = icons[feature.featureSlug] ?? FileSearch;
            return (
              <Card
                key={feature.featureSlug}
                className="group gap-4 py-7 transition-all duration-300 hover:shadow-md hover:-translate-y-1 motion-safe:animate-rise-in"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <CardContent className="flex flex-col gap-4">
                  <div className="grid size-11 place-items-center rounded-lg bg-primary-soft text-primary-soft-foreground transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
                    <Icon className="size-5.5" />
                  </div>
                  <h3 className="text-lg font-semibold leading-snug tracking-tight">
                    {feature.title}
                  </h3>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
