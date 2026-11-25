import { motion } from "framer-motion";

const areas = [
  { name: "Claims context", text: "Link claims, policies, parties, evidence, and timelines." },
  { name: "Coverage reasoning", text: "Evaluate policy rules against the evidence in a case." },
  { name: "Claims exceptions", text: "Detect conflicts, missing evidence, and uncertain outcomes." },
  { name: "Reconciliation", text: "Match transactions, invoices, repayments, and ledger records." },
  { name: "Financial exceptions", text: "Surface discrepancies with evidence and confidence." },
  { name: "Controlled actions", text: "Route approvals and execute only permitted system actions." },
];

export function UseCasesSection() {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl font-serif text-3xl leading-tight tracking-tight md:text-5xl"
        >
          Built for the hard parts of insurance and finance.
        </motion.h2>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area, i) => (
            <motion.div
              key={area.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.06 * i }}
              className="rounded-2xl bg-muted/50 p-6 md:p-7"
            >
              <h3 className="text-xl font-medium">{area.name}</h3>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                {area.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
