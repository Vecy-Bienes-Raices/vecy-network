import React, { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import Navbar from '@/components/Navbar';
import PropertyGallery from '@/components/PropertyGallery';
import PropertyFeatures from '@/components/PropertyFeatures';
import { MapView as Map } from '@/components/Map';
import { 
  Loader2, 
  MapPin, 
  Share2, 
  CalendarCheck, 
  Download, 
  ShieldAlert,
  ArrowLeft,
  Search,
  Zap,
  Award,
  Globe
} from 'lucide-react';
import ShareModal from '@/components/ShareModal';
import { toast } from 'sonner';
import { ScrollReveal } from '@/components/ScrollReveal';

export default function PropertyDetail() {
  const [match, params] = useRoute('/property/:id');
  const [, navigate] = useLocation();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareModalConfig, setShareModalConfig] = useState({ text: "", url: "", modalTitle: "" });

  const propertyId = params?.id ? parseInt(params.id) : null;
  const isStealth = new URLSearchParams(window.location.search).get('mode') === 'stealth';

  const { data: property, isLoading, error } = trpc.properties.getById.useQuery(
    { id: propertyId || 0 },
    { enabled: !!propertyId }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin w-10 h-10 text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Escaneando activo en el Ledger...</p>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Search className="w-16 h-16 text-muted-foreground mb-6 opacity-20" />
        <h2 className="text-2xl font-bold text-white mb-4">Activo No Detectado</h2>
        <p className="text-gray-400 mb-8 max-w-sm">No pudimos encontrar la propiedad solicitada en nuestro ecosistema digital.</p>
        <button onClick={() => navigate('/properties')} className="btn-gold px-8 py-3 uppercase tracking-widest text-sm">
          VOLVER AL CATÁLOGO
        </button>
      </div>
    );
  }

  const generateRefCode = (zone: string, rank: number) => {
     const zoneCode = zone.substring(0, 3).toUpperCase() || 'GEN';
     return `ID-BOG-${zoneCode}${rank.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Indicador de Modo White-Label (Solo visible en Stealth) */}
      {isStealth && (
        <div className="fixed top-0 left-0 w-full z-50 bg-esmeralda/90 backdrop-blur-md py-2 px-4 flex items-center justify-between border-b border-white/10 shadow-2xl">
          <div className="flex items-center gap-2 text-white font-bold text-[10px] uppercase tracking-widest">
            <ShieldAlert className="w-4 h-4" />
            Vistazo Protegido — Sin Información de Contacto Vecy
          </div>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-full text-[10px] font-bold transition-all uppercase"
          >
            <Download className="w-3 h-3" /> Imprimir Ficha
          </button>
        </div>
      )}

      {/* Contenido Principal */}
      <main className={`container py-12 ${isStealth ? 'mt-10' : ''}`}>
        {/* Título y Precio */}
        <ScrollReveal delay={0.1}>
          <div className="mb-12 mt-14">
            <div className="flex items-center gap-2 mb-4">
              <button 
                onClick={() => navigate('/properties')}
                className="p-2 hover:bg-white/10 rounded-full transition-colors group"
              >
                <ArrowLeft className="w-5 h-5 text-primary group-hover:-translate-x-1 transition-transform" />
              </button>
              <span className="vecy-accent-tag mb-0">Detalle de Activo Gold</span>
            </div>
            <h1 className="vecy-title-hero text-left mb-4 uppercase">
              {property.name}
            </h1>
            <div className="flex items-center gap-2 text-gray-400 mb-8 bg-white/5 w-fit px-4 py-2 rounded-full border border-white/5">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-xs uppercase tracking-widest font-bold">
                {property.addressNeighborhood ? `${property.addressNeighborhood}, ${property.addressCity || property.city || 'Bogotá'}` : property.location}
              </span>
            </div>
            <div className="text-5xl font-black text-primary mb-10 flex flex-wrap items-baseline gap-4">
              ${Number(property.price).toLocaleString('es-CO')}
              <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">COP</span>
              {property.adminFee && (
                <span className="text-sm text-gray-400 font-normal block sm:inline mt-2 sm:mt-0">
                  + ${Number(property.adminFee).toLocaleString('es-CO')} Admin
                </span>
              )}
            </div>
            
            {/* Botonera de Acción */}
            <div className="flex flex-col md:flex-row gap-4">
              <button
                 onClick={() => {
                   setShareModalConfig({
                     text: `Mira este inmueble en Vecy Network: ${property.name}`,
                     url: window.location.href,
                     modalTitle: "Compartir Propiedad"
                   });
                   setShareModalOpen(true);
                 }}
                 className="btn-gold flex items-center justify-center gap-3 px-8"
              >
                <Share2 className="w-5 h-5"/> COMPARTIR
              </button>

              <button
                 onClick={() => {
                     const refCode = generateRefCode(property.zone || '', (property as any).zoneRank ?? 1);
                     navigate(`/agenda/${property.id}?nombre=${encodeURIComponent(property.name)}&codigo=${encodeURIComponent(refCode)}`);
                 }}
                 className="py-4 px-8 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all duration-300 rounded-xl flex items-center justify-center gap-3 font-bold tracking-widest text-xs uppercase"
              >
                <CalendarCheck className="w-5 h-5"/> AGENDAR VISITA
              </button>

              {!isStealth && (
                <a
                  href={`/ficha/${property.id}`} 
                  target="_blank" rel="noreferrer"
                  className="py-4 px-8 bg-black border border-white/10 text-white rounded-xl hover:border-primary/50 transition-all flex items-center justify-center font-bold tracking-widest text-xs uppercase"
                >
                  DESCARGAR FICHA TÉCNICA
                </a>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* MEDIA SECTION */}
        <div className="grid lg:grid-cols-3 gap-12 mb-20 animate-fade-in delay-200">
          {/* Columna Video */}
          {property.videoUrl && (
            <ScrollReveal direction="left" delay={0.3} className="lg:col-span-1">
              <div className="flex flex-col">
                <h3 className="text-sm font-black text-white mb-6 uppercase tracking-[0.3em] flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Tour Virtual
                </h3>
                <div className="flex justify-center w-full">
                  <div className="aspect-[9/16] w-full max-w-[320px] rounded-[3rem] overflow-hidden shadow-[0_0_50px_rgba(191,149,63,0.1)] border-[8px] border-[#1a1a1a] relative bg-black ring-1 ring-white/10">
                    <iframe 
                      className="w-full h-full"
                      src={property.videoUrl} 
                      title="Virtual Tour"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* Columna Galería */}
          <div className={`${property.videoUrl ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <ScrollReveal delay={0.4}>
              <h3 className="text-sm font-black text-white mb-6 uppercase tracking-[0.3em]">Galería de Activo</h3>
              <PropertyGallery images={(property.images as string[]) || []} propertyName={property.name} />
            </ScrollReveal>
          </div>
        </div>

        {/* INFO GRID */}
        <div className="grid lg:grid-cols-3 gap-12 mb-20">
          <div className="lg:col-span-2 space-y-12">
            <ScrollReveal direction="left">
              <div className="vecy-card-apple p-10">
                <h3 className="text-2xl font-bold text-white mb-8 uppercase tracking-tight">Descripción del Activo</h3>
                <p className="vecy-paragraph text-sm mb-0 whitespace-pre-wrap leading-relaxed">
                  {property.description || property.rawText}
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="left" delay={0.1}>
              <div className="vecy-card-apple p-10">
                <h3 className="text-2xl font-bold text-white mb-8 uppercase tracking-tight">Análisis de Mercado</h3>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-2 text-center md:text-left">Valor por m²</p>
                    <p className="text-3xl font-black text-primary text-center md:text-left">
                      ${Math.round(Number(property.price) / (Number(property.areaTotal) || 1)).toLocaleString('es-CO')}
                    </p>
                  </div>
                  <div className="p-6 bg-white/5 rounded-2xl border border-white/5 flex flex-col justify-center items-center md:items-start">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-2">Estado de Oportunidad</p>
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-accent" />
                      <span className="text-lg font-bold text-white uppercase tracking-wider">Óptimo para Cierre</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>

          <div className="space-y-12">
            <ScrollReveal direction="right">
              <PropertyFeatures property={property} />
            </ScrollReveal>
            
            <ScrollReveal direction="right" delay={0.2}>
              <div className="vecy-card-apple p-10 border-primary/20 bg-primary/5">
                <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-wider">Ubicación Estratégica</h3>
                <div className="h-64 rounded-2xl overflow-hidden border border-white/10">
                  <Map 
                    initialCenter={{
                      lat: Number(property.latitude) || 4.6097,
                      lng: Number(property.longitude) || -74.0817
                    }} 
                    initialZoom={15}
                  />
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </main>

      <ShareModal 
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        text={shareModalConfig.text}
        url={shareModalConfig.url}
        modalTitle={shareModalConfig.modalTitle}
      />

      <footer className="bg-black border-t border-white/10 py-20 mt-20">
        <div className="container text-center">
          <img src="/logo-vecy.png" alt="Vecy" className="h-8 mx-auto mb-8 opacity-30 grayscale" />
          <p className="text-gray-600 text-[10px] uppercase tracking-[0.4em]">VECY Network — El Futuro Inmobiliario es Ahora.</p>
        </div>
      </footer>
    </div>
  );
}
