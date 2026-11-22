import { trpc } from "@/lib/trpc";
import { sanitizeInternalRedirectPath } from "@shared/authRouting";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  // Evitar bucle de recarga infinita si ya estamos en la página de login
  if (window.location.pathname === "/login" || window.location.pathname.startsWith('/login')) {
    return;
  }

  const currentPath = sanitizeInternalRedirectPath(
    `${window.location.pathname}${window.location.search}`,
    window.location.origin,
  );
  if (currentPath) {
    try {
      localStorage.setItem("vecy_login_return_url", currentPath);
      sessionStorage.setItem("vecy_login_return_url", currentPath);
    } catch (_) {}
  }

  window.location.href = getLoginUrl(currentPath || undefined);
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        let token = localStorage.getItem("jania-session-token");
        if (!token) {
          try {
            const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
            if (sbKey) {
              const sbData = JSON.parse(localStorage.getItem(sbKey) || '{}');
              token = sbData.access_token || null;
            }
          } catch (e) {}
        }
        const headers = new Headers(init?.headers);
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        return globalThis.fetch(input, {
          ...(init ?? {}),
          headers,
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
