import React, { useEffect, useState, useMemo } from 'react';
import { useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import { propertiesDatabase } from '@/lib/properties';
import { 
  ChevronLeft, Download, Ruler, Bed, Bath, Car, Building, 
  Zap, Layers, Truck, Home, Trees, Map, Construction, 
  Star, Utensils, Droplets, Briefcase, ShieldCheck, EyeOff,
  Palette, Sparkles, Share2, Phone, Mail, Globe, QrCode, Loader2, CheckCircle2
} from 'lucide-react';
import ShareModal from '@/components/ShareModal';

type BrandMode = 'branded' | 'neutral' | 'vecy';
type TemplateStyle = 'wasi-classic' | 'luxury-editorial' | 'modern-minimal';

function detectTrafficPlatform(): string {
  const params = new URLSearchParams(window.location.search);
  const utm = (params.get('utm_source') || params.get('source') || '').toLowerCase();
  if (utm) return utm;
  const ref = (document.referrer || '').toLowerCase();
  if (ref.includes('whatsapp') || ref.includes('wa.me')) return 'whatsapp';
  if (ref.includes('facebook') || ref.includes('fb.')) return 'facebook';
  if (ref.includes('instagram')) return 'instagram';
  if (ref.includes('tiktok')) return 'tiktok';
  if (ref.includes('linkedin')) return 'linkedin';
  if (ref.includes('google') || ref.includes('bing')) return 'google_seo';
  return 'direct';
}

function getVisitorFingerprint(): string {
  try {
    let fp = localStorage.getItem('vcy_visitor_fp');
    if (!fp) {
      fp = `fp_${Math.random().toString(36).substring(2, 11)}_${Date.now().toString(36)}`;
      localStorage.setItem('vcy_visitor_fp', fp);
    }
    return fp;
  } catch {
    return 'anon_browser';
  }
}

export default function UnbrandedFicha() {
  const [, params] = useRoute('/ficha/:id');
  const rawPropertyId = params?.id || '';
  const numericPropertyId = !isNaN(Number(rawPropertyId)) ? Number(rawPropertyId) : 0;

  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialModeParam = (searchParams.get('mode') || searchParams.get('brand') || '').toLowerCase();
  const refToken = searchParams.get('ref') || '';
  const agentIdParam = searchParams.get('agentId') ? Number(searchParams.get('agentId')) : undefined;

  const [brandMode, setBrandMode] = useState<BrandMode>(() => {
    if (initialModeParam === 'neutral' || initialModeParam === 'stealth' || initialModeParam === 'unbranded') return 'neutral';
    if (initialModeParam === 'branded' || initialModeParam === 'agent' || agentIdParam) return 'branded';
    return 'neutral'; // Por defecto en /ficha/:id priorizamos marca blanca neutra o conmutable en 1 clic
  });

  const [templateStyle, setTemplateStyle] = useState<TemplateStyle>('wasi-classic');
  const [customPrimaryColor, setCustomPrimaryColor] = useState<string>('#0f4c81');
  const [customSecondaryColor, setCustomSecondaryColor] = useState<string>('#0f172a');
  const [customAgencyName, setCustomAgencyName] = useState<string>('');
  const [customPhone, setCustomPhone] = useState<string>('');
  const [customEmail, setCustomEmail] = useState<string>('');
  const [customLogo, setCustomLogo] = useState<string>('');
  const [showCustomizer, setShowCustomizer] = useState<boolean>(false);
  const [shareOpen, setShareOpen] = useState<boolean>(false);

  // 1. Consulta en tiempo real a PostgreSQL
  const { data: dbProperty, isLoading: loadingProp } = trpc.properties.getById.useQuery(
    { id: numericPropertyId },
    { enabled: numericPropertyId > 0 }
  );

  // 2. Resolver token de referido si viene ?ref=...
  const { data: resolvedRef } = trpc.affiliates.resolveToken.useQuery(
    { token: refToken },
    { enabled: !!refToken }
  );

  // 3. Resolver perfil del agente si viene ?agentId=...
  const effectiveAgentId = agentIdParam || resolvedRef?.agent?.id;
  const { data: publicAgentProfile } = trpc.agent.getProfile.useQuery(
    { id: effectiveAgentId },
    { enabled: !!effectiveAgentId }
  );

  // 4. Si el usuario actual está logueado, traer su propia marca como fallback para modo "Mi Marca"
  const { data: myBrandProfile } = trpc.agent.getMyBrandConfig.useQuery(undefined, {
    retry: false,
  });

  const activeAgent = publicAgentProfile || resolvedRef?.agent || myBrandProfile;

  // Sincronizar colores y datos del agente cuando cargan de la BD
  useEffect(() => {
    if (activeAgent) {
      const theme = (activeAgent.themeConfig as any) || {};
      if (theme.primaryColor) setCustomPrimaryColor(theme.primaryColor);
      if (theme.secondaryColor) setCustomSecondaryColor(theme.secondaryColor);
      if (theme.templateStyle) setTemplateStyle(theme.templateStyle);
      setCustomAgencyName(theme.agencyName || activeAgent.name || 'Agencia Inmobiliaria Asociada');
      setCustomPhone(theme.contactPhone || (activeAgent as any).phone || '');
      setCustomEmail(theme.contactEmail || (activeAgent as any).email || '');
      if (activeAgent.customLogoUrl) setCustomLogo(activeAgent.customLogoUrl);
    }
  }, [activeAgent]);

  // Unificar propiedad de PostgreSQL con fallback estático legado
  const property: any = useMemo(() => {
    if (dbProperty) {
      const rawAm: any = dbProperty.amenities;
      let extList: string[] = [];
      let intList: string[] = [];
      if (Array.isArray(rawAm)) {
        extList = rawAm.filter(Boolean);
      } else if (rawAm && typeof rawAm === 'object') {
        if (Array.isArray(rawAm.caracteristicasExternas)) extList = rawAm.caracteristicasExternas.filter(Boolean);
        if (Array.isArray(rawAm.caracteristicasInternas)) intList = rawAm.caracteristicasInternas.filter(Boolean);
      }
      return {
        id: String(dbProperty.id),
        numericId: dbProperty.id,
        name: dbProperty.name,
        propertyType: (rawAm && rawAm.tipoExacto) || dbProperty.propertyType || 'Inmueble',
        transactionType: dbProperty.transactionType || 'venta',
        price: Number(dbProperty.price || 0),
        rentPrice: dbProperty.rentPrice ? Number(dbProperty.rentPrice) : null,
        area: Number(dbProperty.areaTotal || dbProperty.areaPrivate || 0),
        areaPrivate: Number(dbProperty.areaPrivate || dbProperty.areaTotal || 0),
        bedrooms: dbProperty.bedrooms,
        bathrooms: dbProperty.bathrooms,
        garages: dbProperty.garages,
        stratum: dbProperty.stratum,
        yearBuilt: dbProperty.yearBuilt,
        adminFee: dbProperty.adminFee ? Number(dbProperty.adminFee) : null,
        city: dbProperty.addressCity || dbProperty.city || 'Bogotá D.C.',
        zone: dbProperty.addressNeighborhood || dbProperty.zone || 'Zona Exclusiva',
        locality: dbProperty.addressLocality || dbProperty.zone || '',
        location: `${dbProperty.addressNeighborhood || dbProperty.zone || ''}, ${dbProperty.addressCity || dbProperty.city || 'Bogotá'}`,
        description: dbProperty.description || dbProperty.rawText || 'Propiedad seleccionada con excelentes especificaciones técnicas, iluminación natural y ubicación estratégica de alta valorización.',
        images: Array.isArray(dbProperty.images) && dbProperty.images.length > 0
          ? dbProperty.images
          : ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80'],
        amenities: extList,
        internalFeatures: intList,
        propertyDetails: rawAm && typeof rawAm === 'object' ? rawAm : {},
      };
    }
    const staticProp = rawPropertyId ? propertiesDatabase[rawPropertyId] : null;
    if (!staticProp) return null;
    return {
      ...staticProp,
      numericId: Number(rawPropertyId) || 0,
      city: 'Bogotá D.C.',
      zone: staticProp.location,
    };
  }, [dbProperty, rawPropertyId]);

  // 🤖 SENSOR ("BOT") DE SEGUIMIENTO VIRAL Y PUNTOS (Fase 2)
  const telemetryMutation = trpc.affiliates.trackTelemetryEvent.useMutation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!property?.numericId) return;
    const platform = detectTrafficPlatform();
    const fp = getVisitorFingerprint();

    // 1. Evento de Apertura de Ficha (+2 vPoints)
    telemetryMutation.mutate({
      token: refToken || undefined,
      agentId: effectiveAgentId,
      propertyId: property.numericId,
      eventType: searchParams.get('utm_source') === 'pdf_qr' ? 'qr_scan' : 'view',
      platform,
      brandMode,
      visitorFingerprint: fp,
    });

    // 2. Sensor de Lectura Calificada >15 segundos (+10 vPoints)
    const dwellTimer = setTimeout(() => {
      telemetryMutation.mutate({
        token: refToken || undefined,
        agentId: effectiveAgentId,
        propertyId: property.numericId,
        eventType: 'engaged_read',
        platform,
        brandMode,
        visitorFingerprint: fp,
      });
    }, 15000);

    return () => clearTimeout(dwellTimer);
  }, [property?.numericId, refToken, effectiveAgentId]);

  // 🌐 INYECCIÓN SEO & SCHEMA.ORG DINÁMICO (Respetando si es Con Marca o Marca Blanca Neutra)
  useEffect(() => {
    if (!property) return;
    const titlePrefix = brandMode === 'neutral'
      ? `Ficha Técnica Inmobiliaria — ${property.propertyType} en ${property.zone}`
      : brandMode === 'branded' && customAgencyName
        ? `${property.name} | ${customAgencyName}`
        : `${property.name} | Vecy Bienes Raíces`;
    document.title = titlePrefix;
  }, [property, brandMode, customAgencyName]);

  if (loadingProp) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
        <p className="text-xs uppercase tracking-widest text-zinc-400 font-bold">Generando Dossier Técnico en Tiempo Real...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center p-8">
          <h1 className="text-3xl font-bold mb-4">Propiedad No Encontrada</h1>
          <p className="text-zinc-400 text-sm mb-6">El inmueble solicitado no existe o no está disponible.</p>
          <a href="/ofertas" className="px-6 py-3 bg-amber-500 text-black font-bold rounded-xl text-xs uppercase tracking-wider">Volver a la Tienda</a>
        </div>
      </div>
    );
  }

  // Paleta dinámica según el modo seleccionado:
  // - 'neutral': 100% Neutro (Gris Carbón / Blanco Puro) — CERO colores de Vecy ni de terceros
  // - 'branded': Colores corporativos del agente/inmobiliaria (estilo Wasi)
  // - 'vecy': Dorado & Café Expreso Oficial Vecy
  const palette = useMemo(() => {
    if (brandMode === 'neutral') {
      return {
        primary: '#27272a',     // Zinc-800 neutro arquitectónico
        secondary: '#18181b',   // Zinc-900 neutro
        accentBg: '#f4f4f5',    // Zinc-100 gris claro editorial
        border: '#d4d4d8',      // Zinc-300
        badgeText: 'FICHA TÉCNICA — EDICIÓN NEUTRA CONFIDENCIAL (MARCA BLANCA)',
        headerBrand: 'DOSSIER TÉCNICO INMOBILIARIO',
        footerText: 'DOCUMENTO TÉCNICO INFORMATIVO — SIN MARCA COMERCIAL PARA USO DE BROKERS Y TERCEROS',
        showContact: false,
        showLogo: false,
      };
    }
    if (brandMode === 'branded') {
      return {
        primary: customPrimaryColor || '#0f4c81',
        secondary: customSecondaryColor || '#0f172a',
        accentBg: '#f8fafc',
        border: customPrimaryColor || '#0f4c81',
        badgeText: `${(customAgencyName || 'PORTAFOLIO EXCLUSIVO').toUpperCase()} — FICHA OFICIAL`,
        headerBrand: customAgencyName || 'Portafolio Inmobiliario',
        footerText: `${customAgencyName || 'Agencia Asociada'} ${customPhone ? `• WhatsApp: ${customPhone}` : ''} ${customEmail ? `• ${customEmail}` : ''}`,
        showContact: true,
        showLogo: true,
      };
    }
    return {
      primary: '#d4af37',
      secondary: '#3e2723',
      accentBg: '#fdfbf0',
      border: '#d4af37',
      badgeText: 'VECY BIENES RAÍCES — PORTAFOLIO AUDITADO',
      headerBrand: 'VECY BIENES RAÍCES',
      footerText: 'VECY BIENES RAÍCES • ATENCIÓN COMERCIAL: +57 316 656 9719 • VECY.CO',
      showContact: true,
      showLogo: true,
    };
  }, [brandMode, customPrimaryColor, customSecondaryColor, customAgencyName, customPhone, customEmail]);

  const type = String(property.propertyType || '').toLowerCase();

  const getDynamicSpecs = () => {
    const specs: Array<{ label: string; value: any; icon: React.ReactNode }> = [];
    const details = property.propertyDetails || {};

    if (property.area) {
      specs.push({ label: "Área Total", value: `${property.area} m²`, icon: <Ruler className="w-4 h-4"/> });
    }
    if (property.areaPrivate && property.areaPrivate !== property.area) {
      specs.push({ label: "Área Privada", value: `${property.areaPrivate} m²`, icon: <Ruler className="w-4 h-4"/> });
    }

    if (property.bedrooms !== undefined && property.bedrooms !== null) {
      specs.push({ label: "Habitaciones / Espacios", value: property.bedrooms, icon: <Bed className="w-4 h-4"/> });
    }
    if (property.bathrooms !== undefined && property.bathrooms !== null) {
      specs.push({ label: "Baños", value: property.bathrooms, icon: <Bath className="w-4 h-4"/> });
    }
    if (property.garages !== undefined && property.garages !== null) {
      specs.push({ label: "Parqueaderos", value: property.garages, icon: <Car className="w-4 h-4"/> });
    }
    if (property.stratum || details.estrato) {
      specs.push({ label: "Estrato", value: property.stratum || details.estrato, icon: <Star className="w-4 h-4"/> });
    }
    if (property.yearBuilt) {
      specs.push({ label: "Año Construcción", value: property.yearBuilt, icon: <Building className="w-4 h-4"/> });
    }

    if (type.includes('bodega') || type.includes('warehouse')) {
      if (details.height) specs.push({ label: "Altura Libre", value: details.height, icon: <Layers className="w-4 h-4"/> });
      if (details.power) specs.push({ label: "Capacidad KVA", value: details.power, icon: <Zap className="w-4 h-4"/> });
      if (details.docks) specs.push({ label: "Muelles", value: details.docks, icon: <Truck className="w-4 h-4"/> });
      if (details.officeArea) specs.push({ label: "Área Oficina", value: details.officeArea, icon: <Briefcase className="w-4 h-4"/> });
    } else if (type.includes('edificio') || type.includes('building')) {
      if (details.units) specs.push({ label: "Unidades", value: details.units, icon: <Home className="w-4 h-4"/> });
      if (details.floors || details.pisoEdificio) specs.push({ label: "Pisos", value: details.floors || details.pisoEdificio, icon: <Layers className="w-4 h-4"/> });
    } else if (type.includes('finca') || type.includes('farm')) {
      if (details.water) specs.push({ label: "Agua", value: details.water, icon: <Droplets className="w-4 h-4"/> });
      if (details.topography) specs.push({ label: "Topografía", value: details.topography, icon: <Map className="w-4 h-4"/> });
      if (details.climate) specs.push({ label: "Clima", value: details.climate, icon: <Trees className="w-4 h-4"/> });
    } else if (type.includes('lote') || type.includes('terreno') || type.includes('land')) {
      if (details.usage) specs.push({ label: "Uso de Suelo", value: details.usage, icon: <Construction className="w-4 h-4"/> });
      if (details.services) specs.push({ label: "Servicios", value: details.services, icon: <Zap className="w-4 h-4"/> });
    }

    const adminVal = property.adminFee || details.administrationFee;
    if (adminVal) {
      specs.push({ label: "Administración", value: `$${Number(adminVal).toLocaleString('es-CO')} COP`, icon: <Zap className="w-4 h-4" /> });
    }

    return specs;
  };

  // Construir URL rastreada para compartir y para el QR incrustado en el PDF
  const trackedFichaUrl = useMemo(() => {
    const u = new URL(window.location.href);
    u.searchParams.set('mode', brandMode);
    if (effectiveAgentId && brandMode === 'branded') {
      u.searchParams.set('agentId', String(effectiveAgentId));
    } else if (brandMode === 'neutral') {
      u.searchParams.delete('agentId');
    }
    if (refToken) {
      u.searchParams.set('ref', refToken);
    }
    return u.toString();
  }, [brandMode, effectiveAgentId, refToken]);

  const qrDestinationUrl = useMemo(() => {
    const u = new URL(trackedFichaUrl);
    u.searchParams.set('utm_source', 'pdf_qr');
    return u.toString();
  }, [trackedFichaUrl]);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=4&data=${encodeURIComponent(qrDestinationUrl)}`;

  const handlePrint = () => {
    if (property?.numericId) {
      telemetryMutation.mutate({
        token: refToken || undefined,
        agentId: effectiveAgentId,
        propertyId: property.numericId,
        eventType: 'pdf_download',
        platform: detectTrafficPlatform(),
        brandMode,
        visitorFingerprint: getVisitorFingerprint(),
      });
    }
    window.print();
  };

  const specs = getDynamicSpecs();
  const refCode = `REF-${String(property.zone || 'BOG').substring(0, 3).toUpperCase()}-${String(property.id).padStart(3, '0')}`;

  return (
    <div
      className="min-h-screen font-['Outfit',sans-serif] antialiased transition-colors duration-300"
      style={{
        background: brandMode === 'neutral'
          ? 'linear-gradient(180deg, #18181b 0%, #09090b 100%)'
          : `radial-gradient(ellipse at center, ${palette.primary}33 0%, ${palette.secondary} 100%)`,
        backgroundAttachment: 'fixed',
      }}
    >
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* BARRA SUPERIOR DE CONTROL (OCULTA AL IMPRIMIR / DESCARGAR PDF)    */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="max-w-[210mm] mx-auto pt-5 px-4 space-y-3 print:hidden">
        <div className="bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>

          {/* Selector de los 3 Modos de Ficha Técnica */}
          <div className="flex flex-wrap items-center gap-1.5 bg-black/60 p-1.5 rounded-xl border border-white/10">
            <button
              onClick={() => setBrandMode('branded')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                brandMode === 'branded'
                  ? 'bg-sky-600 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Descargar con el Logo, Colores y Contacto de tu Agencia"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Mi Marca (Estilo Wasi)</span>
            </button>

            <button
              onClick={() => setBrandMode('neutral')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                brandMode === 'neutral'
                  ? 'bg-zinc-100 text-zinc-900 shadow-lg'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="100% Sin Marca, Sin Logos, Sin Contactos y con Colores Neutros para enviar a terceros"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Marca Blanca Neutra (Cero Rastro)</span>
            </button>

            <button
              onClick={() => setBrandMode('vecy')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                brandMode === 'vecy'
                  ? 'bg-amber-500 text-black shadow-lg'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Oficial Vecy</span>
            </button>
          </div>

          {/* Acciones: Personalizar, Compartir con Sensor y Descargar PDF */}
          <div className="flex items-center gap-2">
            {brandMode === 'branded' && (
              <button
                onClick={() => setShowCustomizer(!showCustomizer)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-sky-400 border border-sky-500/30 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                <Palette className="w-4 h-4" />
                <span>Editar Marca/Colores</span>
              </button>
            )}

            <button
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>Compartir Link</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-black rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" /> Descargar PDF
            </button>
          </div>
        </div>

        {/* Panel Desplegable de Personalización Instantánea de Marca y Plantilla (Estilo Wasi) */}
        {brandMode === 'branded' && showCustomizer && (
          <div className="bg-zinc-900/95 border border-sky-500/30 rounded-2xl p-5 text-white shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-sky-400">
                  Personalizador Instantáneo de Plantilla, Colores y Marca (Estilo Wasi)
                </h3>
              </div>
              <a
                href="/agent-dashboard"
                className="text-[11px] text-amber-400 hover:underline font-bold"
              >
                Guardar permanentemente en Mi Dashboard →
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Plantilla de Brochure</label>
                <select
                  value={templateStyle}
                  onChange={(e) => setTemplateStyle(e.target.value as TemplateStyle)}
                  className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-white font-semibold"
                >
                  <option value="wasi-classic">Ejecutiva Corporativa (Wasi)</option>
                  <option value="luxury-editorial">Luxury Editorial Magazine</option>
                  <option value="modern-minimal">Minimalista Arquitectónica</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Color Primario Marca</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customPrimaryColor}
                    onChange={(e) => setCustomPrimaryColor(e.target.value)}
                    className="w-10 h-9 rounded cursor-pointer bg-transparent border border-white/20"
                  />
                  <input
                    type="text"
                    value={customPrimaryColor}
                    onChange={(e) => setCustomPrimaryColor(e.target.value)}
                    className="flex-1 bg-black border border-white/15 rounded-lg px-2.5 py-2 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Color Secundario / Textos</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customSecondaryColor}
                    onChange={(e) => setCustomSecondaryColor(e.target.value)}
                    className="w-10 h-9 rounded cursor-pointer bg-transparent border border-white/20"
                  />
                  <input
                    type="text"
                    value={customSecondaryColor}
                    onChange={(e) => setCustomSecondaryColor(e.target.value)}
                    className="flex-1 bg-black border border-white/15 rounded-lg px-2.5 py-2 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Nombre de tu Agencia / Agente</label>
                <input
                  type="text"
                  placeholder="Ej: Inmobiliaria Alfa SAS"
                  value={customAgencyName}
                  onChange={(e) => setCustomAgencyName(e.target.value)}
                  className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">WhatsApp / Teléfono de Contacto</label>
                <input
                  type="text"
                  placeholder="+57 300 000 0000"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Correo Comercial</label>
                <input
                  type="email"
                  placeholder="contacto@tuagencia.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">URL de tu Logo (PNG/JPG Transparente)</label>
                <input
                  type="url"
                  placeholder="https://.../mi-logo.png"
                  value={customLogo}
                  onChange={(e) => setCustomLogo(e.target.value)}
                  className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Aviso informativo del sensor activo */}
        <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-xl px-4 py-2 flex items-center justify-between text-[11px] text-emerald-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {brandMode === 'neutral'
                ? 'Modo Marca Blanca Neutra Activo: Sin logos, sin datos de contacto y sin colores corporativos. Incluye QR rastreable silencioso para proteger tus puntos.'
                : `Modo Con Marca Activo (${palette.headerBrand}): Incluye tu identidad visual, tus datos de contacto y sensor de atribución de puntos vPoints.`}
            </span>
          </div>
          <span className="font-mono text-[10px] text-emerald-400 hidden sm:inline">Sensor IA Activo ✓</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* LIENZO DE IMPRESIÓN A4 (PÁGINAS DEL BROCHURE / DOSSIER TÉCNICO)    */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div id="export-container" className="max-w-[210mm] mx-auto space-y-8 py-6 pb-20 print:space-y-0 print:py-0 print:pb-0">
        
        {/* ──────────────────────────────────────────────────────────────── */}
        {/* PÁGINA 1: PORTADA EJECUTIVA DINÁMICA                             */}
        {/* ──────────────────────────────────────────────────────────────── */}
        <div className="bg-white w-[210mm] min-h-[295mm] p-[18mm] flex flex-col justify-between shadow-2xl rounded-sm mx-auto print:shadow-none print:rounded-none print:m-0 print:h-[296mm] print:page-break-after-always">
          
          {/* Header Portada */}
          <div className="flex items-center justify-between border-b-2 pb-4" style={{ borderColor: palette.primary }}>
            <div>
              <span className="text-[10px] font-black tracking-[3px] uppercase block" style={{ color: palette.primary }}>
                {palette.badgeText}
              </span>
              <span className="text-xs font-bold text-zinc-500 font-mono">
                {refCode} • {property.transactionType.toUpperCase().replace(/_/g, ' ')}
              </span>
            </div>

            {palette.showLogo && (
              <div className="flex items-center gap-3">
                {customLogo && brandMode === 'branded' ? (
                  <img src={customLogo} alt={palette.headerBrand} className="h-12 max-w-[160px] object-contain" />
                ) : (
                  <div
                    className="px-4 py-2 rounded-lg font-black text-sm tracking-widest uppercase text-white"
                    style={{ backgroundColor: palette.secondary, borderBottom: `3px solid ${palette.primary}` }}
                  >
                    {palette.headerBrand}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cuerpo Central Portada */}
          <div className="my-auto py-4 space-y-6">
            <div className="space-y-2 text-center">
              <span
                className="inline-block px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-[3px] text-white"
                style={{ backgroundColor: palette.primary }}
              >
                {property.propertyType} EN {property.transactionType.toUpperCase().replace(/_/g, ' ')}
              </span>
              <h1
                className="text-3xl font-black uppercase tracking-tight leading-tight pt-1"
                style={{ color: palette.secondary }}
              >
                {property.name}
              </h1>
              <p className="text-sm font-semibold text-zinc-500 uppercase tracking-[3px]">
                {property.zone} — {property.city}
              </p>
            </div>

            {/* Imagen Principal */}
            <div
              className="w-full h-[460px] rounded-2xl overflow-hidden shadow-lg relative border-2"
              style={{ borderColor: palette.primary }}
            >
              <img
                src={property.images[0]}
                alt={property.name}
                className="w-full h-full object-cover"
              />
              {/* Cinta de Precio en Portada */}
              <div
                className="absolute bottom-4 right-4 px-6 py-3 rounded-xl shadow-2xl text-right"
                style={{ backgroundColor: palette.secondary, color: '#ffffff', borderLeft: `5px solid ${palette.primary}` }}
              >
                <span className="text-[10px] uppercase tracking-widest text-zinc-300 block font-bold">Valor Comercial</span>
                <span className="text-2xl font-black tracking-tight">
                  ${Number(property.price).toLocaleString('es-CO')} COP
                </span>
              </div>
            </div>

            {/* Cinta Resumen de Iconos Clave en Portada */}
            <div
              className="grid grid-cols-4 gap-4 p-4 rounded-xl border"
              style={{ backgroundColor: palette.accentBg, borderColor: `${palette.primary}40` }}
            >
              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Área Total</span>
                <strong className="text-base font-black" style={{ color: palette.secondary }}>{property.area || 'N/A'} m²</strong>
              </div>
              <div className="text-center border-l border-zinc-200">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Habitaciones</span>
                <strong className="text-base font-black" style={{ color: palette.secondary }}>{property.bedrooms ?? 'N/A'}</strong>
              </div>
              <div className="text-center border-l border-zinc-200">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Baños</span>
                <strong className="text-base font-black" style={{ color: palette.secondary }}>{property.bathrooms ?? 'N/A'}</strong>
              </div>
              <div className="text-center border-l border-zinc-200">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Garajes</span>
                <strong className="text-base font-black" style={{ color: palette.secondary }}>{property.garages ?? '0'}</strong>
              </div>
            </div>
          </div>

          {/* Footer Portada */}
          <div className="border-t pt-3 flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-wider" style={{ borderColor: '#e4e4e7' }}>
            <span>{palette.footerText}</span>
            <span>PÁGINA 01 / 03</span>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* PÁGINA 2: DESCRIPCIÓN, FICHA TÉCNICA Y CARACTERÍSTICAS           */}
        {/* ──────────────────────────────────────────────────────────────── */}
        <div className="bg-white w-[210mm] min-h-[295mm] p-[18mm] flex flex-col justify-between shadow-2xl rounded-sm mx-auto print:shadow-none print:rounded-none print:m-0 print:h-[296mm] print:page-break-after-always">
          <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: palette.primary }}>
            <span className="text-[10px] font-extrabold uppercase tracking-[3px]" style={{ color: palette.primary }}>
              ESPECIFICACIONES TÉCNICAS Y DISTRIBUCIÓN
            </span>
            <span className="text-[10px] font-mono font-bold text-zinc-400">{refCode}</span>
          </div>

          <div className="my-auto py-6 space-y-8">
            {/* Descripción y Tabla Técnica */}
            <div className="grid grid-cols-12 gap-6 items-start">
              <div className="col-span-7 space-y-3">
                <h2
                  className="text-base font-extrabold uppercase tracking-wider border-b-2 pb-1.5"
                  style={{ color: palette.secondary, borderColor: palette.primary }}
                >
                  1. Descripción Ejecutiva del Activo
                </h2>
                <div
                  className="p-5 rounded-xl border text-xs leading-[1.75] text-justify text-zinc-700 whitespace-pre-line"
                  style={{ backgroundColor: palette.accentBg, borderColor: '#e4e4e7' }}
                >
                  {property.description}
                </div>
              </div>

              <div className="col-span-5 space-y-3">
                <h2
                  className="text-base font-extrabold uppercase tracking-wider border-b-2 pb-1.5"
                  style={{ color: palette.secondary, borderColor: palette.primary }}
                >
                  2. Cuadro Técnico
                </h2>
                <ul className="space-y-2">
                  {specs.map((s, i) => (
                    <li key={i} className="flex justify-between items-center border-b border-zinc-100 pb-1.5 text-xs">
                      <span className="flex items-center gap-2 text-zinc-500 font-medium">
                        <span style={{ color: palette.primary }}>{s.icon}</span> {s.label}
                      </span>
                      <strong className="font-bold" style={{ color: palette.secondary }}>{s.value}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Características Internas y Externas */}
            <div className="grid grid-cols-2 gap-6 pt-2">
              <div>
                <h2
                  className="text-base font-extrabold uppercase tracking-wider border-b-2 pb-1.5 mb-3"
                  style={{ color: palette.secondary, borderColor: palette.primary }}
                >
                  3. Características Internas
                </h2>
                {property.internalFeatures && property.internalFeatures.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {property.internalFeatures.slice(0, 14).map((feat: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-1.5 text-xs text-zinc-700 border-b border-zinc-100 pb-1">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: palette.primary }} />
                        <span className="truncate">{feat}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic">Distribución arquitectónica moderna de excelente iluminación y ventilación natural.</p>
                )}
              </div>

              <div>
                <h2
                  className="text-base font-extrabold uppercase tracking-wider border-b-2 pb-1.5 mb-3"
                  style={{ color: palette.secondary, borderColor: palette.primary }}
                >
                  4. Amenidades y Entorno
                </h2>
                {property.amenities && property.amenities.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {property.amenities.slice(0, 14).map((item: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-1.5 text-xs text-zinc-700 border-b border-zinc-100 pb-1">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: palette.primary }} />
                        <span className="truncate">{item}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic">Ubicación privilegiada con acceso inmediato a vías principales, comercio y servicios.</p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t pt-3 flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-wider" style={{ borderColor: '#e4e4e7' }}>
            <span>{palette.footerText}</span>
            <span>PÁGINA 02 / 03</span>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* PÁGINA 3: GALERÍA VISUAL & QR DE ATRIBUCIÓN / CONTACTO           */}
        {/* ──────────────────────────────────────────────────────────────── */}
        <div className="bg-white w-[210mm] min-h-[295mm] p-[18mm] flex flex-col justify-between shadow-2xl rounded-sm mx-auto print:shadow-none print:rounded-none print:m-0 print:h-[296mm]">
          <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: palette.primary }}>
            <span className="text-[10px] font-extrabold uppercase tracking-[3px]" style={{ color: palette.primary }}>
              GALERÍA FOTOGRÁFICA Y REGISTRO DE INTERÉS
            </span>
            <span className="text-[10px] font-mono font-bold text-zinc-400">{refCode}</span>
          </div>

          <div className="my-auto py-4 space-y-6">
            <div className="grid grid-cols-2 grid-rows-2 gap-4 h-[480px]">
              {(property.images.slice(1, 5).length > 0 ? property.images.slice(1, 5) : property.images.slice(0, 4)).map((img: string, idx: number) => (
                <div key={idx} className="w-full h-full rounded-xl overflow-hidden border border-zinc-200 shadow-sm">
                  <img src={img} alt={`Vista ${idx + 2}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>

            {/* Bloque Inferior de Cierre: Con Contacto de Agencia (Branded/Vecy) O Bloque Neutro con QR de Verificación */}
            <div
              className="p-5 rounded-2xl border-2 flex items-center justify-between gap-6"
              style={{ backgroundColor: palette.accentBg, borderColor: palette.primary }}
            >
              <div className="space-y-1.5 flex-1">
                <span
                  className="text-[10px] font-black uppercase tracking-[2px] block"
                  style={{ color: palette.primary }}
                >
                  {brandMode === 'neutral'
                    ? 'FICHA DIGITAL INTERACTIVA VERIFICADA'
                    : `ATENCIÓN COMERCIAL DIRECTA — ${palette.headerBrand}`}
                </span>
                <h3 className="text-lg font-black" style={{ color: palette.secondary }}>
                  {brandMode === 'neutral'
                    ? '¿Desea programar una visita oficial a este inmueble?'
                    : `Agenda tu visita guiada con ${palette.headerBrand}`}
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  {brandMode === 'neutral'
                    ? 'Solicite la programación de visita y el expediente completo directamente con el asesor inmobiliario que le compartió este dossier técnico o escanee el código QR de validación.'
                    : 'Escanee el código QR desde su celular para abrir la galería interactiva en alta definición o contáctenos directamente a nuestras líneas oficiales.'}
                </p>

                {palette.showContact && (
                  <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-bold" style={{ color: palette.secondary }}>
                    {(customPhone || brandMode === 'vecy') && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" style={{ color: palette.primary }} />
                        {brandMode === 'vecy' ? '+57 316 656 9719' : customPhone}
                      </span>
                    )}
                    {(customEmail || brandMode === 'vecy') && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" style={{ color: palette.primary }} />
                        {brandMode === 'vecy' ? 'comercial@vecy.co' : customEmail}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* QR Sensor de Atribución Viral (Funciona incluso en PDF impreso o reenviado por WhatsApp) */}
              <div className="flex flex-col items-center bg-white p-2.5 rounded-xl border border-zinc-200 shrink-0 shadow-sm">
                <img src={qrImageUrl} alt="QR Verificación" className="w-24 h-24 object-contain" />
                <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-wider mt-1">
                  {refCode}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t pt-3 flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-wider" style={{ borderColor: '#e4e4e7' }}>
            <span>{palette.footerText}</span>
            <span>PÁGINA 03 / 03</span>
          </div>
        </div>
      </div>

      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        modalTitle={brandMode === 'neutral' ? 'Compartir Ficha Marca Blanca (Con Sensor)' : 'Compartir Ficha Con Mi Marca'}
        url={trackedFichaUrl}
        text={
          brandMode === 'neutral'
            ? `Ficha Técnica Confidencial: ${property.propertyType} en ${property.zone} (${property.area} m²)`
            : `Mira la Ficha Técnica de ${property.name} presentada por ${palette.headerBrand}`
        }
      />

      <style>{`
        @media print {
          body { background: white !important; padding: 0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print\\:hidden { display: none !important; }
          #export-container { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
}
