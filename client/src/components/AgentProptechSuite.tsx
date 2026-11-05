import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  Sparkles, Search, TrendingUp, Wand2, FileSignature, CheckCircle2,
  Share2, ExternalLink, FileText, MapPin, Bed, Bath, Ruler, ShieldCheck,
  ArrowRight, SlidersHorizontal, Download, Building2, DollarSign, Layers
} from 'lucide-react';
import { toast } from 'sonner';

interface AgentProptechSuiteProps {
  agentUserId?: number;
  agencyName?: string;
  customLogoUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  contactPhone?: string;
  activeTools?: {
    qradorSmartSearch?: { enabled?: boolean; allowCollaborativeNetwork?: boolean };
    instantValuator?: { enabled?: boolean; captureOwnerLeads?: boolean };
    virtualStaging?: { enabled?: boolean; defaultStyle?: string };
    contractGenerator?: { enabled?: boolean; includeDigitalSeal?: boolean };
  };
  isDashboardPreview?: boolean;
}

export default function AgentProptechSuite({
  agentUserId,
  agencyName = 'Agencia Asociada Vecy',
  customLogoUrl,
  primaryColor = '#AE9A66',
  secondaryColor = '#3C2F2F',
  contactPhone = '+57 316 656 9719',
  activeTools,
  isDashboardPreview = false,
}: AgentProptechSuiteProps) {
  const showQrador = isDashboardPreview || activeTools?.qradorSmartSearch?.enabled !== false;
  const showValuator = isDashboardPreview || activeTools?.instantValuator?.enabled !== false;
  const showStaging = isDashboardPreview || activeTools?.virtualStaging?.enabled !== false;
  const showContracts = isDashboardPreview || activeTools?.contractGenerator?.enabled !== false;

  const [activeTab, setActiveTab] = useState<'qrador' | 'valuator' | 'staging' | 'contracts'>('qrador');

  // ── 1. Estado Buscador Semántico & Curador IA (Estilo Qrador) ──
  const [searchQuery, setSearchQuery] = useState(
    'Busco apartamento iluminado de 3 alcobas hasta 850 millones o que reciba permuta'
  );
  const curatorMutation = trpc.agent.semanticCuratorSearch.useMutation();

  const handleRunCurator = (customQ?: string) => {
    const q = customQ || searchQuery;
    if (customQ) setSearchQuery(customQ);
    curatorMutation.mutate({
      query: q,
      agentUserId,
      includeNetwork: activeTools?.qradorSmartSearch?.allowCollaborativeNetwork !== false,
    });
  };

  // ── 2. Estado Avalúo Instantáneo ACM (Estilo Habi / Casacol) ──
  const [valCity, setValCity] = useState('Bogotá');
  const [valZone, setValZone] = useState('Cedritos / Usaquén');
  const [valType, setValType] = useState('Apartamento');
  const [valArea, setValArea] = useState(95);
  const [valBeds, setValBeds] = useState(3);
  const [valBaths, setValBaths] = useState(2);
  const [valGarages, setValGarages] = useState(2);
  const [valEstrato, setValEstrato] = useState(4);
  const [valAge, setValAge] = useState(8);
  const [valCondition, setValCondition] = useState<'excelente' | 'bueno' | 'remodelar'>('bueno');
  const [ownerName, setOwnerName] = useState('');
  const [ownerWhatsapp, setOwnerWhatsapp] = useState('');

  const valuationMutation = trpc.agent.calculateInstantValuation.useMutation({
    onSuccess: () => {
      toast.success('Avalúo ACM Instantáneo calculado con éxito');
    },
  });

  // ── 3. Estado Home Staging Virtual IA (Estilo Matterport / Giraffe360 / Qrador Photo AI) ──
  const [stagingStyle, setStagingStyle] = useState(
    activeTools?.virtualStaging?.defaultStyle || 'modern-scandinavian'
  );
  const [stagingRoom, setStagingRoom] = useState<
    'sala_comedor' | 'alcoba_principal' | 'cocina_abierta' | 'oficina_estudio' | 'terraza_lounge'
  >('sala_comedor');
  const [stagingArea, setStagingArea] = useState(38);
  const [sliderPos, setSliderPos] = useState(55);

  const stagingMutation = trpc.agent.generateVirtualStagingPlan.useMutation();

  const currentStagingData = stagingMutation.data?.style || {
    id: 'modern-scandinavian',
    name: 'Escandinavo Moderno & Cálido',
    tagline: 'Madera roble claro, lino crudo e iluminación cálida 3000K para apartamentos familiares',
    valueBoostPct: 14,
    speedBoostPct: 38,
    beforeImage:
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    afterImage:
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
    materials: ['Piso SPC Roble Nórdico', 'Pintura Blanco Hueso Mate', 'Textiles en Lino Natural y Bouclé'],
    furnitureSpec: [
      'Sofá modular en L tono marfil',
      'Mesa de centro orgánica en roble',
      'Alfombra tejida de pelo corto',
      'Plantas Ficus Lyrata y Olivo interior',
    ],
    lightingSpec:
      'Luz indirecta cálida 3000K en cortineros + lámpara de pie minimalista en bronce cepillado',
  };

  const handleSelectStagingStyle = (styleId: string) => {
    setStagingStyle(styleId);
    stagingMutation.mutate({
      styleId,
      roomType: stagingRoom,
      areaM2: stagingArea,
    });
  };

  // ── 4. Estado Generador de Contratos Ley 527 (Estilo DocuSign / Autentic) ──
  const [contractType, setContractType] = useState<
    'arrendamiento_vivienda' | 'promesa_compraventa' | 'mandato_consignacion' | 'presentacion_cliente'
  >('arrendamiento_vivienda');
  const [partyAName, setPartyAName] = useState('Carlos Alberto Mendoza');
  const [partyADoc, setPartyADoc] = useState('79.845.120');
  const [partyBName, setPartyBName] = useState('Laura Sofía Restrepo');
  const [partyBDoc, setPartyBDoc] = useState('1.020.764.319');
  const [contractAddress, setContractAddress] = useState('Calle 140 # 11-45 Apto 602, Cedritos');
  const [contractMatricula, setContractMatricula] = useState('50N-20481920');
  const [contractValue, setContractValue] = useState(3800000);
  const [contractExtra, setContractExtra] = useState(
    'Incluye dos (2) parqueaderos independientes cubiertos y un (1) depósito.'
  );

  const contractMutation = trpc.agent.generateBrandedLegalContract.useMutation({
    onSuccess: () => {
      toast.success('Contrato blindado con Sello SHA-256 (Ley 527) generado');
    },
  });

  const formatCop = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);

  if (!showQrador && !showValuator && !showStaging && !showContracts) return null;

  return (
    <div className="bg-[#121215] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
      {/* Cabecera de la Suite Proptech */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3.5">
          {customLogoUrl ? (
            <img
              src={customLogoUrl}
              alt={agencyName}
              className="h-11 w-auto object-contain bg-white/5 p-1.5 rounded-xl border border-white/10"
            />
          ) : (
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: `${primaryColor}20`, border: `1px solid ${primaryColor}50` }}
            >
              <Sparkles className="w-5 h-5" style={{ color: primaryColor }} />
            </div>
          )}
          <div>
            <span
              className="text-[10px] font-mono uppercase tracking-[0.22em] block font-bold"
              style={{ color: primaryColor }}
            >
              SUITE PROPTECH IA • {agencyName.toUpperCase()}
            </span>
            <h3 className="text-xl md:text-2xl font-black text-white">
              Centro Inteligente de Búsqueda, Avalúos, Staging & Contratos
            </h3>
          </div>
        </div>

        {/* Navegador de las 4 Herramientas */}
        <div className="flex flex-wrap gap-2">
          {showQrador && (
            <button
              type="button"
              onClick={() => setActiveTab('qrador')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${
                activeTab === 'qrador'
                  ? 'text-black shadow-lg'
                  : 'bg-white/5 text-white/70 border-white/10 hover:text-white'
              }`}
              style={
                activeTab === 'qrador'
                  ? { backgroundColor: primaryColor, borderColor: primaryColor }
                  : undefined
              }
            >
              <Search className="w-3.5 h-3.5" />
              Curador IA (Estilo Qrador)
            </button>
          )}
          {showValuator && (
            <button
              type="button"
              onClick={() => setActiveTab('valuator')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${
                activeTab === 'valuator'
                  ? 'text-black shadow-lg'
                  : 'bg-white/5 text-white/70 border-white/10 hover:text-white'
              }`}
              style={
                activeTab === 'valuator'
                  ? { backgroundColor: primaryColor, borderColor: primaryColor }
                  : undefined
              }
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Avalúo ACM Instantáneo
            </button>
          )}
          {showStaging && (
            <button
              type="button"
              onClick={() => setActiveTab('staging')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${
                activeTab === 'staging'
                  ? 'text-black shadow-lg'
                  : 'bg-white/5 text-white/70 border-white/10 hover:text-white'
              }`}
              style={
                activeTab === 'staging'
                  ? { backgroundColor: primaryColor, borderColor: primaryColor }
                  : undefined
              }
            >
              <Wand2 className="w-3.5 h-3.5" />
              Home Staging IA
            </button>
          )}
          {showContracts && (
            <button
              type="button"
              onClick={() => setActiveTab('contracts')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${
                activeTab === 'contracts'
                  ? 'text-black shadow-lg'
                  : 'bg-white/5 text-white/70 border-white/10 hover:text-white'
              }`}
              style={
                activeTab === 'contracts'
                  ? { backgroundColor: primaryColor, borderColor: primaryColor }
                  : undefined
              }
            >
              <FileSignature className="w-3.5 h-3.5" />
              Contratos Digitales Ley 527
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          HERRAMIENTA 1: CURADOR DE INMUEBLES & BUSCADOR SEMÁNTICO IA (ESTILO QRADOR)
      ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'qrador' && (
        <div className="space-y-6">
          <div className="bg-black/40 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4" style={{ color: primaryColor }} />
                  Buscador Conversacional & Curador de Colecciones IA
                </h4>
                <p className="text-xs text-white/60">
                  Describe con tus propias palabras qué busca tu cliente; nuestra IA filtra, puntúa la afinidad (85%-99%) y arma una colección lista para compartir con sensor de puntos.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Tecnología Semántica Activa
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRunCurator()}
                placeholder="Ej: Apartamento de 3 alcobas en Chicó o Cedritos hasta 900 millones con balcón..."
                className="flex-1 bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleRunCurator()}
                disabled={curatorMutation.isPending}
                className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider text-black flex items-center justify-center gap-2 shadow-lg transition-all hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                <Search className="w-4 h-4" />
                {curatorMutation.isPending ? 'Curando Selección...' : 'Curar con IA'}
              </button>
            </div>

            {/* Chips de búsqueda rápida */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                'Apartamento 3 alcobas hasta 850 millones con balcón',
                'Casa amplia o que reciba permuta en parte de pago',
                'Inmueble para inversión o arriendo ejecutivo',
                'Apartaestudio moderno para renta corta',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleRunCurator(chip)}
                  className="text-[11px] bg-white/5 hover:bg-white/10 text-white/75 border border-white/10 px-3 py-1.5 rounded-full transition-all"
                >
                  “{chip}”
                </button>
              ))}
            </div>
          </div>

          {/* Resultados de la Colección Curada */}
          {curatorMutation.data && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/80">
                  <span className="font-mono font-bold text-emerald-400">
                    COLECCIÓN #{curatorMutation.data.collectionCode}
                  </span>
                  <span>•</span>
                  <span>{curatorMutation.data.totalMatched} inmuebles curados con alta afinidad</span>
                  {curatorMutation.data.parsedFilters.propertyType && (
                    <span className="px-2 py-0.5 rounded bg-white/10 text-[11px]">
                      Tipo: {curatorMutation.data.parsedFilters.propertyType}
                    </span>
                  )}
                  {curatorMutation.data.parsedFilters.maxBudgetCop && (
                    <span className="px-2 py-0.5 rounded bg-white/10 text-[11px]">
                      Tope: {formatCop(curatorMutation.data.parsedFilters.maxBudgetCop)}
                    </span>
                  )}
                  {curatorMutation.data.parsedFilters.bedrooms && (
                    <span className="px-2 py-0.5 rounded bg-white/10 text-[11px]">
                      {curatorMutation.data.parsedFilters.bedrooms} Alcobas
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const topNames = curatorMutation.data?.curatedProperties
                      .slice(0, 3)
                      .map((c: any) => `• ${c.property.name} (${c.affinityScore}% Match IA)`)
                      .join('\n');
                    const shareText = `✨ *Colección Inmobiliaria Curada por IA (${agencyName})*\nCódigo: ${curatorMutation.data?.collectionCode}\n\nHe seleccionado estas opciones ideales para tu búsqueda:\n${topNames}\n\n📲 Mira las fichas interactivas aquí: ${window.location.href}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-500/30"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Compartir Colección por WhatsApp
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {curatorMutation.data.curatedProperties.map((item: any) => {
                  const p = item.property;
                  return (
                    <div
                      key={p.id}
                      className="bg-black/50 border border-white/10 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-white/25 transition-all"
                    >
                      <div>
                        <div className="relative h-44 bg-zinc-900">
                          <img
                            src={
                              p.imageUrl ||
                              'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'
                            }
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                          <div
                            className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[10px] font-black text-black shadow-lg"
                            style={{ backgroundColor: primaryColor }}
                          >
                            {item.affinityScore}% AFINIDAD IA
                          </div>
                        </div>

                        <div className="p-4 space-y-2">
                          <div className="text-[11px] text-white/50 flex items-center gap-1">
                            <MapPin className="w-3 h-3" style={{ color: primaryColor }} />
                            {p.zone || p.location}
                          </div>
                          <h5 className="text-sm font-bold text-white line-clamp-1">{p.name}</h5>
                          <div className="text-base font-black" style={{ color: primaryColor }}>
                            {formatCop(p.price || 0)}
                          </div>
                          <p className="text-[11px] text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1.5">
                            ✓ {item.curatorReason}
                          </p>
                        </div>
                      </div>

                      <div className="px-4 pb-4 pt-2 flex items-center gap-2 border-t border-white/5">
                        <a
                          href={`/ficha/${p.id}?mode=branded${agentUserId ? `&agent=${agentUserId}` : ''}`}
                          className="flex-1 py-2 rounded-lg text-[11px] font-bold text-center text-black"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Ficha Con Marca
                        </a>
                        <a
                          href={`/ficha/${p.id}?mode=neutral${agentUserId ? `&agent=${agentUserId}` : ''}`}
                          className="flex-1 py-2 rounded-lg text-[11px] font-bold text-center bg-white/10 text-white hover:bg-white/15"
                        >
                          Marca Blanca
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          HERRAMIENTA 2: AVALÚO INSTANTÁNEO ACM CON IA (ESTILO HABI / CASACOL)
      ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'valuator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 bg-black/40 border border-white/10 rounded-2xl p-5 space-y-4">
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: primaryColor }} />
                Simulador de Avalúo Comercial Instantáneo (ACM IA)
              </h4>
              <p className="text-xs text-white/60">
                Calcula al instante el valor de mercado de venta, precio por m² y canon de arriendo estimado en Colombia.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">Ciudad</label>
                <input
                  type="text"
                  value={valCity}
                  onChange={(e) => setValCity(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">Barrio / Sector</label>
                <input
                  type="text"
                  value={valZone}
                  onChange={(e) => setValZone(e.target.value)}
                  placeholder="Ej: Chicó, Cedritos, El Poblado"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">Tipo Inmueble</label>
                <select
                  value={valType}
                  onChange={(e) => setValType(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="Apartamento">Apartamento</option>
                  <option value="Casa">Casa</option>
                  <option value="Apartaestudio">Apartaestudio</option>
                  <option value="Oficina">Oficina</option>
                  <option value="Bodega">Bodega</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">Área Construida (m²)</label>
                <input
                  type="number"
                  value={valArea}
                  onChange={(e) => setValArea(Number(e.target.value) || 60)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">Habitaciones</label>
                <input
                  type="number"
                  value={valBeds}
                  onChange={(e) => setValBeds(Number(e.target.value) || 0)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">Baños / Garajes</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={valBaths}
                    onChange={(e) => setValBaths(Number(e.target.value) || 1)}
                    title="Baños"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white"
                  />
                  <input
                    type="number"
                    value={valGarages}
                    onChange={(e) => setValGarages(Number(e.target.value) || 0)}
                    title="Garajes"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">Estrato (1 a 6)</label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={valEstrato}
                  onChange={(e) => setValEstrato(Number(e.target.value) || 4)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">Estado / Conservación</label>
                <select
                  value={valCondition}
                  onChange={(e) => setValCondition(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="excelente">Excelente / Remodelado</option>
                  <option value="bueno">Buen estado general</option>
                  <option value="remodelar">Para remodelar</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Tu nombre (opcional)"
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
              />
              <input
                type="text"
                value={ownerWhatsapp}
                onChange={(e) => setOwnerWhatsapp(e.target.value)}
                placeholder="Tu WhatsApp (opcional)"
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                valuationMutation.mutate({
                  agentUserId,
                  city: valCity,
                  zone: valZone,
                  propertyType: valType,
                  areaM2: valArea,
                  bedrooms: valBeds,
                  bathrooms: valBaths,
                  garages: valGarages,
                  estrato: valEstrato,
                  ageYears: valAge,
                  condition: valCondition,
                  ownerName: ownerName || undefined,
                  ownerWhatsapp: ownerWhatsapp || undefined,
                })
              }
              disabled={valuationMutation.isPending}
              className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider text-black shadow-lg"
              style={{ backgroundColor: primaryColor }}
            >
              {valuationMutation.isPending ? 'Calculando ACM...' : 'Calcular Avalúo Comercial con IA'}
            </button>
          </div>

          {/* Panel de Resultados ACM */}
          <div className="lg:col-span-6 bg-black/40 border border-white/10 rounded-2xl p-6 space-y-5">
            {valuationMutation.data ? (
              <>
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block">
                      CERTIFICADO PRELIMINAR #{valuationMutation.data.valuationCode}
                    </span>
                    <h5 className="text-lg font-black text-white">
                      {valuationMutation.data.propertyType} en {valuationMutation.data.zone} ({valuationMutation.data.areaM2} m²)
                    </h5>
                  </div>
                  <span className="text-xs font-mono text-white/60">
                    {formatCop(valuationMutation.data.pricePerM2Cop)} / m²
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                    <span className="text-[10px] font-mono uppercase text-white/50 block">Liquidez Rápida</span>
                    <span className="text-sm font-bold text-white mt-1 block">
                      {formatCop(valuationMutation.data.minQuickSalePrice)}
                    </span>
                  </div>
                  <div
                    className="rounded-xl p-3.5 border"
                    style={{
                      backgroundColor: `${primaryColor}15`,
                      borderColor: `${primaryColor}50`,
                    }}
                  >
                    <span className="text-[10px] font-mono uppercase font-bold block" style={{ color: primaryColor }}>
                      Valor Óptimo Mercado
                    </span>
                    <span className="text-base font-black text-white mt-1 block">
                      {formatCop(valuationMutation.data.optimalSalePrice)}
                    </span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                    <span className="text-[10px] font-mono uppercase text-white/50 block">Techo Máximo</span>
                    <span className="text-sm font-bold text-white mt-1 block">
                      {formatCop(valuationMutation.data.maxMarketCeilingPrice)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-white/5 rounded-xl p-4 border border-white/10">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-white/50 block">
                      Canon Mensual Estimado
                    </span>
                    <span className="text-base font-black text-emerald-400">
                      {formatCop(valuationMutation.data.estimatedMonthlyRent)} / mes
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-white/50 block">
                      Rentabilidad Bruta Anual
                    </span>
                    <span className="text-base font-black text-white">
                      {valuationMutation.data.annualGrossYieldPct}% E.A.
                    </span>
                  </div>
                </div>

                <a
                  href={`https://wa.me/${contactPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Hola ${agencyName}, acabo de realizar el Avalúo ACM (${valuationMutation.data.valuationCode}) de mi ${valuationMutation.data.propertyType} en ${valuationMutation.data.zone} (${valuationMutation.data.areaM2} m²) estimado en ${formatCop(
                      valuationMutation.data.optimalSalePrice
                    )} y quiero comercializarlo con ustedes.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-center block text-black"
                  style={{ backgroundColor: primaryColor }}
                >
                  Solicitar Peritaje Oficial y Consignar con {agencyName}
                </a>
              </>
            ) : (
              <div className="py-12 text-center space-y-3">
                <TrendingUp className="w-10 h-10 mx-auto opacity-40" style={{ color: primaryColor }} />
                <p className="text-sm font-bold text-white">
                  Ingresa los datos del inmueble a la izquierda y obtén el Avalúo ACM al instante
                </p>
                <p className="text-xs text-white/50 max-w-md mx-auto">
                  Nuestro algoritmo compara valores por metro cuadrado, depreciación por edad, estrato y amenidades en las principales zonas del país.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          HERRAMIENTA 3: HOME STAGING VIRTUAL & REMODELACIÓN IA (ESTILO MATTERPORT / QRADOR PHOTO AI)
      ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'staging' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Selector de Estilos y Parámetros */}
          <div className="lg:col-span-5 bg-black/40 border border-white/10 rounded-2xl p-5 space-y-4">
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Wand2 className="w-4 h-4" style={{ color: primaryColor }} />
                Estudio de Home Staging Virtual & Interiorismo IA
              </h4>
              <p className="text-xs text-white/60">
                Muestra a compradores y propietarios cómo luce un espacio vacío o por remodelar transformado por IA en 5 estilos arquitectónicos.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase text-white/50 block">
                Selecciona el Estilo de Amoblamiento IA
              </label>
              {[
                { id: 'modern-scandinavian', label: 'Escandinavo Moderno & Cálido (+14% Valor)' },
                { id: 'luxury-minimalist', label: 'Luxury Minimalista & Mármol (+18% Valor)' },
                { id: 'industrial-loft', label: 'Loft Industrial Contemporáneo (+15% Valor)' },
                { id: 'executive-office', label: 'Oficina Corporativa Boutique (+16% Valor)' },
                { id: 'declutter-clean', label: 'Despeje Visual & Luz Natural IA (+12% Valor)' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleSelectStagingStyle(st.id)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-between ${
                    stagingStyle === st.id
                      ? 'text-black'
                      : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                  }`}
                  style={
                    stagingStyle === st.id
                      ? { backgroundColor: primaryColor, borderColor: primaryColor }
                      : undefined
                  }
                >
                  <span>{st.label}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <span className="text-[10px] font-mono uppercase font-bold block" style={{ color: primaryColor }}>
                ESPECIFICACIÓN ARQUITECTÓNICA SUGERIDA
              </span>
              <p className="text-xs text-white/80 font-medium">{currentStagingData.tagline}</p>
              <ul className="text-[11px] text-white/65 space-y-1 pt-1">
                {currentStagingData.materials.map((m: string) => (
                  <li key={m}>• {m}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Visor Interactivo Antes / Después */}
          <div className="lg:col-span-7 bg-black/40 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">
                Comparador Interactivo Antes vs. Después ({currentStagingData.name})
              </span>
              <span className="text-xs font-mono text-emerald-400">
                +{currentStagingData.valueBoostPct}% Valor Percibido • -{currentStagingData.speedBoostPct}% Tiempo en Venta
              </span>
            </div>

            <div className="relative h-72 sm:h-80 rounded-2xl overflow-hidden select-none border border-white/15">
              {/* Imagen Después (Fondo completo) */}
              <img
                src={currentStagingData.afterImage}
                alt="Después con Staging IA"
                className="w-full h-full object-cover"
              />
              {/* Imagen Antes (Recortada según el slider) */}
              <div
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${sliderPos}%` }}
              >
                <img
                  src={currentStagingData.beforeImage}
                  alt="Antes sin amoblar"
                  className="w-full h-full object-cover max-w-none"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Línea divisoria */}
              <div
                className="absolute inset-y-0 w-1 bg-white shadow-[0_0_15px_rgba(0,0,0,0.9)]"
                style={{ left: `${sliderPos}%` }}
              />

              <span className="absolute top-3 left-3 px-2.5 py-1 rounded bg-black/75 text-[10px] font-mono uppercase text-white">
                ANTES (ESPACIO VACÍO)
              </span>
              <span
                className="absolute top-3 right-3 px-2.5 py-1 rounded text-[10px] font-mono uppercase font-black text-black"
                style={{ backgroundColor: primaryColor }}
              >
                DESPUÉS (STAGING IA)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-white/60">Deslizar comparador:</span>
              <input
                type="range"
                min={5}
                max={95}
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="flex-1 accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          HERRAMIENTA 4: GENERADOR DE CONTRATOS Y PROMESAS CON FIRMA DIGITAL LEY 527 (ESTILO DOCUSIGN / AUTENTIC)
      ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'contracts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-black/40 border border-white/10 rounded-2xl p-5 space-y-4">
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <FileSignature className="w-4 h-4" style={{ color: primaryColor }} />
                Generador de Contratos & Minutas con Sello Ley 527
              </h4>
              <p className="text-xs text-white/60">
                Expide en segundos contratos inmobiliarios membretados con tu marca, código CUV y hash criptográfico SHA-256.
              </p>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">Tipo de Documento Legal</label>
              <select
                value={contractType}
                onChange={(e) => setContractType(e.target.value as any)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-bold"
              >
                <option value="arrendamiento_vivienda">
                  1. Contrato de Arrendamiento Vivienda Urbana (Ley 820 de 2003)
                </option>
                <option value="promesa_compraventa">
                  2. Promesa de Compraventa de Inmueble (Art. 1611 C.C.)
                </option>
                <option value="mandato_consignacion">
                  3. Contrato de Consignación y Mandato Comercial
                </option>
                <option value="presentacion_cliente">
                  4. Acta de Presentación de Cliente y Reserva 40/20/40
                </option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">
                  Parte A (Propietario / Arrendador)
                </label>
                <input
                  type="text"
                  value={partyAName}
                  onChange={(e) => setPartyAName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">C.C. / NIT Parte A</label>
                <input
                  type="text"
                  value={partyADoc}
                  onChange={(e) => setPartyADoc(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">
                  Parte B (Comprador / Arrendatario)
                </label>
                <input
                  type="text"
                  value={partyBName}
                  onChange={(e) => setPartyBName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">C.C. / NIT Parte B</label>
                <input
                  type="text"
                  value={partyBDoc}
                  onChange={(e) => setPartyBDoc(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">Dirección del Inmueble</label>
                <input
                  type="text"
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">Valor o Canon (COP)</label>
                <input
                  type="number"
                  value={contractValue}
                  onChange={(e) => setContractValue(Number(e.target.value) || 0)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                contractMutation.mutate({
                  agentUserId,
                  contractType,
                  partyAName,
                  partyADoc,
                  partyBName,
                  partyBDoc,
                  propertyAddress: contractAddress,
                  propertyMatricula: contractMatricula,
                  contractValueCop: contractValue,
                  additionalClauses: contractExtra,
                })
              }
              disabled={contractMutation.isPending}
              className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider text-black shadow-lg"
              style={{ backgroundColor: primaryColor }}
            >
              {contractMutation.isPending ? 'Generando Minuta...' : 'Generar Contrato Membretado con Sello Digital'}
            </button>
          </div>

          {/* Vista Previa del Contrato con Membrete de la Agencia */}
          <div className="lg:col-span-7 bg-white text-zinc-900 rounded-2xl p-6 shadow-xl space-y-4">
            {contractMutation.data ? (
              <>
                <div
                  className="flex items-center justify-between border-b-2 pb-4"
                  style={{ borderColor: primaryColor }}
                >
                  <div>
                    <span
                      className="text-[10px] font-mono uppercase tracking-widest font-bold block"
                      style={{ color: secondaryColor }}
                    >
                      {agencyName.toUpperCase()} • DOCUMENTO OFICIAL
                    </span>
                    <h5 className="text-base font-black text-zinc-900">{contractMutation.data.title}</h5>
                    <span className="text-[11px] text-zinc-500">{contractMutation.data.legalBasis}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono font-bold bg-zinc-100 px-2.5 py-1 rounded border border-zinc-300 block">
                      {contractMutation.data.cuvCode}
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-1 block">
                      {contractMutation.data.generatedAt}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 text-xs">
                  <div>
                    <strong className="block text-zinc-500 text-[10px] uppercase">PARTE A:</strong>
                    <span className="font-bold">{contractMutation.data.partyAName}</span> (Doc.{' '}
                    {contractMutation.data.partyADoc})
                  </div>
                  <div>
                    <strong className="block text-zinc-500 text-[10px] uppercase">PARTE B:</strong>
                    <span className="font-bold">{contractMutation.data.partyBName}</span> (Doc.{' '}
                    {contractMutation.data.partyBDoc})
                  </div>
                </div>

                <div className="text-xs leading-relaxed whitespace-pre-line text-zinc-700 max-h-60 overflow-y-auto pr-2">
                  {contractMutation.data.clausesBody}
                </div>

                <div className="border-t border-zinc-200 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-[10px] font-mono text-zinc-500 truncate max-w-md">
                    SHA-256: {contractMutation.data.sha256Seal}
                  </div>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-black flex items-center gap-1.5 shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Imprimir / Descargar PDF
                  </button>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-zinc-500 space-y-2">
                <FileSignature className="w-10 h-10 mx-auto text-zinc-400" />
                <p className="text-sm font-bold text-zinc-800">
                  Completa las partes a la izquierda y haz clic en "Generar Contrato Membretado"
                </p>
                <p className="text-xs max-w-md mx-auto">
                  El documento saldrá personalizado con el nombre y colores de tu agencia, listo para firma manuscrita digital o impresión en PDF con sello SHA-256.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

