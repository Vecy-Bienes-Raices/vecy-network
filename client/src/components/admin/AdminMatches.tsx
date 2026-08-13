import React, { useMemo } from 'react';
import { 
  Phone, MapPin, Search, Download, Building2, Calendar, 
  Sparkles, CheckCircle2, AlertTriangle, XCircle, SlidersHorizontal, 
  DollarSign, Ruler, Bed, Bath, Car, Shield, ExternalLink, Receipt, Box, Globe,
  Edit3, Save, Loader2, RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { motion, AnimatePresence } from 'framer-motion';
import { formatColombiaDate } from '@/lib/dateUtils';
import { VECY_VERSION_LABEL } from '@/const';

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

function extractItemImages(item: any): string[] {
  if (!item) return [];
  const urls: string[] = [];
  if (Array.isArray(item.images)) {
    for (const img of item.images) {
      if (typeof img === 'string' && (img.startsWith('http') || img.startsWith('/'))) urls.push(img);
    }
  }
  if (item.imageUrl && typeof item.imageUrl === 'string' && (item.imageUrl.startsWith('http') || item.imageUrl.startsWith('/'))) {
    if (!urls.includes(item.imageUrl)) urls.push(item.imageUrl);
  }
  const text = `${item.rawText || ''} ${item.description || ''}`;
  const imgMatches = text.match(/https?:\/\/[^\s<"']+\.(?:jpg|jpeg|png|webp|gif)/gi);
  if (imgMatches) {
    for (const m of imgMatches) {
      if (!urls.includes(m)) urls.push(m);
    }
  }
  return urls;
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
  const SUB_CALIFICADORES = ["alta", "alto", "baja", "bajo", "norte", "sur", "oriental", "occidental", "reservado", "i ", "ii ", "iii "];

  const normalizeBarrio = (s: string) =>
    (s || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");

  // Emparejamiento exacto de barrio con detección de sub-calificadores
  const matchBarrioExacto = (req: string, prop: string): boolean => {
    const rn = normalizeBarrio(req);
    const pn = normalizeBarrio(prop);
    if (!rn || !prop) return false;
    // Coincidencia exacta
    if (rn === pn) return true;
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

  const reqBarrioDisplay = cleanBarrioValue(reqBarrioRaw, req.addressCity || req.ciudadDeseada);
  const propBarrioDisplay = cleanBarrioValue(propBarrioRaw, prop.addressCity || prop.city);
  const reqLocalityDisplay = req.addressLocality || "N/E";
  const propLocalityDisplay = prop.addressLocality || "N/E";
  const reqCityDisplay = req.addressCity || req.ciudadDeseada || "Bogotá";
  const propCityDisplay = prop.addressCity || prop.city || "Bogotá";

  // A. Ciudad / Municipio — FILTRO DURO BINARIO
  const isCityMatch =
    normalizeBarrio(reqCityDisplay) === normalizeBarrio(propCityDisplay) ||
    normalizeBarrio(reqCityDisplay).includes(normalizeBarrio(propCityDisplay)) ||
    normalizeBarrio(propCityDisplay).includes(normalizeBarrio(reqCityDisplay));

  // B. Localidad / Comuna — BINARIO (solo coincide si ambos tienen valor y son iguales)
  const bothLocalityKnown = reqLocalityDisplay !== "N/E" && propLocalityDisplay !== "N/E";
  const isLocalityMatch = !bothLocalityKnown ||
    normalizeBarrio(reqLocalityDisplay) === normalizeBarrio(propLocalityDisplay) ||
    normalizeBarrio(reqLocalityDisplay).includes(normalizeBarrio(propLocalityDisplay)) ||
    normalizeBarrio(propLocalityDisplay).includes(normalizeBarrio(reqLocalityDisplay));

  // REGLA DOCTRINAL v22.1: Si el match aparece en pantalla, YA PASÓ todos los
  // filtros duros del backend. Las 3 filas geográficas SIEMPRE muestran "Coincide".
  // "Fallido" o "No Cumple" es IMPOSIBLE aquí — ese match no existiría en BD.

  // A. Barrio / Vereda / Caserío
  add(
    "Barrio / Vereda / Caserío",
    reqBarrioDisplay,
    propBarrioDisplay,
    "exact",
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


  // ── DESAMBIGUACIÓN FINANCIERA TRIPARTITA (Doctrinal v22.4) ──
  // Reemplaza Presupuesto Máx. genérico con 3 filas financieras independientes:
  // 1. Precio de Venta (N/E para arriendos puros)
  // 2. Precio de Arriendo / Canon (N/E para ventas puras)
  // 3. Cuota de Administración (N/E si no aplica o si es duplicado absurdo del canon)

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
    if (isPhoneNumberNotPrice(num, rawText)) return 0; // Rechazo absoluto de números telefónicos
    return num;
  };

  const reqTextLower = (req.rawText || "").toLowerCase();
  const propTextLower = (prop.rawText || prop.description || "").toLowerCase();

  const isReqRentMatch = reqNeg.toLowerCase().includes("arriendo");
  const isPropPureRent = (prop.transactionType || "").toLowerCase() === "arriendo" || (prop.transactionType || "").toLowerCase() === "arriendo_temporal";
  const isPropPureVenta = (prop.transactionType || "").toLowerCase() === "venta";

  // A. PRECIO DE VENTA
  let propSalePrice = !isPropPureRent ? parseSafePrice(prop.price, prop.rawText) : 0;
  let reqSaleBudget = (!isReqRentMatch && !isPropPureRent) ? parseSafePrice(req.presupuestoMax, req.rawText) : 0;

  // Si propSalePrice < 30.000.000 (ej. $9.900.000 canon de arriendo en Nogal), NO ES PRECIO DE VENTA.
  if (propSalePrice < 30_000_000) {
    propSalePrice = 0; // Cero absoluto de venta
  }

  const reqSaleLabel = reqSaleBudget > 0 ? formatCOP(reqSaleBudget) : "N/E";
  const propSaleLabel = propSalePrice >= 30_000_000 ? formatCOP(propSalePrice) : "N/E";

  let saleS: MatchStatus = "neutral";
  if (reqSaleBudget > 0 && propSalePrice > 0) {
    saleS = propSalePrice <= reqSaleBudget ? "exact" : "warn";
  }

  add(
    "Precio de Venta",
    reqSaleLabel,
    propSaleLabel,
    saleS,
    15,
    <DollarSign className="w-3.5 h-3.5" />
  );

  // B. PRECIO DE ARRIENDO / CANON
  let propRentPrice = !isPropPureVenta ? parseSafePrice(prop.rentPrice || prop.priceRent, prop.rawText) : 0;
  let reqRentBudget = isReqRentMatch ? parseSafePrice(req.presupuestoMax, req.rawText) : 0;

  // Si la propiedad es de arriendo y rentPrice estaba en 0, pero prop.price tenía el canon (ej. $9.900.000)
  if (propRentPrice <= 0 && parseSafePrice(prop.price, prop.rawText) > 0 && parseSafePrice(prop.price, prop.rawText) < 100_000_000) {
    propRentPrice = parseSafePrice(prop.price, prop.rawText);
  }

  const reqRentLabel = reqRentBudget > 0 ? `${formatCOP(reqRentBudget)} / mes` : "N/E";
  const propRentLabel = propRentPrice > 0 ? `${formatCOP(propRentPrice)} / mes` : "N/E";

  let rentS: MatchStatus = "neutral";
  if (reqRentBudget > 0 && propRentPrice > 0) {
    rentS = propRentPrice <= reqRentBudget ? "exact" : "warn";
  }

  add(
    "Precio de Arriendo / Canon",
    reqRentLabel,
    propRentLabel,
    rentS,
    15,
    <Receipt className="w-3.5 h-3.5" />
  );

  // C. CUOTA DE ADMINISTRACIÓN
  let reqAdminMax = parseSafePrice(req.adminFeeMax, req.rawText);
  let propAdminFee = parseSafePrice(prop.adminFee, prop.rawText);

  // SANIDAD FINANCIERA DOCTRINAL:
  // La cuota de administración JAMÁS puede ser igual al canon de arriendo ni al precio de venta.
  // Si propAdminFee === propRentPrice o propAdminFee >= propRentPrice * 0.45 -> Queda N/E (0)
  if (propAdminFee > 0) {
    if (
      (propRentPrice > 0 && (propAdminFee === propRentPrice || propAdminFee >= propRentPrice * 0.45)) ||
      (propSalePrice > 0 && (propAdminFee === propSalePrice || propAdminFee >= propSalePrice * 0.20))
    ) {
      propAdminFee = 0; // Rechazar paridad o duplicación absurda -> Queda N/E
    }
  }

  const reqAdminLabel = reqAdminMax > 0 ? `≤ ${formatCOP(reqAdminMax)}` : "N/E";
  const propAdminLabel = propAdminFee > 0 ? `${formatCOP(propAdminFee)} / mes` : "N/E";

  let adminS: MatchStatus = "neutral";
  if (reqAdminMax > 0 && propAdminFee > 0) {
    adminS = propAdminFee <= reqAdminMax ? "exact" : "warn";
  }

  add(
    "Cuota de Administración",
    reqAdminLabel,
    propAdminLabel,
    adminS,
    5,
    <Receipt className="w-3.5 h-3.5" />
  );


  // 5. Área Total (con inferencia desde rawText si la columna está en 0)
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
    if (areaP < areaR * 0.95)        areS = "warn"; // Área por debajo del mínimo → Aproximado
    else if (areaP > areaR * 1.15)   { areS = "warn"; areaPropLabel = `${areaP} m² ⚠️ (+${Math.round((areaP/areaR-1)*100)}% más grande)`; }
    else                              areS = "exact";
  } else if (areaR === 0) {
    areS = "neutral";
  }
  const reqAreaLabel = areaR > 0 ? `≥ ${areaR} m² (±15%)` : "N/E";

  add(
    "Área Total",
    reqAreaLabel,
    areaPropLabel,
    areS,
    10,
    <Ruler className="w-3.5 h-3.5" />
  );

  // 6. Habitaciones
  let bedR = req.habitacionesMin ? Number(req.habitacionesMin) : 0;
  let bedInferred = false;
  if (bedR <= 0 && reqTextLower) {
    const m = reqTextLower.match(/(\d+(?:\s*-\s*\d+)?)\s*(?:hab|habitaciones|alcoba|alcobas|alc|dormitorio)/i);
    if (m) { bedR = parseInt(m[1].split("-")[0].trim(), 10); bedInferred = true; }
  }
  let bedP = prop.bedrooms ? Number(prop.bedrooms) : 0;
  if (bedP <= 0 && propTextLower) {
    const mP = propTextLower.match(/(\d+)\s*(?:hab|habitaciones|alcoba|alcobas|alc|dormitorio)/i);
    if (mP) bedP = parseInt(mP[1], 10);
  }

  let bedS: MatchStatus = "neutral";
  if (bedR > 0) {
    if (bedP < bedR) {
      bedS = "warn"; // Menos habitaciones → Aproximado
    } else if (bedP > bedR) {
      bedS = "warn"; // Más habitaciones → Aproximado
    } else {
      bedS = "exact";
    }
  }
  const reqBedLabel = bedR > 0 
    ? `${bedR} hab.${bedInferred ? " (Inferido 🔍)" : ""}` 
    : "N/E";

  add(
    "Habitaciones", 
    reqBedLabel, 
    bedP > 0 ? `${bedP} hab.` : "N/E", 
    bedS, 
    8, 
    <Bed className="w-3.5 h-3.5" />
  );

  // 7. Baños
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
  if (bathR > 0) {
    if (bathP < bathR) {
      bathS = "warn"; // Menos baños → Aproximado
    } else if (bathP > bathR) {
      bathS = "warn"; // Más baños → Aproximado
    } else {
      bathS = "exact";
    }
  }
  const reqBathLabel = bathR > 0 
    ? `≥ ${bathR} baño${bathR > 1 ? "s" : ""}${bathInferred ? " (Inferido 🔍)" : ""}` 
    : "N/E";

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

  // 8. Parqueaderos (con inferencia desde rawText para oferta y demanda)
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

  if (garR > 0) {
    if (garP < garR) {
      garS = "warn"; // Menos garajes → Aproximado
    } else if (reqWantsIndep && garType === "lineal") {
      garS = "warn";
    } else {
      garS = "exact";
    }
  }
  const garReqLabel = garR > 0
    ? `≥ ${garR} ${reqWantsIndep ? "(Indep.)" : "garaje"}${garR > 1 ? "s" : ""}${garInferred ? " (Inferido 🔍)" : ""}`
    : "N/E";

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
  const estratoP = prop.stratum || prop.estrato;
  const hasEstratoReq = estratoArr.length > 0 && estratoArr[0] > 0;
  let estS: MatchStatus = "neutral";
  if (hasEstratoReq) {
    estS = (estratoP && estratoArr.includes(Number(estratoP))) ? "exact" : "warn";
  }
  const reqEstratoLabel = hasEstratoReq ? `Estrato ${estratoArr.join(", ")}` : "N/E";
  add(
    "Estrato", 
    reqEstratoLabel, 
    (estratoP && Number(estratoP) > 0) ? `Estrato ${estratoP}` : "N/E", 
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
    const mPropAge = propTextLower.match(/(?:edificio\s*de|antigüedad|antiguedad|tiene)\s*(\d{1,2})\s*años/i)
                  || propTextLower.match(/(\d{1,2})\s*años\s*(?:de\s*)?(?:antigüedad|construido)/i);
    if (mPropAge) ageP = parseInt(mPropAge[1], 10);
  }

  let ageS: MatchStatus = "neutral";
  if (ageR > 0 && ageP >= 0) {
    if (ageP <= ageR) ageS = "exact";
    else ageS = "warn"; // Antigüedad supera máximo → Aproximado (no es bloqueante)
  }

  const reqAgeLabel = ageR > 0 ? `≤ ${ageR} años de construcción` : "N/E";
  const propAgeLabel = ageP >= 0
    ? (ageP === 0 ? "🏗️ Obra nueva" : `${ageP} años${prop.yearBuilt ? ` (${prop.yearBuilt})` : ""}`)
    : "N/E";

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
  }
  add(
    "Permuta / Pago",
    reqPermuta ? "Acepta Permuta / Parte de pago" : "N/E",
    propPermuta ? "Acepta Permuta / Recibe menor valor" : "Venta Directa / Tradicional",
    permutaS,
    5,
    <SlidersHorizontal className="w-3.5 h-3.5" />
  );

  // 13. Cocina & Acabados
  const propCocina = prop.kitchenType || (propRawText.includes("isla") ? "Abierta tipo Isla" : propRawText.includes("integral") ? "Integral" : propRawText.includes("abierta") ? "Abierta" : "N/E");
  const reqCocina = reqTextLower.includes("isla") ? "Abierta tipo Isla" : reqTextLower.includes("abierta") ? "Abierta" : "Cualquiera";
  let cocinaS: MatchStatus = "neutral";
  if (reqCocina !== "Cualquiera") {
    cocinaS = propCocina.toLowerCase().includes(reqCocina.toLowerCase()) ? "exact" : "warn";
  }
  add(
    "Cocina & Acabados",
    reqCocina !== "Cualquiera" ? reqCocina : "N/E",
    propCocina,
    cocinaS,
    4,
    <Sparkles className="w-3.5 h-3.5" />
  );

  // 14. Balcón, Terraza & Vista
  const propBalcon = propRawText.includes("balcon") || propRawText.includes("balcón") || prop.hasBalcony;
  const propTerraza = propRawText.includes("terraza") || prop.hasTerrace;
  const reqBalcon = reqTextLower.includes("balcon") || reqTextLower.includes("balcón") || reqTextLower.includes("terraza");
  let extSpaceS: MatchStatus = "neutral";
  if (reqBalcon) {
    extSpaceS = (propBalcon || propTerraza) ? "exact" : "warn";
  }
  add(
    "Balcón / Terraza",
    reqBalcon ? "Exige Balcón o Terraza" : "N/E",
    propTerraza ? "Sí (Con Terraza)" : propBalcon ? "Sí (Con Balcón)" : "Sin balcón especificado",
    extSpaceS,
    5,
    <Ruler className="w-3.5 h-3.5" />
  );

  // 15. Equipamiento & Seguridad
  const propAscensor = propRawText.includes("ascensor") || prop.hasElevator;
  const propConjunto = propRawText.includes("club house") || propRawText.includes("gimnasio") || propRawText.includes("piscina") || propRawText.includes("conjunto");
  const reqAscensor = reqTextLower.includes("ascensor");
  let equipS: MatchStatus = "neutral";
  if (reqAscensor) {
    equipS = propAscensor ? "exact" : "warn";
  }

  add(
    "Equipamiento Edificio",
    reqAscensor ? "Con Ascensor obligatorio" : "N/E",
    propAscensor && propConjunto ? "Ascensor + Club House / Zonas Comunes" : propAscensor ? "Con Ascensor" : "Edificio convencional / Sin ascensor",
    equipS,
    6,
    <Building2 className="w-3.5 h-3.5" />
  );

  // 16. Depósito / Bodega Interna
  const reqStorage = reqTextLower.includes("deposito") || reqTextLower.includes("depósito") || reqTextLower.includes("bodega interna") || reqTextLower.includes("cuarto util") || reqTextLower.includes("cuarto útil");
  const propStorage = propRawText.includes("deposito") || propRawText.includes("depósito") || propRawText.includes("bodega") || propRawText.includes("cuarto util") || propRawText.includes("cuarto útil") || prop.hasStorage;
  let storageS: MatchStatus = "neutral";
  if (reqStorage) {
    storageS = propStorage ? "exact" : "warn"; // No tiene depósito → Aproximado (puede negociarse)
  }
  add(
    "Depósito / Cuarto Útil",
    reqStorage ? "Exige Depósito / Cuarto Útil" : "N/E",
    propStorage ? "Sí (Con Depósito)" : "Sin depósito especificado",
    storageS,
    4,
    <Building2 className="w-3.5 h-3.5" />
  );

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


  // REGLA DOCTRINAL v22.1: Los campos blandos nunca producen "Falla".
  // Solo los 5 campos duros pueden bloquear un match (lo hacen en el backend).
  // Si el match aparece en pantalla, el score VECY es la fuente de verdad.
  const autoScore = max > 0 ? Math.round((pts / max) * 100) : 0;
  return { rows, autoScore };
}

function formatCOP(val: string | number) {
  const num = parseFloat(String(val));
  if (isNaN(num) || num === 0) return "N/E";
  return num.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
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

function extractPhoneFromItem(item: any): { display: string; cleanNumber: string | null; name: string | null } {
  if (!item) return { display: "Número no disponible", cleanNumber: null, name: null };

  const senderName = item.nombreUsuarioWhatsapp || item.pushName || item.user?.name || null;

  // 1. Revisar candidatos directos
  const candidates = [
    item.idUsuarioWhatsapp,
    item.contactPhone,
    item.brokerPhone,
    item.phone,
    item.usuarioWhatsapp,
    item.contactNumber,
    item.sellerPhone,
    item.captadorPhone,
    item.user?.phone,
    item.user?.idUsuarioWhatsapp,
    item.user?.contactPhone
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
  const urlRegex = /(https?:\/\/[^\s]+|wa\.me\/[^\s]+|whatsapp\.com\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      const href = part.startsWith("http") ? part : `https://${part}`;
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 underline font-semibold break-all inline-flex items-center gap-1 my-0.5"
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
  const [minScore, setMinScore] = React.useState('80');
  const [activeTab, setActiveTab] = React.useState<'calificados' | 'incompletos'>('calificados');
  
  // Estados para Edición Interactiva de Fichas Prediales directamente desde el Cotejo
  const [editingMatchId, setEditingMatchId] = React.useState<number | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editForm, setEditForm] = React.useState<Record<string, any>>({});

  const updatePropMut = trpc.janIA.updatePropertyDetails.useMutation();
  const updateReqMut = trpc.janIA.updateRequirementDetails.useMutation();
  const recalculateMatchMut = trpc.janIA.recalculateMatchForPair.useMutation();

  const handleStartEdit = (m: any) => {
    if (editingMatchId === m.id) {
      setEditingMatchId(null);
      setEditForm({});
      return;
    }

    setEditingMatchId(m.id);
    setEditForm({
      // Oferta (Inmueble)
      propPrice: m.property?.price || '',
      propRentPrice: m.property?.rentPrice || '',
      propAdminFee: m.property?.adminFee || '',
      propArea: m.property?.areaTotal || m.property?.areaPrivate || '',
      propBedrooms: m.property?.bedrooms ?? '',
      propBathrooms: m.property?.bathrooms ?? '',
      propGarages: m.property?.garages ?? '',
      propStratum: m.property?.stratum ?? '',
      propZone: m.property?.zone || m.property?.addressNeighborhood || '',
      propCity: m.property?.city || 'Bogotá',
      propPhone: m.property?.idUsuarioWhatsapp || m.property?.phone || m.property?.contactPhone || '',

      // Demanda (Requerimiento)
      reqBudget: m.requirement?.presupuestoMax || '',
      reqAdminMax: m.requirement?.adminFeeMax || '',
      reqArea: m.requirement?.areaMin || '',
      reqBedrooms: m.requirement?.habitacionesMin ?? '',
      reqBathrooms: m.requirement?.banosMin ?? '',
      reqGarages: m.requirement?.parqueaderosMin ?? '',
      reqStratum: m.requirement?.estratoDeseado ?? '',
      reqZone: m.requirement?.zonaDeseada || m.requirement?.addressNeighborhood || '',
      reqCity: m.requirement?.ciudadDeseada || 'Bogotá',
      reqPhone: m.requirement?.idUsuarioWhatsapp || m.requirement?.phone || m.requirement?.contactPhone || '',
    });
  };

  const handleOnlySave = async (m: any) => {
    setIsSaving(true);
    try {
      if (m.property?.id) {
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
          city: editForm.propCity ? String(editForm.propCity) : undefined,
        });
      }

      if (m.requirement?.id) {
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
        });
      }

      toast.success("💾 Cambios guardados en Supabase", {
        description: "Los datos prediales actualizados han sido almacenados con éxito."
      });
    } catch (err: any) {
      toast.error("Error al guardar en Supabase", {
        description: err.message || "No se pudieron actualizar los datos."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecalculateMatch = async (m: any) => {
    setIsSaving(true);
    try {
      await handleOnlySave(m);
      if (m.property?.id || m.requirement?.id) {
        await recalculateMatchMut.mutateAsync({
          propertyId: m.property?.id || undefined,
          requirementId: m.requirement?.id || undefined,
        });
      }
      toast.success("⚡ Match recalculado en vivo", {
        description: "Re-evaluando afinidad comercial con la base de datos completa..."
      });
      setEditingMatchId(null);
      setEditForm({});
      refetch();
    } catch (err: any) {
      console.error("[RecalculateMatch] Error:", err);
      toast.error("Error recalculando match", { description: err.message || "Intenta nuevamente." });
    } finally {
      setIsSaving(false);
    }
  };

  // Fetch matches directly from server API with auto-refresh every 10s
  const { data: matches = [], isLoading, refetch } = trpc.janIA.getAllMatches.useQuery(undefined, {
    refetchInterval: 10000,
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

  const filteredMatches = useMemo(() => {
    const seenMatchIds = new Set<number>();
    const seenPairs = new Set<string>();
    const minVal = parseFloat(minScore);

    return matches.filter(match => {
      if (!match || !match.id) return false;

      const scoreNum = parseFloat(String(match.matchScore || "0"));
      if (minScore === "80_94") {
        if (scoreNum < 80 || scoreNum >= 95) return false;
      } else {
        const minVal = parseFloat(minScore);
        if (scoreNum < minVal) return false;
      }

      if (seenMatchIds.has(match.id)) return false;
      
      const pId = match.property?.id;
      const rId = match.requirement?.id;
      if (pId && rId) {
        const pairKey = `${pId}-${rId}`;
        if (seenPairs.has(pairKey)) return false;
        seenPairs.add(pairKey);
      }

      seenMatchIds.add(match.id);

      const property = match.property || {};
      const requirement = match.requirement || {};
      
      const propSearchStr = `${property.name} ${property.city} ${property.zone} ${property.idUsuarioWhatsapp}`.toLowerCase();
      const reqSearchStr = `${requirement.name} ${requirement.ciudadDeseada} ${requirement.zonaDeseada} ${requirement.idUsuarioWhatsapp}`.toLowerCase();
      
      const matchesSearch = !searchTerm || propSearchStr.includes(searchTerm.toLowerCase()) || 
                            reqSearchStr.includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Verificar que los filtros duros obligatorios (Negocio, Tipo Inmueble, Ubicación, Presupuesto) no hayan fallado
      const { rows } = scoreRows(requirement, property);
      const hardRows = rows.filter(r => 
        r.label === "Tipo de Inmueble" || 
        r.label === "Tipo de Negocio" || 
        r.label === "Ubicación / Barrio" ||
        r.label === "Presupuesto Máx."
      );
      const hardFailed = hardRows.some(r => r.status === "missing");
      if (hardFailed) return false;

      return true;
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950 p-6 border border-white/10 rounded-3xl">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#bf953f] animate-pulse" />
            Reporte de Coincidencias (Matches de JanIA)
          </h2>
          <p className="text-zinc-500 text-sm mt-1 flex items-center gap-2">
            <span>{isLoading ? 'Cargando coincidencias...' : `Coincidencias Verificadas: ${filteredMatches.length} matches (80% - 100%)`}</span>
            <span className="text-[10px] bg-[#bf953f]/20 text-[#bf953f] border border-[#bf953f]/30 px-2 py-0.5 rounded-full font-mono font-extrabold ml-2">
              {VECY_VERSION_LABEL}
            </span>
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
            <option className="bg-[#0c0c0c]" value="80">⚡ Todos los Matches Validados (80% - 100%)</option>
            <option className="bg-[#0c0c0c]" value="80_94">⚡ MATCH Aproximado (80% - 94%)</option>
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
        <div className="grid grid-cols-1 gap-6">
          <AnimatePresence>
            {filteredMatches.map((m, idx) => {
              const isEditingThisCard = editingMatchId === m.id;

              const effectiveProp = isEditingThisCard ? {
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
              } : m.property;

              const effectiveReq = isEditingThisCard ? {
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
              } : m.requirement;

              const { rows, autoScore } = scoreRows(effectiveReq, effectiveProp);
              const score = isEditingThisCard ? autoScore : parseFloat(m.matchScore?.toString() || "0");
              const date = formatColombiaDate(m.createdAt);

              const exactCount = rows.filter(r => r.status === "exact" || r.status === "ok").length;
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
                  <div className="bg-white/[0.01] px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/5">
                    <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                      <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                      <span className={`text-lg sm:text-xl font-extrabold tracking-tight ${scoreColor}`}>{score.toFixed(0)}% Match</span>
                      <span className="text-zinc-500 text-[11px] sm:text-xs">Afinidad registrada por IA</span>
                      {score >= 95 ? (
                        <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                          🎯 MATCH PERFECTO (95% - 100%)
                        </span>
                      ) : (
                        <span className="text-[9px] bg-[#bf953f]/10 border border-[#bf953f]/30 text-[#bf953f] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                          ⚡ MATCH APROXIMADO (80% - 94%)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
                      <button
                        onClick={() => handleStartEdit(m)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${
                          isEditingThisCard 
                            ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40' 
                            : 'bg-[#bf953f]/15 hover:bg-[#bf953f]/25 text-[#bf953f] border border-[#bf953f]/30'
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        {isEditingThisCard ? 'Cancelar Edición' : '✏️ Editar Fichas (Completar N/E)'}
                      </button>

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
                      <div className="text-xs text-zinc-300 bg-white/[0.02] border border-white/5 p-3 rounded-xl leading-relaxed whitespace-pre-wrap break-words space-y-3">
                        {(() => {
                          const pText = (m.property?.rawText || m.property?.description || "").trim();
                          return pText ? (
                            <div className="space-y-1">
                              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold not-italic">💬 Publicación Original:</p>
                              <p className="italic text-zinc-200">"{renderTextWithClickableLinks(pText)}"</p>
                            </div>
                          ) : null;
                        })()}



                        {/* Enlace Público Original Simple en Azul */}
                        {(() => {
                          const origUrl = extractPublicLink(m.property);
                          if (!origUrl) return null;
                          return (
                            <div className="mt-2 pt-2 border-t border-white/5 text-xs not-italic flex items-center gap-1.5 flex-wrap">
                              <span className="text-zinc-400 font-semibold">🌐 Enlace original:</span>
                              <a 
                                href={origUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-400 hover:text-blue-300 font-medium underline break-all"
                                title={origUrl}
                              >
                                {origUrl}
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
                        return (
                          <div className="bg-[#bf953f]/5 border border-[#bf953f]/10 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-[#bf953f]/10 border border-[#bf953f]/20 flex items-center justify-center text-[#bf953f] flex-shrink-0">
                                <Phone className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Captador / Vendedor</p>
                                <p className="text-xs font-bold text-zinc-200 select-all">{propContact.display}</p>
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
                                  className="bg-[#25D366] hover:bg-[#20ba5a] text-black text-[10px] font-bold px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md hover:scale-105 min-h-[38px] w-full sm:w-auto"
                                >
                                  Contactar WA <ExternalLink className="w-3 h-3" />
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
                      <div className="text-xs text-zinc-300 bg-white/[0.02] border border-white/5 p-3 rounded-xl leading-relaxed whitespace-pre-wrap break-words space-y-3">
                        {(() => {
                          const rText = (m.requirement?.rawText || "").trim();
                          return rText ? (
                            <div className="space-y-1">
                              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold not-italic">💬 Solicita:</p>
                              <p className="italic text-zinc-200">"{renderTextWithClickableLinks(rText)}"</p>
                            </div>
                          ) : null;
                        })()}



                        {/* Enlace Público Original Simple en Azul */}
                        {(() => {
                          const origReqUrl = extractPublicLink(m.requirement);
                          if (!origReqUrl) return null;
                          return (
                            <div className="mt-2 pt-2 border-t border-white/5 text-xs not-italic flex items-center gap-1.5 flex-wrap">
                              <span className="text-zinc-400 font-semibold">🌐 Enlace original:</span>
                              <a 
                                href={origReqUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-400 hover:text-blue-300 font-medium underline break-all"
                                title={origReqUrl}
                              >
                                {origReqUrl}
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
                        return (
                          <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 flex-shrink-0">
                                <Phone className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Requiriente / Comprador</p>
                                <p className="text-xs font-bold text-zinc-200 select-all">{reqContact.display}</p>
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
                                  className="bg-[#25D366] hover:bg-[#20ba5a] text-black text-[10px] font-bold px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md hover:scale-105 min-h-[38px] w-full sm:w-auto"
                                >
                                  Contactar WA <ExternalLink className="w-3 h-3" />
                                </a>
                              );
                            })()}
                          </div>
                        );
                      })()}
                    </div>

                  </div>

                  {/* COTEJO DETALLADO CAMPO POR CAMPO (RESPONSIVE: TABLA EN DESKTOP, TARJETAS EN MÓVIL) */}
                  <div className="bg-black/30 border-b border-white/5 p-3 sm:p-4 md:p-6 overflow-x-hidden">
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
                            const isWarn = row.status === "warn";
                            const isNeutral = row.status === "neutral";
                            
                            const badgeBg = isExact 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                              : isWarn 
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                                : "bg-zinc-800 text-zinc-400 border border-zinc-700/50";
                            
                            const badgeText = isExact ? "Coincide" : isWarn ? "Aproximado" : "Dato Pendiente";

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

                              if (cleanLbl.includes('teléfono') || cleanLbl.includes('contacto')) {
                                return isOffer ? (
                                  <input
                                    type="text"
                                    placeholder="Ej: +57 310 123 4567"
                                    value={editForm.propPhone || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propPhone: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Ej: +57 310 123 4567"
                                    value={editForm.reqPhone || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqPhone: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  />
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
                        const isWarn = row.status === "warn";
                        const isNeutral = row.status === "neutral";
                        
                        const badgeBg = isExact 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : isWarn 
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                            : "bg-zinc-800 text-zinc-400 border border-zinc-700/50";
                        
                        const badgeText = isExact ? "Coincide" : isWarn ? "Aproximado" : "Dato Pendiente";

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
                          if (cleanLbl.includes('teléfono') || cleanLbl.includes('contacto')) {
                            return isOffer ? (
                              <input type="text" placeholder="Ej: +57 310 123 4567" value={editForm.propPhone || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propPhone: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="text" placeholder="Ej: +57 310 123 4567" value={editForm.reqPhone || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqPhone: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
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

                  {/* Justificación de la IA */}
                  {m.matchReason && (
                    <div className="p-4 sm:p-6 bg-white/[0.01] text-xs text-zinc-400 leading-relaxed">
                      <span className="font-bold text-zinc-300 block mb-1">Razón de afinidad de la IA:</span>
                      "{m.matchReason}"
                    </div>
                  )}

                  {/* BARRA DE EDICIÓN FLOTANTE / STICKY EN EL FOOTER DE LA TARJETA */}
                  {isEditingThisCard && (
                    <div className="sticky bottom-0 z-30 bg-gradient-to-r from-emerald-950 via-zinc-900 to-emerald-950 border-t border-emerald-500/40 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl rounded-b-3xl">
                      <div className="flex items-center gap-2.5 text-emerald-400 text-xs font-semibold">
                        <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
                        <span>
                          Modo Edición Activo: Puedes usar <strong>Guardar Cambios</strong> para almacenar en Supabase, o <strong>Recalcular Match</strong> para buscar de inmediato una nueva pareja.
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto shrink-0 justify-end">
                        <Button
                          onClick={() => { setEditingMatchId(null); setEditForm({}); }}
                          variant="outline"
                          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs h-10 px-3 min-h-[44px]"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={() => handleOnlySave(m)}
                          disabled={isSaving}
                          className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs h-10 px-3.5 shadow-md min-h-[44px] flex items-center justify-center gap-1.5"
                        >
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          💾 Guardar Cambios
                        </Button>
                        <Button
                          onClick={() => handleRecalculateMatch(m)}
                          disabled={isSaving}
                          className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs h-10 px-4 shadow-lg shadow-emerald-500/20 min-h-[44px] flex items-center justify-center gap-1.5"
                        >
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          ⚡ Recalcular Match (Buscar Nueva Pareja)
                        </Button>
                      </div>
                    </div>
                  )}

                </motion.div>
              );
            })}
          </AnimatePresence>
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
