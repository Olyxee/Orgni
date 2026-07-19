import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const before = [
  "Scattered documents",
  "Repeated discovery",
  "Disconnected systems",
  "Knowledge held by individuals",
  "AI without organisational context",
  "Outdated process diagrams"
];

const after = [
  "Living organisational context",
  "Reusable understanding",
  "Connected evidence",
  "Persistent operational memory",
  "Context-ready AI systems",
  "Continuously updated workflows"
];

export function BeforeAfterSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="py-24 md:py-32 bg-background border-t border-white/10">
      <div className="container max-w-screen-xl px-4 md:px-8 mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 relative">
          {/* Before */}
          <div className="relative z-10">
            <h2 className="font-mono text-sm font-bold text-foreground/50 mb-8 uppercase tracking-widest border-b border-white/10 pb-4">
              Before Orgni
            </h2>
            <ul className="space-y-6">
              {before.map((item, i) => (
                <motion.li 
                  key={item}
                  initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: shouldReduceMotion ? 0 : i * 0.1 }}
                  className="text-lg md:text-xl text-foreground/60 font-medium"
                >
                  {item}
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Separator / transition graphic on Desktop */}
          <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 items-center justify-center bg-background border border-white/10 rounded-full z-20">
            <ArrowRight className="w-5 h-5 text-primary" />
          </div>

          {/* After */}
          <div className="relative z-10">
            <h2 className="font-mono text-sm font-bold text-primary mb-8 uppercase tracking-widest border-b border-primary/20 pb-4">
              With Orgni
            </h2>
            <ul className="space-y-6">
              {after.map((item, i) => (
                <motion.li 
                  key={item}
                  initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: shouldReduceMotion ? 0 : i * 0.1 }}
                  className="text-lg md:text-xl text-foreground font-bold flex items-center"
                >
                  {item}
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}