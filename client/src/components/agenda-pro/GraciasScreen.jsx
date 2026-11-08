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

  const calTitle = encodeURIComponent(`Cita Vecy: ${propertyName || 'Inmueble'} (${formData?.codigo_inmueble || 'Vecy'})`);
  const calDetails = encodeURIComponent(`Solicitud de cita confirmada en Vecy Bienes Raíces. Atención Bróker: +57 316 6569719. Inmueble: ${propertyName || ''}`);
  const calLocation = encodeURIComponent(propertyName || 'Bogotá, Colombia');
  const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calTitle}&details=${calDetails}&location=${calLocation}`;

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
          <h1 className="text-3xl sm:text-4xl font-bold text-white mt-6 mb-3">¡Cita Confirmada, {nombreSolicitante}! ✨</h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Hemos recibido y registrado tu agendamiento para <strong>{propertyName || 'el servicio solicitado'}</strong> exitosamente.
          </p>
          
          {/* Banner Doctrinal 24h Antes */}
          <div className="mt-6 bg-amber-500/10 border-l-4 border-amber-500 p-5 rounded-r-xl text-left">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🔒</span>
              <h4 className="font-bold text-amber-400 text-sm tracking-wide uppercase">Política de Seguridad Notarial y Entrega de Dirección</h4>
            </div>
            <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
              Tu reserva está <strong>100% garantizada</strong>. Por protocolos de seguridad de los propietarios y administración, la <strong>dirección física exacta y nomenclatura</strong> te llegará a tu WhatsApp y a tu correo exactamente <strong>24 horas antes de la visita</strong> (o de inmediato si agendaste para hoy).
            </p>
          </div>

          <div className="mt-6 bg-black/20 p-6 rounded-xl border border-white/10 text-left">
            <h3 className="font-bold text-primary text-base mb-2">📋 Confirmación y Documentos</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-3">
              Te hemos enviado la constancia oficial a: <strong className="text-white">{emailSolicitante}</strong>.
            </p>
            <p className="text-xs text-gray-500 leading-relaxed border-t border-white/10 pt-3">
              <strong>Importante:</strong> El correo ha sido enviado por <span className="text-primary font-semibold">vecybienesraices@gmail.com</span>. Si eres agente o inmobiliaria, tu contrato de colaboración firmado en PDF ya está adjunto. Revisa también tu carpeta de spam.
            </p>
          </div>

          {/* Botón de Google Calendar */}
          <div className="mt-6">
            <a 
              href={googleCalUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/40 hover:border-amber-400 text-amber-300 font-semibold text-sm transition-all hover:scale-[1.01]"
            >
              <span>📅</span>
              <span>Añadir cita a mi Google Calendar</span>
            </a>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <Button 
              className="btn-gold flex-1 py-6 text-sm tracking-widest font-bold uppercase rounded-xl"
              onClick={onBackToCatalog}
            >
              Volver al Catálogo
            </Button>
            
            <a 
              href="https://wa.me/573166569719" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button 
                variant="outline"
                className="w-full border-white/10 text-white bg-transparent hover:bg-white/5 py-6 text-sm tracking-widest font-bold uppercase rounded-xl"
              >
                Atención Bróker (+57 316 656 9719)
              </Button>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
