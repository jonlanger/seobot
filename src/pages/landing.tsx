import {
  AiSearch,
  Coverage,
  Definition,
  Faq,
  Features,
  Footer,
  Hero,
  Highlights,
  Navbar,
} from "@/components/marketing";
import { Seo } from "@/components/seo";
import { home } from "@/content/home";

export function LandingPage({
  onRunSeoCheck,
  onOpenDashboard,
}: {
  onRunSeoCheck?: () => void;
  /** Opens the research dashboard without a full reload. */
  onOpenDashboard?: () => void;
}) {
  return (
    <div className="min-h-dvh bg-background">
      {/* Title, meta, canonical, and JSON-LD render with the page — prerender-safe. */}
      <Seo {...home} />
      <Navbar
        // "Home" returns to the canonical landing URL (`/`) and the top of the page.
        onHome={() => {
          window.history.replaceState(null, "", window.location.pathname);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onRunSeoCheck={onRunSeoCheck}
        onOpenDashboard={onOpenDashboard}
      />
      <main>
        <Hero onRunSeoCheck={onRunSeoCheck} onOpenDashboard={onOpenDashboard} />
        {/* Definition band stays directly under the hero — engines quote it first. */}
        <Definition />
        <Highlights />
        <Coverage />
        <Features />
        <AiSearch />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}
