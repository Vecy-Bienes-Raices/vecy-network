import React, { useMemo } from 'react';
import { 
  Phone, MapPin, Search, Download, Building2, Calendar, 
  Sparkles, CheckCircle2, AlertTriangle, XCircle, SlidersHorizontal, 
  DollarSign, Ruler, Bed, Bath, Car, Shield, ExternalLink, Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { motion, AnimatePresence } from 'framer-motion';

type MatchStatus = "exact" | "warn" | "missing" | "ok" | "neutral";

interface ScoreRow {
  label: string;
  reqVal: string;
  propVal: string;
  status: MatchStatus;
  weight: number;
  icon: React.ReactNode;
}

// Lógica de comparación de campos (Scoring) heredada del MatchesReport
function getPropTypeLabel(type: string | null | undefined): string {
  if (!type) return "N/E";
  const clean = type.toLowerCase().trim();
  const m: Record<string, string> = {
    apartment: "Apartamento",
    apartamento: "Apartamento",
    apartamento_estandar: "Apartamento",
    apartaestudio: "Apartaestudio",
    house: "Casa",
    casa: "Casa",
    building: "Edificio",
    edificio: "Edificio",
    warehouse: "Bodega",
    bodega: "Bodega",
    farm: "Finca",
    finca: "Finca",
    hotel: "Hotel",
    office: "Oficina",
    oficina: "Oficina",
    land: "Lote/Terreno",
    lote: "Lote/Terreno",
    terreno: "Lote/Terreno",
    commercial: "Local Comercial",
    local: "Local Comercial",
    loft: "Loft",
    consultorio: "Consultorio"
  };
  return m[clean] || type;
}

function getTransactionLabel(type: string | null | undefined): string {
  if (!type) return "N/E";
  const clean = type.toLowerCase().trim();
  const m: Record<string, string> = {
    venta: "Venta",
    arriendo: "Arriendo",
    venta_o_arriendo: "Venta o Arriendo",
    arriendo_con_opcion_de_compra: "Arriendo con Opción de Compra",
    arriendo_temporal: "Arriendo Temporal",
    permuta: "Permuta",
    venta_permuta: "Venta / Permuta",
    aporte: "Aporte"
  };
  return m[clean] || type;
}

function isPropertyDualOffer(prop: any): boolean {
  if (!prop) return false;
  const pType = (prop.transactionType || "").toLowerCase();
  if (pType === "venta_o_arriendo" || pType === "venta_arriendo") return true;

  if (prop.rentPrice && parseFloat(String(prop.rentPrice)) > 0 && parseFloat(String(prop.price || "0")) > 0) {
    return true;
  }

  let accepted = prop.acceptedTransactionTypes;
  if (typeof accepted === "string") {
    try { accepted = JSON.parse(accepted); } catch (e) { accepted = []; }
  }
  if (Array.isArray(accepted) && (accepted.includes("venta") || accepted.includes("sale")) && (accepted.includes("arriendo") || accepted.includes("rent"))) {
    return true;
  }

  const raw = (prop.rawText || prop.name || prop.description || "").toLowerCase();
  if ((raw.includes("venta") || raw.includes("vendo")) && (raw.includes("arriendo") || raw.includes("arrienda") || raw.includes("canon"))) {
    return true;
  }

  return false;
}

function scoreRows(req: any, prop: any) {
  const rows: ScoreRow[] = [];
  let pts = 0;
  let max = 0;

  const add = (label: string, reqVal: string, propVal: string, status: MatchStatus, weight: number, icon: React.ReactNode) => {
    rows.push({ label, reqVal, propVal, status, weight, icon });
    max += weight;
    if (status === "exact" || status === "ok" || status === "neutral") pts += weight;
    else if (status === "warn") pts += weight * 0.5;
  };

  const cleanText = (t: string) => (t || "").toLowerCase().trim().replace(/[\s\-_,.]+/g, " ");

  // 1. Tipo de Inmueble
  const reqType = req.tipoInmuebleDeseado || req.propertyType;
  const propType = prop.propertyType;

  const reqRawText = cleanText(req.rawText || req.name || "");
  const propRawText = cleanText(prop.rawText || prop.name || "");
  const reqIsStudio = reqRawText.includes("apartaestudio") || reqRawText.includes("aparta estudio");
  const propIsStudio = propRawText.includes("apartaestudio") || propRawText.includes("aparta estudio");
  const reqIsLoft = reqRawText.includes("loft") || reqType === "loft";
  const propIsLoft = propRawText.includes("loft") || propType === "loft";

  let reqSubtype = reqType;
  if (reqType === "apartment" || reqType === "apartamento") {
    if (reqIsStudio) reqSubtype = "apartaestudio";
    else if (reqIsLoft) reqSubtype = "loft";
    else reqSubtype = "apartamento_estandar";
  }
  let propSubtype = propType;
  if (propType === "apartment" || propType === "apartamento") {
    if (propIsStudio) propSubtype = "apartaestudio";
    else if (propIsLoft) propSubtype = "loft";
    else propSubtype = "apartamento_estandar";
  }

  const typesMatch = reqSubtype && propSubtype && (
    reqSubtype === propSubtype ||
    (reqSubtype === "apartment" && propSubtype === "apartamento_estandar") ||
    (reqSubtype === "apartamento_estandar" && propSubtype === "apartment")
  );
  add(
    "Tipo de Inmueble", 
    getPropTypeLabel(reqSubtype), 
    getPropTypeLabel(propSubtype), 
    typesMatch ? "exact" : (reqSubtype && propSubtype ? "missing" : "neutral"), 
    18, 
    <Building2 className="w-3.5 h-3.5" />
  );

  // 2. Tipo de Negocio
  const reqNeg = req.tipoNegocioDeseado || req.transactionType || "";
  const propNeg = prop.transactionType || "";
  const isDual = isPropertyDualOffer(prop);

  let displayPropNeg = getTransactionLabel(propNeg);
  if (isDual || (reqNeg && propNeg && reqNeg.toLowerCase() !== propNeg.toLowerCase())) {
    displayPropNeg = "Venta / Arriendo";
  }
  const displayReqNeg = getTransactionLabel(reqNeg);

  const negMatch = !reqNeg || !propNeg || isDual ||
    reqNeg.toLowerCase() === propNeg.toLowerCase() ||
    propNeg === "venta_o_arriendo" || reqNeg === "venta_o_arriendo";

  add(
    "Tipo de Negocio", 
    displayReqNeg, 
    displayPropNeg, 
    negMatch ? "exact" : "missing", 
    15, 
    <SlidersHorizontal className="w-3.5 h-3.5" />
  );

  // 3. Ubicación / Barrio
  const reqZona = cleanText(req.zonaDeseada || req.addressNeighborhood || "");
  const propZona = cleanText(prop.zone || prop.addressNeighborhood || "");
  const reqCiudad = cleanText(req.ciudadDeseada || "bogotá");
  const propCiudad = cleanText(prop.city || "bogotá");
  const ciudadMatch = !reqCiudad || propCiudad.includes(reqCiudad) || reqCiudad.includes(propCiudad) || reqCiudad === "colombia";
  const zonaMatch = !reqZona || propZona.includes(reqZona) || reqZona.includes(propZona) || reqZona.includes("aledaños") || reqZona.includes("aledanos");
  const geoStatus: MatchStatus = ciudadMatch && zonaMatch ? "exact" : ciudadMatch ? "warn" : "missing";
  add(
    "Ubicación / Barrio", 
    `${req.zonaDeseada || "Cualquiera"}, ${req.ciudadDeseada || "Bogotá"}`, 
    `${prop.zone || "N/E"}, ${prop.city || "Bogotá"}`, 
    geoStatus, 
    20, 
    <MapPin className="w-3.5 h-3.5" />
  );

  // 4. Presupuesto Máx.
  const budget = parseFloat(req.presupuestoMax || "0");
  const price = parseFloat(prop.price || "0");
  let budS: MatchStatus = "neutral";
  if (budget > 0) {
    budS = (price > 0 && price === budget) ? "exact" : "warn";
  }
  const reqBudgetLabel = budget > 0 ? `${formatCOP(req.presupuestoMax)} ±5%` : "Sin restricción";

  add(
    "Presupuesto Máx.", 
    reqBudgetLabel, 
    formatCOP(prop.price), 
    budS, 
    15, 
    <DollarSign className="w-3.5 h-3.5" />
  );

  // 5. Área Total
  const areaR = parseFloat(req.areaMin || "0");
  const areaP = parseFloat(prop.areaTotal || prop.areaPrivate || "0");
  let areS: MatchStatus = "neutral";
  if (areaR > 0) {
    areS = (areaP > 0 && areaP === areaR) ? "exact" : "warn";
  }
  const reqAreaLabel = areaR > 0 ? `≥ ${req.areaMin} m²` : "Sin restricción";

  add(
    "Área Total", 
    reqAreaLabel, 
    areaP > 0 ? `${areaP} m²` : "N/E", 
    areS, 
    10, 
    <Ruler className="w-3.5 h-3.5" />
  );

  // 6. Habitaciones
  const bedR = req.habitacionesMin ? Number(req.habitacionesMin) : 0;
  const bedP = prop.bedrooms ? Number(prop.bedrooms) : 0;
  let bedS: MatchStatus = "neutral";
  if (bedR > 0) {
    bedS = (bedP === bedR) ? "exact" : "warn";
  }
  add(
    "Habitaciones", 
    bedR > 0 ? `${bedR} hab.` : "Sin restricción", 
    bedP > 0 ? `${bedP} hab.` : "N/E", 
    bedS, 
    8, 
    <Bed className="w-3.5 h-3.5" />
  );

  // 7. Baños
  const bathR = req.banosMin ? Number(req.banosMin) : 0;
  const bathP = prop.bathrooms ? Number(prop.bathrooms) : 0;
  let bathS: MatchStatus = "neutral";
  if (bathR > 0) {
    bathS = (bathP === bathR) ? "exact" : "warn";
  }
  add(
    "Baños", 
    bathR > 0 ? `≥ ${bathR} baños` : "Sin restricción", 
    bathP > 0 ? `${bathP} baños` : "N/E", 
    bathS, 
    5, 
    <Bath className="w-3.5 h-3.5" />
  );

  // 8. Parqueaderos
  const garR = req.parqueaderosMin ? Number(req.parqueaderosMin) : 0;
  const garP = prop.garages ? Number(prop.garages) : 0;
  let garS: MatchStatus = "neutral";
  if (garR > 0) {
    garS = (garP === garR) ? "exact" : "warn";
  }
  add(
    "Parqueaderos", 
    garR > 0 ? `≥ ${garR} garajes` : "Sin restricción", 
    garP > 0 ? `${garP} garajes` : "N/E", 
    garS, 
    5, 
    <Car className="w-3.5 h-3.5" />
  );

  // 9. Estrato
  const estratoArr: number[] = Array.isArray(req.estratoDeseado) ? req.estratoDeseado
    : req.estratoDeseado ? [Number(req.estratoDeseado)] : [];
  const estratoP = prop.stratum || prop.estrato;
  const hasEstratoReq = estratoArr.length > 0 && estratoArr[0] > 0;
  let estS: MatchStatus = "neutral";
  if (hasEstratoReq) {
    estS = (estratoP && estratoArr.includes(Number(estratoP))) ? "exact" : "warn";
  }
  const reqEstratoLabel = hasEstratoReq ? `Estrato ${estratoArr.join(", ")}` : "Sin restricción";
  add(
    "Estrato", 
    reqEstratoLabel, 
    (estratoP && Number(estratoP) > 0) ? `Estrato ${estratoP}` : "N/E", 
    estS, 
    7, 
    <Shield className="w-3.5 h-3.5" />
  );

  // 10. Administración
  const reqAdminMax = req.adminFeeMax ? parseFloat(String(req.adminFeeMax)) : 0;
  const propAdminFee = prop.adminFee ? parseFloat(String(prop.adminFee)) : 0;
  let admS: MatchStatus = "neutral";
  if (reqAdminMax > 0) {
    admS = (propAdminFee > 0 && propAdminFee === reqAdminMax) ? "exact" : "warn";
  }
  const reqAdminLabel = reqAdminMax > 0 ? `≤ ${formatCOP(reqAdminMax)}` : "Sin restricción";
  add(
    "Administración", 
    reqAdminLabel, 
    propAdminFee > 0 ? `${formatCOP(propAdminFee)}/mes` : "Sin restricción", 
    admS, 
    5, 
    <Receipt className="w-3.5 h-3.5" />
  );

  const autoScore = max > 0 ? Math.round((pts / max) * 100) : 0;
  return { rows, autoScore };
}

function formatCOP(val: string | number) {
  const num = parseFloat(String(val));
  if (isNaN(num) || num === 0) return "N/E";
  return num.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
}

function formatPhoneDisplay(phone: string | null | undefined) {
  if (!phone) return "No Registrado";
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 12 && clean.startsWith("573")) {
    return `+57 ${clean.substring(2, 5)} ${clean.substring(5, 8)} ${clean.substring(8)}`;
  }
  if (clean.length === 10 && clean.startsWith("3")) {
    return `+57 ${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6)}`;
  }
  return "Contacto Red VECY";
}

