import { Accordion, AccordionItem } from "@/components/ui";
import { Section, SectionHeader } from "@/components/marketing/section";
import { home } from "@/content/home";
import { site } from "@/content/site";

export function Faq() {
  const { heading, items } = home.faq;

  return (
    <Section id="faq" className="border-t border-border">
      <div className="container grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <SectionHeader
          align="start"
          eyebrow={heading.eyebrow}
          title={heading.title}
          description={
            <>
              {heading.description}{" "}
              <a
                href={`mailto:${site.supportEmail}`}
                className="font-medium text-primary-soft-foreground hover:underline"
              >
                Email {site.supportEmail}
              </a>{" "}
              — a human replies within a day.
            </>
          }
        />

        {/* Accordion content stays in the DOM when closed, so the visible FAQ
            text is present in raw HTML and matches the FAQPage schema. */}
        <Accordion defaultValue="q1" className="lg:pt-2">
          {items.map((faq, index) => (
            <AccordionItem key={faq.question} value={`q${index + 1}`} title={faq.question}>
              {faq.answer}
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Section>
  );
}
