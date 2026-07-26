import { Button } from "@/components/ui/button";
import { LOGIN_URL } from "@/lib/links";
import { motion } from "framer-motion";

export function FinalCtaSection() {
  return (
    <section className="relative py-32 md:py-48 px-6 md:px-12 bg-foreground text-background overflow-hidden border-t border-border">
      {/* Subtle background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl aspect-[2/1] bg-primary/20 blur-[100px] rounded-[100%] pointer-events-none opacity-50"></div>

      <div className="max-w-[1200px] mx-auto text-center relative z-10 flex flex-col items-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-5xl md:text-7xl lg:text-[6rem] font-bold leading-[1.05] tracking-tight mb-8"
        >
          Operate on <span className="text-primary">reality.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-xl md:text-2xl text-background/80 leading-relaxed font-medium max-w-2xl mb-12"
        >
          Equip your teams and AI agents with a trusted, live model of your
          organisation.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full"
        >
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto h-16 px-10 font-bold shadow-none rounded-md text-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <a href={LOGIN_URL}>Request a demonstration</a>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full sm:w-auto h-16 px-10 font-bold border-background/30 text-background hover:bg-background hover:text-foreground rounded-md text-lg transition-colors bg-transparent"
          >
            <a href="mailto:hello@olyxee.com">Contact Sales</a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
