import { motion } from "framer-motion";
import { ArrowUpRight, Check } from "lucide-react";
import { Link } from "wouter";

const valuePoints = [
  "Ingest documents, APIs, databases, and events",
  "Resolve entities, facts, relationships, and timelines",
  "Evaluate rules and detect conflicts or exceptions",
  "Return answers with confidence, evidence, and provenance",
  "Trigger authorised actions through controlled integrations",
  "Flag uncertain results for human review",
];

export function OrgniSection() {
  return (
    <section id="orgni" className="scroll-mt-20">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:py-28 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-serif text-3xl leading-tight tracking-tight md:text-5xl">
            From raw operational data to usable context.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
            One API layer for understanding what happened, what is connected,
            what conflicts, and what your software is allowed to do next.
          </p>
          <Link
            href="/docs"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-primary"
          >
            Explore the API
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </motion.div>

        <ul className="grid gap-3 self-center">
          {valuePoints.map((point, i) => (
            <motion.li
              key={point}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.05 * i }}
              className="flex items-center gap-4 rounded-xl border border-border px-5 py-4"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              <span className="text-base font-medium md:text-lg">{point}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
