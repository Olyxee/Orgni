import { Button } from "@/components/ui/button";
import { LOGIN_URL } from "@/lib/links";

export function FinalCtaSection() {
  return (
    <section className="relative py-32 md:py-48 px-6 md:px-12 bg-background border-t border-border overflow-hidden">
      <div className="absolute inset-0 bg-secondary/20 -z-10"></div>
      
      <div className="max-w-[1600px] mx-auto text-center relative z-10 flex flex-col items-center">
        <h2 className="text-5xl md:text-7xl lg:text-[6rem] font-serif text-foreground leading-[1] tracking-tight mb-10 max-w-4xl mx-auto">
          Operate on reality.
        </h2>
        
        <p className="text-xl md:text-2xl text-muted-foreground leading-snug font-light max-w-2xl mb-16">
          Equip your teams and AI agents with a trusted, live model of your organisation.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
          <Button asChild size="lg" className="w-full sm:w-auto h-16 px-10 font-medium shadow-none rounded-none text-lg">
            <a href={LOGIN_URL}>
              Request a demonstration
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-16 px-10 font-medium border-foreground text-foreground hover:bg-foreground hover:text-background rounded-none text-lg transition-colors bg-transparent">
            <a href="mailto:hello@olyxee.com">
              Contact Sales
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
