import crypto from "node:crypto";
import { and, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  agencies,
  agentJaniaChannels,
  properties,
  solicitudes,
  users,
} from "../../drizzle/schema";
import { ENV } from "./env";
import { invokeLLM } from "./llm";
import { captureLeadIntoCrm } from "./crmService";
import { liquidarGastosNotariales } from "./notarialExpenseService";
import {
  checkAiMessageQuotaLimit,
  getUserEffectiveEntitlements,
  incrementUsageQuota,
} from "./planEntitlements";

export const PRIVATE_JANIA_PERSONALITY_PROMPTS: Record<string, string> = {
  normal:
    "Mantén un tono equilibrado, claro, amable y servicial. Responde con precisión y naturalidad.",
  audaz:
    "Mantén un tono audaz, persuasivo y orientado al cierre comercial. Destaca oportunidades únicas, valorización y sentido de urgencia con elegancia.",
  profesional:
    "Mantén un tono altamente ejecutivo, corporativo, técnico y jurídico. Habla como un consultor patrimonial de alto nivel.",
  extrovertida:
    "Mantén un tono entusiasta, carismático, cálido, energético y cercano. Transmite emoción positiva por cada inmueble.",
  seria:
    "Mantén un tono sobrio, directo al grano, formal y enfocado estrictamente en cifras, áreas, precios y datos verificables sin adornos.",
  cordial:
    "Mantén un tono profundamente empático, hospitalario, paciente y familiar. Haz que el cliente se sienta acompañado paso a paso.",
};

function deriveChannelAes256Key(masterSecret?: string): Buffer {
  const seed =
    masterSecret ||
    process.env.CHANNEL_ENCRYPTION_KEY ||
    process.env.SMTP_ENCRYPTION_KEY ||
    ENV.cookieSecret ||
    process.env.JWT_SECRET ||
    "vecy-private-jania-channel-key-2026";
  return crypto.createHash("sha256").update(seed).digest();
}

export function encryptChannelSecret(plaintext: string, masterSecret?: string): string {
  if (!plaintext) {
    throw new Error("El secreto del canal no puede estar vacío.");
  }
  const key = deriveChannelAes256Key(masterSecret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptChannelSecret(payload: string, masterSecret?: string): string {
  const parts = String(payload || "").split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Formato de credencial cifrada inválido.");
  }
  const iv = Buffer.from(parts[1], "base64");
  const authTag = Buffer.from(parts[2], "base64");
  const encrypted = Buffer.from(parts[3], "base64");
  if (iv.length !== 12 || authTag.length !== 16) {
    throw new Error("Metadatos criptográficos inválidos.");
  }
  const key = deriveChannelAes256Key(masterSecret);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

export function hashVerifyToken(token: string): string {
  return crypto.createHash("sha256").update(String(token || "").trim()).digest("hex");
}

export interface RagPropertyCandidate {
  id: number;
  name: string;
  propertyType?: string | null;
  transactionType?: string | null;
  price?: string | number | null;
  rentPrice?: string | number | null;
  city?: string | null;
  zone?: string | null;
  addressNeighborhood?: string | null;
  areaTotal?: string | number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  garages?: number | null;
  description?: string | null;
  agentId?: number | null;
  agencyId?: number | null;
  available?: boolean | null;
  aceptaTerceria?: boolean | null;
  republishToVecyStore?: boolean | null;
  visibilityScope?: string | null;
  images?: unknown;
}

export interface RagMatchedProperty {
  id: number;
  name: string;
  propertyType: string | null;
  transactionType: string | null;
  priceCop: number;
  rentPriceCop: number | null;
  city: string | null;
  zone: string | null;
  areaTotal: string | number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  isOwnProperty: boolean;
  relevanceScore: number;
  matchReason: string;
}

const QUERY_STOP_WORDS = new Set([
  "busco",
  "quiero",
  "necesito",
  "tengo",
  "para",
  "con",
  "sin",
  "que",
  "tenga",
  "hasta",
  "desde",
  "millones",
  "millon",
  "hola",
  "buenas",
  "buenos",
  "dias",
  "tardes",
  "noches",
  "por",
  "favor",
  "sobre",
  "cuanto",
  "cuesta",
  "vale",
  "gastos",
  "notariales",
  "visita",
  "agendar",
  "cita",
  "inmueble",
  "propiedad",
  "propiedades",
  "disponibles",
  "precio",
]);

function extractQuerySignals(query: string) {
  const lower = String(query || "").toLowerCase();

  let detectedType: string | null = null;
  if (/\b(apartaestudio|loft)\b/i.test(lower)) detectedType = "loft";
  else if (/\b(apartamento|apto|penthouse|duplex|dúplex)\b/i.test(lower)) detectedType = "apartment";
  else if (/\b(casa|campestre|condominio|chalet|quinta)\b/i.test(lower)) detectedType = "house";
  else if (/\b(bodega|industrial|galpon)\b/i.test(lower)) detectedType = "warehouse";
  else if (/\b(oficina|consultorio)\b/i.test(lower)) detectedType = "office";
  else if (/\b(local|comercial|vitrina)\b/i.test(lower)) detectedType = "commercial";
  else if (/\b(lote|terreno)\b/i.test(lower)) detectedType = "land";
  else if (/\b(finca)\b/i.test(lower)) detectedType = "farm";

  let detectedTx: string | null = null;
  if (/\b(permuta|cambio|reciba)\b/i.test(lower)) detectedTx = "permuta";
  else if (/\b(arriendo|arrendar|alquiler|canon|renta)\b/i.test(lower)) detectedTx = "arriendo";
  else if (/\b(venta|comprar|compra|inversion|inversión)\b/i.test(lower)) detectedTx = "venta";

  let maxBudgetCop: number | null = null;
  const millMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:millones|mill|mm?\b)/i);
  if (millMatch) {
    const val = parseFloat(millMatch[1].replace(",", "."));
    if (!Number.isNaN(val) && val > 0) {
      maxBudgetCop = val < 20_000 ? val * 1_000_000 : val;
    }
  } else {
    const dottedMatch = lower.match(/\$?\s*(\d{1,4})\.(\d{3})\.(\d{3})/);
    if (dottedMatch) {
      maxBudgetCop = Number(`${dottedMatch[1]}${dottedMatch[2]}${dottedMatch[3]}`);
    }
  }

  const bedsMatch = lower.match(/(\d+)\s*(?:alcobas|habitaciones|habs?|cuartos)/i);
  const bedrooms = bedsMatch ? Number(bedsMatch[1]) : null;

  const keywords = lower
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !QUERY_STOP_WORDS.has(w) && !/^\d+$/.test(w));

  return { detectedType, detectedTx, maxBudgetCop, bedrooms, keywords };
}

