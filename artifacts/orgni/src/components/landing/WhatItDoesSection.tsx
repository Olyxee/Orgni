export function WhatItDoesSection() {
  const steps = [
    {
      title: "Model the structure",
      description: "Define the entities that matter: contracts, people, assets, policies. Map how they relate to one another."
    },
    {
      title: "Stream the events",
      description: "Connect systems to feed the model. State changes, document creations, and approvals become a timeline."
    },
    {
      title: "Infer the state",
      description: "Orgni calculates the current reality. If a payment is missing, the invoice is unpaid. If a policy is violated, the contract is breached."
    },
    {
      title: "Expose the truth",
      description: "Teams and AI agents query Orgni to know exactly what is happening, with full evidence trails."
    }
  ];

  return (
    <section id="platform" className="py-24 md:py-40 px-6 md:px-12 bg-background border-t border-border scroll-mt-20">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-24">
          <h2 className="text-4xl md:text-6xl font-serif text-foreground leading-[1.05] max-w-2xl">
            How Orgni constructs operational reality.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              <div className="text-8xl font-serif text-secondary mb-6 leading-none tracking-tighter">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="border-t border-border pt-6">
                <h3 className="text-xl font-medium text-foreground mb-4">{step.title}</h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
