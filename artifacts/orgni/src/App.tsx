import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Platform from "@/pages/platform";
import UseCases from "@/pages/use-cases";
import Infrastructure from "@/pages/infrastructure";
import Developers from "@/pages/developers";
import Pricing from "@/pages/pricing";
import Docs from "@/pages/docs";
import Thesis from "@/pages/thesis";
import Login from "@/pages/login";
import Console from "@/pages/console";
import { CommandPaletteProvider } from "@/components/command-palette";
import { ScrollToTopButton } from "@/components/scroll-to-top";
import { AuthProvider } from "@/lib/auth";

const queryClient = new QueryClient();

function ScrollRestore() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/platform" component={Platform} />
      <Route path="/use-cases" component={UseCases} />
      <Route path="/infrastructure" component={Infrastructure} />
      <Route path="/developers" component={Developers} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/docs" component={Docs} />
      <Route path="/api-reference"><Redirect to="/docs" /></Route>
      <Route path="/thesis" component={Thesis} />
      <Route path="/login" component={Login} />
      <Route path="/app" component={Console} />
      <Route path="/app/:section" component={Console} />
      <Route path="/app/:section/:id" component={Console} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <CommandPaletteProvider>
              <ScrollRestore />
              <Router />
              <ScrollToTopButton />
            </CommandPaletteProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
