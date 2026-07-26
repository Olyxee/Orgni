import { listRelationships } from "@/lib/api";
import { useData, ErrorState, EmptyState, DefensiveDisplay } from "./shared";
import { Network, FileText } from "lucide-react";
import { Link } from "wouter";

export default function Relationships() {
  const { data, loading, error } = useData(listRelationships);

  if (loading)
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-muted/50 rounded-lg w-1/4" />
        <div className="h-[300px] bg-muted/50 rounded-lg" />
      </div>
    );
  if (error) return <ErrorState error={error} />;

  const relationships = data?.relationships || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          Relationships
        </h1>
        <p className="text-muted-foreground text-sm">
          Mapped connections between organizational entities.
        </p>
      </div>

      {relationships.length === 0 ? (
        <EmptyState
          icon={Network}
          title="No relationships mapped"
          description="When Orgni connects multiple entities across your evidence sources (e.g. Employee works for Department), those structural links appear here."
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {relationships.map((r, i) => (
            <div
              key={i}
              className="p-4 rounded-lg border border-border bg-card"
            >
              <DefensiveDisplay data={r.relationship} />
              <div className="mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground flex items-center gap-1.5">
                <FileText className="w-3 h-3 shrink-0" />
                Provenance:{" "}
                <Link
                  href={`/app/sources/${r.source.sourceId}`}
                  className="hover:underline truncate"
                >
                  {r.source.filename}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
