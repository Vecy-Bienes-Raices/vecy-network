import fs from "fs";
import path from "path";
import axios from "axios";
import crypto from "crypto";
import { eq, and, sql, gte, desc, or, isNotNull } from "drizzle-orm";

import { getDb, getRawSql } from "../../../db";
import {
  properties,
  requirements,
  users,
  propertyImages,
  InsertProperty,
  InsertRequirement,
  pendingSessions,
  propertyMatches,
  messages as dbMessages,
  conversations as dbConversations,
  propertyPublicationHistory,
  inmobiliarioLexicon,
  matchFeedback,
} from "../../../../drizzle/schema";

import { invokeLLM } from "../../llm";
import { storagePut } from "../../../storage";
import {
  validarZona,
  normalizarTextoGeografico,
  desambiguarBarriosCompuestos,
  deducirGeografiaTripartita,
  resolveIntersectionToBarrio,
  isCityOrGenericZone,
  extractPureBarrio,
} from "../../geography";
import { validateCity } from "../../divipola";
import {
  findMatchesForProperty,
  findMatchesForRequirement,
  isNonRealEstateText,
  isHollowListing,
  parseStreetCarreraBoundaries,
} from "../../matching";
import { lookupBarriosByPerimeter } from "../../geo-lookup";
import { transcribeAudio } from "../../voiceTranscription";
import {
  parseColombianListing,
  parseOutdoorAreas,
  isOutdoorAreaPreceding,
  parseAdminFee,
} from "../../../../shared/colombianRealEstateParser";
import { esDominioPermitido, extractPortalAndListingId } from "../../scraper";
import {
  resolveNameAndGender,
  getCanonicalCompositeName,
  VECY_COMMERCIAL_INFO,
} from "../../nameAndGenderResolver";
import {
  brokerDirectoryCache,
  isGenericName,
  extractColombianPhoneFromText,
  normalizeAdvisorPhone,
  isLidIdentifier,
  lookupAdvisorSync,
  preserveVerifiedAdvisorContact,
  saveOrUpdateAdvisor,
  initAdvisorsDirectory,
  lookupAdvisor,
} from "../../advisors";

import { JanIAResult, FlyerVisionResult, janiaResultSchema } from "../types";
import {
  generarHashMensaje,
  isPhoneNumberNotPrice,
  extractFirstName,
  parseColombianPriceOrBudget,
  extractFallbackDataFromText,
  KNOWN_BARRIOS_SORTED_ITEMS,
  enrichLexiconFromText,
  resolveContactPhone,
  normalizePhoneNumber,
  calcularCalificacionCompletitud,
  getEmojiForCalificacion,
  translatePropertyType,
  translateTransactionType,
  getTimeOfDayGreetingForUser,
  cleanUnescapedQuotesInJSON,
  parseSafeJSON,
  sanitizeResponseMarkdown,
  getGreetingByTime,
  getColombiaNow,
  hasRealEstateTextKeyword,
  capitalize,
  sanitizeGeoString,
  buildFlyerBreakdownText,
} from "../parsers";
import {
  isOutsideWorkingHours,
  esMensajeSpamOBasura,
  scrapeUrlWithBypass,
  evaluateMultiItemHeuristics,
  splitMultiItemMessage,
  splitMultiPropertyMessage,
  checkStrictOffTopic,
} from "../heuristics";
import { extractFlyerVision, extractFlyerVisionSafely } from "../vision";
import {
  REPUTATION_HOOK,
  buildIncompleteDataMessage,
  buildGroupIncompleteMessage,
  buildSystemPrompt,
  formatColombiaDateTime,
  obtenerCamposRequeridosYPreguntas,
} from "../prompts";
import {
  cleanSessionJid,
  muteSession,
  isSessionMuted,
  getPendingSession,
  setPendingSession,
  deletePendingSession,
  resolveRealName,
  hasGreetedUserToday,
  checkAlreadyGreeted,
  getRecentChatHistory,
  getLiveStats,
  analyzeSender,
} from "../sessionManager";


export async function handleDetectedMatches(
  matches: any[],
  isProperty: boolean,
  savedRecord: any,
  userId: string,
  realName: string
): Promise<{ response: string; mentions: string[]; extraDMs: { jid: string; message: string; viaMainBot?: boolean }[]; sendReputationHook?: boolean }> {
  const mentions: string[] = [];
  const matchBlocks: string[] = [];
  const extraDMs: { jid: string; message: string; viaMainBot?: boolean }[] = [];
  const savedDateTime = formatColombiaDateTime(savedRecord.createdAt || new Date());
  const savedRawPhone = userId.split('@')[0];
  const savedJid = userId.includes('@') ? userId : `${userId}@c.us`;

  const getReqText = (item: any) => {

    if (item.rawText && item.rawText.trim()) return item.rawText.trim();
    if (item.caracteristicasDeseadas?.wants?.details) {
      return `${item.name || 'Requerimiento'} - ${item.caracteristicasDeseadas.wants.details}`;
    }
    return item.name || 'Sin descripción';
  };

  const getPropText = (item: any) => {
    if (item.rawText && item.rawText.trim()) return item.rawText.trim();
    if (item.description && item.description.trim()) return item.description.trim();
    if (item.amenities?.gives?.details) {
      return `${item.name || 'Propiedad'} - ${item.amenities.gives.details}`;
    }
    return item.name || 'Sin descripción';
  };

  for (const matchedItem of matches) {
    const score = matchedItem.score || 70;
    const matchId = matchedItem.matchId;

    const matchedDateTime = formatColombiaDateTime(matchedItem.createdAt || new Date());
    const matchedPhone = matchedItem.idUsuarioWhatsapp || '';
    const matchedRawPhone = matchedPhone.split('@')[0];
    const matchedJid = matchedPhone.includes('@') ? matchedPhone : `${matchedPhone}@c.us`;

    if (matchedJid && !mentions.includes(matchedJid)) {
      mentions.push(matchedJid);
    }

    const reqItem = isProperty ? matchedItem : savedRecord;
    const propItem = isProperty ? savedRecord : matchedItem;

    const reqDateTime = isProperty ? matchedDateTime : savedDateTime;
    const propDateTime = isProperty ? savedDateTime : matchedDateTime;

    const block = `🎉🎈 *¡COINCIDENCIA DE NEGOCIO DETECTADA!* (Coincidencia: ${score.toFixed(0)}%) 🎈🎉
📌 *Código de Coincidencia:* #M${matchId}

📣 *REQUERIMIENTO* 📣
• 🏢 *INMUEBLE:* ${translatePropertyType(reqItem.tipoInmuebleDeseado || reqItem.propertyType || 'inmueble')}
• 💼 *NEGOCIO:* ${translateTransactionType(reqItem.tipoNegocioDeseado || reqItem.transactionType || 'compra')}
• 📅 *FECHA DE ENVÍO:* ${reqDateTime.dateStr}
• ⏰ *HORA DE ENVÍO:* ${reqDateTime.timeStr}
• 👤 *Autor:* @${isProperty ? matchedRawPhone : savedRawPhone}
• 💬 *PUBLICACIÓN:* ${getReqText(reqItem)}
• 📞 *CONTACTO:* [Confirmación Pendiente - Se envió DM privado 📩]

────────────────────────────────

🏠 *PROPIEDAD* 🏠
• 🏢 *INMUEBLE:* ${translatePropertyType(propItem.propertyType || 'inmueble')}
• 💼 *NEGOCIO:* ${translateTransactionType(propItem.transactionType || 'venta')}
• 📅 *FECHA DE ENVÍO:* ${propDateTime.dateStr}
• ⏰ *HORA DE ENVÍO:* ${propDateTime.timeStr}
• 👤 *Autor:* @${isProperty ? savedRawPhone : matchedRawPhone}
• 💬 *PUBLICACIÓN:* ${getPropText(propItem)}
• 📞 *CONTACTO:* [Confirmación Pendiente - Se envió DM privado 📩]`;

    matchBlocks.push(block);

    // Obtener nombres de base de datos
    let savedUserName = realName;
    let matchedUserName = "Colega";

    try {
      const db = await getDb();
      if (db) {
        const [su] = await db.select().from(users).where(eq(users.phone, savedRawPhone)).limit(1);
        if (su && su.name && su.name.trim() !== "") {
          savedUserName = su.name;
        }

        const [mu] = await db.select().from(users).where(eq(users.phone, matchedRawPhone)).limit(1);
        if (mu && mu.name && mu.name.trim() !== "") {
          matchedUserName = mu.name;
        }
      }
    } catch (e) {
      console.warn("[JanIA-Match] Error buscando nombres reales de usuarios:", e);
    }

    const savedFirstName = savedUserName.split(' ')[0];
    const matchedFirstName = matchedUserName.split(' ')[0];

    const ownerName = isProperty ? savedFirstName : matchedFirstName;
    const ownerJid = isProperty ? savedJid : matchedJid;
    const ownerDateTime = isProperty ? savedDateTime : matchedDateTime;

    const seekerName = isProperty ? matchedFirstName : savedFirstName;
    const seekerJid = isProperty ? matchedJid : savedJid;
    const seekerDateTime = isProperty ? savedDateTime : matchedDateTime;

    // DO NOT send DMs to the buyers and sellers (keep matches private for manual mediation and billing)
    // We comment out or delete the owner/seeker DM logic and do not push them to extraDMs.

    // Enviar notificación por DM al administrador (3192919978)
    const adminPhone = "573192919978";
    const adminJid = `${adminPhone}@c.us`;
    const adminMessage = `📢 *NUEVA COINCIDENCIA DETECTADA* (Coincidencia: ${score.toFixed(0)}%)
📌 *Código:* #M${matchId}

📣 *REQUERIMIENTO*
• Autor: ${isProperty ? matchedUserName : savedUserName}
• Teléfono: +${isProperty ? matchedRawPhone : savedRawPhone}
• Detalle: ${getReqText(reqItem)}

🏠 *PROPIEDAD*
• Autor: ${isProperty ? savedUserName : matchedUserName}
• Teléfono: +${isProperty ? savedRawPhone : matchedRawPhone}
• Detalle: ${getPropText(propItem)}
• Precio: ${propItem.price ? Number(propItem.price).toLocaleString('es-CO') + ' COP' : 'N/A'}`;

    // Notificación al admin: usar el bot principal (whatsapp-web.js) para garantizar entrega
    extraDMs.push({ jid: adminJid, message: adminMessage, viaMainBot: true });
  }

  // Notificaciones masivas de match en WhatsApp están DESACTIVADAS (solo se consultan en la web vecy.co)
  return {
    response: "",
    mentions: [],
    extraDMs,
    sendReputationHook: matches.length > 0
  };
}

function sanitizePropertyType(type: string): "apartment" | "house" | "building" | "warehouse" | "farm" | "hotel" | "office" | "land" | "commercial" | "loft" | "consultorio" | "cabin" {
  if (!type) return "apartment";
  const t = type.toLowerCase().trim();
  if (t === "consultorio" || t.includes("consultorio") || t.includes("odontol") || t.includes("médic") || t.includes("medic") || t === "office_medical") return "consultorio";
  if (t === "cabin" || t.includes("cabaña") || t.includes("cabana") || t.includes("cabañas") || t.includes("cabanas")) return "cabin";
  if (t === "house" || t === "casa" || t.includes("chalet") || t.includes("quinta") || t.includes("campestre")) return "house";
  if (t === "building" || t === "edificio") return "building";
  if (t === "warehouse" || t === "bodega") return "warehouse";
  if (t === "farm" || t === "finca") return "farm";
  if (t === "hotel" || t.includes("hostal") || t.includes("hospedaje") || t.includes("motel") || t.includes("hostel")) return "hotel";
  if (t === "office" || t === "oficina" || t.includes("oficina")) return "office";
  if (t === "land" || t === "lote" || t === "terreno" || t.includes("lote") || t.includes("terreno")) return "land";
  if (t === "commercial" || t === "local" || t === "locales" || t.includes("local comercial") || t.includes("locales comerciales") || t === "comercial" || t.includes("local")) return "commercial";
  if (t === "loft" || t.includes("loft") || t.includes("apartaestudio") || t.includes("apartasuite")) return "loft";
  if (t === "apartment" || t === "apartamento" || t === "apto" || t.includes("apto") || t.includes("apartamento") || t.includes("penthouse")) return "apartment";
  return "apartment";
}

function sanitizeTransactionType(type: string): "venta" | "arriendo" | "venta_o_arriendo" | "arriendo_temporal" | "arriendo_con_opcion_de_compra" | "permuta" | "venta_permuta" | "aporte" {
  if (!type) return "venta";
  const t = type.toLowerCase().trim().replace(/\s+/g, "_");
  if (t === "venta" || t === "vender" || t === "compra" || t === "comprar") return "venta";
  if (t === "venta_o_arriendo" || t.includes("venta_o_arriendo") || t.includes("venta o arriendo") || t.includes("vendo o arriendo") || t.includes("venta_arriendo")) return "venta_o_arriendo";
  if (t === "arriendo_con_opcion_de_compra" || t.includes("opcion_de_compra") || t.includes("opcion de compra") || t.includes("opción de compra") || t.includes("con opcion") || t.includes("con opción")) return "arriendo_con_opcion_de_compra";
  if (t === "arriendo" || t === "alquiler" || t === "renta" || t === "rentar" || t === "arrendar") return "arriendo";
  if (t === "arriendo_temporal" || t === "temporal" || t === "vacacional" || t === "vacaciones") return "arriendo_temporal";
  if (t === "venta_permuta" || t.includes("venta_permuta") || t.includes("venta permuta") || t.includes("venpermuto") || (t.includes("venta") && t.includes("permuta"))) return "venta_permuta";
  if (t === "permuta" || t === "permuto" || t === "cambio" || t.includes("permuta")) return "permuta";
  if (t === "aporte" || t.includes("aporte") || t === "proyecto") return "aporte";
  return "venta";
}

// Captura MÚLTIPLES tipos de negocio cuando el usuario menciona varias modalidades
function sanitizeTransactionTypes(raw: string | string[] | undefined): string[] {
  const input = Array.isArray(raw) ? raw.join(" ") : (raw || "");
  const n = input.toLowerCase();
  const result: string[] = [];
  // Detectar primero los tipos compuestos para evitar falsos positivos en los simples
  if (n.includes("venta o arriendo") || n.includes("vendo o arriendo") || n.includes("venta_o_arriendo")) result.push("venta_o_arriendo");
  if (n.includes("opcion de compra") || n.includes("opción de compra") || n.includes("con opcion") || n.includes("con opción") || n.includes("arriendo_con_opcion")) result.push("arriendo_con_opcion_de_compra");
  if ((n.includes("venta") && n.includes("permuta")) || n.includes("venta_permuta") || n.includes("venpermuto")) result.push("venta_permuta");
  // Luego los tipos simples (solo si no ya cubiertos por compuestos)
  const hasVentaOArriendo = result.includes("venta_o_arriendo");
  const hasVentaPermuta = result.includes("venta_permuta");
  if (!hasVentaOArriendo && !hasVentaPermuta) {
    if (n.includes("venta") || n.includes("vender") || n.includes("compra") || n.includes("comprar")) result.push("venta");
  }
  if (!hasVentaOArriendo && !result.includes("arriendo_con_opcion_de_compra")) {
    if (n.includes("arriendo") || n.includes("alquiler") || n.includes("renta") || n.includes("rentar")) result.push("arriendo");
  }
  if (n.includes("temporal") || n.includes("vacacional") || n.includes("vacaciones")) result.push("arriendo_temporal");
  if (!hasVentaPermuta) {
    if (n.includes("permuta") || n.includes("permuto") ||
      n.includes("recibo propiedad") || n.includes("recibo vehiculo") || n.includes("parte de pago") ||
      n.includes("cambio de inmueble")) result.push("permuta");
  }
  if (n.includes("aporte") || n.includes("participo en proyecto") || n.includes("constructora") ||
    n.includes("unidades a cambio") || n.includes("utilidades")) result.push("aporte");
  return result.length > 0 ? result : [sanitizeTransactionType(input)];
}

function sanitizeCurrency(curr: string): "COP" | "USD" {
  if (!curr) return "COP";
  const c = curr.toUpperCase().trim();
  if (c === "USD" || c === "DOLARES" || c === "DOLAR") return "USD";
  return "COP";
}

function safeSlice(val: any, limit: number): string | undefined {
  if (val === undefined || val === null) return undefined;
  return String(val).slice(0, limit);
}

async function findOrCreateUserByPhone(phone: string, realName: string) {
  const db = await getDb();
  if (!db) return null;

  const cleanPhone = phone.split(':')[0];

  // 1. Buscar por teléfono en la base de datos
  let user = await db.select().from(users).where(eq(users.phone, cleanPhone)).limit(1).then((r: any) => r[0]);

  // 2. Si no lo encuentra, buscar por openId: `wa-${cleanPhone}`
  if (!user) {
    user = await db.select().from(users).where(eq(users.openId, `wa-${cleanPhone}`)).limit(1).then((r: any) => r[0]);
  }

  // 3. Si no existe, crearlo
  if (!user) {
    const openId = `wa-${cleanPhone}`;
    console.log(`[JanIA-findOrCreateUserByPhone] Creando nuevo usuario para WhatsApp: ${realName} (+${cleanPhone})`);
    try {
      const [newUser] = await db.insert(users).values({
        openId,
        name: realName,
        phone: cleanPhone,
        role: "agent",
        loginMethod: "whatsapp"
      }).returning();
      user = newUser;
    } catch (insertErr: any) {
      if (insertErr.code === '23505' || String(insertErr).includes('unique constraint')) {
        console.log(`[JanIA-findOrCreateUserByPhone] Colisión concurrente detectada para ${cleanPhone}. Re-buscando usuario...`);
        user = await db.select().from(users).where(eq(users.openId, openId)).limit(1).then((r: any) => r[0]);
      } else {
        throw insertErr;
      }
    }
  } else {
    // Si ya existe pero el nombre es genérico (o era "Nuevo Asesor"), y tenemos un nombre real, actualizarlo
    if (realName && !isGenericName(realName) && isGenericName(user.name)) {
      console.log(`[JanIA-findOrCreateUserByPhone] Actualizando nombre de usuario para ID ${user.id} a ${realName}`);
      const [updatedUser] = await db.update(users).set({ name: realName }).where(eq(users.id, user.id)).returning();
      user = updatedUser;
    }
  }

  return user;
}

export async function initBrokerDirectory() {
  try {
    await initAdvisorsDirectory();
  } catch (err: any) {
    console.warn(`[JanIA-Directory] Advertencia cargando directorio inicial:`, err?.message || err);
  }
}

export async function propagateBrokerPhoneAcrossAllListings(params: {
  rawPhoneOrText?: string | null;
  brokerName?: string | null;
  oldPhoneOrLid?: string | null;
  sourceGroup?: string | null;
  agency?: string | null;
  notes?: string | null;
}): Promise<{ updatedProps: number; updatedReqs: number; cleanPhone: string | null }> {
  const result = await saveOrUpdateAdvisor({
    phone: params.rawPhoneOrText,
    name: params.brokerName,
    oldPhoneOrLid: params.oldPhoneOrLid,
    sourceGroup: params.sourceGroup,
    agency: params.agency,
    notes: params.notes,
  });
  return {
    updatedProps: result.updatedProps,
    updatedReqs: result.updatedReqs,
    cleanPhone: result.cleanPhone,
  };
}

// Inicialización automática diferida del directorio permanente de asesores
setTimeout(() => {
  initBrokerDirectory().catch(() => { });
}, 3000);

export async function handleAmendmentUpdate(userId: string, text: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const rawPhone = userId.split('@')[0].split(':')[0].replace(/\D/g, "");
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const cleanTextLower = text.toLowerCase().trim();
  const isAmendmentTrigger = (
    cleanTextLower.startsWith("correccion") ||
    cleanTextLower.startsWith("corrección") ||
    cleanTextLower.startsWith("fe de erratas") ||
    cleanTextLower.startsWith("fe de errata") ||
    cleanTextLower.startsWith("rectificacion") ||
    cleanTextLower.startsWith("rectificación") ||
    cleanTextLower.startsWith("ajuste:") ||
    cleanTextLower.startsWith("ajuste ") ||
    cleanTextLower.startsWith("disculpen")
  );

  if (!isAmendmentTrigger) return false;

  const fallbackData = extractFallbackDataFromText(text);

  // 1. Buscar requerimiento del usuario en las últimas 2 horas
  const lastReqs = await db.select().from(requirements)
    .where(and(
      eq(requirements.idUsuarioWhatsapp, rawPhone),
      gte(requirements.createdAt, twoHoursAgo)
    ))
    .orderBy(desc(requirements.createdAt))
    .limit(1);

  if (lastReqs.length > 0) {
    const req = lastReqs[0];
    const updates: any = {};

    if (cleanTextLower.includes("parqueadero") && fallbackData.garages > 0) {
      updates.parqueaderosMin = fallbackData.garages;
    }
    if ((cleanTextLower.includes("habitación") || cleanTextLower.includes("habitacion") || cleanTextLower.includes("alcoba")) && fallbackData.bedrooms > 0) {
      updates.habitacionesMin = fallbackData.bedrooms;
    }
    if (cleanTextLower.includes("baño") && fallbackData.bathrooms > 0) {
      updates.banosMin = fallbackData.bathrooms;
    }
    if ((cleanTextLower.includes("precio") || cleanTextLower.includes("presupuesto")) && fallbackData.price > 0) {
      updates.presupuestoMax = String(fallbackData.price);
    }
    if ((cleanTextLower.includes("área") || cleanTextLower.includes("area")) && fallbackData.area > 0) {
      updates.areaMin = String(fallbackData.area);
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      await db.update(requirements).set(updates).where(eq(requirements.id, req.id));
      console.log(`[JANIA-AMENDMENT] ✅ Requerimiento #${req.id} actualizado silenciosamente en BD (Ventana 2h):`, updates);

      const { executeMatchEngine } = await import("../../matching");
      setImmediate(() => {
        executeMatchEngine(null, req.id).catch((err: any) => console.error("Error executing match engine on amendment:", err));
      });
      return true;
    }
  }

  // 2. Buscar propiedad del usuario en las últimas 2 horas
  const lastProps = await db.select().from(properties)
    .where(and(
      eq(properties.idUsuarioWhatsapp, rawPhone),
      gte(properties.createdAt, twoHoursAgo)
    ))
    .orderBy(desc(properties.createdAt))
    .limit(1);

  if (lastProps.length > 0) {
    const prop = lastProps[0];
    const updates: any = {};

    if (cleanTextLower.includes("parqueadero") && fallbackData.garages > 0) {
      updates.garages = fallbackData.garages;
    }
    if ((cleanTextLower.includes("habitación") || cleanTextLower.includes("habitacion") || cleanTextLower.includes("alcoba")) && fallbackData.bedrooms > 0) {
      updates.bedrooms = fallbackData.bedrooms;
    }
    if (cleanTextLower.includes("baño") && fallbackData.bathrooms > 0) {
      updates.bathrooms = fallbackData.bathrooms;
    }
    if ((cleanTextLower.includes("precio") || cleanTextLower.includes("valor")) && fallbackData.price > 0) {
      updates.price = String(fallbackData.price);
    }
    if ((cleanTextLower.includes("área") || cleanTextLower.includes("area")) && fallbackData.area > 0) {
      updates.areaTotal = String(fallbackData.area);
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      await db.update(properties).set(updates).where(eq(properties.id, prop.id));
      console.log(`[JANIA-AMENDMENT] ✅ Propiedad #${prop.id} actualizada silenciosamente en BD (Ventana 2h):`, updates);

      const { executeMatchEngine } = await import("../../matching");
      setImmediate(() => {
        executeMatchEngine(prop.id, null).catch((err: any) => console.error("Error executing match engine on amendment:", err));
      });
      return true;
    }
  }

  return false;
}

