import { motion } from "framer-motion";

const areas = [
  { name: "Claims operations", text: "Connect claims, policies, evidence, and operational state across existing systems." },
  { name: "Claims exceptions", text: "Reason through complex cases while keeping professional judgment and approvals central." },
  { name: "Policy and coverage", text: "Evaluate policy context, coverage rules, and supporting evidence consistently." },
  { name: "Financial reconciliation", text: "Connect financial records and business context to identify discrepancies." },
  { name: "Transaction exceptions", text: "Surface repayment, allocation, and transaction issues for controlled resolution." },
  { name: "Approval workflows", text: "Support traceable decisions and authorised actions within defined boundaries." },
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
          Intelligence across insurance and financial operations.
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
