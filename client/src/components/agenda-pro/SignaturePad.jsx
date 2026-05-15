import React, { useRef, useEffect } from 'react';
import SignaturePad from 'signature_pad';

function SignaturePadComponent({ onSignatureChange }) {
  const canvasRef = useRef(null);
  const signaturePadRef = useRef(null);

  useEffect(() => {
    // Usamos un pequeño retraso para asegurar que el canvas es visible antes de inicializar
    const timeoutId = setTimeout(() => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d").scale(ratio, ratio);

        // Inicializamos SignaturePad con el color de tinta dorado
        signaturePadRef.current = new SignaturePad(canvas, {
          penColor: '#bf953f' // Oro Vecy
        });

        signaturePadRef.current.addEventListener("endStroke", () => {
          if (!signaturePadRef.current.isEmpty()) {
            const signatureData = signaturePadRef.current.toDataURL();
            onSignatureChange(signatureData);
          }
        });
      }
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [onSignatureChange]);

  const handleClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      onSignatureChange('');
    }
  };

  return (
    <div className="relative w-full border-2 border-soft-gold/30 rounded-xl overflow-hidden shadow-inner" style={{ backgroundColor: '#0a0a0a' }}>
      <canvas ref={canvasRef} className="w-full h-48 cursor-crosshair"></canvas>
      <button 
        type="button" 
        onClick={handleClear}
        className="absolute top-3 right-3 bg-vecy-card/80 text-vecy-muted text-[10px] uppercase tracking-wider font-bold py-1.5 px-3 rounded-md border border-vecy-border hover:bg-vecy-border hover:text-soft-gold transition-all duration-300"
      >
        Limpiar
      </button>
      
      {/* Indicador visual de firma */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none opacity-20">
        <span className="text-[10px] text-soft-gold uppercase tracking-[0.2em] font-medium italic">Firma del Agente</span>
      </div>
    </div>
  );
}

export default SignaturePadComponent;