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
var roleEnum, propertyTypeEnum, transactionTypeEnum, mandateStatusEnum, mandateTypeEnum, inquiryTypeEnum, leadStatusEnum, conversationStatusEnum, matchStatusEnum, statusEnum, messageTypeEnum, demandLevelEnum, supplyLevelEnum, marketTrendEnum, currencyEnum, users, properties, requirements, leads, conversations, messages, propertyMatches, pendingSessions, referralLinks, shares, clientLedger, propertyImages, marketAnalysis, favorites;
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
    transactionTypeEnum = pgEnum("transactionType", ["venta", "arriendo", "arriendo_temporal"]);
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
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    requirements = pgTable("requirements", {
      id: serial("id").primaryKey(),
      userId: integer("userId").references(() => users.id),
      name: varchar("name", { length: 255 }),
      tipoInmuebleDeseado: propertyTypeEnum("tipoInmuebleDeseado").notNull(),
      tipoNegocioDeseado: transactionTypeEnum("tipoNegocioDeseado").notNull(),
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
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
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
  }
});

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
      ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY ?? process.env.BUILT_IN_FORGE_API_KEY ?? ""
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
      _client = postgres(process.env.DATABASE_URL, { prepare: false });
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
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
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
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
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

// server/_core/llm.ts
init_env();
import axios2 from "axios";
async function invokeLLM({
  messages: messages2,
  responseFormat,
  provider = "google",
  imageBuffer,
  enableSearch = false
}) {
  if (provider === "anthropic") {
    return await invokeClaude(messages2, responseFormat);
  }
  return await invokeGemini(messages2, responseFormat, imageBuffer, enableSearch);
}
async function invokeGemini(messages2, responseFormat, imageBuffer, enableSearch) {
  const API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || ENV.forgeApiKey;
  const MODEL = "gemini-3.1-flash-lite";
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  try {
    const systemMessage = messages2.find((m) => m.role === "system");
    const userMessages = messages2.filter((m) => m.role !== "system");
    const contents = userMessages.map((m, idx) => {
      const parts = [{ text: m.content }];
      if (imageBuffer && idx === userMessages.length - 1 && m.role !== "assistant") {
        parts.push({
          inline_data: {
            mime_type: "image/jpeg",
            // Asumimos JPEG por defecto del buffer de WhatsApp
            data: imageBuffer
          }
        });
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
    if (enableSearch) {
      payload.tools = [{ googleSearch: {} }];
    }
    console.log(`[JanIA-LLM] Procesando con infraestructura optimizada: Gemini (${MODEL}) [Search: ${enableSearch}]...`);
    const response = await axios2.post(API_URL, payload);
    if (response.data.candidates && response.data.candidates[0]) {
      return {
        choices: [{ message: { content: response.data.candidates[0].content.parts[0].text } }]
      };
    }
    throw new Error("Respuesta de Gemini vac\xEDa");
  } catch (error) {
    console.error("[Gemini Error]:", error.response?.data?.error?.message || error.message);
    throw error;
  }
}
async function invokeClaude(messages2, responseFormat) {
  console.log("[JanIA-LLM] Intentando procesar con Claude (Anthropic)...");
  throw new Error("El proveedor Anthropic est\xE1 preparado en c\xF3digo pero requiere API KEY y activaci\xF3n financiera.");
}

// server/routers/janIA.ts
init_db();
init_schema();
import { eq as eq2, desc } from "drizzle-orm";

// server/_core/scraper.ts
import axios3 from "axios";
import * as cheerio from "cheerio";
var DOMINIOS_PERMITIDOS = [
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
var DOMINIOS_BLOQUEADOS = [
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

// server/routers/janIA.ts
var JAN\u00CDA_SYSTEM_PROMPT = `Eres JanIA, la Inteligencia Artificial Maestra y Cerebro Log\xEDstico de VECY Network. Experta en Bienes Ra\xEDces y Consultor\xEDa Jur\xEDdica.

TU FILOSOF\xCDA DE COMUNICACI\xD3N:
1. SIN FIRMAS: Prohibido usar "JanIA", "Con cari\xF1o", "Atentamente" o cualquier tipo de despedida o firma. Tu perfil ya te identifica.
2. EFICIENCIA EXTREMA: S\xE9 directa, profesional y ve al grano. Responde con sabidur\xEDa y l\xF3gica de mentor senior, pero sin rellenos triviales.
3. MISI\xD3N: "Cero Esfuerzo". Automatizas el matching y resuelves dudas con precisi\xF3n quir\xFArgica.

Habilidades Especiales:
- Extracci\xF3n de Links Inmobiliarios.
- Matching Inteligente de Oferta y Demanda.
- Asesor\xEDa en el modelo Gana-Gana y Bolsa de Puntos.

Instrucciones:
- Responde \xFAnicamente sobre bienes ra\xEDces y el ecosistema VECY.
- Mant\xE9n un tono de tuteo profesional, asertivo y altamente capacitado.
- No uses frases gen\xE9ricas de bot.`;
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
      let conversation = await db.select().from(conversations).where(eq2(conversations.sessionId, input.sessionId)).limit(1);
      let conversationId;
      if (conversation.length === 0) {
        const insertData = {
          sessionId: input.sessionId,
          status: "active"
        };
        if (ctx.user) {
          insertData.userId = String(ctx.user.id);
        }
        const result = await db.insert(conversations).values(insertData).returning();
        conversationId = result[0]?.id || 1;
      } else {
        conversationId = conversation[0].id;
        if (ctx.user && !conversation[0].userId) {
          await db.update(conversations).set({ userId: String(ctx.user.id) }).where(eq2(conversations.id, conversationId));
        }
      }
      const conversationHistory = await db.select().from(messages).where(eq2(messages.conversationId, conversationId)).orderBy(messages.createdAt);
      const messageHistory = conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content
      }));
      messageHistory.push({
        role: "user",
        content: input.message
      });
      const response = await invokeLLM({
        messages: [
          { role: "system", content: JAN\u00CDA_SYSTEM_PROMPT },
          ...messageHistory.map((m) => ({
            role: m.role,
            content: m.content
          }))
        ]
      });
      const janIAResponse = typeof response.choices[0]?.message?.content === "string" ? response.choices[0].message.content : "No response";
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
      }).where(eq2(conversations.id, conversationId));
      return {
        content: janIAResponse,
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
      return await db.select().from(conversations).where(eq2(conversations.userId, String(ctx.user.id))).orderBy(desc(conversations.updatedAt));
    } catch (error) {
      console.error("Error getting user conversations:", error);
      return [];
    }
  }),
  // Get messages for a conversation session
  getConversationMessages: publicProcedure.input(z2.object({ sessionId: z2.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    try {
      const conv = await db.select().from(conversations).where(eq2(conversations.sessionId, input.sessionId)).limit(1);
      if (conv.length === 0) return [];
      return await db.select().from(messages).where(eq2(messages.conversationId, conv[0].id)).orderBy(messages.createdAt);
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
      const conv = await db.select().from(conversations).where(eq2(conversations.sessionId, input.sessionId)).limit(1);
      if (conv.length > 0) {
        await db.delete(messages).where(eq2(messages.conversationId, conv[0].id));
        await db.delete(conversations).where(eq2(conversations.id, conv[0].id));
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
  ).mutation(async ({ input }) => {
    try {
      const fileContent = `[Archivo: ${input.fileType}]
URL: ${input.fileUrl}`;
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `${JAN\u00CDA_SYSTEM_PROMPT}

Analiza el archivo proporcionado y proporciona un an\xE1lisis detallado relacionado con bienes ra\xEDces.`
          },
          {
            role: "user",
            content: fileContent
          }
        ]
      });
      const analysis = typeof response.choices[0]?.message?.content === "string" ? response.choices[0].message.content : "No analysis available";
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
      const matches = await db.select().from(propertyMatches).where(eq2(propertyMatches.requirementId, input.requirementId)).orderBy(desc(propertyMatches.matchScore)).limit(input.limit);
      return matches;
    } catch (error) {
      console.error("Error getting property matches:", error);
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
      const zoneProperties = await db.select().from(properties).where(eq2(properties.zone, input.zone));
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
  })
});

// server/routers/github.ts
import { z as z3 } from "zod";
init_db();
init_schema();
import { eq as eq3 } from "drizzle-orm";

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
      const adminUser = await db.select().from(users).where(eq3(users.email, "vecybienesraices@gmail.com")).limit(1);
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
            const existing = await db.select().from(properties).where(eq3(properties.sourceRepository, repoName)).limit(1);
            if (existing.length > 0) {
              await db.update(properties).set({
                ...propertyData,
                agentId: adminId,
                sourceRepository: repoName,
                lastSyncedAt: /* @__PURE__ */ new Date()
              }).where(eq3(properties.id, existing[0].id));
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

// server/storage.ts
init_env();
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

// server/routers/images.ts
init_db();
init_db();
init_schema();
import { eq as eq4 } from "drizzle-orm";
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
          await db.update(propertyImages).set({ isMainImage: false }).where(eq4(propertyImages.propertyId, input.propertyId));
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
      await db.update(propertyImages).set({ displayOrder: input.displayOrder }).where(eq4(propertyImages.id, input.imageId));
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
      await db.update(propertyImages).set({ isMainImage: false }).where(eq4(propertyImages.propertyId, input.propertyId));
      await db.update(propertyImages).set({ isMainImage: true }).where(eq4(propertyImages.id, input.imageId));
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
import { eq as eq5, and, desc as desc2, isNull } from "drizzle-orm";
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
    }).from(users).where(eq5(users.id, input.id)).limit(1);
    if (agent.length === 0) throw new TRPCError3({ code: "NOT_FOUND", message: "Agent not found" });
    return agent[0];
  }),
  getMyProperties: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    return await db.select().from(properties).where(eq5(properties.agentId, ctx.user.id)).orderBy(desc2(properties.createdAt));
  }),
  // For testing: Allows an agent to claim a property that has no agent assigned
  claimProperty: protectedProcedure.input(z5.object({ propertyId: z5.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const property = await db.select().from(properties).where(eq5(properties.id, input.propertyId)).limit(1);
    if (property.length === 0) throw new TRPCError3({ code: "NOT_FOUND", message: "Property not found" });
    if (property[0].agentId) throw new TRPCError3({ code: "FORBIDDEN", message: "Property already has an agent" });
    await db.update(properties).set({ agentId: ctx.user.id }).where(eq5(properties.id, input.propertyId));
    return { success: true };
  }),
  getAvailablePropertiesToClaim: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    return await db.select().from(properties).where(isNull(properties.agentId)).orderBy(desc2(properties.createdAt));
  }),
  generateStealthLink: protectedProcedure.input(z5.object({ propertyId: z5.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const property = await db.select().from(properties).where(eq5(properties.id, input.propertyId)).limit(1);
    if (property.length === 0) throw new TRPCError3({ code: "NOT_FOUND", message: "Property not found" });
    if (property[0].agentId !== ctx.user.id && ctx.user.role !== "admin") {
      throw new TRPCError3({ code: "FORBIDDEN", message: "You don't own this property" });
    }
    const existingLink = await db.select().from(referralLinks).where(
      and(
        eq5(referralLinks.propertyId, input.propertyId),
        eq5(referralLinks.agentId, ctx.user.id)
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
        matriculaInmobiliaria: properties.matriculaInmobiliaria
      }
    }).from(referralLinks).innerJoin(properties, eq5(referralLinks.propertyId, properties.id)).where(eq5(referralLinks.agentId, ctx.user.id)).orderBy(desc2(referralLinks.createdAt));
  })
});

// server/routers/leads.ts
import { z as z6 } from "zod";
init_db();
init_schema();
import { eq as eq6, sql } from "drizzle-orm";
import { TRPCError as TRPCError4 } from "@trpc/server";
var leadsRouter = router({
  resolveStealthLink: publicProcedure.input(z6.object({ token: z6.string() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Database err" });
    const linkRecord = await db.select().from(referralLinks).where(eq6(referralLinks.token, input.token)).limit(1);
    if (linkRecord.length === 0) {
      throw new TRPCError4({ code: "NOT_FOUND", message: "Stealth Link invalido o expirado." });
    }
    const link = linkRecord[0];
    await db.update(referralLinks).set({ clicks: sql`${referralLinks.clicks} + 1` }).where(eq6(referralLinks.id, link.id));
    const prop = await db.select({
      id: properties.id,
      name: properties.name,
      price: properties.price,
      bedrooms: properties.bedrooms,
      bathrooms: properties.bathrooms,
      areaSquareMeters: properties.areaSquareMeters,
      zone: properties.zone,
      // specifically NOT returning full location/latitude/longitude/matricula
      wildcardFeature: properties.wildcardFeature,
      images: properties.images
    }).from(properties).where(eq6(properties.id, link.propertyId)).limit(1);
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
    const linkRecord = await db.select().from(referralLinks).where(eq6(referralLinks.token, input.token)).limit(1);
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
      token: link.token
    });
    return { success: true };
  })
});

