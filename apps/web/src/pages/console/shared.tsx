import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { LucideIcon } from "lucide-react";

export function useData<T>(
  fetcher: (token: string, arg?: any) => Promise<T>,
  arg?: any,
) {
  const { session } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const execute = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current(session.token, arg);
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [session, arg]);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch: execute };
}

export function ErrorState({ error }: { error: any }) {
  return (
    <div className="p-4 border border-destructive/20 bg-destructive/10 text-destructive rounded-md text-sm">
      {error?.message || "An error occurred while fetching data."}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-lg bg-card/50">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
        <Icon className="h-6 w-6" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-semibold mb-2 tracking-tight">{title}</h3>
      <div className="text-sm text-muted-foreground max-w-[400px] mb-6 leading-relaxed">
        {description}
      </div>
      {action}
    </div>
  );
}

export function DefensiveDisplay({
  data,
}: {
  data: Record<string, unknown> | null | undefined;
}) {
  if (!data)
    return <span className="text-muted-foreground text-xs italic">Empty</span>;
  if (data.name) return <span>{String(data.name)}</span>;
  if (data.type) return <span>{String(data.type)}</span>;

  const entries = Object.entries(data).filter(
    ([_, v]) => v !== null && v !== undefined,
  );
  if (entries.length === 0)
    return <span className="text-muted-foreground text-xs italic">Empty</span>;

  return (
    <div className="flex flex-col gap-1 text-xs">
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <span className="text-muted-foreground shrink-0">{k}:</span>
          <span className="font-mono break-all">
            {typeof v === "object" ? JSON.stringify(v) : String(v)}
          </span>
        </div>
      ))}
    </div>
  );
}
