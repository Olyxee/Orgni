export function InfrastructureSection() {
  return (
    <section id="infrastructure" className="py-24 md:py-32 px-6 md:px-12 max-w-screen-xl mx-auto scroll-mt-20">
      <div className="max-w-3xl mb-16 md:mb-24">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px w-8 bg-primary"></div>
          <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground">
            Architecture
          </span>
        </div>

        <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight text-foreground mb-8 leading-[1.1]">
          Orgni works with the systems you already use
        </h2>
        
        <div className="space-y-6 text-lg text-muted-foreground leading-relaxed pl-6 border-l-2 border-border">
          <p>
            Orgni does not replace document stores, finance platforms, CRMs, workflow tools or collaboration systems.
          </p>
          <p>
            It connects their evidence into a shared organisational model that other applications can use.
          </p>
        </div>
      </div>

      <div className="bg-secondary/20 border border-border p-8 md:p-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-dot-pattern opacity-40 pointer-events-none"></div>
        <div className="flex flex-col items-center relative z-10">
          
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-8 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-primary"></div> Existing Systems
          </div>
          
          <div className="flex flex-wrap justify-center gap-px bg-border mb-0 w-full max-w-4xl border border-border">
            {['CRM', 'Finance', 'Documents', 'Email', 'Workflows'].map(sys => (
              <div key={sys} className="flex-1 px-6 py-6 bg-background text-center min-w-[120px] hover:bg-secondary/30 transition-colors">
                <span className="font-mono text-sm uppercase tracking-wider text-foreground">{sys}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-center py-0 h-16 w-px relative">
            <div className="absolute top-0 w-px h-full bg-border"></div>
            <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-border"></div>
          </div>

          <div className="w-full max-w-lg px-8 py-6 bg-foreground text-background text-center shadow-md relative border border-border hover:border-primary/50 transition-colors">
            <div className="absolute left-0 top-0 w-1 h-full bg-primary"></div>
            <span className="text-lg font-mono tracking-widest uppercase font-semibold">Orgni</span>
          </div>

          <div className="flex justify-center py-0 h-16 w-px relative">
            <div className="absolute top-0 w-px h-full bg-border"></div>
            <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-border"></div>
          </div>

          <div className="flex flex-wrap justify-center gap-px bg-border mt-0 w-full max-w-4xl border border-border">
            {['Teams', 'Applications', 'AI agents', 'Automation'].map(sys => (
              <div key={sys} className="flex-1 px-6 py-6 bg-background text-center min-w-[140px] hover:bg-secondary/30 transition-colors">
                <span className="font-mono text-sm uppercase tracking-wider text-foreground">{sys}</span>
              </div>
            ))}
          </div>
          
        </div>
      </div>
    </section>
  );
}
