// @ts-nocheck
import React, { useEffect, useState, Suspense, lazy } from "react";
import { hasStoredSupabaseSession, INITIAL_URL_HAS_OAUTH_SUCCESS, supabase } from "@/lib/supabase";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ScrollToTop from "./components/ScrollToTop";
import FloatingScrollToTop from "./components/FloatingScrollToTop";
import JanIAFloatingButton from "./components/JanIAFloatingButton";
import AuthLoadingScreen from "./components/AuthLoadingScreen";
import { trpc } from "@/lib/trpc";
import { extractTenantSlugFromHost, isCustomWhiteLabelHost } from "../../shared/whitelabel";
import {
  hasOAuthSuccessParams,
  isSameOriginUrl,
  resolvePostLoginDestination,
  sanitizeInternalRedirectPath,
  shouldHoldInitialRenderForAuth,
} from "../../shared/authRouting";

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
const AgentMicrosite = lazy(() => import("./pages/AgentMicrosite"));
const StealthPropertyView = lazy(() => import("./pages/StealthPropertyView"));
const UnbrandedFicha = lazy(() => import("./pages/UnbrandedFicha"));
const Agenda = lazy(() => import("./pages/Agenda"));
const RedColaboracion = lazy(() => import("./pages/RedColaboracion"));
const RequirementsMarketplace = lazy(() => import("./pages/RequirementsMarketplace"));
const NuestraHistoria = lazy(() => import("./pages/NuestraHistoria"));
const JanIAConsole = lazy(() => import("./pages/JanIAConsole"));
const TerminosCondiciones = lazy(() => import("./pages/TerminosCondiciones"));
const PoliticaPrivacidad = lazy(() => import("./pages/PoliticaPrivacidad"));
const FirmaMatch = lazy(() => import("./pages/FirmaMatch"));
const Planes = lazy(() => import("./pages/Planes"));
const NotFound = lazy(() => import("./pages/NotFound"));

function PageLoadingFallback() {
  return (
    <AuthLoadingScreen
      title="Cargando plataforma..."
      subtitle="Preparando módulo en VECY Bienes Raíces..."
    />
  );
}

