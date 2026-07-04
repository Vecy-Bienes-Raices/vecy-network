// @ts-nocheck
import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AgendaForm from "@/components/agenda-pro/AgendaForm";

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

/** Genera código de referencia: zona + posición consecutiva dentro de la zona */
function generateRefCode(zone: string, rank: number): string {
  const normalized = (zone || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const abbrevMap: Record<string, string> = {
    'santa barbara central': 'SBC', 'santa barbara occidental': 'SBOCC',
    'santa barbara oriental': 'SBORI', 'santa barbara': 'SB',
    'chapinero': 'CHP', 'chapinero alto': 'CHRA', 'chapinero central': 'CHRC',
    'usaquen': 'USQ', 'salitre': 'SAL', 'san patricio': 'SP',
    'zona rosa': 'ZR', 'teusaquillo': 'TEU', 'el lago': 'LAG',
    'la soledad': 'SOL', 'cedritos': 'CED', 'chico': 'CHC',
    'chico norte': 'CHCN', 'santa ana': 'SNA', 'country': 'COU',
    'rosales': 'ROS', 'nogal': 'NOG',
  };
  const abbrev = abbrevMap[normalized] ||
    (zone || 'XX').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 5);
  return `ID-BOG-${abbrev}${String(rank).padStart(2, '0')}`;
}

export default function Agenda() {
  const [matchAgenda, paramsAgenda] = useRoute("/agenda/:propertyId");
  const propertyId = paramsAgenda?.propertyId;
  const search = new URLSearchParams(window.location.search);
  const agentIdFromUrl = search.get('ref') || search.get('agentId'); // Support both tracking and direct ref
  
  const [, navigate] = useLocation();

  // Fetch Property Data
  const { data: property, isLoading: isPropertyLoading } = trpc.properties.getById.useQuery(
    { id: Number(propertyId) },
    { enabled: !!propertyId && !isNaN(Number(propertyId)) }
  );

  // Fetch Agent Branding (if applicable)
  const { data: agent } = trpc.agent.getProfile.useQuery(
    { id: Number(agentIdFromUrl) },
    { enabled: !!agentIdFromUrl && !isNaN(Number(agentIdFromUrl)) }
  );

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isSubmitted) {
      const timer = setTimeout(() => {
        setShowContent(true);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isSubmitted]);

  // Dynamic Theme Styling
  const customStyles = agent?.themeConfig ? {
    '--primary': (agent.themeConfig as any).primaryColor || '#bf953f',
    '--accent': (agent.themeConfig as any).accentColor || '#bf953f',
  } as React.CSSProperties : {};

  if (isPropertyLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col" style={customStyles}>
        <Navbar 
          logoUrl={agent?.customLogoUrl || undefined} 
          brandName={agent?.name?.split(' ')[0] || "VECY"}
          brandSubtitle="AGENDA PRO"
        />
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="animate-spin w-10 h-10 text-accent" />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col" style={customStyles}>
        <Navbar 
          logoUrl={agent?.customLogoUrl || undefined} 
          brandName={agent?.name?.split(' ')[0] || "VECY"}
          brandSubtitle="AGENDA PRO"
        />
        <div className="flex-1 flex flex-col justify-center items-center">
          <h2 className="text-2xl font-bold text-white mb-4">Inmueble no encontrado</h2>
          <Button variant="outline" className="btn-gold" onClick={() => navigate('/properties')}>
            Volver al Catálogo
          </Button>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    const nombreSolicitante = submittedData?.solicitante_nombre?.split(' ')[0] || 'tú';
    const emailSolicitante = submittedData?.solicitante_email || 'tu correo';

    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col" style={customStyles}>
        <Navbar 
          logoUrl={agent?.customLogoUrl || undefined} 
          brandName={agent?.name?.split(' ')[0] || "VECY"}
          brandSubtitle="AGENDA PRO"
        />
        <div className="flex-1 flex flex-col justify-center items-center text-center p-8">
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
                  Hemos recibido tu solicitud para <strong>{property.name}</strong> correctamente.
                </p>
                
                <div className="mt-8 bg-black/20 p-6 rounded-xl border border-white/10 text-left">
                  <h3 className="font-bold text-primary text-lg mb-2">📋 Siguientes Pasos</h3>
                  <p className="text-gray-300 text-sm leading-relaxed mb-3">
                    Te hemos enviado un mensaje de confirmación y la dirección exacta del inmueble a tu **WhatsApp** y a tu correo de confirmación: <strong className="text-white">{emailSolicitante}</strong>.
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed border-t border-white/10 pt-3">
                    <strong>Importante:</strong> El correo ha sido enviado por el remitente <span className="text-primary font-semibold">vecybienesraices@gmail.com</span> y puede tardar unos minutos en llegar mientras generamos los documentos del contrato. Por favor, revisa también tu carpeta de correo no deseado (spam).
                  </p>
                </div>

                <Button className="btn-gold w-full py-6 mt-8 text-sm tracking-widest font-bold uppercase rounded-xl" onClick={() => navigate('/properties')}>
                  Volver al Catálogo
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground" style={customStyles}>
      <Navbar 
        logoUrl={agent?.customLogoUrl || undefined} 
        brandName={agent?.name?.split(' ')[0] || "VECY"}
        brandSubtitle="AGENDA PRO"
      />

      <section className="pt-32 pb-20">
        <div className="container max-w-4xl">
          <AgendaForm 
            propertyName={property.name} 
            propertyCode={generateRefCode(property.zone || '', (property as any).zoneRank ?? 1)} 
            isLocked={true} 
            agentId={agent?.id}
            customLogo={agent?.customLogoUrl}
            onSuccess={(data) => {
              setSubmittedData(data);
              setIsSubmitted(true);
            }}
          />
        </div>
      </section>
    </div>
  );
}
