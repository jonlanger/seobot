import { Footer, Navbar } from "@/components/marketing";
import { Seo } from "@/components/seo";
import { buttonVariants } from "@/components/ui";

/** Client-side 404 — noindex so a soft 404 never enters the index. */
export function NotFoundPage({ onHome }: { onHome?: () => void }) {
  return (
    <div className="min-h-dvh bg-background">
      <Seo
        title="Page not found | Seobot"
        description="This page doesn't exist. Go back to the Seobot home page or run the free SEO check."
        path="/404"
        robots="noindex"
      />
      <Navbar onHome={onHome} />
      <main className="container grid max-w-xl gap-4 py-24">
        <p className="text-sm font-semibold text-primary-soft-foreground">404</p>
        <h1 className="text-3xl font-semibold tracking-tight">We couldn't find that page.</h1>
        <p className="text-muted-foreground">
          The link may be old or mistyped. The home page and the free SEO check are good places to start.
        </p>
        <div className="flex gap-2">
          <a href="/" className={buttonVariants()}>Go to home</a>
          <a href="/seo-check" className={buttonVariants({ variant: "secondary" })}>Run a free SEO check</a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
