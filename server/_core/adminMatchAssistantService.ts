import { getDb } from "../db";
import { and, eq, desc, sql, inArray } from "drizzle-orm";
import { properties, requirements, propertyMatches } from "../../drizzle/schema";
import { explicarMatch, extractRealPhone, findMatchesForProperty, findMatchesForRequirement } from "./matching";
import { extractFallbackDataFromText } from "./janIA";

export interface AdminMatchItem {
  matchId: number | null;
  score: number;
  matchType: 'property_to_requirements' | 'requirement_to_properties' | 'existing_match';
  targetType: 'inmueble' | 'demanda';
  targetId: number;
  title: string;
  transactionType: string;
  propertyType: string;
  city: string;
  neighborhood: string;
  priceOrBudgetFormatted: string;
  areaFormatted: string;
  bedroomsFormatted: string;
  bathroomsFormatted: string;
  parkingFormatted: string;
  contactName: string;
  contactPhone: string | null;
  contactWhatsAppLink: string | null;
  matchSummary: string;
  positives: string[];
  blockers: string[];
}

export interface AdminMatchSearchResult {
  isMatchQuery: boolean;
  isAuthorizedAdmin: boolean;
  queryType: 'demand_search' | 'offer_search' | 'match_id' | 'property_id' | 'requirement_id' | 'unrecognized';
  querySummary: string;
  totalFound: number;
  matches: AdminMatchItem[];
  formattedReport: string;
  adminDashboardUrl: string;
}

// 🛡️ IDENTIFICADORES Y NÚMEROS AUTORIZADOS DE ADMINISTRACIÓN VECY (Doctrina Eduardo A. Rivera & Jani Alves)
export const ADMIN_IDENTIFIERS = [
  "573192919978", // Eduardo Rivera (Línea Socket / Baileys)
  "573166569719", // Línea Oficial Bróker Comercial VECY
  "573188096811", // Línea Directiva Jani Alves
  "167108705018103", // LID Directivo Jani Alves
  "182781141344345", // LID Directivo Activo Jani Alves
  "225954035179724", // LID Directivo Eduardo Rivera
  "218820279050385", // LID Directivo Alterno Jani Alves
  process.env.ADMIN_PHONE || "573192919978"
];

/**
 * Valida si un remitente es un administrador autorizado de VECY
 */
export function isAuthorizedAdminPhone(phoneOrId: string | null | undefined): boolean {
  if (!phoneOrId) return false;
  const clean = String(phoneOrId).split('@')[0].replace(/\D/g, "");
  const raw = String(phoneOrId);
  return ADMIN_IDENTIFIERS.some(id => clean === id || clean.includes(id) || raw.includes(id));
}

/**
 * Formatea valores numéricos en Pesos Colombianos (COP) de manera amigable
 */
export function formatCOP(num: number | string | null | undefined): string {
  if (!num) return "N/E";
  const val = Number(num);
  if (isNaN(val) || val <= 0) return "N/E";
  if (val >= 1_000_000_000) {
    const mm = (val / 1_000_000_000).toFixed(val % 1_000_000_000 === 0 ? 0 : 2);
    return `$${mm} MM ($${val.toLocaleString('es-CO')} COP)`;
  }
  if (val >= 1_000_000) {
    const m = (val / 1_000_000).toFixed(val % 1_000_000 === 0 ? 0 : 1);
    return `$${m} Millones ($${val.toLocaleString('es-CO')} COP)`;
  }
  return `$${val.toLocaleString('es-CO')} COP`;
}

export function getPropNeighborhood(p: any): string {
  if (!p) return "";
  return p.addressNeighborhood || p.zone || p.neighborhood || "";
}

export function getPropArea(p: any): number | string | null {
  if (!p) return null;
  return p.areaTotal || p.areaPrivate || p.area || null;
}

export function getPropGarages(p: any): number | null {
  if (!p) return null;
  return p.garages ?? p.parkingSpaces ?? null;
}

/**
 * Detecta si un mensaje recibido es una consulta o solicitud de búsqueda de MATCHES
 */
