import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { LOGIN_URL } from "@/lib/links";
import { useEffect, useState } from "react";

export function HeroSection() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative pt-24 pb-16 md:pt-40 md:pb-32 px-6 md:px-12 max-w-[1600px] mx-auto overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        <div className="lg:col-span-7 relative z-10">
          <div className="mb-6 flex items-center gap-4">
            <div className="h-[1px] w-12 bg-foreground"></div>
            <p className="text-sm font-medium tracking-wide">Olyxee Infrastructure</p>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold leading-[1.08] tracking-tight text-foreground mb-8">
            Build AI on top of how your organisation <span className={`draw-underline ${mounted ? 'active' : ''}`}>actually works</span>
          </h1>
          
          <p className="text-lg md:text-xl text-foreground/80 leading-relaxed max-w-2xl mb-12">
            A live, evidence-backed model of your people, processes, systems, policies and obligations: trusted context for teams, applications and AI agents.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto h-14 px-8 font-medium shadow-none rounded-none text-base">
              <a href={LOGIN_URL}>
                Request a demonstration
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 font-medium border-foreground text-foreground hover:bg-foreground hover:text-background rounded-none text-base transition-colors">
              <Link href="/platform">
                See how Orgni works
              </Link>
            </Button>
          </div>
        </div>

        <div className="lg:col-span-5 relative mt-12 lg:mt-0">
          <div className="relative w-full aspect-[4/3] md:aspect-auto md:h-[600px] bg-muted overflow-hidden flex items-center justify-center">
            {/* Architectural structural lines */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/3 top-0 bottom-0 w-[1px] bg-border/60"></div>
              <div className="absolute left-2/3 top-0 bottom-0 w-[1px] bg-border/60"></div>
              <div className="absolute top-1/3 left-0 right-0 h-[1px] bg-border/60"></div>
              <div className="absolute top-2/3 left-0 right-0 h-[1px] bg-border/60"></div>
            </div>
            
            {/* We'll use the product screenshot as a texture */}
            <div className="absolute inset-0 bg-[url('/orgni-product-ui.png')] bg-cover bg-left-top"></div>
            
            <div className="absolute bottom-6 right-6 bg-background/95 backdrop-blur-sm p-4 border border-border shadow-sm max-w-[240px]">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2 border-b border-border pb-2">Event Stream</div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0"></div>
                  <div className="text-xs font-mono">SUPPLIER_COMPLIANCE_STATUS_CHANGED</div>
                </div>
                <div className="flex items-start gap-2 opacity-50">
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground mt-1 shrink-0"></div>
                  <div className="text-xs font-mono">INVOICE_MATCHED</div>
                </div>
                <div className="flex items-start gap-2 opacity-50">
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground mt-1 shrink-0"></div>
                  <div className="text-xs font-mono">POLICY_VIOLATION_DETECTED</div>
                </div>
              </div>
            </div>
            
            <div className="absolute top-6 left-6 bg-foreground text-background px-3 py-1 text-xs font-mono uppercase tracking-widest">
              Live System
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
