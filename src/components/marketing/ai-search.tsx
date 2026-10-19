import {
  Card,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { Section, SectionHeader } from "@/components/marketing/section";
import { home } from "@/content/home";

/**
 * The evidence section: sourced statistics + one comparison table.
 *
 * AI engines preferentially extract tables and quote sourced numbers
 * (docs/geo-research.md §5.2) — the stat cards and the table are both
 * retrieval-bait assets, and every claim carries a source + year.
 */
export function AiSearch() {
  const { heading, stats, table } = home.evidence;

  return (
    <Section id="ai-search" className="border-t border-border">
      <div className="container">
        <SectionHeader
          align="start"
          eyebrow={heading.eyebrow}
          title={heading.title}
          description={heading.description}
        />

        <dl className="mt-14 grid max-w-5xl gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-start gap-3 text-left">
              <dd className="text-5xl font-black tracking-tight tabular-nums">
                {stat.value}
              </dd>
              <dt className="max-w-56 text-sm leading-relaxed text-muted-foreground">
                {stat.label}
              </dt>
              <dd className="text-xs text-muted-foreground">
                {stat.source}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-20 w-full">
          <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {table.title}
          </h3>

          <Card className="mt-6 gap-0 overflow-hidden py-0">
            <Table className="text-[0.9375rem]">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[22%] whitespace-normal py-4" />
                  {table.columns.map((column) => (
                    <TableHead
                      key={column}
                      className="w-2/5 whitespace-normal py-4 text-xs leading-snug"
                    >
                      {column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.rows.map((row) => (
                  <TableRow key={row.label}>
                    <TableHead
                      scope="row"
                      className="whitespace-normal py-4 align-top text-sm font-medium normal-case leading-snug tracking-normal text-foreground"
                    >
                      {row.label}
                    </TableHead>
                    {row.values.map((value, index) => (
                      <TableCell
                        key={index}
                        className="whitespace-normal py-4 align-top leading-relaxed text-muted-foreground"
                      >
                        {value}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption className="m-0 border-t border-border bg-muted/40 px-5 py-3 text-left text-xs">
                {table.source}
              </TableCaption>
            </Table>
          </Card>
        </div>
      </div>
    </Section>
  );
}
