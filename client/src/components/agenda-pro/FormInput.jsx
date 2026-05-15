import React from 'react';

// FormInput — Vecy Gold Edition
function FormInput({ label, id, adornment, placeholder, maxLength, pattern, error, ...props }) {
  const errorInputClasses = 'border-red-500/70 focus:border-red-500 focus:ring-red-500/30';
  const defaultInputClasses = 'border-vecy-border focus:border-soft-gold/60 focus:ring-soft-gold/20';
  const errorLabelClasses = 'text-red-400';
  const defaultLabelClasses = 'text-vecy-muted';
  const errorAdornmentClasses = 'text-red-400/80';
  const defaultAdornmentClasses = 'text-vecy-muted';

  return (
    <div>
      <label htmlFor={id} className={`block text-sm font-medium mb-1 transition-colors duration-300 ${error ? errorLabelClasses : defaultLabelClasses}`}>
        {label}
      </label>
      <div className="relative">
        {adornment && (
          <span className={`absolute inset-y-0 left-0 flex items-center pl-3 text-sm transition-colors duration-300 ${error ? errorAdornmentClasses : defaultAdornmentClasses}`}>
            {adornment}
          </span>
        )}
        <input
          id={id}
          placeholder={placeholder || ''}
          maxLength={maxLength}
          pattern={pattern}
          {...props}
          className={`w-full p-3 rounded-lg border-2 focus:ring-2 focus:outline-none transition-colors duration-300 ${adornment ? 'pl-10' : ''} ${error ? errorInputClasses : defaultInputClasses}`}
          style={{
            backgroundColor: '#0a0a0a',
            color: '#f0f0f0',
          }}
        />
      </div>
    </div>
  );
}

export default FormInput;