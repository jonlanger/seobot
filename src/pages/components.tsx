import { Seo } from "@/components/seo";
import {
  Copy,
  Download,
  Globe,
  Link2,
  LogOut,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  TrendingUp,
  UserRound,
  CreditCard,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import {
  Accordion,
  AccordionItem,
  Alert,
  AlertDescription,
  AlertTitle,
  AreaChart,
  Avatar,
  AvatarGroup,
  Badge,
  BarChart,
  Button,
  Card,
  CardContent,
  AnimatedNumber,
  ChartFrame,
  CollapsibleSearch,
  Checkbox,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DotField,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  EmptyState,
  PageHeader,
  Field,
  FilterChip,
  Heatmap,
  Histogram,
  Input,
  LinkedBarList,
  LinkedColumns,
  MeterList,
  Progress,
  ProgressRing,
  Radio,
  RadioGroup,
  ScatterChart,
  SegmentBar,
  Pagination,
  Select,
  SelectMenu,
  Skeleton,
  Sparkline,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
  useToast,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { CompanyCard } from "@/components/app/company-card";
import { AppSidebar, AppTopbar, Breadcrumbs } from "@/components/app";
import { topSitesStudy } from "@/content/top-sites";
import { companyProfileByDomain } from "@/content/companies";

/* --------------------------------- Helpers -------------------------------- */

function Demo({
  title,
  description,
  children,
  contentClassName,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <section className="grid gap-4">
      <div className="grid max-w-2xl gap-1">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      <div className={cn("rounded-xl border border-border bg-surface p-6", contentClassName)}>
        {children}
      </div>
    </section>
  );
}

function DialogDemo() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open dialog</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>Create a new audit</DialogTitle>
          <DialogDescription>
            We'll crawl your site and email you the report when it's ready.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Domain">
            <Input placeholder="example.com" leading={<Globe />} />
          </Field>
          <Field label="Frequency" hint="You can change this later in settings.">
            <Select defaultValue="weekly">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setOpen(false);
              toast({
                title: "Audit scheduled",
                description: "We'll email you when the report is ready.",
                variant: "success",
              });
            }}
          >
            Start audit
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

function ToastDemo() {
  const { toast } = useToast();

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="secondary"
        onClick={() =>
          toast({ title: "Draft saved", description: "Your changes are safe.", variant: "neutral" })
        }
      >
        Default
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({
            title: "Brief generated",
            description: "12 sections · 1,860 words",
            variant: "success",
          })
        }
      >
        Success
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({
            title: "Slow pages detected",
            description: "3 pages exceed the 2.5s LCP budget.",
            variant: "warning",
          })
        }
      >
        Warning
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({
            title: "Audit failed",
            description: "robots.txt blocked the crawler.",
            variant: "danger",
          })
        }
      >
        Danger
      </Button>
    </div>
  );
}

const teamRows = [
  {
    name: "Maya Chen",
    email: "maya@northwind.com",
    role: "Growth lead",
    roleVariant: "primary" as const,
    status: "Active",
    statusVariant: "success" as const,
  },
  {
    name: "Tom Becker",
    email: "tom@northwind.com",
    role: "Content writer",
    roleVariant: "neutral" as const,
    status: "Active",
    statusVariant: "success" as const,
  },
  {
    name: "Priya Patel",
    email: "priya@northwind.com",
    role: "SEO analyst",
    roleVariant: "info" as const,
    status: "Away",
    statusVariant: "warning" as const,
  },
  {
    name: "Luca Rossi",
    email: "luca@northwind.com",
    role: "Developer",
    roleVariant: "neutral" as const,
    status: "Offline",
    statusVariant: "neutral" as const,
  },
];

/* ---------------------------------- Page ----------------------------------- */

/* --------------------------- Data display fixtures ------------------------- */

const crawlerHeatmap = {
  columns: ["GPTBot", "OAI-SearchBot", "PerplexityBot", "ClaudeBot", "CCBot"],
  rows: ["Docs", "Pricing", "Blog", "Glossary", "Changelog"],
  values: [
    [820, 610, 540, 430, 260],
    [310, 240, 190, 150, 90],
    [980, 720, 660, 520, 410],
    [450, 380, 520, 290, 140],
    [120, 90, 70, 60, 30],
  ],
};

