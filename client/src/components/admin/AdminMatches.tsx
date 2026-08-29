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
    if (status === "exact" || status === "ok" || status === "plus") {
      pts += weight;
    } else if (status === "warn") {
      pts += weight * 0.5; // Aproximado suma el 50% del puntaje
    } else if (status === "neutral") {
      pts += 0; // Dato Pendiente / Faltante no suma puntos para bajar la puntuación proporcionalmente
    } else if (status === "missing") {
      pts += 0;
    }
  };

  const cleanText = (t: string) => (t || "").toLowerCase().trim().replace(/[\s\-_,.]+/g, " ");
  const reqTextLower = (req.rawText || req.name || "").toLowerCase().replace(/[\u2060\u200B\u200C\u200D\uFEFF\u00A0]/g, " ");
  const propTextLower = (prop.rawText || prop.description || prop.name || "").toLowerCase().replace(/[\u2060\u200B\u200C\u200D\uFEFF\u00A0]/g, " ");
  const reqRawText = cleanText(req.rawText || req.name || "");
  const propRawText = cleanText(prop.rawText || prop.description || prop.name || "");

  // 1. Tipo de Inmueble (REGLA DOCTRINAL ESTRICTA - Exactitud Total de Subtipo)
  const reqTypeRaw = req.tipoInmuebleDeseado || req.propertyType;
  const propTypeRaw = prop.propertyType;

  const deduceFullPropertyType = (type: string | null | undefined, raw: string): string => {
    const t = (type || "").toLowerCase().trim();
    const clean = ((raw || "") + " " + (type || "")).toLowerCase().trim().replace(/[\s\-_,.]+/g, " ");
    
    if (clean.includes("consultorio") || clean.includes("consultorios") || clean.includes("odontol") || clean.includes("médic") || clean.includes("medic")) {
      return "consultorio";
    }
    if (clean.includes("bodega") || clean.includes("bodegas") || clean.includes("warehouse")) {
      return "warehouse";
    }
    if (clean.includes("local comercial") || clean.includes("locales comerciales") || /\blocal\b/.test(clean) || /\blocales\b/.test(clean)) {
      return "commercial";
    }
    if (clean.includes("oficina") || clean.includes("oficinas") || /\boffice\b/.test(clean)) {
      return "office";
    }
    if (clean.includes("cabaña") || clean.includes("cabana") || clean.includes("cabañas") || clean.includes("cabin")) {
      return "cabin";
    }
    if (clean.includes("finca") || clean.includes("campestre") || clean.includes("casa de campo") || clean.includes("farm")) {
      return "farm";
    }
    if (clean.includes("casa") || clean.includes("townhouse") || clean.includes("chalet") || clean.includes("house")) {
      if (!clean.includes("apartamento") && !clean.includes("apto")) {
        return "house";
      }
    }
    if (clean.includes("lote") || clean.includes("terreno") || clean.includes("predio") || clean.includes("land")) {
      return "land";
    }
    if (clean.includes("edificio") || clean.includes("building")) {
      return "building";
    }
    if (clean.includes("hotel") || clean.includes("hostal") || clean.includes("hostel")) {
      return "hotel";
    }
    if (clean.includes("apartaestudio") || clean.includes("aparta estudio") || clean.includes("apartasuite") || clean.includes("aparta suite") || clean.includes("studio")) {
      return "apartaestudio";
    }
    if (clean.includes("loft")) {
      return "loft";
    }
    if (clean.includes("penthouse") || clean.includes("pent house") || clean.includes("ph ")) {
      return "penthouse";
    }
    if (clean.includes("duplex") || clean.includes("dúplex") || clean.includes("triplex")) {
      return "apartamento_duplex";
    }
    if (clean.includes("apartamento") || clean.includes("apto") || clean.includes("apartment")) {
      return "apartamento_estandar";
    }
    if (t === "house" || t === "casa") return "house";
    return "apartamento_estandar";
  };

  const reqSubtype = deduceFullPropertyType(reqTypeRaw, reqRawText);
  const propSubtype = deduceFullPropertyType(propTypeRaw, propRawText);

  // Exactitud estricta: Subtipo de demanda debe coincidir con subtipo de oferta
  let typeMatchStatus: MatchStatus = "missing";
  if (reqSubtype === propSubtype) {
    typeMatchStatus = "exact";
  } else if ((reqSubtype === "apartaestudio" && propSubtype === "loft") || (reqSubtype === "loft" && propSubtype === "apartaestudio")) {
    typeMatchStatus = "exact"; // Apartaestudio y Loft de 1 hab son compatibles
  } else {
    typeMatchStatus = "missing"; // No coincide -> 0% Guillotina
  }

  const getSubtypeFriendlyLabel = (sub: string | null | undefined): string => {
    if (!sub) return "N/E";
    if (sub === "consultorio") return "Consultorio Médico / Dotacional";
    if (sub === "office") return "Oficina";
    if (sub === "commercial") return "Local Comercial";
    if (sub === "warehouse") return "Bodega";
    if (sub === "house") return "Casa Urbana";
    if (sub === "farm") return "Casa Campestre / Finca";
    if (sub === "land") return "Lote / Terreno";
    if (sub === "building") return "Edificio";
    if (sub === "hotel") return "Hotel";
    if (sub === "cabin") return "Cabaña";
    if (sub === "apartaestudio") return "Apartaestudio / Aparta Suite";
    if (sub === "loft") return "Loft";
    if (sub === "penthouse") return "PentHouse";
    if (sub === "apartamento_duplex") return "Apartamento Dúplex";
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

  // 2. Tipo de Negocio (Matriz Doctrinal Estricta de Intencionalidad)
  const reqNeg = req.tipoNegocioDeseado || req.transactionType || "";
  const propNeg = prop.transactionType || "";

  const normalizeNegocio = (val: string, raw: string): string => {
    const combined = ((val || "") + " " + (raw || "")).toLowerCase();
    if (combined.includes("arriendo con opci") || combined.includes("rent to own")) return "arriendo_con_opcion_de_compra";
    if (combined.includes("venpermuto") || combined.includes("venta permuta") || combined.includes("venta-permuta") || combined.includes("recibe permuta") || combined.includes("recibo menor valor") || combined.includes("permuto") || combined.includes("permuta")) return "venta_permuta";
    if (combined.includes("venta o arriendo") || combined.includes("vendo o arriendo") || combined.includes("venta/arriendo")) return "venta_o_arriendo";
    if (combined.includes("arriendo") || combined.includes("renta") || combined.includes("alquiler")) return "arriendo";
    if (combined.includes("venta") || combined.includes("vendo") || combined.includes("compra") || combined.includes("compro")) return "venta";
    return (val || "").toLowerCase().trim();
  };

  const cleanReqBiz = normalizeNegocio(reqNeg, reqRawText);
  const cleanPropBiz = normalizeNegocio(propNeg, propRawText);

  let negMatchStatus: MatchStatus = "missing";
  if (cleanReqBiz === cleanPropBiz && cleanReqBiz !== "") {
    negMatchStatus = "exact";
  } else if (cleanReqBiz === "venta" && cleanPropBiz === "venta_o_arriendo") {
    negMatchStatus = "exact";
  } else if (cleanReqBiz === "arriendo" && cleanPropBiz === "venta_o_arriendo") {
    negMatchStatus = "exact";
  } else if (cleanReqBiz === "venta_permuta" && (cleanPropBiz === "venta_permuta" || cleanPropBiz === "permuta")) {
    negMatchStatus = "exact";
  } else {
    negMatchStatus = "missing"; // No coincide -> 0% Guillotina
  }

  const getBusinessDisplayLabel = (bType: string): string => {
    if (bType === "arriendo_con_opcion_de_compra") return "Arriendo con Opción de Compra";
    if (bType === "venta_permuta") return "Venta / Permuta (Venpermuto)";
    if (bType === "venta_o_arriendo") return "Venta / Arriendo";
    if (bType === "arriendo") return "Arriendo";
    if (bType === "venta") return "Venta";
    return getTransactionLabel(bType);
  };

  add(
    "Tipo de Negocio", 
    getBusinessDisplayLabel(cleanReqBiz), 
    getBusinessDisplayLabel(cleanPropBiz), 
    negMatchStatus, 
    15, 
    <SlidersHorizontal className="w-3.5 h-3.5" />
  );

  // 3. Ubicación / Barrio
  const reqZona = cleanText(req.zonaDeseada || req.addressNeighborhood || "");
  const propZona = cleanText(prop.zone || prop.addressNeighborhood || "");
  
  const reqFullText = `${req.zonaDeseada || ''} ${req.rawText || ''}`.toLowerCase();
  const propFullText = `${prop.zone || ''} ${prop.rawText || ''}`.toLowerCase();
  
  const reqStreetMatch = reqFullText.match(/(?:entre|de|cll|calle|calles)\s*:?\s*(\d{1,3})\s*(?:a|y|-|hasta)\s*(\d{1,3})/i);
  const propStreetMatch = propFullText.match(/(?:calle|cll|cll\.)\s*(\d{1,3})/i);

  let isOutStreetBounds = false;
  if (reqStreetMatch && propStreetMatch) {
    const minS = Math.min(parseInt(reqStreetMatch[1]), parseInt(reqStreetMatch[2]));
    const maxS = Math.max(parseInt(reqStreetMatch[1]), parseInt(reqStreetMatch[2]));
    const pS = parseInt(propStreetMatch[1]);
    if (pS < minS || pS > maxS) isOutStreetBounds = true;
  }

  const extractBarrioFromText = (text: string): string | null => {
    if (!text) return null;
    const lower = text.toLowerCase();
    const knowns = [
      "cedritos", "santa paula", "santa barbara", "santa bárbara", "chico norte", "chico reservado", "chico",
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

  const reqEffectiveZone = (req.zonaDeseada && req.zonaDeseada.toLowerCase() !== "bogotá" && req.zonaDeseada.toLowerCase() !== "bogota") ? req.zonaDeseada : (reqBarrioInferred || req.zonaDeseada || "");
  const propEffectiveZone = (prop.zone && prop.zone.toLowerCase() !== "bogotá" && prop.zone.toLowerCase() !== "bogota") ? prop.zone : (propBarrioInferred || prop.zone || "");

  const SUB_CALIFICADORES = ["alta", "alto", "baja", "bajo", "norte", "sur", "oriental", "occidental", "reservado", "i ", "ii ", "iii ", "navarra"];

  const normalizeBarrio = (s: string) =>
    (s || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");

  const matchBarrioExacto = (rB: string, pB: string): boolean => {
    const rn = normalizeBarrio(rB);
    const pn = normalizeBarrio(pB);
    if (!rn || !pn) return false;
    if (rn === pn) return true;

    const isChicoNavReq = rn.includes("chico navarra") || rn.includes("navarra");
    const isChicoNavProp = pn.includes("chico navarra") || pn.includes("navarra");
    const isChicoTradReq = (rn.includes("chico") || rn.includes("chico norte") || rn.includes("chico reservado") || rn.includes("rincon del chico")) && !isChicoNavReq;
    const isChicoTradProp = (pn.includes("chico") || pn.includes("chico norte") || pn.includes("chico reservado") || pn.includes("rincon del chico")) && !isChicoNavProp;

    if ((isChicoNavReq && isChicoTradProp) || (isChicoTradReq && isChicoNavProp)) {
      return false;
    }

    const reqHasQual = SUB_CALIFICADORES.some(q => rn.includes(q));
    const propHasQual = SUB_CALIFICADORES.some(q => pn.includes(q));
    if (reqHasQual && propHasQual && rn !== pn) return false;
    return (rn.includes(pn) || pn.includes(rn)) && !SUB_CALIFICADORES.some(q => rn.includes(q) !== pn.includes(q));
  };

  const cleanBarrioValue = (bVal: string | null | undefined, cVal: string | null | undefined): string => {
    if (!bVal || bVal === "N/E") return "N/E";
    const b = bVal.trim();
    if (!b) return "N/E";

    const bNorm = b.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const cNorm = (cVal || "bogota").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

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
      bNorm === "colombia"
    ) {
      return "N/E";
    }
    return b;
  };

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
    return "N/E";
  };

  const rawReqB = cleanBarrioValue(reqBarrioRaw, req.addressCity || req.ciudadDeseada);
  const rawPropB = cleanBarrioValue(propBarrioRaw, prop.addressCity || prop.city);

  let propBarrioDisplay = rawPropB;
  if (propTextLower && (rawPropB === "N/E" || rawPropB.toLowerCase() === "virrey" || rawPropB.toLowerCase() === "chico" || rawPropB.toLowerCase() === "chapinero")) {
    if (propTextLower.includes("la cabrera") || propTextLower.includes("cabrera")) propBarrioDisplay = "La Cabrera";
    else if (propTextLower.includes("rincon del chico") || propTextLower.includes("rincón del chicó")) propBarrioDisplay = "Rincón del Chicó";
    else if (propTextLower.includes("el nogal") || propTextLower.includes("nogal")) propBarrioDisplay = "El Nogal";
    else if (propTextLower.includes("los rosales") || propTextLower.includes("rosales")) propBarrioDisplay = "Rosales";
  }

  let reqBarrioDisplay = rawReqB;
  const isDiffSubBarrio = reqZona && propZona && SUB_CALIFICADORES.some(o => (reqZona.includes(o) && !propZona.includes(o)) || (!reqZona.includes(o) && propZona.includes(o)));

  const reqLocalityDisplay = (req.addressLocality && req.addressLocality !== "N/E") ? req.addressLocality : inferLocalityFromBarrio(reqBarrioDisplay);
  const propLocalityDisplay = (prop.addressLocality && prop.addressLocality !== "N/E") ? prop.addressLocality : inferLocalityFromBarrio(propBarrioDisplay);

  const reqCityDisplay = req.addressCity || req.ciudadDeseada || "Bogotá, D.C.";
  const propCityDisplay = prop.addressCity || prop.city || "Bogotá, D.C.";

  const isCityMatch =
    normalizeBarrio(reqCityDisplay) === normalizeBarrio(propCityDisplay) ||
    normalizeBarrio(reqCityDisplay).includes(normalizeBarrio(propCityDisplay)) ||
    normalizeBarrio(propCityDisplay).includes(normalizeBarrio(reqCityDisplay));

  const isGenericZone = (zn: string) => !zn || zn === "N/E" || zn === "na" || zn === "bogota" || zn === "bogotá" || zn === "bogota, d.c.";

  let barrioMatchStatus: MatchStatus = "missing";
  if (isGenericZone(reqBarrioDisplay) || isGenericZone(propBarrioDisplay)) {
    barrioMatchStatus = "neutral";
  } else if (isOutStreetBounds) {
    barrioMatchStatus = "missing";
  } else if (isDiffSubBarrio) {
    barrioMatchStatus = "missing";
  } else if (matchBarrioExacto(reqBarrioDisplay, propBarrioDisplay)) {
    barrioMatchStatus = "exact";
  } else {
    barrioMatchStatus = "missing";
  }

  let localityMatchStatus: MatchStatus = "neutral";
  if (reqLocalityDisplay === "N/E" || propLocalityDisplay === "N/E") {
    localityMatchStatus = "neutral";
  } else if (normalizeBarrio(reqLocalityDisplay) === normalizeBarrio(propLocalityDisplay)) {
    localityMatchStatus = "exact";
  } else {
    localityMatchStatus = "missing";
  }

  let cityMatchStatus: MatchStatus = isCityMatch ? "exact" : "missing";

  add("Barrio / Vereda / Caserío", reqBarrioDisplay, propBarrioDisplay, barrioMatchStatus, 10, <MapPin className="w-3.5 h-3.5" />);
  add("Localidad / Comuna", reqLocalityDisplay, propLocalityDisplay, localityMatchStatus, 5, <MapPin className="w-3.5 h-3.5" />);
  add("Ciudad / Municipio", reqCityDisplay, propCityDisplay, cityMatchStatus, 5, <MapPin className="w-3.5 h-3.5" />);

  const isPhoneNumberNotPrice = (val: number | string | null | undefined, rawText?: string): boolean => {
    if (val === undefined || val === null || val === "" || val === 0 || val === "0") return false;
    const numStr = String(val).replace(/\D/g, "");
    if (numStr.length === 10 && numStr.startsWith("3")) return true;
    if (numStr.length === 12 && numStr.startsWith("573")) return true;
    return false;
  };

  const parseSafePrice = (val: any, rawText?: string): number => {
    if (val === undefined || val === null || val === "") return 0;
    const num = parseFloat(String(val));
    if (isNaN(num) || num <= 0) return 0;
    if (isPhoneNumberNotPrice(num, rawText)) return 0;
    return num;
  };

  const isReqRentMatch = cleanReqBiz.includes("arriendo");
  const isPropPureRent = cleanPropBiz === "arriendo";
  const isPropPureVenta = cleanPropBiz === "venta";
  const isReqOpenBudget = /(?:ppto|presupuesto|canon|valor)?\s*\$?\s*(?:abierto|sin\s*l[ií]mite|ilimitado|negociable\s*sin\s*tope)\b/i.test(reqTextLower);

  function parseColombianPriceOrBudget(numStr: string, unit: string, isSale: boolean): number {
    const cleanStr = (numStr || "").trim().replace(/\*/g, "");
    const cleanUnit = (unit || "").toLowerCase();
    if (cleanUnit.includes("mil millon")) return Math.round(parseFloat(cleanStr.replace(",", ".")) * 1_000_000_000);
    if (/^\d{1,3}\.\d{3}$/.test(cleanStr)) return parseInt(cleanStr.replace(".", ""), 10) * 1_000_000;
    let val = parseFloat(cleanStr.replace(",", "."));
    if (isNaN(val)) return 0;
    if (cleanUnit.includes("millon") || cleanUnit.includes("millón") || cleanUnit.includes("mll") || cleanUnit.includes("mm") || cleanUnit === "m") {
      if (val < 100 && isSale && val > 0) return Math.round(val * 10_000_000);
      return Math.round(val * 1_000_000);
    }
    if (val < 10000) return Math.round(val * 1_000_000);
    return Math.round(val);
  }

  let propSalePrice = !isPropPureRent ? parseSafePrice(prop.price, prop.rawText) : 0;
  let reqSaleBudget = (!isReqRentMatch && !isPropPureRent) ? parseSafePrice(req.presupuestoMax, req.rawText) : 0;

  if ((reqSaleBudget <= 0 || reqSaleBudget < 100_000_000) && reqTextLower && !isReqRentMatch && !isPropPureRent && !isReqOpenBudget) {
    const rangeMatch = reqTextLower.match(/(?:presupuesto(?:\s*m[aá]ximo)?|ppto(?:\s*m[aá]ximo)?|hasta|tope|valor|inversi[oó]n|compra)?\s*:?\s*\*?\$?\s*(\d{1,4}(?:[.,]\d{1,3})?)\s*(?:a|hasta|-)\s*\*?\$?\s*(\d{1,4}(?:[.,]\d{1,3})?)\*?\s*(mil\s*millones?|millones?|millon|millón|mill|mm|m)?\b/i);
    if (rangeMatch && (rangeMatch[0].includes("presupuesto") || rangeMatch[0].includes("ppto") || rangeMatch[0].includes("compra") || rangeMatch[3])) {
      const parsedMax = parseColombianPriceOrBudget(rangeMatch[2], rangeMatch[3] || "", true);
      if (parsedMax >= 10_000_000) reqSaleBudget = parsedMax;
    }
  }

  if ((propSalePrice < 100_000_000 || propSalePrice === 0) && propTextLower && !isPropPureRent) {
    const millonMatch = propTextLower.match(/(?:precio|valor|venta|💰)?\s*:?\s*\$?\s*(\d{1,4}(?:[.,]\d{1,3})?)\s*(mil\s*millones?|millon|millones|millón|mill|mm|m)\b/i);
    if (millonMatch) {
      const computed = parseColombianPriceOrBudget(millonMatch[1], millonMatch[2], true);
      if (computed >= 30_000_000) propSalePrice = computed;
    }
  }

  if (propSalePrice < 30_000_000) propSalePrice = 0;

  let reqSaleLabel = isReqRentMatch ? "N/A (Búsqueda de Arriendo)" : (isReqOpenBudget ? "Presupuesto Abierto" : (reqSaleBudget > 0 ? formatCOP(reqSaleBudget) : "N/E"));
  let propSaleLabel = propSalePrice >= 30_000_000 ? formatCOP(propSalePrice) : (isPropPureRent ? "N/A (Inmueble en Arriendo)" : "N/E");

  let saleS: MatchStatus = "neutral";
  if (isReqRentMatch) {
    saleS = "exact";
  } else if (isReqOpenBudget) {
    saleS = propSalePrice > 0 ? "exact" : "neutral";
  } else if (reqSaleBudget > 0 && propSalePrice > 0) {
    if (propSalePrice > reqSaleBudget) {
      saleS = "missing"; 
    } else {
      saleS = "exact";
    }
  } else {
    saleS = "neutral";
  }

  add("Precio de Venta", reqSaleLabel, propSaleLabel, saleS, isReqRentMatch ? 0 : 15, <DollarSign className="w-3.5 h-3.5" />);

  let propRentPrice = !isPropPureVenta ? parseSafePrice(prop.rentPrice || prop.priceRent, prop.rawText) : 0;
  let reqRentBudget = isReqRentMatch ? parseSafePrice(req.presupuestoMax, req.rawText) : 0;

  if (isReqRentMatch && reqTextLower && !isReqOpenBudget && reqRentBudget <= 0) {
    const matchPresu = reqTextLower.match(/(?:presupuesto|ppto|canon|valor|hasta|máximo|max)\s*(?:máximo|max)?\s*:?\s*\$?\s*([\d.,\s]+?)\s*(mil\s*millones?|millones|millón|mll|mlls|mm|m)?(?:\s|$|\n)/i);
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

  let reqRentLabel = !isReqRentMatch ? "N/A (Búsqueda de Compra)" : (isReqOpenBudget ? "Presupuesto Abierto" : (reqRentBudget > 0 ? `${formatCOP(reqRentBudget)} / mes` : "N/E"));
  let propRentLabel = propRentPrice > 0 ? `${formatCOP(propRentPrice)} / mes` : (isPropPureVenta ? "N/A (Solo Venta)" : "N/E");

  let rentS: MatchStatus = "neutral";
  if (!isReqRentMatch) {
    rentS = "exact";
  } else if (isReqOpenBudget) {
    rentS = propRentPrice > 0 ? "exact" : "neutral";
  } else if (reqRentBudget > 0 && propRentPrice > 0) {
    if (propRentPrice > reqRentBudget) {
      rentS = "missing";
    } else {
      rentS = "exact";
    }
  } else {
    rentS = "neutral";
  }

  add("Precio de Arriendo / Canon", reqRentLabel, propRentLabel, rentS, isReqRentMatch ? 15 : 0, <Receipt className="w-3.5 h-3.5" />);

  let reqAdminMax = parseSafePrice(req.adminFeeMax, req.rawText);
  let propAdminFee = parseSafePrice(prop.adminFee, prop.rawText);

  let adminS: MatchStatus = "neutral";
  if (reqAdminMax > 0 && propAdminFee > 0) {
    if (propAdminFee > reqAdminMax) {
      adminS = "missing";
    } else {
      adminS = "exact";
    }
  } else if (reqAdminMax === 0 && propAdminFee > 0) {
    adminS = "neutral";
  }

  const reqAdminLabel = reqAdminMax > 0 ? `≤ ${formatCOP(reqAdminMax)}` : "Flexible / Sin restricción";
  const propAdminLabel = propAdminFee > 0 ? `${formatCOP(propAdminFee)} / mes` : "N/E";

  add("Cuota de Administración", reqAdminLabel, propAdminLabel, adminS, 5, <Receipt className="w-3.5 h-3.5" />);

  let areaR = parseFloat(req.areaMin || req.areaMinimaM2 || "0");
  if (areaR <= 0 && reqTextLower) {
    const mRA = reqTextLower.match(/(?:mínimo|min|de|área)?\s*([\d.,]+)\s*(?:m2|mts|m²|metros)/i);
    if (mRA) {
      let valRA = parseFloat(mRA[1].replace(/\./g, "").replace(",", "."));
      if (!isNaN(valRA) && valRA > 10 && valRA < 10000) areaR = valRA;
    }
  }

  let areaP = parseFloat(prop.areaTotal || prop.areaPrivate || "0");

  let areS: MatchStatus = "neutral";
  let areaPropLabel = areaP > 0 ? `${areaP} m²` : "N/E";
  if (areaR > 0 && areaP > 0) {
    if (areaP < areaR * 0.95) {
      areS = "missing";
    } else if (areaP >= areaR) {
      areS = "exact";
    } else {
      areS = "warn";
    }
  } else if (areaR === 0 && areaP > 0) {
    areS = "neutral";
  }
  const reqAreaLabel = areaR > 0 ? `≥ ${areaR} m²` : "Flexible / Sin restricción";

  add("Área Total", reqAreaLabel, areaPropLabel, areS, 10, <Ruler className="w-3.5 h-3.5" />);

  let bedR = req.habitacionesMin ? Number(req.habitacionesMin) : 0;
  let bedP = prop.bedrooms ? Number(prop.bedrooms) : 0;

  let bedS: MatchStatus = "neutral";
  if (bedR > 0 && bedP > 0) {
    if (bedR === 1) {
      bedS = bedP === 1 ? "exact" : "missing";
    } else {
      if (bedP < bedR) {
        bedS = "missing";
      } else if (bedP > bedR + 1) {
        bedS = "missing";
      } else {
        bedS = "exact";
      }
    }
  } else if (bedR === 0 && bedP > 0) {
    bedS = "neutral";
  }
  const reqBedLabel = bedR > 0 ? `${bedR} hab.` : "Flexible / Sin restricción";

  add("Habitaciones", reqBedLabel, bedP > 0 ? `${bedP} hab.` : "N/E", bedS, 8, <Bed className="w-3.5 h-3.5" />);

  let bathR = req.banosMin ? Number(req.banosMin) : 0;
  let bathP = prop.bathrooms ? Number(prop.bathrooms) : 0;

  let bathS: MatchStatus = "neutral";
  if (bathR > 0 && bathP > 0) {
    if (bathP < bathR) {
      bathS = "missing";
    } else {
      bathS = "exact";
    }
  } else if (bathR === 0 && bathP > 0) {
    bathS = "neutral";
  }
  const reqBathLabel = bathR > 0 ? `≥ ${bathR} baño${bathR > 1 ? "s" : ""}` : "Flexible / Sin restricción";

  add("Baños", reqBathLabel, bathP > 0 ? `${bathP} baño${bathP > 1 ? "s" : ""}` : "N/E", bathS, 5, <Bath className="w-3.5 h-3.5" />);

  let garR = req.parqueaderosMin ? Number(req.parqueaderosMin) : 0;
  let garP = prop.garages ? Number(prop.garages) : 0;
  const garType = (prop.garageType || "").toLowerCase();
  const reqWantsIndep = reqTextLower.includes("independiente") || reqTextLower.includes("libre") || reqTextLower.includes("no lineal");

  let garS: MatchStatus = "neutral";
  let garPropLabel = garP > 0 ? `${garP} garaje${garP > 1 ? "s" : ""}` : "N/E";

  if (garR > 0 && garP > 0) {
    if (garP < garR || (reqWantsIndep && garType === "lineal")) {
      garS = "missing";
    } else {
      garS = "exact";
    }
  } else if (garR === 0 && garP > 0) {
    garS = "neutral";
  }
  const garReqLabel = garR > 0 ? `≥ ${garR} garaje${garR > 1 ? "s" : ""}` : "Flexible / Sin restricción";

  add("Parqueaderos", garReqLabel, garPropLabel, garS, 5, <Car className="w-3.5 h-3.5" />);

  const estratoArr: number[] = Array.isArray(req.estratoDeseado) ? req.estratoDeseado
    : req.estratoDeseado ? [Number(req.estratoDeseado)] : [];
  let estratoP = prop.stratum || prop.estrato;

  const hasEstratoReq = estratoArr.length > 0 && estratoArr[0] > 0;
  let estS: MatchStatus = "neutral";
  if (hasEstratoReq && estratoP && Number(estratoP) > 0) {
    if (estratoArr.length === 1 && estratoArr[0] === Number(estratoP)) {
      estS = "exact";
    } else if (estratoArr.includes(Number(estratoP))) {
      estS = "warn";
    } else if (Math.abs(Number(estratoP) - estratoArr[0]) === 1) {
      estS = "warn";
    } else {
      estS = "missing";
    }
  } else if (!hasEstratoReq && (estratoP && Number(estratoP) > 0)) {
    estS = "neutral";
  }
  const reqEstratoLabel = hasEstratoReq ? `Estrato ${estratoArr.join(", ")}` : "Flexible / Sin restricción";

  add("Estrato", reqEstratoLabel, (estratoP && Number(estratoP) > 0) ? `Estrato ${estratoP}` : "N/E", estS, 7, <Shield className="w-3.5 h-3.5" />);

  let ageR = req.antiguedadMax ? Number(req.antiguedadMax) : (req.preferredAge ? Number(req.preferredAge) : 0);
  let ageP = prop.antiguedadAnos != null ? Number(prop.antiguedadAnos)
    : (prop.yearBuilt ? (new Date().getFullYear() - Number(prop.yearBuilt))
    : (prop.constructionYear ? (new Date().getFullYear() - Number(prop.constructionYear)) : -1));

  let ageS: MatchStatus = "neutral";
  if (ageR > 0 && ageP >= 0) {
    if (ageP <= ageR) ageS = "exact";
    else ageS = "warn";
  } else if (ageR <= 0 && ageP >= 0) {
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

  const handleCopy = (text: string, id: string, asSearchSnippet = false) => {
    try {
      if (!text) return;
      const cleanRaw = text.replace(/__is_sub_message__/g, '').trim();
      
      if (asSearchSnippet) {
        // Extraer la primera línea o frase clave corta para ubicar en el buscador de WhatsApp
        const lines = cleanRaw
          .split('\n')
          .map(l => l.replace(/[*_~`#]/g, '').trim())
          .filter(l => l.length >= 4 && !l.startsWith('http') && !l.startsWith('__'));
        
        let snippet = lines.length > 0 ? lines[0] : cleanRaw;
        if (snippet.length > 45) {
          snippet = snippet.slice(0, 45).trim();
        }
        
        navigator.clipboard.writeText(snippet);
        toast.success("🔍 Frase de búsqueda copiada", {
          description: `Pega "${snippet}" en la lupa de WhatsApp para encontrar el mensaje.`,
        });
      } else {
        // Copiar el texto 100% original con sus saltos de línea y emojis intactos
        navigator.clipboard.writeText(cleanRaw);
        toast.success("📋 Mensaje original copiado", {
          description: "Texto 100% fiel con saltos de línea y formato original.",
        });
      }

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
      const promises: Promise<any>[] = [];

      if (m.property?.id) {
        const cleanPropPhone = normalizePhoneInput(editForm.propPhone);
        promises.push(
          updatePropMut.mutateAsync({
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
          })
        );
      }

      if (m.requirement?.id) {
        const cleanReqPhone = normalizePhoneInput(editForm.reqPhone);
        promises.push(
          updateReqMut.mutateAsync({
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
          })
        );
      }

      // Guardado en paralelo ultrarrápido
      await Promise.all(promises);

      // Actualización optimista de memoria inmediata (0ms lag)
      if (m.property) {
        Object.assign(m.property, {
          price: editForm.propPrice !== undefined && editForm.propPrice !== '' ? editForm.propPrice : m.property.price,
          rentPrice: editForm.propRentPrice !== undefined && editForm.propRentPrice !== '' ? editForm.propRentPrice : m.property.rentPrice,
          adminFee: editForm.propAdminFee !== undefined && editForm.propAdminFee !== '' ? editForm.propAdminFee : m.property.adminFee,
          areaTotal: editForm.propArea !== undefined && editForm.propArea !== '' ? editForm.propArea : m.property.areaTotal,
          bedrooms: editForm.propBedrooms !== undefined && editForm.propBedrooms !== '' ? Number(editForm.propBedrooms) : m.property.bedrooms,
          bathrooms: editForm.propBathrooms !== undefined && editForm.propBathrooms !== '' ? Number(editForm.propBathrooms) : m.property.bathrooms,
          garages: editForm.propGarages !== undefined && editForm.propGarages !== '' ? Number(editForm.propGarages) : m.property.garages,
          stratum: editForm.propStratum !== undefined && editForm.propStratum !== '' ? Number(editForm.propStratum) : m.property.stratum,
          zone: editForm.propZone || m.property.zone,
          city: editForm.propCity || m.property.city,
          idUsuarioWhatsapp: normalizePhoneInput(editForm.propPhone) || m.property.idUsuarioWhatsapp,
        });
      }

      if (m.requirement) {
        Object.assign(m.requirement, {
          presupuestoMax: editForm.reqBudget !== undefined && editForm.reqBudget !== '' ? editForm.reqBudget : m.requirement.presupuestoMax,
          adminFeeMax: editForm.reqAdminMax !== undefined && editForm.reqAdminMax !== '' ? editForm.reqAdminMax : m.requirement.adminFeeMax,
          areaMin: editForm.reqArea !== undefined && editForm.reqArea !== '' ? editForm.reqArea : m.requirement.areaMin,
          habitacionesMin: editForm.reqBedrooms !== undefined && editForm.reqBedrooms !== '' ? Number(editForm.reqBedrooms) : m.requirement.habitacionesMin,
          banosMin: editForm.reqBathrooms !== undefined && editForm.reqBathrooms !== '' ? Number(editForm.reqBathrooms) : m.requirement.banosMin,
          parqueaderosMin: editForm.reqGarages !== undefined && editForm.reqGarages !== '' ? Number(editForm.reqGarages) : m.requirement.parqueaderosMin,
          estratoDeseado: editForm.reqStratum !== undefined && editForm.reqStratum !== '' ? Number(editForm.reqStratum) : m.requirement.estratoDeseado,
          zonaDeseada: editForm.reqZone || m.requirement.zonaDeseada,
          ciudadDeseada: editForm.reqCity || m.requirement.ciudadDeseada,
          idUsuarioWhatsapp: normalizePhoneInput(editForm.reqPhone) || m.requirement.idUsuarioWhatsapp,
        });
      }

      setSaveStatusMap(prev => ({ ...prev, [m.id]: 'saved' }));
      toast.success("✅ Ficha actualizada y guardada correctamente");
      setEditingMatchId(null);
      setEditForm({});

      // Refrescar en segundo plano sin congelar
      utils.janIA.getAllMatches.invalidate().catch(() => {});
    } catch (err: any) {
      console.error("[handleOnlySave] Error:", err);
      toast.error("Error al guardar: " + (err.message || "Error desconocido"));
    } finally {
      setIsSavingOnly(false);
    }
  };

  const handleRecalculateMatch = async (m: any) => {
    setIsRecalculating(true);
    try {
      const savePromises: Promise<any>[] = [];

      if (m.property?.id && Object.keys(editForm).some(k => k.startsWith('prop'))) {
        const cleanPropPhone = normalizePhoneInput(editForm.propPhone);
        savePromises.push(
          updatePropMut.mutateAsync({
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
          })
        );
      }

      if (m.requirement?.id && Object.keys(editForm).some(k => k.startsWith('req'))) {
        const cleanReqPhone = normalizePhoneInput(editForm.reqPhone);
        savePromises.push(
          updateReqMut.mutateAsync({
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
          })
        );
      }

      if (savePromises.length > 0) {
        await Promise.all(savePromises);
      }

      if (m.property?.id || m.requirement?.id) {
        await recalculateMatchMut.mutateAsync({
          propertyId: m.property?.id || undefined,
          requirementId: m.requirement?.id || undefined,
        });
      }

      setSaveStatusMap(prev => ({ ...prev, [m.id]: 'recalculated' }));
      toast.success("⚡ Coincidencia recalculada con éxito");
      setEditingMatchId(null);
      setEditForm({});
      await refetch();
    } catch (err: any) {
      console.error("[handleRecalculateMatch] Error:", err);
      toast.error("Error al recalcular: " + (err.message || "Error desconocido"));
    } finally {
      setIsRecalculating(false);
    }
  };

  // Fetch matches directly from server API (cacheado para máxima fluidez)
  const { data: matches = [], isLoading, refetch } = trpc.janIA.getAllMatches.useQuery(undefined, {
    refetchInterval: false,
    staleTime: 60000,
    refetchOnWindowFocus: false,
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

  // 1. Indexación ultra-rápida sin bloqueo de hilo principal (<1ms)
  const processedMatches = useMemo(() => {
    const seenMatchIds = new Set<number>();
    const seenPairs = new Set<string>();
    const results: any[] = [];

    for (const match of (matches as any[])) {
      if (!match || !match.id || !match.property || !match.requirement) continue;

      const property = match.property;
      const requirement = match.requirement;
      const dbScore = parseFloat(match.matchScore || "0");

      // Mostrar únicamente los matches calificados válidos (85% a 100%)
      if (dbScore < 85) {
        continue;
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

      const matchIdStr = `m${match.id} #${match.id} ${match.id}`;
      const propSearchStr = `${matchIdStr} ${property.id || ""} ${property.name || ""} ${property.rawText || ""} ${property.description || ""} ${property.city || ""} ${property.zone || ""} ${property.addressNeighborhood || ""} ${property.brokerName || ""} ${property.brokerPhone || ""} ${property.idUsuarioWhatsapp || ""}`.toLowerCase();
      const reqSearchStr = `${requirement.id || ""} ${requirement.name || ""} ${requirement.rawText || ""} ${requirement.ciudadDeseada || ""} ${requirement.zonaDeseada || ""} ${requirement.addressNeighborhood || ""} ${requirement.brokerName || ""} ${requirement.brokerPhone || ""} ${requirement.idUsuarioWhatsapp || ""}`.toLowerCase();

      results.push({
        ...match,
        _precomputedRows: null,
        _precomputedScore: dbScore,
        _searchIndex: `${propSearchStr} ${reqSearchStr}`,
      });
    }

    return results;
  }, [matches]);

  // 2. Filtrado instantáneo (<0.001ms) con useDeferredValue para evitar bloqueos del hilo principal
  const deferredSearchTerm = React.useDeferredValue(searchTerm);

  const filteredMatches = useMemo(() => {
    const searchLower = (deferredSearchTerm || "").toLowerCase().trim();
    return processedMatches.filter((match) => {
      const displayScore = match._precomputedScore;

      // Filtro de Score
      if (minScore === "85_94") {
        if (displayScore < 85 || displayScore >= 95) return false;
      } else {
        const minVal = parseFloat(minScore);
        if (displayScore < minVal) return false;
      }

      // Filtro de Búsqueda
      if (searchLower && !match._searchIndex.includes(searchLower)) {
        return false;
      }

      return true;
    });
  }, [processedMatches, minScore, deferredSearchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / pageSize));
  const paginatedMatches = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const slice = filteredMatches.slice(start, start + pageSize);

    // Calcular scoreRows únicamente para los 10 items visibles en pantalla y reactivo solo a la tarjeta en edición
    return slice.map((m: any) => {
      const isEditingThisCard = editingMatchId === m.id;

      if (isEditingThisCard) {
        const effectiveProp = {
          ...m.property,
          price: editForm.propPrice !== undefined && editForm.propPrice !== '' ? editForm.propPrice : m.property.price,
          rentPrice: editForm.propRentPrice !== undefined && editForm.propRentPrice !== '' ? editForm.propRentPrice : m.property.rentPrice,
          adminFee: editForm.propAdminFee !== undefined && editForm.propAdminFee !== '' ? editForm.propAdminFee : m.property.adminFee,
          areaTotal: editForm.propArea !== undefined && editForm.propArea !== '' ? editForm.propArea : m.property.areaTotal,
          bedrooms: editForm.propBedrooms !== undefined && editForm.propBedrooms !== '' ? editForm.propBedrooms : m.property.bedrooms,
          bathrooms: editForm.propBathrooms !== undefined && editForm.propBathrooms !== '' ? editForm.propBathrooms : m.property.bathrooms,
          garages: editForm.propGarages !== undefined && editForm.propGarages !== '' ? editForm.propGarages : m.property.garages,
          stratum: editForm.propStratum !== undefined && editForm.propStratum !== '' ? editForm.propStratum : m.property.stratum,
          zone: editForm.propZone !== undefined && editForm.propZone !== '' ? editForm.propZone : m.property.zone,
          city: editForm.propCity !== undefined && editForm.propCity !== '' ? editForm.propCity : m.property.city,
        };

        const effectiveReq = {
          ...m.requirement,
          presupuestoMax: editForm.reqBudget !== undefined && editForm.reqBudget !== '' ? editForm.reqBudget : m.requirement.presupuestoMax,
          adminFeeMax: editForm.reqAdminMax !== undefined && editForm.reqAdminMax !== '' ? editForm.reqAdminMax : m.requirement.adminFeeMax,
          areaMin: editForm.reqArea !== undefined && editForm.reqArea !== '' ? editForm.reqArea : m.requirement.areaMin,
          habitacionesMin: editForm.reqBedrooms !== undefined && editForm.reqBedrooms !== '' ? editForm.reqBedrooms : m.requirement.habitacionesMin,
          banosMin: editForm.reqBathrooms !== undefined && editForm.reqBathrooms !== '' ? editForm.reqBathrooms : m.requirement.banosMin,
          parqueaderosMin: editForm.reqGarages !== undefined && editForm.reqGarages !== '' ? editForm.reqGarages : m.requirement.parqueaderosMin,
          estratoDeseado: editForm.reqStratum !== undefined && editForm.reqStratum !== '' ? editForm.reqStratum : m.requirement.estratoDeseado,
          zonaDeseada: editForm.reqZone !== undefined && editForm.reqZone !== '' ? editForm.reqZone : m.requirement.zonaDeseada,
          ciudadDeseada: editForm.reqCity !== undefined && editForm.reqCity !== '' ? editForm.reqCity : m.requirement.ciudadDeseada,
        };

        const computed = scoreRows(effectiveReq, effectiveProp);
        return {
          ...m,
          _effectiveProp: effectiveProp,
          _effectiveReq: effectiveReq,
          _precomputedRows: computed.rows,
          _precomputedScore: computed.autoScore > 0 ? computed.autoScore : parseFloat(m.matchScore || "0"),
        };
      }

      if (m._precomputedRows && m._precomputedRows.length > 0) {
        return m;
      }

      const { rows } = scoreRows(m.property, m.requirement);
      return {
        ...m,
        _effectiveProp: m.property,
        _effectiveReq: m.requirement,
        _precomputedRows: rows,
      };
    });
  }, [filteredMatches, currentPage, pageSize, editingMatchId, editForm]);



  const { data: botStatus } = trpc.janIA.getBotStatus.useQuery(undefined, {
    refetchInterval: false,
    staleTime: 60000,
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

                const exactCount = rows.filter((r: any) => r.status === "exact" || r.status === "ok").length;
                const plusCount = rows.filter((r: any) => r.status === "plus").length;
                const warnCount = rows.filter((r: any) => r.status === "warn").length;
                const failCount = rows.filter((r: any) => r.status === "missing").length;

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
                                  const copySearchKey = `prop-search-${m.id}`;
                                  const isCopied = copiedId === copyKey;
                                  const isSearchCopied = copiedId === copySearchKey;
                                  return (
                                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopy(pText || fallbackText, copyKey, false);
                                        }}
                                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all duration-300 border ${
                                          isCopied
                                            ? "bg-cyan-500/25 text-cyan-300 border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.45)] scale-105"
                                            : "text-zinc-400 hover:text-cyan-300 bg-white/5 hover:bg-white/10 border-white/10 hover:border-cyan-400/30 active:scale-95"
                                        }`}
                                        title="Copiar texto completo original con saltos de línea y emojis"
                                      >
                                        {isCopied ? (
                                          <>
                                            <Check className="w-3 h-3 text-cyan-300 animate-in zoom-in-50 duration-200" />
                                            <span className="text-cyan-200">¡Copiado!</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3 h-3" />
                                            <span>Copiar Todo</span>
                                          </>
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopy(pText || fallbackText, copySearchKey, true);
                                        }}
                                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-all duration-300 border ${
                                          isSearchCopied
                                            ? "bg-amber-500/25 text-amber-300 border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.45)] scale-105"
                                            : "text-zinc-400 hover:text-amber-300 bg-white/5 hover:bg-white/10 border-white/10 hover:border-amber-400/30 active:scale-95"
                                        }`}
                                        title="Copiar frase corta clave para pegar en el buscador de WhatsApp"
                                      >
                                        {isSearchCopied ? (
                                          <>
                                            <Check className="w-3 h-3 text-amber-300 animate-in zoom-in-50 duration-200" />
                                            <span className="text-amber-200">¡Clave Copiada!</span>
                                          </>
                                        ) : (
                                          <>
                                            <Search className="w-3 h-3 text-amber-400" />
                                            <span className="text-zinc-300">Buscar en WhatsApp</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
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
                                  const copySearchKey = `req-search-${m.id}`;
                                  const isCopied = copiedId === copyKey;
                                  const isSearchCopied = copiedId === copySearchKey;
                                  return (
                                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopy(rText, copyKey, false);
                                        }}
                                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all duration-300 border ${
                                          isCopied
                                            ? "bg-cyan-500/25 text-cyan-300 border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.45)] scale-105"
                                            : "text-zinc-400 hover:text-cyan-300 bg-white/5 hover:bg-white/10 border-white/10 hover:border-cyan-400/30 active:scale-95"
                                        }`}
                                        title="Copiar texto completo original del requerimiento con saltos de línea y formato"
                                      >
                                        {isCopied ? (
                                          <>
                                            <Check className="w-3 h-3 text-cyan-300 animate-in zoom-in-50 duration-200" />
                                            <span className="text-cyan-200">¡Copiado!</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3 h-3" />
                                            <span>Copiar Todo</span>
                                          </>
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopy(rText, copySearchKey, true);
                                        }}
                                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-all duration-300 border ${
                                          isSearchCopied
                                            ? "bg-amber-500/25 text-amber-300 border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.45)] scale-105"
                                            : "text-zinc-400 hover:text-amber-300 bg-white/5 hover:bg-white/10 border-white/10 hover:border-amber-400/30 active:scale-95"
                                        }`}
                                        title="Copiar frase corta clave para pegar en el buscador de WhatsApp"
                                      >
                                        {isSearchCopied ? (
                                          <>
                                            <Check className="w-3 h-3 text-amber-300 animate-in zoom-in-50 duration-200" />
                                            <span className="text-amber-200">¡Clave Copiada!</span>
                                          </>
                                        ) : (
                                          <>
                                            <Search className="w-3 h-3 text-amber-400" />
                                            <span className="text-zinc-300">Buscar en WhatsApp</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
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
                          {rows.map((row: any, rIdx: number) => {
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
                      {rows.map((row: any, rIdx: number) => {
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
                          Modo Edición Activo: Usa <strong>Guardar</strong> para registrar datos faltantes en la BD, o <strong>Recalcular</strong> si deseas buscar nuevas parejas en toda la red.
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
                                <span>Guardar</span>
                              </Button>
                              <Button
                                onClick={() => handleRecalculateMatch(m)}
                                disabled={isSavingOnly || isRecalculating}
                                className="group bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs h-10 px-4 shadow-lg hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] min-h-[44px] flex items-center justify-center gap-2 w-full sm:w-auto transition-all hover:scale-105 active:scale-95"
                              >
                                {isRecalculating ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Sparkles className="w-4 h-4 transition-transform group-hover:rotate-45" />}
                                <span>Recalcular</span>
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
