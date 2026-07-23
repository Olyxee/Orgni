import { Button } from "@/components/ui/button";
import { SIGNUP_URL } from "@/lib/links";

export function HeroSection() {
  return (
    <section className="pt-24 md:pt-32 pb-20 md:pb-32 px-6 md:px-12 max-w-screen-xl mx-auto">
      <div className="max-w-4xl">
        <div className="inline-flex items-center px-3 py-1 mb-8 rounded-full bg-secondary text-secondary-foreground text-xs font-medium tracking-wide">
          Organisational intelligence infrastructure developed by Olyxee.
        </div>
        
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground leading-[1.1] mb-8">
          Build AI on top of how your organisation actually works
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mb-10">
          A live, evidence-backed model of your people, processes, systems, policies and obligations — trusted context for teams, applications and AI agents.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-20 md:mb-32">
          <Button asChild size="lg" className="w-full sm:w-auto h-12 px-8 font-medium shadow-none">
            <a href={SIGNUP_URL}>
              Request a demonstration
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 font-medium border-border hover:bg-secondary">
            <a href="#platform">
              See how Orgni works
            </a>
          </Button>
        </div>
        
        {/* Architecture Visual */}
        <div className="relative pt-12 mt-12 border-t border-border/50">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-4 text-xs font-medium text-muted-foreground tracking-widest uppercase">
            System Architecture
          </div>
          
          <div className="flex flex-col items-center max-w-2xl mx-auto">
            {/* Top Layer */}
            <div className="w-full p-6 bg-secondary/30 rounded-lg border border-border flex justify-center">
              <span className="text-sm font-medium text-foreground">Documents, systems and operational events</span>
            </div>
            
            {/* Arrow */}
            <div className="h-8 w-px bg-border my-2 relative">
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-solid border-t-border border-t-[6px] border-x-transparent border-x-[5px] border-b-0"></div>
            </div>
            
            {/* Middle Layer (Orgni) */}
            <div className="w-full sm:w-3/4 p-6 bg-primary text-primary-foreground rounded-lg shadow-sm flex justify-center">
              <span className="text-base font-semibold tracking-wide">Orgni</span>
            </div>
            
            {/* Arrow */}
            <div className="h-8 w-px bg-border my-2 relative">
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-solid border-t-border border-t-[6px] border-x-transparent border-x-[5px] border-b-0"></div>
            </div>
            
            {/* Bottom Layer */}
            <div className="w-full p-6 bg-secondary/30 rounded-lg border border-border flex justify-center">
              <span className="text-sm font-medium text-foreground">Teams, applications and AI agents</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
