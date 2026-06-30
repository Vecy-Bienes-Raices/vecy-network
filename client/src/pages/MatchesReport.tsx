import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Sparkles, Search, Phone, MapPin, DollarSign, Home as HomeIcon,
  ArrowRightLeft, RefreshCw, Calendar, MessageSquare, CheckCircle2,
  XCircle, AlertTriangle, SlidersHorizontal, ExternalLink, Lock,
  Eye, EyeOff, BarChart3, Shield, Bed, Bath, Car, Ruler, Building2,
  TrendingUp, ChevronDown, ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";

const ADMIN_PASSWORD = "vecy2026admin";

function getWhatsAppLink(phone: string | null | undefined): string {
  if (!phone) return "#";
  const clean = phone.split("@")[0].replace(/\D/g, "");
  return `https://wa.me/${clean.startsWith("57") ? clean : "57" + clean}`;
}

function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return "No disponible";
  const clean = phone.split("@")[0].replace(/\D/g, "");
  if (clean.startsWith("57") && clean.length === 12)
    return `+57 ${clean.substring(2, 5)} ${clean.substring(5, 8)} ${clean.substring(8)}`;
  return `+${clean}`;
}

function formatCOP(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "No especificado";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return "No especificado";
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)} Mil M`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(0)} M`;
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(num);
}

function getPropTypeLabel(type: string | null | undefined): string {
  const m: Record<string, string> = {
    apartment: "Apartamento", house: "Casa", building: "Edificio",
    warehouse: "Bodega", farm: "Finca", hotel: "Hotel", office: "Oficina",
    land: "Lote/Terreno", commercial: "Local Comercial", loft: "Loft", consultorio: "Consultorio"
  };
  return m[type || ""] || type || "N/E";
}

function getTransactionLabel(type: string | null | undefined): string {
  const m: Record<string, string> = {
    venta: "Venta", arriendo: "Arriendo", arriendo_temporal: "Arriendo Temporal",
    permuta: "Permuta", aporte: "Aporte"
  };
  return m[type || ""] || type || "N/E";
}

type MatchStatus = "exact" | "ok" | "warn" | "missing";

