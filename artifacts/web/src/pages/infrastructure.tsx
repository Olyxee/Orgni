import { useSeo } from "@/hooks/use-seo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { InfrastructureSection } from "@/components/landing/InfrastructureSection";
import { AgentDeveloperSection } from "@/components/landing/AgentDeveloperSection";
import { TrustSection } from "@/components/landing/TrustSection";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";

export default function Infrastructure() {
  useSeo({
    title: "Infrastructure - Orgni",
    description:
      "Orgni works with the systems you already use, gives agents organisational context, and is built for organisational truth.",
    path: "/infrastructure",
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary overflow-x-clip">
      <SiteHeader />
      <main className="flex-1">
        <InfrastructureSection />
        <AgentDeveloperSection />
        <TrustSection />
        <FinalCtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
