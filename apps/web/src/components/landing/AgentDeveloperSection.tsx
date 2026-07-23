import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export function AgentDeveloperSection() {
  const capabilities = [
    "Entity resolution",
    "Organisational graph",
    "Current-state queries",
    "Historical timelines",
    "Evidence and provenance",
    "Permission-aware context",
    "Event subscriptions"
  ];

  return (
    <section className="py-20 md:py-32 px-6 md:px-12 max-w-screen-xl mx-auto">
      <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center">
        <div>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-8">
            Give your agents organisational context
          </h2>
          
          <div className="space-y-6 text-lg text-muted-foreground leading-relaxed mb-10">
            <p>
              Agent developers should not have to rebuild organisational identity, memory, permissions, relationships and operational state inside every application.
            </p>
            <p>
              Orgni provides governed, evidence-backed context through APIs, SDKs, events and MCP.
            </p>
          </div>
          
          <Button asChild variant="outline" className="h-12 px-8 font-medium border-border shadow-none">
            <Link href="/api-reference">
              Explore Orgni infrastructure
            </Link>
          </Button>
        </div>

        <div className="p-8 md:p-12 bg-secondary/30 border border-border rounded-lg">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-widest mb-8">Core Capabilities</h3>
          
          <ul className="space-y-4">
            {capabilities.map((cap, i) => (
              <li key={i} className="flex items-center gap-4 text-foreground font-medium">
                <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                {cap}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
