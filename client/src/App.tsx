// @ts-nocheck
import React, { useEffect, Suspense, lazy } from "react";
import { supabase } from "@/lib/supabase";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ScrollToTop from "./components/ScrollToTop";
import JanIAFloatingButton from "./components/JanIAFloatingButton";

// Rutas críticas cargadas de forma prioritaria
import Home from "./pages/Home";

// Rutas secundarias con Code-Splitting / Lazy Loading automático
const Properties = lazy(() => import("./pages/Properties"));
const PropertyDetail = lazy(() => import("./pages/PropertyDetail"));
const Blog = lazy(() => import("./pages/Blog"));
const Investors = lazy(() => import("./pages/Investors"));
const Services = lazy(() => import("./pages/Services"));
const Contact = lazy(() => import("./pages/Contact"));
const Admin = lazy(() => import("./pages/Admin"));
const Login = lazy(() => import("./pages/Login"));
const AgentDashboard = lazy(() => import("./pages/AgentDashboard"));
const StealthPropertyView = lazy(() => import("./pages/StealthPropertyView"));
const UnbrandedFicha = lazy(() => import("./pages/UnbrandedFicha"));
const Agenda = lazy(() => import("./pages/Agenda"));
const RedColaboracion = lazy(() => import("./pages/RedColaboracion"));
const RequirementsMarketplace = lazy(() => import("./pages/RequirementsMarketplace"));
const NuestraHistoria = lazy(() => import("./pages/NuestraHistoria"));
const JanIAConsole = lazy(() => import("./pages/JanIAConsole"));
const NotFound = lazy(() => import("./pages/NotFound"));

function PageLoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
      <div className="w-9 h-9 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      <p className="text-zinc-400 text-xs font-mono uppercase tracking-widest animate-pulse">Cargando...</p>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/properties"} component={Properties} />
        <Route path={"/property/:id"} component={PropertyDetail} />
        <Route path={"/blog"} component={Blog} />
        <Route path={"/investors"} component={Investors} />
        <Route path={"/services"} component={Services} />
        <Route path={"/contact"} component={Contact} />
        <Route path={"/admin"} component={Admin} />
        <Route path={"/login"} component={Login} />
        <Route path={"/agent-dashboard"} component={AgentDashboard} />
        <Route path={"/p/:token"} component={StealthPropertyView} />
        <Route path={"/ficha/:id"} component={UnbrandedFicha} />
        <Route path={"/agenda/:propertyId"} component={Agenda} />
        <Route path={"/red-colaboracion"} component={RedColaboracion} />
        <Route path={"/requerimientos"} component={RequirementsMarketplace} />
        <Route path={"/historia"} component={NuestraHistoria} />
        <Route path={"/jania"} component={JanIAConsole} />
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

/**
 * Restaurador de URL post-OAuth.
 * Si el usuario hizo OAuth desde /agenda/13?nombre=...&codigo=...
 * y Supabase los redirigió a la raíz, este componente los devuelve al lugar correcto.
 */
function OAuthRedirectRestorer() {
  useEffect(() => {
    const returnUrl = localStorage.getItem('vecy_agenda_return_url');
    if (!returnUrl) return;
    // Solo restaurar si hay una sesión activa
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && returnUrl !== window.location.href) {
        localStorage.removeItem('vecy_agenda_return_url');
        window.location.href = returnUrl;
      }
    });
  }, []);
  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        storageKey="vecy-ui-theme"
      >
        <TooltipProvider>
          <Toaster />
          <OAuthRedirectRestorer />
          <ScrollToTop />
          <Router />
          <JanIAFloatingButton />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
