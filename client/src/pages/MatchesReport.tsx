import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Sparkles, Search, Phone, MapPin, DollarSign, Home as HomeIcon,
  ArrowRightLeft, RefreshCw, Calendar, MessageSquare, CheckCircle2,
  XCircle, AlertTriangle, SlidersHorizontal, ExternalLink, Lock,
  Eye, EyeOff, BarChart3, Shield, Bed, Bath, Car, Ruler, Building2,
  TrendingUp, ChevronDown, ChevronUp, Star, CircleDot, Check, HelpCircle,
  Flame, Clock, CheckCircle, Ban, Zap, ArrowRight, Info
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

  // Regla estricta: Apartamento vs Apartaestudio vs Loft no coinciden
  const reqRawText = cleanText(req.rawText || req.name || "");
  const propRawText = cleanText(prop.rawText || prop.description || prop.name || "");
  
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

  let typeS: MatchStatus = "missing";
  if (reqSubtype && propSubtype) {
    const r = cleanText(reqSubtype);
    const p = cleanText(propSubtype);
    if (r === p || r.includes(p) || p.includes(r)) {
      typeS = "exact";
    }
  }

  add("Tipo de Inmueble", getPropTypeLabel(reqSubtype), getPropTypeLabel(propSubtype), typeS, 20, <Building2 className="w-3.5 h-3.5" />);

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

// Componente para calcular el Índice de Acción Comercial (IAc)
function calcularIAc(m: any): { score: number; label: string; color: string; badge: string } {
  const matchScore = parseFloat(m.matchScore?.toString() || "0");
  let score = matchScore;
  
  const ageDays = (Date.now() - new Date(m.createdAt || new Date()).getTime()) / (1000 * 60 * 60 * 24);
  
  // Factor de Recencia
  if (ageDays <= 0.083) { // < 2 horas
    score += 15;
  } else if (ageDays <= 1) { // < 24 horas
    score += 10;
  } else if (ageDays >= 30) {
    score -= 30;
  }

  // Factor de Actividad / Doble Opt-In
  if (m.ownerConfirmed || m.seekerConfirmed) {
    score += 15;
  }
  
  score = Math.max(0, Math.min(100, Math.round(score)));

  let label = "Oportunidad activa. Enviar propuesta.";
  let color = "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
  let badge = "💼 Activa";

  if (ageDays >= 30) {
    label = "⚠️ Verificar vigencia de publicación antes de contactar.";
    color = "text-red-400 bg-red-500/10 border-red-500/20";
    badge = "⚠️ Verificar";
  } else if (score >= 90) {
    label = "🔥 Llame ahora. Alta probabilidad de concretar.";
    color = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.2)]";
    badge = "🔥 Urgente";
  } else if (m.status === "interested") {
    label = "Conexión exitosa. Negociación en progreso.";
    color = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    badge = "🤝 Conectado";
  } else if (m.status === "rejected") {
    label = "Coincidencia descartada.";
    color = "text-zinc-500 bg-zinc-500/10 border-zinc-500/20";
    badge = "❌ Archivada";
  }

  return { score, label, color, badge };
}

function calcularScoresMatch(m: any): { tecnico: number; comercial: number; final: number } {
  const tecnico = Math.round(parseFloat(m.matchScore?.toString() || "0"));
  let comercial = 70; // fallback base
  if (m.ipc && (m.ipc as any).factors) {
    const f = (m.ipc as any).factors;
    comercial = Math.round(
      ((f.freshness || 0) + (f.brokerTrust || 0) + (f.dataQuality || 0) + (f.marketDemand || 0)) / 4
    );
  }
  const final = Math.round((tecnico * 0.6) + (comercial * 0.4));
  return { tecnico, comercial, final };
}

