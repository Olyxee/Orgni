import { getActivity } from "@/lib/api";
import { useData, ErrorState, EmptyState } from "./shared";
import { Activity as ActivityIcon, FileText, Edit3 } from "lucide-react";
import { Link } from "wouter";

export default function Activity() {
  const { data, loading, error } = useData(getActivity);

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-10 bg-muted/50 rounded-lg w-1/4" /><div className="h-[300px] bg-muted/50 rounded-lg" /></div>;
  if (error) return <ErrorState error={error} />;
  
  const events = data?.events || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-serif tracking-tight mb-2">Activity</h1>
        <p className="text-muted-foreground text-sm">Chronological record of sources processed and reviews.</p>
      </div>

      {events.length === 0 ? (
        <EmptyState 
          icon={ActivityIcon}
          title="No activity yet"
          description="As Orgni processes sources and human operators resolve reviews, the chronological log will build here."
        />
      ) : (
        <div className="relative border-l border-border/50 ml-3 pl-6 space-y-8 py-2">
          {events.map((e, i) => (
            <div key={i} className="relative">
              <div className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary" />
              <div className="text-xs text-muted-foreground mb-1 font-mono">
                {new Date(e.at).toLocaleString()}
              </div>
              
              {e.type === "SOURCE_PROCESSED" ? (
                <div className="p-4 border border-border rounded-lg bg-card mt-2 inline-block min-w-[300px]">
                  <div className="flex items-center gap-2 text-sm font-medium mb-2 border-b border-border/50 pb-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    Source Processed
                  </div>
                  <div className="text-sm text-foreground">
                    <Link href={`/app/sources/${e.sourceId}`} className="hover:text-primary transition-colors hover:underline font-medium">
                      {e.filename}
                    </Link>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground font-mono">
                    Status: {e.state}
                  </div>
                </div>
              ) : (
                <div className="p-4 border border-border rounded-lg bg-card mt-2 inline-block min-w-[300px]">
                  <div className="flex items-center gap-2 text-sm font-medium mb-2 border-b border-border/50 pb-2">
                    <Edit3 className="w-4 h-4 text-muted-foreground" />
                    Human Review
                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    <span className="text-foreground font-medium">{e.reviewer}</span> applied <span className="font-mono text-xs font-semibold px-1 py-0.5 bg-muted rounded">{e.action}</span> on <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded text-foreground">{e.fieldPath}</code>
                  </div>
                  <div className="mt-3">
                    <Link href={`/app/sources/${e.sourceId}`} className="text-xs hover:underline flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                      <FileText className="w-3 h-3" /> View Source
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}