/**
 * Filtra y ordena el inventario visible para un tenant con aislamiento estricto multi-tenant.
 */
export function filterAndRankTenantInventory(
  candidates: RagPropertyCandidate[],
  options: {
    tenantUserId: number;
    tenantAgencyId?: number | null;
    includeOwnInventory: boolean;
    includeNetworkInventory: boolean;
    query: string;
    limit?: number;
  },
): RagMatchedProperty[] {
  const signals = extractQuerySignals(options.query);
  const limit = Math.max(1, Math.min(12, options.limit ?? 5));

  const visible = candidates.filter((prop) => {
    if (prop.available === false) return false;
    const scope = (prop.visibilityScope || "public_and_agent").toLowerCase();
    const isOwn =
      prop.agentId === options.tenantUserId ||
      (options.tenantAgencyId !== null &&
        options.tenantAgencyId !== undefined &&
        prop.agencyId === options.tenantAgencyId);

    if (isOwn) {
      return options.includeOwnInventory;
    }

    if (!options.includeNetworkInventory) {
      return false;
    }

    if (scope === "private" || scope === "agent_only") {
      return false;
    }
    if (prop.aceptaTerceria === false) {
      return false;
    }
    if (prop.republishToVecyStore === false) {
      return false;
    }
    return true;
  });

  const ranked = visible.map((prop) => {
    const isOwnProperty =
      prop.agentId === options.tenantUserId ||
      (options.tenantAgencyId !== null &&
        options.tenantAgencyId !== undefined &&
        prop.agencyId === options.tenantAgencyId);

    let score = isOwnProperty ? 86 : 78;
    const reasons: string[] = [];
    if (isOwnProperty) reasons.push("Inventario propio");
    else reasons.push("Red colaborativa VECY");

    const pType = (prop.propertyType || "").toLowerCase();
    if (signals.detectedType) {
      if (pType === signals.detectedType || pType.includes(signals.detectedType)) {
        score += 7;
        reasons.push(`Tipología ${prop.propertyType}`);
      } else {
        score -= 10;
      }
    }

    const pTx = (prop.transactionType || "venta").toLowerCase();
    if (signals.detectedTx) {
      if (pTx.includes(signals.detectedTx)) {
        score += 5;
        reasons.push(prop.transactionType || "venta");
      } else {
        score -= 10;
      }
    }

    const priceCop = Number(prop.price || 0);
    const rentPriceCop = prop.rentPrice !== null && prop.rentPrice !== undefined ? Number(prop.rentPrice) : null;
    const effectivePrice = signals.detectedTx === "arriendo" && rentPriceCop ? rentPriceCop : priceCop;

    if (signals.maxBudgetCop && effectivePrice > 0) {
      if (effectivePrice <= signals.maxBudgetCop) {
        score += 6;
        reasons.push("Dentro del presupuesto");
      } else if (effectivePrice <= signals.maxBudgetCop * 1.15) {
        score += 1;
      } else {
        score -= 14;
      }
    }

    if (signals.bedrooms !== null && prop.bedrooms !== null && prop.bedrooms !== undefined) {
      if (prop.bedrooms === signals.bedrooms) {
        score += 6;
        reasons.push(`${prop.bedrooms} alcobas`);
      } else {
        score -= 8;
      }
    }

    const searchable = `${prop.name || ""} ${prop.city || ""} ${prop.zone || ""} ${prop.addressNeighborhood || ""} ${prop.description || ""}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    let kwHits = 0;
    for (const kw of signals.keywords) {
      if (searchable.includes(kw)) {
        kwHits++;
        score += 4;
      }
    }
    if (kwHits > 0) {
      reasons.push("Ubicación/atributos coincidentes");
    }

    return {
      id: prop.id,
      name: prop.name,
      propertyType: prop.propertyType ?? null,
      transactionType: prop.transactionType ?? null,
      priceCop,
      rentPriceCop,
      city: prop.city ?? null,
      zone: prop.addressNeighborhood || prop.zone || null,
      areaTotal: prop.areaTotal ?? null,
      bedrooms: prop.bedrooms ?? null,
      bathrooms: prop.bathrooms ?? null,
      garages: prop.garages ?? null,
      isOwnProperty,
      relevanceScore: Math.max(40, Math.min(99, score)),
      matchReason: reasons.slice(0, 3).join(" · "),
    } satisfies RagMatchedProperty;
  });

  return ranked
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
      return Number(b.isOwnProperty) - Number(a.isOwnProperty);
    })
    .slice(0, limit);
}

export async function queryTenantInventoryForRag(options: {
  tenantUserId: number;
  tenantAgencyId?: number | null;
  includeOwnInventory: boolean;
  includeNetworkInventory: boolean;
  query: string;
  limit?: number;
}): Promise<RagMatchedProperty[]> {
  const db = await getDb();
  if (!db) return [];

  const ownRows: RagPropertyCandidate[] = options.includeOwnInventory
    ? await db
        .select({
          id: properties.id,
          name: properties.name,
          propertyType: properties.propertyType,
          transactionType: properties.transactionType,
          price: properties.price,
          rentPrice: properties.rentPrice,
          city: properties.city,
          zone: properties.zone,
          addressNeighborhood: properties.addressNeighborhood,
          areaTotal: properties.areaTotal,
          bedrooms: properties.bedrooms,
          bathrooms: properties.bathrooms,
          garages: properties.garages,
          description: properties.description,
          agentId: properties.agentId,
          agencyId: properties.agencyId,
          available: properties.available,
          aceptaTerceria: properties.aceptaTerceria,
          republishToVecyStore: properties.republishToVecyStore,
          visibilityScope: properties.visibilityScope,
          images: properties.images,
        })
        .from(properties)
        .where(
          and(
            eq(properties.available, true),
            options.tenantAgencyId
              ? or(
                  eq(properties.agentId, options.tenantUserId),
                  eq(properties.agencyId, options.tenantAgencyId),
                )
              : eq(properties.agentId, options.tenantUserId),
          ),
        )
        .orderBy(desc(properties.featured), desc(properties.createdAt))
        .limit(50)
    : [];

  const networkRows: RagPropertyCandidate[] = options.includeNetworkInventory
    ? await db
        .select({
          id: properties.id,
          name: properties.name,
          propertyType: properties.propertyType,
          transactionType: properties.transactionType,
          price: properties.price,
          rentPrice: properties.rentPrice,
          city: properties.city,
          zone: properties.zone,
          addressNeighborhood: properties.addressNeighborhood,
          areaTotal: properties.areaTotal,
          bedrooms: properties.bedrooms,
          bathrooms: properties.bathrooms,
          garages: properties.garages,
          description: properties.description,
          agentId: properties.agentId,
          agencyId: properties.agencyId,
          available: properties.available,
          aceptaTerceria: properties.aceptaTerceria,
          republishToVecyStore: properties.republishToVecyStore,
          visibilityScope: properties.visibilityScope,
          images: properties.images,
        })
        .from(properties)
        .where(
          and(
            eq(properties.available, true),
            eq(properties.aceptaTerceria, true),
            or(eq(properties.republishToVecyStore, true), isNull(properties.republishToVecyStore)),
            or(
              and(ne(properties.visibilityScope, "private"), ne(properties.visibilityScope, "agent_only")),
              isNull(properties.visibilityScope),
            ),
          ),
        )
        .orderBy(desc(properties.featured), desc(properties.createdAt))
        .limit(50)
    : [];

  const byId = new Map<number, RagPropertyCandidate>();
  for (const r of [...ownRows, ...networkRows]) {
    if (!byId.has(r.id)) byId.set(r.id, r);
  }

  return filterAndRankTenantInventory(Array.from(byId.values()), options);
}

export interface DetectedPrivateJaniaIntents {
  wantsNotarialCalc: boolean;
  wantsMortgageCalc: boolean;
  wantsVisitSchedule: boolean;
  extractedPriceCop: number | null;
  extractedEmail: string | null;
  extractedPhone: string | null;
  extractedName: string | null;
  preferredDateText: string | null;
  preferredTimeText: string | null;
}

export function detectPrivateJaniaIntents(message: string): DetectedPrivateJaniaIntents {
  const raw = String(message || "");
  const lower = raw.toLowerCase();

  const wantsNotarialCalc =
    /\b(?:notari|escritur|beneficencia|registro|retenci[oó]n|gastos?\s+de\s+venta|gastos?\s+notariales?)\b/i.test(
      lower,
    );

  const wantsMortgageCalc =
    /\b(?:cr[eé]dito|hipotec|cuota\s+mensual|financiaci[oó]n|simulaci[oó]n|cuota\s+inicial|rentabilidad|roi|canon)\b/i.test(
      lower,
    );

  const wantsVisitSchedule =
    /\b(?:agendar|agenda|visita|cita|recorrido|conocer\s+(?:el|la)|ir\s+a\s+ver|mostrar|quiero\s+verlo|programar\s+visita)\b/i.test(
      lower,
    );

  let extractedPriceCop: number | null = null;
  const millMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*(?:millones|mill|mm)\b/i);
  if (millMatch) {
    const val = parseFloat(millMatch[1].replace(",", "."));
    if (!Number.isNaN(val) && val > 0) {
      extractedPriceCop = val < 20_000 ? Math.round(val * 1_000_000) : Math.round(val);
    }
  } else {
    const fullCop = raw.match(/\$?\s*(\d{2,4})[.,](\d{3})[.,](\d{3})/);
    if (fullCop) {
      extractedPriceCop = Number(`${fullCop[1]}${fullCop[2]}${fullCop[3]}`);
    }
  }

  const emailMatch = raw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const extractedEmail = emailMatch ? emailMatch[0].toLowerCase() : null;

  const phoneMatch = raw.match(/(?:\+?57\s*)?(3\d{2}[\s-]?\d{3}[\s-]?\d{4})/);
  const extractedPhone = phoneMatch ? phoneMatch[0].replace(/[^\d+]/g, "") : null;

  const nameMatch = raw.match(/(?:me\s+llamo|soy|mi\s+nombre\s+es)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]+){0,2})/i);
  const extractedName = nameMatch ? nameMatch[1].trim() : null;

  const dateMatch = raw.match(/\b(hoy|mañana|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|\d{1,2}\s+de\s+[a-z]+)\b/i);
  const timeMatch = raw.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.))\b/i);

  return {
    wantsNotarialCalc,
    wantsMortgageCalc,
    wantsVisitSchedule,
    extractedPriceCop,
    extractedEmail,
    extractedPhone,
    extractedName,
    preferredDateText: dateMatch ? dateMatch[1] : null,
    preferredTimeText: timeMatch ? timeMatch[1] : null,
  };
}

function formatCop(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function computeFinancialOrNotarialSnippet(
  message: string,
  fallbackPriceCop?: number | null,
): { notarialSummary: string | null; financialSummary: string | null } {
  const intents = detectPrivateJaniaIntents(message);
  const targetPrice =
    intents.extractedPriceCop && intents.extractedPriceCop >= 10_000_000
      ? intents.extractedPriceCop
      : fallbackPriceCop && fallbackPriceCop >= 10_000_000
        ? fallbackPriceCop
        : null;

  let notarialSummary: string | null = null;
  let financialSummary: string | null = null;

  if (intents.wantsNotarialCalc && targetPrice) {
    const liq = liquidarGastosNotariales({
      precioVenta: targetPrice,
      estadoPredio: /hipoteca/i.test(message) ? "hipoteca" : "libre",
      formaPago: /cr[eé]dito|hipoteca|banco/i.test(message) ? "hipoteca" : "contado",
    });
    notarialSummary =
      `Estimación notarial y de registro para ${formatCop(targetPrice)}: ` +
      `Vendedor aprox. ${formatCop(liq.gastosVendedor.subtotalVendedor)} (incluye 50% notaría + Retefuente 1% de ${formatCop(liq.gastosVendedor.retencionFuente)}); ` +
      `Comprador aprox. ${formatCop(liq.gastosComprador.subtotalComprador)} (incluye 50% notaría + Beneficencia y Registro ORIP); ` +
      `Total aproximado ${formatCop(liq.totalGastosAproximados)}.`;
  }

  if (intents.wantsMortgageCalc && targetPrice) {
    const downPayment = targetPrice * 0.3;
    const loanAmount = targetPrice * 0.7;
    const rateEa = 0.115;
    const monthlyRate = Math.pow(1 + rateEa, 1 / 12) - 1;
    const n = 240;
    const installment = (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
    const estRent = targetPrice * 0.0058;
    financialSummary =
      `Simulación referencial sobre ${formatCop(targetPrice)} (30% inicial ${formatCop(downPayment)}, 70% crédito ${formatCop(loanAmount)} a 20 años / 11.5% E.A.): ` +
      `cuota aprox. ${formatCop(installment)}/mes y canon estimado de renta ${formatCop(estRent)}/mes.`;
  }

  return { notarialSummary, financialSummary };
}

export interface ExecutePrivateJaniaTurnInput {
  agentUserId: number;
  channelType?: "web_widget" | "whatsapp_cloud_api";
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  propertyId?: number;
  propertyContext?: string;
  visitorName?: string;
  visitorEmail?: string;
  visitorPhone?: string;
  includeOwnOverride?: boolean;
  includeNetworkOverride?: boolean;
}

export interface PrivateJaniaTurnResult {
  reply: string;
  botName: string;
  agencyName: string;
  matchedProperties: RagMatchedProperty[];
  notarialSummary: string | null;
  financialSummary: string | null;
  leadId: number | null;
  visitBooked: boolean;
  appointmentCode: string | null;
  blockedByQuota: boolean;
  quota: {
    used: number;
    limit: number;
    remaining: number;
    periodKey: string;
  };
}

export async function executePrivateJaniaTurn(
  input: ExecutePrivateJaniaTurnInput,
): Promise<PrivateJaniaTurnResult> {
  const db = await getDb();
  if (!db) {
    return {
      reply: "En este momento estoy reconectando con el inventario. Escríbenos directo para atenderte de inmediato.",
      botName: "Sofía IA",
      agencyName: "Agencia Asociada VECY",
      matchedProperties: [],
      notarialSummary: null,
      financialSummary: null,
      leadId: null,
      visitBooked: false,
      appointmentCode: null,
      blockedByQuota: false,
      quota: { used: 0, limit: 0, remaining: 0, periodKey: "" },
    };
  }

  const [agentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, input.agentUserId))
    .limit(1);

  if (!agentUser) {
    return {
      reply: "No fue posible identificar la agencia asignada a este asistente.",
      botName: "Sofía IA",
      agencyName: "VECY Bienes Raíces",
      matchedProperties: [],
      notarialSummary: null,
      financialSummary: null,
      leadId: null,
      visitBooked: false,
      appointmentCode: null,
      blockedByQuota: false,
      quota: { used: 0, limit: 0, remaining: 0, periodKey: "" },
    };
  }

  const channelType = input.channelType || "web_widget";
  const [channelRow] = await db
    .select()
    .from(agentJaniaChannels)
    .where(
      and(
        eq(agentJaniaChannels.userId, agentUser.id),
        eq(agentJaniaChannels.channelType, channelType),
      ),
    )
    .limit(1);

  const [agencyRow] = await db
    .select()
    .from(agencies)
    .where(
      agentUser.defaultAgencyId
        ? eq(agencies.id, agentUser.defaultAgencyId)
        : eq(agencies.ownerUserId, agentUser.id),
    )
    .limit(1);

  const theme = (agentUser.themeConfig as Record<string, any>) || {};
  const tools = (agentUser.activeTools as Record<string, any>) || {};
  const aiConfig = tools.aiAgentWidget || {};

  const botName =
    channelRow?.assistantName ||
    aiConfig.agentName ||
    (aiConfig.gender === "male" ? "Mateo IA" : "Sofía IA");
  const gender = channelRow?.personaGender || aiConfig.gender || "female";
  const genderLabel =
    gender === "male" ? "un asesor inmobiliario masculino" : "una asesora inmobiliaria femenina";
  const agencyName =
    theme.agencyName || agencyRow?.brandName || agentUser.name || "Agencia Inmobiliaria Asociada";
  const contactPhone =
    theme.contactPhone || agencyRow?.whatsappBusinessPhone || agentUser.phone || "+57 316 656 9719";
  const contactEmail = theme.contactEmail || agencyRow?.contactEmail || agentUser.email || "";
  const personalityKey = channelRow?.personaTone || aiConfig.personality || "profesional";
  const personalityDirective =
    PRIVATE_JANIA_PERSONALITY_PROMPTS[personalityKey] || PRIVATE_JANIA_PERSONALITY_PROMPTS.profesional;
  const customPrompt = channelRow?.systemPromptOverride || aiConfig.customPrompt || "";

  const entitlements = await getUserEffectiveEntitlements(agentUser.id, agentUser.role);
  const quotaCheck = checkAiMessageQuotaLimit({
    isAdmin: entitlements.isAdmin,
    privateJaniaEnabled: entitlements.plan.privateJaniaEnabled,
    maxAiMessagesMonth: entitlements.plan.maxAiMessagesMonth,
    used: entitlements.usage.aiMessagesUsed,
  });

  const effectiveLimit = entitlements.isAdmin
    ? -1
    : entitlements.plan.privateJaniaEnabled
      ? entitlements.plan.maxAiMessagesMonth
      : 0;

  if (!quotaCheck.allowed) {
    return {
      reply: `¡Hola! Soy ${botName} de ${agencyName}. En este momento nuestro canal automatizado alcanzó su límite mensual. Por favor escríbenos directamente al WhatsApp ${contactPhone} para atenderte de inmediato.`,
      botName,
      agencyName,
      matchedProperties: [],
      notarialSummary: null,
      financialSummary: null,
      leadId: null,
      visitBooked: false,
      appointmentCode: null,
      blockedByQuota: true,
      quota: {
        used: entitlements.usage.aiMessagesUsed,
        limit: effectiveLimit,
        remaining: 0,
        periodKey: entitlements.periodKey,
      },
    };
  }

  const includeOwnInventory =
    input.includeOwnOverride ?? channelRow?.includeOwnInventory ?? true;
  const includeNetworkInventory =
    input.includeNetworkOverride ??
    channelRow?.includeNetworkInventory ??
    tools.qradorSmartSearch?.allowCollaborativeNetwork ??
    true;
  const allowCrmCapture = channelRow?.allowCrmCapture ?? true;
  const allowVisitScheduling = channelRow?.allowVisitScheduling ?? true;
  const allowNotarialCalc = channelRow?.allowNotarialCalc ?? true;

  const matchedProperties = await queryTenantInventoryForRag({
    tenantUserId: agentUser.id,
    tenantAgencyId: agencyRow?.id ?? agentUser.defaultAgencyId ?? null,
    includeOwnInventory,
    includeNetworkInventory,
    query: input.message,
    limit: 5,
  });

  let focusedPropertyPrice: number | null = null;
  let focusedPropertyName: string | null = null;
  if (input.propertyId) {
    const [focused] = await db
      .select({ id: properties.id, name: properties.name, price: properties.price })
      .from(properties)
      .where(eq(properties.id, input.propertyId))
      .limit(1);
    if (focused) {
      focusedPropertyPrice = Number(focused.price || 0) || null;
      focusedPropertyName = focused.name;
    }
  } else if (matchedProperties[0]?.priceCop) {
    focusedPropertyPrice = matchedProperties[0].priceCop;
    focusedPropertyName = matchedProperties[0].name;
  }

  const calc = allowNotarialCalc
    ? computeFinancialOrNotarialSnippet(input.message, focusedPropertyPrice)
    : { notarialSummary: null, financialSummary: null };

  const intents = detectPrivateJaniaIntents(input.message);
  const visitorEmail = input.visitorEmail?.trim() || intents.extractedEmail || null;
  const visitorPhone = input.visitorPhone?.trim() || intents.extractedPhone || null;
  const visitorName =
    input.visitorName?.trim() ||
    intents.extractedName ||
    (visitorPhone ? `Cliente ${visitorPhone.slice(-4)}` : "Visitante Portal IA");

  let leadId: number | null = null;
  let visitBooked = false;
  let appointmentCode: string | null = null;
  let createdSolicitudId: number | null = null;

  if (allowVisitScheduling && intents.wantsVisitSchedule && (visitorPhone || visitorEmail)) {
    try {
      const maxRes = await db
        .select({ maxId: sql<number>`COALESCE(MAX(solicitud_id), 0)` })
        .from(solicitudes);
      const nextSolicitudId = Math.max(Number(maxRes[0]?.maxId || 0), 1144) + 1;
      const targetPropId = input.propertyId ?? matchedProperties[0]?.id ?? null;
      const targetPropName = focusedPropertyName || matchedProperties[0]?.name || "Inmueble del portafolio";

      await db.insert(solicitudes).values({
        id: sql`nextval('solicitudes_id_seq')`,
        solicitudId: nextSolicitudId,
        solicitanteNombre: visitorName,
        solicitanteTipoPersona: "Persona Natural",
        solicitantePerfil: "Cliente directo",
        solicitanteEmail: visitorEmail,
        solicitanteCelular: visitorPhone,
        servicioSolicitado: "Visitar inmueble",
        nombreInmueble: targetPropName,
        codigoInmueble: targetPropId ? `ID-${targetPropId}` : null,
        opcionNegocio: matchedProperties[0]?.transactionType || "Venta",
        fechaCitaTexto: intents.preferredDateText || "Por confirmar con asesor",
        horaCita: intents.preferredTimeText || "Por confirmar",
        cantidadPersonas: 1,
        interesadoNombre: visitorName,
        agentId: String(agentUser.id),
        estado: "pendiente_confirmacion",
        modalidad: "visita_presencial",
      });
      createdSolicitudId = nextSolicitudId;
      visitBooked = true;
      appointmentCode = `VIS-${nextSolicitudId}`;
    } catch (err: any) {
      console.warn("[PrivateJanIA] No se pudo crear solicitud de visita:", err?.message);
    }
  }

  if (allowCrmCapture && (visitorEmail || visitorPhone || visitBooked)) {
    try {
      const captured = await captureLeadIntoCrm({
        agentId: agentUser.id,
        agencyId: agencyRow?.id ?? agentUser.defaultAgencyId ?? null,
        name: visitorName,
        email: visitorEmail,
        phone: visitorPhone,
        inquiryType: matchedProperties[0]?.transactionType === "arriendo" ? "rent" : "buy",
        propertyId: input.propertyId ?? matchedProperties[0]?.id ?? null,
        estimatedBudget: intents.extractedPriceCop ?? undefined,
        preferredZone: matchedProperties[0]?.zone ?? undefined,
        preferredCity: matchedProperties[0]?.city ?? undefined,
        message: input.message,
        source: channelType === "whatsapp_cloud_api" ? "janIA" : "microsite",
        pipelineStage: visitBooked ? "visita_agendada" : "calificado",
        temperature: visitBooked ? "hot" : "warm",
        tags: [channelType, "jania_privada"],
        solicitudId: createdSolicitudId,
        activityTitle: visitBooked
          ? `Visita pre-agendada por ${botName} (${appointmentCode})`
          : `Lead capturado por ${botName} (${channelType})`,
        activityBody: input.message,
      });
      leadId = captured.lead?.id ?? null;
    } catch (err: any) {
      console.warn("[PrivateJanIA] Error no bloqueante capturando lead CRM:", err?.message);
    }
  }

  const inventoryPromptBlock =
    matchedProperties.length > 0
      ? matchedProperties
          .map(
            (p, idx) =>
              `${idx + 1}. [ID #${p.id}] ${p.name} | ${p.transactionType || "venta"} | ${formatCop(p.priceCop)} | ${p.zone || p.city || "Colombia"} | ${p.areaTotal || "-"} m² | ${p.bedrooms ?? "-"} habs | ${p.isOwnProperty ? "Propio" : "Red Aliada"}`,
          )
          .join("\n")
      : "No hay inmuebles exactos coincidentes en el filtro inicial; ofrece atención personalizada para buscarlo.";

  const systemPrompt = `Eres ${botName}, ${genderLabel} privada con inteligencia artificial al servicio exclusivo de "${agencyName}".
PERSONALIDAD (${personalityKey.toUpperCase()}): ${personalityDirective}
${customPrompt ? `\nINSTRUCCIONES DE LA AGENCIA:\n${customPrompt}` : ""}

CONTACTO DIRECTO DE LA AGENCIA:
- Agencia: ${agencyName}
- WhatsApp/Teléfono: ${contactPhone}
${contactEmail ? `- Correo: ${contactEmail}` : ""}
${input.propertyContext ? `\nCONTEXTO ACTUAL:\n${input.propertyContext}` : ""}

INVENTARIO REAL DISPONIBLE (RAG):
${inventoryPromptBlock}
${calc.notarialSummary ? `\nCÁLCULO NOTARIAL REAL:\n${calc.notarialSummary}` : ""}
${calc.financialSummary ? `\nSIMULACIÓN FINANCIERA REAL:\n${calc.financialSummary}` : ""}
${visitBooked && appointmentCode ? `\nVISITA REGISTRADA EN AGENDA: Código ${appointmentCode}. Confirma al cliente que la reserva quedó en trámite prioritario.` : ""}

REGLAS:
1. Responde únicamente con datos reales del inventario y cálculos provistos (cero inventos).
2. Máximo 4 oraciones claras en español colombiano.
3. Si no hay datos de contacto para una visita, pídelos amablemente (nombre y WhatsApp o correo).`;

  let replyText = "";
  if (process.env.NODE_ENV !== "test") {
    try {
      const messagesPayload: any[] = [
        { role: "system", content: systemPrompt },
        ...(input.history || []).slice(-6).map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: input.message },
      ];
      const llmRes = await invokeLLM({ messages: messagesPayload });
      const rawContent = llmRes?.choices?.[0]?.message?.content;
      if (typeof rawContent === "string" && rawContent.trim().length > 0) {
        replyText = rawContent.trim();
      }
    } catch (err: any) {
      console.warn("[PrivateJanIA] Fallback determinista tras error LLM:", err?.message);
    }
  }

  if (!replyText) {
    const parts: string[] = [];
    if (matchedProperties.length > 0) {
      const top = matchedProperties.slice(0, 2);
      parts.push(
        `Soy ${botName} de ${agencyName}. Encontré ${matchedProperties.length} opción(es) disponible(s), destacando ${top.map((p) => `${p.name} (${formatCop(p.priceCop)})`).join(" y ")}.`,
      );
    } else {
      parts.push(`¡Hola! Soy ${botName} de ${agencyName}.`);
    }
    if (calc.notarialSummary) parts.push(calc.notarialSummary);
    if (calc.financialSummary) parts.push(calc.financialSummary);
    if (visitBooked && appointmentCode) {
      parts.push(`Tu solicitud de visita quedó registrada con el código ${appointmentCode}.`);
    } else if (intents.wantsVisitSchedule && !visitorPhone && !visitorEmail) {
      parts.push(
        `Para agendar tu visita de inmediato, compárteme por favor tu nombre y número de WhatsApp o correo.`,
      );
    } else {
      parts.push(`Si deseas ampliar detalles o agendar cita, también atendemos en el ${contactPhone}.`);
    }
    replyText = parts.join(" ");
  }

  await incrementUsageQuota(agentUser.id, "aiMessagesUsed", 1);
  const newUsed = entitlements.usage.aiMessagesUsed + 1;
  const remaining = effectiveLimit < 0 ? -1 : Math.max(0, effectiveLimit - newUsed);

  return {
    reply: replyText,
    botName,
    agencyName,
    matchedProperties,
    notarialSummary: calc.notarialSummary,
    financialSummary: calc.financialSummary,
    leadId,
    visitBooked,
    appointmentCode,
    blockedByQuota: false,
    quota: {
      used: newUsed,
      limit: effectiveLimit,
      remaining,
      periodKey: entitlements.periodKey,
    },
  };
}
