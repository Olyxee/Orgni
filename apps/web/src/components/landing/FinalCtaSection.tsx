import { Button } from "@/components/ui/button";
import { SIGNUP_URL } from "@/lib/links";

export function FinalCtaSection() {
  return (
    <section className="py-32 md:py-48 px-6 md:px-12 text-center bg-background border-b border-border relative overflow-hidden">
      <div className="absolute inset-0 bg-dot-pattern opacity-30 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-16 bg-gradient-to-b from-primary to-transparent" />
      
      <div className="max-w-3xl mx-auto relative z-10">
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-medium tracking-tight text-foreground mb-8 leading-[1.1]">
          See what Orgni can understand about your organisation
        </h2>
        
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-12 max-w-2xl mx-auto">
          Start with one focused operational workflow and see how Orgni connects the documents, entities, obligations, events and exceptions behind it.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="w-full sm:w-auto h-14 px-10 font-medium shadow-none text-base rounded-none">
            <a href={SIGNUP_URL}>
              Request a demonstration
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-14 px-10 font-medium border-border hover:bg-secondary text-base rounded-none">
            <a href="https://www.olyxee.com/contact" target="_blank" rel="noopener noreferrer">
              Discuss a pilot
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
