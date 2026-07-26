import { Button } from "@/components/ui/button";
import { LOGIN_URL } from "@/lib/links";
import { motion } from "framer-motion";

export function FinalCtaSection() {
  return (
    <section className="relative py-20 md:py-28 px-6 md:px-12 bg-background overflow-hidden border-t border-border">
      <div className="max-w-[1200px] mx-auto text-center relative z-10 flex flex-col items-center bg-muted/60 border border-border rounded-2xl px-6 md:px-16 py-16 md:py-24 shadow-sm">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-5xl md:text-7xl lg:text-[6rem] font-bold leading-[1.05] tracking-tight mb-8 text-foreground"
        >
          Operate on <span className="text-primary">reality.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-xl md:text-2xl text-muted-foreground leading-relaxed font-medium max-w-2xl mb-12"
        >
          One question, one answer, one source of truth. Give your teams and
          AI a live model of your organisation they can trust.
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
            className="w-full sm:w-auto h-16 px-10 font-bold border-border text-foreground hover:bg-secondary rounded-md text-lg transition-colors bg-background"
          >
            <a href="mailto:hello@olyxee.com">Contact Sales</a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
