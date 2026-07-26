import { useSeo } from "@/hooks/use-seo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { LOGIN_URL } from "@/lib/links";
import {
  Check,
  Copy,
  Key,
  Book,
  Terminal,
  Layers,
  FileText,
  History,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

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
      aria-label="Copy code"
    >
      {copied ? (
        <Check size={14} className="text-green-400" />
      ) : (
        <Copy size={14} />
      )}
    </button>
  );
}

function CodeBlock({
  title,
  lineCount,
  copyText,
  children,
}: {
  title: string;
  lineCount: number;
  copyText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg overflow-hidden border border-white/10 bg-[#0c0c0c] font-mono text-sm shadow-xl w-full">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/10">
        <span className="text-xs text-white/50">{title}</span>
        <CopyButton text={copyText} />
      </div>
      <div className="p-4 overflow-x-auto flex">
        <div className="pr-4 text-white/20 select-none text-right flex flex-col gap-1 border-r border-white/5 mr-4 min-w-[2rem]">
          {Array.from({ length: lineCount }).map((_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Developers() {
  useSeo({
    title: "Developers - Orgni",
    description:
      "Give your agents access to governed identity, relationships, policies, and operational state through a unified API.",
    path: "/developers",
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary flex flex-col">
      <SiteHeader />
      <main className="flex-1 pt-16">
        <Hero />
        <Exposes />
        <Auth />
        <NextSteps />
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="py-24 md:py-32 px-6 max-w-screen-xl mx-auto flex flex-col items-center text-center"
    >
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium tracking-wide uppercase mb-8">
        <Terminal size={14} />
        For Developers
      </div>
      <h1 className="text-4xl md:text-6xl lg:text-7xl font-medium tracking-tight text-foreground mb-6 max-w-4xl leading-[1.1]">
        A queryable organisational model for AI agents
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
        Give your agents access to governed identity, relationships, policies,
        evidence, and operational state through a unified API.
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
        <Button
          asChild
          size="lg"
          className="w-full sm:w-auto h-12 px-8 font-medium shadow-none rounded-md bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Link href="/docs">Read the Documentation</Link>
        </Button>
      </div>
    </motion.section>
  );
}

function Exposes() {
  return (
    <section className="py-24 bg-[#050505] text-white px-6">
      <div className="max-w-screen-xl mx-auto">
        <div className="max-w-2xl mb-16">
          <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-4">
            What Orgni exposes
          </h2>
          <p className="text-lg text-white/60 leading-relaxed">
            A single API endpoint that returns the complete operational and
            historical context an agent needs to make a decision about a
            resource.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Code side */}
          <div className="space-y-6">
            <CodeBlock
              title="request.ts"
              lineCount={6}
              copyText={`const context = await orgni.context.get({\n  actor: "compliance-agent",\n  task: "evaluate-control",\n  resource: "control_284",\n  asOf: new Date().toISOString()\n});`}
            >
              <pre className="text-white/80 leading-relaxed text-xs md:text-sm flex-1 font-mono">
                <span className="text-[#ff7b72]">const</span>{" "}
                <span className="text-[#79c0ff]">context</span>{" "}
                <span className="text-white/40">=</span>{" "}
                <span className="text-[#ff7b72]">await</span>{" "}
                <span className="text-white/90">orgni</span>
                <span className="text-white/40">.</span>
                <span className="text-white/90">context</span>
                <span className="text-white/40">.</span>
                <span className="text-[#d2a8ff]">get</span>
                <span className="text-white/40">(</span>
                <span className="text-[#ff7b72]">&#123;</span>
                {"\n  "}
                <span className="text-white/80">actor</span>
                <span className="text-[#ff7b72]">:</span>{" "}
                <span className="text-[#a5d6ff]">"compliance-agent"</span>
                <span className="text-white/40">,</span>
                {"\n  "}
                <span className="text-white/80">task</span>
                <span className="text-[#ff7b72]">:</span>{" "}
                <span className="text-[#a5d6ff]">"evaluate-control"</span>
                <span className="text-white/40">,</span>
                {"\n  "}
                <span className="text-white/80">resource</span>
                <span className="text-[#ff7b72]">:</span>{" "}
                <span className="text-[#a5d6ff]">"control_284"</span>
                <span className="text-white/40">,</span>
                {"\n  "}
                <span className="text-white/80">asOf</span>
                <span className="text-[#ff7b72]">:</span>{" "}
                <span className="text-[#ff7b72]">new</span>{" "}
                <span className="text-[#79c0ff]">Date</span>
                <span className="text-white/40">().</span>
                <span className="text-[#d2a8ff]">toISOString</span>
                <span className="text-white/40">()</span>
                {"\n"}
                <span className="text-[#ff7b72]">&#125;</span>
                <span className="text-white/40">);</span>
              </pre>
            </CodeBlock>

            <CodeBlock
              title="response.json"
              lineCount={12}
              copyText={`{\n  "resource": {},\n  "applicableRequirements": [],\n  "currentState": {},\n  "evidence": [],\n  "owners": [],\n  "exceptions": [],\n  "conflicts": [],\n  "historicalEvents": [],\n  "permittedActions": [],\n  "missingContext": []\n}`}
            >
              <pre className="text-white/80 leading-relaxed text-xs md:text-sm flex-1 font-mono">
                <span className="text-[#ff7b72]">&#123;</span>
                <span className="text-[#79c0ff]">"resource"</span>
                <span className="text-white/40">:</span>{" "}
                <span className="text-[#ff7b72]">&#123;&#125;</span>
                <span className="text-white/40">,</span>
                <span className="text-[#79c0ff]">"applicableRequirements"</span>
                <span className="text-white/40">:</span>{" "}
                <span className="text-[#a5d6ff]">[]</span>
                <span className="text-white/40">,</span>
                <span className="text-[#79c0ff]">"currentState"</span>
                <span className="text-white/40">:</span>{" "}
                <span className="text-[#ff7b72]">&#123;&#125;</span>
                <span className="text-white/40">,</span>
                <span className="text-[#79c0ff]">"evidence"</span>
                <span className="text-white/40">:</span>{" "}
                <span className="text-[#a5d6ff]">[]</span>
                <span className="text-white/40">,</span>
                <span className="text-[#79c0ff]">"owners"</span>
                <span className="text-white/40">:</span>{" "}
                <span className="text-[#a5d6ff]">[]</span>
                <span className="text-white/40">,</span>
                <span className="text-[#79c0ff]">"exceptions"</span>
                <span className="text-white/40">:</span>{" "}
                <span className="text-[#a5d6ff]">[]</span>
                <span className="text-white/40">,</span>
                <span className="text-[#79c0ff]">"conflicts"</span>
                <span className="text-white/40">:</span>{" "}
                <span className="text-[#a5d6ff]">[]</span>
                <span className="text-white/40">,</span>
                <span className="text-[#79c0ff]">"historicalEvents"</span>
                <span className="text-white/40">:</span>{" "}
                <span className="text-[#a5d6ff]">[]</span>
                <span className="text-white/40">,</span>
                <span className="text-[#79c0ff]">"permittedActions"</span>
                <span className="text-white/40">:</span>{" "}
                <span className="text-[#a5d6ff]">[]</span>
                <span className="text-white/40">,</span>
                <span className="text-[#79c0ff]">"missingContext"</span>
                <span className="text-white/40">:</span>{" "}
                <span className="text-[#a5d6ff]">[]</span>
                <span className="text-[#ff7b72]">&#125;</span>
              </pre>
            </CodeBlock>
          </div>

          {/* Text side */}
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-10">
            {[
              {
                icon: Layers,
                title: "State & Identity",
                desc: "Canonical entity resolution and current verified state.",
              },
              {
                icon: FileText,
                title: "Applicable Rules",
                desc: "Filtered requirements by entity, role, and jurisdiction.",
              },
              {
                icon: History,
                title: "Evidence & History",
                desc: "Verified history, previous decisions, and source evidence.",
              },
              {
                icon: AlertTriangle,
                title: "Conflicts",
                desc: "Preserved conflicting claims marked for human review.",
              },
            ].map((item, i) => (
              <div key={i}>
                <div className="w-10 h-10 rounded-md bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <item.icon className="text-primary" size={18} />
                </div>
                <h3 className="font-medium text-white text-base mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Auth() {
  return (
    <section className="py-24 px-6 max-w-screen-xl mx-auto border-b border-border">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-primary/10 mb-6">
            <Key className="text-primary" size={24} />
          </div>
          <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-4">
            Authentication
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-md">
            All requests to the Orgni API require a Bearer token. You can
            generate and manage API keys in your developer dashboard.
          </p>
          <Button asChild className="rounded-md h-11 px-6 shadow-none">
            <a href={LOGIN_URL}>Get an API Key</a>
          </Button>
        </div>
        <div>
          <CodeBlock
            title="HTTP Request"
            lineCount={3}
            copyText={`GET /v1/context HTTP/1.1\nHost: api.orgni.com\nAuthorization: Bearer orgni_live_xxxxxxxx`}
          >
            <pre className="text-white/80 leading-relaxed text-xs md:text-sm flex-1 font-mono">
              <span className="text-[#79c0ff]">GET</span>{" "}
              <span className="text-white/90">/v1/context</span>{" "}
              <span className="text-white/40">HTTP/1.1</span>
              {"\n"}
              <span className="text-[#79c0ff]">Host:</span>{" "}
              <span className="text-white/90">api.orgni.com</span>
              {"\n"}
              <span className="text-[#79c0ff]">Authorization:</span>{" "}
              <span className="text-[#a5d6ff]">Bearer orgni_live_xxxxxxxx</span>
            </pre>
          </CodeBlock>
        </div>
      </div>
    </section>
  );
}

function NextSteps() {
  return (
    <section className="py-24 px-6 max-w-screen-xl mx-auto">
      <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-10 text-center lg:text-left">
        Where to go next
      </h2>
      <div className="max-w-4xl">
        <Link
          href="/docs"
          className="group block p-8 md:p-10 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all"
        >
          <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mb-6">
            <Book className="text-primary" size={24} />
          </div>
          <h3 className="text-xl font-medium mb-3 group-hover:text-primary transition-colors">
            Read the Documentation
          </h3>
          <p className="text-muted-foreground leading-relaxed max-w-2xl">
            Learn the core concepts, read integration guides, and explore the
            complete REST API documentation. See how to structure your agent to
            leverage the organisational model.
          </p>
        </Link>
      </div>
    </section>
  );
}