function isPhoneValidForWA(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const clean = phone.replace(/\D/g, "");
  return (clean.length === 12 && clean.startsWith("573")) || (clean.length === 10 && clean.startsWith("3"));
}

function getValidWaLink(phone: string | null | undefined, text: string): string {
  if (!phone) return '#';
  const clean = phone.replace(/\D/g, "");
  const num = clean.startsWith("57") ? clean : `57${clean}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

function checkTxCompatFrontend(reqTypeRaw: string, propTypeRaw: string, propAccepted: string[] = []): boolean {
  if (!reqTypeRaw || !propTypeRaw) return false;
  const r = reqTypeRaw.toLowerCase().trim();
  const p = propTypeRaw.toLowerCase().trim();
  const accepted = propAccepted.map(t => t.toLowerCase().trim());

  if (r === p) return true;
  if (accepted.length > 0 && accepted.includes(r)) return true;

  if (p === "venta_o_arriendo" && (r === "venta" || r === "arriendo" || r === "arriendo_con_opcion_de_compra")) return true;
  if (r === "venta_o_arriendo" && (p === "venta" || p === "arriendo" || p === "arriendo_con_opcion_de_compra")) return true;

  if (p === "venta_permuta" && (r === "venta" || r === "permuta")) return true;
  if (r === "venta_permuta" && (p === "venta" || p === "permuta")) return true;

  if (p === "arriendo_con_opcion_de_compra" && r === "venta") return true;
  if (r === "arriendo_con_opcion_de_compra" && p === "venta") return true;

  return false;
}

export default function AdminMatches() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [minScore, setMinScore] = React.useState('85'); // Mínimo 85% por norma doctrinal VECY Network

  // Fetch matches directly from server API with auto-refresh every 10s
  const { data: matches = [], isLoading, refetch } = trpc.janIA.getAllMatches.useQuery(undefined, {
    refetchInterval: 10000,
  });


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
            <option className="bg-[#0c0c0c]" value="85">85% — Mínimo VECY (85%+)</option>
            <option className="bg-[#0c0c0c]" value="90">90% — Coincidencia Alta</option>
            <option className="bg-[#0c0c0c]" value="95">95% — Casi Perfecto</option>
            <option className="bg-[#0c0c0c]" value="100">100% — Match Perfecto</option>
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
                  <div className="bg-white/[0.01] px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/5">
                    <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                      <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                      <span className={`text-lg sm:text-xl font-extrabold tracking-tight ${scoreColor}`}>{score.toFixed(0)}% Match</span>
                      <span className="text-zinc-500 text-[11px] sm:text-xs">Afinidad registrada por IA</span>
                      {score === 100 && (
                        <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                          ⭐ MATCH PERFECTO
                        </span>
                      )}
                      {score >= 95 && score < 100 && (
                        <span className="text-[9px] bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                          🥇 SOBRESALIENTE
                        </span>
                      )}
                      {score >= 90 && score < 95 && (
                        <span className="text-[9px] bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded-full font-bold">
                          🥈 MATCH ALTO
                        </span>
                      )}
                      {score >= 85 && score < 90 && (
                        <span className="text-[9px] bg-zinc-500/10 border border-zinc-500/30 text-zinc-300 px-2 py-0.5 rounded-full font-bold">
                          🥉 COMPATIBLE VECY
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-mono">
                        <Calendar className="w-3.5 h-3.5" />
                        {date}
                      </div>
                      <span className="text-[10px] text-zinc-600 font-mono">Coincidencia #M{m.id}</span>
                    </div>
                  </div>

                  {/* Summary badges */}
                  <div className="px-4 sm:px-6 py-2.5 flex items-center gap-2 sm:gap-3 border-b border-white/5 flex-wrap bg-black/20">
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
                      Score VECY: <strong className="text-zinc-300">{score.toFixed(0)}%</strong>
                    </span>
                  </div>

                  {/* Parties Split View */}
                  <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 border-b border-white/5 bg-zinc-950/20">
                    
                    {/* Inmueble (Oferta) */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-[#bf953f] bg-[#bf953f]/5 px-2 py-0.5 rounded border border-[#bf953f]/15">
                          🏢 Inmueble / Oferta
                        </span>
                        {m.property?.origenNombre && (
                          <span className="text-[10px] text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md truncate max-w-[180px] sm:max-w-[200px]" title={m.property.origenNombre}>
                            📍 {m.property.origenNombre}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-white mt-1 break-words">{m.property?.name}</h4>
                      {(m.property?.rawText || m.property?.description) && (
                        <p className="text-xs text-zinc-300 bg-white/[0.02] border border-white/5 p-3 rounded-xl italic leading-relaxed whitespace-pre-wrap break-words">
                          "{m.property?.rawText || m.property?.description}"
                        </p>
                      )}
                      
                      <div className="bg-[#bf953f]/5 border border-[#bf953f]/10 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#bf953f]/10 border border-[#bf953f]/20 flex items-center justify-center text-[#bf953f] flex-shrink-0">
                            <Phone className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Captador / Vendedor</p>
                            <p className="text-xs font-bold text-zinc-200">{formatPhoneDisplay(m.property?.idUsuarioWhatsapp)}</p>
                            {isPhoneValidForWA(m.property?.idUsuarioWhatsapp) && (
                              <p className="text-[10px] text-zinc-500 font-mono select-all">{formatPhoneDisplay(m.property?.idUsuarioWhatsapp)}</p>
                            )}
                          </div>
                        </div>
                        {isPhoneValidForWA(m.property?.idUsuarioWhatsapp) && (
                          <a 
                            href={getValidWaLink(m.property.idUsuarioWhatsapp, `Hola! Te contacto por el inmueble "${m.property.name || 'de la red'}" publicado en ${m.property.origenNombre || 'VECY Network'}. Tienes un Match del ${score.toFixed(0)}% con un requerimiento activo.`)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-[#25D366] hover:bg-[#20ba5a] text-black text-[10px] font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md hover:scale-105 min-h-[38px] w-full sm:w-auto"
                          >
                            Contactar WA <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Requerimiento (Demanda) */}
                    <div className="space-y-3 lg:pl-6 lg:border-l border-white/5 pt-4 lg:pt-0 border-t lg:border-t-0 border-white/5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-cyan-400 bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/15">
                          🔍 Requerimiento / Demanda
                        </span>
                        {m.requirement?.origenNombre && (
                          <span className="text-[10px] text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md truncate max-w-[180px] sm:max-w-[200px]" title={m.requirement.origenNombre}>
                            📍 {m.requirement.origenNombre}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-white mt-1 break-words">
                        {m.requirement?.name || `Requerimiento #${m.requirement?.id}`}
                      </h4>
                      {m.requirement?.rawText && (
                        <p className="text-xs text-zinc-300 bg-white/[0.02] border border-white/5 p-3 rounded-xl italic leading-relaxed whitespace-pre-wrap break-words">
                          "{m.requirement?.rawText}"
                        </p>
                      )}
                      
                      <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 flex-shrink-0">
                            <Phone className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Requiriente / Comprador</p>
                            <p className="text-xs font-bold text-zinc-200">{formatPhoneDisplay(m.requirement?.idUsuarioWhatsapp)}</p>
                            {isPhoneValidForWA(m.requirement?.idUsuarioWhatsapp) && (
                              <p className="text-[10px] text-zinc-500 font-mono select-all">{formatPhoneDisplay(m.requirement?.idUsuarioWhatsapp)}</p>
                            )}
                          </div>
                        </div>
                        {isPhoneValidForWA(m.requirement?.idUsuarioWhatsapp) && (
                          <a 
                            href={getValidWaLink(m.requirement.idUsuarioWhatsapp, `Hola! Te contacto por tu requerimiento de inmueble en ${m.requirement.zonaDeseada || m.requirement.ciudadDeseada || 'VECY Network'}. Encontramos una propiedad con un Match del ${score.toFixed(0)}%.`)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-[#25D366] hover:bg-[#20ba5a] text-black text-[10px] font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md hover:scale-105 min-h-[38px] w-full sm:w-auto"
                          >
                            Contactar WA <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* COTEJO DETALLADO CAMPO POR CAMPO (SIEMPRE VISIBLE) */}
                  <div className="bg-black/30 border-b border-white/5 p-4 sm:p-6">
                    <h5 className="text-xs font-bold uppercase tracking-widest text-[#bf953f] mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Cotejo técnico de afinidad comercial
                    </h5>
                    
                    <div className="overflow-x-auto scrollbar-thin -mx-4 sm:mx-0 px-4 sm:px-0">
                      <table className="w-full text-xs border-collapse min-w-[540px]">
                        <thead>
                          <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-zinc-500">
                            <th className="text-left py-2 px-3">Característica</th>
                            <th className="text-left py-2 px-3 text-[#bf953f]">Ofrecido (Oferta)</th>
                            <th className="text-left py-2 px-3 text-cyan-400">Buscado (Demanda)</th>
                            <th className="text-center py-2 px-3 w-28">Cumplimiento</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, rIdx) => {
                            const isExact = row.status === "exact" || row.status === "ok";
                            const isWarn = row.status === "warn";
                            const isNeutral = row.status === "neutral";
                            
                            const badgeBg = isExact 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                              : isWarn 
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                                : isNeutral
                                  ? "bg-zinc-800 text-zinc-400 border border-zinc-700/50"
                                  : "bg-red-500/10 text-red-400 border border-red-500/20";
                            
                            const badgeText = isExact ? "Coincide" : isWarn ? "Aproximado" : isNeutral ? "No Restringido" : "Diferente";

                            return (
                              <tr key={rIdx} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                                <td className="py-2.5 px-3 flex items-center gap-2 font-medium text-zinc-300">
                                  {row.icon}
                                  <span>{row.label}</span>
                                </td>
                                <td className="py-2.5 px-3 text-[#bf953f] font-medium">{row.propVal}</td>
                                <td className="py-2.5 px-3 text-cyan-300">{row.reqVal}</td>
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
                    <div className="p-4 sm:p-6 bg-white/[0.01] text-xs text-zinc-400 leading-relaxed">
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
