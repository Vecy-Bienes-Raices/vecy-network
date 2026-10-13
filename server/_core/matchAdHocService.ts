/**
 * VECY NETWORK — MOTOR DE MATCHING DUAL AD-HOC (v33.02)
 * Cruce en caliente de requerimientos/ofertas contra la BD en ventana de 15 días:
 * - CANAL ADMIN: Datos completos, teléfono directo, enlaces WhatsApp y fallback a ID más cercano.
 * - CANAL PÚBLICO / COLEGA EXTERNO: Anonimización total anti-bypassing y Gancho Comercial de Alianza 40/20/40.
 */

import { getDb } from "../db";
import { sql, eq, and, desc, gte } from "drizzle-orm";
import { properties, requirements } from "../../drizzle/schema";
import { calcularScoreMatch, extractRealPhone } from "./matching";
import { parseDemandText, ParsedDemand } from "./demandParserService";

export interface AdHocMatchItem {
  id: number;
  type: 'inmueble' | 'demanda';
  score: number;
  title: string;
  transactionType: string;
  propertyType: string;
  city: string;
  neighborhood: string;
  priceOrBudgetFormatted: string;
  areaFormatted: string;
  bedroomsFormatted: string;
  bathroomsFormatted: string;
  garagesFormatted: string;
  // Contacto (Disponible solo para Admin; NULO para canal público)
  contactName: string;
  contactPhone: string | null;
  contactWhatsAppLink: string | null;
  isRecent15Days: boolean;
  createdAt?: Date | string | null;
  rawTextPreview?: string;
}

export interface AdHocMatchResult {
  inputType: 'demanda' | 'oferta';
  channel: 'admin' | 'public';
  inputSummary: string;
  totalFound: number;
  matches: AdHocMatchItem[];
  closestCandidate?: {
    id: number;
    type: 'inmueble' | 'demanda';
    score: number;
    summary: string;
  } | null;
  formattedText: string;
  commercialClosingCTA?: string;
}

export const COMMERCIAL_40_20_40_CLOSING_TEMPLATE = (counterpartType: 'OFERTA' | 'DEMANDA', authorType: 'DEMANDA' | 'OFERTA') => 
`✨ *¡Tenemos una coincidencia perfecta para tu búsqueda!*
Para conectarte de inmediato con quien tiene la ${counterpartType}, comunícate con nuestros directores Jani o Eduardo al +57 316 656 9719 (https://wa.me/573166569719).

Gestionamos esta conexión bajo nuestro esquema de corretaje compartido: *alianza 40/20/40 sobre el 3% de comisión comercial*:
🔹 40% para ti como autor de la ${authorType}.
🔹 40% para el colega que tiene la contraparte.
🔹 20% para VECY BIENES RAÍCES por el enlace, auditoría y acompañamiento legal.

¿Qué dices, te le mides a cerrar este negocio en equipo? 🤝🚀`;

/**
 * Formatea valores en COP de forma legible
 */
function formatAdHocCOP(val: number | string | null | undefined): string {
  if (!val) return "N/E";
  const num = Number(val);
  if (isNaN(num) || num <= 0) return "N/E";
  if (num >= 1_000_000_000) {
    const mm = (num / 1_000_000_000).toFixed(num % 1_000_000_000 === 0 ? 0 : 2);
    return `$${mm} MM COP`;
  }
  if (num >= 1_000_000) {
    const m = (num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1);
    return `$${m} Millones COP`;
  }
  return `$${num.toLocaleString('es-CO')} COP`;
}

/**
 * Detecta si el texto recibido es una DEMANDA (Requerimiento) o una OFERTA (Inmueble)
 */
export function detectInputListingType(text: string): 'demanda' | 'oferta' {
  const lower = text.toLowerCase();
  const demandKeywords = [
    "busco", "necesito", "requiero", "demanda", "cliente busca", "interesado en",
    "se busca", "compro", "buscamos", "presupuesto para compra", "presupuesto para arriendo",
    "para cliente", "favor si tienen", "tienen disponible"
  ];
  for (const kw of demandKeywords) {
    if (lower.includes(kw)) return 'demanda';
  }
  return 'oferta';
}

/**
 * Ejecuta el motor de matching ad-hoc contra la base de datos
 */
