import { useSeo } from "@/hooks/use-seo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MotionHero } from "@/components/landing/motion-page/MotionHero";
import { ExperienceSection } from "@/components/landing/motion-page/ExperienceSection";
import { UseCasesSection } from "@/components/landing/motion-page/UseCasesSection";
import { IndependenceSection } from "@/components/landing/motion-page/IndependenceSection";
import { KeepMovingCta } from "@/components/landing/motion-page/KeepMovingCta";

export default function Home() {
  useSeo({
    title: "Orgni | Intelligent Infrastructure for Insurance & Finance",
    description:
      "Orgni gives insurance and finance development teams APIs for extracting operational context, resolving entities, detecting exceptions, and executing authorised actions.",
    path: "/",
  });

  return (
    <div className="dark min-h-screen overflow-x-clip bg-black font-sans text-white selection:bg-white selection:text-black">
      <SiteHeader />

      <main className="flex-1">
        <MotionHero />
        <section className="bg-black">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
            <h2 className="mx-auto max-w-4xl text-center font-serif text-3xl leading-tight md:text-5xl">
              Built for insurance and finance development teams.
            </h2>
          </div>
        </section>
        <ExperienceSection />
        <UseCasesSection />
        <IndependenceSection />
        <KeepMovingCta />
      </main>

      <SiteFooter />
    </div>
  );
}
