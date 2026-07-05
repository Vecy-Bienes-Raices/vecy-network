import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

function AnimatedCheck() {
  return (
    <svg className="h-20 w-20 text-emerald-500 mx-auto" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r="25" fill="none" stroke="currentColor" strokeWidth="2" />
      <path fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        style={{
          strokeDasharray: 48,
          strokeDashoffset: 48,
          animation: 'draw 0.4s ease-out 0.5s forwards',
        }}
        d="M14 27l5.917 5.917L38 18" />
      <style>{`
        @keyframes draw {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </svg>
  );
}

export default function GraciasScreen({ formData, propertyName, onBackToCatalog }) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const nombreSolicitante = formData?.solicitante_nombre?.split(' ')[0] || 'tú';
  const emailSolicitante = formData?.solicitante_email || 'tu correo';

  return (
    <div className="bg-black/40 border border-white/10 rounded-2xl glass p-10 max-w-2xl w-full shadow-2xl transition-all duration-500">
      {!showContent ? (
        <div className="py-6 animate-pulse">
          <h2 className="text-2xl font-bold text-white mb-4">Procesando tu solicitud...</h2>
          <p className="text-gray-400 mb-8">Estamos finalizando los detalles y preparando tu confirmación.</p>
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary/20 border-t-primary"></div>
          </div>
        </div>
      ) : (
        <div className="transition-opacity duration-700 opacity-100">
          <AnimatedCheck />
          <h1 className="text-3xl sm:text-4xl font-bold text-white mt-6 mb-3">¡Gracias, {nombreSolicitante}!</h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Hemos recibido tu solicitud para <strong>{propertyName || 'el inmueble'}</strong> correctamente.
          </p>
          
          <div className="mt-8 bg-black/20 p-6 rounded-xl border border-white/10 text-left">
            <h3 className="font-bold text-primary text-lg mb-2">📋 Siguientes Pasos</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-3">
              Te hemos enviado un correo de confirmación a: <strong className="text-white">{emailSolicitante}</strong>.
            </p>
            <p className="text-xs text-gray-500 leading-relaxed border-t border-white/10 pt-3">
              <strong>Importante:</strong> El correo ha sido enviado por el remitente <span className="text-primary font-semibold">vecybienesraices@gmail.com</span> y puede tardar unos minutos en llegar mientras generamos los documentos del contrato. Por favor, revisa también tu carpeta de correo no deseado (spam).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Button 
              className="btn-gold flex-1 py-6 text-sm tracking-widest font-bold uppercase rounded-xl"
              onClick={onBackToCatalog}
            >
              Volver al Catálogo
            </Button>
            
            <a 
              href="https://wa.me/573185462265" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button 
                variant="outline"
                className="w-full border-white/10 text-white bg-transparent hover:bg-white/5 py-6 text-sm tracking-widest font-bold uppercase rounded-xl"
              >
                Soporte en WhatsApp
              </Button>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