export function isMatchSearchQuery(text: string, isAdmin: boolean = false): boolean {
  if (!text || typeof text !== "string") return false;
  const lower = text.toLowerCase().trim();

  // 1. Comandos explícitos e identificadores de match
  if (/(?:^|\s)(?:#?m\d+|match\s*#?\d+|coincidencia\s*#?\d+)(?:$|\s|[.,;:])/i.test(lower)) return true;
  if (/(?:^|\s)(?:#?p\d+|inmueble\s*#?\d+|propiedad\s*#?\d+)(?:$|\s|[.,;:])/i.test(lower)) return true;
  if (/(?:^|\s)(?:#?r\d+|requerimiento\s*#?\d+|demanda\s*#?\d+)(?:$|\s|[.,;:])/i.test(lower)) return true;

  if (/\b(?:match|matches|coincidencias?|mesa de coincidencias)\b/i.test(lower)) return true;

  // 2. Intenciones de búsqueda explícita de clientes o inmuebles
  if (/\b(?:buscar?|buscame|búscame|encuentra|encuentrame|encuéntrame|cruzame|crúzame|cruzar|cotejar|coteja)\s+(?:inmuebles?|propiedades?|clientes?|demandas?|requerimientos?|matches?|ofertas?)\b/i.test(lower)) {
    return true;
  }
  if (/\b(?:qu[eé]\s+(?:inmuebles?|clientes?|demandas?)\s+(?:hay|tenemos|hacen\s+match)|hay\s+clientes\s+para|hay\s+inmuebles\s+para)\b/i.test(lower)) {
    return true;
  }

  // 3. Si el remitente es ADMINISTRADOR y envía una publicación inmobiliaria directa (Oferta o Demanda)
  if (isAdmin) {
    const isRealEstateListing = (
      lower.includes("apto") || lower.includes("apartamento") || lower.includes("casa") ||
      lower.includes("oficina") || lower.includes("bodega") || lower.includes("local") ||
      lower.includes("lote") || lower.includes("finca") || lower.includes("consultorio") ||
      lower.includes("alcoba") || lower.includes("habitacion") || lower.includes("habitación")
    );

    const hasOfferSignal = /\b(?:vendo|se vende|ofrezco|arriendo|se arrienda|alquilo|se alquila|tengo en arriendo|tengo en venta|disponible)\b/i.test(lower);
    const hasDemandSignal = /\b(?:busco|se busca|necesito|requiero|cliente busca|comprador busca|para cliente|solicito|compro)\b/i.test(lower);

    if (isRealEstateListing && (hasOfferSignal || hasDemandSignal)) {
      return true;
    }
  }

  return false;
}

/**
 * Ejecuta la búsqueda inteligente de MATCHES exclusiva para Administradores de VECY
 */
export async function executeAdminMatchSearch(
  queryText: string,
  isAdmin: boolean,
  injectedDb?: any
): Promise<AdminMatchSearchResult> {
  const adminDashboardUrl = "https://vecy-bienes-raices.vercel.app/admin";

  const clean = queryText.trim();
  const lower = clean.toLowerCase();

  const matchIdRegex = /(?:#?m|match\s*#?|coincidencia\s*#?)\s*(\d+)/i;
  const matchIdMatch = clean.match(matchIdRegex);

  const propIdRegex = /(?:#?p|inmueble\s*#?|propiedad\s*#?)\s*(\d+)/i;
  const propIdMatch = clean.match(propIdRegex);

  const reqIdRegex = /(?:#?r|requerimiento\s*#?|demanda\s*#?)\s*(\d+)/i;
  const reqIdMatch = clean.match(reqIdRegex);

  const isDemand = (
    lower.includes("busco") || lower.includes("necesito") || lower.includes("requiero") ||
    lower.includes("se busca") || lower.includes("demanda") || lower.includes("cliente busca") ||
    lower.includes("comprador busca") || lower.includes("para cliente") || lower.includes("solicito") ||
    lower.includes("para compra") || lower.includes("para arriendo") || lower.includes("compro") ||
    lower.includes("requerimiento")
  );

  const resolvedQueryType: 'demand_search' | 'offer_search' | 'match_id' | 'property_id' | 'requirement_id' | 'unrecognized' =
    matchIdMatch ? 'match_id' :
    propIdMatch ? 'property_id' :
    reqIdMatch ? 'requirement_id' :
    (isDemand ? 'demand_search' : 'offer_search');

  // 🛡️ REGLA SUPREMA DE SEGURIDAD Y PRIVACIDAD DOCTRINAL:
  // Si quien consulta NO es administrador autorizado, BLOQUEO INMEDIATO de datos confidenciales
  if (!isAdmin) {
    const safeDenialReport =
      `🔒 *ACCESO RESTRINGIDO — PROTOCOLO DE PRIVACIDAD VECY*\n\n` +
      `Estimado colega: Por políticas de seguridad patrimonial, Hábeas Data (Ley 1581 de 2012) y doctrina de confidencialidad de *VECY BIENES RAÍCES*, la consulta interna de la mesa de coincidencias y los datos de contacto directo de captadores y demandantes están reservados exclusivamente para los administradores del sistema.\n\n` +
      `🤝 *¿Cómo podemos ayudarte?*\n` +
      `• Con gusto podemos recibir tu requerimiento o inmueble para registrarlo y cruzarlo automáticamente en la red.\n` +
      `• Para gestión directa, peritajes o citas de negocios, comunícate con nuestros directores *Eduardo A. Rivera y Jani Alves* al WhatsApp oficial: *+57 316 656 9719* 📲`;

    return {
      isMatchQuery: true,
      isAuthorizedAdmin: false,
      queryType: 'unrecognized',
      querySummary: "Consulta denegada por permisos de usuario",
      totalFound: 0,
      matches: [],
      formattedReport: safeDenialReport,
      adminDashboardUrl
    };
  }

  const db = injectedDb || await getDb();
  if (!db) {
    return {
      isMatchQuery: true,
      isAuthorizedAdmin: true,
      queryType: resolvedQueryType,
      querySummary: "Base de datos no disponible temporalmente",
      totalFound: 0,
      matches: [],
      formattedReport: `🎯 *VECY MATCH ENGINE — BÚSQUEDA DE COINCIDENCIAS*\n\nCriterio analizado (${resolvedQueryType}): *${clean}*.\n⚠️ La base de datos no está disponible en este momento. Intenta nuevamente en unos instantes.\n👉 *Ver en Mesa de Coincidencias:*\n${adminDashboardUrl}`,
      adminDashboardUrl
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. CASO: BÚSQUEDA POR ID DE MATCH (#M123 o Match 123)
  // ─────────────────────────────────────────────────────────────────────────────
  if (matchIdMatch) {
    const matchIdNum = parseInt(matchIdMatch[1], 10);
    const existingMatchRows = await db
      .select()
      .from(propertyMatches)
      .where(eq(propertyMatches.id, matchIdNum))
      .limit(1);

    if (existingMatchRows.length > 0) {
      const pm = existingMatchRows[0];
      const [prop] = await db.select().from(properties).where(eq(properties.id, pm.propertyId)).limit(1);
      const [req] = await db.select().from(requirements).where(eq(requirements.id, pm.requirementId)).limit(1);

      if (prop && req) {
        const propPhone = extractRealPhone(prop);
        const reqPhone = extractRealPhone(req);
        const scoreNum = parseFloat(String(pm.matchScore || "0"));

        const propWaLink = propPhone ? `https://wa.me/${propPhone}` : null;
        const reqWaLink = reqPhone ? `https://wa.me/${reqPhone}` : null;

        const report =
          `🎯 *DETALLE DE COINCIDENCIA — MATCH #M${pm.id}*\n\n` +
          `🏅 *Score de Afinidad:* *${scoreNum.toFixed(1)}%* ${scoreNum >= 90 ? '🔥 (Alta Compatibilidad)' : '✅'}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🏠 *INMUEBLE OFERTADO (#P${prop.id}):*\n` +
          `• *Tipo / Negocio:* ${prop.propertyType || 'Inmueble'} en ${prop.transactionType || 'Venta'}\n` +
          `• *Ubicación:* ${getPropNeighborhood(prop) || 'Sector'}, ${prop.city || 'Bogotá'}\n` +
          `• *Precio:* ${formatCOP(prop.price || prop.rentPrice)}\n` +
          `• *Área / Distribución:* ${getPropArea(prop) ? getPropArea(prop) + ' m²' : 'N/E'} • ${prop.bedrooms ? prop.bedrooms + ' Hab(s)' : ''} • ${prop.bathrooms ? prop.bathrooms + ' Baño(s)' : ''} • ${getPropGarages(prop) ? getPropGarages(prop) + ' Garaje(s)' : ''}\n` +
          `• *Captador:* ${prop.nombreUsuarioWhatsapp || 'Asesor Captador'}\n` +
          `• *Teléfono:* ${propPhone ? '+' + propPhone : 'Sin registrar'}\n` +
          `${propWaLink ? `• *WhatsApp Captador:* ${propWaLink}\n` : ''}` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📋 *DEMANDA COINCIDENTE (#R${req.id}):*\n` +
          `• *Buscado:* ${req.tipoInmuebleDeseado || 'Inmueble'} en ${req.tipoNegocioDeseado || 'Venta'}\n` +
          `• *Sector Deseado:* ${req.zonaDeseada || req.addressNeighborhood || 'Bogotá'}\n` +
          `• *Presupuesto Máx:* ${formatCOP(req.presupuestoMax)}\n` +
          `• *Exigencias:* ${req.areaMin ? 'Mín ' + req.areaMin + ' m²' : ''} • ${req.habitacionesMin ? 'Mín ' + req.habitacionesMin + ' Hab(s)' : ''}\n` +
          `• *Asesor con Cliente:* ${req.nombreUsuarioWhatsapp || 'Asesor con Demanda'}\n` +
          `• *Teléfono:* ${reqPhone ? '+' + reqPhone : 'Sin registrar'}\n` +
          `${reqWaLink ? `• *WhatsApp Asesor:* ${reqWaLink}\n` : ''}` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `👉 *Gestionar en Mesa de Coincidencias:*\n${adminDashboardUrl}?search=${pm.id}`;

        const item: AdminMatchItem = {
          matchId: pm.id,
          score: scoreNum,
          matchType: 'existing_match',
          targetType: 'inmueble',
          targetId: prop.id,
          title: prop.name || `Inmueble #${prop.id}`,
          transactionType: prop.transactionType || "venta",
          propertyType: prop.propertyType || "apartment",
          city: prop.city || "Bogotá",
          neighborhood: getPropNeighborhood(prop),
          priceOrBudgetFormatted: formatCOP(prop.price || prop.rentPrice),
          areaFormatted: getPropArea(prop) ? `${getPropArea(prop)} m²` : "N/E",
          bedroomsFormatted: prop.bedrooms ? `${prop.bedrooms} Hab` : "N/E",
          bathroomsFormatted: prop.bathrooms ? `${prop.bathrooms} Baños` : "N/E",
          parkingFormatted: getPropGarages(prop) ? `${getPropGarages(prop)} Pq` : "N/E",
          contactName: prop.nombreUsuarioWhatsapp || "Asesor Captador",
          contactPhone: propPhone,
          contactWhatsAppLink: propWaLink,
          matchSummary: `Coincidencia bilateral de ${scoreNum.toFixed(1)}%`,
          positives: [],
          blockers: []
        };

        return {
          isMatchQuery: true,
          isAuthorizedAdmin: true,
          queryType: 'match_id',
          querySummary: `Match #${pm.id} (Inmueble #P${prop.id} ↔ Demanda #R${req.id})`,
          totalFound: 1,
          matches: [item],
          formattedReport: report,
          adminDashboardUrl: `${adminDashboardUrl}?search=${pm.id}`
        };
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. CASO: BÚSQUEDA POR ID DE PROPIEDAD (#P123 o Inmueble 123)
  // ─────────────────────────────────────────────────────────────────────────────
  if (propIdMatch) {
    const propIdNum = parseInt(propIdMatch[1], 10);
    const [prop] = await db.select().from(properties).where(eq(properties.id, propIdNum)).limit(1);

    if (prop) {
      // Obtener matches existentes o recalcular
      const existingMatches = await db
        .select()
        .from(propertyMatches)
        .where(eq(propertyMatches.propertyId, propIdNum))
        .orderBy(desc(propertyMatches.matchScore));

      const matchItems: AdminMatchItem[] = [];

      if (existingMatches.length > 0) {
        for (const pm of existingMatches) {
          const scoreNum = parseFloat(String(pm.matchScore || "0"));
          if (scoreNum < 80) continue;

          const [req] = await db.select().from(requirements).where(eq(requirements.id, pm.requirementId)).limit(1);
          if (!req) continue;

          const reqPhone = extractRealPhone(req);
          const reqWaLink = reqPhone ? `https://wa.me/${reqPhone}` : null;

          matchItems.push({
            matchId: pm.id,
            score: scoreNum,
            matchType: 'property_to_requirements',
            targetType: 'demanda',
            targetId: req.id,
            title: req.name || `Demanda #${req.id}`,
            transactionType: req.tipoNegocioDeseado || "venta",
            propertyType: req.tipoInmuebleDeseado || "apartment",
            city: req.ciudadDeseada || "Bogotá",
            neighborhood: req.zonaDeseada || req.addressNeighborhood || "",
            priceOrBudgetFormatted: formatCOP(req.presupuestoMax),
            areaFormatted: req.areaMin ? `Mín ${req.areaMin} m²` : "N/E",
            bedroomsFormatted: req.habitacionesMin ? `Mín ${req.habitacionesMin} Hab` : "N/E",
            bathroomsFormatted: req.banosMin ? `Mín ${req.banosMin} Baños` : "N/E",
            parkingFormatted: req.parqueaderosMin ? `Mín ${req.parqueaderosMin} Pq` : "N/E",
            contactName: req.nombreUsuarioWhatsapp || "Asesor con Demanda",
            contactPhone: reqPhone,
            contactWhatsAppLink: reqWaLink,
            matchSummary: `Presupuesto máx ${formatCOP(req.presupuestoMax)} cubre inmueble`,
            positives: [],
            blockers: []
          });
        }
      }

      // Si no habían matches cacheados, ejecutar motor en caliente
      if (matchItems.length === 0) {
        const freshMatches = await findMatchesForProperty(propIdNum);
        for (const fm of freshMatches) {
          const scoreNum = Number(fm.score || 0);
          if (scoreNum < 80) continue;

          const reqPhone = extractRealPhone(fm);
          const reqWaLink = reqPhone ? `https://wa.me/${reqPhone}` : null;

          matchItems.push({
            matchId: fm.matchId || null,
            score: scoreNum,
            matchType: 'property_to_requirements',
            targetType: 'demanda',
            targetId: fm.id,
            title: fm.name || `Demanda #${fm.id}`,
            transactionType: fm.tipoNegocioDeseado || "venta",
            propertyType: fm.tipoInmuebleDeseado || "apartment",
            city: fm.ciudadDeseada || "Bogotá",
            neighborhood: fm.zonaDeseada || fm.addressNeighborhood || "",
            priceOrBudgetFormatted: formatCOP(fm.presupuestoMax),
            areaFormatted: fm.areaMin ? `Mín ${fm.areaMin} m²` : "N/E",
            bedroomsFormatted: fm.habitacionesMin ? `Mín ${fm.habitacionesMin} Hab` : "N/E",
            bathroomsFormatted: fm.banosMin ? `Mín ${fm.banosMin} Baños` : "N/E",
            parkingFormatted: fm.parqueaderosMin ? `Mín ${fm.parqueaderosMin} Pq` : "N/E",
            contactName: fm.nombreUsuarioWhatsapp || "Asesor con Demanda",
            contactPhone: reqPhone,
            contactWhatsAppLink: reqWaLink,
            matchSummary: `Score de compatibilidad: ${scoreNum.toFixed(1)}%`,
            positives: [],
            blockers: []
          });
        }
      }

      // Ordenar por score descendente
      matchItems.sort((a, b) => b.score - a.score);

      const propPhone = extractRealPhone(prop);
      let reportText =
        `🎯 *VECY MATCH ENGINE — DEMANDAS COMPATIBLES PARA INMUEBLE #P${prop.id}*\n\n` +
        `🏠 *Inmueble Consultado:* ${prop.propertyType} en ${prop.transactionType} • ${getPropNeighborhood(prop) || prop.city} • ${formatCOP(prop.price || prop.rentPrice)}\n` +
        `👤 *Captador:* ${prop.nombreUsuarioWhatsapp || 'Asesor'} (${propPhone ? '+' + propPhone : 'Sin tel'})\n\n`;

      if (matchItems.length === 0) {
        reportText +=
          `🔍 *Sin coincidencias inmediatas (Score ≥ 80%)*\n` +
          `Actualmente no hay demandas activas que alcancen el 80% de compatibilidad para este inmueble.\n` +
          `💡 El inmueble permanece activo en el catálogo y te notificaré automáticamente cuando ingrese un cliente compatible.`;
      } else {
        reportText += `✨ *Se encontraron ${matchItems.length} demanda(s) compatible(s):*\n\n`;

        matchItems.slice(0, 5).forEach((item, idx) => {
          reportText +=
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🏅 *OPCIÓN #${idx + 1} — AFINIDAD: ${item.score.toFixed(1)}%* ${item.score >= 90 ? '🔥' : '✅'}\n` +
            `🔢 *MATCH #M${item.matchId || 'Sugerido'}* | *Demanda #R${item.targetId}*\n` +
            `📍 *Sector Buscado:* ${item.neighborhood || item.city}\n` +
            `💰 *Presupuesto Máx:* ${item.priceOrBudgetFormatted}\n` +
            `📐 *Requerimientos:* ${item.areaFormatted} • ${item.bedroomsFormatted}\n` +
            `👤 *Asesor con Cliente:* ${item.contactName}\n` +
            `📱 *Teléfono:* ${item.contactPhone ? '+' + item.contactPhone : 'Sin registrar'}\n` +
            `${item.contactWhatsAppLink ? `💬 *WhatsApp Directo:* ${item.contactWhatsAppLink}\n` : ''}`;
        });

        reportText +=
          `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `👉 *Ver en Mesa de Coincidencias:*\n${adminDashboardUrl}?search=${prop.id}`;
      }

      return {
        isMatchQuery: true,
        isAuthorizedAdmin: true,
        queryType: 'property_id',
        querySummary: `Inmueble #P${prop.id} (${prop.propertyType} en ${getPropNeighborhood(prop) || prop.city})`,
        totalFound: matchItems.length,
        matches: matchItems,
        formattedReport: reportText,
        adminDashboardUrl: `${adminDashboardUrl}?search=${prop.id}`
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. CASO: BÚSQUEDA POR ID DE REQUERIMIENTO (#R123 o Demanda 123)
  // ─────────────────────────────────────────────────────────────────────────────
  if (reqIdMatch) {
    const reqIdNum = parseInt(reqIdMatch[1], 10);
    const [req] = await db.select().from(requirements).where(eq(requirements.id, reqIdNum)).limit(1);

    if (req) {
      const existingMatches = await db
        .select()
        .from(propertyMatches)
        .where(eq(propertyMatches.requirementId, reqIdNum))
        .orderBy(desc(propertyMatches.matchScore));

      const matchItems: AdminMatchItem[] = [];

      if (existingMatches.length > 0) {
        for (const pm of existingMatches) {
          const scoreNum = parseFloat(String(pm.matchScore || "0"));
          if (scoreNum < 80) continue;

          const [prop] = await db.select().from(properties).where(eq(properties.id, pm.propertyId)).limit(1);
          if (!prop || !prop.available) continue;

          const propPhone = extractRealPhone(prop);
          const propWaLink = propPhone ? `https://wa.me/${propPhone}` : null;

          matchItems.push({
            matchId: pm.id,
            score: scoreNum,
            matchType: 'requirement_to_properties',
            targetType: 'inmueble',
            targetId: prop.id,
            title: prop.name || `Inmueble #${prop.id}`,
            transactionType: prop.transactionType || "venta",
            propertyType: prop.propertyType || "apartment",
            city: prop.city || "Bogotá",
            neighborhood: getPropNeighborhood(prop),
            priceOrBudgetFormatted: formatCOP(prop.price || prop.rentPrice),
            areaFormatted: getPropArea(prop) ? `${getPropArea(prop)} m²` : "N/E",
            bedroomsFormatted: prop.bedrooms ? `${prop.bedrooms} Hab` : "N/E",
            bathroomsFormatted: prop.bathrooms ? `${prop.bathrooms} Baños` : "N/E",
            parkingFormatted: getPropGarages(prop) ? `${getPropGarages(prop)} Pq` : "N/E",
            contactName: prop.nombreUsuarioWhatsapp || "Asesor Captador",
            contactPhone: propPhone,
            contactWhatsAppLink: propWaLink,
            matchSummary: `Precio ${formatCOP(prop.price || prop.rentPrice)} dentro de presupuesto`,
            positives: [],
            blockers: []
          });
        }
      }

      if (matchItems.length === 0) {
        const freshMatches = await findMatchesForRequirement(reqIdNum);
        for (const fm of freshMatches) {
          const scoreNum = Number(fm.score || 0);
          if (scoreNum < 80) continue;

          const propPhone = extractRealPhone(fm);
          const propWaLink = propPhone ? `https://wa.me/${propPhone}` : null;

          matchItems.push({
            matchId: fm.matchId || null,
            score: scoreNum,
            matchType: 'requirement_to_properties',
            targetType: 'inmueble',
            targetId: fm.id,
            title: fm.name || `Inmueble #${fm.id}`,
            transactionType: fm.transactionType || "venta",
            propertyType: fm.propertyType || "apartment",
            city: fm.city || "Bogotá",
            neighborhood: getPropNeighborhood(fm),
            priceOrBudgetFormatted: formatCOP(fm.price || fm.rentPrice),
            areaFormatted: getPropArea(fm) ? `${getPropArea(fm)} m²` : "N/E",
            bedroomsFormatted: fm.bedrooms ? `${fm.bedrooms} Hab` : "N/E",
            bathroomsFormatted: fm.bathrooms ? `${fm.bathrooms} Baños` : "N/E",
            parkingFormatted: getPropGarages(fm) ? `${getPropGarages(fm)} Pq` : "N/E",
            contactName: fm.nombreUsuarioWhatsapp || "Asesor Captador",
            contactPhone: propPhone,
            contactWhatsAppLink: propWaLink,
            matchSummary: `Score de compatibilidad: ${scoreNum.toFixed(1)}%`,
            positives: [],
            blockers: []
          });
        }
      }

      matchItems.sort((a, b) => b.score - a.score);

      const reqPhone = extractRealPhone(req);
      let reportText =
        `🎯 *VECY MATCH ENGINE — INMUEBLES COMPATIBLES PARA DEMANDA #R${req.id}*\n\n` +
        `📋 *Demanda Consultada:* ${req.tipoInmuebleDeseado} en ${req.tipoNegocioDeseado} • ${req.zonaDeseada || req.ciudadDeseada} • Presupuesto máx: ${formatCOP(req.presupuestoMax)}\n` +
        `👤 *Asesor Solicitante:* ${req.nombreUsuarioWhatsapp || 'Asesor'} (${reqPhone ? '+' + reqPhone : 'Sin tel'})\n\n`;

      if (matchItems.length === 0) {
        reportText +=
          `🔍 *Sin coincidencias inmediatas (Score ≥ 80%)*\n` +
          `Actualmente no hay inmuebles en catálogo que alcancen el 80% de compatibilidad para esta demanda.\n` +
          `💡 Te avisaré tan pronto un captador ingrese una propiedad compatible a la red.`;
      } else {
        reportText += `✨ *Se encontraron ${matchItems.length} inmueble(s) compatible(s):*\n\n`;

        matchItems.slice(0, 5).forEach((item, idx) => {
          reportText +=
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🏅 *OPCIÓN #${idx + 1} — AFINIDAD: ${item.score.toFixed(1)}%* ${item.score >= 90 ? '🔥' : '✅'}\n` +
            `🔢 *MATCH #M${item.matchId || 'Sugerido'}* | *Inmueble #P${item.targetId}*\n` +
            `📍 *Ubicación:* ${item.neighborhood || item.city}\n` +
            `💰 *Precio / Canon:* ${item.priceOrBudgetFormatted}\n` +
            `📐 *Detalles:* ${item.areaFormatted} • ${item.bedroomsFormatted} • ${item.bathroomsFormatted} • ${item.parkingFormatted}\n` +
            `👤 *Asesor Captador:* ${item.contactName}\n` +
            `📱 *Teléfono:* ${item.contactPhone ? '+' + item.contactPhone : 'Sin registrar'}\n` +
            `${item.contactWhatsAppLink ? `💬 *WhatsApp Directo:* ${item.contactWhatsAppLink}\n` : ''}`;
        });

        reportText +=
          `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `👉 *Ver en Mesa de Coincidencias:*\n${adminDashboardUrl}?search=${req.id}`;
      }

      return {
        isMatchQuery: true,
        isAuthorizedAdmin: true,
        queryType: 'requirement_id',
        querySummary: `Demanda #R${req.id} (${req.tipoInmuebleDeseado} en ${req.zonaDeseada || req.ciudadDeseada})`,
        totalFound: matchItems.length,
        matches: matchItems,
        formattedReport: reportText,
        adminDashboardUrl: `${adminDashboardUrl}?search=${req.id}`
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. CASO: TEXTO LIBRE (DEMANDA U OFERTA PASADA POR EL ADMINISTRADOR)
  // ─────────────────────────────────────────────────────────────────────────────
  const fb = extractFallbackDataFromText(clean);

  // 4.A: EL ADMINISTRADOR PASÓ UNA DEMANDA / REQUERIMIENTO -> BUSCAR INMUEBLES COMPATIBLES
  if (isDemand) {
    const candidateReq: any = {
      id: 0,
      rawText: clean,
      name: `Demanda de Asesor (${fb.barrio || fb.city || 'Bogotá'})`,
      tipoInmuebleDeseado: fb.propertyType || "apartment",
      tipoNegocioDeseado: fb.transactionType || "venta",
      ciudadDeseada: fb.city || "Bogotá",
      zonaDeseada: fb.barrio || "",
      addressNeighborhood: fb.barrio || "",
      presupuestoMax: fb.presupuestoMax ? String(fb.presupuestoMax) : "0",
      presupuestoMin: "0",
      areaMin: fb.areaMin ? String(fb.areaMin) : null,
      habitacionesMin: fb.bedroomsMin || null,
      banosMin: fb.bathroomsMin || null,
      parqueaderosMin: fb.parkingMin || null,
      status: "active"
    };

    const availableProps = await db
      .select()
      .from(properties)
      .where(eq(properties.available, true));

    const matchedItems: AdminMatchItem[] = [];

    for (const prop of availableProps) {
      // Regla de vigencia: ignorar inmuebles mayores a 15 días sin republicación
      const repCount = Number(prop.republicacionesCount || 0);
      const propEffectiveDate = (repCount > 0 && prop.fechaUltimaPublicacion)
        ? prop.fechaUltimaPublicacion
        : (prop.fechaUltimaPublicacion || prop.createdAt);
      const propAgeDays = propEffectiveDate ? Math.max(0, Math.floor((Date.now() - new Date(propEffectiveDate).getTime()) / (1000 * 60 * 60 * 24))) : 0;
      if (propAgeDays > 15) continue;

      const explanation = explicarMatch(candidateReq, prop, fb);
      if (explanation.score >= 80) {
        const propPhone = extractRealPhone(prop);
        const propWaLink = propPhone ? `https://wa.me/${propPhone}` : null;

        // Buscar si esta propiedad ya tiene algún match registrado en propertyMatches para referencia
        const existingPm = await db
          .select({ id: propertyMatches.id })
          .from(propertyMatches)
          .where(eq(propertyMatches.propertyId, prop.id))
          .limit(1);

        matchedItems.push({
          matchId: existingPm[0]?.id || null,
          score: explanation.score,
          matchType: 'requirement_to_properties',
          targetType: 'inmueble',
          targetId: prop.id,
          title: prop.name || `Inmueble #${prop.id}`,
          transactionType: prop.transactionType || "venta",
          propertyType: prop.propertyType || "apartment",
          city: prop.city || "Bogotá",
          neighborhood: getPropNeighborhood(prop),
          priceOrBudgetFormatted: formatCOP(prop.price || prop.rentPrice),
          areaFormatted: getPropArea(prop) ? `${getPropArea(prop)} m²` : "N/E",
          bedroomsFormatted: prop.bedrooms ? `${prop.bedrooms} Hab` : "N/E",
          bathroomsFormatted: prop.bathrooms ? `${prop.bathrooms} Baños` : "N/E",
          parkingFormatted: getPropGarages(prop) ? `${getPropGarages(prop)} Pq` : "N/E",
          contactName: prop.nombreUsuarioWhatsapp || "Asesor Captador",
          contactPhone: propPhone,
          contactWhatsAppLink: propWaLink,
          matchSummary: explanation.positives[0] || `Score: ${explanation.score.toFixed(1)}%`,
          positives: explanation.positives,
          blockers: explanation.blockers
        });
      }
    }

    matchedItems.sort((a, b) => b.score - a.score);

    let reportText =
      `🎯 *VECY MATCH ENGINE — INMUEBLES ENCONTRADOS PARA TU DEMANDA*\n\n` +
      `📋 *Criterios Analizados:* ${candidateReq.tipoInmuebleDeseado} en ${candidateReq.tipoNegocioDeseado} • ${candidateReq.zonaDeseada || candidateReq.ciudadDeseada} • Presupuesto: ${formatCOP(candidateReq.presupuestoMax)}\n\n`;

    if (matchedItems.length === 0) {
      reportText +=
        `🔍 *Sin coincidencias inmediatas (Score ≥ 80%)*\n` +
        `Para estos criterios no encontramos inmuebles activos en catálogo que cumplan el umbral de 80%.\n` +
        `💡 *Sugerencia de JanIA:* Si se amplía el presupuesto o se contemplan sectores vecinos a ${candidateReq.zonaDeseada || 'la zona'}, podremos evaluar nuevos prospectos.`;
    } else {
      reportText += `✨ *Se encontraron ${matchedItems.length} inmueble(s) compatible(s):*\n\n`;

      matchedItems.slice(0, 5).forEach((item, idx) => {
        reportText +=
          `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🏅 *OPCIÓN #${idx + 1} — AFINIDAD: ${item.score.toFixed(1)}%* ${item.score >= 90 ? '🔥' : '✅'}\n` +
          `🔢 *Inmueble #P${item.targetId}* ${item.matchId ? `| *MATCH #M${item.matchId}*` : ''}\n` +
          `📍 *Ubicación:* ${item.neighborhood || item.city}\n` +
          `💰 *Precio / Canon:* ${item.priceOrBudgetFormatted}\n` +
          `📐 *Detalles:* ${item.areaFormatted} • ${item.bedroomsFormatted} • ${item.bathroomsFormatted} • ${item.parkingFormatted}\n` +
          `👤 *Asesor Captador:* ${item.contactName}\n` +
          `📱 *Teléfono:* ${item.contactPhone ? '+' + item.contactPhone : 'Sin registrar'}\n` +
          `${item.contactWhatsAppLink ? `💬 *WhatsApp Directo:* ${item.contactWhatsAppLink}\n` : ''}`;
      });

      reportText +=
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👉 *Gestionar en Mesa de Coincidencias:*\n${adminDashboardUrl}`;
    }

    return {
      isMatchQuery: true,
      isAuthorizedAdmin: true,
      queryType: 'demand_search',
      querySummary: `Demanda: ${candidateReq.tipoInmuebleDeseado} en ${candidateReq.zonaDeseada || candidateReq.ciudadDeseada} (${formatCOP(candidateReq.presupuestoMax)})`,
      totalFound: matchedItems.length,
      matches: matchedItems,
      formattedReport: reportText,
      adminDashboardUrl
    };
  }

  // 4.B: EL ADMINISTRADOR PASÓ UNA OFERTA / INMUEBLE -> BUSCAR DEMANDAS COMPATIBLES
  const candidateProp: any = {
    id: 0,
    rawText: clean,
    name: `Inmueble de Asesor (${fb.barrio || fb.city || 'Bogotá'})`,
    propertyType: fb.propertyType || "apartment",
    transactionType: fb.transactionType || "venta",
    city: fb.city || "Bogotá",
    neighborhood: fb.barrio || "",
    price: fb.price ? String(fb.price) : null,
    rentPrice: fb.rentPrice ? String(fb.rentPrice) : null,
    area: fb.area ? String(fb.area) : null,
    bedrooms: fb.bedrooms || null,
    bathrooms: fb.bathrooms || null,
    parkingSpaces: fb.parking || null,
    available: true
  };

  const activeReqs = await db
    .select()
    .from(requirements)
    .where(eq(requirements.status, "active"));

  const matchedItems: AdminMatchItem[] = [];

  for (const req of activeReqs) {
    // Regla de vigencia de demandas
    if ((req as any).status === 'expired') continue;
    const reqRepCount = Number((req as any).republicacionesCount || 0);
    const reqEffectiveDate = (reqRepCount > 0 && (req as any).fechaUltimaPublicacion)
      ? (req as any).fechaUltimaPublicacion
      : ((req as any).fechaUltimaPublicacion || req.createdAt);
    const reqAgeDays = reqEffectiveDate ? Math.max(0, Math.floor((Date.now() - new Date(reqEffectiveDate).getTime()) / (1000 * 60 * 60 * 24))) : 0;
    if (reqAgeDays > 15) continue;

    const explanation = explicarMatch(req, candidateProp, undefined, fb);
    if (explanation.score >= 80) {
      const reqPhone = extractRealPhone(req);
      const reqWaLink = reqPhone ? `https://wa.me/${reqPhone}` : null;

      const existingPm = await db
        .select({ id: propertyMatches.id })
        .from(propertyMatches)
        .where(eq(propertyMatches.requirementId, req.id))
        .limit(1);

      matchedItems.push({
        matchId: existingPm[0]?.id || null,
        score: explanation.score,
        matchType: 'property_to_requirements',
        targetType: 'demanda',
        targetId: req.id,
        title: req.name || `Demanda #${req.id}`,
        transactionType: req.tipoNegocioDeseado || "venta",
        propertyType: req.tipoInmuebleDeseado || "apartment",
        city: req.ciudadDeseada || "Bogotá",
        neighborhood: req.zonaDeseada || req.addressNeighborhood || "",
        priceOrBudgetFormatted: formatCOP(req.presupuestoMax),
        areaFormatted: req.areaMin ? `Mín ${req.areaMin} m²` : "N/E",
        bedroomsFormatted: req.habitacionesMin ? `Mín ${req.habitacionesMin} Hab` : "N/E",
        bathroomsFormatted: req.banosMin ? `Mín ${req.banosMin} Baños` : "N/E",
        parkingFormatted: req.parqueaderosMin ? `Mín ${req.parqueaderosMin} Pq` : "N/E",
        contactName: req.nombreUsuarioWhatsapp || "Asesor con Demanda",
        contactPhone: reqPhone,
        contactWhatsAppLink: reqWaLink,
        matchSummary: explanation.positives[0] || `Score: ${explanation.score.toFixed(1)}%`,
        positives: explanation.positives,
        blockers: explanation.blockers
      });
    }
  }

  matchedItems.sort((a, b) => b.score - a.score);

  let reportText =
    `🎯 *VECY MATCH ENGINE — DEMANDAS / CLIENTES PARA TU INMUEBLE*\n\n` +
    `🏠 *Inmueble Analizado:* ${candidateProp.propertyType} en ${candidateProp.transactionType} • ${candidateProp.neighborhood || candidateProp.city} • Precio: ${formatCOP(candidateProp.price || candidateProp.rentPrice)}\n\n`;

  if (matchedItems.length === 0) {
    reportText +=
      `🔍 *Sin coincidencias inmediatas (Score ≥ 80%)*\n` +
      `Para las características de este inmueble no hay demandas activas que superen el 80% de afinidad en este instante.\n` +
      `💡 El inmueble queda en seguimiento activo y te enviaré la alerta tan pronto se registre un comprador o arrendatario afín.`;
  } else {
    reportText += `✨ *Se encontraron ${matchedItems.length} demanda(s) de clientes compatibles:*\n\n`;

    matchedItems.slice(0, 5).forEach((item, idx) => {
      reportText +=
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🏅 *OPCIÓN #${idx + 1} — AFINIDAD: ${item.score.toFixed(1)}%* ${item.score >= 90 ? '🔥' : '✅'}\n` +
        `🔢 *Demanda #R${item.targetId}* ${item.matchId ? `| *MATCH #M${item.matchId}*` : ''}\n` +
        `📍 *Sector Deseado:* ${item.neighborhood || item.city}\n` +
        `💰 *Presupuesto Máx:* ${item.priceOrBudgetFormatted}\n` +
        `📐 *Requerimientos:* ${item.areaFormatted} • ${item.bedroomsFormatted}\n` +
        `👤 *Asesor con Cliente:* ${item.contactName}\n` +
        `📱 *Teléfono:* ${item.contactPhone ? '+' + item.contactPhone : 'Sin registrar'}\n` +
        `${item.contactWhatsAppLink ? `💬 *WhatsApp Directo:* ${item.contactWhatsAppLink}\n` : ''}`;
    });

    reportText +=
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👉 *Gestionar en Mesa de Coincidencias:*\n${adminDashboardUrl}`;
  }

  return {
    isMatchQuery: true,
    isAuthorizedAdmin: true,
    queryType: 'offer_search',
    querySummary: `Oferta: ${candidateProp.propertyType} en ${candidateProp.neighborhood || candidateProp.city} (${formatCOP(candidateProp.price || candidateProp.rentPrice)})`,
    totalFound: matchedItems.length,
    matches: matchedItems,
    formattedReport: reportText,
    adminDashboardUrl
  };
}
