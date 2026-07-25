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
    <section id="use-cases" className="py-24 md:py-40 px-6 md:px-12 bg-secondary/30 border-t border-border scroll-mt-20">
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-start">
          
          <div className="lg:col-span-5 lg:col-start-8 order-1 lg:order-2">
            <h2 className="text-3xl md:text-5xl lg:text-[4rem] font-serif text-foreground mb-8 leading-[1.05]">
              Start with contracts, invoices & payments.
            </h2>
            
            <div className="text-xl md:text-2xl text-foreground font-light leading-snug mb-16">
              <p className="mb-6">
                Orgni connects contracts, obligations, invoices, payments and counterparties into one operational model.
              </p>
              <p className="text-muted-foreground">
                See what is active, outstanding, matched, disputed or missing at any moment.
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium tracking-wide border-b border-border pb-4 mb-6 uppercase">
                Visible Outcomes
              </h4>
              <ul className="space-y-4">
                {outputs.map((output, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <span className="font-mono text-xs text-muted-foreground mt-1.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-base font-medium text-foreground">{output}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-6 lg:col-start-1 order-2 lg:order-1 pt-12 lg:pt-32">
            <div className="bg-background border border-border p-8 md:p-12 relative shadow-sm">
              <div className="absolute -top-3 -left-3 w-6 h-6 bg-primary"></div>
              <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-primary"></div>
              
              <div className="space-y-12">
                <div className="flex justify-between items-end border-b border-border pb-4">
                  <span className="font-serif text-3xl">Current State</span>
                  <span className="font-mono text-xs text-primary uppercase tracking-widest">Live Model</span>
                </div>
                
                <div className="space-y-8">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-mono uppercase tracking-wider text-muted-foreground">Contract</span>
                      <span className="bg-green-100 text-green-800 px-2 py-0.5 text-xs font-mono">ACTIVE</span>
                    </div>
                    <div className="h-px w-full bg-border"></div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-mono uppercase tracking-wider text-muted-foreground">Obligation</span>
                      <span className="bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-mono">CONDITIONALLY COMPLIANT</span>
                    </div>
                    <div className="h-px w-full bg-border"></div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-mono uppercase tracking-wider text-muted-foreground">Invoice</span>
                      <span className="bg-secondary text-foreground px-2 py-0.5 text-xs font-mono">PENDING_MATCH</span>
                    </div>
                    <div className="h-px w-full bg-border"></div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-mono uppercase tracking-wider text-muted-foreground">Payment</span>
                      <span className="bg-red-100 text-red-800 px-2 py-0.5 text-xs font-mono">MISSING_EVIDENCE</span>
                    </div>
                    <div className="h-px w-full bg-border"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
