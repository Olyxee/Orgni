import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { LogOut, Building, User, Shield } from "lucide-react";

export default function Settings() {
  const { session, logout } = useAuth();
  const [, navigate] = useLocation();

  if (!session) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Organisation, tenant and environment configuration.
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-6 border-b border-border/50">
          <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider font-sans">
            Organisation and environment
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <div className="font-medium text-base">
                  {session.organization}
                </div>
                <div className="text-xs text-muted-foreground font-mono mt-1">
                  Tenant: {session.tenantId}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider font-sans">
            Session
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="font-medium text-base">{session.email}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Console administrator session
                </div>
              </div>
            </div>
            {session.roles && session.roles.length > 0 && (
              <div className="flex items-center gap-4 mt-6">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium flex gap-2">
                    {session.roles.map((r) => (
                      <span
                        key={r}
                        className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-full font-mono"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Assigned Roles
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-border p-6">
        <h2 className="text-sm font-semibold">Configuration not yet exposed</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Retention, confidence thresholds, audit configuration and data
          residency require administrative backend endpoints that are not
          implemented in this environment.
        </p>
      </div>

      <div className="pt-2">
        <Button
          variant="outline"
          onClick={() => {
            logout();
            navigate("/");
          }}
          className="flex items-center gap-2 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
