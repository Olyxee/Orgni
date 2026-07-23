import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { SIGNUP_URL } from "@/lib/links";

export function HeroSection() {
  return (
    <section className="relative pt-24 md:pt-32 pb-20 md:pb-32 px-6 md:px-12 max-w-screen-xl mx-auto overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern [mask-image:linear-gradient(to_bottom,white,transparent)] -z-10 pointer-events-none opacity-50" />
      
      <div className="max-w-4xl relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px w-8 bg-primary"></div>
          <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground">
            Organisational intelligence infrastructure developed by Olyxee.
          </span>
        </div>
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-medium tracking-tight text-foreground leading-[1.05] mb-8">
          Build AI on top of how your organisation <span className="relative inline-block"><span className="relative z-10">actually works</span><span className="absolute bottom-1 left-0 w-full h-3 bg-primary/20 -z-10"></span></span>
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mb-10 border-l-2 border-border pl-6">
          A live, evidence-backed model of your people, processes, systems, policies and obligations: trusted context for teams, applications and AI agents.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-20 md:mb-32">
          <Button asChild size="lg" className="w-full sm:w-auto h-12 px-8 font-medium shadow-none rounded-none">
            <a href={SIGNUP_URL}>
              Request a demonstration
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 font-medium border-border hover:bg-secondary rounded-none">
            <Link href="/platform">
              See how Orgni works
            </Link>
          </Button>
        </div>
        
        {/* Architecture Visual */}
        <div className="relative pt-16 mt-12 border-t border-border">
          <div className="absolute top-0 left-0 -translate-y-1/2 flex items-center gap-3 bg-background pr-4">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">
              System Architecture
            </span>
          </div>
          
          <div className="flex flex-col items-center max-w-2xl mx-auto">
            {/* Top Layer */}
            <div className="w-full p-6 bg-background border border-border flex justify-center relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-border"></div>
              <span className="text-sm font-mono uppercase tracking-wider text-muted-foreground">Documents, systems and operational events</span>
            </div>
            
            {/* Arrow/Connection */}
            <div className="h-12 w-px bg-border my-0 relative flex justify-center">
              <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-border"></div>
            </div>
            
            {/* Middle Layer (Orgni) */}
            <div className="w-full sm:w-3/4 p-6 bg-foreground text-background flex justify-center relative shadow-xl">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
              <span className="text-base font-mono uppercase tracking-widest font-semibold">Orgni</span>
            </div>
            
            {/* Arrow/Connection */}
            <div className="h-12 w-px bg-border my-0 relative flex justify-center">
              <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-border"></div>
            </div>
            
            {/* Bottom Layer */}
            <div className="w-full p-6 bg-background border border-border flex justify-center relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-border"></div>
              <span className="text-sm font-mono uppercase tracking-wider text-muted-foreground">Teams, applications and AI agents</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
