export function ProblemSection() {
  return (
    <section className="relative py-24 md:py-40 px-6 md:px-12 bg-background border-t border-border">
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">
          <div className="lg:col-span-5 lg:col-start-1">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif text-foreground leading-[1.1] mb-8">
              Your organisation has data.
              <br />
              <span className="text-muted-foreground italic">It does not have shared understanding.</span>
            </h2>
          </div>

          <div className="lg:col-span-6 lg:col-start-7 lg:pt-16">
            <div className="space-y-8 text-xl md:text-2xl text-foreground font-light leading-snug">
              <p>
                Operational knowledge is spread across scattered evidence, emails, systems, workflows and people, and every new project or AI agent rebuilds that context from scratch.
              </p>
              <p className="text-muted-foreground">
                The result: repeated discovery, conflicting information, unclear ownership, missed obligations and AI that cannot act safely.
              </p>
            </div>

            <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-12">
              {[
                { num: "01", text: "Fragmented organisational knowledge" },
                { num: "02", text: "Repeated process discovery" },
                { num: "03", text: "Unclear operational state" },
                { num: "04", text: "AI without trusted context" }
              ].map((problem, i) => (
                <div key={i} className="relative pt-6 border-t border-border">
                  <div className="absolute top-0 left-0 -translate-y-1/2 bg-background pr-4">
                    <span className="font-serif text-3xl text-primary/40">{problem.num}</span>
                  </div>
                  <h3 className="text-lg font-medium text-foreground">{problem.text}</h3>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
