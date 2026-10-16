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
export function isAuthorizedAdminPhone(phoneOrId: string | null | undefined, userName?: string): boolean {
  if (userName) {
    const unLower = userName.toLowerCase();
    if (unLower.includes("jani") || unLower.includes("eduardo") || unLower.includes("broker") || unLower.includes("vecy")) {
      return true;
    }
  }
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
 * Detecta si un mensaje recibido es una consulta o solicitud de búsqueda de MATCHES,
 * o si es una publicación de Oferta o Demanda para cruce en base de datos.
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

  // 3. Publicaciones Inmobiliarias Directas (Demandas u Ofertas para cruce de base de datos)
  // SÓLO se activan como búsqueda inmediata de matches si el usuario es ADMINISTRADOR
  if (isAdmin) {
    const hasRealEstateType = (
      lower.includes("apto") || lower.includes("apartamento") || lower.includes("casa") ||
      lower.includes("oficina") || lower.includes("bodega") || lower.includes("local") ||
      lower.includes("lote") || lower.includes("finca") || lower.includes("consultorio") ||
      lower.includes("inmueble") || lower.includes("propiedad") || lower.includes("penthouse") ||
      lower.includes("edificio") || lower.includes("chalet") || lower.includes("suite")
    );

    const hasDemandSignals = (
      lower.includes("requerimiento") || lower.includes("demanda") ||
      /\b(?:busco|buscamos|se busca|necesito|necesitamos|necesitan|requiero|requerimos|cliente directo|comprador directo|cliente con recursos|cliente busca|comprador busca|para cliente|solicito|compro|para compra|para comprar|para arriendo|en arriendo busco)\b/i.test(lower)
    );

    const hasOfferSignals = (
      lower.includes("oferta") || lower.includes("disponible") ||
      /\b(?:vendo|se vende|ofrezco|arriendo|se arrienda|alquilo|se alquila|tengo en arriendo|tengo en venta|en venta|en arriendo|para la venta)\b/i.test(lower)
    );

    if (hasRealEstateType && (hasDemandSignals || hasOfferSignals)) {
      return true;
    }

    if (hasDemandSignals && (lower.includes("m2") || lower.includes("m²") || lower.includes("habitac") || lower.includes("alcoba") || lower.includes("presupuesto") || lower.includes("millones") || lower.includes("mm") || lower.includes("efectivo"))) {
      return true;
    }

    // Si el remitente es administrador y envía cualquier texto con señales de metros, habitaciones o millones
    if ((lower.includes("habitac") || lower.includes("alcoba") || lower.includes("m2") || lower.includes("m²")) && (lower.includes("millones") || lower.includes("mm") || lower.includes("$"))) {
      return true;
    }
  }

  return false;
}

/**
 * Formatea el reporte de coincidencias adaptado para Administradores vs Usuarios/Colegas Externos (Doctrina v33.16)
 */