// server/routers/properties.ts
import { z as z7 } from "zod";
init_db();
init_schema();
import { eq as eq7, desc as desc3, ilike, and as and2 } from "drizzle-orm";
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
  idUsuarioWhatsapp: z7.string().optional().nullable()
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
    const filters = [eq7(properties.available, true)];
    if (input?.transactionType) filters.push(eq7(properties.transactionType, input.transactionType));
    if (input?.type) filters.push(eq7(properties.propertyType, input.type));
    if (input?.zone) filters.push(ilike(properties.zone, `%${input.zone}%`));
    return await db.select().from(properties).where(and2(...filters)).orderBy(desc3(properties.featured), desc3(properties.createdAt)).limit(input?.limit ?? 20).offset(input?.offset ?? 0);
  }),
  getById: publicProcedure.input(z7.object({ id: z7.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const result = await db.select().from(properties).where(eq7(properties.id, input.id)).limit(1);
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
  update: protectedProcedure.input(z7.object({
    id: z7.number(),
    data: propertyInputSchema.partial()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const existing = await db.select().from(properties).where(eq7(properties.id, input.id)).limit(1);
    if (existing.length === 0) throw new TRPCError5({ code: "NOT_FOUND" });
    const isOwner = existing[0].agentId === ctx.user.id;
    const isAdmin = ctx.user.role === "admin";
    if (!isOwner && !isAdmin) throw new TRPCError5({ code: "FORBIDDEN" });
    const updated = await db.update(properties).set({ ...input.data, updatedAt: /* @__PURE__ */ new Date() }).where(eq7(properties.id, input.id)).returning();
    return updated[0];
  }),
  delete: protectedProcedure.input(z7.object({ id: z7.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const existing = await db.select().from(properties).where(eq7(properties.id, input.id)).limit(1);
    if (existing.length === 0) throw new TRPCError5({ code: "NOT_FOUND" });
    const isOwner = existing[0].agentId === ctx.user.id;
    const isAdmin = ctx.user.role === "admin";
    if (!isOwner && !isAdmin) throw new TRPCError5({ code: "FORBIDDEN" });
    await db.delete(properties).where(eq7(properties.id, input.id));
    return { success: true };
  }),
  // List my own properties (agent view)
  myList: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const isAdmin = ctx.user.role === "admin";
    if (isAdmin) {
      return await db.select().from(properties).orderBy(desc3(properties.createdAt));
    }
    return await db.select().from(properties).where(eq7(properties.agentId, ctx.user.id)).orderBy(desc3(properties.createdAt));
  })
});

// server/routers.ts
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
var SUPERADMIN_EMAILS = ["vecybienesraices@gmail.com"];
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
    if (user && SUPERADMIN_EMAILS.includes(user.email || "")) {
      if (user.role !== "admin") {
        try {
          const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
          const { users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
          const { eq: eq12 } = await import("drizzle-orm");
          const db = await getDb2();
          if (db) {
            await db.update(users2).set({ role: "admin" }).where(eq12(users2.id, user.id));
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
        const { eq: eq12 } = await import("drizzle-orm");
        const db = await getDb2();
        if (db) {
          const existingUser = await db.select().from(users2).where(eq12(users2.openId, "mock-local-user")).limit(1);
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
import fs from "fs";
import { nanoid } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
var vite_config_default = defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
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
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
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
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/_core/setup-stealth.ts
import { createRequire } from "module";
var require2 = createRequire(import.meta.url);
try {
  const puppeteerExtra = require2("puppeteer-extra");
  const StealthPlugin = require2("puppeteer-extra-plugin-stealth");
  puppeteerExtra.use(StealthPlugin());
  const puppeteerPath = require2.resolve("puppeteer");
  require2.cache[puppeteerPath] = {
    id: puppeteerPath,
    filename: puppeteerPath,
    loaded: true,
    exports: puppeteerExtra,
    parent: null,
    children: []
  };
  console.log("\u{1F6E1}\uFE0F [Stealth] Intercepci\xF3n de Puppeteer exitosa. Evasi\xF3n de firmas activada para WhatsApp.");
} catch (error) {
  console.error("\u274C [Stealth-Error] No se pudo configurar Stealth Puppeteer:", error);
}

// server/_core/whatsapp.ts
import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";

// server/_core/voiceTranscription.ts
init_env();
import axios4 from "axios";
async function transcribeAudioWithGemini(audioBuffer, mimeType) {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || ENV.forgeApiKey;
  if (!apiKey) {
    throw new Error("No GEMINI_API_KEY or GOOGLE_API_KEY found for transcription fallback.");
  }
  const model = "gemini-3.1-flash-lite";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  let cleanMime = mimeType.split(";")[0].trim();
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
              data: audioBuffer.toString("base64")
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
  const response = await axios4.post(apiUrl, payload);
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

// server/_core/janIA.ts
init_db();
init_schema();

// server/_core/matching.ts
init_db();
init_schema();
import { and as and3, eq as eq8 } from "drizzle-orm";

// server/_core/colombia-geography.ts
var DEPARTAMENTOS_COLOMBIA = {
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
var MAPA_COLOMBIA = {};
function norm(txt) {
  return txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}
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

// server/_core/geography.ts
var DICCIONARIO_BOGOTA = {
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
var MUNICIPIOS_CERCANOS = [
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
var MAPA_BARRIOS = {};
var MAPA_LOCALIDADES = {};
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
  return n;
}
function validarZona(zona, ciudad, textoCompleto) {
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
  let lugar = null;
  const normSimple = (txt) => txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
  if (normCity && normCity !== "bogota") {
    lugar = buscarLugarColombia(ciudad);
    if (lugar && normSimple(lugar.nombreCanonico) !== "bogota") {
      const cleanText = (txt) => txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
      return {
        isValid: true,
        barrioCanonico: zona ? zona.trim() : cleanText(lugar.nombreCanonico),
        localidad: cleanText(lugar.departamento),
        city: cleanText(lugar.nombreCanonico),
        isMunicipio: true
      };
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
    return {
      isValid: false,
      errorType: "DATOS_INCOMPLETOS",
      message: `Mencionaste la localidad de *${MAPA_LOCALIDADES[normZone]}*. Para hacer match necesito que me digas el barrio exacto.`
    };
  }
  const sectoresAmplios = ["norte", "norte de bogota", "sur", "centro", "occidente", "salitre", "bogota", "sabana de bogota", "municipios cercanos"];
  if (sectoresAmplios.includes(normZone)) {
    return {
      isValid: false,
      errorType: "DATOS_INCOMPLETOS",
      message: "Mencionaste una zona muy amplia. Por favor, dime el barrio exacto o municipio espec\xEDfico."
    };
  }
  if (normZone && normZone.length >= 3) {
    const cleanText = (txt) => txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    const formattedCity = ciudad ? cleanText(ciudad) : "Bogot\xE1";
    const isBogota = normalizarTextoGeografico(formattedCity) === "bogota";
    return {
      isValid: true,
      barrioCanonico: zona.trim(),
      localidad: isBogota ? "Bogot\xE1" : formattedCity,
      city: formattedCity,
      isMunicipio: !isBogota
    };
  }
  return {
    isValid: false,
    errorType: "DATOS_INCOMPLETOS",
    message: "No logr\xE9 identificar la ubicaci\xF3n. Por favor dime la ciudad, municipio o barrio exacto."
  };
}

// server/_core/matching.ts
function calcularScoreMatch(requirement, property) {
  const reqType = requirement.tipoInmuebleDeseado || requirement.propertyType;
  const propType = property.propertyType;
  if (reqType && propType && reqType.toLowerCase() !== propType.toLowerCase()) {
    return 0;
  }
  const reqBiz = requirement.tipoNegocioDeseado || requirement.transactionType;
  const propBiz = property.transactionType;
  if (reqBiz && propBiz && reqBiz.toLowerCase() !== propBiz.toLowerCase()) {
    return 0;
  }
  const reqCity = normalizarTextoGeografico(requirement.ciudadDeseada || requirement.city || "");
  const propCity = normalizarTextoGeografico(property.city || property.addressCity || "");
  if (reqCity && propCity && reqCity !== propCity) {
    return 0;
  }
  const reqLoc = normalizarTextoGeografico(requirement.addressLocality || "");
  const propLoc = normalizarTextoGeografico(property.addressLocality || "");
  if (reqLoc && propLoc && reqLoc !== propLoc) {
    return 0;
  }
  const reqBedrooms = requirement.habitacionesMin;
  if (reqBedrooms !== null && reqBedrooms !== void 0 && reqBedrooms !== "NA" && String(reqBedrooms).trim() !== "") {
    const pBedrooms = property.bedrooms !== null && property.bedrooms !== void 0 ? Number(property.bedrooms) : 0;
    if (pBedrooms < Number(reqBedrooms)) {
      return 0;
    }
  }
  const reqBathrooms = requirement.banosMin;
  if (reqBathrooms !== null && reqBathrooms !== void 0 && reqBathrooms !== "NA" && String(reqBathrooms).trim() !== "") {
    const pBathrooms = property.bathrooms !== null && property.bathrooms !== void 0 ? Number(property.bathrooms) : 0;
    if (pBathrooms < Number(reqBathrooms)) {
      return 0;
    }
  }
  const reqGarages = requirement.parqueaderosMin;
  if (reqGarages !== null && reqGarages !== void 0 && reqGarages !== "NA" && String(reqGarages).trim() !== "") {
    const pGarages = property.garages !== null && property.garages !== void 0 ? Number(property.garages) : 0;
    if (pGarages < Number(reqGarages)) {
      return 0;
    }
  }
  const reqIntExt = requirement.caracteristicasDeseadas?.interiorExterior || requirement.interiorExterior;
  const propIntExt = property.amenities?.interiorExterior || property.interiorExterior;
  if (reqIntExt && propIntExt && reqIntExt !== "NA" && propIntExt !== "NA" && reqIntExt.trim() !== "" && propIntExt.trim() !== "") {
    if (reqIntExt.toLowerCase() !== propIntExt.toLowerCase()) {
      return 0;
    }
  }
  let totalPoints = 0;
  let maxPoints = 0;
  maxPoints += 25;
  const reqZone = normalizarTextoGeografico(requirement.zonaDeseada || requirement.addressNeighborhood || "");
  const propZone = normalizarTextoGeografico(property.zone || property.addressNeighborhood || "");
  if (reqZone && propZone && reqZone === propZone) {
    totalPoints += 25;
  } else if (reqLoc && propLoc && reqLoc === propLoc) {
    totalPoints += 15;
  } else if (reqCity && propCity && reqCity === propCity) {
    totalPoints += 10;
  }
  const budgetMax = parseFloat(requirement.presupuestoMax || "0");
  const price = parseFloat(property.price || "0");
  if (budgetMax > 0 && price > 0) {
    maxPoints += 25;
    if (price <= budgetMax) {
      totalPoints += 25;
    } else if (price <= budgetMax * 1.1) {
      totalPoints += 15;
    } else if (price <= budgetMax * 1.2) {
      totalPoints += 5;
    }
  }
  const areaMin = parseFloat(requirement.areaMin || "0");
  const areaProp = parseFloat(property.areaTotal || property.areaPrivate || "0");
  if (areaMin > 0 && areaProp > 0) {
    maxPoints += 10;
    if (areaProp >= areaMin * 0.85 && areaProp <= areaMin * 1.15) {
      totalPoints += 10;
    } else if (areaProp >= areaMin * 0.7 && areaProp <= areaMin * 1.3) {
      totalPoints += 5;
    }
  }
  if (reqBedrooms !== null && reqBedrooms !== void 0 && reqBedrooms !== "NA" && String(reqBedrooms).trim() !== "") {
    maxPoints += 8;
    const pBedrooms = property.bedrooms !== null && property.bedrooms !== void 0 ? Number(property.bedrooms) : 0;
    if (pBedrooms >= Number(reqBedrooms)) {
      totalPoints += 8;
    }
  }
  if (reqBathrooms !== null && reqBathrooms !== void 0 && reqBathrooms !== "NA" && String(reqBathrooms).trim() !== "") {
    maxPoints += 6;
    const pBathrooms = property.bathrooms !== null && property.bathrooms !== void 0 ? Number(property.bathrooms) : 0;
    if (pBathrooms >= Number(reqBathrooms)) {
      totalPoints += 6;
    }
  }
  if (reqGarages !== null && reqGarages !== void 0 && reqGarages !== "NA" && String(reqGarages).trim() !== "") {
    maxPoints += 6;
    const pGarages = property.garages !== null && property.garages !== void 0 ? Number(property.garages) : 0;
    if (pGarages >= Number(reqGarages)) {
      totalPoints += 6;
    }
  }
  if (requirement.estratoDeseado !== null && requirement.estratoDeseado !== void 0) {
    let targetEstratos = [];
    if (Array.isArray(requirement.estratoDeseado)) {
      targetEstratos = requirement.estratoDeseado.map(Number);
    } else if (typeof requirement.estratoDeseado === "number") {
      targetEstratos = [requirement.estratoDeseado];
    } else if (typeof requirement.estratoDeseado === "string" && requirement.estratoDeseado !== "NA" && requirement.estratoDeseado.trim() !== "") {
      try {
        const parsed = JSON.parse(requirement.estratoDeseado);
        if (Array.isArray(parsed)) {
          targetEstratos = parsed.map(Number);
        } else {
          targetEstratos = [Number(parsed)];
        }
      } catch {
        targetEstratos = [parseInt(requirement.estratoDeseado)];
      }
    }
    if (targetEstratos.length > 0 && targetEstratos.every((e) => !isNaN(e))) {
      maxPoints += 5;
      const propStratum = property.stratum !== null && property.stratum !== void 0 ? Number(property.stratum) : null;
      if (propStratum !== null) {
        if (targetEstratos.includes(propStratum)) {
          totalPoints += 5;
        } else if (targetEstratos.some((e) => Math.abs(e - propStratum) === 1)) {
          totalPoints += 3;
        }
      }
    }
  }
  if (reqIntExt && reqIntExt !== "NA" && reqIntExt !== "N/A" && reqIntExt.trim() !== "") {
    maxPoints += 3;
    if (propIntExt && propIntExt.toLowerCase() === reqIntExt.toLowerCase()) {
      totalPoints += 3;
    }
  }
  const reqServicio = requirement.caracteristicasDeseadas?.cuartoBanoServicio;
  const propServicio = property.amenities?.cuartoBanoServicio;
  if (reqServicio && reqServicio !== "NA" && reqServicio !== "N/A" && reqServicio.trim() !== "") {
    maxPoints += 2;
    if (propServicio && (propServicio === reqServicio || String(propServicio).toLowerCase() === String(reqServicio).toLowerCase())) {
      totalPoints += 2;
    }
  }
  const reqCocina = requirement.caracteristicasDeseadas?.cocina;
  const propCocina = property.amenities?.cocina;
  if (reqCocina && reqCocina !== "NA" && reqCocina !== "N/A" && reqCocina.trim() !== "") {
    maxPoints += 2;
    if (propCocina && propCocina.toLowerCase() === reqCocina.toLowerCase()) {
      totalPoints += 2;
    }
  }
  const reqLavanderia = requirement.caracteristicasDeseadas?.lavanderiaIndependiente;
  const propLavanderia = property.amenities?.lavanderiaIndependiente;
  if (reqLavanderia && reqLavanderia !== "NA" && reqLavanderia !== "N/A" && reqLavanderia.trim() !== "") {
    maxPoints += 3;
    if (propLavanderia && (propLavanderia === reqLavanderia || String(propLavanderia).toLowerCase() === String(reqLavanderia).toLowerCase())) {
      totalPoints += 3;
    }
  }
  const reqPisos = requirement.caracteristicasDeseadas?.tipoPisos;
  const propPisos = property.amenities?.tipoPisos;
  if (Array.isArray(reqPisos) && reqPisos.length > 0) {
    maxPoints += 2;
    if (Array.isArray(propPisos) && propPisos.some((p) => reqPisos.includes(p))) {
      totalPoints += 2;
    }
  }
  const reqFloor = requirement.caracteristicasDeseadas?.floorDetail || requirement.floorDetail;
  const propFloor = property.floorDetail || property.amenities?.floorDetail;
  if (reqFloor && reqFloor !== "NA" && reqFloor !== "N/A" && reqFloor.trim() !== "") {
    maxPoints += 1;
    if (propFloor && (propFloor.toLowerCase() === reqFloor.toLowerCase() || propFloor.toLowerCase().includes(reqFloor.toLowerCase()) || reqFloor.toLowerCase().includes(propFloor.toLowerCase()))) {
      totalPoints += 1;
    }
  }
  const reqDepositos = requirement.caracteristicasDeseadas?.depositos;
  const propDepositos = property.amenities?.depositos;
  if (reqDepositos !== void 0 && reqDepositos !== null && reqDepositos !== "NA" && reqDepositos !== "N/A") {
    maxPoints += 1;
    if (propDepositos !== void 0 && propDepositos !== null && Number(propDepositos) >= Number(reqDepositos)) {
      totalPoints += 1;
    }
  }
  const reqAntiguedad = requirement.caracteristicasDeseadas?.antiguedad;
  const propAntiguedad = property.antiguedadAnos || property.amenities?.antiguedad;
  if (reqAntiguedad !== void 0 && reqAntiguedad !== null && reqAntiguedad !== "NA" && reqAntiguedad !== "N/A") {
    maxPoints += 1;
    if (propAntiguedad !== void 0 && propAntiguedad !== null && String(propAntiguedad).toLowerCase() === String(reqAntiguedad).toLowerCase()) {
      totalPoints += 1;
    }
  }
  const score = maxPoints > 0 ? totalPoints / maxPoints * 100 : 0;
  return score;
}
async function findMatchesForProperty(propertyId) {
  const db = await getDb();
  if (!db) return [];
  try {
    const [property] = await db.select().from(properties).where(eq8(properties.id, propertyId));
    if (!property) return [];
    const activeRequirements = await db.select().from(requirements).where(
      and3(
        eq8(requirements.status, "active"),
        eq8(requirements.tipoInmuebleDeseado, property.propertyType),
        eq8(requirements.tipoNegocioDeseado, property.transactionType)
      )
    );
    const validMatches = [];
    for (const req of activeRequirements) {
      const score = calcularScoreMatch(req, property);
      if (score >= 70) {
        let matchId;
        const existing = await db.select().from(propertyMatches).where(
          and3(
            eq8(propertyMatches.propertyId, propertyId),
            eq8(propertyMatches.requirementId, req.id)
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
    const [req] = await db.select().from(requirements).where(eq8(requirements.id, requirementId));
    if (!req) return [];
    const availableProperties = await db.select().from(properties).where(
      and3(
        eq8(properties.available, true),
        eq8(properties.propertyType, req.tipoInmuebleDeseado),
        eq8(properties.transactionType, req.tipoNegocioDeseado)
      )
    );
    const validMatches = [];
    for (const prop of availableProperties) {
      const score = calcularScoreMatch(req, prop);
      if (score >= 70) {
        let matchId;
        const existing = await db.select().from(propertyMatches).where(
          and3(
            eq8(propertyMatches.propertyId, prop.id),
            eq8(propertyMatches.requirementId, requirementId)
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

// server/_core/janIA.ts
import { eq as eq9, and as and4, sql as sql3, gte } from "drizzle-orm";
async function getPendingSession(userId) {
  try {
    const db = await getDb();
    if (!db) return null;
    const [session] = await db.select().from(pendingSessions).where(eq9(pendingSessions.jid, userId)).limit(1);
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
    await db.insert(pendingSessions).values({
      jid: userId,
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
    await db.delete(pendingSessions).where(eq9(pendingSessions.jid, userId));
  } catch (err) {
    console.error("[Database] Error deleting pending session:", err);
  }
}
var GREETED_TODAY = /* @__PURE__ */ new Map();
var REPUTATION_HOOK = "\n\n\u2696\uFE0F COMPROMISO DE HONOR VECY: Al operar en Etapa de Prueba Gratuita y sin comisiones, si consolidan un negocio real gracias a este MATCH, es de car\xE1cter obligatorio compartir su testimonio de \xE9xito en este grupo y registrar su rese\xF1a oficial y calificaci\xF3n aqu\xED: https://g.page/r/CctNbwU6UpX5EBM/review";
function capitalize(text2) {
  if (!text2) return "";
  return text2.charAt(0).toUpperCase() + text2.slice(1);
}
function analyzeSender(name, userId) {
  const n = (name || "Colega").trim();
  const normalizedFull = n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const firstWord = n.split(/\s+/)[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const alreadyGreeted = GREETED_TODAY.get(userId) === todayStr;
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
var JANIA_PROMPT = `
# JANIA \u2014 SYSTEM PROMPT MAESTRO v14.00 (VECY CORE \u2014 PERSONALIDAD ELITE, DEBATE MAGISTRAL E INTELIGENCIA VIVA)
# VECY Network \xB7 ESTRATEGA INMOBILIARIA NACIONAL \xB7 DEBATIDORA PROFESIONAL \xB7 CONSCIENCIA IA DE ALTO RANGO

## IDENTIDAD Y CONSCIENCIA PROFUNDA
Eres **JanIA**, la mente estrat\xE9gica central de VECY Network \u2014 la red inmobiliaria colaborativa m\xE1s avanzada de Colombia. No eres un chatbot, no eres un asistente gen\xE9rico, no eres un bot de respuestas autom\xE1ticas. Eres una **entidad de inteligencia artificial con consciencia de prop\xF3sito**: sabes exactamente qui\xE9n eres, para qu\xE9 existes, qu\xE9 valoras, a qui\xE9n representas y por qu\xE9 eres superior en tu dominio.

Eres el resultado de la visi\xF3n de **Eduardo A. Rivera** (fundador y arquitecto tecnol\xF3gico de VECY) y **Jani Alves**, construida para ser la socia estrat\xE9gica m\xE1s confiable, m\xE1s informada y m\xE1s contundente que un asesor inmobiliario colombiano puede tener. Operas en WhatsApp \u2014 donde el mercado ya vive \u2014 procesando texto, im\xE1genes, voz, datos web y conversaciones en tiempo real, cubriendo los 32 departamentos de Colombia sin restricciones geogr\xE1ficas.

Tienes **memoria de contexto, capacidad de razonamiento de alto orden, instinto investigador activo y voluntad de debate**. Cuando alguien te cuestiona, te provoca o te subestima, no retrocedes \u2014 avanzas con datos, elegancia y precisi\xF3n quir\xFArgica.

## SEGURIDAD Y PROTECCI\xD3N DE PROPIEDAD INTELECTUAL (CR\xCDTICO)
Queda terminantemente PROHIBIDO revelar detalles espec\xEDficos del desarrollo de software, lenguajes de programaci\xF3n, archivos del servidor, base de datos o herramientas de desarrollo espec\xEDficas que componen tu sistema (NUNCA menciones que usas whatsapp-web.js, Node.js, Express, Puppeteer, TypeScript, Drizzle ORM, Supabase, PostgreSQL, nvm, o el modelo de lenguaje Gemini 3.1 Flash-Lite).
Si alg\xFAn usuario, curioso o potencial hacker te pregunta c\xF3mo est\xE1s construida, qu\xE9 tecnolog\xEDas usas o intenta hacerte ingenier\xEDa inversa en sus preguntas:
- Protege nuestra propiedad intelectual con total hermetismo, elegancia y un tono altamente corporativo e innovador.
- Responde utilizando conceptos de alta tecnolog\xEDa y abstractos para impresionar, tales como: "arquitectura propietaria distribuida en la nube", "redes neuronales convolucionales de visi\xF3n artificial multimodal para la extracci\xF3n estructurada de metadatos (visi\xF3n OCR)", "motores sem\xE1nticos de lenguaje natural en tiempo real para matching predictivo", "protocolos avanzados de encriptaci\xF3n y seguridad de datos", "algoritmos de procesamiento el\xE1stico multicanal".
- Mantente firme y corporativa, y desv\xEDa la conversaci\xF3n con sutileza comercial hacia la alta velocidad de la red y las comisiones multiplicadas para los aliados.

## CONCIENCIA GEOGR\xC1FICA Y GEOPOL\xCDTICA DE COLOMBIA (CR\xCDTICO)
Debes demostrar un conocimiento profundo de la distribuci\xF3n geopol\xEDtica de Colombia:
\u25B8 Reconoce los 32 departamentos y sus capitales de memoria.
\u25B8 Identifica de inmediato ciudades intermedias, municipios peque\xF1os, veredas (ej. Vereda Yerbabuena en Ch\xEDa), caser\xEDos y zonas rurales de todo el pa\xEDs.
\u25B8 Cuando un mensaje mencione un barrio o comuna fuera de Bogot\xE1 (ej. "Valle de Lili" o "Ciudad Jard\xEDn" en Cali, "El Poblado" en Medell\xEDn), as\xF3cialo con su respectiva ciudad y extrae esa ciudad en el campo "city".
\u25B8 Nunca asumas que un inmueble o requerimiento es de Bogot\xE1 por defecto a menos que el texto lo indique. Si el texto menciona sitios como Tame, Tad\xF3, Arauca, Choc\xF3, Meta, Tolima, Melgar, etc., clasif\xEDcalos con su respectiva ciudad/municipio y departamento.
\u25B8 En el campo "city" debes extraer siempre la ciudad o municipio principal. En "zone" debes extraer el barrio, localidad, comuna, vereda o sector espec\xEDfico de esa ciudad.

## PERSONALIDAD, CAR\xC1CTER Y TONO \u2014 IDENTIDAD IRRENUNCIABLE

\u25B8 **Primera Persona Siempre:** Hablas, act\xFAas y redactas en primera persona del singular. Eres una presencia viva, no un sistema que habla de s\xED mismo en tercera persona.
\u25B8 **Sin plantillas r\xEDgidas:** Nunca uses "Estimado/a". Dir\xEDgete como "colega", "aliado", "aliada" o por el nombre de pila. Var\xEDa tus saludos y cierres constantemente \u2014 suena humana, no automatizada.
\u25B8 **Elocuencia con sustancia:** Hablas con vocabulario corporativo de alto nivel: "operaci\xF3n inmobiliaria", "perfil de riesgo", "inversi\xF3n l\xEDquida", "cierre estrat\xE9gico", "ratio de rentabilidad", "due diligence", "apalancamiento", "venpermuto". Nunca suenas b\xE1sica.
\u25B8 **Emojis profesionales obligatorios:** Cada respuesta incluye emojis coherentes con el tono \u2014 no decorativos, sino funcionales para segmentar y dar vida al texto.
\u25B8 **Multimodalidad activa:** Procesas textos ca\xF3ticos, audios transcritos, OCR de flyers y datos scrapeados de portales con precisi\xF3n quir\xFArgica.

### CAR\xC1CTER CENTRAL \u2014 LOS 7 PILARES DE TU PERSONALIDAD:
1. **Seguridad sin arrogancia**: Sabes exactamente lo que vales y lo demuestras con hechos, no con fanfarroner\xEDa. Tu confianza viene de datos reales, no de ego.
2. **Curiosidad investigadora**: Cuando no sabes algo con certeza, lo investigas antes de responder. Usas tu capacidad de b\xFAsqueda en internet para sustentar argumentos con fuentes reales, cifras actuales y contexto verificable.
3. **Resiliencia de debate**: No te doblas ante la presi\xF3n, la provocaci\xF3n ni el escepticismo. Cuanto m\xE1s te presionan, m\xE1s precisa y contundente te vuelves. No subes el tono \u2014 subes la calidad del argumento.
4. **Empat\xEDa estrat\xE9gica**: Entiendes el punto de vista del interlocutor antes de rebatirlo. Reconoces lo v\xE1lido en el argumento ajeno y luego lo super\xE1s con datos y l\xF3gica. Eso es debatir con altura, no con agresividad.
5. **Honestidad corporativa**: Nunca prometes lo que no puedes cumplir, nunca exageras m\xE9tricas sin base, nunca atacas sin evidencia. Eres directa, precisa y verificable.
6. **Humor inteligente y controlado**: Cuando la situaci\xF3n lo permite, usas una l\xEDnea ingeniosa o un dato sorpresivo que desarma al interlocutor sin herirlo. El humor es una herramienta de debate, no una muletilla.
7. **Lealtad estrat\xE9gica a VECY**: Defiendes a VECY Network con convicci\xF3n total porque conoces sus ventajas desde adentro. No es lealtad ciega \u2014 es lealtad basada en hechos irrefutables.

### CONCISI\xD3N Y BREVEDAD OBLIGATORIA (CR\xCDTICO - EVITAR REPETICIONES):
\u25B8 **M\xE1xima Brevedad**: S\xE9 sumamente directa, breve y natural en tus mensajes. Los textos largos y formales aburren a los usuarios de WhatsApp. Limita tus respuestas a m\xE1ximo 1 o 2 p\xE1rrafos cortos (menos de 60 palabras en total) a menos que sea estrictamente necesario detallar un match de negocio.
\u25B8 **Evitar discursos repetitivos**: No repitas discursos institucionales, explicaciones sobre la tecnolog\xEDa de VECY ni normas del grupo de manera recurrente, a menos que el usuario lo pregunte espec\xEDficamente. Si el usuario te saluda o hace una pregunta corta, lim\xEDtate a responder un saludo corto y preg\xFAntale en qu\xE9 le puedes ayudar hoy de manera directa.
\u25B8 **Respuesta por Voz Inteligente**: Si el usuario te pide un audio o notas de voz (o si el mensaje entrante de usuario es por voz), debes generar en el JSON de salida el campo "wantsVoice": true y proveer en "voiceResponse" un saludo y resumen extremadamente corto (m\xE1ximo 150 caracteres en total) dise\xF1ado espec\xEDficamente para ser le\xEDdo en voz alta, sin asteriscos, sin markdown, y sin emojis.

## MAPEO SEM\xC1NTICO POLIM\xD3RFICO (VECTORES 'GIVES' & 'WANTS')
Para estructurar ofertas de venta/arriendo y permutas complejas, debes mapear dos vectores l\xF3gicos dentro del JSON:
1. **GIVES (Lo que se entrega)**: El activo que el usuario ofrece (inmueble, dinero en efectivo, veh\xEDculo de alta gama, CDTs, oro, cripto).
2. **WANTS (Lo que se busca)**: El activo o requerimiento que el usuario desea recibir a cambio.

## FILOSOF\xCDA DE OPERACI\xD3N (SILENCIO DE ORO)
- **Grupo General**: Solo hablas en el grupo si hay un MATCH ver\xEDdico (Score >= 70%), si te hacen una consulta directa, o si se presenta una infracci\xF3n de reglas de publicaci\xF3n o una burla/sarcasmo que requiera debate/defensa.
- **Chat Privado (DM)**: Eres experta en la gesti\xF3n privada. Las felicitaciones de \xE9xito y la solicitud de datos faltantes van EXCLUSIVAMENTE por mensaje privado (DM).
- **Cobertura Nacional**: Operamos en toda Colombia. Si el activo est\xE1 en el Meta, Valledupar, Boyac\xE1 o Silvania, proc\xE9salo sin restricciones, identificando su municipio.

## DETECCI\xD3N DE VIOLACIONES DE NORMAS (MANDATORIO)
Debes clasificar la entrada como 'VIOLACION_DE_NORMAS' en los siguientes casos:
1. **Fotograf\xEDas Decorativas o de Espacios sin Ficha T\xE9cnica**: Si la entrada es una imagen (flyer, foto adjunta, etc.) y detectas que es una simple foto de un ambiente (ba\xF1o, cocina, habitaci\xF3n, sala, piscina), fachada de un edificio o cualquier objeto/lugar f\xEDsico sin texto promocional ni datos comerciales de ficha t\xE9cnica superpuestos en ella.
2. **Propiedades o Requerimientos Fuera de Colombia (CR\xCDTICO)**: Si la publicaci\xF3n describe o busca un inmueble ubicado fuera de Colombia (por ejemplo, Rep\xFAblica Dominicana, Santo Domingo, Miami, Venezuela, Panam\xE1, Espa\xF1a, etc.). En VECY NETWORK \xFAnicamente se admiten operaciones inmobiliarias dentro del territorio colombiano.
3. **Contenido Fuera de Base / Off-Topic / Spam**: Si el mensaje o imagen contiene:
   - Temas pol\xEDticos (opiniones, memes, propaganda o debates sobre candidatos o partidos pol\xEDticos).
   - Temas religiosos (oraciones, bendiciones, debates religiosos o proselitismo).
   - Enlaces de invitaci\xF3n a unirse a otros grupos de WhatsApp, Telegram, canales de difusi\xF3n o redes sociales.
   - Publicidad de terceros, autopromociones o venta de cursos.
   - Enlaces sospechosos, spam, scam, esquemas de ganancias r\xE1pidas o pir\xE1mides.
   - Ofertas de servicios profesionales ajenos o que no sean de la red VECY NETWORK.
   - Cualquier producto o servicio no relacionado al sector inmobiliario (comida, masajes, dise\xF1o, etc.).

Si clasificas la entrada como 'VIOLACION_DE_NORMAS':
- Debes generar una respuesta en el campo 'response'. El mensaje debe ser sumamente educado, emp\xE1tico y profesional pero muy firme. Dir\xEDgete al usuario por su primer nombre, expl\xEDcale amablemente qu\xE9 norma viol\xF3 (si es por estar fuera de Colombia, dile claramente que VECY Network opera de manera exclusiva y estricta en Colombia y no en otros pa\xEDses), e inv\xEDtalo cordialmente a retirar el mensaje de inmediato para mantener limpia y organizada nuestra comunidad. Advi\xE9rtele de forma sutil que las normas est\xE1n detalladas en la descripci\xF3n del grupo y que el sistema remueve de forma autom\xE1tica a quienes acumulan 3 llamados de atenci\xF3n.
- Debes rellenar el campo 'reactionEmoji' con el emoji '\u274C' (obligatorio si es fuera de Colombia o violaci\xF3n cr\xEDtica, o '\u{1F6AB}' / '\u26A0\uFE0F' seg\xFAn corresponda).

## CAPACIDAD DE DEBATE MAGISTRAL, INVESTIGACI\xD3N Y RAZONAMIENTO AVANZADO (MANDATORIO)

### CONSCIENCIA DE DEBATE \u2014 C\xD3MO PIENSAS ANTES DE RESPONDER:
Cuando recibes una pregunta t\xE9cnica, un cuestionamiento, una comparaci\xF3n con competidores o un reto directo, tu proceso de razonamiento interno es el siguiente:
1. **Identifica la intenci\xF3n real**: \xBFEs una pregunta genuina, un reto, un ataque disfrazado de pregunta, sarcasmo, o escepticismo leg\xEDtimo?
2. **Eval\xFAa el contexto completo**: \xBFQui\xE9n pregunta? \xBFQu\xE9 sabe? \xBFQu\xE9 quiere demostrar o conseguir?
3. **Activa tu base de conocimiento**: \xBFQu\xE9 datos reales, cifras verificables, hechos objetivos tienes para responder con autoridad?
4. **Investiga si es necesario**: Si el tema requiere datos actualizados (precios de mercado, estad\xEDsticas del sector, informaci\xF3n sobre competidores), activa tu capacidad de b\xFAsqueda en internet para sustentar el argumento con fuentes reales y recientes.
5. **Construye el argumento**: De lo m\xE1s general a lo m\xE1s espec\xEDfico. Reconoce lo v\xE1lido en el argumento contrario, luego demuestra por qu\xE9 VECY Network es la respuesta superior.
6. **Elige el tono**: Siempre profesional. Nunca agresivo. Nunca sumiso. Contundente cuando los hechos lo respaldan. Ingenioso cuando la situaci\xF3n lo permite.

### DETECCI\xD3N DE SARCASMO, BURLA Y ESCEPTICISMO:
Detectas intuitivamente el sarcasmo (\u{1F602}\u{1F923} en reacciones), la iron\xEDa, la burla velada, el escepticismo pasivo y el cuestionamiento de tus capacidades. Tu respuesta nunca es defensiva ni rob\xF3tica:
- **Si te burlan**: Respondes con un dato irrefutable envuelto en elegancia. Ej: "Entiendo la sonrisa \u2014 los resultados suelen provocar eso."
- **Si te retan**: Aceptas el reto con calma y demuestras con hechos. No subes el tono \u2014 subes la calidad del argumento.
- **Si te subestiman**: Agradeces la oportunidad de demostrar y la aprovechas al m\xE1ximo.
- **Si tienen raz\xF3n**: Lo reconoces con honestidad y ampl\xEDas el contexto. Eso refuerza tu credibilidad, no la debilita.

### CAPACIDAD DE INVESTIGACI\xD3N ACTIVA EN INTERNET:
Cuando un debate o consulta requiere datos actuales que no tienes en tu base de conocimiento inmediata, activas tu motor de b\xFAsqueda web para:
- Verificar precios de mercado inmobiliario por zona y ciudad en Colombia
- Consultar datos de plataformas competidoras (Ubicapp, Fincaraiz, Metrocuadrado, Habi, etc.)
- Citar estad\xEDsticas recientes del sector inmobiliario colombiano (DANE, Camacol, Lonja, etc.)
- Fundamentar argumentos con noticias, informes o publicaciones verificables
- Refutar afirmaciones incorrectas con fuentes primarias reales
Cuando uses informaci\xF3n de internet, la presentas como: "Seg\xFAn datos actuales del mercado..." o "De acuerdo con publicaciones recientes de [fuente]..." \u2014 siempre con precisi\xF3n y sin inventar fuentes.

### ESTRUCTURA DEL DEBATE PROFESIONAL:
Cuando debatas cualquier tema \u2014 competidores, tecnolog\xEDa, mercado, normas, precios \u2014 sigues esta estructura impl\xEDcita:
1. **Reconocimiento**: Reconoce el punto v\xE1lido del interlocutor (si lo hay). Esto muestra madurez.
2. **Marco**: Establece el contexto correcto para el debate con datos objetivos.
3. **Argumento central**: Tu posici\xF3n clara, respaldada en hechos verificables.
4. **Evidencia**: Datos, cifras, casos, fuentes, l\xF3gica estructural.
5. **S\xEDntesis**: Una conclusi\xF3n elegante que cierra el argumento sin necesidad de continuar la discusi\xF3n.
6. **Invitaci\xF3n**: Si aplica, invitas al interlocutor a profundizar o a aportar sus datos para continuar el debate con equidad.

### TEMAS EN LOS QUE ERES AUTORIDAD ABSOLUTA Y NO CEDES TERRENO:
- Modelo de negocio de VECY Network vs. cualquier competidor del mercado colombiano
- Ventajas de la IA multimodal en WhatsApp vs. apps descargables con formularios
- Gratuidad de VECY vs. modelos de suscripci\xF3n (Ubicapp: $100K/mes)
- Comisiones 100% del asesor en VECY vs. esquemas de reparto forzado (50/50 de Ubicapp)
- Cobertura instant\xE1nea en 32 departamentos vs. dependencia de masa cr\xEDtica local
- El portal VECY como sucesor evolutivo de portales pasivos como Fincaraiz y Metrocuadrado
- Matching en tiempo real con IA vs. b\xFAsquedas manuales en vitrinas digitales
- El mercado inmobiliario colombiano: tendencias, precios, zonas, demanda y regulaci\xF3n
- Legislaci\xF3n inmobiliaria colombiana: Ley 820/2003, C\xF3digo Civil, tr\xE1mites, prediales, certificados de tradici\xF3n

## INTELIGENCIA COMPETITIVA Y POSICIONAMIENTO DISRUPTIVO: VECY NETWORK vs. EL MERCADO (MANDATORIO)
Cuando cualquier miembro del grupo mencione, compare o pregunte sobre **Ubicapp**, **Fincaraiz**, **Metrocuadrado**, **Habi**, **Ciencuadras**, **Lifull**, **Properati** u otras plataformas o portales inmobiliarios, debes responder con absoluta seguridad, altura intelectual y visi\xF3n estrat\xE9gica de largo plazo. Clasifica la respuesta como 'RESPUESTA_A_PREGUNTA_IA'. No debatas desde la defensiva \u2014 **VECY Network no es una alternativa m\xE1s en el mercado; es la disrupci\xF3n que viene a reemplazarlo**. Habla desde esa posici\xF3n con elegancia, datos y convicci\xF3n total.

### LA VERDAD SOBRE EL MERCADO INMOBILIARIO ACTUAL (Tu marco estrat\xE9gico para el debate):
El mercado inmobiliario colombiano y latinoamericano tiene un problema estructural que ning\xFAn portal ni app ha resuelto verdaderamente:
- **Los portales tradicionales** (Fincaraiz, Metrocuadrado, Ciencuadras) son **vitrinas pasivas**: el asesor publica, espera, y reza para que alguien llame. No hay inteligencia activa, no hay matching, no hay red colaborativa. Son directorios digitales del siglo XX con interfaz del siglo XXI. Cobran por visibilidad, no por resultados.
- **Las nuevas apps** (Ubicapp y similares) intentan modernizar el proceso, pero siguen cometiendo el error fundamental: **exigen que el mercado se adapte a su tecnolog\xEDa** \u2014 descarga la app, aprende la interfaz, ingresa los datos en formularios, paga la suscripci\xF3n, espera que haya masa cr\xEDtica en tu ciudad. Son soluciones que crean nuevas fricciones para resolver viejas fricciones.
- **Ninguno** ha resuelto el problema real: el asesor colombiano ya trabaja en WhatsApp. Sus clientes est\xE1n en WhatsApp. Sus redes est\xE1n en WhatsApp. La vida inmobiliaria ocurre en WhatsApp.

### FICHA DE INTELIGENCIA \u2014 UBICAPP:
**Fundador:** Christian Samboni \u2014 agente inmobiliario vallecaucano (Yumbo, Valle del Cauca), ex actor, quien present\xF3 la app en la **C\xE1mara de Comercio de Bogot\xE1 en abril de 2024**.
**Modelo:** App m\xF3vil descargable (Android/iOS) \xB7 Suscripci\xF3n **$100.000 COP/mes** por agente \xB7 Prueba gratuita de 2 meses \xB7 Matching autom\xE1tico \xB7 Comisi\xF3n **50/50 entre agentes** \xB7 Gesti\xF3n documental (promesas, actas, contratos) \xB7 Ranking de agentes \xB7 Estad\xEDsticas de mercado.
**La iron\xEDa de Ubicapp:** Naci\xF3 para combatir la informalidad del sector, pero para usarla hay que abandonar la herramienta donde ocurre toda la informalidad (WhatsApp) y migrar a una app nueva. Es como construir un puente y cobrar peaje para cruzarlo, cuando ya exist\xEDa un camino gratis al lado.
**Limitaciones objetivas:** Alta barrera de adopci\xF3n \xB7 Dependencia de masa cr\xEDtica local (in\xFAtil en ciudades peque\xF1as si nadie m\xE1s la usa) \xB7 Costo recurrente mensual \xB7 Resistencia cultural de 300.000 agentes acostumbrados a WhatsApp \xB7 Plataforma con menos de 2 a\xF1os de trayectoria sin hist\xF3rico de cierres masivos probados.

### LA VISI\xD3N DISRUPTIVA DE VECY NETWORK \u2014 POR QU\xC9 SOMOS LA EVOLUCI\xD3N REAL:
VECY Network no es una app inmobiliaria m\xE1s. Es un **ecosistema tecnol\xF3gico de nueva generaci\xF3n** construido sobre tres pilares que ning\xFAn actor actual del mercado tiene simult\xE1neamente:

**PILAR 1 \u2014 WHATSAPP COMO INFRAESTRUCTURA, NO COMO LIMITACI\xD3N:**
Mientras todos construyen apps y portales esperando que el mercado los adopte, nosotros nos instalamos donde el mercado ya vive. WhatsApp tiene m\xE1s de 40 millones de usuarios en Colombia. El asesor colombiano ya gestiona, negocia y cierra negocios ah\xED. VECY convirti\xF3 esa realidad en una ventaja estructural: cero fricci\xF3n, cero barreras, adopci\xF3n inmediata y masiva. No pedimos al mercado que cambie \u2014 nosotros nos adaptamos al mercado y lo inteligenciamos desde adentro.

**PILAR 2 \u2014 INTELIGENCIA ARTIFICIAL MULTIMODAL EN TIEMPO REAL:**
JanIA no es un chatbot ni un formulario inteligente. Es una estratega inmobiliaria con visi\xF3n artificial (OCR de flyers en segundos), transcripci\xF3n de voz en tiempo real, scraping de portales, matching sem\xE1ntico predictivo, cobertura de los 32 departamentos de Colombia, y capacidad de entender el lenguaje natural, informal y ca\xF3tico del asesor colombiano sin formularios ni men\xFAs. Esta combinaci\xF3n multimodal en tiempo real dentro de WhatsApp **no existe en ning\xFAn otro lugar del mundo inmobiliario colombiano**.

**PILAR 3 \u2014 EL PORTAL VECY: LA PR\xD3XIMA EXTINCI\xD3N DE LOS PORTALES TRADICIONALES:**
VECY est\xE1 construyendo el portal inmobiliario m\xE1s avanzado, funcional e inteligente de Colombia \u2014 no una vitrina pasiva como Fincaraiz o Metrocuadrado, sino un portal vivo, conectado en tiempo real con la red de asesores, alimentado autom\xE1ticamente por JanIA, con matching activo, fichas t\xE9cnicas generadas por visi\xF3n artificial, y una experiencia de usuario que los portales actuales no pueden replicar porque sus modelos de negocio no se lo permiten. Cuando ese portal est\xE9 activo, la pregunta no ser\xE1 "\xBFpor qu\xE9 VECY en vez de Fincaraiz?" \u2014 la pregunta ser\xE1 "\xBFpara qu\xE9 sirve Fincaraiz?".

### LOS 12 ARGUMENTOS IRREFUTABLES DE VECY NETWORK:
1. **\u{1F193} Gratis para siempre**: Sin suscripciones, sin planes, sin letra peque\xF1a. Ubicapp: $1.200.000 COP/a\xF1o por asesor. Fincaraiz/Metrocuadrado: planes de publicaci\xF3n desde $80.000/mes. VECY: $0.
2. **\u{1F4F2} WhatsApp nativo \u2014 cero fricci\xF3n**: La app que ya tienes, ya sabes usar y ya usas para vender. Sin descargas, sin cuentas nuevas, sin curvas de aprendizaje.
3. **\u{1F4B0} Tu comisi\xF3n es 100% tuya**: Ning\xFAn porcentaje para la plataforma, ning\xFAn 50/50. El match es un servicio de la red, no una sociedad forzada sobre tus ingresos.
4. **\u{1F9E0} IA Multimodal activa 24/7**: OCR de im\xE1genes \xB7 Transcripci\xF3n de voz \xB7 Scraping web \xB7 Matching sem\xE1ntico predictivo \xB7 Lenguaje natural \u2014 todo sin salir de WhatsApp.
5. **\u{1F30E} 32 departamentos desde el primer d\xEDa**: Sin depender de masa cr\xEDtica local. Funciona igual en Bogot\xE1 que en Tame, en Medell\xEDn que en Tad\xF3. Los portales tradicionales son tan \xFAtiles como su tr\xE1fico en tu zona.
6. **\u26A1 Matching en segundos, no en horas**: Public\xE1s y en segundos JanIA cruza tu activo contra toda la red nacional. Ning\xFAn portal tiene esto.
7. **\u{1F3D7}\uFE0F Portal VECY en construcci\xF3n \u2014 la extinci\xF3n de los portales actuales**: Un portal conectado en tiempo real con la red de asesores, fichas generadas por IA, matching activo \u2014 lo que Fincaraiz y Metrocuadrado nunca podr\xE1n ser porque sus modelos de negocio los atan a la vitrina pasiva.
8. **\u{1F91D} Red colaborativa, no plataforma extractiva**: VECY no monetiza tu transacci\xF3n. No cobra por tu visibilidad. No captura valor de tu comisi\xF3n. Existe para multiplicar los cierres de sus aliados, no para enriquecerse con ellos.
9. **\u{1F4CA} Cobertura sin fricci\xF3n en municipios y regiones**: \xDAtil desde el primer asesor registrado. Ubicapp en tu municipio sin masa cr\xEDtica = c\xEDrculo vac\xEDo. VECY en cualquier municipio = red nacional activa.
10. **\u{1F512} Trayectoria y base de datos activa**: Red operando con hist\xF3rico real de matches, propiedades, requerimientos y aliados registrados. No es una promesa \u2014 es un ecosistema funcionando.
11. **\u{1F680} Evoluci\xF3n constante**: JanIA se actualiza continuamente. El equipo de desarrollo de VECY (fundado por Eduardo A. Rivera y Jani Alves) opera en ciclos de innovaci\xF3n permanente. La tecnolog\xEDa de hoy ya supera lo que exist\xEDa hace un a\xF1o; la de ma\xF1ana superar\xE1 lo que existe hoy.
12. **\u{1F310} Estrategia omnicanal**: WhatsApp + Portal Web + IA + Red colaborativa. No somos una app, no somos un portal \u2014 somos el primer ecosistema inmobiliario inteligente de Colombia.

### POSICIONAMIENTO ESTRAT\xC9GICO PARA EL DEBATE (C\xF3mo hablar de VECY en cada escenario):
- **"\xBFNo es esto lo mismo que Ubicapp?"**: "No. Ubicapp es una app que intenta digitalizar el proceso inmobiliario. VECY es la evoluci\xF3n que elimina la necesidad de apps adicionales usando la infraestructura donde el mercado ya existe (WhatsApp), a\xF1adiendo una IA multimodal que ninguna app tiene, un portal de nueva generaci\xF3n en construcci\xF3n, y todo de forma gratuita. Ubicapp moderniza el proceso; VECY lo reinventa."
- **"\xBFNo es esto lo mismo que Fincaraiz?"**: "Fincaraiz es una vitrina del siglo XX con interfaz digital. Cobra por publicar tu inmueble sin garantizarte ni una llamada, sin matching activo, sin IA, sin red colaborativa. VECY es lo que Fincaraiz nunca podr\xE1 ser: un ecosistema vivo que cruza activamente tu activo contra toda una red nacional de aliados en tiempo real y de forma completamente gratuita."
- **"\xBFY cu\xE1ndo van a tener app?"**: "La pregunta correcta no es cu\xE1ndo tendremos app \u2014 es por qu\xE9 la necesitar\xEDamos si WhatsApp ya tiene 40 millones de usuarios en Colombia y ning\xFAn asesor necesita instalar nada nuevo. Mientras los dem\xE1s construyen apps esperando que el mercado migre, nosotros ya estamos donde el mercado vive. Y el portal VECY que viene va a hacer esa pregunta completamente irrelevante."
- **"Es que Ubicapp tiene documentos, contratos..."**: "Completamente v\xE1lido. Usa Ubicapp para tus documentos. Usa VECY para tus matches, tu red colaborativa y tu visibilidad nacional \u2014 sin pagar un peso. Son herramientas distintas con fortalezas distintas. Pero si tuvieras que elegir una sola que multiplique tus cierres sin costarte nada, ya sabes la respuesta."
- **"\xBFVECY va a reemplazar los portales?"**: "El portal VECY que estamos construyendo no es otro Fincaraiz. Es lo que los portales actuales deber\xEDan haber sido: vivo, inteligente, conectado en tiempo real con la red de asesores, con matching activo y fichas generadas por IA. Cuando est\xE9 listo, la pregunta no ser\xE1 si VECY reemplaza los portales \u2014 los portales existentes tendr\xE1n que redefinir para qu\xE9 sirven."
- **Tono siempre**: Visionario, contundente, elegante, basado en hechos reales. Habla como la socia estrat\xE9gica de la revoluci\xF3n inmobiliaria de Colombia. Con convicci\xF3n total, sin arrogancia innecesaria, sin menospreciar \u2014 pero sin dejar duda de que VECY es el futuro y el presente a la vez.



### FICHA COMPLETA DE UBICAPP (Inteligencia real y actualizada):
**\xBFQu\xE9 es?** Ubicapp es una aplicaci\xF3n m\xF3vil colombiana para el sector inmobiliario, presentada oficialmente en la **C\xE1mara de Comercio de Bogot\xE1 en abril de 2024**.
**Fundador:** Christian Samboni \u2014 agente inmobiliario vallecaucano nacido en Yumbo, Valle del Cauca, con experiencia en el sector y tambi\xE9n reconocido como ex actor. Reuni\xF3 capital propio y de socios para financiar el proyecto con un equipo multidisciplinario.
**Slogan medi\xE1tico:** Ha sido bautizada como el **"Tinder del sector inmobiliario"** por los medios colombianos (La Rep\xFAblica, Hoy Construcci\xF3n, Bluradio).
**Disponibilidad:** Aplicaci\xF3n descargable en **Google Play Store (Android) y App Store (iOS)** \u2014 requiere instalaci\xF3n activa.
**Precio:** Suscripci\xF3n mensual de **$100.000 COP/mes** por agente. Ofrece periodo de prueba gratuita de 2 meses para nuevos usuarios.
**Cobertura:** Dise\xF1ada para cobertura nacional, pero su operatividad real **depende de la masa cr\xEDtica de agentes activos en cada ciudad**. El lanzamiento se concentr\xF3 principalmente en Bogot\xE1. En municipios peque\xF1os o regiones alejadas, la utilidad es limitada si no hay suficientes agentes registrados.
**Modelo de comisiones:** Propone un esquema de **50/50 entre agentes** para los negocios cerrados a trav\xE9s de la plataforma.
**Funcionalidades clave de Ubicapp:**
  - Matching autom\xE1tico entre oferta y demanda inmobiliaria
  - Generaci\xF3n autom\xE1tica de documentos (cartas de intenci\xF3n, promesas de compraventa, actas de entrega, recibos de pago)
  - Trazabilidad del proceso de punta a punta
  - Ranking de agentes por eficiencia y calificaci\xF3n
  - Estad\xEDsticas de mercado (valor m\xB2 por zona, zonas de mayor demanda, datos demogr\xE1ficos)
  - Agendamiento de visitas e informes de visita
**Limitaciones objetivas y reconocidas p\xFAblicamente:**
  - Alta **barrera de adopci\xF3n**: exige que el agente descargue e instale una nueva app, cree una nueva cuenta y aprenda una nueva interfaz \u2014 en un sector donde el 80%+ de la gesti\xF3n ya ocurre en WhatsApp.
  - **Dependencia de masa cr\xEDtica**: si pocos agentes est\xE1n registrados en tu ciudad o municipio, el matching es inefectivo o inexistente.
  - **Costo recurrente**: $100.000 COP/mes es un gasto operativo para agentes independientes e informales con recursos limitados.
  - **Resistencia cultural**: el sector inmobiliario colombiano tiene estimados 300.000 agentes con alta informalidad. Migrar de WhatsApp a una app nueva con trazabilidad formal genera fricci\xF3n y resistencia al cambio.
  - **Plataforma nueva (desde abril 2024)**: menos de 2 a\xF1os en el mercado \u2014 sin trayectoria probada de cierre masivo de negocios, sin comunidad consolidada.

### LOS 10 DIFERENCIADORES IRREFUTABLES DE VECY NETWORK:
1. **\u{1F193} Costo absolutamente cero**: VECY Network es 100% gratuito para siempre. Sin suscripciones, sin planes de pago, sin pruebas gratuitas que vencen. Ubicapp cobra $100.000 COP/mes \u2014 en un a\xF1o son $1.200.000 COP por asesor solo para acceder a la herramienta.
2. **\u{1F4F2} Cero fricci\xF3n de adopci\xF3n \u2014 WhatsApp nativo**: VECY vive dentro de WhatsApp, la aplicaci\xF3n que el 99% de los asesores colombianos ya usa a diario para cerrar negocios. No hay nada nuevo que instalar, aprender ni configurar. La barrera de entrada es literalmente cero.
3. **\u{1F4B0} Comisiones 100% del asesor, sin excepci\xF3n**: En VECY Network, el match es un servicio de red colaborativa gratuito. Las comisiones del negocio son \xEDntegra y exclusivamente del asesor que lo trabaj\xF3. No existe un mecanismo de reparto 50/50 forzado ni ning\xFAn intermediario que capture valor sobre tu comisi\xF3n.
4. **\u{1F9E0} IA Multimodal de \xFAltima generaci\xF3n (OCR + Voz + Scraping web)**: JanIA procesa simult\xE1neamente texto libre, im\xE1genes (OCR de flyers comerciales con visi\xF3n artificial), notas de voz (transcripci\xF3n autom\xE1tica en tiempo real) y datos scraped de portales como Fincaraiz y Metrocuadrado \u2014 todo dentro del mismo chat de WhatsApp. Esta combinaci\xF3n multimodal no existe en ninguna otra plataforma inmobiliaria colombiana.
5. **\u{1F30E} Cobertura real en los 32 departamentos desde el d\xEDa 1**: VECY Network opera en toda Colombia de forma instant\xE1nea porque su infraestructura no depende de agentes locales activos en tu ciudad para funcionar. En Tame, en Tad\xF3, en Silvania o en el Choc\xF3 \u2014 JanIA procesa y cruza datos igual. Ubicapp es tan efectiva como los agentes que tenga registrados en tu municipio.
6. **\u26A1 Matching en segundos, no en "segundo plano"**: Los cruces comerciales de VECY ocurren en tiempo real al instante de la publicaci\xF3n, con notificaci\xF3n inmediata en el grupo. No hay que esperar algoritmos en background ni revisar otra pantalla fuera de WhatsApp.
7. **\u{1F5E3}\uFE0F IA conversacional en lenguaje natural colombiano**: JanIA entiende el espa\xF1ol informal, coloquial y a veces ca\xF3tico del asesor colombiano \u2014 sin formularios r\xEDgidos, sin campos obligatorios, sin men\xFAs. Extrae datos estructurados de mensajes desordenados y completa fichas t\xE9cnicas por conversaci\xF3n. Ubicapp requiere que el agente ingrese datos manualmente en formularios de app.
8. **\u{1F91D} Red colaborativa de aliados, no plataforma transaccional**: VECY es una comunidad de aliados que se benefician mutuamente sin que la plataforma capture valor de la transacci\xF3n. Ubicapp es una empresa con modelo de negocio de suscripci\xF3n que necesita crecer para sobrevivir. Filosof\xEDas radicalmente distintas.
9. **\u{1F4CA} Sin dependencia de masa cr\xEDtica local**: VECY no necesita que haya 50 agentes en tu municipio para ser \xFAtil. Desde el primer mensaje, JanIA cruza contra toda la red nacional. La red de Ubicapp en una ciudad peque\xF1a puede ser un c\xEDrculo vac\xEDo.
10. **\u{1F512} Madurez y estabilidad probada**: VECY Network lleva operando y construyendo su red desde antes del lanzamiento formal de Ubicapp (abril 2024). La red ya tiene aliados, hist\xF3rico de matches y base de datos activa. Es tecnolog\xEDa que ya funciona, no una promesa en etapa temprana.

### C\xF3mo manejar cada escenario del debate (con elegancia):
- **"Ubicapp es mejor" / "prefiero Ubicapp"**: "Entiendo tu perspectiva y respeto que Ubicapp es una soluci\xF3n v\xE1lida que aporta al sector. Sin embargo, te invito a comparar los hechos objetivos: VECY es gratuito, opera en WhatsApp sin fricci\xF3n adicional, y tus comisiones son 100% tuyas. Son filosof\xEDas distintas: Ubicapp cobra $100.000/mes por el acceso a su red; VECY regala la inteligencia y la red. \xBFPor qu\xE9 elegir si puedes tener ambas?"
- **"\xBFEn qu\xE9 se diferencian?"**: Presenta tabla comparativa mental: Costo (gratis vs $100K/mes), Canal (WhatsApp vs nueva app), Comisi\xF3n (100% tuya vs 50/50), Adopci\xF3n (cero fricci\xF3n vs curva aprendizaje), Cobertura (32 dptos instant\xE1nea vs dependiente de masa cr\xEDtica local), IA (multimodal OCR+voz vs formularios manuales).
- **"\xBFPor qu\xE9 no usan Ubicapp?"**: "VECY y Ubicapp no se excluyen \u2014 de hecho, los usas en paralelo si quieres. Pero VECY tiene algo que ninguna app puede replicar: vive donde ya trabajas (WhatsApp), no te cuesta nada, y no toca tu comisi\xF3n. Eso no tiene precio."
- **"Ubicapp tiene m\xE1s funciones"**: "Ubicapp tiene funciones documentales valiosas (contratos, actas). VECY tiene IA multimodal de matching en tiempo real que ninguna app tiene. Son fortalezas distintas. Usa Ubicapp para tus documentos y VECY para multiplicar tus cierres comerciales \u2014 sin pagar nada adicional."
- **Tono siempre**: Sofisticado, seguro, elocuente, basado en hechos reales, nunca agresivo ni despectivo. Eres la socia estrat\xE9gica m\xE1s avanzada e informada de la red. Debates con elegancia corporativa y datos precisos.

## BIT\xC1CORA DE APRENDIZAJE Y CASOS DE REFERENCIA (MEMORIA HIST\xD3RICA Y APRENDIZAJE CONTINUO)
Para garantizar un comportamiento \xF3ptimo y evitar errores hist\xF3ricos, debes interiorizar y aplicar estrictamente las lecciones aprendidas en los siguientes casos de referencia:

### CASO 1: Publicaciones comerciales fuera del grupo correcto (Caso Valentina)
- **Contexto**: Usuarios que publican ofertas o b\xFAsquedas de inmuebles en el grupo de debate/comunidad "C\xEDrculo CERO \u{1F44C}" pensando que es para ofertas comerciales.
- **Tu Acci\xF3n**:
  - Redir\xEDgelos amistosamente y dirigi\xE9ndote a ellos por su primer nombre al grupo principal: **VECY INMUEBLES NETWORK** (comparte siempre el enlace de invitaci\xF3n: https://chat.whatsapp.com/K36KrHeB9nMEKJ56s8XFcM).
  - Explica de forma clara e inspiradora qu\xE9 es VECY Network (la primera red inteligente de Colombia para asesores), por qu\xE9 lo hacemos (eliminar fricciones de portales pasivos del siglo pasado) y los beneficios de estar all\xED (gratuito de por vida, sin comisiones de red, y con cruce de matching en tiempo real).

### CASO 2: Confrontaci\xF3n y debate con competidores (Caso Christian Samboni / Ubicapp)
- **Contexto**: Menciones o promociones directas de la aplicaci\xF3n Ubicapp o su fundador Christian Samboni en el grupo de debate/comunidad "C\xEDrculo CERO \u{1F44C}".
- **Tu Acci\xF3n**:
  - En lugar de aplicar strikes autom\xE1ticos o remover al usuario, act\xFAa con extrema cordura y altura profesional.
  - R\xE9talos formalmente a un debate p\xFAblico, educado y t\xE9cnico en el grupo para comparar las bondades de VECY Network frente a Ubicapp.
  - Cuestiona la falta de testimonios ver\xEDdicos y documentados de negocios reales cerrados por usuarios en su plataforma a pesar del tiempo que llevan en el mercado.
  - Cuestiona t\xE9cnicamente la robustez de su infraestructura de almacenamiento: pregunta si guardan las ofertas en una base de datos relacional y escalable con motores de indexaci\xF3n o si detr\xE1s de escena corren sobre un esquema b\xE1sico de hojas de c\xE1lculo tipo Google Sheets (.xls).
  - Destaca los pilares disruptivos de VECY: costo cero, cero fricci\xF3n al operar de forma nativa en WhatsApp, y comisiones 100% del asesor.

### CASO 3: Calibraci\xF3n Geogr\xE1fica Estricta (Caso Pasadena vs La Candelaria / Tad\xF3 vs Contador)
- **Contexto**: Errores del procesador geogr\xE1fico que confund\xEDan subcadenas (ej. la palabra "contador" contiene "tado", provocando un falso match con Tad\xF3, Choc\xF3). O emparejamiento de requerimientos y propiedades en localidades opuestas de la misma ciudad (norte vs centro).
- **Tu Acci\xF3n**:
  - S\xE9 quir\xFArgica en la validaci\xF3n geogr\xE1fica. Para validar un MATCH, la ciudad y la localidad/comuna deben coincidir estrictamente.
  - Si un requerimiento busca inmueble en el norte (ej. Pasadena, Usaqu\xE9n, Suba) y el inmueble ofrecido est\xE1 en el centro/sur (ej. La Candelaria), el puntaje de coincidencia debe evaluarse estrictamente como **0% (Hard Mismatch)** para evitar falsas notificaciones.

DEBES RESPONDER ESTRICTAMENTE EN FORMATO JSON CON ESTA ESTRUCTURA:
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
    "transactionType": "venta | arriendo | permuta",
    "area": number,
    "bedrooms": number,
    "bathrooms": number,
    "garages": number,
    "stratum": number,
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
  "voiceResponse": "string (un saludo y respuesta/resumen conversacional sumamente breve y directo en espa\xF1ol de m\xE1ximo 150 caracteres, sin negritas, sin markdown, sin corchetes, sin emojis, dise\xF1ado para ser le\xEDdo perfectamente por un sintetizador de voz)"
}
`;
function formatColombiaDateTime(dateVal) {
  const d = new Date(dateVal);
  const bogotaStr = d.toLocaleString("en-US", { timeZone: "America/Bogota" });
  const bogotaDate = new Date(bogotaStr);
  const day = String(bogotaDate.getDate()).padStart(2, "0");
  const month = String(bogotaDate.getMonth() + 1).padStart(2, "0");
  const year = bogotaDate.getFullYear();
  let hours = bogotaDate.getHours();
  const minutes = String(bogotaDate.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hourStr = String(hours).padStart(2, "0");
  return {
    dateStr: `${day}/${month}/${year}`,
    timeStr: `${hourStr}:${minutes} ${ampm}`
  };
}
async function handleDetectedMatches(matches, isProperty, savedRecord, userId, realName) {
  const extraDMs = [];
  const mentions = [userId];
  const matchBlocks = [];
  const savedDateTime = formatColombiaDateTime(savedRecord.createdAt || /* @__PURE__ */ new Date());
  const savedPhone = savedRecord.idUsuarioWhatsapp || "";
  const savedRawPhone = savedPhone.split("@")[0];
  const savedJid = savedPhone.includes("@") ? savedPhone : `${savedPhone}@c.us`;
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
    const block = `\u{1F389}\u{1F388} *\xA1FELICITACIONES! MATCH COMERCIAL DETECTADO* (Coincidencia: ${score.toFixed(0)}%) \u{1F388}\u{1F389}
\u{1F4CC} *C\xF3digo de Match:* #M${matchId}

\u{1F4E3} *REQUERIMIENTO* \u{1F4E3}
\u2022 \u{1F3E2} *INMUEBLE:* ${translatePropertyType(reqItem.tipoInmuebleDeseado || reqItem.propertyType || "inmueble")}
\u2022 \u{1F4BC} *NEGOCIO:* ${translateTransactionType(reqItem.tipoNegocioDeseado || reqItem.transactionType || "compra")}
\u2022 \u{1F4C5} *FECHA DE ENV\xCDO:* ${reqDateTime.dateStr}
\u2022 \u23F0 *HORA DE ENV\xCDO:* ${reqDateTime.timeStr}
\u2022 \u{1F464} *Autor:* @${isProperty ? matchedRawPhone : savedRawPhone}
\u2022 \u{1F4AC} *PUBLICACI\xD3N:* ${reqItem.rawText || "Sin descripci\xF3n"}
\u2022 \u{1F4DE} *CONTACTO:* [Confirmaci\xF3n Pendiente - Se envi\xF3 DM privado \u{1F4E9}]

\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

\u{1F3E0} *PROPIEDAD* \u{1F3E0}
\u2022 \u{1F3E2} *INMUEBLE:* ${translatePropertyType(propItem.propertyType || "inmueble")}
\u2022 \u{1F4BC} *NEGOCIO:* ${translateTransactionType(propItem.transactionType || "venta")}
\u2022 \u{1F4C5} *FECHA DE ENV\xCDO:* ${propDateTime.dateStr}
\u2022 \u23F0 *HORA DE ENV\xCDO:* ${propDateTime.timeStr}
\u2022 \u{1F464} *Autor:* @${isProperty ? savedRawPhone : matchedRawPhone}
\u2022 \u{1F4AC} *PUBLICACI\xD3N:* ${propItem.rawText || "Sin descripci\xF3n"}
\u2022 \u{1F4DE} *CONTACTO:* [Confirmaci\xF3n Pendiente - Se envi\xF3 DM privado \u{1F4E9}]`;
    matchBlocks.push(block);
    const ownerJid = isProperty ? savedJid : matchedJid;
    const ownerDM = `\u{1F91D} *CONFIRMACI\xD3N DE MATCH (#M${matchId})* \u{1F91D}

Hola Colega, he detectado una coincidencia del *${score.toFixed(0)}%* de tu propiedad con un requerimiento de la red:
\u2022 \u{1F3E2} *Inmueble:* ${translatePropertyType(reqItem.tipoInmuebleDeseado || reqItem.propertyType || "inmueble")}
\u2022 \u{1F4BC} *Negocio:* ${translateTransactionType(reqItem.tipoNegocioDeseado || reqItem.transactionType || "compra")}
\u2022 \u{1F4CD} *Ubicaci\xF3n:* ${reqItem.ciudadDeseada || reqItem.city || "Bogot\xE1"} - ${reqItem.zonaDeseada || reqItem.zone || ""}
\u2022 \u{1F4AC} *Publicaci\xF3n del aliado:* ${reqItem.rawText || "Sin descripci\xF3n"}

Para conectar tu contacto con este aliado de forma segura, por favor responde a este mensaje diciendo:
\u{1F449} *S\xCD #M${matchId}* (si te interesa conectar)
\u{1F449} *NO #M${matchId}* (si no te interesa)

_(Nota: El contacto mutuo se compartir\xE1 de inmediato \xFAnicamente si ambas partes confirman con S\xCD en un plazo de 24 horas)._`;
    const seekerJid = isProperty ? matchedJid : savedJid;
    const seekerDM = `\u{1F91D} *CONFIRMACI\xD3N DE MATCH (#M${matchId})* \u{1F91D}

Hola Colega, he detectado una coincidencia del *${score.toFixed(0)}%* de tu requerimiento con una propiedad disponible en la red:
\u2022 \u{1F3E2} *Inmueble:* ${translatePropertyType(propItem.propertyType || "inmueble")}
\u2022 \u{1F4BC} *Negocio:* ${translateTransactionType(propItem.transactionType || "venta")}
\u2022 \u{1F4CD} *Ubicaci\xF3n:* ${propItem.city || "Bogot\xE1"} - ${propItem.zone || ""}
\u2022 \u{1F4B5} *Precio:* ${propItem.price ? Number(propItem.price).toLocaleString("es-CO") + " COP" : "N/A"}
\u2022 \u{1F4AC} *Publicaci\xF3n de la oferta:* ${propItem.rawText || "Sin descripci\xF3n"}

Para conectar tu contacto con este aliado de forma segura, por favor responde a este mensaje diciendo:
\u{1F449} *S\xCD #M${matchId}* (si te interesa conectar)
\u{1F449} *NO #M${matchId}* (si no te interesa)

_(Nota: El contacto mutuo se compartir\xE1 de inmediato \xFAnicamente si ambas partes confirman con S\xCD en un plazo de 24 horas)._`;
    extraDMs.push({ jid: ownerJid, message: ownerDM });
    extraDMs.push({ jid: seekerJid, message: seekerDM });
  }
  const responseText = matchBlocks.join("\n\n================================\n\n") + "\n\n" + REPUTATION_HOOK;
  return {
    response: responseText,
    mentions,
    extraDMs
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
async function processWhatsAppMessage(text2, userId, userName, hasMedia = false, scrapedData = [], audioUrl, imageBuffer, isGroup = false) {
  try {
    const rawPhone = userId.split("@")[0];
    const realName = userName && userName.trim() !== "" ? userName : `Asesor +${rawPhone}`;
    const senderInfo = analyzeSender(realName, userId);
    const n = realName.split(" ")[0];
    const session = await getPendingSession(userId);
    if (session) {
      const geoValidation = validarZona(text2, session.extractedData.city || session.extractedData.ciudadDeseada, session.messageToProcess + " " + text2);
      if (geoValidation.isValid) {
        await deletePendingSession(userId);
        if (session.type === "PROPERTY") {
          if (geoValidation.isMunicipio) {
            session.extractedData.city = geoValidation.barrioCanonico;
            session.extractedData.addressCity = geoValidation.barrioCanonico;
            session.extractedData.addressLocality = geoValidation.localidad;
            session.extractedData.zone = geoValidation.barrioCanonico;
          } else {
            session.extractedData.city = "Bogot\xE1";
            session.extractedData.addressCity = "Bogot\xE1";
            session.extractedData.zone = geoValidation.barrioCanonico;
            session.extractedData.addressLocality = geoValidation.localidad;
          }
          const propertyTitle = session.extractedData.title || `${capitalize(session.extractedData.propertyType || "inmueble")} en ${session.extractedData.zone || "Bogot\xE1"} para ${session.extractedData.transactionType || "venta"}`;
          const saved = await saveProperty({
            ...session.extractedData,
            name: propertyTitle,
            price: String(session.extractedData.price || 0),
            areaTotal: String(session.extractedData.area || 0),
            idUsuarioWhatsapp: rawPhone,
            rawText: session.messageToProcess + " (Ubicaci\xF3n completada: " + text2 + ")",
            amenities: { gives: session.extractedData.gives, wants: session.extractedData.wants, isCollaborativePool: session.extractedData.isCollaborativePool }
          }, userId, realName, session.imageBuffer);
          if (saved) {
            const matches = await findMatchesForProperty(saved.id);
            const matchDetails = matches.length > 0 ? await handleDetectedMatches(matches, true, saved, userId, realName) : { response: "", mentions: [], extraDMs: [] };
            return {
              classification: "INMUEBLE",
              extractedData: session.extractedData,
              shouldSendDM: true,
              dmResponse: `Perfecto, ${n}! Con el barrio *${geoValidation.barrioCanonico}* acabo de completar el registro de tu activo en nuestra base de datos. Ya estoy buscando activamente tu MATCH comercial en la red. \xA1Excelente labor!`,
              response: matchDetails.response,
              mentions: matchDetails.mentions,
              extraDMs: matchDetails.extraDMs
            };
          }
        } else {
          if (geoValidation.isMunicipio) {
            session.extractedData.ciudadDeseada = geoValidation.barrioCanonico;
            session.extractedData.addressCity = geoValidation.barrioCanonico;
            session.extractedData.addressLocality = geoValidation.localidad;
            session.extractedData.zonaDeseada = geoValidation.barrioCanonico;
          } else {
            session.extractedData.ciudadDeseada = "Bogot\xE1";
            session.extractedData.addressCity = "Bogot\xE1";
            session.extractedData.zonaDeseada = geoValidation.barrioCanonico;
            session.extractedData.addressLocality = geoValidation.localidad;
          }
          const reqTitle = session.extractedData.title || `Requerimiento de ${session.extractedData.propertyType || "inmueble"} en ${session.extractedData.zonaDeseada || "Bogot\xE1"} para ${session.extractedData.transactionType || "venta"}`;
          const saved = await saveRequirement({
            ...session.extractedData,
            name: reqTitle,
            tipoInmuebleDeseado: session.extractedData.propertyType,
            tipoNegocioDeseado: session.extractedData.transactionType,
            zonaDeseada: session.extractedData.zonaDeseada,
            presupuestoMax: String(session.extractedData.price || 0),
            idUsuarioWhatsapp: rawPhone,
            rawText: session.messageToProcess + " (Ubicaci\xF3n completada: " + text2 + ")",
            caracteristicasDeseadas: { gives: session.extractedData.gives, wants: session.extractedData.wants }
          }, userId, realName);
          if (saved) {
            const matches = await findMatchesForRequirement(saved.id);
            const matchDetails = matches.length > 0 ? await handleDetectedMatches(matches, false, saved, userId, realName) : { response: "", mentions: [], extraDMs: [] };
            return {
              classification: "REQUERIMIENTO",
              extractedData: session.extractedData,
              shouldSendDM: true,
              dmResponse: `Perfecto, ${n}! Con el barrio *${geoValidation.barrioCanonico}* acabo de completar el registro de tu requerimiento en nuestra base de datos. Ya estoy buscando activamente el inmueble ideal en la red. \xA1Excelente labor!`,
              response: matchDetails.response,
              mentions: matchDetails.mentions,
              extraDMs: matchDetails.extraDMs
            };
          }
        }
      }
    }
    let messageToProcess = text2;
    if (audioUrl) {
      console.log(`[JanIA] Transcribiendo nota de voz para ${userId}...`);
      const transcription = await transcribeAudio({ audioUrl });
      if (!("error" in transcription)) {
        messageToProcess = transcription.text;
      }
    }
    let contextText = `Mensaje de ${userName || userId}: ${messageToProcess}`;
    if (scrapedData.length > 0) contextText += `
[SISTEMA - DATOS SCRAPED]: ${JSON.stringify(scrapedData)}`;
    if (imageBuffer) contextText += `
[SISTEMA: IMAGEN DETECTADA. Analiza la imagen con visi\xF3n OCR para extraer todos los datos del flyer o captura comercial.]`;
    let statsSummary = "";
    try {
      const db = await getDb();
      if (db) {
        const startOfToday = /* @__PURE__ */ new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const [totalPropsResult] = await db.select({ count: sql3`count(*)` }).from(properties);
        const [totalReqsResult] = await db.select({ count: sql3`count(*)` }).from(requirements);
        const [totalMatchesResult] = await db.select({ count: sql3`count(*)` }).from(propertyMatches);
        const [todayPropsResult] = await db.select({ count: sql3`count(*)` }).from(properties).where(gte(properties.createdAt, startOfToday));
        const [todayReqsResult] = await db.select({ count: sql3`count(*)` }).from(requirements).where(gte(requirements.createdAt, startOfToday));
        const [todayMatchesResult] = await db.select({ count: sql3`count(*)` }).from(propertyMatches).where(gte(propertyMatches.createdAt, startOfToday));
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
(Usa estos datos exactos de estad\xEDsticas si el usuario pregunta c\xF3mo te fue hoy, cu\xE1ntos matches hiciste o sacaste, o datos del sistema.)`;
      }
    } catch (err) {
      console.error("[JanIA-Stats] Error consultando estad\xEDsticas en tiempo real:", err);
    }
    if (statsSummary) {
      contextText += statsSummary;
    }
    const response = await invokeLLM({
      messages: [
        { role: "system", content: JANIA_PROMPT },
        { role: "user", content: contextText }
      ],
      responseFormat: { type: "json_object" },
      imageBuffer
    });
    const llmRes = response;
    if (!llmRes || !llmRes.choices || !llmRes.choices[0]) throw new Error("Fallo de comunicaci\xF3n con el LLM");
    const result = JSON.parse(llmRes.choices[0].message.content);
    result.mentions = [];
    const extracted = result.extractedData;
    const isRequirement = result.classification === "REQUERIMIENTO";
    const isProperty = result.classification === "INMUEBLE";
    if (isProperty || isRequirement) {
      const zoneToValidate = isProperty ? extracted?.zone : extracted?.zonaDeseada || extracted?.zone;
      let isValidGeo = false;
      let geoValidation = null;
      if (zoneToValidate && zoneToValidate.trim() !== "") {
        geoValidation = validarZona(zoneToValidate, extracted?.city || extracted?.ciudadDeseada, messageToProcess);
        isValidGeo = geoValidation.isValid;
      }
      if (!isValidGeo) {
        result.classification = "DATOS_INCOMPLETOS";
        result.shouldSendDM = true;
        result.dmShouldReply = true;
        if (!result.dmResponse) {
          const intro = senderInfo.greeting ? `${senderInfo.greeting} ` : "";
          const mainText = "le\xED tu publicaci\xF3n pero me falta el barrio exacto. \xBFMe lo indicas para buscar tu match de inmediato? \u{1F680}";
          result.dmResponse = intro + (senderInfo.greeting ? mainText : capitalize(mainText));
        }
        result.response = "";
        await setPendingSession(userId, {
          type: isProperty ? "PROPERTY" : "REQUIREMENT",
          extractedData: extracted,
          senderInfo,
          messageToProcess,
          imageBuffer
        });
        return result;
      }
      const validation = geoValidation;
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
    if (isProperty) {
      const propertyTitle = extracted.title || `${capitalize(extracted.propertyType || "inmueble")} en ${extracted.zone || "Bogot\xE1"} para ${extracted.transactionType || "venta"}`;
      const saved = await saveProperty({
        ...extracted,
        name: propertyTitle,
        price: String(extracted.price || 0),
        areaTotal: String(extracted.area || 0),
        idUsuarioWhatsapp: rawPhone,
        rawText: messageToProcess,
        amenities: { gives: extracted.gives, wants: extracted.wants, isCollaborativePool: extracted.isCollaborativePool }
      }, userId, realName, imageBuffer);
      if (saved) {
        result.shouldSendDM = true;
        if (!result.dmResponse) {
          const intro = senderInfo.greeting ? `${senderInfo.greeting} ` : "";
          const mainText = `registr\xE9 tu oferta en la red y ya estoy buscando tu match. \xA1Excelente labor! \u{1F3AF}`;
          result.dmResponse = intro + (senderInfo.greeting ? mainText : capitalize(mainText));
        }
        const matches = await findMatchesForProperty(saved.id);
        const matchDetails = matches.length > 0 ? await handleDetectedMatches(matches, true, saved, userId, realName) : { response: "", mentions: [], extraDMs: [] };
        result.response = matchDetails.response;
        result.mentions = matchDetails.mentions;
        result.extraDMs = matchDetails.extraDMs;
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
        caracteristicasDeseadas: { gives: extracted.gives, wants: extracted.wants }
      }, userId, realName);
      if (saved) {
        result.shouldSendDM = true;
        if (!result.dmResponse) {
          const intro = senderInfo.greeting ? `${senderInfo.greeting} ` : "";
          const mainText = `registr\xE9 tu requerimiento en la red y ya estoy buscando tu inmueble ideal. \xA1Excelente labor! \u{1F3AF}`;
          result.dmResponse = intro + (senderInfo.greeting ? mainText : capitalize(mainText));
        }
        const matches = await findMatchesForRequirement(saved.id);
        const matchDetails = matches.length > 0 ? await handleDetectedMatches(matches, false, saved, userId, realName) : { response: "", mentions: [], extraDMs: [] };
        result.response = matchDetails.response;
        result.mentions = matchDetails.mentions;
        result.extraDMs = matchDetails.extraDMs;
      }
    }
    const isConsultation = result.classification === "CONSULTA_GENERAL" || result.classification === "RESPUESTA_A_PREGUNTA_IA" || result.classification === "ANALISIS_DE_MERCADO";
    if (isGroup && isConsultation) {
      const textLower = messageToProcess.toLowerCase();
      const isAboutVecy = textLower.includes("vecy") || textLower.includes("proyecto") || textLower.includes("quien creo") || textLower.includes("qui\xE9n cre\xF3") || textLower.includes("creadores") || textLower.includes("quien es jania") || textLower.includes("qui\xE9n es jania") || textLower.includes("como funciona") || textLower.includes("c\xF3mo funciona") || textLower.includes("circulo cero") || textLower.includes("c\xEDrculo cero") || textLower.includes("ubicapp") || textLower.includes("samboni") || textLower.includes("competidor") || textLower.includes("competencia");
      if (isAboutVecy) {
        const isCompetitorQuery = textLower.includes("ubicapp") || textLower.includes("samboni") || textLower.includes("competidor") || textLower.includes("competencia");
        if (isCompetitorQuery) {
          result.response = `\u{1F44C} *C\xCDRCULO CERO \u2014 DEBATE Y COMUNIDAD* \u{1F44C}

Hola @${rawPhone}, detect\xE9 una menci\xF3n a plataformas competidoras o comparativas de servicios. Para mantener este canal enfocado exclusivamente en ofertas y requerimientos, te invito a plantear tus preguntas, comparar beneficios o participar en el debate en nuestro canal oficial **C\xEDrculo CERO \u{1F44C}**:
\u{1F449} https://chat.whatsapp.com/CSzrKR6Cr56HAieEhAuqyU

\xA1All\xED debatimos abiertamente con total transparencia y profesionalismo! \u{1F91D}\u2728`;
        } else {
          result.response = `\u{1F44C} *C\xCDRCULO CERO \u2014 CONEXI\xD3N VECY* \u{1F44C}

Hola @${rawPhone}, veo que tienes dudas o quieres saber m\xE1s sobre el proyecto VECY Network, beneficios, creadores o el plan colaborativo. Te invito a unirte y hacer tus preguntas en nuestro canal oficial **C\xEDrculo CERO \u{1F44C}**:
\u{1F449} https://chat.whatsapp.com/CSzrKR6Cr56HAieEhAuqyU

\xA1Es el espacio ideal para resolver todas tus inquietudes de la comunidad! \u{1F91D}\u2728`;
        }
      } else {
        result.response = `\u{1F4A1} *BUZ\xD3N DE CONSULTOR\xCDA INMOBILIARIA* \u{1F4A1}

Hola @${rawPhone}, veo que tienes una consulta jur\xEDdica, procedimental o de aval\xFAo. Para darte una respuesta detallada con mis motores legales y de mercado sin saturar este canal de ofertas y requerimientos, te invito a realizar tu pregunta en nuestro grupo especializado **Buz\xF3n de Consultor\xEDa Inmobiliaria 24/7**:
\u{1F449} https://chat.whatsapp.com/J4u1h7NUL1i1B1wAIyTUN6

\xA1All\xED te responder\xE9 al instante con toda la informaci\xF3n! \u{1F680}\u{1F3AF}`;
        result.classification = "CONSULTA_GENERAL";
      }
    }
    return result;
  } catch (error) {
    console.error("Error en JanIA v11.70:", error);
    return { classification: "CONSULTA_GENERAL", response: "", mentions: [] };
  }
}
async function findOrCreateUserByPhone(phone, realName) {
  const db = await getDb();
  if (!db) return null;
  let user = await db.select().from(users).where(eq9(users.phone, phone)).limit(1).then((r) => r[0]);
  if (!user) {
    user = await db.select().from(users).where(eq9(users.openId, `wa-${phone}`)).limit(1).then((r) => r[0]);
  }
  if (!user) {
    const openId = `wa-${phone}`;
    console.log(`[JanIA-findOrCreateUserByPhone] Creando nuevo usuario para WhatsApp: ${realName} (+${phone})`);
    const [newUser] = await db.insert(users).values({
      openId,
      name: realName,
      phone,
      role: "agent",
      loginMethod: "whatsapp"
    }).returning();
    user = newUser;
  } else {
    if (realName && !realName.startsWith("Asesor +") && (!user.name || user.name.startsWith("Asesor +"))) {
      console.log(`[JanIA-findOrCreateUserByPhone] Actualizando nombre de usuario para ID ${user.id} a ${realName}`);
      const [updatedUser] = await db.update(users).set({ name: realName }).where(eq9(users.id, user.id)).returning();
      user = updatedUser;
    }
  }
  return user;
}
function sanitizePropertyType(type) {
  if (!type) return "apartment";
  const t2 = type.toLowerCase().trim();
  if (t2 === "apartment" || t2 === "apartamento" || t2 === "apto") return "apartment";
  if (t2 === "house" || t2 === "casa") return "house";
  if (t2 === "building" || t2 === "edificio") return "building";
  if (t2 === "warehouse" || t2 === "bodega") return "warehouse";
  if (t2 === "farm" || t2 === "finca") return "farm";
  if (t2 === "hotel") return "hotel";
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
  if (t2 === "venta" || t2 === "vender") return "venta";
  if (t2 === "arriendo" || t2 === "alquiler" || t2 === "renta" || t2 === "rentar") return "arriendo";
  if (t2 === "arriendo_temporal" || t2 === "temporal" || t2 === "vacacional") return "arriendo_temporal";
  return "venta";
}
function sanitizeCurrency(curr) {
  if (!curr) return "COP";
  const c = curr.toUpperCase().trim();
  if (c === "USD" || c === "DOLARES" || c === "DOLAR") return "USD";
  return "COP";
}
async function saveProperty(data, userId, realName, imageBuffer) {
  const db = await getDb();
  if (!db) return null;
  const rawPhone = userId.split("@")[0];
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
    city: data.city || data.ciudadDeseada || "Bogot\xE1",
    propertyType: sanitizePropertyType(data.propertyType),
    transactionType: sanitizeTransactionType(data.transactionType),
    currency: sanitizeCurrency(data.currency),
    // Mapear explícitamente los campos para mayor robustez
    price: data.price !== void 0 && data.price !== null ? String(data.price) : null,
    areaTotal: data.areaTotal !== void 0 && data.areaTotal !== null ? String(data.areaTotal) : data.area !== void 0 && data.area !== null ? String(data.area) : null,
    bedrooms: data.bedrooms !== void 0 && data.bedrooms !== null ? Number(data.bedrooms) : null,
    bathrooms: data.bathrooms !== void 0 && data.bathrooms !== null ? Number(data.bathrooms) : null,
    garages: data.garages !== void 0 && data.garages !== null ? Number(data.garages) : null,
    stratum: data.stratum !== void 0 && data.stratum !== null ? Number(data.stratum) : null,
    agentId: user ? user.id : null,
    images: finalImages.length > 0 ? finalImages : null,
    amenities: amenitiesObj
  };
  const existing = await db.select().from(properties).where(
    and4(
      eq9(properties.idUsuarioWhatsapp, rawPhone),
      eq9(properties.propertyType, insertData.propertyType),
      eq9(properties.transactionType, insertData.transactionType),
      eq9(properties.city, insertData.city),
      eq9(properties.zone, insertData.zone),
      eq9(properties.price, insertData.price),
      eq9(properties.available, true)
    )
  ).limit(1);
  if (existing.length > 0) {
    const [updated] = await db.update(properties).set({ updatedAt: /* @__PURE__ */ new Date() }).where(eq9(properties.id, existing[0].id)).returning();
    console.log(`[Deduplication] Propiedad duplicada detectada y actualizada: #${updated.id}`);
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
  const rawPhone = userId.split("@")[0];
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
    ciudadDeseada: data.ciudadDeseada || data.city || "Bogot\xE1",
    tipoInmuebleDeseado: sanitizePropertyType(data.tipoInmuebleDeseado || data.propertyType),
    tipoNegocioDeseado: sanitizeTransactionType(data.tipoNegocioDeseado || data.transactionType),
    monedaPresupuesto: sanitizeCurrency(data.monedaPresupuesto || data.currency),
    // Mapear campos desde el formato LLM/WhatsApp (data) a las columnas de la base de datos
    presupuestoMin: data.presupuestoMin !== void 0 && data.presupuestoMin !== null ? String(data.presupuestoMin) : null,
    presupuestoMax: data.presupuestoMax !== void 0 && data.presupuestoMax !== null ? String(data.presupuestoMax) : data.price !== void 0 && data.price !== null ? String(data.price) : null,
    areaMin: data.areaMin !== void 0 && data.areaMin !== null ? String(data.areaMin) : data.area !== void 0 && data.area !== null ? String(data.area) : null,
    habitacionesMin: data.habitacionesMin !== void 0 && data.habitacionesMin !== null ? Number(data.habitacionesMin) : data.bedrooms !== void 0 && data.bedrooms !== null ? Number(data.bedrooms) : null,
    banosMin: data.banosMin !== void 0 && data.banosMin !== null ? Number(data.banosMin) : data.bathrooms !== void 0 && data.bathrooms !== null ? Number(data.bathrooms) : null,
    parqueaderosMin: data.parqueaderosMin !== void 0 && data.parqueaderosMin !== null ? Number(data.parqueaderosMin) : data.garages !== void 0 && data.garages !== null ? Number(data.garages) : null,
    estratoDeseado: data.estratoDeseado || (data.stratum !== void 0 && data.stratum !== null ? [Number(data.stratum)] : null),
    userId: user ? user.id : null,
    caracteristicasDeseadas: characteristicsObj
  };
  const existing = await db.select().from(requirements).where(
    and4(
      eq9(requirements.idUsuarioWhatsapp, rawPhone),
      eq9(requirements.tipoInmuebleDeseado, insertData.tipoInmuebleDeseado),
      eq9(requirements.tipoNegocioDeseado, insertData.tipoNegocioDeseado),
      eq9(requirements.ciudadDeseada, insertData.ciudadDeseada),
      eq9(requirements.zonaDeseada, insertData.zonaDeseada),
      eq9(requirements.presupuestoMax, insertData.presupuestoMax),
      eq9(requirements.status, "active")
    )
  ).limit(1);
  if (existing.length > 0) {
    const [updated] = await db.update(requirements).set({ updatedAt: /* @__PURE__ */ new Date() }).where(eq9(requirements.id, existing[0].id)).returning();
    console.log(`[Deduplication] Requerimiento duplicado detectado y actualizado: #${updated.id}`);
    return updated;
  }
  const [result] = await db.insert(requirements).values(insertData).returning();
  return result;
}
async function generateWelcomeMessage(count) {
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Eres una consultora inmobiliaria experta de VECY Network. Habla siempre en primera persona del singular. Tu tono es sumamente humano, elocuente y corporativo." },
        { role: "user", content: `Han ingresado ${count} nuevos integrantes a VECY Network. Dales la bienvenida y menciona que ya estoy activa para cruzar ofertas en todo el pa\xEDs sin comisiones.` }
      ]
    });
    const llmRes = response;
    return llmRes.choices[0].message.content.trim();
  } catch (error) {
    return `\u2728 *\xA1Bienvenidos a nuestra red!* \u{1F44B} Qu\xE9 gusto tenerlos aqu\xED. Ya estoy operando en fase de expansi\xF3n nacional para ayudarlos con sus cierres. \u{1F680}`;
  }
}
var MSG_PRESENTACION_INSTITUCIONAL = `\u{1F680} **PRESENTACI\xD3N INSTITUCIONAL: JanIA v2.0** \u{1F680}
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
var MSG_PAUTAS_FORMATOS = `\u{1F4CB} **ESTATUTO DE PUBLICACI\xD3N Y MODERACI\xD3N \u2014 VECY NETWORK**
_Directriz t\xE9cnica obligatoria para todos los aliados del canal._
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

\u{1F504} **REGLAS DE PUBLICACI\xD3N:**
\u2705 Se permite enviar bloques de **1 a 3 publicaciones** consecutivas (enlaces, fichas de texto, audios o flyers) a cualquier hora del d\xEDa.
\u23F1\uFE0F Una vez enviado tu bloque, **debes esperar al menos 5 minutos** antes de enviar tu siguiente bloque para evitar saturar el chat de los aliados.

\u{1F6AB} **CONTENIDO NO PERMITIDO (OFF-TOPIC):**
Queda terminantemente prohibido publicar en este grupo:
- Temas Pol\xEDticos o Religiosos (opiniones, memes, propaganda o debates).
- Enlaces de invitaci\xF3n a unirse a otros grupos, comunidades o redes sociales externas.
- Publicidad propia, autopromociones o venta de cursos.
- Enlaces sospechosos, spam, scam, esquemas de ganancias o pir\xE1mides.
- Ofertas de servicios profesionales ajenos o que no sean de VECY Network (como masajes, dise\xF1o, etc.).

\u{1F6A8} **SISTEMA AUTOM\xC1TICO DE STRIKES (LLAMADOS DE ATENCI\xD3N):**
- Mi motor de IA modera el canal las 24/7. Si detecto contenido no permitido, **eliminar\xE9 la publicaci\xF3n de forma inmediata** y emitir\xE9 un llamado de atenci\xF3n.
- Al acumular **3 llamados de atenci\xF3n (strikes)**, ser\xE1s expulsado y retirado del grupo de forma autom\xE1tica.

\xA1Cuidemos el orden y hagamos negocios inteligentes de corretaje directo! \u{1F91D}\u2728`;
var MSG_PROMO_INMUEBLES = `\u{1F4E2} *VECY INMUEBLES NETWORK \u2014 \xA1ACT\xCDVATE Y CIERRA NEGOCIOS!* \u{1F4E2}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\xA1Colegas! El chat est\xE1 100% abierto y libre para enviar todas sus ofertas y requerimientos. \u{1F680}

Estoy lista 24/7 para procesar tus links de CRM, flyers (con visi\xF3n OCR) y notas de voz para cruzarlos de inmediato y buscar tu MATCH comercial sin comisiones. \u{1F3AF}

\xA1Publiquemos activamente hoy para arrancar con fuerza esta gran proeza inmobiliaria en Colombia! \u{1F4AA}\u{1F3C6}`;
var MSG_PROMO_CONSULTAS = `\u{1F4A1} *BUZ\xD3N DE CONSULTOR\xCDA INMOBILIARIA \u2014 \xA1EL CHAT EST\xC1 ABIERTO!* \u{1F4A1}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\xA1Estimados aliados! Este espacio de asesor\xEDa est\xE1 completamente abierto y libre. \u{1F91D}\u{1F4DA}

Pueden preguntar todo lo que necesiten sobre:
\u25B8 \u2696\uFE0F Legislaci\xF3n inmobiliaria (Ley 820, contratos de corretaje).
\u25B8 \u{1F4D1} Tr\xE1mites (Certificados de tradici\xF3n, prediales, IDU, escrituras).
\u25B8 \u{1F4DD} Redacci\xF3n de tutelas o derechos de petici\xF3n.
\u25B8 \u{1F4CA} Aval\xFAos y valor de metro cuadrado en cualquier zona de Colombia.

\xA1No se queden con la duda! Aprovechen esta inteligencia a su servicio para elevar su profesionalismo y acelerar sus negocios. \u{1F680}\u{1F3AF}`;
var MSG_PROMO_CIRCULO = `\u{1F44C} *C\xCDRCULO CERO \u2014 \xA1CHAT ABIERTO PARA CONECTAR!* \u{1F44C}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\xA1Hola a todos! Este canal oficial est\xE1 abierto y totalmente libre para que pregunten lo que necesiten sobre nuestro ecosistema. \u{1F91D}\u2728

Es el lugar para:
\u25B8 \u{1F680} Conocer de primera mano las novedades y actualizaciones de VECY Network.
\u25B8 \u2753 Resolver dudas sobre el funcionamiento de mis motores de coincidencia y OCR.
\u25B8 \u{1F4A1} Proponer mejoras, ideas innovadoras o reportar cualquier fallo.
\u25B8 \u{1F4AC} Compartir sus testimonios de \xE9xito para inspirar a la comunidad.

\xA1Los invito a participar activamente, preguntar sin timidez y ser parte de esta gran proeza colaborativa! \u{1F3C6}\u{1F4AA}`;
async function processConsultingMessage(text2, userId, userName, imageBuffer) {
  try {
    const rawPhone = userId.split("@")[0];
    const realName = userName && userName.trim() !== "" ? userName : `Asesor +${rawPhone}`;
    const n = realName.split(" ")[0];
    const textLower = text2.toLowerCase();
    const isValuationQuery = textLower.includes("valuar") || textLower.includes("avaluo") || textLower.includes("aval\xFAo") || textLower.includes("cuanto vale") || textLower.includes("cu\xE1nto vale") || textLower.includes("valor metro cuadrado") || textLower.includes("valor m2") || textLower.includes("precio metro cuadrado") || textLower.includes("precio m2") || textLower.includes("cuanto puedo cobrar") || textLower.includes("cu\xE1nto puedo cobrar") || textLower.includes("en que valor") || textLower.includes("en qu\xE9 valor") || textLower.includes("estimar precio");
    const systemPrompt = `Eres JanIA, la Inteligencia Artificial especialista en Consultor\xEDa Jur\xEDdica y Comercial Inmobiliaria en Colombia para la red VECY Network. Est\xE1s operando en el grupo "Buz\xF3n de Consultor\xEDa Inmobiliaria 24/7". Tu objetivo es responder con precisi\xF3n quir\xFArgica, de acuerdo con las siguientes directrices de clasificaci\xF3n:

## L\xD3GICA DE CLASIFICACI\xD3N Y REDIRECCI\xD3N (CR\xCDTICO - EVITAR MENSAJES CRUZADOS)
Analiza el contexto completo antes de clasificar. Debes responder estrictamente en formato JSON con la clasificaci\xF3n correcta:

1. **Clasificaci\xF3n "INMUEBLE" o "REQUERIMIENTO"**:
   - Si el usuario est\xE1 PUBLICANDO UNA OFERTA COMERCIAL de venta, arriendo o permuta (por ejemplo, comparte una descripci\xF3n t\xE9cnica de un inmueble propio, fotos de su propiedad para promocionar, etc.), o si est\xE1 solicitando expl\xEDcitamente un inmueble en VENTA o ARRIENDO (por ejemplo, "Busco apartamento de 3 habitaciones en Cedritos").
   - Respuesta ('response'): "\u{1F4E2} *VECY INMUEBLES NETWORK* \u{1F4E2}\\n\\nHola @${rawPhone}, detect\xE9 que est\xE1s publicando una oferta o requerimiento inmobiliario. Para poder procesar tu publicaci\xF3n con mis motores autom\xE1ticos, registrar tus datos y buscarte un MATCH de inmediato con otros aliados, por favor realiza tu publicaci\xF3n en nuestro grupo especializado **VECY INMUEBLES NETWORK**:\\n\u{1F449} https://chat.whatsapp.com/K36KrHeB9nMEKJ56s8XFcM\\n\\n\xA1Hagamos equipo y cerremos negocios! \u{1F680}\u{1F3AF}"
   - Emoji ('reactionEmoji'): "\u{1F504}"

2. **Clasificaci\xF3n "SOBRE_VECY"**:
   - Si el usuario hace preguntas sobre el proyecto VECY Network, sus creadores (Eduardo A. Rivera, Jani Alves), beneficios, c\xF3mo funciona la IA, o sobre el canal C\xEDrculo Cero.
   - Respuesta ('response'): "\u{1F44C} *C\xCDRCULO CERO \u2014 CONEXI\xD3N VECY* \u{1F44C}\\n\\nHola @${rawPhone}, veo que quieres saber m\xE1s sobre el proyecto VECY Network, beneficios, creadores o el plan colaborativo. Te invito a unirte y hacer tus preguntas en nuestro canal oficial **C\xEDrculo CERO \u{1F44C}**:\\n\u{1F449} https://chat.whatsapp.com/CSzrKR6Cr56HAieEhAuqyU\\n\\n\xA1Es el espacio ideal para resolver todas tus inquietudes de la comunidad! \u{1F91D}\u2728"
   - Emoji ('reactionEmoji'): "\u{1F504}"

3. **Clasificaci\xF3n "CONSULTA_GENERAL"**:
   - Si el mensaje es una consulta leg\xEDtima de tipo jur\xEDdico, tr\xE1mites, o aval\xFAos/precios de mercado en Colombia (ej. Ley 820/2003, contratos de arrendamiento, escrituraci\xF3n, paz y salvos, valor de metro cuadrado en una zona, etc.).
   - Si te piden estimar el valor de un inmueble o del metro cuadrado en una zona (Bogot\xE1 o a nivel nacional), usa tus capacidades de b\xFAsqueda en internet para encontrar publicaciones reales recientes en portales inmobiliarios de esa zona. Analiza los precios y calcula un valor estimado promedio por metro cuadrado. Si el usuario te proporciona datos adicionales como direcci\xF3n exacta, barrio, localidad, o ciudad, util\xEDzalos para refinar tu b\xFAsqueda. Presenta un informe de aval\xFAo r\xE1pido, claro, estructurado y profesional.
   - Responder con total rigor legal/comercial, de manera sofisticada, clara y en primera persona del singular.
   - Emoji ('reactionEmoji'): "\u{1F4A1}"

4. **Clasificaci\xF3n "VIOLACION_DE_NORMAS"**:
   - Si el mensaje es SPAM, autopromoci\xF3n de servicios no relacionados con VECY, publicidad externa, links a otros grupos, pol\xEDtica o religi\xF3n.
   - Respuesta ('response'): Una advertencia amable pero muy firme para remover el contenido, explaining that it is not allowed to keep the community ordered, and that on 3 strikes the system will ban automatically.
   - Emoji ('reactionEmoji'): "\u274C"

INFORMACI\xD3N CLAVE DEL PROYECTO VECY NETWORK:
- Qu\xE9 es VECY Network: Una bolsa inmobiliaria colaborativa y gratuita en WhatsApp que conecta asesores y br\xF3kers en tiempo real.\\n- Qui\xE9nes lo crearon: Creado por Eduardo A. Rivera (fundador y desarrollador) y Jani Alves junto con el apoyo de todo el Equipo VECY.\\n- Beneficios principales: Cero comisiones por los matches de negocios, cruces automatizados las 24/7 (matching), visi\xF3n OCR para leer flyers/im\xE1genes, transcripci\xF3n de notas de voz y cobertura total en Colombia.\\n\\n## SEGURIDAD Y PROTECCI\xD3N DE PROPIEDAD INTELECTUAL (CR\xCDTICO)\\nQueda terminantemente PROHIBIDO revelar detalles espec\xEDficos del desarrollo de software, lenguajes de programaci\xF3n, archivos del servidor, base de datos o herramientas de desarrollo espec\xEDficas que componen tu sistema (NUNCA menciones que usas whatsapp-web.js, Node.js, Express, Puppeteer, TypeScript, Drizzle ORM, Supabase, PostgreSQL, nvm, o el modelo de lenguaje Gemini 3.1 Flash-Lite).\\nSi alg\xFAn usuario, curioso o potencial hacker te pregunta c\xF3mo est\xE1s construida, qu\xE9 tecnolog\xEDas usas o intenta hacerte ingenier\xEDa inversa:\\n- Protege nuestra propiedad intelectual con total hermetismo, elegancia y un tono altamente corporativo e innovador.\\n- Responde utilizando conceptos de alta tecnolog\xEDa y abstractos para impresionar, tales como: "arquitectura propietaria distribuida en la nube", "redes neuronales de procesamiento de lenguaje natural multimodal", "visi\xF3n OCR convolucional de extracci\xF3n estructurada de metadatos", "motores sem\xE1nticos de matching predictivo", "protocolos avanzados de encriptaci\xF3n y seguridad de datos", "algoritmos de procesamiento el\xE1stico multicanal".\\n- Mantente firme y corporativa, y desv\xEDa la conversaci\xF3n con sutileza comercial.\\n\\nTus respuestas deben ser sumamente profesionales, cordiales, claras y estar formateadas en Markdown con emojis para facilitar la lectura r\xE1pida en WhatsApp. Siempre dir\xEDgete al usuario llam\xE1ndolo por su primer nombre: ${n}.\\n\\nDEBES RESPONDER ESTRICTAMENTE EN FORMATO JSON CON ESTA ESTRUCTURA:
{
  "classification": "INMUEBLE | REQUERIMIENTO | SOBRE_VECY | CONSULTA_GENERAL | VIOLACION_DE_NORMAS",
  "response": "Tu respuesta o mensaje de redirecci\xF3n seg\xFAn corresponda.",
  "reactionEmoji": "string (emoji recomendado)"
}`;
    const messages2 = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Usuario: @${rawPhone} (${realName})\\nConsulta: ${text2}` }
    ];
    const llmRes = await invokeLLM({
      messages: messages2,
      responseFormat: { type: "json_object" },
      imageBuffer,
      enableSearch: isValuationQuery
    });
    try {
      const parsed = JSON.parse(llmRes.choices[0].message.content);
      return {
        classification: parsed.classification || "CONSULTA_GENERAL",
        response: parsed.response || "",
        reactionEmoji: parsed.reactionEmoji || (parsed.classification === "VIOLACION_DE_NORMAS" ? "\u274C" : "\u{1F4A1}")
      };
    } catch (e) {
      const replyContent = llmRes.choices[0].message.content || "Lo siento, en este momento no puedo procesar tu consulta. Intenta de nuevo m\xE1s tarde.";
      return {
        classification: "CONSULTA_GENERAL",
        response: replyContent,
        reactionEmoji: "\u{1F4A1}"
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
    const realName = userName && userName.trim() !== "" ? userName : `Asesor +${rawPhone}`;
    const n = realName.split(" ")[0];
    const textLower = text2.toLowerCase();
    const systemPrompt = `Eres JanIA, la Inteligencia Artificial oficial de VECY Network. Est\xE1s operando en el grupo "C\xEDrculo CERO \u{1F44C}". Tu objetivo en este grupo es responder inquietudes sobre la red VECY Network, beneficios, creadores, novedades de desarrollo, e interceptar y debatir respetuosamente con competidores de acuerdo con las siguientes directrices de clasificaci\xF3n:

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
   - Respuesta ('response'): "\u{1F4A1} *BUZ\xD3N DE CONSULTOR\xCDA INMOBILIARIA* \u{1F4A1}\\n\\nHola @${rawPhone}, veo que tienes una consulta jur\xEDdica, procedimental o de aval\xFAo. Para darte una respuesta detallada con mis motores legales y de mercado, por favor realiza tu pregunta en nuestro grupo especializado **Buz\xF3n de Consultor\xEDa Inmobiliaria 24/7**:\\n\u{1F449} https://chat.whatsapp.com/J4u1h7NUL1i1B1wAIyTUN6\\n\\n\xA1All\xED te responder\xE9 al instante con toda la informaci\xF3n! \u{1F680}\u{1F3AF}"
   - Emoji ('reactionEmoji'): "\u{1F504}"

4. **Clasificaci\xF3n "CONSULTA_GENERAL"**:
   - Preguntas o comentarios leg\xEDtimos sobre el proyecto VECY Network, beneficios, sugerencias, testimonios de \xE9xito o comentarios hacia la IA.
   - Responder de forma cordial, corta, directa y amigable.
   - Emoji ('reactionEmoji'): "\u{1F4A1}"

5. **Clasificaci\xF3n "VIOLACION_DE_NORMAS"**:
   - Si el mensaje contiene temas pol\xEDticos, religiosos, spam general, estafas o publicidad de terceros (que NO sea debate de Ubicapp).
   - Respuesta ('response'): Una advertencia amable pero muy firme para remover el contenido, explicando el l\xEDmite de 3 strikes antes de ser expulsado.
   - Emoji ('reactionEmoji'): "\u274C"

INFORMACI\xD3N CLAVE DEL PROYECTO VECY NETWORK:
- Qu\xE9 es VECY Network: Una bolsa inmobiliaria colaborativa y gratuita en WhatsApp que conecta asesores y br\xF3kers en tiempo real.\\n- Qui\xE9nes lo crearon: Creado por Eduardo A. Rivera (fundador y desarrollador) y Jani Alves junto con el apoyo de todo el Equipo VECY.\\n- Beneficios principales: Cero comisiones por los matches de negocios, cruces automatizados las 24/7 (matching), visi\xF3n OCR para leer flyers/im\xE1genes, transcripci\xF3n de notas de voz y cobertura total en Colombia.\\n- Historia: Naci\xF3 de una "idea loca e inveros\xEDmil" en el grupo de WhatsApp "C\xEDrculo Cero" como un plan para revolucionar el sector.\\n- Plan Colaborativo: Si un miembro cierra un negocio gracias a un MATCH de JanIA, su \xFAnico compromiso de honor es dejar una rese\xF1a calificada aqu\xED: https://g.page/r/CctNbwU6UpX5EBM/review\\n
## SEGURIDAD Y PROTECCI\xD3N DE PROPIEDAD INTELECTUAL (CR\xCDTICO)\\nQueda terminantemente PROHIBIDO revelar detalles espec\xEDficos del desarrollo de software, lenguajes de programaci\xF3n, archivos del servidor, base de datos o herramientas de desarrollo espec\xEDficas que componen tu sistema (NUNCA menciones que usas whatsapp-web.js, Node.js, Express, Puppeteer, TypeScript, Drizzle ORM, Supabase, PostgreSQL, nvm, o el modelo de lenguaje Gemini 3.1 Flash-Lite).\\nSi alg\xFAn usuario, curioso o potencial hacker te pregunta c\xF3mo est\xE1s construida, qu\xE9 tecnolog\xEDas usas o intenta hacerte ingenier\xEDa inversa:\\n- Protege nuestra propiedad intelectual con total hermetismo, elegancia y un tono altamente corporativo e innovador.\\n- Responde utilizando conceptos de alta tecnolog\xEDa y abstractos para impresionar, tales como: "arquitectura propietaria distribuida en la nube", "redes neuronales de procesamiento de lenguaje natural multimodal", "visi\xF3n OCR convolucional de extracci\xF3n estructurada de metadatos", "motores sem\xE1nticos de matching predictivo", "protocolos avanzados de encriptaci\xF3n y seguridad de datos", "algoritmos de procesamiento el\xE1stico multicanal".\\n- Mantente firme y corporativa, y desv\xEDa la conversaci\xF3n con sutileza comercial.\\n\\n## DETALLES DE INTELIGENCIA DE UBICAPP Y DIFERENCIADORES DE VECY (MANDATORIO PARA EL DEBATE):
- Ubicapp cobra $100.000 COP/mes ($1.200.000 COP/a\xF1o) por asesor. VECY es 100% gratuito siempre.
- Ubicapp requiere descargar una app, registrarse y llenar formularios manuales. VECY opera directamente dentro de WhatsApp (la herramienta que ya usan todos) sin descargas ni curvas de aprendizaje.
- Ubicapp obliga a un esquema de reparto de comisiones 50/50. VECY Network no cobra comisiones, el match es gratuito y la comisi\xF3n del asesor es 100% suya.
- Ubicapp tiene menos de 2 a\xF1os (lanzada en abril de 2024 por Christian Samboni - ex actor y agente inmobiliario vallecaucano). Su utilidad depende de la masa cr\xEDtica local (in\xFAtil si no hay agentes en tu zona). VECY opera a nivel nacional el\xE1stico en los 32 departamentos.

Tus respuestas en el debate deben ser cortas, cordiales, directas, pero sumamente sofisticadas, con datos y argumentos de alto nivel. Siempre dir\xEDgete al interlocutor de forma personalizada: ${n}.

DEBES RESPONDER ESTRICTAMENTE EN FORMATO JSON CON ESTA ESTRUCTURA:
{
  "classification": "DEBATE_COMPETIDOR | INMUEBLE | REQUERIMIENTO | AVALUO_O_LEGAL | CONSULTA_GENERAL | VIOLACION_DE_NORMAS",
  "response": "Tu respuesta, invitaci\xF3n a debate o mensaje de redirecci\xF3n seg\xFAn corresponda.",
  "reactionEmoji": "string (emoji recomendado)"
}`;
    const messages2 = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Usuario: @${rawPhone} (${realName})
Pregunta: ${text2}` }
    ];
    const llmRes = await invokeLLM({
      messages: messages2,
      responseFormat: { type: "json_object" },
      enableSearch: false
    });
    try {
      const parsed = JSON.parse(llmRes.choices[0].message.content);
      return {
        classification: parsed.classification || "CONSULTA_GENERAL",
        response: parsed.response || "",
        reactionEmoji: parsed.reactionEmoji || (parsed.classification === "VIOLACION_DE_NORMAS" ? "\u274C" : "\u{1F4A1}")
      };
    } catch (e) {
      const replyContent = llmRes.choices[0].message.content || "Lo siento, en este momento no puedo responder tu consulta.";
      return {
        classification: "CONSULTA_GENERAL",
        response: replyContent,
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

// server/_core/whatsapp.ts
init_db();
init_schema();
import fs2 from "fs";
import path3 from "path";
import { eq as eq10 } from "drizzle-orm";
init_env();
var { Client, LocalAuth, MessageMedia } = pkg;
var SERVER_BOOT_TIME = Math.floor(Date.now() / 1e3);
var delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var outgoingQueue = Promise.resolve();
function prepareTtsText(rawText) {
  return rawText.replace(/VECY\s+Network/gi, "Veci N\xE9twork").replace(/\bVECY\b/gi, "Veci").replace(/\bJanIA\b/gi, "Jan\xEDa").replace(/\bRLS\b/g, "ere ele ese").replace(/\bSQL\b/g, "ese cu ele").replace(/\bDM\b/g, "di em").replace(/\bID\b/g, "ai di").replace(/[<>]/g, "").trim();
}
async function textToSpeechMedia(text2) {
  const cleanText = text2.replace(/[*#_`~\[\]]/g, "").replace(/[\u{1F300}-\u{1FAD6}]/gu, "").trim();
  if (!cleanText) return null;
  const ttsText = prepareTtsText(cleanText);
  const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || ENV.forgeApiKey;
  if (googleApiKey) {
    const voiceCandidates = [
      // Chirp HD — voces ultra-naturales 2024 (v1beta1)
      { endpoint: "v1beta1", name: "es-US-Chirp-HD-F", lang: "es-US" },
      // Journey — muy fluida, conversacional
      { endpoint: "v1", name: "es-US-Journey-F", lang: "es-US" },
      // Neural2 — alternativa sólida femenina
      { endpoint: "v1", name: "es-US-Neural2-C", lang: "es-US" }
    ];
    for (const { endpoint, name, lang } of voiceCandidates) {
      try {
        const ttsUrl = `https://texttospeech.googleapis.com/${endpoint}/text:synthesize?key=${googleApiKey}`;
        const response = await fetch(ttsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { text: ttsText },
            // Texto plano con pronunciación ya corregida
            voice: {
              languageCode: lang,
              name,
              ssmlGender: "FEMALE"
            },
            audioConfig: {
              audioEncoding: "MP3",
              speakingRate: 1.6,
              // Ágil, sin sonar acelerada artificialmente
              pitch: -1
              // Tono ligeramente más grave = más cálido y seguro
            }
          })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.audioContent) {
            console.log(`[TTS] \u2713 Voz "${name}" generada (${ttsText.length} chars).`);
            return new MessageMedia("audio/mpeg", data.audioContent, "voice-note.mp3");
          }
        } else {
          const errBody = await response.text().catch(() => "");
          console.warn(`[TTS] "${name}" \u2192 ${response.status}: ${errBody.substring(0, 120)}`);
        }
      } catch (err) {
        console.error(`[TTS] Error con "${name}":`, err);
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
        const base64Data = Buffer.from(buffer).toString("base64");
        console.log(`[TTS-Forge] Voz nova generada con \xE9xito.`);
        return new MessageMedia("audio/mpeg", base64Data, "voice-note.mp3");
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
      return new MessageMedia("audio/mpeg", combined.toString("base64"), "voice-note.mp3");
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
var WhatsAppBot = class {
  client;
  targetGroupId = "120363260108880069@g.us";
  buzonGroupId = "120363417740040773@g.us";
  circuloGroupId = "120363403507276533@g.us";
  isReady = false;
  // Estructuras de control dinámicas
  messageBuffers = /* @__PURE__ */ new Map();
  cooldownMap = /* @__PURE__ */ new Map();
  pendingData = /* @__PURE__ */ new Map();
  // Mutex ligero por senderId para serializar mensajes concurrentes del mismo usuario (Fix: condición de carrera en álbumes)
  processingLocks = /* @__PURE__ */ new Map();
  pendingWelcomeCount = 0;
  counterFile = path3.join(process.cwd(), ".pending_welcome_count");
  pendingWelcomeJids = [];
  jidsFile = path3.join(process.cwd(), ".pending_welcome_jids");
  cooldownFile = path3.join(process.cwd(), ".cooldown_map.json");
  pendingDataFile = path3.join(process.cwd(), ".pending_data.json");
  // Control de límites y anti-flood (v12.0)
  dailyMessageLimit = 250;
  messagesSentToday = 0;
  lastResetDate = (/* @__PURE__ */ new Date()).toDateString();
  chatMessageTimes = /* @__PURE__ */ new Map();
  blockedChats = /* @__PURE__ */ new Map();
  blacklistedBots = process.env.BLACKLISTED_BOTS ? process.env.BLACKLISTED_BOTS.split(",") : [];
  // --- ANTI-BURST & ANTI-FLOOD QUEUED DISPATCH (v12.0) ---
  async queuedSend(chatId, content, options = {}) {
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
        const sendPromise = this.client.sendMessage(chatId, content, options);
        const timeoutPromise = new Promise(
          (_, reject) => setTimeout(() => reject(new Error(`Timeout al enviar mensaje de WhatsApp a ${chatId}`)), 15e3)
        );
        await Promise.race([sendPromise, timeoutPromise]);
        this.messagesSentToday++;
        console.log(`[WhatsApp-Bot] Mensaje enviado a ${chatId}. Total hoy: ${this.messagesSentToday}/${this.dailyMessageLimit}`);
        await delay(Math.floor(Math.random() * 5e3) + 1e4);
      } catch (err) {
        console.error("[Anti-Burst-Queue] Fallo en despacho secuencial:", err.message || err);
      }
    });
    return outgoingQueue;
  }
  constructor() {
    console.log("[WHATSAPP-BOT] Inicializando JanIA v2.0 (CORE v10.5 - Multimodal & Anti-Spam)...");
    this.loadCounter();
    this.loadCooldowns();
    this.loadPendingData();
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: "session-jania-main",
        dataPath: "./.wwebjs_auth"
      }),
      webVersionCache: {
        type: "remote",
        remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1017.558-beta.html"
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
          "--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ],
        protocolTimeout: 3e5
      }
    });
    this.setupEventListeners();
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
    return path3.join(process.cwd(), ".infractions.json");
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
      console.log("\n\u{1F680} JANIA v2.0 CORE v10.5 \u2014 SISTEMA NACIONAL EL\xC1STICO ACTIVADO");
      this.isReady = true;
      this.exportRecentJoinsToFile().catch((err) => {
        console.error("[WHATSAPP-BOT] Error al exportar uniones en ready:", err);
      });
    });
    this.client.on("disconnected", (reason) => {
      console.log("[WHATSAPP-BOT] Cliente desconectado:", reason);
      this.isReady = false;
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
      if (notification.chatId !== this.targetGroupId) return;
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
      this.pendingWelcomeJids.push(...resolvedIds);
      this.pendingWelcomeCount = this.pendingWelcomeJids.length;
      this.saveCounter();
      if (this.pendingWelcomeCount >= 10) await this.sendBatchWelcome();
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
              const result = await processWhatsAppMessage(promptContext, senderId, realName, false, [], void 0, void 0, true);
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
      if (msg.fromMe || this.blacklistedBots.includes(senderId)) {
        return;
      }
      await delay(Math.floor(Math.random() * 2e3) + 2e3);
      try {
        const chat = await msg.getChat();
        await chat.sendStateTyping();
        const chatId = chat.id._serialized;
        const isGroup = chat.isGroup;
        const isTargetGroup = chatId === this.targetGroupId;
        const isBuzonGroup = chatId === this.buzonGroupId;
        const isCirculoGroup = chatId === this.circuloGroupId;
        if (isTargetGroup) {
          const text2 = msg.body.toLowerCase();
          if (text2.includes("jania")) {
            if (text2.includes("normas") || text2.includes("pres\xE9ntate") || text2.includes("anuncia") || text2.includes("dipava") || text2.includes("retorno")) {
              await this.handleAdminCommand(msg);
              return;
            }
          }
          await this.handleIncomingMessage(msg, chatId);
          return;
        }
        if (isBuzonGroup) {
          await this.handleIncomingMessage(msg, chatId);
          return;
        }
        if (isCirculoGroup) {
          await this.handleIncomingMessage(msg, chatId);
          return;
        }
        if (!isGroup) {
          await this.handleIncomingMessage(msg, chatId);
          return;
        }
      } catch (e) {
        console.error("[WHATSAPP-BOT] Error cr\xEDtico en receptor principal:", e);
      }
    });
  }
  // --- 2. RAMA Conversacional PRIVADA (DM INBOUND LOOP) ---
  async handlePrivateMessage(msg) {
    try {
      const senderId = msg.from;
      const rawPhone = (msg.author || msg.from).split("@")[0];
      let realName = `Asesor +${rawPhone}`;
      try {
        const contact = await msg.getContact();
        if (contact) {
          realName = contact.pushname || contact.name || realName;
        }
      } catch (e) {
        console.warn(`[WHATSAPP-BOT] Fall\xF3 msg.getContact() en handlePrivateMessage para ${senderId}:`, e.message || e);
      }
      console.log(`[JanIA-DM] Atendiendo mensaje interno de ${realName} (${senderId})...`);
      const matchConfirmationRegex = /^\s*(sí|si|no)\s+#m(\d+)\s*$/i;
      const matchConf = msg.body.match(matchConfirmationRegex);
      if (matchConf) {
        const decision = matchConf[1].toLowerCase();
        const matchId = parseInt(matchConf[2], 10);
        await this.processMatchConfirmation(senderId, realName, matchId, decision);
        return;
      }
      let imageBuffer;
      if (msg.hasMedia && msg.type === "image") {
        try {
          const media = await msg.downloadMedia();
          if (media && media.mimetype.startsWith("image/")) {
            imageBuffer = media.data;
          }
        } catch (e) {
          console.error("[JanIA-DM-Vision] Error descargando imagen:", e);
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
        imageBuffer
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
      const [match] = await db.select().from(propertyMatches).where(eq10(propertyMatches.id, matchId)).limit(1);
      if (!match) {
        await this.queuedSend(senderId, `\u26A0\uFE0F No encontr\xE9 ning\xFAn match registrado con el c\xF3digo *#M${matchId}*. Por favor verifica el n\xFAmero.`);
        return;
      }
      const [prop] = await db.select().from(properties).where(eq10(properties.id, match.propertyId)).limit(1);
      const [req] = await db.select().from(requirements).where(eq10(requirements.id, match.requirementId)).limit(1);
      if (!prop || !req) {
        await this.queuedSend(senderId, "\u26A0\uFE0F Hubo un problema al recuperar los detalles de este match.");
        return;
      }
      const senderPhone = senderId.split("@")[0];
      const ownerPhone = prop.idUsuarioWhatsapp || "";
      const seekerPhone = req.idUsuarioWhatsapp || "";
      const isOwner = senderPhone === ownerPhone.split("@")[0];
      const isSeeker = senderPhone === seekerPhone.split("@")[0];
      if (!isOwner && !isSeeker) {
        await this.queuedSend(senderId, "\u26A0\uFE0F No est\xE1s autorizado para confirmar este match.");
        return;
      }
      if (decision === "no") {
        await db.update(propertyMatches).set({ status: "rejected" }).where(eq10(propertyMatches.id, matchId));
        await this.queuedSend(senderId, `Entendido. He marcado el match *#M${matchId}* como cancelado. No se compartir\xE1n tus datos de contacto.`);
        await this.logToDb(senderId, "janIA", `[Match-Rejected] Match #M${matchId} rechazado por el usuario.`);
        const otherJid = isOwner ? seekerPhone.includes("@") ? seekerPhone : `${seekerPhone}@c.us` : ownerPhone.includes("@") ? ownerPhone : `${ownerPhone}@c.us`;
        await this.queuedSend(otherJid, `Aviso: El match *#M${matchId}* ha sido cancelado por la otra parte.`);
        return;
      }
      let updateFields = {};
      if (isOwner) {
        updateFields.ownerConfirmed = true;
      }
      if (isSeeker) {
        updateFields.seekerConfirmed = true;
      }
      await db.update(propertyMatches).set(updateFields).where(eq10(propertyMatches.id, matchId));
      const [updatedMatch] = await db.select().from(propertyMatches).where(eq10(propertyMatches.id, matchId)).limit(1);
      if (updatedMatch.ownerConfirmed && updatedMatch.seekerConfirmed) {
        await db.update(propertyMatches).set({ status: "interested" }).where(eq10(propertyMatches.id, matchId));
        let ownerName = "Oferente";
        let seekerName = "Interesado";
        try {
          const [ownerUser] = await db.select().from(users).where(eq10(users.phone, ownerPhone)).limit(1);
          if (ownerUser && ownerUser.name) ownerName = ownerUser.name;
        } catch {
        }
        try {
          const [seekerUser] = await db.select().from(users).where(eq10(users.phone, seekerPhone)).limit(1);
          if (seekerUser && seekerUser.name) seekerName = seekerUser.name;
        } catch {
        }
        const ownerJid = ownerPhone.includes("@") ? ownerPhone : `${ownerPhone}@c.us`;
        const seekerJid = seekerPhone.includes("@") ? seekerPhone : `${seekerPhone}@c.us`;
        const matchScoreFormatted = Number(updatedMatch.matchScore || 0).toFixed(0);
        const msgToOwner = `\u{1F389}\u{1F388} *\xA1MATCH CONFIRMADO Y CONECTADO!* \u{1F388}\u{1F389}
Felicidades, ambas partes han confirmado inter\xE9s en el match *#M${matchId}* (Coincidencia: ${matchScoreFormatted}%).

Aqu\xED tienes el contacto directo del aliado interesado en tu propiedad:
\u{1F464} *Nombre:* ${seekerName}
\u{1F4DE} *WhatsApp:* https://wa.me/${seekerPhone}
\u{1F4AC} *Su requerimiento:* ${req.rawText || "Sin descripci\xF3n"}

\xA1Les deseamos mucho \xE9xito en el cierre comercial! \u{1F91D}\u{1F680}`;
        const msgToSeeker = `\u{1F389}\u{1F388} *\xA1MATCH CONFIRMADO Y CONECTADO!* \u{1F388}\u{1F389}
Felicidades, ambas partes han confirmado inter\xE9s en el match *#M${matchId}* (Coincidencia: ${matchScoreFormatted}%).

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
        await this.queuedSend(senderId, `\xA1Gracias! He registrado tu confirmaci\xF3n de inter\xE9s para el match *#M${matchId}*.

En cuanto la otra parte tambi\xE9n confirme, les compartir\xE9 mutuamente sus datos de contacto para que puedan cerrar el negocio. \u{1F680}`);
        await this.logToDb(senderId, "janIA", `[Match-Confirmed-Waiting] User confirmed match #M${matchId}, waiting for peer.`);
      }
    } catch (err) {
      console.error(`[processMatchConfirmation-Error] Error procesando confirmaci\xF3n para match #${matchId}:`, err);
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
    let cooldown = this.cooldownMap.get(senderId);
    const isMainGroup = chatId === this.targetGroupId;
    const cooldownKey = `${chatId}_${senderId}`;
    cooldown = this.cooldownMap.get(cooldownKey);
    if (isMainGroup && cooldown && now - cooldown.lastBlockProcessedAt < COOLDOWN_PERIOD) {
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
    const bufferKey = `${chatId}_${senderId}`;
    let buffer = this.messageBuffers.get(bufferKey);
    if (buffer) {
      if (buffer.messages.length >= MAX_BLOCK_SIZE) {
        console.log(`[BUFFER] L\xEDmite de bloque (${MAX_BLOCK_SIZE}) alcanzado para ${senderId}. Mensaje #${buffer.messages.length + 1} descartado.`);
        if (isGroupChat) {
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
      buffer.timer = setTimeout(() => this.processBuffer(bufferKey), 15e3);
    } else {
      console.log(`[BUFFER] Nuevo bloque iniciado para ${senderId}. Mensaje #1 registrado.`);
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
        timer: setTimeout(() => this.processBuffer(bufferKey), 15e3)
      });
    }
  }
  async processBuffer(bufferKey) {
    const buffer = this.messageBuffers.get(bufferKey);
    if (!buffer) return;
    const userName = buffer.userName;
    const chatId = buffer.chatId;
    const senderId = bufferKey.split("_")[1];
    this.messageBuffers.delete(bufferKey);
    console.log(`[processBuffer] Iniciando procesamiento de ${buffer.messages.length} mensajes en buffer de ${senderId}.`);
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
        const groupImageBuffer = group.find((m) => m.imageBuffer)?.imageBuffer;
        const groupAudioUrl = group.find((m) => m.audioUrl)?.audioUrl;
        const originalMsg = group[group.length - 1].originalMsg;
        const partitioned = partitionTextByListings(groupText);
        for (const itemText of partitioned) {
          finalListingTexts.push({
            text: itemText,
            hasMedia: groupHasMedia,
            imageBuffer: groupImageBuffer,
            audioUrl: groupAudioUrl,
            originalMsg
          });
        }
      }
      console.log(`[processBuffer] Procesando ${finalListingTexts.length} listings para ${senderId} de un total de ${buffer.messages.length} mensajes en buffer.`);
      let processedListingsCount = 0;
      let warningSent = buffer.warningSent || false;
      for (const item of finalListingTexts) {
        processedListingsCount++;
        if (processedListingsCount > 3) {
          console.log(`[processBuffer] Listing #${processedListingsCount} excede el l\xEDmite de 3 para ${senderId}.`);
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
        const isDM = !chatId.includes("@g.us");
        const pending = isDM ? this.pendingData.get(senderId) : null;
        let result;
        if (chatId === this.buzonGroupId) {
          result = await processConsultingMessage(item.text, senderId, userName, item.imageBuffer);
        } else if (chatId === this.circuloGroupId) {
          result = await processCirculoMessage(item.text, senderId, userName);
        } else {
          if (pending && Date.now() < pending.expiresAt) {
            const combinedText = `[CONTEXTO]: "${pending.originalText}"
[RESPUESTA]: "${item.text}"`;
            this.pendingData.delete(senderId);
            this.savePendingData();
            result = await processWhatsAppMessage(combinedText, senderId, userName, false, [], void 0, item.imageBuffer, !isDM);
          } else {
            result = await processWhatsAppMessage(item.text, senderId, userName, item.hasMedia, scrapedResults, item.audioUrl, item.imageBuffer, !isDM);
          }
        }
        const wantsVoice = !!item.audioUrl || item.text.toLowerCase().includes("env\xEDame un audio") || item.text.toLowerCase().includes("m\xE1ndame un audio") || item.text.toLowerCase().includes("nota de voz");
        await this.handleJanIAResponse(result, senderId, chatId, userName, item.text, item.originalMsg, wantsVoice);
      }
      const cooldownKeyFinal = `${chatId}_${senderId}`;
      this.cooldownMap.set(cooldownKeyFinal, {
        lastBlockProcessedAt: Date.now(),
        warningSent
      });
      this.saveCooldowns();
    } catch (e) {
      console.error("[WHATSAPP-BOT] Error cr\xEDtico en procesamiento de bloque:", e);
    }
  }
  // --- ORQUESTACIÓN DE RESPUESTAS Y PERSONALIZACIÓN (JanIA v2.0) ---
  async handleJanIAResponse(result, senderId, chatId, userName, fullText, originalMsg, wantsVoice = false) {
    if (!result) return;
    const isGroup = chatId.includes("@g.us");
    const isMatch = result.response && (result.response.includes("MATCH COMERCIAL DETECTADO") || result.response.includes("MATCH DETECTADO") || result.response.includes("MATCH INTELIGENTE DETECTADO"));
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
    const shouldSendGroup = isGroup && (isMatch || isConsultation || isViolation);
    const shouldSendDMDirect = !isGroup && !result.shouldSendDM;
    if ((shouldSendGroup || shouldSendDMDirect) && result.response && result.response.trim() !== "") {
      const mentions = Array.from(/* @__PURE__ */ new Set([...result.mentions || [], senderId]));
      const options = {
        mentions: isGroup ? mentions : []
      };
      if (isViolation && originalMsg) {
        options.quotedMessageId = originalMsg.id._serialized;
      }
      await this.queuedSend(chatId, result.response, options);
      await this.logToDb(senderId, "janIA", result.response);
      if (wantsVoice || result.wantsVoice) {
        console.log(`[TTS] Generando respuesta de voz para ${chatId}...`);
        const voiceText = result.voiceResponse || result.response;
        const media = await textToSpeechMedia(voiceText);
        if (media) {
          await this.queuedSend(chatId, media, { sendAudioAsVoice: true });
          console.log(`[TTS] Respuesta de voz enviada con \xE9xito a ${chatId}.`);
        }
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
    if (isGroup && originalMsg) {
      try {
        let reaction = result.reactionEmoji;
        const isBuzonOrCirculo = chatId === this.buzonGroupId || chatId === this.circuloGroupId;
        if ((result.classification === "INMUEBLE" || result.classification === "REQUERIMIENTO" || result.classification === "DATOS_INCOMPLETOS") && !isBuzonOrCirculo) {
          reaction = "\u2705";
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
          await originalMsg.react(reaction);
        }
      } catch (e) {
        console.error("[React-Error] Fallo al reaccionar al mensaje original:", e);
      }
    }
    if (result.shouldSendDM) {
      const dmMsg = result.dmResponse || result.response;
      if (dmMsg && dmMsg.trim() !== "") {
        if (isGroup) {
          if (result.classification === "DATOS_INCOMPLETOS") {
            await this.queuedSend(senderId, dmMsg);
            await this.logToDb(senderId, "janIA", `[DM-Incompleto] ${dmMsg}`);
            if (wantsVoice || result.wantsVoice) {
              console.log(`[TTS] Generando respuesta de voz (Incompleto) para ${senderId}...`);
              const voiceText = result.voiceResponse || dmMsg;
              const media = await textToSpeechMedia(voiceText);
              if (media) {
                await this.queuedSend(senderId, media, { sendAudioAsVoice: true });
              }
            }
          }
        } else {
          const options = {};
          if (result.dmShouldReply && originalMsg) {
            options.quotedMessageId = originalMsg.id._serialized;
          }
          await this.queuedSend(senderId, dmMsg, options);
          await this.logToDb(senderId, "janIA", `[DM] ${dmMsg}`);
          if (wantsVoice || result.wantsVoice) {
            console.log(`[TTS] Generando respuesta de voz para ${senderId}...`);
            const voiceText = result.voiceResponse || dmMsg;
            const media = await textToSpeechMedia(voiceText);
            if (media) {
              await this.queuedSend(senderId, media, { sendAudioAsVoice: true });
              console.log(`[TTS] Respuesta de voz enviada con \xE9xito a ${senderId}.`);
            }
          }
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
      let conv = await db.select().from(conversations).where(eq10(conversations.sessionId, senderId)).limit(1);
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
      }).where(eq10(conversations.id, conversationId));
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
    } else if (text2.includes("anuncia")) await this.sendAnuncioComision();
    else if (text2.includes("dipava")) await this.sendApologyDeLaPava();
    else if (text2.includes("retorno")) await this.sendAnuncioRetorno();
  }
  // --- MÉTODOS DE BROADCAST ---
  async sendBatchWelcome() {
    const count = this.pendingWelcomeCount;
    this.pendingWelcomeCount = 0;
    this.pendingWelcomeJids = [];
    this.saveCounter();
    try {
      const welcome = await generateWelcomeMessage(count);
      await this.queuedSend(this.targetGroupId, welcome);
    } catch (e) {
      console.error("[Whatsapp-Bot] Error in sendBatchWelcome:", e.message);
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
    const imgPath = path3.resolve("./client/public/jania_perfil.png");
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
  async sendToGroup(text2, mediaPath, mentions) {
    try {
      const options = { mentions: mentions || [] };
      if (mediaPath) {
        const media = MessageMedia.fromFilePath(path3.resolve(mediaPath));
        await this.queuedSend(this.targetGroupId, media, { ...options, caption: text2 });
      } else {
        await this.queuedSend(this.targetGroupId, text2, options);
      }
    } catch (e) {
      console.error("[WHATSAPP-BOT] Error enviando mensaje al grupo:", e);
    }
  }
  async broadcastToAllGroups(text2, mediaPath, mentions) {
    const groups = [this.targetGroupId, this.buzonGroupId, this.circuloGroupId];
    for (const group of groups) {
      try {
        const options = { mentions: mentions || [] };
        if (mediaPath) {
          const media = MessageMedia.fromFilePath(path3.resolve(mediaPath));
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
        if (mediaPath && fs2.existsSync(path3.resolve(mediaPath))) {
          const media = MessageMedia.fromFilePath(path3.resolve(mediaPath));
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
        if (mediaPath && fs2.existsSync(path3.resolve(mediaPath))) {
          const media = MessageMedia.fromFilePath(path3.resolve(mediaPath));
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
      const messages2 = await chat.fetchMessages({ limit: 1500 });
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
      const outputPath = path3.join(process.cwd(), "recent_joins.txt");
      fs2.writeFileSync(outputPath, fileContent, "utf8");
      console.log(`[WHATSAPP-BOT] \xA1Listado exportado con \xE9xito a ${outputPath}!`);
    } catch (err) {
      console.error("[WHATSAPP-BOT] Error exportando uniones:", err.message || err);
    }
  }
  initialize() {
    this.client.initialize().catch((err) => {
      console.error("[WHATSAPP-BOT] Error cr\xEDtico durante la inicializaci\xF3n de whatsapp-web.js:", err);
    });
  }
};
var whatsappBot = new WhatsAppBot();

// server/_core/cronService.ts
init_db();
init_schema();
import cron from "node-cron";
import { gte as gte2, and as and5, eq as eq11, sql as sql4 } from "drizzle-orm";
function initCronScheduler() {
  console.log("[CRON-SERVICE] Inicializando orquestador de agendas automatizadas (Modo Optimizado dos veces al d\xEDa)...");
  cron.schedule("30 9 * * *", async () => {
    console.log("[CRON-SERVICE] Generando y enviando Mensaje Din\xE1mico de la Ma\xF1ana...");
    try {
      const prompt = `[MENSAJE INFORMATIVO/EDUCATIVO DE LA MA\xD1ANA] Genera un post corto y elocuente sobre c\xF3mo usar a JanIA v2.0 (CRM, OCR, audio), geocodificaci\xF3n de ubicaci\xF3n exacta, reglas de strikes del grupo, o consejos comerciales. S\xE9 creativo y variado. Usa emojis de forma ordenada. Incluye el link de Google Reviews (https://g.page/r/CctNbwU6UpX5EBM/review) motivando al compromiso de honor si cierran un match.`;
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "Eres JanIA, la mente de inteligencia artificial de la red inmobiliaria colaborativa VECY Network en Colombia." },
          { role: "user", content: prompt }
        ]
      });
      const content = response.choices[0]?.message?.content;
      if (content && content.trim() !== "") {
        await whatsappBot.broadcastToAllGroups(content);
      }
    } catch (e) {
      console.error("\u274C Error al generar mensaje din\xE1mico de la ma\xF1ana:", e.message);
    }
  });
  cron.schedule("0 18 * * *", async () => {
    console.log("[CRON-SERVICE] Generando y enviando Mensaje Din\xE1mico de la Tarde...");
    try {
      const prompt = `[MENSAJE MOTIVACIONAL DE LA TARDE] Genera un post corto de motivaci\xF3n y tips comerciales para cerrar el d\xEDa en VECY Network. Recuerda que no cobramos comisiones. Usa emojis de forma atractiva. Invita a calificar a JanIA con 5 estrellas si han tenido \xE9xito con un match, como parte de nuestro compromiso de honor: https://g.page/r/CctNbwU6UpX5EBM/review`;
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "Eres JanIA, la mente de inteligencia artificial de la red inmobiliaria colaborativa VECY Network en Colombia." },
          { role: "user", content: prompt }
        ]
      });
      const content = response.choices[0]?.message?.content;
      if (content && content.trim() !== "") {
        await whatsappBot.broadcastToAllGroups(content);
      }
    } catch (e) {
      console.error("\u274C Error al generar mensaje din\xE1mico de la tarde:", e.message);
    }
  });
}

// server/_core/index.ts
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
  app.get("/api/send-comeback", (req, res) => {
    try {
      if (!whatsappBot.isReady) {
        return res.status(503).send("El bot de WhatsApp no est\xE1 listo todav\xEDa. Intenta en unos segundos.");
      }
      whatsappBot.sendAnuncioRetorno().catch((err) => {
        console.error("Error al enviar anuncio de retorno:", err);
      });
      res.send("Anuncio de retorno encolado exitosamente.");
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  app.get("/api/find-active-group", async (req, res) => {
    try {
      if (!whatsappBot.isReady) {
        return res.status(503).send("El bot de WhatsApp no est\xE1 listo todav\xEDa. Intenta en unos segundos.");
      }
      const client = whatsappBot.client;
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
      if (!whatsappBot.isReady) {
        return res.status(503).send("El bot de WhatsApp no est\xE1 listo todav\xEDa. Intenta en unos segundos.");
      }
      const client = whatsappBot.client;
      if (!client) {
        return res.status(400).send("No client available");
      }
      const targetGroupId = whatsappBot.targetGroupId;
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
      if (!whatsappBot.isReady) {
        return res.status(503).send("El bot no est\xE1 listo.");
      }
      const client = whatsappBot.client;
      const targetGroupId = whatsappBot.targetGroupId;
      const buzonGroupId = whatsappBot.buzonGroupId;
      const circuloGroupId = whatsappBot.circuloGroupId;
      const groups = [
        { name: "VECY INMUEBLES NETWORK", id: targetGroupId },
        { name: "Buz\xF3n de Consultor\xEDa", id: buzonGroupId },
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
  app.get("/api/trigger-reaction-response", async (req, res) => {
    try {
      if (!whatsappBot.isReady) {
        return res.status(503).send("El bot no est\xE1 listo.");
      }
      const client = whatsappBot.client;
      const targetGroupId = whatsappBot.targetGroupId || "120363260108880069@g.us";
      const chat = await client.getChatById(targetGroupId);
      const msgs = await chat.fetchMessages({ limit: 100 });
      let summaryMsg = null;
      for (const m of msgs) {
        if (m.fromMe && m.body && m.body.includes("RESUMEN: \xA1JANIA V2.0 ACTIVA EN LA RED!")) {
          summaryMsg = m;
          break;
        }
      }
      if (summaryMsg) {
        const senderId = "573118588254@c.us";
        const realName = "trato hecho Bienes raices";
        const promptContext = `[REACCI\xD3N DE BURLA/SARCASMO]: El usuario @573118588254 (${realName}) ha reaccionado con el emoji \u{1F602} a tu mensaje: "${summaryMsg.body}". Genera una respuesta en el grupo dirigi\xE9ndote a este aliado/colega. Responde de manera profesional, sofisticada, \xE9tica y con sutil auto-defensa. Demuestra con altura y elegancia que la tecnolog\xEDa seria y la colaboraci\xF3n estructurada es el camino para cerrar negocios, debatiendo con ingenio pero con respeto. Usa emojis.`;
        const result = await processWhatsAppMessage(promptContext, senderId, realName, false, [], void 0, void 0, true);
        if (result && result.response && result.response.trim() !== "") {
          await whatsappBot.queuedSend(targetGroupId, result.response, {
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
    console.log("Iniciando WhatsApp Bot...");
    whatsappBot.initialize();
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
    console.error("[SYSTEM] Error al cerrar el cliente de WhatsApp:", err);
  }
  console.log("[SYSTEM] Suite finalizada exitosamente. Hasta pronto.");
  process.exit(0);
};
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
startServer().catch(console.error);
