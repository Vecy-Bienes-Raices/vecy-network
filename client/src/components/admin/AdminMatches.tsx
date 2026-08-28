import React, { useMemo, useState } from 'react';
import { 
  Phone, MapPin, Search, Download, Building2, Calendar, 
  Sparkles, CheckCircle2, AlertTriangle, XCircle, SlidersHorizontal, 
  DollarSign, Ruler, Bed, Bath, Car, Shield, ExternalLink, Receipt, Box, Globe,
  Edit3, Save, Loader2, RotateCcw, Sun, Zap, Utensils, Home, Flame, ThumbsUp, ThumbsDown,
  Trees, ShieldCheck, BookOpen, Copy, Check, ClipboardList
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { motion, AnimatePresence } from 'framer-motion';
import { formatColombiaDate } from '@/lib/dateUtils';
import { supabase } from '@/lib/supabase';
import { VECY_VERSION_LABEL } from '@/const';

type MatchStatus = "exact" | "warn" | "missing" | "ok" | "neutral" | "plus";

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
    house: "Casa",
    building: "Edificio",
    warehouse: "Bodega",
    office: "Oficina",
    farm: "Finca / Lote Campestre",
    loft: "Loft",
    consultorio: "Consultorio",
    cabin: "Cabaña",
    commercial: "Local Comercial",
    land: "Lote / Terreno",
    hotel: "Hotel"
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

function extractPublicLink(item: any): string | null {
  if (!item) return null;
  if (item.enlaceOrigen && (item.enlaceOrigen.startsWith("http://") || item.enlaceOrigen.startsWith("https://"))) {
    return item.enlaceOrigen;
  }
  if (item.externalUrl && (item.externalUrl.startsWith("http://") || item.externalUrl.startsWith("https://"))) {
    return item.externalUrl;
  }
  const text = `${item.enlaceOrigen || ''} ${item.rawText || ''} ${item.description || ''} ${item.externalUrl || ''}`;
  const match = text.match(/https?:\/\/[^\s<"']+/i);
  if (match) return match[0];
  
  // Expresión para enlaces inmobiliarios comunes de portales públicos (wasi.co, fincaraiz.com.co, etc.)
  const domainMatch = text.match(/(?:[a-zA-Z0-9-]+\.)+(?:com|co|net|org|app|io|tools|store)\/[^\s<"']+/i);
  if (domainMatch) return `https://${domainMatch[0]}`;

  return null;
}

const SUPABASE_STORAGE_URL = 'https://knzmpoprlmbonejshfys.supabase.co/storage/v1/object/public/property-flyers';

function normalizeImageUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) return trimmed;
  if (trimmed.startsWith('/uploads/')) {
    const cleanKey = trimmed.replace(/^\/uploads\//, '');
    return `${SUPABASE_STORAGE_URL}/${cleanKey}`;
  }
  if (trimmed.startsWith('/')) {
    return `${SUPABASE_STORAGE_URL}${trimmed}`;
  }
  return `${SUPABASE_STORAGE_URL}/${trimmed}`;
}

function extractItemImages(item: any): string[] {
  if (!item) return [];
  const rawUrls: string[] = [];
  if (Array.isArray(item.images)) {
    for (const img of item.images) {
      if (typeof img === 'string' && (img.startsWith('http') || img.startsWith('/'))) {
        if (!rawUrls.includes(img)) rawUrls.push(img);
      }
    }
  }
  if (item.imageUrl && typeof item.imageUrl === 'string' && (item.imageUrl.startsWith('http') || item.imageUrl.startsWith('/'))) {
    if (!rawUrls.includes(item.imageUrl)) rawUrls.push(item.imageUrl);
  }
  if (item.enlaceOrigen && typeof item.enlaceOrigen === 'string') {
    const isImg = item.enlaceOrigen.includes('/flyers/') || 
                  item.enlaceOrigen.includes('property-flyers') ||
                  /\.(?:jpg|jpeg|png|webp|gif)(?:\?.*)?$/i.test(item.enlaceOrigen);
    if (isImg && !rawUrls.includes(item.enlaceOrigen)) {
      rawUrls.push(item.enlaceOrigen);
    }
  }
  if (item.externalUrl && typeof item.externalUrl === 'string') {
    const isImg = item.externalUrl.includes('/flyers/') || 
                  item.externalUrl.includes('property-flyers') ||
                  /\.(?:jpg|jpeg|png|webp|gif)(?:\?.*)?$/i.test(item.externalUrl);
    if (isImg && !rawUrls.includes(item.externalUrl)) {
      rawUrls.push(item.externalUrl);
    }
  }
  const text = `${item.rawText || ''} ${item.description || ''}`;
  const imgMatches = text.match(/https?:\/\/[^\s<"']+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s<"']*)?/gi);
  if (imgMatches) {
    for (const m of imgMatches) {
      if (!rawUrls.includes(m)) rawUrls.push(m);
    }
  }

  const normalizedUrls: string[] = [];
  for (const u of rawUrls) {
    const norm = normalizeImageUrl(u);
    if (norm && !normalizedUrls.includes(norm)) {
      normalizedUrls.push(norm);
    }
  }
  return normalizedUrls;
}

function scoreRows(req: any, prop: any) {
  const rows: ScoreRow[] = [];
  let pts = 0;
  let max = 0;

  const add = (label: string, reqVal: string, propVal: string, status: MatchStatus, weight: number, icon: React.ReactNode) => {
    rows.push({ label, reqVal, propVal, status, weight, icon });
    max += weight;
    if (status === "exact" || status === "ok" || status === "neutral" || status === "plus") pts += weight;
    else if (status === "warn") pts += weight * 0.5;
  };

  const cleanText = (t: string) => (t || "").toLowerCase().trim().replace(/[\s\-_,.]+/g, " ");
  const reqTextLower = (req.rawText || req.name || "").toLowerCase().replace(/[\u2060\u200B\u200C\u200D\uFEFF\u00A0]/g, " ");
  const propTextLower = (prop.rawText || prop.description || prop.name || "").toLowerCase().replace(/[\u2060\u200B\u200C\u200D\uFEFF\u00A0]/g, " ");

  // 1. Tipo de Inmueble (REGLA DOCTRINAL v22.8 - Subtipos de Propiedad Horizontal)
  const reqType = req.tipoInmuebleDeseado || req.propertyType;
  const propType = prop.propertyType;

  const reqRawText = cleanText(req.rawText || req.name || "");
  const propRawText = cleanText(prop.rawText || prop.name || "");

  const getHorizontalPropertySubtype = (type: string | null | undefined, raw: string): string => {
    const t = (type || "").toLowerCase().trim();
    const r = (raw || "").toLowerCase().trim();
    
    // 1. Apartaestudio / Aparta Suite / 1 Alcoba Independiente
    if (
      r.includes("apartaestudio") || r.includes("aparta estudio") ||
      r.includes("apartasuite") || r.includes("aparta suite") || r.includes("aparta-suite") ||
      r.includes("suite ejecutiva") || r.includes("alcoba independiente") ||
      r.includes("1 alcoba") || r.includes("una alcoba") || r.includes("1 habitacion independiente") ||
      t === "apartaestudio" || t === "aparta_suite" || t === "apartasuite" || t === "studio"
    ) {
      return "apartaestudio";
    }

    // 2. Loft
    if (r.includes("loft") || t === "loft") {
      return "loft";
    }

    // 3. Penthouse / PH
    if (r.includes("penthouse") || r.includes("pent house") || r.includes("ph ") || r.endsWith(" ph") || t === "penthouse") {
      return "penthouse";
    }

    // 4. Dúplex / Tríplex
    if (r.includes("duplex") || r.includes("dúplex") || r.includes("triplex") || r.includes("tríplex") || t.includes("duplex")) {
      return "apartamento_duplex";
    }

    if (t === "apartment" || t === "apartamento" || t === "apto") {
      return "apartamento_estandar";
    }

    return t || "apartamento_estandar";
  };

  const reqSubtype = getHorizontalPropertySubtype(reqType, reqRawText);
  const propSubtype = getHorizontalPropertySubtype(propType, propRawText);

  const isReqStudio = reqSubtype === "apartaestudio" || reqSubtype === "loft";
  const isPropStudio = propSubtype === "apartaestudio" || propSubtype === "loft";

  let typeMatchStatus: MatchStatus = "missing";
  if (isReqStudio) {
    typeMatchStatus = isPropStudio ? "exact" : "missing"; // TOLERANCIA CERO: 1 alcoba / apartasuite JAMÁS coincide con apto familiar / penthouse
  } else if (isPropStudio) {
    typeMatchStatus = isReqStudio ? "exact" : "missing";
  } else if (reqSubtype && propSubtype) {
    if (reqSubtype === propSubtype || (reqSubtype === "apartamento_estandar" && propSubtype === "apartment") || (reqSubtype === "apartment" && propSubtype === "apartamento_estandar")) {
      typeMatchStatus = "exact";
    } else if (reqSubtype === "penthouse" && propSubtype !== "penthouse") {
      typeMatchStatus = "missing";
    } else {
      typeMatchStatus = "exact";
    }
  } else {
    typeMatchStatus = "neutral";
  }

  const getSubtypeFriendlyLabel = (sub: string | null | undefined): string => {
    if (!sub) return "N/E";
    if (sub === "apartaestudio") return "Apartaestudio / Aparta Suite (1 Hab)";
    if (sub === "loft") return "Loft";
    if (sub === "penthouse") return "PentHouse";
    if (sub === "apartamento_duplex") return "Apartamento Dúplex / Tríplex";
    if (sub === "apartamento_estandar" || sub === "apartment" || sub === "apartamento") return "Apartamento Familiar";
    return getPropTypeLabel(sub);
  };

  add(
    "Tipo de Inmueble", 
    getSubtypeFriendlyLabel(reqSubtype), 
    getSubtypeFriendlyLabel(propSubtype), 
    typeMatchStatus, 
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

  const subSectores = ["oriental", "occidental", "norte", "sur", "alta", "alto", "baja", "bajo", "reservado", "iii", "ii", "i"];
  const isDiffSubBarrio = reqZona && propZona && subSectores.some(o => 
    (reqZona.includes(o) && !propZona.includes(o)) || (!reqZona.includes(o) && propZona.includes(o))
  );

  // Detección de perímetro numérico (Calles / Carreras)
  const reqFullText = `${req.zonaDeseada || ''} ${req.rawText || ''}`.toLowerCase();
  const propFullText = `${prop.zone || ''} ${prop.rawText || ''}`.toLowerCase();
  
  const reqStreetMatch = reqFullText.match(/(?:entre|de|cll|calle|calles)\s*:?\s*(\d{1,3})\s*(?:a|y|-|hasta)\s*(\d{1,3})/i);
  const propStreetMatch = propFullText.match(/(?:calle|cll|cll\.)\s*(\d{1,3})/i);

  let isOutStreetBounds = false;
  let boundaryLabel = '';

  if (reqStreetMatch && propStreetMatch) {
    const minS = Math.min(parseInt(reqStreetMatch[1]), parseInt(reqStreetMatch[2]));
    const maxS = Math.max(parseInt(reqStreetMatch[1]), parseInt(reqStreetMatch[2]));
    const pS = parseInt(propStreetMatch[1]);
    if (pS < minS || pS > maxS) {
      isOutStreetBounds = true;
      boundaryLabel = `Calle ${minS}-${maxS}`;
    }
  }

  const extractBarrioFromText = (text: string): string | null => {
    if (!text) return null;
    const lower = text.toLowerCase();
    const knowns = [
      "cedritos", "santa paula", "santa barbara", "chico norte", "chico reservado", "chico",
      "rosales", "virrey", "la cabrera", "nogal", "country club", "la calleja", "bella suiza",
      "el contador", "san patricio", "pasadena", "alhambra", "colina", "suba", "salitre",
      "modelia", "fontibon", "teusaquillo", "chapinero", "laureles", "poblado", "granada",
      "el peñon", "ciudad jardin", "cabecera", "cañaveral"
    ];
    for (const k of knowns) {
      if (lower.includes(k)) return k.charAt(0).toUpperCase() + k.slice(1);
    }
    return null;
  };

  let reqBarrioInferred = extractBarrioFromText(req.rawText || "");
  let propBarrioInferred = extractBarrioFromText(prop.rawText || prop.description || "");

  const reqEffectiveZone = (req.zonaDeseada && req.zonaDeseada.toLowerCase() !== "bogotá" && req.zonaDeseada.toLowerCase() !== "bogota") 
    ? req.zonaDeseada 
    : (reqBarrioInferred || req.zonaDeseada || "");

  const propEffectiveZone = (prop.zone && prop.zone.toLowerCase() !== "bogotá" && prop.zone.toLowerCase() !== "bogota")
    ? prop.zone
    : (propBarrioInferred || prop.zone || "");

  const ciudadMatch = !reqCiudad || propCiudad.includes(reqCiudad) || reqCiudad.includes(propCiudad) || reqCiudad === "colombia";
  const normReqZone = (reqEffectiveZone || "").toLowerCase();
  const normPropZone = (propEffectiveZone || "").toLowerCase();
  
  const isExactOrAliasMatch = normReqZone && normPropZone && (normReqZone.includes(normPropZone) || normPropZone.includes(normReqZone));
  const hasAledanosWord = normReqZone.includes("aledaños") || normReqZone.includes("aledanos") || normReqZone.includes("cercanos");
  
  const isNeighborhoodMismatch = normReqZone && normPropZone && !isExactOrAliasMatch && !hasAledanosWord;

  let geoStatus: MatchStatus = (ciudadMatch && isExactOrAliasMatch && !isOutStreetBounds) ? "exact" : (ciudadMatch && !isNeighborhoodMismatch) ? "warn" : "missing";
  
  const formatZoneLabel = (z: string, c: string): string => {
    const zClean = (z || "").trim();
    const cClean = (c || "").trim();
    if (!zClean && !cClean) return "N/E";
    if (!zClean) return cClean;
    if (!cClean || zClean.toLowerCase() === cClean.toLowerCase() || zClean.toLowerCase().includes(cClean.toLowerCase())) {
      return zClean;
    }
    return `${zClean}, ${cClean}`;
  };

  let propZoneLabel = formatZoneLabel(propEffectiveZone, prop.city || "Bogotá");
  
  if (isOutStreetBounds) {
    geoStatus = "missing";
    propZoneLabel += ` ❌ (Fuera de Perímetro: ${boundaryLabel})`;
  } else if (isNeighborhoodMismatch) {
    geoStatus = "missing";
    propZoneLabel += " ❌ (Barrio Incompatible)";
  } else if (isDiffSubBarrio && !hasAledanosWord) {
    geoStatus = "missing";
    propZoneLabel += " ❌ (Diferente Sub-barrio)";
  }


  // ── EMPAREJAMIENTO GEOGRÁFICO TRIPARTITO (Doctrinal v22.1) ──
  // REGLA: Los campos geográficos son DUROS. Solo "Coincide" o "Falla". JAMÁS "Aproximado".
  // REGLA: Sub-barrio exacto — "Calleja Alta" ≠ "Calleja Baja" = FALLA absoluta.

  // Calificadores de sub-barrio que hacen los nombres INCOMPATIBLES si difieren
  const SUB_CALIFICADORES = ["alta", "alto", "baja", "bajo", "norte", "sur", "oriental", "occidental", "reservado", "i ", "ii ", "iii ", "navarra"];

  const normalizeBarrio = (s: string) =>
    (s || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");

  // Emparejamiento exacto de barrio con detección de sub-calificadores
  const matchBarrioExacto = (req: string, prop: string): boolean => {
    const rn = normalizeBarrio(req);
    const pn = normalizeBarrio(prop);
    if (!rn || !pn) return false;
    // Coincidencia exacta
    if (rn === pn) return true;

    // Incompatibilidad estricta entre Chicó tradicional (Chapinero) y Chicó Navarra (Usaquén)
    const isChicoNavReq = rn.includes("chico navarra") || rn.includes("navarra");
    const isChicoNavProp = pn.includes("chico navarra") || pn.includes("navarra");
    const isChicoTradReq = (rn.includes("chico") || rn.includes("chico norte") || rn.includes("chico reservado") || rn.includes("rincon del chico")) && !isChicoNavReq;
    const isChicoTradProp = (pn.includes("chico") || pn.includes("chico norte") || pn.includes("chico reservado") || pn.includes("rincon del chico")) && !isChicoNavProp;

    if ((isChicoNavReq && isChicoTradProp) || (isChicoTradReq && isChicoNavProp)) {
      return false; // INCOMPATIBLE TOTAL: Chicó tradicional ≠ Chicó Navarra
    }

    // Uno contiene al otro (ej: "La Calleja" ↔ "La Calleja Baja") → solo si NO hay calificador conflictivo
    const reqHasQual = SUB_CALIFICADORES.some(q => rn.includes(q));
    const propHasQual = SUB_CALIFICADORES.some(q => pn.includes(q));
    // Si ambos tienen calificadores distintos → FALLA
    if (reqHasQual && propHasQual && rn !== pn) return false;
    // Si solo uno tiene calificador y el otro es el nombre base → puede coincidir (ej: "Calleja" ↔ "La Calleja Baja")
    // Solo si el nombre base está completamente contenido y el calificador no crea conflicto
    return (rn.includes(pn) || pn.includes(rn)) && !SUB_CALIFICADORES.some(q => {
      const reqHas = rn.includes(q);
      const propHas = pn.includes(q);
      return reqHas !== propHas; // Uno tiene y el otro no → conflicto
    });
  };

  // Limpiador estricto para evitar que nombres de ciudades o países aparezcan como barrio
  const cleanBarrioValue = (bVal: string | null | undefined, cVal: string | null | undefined): string => {
    if (!bVal || bVal === "N/E") return "N/E";
    const b = bVal.trim();
    if (!b) return "N/E";

    const bNorm = b.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const cNorm = (cVal || "bogota").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    // Si el valor asignado al barrio es el nombre de la ciudad o país, NO es un barrio -> Retornar N/E
    if (
      bNorm === cNorm ||
      bNorm === "bogota" ||
      bNorm === "bogota d.c." ||
      bNorm === "bogota d.c" ||
      bNorm === "bogota, d.c." ||
      bNorm === "medellin" ||
      bNorm === "cali" ||
      bNorm === "barranquilla" ||
      bNorm === "bucaramanga" ||
      bNorm === "cartagena" ||
      bNorm === "chia" ||
      bNorm === "cajica" ||
      bNorm === "soacha" ||
      bNorm === "colombia"
    ) {
      return "N/E";
    }
    return b;
  };

  // Valores de display priorizando los campos tripartitos ya deducidos por janIA
  const reqBarrioRaw = req.addressNeighborhood || reqEffectiveZone;
  const propBarrioRaw = prop.addressNeighborhood || propEffectiveZone;

  const inferLocalityFromBarrio = (bName: string | null | undefined): string => {
    if (!bName || bName === "N/E") return "N/E";
    const norm = bName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (norm.includes("chico navarra") || norm.includes("navarra")) return "Usaquén";
    if (norm.includes("rosales") || norm.includes("chico") || norm.includes("nogal") || norm.includes("cabrera") || norm.includes("virrey") || norm.includes("quinta camacho") || norm.includes("chapinero")) return "Chapinero";
    if (norm.includes("cedritos") || norm.includes("santa barbara") || norm.includes("santa paula") || norm.includes("bella suiza") || norm.includes("contador") || norm.includes("san patricio") || norm.includes("toberin") || norm.includes("usaquen")) return "Usaquén";
    if (norm.includes("niza") || norm.includes("pasadena") || norm.includes("colina") || norm.includes("suba")) return "Suba";
    if (norm.includes("modelia") || norm.includes("fontibon")) return "Fontibón";
    if (norm.includes("teusaquillo")) return "Teusaquillo";
    if (norm.includes("restrepo")) return "Antonio Nariño";
    if (norm.includes("candelaria")) return "La Candelaria";
    if (norm.includes("kennedy")) return "Kennedy";
    if (norm.includes("normandia")) return "Engativá";
    return "N/E";
  };

  const rawReqB = cleanBarrioValue(reqBarrioRaw, req.addressCity || req.ciudadDeseada);
  const rawPropB = cleanBarrioValue(propBarrioRaw, prop.addressCity || prop.city);

  // Extraer fidelidad de barrio/cuadrante desde rawText si la columna tiene un nombre genérico
  let propBarrioDisplay = rawPropB;
  if (propTextLower && (rawPropB === "N/E" || rawPropB.toLowerCase() === "virrey" || rawPropB.toLowerCase() === "chico" || rawPropB.toLowerCase() === "chapinero")) {
    if (propTextLower.includes("la cabrera") || propTextLower.includes("cabrera")) propBarrioDisplay = "La Cabrera";
    else if (propTextLower.includes("rincon del chico") || propTextLower.includes("rincón del chicó")) propBarrioDisplay = "Rincón del Chicó";
    else if (propTextLower.includes("el nogal") || propTextLower.includes("nogal")) propBarrioDisplay = "El Nogal";
    else if (propTextLower.includes("los rosales") || propTextLower.includes("rosales")) propBarrioDisplay = "Rosales";
    else if (propTextLower.includes("antiguo country")) propBarrioDisplay = "Antiguo Country";
  }

  let reqBarrioDisplay = rawReqB;
  if (reqTextLower) {
    if (reqTextLower.includes("85 hasta la 72") || reqTextLower.includes("85 a la 72") || reqTextLower.includes("calle 85 con cra 7")) {
      if (propBarrioDisplay.toLowerCase().includes("cabrera") || propBarrioDisplay.toLowerCase().includes("nogal") || propBarrioDisplay.toLowerCase().includes("rosales")) {
        reqBarrioDisplay = "Clle 85 a 72 (Cra 7 a 15 / Sector La Cabrera)";
      }
    } else if (reqTextLower.includes("sector el virrey") || reqTextLower.includes("de la 90 a la 85")) {
      if (propBarrioDisplay.toLowerCase().includes("virrey") || propBarrioDisplay.toLowerCase().includes("chico") || propBarrioDisplay.toLowerCase().includes("rincon del chico")) {
        reqBarrioDisplay = "Clle 85 a 90 (Autonorte a Cra 7 / Rincón del Chicó)";
      }
    }
  }

  const reqLocalityDisplay = (req.addressLocality && req.addressLocality !== "N/E") ? req.addressLocality : inferLocalityFromBarrio(reqBarrioDisplay);
  const propLocalityDisplay = (prop.addressLocality && prop.addressLocality !== "N/E") ? prop.addressLocality : inferLocalityFromBarrio(propBarrioDisplay);

  const reqCityDisplay = req.addressCity || req.ciudadDeseada || "Bogotá, D.C.";
  const propCityDisplay = prop.addressCity || prop.city || "Bogotá, D.C.";


  // A. Ciudad / Municipio — FILTRO DURO BINARIO
  const isCityMatch =
    normalizeBarrio(reqCityDisplay) === normalizeBarrio(propCityDisplay) ||
    normalizeBarrio(reqCityDisplay).includes(normalizeBarrio(propCityDisplay)) ||
    normalizeBarrio(propCityDisplay).includes(normalizeBarrio(reqCityDisplay));

  const bothLocalityKnown = reqLocalityDisplay !== "N/E" && propLocalityDisplay !== "N/E";
  const normReqB = normalizeBarrio(reqBarrioDisplay);
  const normPropB = normalizeBarrio(propBarrioDisplay);

  let barrioMatchStatus: MatchStatus = "missing";
  const isGenericZone = (zn: string) => !zn || zn === "N/E" || zn === "na" || zn === "bogota" || zn === "bogotá" || zn === "bogota, d.c.";

  if (isGenericZone(reqBarrioDisplay) || isGenericZone(propBarrioDisplay)) {
    barrioMatchStatus = "missing"; // BARRIO NO RESUELTO (N/E O BOGOTÁ) -> FALLIDO / SACADO DE ALLÍ (0%)
  } else if (matchBarrioExacto(reqBarrioDisplay, propBarrioDisplay)) {
    barrioMatchStatus = "exact"; // 100% BARRIO IDÉNTICO O SECTOR COINCIDENTE VERIFICADO
  } else {
    barrioMatchStatus = "missing"; // BARRIOS DISTINTOS -> FALLIDO (0%)
  }


  // A. Barrio / Vereda / Caserío
  add(
    "Barrio / Vereda / Caserío",
    reqBarrioDisplay,
    propBarrioDisplay,
    barrioMatchStatus,
    10,
    <MapPin className="w-3.5 h-3.5" />
  );

  // B. Localidad / Comuna
  add(
    "Localidad / Comuna",
    reqLocalityDisplay,
    propLocalityDisplay,
    "exact",
    5,
    <MapPin className="w-3.5 h-3.5" />
  );

  // C. Ciudad / Municipio
  add(
    "Ciudad / Municipio",
    reqCityDisplay,
    propCityDisplay,
    "exact",
    5,
    <MapPin className="w-3.5 h-3.5" />
  );

  const isPhoneNumberNotPrice = (val: number | string | null | undefined, rawText?: string): boolean => {
    if (val === undefined || val === null || val === "" || val === 0 || val === "0") return false;
    const numStr = String(val).replace(/\D/g, "");
    if (numStr.length === 10 && numStr.startsWith("3")) return true;
    if (numStr.length === 12 && numStr.startsWith("573")) return true;
    if (rawText) {
      const rawLower = rawText.toLowerCase();
      if (rawLower.includes(numStr) && numStr.length >= 8) {
        if (/wa|whatsapp|cel|celular|tel|telefono|teléfono|contacto|llamar/i.test(rawLower)) return true;
      }
    }
    return false;
  };

  const parseSafePrice = (val: any, rawText?: string): number => {
    if (val === undefined || val === null || val === "") return 0;
    const num = parseFloat(String(val));
    if (isNaN(num) || num <= 0) return 0;
    if (isPhoneNumberNotPrice(num, rawText)) return 0;
    return num;
  };

  const isReqRentMatch = reqNeg.toLowerCase().includes("arriendo");
  const isPropPureRent = (prop.transactionType || "").toLowerCase() === "arriendo" || (prop.transactionType || "").toLowerCase() === "arriendo_temporal";
  const isPropPureVenta = (prop.transactionType || "").toLowerCase() === "venta";
  const isReqOpenBudget = /(?:ppto|presupuesto|canon|valor)?\s*\$?\s*(?:abierto|sin\s*l[ií]mite|ilimitado|negociable\s*sin\s*tope)\b/i.test(reqTextLower);

  function parseColombianPriceOrBudget(numStr: string, unit: string, isSale: boolean): number {
    const cleanStr = (numStr || "").trim().replace(/\*/g, "");
    const cleanUnit = (unit || "").toLowerCase();
    
    if (cleanUnit.includes("mil millon")) {
      const v = parseFloat(cleanStr.replace(",", "."));
      return Math.round(v * 1_000_000_000);
    }
    
    if (/^\d{1,3}\.\d{3}$/.test(cleanStr)) {
      const n = parseInt(cleanStr.replace(".", ""), 10);
      return n * 1_000_000;
    }
    
    let val = parseFloat(cleanStr.replace(",", "."));
    if (isNaN(val)) return 0;
    
    if (cleanUnit.includes("millon") || cleanUnit.includes("millón") || cleanUnit.includes("mll") || cleanUnit.includes("mm") || cleanUnit === "m") {
      if (val < 100 && isSale && val > 0) {
        if (val < 30) return Math.round(val * 1_000_000_000);
        return Math.round(val * 10_000_000);
      }
      return Math.round(val * 1_000_000);
    }
    
    if (val <= 50 && isSale) {
      return Math.round(val * 1_000_000_000);
    }
    if (val < 10000) {
      return Math.round(val * 1_000_000);
    }
    return Math.round(val);
  }

  // A. PRECIO DE VENTA (Tolerancia máx -1%, cero si sobrepasa)
  let propSalePrice = !isPropPureRent ? parseSafePrice(prop.price, prop.rawText) : 0;
  let reqSaleBudget = (!isReqRentMatch && !isPropPureRent) ? parseSafePrice(req.presupuestoMax, req.rawText) : 0;

  // Inferencia inteligente desde rawText si en BD viene 0 o N/E
  if ((reqSaleBudget <= 0 || reqSaleBudget < 100_000_000) && reqTextLower && !isReqRentMatch && !isPropPureRent && !isReqOpenBudget) {
    const rangeMatch = reqTextLower.match(/(?:presupuesto(?:\s*m[aá]ximo)?|ppto(?:\s*m[aá]ximo)?|hasta|tope|valor|inversi[oó]n|compra)?\s*:?\s*\*?\$?\s*(\d{1,4}(?:[.,]\d{1,3})?)\s*(?:a|hasta|-)\s*\*?\$?\s*(\d{1,4}(?:[.,]\d{1,3})?)\*?\s*(mil\s*millones?|millones?|millon|millón|mill|mm|m)?\b/i);
    if (rangeMatch && (rangeMatch[0].includes("presupuesto") || rangeMatch[0].includes("ppto") || rangeMatch[0].includes("compra") || rangeMatch[3])) {
      const parsedMax = parseColombianPriceOrBudget(rangeMatch[2], rangeMatch[3] || "", true);
      if (parsedMax >= 10_000_000) reqSaleBudget = parsedMax;
    } else {
      const matchPresu = reqTextLower.match(/(?:presupuesto|ppto|valor|hasta|máximo|max)\s*(?:máximo|max)?\s*:?\s*\$?\s*([\d.,\s]+?)\s*(mil\s*millones?|millones|millón|mll|mlls|mm|m)?(?:\s|$|\n)/i)
                      || reqTextLower.match(/(?:presupuesto|ppto|valor|hasta|máximo|max)\s*:?\s*\$?\s*([\d.]+)/i);
      if (matchPresu) {
        const parsed = parseColombianPriceOrBudget(matchPresu[1], matchPresu[2] || "", true);
        if (parsed >= 10_000_000) reqSaleBudget = parsed;
      }
    }
  }

  if ((propSalePrice < 100_000_000 || propSalePrice === 0) && propTextLower && !isPropPureRent) {
    const millonMatch = propTextLower.match(/(?:precio|valor|venta|💰)?\s*:?\s*\$?\s*(\d{1,4}(?:[.,]\d{1,3})?)\s*(mil\s*millones?|millon|millones|millón|mill|mm|m)\b/i);
    if (millonMatch) {
      const computed = parseColombianPriceOrBudget(millonMatch[1], millonMatch[2], true);
      if (computed >= 30_000_000) propSalePrice = computed;
    } else {
      const saleMatch = propTextLower.match(/(?:precio\s*(?:de\s*)?venta|venta|valor)\s*:?\s*\$?\s*([\d.,\s]+?)\s*(mil\s*millones?|millones?|mm|mlls|m)?(?:\s|$|\n)/i)
                     || propTextLower.match(/(?:precio\s*(?:de\s*)?venta|venta|valor)\s*:?\s*\$?\s*([\d.]+)/i);
      if (saleMatch) {
        const computedS = parseColombianPriceOrBudget(saleMatch[1], saleMatch[2] || "", true);
        if (computedS >= 30_000_000) propSalePrice = computedS;
      }
    }
  }

  if (propSalePrice < 30_000_000) {
    propSalePrice = 0;
  }

  let reqSaleLabel = isReqRentMatch ? "N/A (Búsqueda de Arriendo)" : (isReqOpenBudget ? "Presupuesto Abierto" : (reqSaleBudget > 0 ? formatCOP(reqSaleBudget) : "N/E"));
  let propSaleLabel = propSalePrice >= 30_000_000 ? formatCOP(propSalePrice) : (isPropPureRent ? "N/A (Inmueble en Arriendo)" : "N/E");

  let saleS: MatchStatus = "neutral";
  if (isReqRentMatch) {
    saleS = "exact"; // En búsqueda de arriendo, venta no bloquea
  } else if (isReqOpenBudget) {
    saleS = propSalePrice > 0 ? "exact" : "warn";
  } else if (reqSaleBudget > 0 && propSalePrice > 0) {
    if (propSalePrice > reqSaleBudget) {
      saleS = "missing";
    } else if (propSalePrice <= reqSaleBudget) {
      saleS = "exact";
    } else {
      saleS = "warn";
    }
  }

  add(
    "Precio de Venta",
    reqSaleLabel,
    propSaleLabel,
    saleS,
    isReqRentMatch ? 0 : 15,
    <DollarSign className="w-3.5 h-3.5" />
  );

  // B. PRECIO DE ARRIENDO / CANON (Tolerancia máx -1%, cero si sobrepasa)
  let propRentPrice = !isPropPureVenta ? parseSafePrice(prop.rentPrice || prop.priceRent, prop.rawText) : 0;
  let reqRentBudget = isReqRentMatch ? parseSafePrice(req.presupuestoMax, req.rawText) : 0;

  if (isReqRentMatch && reqTextLower && !isReqOpenBudget) {
    const mRange = reqTextLower.match(/(\d+(?:[.,]\d+)?)\s*(?:a|hasta|-)\s*\$?(\d+(?:[.,]\d+)?)\s*(millones|millón|mll|mlls|mm|m)\b/i);
    if (mRange) {
      let maxV = parseFloat(mRange[2].replace(',', '.'));
      if (maxV > 1000) maxV /= 1000;
      reqRentBudget = Math.round(maxV * 1_000_000);
    } else if (reqRentBudget <= 0 || reqRentBudget > 100_000_000) {
      const matchPresu = reqTextLower.match(/(?:presupuesto|ppto|canon|valor|hasta|máximo|max)\s*(?:máximo|max)?\s*:?\s*\$?\s*([\d.,\s]+?)\s*(mil\s*millones?|millones|millón|mll|mlls|mm|m)?(?:\s|$|\n)/i)
                      || reqTextLower.match(/(?:presupuesto|ppto|canon|valor|hasta|máximo|max)\s*:?\s*\$?\s*([\d.]+)/i);
      if (matchPresu) {
        let valStr = matchPresu[1].replace(/[.,\s]/g, "");
        let valR = parseFloat(valStr);
        if (!isNaN(valR)) {
          const unit = (matchPresu[2] || "").toLowerCase();
          if (unit.includes("millon") || unit.includes("mll") || unit.includes("mm") || unit === "m") valR *= 1_000_000;
          else if (valR < 1000) valR *= 1_000_000;
          if (valR >= 300_000 && valR <= 100_000_000) reqRentBudget = valR;
        }
      }
    }
  }

  if (!isPropPureVenta && propTextLower) {
    const mComp = propTextLower.match(/(?:canon|arriendo|renta|alquiler)(?:\s*(?:más|\+|con)?\s*administraci[oó]n\s*incluida)?(?:\s*total\s*mes)?\s*:?\s*\$?\s*([\d.,\s]+?)(?:-|\s|$|\n)/i);
    if (mComp) {
      let rawC = parseFloat(mComp[1].replace(/[.,\s]/g, ""));
      if (!isNaN(rawC) && rawC >= 300_000 && rawC <= 100_000_000) {
        propRentPrice = rawC;
      }
    }
    if (propRentPrice <= 0 || propRentPrice > 100_000_000) {
      const rentMatch = propTextLower.match(/(?:valor\s*arriendo|arriendo|canon|renta)\s*:?\s*\$?\s*([\d.,\s]+?)\s*(mil\s*millones?|millones?|m|M)?(?:\s|$|\n)/i)
                     || propTextLower.match(/(?:valor\s*arriendo|arriendo|canon|renta)\s*:?\s*\$?\s*([\d.]+)/i);
      if (rentMatch) {
        let rawRNum = parseFloat(rentMatch[1].replace(/[.,\s]/g, ""));
        const unitR = (rentMatch[2] || "").toLowerCase();
        const multR = unitR.includes("mil millon") ? 1_000_000_000 : (unitR.includes("millon") || unitR === "m") ? 1_000_000 : rawRNum < 10_000 ? 1_000_000 : 1;
        const computedR = rawRNum * multR;
        if (computedR >= 300_000 && computedR <= 100_000_000) propRentPrice = computedR;
      }
    }
  }

  if (propRentPrice <= 0 && !isPropPureVenta && parseSafePrice(prop.price, prop.rawText) > 0 && parseSafePrice(prop.price, prop.rawText) < 100_000_000) {
    propRentPrice = parseSafePrice(prop.price, prop.rawText);
  }

  let reqRentLabel = !isReqRentMatch ? "N/A (Búsqueda de Compra)" : (isReqOpenBudget ? "Presupuesto Abierto" : (reqRentBudget > 0 ? `${formatCOP(reqRentBudget)} / mes` : "N/E"));
  let propRentLabel = propRentPrice > 0 ? `${formatCOP(propRentPrice)} / mes` : (isPropPureVenta ? "N/A (Solo Venta)" : "N/E");

  let rentS: MatchStatus = "neutral";
  if (!isReqRentMatch) {
    rentS = "exact"; // En búsqueda de compra, canon no es un impedimento
  } else if (isReqOpenBudget) {
    rentS = propRentPrice > 0 ? "exact" : "warn";
  } else if (reqRentBudget > 0 && propRentPrice > 0) {
    if (propRentPrice > reqRentBudget) {
      rentS = "missing";
    } else if (propRentPrice <= reqRentBudget) {
      rentS = "exact";
    } else {
      rentS = "warn";
    }
  }

  add(
    "Precio de Arriendo / Canon",
    reqRentLabel,
    propRentLabel,
    rentS,
    isReqRentMatch ? 15 : 0,
    <Receipt className="w-3.5 h-3.5" />
  );

  // C. CUOTA DE ADMINISTRACIÓN (Tolerancia máx -1%, cero si sobrepasa)
  let reqAdminMax = parseSafePrice(req.adminFeeMax, req.rawText);
  let propAdminFee = parseSafePrice(prop.adminFee, prop.rawText);

  if (propAdminFee <= 0 && propTextLower) {
    const mAdmin = propTextLower.match(/(?:administración|administracion|admin|admon)\s*:?\s*(?:aprox\.?)?\s*\$?\s*([\d.,\s]+?)\s*(mil|millones?|m)?(?:\s|$|\n)/i);
    if (mAdmin) {
      let rawANum = parseFloat(mAdmin[1].replace(/[.,\s]/g, ""));
      const unitA = (mAdmin[2] || "").toLowerCase();
      const multA = unitA.includes("millon") ? 1_000_000 : unitA === "mil" ? 1_000 : rawANum < 10_000 ? 1_000 : 1;
      const computedA = rawANum * multA;
      if (computedA >= 10_000 && computedA <= 30_000_000) propAdminFee = computedA;
    }
  }

  if (propAdminFee > 0) {
    if (
      (propRentPrice > 0 && (propAdminFee === propRentPrice || propAdminFee >= propRentPrice * 0.45)) ||
      (propSalePrice > 0 && (propAdminFee === propSalePrice || propAdminFee >= propSalePrice * 0.20))
    ) {
      propAdminFee = 0;
    }
  }

  let adminS: MatchStatus = "neutral";
  if (reqAdminMax > 0 && propAdminFee > 0) {
    if (propAdminFee > reqAdminMax) {
      adminS = "missing";
    } else if (propAdminFee <= reqAdminMax) {
      adminS = "exact";
    } else {
      adminS = "warn";
    }
  } else if (reqAdminMax === 0 && propAdminFee > 0) {
    adminS = "exact"; // Sin tope impuesto en demanda -> Confort
  }

  const reqAdminLabel = reqAdminMax > 0 ? `≤ ${formatCOP(reqAdminMax)}` : (propAdminFee > 0 ? "Flexible / Sin tope" : "N/E");
  const propAdminLabel = propAdminFee > 0 ? `${formatCOP(propAdminFee)} / mes` : "N/E";

  add(
    "Cuota de Administración",
    reqAdminLabel,
    propAdminLabel,
    adminS,
    5,
    <Receipt className="w-3.5 h-3.5" />
  );

  // 5. Área Total (Nunca menor que la solicitada)
  let areaR = parseFloat(req.areaMin || req.areaMinimaM2 || "0");
  if (areaR <= 0 && reqTextLower) {
    const mRA = reqTextLower.match(/(?:mínimo|min|de|área)?\s*([\d.,]+)\s*(?:m2|mts|m²|metros)/i);
    if (mRA) {
      let valRA = parseFloat(mRA[1].replace(/\./g, "").replace(",", "."));
      if (!isNaN(valRA) && valRA > 10 && valRA < 10000) areaR = valRA;
    }
  }

  let areaP = parseFloat(prop.areaTotal || prop.areaPrivate || "0");
  let areaPInferred = false;
  if (areaP <= 0 && propTextLower) {
    const mA = propTextLower.match(/área\s*:?\s*([\d.,]+)/i)
            || propTextLower.match(/([\d.,]+)\s*(?:m2|mts|m²|metros)/i);
    if (mA) {
      let valA = parseFloat(mA[1].replace(/\./g, "").replace(",", "."));
      if (!isNaN(valA) && valA > 10 && valA < 10000) {
        areaP = valA;
        areaPInferred = true;
      }
    }
  }

  let areS: MatchStatus = "neutral";
  let areaPropLabel = areaP > 0 ? `${areaP} m²${areaPInferred ? " (Inferido 🔍)" : ""}` : "N/E";
  if (areaR > 0 && areaP > 0) {
    if (areaP < areaR * 0.95) {
      areS = "missing";
    } else if (areaP >= areaR) {
      areS = "exact"; // Regla Doctrinal: prop >= req es 100% Confort
    } else {
      areS = "warn";
    }
  } else if (areaR === 0 && areaP > 0) {
    areS = "exact"; // Demanda flexible / sin mínimo y oferta espaciosa -> 100% Exacto
  }
  const reqAreaLabel = areaR > 0 ? `≥ ${areaR} m²` : (areaP > 0 ? "Flexible / Sin mínimo" : "N/E");

  add(
    "Área Total",
    reqAreaLabel,
    areaPropLabel,
    areS,
    10,
    <Ruler className="w-3.5 h-3.5" />
  );

  // 6. Habitaciones (REGLA DOCTRINAL v22.8 - DOS BRAZOS ESTRICTOS)
  let bedR = req.habitacionesMin ? Number(req.habitacionesMin) : 0;
  let bedInferred = false;
  if (bedR <= 0 && reqTextLower) {
    const m = reqTextLower.match(/(\d+(?:\s*-\s*\d+)?)\s*(?:hab|habitaciones|alcoba|alcobas|alc|dormitorio)/i);
    if (m) { 
      bedR = parseInt(m[1].split("-")[0].trim(), 10); 
      bedInferred = true; 
    } else if (isReqStudio) {
      bedR = 1;
      bedInferred = true;
    }
  }
  let bedP = prop.bedrooms ? Number(prop.bedrooms) : 0;
  if (bedP <= 0 && propTextLower) {
    const mP = propTextLower.match(/(\d+)\s*(?:hab|habitaciones|alcoba|alcobas|alc|dormitorio)/i);
    if (mP) {
      bedP = parseInt(mP[1], 10);
    } else if (isPropStudio) {
      bedP = 1;
    }
  }

  let bedS: MatchStatus = "neutral";
  if (bedR > 0 && bedP > 0) {
    if (bedR === 1 || isReqStudio) {
      // BRAZO A: Búsqueda de 1 Habitación / Apartaestudio / Aparta Suite
      if (bedP === 1) {
        bedS = "exact"; // 1 hab exacta
      } else {
        bedS = "missing"; // Descarte absoluto: Si pide 1 hab y oferta tiene 2, 3 o más habs -> 0% ROJO
      }
    } else {
      // BRAZO B: Búsqueda Familiar (a partir de 2 Habs)
      if (bedP < bedR) {
        bedS = "missing"; // Ofrecidas menores que demandadas
      } else if (bedP > bedR + 1) {
        bedS = "missing"; // Desborde de escala (máx +1 hab de confort permitida)
      } else {
        bedS = "exact"; // Confort permitido (igual o +1 hab)
      }
    }
  } else if (bedR === 0 && bedP > 0) {
    bedS = isPropStudio ? "exact" : "exact";
  }
  const reqBedLabel = bedR > 0 
    ? `${bedR} hab.${bedInferred ? " (Inferido 🔍)" : ""}` 
    : "Flexible / No especificado";

  add(
    "Habitaciones", 
    reqBedLabel, 
    bedP > 0 ? `${bedP} hab.` : "N/E", 
    bedS, 
    8, 
    <Bed className="w-3.5 h-3.5" />
  );

  // 7. Baños (Nunca menor que los solicitados)
  let bathR = req.banosMin ? Number(req.banosMin) : 0;
  let bathInferred = false;
  if (bathR <= 0 && reqTextLower) {
    const m = reqTextLower.match(/(\d+(?:\.\d+)?)\s*(?:o\s*más\s*)?(?:wc|baño|baños|bñ)/i)
           || reqTextLower.match(/(\d+)\s*hab\s*con\s*baño/i);
    if (m) { bathR = parseFloat(m[1]); bathInferred = true; }
  }
  let bathP = prop.bathrooms ? Number(prop.bathrooms) : 0;
  if (bathP <= 0 && propTextLower) {
    const mBP = propTextLower.match(/(\d+)\s*(?:wc|baño|baños|bñ)/i);
    if (mBP) bathP = parseInt(mBP[1], 10);
  }

  let bathS: MatchStatus = "neutral";
  if (bathR > 0 && bathP > 0) {
    if (bathP < bathR) {
      bathS = "missing";
    } else if (bathP >= bathR) {
      bathS = "exact"; // Regla Doctrinal: prop >= req es 100% Confort
    } else {
      bathS = "warn";
    }
  } else if (bathR === 0 && bathP > 0) {
    bathS = "exact";
  }
  const reqBathLabel = bathR > 0 
    ? `≥ ${bathR} baño${bathR > 1 ? "s" : ""}${bathInferred ? " (Inferido 🔍)" : ""}` 
    : "Flexible / No especificado";

  const formatBathValue = (val: number) => {
    if (val <= 0) return "N/E";
    if (val % 1 !== 0) {
      const full = Math.floor(val);
      return `${val} (${full} com. + 1 social)`;
    }
    return `${val} baño${val > 1 ? "s" : ""}`;
  };

  add(
    "Baños", 
    reqBathLabel, 
    formatBathValue(bathP), 
    bathS, 
    5, 
    <Bath className="w-3.5 h-3.5" />
  );

  // 8. Parqueaderos (Nunca menor que los solicitados)
  let garR = req.parqueaderosMin ? Number(req.parqueaderosMin) : 0;
  let garInferred = false;
  if (garR <= 0 && reqTextLower) {
    const m = reqTextLower.match(/(?:parqueadero|parqueaderos|garaje|garajes|ptero|g\.)\s*\.?\s*(\d+)/i)
           || reqTextLower.match(/(\d+)\s*(?:parqueadero|parqueaderos|garaje|garajes|ptero|g\.|individuales)/i)
           || /garajes|parqueaderos/i.test(reqTextLower);
    if (m && m[1]) { garR = parseInt(m[1], 10); garInferred = true; }
    else if (/garajes|parqueaderos/i.test(reqTextLower)) { garR = 1; garInferred = true; }
  }

  let garP = prop.garages ? Number(prop.garages) : 0;
  let garPInferred = false;
  if (garP <= 0 && propTextLower) {
    const mGP = propTextLower.match(/(\d+)\s*(?:parqueo|parqueos|parqueadero|parqueaderos|garaje|garajes|ptero)/i)
             || propTextLower.match(/(?:parqueo|parqueos|parqueadero|parqueaderos|garaje|garajes|ptero)\s*:?\s*(\d+)/i);
    if (mGP) { garP = parseInt(mGP[1], 10); garPInferred = true; }
  }

  const garType = (prop.garageType || "").toLowerCase();
  const reqWantsIndep = reqTextLower.includes("independiente") || reqTextLower.includes("libre") || reqTextLower.includes("no lineal");

  let garS: MatchStatus = "neutral";
  let garPropLabel = garP > 0 ? `${garP} garaje${garP > 1 ? "s" : ""}${garPInferred ? " (Inferido 🔍)" : ""}` : "N/E";

  if (garType === "independiente")  garPropLabel += " (✅ Independiente)";
  else if (garType === "lineal")    garPropLabel += " (⚠️ Lineal)";
  else if (garType === "mixto")     garPropLabel += " (🔄 Mixto)";

  if (garR > 0 && garP > 0) {
    if (garP < garR || (reqWantsIndep && garType === "lineal")) {
      garS = "missing";
    } else if (garP >= garR) {
      garS = "exact"; // Regla Doctrinal: prop >= req es 100% Confort
    } else {
      garS = "warn";
    }
  } else if (garR === 0 && garP > 0) {
    garS = "exact";
  }
  const garReqLabel = garR > 0
    ? `≥ ${garR} ${reqWantsIndep ? "(Indep.)" : "garaje"}${garR > 1 ? "s" : ""}${garInferred ? " (Inferido 🔍)" : ""}`
    : "Flexible / No especificado";

  add(
    "Parqueaderos",
    garReqLabel,
    garPropLabel,
    garS,
    5,
    <Car className="w-3.5 h-3.5" />
  );

  // 9. Estrato
  const estratoArr: number[] = Array.isArray(req.estratoDeseado) ? req.estratoDeseado
    : req.estratoDeseado ? [Number(req.estratoDeseado)] : [];
  if (estratoArr.length === 0 && reqTextLower) {
    const mEstR = reqTextLower.match(/estrato\s*:?\s*(\d)/i);
    if (mEstR) estratoArr.push(parseInt(mEstR[1], 10));
  }
  let estratoP = prop.stratum || prop.estrato;
  if ((!estratoP || Number(estratoP) <= 0) && propTextLower) {
    const mEstP = propTextLower.match(/estrato\s*:?\s*(\d)/i);
    if (mEstP) estratoP = parseInt(mEstP[1], 10);
  }
  const hasEstratoReq = estratoArr.length > 0 && estratoArr[0] > 0;
  let estS: MatchStatus = "neutral";
  if (hasEstratoReq && estratoP && Number(estratoP) > 0) {
    if (estratoArr.length === 1 && estratoArr[0] === Number(estratoP)) {
      estS = "exact";
    } else if (estratoArr.includes(Number(estratoP))) {
      estS = "warn";
    } else {
      estS = "missing";
    }
  } else if (!hasEstratoReq && (estratoP && Number(estratoP) > 0)) {
    estS = "exact"; // Sin restricción por la demanda -> Confort
  }
  const reqEstratoLabel = hasEstratoReq ? `Estrato ${estratoArr.join(", ")}` : "Flexible / Sin restricción";
  add(
    "Estrato", 
    reqEstratoLabel, 
    (estratoP && Number(estratoP) > 0) ? `Estrato ${estratoP}` : "Estrato 5 - 6 (Sector Residencial)", 
    estS, 
    7, 
    <Shield className="w-3.5 h-3.5" />
  );

  // 11. Antigüedad / Año de Construcción
  let ageR = req.antiguedadMax ? Number(req.antiguedadMax) : (req.preferredAge ? Number(req.preferredAge) : 0);
  if (ageR <= 0 && reqTextLower) {
    const mAntig = reqTextLower.match(/(?:máximo|max|hasta)\s*(\d{1,2})\s*años?\s*(?:de\s*)?(?:construido|construccion|construcción|antigüedad|antiguedad)?/i)
                || reqTextLower.match(/(\d{1,2})\s*años?\s*(?:de\s*)?(?:construido|antigüedad)/i);
    if (mAntig) ageR = parseInt(mAntig[1], 10);
  }

  let ageP = prop.antiguedadAnos != null ? Number(prop.antiguedadAnos)
    : (prop.yearBuilt ? (new Date().getFullYear() - Number(prop.yearBuilt))
    : (prop.constructionYear ? (new Date().getFullYear() - Number(prop.constructionYear)) : -1));

  if (ageP < 0 && propTextLower) {
    const mPropAge = propTextLower.match(/(?:🏢|⏳|⏱️|edificio\s*(?:de|más\s*de|mas\s*de)?|antigüedad|antiguedad|tiene|\|)\s*(\d{1,2})\s*a[ñn]os/i)
                  || propTextLower.match(/(\d{1,2})\s*a[ñn]os\s*(?:de\s*)?(?:antigüedad|construido|edificio)/i);
    if (mPropAge) ageP = parseInt(mPropAge[1], 10);
  }

  let ageS: MatchStatus = "neutral";
  if (ageR > 0 && ageP >= 0) {
    if (ageP <= ageR) ageS = "exact";
    else ageS = "warn";
  } else if (ageR <= 0 && ageP >= 0) {
    ageS = "exact"; // Sin restricción por la demanda -> Confort
  }

  const reqAgeLabel = ageR > 0 ? `≤ ${ageR} años de construcción` : "Flexible / Sin restricción";
  const propAgeLabel = ageP >= 0
    ? (ageP === 0 ? "🏗️ Obra nueva" : `${ageP} años${prop.yearBuilt ? ` (${prop.yearBuilt})` : ""}`)
    : "N/E (Consultar al Asesor)";

  add(
    "Antigüedad / Año",
    reqAgeLabel,
    propAgeLabel,
    ageS,
    5,
    <Calendar className="w-3.5 h-3.5" />
  );

  // 12. Permuta & Modalidad de Pago
  const reqPermuta = reqTextLower.includes("permuta") || (req.tipoNegocioDeseado || "").toLowerCase().includes("permuta");
  const propPermuta = propRawText.includes("permuta") || (prop.transactionType || "").toLowerCase().includes("permuta");
  let permutaS: MatchStatus = "neutral";
  if (reqPermuta || propPermuta) {
    permutaS = (reqPermuta && propPermuta) ? "exact" : "warn";
  } else {
    permutaS = "exact";
  }
  add(
    "Permuta / Pago",
    reqPermuta ? "Acepta Permuta / Parte de pago" : "Venta Directa / Tradicional",
    propPermuta ? "Acepta Permuta / Recibe menor valor" : "Venta Directa / Tradicional",
    permutaS,
    5,
    <SlidersHorizontal className="w-3.5 h-3.5" />
  );

  // 13. Cocina & Acabados
  const propCocina = prop.kitchenType || (propRawText.includes("isla") ? "Abierta tipo Isla" : propRawText.includes("integral") ? "Integral" : propRawText.includes("abierta") ? "Abierta" : "Integral");
  const reqCocina = reqTextLower.includes("isla") ? "Abierta tipo Isla" : reqTextLower.includes("abierta") ? "Abierta" : "Cualquiera / Flexible";
  let cocinaS: MatchStatus = "neutral";
  if (reqCocina !== "Cualquiera / Flexible") {
    cocinaS = propCocina.toLowerCase().includes(reqCocina.toLowerCase()) ? "exact" : "warn";
  } else {
    cocinaS = propCocina !== "Integral" ? "plus" : "exact";
  }
  add(
    "Cocina & Acabados",
    reqCocina !== "Cualquiera / Flexible" ? reqCocina : "Integral / Flexible",
    propCocina,
    cocinaS,
    4,
    <Sparkles className="w-3.5 h-3.5" />
  );

  // 14. Espacio Exterior Condicional (Patio / Jardín si es Casa vs Balcón / Terraza si es Apartamento)
  const isHouse = (prop.propertyType || "").toLowerCase().includes("casa") || 
                  (prop.propertyType || "").toLowerCase() === "house" || 
                  propRawText.toLowerCase().startsWith("ofrezco casa") ||
                  propRawText.toLowerCase().includes("casa en venta") ||
                  propRawText.toLowerCase().includes("casa en arriendo") ||
                  (prop.name || "").toLowerCase().includes("casa");

  if (isHouse) {
    const propPatio = propRawText.includes("patio") || propRawText.includes("jardin") || propRawText.includes("jardín") || propRawText.includes("solar") || propRawText.includes("zona verde");
    const reqPatio = reqTextLower.includes("patio") || reqTextLower.includes("jardin") || reqTextLower.includes("jardín") || reqTextLower.includes("importante patio");
    let patioStatus: MatchStatus = "neutral";
    if (reqPatio) {
      patioStatus = propPatio ? "exact" : "warn";
    } else {
      patioStatus = propPatio ? "plus" : "neutral";
    }
    add(
      reqTextLower.includes("importante patio") ? "Importante Patio (Casa)" : "Patio / Jardín Privado",
      reqPatio ? (reqTextLower.includes("importante patio") ? "Importante Patio (Condición Si es Casa)" : "Exige Patio / Zona Verde") : "Flexible",
      propPatio ? "Sí (Incluye Patio / Jardín)" : "Sin patio especificado (Consultar al Asesor)",
      patioStatus,
      5,
      <Trees className="w-3.5 h-3.5" />
    );

    // Conjunto Cerrado & Vigilancia para Casa
    const propConjunto = propRawText.includes("conjunto cerrado") || propRawText.includes("conjunto") || propRawText.includes("club house");
    const propVigilancia = propRawText.includes("vigilancia") || propRawText.includes("porteria") || propRawText.includes("portería") || propRawText.includes("24 horas");
    const reqConjunto = reqTextLower.includes("conjunto cerrado") || reqTextLower.includes("vigilancia");
    let conjStatus: MatchStatus = "neutral";
    if (reqConjunto) {
      conjStatus = (propConjunto || propVigilancia) ? "exact" : "warn";
    } else {
      conjStatus = (propConjunto || propVigilancia) ? "plus" : "neutral";
    }
    add(
      "Conjunto Cerrado & Vigilancia",
      reqConjunto ? "Conjunto Cerrado con Vigilancia" : "Flexible",
      propConjunto && propVigilancia ? "Sí (Conjunto Cerrado + Vigilancia 24h)" : propConjunto ? "Sí (En Conjunto Cerrado)" : propVigilancia ? "Sí (Con Vigilancia 24h)" : "Casa tradicional exterior",
      conjStatus,
      6,
      <ShieldCheck className="w-3.5 h-3.5" />
    );

    // Acceso Garaje para Casa
    const reqStreetGarage = reqTextLower.includes("nivel de la calle") || reqTextLower.includes("a nivel") || reqTextLower.includes("garaje a nivel");
    const propStreetGarage = propRawText.includes("nivel") || propRawText.includes("cubierto") || propRawText.includes("parqueadero") || (prop.garages && prop.garages > 0);
    if (reqStreetGarage || propStreetGarage) {
      let garAccStatus: MatchStatus = "neutral";
      if (reqStreetGarage) {
        garAccStatus = propStreetGarage ? "exact" : "warn";
      } else {
        garAccStatus = propStreetGarage ? "plus" : "neutral";
      }
      add(
        "Acceso Garaje (Casa)",
        reqStreetGarage ? "Garaje a Nivel de la Calle" : "Flexible",
        propStreetGarage ? "Sí (Garaje Cubierto a Nivel)" : "Sin garaje a nivel especificado",
        garAccStatus,
        4,
        <Car className="w-3.5 h-3.5" />
      );
    }
  } else {
    // Para Apartamentos: Balcón / Terraza
    const propBalcon = propRawText.includes("balcon") || propRawText.includes("balcón") || prop.hasBalcony;
    const propTerraza = propRawText.includes("terraza") || prop.hasTerrace;
    const reqBalcon = reqTextLower.includes("balcon") || reqTextLower.includes("balcón") || reqTextLower.includes("terraza");
    let extSpaceS: MatchStatus = "neutral";
    if (reqBalcon) {
      extSpaceS = (propBalcon || propTerraza) ? "exact" : "warn";
    } else {
      extSpaceS = (propBalcon || propTerraza) ? "plus" : "neutral";
    }
    add(
      "Balcón / Terraza",
      reqBalcon ? (reqTextLower.includes("terraza amplia") ? "Exige Terraza Amplia Exclusiva" : "Exige Balcón o Terraza") : "Flexible / No exigido",
      propTerraza ? "Sí (Con Terraza)" : propBalcon ? "Sí (Con Balcón)" : "Sin balcón especificado",
      extSpaceS,
      5,
      <Ruler className="w-3.5 h-3.5" />
    );

    // Equipamiento Edificio
    const propAscensor = propRawText.includes("ascensor") || prop.hasElevator || (prop.bedrooms && prop.bedrooms >= 3 && prop.areaTotal && Number(prop.areaTotal) >= 150);
    const propConjunto = propRawText.includes("club house") || propRawText.includes("gimnasio") || propRawText.includes("piscina") || propRawText.includes("conjunto");
    const reqAscensor = reqTextLower.includes("ascensor");
    let equipS: MatchStatus = "neutral";
    if (reqAscensor) {
      equipS = propAscensor ? "exact" : "warn";
    } else {
      equipS = propAscensor ? "plus" : "neutral";
    }

    add(
      "Equipamiento Edificio",
      reqAscensor ? "Con Ascensor obligatorio" : "Flexible",
      propAscensor && propConjunto ? "Ascensor + Club House / Zonas Comunes" : propAscensor ? "Con Ascensor" : "Edificio convencional",
      equipS,
      6,
      <Building2 className="w-3.5 h-3.5" />
    );
  }

  // 16. Depósito / Bodega Interna
  const reqStorage = reqTextLower.includes("deposito") || reqTextLower.includes("depósito") || reqTextLower.includes("bodega interna") || reqTextLower.includes("cuarto util") || reqTextLower.includes("cuarto útil");
  const propStorage = propRawText.includes("deposito") || propRawText.includes("depósito") || propRawText.includes("bodega") || propRawText.includes("cuarto util") || propRawText.includes("cuarto útil") || prop.hasStorage;
  let storageS: MatchStatus = "neutral";
  if (reqStorage) {
    storageS = propStorage ? "exact" : "warn";
  } else if (propStorage) {
    storageS = "plus"; // Oferta con depósito -> Bono de confort
  } else {
    storageS = "neutral";
  }
  add(
    "Depósito / Cuarto Útil",
    reqStorage ? "Exige Depósito / Cuarto Útil" : "Flexible / No exigido",
    propStorage ? (propRawText.includes("2 depósitos") ? "Sí (2 Depósitos independientes)" : "Sí (Con Depósito)") : "Sin depósito especificado",
    storageS,
    4,
    <Building2 className="w-3.5 h-3.5" />
  );

  // ── ATRIBUTOS ADAPTATIVOS AUTODESCUBIERTOS (Capa A - Matriz Dinámica) ──

  // A. Vigilancia 24/7 Presencial (No Automatizada)
  const reqWants24_7 = reqTextLower.includes("vigilancia 24/7") || reqTextLower.includes("vigilancia 24 horas") || reqTextLower.includes("porteria 24/7") || reqTextLower.includes("portería 24/7") || reqTextLower.includes("no automatiz") || reqTextLower.includes("vigilancia presencial") || reqTextLower.includes("portero");
  const propHas24_7 = propRawText.includes("vigilancia") || propRawText.includes("porteria") || propRawText.includes("portería") || propRawText.includes("24 horas") || propRawText.includes("24/7") || propRawText.includes("conserje") || (prop.addressNeighborhood && /santa b[aá]rbara|chic[oó]|rosales|cedritos|cabrera|nogal/i.test(prop.addressNeighborhood)) || !isHouse;
  
  if (reqWants24_7 || propRawText.includes("vigilancia") || propRawText.includes("porteria") || propRawText.includes("portería")) {
    let vigStatus: MatchStatus = "neutral";
    if (reqWants24_7) {
      vigStatus = propHas24_7 ? "exact" : "warn";
    } else if (propHas24_7) {
      vigStatus = "plus"; // Bono de confort
    }
    add(
      reqTextLower.includes("no automatiz") ? "Vigilancia 24/7 Presencial (No Automatizada)" : "Vigilancia 24/7 Presencial",
      reqTextLower.includes("no automatiz") ? "Exige Vigilancia Presencial 24/7 (No automatizada)" : reqWants24_7 ? "Exige Vigilancia 24/7" : "Flexible",
      propHas24_7 ? "Sí (Vigilancia 24 Horas Presencial / Portería Física)" : "Sin vigilancia física especificada",
      vigStatus,
      4,
      <ShieldCheck className="w-3.5 h-3.5" />
    );
  }

  // B. Estudio / Star de TV / Hall de Alcobas
  const reqWantsStudy = reqTextLower.includes("estudio") || reqTextLower.includes("estar de tv") || reqTextLower.includes("star de tv") || reqTextLower.includes("hall de alcobas");
  const propHasStudy = propRawText.includes("estudio") || propRawText.includes("estar de tv") || propRawText.includes("star de tv") || propRawText.includes("hall de alcobas") || (prop.amenities && JSON.stringify(prop.amenities).toLowerCase().includes("estudio"));
  
  if (reqWantsStudy || propHasStudy) {
    let studyStatus: MatchStatus = "neutral";
    if (reqWantsStudy && propHasStudy) studyStatus = "exact";
    else if (reqWantsStudy && !propHasStudy) studyStatus = "warn";
    else if (!reqWantsStudy && propHasStudy) studyStatus = "plus"; // Bono confort
    add(
      "Estudio / Star de TV",
      reqTextLower.includes("o estudio") ? "2 habitaciones o Estudio" : reqWantsStudy ? "Exige Estudio / Star de TV" : "Flexible",
      propHasStudy ? "Sí (Estudio independiente)" : "Sin estudio independiente",
      studyStatus,
      4,
      <BookOpen className="w-3.5 h-3.5" />
    );
  }

  // C. Zonas Sociales & Chimenea
  const propHasFireplace = propRawText.includes("chimenea") || propRawText.includes("doble sala") || propRawText.includes("doble altura");
  const reqWantsFireplace = reqTextLower.includes("chimenea") || reqTextLower.includes("doble sala");
  if (propHasFireplace || reqWantsFireplace) {
    let fpStatus: MatchStatus = "neutral";
    if (reqWantsFireplace && propHasFireplace) fpStatus = "exact";
    else if (!reqWantsFireplace && propHasFireplace) fpStatus = "plus"; // Bono confort
    else fpStatus = "warn";
    add(
      "Zonas Sociales & Chimenea",
      reqWantsFireplace ? "Exige Chimenea / Doble Sala" : "Flexible",
      propHasFireplace ? "Sí (Doble sala con chimenea)" : "Sin chimenea especificada",
      fpStatus,
      3,
      <Sparkles className="w-3.5 h-3.5" />
    );
  }

  // D. Tipología de Cocina
  let reqKitchen = req.kitchenType || (reqTextLower.includes("cocina cerrada") ? "Cerrada" : reqTextLower.includes("cocina abierta") ? "Abierta" : reqTextLower.includes("tipo isla") || reqTextLower.includes("isla") ? "Abierta tipo Isla" : null);
  let propKitchen = prop.kitchenType || (propRawText.includes("cocina cerrada") ? "Cerrada" : propRawText.includes("cocina abierta") ? "Abierta" : propRawText.includes("tipo isla") || propRawText.includes("isla") ? "Abierta tipo Isla" : null);
  if (reqKitchen || propKitchen) {
    let kStatus: MatchStatus = "neutral";
    if (reqKitchen && propKitchen) {
      kStatus = reqKitchen.toLowerCase() === propKitchen.toLowerCase() ? "exact" : (reqKitchen.toLowerCase().includes("abierta") && propKitchen.toLowerCase().includes("abierta")) ? "exact" : "warn";
    } else if (propKitchen) {
      kStatus = "plus";
    }
    add(
      "Tipología de Cocina",
      reqKitchen ? `Cocina ${reqKitchen}` : "Flexible / Integral",
      propKitchen ? `Cocina ${propKitchen}` : "Integral",
      kStatus,
      4,
      <Utensils className="w-3.5 h-3.5" />
    );
  }

  // E. Cuarto y Baño de Servicio (CBS)
  const reqCBS = reqTextLower.includes("cbs") || reqTextLower.includes("cuarto de servicio") || reqTextLower.includes("alcoba de servicio") || reqTextLower.includes("cuarto y baño de servicio") || reqTextLower.includes("cuarto y bano de servicio");
  const propCBS = propRawText.includes("cbs") || propRawText.includes("cuarto de servicio") || propRawText.includes("alcoba de servicio") || propRawText.includes("cuarto y baño de servicio") || propRawText.includes("alcoba para el servicio") || prop.hasServiceRoom;
  if (reqCBS || propCBS) {
    let cbsStatus: MatchStatus = "neutral";
    if (reqCBS && propCBS) cbsStatus = "exact";
    else if (reqCBS && !propCBS) cbsStatus = "warn";
    else if (!reqCBS && propCBS) cbsStatus = "plus"; // Oferta con CBS es bono de confort
    add(
      "Cuarto y Baño Servicio (CBS)",
      reqCBS ? "Exige CBS (Cuarto y Baño de Servicio)" : "Flexible / No exigido",
      propCBS ? "Sí (Incluye Cuarto y Baño de Servicio)" : "Sin CBS especificado",
      cbsStatus,
      4,
      <Home className="w-3.5 h-3.5" />
    );
  }

  // F. Acabado de Pisos
  let reqPisos = reqTextLower.includes("madera maciza") ? "Madera Maciza" : reqTextLower.includes("madera") ? "Madera" : reqTextLower.includes("laminado") ? "Laminado" : reqTextLower.includes("marmol") || reqTextLower.includes("mármol") ? "Mármol" : reqTextLower.includes("porcelanato") ? "Porcelanato" : null;
  let propPisos = propRawText.includes("madera maciza") ? "Madera Maciza" : propRawText.includes("madera") ? "Madera" : propRawText.includes("laminado") ? "Laminado" : propRawText.includes("marmol") || propRawText.includes("mármol") ? "Mármol" : propRawText.includes("porcelanato") ? "Porcelanato" : null;
  if (reqPisos || propPisos) {
    let pStatus: MatchStatus = "neutral";
    if (reqPisos && propPisos) {
      pStatus = reqPisos === propPisos ? "exact" : (reqPisos === "Madera" && propPisos === "Laminado") ? "warn" : "warn";
    } else if (propPisos && propPisos !== "N/E") {
      pStatus = "plus";
    }
    add(
      "Acabado de Pisos",
      reqPisos ? `Pisos en ${reqPisos}` : "Flexible",
      propPisos ? `Pisos en ${propPisos}` : "N/E",
      pStatus,
      3,
      <Sparkles className="w-3.5 h-3.5" />
    );
  }

  // G. Orientación / Asoleación / Iluminación
  let reqSol = reqTextLower.includes("luz de la mañana") || reqTextLower.includes("luz de manana") ? "Luz de la Mañana" : reqTextLower.includes("sol de tarde") ? "Sol de Tarde" : reqTextLower.includes("exterior iluminado") || reqTextLower.includes("muy iluminado") ? "Exterior Iluminado" : null;
  let propSol = propRawText.includes("luz de la mañana") || propRawText.includes("luz de manana") ? "Luz de la Mañana" : propRawText.includes("sol de tarde") ? "Sol de Tarde" : propRawText.includes("exterior iluminado") || propRawText.includes("muy iluminado") || propRawText.includes("iluminado") ? "Exterior Iluminado" : null;
  if (reqSol || propSol) {
    let sStatus: MatchStatus = "neutral";
    if (reqSol && propSol) {
      sStatus = reqSol === propSol ? "exact" : (reqSol === "Luz de la Mañana" && propSol === "Exterior Iluminado") ? "exact" : "warn";
    } else if (propSol) {
      sStatus = "plus";
    }
    add(
      "Orientación / Asoleación",
      reqSol ? reqSol : "Flexible / Iluminado",
      propSol ? propSol : "Exterior Iluminado",
      sStatus,
      3,
      <Sun className="w-3.5 h-3.5" />
    );
  }

  // H. Planta Eléctrica e Infraestructura
  const reqPlanta = reqTextLower.includes("planta") || reqTextLower.includes("suplencia total");
  const propPlanta = propRawText.includes("planta electrica") || propRawText.includes("planta eléctrica") || propRawText.includes("suplencia total") || prop.hasPowerPlant;
  if (reqPlanta || propPlanta) {
    let plantaStatus: MatchStatus = "neutral";
    if (reqPlanta && propPlanta) plantaStatus = "exact";
    else if (propPlanta) plantaStatus = "plus";
    else plantaStatus = "warn";
    add(
      "Planta Eléctrica Edificio",
      reqPlanta ? "Exige Planta Eléctrica / Suplencia" : "Flexible",
      propPlanta ? "Sí (Planta Eléctrica de Suplencia)" : "Sin planta especificada",
      plantaStatus,
      3,
      <Zap className="w-3.5 h-3.5" />
    );
  }

  // I. Parqueadero de Visitantes
  const reqVisitantes = reqTextLower.includes("visitantes") || reqTextLower.includes("parqueadero de visitantes") || reqTextLower.includes("parqueo visitantes");
  const propVisitantes = propRawText.includes("visitantes") || propRawText.includes("parqueadero de visitantes") || propRawText.includes("parqueadero para visitantes") || prop.hasVisitorParking;
  if (reqVisitantes || propVisitantes) {
    let vStatus: MatchStatus = "neutral";
    if (reqVisitantes && propVisitantes) vStatus = "exact";
    else if (reqVisitantes && !propVisitantes) vStatus = "warn";
    else if (!reqVisitantes && propVisitantes) vStatus = "exact";
    add(
      "Parqueadero de Visitantes",
      reqVisitantes ? "Exige Parqueadero de Visitantes" : "Flexible",
      propVisitantes ? "Sí (Parqueadero para Visitantes)" : "Sin visitantes especificado",
      vStatus,
      3,
      <Car className="w-3.5 h-3.5" />
    );
  }

  // 17. Teléfono / Contacto WhatsApp
  const reqContactPhone = extractPhoneFromItem(req);
  const propContactPhone = extractPhoneFromItem(prop);
  add(
    "Teléfono / Contacto WhatsApp",
    reqContactPhone.display || "N/E",
    propContactPhone.display || "N/E",
    (reqContactPhone.cleanNumber && propContactPhone.cleanNumber) ? "exact" : "neutral",
    0,
    <Phone className="w-3.5 h-3.5" />
  );


  // ── ESTADÍSTICA Y TABULACIÓN DOCTRINAL DE MATCH VECY (REGULARES 80%, 85%, 90%, 97%, 100%) ──
  // 1. Si cualquiera de los 5 primeros campos en duro NO COINCIDE 100% (no está en verde) -> autoScore = 0
  const top5Rows = rows.slice(0, 5);
  const hasHardMismatch = top5Rows.some(r => r.status !== "exact" && r.status !== "ok");

  // 2. Filtros duros físicos y financieros: Precio supera presupuesto o física menor (Oferta < Demanda)
  const hardPhysicalMismatch = 
    (!isReqRentMatch && saleS === "missing") || 
    (isReqRentMatch && rentS === "missing") || 
    (areS === "missing") || 
    (bedS === "missing") || 
    (bathS === "missing") || 
    (garS === "missing");

  let autoScore = 0;
  if (hasHardMismatch || hardPhysicalMismatch) {
    autoScore = 0;
  } else {
    // 3. Con cero fallas duras, evaluamos la afinidad:
    const allExact = rows.every(r => r.label.includes("Teléfono") || r.status === "exact" || r.status === "ok" || r.status === "plus");

    if (allExact) {
      autoScore = 100; // 🎯 100% MATCH PERFECTO (TODAS LAS FILAS EN "COINCIDE" O "PLUS OFERTADO")
    } else {
      const downstreamRows = rows.slice(5, -1); // Excluyendo teléfono
      const filledCount = downstreamRows.filter(r => r.reqVal !== "N/E" && r.propVal !== "N/E" && r.status !== "missing").length;
      const ratio = downstreamRows.length > 0 ? filledCount / downstreamRows.length : 0;

      if (ratio < 0.50) {
        autoScore = 80;
      } else if (ratio < 0.70) {
        autoScore = 85;
      } else if (ratio < 0.85) {
        autoScore = 90;
      } else if (ratio < 0.95) {
        autoScore = 95;
      } else {
        autoScore = 97;
      }
    }
  }

  return { rows, autoScore };

}

function formatCOP(val: string | number) {
  const num = parseFloat(String(val));
  if (isNaN(num) || num === 0) return "N/E";
  return "$" + Math.round(num).toLocaleString('es-CO');
}

function isValidRealPhoneNumber(clean: string): boolean {
  if (!clean) return false;
  // Rechazar identificadores de grupo de WhatsApp o hilos de Baileys (empiezan por 11, 12036, 1203, o tienen > 13 dígitos)
  if (clean.startsWith("11") || clean.startsWith("12036") || clean.startsWith("1203") || clean.length > 13) {
    return false;
  }
  // Celular Colombia: 10 dígitos (3XXXXXXXXX) o 12 dígitos (573XXXXXXXXX)
  if ((clean.length === 10 && clean.startsWith("3")) || (clean.length === 12 && clean.startsWith("573"))) {
    return true;
  }
  // Fijo Colombia: 10 dígitos (60XXXXXXXX) o 12 dígitos (5760XXXXXXXX)
  if ((clean.length === 10 && clean.startsWith("60")) || (clean.length === 12 && clean.startsWith("5760"))) {
    return true;
  }
  // Números internacionales válidos (entre 10 y 12 dígitos sin prefijos sospechosos)
  if (clean.length >= 10 && clean.length <= 12) {
    return true;
  }
  return false;
}

function extractContactNameFromText(rawText: string | null | undefined): string | null {
  if (!rawText) return null;
  const blacklist = new Set([
    'para', 'con', 'por', 'fotos', 'mas', 'más', 'informacion', 'información', 'informes',
    'amoblado', 'sin', 'incluida', 'inmueble', 'venta', 'arriendo', 'canon', 'precio',
    'cbs', 'piso', 'rmacion', 'rmación', 'inmobiliaria', 'inmobiliario', 'red', 'grupo',
    'directo', 'cita', 'previa', 'whatsapp', 'telefono', 'teléfono', 'celular'
  ]);

  const match = rawText.match(/\b(?:contacto|agente|broker|asesor|asesora|atención|atencion)\s*:?\s*([A-Za-zÁÉÍÓÚáéíóúñÑ]{3,20}(?:\s+[A-Za-zÁÉÍÓÚáéíóúñÑ]{3,20})?)/i);
  if (match) {
    const foundName = match[1].trim();
    const firstWord = foundName.split(/\s+/)[0].toLowerCase();
    if (!blacklist.has(firstWord) && !blacklist.has(foundName.toLowerCase())) {
      return foundName.replace(/\b\w/g, c => c.toUpperCase());
    }
  }
  return null;
}

function isGenericBrokerName(name?: string | null): boolean {
  if (!name) return true;
  const lower = name.trim().toLowerCase();
  return lower.startsWith('asesor +') || lower.startsWith('cliente +') || lower.startsWith('broker +') || lower.includes('sin nombre') || lower.includes('desconocido') || lower === '';
}

function extractPhoneFromItem(item: any): { display: string; cleanNumber: string | null; name: string | null } {
  if (!item) return { display: "Número no disponible", cleanNumber: null, name: null };

  const textName = extractContactNameFromText(item.rawText || item.description);
  const senderName = item.nombreUsuarioWhatsapp || item.pushName || textName || null;

  // 1. Revisar candidatos directos
  const candidates = [
    item.idUsuarioWhatsapp,
    item.contactPhone,
    item.brokerPhone,
    item.phone,
    item.usuarioWhatsapp,
    item.contactNumber,
    item.sellerPhone,
    item.captadorPhone
  ];

  for (const cand of candidates) {
    if (!cand) continue;
    const clean = String(cand).split("@")[0].replace(/\D/g, "");

    // ⛔ EXCLUSIÓN ABSOLUTA: El número de JanIA / VECY Oficial (573192919978) JAMÁS debe mostrarse como teléfono del captador o requiriente
    if (clean === "573192919978" || clean === "3192919978") {
      continue;
    }

    if (isValidRealPhoneNumber(clean)) {
      const formatted = (clean.length === 12 && clean.startsWith("573"))
        ? `+57 ${clean.substring(2, 5)} ${clean.substring(5, 8)} ${clean.substring(8)}`
        : (clean.length === 10 && clean.startsWith("3"))
        ? `+57 ${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6)}`
        : `+${clean}`;
      const cleanNum = clean.length === 10 ? `57${clean}` : clean;
      return {
        display: senderName ? `${senderName} (${formatted})` : formatted,
        cleanNumber: cleanNum,
        name: senderName
      };
    }
  }

  // 2. Buscar en el texto del mensaje por cualquier celular colombiano de 10 dígitos que NO sea el del sistema
  const textToSearch = `${item.rawText || ""} ${item.description || ""} ${item.name || ""} ${item.rawMessage || ""}`;
  const phoneMatches = textToSearch.match(/(?:\+?57\s*)?3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/g);
  if (phoneMatches && phoneMatches.length > 0) {
    for (const pMatch of phoneMatches) {
      const rawMatch = pMatch.replace(/\D/g, "");
      const clean10 = rawMatch.startsWith("57") && rawMatch.length === 12 ? rawMatch.substring(2) : rawMatch;
      if (clean10.length === 10 && clean10.startsWith("3") && clean10 !== "3192919978") {
        const formatted = `+57 ${clean10.substring(0, 3)} ${clean10.substring(3, 6)} ${clean10.substring(6)}`;
        return {
          display: senderName ? `${senderName} (${formatted})` : formatted,
          cleanNumber: `57${clean10}`,
          name: senderName
        };
      }
    }
  }

  return {
    display: senderName ? `${senderName} (+57 N/E - Completar al editar)` : "+57 (Teléfono N/E - Completar al editar)",
    cleanNumber: null,
    name: senderName
  };
}

function formatPhoneDisplay(phone: string | null | undefined) {
  if (!phone) return "Número no disponible";
  const clean = String(phone).split("@")[0].replace(/\D/g, "");
  if (!isValidRealPhoneNumber(clean)) return "Número no disponible";

  if (clean.length === 12 && clean.startsWith("573")) {
    return `+57 ${clean.substring(2, 5)} ${clean.substring(5, 8)} ${clean.substring(8)}`;
  }
  if (clean.length === 10 && clean.startsWith("3")) {
    return `+57 ${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6)}`;
  }
  return `+${clean}`;
}

function isPhoneValidForWA(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const clean = String(phone).split("@")[0].replace(/\D/g, "");
  return isValidRealPhoneNumber(clean);
}

function getValidWaLink(phone: string | null | undefined, text: string): string {
  if (!phone) return '#';
  const clean = String(phone).split("@")[0].replace(/\D/g, "");
  if (!isValidRealPhoneNumber(clean)) return '#';
  const num = clean.startsWith("57") ? clean : `57${clean}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

function renderTextWithClickableLinks(text: string | null | undefined) {
  if (!text) return null;
  // Normalizar espacios múltiples o tabulaciones exageradas que los brokers usan para formatear columnas en WhatsApp
  const cleanedText = text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const urlPattern = /(https?:\/\/[^\s<"']+|wa\.me\/[^\s<"']+|whatsapp\.com\/[^\s<"']+)/gi;
  const parts = cleanedText.split(urlPattern);

  return parts.map((part, i) => {
    if (/^(https?:\/\/|wa\.me\/|whatsapp\.com\/)/i.test(part)) {
      const href = part.startsWith("http") ? part : `https://${part}`;
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline font-semibold break-all inline-flex items-center gap-1 my-0.5"
        >
          {part} <ExternalLink className="w-3 h-3 inline" />
        </a>
      );
    }
    return part;
  });
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
  const [minScore, setMinScore] = React.useState('85');
  const [activeTab, setActiveTab] = React.useState<'calificados' | 'incompletos'>('calificados');
  
  // Estados para Edición Interactiva de Fichas Prediales directamente desde el Cotejo
  const [editingMatchId, setEditingMatchId] = React.useState<number | null>(null);
  const [isSavingOnly, setIsSavingOnly] = React.useState(false);
  const [isRecalculating, setIsRecalculating] = React.useState(false);
  const [editForm, setEditForm] = React.useState<Record<string, any>>({});
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [feedbackStatusMap, setFeedbackStatusMap] = React.useState<Record<number, 'exitoso' | 'rechazado' | 'en_negociacion'>>({});
  const [saveStatusMap, setSaveStatusMap] = React.useState<Record<number, 'saved' | 'recalculated'>>({});

  const cleanTextForSearch = (text: string): string => {
    if (!text) return "";
    return text
      .replace(/^["'«“]|["'»”]$/g, '') // Quitar comillas de apertura o cierre
      .replace(/\*([^*]+)\*/g, '$1')   // Quitar asteriscos de negrita *texto* -> texto
      .replace(/_([^_]+)_/g, '$1')     // Quitar guiones bajos de cursiva _texto_ -> texto
      .replace(/~([^~]+)~/g, '$1')     // Quitar tachado ~texto~ -> texto
      .replace(/```([^`]+)```/g, '$1') // Quitar bloques de código
      .replace(/\s+/g, ' ')           // Normalizar espacios múltiples
      .trim();
  };

  const handleCopy = (text: string, id: string) => {
    try {
      const cleaned = cleanTextForSearch(text);
      navigator.clipboard.writeText(cleaned || text);
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId(prev => (prev === id ? null : prev));
      }, 2000);
    } catch (e) {
      console.error("Error al copiar texto:", e);
    }
  };

  const utils = trpc.useUtils();
  const updatePropMut = trpc.janIA.updatePropertyDetails.useMutation();
  const updateReqMut = trpc.janIA.updateRequirementDetails.useMutation();
  const recalculateMatchMut = trpc.janIA.recalculateMatchForPair.useMutation();
  const recordFeedbackMut = trpc.janIA.recordMatchFeedback.useMutation();

  // Estados para Retroalimentación de Broker (Capa C - Active Learning)
  const [rejectModalMatch, setRejectModalMatch] = React.useState<any>(null);
  const [rejectReason, setRejectReason] = React.useState<string>('');
  const [customRejectNote, setCustomRejectNote] = React.useState<string>('');

  const handleFeedback = async (m: any, action: 'exitoso' | 'rechazado' | 'en_negociacion', reason?: string, note?: string) => {
    try {
      setFeedbackStatusMap(prev => ({ ...prev, [m.id]: action }));
      await recordFeedbackMut.mutateAsync({
        matchId: m.id,
        propertyId: m.property?.id,
        requirementId: m.requirement?.id,
        action,
        motivoRechazo: reason || null,
        notasBroker: note || null,
      });

      if (action === 'rechazado') {
        setTimeout(() => {
          refetch();
        }, 1200);
      }
    } catch (e: any) {
      console.error("Error registrando retroalimentación:", e);
      setFeedbackStatusMap(prev => {
        const next = { ...prev };
        delete next[m.id];
        return next;
      });
    }
  };

  const handleStartEdit = (m: any) => {
    if (editingMatchId === m.id) {
      setEditingMatchId(null);
      setEditForm({});
      return;
    }

    setEditingMatchId(m.id);
    setEditForm({
      // Oferta (Inmueble)
      propSenderName: m.property?.nombreUsuarioWhatsapp || '',
      propPrice: m.property?.price || '',
      propRentPrice: m.property?.rentPrice || '',
      propAdminFee: m.property?.adminFee || '',
      propArea: m.property?.areaTotal || m.property?.areaPrivate || '',
      propBedrooms: m.property?.bedrooms ?? '',
      propBathrooms: m.property?.bathrooms ?? '',
      propGarages: m.property?.garages ?? '',
      propStratum: m.property?.stratum ?? '',
      propZone: m.property?.zone || m.property?.addressNeighborhood || '',
      propLocality: m.property?.addressLocality || '',
      propCity: m.property?.city || 'Bogotá',
      propPropertyType: m.property?.propertyType || '',
      propTransactionType: m.property?.transactionType || '',
      propPhone: m.property?.idUsuarioWhatsapp || m.property?.phone || m.property?.contactPhone || '',

      // Demanda (Requerimiento)
      reqSenderName: m.requirement?.nombreUsuarioWhatsapp || '',
      reqBudget: m.requirement?.presupuestoMax || '',
      reqAdminMax: m.requirement?.adminFeeMax || '',
      reqArea: m.requirement?.areaMin || '',
      reqBedrooms: m.requirement?.habitacionesMin ?? '',
      reqBathrooms: m.requirement?.banosMin ?? '',
      reqGarages: m.requirement?.parqueaderosMin ?? '',
      reqStratum: m.requirement?.estratoDeseado ?? '',
      reqZone: m.requirement?.zonaDeseada || m.requirement?.addressNeighborhood || '',
      reqLocality: m.requirement?.addressLocality || '',
      reqCity: m.requirement?.ciudadDeseada || 'Bogotá',
      reqPropertyType: m.requirement?.tipoInmuebleDeseado || '',
      reqTransactionType: m.requirement?.tipoNegocioDeseado || '',
      reqPhone: m.requirement?.idUsuarioWhatsapp || m.requirement?.phone || m.requirement?.contactPhone || '',
    });
  };

  const normalizePhoneInput = (val?: string) => {
    if (!val || val.trim() === '') return undefined;
    const raw = val.trim();
    if (raw.includes('@')) return raw;
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `57${digits}`;
    if (digits.length > 10) return digits;
    return digits || raw;
  };

  const handleOnlySave = async (m: any) => {
    setIsSavingOnly(true);
    try {
      if (m.property?.id) {
        const cleanPropPhone = normalizePhoneInput(editForm.propPhone);
        await updatePropMut.mutateAsync({
          propertyId: m.property.id,
          price: editForm.propPrice !== undefined && editForm.propPrice !== '' ? String(editForm.propPrice) : undefined,
          rentPrice: editForm.propRentPrice !== undefined && editForm.propRentPrice !== '' ? String(editForm.propRentPrice) : undefined,
          adminFee: editForm.propAdminFee !== undefined && editForm.propAdminFee !== '' ? String(editForm.propAdminFee) : undefined,
          areaTotal: editForm.propArea !== undefined && editForm.propArea !== '' ? String(editForm.propArea) : undefined,
          bedrooms: editForm.propBedrooms !== undefined && editForm.propBedrooms !== '' ? Number(editForm.propBedrooms) : undefined,
          bathrooms: editForm.propBathrooms !== undefined && editForm.propBathrooms !== '' ? Number(editForm.propBathrooms) : undefined,
          garages: editForm.propGarages !== undefined && editForm.propGarages !== '' ? Number(editForm.propGarages) : undefined,
          stratum: editForm.propStratum !== undefined && editForm.propStratum !== '' ? Number(editForm.propStratum) : undefined,
          zone: editForm.propZone ? String(editForm.propZone) : undefined,
          addressNeighborhood: editForm.propZone ? String(editForm.propZone) : undefined,
          addressLocality: editForm.propLocality ? String(editForm.propLocality) : undefined,
          city: editForm.propCity ? String(editForm.propCity) : undefined,
          propertyType: editForm.propPropertyType ? String(editForm.propPropertyType) : undefined,
          transactionType: editForm.propTransactionType ? String(editForm.propTransactionType) : undefined,
          idUsuarioWhatsapp: cleanPropPhone,
          nombreUsuarioWhatsapp: editForm.propSenderName !== undefined && editForm.propSenderName.trim() !== '' ? String(editForm.propSenderName).trim() : undefined,
        });
      }

      if (m.requirement?.id) {
        const cleanReqPhone = normalizePhoneInput(editForm.reqPhone);
        await updateReqMut.mutateAsync({
          requirementId: m.requirement.id,
          presupuestoMax: editForm.reqBudget !== undefined && editForm.reqBudget !== '' ? String(editForm.reqBudget) : undefined,
          adminFeeMax: editForm.reqAdminMax !== undefined && editForm.reqAdminMax !== '' ? String(editForm.reqAdminMax) : undefined,
          areaMin: editForm.reqArea !== undefined && editForm.reqArea !== '' ? String(editForm.reqArea) : undefined,
          habitacionesMin: editForm.reqBedrooms !== undefined && editForm.reqBedrooms !== '' ? Number(editForm.reqBedrooms) : undefined,
          banosMin: editForm.reqBathrooms !== undefined && editForm.reqBathrooms !== '' ? Number(editForm.reqBathrooms) : undefined,
          parqueaderosMin: editForm.reqGarages !== undefined && editForm.reqGarages !== '' ? Number(editForm.reqGarages) : undefined,
          estratoDeseado: editForm.reqStratum !== undefined && editForm.reqStratum !== '' ? Number(editForm.reqStratum) : undefined,
          zonaDeseada: editForm.reqZone ? String(editForm.reqZone) : undefined,
          addressNeighborhood: editForm.reqZone ? String(editForm.reqZone) : undefined,
          ciudadDeseada: editForm.reqCity ? String(editForm.reqCity) : undefined,
          tipoInmuebleDeseado: editForm.reqPropertyType ? String(editForm.reqPropertyType) : undefined,
          tipoNegocioDeseado: editForm.reqTransactionType ? String(editForm.reqTransactionType) : undefined,
          idUsuarioWhatsapp: cleanReqPhone,
          nombreUsuarioWhatsapp: editForm.reqSenderName !== undefined && editForm.reqSenderName.trim() !== '' ? String(editForm.reqSenderName).trim() : undefined,
        });
      }

      setSaveStatusMap(prev => ({ ...prev, [m.id]: 'saved' }));
      await utils.janIA.getAllMatches.invalidate();
      await refetch();
      setTimeout(() => {
        setEditingMatchId(null);
        setEditForm({});
        setSaveStatusMap(prev => {
          const next = { ...prev };
          delete next[m.id];
          return next;
        });
      }, 1800);
    } catch (err: any) {
      console.error("[handleOnlySave] Error:", err);
    } finally {
      setIsSavingOnly(false);
    }
  };

  const handleRecalculateMatch = async (m: any) => {
    setIsRecalculating(true);
    try {
      // Guardar cambios si hay campos editados antes de recalcular
      if (m.property?.id && Object.keys(editForm).some(k => k.startsWith('prop'))) {
        const cleanPropPhone = normalizePhoneInput(editForm.propPhone);
        await updatePropMut.mutateAsync({
          propertyId: m.property.id,
          price: editForm.propPrice !== undefined && editForm.propPrice !== '' ? String(editForm.propPrice) : undefined,
          rentPrice: editForm.propRentPrice !== undefined && editForm.propRentPrice !== '' ? String(editForm.propRentPrice) : undefined,
          adminFee: editForm.propAdminFee !== undefined && editForm.propAdminFee !== '' ? String(editForm.propAdminFee) : undefined,
          areaTotal: editForm.propArea !== undefined && editForm.propArea !== '' ? String(editForm.propArea) : undefined,
          bedrooms: editForm.propBedrooms !== undefined && editForm.propBedrooms !== '' ? Number(editForm.propBedrooms) : undefined,
          bathrooms: editForm.propBathrooms !== undefined && editForm.propBathrooms !== '' ? Number(editForm.propBathrooms) : undefined,
          garages: editForm.propGarages !== undefined && editForm.propGarages !== '' ? Number(editForm.propGarages) : undefined,
          stratum: editForm.propStratum !== undefined && editForm.propStratum !== '' ? Number(editForm.propStratum) : undefined,
          zone: editForm.propZone ? String(editForm.propZone) : undefined,
          addressNeighborhood: editForm.propZone ? String(editForm.propZone) : undefined,
          addressLocality: editForm.propLocality ? String(editForm.propLocality) : undefined,
          city: editForm.propCity ? String(editForm.propCity) : undefined,
          propertyType: editForm.propPropertyType ? String(editForm.propPropertyType) : undefined,
          transactionType: editForm.propTransactionType ? String(editForm.propTransactionType) : undefined,
          idUsuarioWhatsapp: cleanPropPhone,
          nombreUsuarioWhatsapp: editForm.propSenderName !== undefined && editForm.propSenderName.trim() !== '' ? String(editForm.propSenderName).trim() : undefined,
        });
      }

      if (m.requirement?.id && Object.keys(editForm).some(k => k.startsWith('req'))) {
        const cleanReqPhone = normalizePhoneInput(editForm.reqPhone);
        await updateReqMut.mutateAsync({
          requirementId: m.requirement.id,
          presupuestoMax: editForm.reqBudget !== undefined && editForm.reqBudget !== '' ? String(editForm.reqBudget) : undefined,
          adminFeeMax: editForm.reqAdminMax !== undefined && editForm.reqAdminMax !== '' ? String(editForm.reqAdminMax) : undefined,
          areaMin: editForm.reqArea !== undefined && editForm.reqArea !== '' ? String(editForm.reqArea) : undefined,
          habitacionesMin: editForm.reqBedrooms !== undefined && editForm.reqBedrooms !== '' ? Number(editForm.reqBedrooms) : undefined,
          banosMin: editForm.reqBathrooms !== undefined && editForm.reqBathrooms !== '' ? Number(editForm.reqBathrooms) : undefined,
          parqueaderosMin: editForm.reqGarages !== undefined && editForm.reqGarages !== '' ? Number(editForm.reqGarages) : undefined,
          estratoDeseado: editForm.reqStratum !== undefined && editForm.reqStratum !== '' ? Number(editForm.reqStratum) : undefined,
          zonaDeseada: editForm.reqZone ? String(editForm.reqZone) : undefined,
          addressNeighborhood: editForm.reqZone ? String(editForm.reqZone) : undefined,
          ciudadDeseada: editForm.reqCity ? String(editForm.reqCity) : undefined,
          tipoInmuebleDeseado: editForm.reqPropertyType ? String(editForm.reqPropertyType) : undefined,
          tipoNegocioDeseado: editForm.reqTransactionType ? String(editForm.reqTransactionType) : undefined,
          idUsuarioWhatsapp: cleanReqPhone,
          nombreUsuarioWhatsapp: editForm.reqSenderName !== undefined && editForm.reqSenderName.trim() !== '' ? String(editForm.reqSenderName).trim() : undefined,
        });
      }

      if (m.property?.id || m.requirement?.id) {
        await recalculateMatchMut.mutateAsync({
          propertyId: m.property?.id || undefined,
          requirementId: m.requirement?.id || undefined,
        });
      }

      setSaveStatusMap(prev => ({ ...prev, [m.id]: 'recalculated' }));
      await utils.janIA.getAllMatches.invalidate();
      await refetch();
      setTimeout(() => {
        setEditingMatchId(null);
        setEditForm({});
        setSaveStatusMap(prev => {
          const next = { ...prev };
          delete next[m.id];
          return next;
        });
      }, 1800);
    } catch (err: any) {
      console.error("[RecalculateMatch] Error:", err);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Fetch matches directly from server API with auto-refresh every 10s
  const { data: matches = [], isLoading, refetch } = trpc.janIA.getAllMatches.useQuery(undefined, {
    refetchInterval: 60000,
    staleTime: 30000,
  });


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'suggested': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'interested': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'converted': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      default: return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      suggested: '🟢 Match Calificado',
      interested: '📋 Pendiente Enriquecer Ficha',
      converted: 'Cerrado/Negocio',
    };
    return labels[status] || status;
  };

  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 10; // 10 coincidencias por página para carga instantánea ultra-rápida (<0.02s) en móvil y escritorio
  const [expandedMatchIds, setExpandedMatchIds] = useState<Set<number>>(new Set());

  const toggleExpandMatch = (matchId: number) => {
    setExpandedMatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) {
        next.delete(matchId);
      } else {
        next.add(matchId);
      }
      return next;
    });
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, minScore]);

  const filteredMatches = useMemo(() => {
    const seenMatchIds = new Set<number>();
    const seenPairs = new Set<string>();
    const results: any[] = [];

    for (const match of (matches as any[])) {
      if (!match || !match.id || !match.property || !match.requirement) continue;

      const property = match.property;
      const requirement = match.requirement;

      const isEditingThisCard = editingMatchId === match.id;
      const effectiveProp = isEditingThisCard ? {
        ...property,
        price: editForm.propPrice !== undefined && editForm.propPrice !== '' ? editForm.propPrice : property.price,
        rentPrice: editForm.propRentPrice !== undefined && editForm.propRentPrice !== '' ? editForm.propRentPrice : property.rentPrice,
        adminFee: editForm.propAdminFee !== undefined && editForm.propAdminFee !== '' ? editForm.propAdminFee : property.adminFee,
        areaTotal: editForm.propArea !== undefined && editForm.propArea !== '' ? editForm.propArea : property.areaTotal,
        bedrooms: editForm.propBedrooms !== undefined && editForm.propBedrooms !== '' ? editForm.propBedrooms : property.bedrooms,
        bathrooms: editForm.propBathrooms !== undefined && editForm.propBathrooms !== '' ? editForm.propBathrooms : property.bathrooms,
        garages: editForm.propGarages !== undefined && editForm.propGarages !== '' ? editForm.propGarages : property.garages,
        stratum: editForm.propStratum !== undefined && editForm.propStratum !== '' ? editForm.propStratum : property.stratum,
        zone: editForm.propZone !== undefined && editForm.propZone !== '' ? editForm.propZone : property.zone,
        city: editForm.propCity !== undefined && editForm.propCity !== '' ? editForm.propCity : property.city,
      } : property;

      const effectiveReq = isEditingThisCard ? {
        ...requirement,
        presupuestoMax: editForm.reqBudget !== undefined && editForm.reqBudget !== '' ? editForm.reqBudget : requirement.presupuestoMax,
        adminFeeMax: editForm.reqAdminMax !== undefined && editForm.reqAdminMax !== '' ? editForm.reqAdminMax : requirement.adminFeeMax,
        areaMin: editForm.reqArea !== undefined && editForm.reqArea !== '' ? editForm.reqArea : requirement.areaMin,
        habitacionesMin: editForm.reqBedrooms !== undefined && editForm.reqBedrooms !== '' ? editForm.reqBedrooms : requirement.habitacionesMin,
        banosMin: editForm.reqBathrooms !== undefined && editForm.reqBathrooms !== '' ? editForm.reqBathrooms : requirement.banosMin,
        parqueaderosMin: editForm.reqGarages !== undefined && editForm.reqGarages !== '' ? editForm.reqGarages : requirement.parqueaderosMin,
        estratoDeseado: editForm.reqStratum !== undefined && editForm.reqStratum !== '' ? editForm.reqStratum : requirement.estratoDeseado,
        zonaDeseada: editForm.reqZone !== undefined && editForm.reqZone !== '' ? editForm.reqZone : requirement.zonaDeseada,
        ciudadDeseada: editForm.reqCity !== undefined && editForm.reqCity !== '' ? editForm.reqCity : requirement.ciudadDeseada,
      } : requirement;

      // Evaluar la afinidad comercial y la regla doctrinal de los 5 campos en duro + completitud
      const { rows, autoScore } = scoreRows(effectiveReq, effectiveProp);
      const dbScore = parseFloat(match.matchScore || "0");
      // REGLA DOCTRINAL VECY: Si hay cualquier incumplimiento de filtro duro (autoScore === 0 / No Cumple), el match queda descartado inmediatamente (0%) y jamás se muestra
      const displayScore = autoScore === 0 ? 0 : (isEditingThisCard ? autoScore : (autoScore > 0 ? autoScore : dbScore));

      // Mostrar únicamente los matches calificados válidos (85% a 100%)
      if (displayScore < 85) {
        continue;
      }

      // Aplicar filtro de puntuación de la interfaz (ej. "85_94" o minScore)
      if (minScore === "85_94") {
        if (displayScore < 85 || displayScore >= 95) continue;
      } else {
        const minVal = parseFloat(minScore);
        if (displayScore < minVal) continue;
      }

      if (seenMatchIds.has(match.id)) continue;
      
      const pId = property.id;
      const rId = requirement.id;
      if (pId && rId) {
        const pairKey = `${pId}-${rId}`;
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);
      }

      seenMatchIds.add(match.id);

      const propSearchStr = `${property.name || ""} ${property.city || ""} ${property.zone || ""} ${property.addressNeighborhood || ""} ${property.idUsuarioWhatsapp || ""}`.toLowerCase();
      const reqSearchStr = `${requirement.name || ""} ${requirement.ciudadDeseada || ""} ${requirement.zonaDeseada || ""} ${requirement.addressNeighborhood || ""} ${requirement.idUsuarioWhatsapp || ""}`.toLowerCase();
      
      const matchesSearch = !searchTerm || propSearchStr.includes(searchTerm.toLowerCase()) || 
                            reqSearchStr.includes(searchTerm.toLowerCase());

      if (!matchesSearch) continue;

      results.push({
        ...match,
        _precomputedRows: rows,
        _precomputedScore: displayScore,
        _effectiveProp: effectiveProp,
        _effectiveReq: effectiveReq,
      });
    }

    return results;
  }, [matches, minScore, searchTerm, editingMatchId, editForm]);

  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / pageSize));
  const paginatedMatches = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMatches.slice(start, start + pageSize);
  }, [filteredMatches, currentPage, pageSize]);



  const { data: botStatus } = trpc.janIA.getBotStatus.useQuery(undefined, {
    refetchInterval: 30000,
    staleTime: 15000,
    refetchOnWindowFocus: false,
  });

  const kpiStats = useMemo(() => {
    const rawList = (matches as any[]) || [];
    const total = rawList.length;
    const perfect = rawList.filter((m: any) => parseFloat(String(m.matchScore || 0)) >= 95).length;
    const approx = rawList.filter((m: any) => {
      const s = parseFloat(String(m.matchScore || 0));
      return s >= 85 && s < 95;
    }).length;
    const uniqueProps = new Set(rawList.map((m: any) => m.property?.id || m.propertyId).filter(Boolean)).size;
    const uniqueReqs = new Set(rawList.map((m: any) => m.requirement?.id || m.requirementId).filter(Boolean)).size;

    const todayProps = botStatus?.todayProperties ?? uniqueProps;
    const todayReqs = botStatus?.todayRequirements ?? uniqueReqs;

    return { total, perfect, approx, uniqueProps, uniqueReqs, todayProps, todayReqs };
  }, [matches, botStatus]);

  const exportData = () => {
    const headers = ['ID Coincidencia', 'Porcentaje Match', 'Propiedad', 'Propietario Telefono', 'Requerimiento', 'Interesado Telefono', 'Estado', 'Fecha'];
    const rows = (filteredMatches as any[]).map((m: any) => [
      `M${m.id}`,
      `${parseFloat(String(m.matchScore)).toFixed(0)}%`,
      m.property?.name,
      m.property?.idUsuarioWhatsapp ? `+${m.property.idUsuarioWhatsapp.split('@')[0]}` : 'N/A',
      m.requirement?.name,
      m.requirement?.idUsuarioWhatsapp ? `+${m.requirement.idUsuarioWhatsapp.split('@')[0]}` : 'N/A',
      m.status,
      new Date(m.createdAt).toLocaleDateString('es-CO')
    ]);

    const csvContent = [headers.join(','), ...rows.map((e: any[]) => e.map((val: any) => `"${val}"`).join(','))].join('\n');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950 p-4 sm:p-6 border border-white/10 rounded-2xl sm:rounded-3xl shadow-xl">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-[#bf953f] animate-pulse shrink-0" />
            <span>Mesa de Control de Coincidencias</span>
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
          <Button onClick={() => refetch()} variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10 text-xs h-10 min-h-[40px] font-semibold">
            Refrescar
          </Button>
          <Button 
            disabled={filteredMatches.length === 0}
            onClick={exportData} 
            className="bg-[#bf953f] hover:bg-[#a67d32] text-black font-bold flex items-center justify-center gap-1.5 text-xs h-10 min-h-[40px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-black/60 border border-[#bf953f]/30 p-3.5 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#bf953f]/10 border border-[#bf953f]/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-[#bf953f]" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Matches Calificados</p>
            <p className="text-lg sm:text-xl font-black text-white">{kpiStats.total}</p>
          </div>
        </div>

        <div className="bg-black/60 border border-emerald-500/30 p-3.5 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Matches Perfectos (≥95%)</p>
            <p className="text-lg sm:text-xl font-black text-emerald-400">{kpiStats.perfect}</p>
          </div>
        </div>

        <div className="bg-black/60 border border-emerald-500/30 p-3.5 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Inmuebles Hoy</p>
            <p className="text-lg sm:text-xl font-black text-emerald-400">{kpiStats.todayProps}</p>
          </div>
        </div>

        <div className="bg-black/60 border border-indigo-500/30 p-3.5 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">Reqs Hoy</p>
            <p className="text-lg sm:text-xl font-black text-indigo-400">{kpiStats.todayReqs}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-zinc-900/40 p-3 sm:p-4 border border-white/5 rounded-2xl">
        <div className="flex-1 w-full">
          <Input
            placeholder="Buscar por barrio, nombre, descripción o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-black/40 border-white/10 text-white placeholder-zinc-500 text-xs h-10 rounded-xl"
          />
        </div>
        <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 text-white h-10 w-full sm:w-auto shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-zinc-500 shrink-0" />
          <span className="text-xs text-zinc-400 shrink-0">Filtro:</span>
          <select
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            className="bg-transparent border-none text-white focus:ring-0 text-xs font-semibold cursor-pointer outline-none w-full"
          >
            <option className="bg-[#0c0c0c]" value="85">⚡ Todos los Matches (85% - 100%)</option>
            <option className="bg-[#0c0c0c]" value="85_94">⚡ MATCH Aproximado (85% - 94%)</option>
            <option className="bg-[#0c0c0c]" value="95">🎯 MATCH Perfecto (95% - 100%)</option>
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <AnimatePresence>
              {(paginatedMatches as any[]).map((m: any, idx: number) => {
                const isEditingThisCard = editingMatchId === m.id;

                const effectiveProp = m._effectiveProp || m.property;
                const effectiveReq = m._effectiveReq || m.requirement;
                const rows = m._precomputedRows || [];
                const score = m._precomputedScore !== undefined ? m._precomputedScore : parseFloat(m.matchScore?.toString() || "0");
                const date = formatColombiaDate(m.createdAt);

                const exactCount = rows.filter(r => r.status === "exact" || r.status === "ok").length;
                const plusCount = rows.filter(r => r.status === "plus").length;
                const warnCount = rows.filter(r => r.status === "warn").length;
                const failCount = rows.filter(r => r.status === "missing").length;

                const dotColor = score >= 95 
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" 
                  : "bg-[#bf953f] shadow-[0_0_8px_rgba(191,149,63,0.5)]";
                const scoreColor = score >= 95 ? "text-emerald-400" : "text-[#bf953f]";

              return (
                <motion.div 
                  key={m.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(idx * 0.03, 0.3) }}
                  className={`bg-[#0b0b0b] border rounded-3xl overflow-hidden shadow-xl transition-all duration-300 relative group ${
                    isEditingThisCard ? 'border-emerald-500/50 ring-2 ring-emerald-500/20' : 'border-white/5 hover:border-[#bf953f]/25'
                  }`}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-gradient-to-b from-[#bf953f] to-[#a67d32] opacity-50 group-hover:opacity-100 transition-opacity" />

                  {/* Top Bar info */}
                  <div className="bg-white/[0.01] px-3.5 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dotColor}`} />
                      <span className={`text-lg sm:text-xl font-extrabold tracking-tight ${scoreColor}`}>{score.toFixed(0)}% Match</span>
                      <span className="text-zinc-500 text-[11px] sm:text-xs">Afinidad por IA</span>
                      {score >= 95 ? (
                        <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          🎯 MATCH PERFECTO (95% - 100%)
                        </span>
                      ) : (
                        <span className="text-[9px] bg-[#bf953f]/10 border border-[#bf953f]/30 text-[#bf953f] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          ⚡ MATCH APROXIMADO (85% - 94%)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 flex-wrap w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      <button
                        onClick={() => handleStartEdit(m)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 h-9 min-h-[36px] w-full sm:w-auto ${
                          isEditingThisCard 
                            ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40' 
                            : 'bg-[#bf953f]/15 hover:bg-[#bf953f]/25 text-[#bf953f] border border-[#bf953f]/30'
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        {isEditingThisCard ? 'Cancelar Edición' : '✏️ Editar Fichas (Completar N/E)'}
                      </button>

                      <div className="flex items-center gap-3 text-zinc-500 text-xs font-mono ml-auto sm:ml-0">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{date}</span>
                        </div>
                        <span className="text-[10px] text-zinc-600 font-mono">#M{m.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary badges */}
                  <div className="px-4 sm:px-6 py-2.5 flex items-center gap-2 sm:gap-3 border-b border-white/5 flex-wrap bg-black/20">
                    <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">Cotejo:</span>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                      <CheckCircle2 className="w-2.5 h-2.5" /> {exactCount} coinciden
                    </span>
                    {plusCount > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                        <Sparkles className="w-2.5 h-2.5" /> {plusCount} plus ofertados
                      </span>
                    )}
                    {warnCount > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                        <AlertTriangle className="w-2.5 h-2.5" /> {warnCount} aproximados
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
                        <div className="flex items-center gap-2 flex-wrap">
                          {m.property?.origenNombre && (
                            <span className="text-[10px] text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md truncate max-w-[180px] sm:max-w-[200px]" title={m.property.origenNombre}>
                              📍 {m.property.origenNombre}
                            </span>
                          )}
                        </div>
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-white mt-1 break-words">{m.property?.name}</h4>
                      
                      {/* Texto Completo Extraído + Resumen Estructurado Obligatorio */}
                      <div className="text-xs text-zinc-300 bg-white/[0.02] border border-white/5 p-3 rounded-xl leading-relaxed whitespace-pre-wrap break-words space-y-3 select-text cursor-text">
                        {(() => {
                          const pText = (m.property?.rawText || m.property?.description || "").trim();
                          const isGenericImagePlaceholder = pText.includes("[Publicación de Imagen / Flyer Comercial Inmobiliario sin texto en pie de foto]");
                          const propSpecs: string[] = [];
                          if (m.property?.propertyType) propSpecs.push(`• Tipo: ${m.property.propertyType}`);
                          if (m.property?.transactionType) propSpecs.push(`• Negocio: ${m.property.transactionType}`);
                          if (m.property?.zone || m.property?.addressNeighborhood) propSpecs.push(`• Sector: ${m.property.zone || m.property.addressNeighborhood}`);
                          if (m.property?.city || m.property?.addressCity) propSpecs.push(`• Ciudad: ${m.property.city || m.property.addressCity}`);
                          if (m.property?.price && Number(m.property.price) > 0) propSpecs.push(`• Precio: ${formatCOP(m.property.price)}`);
                          if (m.property?.rentPrice && Number(m.property.rentPrice) > 0) propSpecs.push(`• Canon: ${formatCOP(m.property.rentPrice)}`);
                          if (m.property?.areaTotal && Number(m.property.areaTotal) > 0) propSpecs.push(`• Área: ${m.property.areaTotal} m²`);
                          if (m.property?.bedrooms) propSpecs.push(`• Habitaciones: ${m.property.bedrooms}`);
                          if (m.property?.bathrooms) propSpecs.push(`• Baños: ${m.property.bathrooms}`);
                          if (m.property?.garages) propSpecs.push(`• Parqueaderos: ${m.property.garages}`);

                          const fallbackText = m.property?.name ? `${m.property.name}. Ciudad: ${m.property.city || 'Bogotá, D.C.'}. ${m.property.price ? 'Precio: ' + formatCOP(m.property.price) : ''}` : "Publicación sin texto descriptivo registrado";

                          return (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold not-italic">
                                  {isGenericImagePlaceholder ? "🖼️ Desglose de Flyer / Oferta:" : "💬 Publicación Original:"}
                                </p>
                                {(() => {
                                  const copyKey = `prop-${m.id}`;
                                  const isCopied = copiedId === copyKey;
                                  return (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopy(pText || fallbackText, copyKey);
                                      }}
                                      className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all duration-300 border shrink-0 ${
                                        isCopied
                                          ? "bg-cyan-500/25 text-cyan-300 border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.45)] scale-105"
                                          : "text-zinc-400 hover:text-cyan-300 bg-white/5 hover:bg-white/10 border-white/10 hover:border-cyan-400/30 active:scale-95"
                                      }`}
                                      title="Copiar texto original de la publicación"
                                    >
                                      {isCopied ? (
                                        <>
                                          <Check className="w-3.5 h-3.5 text-cyan-300 animate-in zoom-in-50 duration-200" />
                                          <span className="text-cyan-200">¡Copiado!</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" />
                                          <span>Copiar</span>
                                        </>
                                      )}
                                    </button>
                                  );
                                })()}
                              </div>
                              {!isGenericImagePlaceholder && (
                                <p className="italic text-zinc-200 select-text cursor-text">{renderTextWithClickableLinks(pText || fallbackText)}</p>
                              )}
                              {isGenericImagePlaceholder && (
                                <div className="space-y-1 text-zinc-200 select-text cursor-text">
                                  <p className="text-amber-300/90 font-medium text-[11px]">Captado desde Imagen / Flyer sin texto en pie de foto:</p>
                                  {propSpecs.length > 0 && (
                                    <div className="bg-black/30 rounded-lg p-2 font-mono text-[11px] space-y-0.5 text-zinc-300 border border-white/5 select-text">
                                      {propSpecs.map((s, idx) => (
                                        <p key={idx}>{s}</p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}



                        {/* Enlace Público Original / Portal Web / PDF Adjunto */}
                        {(() => {
                          const origUrl = extractPublicLink(m.property);
                          if (!origUrl) return null;
                          const isPdf = origUrl.toLowerCase().includes('.pdf');

                          return (
                            <div className="mt-2.5 pt-2.5 border-t border-white/10 text-xs not-italic flex items-center gap-2 flex-wrap">
                              <span className="text-zinc-400 font-semibold flex items-center gap-1">
                                {isPdf ? "📄 Documento Adjunto:" : "🌐 Enlace de Origen:"}
                              </span>
                              <a 
                                href={origUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all shadow ${
                                  isPdf 
                                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30" 
                                    : "bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30"
                                }`}
                                title={origUrl}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                {isPdf ? "Ver / Descargar PDF Adjunto" : "Abrir Enlace Original del Inmueble"}
                              </a>
                            </div>
                          );
                        })()}

                        {/* Visualizador de Flyer / Imagen Publicada en el Anuncio */}
                        {(() => {
                          const propImgs = extractItemImages(m.property);
                          if (propImgs.length === 0) return null;
                          return (
                            <div className="mt-2.5 pt-2.5 border-t border-amber-500/20 space-y-2 not-italic">
                              <p className="text-[10px] text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                🖼️ Imagen / Flyer del Anuncio Original ({propImgs.length}):
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {propImgs.slice(0, 4).map((imgUrl, imgIdx) => (
                                  <div key={imgIdx} className="relative group rounded-xl overflow-hidden border border-amber-500/30 bg-black/50">
                                    <img 
                                      src={imgUrl} 
                                      alt={`Flyer Inmueble ${imgIdx + 1}`} 
                                      className="w-full h-44 object-contain bg-zinc-950 group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                                      onClick={() => window.open(imgUrl, '_blank')}
                                      onError={(e) => {
                                        const target = e.currentTarget;
                                        if (!target.src.includes('knzmpoprlmbonejshfys.supabase.co')) {
                                          const filename = target.src.split('/').pop();
                                          if (filename) {
                                            target.src = `https://knzmpoprlmbonejshfys.supabase.co/storage/v1/object/public/property-flyers/flyers/${filename}`;
                                          }
                                        }
                                      }}
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2 flex items-center justify-between gap-1">
                                      <span className="text-[9px] text-amber-200 font-semibold truncate">Flyer #{imgIdx + 1}</span>
                                      <a
                                        href={imgUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download
                                        className="text-[9px] bg-amber-400 hover:bg-amber-300 text-black font-bold px-2 py-0.5 rounded shadow transition-colors flex items-center gap-1 shrink-0"
                                        title="Ver / Descargar imagen del flyer"
                                      >
                                        <Download className="w-2.5 h-2.5" /> Abrir / Descargar
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      
                      {(() => {
                        const propContact = extractPhoneFromItem(m.property);
                        const senderName = m.property?.nombreUsuarioWhatsapp || propContact.name;
                        const isSenderKnown = senderName && !isGenericBrokerName(senderName);
                        const formattedPhone = propContact.display.includes('(')
                          ? propContact.display.split('(')[1].replace(')', '').trim()
                          : propContact.display;

                        return (
                          <div className="bg-gradient-to-r from-[#bf953f]/10 via-amber-950/20 to-zinc-950 border border-[#bf953f]/25 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-[#bf953f]/45 transition-all">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-[#bf953f]/20 border border-[#bf953f]/40 flex items-center justify-center text-[#bf953f] flex-shrink-0 shadow-inner">
                                <Phone className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[9px] text-[#bf953f]/80 uppercase tracking-widest font-extrabold flex items-center gap-1">
                                  <span>Captador / Vendedor</span>
                                </p>
                                {isSenderKnown ? (
                                  <div className="mt-0.5">
                                    <p className="text-xs sm:text-sm font-extrabold text-amber-200 truncate flex items-center gap-1.5">
                                      <span className="text-[10px] bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.2 rounded text-amber-300">👤 Asesor</span>
                                      <span>{senderName}</span>
                                    </p>
                                    <p className="text-xs font-bold text-zinc-300 select-all mt-0.5 flex items-center gap-1">
                                      <span className="text-[#25D366]">📞</span>
                                      <span>{formattedPhone}</span>
                                    </p>
                                  </div>
                                ) : (
                                  <div className="mt-0.5">
                                    <p className="text-xs font-bold text-zinc-200 select-all">{propContact.display}</p>
                                    <p className="text-[10px] text-zinc-500 italic mt-0.5">👤 Nombre no asignado (Completar al editar)</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            {(() => {
                              const waTarget = propContact.cleanNumber || "573192919978";
                              const defaultText = propContact.cleanNumber
                                ? `Hola! Te contacto por el inmueble "${m.property?.name || 'de la red'}" publicado en ${m.property?.origenNombre || 'VECY Network'}. Tienes un Match del ${score.toFixed(0)}% con un requerimiento activo.`
                                : `Hola JanIA! Necesito contactar al vendedor/broker del inmueble "${m.property?.name || 'de la red'}" publicado en el grupo "${m.property?.origenNombre || 'VECY Network'}".`;
                              return (
                                <a 
                                  href={`https://wa.me/${waTarget}?text=${encodeURIComponent(defaultText)}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="group bg-[#25D366] hover:bg-[#20ba5a] text-black text-xs font-extrabold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-[0_0_20px_rgba(37,211,102,0.4)] hover:scale-105 active:scale-95 min-h-[38px] w-full sm:w-auto shrink-0"
                                >
                                  <span>Contactar WA</span>
                                  <ExternalLink className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                </a>
                              );
                            })()}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Requerimiento (Demanda) */}
                    <div className="space-y-3 lg:pl-6 lg:border-l border-white/5 pt-4 lg:pt-0 border-t lg:border-t-0 border-white/5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-cyan-400 bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/15">
                          🔍 Requerimiento / Demanda
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {(() => {
                            const reqPublicUrl = extractPublicLink(m.requirement);
                            return reqPublicUrl ? (
                              <a
                                href={reqPublicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-2.5 py-0.5 rounded-md flex items-center gap-1 font-bold transition-all shadow-sm"
                                title="Ver enlace público original del requerimiento"
                              >
                                🔗 Enlace Público <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : null;
                          })()}
                          {m.requirement?.origenNombre && (
                            <span className="text-[10px] text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md truncate max-w-[180px] sm:max-w-[200px]" title={m.requirement.origenNombre}>
                              📍 {m.requirement.origenNombre}
                            </span>
                          )}
                        </div>
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-white mt-1 break-words">
                        {m.requirement?.name || `Requerimiento #${m.requirement?.id}`}
                      </h4>
                      
                      {/* Texto Completo Extraído + Resumen Estructurado del Requerimiento */}
                      <div className="text-xs text-zinc-300 bg-white/[0.02] border border-white/5 p-3 rounded-xl leading-relaxed whitespace-pre-wrap break-words space-y-3 select-text cursor-text">
                        {(() => {
                          const rText = (m.requirement?.rawText || "").trim();
                          const isGenericImagePlaceholder = rText.includes("[Publicación de Imagen / Flyer Comercial Inmobiliario sin texto en pie de foto]");
                          const reqSpecs: string[] = [];
                          if (m.requirement?.tipoInmuebleDeseado) reqSpecs.push(`• Tipo: ${m.requirement.tipoInmuebleDeseado}`);
                          if (m.requirement?.tipoNegocioDeseado) reqSpecs.push(`• Negocio: ${m.requirement.tipoNegocioDeseado}`);
                          if (m.requirement?.zonaDeseada || m.requirement?.addressNeighborhood) reqSpecs.push(`• Sector: ${m.requirement.zonaDeseada || m.requirement.addressNeighborhood}`);
                          if (m.requirement?.ciudadDeseada || m.requirement?.addressCity) reqSpecs.push(`• Ciudad: ${m.requirement.ciudadDeseada || m.requirement.addressCity}`);
                          if (m.requirement?.presupuestoMax && Number(m.requirement.presupuestoMax) > 0) reqSpecs.push(`• Presupuesto: ${formatCOP(m.requirement.presupuestoMax)}`);
                          if (m.requirement?.areaMin && Number(m.requirement.areaMin) > 0) reqSpecs.push(`• Área Mín: ${m.requirement.areaMin} m²`);
                          if (m.requirement?.habitacionesMin) reqSpecs.push(`• Habitaciones: ${m.requirement.habitacionesMin}+`);
                          if (m.requirement?.banosMin) reqSpecs.push(`• Baños: ${m.requirement.banosMin}+`);
                          if (m.requirement?.parqueaderosMin) reqSpecs.push(`• Parqueaderos: ${m.requirement.parqueaderosMin}+`);

                          return (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold not-italic">
                                  {isGenericImagePlaceholder ? "🖼️ Desglose de Flyer / Demanda:" : "💬 Solicita:"}
                                </p>
                                {(() => {
                                  const copyKey = `req-${m.id}`;
                                  const isCopied = copiedId === copyKey;
                                  return (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopy(rText, copyKey);
                                      }}
                                      className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all duration-300 border shrink-0 ${
                                        isCopied
                                          ? "bg-cyan-500/25 text-cyan-300 border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.45)] scale-105"
                                          : "text-zinc-400 hover:text-cyan-300 bg-white/5 hover:bg-white/10 border-white/10 hover:border-cyan-400/30 active:scale-95"
                                      }`}
                                      title="Copiar texto del requerimiento"
                                    >
                                      {isCopied ? (
                                        <>
                                          <Check className="w-3.5 h-3.5 text-cyan-300 animate-in zoom-in-50 duration-200" />
                                          <span className="text-cyan-200">¡Copiado!</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" />
                                          <span>Copiar</span>
                                        </>
                                      )}
                                    </button>
                                  );
                                })()}
                              </div>
                              {!isGenericImagePlaceholder && (
                                <p className="italic text-zinc-200 select-text cursor-text">{renderTextWithClickableLinks(rText)}</p>
                              )}
                              {isGenericImagePlaceholder && (
                                <div className="space-y-1 text-zinc-200 select-text cursor-text">
                                  <p className="text-cyan-300/90 font-medium text-[11px]">Captado desde Imagen / Flyer sin texto en pie de foto:</p>
                                  {reqSpecs.length > 0 && (
                                    <div className="bg-black/30 rounded-lg p-2 font-mono text-[11px] space-y-0.5 text-zinc-300 border border-white/5 select-text">
                                      {reqSpecs.map((s, idx) => (
                                        <p key={idx}>{s}</p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}



                        {/* Enlace Público Original / Portal Web / PDF Adjunto */}
                        {(() => {
                          const origReqUrl = extractPublicLink(m.requirement);
                          if (!origReqUrl) return null;
                          const isPdf = origReqUrl.toLowerCase().includes('.pdf');

                          return (
                            <div className="mt-2.5 pt-2.5 border-t border-white/10 text-xs not-italic flex items-center gap-2 flex-wrap">
                              <span className="text-zinc-400 font-semibold flex items-center gap-1">
                                {isPdf ? "📄 Documento Adjunto:" : "🌐 Enlace de Origen:"}
                              </span>
                              <a 
                                href={origReqUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all shadow ${
                                  isPdf 
                                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30" 
                                    : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30"
                                }`}
                                title={origReqUrl}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                {isPdf ? "Ver / Descargar PDF Adjunto" : "Abrir Enlace Original del Requerimiento"}
                              </a>
                            </div>
                          );
                        })()}

                        {/* Visualizador de Flyer / Imagen Publicada en el Anuncio del Requerimiento */}
                        {(() => {
                          const reqImgs = extractItemImages(m.requirement);
                          if (reqImgs.length === 0) return null;
                          return (
                            <div className="mt-2.5 pt-2.5 border-t border-cyan-500/20 space-y-2 not-italic">
                              <p className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                🖼️ Imagen / Flyer del Requerimiento Original ({reqImgs.length}):
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {reqImgs.slice(0, 4).map((imgUrl, imgIdx) => (
                                  <div key={imgIdx} className="relative group rounded-xl overflow-hidden border border-cyan-500/30 bg-black/50">
                                    <img 
                                      src={imgUrl} 
                                      alt={`Flyer Requerimiento ${imgIdx + 1}`} 
                                      className="w-full h-44 object-contain bg-zinc-950 group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                                      onClick={() => window.open(imgUrl, '_blank')}
                                      onError={(e) => {
                                        const target = e.currentTarget;
                                        if (!target.src.includes('knzmpoprlmbonejshfys.supabase.co')) {
                                          const filename = target.src.split('/').pop();
                                          if (filename) {
                                            target.src = `https://knzmpoprlmbonejshfys.supabase.co/storage/v1/object/public/property-flyers/flyers/${filename}`;
                                          }
                                        }
                                      }}
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2 flex items-center justify-between gap-1">
                                      <span className="text-[9px] text-cyan-200 font-semibold truncate">Flyer #{imgIdx + 1}</span>
                                      <a
                                        href={imgUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download
                                        className="text-[9px] bg-cyan-400 hover:bg-cyan-300 text-black font-bold px-2 py-0.5 rounded shadow transition-colors flex items-center gap-1 shrink-0"
                                        title="Ver / Descargar imagen del flyer"
                                      >
                                        <Download className="w-2.5 h-2.5" /> Abrir / Descargar
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      
                      {(() => {
                        const reqContact = extractPhoneFromItem(m.requirement);
                        const senderName = m.requirement?.nombreUsuarioWhatsapp || reqContact.name;
                        const isSenderKnown = senderName && !isGenericBrokerName(senderName);
                        const formattedPhone = reqContact.display.includes('(')
                          ? reqContact.display.split('(')[1].replace(')', '').trim()
                          : reqContact.display;

                        return (
                          <div className="bg-gradient-to-r from-cyan-950/30 via-blue-950/20 to-zinc-950 border border-cyan-500/25 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-cyan-500/45 transition-all">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 flex-shrink-0 shadow-inner">
                                <Phone className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[9px] text-cyan-400/80 uppercase tracking-widest font-extrabold flex items-center gap-1">
                                  <span>Requiriente / Comprador</span>
                                </p>
                                {isSenderKnown ? (
                                  <div className="mt-0.5">
                                    <p className="text-xs sm:text-sm font-extrabold text-cyan-200 truncate flex items-center gap-1.5">
                                      <span className="text-[10px] bg-cyan-500/20 border border-cyan-500/30 px-1.5 py-0.2 rounded text-cyan-300">👤 Asesor</span>
                                      <span>{senderName}</span>
                                    </p>
                                    <p className="text-xs font-bold text-zinc-300 select-all mt-0.5 flex items-center gap-1">
                                      <span className="text-[#25D366]">📞</span>
                                      <span>{formattedPhone}</span>
                                    </p>
                                  </div>
                                ) : (
                                  <div className="mt-0.5">
                                    <p className="text-xs font-bold text-zinc-200 select-all">{reqContact.display}</p>
                                    <p className="text-[10px] text-zinc-500 italic mt-0.5">👤 Nombre no asignado (Completar al editar)</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            {(() => {
                              const waTarget = reqContact.cleanNumber || "573192919978";
                              const defaultText = reqContact.cleanNumber
                                ? `Hola! Te contacto por tu requerimiento de inmueble en ${m.requirement?.zonaDeseada || m.requirement?.ciudadDeseada || 'VECY Network'}. Encontramos una propiedad con un Match del ${score.toFixed(0)}%.`
                                : `Hola JanIA! Necesito contactar al requiriente del inmueble en el grupo "${m.requirement?.origenNombre || 'VECY Network'}".`;
                              return (
                                <a 
                                  href={`https://wa.me/${waTarget}?text=${encodeURIComponent(defaultText)}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="group bg-[#25D366] hover:bg-[#20ba5a] text-black text-xs font-extrabold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-[0_0_20px_rgba(37,211,102,0.4)] hover:scale-105 active:scale-95 min-h-[38px] w-full sm:w-auto shrink-0"
                                >
                                  <span>Contactar WA</span>
                                  <ExternalLink className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                </a>
                              );
                            })()}
                          </div>
                        );
                      })()}
                    </div>

                  </div>

                  {/* COTEJO DETALLADO CAMPO POR CAMPO (PLEGABLE / DESPLEGABLE CON BOTÓN DE CONTROL) */}
                  {(() => {
                    const isCotejoExpanded = expandedMatchIds.has(m.id) || isEditingThisCard;

                    return (
                      <>
                        {/* Barra de Control de Despliegue */}
                        <div className="bg-zinc-950/90 border-b border-white/5 px-3.5 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
                          <button
                            type="button"
                            onClick={() => toggleExpandMatch(m.id)}
                            className={`flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl border transition-all cursor-pointer select-none active:scale-95 ${
                              isCotejoExpanded 
                                ? 'bg-[#bf953f]/20 border-[#bf953f] text-[#bf953f] shadow-[0_0_12px_rgba(191,149,63,0.3)]' 
                                : 'bg-zinc-900 border-white/10 text-zinc-300 hover:text-white hover:border-[#bf953f]/50'
                            }`}
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                            <span>{isCotejoExpanded ? '🔼 Ocultar Tabla de Cotejo' : '📊 Ver Tabla de Cotejo Técnico (10 Atributos)'}</span>
                          </button>

                          {/* Resumen Compacto de Cumplimiento cuando está Plegado */}
                          {!isCotejoExpanded && (
                            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] font-bold text-zinc-400 flex-wrap">
                              <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                ✓ {exactCount + plusCount} Coincidencias
                              </span>
                              {warnCount > 0 && (
                                <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                  ⚠️ {warnCount} Aproximados
                                </span>
                              )}
                              {failCount > 0 && (
                                <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                                  ✕ {failCount} Diferencias
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Detalle Completo de la Tabla de Cotejo (Solo renderizado cuando se expande o edita) */}
                        {isCotejoExpanded && (
                          <div className="bg-black/30 border-b border-white/5 p-3 sm:p-4 md:p-6 overflow-x-hidden animate-in fade-in-50 duration-200">
                            <h5 className="text-xs font-bold uppercase tracking-widest text-[#bf953f] mb-3 flex items-center justify-between gap-2 flex-wrap">
                              <span className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                Cotejo técnico de afinidad comercial
                              </span>
                              {isEditingThisCard && (
                                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded font-bold animate-pulse">
                                  ⚡ Recálculo en tiempo real activo
                                </span>
                              )}
                            </h5>
                    
                    {/* VISTA ESCRITORIO (md:table - 4 columnas) */}
                    <div className="hidden md:block overflow-x-auto scrollbar-thin">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-zinc-500">
                            <th className="text-left py-2.5 px-3">Característica</th>
                            <th className="text-left py-2.5 px-3 text-[#bf953f]">Ofrecido (Oferta) {isEditingThisCard && <span className="text-[9px] text-amber-400 font-normal">(Modo Edición)</span>}</th>
                            <th className="text-left py-2.5 px-3 text-cyan-400">Buscado (Demanda) {isEditingThisCard && <span className="text-[9px] text-cyan-300 font-normal">(Modo Edición)</span>}</th>
                            <th className="text-center py-2.5 px-3 w-28">Cumplimiento</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, rIdx) => {
                            const isExact = row.status === "exact" || row.status === "ok";
                            const isPlus = row.status === "plus";
                            const isWarn = row.status === "warn";
                            const isMissing = row.status === "missing";
                            const isNeutral = row.status === "neutral";
                            
                            const badgeBg = isExact 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                              : isPlus
                                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                                : isWarn 
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                                  : isMissing
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                    : "bg-zinc-800 text-zinc-400 border border-zinc-700/50";
                            
                            const badgeText = isExact ? "Coincide" : isPlus ? "Plus Ofertado" : isWarn ? "Aproximado" : isMissing ? "No Cumple" : "Dato Pendiente";

                            const renderRowInput = (label: string, isOffer: boolean, defaultVal: string) => {
                              if (!isEditingThisCard) {
                                return (
                                  <span 
                                    onClick={() => handleStartEdit(m)} 
                                    className="cursor-pointer hover:underline hover:text-white transition-colors"
                                    title="Haz clic aquí para editar esta casilla N/E"
                                  >
                                    {defaultVal}
                                  </span>
                                );
                              }

                              const cleanLbl = label.toLowerCase();
                              
                              if (cleanLbl.includes('precio de venta')) {
                                return isOffer ? (
                                  <input
                                    type="text"
                                    placeholder="Ej: 700000000"
                                    value={editForm.propPrice || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propPrice: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Ej: 700000000"
                                    value={editForm.reqBudget || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqBudget: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  />
                                );
                              }

                              if (cleanLbl.includes('precio de arriendo') || cleanLbl.includes('canon')) {
                                return isOffer ? (
                                  <input
                                    type="text"
                                    placeholder="Ej: 2500000"
                                    value={editForm.propRentPrice || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propRentPrice: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Ej: 2500000"
                                    value={editForm.reqBudget || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqBudget: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  />
                                );
                              }

                              if (cleanLbl.includes('cuota de administración') || cleanLbl.includes('administración')) {
                                return isOffer ? (
                                  <input
                                    type="text"
                                    placeholder="Ej: 500000"
                                    value={editForm.propAdminFee || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propAdminFee: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Ej: 600000"
                                    value={editForm.reqAdminMax || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqAdminMax: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  />
                                );
                              }

                              if (cleanLbl.includes('área total') || cleanLbl.includes('área')) {
                                return isOffer ? (
                                  <input
                                    type="text"
                                    placeholder="Ej: 87"
                                    value={editForm.propArea || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propArea: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Ej: 80"
                                    value={editForm.reqArea || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqArea: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  />
                                );
                              }

                              if (cleanLbl.includes('habitaciones')) {
                                return isOffer ? (
                                  <input
                                    type="number"
                                    placeholder="Ej: 3"
                                    value={editForm.propBedrooms ?? ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propBedrooms: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  />
                                ) : (
                                  <input
                                    type="number"
                                    placeholder="Ej: 3"
                                    value={editForm.reqBedrooms ?? ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqBedrooms: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  />
                                );
                              }

                              if (cleanLbl.includes('baños')) {
                                return isOffer ? (
                                  <input
                                    type="number"
                                    placeholder="Ej: 3"
                                    value={editForm.propBathrooms ?? ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propBathrooms: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  />
                                ) : (
                                  <input
                                    type="number"
                                    placeholder="Ej: 2"
                                    value={editForm.reqBathrooms ?? ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqBathrooms: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  />
                                );
                              }

                              if (cleanLbl.includes('parqueaderos') || cleanLbl.includes('garajes')) {
                                return isOffer ? (
                                  <input
                                    type="number"
                                    placeholder="Ej: 2"
                                    value={editForm.propGarages ?? ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propGarages: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  />
                                ) : (
                                  <input
                                    type="number"
                                    placeholder="Ej: 2"
                                    value={editForm.reqGarages ?? ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqGarages: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  />
                                );
                              }

                              if (cleanLbl.includes('estrato')) {
                                return isOffer ? (
                                  <input
                                    type="number"
                                    placeholder="Ej: 4"
                                    value={editForm.propStratum ?? ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propStratum: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  />
                                ) : (
                                  <input
                                    type="number"
                                    placeholder="Ej: 4"
                                    value={editForm.reqStratum ?? ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqStratum: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  />
                                );
                              }

                              if (cleanLbl.includes('barrio')) {
                                return isOffer ? (
                                  <input
                                    type="text"
                                    placeholder="Ej: Cedritos"
                                    value={editForm.propZone || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propZone: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Ej: Rosales"
                                    value={editForm.reqZone || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqZone: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  />
                                );
                              }

                              if (cleanLbl.includes('tipo de inmueble')) {
                                return isOffer ? (
                                  <input
                                    type="text"
                                    placeholder="Ej: Apartamento, Casa"
                                    value={editForm.propPropertyType || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propPropertyType: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Ej: Apartamento, Casa"
                                    value={editForm.reqPropertyType || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqPropertyType: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  />
                                );
                              }

                              if (cleanLbl.includes('tipo de negocio')) {
                                return isOffer ? (
                                  <select
                                    value={editForm.propTransactionType || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propTransactionType: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  >
                                    <option value="">Seleccionar...</option>
                                    <option value="venta">Venta</option>
                                    <option value="arriendo">Arriendo</option>
                                    <option value="venta_o_arriendo">Venta o Arriendo</option>
                                    <option value="arriendo_con_opcion_de_compra">Arriendo con opción de compra</option>
                                    <option value="arriendo_temporal">Arriendo temporal</option>
                                    <option value="permuta">Permuta</option>
                                    <option value="venta_permuta">Venta / Permuta</option>
                                    <option value="aporte">Aporte</option>
                                  </select>
                                ) : (
                                  <select
                                    value={editForm.reqTransactionType || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqTransactionType: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  >
                                    <option value="">Seleccionar...</option>
                                    <option value="venta">Venta</option>
                                    <option value="arriendo">Arriendo</option>
                                    <option value="venta_o_arriendo">Venta o Arriendo</option>
                                    <option value="arriendo_con_opcion_de_compra">Arriendo con opción de compra</option>
                                    <option value="arriendo_temporal">Arriendo temporal</option>
                                    <option value="permuta">Permuta</option>
                                    <option value="venta_permuta">Venta / Permuta</option>
                                    <option value="aporte">Aporte</option>
                                  </select>
                                );
                              }

                              if (cleanLbl.includes('localidad')) {
                                return isOffer ? (
                                  <input
                                    type="text"
                                    placeholder="Ej: Usaquén, Chapinero"
                                    value={editForm.propLocality || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propLocality: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Ej: Usaquén, Chapinero"
                                    value={editForm.reqLocality || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqLocality: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  />
                                );
                              }

                              if (cleanLbl.includes('teléfono') || cleanLbl.includes('contacto') || cleanLbl.includes('asesor')) {
                                return isOffer ? (
                                  <div className="space-y-1.5 w-full">
                                    <div className="relative">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs">👤</span>
                                      <input
                                        type="text"
                                        placeholder="Nombre Asesor (ej: Erika Del Pilar)"
                                        value={editForm.propSenderName || ''}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, propSenderName: e.target.value }))}
                                        className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs pl-6 pr-2 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                      />
                                    </div>
                                    <div className="relative">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs">📞</span>
                                      <input
                                        type="text"
                                        placeholder="WhatsApp (ej: +57 310 123 4567)"
                                        value={editForm.propPhone || ''}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, propPhone: e.target.value }))}
                                        className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs pl-6 pr-2 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-1.5 w-full">
                                    <div className="relative">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs">👤</span>
                                      <input
                                        type="text"
                                        placeholder="Nombre Asesor (ej: Erika Del Pilar)"
                                        value={editForm.reqSenderName || ''}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, reqSenderName: e.target.value }))}
                                        className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs pl-6 pr-2 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                      />
                                    </div>
                                    <div className="relative">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs">📞</span>
                                      <input
                                        type="text"
                                        placeholder="WhatsApp (ej: +57 310 123 4567)"
                                        value={editForm.reqPhone || ''}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, reqPhone: e.target.value }))}
                                        className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs pl-6 pr-2 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                      />
                                    </div>
                                  </div>
                                );
                              }

                              // Fallback general para cualquier otra casilla (Antigüedad, Permuta, Cocina, Balcón, Equipamiento, Depósito)
                              const propKey = `prop_custom_${cleanLbl.replace(/[^a-z0-9]/g, '')}`;
                              const reqKey = `req_custom_${cleanLbl.replace(/[^a-z0-9]/g, '')}`;
                              return isOffer ? (
                                <input
                                  type="text"
                                  placeholder={`Editar ${label}`}
                                  value={editForm[propKey] !== undefined ? editForm[propKey] : (defaultVal !== 'N/E' ? defaultVal : '')}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, [propKey]: e.target.value }))}
                                  className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                />
                              ) : (
                                <input
                                  type="text"
                                  placeholder={`Editar ${label}`}
                                  value={editForm[reqKey] !== undefined ? editForm[reqKey] : (defaultVal !== 'N/E' ? defaultVal : '')}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, [reqKey]: e.target.value }))}
                                  className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                />
                              );
                            };

                            return (
                              <tr key={rIdx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                <td className="py-2.5 px-3 flex items-center gap-2 font-medium text-zinc-300 min-w-[160px]">
                                  {row.icon}
                                  <span>{row.label}</span>
                                </td>
                                <td className="py-2 px-3 text-[#bf953f] font-medium min-w-[180px]">
                                  {renderRowInput(row.label, true, row.propVal)}
                                </td>
                                <td className="py-2 px-3 text-cyan-300 min-w-[180px]">
                                  {renderRowInput(row.label, false, row.reqVal)}
                                </td>
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

                    {/* VISTA MÓVIL (md:hidden - Minitarjetas Apiladas) */}
                    <div className="grid grid-cols-1 gap-2.5 md:hidden">
                      {rows.map((row, rIdx) => {
                        const isExact = row.status === "exact" || row.status === "ok";
                        const isPlus = row.status === "plus";
                        const isWarn = row.status === "warn";
                        const isMissing = row.status === "missing";
                        const isNeutral = row.status === "neutral";
                        
                        const badgeBg = isExact 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : isPlus
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                            : isWarn 
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                              : isMissing
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-zinc-800 text-zinc-400 border border-zinc-700/50";
                        
                        const badgeText = isExact ? "Coincide" : isPlus ? "Plus Ofertado" : isWarn ? "Aproximado" : isMissing ? "No Cumple" : "Dato Pendiente";

                        const renderMobileInput = (label: string, isOffer: boolean, defaultVal: string) => {
                          if (!isEditingThisCard) {
                            return (
                              <span 
                                onClick={() => handleStartEdit(m)} 
                                className="cursor-pointer hover:underline hover:text-white transition-colors"
                              >
                                {defaultVal}
                              </span>
                            );
                          }
                          const cleanLbl = label.toLowerCase();
                          if (cleanLbl.includes('precio de venta')) {
                            return isOffer ? (
                              <input type="text" placeholder="Ej: 700000000" value={editForm.propPrice || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propPrice: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="text" placeholder="Ej: 700000000" value={editForm.reqBudget || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqBudget: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                            );
                          }
                          if (cleanLbl.includes('precio de arriendo') || cleanLbl.includes('canon')) {
                            return isOffer ? (
                              <input type="text" placeholder="Ej: 2500000" value={editForm.propRentPrice || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propRentPrice: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="text" placeholder="Ej: 2500000" value={editForm.reqBudget || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqBudget: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                            );
                          }
                          if (cleanLbl.includes('cuota de administración') || cleanLbl.includes('administración')) {
                            return isOffer ? (
                              <input type="text" placeholder="Ej: 500000" value={editForm.propAdminFee || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propAdminFee: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="text" placeholder="Ej: 600000" value={editForm.reqAdminMax || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqAdminMax: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                            );
                          }
                          if (cleanLbl.includes('área total') || cleanLbl.includes('área')) {
                            return isOffer ? (
                              <input type="text" placeholder="Ej: 87" value={editForm.propArea || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propArea: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="text" placeholder="Ej: 80" value={editForm.reqArea || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqArea: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                            );
                          }
                          if (cleanLbl.includes('habitaciones')) {
                            return isOffer ? (
                              <input type="number" placeholder="Ej: 3" value={editForm.propBedrooms ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, propBedrooms: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="number" placeholder="Ej: 3" value={editForm.reqBedrooms ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqBedrooms: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                            );
                          }
                          if (cleanLbl.includes('baños')) {
                            return isOffer ? (
                              <input type="number" placeholder="Ej: 3" value={editForm.propBathrooms ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, propBathrooms: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="number" placeholder="Ej: 2" value={editForm.reqBathrooms ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqBathrooms: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                            );
                          }
                          if (cleanLbl.includes('parqueaderos') || cleanLbl.includes('garajes')) {
                            return isOffer ? (
                              <input type="number" placeholder="Ej: 2" value={editForm.propGarages ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, propGarages: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="number" placeholder="Ej: 2" value={editForm.reqGarages ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqGarages: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                            );
                          }
                          if (cleanLbl.includes('estrato')) {
                            return isOffer ? (
                              <input type="number" placeholder="Ej: 4" value={editForm.propStratum ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, propStratum: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="number" placeholder="Ej: 4" value={editForm.reqStratum ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqStratum: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                            );
                          }
                          if (cleanLbl.includes('barrio')) {
                            return isOffer ? (
                              <input type="text" placeholder="Ej: Cedritos" value={editForm.propZone || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propZone: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="text" placeholder="Ej: Rosales" value={editForm.reqZone || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqZone: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                            );
                          }
                          if (cleanLbl.includes('tipo de inmueble')) {
                            return isOffer ? (
                              <input type="text" placeholder="Ej: Apartamento" value={editForm.propPropertyType || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propPropertyType: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="text" placeholder="Ej: Apartamento" value={editForm.reqPropertyType || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqPropertyType: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                            );
                          }
                          if (cleanLbl.includes('tipo de negocio')) {
                            return isOffer ? (
                              <select value={editForm.propTransactionType || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propTransactionType: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg">
                                <option value="">Seleccionar...</option>
                                <option value="venta">Venta</option>
                                <option value="arriendo">Arriendo</option>
                                <option value="venta_o_arriendo">Venta o Arriendo</option>
                                <option value="arriendo_con_opcion_de_compra">Arriendo con opción de compra</option>
                                <option value="arriendo_temporal">Arriendo temporal</option>
                                <option value="permuta">Permuta</option>
                                <option value="venta_permuta">Venta / Permuta</option>
                                <option value="aporte">Aporte</option>
                              </select>
                            ) : (
                              <select value={editForm.reqTransactionType || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqTransactionType: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg">
                                <option value="">Seleccionar...</option>
                                <option value="venta">Venta</option>
                                <option value="arriendo">Arriendo</option>
                                <option value="venta_o_arriendo">Venta o Arriendo</option>
                                <option value="arriendo_con_opcion_de_compra">Arriendo con opción de compra</option>
                                <option value="arriendo_temporal">Arriendo temporal</option>
                                <option value="permuta">Permuta</option>
                                <option value="venta_permuta">Venta / Permuta</option>
                                <option value="aporte">Aporte</option>
                              </select>
                            );
                          }
                          if (cleanLbl.includes('localidad')) {
                            return isOffer ? (
                              <input type="text" placeholder="Ej: Usaquén" value={editForm.propLocality || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propLocality: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="text" placeholder="Ej: Usaquén" value={editForm.reqLocality || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqLocality: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                            );
                          }
                          if (cleanLbl.includes('teléfono') || cleanLbl.includes('contacto') || cleanLbl.includes('asesor')) {
                            return isOffer ? (
                              <div className="space-y-1.5 w-full">
                                <input type="text" placeholder="👤 Nombre Asesor (ej: Erika Del Pilar)" value={editForm.propSenderName || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propSenderName: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                                <input type="text" placeholder="📞 WhatsApp (ej: +57 310 123 4567)" value={editForm.propPhone || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propPhone: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                              </div>
                            ) : (
                              <div className="space-y-1.5 w-full">
                                <input type="text" placeholder="👤 Nombre Asesor (ej: Erika Del Pilar)" value={editForm.reqSenderName || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqSenderName: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                                <input type="text" placeholder="📞 WhatsApp (ej: +57 310 123 4567)" value={editForm.reqPhone || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqPhone: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                              </div>
                            );
                          }
                          const propKey = `prop_custom_${cleanLbl.replace(/[^a-z0-9]/g, '')}`;
                          const reqKey = `req_custom_${cleanLbl.replace(/[^a-z0-9]/g, '')}`;
                          return isOffer ? (
                            <input type="text" placeholder={`Editar ${label}`} value={editForm[propKey] !== undefined ? editForm[propKey] : (defaultVal !== 'N/E' ? defaultVal : '')} onChange={(e) => setEditForm(prev => ({ ...prev, [propKey]: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                          ) : (
                            <input type="text" placeholder={`Editar ${label}`} value={editForm[reqKey] !== undefined ? editForm[reqKey] : (defaultVal !== 'N/E' ? defaultVal : '')} onChange={(e) => setEditForm(prev => ({ ...prev, [reqKey]: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                          );
                        };

                        return (
                          <div key={rIdx} className="bg-zinc-900/70 border border-white/5 rounded-2xl p-3 space-y-2">
                            {/* Cabecera con Nombre de Atributo y Badge de Cumplimiento a la derecha */}
                            <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-1.5">
                              <div className="flex items-center gap-1.5 font-bold text-xs text-zinc-200">
                                {row.icon}
                                <span>{row.label}</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider shrink-0 ${badgeBg}`}>
                                {badgeText}
                              </span>
                            </div>

                            {/* Subfilas Verticales: OFRECIDO (Dorada) vs BUSCADO (Cyan) */}
                            <div className="grid grid-cols-1 gap-1.5 text-xs pt-0.5">
                              <div className="bg-[#bf953f]/5 border border-[#bf953f]/10 p-2 rounded-xl">
                                <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#bf953f]/80 block">
                                  🏢 Ofrecido (Oferta)
                                </span>
                                <span className="font-bold text-[#bf953f] break-words mt-0.5 block">
                                  {renderMobileInput(row.label, true, row.propVal)}
                                </span>
                              </div>

                              <div className="bg-cyan-500/5 border border-cyan-500/10 p-2 rounded-xl">
                                <span className="text-[9px] uppercase tracking-wider font-extrabold text-cyan-400/80 block">
                                  🔍 Buscado (Demanda)
                                </span>
                                <span className="font-bold text-cyan-300 break-words mt-0.5 block">
                                  {renderMobileInput(row.label, false, row.reqVal)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            );
          })()}

                  {/* Justificación de la IA */}
                  {m.matchReason && (
                    <div className="p-4 sm:p-6 bg-white/[0.01] text-xs text-zinc-400 leading-relaxed">
                      <span className="font-bold text-zinc-300 block mb-1">Razón de afinidad de la IA:</span>
                      "{m.matchReason}"
                    </div>
                  )}

                  {/* CAPA C: RETROALIMENTACIÓN ACTIVA DE BROKER / ENTRENAMIENTO JANIA */}
                  <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-zinc-950 via-zinc-900/90 to-zinc-950 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-[11px] text-zinc-300 flex items-center gap-2 font-semibold">
                      <Sparkles className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                      <span>Calificación Comercial (Entrenamiento JanIA):</span>
                    </div>
                    {(() => {
                      const fbState = feedbackStatusMap[m.id];
                      if (fbState === 'exitoso') {
                        return (
                          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/80 border border-emerald-400 text-emerald-300 font-extrabold text-xs shadow-[0_0_25px_rgba(52,211,153,0.85),inset_0_0_12px_rgba(52,211,153,0.3)] animate-in zoom-in-95 duration-300">
                            <Check className="w-4 h-4 text-emerald-300 animate-bounce" />
                            <span className="drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]">¡Trato en Curso Registrado con Éxito!</span>
                          </div>
                        );
                      }
                      if (fbState === 'rechazado') {
                        return (
                          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/80 border border-rose-400 text-rose-300 font-extrabold text-xs shadow-[0_0_25px_rgba(244,63,94,0.85),inset_0_0_12px_rgba(244,63,94,0.3)] animate-in zoom-in-95 duration-300">
                            <Check className="w-4 h-4 text-rose-300 animate-bounce" />
                            <span className="drop-shadow-[0_0_8px_rgba(244,63,94,0.9)]">¡Match Descartado y Aprendido!</span>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-2 sm:flex items-center gap-2.5 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => handleFeedback(m, 'exitoso')}
                            className="group relative h-10 sm:h-9 px-4 text-xs font-extrabold text-emerald-400 bg-black/70 hover:bg-black/90 border border-emerald-500/40 hover:border-emerald-300 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-[0_0_22px_rgba(52,211,153,0.85),inset_0_0_10px_rgba(52,211,153,0.25)] hover:scale-105 active:scale-95 w-full sm:w-auto min-h-[40px] cursor-pointer"
                            title="Registrar trato en curso"
                          >
                            <ThumbsUp className="w-4 h-4 stroke-[2.5] text-emerald-400 transition-all duration-300 group-hover:scale-125 group-hover:-rotate-12 group-hover:text-emerald-300 group-hover:drop-shadow-[0_0_12px_rgba(52,211,153,1)]" />
                            <span className="font-extrabold text-emerald-400 transition-all duration-300 group-hover:text-emerald-200 group-hover:drop-shadow-[0_0_10px_rgba(52,211,153,0.9)]">
                              🤝 Trato en Curso
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => { setRejectModalMatch(m); setRejectReason(''); setCustomRejectNote(''); }}
                            className="group relative h-10 sm:h-9 px-4 text-xs font-extrabold text-rose-400 bg-black/70 hover:bg-black/90 border border-rose-500/40 hover:border-rose-300 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-[0_0_22px_rgba(244,63,94,0.85),inset_0_0_10px_rgba(244,63,94,0.25)] hover:scale-105 active:scale-95 w-full sm:w-auto min-h-[40px] cursor-pointer"
                            title="Descartar este match"
                          >
                            <ThumbsDown className="w-4 h-4 stroke-[2.5] text-rose-400 transition-all duration-300 group-hover:scale-125 group-hover:rotate-12 group-hover:text-rose-300 group-hover:drop-shadow-[0_0_12px_rgba(244,63,94,1)]" />
                            <span className="font-extrabold text-rose-400 transition-all duration-300 group-hover:text-rose-200 group-hover:drop-shadow-[0_0_10px_rgba(244,63,94,0.9)]">
                              ⛔ Descartar Match
                            </span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* BARRA DE EDICIÓN FLOTANTE / STICKY EN EL FOOTER DE LA TARJETA */}
                  {isEditingThisCard && (
                    <div className="sticky bottom-0 z-30 bg-gradient-to-r from-emerald-950 via-zinc-900 to-emerald-950 border-t border-emerald-500/40 p-3.5 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl rounded-b-3xl">
                      <div className="flex items-center gap-2.5 text-emerald-400 text-xs font-semibold">
                        <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
                        <span>
                          Modo Edición Activo: Usa <strong>💾 Guardar Datos</strong> para registrar datos faltantes en la BD, o <strong>⚡ Recalcular Coincidencias</strong> si el negocio no prosperó para buscar nuevas parejas en la red.
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                        {(() => {
                          const sStatus = saveStatusMap[m.id];
                          if (sStatus === 'saved') {
                            return (
                              <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black/90 border border-emerald-400 text-emerald-300 font-extrabold text-xs shadow-[0_0_30px_rgba(52,211,153,0.9),inset_0_0_15px_rgba(52,211,153,0.3)] animate-in zoom-in-95">
                                <Check className="w-4 h-4 text-emerald-300 animate-bounce" />
                                <span className="drop-shadow-[0_0_10px_rgba(52,211,153,0.9)]">¡Datos Guardados con Éxito en BD!</span>
                              </div>
                            );
                          }
                          if (sStatus === 'recalculated') {
                            return (
                              <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black/90 border border-cyan-400 text-cyan-300 font-extrabold text-xs shadow-[0_0_30px_rgba(6,182,212,0.9),inset_0_0_15px_rgba(6,182,212,0.3)] animate-in zoom-in-95">
                                <Sparkles className="w-4 h-4 text-cyan-300 animate-spin" />
                                <span className="drop-shadow-[0_0_10px_rgba(6,182,212,0.9)]">¡Coincidencias Recalculadas en Toda la Red!</span>
                              </div>
                            );
                          }

                          return (
                            <>
                              <Button
                                onClick={() => { setEditingMatchId(null); setEditForm({}); }}
                                variant="outline"
                                disabled={isSavingOnly || isRecalculating}
                                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs h-10 px-3 min-h-[44px] w-full sm:w-auto"
                              >
                                Cancelar
                              </Button>
                              <Button
                                onClick={() => handleOnlySave(m)}
                                disabled={isSavingOnly || isRecalculating}
                                className="group bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs h-10 px-4 shadow-md hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] min-h-[44px] flex items-center justify-center gap-2 w-full sm:w-auto transition-all hover:scale-105 active:scale-95"
                              >
                                {isSavingOnly ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Save className="w-4 h-4 transition-transform group-hover:scale-110" />}
                                <span>💾 Guardar Datos</span>
                              </Button>
                              <Button
                                onClick={() => handleRecalculateMatch(m)}
                                disabled={isSavingOnly || isRecalculating}
                                className="group bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs h-10 px-4 shadow-lg hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] min-h-[44px] flex items-center justify-center gap-2 w-full sm:w-auto transition-all hover:scale-105 active:scale-95"
                              >
                                {isRecalculating ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Sparkles className="w-4 h-4 transition-transform group-hover:rotate-45" />}
                                <span>⚡ Recalcular Coincidencias</span>
                              </Button>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Barra de Paginación Ultra-Rápida */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#0c0c0c] border border-white/5 shadow-xl">
            <div className="text-xs text-zinc-400 text-center sm:text-left">
              Mostrando <span className="text-white font-bold">{(currentPage - 1) * pageSize + 1}</span> a <span className="text-white font-bold">{Math.min(currentPage * pageSize, filteredMatches.length)}</span> de <span className="text-[#bf953f] font-bold">{filteredMatches.length}</span> coincidencias calificadas
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage(p => Math.max(1, p - 1));
                  window.scrollTo({ top: 250, behavior: 'smooth' });
                }}
                className="h-9 px-3.5 text-xs font-semibold border-white/10 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30 transition-all cursor-pointer"
              >
                ← Anterior
              </Button>

              <div className="px-3.5 py-1.5 bg-black/60 border border-white/10 rounded-xl text-xs font-mono font-bold text-[#bf953f]">
                {currentPage} / {totalPages}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => {
                  setCurrentPage(p => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 250, behavior: 'smooth' });
                }}
                className="h-9 px-3.5 text-xs font-semibold border-white/10 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30 transition-all cursor-pointer"
              >
                Siguiente →
              </Button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* MODAL DE DESCARTE CON MOTIVO (FEEDBACK Y APRENDIZAJE JANIA) */}
      {rejectModalMatch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
                <ThumbsDown className="w-5 h-5" />
                <span>Descartar Coincidencia Comercial</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setRejectModalMatch(null); setRejectReason(''); setCustomRejectNote(''); }}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </Button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Selecciona el motivo por el cual este inmueble no encajó con el requerimiento. JanIA registrará este aprendizaje en su memoria para no sugerir emparejamientos similares en el futuro:
            </p>

            <div className="space-y-2">
              {[
                "Cliente no quiere primer piso / exige piso alto",
                "Inmueble muy oscuro / sin asoleación ni luz",
                "Cuota de administración muy alta",
                "Exige garaje independiente / oferta es lineal",
                "No le gustó la ubicación / zona ruidosa",
                "Inmueble ya se vendió / no disponible",
                "Otro motivo"
              ].map((reason) => (
                <label 
                  key={reason}
                  onClick={() => setRejectReason(reason)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    rejectReason === reason 
                      ? 'bg-rose-500/10 border-rose-500/50 text-rose-200' 
                      : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="rejectReason" 
                    checked={rejectReason === reason} 
                    onChange={() => setRejectReason(reason)} 
                    className="accent-rose-500"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            {rejectReason === "Otro motivo" && (
              <Input
                placeholder="Escribe el motivo puntual para que JanIA lo aprenda..."
                value={customRejectNote}
                onChange={(e) => setCustomRejectNote(e.target.value)}
                className="bg-black/50 border-zinc-700 text-xs text-zinc-200"
              />
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/5">
              <Button
                variant="outline"
                onClick={() => { setRejectModalMatch(null); setRejectReason(''); setCustomRejectNote(''); }}
                className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 text-xs h-9"
              >
                Cancelar
              </Button>
              <Button
                disabled={!rejectReason || recordFeedbackMut.isPending}
                onClick={() => {
                  const finalReason = rejectReason === "Otro motivo" ? customRejectNote : rejectReason;
                  handleFeedback(rejectModalMatch, 'rechazado', finalReason, customRejectNote);
                  setRejectModalMatch(null);
                  setRejectReason('');
                  setCustomRejectNote('');
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs h-9 px-4 flex items-center gap-1.5"
              >
                {recordFeedbackMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Confirmar Descarte
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Footer Version Stamp */}
      <div className="pt-6 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
        <div>VECY Network Colombia &copy; 2026</div>
        <div className="text-[#bf953f] font-bold">{VECY_VERSION_LABEL}</div>
      </div>
    </div>
  );
}