export function formatMatchReport(
  header: string,
  criteriaSummary: string,
  matches: AdminMatchItem[],
  isAdmin: boolean,
  adminDashboardUrl: string,
  emptyDiagnosis: string
): string {
  if (matches.length === 0) {
    if (isAdmin) {
      return (
        `${header}\n\n` +
        `${criteriaSummary}\n\n` +
        `🔍 *Diagnóstico en Base de Datos:*\n` +
        `⛔ *No se encontraron coincidencias compatibles (Score ≥ 80%) en los últimos 15 días.*\n\n` +
        `${emptyDiagnosis}\n\n` +
        `👉 *Verificar en Mesa de Coincidencias:*\n${adminDashboardUrl}`
      );
    } else {
      return (
        `🎯 *MESA DE COINCIDENCIAS VECY BIENES RAÍCES*\n\n` +
        `${criteriaSummary}\n\n` +
        `🔍 *Diagnóstico de Búsqueda:*\n` +
        `No encontramos una coincidencia activa inmediata (Score ≥ 80%) para este criterio en este momento.\n\n` +
        `💡 Tu consulta permanece en monitoreo permanente 24/7 en nuestro sistema. Apenas ingrese una opción compatible, te notificaremos de inmediato.\n\n` +
        `Para asesoría directa, peritajes o acuerdos entre colegas, comunícate con nuestros directores Eduardo A. Rivera y Jani Alves al WhatsApp oficial: *+57 316 656 9719* 🤝✨.`
      );
    }
  }

  // Hay matches
  if (isAdmin) {
    let report = `${header}\n\n${criteriaSummary}\n\n✨ *Se encontraron ${matches.length} coincidencia(s) compatible(s) (Últimos 15 días):*\n\n`;
    matches.slice(0, 5).forEach((item, idx) => {
      report +=
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🏅 *OPCIÓN #${idx + 1} — AFINIDAD: ${item.score.toFixed(1)}%* ${item.score >= 90 ? '🔥' : '✅'}\n` +
        `🔢 *${item.targetType === 'inmueble' ? `Inmueble #P${item.targetId}` : `Demanda #R${item.targetId}`}* ${item.matchId ? `| *MATCH #M${item.matchId}*` : ''}\n` +
        `📍 *Ubicación / Sector:* ${item.neighborhood || item.city}\n` +
        `💰 *Precio / Presupuesto:* ${item.priceOrBudgetFormatted}\n` +
        `📐 *Detalles:* ${item.areaFormatted} • ${item.bedroomsFormatted} • ${item.bathroomsFormatted} • ${item.parkingFormatted}\n` +
        `👤 *Colega / Asesor:* ${item.contactName}\n` +
        `📱 *Teléfono:* ${item.contactPhone ? '+' + item.contactPhone : 'Sin registrar'}\n` +
        `${item.contactWhatsAppLink ? `💬 *WhatsApp Directo:* ${item.contactWhatsAppLink}\n` : ''}`;
    });
    report +=
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👉 *Gestionar en Mesa de Coincidencias:*\n${adminDashboardUrl}`;
    return report;
  } else {
    // Usuario o Agente Externo (Doctrina v33.16)
    const topMatch = matches[0];
    const matchCode = topMatch.matchId ? `#M${topMatch.matchId}` : '#M15649';
    let report =
      `🎯 *¡HAY COINCIDENCIA ACTIVA (MATCH) EN NUESTRO SISTEMA!* 🚀✨\n\n` +
      `${criteriaSummary}\n\n` +
      `✨ *Se identificaron ${matches.length} oportunidad(es) de cruce comercial:* \n\n`;

    matches.slice(0, 3).forEach((item, idx) => {
      const codeStr = item.matchId ? `#M${item.matchId}` : matchCode;
      report +=
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🏅 *OPCIÓN #${idx + 1} — COMPATIBILIDAD: ${item.score.toFixed(1)}%* ${item.score >= 90 ? '🔥' : '✅'}\n` +
        `🔢 *Código Oficial del Match:* *${codeStr}*\n` +
        `📍 *Zona / Ubicación:* ${item.neighborhood || item.city}\n` +
        `💰 *Valor / Canon:* ${item.priceOrBudgetFormatted}\n` +
        `📐 *Especificaciones:* ${item.areaFormatted} • ${item.bedroomsFormatted} • ${item.bathroomsFormatted} • ${item.parkingFormatted}\n` +
        `🔒 *Punta Colega:* Colega de la Red VECY (Contacto protegido para mediación)\n`;
    });

    report +=
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🤝 *PROCESO DE MEDIACIÓN Y ALIANZA 40/20/40 VECY:*\n` +
      `Para coordinar este cruce, proteger la comisión compartida (40/20/40), acordar las puntas entre agentes y realizar la presentación formal ante propietarios, comunícate con nuestra Dirección de Operaciones al WhatsApp oficial de Bróker:\n` +
      `📲 *+57 316 656 9719* (https://wa.me/573166569719)\n` +
      `suministrando el código de coincidencia: *${matchCode}* 🤝✨`;

    return report;
  }
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

  // Comprobación de si es un texto completo descriptivo (oferta o demanda)
  const isDetailedListingText = clean.length > 50 && (
    lower.includes("hab") || lower.includes("alcoba") || lower.includes("m2") || lower.includes("m²") ||
    lower.includes("presupuesto") || lower.includes("recursos") || lower.includes("millones") || lower.includes("mm")
  );

  const matchIdRegex = /(?:^|\s)(?:#m\s*(\d+)|match\s*#?\s*(\d+)|coincidencia\s*#?\s*(\d+))\b/i;
  const matchIdMatch = !isDetailedListingText ? clean.match(matchIdRegex) : null;
  const matchIdCaptured = matchIdMatch ? (matchIdMatch[1] || matchIdMatch[2] || matchIdMatch[3]) : null;

  const propIdRegex = /(?:^|\s)(?:#p\s*(\d+)|inmueble\s*#?\s*(\d+)|propiedad\s*#?\s*(\d+))\b/i;
  const propIdMatch = !isDetailedListingText ? clean.match(propIdRegex) : null;
  const propIdCaptured = propIdMatch ? (propIdMatch[1] || propIdMatch[2] || propIdMatch[3]) : null;

  const reqIdRegex = /(?:^|\s)(?:#r\s*(\d+)|requerimiento\s*#?\s*(\d+)|demanda\s*#?\s*(\d+))\b/i;
  const reqIdMatch = !isDetailedListingText ? clean.match(reqIdRegex) : null;
  const reqIdCaptured = reqIdMatch ? (reqIdMatch[1] || reqIdMatch[2] || reqIdMatch[3]) : null;

  const isDemand = (
    lower.includes("busco") || lower.includes("buscamos") || lower.includes("necesito") || lower.includes("necesitamos") ||
    lower.includes("necesitan") || lower.includes("requiero") || lower.includes("requerimos") ||
    lower.includes("se busca") || lower.includes("demanda") || lower.includes("cliente busca") ||
    lower.includes("comprador busca") || lower.includes("para cliente") || lower.includes("solicito") ||
    lower.includes("para compra") || lower.includes("para arriendo") || lower.includes("compro") ||
    lower.includes("requerimiento") || lower.includes("cliente directo") || lower.includes("recursos hasta")
  );

  const resolvedQueryType: 'demand_search' | 'offer_search' | 'match_id' | 'property_id' | 'requirement_id' | 'unrecognized' =
    matchIdCaptured ? 'match_id' :
    propIdCaptured ? 'property_id' :
    reqIdCaptured ? 'requirement_id' :
    (isDemand ? 'demand_search' : 'offer_search');

  // 🛡️ ACCESO A MATCHES (DOCTRINA EDUARDO A. RIVERA v33.16):
  // Administradores (Eduardo y Jani): Información 100% destapada (nombres, teléfonos, enlaces directos).
  // Usuarios y Colegas Externos: Confirmación de match, perfil del cruce SIN datos de contacto del otro colega,
  // código #M... y derivación a la línea oficial de bróker +57 316 656 9719 para mediación 40/20/40.

  if (!isAdmin && !matchIdCaptured) {
    return {
      isMatchQuery: true,
      isAuthorizedAdmin: false,
      queryType: resolvedQueryType,
      querySummary: "Acceso restringido: Consulta de base de datos de coincidencias exclusiva para Administradores de Vecy Bienes Raíces.",
      totalFound: 0,
      matches: [],
      formattedReport: `🔒 *ACCESO RESTRINGIDO — PROTOCOLO DE PRIVACIDAD VECY*\n\n` +
        `Hola colega. La consulta directa y masiva de la base de datos de coincidencias y contactos de agentes es de uso exclusivo para la Dirección de Vecy Bienes Raíces.\n\n` +
        `Para consultar si tenemos un cliente o inmueble compatible para tu negocio bajo el esquema colaborativo 40/20/40, comunícate directamente con nuestra Dirección de Operaciones al WhatsApp oficial de Bróker:\n` +
        `📲 *+57 316 656 9719* (https://wa.me/573166569719) 🤝✨`,
      adminDashboardUrl
    };
  }

  const db = injectedDb || await getDb();
  if (!db) {
    return {
      isMatchQuery: true,
      isAuthorizedAdmin: isAdmin,
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
  if (matchIdCaptured) {
    const matchIdNum = parseInt(matchIdCaptured, 10);
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

        const header = `🎯 *DETALLE DE COINCIDENCIA — MATCH #M${pm.id}*`;
        const criteria = `🏅 *Score de Afinidad:* *${scoreNum.toFixed(1)}%* ${scoreNum >= 90 ? '🔥 (Alta Compatibilidad)' : '✅'}\n` +
          `🏠 *Inmueble (#P${prop.id}):* ${prop.propertyType || 'Inmueble'} en ${prop.transactionType || 'Venta'} • ${getPropNeighborhood(prop) || prop.city || 'Bogotá'} • ${formatCOP(prop.price || prop.rentPrice)}\n` +
          `📋 *Demanda (#R${req.id}):* ${req.tipoInmuebleDeseado || 'Inmueble'} en ${req.tipoNegocioDeseado || 'Venta'} • ${req.zonaDeseada || req.addressNeighborhood || 'Bogotá'} • Presupuesto: ${formatCOP(req.presupuestoMax)}`;

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

        const report = formatMatchReport(header, criteria, [item], isAdmin, adminDashboardUrl, "No se encontró el detalle.");

        return {
          isMatchQuery: true,
          isAuthorizedAdmin: isAdmin,
          queryType: 'match_id',
          querySummary: `Match #${pm.id} (Inmueble #P${prop.id} ↔ Demanda #R${req.id})`,
          totalFound: 1,
          matches: [item],
          formattedReport: report,
          adminDashboardUrl: `${adminDashboardUrl}?search=${pm.id}`
        };
      }
    } else {
      const notFoundReport = formatMatchReport(
        `🎯 *BÚSQUEDA DE MATCH #M${matchIdNum}*`,
        `Criterio: Código #M${matchIdNum}`,
        [],
        isAdmin,
        adminDashboardUrl,
        `No se encontró ningún match con código #M${matchIdNum} en la base de datos.`
      );
      return {
        isMatchQuery: true,
        isAuthorizedAdmin: isAdmin,
        queryType: 'match_id',
        querySummary: `Match #${matchIdNum} no encontrado`,
        totalFound: 0,
        matches: [],
        formattedReport: notFoundReport,
        adminDashboardUrl
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. CASO: BÚSQUEDA POR ID DE PROPIEDAD (#P123 o Inmueble 123)
  // ─────────────────────────────────────────────────────────────────────────────
  if (propIdCaptured) {
    const propIdNum = parseInt(propIdCaptured, 10);
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

      const propPhone = extractRealPhone(prop);
      const header = `🎯 *VECY MATCH ENGINE — DEMANDAS COMPATIBLES PARA INMUEBLE #P${prop.id}*`;
      const criteria = `🏠 *Inmueble Consultado:* ${prop.propertyType} en ${prop.transactionType} • ${getPropNeighborhood(prop) || prop.city} • ${formatCOP(prop.price || prop.rentPrice)}\n` +
        `👤 *Captador:* ${prop.nombreUsuarioWhatsapp || 'Asesor'} (${propPhone ? '+' + propPhone : 'Sin tel'})`;
      const emptyDiag = `Actualmente no hay demandas activas que alcancen el 80% de compatibilidad para este inmueble.\n💡 El inmueble permanece activo en el catálogo y te notificaré automáticamente cuando ingrese un cliente compatible.`;
      const reportText = formatMatchReport(header, criteria, matchItems, isAdmin, adminDashboardUrl, emptyDiag);

      return {
        isMatchQuery: true,
        isAuthorizedAdmin: isAdmin,
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
  if (reqIdCaptured) {
    const reqIdNum = parseInt(reqIdCaptured, 10);
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

      const reqPhone = extractRealPhone(req);
      const header = `🎯 *VECY MATCH ENGINE — INMUEBLES COMPATIBLES PARA DEMANDA #R${req.id}*`;
      const criteria = `📋 *Demanda Consultada:* ${req.tipoInmuebleDeseado} en ${req.tipoNegocioDeseado} • ${req.zonaDeseada || req.ciudadDeseada} • Presupuesto máx: ${formatCOP(req.presupuestoMax)}\n` +
        `👤 *Asesor Solicitante:* ${req.nombreUsuarioWhatsapp || 'Asesor'} (${reqPhone ? '+' + reqPhone : 'Sin tel'})`;
      const emptyDiag = `Actualmente no hay inmuebles en catálogo que alcancen el 80% de compatibilidad para esta demanda.\n💡 Te avisaré tan pronto un captador ingrese una propiedad compatible a la red.`;
      const reportText = formatMatchReport(header, criteria, matchItems, isAdmin, adminDashboardUrl, emptyDiag);

      return {
        isMatchQuery: true,
        isAuthorizedAdmin: isAdmin,
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
    let pptoMaxNum = Number(fb.presupuestoMax || 0);
    if (!pptoMaxNum || pptoMaxNum === 0) {
      const mmMatch = clean.match(/(?:recursos|presupuesto|ppto|hasta|tope|valor)?\s*(?:hasta|de)?\s*\$?\s*([\d][\d.,\s']*)\s*(?:mm|millones|mil\s*millones)\b/i);
      if (mmMatch) {
        const { parseColombianPriceOrBudget } = await import("./janIA");
        const parsed = parseColombianPriceOrBudget(mmMatch[1], "millones", true);
        if (parsed > 0) pptoMaxNum = parsed;
      }
    }

    let areaMinNum = Number(fb.areaMin || 0);
    if (!areaMinNum || areaMinNum === 0) {
      const aRangeMatch = clean.match(/(\d{2,4})\s*(?:[-–—]|a|hasta)\s*(\d{2,4})\s*(?:m2|mts2|m²|metros)/i);
      if (aRangeMatch) {
        areaMinNum = Math.min(Number(aRangeMatch[1]), Number(aRangeMatch[2]));
      }
    }

    let bedroomsMinNum = Number(fb.bedroomsMin || fb.bedrooms || 0);
    if (!bedroomsMinNum || bedroomsMinNum === 0) {
      const bedMatch = clean.match(/(\d+)\s*(?:habitación|habitaciones|alcoba|alcobas|hab|habs)/i);
      if (bedMatch) bedroomsMinNum = Number(bedMatch[1]);
    }

    const { extractAllBarriosFromText } = await import("./matching");
    const extractedBarrios = extractAllBarriosFromText(clean);
    const mainBarrio = fb.barrio || extractedBarrios[0] || "Bogotá";
    const sectoresLabel = extractedBarrios.length > 0 ? extractedBarrios.join(', ') : mainBarrio;

    const candidateReq: any = {
      id: 0,
      rawText: clean,
      name: `Demanda Administrador (${mainBarrio})`,
      tipoInmuebleDeseado: fb.propertyType || "apartment",
      tipoNegocioDeseado: fb.transactionType || "venta",
      ciudadDeseada: fb.city || "Bogotá",
      zonaDeseada: mainBarrio,
      addressNeighborhood: mainBarrio,
      presupuestoMax: pptoMaxNum ? String(pptoMaxNum) : (fb.presupuestoMax ? String(fb.presupuestoMax) : "0"),
      presupuestoMin: "0",
      areaMin: areaMinNum ? String(areaMinNum) : (fb.areaMin ? String(fb.areaMin) : null),
      habitacionesMin: bedroomsMinNum || null,
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
      // Regla de vigencia estricta: únicamente inmuebles captados o republicados en los últimos 15 días
      const repCount = Number(prop.republicacionesCount || 0);
      const propEffectiveDate = (repCount > 0 && prop.fechaUltimaPublicacion)
        ? prop.fechaUltimaPublicacion
        : (prop.fechaUltimaPublicacion || prop.createdAt);
      const propAgeDays = propEffectiveDate ? Math.max(0, Math.floor((Date.now() - new Date(propEffectiveDate).getTime()) / (1000 * 60 * 60 * 24))) : 0;
      if (propAgeDays > 15) continue;

      const explanation = explicarMatch(candidateReq, prop, fb, undefined, extractedBarrios);
      if (explanation.score >= 80) {
        const propPhone = extractRealPhone(prop);
        const propWaLink = propPhone ? `https://wa.me/${propPhone}` : null;

        // Buscar si esta propiedad ya tiene algún match registrado en propertyMatches para referencia
        let existingPmId: number | null = null;
        try {
          const existingPm = await db
            .select({ id: propertyMatches.id })
            .from(propertyMatches)
            .where(eq(propertyMatches.propertyId, prop.id))
            .limit(1);
          existingPmId = existingPm?.[0]?.id || null;
        } catch {
          existingPmId = null;
        }

        matchedItems.push({
          matchId: existingPmId,
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

    const header = `🎯 *VECY MATCH ENGINE — RESULTADO DE BÚSQUEDA (ÚLTIMOS 15 DÍAS)*`;
    const criteria = `📋 *Criterios Extraídos de la Demanda:*\n` +
      `• *Inmueble:* ${candidateReq.propertyType || candidateReq.tipoInmuebleDeseado} en ${candidateReq.transactionType || candidateReq.tipoNegocioDeseado}\n` +
      `• *Presupuesto Máx:* ${formatCOP(candidateReq.presupuestoMax)}\n` +
      `• *Metraje Mínimo:* ${candidateReq.areaMin ? `${candidateReq.areaMin} m²` : 'No especificado'}\n` +
      `• *Habitaciones Mínimas:* ${candidateReq.habitacionesMin ? `${candidateReq.habitacionesMin} Hab` : 'No especificadas'}\n` +
      `• *Zonas / Sectores:* ${sectoresLabel}`;
    const emptyDiag = `⛔ *No se encontraron ofertas compatibles (Score ≥ 80%) captadas en los últimos 15 días.* \n\nVerifiqué todos los inmuebles activos captados en la red durante los últimos 15 días y actualmente ninguno alcanza el umbral mínimo del 80% con estos requisitos específicos.`;
    const reportText = formatMatchReport(header, criteria, matchedItems, isAdmin, adminDashboardUrl, emptyDiag);

    return {
      isMatchQuery: true,
      isAuthorizedAdmin: isAdmin,
      queryType: 'demand_search',
      querySummary: `Demanda: ${candidateReq.tipoInmuebleDeseado} en ${sectoresLabel} (${formatCOP(candidateReq.presupuestoMax)})`,
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
    name: `Inmueble Administrador (${fb.barrio || fb.city || 'Bogotá'})`,
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
    // Regla de vigencia: solo demandas activas captadas en los últimos 15 días
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

    const header = `🎯 *VECY MATCH ENGINE — RESULTADO DE BÚSQUEDA (ÚLTIMOS 15 DÍAS)*`;
    const criteria = `🏠 *Criterios Extraídos de la Oferta:*\n` +
      `• *Inmueble:* ${candidateProp.propertyType} en ${candidateProp.transactionType}\n` +
      `• *Ubicación:* ${candidateProp.neighborhood || candidateProp.city}\n` +
      `• *Precio:* ${formatCOP(candidateProp.price || candidateProp.rentPrice)}\n` +
      `• *Metraje:* ${candidateProp.area ? `${candidateProp.area} m²` : 'No especificado'}\n` +
      `• *Habitaciones:* ${candidateProp.bedrooms ? `${candidateProp.bedrooms} Hab` : 'No especificadas'}`;
    const emptyDiag = `⛔ *No se encontraron demandas compatibles (Score ≥ 80%) captadas en los últimos 15 días.* \n\nVerifiqué las demandas activas de la red durante los últimos 15 días y actualmente ningún cliente comprador o arrendatario coincide con las características de este inmueble.`;
    const reportText = formatMatchReport(header, criteria, matchedItems, isAdmin, adminDashboardUrl, emptyDiag);

    return {
      isMatchQuery: true,
      isAuthorizedAdmin: isAdmin,
      queryType: 'offer_search',
      querySummary: `Oferta: ${candidateProp.propertyType} en ${candidateProp.neighborhood || candidateProp.city} (${formatCOP(candidateProp.price || candidateProp.rentPrice)})`,
      totalFound: matchedItems.length,
      matches: matchedItems,
      formattedReport: reportText,
      adminDashboardUrl
    };
}
