import { motion, useReducedMotion } from "framer-motion";

const outcomes = [
  "Faster organisational discovery",
  "Lower dependency on repeated consulting exercises",
  "Clearer visibility into operational bottlenecks",
  "Better understanding of change impact",
  "Traceable decisions and evidence",
  "A reusable context layer for future AI systems",
];

export function EnterpriseSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="enterprise" className="py-24 md:py-32 bg-background border-t border-white/10">
      <div className="container max-w-screen-xl px-4 md:px-8 mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div className="max-w-xl">
            <motion.h2 
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.6 }}
              className="text-3xl md:text-5xl font-bold tracking-tight mb-8"
            >
              Stop remapping the organisation for every transformation.
            </motion.h2>
            <motion.div 
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.6, delay: shouldReduceMotion ? 0 : 0.1 }}
              className="w-16 h-1 bg-primary mb-8 rounded-sm"
            />
          </div>

          <div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
              {outcomes.map((outcome, i) => (
                <motion.li 
                  key={i}
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: shouldReduceMotion ? 0 : i * 0.1 }}
                  className="flex items-start"
                >
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0 mr-4" />
                  <span className="text-foreground/80 leading-relaxed text-sm md:text-base">
                    {outcome}
                  </span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}