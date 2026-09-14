import React from 'react';

// FormInput — Vecy Gold Edition
function FormInput({ label, id, adornment, placeholder, maxLength, pattern, error, hint, errorAlert, successBadge, isValidating, ...props }) {
  const isError = !!error || !!errorAlert;
  const isSuccess = !!successBadge && !isError;

  let inputClasses = 'border-vecy-border focus:border-soft-gold/60 focus:ring-soft-gold/20';
  let labelClasses = 'text-vecy-muted';
  let adornmentClasses = 'text-vecy-muted';

  if (isError) {
    inputClasses = 'border-red-500 bg-red-950/20 text-red-100 shadow-[0_0_15px_rgba(239,68,68,0.25)] focus:border-red-500 focus:ring-red-500/40';
    labelClasses = 'text-red-400 font-bold';
    adornmentClasses = 'text-red-400/80';
  } else if (isSuccess) {
    inputClasses = 'border-emerald-500/80 bg-emerald-950/20 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.2)] focus:border-emerald-400 focus:ring-emerald-500/30';
    labelClasses = 'text-emerald-400 font-bold';
    adornmentClasses = 'text-emerald-400/80';
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className={`block text-sm font-medium transition-colors duration-300 ${labelClasses}`}>
          {label}
        </label>
        {isValidating && (
          <span className="flex items-center gap-1.5 text-[11px] text-amber-400 font-mono animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
            Verificando identidad...
          </span>
        )}
      </div>

      <div className="relative">
        {adornment && (
          <span className={`absolute inset-y-0 left-0 flex items-center pl-3 text-sm transition-colors duration-300 ${adornmentClasses}`}>
            {adornment}
          </span>
        )}
        <input
          id={id}
          placeholder={placeholder || ''}
          maxLength={maxLength}
          pattern={pattern}
          {...props}
          className={`w-full p-3 rounded-lg border-2 focus:ring-2 focus:outline-none transition-colors duration-300 ${adornment ? 'pl-10' : ''} ${isValidating ? 'pr-10' : ''} ${inputClasses}`}
          style={{
            backgroundColor: isError ? 'rgba(35, 10, 10, 0.7)' : (isSuccess ? 'rgba(10, 30, 20, 0.7)' : '#0a0a0a'),
            color: '#f0f0f0',
          }}
        />
        {isValidating && (
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <span className="w-4 h-4 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
          </span>
        )}
      </div>

      {/* Alerta de Error / Fraude Detallada */}
      {errorAlert && (
        <div className="mt-2 p-2.5 bg-red-950/40 border border-red-500/60 rounded-lg flex items-start gap-2 text-xs text-red-300 animate-fade-in shadow-lg">
          <span className="text-base shrink-0 mt-0.5">⚠️</span>
          <div className="flex-1">
            <span className="font-bold block text-red-400 mb-0.5">Validación de Identidad Obligatoria</span>
            <span className="font-medium leading-relaxed">{errorAlert}</span>
          </div>
        </div>
      )}

      {/* Insignia de Verificación Exitosa */}
      {successBadge && !isError && (
        <div className="mt-2 p-2 bg-emerald-950/40 border border-emerald-500/60 rounded-lg flex items-center gap-2 text-xs text-emerald-300 animate-fade-in shadow-lg">
          <span className="text-sm font-bold text-emerald-400 shrink-0">✓</span>
          <span className="font-semibold leading-relaxed">{successBadge}</span>
        </div>
      )}

      {hint && !errorAlert && (
        <p className="text-[11px] text-soft-gold/70 mt-1.5 flex items-start gap-1 font-normal leading-tight">
          <span className="text-xs shrink-0">🔒</span>
          <span>{hint}</span>
        </p>
      )}
    </div>
  );
}

export default FormInput;