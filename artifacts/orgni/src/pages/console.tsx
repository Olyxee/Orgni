import { useEffect } from "react";
import { Switch, Route, Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { 
  LayoutDashboard, FileText, CheckCircle, Database, 
  Network, Lightbulb, AlertTriangle, Activity as ActivityIcon, 
  Sparkles, Settings as SettingsIcon 
} from "lucide-react";

import Overview from "./console/overview";
import Sources from "./console/sources";
import SourceDetail from "./console/source-detail";
import Review from "./console/review";
import Entities from "./console/entities";
import EntityDetail from "./console/entity-detail";
import Relationships from "./console/relationships";
import Facts from "./console/facts";
import Exceptions from "./console/exceptions";
import Activity from "./console/activity";
import AskOrgni from "./console/ask-orgni";
import Settings from "./console/settings";

function Sidebar() {
  const [location] = useLocation();
  const nav = [
    { name: "Overview", href: "/app", icon: LayoutDashboard, exact: true },
    { name: "Sources", href: "/app/sources", icon: FileText, match: "/app/sources" },
    { name: "Review", href: "/app/review", icon: CheckCircle },
    { name: "Entities", href: "/app/entities", icon: Database, match: "/app/entities" },
    { name: "Relationships", href: "/app/relationships", icon: Network },
    { name: "Facts", href: "/app/facts", icon: Lightbulb },
    { name: "Exceptions", href: "/app/exceptions", icon: AlertTriangle },
    { name: "Activity", href: "/app/activity", icon: ActivityIcon },
    { name: "Ask Orgni", href: "/app/ask", icon: Sparkles },
  ];

  return (
    <div className="w-64 shrink-0 flex flex-col gap-6 sticky top-22 max-h-[calc(100vh-8rem)]">
      <nav className="flex flex-col gap-1 pr-2">
        {nav.map(item => {
          const isActive = item.exact ? location === item.href : (item.match ? location.startsWith(item.match) : location === item.href);
          return (
            <Link key={item.name} href={item.href} className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? "bg-accent/50 text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}>
              <item.icon className="w-4 h-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      
      <div className="mt-auto flex flex-col gap-1 border-t border-border/50 pt-4 pr-2">
        <Link href="/app/settings" className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${location === "/app/settings" ? "bg-accent/50 text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}>
          <SettingsIcon className="w-4 h-4" />
          Settings
        </Link>
      </div>
    </div>
  )
}

export default function Console() {
  const { session } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!session) {
      navigate("/login");
    }
  }, [session, navigate]);

  if (!session) return null;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col font-sans">
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/app" className="font-semibold tracking-tight text-lg">
            Orgni Console
          </Link>
          <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
            {session.organization}
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 flex flex-col md:flex-row gap-8">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <main className="flex-1 min-w-0">
          <Switch>
            <Route path="/app" component={Overview} />
            <Route path="/app/sources" component={Sources} />
            <Route path="/app/sources/:id" component={SourceDetail} />
            <Route path="/app/review" component={Review} />
            <Route path="/app/entities" component={Entities} />
            <Route path="/app/entities/:id" component={EntityDetail} />
            <Route path="/app/relationships" component={Relationships} />
            <Route path="/app/facts" component={Facts} />
            <Route path="/app/exceptions" component={Exceptions} />
            <Route path="/app/activity" component={Activity} />
            <Route path="/app/ask" component={AskOrgni} />
            <Route path="/app/settings" component={Settings} />
          </Switch>
        </main>
      </div>
    </div>
  );
}