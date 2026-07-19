import { useSeo } from "@/hooks/use-seo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { TransformationSection } from "@/components/landing/TransformationSection";
import { LayersSection } from "@/components/landing/LayersSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { ProductInterfaceSection } from "@/components/landing/ProductInterfaceSection";
import { BeforeAfterSection } from "@/components/landing/BeforeAfterSection";
import { EnterpriseSection } from "@/components/landing/EnterpriseSection";
import { DevelopersSection } from "@/components/landing/DevelopersSection";
import { TeamSection } from "@/components/landing/TeamSection";
import { ClosingSection } from "@/components/landing/ClosingSection";

export default function Home() {
  useSeo({
    title: "Orgni - Live business context for modern operations",
    description: "Orgni makes organisational intelligence visible, connected and reusable.",
    path: "/",
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary overflow-x-clip">
      <SiteHeader dark />
      
      <main className="flex-1">
        <HeroSection />
        <ProblemSection />
        <TransformationSection />
        <LayersSection />
        <HowItWorksSection />
        <ProductInterfaceSection />
        <BeforeAfterSection />
        <EnterpriseSection />
        <DevelopersSection />
        <TeamSection />
        <ClosingSection />
      </main>

      <SiteFooter dark />
    </div>
  );
}
