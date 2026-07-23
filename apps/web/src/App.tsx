import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Platform from "@/pages/platform";
import UseCases from "@/pages/use-cases";
import Infrastructure from "@/pages/infrastructure";
import Pricing from "@/pages/pricing";
import Docs from "@/pages/docs";
import Api from "@/pages/api";
import Thesis from "@/pages/thesis";
import { CommandPaletteProvider } from "@/components/command-palette";
import { ScrollToTopButton } from "@/components/scroll-to-top";

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
      <Route path="/pricing" component={Pricing} />
      <Route path="/docs" component={Docs} />
      <Route path="/api-reference" component={Api} />
      <Route path="/thesis" component={Thesis} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
}

export default App;
