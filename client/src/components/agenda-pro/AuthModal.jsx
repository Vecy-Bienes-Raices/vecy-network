import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';

const AuthModal = ({ isOpen, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isRegister, setIsRegister] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const reset = () => {
        setError('');
        setSuccessMsg('');
        setFullName('');
        setEmail('');
        setPassword('');
        setShowPassword(false);
    };

    const handleOAuthLogin = async (provider) => {
        setLoading(true);
        setError('');
        try {
            // Guardar URL actual para restaurar después del OAuth (incluye nombre y codigo del inmueble)
            if (window.location.search) {
                localStorage.setItem('vecy_agenda_return_url', window.location.href);
            }
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: { redirectTo: window.location.href },
            });
            if (error) throw error;
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEmailAuth = async (e) => {
        if (e) e.preventDefault();
        console.log('--- NUEVO INTENTO DE AUTH ---');
        console.log('Email:', email);
        console.log('URL Supabase:', import.meta.env.VITE_SUPABASE_URL ? 'Cargada OK' : 'NO CARGADA');
        
        if (!email || !password || (isRegister && !fullName)) {
            setError('Por favor completa todos los campos.');
            return;
        }

        setLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            console.log('Intentando auth con:', email, isRegister ? '(Registro)' : '(Login)');
            if (isRegister) {
                // REGISTRO
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { 
                        emailRedirectTo: window.location.href,
                        data: { full_name: fullName }
                    },
                });
                if (error) throw error;

                if (data.session) {
                    console.log('Registro exitoso con sesión inmediata');
                    onClose();
                } else {
                    setSuccessMsg('✅ ¡Cuenta creada! Revisa tu correo (incluyendo Spam) para confirmar tu cuenta y luego inicia sesión.');
                    setIsRegister(false);
                }
            } else {
                // INICIO DE SESIÓN
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                console.log('Resultado login:', { data, error });
                if (error) throw error;
                
                if (data.session) {
                    console.log('Sesión iniciada correctamente');
                    onClose();
                    // Forzamos un pequeño refresh si el estado no cambia solo
                    setTimeout(() => window.location.reload(), 500);
                }
            }
        } catch (err) {
            console.error('Error de Auth Detectado:', err);
            let userFriendlyMessage = err.message;
            if (err.message.includes('Email not confirmed')) {
                userFriendlyMessage = 'Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada o Spam.';
            } else if (err.message.includes('Invalid login credentials')) {
                userFriendlyMessage = 'Correo o contraseña incorrectos.';
            }
            setError(`Error: ${userFriendlyMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) { setError('Ingresa tu correo primero para recuperar la contraseña.'); return; }
        setLoading(true);
        setError('');
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.href,
            });
            if (error) throw error;
            setSuccessMsg(`📧 Enviamos un enlace de recuperación a ${email}.`);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-volcanic-black border border-soft-gold/30 rounded-2xl p-8 max-w-md w-full shadow-2xl relative">
                {/* Cerrar */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-off-white/50 hover:text-soft-gold text-2xl transition-colors"
                >
                    &times;
                </button>

                {/* Encabezado */}
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-soft-gold mb-1">Bienvenido a Vecy</h2>
                    <p className="text-off-white/60 text-sm">
                        {isRegister ? 'Crea tu cuenta para continuar.' : 'Inicia sesión para autocompletar tus datos.'}
                    </p>
                </div>

                {/* Error / Éxito */}
                {error && (
                    <div className="bg-red-900/40 text-red-300 text-sm p-3 rounded-lg mb-4 border border-red-500/30">
                        {error}
                    </div>
                )}
                {successMsg && (
                    <div className="bg-green-900/40 text-green-300 text-sm p-3 rounded-lg mb-4 border border-green-500/30">
                        {successMsg}
                    </div>
                )}

                <div className="space-y-3">
                    {/* Google */}
                    <button
                        onClick={() => handleOAuthLogin('google')}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-3 px-4 rounded-xl hover:bg-gray-100 transition-all duration-300 shadow-md transform hover:-translate-y-0.5 disabled:opacity-50"
                    >
                        <FcGoogle className="text-2xl" />
                        Continuar con Google
                    </button>



                    {/* Divisor */}
                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-off-white/20" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-3 bg-volcanic-black text-off-white/50">
                                {isRegister ? 'O regístrate con tu correo' : 'O inicia sesión con tu correo'}
                            </span>
                        </div>
                    </div>

                    {/* Formulario Email + Contraseña */}
                    <form onSubmit={handleEmailAuth} className="space-y-3">
                        {/* Nombre Completo (Solo Registro) */}
                        {isRegister && (
                            <div className="relative">
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Tu nombre completo"
                                    required
                                    className="w-full pl-4 pr-4 py-3 bg-black/30 border border-off-white/20 rounded-xl text-off-white placeholder-off-white/30 focus:border-soft-gold focus:ring-1 focus:ring-soft-gold outline-none transition-all text-sm"
                                />
                            </div>
                        )}

                        {/* Email */}
                        <div className="relative">
                            <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-off-white/30 text-sm" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tucorreo@ejemplo.com"
                                required
                                className="w-full pl-9 pr-4 py-3 bg-black/30 border border-off-white/20 rounded-xl text-off-white placeholder-off-white/30 focus:border-soft-gold focus:ring-1 focus:ring-soft-gold outline-none transition-all text-sm"
                            />
                        </div>

                        {/* Contraseña */}
                        <div className="relative">
                            <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-off-white/30 text-sm" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={isRegister ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
                                required
                                minLength={6}
                                className="w-full pl-9 pr-10 py-3 bg-black/30 border border-off-white/20 rounded-xl text-off-white placeholder-off-white/30 focus:border-soft-gold focus:ring-1 focus:ring-soft-gold outline-none transition-all text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-off-white/40 hover:text-soft-gold transition-colors"
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>

                        {/* Olvidé contraseña (solo en login) */}
                        {!isRegister && (
                            <div className="text-right">
                                <button
                                    type="button"
                                    onClick={handleForgotPassword}
                                    disabled={loading}
                                    className="text-xs text-soft-gold/70 hover:text-soft-gold hover:underline transition-colors"
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>
                        )}

                        {/* Botón principal */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-soft-gold hover:bg-gold-bright text-volcanic-black font-bold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-luminous-gold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Procesando...' : isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
                        </button>
                    </form>

                    {/* Toggle Login / Registro */}
                    <p className="text-center text-sm text-off-white/50 pt-1">
                        {isRegister ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}
                        <button
                            type="button"
                            onClick={() => { setIsRegister(v => !v); reset(); }}
                            className="text-soft-gold font-semibold hover:underline transition-colors"
                        >
                            {isRegister ? 'Inicia sesión' : 'Regístrate'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