function Router() {
  const currentHost = typeof window !== "undefined" ? window.location.hostname : "";
  const whiteLabelSlug = extractTenantSlugFromHost(currentHost);
  const isCustomHost = isCustomWhiteLabelHost(currentHost);

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Switch>
        <Route path={"/"}>
          {whiteLabelSlug || isCustomHost ? <AgentMicrosite hostSlug={whiteLabelSlug || undefined} /> : <Home />}
        </Route>
        <Route path={"/ofertas"} component={Properties} />
        <Route path={"/properties"} component={Properties} />
        <Route path={"/demandas"} component={RequirementsMarketplace} />
        <Route path={"/requerimientos"} component={RequirementsMarketplace} />
        <Route path={"/property/:id"} component={PropertyDetail} />
        <Route path={"/blog"} component={Blog} />
        <Route path={"/investors"} component={Investors} />
        <Route path={"/services"} component={Services} />
        <Route path={"/contact"} component={Contact} />
        <Route path={"/admin"} component={Admin} />
        <Route path={"/login"} component={Login} />
        <Route path={"/agent-dashboard"} component={AgentDashboard} />
        <Route path={"/s/:slug"} component={AgentMicrosite} />
        <Route path={"/agencia/:slug"} component={AgentMicrosite} />
        <Route path={"/p/:token"} component={StealthPropertyView} />
        <Route path={"/ficha/:id"} component={UnbrandedFicha} />
        <Route path={"/agenda"} component={Agenda} />
        <Route path={"/agendar"} component={Agenda} />
        <Route path={"/agenda/:propertyId"} component={Agenda} />
        <Route path={"/red-colaboracion"} component={RedColaboracion} />
        <Route path={"/historia"} component={NuestraHistoria} />
        <Route path={"/jania"} component={JanIAConsole} />
        <Route path={"/terminos-y-condiciones"} component={TerminosCondiciones} />
        <Route path={"/terminos"} component={TerminosCondiciones} />
        <Route path={"/condiciones"} component={TerminosCondiciones} />
        <Route path={"/politica-privacidad"} component={PoliticaPrivacidad} />
        <Route path={"/politica"} component={PoliticaPrivacidad} />
        <Route path={"/privacidad"} component={PoliticaPrivacidad} />
        <Route path={"/firma-match/:token"} component={FirmaMatch} />
        <Route path={"/planes"} component={Planes} />
        <Route path={"/pricing"} component={Planes} />
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

function readSafeAgendaReturnUrl(currentOrigin: string): string {
  if (typeof window === "undefined") return "";
  try {
    const agendaReturnUrl = localStorage.getItem('vecy_agenda_return_url');
    if (!agendaReturnUrl) return "";
    if (!isSameOriginUrl(agendaReturnUrl, currentOrigin)) {
      localStorage.removeItem('vecy_agenda_return_url');
      return "";
    }
    return agendaReturnUrl !== window.location.href ? agendaReturnUrl : "";
  } catch {
    return "";
  }
}

function readSafePendingLoginReturn(currentOrigin: string): string {
  if (typeof window === "undefined") return "";
  try {
    const raw =
      sessionStorage.getItem('vecy_login_return_url') ||
      localStorage.getItem('vecy_login_return_url');
    if (!raw) return "";
    const safe = sanitizeInternalRedirectPath(raw, currentOrigin);
    if (!safe) {
      localStorage.removeItem('vecy_login_return_url');
      sessionStorage.removeItem('vecy_login_return_url');
      return "";
    }
    return safe;
  } catch {
    return "";
  }
}

function clearPendingLoginReturn() {
  try {
    localStorage.removeItem('vecy_login_return_url');
    sessionStorage.removeItem('vecy_login_return_url');
  } catch (_) {}
}

/**
 * Restaurador síncrono de URL post-OAuth sin parpadeos.
 * Retiene el pintado inicial de '/' mientras intercambia el token OAuth en el mismo origen
 * y navega directamente al destino final (/admin, /agent-dashboard, /agenda/... o /jania).
 */
function OAuthRedirectRestorer({ children }: { children: React.ReactNode }) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.loginWithSupabaseToken.useMutation();

  const [isHoldingForAuth, setIsHoldingForAuth] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const currentOrigin = window.location.origin;
    const landedWithOAuthParams =
      INITIAL_URL_HAS_OAUTH_SUCCESS ||
      hasOAuthSuccessParams(window.location.search, window.location.hash);
    const pendingAgendaReturn = Boolean(readSafeAgendaReturnUrl(currentOrigin));
    const pendingLoginReturn = Boolean(readSafePendingLoginReturn(currentOrigin));
    const hasBackendSessionToken = Boolean(localStorage.getItem('jania-session-token'));
    const hasSupabaseStoredSession = hasStoredSupabaseSession();

    return shouldHoldInitialRenderForAuth({
      pathname: window.location.pathname,
      hasOAuthSuccess: landedWithOAuthParams,
      hasPendingAgendaReturn: pendingAgendaReturn,
      hasPendingLoginReturn: pendingLoginReturn,
      hasBackendSessionToken,
      hasSupabaseStoredSession,
    });
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    let active = true;
    const currentOrigin = window.location.origin;
    const agendaReturnUrl = readSafeAgendaReturnUrl(currentOrigin);
    const landedWithOAuthParams =
      INITIAL_URL_HAS_OAUTH_SUCCESS ||
      hasOAuthSuccessParams(window.location.search, window.location.hash);
    const pendingLoginReturn = readSafePendingLoginReturn(currentOrigin);
    const hasBackendToken = Boolean(localStorage.getItem('jania-session-token'));
    const isLoginRoute =
      window.location.pathname === '/login' || window.location.pathname.startsWith('/login/');

    const shouldProcess =
      Boolean(agendaReturnUrl) ||
      (!isLoginRoute &&
        (landedWithOAuthParams ||
          (Boolean(pendingLoginReturn) && !hasBackendToken && hasStoredSupabaseSession())));

    if (!shouldProcess) {
      if (isHoldingForAuth) setIsHoldingForAuth(false);
      return;
    }

    const failSafeTimer = window.setTimeout(() => {
      if (active) setIsHoldingForAuth(false);
    }, 6500);

    const waitForSupabaseSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) return session;
      if (!landedWithOAuthParams) return null;
      return await new Promise<any>((resolve) => {
        let settled = false;
        const finish = (nextSession: any) => {
          if (settled) return;
          settled = true;
          subscription.unsubscribe();
          window.clearTimeout(waitTimer);
          resolve(nextSession);
        };
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          if (nextSession) finish(nextSession);
        });
        const waitTimer = window.setTimeout(() => finish(null), 4000);
      });
    };

    const run = async () => {
      try {
        const session = await waitForSupabaseSession();
        if (!active) return;

        if (agendaReturnUrl && session) {
          localStorage.removeItem('vecy_agenda_return_url');
          if (agendaReturnUrl.startsWith('/')) {
            navigate(agendaReturnUrl, { replace: true });
          } else {
            const parsed = new URL(agendaReturnUrl);
            navigate(`${parsed.pathname}${parsed.search}${parsed.hash}`, { replace: true });
          }
          return;
        }

        if (
          session?.access_token &&
          !isLoginRoute &&
          (landedWithOAuthParams || (pendingLoginReturn && !hasBackendToken))
        ) {
          const exchangePromise = loginMutation.mutateAsync({ accessToken: session.access_token });
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout de sincronización')), 10000),
          );
          const res: any = await Promise.race([exchangePromise, timeoutPromise]).catch(() => null);
          if (!active) return;

          if (res?.sessionToken) {
            localStorage.setItem('jania-session-token', res.sessionToken);
          }
          if (res?.user) {
            utils.auth.me.setData(undefined, res.user);
            try {
              localStorage.setItem('manus-runtime-user-info', JSON.stringify(res.user));
            } catch (_) {}
          }

          const userEmail = (res?.user?.email || session.user?.email || '').toLowerCase();
          const userRole = res?.user?.role as string | undefined;
          const dest = resolvePostLoginDestination({
            userEmail,
            userRole,
            savedReturn: pendingLoginReturn,
            currentOrigin,
          });
          clearPendingLoginReturn();
          navigate(dest, { replace: true });
          return;
        }

        if (landedWithOAuthParams) {
          window.history.replaceState({}, document.title, window.location.pathname || '/');
        }
      } catch (err) {
        console.warn('[OAuthRedirectRestorer] Error resolviendo retorno OAuth:', err);
      } finally {
        window.clearTimeout(failSafeTimer);
        if (active) setIsHoldingForAuth(false);
      }
    };

    void run();

    return () => {
      active = false;
      window.clearTimeout(failSafeTimer);
    };
  }, []);

  if (isHoldingForAuth) {
    return (
      <AuthLoadingScreen
        title="Verificando sesión segura..."
        subtitle="Preparando tu panel en VECY..."
      />
    );
  }

  return <>{children}</>;
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
          <OAuthRedirectRestorer>
            <ScrollToTop />
            <Router />
            <FloatingScrollToTop />
            <JanIAFloatingButton />
          </OAuthRedirectRestorer>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
