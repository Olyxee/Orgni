import { motion } from "framer-motion";

export function ProblemSection() {
  const problems = [
    { num: "01", title: "Fragmented knowledge", text: "Critical operational context is scattered across systems, emails, and isolated workflows." },
    { num: "02", title: "Repeated discovery", text: "Every new project or AI agent is forced to rebuild context entirely from scratch." },
    { num: "03", title: "Unclear reality", text: "Conflicting information and hidden dependencies mask the true state of operations." },
    { num: "04", title: "Blind AI execution", text: "AI cannot act safely or reliably without access to trusted, unified organisational context." }
  ];

  return (
    <section className="relative py-24 md:py-32 px-6 md:px-12 bg-secondary/30 border-t border-border">
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-5 lg:col-start-1"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] tracking-tight mb-6">
              Your organisation has data.
              <br />
              <span className="text-muted-foreground">It lacks shared understanding.</span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-medium">
              Without a live operational model, your teams and systems are guessing at reality.
            </p>
          </motion.div>

          <div className="lg:col-span-6 lg:col-start-7">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {problems.map((problem, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="bg-background p-6 rounded-md border border-border shadow-sm hover:border-primary/50 transition-colors"
                >
                  <div className="text-primary font-mono text-sm font-bold mb-4">{problem.num}</div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{problem.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed font-medium">{problem.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}