async function saveProperty(data: any, userId: string, realName: string, imageBuffer?: string, pdfBuffer?: string, pdfMimeType?: string) {
  const db = await getDb();
  if (!db) return null;

  if (isNonRealEstateText(data.rawText) || isNonRealEstateText(data.name) || isNonRealEstateText(data.description)) {
    console.log(`[JanIA-Reject] 🚫 Inmueble descartado: mensaje no corresponde a finca raíz (materiales/canteras/maquinaria): ${data.name || data.rawText}`);
    return null;
  }

  // Guardarraíl Crítico v31.85: Si el texto del inmueble es inequívocamente una DEMANDA, JAMÁS insertar en properties
  const rawLower = `${data.rawText || ""} ${data.name || ""}`.toLowerCase();
  const isStrictDemandInProperty = /\b(?:busco|buscamos|se\s*busca|estoy\s*buscando|estamos\s*buscando|cliente\s*busca|para\s*compra\s*ya|solicito\s*para\s*compra|compro\s*apto|compro\s*casa|necesito\s*apto|requiero\s*apto)\b/i.test(rawLower) &&
    !/\b(?:vendo|se\s*vende|ofrezco\s*(?:en\s*venta|en\s*arriendo)|se\s*arrienda|arriendo)\b/i.test(rawLower);
  if (isStrictDemandInProperty) {
    console.error(`[JanIA-Guardrail v31.85] ⛔ BLOQUEO CRÍTICO: Se intentó guardar una DEMANDA en la tabla properties. Abortando inserción: "${rawLower.substring(0, 80)}..."`);
    return null;
  }

  const rawTextContent = `${data.rawText || ""} ${data.description || ""} ${data.name || ""}`;
  const effectivePhone = resolveContactPhone(userId, rawTextContent, realName, data.idUsuarioWhatsapp);
  const rawPhone = effectivePhone;
  const user = await findOrCreateUserByPhone(effectivePhone, realName);

  let imageUrl: string | undefined;
  if (imageBuffer) {
    try {
      console.log(`[JanIA-SaveProperty] Subiendo imagen flyer de WhatsApp para ${realName}...`);
      const buffer = Buffer.from(imageBuffer, 'base64');
      const filename = `flyers/wa_${Date.now()}_${rawPhone}.jpg`;
      const uploadResult = await storagePut(filename, buffer, 'image/jpeg');
      imageUrl = uploadResult.url;
      console.log(`[JanIA-SaveProperty] Imagen subida exitosamente: ${imageUrl}`);
    } catch (err) {
      console.error("[JanIA-SaveProperty] Error subiendo imagen:", err);
    }
  }

  let pdfUrl: string | undefined;
  if (pdfBuffer) {
    try {
      console.log(`[JanIA-SaveProperty] Subiendo PDF brochure de WhatsApp para ${realName}...`);
      const buffer = Buffer.from(pdfBuffer, 'base64');
      const filename = `documents/doc_${Date.now()}_${rawPhone}.pdf`;
      const uploadResult = await storagePut(filename, buffer, pdfMimeType || 'application/pdf');
      pdfUrl = uploadResult.url;
      console.log(`[JanIA-SaveProperty] PDF subido exitosamente: ${pdfUrl}`);
    } catch (err) {
      console.error("[JanIA-SaveProperty] Error subiendo PDF:", err);
    }
  }

  // Para VRIF Core v1.0, guardamos el flyer directo de WhatsApp y URLs adicionales
  const finalImages: string[] = [];
  if (imageUrl) {
    finalImages.push(imageUrl);
  }
  if (Array.isArray(data.images)) {
    for (const img of data.images) {
      if (img && typeof img === 'string' && !finalImages.includes(img)) finalImages.push(img);
    }
  }

  if (pdfUrl) {
    data.externalUrl = data.externalUrl || pdfUrl;
    data.enlaceOrigen = data.enlaceOrigen || pdfUrl;
  }

  const amenitiesObj = {
    gives: data.gives || data.amenities?.gives,
    wants: data.wants || data.amenities?.wants,
    isCollaborativePool: data.isCollaborativePool !== undefined ? data.isCollaborativePool : data.amenities?.isCollaborativePool,
    interiorExterior: data.interiorExterior || data.amenities?.interiorExterior,
    cuartoBanoServicio: data.cuartoBanoServicio || data.amenities?.cuartoBanoServicio,
    cocina: data.cocina || data.amenities?.cocina,
    lavanderiaIndependiente: data.lavanderiaIndependiente || data.amenities?.lavanderiaIndependiente,
    tipoPisos: data.tipoPisos || data.amenities?.tipoPisos,
    depositos: data.depositos || data.amenities?.depositos,
    comisiones: data.comisiones || data.amenities?.comisiones,
    antiguedad: data.antiguedad || data.amenities?.antiguedad
  };

  // ── DESAMBIGUACIÓN GEOGRÁFICA v18.0 ──────────────────────────────────────────
  // Detectar barrios compuestos/inventados (ej. "Chicó Refugio") y separar en zonas múltiples.
  if (data.zone && typeof data.zone === "string") {
    const barriosDesambiguados = desambiguarBarriosCompuestos(data.zone);
    if (barriosDesambiguados.length > 1) {
      data.zone = barriosDesambiguados.join(", ");
      data.addressNeighborhood = barriosDesambiguados[0]; // Barrio principal canónico
      console.log(`[JanIA-GeoDisambiguate] Barrio compuesto: "${data.zone}"`);
    }
  }

  // ── AUTO-DETECCIÓN Y BIFURCACIÓN DE PRECIO PARA FICHAS DUALES (venta_o_arriendo) v22.4 ────────
  // price = precio de VENTA · rentPrice = canon NETO de arriendo (sin administración)
  const rawLowerTx = (data.rawText || "").toLowerCase();
  let txTypeForSplit = (data.transactionType || "").toLowerCase();

  const hasExplicitRent = rawLowerTx.includes("arriendo") || rawLowerTx.includes("canon") || rawLowerTx.includes("renta");
  const hasExplicitSale = rawLowerTx.includes("venta") || rawLowerTx.includes("precio de venta");

  if (hasExplicitRent && hasExplicitSale && (txTypeForSplit === "venta" || txTypeForSplit === "arriendo")) {
    const rentMatchTest = rawLowerTx.match(/(?:valor\s*arriendo|arriendo|canon|renta)\s*:?\s*\$?([\d.,]+)\s*(mil\s*millones?|millones?|m|M)?/i);
    const saleMatchTest = rawLowerTx.match(/(?:precio\s*(?:de\s*)?venta|venta)\s*:?\s*\$?([\d.,]+)\s*(mil\s*millones?|millones?|mm|mlls|m|M)?/i);
    if (rentMatchTest && saleMatchTest) {
      txTypeForSplit = "venta_o_arriendo";
      data.transactionType = "venta_o_arriendo";
      console.log(`[JanIA-DualDetector] Promovido a 'venta_o_arriendo' por presencia dual de arriendo y venta en rawText.`);
    }
  }

  if (txTypeForSplit === "venta_o_arriendo" || txTypeForSplit === "arriendo_con_opcion_de_compra") {
    const currentPrice = data.price ? parseFloat(String(data.price)) : 0;
    const currentRentP = data.rentPrice ? parseFloat(String(data.rentPrice)) : 0;
    const priceSaleField = data.priceSale ? parseFloat(String(data.priceSale)) : 0;
    const priceRentField = data.priceRent ? parseFloat(String(data.priceRent)) : 0;

    let finalSalePrice = currentPrice > 100_000_000 ? currentPrice : priceSaleField;
    let finalRentPrice = currentRentP > 0 ? currentRentP : priceRentField;

    // Buscar canon explícito en rawText si no está poblado
    if (finalRentPrice <= 0) {
      const rentMatch = rawLowerTx.match(/(?:valor\s*arriendo|arriendo|canon|renta)\s*:?\s*\$?([\d.,]+)\s*(mil\s*millones?|millones?|m|M)?/i);
      if (rentMatch) {
        let rawRNum = parseFloat(rentMatch[1].replace(/[.,]/g, ""));
        const unitR = (rentMatch[2] || "").toLowerCase();
        const multR = unitR.includes("mil millon") ? 1_000_000_000 : (unitR.includes("millon") || unitR === "m") ? 1_000_000 : rawRNum < 10_000 ? 1_000_000 : 1;
        finalRentPrice = rawRNum * multR;
      }
    }

    // Buscar precio de venta explícito en rawText si no está poblado o si era menor a 100M
    if (finalSalePrice < 100_000_000) {
      const saleMatch = rawLowerTx.match(/(?:precio\s*(?:de\s*)?venta|venta)\s*:?\s*\$?([\d.,]+)\s*(mil\s*millones?|millones?|mm|mlls)?/i);
      if (saleMatch) {
        let rawSNum = parseFloat(saleMatch[1].replace(/[.,]/g, ""));
        const unitS = (saleMatch[2] || "").toLowerCase();
        const multS = unitS.includes("mil millon") ? 1_000_000_000 : (unitS.includes("millon") || unitS.includes("mm") || unitS.includes("mlls")) ? 1_000_000 : rawSNum < 10_000 ? 1_000_000 : 1;
        const computedS = rawSNum * multS;
        if (computedS >= 100_000_000) finalSalePrice = computedS;
      }
    }

    if (finalSalePrice > 0) data.price = finalSalePrice;
    if (finalRentPrice > 0) {
      const adminFeeVal = data.adminFee ? parseFloat(String(data.adminFee)) : 0;
      if (adminFeeVal > 0 && finalRentPrice >= adminFeeVal && finalRentPrice < 100_000_000) {
        data.rentPrice = finalRentPrice - adminFeeVal; // Canon neto
      } else {
        data.rentPrice = finalRentPrice;
      }
    }
    console.log(`[JanIA-PriceSplit] ${txTypeForSplit} → price(venta)=${data.price} | rentPrice(canon neto)=${data.rentPrice}`);
  }

  // ── SANIDAD FINANCIERA ESTRICTA DOCTRINAL v22.4 ─────────────
  // 1. Para inmuebles en arriendo puro (arriendo / arriendo_temporal):
  //    data.price (Precio de Venta) NUNCA debe contener el valor del canon (ej. $9.900.000).
  //    data.price debe ser "0". El canon debe ir exclusivamente en data.rentPrice.
  if (txTypeForSplit === "arriendo" || txTypeForSplit === "arriendo_temporal") {
    const curP = data.price ? parseFloat(String(data.price)) : 0;
    const curR = data.rentPrice ? parseFloat(String(data.rentPrice)) : 0;
    if (curR <= 0 && curP > 0 && curP < 100_000_000) {
      data.rentPrice = curP;
    }
    data.price = "0"; // Cero absoluto de venta para inmuebles de arriendo puro
  }

  // 2. Para inmuebles en venta pura (venta):
  //    data.rentPrice NUNCA debe ser poblado. Debe ser null/0.
  if (txTypeForSplit === "venta") {
    data.rentPrice = null;
  }

  // 3. Cuota de Administración (data.adminFee):
  //    La cuota de administración JAMÁS puede ser igual al canon de arriendo ni al precio de venta.
  //    Si data.adminFee === data.rentPrice o data.adminFee >= data.rentPrice * 0.45 -> reset a 0 (N/E).
  const curRentVal = data.rentPrice ? parseFloat(String(data.rentPrice)) : 0;
  const curSaleVal = data.price ? parseFloat(String(data.price)) : 0;
  const curAdminVal = data.adminFee ? parseFloat(String(data.adminFee)) : 0;

  if (curAdminVal > 0) {
    if (
      (curRentVal > 0 && (curAdminVal === curRentVal || curAdminVal >= curRentVal * 0.45)) ||
      (curSaleVal > 0 && (curAdminVal === curSaleVal || curAdminVal >= curSaleVal * 0.20))
    ) {
      data.adminFee = 0; // Reset por error de duplicación o paridad ilógica
      console.log(`[JanIA-SanidadPredial] Corregida cuota de administración absurda/duplicada $${curAdminVal} → N/E (0)`);
    }
  }

  // ── SANIDAD PREDIAL DE PRECIOS v20.0 / v25.4 (Desambiguación Administración vs Precio Venta) ──
  const isVentaType = txTypeForSplit.includes("venta") || !txTypeForSplit.includes("arriendo");
  const currentPriceVal = data.price ? parseFloat(String(data.price)) : 0;

  if (isVentaType && (currentPriceVal < 100_000_000 || !data.price) && data.rawText) {
    const fallbackD = extractFallbackDataFromText(data.rawText);
    if (fallbackD.price >= 30_000_000) {
      if ((!data.adminFee || parseFloat(String(data.adminFee)) <= 0) && fallbackD.adminFee > 0) {
        data.adminFee = fallbackD.adminFee;
      }
      data.price = fallbackD.price;
      console.log(`[JanIA-SanidadPredial] Corregido precio de venta $${currentPriceVal} → Real: $${fallbackD.price} | AdminFee: $${data.adminFee}`);
    } else if (currentPriceVal < 30_000_000) {
      // En venta, ningún inmueble vale < 30M: si está en rango de administración, moverlo a adminFee
      if ((!data.adminFee || parseFloat(String(data.adminFee)) <= 0) && currentPriceVal >= 100_000 && currentPriceVal <= 30_000_000) {
        data.adminFee = currentPriceVal;
      }
      data.price = 0;
      console.log(`[JanIA-SanidadPredial] Precio de venta menor a 30M ($${currentPriceVal}) desambiguado como AdminFee: $${data.adminFee} y Price: 0 (N/E)`);
    }
  }

  // Rescatar campos físicos si vienen null o en 0
  if (data.rawText) {
    const fallbackD = extractFallbackDataFromText(data.rawText);
    if ((!data.adminFee || parseFloat(String(data.adminFee)) <= 0) && fallbackD.adminFee > 0) {
      data.adminFee = fallbackD.adminFee;
    }
    if ((!data.garages || Number(data.garages) <= 0) && fallbackD.garages > 0) {
      data.garages = fallbackD.garages;
    }
    if ((!data.antiguedadAnos || Number(data.antiguedadAnos) <= 0) && fallbackD.antiguedadAnos !== null) {
      data.antiguedadAnos = fallbackD.antiguedadAnos;
    }
    if ((!data.areaTotal && !data.area) && fallbackD.area > 0) {
      data.areaTotal = fallbackD.area;
    }
    if (fallbackD.bedrooms > 0) {
      if (data.bedrooms === undefined || data.bedrooms === null || Number(data.bedrooms) <= 0 || (Number(data.bedrooms) !== fallbackD.bedrooms && /(?:^|[\n\r\-•*#\s])(\d{1,2})\s*(?:alcobas?|hab(?:s|itaciones|itaci[oó]n)?)\b/i.test(data.rawText || ""))) {
        data.bedrooms = fallbackD.bedrooms;
      }
    }
    if ((data.bathrooms === undefined || data.bathrooms === null || Number(data.bathrooms) <= 0) && fallbackD.bathrooms > 0) {
      data.bathrooms = fallbackD.bathrooms;
    }
  }

  // ── RESOLUCIÓN GEOGRÁFICA INTELIGENTE DE INTERSECCIONES Y CRUCES ──
  if (!data.zone || data.zone.trim() === "" || data.zone.toLowerCase() === "bogota" || data.zone.toLowerCase() === "bogotá" || data.zone.toLowerCase() === "colombia") {
    const geoInferred = resolveIntersectionToBarrio(data.rawText || data.name || data.location);
    if (geoInferred) {
      data.zone = geoInferred.barrio;
      data.addressNeighborhood = geoInferred.barrio;
      data.addressLocality = geoInferred.localidad;
      data.city = data.city || geoInferred.ciudad;
      console.log(`[JanIA-GeoResolver] 🧭 Inmueble: cruce vial deducido exitosamente: '${(data.rawText || "").slice(0, 45)}...' → Barrio: ${geoInferred.barrio} | Localidad: ${geoInferred.localidad} | Ciudad: ${geoInferred.ciudad}`);
    }
  }

  const canonicalPropPhone = normalizeAdvisorPhone(rawPhone) ||
    normalizeAdvisorPhone(data.idUsuarioWhatsapp) ||
    (isLidIdentifier(data.idUsuarioWhatsapp) && rawPhone ? rawPhone : (data.idUsuarioWhatsapp || rawPhone));
  const knownPropAdvisor = lookupAdvisorSync(canonicalPropPhone || data.idUsuarioWhatsapp, realName || data.nombreUsuarioWhatsapp);
  const finalEffectivePropName = (realName && !isGenericName(realName))
    ? realName.trim()
    : (data.nombreUsuarioWhatsapp && !isGenericName(data.nombreUsuarioWhatsapp))
      ? data.nombreUsuarioWhatsapp.trim()
      : (knownPropAdvisor?.name && !isGenericName(knownPropAdvisor.name))
        ? knownPropAdvisor.name
        : realName || null;

  const insertData = {
    ...data,
    name: safeSlice(data.name || `Propiedad en ${data.city || data.zone || "Colombia"}`, 255) || "Propiedad",
    city: safeSlice(data.city || data.ciudadDeseada, 100) || null,
    zone: (() => {
      const explicit = data.zone || data.addressNeighborhood;
      if (explicit && !isCityOrGenericZone(explicit)) return safeSlice(extractPureBarrio(explicit) || explicit, 100);
      return "N/E";
    })(),
    addressCity: safeSlice(data.addressCity || data.address_city || data.city, 100) || null,
    addressLocality: safeSlice(data.addressLocality || data.address_locality, 100) || null,
    addressNeighborhood: (() => {
      const explicit = data.addressNeighborhood || data.address_neighborhood || data.zone;
      if (explicit && !isCityOrGenericZone(explicit)) return safeSlice(extractPureBarrio(explicit) || explicit, 150);
      return null;
    })(),
    location: safeSlice(data.location, 255) || null,
    matriculaInmobiliaria: safeSlice(data.matriculaInmobiliaria, 100) || null,
    enlaceOrigen: safeSlice(data.enlaceOrigen, 1000) || null,
    idUsuarioWhatsapp: safeSlice(canonicalPropPhone, 100) || null,
    nombreUsuarioWhatsapp: safeSlice(finalEffectivePropName, 255) || null,
    propertyType: sanitizePropertyType(data.propertyType),
    transactionType: sanitizeTransactionType(data.transactionType),
    acceptedTransactionTypes: sanitizeTransactionTypes(data.transactionTypes || data.transactionType),
    currency: sanitizeCurrency(data.currency),
    // Mapear explícitamente los campos con Sanidad Numérica Post-Extracción (Bug #6 Fix)
    price: (() => {
      const isRent = sanitizeTransactionType(data.transactionType) === "arriendo" || sanitizeTransactionType(data.transactionType) === "arriendo_temporal";
      if (isRent) {
        return "0.00";
      }
      if (data.price === undefined || data.price === null) return "0.00";
      const v = parseFloat(String(data.price));
      if (isNaN(v) || isPhoneNumberNotPrice(v, data.rawText)) return "0.00";
      if (v > 50_000_000_000) return "0.00";
      if (v < 30_000_000) return "0.00"; // Sanidad Doctrinal VECY: en venta, precios < 30M son N/E
      return String(v);
    })(),
    rentPrice: (() => {
      const isPureSale = sanitizeTransactionType(data.transactionType) === "venta";
      if (isPureSale) return null; // En venta pura, rentPrice NUNCA debe existir
      if (data.rentPrice === undefined || data.rentPrice === null) return null;
      const v = parseFloat(String(data.rentPrice));
      if (isNaN(v) || v < 300_000 || v > 200_000_000 || isPhoneNumberNotPrice(v, data.rawText)) return null;
      return String(v);
    })(),
    areaTotal: (() => {
      const raw = data.areaTotal !== undefined && data.areaTotal !== null ? data.areaTotal : data.area;
      if (raw === undefined || raw === null) return null;
      const v = parseFloat(String(raw));
      if (isNaN(v) || v < 10 || v > 5000) return null;
      return String(v);
    })(),
    bedrooms: data.bedrooms !== undefined && data.bedrooms !== null ? Math.round(Number(data.bedrooms)) : null,
    bathrooms: (() => {
      const rawL = (data.rawText || "").toLowerCase();
      if (/2[\.,]5\s*(?:baño|baños|bñ)/i.test(rawL) || /2\s*(?:baños?|bñ)\s*(?:y\s*medio|y\s*medio\s*baño)/i.test(rawL)) {
        return 3; // 2 baños completos + 1 medio baño social = 3 baños físicos
      }
      if (data.bathrooms !== undefined && data.bathrooms !== null) {
        const num = Number(data.bathrooms);
        if (num === 5 && /2[\.,]5/i.test(rawL)) return 3; // Salvaguarda anti-bug de 2.5 interpretado como 5
        return Math.round(num);
      }
      return null;
    })(),
    garages: (() => {
      if (data.garages === undefined || data.garages === null) return null;
      const g = Math.round(Number(data.garages));
      if (isNaN(g) || g < 0) return null;
      if (g >= 1900 && g <= 2100) return null;
      if (g > 30) return null;
      return g;
    })(),
    garageType: data.garageType || null, // "independiente" | "lineal" | "mixto" | null (v20.0)
    stratum: data.stratum !== undefined && data.stratum !== null ? Math.round(Number(data.stratum)) : null,
    adminFee: data.adminFee !== undefined && data.adminFee !== null ? String(data.adminFee) : null,
    yearBuilt: data.yearBuilt !== undefined && data.yearBuilt !== null ? Math.round(Number(data.yearBuilt)) : null,
    antiguedadAnos: data.antiguedadAnos !== undefined && data.antiguedadAnos !== null ? Math.round(Number(data.antiguedadAnos)) : null,
    agentId: user ? user.id : null,
    latitude: data.latitude !== undefined && data.latitude !== null ? String(data.latitude) : null,
    longitude: data.longitude !== undefined && data.longitude !== null ? String(data.longitude) : null,
    images: finalImages.length > 0 ? finalImages : null,
    amenities: amenitiesObj,
    origenTipo: data.origenTipo || null,
    origenId: data.origenId || null,
    origenNombre: data.origenNombre || null,
    fechaExtraccion: data.fechaExtraccion || getColombiaNow()
  };

  // Calcular portal, listingId y canonicalExternalId a partir de externalUrl
  let portal: string | null = null;
  let externalListingId: string | null = null;
  let canonicalExternalId: string | null = null;

  if (data.externalUrl) {
    const extractedInfo = extractPortalAndListingId(data.externalUrl);
    portal = extractedInfo.portal;
    externalListingId = extractedInfo.listingId;
    if (portal && externalListingId) {
      canonicalExternalId = `${portal.toUpperCase()}:${externalListingId}`;
    }
  }

  const finalInsertData = {
    ...insertData,
    portal,
    externalListingId,
    canonicalExternalId,
    externalUrl: data.externalUrl || null,
    fechaPrimeraPublicacion: getColombiaNow(),
    fechaUltimaPublicacion: getColombiaNow(),
    republicacionesCount: 0,
    estadoComercial: "ACTIVO",
    ultimaActividad: "PUBLICACIÓN",
    vigenciaIa: "VIGENTE",
    aceptaTerceria: data.aceptaTerceria !== undefined ? Boolean(data.aceptaTerceria) : !/\b(?:no\s*tercer[ií]a|no\s*tercerias|sin\s*tercer[ií]a|no\s*se\s*acepta\s*tercer[ií]a|comisi[oó]n\s*50[-/]50\s*no\s*tercer[ií]a|solo\s*50[-/]50|no\s*intermediarios|directo\s*con\s*captador)\b/i.test(rawTextContent),
    standByDirectoVecy: data.standByDirectoVecy !== undefined ? Boolean(data.standByDirectoVecy) : /\b(?:no\s*tercer[ií]a|no\s*tercerias|sin\s*tercer[ií]a|no\s*se\s*acepta\s*tercer[ií]a|comisi[oó]n\s*50[-/]50\s*no\s*tercer[ií]a|solo\s*50[-/]50|no\s*intermediarios|directo\s*con\s*captador)\b/i.test(rawTextContent)
  };

  // Búsqueda jerárquica de duplicados
  let existing: any[] = [];

  // 1. Por ID Canónico
  if (canonicalExternalId) {
    existing = await db
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.canonicalExternalId, canonicalExternalId),
          eq(properties.available, true)
        )
      )
      .limit(1);
  }

  // 2. Por Matrícula Inmobiliaria (si está presente)
  if (existing.length === 0 && finalInsertData.matriculaInmobiliaria) {
    existing = await db
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.matriculaInmobiliaria, finalInsertData.matriculaInmobiliaria),
          eq(properties.available, true)
        )
      )
      .limit(1);
  }

  // 2.5 Por rawText idéntico (Anti-duplicados por publicaciones en múltiples grupos)
  if (existing.length === 0 && finalInsertData.rawText && finalInsertData.rawText.trim().length > 25) {
    existing = await db
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.rawText, finalInsertData.rawText.trim()),
          eq(properties.available, true)
        )
      )
      .limit(1);
  }

  // 3. Fallback comercial (Mismo broker, tipo, negocio, ciudad y barrio)
  if (existing.length === 0) {
    existing = await db
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.idUsuarioWhatsapp, rawPhone),
          eq(properties.propertyType, finalInsertData.propertyType),
          eq(properties.transactionType, finalInsertData.transactionType),
          eq(properties.city, finalInsertData.city),
          eq(properties.zone, finalInsertData.zone),
          eq(properties.available, true)
        )
      )
      .limit(1);
  }

  const { label: calif } = calcularCalificacionCompletitud(finalInsertData, true);
  const insertDataWithCalif = {
    ...finalInsertData,
    calificacion: calif
  };

  if (existing.length > 0) {
    // Si ya existe, actualizamos los datos comerciales y de trazabilidad preservando contacto verificado (v31.88)
    const preservedContact = preserveVerifiedAdvisorContact(
      existing[0].idUsuarioWhatsapp,
      existing[0].nombreUsuarioWhatsapp,
      insertDataWithCalif.idUsuarioWhatsapp,
      insertDataWithCalif.nombreUsuarioWhatsapp
    );

    const updatedCount = (existing[0].republicacionesCount || 0) + 1;
    const newPriceVal = parseFloat(String(insertDataWithCalif.price || 0));
    const existingPriceVal = parseFloat(String(existing[0].price || 0));
    const effectivePrice = newPriceVal > 0 ? insertDataWithCalif.price : existing[0].price;

    const newTx = insertDataWithCalif.transactionType;
    const existingTx = existing[0].transactionType;
    // Si la ficha existente tenía precio 0 o la nueva publicación viene con venta explícita y precio real, actualizar tipo de transacción
    const effectiveTx = (newPriceVal > 0 && (existingPriceVal === 0 || existingTx === "arriendo")) 
      ? newTx 
      : (insertDataWithCalif.transactionType || existingTx);

    const [updated] = await db
      .update(properties)
      .set({
        available: true, // Regla Doctrinal v31.108: Si el autor u otro asesor lo republica, se revive disponible desde cero
        price: effectivePrice,
        rentPrice: insertDataWithCalif.rentPrice || existing[0].rentPrice,
        transactionType: effectiveTx as any,
        propertyType: insertDataWithCalif.propertyType || existing[0].propertyType,
        areaTotal: insertDataWithCalif.areaTotal || existing[0].areaTotal,
        bathrooms: insertDataWithCalif.bathrooms || existing[0].bathrooms,
        garages: insertDataWithCalif.garages || existing[0].garages,
        stratum: insertDataWithCalif.stratum || existing[0].stratum,
        description: insertDataWithCalif.description || existing[0].description,
        adminFee: insertDataWithCalif.adminFee || existing[0].adminFee,
        images: finalImages.length > 0 ? finalImages : existing[0].images,
        origenTipo: insertDataWithCalif.origenTipo,
        origenId: insertDataWithCalif.origenId,
        origenNombre: insertDataWithCalif.origenNombre || existing[0].origenNombre,
        idUsuarioWhatsapp: preservedContact.effectivePhone || existing[0].idUsuarioWhatsapp,
        nombreUsuarioWhatsapp: preservedContact.effectiveName || existing[0].nombreUsuarioWhatsapp,
        fechaUltimaPublicacion: getColombiaNow(),
        updatedAt: new Date(),
        republicacionesCount: updatedCount,
        estadoComercial: "REPUBLICADO",
        ultimaActividad: "REPUBLICACIÓN",
        vigenciaIa: "VIGENTE"
      })
      .where(eq(properties.id, existing[0].id))
      .returning();

    console.log(`[Deduplication] Propiedad existente detectada (${canonicalExternalId || 'Comercial'}). Actualizando datos (ID: ${updated.id}, Republicado: ${updatedCount}, Asesor: ${updated.nombreUsuarioWhatsapp || 'N/A'} - Tel: ${updated.idUsuarioWhatsapp || 'N/A'})`);

    // Insertar auditoría histórica de la republicación
    try {
      await db.insert(propertyPublicationHistory).values({
        propertyId: existing[0].id,
        grupo: insertDataWithCalif.origenNombre,
        broker: realName,
        brokerPhone: rawPhone,
        accion: "REPUBLICACIÓN",
        portal: portal,
        externalListingId: externalListingId,
        detalles: `Inmueble republicado en ${insertDataWithCalif.origenNombre || 'WhatsApp'}. Precio: ${insertDataWithCalif.price}`
      });
    } catch (histErr) {
      console.error("[JanIA-History] Error al registrar historial de republicación:", histErr);
    }

    // Disparar motor de matching instantáneo para propiedad actualizada
    findMatchesForProperty(updated.id).catch((mErr: any) => console.error("[JanIA-MatchingTrigger] Error recalculando matches para propiedad:", mErr));

    return updated;
  }

  // Creación de propiedad nueva
  const [result] = await db.insert(properties).values(insertDataWithCalif).returning();

  // Disparar motor de matching instantáneo para propiedad nueva
  findMatchesForProperty(result.id).catch((mErr: any) => console.error("[JanIA-MatchingTrigger] Error calculando matches para propiedad:", mErr));

  // Insertar auditoría histórica inicial
  try {
    await db.insert(propertyPublicationHistory).values({
      propertyId: result.id,
      grupo: insertDataWithCalif.origenNombre,
      broker: realName,
      brokerPhone: rawPhone,
      accion: "PUBLICACIÓN",
      portal: portal,
      externalListingId: externalListingId,
      detalles: `Inmueble ingresado por primera vez desde ${insertDataWithCalif.origenNombre || 'WhatsApp'}. Precio: ${insertDataWithCalif.price}`
    });
  } catch (histErr) {
    console.error("[JanIA-History] Error al registrar historial inicial:", histErr);
  }


  // Si se subió una imagen, registrarla en la tabla propertyImages también
  if (result && imageUrl) {
    try {
      await db.insert(propertyImages).values({
        propertyId: result.id,
        imageUrl: imageUrl,
        isMainImage: true,
        displayOrder: 1,
        mimeType: "image/jpeg",
        uploadedBy: "janIA"
      });
      console.log(`[JanIA-SaveProperty] Registro en propertyImages creado para propiedad ${result.id}`);
    } catch (err) {
      console.error("[JanIA-SaveProperty] Error creando registro en propertyImages:", err);
    }
  }

  return result;
}

