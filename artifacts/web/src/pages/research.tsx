import { useSeo } from "@/hooks/use-seo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, FileText } from "lucide-react";
import { thesisData } from "@/data/thesis";

export default function Research() {
  useSeo({
    title: "Research - Orgni",
    description:
      "Why we build Orgni: our vision, our mission, and the research behind organisational intelligence infrastructure.",
    path: "/research",
  });

  return (
    <div className="min-h-screen bg-white text-foreground font-sans selection:bg-primary/20 selection:text-primary flex flex-col">
      <SiteHeader />
      <main className="flex-1 pt-16">
        {/* Vision & Mission */}
        <section className="pt-24 pb-16 md:pt-32 md:pb-24 px-6 md:px-12 max-w-[1600px] mx-auto">
          <div className="max-w-4xl">
            <div className="mb-6 flex items-center gap-4">
              <div className="h-[1px] w-12 bg-foreground"></div>
              <p className="text-xs font-mono tracking-widest uppercase">
                Why we do this work
              </p>
            </div>
            <h1 className="text-4xl md:text-6xl font-serif leading-[1.1] tracking-tight mb-16 text-foreground max-w-3xl">
              Organisations should never lose what they know.
            </h1>
            <div className="grid md:grid-cols-2 gap-12 md:gap-16">
              <div>
                <h2 className="text-xs font-mono tracking-widest uppercase text-primary mb-4">
                  Our vision
                </h2>
                <p className="text-xl md:text-2xl font-serif leading-snug text-foreground">
                  A world where every organisation has a living, queryable
                  memory of how it operates, so that people and AI can act on
                  verified fact instead of guesswork.
                </p>
              </div>
              <div>
                <h2 className="text-xs font-mono tracking-widest uppercase text-primary mb-4">
                  Our mission
                </h2>
                <p className="text-xl md:text-2xl font-serif leading-snug text-foreground">
                  Build the organisational intelligence layer: capture
                  contracts, invoices, payments and decisions into one verified
                  model, and make it available to every person and agent that
                  needs it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Paper teaser */}
        <section className="py-16 md:py-24 px-6 md:px-12 max-w-[1600px] mx-auto border-t border-border">
          <div className="max-w-4xl">
            <div className="mb-6 flex items-center gap-4">
              <div className="h-[1px] w-12 bg-primary"></div>
              <p className="text-xs font-mono tracking-widest uppercase text-primary">
                The research paper
              </p>
            </div>
            <div className="border border-border bg-muted/20 p-8 md:p-12 rounded-xl">
              <div className="w-12 h-12 rounded-md bg-muted border border-border flex items-center justify-center mb-6">
                <FileText className="text-foreground/70" size={24} />
              </div>
              <h2 className="text-3xl md:text-5xl font-serif leading-tight tracking-tight mb-6 text-foreground">
                {thesisData.title}
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-8">
                {thesisData.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10 mb-10">
                <div>
                  <span className="block font-medium text-foreground">
                    Lethabo Scofield
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Research Scientist
                  </span>
                </div>
                <div>
                  <span className="block font-medium text-foreground">
                    Alisha Fatima
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Founding AI Infrastructure Engineer
                  </span>
                </div>
                <div>
                  <span className="block font-medium text-foreground">
                    Mosa Maseko
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Founding Data Engineer
                  </span>
                </div>
              </div>
              <Button
                asChild
                size="lg"
                className="h-12 px-8 font-medium shadow-none rounded-md bg-primary hover:bg-primary/90 text-primary-foreground group"
              >
                <Link href="/thesis">
                  Read the paper
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
