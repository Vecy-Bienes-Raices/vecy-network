import React, { useMemo } from 'react';
import { 
  Phone, MapPin, Search, Download, Building2, Calendar, 
  Sparkles, CheckCircle2, AlertTriangle, XCircle, SlidersHorizontal, 
  DollarSign, Ruler, Bed, Bath, Car, Shield, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { motion, AnimatePresence } from 'framer-motion';

type MatchStatus = "exact" | "warn" | "missing" | "ok";

interface ScoreRow {
  label: string;
  reqVal: string;
  propVal: string;
  status: MatchStatus;
  weight: number;
  icon: React.ReactNode;
}

// Lógica de comparación de campos (Scoring) heredada del MatchesReport
function scoreRows(req: any, prop: any) {
  const rows: ScoreRow[] = [];
  let pts = 0;
  let max = 0;

  const add = (label: string, reqVal: string, propVal: string, status: MatchStatus, weight: number, icon: React.ReactNode) => {
    rows.push({ label, reqVal, propVal, status, weight, icon });
    max += weight;
    if (status === "exact" || status === "ok") pts += weight;
    else if (status === "warn") pts += weight * 0.5;
  };

  const cleanText = (t: string) => (t || "").toLowerCase().trim().replace(/[\s\-_,.]+/g, " ");

  // 1. Tipo de Inmueble
  const reqType = req.tipoInmuebleDeseado || req.propertyType;
  const propType = prop.propertyType;
  let typeS: MatchStatus = "missing";
  if (reqType && propType) {
    const r = cleanText(reqType);
    const p = cleanText(propType);
    if (r === p || r.includes(p) || p.includes(r)) {
      typeS = "exact";
    } else if (
      (r.includes("apart") && p.includes("apartaestudio")) || 
      (r.includes("apartaestudio") && p.includes("apart"))
    ) {
      typeS = "warn";
    }
  }
  add("Tipo de Inmueble", reqType || "N/E", propType || "N/E", typeS, 18, <Building2 className="w-3.5 h-3.5" />);

  // 2. Tipo de Negocio
  const reqNeg = req.tipoNegocioDeseado || req.transactionType;
  const propNeg = prop.transactionType;
  let negS: MatchStatus = "missing";
  if (reqNeg && propNeg) {
    const r = cleanText(reqNeg);
    const p = cleanText(propNeg);
    if (r === p || r.includes(p) || p.includes(r)) negS = "exact";
  }
  add("Tipo de Negocio", reqNeg || "N/E", propNeg || "N/E", negS, 15, <SlidersHorizontal className="w-3.5 h-3.5" />);

  // 3. Ubicación / Barrio (Lógica de aproximación por palabras clave)
  const reqZone = req.zonaDeseada || req.zone || "";
  const propZone = prop.zone || "";
  let locS: MatchStatus = "missing";
  if (!reqZone) {
    locS = "exact"; // Si busca en cualquier lugar de la ciudad
  } else {
    const reqZoneClean = cleanText(reqZone);
    const propZoneClean = cleanText(propZone);
    const santas = ["santa barbara", "sta barbara", "santa bárbara", "pepe sierra"];
    const chico = ["chico", "chicó", "chico norte", "chico reservado", "chico alto", "el chico"];
    
    const isSantas = (t: string) => santas.some(s => t.includes(s));
    const isChico = (t: string) => chico.some(c => t.includes(c));

    const hasNominal = reqZoneClean === propZoneClean || reqZoneClean.includes(propZoneClean) || propZoneClean.includes(reqZoneClean);
    const hasColoquial = (isSantas(reqZoneClean) && santas.some(s => propZoneClean.includes(s))) ||
                         (isChico(reqZoneClean) && chico.some(c => propZoneClean.includes(c)));
    
    if (hasNominal || hasColoquial) {
      locS = "exact";
    } else if (reqZoneClean.includes("aledan") || reqZoneClean.includes("cercan") || reqZoneClean.includes("alrededor") || reqZoneClean.includes("similar") || reqZoneClean.includes("proxim") || reqZoneClean.includes("otro")) {
      locS = "warn";
    } else {
      locS = "missing";
    }
  }
  add("Ubicación / Barrio", `${req.zonaDeseada || "Cualquiera"}, ${req.ciudadDeseada || "N/E"}`, `${prop.zone || "N/E"}, ${prop.city || "N/E"}`, locS, 20, <MapPin className="w-3.5 h-3.5" />);

  // 4. Presupuesto Máx
  const budget = parseFloat(req.presupuestoMax || "0");
  const price = parseFloat(prop.price || "0");
  let budS: MatchStatus = "missing";
  if (!budget || !price) budS = "missing";
  else if (price <= budget) budS = "exact";
  else if (price <= budget * 1.05) budS = "warn";
  else budS = "missing";
  add("Presupuesto Máx.", req.presupuestoMax ? `Hasta ${formatCOP(req.presupuestoMax)}` : "N/E", formatCOP(prop.price), budS, 15, <DollarSign className="w-3.5 h-3.5" />);

  // 5. Área Total
  const areaR = parseFloat(req.areaMin || "0");
  const areaP = parseFloat(prop.areaTotal || prop.areaPrivate || "0");
  let areS: MatchStatus = "exact";
  if (areaR > 0) {
    if (areaP >= areaR && areaP <= areaR * 1.15) {
      areS = "exact";
    } else if (areaP > areaR * 1.15 && areaP <= areaR * 1.30) {
      areS = "warn";
    } else {
      areS = "missing";
    }
  }
  add("Área Total", req.areaMin ? `>= ${req.areaMin} m²` : "N/E", prop.areaTotal ? `${prop.areaTotal} m²` : "N/E", areS, 10, <Ruler className="w-3.5 h-3.5" />);

  // 6. Habitaciones
  const bedR = req.habitacionesMin ? Number(req.habitacionesMin) : 0;
  const bedP = prop.bedrooms ? Number(prop.bedrooms) : 0;
  const bedS: MatchStatus = !bedR ? "exact" : bedP === bedR ? "exact" : "missing";
  add("Habitaciones", bedR ? `${bedR} hab. (Exacto)` : "N/E", bedP ? `${bedP} hab.` : "N/E", bedS, 8, <Bed className="w-3.5 h-3.5" />);

  // 7. Baños
  const bathR = req.banosMin ? Number(req.banosMin) : 0;
  const bathP = prop.bathrooms ? Number(prop.bathrooms) : 0;
  const bathS: MatchStatus = !bathR ? "exact" : bathP === bathR ? "exact" : "missing";
  add("Baños", bathR ? `${bathR} baños (Exacto)` : "N/E", bathP ? `${bathP} baños` : "N/E", bathS, 5, <Bath className="w-3.5 h-3.5" />);

  // 8. Parqueaderos
  const garR = req.parqueaderosMin ? Number(req.parqueaderosMin) : 0;
  const garP = prop.garages ? Number(prop.garages) : 0;
  const garS: MatchStatus = !garR ? "exact" : garP === garR ? "exact" : "missing";
  add("Parqueaderos", garR ? `${garR} garajes (Exacto)` : "N/E", garP ? `${garP} garajes` : "N/E", garS, 5, <Car className="w-3.5 h-3.5" />);

  // 9. Estrato
  const estratoArr: number[] = Array.isArray(req.estratoDeseado) ? req.estratoDeseado : [];
  const estratoP = prop.stratum;
  const estS: MatchStatus = !estratoArr.length || !estratoP ? "exact" : estratoArr.includes(estratoP) ? "exact" : "warn";
  add("Estrato", estratoArr.length ? `Estrato(s) ${estratoArr.join(", ")}` : "Cualquiera", estratoP ? `Estrato ${estratoP}` : "N/E", estS, 7, <Shield className="w-3.5 h-3.5" />);

  // Penalización por falta de datos críticos para evitar puntuaciones falsas del 100%
  const hasHardMismatch = rows.some(r => r.status === "missing");
  let finalScore = hasHardMismatch ? 0 : (max > 0 ? Math.round((pts / max) * 100) : 0);

  // Si no especificaron ni presupuesto ni área, penalizamos un 40% de afinidad comercial
  if (finalScore === 100 && (!budget || budget === 0) && (!areaR || areaR === 0)) {
    finalScore = 60; // Baja el match a 60% por falta de precisión comercial
  }

  return { rows, autoScore: finalScore };
}

function formatCOP(val: string | number) {
  const num = parseFloat(String(val));
  if (isNaN(num) || num === 0) return "N/E";
  return num.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
}

function formatPhoneDisplay(phone: string | null | undefined) {
  if (!phone) return "Sin teléfono";
  const clean = phone.split('@')[0];
  if (clean.startsWith("57") && clean.length === 12) {
    return `+57 ${clean.substring(2, 5)} ${clean.substring(5, 8)} ${clean.substring(8)}`;
  }
  return `+${clean}`;
}

export default function AdminMatches() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [minScore, setMinScore] = React.useState('50');

  // Fetch matches directly from server API
  const { data: matches = [], isLoading, refetch } = trpc.janIA.getAllMatches.useQuery();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'suggested': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'interested': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'converted': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      default: return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      suggested: 'Sugerido',
      interested: 'Interesado',
      converted: 'Cerrado/Negocio',
    };
    return labels[status] || status;
  };

  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
      const property = match.property || {};
      const requirement = match.requirement || {};
      
      const propSearchStr = `${property.name} ${property.city} ${property.zone} ${property.idUsuarioWhatsapp}`.toLowerCase();
      const reqSearchStr = `${requirement.name} ${requirement.ciudadDeseada} ${requirement.zonaDeseada} ${requirement.idUsuarioWhatsapp}`.toLowerCase();
      
      const matchesSearch = propSearchStr.includes(searchTerm.toLowerCase()) || 
                            reqSearchStr.includes(searchTerm.toLowerCase());
                            
      const scoreVal = parseFloat(String(match.matchScore || '0'));
      const matchesScore = scoreVal >= parseFloat(minScore);
      
      return matchesSearch && matchesScore;
    });
  }, [matches, searchTerm, minScore]);

  const exportData = () => {
    const headers = ['ID Coincidencia', 'Porcentaje Match', 'Propiedad', 'Propietario Telefono', 'Requerimiento', 'Interesado Telefono', 'Estado', 'Fecha'];
    const rows = filteredMatches.map(m => [
      `M${m.id}`,
      `${parseFloat(String(m.matchScore)).toFixed(0)}%`,
      m.property?.name,
      m.property?.idUsuarioWhatsapp ? `+${m.property.idUsuarioWhatsapp.split('@')[0]}` : 'N/A',
      m.requirement?.name,
      m.requirement?.idUsuarioWhatsapp ? `+${m.requirement.idUsuarioWhatsapp.split('@')[0]}` : 'N/A',
      m.status,
      new Date(m.createdAt).toLocaleDateString('es-CO')
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `coincidencias_vecy_network_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#bf953f] animate-pulse" />
            Reporte de Coincidencias (Matches de JanIA)
          </h2>
          <p className="text-zinc-500 text-sm mt-1">
            {isLoading ? 'Cargando coincidencias...' : `Total: ${matches.length} matches | Filtrados: ${filteredMatches.length}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10 text-xs">
            Refrescar
          </Button>
          <Button 
            disabled={filteredMatches.length === 0}
            onClick={exportData} 
            className="bg-[#bf953f] hover:bg-[#a67d32] text-black font-bold flex items-center gap-2 text-xs"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap bg-zinc-900/40 p-4 border border-white/5 rounded-2xl">
        <div className="flex-1 min-w-64">
          <Input
            placeholder="Buscar por barrio, nombre, descripción o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-black/40 border-white/10 text-white placeholder-zinc-500 text-xs h-10"
          />
        </div>
        <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-md px-3 text-white h-10">
          <SlidersHorizontal className="w-4 h-4 text-zinc-500" />
          <span className="text-xs text-zinc-400">Match Mínimo:</span>
          <select
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            className="bg-transparent border-none text-white focus:ring-0 text-xs font-semibold cursor-pointer outline-none"
          >
            <option className="bg-[#0c0c0c]" value="30">30%</option>
            <option className="bg-[#0c0c0c]" value="50">50%</option>
            <option className="bg-[#0c0c0c]" value="70">70%</option>
            <option className="bg-[#0c0c0c]" value="80">80%</option>
            <option className="bg-[#0c0c0c]" value="90">90%</option>
          </select>
        </div>
      </div>

      {/* Matches Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-zinc-500 text-sm">Buscando reportes de matching...</p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="p-20 text-center border border-white/5 rounded-2xl bg-zinc-950/40">
          <Sparkles className="w-12 h-12 text-[#bf953f] mx-auto mb-4 opacity-40 animate-pulse" />
          <h3 className="text-lg font-semibold text-zinc-300">No se encontraron coincidencias</h3>
          <p className="text-zinc-500 text-sm mt-1">Intenta reducir el filtro de match mínimo o realizar una nueva búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <AnimatePresence>
            {filteredMatches.map((m, idx) => {
              const score = parseFloat(m.matchScore?.toString() || "0");
              const { rows, autoScore } = scoreRows(m.requirement, m.property);
              const date = new Date(m.createdAt || new Date()).toLocaleString("es-CO", { 
                year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" 
              });

              const exactCount = rows.filter(r => r.status === "exact" || r.status === "ok").length;
              const warnCount = rows.filter(r => r.status === "warn").length;
              const failCount = rows.filter(r => r.status === "missing").length;

              const dotColor = score >= 95 
                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" 
                : score >= 80 
                  ? "bg-[#bf953f] shadow-[0_0_8px_rgba(191,149,63,0.5)]" 
                  : "bg-cyan-500";
              const scoreColor = score >= 95 ? "text-emerald-400" : score >= 80 ? "text-[#bf953f]" : "text-cyan-400";

              return (
                <motion.div 
                  key={m.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(idx * 0.03, 0.3) }}
                  className="bg-[#0b0b0b] border border-white/5 hover:border-[#bf953f]/25 rounded-3xl overflow-hidden shadow-xl transition-all duration-300 relative group"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-gradient-to-b from-[#bf953f] to-[#a67d32] opacity-50 group-hover:opacity-100 transition-opacity" />

                  {/* Top Bar info */}
                  <div className="bg-white/[0.01] px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                      <span className={`text-xl font-extrabold tracking-tight ${scoreColor}`}>{score.toFixed(0)}% Match</span>
                      <span className="text-zinc-500 text-xs">Afinidad registrada por IA</span>
                      {score >= 95 && (
                        <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                          ⭐ MATCH PERFECTO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-mono">
                        <Calendar className="w-3.5 h-3.5" />
                        {date}
                      </div>
                      <span className="text-[10px] text-zinc-600 font-mono">Coincidencia #M{m.id}</span>
                    </div>
                  </div>

                  {/* Summary badges */}
                  <div className="px-6 py-2.5 flex items-center gap-3 border-b border-white/5 flex-wrap bg-black/20">
                    <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">Cotejo:</span>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-2.5 h-2.5" /> {exactCount} coinciden
                    </span>
                    {warnCount > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                        <AlertTriangle className="w-2.5 h-2.5" /> {warnCount} aproximados
                      </span>
                    )}
                    {failCount > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full">
                        <XCircle className="w-2.5 h-2.5" /> {failCount} no cumplen
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-zinc-500">
                      Score recalculado: <strong className="text-zinc-300">{autoScore}%</strong>
                    </span>
                  </div>

                  {/* Parties Split View */}
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-white/5 bg-zinc-950/20">
                    
                    {/* Inmueble (Oferta) */}
                    <div className="space-y-3">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-[#bf953f] bg-[#bf953f]/5 px-2 py-0.5 rounded border border-[#bf953f]/15">
                        🏢 Inmueble / Oferta
                      </span>
                      <h4 className="text-base font-bold text-white mt-1">{m.property?.name}</h4>
                      {(m.property?.rawText || m.property?.description) && (
                        <p className="text-xs text-zinc-300 bg-white/[0.02] border border-white/5 p-3 rounded-xl italic leading-relaxed whitespace-pre-wrap">
                          "{m.property?.rawText || m.property?.description}"
                        </p>
                      )}
                      
                      <div className="bg-[#bf953f]/5 border border-[#bf953f]/10 rounded-2xl p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#bf953f]/10 border border-[#bf953f]/20 flex items-center justify-center text-[#bf953f]">
                            <Phone className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Captador (Owner)</p>
                            <p className="text-xs font-bold text-zinc-200">{formatPhoneDisplay(m.property?.idUsuarioWhatsapp)}</p>
                            <p className="text-[10px] text-zinc-500 font-mono select-all">+{m.property?.idUsuarioWhatsapp?.split('@')[0]}</p>
                          </div>
                        </div>
                        {m.property?.idUsuarioWhatsapp && (
                          <a 
                            href={`https://wa.me/${m.property.idUsuarioWhatsapp.split('@')[0]}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-[#25D366] hover:bg-[#20ba5a] text-black text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            WA <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Requerimiento (Demanda) */}
                    <div className="space-y-3 md:pl-6 md:border-l border-white/5">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-cyan-400 bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/15">
                        🔍 Requerimiento / Demanda
                      </span>
                      <h4 className="text-base font-bold text-white mt-1">
                        {m.requirement?.name || `Requerimiento #${m.requirement?.id}`}
                      </h4>
                      {m.requirement?.rawText && (
                        <p className="text-xs text-zinc-300 bg-white/[0.02] border border-white/5 p-3 rounded-xl italic leading-relaxed whitespace-pre-wrap">
                          "{m.requirement?.rawText}"
                        </p>
                      )}
                      
                      <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-2xl p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                            <Phone className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Buscador (Seeker)</p>
                            <p className="text-xs font-bold text-zinc-200">{formatPhoneDisplay(m.requirement?.idUsuarioWhatsapp)}</p>
                            <p className="text-[10px] text-zinc-500 font-mono select-all">+{m.requirement?.idUsuarioWhatsapp?.split('@')[0]}</p>
                          </div>
                        </div>
                        {m.requirement?.idUsuarioWhatsapp && (
                          <a 
                            href={`https://wa.me/${m.requirement.idUsuarioWhatsapp.split('@')[0]}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-[#25D366] hover:bg-[#20ba5a] text-black text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            WA <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* COTEJO DETALLADO CAMPO POR CAMPO (SIEMPRE VISIBLE) */}
                  <div className="bg-black/30 border-b border-white/5 p-6">
                    <h5 className="text-xs font-bold uppercase tracking-widest text-[#bf953f] mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Cotejo técnico de afinidad comercial
                    </h5>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-zinc-500">
                            <th className="text-left py-2 px-3">Característica</th>
                            <th className="text-left py-2 px-3">Buscado (Demanda)</th>
                            <th className="text-left py-2 px-3">Ofrecido (Oferta)</th>
                            <th className="text-center py-2 px-3 w-28">Cumplimiento</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, rIdx) => {
                            const isExact = row.status === "exact" || row.status === "ok";
                            const isWarn = row.status === "warn";
                            
                            const badgeBg = isExact 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                              : isWarn 
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                                : "bg-red-500/10 text-red-400 border border-red-500/20";
                            
                            const badgeText = isExact ? "Coincide" : isWarn ? "Aproximado" : "Diferente";

                            return (
                              <tr key={rIdx} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                                <td className="py-2.5 px-3 flex items-center gap-2 font-medium text-zinc-300">
                                  {row.icon}
                                  <span>{row.label}</span>
                                </td>
                                <td className="py-2.5 px-3 text-zinc-400">{row.reqVal}</td>
                                <td className="py-2.5 px-3 text-zinc-400">{row.propVal}</td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${badgeBg}`}>
                                    {badgeText}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Justificación de la IA */}
                  {m.matchReason && (
                    <div className="p-6 bg-white/[0.01] text-xs text-zinc-400 leading-relaxed">
                      <span className="font-bold text-zinc-300 block mb-1">Razón de afinidad de la IA:</span>
                      "{m.matchReason}"
                    </div>
                  )}

                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
