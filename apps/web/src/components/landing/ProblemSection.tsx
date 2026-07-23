export function ProblemSection() {
  return (
    <section className="relative py-24 md:py-32 px-6 md:px-12 bg-secondary/30 overflow-hidden">
      <div className="absolute inset-0 bg-dot-pattern opacity-30 pointer-events-none" />
      
      <div className="max-w-screen-xl mx-auto relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px w-8 bg-primary"></div>
          <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground">
            The Context Gap
          </span>
        </div>

        <div className="max-w-3xl mb-16 md:mb-24">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-medium tracking-tight text-foreground mb-8 leading-[1.1]">
            Your organisation has data.<br />
            <span className="text-muted-foreground">It does not have shared understanding.</span>
          </h2>
          
          <div className="space-y-6 text-lg text-muted-foreground leading-relaxed pl-6 border-l-2 border-border">
            <p>
              Operational knowledge is spread across documents, emails, systems, workflows and people, and every new project or AI agent rebuilds that context from scratch.
            </p>
            <p>
              The result: repeated discovery, conflicting information, unclear ownership, missed obligations and AI that cannot act safely.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            { num: "01", text: "Fragmented organisational knowledge" },
            { num: "02", text: "Repeated process discovery" },
            { num: "03", text: "Unclear operational state" },
            { num: "04", text: "AI without trusted context" }
          ].map((problem, i) => (
            <div key={i} className="group relative p-8 bg-background border border-border hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <div className="absolute top-0 left-0 w-1 h-0 bg-primary group-hover:h-full transition-all duration-300"></div>
              <div className="text-primary font-mono text-sm mb-4">{problem.num}</div>
              <h3 className="text-lg font-medium text-foreground leading-snug">{problem.text}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
