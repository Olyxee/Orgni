export function TrustSection() {
  const principles = [
    "Every claim links to evidence",
    "Uncertainty remains visible",
    "Conflicts are preserved",
    "Historical state is retained",
    "Access permissions are enforced",
    "Human review remains available"
  ];

  return (
    <section className="py-24 md:py-32 px-6 md:px-12 bg-foreground text-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-40 pointer-events-none"></div>
      
      <div className="max-w-screen-xl mx-auto grid md:grid-cols-2 gap-16 md:gap-24 items-start relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-8 bg-primary"></div>
            <span className="text-xs font-mono tracking-widest uppercase text-white/60">
              Confidence & Integrity
            </span>
          </div>

          <h2 className="text-3xl md:text-5xl lg:text-6xl font-medium tracking-tight mb-8 text-white leading-[1.1]">
            Built for organisational truth, <span className="text-white/60">not plausible answers</span>
          </h2>
          
          <div className="space-y-6 text-lg text-white/70 leading-relaxed pl-6 border-l-2 border-primary/40">
            <p>
              Orgni does not silently convert missing or uncertain information into fact.
            </p>
            <p>
              Observed, inferred, disputed and superseded information remain distinguishable throughout the system.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-10 gap-x-8">
          {principles.map((principle, i) => (
            <div key={i} className="border-l border-white/20 pl-6 py-2 relative group hover:border-primary transition-colors">
              <div className="font-mono text-xs text-primary mb-2 opacity-60 group-hover:opacity-100 transition-opacity">0{i + 1}</div>
              <p className="text-base font-medium text-white/90">
                {principle}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
