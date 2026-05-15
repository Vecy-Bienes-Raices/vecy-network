import React, { useState, useEffect, useRef } from 'react';

function CustomSelect({ label, options, value, onChange, name, placeholder = "Selecciona...", error }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const selectedOption = options.find(option => option.value === value);
  const displayValue = selectedOption ? selectedOption.label : placeholder;

  const errorButtonClasses = 'border-red-500/70';
  const defaultButtonClasses = 'border-vecy-border focus:border-soft-gold/60';
  const errorLabelClasses = 'text-red-400';
  const defaultLabelClasses = 'text-vecy-muted';

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  const handleOptionClick = (optionValue) => {
    onChange({ target: { name, value: optionValue } });
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${error ? errorLabelClasses : defaultLabelClasses}`}>
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-3 border-2 rounded-lg transition-all text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-soft-gold/20 ${error ? errorButtonClasses : defaultButtonClasses}`}
        style={{ backgroundColor: '#0a0a0a', color: selectedOption ? '#f0f0f0' : '#52525b' }}
      >
        <span>{displayValue}</span>
        <svg className={`w-5 h-5 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
          style={{ color: '#a1a1aa' }}
          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 rounded-lg shadow-xl max-h-60 overflow-y-auto"
          style={{ backgroundColor: '#121212', border: '1px solid rgba(212,175,55,0.25)' }}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleOptionClick(option.value)}
              className="w-full text-left px-4 py-2.5 transition-colors"
              style={{
                color: option.disabled ? '#52525b' : '#f0f0f0',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={e => { if (!option.disabled) e.currentTarget.style.backgroundColor = 'rgba(191,149,63,0.1)'; e.currentTarget.style.color = '#bf953f'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = option.disabled ? '#52525b' : '#f0f0f0'; }}
              disabled={option.disabled}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default CustomSelect;