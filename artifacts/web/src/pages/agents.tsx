import { useSeo } from "@/hooks/use-seo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { LOGIN_URL } from "@/lib/links";
import {
  Bot,
  Check,
  Copy,
  ShieldCheck,
  Search,
  GitBranch,
  Scale,
  Plug,
  Book,
  Terminal,
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
  copyText,
  children,
}: {
  title: string;
  copyText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg overflow-hidden border border-white/10 bg-[#0c0c0c] font-mono text-sm shadow-xl w-full">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/10">
        <span className="text-xs text-white/50">{title}</span>
        <CopyButton text={copyText} />
      </div>
      <div className="p-4 overflow-x-auto">{children}</div>
    </div>
  );
}

export default function Agents() {
  useSeo({
    title: "Agents - Orgni",
    description:
      "Build AI agents that act on verified organisational context. Connect via MCP or the Agent Context API with permissions enforced on every call.",
    path: "/agents",
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary flex flex-col">
      <SiteHeader />
      <main className="flex-1 pt-16">
        <Hero />
        <Capabilities />
        <Quickstart />
        <Guardrails />
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
        <Bot size={14} />
        Agents
      </div>
      <h1 className="text-4xl md:text-6xl lg:text-7xl font-medium tracking-tight text-foreground mb-6 max-w-4xl leading-[1.1]">
        Agents that act on how your organisation actually works
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
        Orgni gives your agents verified context — identity, policies,
        obligations, and evidence — so they stop guessing and start executing
        safely.
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
        <Button
          asChild
          size="lg"
          className="w-full sm:w-auto h-12 px-8 font-medium shadow-none rounded-md bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <a href={LOGIN_URL}>Get an API Key</a>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="w-full sm:w-auto h-12 px-8 font-medium shadow-none rounded-md"
        >
          <Link href="/docs">Read the Docs</Link>
        </Button>
      </div>
    </motion.section>
  );
}

function Capabilities() {
  const items = [
    {
      icon: Search,
      title: "Grounded answers",
      desc: "Agents query the live organisational model and always get cited, source-linked answers.",
    },
    {
      icon: ShieldCheck,
      title: "Permission-aware",
      desc: "Every call is scoped to what the acting principal is allowed to see. No accidental data leaks.",
    },
    {
      icon: GitBranch,
      title: "Relationship traversal",
      desc: "Follow contracts to invoices to payments to owners — the graph is one query away.",
    },
    {
      icon: Scale,
      title: "Policy checks",
      desc: "Ask \u201Cis this action allowed?\u201D before executing. Orgni evaluates the applicable rules for you.",
    },
  ];

  return (
    <section className="py-24 px-6 max-w-screen-xl mx-auto border-t border-border">
      <div className="max-w-2xl mb-16">
        <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-4">
          What agents can do with Orgni
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed">
          One context layer, four superpowers for any agent framework you
          already use.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {items.map((item) => (
          <div
            key={item.title}
            className="p-6 rounded-xl border border-border bg-muted/20 hover:border-primary/30 transition-colors"
          >
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-5">
              <item.icon className="text-primary" size={18} />
            </div>
            <h3 className="font-medium text-base mb-2">{item.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Quickstart() {
  const mcpConfig = `{
  "mcpServers": {
    "orgni": {
      "url": "https://mcp.orgni.com/v1",
      "headers": {
        "Authorization": "Bearer orgni_live_xxxxxxxx"
      }
    }
  }
}`;

  const sdkExample = `import { Orgni } from "@orgni/sdk";

const orgni = new Orgni({ apiKey: process.env.ORGNI_API_KEY });

// Give your agent verified context before it acts
const context = await orgni.context.get({
  actor: "payments-agent",
  task: "approve-invoice",
  resource: "invoice_INV-2391",
});

if (context.permittedActions.includes("approve")) {
  // safe to execute — every claim is evidence-backed
}`;

  return (
    <section className="py-24 bg-[#050505] text-white px-6">
      <div className="max-w-screen-xl mx-auto">
        <div className="max-w-2xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs font-medium tracking-wide uppercase mb-6">
            <Plug size={14} />
            Two ways to connect
          </div>
          <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-4">
            Connect in minutes
          </h2>
          <p className="text-lg text-white/60 leading-relaxed">
            Point your agent at the Orgni MCP server, or call the Agent Context
            API directly with the SDK. Both respect the same permission model.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div>
            <h3 className="font-medium text-white mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                1
              </span>
              MCP server — works with any MCP client
            </h3>
            <CodeBlock title="mcp.json" copyText={mcpConfig}>
              <pre className="text-white/80 leading-relaxed text-xs md:text-sm font-mono whitespace-pre">
                {mcpConfig}
              </pre>
            </CodeBlock>
          </div>
          <div>
            <h3 className="font-medium text-white mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                2
              </span>
              Agent Context API — full control via SDK
            </h3>
            <CodeBlock title="agent.ts" copyText={sdkExample}>
              <pre className="text-white/80 leading-relaxed text-xs md:text-sm font-mono whitespace-pre">
                {sdkExample}
              </pre>
            </CodeBlock>
          </div>
        </div>
      </div>
    </section>
  );
}

function Guardrails() {
  const rows = [
    {
      title: "Scoped identity",
      desc: "Agents act as named principals with explicit roles — never as superusers.",
    },
    {
      title: "Evidence on every answer",
      desc: "Responses carry source references so downstream decisions are auditable.",
    },
    {
      title: "Conflicts surfaced, not hidden",
      desc: "When sources disagree, agents see the conflict and can escalate to a human.",
    },
    {
      title: "Full decision trail",
      desc: "Every context read and permitted-action check is logged for review.",
    },
  ];

  return (
    <section className="py-24 px-6 max-w-screen-xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
        <div>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-primary/10 mb-6">
            <ShieldCheck className="text-primary" size={24} />
          </div>
          <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-4">
            Guardrails built in
          </h2>
          <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
            Autonomy without governance is a liability. Orgni makes every agent
            action explainable, permissioned, and reviewable by default.
          </p>
        </div>
        <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
          {rows.map((row) => (
            <div key={row.title} className="p-6 bg-muted/20">
              <h3 className="font-medium text-base mb-1.5">{row.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {row.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NextSteps() {
  return (
    <section className="py-24 px-6 max-w-screen-xl mx-auto border-t border-border">
      <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-10">
        Where to go next
      </h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <Link
          href="/docs"
          className="group block p-8 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all"
        >
          <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mb-6">
            <Book className="text-primary" size={24} />
          </div>
          <h3 className="text-xl font-medium mb-3 group-hover:text-primary transition-colors">
            Documentation
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            Core concepts, integration guides, and the complete REST API
            reference.
          </p>
        </Link>
        <Link
          href="/developers"
          className="group block p-8 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all"
        >
          <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mb-6">
            <Terminal className="text-primary" size={24} />
          </div>
          <h3 className="text-xl font-medium mb-3 group-hover:text-primary transition-colors">
            Developer overview
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            The API surface, authentication, and what the organisational model
            exposes.
          </p>
        </Link>
      </div>
    </section>
  );
}
