// @ts-nocheck
import React from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Admin from "@/pages/Admin";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import PropertyDetail from "./pages/PropertyDetail";
import Properties from "./pages/Properties";
import Blog from "./pages/Blog";
import Investors from "./pages/Investors";
import Services from "./pages/Services";
import Contact from "./pages/Contact";
import JanIAWidget from "./components/JanIAWidget";
import AgentDashboard from "./pages/AgentDashboard";
import StealthPropertyView from "./pages/StealthPropertyView";
import UnbrandedFicha from "./pages/UnbrandedFicha";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/properties"} component={Properties} />
      <Route path={"/property/:id"} component={PropertyDetail} />
      <Route path={"/blog"} component={Blog} />
      <Route path={"/investors"} component={Investors} />
      <Route path={"/services"} component={Services} />
      <Route path={"/contact"} component={Contact} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/agent-dashboard"} component={AgentDashboard} />
      <Route path={"/p/:token"} component={StealthPropertyView} />
      <Route path={"/ficha/:id"} component={UnbrandedFicha} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
          <JanIAWidget />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
