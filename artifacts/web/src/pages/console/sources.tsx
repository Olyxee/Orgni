import { useState, useRef } from "react";
import { listDocuments, uploadDocument } from "@/lib/api";
import { useData, ErrorState, EmptyState } from "./shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { FileText, Plus, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function Sources() {
  const { data, loading, error, refetch } = useData(listDocuments);
  const { session } = useAuth();

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    setUploading(true);
    setUploadError(null);
    try {
      await uploadDocument(session.token, file);
      await refetch?.();
    } catch (err: any) {
      if (
        err.status === 503 ||
        err.code === "document_intelligence_unavailable"
      ) {
        setUploadError(
          "Processing services are not yet connected in this environment. Once connected, Orgni will automatically extract entities, facts, and relationships from this source.",
        );
      } else {
        setUploadError(err.message || "Failed to process source.");
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const sources = data?.documents || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">
            Evidence Sources
          </h1>
          <p className="text-muted-foreground text-sm">
            Processed organizational evidence.
          </p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            onChange={onUpload}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.txt"
          />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? (
              "Processing..."
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Source
              </>
            )}
          </Button>
        </div>
      </div>

      {uploadError && (
        <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm flex gap-3 items-start">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{uploadError}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-muted/50 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} />
      ) : sources.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No evidence sources"
          description="Upload invoices, contracts, or proofs of payment. Orgni will continuously process them to build a living model of the organization."
        />
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border bg-card">
          {sources.map((s) => (
            <Link key={s.sourceId} href={`/app/sources/${s.sourceId}`}>
              <div className="px-4 py-4 flex items-center justify-between text-sm hover:bg-muted/30 transition-colors cursor-pointer group">
                <div>
                  <div className="font-medium group-hover:text-primary transition-colors">
                    {s.filename}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 font-mono">
                    {new Date(s.uploadedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant="secondary"
                    className="font-mono text-xs font-normal"
                  >
                    {s.documentType || "UNKNOWN"}
                  </Badge>
                  <Badge
                    variant={s.state === "COMPLETED" ? "default" : "outline"}
                    className="font-mono text-xs"
                  >
                    {s.state}
                  </Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
