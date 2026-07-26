import { getOverview } from "@/lib/api";
import { useData, ErrorState } from "./shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export default function Overview() {
  const { data, loading, error } = useData(getOverview);

  if (loading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  if (error) return <ErrorState error={error} />;
  if (!data) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          Organization Overview
        </h1>
        <p className="text-muted-foreground text-sm">
          Current state of the organizational model.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Sources"
          value={data.sources.total}
          href="/app/sources"
        />
        <MetricCard
          title="Entities"
          value={data.entities}
          href="/app/entities"
        />
        <MetricCard
          title="Relationships"
          value={data.relationships}
          href="/app/relationships"
        />
        <MetricCard title="Facts" value={data.facts.total} href="/app/facts" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-sans tracking-tight">
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-border/50">
              <span className="text-sm text-muted-foreground">
                Pending Reviews
              </span>
              <span className="font-medium text-lg">{data.reviews}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Unresolved Exceptions
              </span>
              <span className="font-medium text-lg">{data.exceptions}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-sans tracking-tight">
              Latest Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.latestSources.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sources processed yet.
              </p>
            ) : (
              <div className="space-y-3">
                {data.latestSources.slice(0, 3).map((s) => (
                  <div
                    key={s.sourceId}
                    className="flex justify-between items-center text-sm pb-2 last:pb-0 border-b border-border/50 last:border-0"
                  >
                    <Link
                      href={`/app/sources/${s.sourceId}`}
                      className="truncate max-w-[200px] font-medium hover:text-primary transition-colors hover:underline"
                    >
                      {s.filename}
                    </Link>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(s.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  href,
}: {
  title: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full bg-card hover:bg-muted/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider font-sans">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold text-foreground">{value}</div>
        </CardContent>
      </Card>
    </Link>
  );
}
