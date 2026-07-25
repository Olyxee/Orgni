import { Sparkles } from "lucide-react";
import { EmptyState } from "./shared";

export default function AskOrgni() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-serif tracking-tight mb-2">Ask Orgni</h1>
        <p className="text-muted-foreground text-sm">Natural language querying over your organizational model.</p>
      </div>

      <div className="mt-12">
        <EmptyState 
          icon={Sparkles}
          title="Coming soon"
          description="Grounded question-answering over the organizational model arrives when the intelligence services are connected. Soon, you will be able to query facts, explore relationships, and trace every answer back to its original evidence source."
        />
      </div>
    </div>
  );
}