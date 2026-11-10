import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/app/primitives";
import { useAuth } from "@/lib/auth";
import { productApi, type AskResult } from "@/lib/orgni/http-service";
import { useOrgni } from "@/lib/orgni/service";

interface Message {
  id: number;
  role: "user" | "orgni";
  text: string;
  evidence?: string[];
  action?: AskResult["action"];
}

const SUGGESTIONS = [
  "What has Orgni learned from my files?",
  "Summarize the key facts in my uploaded documents",
  "What information is missing or uncertain?",
];

export default function Ask() {
  const { session } = useAuth();
  const { state, refresh } = useOrgni();
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = question.trim();
    if (!session || !text || busy) return;

    setQuestion("");
    setBusy(true);
    setMessages((current) => [
      ...current,
      { id: Date.now(), role: "user", text },
    ]);

    try {
      const result = await productApi.ask(session.token, text);
      setMessages((current) => [
        ...current,
        {
          id: Date.now(),
          role: "orgni",
          text: result.reply,
          evidence: result.action.sourcesUsed,
          action: result.action,
        },
      ]);
      refresh();
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: Date.now(),
          role: "orgni",
          text: "I couldn't reach Orgni just now. Please try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-7rem)] min-h-[480px] max-w-3xl flex-col gap-5 animate-in fade-in duration-300">
      <PageHeader
        title="Ask Orgni"
        description="Ask about what Orgni has learned from your organisation's information."
      />

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-card">
        {messages.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center px-5 py-10 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-accent">
              <Sparkles className="size-5" />
            </div>
            <h2 className="mt-4 text-base font-medium">What would you like to know?</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Orgni will use the facts extracted from your uploaded files.
            </p>
            {state.knowledge.sources.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Upload files from Knowledge to give Orgni evidence to work with.
              </p>
            ) : null}
            <div className="mt-6 flex max-w-xl flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setQuestion(suggestion)}
                  className="rounded-lg border border-border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 p-4 sm:p-6">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "orgni" ? (
                  <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent">
                    <Sparkles className="size-3.5" />
                  </span>
                ) : null}
                <div
                  className={`max-w-[85%] min-w-0 rounded-xl px-4 py-3 text-sm ${
                    message.role === "user"
                      ? "bg-foreground text-background"
                      : "bg-background"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                  {message.evidence && message.evidence.length > 0 ? (
                    <details className="mt-3 border-t border-border/70 pt-2 text-xs text-muted-foreground">
                      <summary className="cursor-pointer font-medium">Evidence used</summary>
                      <ul className="mt-2 list-inside list-disc space-y-1">
                        {message.evidence.map((line, index) => (
                          <li key={`${message.id}-${index}`} className="break-words">
                            {line}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                  {message.action?.status === "awaiting_approval" ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      This request is waiting for approval in Activity.
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
            {busy ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Orgni is thinking…
              </div>
            ) : null}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <form onSubmit={submit} className="flex items-end gap-2 rounded-xl border border-border bg-card p-2">
        <Textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          rows={2}
          placeholder="Ask a question about your uploaded information…"
          aria-label="Your question for Orgni"
          className="max-h-36 min-h-11 resize-y border-0 shadow-none focus-visible:ring-0"
        />
        <Button
          type="submit"
          size="icon"
          disabled={busy || !question.trim()}
          aria-label="Send question"
          title="Send question"
        >
          {busy ? <Loader2 className="animate-spin" /> : <Send />}
        </Button>
      </form>
    </div>
  );
}