import { useSeo } from "@/hooks/use-seo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  ArrowRight,
  FileText,
  Database,
  ShieldCheck,
  Network,
} from "lucide-react";
import { thesisData } from "@/data/thesis";
import { motion } from "framer-motion";

const authors = [
  { name: "Lethabo Scofield", role: "Research Scientist" },
  { name: "Alisha Fatima", role: "Founding AI Infrastructure Engineer" },
  { name: "Mosa Maseko", role: "Founding Data Engineer" },
  { name: "Emmanuel Stakio", role: "Theoretical Research Scientist" },
];

const themes = [
  {
    icon: Database,
    title: "Organisational memory",
    desc: "How the facts of a business, its contracts, invoices, payments and decisions, can be captured into one living record that never goes stale.",
  },
  {
    icon: Network,
    title: "Verified context for AI",
    desc: "What it takes for an AI agent to answer with evidence: entity resolution, provenance, and a queryable model of how the organisation actually works.",
  },
  {
    icon: ShieldCheck,
    title: "Safe autonomy",
    desc: "How agents can act inside a company without breaking its rules, with permission-aware context, applicable policies and human checkpoints built in.",
  },
];

export default function Research() {
  useSeo({
    title: "Research - Orgni",
    description:
      "Why we build Orgni: our vision, our mission, the questions we study, and the research behind organisational intelligence infrastructure.",
    path: "/research",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Orgni Research",
      description:
        "Our vision, mission, research themes and the research paper behind Orgni's organisational intelligence infrastructure.",
      url: "https://orgni.com/research",
      isPartOf: { "@type": "WebSite", name: "Orgni", url: "https://orgni.com" },
      publisher: {
        "@type": "Organization",
        name: "Olyxee",
        url: "https://www.olyxee.com",
      },
      mainEntity: {
        "@type": "ScholarlyArticle",
        headline: thesisData.title,
        description: thesisData.subtitle,
        url: "https://orgni.com/thesis",
        author: authors.map((a) => ({
          "@type": "Person",
          name: a.name,
          jobTitle: a.role,
        })),
      },
    },
  });

  return (
    <div className="min-h-screen bg-white text-foreground font-sans selection:bg-primary/20 selection:text-primary flex flex-col">
      <SiteHeader />
      <main className="flex-1 pt-16">
        {/* Vision & Mission */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="pt-24 pb-20 md:pt-32 md:pb-28 px-6 md:px-12 max-w-[1600px] mx-auto"
        >
          <div className="max-w-4xl">
            <div className="mb-6 flex items-center gap-4">
              <div className="h-[1px] w-12 bg-foreground"></div>
              <p className="text-xs font-mono tracking-widest uppercase">
                Why we do this work
              </p>
            </div>
            <h1 className="text-4xl md:text-6xl font-serif leading-[1.1] tracking-tight mb-6 text-foreground max-w-3xl">
              Organisations should never lose what they know.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-16">
              Every company runs on knowledge that lives in inboxes, ledgers
              and people's heads. Our research asks a single question: what
              would it take to make that knowledge permanent, verified and
              usable by anyone, human or machine?
            </p>
            <div className="grid md:grid-cols-2 gap-12 md:gap-16">
              <div className="border-l-2 border-foreground/80 pl-6 md:pl-8">
                <h2 className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-4">
                  Our vision
                </h2>
                <p className="text-xl md:text-2xl font-serif leading-snug text-foreground">
                  A world where every organisation has a living, queryable
                  memory of how it operates, so that people and AI can act on
                  verified fact instead of guesswork.
                </p>
              </div>
              <div className="border-l-2 border-foreground/80 pl-6 md:pl-8">
                <h2 className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-4">
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
        </motion.section>

        {/* Research themes */}
        <section className="py-20 md:py-28 px-6 md:px-12 bg-muted/30 border-y border-border">
          <div className="max-w-[1600px] mx-auto">
            <div className="max-w-4xl mb-14">
              <div className="mb-6 flex items-center gap-4">
                <div className="h-[1px] w-12 bg-foreground"></div>
                <p className="text-xs font-mono tracking-widest uppercase">
                  What we study
                </p>
              </div>
              <h2 className="text-3xl md:text-5xl font-serif leading-tight tracking-tight text-foreground">
                Three questions drive the work.
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-6xl">
              {themes.map((t) => (
                <div
                  key={t.title}
                  className="bg-white border border-border rounded-xl p-8"
                >
                  <div className="w-11 h-11 rounded-md bg-muted border border-border flex items-center justify-center mb-6">
                    <t.icon className="text-foreground/70" size={20} />
                  </div>
                  <h3 className="text-lg font-medium mb-3 text-foreground">
                    {t.title}
                  </h3>
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    {t.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Paper */}
        <section className="py-20 md:py-28 px-6 md:px-12 max-w-[1600px] mx-auto">
          <div className="max-w-4xl">
            <div className="mb-6 flex items-center gap-4">
              <div className="h-[1px] w-12 bg-foreground"></div>
              <p className="text-xs font-mono tracking-widest uppercase">
                The research paper
              </p>
            </div>
            <div className="border border-border bg-muted/20 rounded-xl overflow-hidden">
              <div className="p-8 md:p-12">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-11 h-11 rounded-md bg-muted border border-border flex items-center justify-center">
                    <FileText className="text-foreground/70" size={20} />
                  </div>
                  <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground">
                    Olyxee Research · {thesisData.sections.length} sections
                  </span>
                </div>
                <h2 className="text-3xl md:text-5xl font-serif leading-tight tracking-tight mb-6 text-foreground">
                  {thesisData.title}
                </h2>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-8">
                  {thesisData.subtitle}
                </p>
                <p className="text-base md:text-lg text-foreground/80 leading-relaxed max-w-3xl mb-10 border-l-2 border-border pl-6">
                  {thesisData.abstract[0]}
                </p>
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
              <div className="border-t border-border bg-white px-8 md:px-12 py-8">
                <p className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-6">
                  Authors
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {authors.map((a) => (
                    <div key={a.name}>
                      <span className="block font-medium text-foreground">
                        {a.name}
                      </span>
                      <span className="text-sm text-muted-foreground leading-snug">
                        {a.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
