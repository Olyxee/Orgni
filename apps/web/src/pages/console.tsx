import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import {
  listDocuments,
  uploadDocument,
  type DocumentSummary,
  type UploadResult,
} from "@/lib/api";

/**
 * Authenticated console: upload a document and see what Orgni made of it —
 * tokens, reviewable facts, and the safeguards (what it refused to assert).
 * Protected: redirects to /login when there is no session.
 */
export default function Console() {
  const { session, logout } = useAuth();
  const [, navigate] = useLocation();
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    if (!session) return;
    try {
      const { documents } = await listDocuments(session.token);
      setDocs(documents);
    } catch {
      /* list may be empty / persistence off */
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      navigate("/login");
      return;
    }
    void refresh();
  }, [session, navigate, refresh]);

  if (!session) return null;

  async function onUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file || !session) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await uploadDocument(session.token, file);
      setResult(r);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "upload_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-semibold tracking-tight">Orgni Console</span>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {session.email} · {session.organization}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <section className="rounded-lg border border-border p-6">
          <h1 className="text-lg font-semibold mb-1">Upload a document</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Invoice, proof of payment, or contract (PDF, PNG/JPEG, or plain
            text).
          </p>
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain"
              className="text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-sm"
            />
            <Button onClick={onUpload} disabled={busy}>
              {busy ? "Processing…" : "Process"}
            </Button>
          </div>
          {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
        </section>

        {result && <ResultView result={result} />}

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Your documents
          </h2>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing yet — upload a document above.
            </p>
          ) : (
            <div className="rounded-lg border border-border divide-y divide-border">
              {docs.map((d) => (
                <div
                  key={d.sourceId}
                  className="px-4 py-3 flex items-center justify-between text-sm"
                >
                  <span className="truncate">{d.filename}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary">
                      {d.documentType ?? "UNKNOWN"}
                    </Badge>
                    <Badge>{d.state}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ResultView({ result }: { result: UploadResult }) {
  const facts = result.facts;
  return (
    <section className="rounded-lg border border-border p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Badge variant="secondary">{result.documentType}</Badge>
        <Badge>{result.state}</Badge>
        <span className="text-xs text-muted-foreground font-mono">
          {result.sourceId}
        </span>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">
          Organizational tokens ({result.tokens.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {result.tokens.map((t, i) => (
            <Badge key={i} variant="outline">
              {String(t["tokenKind"])} ·{" "}
              {String(t["eventType"] ?? t["predicate"] ?? "")}
            </Badge>
          ))}
        </div>
      </div>

      {facts && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Entities</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              {(facts.entities ?? []).map((e, i) => (
                <li key={i}>{e.name}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Facts</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              {(facts.facts ?? []).map((f, i) => (
                <li key={i}>
                  {f.fact_type}{" "}
                  <span className="text-xs opacity-70">
                    ({f.epistemic_status})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {result.warnings.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">
            What Orgni would not assert
          </h3>
          <ul className="text-sm text-amber-600 dark:text-amber-500 space-y-1">
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
