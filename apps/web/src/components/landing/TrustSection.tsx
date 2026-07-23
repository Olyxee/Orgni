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
    <section className="py-20 md:py-32 px-6 md:px-12 bg-foreground text-background">
      <div className="max-w-screen-xl mx-auto grid md:grid-cols-2 gap-16 md:gap-24 items-start">
        <div>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-8 text-white">
            Built for organisational truth, not plausible answers
          </h2>
          
          <div className="space-y-6 text-lg text-white/70 leading-relaxed">
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
            <div key={i} className="border-l border-white/20 pl-4 py-1">
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
