import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const steps = [
  {
    title: "Connect",
    desc: "Bring in documents, systems, workflow events and organisational knowledge."
  },
  {
    title: "Interpret",
    desc: "Identify entities, relationships, rules, events and evidence."
  },
  {
    title: "Model",
    desc: "Build a queryable representation of how the organisation operates."
  },
  {
    title: "Update",
    desc: "Keep the model current as operations and decisions change."
  },
  {
    title: "Activate",
    desc: "Make organisational context available to teams, applications and AI systems."
  }
];

export function HowItWorksSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="how-it-works" className="py-24 md:py-32 bg-background border-t border-white/10">
      <div className="container max-w-screen-xl px-4 md:px-8 mx-auto">
        <div className="max-w-3xl mb-16 md:mb-24">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
            How Orgni works.
          </h2>
        </div>

        <div className="relative">
          <div className="flex flex-col md:flex-row justify-between relative z-10">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: shouldReduceMotion ? 0 : index * 0.1 }}
                className="flex-1 flex flex-col items-start relative px-4 md:px-2 py-6 md:py-0 border-l md:border-l-0 md:border-t-2 border-white/10 md:pt-6 group hover:border-primary transition-colors"
              >
                <h3 className="font-mono text-sm font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {index + 1}. {step.title}
                </h3>
                <p className="text-sm text-foreground/70 leading-relaxed max-w-[200px]">
                  {step.desc}
                </p>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-0 -right-3 -mt-[11px] text-white/20">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}