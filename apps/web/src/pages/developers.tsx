import { useSeo } from "@/hooks/use-seo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { SIGNUP_URL } from "@/lib/links";

export default function Developers() {
  useSeo({
    title: "Agent Developers - Orgni",
    description:
      "Build agents that understand the organisation, not only the task. Orgni gives enterprise agents access to governed identity, relationships, policies, evidence, history and current operational state.",
    path: "/developers",
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary overflow-x-clip">
      <SiteHeader />
      <main className="flex-1">
        <DevelopersHeroSection />
        <TwoIntelligencesSection />
        <ComparisonDemoSection />
        <WhatAgentsGetSection />
        <DeveloperExperienceSection />
        <OneModelManyAgentsSection />
        <ClosingCtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}

function DevelopersHeroSection() {
  return (
    <section className="relative pt-24 md:pt-32 pb-20 md:pb-32 px-6 md:px-12 max-w-screen-xl mx-auto overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern [mask-image:linear-gradient(to_bottom,white,transparent)] -z-10 pointer-events-none opacity-50" />
      
      <div className="max-w-4xl relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px w-8 bg-primary"></div>
          <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground">
            For agent developers
          </span>
        </div>
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-medium tracking-tight text-foreground leading-[1.05] mb-8">
          Build agents that understand the organisation, <span className="relative inline-block"><span className="relative z-10">not only the task</span><span className="absolute bottom-1 left-0 w-full h-3 bg-primary/20 -z-10"></span></span>
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mb-10 border-l-2 border-border pl-6">
          Orgni gives enterprise agents access to governed identity, relationships, policies, evidence, history and current operational state through APIs, SDKs, events and MCP.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Button asChild size="lg" className="w-full sm:w-auto h-12 px-8 font-medium shadow-none rounded-none">
            <Link href="/api-reference">
              Read the API reference
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 font-medium border-border hover:bg-secondary rounded-none">
            <a href={SIGNUP_URL}>
              Request access
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

function TwoIntelligencesSection() {
  const domainItems = [
    "Regulations",
    "Accounting principles",
    "Legal requirements",
    "Compliance frameworks",
    "Industry terminology",
    "Common procedures"
  ];

  const orgItems = [
    "How the specific organisation is structured",
    "Which entities and people are involved",
    "Which policies have been adopted",
    "Which jurisdictions apply",
    "Which licences are active",
    "Which obligations are outstanding",
    "Where evidence is stored",
    "What happened previously",
    "Who has authority",
    "Which exceptions have been approved",
    "What the current operational state is"
  ];

  return (
    <section className="py-24 md:py-32 px-6 md:px-12 bg-secondary">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3 mb-12">
          <div className="h-px w-8 bg-primary"></div>
          <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground">
            Two kinds of intelligence
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-12 md:gap-16 mb-16">
          <div className="p-8 md:p-10 bg-background border border-border relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-border"></div>
            <h3 className="text-xl md:text-2xl font-medium tracking-tight text-foreground mb-6">
              Domain intelligence
            </h3>
            <ul className="space-y-3 text-base text-muted-foreground">
              {domainItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="h-[2px] w-3 bg-border mt-3 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-8 md:p-10 bg-background border border-primary/30 relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
            <h3 className="text-xl md:text-2xl font-medium tracking-tight text-foreground mb-6">
              Organisational intelligence
            </h3>
            <ul className="space-y-3 text-base text-muted-foreground">
              {orgItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="h-[2px] w-3 bg-primary/40 mt-3 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="max-w-3xl mx-auto text-center">
          <p className="text-lg md:text-xl text-foreground font-medium leading-relaxed border-l-2 border-primary pl-6 text-left">
            Domain intelligence tells an agent what compliance means generally. Organisational intelligence tells the agent what compliance means for this organisation, at this moment, for this activity.
          </p>
        </div>
      </div>
    </section>
  );
}

function ComparisonDemoSection() {
  return (
    <section className="py-24 md:py-32 px-6 md:px-12 bg-foreground text-background">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3 mb-12">
          <div className="h-px w-8 bg-primary"></div>
          <span className="text-xs font-mono tracking-widest uppercase text-white/60">
            Comparison
          </span>
        </div>

        <h2 className="text-3xl md:text-5xl lg:text-6xl font-medium tracking-tight mb-16 text-white leading-[1.1] max-w-3xl">
          Can this supplier invoice be approved?
        </h2>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-background/5 border border-white/20 p-8 md:p-10 font-mono text-sm relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-white/20"></div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/20">
              <span className="text-xs uppercase tracking-widest text-white/60">A typical agent</span>
            </div>
            <div className="text-white/90 leading-relaxed">
              The invoice contains the required supplier and payment information.
            </div>
          </div>

          <div className="bg-background/5 border border-primary p-8 md:p-10 font-mono text-sm relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-primary/40">
              <span className="text-xs uppercase tracking-widest text-primary">An Orgni-powered agent</span>
            </div>
            <div className="text-white/90 leading-relaxed space-y-4">
              <p className="text-white font-semibold">Do not approve automatically.</p>
              <p>
                The invoice is linked to an active supplier contract, but the supplier's required information-security assessment expired on 15 July 2026.
              </p>
              <p>
                A temporary exception remains active until 31 July 2026 and requires approval from the Head of Procurement before payment.
              </p>
              <div className="pt-4 mt-4 border-t border-white/20">
                <div className="text-xs uppercase tracking-widest text-white/60 mb-3">Evidence:</div>
                <ul className="space-y-2 text-white/80">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Supplier contract, clause 8.2</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Third-Party Risk Policy v3, section 5</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Security assessment, expiry field</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Exception approval EX-2026-18</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhatAgentsGetSection() {
  const capabilities = [
    {
      title: "Persistent identity",
      desc: "Canonical entity resolution across multiple systems and name variations"
    },
    {
      title: "Applicable-rule selection",
      desc: "Filtered requirements by legal entity, jurisdiction, activity and effective date"
    },
    {
      title: "Current-state understanding",
      desc: "Distinguish required, documented, implemented, verified, expired or exempted"
    },
    {
      title: "Temporal reasoning",
      desc: "Determine compliance state at any point in time with historical evidence"
    },
    {
      title: "Provenance",
      desc: "Source document, field, extraction method, confidence and governing rule"
    },
    {
      title: "Conflict awareness",
      desc: "Preserved conflicting claims marked for human review"
    },
    {
      title: "Organisational responsibility",
      desc: "Owners, approval authorities, escalation paths and applicable workflows"
    },
    {
      title: "Organisational memory",
      desc: "Previous cases, decisions, remediation patterns and verified history"
    }
  ];

  return (
    <section className="py-24 md:py-32 px-6 md:px-12 max-w-screen-xl mx-auto">
      <div className="flex items-center gap-3 mb-12">
        <div className="h-px w-8 bg-primary"></div>
        <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground">
          Core capabilities
        </span>
      </div>

      <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight text-foreground mb-16 leading-[1.1] max-w-3xl">
        What your agent gets
      </h2>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {capabilities.map((cap, i) => (
          <div key={i} className="border-l border-border pl-6 py-2 hover:border-primary transition-colors group">
            <div className="font-mono text-xs text-primary mb-3 opacity-60 group-hover:opacity-100 transition-opacity">
              {String(i + 1).padStart(2, '0')}
            </div>
            <h3 className="text-base font-medium text-foreground mb-2">
              {cap.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {cap.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DeveloperExperienceSection() {
  const actions = [
    "resolve_entity",
    "get_applicable_requirements",
    "get_current_state",
    "get_evidence",
    "get_timeline",
    "list_open_obligations",
    "list_conflicts",
    "find_responsible_owner",
    "propose_remediation",
    "submit_correction",
    "subscribe_to_state_changes"
  ];

  const deliveryMechanisms = [
    "REST",
    "TypeScript SDK",
    "Python SDK",
    "Webhooks",
    "Event streams",
    "MCP"
  ];

  return (
    <section className="py-24 md:py-32 px-6 md:px-12 bg-secondary">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3 mb-12">
          <div className="h-px w-8 bg-primary"></div>
          <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground">
            Developer experience
          </span>
        </div>

        <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight text-foreground mb-16 leading-[1.1] max-w-3xl">
          Stable context interface
        </h2>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          <div className="bg-background border border-border p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <div className="w-1.5 h-1.5 bg-primary"></div>
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Context request
              </span>
            </div>
            <pre className="text-xs md:text-sm font-mono text-foreground overflow-x-auto leading-relaxed">
{`const context = await orgni.context.get({
  actor: "compliance-agent",
  task: "evaluate-control",
  resource: "control_284",
  asOf: new Date().toISOString()
});`}
            </pre>
          </div>

          <div className="bg-background border border-border p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <div className="w-1.5 h-1.5 bg-primary"></div>
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Context response
              </span>
            </div>
            <pre className="text-xs md:text-sm font-mono text-foreground overflow-x-auto leading-relaxed">
{`{
  resource: {},
  applicableRequirements: [],
  currentState: {},
  evidence: [],
  owners: [],
  exceptions: [],
  conflicts: [],
  historicalEvents: [],
  permittedActions: [],
  missingContext: []
}`}
            </pre>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-background border border-border p-6 md:p-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1.5 h-1.5 bg-primary"></div>
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Agent actions
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {actions.map((action, i) => (
                <code key={i} className="px-3 py-1.5 bg-secondary border border-border text-xs font-mono text-foreground">
                  {action}
                </code>
              ))}
            </div>
          </div>

          <div className="bg-background border border-border p-6 md:p-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1.5 h-1.5 bg-primary"></div>
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Delivery mechanisms
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {deliveryMechanisms.map((mech, i) => (
                <code key={i} className="px-3 py-1.5 bg-secondary border border-border text-xs font-mono text-foreground">
                  {mech}
                </code>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function OneModelManyAgentsSection() {
  const agents = [
    { name: "Compliance agent", items: ["Policies", "Controls", "Evidence", "Findings", "Remediation", "Owners"] },
    { name: "Financial agent", items: ["Contracts", "Invoices", "Payments", "Budgets", "Approvals", "Obligations"] },
    { name: "Procurement agent", items: ["Suppliers", "Contracts", "Purchase orders", "Certifications", "Delivery requirements", "Supplier risks"] },
    { name: "Legal agent", items: ["Agreements", "Parties", "Clauses", "Obligations", "Amendments", "Expirations"] },
    { name: "Transformation agent", items: ["Processes", "Systems", "Roles", "Dependencies", "Bottlenecks", "Change history"] },
    { name: "Audit agent", items: ["Controls", "Evidence", "Policies", "Findings", "Remediation", "Historical state"] }
  ];

  return (
    <section className="py-24 md:py-32 px-6 md:px-12 max-w-screen-xl mx-auto">
      <div className="flex items-center gap-3 mb-12">
        <div className="h-px w-8 bg-primary"></div>
        <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground">
          Infrastructure for multiple agents
        </span>
      </div>

      <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight text-foreground mb-6 leading-[1.1] max-w-3xl">
        One model, many agents
      </h2>

      <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mb-16 border-l-2 border-border pl-6">
        These agents should not maintain separate versions of the organisation. They should consume one shared organisational model through Orgni.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
        {agents.map((agent, i) => (
          <div key={i} className="bg-background border border-border p-6 relative group hover:border-primary/50 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-border group-hover:bg-primary transition-colors"></div>
            <h3 className="text-base font-medium text-foreground mb-4 font-mono uppercase tracking-wider">
              {agent.name}
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {agent.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2">
                  <span className="text-primary/40 group-hover:text-primary transition-colors">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="bg-foreground text-background p-8 md:p-12 border border-foreground relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px w-8 bg-primary"></div>
          <span className="text-xs font-mono tracking-widest uppercase text-white/60">
            Cross-agent coordination example
          </span>
        </div>

        <div className="max-w-3xl">
          <div className="mb-8 pb-6 border-b border-white/20">
            <div className="font-mono text-sm text-primary mb-2">Event</div>
            <div className="text-xl font-medium text-white tracking-tight">
              SUPPLIER_COMPLIANCE_STATUS_CHANGED
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 bg-primary mt-2 flex-shrink-0"></div>
              <div>
                <div className="font-mono text-xs text-white/60 mb-1">Procurement agent</div>
                <div className="text-white/90">Pause new order</div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 bg-primary mt-2 flex-shrink-0"></div>
              <div>
                <div className="font-mono text-xs text-white/60 mb-1">Finance agent</div>
                <div className="text-white/90">Request approval before payment</div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 bg-primary mt-2 flex-shrink-0"></div>
              <div>
                <div className="font-mono text-xs text-white/60 mb-1">Legal agent</div>
                <div className="text-white/90">Review contract</div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 bg-primary mt-2 flex-shrink-0"></div>
              <div>
                <div className="font-mono text-xs text-white/60 mb-1">Compliance agent</div>
                <div className="text-white/90">Request renewed evidence</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ClosingCtaSection() {
  return (
    <section className="py-24 md:py-32 px-6 md:px-12 bg-secondary">
      <div className="max-w-screen-xl mx-auto">
        <div className="max-w-4xl mx-auto text-center">
          <blockquote className="text-2xl md:text-3xl lg:text-4xl font-medium tracking-tight text-foreground leading-[1.2] mb-12 border-l-2 border-primary pl-8 text-left">
            Any agent can understand its domain. Orgni allows the agent to understand the organisation in which that domain operates.
          </blockquote>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto h-12 px-8 font-medium shadow-none rounded-none">
              <Link href="/api-reference">
                Read the API reference
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 font-medium border-border hover:bg-background rounded-none">
              <a href={SIGNUP_URL}>
                Request access
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