function calcularVigencia(m: any): { label: string; color: string; badge: string } {
  const ageDays = (Date.now() - new Date(m.createdAt || new Date()).getTime()) / (1000 * 60 * 60 * 24);
  const vigenteDias = import.meta.env.VITE_VIGENTE_DIAS ? parseInt(import.meta.env.VITE_VIGENTE_DIAS) : 7;
  const verificarDias = import.meta.env.VITE_VERIFICAR_DIAS ? parseInt(import.meta.env.VITE_VERIFICAR_DIAS) : 30;

  if (m.status === "rejected") {
    return { label: "Probablemente vendido", color: "text-red-400 bg-red-500/10 border-red-500/20", badge: "🔴 Vendido" };
  }
  if (ageDays < vigenteDias) {
    return { label: "Vigente", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", badge: "🟢 Vigente" };
  }
  if (ageDays <= verificarDias) {
    return { label: "Verificar vigencia", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", badge: "🟡 Verificar" };
  }
  return { label: "Probablemente vendido", color: "text-red-400 bg-red-500/10 border-red-500/20", badge: "🔴 Expirado" };
}

function PropertyTraceability({ property }: { property: any }) {
  const p = property;
  if (!p) return null;

  const firstPub = p.fechaPrimeraPublicacion ? new Date(p.fechaPrimeraPublicacion).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : "N/E";
  const lastPub = p.fechaUltimaPublicacion ? new Date(p.fechaUltimaPublicacion).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : "N/E";

  const history = p.publicationHistory || [];
  const visibleHistory = history.slice(0, 20);

  return (
    <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[#bf953f]" />
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Memoria Comercial del Inmueble</h4>
        </div>
        <span className="text-[9px] text-zinc-600 font-mono">
          Canónico: {p.canonicalExternalId || `LOCAL:${p.id}`}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
        <div className="bg-white/[0.01] border border-white/5 rounded-xl p-2">
          <p className="text-[7px] uppercase tracking-wider text-zinc-500 font-extrabold">Primera Publicación</p>
          <p className="text-xs font-bold text-zinc-300 mt-0.5">{firstPub}</p>
        </div>
        <div className="bg-white/[0.01] border border-white/5 rounded-xl p-2">
          <p className="text-[7px] uppercase tracking-wider text-zinc-500 font-extrabold">Última Publicación</p>
          <p className="text-xs font-bold text-zinc-300 mt-0.5">{lastPub}</p>
        </div>
        <div className="bg-white/[0.01] border border-white/5 rounded-xl p-2">
          <p className="text-[7px] uppercase tracking-wider text-[#bf953f] font-extrabold">Republicaciones</p>
          <p className="text-xs font-black text-[#bf953f] mt-0.5">{p.republicacionesCount || 0}</p>
        </div>
        <div className="bg-white/[0.01] border border-white/5 rounded-xl p-2">
          <p className="text-[7px] uppercase tracking-wider text-zinc-500 font-extrabold">Estado Comercial</p>
          <p className="text-xs font-bold text-emerald-400 mt-0.5">{p.estadoComercial || "ACTIVO"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs border-t border-white/5 pt-3">
        <div className="space-y-0.5">
          <span className="text-zinc-600 text-[8px] uppercase font-bold tracking-wider">Portal</span>
          <p className="text-zinc-400 font-medium">{p.portal || "WhatsApp / Directo"}</p>
        </div>
        <div className="space-y-0.5">
          <span className="text-zinc-600 text-[8px] uppercase font-bold tracking-wider">Código Portal</span>
          <p className="text-zinc-400 font-medium font-mono truncate">{p.externalListingId || "N/A"}</p>
        </div>
        <div className="space-y-0.5">
          <span className="text-zinc-600 text-[8px] uppercase font-bold tracking-wider">Vigencia IA</span>
          <p className="text-zinc-400 font-medium">{p.vigenciaIa || "VIGENTE"}</p>
        </div>
      </div>

      {visibleHistory.length > 0 && (
        <div className="space-y-2 border-t border-white/5 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 text-[8px] uppercase font-black tracking-widest">Cronología de Publicación</span>
            <span className="text-[8px] text-zinc-600 font-mono">(Historial visible: {visibleHistory.length})</span>
          </div>
          <div className="max-h-[140px] overflow-y-auto border border-white/5 rounded-xl divide-y divide-white/5 bg-black/20">
            {visibleHistory.map((item: any, idx: number) => {
              const itemDate = new Date(item.fecha).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
              return (
                <div key={idx} className="p-2 text-[10px] flex items-center justify-between gap-2 hover:bg-white/[0.01] transition-all">
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-mono text-zinc-500 bg-white/5 px-1.5 py-0.2 rounded uppercase font-bold">{item.accion}</span>
                    <div>
                      <p className="text-zinc-300 font-semibold">{item.broker || "Asesor desconocido"}</p>
                      <p className="text-zinc-500 text-[9px]">{item.grupo || "WhatsApp"}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[9px] text-zinc-500 font-mono">{itemDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Componente para renderizar el Semáforo VRIF
function VrifTrafficLight({ score }: { score: number }) {
  let colorClass = "";
  let labelText = "";
  let glowClass = "";

  if (score >= 95) {
    colorClass = "bg-emerald-500 border-emerald-400";
    glowClass = "shadow-[0_0_12px_rgba(16,185,129,0.7)]";
    labelText = "Nivel 1: Match Certificado";
  } else if (score >= 80) {
    colorClass = "bg-[#bf953f] border-[#d4aa55]";
    glowClass = "shadow-[0_0_12px_rgba(191,149,63,0.6)]";
    labelText = "Nivel 2: Alta Afinidad";
  } else {
    colorClass = "bg-amber-600 border-amber-500";
    glowClass = "shadow-[0_0_12px_rgba(217,119,6,0.6)]";
    labelText = "Nivel 3: Ajuste Sugerido";
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full border ${colorClass} ${glowClass} inline-block`} />
      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{labelText}</span>
    </div>
  );
}

// Componente para renderizar las estrellas de confianza
function TrustStars({ dataQuality }: { dataQuality: number }) {
  const starsCount = dataQuality > 80 ? 5 : dataQuality > 60 ? 4 : dataQuality > 40 ? 3 : dataQuality > 20 ? 2 : 1;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i < starsCount ? "text-amber-400 fill-amber-400" : "text-zinc-700 fill-zinc-800"
          }`}
        />
      ))}
    </div>
  );
}

// Componente para renderizar el desglose del IPC
function IpcBreakdown({ ipc }: { ipc: any }) {
  if (!ipc || !ipc.factors) {
    return (
      <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex items-center justify-center h-full">
        <span className="text-zinc-600 text-xs italic">IPC no disponible para este match (v1.0)</span>
      </div>
    );
  }

  const { score, factors } = ipc;
  const labels: Record<string, string> = {
    matching: "Afinidad Core",
    freshness: "Recencia / Frescura",
    brokerTrust: "Confianza Perfil",
    dataQuality: "Calidad de Datos",
    marketDemand: "Demanda / Precio"
  };

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#bf953f]">Métricas del Cierre</h5>
          <h4 className="text-xs font-semibold text-zinc-300 mt-0.5">Índice Probabilidad de Cierre (IPC)</h4>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-2xl font-black text-amber-400 tracking-tight">{score}%</span>
          </div>
          <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-mono">Alta Probabilidad de Cierre</p>
        </div>
      </div>

      <div className="space-y-2.5 border-t border-white/5 pt-3">
        {Object.entries(factors).map(([key, val]: any) => (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-zinc-400">{labels[key] || key}</span>
              <span className="text-zinc-300 font-mono font-bold">{val}%</span>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#bf953f] h-full rounded-full transition-all duration-500"
                style={{ width: `${val}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="text-[9px] text-zinc-500 text-right font-mono italic">
        Última calibración: VRIF Core 2.0
      </div>
    </div>
  );
}

// Línea de tiempo interactiva VRIF del Match
function VrifTimeline({ m }: { m: any }) {
  const score = parseFloat(m.matchScore?.toString() || "0");
  const dateStr = new Date(m.createdAt || new Date()).toLocaleDateString("es-CO", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const steps = [
    {
      title: "1. Match Encontrado",
      desc: `Afinidad del ${score.toFixed(0)}% calculada por el motor de matching.`,
      status: "done",
      info: dateStr
    },
    {
      title: "2. Doble Confirmación (Bilateral)",
      desc: "Ambos corredores deben autorizar de manera privada compartir la información.",
      status: m.ownerConfirmed && m.seekerConfirmed ? "done" : (m.ownerConfirmed || m.seekerConfirmed ? "pending" : "waiting"),
      details: (
        <div className="flex gap-4 mt-2">
          <div className="flex items-center gap-1 bg-white/[0.02] border border-white/5 px-2 py-1 rounded text-[10px]">
            <span className={`w-1.5 h-1.5 rounded-full ${m.ownerConfirmed ? "bg-emerald-500" : "bg-zinc-600"}`} />
            <span className="text-zinc-400">Oferente: {m.ownerConfirmed ? "Confirmó" : "Pendiente"}</span>
          </div>
          <div className="flex items-center gap-1 bg-white/[0.02] border border-white/5 px-2 py-1 rounded text-[10px]">
            <span className={`w-1.5 h-1.5 rounded-full ${m.seekerConfirmed ? "bg-emerald-500" : "bg-zinc-600"}`} />
            <span className="text-zinc-400">Demandante: {m.seekerConfirmed ? "Confirmó" : "Pendiente"}</span>
          </div>
        </div>
      )
    },
    {
      title: "3. Conexión de Negocio",
      desc: "El sistema genera y comparte el enlace de WhatsApp y teléfono directo.",
      status: m.status === "interested" ? "done" : (m.status === "rejected" ? "error" : "waiting")
    }
  ];

  return (
    <div className="space-y-4">
      <h5 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Línea de Tiempo del Match</h5>
      <div className="relative pl-6 border-l border-white/5 space-y-5">
        {steps.map((s, idx) => (
          <div key={idx} className="relative">
            <span
              className={`absolute -left-[30px] top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center text-[8px] font-bold ${
                s.status === "done"
                  ? "bg-emerald-950 border-emerald-500 text-emerald-400"
                  : s.status === "error"
                  ? "bg-red-950 border-red-500 text-red-400"
                  : s.status === "pending"
                  ? "bg-amber-950 border-amber-500 text-amber-400 animate-pulse"
                  : "bg-zinc-900 border-zinc-700 text-zinc-500"
              }`}
            >
              {s.status === "done" ? <Check className="w-2.5 h-2.5" /> : idx + 1}
            </span>

            <div>
              <div className="flex items-center justify-between gap-2">
                <h6 className="text-xs font-bold text-zinc-200">{s.title}</h6>
                {s.info && <span className="text-[9px] font-mono text-zinc-500">{s.info}</span>}
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{s.desc}</p>
              {s.details}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchCard({ m, idx }: { m: any; idx: number }) {
  const [expanded, setExpanded] = useState(false);
  const score = parseFloat(m.matchScore?.toString() || "0");
  const { rows, autoScore } = useMemo(() => scoreRows(m.requirement, m.property), [m]);
  const date = new Date(m.createdAt || new Date()).toLocaleString("es-CO", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const exactCount = rows.filter(r => r.status === "exact" || r.status === "ok").length;
  const warnCount = rows.filter(r => r.status === "warn").length;
  const failCount = rows.filter(r => r.status === "missing").length;
  const scoreColor = score >= 95 ? "text-emerald-400" : score >= 80 ? "text-[#bf953f]" : "text-cyan-400";
  const iac = useMemo(() => calcularIAc(m), [m]);
  const scores = useMemo(() => calcularScoresMatch(m), [m]);
  const vigencia = useMemo(() => calcularVigencia(m), [m]);

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.35, delay: Math.min(idx * 0.04, 0.4) }}
      className="group bg-[#0a0a0a] border border-white/5 hover:border-[#bf953f]/25 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300">

      {/* Header */}
      <div className="bg-white/[0.02] px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/5">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`text-xl font-extrabold tracking-tight ${scoreColor}`}>{scores.final}%</span>
          <VrifTrafficLight score={scores.final} />
          {m.ipc && <TrustStars dataQuality={(m.ipc as any)?.factors?.dataQuality || 80} />}
          {scores.final >= 95 && <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full font-bold">⭐ MATCH PERFECTO</span>}
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-bold ${vigencia.color}`}>
            {vigencia.badge}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-mono"><Calendar className="w-3.5 h-3.5" />{date}</div>
          <span className="text-[10px] text-zinc-700 font-mono">Match #{m.id}</span>
        </div>
      </div>

      {/* Quick stats & IAc Banner */}
      <div className="px-6 py-2.5 flex items-center justify-between border-b border-white/5 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">Cotejo:</span>
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-2.5 h-2.5" />{exactCount} coinciden</span>
          {warnCount > 0 && <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full"><AlertTriangle className="w-2.5 h-2.5" />{warnCount} aproximados</span>}
          {failCount > 0 && <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full"><XCircle className="w-2.5 h-2.5" />{failCount} no cumplen</span>}
        </div>
        {/* IAc indicator */}
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold ${iac.color}`}>
          <span>{iac.badge} (IAc: {iac.score}%)</span>
          <span className="opacity-90 font-light">— {iac.label}</span>
        </div>
      </div>

      {/* Visual Scores Grid (Diferenciar Técnico y Comercial) */}
      <div className="mx-6 my-4 grid grid-cols-3 gap-3 bg-white/[0.01] border border-white/5 rounded-2xl p-3 text-center">
        <div className="space-y-1">
          <p className="text-[8px] uppercase tracking-wider font-extrabold text-zinc-500">Match Técnico</p>
          <div className="text-sm font-black text-cyan-400">{scores.tecnico}%</div>
          <p className="text-[7px] text-zinc-500 font-medium">Cotejo parámetros</p>
        </div>
        <div className="space-y-1 border-l border-white/5">
          <p className="text-[8px] uppercase tracking-wider font-extrabold text-zinc-500">Match Comercial</p>
          <div className="text-sm font-black text-amber-400">{scores.comercial}%</div>
          <p className="text-[7px] text-zinc-500 font-medium">Perfil, calidad y recencia</p>
        </div>
        <div className="space-y-1 border-l border-white/5 bg-[#bf953f]/5 rounded-xl py-1">
          <p className="text-[8px] uppercase tracking-wider font-extrabold text-[#bf953f]">Match Final VRIF</p>
          <div className="text-sm font-black text-white">{scores.final}%</div>
          <p className="text-[7px] text-[#bf953f] font-bold">Promedio ponderado</p>
        </div>
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
            <p className="text-xs text-zinc-300 bg-white/[0.02] border border-white/5 p-3 rounded-xl italic leading-relaxed whitespace-pre-wrap">
              "{m.property.rawText || m.property.description}"
            </p>
          )}
          <div className="bg-[#bf953f]/5 border border-[#bf953f]/10 rounded-2xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#bf953f]/10 border border-[#bf953f]/20 flex items-center justify-center text-[#bf953f]"><Phone className="w-3.5 h-3.5" /></div>
              <div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Asesor Captador (Owner)</p>
                <p className="text-xs font-bold text-zinc-200">{formatPhoneDisplay(m.property.idUsuarioWhatsapp)}</p>
                <p className="text-[10px] text-zinc-500 font-mono select-all">+{m.property.idUsuarioWhatsapp?.split('@')[0]}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {m.property.externalUrl && (
                <a href={m.property.externalUrl} target="_blank" rel="noopener noreferrer"
                  className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors">
                  Ver en {m.property.portal || "Portal"} <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
              {m.property.idUsuarioWhatsapp && (
                <a href={getWhatsAppLink(m.property.idUsuarioWhatsapp)} target="_blank" rel="noopener noreferrer"
                  className="bg-[#25D366] hover:bg-[#20ba5a] text-black text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors">
                  WA <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Requerimiento */}
        <div className="space-y-3 md:pl-4">
          <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/15">🔍 Requerimiento / Demanda</span>
          <h4 className="text-base font-bold text-white mt-1">{m.requirement.name || `Requerimiento #${m.requirement.id}`}</h4>
          {m.requirement.rawText && (
            <p className="text-xs text-zinc-300 bg-white/[0.02] border border-white/5 p-3 rounded-xl italic leading-relaxed whitespace-pre-wrap">
              "{m.requirement.rawText}"
            </p>
          )}
          <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-2xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400"><Phone className="w-3.5 h-3.5" /></div>
              <div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Asesor Buscador (Seeker)</p>
                <p className="text-xs font-bold text-zinc-200">{formatPhoneDisplay(m.requirement.idUsuarioWhatsapp)}</p>
                <p className="text-[10px] text-zinc-500 font-mono select-all">+{m.requirement.idUsuarioWhatsapp?.split('@')[0]}</p>
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

      {/* Expandable detailed analysis */}
      <div className="border-t border-white/5">
        <button onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-6 py-3 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-[#bf953f] hover:bg-white/[0.02] transition-all">
          <span className="flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5" />Ver análisis completo y métricas VRIF</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-6 pb-6 pt-2 grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div className="lg:col-span-2 space-y-4">
                  <div className="overflow-x-auto">
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
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex gap-3">
                      <div className="p-1.5 rounded-lg bg-[#bf953f]/10 text-[#bf953f] mt-0.5 shrink-0"><MessageSquare className="w-4 h-4" /></div>
                      <div>
                        <h5 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Razón del Motor de IA</h5>
                        <p className="text-xs text-zinc-300 font-light leading-relaxed">{m.matchReason}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <IpcBreakdown ipc={m.ipc} />
                  <VrifTimeline m={m} />
                  <PropertyTraceability property={m.property} />
                </div>

              </div>
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
  
  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [selectedCity, setSelectedCity] = useState("Todas");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [activePipelineFilter, setActivePipelineFilter] = useState<string | null>(null);

  // Table expanded row state
  const [expandedTableRows, setExpandedTableRows] = useState<Record<number, boolean>>({});

  const toggleTableRow = (id: number) => {
    setExpandedTableRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Unique cities list
  const cities = useMemo(() => ["Todas", ...Array.from(new Set((matches || []).map(m => m.property.city).filter(Boolean)))], [matches]);

  // Nivel 1: Acciones urgentes del bróker (basado en el estado del Doble Opt-In)
  const nivel1Stats = useMemo(() => {
    const list = matches || [];
    const now = Date.now();
    
    return {
      atenderHoy: list.filter(m => m.status === "suggested" && (!m.ownerConfirmed || !m.seekerConfirmed)).length,
      esperandoMiConfirmacion: list.filter(m => m.status === "suggested" && !m.ownerConfirmed && !m.seekerConfirmed).length,
      esperandoBilateral: list.filter(m => m.status === "suggested" && (m.ownerConfirmed !== m.seekerConfirmed)).length,
      expiraranHoy: list.filter(m => m.status === "suggested" && (now - new Date(m.createdAt).getTime()) / (1000 * 60 * 60 * 24) >= 7).length,
    };
  }, [matches]);

  // Nivel 2: KPIs de Gestión Avanzados
  const kpis = useMemo(() => {
    const list = matches || [];
    const total = list.length;
    const totalSuggested = list.filter(m => m.status === "suggested").length;
    const totalInterested = list.filter(m => m.status === "interested").length;
    const totalRejected = list.filter(m => m.status === "rejected").length;
    
    // Tasas
    const avgAfinidad = total > 0 ? (list.reduce((acc, m) => acc + parseFloat(m.matchScore?.toString() || "0"), 0) / total) : 0;
    const avgIpc = total > 0 ? (list.reduce((acc, m) => acc + (m.ipc ? (m.ipc as any).score : 0), 0) / total) : 0;
    const tasaAceptacion = (totalInterested + totalRejected) > 0 ? (totalInterested / (totalInterested + totalRejected)) * 100 : 0;
    const tasaConversion = total > 0 ? (totalInterested / total) * 100 : 0;

    return {
      total,
      avgAfinidad: avgAfinidad.toFixed(1),
      avgIpc: avgIpc.toFixed(1),
      tasaAceptacion: tasaAceptacion.toFixed(1),
      tasaConversion: tasaConversion.toFixed(1),
      totalInterested,
      totalRejected
    };
  }, [matches]);

  // Pipeline Comercial Extendido de 7 niveles (Funnel)
  const pipelineStats = useMemo(() => {
    const list = matches || [];
    return {
      analizado: list.length, // Todo lo ingresado es analizado
      compatible: list.filter(m => parseFloat(m.matchScore?.toString() || "0") >= 70).length,
      notificado: list.filter(m => m.status === "suggested" || m.status === "interested").length, // Que pasó por ingesta activa
      aceptado: list.filter(m => m.ownerConfirmed || m.seekerConfirmed).length, // Al menos una confirmación
      conectado: list.filter(m => m.status === "interested").length, // Double-opt in exitoso
      negociacion: list.filter(m => m.status === "interested").length, // Enlace activo de WA
      cerrado: 0 // Estado final comercial
    };
  }, [matches]);

  // Filters logic
  const filteredMatches = useMemo(() => (matches || []).filter(m => {
    const score = parseFloat(m.matchScore?.toString() || "0");
    if (score < minScore) return false;
    if (selectedCity !== "Todas" && m.property.city !== selectedCity) return false;
    
    // Status Pipeline filter
    if (activePipelineFilter && m.status !== activePipelineFilter) return false;

    if (searchTerm.trim()) {
      const text = [
        m.property.name,
        m.property.zone,
        m.property.city,
        m.requirement.name,
        m.requirement.zonaDeseada,
        m.requirement.rawText,
        m.property.rawText,
        m.property.idUsuarioWhatsapp,
        m.requirement.idUsuarioWhatsapp
      ].filter(Boolean).join(" ").toLowerCase();
      if (!text.includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  }), [matches, minScore, selectedCity, searchTerm, activePipelineFilter]);

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
      
      <main className="container pt-32 pb-24 relative z-10 space-y-10">

        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-[#bf953f]/10 border border-[#bf953f]/20 text-[#bf953f]"><Sparkles className="w-4 h-4 animate-pulse" /></span>
              <span className="text-xs font-bold tracking-widest uppercase text-[#bf953f]">Fase de Formalización · VRIF v2.0</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
              Consola de Coincidencias
            </h1>
            <p className="text-zinc-400 mt-2 font-light max-w-xl text-sm">Dashboard de gestión del VRIF Core. Filtra, audita el Doble Opt-In y monitorea el Índice de Probabilidad de Cierre.</p>
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

        {/* -------------------------------------------------------------
            NIVEL 1: Acciones comerciales y tareas por atender
           ------------------------------------------------------------- */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" /> Nivel 1: Acciones Comerciales Pendientes
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Negocios por atender hoy",
                value: nivel1Stats.atenderHoy,
                subtitle: "Matches esperando validación",
                icon: Flame,
                color: "border-red-500/20 hover:border-red-500/40 bg-red-500/5 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.05)]"
              },
              {
                label: "Esperando mi confirmación",
                value: nivel1Stats.esperandoMiConfirmacion,
                subtitle: "Pendiente respuesta local",
                icon: Clock,
                color: "border-amber-500/20 hover:border-amber-500/40 bg-amber-500/5 text-amber-400"
              },
              {
                label: "Esperando respuesta aliada",
                value: nivel1Stats.esperandoBilateral,
                subtitle: "Esperando otra punta",
                icon: HelpCircle,
                color: "border-cyan-500/20 hover:border-cyan-500/40 bg-cyan-500/5 text-cyan-400"
              },
              {
                label: "Cercanos a expirar hoy",
                value: nivel1Stats.expiraranHoy,
                subtitle: "Límite doctrinal 7 días",
                icon: AlertTriangle,
                color: "border-orange-500/20 hover:border-orange-500/40 bg-orange-500/5 text-orange-400"
              }
            ].map((item, idx) => (
              <div key={idx} className={`border rounded-2xl p-5 transition-all duration-300 flex items-center justify-between ${item.color}`}>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">{item.label}</p>
                  <h3 className="text-3xl font-black mt-1 leading-none">{item.value}</h3>
                  <p className="text-[10px] text-zinc-500 mt-1">{item.subtitle}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <item.icon className="w-6 h-6" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* -------------------------------------------------------------
            NIVEL 2: KPIs de Gestión
           ------------------------------------------------------------- */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#bf953f]" /> Nivel 2: KPIs de Gestión Comercial
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Precisión Media", value: `${kpis.avgAfinidad}%`, icon: Sparkles },
              { label: "IPC Promedio", value: `${kpis.avgIpc}%`, icon: TrendingUp },
              { label: "Doble Opt-In", value: kpis.totalInterested, icon: CheckCircle },
              { label: "Tasa Aceptación", value: `${kpis.tasaAceptacion}%`, icon: CheckCircle2 },
              { label: "Rechazos", value: kpis.totalRejected, icon: Ban },
              { label: "Conversión", value: `${kpis.tasaConversion}%`, icon: Zap }
            ].map((kpi, idx) => (
              <div key={idx} className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                <p className="text-[9px] uppercase font-bold tracking-widest text-zinc-500">{kpi.label}</p>
                <div className="flex items-end justify-between mt-3">
                  <span className="text-xl font-extrabold text-zinc-100">{kpi.value}</span>
                  <kpi.icon className="w-4 h-4 text-[#bf953f]/40" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* -------------------------------------------------------------
            NIVEL 3: Pipeline Comercial y Coincidencias
           ------------------------------------------------------------- */}
        <div className="space-y-6">
          
          {/* Extended Pipeline Funnel */}
          <div className="bg-[#0c0c0c] border border-white/5 rounded-3xl p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <CircleDot className="w-4 h-4 text-[#bf953f]" /> Pipeline Comercial de Coincidencias
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {[
                { label: "1. Analizado", count: pipelineStats.analizado, pct: "100%", desc: "Publicaciones procesadas" },
                { label: "2. Compatible", count: pipelineStats.compatible, pct: "100%", desc: "Filtro Score >= 70%" },
                { label: "3. Notificado", count: pipelineStats.notificado, pct: `${((pipelineStats.notificado / (pipelineStats.analizado || 1)) * 100).toFixed(0)}%`, desc: "Enviado o encolado" },
                { label: "4. Aceptado", count: pipelineStats.aceptado, pct: `${((pipelineStats.aceptado / (pipelineStats.analizado || 1)) * 100).toFixed(0)}%`, desc: "Al menos 1 broker" },
                { label: "5. Conectado", count: pipelineStats.conectado, pct: `${((pipelineStats.conectado / (pipelineStats.analizado || 1)) * 100).toFixed(0)}%`, desc: "Doble confirmación" },
                { label: "6. Negociación", count: pipelineStats.negociacion, pct: `${((pipelineStats.negociacion / (pipelineStats.analizado || 1)) * 100).toFixed(0)}%`, desc: "WA Directo compartido" },
                { label: "7. Cerrado", count: pipelineStats.cerrado, pct: "0%", desc: "Comisión consolidada" }
              ].map((step, idx) => (
                <div key={idx} className="bg-white/[0.01] border border-white/5 rounded-2xl p-3 flex flex-col justify-between hover:border-white/10 transition-colors">
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 block truncate">{step.label}</span>
                    <span className="text-lg font-black block mt-1.5">{step.count}</span>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-[8px] text-zinc-500 mb-0.5">
                      <span>Conversión</span>
                      <span>{step.pct}</span>
                    </div>
                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                      <div className="bg-[#bf953f] h-full" style={{ width: step.pct }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filters and View Toggles */}
          <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input type="text" placeholder="Buscar por barrio, ciudad, inmueble, requerimiento, teléfono..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-[#bf953f] transition-all" />
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              {/* Table/Card View Toggle */}
              <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === "table" ? "bg-[#bf953f] text-black" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Tabla
                </button>
                <button
                  onClick={() => setViewMode("cards")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === "cards" ? "bg-[#bf953f] text-black" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Tarjetas
                </button>
              </div>

              <Button onClick={() => setShowFilters(!showFilters)} variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 hover:text-white flex items-center gap-2 rounded-xl h-11">
                <SlidersHorizontal className="w-4 h-4" />Filtros
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-[#0c0c0c] border border-white/5 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Results Container */}
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
          ) : viewMode === "cards" ? (
            <div className="space-y-6">
              <AnimatePresence>
                {filteredMatches.map((m, idx) => <MatchCard key={m.id} m={m} idx={idx} />)}
              </AnimatePresence>
            </div>
          ) : (
            /* Smart Table View */
            <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      <th className="py-4 px-6">ID / Fecha</th>
                      <th className="py-4 px-4">Ciudad / Barrio</th>
                      <th className="py-4 px-4">Inmueble (Oferta)</th>
                      <th className="py-4 px-4">Requerimiento (Demanda)</th>
                      <th className="py-4 px-4 text-center">Match Técnico</th>
                      <th className="py-4 px-4 text-center">Match Comercial</th>
                      <th className="py-4 px-4 text-center">Match Final VRIF</th>
                      <th className="py-4 px-4 text-center">Vigencia</th>
                      <th className="py-4 px-4 text-center">Acción (IAc)</th>
                      <th className="py-4 px-4">Estado</th>
                      <th className="py-4 px-6 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMatches.map((m) => {
                      const scores = calcularScoresMatch(m);
                      const vigencia = calcularVigencia(m);
                      const isExpanded = !!expandedTableRows[m.id];
                      const dateStr = new Date(m.createdAt || new Date()).toLocaleDateString("es-CO", { month: "short", day: "numeric" });
                      const iac = calcularIAc(m);
                      
                      return (
                        <React.Fragment key={m.id}>
                          {/* Main Row */}
                          <tr className={`border-b border-white/5 hover:bg-white/[0.01] transition-all cursor-pointer ${
                            isExpanded ? "bg-white/[0.02]" : ""
                          }`} onClick={() => toggleTableRow(m.id)}>
                            
                            <td className="py-4 px-6">
                              <span className="font-mono text-zinc-600 text-[10px]">#M{m.id}</span>
                              <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{dateStr}</p>
                            </td>

                            <td className="py-4 px-4">
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                                <span className="text-xs font-bold text-zinc-300">{m.property.city}</span>
                              </div>
                              <p className="text-[10px] text-zinc-500 truncate max-w-[120px] mt-0.5">{m.property.zone || "N/E"}</p>
                            </td>

                            <td className="py-4 px-4">
                              <h4 className="text-xs font-bold text-zinc-300 truncate max-w-[180px]">{m.property.name}</h4>
                              <p className="text-[10px] text-[#bf953f] font-medium mt-0.5">{formatCOP(m.property.price)}</p>
                            </td>

                            <td className="py-4 px-4">
                              <h4 className="text-xs font-bold text-zinc-300 truncate max-w-[180px]">{m.requirement.name || `Requerimiento #${m.requirement.id}`}</h4>
                              <p className="text-[10px] text-cyan-400 font-medium mt-0.5">{formatCOP(m.requirement.presupuestoMax)}</p>
                            </td>

                            <td className="py-4 px-4 text-center font-bold text-xs text-cyan-400 font-mono">
                              {scores.tecnico}%
                            </td>

                            <td className="py-4 px-4 text-center font-bold text-xs text-[#bf953f] font-mono">
                              {scores.comercial}%
                            </td>

                            <td className="py-4 px-4 text-center font-black text-sm text-white font-mono">
                              {scores.final}%
                            </td>

                            <td className="py-4 px-4 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${vigencia.color}`}>
                                {vigencia.badge}
                              </span>
                            </td>

                            <td className="py-4 px-4 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${iac.color}`}>
                                {iac.badge} ({iac.score}%)
                              </span>
                            </td>

                            <td className="py-4 px-4">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                m.status === "interested"
                                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                                  : m.status === "rejected"
                                  ? "bg-red-500/10 border border-red-500/20 text-red-400"
                                  : "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                              }`}>
                                {m.status === "interested" ? "Double Opt-In" : (m.status === "rejected" ? "Rechazado" : "Propuesto")}
                              </span>
                            </td>

                            <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-2">
                                {m.property.idUsuarioWhatsapp && (
                                  <a href={getWhatsAppLink(m.property.idUsuarioWhatsapp)} target="_blank" rel="noopener noreferrer"
                                    title="Contactar Oferente"
                                    className="w-7 h-7 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] flex items-center justify-center transition-colors">
                                    <Phone className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                {m.requirement.idUsuarioWhatsapp && (
                                  <a href={getWhatsAppLink(m.requirement.idUsuarioWhatsapp)} target="_blank" rel="noopener noreferrer"
                                    title="Contactar Demandante"
                                    className="w-7 h-7 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 flex items-center justify-center transition-colors">
                                    <Search className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                <button onClick={() => toggleTableRow(m.id)}
                                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 flex items-center justify-center transition-colors">
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              </div>
                            </td>

                          </tr>

                          {/* Expanded Content Row */}
                          <AnimatePresence>
                            {isExpanded && (
                              <tr>
                                <td colSpan={11} className="bg-white/[0.01] border-b border-white/5 p-6">
                                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                    
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                      
                                      {/* Cotejo columns */}
                                      <div className="lg:col-span-2 space-y-4">
                                        <div className="flex items-center justify-between">
                                          <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#bf953f]">Detalle de Cotejo Atributos</h5>
                                          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold ${iac.color}`}>
                                            <Info className="w-3.5 h-3.5 shrink-0" />
                                            <span>Índice de Acción: {iac.label}</span>
                                          </div>
                                        </div>

                                        <div className="overflow-x-auto bg-black/25 rounded-2xl border border-white/5 p-3">
                                          <table className="w-full text-xs border-collapse">
                                            <thead>
                                              <tr className="border-b border-white/10 text-[9px] uppercase tracking-wider text-zinc-500">
                                                <th className="text-left py-1.5 px-3">Atributo</th>
                                                <th className="text-left py-1.5 px-3">🔍 Requerimiento</th>
                                                <th className="text-left py-1.5 px-3">🏢 Inmueble</th>
                                                <th className="text-left py-1.5 px-3">Cotejo</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {scoreRows(m.requirement, m.property).rows.map((row, idx) => (
                                                <ComparisonRow key={idx} {...row} />
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>

                                        {m.matchReason && (
                                          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex gap-3">
                                            <div className="p-1.5 rounded-lg bg-[#bf953f]/10 text-[#bf953f] mt-0.5 shrink-0"><MessageSquare className="w-4 h-4" /></div>
                                            <div>
                                              <h5 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Análisis Doctrinal</h5>
                                              <p className="text-xs text-zinc-300 font-light leading-relaxed">{m.matchReason}</p>
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* IPC Breakdown & Timeline */}
                                      <div className="space-y-6">
                                        <IpcBreakdown ipc={m.ipc} />
                                        <VrifTimeline m={m} />
                                        <PropertyTraceability property={m.property} />
                                      </div>

                                    </div>

                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </AnimatePresence>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