export async function executeAdHocMatch(
  rawText: string,
  channel: 'admin' | 'public' = 'admin',
  options: { minScore?: number; limit?: number } = {}
): Promise<AdHocMatchResult> {
  const minScore = options.minScore ?? 75;
  const limit = options.limit ?? 5;
  const inputType = detectInputListingType(rawText);

  const db = await getDb();
  const now = new Date();
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

  const allScoredItems: AdHocMatchItem[] = [];
  let inputSummary = "";

  let availableProps: any[] = [];
  let activeReqs: any[] = [];

  if (db) {
    if (inputType === 'demanda') {
      availableProps = await db
        .select()
        .from(properties)
        .where(eq(properties.available, true))
        .orderBy(desc(properties.createdAt))
        .limit(100);
    } else {
      activeReqs = await db
        .select()
        .from(requirements)
        .where(eq(requirements.status, 'active'))
        .orderBy(desc(requirements.createdAt))
        .limit(100);
    }
  } else {
    // Resiliencia para modo test / offline sin PostgreSQL activo
    if (inputType === 'demanda') {
      availableProps = [
        {
          id: 101,
          name: "Apartamento Espectacular en Chicó",
          propertyType: "apartment",
          transactionType: "venta",
          city: "Bogotá",
          zone: "Chicó",
          addressNeighborhood: "Chicó",
          price: "950000000",
          rentPrice: null,
          bedrooms: 3,
          bathrooms: 2,
          garages: 2,
          areaTotal: "110",
          adminFee: "550000",
          nombreUsuarioWhatsapp: "Carlos Mendoza",
          idUsuarioWhatsapp: "573105558899",
          rawText: "Vendo apartamento en Chicó 110 m2 3 alcobas 2 garajes $950 MM",
          createdAt: new Date(),
          available: true
        },
        {
          id: 102,
          name: "Casa Amplia en Rosales",
          propertyType: "house",
          transactionType: "venta",
          city: "Bogotá",
          zone: "Rosales",
          addressNeighborhood: "Rosales",
          price: "1200000000",
          rentPrice: null,
          bedrooms: 4,
          bathrooms: 4,
          garages: 3,
          areaTotal: "220",
          adminFee: "0",
          nombreUsuarioWhatsapp: "Beatriz Gómez",
          idUsuarioWhatsapp: "573158889900",
          rawText: "Vendo casa en Rosales 220 m2 4 alcobas $1.200 MM",
          createdAt: new Date(),
          available: true
        }
      ];
    } else {
      activeReqs = [
        {
          id: 201,
          name: "Demanda Apartamento Chicó",
          tipoInmuebleDeseado: "apartment",
          tipoNegocioDeseado: "venta",
          ciudadDeseada: "Bogotá",
          zonaDeseada: "Chicó",
          addressNeighborhood: "Chicó",
          presupuestoMax: "1000000000",
          presupuestoMin: "800000000",
          habitacionesMin: 3,
          banosMin: 2,
          parqueaderosMin: 2,
          areaMin: "100",
          adminFeeMax: "600000",
          nombreUsuarioWhatsapp: "Alejandro Silva",
          idUsuarioWhatsapp: "573124445566",
          rawText: "Busco apartamento en Chicó 3 habs hasta $1.000 MM",
          createdAt: new Date(),
          status: "active"
        }
      ];
    }
  }

  if (inputType === 'demanda') {
    // El input es una DEMANDA -> Buscamos INMUEBLES (Ofertas) compatibles
    const parsedReq = parseDemandText(rawText);
    inputSummary = `Demanda de ${parsedReq.propertyType} en ${parsedReq.operationType} (${parsedReq.locationSummary}) • Presupuesto: ${parsedReq.budgetFormatted}`;

    // Construir objeto pseudo-requirement para el motor de scoring
    const pseudoReq = {
      id: 0,
      tipoInmuebleDeseado: parsedReq.propertyType,
      tipoNegocioDeseado: parsedReq.operationType,
      tiposNegocioAceptados: [parsedReq.operationType],
      ciudadDeseada: parsedReq.city,
      zonaDeseada: parsedReq.barrios[0] || "",
      addressNeighborhood: parsedReq.barrios[0] || "",
      presupuestoMax: parsedReq.budgetMax ? String(parsedReq.budgetMax) : null,
      presupuestoMin: parsedReq.budgetMin ? String(parsedReq.budgetMin) : "0",
      habitacionesMin: parsedReq.bedroomsMin || null,
      banosMin: parsedReq.bathroomsMin || null,
      parqueaderosMin: parsedReq.garagesMin || null,
      areaMin: parsedReq.areaMin ? String(parsedReq.areaMin) : null,
      adminFeeMax: parsedReq.adminFeeMax ? String(parsedReq.adminFeeMax) : null,
      rawText: rawText
    };

    for (const prop of availableProps) {
      const score = calcularScoreMatch(pseudoReq, prop);
      const isRecent15Days = prop.createdAt ? new Date(prop.createdAt) >= fifteenDaysAgo : false;
      const realPhone = extractRealPhone(prop);

      allScoredItems.push({
        id: prop.id,
        type: 'inmueble',
        score,
        title: prop.name || `Inmueble #${prop.id}`,
        transactionType: prop.transactionType || "venta",
        propertyType: prop.propertyType || "apartment",
        city: prop.city || "Bogotá",
        neighborhood: prop.addressNeighborhood || prop.zone || "",
        priceOrBudgetFormatted: formatAdHocCOP(prop.price || prop.rentPrice),
        areaFormatted: prop.areaTotal ? `${prop.areaTotal} m²` : "N/E",
        bedroomsFormatted: prop.bedrooms ? `${prop.bedrooms} Hab` : "N/E",
        bathroomsFormatted: prop.bathrooms ? `${prop.bathrooms} Baños` : "N/E",
        garagesFormatted: prop.garages ? `${prop.garages} Pq` : "N/E",
        contactName: channel === 'admin' ? (prop.nombreUsuarioWhatsapp || prop.origenNombre || "Colega Inmobiliario") : "Colega Inmobiliario Verificado (Red VECY)",
        contactPhone: channel === 'admin' ? realPhone : null,
        contactWhatsAppLink: channel === 'admin' && realPhone ? `https://wa.me/${realPhone}` : null,
        isRecent15Days,
        createdAt: prop.createdAt,
        rawTextPreview: prop.rawText?.slice(0, 140)
      });
    }

  } else {
    // El input es una OFERTA (Inmueble) -> Buscamos DEMANDAS (Requerimientos) compatibles
    const parsedOffer = parseDemandText(rawText);
    inputSummary = `Oferta de ${parsedOffer.propertyType} en ${parsedOffer.operationType} (${parsedOffer.locationSummary}) • Valor: ${parsedOffer.budgetFormatted}`;

    const pseudoProp = {
      id: 0,
      name: "Inmueble Ad-Hoc",
      propertyType: parsedOffer.propertyType,
      transactionType: parsedOffer.operationType,
      city: parsedOffer.city,
      zone: parsedOffer.barrios[0] || "",
      addressNeighborhood: parsedOffer.barrios[0] || "",
      price: parsedOffer.budgetMax ? String(parsedOffer.budgetMax) : "0",
      rentPrice: parsedOffer.operationType === 'arriendo' ? String(parsedOffer.budgetMax || "0") : null,
      bedrooms: parsedOffer.bedroomsMin || 0,
      bathrooms: parsedOffer.bathroomsMin || 0,
      garages: parsedOffer.garagesMin || 0,
      areaTotal: parsedOffer.areaMin ? String(parsedOffer.areaMin) : null,
      adminFee: parsedOffer.adminFeeMax ? String(parsedOffer.adminFeeMax) : null,
      rawText: rawText,
      available: true
    };

    for (const req of activeReqs) {
      const score = calcularScoreMatch(req, pseudoProp);
      const isRecent15Days = req.createdAt ? new Date(req.createdAt) >= fifteenDaysAgo : false;
      const realPhone = extractRealPhone(req);

      allScoredItems.push({
        id: req.id,
        type: 'demanda',
        score,
        title: req.name || `Demanda #${req.id}`,
        transactionType: req.tipoNegocioDeseado || "venta",
        propertyType: req.tipoInmuebleDeseado || "apartment",
        city: req.ciudadDeseada || "Bogotá",
        neighborhood: req.addressNeighborhood || req.zonaDeseada || "",
        priceOrBudgetFormatted: formatAdHocCOP(req.presupuestoMax),
        areaFormatted: req.areaMin ? `Mín ${req.areaMin} m²` : "N/E",
        bedroomsFormatted: req.habitacionesMin ? `Mín ${req.habitacionesMin} Hab` : "N/E",
        bathroomsFormatted: req.banosMin ? `Mín ${req.banosMin} Baños` : "N/E",
        garagesFormatted: req.parqueaderosMin ? `Mín ${req.parqueaderosMin} Pq` : "N/E",
        contactName: channel === 'admin' ? (req.nombreUsuarioWhatsapp || req.origenNombre || "Colega Inmobiliario") : "Colega Inmobiliario Verificado (Red VECY)",
        contactPhone: channel === 'admin' ? realPhone : null,
        contactWhatsAppLink: channel === 'admin' && realPhone ? `https://wa.me/${realPhone}` : null,
        isRecent15Days,
        createdAt: req.createdAt,
        rawTextPreview: req.rawText?.slice(0, 140)
      });
    }
  }

  // Ordenar por afinidad descendente
  allScoredItems.sort((a, b) => b.score - a.score);

  // 1. Filtrar matches que superan el 80% en los últimos 15 días
  const eightyThreshold = 80;
  const highMatches = allScoredItems.filter(item => item.score >= eightyThreshold && item.isRecent15Days).slice(0, limit);
  const hasEightyMatch = highMatches.length > 0;

  // 2. Fallback si no hay matches >= 80% en 15 días: Relajar a los últimos 45 días y score >= 50%
  const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
  let fallbackCandidates = allScoredItems.filter(item => {
    const isRecent45 = item.createdAt ? new Date(item.createdAt) >= fortyFiveDaysAgo : true;
    return item.score >= 50 && isRecent45;
  }).slice(0, 3);

  // Si no hay candidatos con score >= 50% en 45 días, tomar los 3 más cercanos disponibles
  if (fallbackCandidates.length === 0) {
    fallbackCandidates = allScoredItems.slice(0, 3);
  }

  const activeDisplayMatches = hasEightyMatch ? highMatches : fallbackCandidates;

  // Obtener el candidato más cercano en caso de no haber match >= 80%
  let closestCandidate: AdHocMatchResult['closestCandidate'] = null;
  if (fallbackCandidates.length > 0) {
    const top = fallbackCandidates[0];
    closestCandidate = {
      id: top.id,
      type: top.type,
      score: top.score,
      summary: `${top.title} en ${top.neighborhood || top.city} (${top.priceOrBudgetFormatted})`
    };
  }

  // Generar reporte de texto adaptado al canal
  const counterpartLabel = inputType === 'demanda' ? 'OFERTA' : 'DEMANDA';
  const authorLabel = inputType === 'demanda' ? 'DEMANDA' : 'OFERTA';
  const commercialClosingCTA = COMMERCIAL_40_20_40_CLOSING_TEMPLATE(counterpartLabel, authorLabel);

  let formattedText = "";

  if (channel === 'admin') {
    // 👑 REPORTE DE ADMINISTRACIÓN (Acceso Completo)
    formattedText = `⚡ *VECY MATCH AD-HOC (PANEL ADMINISTRADOR)*\n`;
    formattedText += `🔍 *Consulta:* ${inputSummary}\n\n`;

    if (hasEightyMatch) {
      formattedText += `🎉 *¡Se encontraron ${highMatches.length} coincidencia(s) directa(s) (Score ≥ 80%)!*\n\n`;
      highMatches.forEach((m, idx) => {
        formattedText += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        formattedText += `🏅 *OPCIÓN #${idx + 1} — AFINIDAD: ${m.score.toFixed(1)}%* ${m.score >= 90 ? '🔥' : '✅'}\n`;
        formattedText += `🆔 *Radicado #${m.id} (${m.type === 'inmueble' ? 'Inmueble' : 'Demanda'})* ${m.isRecent15Days ? '(Últimos 15 días 🟢)' : ''}\n`;
        formattedText += `📍 *Sector:* ${m.neighborhood || m.city}\n`;
        formattedText += `💰 *${m.type === 'inmueble' ? 'Precio' : 'Presupuesto'}:* ${m.priceOrBudgetFormatted}\n`;
        formattedText += `📐 *Características:* ${m.areaFormatted} • ${m.bedroomsFormatted} • ${m.bathroomsFormatted} • ${m.garagesFormatted}\n`;
        formattedText += `👤 *Colega / Contacto:* ${m.contactName}\n`;
        formattedText += `📱 *Teléfono:* ${m.contactPhone ? '+' + m.contactPhone : 'Sin registrar'}\n`;
        if (m.contactWhatsAppLink) {
          formattedText += `💬 *Chat WhatsApp:* ${m.contactWhatsAppLink}\n`;
        }
      });
    } else {
      formattedText += `🔍 *Opciones Aproximadas para Revisión Manual en Admin:*\n`;
      fallbackCandidates.forEach((m) => {
        const itemTypeLabel = m.type === 'inmueble' ? 'Inmueble' : 'Demanda';
        formattedText += `• ${itemTypeLabel} #${m.id} (Afinidad: ${m.score.toFixed(0)}%) — ${m.neighborhood || m.city} — ${m.priceOrBudgetFormatted} — ${m.bedroomsFormatted} / ${m.areaFormatted}\n`;
        formattedText += `  🆔 *Radicado #${m.id}*\n`;
        formattedText += `  👤 *Colega / Contacto:* ${m.contactName}\n`;
        formattedText += `  📱 *Teléfono:* ${m.contactPhone ? '+' + m.contactPhone : 'Sin registrar'}\n`;
        if (m.contactWhatsAppLink) {
          formattedText += `  💬 *Chat WhatsApp:* ${m.contactWhatsAppLink}\n`;
        }
      });
      formattedText += `👉 Puedes consultar la ficha completa directamente en el Panel de Administración (OFERTAS / INMUEBLES).\n`;
    }

    // Incluir SIEMPRE la propuesta comercial de alianza 40/20/40 y contacto a directores
    formattedText += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    formattedText += `${commercialClosingCTA}\n`;
  } else {
    // 🌐 REPORTE PARA COLEGA EXTERNO / USUARIO PÚBLICO (Anonimizado + Alianza 40/20/40)
    formattedText = `⚡ *RESULTADO DE COINCIDENCIAS VECY NETWORK*\n\n`;

    if (hasEightyMatch) {
      formattedText += `🎉 *¡Encontramos opciones altamente compatibles para tu búsqueda!*\n\n`;
      highMatches.forEach((topMatch) => {
        formattedText += `🏷️ *Radicado:* Ref-${topMatch.type === 'inmueble' ? 'P' : 'R'}${topMatch.id}\n`;
        formattedText += `📍 *Zona:* ${topMatch.neighborhood || topMatch.city}\n`;
        formattedText += `📐 *Especificaciones:* ${topMatch.bedroomsFormatted} • ${topMatch.bathroomsFormatted} • ${topMatch.areaFormatted} • ${topMatch.garagesFormatted}\n`;
        formattedText += `💰 *Rango:* ${topMatch.priceOrBudgetFormatted}\n`;
        formattedText += `⭐ *Afinidad Técnica:* ${topMatch.score.toFixed(0)}%\n\n`;
      });
    } else {
      formattedText += `🔍 *Opciones Aproximadas para Revisión:*\n`;
      fallbackCandidates.forEach((m) => {
        const itemTypeLabel = m.type === 'inmueble' ? 'Inmueble' : 'Demanda';
        formattedText += `• ${itemTypeLabel} #${m.id} (Afinidad: ${m.score.toFixed(0)}%) — ${m.neighborhood || m.city} — ${m.priceOrBudgetFormatted} — ${m.bedroomsFormatted} / ${m.areaFormatted} (Radicado: Ref-${m.type === 'inmueble' ? 'P' : 'R'}${m.id})\n`;
      });
      formattedText += `\n`;
    }

    // Incluir SIEMPRE la propuesta comercial de la alianza 40/20/40 sobre el 3% de comisión y llamado a Jani o Eduardo al +57 316 656 9719
    formattedText += `${commercialClosingCTA}`;
  }

  return {
    inputType,
    channel,
    inputSummary,
    totalFound: activeDisplayMatches.length,
    matches: activeDisplayMatches,
    closestCandidate,
    formattedText,
    commercialClosingCTA: commercialClosingCTA
  };
}
