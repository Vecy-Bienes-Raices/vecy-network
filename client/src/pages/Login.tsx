import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { getLoginUrl } from '@/const';
import { Shield, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [, navigate] = useLocation();
  const { user, refresh } = useAuth();
  const loginMutation = trpc.auth.loginWithSupabaseToken.useMutation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  // Exchange Supabase token with backend session
  const exchangeToken = async (accessToken: string) => {
    try {
      setLoading(true);
      await loginMutation.mutateAsync({ accessToken });
      await refresh();
      toast.success('Sesión iniciada correctamente');
      navigate('/admin');
    } catch (err: any) {
      console.error('[Login] Error syncing session:', err);
      toast.error('Error al sincronizar sesión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  // OAuth Redirect Listener
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await exchangeToken(session.access_token);
      }
    };

    // Check on mount (for OAuth callbacks)
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await exchangeToken(session.access_token);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (user && ['admin', 'agent'].includes(user.role as string)) {
      navigate('/admin');
    }
  }, [user]);

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/login`,
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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
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

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-900/10 via-black to-black pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Back to Home link */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-accent transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          VOLVER AL INICIO
        </button>

        <div className="panel-card p-8 border border-white/10 shadow-2xl backdrop-blur-md">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-accent/10 border border-accent/20">
              <Shield className="w-8 h-8 text-accent animate-pulse" />
            </div>
            <h1 className="text-2xl font-display font-bold text-accent uppercase tracking-wider">
              VECY NETWORK
            </h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
              {isRegister ? 'Registro de Colegas' : 'Iniciar Sesión'}
            </p>
          </div>

          {loading ? (
            <div className="py-12 text-center flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="text-sm text-muted-foreground">Estableciendo conexión segura...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* OAuth Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleOAuthLogin('google')}
                  className="btn-electric flex items-center justify-center gap-2 py-3 text-xs"
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
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuthLogin('facebook')}
                  className="btn-electric flex items-center justify-center gap-2 py-3 text-xs"
                >
                  <svg className="w-4 h-4 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
                  </svg>
                  Facebook
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
          )}
        </div>
      </div>
    </div>
  );
}