export function ComponentsPage() {
  return (
    <>
    <Seo title="Components — Seobot design system" description="Every Seobot UI primitive rendered live with usage notes — the internal component reference." path="/design/components" robots="noindex" />
    <div className="container max-w-5xl py-12 pb-36">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold text-primary-soft-foreground">Design system</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Components</h1>
        <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
          Every primitive in the kit, rendered live. Import from{" "}
          <code className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
            @/components/ui
          </code>{" "}
          — all components are typed, theme-aware, and use the semantic tokens from
          Foundations.
        </p>
      </header>

      <div className="mt-14 grid gap-16">
        {/* ---------------------------- Page header --------------------------- */}
        <Demo
          title="Page header"
          description="The big, bold title that opens every app page: display scale, extrabold, one h1 per page. Optional eyebrow, description and actions."
        >
          <PageHeader
            eyebrow="Research study"
            title="Linked Explorer"
            description="Plain HTML versus rendered JavaScript, and what each AI crawler is allowed to fetch."
            actions={<Button variant="secondary">Export</Button>}
          />
        </Demo>

        {/* ------------------------------ Buttons ----------------------------- */}
        <Demo
          title="Buttons"
          description="Six variants, four sizes, plus icon sizes. The loading state keeps width stable and blocks interaction."
        >
          <div className="grid gap-8">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="soft">Soft</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button>Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra large</Button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button>
                <Plus />
                New audit
              </Button>
              <Button variant="secondary">
                <Download />
                Export report
              </Button>
              <Button variant="secondary" loading>
                Saving
              </Button>
              <Button disabled>Disabled</Button>
              <div className="flex items-center gap-1 pl-3">
                {[
                  { label: "Edit", icon: <Pencil />, size: "icon" as const },
                  { label: "Duplicate", icon: <Copy />, size: "icon" as const },
                  { label: "Delete", icon: <Trash2 />, size: "icon" as const },
                ].map((action) => (
                  <Tooltip key={action.label} content={action.label}>
                    <Button
                      variant="ghost"
                      size={action.size}
                      aria-label={action.label}
                    >
                      {action.icon}
                    </Button>
                  </Tooltip>
                ))}
                <Tooltip content="More actions" side="bottom">
                  <Button variant="secondary" size="icon-sm" aria-label="More actions">
                    <MoreHorizontal />
                  </Button>
                </Tooltip>
              </div>
            </div>
          </div>
        </Demo>

        {/* ------------------------------ Badges ------------------------------ */}
        <Demo
          title="Badges"
          description="Status pills with an optional color dot. Soft fills use the same semantic colors as alerts, so meaning stays consistent."
        >
          <div className="grid gap-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge>Neutral</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="primary">Primary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="danger">Danger</Badge>
              <Badge variant="info">Info</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="success" dot>
                Live
              </Badge>
              <Badge variant="warning" dot>
                Degraded
              </Badge>
              <Badge variant="danger" dot>
                Down
              </Badge>
              <Badge variant="primary" size="sm">
                +2 ranks
              </Badge>
              <Badge variant="success">
                <TrendingUp />
                +18.2%
              </Badge>
              <Badge variant="outline">SOC 2</Badge>
            </div>
          </div>
        </Demo>

        {/* --------------------------- Text fields ---------------------------- */}
        <Demo
          title="Text fields"
          description="Field provides label, hint and error wiring — id, aria-describedby and aria-invalid are handled automatically for the control inside."
        >
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Project name" hint="Shown in dashboards and reports.">
              <Input placeholder="northwind.com" />
            </Field>
            <Field
              label="Notification email"
              error="Enter a valid email address."
            >
              <Input type="email" defaultValue="not-an-email" />
            </Field>
            <Field label="Search keywords">
              <Input placeholder="e.g. seo audit tool" leading={<Search />} />
            </Field>
            <Field label="API key">
              <Input
                readOnly
                defaultValue="sk_live_51Nx…9f2c"
                className="font-mono text-xs"
                trailing={
                  <Button variant="ghost" size="icon-sm" aria-label="Copy API key">
                    <Copy />
                  </Button>
                }
              />
            </Field>
            <Field label="Audit frequency">
              <Select defaultValue="weekly">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Select>
            </Field>
            <Field
              label="Default notes"
              hint="Included in every brief sent to your writers."
            >
              <Textarea placeholder="Tone, audience, must-cover topics…" />
            </Field>
          </div>
        </Demo>

        {/* ------------------------ Selection controls ------------------------ */}
        <Demo
          title="Selection controls"
          description="Checkboxes, radios and switches are styled native inputs — they work with forms, labels, and keyboard out of the box."
        >
          <div className="grid gap-8 md:grid-cols-3">
            <div className="grid content-start gap-4">
              <div className="text-sm font-medium text-muted-foreground">Checkboxes</div>
              <Checkbox label="Track daily rankings" defaultChecked />
              <Checkbox
                label="Weekly email digest"
                description="A summary every Monday at 9:00."
                defaultChecked
              />
              <Checkbox label="Export raw data" disabled />
            </div>

            <div className="grid content-start gap-4">
              <div className="text-sm font-medium text-muted-foreground">Radio group</div>
              <RadioGroup label="Report cadence">
                <Radio name="cadence" value="daily" label="Daily" />
                <Radio
                  name="cadence"
                  value="weekly"
                  label="Weekly"
                  description="Recommended for most teams."
                  defaultChecked
                />
                <Radio name="cadence" value="monthly" label="Monthly" />
              </RadioGroup>
            </div>

            <div className="grid content-start gap-4">
              <div className="text-sm font-medium text-muted-foreground">Switches</div>
              <Switch label="Email notifications" defaultChecked />
              <Switch label="Slack alerts" />
              <Switch label="Beta features" disabled />
            </div>
          </div>
        </Demo>

        {/* ------------------------------- Alerts ----------------------------- */}
        <Demo
          title="Alerts"
          description="Inline feedback with role=alert. Use danger for blocking errors and warning for advisory states."
        >
          <div className="grid gap-3">
            <Alert variant="info">
              <AlertTitle>Search Console connected</AlertTitle>
              <AlertDescription>
                Data for northwind.com started syncing — historical clicks appear
                within a few minutes.
              </AlertDescription>
            </Alert>
            <Alert variant="success">
              <AlertTitle>Audit complete</AlertTitle>
              <AlertDescription>
                47 pages crawled, 3 new issues found, 9 resolved since last week.
              </AlertDescription>
            </Alert>
            <Alert variant="warning">
              <AlertTitle>Approaching plan limit</AlertTitle>
              <AlertDescription>
                You're tracking 2,418 of 2,500 keywords on the Growth plan.
              </AlertDescription>
            </Alert>
            <Alert variant="danger">
              <AlertTitle>Crawl blocked</AlertTitle>
              <AlertDescription>
                Your robots.txt disallowed /blog — 214 pages could not be audited.
              </AlertDescription>
            </Alert>
          </div>
        </Demo>

        {/* ------------------------------- Toasts ----------------------------- */}
        <Demo
          title="Toasts"
          description="Transient confirmations rendered by a portal-free provider at the bottom of the viewport. Auto-dismiss is per-toast."
        >
          <ToastDemo />
        </Demo>

        {/* ------------------------------ Progress ---------------------------- */}
        <Demo
          title="Progress"
          description="Bars for linear progress, a ring for scores. Indicator color can be swapped to signal thresholds."
        >
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div className="grid gap-5">
              {[
                { label: "Content briefs generated", value: 68, tone: "bg-primary", note: "68%" },
                { label: "Site health score", value: 82, tone: "bg-success", note: "82%" },
                { label: "Keyword difficulty", value: 47, tone: "bg-warning", note: "47%" },
                { label: "Crawl budget used", value: 23, tone: "bg-destructive", note: "23%" },
              ].map((row) => (
                <div key={row.label} className="grid gap-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium tabular-nums">{row.note}</span>
                  </div>
                  <Progress value={row.value} indicatorClassName={row.tone} />
                </div>
              ))}
            </div>
            <div className="justify-self-center">
              <ProgressRing value={76} size={120} strokeWidth={10}>
                <div className="grid text-center">
                  <span className="text-2xl font-semibold tabular-nums">76</span>
                  <span className="text-xs text-muted-foreground">score</span>
                </div>
              </ProgressRing>
            </div>
          </div>
        </Demo>

        {/* --------------------------- Score display -------------------------- */}
        <Demo
          title="Score display"
          description="The assessment trio: a banded score ring, the answer mix as a segment bar, and category meters. Every value is readable as text — color is never the only signal."
        >
          <div className="grid gap-8 lg:grid-cols-[auto_1fr] lg:items-center">
            <div className="justify-self-center">
              <ProgressRing value={52} size={180} strokeWidth={12} indicatorClassName="stroke-warning">
                <div className="grid text-center">
                  <span className="numeric font-mono text-4xl font-semibold">52</span>
                  <span className="text-xs text-muted-foreground">out of 100</span>
                </div>
              </ProgressRing>
            </div>
            <div className="grid gap-8">
              <SegmentBar
                items={[
                  { id: "yes", label: "Yes", value: 8, tone: "success" },
                  { id: "unsure", label: "Not sure", value: 7, tone: "warning" },
                  { id: "no", label: "No", value: 7, tone: "danger" },
                ]}
              />
              <MeterList
                items={[
                  { id: "setup", label: "Setup & measurement", value: 88, tone: "success" },
                  { id: "content", label: "On-page & content", value: 62, tone: "warning" },
                  { id: "experience", label: "Experience & speed", value: 47, tone: "warning" },
                  { id: "indexability", label: "Crawlability & indexability", value: 31, tone: "danger" },
                ]}
              />
            </div>
          </div>
        </Demo>

        {/* ------------------------------ Skeleton ---------------------------- */}
        <Demo
          title="Skeleton"
          description="Loading placeholders that mirror the shape of the content they replace."
        >
          <Card className="max-w-md gap-4 py-5">
            <CardContent className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </CardContent>
            <CardContent className="grid gap-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-2/3" />
            </CardContent>
          </Card>
        </Demo>

        {/* ------------------------------- Avatars ---------------------------- */}
        <Demo
          title="Avatars"
          description="Image with initials fallback, optional presence dot. Groups overlap with a surface ring for separation."
        >
          <div className="grid gap-8">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name="Maya Chen" size="sm" />
              <Avatar name="Tom Becker" size="md" />
              <Avatar name="Priya Patel" size="lg" status="online" />
              <Avatar name="Luca Rossi" size="xl" status="away" />
              <Avatar name="Jon Langer" size="md" status="busy" />
              <Avatar name="Ana Silva" size="md" status="offline" />
            </div>
            <AvatarGroup>
              <Avatar name="Maya Chen" />
              <Avatar name="Tom Becker" />
              <Avatar name="Priya Patel" />
              <Avatar name="Luca Rossi" />
              <span className="grid size-10 place-items-center rounded-full bg-muted text-xs font-medium text-muted-foreground ring-2 ring-surface">
                +12
              </span>
            </AvatarGroup>
          </div>
        </Demo>

        {/* -------------------------------- Tabs ------------------------------ */}
        <Demo
          title="Tabs"
          description="Two styles: pill (in-card filters) and underline (page-level sections). Arrow keys move between tabs."
        >
          <div className="grid gap-10">
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="pages">Pages</TabsTrigger>
                <TabsTrigger value="serp">SERP features</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="text-sm leading-relaxed text-muted-foreground">
                Organic clicks are up 12.4% month over month, driven mostly by the
                new comparison pages published in September.
              </TabsContent>
              <TabsContent value="pages" className="text-sm leading-relaxed text-muted-foreground">
                47 pages crawled · 3 critical issues · average LCP 1.8s.
              </TabsContent>
              <TabsContent value="serp" className="text-sm leading-relaxed text-muted-foreground">
                Featured snippets: 14 (+3) · People also ask: 38 (+9).
              </TabsContent>
            </Tabs>

            <Tabs defaultValue="profile">
              <TabsList variant="underline">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
                <TabsTrigger value="team">Team</TabsTrigger>
              </TabsList>
              <TabsContent value="profile" className="pt-1 text-sm leading-relaxed text-muted-foreground">
                Manage your name, email, and workspace preferences.
              </TabsContent>
              <TabsContent value="billing" className="pt-1 text-sm leading-relaxed text-muted-foreground">
                Growth plan · $79/mo · next invoice on Nov 1.
              </TabsContent>
              <TabsContent value="team" className="pt-1 text-sm leading-relaxed text-muted-foreground">
                4 members · 2 pending invitations.
              </TabsContent>
            </Tabs>
          </div>
        </Demo>

        {/* ------------------------------ Accordion --------------------------- */}
        <Demo
          title="Accordion"
          description="Single-open, collapsible, animated with grid-template-rows — no measuring, no layout thrash."
        >
          <Accordion defaultValue="a1" className="max-w-2xl">
            <AccordionItem value="a1" title="What counts as a keyword?">
              Any query you want to rank for. Seobot tracks exact-match volume,
              intent, and difficulty for each keyword.
            </AccordionItem>
            <AccordionItem value="a2" title="How often are rankings checked?">
              Daily by default. The Scale plan supports hourly checks on priority
              keywords.
            </AccordionItem>
            <AccordionItem value="a3" title="Can I export the raw data?">
              Yes — CSV and API access are included from the Scale plan; CSV export
              is available on all plans.
            </AccordionItem>
          </Accordion>
        </Demo>

        {/* -------------------------------- Dialog ---------------------------- */}
        <Demo
          title="Dialog"
          description="Built on the native dialog element: focus trapping, Esc handling and the top layer are provided by the platform."
        >
          <DialogDemo />
        </Demo>

        {/* ---------------------------- Dropdown menu ------------------------- */}
        <Demo
          title="Dropdown menu"
          description="Keyboard-navigable menu with arrow keys and Escape. Items close the menu on select."
        >
          <DropdownMenu
            align="start"
            trigger={
              <Button variant="secondary">
                Account
                <UserRound />
              </Button>
            }
          >
            <DropdownMenuLabel>My account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserRound />
              Profile
              <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CreditCard />
              Billing
              <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Mail />
              Invite teammates (soon)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenu>
        </Demo>

        {/* -------------------------------- Table ----------------------------- */}
        <Demo
          title="Table"
          description="Composable table primitives with hairline separators and hover states. Wrap in Card content for the standard app look."
          contentClassName="p-0 overflow-hidden"
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="min-w-40">Keyword coverage</TableHead>
                <TableHead className="w-14 pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamRows.map((member) => (
                <TableRow key={member.email}>
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <Avatar name={member.name} size="sm" />
                      <div className="grid">
                        <span className="font-medium">{member.name}</span>
                        <span className="text-xs text-muted-foreground">{member.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.roleVariant} size="sm">
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.statusVariant} size="sm" dot>
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Progress
                        value={84 - teamRows.indexOf(member) * 16}
                        className="h-1.5 w-24"
                      />
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {84 - teamRows.indexOf(member) * 16}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <DropdownMenu
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${member.name}`}
                        >
                          <MoreHorizontal />
                        </Button>
                      }
                    >
                      <DropdownMenuItem>
                        <Pencil />
                        Edit member
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <ShieldCheck />
                        Change permissions
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive>
                        <Trash2 />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Demo>

        {/* ----------------------------- Empty state -------------------------- */}
        <Demo
          title="Empty state"
          description="A friendly placeholder for empty tables, first-run flows, and zero-result searches."
        >
          <EmptyState
            icon={<Search />}
            title="No keywords tracked yet"
            description="Add your first keyword to start monitoring rankings daily — or import them from Google Search Console."
            action={
              <div className="flex items-center gap-2">
                <Button size="sm">
                  <Plus />
                  Add keyword
                </Button>
                <Button size="sm" variant="secondary">
                  <Link2 />
                  Import from GSC
                </Button>
              </div>
            }
          />
        </Demo>

        {/* -------------------------------- Charts ---------------------------- */}
        <Demo
          title="Charts"
          description="Zero-dependency SVG charts. The area chart has a hover crosshair with values; bars show tooltips on hover."
        >
          <div className="grid gap-10">
            <div className="grid gap-3">
              <div className="text-sm font-medium">
                Organic traffic — last 12 weeks
              </div>
              <AreaChart
                data={[320, 380, 420, 400, 460, 520, 580, 560, 640, 720, 810, 880]}
                labels={[
                  "W1", "W2", "W3", "W4", "W5", "W6",
                  "W7", "W8", "W9", "W10", "W11", "W12",
                ]}
                height={220}
              />
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div className="grid content-start gap-3">
                <div className="text-sm font-medium">Clicks by device</div>
                <BarChart
                  data={[4200, 3100, 1800, 900]}
                  labels={["Desktop", "Mobile", "Tablet", "Other"]}
                  height={160}
                  color="chart-2"
                />
              </div>
              <div className="grid content-start gap-3">
                <div className="text-sm font-medium">Sparklines</div>
                <div className="grid gap-4 rounded-lg border border-border p-4">
                  {(
                    [
                      { label: "Clicks", data: [12, 14, 13, 16, 18, 17, 20, 22, 21, 24, 26, 28], color: "chart-1" as const },
                      { label: "Impressions", data: [30, 32, 31, 35, 34, 38, 40, 39, 43, 46, 45, 49], color: "chart-2" as const },
                      { label: "Backlinks", data: [8, 9, 9, 11, 10, 12, 13, 12, 14, 15, 15, 17], color: "chart-3" as const },
                    ]
                  ).map((row) => (
                    <div key={row.label} className="flex items-center gap-4">
                      <span className="w-24 shrink-0 text-sm text-muted-foreground">
                        {row.label}
                      </span>
                      <Sparkline
                        data={row.data}
                        color={row.color}
                        className="h-8 flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Demo>

        {/* ------------------------------ Data display ------------------------ */}
        <Demo
          title="Data display"
          description="The study pattern: every chart ships in a ChartFrame — sourced caption, accessible label, and a table view of the same numbers (table-first, no JavaScript required)."
        >
          <div className="grid gap-10">
            <div className="grid gap-8 lg:grid-cols-2">
              <ChartFrame
                title="AI visibility vs average rank"
                caption="Illustrative sample data — study pages cite the dataset, number, and year here."
              >
                <ScatterChart
                  height={220}
                  xLabel="AI-visible share (%) →"
                  yLabel="Avg. rank"
                  xFormatter={(value) => `${value}%`}
                  yFormatter={(value) => `#${value}`}
                  points={[
                    { x: 62, y: 3.1, label: "northwind.com", highlight: true },
                    { x: 55, y: 4.4, label: "kite.inc" },
                    { x: 48, y: 5.6, label: "lumen.app" },
                    { x: 44, y: 7.2, label: "fern.dev" },
                    { x: 39, y: 6.1, label: "oak.shop" },
                    { x: 36, y: 9.4, label: "palm.io" },
                    { x: 33, y: 8.2, label: "reed.co" },
                    { x: 28, y: 11.8, label: "sage.org" },
                    { x: 24, y: 14.3, label: "tide.net" },
                    { x: 21, y: 12.9, label: "vale.com" },
                    { x: 17, y: 18.6, label: "wren.xyz" },
                    { x: 12, y: 24.5, label: "yew.design" },
                  ]}
                />
              </ChartFrame>

              <ChartFrame
                title="AI-visible pages by rank bucket"
                caption="Illustrative sample data — distribution of AI-visible pages across the top 100 positions."
              >
                <Histogram
                  data={[3, 9, 16, 24, 21, 14, 8, 5]}
                  labels={["1–12", "13–25", "26–38", "39–50", "51–63", "64–75", "76–88", "89–100"]}
                  color="chart-2"
                />
              </ChartFrame>
            </div>

            <ChartFrame
              title="Requests by crawler and page type"
              caption="Illustrative sample data — cells use the brand sequential ramp; hover any cell for its value, or open the table."
              table={
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page type</TableHead>
                      {crawlerHeatmap.columns.map((column) => (
                        <TableHead key={column}>{column}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {crawlerHeatmap.rows.map((row, rowIndex) => (
                      <TableRow key={row}>
                        <TableCell className="font-medium">{row}</TableCell>
                        {crawlerHeatmap.columns.map((column, columnIndex) => (
                          <TableCell key={column} className="numeric font-mono">
                            {(crawlerHeatmap.values[rowIndex]?.[columnIndex] ?? 0).toLocaleString()}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              }
            >
              <Heatmap
                rows={crawlerHeatmap.rows}
                columns={crawlerHeatmap.columns}
                values={crawlerHeatmap.values}
                formatValue={(value) => `${value.toLocaleString()} req`}
              />
            </ChartFrame>
          </div>
        </Demo>

        {/* ------------------------ Select menu ------------------------ */}
        <SelectMenuDemo />

        {/* ------------------------ Pagination ------------------------ */}
        <PaginationDemo />

        {/* ------------------------ Collapsible search ------------------------ */}
        <CollapsibleSearchDemo />

        {/* ------------------------ Linked data display ------------------------ */}
        <LinkedDisplayDemo />

        {/* --------------------------- Company cards --------------------------- */}
        <Demo
          title="Company cards"
          description="Card layout for the company directory: image on top, name, classification badge, description, then rank/coverage details. The whole card is clickable and has a hover state."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topSitesStudy.sites.slice(0, 3).map((site) => (
              <CompanyCard
                key={site.domain}
                site={site}
                profile={companyProfileByDomain.get(site.domain)}
                onClick={() => {}}
              />
            ))}
          </div>
        </Demo>

        {/* --------------------------- App shell template --------------------------- */}
        <Demo
          title="App shell template"
          description="The sidebar + topbar layout used across the data dashboard and company detail pages. Includes the app sidebar with navigation sections and footer, the sticky top bar with breadcrumbs, and the main content area."
          contentClassName="p-0 overflow-hidden"
        >
          <div className="flex h-[420px] overflow-hidden rounded-xl border border-border">
            <AppSidebar
              className="hidden h-full w-56 shrink-0 lg:flex"
              header={<span className="text-sm font-semibold">seobot.</span>}
              sections={[
                {
                  label: "Data visualizations",
                  items: [
                    { label: "Crawler × Vertical" },
                    { label: "Co-blocking Matrix" },
                    { label: "Anti-Bot Radar" },
                    { label: "JSON-LD Flow" },
                    { label: "Raw vs Rendered" },
                    { label: "Company Directory", active: true },
                    { label: "Info" },
                  ],
                },
              ]}
              footer={
                <div className="grid gap-1 rounded-lg border border-border bg-background p-3">
                  <span className="text-xs font-medium">Dataset</span>
                  <span className="text-xs text-muted-foreground">Tranco list · crawled sites</span>
                </div>
              }
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <AppTopbar>
                <Breadcrumbs
                  items={[
                    { label: "Home", href: "/" },
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Companies", href: "/companies" },
                    { label: "example.com" },
                  ]}
                />
                <div className="ml-auto flex items-center gap-1.5">
                  <Button variant="ghost" size="sm">
                    Dashboard
                  </Button>
                </div>
              </AppTopbar>
              <main className="flex flex-1 items-center justify-center bg-background px-6">
                <p className="text-sm text-muted-foreground">Main content area</p>
              </main>
            </div>
          </div>
        </Demo>
      </div>
    </div>
    </>
  );
}

/* Live demo for the linked-display primitives: DotField, LinkedBarList, LinkedColumns,
   AnimatedNumber, FilterChip. Synthetic data — the real binding is LinkedExplorer. */
const demoGroups = ["News", "Shop", "Dev", "Social"];
const demoDots = Array.from({ length: 48 }, (_, index) => ({
  id: `site-${index}`,
  group: demoGroups[index % demoGroups.length]!,
  x: ((index * 0.618) % 1) * 0.9 + 0.05,
  y: ((index * 0.381 + 0.17) % 1) * 0.9 + 0.05,
}));

function LinkedDisplayDemo() {
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) => setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  const inView = demoDots.filter((dot) => !picked.length || picked.includes(dot.group));
  const items = demoGroups.map((group) => ({
    id: group,
    label: group,
    total: demoDots.filter((dot) => dot.group === group).length,
    value: inView.filter((dot) => dot.group === group).length,
  }));

  return (
    <Demo
      title="Linked data display"
      description="Presentational pieces for cross-filtered views. Marks move with transform-only transitions (container-query units), bars scale from a muted full-dataset context bar, and numbers count up on change. Click a bar or column to filter the dots — the same wiring LinkedExplorer uses on the dashboard."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <DotField
          className="h-72 sm:h-72"
          dots={demoDots.map((dot) => ({
            id: dot.id,
            x: dot.x,
            y: dot.y,
            tone: "bg-chart-1",
            active: !picked.length || picked.includes(dot.group),
            label: `${dot.id} in ${dot.group}`,
          }))}
          rows={[{ id: "mid", label: "50%", at: 0.5 }]}
        />
        <div className="grid content-start gap-4">
          <div className="flex items-baseline gap-2">
            <AnimatedNumber value={inView.length} className="font-mono text-2xl font-medium" />
            <span className="text-sm text-muted-foreground">of {demoDots.length} in view</span>
          </div>
          <div className="flex min-h-6 flex-wrap gap-1.5">
            {picked.map((id) => (
              <FilterChip key={id} onRemove={() => toggle(id)}>
                {id}
              </FilterChip>
            ))}
          </div>
          <LinkedBarList items={items} max={16} activeIds={picked} onToggle={toggle} />
          <LinkedColumns items={items} max={16} activeIds={picked} onToggle={toggle} />
        </div>
      </div>
    </Demo>
  );
}

/* Live demo: SelectMenu is the menu-styled single choice; the native Select stays for forms. */
function SelectMenuDemo() {
  const [value, setValue] = useState("weekly");
  return (
    <Demo
      title="Select menu"
      description="A single-choice control whose open list is the design system's own menu — rounded panel, check on the current choice, Escape and arrow keys — instead of the platform picker. Use it for view and display options (it powers the explorer's metric picker). Keep the native Select for form fields, where the platform picker is the better experience on touch."
    >
      <div className="grid max-w-xs gap-2">
        <SelectMenu
          aria-label="Audit frequency"
          value={value}
          onValueChange={setValue}
          options={[
            { value: "daily", label: "Daily" },
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
          ]}
        />
        <span className="text-xs text-muted-foreground">Selected: {value}</span>
      </div>
    </Demo>
  );
}

/* Live demo: Pagination, used by the company directory. */
function PaginationDemo() {
  const [page, setPage] = useState(2);
  const pageSize = 36;
  const total = 1700;
  const pageCount = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  return (
    <Demo
      title="Pagination"
      description="Previous and next with a page indicator and a summary of what is shown. The company directory pages its cards with it so a thousand-plus items never hit the DOM at once."
    >
      <Pagination
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
        summary={`Showing ${start + 1}–${Math.min(start + pageSize, total)} of ${total.toLocaleString("en-US")}`}
      />
    </Demo>
  );
}

/* Live demo: CollapsibleSearch adapts to its container's width, not the viewport's. */
function CollapsibleSearchDemo() {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <Demo
      title="Collapsible search"
      description="A search that adapts to the room it has. Wide: a normal field. Narrow: an icon button that expands over its neighbours and collapses when cleared, submitted or left; a dot shows a search is still applied. It responds to its container (drag the handle to resize), so it behaves the same in a toolbar squeezed by sidebars as on a phone."
    >
      <div className="@container w-full min-w-48 max-w-2xl resize-x overflow-auto rounded-lg border border-dashed border-border p-3">
        <div className="flex items-center gap-2">
          <CollapsibleSearch
            value={value}
            onValueChange={setValue}
            placeholder="Find a domain…"
            aria-label="Find a domain"
            open={open}
            onOpenChange={setOpen}
            inlineClassName="@md:w-44 @xl:w-64"
          />
          <div className={cn("flex items-center gap-2", open && "@max-md:hidden")}>
            <Button variant="secondary" size="sm">
              Sort
            </Button>
            <Button variant="secondary" size="sm">
              Filter
            </Button>
          </div>
        </div>
      </div>
    </Demo>
  );
}