async function saveRequirement(data: any, userId: string, realName: string, imageBuffer?: string, pdfBuffer?: string, pdfMimeType?: string) {
  const db = await getDb();
  if (!db) return null;

  if (isNonRealEstateText(data.rawText) || isNonRealEstateText(data.name)) {
    console.log(`[JanIA-Reject] 🚫 Requerimiento descartado: mensaje no corresponde a finca raíz (materiales/canteras/maquinaria): ${data.name || data.rawText}`);
    return null;
  }

  const rawTextContent = `${data.rawText || ""} ${data.name || ""}`;
  const effectivePhone = resolveContactPhone(userId, rawTextContent, realName, data.idUsuarioWhatsapp);
  const rawPhone = effectivePhone;
  const user = await findOrCreateUserByPhone(effectivePhone, realName);

  let reqPdfUrl: string | undefined;
  if (pdfBuffer) {
    try {
      const buffer = Buffer.from(pdfBuffer, 'base64');
      const filename = `documents/req_doc_${Date.now()}_${rawPhone}.pdf`;
      const uploadResult = await storagePut(filename, buffer, pdfMimeType || 'application/pdf');
      reqPdfUrl = uploadResult.url;
      data.enlaceOrigen = data.enlaceOrigen || reqPdfUrl;
    } catch (err) {
      console.error("[JanIA-SaveRequirement] Error subiendo PDF:", err);
    }
  }

  const isRequirementFlyer = !!(data.isFlyerOrBanner || (data.flyerVerbatimText && data.flyerVerbatimText.trim().length >= 15));
  if (imageBuffer && isRequirementFlyer) {
    try {
      const buffer = Buffer.from(imageBuffer, 'base64');
      const filename = `flyers/req_wa_${Date.now()}_${rawPhone}.jpg`;
      const uploadResult = await storagePut(filename, buffer, 'image/jpeg');
      data.enlaceOrigen = uploadResult.url;
      console.log(`[JanIA-SaveRequirement] ✅ Flyer de requerimiento guardado localmente en VPS: ${uploadResult.url}`);
    } catch (err) {
      console.error("[JanIA-SaveRequirement] Error subiendo imagen:", err);
    }
  }

  const rawLowerAll = `${rawTextContent} ${(data.name || "")}`.toLowerCase();
  const reqNoTerceriaMatch = /\b(?:no\s*tercer[ií]a|no\s*tercerias|sin\s*tercer[ií]a|no\s*se\s*acepta\s*tercer[ií]a|comisi[oó]n\s*50[-/]50\s*no\s*tercer[ií]a|solo\s*50[-/]50|no\s*intermediarios|directo\s*con\s*captador)\b/i.test(rawLowerAll);
  const reqRequiresObligatoryStudy = /\b(?:con\s*estudio\s*obligatorio|estudio\s*obligatorio|exige\s*estudio|estudio\s*indispensable|estudio\s*ojal[aá]\s*cerrado)\b/i.test(rawLowerAll);
  const reqHasStudy = reqRequiresObligatoryStudy || rawLowerAll.includes("estudio") || rawLowerAll.includes("star de tv") || rawLowerAll.includes("estar de tv") || rawLowerAll.includes("sala de tv");
  const reqPisoMinMatch = rawLowerAll.match(/(?:unicamente\s*ven\s*opciones\s*del\s*piso|del\s*piso|piso|pisos)\s*(\d{1,2})\s*(?:hacia\s*arriba|en\s*adelante|o\s*superior|\+|\s*mas)\b/i);
  const reqPisoMin = reqPisoMinMatch ? parseInt(reqPisoMinMatch[1], 10) : null;
  const reqRequiresExterior = /\b(?:muy\s*luminoso|vista\s*agradable|vista\s*exterior|exterior\s*muy\s*iluminado|vista\s*panor[aá]mica|exterior|sin\s*interior)\b/i.test(rawLowerAll);
  const reqAdminFeeInc = /(?:admin(?:istraci[oó]n)?|admon)\s*(?:incluida|inc\b)|(?:con|\+|mas|más)\s*(?:admin(?:istraci[oó]n)?|admon)/i.test(rawLowerAll);
  const reqIsAmoblado = /\b(?:amoblado|amoblada|con\s*muebles)\b/i.test(rawLowerAll);

  const characteristicsObj = {
    gives: data.gives || data.caracteristicasDeseadas?.gives,
    wants: data.wants || data.caracteristicasDeseadas?.wants,
    interiorExterior: data.interiorExterior || data.caracteristicasDeseadas?.interiorExterior || (reqRequiresExterior ? "exterior" : null),
    cuartoBanoServicio: data.cuartoBanoServicio || data.caracteristicasDeseadas?.cuartoBanoServicio,
    cocina: data.cocina || data.caracteristicasDeseadas?.cocina,
    lavanderiaIndependiente: data.lavanderiaIndependiente || data.caracteristicasDeseadas?.lavanderiaIndependiente,
    tipoPisos: data.tipoPisos || data.caracteristicasDeseadas?.tipoPisos,
    depositos: data.depositos || data.caracteristicasDeseadas?.depositos,
    comisiones: data.comisiones || data.caracteristicasDeseadas?.comisiones,
    antiguedad: data.antiguedad || data.caracteristicasDeseadas?.antiguedad,
    estudio: reqRequiresObligatoryStudy ? "obligatorio" : (reqHasStudy ? "deseado" : null),
    pisoMinimo: reqPisoMin,
    adminFeeIncluded: reqAdminFeeInc,
    amoblado: reqIsAmoblado ? true : (rawLowerAll.includes("sin amoblar") ? false : null)
  };

  // ── RESOLUCIÓN GEOGRÁFICA INTELIGENTE DE INTERSECCIONES Y CRUCES ──
  if (!data.zonaDeseada && (!data.zone || data.zone.trim() === "" || data.zone.toLowerCase() === "bogota" || data.zone.toLowerCase() === "bogotá" || data.zone.toLowerCase() === "colombia")) {
    const geoInferred = resolveIntersectionToBarrio(data.rawText || data.name);
    if (geoInferred) {
      data.zonaDeseada = geoInferred.barrio;
      data.addressNeighborhood = geoInferred.barrio;
      data.addressLocality = geoInferred.localidad;
      data.ciudadDeseada = data.ciudadDeseada || geoInferred.ciudad;
      console.log(`[JanIA-GeoResolver] 🧭 Requerimiento: cruce vial deducido exitosamente: '${(data.rawText || "").slice(0, 45)}...' → Barrio: ${geoInferred.barrio} | Localidad: ${geoInferred.localidad} | Ciudad: ${geoInferred.ciudad}`);
    }
  }

  const canonicalReqPhone = normalizeAdvisorPhone(rawPhone) ||
    normalizeAdvisorPhone(data.idUsuarioWhatsapp) ||
    (isLidIdentifier(data.idUsuarioWhatsapp) && rawPhone ? rawPhone : (data.idUsuarioWhatsapp || rawPhone));
  const knownReqAdvisor = lookupAdvisorSync(canonicalReqPhone || data.idUsuarioWhatsapp, realName || data.nombreUsuarioWhatsapp);
  const finalEffectiveReqName = (realName && !isGenericName(realName))
    ? realName.trim()
    : (data.nombreUsuarioWhatsapp && !isGenericName(data.nombreUsuarioWhatsapp))
      ? data.nombreUsuarioWhatsapp.trim()
      : (knownReqAdvisor?.name && !isGenericName(knownReqAdvisor.name))
        ? knownReqAdvisor.name
        : realName || null;

  const rawCombinedReqText = `${data.rawText || ""} ${data.name || ""}`;
  const fallbackReqD = extractFallbackDataFromText(rawCombinedReqText);

  const insertData = {
    ...data,
    name: safeSlice(data.name, 255) || null,
    ciudadDeseada: safeSlice(data.ciudadDeseada || data.city || fallbackReqD.city || "Bogotá", 100) || "Bogotá",
    zonaDeseada: (() => {
      const explicit = data.zonaDeseada || data.zone || data.addressNeighborhood;
      if (explicit && !isCityOrGenericZone(explicit)) {
        return safeSlice(extractPureBarrio(explicit) || explicit, 100);
      }
      if (fallbackReqD.zonaDeseada && !isCityOrGenericZone(fallbackReqD.zonaDeseada)) {
        return safeSlice(extractPureBarrio(fallbackReqD.zonaDeseada) || fallbackReqD.zonaDeseada, 100);
      }
      return null;
    })(),
    addressCity: safeSlice(data.addressCity || data.address_city, 100) || null,
    addressLocality: safeSlice(data.addressLocality || data.address_locality, 100) || null,
    addressNeighborhood: (() => {
      const explicit = data.addressNeighborhood || data.address_neighborhood || (fallbackReqD.zonaDeseada && !isCityOrGenericZone(fallbackReqD.zonaDeseada) ? fallbackReqD.zonaDeseada : null);
      if (explicit && !isCityOrGenericZone(explicit)) return safeSlice(extractPureBarrio(explicit) || explicit, 150);
      return null;
    })(),
    enlaceOrigen: safeSlice(data.enlaceOrigen, 1000) || null,
    idUsuarioWhatsapp: safeSlice(canonicalReqPhone, 100) || null,
    nombreUsuarioWhatsapp: safeSlice(finalEffectiveReqName, 255) || null,
    tipoInmuebleDeseado: sanitizePropertyType(data.tipoInmuebleDeseado || data.propertyType),
    tipoNegocioDeseado: sanitizeTransactionType(data.tipoNegocioDeseado || data.transactionType),
    tiposNegocioAceptados: sanitizeTransactionTypes(data.transactionTypes || data.tipoNegocioDeseado || data.transactionType),
    monedaPresupuesto: sanitizeCurrency(data.monedaPresupuesto || data.currency),
    // Mapear campos con Sanidad Numérica Post-Extracción (Bug #6 Fix)
    presupuestoMin: (() => {
      const raw = data.presupuestoMin !== undefined && data.presupuestoMin !== null ? data.presupuestoMin : null;
      if (raw !== undefined && raw !== null) {
        const v = parseFloat(String(raw));
        if (!isNaN(v) && v >= 300_000 && v <= 50_000_000_000 && !isPhoneNumberNotPrice(v, data.rawText)) {
          return String(v);
        }
      }
      if (fallbackReqD.presupuestoMin >= 300_000) {
        return String(fallbackReqD.presupuestoMin);
      }
      return null;
    })(),
    presupuestoMax: (() => {
      const raw = data.presupuestoMax !== undefined && data.presupuestoMax !== null ? data.presupuestoMax : data.price;
      if (raw !== undefined && raw !== null) {
        const v = parseFloat(String(raw));
        if (!isNaN(v) && v >= 300_000 && v <= 50_000_000_000 && !isPhoneNumberNotPrice(v, data.rawText)) {
          return String(v);
        }
      }
      // Fallback robusto con extractFallbackDataFromText (soporta rangos como "Presupuesto *1.300 - 1.400*")
      if (fallbackReqD.presupuestoMax >= 300_000) {
        return String(fallbackReqD.presupuestoMax);
      }
      return null;
    })(),
    areaMin: (() => {
      const raw = data.areaMin !== undefined && data.areaMin !== null ? data.areaMin : data.area;
      if (raw !== undefined && raw !== null) {
        const v = parseFloat(String(raw));
        if (!isNaN(v) && v >= 10 && v <= 5000) return String(v);
      }
      if (fallbackReqD.areaMin > 0 || fallbackReqD.area > 0) {
        return String(fallbackReqD.areaMin || fallbackReqD.area);
      }
      // Fallback robusto: extraer desde rawText capturando frases como "Mínimo 150m2", "min 120 m²", "de 150 metros", "metraje minimo: 160mts"
      const rawL = (data.rawText || data.name || "").toLowerCase();
      const areaFallback = rawL.match(
        /(?:(?:m[ií]nimo|m[aá]s\s*de|min(?:imo)?|m[aá]x(?:imo)?|de|desde|con|metraje\s*(?:m[ií]nimo|min(?:imo)?))\s*[:=-]?\s*)([\d]+(?:[.,][\d]+)?)\s*(?:m2|mts2|mts|metros(?:\s+cuadrados)?|m²)/i
      );
      if (areaFallback) {
        const v = parseFloat(areaFallback[1].replace(',', '.'));
        if (!isNaN(v) && v >= 10 && v <= 5000) return String(v);
      }
      return null;
    })(),
    adminFeeMax: (() => {
      const raw = data.adminFeeMax !== undefined && data.adminFeeMax !== null ? data.adminFeeMax : (data.adminFee !== undefined && data.adminFee !== null ? data.adminFee : null);
      if (raw !== undefined && raw !== null) {
        let v = parseFloat(String(raw));
        if (!isNaN(v)) {
          if (v >= 500 && v <= 15000) v = v * 1000;
          if (v >= 10_000 && v <= 30_000_000) return String(v);
        }
      }
      // Fallback robusto: usar parseAdminFee de shared/colombianRealEstateParser
      const rawL = (data.rawText || data.name || "").toLowerCase();
      const parsedAdminInfo = parseAdminFee(rawL);
      if (parsedAdminInfo.fee && parsedAdminInfo.fee >= 10_000 && parsedAdminInfo.fee <= 30_000_000 && !isPhoneNumberNotPrice(parsedAdminInfo.fee, rawL)) {
        return String(parsedAdminInfo.fee);
      }
      const adminMatch = rawL.match(/(?:administraci[oó]n|admin|admon|cta\s*admon)\s*:?\s*(?:m[aá]xima|max|hasta|tope|no\s*mayor\s*a|no\s*superior\s*a|menor\s*a)?\s*:?\s*(?:aprox\.?|mensual)?\s*\$?\s*([\d.,\s]+?)(?:\s*mil\b|\s*k\b|\s*millones\b|-|\s|\(|\/|\+|$|\n)/i);
      if (adminMatch) {
        const cleanNum = adminMatch[1].replace(/[.,\s]/g, '');
        let parsed = parseFloat(cleanNum);
        if (!isNaN(parsed)) {
          if (parsed >= 500 && parsed <= 15000) parsed = parsed * 1000;
          if (parsed >= 10_000 && parsed <= 30_000_000 && !isPhoneNumberNotPrice(parsed, rawL)) {
            return String(parsed);
          }
        }
      }
      return null;
    })(),
    habitacionesMin: (() => {
      const v = data.habitacionesMin !== undefined && data.habitacionesMin !== null ? Math.round(Number(data.habitacionesMin)) : (data.bedrooms !== undefined && data.bedrooms !== null ? Math.round(Number(data.bedrooms)) : null);
      if (v !== null && !isNaN(v) && v > 0) return v;
      if (fallbackReqD.bedroomsMin > 0 || fallbackReqD.bedrooms > 0) {
        return fallbackReqD.bedroomsMin || fallbackReqD.bedrooms;
      }
      const rawL = (data.rawText || "").toLowerCase();
      const m = rawL.match(/(?:un|una|uno|dos|tres|cuatro|cinco|\d+)\s*(?:hab|habitaciones|alcoba|alcobas|alc|dormitorio)/i);
      if (m) {
        const SPANISH_NUM_LOCAL: Record<string, number> = { "un": 1, "una": 1, "uno": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5 };
        const w = m[0].split(/\s+/)[0].toLowerCase();
        return SPANISH_NUM_LOCAL[w] || parseInt(w, 10) || null;
      }
      return null;
    })(),
    banosMin: (() => {
      const rawL = (data.rawText || "").toLowerCase();
      // 🛡️ REGLA DOCTRINAL v31.104: Si el cliente exige "X baños + [el] baño social", son X + 1 baños (2 alcobas + social = 3)
      const socialAddMatch = rawL.match(/(un|una|uno|dos|tres|cuatro|cinco|\d+)\s*(?:baño|baños|bñ)\s*(?:\+|\+|y|m[aá]s|con)\s*(?:el\s*|un\s*)?baño\s*social/i);
      if (socialAddMatch) {
        const SPANISH_NUM_LOCAL: Record<string, number> = { "un": 1, "una": 1, "uno": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5 };
        const bWord = socialAddMatch[1].toLowerCase();
        const base = SPANISH_NUM_LOCAL[bWord] || parseInt(bWord, 10) || 2;
        return base + 1; // 2 baños alcobas + 1 social = 3 baños
      }
      const v = data.banosMin !== undefined && data.banosMin !== null ? Number(data.banosMin) : (data.bathrooms !== undefined && data.bathrooms !== null ? Number(data.bathrooms) : null);
      if (v !== null && !isNaN(v) && v > 0) {
        if (v === 5 && rawL.includes("2.5")) return 3; // Corregir alucinación 2.5 -> 5
        return Math.round(v);
      }
      if (fallbackReqD.bathrooms > 0) {
        return fallbackReqD.bathrooms;
      }
      const m = rawL.match(/(?:un|una|uno|dos|tres|cuatro|cinco|\d+(?:[\.,]\d+)?)\s*(?:o\s*más\s*)?(?:wc|baño|baños|bñ)/i) || rawL.match(/(?:un|una|uno|dos|tres|cuatro|cinco|\d+)\s*hab\s*con\s*baño/i);
      if (m) {
        const SPANISH_NUM_LOCAL: Record<string, number> = { "un": 1, "una": 1, "uno": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5 };
        const w = m[0].split(/\s+/)[0].toLowerCase();
        const num = SPANISH_NUM_LOCAL[w] || parseFloat(w.replace(',', '.'));
        if (!isNaN(num) && num > 0) {
          if (num % 1 !== 0) return Math.ceil(num);
          return Math.round(num);
        }
      }
      return null;
    })(),
    parqueaderosMin: (() => {
      const v = data.parqueaderosMin !== undefined && data.parqueaderosMin !== null ? Math.round(Number(data.parqueaderosMin)) : (data.garages !== undefined && data.garages !== null ? Math.round(Number(data.garages)) : null);
      if (v !== null && !isNaN(v) && v > 0) return v;
      if (fallbackReqD.garages > 0) {
        return fallbackReqD.garages;
      }
      const rawL = (data.rawText || "").toLowerCase();
      const m = rawL.match(/(?:parqueadero|parqueaderos|garaje|garajes|ptero|g\.)\s*\.?\s*(\d+)/i)
        || rawL.match(/(\d+)\s*(?:parqueadero|parqueaderos|garaje|garajes|ptero|g\.|individuales)/i);
      return m ? parseInt(m[1], 10) : null;
    })(),
    estratoDeseado: (() => {
      // 🛡️ REGLA DOCTRINAL v31.103: Prohibición absoluta de alucinar o inferir estrato en requerimientos/demandas.
      // Solo se asigna estrato si el texto original lo exige explícitamente ("estrato 6", "estrato 5 o 6", etc.).
      // Si el cliente no mencionó estrato en el texto, estratoDeseado DEBE ser null (flexible).
      const rawT = (data.rawText || "").toLowerCase();
      const hasExplicitStratum = /(?:estrato|estr\.?|e\s*[1-6]\b)\s*:?\s*([1-6]|uno|dos|tres|cuatro|cinco|seis)\b/i.test(rawT) ||
        /\b(?:estrato|estr\.?)\s*(?:alto|medio|bajo)\b/i.test(rawT);

      if (!hasExplicitStratum) {
        return null;
      }

      if (data.estratoDeseado && Array.isArray(data.estratoDeseado) && data.estratoDeseado.length > 0) {
        return data.estratoDeseado.map((e: any) => Math.round(Number(e))).filter((e: number) => !isNaN(e) && e >= 1 && e <= 6);
      }
      if (data.stratum !== undefined && data.stratum !== null && !isNaN(Number(data.stratum))) {
        const s = Math.round(Number(data.stratum));
        if (s >= 1 && s <= 6) return [s];
      }
      return null;
    })(),
    userId: user ? user.id : null,
    caracteristicasDeseadas: characteristicsObj,
    origenTipo: data.origenTipo || null,
    origenId: data.origenId || null,
    origenNombre: data.origenNombre || null,
    fechaExtraccion: data.fechaExtraccion || getColombiaNow(),
    aceptaTerceria: data.aceptaTerceria !== undefined ? Boolean(data.aceptaTerceria) : !reqNoTerceriaMatch,
    standByDirectoVecy: data.standByDirectoVecy !== undefined ? Boolean(data.standByDirectoVecy) : reqNoTerceriaMatch
  };

  // 🛡️ REGLA DOCTRINAL v22.10: Filtro de Calidad Estricto de Ingesta para Requerimientos.
  // Un requerimiento NO se inserta en BD si su ubicación es vaga/coloquial ("todas las santas", "en cualquier zona")
  // y carece de perímetro o especificaciones técnicas mínimas (presupuesto, área, habitaciones).
  const rawZoneStr = (insertData.zonaDeseada || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const rawTextStr = (insertData.rawText || "").toLowerCase();

  const isAmbiguousZoneName = (zn: string) => {
    if (!zn || zn === "n/e" || zn === "na" || zn === "bogota" || zn === "bogota, d.c." || zn === "colombia") return true;
    const ambiguousPhrases = [
      "todas las zonas", "cualquier zona", "cualquier lado",
      "donde sea", "varias zonas", "por ahi", "por ahí", "buena zona", "sector residencial",
      "sector comercial", "norte o sur", "donde haya", "cualquiera"
    ];
    return ambiguousPhrases.some(a => zn.includes(a));
  };

  const hasPerimeterOrStreet = /calle\s*\d+|carrera\s*\d+|cra\s*\d+|cll\s*\d+|cl\s*\d+|diagonal\s*\d+|transversal\s*\d+|entre\s*calle|perimetro|perímetro/i.test(rawTextStr);
  const isZoneAmbiguous = isAmbiguousZoneName(rawZoneStr);

  if (isZoneAmbiguous && !hasPerimeterOrStreet && !insertData.presupuestoMax && !insertData.areaMin && !insertData.habitacionesMin) {
    console.log(`[JANIA-INGESTION-GUARD] ⛔ Requerimiento omitido por falta de ubicación explícita o especificaciones prediales completas ("${insertData.rawText?.substring(0, 60)}...")`);
    return null;
  }

  // Buscar duplicado (1. Por rawText idéntico, 2. Por parámetros comerciales del mismo broker)
  let existing: any[] = [];
  if (insertData.rawText && insertData.rawText.trim().length > 25) {
    existing = await db
      .select()
      .from(requirements)
      .where(
        eq(requirements.rawText, insertData.rawText.trim())
      )
      .limit(1);
  }

  if (existing.length === 0) {
    existing = await db
      .select()
      .from(requirements)
      .where(
        and(
          eq(requirements.idUsuarioWhatsapp, rawPhone),
          eq(requirements.tipoInmuebleDeseado, insertData.tipoInmuebleDeseado),
          eq(requirements.tipoNegocioDeseado, insertData.tipoNegocioDeseado),
          eq(requirements.ciudadDeseada, insertData.ciudadDeseada),
          eq(requirements.zonaDeseada, insertData.zonaDeseada)
        )
      )
      .limit(1);
  }

  const { label: calif } = calcularCalificacionCompletitud(insertData, false);
  const insertDataWithCalif = {
    ...insertData,
    calificacion: calif
  };

  if (existing.length > 0) {
    // Si ya existe, actualizamos los datos pero preservamos fechaExtraccion original (Regla Doctrinal v31.86) y contacto verificado (v31.88)
    const preservedContact = preserveVerifiedAdvisorContact(
      existing[0].idUsuarioWhatsapp,
      existing[0].nombreUsuarioWhatsapp,
      insertDataWithCalif.idUsuarioWhatsapp,
      insertDataWithCalif.nombreUsuarioWhatsapp
    );

    const { fechaExtraccion: _ignored, ...updateFields } = insertDataWithCalif;
    const repCount = ((existing[0] as any).republicacionesCount || 0) + 1;

    const [updated] = await db
      .update(requirements)
      .set({
        ...updateFields,
        idUsuarioWhatsapp: preservedContact.effectivePhone || existing[0].idUsuarioWhatsapp,
        nombreUsuarioWhatsapp: preservedContact.effectiveName || existing[0].nombreUsuarioWhatsapp,
        status: 'active', // Al ser republicado o actualizado, se reactiva a activo de inmediato
        fechaUltimaPublicacion: getColombiaNow(),
        republicacionesCount: repCount,
        updatedAt: new Date()
      })
      .where(eq(requirements.id, existing[0].id))
      .returning();
    console.log(`[Deduplication] Requerimiento existente detectado y reactivado (ID: ${updated.id}, Republicaciones: ${repCount}, Asesor: ${updated.nombreUsuarioWhatsapp || 'N/A'} - Tel: ${updated.idUsuarioWhatsapp || 'N/A'})`);
    findMatchesForRequirement(updated.id).catch((mErr: any) => console.error("[JanIA-MatchingTrigger] Error recalculando matches para requerimiento:", mErr));
    return updated;
  }

  const insertDataFinal = {
    ...insertDataWithCalif,
    fechaPrimeraPublicacion: getColombiaNow(),
    fechaUltimaPublicacion: getColombiaNow(),
    republicacionesCount: 0,
    status: 'active' as const
  };
  const [result] = await db.insert(requirements).values(insertDataFinal).returning();
  findMatchesForRequirement(result.id).catch((mErr: any) => console.error("[JanIA-MatchingTrigger] Error calculando matches para requerimiento:", mErr));
  return result;
}


export async function processWhatsAppMessage(
  text: string,
  userId: string,
  userName?: string,
  hasMedia: boolean = false,
  scrapedData: any[] = [],
  audioUrl?: string,
  imageBuffer?: string,
  isGroup: boolean = false,
  pdfBuffer?: string,
  pdfMimeType?: string,
  groupJid?: string,
  groupName?: string,
  flyerVisionData?: FlyerVisionResult
): Promise<JanIAResult> {
  try {
    const isWebUser = userId.startsWith("web-");

    // ══════════════════════════════════════════════════════════════════════════
    // INGESTA MULTI-ITEM: SI UN MENSAJE CONTIENE VARIAS PUBLICACIONES, SEPARARLAS
    // ══════════════════════════════════════════════════════════════════════════
    if (text && !text.includes("__is_sub_message__")) {
      const subBlocks = splitMultiItemMessage(text);
      if (subBlocks.length >= 2) {
        console.log(`[JanIA-MultiItemSplitter] 🚀 Ingestando ${subBlocks.length} publicaciones individuales de manera independiente...`);
        let bestResult: JanIAResult | null = null;
        let insertedAny = false;
        for (const subText of subBlocks) {
          const subRes = await processWhatsAppMessage(
            `${subText}\n__is_sub_message__`,
            userId,
            userName,
            hasMedia,
            scrapedData,
            audioUrl,
            imageBuffer,
            isGroup,
            pdfBuffer,
            pdfMimeType,
            groupJid,
            groupName,
            flyerVisionData
          );
          if (subRes.inserted) insertedAny = true;
          if (subRes.classification === "INMUEBLE" || subRes.classification === "REQUERIMIENTO") {
            if (!bestResult) bestResult = subRes;
          }
        }
        if (insertedAny && bestResult) {
          return {
            ...bestResult,
            inserted: true,
            response: "", // Silencio absoluto en grupos
            dmResponse: bestResult.dmResponse || ""
          };
        }
        return bestResult || { classification: "INMUEBLE", response: "", inserted: true };
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // FILTRO ABSOLUTO IMPERMEABLE DE SPAM, PUBLICIDAD Y CONTENIDO NO INMOBILIARIO
    // ══════════════════════════════════════════════════════════════════════════
    if (!isWebUser && text) {
      const checkText = text.toLowerCase();
      if (isNonRealEstateText(checkText)) {
        console.log(`[JANIA-NON-REALESTATE-GUARD] ⛔ Publicación NO inmobiliaria (canteras, materiales, minas, vehículos, carbón, etc.). Rechazando con 🚫: "${checkText.substring(0, 60)}..."`);
        return {
          classification: "VIOLACION_DE_NORMAS",
          response: "",
          dmResponse: "",
          shouldSendDM: false,
          reactionEmoji: "🚫",
          inserted: false
        };
      }

      // Filtro Temprano Impermeable Anti-Publicidad (Campañas en Meta, Pauta, Cursos, Software, etc.)
      const spamCheckEarly = esMensajeSpamOBasura(checkText);
      if (spamCheckEarly.isSpam) {
        console.log(`[JANIA-SPAM-GUARD] ⛔ Publicación detectada como SPAM/Publicidad (${spamCheckEarly.reason}): "${checkText.substring(0, 60)}...". Rechazando con 🚫.`);
        return {
          classification: "VIOLACION_DE_NORMAS",
          response: "",
          dmResponse: "",
          shouldSendDM: false,
          reactionEmoji: "🚫",
          inserted: false
        };
      }

      const isSpamOrWebinar = (
        checkText.includes("zoom.us") ||
        checkText.includes("us06web.zoom.us") ||
        checkText.includes("chat.whatsapp.com") ||
        checkText.includes("únase a nuestra reunión") ||
        checkText.includes("unase a nuestra reunion") ||
        checkText.includes("entrenamiento 100% gratuito") ||
        checkText.includes("estrategias en redes sociales") ||
        checkText.includes("como funcionan las ventas") ||
        checkText.includes("invitación al chat en grupo") ||
        checkText.includes("invitacion al chat en grupo") ||
        checkText.includes("unirme al grupo") ||
        checkText.includes("máster class") ||
        checkText.includes("masterclass") ||
        checkText.includes("taller gratuito") ||
        checkText.includes("capacitación gratuita") ||
        checkText.includes("capacitacion gratuita")
      );

      if (isSpamOrWebinar && !checkText.includes("vendo") && !checkText.includes("busco") && !checkText.includes("se vende") && !checkText.includes("se arrienda")) {
        console.log(`[JANIA-SPAM-GUARD] ⛔ Mensaje detectado como SPAM/Webinar/Curso (${checkText.substring(0, 60)}...). Rechazando con 🚫.`);
        return {
          classification: "VIOLACION_DE_NORMAS",
          response: "",
          dmResponse: "",
          shouldSendDM: false,
          reactionEmoji: "🚫",
          inserted: false
        };
      }
    }

    const rawPhone = userId.split('@')[0];
    const realName = await resolveRealName(userId, userName);

    const alreadyGreeted = await checkAlreadyGreeted(userId);
    const senderInfo = analyzeSender(realName, userId, alreadyGreeted);
    const n = extractFirstName(realName) || 'colega';

    const session = await getPendingSession(userId);
    if (session) {
      const combinedText = session.messageToProcess + " \n[COMPLEMENTO]: " + text;
      await deletePendingSession(userId);
      console.log(`[JanIA-PendingSession] Resolviendo sesión pendiente para ${userId}. Combinando textos y re-procesando...`);
      return await processWhatsAppMessage(
        combinedText,
        userId,
        userName,
        hasMedia || !!session.imageBuffer,
        scrapedData,
        audioUrl,
        imageBuffer || session.imageBuffer,
        isGroup,
        pdfBuffer,
        pdfMimeType,
        groupJid
      );
    }

    // ── MECANISMO DE URL DIFERIDA (Doctrina v31.82) ──────────────────────────────────────────
    // Cuando un colega publica el texto del inmueble y luego envía la URL del portal en un
    // mensaje separado (patrón muy común en WhatsApp), JanIA rescata el enlace y lo asocia
    // retroactivamente al inmueble más reciente de ese mismo usuario (≤ 10 minutos).
    // También recupera el nombre del grupo (origen_nombre) si faltaba.
    const trimmedTextForUrl = text.trim();
    const urlLineOnly = trimmedTextForUrl.split('\n').find(l => /^https?:\/\/\S+$/.test(l.trim()));
    const isSoloUrlMsg = !!urlLineOnly && trimmedTextForUrl.replace(/\s+/g, '').length <= urlLineOnly.replace(/\s+/g, '').length + 5;
    if (isSoloUrlMsg && urlLineOnly && esDominioPermitido(urlLineOnly.trim())) {
      const soloUrl = urlLineOnly.trim();
      const TEN_MIN_AGO = new Date(Date.now() - 10 * 60 * 1000);
      try {
        const db = await getDb();
        if (!db) throw new Error('DB no disponible');
        const recentProps = await db
          .select({ id: properties.id, rawText: properties.rawText, origenNombre: properties.origenNombre })
          .from(properties)
          .where(and(
            eq(properties.idUsuarioWhatsapp, userId.split('@')[0]),
            gte(properties.createdAt, TEN_MIN_AGO),
            eq(properties.available, true)
          ))
          .orderBy(desc(properties.createdAt))
          .limit(1);

        if (recentProps.length > 0) {
          const prop = recentProps[0];
          const portalInfo = extractPortalAndListingId(soloUrl);
          const updatedRaw = (prop.rawText || '').trimEnd().endsWith(':')
            ? `${prop.rawText}\n${soloUrl}`
            : `${prop.rawText}\n\n🔗 Info y galería:\n${soloUrl}`;

          await db.update(properties).set({
            externalUrl: soloUrl,
            rawText: updatedRaw,
            origenNombre: prop.origenNombre || groupName || undefined,
            origenId: groupJid || undefined,
            ...(portalInfo?.portal ? { portal: portalInfo.portal } : {}),
            ...(portalInfo?.listingId ? { externalListingId: portalInfo.listingId } : {}),
          }).where(eq(properties.id, prop.id));

          console.log(`[JanIA-URLDiferida] ✅ URL de portal enlazada retroactivamente a Prop #${prop.id} de ${userId}: ${soloUrl}`);
          return { classification: 'INMUEBLE' as const, response: '', reactionEmoji: '🔗', inserted: false };
        }
      } catch (urlPatchErr: unknown) {
        console.warn(`[JanIA-URLDiferida] ⚠️ Error al enlazar URL diferida: ${urlPatchErr instanceof Error ? urlPatchErr.message : String(urlPatchErr)}`);
      }
    }
    // ────────────────────────────────────────────────────────────────────────────────────────

    let messageToProcess = text;

    // Texto del usuario — preserva 100% el texto exacto recibido desde WhatsApp incluyendo URLs, emojis y montos.
    const rawUserText = text;

    // Dominios que nunca deben raparse — redes sociales, links de WhatsApp, etc.
    // Scraping these returns marketing pages, login walls, or contact info — not property data.
    const SCRAPE_BLOCKLIST = [
      'wa.me', 'whatsapp.com', 'whatsapp.net',
      'facebook.com', 'fb.com', 'fb.watch',
      'instagram.com',
      'youtube.com', 'youtu.be',
      'tiktok.com',
      'twitter.com', 'x.com',
      'linkedin.com',
      'maps.google.com', 'photos.app.goo.gl', 'photos.google.com',
      'drive.google.com', 'docs.google.com',
      'bit.ly', 'tinyurl.com', 'goo.gl',
    ];

    function isScrapeable(url: string): boolean {
      try {
        const hostname = new URL(url).hostname.replace('www.', '').toLowerCase();
        return !SCRAPE_BLOCKLIST.some(blocked => hostname.includes(blocked));
      } catch {
        return false;
      }
    }

    // Extraer y procesar enlaces con evasión de bloqueos (Bypass)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);
    let jinaExtractedText = "";
    if (urls && urls.length > 0) {
      for (const url of urls) {
        // Saltar dominios bloqueados — jamas raspar wa.me, redes sociales, etc.
        if (!isScrapeable(url)) {
          console.log(`[Scraper-Bypass] Dominio bloqueado, omitiendo scraping: ${url}`);
          continue;
        }
        let content = await scrapeUrlWithBypass(url);
        if (content) {
          // Remover imágenes markdown y líneas con solo URLs (contaminación visual)
          content = content
            .replace(/!\[.*?\]\(.*?\)/g, '')          // imágenes markdown ![]()
            .replace(/^https?:\/\/[^\s]+$/gm, '')      // líneas que son solo URLs
            .replace(/\n{3,}/g, '\n\n')                // colapsar saltos excesivos
            .trim();
          if (content.length > 50) { // Ignorar contenido trivial
            jinaExtractedText += `\n\n[CONTENIDO DE ENLACE WEB EXTRAÍDO DE ${url}]:\n${content.substring(0, 15000)}\n[FIN CONTENIDO ENLACE]\n`;
          }
        }
      }
    }
    // messageToProcess lleva el contexto completo para el LLM (con el texto del portal)
    if (jinaExtractedText) {
      messageToProcess += jinaExtractedText;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // FILTRO ABSOLUTO IMPERMEABLE DE SPAM, WEBINARS, CURSOS Y PUBLICIDAD
    // ══════════════════════════════════════════════════════════════════════════
    if (!isWebUser && messageToProcess) {
      const checkText = messageToProcess.toLowerCase();
      const isSpamOrWebinar = (
        checkText.includes("zoom.us") ||
        checkText.includes("us06web.zoom.us") ||
        checkText.includes("chat.whatsapp.com") ||
        checkText.includes("únase a nuestra reunión") ||
        checkText.includes("unase a nuestra reunion") ||
        checkText.includes("entrenamiento 100% gratuito") ||
        checkText.includes("estrategias en redes sociales") ||
        checkText.includes("como funcionan las ventas") ||
        checkText.includes("invitación al chat en grupo") ||
        checkText.includes("invitacion al chat en grupo") ||
        checkText.includes("unirme al grupo") ||
        checkText.includes("máster class") ||
        checkText.includes("masterclass") ||
        checkText.includes("taller gratuito") ||
        checkText.includes("capacitación gratuita") ||
        checkText.includes("capacitacion gratuita")
      );

      if (isSpamOrWebinar && !checkText.includes("vendo") && !checkText.includes("busco") && !checkText.includes("se vende") && !checkText.includes("se arrienda")) {
        console.log(`[JANIA-SPAM-GUARD] ⛔ Mensaje detectado como SPAM/Webinar/Curso (${checkText.substring(0, 60)}...). Operación silenciosa total, sin guardar en BD ni emoji.`);
        return {
          classification: "VIOLACION_DE_NORMAS",
          response: "",
          dmResponse: "",
          shouldSendDM: false,
          reactionEmoji: undefined,
          inserted: false
        };
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CHUNKER SPLITTER v21.21 — Sub-Agente Fragmentador de Mensajes Masivos
    // Si el mensaje tiene >150 palabras y múltiples patrones de inicio de oferta
    // (emojis repetidos, títulos en mayúsculas, separadores ——), lo divide
    // en publicaciones independientes, heredando teléfono y enlace_origen.
    // ══════════════════════════════════════════════════════════════════════════
    if (!isWebUser && !pdfBuffer) {
      const wordCount = (text.match(/\S+/g) || []).length;
      const emojiPropertyStarters = (text.match(/(?:🏡|🏠|🏢|🔑|💥|🌷|🌺|🌸|⭐|✨|🔥|🎯|📍)/g) || []).length;
      const hasMultipleStarters = emojiPropertyStarters >= 2 || wordCount > 200;

      if (wordCount > 150 && hasMultipleStarters) {
        console.log(`[CHUNKER] 📦 Mensaje largo (${wordCount} palabras, ${emojiPropertyStarters} emojis-inicio). Fragmentando...`);

        const parentUrl = urls && urls.length > 0 ? urls[0] : null;
        const parentPhone = normalizePhoneNumber(userId, text);

        // Dividir por emoji de inicio de publicación al comienzo de línea
        const emojiSplitPattern = /(?=\n\s*(?:🏡|🏠|🏢|🏗|🏘|🔑|💥|🌷|🌸|🌺|🌻|🌹|⭐|✨|🔥|💫|🎯|📍))/g;
        let rawChunks = text.split(emojiSplitPattern).map((c: string) => c.trim()).filter((c: string) => c.length > 80);

        if (rawChunks.length < 2) {
          // Fallback: saltos de línea triples
          rawChunks = text.split(/\n{3,}/).map((c: string) => c.trim()).filter((c: string) => c.length > 80);
        }

        if (rawChunks.length >= 2) {
          console.log(`[CHUNKER] ✂️ Fragmentado en ${rawChunks.length} publicaciones independientes.`);
          let firstResult: JanIAResult | null = null;

          for (let idx = 0; idx < rawChunks.length; idx++) {
            const chunk = rawChunks[idx];
            const chunkWords = (chunk.match(/\S+/g) || []).length;
            if (chunkWords < 15) {
              console.log(`[CHUNKER] ⏭️ Fragmento ${idx + 1} ignorado (muy corto: ${chunkWords} palabras).`);
              continue;
            }

            // Heredar teléfono y enlace_origen en cada fragmento
            let enriched = chunk;
            if (parentPhone && !enriched.includes(parentPhone.replace('+', ''))) {
              enriched += `\n📞 ${parentPhone}`;
            }
            if (parentUrl && !enriched.includes(parentUrl)) {
              enriched += `\n🔗 ${parentUrl}`;
            }

            console.log(`[CHUNKER] 🔄 Procesando fragmento ${idx + 1}/${rawChunks.length}: "${chunk.substring(0, 60)}..."`);
            try {
              const chunkResult = await processWhatsAppMessage(
                enriched, userId, userName, false, [], undefined,
                imageBuffer, isGroup, undefined, undefined, groupJid, groupName
              );
              if (chunkResult.inserted) {
                console.log(`[CHUNKER] ✅ Fragmento ${idx + 1} insertado como ${chunkResult.classification}.`);
              }
              if (!firstResult && chunkResult.classification !== "CONSULTA_GENERAL") {
                firstResult = chunkResult;
              }
            } catch (ce: any) {
              console.error(`[CHUNKER] ❌ Error fragmento ${idx + 1}:`, ce?.message || ce);
            }
          }

          if (firstResult) return firstResult;
          console.log(`[CHUNKER] ⚠️ Ningún fragmento válido. Procesando como mensaje único.`);
        }
      }
    }
    // ══════════════════════════════════════════════════════════════════════════

    let isFromAudio = false;

    // Intercepción rápida de mensajes OFF-TOPIC solo para WhatsApp (el chat WEB tiene Libre Albedrío)
    const cleanText = text.toLowerCase().trim();
    const isMediaOrAudio = hasMedia || !!audioUrl || !!imageBuffer || !!pdfBuffer;

    if (!isWebUser && !isMediaOrAudio && cleanText.length > 15) {
      const onTopicKeywords = [
        "apto", "apartamento", "casa", "lote", "finca", "bodega", "oficina", "local", "inmueble", "propiedad",
        "predio", "terreno", "proyecto", "arriendo", "alquiler", "vendo", "venta", "compro", "compra", "busco",
        "ofrezco", "necesito", "permuto", "venpermuto", "estrato", "m2", "metros", "habitacion", "habitación",
        "alcoba", "alcobas", "baño", "baños", "cocina", "garaje", "garajes", "parqueadero", "parqueaderos",
        "canon", "administracion", "administración", "precio", "millones", "cop", "arrendar", "vender", "comprar",
        "bogota", "bogotá", "medellin", "medellín", "cali", "barranquilla", "bucaramanga", "cartagena",
        "barrio", "sector", "zona", "calle", "carrera", "avenida", "contrato", "arrendamiento", "promesa",
        "escritura", "notaria", "notaría", "registro", "sucesión", "sucesion", "herencia", "embargo",
        "saneamiento", "comision", "comisión", "corretaje", "avalúo", "avaluo", "jania", "vecy", "bot", "ayuda",
        "cómo", "como", "funciona", "publicar", "registrar", "match", "coincidencia", "contacto", "cuenta",
        "hola", "gracias", "saludo", "req", "tengo", "disponible", "cliente", "clientes", "clienta", "clientas",
        "comprando", "buscando", "solicito", "solicitamos", "piso", "balcon", "balcón", "terraza", "deposito",
        "depósito", "conjunto", "edificio", "ph", "penthouse", "duplex", "dúplex", "triplex", "tríplex", "estudio",
        "negocio", "negocios", "fotos", "foto", "inversion", "inversión", "inversionista", "inversionistas",
        "inmobiliaria", "inmobiliario", "asesor", "asesora", "broker", "privado", "inbox", "habitaciones",
        "parqueaderos", "colina", "niza", "suba", "usaquen", "usaquén", "cedritos", "chico", "chicó", "rosales",
        "chapinero", "poblado", "laureles"
      ];

      const hasOnTopicKeyword = onTopicKeywords.some(keyword => cleanText.includes(keyword));
      if (!hasOnTopicKeyword) {
        console.log(`[JanIA-OffTopic] Mensaje fuera de tema detectado para ${userId} en ${groupJid || 'DM'}: "${text.substring(0, 50)}...".`);

        let staticText = "";
        if (isGroup || groupJid) {
          const jid = groupJid || "";
          let groupRulesName = "el grupo";
          let acceptedTopics = "publicar y buscar propiedades para hacer matching comercial de inmuebles y requerimientos";

          if (jid === '120363417740040773@g.us') {
            groupRulesName = "𝗩𝗘𝗖𝗬 𝗧𝗜𝗣𝗦💡/𝗡𝗢𝗧𝗜𝗖𝗜𝗔𝗦📰/𝗖𝗢𝗡𝗦𝗨𝗟𝗧𝗔𝗦 𝗜𝗡𝗠𝗢𝗕𝗜𝗟𝗜𝗔𝗥𝗜𝗔𝗦⁉️🏠";
            acceptedTopics = "tips, noticias, debates y consultas inmobiliarias (jurídicas, contratos, arrendamientos, tributación y estudios de mercado)";
          } else if (jid === '120363403507276533@g.us') {
            groupRulesName = process.env.GROUP_ZERO_NAME || '𝗣𝗥𝗢𝗬𝗘𝗖𝗧𝗢: 🌐 "𝗩𝗘𝗖𝗬𝗕𝗜𝗘𝗡𝗘𝗦𝗥𝗔𝗜𝗖𝗘𝗦"🚀';
            acceptedTopics = "temas libres del sector inmobiliario, foros, debates, experiencias del negocio y sugerencias sobre VECY BIENES RAÍCES";
          } else {
            groupRulesName = "𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗢🏠 𝗢𝗙𝗘𝗥𝗧𝗔𝗦🏷️ 𝗬 𝗗𝗘𝗠𝗔𝗡𝗗𝗔𝗦📝 𝗖𝗢𝗟𝗢𝗠𝗕𝗜𝗔🇨🇴";
            acceptedTopics = "publicación directa de ofertas (Inmuebles) y demandas (Requerimientos) comerciales";
          }

          staticText = `Hola @${rawPhone} 👋🏻. Detecté que tu publicación trata sobre un tema que no corresponde al propósito de este canal (fechas festivas, política, religión o contenido ajeno al corretaje).\n\nTe recuerdo que en el grupo *${groupRulesName}* solo se admiten temas de: **${acceptedTopics}**.\n\nTe solicito amablemente que elimines tu mensaje para mantener el orden del chat, y te invito a revisar y comprender las normas completas del grupo que se encuentran en su descripción. ¡Gracias por tu colaboración y cultura de red! 🤝🚀`;
        } else {
          staticText = `Hola ${realName || 'colega'} 👋🏻. Como asistente de VECY Bienes Raíces, estoy entrenada exclusivamente para ayudarte con temas de bienes raíces (buscar, publicar o cruzar inmuebles), asesorías legales de corretaje y arrendamientos, o el soporte de nuestra plataforma. 🏠✨\n\nPor favor, hazme una consulta que esté relacionada con estos temas. ¡Con gusto te responderé! 😊`;
        }

        return {
          classification: "VIOLACION_DE_NORMAS",
          response: staticText,
          dmResponse: staticText,
          reactionEmoji: "🚫"
        };
      }
    }



    // 1. Transcripción de Voz
    if (audioUrl) {
      if (audioUrl.startsWith("mock-audio:")) {
        messageToProcess = audioUrl.replace("mock-audio:", "");
        isFromAudio = true;
      } else {
        console.log(`[JanIA] Transcribiendo nota de voz para ${userId}...`);
        const transcription = await transcribeAudio({ audioUrl });
        if (!('error' in transcription)) {
          messageToProcess = transcription.text;
          isFromAudio = true;
        }
      }
    }

    let flyerData: FlyerVisionResult | null | undefined = flyerVisionData;
    if (!flyerData && imageBuffer) {
      console.log(`[JanIA] 👁️ Analizando imagen/flyer con visión artificial especializada...`);
      try {
        flyerData = await extractFlyerVisionSafely(imageBuffer);
      } catch (errVision: any) {
        console.warn(`[JanIA] ⚠️ Error en extractFlyerVisionSafely:`, errVision?.message || errVision);
        flyerData = {
          isFlyerOrBanner: false,
          classification: "CONSULTA_GENERAL",
          transactionType: "venta",
          flyerVerbatimText: ""
        };
      }
    }

    const isGenuineFlyerData = !!(flyerData && flyerData.isFlyerOrBanner && (flyerData.classification === "INMUEBLE" || flyerData.classification === "REQUERIMIENTO") && flyerData.flyerVerbatimText && flyerData.flyerVerbatimText.trim().length >= 15);

    if (isGenuineFlyerData && flyerData) {
      const verbatim = flyerData.flyerVerbatimText || "";
      if (verbatim) {
        messageToProcess = (messageToProcess && messageToProcess.trim() !== "" && !messageToProcess.includes("[Publicación de Imagen"))
          ? `${messageToProcess}\n\n[FICHA TÉCNICA EXTRAÍDA DEL FLYER]:\n${verbatim}`
          : verbatim;
      }
    } else if ((!messageToProcess || messageToProcess.trim() === "") && imageBuffer) {
      messageToProcess = "[Fotografía ambiental sin texto publicitario]";
    }

    // 2. Preparación de Contexto LLM Multimodal
    let contextText = `Mensaje de ${userName || userId}: ${messageToProcess}`;
    if (isFromAudio) {
      contextText += `\n[SISTEMA - NOTA DE VOZ]: El usuario te envió este mensaje como nota de voz (audio). Dado que te enviaron audio, es preferible y de alta importancia que respondas en audio ("wantsVoice": true) si tu respuesta es corta (saludos, confirmaciones, consultas breves, o respuestas de menos de 250 caracteres). **EXCEPCIÓN CRÍTICA**: Si el usuario te pide explícitamente que le respondas por audio, nota de voz o de viva voz por cualquier razón, debes omitir el límite de longitud y responder obligatoriamente por audio ("wantsVoice": true y colocar toda tu respuesta en "voiceResponse" de forma limpia), a menos que sea un contrato extenso o tabla de datos que no se pueda leer de manera natural. Si la respuesta requiere explicaciones largas, tablas o minutas/contratos y el usuario NO pidió expresamente que fuera audio, responde obligatoriamente por escrito ("wantsVoice": false).`;
    }
    if (scrapedData.length > 0) contextText += `\n[SISTEMA - DATOS SCRAPED]: ${JSON.stringify(scrapedData)}`;
    if (imageBuffer) {
      contextText += `\n[SISTEMA - ANÁLISIS MULTIMODAL DE IMAGEN / FLYER / BANNER (OCR Y VISIÓN COMERCIAL)]:
Se ha adjuntado una imagen. Analízala con visión artificial avanzada y determina:
1. "isFlyerOrBanner":
   - Asigna TRUE si la imagen es una infografía publicitaria, flyer comercial, banner, afiche o collage que contiene texto tipográfico impreso con especificaciones inmobiliarias de OFERTA (precio, área, alcobas, baños, garajes, sector, teléfono de contacto) o de DEMANDA (búsqueda de cliente, compro casa/apto, presupuesto, sectores solicitados).
   - Asigna FALSE si es simplemente una FOTOGRAFÍA AMBIENTAL COMÚN (foto fotográfica de una sala, comedor, cocina, fachada, baño, lámpara, etc.) SIN texto publicitario estructurado.
2. Si "isFlyerOrBanner" es TRUE:
   - Transcribe TODO el texto literal y legible de la imagen en "flyerVerbatimText".
   - Extrae todas las especificaciones numéricas y textuales en "extractedData" (precio, rentPrice, adminFee, area, bedrooms, bathrooms, garages, stratum, zone, city, contactPhone, propertyType, transactionType).
   - Clasifica como "INMUEBLE" si describe una oferta de venta/arriendo, o como "REQUERIMIENTO" si describe una búsqueda o demanda de cliente comprador/arrendatario.
3. Si "isFlyerOrBanner" es FALSE y el mensaje NO contiene una ficha técnica escrita por el usuario, clasifica como "CONSULTA_GENERAL" con "inserted": false.`;
    }
    if (pdfBuffer) {
      contextText += `\n[SISTEMA: DOCUMENTO PDF DETECTADO - ANÁLISIS MULTIMODAL INMOBILIARIO]:
Se ha adjuntado un documento PDF. Analízalo exhaustivamente con tus capacidades nativas de lectura de documentos:
1. Si el documento PDF es un REQUERIMIENTO, DEMANDA O BÚSQUEDA DE UN CLIENTE (ej. "ESTOY BUSCANDO...", búsqueda de bodega, apartamento, casa, lote, oficina o local):
   - Clasifícalo obligatoriamente como "REQUERIMIENTO".
   - Establece "inserted": true.
   - Extrae con precisión en "extractedData": title, propertyType, transactionType (arriendo, venta, etc.), presupuestoMax, presupuestoMin, area (o areaMin), bedrooms, bathrooms, garages, stratum, zone/neighborhood (o zonaDeseada), city, contactPhone, characteristics y detalles.
2. Si el documento PDF es una FICHA TÉCNICA, PRESENTACIÓN COMERCIAL O BROCHURE DE UN INMUEBLE (oferta de venta o arriendo):
   - Clasifícalo obligatoriamente como "INMUEBLE".
   - Establece "inserted": true.
   - Extrae con precisión en "extractedData": title, propertyType, transactionType, price (o rentPrice), adminFee, area, bedrooms, bathrooms, garages, stratum, zone, city, contactPhone, amenities y descripción.
3. Si el documento PDF es un impuesto predial, certificado de tradición o contrato, extrae los datos correspondientes.`;
    }

    const statsSummary = await getLiveStats();
    if (statsSummary) {
      contextText += `\n${statsSummary}`;
    }

    const firstName = extractFirstName(realName) || 'colega';
    const bogotaTime = new Date().toLocaleString("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hour12: false });
    const userGender = senderInfo.adj === "juiciosa" ? "Femenino" : (senderInfo.adj === "juicioso" ? "Masculino" : "No Especificado");

    const outsideHours = isWebUser ? false : isOutsideWorkingHours();
    const estadoOperacion = outsideHours ? "fuera_de_horario" : "en_horario";

    const greetingInstruction = `\n\n[SISTEMA - METADATOS DEL MENSAJE (VARIABLES CRÍTICAS)]:
- {{hora}}: ${bogotaTime}
- {{canal}}: ${isWebUser ? "Consola Web 24/7" : (isGroup ? `Grupo WhatsApp - [${groupName || "Grupo Inmobiliario WhatsApp"}]` : "dm")}
- {{genero}}: ${userGender}
- {{es_nuevo_usuario}}: ${!alreadyGreeted ? "true" : "false"}
- {{estado_operacion}}: ${estadoOperacion}

[SISTEMA - INSTRUCCIÓN DE SALUDO Y COMPORTAMIENTO]:
- Ya has saludado al usuario hoy: ${alreadyGreeted ? "SÍ" : "NO"}.
- Tipo de conversación actual: ${isWebUser ? "CHAT WEB DE LIBRE ALBEDRÍO 24/7" : (isGroup ? "GRUPO DE WHATSAPP" : "CHAT PRIVADO / DM")}.
- Primer nombre del usuario: "${firstName}".
- REGLAS CRÍTICAS DE RESPUESTA:
  * Si "Ya has saludado al usuario hoy" es SÍ (solo aplica a WhatsApp):
    - ¡PROHIBIDO SALUDAR! No uses palabras como "Hola", "Buenas tardes", "Qué gusto", "Bienvenido", ni variantes de saludo o bienvenida.
  * En CHAT WEB 24/7: Conversa libremente, saluda si es natural o ve directo al tema de forma elocuente y amigable.`;

    contextText += greetingInstruction;

    if (isWebUser) {
      contextText += `\n\n[INSTRUCCIÓN MAESTRA - CHAT WEB DE LIBRE ALBEDRÍO 24/7]:
Estás interactuando con el usuario directamente en la CONSOLA WEB de VECY Bienes Raíces.
- Tienes LIBERTAD TOTAL DE RAZONAMIENTO Y PENSAMIENTO (Libre Albedrío 24/7).
- NUNCA apliques restricciones de grupos de WhatsApp, horarios de oficina ni bloqueos de temas.
- Responde a cualquier inquietud general, jurídica, de avalúos, cálculo financiero o conversación inmobiliaria con razonamiento profundo, calidez y elocuencia.
- Si el usuario te envía un inmueble o requerimiento, extrae los datos para el sistema y dale una respuesta rica, entusiasta y completa confirmando la información.`;
    }

    if (!isWebUser && !alreadyGreeted && outsideHours && !isGroup) {
      const saludo = getGreetingByTime();
      contextText += `\n[INSTRUCCIÓN CRÍTICA DE PRESENTACIÓN FUERA DE HORARIO]:
Como esta es tu primera interacción con este usuario el día de hoy, y nos encontramos fuera de horario de oficina, debes presentarte de manera muy cálida y entusiasta al inicio de tu respuesta:
"¡${saludo}, *${n}*! 😊 Soy JanIA, la asistente virtual de Inteligencia Artificial de VECY, creada y entrenada por el equipo de desarrollo de VECY Bienes Raíces. Estoy aquí para atenderte de forma personalizada, resolver tus inquietudes y ayudarte a registrar tus inmuebles o requerimientos de forma ágil mientras nuestros asesores humanos regresan a su horario habitual de 8:00 am a 8:00 pm. 🚀🤝 ¿Cuéntame en qué puedo ayudarte en este momento?"
Redacta esta bienvenida integrada con tu respuesta a su pregunta, usando emojis alusivos de manera elocuente. Además, si la respuesta a su consulta es corta, establece "wantsVoice": true y coloca una versión hablada muy amigable de esta bienvenida y su respuesta en "voiceResponse" (sin viñetas o asteriscos de negrita) para que el usuario reciba un audio de tu voz presentándote de forma humana.`;
    }

    const textLower = messageToProcess.toLowerCase();
    const isReplicationRequest =
      textLower.includes("replica") ||
      textLower.includes("repite") ||
      textLower.includes("lee este") ||
      textLower.includes("lee esto") ||
      textLower.includes("lee literalmente") ||
      textLower.includes("di literalmente") ||
      textLower.includes("reproduce");

    if (isReplicationRequest) {
      contextText += `\n[INSTRUCCIÓN CRÍTICA DE REPLICACIÓN LITERAL DE AUDIO]: El usuario te está pidiendo de manera explícita que repliques, repitas o leas un texto o párrafo específico en una nota de voz/audio.
Por lo tanto, DEBES hacer lo siguiente:
1. Establece obligatoriamente "wantsVoice": true.
2. En el campo "voiceResponse", coloca EXACTAMENTE el texto o párrafo literal que el usuario te solicitó que leyeras, eliminando emojis y markdown (como asteriscos o negritas) para que el sintetizador de voz lo lea de forma fluida y natural, sin deletrear. Por ejemplo, si te dice "replica esto: COMPROMISO DE HONOR VECY", el campo "voiceResponse" debe contener el texto de ese compromiso literalmente.
3. En el campo "response", coloca también el texto literal con su formato y emojis correspondientes.
4. NUNCA respondas con confirmaciones conversacionales como "¡Entendido, colega! He procesado el comunicado...", ni agregues discursos tuyos. Tu respuesta "response" y "voiceResponse" debe ser únicamente el texto que te pidieron leer de forma exacta y literal.`;
    }

    const isValuationQuery =
      textLower.includes("valuar") ||
      textLower.includes("avaluo") ||
      textLower.includes("avalúo") ||
      textLower.includes("cuanto vale") ||
      textLower.includes("cuánto vale") ||
      textLower.includes("valor metro cuadrado") ||
      textLower.includes("valor m2") ||
      textLower.includes("precio metro cuadrado") ||
      textLower.includes("precio m2") ||
      textLower.includes("cuanto puedo cobrar") ||
      textLower.includes("cuánto puedo cobrar") ||
      textLower.includes("en que valor") ||
      textLower.includes("en qué valor") ||
      textLower.includes("estimar precio");

    const isLegalQuery =
      (textLower.includes("sucesión") || textLower.includes("sucesion") ||
        textLower.includes("herencia") || textLower.includes("divorcio") ||
        textLower.includes("embargo") || textLower.includes("saneamiento") ||
        textLower.includes("compraventa") || textLower.includes("arrendamiento") ||
        textLower.includes("ley 820") || textLower.includes("ley 675") ||
        textLower.includes("no me pago") || textLower.includes("no me pagó") ||
        textLower.includes("robo de comision") || textLower.includes("robo de comisión") ||
        textLower.includes("disputa") || textLower.includes("notaría") || textLower.includes("notaria")) &&
      !textLower.includes("50/50") && !textLower.includes("50-50");

    const isListingOrReq = hasRealEstateTextKeyword(textLower);

    const enableSearch = !isListingOrReq && (isValuationQuery || isLegalQuery || textLower.includes("buscar en google"));

    // Obtener historial de chat reciente (Supercerebro) - Omitir en grupos para evitar contaminación de contexto
    const history = (isGroup || groupJid) ? [] : await getRecentChatHistory(userId, 20);
    // Obtener estadísticas en tiempo real para que JanIA pueda responder con datos exactos
    const liveStats = await getLiveStats();
    const systemContent = liveStats
      ? `${buildSystemPrompt(groupJid)}\n\n${liveStats}`
      : buildSystemPrompt(groupJid);

    const llmMessages = [
      { role: "system", content: systemContent }
    ];

    if (history.length > 0) {
      if (
        history[history.length - 1].role === "user" &&
        history[history.length - 1].content.trim() === contextText.trim()
      ) {
        history.pop();
      }
      llmMessages.push(...history);
    }
    llmMessages.push({ role: "user", content: contextText });

    let result: JanIAResult;

    // ── FAST-PATH PARA FLYERS / AFICHES INMOBILIARIOS ESTRUCTURADOS (v31.23) ──
    // Si el flyer comercial ya fue analizado y estructurado con éxito por extractFlyerVision
    // y el usuario no envió un texto conversacional largo que amerite el prompt legal de 25k tokens,
    // construimos el resultado directamente con 0ms de demora, 0 riesgo de 429 y 100% de fidelidad.
    const isPureFlyer = isGenuineFlyerData && flyerData &&
      (!text || text.trim().length < 60 || text.includes("[Publicación de Imagen") || text.includes("[Fotografía ambiental"));

    if (flyerData && isPureFlyer) {
      const fd = flyerData;
      console.log(`[JanIA] ⚡ Fast-Path Vision activado: flyer comercial '${fd.title || fd.classification}' estructurado directamente sin invocar prompt legal masivo.`);
      const tx = (fd.transactionType || "").toLowerCase();
      const isPermuta = tx.includes("permuta") || tx === "venta_permuta";
      const isRent = tx.includes("arriendo") || tx === "arriendo_temporal";
      let emoji = "👍";
      if (fd.classification === "INMUEBLE") {
        emoji = isPermuta ? "🔀" : (isRent ? "👌" : "👍");
      } else {
        emoji = isPermuta ? "🔄" : (isRent ? "✏️" : "📝");
      }

      result = {
        classification: fd.classification as any,
        response: `Ficha técnica capturada exitosamente desde el flyer comercial: ${fd.title || ''}`,
        reactionEmoji: emoji,
        isFlyerOrBanner: true,
        flyerVerbatimText: fd.flyerVerbatimText,
        extractedData: {
          title: fd.title,
          propertyType: fd.propertyType,
          transactionType: fd.transactionType,
          price: fd.price,
          rentPrice: fd.rentPrice,
          presupuestoMax: fd.presupuestoMax,
          area: fd.area,
          bedrooms: fd.bedrooms,
          bathrooms: fd.bathrooms,
          garages: fd.garages,
          city: fd.city || "Bogotá, D.C.",
          zone: fd.zone,
          contactPhone: fd.contactPhone,
          contactName: fd.contactName,
          rawText: fd.flyerVerbatimText || messageToProcess
        },
        mentions: []
      };
    } else if (
      !isWebUser &&
      !imageBuffer &&
      !pdfBuffer &&
      !isFromAudio &&
      !isReplicationRequest &&
      !isValuationQuery &&
      !isLegalQuery &&
      groupJid !== '120363388701980315@g.us' &&
      groupJid !== '120363386903264426@g.us' &&
      (() => {
        const cleanLower = messageToProcess.toLowerCase();
        const detData = extractFallbackDataFromText(messageToProcess);
        const isDetDemand = /\b(?:busco|buscamos|se busca|se requiere|requiero|requerimiento|necesito|necesitamos|solicito|solicitamos|compro|comprador|comprar|para cliente|cliente busca|en búsqueda|en busqueda)\b/i.test(cleanLower);
        const hasDetPropType = /\b(?:casa|casas|apto|aptos|apartamento|apartamentos|bodega|bodegas|oficina|oficinas|lote|lotes|finca|fincas|local|locales|edificio|edificios|terreno|terrenos)\b/i.test(cleanLower);
        const hasDetTx = /\b(?:arriendo|arrienda|renta|rento|rentamos|alquilo|alquiler|canon|vendo|venta|vende|permuta)\b/i.test(cleanLower);
        const isHighConfidenceListing = (hasDetPropType && hasDetTx && (detData.price > 0 || detData.rentPrice > 0 || detData.area > 0 || detData.bedrooms > 0));
        const isHighConfidenceDemand = (isDetDemand && (hasDetPropType || detData.presupuestoMax > 0));
        return isHighConfidenceListing || isHighConfidenceDemand;
      })()
    ) {
      const cleanLower = messageToProcess.toLowerCase();
      const detData = extractFallbackDataFromText(messageToProcess);
      const isDetDemand = /\b(?:busco|buscamos|se busca|se requiere|requiero|requerimiento|necesito|necesitamos|solicito|solicitamos|compro|comprador|comprar|para cliente|cliente busca|en búsqueda|en busqueda)\b/i.test(cleanLower);
      const isExplicitVentaClean = /\b(?:venta|vendo|vendemos|se vende|en venta|venta directa|valor venta|precio venta|para venta)\b/i.test(cleanLower);
      const isRent = detData.transactionType === "arriendo" || (!isExplicitVentaClean && (cleanLower.includes("arriendo") || cleanLower.includes("canon") || cleanLower.includes("renta") || cleanLower.includes("alquiler")));
      const isPermuta = detData.transactionType.includes("permuta");
      const classification = isDetDemand ? "REQUERIMIENTO" : "INMUEBLE";
      const emoji = classification === "INMUEBLE"
        ? (isPermuta ? "🔀" : (isRent ? "👌" : "👍"))
        : (isPermuta ? "🔄" : (isRent ? "✏️" : "📝"));

      console.log(`[JanIA] ⚡ Fast-Path Determinista Activado (0ms, $0 COP): Publicación '${classification}' estructurada directamente sin consumir cuota LLM.`);

      result = {
        classification,
        response: "",
        reactionEmoji: emoji,
        extractedData: {
          title: detData.name || (classification === "INMUEBLE" ? `Inmueble en ${detData.city || 'Bogotá'}` : `Requerimiento en ${detData.city || 'Bogotá'}`),
          propertyType: detData.propertyType || "apartment",
          transactionType: isRent ? "arriendo" : (isPermuta ? "permuta" : "venta"),
          price: detData.price,
          rentPrice: detData.rentPrice,
          adminFee: detData.adminFee,
          presupuestoMax: detData.presupuestoMax,
          presupuestoMin: detData.presupuestoMin,
          adminFeeMax: detData.adminFee,
          area: detData.area,
          bedrooms: detData.bedrooms,
          bathrooms: detData.bathrooms,
          garages: detData.garages,
          stratum: detData.stratum,
          city: detData.city || "Bogotá, D.C.",
          zone: detData.neighborhood || "Bogotá",
          contactPhone: rawPhone,
          rawText: messageToProcess
        },
        mentions: []
      };
    } else {
      const response = await invokeLLM({
        messages: llmMessages,
        responseFormat: { type: "json_object", schema: janiaResultSchema },
        imageBuffer,
        pdfBuffer,
        pdfMimeType,
        enableSearch: enableSearch
      });

      const llmRes = response as any;
      if (!llmRes || !llmRes.choices || !llmRes.choices[0]) throw new Error("Fallo de comunicación con el LLM");

      const rawContent = llmRes.choices[0].message.content;
      try {
        result = parseSafeJSON(rawContent) as JanIAResult;
      } catch (parseErr: any) {
        console.error("[JanIA-Parser-Error] Error al deserializar JSON de JanIA:", parseErr.message);

        // Intentar extraer la clasificación real original mediante regex
        const classMatch = rawContent.match(/"classification"\s*:\s*"([^"]+)"/i);
        const extractedClass = classMatch ? classMatch[1].toUpperCase() : null;

        // Intentar extraer el campo "response" de forma limpia mediante expresión regular
        const responseMatch = rawContent.match(/"response"\s*:\s*"([\s\S]*?)"(?:\s*,\s*"|\s*})/);
        let fallbackText = responseMatch ? responseMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"') : null;

        if (!fallbackText) {
          const truncatedMatch = rawContent.match(/"response"\s*:\s*"([\s\S]*)/);
          if (truncatedMatch) {
            fallbackText = truncatedMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/["\}]+$/, '');
          }
        }

        const inferredClass = (extractedClass === "INMUEBLE" || extractedClass === "REQUERIMIENTO") ? extractedClass : "CONSULTA_GENERAL";

        if (fallbackText && fallbackText.trim() !== "") {
          result = {
            classification: inferredClass as any,
            response: fallbackText.trim(),
            mentions: []
          };
        } else if (rawContent && rawContent.trim() !== "") {
          const cleanContent = rawContent
            .replace(/"classification"\s*:\s*"[^"]*"/gi, "")
            .replace(/"response"\s*:\s*"/gi, "")
            .replace(/[\{\}\[\]"]/g, "")
            .replace(/classification:\s*\w+,?/gi, "")
            .replace(/response:\s*/gi, "")
            .trim();
          result = {
            classification: inferredClass as any,
            response: cleanContent || "Hola, he procesado tu consulta inmobiliaria.",
            mentions: []
          };
        } else {
          throw parseErr;
        }
      }
    }

    result.mentions = result.mentions || [];

    // Inyectar datos del flyer detectado por visión documental
    if (flyerData && (flyerData.isFlyerOrBanner || flyerData.classification === "INMUEBLE" || flyerData.classification === "REQUERIMIENTO")) {
      result.isFlyerOrBanner = true;
      result.flyerVerbatimText = flyerData.flyerVerbatimText;
      if (result.classification === "CONSULTA_GENERAL" || !result.classification || result.classification === "DATOS_INCOMPLETOS") {
        result.classification = flyerData.classification;
      }
      result.reactionEmoji = result.reactionEmoji || flyerData.reactionEmoji;
      result.extractedData = {
        ...(result.extractedData || {}),
        title: result.extractedData?.title || flyerData.title,
        propertyType: result.extractedData?.propertyType || flyerData.propertyType,
        transactionType: result.extractedData?.transactionType || flyerData.transactionType,
        price: (result.extractedData?.price && Number(result.extractedData.price) > 0) ? result.extractedData.price : flyerData.price,
        rentPrice: (result.extractedData?.rentPrice && Number(result.extractedData.rentPrice) > 0) ? result.extractedData.rentPrice : flyerData.rentPrice,
        presupuestoMax: (result.extractedData?.presupuestoMax && Number(result.extractedData.presupuestoMax) > 0) ? result.extractedData.presupuestoMax : flyerData.presupuestoMax,
        area: (result.extractedData?.area && Number(result.extractedData.area) > 0) ? result.extractedData.area : flyerData.area,
        bedrooms: result.extractedData?.bedrooms ?? flyerData.bedrooms,
        bathrooms: result.extractedData?.bathrooms ?? flyerData.bathrooms,
        garages: result.extractedData?.garages ?? flyerData.garages,
        city: result.extractedData?.city || flyerData.city,
        zone: result.extractedData?.zone || flyerData.zone,
        contactPhone: result.extractedData?.contactPhone || flyerData.contactPhone,
        contactName: result.extractedData?.contactName || flyerData.contactName,
        isFlyerOrBanner: true,
        flyerVerbatimText: flyerData.flyerVerbatimText
      };
      console.log(`[JanIA-Vision] 📑 Datos de flyer integrados a result. (Clasificación: ${result.classification}, Emoji: ${result.reactionEmoji})`);
    }

    // --- EVALUACIÓN DE ENMIENDAS Y CORRECCIONES EN VENTANA DE 2 HORAS ---
    if (messageToProcess) {
      const isAmendmentHandled = await handleAmendmentUpdate(userId, messageToProcess);
      if (isAmendmentHandled) {
        console.log(`[JANIA-AMENDMENT] Mensaje procesado como enmienda de 2h para ${userId}. Operando en Modo Fantasma 100% silencioso.`);
        result.inserted = false;
        result.classification = "CONSULTA_GENERAL";
        result.response = "";
        result.dmResponse = "";
        result.shouldSendDM = false;
        result.reactionEmoji = undefined;
        return result;
      }
    }

    // --- CAPA DE FILTRO ABSOLUTO DE SPAM, WEBINARS, CURSOS Y PUBLICIDAD ---
    if (messageToProcess) {
      const cleanText = messageToProcess.toLowerCase();

      const isSpamOrWebinar = (
        cleanText.includes("zoom.us") ||
        cleanText.includes("us06web.zoom.us") ||
        cleanText.includes("chat.whatsapp.com") ||
        cleanText.includes("únase a nuestra reunión") ||
        cleanText.includes("unase a nuestra reunion") ||
        cleanText.includes("entrenamiento 100% gratuito") ||
        cleanText.includes("estrategias en redes sociales") ||
        cleanText.includes("como funcionan las ventas") ||
        cleanText.includes("invitación al chat en grupo") ||
        cleanText.includes("invitacion al chat en grupo") ||
        cleanText.includes("unirme al grupo") ||
        cleanText.includes("máster class") ||
        cleanText.includes("masterclass") ||
        cleanText.includes("taller gratuito") ||
        cleanText.includes("capacitación gratuita") ||
        cleanText.includes("capacitacion gratuita")
      );

      if (isSpamOrWebinar && !cleanText.includes("vendo") && !cleanText.includes("busco") && !cleanText.includes("se vende") && !cleanText.includes("se arrienda")) {
        console.log(`[JANIA-SPAM-GUARD] ⛔ Mensaje detectado como SPAM/Webinar/Curso (${cleanText.substring(0, 50)}...). Operación silenciosa total, sin guardar en BD ni emoji.`);
        result.classification = "VIOLACION_DE_NORMAS";
        result.inserted = false;
        result.response = "";
        result.dmResponse = "";
        result.shouldSendDM = false;
        result.reactionEmoji = undefined;
        return result;
      }

      const isExplicitDemandKeyword = /\b(?:busco|buscamos|se busca|se requiere|requiero|requerimiento|requerimientos|necesito|necesitamos|solicito|solicitamos|solicitud|solicitudes|compro|comprando|comprador|compradores|comprar|en compra|para compra|negocio compra|para cliente|busca cliente|cliente busca|arrendatario|en búsqueda|en busqueda)\b/i.test(cleanText);
      const isExplicitOfferKeyword = /\b(?:ofrezco|ofrecemos|vendo|se vende|se arrienda|se renta|se alquila|en venta|en arriendo|en renta|en alquiler|para arriendo o venta|para venta o arriendo|en arriendo o venta|en venta o arriendo|arriendo o venta|venta o arriendo|vr renta|vr vta|canon arriendo|canon|alquilo|alquilamos|alquiler directo|rento|rentamos|tengo para|disponible|nuevo inmueble|venta directa|arriendo directo|arrendamos|pongo en arriendo|pongo en renta|apto familiar|comisi[oó]n 50[-/]50|punta compartida)\b/i.test(cleanText) || /photos\.app\.goo\.gl|drive\.google\.com\/(?:drive\/folders|file\/d)/i.test(cleanText);

      const isSearch = isExplicitDemandKeyword && !isExplicitOfferKeyword;
      const isOffer = isExplicitOfferKeyword && !isExplicitDemandKeyword;

      const hasRealEstateKeyword = hasRealEstateTextKeyword(cleanText);

      const _extTmp = result.extractedData || {};
      const hasTechnicalSpecs = (_extTmp.price && Number(_extTmp.price) > 0) ||
        (_extTmp.presupuestoMax && Number(_extTmp.presupuestoMax) > 0) ||
        (_extTmp.area && Number(_extTmp.area) > 0) ||
        (_extTmp.bedrooms && Number(_extTmp.bedrooms) > 0) ||
        (cleanText.includes("$") || /\b\d{2,4}\s*(?:m2|mts|millones|mm|mlls)\b/i.test(cleanText));

      // Detectar comentarios cortos de seguimiento, correcciones o ruido de chat (ej: "Corrección: 3 parqueaderos", "Bajo de precio", "Disponible?")
      const isChatNoisePhrase = (
        cleanText.includes("correccion:") ||
        cleanText.includes("corrección:") ||
        cleanText.includes("fe de erratas") ||
        cleanText.includes("rectificacion:") ||
        cleanText.includes("rectificación:") ||
        cleanText.includes("bajo de precio") ||
        cleanText.includes("sigue este enlace") ||
        cleanText.includes("ver el artículo en whatsapp") ||
        cleanText.includes("foto por interno") ||
        cleanText.includes("fotos por interno") ||
        cleanText.includes("info por interno") ||
        cleanText.includes("información por interno") ||
        cleanText.includes("escribir al interno") ||
        cleanText.includes("disponible?") ||
        cleanText.includes("aún disponible")
      );

      const isShortComment = !result.isFlyerOrBanner && !pdfBuffer && (isChatNoisePhrase || (!hasRealEstateKeyword && !isSearch && !isOffer && (cleanText.length < 25 || cleanText.split(/\s+/).length < 4))) && !hasTechnicalSpecs;

      // Detectar preguntas de recomendación, solicitudes de abogados/servicios legales, comprobantes o consultas no prediales
      const isGeneralInquiryOrRecommendation = !hasTechnicalSpecs && !isSearch && !isOffer && (
        cleanText.includes("alguien maneja") ||
        cleanText.includes("alguien recomienda") ||
        cleanText.includes("alguien conoce") ||
        cleanText.includes("senior living") ||
        cleanText.includes("alguien tiene contacto") ||
        cleanText.includes("quien maneja") ||
        cleanText.includes("quién maneja") ||
        cleanText.includes("quien recomienda") ||
        cleanText.includes("recomiendan plomero") ||
        cleanText.includes("recomiendan abogado") ||
        cleanText.includes("buscando un abogado") ||
        cleanText.includes("buscando abogado") ||
        cleanText.includes("algun abogado") ||
        cleanText.includes("algún abogado") ||
        cleanText.includes("restitucion de inmueble") ||
        cleanText.includes("restitución de inmueble") ||
        cleanText.includes("daviplata") ||
        cleanText.includes("nequi") ||
        cleanText.includes("comprobante de pago") ||
        cleanText.includes("recomiendan avaluador") ||
        cleanText.includes("alguien que haga") ||
        cleanText.includes("contacto de")
      ) && !cleanText.includes("busco apto") && !cleanText.includes("busco casa") && !cleanText.includes("busco bodega") && !cleanText.includes("presupuesto");

      if (!result.isFlyerOrBanner && !pdfBuffer && isGeneralInquiryOrRecommendation) {
        console.log(`[JANIA-FILTER] ⛔ Pregunta de recomendación o servicio general ignorada como Requerimiento/Inmueble: "${cleanText.substring(0, 50)}..."`);
        result.classification = "CONSULTA_GENERAL";
      } else if (isShortComment) {
        console.log(`[JANIA-FILTER] ⛔ Mensaje corto o corrección de chat omitido (${cleanText.substring(0, 40)}...). No se procesará como propiedad/requerimiento.`);
        result.classification = "CONSULTA_GENERAL";
      } else if (result.classification === "INMUEBLE" && isSearch && !isOffer) {
        console.log("[JANIA-CORRECTION] Cambiando clasificación de INMUEBLE a REQUERIMIENTO basado en heurística de texto.");
        result.classification = "REQUERIMIENTO";
      } else if (result.classification === "REQUERIMIENTO" && isOffer && !isSearch) {
        console.log("[JANIA-CORRECTION] Cambiando clasificación de REQUERIMIENTO a INMUEBLE basado en heurística de texto (Oferta explícita).");
        result.classification = "INMUEBLE";
      } else if ((result.classification === "CONSULTA_GENERAL" || result.classification === "DATOS_INCOMPLETOS" || !result.classification) && (hasRealEstateKeyword || isSearch || isOffer || hasTechnicalSpecs || !!pdfBuffer)) {
        if (hasTechnicalSpecs || hasRealEstateKeyword || isSearch || isOffer || !!pdfBuffer) {
          if (isSearch && !isOffer) {
            console.log("[JANIA-CORRECTION] Rescatando REQUERIMIENTO desde CONSULTA_GENERAL con datos técnicos verificados.");
            result.classification = "REQUERIMIENTO";
          } else if (isOffer || hasRealEstateKeyword) {
            console.log("[JANIA-CORRECTION] Rescatando INMUEBLE desde CONSULTA_GENERAL con datos técnicos verificados.");
            result.classification = "INMUEBLE";
          }
        } else {
          console.log("[JANIA-FILTER] No se rescata como Inmueble/Requerimiento por falta de especificaciones prediales suficientes.");
        }
      }

      // ── BLINDAJE ESTRICTO CONTRA FALSOS POSITIVOS (MENSAJES SIN INTENCIÓN PREDIAL) ──
      // Si el LLM lo clasificó como INMUEBLE o REQUERIMIENTO pero el mensaje no contiene
      // ninguna intención comercial real (no es búsqueda, no es oferta, no tiene tipología ni datos técnicos, ni viene PDF)
      const hasRealEstateIntent = result.isFlyerOrBanner || !!pdfBuffer || isSearch || isOffer || hasRealEstateKeyword || hasTechnicalSpecs;
      if ((result.classification === "INMUEBLE" || result.classification === "REQUERIMIENTO") && !hasRealEstateIntent) {
        console.log(`[JANIA-FILTER] ⛔ Descartando falso positivo de ${result.classification}: Mensaje sin intención predial explícita ("${cleanText.substring(0, 50)}..."). Degenerado a CONSULTA_GENERAL.`);
        result.classification = "CONSULTA_GENERAL";
      }

      // Doctrina v31.5: Descarte estricto de frases sueltas, teasers o saludos clasificados erróneamente
      const hollowEarlyCheck = isHollowListing(cleanText, null, (urls && urls.length > 0 ? urls[0] : null));
      const hasRealPropertyCore = /\b(?:casa|casas|apto|aptos|apartamento|apartamentos|bodega|bodegas|oficina|oficinas|lote|lotes|finca|fincas|local|locales|edificio|edificios|terreno|terrenos)\b/i.test(cleanText) &&
        /\b(?:renta|arriendo|alquiler|alquilo|canon|venta|vendo|se vende|se arrienda|se renta|se alquila|compro|comprar|busco|buscamos|requiero|requerimiento)\b/i.test(cleanText);

      if ((result.classification === "INMUEBLE" || result.classification === "REQUERIMIENTO") && hollowEarlyCheck.isHollow && !imageBuffer && !result.isFlyerOrBanner && !hasRealPropertyCore) {
        console.log(`[JANIA-FILTER] ⛔ Descartando publicación hueca o frase suelta (${hollowEarlyCheck.reason}): "${cleanText.substring(0, 60)}...". Degenerado a CONSULTA_GENERAL.`);
        result.classification = "CONSULTA_GENERAL";
      }
    }

    // ── GUARDARRAÍL DETERMINISTA ANTI-CONFUSIÓN OFERTA / DEMANDA (v31.85) ──
    // Evita categóricamente que demandas como "Busco apto", "Apto para compra ya", "Estoy buscando" se clasifiquen como INMUEBLE
    const textToCheckForDemand = (cleanText || messageToProcess || rawUserText || '').toLowerCase();
    const isExplicitDemandSignal = /\b(?:busco|buscamos|se\s*busca|estoy\s*buscando|estamos\s*buscando|cliente\s*busca|cliente\s*directo\s*busca|compro|compramos|para\s*compra\s*ya|para\s*compra|solicito\s*para\s*compra|solicito|requiero|requerimiento|necesito|necesitamos|quien\s*tiene|alguien\s*tiene|alguien\s*cuenta\s*con|en\s*b[uú]squeda\s*de)\b/i.test(textToCheckForDemand);
    const isExplicitOfferSignal = /\b(?:vendo|se\s*vende|en\s*venta\s*(?:lindo|hermoso|excelente|gran|amplio|espectacular|duplex|casa|apto|apartamento|finca|lote|bodega)|ofrezco\s*(?:en\s*venta|en\s*arriendo|apartamento|casa|apto)|se\s*arrienda|arriendo\s*(?:lindo|hermoso|directo|apto|casa))\b/i.test(textToCheckForDemand);

    if (isExplicitDemandSignal && !isExplicitOfferSignal) {
      if (result.classification !== "REQUERIMIENTO") {
        console.log(`[JANIA-GUARDRAIL v31.85] 🔄 Reclasificando a REQUERIMIENTO (Señal inequívoca de demanda detectada): "${textToCheckForDemand.substring(0, 60)}..."`);
        result.classification = "REQUERIMIENTO";
      }
    }

    const extracted = result.extractedData || {};
    let isRequirement = result.classification === "REQUERIMIENTO";
    let isProperty = result.classification === "INMUEBLE";

    // Rellenar datos extraídos faltantes mediante extractor heurístico si es necesario
    if ((isProperty || isRequirement) && messageToProcess) {
      const fallbackData = extractFallbackDataFromText(messageToProcess);
      if (!extracted.transactionType) extracted.transactionType = fallbackData.transactionType;
      if (!extracted.propertyType) extracted.propertyType = fallbackData.propertyType;

      // Sanitizar price en Venta (si venía < 100M pero en fallbackData es >= 100M)
      const currentPriceNum = Number(extracted.price || 0);
      if (isProperty) {
        if (!currentPriceNum || currentPriceNum === 0 || (currentPriceNum < 100_000_000 && fallbackData.price >= 100_000_000)) {
          extracted.price = fallbackData.price;
        }
      }

      if (isRequirement) {
        const curPresupuesto = Number(extracted.presupuestoMax || 0);
        if (!curPresupuesto || curPresupuesto === 0 || (curPresupuesto < 100_000_000 && fallbackData.presupuestoMax >= 100_000_000)) {
          extracted.presupuestoMax = fallbackData.presupuestoMax;
        }
        if (fallbackData.presupuestoMin > 0 && (!extracted.presupuestoMin || Number(extracted.presupuestoMin) === 0)) {
          extracted.presupuestoMin = fallbackData.presupuestoMin;
        }
      }

      if (!extracted.rentPrice && fallbackData.rentPrice > 0) extracted.rentPrice = fallbackData.rentPrice;
      if (!extracted.adminFee && fallbackData.adminFee > 0) extracted.adminFee = fallbackData.adminFee;
      if (!extracted.area || Number(extracted.area) === 0) extracted.area = fallbackData.area;
      if (!extracted.bedrooms && fallbackData.bedrooms > 0) extracted.bedrooms = fallbackData.bedrooms;
      if (!extracted.bathrooms && fallbackData.bathrooms > 0) extracted.bathrooms = fallbackData.bathrooms;
      if (!extracted.garages && fallbackData.garages > 0) extracted.garages = fallbackData.garages;
      if (!extracted.garageType && fallbackData.garageType) extracted.garageType = fallbackData.garageType;
      if (!extracted.antiguedadAnos && fallbackData.antiguedadAnos !== null) extracted.antiguedadAnos = fallbackData.antiguedadAnos;
      if (extracted.hasBalcony === undefined && fallbackData.hasBalcony !== null) extracted.hasBalcony = fallbackData.hasBalcony;
      if (extracted.hasTerrace === undefined && fallbackData.hasTerrace !== null) extracted.hasTerrace = fallbackData.hasTerrace;
      if (extracted.hasStorage === undefined && fallbackData.hasStorage !== null) extracted.hasStorage = fallbackData.hasStorage;
      if (extracted.hasElevator === undefined && fallbackData.hasElevator !== null) extracted.hasElevator = fallbackData.hasElevator;
      if (!extracted.city && fallbackData.city) extracted.city = fallbackData.city;
      if (!extracted.ciudadDeseada && fallbackData.ciudadDeseada) extracted.ciudadDeseada = fallbackData.ciudadDeseada;
      if (!extracted.zone && fallbackData.zone) extracted.zone = fallbackData.zone;
      if (!extracted.zonaDeseada && fallbackData.zonaDeseada) extracted.zonaDeseada = fallbackData.zonaDeseada;
      result.extractedData = extracted;
    }

    // El procesamiento de ofertas y requerimientos se permite ahora tanto en grupos como en chat privado (DM)
    // para que JanIA pueda registrar los inmuebles/búsquedas y buscar matches en la base de datos directamente desde el chat privado.

    let isLLMIncomplete = result.classification === "DATOS_INCOMPLETOS";

    // Forzar clasificación DATOS_INCOMPLETOS si faltan datos clave según las mismas reglas de buildIncompleteDataMessage
    if (isProperty || isRequirement) {
      const isReq = isRequirement || messageToProcess.toLowerCase().includes("busco") || messageToProcess.toLowerCase().includes("necesito") || messageToProcess.toLowerCase().includes("requiero") || !!extracted?.tipoInmuebleDeseado;
      const propTypeRaw = (extracted?.propertyType || extracted?.tipoInmuebleDeseado || "inmueble").toLowerCase();
      let propertyName = "inmueble";
      if (propTypeRaw === "apartment") propertyName = "apartamento";
      else if (propTypeRaw === "house") propertyName = "casa";
      else if (propTypeRaw === "building") propertyName = "edificio";
      else if (propTypeRaw === "warehouse") propertyName = "bodega";
      else if (propTypeRaw === "office") propertyName = "oficina";
      else if (propTypeRaw === "farm" || propTypeRaw === "finca") propertyName = "finca";
      else if (propTypeRaw === "land" || propTypeRaw === "lote") propertyName = "lote";
      else if (propTypeRaw === "consultorio") propertyName = "consultorio";
      else if (propTypeRaw === "loft") propertyName = "loft";

      const city = isReq ? extracted?.ciudadDeseada : extracted?.city;
      const zone = isReq ? (extracted?.zonaDeseada || extracted?.zone) : extracted?.zone;
      const price = isReq ? Number(extracted?.presupuestoMax || extracted?.price || 0) : Number(extracted?.price || 0);

      const hasMissingCity = !city || city.trim() === "" || city.toLowerCase() === "na";
      const hasMissingZone = !zone || zone.trim() === "" || zone.toLowerCase() === "na";
      const hasMissingPrice = !price || price <= 0;

      const area = Number(extracted?.area || 0);
      const hasMissingArea = !area || area <= 0;

      let hasMissingBedrooms = false;
      let hasMissingBathrooms = false;
      let hasMissingStratum = false;

      if (propertyName === "apartamento" || propertyName === "casa" || propertyName === "loft" || propertyName === "inmueble") {
        const bedrooms = Number(extracted?.bedrooms || 0);
        hasMissingBedrooms = !bedrooms || bedrooms <= 0;
        const bathrooms = Number(extracted?.bathrooms || 0);
        hasMissingBathrooms = !bathrooms || bathrooms <= 0;

        const stratum = Number(extracted?.stratum || 0);
        hasMissingStratum = !stratum || stratum <= 0;
      } else if (propertyName !== "lote" && propertyName !== "finca") {
        const stratum = Number(extracted?.stratum || 0);
        hasMissingStratum = !stratum || stratum <= 0;
      }

      // Para soportar el Modo Fantasma y las calificaciones de Eduardo en producción,
      // no invalidamos las extracciones por datos incompletos. Todo lead de oferta o demanda
      // se procesará, guardará y calificará cualitativamente.
      const isMissing = false;
    }

    if (isLLMIncomplete) {
      const inferredType = (messageToProcess.toLowerCase().includes("vendo") || messageToProcess.toLowerCase().includes("ofrezco") || messageToProcess.toLowerCase().includes("arriendo") || !!extracted?.propertyType) ? "PROPERTY" : "REQUIREMENT";
      if (inferredType === "PROPERTY") {
        isProperty = true;
        isRequirement = false;
      } else {
        isProperty = false;
        isRequirement = true;
      }

      // Principio de Mínima Intervención (VRIF): JanIA observa silenciosamente en WhatsApp
      if (!isWebUser) {
        result.shouldSendDM = false;
        result.dmResponse = "";
        result.response = "";
      }
    }

    // --- CAPA DE DEFENSA GEOGRÁFICA NACIONAL (Elástica) ---
    if (isProperty || isRequirement) {
      if (extracted) {
        if (extracted.zone) extracted.zone = sanitizeGeoString(extracted.zone);
        if (extracted.zonaDeseada) extracted.zonaDeseada = sanitizeGeoString(extracted.zonaDeseada);
        if (extracted.city) extracted.city = sanitizeGeoString(extracted.city);
        if (extracted.ciudadDeseada) extracted.ciudadDeseada = sanitizeGeoString(extracted.ciudadDeseada);
      }

      const zoneToValidate = isProperty ? extracted?.zone : (extracted?.zonaDeseada || extracted?.zone);

      let isValidGeo = false;
      let geoValidation: any = null;

      if (zoneToValidate && zoneToValidate.trim() !== "") {
        let inferredCity = extracted?.city || extracted?.ciudadDeseada;
        if (!inferredCity || inferredCity.trim() === "" || inferredCity.toLowerCase() === "na") {
          if (groupName) {
            const nameLower = groupName.toLowerCase();
            if (nameLower.includes("cali")) {
              inferredCity = "Cali";
            } else if (nameLower.includes("medellin") || nameLower.includes("medellín")) {
              inferredCity = "Medellín";
            } else if (nameLower.includes("barranquilla")) {
              inferredCity = "Barranquilla";
            } else if (nameLower.includes("bucaramanga")) {
              inferredCity = "Bucaramanga";
            } else if (nameLower.includes("cartagena")) {
              inferredCity = "Cartagena";
            } else if (nameLower.includes("pereira")) {
              inferredCity = "Pereira";
            }
          }
        }

        // Asignar de vuelta al objeto extraído
        if (inferredCity && inferredCity.toLowerCase() !== "na") {
          const divipolaCity = validateCity(inferredCity);
          if (divipolaCity) {
            inferredCity = divipolaCity; // Sobreescribimos con el nombre canónico (ej. Bogotá, D.C.)
          }
          if (isProperty) {
            extracted.city = inferredCity;
          } else {
            extracted.ciudadDeseada = inferredCity;
          }
        }

        geoValidation = await validarZona(zoneToValidate, inferredCity, messageToProcess);
        isValidGeo = geoValidation.isValid;
      }

      if (!isValidGeo) {
        // En modo sensor silencioso, se admite la geografía no validada marcándola en missingFields y continuando
        isValidGeo = true;
        if (!result.missingFields) result.missingFields = [];
        if (!result.missingFields.includes("zone")) result.missingFields.push("zone");
      }

      // ── DEDUCCIÓN GEOGRÁFICA TRIPARTITA INTELIGENTE (v22.0) ──
      const triGeo = deducirGeografiaTripartita(
        isProperty ? extracted?.zone : (extracted?.zonaDeseada || extracted?.zone),
        isProperty ? extracted?.city : (extracted?.ciudadDeseada || extracted?.city),
        groupName,
        messageToProcess
      );

      if (isProperty) {
        extracted.zone = triGeo.neighborhood;
        extracted.addressNeighborhood = triGeo.neighborhood;
        extracted.addressLocality = triGeo.locality;
        extracted.addressCity = triGeo.city;
        extracted.city = triGeo.city;
        if (geoValidation && geoValidation.isValid) {
          extracted.latitude = geoValidation.latitude || null;
          extracted.longitude = geoValidation.longitude || null;
        }
      } else {
        extracted.zonaDeseada = triGeo.neighborhood;
        extracted.addressNeighborhood = triGeo.neighborhood;
        extracted.addressLocality = triGeo.locality;
        extracted.addressCity = triGeo.city;
        extracted.ciudadDeseada = triGeo.city;
      }
    }

    // --- PERSISTENCIA Y MATCHING (Con Flujos DM) ---
    const origenTipo = (isGroup || groupJid) ? "grupo" : "contacto_directo";
    const origenId = (isGroup || groupJid) ? (groupJid || userId) : userId;
    const origenNombre = (isGroup || groupJid) ? (groupName || "Grupo WhatsApp") : (userName || realName || "Contacto Directo");

    if (isProperty) {
      const cleanCheckText = (rawUserText || text || messageToProcess || '').toLowerCase();
      const groupForTx = (groupName || '').toLowerCase();
      const isGroupRent = groupForTx.includes('arriend') || groupForTx.includes('alquil') || groupForTx.includes('renta');

      const hasPermutaSignals = /\b(?:permuto|permuta|permutas|permutamos|se permuta|recibo menor valor|recibo inmueble|recibo vehículo|recibo vehiculo|pelo a pelo|encime|parte de pago)\b/i.test(cleanCheckText);
      const isExplicitVentaSignals = /\b(?:venta|vendo|vendemos|se vende|en venta|venta directa|valor venta|precio venta|para venta)\b/i.test(cleanCheckText);
      const hasRentSignals = /\b(?:arriendo|arriendos|arrendar|arrendamos|se arrienda|arriendan|alquilo|alquilar|alquilamos|se alquila|alquiler|alquileres|rento|rentar|se renta|canon|canones|cánones|arrendatario|arrendador|inquilino)\b/i.test(cleanCheckText)
        || (!isExplicitVentaSignals && /(?:amoblado|amoblada|sin amoblar)/i.test(cleanCheckText))
        || (!isExplicitVentaSignals && /(?:incluida|con|\+|más|mas)\s*(?:administraci[oó]n|admon)/i.test(cleanCheckText))
        || (!isExplicitVentaSignals && /(?:administraci[oó]n|admon)\s*(?:incluida|adicional)/i.test(cleanCheckText))
        || /valor arriendo/i.test(cleanCheckText);
      const hasVentaSignals = isExplicitVentaSignals;

      if (hasPermutaSignals) {
        extracted.transactionType = hasVentaSignals ? "venta_permuta" : "permuta";
      } else if (hasRentSignals && hasVentaSignals) {
        extracted.transactionType = "venta_o_arriendo";
      } else if (hasRentSignals || (isGroupRent && !hasVentaSignals)) {
        extracted.transactionType = "arriendo";
        if (extracted.price && (!extracted.rentPrice || Number(extracted.rentPrice) <= 0)) {
          extracted.rentPrice = extracted.price;
        }
      } else if (hasVentaSignals) {
        extracted.transactionType = "venta";
      }

      const propertyTitle = extracted.title || `${capitalize(extracted.propertyType || 'inmueble')} en ${extracted.zone || 'Bogotá'} para ${extracted.transactionType || 'venta'}`;

      // Filtro Temprano de Clasificación Inmobiliaria Estricta (Tolerancia Cero al Spam, Zoom, Meet, marketing y política)
      const spamCheckProp = esMensajeSpamOBasura(cleanCheckText);
      if (spamCheckProp.isSpam) {
        console.log(`[JANIA-SPAM-FILTER] ⛔ Omitiendo guardado de propiedad en BD (${spamCheckProp.reason}): "${cleanCheckText.substring(0, 50)}..."`);
        result.inserted = false;
        result.classification = "VIOLACION_DE_NORMAS";
        result.reactionEmoji = "🚫";
        return result;
      }

      // Filtro de Seguridad Final de Calidad Comercial: Rechazar publicaciones huecas, frases sueltas o sin ficha técnica
      const isFlyerWithText = (result.isFlyerOrBanner === true || extracted.isFlyerOrBanner === true) && !!(result.flyerVerbatimText && result.flyerVerbatimText.trim().length >= 15);
      const hollowCheckProp = isHollowListing(cleanCheckText, propertyTitle, (urls && urls.length > 0 ? urls[0] : undefined));
      const hasRealPropertyCore = /\b(?:casa|casas|apto|aptos|apartamento|apartamentos|bodega|bodegas|oficina|oficinas|lote|lotes|finca|fincas|local|locales|edificio|edificios|terreno|terrenos)\b/i.test(cleanCheckText) &&
        /\b(?:renta|arriendo|alquiler|alquilo|canon|venta|vendo|se vende|se arrienda|se renta|se alquila)\b/i.test(cleanCheckText);
      if (hollowCheckProp.isHollow && !isFlyerWithText && !hasRealPropertyCore && !pdfBuffer) {
        console.log(`[JANIA-FILTER] ⛔ Omitiendo guardado de propiedad en BD (${hollowCheckProp.reason}): "${cleanCheckText.substring(0, 60)}..."`);
        result.inserted = false;
        result.classification = "CONSULTA_GENERAL";
        return result;
      }

      let externalUrl: string | undefined = undefined;
      if (urls && urls.length > 0) {
        const permitted = urls.find(url => esDominioPermitido(url));
        if (permitted) {
          externalUrl = permitted;
        }
      }
      const sourceUrl = externalUrl || (urls && urls.length > 0 ? (urls.find(url => esDominioPermitido(url)) || urls[0]) : undefined);

      const isFlyerDetected = result.isFlyerOrBanner === true || extracted.isFlyerOrBanner === true;
      const flyerVerbatim = result.flyerVerbatimText || extracted.flyerVerbatimText || "";
      const isImageOnlyProp = (!rawUserText || rawUserText.trim() === '' || rawUserText.includes('[Publicación de Imagen')) && !!imageBuffer;

      // DOCTRINA v23.9: Si es solo una imagen sin texto del usuario
      if (isImageOnlyProp) {
        const hasPropSpecs = (Number(extracted.price || 0) > 0) ||
          (Number(extracted.area || 0) > 0 && (Number(extracted.bedrooms || 0) > 0 || Number(extracted.garages || 0) > 0)) ||
          (!!extracted.zone && Number(extracted.bedrooms || 0) > 0);
        if (!hasPropSpecs && !isFlyerDetected) {
          console.log(`[JANIA-FILTER] ⛔ Descartando imagen fotográfica ambiental pura: no contiene ficha técnica ni datos comerciales legibles sobreimpresos.`);
          result.inserted = false;
          result.classification = "CONSULTA_GENERAL";
          return result;
        }
      }

      // Solo guardamos imageBuffer en BD como flyer si realmente es un Flyer/Banner comercial
      // Si fue una foto ambiental que acompañaba a un texto, no se sube como flyer
      const flyerBufferToSave = (isImageOnlyProp || isFlyerDetected) ? imageBuffer : undefined;

      const effectivePropRawText = (isImageOnlyProp || isFlyerDetected)
        ? (flyerVerbatim ? buildFlyerBreakdownText(extracted, flyerVerbatim) : buildFlyerBreakdownText(extracted, rawUserText || text))
        : (rawUserText || text);

      const saved = await saveProperty({
        ...extracted,
        name: propertyTitle,
        price: String(extracted.price || 0),
        areaTotal: String(extracted.area || 0),
        idUsuarioWhatsapp: rawPhone,
        rawText: effectivePropRawText,
        amenities: { gives: extracted.gives, wants: extracted.wants, isCollaborativePool: extracted.isCollaborativePool },
        origenTipo,
        origenId,
        origenNombre,
        externalUrl,
        enlaceOrigen: sourceUrl,
        fechaExtraccion: new Date()
      }, userId, realName, flyerBufferToSave, pdfBuffer, pdfMimeType);

      if (saved) {
        result.inserted = true;
        result.shouldSendDM = false;
        result.dmResponse = "";
        result.response = "";
        result.mentions = [];
        result.extraDMs = [];
        result.sendReputationHook = false;
        // ── MATRIZ DOCTRINAL v23.0: 6 EMOJIS — INMUEBLE (OFERTA) ──
        const _txProp = (extracted.transactionType || '').toLowerCase();
        const _isPermutaProp = _txProp.includes('permuta') || _txProp === 'venta_permuta' || _txProp === 'aporte';
        const _isRentProp = _txProp.includes('arriendo') || _txProp === 'arriendo_temporal' || _txProp === 'arriendo_con_opcion_de_compra' || _txProp === 'venta_o_arriendo' || isGroupRent || hasRentSignals;
        result.reactionEmoji = _isPermutaProp ? '🔀' : _isRentProp ? '👌' : '👍';

        const { executeMatchEngine } = await import("../../matching");
        setImmediate(() => {
          executeMatchEngine(saved.id, null).catch((err: any) => console.error("Error executing match engine:", err));
        });
      }
    } else if (isRequirement) {
      const cleanCheckReqText = (rawUserText || text || messageToProcess || '').toLowerCase();
      const groupForReqTx = (groupName || '').toLowerCase();
      const isGroupReqRent = groupForReqTx.includes('arriend') || groupForReqTx.includes('alquil') || groupForReqTx.includes('renta');

      const isInvestorPurchaseReq = /\b(?:inversionista|inversionistas|para inversi[oó]n|para inversion|rentando|est[eé] rentando|est[eé]n rentando|ojal[aá] rentando|ya rentando|generando renta|produciendo renta|con renta activa|con contrato de arrendamiento|para compra|compro|compra ya|busco para compra)\b/i.test(cleanCheckReqText);
      const hasPermutaReqSignals = /\b(?:permuto|permuta|permutas|permutamos|se permuta|recibo menor valor|recibo inmueble|recibo vehículo|recibo vehiculo|pelo a pelo|encime|parte de pago)\b/i.test(cleanCheckReqText);
      const isExplicitVentaReqSignals = isInvestorPurchaseReq || /\b(?:compro|comprar|en compra|para compra|para adquisición|adquirir|para comprar|busco para compra)\b/i.test(cleanCheckReqText);
      const hasRentReqSignals = !isInvestorPurchaseReq && (
        /\b(?:arriendo|arriendos|arrendar|arrendamos|se arrienda|arriendan|alquilo|alquilar|alquilamos|se alquila|alquiler|alquileres|rento|rentar|se renta|canon|canones|cánones|arrendatario|arrendador|inquilino)\b/i.test(cleanCheckReqText)
        || (!isExplicitVentaReqSignals && /(?:amoblado|amoblada|sin amoblar)/i.test(cleanCheckReqText))
        || (!isExplicitVentaReqSignals && /(?:incluida|con|\+|más|mas)\s*(?:administraci[oó]n|admon)/i.test(cleanCheckReqText))
        || (!isExplicitVentaReqSignals && /(?:administraci[oó]n|admon)\s*(?:incluida|adicional)/i.test(cleanCheckReqText))
        || /valor arriendo/i.test(cleanCheckReqText)
      );
      const hasVentaReqSignals = isExplicitVentaReqSignals;

      if (hasPermutaReqSignals) {
        extracted.transactionType = hasVentaReqSignals ? "venta_permuta" : "permuta";
      } else if (hasRentReqSignals && hasVentaReqSignals) {
        extracted.transactionType = "venta_o_arriendo";
      } else if (hasRentReqSignals || (isGroupReqRent && !hasVentaReqSignals && !isInvestorPurchaseReq)) {
        extracted.transactionType = "arriendo";
      } else {
        extracted.transactionType = "venta";
      }

      // Filtro Temprano de Clasificación Inmobiliaria Estricta (Tolerancia Cero al Spam, Zoom, Meet, marketing y política)
      const spamCheckReq = esMensajeSpamOBasura(cleanCheckReqText);
      if (spamCheckReq.isSpam) {
        console.log(`[JANIA-SPAM-FILTER] ⛔ Omitiendo guardado de requerimiento en BD (${spamCheckReq.reason}): "${cleanCheckReqText.substring(0, 50)}..."`);
        result.inserted = false;
        result.classification = "VIOLACION_DE_NORMAS";
        result.reactionEmoji = "🚫";
        return result;
      }

      const reqTitle = extracted.title || `Requerimiento de ${extracted.propertyType || 'inmueble'} en ${extracted.zonaDeseada || extracted.zone || 'Bogotá'} para ${extracted.transactionType || 'venta'}`;

      // Filtro de Seguridad Final de Calidad Comercial: Rechazar requerimientos huecos, saludos o frases sueltas
      const isFlyerWithTextReq = (result.isFlyerOrBanner === true || extracted.isFlyerOrBanner === true) && !!(result.flyerVerbatimText && result.flyerVerbatimText.trim().length >= 15);
      const hollowCheckReq = isHollowListing(cleanCheckReqText, reqTitle, (urls && urls.length > 0 ? urls[0] : undefined));
      const hasRealReqCore = /\b(?:casa|casas|apto|aptos|apartamento|apartamentos|bodega|bodegas|oficina|oficinas|lote|lotes|finca|fincas|local|locales|edificio|edificios|terreno|terrenos)\b/i.test(cleanCheckReqText) &&
        /\b(?:busco|buscamos|se busca|se requiere|requiero|requerimiento|necesito|necesitamos|solicito|solicitamos|compro|comprar)\b/i.test(cleanCheckReqText);
      if (hollowCheckReq.isHollow && !isFlyerWithTextReq && !hasRealReqCore && !pdfBuffer) {
        console.log(`[JANIA-FILTER] ⛔ Omitiendo guardado de requerimiento en BD (${hollowCheckReq.reason}): "${cleanCheckReqText.substring(0, 60)}..."`);
        result.inserted = false;
        result.classification = "CONSULTA_GENERAL";
        return result;
      }

      const sourceUrlReq = (urls && urls.length > 0 ? (urls.find(url => esDominioPermitido(url)) || urls[0]) : null);

      const isFlyerDetectedReq = result.isFlyerOrBanner === true || extracted.isFlyerOrBanner === true;
      const flyerVerbatimReq = result.flyerVerbatimText || extracted.flyerVerbatimText || "";
      const isImageOnlyReq = (!messageToProcess || messageToProcess.trim() === '' || messageToProcess.includes('[Publicación de Imagen')) && !!imageBuffer;

      // DOCTRINA v23.9: Si es solo una imagen sin texto del usuario
      if (isImageOnlyReq) {
        const hasReqSpecs = (Number(extracted.presupuestoMax || extracted.price || 0) > 0) ||
          (!!(extracted.zonaDeseada || extracted.zone) && (Number(extracted.bedrooms || 0) > 0 || Number(extracted.area || 0) > 0)) ||
          (extracted.title && /compra|busco|requerimiento|solicitud|presupuesto/i.test(extracted.title));
        if (!hasReqSpecs && !isFlyerDetectedReq) {
          console.log(`[JANIA-FILTER] ⛔ Descartando imagen fotográfica ambiental pura: no contiene criterios de requerimiento legibles sobreimpresos.`);
          result.inserted = false;
          result.classification = "CONSULTA_GENERAL";
          return result;
        }
      }

      const flyerBufferToSaveReq = (isImageOnlyReq || isFlyerDetectedReq) ? imageBuffer : undefined;

      const effectiveReqRawText = (isImageOnlyReq || isFlyerDetectedReq)
        ? (flyerVerbatimReq ? buildFlyerBreakdownText(extracted, flyerVerbatimReq) : buildFlyerBreakdownText(extracted, messageToProcess))
        : messageToProcess;

      const saved = await saveRequirement({
        ...extracted,
        name: reqTitle,
        tipoInmuebleDeseado: extracted.propertyType,
        tipoNegocioDeseado: extracted.transactionType,
        zonaDeseada: extracted.zonaDeseada || extracted.zone,
        presupuestoMax: String(extracted.presupuestoMax || extracted.price || 0),
        idUsuarioWhatsapp: rawPhone,
        rawText: effectiveReqRawText,
        caracteristicasDeseadas: { gives: extracted.gives, wants: extracted.wants },
        origenTipo,
        origenId,
        origenNombre,
        enlaceOrigen: sourceUrlReq,
        fechaExtraccion: new Date()
      }, userId, realName, flyerBufferToSaveReq, pdfBuffer, pdfMimeType);

      if (saved) {
        result.inserted = true;
        result.shouldSendDM = false;
        result.dmResponse = "";
        result.response = "";
        result.mentions = [];
        result.extraDMs = [];
        result.sendReputationHook = false;
        // ── MATRIZ DOCTRINAL v23.0: 6 EMOJIS — REQUERIMIENTO (DEMANDA) ──
        const _txReq = (extracted.transactionType || extracted.tipoNegocioDeseado || '').toLowerCase();
        const _isPermutaReq = _txReq.includes('permuta') || _txReq === 'venta_permuta' || _txReq === 'aporte';
        const _isRentReq = _txReq.includes('arriendo') || _txReq === 'arriendo_temporal' || _txReq === 'arriendo_con_opcion_de_compra' || _txReq === 'venta_o_arriendo' || isGroupReqRent || hasRentReqSignals;
        result.reactionEmoji = _isPermutaReq ? '🔄' : _isRentReq ? '✏️' : '📝';

        const { executeMatchEngine } = await import("../../matching");
        setImmediate(() => {
          executeMatchEngine(null, saved.id).catch((err: any) => console.error("Error executing match engine:", err));
        });
      }
    }

    // Intercepción de consultas en el grupo de inmuebles para redirigir (solo aplica en el grupo principal de inmuebles)
    const isConsultation = result.classification === "CONSULTA_GENERAL" || result.classification === "RESPUESTA_A_PREGUNTA_IA" || result.classification === "ANALISIS_DE_MERCADO";
    const isMainPropertiesGroup = !groupJid || groupJid === '120363260108880069@g.us';
    if (isGroup && isConsultation && isMainPropertiesGroup) {
      const textLower = messageToProcess.toLowerCase();

      // A. Consultas sobre cómo publicar o subir inmuebles o cómo funciona el grupo
      const isAboutPublishing =
        textLower.includes("subir") ||
        textLower.includes("cómo subo") ||
        textLower.includes("como subo") ||
        textLower.includes("publicar") ||
        textLower.includes("cómo publico") ||
        textLower.includes("como publico") ||
        textLower.includes("cómo se publica") ||
        textLower.includes("como se publica") ||
        textLower.includes("cómo registrar") ||
        textLower.includes("como registrar") ||
        textLower.includes("cómo funciona") ||
        textLower.includes("como funciona") ||
        textLower.includes("de qué consiste") ||
        textLower.includes("de que consiste") ||
        textLower.includes("en qué consiste") ||
        textLower.includes("en que consiste") ||
        textLower.includes("cómo hago para") ||
        textLower.includes("como hago para") ||
        textLower.includes("cómo buscar") ||
        textLower.includes("como buscar") ||
        textLower.includes("cómo encontrar") ||
        textLower.includes("como encontrar") ||
        textLower.includes("instrucciones") ||
        textLower.includes("ayuda") ||
        textLower.includes("explicar") ||
        textLower.includes("explicame") ||
        textLower.includes("explícame");

      const isAboutVecy =
        textLower.includes("vecy") ||
        textLower.includes("proyecto") ||
        textLower.includes("quien creo") ||
        textLower.includes("quién creó") ||
        textLower.includes("creadores") ||
        textLower.includes("quien es jania") ||
        textLower.includes("quién es jania") ||
        textLower.includes("circulo cero") ||
        textLower.includes("círculo cero") ||
        textLower.includes("ubicapp") ||
        textLower.includes("samboni") ||
        textLower.includes("competidor") ||
        textLower.includes("competencia");

      const greetingPrefix = await getTimeOfDayGreetingForUser(rawPhone, realName, alreadyGreeted, isGroup);

      let welcomePart = "";
      if (!alreadyGreeted) {
        welcomePart = ` ¡Te doy la más cordial bienvenida a nuestra comunidad! 🤝✨`;
      }

      if (isAboutPublishing) {
        result.response = `📢 *¿CÓMO PUBLICAR EN VECY BIENES RAÍCES?* 📢\n\n${greetingPrefix},${welcomePart} es muy sencillo y totalmente gratuito. Puedes publicar tus *ofertas* (venta/arriendo) o *requerimientos* (búsquedas) directamente aquí en el grupo de las siguientes formas:\n\n` +
          `✍️ *Texto*: Envía una descripción con la ubicación (Ciudad y Barrio), precio y ficha técnica (área, habitaciones, baños, parqueaderos y estrato).\n` +
          `🔗 *Enlaces/Links*: Comparte enlaces de portales inmobiliarios permitidos o de tu propia web (Wasi, Fincaraiz, Metrocuadrado, Ciencuadras, Habi, etc.) y extraeré los datos automáticamente.\n` +
          `📄 *PDF*: Sube la ficha técnica de la propiedad en formato PDF.\n` +
          `🎙️ *Nota de Voz*: Graba un audio dictando los datos del inmueble.\n` +
          `🖼️ *Flyer/Captura*: Comparte una imagen o flyer que contenga los detalles comerciales en el texto.\n\n` +
          `*¿Cómo funciona?*\n` +
          `1️⃣ Al publicar, mi sistema registrará la propiedad e iniciará una búsqueda de coincidencias (matches) automáticamente a nivel nacional.\n` +
          `2️⃣ Si encuentro un MATCH, te notificaré y te enviaré un mensaje por *chat privado (DM)* solicitando tu confirmación.\n` +
          `3️⃣ Si ambos aliados confirman interés en privado, les entregaré sus contactos directos para que cierren el negocio. 🤝🚀\n\n` +
          `Si tienes dudas o prefieres usar mi menú de soporte y búsqueda de propiedades privado, escríbeme directamente en nuestra Consola Web:\n👉 https://vecy-bienes-raices.vercel.app/jania`;
        result.classification = "CONSULTA_GENERAL";
      } else if (isAboutVecy) {
        const isCompetitorQuery =
          textLower.includes("ubicapp") ||
          textLower.includes("samboni") ||
          textLower.includes("competidor") ||
          textLower.includes("competencia");

        const groupZeroName = process.env.GROUP_ZERO_NAME || '𝗣𝗥𝗢𝗬𝗘𝗖𝗧𝗢: 🌐 "𝗩𝗘𝗖𝗬𝗕𝗜𝗘𝗡𝗘𝗦𝗥𝗔𝗜𝗖𝗘𝗦"🚀';
        if (isCompetitorQuery) {
          result.response = `👌 *${groupZeroName.toUpperCase()} — DEBATE Y COMUNIDAD* 👌\n\n${greetingPrefix}, detecté una mención a plataformas competidoras o comparativas de servicios. Para mantener este canal enfocado exclusivamente en ofertas y requerimientos, te invito a plantear tus preguntas, comparar beneficios o participar en el debate en nuestro canal oficial **${groupZeroName}**:\n👉 https://chat.whatsapp.com/CSzrKR6Cr56HAieEhAuqyU\n\n¡Allí debatimos abiertamente con total transparencia y profesionalismo! 🤝✨`;
        } else {
          result.response = `👌 *${groupZeroName.toUpperCase()} — CONEXIÓN VECY* 👌\n\n${greetingPrefix}, veo que tienes dudas o quieres saber más sobre el proyecto VECY Bienes Raíces, beneficios, creadores o el plan colaborativo. Te invito a unirte y hacer tus preguntas en nuestro canal oficial **${groupZeroName}**:\n👉 https://chat.whatsapp.com/CSzrKR6Cr56HAieEhAuqyU\n\n¡Es el espacio ideal para resolver todas tus inquietudes de la comunidad! 🤝✨`;
        }
        result.classification = "VIOLACION_DE_NORMAS";
        result.reactionEmoji = "🚫";
      } else {
        result.response = `💡 *𝗩𝗘𝗖𝗬 𝗧𝗜𝗣𝗦💡/𝗡𝗢𝗧𝗜𝗖𝗜𝗔𝗦📰/𝗖𝗢𝗡𝗦𝗨𝗟𝗧𝗔𝗦 𝗜𝗡𝗠𝗢𝗕𝗜𝗟𝗜𝗔𝗥𝗜𝗔𝗦⁉️🏠* 💡\n\n${greetingPrefix}, veo que tienes una consulta jurídica, procedimental o de avalúo. Para darte una respuesta detallada con mis motores legales y de mercado sin saturar este canal de ofertas y requerimientos, te invito a realizar tu pregunta en nuestro grupo especializado **𝗩𝗘𝗖𝗬 𝗧𝗜𝗣𝗦💡/𝗡𝗢𝗧𝗜𝗖𝗜𝗔𝗦📰/𝗖𝗢𝗡𝗦𝗨𝗟𝗧𝗔𝗦 𝗜𝗡𝗠𝗢𝗕𝗜𝗟𝗜𝗔𝗥𝗜𝗔𝗦⁉️🏠**:\n👉 https://chat.whatsapp.com/J4u1h7NUL1i1B1wAIyTUN6\n\n¡Allí te responderé al instante con toda la información! 🚀🎯`;
        result.classification = "VIOLACION_DE_NORMAS";
        result.reactionEmoji = "🚫";
      }
    }

    if (result && result.response) {
      result.response = sanitizeResponseMarkdown(result.response);
    }
    if (result && result.dmResponse) {
      result.dmResponse = sanitizeResponseMarkdown(result.dmResponse);
    }
    // ── FALLBACK DOCTRINAL v23.0: Solo si no se asignó emoji en los bloques de inserción ──
    // Este bloque NUNCA debe pisar un emoji ya calculado con transactionType real.
    if (!result.reactionEmoji) {
      const _txFallback = (extracted?.transactionType || extracted?.tipoNegocioDeseado || '').toLowerCase();
      const _isPermutaFb = _txFallback.includes('permuta') || _txFallback === 'venta_permuta' || _txFallback === 'aporte';
      const _isRentFb = _txFallback.includes('arriendo') || _txFallback === 'arriendo_temporal' || _txFallback === 'arriendo_con_opcion_de_compra';

      if (result.classification === "INMUEBLE") {
        result.reactionEmoji = _isPermutaFb ? '🔀' : _isRentFb ? '👌' : '👍';
      } else if (result.classification === "REQUERIMIENTO") {
        result.reactionEmoji = _isPermutaFb ? '🔄' : _isRentFb ? '✏️' : '📝';
      } else if (result.classification === "VIOLACION_DE_NORMAS") {
        result.reactionEmoji = "🚫";
      }
    }

    return result;
  } catch (error: any) {
    console.warn(`[JanIA-Fallback] 🛡️ LLM no disponible o cuota 429 (${error?.message || error}). Activando Fallback Determinista Autónomo $0 COP...`);

    try {
      const rawMsg = text || "";
      const cleanLower = rawMsg.toLowerCase().trim();
      const rawPhone = userId.split('@')[0];
      const realName = await resolveRealName(userId, userName);

      // Si el texto es puro saludo o muy corto, procesar en silencio
      if (cleanLower.length < 15 && !cleanLower.includes("apto") && !cleanLower.includes("casa")) {
        return { classification: "CONSULTA_GENERAL", response: "", mentions: [] };
      }

      const fbData = extractFallbackDataFromText(rawMsg);
      const isExplicitDemand = /\b(?:busco|buscamos|se busca|se requiere|requiero|requerimiento|necesito|necesitamos|solicito|solicitamos|compro|comprador|comprar|para cliente|cliente busca|en búsqueda|en busqueda)\b/i.test(cleanLower);
      const isExplicitOffer = /\b(?:ofrezco|ofrecemos|vendo|se vende|se arrienda|se renta|se alquila|en venta|en arriendo|en renta|en alquiler|vr renta|vr vta|canon|alquilo|alquilamos|alquiler|disponible|apto familiar|venta directa|arriendo directo)\b/i.test(cleanLower);

      const origenTipo = (isGroup || groupJid) ? "grupo" : "contacto_directo";
      const origenId = (isGroup || groupJid) ? (groupJid || userId) : userId;
      const origenNombre = (isGroup || groupJid) ? (groupName || "Grupo WhatsApp") : (userName || realName || "Contacto Directo");

      if (isExplicitDemand) {
        // Fallback para DEMANDA (REQUERIMIENTO)
        const isExplicitVentaFb = /\b(?:compra|compro|comprador|comprar|en compra|para compra|adquirir)\b/i.test(cleanLower);
        const isRent = fbData.transactionType === "arriendo" || (!isExplicitVentaFb && (cleanLower.includes("arriendo") || cleanLower.includes("canon") || cleanLower.includes("renta") || cleanLower.includes("alquiler")));
        const isPermuta = fbData.transactionType.includes("permuta");
        const emoji = isPermuta ? "🔄" : (isRent ? "✏️" : "📝");

        const savedReq = await saveRequirement({
          propertyType: fbData.propertyType || "apartment",
          tipoInmuebleDeseado: fbData.propertyType || "apartment",
          transactionType: isRent ? "arriendo" : (isPermuta ? "permuta" : "venta"),
          tipoNegocioDeseado: isRent ? "arriendo" : (isPermuta ? "permuta" : "venta"),
          name: `Requerimiento ${fbData.propertyType || 'Inmueble'} en Bogotá`,
          presupuestoMax: String(fbData.presupuestoMax || 0),
          presupuestoMin: String(fbData.presupuestoMin || 0),
          adminFeeMax: fbData.adminFee ? String(fbData.adminFee) : undefined,
          zonaDeseada: "Bogotá",
          idUsuarioWhatsapp: rawPhone,
          rawText: rawMsg,
          origenTipo,
          origenId,
          origenNombre,
          fechaExtraccion: new Date()
        }, userId, realName);

        if (savedReq) {
          const { executeMatchEngine } = await import("../../matching");
          setImmediate(() => {
            executeMatchEngine(null, savedReq.id).catch(() => { });
          });
        }

        console.log(`[JanIA-Fallback] ✅ Requerimiento guardado determinísticamente con emoji ${emoji}`);
        return {
          classification: "REQUERIMIENTO",
          response: "",
          reactionEmoji: emoji,
          inserted: true
        };
      } else if (isExplicitOffer || fbData.price > 0 || fbData.rentPrice > 0 || cleanLower.includes("arriendo") || cleanLower.includes("renta") || cleanLower.includes("alquiler") || cleanLower.includes("venta") || cleanLower.includes("apto") || cleanLower.includes("casa")) {
        // Fallback para OFERTA (INMUEBLE)
        const isExplicitVentaFb = /\b(?:venta|vendo|vendemos|se vende|en venta|venta directa|valor venta|precio venta)\b/i.test(cleanLower);
        const isRent = fbData.transactionType === "arriendo" || (!isExplicitVentaFb && (cleanLower.includes("arriendo") || cleanLower.includes("canon") || cleanLower.includes("renta") || cleanLower.includes("alquiler")));
        const isPermuta = fbData.transactionType.includes("permuta");
        const emoji = isPermuta ? "🔀" : (isRent ? "👌" : "👍");

        const savedProp = await saveProperty({
          propertyType: fbData.propertyType || "apartment",
          transactionType: isRent ? "arriendo" : (isPermuta ? "permuta" : "venta"),
          name: `Inmueble en Bogotá`,
          price: String(fbData.price || 0),
          rentPrice: fbData.rentPrice ? String(fbData.rentPrice) : undefined,
          adminFee: fbData.adminFee ? String(fbData.adminFee) : undefined,
          areaTotal: String(fbData.areaTotal || 0),
          zone: "Bogotá",
          city: "Bogotá, D.C.",
          idUsuarioWhatsapp: rawPhone,
          rawText: rawMsg,
          origenTipo,
          origenId,
          origenNombre,
          fechaExtraccion: new Date()
        }, userId, realName);

        if (savedProp) {
          const { executeMatchEngine } = await import("../../matching");
          setImmediate(() => {
            executeMatchEngine(savedProp.id, null).catch(() => { });
          });
        }

        console.log(`[JanIA-Fallback] ✅ Inmueble guardado determinísticamente con emoji ${emoji}`);
        return {
          classification: "INMUEBLE",
          response: "",
          reactionEmoji: emoji,
          inserted: true
        };
      }
    } catch (fbErr: any) {
      console.error("[JanIA-Fallback-Error] Error en fallback determinista:", fbErr?.message || fbErr);
    }

    return { classification: "CONSULTA_GENERAL", response: "", mentions: [] };
  }
}

