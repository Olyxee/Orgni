export function UseCaseSection() {
  const outputs = [
    "Active contractual obligations",
    "Invoices without supporting agreements",
    "Payments without matched invoices",
    "Outstanding approvals",
    "Conflicting or missing evidence",
    "Complete operational timelines"
  ];

  return (
    <section id="use-cases" className="py-24 md:py-32 px-6 md:px-12 max-w-screen-xl mx-auto scroll-mt-20">
      <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-start">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-8 bg-primary"></div>
            <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground">
              Commercial Context
            </span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight text-foreground mb-8 leading-[1.1]">
            Start with contracts, invoices and payments
          </h2>
          
          <div className="space-y-6 text-lg text-muted-foreground leading-relaxed mb-16 pl-6 border-l-2 border-border">
            <p>
              Orgni connects contracts, obligations, invoices, payments and counterparties into one operational model.
            </p>
            <p>
              See what is active, outstanding, matched, disputed or missing at any moment.
            </p>
          </div>
          
          <div className="space-y-6">
            <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary"></div> Visible outcomes
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {outputs.map((output, i) => (
                <div key={i} className="group relative flex items-start gap-3 p-5 border border-border bg-background hover:border-primary/50 transition-colors">
                  <div className="absolute left-0 top-0 w-0.5 h-0 bg-primary group-hover:h-full transition-all duration-300"></div>
                  <div className="font-mono text-xs text-primary mt-1">{String(i + 1).padStart(2, '0')}</div>
                  <span className="text-sm font-medium text-foreground">{output}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Diagram */}
        <div className="flex flex-col bg-secondary/20 border border-border p-8 md:p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none"></div>
          <div className="flex flex-col space-y-0 items-center relative z-10">
            {['Contract', 'Obligation', 'Invoice', 'Payment'].map((step, i) => (
              <div key={i} className="w-full flex flex-col items-center">
                <div className="w-full max-w-xs p-5 bg-background border border-border text-center shadow-sm hover:border-primary/50 transition-colors relative">
                  <div className="absolute left-0 top-0 w-1 h-full bg-border"></div>
                  <span className="text-sm font-mono uppercase tracking-wider text-foreground">{step}</span>
                </div>
                <div className="flex justify-center py-4 h-12 w-px relative">
                  <div className="absolute top-0 w-px h-full bg-border"></div>
                  <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-border"></div>
                </div>
              </div>
            ))}
            <div className="w-full max-w-xs p-5 bg-primary text-primary-foreground text-center shadow-md relative">
              <div className="absolute left-0 top-0 w-1 h-full bg-black/20"></div>
              <span className="text-base font-mono uppercase tracking-widest font-semibold">Current state</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
