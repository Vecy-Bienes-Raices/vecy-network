import React, { useState, useMemo } from 'react';
import { useRoute, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import Navbar from '@/components/Navbar';
import PropertyGallery from '@/components/PropertyGallery';
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
  Edit2,
  Building2,
  Home,
  Bed,
  Bath,
  Square,
  Car,
  CheckCircle2,
  Layers,
  Sparkles,
  Calendar,
  Warehouse,
  Briefcase
} from 'lucide-react';
import ShareModal from '@/components/ShareModal';
import UnifiedPublishModal from '@/components/publish/UnifiedPublishModal';
import { ScrollReveal } from '@/components/ScrollReveal';

export default function PropertyDetail() {
  const [match, params] = useRoute('/property/:id');
  const [, navigate] = useLocation();
  const trpcContext = trpc.useUtils();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareModalConfig, setShareModalConfig] = useState({ text: "", url: "", modalTitle: "" });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Cargando ficha oficial del inmueble...</p>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Search className="w-16 h-16 text-muted-foreground mb-6 opacity-20" />
        <h2 className="text-2xl font-bold text-white mb-4">Inmueble No Encontrado</h2>
        <p className="text-zinc-400 mb-8 max-w-sm">No pudimos encontrar la propiedad solicitada en la red de Vecy Network.</p>
        <button onClick={() => navigate('/ofertas')} className="btn-gold px-8 py-3 uppercase tracking-widest text-xs font-black">
          VOLVER A TIENDA OFERTAS
        </button>
      </div>
    );
  }

  const generateRefCode = (zone: string, rank: number) => {
    const zoneCode = zone.substring(0, 3).toUpperCase() || 'BOG';
    return `ID-BOG-${zoneCode}${rank.toString().padStart(2, '0')}`;
  };

  // 🛡️ Extracción de características y amenidades estructuradas
  const anyProp: any = property;
  const rawAmenities: any = anyProp.amenities;
  let externalFeaturesList: string[] = [];
  let internalFeaturesList: string[] = [];
  let enrichedAmenities: any = null;

  if (Array.isArray(rawAmenities)) {
    externalFeaturesList = rawAmenities.filter(Boolean);
  } else if (rawAmenities && typeof rawAmenities === 'object') {
    enrichedAmenities = rawAmenities;
    if (Array.isArray(rawAmenities.caracteristicasExternas)) {
      externalFeaturesList = rawAmenities.caracteristicasExternas.filter(Boolean);
    }
    if (Array.isArray(rawAmenities.caracteristicasInternas)) {
      internalFeaturesList = rawAmenities.caracteristicasInternas.filter(Boolean);
    }
  }

  if (Array.isArray(anyProp.internalFeatures) && anyProp.internalFeatures.length > 0) {
    internalFeaturesList = Array.from(new Set([...internalFeaturesList, ...anyProp.internalFeatures.filter(Boolean)]));
  }

  // Helper para tipo de negocio
  const getTransactionInfo = (type?: string | null) => {
    const t = (type || '').toLowerCase();
    if (t.includes('arriendo_con_opcion') || t.includes('opcion_de_compra')) {
      return { label: 'Arriendo con Opción', isPermuta: false, isArriendo: true, className: 'bg-gradient-to-r from-sky-600 to-blue-700 text-white' };
    }
    if (t.includes('arriendo_temporal') || t.includes('temporal')) {
      return { label: 'Arriendo Temporal', isPermuta: false, isArriendo: true, className: 'bg-gradient-to-r from-cyan-600 to-teal-700 text-white' };
    }
    if (t.includes('venta_o_arriendo') || (t.includes('venta') && t.includes('arriendo'))) {
      return { label: 'Venta | Arriendo', isPermuta: !!enrichedAmenities?.permutaDetalle, isArriendo: true, className: 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white' };
    }
    if (t.includes('venta_permuta') || t.includes('permuta')) {
      return { label: 'Venta | Permuta', isPermuta: true, isArriendo: false, className: 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white' };
    }
    if (t.includes('arriendo')) {
      return { label: 'Arriendo', isPermuta: false, isArriendo: true, className: 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white' };
    }
    return { label: 'Venta', isPermuta: !!enrichedAmenities?.permutaDetalle, isArriendo: false, className: 'bg-gradient-to-r from-amber-600 to-amber-700 text-white' };
  };

  const transactionInfo = getTransactionInfo(property.transactionType);
  const displayType = enrichedAmenities?.tipoExacto || property.propertyType || 'Inmueble';
  const age = property.yearBuilt ? new Date().getFullYear() - property.yearBuilt : null;
  const refCode = generateRefCode(property.zone || '', (property as any).zoneRank ?? 1);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Navbar />

      {/* Indicador de Modo White-Label (Solo visible en Stealth) */}
      {isStealth && (
        <div className="fixed top-0 left-0 w-full z-50 bg-emerald-700/90 backdrop-blur-md py-2 px-4 flex items-center justify-between border-b border-white/10 shadow-2xl">
          <div className="flex items-center gap-2 text-white font-bold text-[10px] uppercase tracking-widest">
            <ShieldAlert className="w-4 h-4" />
            Vistazo Protegido — Sin Información de Contacto Vecy
          </div>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-full text-[10px] font-bold transition-all uppercase cursor-pointer"
          >
            <Download className="w-3 h-3" /> Imprimir Ficha
          </button>
        </div>
      )}

      <main className={`container py-8 ${isStealth ? 'mt-10' : 'mt-16'}`}>
        
        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 1. CABECERA DOCTRINAL: TÍTULO, UBICACIÓN & BLOQUE DE PRECIO/NEGOCIO */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <ScrollReveal delay={0.1}>
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={() => navigate('/ofertas')}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-primary text-xs font-black uppercase tracking-widest transition-all cursor-pointer border border-white/10"
                title="Volver a la Tienda de Ofertas"
              >
                <ArrowLeft className="w-4 h-4 text-primary" />
                <span>Tienda Ofertas</span>
              </button>

              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-[#fcf6ba] bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                Oferta Auditada #{property.id}
              </span>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 items-start bg-zinc-900/80 p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl">
              {/* Izquierda: Título y Ubicación */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />
                  <span className="text-xs font-black uppercase tracking-widest text-primary">
                    {displayType}
                  </span>
                  {enrichedAmenities?.subtipoComercial && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-primary/20 text-primary uppercase border border-primary/30">
                      Uso Comercial
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white uppercase tracking-tight font-serif leading-tight">
                  {property.name}
                </h1>

                <div className="flex items-center gap-2 text-zinc-300 text-xs sm:text-sm font-semibold">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    {property.addressNeighborhood ? `${property.addressNeighborhood}, ` : ''}
                    {property.addressLocality ? `${property.addressLocality}, ` : (property.zone ? `${property.zone}, ` : '')}
                    {property.addressCity || property.city || 'Bogotá D.C.'}
                  </span>
                </div>

                <div className="text-zinc-500 text-[11px] font-mono tracking-wider pt-1">
                  Código Oficial: <span className="text-zinc-300 font-bold">{refCode}</span>
                </div>
              </div>

              {/* Derecha: Negocio y Precio */}
              <div className="lg:col-span-1 bg-black/70 p-5 rounded-2xl border border-white/10 space-y-3 text-right">
                <div className="flex items-center justify-between lg:justify-end gap-3">
                  <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">Modalidad:</span>
                  <span className={`px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider shadow-lg ${transactionInfo.className}`}>
                    {transactionInfo.label}
                  </span>
                </div>

                <div>
                  <p className="text-3xl sm:text-4xl font-black text-primary leading-none">
                    ${Number(property.price).toLocaleString('es-CO')}
                  </p>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">COP</p>
                </div>

                {property.adminFee && (
                  <p className="text-xs text-zinc-300 font-semibold border-t border-white/10 pt-2">
                    Administración: <span className="text-white font-bold">${Number(property.adminFee).toLocaleString('es-CO')}</span>
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-wider pt-2 border-t border-white/10">
                  <div className="bg-white/5 p-2 rounded-lg text-center">
                    <span className="text-zinc-400 block text-[8px]">Permuta</span>
                    <span className={transactionInfo.isPermuta ? "text-emerald-400 font-black" : "text-zinc-500"}>
                      {transactionInfo.isPermuta ? "SÍ" : "NO"}
                    </span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-lg text-center">
                    <span className="text-zinc-400 block text-[8px]">Arriendo</span>
                    <span className={transactionInfo.isArriendo ? "text-emerald-400 font-black" : "text-zinc-500"}>
                      {transactionInfo.isArriendo ? "SÍ" : "NO"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Botonera de Acción Rápida */}
            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={() => {
                  navigate(`/agenda/${property.id}?nombre=${encodeURIComponent(property.name)}&codigo=${encodeURIComponent(refCode)}`);
                }}
                className="btn-gold px-8 py-3.5 shadow-[0_0_25px_rgba(191,149,63,0.4)] hover:scale-105 transition-all font-black tracking-widest text-xs uppercase text-black inline-flex items-center gap-2 cursor-pointer"
                title="Agendar visita oficial con Vecy Agenda"
              >
                <CalendarCheck className="w-4 h-4 text-black animate-pulse" />
                <span>AGENDAR VISITA OFICIAL</span>
              </button>

              <button
                onClick={() => setIsEditModalOpen(true)}
                className="py-3.5 px-6 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl transition-all inline-flex items-center gap-2 font-black tracking-widest text-xs uppercase cursor-pointer"
                title="Editar datos, fotos o precios del inmueble"
              >
                <Edit2 className="w-4 h-4 text-primary" />
                <span>EDITAR INMUEBLE</span>
              </button>

              <button
                onClick={() => {
                  setShareModalConfig({
                    text: `Mira este inmueble en Vecy Network: ${property.name}`,
                    url: window.location.href,
                    modalTitle: "Compartir Propiedad"
                  });
                  setShareModalOpen(true);
                }}
                className="py-3.5 px-6 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white rounded-xl transition-all inline-flex items-center gap-2 font-black tracking-widest text-xs uppercase cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-zinc-300" />
                <span>COMPARTIR</span>
              </button>

              {!isStealth && (
                <a
                  href={`/ficha/${property.id}`} 
                  target="_blank" rel="noreferrer"
                  className="py-3.5 px-6 bg-black border border-white/10 hover:border-primary/50 text-white rounded-xl transition-all inline-flex items-center gap-2 font-black tracking-widest text-xs uppercase"
                >
                  <Download className="w-4 h-4 text-zinc-300" />
                  <span>FICHA TÉCNICA</span>
                </a>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 2. GALERÍA FOTOGRÁFICA & TOUR VIRTUAL                            */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12 animate-fade-in">
          {property.videoUrl && (
            <ScrollReveal direction="left" delay={0.2} className="lg:col-span-1">
              <div className="flex flex-col">
                <h3 className="text-xs font-black text-white mb-4 uppercase tracking-[0.25em] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Tour Virtual
                </h3>
                <div className="aspect-[9/16] w-full max-w-[320px] mx-auto rounded-3xl overflow-hidden shadow-2xl border-4 border-zinc-800 relative bg-black">
                  <iframe 
                    className="w-full h-full"
                    src={property.videoUrl} 
                    title="Tour Virtual"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  />
                </div>
              </div>
            </ScrollReveal>
          )}

          <div className={`${property.videoUrl ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <ScrollReveal delay={0.3}>
              <h3 className="text-xs font-black text-white mb-4 uppercase tracking-[0.25em] flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Galería Fotográfica del Inmueble
              </h3>
              <PropertyGallery images={(property.images as string[]) || []} propertyName={property.name} />
            </ScrollReveal>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 3. DETALLES DEL INMUEBLE (TABLA / GRID ESTRUCTURADA TIPO WIX)     */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <ScrollReveal delay={0.2}>
          <div className="vecy-card-apple p-6 sm:p-8 mb-12">
            <h3 className="text-lg font-black text-white uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-white/10 pb-3">
              <span className="text-primary">🔎</span> Detalles del Inmueble
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Precio</span>
                <span className="text-white font-extrabold text-sm text-primary">
                  ${Number(property.price).toLocaleString('es-CO')}
                </span>
              </div>

              <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Administración</span>
                <span className="text-white font-extrabold text-sm">
                  {property.adminFee ? `$${Number(property.adminFee).toLocaleString('es-CO')}` : 'No aplica'}
                </span>
              </div>

              <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Área Construida</span>
                <span className="text-white font-extrabold text-sm">
                  {property.areaTotal ? `${property.areaTotal} m²` : 'Por verificar'}
                </span>
              </div>

              <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Área Privada</span>
                <span className="text-white font-extrabold text-sm">
                  {property.areaPrivate || enrichedAmenities?.areaPrivada ? `${property.areaPrivate || enrichedAmenities.areaPrivada} m²` : (property.areaTotal ? `${property.areaTotal} m²` : '-')}
                </span>
              </div>

              <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Año Construcción</span>
                <span className="text-white font-extrabold text-sm">
                  {property.yearBuilt ? `${property.yearBuilt} ${age !== null ? `(${age} años)` : ''}` : 'No especificado'}
                </span>
              </div>

              <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Barrio / Sector</span>
                <span className="text-white font-extrabold text-sm truncate block">
                  {property.addressNeighborhood || property.zone || 'Bogotá'}
                </span>
              </div>

              <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Baños</span>
                <span className="text-white font-extrabold text-sm">
                  {property.bathrooms || '0'}
                </span>
              </div>

              <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Habitaciones / Oficinas</span>
                <span className="text-white font-extrabold text-sm">
                  {property.bedrooms || '0'}
                </span>
              </div>

              <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Estrato</span>
                <span className="text-white font-extrabold text-sm">
                  {property.stratum ? `Estrato ${property.stratum}` : 'Comercial / Libre'}
                </span>
              </div>

              <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Garajes</span>
                <span className="text-white font-extrabold text-sm">
                  {property.garages ? `${property.garages} Carro(s)` : 'Sin garaje'}
                  {enrichedAmenities?.garajesMoto ? ` / ${enrichedAmenities.garajesMoto} Moto(s)` : ''}
                </span>
              </div>

              <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Piso / Ubicación</span>
                <span className="text-white font-extrabold text-sm">
                  {enrichedAmenities?.pisoEdificio ? `Piso ${enrichedAmenities.pisoEdificio}` : (property.floorDetail || 'Por confirmar')}
                </span>
              </div>

              <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Estado Físico</span>
                <span className="text-white font-extrabold text-sm">
                  {enrichedAmenities?.estadoInmueble || 'Excelente'}
                </span>
              </div>

              <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Localidad</span>
                <span className="text-white font-extrabold text-sm">
                  {property.addressLocality || property.zone || 'Usaquén'}
                </span>
              </div>

              <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Ciudad</span>
                <span className="text-white font-extrabold text-sm">
                  {property.addressCity || property.city || 'Bogotá D.C.'}
                </span>
              </div>

              <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Cocina</span>
                <span className="text-white font-extrabold text-sm">
                  {enrichedAmenities?.cocina || 'Integral'}
                </span>
              </div>

              <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Tipo de Inmueble</span>
                <span className="text-white font-extrabold text-sm">
                  {displayType}
                </span>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 4. DOS COLUMNAS CLARAS: INTERNAS & EXTERNAS (ESTILO DOCTRINAL)    */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Columna A: Características Internas */}
          <ScrollReveal direction="left">
            <div className="vecy-card-apple p-6 sm:p-8 h-full">
              <h4 className="text-base font-black text-white uppercase tracking-wider mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                <span className="flex items-center gap-2">
                  <span>🏠</span> Características Internas
                </span>
                <span className="text-[10px] text-primary font-black px-2 py-0.5 rounded bg-primary/10">
                  {internalFeaturesList.length} Registradas
                </span>
              </h4>

              {internalFeaturesList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {internalFeaturesList.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-zinc-300 text-xs py-1">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-medium">{feat}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">No se han registrado características internas adicionales.</p>
              )}
            </div>
          </ScrollReveal>

          {/* Columna B: Características Externas */}
          <ScrollReveal direction="right">
            <div className="vecy-card-apple p-6 sm:p-8 h-full">
              <h4 className="text-base font-black text-white uppercase tracking-wider mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                <span className="flex items-center gap-2">
                  <span>🏢</span> Características Externas
                </span>
                <span className="text-[10px] text-primary font-black px-2 py-0.5 rounded bg-primary/10">
                  {externalFeaturesList.length} Registradas
                </span>
              </h4>

              {externalFeaturesList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {externalFeaturesList.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-zinc-300 text-xs py-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-medium">{feat}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">No se han registrado características externas adicionales.</p>
              )}
            </div>
          </ScrollReveal>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 5. DESCRIPCIÓN COMPLETA DEL INMUEBLE                              */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <ScrollReveal delay={0.2}>
          <div className="vecy-card-apple p-6 sm:p-8 mb-12">
            <h3 className="text-lg font-black text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-3 flex items-center gap-2">
              <span className="text-primary">📝</span> Descripción del Inmueble
            </h3>
            <p className="text-zinc-300 leading-relaxed text-sm whitespace-pre-wrap font-sans">
              {property.description || property.rawText || 'Sin descripción detallada disponible.'}
            </p>
          </div>
        </ScrollReveal>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 6. UBICACIÓN ESTRATÉGICA & VECY AGENDA FORM PROMINENTE            */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {/* Mapa */}
          <div className="lg:col-span-2">
            <ScrollReveal direction="left">
              <div className="vecy-card-apple p-6 sm:p-8 h-full">
                <h3 className="text-base font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> Ubicación del Inmueble
                </h3>
                <p className="text-xs text-zinc-400 mb-4">
                  Zona geográfica verificada por el captador oficial de Vecy Network.
                </p>
                <div className="h-80 rounded-2xl overflow-hidden border border-white/10">
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

          {/* Tarjeta de Agendamiento Directo */}
          <div className="lg:col-span-1">
            <ScrollReveal direction="right">
              <div className="vecy-card-apple p-6 sm:p-8 bg-gradient-to-b from-primary/10 via-zinc-900 to-black border-primary/30 flex flex-col justify-between h-full space-y-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-3">
                    <CalendarCheck className="w-3.5 h-3.5 animate-pulse" /> Visita Oficial
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight font-serif mb-2">
                    ¿Deseas conocer este inmueble?
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Agenda una visita guiada con nuestro sistema antifraude de verificación de identidad. Sin filas ni intermediarios no autorizados.
                  </p>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/10">
                  <button
                    onClick={() => {
                      navigate(`/agenda/${property.id}?nombre=${encodeURIComponent(property.name)}&codigo=${encodeURIComponent(refCode)}`);
                    }}
                    className="w-full btn-gold py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(191,149,63,0.4)] cursor-pointer"
                  >
                    <CalendarCheck className="w-4 h-4 text-black" />
                    <span>SOLICITAR VISITA AHORA</span>
                  </button>

                  <p className="text-[9px] text-zinc-500 text-center uppercase tracking-wider font-semibold">
                    Respaldo legal & peritaje inmobiliario certificado
                  </p>
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

      {property && (
        <UnifiedPublishModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          defaultTab="oferta"
          editProperty={property}
          onSuccess={() => {
            trpcContext.properties.getById.invalidate({ id: propertyId || 0 });
            trpcContext.properties.list.invalidate();
          }}
        />
      )}

      <footer className="bg-black border-t border-white/10 py-16 mt-16">
        <div className="container text-center">
          <img src="/logo-vecy.png" alt="Vecy" className="h-8 mx-auto mb-6 opacity-40 grayscale" />
          <p className="text-zinc-600 text-[10px] uppercase tracking-[0.3em]">VECY Network — Red Colaborativa de Corretaje Inmobiliario para Colombia.</p>
        </div>
      </footer>
    </div>
  );
}
