import { motion } from "framer-motion";

export function UseCaseSection() {
  const outputs = [
    "Active contractual obligations",
    "Invoices without supporting agreements",
    "Payments without matched invoices",
    "Outstanding approvals",
    "Conflicting or missing evidence",
  ];

  return (
    <section
      id="use-cases"
      className="py-24 md:py-32 px-6 md:px-12 bg-secondary/30 border-t border-border scroll-mt-20"
    >
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-5 lg:col-start-1"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-[1.1] tracking-tight">
              Start with contracts, invoices & payments.
            </h2>

            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-medium mb-10">
              Orgni connects obligations, invoices, payments, and counterparties
              into one live model. See what is active, matched, disputed, or
              missing instantly.
            </p>

            <div className="bg-background p-6 rounded-md border border-border shadow-sm">
              <h4 className="text-xs font-bold tracking-widest text-primary uppercase mb-6">
                Visible Outcomes
              </h4>
              <ul className="space-y-4">
                {outputs.map((output, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0"></div>
                    <span className="text-base font-semibold text-foreground">
                      {output}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-6 lg:col-start-7"
          >
            <div className="bg-background rounded-md border border-border shadow-xl overflow-hidden">
              <div className="bg-secondary/50 px-6 py-5 border-b border-border flex justify-between items-center">
                <span className="font-bold text-lg text-foreground tracking-tight">
                  Operational State
                </span>
                <span className="flex items-center gap-2 font-mono text-xs text-primary font-bold uppercase tracking-widest">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  Live Model
                </span>
              </div>

              <div className="p-8 space-y-8">
                {[
                  {
                    label: "Contract",
                    status: "ACTIVE",
                    color: "bg-green-100 text-green-800 border-green-200",
                  },
                  {
                    label: "Obligation",
                    status: "CONDITIONALLY COMPLIANT",
                    color: "bg-amber-100 text-amber-800 border-amber-200",
                  },
                  {
                    label: "Invoice",
                    status: "PENDING_MATCH",
                    color: "bg-secondary text-foreground border-border",
                  },
                  {
                    label: "Payment",
                    status: "MISSING_EVIDENCE",
                    color:
                      "bg-destructive/10 text-destructive border-destructive/20",
                  },
                ].map((item, i) => (
                  <div key={i} className="group">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-mono text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        {item.label}
                      </span>
                      <span
                        className={`px-3 py-1 text-xs font-mono font-bold rounded-sm border ${item.color}`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="h-px w-full bg-border group-hover:bg-primary/30 transition-colors"></div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
