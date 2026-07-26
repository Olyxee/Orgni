export function InfrastructureSection() {
  return (
    <section id="infrastructure" className="py-24 md:py-40 px-6 md:px-12 max-w-[1600px] mx-auto border-t border-border scroll-mt-20">
      <div className="mb-20">
        <h2 className="text-4xl md:text-5xl lg:text-7xl font-serif text-foreground leading-[1.05] max-w-4xl">
          The connective tissue between systems and execution.
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-y border-border divide-y lg:divide-y-0 lg:divide-x divide-border">
        
        {/* Left Column: Input */}
        <div className="p-8 lg:p-12 xl:p-16 flex flex-col justify-between min-h-[400px]">
          <div>
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest block mb-8">01 / Existing Systems</span>
            <div className="space-y-4">
              {['CRM', 'Finance', 'Documents', 'Email', 'Workflows'].map(sys => (
                <div key={sys} className="text-xl md:text-2xl font-light text-foreground pb-4 border-b border-border/50">
                  {sys}
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-12 max-w-xs">
            Orgni ingests signals, documents and states from your current stack without requiring migration.
          </p>
        </div>

        {/* Center Column: Orgni */}
        <div className="p-8 lg:p-12 xl:p-16 bg-foreground text-background flex flex-col justify-between min-h-[400px] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
          <div>
            <span className="font-mono text-xs text-background/60 uppercase tracking-widest block mb-8">02 / The Model</span>
            <h3 className="text-5xl md:text-6xl font-serif mb-6">Orgni</h3>
            <ul className="space-y-2 font-mono text-sm uppercase tracking-wider text-background/80">
              <li>↳ Graph Resolution</li>
              <li>↳ State Inference</li>
              <li>↳ Policy Evaluation</li>
              <li>↳ Evidence Linking</li>
            </ul>
          </div>
          <p className="text-sm text-background/60 mt-12 max-w-xs">
            Synthesizes raw inputs into a unified, live operational graph of your business reality.
          </p>
        </div>

        {/* Right Column: Output */}
        <div className="p-8 lg:p-12 xl:p-16 flex flex-col justify-between min-h-[400px] bg-secondary/30">
          <div>
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest block mb-8">03 / Execution Layer</span>
            <div className="space-y-4">
              {['Teams', 'Applications', 'AI agents', 'Automation'].map(sys => (
                <div key={sys} className="text-xl md:text-2xl font-light text-foreground pb-4 border-b border-border/50">
                  {sys}
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-12 max-w-xs">
            Provides trusted context via API or interface so consumers act on reality, not assumptions.
          </p>
        </div>

      </div>
    </section>
  );
}
