import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SIGNUP_URL } from "@/lib/links";

export function ClosingSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="py-32 md:py-48 bg-background border-t border-white/10 text-center px-4">
      <div className="container max-w-3xl mx-auto">
        <motion.h2 
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.6 }}
          className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-8"
        >
          An organisation should not have to rediscover itself.
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.6, delay: shouldReduceMotion ? 0 : 0.1 }}
          className="text-lg md:text-xl text-foreground/70 mb-12 max-w-2xl mx-auto leading-relaxed"
        >
          Orgni preserves how your organisation works so people, systems and AI can build on shared understanding.
        </motion.p>
        <motion.div 
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.6, delay: shouldReduceMotion ? 0 : 0.2 }}
          className="flex flex-col sm:flex-row justify-center items-center gap-4"
        >
          <Button
            size="lg"
            onClick={() => window.location.href = SIGNUP_URL}
            className="w-full sm:w-auto h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground text-base font-medium rounded-sm shadow-md transition-all hover:shadow-lg"
          >
            Request access
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => window.location.href = "https://www.olyxee.com/contact"}
            className="w-full sm:w-auto h-14 px-8 border-white/10 hover:bg-white/5 text-foreground text-base font-medium rounded-sm transition-all"
          >
            Talk to Olyxee
          </Button>
        </motion.div>
      </div>
    </section>
  );
}