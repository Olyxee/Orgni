import { useSeo } from "@/hooks/use-seo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { UseCaseSection } from "@/components/landing/UseCaseSection";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";

export default function UseCases() {
  useSeo({
    title: "Use Cases - Orgni",
    description:
      "Start with contracts, invoices and payments: Orgni connects commercial evidence into one operational model.",
    path: "/use-cases",
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary overflow-x-clip">
      <SiteHeader />
      <main className="flex-1">
        <UseCaseSection />
        <FinalCtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
