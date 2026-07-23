export function InfrastructureSection() {
  return (
    <section id="infrastructure" className="py-20 md:py-32 px-6 md:px-12 max-w-screen-xl mx-auto border-b border-border">
      <div className="max-w-3xl mb-16 md:mb-24">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-8">
          Orgni works with the systems you already use
        </h2>
        
        <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
          <p>
            Orgni does not replace document stores, finance platforms, CRMs, workflow tools or collaboration systems.
          </p>
          <p>
            It connects their evidence into a shared organisational model that other applications can use.
          </p>
        </div>
      </div>

      <div className="bg-secondary/10 border border-border rounded-lg p-8 md:p-16">
        <div className="flex flex-col items-center">
          
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-8">
            Existing Systems
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-8 w-full max-w-4xl">
            {['CRM', 'Finance', 'Documents', 'Email', 'Workflows'].map(sys => (
              <div key={sys} className="px-6 py-4 bg-background border border-border rounded-sm text-center min-w-[120px] shadow-sm">
                <span className="font-medium text-foreground">{sys}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-center py-4 h-16 w-px relative">
            <div className="absolute top-0 w-px h-full bg-border"></div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-solid border-t-border border-t-[6px] border-x-transparent border-x-[5px] border-b-0"></div>
          </div>

          <div className="w-full max-w-lg px-8 py-6 bg-primary text-primary-foreground rounded-sm text-center shadow-sm my-4">
            <span className="text-lg font-semibold tracking-wide">Orgni</span>
          </div>

          <div className="flex justify-center py-4 h-16 w-px relative">
            <div className="absolute top-0 w-px h-full bg-border"></div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-solid border-t-border border-t-[6px] border-x-transparent border-x-[5px] border-b-0"></div>
          </div>

          <div className="flex flex-wrap justify-center gap-4 md:gap-8 mt-8 w-full max-w-4xl">
            {['Teams', 'Applications', 'AI agents', 'Automation'].map(sys => (
              <div key={sys} className="px-6 py-4 bg-background border border-border rounded-sm text-center min-w-[140px] shadow-sm">
                <span className="font-medium text-foreground">{sys}</span>
              </div>
            ))}
          </div>
          
        </div>
      </div>
    </section>
  );
}
