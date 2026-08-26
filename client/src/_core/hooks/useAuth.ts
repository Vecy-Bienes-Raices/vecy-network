import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();
  const [cachedUser, setCachedUser] = useState<any>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const s = localStorage.getItem("manus-runtime-user-info");
      return s ? JSON.parse(s) : null;
    } catch (e) {
      return null;
    }
  });

  const [sbUser, setSbUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setSbUser(user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSbUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60000,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync().catch(() => {});
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
    } finally {
      localStorage.removeItem("jania-session-token");
      localStorage.removeItem("manus-runtime-user-info");
      await supabase.auth.signOut().catch(() => {});
      setSbUser(null);
      setCachedUser(null);
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const activeUser = useMemo(() => {
    if (meQuery.data) return meQuery.data;
    if (sbUser) {
      return {
        id: 1,
        name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'Administrador',
        email: sbUser.email,
        role: 'admin',
        openId: sbUser.id,
        loginMethod: 'supabase',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      };
    }
    return cachedUser;
  }, [meQuery.data, sbUser, cachedUser]);

  const state = useMemo(() => {
    if (activeUser) {
      try {
        localStorage.setItem(
          "manus-runtime-user-info",
          JSON.stringify(activeUser)
        );
      } catch (e) {}
    }
    return {
      user: activeUser,
      loading: (meQuery.isLoading && !sbUser && !cachedUser) || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(activeUser),
    };
  }, [
    activeUser,
    cachedUser,
    meQuery.error,
    meQuery.isLoading,
    sbUser,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (state.loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    state.loading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
