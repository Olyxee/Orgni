import { useSeo } from "@/hooks/use-seo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { SIGNUP_URL } from "@/lib/links";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="text-white/40 hover:text-white transition-colors flex items-center justify-center w-6 h-6"
      title="Copy code"
    >
      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
    </button>
  );
}

export default function Developers() {
  useSeo({
    title: "Agent Developers - Orgni",
    description:
      "Build agents that understand the organisation, not only the task. Orgni gives enterprise agents access to governed identity, relationships, policies, evidence, history and current operational state.",
    path: "/developers",
  });

  return (
    <div className="dark min-h-screen bg-[#050505] text-white font-sans selection:bg-primary/20 selection:text-primary overflow-x-clip">
      <SiteHeader dark />
      <main className="flex-1 pt-16">
        <DevelopersHeroSection />
        <TwoIntelligencesSection />
        <ComparisonDemoSection />
        <WhatAgentsGetSection />
        <DeveloperExperienceSection />
        <OneModelManyAgentsSection />
        <ClosingCtaSection />
      </main>
      <SiteFooter dark />
    </div>
  );
}

function DevelopersHeroSection() {
  return (
    <section className="relative pt-24 md:pt-32 pb-20 md:pb-32 px-6 md:px-12 max-w-screen-xl mx-auto overflow-hidden">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
        <div className="max-w-2xl relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-8 bg-primary"></div>
            <span className="text-xs font-mono tracking-widest uppercase text-white/60">
              For agent developers
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-white leading-[1.1] mb-6">
            Build agents that understand the organisation, <span className="text-white/50">not only the task</span>
          </h1>
          
          <p className="text-base md:text-lg text-white/60 leading-relaxed max-w-xl mb-10">
            Orgni gives enterprise agents access to governed identity, relationships, policies, evidence, history and current operational state through APIs, SDKs, events and MCP.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto h-12 px-8 font-medium shadow-none rounded-none bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/api-reference">
                Read the API reference
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 font-medium border-white/20 text-white hover:bg-white/10 rounded-none bg-transparent">
              <a href={SIGNUP_URL}>
                Request access
              </a>
            </Button>
          </div>
        </div>
        
        {/* Editor window on right */}
        <div className="relative z-10 w-full max-w-xl mx-auto lg:ml-auto lg:mr-0">
          <div className="rounded-lg overflow-hidden border border-white/10 bg-[#0c0c0c] font-mono text-sm shadow-2xl">
            <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-white/20"></div>
                  <div className="w-3 h-3 rounded-full bg-white/20"></div>
                  <div className="w-3 h-3 rounded-full bg-white/20"></div>
                </div>
                <div className="flex gap-2 text-xs text-white/40">
                  <div className="px-3 py-1 bg-white/10 text-white/90 rounded-sm font-medium">agent.ts</div>
                  <div className="px-3 py-1 hover:bg-white/5 rounded-sm cursor-pointer transition-colors">config.json</div>
                </div>
              </div>
              <CopyButton text={`const context = await orgni.context.get({\n  actor: "compliance-agent",\n  task: "evaluate-control",\n  resource: "control_284",\n  asOf: new Date().toISOString()\n});`} />
            </div>
            <div className="p-4 overflow-x-auto flex">
              <div className="pr-4 text-white/20 select-none text-right flex flex-col gap-1 border-r border-white/5 mr-4 min-w-[2rem]">
                {Array.from({length: 6}).map((_, i) => <span key={i}>{i+1}</span>)}
              </div>
              <pre className="text-white/80 leading-relaxed text-xs md:text-sm flex-1">
<span className="text-[#ff7b72]">const</span> <span className="text-[#79c0ff]">context</span> <span className="text-white/40">=</span> <span className="text-[#ff7b72]">await</span> <span className="text-white/90">orgni</span><span className="text-white/40">.</span><span className="text-white/90">context</span><span className="text-white/40">.</span><span className="text-[#d2a8ff]">get</span><span className="text-white/40">(</span><span className="text-[#ff7b72]">&#123;</span>{"\n  "}<span className="text-white/80">actor</span><span className="text-[#ff7b72]">:</span> <span className="text-[#a5d6ff]">"compliance-agent"</span><span className="text-white/40">,</span>{"\n  "}<span className="text-white/80">task</span><span className="text-[#ff7b72]">:</span> <span className="text-[#a5d6ff]">"evaluate-control"</span><span className="text-white/40">,</span>{"\n  "}<span className="text-white/80">resource</span><span className="text-[#ff7b72]">:</span> <span className="text-[#a5d6ff]">"control_284"</span><span className="text-white/40">,</span>{"\n  "}<span className="text-white/80">asOf</span><span className="text-[#ff7b72]">:</span> <span className="text-[#ff7b72]">new</span> <span className="text-[#79c0ff]">Date</span><span className="text-white/40">().</span><span className="text-[#d2a8ff]">toISOString</span><span className="text-white/40">()</span>{"\n"}<span className="text-[#ff7b72]">&#125;</span><span className="text-white/40">);</span>
              </pre>
            </div>
          </div>
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
    <section className="py-20 md:py-28 px-6 md:px-12 border-y border-white/5 bg-black/20">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3 mb-12">
          <div className="h-px w-8 bg-primary"></div>
          <span className="text-xs font-mono tracking-widest uppercase text-white/60">
            Two kinds of intelligence
          </span>
        </div>
        
        <div className="grid md:grid-cols-2 gap-12 md:gap-8 mb-16">
          <div>
            <h3 className="text-xl md:text-2xl font-medium tracking-tight text-white mb-6 font-sans">
              Domain intelligence
            </h3>
            <div className="space-y-0 text-sm md:text-base text-white/60 font-mono">
              {domainItems.map((item, i) => (
                <div key={i} className="flex items-start gap-4 py-3 border-b border-white/5 last:border-0 group">
                  <span className="text-white/20 mt-0.5 group-hover:text-white/40 transition-colors">{(i + 1).toString().padStart(2, '0')}</span>
                  <span className="group-hover:text-white/80 transition-colors">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xl md:text-2xl font-medium tracking-tight text-white mb-6 font-sans">
              Organisational intelligence
            </h3>
            <div className="space-y-0 text-sm md:text-base text-white/60 font-mono">
              {orgItems.map((item, i) => (
                <div key={i} className="flex items-start gap-4 py-3 border-b border-primary/10 last:border-0 group">
                  <span className="text-primary/40 mt-0.5 group-hover:text-primary/60 transition-colors">{(i + 1).toString().padStart(2, '0')}</span>
                  <span className="text-white/80 group-hover:text-white transition-colors">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="max-w-3xl">
          <p className="text-lg md:text-xl text-white/90 leading-relaxed border-l-2 border-primary pl-6">
            Domain intelligence tells an agent what compliance means generally. Organisational intelligence tells the agent what compliance means for this organisation, at this moment, for this activity.
          </p>
        </div>
      </div>
    </section>
  );
}

function ComparisonDemoSection() {
  return (
    <section className="py-20 md:py-28 px-6 md:px-12 bg-[#030303]">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3 mb-10">
          <div className="h-px w-8 bg-primary"></div>
          <span className="text-xs font-mono tracking-widest uppercase text-white/60">
            Comparison
          </span>
        </div>

        <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight mb-12 text-white leading-[1.1] max-w-2xl">
          Can this supplier invoice be approved?
        </h2>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-lg overflow-hidden font-mono text-sm shadow-xl flex flex-col h-full">
            <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex justify-between items-center">
              <span className="text-xs text-white/40">typical-agent ~ bash</span>
            </div>
            <div className="p-5 text-white/80 space-y-4 flex-1">
              <div className="flex gap-3">
                <span className="text-white/40 select-none">$</span>
                <span className="text-white">prompt: "Can this supplier invoice be approved?"</span>
              </div>
              <div className="flex gap-3 text-white/40">
                <span className="select-none">{">"}</span>
                <span className="italic text-white/30">Analyzing document...</span>
              </div>
              <div className="flex gap-3">
                <span className="text-[#79c0ff] select-none font-bold">OK:</span>
                <span className="text-white/90 leading-relaxed">
                  The invoice contains the required supplier and payment information.
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-primary/20 rounded-lg overflow-hidden font-mono text-sm shadow-xl flex flex-col h-full relative group hover:border-primary/40 transition-colors">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="px-4 py-3 bg-primary/10 border-b border-primary/20 flex justify-between items-center relative z-10">
              <span className="text-xs text-primary/80 font-medium">orgni-agent ~ bash</span>
            </div>
            <div className="p-5 text-white/80 space-y-4 flex-1 relative z-10">
              <div className="flex gap-3">
                <span className="text-primary select-none">$</span>
                <span className="text-white">prompt: "Can this supplier invoice be approved?"</span>
              </div>
              <div className="flex gap-3 text-primary/40">
                <span className="select-none">{">"}</span>
                <span className="italic text-primary/50">Retrieving organizational context...</span>
              </div>
              <div className="pl-6 border-l-2 border-primary/40 space-y-4 py-2 my-2">
                <div className="text-primary font-bold">WARN: Do not approve automatically.</div>
                <div className="text-white/70 leading-relaxed">
                  The invoice is linked to an active supplier contract, but the supplier's required information-security assessment expired on 15 July 2026.
                </div>
                <div className="text-white/70 leading-relaxed">
                  A temporary exception remains active until 31 July 2026 and requires approval from the Head of Procurement before payment.
                </div>
                
                <div className="pt-3 mt-5 border-t border-white/10">
                  <div className="text-[10px] text-white/40 uppercase tracking-widest mb-3">Evidence Sources:</div>
                  <ul className="space-y-2 text-white/60 text-xs">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">↳</span>
                      <span>Supplier contract, clause 8.2</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">↳</span>
                      <span>Third-Party Risk Policy v3, section 5</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">↳</span>
                      <span>Security assessment, expiry field</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">↳</span>
                      <span>Exception approval EX-2026-18</span>
                    </li>
                  </ul>
                </div>
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
    <section className="py-20 md:py-28 px-6 md:px-12 border-y border-white/5">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3 mb-12">
          <div className="h-px w-8 bg-primary"></div>
          <span className="text-xs font-mono tracking-widest uppercase text-white/60">
            Core capabilities
          </span>
        </div>

        <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-white mb-16 leading-[1.1]">
          What your agent gets
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-0 border-t border-white/10">
          {capabilities.map((cap, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6 py-6 border-b border-white/10 group">
              <div className="sm:w-2/5 font-mono text-sm text-primary/80 group-hover:text-primary transition-colors shrink-0">
                {cap.title}
              </div>
              <div className="sm:w-3/5 text-sm text-white/60 leading-relaxed group-hover:text-white/80 transition-colors">
                {cap.desc}
              </div>
            </div>
          ))}
        </div>
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
    <section className="py-20 md:py-28 px-6 md:px-12 bg-black/40">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3 mb-10">
          <div className="h-px w-8 bg-primary"></div>
          <span className="text-xs font-mono tracking-widest uppercase text-white/60">
            Developer experience
          </span>
        </div>

        <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-white mb-12 leading-[1.1]">
          Stable context interface
        </h2>

        <div className="grid lg:grid-cols-2 gap-6 mb-20">
          {/* Request Pane */}
          <div className="bg-[#0a0a0a] border border-white/10 rounded-lg overflow-hidden font-mono text-sm shadow-xl">
            <div className="px-4 py-2.5 bg-white/5 border-b border-white/10 flex justify-between items-center">
              <span className="text-xs text-white/50">request.ts</span>
              <CopyButton text={`const context = await orgni.context.get({\n  actor: "compliance-agent",\n  task: "evaluate-control",\n  resource: "control_284",\n  asOf: new Date().toISOString()\n});`} />
            </div>
            <div className="p-4 overflow-x-auto flex">
              <div className="pr-4 text-white/20 select-none text-right flex flex-col gap-1 border-r border-white/5 mr-4 min-w-[2rem]">
                {Array.from({length: 6}).map((_, i) => <span key={i}>{i+1}</span>)}
              </div>
              <pre className="text-white/80 leading-relaxed text-xs md:text-sm flex-1">
<span className="text-[#ff7b72]">const</span> <span className="text-[#79c0ff]">context</span> <span className="text-white/40">=</span> <span className="text-[#ff7b72]">await</span> <span className="text-white/90">orgni</span><span className="text-white/40">.</span><span className="text-white/90">context</span><span className="text-white/40">.</span><span className="text-[#d2a8ff]">get</span><span className="text-white/40">(</span><span className="text-[#ff7b72]">&#123;</span>{"\n  "}<span className="text-white/80">actor</span><span className="text-[#ff7b72]">:</span> <span className="text-[#a5d6ff]">"compliance-agent"</span><span className="text-white/40">,</span>{"\n  "}<span className="text-white/80">task</span><span className="text-[#ff7b72]">:</span> <span className="text-[#a5d6ff]">"evaluate-control"</span><span className="text-white/40">,</span>{"\n  "}<span className="text-white/80">resource</span><span className="text-[#ff7b72]">:</span> <span className="text-[#a5d6ff]">"control_284"</span><span className="text-white/40">,</span>{"\n  "}<span className="text-white/80">asOf</span><span className="text-[#ff7b72]">:</span> <span className="text-[#ff7b72]">new</span> <span className="text-[#79c0ff]">Date</span><span className="text-white/40">().</span><span className="text-[#d2a8ff]">toISOString</span><span className="text-white/40">()</span>{"\n"}<span className="text-[#ff7b72]">&#125;</span><span className="text-white/40">);</span>
              </pre>
            </div>
          </div>

          {/* Response Pane */}
          <div className="bg-[#0a0a0a] border border-white/10 rounded-lg overflow-hidden font-mono text-sm shadow-xl">
            <div className="px-4 py-2.5 bg-white/5 border-b border-white/10 flex justify-between items-center">
              <span className="text-xs text-white/50">response.json</span>
              <CopyButton text={`{\n  "resource": {},\n  "applicableRequirements": [],\n  "currentState": {},\n  "evidence": [],\n  "owners": [],\n  "exceptions": [],\n  "conflicts": [],\n  "historicalEvents": [],\n  "permittedActions": [],\n  "missingContext": []\n}`} />
            </div>
            <div className="p-4 overflow-x-auto flex">
              <div className="pr-4 text-white/20 select-none text-right flex flex-col gap-1 border-r border-white/5 mr-4 min-w-[2rem]">
                {Array.from({length: 12}).map((_, i) => <span key={i}>{i+1}</span>)}
              </div>
              <pre className="text-white/80 leading-relaxed text-xs md:text-sm flex-1">
<span className="text-[#ff7b72]">&#123;</span>
  <span className="text-[#79c0ff]">"resource"</span><span className="text-white/40">:</span> <span className="text-[#ff7b72]">&#123;&#125;</span><span className="text-white/40">,</span>
  <span className="text-[#79c0ff]">"applicableRequirements"</span><span className="text-white/40">:</span> <span className="text-[#a5d6ff]">[]</span><span className="text-white/40">,</span>
  <span className="text-[#79c0ff]">"currentState"</span><span className="text-white/40">:</span> <span className="text-[#ff7b72]">&#123;&#125;</span><span className="text-white/40">,</span>
  <span className="text-[#79c0ff]">"evidence"</span><span className="text-white/40">:</span> <span className="text-[#a5d6ff]">[]</span><span className="text-white/40">,</span>
  <span className="text-[#79c0ff]">"owners"</span><span className="text-white/40">:</span> <span className="text-[#a5d6ff]">[]</span><span className="text-white/40">,</span>
  <span className="text-[#79c0ff]">"exceptions"</span><span className="text-white/40">:</span> <span className="text-[#a5d6ff]">[]</span><span className="text-white/40">,</span>
  <span className="text-[#79c0ff]">"conflicts"</span><span className="text-white/40">:</span> <span className="text-[#a5d6ff]">[]</span><span className="text-white/40">,</span>
  <span className="text-[#79c0ff]">"historicalEvents"</span><span className="text-white/40">:</span> <span className="text-[#a5d6ff]">[]</span><span className="text-white/40">,</span>
  <span className="text-[#79c0ff]">"permittedActions"</span><span className="text-white/40">:</span> <span className="text-[#a5d6ff]">[]</span><span className="text-white/40">,</span>
  <span className="text-[#79c0ff]">"missingContext"</span><span className="text-white/40">:</span> <span className="text-[#a5d6ff]">[]</span>
<span className="text-[#ff7b72]">&#125;</span>
              </pre>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 lg:gap-12">
          {/* Actions */}
          <div>
            <h3 className="text-xs font-mono tracking-widest uppercase text-white/50 mb-6 border-b border-white/10 pb-3">Agent Actions</h3>
            <ul className="space-y-1">
              {actions.map((action, i) => (
                <li key={i} className="font-mono text-sm text-white/70 hover:text-white transition-colors flex items-center gap-3 py-2 border-b border-white/5 last:border-0 group cursor-default">
                  <span className="text-primary/50 text-[10px] group-hover:text-primary transition-colors select-none">{"->"}</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Delivery mechanisms */}
          <div>
            <h3 className="text-xs font-mono tracking-widest uppercase text-white/50 mb-6 border-b border-white/10 pb-3">Delivery Mechanisms</h3>
            <table className="w-full text-sm font-mono">
              <tbody>
                {deliveryMechanisms.map((mech, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0 group hover:bg-white/5 transition-colors">
                    <td className="py-3 px-2 text-white/80 group-hover:text-white">{mech}</td>
                    <td className="py-3 px-2 text-primary/60 text-right text-xs uppercase tracking-widest">Available</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    <section className="py-20 md:py-28 px-6 md:px-12 border-y border-white/5">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3 mb-10">
          <div className="h-px w-8 bg-primary"></div>
          <span className="text-xs font-mono tracking-widest uppercase text-white/60">
            Infrastructure for multiple agents
          </span>
        </div>

        <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-white mb-6 leading-[1.1]">
          One model, many agents
        </h2>

        <p className="text-base md:text-lg text-white/60 leading-relaxed max-w-2xl mb-16 border-l-2 border-white/10 pl-6">
          These agents should not maintain separate versions of the organisation. They should consume one shared organisational model through Orgni.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {agents.map((agent, i) => (
            <div key={i} className="border border-white/10 bg-white/[0.02] p-6 group hover:border-white/20 transition-colors rounded-sm">
              <h3 className="text-sm font-medium text-white mb-4 font-mono uppercase tracking-wider">
                {agent.name}
              </h3>
              <ul className="flex flex-wrap gap-2 text-xs font-mono text-white/40">
                {agent.items.map((item, j) => (
                  <li key={j} className="px-2 py-1 bg-white/5 rounded-sm group-hover:bg-white/10 group-hover:text-white/70 transition-colors">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6 md:p-8 font-mono text-sm max-w-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary/40"></div>
          <div className="flex items-center gap-3 mb-8">
            <span className="text-xs text-white/40 uppercase tracking-widest">Cross-agent coordination</span>
          </div>

          <div className="mb-8 flex flex-col gap-2 border-b border-white/10 pb-6">
            <span className="text-white/40 text-[10px]">2026-07-16T09:00:00.000Z</span>
            <div className="flex items-center gap-3">
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-sm text-[10px] font-bold border border-primary/20 tracking-wider">EVENT</span>
              <span className="text-white font-bold tracking-tight text-sm md:text-base break-all">SUPPLIER_COMPLIANCE_STATUS_CHANGED</span>
            </div>
          </div>
          
          <div className="space-y-1 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-white/10">
            {[
              { agent: "Procurement agent", action: "Pause new order" },
              { agent: "Finance agent", action: "Request approval before payment" },
              { agent: "Legal agent", action: "Review contract" },
              { agent: "Compliance agent", action: "Request renewed evidence" }
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 py-3 relative">
                <div className="w-2.5 h-2.5 rounded-full bg-primary/40 mt-1 ml-[7px] ring-4 ring-[#0a0a0a] z-10"></div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 w-full">
                  <span className="text-white/40 w-48 shrink-0 text-[10px] uppercase tracking-widest">{item.agent}</span>
                  <span className="text-white/90 text-xs md:text-sm">{item.action}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ClosingCtaSection() {
  return (
    <section className="py-24 md:py-32 px-6 md:px-12 bg-[#030303] border-t border-white/5">
      <div className="max-w-screen-xl mx-auto">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          <blockquote className="text-2xl md:text-3xl lg:text-4xl font-medium tracking-tight text-white leading-[1.2] mb-12 border-l-2 border-primary pl-8 text-left font-sans w-full">
            Any agent can understand its domain. Orgni allows the agent to understand the organisation in which that domain operates.
          </blockquote>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 w-full sm:w-auto">
            <Button asChild size="lg" className="w-full sm:w-auto h-12 px-8 font-medium shadow-none rounded-none bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/api-reference">
                Read the API reference
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 font-medium border-white/20 text-white hover:bg-white/10 rounded-none bg-transparent">
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
