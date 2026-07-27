import { useEffect } from "react";
import { Redirect, Route, Switch, Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  Braces,
  Database,
  Home,
  Plug,
  Settings as SettingsIcon,
  ShieldCheck,
} from "lucide-react";

import Overview from "./console/overview";
import Connections from "./console/connections";
import ContextModel from "./console/context-model";
import DataQuality from "./console/data-quality";
import Developer from "./console/developer";
import SourceDetail from "./console/source-detail";
import EntityDetail from "./console/entity-detail";
import Settings from "./console/settings";

const nav = [
  { name: "Home", href: "/app", icon: Home, exact: true },
  { name: "Connections", href: "/app/connections", icon: Plug },
  {
    name: "Context Model",
    href: "/app/context-model/visualization",
    match: "/app/context-model",
    icon: Database,
  },
  {
    name: "Data Quality",
    href: "/app/data-quality/issues",
    match: "/app/data-quality",
    icon: ShieldCheck,
  },
  {
    name: "Developer",
    href: "/app/developer",
    match: "/app/developer",
    icon: Braces,
  },
];

function NavLink({
  item,
  mobile = false,
}: {
  item: (typeof nav)[number];
  mobile?: boolean;
}) {
  const [location] = useLocation();
  const active = item.exact
    ? location === item.href
    : location.startsWith(item.match ?? item.href);
  return (
    <Link
      href={item.href}
      className={`${mobile ? "shrink-0" : ""} flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-accent/50 text-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      }`}
    >
      <item.icon className="size-4" />
      {item.name}
    </Link>
  );
}

function Sidebar() {
  const [location] = useLocation();
  return (
    <div className="sticky top-22 flex max-h-[calc(100vh-8rem)] w-64 shrink-0 flex-col gap-6">
      <nav className="flex flex-col gap-1 pr-2">
        {nav.map((item) => (
          <NavLink key={item.name} item={item} />
        ))}
      </nav>
      <div className="mt-auto border-t border-border/50 pt-4 pr-2">
        <Link
          href="/app/settings"
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${location === "/app/settings" ? "bg-accent/50 text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}
        >
          <SettingsIcon className="size-4" /> Settings
        </Link>
      </div>
    </div>
  );
}

export default function Console() {
  const { session } = useAuth();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (!session) navigate("/login");
  }, [session, navigate]);
  if (!session) return null;

  return (
    <div className="orgni-console flex min-h-[100dvh] flex-col bg-background font-sans text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/app">
            <div className="text-base font-semibold tracking-tight">
              Orgni Console
            </div>
            <div className="text-[10px] text-muted-foreground">
              Operational intelligence infrastructure
            </div>
          </Link>
          <div className="text-sm font-medium text-muted-foreground">
            {session.organization}
          </div>
        </div>
        <nav
          className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 pb-2 md:hidden"
          aria-label="Console navigation"
        >
          {nav.map((item) => (
            <NavLink key={item.name} item={item} mobile />
          ))}
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-8">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <main className="min-w-0 flex-1">
          <Switch>
            <Route path="/app" component={Overview} />
            <Route path="/app/connections" component={Connections} />
            <Route path="/app/context-model" component={ContextModel} />
            <Route path="/app/context-model/:view" component={ContextModel} />
            <Route path="/app/data-quality" component={DataQuality} />
            <Route path="/app/data-quality/:view" component={DataQuality} />
            <Route path="/app/developer" component={Developer} />
            <Route path="/app/developer/:view" component={Developer} />
            <Route path="/app/settings" component={Settings} />

            <Route path="/app/sources/:id" component={SourceDetail} />
            <Route path="/app/entities/:id" component={EntityDetail} />
            <Route path="/app/sources">
              <Redirect to="/app/connections" />
            </Route>
            <Route path="/app/entities">
              <Redirect to="/app/context-model/entities" />
            </Route>
            <Route path="/app/relationships">
              <Redirect to="/app/context-model/relationships" />
            </Route>
            <Route path="/app/facts">
              <Redirect to="/app/context-model/facts" />
            </Route>
            <Route path="/app/review">
              <Redirect to="/app/data-quality/review" />
            </Route>
            <Route path="/app/exceptions">
              <Redirect to="/app/data-quality/issues" />
            </Route>
            <Route path="/app/activity">
              <Redirect to="/app" />
            </Route>
            <Route path="/app/events">
              <Redirect to="/app" />
            </Route>
            <Route path="/app/ask">
              <Redirect to="/app/developer/explorer" />
            </Route>
            <Route path="/app/access">
              <Redirect to="/app/developer/access" />
            </Route>
            <Route path="/app/consumers">
              <Redirect to="/app/developer/consumers" />
            </Route>
            <Route path="/app/observability">
              <Redirect to="/app" />
            </Route>
          </Switch>
        </main>
      </div>
    </div>
  );
}
