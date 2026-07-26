import { listEntities } from "@/lib/api";
import { useData, ErrorState, EmptyState } from "./shared";
import { Database } from "lucide-react";
import { Link } from "wouter";

export default function Entities() {
  const { data, loading, error } = useData(listEntities);

  if (loading)
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-muted/50 rounded-lg w-1/4" />
        <div className="h-[300px] bg-muted/50 rounded-lg" />
      </div>
    );
  if (error) return <ErrorState error={error} />;

  const entities = data?.entities || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Entities</h1>
        <p className="text-muted-foreground text-sm">
          De-duplicated organizational entities mapped from evidence.
        </p>
      </div>

      {entities.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No entities discovered"
          description="As Orgni processes evidence sources, it will automatically extract and de-duplicate organizational entities (people, companies, projects) and map them here."
        />
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-1/2">
                  Entity
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Type / Key
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Occurrences
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entities.map((e) => (
                <tr key={e.key} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/entities/${encodeURIComponent(e.key)}`}
                      className="font-medium hover:text-primary transition-colors block"
                    >
                      {e.entity.name ? String(e.entity.name) : e.key}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {e.entity.type ? String(e.entity.type) : "entity"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center justify-center bg-muted px-2 py-0.5 rounded-full text-xs font-mono">
                      {e.occurrences}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
