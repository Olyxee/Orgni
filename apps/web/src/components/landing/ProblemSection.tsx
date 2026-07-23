export function ProblemSection() {
  return (
    <section className="py-20 md:py-32 px-6 md:px-12 bg-secondary/20">
      <div className="max-w-screen-xl mx-auto">
        <div className="max-w-3xl mb-16 md:mb-24">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground mb-8">
            Your organisation has data.<br />It does not have shared understanding.
          </h2>
          
          <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
            <p>
              Operational knowledge is spread across documents, emails, systems, workflows and people — and every new project or AI agent rebuilds that context from scratch.
            </p>
            <p>
              The result: repeated discovery, conflicting information, unclear ownership, missed obligations and AI that cannot act safely.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
          {[
            "Fragmented organisational knowledge",
            "Repeated process discovery",
            "Unclear operational state",
            "AI without trusted context"
          ].map((problem, i) => (
            <div key={i} className="p-8 border border-border bg-background rounded-sm">
              <h3 className="text-xl font-medium text-foreground">{problem}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
