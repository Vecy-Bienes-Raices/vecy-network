import React, { useMemo } from 'react';
import { 
  Phone, MapPin, Search, Download, Building2, Calendar, 
  Sparkles, CheckCircle2, AlertTriangle, XCircle, SlidersHorizontal, 
  DollarSign, Ruler, Bed, Bath, Car, Shield, ExternalLink, Receipt, Box
} from 'lucide-react';
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
  if (item.externalUrl && (item.externalUrl.startsWith("http://") || item.externalUrl.startsWith("https://"))) {
    return item.externalUrl;
  }
  const text = `${item.rawText || ''} ${item.description || ''} ${item.externalUrl || ''}`;
  const match = text.match(/https?:\/\/[^\s<"']+/i);
  if (match) return match[0];
  
  // Expresión para enlaces inmobiliarios comunes sin protocolo http/https
  const domainMatch = text.match(/(?:[a-zA-Z0-9-]+\.)+(?:com|co|net|org|app|io|tools|store)\/[^\s<"']+/i);
  if (domainMatch) return `https://${domainMatch[0]}`;

  return null;
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

  const ciudadMatch = !reqCiudad || propCiudad.includes(reqCiudad) || reqCiudad.includes(propCiudad) || reqCiudad === "colombia";
  const zonaMatch = !reqZona || propZona.includes(reqZona) || reqZona.includes(propZona) || reqZona.includes("aledaños") || reqZona.includes("aledanos");
  
  let geoStatus: MatchStatus = (ciudadMatch && zonaMatch && !isOutStreetBounds) ? "exact" : ciudadMatch ? "warn" : "missing";
  
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

  let propZoneLabel = formatZoneLabel(prop.zone || "", prop.city || "Bogotá");
  
  if (isOutStreetBounds) {
    geoStatus = "missing";
    propZoneLabel += ` ❌ (Fuera de Perímetro: ${boundaryLabel})`;
  } else if (isDiffSubBarrio && !reqZona.includes("aledanos") && !reqZona.includes("aledaños")) {
    geoStatus = "missing";
    propZoneLabel += " ❌ (Diferente Sub-barrio)";
  }

  const reqZoneLabel = formatZoneLabel(req.zonaDeseada || "", req.ciudadDeseada || "Bogotá");

  add(
    "Ubicación / Barrio", 
    reqZoneLabel, 
    propZoneLabel, 
    geoStatus, 
    20, 
    <MapPin className="w-3.5 h-3.5" />
  );

  // 4. Presupuesto Máx.
  let propPrice = parseFloat(prop.price || "0");
  let propRentPrice = parseFloat(prop.rentPrice || prop.priceRent || "0");
  const isDualOffer = isPropertyDualOffer(prop);
  const isReqRentMatch = reqNeg.toLowerCase().includes("arriendo");

  // Sanidad Predial de Precios: Para venta, si propPrice < 30.000.000 (ej. $1.200.000), extraer el precio de venta real del rawText (ej. $950.000.000)
  if (!isReqRentMatch && propPrice > 0 && propPrice < 30_000_000 && prop.rawText) {
    const rawP = prop.rawText.toLowerCase();
    const saleMatch = rawP.match(/(?:v\/venta\/|precio\s*(?:de\s*)?venta|venta)\s*:?\s*\$?([\d.,]+)\s*(mil\s*millones?|millones?|m|M)?/i)
                   || rawP.match(/venta\/.*?\$?\s*([\d.]{7,12})/i);
    if (saleMatch) {
      let rawNum = parseFloat(saleMatch[1].replace(/\./g, "").replace(/,/g, ""));
      const unitStr = (saleMatch[2] || "").toLowerCase();
      const mult = unitStr.includes("mil millon") ? 1_000_000_000
        : unitStr.includes("millon") || unitStr === "m" ? 1_000_000
        : rawNum < 10_000 ? 1_000_000 : 1;
      let valP = rawNum * mult;
      if (!isNaN(valP) && valP >= 30_000_000) {
        propPrice = valP; // Corregir propPrice a $950.000.000
      }
    }
  }

  // Fallback de extracción de canon de arriendo si rentPrice = 0
  if (propRentPrice <= 0 && prop.rawText) {
    const rawP = prop.rawText.toLowerCase();
    const matchRentP = rawP.match(/(?:arriendo|canon|renta)\s*:?\s*\$?([\d.,]+)\s*(millones|millón|m|M)?/i);
    if (matchRentP) {
      let valP = parseFloat(matchRentP[1].replace(/\./g, "").replace(/,/g, ""));
      if (!isNaN(valP)) {
        if (valP < 1000) valP *= 1000000;
        propRentPrice = valP;
      }
    }
  }

  // 4. Presupuesto Máximo (con inferencia por regex de Ppto hasta $950 -> $950.000.000)
  const reqTextLower = (req.rawText || "").toLowerCase();
  const propTextLower = (prop.rawText || prop.description || "").toLowerCase();

  let budget = req.presupuestoMax ? parseFloat(String(req.presupuestoMax)) : 0;
  let budgetInferred = false;
  if (budget <= 0 && reqTextLower) {
    const mP = reqTextLower.match(/(?:ppto|presupuesto|busco|máximo|max|hasta|canon|valor)\s*:?\s*\$?([\d.]+)\s*(millones|millón|mll|mlls|mm|m|M)?/i)
            || reqTextLower.match(/\$?\s*([\d.]+)\s*(millones|millón|mll|mlls|mm|m|M)\b/i);
    if (mP) {
      let valR = parseFloat(mP[1].replace(/\./g, ""));
      if (!isNaN(valR)) {
        if (valR < 1000) valR *= 1_000_000;
        budget = valR;
        budgetInferred = true;
      }
    }
  }

  let effectivePropPrice: number;
  let propPriceLabel: string;

  if (isReqRentMatch) {
    effectivePropPrice = propRentPrice > 0 ? propRentPrice : (propPrice > 0 && propPrice < 100_000_000 ? propPrice : 0);
    if (effectivePropPrice > 0) {
      propPriceLabel = `Canon: ${formatCOP(String(effectivePropPrice))} / mes`;
      if (isDualOffer && propPrice > 0 && propPrice >= 100_000_000) {
        propPriceLabel += ` (Venta: ${formatCOP(prop.price)})`;
      }
    } else {
      propPriceLabel = isDualOffer ? `Venta: ${formatCOP(prop.price)} / Canon: N/E` : formatCOP(prop.price);
    }
  } else {
    effectivePropPrice = propPrice;
    const saleLabel = propPrice > 0 ? formatCOP(prop.price) : "N/E";
    const rentLabel = propRentPrice > 0 ? `${formatCOP(String(propRentPrice))}/mes` : "N/E";
    propPriceLabel = isDualOffer ? `Venta: ${saleLabel} / Canon: ${rentLabel}` : saleLabel;
  }

  let budS: MatchStatus = "neutral";
  if (budget > 0 && effectivePropPrice > 0) {
    if (effectivePropPrice <= budget) budS = "exact";
    else budS = "missing";
  }
  const reqBudgetLabel = budget > 0 ? `${formatCOP(budget)}${budgetInferred ? " (Inferido 🔍)" : ""}` : "N/E";

  add(
    "Presupuesto Máx.",
    reqBudgetLabel,
    propPriceLabel,
    budS,
    15,
    <DollarSign className="w-3.5 h-3.5" />
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
    if (areaP < areaR * 0.95)        areS = "missing";
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
      bedS = "missing";
    } else if (bedP > bedR) {
      bedS = "warn";
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
      bathS = "missing";
    } else if (bathP > bathR) {
      bathS = "warn";
    } else {
      bathS = "exact";
    }
  }
  const reqBathLabel = bathR > 0 
    ? `≥ ${bathR} baño${bathR > 1 ? "s" : ""}${bathInferred ? " (Inferido 🔍)" : ""}` 
    : "N/E";

  add(
    "Baños", 
    reqBathLabel, 
    bathP > 0 ? `${bathP} baño${bathP > 1 ? "s" : ""}` : "N/E", 
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
      garS = "missing";
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

  // 10. Administración (con inferencia por regex)
  let reqAdminMax = req.adminFeeMax ? parseFloat(String(req.adminFeeMax)) : 0;
  let adminInferred = false;
  if (reqAdminMax <= 0 && reqTextLower) {
    const m = reqTextLower.match(/administració?n\s*(?:alrededor\s*de|máxima?|max)?\s*\$?([\d.,]+)\s*(mil|millones|m)?/i);
    if (m) {
      let val = parseFloat(m[1].replace(/\./g, "").replace(/,/g, ""));
      if (m[2] && m[2].includes("mil") && val < 10000) val *= 1000;
      reqAdminMax = val;
      adminInferred = true;
    }
  }
  const propAdminFee = prop.adminFee ? parseFloat(String(prop.adminFee)) : 0;
  let admS: MatchStatus = "neutral";
  if (reqAdminMax > 0) {
    admS = (propAdminFee > 0 && propAdminFee <= reqAdminMax) ? "exact" : "warn";
  }
  const reqAdminLabel = reqAdminMax > 0 
    ? `≤ ${formatCOP(reqAdminMax)}${adminInferred ? " (Inferido 🔍)" : ""}` 
    : "N/E";

  add(
    "Administración", 
    reqAdminLabel, 
    propAdminFee > 0 ? `${formatCOP(propAdminFee)}/mes` : "N/E", 
    admS, 
    5, 
    <Receipt className="w-3.5 h-3.5" />
  );

  // 11. Antigüedad / Año de Construcción — v20.0 con tolerancia 20%
  const ageR = req.antiguedadMax ? Number(req.antiguedadMax) : (req.preferredAge ? Number(req.preferredAge) : 0);
  const ageP = prop.antiguedadAnos != null ? Number(prop.antiguedadAnos)
    : (prop.yearBuilt ? (new Date().getFullYear() - Number(prop.yearBuilt))
    : (prop.constructionYear ? (new Date().getFullYear() - Number(prop.constructionYear)) : -1));

  let ageS: MatchStatus = "neutral";
  if (ageR > 0 && ageP >= 0) {
    if (ageP <= ageR)              ageS = "exact";
    else if (ageP <= ageR * 1.20) ageS = "warn";    // Tolerancia 20%
    else                           ageS = "missing"; // Supera max con margen
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
    storageS = propStorage ? "exact" : "missing"; // Si exige depósito y la oferta no lo tiene -> missing (Diferente)
  }
  add(
    "Depósito / Cuarto Útil",
    reqStorage ? "Exige Depósito / Cuarto Útil" : "N/E",
    propStorage ? "Sí (Con Depósito)" : "Sin depósito especificado",
    storageS,
    4,
    <Building2 className="w-3.5 h-3.5" />
  );


  const hasAnyFailure = rows.some(r => r.status === "missing");
  const autoScore = hasAnyFailure ? 0 : (max > 0 ? Math.round((pts / max) * 100) : 0);
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

function extractPhoneFromItem(item: any): { display: string; cleanNumber: string | null } {
  if (!item) return { display: "Número no disponible", cleanNumber: null };

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
    if (isValidRealPhoneNumber(clean)) {
      if (clean.length === 12 && clean.startsWith("573")) {
        return {
          display: `+57 ${clean.substring(2, 5)} ${clean.substring(5, 8)} ${clean.substring(8)}`,
          cleanNumber: clean
        };
      }
      if (clean.length === 10 && clean.startsWith("3")) {
        return {
          display: `+57 ${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6)}`,
          cleanNumber: `57${clean}`
        };
      }
      return {
        display: `+${clean}`,
        cleanNumber: clean
      };
    }
  }

  // 2. Buscar en el texto del mensaje por cualquier celular colombiano de 10 dígitos (ej: 312 443 1225)
  const textToSearch = `${item.rawText || ""} ${item.description || ""} ${item.name || ""} ${item.rawMessage || ""}`;
  const phoneMatches = textToSearch.match(/(?:\+?57\s*)?3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/g);
  if (phoneMatches && phoneMatches.length > 0) {
    const rawMatch = phoneMatches[0].replace(/\D/g, "");
    const clean10 = rawMatch.startsWith("57") && rawMatch.length === 12 ? rawMatch.substring(2) : rawMatch;
    if (clean10.length === 10 && clean10.startsWith("3")) {
      return {
        display: `+57 ${clean10.substring(0, 3)} ${clean10.substring(3, 6)} ${clean10.substring(6)}`,
        cleanNumber: `57${clean10}`
      };
    }
  }

  // 3. Barrido de contingencia en metadatos JSONB
  const jsonSources = [item.metadata, item.rawJson, item.extraData];
  for (const jsonSrc of jsonSources) {
    if (!jsonSrc) continue;
    const str = typeof jsonSrc === "string" ? jsonSrc : JSON.stringify(jsonSrc);
    const jsonMatches = str.match(/(?:\+?57\s*)?3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/g);
    if (jsonMatches && jsonMatches.length > 0) {
      const rawMatch = jsonMatches[0].replace(/\D/g, "");
      const clean10 = rawMatch.startsWith("57") && rawMatch.length === 12 ? rawMatch.substring(2) : rawMatch;
      if (clean10.length === 10 && clean10.startsWith("3")) {
        return {
          display: `+57 ${clean10.substring(0, 3)} ${clean10.substring(3, 6)} ${clean10.substring(6)}`,
          cleanNumber: `57${clean10}`
        };
      }
    }
  }

  return { display: "Número no disponible", cleanNumber: null };
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
      if (scoreNum < minVal) return false;

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
      
      const matchesSearch = propSearchStr.includes(searchTerm.toLowerCase()) || 
                            reqSearchStr.includes(searchTerm.toLowerCase());

      const { rows } = scoreRows(requirement, property);
      const mandatoryLabels = [
        "Tipo de Inmueble",
        "Tipo de Negocio",
        "Ubicación / Barrio",
        "Presupuesto Máx.",
        "Área Total",
        "Habitaciones",
        "Baños",
        "Parqueaderos"
      ];
      
      const hasAnyHardFailure = rows.some(r => r.status === "missing");
      const hasPendingGrey = rows.some(r => mandatoryLabels.includes(r.label) && r.status === "neutral");

      if (!matchesSearch || hasAnyHardFailure) return false;

      if (activeTab === 'calificados') {
        return !hasPendingGrey;
      } else {
        return hasPendingGrey;
      }
    });
  }, [matches, searchTerm, minScore, activeTab]);

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
            <option className="bg-[#0c0c0c]" value="80">⚡ 80% — Coincidencias Aproximadas (80%+)</option>
            <option className="bg-[#0c0c0c]" value="90">✨ 90% — Coincidencias Más Precisas (90%+)</option>
            <option className="bg-[#0c0c0c]" value="100">🎯 100% — Match Perfecto (100%)</option>
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
              const date = formatColombiaDate(m.createdAt);

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
                        <div className="flex items-center gap-2 flex-wrap">
                          {(() => {
                            const publicUrl = extractPublicLink(m.property);
                            return publicUrl ? (
                              <a
                                href={publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 rounded-md flex items-center gap-1 font-bold transition-all shadow-sm"
                                title="Ver enlace público original / ficha del inmueble"
                              >
                                🔗 Ficha / Enlace Público <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : null;
                          })()}
                          {m.property?.origenNombre && (
                            <span className="text-[10px] text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md truncate max-w-[180px] sm:max-w-[200px]" title={m.property.origenNombre}>
                              📍 {m.property.origenNombre}
                            </span>
                          )}
                        </div>
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-white mt-1 break-words">{m.property?.name}</h4>
                      
                      {/* Texto Completo Extraído o Resumen Estructurado de Atributos */}
                      <div className="text-xs text-zinc-300 bg-white/[0.02] border border-white/5 p-3 rounded-xl leading-relaxed whitespace-pre-wrap break-words">
                        {(m.property?.rawText || m.property?.description) ? (
                          <span className="italic">"{renderTextWithClickableLinks(m.property?.rawText || m.property?.description)}"</span>
                        ) : (
                          <div className="not-italic text-zinc-400 space-y-1">
                            <p className="font-semibold text-[#bf953f]">Detalles del Inmueble Oferta:</p>
                            <p>• Tipo: <span className="text-white font-medium">{getPropTypeLabel(m.property?.propertyType)}</span> | Negocio: <span className="text-white font-medium">{getTransactionLabel(m.property?.transactionType)}</span></p>
                            <p>• Precio: <span className="text-white font-medium">{formatCOP(m.property?.price)}</span> | Área: <span className="text-white font-medium">{m.property?.areaTotal || 'N/E'} m²</span></p>
                            <p>• Especificaciones: <span className="text-white font-medium">{m.property?.bedrooms || 'N/E'} hab | {m.property?.bathrooms || 'N/E'} baños | {m.property?.garages || 'N/E'} garajes</span></p>
                            <p>• Ubicación: <span className="text-white font-medium">{m.property?.zone || 'N/E'}, {m.property?.city || 'Bogotá'}</span></p>
                          </div>
                        )}
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
                            {propContact.cleanNumber && (
                              <a 
                                href={`https://wa.me/${propContact.cleanNumber}?text=${encodeURIComponent(`Hola! Te contacto por el inmueble "${m.property?.name || 'de la red'}" publicado en ${m.property?.origenNombre || 'VECY Network'}. Tienes un Match del ${score.toFixed(0)}% con un requerimiento activo.`)}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="bg-[#25D366] hover:bg-[#20ba5a] text-black text-[10px] font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md hover:scale-105 min-h-[38px] w-full sm:w-auto"
                              >
                                Contactar WA <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
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
                      {m.requirement?.rawText && (
                        <div className="text-xs text-zinc-300 bg-white/[0.02] border border-white/5 p-3 rounded-xl italic leading-relaxed whitespace-pre-wrap break-words">
                          "{renderTextWithClickableLinks(m.requirement?.rawText)}"
                        </div>
                      )}
                      
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
                            {reqContact.cleanNumber && (
                              <a 
                                href={`https://wa.me/${reqContact.cleanNumber}?text=${encodeURIComponent(`Hola! Te contacto por tu requerimiento de inmueble en ${m.requirement?.zonaDeseada || m.requirement?.ciudadDeseada || 'VECY Network'}. Encontramos una propiedad con un Match del ${score.toFixed(0)}%.`)}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="bg-[#25D366] hover:bg-[#20ba5a] text-black text-[10px] font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md hover:scale-105 min-h-[38px] w-full sm:w-auto"
                              >
                                Contactar WA <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                  </div>

                  {/* COTEJO DETALLADO CAMPO POR CAMPO (RESPONSIVE: TABLA EN DESKTOP, TARJETAS EN MÓVIL) */}
                  <div className="bg-black/30 border-b border-white/5 p-3 sm:p-4 md:p-6 overflow-x-hidden">
                    <h5 className="text-xs font-bold uppercase tracking-widest text-[#bf953f] mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Cotejo técnico de afinidad comercial
                    </h5>
                    
                    {/* VISTA ESCRITORIO (md:table - 4 columnas) */}
                    <div className="hidden md:block overflow-x-auto scrollbar-thin">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-zinc-500">
                            <th className="text-left py-2.5 px-3">Característica</th>
                            <th className="text-left py-2.5 px-3 text-[#bf953f]">Ofrecido (Oferta)</th>
                            <th className="text-left py-2.5 px-3 text-cyan-400">Buscado (Demanda)</th>
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
                                : isNeutral
                                  ? "bg-zinc-800 text-zinc-400 border border-zinc-700/50"
                                  : "bg-red-500/10 text-red-400 border border-red-500/20";
                            
                            const badgeText = isExact ? "Coincide" : isWarn ? "Aproximado" : isNeutral ? "Dato Pendiente" : "Fallido";

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
                            : isNeutral
                              ? "bg-zinc-800 text-zinc-400 border border-zinc-700/50"
                              : "bg-red-500/10 text-red-400 border border-red-500/20";
                        
                        const badgeText = isExact ? "Coincide" : isWarn ? "Aproximado" : isNeutral ? "Dato Pendiente" : "Fallido";

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
                                  {row.propVal}
                                </span>
                              </div>

                              <div className="bg-cyan-500/5 border border-cyan-500/10 p-2 rounded-xl">
                                <span className="text-[9px] uppercase tracking-wider font-extrabold text-cyan-400/80 block">
                                  🔍 Buscado (Demanda)
                                </span>
                                <span className="font-bold text-cyan-300 break-words mt-0.5 block">
                                  {row.reqVal}
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
