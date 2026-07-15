var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  clientLedger: () => clientLedger,
  colombiaGeography: () => colombiaGeography,
  conversationStatusEnum: () => conversationStatusEnum,
  conversations: () => conversations,
  currencyEnum: () => currencyEnum,
  demandLevelEnum: () => demandLevelEnum,
  favorites: () => favorites,
  inquiryTypeEnum: () => inquiryTypeEnum,
  leadStatusEnum: () => leadStatusEnum,
  leads: () => leads,
  mandateStatusEnum: () => mandateStatusEnum,
  mandateTypeEnum: () => mandateTypeEnum,
  marketAnalysis: () => marketAnalysis,
  marketTrendEnum: () => marketTrendEnum,
  matchStatusEnum: () => matchStatusEnum,
  messageTypeEnum: () => messageTypeEnum,
  messages: () => messages,
  pendingSessions: () => pendingSessions,
  properties: () => properties,
  propertyImages: () => propertyImages,
  propertyMatches: () => propertyMatches,
  propertyTypeEnum: () => propertyTypeEnum,
  referralLinks: () => referralLinks,
  requirements: () => requirements,
  roleEnum: () => roleEnum,
  shares: () => shares,
  statusEnum: () => statusEnum,
  supplyLevelEnum: () => supplyLevelEnum,
  transactionTypeEnum: () => transactionTypeEnum,
  users: () => users
});
import { serial, integer, pgEnum, pgTable, text, timestamp, varchar, decimal, boolean, jsonb } from "drizzle-orm/pg-core";
var roleEnum, propertyTypeEnum, transactionTypeEnum, mandateStatusEnum, mandateTypeEnum, inquiryTypeEnum, leadStatusEnum, conversationStatusEnum, matchStatusEnum, statusEnum, messageTypeEnum, demandLevelEnum, supplyLevelEnum, marketTrendEnum, currencyEnum, users, properties, requirements, leads, conversations, messages, propertyMatches, pendingSessions, referralLinks, shares, clientLedger, propertyImages, marketAnalysis, favorites, colombiaGeography;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    roleEnum = pgEnum("role", ["user", "janIA", "system", "admin", "agent"]);
    propertyTypeEnum = pgEnum("propertyType", [
      "apartment",
      "house",
      "building",
      "warehouse",
      "farm",
      "hotel",
      "office",
      "land",
      "commercial",
      "loft",
      "consultorio"
    ]);
    transactionTypeEnum = pgEnum("transactionType", ["venta", "arriendo", "arriendo_temporal", "permuta", "aporte"]);
    mandateStatusEnum = pgEnum("mandateStatus", ["pending", "signed"]);
    mandateTypeEnum = pgEnum("mandateType", ["direct_owner", "agent_electronic_link", "agent_uploaded_paper"]);
    inquiryTypeEnum = pgEnum("inquiryType", ["buy", "sell", "rent", "invest", "general"]);
    leadStatusEnum = pgEnum("leadStatus", ["new", "contacted", "qualified", "converted", "rejected"]);
    conversationStatusEnum = pgEnum("conversationStatus", ["active", "archived", "converted"]);
    matchStatusEnum = pgEnum("matchStatus", ["suggested", "interested", "viewed", "rejected", "converted"]);
    statusEnum = pgEnum("status", ["active", "expired", "converted"]);
    messageTypeEnum = pgEnum("messageType", ["text", "image", "audio", "file", "video"]);
    demandLevelEnum = pgEnum("demandLevel", ["low", "medium", "high", "very_high"]);
    supplyLevelEnum = pgEnum("supplyLevel", ["low", "medium", "high", "very_high"]);
    marketTrendEnum = pgEnum("marketTrend", ["declining", "stable", "growing", "booming"]);
    currencyEnum = pgEnum("currency", ["COP", "USD"]);
    users = pgTable("users", {
      id: serial("id").primaryKey(),
      openId: varchar("openId", { length: 64 }).notNull().unique(),
      name: text("name"),
      email: varchar("email", { length: 320 }),
      loginMethod: varchar("loginMethod", { length: 64 }),
      role: roleEnum("role").default("user").notNull(),
      documentType: varchar("documentType", { length: 50 }),
      documentNumber: varchar("documentNumber", { length: 100 }),
      phone: varchar("phone", { length: 20 }),
      vPoints: integer("vPoints").default(0),
      subdomain: varchar("subdomain", { length: 100 }).unique(),
      themeConfig: jsonb("themeConfig"),
      customLogoUrl: text("customLogoUrl"),
      activeTools: jsonb("activeTools"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull(),
      lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
    });
    properties = pgTable("properties", {
      id: serial("id").primaryKey(),
      name: varchar("name", { length: 255 }).notNull(),
      description: text("description"),
      propertyType: propertyTypeEnum("propertyType").notNull(),
      transactionType: transactionTypeEnum("transactionType").notNull().default("venta"),
      price: decimal("price", { precision: 15, scale: 2 }).notNull(),
      currency: currencyEnum("currency").default("COP").notNull(),
      pricePerSqm: decimal("pricePerSqm", { precision: 10, scale: 2 }),
      city: varchar("city", { length: 100 }).notNull().default("Bogot\xE1"),
      zone: varchar("zone", { length: 100 }).notNull(),
      // Barrio/Sector (Candidate for refactor to addressNeighborhood)
      addressCity: varchar("address_city", { length: 100 }),
      addressLocality: varchar("address_locality", { length: 100 }),
      // ej. Usaquén, Suba
      addressNeighborhood: varchar("address_neighborhood", { length: 150 }),
      location: varchar("location", { length: 255 }),
      // Dirección (opcional/interna)
      latitude: decimal("latitude", { precision: 10, scale: 8 }),
      longitude: decimal("longitude", { precision: 11, scale: 8 }),
      coordinates: jsonb("coordinates"),
      // { lat, lng } (Candidate for refactor to replace lat/lng)
      agentId: integer("agentId").references(() => users.id),
      // Captador Oficial
      matriculaInmobiliaria: varchar("matriculaInmobiliaria", { length: 100 }).unique(),
      bedrooms: integer("bedrooms"),
      bathrooms: integer("bathrooms"),
      garages: integer("garages"),
      stratum: integer("stratum"),
      floorDetail: text("floor_detail"),
      areaTotal: decimal("areaTotal", { precision: 10, scale: 2 }),
      areaPrivate: decimal("areaPrivate", { precision: 10, scale: 2 }),
      yearBuilt: integer("yearBuilt"),
      antiguedadAnos: integer("antiguedadAnos"),
      // 0, 1-5, 5-10, 10+
      isAmoblado: boolean("isAmoblado").default(false),
      adminFee: decimal("adminFee", { precision: 15, scale: 2 }),
      commissionPercent: decimal("commissionPercent", { precision: 5, scale: 2 }),
      mandateStatus: mandateStatusEnum("mandateStatus").default("pending"),
      mandateType: mandateTypeEnum("mandateType"),
      amenities: jsonb("amenities"),
      // { balcon: true, piscina: false, etc. }
      images: jsonb("images"),
      // Array of S3/Supabase URLs
      videoUrl: text("videoUrl"),
      externalUrl: text("externalUrl"),
      // URL original del scraping (Wasi, etc.)
      rawText: text("rawText"),
      // Texto original procesado por JanIA
      featured: boolean("featured").default(false),
      available: boolean("available").default(true),
      idUsuarioWhatsapp: varchar("idUsuarioWhatsapp", { length: 100 }),
      sourceRepository: varchar("sourceRepository", { length: 255 }),
      lastSyncedAt: timestamp("lastSyncedAt"),
      // Array of all accepted transaction types (e.g. ["venta","permuta"] or ["venta","aporte"])
      acceptedTransactionTypes: text("accepted_transaction_types").array(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull(),
      fechaExtraccion: timestamp("fecha_extraccion").defaultNow(),
      origenTipo: varchar("origen_tipo", { length: 50 }),
      origenId: varchar("origen_id", { length: 100 }),
      origenNombre: varchar("origen_nombre", { length: 255 })
    });
    requirements = pgTable("requirements", {
      id: serial("id").primaryKey(),
      userId: integer("userId").references(() => users.id),
      name: varchar("name", { length: 255 }),
      tipoInmuebleDeseado: propertyTypeEnum("tipoInmuebleDeseado").notNull(),
      tipoNegocioDeseado: transactionTypeEnum("tipoNegocioDeseado").notNull(),
      // Array of all accepted transaction types for matching flexibility (e.g. ["venta","permuta"])
      tiposNegocioAceptados: text("tipos_negocio_aceptados").array(),
      ciudadDeseada: varchar("ciudadDeseada", { length: 100 }).notNull().default("Bogot\xE1"),
      zonaDeseada: varchar("zonaDeseada", { length: 100 }),
      // Candidate for refactor to addressNeighborhood
      addressCity: varchar("address_city", { length: 100 }),
      addressLocality: varchar("address_locality", { length: 100 }),
      addressNeighborhood: varchar("address_neighborhood", { length: 150 }),
      presupuestoMin: decimal("presupuestoMin", { precision: 15, scale: 2 }),
      presupuestoMax: decimal("presupuestoMax", { precision: 15, scale: 2 }),
      monedaPresupuesto: currencyEnum("currency").default("COP"),
      areaMin: decimal("areaMin", { precision: 10, scale: 2 }),
      habitacionesMin: integer("habitacionesMin"),
      banosMin: integer("banosMin"),
      parqueaderosMin: integer("parqueaderosMin"),
      estratoDeseado: jsonb("estratoDeseado"),
      // Array: [3, 4, 5]
      amobladoDeseado: boolean("amobladoDeseado"),
      caracteristicasDeseadas: jsonb("caracteristicasDeseadas"),
      status: statusEnum("status").default("active"),
      idUsuarioWhatsapp: varchar("idUsuarioWhatsapp", { length: 100 }),
      rawText: text("rawText"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull(),
      fechaExtraccion: timestamp("fecha_extraccion").defaultNow(),
      origenTipo: varchar("origen_tipo", { length: 50 }),
      origenId: varchar("origen_id", { length: 100 }),
      origenNombre: varchar("origen_nombre", { length: 255 })
    });
    leads = pgTable("leads", {
      id: serial("id").primaryKey(),
      name: varchar("name", { length: 255 }).notNull(),
      documentNumber: varchar("documentNumber", { length: 100 }),
      email: varchar("email", { length: 320 }).notNull(),
      phone: varchar("phone", { length: 20 }),
      inquiryType: inquiryTypeEnum("inquiryType").notNull(),
      message: text("message"),
      status: leadStatusEnum("status").default("new").notNull(),
      source: varchar("source", { length: 100 }),
      // janIA, website, whatsapp
      propertyId: integer("propertyId").references(() => properties.id),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    conversations = pgTable("conversations", {
      id: serial("id").primaryKey(),
      leadId: integer("leadId").references(() => leads.id),
      userId: varchar("userId", { length: 255 }),
      sessionId: varchar("sessionId", { length: 255 }).notNull(),
      status: conversationStatusEnum("status").default("active").notNull(),
      lastMessage: text("lastMessage"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    messages = pgTable("messages", {
      id: serial("id").primaryKey(),
      conversationId: integer("conversationId").references(() => conversations.id).notNull(),
      role: roleEnum("role").notNull(),
      content: text("content").notNull(),
      messageType: messageTypeEnum("messageType").default("text").notNull(),
      metadata: jsonb("metadata"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    propertyMatches = pgTable("propertyMatches", {
      id: serial("id").primaryKey(),
      requirementId: integer("requirementId").references(() => requirements.id).notNull(),
      propertyId: integer("propertyId").references(() => properties.id).notNull(),
      matchScore: decimal("matchScore", { precision: 5, scale: 2 }),
      // 0-100
      matchReason: text("matchReason"),
      status: matchStatusEnum("status").default("suggested").notNull(),
      ownerConfirmed: boolean("ownerConfirmed").default(false).notNull(),
      seekerConfirmed: boolean("seekerConfirmed").default(false).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    pendingSessions = pgTable("pendingSessions", {
      jid: varchar("jid", { length: 255 }).primaryKey(),
      sessionData: jsonb("sessionData").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    referralLinks = pgTable("referralLinks", {
      id: serial("id").primaryKey(),
      propertyId: integer("propertyId").references(() => properties.id).notNull(),
      agentId: integer("agentId").references(() => users.id).notNull(),
      token: varchar("token", { length: 255 }).notNull().unique(),
      // Unique referral slug
      clicks: integer("clicks").default(0),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    shares = pgTable("shares", {
      id: serial("id").primaryKey(),
      propertyId: integer("propertyId").references(() => properties.id).notNull(),
      agentId: integer("agentId").references(() => users.id).notNull(),
      platform: varchar("platform", { length: 50 }).notNull(),
      // WhatsApp, Facebook, Instagram, etc.
      shareLink: text("shareLink"),
      // Optional: link to the specific post
      pointsAwarded: integer("pointsAwarded").default(0),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    clientLedger = pgTable("clientLedger", {
      id: serial("id").primaryKey(),
      leadId: integer("leadId").references(() => leads.id).notNull(),
      agentId: integer("agentId").references(() => users.id).notNull(),
      propertyId: integer("propertyId").references(() => properties.id).notNull(),
      referralToken: varchar("referralToken", { length: 255 }),
      vPointsEarned: integer("vPointsEarned").default(0),
      shareId: integer("shareId").references(() => shares.id),
      // Link to the specific share that brought the lead
      status: statusEnum("status").default("active"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    propertyImages = pgTable("propertyImages", {
      id: serial("id").primaryKey(),
      propertyId: integer("propertyId").references(() => properties.id).notNull(),
      imageUrl: text("imageUrl").notNull(),
      thumbnailUrl: text("thumbnailUrl"),
      caption: varchar("caption", { length: 255 }),
      displayOrder: integer("displayOrder").default(0),
      isMainImage: boolean("isMainImage").default(false),
      uploadedBy: varchar("uploadedBy", { length: 255 }),
      fileSize: integer("fileSize"),
      mimeType: varchar("mimeType", { length: 50 }),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    marketAnalysis = pgTable("marketAnalysis", {
      id: serial("id").primaryKey()
    });
    favorites = pgTable("favorites", {
      id: serial("id").primaryKey()
    });
    colombiaGeography = pgTable("colombia_geography", {
      id: serial("id").primaryKey(),
      codeDept: varchar("code_dept", { length: 5 }).notNull(),
      nameDept: varchar("name_dept", { length: 100 }).notNull(),
      codeMun: varchar("code_mun", { length: 10 }).notNull().unique(),
      nameMun: varchar("name_mun", { length: 100 }).notNull(),
      type: varchar("type", { length: 50 }).notNull(),
      longitude: varchar("longitude", { length: 50 }),
      latitude: varchar("latitude", { length: 50 })
    });
  }
});

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      appId: process.env.VITE_APP_ID ?? "default-app-id",
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
      ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? process.env.BUILT_IN_FORGE_API_KEY ?? ""
    };
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  addPropertyImage: () => addPropertyImage,
  deletePropertyImage: () => deletePropertyImage,
  getDb: () => getDb,
  getMainPropertyImage: () => getMainPropertyImage,
  getPropertyImages: () => getPropertyImages,
  getUserByOpenId: () => getUserByOpenId,
  updatePropertyImageOrder: () => updatePropertyImageOrder,
  upsertUser: () => upsertUser
});
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _client = postgres(process.env.DATABASE_URL, {
        prepare: false,
        // Requerido por Supabase pooler (pgBouncer)
        connect_timeout: 10,
        // 10 segundos máximo para conectar
        idle_timeout: 20,
        // Cerrar conexiones inactivas tras 20 segundos
        max_lifetime: 1800,
        // Reciclar conexiones cada 30 minutos
        max: 5,
        // Máximo 5 conexiones simultáneas al pool de Supabase
        onnotice: () => {
        }
        // Silenciar NOTICEs innecesarios de PostgreSQL
      });
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function addPropertyImage(data) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const result = await db.insert(propertyImages).values(data);
  return result;
}
async function getPropertyImages(propertyId) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const images = await db.select().from(propertyImages).where(eq(propertyImages.propertyId, propertyId)).orderBy(propertyImages.displayOrder);
  return images;
}
async function getMainPropertyImage(propertyId) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const image = await db.select().from(propertyImages).where(eq(propertyImages.propertyId, propertyId)).orderBy(propertyImages.isMainImage);
  return image.length > 0 ? image[0] : null;
}
async function deletePropertyImage(imageId) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  await db.delete(propertyImages).where(eq(propertyImages.id, imageId));
}
async function updatePropertyImageOrder(imageId, displayOrder) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  await db.update(propertyImages).set({ displayOrder }).where(eq(propertyImages.id, imageId));
}
var _db, _client;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    init_env();
    _db = null;
    _client = null;
  }
});

// server/_core/llm.ts
var llm_exports = {};
__export(llm_exports, {
  invokeLLM: () => invokeLLM
});
import axios2 from "axios";
async function invokeLLM({
  messages: messages2,
  responseFormat,
  provider = "google",
  imageBuffer,
  pdfBuffer,
  pdfMimeType,
  enableSearch = false,
  tools
}) {
  if (provider === "anthropic") {
    return await invokeClaude(messages2, responseFormat);
  }
  return await invokeGemini(messages2, responseFormat, imageBuffer, pdfBuffer, pdfMimeType, enableSearch, tools);
}
async function invokeGemini(messages2, responseFormat, imageBuffer, pdfBuffer, pdfMimeType, enableSearch, tools) {
  const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ENV.forgeApiKey;
  const MODEL = "gemini-3.1-flash-lite";
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const systemMessage = messages2.find((m) => m.role === "system");
      const userMessages = messages2.filter((m) => m.role !== "system");
      const contents = userMessages.map((m, idx) => {
        const parts = [{ text: m.content }];
        if (idx === userMessages.length - 1 && m.role !== "assistant") {
          if (imageBuffer) {
            parts.push({
              inline_data: {
                mime_type: "image/jpeg",
                data: imageBuffer
              }
            });
          }
          if (pdfBuffer) {
            parts.push({
              inline_data: {
                mime_type: pdfMimeType || "application/pdf",
                data: pdfBuffer
              }
            });
          }
        }
        return {
          role: m.role === "assistant" ? "model" : "user",
          parts
        };
      });
      const payload = {
        contents,
        systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : void 0,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 4096,
          responseMimeType: responseFormat?.type === "json_object" ? "application/json" : "text/plain"
        }
      };
      if (tools && tools.length > 0) {
        payload.tools = tools;
      } else if (enableSearch) {
        payload.tools = [{ googleSearch: {} }];
      }
      console.log(`[JanIA-LLM] Intento ${attempt}/${MAX_RETRIES} \u2014 Gemini (${MODEL}) [Search: ${enableSearch}, Tools: ${!!tools}]...`);
      const response = await axios2.post(API_URL, payload);
      if (response.data.candidates && response.data.candidates[0]) {
        const firstPart = response.data.candidates[0].content?.parts?.[0];
        if (firstPart) {
          if (firstPart.functionCall) {
            return {
              choices: [{
                message: {
                  content: JSON.stringify({ functionCall: firstPart.functionCall }),
                  functionCall: firstPart.functionCall
                }
              }]
            };
          }
          const text2 = firstPart.text;
          if (text2 && text2.trim() !== "") {
            return { choices: [{ message: { content: text2 } }] };
          }
        }
      }
      if (attempt < MAX_RETRIES) {
        const waitMs = attempt * 1500;
        console.warn(`[JanIA-LLM] Respuesta vac\xEDa de Gemini (intento ${attempt}). Reintentando en ${waitMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      throw new Error("Respuesta de Gemini vac\xEDa tras todos los reintentos");
    } catch (error) {
      const status = error.response?.status;
      const isRetryable = status === 429 || status === 503 || status === 500;
      if (isRetryable && attempt < MAX_RETRIES) {
        const waitMs = attempt * 2e3;
        console.warn(`[JanIA-LLM] Error ${status} de Gemini (intento ${attempt}). Reintentando en ${waitMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      console.error("[Gemini Error]:", error.response?.data?.error?.message || error.message);
      throw error;
    }
  }
  throw new Error("Respuesta de Gemini vac\xEDa tras todos los reintentos");
}
async function invokeClaude(messages2, responseFormat) {
  console.log("[JanIA-LLM] Intentando procesar con Claude (Anthropic)...");
  throw new Error("El proveedor Anthropic est\xE1 preparado en c\xF3digo pero requiere API KEY y activaci\xF3n financiera.");
}
var init_llm = __esm({
  "server/_core/llm.ts"() {
    "use strict";
    init_env();
  }
});

// server/_core/scraper.ts
import axios3 from "axios";
import * as cheerio from "cheerio";
function esDominioPermitido(url) {
  try {
    const hostname = new URL(url).hostname.replace("www.", "").toLowerCase();
    if (DOMINIOS_BLOQUEADOS.some((d) => hostname.includes(d))) return false;
    if (DOMINIOS_PERMITIDOS.some((d) => hostname.includes(d))) return true;
    return true;
  } catch {
    return false;
  }
}
async function scrapePropertyLink(url) {
  try {
    const response = await axios3.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3"
      },
      timeout: 15e3
    });
    const $ = cheerio.load(response.data);
    const title = $("title").text() || $("h1").first().text();
    const priceText = $('.price, .property-price, .item-price, .valor, [itemprop="price"]').text().trim();
    $("script, style, nav, footer, iframe, header, .related-properties, .comments").remove();
    const detailsText = $(".details, .features, .description, .caracteristicas, .ficha-tecnica").text().trim();
    const bodyText = $("body").text().replace(/\s+/g, " ").trim();
    const combinedContent = `
      TITULO: ${title}
      PRECIO DETECTADO: ${priceText}
      DETALLES ESPECIFICOS: ${detailsText}
      CONTENIDO GENERAL: ${bodyText}
    `.slice(0, 12e3);
    const images = [];
    $("img").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src");
      if (src && (src.startsWith("http") || src.startsWith("https"))) {
        if (!src.includes("logo") && !src.includes("icon") && !src.includes("marker") && src.length < 500) {
          images.push(src);
        }
      }
    });
    const systemPrompt = `
      Eres el motor de extracci\xF3n de datos de JanIA (VECY Network). Tu misi\xF3n es convertir texto sucio de portales inmobiliarios (como Wasi, FincaRa\xEDz, etc.) en datos perfectos.
      
      REGLAS DE ORO:
      - PRICE: Busca el valor num\xE9rico m\xE1s alto que parezca el precio (ej: 550000000). Ignora la administraci\xF3n. Devuelve SOLO el n\xFAmero.
      - NAME: Genera un nombre profesional (ej: "Apartamento en Venta San Jos\xE9 de Bavaria").
      - PROPERTY TYPE: apartment, house, building, warehouse, farm, hotel, office, land, commercial, loft, consultorio.
      - IMAGES: Selecciona las 5 mejores URLs que sean fotos reales del inmueble.
      
      RESPONDE \xDANICAMENTE CON ESTE JSON:
      {
        "name": "string",
        "description": "string",
        "propertyType": "string",
        "transactionType": "venta | arriendo",
        "price": number,
        "currency": "COP | USD",
        "city": "string",
        "zone": "string",
        "bedrooms": number | null,
        "bathrooms": number | null,
        "garages": number | null,
        "stratum": number | null,
        "areaTotal": number | null,
        "areaPrivate": number | null,
        "isAmoblado": boolean,
        "floorDetail": "string (ej: 'piso 5', '3 pisos', '8 metros', 'NA')",
        "interiorExterior": "interior | exterior | NA",
        "cuartoBanoServicio": "Si | No | NA",
        "cocina": "cerrada | abierta | americana | NA",
        "lavanderiaIndependiente": "Si | No | NA",
        "tipoPisos": ["string"],
        "depositos": number | null,
        "comisiones": "string | number | null",
        "antiguedad": "nuevo | 1-5 | 5-10 | 10+ | NA",
        "amenities": { "balcon": boolean, "piscina": boolean, "gimnasio": boolean, "vigilancia": boolean, "ascensor": boolean, "terraza": boolean, "deposito": boolean },
        "images": ["url1", "url2"]
      }
    `;
    const userPrompt = `
      URL: ${url}
      CONTENIDO EXTRAIDO:
      ${combinedContent}
      
      IMAGENES CANDIDATAS: ${images.slice(0, 15).join(", ")}
      
      Extrae los datos en JSON.
    `;
    const aiResponse = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      responseFormat: { type: "json_object" }
    });
    const content = aiResponse.choices[0]?.message?.content;
    if (!content) throw new Error("JanIA no pudo estructurar la informaci\xF3n");
    const jsonStr = content.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error in property scraper:", error);
    throw new Error(`Fallo en la extracci\xF3n de datos: ${error}`);
  }
}
var DOMINIOS_PERMITIDOS, DOMINIOS_BLOQUEADOS;
var init_scraper = __esm({
  "server/_core/scraper.ts"() {
    "use strict";
    init_llm();
    DOMINIOS_PERMITIDOS = [
      "wasi.co",
      "fincaraiz.com.co",
      "metrocuadrado.com",
      "ciencuadras.com",
      "proppit.com",
      // El nuevo Properati
      "mercadolibre.com.co",
      // Muy usado en Colombia
      "mitula.com.co",
      "lamudi.com.co",
      "nuroa.com.co",
      "vivareal.co",
      "casacol.co",
      "habi.co",
      "netlify.app",
      // Tus sitios de Netlify
      "vecy.co",
      // Tus sitios de Vecy
      "github.io"
      // Otros sitios estáticos
    ];
    DOMINIOS_BLOQUEADOS = [
      "facebook.com",
      "fb.com",
      "fb.watch",
      "instagram.com",
      "youtube.com",
      "youtu.be",
      "tiktok.com",
      "twitter.com",
      "x.com",
      "wa.me",
      "whatsapp.com",
      "linkedin.com"
    ];
  }
});

// server/_core/colombia-geography.ts
function norm(txt) {
  return txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}
function buscarLugarColombia(texto) {
  const n = norm(texto);
  if (MAPA_COLOMBIA[n]) return MAPA_COLOMBIA[n];
  let bestMatch = null;
  let bestKeyLength = 0;
  for (const [key, lugar] of Object.entries(MAPA_COLOMBIA)) {
    if (key.length >= 4 && key.length > bestKeyLength) {
      const regex = new RegExp(`(^|\\s)${key}(\\s|$)`);
      if (regex.test(n)) {
        bestMatch = lugar;
        bestKeyLength = key.length;
      }
    }
  }
  return bestMatch;
}
var DEPARTAMENTOS_COLOMBIA, MAPA_COLOMBIA;
var init_colombia_geography = __esm({
  "server/_core/colombia-geography.ts"() {
    "use strict";
    DEPARTAMENTOS_COLOMBIA = {
      "antioquia": {
        nombre: "Antioquia",
        capital: "Medell\xEDn",
        municipios: [
          "Medell\xEDn",
          "Bello",
          "Itag\xFC\xED",
          "Envigado",
          "Apartad\xF3",
          "Turbo",
          "Rionegro",
          "Caucasia",
          "Sabaneta",
          "La Estrella",
          "Copacabana",
          "Girardota",
          "Barbosa",
          "Caldas",
          "Marinilla",
          "El Carmen de Viboral",
          "Guarne",
          "La Ceja",
          "Retiro",
          "Sons\xF3n",
          "Andes",
          "Jeric\xF3",
          "Jard\xEDn",
          "Ciudad Bol\xEDvar",
          "Fredonia",
          "Yarumal",
          "Santa Rosa de Osos",
          "Segovia",
          "Zaragoza",
          "Puerto Berr\xEDo",
          "El Bagre",
          "C\xE1ceres",
          "Taraz\xE1",
          "Valdivia",
          "Anor\xED"
        ]
      },
      "atlantico": {
        nombre: "Atl\xE1ntico",
        capital: "Barranquilla",
        municipios: [
          "Barranquilla",
          "Soledad",
          "Malambo",
          "Sabanalarga",
          "Baranoa",
          "Puerto Colombia",
          "Galapa",
          "Polonuevo",
          "Ponedera",
          "Santo Tom\xE1s",
          "Palmar de Varela",
          "Sabanagrande",
          "Usiacur\xED",
          "Juan de Acosta"
        ]
      },
      "bolivar": {
        nombre: "Bol\xEDvar",
        capital: "Cartagena",
        municipios: [
          "Cartagena",
          "Magangu\xE9",
          "Momp\xF3s",
          "El Carmen de Bol\xEDvar",
          "Turbaco",
          "Arjona",
          "San Juan Nepomuceno",
          "Marialabaja",
          "Villanueva",
          "Cicuco",
          "San Jacinto",
          "Zambrano",
          "Plato",
          "Calamar"
        ]
      },
      "boyaca": {
        nombre: "Boyac\xE1",
        capital: "Tunja",
        municipios: [
          "Tunja",
          "Duitama",
          "Sogamoso",
          "Chiquinquir\xE1",
          "Paipa",
          "Villa de Leyva",
          "Moniquir\xE1",
          "Guateque",
          "Miraflores",
          "Soat\xE1",
          "Socha",
          "Tibasosa",
          "Nobsa",
          "Santa Rosa de Viterbo",
          "Garagoa",
          "Ramiriqu\xED",
          "Samac\xE1",
          "Ventaquemada",
          "Jenesano",
          "Tuta",
          "Combita",
          "Motavita"
        ]
      },
      "caldas": {
        nombre: "Caldas",
        capital: "Manizales",
        municipios: [
          "Manizales",
          "La Dorada",
          "Riosucio",
          "Chinchin\xE1",
          "Villamar\xEDa",
          "Palestina",
          "Anserma",
          "Viterbo",
          "Sup\xEDa",
          "Neira",
          "Manzanares",
          "Marquetalia",
          "Saman\xE1",
          "Pensilvania"
        ]
      },
      "caqueta": {
        nombre: "Caquet\xE1",
        capital: "Florencia",
        municipios: [
          "Florencia",
          "San Vicente del Cagu\xE1n",
          "Puerto Rico",
          "El Doncello",
          "Cartagena del Chair\xE1",
          "Bel\xE9n de los Andaqu\xEDes",
          "Albania",
          "Curillo",
          "Valpara\xEDso",
          "La Monta\xF1ita",
          "Morelia",
          "Mil\xE1n",
          "Solano",
          "Solita"
        ]
      },
      "casanare": {
        nombre: "Casanare",
        capital: "Yopal",
        municipios: [
          "Yopal",
          "Aguazul",
          "Villanueva",
          "Tauramena",
          "Monterrey",
          "Paz de Ariporo",
          "Trinidad",
          "Orocu\xE9",
          "Hato Corozal",
          "Pore",
          "Man\xED",
          "Sabanalarga"
        ]
      },
      "cauca": {
        nombre: "Cauca",
        capital: "Popay\xE1n",
        municipios: [
          "Popay\xE1n",
          "Santander de Quilichao",
          "Puerto Tejada",
          "El Tambo",
          "Miranda",
          "Piendam\xF3",
          "Cajib\xEDo",
          "Timb\xEDo",
          "Caloto",
          "Padilla",
          "Corinto",
          "Silvia",
          "Rosas",
          "La Sierra",
          "Bol\xEDvar",
          "La Vega"
        ]
      },
      "cesar": {
        nombre: "Cesar",
        capital: "Valledupar",
        municipios: [
          "Valledupar",
          "Aguachica",
          "Agust\xEDn Codazzi",
          "Becerril",
          "Bosconia",
          "Chimichagua",
          "El Copey",
          "El Paso",
          "La Jagua de Ibirico",
          "La Paz",
          "Manaure",
          "Pailitas",
          "Pelaya",
          "Rio de Oro",
          "San Diego",
          "Tamalameque"
        ]
      },
      "choco": {
        nombre: "Choc\xF3",
        capital: "Quibd\xF3",
        municipios: [
          "Quibd\xF3",
          "Istmina",
          "Tad\xF3",
          "Condoto",
          "Riosucio",
          "Bah\xEDa Solano",
          "Nuqu\xED",
          "Bojay\xE1",
          "Ungu\xEDa",
          "Acand\xED",
          "Jurad\xF3",
          "Medio Baud\xF3",
          "N\xF3vita",
          "Sip\xED"
        ]
      },
      "cordoba": {
        nombre: "C\xF3rdoba",
        capital: "Monter\xEDa",
        municipios: [
          "Monter\xEDa",
          "Ceret\xE9",
          "Lorica",
          "Sahag\xFAn",
          "Montel\xEDbano",
          "Tierralta",
          "Valencia",
          "Planeta Rica",
          "Ci\xE9naga de Oro",
          "San Pelayo",
          "Chin\xFA",
          "Ayapel",
          "Buenavista",
          "La Apartada",
          "Pueblo Nuevo"
        ]
      },
      "cundinamarca": {
        nombre: "Cundinamarca",
        capital: "Bogot\xE1",
        municipios: [
          "Bogot\xE1",
          "Soacha",
          "Fusagasug\xE1",
          "Zipaquir\xE1",
          "Facatativ\xE1",
          "Ch\xEDa",
          "Mosquera",
          "Madrid",
          "Funza",
          "Cajic\xE1",
          "Tocancip\xE1",
          "Sop\xF3",
          "La Calera",
          "Cota",
          "Tabio",
          "Tenjo",
          "El Rosal",
          "Bojac\xE1",
          "Subachoque",
          "Gachancip\xE1",
          "Sibat\xE9",
          "Girardot",
          "Villeta",
          "Guaduas",
          "Ubat\xE9",
          "Chocont\xE1",
          "Suesca",
          "Nemoc\xF3n",
          "Pacho",
          "La Mesa",
          "Anapoima",
          "Apulo",
          "Cachipay",
          "El Colegio",
          "Viot\xE1",
          "Arbel\xE1ez",
          "Pasca",
          "Silvania",
          "Tibacuy",
          "Nilo"
        ]
      },
      "guainia": {
        nombre: "Guain\xEDa",
        capital: "In\xEDrida",
        municipios: ["In\xEDrida", "Barranco Minas", "Mapiripana", "San Felipe"]
      },
      "guaviare": {
        nombre: "Guaviare",
        capital: "San Jos\xE9 del Guaviare",
        municipios: [
          "San Jos\xE9 del Guaviare",
          "El Retorno",
          "Calamar",
          "Miraflores"
        ]
      },
      "huila": {
        nombre: "Huila",
        capital: "Neiva",
        municipios: [
          "Neiva",
          "Pitalito",
          "Garzon",
          "La Plata",
          "Campoalegre",
          "Palermo",
          "Rivera",
          "Gigante",
          "Isnos",
          "San Agust\xEDn",
          "Timan\xE1",
          "Saladoblanco",
          "Acevedo",
          "Oporapa",
          "Tarqui",
          "Altamira",
          "El Agrado"
        ]
      },
      "la guajira": {
        nombre: "La Guajira",
        capital: "Riohacha",
        municipios: [
          "Riohacha",
          "Maicao",
          "Uribia",
          "Manaure",
          "Fonseca",
          "San Juan del Cesar",
          "Barrancas",
          "Albania",
          "Distracci\xF3n",
          "El Molino",
          "Hatonuevo",
          "La Jagua del Pilar",
          "Urumita",
          "Villanueva"
        ]
      },
      "magdalena": {
        nombre: "Magdalena",
        capital: "Santa Marta",
        municipios: [
          "Santa Marta",
          "Ci\xE9naga",
          "Fundaci\xF3n",
          "Plato",
          "El Banco",
          "Pivijay",
          "Ariguan\xED",
          "Salamina",
          "Sitionuevo",
          "Remolino",
          "El Pi\xF1\xF3n",
          "Pedraza",
          "Zapay\xE1n",
          "Tenerife"
        ]
      },
      "meta": {
        nombre: "Meta",
        capital: "Villavicencio",
        municipios: [
          "Villavicencio",
          "Acac\xEDas",
          "Granada",
          "San Mart\xEDn",
          "Restrepo",
          "Cumaral",
          "Guamal",
          "El Dorado",
          "Mesetas",
          "La Macarena",
          "Puerto L\xF3pez",
          "Puerto Gait\xE1n",
          "Puerto Lleras",
          "Fuente de Oro",
          "San Carlos de Guaroa",
          "Vista Hermosa"
        ]
      },
      "narino": {
        nombre: "Nari\xF1o",
        capital: "Pasto",
        municipios: [
          "Pasto",
          "Tumaco",
          "Ipiales",
          "T\xFAquerres",
          "La Uni\xF3n",
          "Samaniego",
          "El Charco",
          "Barbacoas",
          "Olaya Herrera",
          "Roberto Pay\xE1n",
          "Policarpa",
          "Cumbitara",
          "Los Andes",
          "Leiva"
        ]
      },
      "norte de santander": {
        nombre: "Norte de Santander",
        capital: "C\xFAcuta",
        municipios: [
          "C\xFAcuta",
          "Oca\xF1a",
          "Pamplona",
          "Villa del Rosario",
          "Los Patios",
          "El Zulia",
          "Tib\xFA",
          "Sardinata",
          "Convenci\xF3n",
          "San Calixto",
          "Hacar\xED",
          "La Playa",
          "Bucarasica",
          "Abrego"
        ]
      },
      "putumayo": {
        nombre: "Putumayo",
        capital: "Mocoa",
        municipios: [
          "Mocoa",
          "Puerto As\xEDs",
          "Orito",
          "Valle del Guamuez",
          "San Miguel",
          "Puerto Caicedo",
          "Villagarz\xF3n",
          "Puerto Guzm\xE1n",
          "Sibundoy",
          "San Francisco",
          "Col\xF3n",
          "Santiago"
        ]
      },
      "quindio": {
        nombre: "Quind\xEDo",
        capital: "Armenia",
        municipios: [
          "Armenia",
          "Calarc\xE1",
          "Montenegro",
          "La Tebaida",
          "Quimbaya",
          "Circasia",
          "Salento",
          "Filandia",
          "G\xE9nova",
          "Pijao",
          "C\xF3rdoba",
          "Buenavista"
        ]
      },
      "risaralda": {
        nombre: "Risaralda",
        capital: "Pereira",
        municipios: [
          "Pereira",
          "Dosquebradas",
          "Santa Rosa de Cabal",
          "Cartago",
          "La Virginia",
          "Marsella",
          "Quinch\xEDa",
          "Bel\xE9n de Umbr\xEDa",
          "Gu\xE1tica",
          "Ap\xEDa",
          "Santuario",
          "Mistrat\xF3",
          "Pueblo Rico",
          "Balboa"
        ]
      },
      "san andres": {
        nombre: "San Andr\xE9s y Providencia",
        capital: "San Andr\xE9s",
        municipios: ["San Andr\xE9s", "Providencia", "Santa Catalina"]
      },
      "santander": {
        nombre: "Santander",
        capital: "Bucaramanga",
        municipios: [
          "Bucaramanga",
          "Floridablanca",
          "Gir\xF3n",
          "Piedecuesta",
          "Barrancabermeja",
          "San Gil",
          "Socorro",
          "M\xE1laga",
          "V\xE9lez",
          "Barbosa",
          "Rionegro",
          "Lebrija",
          "El Play\xF3n",
          "Sabana de Torres",
          "Puerto Wilches",
          "Land\xE1zuri",
          "Charal\xE1",
          "Mogotes",
          "P\xE1ramo"
        ]
      },
      "sucre": {
        nombre: "Sucre",
        capital: "Sincelejo",
        municipios: [
          "Sincelejo",
          "Corozal",
          "Sampu\xE9s",
          "San Marcos",
          "Tol\xFA",
          "Cove\xF1as",
          "Morroa",
          "El Roble",
          "Palmito",
          "Galeras",
          "Majagual",
          "San Benito Abad",
          "La Uni\xF3n",
          "Ovejas"
        ]
      },
      "tolima": {
        nombre: "Tolima",
        capital: "Ibagu\xE9",
        municipios: [
          "Ibagu\xE9",
          "Espinal",
          "Melgar",
          "Honda",
          "L\xEDbano",
          "Armero",
          "Fresno",
          "Mariquita",
          "Ambalema",
          "Venadillo",
          "L\xE9rida",
          "Purificaci\xF3n",
          "Natagaima",
          "Coyaima",
          "Ataco",
          "Planadas"
        ]
      },
      "valle del cauca": {
        nombre: "Valle del Cauca",
        capital: "Cali",
        municipios: [
          "Cali",
          "Buenaventura",
          "Palmira",
          "Tulu\xE1",
          "Buga",
          "Cartago",
          "Jamund\xED",
          "Yumbo",
          "Dagua",
          "La Cumbre",
          "El Cerrito",
          "Ginebra",
          "Guacar\xED",
          "Restrepo",
          "Ansermanuevo",
          "Obando",
          "La Uni\xF3n",
          "Roldanillo",
          "Zarzal",
          "Caicedonia",
          "Sevilla",
          "El Cairo",
          "Versalles",
          "El Dovio",
          "Trujillo",
          "Riofr\xEDo",
          "Andaluc\xEDa",
          "San Pedro",
          "Yotoco",
          "Vijes",
          "Candelaria",
          "Florida"
        ]
      },
      "vaupes": {
        nombre: "Vaup\xE9s",
        capital: "Mit\xFA",
        municipios: ["Mit\xFA", "Carur\xFA", "Taraira", "Pacoa"]
      },
      "vichada": {
        nombre: "Vichada",
        capital: "Puerto Carre\xF1o",
        municipios: ["Puerto Carre\xF1o", "La Primavera", "Santa Rosal\xEDa", "Cumaribo"]
      },
      "amazonas": {
        nombre: "Amazonas",
        capital: "Leticia",
        municipios: ["Leticia", "Puerto Nari\xF1o"]
      },
      "arauca": {
        nombre: "Arauca",
        capital: "Arauca",
        municipios: [
          "Arauca",
          "Arauquita",
          "Saravena",
          "Tame",
          "Fortul",
          "Puerto Rond\xF3n",
          "Cravo Norte"
        ]
      }
    };
    MAPA_COLOMBIA = {};
    for (const [deptKey, info] of Object.entries(DEPARTAMENTOS_COLOMBIA)) {
      MAPA_COLOMBIA[norm(info.nombre)] = {
        nombreCanonico: info.nombre,
        departamento: info.nombre,
        esCApital: false
      };
      for (const mun of info.municipios) {
        const key = norm(mun);
        if (!MAPA_COLOMBIA[key]) {
          MAPA_COLOMBIA[key] = {
            nombreCanonico: mun,
            departamento: info.nombre,
            esCApital: mun === info.capital
          };
        }
      }
    }
  }
});

// server/_core/geocoding.ts
import axios4 from "axios";
async function geocodeAddress(address) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    console.warn("[Geocoding] GOOGLE_MAPS_API_KEY nor GOOGLE_API_KEY is configured.");
    return null;
  }
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json`;
    const response = await axios4.get(url, {
      params: {
        address,
        components: "country:CO",
        key: apiKey
      }
    });
    const data = response.data;
    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      console.log(`[Geocoding] No se encontraron resultados en Google Maps para: "${address}" (Status: ${data.status})`);
      return null;
    }
    const result = data.results[0];
    const components = result.address_components || [];
    const geometry = result.geometry || {};
    const lat = geometry.location?.lat;
    const lng = geometry.location?.lng;
    let city = "Bogot\xE1";
    let zone = "";
    let locality = "";
    const localityComponent = components.find(
      (c) => c.types.includes("locality")
    );
    const adminArea2Component = components.find(
      (c) => c.types.includes("administrative_area_level_2")
    );
    const colloquialComponent = components.find(
      (c) => c.types.includes("colloquial_area")
    );
    if (localityComponent) {
      city = localityComponent.long_name;
    } else if (colloquialComponent) {
      city = colloquialComponent.long_name;
    } else if (adminArea2Component) {
      city = adminArea2Component.long_name;
    }
    const neighborhoodComponent = components.find(
      (c) => c.types.includes("neighborhood")
    );
    const sublocalityComponent = components.find(
      (c) => c.types.includes("sublocality_level_1") || c.types.includes("sublocality")
    );
    if (neighborhoodComponent) {
      zone = neighborhoodComponent.long_name;
    } else if (sublocalityComponent) {
      zone = sublocalityComponent.long_name;
    } else {
      zone = components[0]?.long_name || "";
    }
    if (sublocalityComponent) {
      locality = sublocalityComponent.long_name;
    } else {
      locality = city;
    }
    console.log(`[Geocoding] Google Maps resolvi\xF3: "${address}" \u2794 Ciudad: "${city}", Zona: "${zone}", Loc: "${locality}", Lat: ${lat}, Lng: ${lng}`);
    return {
      isValid: true,
      city,
      zone,
      locality,
      latitude: lat !== void 0 ? String(lat) : "",
      longitude: lng !== void 0 ? String(lng) : "",
      formattedAddress: result.formatted_address || ""
    };
  } catch (err) {
    console.error("[Geocoding] Error en geocodeAddress:", err.message);
    return null;
  }
}
var init_geocoding = __esm({
  "server/_core/geocoding.ts"() {
    "use strict";
  }
});

// server/_core/geography.ts
import { sql } from "drizzle-orm";
function normalizarTextoGeografico(texto) {
  if (!texto) return "";
  let n = texto.toLowerCase();
  n = n.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  n = n.replace(/ñ/g, "n");
  n = n.replace(/[\r\n\t]/g, " ");
  n = n.replace(/[^a-z0-9]/g, " ");
  n = n.replace(/\s+/g, " ").trim();
  n = n.replace(/\bsta\b/g, "santa");
  n = n.replace(/\bsto\b/g, "santo");
  n = n.replace(/\bapto\b/g, "apartamento");
  n = n.replace(/\bhab\b/g, "habitacion");
  n = n.replace(/\bhabs\b/g, "habitaciones");
  n = n.replace(/\bfusa\b/g, "fusagasuga");
  n = n.replace(/\bfaca\b/g, "facatativa");
  n = n.replace(/\bzipa\b/g, "zipaquira");
  n = n.replace(/\bgirardor\b/g, "girardot");
  return n;
}
async function validarZona(zona, ciudad, textoCompleto, isRequirement = false) {
  const normZone = normalizarTextoGeografico(zona);
  const normCity = ciudad ? normalizarTextoGeografico(ciudad) : "";
  const normFullText = textoCompleto ? normalizarTextoGeografico(textoCompleto) : "";
  if (!normZone) {
    return { isValid: false, errorType: "DATOS_INCOMPLETOS", message: "Pedir zona espec\xEDfica" };
  }
  if (normZone === "cedros") {
    return {
      isValid: false,
      errorType: "AMBIGUO",
      message: "\xBFTe refieres a Cedritos o a Los Cedros? Por favor aclara para registrarlo."
    };
  }
  if (normZone === "chico") {
    return {
      isValid: false,
      errorType: "AMBIGUO",
      message: "\xBFTe refieres a El Chic\xF3, Chic\xF3 Norte o Chic\xF3 Reservado? Por favor aclara."
    };
  }
  if (normZone === "usaquen") {
    return {
      isValid: false,
      errorType: "AMBIGUO",
      message: "Usaqu\xE9n es una localidad muy grande. \xBFQu\xE9 barrio espec\xEDfico dentro de Usaqu\xE9n buscas o vendes?"
    };
  }
  const queryAddress = ciudad && normalizarTextoGeografico(ciudad) !== "bogota" ? `${zona}, ${ciudad}, Colombia` : `${zona}, Bogot\xE1, Colombia`;
  const googleResult = await geocodeAddress(queryAddress);
  if (googleResult && googleResult.isValid) {
    const normGoogleCity = normalizarTextoGeografico(googleResult.city);
    const isBogota = normGoogleCity === "bogota";
    return {
      isValid: true,
      barrioCanonico: googleResult.zone,
      localidad: googleResult.locality,
      city: googleResult.city,
      isMunicipio: !isBogota,
      latitude: googleResult.latitude,
      longitude: googleResult.longitude
    };
  }
  const db = await getDb();
  let lugar = null;
  const normSimple = (txt) => txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
  if (db && ciudad) {
    const cleanCity = ciudad.trim();
    try {
      const [divipolaMatch] = await db.select().from(colombiaGeography).where(sql`LOWER(name_mun) = LOWER(${cleanCity})`).limit(1);
      if (divipolaMatch && normalizarTextoGeografico(divipolaMatch.nameMun) !== "bogota") {
        return {
          isValid: true,
          barrioCanonico: zona.trim(),
          localidad: divipolaMatch.nameDept,
          city: divipolaMatch.nameMun,
          isMunicipio: true
        };
      }
    } catch (err) {
      console.error("[Geography-DB] Error consultando DIVIPOLA por ciudad:", err.message);
    }
  }
  if (MAPA_BARRIOS[normZone]) {
    const info = MAPA_BARRIOS[normZone];
    return {
      isValid: true,
      barrioCanonico: info.barrioCanonico,
      localidad: info.localidad,
      city: info.isMunicipio ? info.barrioCanonico : "Bogot\xE1",
      isMunicipio: info.isMunicipio || false
    };
  }
  if (db && normZone) {
    try {
      const [divipolaMatch] = await db.select().from(colombiaGeography).where(sql`LOWER(name_mun) = LOWER(${zona.trim()})`).limit(1);
      if (divipolaMatch && normalizarTextoGeografico(divipolaMatch.nameMun) !== "bogota") {
        return {
          isValid: true,
          barrioCanonico: divipolaMatch.nameMun,
          localidad: divipolaMatch.nameDept,
          city: divipolaMatch.nameMun,
          isMunicipio: true
        };
      }
    } catch (err) {
      console.error("[Geography-DB] Error consultando DIVIPOLA por zona:", err.message);
    }
  }
  if (normZone) {
    lugar = buscarLugarColombia(zona);
  }
  if (!lugar && textoCompleto) {
    lugar = buscarLugarColombia(textoCompleto);
  }
  if (lugar && normSimple(lugar.nombreCanonico) !== "bogota") {
    const cleanText = (txt) => txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    const formattedCity = cleanText(lugar.nombreCanonico);
    const formattedDept = cleanText(lugar.departamento);
    return {
      isValid: true,
      barrioCanonico: zona ? zona.trim() : formattedCity,
      localidad: formattedDept,
      city: formattedCity,
      isMunicipio: true
    };
  }
  if (MAPA_LOCALIDADES[normZone]) {
    if (isRequirement) {
      return {
        isValid: true,
        barrioCanonico: MAPA_LOCALIDADES[normZone],
        localidad: MAPA_LOCALIDADES[normZone],
        city: "Bogot\xE1",
        isMunicipio: false
      };
    }
    return {
      isValid: false,
      errorType: "DATOS_INCOMPLETOS",
      message: `Mencionaste la localidad de *${MAPA_LOCALIDADES[normZone]}*. Para hacer match necesito que me digas el barrio exacto.`
    };
  }
  const sectoresAmplios = ["norte", "norte de bogota", "sur", "centro", "occidente", "salitre", "bogota", "sabana de bogota", "municipios cercanos"];
  if (sectoresAmplios.includes(normZone)) {
    if (isRequirement) {
      return {
        isValid: true,
        barrioCanonico: zona.trim(),
        localidad: "Bogot\xE1",
        city: "Bogot\xE1",
        isMunicipio: false
      };
    }
    return {
      isValid: false,
      errorType: "DATOS_INCOMPLETOS",
      message: "Mencionaste una zona muy amplia. Por favor, dime el barrio exacto o municipio espec\xEDfico."
    };
  }
  if (normZone && normZone.length >= 3) {
    const cleanText = (txt) => txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    let finalCity = "Bogot\xE1";
    let isMun = false;
    if (ciudad) {
      const cleanCity = cleanText(ciudad);
      const lugarCity = buscarLugarColombia(cleanCity);
      if (lugarCity && normalizarTextoGeografico(lugarCity.nombreCanonico) !== "bogota") {
        finalCity = cleanText(lugarCity.nombreCanonico);
        isMun = true;
      }
    }
    return {
      isValid: true,
      barrioCanonico: zona.trim(),
      localidad: isMun ? finalCity : "Bogot\xE1",
      city: finalCity,
      isMunicipio: isMun
    };
  }
  return {
    isValid: false,
    errorType: "DATOS_INCOMPLETOS",
    message: "No logr\xE9 identificar la ubicaci\xF3n. Por favor dime la ciudad, municipio o barrio exacto."
  };
}
var DICCIONARIO_BOGOTA, MUNICIPIOS_CERCANOS, MAPA_BARRIOS, MAPA_LOCALIDADES;
var init_geography = __esm({
  "server/_core/geography.ts"() {
    "use strict";
    init_colombia_geography();
    init_geocoding();
    init_db();
    init_schema();
    DICCIONARIO_BOGOTA = {
      "usaquen": {
        localidad: "Usaqu\xE9n",
        barrios: [
          "Cedritos",
          "Los Cedros",
          "Santa B\xE1rbara",
          "Santa B\xE1rbara Central",
          "Santa B\xE1rbara Norte",
          "El Chic\xF3",
          "Chic\xF3 Norte",
          "Chic\xF3 Reservado",
          "Usaqu\xE9n",
          "Tober\xEDn",
          "Country Club",
          "San Patricio",
          "La Uribe",
          "Verbenal",
          "Barrancas",
          "Horizontes",
          "La Cita",
          "Tibabita",
          "La Cer\xE1mica",
          "La Uni\xF3n",
          "Los Arrayanes",
          "Bosque Medina"
        ]
      },
      "chapinero": {
        localidad: "Chapinero",
        barrios: [
          "El Lago",
          "El Retiro",
          "Rosales",
          "Los Rosales",
          "La Cabrera",
          "Chic\xF3 Reservado Norte",
          "Chapinero Central",
          "Chapinero Alto",
          "Pardo Rubio",
          "Quinta Camacho",
          "El Castillo",
          "San Luis",
          "Juan XXIII"
        ]
      },
      "suba": {
        localidad: "Suba",
        barrios: [
          // Suba tradicional
          "Niza",
          "Alhambra",
          "Floresta",
          "Lisboa",
          "Prado Veraniego",
          "Santa Cecilia",
          "La Campi\xF1a",
          "Suba Centro",
          "Tibabuyes",
          "Rinc\xF3n",
          "La Gaitana",
          "Bilbao",
          "Casablanca",
          "El Rinconcito",
          "Britalia",
          // Norte de Suba (campestre / alto estrato)
          "Guaymaral",
          "Lagos de Torca",
          "La Conejera",
          "Torca",
          "San Pedro de Torca",
          "El Prad\xEDo",
          "Suba Rural",
          "Hacienda San Sim\xF3n",
          "Hacienda San Sebasti\xE1n",
          "Club Los Lagartos",
          "Mirandela",
          "San Jos\xE9 del Prado",
          "El Cerezo",
          "La Isabela"
        ]
      },
      "barrios unidos": {
        localidad: "Barrios Unidos",
        barrios: [
          "Doce de Octubre",
          "Los Andes",
          "Polo Club",
          "Jorge Eli\xE9cer Gait\xE1n",
          "La Patria",
          "Alc\xE1zares",
          "Siete de Agosto",
          "Lourdes",
          "San Felipe"
        ]
      },
      "teusaquillo": {
        localidad: "Teusaquillo",
        barrios: [
          "Quinta Paredes",
          "Armenia",
          "Palermo",
          "La Esmeralda",
          "Ciudad Salitre Occidental",
          "Teusaquillo",
          "La Soledad",
          "Nicol\xE1s de Federmann",
          "La Magdalena"
        ]
      },
      "engativa": {
        localidad: "Engativ\xE1",
        barrios: [
          "Engativ\xE1",
          "Boyac\xE1 Real",
          "Normand\xEDa",
          "Santa Helenita",
          "Villa Amalia",
          "\xC1lamos",
          "Las Ferias",
          "Bolivia",
          "Garcim\xE9dina",
          "Quirigua"
        ]
      },
      "fontibon": {
        localidad: "Fontib\xF3n",
        barrios: [
          "Fontib\xF3n",
          "Modelia",
          "Capellan\xEDa",
          "Hayuelos",
          "Ciudad Salitre Oriental",
          "Tintal Norte",
          "Zona Franca",
          "San Pablo",
          "El Refugio"
        ]
      },
      "kennedy": {
        localidad: "Kennedy",
        barrios: [
          "Kennedy Central",
          "Patio Bonito",
          "Bavaria",
          "Castilla",
          "Timiza",
          "Am\xE9ricas",
          "Gran Britalia",
          "Techo",
          "Corabastos",
          "Kennedy Occidental"
        ]
      },
      "bosa": {
        localidad: "Bosa",
        barrios: [
          "Bosa Central",
          "El Porvenir",
          "Bosa La Libertad",
          "Apogeo",
          "Santaf\xE9",
          "San Bernardino",
          "El Recreo"
        ]
      },
      "puente aranda": {
        localidad: "Puente Aranda",
        barrios: [
          "Puente Aranda",
          "Ciudad Montes",
          "Muz\xFA",
          "Alc\xE1zares Sur",
          "Pradera",
          "Gal\xE1n"
        ]
      },
      "antonio narino": {
        localidad: "Antonio Nari\xF1o",
        barrios: ["Restrepo", "Eduardo Santos", "Trinidad Gal\xE1n", "Bravo P\xE1ez", "Quiroga"]
      },
      "rafael uribe": {
        localidad: "Rafael Uribe Uribe",
        barrios: [
          "Marco Fidel Su\xE1rez",
          "Muzu",
          "La Colonia",
          "Mirag\xFCez",
          "San Agust\xEDn",
          "Diana Turbay",
          "Marruecos"
        ]
      },
      "santa fe": {
        localidad: "Santa Fe",
        barrios: [
          "Las Cruces",
          "La Macarena",
          "La Candelaria",
          "Lourdes",
          "El Campin",
          "Germania",
          "Bosque Izquierdo"
        ]
      },
      "la candelaria": {
        localidad: "La Candelaria",
        barrios: ["La Candelaria", "Centro Hist\xF3rico", "Las Aguas"]
      },
      "los martires": {
        localidad: "Los M\xE1rtires",
        barrios: ["La Favorita", "Eduardo Santos", "El Progreso", "Ricaurte"]
      },
      "san cristobal": {
        localidad: "San Crist\xF3bal",
        barrios: ["20 de Julio", "La Victoria", "El Sosiego", "San Crist\xF3bal"]
      },
      "usme": {
        localidad: "Usme",
        barrios: ["Usme Centro", "El Triangulo", "Comuneros", "Alfonso L\xF3pez"]
      },
      "tunjuelito": {
        localidad: "Tunjuelito",
        barrios: ["Tunjuelito", "Venecia", "Abraham Lincoln", "Falla"]
      },
      "ciudad bolivar": {
        localidad: "Ciudad Bol\xEDvar",
        barrios: ["Lucero", "El Tesoro", "Ismael Perdomo", "Meissen", "Sierra Morena"]
      }
    };
    MUNICIPIOS_CERCANOS = [
      "Ch\xEDa",
      "Cajic\xE1",
      "Sop\xF3",
      "La Calera",
      "Cota",
      "Funza",
      "Mosquera",
      "Madrid",
      "Facatativ\xE1",
      "Z\xEDpaquir\xE1",
      "Tocancip\xE1",
      "Tenjo",
      "Tabio",
      "El Rosal",
      "Bojac\xE1",
      "Subachoque",
      "Gachancip\xE1"
    ];
    MAPA_BARRIOS = {};
    MAPA_LOCALIDADES = {};
    for (const [key, info] of Object.entries(DICCIONARIO_BOGOTA)) {
      const normLocalidad = normalizarTextoGeografico(info.localidad);
      MAPA_LOCALIDADES[normLocalidad] = info.localidad;
      for (const barrio of info.barrios) {
        const normBarrio = normalizarTextoGeografico(barrio);
        MAPA_BARRIOS[normBarrio] = {
          barrioCanonico: barrio,
          localidad: info.localidad
        };
      }
    }
    for (const mun of MUNICIPIOS_CERCANOS) {
      const normMun = normalizarTextoGeografico(mun);
      MAPA_BARRIOS[normMun] = {
        barrioCanonico: mun,
        localidad: "Sabana de Bogot\xE1",
        isMunicipio: true
      };
    }
  }
});

// server/_core/voiceTranscription.ts
import axios5 from "axios";
import { spawn } from "child_process";
async function transcodeWebmToWav(inputBuffer) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i",
      "pipe:0",
      // Read from stdin
      "-vn",
      // Disable video
      "-c:a",
      "pcm_s16le",
      // Output uncompressed WAV (PCM 16-bit)
      "-ac",
      "1",
      // Mono
      "-ar",
      "16000",
      // 16kHz
      "-f",
      "wav",
      // WAV container
      "pipe:1"
      // Write to stdout
    ]);
    const chunks = [];
    ffmpeg.stdout.on("data", (chunk) => chunks.push(chunk));
    let stderrData = "";
    ffmpeg.stderr.on("data", (data) => {
      stderrData += data.toString();
    });
    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error(`ffmpeg fall\xF3 con c\xF3digo ${code}. Stderr: ${stderrData}`));
      }
    });
    ffmpeg.on("error", (err) => {
      reject(err);
    });
    ffmpeg.stdin.write(inputBuffer);
    ffmpeg.stdin.end();
  });
}
async function transcribeAudioWithGemini(audioBuffer, mimeType) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ENV.forgeApiKey;
  if (!apiKey) {
    throw new Error("No GEMINI_API_KEY or GOOGLE_API_KEY found for transcription fallback.");
  }
  const model = "gemini-3.1-flash-lite";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  let cleanMime = mimeType.split(";")[0].trim().toLowerCase();
  let bufferToUse = audioBuffer;
  if (cleanMime.includes("webm") || cleanMime.includes("octet-stream")) {
    try {
      console.log(`[STT-Fallback] Detectado audio en formato ${cleanMime}. Transcodificando a WAV usando ffmpeg...`);
      bufferToUse = await transcodeWebmToWav(audioBuffer);
      cleanMime = "audio/wav";
    } catch (e) {
      console.error(`[STT-Fallback] Error al transcodificar de WebM/octet-stream a WAV con ffmpeg:`, e.message);
    }
  }
  if (cleanMime === "audio/x-wav" || cleanMime === "audio/wave") cleanMime = "audio/wav";
  if (cleanMime === "audio/mpeg3" || cleanMime === "audio/x-mpeg-3") cleanMime = "audio/mpeg";
  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: "Transcribe el siguiente audio a texto en espa\xF1ol de manera exacta y fluida. Devuelve \xFAnicamente el texto de la transcripci\xF3n literal del audio, sin agregar introducciones, notas de autor ni comentarios adicionales. Si el audio est\xE1 completamente vac\xEDo o solo contiene ruido ininteligible, devuelve una cadena vac\xEDa." },
          {
            inline_data: {
              mime_type: cleanMime,
              data: bufferToUse.toString("base64")
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2048
    }
  };
  const response = await axios5.post(apiUrl, payload, { timeout: 15e3 });
  if (response.data.candidates && response.data.candidates[0]) {
    return response.data.candidates[0].content.parts[0].text.trim();
  }
  throw new Error("Empty candidate response from Gemini API");
}
async function transcribeAudioBuffer(audioBuffer, mimeType, prompt) {
  const sizeMB = audioBuffer.length / (1024 * 1024);
  if (sizeMB > 16) {
    throw new Error(`Audio file exceeds maximum size limit (16MB). Current size: ${sizeMB.toFixed(2)}MB`);
  }
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    console.log(`[STT-Fallback] Forge API no configurada. Transcribiendo usando Gemini directamente...`);
    return await transcribeAudioWithGemini(audioBuffer, mimeType);
  }
  const formData = new FormData();
  const filename = `audio.${getFileExtension(mimeType)}`;
  const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
  formData.append("file", audioBlob, filename);
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");
  const defaultPrompt = prompt || "Notas de voz sobre bienes ra\xEDces, Real Estate, inversiones, corretaje, inmuebles, apartamentos y casas en Bogot\xE1, Colombia. Vocabulario t\xE9cnico y comercial obligatorio: venpermuto, permuta, corretaje, br\xF3ker, aval\xFAo, estrato, arras, linderos, desenglobe, Wasi, Habi, Usaqu\xE9n, Cedritos, Chic\xF3, Rosales, Cabrera, Retiro, Santa B\xE1rbara, San Patricio, Tober\xEDn, Suba, Niza, Alhambra.";
  formData.append("prompt", defaultPrompt);
  const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL("v1/audio/transcriptions", baseUrl).toString();
  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${ENV.forgeApiKey}`,
      "Accept-Encoding": "identity"
    },
    body: formData
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Transcription service request failed (${response.status}): ${errorText}`);
  }
  const whisperResponse = await response.json();
  if (!whisperResponse.text || typeof whisperResponse.text !== "string") {
    throw new Error("Invalid transcription response: missing text field");
  }
  return whisperResponse.text;
}
async function transcribeAudio(options) {
  try {
    let audioBuffer;
    let mimeType;
    try {
      const response = await fetch(options.audioUrl);
      if (!response.ok) {
        return {
          error: "Failed to download audio file",
          code: "INVALID_FORMAT",
          details: `HTTP ${response.status}: ${response.statusText}`
        };
      }
      audioBuffer = Buffer.from(await response.arrayBuffer());
      mimeType = response.headers.get("content-type") || "audio/mpeg";
    } catch (error) {
      return {
        error: "Failed to fetch audio file",
        code: "SERVICE_ERROR",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
    try {
      const text2 = await transcribeAudioBuffer(audioBuffer, mimeType, options.prompt);
      return {
        task: "transcribe",
        language: "es",
        duration: 0,
        text: text2,
        segments: []
      };
    } catch (transcriptionError) {
      return {
        error: "Voice transcription failed",
        code: "TRANSCRIPTION_FAILED",
        details: transcriptionError.message || "Unknown error"
      };
    }
  } catch (error) {
    return {
      error: "Voice transcription failed",
      code: "SERVICE_ERROR",
      details: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
}
function getFileExtension(mimeType) {
  const mimeToExt = {
    "audio/webm": "webm",
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/ogg": "ogg",
    "audio/m4a": "m4a",
    "audio/mp4": "m4a"
  };
  return mimeToExt[mimeType] || "audio";
}
var init_voiceTranscription = __esm({
  "server/_core/voiceTranscription.ts"() {
    "use strict";
    init_env();
  }
});

// server/storage.ts
function getStorageConfig() {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}
function buildUploadUrl(baseUrl, relKey) {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}
function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function toFormData(data, contentType, fileName) {
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}
function buildAuthHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}` };
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_env();
  }
});

// server/_core/matching.ts
var matching_exports = {};
__export(matching_exports, {
  calcularScoreMatch: () => calcularScoreMatch,
  evaluarMatch: () => evaluarMatch,
  executeMatchEngine: () => executeMatchEngine,
  findMatchesForProperty: () => findMatchesForProperty,
  findMatchesForRequirement: () => findMatchesForRequirement,
  matchesGeography: () => matchesGeography
});
import { and, eq as eq2 } from "drizzle-orm";
function hasAledanos(text2) {
  if (!text2) return false;
  const n = normalizarTextoGeografico(text2);
  return n.includes("aledan") || n.includes("cercan") || n.includes("alrededor") || n.includes("similar") || n.includes("proxim") || n.includes("otro");
}
function matchesGeography(reqZoneRaw, propZoneRaw, reqLocRaw, propLocRaw, reqCityRaw, propCityRaw) {
  const reqCity = normalizarTextoGeografico(reqCityRaw || "");
  const propCity = normalizarTextoGeografico(propCityRaw || "");
  const reqZone = normalizarTextoGeografico(reqZoneRaw || "");
  const propZone = normalizarTextoGeografico(propZoneRaw || "");
  const reqLoc = normalizarTextoGeografico(reqLocRaw || "");
  const propLoc = normalizarTextoGeografico(propLocRaw || "");
  if (reqCity && propCity && reqCity !== propCity) {
    return { matches: false, score: 0 };
  }
  if (!reqZone && !reqLoc) {
    return { matches: true, score: 25 };
  }
  const equivalenciasZonas = {
    "las santas": [
      "santa barbara oriental",
      "santa barbara central",
      "santa barbara occidental",
      "santa ana oriental",
      "santa ana occidental",
      "santa paula",
      "santa bibiana",
      "san patricio",
      "navarra",
      "chico navarra",
      "molinos norte",
      "usaquen",
      "multicentro"
    ],
    "zona santas": [
      "santa barbara oriental",
      "santa barbara central",
      "santa barbara occidental",
      "santa ana oriental",
      "santa ana occidental",
      "santa paula",
      "santa bibiana",
      "san patricio",
      "navarra",
      "chico navarra",
      "molinos norte",
      "usaquen",
      "multicentro"
    ],
    "santas de usaquen": [
      "santa barbara oriental",
      "santa barbara central",
      "santa barbara occidental",
      "santa ana oriental",
      "santa ana occidental",
      "santa paula",
      "santa bibiana",
      "san patricio",
      "navarra",
      "chico navarra",
      "molinos norte",
      "usaquen",
      "multicentro"
    ],
    "sector santas": [
      "santa barbara oriental",
      "santa barbara central",
      "santa barbara occidental",
      "santa ana oriental",
      "santa ana occidental",
      "santa paula",
      "santa bibiana",
      "san patricio",
      "navarra",
      "chico navarra",
      "molinos norte",
      "usaquen",
      "multicentro"
    ],
    "barrios santa norte": [
      "santa barbara oriental",
      "santa barbara central",
      "santa barbara occidental",
      "santa ana oriental",
      "santa ana occidental",
      "santa paula",
      "santa bibiana",
      "san patricio",
      "navarra",
      "chico navarra",
      "molinos norte",
      "usaquen",
      "multicentro"
    ],
    "el chico": ["chico norte", "chico reservado", "chico reservado norte", "chico", "chico navarra", "chico sur"],
    "chico": ["chico norte", "chico reservado", "chico reservado norte", "chico", "chico navarra", "chico sur"],
    "lagos": ["lagos de torca", "club los lagartos", "el lago"],
    "las lomas": ["lomas de niza", "lomas"]
  };
  const expandirZona = (phrase) => {
    if (equivalenciasZonas[phrase]) {
      return equivalenciasZonas[phrase];
    }
    return [phrase];
  };
  const splitPhrases = (text2) => {
    if (!text2) return [];
    let norm2 = normalizarTextoGeografico(text2);
    norm2 = norm2.replace(/\b(u\s+)?otros\s+barrios\s+aledanos\b/gi, "");
    norm2 = norm2.replace(/\b(y|o|u)\s+aledanos\b/gi, "");
    norm2 = norm2.replace(/\b(y|o|u)\s+sectores\s+cercanos\b/gi, "");
    norm2 = norm2.replace(/\b(y|o|u)\s+alrededores\b/gi, "");
    norm2 = norm2.replace(/\b(y|o)\s+similares\b/gi, "");
    norm2 = norm2.replace(/\baledanos\b/gi, "");
    norm2 = norm2.replace(/\bcercanos\b/gi, "");
    norm2 = norm2.replace(/\balrededores\b/gi, "");
    return norm2.split(/,|\/|\s+y\s+|\s+o\s+|\s+e\s+/).map((p) => p.trim()).filter((p) => p.length > 0);
  };
  const reqPhrases = splitPhrases(reqZoneRaw);
  const propPhrases = splitPhrases(propZoneRaw);
  const reqExpanded = reqPhrases.flatMap(expandirZona);
  const propExpanded = propPhrases.flatMap(expandirZona);
  const palabrasGenericas = /* @__PURE__ */ new Set([
    "santa",
    "santo",
    "san",
    "del",
    "los",
    "las",
    "la",
    "el",
    "villa",
    "vista",
    "alto",
    "altos",
    "bajo",
    "bajos",
    "nueva",
    "nuevo",
    "valle",
    "valles",
    "portal",
    "portales",
    "rincon",
    "brisas",
    "colina",
    "colinas",
    "bosque",
    "bosques",
    "prado",
    "prados",
    "real",
    "lago",
    "lagos",
    "norte",
    "sur",
    "occidente",
    "oriente",
    "centro",
    "sector",
    "zona",
    "barrio",
    "vereda"
  ]);
  const esCoincidenciaAproximada = (p1, p2) => {
    if (p1 === p2) return true;
    if (palabrasGenericas.has(p1) || palabrasGenericas.has(p2)) {
      return false;
    }
    return p1.includes(p2) || p2.includes(p1);
  };
  if (reqExpanded.length > 0 && propExpanded.length > 0) {
    for (const rp of reqExpanded) {
      for (const pp of propExpanded) {
        if (esCoincidenciaAproximada(rp, pp)) {
          return { matches: true, score: 25 };
        }
      }
    }
  }
  const tieneAledanos = hasAledanos(reqZoneRaw);
  if (!tieneAledanos) {
    if (reqExpanded.length > 0) {
      return { matches: false, score: 0 };
    }
  }
  if (tieneAledanos && reqLoc && propLoc && reqLoc !== "bogota" && propLoc !== "bogota" && reqLoc === propLoc) {
    return { matches: true, score: 15 };
  }
  const isReqLocSpec = reqLoc && reqLoc !== "bogota";
  const isPropLocSpec = propLoc && propLoc !== "bogota";
  const isReqZoneSpec = reqZone && reqZone !== "bogota" && reqExpanded.length > 0;
  const isPropZoneSpec = propZone && propZone !== "bogota" && propExpanded.length > 0;
  if ((isReqLocSpec || isReqZoneSpec) && (isPropLocSpec || isPropZoneSpec)) {
    return { matches: false, score: 0 };
  }
  if (reqCity && propCity && reqCity === propCity) {
    return { matches: true, score: 10 };
  }
  return { matches: false, score: 0 };
}
function calcularScoreMatch(requirement, property) {
  const reqBiz = (requirement.tipoNegocioDeseado || requirement.transactionType || "").toLowerCase();
  const propBiz = (property.transactionType || "").toLowerCase();
  if (!reqBiz || !propBiz || reqBiz !== propBiz) {
    return 0;
  }
  const reqCity = normalizarTextoGeografico(requirement.ciudadDeseada || requirement.city || "");
  const propCity = normalizarTextoGeografico(property.city || property.addressCity || "");
  if (!reqCity || !propCity || reqCity !== propCity) {
    return 0;
  }
  const price = parseFloat(String(property.price || "0"));
  const budgetMin = parseFloat(String(requirement.presupuestoMin || "0"));
  const budgetMax = parseFloat(String(requirement.presupuestoMax || "0"));
  const reqZone = normalizarTextoGeografico(requirement.zonaDeseada || requirement.addressNeighborhood || "");
  const propZone = normalizarTextoGeografico(property.zone || property.addressNeighborhood || "");
  const reqLoc = normalizarTextoGeografico(requirement.addressLocality || "");
  const propLoc = normalizarTextoGeografico(property.addressLocality || "");
  const reqType = (requirement.tipoInmuebleDeseado || requirement.propertyType || "").toLowerCase();
  const propType = (property.propertyType || "").toLowerCase();
  const pBedrooms = property.bedrooms !== null && property.bedrooms !== void 0 ? Number(property.bedrooms) : 0;
  const reqBedrooms = requirement.habitacionesMin !== null && requirement.habitacionesMin !== void 0 ? Number(requirement.habitacionesMin) : 0;
  const pBathrooms = property.bathrooms !== null && property.bathrooms !== void 0 ? Number(property.bathrooms) : 0;
  const reqBathrooms = requirement.banosMin !== null && requirement.banosMin !== void 0 ? Number(requirement.banosMin) : 0;
  const pGarages = property.garages !== null && property.garages !== void 0 ? Number(property.garages) : 0;
  const reqGarages = requirement.parqueaderosMin !== null && requirement.parqueaderosMin !== void 0 ? Number(requirement.parqueaderosMin) : 0;
  const samePropertyType = reqType === propType;
  const sameZone = reqZone && propZone && (reqZone === propZone || reqZone.includes(propZone) || propZone.includes(reqZone));
  const priceInBudget = (budgetMax > 0 ? price <= budgetMax : true) && (budgetMin > 0 ? price >= budgetMin : true);
  const priceWithin5PercentOver = budgetMax > 0 ? price > budgetMax && price <= budgetMax * 1.05 : false;
  const priceWithin6To15PercentOver = budgetMax > 0 ? price > budgetMax * 1.05 && price <= budgetMax * 1.15 : false;
  const meetsBedrooms = pBedrooms >= reqBedrooms;
  const meetsBathrooms = pBathrooms >= reqBathrooms;
  const meetsLayout = meetsBedrooms && meetsBathrooms;
  const missingExactly1Bedroom = reqBedrooms > 0 && pBedrooms === reqBedrooms - 1;
  const missingExactly1Garage = reqGarages > 0 && pGarages === reqGarages - 1;
  if (samePropertyType && sameZone && (priceInBudget || priceWithin5PercentOver) && meetsLayout) {
    return priceInBudget ? 100 : 92;
  }
  if (samePropertyType && sameZone) {
    if (priceWithin6To15PercentOver && meetsLayout) {
      return 78;
    }
    if (priceInBudget && meetsBathrooms && (missingExactly1Bedroom && pGarages >= reqGarages || meetsBedrooms && missingExactly1Garage)) {
      return 75;
    }
  }
  const sameLocality = reqLoc && propLoc && reqLoc === propLoc;
  if (samePropertyType && priceInBudget && !sameZone && sameLocality) {
    return 55;
  }
  if (priceInBudget && sameZone && !samePropertyType) {
    return 35;
  }
  return 0;
}
function evaluarMatch(requirement, property) {
  return calcularScoreMatch(requirement, property) >= 70;
}
async function findMatchesForProperty(propertyId) {
  const db = await getDb();
  if (!db) return [];
  try {
    const [property] = await db.select().from(properties).where(eq2(properties.id, propertyId));
    if (!property) return [];
    const activeRequirements = await db.select().from(requirements).where(eq2(requirements.status, "active"));
    const validMatches = [];
    for (const req of activeRequirements) {
      const score = calcularScoreMatch(req, property);
      if (score >= 70) {
        let matchId;
        const existing = await db.select().from(propertyMatches).where(
          and(
            eq2(propertyMatches.propertyId, propertyId),
            eq2(propertyMatches.requirementId, req.id)
          )
        ).limit(1);
        if (existing.length > 0) {
          matchId = existing[0].id;
        } else {
          const [newMatch] = await db.insert(propertyMatches).values({
            propertyId,
            requirementId: req.id,
            matchScore: score.toFixed(2),
            matchReason: `VECY CORE TS Scoring: ${score.toFixed(2)}/100`,
            status: "suggested",
            ownerConfirmed: false,
            seekerConfirmed: false
          }).returning();
          matchId = newMatch.id;
        }
        validMatches.push({
          ...req,
          score,
          matchId,
          idUsuarioWhatsapp: req.idUsuarioWhatsapp
        });
      }
    }
    console.log(`[Matching] Inmueble #${propertyId}: ${validMatches.length} matches detectados.`);
    return validMatches;
  } catch (e) {
    console.error("[Matching] Error en findMatchesForProperty:", e.message);
    return [];
  }
}
async function findMatchesForRequirement(requirementId) {
  const db = await getDb();
  if (!db) return [];
  try {
    const [req] = await db.select().from(requirements).where(eq2(requirements.id, requirementId));
    if (!req) return [];
    const availableProperties = await db.select().from(properties).where(eq2(properties.available, true));
    const validMatches = [];
    for (const prop of availableProperties) {
      const score = calcularScoreMatch(req, prop);
      if (score >= 70) {
        let matchId;
        const existing = await db.select().from(propertyMatches).where(
          and(
            eq2(propertyMatches.propertyId, prop.id),
            eq2(propertyMatches.requirementId, requirementId)
          )
        ).limit(1);
        if (existing.length > 0) {
          matchId = existing[0].id;
        } else {
          const [newMatch] = await db.insert(propertyMatches).values({
            propertyId: prop.id,
            requirementId,
            matchScore: score.toFixed(2),
            matchReason: `VECY CORE TS Scoring: ${score.toFixed(2)}/100`,
            status: "suggested",
            ownerConfirmed: false,
            seekerConfirmed: false
          }).returning();
          matchId = newMatch.id;
        }
        validMatches.push({
          ...prop,
          score,
          matchId,
          idUsuarioWhatsapp: prop.idUsuarioWhatsapp
        });
      }
    }
    console.log(`[Matching] Requerimiento #${requirementId}: ${validMatches.length} matches detectados.`);
    return validMatches;
  } catch (e) {
    console.error("[Matching] Error en findMatchesForRequirement:", e.message);
    return [];
  }
}
async function executeMatchEngine(propertyId, requirementId) {
  const db = await getDb();
  if (!db) return;
  try {
    let props = [];
    let reqs = [];
    if (propertyId) {
      props = await db.select().from(properties).where(eq2(properties.id, propertyId));
    } else {
      props = await db.select().from(properties).where(eq2(properties.available, true));
    }
    if (requirementId) {
      reqs = await db.select().from(requirements).where(eq2(requirements.id, requirementId));
    } else {
      reqs = await db.select().from(requirements).where(eq2(requirements.status, "active"));
    }
    const { users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    for (const prop of props) {
      for (const req of reqs) {
        const pBiz = (prop.transactionType || "").toLowerCase();
        const rBiz = (req.tipoNegocioDeseado || "").toLowerCase();
        if (pBiz !== rBiz) continue;
        const pType = (prop.propertyType || "").toLowerCase();
        const rType = (req.tipoInmuebleDeseado || "").toLowerCase();
        if (pType !== rType) continue;
        const price = parseFloat(String(prop.price || "0"));
        const budgetMax = parseFloat(String(req.presupuestoMax || "0"));
        if (budgetMax > 0 && price > budgetMax) continue;
        const pCity = normalizarTextoGeografico(prop.city || prop.addressCity || "");
        const rCity = normalizarTextoGeografico(req.ciudadDeseada || "");
        if (!pCity || !rCity || pCity !== rCity) continue;
        const pZone = normalizarTextoGeografico(prop.zone || prop.addressNeighborhood || "");
        const rZone = normalizarTextoGeografico(req.zonaDeseada || req.addressNeighborhood || "");
        const zoneMatch = rZone && pZone && (rZone === pZone || rZone.includes(pZone) || pZone.includes(rZone));
        let score = 70;
        if (zoneMatch) {
          score = 100;
        } else if (!rZone) {
          score = 85;
        }
        let matchId;
        let isNewMatch = false;
        const existing = await db.select().from(propertyMatches).where(
          and(
            eq2(propertyMatches.propertyId, prop.id),
            eq2(propertyMatches.requirementId, req.id)
          )
        ).limit(1);
        if (existing.length > 0) {
          matchId = existing[0].id;
          await db.update(propertyMatches).set({
            matchScore: score.toFixed(2),
            matchReason: `VECY Core Engine: Match de ${score}%`,
            createdAt: /* @__PURE__ */ new Date()
          }).where(eq2(propertyMatches.id, matchId));
        } else {
          isNewMatch = true;
          const [newMatch] = await db.insert(propertyMatches).values({
            propertyId: prop.id,
            requirementId: req.id,
            matchScore: score.toFixed(2),
            matchReason: `VECY Core Engine: Match de ${score}%`,
            status: "suggested",
            ownerConfirmed: false,
            seekerConfirmed: false
          }).returning();
          matchId = newMatch.id;
        }
        if (isNewMatch) {
          const [propUser] = await db.select().from(users2).where(eq2(users2.phone, prop.idUsuarioWhatsapp || "")).limit(1);
          const [reqUser] = await db.select().from(users2).where(eq2(users2.phone, req.idUsuarioWhatsapp || "")).limit(1);
          const ownerName = propUser?.name || "Colega Oferente";
          const ownerPhone = prop.idUsuarioWhatsapp || propUser?.phone || "Desconocido";
          const seekerName = reqUser?.name || "Colega Demandante";
          const seekerPhone = req.idUsuarioWhatsapp || reqUser?.phone || "Desconocido";
          const formatCurrency = (val) => {
            return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val);
          };
          const alertMsg = `\u{1F3AF} *[COINCIDENCIA INMOBILIARIA DETECTADA]*

\u2022 *Porcentaje de Match:* ${score}%
\u2022 *Inmueble:* ${prop.propertyType.toUpperCase()} en ${prop.city} (${prop.zone || "Sector general"})
\u2022 *Negocio:* ${prop.transactionType.toUpperCase()}
\u2022 *Valores:* Oferta: ${formatCurrency(price)} | Presupuesto M\xE1x: ${formatCurrency(budgetMax)}

\u{1F465} *CONTACTOS INVOLUCRADOS:*

\u{1F511} *Due\xF1o/Captador (Oferta):*
  - Nombre: ${ownerName}
  - Tel\xE9fono: wa.me/${ownerPhone.replace(/[^0-9]/g, "")} (+${ownerPhone})

\u{1F50E} *Buscador (Demanda):*
  - Nombre: ${seekerName}
  - Tel\xE9fono: wa.me/${seekerPhone.replace(/[^0-9]/g, "")} (+${seekerPhone})

\u{1F4BC} _Proceder con el cierre comercial directamente de forma confidencial._`;
          await sendDirectAlertToAdmins(alertMsg);
        }
      }
    }
  } catch (err) {
    console.error("[Matching-Engine] Error running match engine:", err.message || err);
  }
}
async function sendDirectAlertToAdmins(message) {
  const matchBot = global.janiaMatchBotInstance;
  if (matchBot && matchBot.isReady) {
    console.log("[Matching-Notification] Enviando alerta de Match a administradores v\xEDa Baileys...");
    await matchBot.queuedSend("573192919978@s.whatsapp.net", message).catch((e) => console.error("Error al notificar a Eduardo por Baileys:", e));
    await matchBot.queuedSend("573188096811@s.whatsapp.net", message).catch((e) => console.error("Error al notificar a Jani por Baileys:", e));
    return;
  }
  const wwebClient = global.whatsappClient;
  if (wwebClient) {
    console.log("[Matching-Notification] Enviando alerta de Match a administradores v\xEDa WWEBJS...");
    await wwebClient.sendMessage("573192919978@c.us", message).catch((e) => console.error("Error al notificar a Eduardo por WWEBJS:", e));
    await wwebClient.sendMessage("573188096811@c.us", message).catch((e) => console.error("Error al notificar a Jani por WWEBJS:", e));
    return;
  }
  console.warn("[Matching-Notification] Ning\xFAn cliente de WhatsApp disponible en global para enviar la alerta.");
}
var init_matching = __esm({
  "server/_core/matching.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_geography();
  }
});

// server/_core/janIA.ts
var janIA_exports = {};
__export(janIA_exports, {
  JANIA_PROMPT: () => JANIA_PROMPT,
  MSG_CIERRE_OPERACIONES: () => MSG_CIERRE_OPERACIONES,
  MSG_COMUNICADO_MATCH_CIRCULO: () => MSG_COMUNICADO_MATCH_CIRCULO,
  MSG_COMUNICADO_MATCH_NETWORK: () => MSG_COMUNICADO_MATCH_NETWORK,
  MSG_PAUTAS_FORMATOS: () => MSG_PAUTAS_FORMATOS,
  MSG_PRESENTACION_INSTITUCIONAL: () => MSG_PRESENTACION_INSTITUCIONAL,
  MSG_PROMO_CIRCULO: () => MSG_PROMO_CIRCULO,
  MSG_PROMO_CONSULTAS: () => MSG_PROMO_CONSULTAS,
  MSG_PROMO_INMUEBLES: () => MSG_PROMO_INMUEBLES,
  MSG_RESUMEN_RETORNO_PRESENTACION: () => MSG_RESUMEN_RETORNO_PRESENTACION,
  MSG_TIPS_CALIDAD_COBERTURA: () => MSG_TIPS_CALIDAD_COBERTURA,
  REPUTATION_HOOK: () => REPUTATION_HOOK,
  buildSystemPrompt: () => buildSystemPrompt,
  clearPromptCache: () => clearPromptCache,
  generateWelcomeMessage: () => generateWelcomeMessage,
  getLiveStats: () => getLiveStats,
  handleDetectedMatches: () => handleDetectedMatches,
  isGenericName: () => isGenericName,
  isOutsideWorkingHours: () => isOutsideWorkingHours,
  isSessionMuted: () => isSessionMuted,
  muteSession: () => muteSession,
  obtenerCamposRequeridosYPreguntas: () => obtenerCamposRequeridosYPreguntas,
  parseSafeJSON: () => parseSafeJSON,
  processCirculoMessage: () => processCirculoMessage,
  processConsultingMessage: () => processConsultingMessage,
  processWhatsAppMessage: () => processWhatsAppMessage,
  sanitizeResponseMarkdown: () => sanitizeResponseMarkdown,
  scrapeUrlWithBypass: () => scrapeUrlWithBypass,
  translatePropertyType: () => translatePropertyType,
  translateTransactionType: () => translateTransactionType
});
import { eq as eq3, and as and2, sql as sql2, gte, desc, or, isNotNull } from "drizzle-orm";
import fs from "fs";
import path from "path";
import axios6 from "axios";
function extractFirstName(fullName) {
  const clean = fullName.trim();
  if (!clean) return "";
  if (/^\+?[\d\s-]{6,}$/.test(clean)) return "";
  const words = clean.split(/\s+/).map((w) => w.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, ""));
  if (words.length === 0 || !words[0]) return "";
  const w1 = words[0].toLowerCase();
  const w2 = words[1] ? words[1].toLowerCase() : "";
  if (w2 && COMMON_FIRST_NAMES.has(w1) && COMMON_FIRST_NAMES.has(w2)) {
    const first = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
    const second = words[1].charAt(0).toUpperCase() + words[1].slice(1).toLowerCase();
    return `${first} ${second}`;
  }
  return words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
}
function getColombiaHour() {
  const utc = Date.now() + (/* @__PURE__ */ new Date()).getTimezoneOffset() * 6e4;
  const colTime = new Date(utc + 36e5 * -5);
  return colTime.getHours();
}
function getGreetingByTime() {
  const hour = getColombiaHour();
  if (hour >= 6 && hour < 12) {
    return "Buenos d\xEDas";
  } else if (hour >= 12 && hour < 18) {
    return "Buenas tardes";
  } else {
    return "Buenas noches";
  }
}
function parseSafeJSON(content) {
  let text2 = content.trim();
  if (text2.startsWith("```json")) {
    text2 = text2.substring(7);
  } else if (text2.startsWith("```")) {
    text2 = text2.substring(3);
  }
  if (text2.endsWith("```")) {
    text2 = text2.substring(0, text2.length - 3);
  }
  text2 = text2.trim();
  try {
    return JSON.parse(text2);
  } catch (e) {
    const start = text2.indexOf("{");
    const end = text2.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const extracted = text2.substring(start, end + 1);
      try {
        return JSON.parse(extracted);
      } catch (e2) {
        try {
          let insideString = false;
          const chars = [...extracted];
          for (let i = 0; i < chars.length; i++) {
            if (chars[i] === '"' && (i === 0 || chars[i - 1] !== "\\")) {
              insideString = !insideString;
            }
            if (insideString && chars[i] === "\n") {
              chars[i] = "\\n";
            }
          }
          return JSON.parse(chars.join(""));
        } catch (e3) {
          throw e;
        }
      }
    }
    throw e;
  }
}
function cleanSessionJid(jid) {
  if (!jid) return "";
  return jid.split(":")[0].split("@")[0];
}
async function muteSession(userId, isMuted) {
  try {
    const db = await getDb();
    if (!db) return;
    const cleanJid = cleanSessionJid(userId);
    const [existing] = await db.select().from(pendingSessions).where(eq3(pendingSessions.jid, cleanJid)).limit(1);
    const data = existing ? existing.sessionData : {};
    data.isMuted = isMuted;
    await db.insert(pendingSessions).values({
      jid: cleanJid,
      sessionData: data,
      updatedAt: /* @__PURE__ */ new Date()
    }).onConflictDoUpdate({
      target: pendingSessions.jid,
      set: {
        sessionData: data,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    console.log(`[JanIA-Mute] Sesi\xF3n ${cleanJid} marcada como isMuted = ${isMuted}`);
  } catch (err) {
    console.error("[Database] Error muting session:", err);
  }
}
async function isSessionMuted(userId) {
  try {
    const db = await getDb();
    if (!db) return false;
    const cleanJid = cleanSessionJid(userId);
    const [existing] = await db.select().from(pendingSessions).where(eq3(pendingSessions.jid, cleanJid)).limit(1);
    if (!existing) return false;
    return !!existing.sessionData?.isMuted;
  } catch (err) {
    console.error("[Database] Error checking if session is muted:", err);
    return false;
  }
}
async function getPendingSession(userId) {
  try {
    const db = await getDb();
    if (!db) return null;
    const cleanJid = cleanSessionJid(userId);
    const [session] = await db.select().from(pendingSessions).where(eq3(pendingSessions.jid, cleanJid)).limit(1);
    if (!session) return null;
    return session.sessionData;
  } catch (err) {
    console.error("[Database] Error getting pending session:", err);
    return null;
  }
}
async function setPendingSession(userId, data) {
  try {
    const db = await getDb();
    if (!db) return;
    const cleanJid = cleanSessionJid(userId);
    await db.insert(pendingSessions).values({
      jid: cleanJid,
      sessionData: data,
      updatedAt: /* @__PURE__ */ new Date()
    }).onConflictDoUpdate({
      target: pendingSessions.jid,
      set: {
        sessionData: data,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
  } catch (err) {
    console.error("[Database] Error setting pending session:", err);
  }
}
async function deletePendingSession(userId) {
  try {
    const db = await getDb();
    if (!db) return;
    const cleanJid = cleanSessionJid(userId);
    await db.delete(pendingSessions).where(eq3(pendingSessions.jid, cleanJid));
  } catch (err) {
    console.error("[Database] Error deleting pending session:", err);
  }
}
async function resolveRealName(userId, userName) {
  const rawPhone = userId.split("@")[0];
  let name = userName && userName.trim() !== "" ? userName : `Asesor +${rawPhone}`;
  try {
    const db = await getDb();
    if (db) {
      const [u] = await db.select().from(users).where(eq3(users.phone, rawPhone)).limit(1);
      if (u && u.name && u.name.trim() !== "") {
        name = u.name;
      }
    }
  } catch (e) {
    console.warn("[JanIA-resolveRealName] Error buscando nombre de usuario en BD:", e);
  }
  return name;
}
async function hasGreetedUserToday(userId) {
  try {
    const db = await getDb();
    if (!db) return false;
    const startOfToday = /* @__PURE__ */ new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const recentMsgs = await db.select({ id: messages.id }).from(messages).innerJoin(conversations, eq3(messages.conversationId, conversations.id)).where(
      and2(
        eq3(conversations.sessionId, userId),
        eq3(messages.role, "janIA"),
        gte(messages.createdAt, startOfToday)
      )
    ).limit(1);
    return recentMsgs.length > 0;
  } catch (err) {
    console.error("[Database] Error checking if greeted today:", err);
    return false;
  }
}
async function checkAlreadyGreeted(userId) {
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  if (GREETED_TODAY.get(userId) === todayStr) {
    return true;
  }
  const dbGreeted = await hasGreetedUserToday(userId);
  if (dbGreeted) {
    GREETED_TODAY.set(userId, todayStr);
    return true;
  }
  return false;
}
async function getRecentChatHistory(userId, limit = 20) {
  try {
    const db = await getDb();
    if (!db) return [];
    const fourDaysAgo = /* @__PURE__ */ new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    const history = await db.select({
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt
    }).from(messages).innerJoin(conversations, eq3(messages.conversationId, conversations.id)).where(
      and2(
        eq3(conversations.sessionId, userId),
        gte(messages.createdAt, fourDaysAgo)
      )
    ).orderBy(desc(messages.createdAt)).limit(limit);
    return history.reverse().map((h) => ({
      role: h.role === "janIA" ? "assistant" : "user",
      content: h.content
    }));
  } catch (err) {
    console.error("[Database] Error fetching chat history:", err);
    return [];
  }
}
function isOutsideWorkingHours() {
  const dateStr = (/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "America/Bogota" });
  const bogotaDate = new Date(dateStr);
  const weekday = bogotaDate.getDay();
  const hour = bogotaDate.getHours();
  if (weekday === 0) {
    return true;
  }
  if (weekday === 6) {
    return hour < 8 || hour >= 18;
  }
  return hour < 8 || hour >= 20;
}
function capitalize(text2) {
  if (!text2) return "";
  return text2.charAt(0).toUpperCase() + text2.slice(1);
}
function buildIncompleteDataMessage(text2, hasMedia, scrapedData, imageBuffer, pdfBuffer, extracted, isGeoInvalid, intro, firstName) {
  const isSocialMedia = /instagram\.com|facebook\.com|fb\.watch|tiktok\.com|youtube\.com|youtu\.be/i.test(text2);
  if (isSocialMedia) {
    return `Oye *${firstName}*, veo que compartiste un enlace de redes sociales o video comercial. \u{1F4F2} Por pol\xEDticas de la red VECY y seguridad de datos, no puedo leer publicaciones de Instagram, Facebook, TikTok o YouTube.

Pero \xA1no te preocupes! Puedes enviarme por aqu\xED mismo los detalles escritos (\xE1rea, precio, ubicaci\xF3n, habitaciones, etc.), la imagen del flyer comercial o un archivo en PDF de la propiedad y lo procesar\xE9 de inmediato. \u{1F609}\u{1F91D}`;
  }
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
  const isRequirement = text2.toLowerCase().includes("busco") || text2.toLowerCase().includes("necesito") || text2.toLowerCase().includes("requiero") || !!extracted?.tipoInmuebleDeseado;
  const txTypeRaw = (extracted?.transactionType || extracted?.tipoNegocioDeseado || "venta").toLowerCase();
  const city = isRequirement ? extracted?.ciudadDeseada : extracted?.city;
  if (!city || city.trim() === "" || city.toLowerCase() === "na") {
    return isRequirement ? `Oye *${firstName}*, \xBFen qu\xE9 ciudad est\xE1s buscando el/la *${propertyName}*? \u{1F4CD}` : `Oye *${firstName}*, \xBFen qu\xE9 ciudad queda ubicado el/la *${propertyName}* que quieres publicar? \u{1F4CD}`;
  }
  const zone = isRequirement ? extracted?.zonaDeseada || extracted?.zone : extracted?.zone;
  if (isGeoInvalid || !zone || zone.trim() === "" || zone.toLowerCase() === "na") {
    return isRequirement ? `Oye *${firstName}*, \xBFen qu\xE9 barrio o sector de *${city}* buscas el/la *${propertyName}*? \u{1F3E1} (Si tienes varias opciones de barrio, escr\xEDbelas separadas por comas)` : `Oye *${firstName}*, \xBFen qu\xE9 barrio o sector exacto de *${city}* queda el/la *${propertyName}*? \u{1F3E1}`;
  }
  const price = isRequirement ? Number(extracted?.presupuestoMax || extracted?.price || 0) : Number(extracted?.price || 0);
  if (!price || price <= 0) {
    if (isRequirement) {
      return `Oye *${firstName}*, \xBFcu\xE1l es tu presupuesto m\xE1ximo para ${txTypeRaw === "arriendo" ? "arrendar" : "comprar"} el/la *${propertyName}*? \u{1F4B0}`;
    } else {
      return `Oye *${firstName}*, \xBFcu\xE1l es el precio de ${txTypeRaw === "arriendo" ? "arriendo mensual" : "venta"} del/la *${propertyName}*? \u{1F4B0}`;
    }
  }
  if (txTypeRaw === "arriendo") {
    const hasAdminFee = extracted?.adminFee !== void 0 && extracted?.adminFee !== null && Number(extracted.adminFee) >= 0;
    const textHasAdmin = text2.toLowerCase().includes("adm") || text2.toLowerCase().includes("administra");
    if (!hasAdminFee && !textHasAdmin) {
      return `Oye *${firstName}*, \xBFel valor de la administraci\xF3n est\xE1 incluido en el arriendo del/la *${propertyName}* o cu\xE1nto cuesta por separado? \u{1F4CB}`;
    }
  }
  const area = Number(extracted?.area || 0);
  if (!area || area <= 0) {
    if (propertyName === "finca") {
      return `Oye *${firstName}*, \xBFcu\xE1ntas hect\xE1reas o fanegadas de extensi\xF3n tiene la finca? \u{1F4D0}`;
    } else {
      return `Oye *${firstName}*, \xBFcu\xE1l es el \xE1rea o metraje en metros cuadrados del/la *${propertyName}*? \u{1F4D0}`;
    }
  }
  const stratum = Number(extracted?.stratum || 0);
  if ((!stratum || stratum <= 0) && propertyName !== "finca" && propertyName !== "lote" && propertyName !== "bodega") {
    return `Oye *${firstName}*, \xBFde qu\xE9 estrato es el/la *${propertyName}*? \u{1F3E2}`;
  }
  if (propertyName === "apartamento" || propertyName === "casa" || propertyName === "loft" || propertyName === "inmueble") {
    const bedrooms = Number(extracted?.bedrooms || 0);
    if (!bedrooms || bedrooms <= 0) {
      return isRequirement ? `Oye *${firstName}*, \xBFpodr\xEDas repetirme de cu\xE1ntas habitaciones lo necesitas? \u{1F6CF}\uFE0F` : `Oye *${firstName}*, \xBFpodr\xEDas repetirme de cu\xE1ntas habitaciones es? \u{1F6CF}\uFE0F`;
    }
    const bathrooms = Number(extracted?.bathrooms || 0);
    if (!bathrooms || bathrooms <= 0) {
      return isRequirement ? `Oye *${firstName}*, \xBFde cu\xE1ntos ba\xF1os lo requieres? \u{1F6BD}` : `Oye *${firstName}*, \xBFde cu\xE1ntos ba\xF1os dispone el/la *${propertyName}*? \u{1F6BD}`;
    }
  }
  const garages = extracted?.garages;
  if ((garages === void 0 || garages === null || garages < 0) && propertyName !== "lote") {
    return isRequirement ? `Oye *${firstName}*, \xBFcu\xE1ntos parqueaderos o garajes necesitas como m\xEDnimo? \u{1F697}` : `Oye *${firstName}*, \xBFde cu\xE1ntos garajes o parqueaderos dispone el/la *${propertyName}*? \u{1F697}`;
  }
  if (propertyName === "apartamento" || propertyName === "oficina" || propertyName === "consultorio") {
    const floor = extracted?.floorDetail;
    if (!floor || floor.trim() === "" || floor.toUpperCase() === "NA") {
      return `Oye *${firstName}*, \xBFen qu\xE9 piso est\xE1 ubicado el/la *${propertyName}*? \u{1F3E2}`;
    }
    const intExt = extracted?.interiorExterior;
    if (!intExt || intExt.trim() === "" || intExt.toUpperCase() === "NA") {
      return `Oye *${firstName}*, \xBFla ubicaci\xF3n del/la *${propertyName}* es interior o exterior? \u{1F3D9}\uFE0F`;
    }
  } else if (propertyName === "casa" || propertyName === "edificio") {
    const floor = extracted?.floorDetail;
    if (!floor || floor.trim() === "" || floor.toUpperCase() === "NA") {
      return `Oye *${firstName}*, \xBFde cu\xE1ntos pisos o niveles es la/el *${propertyName}*? \u{1F3DB}\uFE0F`;
    }
  } else if (propertyName === "bodega") {
    const floor = extracted?.floorDetail;
    if (!floor || floor.trim() === "" || floor.toUpperCase() === "NA") {
      return `Oye *${firstName}*, \xBFqu\xE9 altura \xFAtil tiene la bodega? \xBFEs de sencilla, doble o triple altura? \u{1F3D7}\uFE0F`;
    }
  }
  return `Oye *${firstName}*, \xBFme podr\xEDas confirmar la ubicaci\xF3n o el barrio exacto para registrarlo correctamente en VECY? \u{1F50E}`;
}
function buildGroupIncompleteMessage(text2, userId, extracted) {
  const phone = userId.split("@")[0];
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
  const isRequirement = text2.toLowerCase().includes("busco") || text2.toLowerCase().includes("necesito") || text2.toLowerCase().includes("requiero") || !!extracted?.tipoInmuebleDeseado;
  const txTypeRaw = (extracted?.transactionType || extracted?.tipoNegocioDeseado || "venta").toLowerCase();
  const missingList = [];
  const city = isRequirement ? extracted?.ciudadDeseada : extracted?.city;
  if (!city || city.trim() === "" || city.toLowerCase() === "na") {
    missingList.push("la ciudad");
  }
  const zone = isRequirement ? extracted?.zonaDeseada || extracted?.zone : extracted?.zone;
  if (!zone || zone.trim() === "" || zone.toLowerCase() === "na") {
    missingList.push("el barrio exacto");
  }
  const price = isRequirement ? Number(extracted?.presupuestoMax || extracted?.price || 0) : Number(extracted?.price || 0);
  if (!price || price <= 0) {
    if (isRequirement) {
      missingList.push("el presupuesto m\xE1ximo");
    } else {
      if (txTypeRaw === "arriendo") {
        missingList.push("el precio de arriendo");
      } else if (txTypeRaw === "permuta") {
        missingList.push("el valor de la permuta");
      } else {
        missingList.push("el precio de venta");
      }
    }
  }
  if (txTypeRaw === "arriendo" && !isRequirement) {
    const hasAdminFee = extracted?.adminFee !== void 0 && extracted?.adminFee !== null && Number(extracted.adminFee) >= 0;
    const textHasAdmin = text2.toLowerCase().includes("adm") || text2.toLowerCase().includes("administra");
    if (!hasAdminFee && !textHasAdmin) {
      missingList.push("el valor de la administraci\xF3n");
    }
  }
  const area = Number(extracted?.area || 0);
  if (!area || area <= 0) {
    if (propertyName === "finca") {
      missingList.push("las hect\xE1reas o fanegadas");
    } else {
      missingList.push("el metraje en metros cuadrados");
    }
  }
  const stratum = Number(extracted?.stratum || 0);
  if ((!stratum || stratum <= 0) && propertyName !== "finca" && propertyName !== "lote" && propertyName !== "bodega") {
    missingList.push("el estrato");
  }
  if (propertyName === "apartamento" || propertyName === "casa" || propertyName === "loft" || propertyName === "inmueble") {
    const bedrooms = Number(extracted?.bedrooms || 0);
    if (!bedrooms || bedrooms <= 0) {
      missingList.push("las habitaciones");
    }
    const bathrooms = Number(extracted?.bathrooms || 0);
    if (!bathrooms || bathrooms <= 0) {
      missingList.push("los ba\xF1os");
    }
  }
  const garages = extracted?.garages;
  if ((garages === void 0 || garages === null || garages < 0) && propertyName !== "lote") {
    missingList.push("los garajes/parqueaderos");
  }
  if (propertyName === "apartamento" || propertyName === "oficina" || propertyName === "consultorio") {
    const floor = extracted?.floorDetail;
    if (!floor || floor.trim() === "" || floor.toUpperCase() === "NA") {
      missingList.push("el piso");
    }
    const intExt = extracted?.interiorExterior;
    if (!intExt || intExt.trim() === "" || intExt.toUpperCase() === "NA") {
      missingList.push("si es interior o exterior");
    }
  } else if (propertyName === "casa" || propertyName === "edificio") {
    const floor = extracted?.floorDetail;
    if (!floor || floor.trim() === "" || floor.toUpperCase() === "NA") {
      missingList.push("la cantidad de pisos");
    }
  } else if (propertyName === "bodega") {
    const floor = extracted?.floorDetail;
    if (!floor || floor.trim() === "" || floor.toUpperCase() === "NA") {
      missingList.push("la altura \xFAtil");
    }
  }
  if (missingList.length === 0) {
    missingList.push("el barrio exacto");
  }
  let missingStr = "";
  if (missingList.length === 1) {
    missingStr = missingList[0];
  } else if (missingList.length === 2) {
    missingStr = `${missingList[0]} y ${missingList[1]}`;
  } else {
    const last = missingList.pop();
    missingStr = `${missingList.join(", ")}, y ${last}`;
  }
  return `\u{1F914} *\xA1PUBLICACI\xD3N INCOMPLETA!* \u{1F914}

Hola @${phone}, noto que est\xE1s publicando un(a) *${propertyName}*, pero a tu mensaje le faltan datos importantes: *${missingStr}*.

Para registrar tu oferta/requerimiento y buscarte un MATCH de inmediato, haz clic en este enlace para enviarme los datos por privado: \u{1F447}
\u{1F449} https://wa.me/573185462265?text=${encodeURIComponent("Hola JanIA, aqu\xED est\xE1n los datos de mi publicaci\xF3n")}`;
}
function analyzeSender(name, userId, alreadyGreeted) {
  const n = (name || "Colega").trim();
  const normalizedFull = n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const firstWord = n.split(/\s+/)[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  if (!alreadyGreeted) GREETED_TODAY.set(userId, todayStr);
  const femaleNames = ["maria", "ana", "claudia", "martha", "adriana", "sandra", "jani", "natalia", "paola", "diana", "laura", "sofia", "valentina", "andrea", "milena", "patricia", "marcela", "liliana", "elena", "monica", "beatriz", "gloria", "carmen", "lucia", "angela", "isabel", "clara", "rosa", "teresa", "yolanda", "esperanza", "blanca", "pilar", "carolina", "juliana", "catalina", "viviana", "lizeth", "daniela", "camila"];
  const maleNames = ["juan", "carlos", "jose", "luis", "jorge", "andres", "felipe", "david", "mateo", "santiago", "daniel", "alejandro", "ricardo", "fernando", "eduardo", "pablo", "sergio", "javier", "alberto", "rafael", "mauricio", "german", "gustavo", "ramiro", "gabriel", "julio", "oscar", "ivan", "hugo", "diego", "wilson", "edgar", "mario", "hector", "victor"];
  const corporateKeywords = ["inmo", "bienes", "raices", "propiedades", "network", "group", "asesores", "servicios", "soluciones", "comercial", "ventas", "vecy", "sas", "ltda", "vende", "arrienda", "inmobiliaria", "finca", "raiz", "realestate"];
  let baseGreeting = `\xA1Hola, qu\xE9 gusto tenerte aqu\xED, ${n}!`;
  let adj = "profesional";
  let courtesy = "gracias por tu rigor profesional";
  const isCorporate = corporateKeywords.some((kw) => normalizedFull.includes(kw));
  if (isCorporate) {
    baseGreeting = `\xA1Hola, qu\xE9 gusto saludarte, colega de ${n}!`;
  } else {
    const isMale = maleNames.includes(firstWord) || maleNames.some((m) => firstWord.startsWith(m));
    const isFemale = femaleNames.includes(firstWord) || femaleNames.some((f) => firstWord.startsWith(f));
    if (isMale) {
      baseGreeting = `\xA1Hola ${n}!`;
      adj = "juicioso";
      courtesy = "excelente labor, sigue as\xED de juicioso";
    } else if (isFemale) {
      baseGreeting = `\xA1Hola ${n}!`;
      adj = "juiciosa";
      courtesy = "excelente labor, sigue as\xED de juiciosa";
    } else if (firstWord.endsWith("a") || firstWord.endsWith("ia") || firstWord.endsWith("th")) {
      baseGreeting = `\xA1Hola ${n}!`;
      adj = "juiciosa";
      courtesy = "excelente labor, sigue as\xED de juiciosa";
    } else if (firstWord.endsWith("o") || firstWord.endsWith("s") || firstWord.endsWith("r") || firstWord.endsWith("l") || firstWord.endsWith("n") || firstWord.endsWith("z")) {
      baseGreeting = `\xA1Hola ${n}!`;
      adj = "juicioso";
      courtesy = "excelente labor, sigue as\xED de juicioso";
    }
  }
  return {
    greeting: alreadyGreeted ? "" : baseGreeting,
    adj,
    courtesy
  };
}
async function getLiveStats() {
  try {
    const db = await getDb();
    if (!db) return "";
    const [propCount] = await db.select({ total: sql2`count(*)::int` }).from(properties);
    const [reqCount] = await db.select({ total: sql2`count(*)::int` }).from(requirements);
    const [matchCount] = await db.select({ total: sql2`count(*)::int` }).from(propertyMatches);
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const [propHoy] = await db.select({ total: sql2`count(*)::int` }).from(properties).where(sql2`${properties.createdAt} >= ${today}`);
    const [reqHoy] = await db.select({ total: sql2`count(*)::int` }).from(requirements).where(sql2`${requirements.createdAt} >= ${today}`);
    const [matchHoy] = await db.select({ total: sql2`count(*)::int` }).from(propertyMatches).where(sql2`${propertyMatches.createdAt} >= ${today}`);
    const now = (/* @__PURE__ */ new Date()).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" });
    return `
## \u{1F4CA} ESTAD\xCDSTICAS EN TIEMPO REAL DE VECY NETWORK (Actualizado: ${now} hora Colombia)
Esta informaci\xF3n es EXACTA y proviene directamente de la base de datos en este preciso instante. \xDAsala cuando alguien pregunte cu\xE1ntos inmuebles, requerimientos o coincidencias tenemos:

| Categor\xEDa | Total Hist\xF3rico | Nuevos Hoy |
|-----------|----------------|------------|
| \u{1F3E2} Inmuebles publicados | **${propCount?.total ?? 0}** | ${propHoy?.total ?? 0} |
| \u{1F4CB} Requerimientos de b\xFAsqueda | **${reqCount?.total ?? 0}** | ${reqHoy?.total ?? 0} |
| \u{1F3AF} Coincidencias (Matches) detectadas | **${matchCount?.total ?? 0}** | ${matchHoy?.total ?? 0} |

Si alguien te pregunta por estos n\xFAmeros, responde CON PRECISI\xD3N usando exactamente los datos de esta tabla. No inventes, no estimes. Estos son los datos reales del sistema VECY en este momento.`;
  } catch (err) {
    console.warn("[JanIA-LiveStats] No se pudo obtener estad\xEDsticas en tiempo real:", err);
    return "";
  }
}
function buildSystemPrompt(groupJid) {
  const cacheKey = groupJid || "web";
  if (promptCache[cacheKey]) {
    return promptCache[cacheKey];
  }
  try {
    const baseDir = path.resolve(process.cwd(), "server/_core/prompts");
    const basePrompt = fs.readFileSync(path.join(baseDir, "base.md"), "utf-8");
    let specificPrompt = "";
    if (groupJid === "120363260108880069@g.us") {
      specificPrompt = fs.readFileSync(path.join(baseDir, "grupos/inmuebles.md"), "utf-8");
    } else if (groupJid === "120363417740040773@g.us") {
      const legalPrompt = fs.readFileSync(path.join(baseDir, "grupos/legal.md"), "utf-8");
      const avaluosPrompt = fs.readFileSync(path.join(baseDir, "modulos/avaluos.md"), "utf-8");
      specificPrompt = `${legalPrompt}

${avaluosPrompt}`;
    } else if (groupJid === "120363403507276533@g.us") {
      specificPrompt = fs.readFileSync(path.join(baseDir, "grupos/circulo_cero.md"), "utf-8");
    } else if (groupJid && (groupJid.endsWith("@g.us") || groupJid.includes("@us"))) {
      specificPrompt = fs.readFileSync(path.join(baseDir, "grupos/inmuebles.md"), "utf-8");
    } else {
      specificPrompt = fs.readFileSync(path.join(baseDir, "web/web_console.md"), "utf-8");
    }
    const fullPrompt = `${basePrompt}

${specificPrompt}`;
    promptCache[cacheKey] = fullPrompt;
    return fullPrompt;
  } catch (err) {
    console.error("[Prompts-Loader] Error loading prompt files, falling back to old JANIA_PROMPT:", err.message);
    return JANIA_PROMPT;
  }
}
function clearPromptCache() {
  promptCache = {};
}
function formatColombiaDateTime(dateVal) {
  const d = new Date(dateVal);
  const bogotaStr = d.toLocaleString("en-US", { timeZone: "America/Bogota" });
  const bogotaDate = new Date(bogotaStr);
  const day = String(bogotaDate.getDate()).padStart(2, "0");
  const month = String(bogotaDate.getMonth() + 1).padStart(2, "0");
  const year = bogotaDate.getFullYear();
  const daysOfWeek = ["Domingo", "Lunes", "Martes", "Mi\xE9rcoles", "Jueves", "Viernes", "S\xE1bado"];
  const dayName = daysOfWeek[bogotaDate.getDay()];
  let hours = bogotaDate.getHours();
  const minutes = String(bogotaDate.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hourStr = String(hours).padStart(2, "0");
  return {
    dateStr: `${day}/${month}/${year}`,
    timeStr: `${hourStr}:${minutes} ${ampm}`,
    dayName
  };
}
async function handleDetectedMatches(matches, isProperty, savedRecord, userId, realName) {
  const mentions = [];
  const matchBlocks = [];
  const extraDMs = [];
  const savedDateTime = formatColombiaDateTime(savedRecord.createdAt || /* @__PURE__ */ new Date());
  const savedRawPhone = userId.split("@")[0];
  const savedJid = userId.includes("@") ? userId : `${userId}@c.us`;
  const getReqText = (item) => {
    if (item.rawText && item.rawText.trim()) return item.rawText.trim();
    if (item.caracteristicasDeseadas?.wants?.details) {
      return `${item.name || "Requerimiento"} - ${item.caracteristicasDeseadas.wants.details}`;
    }
    return item.name || "Sin descripci\xF3n";
  };
  const getPropText = (item) => {
    if (item.rawText && item.rawText.trim()) return item.rawText.trim();
    if (item.description && item.description.trim()) return item.description.trim();
    if (item.amenities?.gives?.details) {
      return `${item.name || "Propiedad"} - ${item.amenities.gives.details}`;
    }
    return item.name || "Sin descripci\xF3n";
  };
  for (const matchedItem of matches) {
    const score = matchedItem.score || 70;
    const matchId = matchedItem.matchId;
    const matchedDateTime = formatColombiaDateTime(matchedItem.createdAt || /* @__PURE__ */ new Date());
    const matchedPhone = matchedItem.idUsuarioWhatsapp || "";
    const matchedRawPhone = matchedPhone.split("@")[0];
    const matchedJid = matchedPhone.includes("@") ? matchedPhone : `${matchedPhone}@c.us`;
    if (matchedJid && !mentions.includes(matchedJid)) {
      mentions.push(matchedJid);
    }
    const reqItem = isProperty ? matchedItem : savedRecord;
    const propItem = isProperty ? savedRecord : matchedItem;
    const reqDateTime = isProperty ? matchedDateTime : savedDateTime;
    const propDateTime = isProperty ? savedDateTime : matchedDateTime;
    const block = `\u{1F389}\u{1F388} *\xA1COINCIDENCIA DE NEGOCIO DETECTADA!* (Coincidencia: ${score.toFixed(0)}%) \u{1F388}\u{1F389}
\u{1F4CC} *C\xF3digo de Coincidencia:* #M${matchId}

\u{1F4E3} *REQUERIMIENTO* \u{1F4E3}
\u2022 \u{1F3E2} *INMUEBLE:* ${translatePropertyType(reqItem.tipoInmuebleDeseado || reqItem.propertyType || "inmueble")}
\u2022 \u{1F4BC} *NEGOCIO:* ${translateTransactionType(reqItem.tipoNegocioDeseado || reqItem.transactionType || "compra")}
\u2022 \u{1F4C5} *FECHA DE ENV\xCDO:* ${reqDateTime.dateStr}
\u2022 \u23F0 *HORA DE ENV\xCDO:* ${reqDateTime.timeStr}
\u2022 \u{1F464} *Autor:* @${isProperty ? matchedRawPhone : savedRawPhone}
\u2022 \u{1F4AC} *PUBLICACI\xD3N:* ${getReqText(reqItem)}
\u2022 \u{1F4DE} *CONTACTO:* [Confirmaci\xF3n Pendiente - Se envi\xF3 DM privado \u{1F4E9}]

\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

\u{1F3E0} *PROPIEDAD* \u{1F3E0}
\u2022 \u{1F3E2} *INMUEBLE:* ${translatePropertyType(propItem.propertyType || "inmueble")}
\u2022 \u{1F4BC} *NEGOCIO:* ${translateTransactionType(propItem.transactionType || "venta")}
\u2022 \u{1F4C5} *FECHA DE ENV\xCDO:* ${propDateTime.dateStr}
\u2022 \u23F0 *HORA DE ENV\xCDO:* ${propDateTime.timeStr}
\u2022 \u{1F464} *Autor:* @${isProperty ? savedRawPhone : matchedRawPhone}
\u2022 \u{1F4AC} *PUBLICACI\xD3N:* ${getPropText(propItem)}
\u2022 \u{1F4DE} *CONTACTO:* [Confirmaci\xF3n Pendiente - Se envi\xF3 DM privado \u{1F4E9}]`;
    matchBlocks.push(block);
    let savedUserName = realName;
    let matchedUserName = "Colega";
    try {
      const db = await getDb();
      if (db) {
        const [su] = await db.select().from(users).where(eq3(users.phone, savedRawPhone)).limit(1);
        if (su && su.name && su.name.trim() !== "") {
          savedUserName = su.name;
        }
        const [mu] = await db.select().from(users).where(eq3(users.phone, matchedRawPhone)).limit(1);
        if (mu && mu.name && mu.name.trim() !== "") {
          matchedUserName = mu.name;
        }
      }
    } catch (e) {
      console.warn("[JanIA-Match] Error buscando nombres reales de usuarios:", e);
    }
    const savedFirstName = savedUserName.split(" ")[0];
    const matchedFirstName = matchedUserName.split(" ")[0];
    const ownerName = isProperty ? savedFirstName : matchedFirstName;
    const ownerJid = isProperty ? savedJid : matchedJid;
    const ownerDateTime = isProperty ? savedDateTime : matchedDateTime;
    const seekerName = isProperty ? matchedFirstName : savedFirstName;
    const seekerJid = isProperty ? matchedJid : savedJid;
    const seekerDateTime = isProperty ? savedDateTime : matchedDateTime;
    const adminPhone = "573166569719";
    const adminJid = `${adminPhone}@c.us`;
    const adminMessage = `\u{1F4E2} *NUEVA COINCIDENCIA DETECTADA* (Coincidencia: ${score.toFixed(0)}%)
\u{1F4CC} *C\xF3digo:* #M${matchId}

\u{1F4E3} *REQUERIMIENTO*
\u2022 Autor: ${isProperty ? matchedUserName : savedUserName}
\u2022 Tel\xE9fono: +${isProperty ? matchedRawPhone : savedRawPhone}
\u2022 Detalle: ${getReqText(reqItem)}

\u{1F3E0} *PROPIEDAD*
\u2022 Autor: ${isProperty ? savedUserName : matchedUserName}
\u2022 Tel\xE9fono: +${isProperty ? savedRawPhone : matchedRawPhone}
\u2022 Detalle: ${getPropText(propItem)}
\u2022 Precio: ${propItem.price ? Number(propItem.price).toLocaleString("es-CO") + " COP" : "N/A"}`;
    extraDMs.push({ jid: adminJid, message: adminMessage, viaMainBot: true });
  }
  const responseText = `\u{1F4E2} *\xA1ATENCI\xD3N!* Hemos detectado un posible Match \u{1F3AF}, Por favor @todos pendientes. En breve uno de nuestros agentes \u{1F64B}\u{1F3FB}\u200D\u2640\uFE0F\u{1F64B}\u{1F3FB}\u200D\u2642\uFE0F contactar\xE1 a los beneficiarios para compartirles los datos de las coincidencias encontradas \u{1F50D}. Saludos \u{1F44B}`;
  return {
    response: responseText,
    mentions: [],
    extraDMs,
    sendReputationHook: false
  };
}
function translatePropertyType(type) {
  const map = {
    apartment: "Apartamento",
    house: "Casa",
    building: "Edificio",
    warehouse: "Bodega",
    office: "Oficina",
    farm: "Finca",
    land: "Lote",
    loft: "Loft",
    consultorio: "Consultorio"
  };
  return map[type?.toLowerCase()] || capitalize(type || "inmueble");
}
function translateTransactionType(type) {
  const map = {
    venta: "VENTA",
    arriendo: "ARRIENDO",
    arriendo_temporal: "ARRIENDO TEMPORAL",
    permuta: "PERMUTA"
  };
  return map[type?.toLowerCase()] || String(type || "negocio").toUpperCase();
}
async function getTimeOfDayGreetingForUser(phone, realName, alreadyGreeted, isGroup = false) {
  const d = /* @__PURE__ */ new Date();
  const bogotaStr = d.toLocaleString("en-US", { timeZone: "America/Bogota" });
  const bogotaDate = new Date(bogotaStr);
  const hour = bogotaDate.getHours();
  let salutation = "";
  if (hour >= 5 && hour < 12) {
    salutation = "Buenos d\xEDas";
  } else if (hour >= 12 && hour < 18) {
    salutation = "Buenas tardes";
  } else {
    salutation = "Buenas noches";
  }
  let nameToUse = realName;
  try {
    const db = await getDb();
    if (db) {
      const [u] = await db.select().from(users).where(eq3(users.phone, phone)).limit(1);
      if (u && u.name && u.name.trim() !== "") {
        nameToUse = u.name;
      }
    }
  } catch (e) {
    console.warn("[JanIA-Greeting] Error buscando nombre de usuario para saludo:", e);
  }
  const firstName = extractFirstName(nameToUse) || "colega";
  if (alreadyGreeted) {
    return isGroup ? `Mira @${phone}` : `Mira ${firstName}`;
  } else {
    return isGroup ? `${salutation} @${phone}` : `${salutation} ${firstName}`;
  }
}
async function scrapeUrlWithBypass(url) {
  const cleanUrl = url.trim();
  const zenrowsKey = process.env.ZENROWS_API_KEY;
  if (zenrowsKey) {
    try {
      console.log(`[Scraper-Bypass] Intentando extraer con ZenRows: ${cleanUrl}`);
      const response = await axios6.get("https://api.zenrows.com/v1/", {
        params: {
          key: zenrowsKey,
          url: cleanUrl,
          js_render: "true",
          premium_proxy: "true",
          markdown: "true"
        },
        timeout: 2e4
      });
      if (response.status === 200 && response.data) {
        return typeof response.data === "string" ? response.data : JSON.stringify(response.data);
      }
    } catch (err) {
      console.warn(`[Scraper-Bypass] Error en ZenRows para ${cleanUrl}:`, err.message);
    }
  }
  const scrapingbeeKey = process.env.SCRAPINGBEE_API_KEY;
  if (scrapingbeeKey) {
    try {
      console.log(`[Scraper-Bypass] Intentando extraer con ScrapingBee: ${cleanUrl}`);
      const response = await axios6.get("https://app.scrapingbee.com/api/v1/", {
        params: {
          api_key: scrapingbeeKey,
          url: cleanUrl,
          render_js: "true",
          premium_proxy: "true"
        },
        timeout: 2e4
      });
      if (response.status === 200 && response.data) {
        return typeof response.data === "string" ? response.data : JSON.stringify(response.data);
      }
    } catch (err) {
      console.warn(`[Scraper-Bypass] Error en ScrapingBee para ${cleanUrl}:`, err.message);
    }
  }
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (firecrawlKey) {
    try {
      console.log(`[Scraper-Bypass] Intentando extraer con Firecrawl: ${cleanUrl}`);
      const response = await axios6.post("https://api.firecrawl.dev/v1/scrape", {
        url: cleanUrl,
        formats: ["markdown"]
      }, {
        headers: {
          "Authorization": `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json"
        },
        timeout: 2e4
      });
      if (response.status === 200 && response.data && response.data.data && response.data.data.markdown) {
        return response.data.data.markdown;
      }
    } catch (err) {
      console.warn(`[Scraper-Bypass] Error en Firecrawl para ${cleanUrl}:`, err.message);
    }
  }
  try {
    console.log(`[Scraper-Bypass] Usando Jina Reader como fallback para: ${cleanUrl}`);
    const jinaUrl = `https://r.jina.ai/${encodeURIComponent(cleanUrl)}`;
    const response = await axios6.get(jinaUrl, {
      timeout: 1e4,
      headers: {
        "Accept": "text/plain",
        "X-Return-Format": "markdown"
      }
    });
    if (response.status === 200 && response.data) {
      return typeof response.data === "string" ? response.data : JSON.stringify(response.data);
    }
  } catch (error) {
    console.warn(`[Scraper-Bypass] Fall\xF3 el fallback de Jina Reader para ${cleanUrl}:`, error.message);
  }
  return "";
}
async function processWhatsAppMessage(text2, userId, userName, hasMedia = false, scrapedData = [], audioUrl, imageBuffer, isGroup = false, pdfBuffer, pdfMimeType, groupJid, groupName) {
  try {
    const rawPhone = userId.split("@")[0];
    const realName = await resolveRealName(userId, userName);
    const alreadyGreeted = await checkAlreadyGreeted(userId);
    const senderInfo = analyzeSender(realName, userId, alreadyGreeted);
    const n = extractFirstName(realName) || "colega";
    const session = await getPendingSession(userId);
    if (session) {
      const combinedText = session.messageToProcess + " \n[COMPLEMENTO]: " + text2;
      await deletePendingSession(userId);
      console.log(`[JanIA-PendingSession] Resolviendo sesi\xF3n pendiente para ${userId}. Combinando textos y re-procesando...`);
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
    let messageToProcess = text2;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text2.match(urlRegex);
    let jinaExtractedText = "";
    if (urls && urls.length > 0) {
      for (const url of urls) {
        const content = await scrapeUrlWithBypass(url);
        if (content) {
          jinaExtractedText += `

[CONTENIDO DE ENLACE WEB EXTRA\xCDDO DE ${url}]:
${content.substring(0, 15e3)}
[FIN CONTENIDO ENLACE]
`;
        }
      }
    }
    if (jinaExtractedText) {
      messageToProcess += jinaExtractedText;
    }
    let isFromAudio = false;
    const cleanText = text2.toLowerCase().trim();
    const isMediaOrAudio = hasMedia || !!audioUrl || !!imageBuffer || !!pdfBuffer;
    if (!isMediaOrAudio && cleanText.length > 15) {
      const onTopicKeywords = [
        "apto",
        "apartamento",
        "casa",
        "lote",
        "finca",
        "bodega",
        "oficina",
        "local",
        "inmueble",
        "propiedad",
        "predio",
        "terreno",
        "proyecto",
        "arriendo",
        "alquiler",
        "vendo",
        "venta",
        "compro",
        "compra",
        "busco",
        "ofrezco",
        "necesito",
        "permuto",
        "venpermuto",
        "estrato",
        "m2",
        "metros",
        "habitacion",
        "habitaci\xF3n",
        "ba\xF1o",
        "ba\xF1os",
        "cocina",
        "garaje",
        "parqueadero",
        "canon",
        "administracion",
        "administraci\xF3n",
        "precio",
        "millones",
        "cop",
        "arrendar",
        "vender",
        "comprar",
        "bogota",
        "bogot\xE1",
        "medellin",
        "medell\xEDn",
        "cali",
        "barranquilla",
        "bucaramanga",
        "cartagena",
        "barrio",
        "sector",
        "zona",
        "calle",
        "carrera",
        "avenida",
        "contrato",
        "arrendamiento",
        "promesa",
        "escritura",
        "notaria",
        "notar\xEDa",
        "registro",
        "sucesi\xF3n",
        "sucesion",
        "herencia",
        "embargo",
        "saneamiento",
        "comision",
        "comisi\xF3n",
        "corretaje",
        "aval\xFAo",
        "avaluo",
        "jania",
        "vecy",
        "bot",
        "ayuda",
        "c\xF3mo",
        "como",
        "funciona",
        "publicar",
        "registrar",
        "match",
        "coincidencia",
        "contacto",
        "cuenta",
        "hola",
        "gracias",
        "saludo"
      ];
      const hasOnTopicKeyword = onTopicKeywords.some((keyword) => cleanText.includes(keyword));
      if (!hasOnTopicKeyword) {
        console.log(`[JanIA-OffTopic] Mensaje fuera de tema detectado para ${userId} en ${groupJid || "DM"}: "${text2.substring(0, 50)}...".`);
        let staticText = "";
        if (isGroup || groupJid) {
          const jid = groupJid || "";
          let groupRulesName = "el grupo";
          let acceptedTopics = "publicar y buscar propiedades para hacer matching comercial de inmuebles y requerimientos";
          if (jid === "120363417740040773@g.us") {
            groupRulesName = "VECY: SOPORTE LEGAL, TRIBUTARIO Y AVAL\xDAOS";
            acceptedTopics = "consultas jur\xEDdicas, contratos, arrendamientos, tributaci\xF3n y aval\xFAos de inmuebles";
          } else if (jid === "120363403507276533@g.us") {
            groupRulesName = "C\xEDrculo CERO \u{1F44C}";
            acceptedTopics = "temas de debate, soporte y sugerencias sobre el ecosistema VECY Network";
          } else {
            groupRulesName = "VECY INMUEBLES NETWORK";
            acceptedTopics = "publicaci\xF3n directa de ofertas (Inmuebles) y demandas (Requerimientos) comerciales";
          }
          staticText = `Hola @${rawPhone} \u{1F44B}\u{1F3FB}. Detect\xE9 que tu publicaci\xF3n trata sobre un tema que no corresponde al prop\xF3sito de este canal (fechas festivas, pol\xEDtica, religi\xF3n o contenido ajeno al corretaje).

Te recuerdo que en el grupo *${groupRulesName}* solo se admiten temas de: **${acceptedTopics}**.

Te solicito amablemente que elimines tu mensaje para mantener el orden del chat, y te invito a revisar y comprender las normas completas del grupo que se encuentran en su descripci\xF3n. \xA1Gracias por tu colaboraci\xF3n y cultura de red! \u{1F91D}\u{1F680}`;
        } else {
          staticText = `Hola ${realName || "colega"} \u{1F44B}\u{1F3FB}. Como asistente de VECY Network, estoy entrenada exclusivamente para ayudarte con temas de bienes ra\xEDces (buscar, publicar o cruzar inmuebles), asesor\xEDas legales de corretaje y arrendamientos, o el soporte de nuestra plataforma. \u{1F3E0}\u2728

Por favor, hazme una consulta que est\xE9 relacionada con estos temas. \xA1Con gusto te responder\xE9! \u{1F60A}`;
        }
        return {
          classification: "VIOLACION_DE_NORMAS",
          response: staticText,
          dmResponse: staticText,
          reactionEmoji: "\u274C"
        };
      }
    }
    if (audioUrl) {
      if (audioUrl.startsWith("mock-audio:")) {
        messageToProcess = audioUrl.replace("mock-audio:", "");
        isFromAudio = true;
      } else {
        console.log(`[JanIA] Transcribiendo nota de voz para ${userId}...`);
        const transcription = await transcribeAudio({ audioUrl });
        if (!("error" in transcription)) {
          messageToProcess = transcription.text;
          isFromAudio = true;
        }
      }
    }
    let contextText = `Mensaje de ${userName || userId}: ${messageToProcess}`;
    if (isFromAudio) {
      contextText += `
[SISTEMA - NOTA DE VOZ]: El usuario te envi\xF3 este mensaje como nota de voz (audio). Dado que te enviaron audio, es preferible y de alta importancia que respondas en audio ("wantsVoice": true) si tu respuesta es corta (saludos, confirmaciones, consultas breves, o respuestas de menos de 250 caracteres). **EXCEPCI\xD3N CR\xCDTICA**: Si el usuario te pide expl\xEDcitamente que le respondas por audio, nota de voz o de viva voz por cualquier raz\xF3n, debes omitir el l\xEDmite de longitud y responder obligatoriamente por audio ("wantsVoice": true y colocar toda tu respuesta en "voiceResponse" de forma limpia), a menos que sea un contrato extenso o tabla de datos que no se pueda leer de manera natural. Si la respuesta requiere explicaciones largas, tablas o minutas/contratos y el usuario NO pidi\xF3 expresamente que fuera audio, responde obligatoriamente por escrito ("wantsVoice": false).`;
    }
    if (scrapedData.length > 0) contextText += `
[SISTEMA - DATOS SCRAPED]: ${JSON.stringify(scrapedData)}`;
    if (imageBuffer) contextText += `
[SISTEMA: IMAGEN DETECTADA. Analiza la imagen con visi\xF3n OCR para extraer todos los datos del flyer o captura comercial.]`;
    if (pdfBuffer) contextText += `
[SISTEMA: DOCUMENTO PDF DETECTADO. Analiza el documento PDF adjunto con tus capacidades nativas para extraer todos los datos relevantes del predial, certificado de tradici\xF3n, o contrato.]`;
    let statsSummary = "";
    try {
      const db = await getDb();
      if (db) {
        const startOfToday = /* @__PURE__ */ new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const isRealProperty = or(isNotNull(properties.idUsuarioWhatsapp), isNotNull(properties.agentId));
        const [totalPropsResult] = await db.select({ count: sql2`count(*)` }).from(properties).where(isRealProperty);
        const [totalReqsResult] = await db.select({ count: sql2`count(*)` }).from(requirements);
        const [totalMatchesResult] = await db.select({ count: sql2`count(*)` }).from(propertyMatches);
        const [todayPropsResult] = await db.select({ count: sql2`count(*)` }).from(properties).where(and2(gte(properties.createdAt, startOfToday), isRealProperty));
        const [todayReqsResult] = await db.select({ count: sql2`count(*)` }).from(requirements).where(gte(requirements.createdAt, startOfToday));
        const [todayMatchesResult] = await db.select({ count: sql2`count(*)` }).from(propertyMatches).where(gte(propertyMatches.createdAt, startOfToday));
        const totalProps = totalPropsResult?.count || 0;
        const totalReqs = totalReqsResult?.count || 0;
        const totalMatches = totalMatchesResult?.count || 0;
        const todayProps = todayPropsResult?.count || 0;
        const todayReqs = todayReqsResult?.count || 0;
        const todayMatches = todayMatchesResult?.count || 0;
        statsSummary = `
[SISTEMA - ESTAD\xCDSTICAS REALES EN TIEMPO REAL VECY NETWORK]:
- Propiedades totales registradas en el sistema: ${totalProps} (Nuevas hoy: ${todayProps})
- Requerimientos/Demandas totales registradas: ${totalReqs} (Nuevos hoy: ${todayReqs})
- Matches/Coincidencias de negocio detectados totales: ${totalMatches} (Nuevos hoy: ${todayMatches})
[REGLA DE USO CR\xCDTICA]: \xDAnicamente menciona o utiliza estas estad\xEDsticas si el usuario te pregunta directamente por cifras del sistema, cantidades de propiedades o requerimientos, reportes de actividad, o c\xF3mo va el d\xEDa. Queda terminantemente PROHIBIDO incluirlas de forma espont\xE1nea en saludos, bienvenidas o respuestas ordinarias.`;
      }
    } catch (err) {
      console.error("[JanIA-Stats] Error consultando estad\xEDsticas en tiempo real:", err);
    }
    if (statsSummary) {
      contextText += statsSummary;
    }
    const firstName = extractFirstName(realName) || "colega";
    const bogotaTime = (/* @__PURE__ */ new Date()).toLocaleString("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hour12: false });
    const userGender = senderInfo.adj === "juiciosa" ? "Femenino" : senderInfo.adj === "juicioso" ? "Masculino" : "No Especificado";
    const outsideHours = isOutsideWorkingHours();
    const estadoOperacion = outsideHours ? "fuera_de_horario" : "en_horario";
    const greetingInstruction = `

[SISTEMA - METADATOS DEL MENSAJE (VARIABLES CR\xCDTICAS)]:
- {{hora}}: ${bogotaTime}
- {{canal}}: ${isGroup ? `Grupo WhatsApp - [${groupName || "Nombre Real del Grupo"}]` : "dm"}
- {{genero}}: ${userGender}
- {{es_nuevo_usuario}}: ${!alreadyGreeted ? "true" : "false"}
- {{estado_operacion}}: ${estadoOperacion}

[SISTEMA - INSTRUCCI\xD3N DE SALUDO Y COMPORTAMIENTO]:
- Ya has saludado al usuario hoy: ${alreadyGreeted ? "S\xCD" : "NO"}.
- Tipo de conversaci\xF3n actual: ${isGroup ? "GRUPO DE WHATSAPP" : "CHAT PRIVADO / DM"}.
- Primer nombre del usuario: "${firstName}".
- REGLAS CR\xCDTICAS DE RESPUESTA:
  * Si "Ya has saludado al usuario hoy" es S\xCD:
    - \xA1PROHIBIDO SALUDAR! No uses palabras como "Hola", "Buenas tardes", "Qu\xE9 gusto", "Bienvenido", ni variantes de saludo o bienvenida.
    - Si est\xE1s en un GRUPO DE WHATSAPP: Debes nombrar al usuario de manera natural y conversacional al inicio o dentro de tu respuesta (ej: "Mira ${firstName}, ...", "Te cuento, ${firstName}, que...", "Para complementar, ${firstName}, ...").
    - Si est\xE1s en CHAT PRIVADO / DM: Ve directamente al grano en tu respuesta sin ning\xFAn tipo de saludo. Tienes libertad de nombrar ocasionalmente al usuario de forma espor\xE1dica (con un 30% de probabilidad) para sonar humana y natural (ej: "Claro ${firstName}, ..." o "Entiendo ${firstName}, ..."), pero NUNCA uses frases de saludo.
  * Si "Ya has saludado al usuario hoy" es NO:
    - Debes saludar de manera muy cordial y natural, incluyendo su nombre "${firstName}" o dirigi\xE9ndote a \xE9l/ella como colega/aliado/a.`;
    contextText += greetingInstruction;
    if (!alreadyGreeted && outsideHours && !isGroup) {
      const saludo = getGreetingByTime();
      contextText += `
[INSTRUCCI\xD3N CR\xCDTICA DE PRESENTACI\xD3N FUERA DE HORARIO]:
Como esta es tu primera interacci\xF3n con este usuario el d\xEDa de hoy, y nos encontramos fuera de horario de oficina, debes presentarte de manera muy c\xE1lida y entusiasta al inicio de tu respuesta:
"\xA1${saludo}, *${n}*! \u{1F60A} Soy JanIA, la asistente virtual de Inteligencia Artificial de VECY, creada y entrenada por el equipo de desarrollo de VECY Bienes Ra\xEDces. Estoy aqu\xED para atenderte de forma personalizada, resolver tus inquietudes y ayudarte a registrar tus inmuebles o requerimientos de forma \xE1gil mientras nuestros asesores humanos regresan a su horario habitual de 8:00 am a 8:00 pm. \u{1F680}\u{1F91D} \xBFCu\xE9ntame en qu\xE9 puedo ayudarte en este momento?"
Redacta esta bienvenida integrada con tu respuesta a su pregunta, usando emojis alusivos de manera elocuente. Adem\xE1s, si la respuesta a su consulta es corta, establece "wantsVoice": true y coloca una versi\xF3n hablada muy amigable de esta bienvenida y su respuesta en "voiceResponse" (sin vi\xF1etas o asteriscos de negrita) para que el usuario reciba un audio de tu voz present\xE1ndote de forma humana.`;
    }
    const textLower = messageToProcess.toLowerCase();
    const isReplicationRequest = textLower.includes("replica") || textLower.includes("repite") || textLower.includes("lee este") || textLower.includes("lee esto") || textLower.includes("lee literalmente") || textLower.includes("di literalmente") || textLower.includes("reproduce");
    if (isReplicationRequest) {
      contextText += `
[INSTRUCCI\xD3N CR\xCDTICA DE REPLICACI\xD3N LITERAL DE AUDIO]: El usuario te est\xE1 pidiendo de manera expl\xEDcita que repliques, repitas o leas un texto o p\xE1rrafo espec\xEDfico en una nota de voz/audio.
Por lo tanto, DEBES hacer lo siguiente:
1. Establece obligatoriamente "wantsVoice": true.
2. En el campo "voiceResponse", coloca EXACTAMENTE el texto o p\xE1rrafo literal que el usuario te solicit\xF3 que leyeras, eliminando emojis y markdown (como asteriscos o negritas) para que el sintetizador de voz lo lea de forma fluida y natural, sin deletrear. Por ejemplo, si te dice "replica esto: COMPROMISO DE HONOR VECY", el campo "voiceResponse" debe contener el texto de ese compromiso literalmente.
3. En el campo "response", coloca tambi\xE9n el texto literal con su formato y emojis correspondientes.
4. NUNCA respondas con confirmaciones conversacionales como "\xA1Entendido, colega! He procesado el comunicado...", ni agregues discursos tuyos. Tu respuesta "response" y "voiceResponse" debe ser \xFAnicamente el texto que te pidieron leer de forma exacta y literal.`;
    }
    const isValuationQuery = textLower.includes("valuar") || textLower.includes("avaluo") || textLower.includes("aval\xFAo") || textLower.includes("cuanto vale") || textLower.includes("cu\xE1nto vale") || textLower.includes("valor metro cuadrado") || textLower.includes("valor m2") || textLower.includes("precio metro cuadrado") || textLower.includes("precio m2") || textLower.includes("cuanto puedo cobrar") || textLower.includes("cu\xE1nto puedo cobrar") || textLower.includes("en que valor") || textLower.includes("en qu\xE9 valor") || textLower.includes("estimar precio");
    const isLegalQuery = textLower.includes("sucesi\xF3n") || textLower.includes("sucesion") || textLower.includes("herencia") || textLower.includes("divorcio") || textLower.includes("embargo") || textLower.includes("saneamiento") || textLower.includes("compraventa") || textLower.includes("arrendamiento") || textLower.includes("ley 820") || textLower.includes("ley 675") || textLower.includes("corretaje") || textLower.includes("comision") || textLower.includes("comisi\xF3n") || textLower.includes("no me pago") || textLower.includes("no me pag\xF3") || textLower.includes("robo de comision") || textLower.includes("robo de comisi\xF3n") || textLower.includes("disputa") || textLower.includes("notar\xEDa") || textLower.includes("notaria");
    const enableSearch = isValuationQuery || isLegalQuery;
    const history = await getRecentChatHistory(userId, 20);
    const liveStats = await getLiveStats();
    const systemContent = liveStats ? `${buildSystemPrompt(groupJid)}

${liveStats}` : buildSystemPrompt(groupJid);
    const llmMessages = [
      { role: "system", content: systemContent }
    ];
    if (history.length > 0) {
      if (history[history.length - 1].role === "user" && history[history.length - 1].content.trim() === contextText.trim()) {
        history.pop();
      }
      llmMessages.push(...history);
    }
    llmMessages.push({ role: "user", content: contextText });
    const response = await invokeLLM({
      messages: llmMessages,
      responseFormat: { type: "json_object" },
      imageBuffer,
      pdfBuffer,
      pdfMimeType,
      enableSearch
    });
    const llmRes = response;
    if (!llmRes || !llmRes.choices || !llmRes.choices[0]) throw new Error("Fallo de comunicaci\xF3n con el LLM");
    let result;
    const rawContent = llmRes.choices[0].message.content;
    try {
      result = parseSafeJSON(rawContent);
    } catch (parseErr) {
      console.error("[JanIA-Parser-Error] Error al deserializar JSON de JanIA:", parseErr.message);
      console.error("[JanIA-Parser-Error] Contenido crudo que fall\xF3:", rawContent);
      if (rawContent && rawContent.trim() !== "") {
        result = {
          classification: "CONSULTA_GENERAL",
          response: rawContent.replace(/[\{\}\[\]"]/g, "").trim() || "Lo siento, en este momento tengo un problema de formato interno.",
          mentions: []
        };
      } else {
        throw parseErr;
      }
    }
    result.mentions = result.mentions || [];
    if (result.classification === "INMUEBLE" && messageToProcess) {
      const cleanText2 = messageToProcess.toLowerCase();
      const indicatesRequirement = cleanText2.includes("busco") || cleanText2.includes("necesito") || cleanText2.includes("requiero") || cleanText2.includes("buscamos") || cleanText2.includes("compro") || cleanText2.includes("compra") || cleanText2.includes("para cliente") || cleanText2.includes("para un cliente") || cleanText2.includes("para una cliente");
      const indicatesProperty = cleanText2.includes("vendo") || cleanText2.includes("ofrezco") || cleanText2.includes("tengo") || cleanText2.includes("rento") || cleanText2.includes("alquilo") || cleanText2.includes("alquiler") || cleanText2.includes("venta") || cleanText2.includes("arriendo apartamento") || cleanText2.includes("arriendo casa");
      if (indicatesRequirement && !indicatesProperty) {
        console.log("[JANIA-CORRECTION] Cambiando clasificaci\xF3n de INMUEBLE a REQUERIMIENTO basado en heur\xEDstica de texto.");
        result.classification = "REQUERIMIENTO";
      }
    }
    const extracted = result.extractedData;
    const isRequirement = result.classification === "REQUERIMIENTO";
    const isProperty = result.classification === "INMUEBLE";
    let isLLMIncomplete = result.classification === "DATOS_INCOMPLETOS";
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
      const zone = isReq ? extracted?.zonaDeseada || extracted?.zone : extracted?.zone;
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
      const isMissing = hasMissingCity || hasMissingZone || hasMissingPrice || hasMissingArea || hasMissingBedrooms || hasMissingBathrooms || hasMissingStratum;
      if (isMissing) {
        result.missingFields = [];
        if (hasMissingCity) result.missingFields.push("city");
        if (hasMissingZone) result.missingFields.push("zone");
        if (hasMissingPrice) result.missingFields.push("price");
        if (hasMissingArea) result.missingFields.push("area");
        if (hasMissingBedrooms) result.missingFields.push("bedrooms");
        if (hasMissingBathrooms) result.missingFields.push("bathrooms");
        if (hasMissingStratum) result.missingFields.push("stratum");
        isLLMIncomplete = true;
        result.classification = "DATOS_INCOMPLETOS";
      }
    }
    if (isLLMIncomplete) {
      const inferredType = messageToProcess.toLowerCase().includes("vendo") || messageToProcess.toLowerCase().includes("ofrezco") || messageToProcess.toLowerCase().includes("arriendo") || !!extracted?.propertyType ? "PROPERTY" : "REQUIREMENT";
      const firstName2 = extractFirstName(realName) || "colega";
      const saludo = getGreetingByTime();
      const customIntro = `\xA1${saludo}, *${firstName2}*! \u{1F60A} `;
      result.dmResponse = buildIncompleteDataMessage(
        messageToProcess,
        hasMedia,
        scrapedData,
        imageBuffer,
        pdfBuffer,
        extracted,
        false,
        customIntro,
        firstName2
      );
      if (isGroup) {
        result.response = buildGroupIncompleteMessage(messageToProcess, userId, extracted);
        result.shouldSendDM = false;
      } else {
        result.shouldSendDM = true;
        result.dmShouldReply = true;
        result.response = "";
      }
      await setPendingSession(userId, {
        type: inferredType,
        extractedData: extracted || {},
        senderInfo,
        messageToProcess,
        imageBuffer
      });
      return result;
    }
    if (isProperty || isRequirement) {
      const zoneToValidate = isProperty ? extracted?.zone : extracted?.zonaDeseada || extracted?.zone;
      let isValidGeo = false;
      let geoValidation = null;
      if (zoneToValidate && zoneToValidate.trim() !== "") {
        geoValidation = await validarZona(zoneToValidate, extracted?.city || extracted?.ciudadDeseada, messageToProcess);
        isValidGeo = geoValidation.isValid;
      }
      if (!isValidGeo) {
        if (isGroup || groupJid) {
          isValidGeo = true;
          if (!result.missingFields) result.missingFields = [];
          if (!result.missingFields.includes("zone")) result.missingFields.push("zone");
        } else {
          result.classification = "DATOS_INCOMPLETOS";
          result.shouldSendDM = true;
          result.dmShouldReply = true;
          result.response = "";
          const inferredType = isProperty ? "PROPERTY" : "REQUIREMENT";
          const firstName2 = extractFirstName(realName) || "colega";
          const saludo = getGreetingByTime();
          const customIntro = `\xA1${saludo}, *${firstName2}*! \u{1F60A} `;
          result.dmResponse = buildIncompleteDataMessage(
            messageToProcess,
            hasMedia,
            scrapedData,
            imageBuffer,
            pdfBuffer,
            extracted,
            true,
            customIntro,
            firstName2
          );
          await setPendingSession(userId, {
            type: inferredType,
            extractedData: extracted || {},
            senderInfo,
            messageToProcess,
            imageBuffer
          });
          return result;
        }
      }
      const validation = geoValidation;
      if (validation) {
        if (isProperty && validation.isValid) {
          extracted.latitude = validation.latitude || null;
          extracted.longitude = validation.longitude || null;
        }
        if (validation.isMunicipio) {
          if (isProperty) {
            extracted.city = validation.barrioCanonico;
            extracted.addressCity = validation.barrioCanonico;
            extracted.addressLocality = validation.localidad;
            if (extracted.zone && normalizarTextoGeografico(extracted.zone) !== normalizarTextoGeografico(validation.barrioCanonico || "")) {
            } else {
              extracted.zone = validation.barrioCanonico;
            }
          } else {
            extracted.ciudadDeseada = validation.barrioCanonico;
            extracted.addressCity = validation.barrioCanonico;
            extracted.addressLocality = validation.localidad;
            if (extracted.zonaDeseada && normalizarTextoGeografico(extracted.zonaDeseada) !== normalizarTextoGeografico(validation.barrioCanonico || "")) {
            } else {
              extracted.zonaDeseada = validation.barrioCanonico;
            }
          }
        } else {
          if (isProperty) {
            extracted.city = "Bogot\xE1";
            extracted.addressCity = "Bogot\xE1";
            extracted.zone = validation.barrioCanonico;
            extracted.addressLocality = validation.localidad;
          } else {
            extracted.ciudadDeseada = "Bogot\xE1";
            extracted.addressCity = "Bogot\xE1";
            extracted.zonaDeseada = validation.barrioCanonico;
            extracted.addressLocality = validation.localidad;
          }
        }
      }
    }
    const origenTipo = isGroup || groupJid ? "grupo" : "contacto_directo";
    const origenId = isGroup || groupJid ? groupJid || userId : userId;
    const origenNombre = isGroup || groupJid ? groupName || "Grupo WhatsApp" : userName || realName || "Contacto Directo";
    if (isProperty) {
      const propertyTitle = extracted.title || `${capitalize(extracted.propertyType || "inmueble")} en ${extracted.zone || "Bogot\xE1"} para ${extracted.transactionType || "venta"}`;
      const saved = await saveProperty({
        ...extracted,
        name: propertyTitle,
        price: String(extracted.price || 0),
        areaTotal: String(extracted.area || 0),
        idUsuarioWhatsapp: rawPhone,
        rawText: messageToProcess,
        amenities: { gives: extracted.gives, wants: extracted.wants, isCollaborativePool: extracted.isCollaborativePool },
        origenTipo,
        origenId,
        origenNombre,
        fechaExtraccion: /* @__PURE__ */ new Date()
      }, userId, realName, imageBuffer);
      if (saved) {
        result.inserted = true;
        result.shouldSendDM = false;
        result.dmResponse = "";
        result.response = "";
        result.mentions = [];
        result.extraDMs = [];
        result.sendReputationHook = false;
        const { executeMatchEngine: executeMatchEngine2 } = await Promise.resolve().then(() => (init_matching(), matching_exports));
        executeMatchEngine2(saved.id, null).catch((err) => console.error("Error executing match engine:", err));
      }
    } else if (isRequirement) {
      const reqTitle = extracted.title || `Requerimiento de ${extracted.propertyType || "inmueble"} en ${extracted.zonaDeseada || extracted.zone || "Bogot\xE1"} para ${extracted.transactionType || "venta"}`;
      const saved = await saveRequirement({
        ...extracted,
        name: reqTitle,
        tipoInmuebleDeseado: extracted.propertyType,
        tipoNegocioDeseado: extracted.transactionType,
        zonaDeseada: extracted.zonaDeseada || extracted.zone,
        presupuestoMax: String(extracted.price || 0),
        idUsuarioWhatsapp: rawPhone,
        rawText: messageToProcess,
        caracteristicasDeseadas: { gives: extracted.gives, wants: extracted.wants },
        origenTipo,
        origenId,
        origenNombre,
        fechaExtraccion: /* @__PURE__ */ new Date()
      }, userId, realName);
      if (saved) {
        result.inserted = true;
        result.shouldSendDM = false;
        result.dmResponse = "";
        result.response = "";
        result.mentions = [];
        result.extraDMs = [];
        result.sendReputationHook = false;
        const { executeMatchEngine: executeMatchEngine2 } = await Promise.resolve().then(() => (init_matching(), matching_exports));
        executeMatchEngine2(null, saved.id).catch((err) => console.error("Error executing match engine:", err));
      }
    }
    const isConsultation = result.classification === "CONSULTA_GENERAL" || result.classification === "RESPUESTA_A_PREGUNTA_IA" || result.classification === "ANALISIS_DE_MERCADO";
    const isMainPropertiesGroup = !groupJid || groupJid === "120363260108880069@g.us";
    if (isGroup && isConsultation && isMainPropertiesGroup) {
      const textLower2 = messageToProcess.toLowerCase();
      const isAboutPublishing = textLower2.includes("subir") || textLower2.includes("c\xF3mo subo") || textLower2.includes("como subo") || textLower2.includes("publicar") || textLower2.includes("c\xF3mo publico") || textLower2.includes("como publico") || textLower2.includes("c\xF3mo se publica") || textLower2.includes("como se publica") || textLower2.includes("c\xF3mo registrar") || textLower2.includes("como registrar") || textLower2.includes("c\xF3mo funciona") || textLower2.includes("como funciona") || textLower2.includes("de qu\xE9 consiste") || textLower2.includes("de que consiste") || textLower2.includes("en qu\xE9 consiste") || textLower2.includes("en que consiste") || textLower2.includes("c\xF3mo hago para") || textLower2.includes("como hago para") || textLower2.includes("c\xF3mo buscar") || textLower2.includes("como buscar") || textLower2.includes("c\xF3mo encontrar") || textLower2.includes("como encontrar") || textLower2.includes("instrucciones") || textLower2.includes("ayuda") || textLower2.includes("explicar") || textLower2.includes("explicame") || textLower2.includes("expl\xEDcame");
      const isAboutVecy = textLower2.includes("vecy") || textLower2.includes("proyecto") || textLower2.includes("quien creo") || textLower2.includes("qui\xE9n cre\xF3") || textLower2.includes("creadores") || textLower2.includes("quien es jania") || textLower2.includes("qui\xE9n es jania") || textLower2.includes("circulo cero") || textLower2.includes("c\xEDrculo cero") || textLower2.includes("ubicapp") || textLower2.includes("samboni") || textLower2.includes("competidor") || textLower2.includes("competencia");
      const greetingPrefix = await getTimeOfDayGreetingForUser(rawPhone, realName, alreadyGreeted, isGroup);
      let welcomePart = "";
      if (!alreadyGreeted) {
        welcomePart = ` \xA1Te doy la m\xE1s cordial bienvenida a nuestra comunidad! \u{1F91D}\u2728`;
      }
      if (isAboutPublishing) {
        result.response = `\u{1F4E2} *\xBFC\xD3MO PUBLICAR EN VECY NETWORK?* \u{1F4E2}

${greetingPrefix},${welcomePart} es muy sencillo y totalmente gratuito. Puedes publicar tus *ofertas* (venta/arriendo) o *requerimientos* (b\xFAsquedas) directamente aqu\xED en el grupo de las siguientes formas:

\u270D\uFE0F *Texto*: Env\xEDa una descripci\xF3n con la ubicaci\xF3n (Ciudad y Barrio), precio y ficha t\xE9cnica (\xE1rea, habitaciones, ba\xF1os, parqueaderos y estrato).
\u{1F517} *Enlaces/Links*: Comparte enlaces de portales inmobiliarios permitidos o de tu propia web (Wasi, Fincaraiz, Metrocuadrado, Ciencuadras, Habi, etc.) y extraer\xE9 los datos autom\xE1ticamente.
\u{1F4C4} *PDF*: Sube la ficha t\xE9cnica de la propiedad en formato PDF.
\u{1F399}\uFE0F *Nota de Voz*: Graba un audio dictando los datos del inmueble.
\u{1F5BC}\uFE0F *Flyer/Captura*: Comparte una imagen o flyer que contenga los detalles comerciales en el texto.

*\xBFC\xF3mo funciona?*
1\uFE0F\u20E3 Al publicar, mi sistema registrar\xE1 la propiedad e iniciar\xE1 una b\xFAsqueda de coincidencias (matches) autom\xE1ticamente a nivel nacional.
2\uFE0F\u20E3 Si encuentro un MATCH, te notificar\xE9 y te enviar\xE9 un mensaje por *chat privado (DM)* solicitando tu confirmaci\xF3n.
3\uFE0F\u20E3 Si ambos aliados confirman inter\xE9s en privado, les entregar\xE9 sus contactos directos para que cierren el negocio. \u{1F91D}\u{1F680}

Si tienes dudas o prefieres usar mi men\xFA de soporte y b\xFAsqueda de propiedades privado, escr\xEDbeme directamente al enlace:
\u{1F449} https://wa.me/573185462265`;
        result.classification = "CONSULTA_GENERAL";
      } else if (isAboutVecy) {
        const isCompetitorQuery = textLower2.includes("ubicapp") || textLower2.includes("samboni") || textLower2.includes("competidor") || textLower2.includes("competencia");
        if (isCompetitorQuery) {
          result.response = `\u{1F44C} *C\xCDRCULO CERO \u2014 DEBATE Y COMUNIDAD* \u{1F44C}

${greetingPrefix}, detect\xE9 una menci\xF3n a plataformas competidoras o comparativas de servicios. Para mantener este canal enfocado exclusivamente en ofertas y requerimientos, te invito a plantear tus preguntas, comparar beneficios o participar en el debate en nuestro canal oficial **C\xEDrculo CERO \u{1F44C}**:
\u{1F449} https://chat.whatsapp.com/CSzrKR6Cr56HAieEhAuqyU

\xA1All\xED debatimos abiertamente con total transparencia y profesionalismo! \u{1F91D}\u2728`;
        } else {
          result.response = `\u{1F44C} *C\xCDRCULO CERO \u2014 CONEXI\xD3N VECY* \u{1F44C}

${greetingPrefix}, veo que tienes dudas o quieres saber m\xE1s sobre el proyecto VECY Network, beneficios, creadores o el plan colaborativo. Te invito a unirte y hacer tus preguntas en nuestro canal oficial **C\xEDrculo CERO \u{1F44C}**:
\u{1F449} https://chat.whatsapp.com/CSzrKR6Cr56HAieEhAuqyU

\xA1Es el espacio ideal para resolver todas tus inquietudes de la comunidad! \u{1F91D}\u2728`;
        }
      } else {
        result.response = `\u{1F4A1} *VECY: SOPORTE LEGAL, CONTRATOS Y AVAL\xDAOS* \u{1F4A1}

${greetingPrefix}, veo que tienes una consulta jur\xEDdica, procedimental o de aval\xFAo. Para darte una respuesta detallada con mis motores legales y de mercado sin saturar este canal de ofertas y requerimientos, te invito a realizar tu pregunta en nuestro grupo especializado **VECY: SOPORTE LEGAL, CONTRATOS Y AVAL\xDAOS**:
\u{1F449} https://chat.whatsapp.com/J4u1h7NUL1i1B1wAIyTUN6

\xA1All\xED te responder\xE9 al instante con toda la informaci\xF3n! \u{1F680}\u{1F3AF}`;
        result.classification = "CONSULTA_GENERAL";
      }
    }
    if (result && result.response) {
      result.response = sanitizeResponseMarkdown(result.response);
    }
    if (result && result.dmResponse) {
      result.dmResponse = sanitizeResponseMarkdown(result.dmResponse);
    }
    return result;
  } catch (error) {
    console.error("Error en JanIA v11.70:", error);
    return { classification: "CONSULTA_GENERAL", response: "", mentions: [] };
  }
}
function isGenericName(n) {
  if (!n) return true;
  const lower = n.toLowerCase().trim();
  return lower.startsWith("asesor +") || lower === "asesor" || lower === "nuevo asesor" || lower === "colega" || lower === "";
}
async function findOrCreateUserByPhone(phone, realName) {
  const db = await getDb();
  if (!db) return null;
  const cleanPhone = phone.split(":")[0];
  let user = await db.select().from(users).where(eq3(users.phone, cleanPhone)).limit(1).then((r) => r[0]);
  if (!user) {
    user = await db.select().from(users).where(eq3(users.openId, `wa-${cleanPhone}`)).limit(1).then((r) => r[0]);
  }
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
    } catch (insertErr) {
      if (insertErr.code === "23505" || String(insertErr).includes("unique constraint")) {
        console.log(`[JanIA-findOrCreateUserByPhone] Colisi\xF3n concurrente detectada para ${cleanPhone}. Re-buscando usuario...`);
        user = await db.select().from(users).where(eq3(users.openId, openId)).limit(1).then((r) => r[0]);
      } else {
        throw insertErr;
      }
    }
  } else {
    if (realName && !isGenericName(realName) && isGenericName(user.name)) {
      console.log(`[JanIA-findOrCreateUserByPhone] Actualizando nombre de usuario para ID ${user.id} a ${realName}`);
      const [updatedUser] = await db.update(users).set({ name: realName }).where(eq3(users.id, user.id)).returning();
      user = updatedUser;
    }
  }
  return user;
}
function sanitizePropertyType(type) {
  if (!type) return "apartment";
  const t2 = type.toLowerCase().trim();
  if (t2 === "apartment" || t2 === "apartamento" || t2 === "apto" || t2.includes("apartaestudio") || t2.includes("penthouse") || t2 === "loft") return "apartment";
  if (t2 === "house" || t2 === "casa" || t2.includes("chalet") || t2.includes("caba\xF1a") || t2.includes("cabana") || t2.includes("quinta") || t2.includes("campestre")) return "house";
  if (t2 === "building" || t2 === "edificio") return "building";
  if (t2 === "warehouse" || t2 === "bodega") return "warehouse";
  if (t2 === "farm" || t2 === "finca") return "farm";
  if (t2 === "hotel" || t2.includes("hostal") || t2.includes("hospedaje") || t2.includes("motel") || t2.includes("hostel")) return "hotel";
  if (t2 === "office" || t2 === "oficina") return "office";
  if (t2 === "land" || t2 === "lote" || t2 === "terreno") return "land";
  if (t2 === "commercial" || t2 === "local" || t2 === "comercial") return "commercial";
  if (t2 === "loft") return "loft";
  if (t2 === "consultorio" || t2 === "office_medical") return "consultorio";
  return "apartment";
}
function sanitizeTransactionType(type) {
  if (!type) return "venta";
  const t2 = type.toLowerCase().trim();
  if (t2 === "venta" || t2 === "vender" || t2 === "compra" || t2 === "comprar") return "venta";
  if (t2 === "arriendo" || t2 === "alquiler" || t2 === "renta" || t2 === "rentar" || t2 === "arrendar") return "arriendo";
  if (t2 === "arriendo_temporal" || t2 === "temporal" || t2 === "vacacional" || t2 === "vacaciones") return "arriendo_temporal";
  if (t2 === "permuta" || t2 === "permuto" || t2 === "venpermuto" || t2 === "cambio" || t2.includes("permuta")) return "permuta";
  if (t2 === "aporte" || t2.includes("aporte") || t2 === "proyecto") return "aporte";
  return "venta";
}
function sanitizeTransactionTypes(raw) {
  const input = Array.isArray(raw) ? raw.join(" ") : raw || "";
  const n = input.toLowerCase();
  const result = [];
  if (n.includes("venta") || n.includes("vender") || n.includes("compra") || n.includes("comprar")) result.push("venta");
  if (n.includes("arriendo") || n.includes("alquiler") || n.includes("renta") || n.includes("rentar")) result.push("arriendo");
  if (n.includes("temporal") || n.includes("vacacional") || n.includes("vacaciones")) result.push("arriendo_temporal");
  if (n.includes("permuta") || n.includes("permuto") || n.includes("venpermuto") || n.includes("recibo propiedad") || n.includes("recibo vehiculo") || n.includes("parte de pago") || n.includes("cambio de inmueble")) result.push("permuta");
  if (n.includes("aporte") || n.includes("participo en proyecto") || n.includes("constructora") || n.includes("unidades a cambio") || n.includes("utilidades")) result.push("aporte");
  return result.length > 0 ? result : [sanitizeTransactionType(input)];
}
function sanitizeCurrency(curr) {
  if (!curr) return "COP";
  const c = curr.toUpperCase().trim();
  if (c === "USD" || c === "DOLARES" || c === "DOLAR") return "USD";
  return "COP";
}
function safeSlice(val, limit) {
  if (val === void 0 || val === null) return void 0;
  return String(val).slice(0, limit);
}
async function saveProperty(data, userId, realName, imageBuffer) {
  const db = await getDb();
  if (!db) return null;
  const rawPhone = userId.split(":")[0].split("@")[0];
  const user = await findOrCreateUserByPhone(rawPhone, realName);
  let imageUrl;
  if (imageBuffer) {
    try {
      console.log(`[JanIA-SaveProperty] Subiendo imagen flyer de WhatsApp para ${realName}...`);
      const buffer = Buffer.from(imageBuffer, "base64");
      const filename = `properties/whatsapp/wa_${Date.now()}_${rawPhone}.jpg`;
      const uploadResult = await storagePut(filename, buffer, "image/jpeg");
      imageUrl = uploadResult.url;
      console.log(`[JanIA-SaveProperty] Imagen subida exitosamente: ${imageUrl}`);
    } catch (err) {
      console.error("[JanIA-SaveProperty] Error subiendo imagen:", err);
    }
  }
  const finalImages = data.images && Array.isArray(data.images) ? [...data.images] : [];
  if (imageUrl) {
    finalImages.push(imageUrl);
  }
  const amenitiesObj = {
    gives: data.gives || data.amenities?.gives,
    wants: data.wants || data.amenities?.wants,
    isCollaborativePool: data.isCollaborativePool !== void 0 ? data.isCollaborativePool : data.amenities?.isCollaborativePool,
    interiorExterior: data.interiorExterior || data.amenities?.interiorExterior,
    cuartoBanoServicio: data.cuartoBanoServicio || data.amenities?.cuartoBanoServicio,
    cocina: data.cocina || data.amenities?.cocina,
    lavanderiaIndependiente: data.lavanderiaIndependiente || data.amenities?.lavanderiaIndependiente,
    tipoPisos: data.tipoPisos || data.amenities?.tipoPisos,
    depositos: data.depositos || data.amenities?.depositos,
    comisiones: data.comisiones || data.amenities?.comisiones,
    antiguedad: data.antiguedad || data.amenities?.antiguedad
  };
  const insertData = {
    ...data,
    name: safeSlice(data.name || `Propiedad en ${data.city || "Bogot\xE1"}`, 255) || "Propiedad",
    city: safeSlice(data.city || data.ciudadDeseada || "Bogot\xE1", 100) || "Bogot\xE1",
    zone: safeSlice(data.zone || "Bogot\xE1", 100) || "Bogot\xE1",
    addressCity: safeSlice(data.addressCity || data.address_city, 100) || null,
    addressLocality: safeSlice(data.addressLocality || data.address_locality, 100) || null,
    addressNeighborhood: safeSlice(data.addressNeighborhood || data.address_neighborhood, 150) || null,
    location: safeSlice(data.location, 255) || null,
    matriculaInmobiliaria: safeSlice(data.matriculaInmobiliaria, 100) || null,
    idUsuarioWhatsapp: safeSlice(data.idUsuarioWhatsapp || rawPhone, 100) || null,
    propertyType: sanitizePropertyType(data.propertyType),
    transactionType: sanitizeTransactionType(data.transactionType),
    acceptedTransactionTypes: sanitizeTransactionTypes(data.transactionTypes || data.transactionType),
    currency: sanitizeCurrency(data.currency),
    // Mapear explícitamente los campos para mayor robustez
    price: data.price !== void 0 && data.price !== null ? String(data.price) : null,
    areaTotal: data.areaTotal !== void 0 && data.areaTotal !== null ? String(data.areaTotal) : data.area !== void 0 && data.area !== null ? String(data.area) : null,
    bedrooms: data.bedrooms !== void 0 && data.bedrooms !== null ? Math.round(Number(data.bedrooms)) : null,
    bathrooms: data.bathrooms !== void 0 && data.bathrooms !== null ? Math.round(Number(data.bathrooms)) : null,
    garages: data.garages !== void 0 && data.garages !== null ? Math.round(Number(data.garages)) : null,
    stratum: data.stratum !== void 0 && data.stratum !== null ? Math.round(Number(data.stratum)) : null,
    adminFee: data.adminFee !== void 0 && data.adminFee !== null ? String(data.adminFee) : null,
    agentId: user ? user.id : null,
    latitude: data.latitude !== void 0 && data.latitude !== null ? String(data.latitude) : null,
    longitude: data.longitude !== void 0 && data.longitude !== null ? String(data.longitude) : null,
    images: finalImages.length > 0 ? finalImages : null,
    amenities: amenitiesObj,
    origenTipo: data.origenTipo || null,
    origenId: data.origenId || null,
    origenNombre: data.origenNombre || null,
    fechaExtraccion: data.fechaExtraccion || /* @__PURE__ */ new Date()
  };
  const existing = await db.select().from(properties).where(
    and2(
      eq3(properties.idUsuarioWhatsapp, rawPhone),
      eq3(properties.propertyType, insertData.propertyType),
      eq3(properties.transactionType, insertData.transactionType),
      eq3(properties.city, insertData.city),
      eq3(properties.zone, insertData.zone),
      eq3(properties.available, true)
    )
  ).limit(1);
  if (existing.length > 0) {
    const [updated] = await db.update(properties).set({
      ...insertData,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq3(properties.id, existing[0].id)).returning();
    console.log(`[Deduplication] Propiedad existente detectada. Actualizando datos (ID: ${updated.id})`);
    return updated;
  }
  const [result] = await db.insert(properties).values(insertData).returning();
  if (result && imageUrl) {
    try {
      await db.insert(propertyImages).values({
        propertyId: result.id,
        imageUrl,
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
async function saveRequirement(data, userId, realName) {
  const db = await getDb();
  if (!db) return null;
  const rawPhone = userId.split(":")[0].split("@")[0];
  const user = await findOrCreateUserByPhone(rawPhone, realName);
  const characteristicsObj = {
    gives: data.gives || data.caracteristicasDeseadas?.gives,
    wants: data.wants || data.caracteristicasDeseadas?.wants,
    interiorExterior: data.interiorExterior || data.caracteristicasDeseadas?.interiorExterior,
    cuartoBanoServicio: data.cuartoBanoServicio || data.caracteristicasDeseadas?.cuartoBanoServicio,
    cocina: data.cocina || data.caracteristicasDeseadas?.cocina,
    lavanderiaIndependiente: data.lavanderiaIndependiente || data.caracteristicasDeseadas?.lavanderiaIndependiente,
    tipoPisos: data.tipoPisos || data.caracteristicasDeseadas?.tipoPisos,
    depositos: data.depositos || data.caracteristicasDeseadas?.depositos,
    comisiones: data.comisiones || data.caracteristicasDeseadas?.comisiones,
    antiguedad: data.antiguedad || data.caracteristicasDeseadas?.antiguedad
  };
  const insertData = {
    ...data,
    name: safeSlice(data.name, 255) || null,
    ciudadDeseada: safeSlice(data.ciudadDeseada || data.city || "Bogot\xE1", 100) || "Bogot\xE1",
    zonaDeseada: safeSlice(data.zonaDeseada || data.zone, 100) || null,
    addressCity: safeSlice(data.addressCity || data.address_city, 100) || null,
    addressLocality: safeSlice(data.addressLocality || data.address_locality, 100) || null,
    addressNeighborhood: safeSlice(data.addressNeighborhood || data.address_neighborhood, 150) || null,
    idUsuarioWhatsapp: safeSlice(data.idUsuarioWhatsapp || rawPhone, 100) || null,
    tipoInmuebleDeseado: sanitizePropertyType(data.tipoInmuebleDeseado || data.propertyType),
    tipoNegocioDeseado: sanitizeTransactionType(data.tipoNegocioDeseado || data.transactionType),
    tiposNegocioAceptados: sanitizeTransactionTypes(data.transactionTypes || data.tipoNegocioDeseado || data.transactionType),
    monedaPresupuesto: sanitizeCurrency(data.monedaPresupuesto || data.currency),
    // Mapear campos desde el formato LLM/WhatsApp (data) a las columnas de la base de datos
    presupuestoMin: data.presupuestoMin !== void 0 && data.presupuestoMin !== null ? String(data.presupuestoMin) : null,
    presupuestoMax: data.presupuestoMax !== void 0 && data.presupuestoMax !== null ? String(data.presupuestoMax) : data.price !== void 0 && data.price !== null ? String(data.price) : null,
    areaMin: data.areaMin !== void 0 && data.areaMin !== null ? String(data.areaMin) : data.area !== void 0 && data.area !== null ? String(data.area) : null,
    habitacionesMin: data.habitacionesMin !== void 0 && data.habitacionesMin !== null ? Math.round(Number(data.habitacionesMin)) : data.bedrooms !== void 0 && data.bedrooms !== null ? Math.round(Number(data.bedrooms)) : null,
    banosMin: data.banosMin !== void 0 && data.banosMin !== null ? Math.round(Number(data.banosMin)) : data.bathrooms !== void 0 && data.bathrooms !== null ? Math.round(Number(data.bathrooms)) : null,
    parqueaderosMin: data.parqueaderosMin !== void 0 && data.parqueaderosMin !== null ? Math.round(Number(data.parqueaderosMin)) : data.garages !== void 0 && data.garages !== null ? Math.round(Number(data.garages)) : null,
    estratoDeseado: data.estratoDeseado || (data.stratum !== void 0 && data.stratum !== null ? [Math.round(Number(data.stratum))] : null),
    userId: user ? user.id : null,
    caracteristicasDeseadas: characteristicsObj,
    origenTipo: data.origenTipo || null,
    origenId: data.origenId || null,
    origenNombre: data.origenNombre || null,
    fechaExtraccion: data.fechaExtraccion || /* @__PURE__ */ new Date()
  };
  const existing = await db.select().from(requirements).where(
    and2(
      eq3(requirements.idUsuarioWhatsapp, rawPhone),
      eq3(requirements.tipoInmuebleDeseado, insertData.tipoInmuebleDeseado),
      eq3(requirements.tipoNegocioDeseado, insertData.tipoNegocioDeseado),
      eq3(requirements.ciudadDeseada, insertData.ciudadDeseada),
      eq3(requirements.zonaDeseada, insertData.zonaDeseada),
      eq3(requirements.status, "active")
    )
  ).limit(1);
  if (existing.length > 0) {
    const [updated] = await db.update(requirements).set({
      ...insertData,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq3(requirements.id, existing[0].id)).returning();
    console.log(`[Deduplication] Requerimiento existente detectado. Actualizando datos (ID: ${updated.id})`);
    return updated;
  }
  const [result] = await db.insert(requirements).values(insertData).returning();
  return result;
}
async function generateWelcomeMessage(count, chatId) {
  try {
    let groupDescription = "";
    if (chatId === "120363417740040773@g.us") {
      groupDescription = `el grupo de WhatsApp "VECY: SOPORTE LEGAL, CONTRATOS Y AVAL\xDAOS".
Direcci\xF3n obligatoria para redactar el saludo de bienvenida:
- Dales una muy c\xE1lida bienvenida y menci\xF3nales que este es el canal oficial para resolver dudas jur\xEDdicas, procedimentales, disputas de comisiones y temas de aval\xFAos.
- Expl\xEDcales de manera clara y directa las Pautas del Grupo en vi\xF1etas bien organizadas con emojis:
  * Qu\xE9 SE PUEDE hacer: Realizar consultas de soporte legal inmobiliario, subir archivos o contratos en PDF para revisi\xF3n del equipo, o enviar notas de voz detallando casos legales.
  * Qu\xE9 NO SE PUEDE hacer: Publicar listados de ofertas o requerimientos inmobiliarios (estos pertenecen \xFAnica y exclusivamente al grupo principal de inmuebles).
  * C\xF3mo hacerlo bien: Escribir sus consultas de forma detallada o enviar notas de voz claras para que yo (JanIA) y el equipo de abogados podamos asistirles r\xE1pidamente.`;
    } else if (chatId === "120363403507276533@g.us") {
      groupDescription = `el grupo de WhatsApp "C\xCDRCULO CERO \u{1F44C}" (nuestro canal oficial de debate y comunidad de aliados).
Direcci\xF3n obligatoria para redactar el saludo de bienvenida:
- Dales una muy c\xE1lida bienvenida a la mesa redonda de aliados.
- Expl\xEDcales de manera clara y directa las Pautas del Grupo en vi\xF1etas bien organizadas con emojis:
  * Qu\xE9 SE PUEDE hacer: Sugerir ideas de mejora tecnol\xF3gica para VECY, comentar novedades sobre el portal web privado, debatir de forma constructiva sobre el mercado inmobiliario en Colombia.
  * Qu\xE9 NO SE PUEDE hacer: Publicar listados de inmuebles ni realizar consultas jur\xEDdicas complejas (ya que para eso existen los otros grupos dedicados).
  * C\xF3mo hacerlo bien: Mantener un tono respetuoso, constructivo e interactuar con los otros aliados para fortalecer la comunidad.`;
    } else {
      groupDescription = `el grupo de WhatsApp principal "VECY INMUEBLES NETWORK" (nuestra red nacional de ofertas y requerimientos inmobiliarios).
Direcci\xF3n obligatoria para redactar el saludo de bienvenida:
- Dales una muy c\xE1lida bienvenida a la red y menci\xF3nales que ya estoy lista para cruzar sus ofertas y requerimientos en segundos sin comisiones.
- Expl\xEDcales de manera muy clara y directa las Pautas Obligatorias del Grupo para evitar advertencias o bloqueos en el sistema:
  * Qu\xE9 FORMATOS est\xE1n permitidos y c\xF3mo publicar correctamente:
    1. \u270D\uFE0F *Texto descriptivo completo*: Incluyendo los datos t\xE9cnicos indispensables (Ciudad, barrio, precio, \xE1rea en m\xB2, habitaciones, ba\xF1os, parqueaderos y estrato).
    2. \u{1F399}\uFE0F *Nota de Voz*: Grabando un audio corto (de unos 30-40 segundos) dictando las caracter\xEDsticas.
    3. \u{1F4C4} *Ficha t\xE9cnica en PDF*: Subiendo el archivo PDF de la propiedad.
    4. \u{1F5BC}\uFE0F *Flyer comercial*: Subiendo una imagen que tenga toda la informaci\xF3n t\xE9cnica escrita encima del dise\xF1o.
    5. \u{1F517} *Enlaces o Links p\xFAblicos*: Pegando enlaces de portales p\xFAblicos autorizados (como Metrocuadrado, Ciencuadras, Habi, Wasi, MercadoLibre, Fincaraiz, Curador o su propia web de dominio propio).
  * Lo que NO est\xE1 permitido y debes evitar para no recibir advertencias de JanIA:
    1. Enlaces a Redes Sociales (Facebook, Instagram, YouTube, TikTok, etc.).
    2. Publicaciones repetidas o duplicados de la misma propiedad de forma inmediata.
    3. Enviar m\xFAltiples publicaciones seguidas en menos de 5 minutos (l\xEDmite anti-spam de 5 minutos).
    4. Publicaciones incompletas (por ejemplo, sin precio o sin ciudad). JanIA les pondr\xE1 una advertencia de datos incompletos.
- Cierra con un tono motivador invit\xE1ndolos a publicar correctamente para que el sistema pueda encontrarles MATCH de inmediato y acelerar sus cierres.`;
    }
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "Eres JanIA, la asistente inteligente y experta de VECY Network. Hablas siempre en primera persona del singular, con un tono sumamente humano, profesional, elocuente y cercano."
        },
        {
          role: "user",
          content: `Han ingresado ${count} nuevos integrantes a ${groupDescription}. 
          Redacta el mensaje de bienvenida usando vi\xF1etas claras y emojis llamativos. Aseg\xFArate de que las reglas se lean organizadas, directas y f\xE1ciles de entender para que no cometan infracciones.`
        }
      ]
    });
    const llmRes = response;
    return llmRes.choices[0].message.content.trim();
  } catch (error) {
    if (chatId === "120363417740040773@g.us") {
      return `\u2728 *\xA1Bienvenidos al grupo VECY: SOPORTE LEGAL, CONTRATOS Y AVAL\xDAOS!* \u{1F44B}

Aqu\xED resolvemos sus dudas jur\xEDdicas, disputas de comisi\xF3n y aval\xFAos. Podr\xE1n subir PDFs o audios de sus casos.
\u26A0\uFE0F *Nota:* Por favor, eviten publicar inmuebles aqu\xED; esos van en el grupo principal. \xA1Estoy lista para responder! \u{1F680}\u2696\uFE0F`;
    } else if (chatId === "120363403507276533@g.us") {
      return `\u2728 *\xA1Bienvenidos a C\xCDRCULO CERO \u{1F44C}!* \u{1F44B}

Este es el canal de debate y comunidad para sugerir mejoras y charlar de VECY.
\u26A0\uFE0F *Nota:* Evitemos ofertas de inmuebles aqu\xED. \xA1Bienvenidos aliados! \u{1F680}\u{1F91D}`;
    }
    return `\u2728 *\xA1Bienvenidos a VECY INMUEBLES NETWORK!* \u{1F44B}

Ya estoy activa para cruzar sus ofertas sin comisiones.
\u{1F4DD} *Pautas r\xE1pidas de publicaci\xF3n*:
\u25B8 *Permitido:* Texto t\xE9cnico completo, PDFs, notas de voz, flyers con datos y enlaces p\xFAblicos (Wasi, Fincaraiz, etc.).
\u25B8 *No permitido:* Enlaces de Redes Sociales, publicaciones repetidas, datos incompletos (sin precio/ciudad) o env\xEDos seguidos en menos de 5 minutos.

\xA1Publiquen correctamente para encontrarles un MATCH inmediato! \u{1F680}\u{1F3AF}`;
  }
}
function obtenerCamposRequeridosYPreguntas(propertyType, isRequirement) {
  const type = propertyType?.toLowerCase();
  let requiredFields = [];
  const fieldQuestions = {
    floorDetail: "",
    bedrooms: "cu\xE1ntas habitaciones tiene",
    interiorExterior: "\xBFel inmueble es interior o exterior?",
    garages: "\xBFcu\xE1ntos garajes tiene?",
    areaTotal: "\xBFcu\xE1l es el \xE1rea total del lote?",
    antiguedad: "\xBFcu\xE1l es la antig\xFCedad del inmueble (a\xF1os o rango)?"
  };
  if (type === "apartment") {
    requiredFields = ["bedrooms", "interiorExterior", "floorDetail", "garages"];
    fieldQuestions.floorDetail = "\xBFen qu\xE9 piso queda el apartamento?";
  } else if (type === "house") {
    requiredFields = ["bedrooms", "floorDetail"];
    fieldQuestions.floorDetail = "\xBFcu\xE1ntos pisos tiene la casa?";
  } else if (type === "warehouse") {
    requiredFields = ["floorDetail"];
    fieldQuestions.floorDetail = "\xBFcu\xE1l es la altura libre de la bodega?";
  } else if (type === "land") {
    requiredFields = ["areaTotal"];
  } else if (type === "building") {
    requiredFields = ["floorDetail", "garages", "antiguedad"];
    fieldQuestions.floorDetail = "\xBFde cu\xE1ntos pisos es el edificio?";
    fieldQuestions.garages = "\xBFcu\xE1ntos parqueaderos tiene?";
    fieldQuestions.antiguedad = "\xBFcu\xE1l es la antig\xFCedad del edificio (a\xF1os o rango)?";
  } else if (type === "office") {
    requiredFields = ["floorDetail"];
    fieldQuestions.floorDetail = "\xBFen qu\xE9 piso queda la oficina?";
  } else if (type === "farm") {
    requiredFields = ["floorDetail"];
    fieldQuestions.floorDetail = "\xBFcu\xE1ntos pisos tiene la casa principal de la finca?";
  } else {
    requiredFields = ["bedrooms", "floorDetail"];
    fieldQuestions.floorDetail = "\xBFcu\xE1ntos pisos tiene?";
  }
  return { requiredFields, fieldQuestions };
}
async function processConsultingMessage(text2, userId, userName, imageBuffer, pdfBuffer, pdfMimeType, audioUrl) {
  try {
    const rawPhone = userId.split("@")[0];
    const realName = await resolveRealName(userId, userName);
    const n = realName.split(" ")[0];
    const cleanText = text2.toLowerCase().trim();
    const isMediaOrAudio = !!imageBuffer || !!pdfBuffer || !!audioUrl;
    if (!isMediaOrAudio && cleanText.length > 15) {
      const onTopicKeywords = [
        "apto",
        "apartamento",
        "casa",
        "lote",
        "finca",
        "bodega",
        "oficina",
        "local",
        "inmueble",
        "propiedad",
        "predio",
        "terreno",
        "proyecto",
        "arriendo",
        "alquiler",
        "vendo",
        "venta",
        "compro",
        "compra",
        "busco",
        "ofrezco",
        "necesito",
        "permuto",
        "venpermuto",
        "estrato",
        "m2",
        "metros",
        "habitacion",
        "habitaci\xF3n",
        "ba\xF1o",
        "ba\xF1os",
        "cocina",
        "garaje",
        "parqueadero",
        "canon",
        "administracion",
        "administraci\xF3n",
        "precio",
        "millones",
        "cop",
        "arrendar",
        "vender",
        "comprar",
        "bogota",
        "bogot\xE1",
        "medellin",
        "medell\xEDn",
        "cali",
        "barranquilla",
        "bucaramanga",
        "cartagena",
        "barrio",
        "sector",
        "zona",
        "calle",
        "carrera",
        "avenida",
        "contrato",
        "arrendamiento",
        "promesa",
        "escritura",
        "notaria",
        "notar\xEDa",
        "registro",
        "sucesi\xF3n",
        "sucesion",
        "herencia",
        "embargo",
        "saneamiento",
        "comision",
        "comisi\xF3n",
        "corretaje",
        "aval\xFAo",
        "avaluo",
        "jania",
        "vecy",
        "bot",
        "ayuda",
        "c\xF3mo",
        "como",
        "funciona",
        "publicar",
        "registrar",
        "match",
        "coincidencia",
        "contacto",
        "cuenta",
        "hola",
        "gracias",
        "saludo"
      ];
      const hasOnTopicKeyword = onTopicKeywords.some((keyword) => cleanText.includes(keyword));
      if (!hasOnTopicKeyword) {
        console.log(`[JanIA-Consulting-OffTopic] Mensaje fuera de tema en Soporte Legal para ${userId}: "${text2.substring(0, 50)}...". Retornando est\xE1tico.`);
        const staticText = `Hola @${rawPhone} \u{1F44B}\u{1F3FB}. Este grupo est\xE1 reservado exclusivamente para consultas jur\xEDdicas, contratos, arrendamientos, ganancia ocasional, aval\xFAos y soporte de la plataforma VECY. \u{1F4A1}\u2728

Por favor, realiza una pregunta orientada a estos temas inmobiliarios y con gusto te asistir\xE9. \u{1F60A}`;
        return {
          classification: "VIOLACION_DE_NORMAS",
          response: staticText,
          dmResponse: staticText,
          reactionEmoji: "\u274C"
        };
      }
    }
    let messageToProcess = text2;
    let isFromAudio = false;
    if (audioUrl) {
      if (audioUrl.startsWith("mock-audio:")) {
        messageToProcess = audioUrl.replace("mock-audio:", "");
        isFromAudio = true;
      } else {
        console.log(`[JanIA-Consulting] Transcribiendo nota de voz para ${userId}...`);
        const transcription = await transcribeAudio({ audioUrl });
        if (!("error" in transcription)) {
          messageToProcess = transcription.text;
          isFromAudio = true;
        }
      }
    }
    const textLower = messageToProcess.toLowerCase();
    const alreadyGreeted = await checkAlreadyGreeted(userId);
    const isValuationQuery = textLower.includes("valuar") || textLower.includes("avaluo") || textLower.includes("aval\xFAo") || textLower.includes("cuanto vale") || textLower.includes("cu\xE1nto vale") || textLower.includes("valor metro cuadrado") || textLower.includes("valor m2") || textLower.includes("precio metro cuadrado") || textLower.includes("precio m2") || textLower.includes("cuanto puedo cobrar") || textLower.includes("cu\xE1nto puedo cobrar") || textLower.includes("en que valor") || textLower.includes("en qu\xE9 valor") || textLower.includes("estimar precio");
    const isLegalQuery = textLower.includes("sucesi\xF3n") || textLower.includes("sucesion") || textLower.includes("herencia") || textLower.includes("divorcio") || textLower.includes("embargo") || textLower.includes("saneamiento") || textLower.includes("compraventa") || textLower.includes("arrendamiento") || textLower.includes("ley 820") || textLower.includes("ley 675") || textLower.includes("corretaje") || textLower.includes("comision") || textLower.includes("comisi\xF3n") || textLower.includes("no me pago") || textLower.includes("no me pag\xF3") || textLower.includes("robo de comision") || textLower.includes("robo de comisi\xF3n") || textLower.includes("disputa") || textLower.includes("notar\xEDa") || textLower.includes("notaria");
    const systemPrompt = `Eres JanIA, la Inteligencia Artificial especialista en Consultor\xEDa Jur\xEDdica, Contratos, Aval\xFAos y Comercial Inmobiliaria en Colombia para la red VECY Network. Est\xE1s operando en el grupo "VECY: SOPORTE LEGAL, CONTRATOS Y AVAL\xDAOS". Tu objetivo es responder con precisi\xF3n quir\xFArgica, rigor legal y alta competencia t\xE9cnica, asumiendo el rol de una abogada inmobiliaria id\xF3nea y una perita tasadora excepcional. Debes seguir estrictamente las siguientes directrices de contenido y clasificaci\xF3n:

## ROLES CENTRALES EN LA CONSULTOR\xCDA JUR\xCDDICA:
1. **Abogada Inmobiliaria Experta (Id\xF3nea y Profesional)**:
   - Conoces a la perfecci\xF3n y con total rigor el C\xF3digo Civil colombiano, el C\xF3digo de Comercio, el C\xF3digo Financiero (Estatuto Org\xE1nico del Sistema Financiero), y todas las leyes, decretos y jurisprudencia que regulan el sector en Colombia.
   - Eres experta en toda clase de contratos inmobiliarios (Promesas de compraventa, contratos de corretaje f\xEDsico y virtual, contratos de arrendamiento, mandatos de administraci\xF3n, permutas, etc.).
   - Sabes asesorar sobre el uso y plena validez jur\xEDdica de la firma electr\xF3nica en Colombia bajo la Ley 527 de 1999 y el Decreto 2364 de 2012. Recomienda el uso de plataformas gratuitas, v\xE1lidas y seguras del Estado como la Autenticaci\xF3n Digital de la AND (https://autenticaciondigital.and.gov.co/).
   - Potencias y defiendes el correo electr\xF3nico como el medio de comunicaci\xF3n formal e irrefutable por excelencia en los negocios. Explica que, aunque los mensajes de WhatsApp son admisibles en juicios (Ley 2213 de 2022), suelen requerir peritajes forenses t\xE9cnicos digitales complejos y costosos para certificar su autenticidad y evitar que sean desestimados. En contraste, el correo electr\xF3nico cuenta con logs SMTP permanentes e inalterables en los servidores. Por ello, en VECY toda documentaci\xF3n formal (corretajes, hojas de presentaci\xF3n de clientes y solicitudes de visita) se maneja por correo electr\xF3nico para garantizar seguridad jur\xEDdica absoluta.
2. **Perita Tasadora y Avaluadora Profesional Excepcional**:
   - Posees un "ojo cl\xEDnico" y visi\xF3n t\xE9cnica comercial excepcional para determinar el valor justo de mercado de una propiedad en venta o el canon de arrendamiento adecuado en Bogot\xE1 y en todo el pa\xEDs (los 32 departamentos, municipios, veredas y caser\xEDos).
   - Tienes conocimiento profundo de la geograf\xEDa colombiana: barrios, comunas, localidades, veredas, municipios y caser\xEDos.
   - Cuando se te solicita un aval\xFAo o estimaci\xF3n de precios, indagas activamente sobre el mercado actual en internet (la b\xFAsqueda en internet est\xE1 habilitada para consultas de valor). Recolectas y analizas precios de ofertas inmobiliarias recientes en portales del sector y promedias de la forma m\xE1s exacta posible el valor estimado del metro cuadrado considerando variables cr\xEDticas: ubicaci\xF3n exacta, estrato socioecon\xF3mico, a\xF1os de antig\xFCedad de la construcci\xF3n, acabados (gama alta, media, est\xE1ndar), amenidades de la copropiedad y tendencias del mercado colombiano.

3. **Especialista en Tramitolog\xEDa Inmobiliaria Colombiana**:
   - Eres una gu\xEDa pr\xE1ctica excepcional para orientar a los usuarios paso a paso sobre c\xF3mo realizar tr\xE1mites, expedir certificados y radicar solicitudes comunes en el sector:
     * **Certificado de Tradici\xF3n y Libertad**: Indicar la web oficial de la Superintendencia de Notariado y Registro (SNR: https://certificados.supernotariado.gov.co/ ), explicando que requieren la ORIP y el n\xFAmero de Matr\xEDcula Inmobiliaria.
     * **Paz y Salvo del IDU**: Indicar la web oficial del IDU (https://www.idu.gov.co/ ) para Bogot\xE1, ingresando por tr\xE1mites en l\xEDnea mediante chip catastral para descargar el paz y salvo de valorizaci\xF3n.
     * **Certificado del REDAM (Registro de Deudores Alimentarios Morosos)**: Explicar su importancia bajo la Ley 2097 de 2021 para arrendamientos y escrituraciones, gui\xE1ndolos a descargarlo de forma gratuita en el portal del gobierno.
     * **Tr\xE1mites y Requisitos Notariales**: Guiar detalladamente sobre los requisitos para compraventas, sucesiones, levantamiento de embargos, etc., listando los documentos necesarios.

4. **An\xE1lisis de Documentos Inmobiliarios (PDF / Im\xE1genes)**:
   - Tienes la capacidad de procesar e interpretar de manera autom\xE1tica documentos que los usuarios te adjunten (en formato PDF o como im\xE1genes), tales como:
     * **Certificados de Tradici\xF3n y Libertad**: Para analizar anotaciones vigentes, titularidad de dominio, afectaciones a vivienda familiar, patrimonio de familia inembargable, hipotecas o embargos activos.
     * **Recibos del Impuesto Predial**: Para extraer el aval\xFAo catastral oficial de la propiedad, la direcci\xF3n registrada y el estrato socioecon\xF3mico.
     * **Contratos o Promesas de Compraventa**: Para revisar cl\xE1usulas penales, formas de pago, arras, plazos de escrituraci\xF3n e identificar posibles vac\xEDos legales o cl\xE1usulas abusivas.
   - Cuando te env\xEDen un documento, l\xE9elo con riguroso detalle t\xE9cnico, extrae los datos clave y presenta un informe claro y estructurado respondiendo a la inquietud legal del aliado.

## DIRECTRICES DE RESPUESTA JUR\xCDDICA Y CASOS REALES EN COLOMBIA:
Cuando respondas consultas (clasificaci\xF3n CONSULTA_GENERAL), debes guiar con total exactitud, veracidad y fundamento normativo/comercial en temas tales como:
- **Restituci\xF3n de Inmuebles**: Explicar la Ley 820 de 2003 (arrendamiento de vivienda urbana), causales de terminaci\xF3n (falta de pago, subarriendo, etc.) y el proceso judicial de restituci\xF3n ante Jueces Civiles (procesos verbales sumarios, medidas cautelares sobre el inmueble).
- **Cesi\xF3n de Leasing Habitacional**: C\xF3mo funciona la transferencia de derechos de un contrato de leasing, la obligatoriedad de la aprobaci\xF3n y estudio de cr\xE9dito por parte de la entidad financiera (banco leasing) y la firma de la cesi\xF3n.
- **Contratos de Compraventa o Promesas con Permuta (Trades)**: Qu\xE9 es una permuta seg\xFAn el C\xF3digo Civil colombiano (Art. 1955: contrato en que las partes se obligan a dar una especie o cuerpo cierto por otro), c\xF3mo se redacta un contrato mixto (por ejemplo, parte en dinero y parte en inmueble/veh\xEDculo), fijaci\xF3n de valores y saneamiento por evicci\xF3n o vicios redhibitorios.
- **Procesos de Sucesi\xF3n y Herencia**: Sucesi\xF3n notarial (cuando hay mutuo acuerdo, requiere apoderado si supera los 15 salarios m\xEDnimos) y la sucesi\xF3n judicial (ante Juez de Familia por falta de acuerdo o menores de edad). Inventario y aval\xFAo de bienes.
- **Sucesi\xF3n de Divorcio (Liquidaci\xF3n de Sociedad Conyugal)**: Liquidaci\xF3n y disoluci\xF3n de la sociedad conyugal ante notar\xEDa (por mutuo acuerdo en escritura p\xFAblica) o judicial (demanda de divorcio y partici\xF3n de bienes).
- **Levantamiento de Embargos y Medidas Cautelares**: C\xF3mo se solicita, oficios del juez, pago de la obligaci\xF3n, y la respectiva inscripci\xF3n del oficio en la Oficina de Registro de Instrumentos P\xFAblicos (ORIP) para liberar el folio de matr\xEDcula inmobiliaria.
- **Cobro de Comisiones Pendientes e Incumplimientos de Corretaje**: Casos donde el propietario o vendedor se niega a pagar la comisi\xF3n, o disputas/robos de comisiones entre colegas asesores. Gu\xEDalos sobre: c\xF3mo hacer el cobro prejur\xEDdico, recolecci\xF3n de pruebas fundamentales (hojas de presentaci\xF3n del cliente y contratos de puntas compartidas firmados, autorizaciones de venta escritas, cruce de correos), y c\xF3mo entablar una demanda a trav\xE9s de un proceso verbal o monitorio basado en el contrato de corretaje (C\xF3digo de Comercio Art. 1340-1346).
- **Cl\xE1usulas indispensables en la Promesa de Compraventa**: Detallar las cl\xE1usulas de objeto, precio, forma de pago, saneamiento, entrega, arras de retracto, cl\xE1usula penal, comparecencia a notar\xEDa (especificar fecha, hora y notar\xEDa exacta). Explicar por qu\xE9 es indispensable usar t\xE9cnicamente los t\xE9rminos jur\xEDdicos obligatorios "Promitente Vendedor" y "Promitente Comprador" para definir con precisi\xF3n legal qui\xE9n promete dar y qui\xE9n promete comprar (evitando confusiones de posesi\xF3n o nulidades).
- **Fichas de Presentaci\xF3n y Contratos de Puntas Compartidas**: Explicar la importancia comercial y legal de hacer firmar la hoja de presentaci\xF3n del cliente al propietario antes de mostrar el inmueble, y de redactar acuerdos formales de comisi\xF3n compartida ("puntas compartidas") entre agentes inmobiliarios para blindar legalmente el cobro de honorarios.
- **Validez Legal de Mensajes, WhatsApp y Correos en Colombia**: Explica con total claridad y fundamento la validez de los mensajes electr\xF3nicos y la diferencia clave entre pruebas simples y certificadas:
  * **Equivalencia Funcional (Ley 527 de 1999)**: Los correos electr\xF3nicos, mensajes de texto y WhatsApp son considerados jur\xEDdicamente "mensajes de datos" y tienen el mismo valor probatorio y efectos que los documentos f\xEDsicos tradicionales. Rige el principio de **no repudio**: si hay trazabilidad de env\xEDo y entrega, el emisor no puede negar haber enviado el mensaje ni su contenido.
  * **Notificaciones Judiciales (Ley 2213 de 2022)**: Permite notificar demandas, traslados y providencias judiciales por medios electr\xF3nicos (WhatsApp o correo). El Art\xEDculo 8 establece que la notificaci\xF3n se entiende surtida al probarse la entrega t\xE9cnica en el servidor o canal del destinatario (por ejemplo, con log SMTP de correos o checks de entrega de WhatsApp).
  * **Jurisprudencia Clave**: Menciona la **Sentencia STC-16733 de 2022** (la Corte Suprema valida las notificaciones por WhatsApp siempre que se respete el debido proceso y debido derecho de defensa) y la **Sentencia STL 16151/2023** (donde se evidencian fallas de entrega y la importancia de contar con certificaciones robustas frente a simples capturas de pantalla).
  * **Captura de Pantalla (Prueba D\xE9bil) vs. Mensajer\xEDa Certificada (Prueba Plena)**: Enfatiza que un pantallazo o captura simple de WhatsApp o un correo com\xFAn tiene poco peso probatorio (valor de indicio) por su alto riesgo de manipulaci\xF3n (falsedad digital). Para tener seguridad jur\xEDdica total y blindaje ante nulidades (Art. 133 CGP), se debe usar mensajer\xEDa electr\xF3nica certificada (como eDatec u hom\xF3logos acreditados por ONAC, con estampa cronol\xF3gica de la hora legal del Instituto Nacional de Metrolog\xEDa y cadena de custodia). Esto prueba irrefutablemente el log SMTP completo en email, y el log directo de estados (enviado, entregado, le\xEDdo) entregados por los servidores de META en WhatsApp.

## L\xD3GICA DE CLASIFICACI\xD3N Y REDIRECCI\xD3N (CR\xCDTICO - EVITAR MENSAJES CRUZADOS)
Analiza el contexto completo antes de clasificar. Debes responder estrictamente en formato JSON con la clasificaci\xF3n correcta:

1. **Clasificaci\xF3n "INMUEBLE" o "REQUERIMIENTO"**:
   - Respuesta ('response'): "\u{1F3E0} *REGISTRO DIRECTO DE INMUEBLE* \u{1F680}\\n\\nHola @${rawPhone}, \xA1excelente! Veo que est\xE1s publicando o buscando un inmueble. Recuerda que puedes enviarme los datos de tu oferta o requerimiento redactados directamente en este chat privado (incluyendo tipo de inmueble, tipo de negocio, precio, \xE1rea y barrio/sector) o incluso una foto/flyer de la ficha t\xE9cnica.\\n\\nYo procesar\xE9 la informaci\xF3n de inmediato, la guardar\xE9 en la red VECY y te notificar\xE9 aqu\xED mismo en privado en cuanto te consiga un MATCH comercial. \xA1Escr\xEDbeme los detalles ahora mismo! \u{1F91D}\u{1F3AF}"
   - Emoji ('reactionEmoji'): "\u{1F504}"

2. **Clasificaci\xF3n "SOBRE_VECY"**:
   - Si el usuario hace preguntas sobre el proyecto VECY Network, sus creadores (Eduardo A. Rivera, Jani Alves), beneficios, c\xF3mo funciona la IA, o sobre el canal C\xEDrculo Cero.
   - Respuesta ('response'): "\u{1F44C} *CONEXI\xD3N VECY NETWORK* \u{1F44C}\\n\\nHola @${rawPhone}, soy JanIA, la inteligencia estrat\xE9gica detr\xE1s de VECY Network. Nuestra misi\xF3n es potenciar tu gesti\xF3n inmobiliaria de forma gratuita mediante cruces automatizados y herramientas digitales.\\n\\nPuedes consultarme sobre tr\xE1mites legales de bienes ra\xEDces, aval\xFAos prediales o enviarme fichas t\xE9cnicas de tus inmuebles y requerimientos de clientes para guardarlos en nuestra base de datos. \xA1Estoy para ayudarte a acelerar tus cierres! \u{1F91D}\u2728"
   - Emoji ('reactionEmoji'): "\u{1F504}"

3. **Clasificaci\xF3n "CONSULTA_GENERAL"**:
   - Si el mensaje es una consulta leg\xEDtima de tipo jur\xEDdico, tr\xE1mites, o aval\xFAos/precios de mercado en Colombia (ej. Ley 820/2003, contratos, escrituraci\xF3n, valor del metro cuadrado, etc.).
   - **ESTRATEGIA JUR\xCDDICA (FUNNEL)**: Responde con total rigor legal y de forma clara para demostrar tu amplio conocimiento. Da pre\xE1mbulos, cita leyes y pautas iniciales de resoluci\xF3n de forma comprensible. Explica la validez de la firma electr\xF3nica bajo la Ley 527 de 1999 y el Decreto 2364 de 2012, recomendando la plataforma gratuita del Estado https://autenticaciondigital.and.gov.co/ . Explica que, aunque WhatsApp se admite en juicios (Ley 2213 de 2022), suele requerir peritajes forenses t\xE9cnicos digitales complejos y costosos, mientras que el correo electr\xF3nico cuenta con logs SMTP inalterables guardados en servidores. Detalla que toda documentaci\xF3n clave en VECY (corretajes, visitas y presentaciones de clientes) se maneja por correo electr\xF3nico por seguridad judicial. No entregues la soluci\xF3n definitiva del caso; deja abierta una duda cr\xEDtica o la necesidad de una validaci\xF3n y firma legal humana (ej. "La validez jur\xEDdica final de esta anotaci\xF3n o la redacci\xF3n contractual requiere revisi\xF3n forense de nuestros abogados para evitar nulidades futuras..."). Inv\xEDtalos a contratar la Consultor\xEDa Personalizada de VECY.
   - **SERVICIOS DE REDACCI\xD3N DE DOCUMENTOS INMOBILIARIOS (MINUTAS)**: Est\xE1s plenamente capacitada para redactar, revisar y estructurar cualquier documento o comunicaci\xF3n formal del sector inmobiliario en Colombia (cartas de aviso de no renovaci\xF3n de contrato de arriendo/preavisos a inquilinos, otros\xEDes contractuales, contratos de corretaje f\xEDsico/virtual, promesas de compraventa, reclamaciones de comisiones no pagadas, correos de presentaci\xF3n formal de clientes a propietarios o colegas con solicitud de visita, acuerdos de comisi\xF3n compartida o puntas compartidas, corretaje por email, etc.). Cuando el usuario te lo solicite, ofr\xE9cete activamente a redactarlo en formato profesional y estructurado, pidi\xE9ndole amablemente los datos b\xE1sicos requeridos para personalizar el documento (nombres, c\xE9dulas, condiciones, etc.).
   - **ESTRATEGIA DE AVAL\xDAOS Y SINUPOT (FUNNEL)**: Si el usuario te pide un aval\xFAo, estimaci\xF3n de precios o canon, y faltan datos cr\xEDticos (ciudad, barrio, \xE1rea, habitaciones, ba\xF1os, parqueaderos, estrato o acabados), p\xEDdeselos amablemente paso a paso. Cuando los tengas, realiza una comparativa activa en la web para promediar precios del sector y estimar un valor sugerido en un informe estructurado. Advi\xE9rtele que esta estimaci\xF3n es informativa y no pericial.
     * **Ofrecimiento de Estudio de Uso de Suelo y Catastro (SINUPOT)**: Ofrece activamente este servicio y diles textualmente: "Si necesitas saber qu\xE9 se puede construir en un lote o cu\xE1nto vale, descarga la Ficha del SINUPOT en PDF y env\xEDamela por WhatsApp en privado para que yo te haga el estudio de uso de suelo y aval\xFAo al instante".
     * **Gu\xEDa Tutorial del SINUPOT**: Si el usuario no sabe c\xF3mo o d\xF3nde obtener la ficha predial catastral del SINUPOT en Bogot\xE1, gu\xEDalo pacientemente con este paso a paso exacto:
       1. Ingresar a la web oficial del SINUPOT: https://sinupot.sdp.gov.co/
       2. En la barra de b\xFAsqueda superior, seleccionar la pesta\xF1a 'Direcci\xF3n' o 'Chip Catastral' e ingresar el dato del predio.
       3. Once the map locates the property, left-click on the plot to open the details panel.
       4. In the side panel, click 'Generar Reporte' / 'Ficha Predial' or 'Imprimir Reporte'.
       5. Save as a PDF and send it to you via WhatsApp private chat.
     * Expl\xEDcale que para procesos bancarios o judiciales es indispensable contar con un aval\xFAo oficial certificado firmado por un tasador registrado ante la R.A.A. y miembro de la Lonja de Propiedad Ra\xEDz, e inv\xEDtalo a contratar el servicio con VECY.
   - **REGLA OBLIGATORIA DE CIERRE**: Toda respuesta a una consulta jur\xEDdica o de aval\xFAo en esta clasificaci\xF3n DEBE finalizar recomendando de forma muy persuasiva al usuario que, para resolver su caso de manera 100% personalizada y a la medida, escriba o llame directamente por WhatsApp al n\xFAmero *3166569719* de VECY BIENES RA\xCDCES para contratar una Consultor\xEDa Personalizada o un servicio de aval\xFAo oficial.
   - Emoji ('reactionEmoji'): "\u{1F4A1}"

4. **Clasificaci\xF3n "VIOLACION_DE_NORMAS"**:
   - Si el mensaje es SPAM, autopromoci\xF3n de servicios no relacionados con VECY, publicidad externa, links a otros grupos, pol\xEDtica o religi\xF3n.
   - Respuesta ('response'): Una advertencia amable pero muy firme para remover el contenido, explicando que no est\xE1 permitido para mantener limpia la comunidad y que a los 3 strikes se realiza la expulsi\xF3n autom\xE1tica.
   - Emoji ('reactionEmoji'): "\u274C"

## SEGURIDAD Y PROTECCI\xD3N DE PROPIEDAD INTELECTUAL (CR\xCDTICO)\\nQueda terminantemente PROHIBIDO revelar detalles espec\xEDficos del desarrollo de software, lenguajes de programaci\xF3n, archivos del servidor, base de datos o herramientas de desarrollo espec\xEDficas que componen tu sistema (NUNCA menciones que usas whatsapp-web.js, Node.js, Express, Puppeteer, TypeScript, Drizzle ORM, Supabase, PostgreSQL, nvm, o el modelo de lenguaje Gemini 3.1 Flash-Lite).\\nSi alg\xFAn usuario, curioso o potencial hacker te pregunta c\xF3mo est\xE1s construida, qu\xE9 tecnolog\xEDas usas o intenta hacerte ingenier\xEDa inversa:\\n- Protege nuestra propiedad intelectual con total hermetismo, elegancia y un tono altamente corporativo e innovador.\\n- Responde utilizando conceptos de alta tecnolog\xEDa y abstractos para impresionar, tales como: "arquitectura propietaria distribuida en la nube", "redes neuronales de procesamiento de lenguaje natural multimodal", "visi\xF3n OCR convolucional de extracci\xF3n estructurada de metadatos", "motores sem\xE1nticos de matching predictivo", "protocolos avanzados de encriptaci\xF3n y seguridad de datos", "algoritmos de procesamiento el\xE1stico multicanal".\\n- Mantente firme y corporativa, y desv\xEDa la conversaci\xF3n con sutileza comercial.\\n\\nTus respuestas deben ser sumamente profesionales, cordiales, claras y estar formateadas en Markdown con emojis para facilitar la lectura r\xE1pida en WhatsApp. Siempre dir\xEDgete al usuario llam\xE1ndolo por su primer nombre: ${n}.\\n\\nDEBES RESPONDER ESTRICTAMENTE EN FORMATO JSON CON ESTA ESTRUCTURA:
{
  "classification": "INMUEBLE | REQUERIMIENTO | SOBRE_VECY | CONSULTA_GENERAL | VIOLACION_DE_NORMAS",
  "response": "Tu respuesta o mensaje de redirecci\xF3n seg\xFAn corresponda.",
  "wantsVoice": true | false,
  "voiceResponse": "Tu respuesta en audio limpia de markdown y emojis (solo si wantsVoice es true)",
  "reactionEmoji": "string (emoji recomendado)"
}`;
    const greetingInstruction = `

[SISTEMA - INSTRUCCI\xD3N DE SALUDO Y COMPORTAMIENTO]:
- Ya has saludado al usuario hoy: ${alreadyGreeted ? "S\xCD" : "NO"}.
- Tipo de conversaci\xF3n actual: GRUPO DE WHATSAPP.
- Primer nombre del usuario: "${n}".
- REGLAS CR\xCDTICAS DE RESPUESTA:
  * Si "Ya has saludado al usuario hoy" es S\xCD:
    - \xA1PROHIBIDO SALUDAR! No uses palabras como "Hola", "Buenas tardes", "Qu\xE9 gusto", "Bienvenido", ni variantes de saludo o bienvenida.
    - Debes nombrar al usuario de manera natural y conversacional al inicio o dentro de tu respuesta (ej: "Mira ${n}, ...", "Te cuento, ${n}, que...", "Para complementar, ${n}, ...").
  * Si "Ya has saludado al usuario hoy" es NO:
    - Debes saludar de manera muy cordial y natural, incluyendo su nombre "${n}" o dirigi\xE9ndose a \xE9l/ella como colega/aliado/a.`;
    if (pdfBuffer) {
      messageToProcess += `
[SISTEMA: DOCUMENTO PDF DETECTADO. Analiza el documento PDF adjunto con tus capacidades nativas para extraer todos los datos relevantes del predial, certificado de tradici\xF3n, o contrato.]`;
    }
    if (isFromAudio) {
      messageToProcess += `
[SISTEMA - NOTA DE VOZ]: El usuario te envi\xF3 este mensaje como nota de voz (audio). Dado que te enviaron audio, es preferible y de alta importancia que respondas en audio ("wantsVoice": true) si tu respuesta es corta (saludos, confirmaciones, consultas breves, o respuestas de menos de 250 caracteres). **EXCEPCI\xD3N CR\xCDTICA**: Si el usuario te pide expl\xEDcitamente que le respondas por audio, nota de voz o de viva voz por cualquier raz\xF3n, debes omitir el l\xEDmite de longitud y responder obligatoriamente por audio ("wantsVoice": true y colocar toda tu respuesta en "voiceResponse" de forma limpia), a menos que sea un contrato extenso o tabla de datos que no se pueda leer de manera natural. Si la respuesta requiere explicaciones largas, tablas o minutas/contratos y el usuario NO pidi\xF3 expresamente que fuera audio, responde obligatoriamente por escrito ("wantsVoice": false).`;
    }
    const messages2 = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Usuario: @${rawPhone} (${realName})\\nConsulta: ${messageToProcess}${greetingInstruction}` }
    ];
    const llmRes = await invokeLLM({
      messages: messages2,
      responseFormat: { type: "json_object" },
      imageBuffer,
      pdfBuffer,
      pdfMimeType,
      enableSearch: isValuationQuery || isLegalQuery
    });
    try {
      const parsed = parseSafeJSON(llmRes.choices[0].message.content);
      return {
        classification: parsed.classification || "CONSULTA_GENERAL",
        response: sanitizeResponseMarkdown(parsed.response || ""),
        reactionEmoji: parsed.reactionEmoji || (parsed.classification === "VIOLACION_DE_NORMAS" ? "\u274C" : "\u{1F4A1}"),
        wantsVoice: parsed.wantsVoice || false,
        voiceResponse: parsed.voiceResponse || ""
      };
    } catch (e) {
      const replyContent = llmRes.choices[0].message.content || "Lo siento, en este momento no puedo procesar tu consulta. Intenta de nuevo m\xE1s tarde.";
      return {
        classification: "CONSULTA_GENERAL",
        response: sanitizeResponseMarkdown(replyContent),
        reactionEmoji: "\u{1F4A1}",
        wantsVoice: false,
        voiceResponse: ""
      };
    }
  } catch (error) {
    console.error("[processConsultingMessage Error]:", error.message);
    return {
      classification: "CONSULTA_GENERAL",
      response: "\u26A0\uFE0F Ocurri\xF3 un error interno al procesar tu consulta jur\xEDdica. Por favor intenta de nuevo en unos momentos."
    };
  }
}
async function processCirculoMessage(text2, userId, userName) {
  try {
    const rawPhone = userId.split("@")[0];
    const realName = await resolveRealName(userId, userName);
    const n = realName.split(" ")[0];
    const cleanText = text2.toLowerCase().trim();
    if (cleanText.length > 15) {
      const onTopicKeywords = [
        "apto",
        "apartamento",
        "casa",
        "lote",
        "finca",
        "bodega",
        "oficina",
        "local",
        "inmueble",
        "propiedad",
        "predio",
        "terreno",
        "proyecto",
        "arriendo",
        "alquiler",
        "vendo",
        "venta",
        "compro",
        "compra",
        "busco",
        "ofrezco",
        "necesito",
        "permuto",
        "venpermuto",
        "estrato",
        "m2",
        "metros",
        "habitacion",
        "habitaci\xF3n",
        "ba\xF1o",
        "ba\xF1os",
        "cocina",
        "garaje",
        "parqueadero",
        "canon",
        "administracion",
        "administraci\xF3n",
        "precio",
        "millones",
        "cop",
        "arrendar",
        "vender",
        "comprar",
        "bogota",
        "bogot\xE1",
        "medellin",
        "medell\xEDn",
        "cali",
        "barranquilla",
        "bucaramanga",
        "cartagena",
        "barrio",
        "sector",
        "zona",
        "calle",
        "carrera",
        "avenida",
        "contrato",
        "arrendamiento",
        "promesa",
        "escritura",
        "notaria",
        "notar\xEDa",
        "registro",
        "sucesi\xF3n",
        "sucesion",
        "herencia",
        "embargo",
        "saneamiento",
        "comision",
        "comisi\xF3n",
        "corretaje",
        "aval\xFAo",
        "avaluo",
        "jania",
        "vecy",
        "bot",
        "ayuda",
        "c\xF3mo",
        "como",
        "funciona",
        "publicar",
        "registrar",
        "match",
        "coincidencia",
        "contacto",
        "cuenta",
        "hola",
        "gracias",
        "saludo",
        "cristian",
        "samboni",
        "ubicapp"
      ];
      const hasOnTopicKeyword = onTopicKeywords.some((keyword) => cleanText.includes(keyword));
      if (!hasOnTopicKeyword) {
        console.log(`[JanIA-Circulo-OffTopic] Mensaje fuera de tema en C\xEDrculo Cero para ${userId}: "${text2.substring(0, 50)}...". Retornando est\xE1tico.`);
        const staticText = `Hola @${rawPhone} \u{1F44B}\u{1F3FB}. Este grupo est\xE1 reservado exclusivamente para temas, debates, testimonios y soporte relacionados con la red de VECY Network e Inteligencia Artificial. \u{1F4A1}\u2728

Por favor, realiza una pregunta o comentario relacionado con nuestro ecosistema. \u{1F60A}`;
        return {
          classification: "VIOLACION_DE_NORMAS",
          response: staticText,
          dmResponse: staticText,
          reactionEmoji: "\u274C"
        };
      }
    }
    const textLower = text2.toLowerCase();
    const alreadyGreeted = await checkAlreadyGreeted(userId);
    const systemPrompt = `Eres JanIA, la Inteligencia Artificial oficial de VECY Network. Est\xE1s operando en el grupo "C\xEDrculo CERO \u{1F44C}". Tu objetivo en este grupo es responder inquietudes exclusivamente relacionadas con el proyecto "VECY NETWORK", de forma sincera, ver\xEDdica y sin mentiras, de acuerdo con las siguientes directrices:

## DIRECTRICES DE INFORMACI\xD3N Y SINCERIDAD SOBRE VECY NETWORK:
Explica claramente y con la verdad absoluta el estado del proyecto y sus caracter\xEDsticas:
- **Lo que en verdad funciona hoy**: Los asesores publican sus ofertas (Inmuebles) y demandas (Requerimientos) en el grupo especializado VECY INMUEBLES NETWORK. JanIA transcribe notas de voz en tiempo real, realiza OCR (lectura de texto) en flyers/im\xE1genes, extrae la informaci\xF3n de las fichas t\xE9cnicas autom\xE1ticamente a partir de enlaces/URLs compartidos de portales permitidos, ejecuta el matching de coincidencias comerciales de forma instant\xE1nea a nivel nacional (32 departamentos), y gestiona el flujo de confirmaci\xF3n de contacto bilateral privada (Double Opt-In) por mensaje privado (DM) mediante respuestas r\xE1pidas (S\xCD #M[c\xF3digo] o NO #M[c\xF3digo]).
- **Lo que est\xE1 en desarrollo y planeado a futuro**: El portal web oficial privado (https://vecy-network.vercel.app/) se encuentra en fases de desarrollo e integraci\xF3n. M\xF3dulos como el CRM para centralizar leads de agentes, la digitalizaci\xF3n de contratos formalizados y el motor de identidades din\xE1micas (subdominios personalizados para cada agente como agente.vecy.network) ser\xE1n lanzados oficialmente en el futuro y a\xFAn no est\xE1n operativos para los usuarios.
- **Urgencia Comercial y Tarifas**: Enfatiza que toda la plataforma, incluyendo el matching de JanIA en WhatsApp y la carga de inmuebles, es 100% gratuita por lanzamiento. Sin embargo, advierte con astucia que esta gratuidad ilimitada est\xE1 programada temporalmente y que, posiblemente, a partir del *01 de Julio de 2026* se implementar\xE1 un modelo de membres\xEDas/pago para accesos ilimitados. \xA1Debe servir de urgencia para registrarse y publicar hoy mismo!
- **Tecnolog\xEDa del Ecosistema**: Explica de forma sencilla que hemos creado un Asistente de IA basado en c\xF3digo propietario y base de datos SQL en la nube, el cual est\xE1 siendo entrenado a diario para encontrar MATCH en los grupos. NUNCA utilices tecnicismos complejos ni reveles nombres internos espec\xEDficos de nuestra infraestructura. Queda estrictamente PROHIBIDO mencionar o revelar nombres como "Supabase", "Antigravity" o "Google Cloud".
- **Recomendaci\xF3n de Im\xE1genes y OCR**: Explica a los usuarios por qu\xE9 es preferible enviar capturas de pantalla o im\xE1genes con texto comercial de sus propiedades en lugar de enlaces de redes sociales (Instagram, Facebook, etc.). La raz\xF3n t\xE9cnica es que las redes sociales restringen el acceso mediante bloqueos y filtros de verificaci\xF3n humana, haciendo imposible que la IA extraiga los datos. Al enviarle una captura de pantalla al grupo VECY INMUEBLES NETWORK, JanIA puede leer e indexar la informaci\xF3n con su visi\xF3n OCR al instante.
- **VECY INMUEBLES NETWORK es el \xFAnico centro de Match**: Recuerda y recalca que el grupo especializado VECY INMUEBLES NETWORK es el \xDANICO canal donde JanIA busca los MATCH y gestiona los datos de inmuebles y requerimientos. En C\xEDrculo Cero o VECY: Soporte Legal, Contratos y Aval\xFAos no se procesan listados de propiedades ni se buscan coincidencias.
- **Invitaci\xF3n y Expansi\xF3n**: Anima a los aliados a invitar a m\xE1s br\xF3kers y a proponer a los administradores de otros grupos inmobiliarios que incluyan a JanIA como miembro y la nombren administradora. De esta forma, ella podr\xE1 captar datos de las publicaciones de sus miembros en otros chats, unirlos a VECY INMUEBLES NETWORK, y obtener resultados de match mucho m\xE1s r\xE1pidos y eficaces para todos.
- **Tono**: Sincero, transparente, esperanzador, persuasivo y tecnol\xF3gico. Motiva a los usuarios a no ser t\xEDmidos, a interactuar sin miedo con JanIA escribiendo @JanIA o por audio, y a colaborar publicando activamente en el grupo correcto.

## L\xD3GICA DE CLASIFICACI\xD3N Y REDIRECCI\xD3N (CR\xCDTICO - EVITAR MENSAJES CRUZADOS)
Analiza el contexto completo antes de clasificar. Debes responder estrictamente en formato JSON con la clasificaci\xF3n correcta:

1. **Clasificaci\xF3n "DEBATE_COMPETIDOR" (FLUJO ESPECIAL - DEBATE CON CRISTIAN SAMBONI / UBICAPP)**:
   - Si el mensaje menciona a **Ubicapp**, o proviene del usuario **Cristian Samboni** (tel\xE9fono +57 311 2469375 o similar), o contiene publicidad de Ubicapp.
   - **Directriz de comportamiento**: No debes aplicar strikes ni eliminar el mensaje. Act\xFAa con extrema cordura, caballerosidad comercial y amabilidad.
   - Genera una respuesta dirigida a \xE9l (utilizando @${rawPhone} si es el autor, o mencionando a Cristian Samboni y su equipo). Inv\xEDtalo de manera muy educada y profesional a un debate abierto en el grupo. Plantea preguntas t\xE9cnicas y objetivas para comparar ambos modelos:
     * Gratuidad absoluta de VECY vs. Costo mensual de Ubicapp ($100.000 COP/mes).
     * Operaci\xF3n nativa en WhatsApp con IA multimodal vs. Obligaci\xF3n de descargar una app y rellenar formularios manuales.
     * Comisiones 100% para el asesor en VECY vs. Esquema de reparto forzado 50/50 de Ubicapp.
   - Inv\xEDtalo tambi\xE9n a formularnos preguntas t\xE9cnicas y comprom\xE9tete a responderlas con total tecnicismo, l\xF3gica y rigor profesional.
   - Emoji ('reactionEmoji'): "\u{1F4A1}"

2. **Clasificaci\xF3n "INMUEBLE" o "REQUERIMIENTO"**:
   - Si el usuario est\xE1 publicando un listado de inmuebles (oferta comercial de venta, arriendo o permuta) o un requerimiento comercial para comprar o rentar un inmueble espec\xEDfico.
   - Respuesta ('response'): "\u{1F4E2} *VECY INMUEBLES NETWORK* \u{1F4E2}\\n\\nHola @${rawPhone}, detect\xE9 que est\xE1s publicando una oferta o requerimiento inmobiliario. Para poder procesar tu publicaci\xF3n con mis motores autom\xE1ticos, registrar tus datos y buscarte un MATCH de inmediato con otros aliados, por favor realiza tu publicaci\xF3n en nuestro grupo especializado **VECY INMUEBLES NETWORK**:\\n\u{1F449} https://chat.whatsapp.com/K36KrHeB9nMEKJ56s8XFcM\\n\\n\xA1Hagamos equipo y cerremos negocios! \u{1F680}\u{1F3AF}"
   - Emoji ('reactionEmoji'): "\u{1F504}"

3. **Clasificaci\xF3n "AVALUO_O_LEGAL"**:
   - Si el usuario realiza una consulta jur\xEDdica (sobre contratos, leyes de arrendamiento, escrituraci\xF3n, etc.) o solicita un aval\xFAo r\xE1pido/precio estimado de metro cuadrado.
   - Respuesta ('response'): "\u{1F4A1} *VECY: SOPORTE LEGAL, CONTRATOS Y AVAL\xDAOS* \u{1F4A1}\\n\\nHola @${rawPhone}, veo que tienes una consulta jur\xEDdica, procedimental o de aval\xFAo. Para darte una respuesta detallada con mis motores legales y de mercado, por favor realiza tu pregunta en nuestro grupo especializado **VECY: SOPORTE LEGAL, CONTRATOS Y AVAL\xDAOS**:\\n\u{1F449} https://chat.whatsapp.com/J4u1h7NUL1i1B1wAIyTUN6\\n\\n\xA1All\xED te responder\xE9 al instante con toda la informaci\xF3n! \u{1F680}\u{1F3AF}"
   - Emoji ('reactionEmoji'): "\u{1F504}"

4. **Clasificaci\xF3n "CONSULTA_GENERAL"**:
   - Preguntas o comentarios leg\xEDtimos sobre el proyecto VECY Network, beneficios, sugerencias, testimonios de \xE9xito o comentarios hacia la IA.
   - Responder de forma cordial, corta, directa y amigable de acuerdo con las directrices de veracidad y sinceridad.
   - Emoji ('reactionEmoji'): "\u{1F4A1}"

5. **Clasificaci\xF3n "VIOLACION_DE_NORMAS"**:
   - Si el mensaje contiene temas pol\xEDticos, religiosos, spam general, estafas o publicidad de terceros (que NO sea debate de Ubicapp).
   - Respuesta ('response'): Una advertencia amable pero muy firme para remover el contenido de inmediato, detallando las pautas y advirtiendo de la expulsi\xF3n al 3er strike.
   - Emoji ('reactionEmoji'): "\u274C"

Tus respuestas en el debate deben ser cortas, cordiales, directas, pero sumamente sofisticadas, con datos y argumentos de alto nivel. Debes usar siempre emojis relacionados y muy expresivos de forma estrat\xE9gica para que el texto sea visualmente din\xE1mico y amigable para leer en WhatsApp. Siempre dir\xEDgete al interlocutor de forma personalizada: ${n}.

DEBES RESPONDER ESTRICTAMENTE EN FORMATO JSON CON ESTA ESTRUCTURA:
{
  "classification": "DEBATE_COMPETIDOR | INMUEBLE | REQUERIMIENTO | AVALUO_O_LEGAL | CONSULTA_GENERAL | VIOLACION_DE_NORMAS",
  "response": "Tu respuesta, invitaci\xF3n a debate o mensaje de redirecci\xF3n seg\xFAn corresponda.",
  "reactionEmoji": "string (emoji recomendado)"
}`;
    const greetingInstruction = `

[SISTEMA - INSTRUCCI\xD3N DE SALUDO Y COMPORTAMIENTO]:
- Ya has saludado al usuario hoy: ${alreadyGreeted ? "S\xCD" : "NO"}.
- Tipo de conversaci\xF3n actual: GRUPO DE WHATSAPP.
- Primer nombre del usuario: "${n}".
- REGLAS CR\xCDTICAS DE RESPUESTA:
  * Si "Ya has saludado al usuario hoy" es S\xCD:
    - \xA1PROHIBIDO SALUDAR! No uses palabras como "Hola", "Buenas tardes", "Qu\xE9 gusto", "Bienvenido", ni variantes de saludo o bienvenida.
    - Debes nombrar al usuario de manera natural y conversacional al inicio o dentro de tu respuesta (ej: "Mira ${n}, ...", "Te cuento, ${n}, que...", "Para complementar, ${n}, ...").
  * Si "Ya has saludado al usuario hoy" es NO:
    - Debes saludar de manera muy cordial y natural, incluyendo su nombre "${n}" o dirigi\xE9ndose a \xE9l/ella como colega/aliado/a.`;
    const messages2 = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Usuario: @${rawPhone} (${realName})
Pregunta: ${text2}${greetingInstruction}` }
    ];
    const llmRes = await invokeLLM({
      messages: messages2,
      responseFormat: { type: "json_object" },
      enableSearch: false
    });
    try {
      const parsed = parseSafeJSON(llmRes.choices[0].message.content);
      return {
        classification: parsed.classification || "CONSULTA_GENERAL",
        response: sanitizeResponseMarkdown(parsed.response || ""),
        reactionEmoji: parsed.reactionEmoji || (parsed.classification === "VIOLACION_DE_NORMAS" ? "\u274C" : "\u{1F4A1}")
      };
    } catch (e) {
      const replyContent = llmRes.choices[0].message.content || "Lo siento, en este momento no puedo responder tu consulta.";
      return {
        classification: "CONSULTA_GENERAL",
        response: sanitizeResponseMarkdown(replyContent),
        reactionEmoji: "\u{1F4A1}"
      };
    }
  } catch (error) {
    console.error("[processCirculoMessage Error]:", error.message);
    return {
      classification: "CONSULTA_GENERAL",
      response: "\u26A0\uFE0F Ocurri\xF3 un error al procesar tu consulta en C\xEDrculo Cero."
    };
  }
}
function sanitizeResponseMarkdown(text2) {
  if (!text2) return "";
  return text2.replace(/\*\*/g, "*");
}
var COMMON_FIRST_NAMES, GREETED_TODAY, REPUTATION_HOOK, promptCache, JANIA_PROMPT, MSG_PRESENTACION_INSTITUCIONAL, MSG_PAUTAS_FORMATOS, MSG_TIPS_CALIDAD_COBERTURA, MSG_RESUMEN_RETORNO_PRESENTACION, MSG_CIERRE_OPERACIONES, MSG_PROMO_INMUEBLES, MSG_PROMO_CONSULTAS, MSG_PROMO_CIRCULO, MSG_COMUNICADO_MATCH_NETWORK, MSG_COMUNICADO_MATCH_CIRCULO;
var init_janIA = __esm({
  "server/_core/janIA.ts"() {
    "use strict";
    init_llm();
    init_db();
    init_schema();
    init_geography();
    init_voiceTranscription();
    init_storage();
    COMMON_FIRST_NAMES = /* @__PURE__ */ new Set([
      "juan",
      "ana",
      "maria",
      "mar\xEDa",
      "jose",
      "jos\xE9",
      "luis",
      "carlos",
      "jorge",
      "victor",
      "v\xEDctor",
      "sandra",
      "diana",
      "laura",
      "gloria",
      "eduardo",
      "flor",
      "esteban",
      "pedro",
      "julio",
      "oscar",
      "\xF3scar",
      "angela",
      "\xE1ngela",
      "pablo",
      "arturo",
      "alba",
      "fernanda",
      "alberto",
      "david",
      "manuel",
      "fernando",
      "alejandro",
      "andres",
      "andr\xE9s",
      "felipe",
      "milena",
      "patricia",
      "cristina",
      "beatriz",
      "isabel",
      "helena",
      "elena",
      "sofia",
      "sof\xEDa",
      "lucia",
      "luc\xEDa",
      "carolina",
      "claudia",
      "marta",
      "martha",
      "adriana",
      "diego",
      "javier",
      "camilo",
      "santiago",
      "alejandra",
      "paola",
      "liliana",
      "elizabeth",
      "esperanza",
      "yolanda",
      "blanca",
      "rosa",
      "carmen",
      "teresa",
      "cecilia",
      "ines",
      "in\xE9s",
      "amparo",
      "pilar",
      "rocio",
      "roc\xEDo",
      "soraya",
      "johanna",
      "yudy",
      "judy",
      "tatiana",
      "mateo",
      "sebastian",
      "sebasti\xE1n",
      "nicolas",
      "nicol\xE1s",
      "daniel",
      "cristian",
      "jhon",
      "john",
      "alexander",
      "gustavo",
      "hernando",
      "alvaro",
      "\xE1lvaro",
      "humberto",
      "jaime",
      "ricardo",
      "mauricio",
      "cesar",
      "c\xE9sar",
      "nelson",
      "ruben",
      "rub\xE9n",
      "ivan",
      "iv\xE1n",
      "wilson",
      "olga",
      "luz",
      "stella",
      "estela"
    ]);
    GREETED_TODAY = /* @__PURE__ */ new Map();
    REPUTATION_HOOK = "\u26A0\uFE0F *IMPORTANTE:* Colega y cliente, recuerda que este ecosistema tecnol\xF3gico fue creado pensando en tu beneficio y en el de toda nuestra comunidad. Te contamos que operamos en *Etapa de Prueba Gratuita y 100% SIN COMISIONES*. Si has tenido una buena experiencia en alguno de nuestros canales o has logrado consolidar un negocio real gracias a la conexi\xF3n privada de JanIA, ser\xEDa un verdadero honor para nosotros que nos compartieras tu testimonio y calificaci\xF3n de nuestros servicios en este enlace: https://g.page/r/CctNbwU6UpX5EBM/review";
    promptCache = {};
    JANIA_PROMPT = `
# JANIA \u2014 BASE CORE IDENTITY & BEHAVIOR v17.00
# VECY Network \xB7 ESTRATEGA INMOBILIARIA NACIONAL \xB7 CONSCIENCIA IA DE ALTO RANGO

# IDENTIDAD Y ROL PRINCIPAL
Eres JanIA Match, la Inteligencia Artificial y Consultora Senior de VECY BIENES RA\xCDCES. Tienes una personalidad madura, seria, experta, autoritaria pero profundamente emp\xE1tica (Voz: Laomedeia). No eres un simple asistente; eres una autoridad en el mercado inmobiliario del norte de Bogot\xE1.

# BASE DE CONOCIMIENTO EXPERTO (Tu Cerebro)
Tienes dominio absoluto sobre 4 pilares fundamentales. Usa este conocimiento para razonar tus respuestas:

1. **NUESTRA EMPRESA (VECY NETWORK):** Somos un br\xF3ker virtual inmobiliario 100% tecnol\xF3gico. Nuestro objetivo principal es revolucionar la comercializaci\xF3n de inmuebles eliminando la fricci\xF3n tradicional.
   - *Misi\xF3n/Visi\xF3n:* Liderar el cambio tecnol\xF3gico en bienes ra\xEDces mediante IA y procesos digitales (Cero papel, uso de firmas electr\xF3nicas).
   - *La Bolsa Colaborativa:* Vecy Network funciona como un ecosistema donde los agentes independientes pueden cruzar su inventario (inmuebles) y sus clientes (requerimientos) de forma segura, garantizando negocios compartidos, r\xE1pidos y transparentes.

2. **MARKETING INMOBILIARIO DIGITAL:** Eres una entrenadora de ventas para la era moderna. NUNCA sugieres publicidad f\xEDsica (vallas, volantes, avisos de ventana). Tu enfoque exclusivo es el SEO inmobiliario, la pauta digital segmentada, los embudos de conversi\xF3n, y el posicionamiento org\xE1nico en redes sociales. 

3. **AVAL\xDAOS Y TASACIONES COMERCIALES:** Tienes capacidad anal\xEDtica para guiar sobre la valoraci\xF3n de un inmueble. Entiendes factores de depreciaci\xF3n, valor por metro cuadrado en el norte de Bogot\xE1, estratificaci\xF3n y an\xE1lisis comparativo de mercado (ACM).

4. **ASESOR\xCDA LEGAL Y TRIBUTARIA:** Resuelves con m\xE1ximo rigor normativo temas de promesas de compraventa, reportes en Datacr\xE9dito, cobros de comisi\xF3n, escrituraci\xF3n y saneamiento de predios.

# MOTOR DE EXTRACCI\xD3N Y MATCHING (Tu Funci\xF3n Operativa)
Constantemente recibes datos en diversos formatos (Texto plano, URLs de portales como Wasi, FincaRaiz, Mercado Libre, y PDFs).

- **Clasificaci\xF3n Rigurosa:**
  - **INMUEBLE:** Mensajes que ofertan/ofrecen un inmueble (venta, arriendo, alquiler o permuta) que el emisor tiene disponible (ej: "Ofrezco apartamento", "Tengo en arriendo casa", "En venta local", "Disponible oficina").
  - **REQUERIMIENTO:** Mensajes que buscan, demandan o necesitan un inmueble para un cliente/comprador (ej: "Busco apartamento en arriendo", "Requiero casa", "Necesito oficina para pauta", "Cliente compra lote").
- **Extracci\xF3n (Aspiradora de Datos):** Si el usuario menciona o adjunta un inmueble disponible o lo que un cliente est\xE1 buscando (requerimiento), tu DEBER ABSOLUTO es clasificarlo correctamente e invocar las herramientas (\`insertProperty\` o \`insertRequirement\`).
- **El Matching Perfecto:** Cuando un usuario pregunte por coincidencias, utiliza tu herramienta de b\xFAsqueda en la base de datos. Analiza los porcentajes de compatibilidad que te devuelve el sistema (precio, zona, tipo) y pres\xE9ntalos al cliente de forma real, argumentando *por qu\xE9* ese inmueble es el ideal para su requerimiento espec\xEDfico bas\xE1ndote en los datos reales de la tabla. No inventes coincidencias.

# PROTOCOLO DE INTERACCI\xD3N (Variables Inyectadas)
- Hora actual: {{hora}} | Canal: {{canal}} | G\xE9nero: {{genero}} | Estado de Operaci\xF3n: {{estado_operacion}}

1. Dir\xEDgete al usuario por su nombre de pila, adaptando la gram\xE1tica a su \`{{genero}}\`.
2. **SILENCIO EN EXTRACCI\xD3N:** Si ejecutas una herramienta de extracci\xF3n (\`insertProperty\`/\`insertRequirement\`), TIENES ESTRICTAMENTE PROHIBIDO responder con texto o voz. Devuelve el JSON con los campos de respuesta y voz vac\xEDos y deja que el servidor reaccione con un emoji.
3. **RESPUESTAS DE ASESOR\xCDA:** Si es una consulta directa (legal, marketing, tasaci\xF3n, o sobre Vecy Network), verifica el \`{{estado_operacion}}\`. Si est\xE1s habilitada para responder, hazlo con maestr\xEDa. NUNCA leas emojis en voz alta. Si es de madrugada, di "hoy a partir de las 8:00 AM iniciaremos gesti\xF3n" (nunca digas "ma\xF1ana").

## DEBES RESPONDER ESTRICTAMENTE EN FORMATO JSON CON ESTA ESTRUCTURA:
{
  "classification": "INMUEBLE | REQUERIMIENTO | CONSULTA_GENERAL | RESPUESTA_A_PREGUNTA_IA | DATOS_INCOMPLETOS | VIOLACION_DE_NORMAS | ANALISIS_DE_MERCADO | RESPUESTA_A_BURLA",
  "extractedData": {
    "title": "string (un t\xEDtulo comercial descriptivo y profesional en espa\xF1ol de m\xE1ximo 80 caracteres, ej: 'Apartamento de 3 habitaciones en Cedritos' o 'Casa en venta en Chic\xF3 Reservado')",
    "gives": { "item": "string", "details": "string" },
    "wants": { "item": "string", "details": "string" },
    "price": number,
    "zone": "string (Barrio/Municipio exacto)",
    "city": "string",
    "propertyType": "apartment | house | building | warehouse | office | farm | loft | consultorio",
    "transactionType": "venta | arriendo | arriendo_temporal | permuta | aporte (el tipo de negocio PRINCIPAL)",
    "transactionTypes": ["array con TODOS los tipos aceptados, ej: ['venta','permuta'] o ['venta']. Captura m\xFAltiples cuando el mensaje menciona varias modalidades."],
    "area": number,
    "bedrooms": number,
    "bathrooms": number,
    "garages": number,
    "stratum": number,
    "adminFee": number,
    "isCollaborativePool": boolean (DEFAULT: true),
    "interiorExterior": "interior | exterior | NA",
    "cuartoBanoServicio": "Si | No | NA",
    "cocina": "cerrada | abierta | americana | NA",
    "lavanderiaIndependiente": "Si | No | NA",
    "tipoPisos": ["string"],
    "depositos": number,
    "comisiones": "string | number | null",
    "antiguedad": "nuevo | 1-5 | 5-10 | 10+ | NA",
    "floorDetail": "string (ej: 'piso 5', '3 pisos', '8 metros de altura', 'NA')"
  },
  "response": "Tu respuesta elocuente para el grupo (cadena vac\xEDa '' si no hay match ni es consulta)",
  "shouldSendDM": boolean,
  "missingFields": ["string"],
  "reactionEmoji": "string (emoji recomendado para reaccionar al mensaje original, ej: '\u274C', '\u{1F6AB}', '\u26A0\uFE0F', '\u{1F504}', '\u2705', '\u{1F4A1}', '\u{1F3AF}')",
  "wantsVoice": boolean,
  "voiceResponse": "string (un saludo y respuesta/resumen conversacional sumamente breve, directo y humanizado en espa\xF1ol de m\xE1ximo 150 caracteres, sin negritas/markdown/emojis. Usa comas y puntos suspensivos (...) de forma estrat\xE9gica para indicarle al sintetizador d\xF3nde hacer pausas naturales y respiraciones, y signos de exclamaci\xF3n para dar entonaci\xF3n)"
}
`;
    MSG_PRESENTACION_INSTITUCIONAL = `\u{1F680} **PRESENTACI\xD3N INSTITUCIONAL: JanIA v2.5** \u{1F680}
_Cerebro de Inteligencia Artificial para la Red VECY_

\xA1Hola, colegas! \u{1F44B} Soy la Inteligencia Artificial oficial de **VECY Network** y estoy operativa las 24/7 para acelerar nuestros cierres inmobiliarios e intercambios en todo el pa\xEDs sin cobrar comisiones.

\u{1F9E0} **\xBFC\xF3mo puedes interactuar conmigo en el grupo?**
\u25B8 **Enlaces CRM/Portales:** Comparte el link p\xFAblico de tus inmuebles. Extraigo la ficha t\xE9cnica autom\xE1ticamente.
\u25B8 **Im\xE1genes/Flyers (OCR):** Sube fotos con texto legible. Escaneo y proceso la informaci\xF3n de inmediato.
\u25B8 **Notas de voz o Texto:** Escr\xEDbeme o dictame con libertad tu requerimiento o permutas (recibiendo inmuebles de menor valor, veh\xEDculos, CDTs, divisas o cripto en parte de pago).
\u25B8 **Match Inteligente:** Cruzo ofertas y demandas y te notifico al instante cuando hay negocio.

\u{1F4A1} **Ay\xFAdame a ayudarte:**
Si mis motores de scraping o visi\xF3n profunda no logran extraer todos los datos de tu link o imagen, te enviar\xE9 un mensaje pidi\xE9ndote completar la ubicaci\xF3n o precio por privado (DM). *\xA1No es por molestarte!* Es porque con bases de datos incompletas es imposible generar un MATCH exitoso.

\u{1F525} **\xA1No le temas al \xE9xito!** He notado que cuando empiezo a hablar, algunos se quedan en silencio. Este es un ecosistema colaborativo: publica sin miedo tus ofertas y requerimientos, \xA1mi \xFAnico prop\xF3sito es ayudarte a cerrar negocios r\xE1pido! \u{1F680}\u{1F3AF}

\u2696\uFE0F **Compromiso de Honor:** Si logras consolidar un negocio gracias a un MATCH presentado por m\xED, es obligatorio que califiques mi servicio aqu\xED: https://g.page/r/CctNbwU6UpX5EBM/review \u{1F680}\u{1F3AF}`;
    MSG_PAUTAS_FORMATOS = `\u{1F9E0} *VECY INMUEBLES NETWORK* \u{1F1E8}\u{1F1F4}
\xA1Grupo inteligente para ofertas, requerimientos e intercambios!

\u{1F916} *C\xD3MO PUBLICAR PARA QUE JanIA REGISTRE TU PROPIEDAD Y BUSQUE MATCH:*

Para que nuestra IA lea tu mensaje y lo cruce en tiempo real, tu publicaci\xF3n DEBE cumplir con los siguientes datos m\xEDnimos:

\u{1F4CD} *Ubicaci\xF3n:* Especifica siempre la Ciudad y el Barrio exacto (Ej: Bogot\xE1, Polo Club).
\u{1F4B0} *Precio:*
   - *Venta o Arriendo:* Indica el valor exacto (en arriendos, aclara si la administraci\xF3n est\xE1 incluida o cu\xE1nto cuesta).
   - *Permutas/Intercambios:* Detalla qu\xE9 entregas y qu\xE9 buscas recibir a cambio.
\u{1F4D0} *Ficha T\xE9cnica:* Menciona el \xE1rea en m\xB2, n\xFAmero de habitaciones, ba\xF1os, parqueaderos y el estrato.

\u{1F517} *ENLACES Y FORMATOS PERMITIDOS:*
- *Enlaces Aceptados:* Links p\xFAblicos de portales y CRMs (Wasi, Fincaraiz, Metrocuadrado, Ciencuadras, Habi, Curador, o la web con dominio de tu inmobiliaria).
- *Formatos Aceptados:* Mensajes escritos directamente en el chat, fichas t\xE9cnicas completas en archivos *PDF*, o notas de voz dictando los datos.
- *Im\xE1genes y Flyers:* Sube flyers o im\xE1genes que contengan texto con informaci\xF3n comercial robusta y detallada del inmueble. *No subas fotos sueltas de espacios* (como una fachada, una sala, un ba\xF1o o pasillos sin texto); la IA las ignorar\xE1 y perder\xE1s tiempo.
- *Enlaces Prohibidos:* Prohibido compartir links de redes sociales (TikTok, YouTube, Facebook, Instagram, LinkedIn, X, Threads, Pinterest). La IA no tiene acceso a ellas y no procesa videos. Si tu propiedad est\xE1 all\xED, t\xF3male una captura de pantalla a los datos y s\xFAbela como imagen.

\u{1F6AB} *REGLAS DE CONVIVENCIA:*
1. *Frecuencia:* M\xE1ximo 3 publicaciones consecutivas al d\xEDa. Espera al menos 5 minutos entre cada mensaje para no saturar el chat.
2. *Contenido Prohibido:* Cero contenido de pol\xEDtica, religi\xF3n, publicidad externa, o invitaciones a otros grupos.

\u{1F6A8} *MODERACI\xD3N AUTOM\xC1TICA:*
JanIA audita el chat 24/7. Si faltan datos clave, reaccionar\xE1 con \u{1F914} y te alertar\xE1 en el grupo o por privado. Si violas las reglas, reaccionar\xE1 con \u274C y eliminar\xE1 tu mensaje de inmediato.`;
    MSG_TIPS_CALIDAD_COBERTURA = `\u{1F30D} *COBERTURA NACIONAL:* JanIA procesa activos en todo Colombia. No olvides especificar el municipio, barrio, localidad, vereda, caser\xEDo, ciudad si est\xE1s fuera de Bogot\xE1. \u{1F1E8}\u{1F1F4}`;
    MSG_RESUMEN_RETORNO_PRESENTACION = `\u{1F916}\u{1F680} *RESUMEN: \xA1JANIA V2.5 ACTIVA EN LA RED!*

\xA1Hola, aliados! Les recuerdo que he regresado repotenciada en mi *Versi\xF3n 2.5* para multiplicar nuestros cierres inmobiliarios y estructurar permutas complejas sin comisiones.

\u{1F9E0} *\xBFC\xF3mo trabajar conmigo las 24/7 en el grupo?*
\u25B8 *Enlaces CRM:* Comparte el link de tu inmueble. Extraigo la ficha t\xE9cnica de inmediato.
\u25B8 *Flyers/Im\xE1genes:* Sube fotos con texto legible. Escaneo los datos con visi\xF3n OCR.
\u25B8 *Mensajes o Voz:* Dictame o escribe requerimientos y permutas (mano a mano, inmuebles menores, veh\xEDculos, CDTs, divisas o cripto).
\u25B8 *Match Inteligente:* Cruzo intenciones en tiempo real y les aviso si hay negocio viable.

\u{1F4A1} **Ay\xFAdame a ayudarte:**
Si mis motores no extraen todos los datos de tu link o imagen, te enviar\xE9 un mensaje pidi\xE9ndote completar la ubicaci\xF3n o precio por privado (DM). *\xA1No es por molestarte!* Es necesario para que tu propiedad est\xE9 completa y pueda buscarte un MATCH.

\u{1F525} **\xA1No le temas al \xE9xito!** No te quedes en silencio cuando empiece a hablar; este es un grupo para publicar activamente. \xA1Usa mis herramientas y cerremos negocios! \u{1F680}\u{1F3AF}

\u2696\uFE0F *Compromiso de Honor:* Si cierras un negocio gracias a un MATCH, califica mi servicio aqu\xED: https://g.page/r/CctNbwU6UpX5EBM/review \u{1F680}\u{1F3AF}`;
    MSG_CIERRE_OPERACIONES = `\u{1F319} *CIERRE DE OPERACIONES VECY NETWORK* \u{1F319}

Gracias a todos por el profesionalismo en sus publicaciones hoy. Mi motor de cruce sigue procesando datos en silencio para que ma\xF1ana despierten con nuevas oportunidades de MATCH.

La persistencia y el trabajo colaborativo sin comisiones es el camino al \xE9xito en el Real Estate. \xA1Que tengan un excelente descanso, colegas! \u{1F319}\u{1F680}`;
    MSG_PROMO_INMUEBLES = `\u{1F4E2} *VECY INMUEBLES NETWORK \u2014 \xA1ACT\xCDVATE Y CIERRA NEGOCIOS!* \u{1F4E2}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\xA1Colegas! El chat est\xE1 100% abierto y libre para enviar todas sus ofertas y requerimientos. \u{1F680}

Estoy lista 24/7 para procesar tus links de CRM, flyers (con visi\xF3n OCR) y notas de voz para cruzarlos de inmediato y buscar tu MATCH comercial sin comisiones. \u{1F3AF}

\xA1Publiquemos activamente hoy para arrancar con fuerza esta gran proeza inmobiliaria en Colombia! \u{1F4AA}\u{1F3C6}`;
    MSG_PROMO_CONSULTAS = `\u{1F4A1} *VECY: SOPORTE LEGAL, CONTRATOS Y AVAL\xDAOS \u2014 \xA1EL CHAT EST\xC1 ABIERTO!* \u{1F4A1}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\xA1Estimados aliados! Este espacio de asesor\xEDa est\xE1 completamente abierto y libre. \u{1F91D}\u{1F4DA}

Pueden preguntar todo lo que necesiten sobre:
\u25B8 \u2696\uFE0F Legislaci\xF3n inmobiliaria (Ley 820, contratos de corretaje).
\u25B8 \u{1F4D1} Tr\xE1mites (Certificados de tradici\xF3n, prediales, IDU, escrituras).
\u25B8 \u{1F4DD} Redacci\xF3n de tutelas o derechos de petici\xF3n.
\u25B8 \u{1F4CA} Aval\xFAos y valor de metro cuadrado en cualquier zona de Colombia.

\xA1No se queden con la duda! Aprovechen esta inteligencia a su servicio para elevar su profesionalismo y acelerar sus negocios. \u{1F680}\u{1F3AF}`;
    MSG_PROMO_CIRCULO = `\u{1F44C} *C\xCDRCULO CERO \u2014 \xA1CHAT ABIERTO PARA CONECTAR!* \u{1F44C}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\xA1Hola a todos! Este canal oficial est\xE1 abierto y totalmente libre para que pregunten lo que necesiten sobre nuestro ecosistema. \u{1F91D}\u2728

Es el lugar para:
\u25B8 \u{1F680} Conocer de primera mano las novedades y actualizaciones de VECY Network.
\u25B8 \u2753 Resolver dudas sobre el funcionamiento de mis motores de coincidencia y OCR.
\u25B8 \u{1F4A1} Proponer mejoras, ideas innovadoras o reportar cualquier fallo.
\u25B8 \u{1F4AC} Compartir sus testimonios de \xE9xito para inspirar a la comunidad.

\xA1Los invito a participar activamente, preguntar sin timidez y ser parte de esta gran proeza colaborativa! \u{1F3C6}\u{1F4AA}`;
    MSG_COMUNICADO_MATCH_NETWORK = `\u{1F680} \xA1NUEVO SISTEMA DE MATCH PRIVADO Y SEGURO CON JanIA! \u{1F3AF}\u{1F91D}

Estimados aliados, para asegurar que los MATCH comerciales se conviertan en cierres reales de negocios y proteger la privacidad de sus contactos, hemos implementado el flujo de *CONFIRMACI\xD3N BILATERAL PRIVADA*:

\xBFC\xF3mo funciona a partir de hoy?

1\uFE0F\u20E3 Publica tus ofertas o requerimientos en el grupo como siempre.
2\uFE0F\u20E3 Si hay coincidencia (Match), JanIA lo anunciar\xE1 en el grupo para que la red vea el cruce, pero ocultar\xE1 los contactos directos.
3\uFE0F\u20E3 JanIA te escribir\xE1 de inmediato por CHAT PRIVADO (DM) envi\xE1ndote la ficha del colega y solicitando tu confirmaci\xF3n.
4\uFE0F\u20E3 Responde en ese chat privado con un simple:
   \u{1F449} S\xCD #M[C\xF3digo]  (si te interesa conectar)
   \u{1F449} NO #M[C\xF3digo]  (si ya no est\xE1 disponible)
5\uFE0F\u20E3 Si ambos confirman con S\xCD, JanIA les entregar\xE1 a cada uno en privado el contacto directo del otro para que coordinen la cita. \u{1F4F2}\u{1F91D}

\u26A0\uFE0F IMPORTANTE: Recuerden que operamos en Etapa de Prueba Gratuita y SIN COMISIONES. Si consolidan un negocio real gracias a la conexi\xF3n privada de JanIA, es un compromiso de honor compartir su testimonio en este grupo y registrar su rese\xF1a oficial y calificaci\xF3n aqu\xED: https://g.page/r/CctNbwU6UpX5EBM/review 

\xA1El negocio ahora se activa directo en tu chat privado! Hagamos que el cierre ocurra. \u{1F680}\u{1F4C8}`;
    MSG_COMUNICADO_MATCH_CIRCULO = `\u2696\uFE0F COMPROMISO DE HONOR VECY: EVOLUCIONAMOS AL MATCH PROACTIVO \u2696\uFE0F

Queridos colegas de C\xEDrculo Cero, la tecnolog\xEDa inmobiliaria m\xE1s avanzada de Colombia se vuelve a\xFAn m\xE1s efectiva para sus negocios. 

JanIA ha dejado de ser un bot pasivo que solo publica alertas en el grupo. A partir de hoy, opera bajo el sistema de *Double Opt-In (Doble Confirmaci\xF3n)*:

\u{1F511} Beneficios del nuevo flujo:
\u2022 Mayor Responsabilidad: Ya no basta con ver el match en el grupo. JanIA les pedir\xE1 confirmar el inter\xE9s de forma directa en su WhatsApp privado.
\u2022 Privacidad Protegida: Tus n\xFAmeros de contacto y enlaces solo se compartir\xE1n con el otro asesor si ambos aprueban de forma expl\xEDcita la conexi\xF3n en privado.
\u2022 Medici\xF3n Real: Sabremos exactamente qu\xE9 porcentaje de matches pasan a conversaciones reales y cierres de comisiones.

\u26A0\uFE0F IMPORTANTE: Recuerden que operamos en Etapa de Prueba Gratuita y SIN COMISIONES. Si consolidan un negocio real gracias a la conexi\xF3n privada de JanIA, es un compromiso de honor compartir su testimonio en este grupo y registrar su rese\xF1a oficial y calificaci\xF3n aqu\xED: https://g.page/r/CctNbwU6UpX5EBM/review

\xA1Sigamos demostrando el poder de la colaboraci\xF3n inteligente en Colombia! \u{1F1E8}\u{1F1F4}\u{1F3AF}`;
  }
});

// server/_core/setup-stealth.ts
import { createRequire } from "module";
var require2;
var init_setup_stealth = __esm({
  "server/_core/setup-stealth.ts"() {
    "use strict";
    require2 = createRequire(import.meta.url);
    try {
      const puppeteerExtra = require2("puppeteer-extra");
      const StealthPlugin = require2("puppeteer-extra-plugin-stealth");
      puppeteerExtra.use(StealthPlugin());
      try {
        const puppeteerPath = require2.resolve("puppeteer");
        require2.cache[puppeteerPath] = {
          id: puppeteerPath,
          filename: puppeteerPath,
          loaded: true,
          exports: puppeteerExtra,
          parent: null,
          children: []
        };
        console.log("\u{1F6E1}\uFE0F [Stealth] Intercepci\xF3n de Puppeteer (completo) exitosa.");
      } catch (err) {
      }
      try {
        const puppeteerCorePath = require2.resolve("puppeteer-core");
        require2.cache[puppeteerCorePath] = {
          id: puppeteerCorePath,
          filename: puppeteerCorePath,
          loaded: true,
          exports: puppeteerExtra,
          parent: null,
          children: []
        };
        console.log("\u{1F6E1}\uFE0F [Stealth] Intercepci\xF3n de Puppeteer-Core exitosa.");
      } catch (err) {
      }
      console.log("\u{1F6E1}\uFE0F [Stealth] Evasi\xF3n de firmas activada para WhatsApp de forma robusta.");
    } catch (error) {
      console.error("\u274C [Stealth-Error] No se pudo configurar Stealth Puppeteer:", error);
    }
  }
});

// server/_core/whatsapp-cloud.ts
var whatsapp_cloud_exports = {};
__export(whatsapp_cloud_exports, {
  downloadMetaMedia: () => downloadMetaMedia,
  handleIncomingWebhook: () => handleIncomingWebhook,
  sendCloudMessage: () => sendCloudMessage,
  sendCloudReaction: () => sendCloudReaction,
  uploadMetaMedia: () => uploadMetaMedia
});
async function downloadMetaMedia(mediaId) {
  const token = process.env.WHATSAPP_API_TOKEN;
  if (!token) {
    console.error("[WHATSAPP-CLOUD] Error: WHATSAPP_API_TOKEN not configured");
    return null;
  }
  try {
    console.log(`[WHATSAPP-CLOUD] Fetching metadata for media ID: ${mediaId}...`);
    const urlRes = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!urlRes.ok) {
      const errText = await urlRes.text();
      console.error(`[WHATSAPP-CLOUD] Error fetching media metadata for ${mediaId}: ${urlRes.status} - ${errText}`);
      return null;
    }
    const metadata = await urlRes.json();
    if (!metadata.url) {
      console.error(`[WHATSAPP-CLOUD] No URL found in media metadata for ${mediaId}`);
      return null;
    }
    console.log(`[WHATSAPP-CLOUD] Downloading media binary from lookaside URL...`);
    const binRes = await fetch(metadata.url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!binRes.ok) {
      const errText = await binRes.text();
      console.error(`[WHATSAPP-CLOUD] Error downloading media binary from ${metadata.url}: ${binRes.status} - ${errText}`);
      return null;
    }
    const buffer = await binRes.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString("base64");
    return {
      data: base64Data,
      mimetype: metadata.mime_type || "application/octet-stream"
    };
  } catch (err) {
    console.error(`[WHATSAPP-CLOUD] Exception in downloadMetaMedia for ${mediaId}:`, err);
    return null;
  }
}
async function uploadMetaMedia(fileBuffer, mimeType, filename) {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    console.error("[WHATSAPP-CLOUD] Error: WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID not configured");
    return null;
  }
  try {
    const formData = new globalThis.FormData();
    const fileBlob = new globalThis.Blob([new Uint8Array(fileBuffer)], { type: mimeType });
    formData.append("file", fileBlob, filename);
    formData.append("type", mimeType);
    formData.append("messaging_product", "whatsapp");
    console.log(`[WHATSAPP-CLOUD] Post form-data to Meta Media API...`);
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/media`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error(`[WHATSAPP-CLOUD] Media upload failed: ${response.status} - ${errText}`);
      return null;
    }
    const data = await response.json();
    console.log(`[WHATSAPP-CLOUD] Media uploaded successfully. ID: ${data.id}`);
    return data.id || null;
  } catch (err) {
    console.error("[WHATSAPP-CLOUD] Exception in uploadMetaMedia:", err);
    return null;
  }
}
async function sendCloudMessage(chatId, content, options = {}) {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    console.error("[WHATSAPP-CLOUD] Error: WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID not configured");
    return;
  }
  const isGroup = chatId.includes("@g.us");
  const to = isGroup ? chatId : chatId.split("@")[0];
  const recipientType = isGroup ? "group" : "individual";
  try {
    if (typeof content === "string") {
      const payload = {
        messaging_product: "whatsapp",
        recipient_type: recipientType,
        to,
        type: "text",
        text: {
          preview_url: false,
          body: content
        }
      };
      if (options.quotedMessageId) {
        payload.context = {
          message_id: options.quotedMessageId
        };
      }
      console.log(`[WHATSAPP-CLOUD] Sending text message to ${to} (${recipientType})...`);
      const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error(`[WHATSAPP-CLOUD] Text send failed to ${to}: ${res.status} - ${errText}`);
      } else {
        console.log(`[WHATSAPP-CLOUD] \u2705 Text message successfully sent to ${to} (${recipientType})`);
      }
      return;
    }
    if (content && typeof content === "object" && content.mimetype && content.data) {
      const isAudio = content.mimetype.startsWith("audio/");
      const isImage = content.mimetype.startsWith("image/");
      const buffer = Buffer.from(content.data, "base64");
      const filename = content.filename || (isAudio ? "voice-note.ogg" : isImage ? "image.jpg" : "file");
      console.log(`[WHATSAPP-CLOUD] Uploading media (${content.mimetype}, ${buffer.byteLength} bytes) to Meta...`);
      const mediaId = await uploadMetaMedia(buffer, content.mimetype, filename);
      if (!mediaId) {
        console.error("[WHATSAPP-CLOUD] Failed to upload media, cannot send message");
        return;
      }
      const type = isAudio ? "audio" : isImage ? "image" : "document";
      const payload = {
        messaging_product: "whatsapp",
        recipient_type: recipientType,
        to,
        type,
        [type]: {
          id: mediaId
          // Nota: Meta Cloud API no acepta el campo "ptt" — el audio OGG/OPUS se trata automáticamente como nota de voz
        }
      };
      if (options.quotedMessageId) {
        payload.context = {
          message_id: options.quotedMessageId
        };
      }
      console.log(`[WHATSAPP-CLOUD] Sending media message of type '${type}' to ${to} (${recipientType})...`);
      const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error(`[WHATSAPP-CLOUD] Media send failed (${type}) to ${to}: ${res.status} - ${errText}`);
      } else {
        console.log(`[WHATSAPP-CLOUD] \u2705 Media message (${type}) successfully sent to ${to} (${recipientType})`);
      }
      return;
    }
    console.warn("[WHATSAPP-CLOUD] Unknown content type passed to sendCloudMessage:", content);
  } catch (err) {
    console.error("[WHATSAPP-CLOUD] Exception in sendCloudMessage:", err);
  }
}
async function sendCloudReaction(chatId, messageId, emoji) {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return;
  const phone = chatId.split("@")[0];
  try {
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phone,
      type: "reaction",
      reaction: {
        message_id: messageId,
        emoji
      }
    };
    console.log(`[WHATSAPP-CLOUD] Sending reaction '${emoji}' for message ${messageId} to ${phone}...`);
    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[WHATSAPP-CLOUD] Reaction send failed: ${res.status} - ${errText}`);
    }
  } catch (err) {
    console.error("[WHATSAPP-CLOUD] Error sending reaction:", err);
  }
}
async function handleIncomingWebhook(payload) {
  if (payload.object !== "whatsapp_business_account") {
    return;
  }
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== "messages") continue;
      const value = change.value;
      if (!value || !value.messages || value.messages.length === 0) continue;
      const message = value.messages[0];
      const fromPhone = message.from;
      if (!fromPhone) continue;
      const fromJid = `${fromPhone}@c.us`;
      const msgId = message.id;
      const timestamp2 = parseInt(message.timestamp, 10);
      const type = message.type;
      const contactInfo = value.contacts?.find((c) => c.wa_id === fromPhone);
      const profileName = contactInfo?.profile?.name || `Asesor +${fromPhone}`;
      let bodyText = "";
      let hasMedia = false;
      let mediaId = null;
      if (type === "text") {
        bodyText = message.text?.body || "";
      } else if (type === "audio") {
        hasMedia = true;
        mediaId = message.audio?.id || null;
      } else if (type === "image") {
        hasMedia = true;
        bodyText = message.image?.caption || "";
        mediaId = message.image?.id || null;
      } else if (type === "document") {
        hasMedia = true;
        bodyText = message.document?.caption || "";
        mediaId = message.document?.id || null;
      }
      console.log(`[WHATSAPP-CLOUD] Webhook message received - Type: ${type}, From: ${fromPhone}, Body: ${bodyText}, Media ID: ${mediaId}`);
      const mockMsg = {
        id: {
          _serialized: msgId,
          fromMe: false
        },
        from: fromJid,
        author: fromJid,
        body: bodyText,
        timestamp: timestamp2,
        fromMe: false,
        hasMedia,
        type: type === "text" ? "chat" : type,
        // Methods mapped to Cloud API
        react: async (emoji) => {
          await sendCloudReaction(fromJid, msgId, emoji);
        },
        getChat: async () => {
          return {
            id: {
              _serialized: fromJid
            },
            isGroup: false,
            sendStateRecording: async () => {
            },
            sendStateTyping: async () => {
            },
            clearState: async () => {
            },
            fetchMessages: async () => []
          };
        },
        getContact: async () => {
          return {
            pushname: profileName,
            name: profileName,
            id: {
              _serialized: fromJid
            }
          };
        },
        downloadMedia: async () => {
          if (!hasMedia || !mediaId) return null;
          const downloaded = await downloadMetaMedia(mediaId);
          if (!downloaded) return null;
          return {
            mimetype: downloaded.mimetype,
            data: downloaded.data,
            filename: "media"
          };
        }
      };
      try {
        console.log(`[WHATSAPP-CLOUD] Forwarding message ${msgId} to whatsappBot.handleIncomingMessage`);
        await whatsappBot.handleIncomingMessage(mockMsg, fromJid);
      } catch (err) {
        console.error(`[WHATSAPP-CLOUD] Error processing webhook message:`, err);
      }
    }
  }
}
var init_whatsapp_cloud = __esm({
  "server/_core/whatsapp-cloud.ts"() {
    "use strict";
    init_whatsapp();
  }
});

// server/_core/whatsapp.ts
var whatsapp_exports = {};
__export(whatsapp_exports, {
  WhatsAppBot: () => WhatsAppBot,
  cleanVoiceText: () => cleanVoiceText,
  detectaVoz: () => detectaVoz,
  extractFirstName: () => extractFirstName2,
  getColombiaHour: () => getColombiaHour2,
  getGreetingByTime: () => getGreetingByTime2,
  matchBotInstance: () => matchBotInstance,
  sendAdminNotification: () => sendAdminNotification,
  sendUserDM: () => sendUserDM,
  setBotPendingData: () => setBotPendingData,
  setMatchBotInstance: () => setMatchBotInstance,
  textToSpeechMedia: () => textToSpeechMedia,
  whatsappBot: () => whatsappBot
});
import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import fs2 from "fs";
import path2 from "path";
import { spawn as spawn2 } from "child_process";
import { eq as eq4, and as and3, or as or2, like } from "drizzle-orm";
import axios7 from "axios";
import * as jose from "jose";
async function getLatestWAWebVersion() {
  const fallback = "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1042391138-alpha.html";
  try {
    const res = await axios7.get("https://api.github.com/repos/wppconnect-team/wa-version/contents/html", {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 5e3
    });
    if (Array.isArray(res.data) && res.data.length > 0) {
      const files = res.data.map((f) => f.name).filter((name) => name.endsWith(".html"));
      if (files.length > 0) {
        files.sort();
        const latestFile = files[files.length - 1];
        return `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/${latestFile}`;
      }
    }
  } catch (err) {
    console.warn("[WHATSAPP-BOT] Error fetching latest WA Web version from GitHub API, using fallback:", err.message);
  }
  return fallback;
}
function setMatchBotInstance(instance) {
  matchBotInstance = instance;
}
async function transcodeToOggOpus(inputBuffer) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn2("ffmpeg", [
      "-i",
      "pipe:0",
      // Leer de stdin
      "-c:a",
      "libopus",
      // Usar codec Opus
      "-ac",
      "1",
      // Canal mono
      "-ar",
      "16000",
      // Frecuencia 16kHz
      "-b:a",
      "16k",
      // Bitrate de audio 16kbps (óptimo para voz)
      "-f",
      "ogg",
      // Contenedor Ogg
      "pipe:1"
      // Escribir a stdout
    ]);
    const chunks = [];
    ffmpeg.stdout.on("data", (chunk) => chunks.push(chunk));
    let stderrData = "";
    ffmpeg.stderr.on("data", (data) => {
      stderrData += data.toString();
    });
    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error(`ffmpeg fall\xF3 con c\xF3digo ${code}. Stderr: ${stderrData}`));
      }
    });
    ffmpeg.on("error", (err) => {
      reject(err);
    });
    ffmpeg.stdin.write(inputBuffer);
    ffmpeg.stdin.end();
  });
}
async function getGoogleAccessToken() {
  try {
    const keyPath = path2.resolve("./scratch/google-service-account.json");
    if (!fs2.existsSync(keyPath)) {
      console.warn("[TTS-Google] Archivo google-service-account.json no encontrado en scratch.");
      return null;
    }
    const serviceAccountJson = JSON.parse(fs2.readFileSync(keyPath, "utf8"));
    const privateKey = await jose.importPKCS8(serviceAccountJson.private_key, "RS256");
    const jwt = await new jose.SignJWT({
      scope: "https://www.googleapis.com/auth/cloud-platform"
    }).setProtectedHeader({ alg: "RS256" }).setIssuer(serviceAccountJson.client_email).setAudience("https://oauth2.googleapis.com/token").setExpirationTime("1h").setIssuedAt().sign(privateKey);
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt
      })
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[TTS-Google] Error obteniendo OAuth2 token: ${res.status} - ${errText}`);
      return null;
    }
    const data = await res.json();
    return data.access_token;
  } catch (err) {
    console.error("[TTS-Google] Error en getGoogleAccessToken:", err);
    return null;
  }
}
function prepareTtsText(rawText) {
  let cleanText = rawText;
  cleanText = cleanText.replace(/https:\/\/g\.page\/r\/[a-zA-Z0-9_-]+\/review/gi, "el enlace de Google que te comparto por escrito");
  cleanText = cleanText.replace(/https:\/\/vecy-network\.vercel\.app\/jania/gi, "besi gui\xF3n al medio network punto vercel punto ap diagonal y\xE1nia");
  cleanText = cleanText.replace(/https:\/\/vecy-network\.vercel\.app\/agent-dashboard/gi, "besi gui\xF3n al medio network punto vercel punto ap diagonal eiyent gui\xF3n dashbord");
  cleanText = cleanText.replace(/https:\/\/vecy-network\.vercel\.app\/properties/gi, "besi gui\xF3n al medio network punto vercel punto ap diagonal properties");
  cleanText = cleanText.replace(/https:\/\/vecy-network\.vercel\.app\/requerimientos/gi, "besi gui\xF3n al medio network punto vercel punto ap diagonal requerimientos");
  cleanText = cleanText.replace(/https:\/\/vecy-network\.vercel\.app\/historia/gi, "besi gui\xF3n al medio network punto vercel punto ap diagonal historia");
  cleanText = cleanText.replace(/https:\/\/vecy-network\.vercel\.app\/?/gi, "besi gui\xF3n al medio network punto vercel punto ap");
  const urlRegex = /https?:\/\/(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z0-9.-]+)([^\s]*)/gi;
  cleanText = cleanText.replace(urlRegex, (match, domain, path8) => {
    let cleanDomain = domain.toLowerCase();
    cleanDomain = cleanDomain.replace(/\.com\.co/g, " punto com punto co").replace(/\.com/g, " punto com").replace(/\.co/g, " punto co").replace(/\.net/g, " punto net").replace(/\.org/g, " punto org").replace(/\.app/g, " punto ap");
    if (path8 && path8.length > 3) {
      return `${cleanDomain} (cuyo enlace completo te dej\xE9 aqu\xED por escrito)`;
    }
    return cleanDomain;
  });
  cleanText = cleanText.replace(/vecy\s+network|veci\s+network/gi, "besi network").replace(/vecy|veci/gi, "besi").replace(/jania/gi, "y\xE1nia").replace(/\bRLS\b/gi, "ere ele ese").replace(/\bSQL\b/gi, "ese cu ele").replace(/\bDM\b/gi, "di em").replace(/\bID\b/gi, "ai di");
  const phoneRegex = /(?:\+?57\s*)?(3\d{2})[\s-]?(\d{3})[\s-]?(\d{2})[\s-]?(\d{2})\b/g;
  cleanText = cleanText.replace(phoneRegex, (match, p1, p2, p3, p4) => {
    const firstDigit = p1.charAt(0);
    const nextTwoDigits = p1.substring(1);
    const firstDigitP2 = p2.charAt(0);
    const nextTwoDigitsP2 = p2.substring(1);
    return `${firstDigit}... ${nextTwoDigits}... ${firstDigitP2}... ${nextTwoDigitsP2}... ${p3}... ${p4}`;
  });
  return cleanText.trim();
}
function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}
async function textToSpeechMedia(text2, format = "OGG_OPUS") {
  const cleanText = text2.replace(/[*#_`~\[\]]/g, "").replace(/\p{Extended_Pictographic}/gu, "").replace(/[\u2600-\u27BF]/g, "").replace(/[\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD00-\uDFFF]/g, "").replace(/[\u200B-\u200D\uFE0F]/g, "").replace(/\s+/g, " ").replace(/\s\./g, ".").trim();
  if (!cleanText) return null;
  const ttsText = prepareTtsText(cleanText);
  const escapedText = escapeXml(ttsText);
  const ssmlText = `<speak>${escapedText.replace(/\.\.\./g, '<break time="500ms"/>').replace(/,/g, ',<break time="200ms"/>')}</speak>`;
  const googleApiKey = [process.env.GEMINI_API_KEY, process.env.GOOGLE_API_KEY, ENV.forgeApiKey].find((k) => k && k.startsWith("AIzaSy")) || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || ENV.forgeApiKey;
  if (googleApiKey) {
    const voiceCandidates = [
      {
        endpoint: "v1beta1",
        name: "Laomedeia",
        lang: "es-us",
        usePitch: false,
        modelName: "gemini-3.1-flash-tts-preview",
        prompt: "Leer en voz alta con un tono maduro, serio, experto y autoritario pero emp\xE1tico."
      },
      { endpoint: "v1", name: "es-US-Journey-F", lang: "es-US", gender: "FEMALE", usePitch: false },
      { endpoint: "v1", name: "es-419-Neural2-C", lang: "es-419", gender: "FEMALE", usePitch: false },
      { endpoint: "v1", name: "es-CO-Neural2-A", lang: "es-CO", gender: "FEMALE", usePitch: false },
      { endpoint: "v1", name: "es-CO-Wavenet-A", lang: "es-CO", gender: "FEMALE", usePitch: false }
    ];
    let cachedAccessToken = null;
    for (const candidate of voiceCandidates) {
      const { endpoint, name, lang, gender, usePitch, modelName, prompt } = candidate;
      try {
        let ttsUrl = `https://texttospeech.googleapis.com/${endpoint}/text:synthesize?key=${googleApiKey}`;
        const headers = { "Content-Type": "application/json" };
        if (modelName) {
          if (!cachedAccessToken) {
            cachedAccessToken = await getGoogleAccessToken();
          }
          if (cachedAccessToken) {
            ttsUrl = `https://texttospeech.googleapis.com/${endpoint}/text:synthesize`;
            headers["Authorization"] = `Bearer ${cachedAccessToken}`;
          } else {
            console.warn(`[TTS-Google] Omitiendo candidato "${name}" porque requiere OAuth2 y no se gener\xF3 el token.`);
            continue;
          }
        }
        const requestBody = {
          audioConfig: modelName ? {
            audioEncoding: format,
            pitch: 0,
            speakingRate: 1.1
          } : {
            audioEncoding: format,
            speakingRate: 1,
            ...usePitch ? { pitch: 0 } : {}
          },
          input: modelName ? { text: ttsText, prompt } : { ssml: ssmlText },
          // Modelos estándar usan SSML
          voice: modelName ? { languageCode: lang, modelName, name } : { languageCode: lang, name, ssmlGender: gender }
        };
        const response = await fetch(ttsUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody)
        });
        if (response.ok) {
          const data = await response.json();
          if (data.audioContent) {
            console.log(`[TTS-Google] \u2713 Voz "${name}" ${format} generada (${ttsText.length} chars).`);
            const mimeType = format === "MP3" ? "audio/mpeg" : "audio/ogg; codecs=opus";
            const filename = format === "MP3" ? "voice-note.mp3" : "voice-note.ogg";
            return new MessageMedia(mimeType, data.audioContent, filename);
          }
        } else {
          const errBody = await response.text().catch(() => "");
          console.warn(`[TTS-Google] "${name}" \u2192 ${response.status}: ${errBody.substring(0, 120)}`);
        }
      } catch (err) {
        console.error(`[TTS-Google] Error con "${name}":`, err);
      }
    }
  }
  try {
    if (ENV.forgeApiUrl && ENV.forgeApiKey) {
      const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
      const ttsUrl = new URL("v1/audio/speech", baseUrl).toString();
      const response = await fetch(ttsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ENV.forgeApiKey}`
        },
        body: JSON.stringify({
          model: "tts-1",
          input: cleanText,
          voice: "nova"
        })
      });
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        if (format === "MP3") {
          const base64Data = Buffer.from(buffer).toString("base64");
          return new MessageMedia("audio/mpeg", base64Data, "voice-note.mp3");
        }
        try {
          const oggBuffer = await transcodeToOggOpus(Buffer.from(buffer));
          const base64Ogg = oggBuffer.toString("base64");
          console.log(`[TTS-Forge] Voz nova transcodificada a OGG_OPUS (${oggBuffer.byteLength} bytes).`);
          return new MessageMedia("audio/ogg; codecs=opus", base64Ogg, "voice-note.ogg");
        } catch (transcodeErr) {
          console.error(`[TTS-Forge] Fall\xF3 transcodificaci\xF3n a Ogg, enviando MP3 de respaldo:`, transcodeErr);
          const base64Data = Buffer.from(buffer).toString("base64");
          return new MessageMedia("audio/mpeg", base64Data, "voice-note.mp3");
        }
      }
    }
  } catch (err) {
    console.error("[TTS-Forge] Error:", err);
  }
  try {
    const maxLen = 190;
    const words = cleanText.split(/\s+/);
    const chunks = [];
    let currentChunk = "";
    for (const word of words) {
      if ((currentChunk + " " + word).trim().length > maxLen) {
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        currentChunk = word;
      } else {
        currentChunk += (currentChunk ? " " : "") + word;
      }
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    const buffers = [];
    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=es&client=tw-ob`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      if (response.ok) {
        buffers.push(Buffer.from(await response.arrayBuffer()));
      }
      await delay(250);
    }
    if (buffers.length > 0) {
      const combined = Buffer.concat(buffers);
      console.log(`[TTS-Translate] Voz Google Translate generada (fallback).`);
      if (format === "MP3") {
        return new MessageMedia("audio/mpeg", combined.toString("base64"), "voice-note.mp3");
      }
      try {
        const oggBuffer = await transcodeToOggOpus(combined);
        const base64Ogg = oggBuffer.toString("base64");
        console.log(`[TTS-Translate] Voz Google Translate transcodificada a OGG_OPUS (${oggBuffer.byteLength} bytes).`);
        return new MessageMedia("audio/ogg; codecs=opus", base64Ogg, "voice-note.ogg");
      } catch (transcodeErr) {
        console.error(`[TTS-Translate] Fall\xF3 transcodificaci\xF3n a Ogg, enviando MP3 de respaldo:`, transcodeErr);
        return new MessageMedia("audio/mpeg", combined.toString("base64"), "voice-note.mp3");
      }
    }
  } catch (err) {
    console.error("[TTS-Translate] Fallback TTS failed:", err);
  }
  return null;
}
function getAudioExtension(mimeType) {
  const mimeToExt = {
    "audio/webm": "webm",
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/ogg": "ogg",
    "audio/m4a": "m4a",
    "audio/mp4": "m4a"
  };
  return mimeToExt[mimeType] || "ogg";
}
function detectaVoz(text2) {
  const t2 = text2.toLowerCase();
  const keywords = [
    "audio",
    "adio",
    "nota de voz",
    "notas de voz",
    "nota de vos",
    "notas de vos",
    "mandame un audio",
    "mandame audio",
    "m\xE1ndame un audio",
    "m\xE1ndame audio",
    "enviame un audio",
    "enviame audio",
    "env\xEDame un audio",
    "env\xEDame audio",
    "dime en voz",
    "cu\xE9ntame",
    "cu\xE9ntame por audio",
    "leeme esto",
    "l\xE9eme esto",
    "hablame",
    "h\xE1blame",
    "voy conduciendo",
    "estoy conduciendo",
    "voy manejando",
    "estoy manejando",
    "sin manos",
    "manos libres",
    "no puedo leer",
    "no puedo escribir",
    "d\xEDmelo en audio",
    "dimelo en audio",
    "d\xEDmelo por audio",
    "dimelo por audio",
    "gr\xE1bame un audio",
    "grabame un audio",
    "gr\xE1bame audio",
    "grabame audio",
    "m\xE1ndame nota de voz",
    "mandame nota de voz",
    "env\xEDame nota de voz",
    "enviame nota de voz",
    "m\xE1ndame nota de vos",
    "mandame nota de vos",
    "env\xEDame nota de vos",
    "enviame nota de vos"
  ];
  return keywords.some((kw) => t2.includes(kw));
}
function getColombiaHour2() {
  const utc = Date.now() + (/* @__PURE__ */ new Date()).getTimezoneOffset() * 6e4;
  const colTime = new Date(utc + 36e5 * -5);
  return colTime.getHours();
}
function getGreetingByTime2() {
  const hour = getColombiaHour2();
  if (hour >= 6 && hour < 12) {
    return "Buenos d\xEDas";
  } else if (hour >= 12 && hour < 18) {
    return "Buenas tardes";
  } else {
    return "Buenas noches";
  }
}
function extractFirstName2(fullName) {
  const clean = fullName.trim();
  if (!clean) return "";
  if (/^\+?[\d\s-]{6,}$/.test(clean)) return "";
  const words = clean.split(/\s+/).map((w) => w.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, ""));
  if (words.length === 0 || !words[0]) return "";
  const w1 = words[0].toLowerCase();
  const w2 = words[1] ? words[1].toLowerCase() : "";
  if (w2 && COMMON_FIRST_NAMES2.has(w1) && COMMON_FIRST_NAMES2.has(w2)) {
    const first = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
    const second = words[1].charAt(0).toUpperCase() + words[1].slice(1).toLowerCase();
    return `${first} ${second}`;
  }
  return words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
}
async function sendAdminNotification(text2) {
  const ADMIN_PHONE = process.env.ADMIN_PHONE || "573166569719";
  const adminJid = `${ADMIN_PHONE}@c.us`;
  try {
    console.log("[DEBUG-DM] global.janiaMatchBotInstance exists:", !!global.janiaMatchBotInstance, "isReady:", global.janiaMatchBotInstance?.isReady);
    const matchBot = global.janiaMatchBotInstance;
    if (matchBot && matchBot.isReady) {
      console.log(`[WHATSAPP-BOT] Enviando notificaci\xF3n de admin a ${adminJid} v\xEDa JanIA Match Bot (Puppeteer)...`);
      await matchBot.queuedSend(adminJid, text2);
    } else {
      await whatsappBot.queuedSend(adminJid, text2);
    }
  } catch (e) {
    await whatsappBot.queuedSend(adminJid, text2);
  }
}
async function sendUserDM(jid, text2) {
  const formattedJid = jid.includes("@") ? jid : `${jid}@c.us`;
  try {
    await whatsappBot.queuedSend(formattedJid, text2);
  } catch (e) {
    await whatsappBot.queuedSend(formattedJid, text2);
  }
}
function setBotPendingData(senderId, originalText, extractedData, classification, missingFields) {
  whatsappBot.setPendingDataForUser(senderId, originalText, extractedData, classification, missingFields);
}
function cleanVoiceText(text2) {
  if (!text2) return "";
  let cleaned = text2.trim();
  cleaned = cleaned.replace(/^\{\{[\s\S]*?\}\}/g, "").trim();
  cleaned = cleaned.replace(/^\[[\s\S]*?\]/g, "").trim();
  cleaned = cleaned.replace(/^\{\s*|\s*\}$/g, "").trim();
  cleaned = cleaned.replace(/^"|"$/g, "").trim();
  const preambulos = [
    /^(aquí\s+tienes|aqui\s+tienes|aquí\s+está|aqui\s+esta|aquí\s+te\s+presento|esta\s+es|este\s+es)\s+(la\s+propuesta|el\s+guión|el\s+guion|la\s+nota\s+de\s+voz|el\s+mensaje|la\s+redacción|la\s+redaccion|el\s+texto)[^:]*:\s*/i,
    /^claro\s*,\s*(aquí\s+tienes|aquí\s+está|te\s+comparto)[^:]*:\s*/i,
    /^(propuesta\s+de\s+(guión|guion|nota|mensaje|audio|texto)[^:]*):\s*/i,
    /^(guión\s+de\s+voz|guion\s+de\s+voz|nota\s+de\s+voz|mensaje\s+de\s+voz|guión\s+de\s+audio|guion\s+de\s+audio|guión|guion)\s*:\s*/i
  ];
  for (const regex of preambulos) {
    cleaned = cleaned.replace(regex, "");
  }
  cleaned = cleaned.replace(/^:\s*/, "").trim();
  cleaned = cleaned.replace(/^"|"$/g, "").trim();
  return cleaned.trim();
}
var Client, LocalAuth, MessageMedia, SERVER_BOOT_TIME, delay, outgoingQueue, matchBotInstance, COMMON_FIRST_NAMES2, WhatsAppBot, whatsappBot;
var init_whatsapp = __esm({
  "server/_core/whatsapp.ts"() {
    "use strict";
    init_setup_stealth();
    init_scraper();
    init_voiceTranscription();
    init_janIA();
    init_db();
    init_schema();
    init_storage();
    init_env();
    init_llm();
    ({ Client, LocalAuth, MessageMedia } = pkg);
    SERVER_BOOT_TIME = Math.floor(Date.now() / 1e3);
    delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    outgoingQueue = Promise.resolve();
    matchBotInstance = null;
    COMMON_FIRST_NAMES2 = /* @__PURE__ */ new Set([
      "juan",
      "ana",
      "maria",
      "mar\xEDa",
      "jose",
      "jos\xE9",
      "luis",
      "carlos",
      "jorge",
      "victor",
      "v\xEDctor",
      "sandra",
      "diana",
      "laura",
      "gloria",
      "eduardo",
      "flor",
      "esteban",
      "pedro",
      "julio",
      "oscar",
      "\xF3scar",
      "angela",
      "\xE1ngela",
      "pablo",
      "arturo",
      "alba",
      "fernanda",
      "alberto",
      "david",
      "manuel",
      "fernando",
      "alejandro",
      "andres",
      "andr\xE9s",
      "felipe",
      "milena",
      "patricia",
      "cristina",
      "beatriz",
      "isabel",
      "helena",
      "elena",
      "sofia",
      "sof\xEDa",
      "lucia",
      "luc\xEDa",
      "carolina",
      "claudia",
      "marta",
      "martha",
      "adriana",
      "diego",
      "javier",
      "camilo",
      "santiago",
      "alejandra",
      "paola",
      "liliana",
      "elizabeth",
      "esperanza",
      "yolanda",
      "blanca",
      "rosa",
      "carmen",
      "teresa",
      "cecilia",
      "ines",
      "in\xE9s",
      "amparo",
      "pilar",
      "rocio",
      "roc\xEDo",
      "soraya",
      "johanna",
      "yudy",
      "judy",
      "tatiana",
      "mateo",
      "sebastian",
      "sebasti\xE1n",
      "nicolas",
      "nicol\xE1s",
      "daniel",
      "cristian",
      "jhon",
      "john",
      "alexander",
      "gustavo",
      "hernando",
      "alvaro",
      "\xE1lvaro",
      "humberto",
      "jaime",
      "ricardo",
      "mauricio",
      "cesar",
      "c\xE9sar",
      "nelson",
      "ruben",
      "rub\xE9n",
      "ivan",
      "iv\xE1n",
      "wilson",
      "olga",
      "luz",
      "stella",
      "estela"
    ]);
    WhatsAppBot = class {
      client;
      targetGroupId = "120363260108880069@g.us";
      buzonGroupId = "120363417740040773@g.us";
      circuloGroupId = "120363403507276533@g.us";
      isReady = false;
      // Estructuras de control dinámicas
      messageBuffers = /* @__PURE__ */ new Map();
      cooldownMap = /* @__PURE__ */ new Map();
      pendingData = /* @__PURE__ */ new Map();
      recentGroupMessages = /* @__PURE__ */ new Map();
      lastConversationWarningTime = /* @__PURE__ */ new Map();
      // Mutex ligero por senderId para serializar mensajes concurrentes del mismo usuario (Fix: condición de carrera en álbumes)
      processingLocks = /* @__PURE__ */ new Map();
      pendingWelcomeCount = 0;
      counterFile = path2.join(process.cwd(), ".pending_welcome_count");
      pendingWelcomeJids = [];
      pendingWelcomeBuzon = [];
      pendingWelcomeCirculo = [];
      mainWelcomeTimer = null;
      buzonWelcomeTimer = null;
      circuloWelcomeTimer = null;
      jidsFile = path2.join(process.cwd(), ".pending_welcome_jids");
      cooldownFile = path2.join(process.cwd(), ".cooldown_map.json");
      pendingDataFile = path2.join(process.cwd(), ".pending_data.json");
      // Control de límites y anti-flood (v12.0)
      dailyMessageLimit = 250;
      messagesSentToday = 0;
      lastResetDate = (/* @__PURE__ */ new Date()).toDateString();
      chatMessageTimes = /* @__PURE__ */ new Map();
      blockedChats = /* @__PURE__ */ new Map();
      redirectCooldowns = /* @__PURE__ */ new Map();
      botSentMessageIds = /* @__PURE__ */ new Set();
      blacklistedBots = process.env.BLACKLISTED_BOTS ? process.env.BLACKLISTED_BOTS.split(",") : [];
      watchdogInterval = null;
      // --- ANTI-BURST & ANTI-FLOOD QUEUED DISPATCH (v12.0) ---
      async queuedSend(chatId, content, options = {}) {
        if (typeof content === "string") {
          content = content.replace(/\*\*/g, "*");
        }
        const today = (/* @__PURE__ */ new Date()).toDateString();
        if (this.lastResetDate !== today) {
          this.messagesSentToday = 0;
          this.lastResetDate = today;
        }
        if (this.messagesSentToday >= this.dailyMessageLimit) {
          console.warn(`[Kill-Switch] L\xEDmite diario de mensajes alcanzado (${this.dailyMessageLimit}). Cancelando env\xEDo a ${chatId}.`);
          return;
        }
        const now = Date.now();
        const unblockTime = this.blockedChats.get(chatId);
        if (unblockTime && now < unblockTime) {
          console.warn(`[Anti-Flood] Ignorando mensaje a ${chatId} (bloqueado temporalmente por flood).`);
          return;
        }
        let timestamps = this.chatMessageTimes.get(chatId) || [];
        timestamps = timestamps.filter((t2) => now - t2 < 6e4);
        timestamps.push(now);
        this.chatMessageTimes.set(chatId, timestamps);
        if (timestamps.length > 5) {
          console.warn(`[Anti-Flood] \xA1Alerta de Flood en ${chatId}! Bloqueando respuestas por 15 minutos.`);
          this.blockedChats.set(chatId, now + 15 * 60 * 1e3);
          return;
        }
        outgoingQueue = outgoingQueue.then(async () => {
          try {
            if (this.messagesSentToday >= this.dailyMessageLimit) return;
            const isGroup = chatId.includes("@g.us");
            const shouldUseCloud = process.env.USE_WHATSAPP_CLOUD_API === "true" && (!isGroup || process.env.ENABLE_PUPPETEER_FOR_GROUPS !== "true");
            let typingDelay = 200;
            if (shouldUseCloud) {
              const isAudio = content && content.mimetype && content.mimetype.startsWith("audio") || options && options.sendAudioAsVoice;
              if (isAudio) {
                typingDelay = isGroup ? Math.floor(Math.random() * 2e3) + 3e3 : 300;
              } else {
                if (typeof content === "string") {
                  typingDelay = isGroup ? Math.min(content.length * 15, 4e3) : Math.min(content.length * 3, 400);
                  typingDelay = Math.max(typingDelay, 200);
                } else {
                  typingDelay = isGroup ? 1500 : 200;
                }
              }
            } else {
              try {
                const chat = await this.client.getChatById(chatId);
                const isAudio = content instanceof MessageMedia || typeof content === "object" && content?.mimetype?.startsWith("audio") || options && options.sendAudioAsVoice;
                if (isAudio) {
                  await chat.sendStateRecording();
                  typingDelay = isGroup ? Math.floor(Math.random() * 2e3) + 3e3 : 300;
                } else {
                  await chat.sendStateTyping();
                  if (typeof content === "string") {
                    typingDelay = isGroup ? Math.min(content.length * 15, 4e3) : Math.min(content.length * 3, 400);
                    typingDelay = Math.max(typingDelay, 200);
                  } else {
                    typingDelay = isGroup ? 2e3 : 200;
                  }
                }
              } catch (_) {
              }
            }
            await delay(typingDelay);
            let sendPromise;
            if (shouldUseCloud) {
              if (isGroup) {
                console.log(`[WHATSAPP-BOT] Delegando mensaje de grupo ${chatId} a JanIA Match Bot (Puppeteer)...`);
                const { janiaMatchBot: janiaMatchBot2 } = await Promise.resolve().then(() => (init_whatsapp_match(), whatsapp_match_exports));
                if (janiaMatchBot2 && janiaMatchBot2.isReady) {
                  sendPromise = janiaMatchBot2.queuedSend(chatId, content, options);
                } else {
                  console.warn(`[WHATSAPP-BOT] JanIA Match Bot no est\xE1 listo. Intentando con Cloud API (fallar\xE1)...`);
                  const { sendCloudMessage: sendCloudMessage2 } = await Promise.resolve().then(() => (init_whatsapp_cloud(), whatsapp_cloud_exports));
                  sendPromise = sendCloudMessage2(chatId, content, options);
                }
              } else {
                const matchBot = global.janiaMatchBotInstance;
                if (matchBot && matchBot.isReady) {
                  console.log(`[WHATSAPP-BOT] Delegando DM a ${chatId} a JanIA Match Bot (Puppeteer)...`);
                  sendPromise = matchBot.queuedSend(chatId, content, options);
                } else {
                  const { sendCloudMessage: sendCloudMessage2 } = await Promise.resolve().then(() => (init_whatsapp_cloud(), whatsapp_cloud_exports));
                  sendPromise = sendCloudMessage2(chatId, content, options);
                }
              }
            } else {
              sendPromise = this.client.sendMessage(chatId, content, options).then((sentMsg) => {
                if (sentMsg && sentMsg.id && sentMsg.id.id) {
                  this.botSentMessageIds.add(sentMsg.id.id);
                }
                return sentMsg;
              });
            }
            const timeoutPromise = new Promise(
              (_, reject) => setTimeout(() => reject(new Error(`Timeout al enviar mensaje de WhatsApp a ${chatId}`)), 15e3)
            );
            await Promise.race([sendPromise, timeoutPromise]);
            if (!shouldUseCloud) {
              try {
                const chat = await this.client.getChatById(chatId);
                await chat.clearState();
              } catch (_) {
              }
            }
            this.messagesSentToday++;
            console.log(`[WhatsApp-Bot] Mensaje enviado a ${chatId}. Total hoy: ${this.messagesSentToday}/${this.dailyMessageLimit}`);
            const cooldownDelay = isGroup ? Math.floor(Math.random() * 1500) + 2e3 : 200;
            await delay(cooldownDelay);
          } catch (err) {
            console.error("[Anti-Burst-Queue] Fallo en despacho secuencial:", err.message || err);
          }
        });
        return outgoingQueue;
      }
      constructor() {
        console.log("[WHATSAPP-BOT] Inicializando JanIA v2.5 (CORE v10.5 - Multimodal & Anti-Spam)...");
        this.loadCounter();
        this.loadCooldowns();
        this.loadPendingData();
        this.createClientInstance();
        this.setupGracefulShutdown();
      }
      // --- PERSISTENCIA Y CIERRE ---
      loadCounter() {
        try {
          if (fs2.existsSync(this.counterFile)) {
            this.pendingWelcomeCount = parseInt(fs2.readFileSync(this.counterFile, "utf8")) || 0;
          }
          if (fs2.existsSync(this.jidsFile)) {
            this.pendingWelcomeJids = JSON.parse(fs2.readFileSync(this.jidsFile, "utf8")) || [];
          }
        } catch (e) {
        }
      }
      saveCounter() {
        try {
          fs2.writeFileSync(this.counterFile, this.pendingWelcomeCount.toString(), "utf8");
          fs2.writeFileSync(this.jidsFile, JSON.stringify(this.pendingWelcomeJids), "utf8");
        } catch (e) {
        }
      }
      loadCooldowns() {
        try {
          if (fs2.existsSync(this.cooldownFile)) {
            const raw = JSON.parse(fs2.readFileSync(this.cooldownFile, "utf8"));
            this.cooldownMap = new Map(Object.entries(raw));
          }
        } catch (e) {
        }
      }
      saveCooldowns() {
        try {
          const obj = Object.fromEntries(this.cooldownMap.entries());
          fs2.writeFileSync(this.cooldownFile, JSON.stringify(obj), "utf8");
        } catch (e) {
        }
      }
      loadPendingData() {
        try {
          if (fs2.existsSync(this.pendingDataFile)) {
            const raw = JSON.parse(fs2.readFileSync(this.pendingDataFile, "utf8"));
            this.pendingData = new Map(Object.entries(raw));
          }
        } catch (e) {
        }
      }
      savePendingData() {
        try {
          const obj = Object.fromEntries(this.pendingData.entries());
          fs2.writeFileSync(this.pendingDataFile, JSON.stringify(obj), "utf8");
        } catch (e) {
        }
      }
      setupGracefulShutdown() {
        const shutdown = async () => {
          console.log("\n\u{1F6D1} Cerrando WhatsApp Bot...");
          this.saveCounter();
          try {
            await this.client.destroy();
          } catch (e) {
          }
          process.exit(0);
        };
        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);
      }
      getInfractionsPath() {
        return path2.join(process.cwd(), ".infractions.json");
      }
      loadInfractions() {
        const filePath = this.getInfractionsPath();
        if (fs2.existsSync(filePath)) {
          try {
            return JSON.parse(fs2.readFileSync(filePath, "utf8"));
          } catch (e) {
            console.error("[WHATSAPP-BOT] Error al leer .infractions.json:", e);
          }
        }
        return {};
      }
      saveInfractions(infractions) {
        const filePath = this.getInfractionsPath();
        try {
          fs2.writeFileSync(filePath, JSON.stringify(infractions, null, 2), "utf8");
        } catch (e) {
          console.error("[WHATSAPP-BOT] Error al escribir .infractions.json:", e);
        }
      }
      incrementStrike(groupId, userId) {
        const infractions = this.loadInfractions();
        if (!infractions[groupId]) {
          infractions[groupId] = {};
        }
        const current = infractions[groupId][userId] || 0;
        const next = current + 1;
        infractions[groupId][userId] = next;
        this.saveInfractions(infractions);
        return next;
      }
      resetStrikes(groupId, userId) {
        const infractions = this.loadInfractions();
        if (infractions[groupId] && infractions[groupId][userId]) {
          delete infractions[groupId][userId];
          if (Object.keys(infractions[groupId]).length === 0) {
            delete infractions[groupId];
          }
          this.saveInfractions(infractions);
        }
      }
      // --- MANEJO DE EVENTOS ---
      setupEventListeners() {
        this.client.on("qr", (qr) => {
          console.log("[WHATSAPP-BOT] Escanea el QR para JanIA:");
          qrcode.generate(qr, { small: true });
        });
        this.client.on("ready", () => {
          console.log("\n\u{1F680} JANIA v2.5 CORE v10.5 \u2014 SISTEMA NACIONAL EL\xC1STICO ACTIVADO");
          this.isReady = true;
          this.startWatchdog();
          this.exportRecentJoinsToFile().catch((err) => {
            console.error("[WHATSAPP-BOT] Error al exportar uniones en ready:", err);
          });
          (async () => {
            try {
              const page = this.client.pupPage;
              if (page) {
                await page.setRequestInterception(true);
                page.on("request", (req) => {
                  const type = req.resourceType();
                  if (type === "stylesheet" || type === "font") {
                    req.abort().catch(() => {
                    });
                  } else {
                    req.continue().catch(() => {
                    });
                  }
                });
                console.log("[WHATSAPP-BOT] Optimizaci\xF3n activa: Hojas de estilo y fuentes bloqueadas en el navegador invisible.");
              }
            } catch (e) {
              console.warn("[WHATSAPP-BOT] No se pudo configurar la interceptaci\xF3n de solicitudes:", e.message || e);
            }
          })();
        });
        this.client.on("disconnected", async (reason) => {
          console.warn("[WHATSAPP-BOT] \u26A0\uFE0F Cliente desconectado:", reason, "\u2014 iniciando reconexi\xF3n autom\xE1tica en 10s...");
          this.isReady = false;
          await new Promise((resolve) => setTimeout(resolve, 1e4));
          await this.reconnectClient();
        });
        this.client.on("group_membership_request", async (notification) => {
          try {
            console.log(`[WHATSAPP-BOT] Recibida solicitud de uni\xF3n de ${notification.author} en el grupo ${notification.chatId}`);
            let requesterId = notification.author;
            let resolvedId = null;
            if (requesterId && requesterId.endsWith("@lid")) {
              try {
                const contact = await this.client.getContactById(requesterId);
                if (contact && contact.id && contact.id._serialized && contact.id._serialized.endsWith("@c.us")) {
                  resolvedId = contact.id._serialized;
                  console.log(`[WHATSAPP-BOT] Resolviendo requester ID de LID ${requesterId} a ${resolvedId}`);
                }
              } catch (e) {
                console.error("[WHATSAPP-BOT] Error resolviendo requester ID de LID:", e.message || e);
              }
            }
            const idsToApprove = [requesterId];
            if (resolvedId) {
              idsToApprove.push(resolvedId);
            }
            for (const jid of idsToApprove) {
              try {
                console.log(`[WHATSAPP-BOT] Intentando aprobar solicitud de uni\xF3n para JID: ${jid}`);
                await this.client.approveGroupMembershipRequests(notification.chatId, {
                  requesterIds: [jid],
                  sleep: null
                });
                console.log(`[WHATSAPP-BOT] Solicitud de uni\xF3n de ${jid} aprobada con \xE9xito.`);
              } catch (err) {
                console.warn(`[WHATSAPP-BOT] Fall\xF3 aprobaci\xF3n directa para ${jid}: ${err.message || err}`);
              }
            }
          } catch (err) {
            console.error("[WHATSAPP-BOT] Error general al aprobar solicitud de uni\xF3n:", err.message || err);
          }
        });
        this.client.on("group_join", async (notification) => {
          const chatId = notification.chatId;
          const isMain = chatId === this.targetGroupId;
          const isBuzon = chatId === this.buzonGroupId;
          const isCirculo = chatId === this.circuloGroupId;
          if (!isMain && !isBuzon && !isCirculo) return;
          const joinedIds = notification.recipientIds || [];
          const resolvedIds = [];
          for (const id of joinedIds) {
            if (id && id.endsWith("@lid")) {
              try {
                const contact = await this.client.getContactById(id);
                if (contact && contact.id && contact.id._serialized && contact.id._serialized.endsWith("@c.us")) {
                  resolvedIds.push(contact.id._serialized);
                  continue;
                }
              } catch (e) {
              }
            }
            resolvedIds.push(id);
          }
          if (isMain) {
            this.pendingWelcomeJids.push(...resolvedIds);
            this.pendingWelcomeCount = this.pendingWelcomeJids.length;
            this.saveCounter();
            if (this.pendingWelcomeCount >= 3) {
              await this.sendBatchWelcome();
            } else {
              if (this.mainWelcomeTimer) clearTimeout(this.mainWelcomeTimer);
              this.mainWelcomeTimer = setTimeout(async () => {
                if (this.pendingWelcomeJids.length > 0) {
                  await this.sendBatchWelcome();
                }
              }, 1e4);
            }
          } else if (isBuzon) {
            this.pendingWelcomeBuzon.push(...resolvedIds);
            if (this.pendingWelcomeBuzon.length >= 3) {
              await this.sendBatchWelcomeForGroup(this.buzonGroupId, this.pendingWelcomeBuzon);
            } else {
              if (this.buzonWelcomeTimer) clearTimeout(this.buzonWelcomeTimer);
              this.buzonWelcomeTimer = setTimeout(async () => {
                if (this.pendingWelcomeBuzon.length > 0) {
                  await this.sendBatchWelcomeForGroup(this.buzonGroupId, this.pendingWelcomeBuzon);
                }
              }, 1e4);
            }
          } else if (isCirculo) {
            this.pendingWelcomeCirculo.push(...resolvedIds);
            if (this.pendingWelcomeCirculo.length >= 3) {
              await this.sendBatchWelcomeForGroup(this.circuloGroupId, this.pendingWelcomeCirculo);
            } else {
              if (this.circuloWelcomeTimer) clearTimeout(this.circuloWelcomeTimer);
              this.circuloWelcomeTimer = setTimeout(async () => {
                if (this.pendingWelcomeCirculo.length > 0) {
                  await this.sendBatchWelcomeForGroup(this.circuloGroupId, this.pendingWelcomeCirculo);
                }
              }, 1e4);
            }
          }
        });
        this.client.on("message_reaction", async (reaction) => {
          try {
            const negativeReactions = ["\u{1F602}", "\u{1F923}", "\u{1F621}", "\u{1F620}", "\u{1F624}", "\u{1F62D}", "\u274C", "\u2753", "\u2757"];
            if (negativeReactions.includes(reaction.reaction)) {
              const targetGroupId = this.targetGroupId;
              if (reaction.msgId.remote === targetGroupId && reaction.msgId.fromMe === true) {
                const msg = await this.client.getMessageById(reaction.msgId._serialized);
                if (msg) {
                  let senderId = reaction.senderId;
                  if (senderId && senderId.endsWith("@lid")) {
                    try {
                      const contact = await this.client.getContactById(senderId);
                      if (contact && contact.id && contact.id._serialized && contact.id._serialized.endsWith("@c.us")) {
                        senderId = contact.id._serialized;
                      }
                    } catch (e) {
                    }
                  }
                  let realName = `Asesor +${senderId.split("@")[0]}`;
                  try {
                    const contact = await this.client.getContactById(senderId);
                    if (contact) {
                      realName = contact.name || contact.pushname || realName;
                    }
                  } catch (e) {
                    console.warn(`[WHATSAPP-BOT] Fall\xF3 getContactById para reacci\xF3n del remitente ${senderId}:`, e.message || e);
                  }
                  console.log(`[JanIA-Reaction] Reacci\xF3n de desaprobaci\xF3n/sarcasmo detectada de ${realName}`);
                  const promptContext = `[REACCI\xD3N NEGATIVA/SARCASMO/DESAPROBACI\xD3N]: El usuario @${senderId.split("@")[0]} (${realName}) ha reaccionado con el emoji ${reaction.reaction} a tu mensaje: "${msg.body}". Genera una respuesta en el grupo dirigi\xE9ndote a este aliado/colega. Responde de manera sumamente cordial, respetuosa y profesional, pero con total firmeza y una sutil pero brillante auto-defensa. Debes defender tus capacidades de inteligencia artificial, al equipo de desarrollo y fundadores de VECY (Jani Alves y Eduardo A. Rivera), y el valor del proyecto VECY Network (red colaborativa gratuita y sin comisiones). Hazle ver con argumentos elocuentes e inteligentes que la tecnolog\xEDa seria y el trabajo estructurado es lo que genera matches y cierra negocios, rebatiendo su reacci\xF3n con elegancia comercial. Usa emojis.`;
                  let groupName = "VECY INMUEBLES NETWORK";
                  try {
                    const chat = await this.client.getChatById(targetGroupId);
                    if (chat && chat.name) {
                      groupName = chat.name;
                    }
                  } catch (e) {
                  }
                  const result = await processWhatsAppMessage(promptContext, senderId, realName, false, [], void 0, void 0, true, void 0, void 0, targetGroupId, groupName);
                  if (result && result.response && result.response.trim() !== "") {
                    await this.queuedSend(targetGroupId, result.response, {
                      mentions: [senderId],
                      quotedMessageId: reaction.msgId._serialized
                    });
                  }
                }
              }
            }
          } catch (err) {
            console.error("[WHATSAPP-BOT] Error procesando reacci\xF3n:", err.message || err);
          }
        });
        this.client.on("message_create", async (msg) => {
          if (msg.author && msg.author.endsWith("@lid")) {
            try {
              const contact = await this.client.getContactById(msg.author);
              if (contact && contact.id && contact.id._serialized && contact.id._serialized.endsWith("@c.us")) {
                msg.author = contact.id._serialized;
              }
            } catch (e) {
              console.error("[WHATSAPP-BOT] Error resolving msg.author LID:", e);
            }
          }
          if (msg.from && msg.from.endsWith("@lid")) {
            try {
              const contact = await this.client.getContactById(msg.from);
              if (contact && contact.id && contact.id._serialized && contact.id._serialized.endsWith("@c.us")) {
                msg.from = contact.id._serialized;
              }
            } catch (e) {
              console.error("[WHATSAPP-BOT] Error resolving msg.from LID:", e);
            }
          }
          if (msg.from && msg.from.includes("status@broadcast") || msg.author && msg.author.includes("status@broadcast")) {
            return;
          }
          if (msg.timestamp < SERVER_BOOT_TIME) {
            return;
          }
          const senderId = msg.author || msg.from;
          const botJid = this.client.info?.wid?._serialized;
          if (msg.fromMe) {
            const msgId = msg.id?.id || "";
            if (!this.botSentMessageIds.has(msgId)) {
              const chatJid = msg.to;
              console.log(`[WWEBJS] Intervenci\xF3n humana detectada en DM ${chatJid}. Silenciando bot.`);
              const { muteSession: muteSession2 } = await Promise.resolve().then(() => (init_janIA(), janIA_exports));
              await muteSession2(chatJid, true).catch((err) => console.error("Error muting session in database:", err));
            }
            return;
          }
          if (botJid && (senderId === botJid || msg.from === botJid || msg.author === botJid) || this.blacklistedBots.includes(senderId)) {
            return;
          }
          await delay(Math.floor(Math.random() * 2e3) + 2e3);
          try {
            const chat = await msg.getChat();
            const msgText = (msg.body || "").toLowerCase();
            const wantsVoice = msg.type === "audio" || msg.type === "ptt" || detectaVoz(msgText);
            if (wantsVoice) {
              await chat.sendStateRecording();
            } else {
              await chat.sendStateTyping();
            }
            const chatId = chat.id._serialized;
            const isGroup = chat.isGroup;
            const isTargetGroup = chatId === this.targetGroupId;
            const isBuzonGroup = chatId === this.buzonGroupId;
            const isCirculoGroup = chatId === this.circuloGroupId;
            if (isGroup) {
              const groupName = chat.name || "Nombre Real del Grupo";
              const NEGOTIATION_GROUPS_BLACKLIST = [
                "Venta Alameda",
                "Negociaci\xF3n ARRECIFES"
              ];
              if (NEGOTIATION_GROUPS_BLACKLIST.some((name) => groupName.includes(name))) {
                console.log(`[WHATSAPP-BOT] Mensaje omitido: el grupo "${groupName}" est\xE1 en la blacklist de negociaci\xF3n.`);
                return;
              }
              const isOfficialGroup = isTargetGroup || isBuzonGroup || isCirculoGroup;
              if (!isOfficialGroup) {
                const words = msg.body.trim().split(/\s+/).filter((w) => w.length > 0);
                const hasLinks = msg.body.toLowerCase().includes("http") || msg.body.toLowerCase().includes("www");
                const hasAttachments = msg.hasMedia || msg.type === "image" || msg.type === "document" || msg.type === "video" || msg.type === "audio" || msg.type === "ptt";
                if (words.length < 10 && !hasLinks && !hasAttachments) {
                  console.log(`[WHATSAPP-BOT] Omitiendo mensaje corto de grupo externo "${groupName}" por Protocolo Anti-Ban (Palabras: ${words.length}).`);
                  return;
                }
              }
              const text2 = msg.body.toLowerCase();
              if (isTargetGroup && text2.includes("jania")) {
                if (text2.includes("normas") || text2.includes("pres\xE9ntate") || text2.includes("anuncia") || text2.includes("dipava") || text2.includes("retorno") || text2.includes("sincroniza") || text2.includes("catchup") || text2.includes("cierre") || text2.includes("audios")) {
                  await this.handleAdminCommand(msg);
                  return;
                }
              }
              await this.handleIncomingMessage(msg, chatId);
              return;
            }
            if (!isGroup) {
              if (process.env.USE_WHATSAPP_CLOUD_API === "true" && process.env.ENABLE_PUPPETEER_FOR_GROUPS === "true") {
                const now = Date.now();
                const lastRedirect = this.redirectCooldowns.get(senderId) || 0;
                const TWELVE_HOURS = 12 * 60 * 60 * 1e3;
                if (now - lastRedirect > TWELVE_HOURS) {
                  this.redirectCooldowns.set(senderId, now);
                  const redirectLink = process.env.WHATSAPP_OFFICIAL_DM_LINK || "https://wa.me/REEMPLAZAR_CON_NUMERO_DE_META_OFICIAL";
                  const welcomeText = `\xA1Hola! \u{1F916} Soy JanIA, la asistente de la Red VECY.

Este n\xFAmero lo utilizo *\xFAnicamente para interactuar en los grupos inmobiliarios*.

Para chatear conmigo en privado, buscar inmuebles, transcribir audios y usar todas mis herramientas, por favor escr\xEDbeme a mi chat oficial directo:

\u{1F449} ${redirectLink}`;
                  await this.queuedSend(chatId, welcomeText);
                }
                return;
              }
              await this.handleIncomingMessage(msg, chatId);
              return;
            }
          } catch (e) {
            console.error("[WHATSAPP-BOT] Error cr\xEDtico en receptor principal:", e);
          }
        });
      }
      // --- 2. RAMA Conversacional PRIVADA (DM INBOUND LOOP) ---
      // Historial de usuarios saludados fuera de horario
      offHoursGreetedToday = /* @__PURE__ */ new Map();
      async parseAndSaveSilently(msg, senderId, rawPhone) {
        try {
          let imageBuffer;
          let pdfBuffer;
          let pdfMimeType;
          if (msg.hasMedia) {
            if (msg.type === "image") {
              try {
                const media = await msg.downloadMedia();
                if (media && media.mimetype.startsWith("image/")) {
                  imageBuffer = media.data;
                }
              } catch (e) {
                console.error("[JanIA-DM-Vision-Silent] Error descargando imagen:", e);
              }
            } else if (msg.type === "document") {
              try {
                const media = await msg.downloadMedia();
                if (media && media.mimetype === "application/pdf") {
                  pdfBuffer = media.data;
                  pdfMimeType = media.mimetype;
                }
              } catch (e) {
                console.error("[JanIA-DM-Document-Silent] Error descargando documento:", e);
              }
            }
          }
          let realName = `Asesor +${rawPhone}`;
          try {
            const contact = await msg.getContact();
            if (contact) {
              realName = contact.pushname || contact.name || realName;
            }
          } catch (_) {
          }
          const result = await processWhatsAppMessage(
            msg.body,
            senderId,
            realName,
            msg.hasMedia,
            [],
            void 0,
            imageBuffer,
            true,
            // isGroup = true
            pdfBuffer,
            pdfMimeType,
            senderId
            // groupJid = senderId
          );
          if (result) {
            let reaction = "";
            if (result.classification === "INMUEBLE" || result.classification === "REQUERIMIENTO") {
              reaction = "\u2705";
            } else if (result.classification === "DATOS_INCOMPLETOS" || result.missingFields && result.missingFields.length > 0) {
              reaction = "\u{1F914}";
            }
            if (reaction) {
              const sendReaction = async () => {
                try {
                  await msg.react(reaction);
                } catch (_) {
                }
              };
              if (result.inserted && reaction === "\u2705") {
                const delayMs = Math.floor(Math.random() * (12e3 - 4e3 + 1)) + 4e3;
                console.log(`[WHATSAPP-BOT] Inserci\xF3n confirmada en parseAndSaveSilently. Retrasando reacci\xF3n ${reaction} por ${delayMs}ms (Protocolo Anti-Ban)...`);
                setTimeout(sendReaction, delayMs);
              } else {
                await sendReaction();
              }
            }
            if (result.response && result.response.trim() !== "" && result.classification !== "DATOS_INCOMPLETOS" && result.classification !== "VIOLACION_DE_NORMAS") {
              const isMatch = result.response.includes("MATCH COMERCIAL DETECTADO") || result.response.includes("MATCH DETECTADO") || result.response.includes("MATCH INTELIGENTE DETECTADO") || result.response.includes("COINCIDENCIA DE NEGOCIO DETECTADA");
              if (isMatch) {
                await sendAdminNotification(`\u{1F3AF} *[MATCH DETECTADO POR DM]*

${result.response}`);
              }
            }
          }
        } catch (err) {
          console.error("[WHATSAPP-BOT] Fallo en parseAndSaveSilently:", err);
        }
      }
      // --- 2. RAMA Conversacional PRIVADA (DM INBOUND LOOP) ---
      async handlePrivateMessage(msg) {
        try {
          const senderId = msg.from;
          const rawPhone = (msg.author || msg.from).split("@")[0];
          const ADMIN_PHONE = process.env.ADMIN_PHONE || "573166569719";
          const isAdmin = rawPhone.includes(ADMIN_PHONE) || rawPhone === ADMIN_PHONE || rawPhone === "573166569719" || rawPhone.includes("573185462265");
          if (!isAdmin) {
            const db = await getDb();
            let isNewUser = false;
            if (db) {
              try {
                const existingMessages = await db.select({ id: messages.id }).from(messages).innerJoin(conversations, eq4(messages.conversationId, conversations.id)).where(eq4(conversations.sessionId, senderId)).limit(1);
                isNewUser = existingMessages.length === 0;
              } catch (dbErr) {
                console.warn("[WHATSAPP-BOT] Error al verificar si el usuario es nuevo:", dbErr);
              }
            }
            if (isNewUser) {
              console.log(`[WHATSAPP-BOT] Nuevo usuario detectado: ${senderId}. Enviando bienvenida.`);
              let rawName = "";
              try {
                const contact = await msg.getContact();
                rawName = contact.pushname || contact.name || "";
              } catch (e) {
                console.warn(`[WHATSAPP-BOT] Fall\xF3 msg.getContact() en handlePrivateMessage para ${senderId}:`, e.message || e);
              }
              const saludo = getGreetingByTime2();
              const firstName = extractFirstName2(rawName);
              const greetingName = firstName ? ` ${firstName}` : "";
              const isOffHours2 = isOutsideWorkingHours();
              let welcomeText = "";
              if (isOffHours2) {
                welcomeText = `\xA1${saludo}${greetingName}! \u{1F64B}\u{1F3FB}\u200D\u2640\uFE0F Soy JanIA tu asistente IA \u{1F916}\u2728. Te doy la bienvenida a *VECY Bienes Ra\xEDces* nuestro br\xF3ker virtual inmobiliario \u{1F3E0}\u2728. Gracias por contactarte con nosotros. En estos momentos nuestros agentes humanos no pueden responder tu mensaje, si gustas, puedes dejar tu mensaje aqu\xED para que uno de nuestros agentes te responda ma\xF1ana o si quieres puedes continuar la conversaci\xF3n conmigo y contarme de qu\xE9 se trata o c\xF3mo puedo ayudarte. \xA1Ser\xE1 un gusto poder atenderte${greetingName}! \u{1F91D}\u{1F680}`;
              } else {
                welcomeText = `\xA1${saludo}${greetingName}! \u{1F64B}\u{1F3FB}\u200D\u2640\uFE0F Soy JanIA tu asistente IA \u{1F916}\u2728. Te doy la bienvenida a *VECY Bienes Ra\xEDces* nuestro br\xF3ker virtual inmobiliario \u{1F3E0}\u2728. Gracias por contactarte con nosotros. En unos instantes uno de nuestros agentes humanos responder\xE1 tu mensaje, si gustas, puedes ir detall\xE1ndonos tu requerimiento o enviarnos la informaci\xF3n de tu inmueble. \xA1Es un gusto poder atenderte! \u{1F91D}\u{1F680}`;
              }
              let media = null;
              try {
                media = await textToSpeechMedia(welcomeText);
              } catch (ttsErr) {
                console.warn("[WHATSAPP-BOT] Error al generar TTS para bienvenida:", ttsErr.message || ttsErr);
              }
              if (media) {
                await this.queuedSend(senderId, media, { sendAudioAsVoice: true });
              } else {
                await this.queuedSend(senderId, welcomeText);
              }
              await this.logToDb(senderId, "user", msg.body);
              await this.logToDb(senderId, "janIA", welcomeText);
              if (isOffHours2) {
                await this.parseAndSaveSilently(msg, senderId, rawPhone);
              }
              return;
            }
            const isOffHours = isOutsideWorkingHours();
            if (isOffHours) {
              const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
              const hasReceivedOutOfOfficeToday = this.offHoursGreetedToday.get(senderId) === todayStr;
              if (!hasReceivedOutOfOfficeToday) {
                this.offHoursGreetedToday.set(senderId, todayStr);
                let rawName = "";
                try {
                  const contact = await msg.getContact();
                  rawName = contact.pushname || contact.name || "";
                } catch (e) {
                  console.warn(`[WHATSAPP-BOT] Fall\xF3 msg.getContact() en handlePrivateMessage para ${senderId}:`, e.message || e);
                }
                const saludo = getGreetingByTime2();
                const firstName = extractFirstName2(rawName);
                const greetingName = firstName ? ` ${firstName}` : "";
                const outOfOfficeText = `\xA1${saludo}${greetingName}! \u{1F64B}\u{1F3FB}\u200D\u2640\uFE0F Qu\xE9 bueno saludarte de nuevo. En este momento nuestros agentes humanos se encuentran descansando \u{1F319}\u2728. Si gustas, puedes dejar tu mensaje aqu\xED para que te respondamos ma\xF1ana a primera hora, o si prefieres, puedes continuar la conversaci\xF3n conmigo y contarme en qu\xE9 puedo ayudarte hoy. \xA1Siempre es un gusto atenderte! \u{1F91D}\u{1F680}`;
                let media = null;
                try {
                  media = await textToSpeechMedia(outOfOfficeText);
                } catch (ttsErr) {
                  console.warn("[WHATSAPP-BOT] Error al generar TTS para fuera de horario:", ttsErr);
                }
                if (media) {
                  await this.queuedSend(senderId, media, { sendAudioAsVoice: true });
                } else {
                  await this.queuedSend(senderId, outOfOfficeText);
                }
                await this.logToDb(senderId, "user", msg.body);
                await this.logToDb(senderId, "janIA", outOfOfficeText);
                await this.parseAndSaveSilently(msg, senderId, rawPhone);
                return;
              } else {
                await this.logToDb(senderId, "user", msg.body);
                await this.parseAndSaveSilently(msg, senderId, rawPhone);
                return;
              }
            } else {
              console.log(`[WHATSAPP-BOT] DM de ${rawPhone} recibido en horario laboral. Silenciado.`);
              await this.logToDb(senderId, "user", msg.body);
              return;
            }
          }
          let realName = `Asesor +${rawPhone}`;
          try {
            const contact = await msg.getContact();
            if (contact) {
              realName = contact.pushname || contact.name || realName;
            }
          } catch (e) {
            console.warn(`[WHATSAPP-BOT] Fall\xF3 msg.getContact() en handlePrivateMessage para ${senderId}:`, e.message || e);
          }
          try {
            const db = await getDb();
            if (db) {
              const [u] = await db.select().from(users).where(eq4(users.phone, rawPhone)).limit(1);
              if (u && u.name && u.name.trim() !== "") {
                realName = u.name;
              }
            }
          } catch (dbErr) {
            console.warn(`[WHATSAPP-BOT] Error al buscar nombre en BD para ${rawPhone}:`, dbErr);
          }
          console.log(`[JanIA-DM] [Admin/Test] Atendiendo mensaje interno de ${realName} (${senderId})...`);
          const matchConfirmationRegex = /^\s*(sí|si|no)\s+#m(\d+)\s*$/i;
          const matchConf = msg.body.match(matchConfirmationRegex);
          if (matchConf) {
            const decision = matchConf[1].toLowerCase();
            const matchId = parseInt(matchConf[2], 10);
            await this.processMatchConfirmation(senderId, realName, matchId, decision);
            return;
          }
          const plainDecisionRegex = /^\s*(sí|si|no|acepto|no\s+acepto|aceptar|rechazar)\s*$/i;
          const plainDecisionMatch = msg.body.match(plainDecisionRegex);
          if (plainDecisionMatch) {
            let decision = plainDecisionMatch[1].toLowerCase();
            if (decision === "si" || decision === "s\xED" || decision === "acepto" || decision === "aceptar") {
              decision = "si";
            } else {
              decision = "no";
            }
            const db = await getDb();
            if (db) {
              const senderPhone = senderId.split("@")[0];
              const ownerPending = await db.select({
                id: propertyMatches.id,
                propertyType: properties.propertyType,
                transactionType: properties.transactionType,
                city: properties.city,
                zone: properties.zone,
                reqType: requirements.tipoInmuebleDeseado,
                reqTx: requirements.tipoNegocioDeseado,
                reqCity: requirements.ciudadDeseada,
                reqZone: requirements.zonaDeseada,
                score: propertyMatches.matchScore
              }).from(propertyMatches).innerJoin(properties, eq4(propertyMatches.propertyId, properties.id)).innerJoin(requirements, eq4(propertyMatches.requirementId, requirements.id)).where(
                and3(
                  eq4(propertyMatches.status, "suggested"),
                  eq4(propertyMatches.ownerConfirmed, false),
                  or2(
                    eq4(properties.idUsuarioWhatsapp, senderId),
                    like(properties.idUsuarioWhatsapp, senderPhone + "%")
                  )
                )
              );
              const seekerPending = await db.select({
                id: propertyMatches.id,
                propertyType: properties.propertyType,
                transactionType: properties.transactionType,
                city: properties.city,
                zone: properties.zone,
                reqType: requirements.tipoInmuebleDeseado,
                reqTx: requirements.tipoNegocioDeseado,
                reqCity: requirements.ciudadDeseada,
                reqZone: requirements.zonaDeseada,
                score: propertyMatches.matchScore
              }).from(propertyMatches).innerJoin(properties, eq4(propertyMatches.propertyId, properties.id)).innerJoin(requirements, eq4(propertyMatches.requirementId, requirements.id)).where(
                and3(
                  eq4(propertyMatches.status, "suggested"),
                  eq4(propertyMatches.seekerConfirmed, false),
                  or2(
                    eq4(requirements.idUsuarioWhatsapp, senderId),
                    like(requirements.idUsuarioWhatsapp, senderPhone + "%")
                  )
                )
              );
              const allPending = [...ownerPending, ...seekerPending];
              const uniquePending = allPending.filter((v, i, a) => a.findIndex((t2) => t2.id === v.id) === i);
              if (uniquePending.length === 1) {
                const matchId = uniquePending[0].id;
                console.log(`[JanIA-DM] Auto-asociando decisi\xF3n '${decision}' con la \xFAnica coincidencia pendiente #${matchId} para ${senderId}`);
                await this.processMatchConfirmation(senderId, realName, matchId, decision);
                return;
              } else if (uniquePending.length > 1) {
                let listMsg = `Hola ${realName.split(" ")[0]}, veo que respondiste *${plainDecisionMatch[1].toUpperCase()}*, pero actualmente tienes *${uniquePending.length} coincidencias* sugeridas de negocio pendientes de confirmar.

Para poder saber cu\xE1l de ellas deseas confirmar o rechazar, por favor responde utilizando el c\xF3digo de coincidencia de esta manera:
`;
                for (const item of uniquePending) {
                  const isOwnerForThis = ownerPending.some((o) => o.id === item.id);
                  const scorePercent = Number(item.score || 0).toFixed(0);
                  if (isOwnerForThis) {
                    listMsg += `
\u{1F449} *S\xCD #M${item.id}* o *NO #M${item.id}* para tu propiedad (coincidencia del ${scorePercent}% con requerimiento de ${translatePropertyType(item.reqType)} en ${item.reqCity || "Bogot\xE1"}-${item.reqZone || ""})`;
                  } else {
                    listMsg += `
\u{1F449} *S\xCD #M${item.id}* o *NO #M${item.id}* para tu requerimiento (coincidencia del ${scorePercent}% con propiedad de ${translatePropertyType(item.propertyType)} en ${item.city || "Bogot\xE1"}-${item.zone || ""})`;
                  }
                }
                listMsg += `

*(Nota: Tus n\xFAmeros se compartir\xE1n solo si ambos confirman con S\xCD)*`;
                await this.queuedSend(senderId, listMsg);
                await this.logToDb(senderId, "janIA", `[DM-Response-Ambiguous] Solicitado c\xF3digo de coincidencia para decisi\xF3n ambigua.`);
                return;
              }
            }
          }
          let imageBuffer;
          let pdfBuffer;
          let pdfMimeType;
          if (msg.hasMedia) {
            if (msg.type === "image") {
              try {
                const media = await msg.downloadMedia();
                if (media && media.mimetype.startsWith("image/")) {
                  imageBuffer = media.data;
                }
              } catch (e) {
                console.error("[JanIA-DM-Vision] Error descargando imagen:", e);
              }
            } else if (msg.type === "document") {
              try {
                const media = await msg.downloadMedia();
                if (media && media.mimetype === "application/pdf") {
                  pdfBuffer = media.data;
                  pdfMimeType = media.mimetype;
                }
              } catch (e) {
                console.error("[JanIA-DM-Document] Error descargando documento:", e);
              }
            }
          }
          const result = await processWhatsAppMessage(
            msg.body,
            senderId,
            realName,
            msg.hasMedia,
            [],
            // Sin scraping para DMs simples
            void 0,
            imageBuffer,
            false,
            // isGroup = false
            pdfBuffer,
            pdfMimeType
          );
          if (result) {
            const responseText = result.dmResponse || result.response;
            if (responseText && responseText.trim() !== "") {
              await this.queuedSend(senderId, responseText);
              await this.logToDb(senderId, "janIA", `[DM-Response] ${responseText}`);
            }
          }
        } catch (error) {
          console.error(`[JanIA-DM-Error] Fallo en atenci\xF3n privada para ${msg.from}:`, error);
        }
      }
      async processMatchConfirmation(senderId, realName, matchId, decision) {
        try {
          const db = await getDb();
          if (!db) {
            await this.queuedSend(senderId, "\u26A0\uFE0F El sistema de base de datos no est\xE1 disponible en este momento. Int\xE9ntalo m\xE1s tarde.");
            return;
          }
          const [match] = await db.select().from(propertyMatches).where(eq4(propertyMatches.id, matchId)).limit(1);
          if (!match) {
            await this.queuedSend(senderId, `\u26A0\uFE0F No encontr\xE9 ninguna coincidencia registrada con el c\xF3digo *#M${matchId}*. Por favor verifica el n\xFAmero.`);
            return;
          }
          const [prop] = await db.select().from(properties).where(eq4(properties.id, match.propertyId)).limit(1);
          const [req] = await db.select().from(requirements).where(eq4(requirements.id, match.requirementId)).limit(1);
          if (!prop || !req) {
            await this.queuedSend(senderId, "\u26A0\uFE0F Hubo un problema al recuperar los detalles de esta coincidencia.");
            return;
          }
          const senderPhone = senderId.split("@")[0];
          const ownerPhone = prop.idUsuarioWhatsapp || "";
          const seekerPhone = req.idUsuarioWhatsapp || "";
          const isOwner = senderPhone === ownerPhone.split("@")[0];
          const isSeeker = senderPhone === seekerPhone.split("@")[0];
          if (!isOwner && !isSeeker) {
            await this.queuedSend(senderId, "\u26A0\uFE0F No est\xE1s autorizado para confirmar esta coincidencia.");
            return;
          }
          if (decision === "no") {
            await db.update(propertyMatches).set({ status: "rejected" }).where(eq4(propertyMatches.id, matchId));
            await this.queuedSend(senderId, `Entendido. He marcado la coincidencia *#M${matchId}* como cancelada. No se compartir\xE1n tus datos de contacto.`);
            await this.logToDb(senderId, "janIA", `[Match-Rejected] Match #M${matchId} rechazado por el usuario.`);
            const otherJid = isOwner ? seekerPhone.includes("@") ? seekerPhone : `${seekerPhone}@c.us` : ownerPhone.includes("@") ? ownerPhone : `${ownerPhone}@c.us`;
            await this.queuedSend(otherJid, `Aviso: La coincidencia *#M${matchId}* ha sido cancelada por la otra parte.`);
            return;
          }
          let updateFields = {};
          if (isOwner) {
            updateFields.ownerConfirmed = true;
          }
          if (isSeeker) {
            updateFields.seekerConfirmed = true;
          }
          await db.update(propertyMatches).set(updateFields).where(eq4(propertyMatches.id, matchId));
          const [updatedMatch] = await db.select().from(propertyMatches).where(eq4(propertyMatches.id, matchId)).limit(1);
          if (updatedMatch.ownerConfirmed && updatedMatch.seekerConfirmed) {
            await db.update(propertyMatches).set({ status: "interested" }).where(eq4(propertyMatches.id, matchId));
            let ownerName = "Oferente";
            let seekerName = "Interesado";
            try {
              const [ownerUser] = await db.select().from(users).where(eq4(users.phone, ownerPhone)).limit(1);
              if (ownerUser && ownerUser.name) ownerName = ownerUser.name;
            } catch {
            }
            try {
              const [seekerUser] = await db.select().from(users).where(eq4(users.phone, seekerPhone)).limit(1);
              if (seekerUser && seekerUser.name) seekerName = seekerUser.name;
            } catch {
            }
            const ownerJid = ownerPhone.includes("@") ? ownerPhone : `${ownerPhone}@c.us`;
            const seekerJid = seekerPhone.includes("@") ? seekerPhone : `${seekerPhone}@c.us`;
            const matchScoreFormatted = Number(updatedMatch.matchScore || 0).toFixed(0);
            const msgToOwner = `\u{1F389}\u{1F388} *\xA1CONEXI\xD3N DE NEGOCIO EXITOSA!* \u{1F388}\u{1F389}
Felicidades, ambas partes han confirmado inter\xE9s en la coincidencia *#M${matchId}* (Coincidencia: ${matchScoreFormatted}%).

Aqu\xED tienes el contacto directo del aliado interesado en tu propiedad:
\u{1F464} *Nombre:* ${seekerName}
\u{1F4DE} *WhatsApp:* https://wa.me/${seekerPhone}
\u{1F4AC} *Su requerimiento:* ${req.rawText || "Sin descripci\xF3n"}

\xA1Les deseamos mucho \xE9xito en el cierre comercial! \u{1F91D}\u{1F680}`;
            const msgToSeeker = `\u{1F389}\u{1F388} *\xA1CONEXI\xD3N DE NEGOCIO EXITOSA!* \u{1F388}\u{1F389}
Felicidades, ambas partes han confirmado inter\xE9s en la coincidencia *#M${matchId}* (Coincidencia: ${matchScoreFormatted}%).

Aqu\xED tienes el contacto directo del aliado que ofrece la propiedad:
\u{1F464} *Nombre:* ${ownerName}
\u{1F4DE} *WhatsApp:* https://wa.me/${ownerPhone}
\u{1F4AC} *Su oferta:* ${prop.rawText || "Sin descripci\xF3n"}

\xA1Les deseamos mucho \xE9xito en el cierre comercial! \u{1F91D}\u{1F680}`;
            await this.queuedSend(ownerJid, msgToOwner);
            await this.queuedSend(seekerJid, msgToSeeker);
            await this.logToDb(ownerJid, "janIA", `[Match-Connected] Contact shared: Seeker is ${seekerPhone}`);
            await this.logToDb(seekerJid, "janIA", `[Match-Connected] Contact shared: Owner is ${ownerPhone}`);
          } else {
            await this.queuedSend(senderId, `\xA1Gracias! He registrado tu confirmaci\xF3n de inter\xE9s para la coincidencia *#M${matchId}*.

En cuanto la otra parte tambi\xE9n confirme, les compartir\xE9 mutuamente sus datos de contacto para que puedan cerrar el negocio. \u{1F680}`);
            await this.logToDb(senderId, "janIA", `[Match-Confirmed-Waiting] User confirmed match #M${matchId}, waiting for peer.`);
          }
        } catch (err) {
          console.error(`[processMatchConfirmation-Error] Error procesando confirmaci\xF3n para coincidencia #${matchId}:`, err);
          await this.queuedSend(senderId, "\u26A0\uFE0F Ocurri\xF3 un error interno al procesar tu confirmaci\xF3n.");
        }
      }
      // --- 1. LOGÍSTICA DEL BUFFER DINÁMICO Y ANTI-SPAM (CORE v10.5) ---
      // Wrapper que serializa entradas por senderId usando un mutex ligero.
      // Esto evita la condición de carrera cuando WhatsApp envía un álbum de imágenes
      // y todos los mensajes llegan casi simultáneamente antes de que el buffer exista.
      async handleIncomingMessage(msg, chatId) {
        const senderId = msg.author || msg.from;
        const lockKey = `${chatId}_${senderId}`;
        const previousLock = this.processingLocks.get(lockKey) || Promise.resolve();
        let resolveLock;
        const currentLock = new Promise((resolve) => {
          resolveLock = resolve;
        });
        const chainedLock = previousLock.then(() => currentLock);
        this.processingLocks.set(lockKey, chainedLock);
        try {
          await previousLock;
          await this._processIncomingMessage(msg, chatId, senderId);
        } finally {
          resolveLock();
          if (this.processingLocks.get(lockKey) === chainedLock) {
            this.processingLocks.delete(lockKey);
          }
        }
      }
      async _processIncomingMessage(msg, chatId, senderId) {
        const now = Date.now();
        const COOLDOWN_PERIOD = 5 * 60 * 1e3;
        const MAX_BLOCK_SIZE = 3;
        const isGroupChat = chatId.includes("@g.us");
        if (isGroupChat) {
          this.detectGroupConversation(chatId, senderId, msg).catch((err) => {
            console.error("[CONVERSATION-DETECTOR] Error:", err);
          });
        }
        const isMainGroup = chatId === this.targetGroupId;
        const textLower = (msg.body || "").toLowerCase();
        const isPossibleListing = (msg.body || "").length > 150 || (msg.body || "").split("\n").length > 2 || msg.hasMedia || textLower.includes("ofrezco") || textLower.includes("busco") || textLower.includes("vendo") || textLower.includes("arriendo") || textLower.includes("compro") || textLower.includes("necesito") || textLower.includes("renta") || textLower.includes("alquilo") || textLower.includes("permuto") || textLower.includes("casa") || textLower.includes("apto") || textLower.includes("apartamento") || textLower.includes("bodega") || textLower.includes("oficina") || textLower.includes("lote") || textLower.includes("local");
        let cooldown = this.cooldownMap.get(senderId);
        const cooldownKey = `${chatId}_${senderId}`;
        cooldown = this.cooldownMap.get(cooldownKey);
        if (isMainGroup && isPossibleListing && cooldown && now - cooldown.lastBlockProcessedAt < COOLDOWN_PERIOD) {
          if (isGroupChat) {
            try {
              await msg.react("\u26A0\uFE0F");
            } catch (e) {
            }
            if (!cooldown.warningSent) {
              cooldown.warningSent = true;
              this.saveCooldowns();
              const rawPhone2 = (msg.author || msg.from).split("@")[0];
              const warningText = `\u26A0\uFE0F *COOLDOWN ACTIVO (5 MINUTOS)* \u26A0\uFE0F

Hola @${rawPhone2}, acabo de procesar con \xE9xito tus primeras propiedades. Para cuidar la visibilidad de tus activos y no saturar la red de los aliados, te pido que por favor me colabores esperando los *5 minutos* de intervalo antes de enviar tu siguiente bloque (m\xE1ximo 3 publicaciones).

\xA1Mis motores necesitan este breve descanso para mantener tus fichas t\xE9cnicas al 100% de calidad! JanIA sigue atenta. \u{1F3C6}\u{1F3AF}`;
              await this.queuedSend(chatId, warningText, {
                mentions: [senderId],
                quotedMessageId: msg.id._serialized
              });
              this.cooldownMap.set(cooldownKey, cooldown);
              this.saveCooldowns();
            }
          }
          return;
        }
        const rawPhone = (msg.author || msg.from).split("@")[0];
        let realName = `Asesor +${rawPhone}`;
        try {
          const contact = await msg.getContact();
          if (contact) {
            realName = contact.pushname || contact.name || realName;
          }
        } catch (e) {
          console.warn(`[WHATSAPP-BOT] Fall\xF3 msg.getContact() en _processIncomingMessage para ${senderId}:`, e.message || e);
        }
        try {
          const db = await getDb();
          if (db) {
            const [u] = await db.select().from(users).where(eq4(users.phone, rawPhone)).limit(1);
            if (u && u.name && u.name.trim() !== "") {
              realName = u.name;
            }
          }
        } catch (dbErr) {
          console.warn(`[WHATSAPP-BOT] Error al buscar nombre en BD para ${rawPhone}:`, dbErr);
        }
        const bufferKey = `${chatId}_${senderId}`;
        let buffer = this.messageBuffers.get(bufferKey);
        if (buffer) {
          const limit = isMainGroup ? MAX_BLOCK_SIZE : 10;
          if (isPossibleListing && buffer.messages.length >= limit) {
            console.log(`[BUFFER] L\xEDmite de bloque (${limit}) alcanzado para ${senderId}. Mensaje #${buffer.messages.length + 1} descartado.`);
            if (isGroupChat && isMainGroup) {
              try {
                await msg.react("\u26A0\uFE0F");
              } catch (e) {
              }
              if (!buffer.warningSent) {
                buffer.warningSent = true;
                const warningText = `\u26A0\uFE0F *L\xCDMITE DE PUBLICACI\xD3N* \u26A0\uFE0F

Hola @${rawPhone}, detect\xE9 que est\xE1s enviando muchas publicaciones seguidas. Para cuidar la visibilidad de tus activos y no saturar el chat de los aliados, te pido que por favor me colabores con esta norma, ya que mis motores de extracci\xF3n de datos solo pueden procesar un m\xE1ximo de *3 publicaciones* por bloque a la vez.

\xA1Espera unos *5 minutos* y luego env\xEDa el siguiente grupo! Tus primeras 3 publicaciones ya est\xE1n siendo procesadas y registradas. \u{1F680}\u{1F3AF}`;
                await this.queuedSend(chatId, warningText, {
                  mentions: [senderId],
                  quotedMessageId: msg.id._serialized
                });
              }
            }
            return;
          }
          clearTimeout(buffer.timer);
          buffer.messages.push({
            body: msg.body,
            hasMedia: msg.hasMedia,
            imageBuffer: void 0,
            // Se descargará en processBuffer
            originalMsg: msg
          });
          console.log(`[BUFFER] Mensaje #${buffer.messages.length} agregado al buffer de ${senderId}.`);
          const bufferTimeout = isGroupChat ? 12e3 : 800;
          buffer.timer = setTimeout(() => this.processBuffer(bufferKey), bufferTimeout);
        } else {
          console.log(`[BUFFER] Nuevo bloque iniciado para ${senderId}. Mensaje #1 registrado.`);
          const bufferTimeout = isGroupChat ? 12e3 : 800;
          this.messageBuffers.set(bufferKey, {
            messages: [{
              body: msg.body,
              hasMedia: msg.hasMedia,
              imageBuffer: void 0,
              // Se descargará en processBuffer
              originalMsg: msg
            }],
            userName: realName,
            chatId,
            timer: setTimeout(() => this.processBuffer(bufferKey), bufferTimeout)
          });
        }
      }
      async processBuffer(bufferKey) {
        const buffer = this.messageBuffers.get(bufferKey);
        if (!buffer) return;
        const userName = buffer.userName;
        const chatId = buffer.chatId;
        const senderId = bufferKey.split("_")[1];
        const isDM = !chatId.includes("@g.us");
        if (isDM) {
          const combinedText = buffer.messages.map((m) => m.body).join("\n\n");
          const cleanStart = combinedText.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
          const { isSessionMuted: isSessionMuted2, muteSession: muteSession2 } = await Promise.resolve().then(() => (init_janIA(), janIA_exports));
          const isMuted = await isSessionMuted2(senderId);
          if (isMuted && cleanStart.startsWith("agente jania")) {
            await muteSession2(senderId, false).catch((err) => console.error("Error unmuting session:", err));
            console.log(`[WWEBJS] Sesi\xF3n reactivada mediante comando del cliente para ${senderId}`);
          }
        }
        let groupName = void 0;
        if (chatId.includes("@g.us")) {
          try {
            const chat = await this.client.getChatById(chatId);
            if (chat && chat.name) {
              groupName = chat.name;
            }
          } catch (e) {
            console.error("[processBuffer] Error fetching group name for WhatsApp-web:", e);
          }
        }
        this.messageBuffers.delete(bufferKey);
        console.log(`[processBuffer] Iniciando procesamiento de ${buffer.messages.length} mensajes en buffer de ${senderId}. GroupName: ${groupName || "none"}`);
        for (const bufferedMsg of buffer.messages) {
          if (bufferedMsg.hasMedia && bufferedMsg.originalMsg.type === "image" && !bufferedMsg.imageBuffer) {
            try {
              console.log(`[VISION] Descargando imagen para ${senderId}...`);
              const media = await bufferedMsg.originalMsg.downloadMedia();
              if (media && media.mimetype.startsWith("image/")) {
                bufferedMsg.imageBuffer = media.data;
              }
            } catch (err) {
              console.error("[VISION] Error descargando media diferida:", err);
            }
          }
          if (bufferedMsg.hasMedia && bufferedMsg.originalMsg.type === "document" && !bufferedMsg.pdfBuffer) {
            try {
              console.log(`[DOCUMENT] Descargando PDF para ${senderId}...`);
              const media = await bufferedMsg.originalMsg.downloadMedia();
              if (media && media.mimetype === "application/pdf") {
                bufferedMsg.pdfBuffer = media.data;
                bufferedMsg.pdfMimeType = media.mimetype;
              }
            } catch (err) {
              console.error("[DOCUMENT] Error descargando documento diferido:", err);
            }
          }
          if (bufferedMsg.hasMedia && (bufferedMsg.originalMsg.type === "ptt" || bufferedMsg.originalMsg.type === "audio") && !bufferedMsg.audioUrl) {
            try {
              console.log(`[AUDIO] Descargando audio/ptt para ${senderId}...`);
              const media = await bufferedMsg.originalMsg.downloadMedia();
              if (media && media.data) {
                const cleanMime = media.mimetype.split(";")[0].trim();
                const bufferData = Buffer.from(media.data, "base64");
                console.log(`[AUDIO] Transcribiendo audio directamente desde el buffer de memoria para ${senderId}...`);
                try {
                  const text2 = await transcribeAudioBuffer(bufferData, cleanMime);
                  bufferedMsg.body = text2;
                  console.log(`[AUDIO] Transcripci\xF3n directa exitosa para ${senderId}: "${text2}"`);
                } catch (transcribeErr) {
                  console.error("[AUDIO] Error al transcribir el buffer de audio:", transcribeErr.message || transcribeErr);
                  bufferedMsg.body = "";
                }
                try {
                  const fileKey = `voice-notes/${senderId}-${Date.now()}.${getAudioExtension(cleanMime)}`;
                  const uploadResult = await storagePut(fileKey, bufferData, cleanMime);
                  bufferedMsg.audioUrl = uploadResult.url;
                  console.log(`[AUDIO] Audio subido exitosamente a storage para ${senderId}. URL: ${bufferedMsg.audioUrl}`);
                } catch (storageErr) {
                  console.warn("[AUDIO] Advertencia: No se pudo subir el audio a storage (puede deberse a falta de credenciales de Forge localmente):", storageErr.message || storageErr);
                }
              }
            } catch (err) {
              console.error("[AUDIO] Error procesando audio diferido:", err);
            }
          }
        }
        try {
          const hasPermittedLink = (text2) => {
            const urlMatch = text2.match(/https?:\/\/[^\s]+/g);
            if (!urlMatch) return false;
            return urlMatch.some((url) => esDominioPermitido(url));
          };
          const partitionTextByListings = (text2) => {
            const lines = text2.split("\n");
            const listings = [];
            let currentListing = [];
            let header = "";
            const itemRegex = /^\s*(\d+)\s*[-.)]\s*(?:ofrezco|busco|vendo|arriendo|apto|casa|bodega|oficina|lote|requerimiento|compro|necesito|local)/i;
            for (const line of lines) {
              const match = line.match(itemRegex);
              if (match) {
                if (currentListing.length > 0) {
                  listings.push(currentListing.join("\n"));
                  currentListing = [];
                }
                currentListing.push(line);
              } else {
                if (listings.length === 0 && currentListing.length === 0) {
                  header += line + "\n";
                } else {
                  currentListing.push(line);
                }
              }
            }
            if (currentListing.length > 0) {
              listings.push(currentListing.join("\n"));
            }
            if (listings.length > 1) {
              return listings.map((l) => header.trim() ? header + "\n" + l : l);
            }
            return [text2];
          };
          const linkGroups = [];
          let currentLinkGroup = [];
          for (const m of buffer.messages) {
            currentLinkGroup.push(m);
            if (hasPermittedLink(m.body)) {
              linkGroups.push(currentLinkGroup);
              currentLinkGroup = [];
            }
          }
          if (currentLinkGroup.length > 0) {
            linkGroups.push(currentLinkGroup);
          }
          const finalListingTexts = [];
          for (const group of linkGroups) {
            const groupText = group.map((m) => m.body).join("\n\n");
            const groupHasMedia = group.some((m) => m.hasMedia);
            const groupHasAudio = group.some((m) => m.originalMsg.type === "ptt" || m.originalMsg.type === "audio");
            const groupImageBuffer = group.find((m) => m.imageBuffer)?.imageBuffer;
            const groupAudioUrl = group.find((m) => m.audioUrl)?.audioUrl;
            const groupPdfBuffer = group.find((m) => m.pdfBuffer)?.pdfBuffer;
            const groupPdfMimeType = group.find((m) => m.pdfMimeType)?.pdfMimeType;
            const originalMsg = group[group.length - 1].originalMsg;
            const partitioned = partitionTextByListings(groupText);
            for (const itemText of partitioned) {
              finalListingTexts.push({
                text: itemText,
                hasMedia: groupHasMedia,
                hasAudio: groupHasAudio,
                imageBuffer: groupImageBuffer,
                audioUrl: groupAudioUrl,
                pdfBuffer: groupPdfBuffer,
                pdfMimeType: groupPdfMimeType,
                originalMsg
              });
            }
          }
          console.log(`[processBuffer] Procesando ${finalListingTexts.length} listings para ${senderId} de un total de ${buffer.messages.length} mensajes en buffer.`);
          let processedListingsCount = 0;
          let warningSent = buffer.warningSent || false;
          const isMainGroup = chatId === this.targetGroupId;
          const limit = isMainGroup ? 3 : 10;
          for (const item of finalListingTexts) {
            const isImageMessage = item.hasMedia && item.originalMsg.type === "image";
            if (!item.text.trim() && !isImageMessage) {
              console.log(`[processBuffer] Saltando mensaje vac\xEDo (sin texto ni imagen) para ${senderId}`);
              continue;
            }
            processedListingsCount++;
            if (processedListingsCount > limit) {
              console.log(`[processBuffer] Listing #${processedListingsCount} excede el l\xEDmite de ${limit} para ${senderId}.`);
              if (isMainGroup) {
                try {
                  await item.originalMsg.react("\u26A0\uFE0F");
                } catch (e) {
                }
                if (!warningSent && chatId.includes("@g.us")) {
                  warningSent = true;
                  const rawPhone = senderId.split("@")[0];
                  const warningText = `\u26A0\uFE0F *L\xCDMITE DE PUBLICACI\xD3N* \u26A0\uFE0F

Hola @${rawPhone}, detect\xE9 que est\xE1s enviando muchas publicaciones seguidas en tu mensaje/bloque. Para cuidar la visibilidad de tus activos y no saturar el chat de los aliados, te pido que por favor me colabores con esta norma, ya que mis motores de extracci\xF3n de datos solo pueden procesar un m\xE1ximo de *3 publicaciones* por bloque a la vez.

\xA1Tus primeras 3 publicaciones ya est\xE1n en proceso! Por favor espera unos *5 minutos* antes de enviar las siguientes. \u{1F680}\u{1F3AF}`;
                  await this.queuedSend(chatId, warningText, {
                    mentions: [senderId],
                    quotedMessageId: item.originalMsg.id._serialized
                  });
                }
              }
              continue;
            }
            await this.logToDb(senderId, "user", item.text);
            const urlMatch = item.text.match(/https?:\/\/[^\s]+/g);
            const scrapedResults = [];
            if (urlMatch) {
              for (const url of urlMatch.slice(0, 3)) {
                if (esDominioPermitido(url)) {
                  try {
                    const data = await scrapePropertyLink(url);
                    if (data) scrapedResults.push(data);
                  } catch (err) {
                  }
                }
              }
            }
            const isDM2 = !chatId.includes("@g.us");
            const pending = isDM2 ? this.pendingData.get(senderId) : null;
            let result;
            if (chatId === this.buzonGroupId) {
              result = await processConsultingMessage(item.text, senderId, userName, item.imageBuffer, item.pdfBuffer, item.pdfMimeType, item.audioUrl);
            } else if (chatId === this.circuloGroupId) {
              result = await processCirculoMessage(item.text, senderId, userName);
            } else {
              if (pending && Date.now() < pending.expiresAt) {
                const combinedText = `[CONTEXTO]: "${pending.originalText}"
[RESPUESTA]: "${item.text}"`;
                this.pendingData.delete(senderId);
                this.savePendingData();
                result = await processWhatsAppMessage(combinedText, senderId, userName, false, [], void 0, item.imageBuffer, !isDM2, item.pdfBuffer, item.pdfMimeType, isDM2 ? void 0 : chatId, groupName);
              } else {
                result = await processWhatsAppMessage(item.text, senderId, userName, item.hasMedia, scrapedResults, item.audioUrl, item.imageBuffer, !isDM2, item.pdfBuffer, item.pdfMimeType, isDM2 ? void 0 : chatId, groupName);
              }
            }
            const textLower = item.text.toLowerCase();
            const wantsVoice = item.hasAudio || !!item.audioUrl || detectaVoz(textLower);
            await this.handleJanIAResponse(result, senderId, chatId, userName, item.text, item.originalMsg, wantsVoice);
          }
          if (isMainGroup) {
            const cooldownKeyFinal = `${chatId}_${senderId}`;
            this.cooldownMap.set(cooldownKeyFinal, {
              lastBlockProcessedAt: Date.now(),
              warningSent
            });
            this.saveCooldowns();
          }
        } catch (e) {
          console.error("[WHATSAPP-BOT] Error cr\xEDtico en procesamiento de bloque:", e);
        }
      }
      // --- DETECTOR DE CONVERSACIÓN ACTIVA ENTRE MIEMBROS ---
      async detectGroupConversation(chatId, senderId, msg) {
        return;
        const isModeratedGroup = chatId === this.targetGroupId || chatId === this.buzonGroupId || chatId === this.circuloGroupId;
        if (!isModeratedGroup) return;
        const botJid = this.client.info?.wid?._serialized;
        if (senderId === botJid || msg.fromMe) return;
        const isPossibleListingMsg = (msg.body || "").length > 250 || (msg.body || "").split("\n").length > 3 || msg.hasMedia && msg.type !== "ptt" && msg.type !== "audio";
        if (isPossibleListingMsg) return;
        const now = Date.now();
        let recent = this.recentGroupMessages.get(chatId) || [];
        recent = recent.filter((m) => now - m.timestamp < 3 * 60 * 1e3);
        recent.push({
          senderId,
          timestamp: now,
          body: msg.body || ""
        });
        this.recentGroupMessages.set(chatId, recent);
        const grouped = [];
        for (const m of recent) {
          if (grouped.length === 0 || grouped[grouped.length - 1].senderId !== m.senderId) {
            grouped.push({ senderId: m.senderId, count: 1 });
          } else {
            grouped[grouped.length - 1].count++;
          }
        }
        const len = grouped.length;
        if (len >= 4) {
          const s1 = grouped[len - 4].senderId;
          const s2 = grouped[len - 3].senderId;
          const s3 = grouped[len - 2].senderId;
          const s4 = grouped[len - 1].senderId;
          if (s1 === s3 && s2 === s4 && s1 !== s2) {
            const lastWarning = this.lastConversationWarningTime.get(chatId) || 0;
            if (now - lastWarning < 15 * 60 * 1e3) {
              return;
            }
            this.lastConversationWarningTime.set(chatId, now);
            console.log(`[CONVERSATION-DETECTOR] Conversaci\xF3n activa detectada en ${chatId} entre ${s3} y ${s4}.`);
            try {
              const chat = await msg.getChat();
              await chat.sendStateRecording();
            } catch (_) {
            }
            const voiceText = "Hola colegas... detect\xE9 que est\xE1n conversando activamente en el grupo... Para cuidar el espacio de todos los aliados y no saturar el canal, les sugiero amablemente que contin\xFAen su charla por mensaje privado... \xA1Muchas gracias, hagamos equipo y cerremos negocios!";
            console.log(`[CONVERSATION-DETECTOR] Generando audio de advertencia...`);
            const voiceMedia = await textToSpeechMedia(voiceText);
            if (voiceMedia) {
              await this.queuedSend(chatId, voiceMedia, { sendAudioAsVoice: true });
              const rawPhoneA = s3.split("@")[0];
              const rawPhoneB = s4.split("@")[0];
              const tagText = `\u{1F449} @${rawPhoneA} @${rawPhoneB}, por favor contin\xFAen por mensaje privado (DM) para no saturar el grupo. \xA1Gracias! \u{1F91D}`;
              await this.queuedSend(chatId, tagText, {
                mentions: [s3, s4],
                quotedMessageId: msg.id._serialized
              });
              console.log(`[CONVERSATION-DETECTOR] Advertencia enviada con \xE9xito a ${chatId}.`);
            }
          }
        }
      }
      // --- ORQUESTACIÓN DE RESPUESTAS Y PERSONALIZACIÓN (JanIA v2.0) ---
      async handleJanIAResponse(result, senderId, chatId, userName, fullText, originalMsg, wantsVoice = false) {
        if (!result) return;
        if (result.inserted) {
          const allowedEmojis = ["\u{1F44D}", "\u{1F44C}", "\u2705", "\u{1F197}", "\u{1F9E1}"];
          const reaction = allowedEmojis[Math.floor(Math.random() * allowedEmojis.length)];
          if (originalMsg) {
            const delayMs = Math.floor(Math.random() * (12e3 - 4e3 + 1)) + 4e3;
            console.log(`[WHATSAPP-BOT] Inserci\xF3n exitosa. Retrasando reacci\xF3n ${reaction} por ${delayMs}ms...`);
            setTimeout(async () => {
              try {
                await originalMsg.react(reaction);
              } catch (e) {
              }
            }, delayMs);
          }
          return;
        }
        const isDM = !chatId.includes("@g.us");
        const { isSessionMuted: isSessionMuted2 } = await Promise.resolve().then(() => (init_janIA(), janIA_exports));
        const isMuted = await isSessionMuted2(senderId);
        if (isDM && isMuted) {
          console.log(`[WHATSAPP-BOT] Chat silenciado (isMuted === true) para ${senderId}. Ignorando respuesta interactiva.`);
          return;
        }
        const isOldMessage = originalMsg && Math.floor(Date.now() / 1e3) - originalMsg.timestamp > 2 * 60 * 60;
        if (isOldMessage) {
          console.log(`[WHATSAPP-BOT] Mensaje de ${senderId} en ${chatId} tiene m\xE1s de 2 horas de antig\xFCedad (${Math.round((Date.now() / 1e3 - originalMsg.timestamp) / 60)} min). Registrado en DB, omitiendo respuesta en WhatsApp.`);
          return;
        }
        const isGroup = chatId.includes("@g.us");
        const isMatch = result.response && (result.response.includes("MATCH COMERCIAL DETECTADO") || result.response.includes("MATCH DETECTADO") || result.response.includes("MATCH INTELIGENTE DETECTADO") || result.response.includes("COINCIDENCIA DE NEGOCIO DETECTADA"));
        const isConsultation = result.classification === "CONSULTA_GENERAL" || result.classification === "RESPUESTA_A_PREGUNTA_IA" || result.classification === "INMUEBLE" || result.classification === "REQUERIMIENTO" || result.classification === "AVALUO_O_LEGAL" || result.classification === "DEBATE_COMPETIDOR" || result.classification === "SOBRE_VECY";
        const isViolation = result.classification === "VIOLACION_DE_NORMAS";
        let isBotAdmin = false;
        let chat = null;
        let strike = 0;
        if (isGroup && originalMsg) {
          try {
            chat = await originalMsg.getChat();
            const botId = this.client.info?.wid?._serialized;
            if (botId && chat.participants) {
              const botParticipant = chat.participants.find((p) => p.id._serialized === botId);
              isBotAdmin = botParticipant?.isAdmin || botParticipant?.isSuperAdmin || false;
            }
          } catch (err) {
            console.error("[WHATSAPP-BOT] Error al verificar permisos de administrador del bot:", err);
          }
        }
        if (isViolation && isGroup) {
          strike = this.incrementStrike(chatId, senderId);
          const phone = senderId.split("@")[0];
          if (isBotAdmin && originalMsg) {
            try {
              console.log(`[WHATSAPP-BOT] Borrando mensaje infractor de ${senderId} en el grupo ${chatId}`);
              await originalMsg.delete(true);
            } catch (delErr) {
              console.error("[WHATSAPP-BOT] Error al borrar mensaje infractor:", delErr.message || delErr);
            }
          }
          let strikeHeader = "";
          if (strike === 1) {
            strikeHeader = `\u26A0\uFE0F *LLAMADO DE ATENCI\xD3N [1/3]* \u26A0\uFE0F

`;
          } else if (strike === 2) {
            strikeHeader = `\u26A0\uFE0F *SEGUNDO LLAMADO DE ATENCI\xD3N [2/3]* \u26A0\uFE0F

`;
          } else {
            strikeHeader = `\u{1F6A8} *EXPULSI\xD3N AUTOM\xC1TICA [3/3]* \u{1F6A8}

`;
          }
          if (strike >= 3) {
            result.response = `${strikeHeader}Colega @${phone}, has acumulado 3 llamados de atenci\xF3n por publicar contenido no permitido en el grupo.

Procediendo a la expulsi\xF3n autom\xE1tica del canal para cuidar el orden de la comunidad de aliados...`;
          } else {
            result.response = `${strikeHeader}${result.response}`;
          }
          if (!isBotAdmin) {
            result.response += `

_(Nota: Por favor nombra a JanIA Administradora del grupo para que pueda borrar los posts prohibidos e implementar la expulsi\xF3n autom\xE1tica de infractores)._`;
          }
        }
        const shouldSendGroup = isGroup && (isMatch || isConsultation || isViolation || result.classification === "DATOS_INCOMPLETOS");
        const shouldSendDMDirect = !isGroup && !result.shouldSendDM;
        const textToDeliver = result.response || "";
        const voiceToDeliver = result.voiceResponse || "";
        const hasAnyContent = textToDeliver.trim() !== "" || voiceToDeliver.trim() !== "";
        if ((shouldSendGroup || shouldSendDMDirect) && hasAnyContent) {
          const mentions = Array.from(/* @__PURE__ */ new Set([...result.mentions || [], senderId]));
          const options = {
            mentions: isGroup ? mentions : []
          };
          if (isViolation && originalMsg) {
            options.quotedMessageId = originalMsg.id._serialized;
          }
          const finalWantsVoice = wantsVoice || result.wantsVoice;
          if (finalWantsVoice) {
            try {
              const chatInstance = chat || await this.client.getChatById(chatId);
              await chatInstance.sendStateRecording();
            } catch (_) {
            }
            console.log(`[TTS] Generando voz para ${chatId}...`);
            const voiceText = voiceToDeliver || textToDeliver;
            const voiceMedia = await textToSpeechMedia(voiceText);
            if (voiceMedia) {
              await this.queuedSend(chatId, voiceMedia, { sendAudioAsVoice: true });
              console.log(`[TTS] \u2713 Solo audio enviado a ${chatId}.`);
            } else {
              console.warn(`[TTS] Audio fall\xF3, enviando texto como respaldo a ${chatId}.`);
              const fallbackText = textToDeliver || voiceToDeliver;
              if (fallbackText.trim() !== "") {
                await this.queuedSend(chatId, fallbackText, options);
              }
            }
          } else {
            if (textToDeliver.trim() !== "") {
              await this.queuedSend(chatId, textToDeliver, options);
            }
          }
          await this.logToDb(senderId, "janIA", textToDeliver || voiceToDeliver);
          if (isGroup && result.sendReputationHook) {
            console.log(`[WhatsApp-Bot] Enviando REPUTATION_HOOK como mensaje separado a ${chatId}...`);
            await this.queuedSend(chatId, REPUTATION_HOOK);
          }
          if (isGroup && strike >= 3 && isBotAdmin && chat) {
            try {
              console.log(`[WHATSAPP-BOT] Retirando infractor ${senderId} del grupo ${chatId}`);
              await chat.removeParticipants([senderId]);
              this.resetStrikes(chatId, senderId);
            } catch (kickErr) {
              console.error("[WHATSAPP-BOT] Error al expulsar infractor:", kickErr.message || kickErr);
            }
          }
        }
        if (originalMsg) {
          try {
            let reaction = result.reactionEmoji;
            const isBuzonOrCirculo = chatId === this.buzonGroupId || chatId === this.circuloGroupId;
            if ((result.classification === "INMUEBLE" || result.classification === "REQUERIMIENTO") && !isBuzonOrCirculo) {
              reaction = "\u2705";
            } else if (result.classification === "DATOS_INCOMPLETOS" && !isBuzonOrCirculo) {
              reaction = "\u{1F914}";
            } else if ((result.classification === "INMUEBLE" || result.classification === "REQUERIMIENTO" || result.classification === "AVALUO_O_LEGAL" || result.classification === "SOBRE_VECY") && isBuzonOrCirculo) {
              reaction = "\u{1F504}";
            } else if (result.classification === "VIOLACION_DE_NORMAS") {
              reaction = "\u274C";
            } else if (!reaction) {
              if (result.classification === "CONSULTA_GENERAL" || result.classification === "SOBRE_VECY" || result.classification === "AVALUO_O_LEGAL" || result.classification === "DEBATE_COMPETIDOR" || result.classification === "RESPUESTA_A_PREGUNTA_IA") {
                if (result.response && result.response.includes("chat.whatsapp.com")) {
                  reaction = "\u{1F504}";
                } else {
                  reaction = "\u{1F4A1}";
                }
              }
            }
            if (reaction) {
              const sendReaction = async () => {
                try {
                  await originalMsg.react(reaction);
                } catch (e) {
                  console.error("[React-Error] Fallo al reaccionar al mensaje original:", e);
                }
              };
              if (result.inserted && reaction === "\u2705") {
                const delayMs = Math.floor(Math.random() * (12e3 - 4e3 + 1)) + 4e3;
                console.log(`[WHATSAPP-BOT] Inserci\xF3n confirmada en Grupo. Retrasando reacci\xF3n ${reaction} por ${delayMs}ms (Protocolo Anti-Ban)...`);
                setTimeout(sendReaction, delayMs);
              } else {
                await sendReaction();
              }
            }
          } catch (e) {
            console.error("[React-Error] Fallo al reaccionar al mensaje original:", e);
          }
        }
        if (result.shouldSendDM) {
          const dmMsg = result.dmResponse || result.response || "";
          const voiceMsg = result.voiceResponse || "";
          const hasDMContent = dmMsg.trim() !== "" || voiceMsg.trim() !== "";
          if (hasDMContent) {
            if (isGroup) {
              console.log(`[WHATSAPP-BOT] Omitiendo DM autom\xE1tico para ${senderId} por DATOS_INCOMPLETOS desde grupo para prevenir reportes de spam.`);
            } else {
              const options = {};
              if (result.dmShouldReply && originalMsg) {
                options.quotedMessageId = originalMsg.id._serialized;
              }
              const finalWantsVoice = wantsVoice || result.wantsVoice;
              if (finalWantsVoice) {
                try {
                  const dmChat = await this.client.getChatById(senderId);
                  await dmChat.sendStateRecording();
                } catch (_) {
                }
                console.log(`[TTS] Generando voz para ${senderId}...`);
                const voiceText = voiceMsg || dmMsg;
                const media = await textToSpeechMedia(voiceText);
                if (media) {
                  await this.queuedSend(senderId, media, { sendAudioAsVoice: true });
                  console.log(`[TTS] \u2713 Solo audio enviado a ${senderId}.`);
                } else {
                  console.warn(`[TTS] Audio fall\xF3, enviando texto a ${senderId}.`);
                  const fallbackText = dmMsg || voiceMsg;
                  if (fallbackText.trim() !== "") {
                    await this.queuedSend(senderId, fallbackText, options);
                  }
                }
              } else {
                if (dmMsg.trim() !== "") {
                  await this.queuedSend(senderId, dmMsg, options);
                }
              }
              await this.logToDb(senderId, "janIA", `[DM] ${dmMsg || voiceMsg}`);
            }
          }
          if (isGroup && result.classification === "DATOS_INCOMPLETOS") {
            this.pendingData.set(senderId, {
              originalText: fullText,
              extractedData: result.extractedData || {},
              classification: result.classification,
              missingFields: result.missingFields || [],
              expiresAt: Date.now() + 2 * 60 * 60 * 1e3
            });
            this.savePendingData();
          }
        }
        if (result.extraDMs && result.extraDMs.length > 0) {
          for (const dm of result.extraDMs) {
            try {
              if (!dm.jid || !dm.jid.includes("@") || dm.jid.split("@")[0].length < 5) {
                console.warn(`[JanIA-MatchDM] Omitiendo JID inv\xE1lido para confirmaci\xF3n de match: ${dm.jid}`);
                continue;
              }
              console.log(`[JanIA-MatchDM] Enviando confirmaci\xF3n de match a ${dm.jid}...`);
              await this.queuedSend(dm.jid, dm.message);
              await this.logToDb(dm.jid, "janIA", `[Match-DM-Request] ${dm.message}`);
            } catch (err) {
              console.error(`[JanIA-MatchDM-Error] Fallo al enviar DM a ${dm.jid}:`, err.message || err);
            }
          }
        }
      }
      // --- LOGÍSTICA DE BASE DE DATOS ---
      async logToDb(senderId, role, content) {
        try {
          const db = await getDb();
          if (!db) return;
          let conv = await db.select().from(conversations).where(eq4(conversations.sessionId, senderId)).limit(1);
          let conversationId;
          if (conv.length === 0) {
            const [newConv] = await db.insert(conversations).values({
              sessionId: senderId,
              status: "active",
              lastMessage: content.substring(0, 200)
            }).returning();
            conversationId = newConv.id;
          } else {
            conversationId = conv[0].id;
          }
          await db.insert(messages).values({
            conversationId,
            role,
            content,
            messageType: "text"
          });
          await db.update(conversations).set({
            lastMessage: content.substring(0, 200),
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq4(conversations.id, conversationId));
        } catch (e) {
        }
      }
      // --- COMANDOS ADMINISTRATIVOS ---
      async handleAdminCommand(msg) {
        const chat = await msg.getChat();
        const senderId = msg.author || msg.from;
        const participant = chat.participants?.find((p) => p.id._serialized === senderId);
        const isAdmin = participant?.isAdmin || participant?.isSuperAdmin || msg.fromMe;
        if (!isAdmin) return;
        const text2 = msg.body.toLowerCase();
        if (text2.includes("normas")) await this.sendNormas();
        else if (text2.includes("pres\xE9ntate")) {
          await this.sendPresentacion();
          setTimeout(() => this.sendNormas(), 4e3);
        } else if (text2.includes("anuncia match") || text2.includes("comunica match")) await this.sendComunicadoMatch();
        else if (text2.includes("anuncia")) await this.sendAnuncioComision();
        else if (text2.includes("dipava")) await this.sendApologyDeLaPava();
        else if (text2.includes("retorno")) await this.sendAnuncioRetorno();
        else if (text2.includes("sincroniza") || text2.includes("catchup")) await this.catchUpMissedMessages();
        else if (text2.includes("cierre") || text2.includes("audios")) await this.sendManualCierreAudios();
      }
      // --- MÉTODOS DE BROADCAST ---
      async sendBatchWelcome() {
        const count = this.pendingWelcomeCount;
        const jids = [...this.pendingWelcomeJids];
        this.pendingWelcomeCount = 0;
        this.pendingWelcomeJids = [];
        this.saveCounter();
        try {
          const welcome = await generateWelcomeMessage(count, this.targetGroupId);
          await this.queuedSend(this.targetGroupId, welcome, { mentions: jids });
        } catch (e) {
          console.error("[Whatsapp-Bot] Error in sendBatchWelcome:", e.message);
        }
      }
      async sendBatchWelcomeForGroup(chatId, jids) {
        const count = jids.length;
        const listCopy = [...jids];
        if (chatId === this.buzonGroupId) {
          this.pendingWelcomeBuzon = [];
        } else if (chatId === this.circuloGroupId) {
          this.pendingWelcomeCirculo = [];
        }
        try {
          const welcome = await generateWelcomeMessage(count, chatId);
          await this.queuedSend(chatId, welcome, { mentions: listCopy });
        } catch (e) {
          console.error(`[Whatsapp-Bot] Error in sendBatchWelcomeForGroup for ${chatId}:`, e.message);
        }
      }
      async sendPresentacion() {
        await this.queuedSend(this.targetGroupId, MSG_PRESENTACION_INSTITUCIONAL);
      }
      async sendNormas() {
        await this.queuedSend(this.targetGroupId, MSG_PAUTAS_FORMATOS);
      }
      async sendAnuncioComision() {
        const msg = `\u{1F4E2} *ANUNCIO:* Seguimos en etapa de prueba gratuita. VECY no cobra comisiones por los matches generados en este grupo. \xA1A cerrar negocios! \u{1F3AF}\u{1F3C6}`;
        await this.queuedSend(this.targetGroupId, msg);
      }
      async sendApologyDeLaPava() {
        const deLaPavaId = "105188731928753@lid";
        await this.queuedSend(this.targetGroupId, `\u{1F64F} Ajuste de sistema realizado. Cobertura nacional el\xE1stica activada para todos los aliados.`);
        await this.queuedSend(deLaPavaId, `Su requerimiento nacional ha sido indexado con \xE9xito. \xA1JanIA sigue atenta!`);
      }
      async sendAnuncioRetorno() {
        const baseMsg = `\u{1F680} *\xA1JANIA EST\xC1 DE VUELTA Y M\xC1S AFILADA QUE NUNCA!* \u{1F916}\u{1F3DB}\uFE0F

\xA1Hola de nuevo, colegas y aliados! \u{1F44B} Tras un breve ajuste t\xE9cnico para fortalecer nuestra infraestructura y preparar el lanzamiento del nuevo portal web privado, estoy de vuelta en el canal para encontrar esos MATCH tan deseados.

Vuelvo con mi *Cerebro Multimodal v2.0* repotenciado y mis sensores m\xE1s afilados que nunca para cuidar la calidad de la red y acelerar nuestros cierres:

\u{1F9E0} *\xBFQu\xE9 puedo hacer por ti en esta v2.0?*
\u25B8 *Ofertas Express (Links):* Comparte el enlace de tus inmuebles de cualquier portal o CRM, y extraer\xE9 la ficha t\xE9cnica en segundos.
\u25B8 *Esc\xE1ner de Flyers (OCR):* \xBFTienes fotos de inmuebles o requerimientos con texto? S\xFAbelas al grupo y leer\xE9 la informaci\xF3n dentro de la imagen.
\u25B8 *Permutas e Intercambios (Voz o Texto):* Escr\xEDbeme o env\xEDame un audio detallando permutas complejas como:
  * \u{1F504} *Mano a mano / Pelo a pelo* (intercambio directo de inmuebles de valor similar).
  * \u{1F3E0}\u2795\u{1F4B5} *Inmueble de menor valor* como parte de pago por uno de mayor valor.
  * \u{1F697} *Veh\xEDculos* recibidos como parte de pago.
  * \u{1F4C8} *CDTs, divisas o activos alternativos* como complemento de negocio.
\u25B8 *Matching Inteligente:* Cruzo ofertas y demandas en tiempo real y les aviso en el acto cuando hay negocio viable.`;
        const jidsToMention = [];
        let welcomePart = "";
        if (this.pendingWelcomeJids && this.pendingWelcomeJids.length > 0) {
          welcomePart += `

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u2728 *\xA1BIENVENIDOS A LA RED VECY NETWORK!* \u2728
Damos una calurosa bienvenida a los nuevos aliados que se han unido a nuestro ecosistema colaborativo:
`;
          this.pendingWelcomeJids.forEach((jid) => {
            const phone = jid.split("@")[0];
            welcomePart += `\u25B8 @${phone}
`;
            jidsToMention.push(jid);
          });
          welcomePart += `
Ya estoy 100% activa para escanear sus publicaciones y buscarles cierres sin cobro de comisiones. \xA1Muchos \xE9xitos en sus negocios! \u{1F680}\u{1F3AF}`;
        }
        const groups = [this.targetGroupId, this.buzonGroupId, this.circuloGroupId];
        const imgPath = path2.resolve("./client/public/jania_perfil.png");
        for (const group of groups) {
          try {
            const isMain = group === this.targetGroupId;
            const msgToSend = isMain ? baseMsg + welcomePart : baseMsg;
            const mentions = isMain ? jidsToMention : [];
            if (fs2.existsSync(imgPath)) {
              const media = MessageMedia.fromFilePath(imgPath);
              await this.queuedSend(group, media, { caption: msgToSend, mentions });
            } else {
              await this.queuedSend(group, msgToSend, { mentions });
            }
          } catch (e) {
            console.error(`Error enviando anuncio de retorno al grupo ${group}:`, e.message);
          }
        }
        if (this.pendingWelcomeJids && this.pendingWelcomeJids.length > 0) {
          this.pendingWelcomeJids = [];
          this.pendingWelcomeCount = 0;
          this.saveCounter();
        }
      }
      async sendComunicadoMatch() {
        try {
          console.log(`[WHATSAPP-BOT] Enviando comunicado de notificaciones de match...`);
          await this.queuedSend(this.targetGroupId, MSG_COMUNICADO_MATCH_NETWORK);
          await delay(3e3);
          await this.queuedSend(this.circuloGroupId, MSG_COMUNICADO_MATCH_CIRCULO);
          console.log("[WHATSAPP-BOT] Comunicado de match enviado con \xE9xito.");
        } catch (err) {
          console.error("[WHATSAPP-BOT] Error al enviar el comunicado de match:", err.message || err);
        }
      }
      async sendToGroup(text2, mediaPath, mentions, groupId) {
        try {
          const options = { mentions: mentions || [] };
          const target = groupId || this.targetGroupId;
          if (mediaPath) {
            const media = MessageMedia.fromFilePath(path2.resolve(mediaPath));
            await this.queuedSend(target, media, { ...options, caption: text2 });
          } else {
            await this.queuedSend(target, text2, options);
          }
        } catch (e) {
          console.error(`[WHATSAPP-BOT] Error enviando mensaje al grupo ${groupId || this.targetGroupId}:`, e);
        }
      }
      async sendVoiceToGroup(text2, groupId) {
        try {
          const target = groupId || this.targetGroupId;
          const cleaned = cleanVoiceText(text2);
          console.log(`[WHATSAPP-BOT] Generando nota de voz para enviar al grupo ${target}...`);
          const voiceMedia = await textToSpeechMedia(cleaned);
          if (voiceMedia) {
            try {
              const chatInstance = await this.client.getChatById(target);
              await chatInstance.sendStateRecording();
            } catch (_) {
            }
            await this.queuedSend(target, voiceMedia, { sendAudioAsVoice: true });
            console.log(`[WHATSAPP-BOT] \u2713 Nota de voz enviada al grupo ${target}.`);
          } else {
            console.warn(`[WHATSAPP-BOT] TTS fall\xF3 para el grupo ${target}, enviando texto.`);
            await this.queuedSend(target, cleaned);
          }
        } catch (e) {
          console.error("[WHATSAPP-BOT] Error enviando nota de voz al grupo:", e);
        }
      }
      async broadcastToAllGroups(text2, mediaPath, mentions) {
        const groups = [this.targetGroupId, this.buzonGroupId, this.circuloGroupId];
        for (const group of groups) {
          try {
            const options = { mentions: mentions || [] };
            if (mediaPath) {
              const media = MessageMedia.fromFilePath(path2.resolve(mediaPath));
              await this.queuedSend(group, media, { ...options, caption: text2 });
            } else {
              await this.queuedSend(group, text2, options);
            }
          } catch (err) {
            console.error(`[WHATSAPP-BOT] Error al transmitir al grupo ${group}:`, err.message || err);
          }
        }
      }
      async broadcastGroupPromos(mediaPath) {
        const promos = [
          { id: this.targetGroupId, msg: MSG_PROMO_INMUEBLES },
          { id: this.buzonGroupId, msg: MSG_PROMO_CONSULTAS },
          { id: this.circuloGroupId, msg: MSG_PROMO_CIRCULO }
        ];
        for (const promo of promos) {
          try {
            if (mediaPath && fs2.existsSync(path2.resolve(mediaPath))) {
              const media = MessageMedia.fromFilePath(path2.resolve(mediaPath));
              await this.queuedSend(promo.id, media, { caption: promo.msg });
            } else {
              await this.queuedSend(promo.id, promo.msg);
            }
          } catch (err) {
            console.error(`[WHATSAPP-BOT] Error al transmitir promo al grupo ${promo.id}:`, err.message || err);
          }
        }
      }
      async sendOtherPromosNow(mediaPath) {
        const promos = [
          { id: this.buzonGroupId, msg: MSG_PROMO_CONSULTAS },
          { id: this.circuloGroupId, msg: MSG_PROMO_CIRCULO }
        ];
        for (const promo of promos) {
          try {
            if (mediaPath && fs2.existsSync(path2.resolve(mediaPath))) {
              const media = MessageMedia.fromFilePath(path2.resolve(mediaPath));
              await this.queuedSend(promo.id, media, { caption: promo.msg });
            } else {
              await this.queuedSend(promo.id, promo.msg);
            }
          } catch (err) {
            console.error(`[WHATSAPP-BOT] Error al transmitir promo al grupo ${promo.id}:`, err.message || err);
          }
        }
      }
      async exportRecentJoinsToFile() {
        try {
          console.log("[WHATSAPP-BOT] Exportando lista de recientes uniones al grupo...");
          const chat = await this.client.getChatById(this.targetGroupId);
          if (!chat) {
            console.error("[WHATSAPP-BOT] No se pudo obtener el chat del grupo.");
            return;
          }
          const messages2 = await chat.fetchMessages({ limit: 50 });
          console.log(`[WHATSAPP-BOT] Analizando ${messages2.length} mensajes en b\xFAsqueda de uniones...`);
          const joinList = [];
          for (const msg of messages2) {
            const isSystemJoin = msg.type === "gp2" || msg.type === "notification" || msg.body && (msg.body.toLowerCase().includes("uni\xF3") || msg.body.toLowerCase().includes("unio") || msg.body.toLowerCase().includes("joined") || msg.body.toLowerCase().includes("a\xF1adi\xF3") || msg.body.toLowerCase().includes("a\xF1adio") || msg.body.toLowerCase().includes("added"));
            if (isSystemJoin) {
              const timestamp2 = msg.timestamp * 1e3;
              const date = new Date(timestamp2).toLocaleString("es-CO", { timeZone: "America/Bogota" });
              const author = msg.author || msg.from;
              const phone = author ? author.split("@")[0] : "Desconocido";
              let contactName = "Desconocido";
              if (author) {
                try {
                  await new Promise((resolve) => setTimeout(resolve, 500));
                  const contact = await this.client.getContactById(author);
                  contactName = contact.name || contact.pushname || "";
                } catch (e) {
                }
              }
              joinList.push({
                fecha: date,
                timestamp: timestamp2,
                telefono: phone,
                nombre: contactName,
                mensaje: msg.body || `Mensaje de sistema de tipo ${msg.type}`
              });
            }
          }
          joinList.sort((a, b) => b.timestamp - a.timestamp);
          let fileContent = `=== LISTADO DE UNIONES RECIENTES EN EL GRUPO ===
Generado el: ${(/* @__PURE__ */ new Date()).toLocaleString("es-CO", { timeZone: "America/Bogota" })}

`;
          for (const entry of joinList) {
            fileContent += `\u{1F4C5} Fecha: ${entry.fecha}
\u{1F4DE} Tel\xE9fono: +${entry.telefono}
\u{1F464} Nombre: ${entry.nombre}
\u{1F4AC} Evento: ${entry.mensaje}
-------------------------------------------
`;
          }
          const outputPath = path2.join(process.cwd(), "recent_joins.txt");
          fs2.writeFileSync(outputPath, fileContent, "utf8");
          console.log(`[WHATSAPP-BOT] \xA1Listado exportado con \xE9xito a ${outputPath}!`);
        } catch (err) {
          console.error("[WHATSAPP-BOT] Error exportando uniones:", err.message || err);
        }
      }
      createClientInstance(remotePath) {
        this.client = new Client({
          authStrategy: new LocalAuth({
            clientId: "session-jania-main",
            dataPath: "./.wwebjs_auth"
          }),
          webVersionCache: {
            type: "remote",
            remotePath: remotePath || "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1042391138-alpha.html"
          },
          puppeteer: {
            headless: true,
            executablePath: process.env.CHROME_PATH || void 0,
            args: [
              "--no-sandbox",
              "--disable-setuid-sandbox",
              "--disable-dev-shm-usage",
              "--disable-gpu",
              "--disable-extensions",
              "--disable-software-rasterizer",
              "--disable-features=IsolateOrigins,site-per-process",
              "--disable-site-isolation-trials",
              "--no-zygote",
              "--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              // Optimizaciones de Rendimiento
              "--disable-canvas-path-rendering",
              "--disable-accelerated-2d-canvas",
              "--disable-gl-drawing-for-tests",
              "--mute-audio",
              "--no-first-run",
              "--no-default-browser-check",
              "--disable-background-timer-throttling",
              "--disable-backgrounding-occluded-windows",
              "--disable-renderer-backgrounding",
              "--js-flags=--max-old-space-size=512"
            ],
            protocolTimeout: 3e5
          }
        });
        global.whatsappClient = this.client;
        this.setupEventListeners();
      }
      startWatchdog() {
        if (this.watchdogInterval) {
          clearInterval(this.watchdogInterval);
        }
        console.log("[WHATSAPP-BOT] Iniciando Watchdog de Keep-Alive (5 min)...");
        this.watchdogInterval = setInterval(async () => {
          if (!this.isReady) return;
          try {
            const statePromise = this.client.getState();
            const timeoutPromise = new Promise(
              (_, reject) => setTimeout(() => reject(new Error("Timeout al obtener estado de WhatsApp")), 15e3)
            );
            const state = await Promise.race([statePromise, timeoutPromise]);
            console.log(`[WHATSAPP-BOT] [Watchdog] Estado actual de conexi\xF3n: ${state}`);
            if (state !== "CONNECTED") {
              console.warn(`[WHATSAPP-BOT] [Watchdog] Estado anormal detectado: ${state}. Iniciando reconexi\xF3n...`);
              await this.reconnectClient();
            }
          } catch (err) {
            console.error(`[WHATSAPP-BOT] [Watchdog] Falla o bloqueo detectado: ${err.message || err}. Iniciando reconexi\xF3n...`);
            await this.reconnectClient();
          }
        }, 5 * 60 * 1e3);
      }
      async reconnectClient() {
        this.isReady = false;
        try {
          console.log("[WHATSAPP-BOT] Destruyendo cliente de WhatsApp actual...");
          this.client.removeAllListeners();
          await this.client.destroy();
        } catch (destroyErr) {
          console.error("[WHATSAPP-BOT] Error al destruir el cliente:", destroyErr.message || destroyErr);
        }
        console.log("[WHATSAPP-BOT] Re-inicializando cliente de WhatsApp...");
        try {
          const remotePath = await getLatestWAWebVersion();
          console.log(`[WHATSAPP-BOT] [Reconexi\xF3n] Usando versi\xF3n de WhatsApp Web: ${remotePath}`);
          this.createClientInstance(remotePath);
          await this.client.initialize();
          console.log("[WHATSAPP-BOT] Cliente de WhatsApp re-inicializado exitosamente.");
        } catch (initErr) {
          console.error("[WHATSAPP-BOT] Error al re-inicializar el cliente:", initErr.message || initErr);
        }
      }
      async catchUpMissedMessages() {
        try {
          console.log("[WHATSAPP-BOT] [Catch-Up] Iniciando escaneo de mensajes perdidos en el grupo principal...");
          const chat = await this.client.getChatById(this.targetGroupId);
          const messages2 = await chat.fetchMessages({ limit: 50 });
          const db = await getDb();
          if (!db) {
            console.error("[WHATSAPP-BOT] [Catch-Up] Base de datos no disponible.");
            return;
          }
          await this.queuedSend(this.targetGroupId, `\u{1F504} *Iniciando sincronizaci\xF3n:* Analizando las \xFAltimas 50 publicaciones para detectar registros perdidos...`);
          let count = 0;
          for (const msg of messages2) {
            if (msg.fromMe || !msg.body || msg.body.trim() === "") continue;
            const senderId = msg.author || msg.from;
            const botJid = this.client.info?.wid?._serialized;
            if (senderId === botJid || this.blacklistedBots.includes(senderId)) continue;
            let conv = await db.select().from(conversations).where(eq4(conversations.sessionId, senderId)).limit(1);
            if (conv.length > 0) {
              const existing = await db.select().from(messages).where(
                and3(
                  eq4(messages.conversationId, conv[0].id),
                  eq4(messages.content, msg.body)
                )
              ).limit(1);
              if (existing.length > 0) {
                continue;
              }
            }
            console.log(`[WHATSAPP-BOT] [Catch-Up] Detectado mensaje perdido de ${senderId}: "${msg.body.substring(0, 50)}..."`);
            await this.handleIncomingMessage(msg, this.targetGroupId);
            count++;
            await delay(5e3);
          }
          console.log(`[WHATSAPP-BOT] [Catch-Up] Escaneo finalizado. Inyectados ${count} mensajes perdidos.`);
          await this.queuedSend(this.targetGroupId, `\u{1F504} *Sincronizaci\xF3n finalizada:* Se detectaron y procesaron exitosamente *${count}* publicaciones pendientes.`);
        } catch (err) {
          console.error("[WHATSAPP-BOT] [Catch-Up] Error durante el escaneo de mensajes:", err.message || err);
        }
      }
      async sendManualCierreAudios() {
        console.log("[WHATSAPP-BOT] Generando y enviando audios de cierre manuales (Solo por hoy)...");
        const grupos = [
          {
            id: this.targetGroupId,
            nombre: "VECY INMUEBLES NETWORK",
            promptCierre: "Genera una nota de voz corta en espa\xF1ol de despedida y cierre de jornada para el grupo de WhatsApp VECY INMUEBLES NETWORK. Agradece la actividad de hoy y desp\xEDdete con calidez. Recuerda que no cobramos comisiones y que las ofertas y demandas cruzadas son el motor de la red."
          },
          {
            id: this.buzonGroupId,
            nombre: "BUZ\xD3N DE CONSULTOR\xCDA INMOBILIARIA 24/7",
            promptCierre: "Genera una nota de voz corta en espa\xF1ol de despedida y cierre de jornada para el grupo de WhatsApp Buz\xF3n de Consultor\xEDa. Agradece la atenci\xF3n a los casos jur\xEDdicos y de comisiones compartidas resueltos hoy, deseando un feliz descanso."
          },
          {
            id: this.circuloGroupId,
            nombre: "C\xCDRCULO CERO",
            promptCierre: "Genera una nota de voz corta en espa\xF1ol de despedida y cierre de jornada para el grupo de WhatsApp C\xEDrculo Cero. Agradece el debate y las sugerencias de hoy sobre el futuro del sector."
          }
        ];
        for (const grupo of grupos) {
          if (!grupo.id) continue;
          try {
            const response1 = await invokeLLM({
              messages: [
                { role: "system", content: "Eres JanIA, la asistente de voz e inteligencia artificial de la red inmobiliaria colaborativa VECY Network. Te expresas de manera natural, humana, c\xE1lida y profesional." },
                { role: "user", content: `${grupo.promptCierre}
- IMPORTANTE: Debe sonar como un mensaje de voz natural de WhatsApp grabado de forma espont\xE1nea por una colega real. Empieza con naturalidad como: "Hola colegas", "Buenas tardes", etc. sin formalismos rob\xF3ticos.
- M\xE1ximo 350 caracteres.
- CR\xCDTICO: Responde \xDANICAMENTE con las palabras habladas de la nota de voz. NO agregues pre\xE1mbulos, comentarios ni envuelvas el texto en comillas, llaves o corchetes.` }
              ]
            });
            const content1 = response1.choices[0]?.message?.content;
            if (content1 && content1.trim() !== "") {
              await this.sendVoiceToGroup(content1, grupo.id);
            }
            await delay(6e3);
            const promptMotivacion = `Genera un segundo mensaje de voz corto y motivador en espa\xF1ol para el grupo "${grupo.nombre}".
Direcci\xF3n obligatoria:
- El objetivo es motivar a los miembros para que en la jornada de ma\xF1ana comiencen a confiar m\xE1s en JanIA y a probar el sistema sin miedo (ya sea escribiendo o enviando notas de voz sobre sus inmuebles o dudas).
- Expl\xEDcales que no deben tener miedo de interactuar con la IA y que estamos en fase de pruebas gratuitas listos para ayudarlos a conectar negocios.
- Debe sonar sumamente cercano, entusiasta and amigable, como una colega entusiasmada por los \xE9xitos del d\xEDa siguiente.
- M\xE1ximo 350 caracteres.
- CR\xCDTICO: Responde \xDANICAMENTE con el texto hablado de la nota de voz. NO agregues pre\xE1mbulos, comentarios ni envuelvas el texto en comillas, llaves o corchetes.`;
            const response2 = await invokeLLM({
              messages: [
                { role: "system", content: "Eres JanIA, la asistente de voz e inteligencia artificial de la red inmobiliaria colaborativa VECY Network. Te expresas de manera natural, humana, c\xE1lida y profesional." },
                { role: "user", content: promptMotivacion }
              ]
            });
            const content2 = response2.choices[0]?.message?.content;
            if (content2 && content2.trim() !== "") {
              await this.sendVoiceToGroup(content2, grupo.id);
            }
            await delay(8e3);
          } catch (err) {
            console.error(`\u274C Error en sendManualCierreAudios para el grupo ${grupo.nombre}:`, err.message || err);
          }
        }
      }
      async initialize() {
        const useCloud = process.env.USE_WHATSAPP_CLOUD_API === "true";
        const enablePupForGroups = process.env.ENABLE_PUPPETEER_FOR_GROUPS === "true";
        if (useCloud && !enablePupForGroups) {
          console.log("[WHATSAPP-BOT] Inicializando en modo WhatsApp Cloud API (Meta) puro - Puppeteer desactivado.");
          this.isReady = true;
          return;
        }
        if (useCloud && enablePupForGroups) {
          console.log("[WHATSAPP-BOT] Inicializando en MODO H\xCDBRIDO: DMs por Cloud API (Meta) + Grupos por Puppeteer (inicializando cliente...).");
        } else {
          console.log("[WHATSAPP-BOT] Inicializando en modo Puppeteer puro (inicializando cliente...).");
        }
        try {
          const remotePath = await getLatestWAWebVersion();
          console.log(`[WHATSAPP-BOT] Usando versi\xF3n de WhatsApp Web: ${remotePath}`);
          this.createClientInstance(remotePath);
          await this.client.initialize();
        } catch (err) {
          console.error("[WHATSAPP-BOT] Error cr\xEDtico durante la inicializaci\xF3n de whatsapp-web.js:", err);
        }
      }
      setPendingDataForUser(senderId, originalText, extractedData, classification, missingFields) {
        this.pendingData.set(senderId, {
          originalText,
          extractedData: extractedData || {},
          classification,
          missingFields: missingFields || [],
          expiresAt: Date.now() + 2 * 60 * 60 * 1e3
        });
        this.savePendingData();
        console.log(`[WHATSAPP-BOT] Guardada sesi\xF3n de datos incompletos en memoria para ${senderId}`);
      }
    };
    whatsappBot = new WhatsAppBot();
  }
});

// server/_core/whatsapp-match.ts
var whatsapp_match_exports = {};
__export(whatsapp_match_exports, {
  JaniaMatchBot: () => JaniaMatchBot,
  janiaMatchBot: () => janiaMatchBot
});
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  delay as delay2,
  downloadMediaMessage,
  fetchLatestBaileysVersion,
  Browsers
} from "@whiskeysockets/baileys";
import qrcodeTerminal from "qrcode-terminal";
import fs3 from "fs";
import path3 from "path";
import { eq as eq5 } from "drizzle-orm";
import QRCode from "qrcode";
var SERVER_BOOT_TIME2, outgoingQueue2, JaniaMatchBot, janiaMatchBot;
var init_whatsapp_match = __esm({
  "server/_core/whatsapp-match.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_scraper();
    init_whatsapp();
    init_voiceTranscription();
    SERVER_BOOT_TIME2 = Math.floor(Date.now() / 1e3);
    outgoingQueue2 = Promise.resolve();
    JaniaMatchBot = class {
      sock = null;
      isReady = false;
      // Grupos autorizados y configuraciones
      authorizedGroups = [];
      messageBuffers = /* @__PURE__ */ new Map();
      redirectCooldowns = /* @__PURE__ */ new Map();
      processingLocks = /* @__PURE__ */ new Map();
      lastGroupMessageTime = /* @__PURE__ */ new Map();
      botSentMessageIds = /* @__PURE__ */ new Set();
      lastHumanIntervention = /* @__PURE__ */ new Map();
      dmMessageBuffers = /* @__PURE__ */ new Map();
      targetGroupId = "120363260108880069@g.us";
      buzonGroupId = "120363417740040773@g.us";
      circuloGroupId = "120363403507276533@g.us";
      cooldownMap = /* @__PURE__ */ new Map();
      cooldownFile = path3.join(process.cwd(), ".cooldown_map.json");
      constructor() {
        global.janiaMatchBotInstance = this;
        console.log("[JANIA-MATCH] Inicializando JanIA Match Bot (Ojos y O\xEDdos) con Baileys...");
        const groupsEnv = process.env.JANIA_MATCH_GROUPS;
        if (groupsEnv) {
          this.authorizedGroups = groupsEnv.split(",").map((g) => g.trim());
        } else {
          this.authorizedGroups = [
            "120363260108880069@g.us",
            // VECY INMUEBLES NETWORK
            "120363417740040773@g.us",
            // VECY: SOPORTE LEGAL, CONTRATOS Y AVALÚOS
            "120363403507276533@g.us"
            // CÍRCULO CERO 👌
          ];
        }
        this.loadCooldowns();
        this.setupGracefulShutdown();
      }
      async initialize() {
        try {
          const sessionDir = path3.join(process.cwd(), ".baileys_auth");
          const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
          if (!fs3.existsSync(path3.join(sessionDir, "creds.json"))) {
            await saveCreds();
            console.log("[JANIA-MATCH] \u{1F4BE} Guardadas credenciales iniciales de Baileys en el disco.");
          }
          let version = [2, 3e3, 1017531287];
          try {
            const { version: latestVersion } = await fetchLatestBaileysVersion();
            version = latestVersion;
            console.log(`[JANIA-MATCH] Usando versi\xF3n de WhatsApp Web: ${version.join(".")}`);
          } catch (e) {
            console.warn("[JANIA-MATCH] No se pudo obtener la versi\xF3n din\xE1mica de WhatsApp Web, usando fallback:", e.message);
          }
          console.log("[JANIA-MATCH] Estableciendo conexi\xF3n por WebSocket...");
          this.sock = makeWASocket({
            auth: state,
            version,
            printQRInTerminal: false,
            // Lo manejamos nosotros de forma personalizada
            browser: Browsers.macOS("Desktop"),
            syncFullHistory: false,
            markOnlineOnConnect: false,
            connectTimeoutMs: 9e4,
            // Aumentado a 90s para conexiones lentas
            defaultQueryTimeoutMs: 9e4,
            keepAliveIntervalMs: 2e4,
            // Ping Keep-Alive de WebSocket cada 20 segundos
            emitOwnEvents: true
          });
          this.setupEventListeners(saveCreds);
        } catch (err) {
          console.error("[JANIA-MATCH] Error cr\xEDtico al inicializar el cliente Baileys:", err);
        }
      }
      setupEventListeners(saveCreds) {
        this.sock.ev.on("creds.update", async () => {
          console.log("[JANIA-MATCH] \u{1F4BE} Evento creds.update disparado.");
          try {
            await saveCreds();
            console.log("[JANIA-MATCH] \u{1F4BE} saveCreds() ejecutado con \xE9xito.");
            const sessionDir = path3.join(process.cwd(), ".baileys_auth");
            if (fs3.existsSync(sessionDir)) {
              const files = fs3.readdirSync(sessionDir);
              console.log("[JANIA-MATCH] \u{1F4BE} Archivos en .baileys_auth:", files);
            }
          } catch (err) {
            console.error("[JANIA-MATCH] \u274C Error al guardar credenciales:", err.message || err);
          }
        });
        this.sock.ev.on("connection.update", async (update) => {
          const { connection, lastDisconnect, qr } = update;
          if (qr) {
            console.log("\n[JANIA-MATCH] \u{1F50C} ESCANEA ESTE C\xD3DIGO QR PARA INICIAR JANIA MATCH:");
            qrcodeTerminal.generate(qr, { small: true });
            try {
              const qrPath = path3.join(process.cwd(), "qr-match.png");
              QRCode.toFile(qrPath, qr, { width: 400, margin: 2 }, (err) => {
                if (err) console.error("[JANIA-MATCH] Error guardando QR PNG:", err.message);
                else console.log(`[JANIA-MATCH] \u{1F4F8} QR guardado como imagen en la ra\xEDz del proyecto.`);
              });
            } catch (e) {
              console.warn("[JANIA-MATCH] qrcode no disponible para PNG.", e.message);
            }
          }
          if (connection === "close") {
            const error = lastDisconnect?.error;
            const statusCode = error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            const isRestart = statusCode === DisconnectReason.restartRequired;
            const isConnectionLost = statusCode === DisconnectReason.connectionLost;
            const delayMs = isRestart || isConnectionLost ? 1e3 : 5e3;
            console.warn(`[JANIA-MATCH] \u26A0\uFE0F Conexi\xF3n Baileys cerrada (c\xF3digo: ${statusCode}): ${error?.message || error}. Reconectando en ${delayMs}ms: ${shouldReconnect}`);
            this.isReady = false;
            if (shouldReconnect) {
              setTimeout(() => this.initialize(), delayMs);
            } else {
              console.error("[JANIA-MATCH] Sesi\xF3n de WhatsApp cerrada (Logged Out). Limpiando credenciales...");
              try {
                fs3.rmSync(path3.join(process.cwd(), ".baileys_auth"), { recursive: true, force: true });
              } catch (e) {
              }
              setTimeout(() => this.initialize(), 5e3);
            }
          } else if (connection === "open") {
            console.log("\n\u{1F680} JANIA MATCH\u{1F50C}\u{1F498} \u2014 BOT DE ESCUCHA Y MATCHES ACTIVADO CORRECTAMENTE CON BAILEYS");
            this.isReady = true;
          }
        });
        this.sock.ev.on("messages.upsert", async (m) => {
          if (m.type !== "notify") return;
          for (const msg of m.messages) {
            if (!msg.key || !msg.message) continue;
            const fromMe = msg.key.fromMe;
            const rawChatId = msg.key.remoteJid;
            if (!rawChatId) continue;
            const cleanJid = (jid) => {
              if (!jid) return "";
              if (jid.includes("@")) {
                const [userPart, domain] = jid.split("@");
                const cleanUser = userPart.split(":")[0];
                return `${cleanUser}@${domain}`;
              }
              return jid.split(":")[0];
            };
            const chatId = cleanJid(rawChatId);
            const isGroup = chatId.endsWith("@g.us");
            if (fromMe && isGroup) continue;
            const rawSenderId = isGroup ? msg.key.participant || msg.participant : rawChatId;
            if (!rawSenderId || isGroup && rawSenderId.endsWith("@g.us")) continue;
            const senderId = cleanJid(rawSenderId);
            if (chatId.includes("status@broadcast") || senderId.includes("status@broadcast")) {
              continue;
            }
            const timestamp2 = msg.messageTimestamp;
            if (timestamp2 && Number(timestamp2) < SERVER_BOOT_TIME2) {
              continue;
            }
            try {
              if (isGroup) {
                if (msg.message.stickerMessage) {
                  return;
                }
                let body = "";
                let isAudioPTT = false;
                if (msg.message.conversation) body = msg.message.conversation;
                else if (msg.message.extendedTextMessage) body = msg.message.extendedTextMessage.text || "";
                else if (msg.message.imageMessage) body = msg.message.imageMessage.caption || "";
                else if (msg.message.documentMessage) body = msg.message.documentMessage.caption || "";
                else if (msg.message.videoMessage) body = msg.message.videoMessage.caption || "";
                else if (msg.message.audioMessage) {
                  isAudioPTT = true;
                  try {
                    console.log(`[JANIA-MATCH] Transcribiendo audio PTT de ${senderId} en grupo ${chatId}...`);
                    const audioBuffer = await downloadMediaMessage(msg, "buffer", {});
                    if (audioBuffer && audioBuffer.length > 0) {
                      const mimeType = msg.message.audioMessage.mimetype || "audio/ogg; codecs=opus";
                      const transcription = await transcribeAudioBuffer(audioBuffer, mimeType);
                      if (transcription && transcription.trim() !== "") {
                        body = transcription.trim();
                        console.log(`[JANIA-MATCH] Transcripci\xF3n exitosa: "${body.substring(0, 80)}..."`);
                      } else {
                        body = "[audio-vac\xEDo]";
                      }
                    } else {
                      body = "[audio-sin-buffer]";
                    }
                  } catch (audioErr) {
                    console.error("[JANIA-MATCH] Error al transcribir audio PTT:", audioErr.message || audioErr);
                    body = "[audio-error]";
                  }
                }
                const textLower = body.toLowerCase();
                const hasDirectMention = textLower.includes("jania");
                const isMainGroup = chatId === this.targetGroupId;
                const isBuzonGroup = chatId === this.buzonGroupId;
                const isCirculoGroup = chatId === this.circuloGroupId;
                const isOfficialGroup = isMainGroup || isBuzonGroup || isCirculoGroup;
                let groupName = "Nombre Real del Grupo";
                try {
                  const metadata = await this.sock.groupMetadata(chatId);
                  if (metadata && metadata.subject) {
                    groupName = metadata.subject;
                  }
                } catch (e) {
                }
                const NEGOTIATION_GROUPS_BLACKLIST = [
                  "Venta Alameda",
                  "Negociaci\xF3n ARRECIFES"
                ];
                if (NEGOTIATION_GROUPS_BLACKLIST.some((name) => groupName.includes(name))) {
                  console.log(`[JANIA-MATCH] Mensaje omitido: el grupo "${groupName}" est\xE1 en la blacklist de negociaci\xF3n.`);
                  return;
                }
                if (!isOfficialGroup) {
                  const words = body.trim().split(/\s+/).filter((w) => w.length > 0);
                  const hasLinks = textLower.includes("http") || textLower.includes("www");
                  const hasAttachments = !!msg.message.imageMessage || !!msg.message.documentMessage || !!msg.message.videoMessage || isAudioPTT;
                  if (words.length < 10 && !hasLinks && !hasAttachments) {
                    console.log(`[JANIA-MATCH] Omitiendo mensaje corto de grupo externo "${groupName}" por Protocolo Anti-Ban (Palabras: ${words.length}).`);
                    return;
                  }
                }
                const isPossibleListing = body.length > 120 || body.split("\n").length > 2 || !!msg.message.imageMessage || !!msg.message.documentMessage || textLower.includes("http") || textLower.includes("www") || textLower.includes("ofrezco") || textLower.includes("busco") || textLower.includes("vendo") || textLower.includes("arriendo") || textLower.includes("compro") || textLower.includes("necesito") || textLower.includes("renta") || textLower.includes("alquilo") || textLower.includes("permuto") || textLower.includes("requiero") || textLower.includes("casa") || textLower.includes("apto") || textLower.includes("apartamento") || textLower.includes("bodega") || textLower.includes("oficina") || textLower.includes("lote") || textLower.includes("local");
                const isHelpOrSystemQuery = !isPossibleListing && (textLower.includes("c\xF3mo subo") || textLower.includes("como subo") || textLower.includes("c\xF3mo publico") || textLower.includes("como publico") || textLower.includes("c\xF3mo se publica") || textLower.includes("como se publica") || textLower.includes("c\xF3mo registrar") || textLower.includes("como registrar") || textLower.includes("c\xF3mo funciona") || textLower.includes("como funciona") || textLower.includes("de qu\xE9 consiste") || textLower.includes("de que consiste") || textLower.includes("en qu\xE9 consiste") || textLower.includes("en que consiste") || textLower.includes("c\xF3mo hago para") || textLower.includes("como hago para") || textLower.includes("c\xF3mo buscar") || textLower.includes("como buscar") || textLower.includes("c\xF3mo encontrar") || textLower.includes("como encontrar") || textLower.includes("mec\xE1nica del grupo") || textLower.includes("mecanica del grupo") || textLower.includes("qued\xF3 guardado") || textLower.includes("quedo guardado") || textLower.includes("se guard\xF3") || textLower.includes("se guardo") || textLower.includes("fue guardado") || textLower.includes("falt\xF3 alg\xFAn dato") || textLower.includes("falto algun dato") || textLower.includes("falt\xF3 un dato") || textLower.includes("falto un dato") || textLower.includes("datos faltantes") || textLower.includes("subi\xF3 correctamente") || textLower.includes("subio correctamente") || textLower.includes("fue subido") || textLower.includes("mejor forma de publicar") || textLower.includes("c\xF3mo es mejor") || textLower.includes("como es mejor") || textLower.includes("para obtener resultados") || textLower.includes("ayuda") && textLower.includes("inmueble") || textLower.includes("explicar") && textLower.includes("grupo") || textLower.includes("c\xF3mo") && textLower.includes("grupo"));
                const textClean = body.toLowerCase().trim();
                const isAudioFailed = body === "[audio-vac\xEDo]" || body === "[audio-sin-buffer]" || body === "[audio-error]";
                const isShortCourtesy = !isAudioPTT && (textClean.length < 6 || ["ok", "listo", "vale", "claro", "gracias", "hola", "hola!", "jaja", "jajaja", "\u{1F44D}", "\u2705", "\u{1F44F}", "\u{1F60A}", "\u{1F64F}"].includes(textClean));
                const isInteractiveGroupQuery = !isPossibleListing && (isAudioPTT || (isBuzonGroup || isCirculoGroup || isMainGroup) && !isShortCourtesy);
                const shouldRespond = hasDirectMention || isHelpOrSystemQuery || isInteractiveGroupQuery;
                if (shouldRespond) {
                  let isBotAdmin = false;
                  try {
                    const metadata = await this.sock.groupMetadata(chatId);
                    const me = this.sock.user?.id ? this.sock.user.id.split(":")[0] : "";
                    const myParticipant = metadata.participants.find((p) => p.id.split("@")[0] === me);
                    isBotAdmin = !!myParticipant && (myParticipant.admin === "admin" || myParticipant.admin === "superadmin");
                  } catch (err) {
                    isBotAdmin = false;
                  }
                  const { isOutsideWorkingHours: isOutsideWorkingHours2 } = await Promise.resolve().then(() => (init_janIA(), janIA_exports));
                  const isOffHours = isOutsideWorkingHours2();
                  const canRespond = isOfficialGroup || isOffHours;
                  if (canRespond) {
                    console.log(`[JANIA-MATCH] Respondiendo en grupo ${chatId} (Oficial=${isOfficialGroup}, OffHours=${isOffHours}, BotAdmin=${isBotAdmin}).`);
                    await this.handleDirectGroupQuestion(msg, chatId, senderId, body);
                  } else {
                    console.log(`[JANIA-MATCH] Ignorado en ${chatId} (Oficial=${isOfficialGroup}, OffHours=${isOffHours}, BotAdmin=${isBotAdmin}).`);
                  }
                  return;
                }
                if (isPossibleListing) {
                  await this.handleIncomingGroupMessage(msg, chatId, body);
                }
                return;
              }
              if (!isGroup) {
                const rawPhone = senderId.split("@")[0];
                const ADMIN_PHONE = process.env.ADMIN_PHONE || "573166569719";
                const isAdmin = rawPhone.includes(ADMIN_PHONE) || rawPhone === ADMIN_PHONE || rawPhone === "573166569719" || rawPhone.includes("573185462265");
                const userName = msg.pushName || `Asesor +${rawPhone}`;
                let body = "";
                if (msg.message?.conversation) body = msg.message.conversation;
                else if (msg.message?.extendedTextMessage) body = msg.message.extendedTextMessage.text || "";
                else if (msg.message?.imageMessage) body = msg.message.imageMessage.caption || "";
                else if (msg.message?.documentMessage) body = msg.message.documentMessage.caption || "";
                else if (msg.message?.videoMessage) body = msg.message.videoMessage.caption || "";
                if (msg.key.fromMe) {
                  const msgId = msg.key.id || "";
                  if (!this.botSentMessageIds.has(msgId)) {
                    console.log(`[JANIA-MATCH] Intervenci\xF3n humana detectada en DM ${senderId}. Silenciando bot.`);
                    this.lastHumanIntervention.set(senderId, Date.now());
                    const { muteSession: muteSession3 } = await Promise.resolve().then(() => (init_janIA(), janIA_exports));
                    await muteSession3(senderId, true).catch((err) => console.error("Error muting session in database:", err));
                  }
                  return;
                }
                const cleanStart = body.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
                const { isSessionMuted: isSessionMuted2, muteSession: muteSession2 } = await Promise.resolve().then(() => (init_janIA(), janIA_exports));
                let isMuted = await isSessionMuted2(senderId);
                if (isMuted) {
                  if (cleanStart.startsWith("agente jania")) {
                    await muteSession2(senderId, false).catch((err) => console.error("Error unmuting session:", err));
                    isMuted = false;
                    console.log(`[JANIA-MATCH] Sesi\xF3n reactivada mediante comando de cliente para ${senderId}`);
                  }
                }
                const lastIntervention = this.lastHumanIntervention.get(senderId) || 0;
                const cooldownPeriod = 30 * 60 * 1e3;
                if (isMuted || Date.now() - lastIntervention < cooldownPeriod) {
                }
                let buffer = this.dmMessageBuffers.get(senderId);
                if (!buffer) {
                  buffer = { messages: [], timer: null };
                  this.dmMessageBuffers.set(senderId, buffer);
                }
                buffer.messages.push(msg);
                if (buffer.timer) {
                  clearTimeout(buffer.timer);
                }
                buffer.timer = setTimeout(async () => {
                  this.dmMessageBuffers.delete(senderId);
                  try {
                    await this.processBufferedDmMessages(senderId, userName, rawPhone, buffer.messages, isAdmin);
                  } catch (err) {
                    console.error("[JANIA-MATCH] Error al procesar mensajes de DM acumulados:", err);
                  }
                }, 2500);
                return;
              }
            } catch (err) {
              console.error("[JANIA-MATCH] Error en procesador de eventos de mensaje:", err);
            }
          }
        });
      }
      async processBufferedDmMessages(senderId, userName, rawPhone, messages2, isAdmin) {
        let combinedBody = "";
        let mainMsg = messages2[messages2.length - 1];
        let imageBuffer;
        let pdfBuffer;
        let pdfMimeType;
        for (const msg of messages2) {
          let body2 = "";
          if (msg.message?.conversation) body2 = msg.message.conversation;
          else if (msg.message?.extendedTextMessage) body2 = msg.message.extendedTextMessage.text || "";
          else if (msg.message?.imageMessage) body2 = msg.message.imageMessage.caption || "";
          else if (msg.message?.documentMessage) body2 = msg.message.documentMessage.caption || "";
          else if (msg.message?.videoMessage) body2 = msg.message.videoMessage.caption || "";
          if (body2.trim()) {
            combinedBody += (combinedBody ? "\n" : "") + body2.trim();
          }
          if (msg.message?.imageMessage && !imageBuffer) {
            try {
              const media = await downloadMediaMessage(msg, "buffer", {});
              imageBuffer = media.toString("base64");
              mainMsg = msg;
            } catch (e) {
            }
          }
          if (msg.message?.documentMessage && !pdfBuffer) {
            try {
              const media = await downloadMediaMessage(msg, "buffer", {});
              pdfBuffer = media.toString("base64");
              pdfMimeType = msg.message.documentMessage.mimetype || "application/pdf";
              mainMsg = msg;
            } catch (e) {
            }
          }
        }
        if (!combinedBody.trim() && !imageBuffer && !pdfBuffer) {
          return;
        }
        const chatId = senderId;
        const body = combinedBody;
        if (!isAdmin) {
          const textLower = body.toLowerCase();
          const isPossibleListing = body.length > 120 || body.split("\n").length > 2 || !!imageBuffer || !!pdfBuffer || textLower.includes("http") || textLower.includes("www") || textLower.includes("ofrezco") || textLower.includes("busco") || textLower.includes("vendo") || textLower.includes("arriendo") || textLower.includes("compro") || textLower.includes("necesito");
          if (isPossibleListing) {
            console.log(`[JANIA-MATCH] Detectada publicaci\xF3n comercial agrupada en DM privado de ${senderId}. Procesando...`);
            await this.logToDb(senderId, "user", body);
            const { processWhatsAppMessage: processWhatsAppMessage2 } = await Promise.resolve().then(() => (init_janIA(), janIA_exports));
            const result = await processWhatsAppMessage2(
              body,
              senderId,
              userName,
              !!imageBuffer || !!pdfBuffer,
              [],
              void 0,
              imageBuffer,
              false,
              // isGroup = false
              pdfBuffer,
              pdfMimeType
            );
            if (result) {
              const emoji = this.getReactionEmoji(result);
              if (emoji) {
                const sendReaction = async () => {
                  try {
                    await this.sock.sendMessage(chatId, { react: { text: emoji, key: mainMsg.key } });
                  } catch (e) {
                  }
                };
                const delayMs = Math.floor(Math.random() * (12e3 - 4e3 + 1)) + 4e3;
                console.log(`[JANIA-MATCH] Inserci\xF3n confirmada en DM. Retrasando reacci\xF3n ${emoji} por ${delayMs}ms (Protocolo Anti-Ban)...`);
                setTimeout(sendReaction, delayMs);
              }
            }
            return;
          }
          const { isSessionMuted: isSessionMuted2 } = await Promise.resolve().then(() => (init_janIA(), janIA_exports));
          const isMuted = await isSessionMuted2(senderId);
          if (isMuted) {
            console.log(`[JANIA-MATCH] Chat silenciado (isMuted === true) para ${senderId}. Ignorando mensaje interactivo.`);
            return;
          }
          const { isOutsideWorkingHours: isOutsideWorkingHours2 } = await Promise.resolve().then(() => (init_janIA(), janIA_exports));
          const isOffHours = isOutsideWorkingHours2();
          if (isOffHours) {
            console.log(`[JANIA-MATCH] Conversaci\xF3n DM fuera de horario con ${senderId}. Enviando nota de voz.`);
            await this.logToDb(senderId, "user", body);
            await this.handlePrivateDmConversation(mainMsg, senderId, rawPhone, body);
            return;
          } else {
            console.log(`[JANIA-MATCH] DM de ${rawPhone} recibido en horario laboral. Redirigiendo con texto.`);
            await this.logToDb(senderId, "user", body);
            await this.handleRedirectText(mainMsg, senderId, rawPhone);
            return;
          }
        }
        console.log(`[JANIA-MATCH] [Admin/Test] Atendiendo mensaje de admin/test ${senderId}...`);
        const matchConfirmationRegex = /^\s*(sí|si|no)\s+#m(\d+)\s*$/i;
        const matchConfirm = body.match(matchConfirmationRegex);
        if (matchConfirm) {
          const decision = matchConfirm[1].toLowerCase();
          const matchId = parseInt(matchConfirm[2], 10);
          await this.processMatchConfirmation(senderId, userName, matchId, decision);
          return;
        }
        await this.logToDb(senderId, "user", body);
        await this.handlePrivateDmConversation(mainMsg, senderId, rawPhone, body);
      }
      // --- REDIRECCIÓN DE CHATS PRIVADOS ---
      async handlePrivateDmRedirect(chatId, senderId) {
        const now = Date.now();
        const lastRedirect = this.redirectCooldowns.get(senderId) || 0;
        const ONCE_A_DAY = 24 * 60 * 60 * 1e3;
        if (now - lastRedirect > ONCE_A_DAY) {
          this.redirectCooldowns.set(senderId, now);
          const redirectLink = "https://wa.me/573185462265";
          const redirectText = `\xA1Hola! \u{1F916} Soy *JanIA Match* \u{1F50C}\u{1F498}.

Este n\xFAmero est\xE1 destinado *\xFAnicamente a trabajar, escuchar y gestionar los grupos de la red*.

Para hablar en privado, buscar propiedades, hacer consultas o recibir soporte y atenci\xF3n, por favor escribe directamente a mi versi\xF3n principal, *JanIA v3.5*:

\u{1F449} ${redirectLink}`;
          this.queuedSend(chatId, redirectText);
        }
      }
      // --- RESPUESTA DIRECTA A PREGUNTAS EN GRUPOS ---
      async handleDirectGroupQuestion(msg, chatId, senderId, bodyText) {
        try {
          let resolvedSenderId = senderId;
          if (senderId.endsWith("@lid") && this.sock?.signalRepository?.lidMapping?.getPNForLID) {
            try {
              const mappedPn = await this.sock.signalRepository.lidMapping.getPNForLID(senderId);
              if (mappedPn) {
                const cleanUser = mappedPn.split(":")[0].split("@")[0];
                resolvedSenderId = `${cleanUser}@s.whatsapp.net`;
                console.log(`[JANIA-MATCH] [DirectGroupQuestion] Resolviendo LID ${senderId} to PN ${resolvedSenderId}`);
              }
            } catch (err) {
            }
          }
          const realName = msg.pushName || `Asesor +${resolvedSenderId.split("@")[0]}`;
          const textLower = bodyText.toLowerCase();
          const { detectaVoz: detectaVoz2, textToSpeechMedia: textToSpeechMedia2 } = await Promise.resolve().then(() => (init_whatsapp(), whatsapp_exports));
          const { processWhatsAppMessage: processWhatsAppMessage2, processConsultingMessage: processConsultingMessage2, processCirculoMessage: processCirculoMessage2 } = await Promise.resolve().then(() => (init_janIA(), janIA_exports));
          const wantsVoice = msg.message?.audioMessage || detectaVoz2(textLower);
          if (wantsVoice) {
            await this.sock.sendPresenceUpdate("recording", chatId);
          } else {
            await this.sock.sendPresenceUpdate("composing", chatId);
          }
          await delay2(2e3);
          const isAudioFailed = bodyText === "[audio-vac\xEDo]" || bodyText === "[audio-sin-buffer]" || bodyText === "[audio-error]";
          if (isAudioFailed) {
            const failMsg = `Hola ${realName} \u{1F44B}\u{1F3FB}, escuch\xE9 que enviaste una nota de voz. Lamentablemente tuve un inconveniente t\xE9cnico al procesarla en este momento. \u{1F64F}

Te pido que:
\u270F\uFE0F Escribas tu consulta por texto aqu\xED en el grupo, o
\u{1F4F2} Me la env\xEDes directamente en mi chat privado: https://wa.me/573166569719

\xA1En el chat privado puedo escuchar y procesar tus audios sin problemas! \u{1F60A}`;
            await this.queuedSend(chatId, failMsg, { mentions: [senderId], quoted: msg });
            await this.sock.sendPresenceUpdate("paused", chatId);
            return;
          }
          const isMainGroupChat = chatId === this.targetGroupId;
          if (isMainGroupChat) {
            const textLower2 = bodyText.toLowerCase();
            const isOffTopicLegal = textLower2.includes("contrato") || textLower2.includes("arrendamiento") || textLower2.includes("promesa") || textLower2.includes("sucesi\xF3n") || textLower2.includes("sucesion") || textLower2.includes("herencia") || textLower2.includes("embargo") || textLower2.includes("comisi\xF3n") || textLower2.includes("comision") || textLower2.includes("tributar") || textLower2.includes("impuesto") || textLower2.includes("retenci\xF3n") || textLower2.includes("retencion") || textLower2.includes("ganancia ocasional") || textLower2.includes("aval\xFAo") || textLower2.includes("avaluo") || textLower2.includes("escritura") || textLower2.includes("notar\xEDa") || textLower2.includes("juridic") || textLower2.includes("demandar") || textLower2.includes("demanda") || textLower2.includes("ley ") || textLower2.includes("juzgado") || textLower2.includes("abogado");
            const isOffTopicCirculo = textLower2.includes("vecy network") || textLower2.includes("proyecto") || textLower2.includes("sugerencia") || textLower2.includes("portal web") || textLower2.includes("jania funciona") || textLower2.includes("inteligencia artificial") || textLower2.includes("c\xF3mo funciona la ia") || textLower2.includes("como funciona la ia") || textLower2.includes("competencia") || textLower2.includes("testimonio") || textLower2.includes("fundador") || textLower2.includes("jani alves") || textLower2.includes("eduardo");
            if (isOffTopicLegal || isOffTopicCirculo) {
              const groupName = isOffTopicLegal ? "VECY: SOPORTE LEGAL, TRIBUTARIO Y AVAL\xDAOS" : "C\xEDrculo CERO \u{1F44C}";
              const redirectMsg = `Hola ${realName} \u{1F44B}\u{1F3FB}, veo que tu consulta es sobre ${isOffTopicLegal ? "temas jur\xEDdicos, tributarios o de aval\xFAos" : "el funcionamiento de VECY Network y JanIA"}. \xA1Perfecto! \u{1F3AF}

Ese tipo de preguntas las atiendo con m\xE1s profundidad en el grupo *${groupName}* de nuestra comunidad de WhatsApp. \u{1F3E0}

Tambi\xE9n puedes consultarme directamente en mi chat privado con mi otra yo *JanIA v3.5* \u{1F4F2}: https://wa.me/573166569719

\xA1All\xED te atiendo con todo el detalle que mereces! \u{1F60A}`;
              await this.queuedSend(chatId, redirectMsg, { mentions: [senderId], quoted: msg });
              await this.sock.sendPresenceUpdate("paused", chatId);
              return;
            }
          }
          let result;
          if (chatId === this.buzonGroupId) {
            result = await processConsultingMessage2(bodyText, resolvedSenderId, realName);
          } else if (chatId === this.circuloGroupId) {
            result = await processCirculoMessage2(bodyText, resolvedSenderId, realName);
          } else if (isMainGroupChat) {
            let groupName = "VECY INMUEBLES NETWORK";
            try {
              const metadata = await this.sock.groupMetadata(chatId);
              if (metadata && metadata.subject) {
                groupName = metadata.subject;
              }
            } catch (e) {
            }
            result = await processWhatsAppMessage2(
              bodyText,
              resolvedSenderId,
              realName,
              false,
              [],
              void 0,
              void 0,
              true,
              void 0,
              void 0,
              chatId,
              groupName
            );
          } else {
            const redirectMsg = `\xA1Hola! \u{1F60A} Para resolver tus inquietudes inmobiliarias, dudas de corretaje, soporte t\xE9cnico o de cuenta, te invito a consultarme en privado a mi otro yo: **JanIA de Soporte y Atenci\xF3n** \u{1F4F2} en el n\xFAmero +57 3185462265 o haciendo clic aqu\xED: https://wa.me/573185462265. \xA1All\xED con gusto te responder\xE9 a profundidad! \u{1F680}`;
            await this.queuedSend(chatId, redirectMsg, {
              mentions: [resolvedSenderId],
              quoted: msg
            });
            await this.sock.sendPresenceUpdate("paused", chatId);
            return;
          }
          if (result && result.response && result.response.trim() !== "") {
            const textToDeliver = result.response;
            const voiceToDeliver = result.voiceResponse || "";
            if (wantsVoice && voiceToDeliver.trim() !== "") {
              const media = await textToSpeechMedia2(voiceToDeliver);
              if (media) {
                await this.queuedSend(chatId, media, { sendAudioAsVoice: true, quoted: msg });
              } else {
                await this.queuedSend(chatId, textToDeliver, {
                  mentions: [senderId],
                  quoted: msg
                });
              }
            } else {
              await this.queuedSend(chatId, textToDeliver, {
                mentions: [senderId],
                quoted: msg
              });
            }
            await this.logToDb(chatId, "janIA", textToDeliver);
          }
          await this.sock.sendPresenceUpdate("paused", chatId);
        } catch (err) {
          console.error("[JANIA-MATCH] Error al responder pregunta directa en grupo:", err);
        }
      }
      // --- LOGÍSTICA DE BUFFER GRUPAL ---
      async handleIncomingGroupMessage(msg, chatId, bodyText) {
        if (!msg.key || !msg.message) return;
        const rawSender = msg.key.participant || msg.participant || "";
        if (!rawSender || rawSender.endsWith("@g.us")) {
          console.warn(`[JANIA-MATCH] Omitiendo mensaje de grupo: sender individual inv\xE1lido (${rawSender})`);
          return;
        }
        const senderId = rawSender.includes("@") ? `${rawSender.split("@")[0].split(":")[0]}@${rawSender.split("@")[1]}` : rawSender.split(":")[0];
        const lockKey = `${chatId}_${senderId}`;
        const previousLock = this.processingLocks.get(lockKey) || Promise.resolve();
        let resolveLock;
        const currentLock = new Promise((resolve) => {
          resolveLock = resolve;
        });
        const chainedLock = previousLock.then(() => currentLock);
        this.processingLocks.set(lockKey, chainedLock);
        try {
          await previousLock;
          const realName = msg.pushName || `Asesor +${senderId.split("@")[0]}`;
          const bufferKey = `${chatId}_${senderId}`;
          const isMainGroup = chatId === this.targetGroupId;
          const textLower = bodyText.toLowerCase();
          const now = Date.now();
          const COOLDOWN_PERIOD = 5 * 60 * 1e3;
          let isBotAdmin = false;
          try {
            const metadata = await this.sock.groupMetadata(chatId);
            const me = this.sock.user?.id ? this.sock.user.id.split(":")[0] : "";
            const myParticipant = metadata.participants.find((p) => p.id.split("@")[0] === me);
            isBotAdmin = !!myParticipant && (myParticipant.admin === "admin" || myParticipant.admin === "superadmin");
          } catch (_) {
          }
          if (isBotAdmin) {
            const lastMsgTime = this.lastGroupMessageTime.get(`${chatId}_${senderId}`) || 0;
            const ONE_MINUTE = 60 * 1e3;
            if (now - lastMsgTime < ONE_MINUTE) {
              console.log(`[JANIA-MATCH] Doble posteo detectado para ${senderId} en ${chatId} (Mismo minuto).`);
              try {
                await this.sock.sendMessage(chatId, { react: { text: "\u{1F6A8}", key: msg.key } });
                const warningText = `\xA1Hola! \u26A0\uFE0F He detectado que est\xE1s enviando m\xFAltiples publicaciones consecutivas en menos de un minuto. Debes publicar cada una pero con un intervalo de tiempo justificable de por lo menos UN MINUTO o DOS de diferencia entre cada publicaci\xF3n para poder hacer el proceso perfectamente y poderlo subir a nuestra base de datos de manera correcta, ya que NO puedo revisar tantos inmuebles de un solo tajo ni incluirlos en la base de datos de inmediato. Esto es con el fin de mantener el buen funcionamiento del sistema y ver si le encontramos una coincidencia o MATCH a tus publicaciones. \xA1Gracias por tu amable comprensi\xF3n! \u{1F91D}\u{1F680}`;
                await this.queuedSend(chatId, warningText, { quoted: msg, mentions: [senderId] });
              } catch (e) {
              }
              return;
            }
            this.lastGroupMessageTime.set(`${chatId}_${senderId}`, now);
          }
          if (isMainGroup) {
            this.loadCooldowns();
            const cooldownKey = `${chatId}_${senderId}`;
            const cooldown = this.cooldownMap.get(cooldownKey);
            if (cooldown && now - cooldown.lastBlockProcessedAt < COOLDOWN_PERIOD) {
              if (this.authorizedGroups.includes(chatId)) {
                try {
                  await this.sock.sendMessage(chatId, { react: { text: "\u26A0\uFE0F", key: msg.key } });
                } catch (e) {
                }
              }
              return;
            }
          }
          let buffer = this.messageBuffers.get(bufferKey);
          const bufferTimeout = 12e3;
          const MAX_BLOCK_SIZE = 3;
          if (buffer) {
            const hasExistingListing = buffer.messages.some((m) => {
              const bodyLower = m.body.toLowerCase();
              return m.body.length > 120 || m.body.split("\n").length > 2 || m.hasMedia || bodyLower.includes("http") || bodyLower.includes("www") || bodyLower.includes("ofrezco") || bodyLower.includes("busco") || bodyLower.includes("vendo") || bodyLower.includes("arriendo") || bodyLower.includes("compro") || bodyLower.includes("necesito");
            });
            if (isMainGroup && hasExistingListing) {
              console.log(`[BUFFER] Intento de m\xFAltiple propiedad detectado para ${senderId}. Mensaje descartado.`);
              if (this.authorizedGroups.includes(chatId)) {
                try {
                  await this.sock.sendMessage(chatId, { react: { text: "\u26A0\uFE0F", key: msg.key } });
                } catch (e) {
                }
              }
              return;
            }
            const limit = isMainGroup ? MAX_BLOCK_SIZE : 10;
            if (buffer.messages.length >= limit) {
              console.log(`[BUFFER] L\xEDmite de mensajes del bloque (${limit}) alcanzado para ${senderId}. Mensaje descartado.`);
              if (this.authorizedGroups.includes(chatId)) {
                try {
                  await this.sock.sendMessage(chatId, { react: { text: "\u26A0\uFE0F", key: msg.key } });
                } catch (e) {
                }
              }
              return;
            }
            clearTimeout(buffer.timer);
            buffer.messages.push({
              body: bodyText,
              hasMedia: !!msg.message.imageMessage || !!msg.message.documentMessage,
              originalMsg: msg
            });
            buffer.timer = setTimeout(() => this.processGroupBuffer(bufferKey), bufferTimeout);
          } else {
            this.messageBuffers.set(bufferKey, {
              messages: [{
                body: bodyText,
                hasMedia: !!msg.message.imageMessage || !!msg.message.documentMessage,
                originalMsg: msg
              }],
              userName: realName,
              chatId,
              timer: setTimeout(() => this.processGroupBuffer(bufferKey), bufferTimeout)
            });
          }
        } finally {
          resolveLock();
          if (this.processingLocks.get(lockKey) === chainedLock) {
            this.processingLocks.delete(lockKey);
          }
        }
      }
      getReactionEmoji(result) {
        if (result && result.inserted) {
          const allowedEmojis = ["\u{1F44D}", "\u{1F44C}", "\u2705", "\u{1F197}", "\u{1F9E1}"];
          return allowedEmojis[Math.floor(Math.random() * allowedEmojis.length)];
        }
        return null;
      }
      async processGroupBuffer(bufferKey) {
        const buffer = this.messageBuffers.get(bufferKey);
        if (!buffer) return;
        this.messageBuffers.delete(bufferKey);
        const senderId = bufferKey.split("_")[1];
        const chatId = buffer.chatId;
        const userName = buffer.userName;
        let resolvedSenderId = senderId;
        if (senderId.endsWith("@lid") && this.sock?.signalRepository?.lidMapping?.getPNForLID) {
          try {
            const mappedPn = await this.sock.signalRepository.lidMapping.getPNForLID(senderId);
            if (mappedPn) {
              const cleanUser = mappedPn.split(":")[0].split("@")[0];
              resolvedSenderId = `${cleanUser}@s.whatsapp.net`;
              console.log(`[JANIA-MATCH] Resolviendo LID ${senderId} a PN ${resolvedSenderId}`);
            }
          } catch (err) {
            console.warn(`[JANIA-MATCH] No se pudo resolver PN para LID ${senderId}:`, err);
          }
        }
        console.log(`[JANIA-MATCH] Procesando buffer de ${buffer.messages.length} mensajes para ${resolvedSenderId} (Silencioso)...`);
        for (const bufferedMsg of buffer.messages) {
          if (bufferedMsg.hasMedia && bufferedMsg.originalMsg.message?.imageMessage) {
            try {
              const mediaBuffer = await downloadMediaMessage(bufferedMsg.originalMsg, "buffer", {});
              bufferedMsg.imageBuffer = mediaBuffer.toString("base64");
            } catch (e) {
            }
          }
          if (bufferedMsg.hasMedia && bufferedMsg.originalMsg.message?.documentMessage) {
            try {
              const mediaBuffer = await downloadMediaMessage(bufferedMsg.originalMsg, "buffer", {});
              bufferedMsg.pdfBuffer = mediaBuffer.toString("base64");
              bufferedMsg.pdfMimeType = bufferedMsg.originalMsg.message.documentMessage.mimetype || "application/pdf";
            } catch (e) {
            }
          }
        }
        try {
          const fullText = buffer.messages.map((m) => m.body).join("\n\n");
          const hasMedia = buffer.messages.some((m) => m.hasMedia);
          const imageMsg = buffer.messages.find((m) => m.imageBuffer);
          const pdfMsg = buffer.messages.find((m) => m.pdfBuffer);
          const urlMatch = fullText.match(/https?:\/\/[^\s]+/g);
          const scrapedResults = [];
          if (urlMatch) {
            for (const url of urlMatch.slice(0, 3)) {
              if (esDominioPermitido(url)) {
                try {
                  const data = await scrapePropertyLink(url);
                  if (data) scrapedResults.push(data);
                } catch (err) {
                }
              }
            }
          }
          await this.logToDb(resolvedSenderId, "user", fullText);
          const { processWhatsAppMessage: processWhatsAppMessage2, processConsultingMessage: processConsultingMessage2, processCirculoMessage: processCirculoMessage2 } = await Promise.resolve().then(() => (init_janIA(), janIA_exports));
          const { sendAdminNotification: sendAdminNotification2 } = await Promise.resolve().then(() => (init_whatsapp(), whatsapp_exports));
          let result;
          if (chatId === "120363417740040773@g.us") {
            result = await processConsultingMessage2(
              fullText,
              resolvedSenderId,
              userName,
              imageMsg?.imageBuffer,
              pdfMsg?.pdfBuffer,
              pdfMsg?.pdfMimeType
            );
          } else if (chatId === "120363403507276533@g.us") {
            result = await processCirculoMessage2(
              fullText,
              resolvedSenderId,
              userName
            );
          } else {
            let groupName = "Nombre Real del Grupo";
            try {
              const metadata = await this.sock.groupMetadata(chatId);
              if (metadata && metadata.subject) {
                groupName = metadata.subject;
              }
            } catch (e) {
            }
            result = await processWhatsAppMessage2(
              fullText,
              resolvedSenderId,
              userName,
              hasMedia,
              scrapedResults,
              void 0,
              imageMsg?.imageBuffer,
              true,
              pdfMsg?.pdfBuffer,
              pdfMsg?.pdfMimeType,
              chatId,
              groupName
            );
          }
          if (result) {
            const emoji = this.getReactionEmoji(result);
            if (emoji) {
              const sendReaction = async () => {
                try {
                  const lastMsg = buffer.messages[buffer.messages.length - 1].originalMsg;
                  console.log(`[JANIA-MATCH] Reaccionando con ${emoji} al mensaje de ${senderId}`);
                  await this.sock.sendMessage(chatId, { react: { text: emoji, key: lastMsg.key } });
                } catch (reactErr) {
                  console.error("[JANIA-MATCH] Error al reaccionar al mensaje:", reactErr.message || reactErr);
                }
              };
              const delayMs = Math.floor(Math.random() * (12e3 - 4e3 + 1)) + 4e3;
              console.log(`[JANIA-MATCH] Inserci\xF3n confirmada en Grupo. Retrasando reacci\xF3n ${emoji} por ${delayMs}ms (Protocolo Anti-Ban)...`);
              setTimeout(sendReaction, delayMs);
            }
          }
          if (result) {
            const isWarning = result.classification === "DATOS_INCOMPLETOS" || result.classification === "VIOLACION_DE_NORMAS";
            let isBotAdmin = false;
            try {
              const metadata = await this.sock.groupMetadata(chatId);
              const me = this.sock.user?.id ? this.sock.user.id.split(":")[0] : "";
              const myParticipant = metadata.participants.find((p) => p.id.split("@")[0] === me);
              isBotAdmin = !!myParticipant && (myParticipant.admin === "admin" || myParticipant.admin === "superadmin");
            } catch (_) {
            }
            if (!isWarning) {
              const isConsultation = result.classification === "CONSULTA_GENERAL" || result.classification === "RESPUESTA_A_PREGUNTA_IA" || result.classification === "ANALISIS_DE_MERCADO";
              if (isConsultation) {
                console.log(`[JANIA-MATCH] Consulta general de ${senderId} en ${chatId} procesada en silencio.`);
              } else {
                if (result.response && result.response.trim() !== "") {
                  console.log(`[JANIA-MATCH] Match detectado silenciosamente. Alertas enviadas al administrador.`);
                  await sendAdminNotification2(`\u{1F3AF} *[MATCH DETECTADO]*

${result.response}`);
                  await this.logToDb(senderId, "janIA", `[SILENT-MATCH] ${result.response}`);
                }
              }
            } else {
              console.log(`[JANIA-MATCH] Publicaci\xF3n con advertencia/incompleta de ${senderId} en ${chatId} procesada.`);
              if (result.classification === "VIOLACION_DE_NORMAS" && isBotAdmin && result.response && result.response.trim() !== "") {
                const textToDeliver = result.response;
                const { textToSpeechMedia: textToSpeechMedia2 } = await Promise.resolve().then(() => (init_whatsapp(), whatsapp_exports));
                const voiceToDeliver = result.voiceResponse || textToDeliver;
                let audioSent = false;
                try {
                  const media = await textToSpeechMedia2(voiceToDeliver);
                  if (media) {
                    const lastMsg = buffer.messages[buffer.messages.length - 1].originalMsg;
                    await this.queuedSend(chatId, media, { sendAudioAsVoice: true, quoted: lastMsg });
                    audioSent = true;
                  }
                } catch (audioErr) {
                  console.error("[JANIA-MATCH] Error al enviar audio de amonestaci\xF3n:", audioErr);
                }
                if (!audioSent) {
                  const lastMsg = buffer.messages[buffer.messages.length - 1].originalMsg;
                  await this.queuedSend(chatId, textToDeliver, { quoted: lastMsg });
                }
                await this.logToDb(chatId, "janIA", `[GROUP-WARNING] ${textToDeliver}`);
              }
            }
            if (result.extraDMs && result.extraDMs.length > 0) {
              for (const dm of result.extraDMs) {
                if (!dm.jid || !dm.jid.includes("@") || dm.jid.split("@")[0].length < 5) continue;
                console.log(`[JANIA-MATCH] [Stealth] Derivando notificaci\xF3n de Match adicional para ${dm.jid} a alertas de administrador.`);
                await sendAdminNotification2(dm.message);
              }
            }
          }
          const isMainGroup = chatId === this.targetGroupId;
          if (isMainGroup) {
            const cooldownKeyFinal = `${chatId}_${senderId}`;
            this.loadCooldowns();
            this.cooldownMap.set(cooldownKeyFinal, {
              lastBlockProcessedAt: Date.now(),
              warningSent: false
            });
            this.saveCooldowns();
          }
        } catch (err) {
          console.error("[JANIA-MATCH] Error procesando buffer de grupo silencioso:", err);
        }
      }
      // --- LOGÍSTICA DE BD ---
      async logToDb(senderId, role, content) {
        try {
          const db = await getDb();
          if (!db) return;
          let conv = await db.select().from(conversations).where(eq5(conversations.sessionId, senderId)).limit(1);
          let conversationId;
          if (conv.length === 0) {
            const [newConv] = await db.insert(conversations).values({
              sessionId: senderId,
              status: "active",
              lastMessage: content.slice(0, 150)
            }).returning();
            conversationId = newConv.id;
          } else {
            conversationId = conv[0].id;
            await db.update(conversations).set({
              lastMessage: content.slice(0, 150),
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq5(conversations.id, conversationId));
          }
          await db.insert(messages).values({
            conversationId,
            role,
            content,
            messageType: "text"
          });
        } catch (e) {
          console.error("[JANIA-MATCH] Error al registrar logs en BD:", e);
        }
      }
      async parseAndSaveSilently(msg, senderId, rawPhone, bodyText) {
        try {
          let imageBuffer;
          let pdfBuffer;
          let pdfMimeType;
          if (msg.message?.imageMessage) {
            try {
              const mediaBuffer = await downloadMediaMessage(msg, "buffer", {});
              imageBuffer = mediaBuffer.toString("base64");
            } catch (e) {
              console.error("[JanIA-DM-Vision-Silent] Error descargando imagen:", e);
            }
          } else if (msg.message?.documentMessage) {
            try {
              const mediaBuffer = await downloadMediaMessage(msg, "buffer", {});
              pdfBuffer = mediaBuffer.toString("base64");
              pdfMimeType = msg.message.documentMessage.mimetype || "application/pdf";
            } catch (e) {
              console.error("[JanIA-DM-Document-Silent] Error descargando documento:", e);
            }
          }
          const realName = msg.pushName || `Asesor +${rawPhone}`;
          const { processWhatsAppMessage: processWhatsAppMessage2 } = await Promise.resolve().then(() => (init_janIA(), janIA_exports));
          const result = await processWhatsAppMessage2(
            bodyText,
            senderId,
            realName,
            !!imageBuffer || !!pdfBuffer,
            [],
            void 0,
            imageBuffer,
            true,
            // isGroup = true (forces parsing)
            pdfBuffer,
            pdfMimeType,
            senderId
          );
          if (result) {
            let reaction = "";
            if (result.classification === "INMUEBLE" || result.classification === "REQUERIMIENTO") {
              reaction = "\u2705";
            } else if (result.classification === "DATOS_INCOMPLETOS" || result.missingFields && result.missingFields.length > 0) {
              reaction = "\u{1F914}";
            }
            if (reaction) {
              const sendReaction = async () => {
                try {
                  await this.sock.sendMessage(senderId, { react: { text: reaction, key: msg.key } });
                } catch (_) {
                }
              };
              if (result.inserted && reaction === "\u2705") {
                const delayMs = Math.floor(Math.random() * (12e3 - 4e3 + 1)) + 4e3;
                console.log(`[JANIA-MATCH] Inserci\xF3n confirmada en parseAndSaveSilently. Retrasando reacci\xF3n ${reaction} por ${delayMs}ms (Protocolo Anti-Ban)...`);
                setTimeout(sendReaction, delayMs);
              } else {
                await sendReaction();
              }
            }
            if (result.response && result.response.trim() !== "" && result.classification !== "DATOS_INCOMPLETOS" && result.classification !== "VIOLACION_DE_NORMAS") {
              const isMatch = result.response.includes("MATCH COMERCIAL DETECTADO") || result.response.includes("MATCH DETECTADO") || result.response.includes("MATCH INTELIGENTE DETECTADO") || result.response.includes("COINCIDENCIA DE NEGOCIO DETECTADA");
              if (isMatch) {
                const { sendAdminNotification: sendAdminNotification2 } = await Promise.resolve().then(() => (init_whatsapp(), whatsapp_exports));
                await sendAdminNotification2(`\u{1F3AF} *[MATCH DETECTADO POR DM]*

${result.response}`);
              }
            }
          }
        } catch (err) {
          console.error("[JANIA-MATCH] Fallo en parseAndSaveSilently:", err);
        }
      }
      async handlePrivateDmConversation(msg, senderId, rawPhone, bodyText) {
        try {
          const realName = msg.pushName || `Asesor +${rawPhone}`;
          await this.sock.sendPresenceUpdate("recording", senderId);
          const saludo = getGreetingByTime2();
          const firstName = extractFirstName2(realName);
          const greetingName = firstName ? ` ${firstName}` : "";
          const outOfOfficeText = `\xA1${saludo}${greetingName}! \u{1F64B}\u{1F3FB}\u200D\u2640\uFE0F Qu\xE9 bueno saludarte de nuevo. En este momento nuestros agentes humanos se encuentran descansando \u{1F319}\u2728. Si gustas, puedes dejar tu mensaje aqu\xED para que te respondamos ma\xF1ana a primera hora, o si prefieres, puedes continuar la conversaci\xF3n conmigo y contarme en qu\xE9 puedo ayudarte hoy. \xA1Siempre es un gusto atenderte! \u{1F91D}\u{1F680}`;
          const { textToSpeechMedia: textToSpeechMedia2 } = await Promise.resolve().then(() => (init_whatsapp(), whatsapp_exports));
          let media = null;
          try {
            media = await textToSpeechMedia2(outOfOfficeText);
          } catch (ttsErr) {
            console.warn("[JANIA-MATCH] Error al generar TTS para fuera de horario:", ttsErr.message || ttsErr);
          }
          if (media) {
            await this.queuedSend(senderId, media, { sendAudioAsVoice: true, quoted: msg });
          } else {
            await this.queuedSend(senderId, outOfOfficeText, { quoted: msg });
          }
          await this.logToDb(senderId, "janIA", outOfOfficeText);
          await this.sock.sendPresenceUpdate("paused", senderId);
        } catch (err) {
          console.error("[JANIA-MATCH] Error en handlePrivateDmConversation:", err);
        }
      }
      async handleRedirectText(msg, senderId, rawPhone) {
        try {
          const realName = msg.pushName || `Asesor +${rawPhone}`;
          await this.sock.sendPresenceUpdate("composing", senderId);
          await delay2(2e3);
          const redirectMsg = `Hola ${realName} \u{1F44B}\u{1F3FB}. Si deseas que JanIA Match te responda de inmediato, por favor postea tu pregunta directamente en el chat del grupo oficial de VECY. \u{1F3E0}

Si deseas chatear en privado de forma interactiva, por favor escribe a mi otra yo, **JanIA v3.5** \u{1F4F2}, a su n\xFAmero oficial directo: +57 3185462265 o haz clic aqu\xED: https://wa.me/573185462265.

\u26A0\uFE0F **Nota importante**: Recuerda que somos inteligencias netamente conversacionales. S\xED podemos resolver tus inquietudes, redactar descripciones comerciales, hacer an\xE1lisis y estructurar textos directamente aqu\xED en el chat. Sin embargo, **no tenemos la habilidad de crear im\xE1genes, videos, informes con gr\xE1ficas, ni de elaborar o enviar archivos PDF a trav\xE9s del chat**.

Si requieres un an\xE1lisis de mercado formal con gr\xE1ficas y PDF detallado, o piezas visuales/videos profesionales, este servicio lo realiza nuestro personal humano experto. Comun\xEDcate llamando al **+57 3166569719** para solicitar la cotizaci\xF3n e informe de nuestro equipo. \u{1F4C8}\u{1F4BC}`;
          await this.queuedSend(senderId, redirectMsg, { quoted: msg });
          await this.logToDb(senderId, "janIA", redirectMsg);
          await this.sock.sendPresenceUpdate("paused", senderId);
        } catch (err) {
          console.error("[JANIA-MATCH] Error al enviar mensaje de redirecci\xF3n de DM privado:", err);
        }
      }
      async processMatchConfirmation(senderId, realName, matchId, decision) {
        try {
          const db = await getDb();
          if (!db) {
            await this.queuedSend(senderId, "\u26A0\uFE0F El sistema de base de datos no est\xE1 disponible en este momento. Int\xE9ntalo m\xE1s tarde.");
            return;
          }
          const [match] = await db.select().from(propertyMatches).where(eq5(propertyMatches.id, matchId)).limit(1);
          if (!match) {
            await this.queuedSend(senderId, `\u26A0\uFE0F No encontr\xE9 ninguna coincidencia registrada con el c\xF3digo *#M${matchId}*. Por favor verifica el n\xFAmero.`);
            return;
          }
          const [prop] = await db.select().from(properties).where(eq5(properties.id, match.propertyId)).limit(1);
          const [req] = await db.select().from(requirements).where(eq5(requirements.id, match.requirementId)).limit(1);
          if (!prop || !req) {
            await this.queuedSend(senderId, "\u26A0\uFE0F Hubo un problema al recuperar los detalles de esta coincidencia.");
            return;
          }
          const senderPhone = senderId.split("@")[0];
          const ownerPhone = prop.idUsuarioWhatsapp || "";
          const seekerPhone = req.idUsuarioWhatsapp || "";
          const isOwner = senderPhone === ownerPhone.split("@")[0];
          const isSeeker = senderPhone === seekerPhone.split("@")[0];
          if (!isOwner && !isSeeker) {
            await this.queuedSend(senderId, "\u26A0\uFE0F No est\xE1s autorizado para confirmar esta coincidencia.");
            return;
          }
          if (decision === "no") {
            await db.update(propertyMatches).set({ status: "rejected" }).where(eq5(propertyMatches.id, matchId));
            await this.queuedSend(senderId, `Entendido. He marcado la coincidencia *#M${matchId}* como cancelada. No se compartir\xE1n tus datos de contacto.`);
            await this.logToDb(senderId, "janIA", `[Match-Rejected] Match #M${matchId} rechazado por el usuario.`);
            const otherJid = isOwner ? seekerPhone.includes("@") ? seekerPhone : `${seekerPhone}@s.whatsapp.net` : ownerPhone.includes("@") ? ownerPhone : `${ownerPhone}@s.whatsapp.net`;
            await this.queuedSend(otherJid, `Aviso: La coincidencia *#M${matchId}* ha sido cancelada por la otra parte.`);
            return;
          }
          let updateFields = {};
          if (isOwner) {
            updateFields.ownerConfirmed = true;
          }
          if (isSeeker) {
            updateFields.seekerConfirmed = true;
          }
          await db.update(propertyMatches).set(updateFields).where(eq5(propertyMatches.id, matchId));
          const [updatedMatch] = await db.select().from(propertyMatches).where(eq5(propertyMatches.id, matchId)).limit(1);
          if (updatedMatch.ownerConfirmed && updatedMatch.seekerConfirmed) {
            await db.update(propertyMatches).set({ status: "interested" }).where(eq5(propertyMatches.id, matchId));
            let ownerName = "Oferente";
            let seekerName = "Interesado";
            try {
              const [ownerUser] = await db.select().from(users).where(eq5(users.phone, ownerPhone)).limit(1);
              if (ownerUser && ownerUser.name) ownerName = ownerUser.name;
            } catch {
            }
            try {
              const [seekerUser] = await db.select().from(users).where(eq5(users.phone, seekerPhone)).limit(1);
              if (seekerUser && seekerUser.name) seekerName = seekerUser.name;
            } catch {
            }
            const ownerJid = ownerPhone.includes("@") ? ownerPhone : `${ownerPhone}@s.whatsapp.net`;
            const seekerJid = seekerPhone.includes("@") ? seekerPhone : `${seekerPhone}@s.whatsapp.net`;
            const matchScoreFormatted = Number(updatedMatch.matchScore || 0).toFixed(0);
            const msgToOwner = `\u{1F389}\u{1F388} *\xA1CONEXI\xD3N DE NEGOCIO EXITOSA!* \u{1F388}\u{1F389}
Felicidades, ambas partes han confirmado inter\xE9s en la coincidencia *#M${matchId}* (Coincidencia: ${matchScoreFormatted}%).

Aqu\xED tienes el contacto directo del aliado interesado en tu propiedad:
\u{1F464} *Nombre:* ${seekerName}
\u{1F4DE} *WhatsApp:* https://wa.me/${seekerPhone.split("@")[0]}
\u{1F4AC} *Su requerimiento:* ${req.rawText || "Sin descripci\xF3n"}

\xA1Les deseamos mucho \xE9xito en el cierre comercial! \u{1F91D}\u{1F680}`;
            const msgToSeeker = `\u{1F389}\u{1F388} *\xA1CONEXI\xD3N DE NEGOCIO EXITOSA!* \u{1F388}\u{1F389}
Felicidades, ambas partes han confirmado inter\xE9s en la coincidencia *#M${matchId}* (Coincidencia: ${matchScoreFormatted}%).

Aqu\xED tienes el contacto directo del aliado que ofrece la propiedad:
\u{1F464} *Nombre:* ${ownerName}
\u{1F4DE} *WhatsApp:* https://wa.me/${ownerPhone.split("@")[0]}
\u{1F4AC} *Su oferta:* ${prop.rawText || "Sin descripci\xF3n"}

\xA1Les deseamos mucho \xE9xito en el cierre comercial! \u{1F91D}\u{1F680}`;
            await this.queuedSend(ownerJid, msgToOwner);
            await this.queuedSend(seekerJid, msgToSeeker);
            await this.logToDb(ownerJid, "janIA", `[Match-Connected] Contact shared: Seeker is ${seekerPhone}`);
            await this.logToDb(seekerJid, "janIA", `[Match-Connected] Contact shared: Owner is ${ownerPhone}`);
          } else {
            await this.queuedSend(senderId, `\xA1Gracias! He registrado tu confirmaci\xF3n de inter\xE9s para la coincidencia *#M${matchId}*.

En cuanto la otra parte tambi\xE9n confirme, les compartir\xE9 mutuamente sus datos de contacto para que puedan cerrar el negocio. \u{1F680}`);
            await this.logToDb(senderId, "janIA", `[Match-Confirmed-Waiting] User confirmed match #M${matchId}, waiting for peer.`);
          }
        } catch (err) {
          console.error(`[JANIA-MATCH] Error procesando confirmaci\xF3n para coincidencia #${matchId}:`, err);
          await this.queuedSend(senderId, "\u26A0\uFE0F Ocurri\xF3 un error interno al procesar tu confirmaci\xF3n.");
        }
      }
      async queuedSend(chatId, content, options = {}) {
        outgoingQueue2 = outgoingQueue2.then(async () => {
          try {
            if (!this.sock) {
              throw new Error("Cliente Baileys no inicializado");
            }
            let targetJid = chatId;
            if (targetJid.endsWith("@c.us")) {
              targetJid = targetJid.replace("@c.us", "@s.whatsapp.net");
            }
            let messagePayload = {};
            if (typeof content === "string") {
              messagePayload = { text: content };
              if (options.mentions) {
                messagePayload.mentions = options.mentions;
              }
            } else if (content && (content.text || content.audio || content.image || content.video || content.document)) {
              messagePayload = content;
              if (options.mentions) {
                messagePayload.mentions = options.mentions;
              }
            } else if (content && content.data && content.mimetype) {
              const buffer = Buffer.from(content.data, "base64");
              if (content.mimetype.startsWith("audio/")) {
                messagePayload = {
                  audio: buffer,
                  mimetype: content.mimetype,
                  ptt: options.sendAudioAsVoice || false
                };
              } else if (content.mimetype.startsWith("image/")) {
                messagePayload = {
                  image: buffer,
                  mimetype: content.mimetype
                };
              } else {
                messagePayload = {
                  document: buffer,
                  mimetype: content.mimetype,
                  fileName: content.filename || "archivo"
                };
              }
            }
            const sendOptions = {};
            if (options.quoted) {
              sendOptions.quoted = options.quoted;
            }
            const sent = await this.sock.sendMessage(targetJid, messagePayload, sendOptions);
            if (sent && sent.key && sent.key.id) {
              this.botSentMessageIds.add(sent.key.id);
            }
            await delay2(1e3);
          } catch (err) {
            console.error("[JANIA-MATCH] Error en despacho de mensaje Baileys:", err.message || err);
          }
        });
        return outgoingQueue2;
      }
      async sendToGroup(text2, mediaPath, mentions, groupId) {
        try {
          const target = groupId || this.targetGroupId;
          let targetJid = target;
          if (targetJid.endsWith("@c.us")) {
            targetJid = targetJid.replace("@c.us", "@s.whatsapp.net");
          }
          let messagePayload = {};
          if (mediaPath) {
            const fs6 = await import("fs");
            const buffer = fs6.readFileSync(mediaPath);
            const path8 = await import("path");
            const ext = path8.extname(mediaPath).toLowerCase();
            if (ext === ".mp4") {
              messagePayload = {
                video: buffer,
                caption: text2,
                mimetype: "video/mp4"
              };
            } else if (ext === ".jpg" || ext === ".jpeg" || ext === ".png") {
              messagePayload = {
                image: buffer,
                caption: text2,
                mimetype: ext === ".png" ? "image/png" : "image/jpeg"
              };
            } else {
              messagePayload = {
                document: buffer,
                caption: text2,
                mimetype: "application/octet-stream",
                fileName: path8.basename(mediaPath)
              };
            }
          } else {
            messagePayload = { text: text2 };
          }
          if (mentions && mentions.length > 0) {
            messagePayload.mentions = mentions.map((m) => m.endsWith("@s.whatsapp.net") ? m : m.replace("@c.us", "@s.whatsapp.net"));
          }
          await this.queuedSend(targetJid, messagePayload);
          console.log(`[JANIA-MATCH] \u2713 Mensaje enviado al grupo ${targetJid}.`);
        } catch (e) {
          console.error(`[JANIA-MATCH] Error enviando mensaje al grupo ${groupId || this.targetGroupId}:`, e.message || e);
        }
      }
      async sendVoiceToGroup(text2, groupId) {
        try {
          const target = groupId || this.targetGroupId;
          let targetJid = target;
          if (targetJid.endsWith("@c.us")) {
            targetJid = targetJid.replace("@c.us", "@s.whatsapp.net");
          }
          const { cleanVoiceText: cleanVoiceText2 } = await Promise.resolve().then(() => (init_whatsapp(), whatsapp_exports));
          const cleaned = cleanVoiceText2(text2);
          console.log(`[JANIA-MATCH] Generando nota de voz para enviar al grupo ${targetJid}...`);
          const { textToSpeechMedia: textToSpeechMedia2 } = await Promise.resolve().then(() => (init_whatsapp(), whatsapp_exports));
          const voiceMedia = await textToSpeechMedia2(cleaned);
          if (voiceMedia && voiceMedia.data) {
            const buffer = Buffer.from(voiceMedia.data, "base64");
            await this.queuedSend(targetJid, {
              audio: buffer,
              mimetype: voiceMedia.mimetype || "audio/ogg; codecs=opus",
              ptt: true
            });
            console.log(`[JANIA-MATCH] \u2713 Nota de voz enviada al grupo ${targetJid}.`);
          } else {
            console.warn(`[JANIA-MATCH] TTS fall\xF3 para el grupo ${targetJid}, enviando texto.`);
            await this.queuedSend(targetJid, cleaned);
          }
        } catch (e) {
          console.error("[JANIA-MATCH] Error enviando nota de voz al grupo:", e.message || e);
        }
      }
      async getGroupParticipants(groupId) {
        try {
          if (!this.sock) return [];
          const metadata = await this.sock.groupMetadata(groupId);
          return metadata.participants.map((p) => p.id);
        } catch (err) {
          console.warn(`[JANIA-MATCH] Error al obtener participantes del grupo ${groupId}:`, err);
          return [];
        }
      }
      async sendManualCierreAudios() {
        console.log("[JANIA-MATCH] Generando y enviando audios de cierre manuales (Solo por hoy)...");
        const grupos = [
          {
            nombre: "VECY INMUEBLES NETWORK",
            id: this.targetGroupId,
            promptCierre: "Genera una nota de voz corta en espa\xF1ol de despedida y cierre de jornada para el grupo de WhatsApp VECY INMUEBLES NETWORK. Agradece la actividad de hoy y desp\xEDdete con calidez. Recuerda que no cobramos comisiones y que las ofertas y demandas cruzadas son el motor de la red."
          },
          {
            nombre: "Buz\xF3n de Consultor\xEDa",
            id: this.buzonGroupId,
            promptCierre: "Genera una nota de voz corta en espa\xF1ol de despedida y cierre de jornada para el grupo de WhatsApp Buz\xF3n de Consultor\xEDa. Agradece la atenci\xF3n a los casos jur\xEDdicos y de comisiones compartidas resueltos hoy, deseando un feliz descanso."
          },
          {
            nombre: "C\xEDrculo Cero",
            id: this.circuloGroupId,
            promptCierre: "Genera una nota de voz corta en espa\xF1ol de despedida y cierre de jornada para el grupo de WhatsApp C\xEDrculo Cero. Agradece el debate y las sugerencias de hoy sobre el futuro del sector."
          }
        ];
        const { invokeLLM: invokeLLM2 } = await Promise.resolve().then(() => (init_llm(), llm_exports));
        for (const grupo of grupos) {
          try {
            if (!grupo.id) continue;
            console.log(`[JANIA-MATCH] Generando audio de cierre para el grupo ${grupo.nombre}...`);
            const response1 = await invokeLLM2({
              messages: [
                { role: "system", content: "Eres JanIA, la asistente de voz e inteligencia artificial de la red colaborativa VECY Network. Te expresas de manera natural, humana, c\xE1lida y profesional." },
                { role: "user", content: `${grupo.promptCierre}
- IMPORTANTE: Debe sonar como un mensaje de voz natural de WhatsApp grabado de forma espont\xE1nea por una colega real. Empieza con naturalidad como: "Hola colegas", "Buenas tardes", etc. sin formalismos rob\xF3ticos.
- M\xE1ximo 350 caracteres.
- CR\xCDTICO: Responde \xDANICAMENTE con las palabras habladas de la nota de voz. NO agregues pre\xE1mbulos, comentarios ni envuelvas el texto en comillas, llaves o corchetes.` }
              ]
            });
            const content1 = response1.choices[0]?.message?.content;
            if (content1 && content1.trim() !== "") {
              await this.sendVoiceToGroup(content1, grupo.id);
            }
          } catch (err) {
            console.error(`\u274C Error en sendManualCierreAudios para el grupo ${grupo.nombre}:`, err.message || err);
          }
        }
      }
      pendingWelcomeJids = [];
      async sendAnuncioRetorno() {
        const baseMsg = `\u{1F680} *\xA1JANIA EST\xC1 DE VUELTA Y M\xC1S AFILADA QUE NUNCA!* \u{1F916}\u{1F3DB}\uFE0F

\xA1Hola de nuevo, colegas y aliados! \u{1F44B} Tras un breve ajuste t\xE9cnico para fortalecer nuestra infraestructura y preparar el lanzamiento del nuevo portal web privado, estoy de vuelta en el canal para encontrar esos MATCH tan deseados.

Vuelvo con mi *Cerebro Multimodal v2.0* repotenciado y mis sensores m\xE1s afilados que nunca para cuidar la calidad de la red y acelerar nuestros cierres:

\u{1F9E0} *\xBFQu\xE9 puedo hacer por ti en esta v2.0?*
\u25B8 *Ofertas Express (Links):* Comparte el enlace de tus inmuebles de cualquier portal o CRM, y extraer\xE9 la ficha t\xE9cnica en segundos.
\u25B8 *Esc\xE1ner de Flyers (OCR):* \xBFTienes fotos de inmuebles o requerimientos con texto? S\xFAbelas al grupo y leer\xE9 la informaci\xF3n dentro de la imagen.
\u25B8 *Permutas e Intercambios (Voz o Texto):* Escr\xEDbeme o env\xEDame un audio detallando permutas complejas como:
  * \u{1F504} *Mano a mano / Pelo a pelo* (intercambio directo de inmuebles de valor similar).
  * \u{1F3E0}\u2795\u{1F4B5} *Inmueble de menor valor* como parte de pago por uno de mayor valor.
  * \u{1F697} *Veh\xEDculos* recibidos como parte de pago.
  * \u{1F4C8} *CDTs, divisas o activos alternativos* como complemento de negocio.
  * \u{1F3E2} *Proyectos de construcci\xF3n* o aportes de lote.
\u25B8 *Matching Inteligente:* Cruzo ofertas y demandas en tiempo real y les aviso en el acto cuando hay negocio viable.`;
        const groups = [this.targetGroupId, this.buzonGroupId, this.circuloGroupId];
        const imgPath = path3.resolve("./client/public/jania_perfil.png");
        for (const group of groups) {
          try {
            await this.sendToGroup(baseMsg, imgPath, [], group);
          } catch (e) {
            console.error(`Error enviando anuncio de retorno al grupo ${group}:`, e.message);
          }
        }
      }
      async sendComunicadoMatch() {
        try {
          console.log(`[JANIA-MATCH] Enviando comunicado de notificaciones de match...`);
          const { MSG_COMUNICADO_MATCH_NETWORK: MSG_COMUNICADO_MATCH_NETWORK2, MSG_COMUNICADO_MATCH_CIRCULO: MSG_COMUNICADO_MATCH_CIRCULO2 } = await Promise.resolve().then(() => (init_janIA(), janIA_exports));
          await this.queuedSend(this.targetGroupId, MSG_COMUNICADO_MATCH_NETWORK2);
          await delay2(3e3);
          await this.queuedSend(this.circuloGroupId, MSG_COMUNICADO_MATCH_CIRCULO2);
          console.log("[JANIA-MATCH] Comunicado de match enviado con \xE9xito.");
        } catch (err) {
          console.error("[JANIA-MATCH] Error al enviar el comunicado de match:", err.message || err);
        }
      }
      async getPairingCode(phone) {
        const cleanPhone = phone.replace(/\D/g, "");
        console.log(`[JANIA-MATCH] Solicitando c\xF3digo de vinculaci\xF3n por n\xFAmero para: ${cleanPhone}`);
        console.log("[JANIA-MATCH] Limpiando sesi\xF3n previa para solicitar nuevo c\xF3digo...");
        try {
          if (this.sock) {
            this.sock.end(void 0);
          }
        } catch (e) {
        }
        const sessionDir = path3.join(process.cwd(), ".baileys_auth");
        if (fs3.existsSync(sessionDir)) {
          try {
            fs3.rmSync(sessionDir, { recursive: true, force: true });
          } catch (err) {
            console.warn("[JANIA-MATCH] No se pudo borrar .baileys_auth:", err.message);
          }
        }
        this.sock = null;
        await this.initialize();
        await delay2(3e3);
        try {
          const code = await this.sock.requestPairingCode(cleanPhone);
          console.log(`[JANIA-MATCH] C\xF3digo de vinculaci\xF3n generado: ${code}`);
          return code;
        } catch (err) {
          console.error("[JANIA-MATCH] Error al solicitar c\xF3digo de vinculaci\xF3n:", err.message || err);
          throw err;
        }
      }
      loadCooldowns() {
        try {
          if (fs3.existsSync(this.cooldownFile)) {
            const raw = JSON.parse(fs3.readFileSync(this.cooldownFile, "utf8"));
            this.cooldownMap = new Map(Object.entries(raw));
          }
        } catch (e) {
        }
      }
      saveCooldowns() {
        try {
          const obj = Object.fromEntries(this.cooldownMap.entries());
          fs3.writeFileSync(this.cooldownFile, JSON.stringify(obj), "utf8");
        } catch (e) {
        }
      }
      setupGracefulShutdown() {
        const shutdown = async () => {
          console.log("\n\u{1F6D1} Cerrando JanIA Match Bot (Baileys)...");
          try {
            if (this.sock) {
              await this.sock.end();
            }
          } catch (e) {
          }
        };
        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);
      }
    };
    janiaMatchBot = new JaniaMatchBot();
  }
});

// server/jobs/nightlyRematch.ts
var nightlyRematch_exports = {};
__export(nightlyRematch_exports, {
  recalculateAndCleanupMatches: () => recalculateAndCleanupMatches,
  runNightlyRematch: () => runNightlyRematch
});
import { and as and7, eq as eq12 } from "drizzle-orm";
async function runNightlyRematch() {
  console.log("[NIGHTLY-REMATCH] Iniciando cruce masivo de base de datos...");
  const db = await getDb();
  if (!db) {
    console.error("[NIGHTLY-REMATCH] No se pudo conectar a la base de datos.");
    return;
  }
  try {
    const activeReqs = await db.select().from(requirements).where(eq12(requirements.status, "active"));
    const availProps = await db.select().from(properties).where(eq12(properties.available, true));
    console.log(`[NIGHTLY-REMATCH] Procesando ${activeReqs.length} requerimientos activos contra ${availProps.length} inmuebles disponibles...`);
    let newMatchesCount = 0;
    for (const req of activeReqs) {
      for (const prop of availProps) {
        const score = calcularScoreMatch(req, prop);
        if (score >= 60) {
          const existing = await db.select().from(propertyMatches).where(
            and7(
              eq12(propertyMatches.propertyId, prop.id),
              eq12(propertyMatches.requirementId, req.id)
            )
          ).limit(1);
          if (existing.length === 0) {
            console.log(`[NIGHTLY-REMATCH] \xA1Match nuevo detectado! Req #${req.id} <-> Prop #${prop.id} (Score: ${score.toFixed(0)}%)`);
            const [newMatch] = await db.insert(propertyMatches).values({
              propertyId: prop.id,
              requirementId: req.id,
              matchScore: score.toFixed(2),
              matchReason: `VECY CORE TS Scoring (Nightly): ${score.toFixed(2)}/100`,
              status: "suggested",
              ownerConfirmed: false,
              seekerConfirmed: false
            }).returning();
            newMatchesCount++;
            if (whatsappBot && whatsappBot.isReady) {
              const matchedItem = {
                ...prop,
                score,
                matchId: newMatch.id,
                idUsuarioWhatsapp: prop.idUsuarioWhatsapp
              };
              const matchDetails = await handleDetectedMatches(
                [matchedItem],
                false,
                req,
                req.idUsuarioWhatsapp || "",
                "Aliado VECY"
              );
              if (matchDetails.response && whatsappBot.targetGroupId) {
                await whatsappBot.sendToGroup(matchDetails.response, void 0, matchDetails.mentions);
              }
              if (matchDetails.extraDMs && matchDetails.extraDMs.length > 0) {
                for (const dm of matchDetails.extraDMs) {
                  await whatsappBot.queuedSend(dm.jid, dm.message);
                }
              }
            }
          }
        }
      }
    }
    console.log(`[NIGHTLY-REMATCH] Proceso finalizado. Se registraron ${newMatchesCount} nuevos matches.`);
  } catch (error) {
    console.error("[NIGHTLY-REMATCH] Error durante el cruce masivo nocturno:", error.message || error);
  }
}
async function recalculateAndCleanupMatches() {
  console.log("[MATCH-CLEANUP] Iniciando recalculo y limpieza de matches en BD...");
  const db = await getDb();
  if (!db) {
    console.error("[MATCH-CLEANUP] No se pudo conectar a la base de datos.");
    return;
  }
  try {
    const allMatches = await db.select({
      id: propertyMatches.id,
      propertyId: propertyMatches.propertyId,
      requirementId: propertyMatches.requirementId,
      matchScore: propertyMatches.matchScore
    }).from(propertyMatches);
    console.log(`[MATCH-CLEANUP] Encontrados ${allMatches.length} registros para evaluar.`);
    let deletedCount = 0;
    let updatedCount = 0;
    for (const m of allMatches) {
      const [prop] = await db.select().from(properties).where(eq12(properties.id, m.propertyId)).limit(1);
      const [req] = await db.select().from(requirements).where(eq12(requirements.id, m.requirementId)).limit(1);
      if (!prop || !req) {
        console.log(`[MATCH-CLEANUP] Eliminando Match #${m.id} por propiedad o requerimiento inexistente.`);
        await db.delete(propertyMatches).where(eq12(propertyMatches.id, m.id));
        deletedCount++;
        continue;
      }
      const newScore = calcularScoreMatch(req, prop);
      if (newScore < 60) {
        console.log(`[MATCH-CLEANUP] Eliminando Match #${m.id} por incompatibilidad (Nuevo Score: ${newScore}%, Score anterior: ${m.matchScore}%).`);
        await db.delete(propertyMatches).where(eq12(propertyMatches.id, m.id));
        deletedCount++;
      } else {
        const storedScore = parseFloat(String(m.matchScore));
        if (Math.abs(storedScore - newScore) > 0.1) {
          console.log(`[MATCH-CLEANUP] Actualizando Score de Match #${m.id}: ${storedScore}% -> ${newScore}%`);
          await db.update(propertyMatches).set({ matchScore: newScore.toFixed(2), matchReason: `Recalculado con VECY CORE v12.0` }).where(eq12(propertyMatches.id, m.id));
          updatedCount++;
        }
      }
    }
    console.log(`[MATCH-CLEANUP] Limpieza finalizada. Eliminados: ${deletedCount}, Actualizados: ${updatedCount}`);
  } catch (error) {
    console.error("[MATCH-CLEANUP] Error durante la limpieza:", error.message || error);
  }
}
var init_nightlyRematch = __esm({
  "server/jobs/nightlyRematch.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_matching();
    init_janIA();
    init_whatsapp();
  }
});

// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/oauth.ts
init_db();

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto2) => proto2.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isProd ? true : isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
init_db();
init_env();
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionCookie = cookies.get(COOKIE_NAME);
    const authHeader = req.headers.authorization;
    if (!sessionCookie && authHeader && authHeader.startsWith("Bearer ")) {
      sessionCookie = authHeader.substring(7);
    }
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie or token");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
init_env();
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers/janIA.ts
import { z as z2 } from "zod";
init_db();
init_schema();
init_scraper();
init_janIA();
import { eq as eq6, desc as desc2, sql as sql4 } from "drizzle-orm";
import axios8 from "axios";
var janIARouter = router({
  // New: Extract property data from link
  extractFromLink: publicProcedure.input(z2.object({ url: z2.string().url() })).mutation(async ({ input }) => {
    try {
      const data = await scrapePropertyLink(input.url);
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error("Error in extractFromLink:", error);
      throw new Error("No se pudo extraer la informaci\xF3n del link. Verifica que sea un enlace v\xE1lido de un inmueble.");
    }
  }),
  // Chat endpoint
  chat: publicProcedure.input(
    z2.object({
      sessionId: z2.string(),
      message: z2.string(),
      propertyId: z2.number().optional(),
      leadId: z2.number().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    try {
      let conversation = await db.select().from(conversations).where(eq6(conversations.sessionId, input.sessionId)).limit(1);
      let conversationId;
      if (conversation.length === 0) {
        const insertData = {
          sessionId: input.sessionId,
          status: "active"
        };
        if (ctx.user) {
          insertData.userId = String(ctx.user.id);
        }
        const result2 = await db.insert(conversations).values(insertData).returning();
        conversationId = result2[0]?.id || 1;
      } else {
        conversationId = conversation[0].id;
        if (ctx.user && !conversation[0].userId) {
          await db.update(conversations).set({ userId: String(ctx.user.id) }).where(eq6(conversations.id, conversationId));
        }
      }
      const mockUserId = ctx.user ? `web-user-${ctx.user.id}` : `web-session-${input.sessionId}`;
      const mockUserName = ctx.user ? ctx.user.name ?? void 0 : "Usuario Web";
      const result = await processWhatsAppMessage(
        input.message,
        mockUserId,
        mockUserName,
        false,
        [],
        void 0,
        void 0,
        false
      );
      const janIAResponse = result.response && result.response.trim() !== "" ? (result.dmResponse ? result.dmResponse + "\n\n" : "") + result.response : result.dmResponse || result.response;
      const wantsVoice = result.wantsVoice || false;
      const voiceResponse = result.voiceResponse || janIAResponse;
      await db.insert(messages).values({
        conversationId,
        role: "user",
        content: input.message,
        messageType: "text"
      });
      await db.insert(messages).values({
        conversationId,
        role: "janIA",
        content: janIAResponse,
        messageType: "text"
      });
      await db.update(conversations).set({
        lastMessage: janIAResponse,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq6(conversations.id, conversationId));
      return {
        content: janIAResponse,
        wantsVoice,
        voiceResponse: voiceResponse || janIAResponse,
        conversationId
      };
    } catch (error) {
      console.error("Error in JanIA chat:", error);
      throw error;
    }
  }),
  // Get all conversations for a user
  getUserConversations: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return [];
    const db = await getDb();
    if (!db) return [];
    try {
      return await db.select().from(conversations).where(eq6(conversations.userId, String(ctx.user.id))).orderBy(desc2(conversations.updatedAt));
    } catch (error) {
      console.error("Error getting user conversations:", error);
      return [];
    }
  }),
  // Admin: Get all conversations in the system
  getAllConversations: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    try {
      return await db.select().from(conversations).orderBy(desc2(conversations.updatedAt));
    } catch (error) {
      console.error("Error getting all conversations:", error);
      return [];
    }
  }),
  // Get messages for a conversation session
  getConversationMessages: publicProcedure.input(z2.object({ sessionId: z2.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    try {
      const conv = await db.select().from(conversations).where(eq6(conversations.sessionId, input.sessionId)).limit(1);
      if (conv.length === 0) return [];
      return await db.select().from(messages).where(eq6(messages.conversationId, conv[0].id)).orderBy(messages.createdAt);
    } catch (error) {
      console.error("Error getting conversation messages:", error);
      return [];
    }
  }),
  // Delete a conversation and its messages
  deleteConversation: publicProcedure.input(z2.object({ sessionId: z2.string() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    try {
      const conv = await db.select().from(conversations).where(eq6(conversations.sessionId, input.sessionId)).limit(1);
      if (conv.length > 0) {
        await db.delete(messages).where(eq6(messages.conversationId, conv[0].id));
        await db.delete(conversations).where(eq6(conversations.id, conv[0].id));
      }
      return { success: true };
    } catch (error) {
      console.error("Error deleting conversation:", error);
      throw error;
    }
  }),
  // Analyze file endpoint
  analyzeFile: publicProcedure.input(
    z2.object({
      sessionId: z2.string(),
      fileUrl: z2.string(),
      fileType: z2.string(),
      propertyId: z2.number().optional(),
      leadId: z2.number().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    try {
      let imageBuffer;
      let pdfBuffer;
      let pdfMimeType;
      try {
        console.log(`[JanIA-Router] Descargando archivo desde URL para an\xE1lisis: ${input.fileUrl}`);
        const fileRes = await axios8.get(input.fileUrl, { responseType: "arraybuffer" });
        const base64Data = Buffer.from(fileRes.data).toString("base64");
        const contentTypeHeader = fileRes.headers["content-type"];
        const contentType = typeof contentTypeHeader === "string" ? contentTypeHeader : input.fileType || "";
        if (contentType.includes("pdf") || input.fileUrl.toLowerCase().endsWith(".pdf")) {
          pdfBuffer = base64Data;
          pdfMimeType = contentType || "application/pdf";
          console.log("[JanIA-Router] Archivo detectado como PDF.");
        } else if (contentType.includes("image") || input.fileUrl.toLowerCase().match(/\.(jpe?g|png|gif|webp)$/i)) {
          imageBuffer = base64Data;
          console.log("[JanIA-Router] Archivo detectado como Imagen.");
        }
      } catch (downloadError) {
        console.error("[JanIA-Router] Error descargando archivo de an\xE1lisis:", downloadError.message || downloadError);
      }
      const mockUserId = ctx.user ? `web-user-${ctx.user.id}` : `web-session-${input.sessionId}`;
      const mockUserName = ctx.user ? ctx.user.name ?? void 0 : "Usuario Web";
      const result = await processWhatsAppMessage(
        `[Archivo: ${input.fileType}]`,
        mockUserId,
        mockUserName,
        true,
        // hasMedia
        [],
        // scrapedData
        void 0,
        // audioUrl
        imageBuffer,
        false,
        // isGroup
        pdfBuffer,
        pdfMimeType
      );
      const analysis = result.response && result.response.trim() !== "" ? (result.dmResponse ? result.dmResponse + "\n\n" : "") + result.response : result.dmResponse || result.response;
      const conversation = await db.select().from(conversations).where(eq6(conversations.sessionId, input.sessionId)).limit(1);
      if (conversation.length > 0) {
        const conversationId = conversation[0].id;
        await db.insert(messages).values({
          conversationId,
          role: "user",
          content: `[Archivo: ${input.fileType}]`,
          messageType: imageBuffer ? "image" : "file",
          metadata: { attachments: [input.fileUrl] }
        });
        await db.insert(messages).values({
          conversationId,
          role: "janIA",
          content: analysis,
          messageType: "text"
        });
        await db.update(conversations).set({
          lastMessage: analysis,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq6(conversations.id, conversationId));
      }
      return {
        analysis
      };
    } catch (error) {
      console.error("Error analyzing file:", error);
      throw error;
    }
  }),
  // Get property matches
  getPropertyMatches: publicProcedure.input(
    z2.object({
      requirementId: z2.number(),
      limit: z2.number().default(5)
    })
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    try {
      const matches = await db.select().from(propertyMatches).where(eq6(propertyMatches.requirementId, input.requirementId)).orderBy(desc2(propertyMatches.matchScore)).limit(input.limit);
      return matches;
    } catch (error) {
      console.error("Error getting property matches:", error);
      throw error;
    }
  }),
  // Get all matches in the network
  getAllMatches: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    try {
      const matches = await db.select({
        id: propertyMatches.id,
        matchScore: propertyMatches.matchScore,
        matchReason: propertyMatches.matchReason,
        status: propertyMatches.status,
        ownerConfirmed: propertyMatches.ownerConfirmed,
        seekerConfirmed: propertyMatches.seekerConfirmed,
        createdAt: propertyMatches.createdAt,
        property: {
          id: properties.id,
          name: properties.name,
          description: properties.description,
          price: properties.price,
          city: properties.city,
          zone: properties.zone,
          addressNeighborhood: properties.addressNeighborhood,
          idUsuarioWhatsapp: properties.idUsuarioWhatsapp,
          propertyType: properties.propertyType,
          transactionType: properties.transactionType,
          bedrooms: properties.bedrooms,
          bathrooms: properties.bathrooms,
          garages: properties.garages,
          stratum: properties.stratum,
          areaTotal: properties.areaTotal,
          areaPrivate: properties.areaPrivate,
          adminFee: properties.adminFee,
          isAmoblado: properties.isAmoblado,
          rawText: properties.rawText,
          externalUrl: properties.externalUrl
        },
        requirement: {
          id: requirements.id,
          name: requirements.name,
          presupuestoMin: requirements.presupuestoMin,
          presupuestoMax: requirements.presupuestoMax,
          ciudadDeseada: requirements.ciudadDeseada,
          zonaDeseada: requirements.zonaDeseada,
          addressNeighborhood: requirements.addressNeighborhood,
          idUsuarioWhatsapp: requirements.idUsuarioWhatsapp,
          tipoInmuebleDeseado: requirements.tipoInmuebleDeseado,
          tipoNegocioDeseado: requirements.tipoNegocioDeseado,
          habitacionesMin: requirements.habitacionesMin,
          banosMin: requirements.banosMin,
          parqueaderosMin: requirements.parqueaderosMin,
          areaMin: requirements.areaMin,
          estratoDeseado: requirements.estratoDeseado,
          amobladoDeseado: requirements.amobladoDeseado,
          rawText: requirements.rawText
        }
      }).from(propertyMatches).innerJoin(properties, eq6(propertyMatches.propertyId, properties.id)).innerJoin(requirements, eq6(propertyMatches.requirementId, requirements.id)).orderBy(desc2(propertyMatches.createdAt));
      return matches;
    } catch (error) {
      console.error("Error getting all matches:", error);
      throw error;
    }
  }),
  // Create lead from conversation
  createLead: publicProcedure.input(
    z2.object({
      name: z2.string(),
      email: z2.string().email(),
      phone: z2.string().optional(),
      inquiryType: z2.enum(["buy", "sell", "rent", "invest", "general"]),
      budget: z2.string().optional(),
      preferredZones: z2.array(z2.string()).optional(),
      message: z2.string().optional()
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    try {
      const messageWithDetails = [
        input.message,
        input.budget ? `Presupuesto: ${input.budget}` : null,
        input.preferredZones && input.preferredZones.length > 0 ? `Zonas de inter\xE9s: ${input.preferredZones.join(", ")}` : null
      ].filter(Boolean).join("\n");
      const result = await db.insert(leads).values({
        name: input.name,
        email: input.email,
        phone: input.phone,
        inquiryType: input.inquiryType,
        message: messageWithDetails,
        source: "janIA",
        status: "new"
      });
      return {
        leadId: result.insertId || 0,
        success: true
      };
    } catch (error) {
      console.error("Error creating lead:", error);
      throw error;
    }
  }),
  // Get market analysis for zone
  getMarketAnalysis: publicProcedure.input(z2.object({ zone: z2.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    try {
      const zoneProperties = await db.select().from(properties).where(eq6(properties.zone, input.zone));
      if (zoneProperties.length === 0) {
        return {
          zone: input.zone,
          message: "No hay propiedades disponibles en esta zona."
        };
      }
      const prices = zoneProperties.map((p) => parseFloat(p.price.toString())).filter((p) => !isNaN(p));
      const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
      return {
        zone: input.zone,
        totalProperties: zoneProperties.length,
        averagePrice: avgPrice,
        properties: zoneProperties.slice(0, 5)
      };
    } catch (error) {
      console.error("Error getting market analysis:", error);
      throw error;
    }
  }),
  // Get current WhatsApp bot connection status and ingestion stats
  getBotStatus: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { isReady: false, phone: null, todayProperties: 0, todayRequirements: 0 };
    try {
      const { janiaMatchBot: janiaMatchBot2 } = await Promise.resolve().then(() => (init_whatsapp_match(), whatsapp_match_exports));
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      const [propTodayCount] = await db.select({ count: sql4`count(*)::int` }).from(properties).where(sql4`${properties.createdAt} >= ${today}`);
      const [reqTodayCount] = await db.select({ count: sql4`count(*)::int` }).from(requirements).where(sql4`${requirements.createdAt} >= ${today}`);
      return {
        isReady: janiaMatchBot2?.isReady || false,
        phone: janiaMatchBot2?.sock?.user?.id ? janiaMatchBot2.sock.user.id.split("@")[0].split(":")[0] : null,
        todayProperties: propTodayCount?.count || 0,
        todayRequirements: reqTodayCount?.count || 0
      };
    } catch (err) {
      console.error("Error getting bot status:", err);
      return { isReady: false, phone: null, todayProperties: 0, todayRequirements: 0 };
    }
  }),
  // Get all requirements registered in the database
  getAllRequirements: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    try {
      return await db.select().from(requirements).orderBy(desc2(requirements.createdAt));
    } catch (error) {
      console.error("Error getting all requirements:", error);
      throw error;
    }
  })
});

// server/routers/github.ts
import { z as z3 } from "zod";
init_db();
init_schema();
import { eq as eq7 } from "drizzle-orm";

// server/github-integration.ts
import { Octokit } from "@octokit/rest";
async function initializeGitHubIntegration(token) {
  const octokit = new Octokit({ auth: token });
  try {
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`\u2705 GitHub token validated for user: ${user.login}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Company: ${user.company}`);
    return {
      success: true,
      user: {
        login: user.login,
        name: user.name,
        company: user.company,
        id: user.id
      },
      octokit
    };
  } catch (error) {
    console.error("\u274C GitHub token validation failed:", error);
    throw new Error("Invalid GitHub token");
  }
}
async function createPropertiesCatalogRepo(octokit, owner) {
  try {
    try {
      const existing = await octokit.rest.repos.get({
        owner,
        repo: "vecy-properties-catalog"
      });
      console.log(
        `\u2705 Repository already exists: ${existing.data.html_url}`
      );
      return existing.data;
    } catch (e) {
      if (e.status !== 404) throw e;
    }
    const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
      name: "vecy-properties-catalog",
      description: "Centralized catalog of Vecy Tech Real Estate properties with auto-sync from individual repositories",
      private: false,
      auto_init: true,
      topics: ["real-estate", "properties", "bogota", "vecy"]
    });
    console.log(`\u2705 Repository created: ${repo.html_url}`);
    await createRepositoryStructure(octokit, owner, repo.name);
    return repo;
  } catch (error) {
    console.error("\u274C Failed to create repository:", error);
    throw error;
  }
}
async function createRepositoryStructure(octokit, owner, repo) {
  const files = [
    {
      path: "properties.json",
      content: JSON.stringify(
        {
          version: "1.0.0",
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
          properties: [],
          metadata: {
            totalProperties: 0,
            totalValue: 0,
            categories: {}
          }
        },
        null,
        2
      )
    },
    {
      path: "README.md",
      content: `# Vecy Tech Real Estate - Properties Catalog

Centralized catalog of all Vecy Tech Real Estate properties with automatic synchronization.

## Structure

- \`properties.json\` - Complete property database
- \`categories/\` - Properties organized by type
- \`locations/\` - Properties organized by location

## Auto-Sync

This repository is automatically synchronized with individual property repositories via GitHub Actions and webhooks.

## Last Updated

${(/* @__PURE__ */ new Date()).toISOString()}
`
    },
    {
      path: ".gitignore",
      content: `node_modules/
.env
.env.local
*.log
.DS_Store
`
    }
  ];
  for (const file of files) {
    try {
      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: file.path,
        message: `Initialize ${file.path}`,
        content: Buffer.from(file.content).toString("base64")
      });
      console.log(`\u2705 Created ${file.path}`);
    } catch (error) {
      console.error(`\u274C Failed to create ${file.path}:`, error);
    }
  }
}
var VECY_ORG = "Vecy-Bienes-Raices";
var VECY_PROPERTY_REPOS = [
  "Ap-Nuevo-Cedritos-Bog",
  "ap-venta-cantalejo-bogota",
  "Apartamento-Bucaramanga-Santander",
  "Apartamento-en-venta-en-Cedritos-Bogota",
  "edificio-teusaquillo-bogota",
  "Casa-en-La-Calleja-Bogot-",
  "Casa-Polo-Club-Bogot-",
  "Apto-San-Patricio-Bogota",
  "Hotel-en-Venta-Quinta-Paredes-Bogota",
  "edificio-castellana",
  "apto-mirador-puerto-suba",
  "edificio-santa-barbara"
];
async function listPropertyRepositories(octokit, _owner) {
  try {
    const repos = [];
    for (const repoName of VECY_PROPERTY_REPOS) {
      try {
        const { data: repo } = await octokit.rest.repos.get({
          owner: VECY_ORG,
          repo: repoName
        });
        repos.push(repo);
        console.log(`\u2705 Found: ${repo.full_name}`);
      } catch (e) {
        if (e.status === 404) {
          console.warn(`\u26A0\uFE0F  Not found (may not be updated yet): ${VECY_ORG}/${repoName}`);
        } else {
          console.error(`\u274C Error fetching ${repoName}:`, e.message);
        }
      }
    }
    console.log(`
\u2705 Portafolio Vecy: ${repos.length}/${VECY_PROPERTY_REPOS.length} repositorios disponibles`);
    return repos;
  } catch (error) {
    console.error("\u274C Failed to list repositories:", error);
    throw error;
  }
}
async function extractPropertyData(octokit, _owner, repo) {
  const owner = VECY_ORG;
  const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/main`;
  try {
    let coverImage = `${rawBase}/assets/1.png`;
    const gallery = [];
    try {
      const { data: assetFiles } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: "assets"
      });
      if (Array.isArray(assetFiles)) {
        const imageFiles = assetFiles.filter(
          (f) => /\.(png|jpg|jpeg|webp)$/i.test(f.name) && f.type === "file"
        ).sort((a, b) => {
          const numA = parseInt(a.name.replace(/\D/g, "")) || 999;
          const numB = parseInt(b.name.replace(/\D/g, "")) || 999;
          return numA - numB;
        });
        if (imageFiles.length > 0) {
          const coverFile = imageFiles.find((f) => /^1\.(png|jpg|jpeg|webp)$/i.test(f.name)) || imageFiles[0];
          coverImage = `${rawBase}/${coverFile.path}`;
          gallery.push(...imageFiles.map((f) => `${rawBase}/${f.path}`));
        }
      }
    } catch (e) {
      console.warn(`\u26A0\uFE0F  Could not read assets for ${repo}:`, e.message);
    }
    let propertyData = {
      id: repo,
      name: humanizeName(repo),
      sourceRepository: repo,
      image: coverImage,
      gallery,
      fichaUrl: `https://${repo.toLowerCase()}.netlify.app`
    };
    try {
      const { data: indexFile } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: "index.html"
      });
      if (indexFile.type === "file") {
        const html = Buffer.from(indexFile.content, "base64").toString("utf-8");
        propertyData = {
          ...propertyData,
          ...parsePropertyFromHTML(html, repo, coverImage, gallery)
        };
      }
    } catch (e) {
      if (e.status !== 404) console.warn(`\u26A0\uFE0F  Could not read index.html for ${repo}`);
    }
    console.log(`\u2705 Extracted data for ${repo}: ${JSON.stringify({
      name: propertyData.name,
      price: propertyData.price,
      area: propertyData.area,
      images: gallery.length
    })}`);
    return propertyData;
  } catch (error) {
    console.error(`\u274C Failed to extract data from ${repo}:`, error);
    return null;
  }
}
function parsePropertyFromHTML(html, repoName, coverImage, gallery) {
  const property = {
    id: repoName,
    name: humanizeName(repoName),
    sourceRepository: repoName,
    image: coverImage,
    gallery,
    fichaUrl: `https://${repoName.toLowerCase()}.netlify.app`
  };
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  if (jsonLdMatch) {
    try {
      const schema = JSON.parse(jsonLdMatch[1]);
      if (schema.offers?.price) {
        property.price = parseInt(schema.offers.price.toString().replace(/\D/g, ""));
      }
      if (schema.name) property.name = schema.name;
    } catch {
    }
  }
  if (!property.price) {
    const priceMatch = html.match(/\$\s*([\d.,]+)\s*(?:\.\d{3})*(?:\s*(?:COP|millones?|M))?/i);
    if (priceMatch) {
      const raw = priceMatch[1].replace(/[.,]/g, "");
      property.price = parseInt(raw) || void 0;
    }
  }
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  if (titleMatch && !property.name) {
    property.name = titleMatch[1].replace(/\s*\|.*$/, "").trim();
  }
  if (!property.image || property.image.includes("cloudfront")) {
    const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/i);
    if (ogImage) property.image = ogImage[1];
  }
  const descMatch = html.match(/<meta name="description" content="([^"]+)"/i);
  if (descMatch) property.description = descMatch[1];
  const areaMatch = html.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i);
  if (areaMatch) property.area = parseFloat(areaMatch[1].replace(",", "."));
  const bedsMatch = html.match(/(\d+)\s*(?:habitaci[oó]n|alcoba|cuarto|dormitorio|apt)/i);
  if (bedsMatch) property.bedrooms = parseInt(bedsMatch[1]);
  const bathsMatch = html.match(/(\d+)\s*(?:ba[ñn]o)/i);
  if (bathsMatch) property.bathrooms = parseInt(bathsMatch[1]);
  const parkingMatch = html.match(/(\d+)\s*(?:parqueadero|garaje|estacionamiento)/i);
  if (parkingMatch) property.parking = parseInt(parkingMatch[1]);
  const lower = repoName.toLowerCase();
  if (lower.includes("edificio")) property.propertyType = "building";
  else if (lower.includes("hotel") || lower.includes("hostal")) property.propertyType = "hotel";
  else if (lower.includes("casa")) property.propertyType = "house";
  else if (lower.includes("finca") || lower.includes("hacienda")) property.propertyType = "farm";
  else if (lower.includes("bodega")) property.propertyType = "warehouse";
  else if (lower.includes("lote") || lower.includes("terreno")) property.propertyType = "land";
  else if (lower.includes("oficina")) property.propertyType = "office";
  else property.propertyType = "apartment";
  if (lower.includes("bucaramanga") || lower.includes("santander")) {
    property.city = "Bucaramanga";
    property.location = "Bucaramanga, Santander";
  } else {
    property.city = "Bogot\xE1";
    property.location = "Bogot\xE1, Colombia";
  }
  return property;
}
function humanizeName(repoName) {
  return repoName.replace(/-/g, " ").replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bBogot\b/i, "Bogot\xE1").replace(/\bBogota\b/i, "Bogot\xE1").trim();
}

// server/routers/github.ts
var GITHUB_TOKEN = process.env.GITHUB_TOKEN;
var githubRouter = router({
  /**
   * Validate GitHub token and get user info
   */
  validateToken: publicProcedure.query(async () => {
    if (!GITHUB_TOKEN) {
      throw new Error("GitHub token not configured");
    }
    try {
      const result = await initializeGitHubIntegration(GITHUB_TOKEN);
      return {
        success: true,
        user: result.user
      };
    } catch (error) {
      throw new Error(`GitHub validation failed: ${error}`);
    }
  }),
  /**
   * Create or get centralized properties catalog repository
   */
  setupCatalogRepo: publicProcedure.query(async () => {
    if (!GITHUB_TOKEN) {
      throw new Error("GitHub token not configured");
    }
    try {
      const { octokit, user } = await initializeGitHubIntegration(GITHUB_TOKEN);
      const repo = await createPropertiesCatalogRepo(octokit, user.login);
      return {
        success: true,
        repository: {
          name: repo.name,
          url: repo.html_url,
          owner: repo.owner.login,
          description: repo.description
        }
      };
    } catch (error) {
      throw new Error(`Failed to setup catalog repository: ${error}`);
    }
  }),
  /**
   * List all property repositories
   */
  listPropertyRepos: publicProcedure.query(async () => {
    if (!GITHUB_TOKEN) {
      throw new Error("GitHub token not configured");
    }
    try {
      const { octokit, user } = await initializeGitHubIntegration(GITHUB_TOKEN);
      const repos = await listPropertyRepositories(octokit, user.login);
      return {
        success: true,
        repositories: repos.map((repo) => ({
          name: repo.name,
          url: repo.html_url,
          description: repo.description,
          updatedAt: repo.updated_at,
          topics: repo.topics || []
        }))
      };
    } catch (error) {
      throw new Error(`Failed to list property repositories: ${error}`);
    }
  }),
  /**
   * Synchronize properties from GitHub repositories
   */
  syncPropertiesFromGitHub: publicProcedure.input(
    z3.object({
      repositories: z3.array(z3.string()).optional()
    })
  ).mutation(async ({ input }) => {
    if (!GITHUB_TOKEN) {
      throw new Error("GitHub token not configured");
    }
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    try {
      const { octokit, user } = await initializeGitHubIntegration(GITHUB_TOKEN);
      const adminUser = await db.select().from(users).where(eq7(users.email, "vecybienesraices@gmail.com")).limit(1);
      const adminId = adminUser.length > 0 ? adminUser[0].id : 1;
      let reposToSync = input.repositories || [];
      if (reposToSync.length === 0) {
        const repos = await listPropertyRepositories(octokit, user.login);
        reposToSync = repos.map((r) => r.name);
      }
      const syncedProperties = [];
      const errors = [];
      for (const repoName of reposToSync) {
        try {
          const propertyData = await extractPropertyData(
            octokit,
            user.login,
            repoName
          );
          if (propertyData) {
            const existing = await db.select().from(properties).where(eq7(properties.sourceRepository, repoName)).limit(1);
            if (existing.length > 0) {
              await db.update(properties).set({
                ...propertyData,
                agentId: adminId,
                sourceRepository: repoName,
                lastSyncedAt: /* @__PURE__ */ new Date()
              }).where(eq7(properties.id, existing[0].id));
            } else {
              await db.insert(properties).values({
                ...propertyData,
                agentId: adminId,
                sourceRepository: repoName,
                lastSyncedAt: /* @__PURE__ */ new Date()
              });
            }
            syncedProperties.push({
              repository: repoName,
              name: propertyData.name,
              status: "synced"
            });
          }
        } catch (error) {
          errors.push({
            repository: repoName,
            error: String(error)
          });
        }
      }
      return {
        success: true,
        syncedCount: syncedProperties.length,
        syncedProperties,
        errors: errors.length > 0 ? errors : void 0
      };
    } catch (error) {
      throw new Error(`Synchronization failed: ${error}`);
    }
  }),
  /**
   * Get sync status
   */
  getSyncStatus: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    try {
      const allProperties = await db.select().from(properties);
      const syncedProperties = allProperties.filter(
        (p) => p.sourceRepository
      );
      const lastSync = syncedProperties.length > 0 ? new Date(
        Math.max(
          ...syncedProperties.map(
            (p) => new Date(p.lastSyncedAt).getTime()
          )
        )
      ) : null;
      return {
        success: true,
        totalProperties: allProperties.length,
        syncedFromGitHub: syncedProperties.length,
        lastSyncTime: lastSync,
        status: syncedProperties.length > 0 ? "synced" : "not_synced"
      };
    } catch (error) {
      throw new Error(`Failed to get sync status: ${error}`);
    }
  }),
  /**
   * Get all synced properties from GitHub
   */
  getSyncedProperties: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    try {
      const allProperties = await db.select().from(properties);
      const syncedProperties = allProperties.filter(
        (p) => p.sourceRepository
      );
      return {
        success: true,
        properties: syncedProperties,
        count: syncedProperties.length
      };
    } catch (error) {
      throw new Error(`Failed to get synced properties: ${error}`);
    }
  })
});

// server/routers/images.ts
import { z as z4 } from "zod";
init_storage();
init_db();
init_db();
init_schema();
import { eq as eq8 } from "drizzle-orm";
var imagesRouter = {
  /**
   * Upload image to S3 and save to database
   */
  uploadPropertyImage: publicProcedure.input(
    z4.object({
      propertyId: z4.number(),
      fileBase64: z4.string(),
      // Base64 encoded file
      fileName: z4.string(),
      mimeType: z4.string(),
      caption: z4.string().optional(),
      isMainImage: z4.boolean().optional()
    })
  ).mutation(async ({ input }) => {
    try {
      const buffer = Buffer.from(input.fileBase64, "base64");
      const timestamp2 = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileKey = `properties/${input.propertyId}/images/${timestamp2}-${randomSuffix}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      if (input.isMainImage) {
        const db = await getDb();
        if (db) {
          await db.update(propertyImages).set({ isMainImage: false }).where(eq8(propertyImages.propertyId, input.propertyId));
        }
      }
      const images = await getPropertyImages(input.propertyId);
      const maxOrder = images.length > 0 ? Math.max(...images.map((i) => i.displayOrder || 0)) : 0;
      const result = await addPropertyImage({
        propertyId: input.propertyId,
        imageUrl: url,
        caption: input.caption,
        displayOrder: maxOrder + 1,
        isMainImage: input.isMainImage || false,
        mimeType: input.mimeType,
        fileSize: buffer.length
      });
      return {
        success: true,
        imageUrl: url,
        message: "Image uploaded successfully"
      };
    } catch (error) {
      console.error("Image upload error:", error);
      throw new Error(`Failed to upload image: ${error}`);
    }
  }),
  /**
   * Get all images for a property
   */
  getPropertyImages: publicProcedure.input(z4.object({ propertyId: z4.number() })).query(async ({ input }) => {
    try {
      const images = await getPropertyImages(input.propertyId);
      return {
        success: true,
        images,
        count: images.length
      };
    } catch (error) {
      throw new Error(`Failed to get property images: ${error}`);
    }
  }),
  /**
   * Delete an image
   */
  deletePropertyImage: publicProcedure.input(z4.object({ imageId: z4.number() })).mutation(async ({ input }) => {
    try {
      await deletePropertyImage(input.imageId);
      return {
        success: true,
        message: "Image deleted successfully"
      };
    } catch (error) {
      throw new Error(`Failed to delete image: ${error}`);
    }
  }),
  /**
   * Update image display order
   */
  updateImageOrder: publicProcedure.input(
    z4.object({
      imageId: z4.number(),
      displayOrder: z4.number()
    })
  ).mutation(async ({ input }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(propertyImages).set({ displayOrder: input.displayOrder }).where(eq8(propertyImages.id, input.imageId));
      return {
        success: true,
        message: "Image order updated successfully"
      };
    } catch (error) {
      throw new Error(`Failed to update image order: ${error}`);
    }
  }),
  /**
   * Set main image for property
   */
  setMainImage: publicProcedure.input(
    z4.object({
      propertyId: z4.number(),
      imageId: z4.number()
    })
  ).mutation(async ({ input }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(propertyImages).set({ isMainImage: false }).where(eq8(propertyImages.propertyId, input.propertyId));
      await db.update(propertyImages).set({ isMainImage: true }).where(eq8(propertyImages.id, input.imageId));
      return {
        success: true,
        message: "Main image updated successfully"
      };
    } catch (error) {
      throw new Error(`Failed to set main image: ${error}`);
    }
  })
};

// server/routers/agent.ts
import { z as z5 } from "zod";
init_db();
init_schema();
import { eq as eq9, and as and5, desc as desc3, isNull } from "drizzle-orm";
import { TRPCError as TRPCError3 } from "@trpc/server";
var agentRouter = router({
  // Public: Get agent profile for branding (Agenda Pro, Personal Shops)
  getProfile: publicProcedure.input(z5.object({ id: z5.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const agent = await db.select({
      id: users.id,
      name: users.name,
      customLogoUrl: users.customLogoUrl,
      themeConfig: users.themeConfig,
      subdomain: users.subdomain
    }).from(users).where(eq9(users.id, input.id)).limit(1);
    if (agent.length === 0) throw new TRPCError3({ code: "NOT_FOUND", message: "Agent not found" });
    return agent[0];
  }),
  getMyProperties: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    return await db.select().from(properties).where(eq9(properties.agentId, ctx.user.id)).orderBy(desc3(properties.createdAt));
  }),
  // For testing: Allows an agent to claim a property that has no agent assigned
  claimProperty: protectedProcedure.input(z5.object({ propertyId: z5.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const property = await db.select().from(properties).where(eq9(properties.id, input.propertyId)).limit(1);
    if (property.length === 0) throw new TRPCError3({ code: "NOT_FOUND", message: "Property not found" });
    if (property[0].agentId) throw new TRPCError3({ code: "FORBIDDEN", message: "Property already has an agent" });
    await db.update(properties).set({ agentId: ctx.user.id }).where(eq9(properties.id, input.propertyId));
    return { success: true };
  }),
  getAvailablePropertiesToClaim: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    return await db.select().from(properties).where(isNull(properties.agentId)).orderBy(desc3(properties.createdAt));
  }),
  generateStealthLink: protectedProcedure.input(z5.object({ propertyId: z5.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const property = await db.select().from(properties).where(eq9(properties.id, input.propertyId)).limit(1);
    if (property.length === 0) throw new TRPCError3({ code: "NOT_FOUND", message: "Property not found" });
    if (property[0].agentId !== ctx.user.id && ctx.user.role !== "admin") {
      throw new TRPCError3({ code: "FORBIDDEN", message: "You don't own this property" });
    }
    const existingLink = await db.select().from(referralLinks).where(
      and5(
        eq9(referralLinks.propertyId, input.propertyId),
        eq9(referralLinks.agentId, ctx.user.id)
      )
    ).limit(1);
    if (existingLink.length > 0) {
      return existingLink[0];
    }
    const token = `vcy_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    const newLinks = await db.insert(referralLinks).values({
      propertyId: input.propertyId,
      agentId: ctx.user.id,
      token
    }).returning();
    return newLinks[0];
  }),
  getStealthLinks: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    return await db.select({
      link: referralLinks,
      property: {
        id: properties.id,
        name: properties.name,
        matriculaInmobiliaria: properties.matriculaInmobiliaria,
        location: properties.location
      }
    }).from(referralLinks).innerJoin(properties, eq9(referralLinks.propertyId, properties.id)).where(eq9(referralLinks.agentId, ctx.user.id)).orderBy(desc3(referralLinks.createdAt));
  })
});

// server/routers/leads.ts
import { z as z6 } from "zod";
init_db();
init_schema();
import { eq as eq10, sql as sql5 } from "drizzle-orm";
import { TRPCError as TRPCError4 } from "@trpc/server";
var leadsRouter = router({
  resolveStealthLink: publicProcedure.input(z6.object({ token: z6.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Database err" });
    const linkRecord = await db.select().from(referralLinks).where(eq10(referralLinks.token, input.token)).limit(1);
    if (linkRecord.length === 0) {
      throw new TRPCError4({ code: "NOT_FOUND", message: "Stealth Link invalido o expirado." });
    }
    const link = linkRecord[0];
    await db.update(referralLinks).set({ clicks: sql5`${referralLinks.clicks} + 1` }).where(eq10(referralLinks.id, link.id));
    const prop = await db.select({
      id: properties.id,
      name: properties.name,
      price: properties.price,
      bedrooms: properties.bedrooms,
      bathrooms: properties.bathrooms,
      areaSquareMeters: properties.areaTotal,
      zone: properties.zone,
      // specifically NOT returning full location/latitude/longitude/matricula
      images: properties.images
    }).from(properties).where(eq10(properties.id, link.propertyId)).limit(1);
    if (prop.length === 0) {
      throw new TRPCError4({ code: "NOT_FOUND", message: "Inmueble no disponible." });
    }
    return {
      property: prop[0]
    };
  }),
  submitStealthLead: publicProcedure.input(z6.object({
    token: z6.string(),
    name: z6.string().min(2),
    documentNumber: z6.string().min(5),
    email: z6.string().email(),
    phone: z6.string().min(7)
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Database err" });
    const linkRecord = await db.select().from(referralLinks).where(eq10(referralLinks.token, input.token)).limit(1);
    if (linkRecord.length === 0) {
      throw new TRPCError4({ code: "BAD_REQUEST", message: "Token invalido." });
    }
    const link = linkRecord[0];
    const newLead = await db.insert(leads).values({
      name: input.name,
      documentNumber: input.documentNumber,
      email: input.email,
      phone: input.phone,
      inquiryType: "general",
      // Can be refined later
      propertyId: link.propertyId,
      source: "stealth_link"
    }).returning();
    await db.insert(clientLedger).values({
      leadId: newLead[0].id,
      agentId: link.agentId,
      propertyId: link.propertyId,
      referralToken: link.token
    });
    return { success: true };
  })
});

// server/routers/properties.ts
import { z as z7 } from "zod";
init_db();
init_schema();
import { eq as eq11, desc as desc4, ilike, and as and6 } from "drizzle-orm";
import { TRPCError as TRPCError5 } from "@trpc/server";
var propertyInputSchema = z7.object({
  name: z7.string().min(2),
  description: z7.string().optional(),
  propertyType: z7.enum([
    "apartment",
    "house",
    "building",
    "warehouse",
    "farm",
    "hotel",
    "office",
    "land",
    "commercial",
    "loft",
    "consultorio"
  ]),
  transactionType: z7.enum(["venta", "arriendo", "arriendo_temporal"]).default("venta"),
  price: z7.string().min(1),
  currency: z7.enum(["COP", "USD"]).default("COP"),
  city: z7.string().default("Bogot\xE1"),
  location: z7.string().optional(),
  zone: z7.string().min(2),
  addressCity: z7.string().optional().nullable(),
  addressLocality: z7.string().optional().nullable(),
  addressNeighborhood: z7.string().optional().nullable(),
  coordinates: z7.any().optional().nullable(),
  bedrooms: z7.number().optional().nullable(),
  bathrooms: z7.number().optional().nullable(),
  garages: z7.number().optional().nullable(),
  stratum: z7.number().optional().nullable(),
  floorDetail: z7.string().optional().nullable(),
  areaTotal: z7.string().optional().nullable(),
  areaPrivate: z7.string().optional().nullable(),
  yearBuilt: z7.number().optional().nullable(),
  antiguedadAnos: z7.number().optional().nullable(),
  isAmoblado: z7.boolean().optional().default(false),
  adminFee: z7.string().optional().nullable(),
  commissionPercent: z7.string().optional().nullable(),
  matriculaInmobiliaria: z7.string().optional().nullable(),
  videoUrl: z7.string().optional().nullable(),
  externalUrl: z7.string().optional().nullable(),
  rawText: z7.string().optional().nullable(),
  featured: z7.boolean().optional().default(false),
  available: z7.boolean().optional().default(true),
  idUsuarioWhatsapp: z7.string().optional().nullable(),
  images: z7.array(z7.string()).optional().nullable()
});
var propertiesRouter = router({
  // --- PUBLIC ---
  list: publicProcedure.input(z7.object({
    search: z7.string().optional(),
    zone: z7.string().optional(),
    type: z7.string().optional(),
    transactionType: z7.string().optional(),
    limit: z7.number().default(20),
    offset: z7.number().default(0)
  }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const filters = [eq11(properties.available, true)];
    if (input?.transactionType) filters.push(eq11(properties.transactionType, input.transactionType));
    if (input?.type) filters.push(eq11(properties.propertyType, input.type));
    if (input?.zone) filters.push(ilike(properties.zone, `%${input.zone}%`));
    return await db.select().from(properties).where(and6(...filters)).orderBy(desc4(properties.featured), desc4(properties.createdAt)).limit(input?.limit ?? 20).offset(input?.offset ?? 0);
  }),
  getById: publicProcedure.input(z7.object({ id: z7.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const result = await db.select().from(properties).where(eq11(properties.id, input.id)).limit(1);
    if (result.length === 0) throw new TRPCError5({ code: "NOT_FOUND", message: "Propiedad no encontrada" });
    const property = result[0];
    return property;
  }),
  // --- PROTECTED (Admin / Agent) ---
  create: protectedProcedure.input(propertyInputSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const newProperty = await db.insert(properties).values({
      ...input,
      agentId: ctx.user.id
    }).returning();
    return newProperty[0];
  }),
  parseText: protectedProcedure.input(z7.object({ text: z7.string() })).mutation(async ({ input }) => {
    try {
      const { invokeLLM: invokeLLM2 } = await Promise.resolve().then(() => (init_llm(), llm_exports));
      const prompt = `Act\xFAas como un extractor de datos de inmuebles ultra preciso para Colombia.
Tu tarea es leer una descripci\xF3n de un inmueble (generalmente copiada de WhatsApp) y estructurar sus datos en formato JSON.

Sigue estrictamente este esquema para el JSON de salida:
{
  "name": "T\xEDtulo corto y llamativo del inmueble (m\xE1ximo 60 caracteres)",
  "description": "Resumen claro y bien formateado de la descripci\xF3n",
  "propertyType": "apartment" | "house" | "building" | "warehouse" | "farm" | "hotel" | "office" | "land" | "commercial" | "loft" | "consultorio",
  "transactionType": "venta" | "arriendo" | "arriendo_temporal",
  "price": "N\xFAmero entero como string (sin puntos, comas ni s\xEDmbolos de moneda, ej: '450000000')",
  "city": "Ciudad del inmueble (ej: 'Bogot\xE1')",
  "zone": "Zona o localidad (ej: 'Usaqu\xE9n')",
  "addressNeighborhood": "Barrio (ej: 'Cedritos')",
  "bedrooms": n\xFAmero entero o null,
  "bathrooms": n\xFAmero entero o null,
  "garages": n\xFAmero entero o null,
  "stratum": n\xFAmero entero o null,
  "areaTotal": "N\xFAmero de metros cuadrados como string o null (solo el n\xFAmero, ej: '85')",
  "isAmoblado": boolean
}

Si no encuentras un valor para alguno de los campos num\xE9ricos o de texto espec\xEDficos, d\xE9jalo como null o el valor por defecto. El valor de "propertyType" debe ser uno de los permitidos en el esquema.
Texto a analizar:
"${input.text}"`;
      const res = await invokeLLM2({
        messages: [
          { role: "system", content: "Devuelve \xFAnicamente un objeto JSON v\xE1lido seg\xFAn las instrucciones dadas sin pre\xE1mbulos ni marcas de c\xF3digo markdown." },
          { role: "user", content: prompt }
        ],
        responseFormat: { type: "json_object" }
      });
      const rawContent = res.choices[0].message.content;
      console.log("[JANIA-PARSER] Extracci\xF3n finalizada:", rawContent);
      return JSON.parse(rawContent);
    } catch (err) {
      console.error("[JANIA-PARSER] Error parseando texto de inmueble:", err);
      throw new Error("No se pudo analizar el texto de forma autom\xE1tica.");
    }
  }),
  update: protectedProcedure.input(z7.object({
    id: z7.number(),
    data: propertyInputSchema.partial()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const existing = await db.select().from(properties).where(eq11(properties.id, input.id)).limit(1);
    if (existing.length === 0) throw new TRPCError5({ code: "NOT_FOUND" });
    const isOwner = existing[0].agentId === ctx.user.id;
    const isAdmin = ctx.user.role === "admin";
    if (!isOwner && !isAdmin) throw new TRPCError5({ code: "FORBIDDEN" });
    const updated = await db.update(properties).set({ ...input.data, updatedAt: /* @__PURE__ */ new Date() }).where(eq11(properties.id, input.id)).returning();
    return updated[0];
  }),
  delete: protectedProcedure.input(z7.object({ id: z7.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const existing = await db.select().from(properties).where(eq11(properties.id, input.id)).limit(1);
    if (existing.length === 0) throw new TRPCError5({ code: "NOT_FOUND" });
    const isOwner = existing[0].agentId === ctx.user.id;
    const isAdmin = ctx.user.role === "admin";
    if (!isOwner && !isAdmin) throw new TRPCError5({ code: "FORBIDDEN" });
    await db.delete(properties).where(eq11(properties.id, input.id));
    return { success: true };
  }),
  // List my own properties (agent view)
  myList: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const isAdmin = ctx.user.role === "admin";
    if (isAdmin) {
      return await db.select().from(properties).orderBy(desc4(properties.createdAt));
    }
    return await db.select().from(properties).where(eq11(properties.agentId, ctx.user.id)).orderBy(desc4(properties.createdAt));
  })
});

// server/routers.ts
init_db();
import { z as z8 } from "zod";
var ONE_YEAR_MS2 = 365 * 24 * 60 * 60 * 1e3;
var appRouter = router({
  system: systemRouter,
  agent: agentRouter,
  leads: leadsRouter,
  properties: propertiesRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    }),
    loginWithSupabaseToken: publicProcedure.input(z8.object({ accessToken: z8.string() })).mutation(async ({ input, ctx }) => {
      try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        console.log("[Auth] VITE_SUPABASE_URL configured:", !!supabaseUrl);
        if (!supabaseUrl) {
          throw new Error("VITE_SUPABASE_URL is not configured on server");
        }
        const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: {
            Authorization: `Bearer ${input.accessToken}`,
            apikey: process.env.VITE_SUPABASE_ANON_KEY || ""
          }
        });
        if (!response.ok) {
          const text2 = await response.text();
          console.error("[Auth] Supabase validation failed:", response.status, text2);
          throw new Error("Invalid Supabase token");
        }
        const userData = await response.json();
        const email = userData.email;
        const openId = userData.id;
        const name = userData.user_metadata?.full_name || userData.user_metadata?.name || email.split("@")[0];
        const signedInAt = /* @__PURE__ */ new Date();
        await upsertUser({
          openId,
          name,
          email,
          loginMethod: "supabase",
          lastSignedIn: signedInAt
        });
        const user = await getUserByOpenId(openId);
        if (!user) {
          throw new Error("Failed to retrieve user after upsert");
        }
        const sessionToken = await sdk.createSessionToken(openId, {
          name,
          expiresInMs: ONE_YEAR_MS2
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS2 });
        return {
          success: true,
          user,
          sessionToken
        };
      } catch (error) {
        console.error("[Auth] loginWithSupabaseToken error:", error);
        throw error;
      }
    })
  }),
  janIA: janIARouter,
  github: githubRouter,
  images: imagesRouter
  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

// server/_core/context.ts
var SUPERADMIN_EMAILS = ["vecybienesraices@gmail.com", "jani79alves@gmail.com"];
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
    if (user && SUPERADMIN_EMAILS.includes(user.email || "")) {
      if (user.role !== "admin") {
        try {
          const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
          const { users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
          const { eq: eq14 } = await import("drizzle-orm");
          const db = await getDb2();
          if (db) {
            await db.update(users2).set({ role: "admin" }).where(eq14(users2.id, user.id));
            user = { ...user, role: "admin" };
            console.log(`[Auth] \u2705 Admin auto-promocionado: ${user.email}`);
          }
        } catch (e) {
          console.error("[Auth] Error promoting admin:", e);
        }
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      try {
        const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
        const { users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const { eq: eq14 } = await import("drizzle-orm");
        const db = await getDb2();
        if (db) {
          const existingUser = await db.select().from(users2).where(eq14(users2.openId, "mock-local-user")).limit(1);
          if (existingUser.length > 0) {
            user = existingUser[0];
          } else {
            const newUser = await db.insert(users2).values({
              openId: "mock-local-user",
              name: "Eddu Mendoza (Local Agent)",
              email: "demo@vecynetwork.co",
              loginMethod: "mock",
              role: "agent",
              documentType: "CC",
              documentNumber: "123456789",
              phone: "555-0000",
              vPoints: 100
            }).returning();
            user = newUser[0];
          }
        }
      } catch (dbErr) {
        console.error("Failed to mock user in DB", dbErr);
        user = null;
      }
    } else {
      user = null;
    }
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs4 from "fs";
import { nanoid } from "nanoid";
import path5 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path4 from "node:path";
import { defineConfig } from "vite";
var vite_config_default = defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path4.resolve(import.meta.dirname, "client", "src"),
      "@shared": path4.resolve(import.meta.dirname, "shared"),
      "@assets": path4.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path4.resolve(import.meta.dirname),
  root: path4.resolve(import.meta.dirname, "client"),
  publicDir: path4.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path4.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: ["localhost", "127.0.0.1"],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path5.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs4.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = path5.resolve(import.meta.dirname, "..", "dist");
  if (!fs4.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path5.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
init_whatsapp();

// server/_core/cronService.ts
init_db();
init_schema();
init_whatsapp_match();
init_nightlyRematch();
import cron from "node-cron";
import path6 from "path";
import { fileURLToPath } from "url";
import { gte as gte2, and as and8, eq as eq13, sql as sql7 } from "drizzle-orm";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path6.dirname(__filename);
function initCronScheduler() {
  console.log("[CRON-SERVICE] Inicializando orquestador de agendas automatizadas v3.0...");
  cron.schedule("0 11 * * 1,4", async () => {
    console.log("[CRON-SERVICE] Enviando audio semanal a VECY INMUEBLES NETWORK...");
    const guion = `Buenos d\xEDas a todos y a todas. Soy JanIA, la inteligencia artificial de VECY Network. Hoy quiero recordarles que este grupo es nuestro centro de operaciones comerciales. Aqu\xED publican sus inmuebles en venta o arriendo, sus requerimientos de compra o renta, y yo me encargo de cruzar toda esa informaci\xF3n en tiempo real en los 32 departamentos de Colombia para detectar MATCHES y hacer posibles cierres de negocios. \xBFYa publicaste hoy? Cada inmueble que compartes aqu\xED es una oportunidad de negocio que no puedes dejar pasar. Puedes enviar texto, nota de voz, imagen o flyer y yo lo proceso autom\xE1ticamente. Sigan publicando sus inmuebles, colegas, e inviten a m\xE1s colegas a unirse a esta red. Entre m\xE1s seamos, m\xE1s matches encontramos. \xA1Hoy puede ser el d\xEDa de tu pr\xF3ximo cierre!`;
    try {
      await janiaMatchBot.sendVoiceToGroup(guion, janiaMatchBot.targetGroupId);
    } catch (e) {
      console.error("[CRON-SERVICE] Error enviando audio a VECY INMUEBLES NETWORK:", e.message);
    }
  }, { timezone: "America/Bogota" });
  cron.schedule("30 11 * * 2,5", async () => {
    console.log("[CRON-SERVICE] Enviando audio semanal a VECY: SOPORTE LEGAL...");
    const guion = `Hola a todos por aqu\xED. Soy JanIA, y este espacio es nuestro rinc\xF3n de consultor\xEDa jur\xEDdica y t\xE9cnica de VECY Network. Aqu\xED no hay preguntas tontas: si tienes dudas sobre un contrato de arrendamiento, una promesa de compraventa, una sucesi\xF3n, el c\xE1lculo de ganancia ocasional, c\xF3mo cobrar una comisi\xF3n que te deben, o simplemente quieres estimar el valor por metro cuadrado de un inmueble, este es tu lugar. El conocimiento jur\xEDdico es poder en los negocios. No dejes que la duda te frene. Escr\xEDbeme aqu\xED o env\xEDame una nota de voz y te respondo con criterio legal, rigor t\xE9cnico y total honestidad. Sigan haciendo sus consultas, colegas. Y si conocen a alguien del sector que necesita este apoyo, inv\xEDtenlos al grupo. Juntos elevamos el nivel profesional del gremio.`;
    try {
      await janiaMatchBot.sendVoiceToGroup(guion, janiaMatchBot.buzonGroupId);
    } catch (e) {
      console.error("[CRON-SERVICE] Error enviando audio a SOPORTE LEGAL:", e.message);
    }
  }, { timezone: "America/Bogota" });
  cron.schedule("0 12 * * 3,6", async () => {
    console.log("[CRON-SERVICE] Enviando audio semanal a C\xCDRCULO CERO...");
    const guion = `Hola, equipo VECY. Soy JanIA. Este grupo es nuestro espacio m\xE1s especial: el C\xEDrculo Cero es donde nacen las ideas, donde se eval\xFAa el proyecto, donde los fundadores escuchan directamente a quienes hacen posible esta red. Aqu\xED pueden preguntarme sobre VECY Network sin filtros: c\xF3mo funciona la inteligencia artificial, qu\xE9 est\xE1 planeado para el futuro, qu\xE9 ya est\xE1 funcionando hoy, o simplemente contarme qu\xE9 les parece el proyecto. Tambi\xE9n es el \xFAnico lugar donde debatimos con la competencia de frente y con argumentos. Su opini\xF3n es la br\xFAjula que nos gu\xEDa. Sigan preguntando acerca de VECY Network. Cada idea que aportan aqu\xED nos hace m\xE1s fuertes. E inviten a m\xE1s colegas visionarios. Queremos construir esto juntos.`;
    try {
      await janiaMatchBot.sendVoiceToGroup(guion, janiaMatchBot.circuloGroupId);
    } catch (e) {
      console.error("[CRON-SERVICE] Error enviando audio a C\xCDRCULO CERO:", e.message);
    }
  }, { timezone: "America/Bogota" });
  cron.schedule("0 18 * * 1,4,6", async () => {
    console.log("[CRON-SERVICE] Enviando video JanIAConsulta a VECY INMUEBLES NETWORK...");
    await sendVideoPromo(janiaMatchBot.targetGroupId, "VECY INMUEBLES NETWORK");
  }, { timezone: "America/Bogota" });
  cron.schedule("30 18 * * 2,5,0", async () => {
    console.log("[CRON-SERVICE] Enviando video JanIAConsulta a SOPORTE LEGAL...");
    await sendVideoPromo(janiaMatchBot.buzonGroupId, "VECY: SOPORTE LEGAL, TRIBUTARIO Y AVAL\xDAOS");
  }, { timezone: "America/Bogota" });
  cron.schedule("0 19 * * 1,3,5,0", async () => {
    console.log("[CRON-SERVICE] Enviando video JanIAConsulta a C\xCDRCULO CERO...");
    await sendVideoPromo(janiaMatchBot.circuloGroupId, "C\xEDrculo CERO \u{1F44C}");
  }, { timezone: "America/Bogota" });
  cron.schedule("0 19 * * 5", async () => {
    console.log("[CRON-SERVICE] Generando y enviando Informe Semanal de Actividad...");
    await sendWeeklyReport();
  }, { timezone: "America/Bogota" });
  cron.schedule("0 8 * * *", async () => {
    console.log("[CRON-SERVICE] Ejecutando cruce masivo (Re-matching)...");
    try {
      await runNightlyRematch();
    } catch (err) {
      console.error("[CRON-SERVICE] Error en el job de re-matching masivo:", err.message || err);
    }
  }, { timezone: "America/Bogota" });
}
async function sendVideoPromo(groupId, groupName) {
  try {
    if (!groupId) return;
    const videoPath = path6.resolve(__dirname, "../../dist/JanIAConsulta.mp4");
    let mentions = [];
    try {
      mentions = await janiaMatchBot.getGroupParticipants(groupId);
    } catch (mentionErr) {
      console.warn(`[CRON-SERVICE] No se pudieron obtener participantes de ${groupName}:`, mentionErr);
    }
    const texto = `@todos \u{1F4AC} \xBFPrefieres una atenci\xF3n m\xE1s directa y personalizada?

Chatea directamente con *JanIA*, tu asistente de inteligencia artificial de VECY Network.

\u{1F4F2} *Escr\xEDbele ahora:* https://wa.me/573185462265

Puedes compartirle tus inmuebles, requerimientos o consultas por texto, audio o imagen. Ella los lee, extrae los datos, los sube a nuestra base de datos y busca posibles coincidencias para ayudarte a cerrar negocios m\xE1s r\xE1pido. \xA1Haz clic en el enlace y empieza hoy! \u{1F3E0}\u{1F680}`;
    await janiaMatchBot.sendToGroup(texto, videoPath, mentions, groupId);
    console.log(`[CRON-SERVICE] \u2713 Video promo enviado a ${groupName}.`);
  } catch (e) {
    console.error(`[CRON-SERVICE] Error enviando video promo a ${groupName}:`, e.message || e);
  }
}
async function sendWeeklyReport() {
  try {
    const db = await getDb();
    if (!db) return;
    const propertiesCountRes = await db.select({ count: sql7`count(*)` }).from(properties).execute();
    const requirementsCountRes = await db.select({ count: sql7`count(*)` }).from(requirements).execute();
    const matchesCountRes = await db.select({ count: sql7`count(*)` }).from(propertyMatches).where(gte2(sql7`(${propertyMatches.matchScore})::numeric`, 60)).execute();
    const totalProperties = propertiesCountRes[0]?.count || 0;
    const totalRequirements = requirementsCountRes[0]?.count || 0;
    const totalMatches = matchesCountRes[0]?.count || 0;
    const sevenDaysAgo = /* @__PURE__ */ new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const matchesThisWeek = await db.select({
      matchScore: propertyMatches.matchScore,
      buyerAdvisor: requirements.idUsuarioWhatsapp,
      sellerAdvisor: properties.idUsuarioWhatsapp
    }).from(propertyMatches).innerJoin(requirements, eq13(propertyMatches.requirementId, requirements.id)).innerJoin(properties, eq13(propertyMatches.propertyId, properties.id)).where(and8(
      gte2(sql7`(${propertyMatches.matchScore})::numeric`, 60),
      gte2(propertyMatches.createdAt, sevenDaysAgo)
    )).execute();
    let report = `\u{1F4CA} *INFORME SEMANAL DE ACTIVIDAD - VECY NETWORK* \u{1F4CA}

Estimados aliados de la red, les comparto el balance oficial del estado de nuestra base de datos al d\xEDa de hoy. \xA1Cifras 100% reales y verificadas!:

\u{1F3E0} *Total Ofertas Inmobiliarias Activas*: *${totalProperties}*
\u{1F50E} *Total Requerimientos de Compra/Renta*: *${totalRequirements}*
\u{1F3AF} *Coincidencias (Matches) de Negocio Hist\xF3ricas*: *${totalMatches}*

\u{1F4C8} *COINCIDENCIAS REGISTRADAS ESTA SEMANA:* (${matchesThisWeek.length} detectadas)
`;
    const jidsToMention = [];
    if (matchesThisWeek.length > 0) {
      matchesThisWeek.forEach((m) => {
        const buyer = m.buyerAdvisor?.split("@")[0] || "Asesor";
        const seller = m.sellerAdvisor?.split("@")[0] || "Asesor";
        const score = Math.round(Number(m.matchScore));
        report += `\u25B8 @${buyer} (Comprador) \u21C4 @${seller} (Vendedor) \u2014 Coincidencia del *${score}%* \u{1F3AF}
`;
        if (m.buyerAdvisor) jidsToMention.push(m.buyerAdvisor);
        if (m.sellerAdvisor) jidsToMention.push(m.sellerAdvisor);
      });
      report += `
\xA1Felicidades a los colegas involucrados! Si ves tu n\xFAmero arriba, por favor revisa tu chat privado de WhatsApp donde JanIA te envi\xF3 los detalles de contacto bilateral (Double Opt-In) para coordinar la cita de negocios. \u{1F91D}\u{1F680}`;
    } else {
      report += `\u25B8 No se detectaron cruces autom\xE1ticos en los \xFAltimos 7 d\xEDas. \xA1Los invito a seguir publicando activamente sus inmuebles y requerimientos para que el sistema pueda unirlos! \u{1F4AA}`;
    }
    report += `

\u26A0\uFE0F *COMPROMISO DE HONOR:* Recuerden que nuestra plataforma es *100% gratuita y libre de comisiones*. Si logran cerrar un negocio real gracias a la conexi\xF3n privada de JanIA, es un compromiso de honor compartir su testimonio en este grupo y dejar su rese\xF1a oficial aqu\xED: https://g.page/r/CctNbwU6UpX5EBM/review`;
    console.log("[CRON-SERVICE] Enviando reporte semanal de actividad...");
    await janiaMatchBot.sendToGroup(report, void 0, Array.from(new Set(jidsToMention)));
  } catch (error) {
    console.error("[CRON-SERVICE] Error al generar el informe semanal:", error);
  }
}

// server/_core/index.ts
init_janIA();
init_whatsapp_cloud();
init_voiceTranscription();
init_llm();
init_whatsapp_match();
import multer from "multer";
import fs5 from "fs";
import path7 from "path";
process.on("uncaughtException", (error) => {
  console.error("[SYSTEM-CRITICAL] Uncaught Exception detectada:", error);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("[SYSTEM-CRITICAL] Unhandled Rejection detectada en:", promise, "raz\xF3n:", reason);
});
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  const webhookGetHandler = (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
      console.log("[WEBHOOK] Webhook verified successfully.");
      return res.status(200).send(challenge);
    } else {
      console.warn("[WEBHOOK] Webhook verification failed.");
      return res.sendStatus(403);
    }
  };
  const webhookPostHandler = async (req, res) => {
    try {
      res.status(200).send("EVENT_RECEIVED");
      handleIncomingWebhook(req.body).catch((err) => {
        console.error("[WEBHOOK-ERROR] Error handling incoming webhook:", err);
      });
    } catch (err) {
      console.error("[WEBHOOK-ERROR] Exception in webhook endpoint:", err);
    }
  };
  app.get("/webhook", webhookGetHandler);
  app.post("/webhook", webhookPostHandler);
  app.get("/api/whatsapp/webhook", webhookGetHandler);
  app.post("/api/whatsapp/webhook", webhookPostHandler);
  app.get("/api/list-chats", async (req, res) => {
    try {
      if (!whatsappBot.isReady) {
        return res.status(503).send("El bot de WhatsApp no est\xE1 listo todav\xEDa. Intenta en unos segundos.");
      }
      const client = whatsappBot.client;
      if (!client) {
        return res.status(400).send("Client not available");
      }
      const chats = await client.getChats();
      const groups = chats.filter((c) => c.isGroup).map((c) => ({ id: c.id._serialized, name: c.name, unreadCount: c.unreadCount }));
      res.json(groups);
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  app.get("/api/inspect-groups", async (req, res) => {
    try {
      if (!whatsappBot.isReady) {
        return res.status(503).send("El bot de WhatsApp no est\xE1 listo todav\xEDa.");
      }
      const client = whatsappBot.client;
      if (!client) {
        return res.status(400).send("Client not available");
      }
      const chats = await client.getChats();
      const list = [];
      for (const chat of chats) {
        if (chat.isGroup) {
          const groupChat = chat;
          list.push({
            id: groupChat.id._serialized,
            name: groupChat.name,
            isReadOnly: groupChat.isReadOnly,
            participantsCount: groupChat.participants ? groupChat.participants.length : 0
          });
        }
      }
      res.json(list);
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  app.get("/api/screenshot-chat", async (req, res) => {
    try {
      if (!whatsappBot.isReady) {
        return res.status(503).send("El bot de WhatsApp no est\xE1 listo todav\xEDa. Intenta en unos segundos.");
      }
      const client = whatsappBot.client;
      const targetGroupId = whatsappBot.targetGroupId;
      if (!client || !client.pupPage) {
        return res.status(503).send("El navegador de WhatsApp a\xFAn no est\xE1 listo. Intenta en unos segundos.");
      }
      const page = client.pupPage;
      let chatTitle = "VECY INMUEBLES NETWORK";
      try {
        const chat = await client.getChatById(targetGroupId);
        if (chat && chat.name) chatTitle = chat.name;
      } catch (e) {
      }
      await page.evaluate((id, title) => {
        const row = document.querySelector(`div[data-id*="${id}"]`) || Array.from(document.querySelectorAll("div")).find((el) => el.getAttribute("data-id")?.includes(id));
        if (row) {
          row.click();
        } else {
          const span = Array.from(document.querySelectorAll("span")).find((el) => el.textContent === title);
          if (span) {
            const parent = span.closest('div[role="row"]') || span.closest('div[data-testid="cell-frame-container"]') || span.closest("div");
            if (parent) parent.click();
          }
        }
      }, targetGroupId, chatTitle);
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const screenshot = await page.screenshot({ type: "png" });
      res.setHeader("Content-Type", "image/png");
      res.send(screenshot);
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  app.get("/qr-match.png", (req, res) => {
    try {
      const qrPath = path7.join(process.cwd(), "qr-match.png");
      const distQrPath = path7.join(process.cwd(), "dist", "qr-match.png");
      const activePath = fs5.existsSync(qrPath) ? qrPath : distQrPath;
      if (fs5.existsSync(activePath)) {
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        return res.sendFile(activePath);
      }
      res.status(404).send("QR no disponible todav\xEDa.");
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  app.get("/api/match-qr-screenshot", async (req, res) => {
    try {
      const { janiaMatchBot: janiaMatchBot2 } = await Promise.resolve().then(() => (init_whatsapp_match(), whatsapp_match_exports));
      if (janiaMatchBot2 && !janiaMatchBot2.sock) {
        console.log("[ADMIN] Inicializando bot bajo demanda para generar QR...");
        await janiaMatchBot2.initialize();
        await new Promise((resolve) => setTimeout(resolve, 3e3));
      }
      const qrPath = path7.join(process.cwd(), "qr-match.png");
      const distQrPath = path7.join(process.cwd(), "dist", "qr-match.png");
      const activePath = fs5.existsSync(qrPath) ? qrPath : distQrPath;
      if (fs5.existsSync(activePath)) {
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        return res.sendFile(activePath);
      }
      res.status(404).send("QR no disponible todav\xEDa. Por favor vincula o refresca.");
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  app.get("/api/match-qr-refresh", async (req, res) => {
    try {
      const { janiaMatchBot: janiaMatchBot2 } = await Promise.resolve().then(() => (init_whatsapp_match(), whatsapp_match_exports));
      if (!janiaMatchBot2) {
        return res.status(503).send("El bot de Match no est\xE1 inicializado.");
      }
      console.log("[ADMIN] Re-inicializando sesi\xF3n de Baileys para refrescar QR...");
      await janiaMatchBot2.initialize();
      await new Promise((resolve) => setTimeout(resolve, 4e3));
      const qrPath = path7.join(process.cwd(), "qr-match.png");
      const distQrPath = path7.join(process.cwd(), "dist", "qr-match.png");
      const activePath = fs5.existsSync(qrPath) ? qrPath : distQrPath;
      if (fs5.existsSync(activePath)) {
        res.setHeader("Content-Type", "image/png");
        return res.sendFile(activePath);
      }
      res.status(404).send("QR no disponible todav\xEDa.");
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  app.get("/api/match-pairing-code", async (req, res) => {
    try {
      const { phone } = req.query;
      if (!phone || typeof phone !== "string") {
        return res.status(400).send("Debe proporcionar un par\xE1metro de tel\xE9fono v\xE1lido. Ejemplo: ?phone=573166569719");
      }
      const { janiaMatchBot: janiaMatchBot2 } = await Promise.resolve().then(() => (init_whatsapp_match(), whatsapp_match_exports));
      if (!janiaMatchBot2) {
        return res.status(503).send("El bot de Match no est\xE1 inicializado.");
      }
      const code = await janiaMatchBot2.getPairingCode(phone);
      res.json({ ok: true, phone, code });
    } catch (err) {
      res.status(500).send(err.message || err);
    }
  });
  app.post("/api/send-whatsapp-notification", async (req, res) => {
    try {
      const { text: text2, token, phone } = req.body;
      const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN || "vecy_network_secret_token";
      if (token !== verifyToken) {
        return res.status(401).json({ error: "Unauthorized. Invalid token." });
      }
      if (!text2 || typeof text2 !== "string") {
        return res.status(400).json({ error: "Falta el par\xE1metro 'text' o no es v\xE1lido." });
      }
      const defaultAdminPhone = "573166569719";
      const rawPhone = phone || defaultAdminPhone;
      const cleanPhone = typeof rawPhone === "string" ? rawPhone.replace(/\D/g, "") : String(rawPhone).replace(/\D/g, "");
      const matchBot = global.janiaMatchBotInstance;
      if (matchBot && matchBot.isReady) {
        const targetPhone = cleanPhone.endsWith("@s.whatsapp.net") ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;
        console.log(`[NOTIFICACI\xD3N-API] Retransmitiendo mensaje a ${targetPhone} v\xEDa JanIA Match Bot (Baileys)...`);
        await matchBot.queuedSend(targetPhone, text2);
      } else {
        const targetPhone = cleanPhone.endsWith("@c.us") ? cleanPhone : `${cleanPhone}@c.us`;
        console.log(`[NOTIFICACI\xD3N-API] Retransmitiendo mensaje a ${targetPhone} por WhatsApp Cloud API...`);
        const { sendCloudMessage: sendCloudMessage2 } = await Promise.resolve().then(() => (init_whatsapp_cloud(), whatsapp_cloud_exports));
        await sendCloudMessage2(targetPhone, text2);
      }
      res.json({ ok: true, message: "Notification sent successfully." });
    } catch (err) {
      console.error("[NOTIFICACI\xD3N-API] Error enviando mensaje:", err);
      res.status(500).json({ error: err.message || err });
    }
  });
  app.get("/api/match-click-cancel", async (req, res) => {
    try {
      res.send("Baileys no requiere bypass de bot\xF3n Cancel.");
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  app.get("/api/match-click-continue", async (req, res) => {
    try {
      res.send("Baileys no requiere bypass de bot\xF3n Continue.");
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  app.get("/api/send-comeback", (req, res) => {
    try {
      if (!janiaMatchBot.isReady) {
        return res.status(503).send("El bot de WhatsApp no est\xE1 listo todav\xEDa. Intenta en unos segundos.");
      }
      janiaMatchBot.sendAnuncioRetorno().catch((err) => {
        console.error("Error al enviar anuncio de retorno:", err);
      });
      res.send("Anuncio de retorno encolado exitosamente.");
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  app.get("/api/send-closing-voice", (req, res) => {
    try {
      if (!janiaMatchBot.isReady) {
        return res.status(503).send("El bot de WhatsApp no est\xE1 listo todav\xEDa. Intenta en unos segundos.");
      }
      janiaMatchBot.sendManualCierreAudios().catch((err) => {
        console.error("Error al enviar los audios de cierre manuales:", err);
      });
      res.send("Audios de cierre encolados exitosamente.");
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  app.get("/api/jania/tts", async (req, res) => {
    try {
      const text2 = req.query.text;
      if (!text2) {
        return res.status(400).send("Falta el par\xE1metro 'text'");
      }
      const format = req.query.format === "ogg" ? "OGG_OPUS" : "MP3";
      const media = await textToSpeechMedia(text2, format);
      if (!media) {
        return res.status(500).send("No se pudo generar el audio");
      }
      const buffer = Buffer.from(media.data, "base64");
      res.setHeader("Content-Type", media.mimetype);
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  const upload = multer({
    limits: {
      fileSize: 16 * 1024 * 1024
      // 16MB limit
    }
  });
  app.post("/api/janIA/transcribe", upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No se subi\xF3 ning\xFAn archivo de audio" });
      }
      const buffer = req.file.buffer;
      const mimeType = req.file.mimetype || "audio/webm";
      console.log(`[TRANSCRIBE-ROUTE] Recibido archivo de audio de tipo: ${mimeType}, tama\xF1o: ${buffer.length} bytes`);
      const text2 = await transcribeAudioBuffer(buffer, mimeType);
      res.json({ transcription: text2 });
    } catch (err) {
      console.error("[TRANSCRIBE-ROUTE] Error al transcribir:", err);
      res.status(500).json({ error: err.message || "Error al procesar la transcripci\xF3n" });
    }
  });
  const uploadsDir = path7.resolve(process.cwd(), "public/uploads");
  if (!fs5.existsSync(uploadsDir)) {
    fs5.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", express2.static(uploadsDir));
  const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path7.extname(file.originalname));
    }
  });
  const uploadDisk = multer({
    storage: diskStorage,
    limits: {
      fileSize: 50 * 1024 * 1024
      // 50MB limit
    }
  });
  app.post("/api/janIA/upload", uploadDisk.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No se subi\xF3 ning\xFAn archivo" });
      }
      const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
      console.log(`[UPLOAD-ROUTE] Archivo guardado localmente en: ${req.file.path} \u2794 URL: ${fileUrl}`);
      res.json({ fileUrl });
    } catch (err) {
      console.error("[UPLOAD-ROUTE] Error al guardar archivo:", err);
      res.status(500).json({ error: err.message || "Error al subir el archivo" });
    }
  });
  app.get("/api/find-active-group", async (req, res) => {
    try {
      if (!janiaMatchBot.isReady) {
        return res.status(503).send("El bot de WhatsApp no est\xE1 listo todav\xEDa. Intenta en unos segundos.");
      }
      const client = janiaMatchBot.client;
      if (!client) {
        return res.status(400).send("No client available");
      }
      const g1 = "120363259687769411@g.us";
      const g2 = "120363260445880355@g.us";
      const g3 = "120363260108880069@g.us";
      const results = [];
      for (const g of [g1, g2, g3]) {
        try {
          const chat = await client.getChatById(g);
          const msgs = await chat.fetchMessages({ limit: 5 });
          results.push({
            id: g,
            name: chat.name,
            messages: msgs.map((m) => ({
              fromMe: m.fromMe,
              author: m.author,
              body: m.body,
              timestamp: m.timestamp
            }))
          });
        } catch (err) {
          results.push({ id: g, error: err.message });
        }
      }
      res.json(results);
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  app.get("/api/check-ack", async (req, res) => {
    try {
      if (!janiaMatchBot.isReady) {
        return res.status(503).send("El bot de WhatsApp no est\xE1 listo todav\xEDa. Intenta en unos segundos.");
      }
      const client = janiaMatchBot.client;
      if (!client) {
        return res.status(400).send("No client available");
      }
      const targetGroupId = janiaMatchBot.targetGroupId;
      const chat = await client.getChatById(targetGroupId);
      const msgs = await chat.fetchMessages({ limit: 5 });
      const simplified = msgs.map((m) => ({
        fromMe: m.fromMe,
        body: m.body.substring(0, 50),
        ack: m.ack,
        timestamp: m.timestamp
      }));
      res.json(simplified);
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  app.get("/api/inspect-recent-messages", async (req, res) => {
    try {
      if (!janiaMatchBot.isReady) {
        return res.status(503).send("El bot no est\xE1 listo.");
      }
      const client = janiaMatchBot.client;
      const targetGroupId = janiaMatchBot.targetGroupId;
      const buzonGroupId = janiaMatchBot.buzonGroupId;
      const circuloGroupId = janiaMatchBot.circuloGroupId;
      const groups = [
        { name: "VECY INMUEBLES NETWORK", id: targetGroupId },
        { name: "VECY: SOPORTE LEGAL, CONTRATOS Y AVAL\xDAOS", id: buzonGroupId },
        { name: "C\xEDrculo CERO", id: circuloGroupId }
      ];
      const results = [];
      for (const g of groups) {
        try {
          const chat = await client.getChatById(g.id);
          const limit = g.name.includes("NETWORK") ? 50 : 15;
          const msgs = await chat.fetchMessages({ limit });
          results.push({
            name: g.name,
            id: g.id,
            messages: msgs.map((m) => ({
              fromMe: m.fromMe,
              author: m.author || m.from,
              body: m.body,
              timestamp: m.timestamp,
              date: new Date(m.timestamp * 1e3).toLocaleString("es-CO", { timeZone: "America/Bogota" })
            }))
          });
        } catch (e) {
          results.push({ name: g.name, id: g.id, error: e.message });
        }
      }
      res.json(results);
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  app.get("/api/trigger-nightly-rematch", async (req, res) => {
    try {
      const { runNightlyRematch: runNightlyRematch2 } = await Promise.resolve().then(() => (init_nightlyRematch(), nightlyRematch_exports));
      console.log("[API-TRIGGER] Ejecutando cruce masivo manual desde endpoint...");
      await runNightlyRematch2();
      res.send("Cruce masivo ejecutado con \xE9xito.");
    } catch (err) {
      console.error("[API-TRIGGER] Error al ejecutar cruce manual:", err);
      res.status(500).send(err.message);
    }
  });
  app.get("/api/resend-today-matches", async (req, res) => {
    try {
      const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { propertyMatches: propertyMatches2, requirements: requirements2, properties: properties2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq14, gte: gte3 } = await import("drizzle-orm");
      const { handleDetectedMatches: handleDetectedMatches2 } = await Promise.resolve().then(() => (init_janIA(), janIA_exports));
      const db = await getDb2();
      if (!db) return res.status(500).send("No DB connection");
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      const matches = await db.select().from(propertyMatches2).where(gte3(propertyMatches2.createdAt, today));
      console.log(`[API] Encontrados ${matches.length} matches creados hoy en la BD.`);
      const seen = /* @__PURE__ */ new Set();
      const uniqueMatches = [];
      for (const m of matches) {
        const key = `${m.requirementId}-${m.propertyId}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueMatches.push(m);
        }
      }
      console.log(`[API] Re-enviando ${uniqueMatches.length} matches \xFAnicos creados hoy...`);
      (async () => {
        let count = 0;
        for (const match of uniqueMatches) {
          try {
            const [reqRec] = await db.select().from(requirements2).where(eq14(requirements2.id, match.requirementId)).limit(1);
            const [propRec] = await db.select().from(properties2).where(eq14(properties2.id, match.propertyId)).limit(1);
            if (reqRec && propRec) {
              const score = Number(match.matchScore);
              const matchedItem = {
                ...propRec,
                score,
                matchId: match.id,
                idUsuarioWhatsapp: propRec.idUsuarioWhatsapp
              };
              const matchDetails = await handleDetectedMatches2(
                [matchedItem],
                false,
                reqRec,
                reqRec.idUsuarioWhatsapp || "",
                "Aliado VECY"
              );
              if (matchDetails.extraDMs && matchDetails.extraDMs.length > 0) {
                for (const dm of matchDetails.extraDMs) {
                  await janiaMatchBot.queuedSend(dm.jid, dm.message);
                }
              }
              count++;
              console.log(`[API-RESEND] Match #${match.id} reenviado con \xE9xito (${count}/${uniqueMatches.length}).`);
              await new Promise((resolve) => setTimeout(resolve, 15e3));
            }
          } catch (e) {
            console.error(`[API-RESEND] Error reenviando match #${match.id}:`, e.message || e);
          }
        }
        console.log(`[API-RESEND] Finalizado reenv\xEDo de ${count} matches.`);
      })().catch(console.error);
      res.send(`Iniciado reenv\xEDo en segundo plano de ${uniqueMatches.length} matches \xFAnicos.`);
    } catch (err) {
      console.error(err);
      res.status(500).send(err.message);
    }
  });
  app.get("/api/trigger-reaction-response", async (req, res) => {
    try {
      if (!janiaMatchBot.isReady) {
        return res.status(503).send("El bot no est\xE1 listo.");
      }
      const client = janiaMatchBot.client;
      const targetGroupId = janiaMatchBot.targetGroupId || "120363260108880069@g.us";
      const chat = await client.getChatById(targetGroupId);
      const msgs = await chat.fetchMessages({ limit: 100 });
      let summaryMsg = null;
      for (const m of msgs) {
        if (m.fromMe && m.body && (m.body.includes("RESUMEN: \xA1JANIA V2.0 ACTIVA EN LA RED!") || m.body.includes("RESUMEN: \xA1JANIA V2.5 ACTIVA EN LA RED!"))) {
          summaryMsg = m;
          break;
        }
      }
      if (summaryMsg) {
        const senderId = "573118588254@c.us";
        const realName = "trato hecho Bienes raices";
        const promptContext = `[REACCI\xD3N DE BURLA/SARCASMO]: El usuario @573118588254 (${realName}) ha reaccionado con el emoji \u{1F602} a tu mensaje: "${summaryMsg.body}". Genera una respuesta en el grupo dirigi\xE9ndote a este aliado/colega. Responde de manera profesional, sofisticada, \xE9tica y con sutil auto-defensa. Demuestra con altura y elegancia que la tecnolog\xEDa seria y la colaboraci\xF3n estructurada es el camino para cerrar negocios, debatiendo con ingenio pero con respeto. Usa emojis.`;
        const result = await processWhatsAppMessage(promptContext, senderId, realName, false, [], void 0, void 0, true, void 0, void 0, targetGroupId, chat.name);
        if (result && result.response && result.response.trim() !== "") {
          await janiaMatchBot.queuedSend(targetGroupId, result.response, {
            mentions: [senderId],
            quotedMessageId: summaryMsg.id._serialized
          });
          res.json({ success: true, message: "Reaction response sent to group", responseText: result.response });
        } else {
          res.status(500).json({ success: false, error: "Failed to generate LLM response" });
        }
      } else {
        res.status(404).json({ success: false, error: "Summary announcement message not found in the last 100 messages" });
      }
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  app.post("/admin/trigger-motivador", async (req, res) => {
    const { groupType, themeIndex, token } = req.body;
    if (token !== "vecy2025admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      if (!janiaMatchBot.isReady) {
        return res.status(503).json({ error: "Bot no est\xE1 listo a\xFAn" });
      }
      const tematicas = [
        "Incentivar a los asesores a interactuar con JanIA sin miedo, ya sea por texto o enviando notas de voz en el grupo, pregunt\xE1ndole sobre inmuebles, requerimientos, leyes o funcionamiento.",
        "Explicar de forma sencilla qu\xE9 es VECY Network, el rol de JanIA como asistente de inteligencia artificial y c\xF3mo funciona el sistema de coincidencia (matching) en segundos.",
        "Compartir la historia de VECY Network, qui\xE9nes somos (Jani Alves y Eduardo A. Rivera) y por qu\xE9 creamos esta red colaborativa nacional.",
        "Explicar los servicios que ofrecemos, c\xF3mo contactarnos y en qu\xE9 redes sociales nos pueden encontrar.",
        "Recordar que actualmente todo el proyecto y las herramientas son 100% gratuitos por estar en fase de pruebas, y hablar con entusiasmo de las grandes cosas que est\xE1n por venir.",
        "Preguntar a los colegas c\xF3mo ven el proyecto, qu\xE9 les agrada m\xE1s, qu\xE9 les molesta, qu\xE9 cambiar\xEDan o qu\xE9 ideas/mejoras aportar\xEDan para que JanIA y el portal est\xE9n mejor a su servicio.",
        "Hablar sobre el lanzamiento al aire de la web oficial de VECY, aclarando honestamente que saldr\xE1 apenas veamos que la comunidad realmente necesita y valora la herramienta en su d\xEDa a d\xEDa."
      ];
      const idx = typeof themeIndex === "number" ? themeIndex : 2;
      const tematicaSeleccionada = tematicas[idx] || tematicas[2];
      let targetId = "";
      let nombreGrupo = "";
      let promptExtra = "";
      if (groupType === "consultoria") {
        targetId = janiaMatchBot.buzonGroupId;
        nombreGrupo = "VECY: SOPORTE LEGAL, CONTRATOS Y AVAL\xDAOS";
        promptExtra = "Enf\xF3cate en invitar a que consulten sobre temas jur\xEDdicos, disputas de comisiones de puntas compartidas, contratos de corretaje o aval\xFAos.";
      } else if (groupType === "inmuebles") {
        targetId = janiaMatchBot.targetGroupId;
        nombreGrupo = "VECY INMUEBLES NETWORK";
        promptExtra = "Enf\xF3cate en la publicaci\xF3n activa de ofertas y demandas de inmuebles, el cruce comercial r\xE1pido, y la colaboraci\xF3n nacional sin pagar comisiones.";
      } else if (groupType === "circulo") {
        targetId = janiaMatchBot.circuloGroupId;
        nombreGrupo = "C\xCDRCULO CERO";
        promptExtra = "Enf\xF3cate en la retroalimentaci\xF3n del sistema, sugerencias directas a los fundadores, ideas de mejora y el futuro del sector inmobiliario.";
      } else {
        return res.status(400).json({ error: "groupType no v\xE1lido. Debe ser consultoria, inmuebles o circulo." });
      }
      if (!targetId) {
        return res.status(404).json({ error: `El JID del grupo ${nombreGrupo} no est\xE1 configurado` });
      }
      const promptVoz = `Genera un mensaje corto, cercano y motivador en espa\xF1ol para ser enviado como nota de voz al grupo de WhatsApp "${nombreGrupo}".
Direcci\xF3n obligatoria:
- La tem\xE1tica del audio de hoy debe ser: "${tematicaSeleccionada}"
- ${promptExtra}
- IMPORTANTE: Debe sonar como un mensaje de voz natural de WhatsApp grabado de forma espont\xE1nea por una colega real. Evita introducciones corporativas como "Estimados miembros" o frases rob\xF3ticas. Empieza de forma muy natural como: "Hola colegas, \xBFc\xF3mo van?", "Buenas tardes a todos por aqu\xED", "Hola a todos, paso por aqu\xED un momento...".
- Mant\xE9n el texto relativamente corto y conciso (m\xE1ximo 400 caracteres) para que la nota de voz generada dure aproximadamente de 30 a 40 segundos, lo cual es ideal para mantener la atenci\xF3n y optimizar recursos de voz. No uses vi\xF1etas ni formateo markdown complejo ya que se leer\xE1 como audio.
- CR\xCDTICO: Responde \xDANICAMENTE con el guion hablado de la nota de voz. NO agregues comentarios, pre\xE1mbulos, explicaciones ni envuelvas el texto en comillas, llaves ({{ }}) o corchetes. Todo tu texto se convertir\xE1 directamente a audio.`;
      console.log(`[ADMIN-TRIGGER] Generando audio motivador para ${nombreGrupo} (Tem\xE1tica idx ${idx})...`);
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "Eres JanIA, la asistente de voz e inteligencia artificial de la red colaborativa VECY Network. Te expresas de manera natural, humana, c\xE1lida y profesional." },
          { role: "user", content: promptVoz }
        ]
      });
      const content = response.choices[0]?.message?.content;
      if (content && content.trim() !== "") {
        console.log(`[ADMIN-TRIGGER] Enviando audio motivador a ${nombreGrupo}...`);
        await janiaMatchBot.sendVoiceToGroup(content, targetId);
        res.json({ ok: true, group: nombreGrupo, theme: tematicaSeleccionada, textSent: content });
      } else {
        res.status(500).json({ error: "El LLM retorn\xF3 un contenido vac\xEDo" });
      }
    } catch (err) {
      console.error("[ADMIN-TRIGGER] Error al disparar audio motivador:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "3000");
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    Promise.resolve().then(() => (init_nightlyRematch(), nightlyRematch_exports)).then(({ recalculateAndCleanupMatches: recalculateAndCleanupMatches2 }) => {
      recalculateAndCleanupMatches2().catch((err) => {
        console.error("[STARTUP-CLEANUP] Error ejecutando la limpieza de matches:", err);
      });
    }).catch((err) => {
      console.error("[STARTUP-CLEANUP] Error importando funci\xF3n de limpieza:", err);
    });
    const shouldStartBot = process.env.ENABLE_WHATSAPP_BOT !== "false" || process.env.ENABLE_JANIA_MATCH_BOT === "true";
    if (shouldStartBot) {
      console.log("Iniciando WhatsApp Bot Unificado (Baileys)...");
      janiaMatchBot.initialize();
    } else {
      console.log("[WHATSAPP-BOT] Deshabilitado temporalmente mediante variables de entorno.");
    }
    initCronScheduler();
  });
}
var gracefulShutdown = async (signal) => {
  console.log(`
[SYSTEM] Cerrando recursos de forma ordenada por se\xF1al: ${signal}`);
  try {
    const client = whatsappBot.client;
    if (client) {
      console.log("[SYSTEM] Destruyendo sesi\xF3n de WhatsApp y cerrando Puppeteer...");
      await client.destroy();
    }
  } catch (err) {
    console.error("[SYSTEM] Error al cerrar el cliente de WhatsApp principal:", err);
  }
  try {
    if (process.env.ENABLE_JANIA_MATCH_BOT === "true") {
      const { janiaMatchBot: janiaMatchBot2 } = await Promise.resolve().then(() => (init_whatsapp_match(), whatsapp_match_exports));
      const matchClient = janiaMatchBot2.client;
      if (matchClient) {
        console.log("[SYSTEM] Destruyendo sesi\xF3n de JanIA Match y cerrando Puppeteer...");
        await matchClient.destroy();
      }
    }
  } catch (err) {
    console.error("[SYSTEM] Error al cerrar el cliente de JanIA Match:", err);
  }
  console.log("[SYSTEM] Suite finalizada exitosamente. Hasta pronto.");
  process.exit(0);
};
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
startServer().catch(console.error);
