import React from 'react';

interface AuthLoadingScreenProps {
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function AuthLoadingScreen({
  title = 'Verificando sesión segura...',
  subtitle = 'Sincronizando tu acceso con VECY Bienes Raíces...',
  actionLabel,
  onAction,
}: AuthLoadingScreenProps) {
  return (
    <div
      className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center relative overflow-hidden"
      role="status"
      aria-live="polite"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-900/10 via-black to-black pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center gap-5 max-w-sm">
        <div className="w-16 h-16 flex items-center justify-center">
          <img
            src="/logo-vecy.png"
            alt="Logo Vecy Bienes Raíces"
            className="w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(191,149,63,0.35)]"
          />
        </div>

        <progress aria-label={title} className="vecy-loading-spinner" />

        <div className="space-y-1.5">
          <p className="font-['Audiowide'] text-sm sm:text-base text-accent uppercase tracking-wider">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs sm:text-sm text-zinc-400">
              {subtitle}
            </p>
          )}
        </div>

        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="mt-2 text-xs text-zinc-400 hover:text-white underline transition-colors cursor-pointer"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
