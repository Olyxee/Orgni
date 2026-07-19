import { motion, useReducedMotion } from "framer-motion";
import { FileText, Database, Users, ShieldAlert, KanbanSquare, Sparkles } from "lucide-react";

const columns = [
  { name: "Documents", icon: FileText, items: ["Invoices", "Contracts", "SOPs"] },
  { name: "Business systems", icon: Database, items: ["ERP", "CRM", "HRIS"] },
  { name: "People", icon: Users, items: ["Roles", "Teams", "Approvers"] },
  { name: "Policies", icon: ShieldAlert, items: ["Rules", "Limits", "Compliance"] },
  { name: "Projects", icon: KanbanSquare, items: ["Status", "Tasks", "Milestones"] },
  { name: "AI tools", icon: Sparkles, items: ["Prompts", "Agents", "Copilots"] },
];

export function ProblemSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="thesis" className="py-24 md:py-32 border-t border-white/10 bg-background">
      <div className="container max-w-screen-xl px-4 md:px-8 mx-auto">
        <div className="max-w-3xl mb-16 md:mb-24">
          <motion.h2 
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.6 }}
            className="text-3xl md:text-5xl font-bold tracking-tight mb-6"
          >
            Most organisations store information.<br />
            <span className="text-foreground/50">Very few preserve understanding.</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.6, delay: shouldReduceMotion ? 0 : 0.1 }}
            className="text-lg md:text-xl text-foreground/70 leading-relaxed max-w-2xl"
          >
            Every new project begins with interviews, document reviews, system discovery and process mapping. The organisation repeatedly pays to reconstruct knowledge it already possesses.
          </motion.p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 relative">
          {columns.map((col, i) => (
            <motion.div
              key={col.name}
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: shouldReduceMotion ? 0 : i * 0.1 }}
              className="flex flex-col items-center p-6 border border-white/10 bg-background shadow-sm rounded-sm"
            >
              <div className="w-12 h-12 bg-white/5 rounded-sm flex items-center justify-center mb-6">
                <col.icon className="h-5 w-5 text-foreground/70" />
              </div>
              <h3 className="font-mono text-sm font-bold text-foreground mb-4 uppercase text-center">{col.name}</h3>
              <div className="flex flex-col gap-2 w-full">
                {col.items.map((item, j) => (
                  <div key={j} className="h-8 border border-white/10 bg-white/[0.02] flex items-center justify-center text-xs text-foreground/60 font-mono rounded-sm">
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-background/50 hidden md:block"></div>
        </div>
      </div>
    </section>
  );
}