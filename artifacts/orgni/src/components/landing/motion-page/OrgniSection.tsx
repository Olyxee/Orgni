import { motion } from "framer-motion";
import { ArrowUpRight, Check } from "lucide-react";
import { Link } from "wouter";
import { ORGNI_PRODUCT_URL } from "@/lib/links";

const valuePoints = [
  "Connect to existing systems, APIs, and operational events",
  "Understand entities, relationships, rules, and current state",
  "Reason through evidence, constraints, and uncertainty",
  "Support permitted decisions within defined boundaries",
  "Execute authorised actions through controlled integrations",
  "Learn from outcomes and feedback within defined limits",
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
            Connect. Understand. Reason. Decide. Execute. Learn.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
            Build on an intelligence layer that works with existing operational
            infrastructure. Core systems remain in place and under customer control.
          </p>
          <Link
            href={ORGNI_PRODUCT_URL}
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-primary"
          >
            Explore Orgni
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
