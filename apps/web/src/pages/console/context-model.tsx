import { Redirect, useRoute } from "wouter";
import { EmptyState, ConsolePageHeader, SectionTabs } from "./shared";
import Entities from "./entities";
import Relationships from "./relationships";
import Facts from "./facts";
import { History, ShieldCheck } from "lucide-react";

const tabs = [
  { label: "Entities", href: "/app/context-model/entities" },
  { label: "Relationships", href: "/app/context-model/relationships" },
  { label: "Facts", href: "/app/context-model/facts" },
  { label: "Policies", href: "/app/context-model/policies" },
  { label: "History", href: "/app/context-model/history" },
];

export default function ContextModel() {
  const [, params] = useRoute("/app/context-model/:view");
  const view = params?.view;
  if (!view) return <Redirect to="/app/context-model/entities" />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <ConsolePageHeader
        title="Context Model"
        description="The structured organisational context maintained by Orgni, with evidence, confidence and provenance preserved."
      />
      <SectionTabs tabs={tabs} />
      {view === "entities" && <Entities embedded />}
      {view === "relationships" && <Relationships embedded />}
      {view === "facts" && <Facts embedded />}
      {view === "policies" && (
        <EmptyState
          icon={ShieldCheck}
          title="No model policies configured"
          description="Policy evaluation is not available in the current backend. Model-governance rules will appear here when that service is implemented."
        />
      )}
      {view === "history" && (
        <EmptyState
          icon={History}
          title="Model history is not available yet"
          description="Temporal model snapshots and change history require backend versioning support that is not currently implemented."
        />
      )}
    </div>
  );
}
