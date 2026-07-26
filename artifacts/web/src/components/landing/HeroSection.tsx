import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { LOGIN_URL } from "@/lib/links";
import { motion } from "framer-motion";
import { Calculator } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative pt-24 pb-16 md:pt-40 md:pb-32 px-6 md:px-12 overflow-hidden">
      {/* Orange waves crossing through the background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <svg
          className="w-full h-full"
          viewBox="0 0 1440 800"
          preserveAspectRatio="none"
          fill="none"
        >
          {/* Broad wave band sweeping through the middle */}
          <path
            d="M0 420 C 240 300, 480 540, 720 420 C 960 300, 1200 540, 1440 400 L 1440 560 C 1200 690, 960 460, 720 580 C 480 700, 240 470, 0 590 Z"
            fill="hsl(var(--primary))"
            opacity="0.05"
          >
            <animate
              attributeName="d"
              dur="12s"
              repeatCount="indefinite"
              values="M0 420 C 240 300, 480 540, 720 420 C 960 300, 1200 540, 1440 400 L 1440 560 C 1200 690, 960 460, 720 580 C 480 700, 240 470, 0 590 Z;
                      M0 460 C 240 350, 480 480, 720 380 C 960 290, 1200 580, 1440 440 L 1440 600 C 1200 640, 960 510, 720 610 C 480 660, 240 520, 0 550 Z;
                      M0 420 C 240 300, 480 540, 720 420 C 960 300, 1200 540, 1440 400 L 1440 560 C 1200 690, 960 460, 720 580 C 480 700, 240 470, 0 590 Z"
            />
          </path>
          {/* Second offset band for depth */}
          <path
            d="M0 500 C 260 390, 520 610, 780 490 C 1040 375, 1240 590, 1440 480 L 1440 600 C 1240 700, 1040 500, 780 610 C 520 720, 260 520, 0 630 Z"
            fill="hsl(var(--primary))"
            opacity="0.07"
          >
            <animate
              attributeName="d"
              dur="15s"
              repeatCount="indefinite"
              values="M0 500 C 260 390, 520 610, 780 490 C 1040 375, 1240 590, 1440 480 L 1440 600 C 1240 700, 1040 500, 780 610 C 520 720, 260 520, 0 630 Z;
                      M0 540 C 260 450, 520 550, 780 450 C 1040 360, 1240 630, 1440 520 L 1440 640 C 1240 660, 1040 560, 780 650 C 520 690, 260 580, 0 590 Z;
                      M0 500 C 260 390, 520 610, 780 490 C 1040 375, 1240 590, 1440 480 L 1440 600 C 1240 700, 1040 500, 780 610 C 520 720, 260 520, 0 630 Z"
            />
          </path>
          {/* Crisp wave lines crossing the whole hero */}
          <path
            d="M0 380 C 240 260, 480 500, 720 380 C 960 260, 1200 500, 1440 360"
            stroke="hsl(var(--primary))"
            strokeWidth="2.5"
            opacity="0.35"
          >
            <animate
              attributeName="d"
              dur="10s"
              repeatCount="indefinite"
              values="M0 380 C 240 260, 480 500, 720 380 C 960 260, 1200 500, 1440 360;
                      M0 340 C 240 320, 480 420, 720 420 C 960 320, 1200 440, 1440 400;
                      M0 380 C 240 260, 480 500, 720 380 C 960 260, 1200 500, 1440 360"
            />
          </path>
          <path
            d="M0 440 C 240 320, 480 560, 720 440 C 960 320, 1200 560, 1440 420"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            opacity="0.22"
          >
            <animate
              attributeName="d"
              dur="13s"
              repeatCount="indefinite"
              values="M0 440 C 240 320, 480 560, 720 440 C 960 320, 1200 560, 1440 420;
                      M0 480 C 240 380, 480 480, 720 480 C 960 400, 1200 500, 1440 460;
                      M0 440 C 240 320, 480 560, 720 440 C 960 320, 1200 560, 1440 420"
            />
          </path>
          <path
            d="M0 520 C 260 410, 520 630, 780 510 C 1040 395, 1240 610, 1440 500"
            stroke="hsl(var(--primary))"
            strokeWidth="1.5"
            opacity="0.14"
          >
            <animate
              attributeName="d"
              dur="17s"
              repeatCount="indefinite"
              values="M0 520 C 260 410, 520 630, 780 510 C 1040 395, 1240 610, 1440 500;
                      M0 560 C 260 470, 520 560, 780 560 C 1040 460, 1240 560, 1440 540;
                      M0 520 C 260 410, 520 630, 780 510 C 1040 395, 1240 610, 1440 500"
            />
          </path>
        </svg>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center max-w-[1600px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="lg:col-span-7 relative z-10"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.05] tracking-tight text-foreground mb-8">
            Ask anything about your{" "}
            <span className="relative inline-block whitespace-nowrap">
              <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
                finances
              </span>
              {/* Hand-drawn green highlight sweep */}
              <svg
                className="absolute -bottom-2 left-0 w-full h-4"
                viewBox="0 0 300 20"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M4 14 C 60 6, 150 4, 296 10"
                  stroke="#10b981"
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.35"
                />
              </svg>
              {/* Floating calculator chip */}
              <motion.span
                initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                animate={{ opacity: 1, scale: 1, rotate: 8 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 12 }}
                className="absolute -top-5 -right-8 md:-top-7 md:-right-12"
                aria-hidden="true"
              >
                <motion.span
                  animate={{ y: [0, -6, 0], rotate: [8, 12, 8] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                  className="flex items-center justify-center h-10 w-10 md:h-14 md:w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 ring-4 ring-white"
                >
                  <Calculator className="h-5 w-5 md:h-7 md:w-7 text-white" />
                </motion.span>
              </motion.span>
            </span>
            . Get one answer you can trust.
          </h1>

          <p className="text-lg md:text-xl text-foreground/80 leading-relaxed max-w-2xl mb-10 font-medium">
            Orgni connects your contracts, invoices, payments and approvals
            into one live picture of your operations — so your team and your
            AI always know what&apos;s true, and where it came from.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto h-14 px-8 font-bold shadow-sm rounded-md text-base bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <a href={LOGIN_URL}>Request demo</a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto h-14 px-8 font-bold border-border text-foreground hover:bg-secondary rounded-md text-base transition-colors"
            >
              <a href={LOGIN_URL}>Join the waiting list</a>
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
