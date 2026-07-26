import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { LOGIN_URL } from "@/lib/links";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function HeroSection() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative pt-24 pb-16 md:pt-40 md:pb-32 px-6 md:px-12 max-w-[1600px] mx-auto overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="lg:col-span-7 relative z-10"
        >
          <div className="mb-6 flex items-center gap-4">
            <div className="h-[2px] w-8 bg-primary"></div>
            <p className="text-sm font-bold tracking-wide text-primary uppercase">
              Operational Intelligence
            </p>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight text-foreground mb-8">
            Build AI on top of how your organisation{" "}
            <span className={`draw-underline ${mounted ? "active" : ""}`}>
              actually works
            </span>
          </h1>

          <p className="text-lg md:text-xl text-foreground/80 leading-relaxed max-w-2xl mb-10 font-medium">
            A live, evidence-backed model of your people, processes, systems,
            policies and obligations: trusted context for teams, applications
            and AI agents.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto h-14 px-8 font-bold shadow-sm rounded-md text-base bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <a href={LOGIN_URL}>Request a demonstration</a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto h-14 px-8 font-bold border-border text-foreground hover:bg-secondary rounded-md text-base transition-colors"
            >
              <Link href="/platform">See how Orgni works</Link>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="lg:col-span-5 relative mt-12 lg:mt-0"
        >
          <div className="relative w-full aspect-[4/3] md:aspect-auto md:h-[600px] bg-muted rounded-xl overflow-hidden flex items-center justify-center border border-border shadow-lg">
            {/* Architectural structural lines - subtle */}
            <div className="absolute inset-0 pointer-events-none opacity-50">
              <div className="absolute left-1/3 top-0 bottom-0 w-[1px] bg-border/60"></div>
              <div className="absolute left-2/3 top-0 bottom-0 w-[1px] bg-border/60"></div>
              <div className="absolute top-1/3 left-0 right-0 h-[1px] bg-border/60"></div>
              <div className="absolute top-2/3 left-0 right-0 h-[1px] bg-border/60"></div>
            </div>

            {/* Full-colour product screenshot as texture */}
            <div className="absolute inset-0 bg-[url('/orgni-product-ui.png')] bg-cover bg-left-top"></div>

            <div className="absolute bottom-6 right-6 bg-background/95 backdrop-blur-md p-5 border border-border shadow-xl rounded-md max-w-[260px]">
              <div className="text-[10px] font-mono text-primary font-bold uppercase tracking-widest mb-3 border-b border-border pb-2">
                Event Stream Live
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0 animate-pulse"></div>
                  <div className="text-xs font-mono font-bold text-foreground">
                    SUPPLIER_COMPLIANCE_UPDATED
                  </div>
                </div>
                <div className="flex items-start gap-3 opacity-60">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground mt-1 shrink-0"></div>
                  <div className="text-xs font-mono font-medium text-foreground">
                    INVOICE_MATCHED
                  </div>
                </div>
                <div className="flex items-start gap-3 opacity-40">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground mt-1 shrink-0"></div>
                  <div className="text-xs font-mono font-medium text-foreground">
                    POLICY_VIOLATION_DETECTED
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
