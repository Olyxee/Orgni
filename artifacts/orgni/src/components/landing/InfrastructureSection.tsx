import { motion } from "framer-motion";

export function InfrastructureSection() {
  return (
    <section id="infrastructure" className="py-24 md:py-32 px-6 md:px-12 bg-background border-t border-border scroll-mt-20">
      <div className="max-w-[1600px] mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] tracking-tight max-w-4xl">
            The connective tissue between systems and execution.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Input */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="p-8 lg:p-10 rounded-md bg-secondary/30 border border-border flex flex-col h-full"
          >
            <div className="mb-8">
              <span className="font-mono text-xs font-bold text-primary uppercase tracking-widest block mb-6">01 / Existing Systems</span>
              <div className="space-y-4">
                {['Contracts', 'Invoices', 'Proofs of Payment', 'Policies', 'Statements'].map(sys => (
                  <div key={sys} className="text-xl font-semibold text-foreground pb-4 border-b border-border/50">
                    {sys}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-auto pt-8">
              <p className="text-base font-medium text-muted-foreground leading-relaxed">
                Ingest operational evidence from your current stack without requiring full migration.
              </p>
            </div>
          </motion.div>

          {/* Center Column: Orgni */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="p-8 lg:p-10 rounded-md bg-foreground text-background border border-foreground flex flex-col h-full relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
            <div className="mb-8">
              <span className="font-mono text-xs font-bold text-muted uppercase tracking-widest block mb-6">02 / The Model</span>
              <h3 className="text-5xl font-bold mb-8 tracking-tight">Orgni</h3>
              <ul className="space-y-4 font-mono text-sm font-bold uppercase tracking-wider text-background/90">
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-primary rounded-full"></div> Graph Resolution</li>
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-primary rounded-full"></div> State Inference</li>
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-primary rounded-full"></div> Policy Evaluation</li>
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-primary rounded-full"></div> Evidence Linking</li>
              </ul>
            </div>
            <div className="mt-auto pt-8">
              <p className="text-base font-medium text-background/80 leading-relaxed">
                Synthesizes raw inputs into a unified, live operational graph of your business reality.
              </p>
            </div>
          </motion.div>

          {/* Right Column: Output */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="p-8 lg:p-10 rounded-md bg-secondary/30 border border-border flex flex-col h-full"
          >
            <div className="mb-8">
              <span className="font-mono text-xs font-bold text-primary uppercase tracking-widest block mb-6">03 / Execution Layer</span>
              <div className="space-y-4">
                {['Operations Teams', 'Internal Applications', 'AI Agents', 'Automations'].map(sys => (
                  <div key={sys} className="text-xl font-semibold text-foreground pb-4 border-b border-border/50">
                    {sys}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-auto pt-8">
              <p className="text-base font-medium text-muted-foreground leading-relaxed">
                Provide trusted context via API or interface so consumers act on reality, not assumptions.
              </p>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}