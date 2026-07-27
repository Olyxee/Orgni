import { listFacts } from "@/lib/api";
import { useData, ErrorState, EmptyState, DefensiveDisplay } from "./shared";
import { Lightbulb, FileText } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function Facts({ embedded = false }: { embedded?: boolean }) {
  const { data, loading, error } = useData(listFacts);

  if (loading)
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-muted/50 rounded-lg w-1/4" />
        <div className="h-[300px] bg-muted/50 rounded-lg" />
      </div>
    );
  if (error) return <ErrorState error={error} />;

  const facts = data?.facts || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">
            Verified Facts
          </h1>
          <p className="text-muted-foreground text-sm">
            Organizational facts with their epistemic status and provenance.
          </p>
        </div>
      )}

      {facts.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="No organisational context has been resolved yet"
          description="Connect a source, upload supported evidence or send an event through the API to begin building the context model."
        />
      ) : (
        <div className="space-y-4">
          {facts.map((f, i) => {
            const status = String(
              f.fact.epistemic_status || f.fact.status || "ASSERTED",
            );
            return (
              <div
                key={i}
                className="p-4 rounded-lg border border-border bg-card flex flex-col sm:flex-row gap-4 justify-between sm:items-start"
              >
                <div className="flex-1 min-w-0">
                  <div className="mb-3">
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] uppercase tracking-wider font-normal bg-muted/30"
                    >
                      {status}
                    </Badge>
                  </div>
                  <DefensiveDisplay data={f.fact} />
                </div>
                <div className="sm:text-right shrink-0">
                  <div className="text-xs text-muted-foreground flex items-center sm:justify-end gap-1.5 mt-2 sm:mt-0">
                    <FileText className="w-3 h-3 shrink-0" />
                    <Link
                      href={`/app/sources/${f.source.sourceId}`}
                      className="hover:underline truncate max-w-[200px]"
                    >
                      {f.source.filename}
                    </Link>
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 mt-1.5 font-mono">
                    {new Date(f.source.uploadedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