function MatchBadge({ status }: { status: MatchStatus }) {
  const configs = {
    exact: { bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400", label: "✅ Exacto" },
    ok: { bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400", label: "✅ Cumple" },
    warn: { bg: "bg-amber-500/10 border-amber-500/30 text-amber-400", label: "⚠️ Aprox." },
    missing: { bg: "bg-red-500/10 border-red-500/30 text-red-400", label: "❌ No cumple" },
  };
  const c = configs[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${c.bg}`}>
      {c.label}
    </span>
  );
}

function ComparisonRow({ label, required, found, status, icon }: {
  label: string; required: string; found: string; status: MatchStatus; icon?: React.ReactNode;
}) {
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      <td className="py-2.5 px-4">
        <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">{icon}{label}</div>
      </td>
      <td className="py-2.5 px-4 text-xs text-cyan-300 font-medium max-w-[200px] break-words">{required}</td>
      <td className="py-2.5 px-4 text-xs text-[#bf953f] font-medium max-w-[200px] break-words">{found}</td>
      <td className="py-2.5 px-4"><MatchBadge status={status} /></td>
    </tr>
  );
}

function scoreRows(req: any, prop: any) {
  const rows: Array<{ label: string; required: string; found: string; status: MatchStatus; icon?: React.ReactNode }> = [];
  let pts = 0; let max = 0;

  const add = (label: string, required: string, found: string, status: MatchStatus, weight: number, icon?: React.ReactNode) => {
    pts += status === "exact" || status === "ok" ? weight : status === "warn" ? Math.floor(weight * 0.5) : 0;
    max += weight;
    rows.push({ label, required, found, status, icon });
  };

  const cleanText = (t: string) => (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // 1. Tipo de Inmueble
  const reqType = req.tipoInmuebleDeseado || req.propertyType;
  const propType = prop.propertyType;
  const typeS: MatchStatus = !reqType || !propType || reqType.toLowerCase() === propType.toLowerCase() ? "exact" : "missing";
  add("Tipo de Inmueble", getPropTypeLabel(reqType), getPropTypeLabel(propType), typeS, 20, <Building2 className="w-3.5 h-3.5" />);

  // 2. Tipo de Negocio
  const reqBiz = req.tipoNegocioDeseado || req.transactionType;
  const propBiz = prop.transactionType;
  const reqTypes: string[] = Array.isArray(req.tiposNegocioAceptados) && req.tiposNegocioAceptados.length > 0
    ? req.tiposNegocioAceptados
    : (reqBiz ? [reqBiz] : ["venta"]);
  const propTypes: string[] = Array.isArray(prop.acceptedTransactionTypes) && prop.acceptedTransactionTypes.length > 0
    ? prop.acceptedTransactionTypes
    : (propBiz ? [propBiz] : ["venta"]);

  const txCompatible = reqTypes.some(rt =>
    propTypes.some(pt =>
      pt === rt ||
      (rt === "venta" && pt === "permuta") ||
      (rt === "permuta" && pt === "venta") ||
      (rt === "venta" && pt === "aporte") ||
      (rt === "aporte" && pt === "venta")
    )
  );
  const txS: MatchStatus = txCompatible ? "exact" : "missing";
  add("Tipo de Negocio", getTransactionLabel(reqBiz), getTransactionLabel(propBiz), txS, 15, <ArrowRightLeft className="w-3.5 h-3.5" />);

  // 3. Ubicación / Barrio
  const reqCity = req.ciudadDeseada || req.city || "";
  const propCity = prop.city || prop.addressCity || "";
  const reqZone = req.zonaDeseada || req.addressNeighborhood || "";
  const propZone = prop.zone || prop.addressNeighborhood || "";
  
  const reqCityClean = cleanText(reqCity);
  const propCityClean = cleanText(propCity);
  const reqZoneClean = cleanText(reqZone);
  const propZoneClean = cleanText(propZone);
  
  let locS: MatchStatus = "exact";
  if (reqCityClean && propCityClean && reqCityClean !== propCityClean) {
    locS = "missing";
  } else if (reqZoneClean) {
    const santas = ["santa barbara oriental", "santa barbara central", "santa barbara occidental", "santa ana oriental", "santa ana occidental", "santa paula", "santa bibiana", "san patricio", "navarra", "chico navarra", "molinos norte", "usaquen", "multicentro"];
    const chico = ["chico norte", "chico reservado", "chico reservado norte", "chico", "chico navarra", "chico sur"];
    
    const isSantas = (z: string) => z.includes("santas") || z === "santa barbara" || z === "santa ana";
    const isChico = (z: string) => z.includes("chico");
    
    const hasNominal = propZoneClean.includes(reqZoneClean) || reqZoneClean.includes(propZoneClean);
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

  // 6. Habitaciones (Exactas)
  const bedR = req.habitacionesMin ? Number(req.habitacionesMin) : 0;
  const bedP = prop.bedrooms ? Number(prop.bedrooms) : 0;
  const bedS: MatchStatus = !bedR ? "exact" : bedP === bedR ? "exact" : "missing";
  add("Habitaciones", bedR ? `${bedR} hab. (Exacto)` : "N/E", bedP ? `${bedP} hab.` : "N/E", bedS, 8, <Bed className="w-3.5 h-3.5" />);

  // 7. Baños (Exactos)
  const bathR = req.banosMin ? Number(req.banosMin) : 0;
  const bathP = prop.bathrooms ? Number(prop.bathrooms) : 0;
  const bathS: MatchStatus = !bathR ? "exact" : bathP === bathR ? "exact" : "missing";
  add("Baños", bathR ? `${bathR} baños (Exacto)` : "N/E", bathP ? `${bathP} baños` : "N/E", bathS, 5, <Bath className="w-3.5 h-3.5" />);

  // 8. Parqueaderos (Exactos)
  const garR = req.parqueaderosMin ? Number(req.parqueaderosMin) : 0;
  const garP = prop.garages ? Number(prop.garages) : 0;
  const garS: MatchStatus = !garR ? "exact" : garP === garR ? "exact" : "missing";
  add("Parqueaderos", garR ? `${garR} garajes (Exacto)` : "N/E", garP ? `${garP} garajes` : "N/E", garS, 5, <Car className="w-3.5 h-3.5" />);

  // 9. Estrato
  const estratoArr: number[] = Array.isArray(req.estratoDeseado) ? req.estratoDeseado : [];
  const estratoP = prop.stratum;
  const estS: MatchStatus = !estratoArr.length || !estratoP ? "exact" : estratoArr.includes(estratoP) ? "exact" : "warn";
  add("Estrato", estratoArr.length ? `Estrato(s) ${estratoArr.join(", ")}` : "Cualquiera", estratoP ? `Estrato ${estratoP}` : "N/E", estS, 7, <Shield className="w-3.5 h-3.5" />);

  // 10. Piso / Altura
  const reqFloor = req.caracteristicasDeseadas?.floorDetail || req.floorDetail;
  const propFloor = prop.floorDetail || prop.amenities?.floorDetail;
  let floorS: MatchStatus = "exact";
  if (reqFloor && propFloor && reqFloor !== "NA" && propFloor !== "NA" && String(reqFloor).trim() !== "" && String(propFloor).trim() !== "") {
    if (propType === "house") {
      const cleanF = (f: string) => cleanText(f).replace(/\b(pisos|niveles|piso|nivel|plantas|planta)\b/g, "").trim();
      floorS = cleanF(reqFloor) === cleanF(propFloor) ? "exact" : "missing";
    } else if (propType === "apartment") {
      const rFNum = parseInt(String(reqFloor).replace(/\D/g, ""));
      const pFNum = parseInt(String(propFloor).replace(/\D/g, ""));
      if (!isNaN(rFNum) && !isNaN(pFNum)) {
        if (pFNum === rFNum) {
          floorS = "exact";
        } else if (pFNum === rFNum + 1) {
          floorS = "warn";
        } else {
          floorS = "missing";
        }
      } else {
        floorS = cleanText(String(propFloor)) === cleanText(String(reqFloor)) ? "exact" : "missing";
      }
    }
  }
  if (reqFloor || propFloor) {
    add("Piso / Altura", reqFloor || "N/E", propFloor || "N/E", floorS, 5, <SlidersHorizontal className="w-3.5 h-3.5" />);
  }

  // 11. Características Especiales
  const reqTextNorm = cleanText(req.rawText || "");
  const propTextNorm = cleanText(prop.rawText || prop.description || "");
  const keywordsToCheck = [
    { label: "Terraza", terms: ["terraza"] },
    { label: "Balcón", terms: ["balcon", "balcón"] },
    { label: "Chimenea", terms: ["chimene"] },
    { label: "Club House", terms: ["club house", "clubhouse", "club-house"] },
    { label: "Estudio", terms: ["estudio"] }
  ];
  keywordsToCheck.forEach(kw => {
    const requested = kw.terms.some(t => reqTextNorm.includes(t));
    if (requested) {
      const found = kw.terms.some(t => propTextNorm.includes(t));
      const status = found ? "exact" : "missing";
      add(kw.label, "Solicitado", found ? "Presente" : "No mencionado", status, 5, <Sparkles className="w-3.5 h-3.5" />);
    }
  });

  const hasHardMismatch = rows.some(r => r.status === "missing");
  const finalScore = hasHardMismatch ? 0 : (max > 0 ? Math.round((pts / max) * 100) : 0);

  return { rows, autoScore: finalScore };
}

function MatchCard({ m, idx }: { m: any; idx: number }) {
  const [expanded, setExpanded] = useState(false);
  const score = parseFloat(m.matchScore?.toString() || "0");
  const { rows, autoScore } = useMemo(() => scoreRows(m.requirement, m.property), [m]);
  const date = new Date(m.createdAt || new Date()).toLocaleString("es-CO", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const exactCount = rows.filter(r => r.status === "exact" || r.status === "ok").length;
  const warnCount = rows.filter(r => r.status === "warn").length;
  const failCount = rows.filter(r => r.status === "missing").length;
  const dotColor = score >= 95 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : score >= 80 ? "bg-[#bf953f] shadow-[0_0_8px_rgba(191,149,63,0.5)]" : "bg-cyan-500";
  const scoreColor = score >= 95 ? "text-emerald-400" : score >= 80 ? "text-[#bf953f]" : "text-cyan-400";

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.35, delay: Math.min(idx * 0.04, 0.4) }}
      className="group bg-[#0a0a0a] border border-white/5 hover:border-[#bf953f]/25 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300">

      {/* Header */}
      <div className="bg-white/[0.02] px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
          <span className={`text-xl font-extrabold tracking-tight ${scoreColor}`}>{score.toFixed(0)}%</span>
          <span className="text-zinc-500 text-sm">Afinidad registrada por IA</span>
          {score >= 95 && <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full font-bold">⭐ MATCH PERFECTO</span>}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-mono"><Calendar className="w-3.5 h-3.5" />{date}</div>
          <span className="text-[10px] text-zinc-700 font-mono">Match #{m.id}</span>
        </div>
      </div>

      {/* Quick badges */}
      <div className="px-6 py-2.5 flex items-center gap-3 border-b border-white/5 flex-wrap">
        <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">Cotejo:</span>
        <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-2.5 h-2.5" />{exactCount} coinciden</span>
        {warnCount > 0 && <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full"><AlertTriangle className="w-2.5 h-2.5" />{warnCount} aproximados</span>}
        {failCount > 0 && <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full"><XCircle className="w-2.5 h-2.5" />{failCount} no cumplen</span>}
        <span className="ml-auto text-[10px] text-zinc-600">Score recalculado: <strong className="text-zinc-400">{autoScore}%</strong></span>
      </div>

      {/* Parties */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#111] border border-white/10 items-center justify-center text-[#bf953f] z-10">
          <ArrowRightLeft className="w-4 h-4" />
        </div>

        {/* Inmueble */}
        <div className="space-y-3">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#bf953f] bg-[#bf953f]/5 px-2 py-0.5 rounded border border-[#bf953f]/15">🏢 Inmueble / Oferta</span>
          <h4 className="text-base font-bold text-white mt-1">{m.property.name}</h4>
          {(m.property.rawText || m.property.description) && (
            <p className="text-xs text-zinc-500 italic leading-relaxed line-clamp-3">"{m.property.rawText || m.property.description}"</p>
          )}
          <div className="bg-[#bf953f]/5 border border-[#bf953f]/10 rounded-2xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#bf953f]/10 border border-[#bf953f]/20 flex items-center justify-center text-[#bf953f]"><Phone className="w-3.5 h-3.5" /></div>
              <div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Asesor Captador (Owner)</p>
                <p className="text-xs font-bold text-zinc-200">{formatPhoneDisplay(m.property.idUsuarioWhatsapp)}</p>
              </div>
            </div>
            {m.property.idUsuarioWhatsapp && (
              <a href={getWhatsAppLink(m.property.idUsuarioWhatsapp)} target="_blank" rel="noopener noreferrer"
                className="bg-[#25D366] hover:bg-[#20ba5a] text-black text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors">
                WA <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </div>

        {/* Requerimiento */}
        <div className="space-y-3 md:pl-4">
          <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/15">🔍 Requerimiento / Demanda</span>
          <h4 className="text-base font-bold text-white mt-1">{m.requirement.name || `Requerimiento #${m.requirement.id}`}</h4>
          {m.requirement.rawText && (
            <p className="text-xs text-zinc-500 italic leading-relaxed line-clamp-3">"{m.requirement.rawText}"</p>
          )}
          <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-2xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400"><Phone className="w-3.5 h-3.5" /></div>
              <div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Asesor Buscador (Seeker)</p>
                <p className="text-xs font-bold text-zinc-200">{formatPhoneDisplay(m.requirement.idUsuarioWhatsapp)}</p>
              </div>
            </div>
            {m.requirement.idUsuarioWhatsapp && (
              <a href={getWhatsAppLink(m.requirement.idUsuarioWhatsapp)} target="_blank" rel="noopener noreferrer"
                className="bg-[#25D366] hover:bg-[#20ba5a] text-black text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors">
                WA <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Expandable comparison table */}
      <div className="border-t border-white/5">
        <button onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-6 py-3 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-[#bf953f] hover:bg-white/[0.02] transition-all">
          <span className="flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5" />Ver cotejo detallado campo por campo</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-4 pb-4 overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 px-4 text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Característica</th>
                      <th className="text-left py-2 px-4 text-cyan-500 text-[10px] uppercase tracking-widest font-bold">🔍 Buscado</th>
                      <th className="text-left py-2 px-4 text-[#bf953f] text-[10px] uppercase tracking-widest font-bold">🏢 Encontrado</th>
                      <th className="text-left py-2 px-4 text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => <ComparisonRow key={i} {...row} />)}
                  </tbody>
                </table>
              </div>
              {m.matchReason && (
                <div className="mx-4 mb-5 bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex gap-3">
                  <div className="p-1.5 rounded-lg bg-[#bf953f]/10 text-[#bf953f] mt-0.5 shrink-0"><MessageSquare className="w-4 h-4" /></div>
                  <div>
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Razón del Motor de IA</h5>
                    <p className="text-sm text-zinc-300 font-light leading-relaxed">{m.matchReason}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function MatchesReport() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem("vecy_admin_auth") === "1");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem("vecy_admin_auth", "1");
      setIsAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Contraseña incorrecta.");
      setPassword("");
    }
  };

  const { data: matches, isLoading, refetch, isFetching } = trpc.janIA.getAllMatches.useQuery(undefined, { enabled: isAuthenticated });
  const [searchTerm, setSearchTerm] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [selectedCity, setSelectedCity] = useState("Todas");
  const [showFilters, setShowFilters] = useState(false);

  const cities = useMemo(() => ["Todas", ...Array.from(new Set((matches || []).map(m => m.property.city).filter(Boolean)))], [matches]);
  const filteredMatches = useMemo(() => (matches || []).filter(m => {
    const score = parseFloat(m.matchScore?.toString() || "0");
    if (score < minScore) return false;
    if (selectedCity !== "Todas" && m.property.city !== selectedCity) return false;
    if (searchTerm.trim()) {
      const text = [m.property.name, m.property.zone, m.property.city, m.requirement.name, m.requirement.zonaDeseada, m.requirement.rawText, m.property.rawText].filter(Boolean).join(" ").toLowerCase();
      if (!text.includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  }), [matches, minScore, selectedCity, searchTerm]);

  const totalCount = matches?.length || 0;
  const avgScore = totalCount > 0 ? ((matches!.reduce((a, m) => a + parseFloat(m.matchScore?.toString() || "0"), 0)) / totalCount).toFixed(1) : "0";
  const perfectCount = (matches || []).filter(m => parseFloat(m.matchScore?.toString() || "0") >= 95).length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#060606] text-white flex flex-col items-center justify-center px-4">
        <Navbar />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-[#0c0c0c] border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl mt-20">
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[#bf953f]/10 border border-[#bf953f]/20 flex items-center justify-center">
              <Lock className="w-7 h-7 text-[#bf953f]" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-white">Panel Privado de Administración</h1>
              <p className="text-sm text-zinc-500 mt-1">Acceso restringido — Solo administradores de Vecy Network</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="relative">
              <input type={showPassword ? "text" : "password"} placeholder="Contraseña de administrador"
                value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()}
                className="w-full bg-white/5 border border-white/10 focus:border-[#bf953f] rounded-xl px-4 py-3 pr-12 text-sm outline-none transition-all" />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {authError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{authError}</p>}
            <Button onClick={handleLogin} className="w-full bg-[#bf953f] hover:bg-[#d4aa55] text-black font-bold rounded-xl h-11">
              Ingresar al Panel de Matches
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060606] text-white selection:bg-[#bf953f]/30">
      <Navbar />
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-900/8 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[700px] h-[700px] bg-[#bf953f]/4 rounded-full blur-[160px] pointer-events-none" />
      <main className="container pt-32 pb-24 relative z-10">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-[#bf953f]/10 border border-[#bf953f]/20 text-[#bf953f]"><Sparkles className="w-4 h-4 animate-pulse" /></span>
              <span className="text-xs font-bold tracking-widest uppercase text-[#bf953f]">Panel Privado · Admin</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
              Matches de JanIA
            </h1>
            <p className="text-zinc-400 mt-2 font-light max-w-xl text-sm">Cotejo completo campo por campo entre Oferta (Inmuebles) y Demanda (Requerimientos).</p>
          </div>
          <div className="flex items-center gap-3 self-end md:self-auto">
            <Button onClick={() => refetch()} disabled={isFetching} variant="outline"
              className="border-white/10 bg-white/5 hover:bg-white/10 hover:text-white flex items-center gap-2 rounded-xl h-10">
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />Sincronizar
            </Button>
            <Button onClick={() => { sessionStorage.removeItem("vecy_admin_auth"); setIsAuthenticated(false); }}
              variant="outline" className="border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 flex items-center gap-2 rounded-xl h-10">
              <Lock className="w-4 h-4" />Cerrar Sesión
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Matches", value: totalCount, subtitle: "Histórico en BD", icon: ArrowRightLeft, color: "from-blue-500/10 to-cyan-500/10 border-blue-500/20 text-blue-400" },
            { label: "Score Promedio", value: `${avgScore}%`, subtitle: "Afinidad media", icon: TrendingUp, color: "from-amber-500/10 to-[#bf953f]/10 border-[#bf953f]/20 text-[#bf953f]" },
            { label: "Matches Perfectos", value: perfectCount, subtitle: "Score >= 95%", icon: Sparkles, color: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-400" },
            { label: "Mostrando", value: `${filteredMatches.length}/${totalCount}`, subtitle: "Con filtros", icon: SlidersHorizontal, color: "from-purple-500/10 to-pink-500/10 border-purple-500/20 text-purple-400" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className={`bg-gradient-to-br ${s.color} border rounded-2xl p-5 relative overflow-hidden`}>
              <div className="absolute right-4 top-4 opacity-10"><s.icon className="w-12 h-12" /></div>
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">{s.label}</p>
              <h3 className="text-3xl font-extrabold mt-1 tracking-tight">{s.value}</h3>
              <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">{s.subtitle}</p>
            </motion.div>
          ))}
        </div>

        <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative w-full md:flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input type="text" placeholder="Buscar por barrio, ciudad, inmueble, requerimiento..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-[#bf953f] transition-all" />
            </div>
            <Button onClick={() => setShowFilters(!showFilters)} variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 hover:text-white flex items-center gap-2 rounded-xl h-11">
              <SlidersHorizontal className="w-4 h-4" />Filtros
            </Button>
          </div>
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-4 pt-4 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-zinc-400"><span>Afinidad mínima</span><span className="font-bold text-[#bf953f]">{minScore}%</span></div>
                  <input type="range" min="0" max="100" value={minScore} onChange={e => setMinScore(parseInt(e.target.value))} className="w-full accent-[#bf953f] h-1.5 rounded-lg appearance-none cursor-pointer" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Ciudad</label>
                  <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-[#bf953f] text-zinc-300">
                    {cities.map(c => <option key={c} value={c} className="bg-[#0c0c0c]">{c}</option>)}
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="w-10 h-10 text-[#bf953f] animate-spin" />
            <p className="text-zinc-500 font-mono text-sm">Cargando matches de JanIA...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-16 text-center">
            <HomeIcon className="w-12 h-12 text-[#bf953f] mx-auto mb-4 opacity-60" />
            <h3 className="text-lg font-bold">No hay coincidencias con los filtros actuales</h3>
            <p className="text-zinc-500 text-sm mt-1">Reduce el filtro de afinidad o limpia la búsqueda.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {filteredMatches.map((m, idx) => <MatchCard key={m.id} m={m} idx={idx} />)}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
