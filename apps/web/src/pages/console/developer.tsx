import { BookOpen, Braces, KeyRound, Radio, Webhook } from "lucide-react";
import { Link, useRoute } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import AskOrgni from "./ask-orgni";
import Access from "./access";
import Consumers from "./consumers";
import { ConsolePageHeader, SectionTabs } from "./shared";

const tools = [
  {
    name: "API documentation",
    detail: "Current public API and schemas",
    href: "/docs",
    status: "Available",
    icon: BookOpen,
  },
  {
    name: "Context API",
    detail: "Structured model read endpoints",
    status: "Available in console",
    icon: Braces,
  },
  {
    name: "API keys",
    detail: "Credential lifecycle management",
    status: "Not implemented",
    icon: KeyRound,
  },
  {
    name: "MCP",
    detail: "Model Context Protocol consumer access",
    status: "Not implemented",
    icon: Radio,
  },
  {
    name: "Webhooks and Events API",
    detail: "Outbound and inbound event contracts",
    status: "Not implemented",
    icon: Webhook,
  },
];

const tabs = [
  { label: "API setup", href: "/app/developer" },
  { label: "Consumers", href: "/app/developer/consumers" },
  { label: "Access", href: "/app/developer/access" },
  { label: "Context Explorer", href: "/app/developer/explorer" },
];

export default function Developer() {
  const [, params] = useRoute("/app/developer/:view");
  const view = params?.view ?? "setup";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <ConsolePageHeader
        title="Developer"
        description="Configure how applications, agents and services access Orgni infrastructure."
      />
      <SectionTabs tabs={tabs} />

      {view === "setup" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {tools.map((tool) => (
            <Card key={tool.name}>
              <CardContent className="flex gap-3 p-4">
                <tool.icon className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  {tool.href ? (
                    <Link
                      href={tool.href}
                      className="text-sm font-medium hover:text-primary"
                    >
                      {tool.name}
                    </Link>
                  ) : (
                    <h2 className="text-sm font-medium">{tool.name}</h2>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tool.detail}
                  </p>
                  <p className="mt-3 font-mono text-[10px] uppercase text-muted-foreground">
                    {tool.status}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {view === "consumers" && <Consumers embedded />}
      {view === "access" && <Access embedded />}
      {view === "explorer" && <AskOrgni embedded />}
    </div>
  );
}
