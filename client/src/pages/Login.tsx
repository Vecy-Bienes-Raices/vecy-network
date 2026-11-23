import React, { useState, useEffect } from 'react';
import {
  hasStoredSupabaseSession,
  INITIAL_URL_HASH,
  INITIAL_URL_HAS_OAUTH_CALLBACK,
  INITIAL_URL_HAS_OAUTH_SUCCESS,
  INITIAL_URL_SEARCH,
  supabase,
} from '@/lib/supabase';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import AuthLoadingScreen from '@/components/AuthLoadingScreen';
import { Shield, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  ADMIN_EMAILS_LIST,
  buildAuthCallbackUrl,
  hasOAuthCallbackParams,
  hasOAuthSuccessParams,
  resolvePostLoginDestination,
  sanitizeInternalRedirectPath,
} from '../../../shared/authRouting';

export { ADMIN_EMAILS_LIST, resolvePostLoginDestination };

const hasOAuthCallbackInUrl = (): boolean => {
  if (INITIAL_URL_HAS_OAUTH_CALLBACK) return true;
  if (typeof window === 'undefined') return false;
  return hasOAuthCallbackParams(window.location.search, window.location.hash);
};

const readUrlAuthError = (): string | null => {
  if (typeof window === 'undefined') return null;
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const initSearch = new URLSearchParams(INITIAL_URL_SEARCH);
  const initHash = new URLSearchParams(INITIAL_URL_HASH.replace(/^#/, ''));
  return (
    search.get('error_description') ||
    hash.get('error_description') ||
    initSearch.get('error_description') ||
    initHash.get('error_description') ||
    search.get('error') ||
    hash.get('error') ||
    initSearch.get('error') ||
    initHash.get('error')
  );
};

export default function Login() {
  const [, navigate] = useLocation();
  const { user, hasBackendUser, loading: authLoading, isAuthSettled, refresh } = useAuth();
  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.loginWithSupabaseToken.useMutation();

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const rawRedirectQuery = searchParams.get('redirect') || '';
  const redirectQuery =
    typeof window !== 'undefined'
      ? sanitizeInternalRedirectPath(rawRedirectQuery, window.location.origin) || ''
      : sanitizeInternalRedirectPath(rawRedirectQuery) || '';
  const initialModeRegister = searchParams.get('mode') === 'register';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(initialModeRegister);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [initializingAuth, setInitializingAuth] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      hasOAuthCallbackInUrl() ||
      hasStoredSupabaseSession() ||
      Boolean(localStorage.getItem('jania-session-token'))
    );
  });
  const isExchangingRef = React.useRef(false);
  const hasCompletedExchangeRef = React.useRef(false);

  const ADMIN_EMAILS = ADMIN_EMAILS_LIST;

  const readSavedReturnUrl = (): string => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    for (const storage of [window.sessionStorage, window.localStorage]) {
      try {
        const raw = storage.getItem('vecy_login_return_url');
        if (!raw) continue;
        const safe = sanitizeInternalRedirectPath(raw, origin);
        if (safe) return safe;
        storage.removeItem('vecy_login_return_url');
      } catch (_) {}
    }
    return '';
  };

  const persistSavedReturnUrl = (rawPath?: string | null) => {
    if (typeof window === 'undefined') return;
    const safe = sanitizeInternalRedirectPath(rawPath, window.location.origin);
    if (!safe) return;
    for (const storage of [window.localStorage, window.sessionStorage]) {
      try {
        storage.setItem('vecy_login_return_url', safe);
      } catch (_) {}
    }
  };

  const clearSavedReturnUrl = () => {
    if (typeof window === 'undefined') return;
    for (const storage of [window.localStorage, window.sessionStorage]) {
      try {
        storage.removeItem('vecy_login_return_url');
      } catch (_) {}
    }
  };

  const resolveDestination = (userEmail: string, userRole?: string): string => {
    const savedReturn = readSavedReturnUrl();
    const dest = resolvePostLoginDestination({
      userEmail,
      userRole,
      redirectQuery,
      savedReturn,
      currentOrigin: typeof window !== 'undefined' ? window.location.origin : undefined,
    });
    const targetRedirect = redirectQuery || savedReturn;
    if (targetRedirect) {
      clearSavedReturnUrl();
    }
    return dest;
  };

  // Exchange Supabase token with backend session
  const exchangeToken = async (accessToken: string, isSilent = false) => {
    if (isExchangingRef.current) return;
    isExchangingRef.current = true;
    try {
      if (!isSilent) setLoading(true);
      // Timeout seguro de 12 segundos con el backend
      const exchangePromise = loginMutation.mutateAsync({ accessToken });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de sincronización')), 12000));
      const res: any = await Promise.race([exchangePromise, timeoutPromise]).catch(err => {
        console.warn('[Login] Backend exchange warned, proceeding:', err);
        return null;
      });

      if (res && res.sessionToken) {
        localStorage.setItem("jania-session-token", res.sessionToken);
      }
      if (res && res.user) {
        utils.auth.me.setData(undefined, res.user);
        try {
          localStorage.setItem("manus-runtime-user-info", JSON.stringify(res.user));
        } catch (_) {}
      }

      // Validar si el usuario tiene rol admin/agent o si viene desde /jania
      const { data: { user: sbUser } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      const userEmail = (res?.user?.email || sbUser?.email || '').toLowerCase();
      const isAdmin = ADMIN_EMAILS.includes(userEmail) || res?.user?.role === 'admin' || res?.user?.role === 'agent';

      await refresh().catch(() => {});

      if (isAdmin || res?.user || sbUser) {
        hasCompletedExchangeRef.current = true;
        setRedirecting(true);
        if (typeof window !== 'undefined' && hasOAuthCallbackInUrl()) {
          const cleanLoginUrl = redirectQuery ? `/login?redirect=${encodeURIComponent(redirectQuery)}` : '/login';
          window.history.replaceState({}, document.title, cleanLoginUrl);
        }
        toast.success('Sesión iniciada correctamente');
        navigate(resolveDestination(userEmail, res?.user?.role), { replace: true });
      }
    } catch (err: any) {
      console.error('[Login] Error syncing session:', err);
      const { data: { user: sbUser } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      if (sbUser) {
        hasCompletedExchangeRef.current = true;
        setRedirecting(true);
        navigate(resolveDestination(sbUser.email || '', undefined), { replace: true });
      } else if (!isSilent) {
        toast.error('Error al iniciar sesión. Intenta nuevamente.');
      }
    } finally {
      setLoading(false);
      isExchangingRef.current = false;
    }
  };

  // OAuth Redirect Listener
  useEffect(() => {
    let isMounted = true;
    if (redirectQuery) {
      persistSavedReturnUrl(redirectQuery);
    }

    const urlAuthError = readUrlAuthError();
    if (urlAuthError) {
      toast.error(`No se pudo completar el acceso: ${urlAuthError}`);
      if (typeof window !== 'undefined') {
        const cleanLoginUrl = redirectQuery ? `/login?redirect=${encodeURIComponent(redirectQuery)}` : '/login';
        window.history.replaceState({}, document.title, cleanLoginUrl);
      }
      setLoading(false);
      setInitializingAuth(false);
    }

    const safetyTimer = window.setTimeout(() => {
      if (isMounted) setInitializingAuth(false);
    }, 5500);

    let oauthWaitTimer: number | null = null;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted && !isExchangingRef.current) {
          await exchangeToken(session.access_token, false);
          if (isMounted) setInitializingAuth(false);
          return;
        }
        const awaitingOAuthCallback =
          !urlAuthError &&
          (INITIAL_URL_HAS_OAUTH_SUCCESS ||
            (typeof window !== 'undefined' &&
              hasOAuthSuccessParams(window.location.search, window.location.hash)));
        if (awaitingOAuthCallback && isMounted) {
          oauthWaitTimer = window.setTimeout(() => {
            if (isMounted && !isExchangingRef.current) {
              setInitializingAuth(false);
            }
          }, 4000);
          return;
        }
      } catch (err) {
        console.error('[Login] Error checking session:', err);
      }
      if (isMounted && !localStorage.getItem('jania-session-token')) {
        setInitializingAuth(false);
      }
    };

    // Check on mount
    void checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (
        (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') &&
        session &&
        isMounted &&
        !isExchangingRef.current &&
        !hasCompletedExchangeRef.current
      ) {
        if (oauthWaitTimer) {
          window.clearTimeout(oauthWaitTimer);
          oauthWaitTimer = null;
        }
        await exchangeToken(session.access_token, false);
        if (isMounted) setInitializingAuth(false);
      }
    });

    return () => {
      isMounted = false;
      window.clearTimeout(safetyTimer);
      if (oauthWaitTimer) window.clearTimeout(oauthWaitTimer);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!initializingAuth) return;
    const awaitingOAuth =
      INITIAL_URL_HAS_OAUTH_SUCCESS ||
      (typeof window !== 'undefined' &&
        hasOAuthSuccessParams(window.location.search, window.location.hash));
    if (isAuthSettled && !authLoading && !isExchangingRef.current && !awaitingOAuth) {
      setInitializingAuth(false);
    }
  }, [initializingAuth, isAuthSettled, authLoading]);

  // Redirect if already authenticated (esperando siempre que finalice el intercambio con el backend)
  useEffect(() => {
    if (!user) return;
    if (isExchangingRef.current) return;
    if (hasOAuthCallbackInUrl() && !hasCompletedExchangeRef.current) return;
    if (!hasBackendUser && !hasCompletedExchangeRef.current) return;
    setRedirecting(true);
    navigate(resolveDestination(user.email || '', user.role as string), { replace: true });
  }, [user, hasBackendUser]);

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    try {
      setLoading(true);
      const pendingReturn = redirectQuery || readSavedReturnUrl();
      if (pendingReturn) {
        persistSavedReturnUrl(pendingReturn);
      }
      const redirectUrl = buildAuthCallbackUrl(window.location.origin);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || 'Error al iniciar sesión con OAuth');
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isRegister && !fullName)) {
      toast.error('Por favor completa todos los campos.');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        const pendingReturn = redirectQuery || readSavedReturnUrl();
        if (pendingReturn) {
          persistSavedReturnUrl(pendingReturn);
        }
        const redirectUrl = buildAuthCallbackUrl(window.location.origin);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;

        if (data.session) {
          await exchangeToken(data.session.access_token);
        } else {
          toast.success('¡Registro exitoso! Confirma tu correo antes de entrar.');
          setIsRegister(false);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        if (data.session) {
          await exchangeToken(data.session.access_token);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Error en autenticación');
    } finally {
      setLoading(false);
    }
  };

  const isFromJania = redirectQuery.includes('/jania');

  const handleManualReset = async () => {
    setInitializingAuth(false);
    setLoading(false);
    setRedirecting(false);
    isExchangingRef.current = false;
    hasCompletedExchangeRef.current = false;
    try {
      await supabase.auth.signOut();
    } catch (_) {}
    localStorage.removeItem("jania-session-token");
    localStorage.removeItem("manus-runtime-user-info");
  };

  if (initializingAuth || loading || redirecting || (Boolean(user) && hasBackendUser)) {
    return (
      <AuthLoadingScreen
        title="Estableciendo conexión segura..."
        subtitle={
          redirecting
            ? 'Ingresando a tu panel en VECY Bienes Raíces...'
            : 'Validando sesión y permisos en el servidor...'
        }
        actionLabel="¿Tarda demasiado? Haz clic aquí para ingresar manualmente"
        onAction={handleManualReset}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-900/10 via-black to-black pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Back to Home or JanIA link */}
        <button
          onClick={() => navigate(isFromJania ? '/jania' : '/')}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-accent transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          {isFromJania ? 'VOLVER A JANIA WEB' : 'VOLVER AL INICIO'}
        </button>

        <div className="panel-card p-8 border border-white/10 shadow-2xl backdrop-blur-md">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center transition-all hover:scale-105">
              <img 
                src="/logo-vecy.png" 
                alt="Logo Vecy Bienes Raíces" 
                className="w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(191,149,63,0.35)]"
              />
            </div>
            <h1 className="font-['Audiowide'] text-xl sm:text-2xl font-bold text-accent uppercase tracking-wider">
              VECY BIENES RAÍCES
            </h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
              {isFromJania
                ? (isRegister ? 'Crear Cuenta Gratuita en JanIA Web' : 'Iniciar Sesión en JanIA Web')
                : (isRegister ? 'Registro de Colegas y Clientes' : 'Iniciar Sesión')}
            </p>
          </div>

          <div className="space-y-4">
              {/* OAuth Buttons */}
              <div className="w-full">
                <button
                  type="button"
                  onClick={() => handleOAuthLogin('google')}
                  className="w-full btn-electric flex items-center justify-center gap-3 py-3 text-xs uppercase tracking-wider font-semibold"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continuar con Google
                </button>
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink mx-4 text-[10px] text-muted-foreground uppercase tracking-widest">
                  O CONTINUAR CON EMAIL
                </span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              {/* Form */}
              <form onSubmit={handleEmailAuth} className="space-y-4">
                {isRegister && (
                  <div className="space-y-2">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ej: Eduardo Mendoza"
                      required
                      className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-foreground placeholder-white/20 focus:border-accent outline-none transition-all text-sm"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 w-4 h-4" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tucorreo@ejemplo.com"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-lg text-foreground placeholder-white/20 focus:border-accent outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 w-4 h-4" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full pl-10 pr-10 py-3 bg-black/40 border border-white/10 rounded-lg text-foreground placeholder-white/20 focus:border-accent outline-none transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-accent transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn-gold w-full py-3 mt-2 text-xs tracking-wider uppercase font-semibold">
                  {isRegister ? 'Crear Cuenta' : 'Ingresar'}
                </button>
              </form>

              {/* Toggle Register / Login */}
              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-xs text-muted-foreground hover:text-accent transition-colors underline"
                >
                  {isRegister ? '¿Ya tienes una cuenta? Iniciar Sesión' : '¿No tienes una cuenta? Regístrate'}
                </button>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
