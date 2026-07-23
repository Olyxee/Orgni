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
    <section id="use-cases" className="py-20 md:py-32 px-6 md:px-12 max-w-screen-xl mx-auto">
      <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-start">
        <div>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-8">
            Start with contracts, invoices and payments
          </h2>
          
          <div className="space-y-6 text-lg text-muted-foreground leading-relaxed mb-12">
            <p>
              Orgni connects contracts, obligations, invoices, payments and counterparties into one traceable operational model.
            </p>
            <p>
              See what is active, outstanding, matched, disputed or missing, and review the evidence behind every conclusion.
            </p>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-widest mb-6">Visible outcomes</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {outputs.map((output, i) => (
                <div key={i} className="flex items-start gap-3 p-4 border border-border rounded-sm bg-background">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0"></div>
                  <span className="text-sm font-medium text-foreground">{output}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Diagram */}
        <div className="flex flex-col bg-secondary/10 border border-border rounded-lg p-8 md:p-12">
          <div className="flex flex-col space-y-2 items-center">
            {['Contract', 'Obligation', 'Invoice', 'Payment'].map((step, i) => (
              <div key={i} className="w-full flex flex-col items-center">
                <div className="w-full max-w-xs p-4 bg-background border border-border rounded text-center shadow-sm">
                  <span className="text-sm font-medium text-foreground">{step}</span>
                </div>
                <div className="flex justify-center py-2 h-10 w-px relative">
                  <div className="absolute top-0 w-px h-full bg-border"></div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-solid border-t-border border-t-[5px] border-x-transparent border-x-[4px] border-b-0"></div>
                </div>
              </div>
            ))}
            <div className="w-full max-w-xs p-4 bg-primary text-primary-foreground rounded text-center shadow-sm font-medium">
              Current state
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
