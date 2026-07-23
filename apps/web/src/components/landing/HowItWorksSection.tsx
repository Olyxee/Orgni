import { Link } from "wouter";

export function HowItWorksSection() {
  const steps = [
    {
      num: "1",
      title: "Connect",
      text: "Upload documents or connect business systems, APIs, email and event streams."
    },
    {
      num: "2",
      title: "Understand",
      text: "Orgni extracts evidence and converts source information into standard organisational claims and events."
    },
    {
      num: "3",
      title: "Resolve",
      text: "Orgni identifies entities, connects relationships and determines the current organisational state."
    },
    {
      num: "4",
      title: "Deliver",
      text: "Teams, applications and AI agents access relevant, permission-aware context through Orgni’s interfaces."
    }
  ];

  return (
    <section className="py-20 md:py-32 px-6 md:px-12 bg-secondary/20 border-y border-border">
      <div className="max-w-screen-xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-16 md:mb-24">
          From fragmented evidence to shared organisational context
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 lg:gap-16">
          {steps.map((step) => (
            <div key={step.num} className="relative">
              <div className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-widest">
                Stage {step.num}
              </div>
              <h3 className="text-xl font-medium text-foreground mb-4">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {step.text}
              </p>
              
              {/* Optional connector line on desktop */}
              {step.num !== "4" && (
                <div className="hidden md:block absolute top-12 left-[100%] w-full h-px bg-border -translate-x-8"></div>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-16 pt-8 border-t border-border">
          <Link href="/docs" className="text-sm font-medium text-primary hover:underline underline-offset-4">
            Explore the system architecture &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
