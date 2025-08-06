import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useLastUsedCellar } from "@/hooks/useCellars";
import { useEffect } from "react";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Wines from "@/pages/wines";
import AddWine from "@/pages/add-wine";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const { defaultCellarId, isLoading: isCellarsLoading } = useLastUsedCellar();
  const [location, setLocation] = useLocation();

  // Auto-redirect to last used cellar when user is authenticated and on home page
  useEffect(() => {
    if (isAuthenticated && !isLoading && !isCellarsLoading && defaultCellarId && location === '/') {
      setLocation(`/cellar/${defaultCellarId}`);
    }
  }, [isAuthenticated, isLoading, isCellarsLoading, defaultCellarId, location, setLocation]);

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/cellar/:cellarId" component={Dashboard} />
          <Route path="/cellar/:cellarId/wines" component={Wines} />
          <Route path="/cellar/:cellarId/add-wine" component={AddWine} />
          <Route path="/cellar/:cellarId/settings" component={Settings} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
