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
    <section className="py-24 md:py-32 px-6 md:px-12 max-w-screen-xl mx-auto">
      <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-8 bg-primary"></div>
            <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground">
              Developer Ecosystem
            </span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight text-foreground mb-8 leading-[1.1]">
            Give your agents organisational context
          </h2>
          
          <div className="space-y-6 text-lg text-muted-foreground leading-relaxed mb-10 pl-6 border-l-2 border-border">
            <p>
              Agent developers should not have to rebuild organisational identity, memory, permissions, relationships and operational state inside every application.
            </p>
            <p>
              Orgni provides governed, evidence-backed context through APIs, SDKs, events and MCP.
            </p>
          </div>
          
          <Button asChild variant="outline" className="h-12 px-8 font-medium border-border shadow-none rounded-none hover:bg-secondary/30">
            <Link href="/api-reference">
              Explore Orgni infrastructure
            </Link>
          </Button>
        </div>

        <div className="p-8 md:p-12 bg-background border border-border relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none group-hover:opacity-50 transition-opacity"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-l border-b border-border bg-secondary/20"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-r border-t border-border bg-secondary/20"></div>

          <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-8 relative z-10 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-primary"></div> Core Capabilities
          </h3>
          
          <ul className="space-y-4 relative z-10">
            {capabilities.map((cap, i) => (
              <li key={i} className="flex items-center gap-4 text-foreground font-mono text-sm uppercase tracking-wider">
                <div className="h-[2px] w-4 bg-primary/40 group-hover:bg-primary transition-colors" />
                {cap}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
