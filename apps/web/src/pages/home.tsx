import { useSeo } from "@/hooks/use-seo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { WhatItDoesSection } from "@/components/landing/WhatItDoesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { ProductShowcaseSection } from "@/components/landing/ProductShowcaseSection";
import { VideoSection } from "@/components/landing/VideoSection";
import { UseCaseSection } from "@/components/landing/UseCaseSection";
import { BusinessValueSection } from "@/components/landing/BusinessValueSection";
import { InfrastructureSection } from "@/components/landing/InfrastructureSection";
import { AgentDeveloperSection } from "@/components/landing/AgentDeveloperSection";
import { TrustSection } from "@/components/landing/TrustSection";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";

export default function Home() {
  useSeo({
    title: "Orgni - Organisational intelligence infrastructure",
    description: "Orgni creates and maintains the shared organisational context that humans, applications and AI agents need to understand and operate within a business reliably.",
    path: "/",
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary overflow-x-clip">
      <SiteHeader />
      
      <main className="flex-1">
        <HeroSection />
        <ProblemSection />
        <WhatItDoesSection />
        <HowItWorksSection />
        <ProductShowcaseSection />
        <UseCaseSection />
        <BusinessValueSection />
        <VideoSection />
        <InfrastructureSection />
        <AgentDeveloperSection />
        <TrustSection />
        <FinalCtaSection />
      </main>

      <SiteFooter />
    </div>
  );
}
