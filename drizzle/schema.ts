import { serial, integer, pgEnum, pgTable, text, timestamp, varchar, decimal, boolean, jsonb } from "drizzle-orm/pg-core";

// Enums expanded based on VECY CORE Blueprint
export const roleEnum = pgEnum("role", ["user", "janIA", "system", "admin", "agent"]);
export const propertyTypeEnum = pgEnum("propertyType", [
  "apartment", "house", "building", "warehouse", "farm", "hotel", 
  "office", "land", "commercial", "loft", "consultorio"
]);
export const transactionTypeEnum = pgEnum("transactionType", ["venta", "arriendo", "arriendo_temporal", "permuta", "aporte"]);
export const mandateStatusEnum = pgEnum("mandateStatus", ["pending", "signed"]);
export const mandateTypeEnum = pgEnum("mandateType", ["direct_owner", "agent_electronic_link", "agent_uploaded_paper"]);
export const inquiryTypeEnum = pgEnum("inquiryType", ["buy", "sell", "rent", "invest", "general"]);
export const leadStatusEnum = pgEnum("leadStatus", ["new", "contacted", "qualified", "converted", "rejected"]);
export const conversationStatusEnum = pgEnum("conversationStatus", ["active", "archived", "converted"]);
export const matchStatusEnum = pgEnum("matchStatus", ["suggested", "interested", "viewed", "rejected", "converted"]);
export const statusEnum = pgEnum("status", ["active", "expired", "converted"]);
export const messageTypeEnum = pgEnum("messageType", ["text", "image", "audio", "file", "video"]);
export const demandLevelEnum = pgEnum("demandLevel", ["low", "medium", "high", "very_high"]);
export const supplyLevelEnum = pgEnum("supplyLevel", ["low", "medium", "high", "very_high"]);
export const marketTrendEnum = pgEnum("marketTrend", ["declining", "stable", "growing", "booming"]);
export const currencyEnum = pgEnum("currency", ["COP", "USD"]);

/**
 * Users table with referral points (vPoints)
 */
export const users = pgTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Properties table - Exhaustive data dictionary implementation
 */
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  propertyType: propertyTypeEnum("propertyType").notNull(),
  transactionType: transactionTypeEnum("transactionType").notNull().default("venta"),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  currency: currencyEnum("currency").default("COP").notNull(),
  pricePerSqm: decimal("pricePerSqm", { precision: 10, scale: 2 }),
  city: varchar("city", { length: 100 }).notNull().default("Bogotá"),
  zone: varchar("zone", { length: 100 }).notNull(), // Barrio/Sector (Candidate for refactor to addressNeighborhood)
  addressCity: varchar("address_city", { length: 100 }),
  addressLocality: varchar("address_locality", { length: 100 }), // ej. Usaquén, Suba
  addressNeighborhood: varchar("address_neighborhood", { length: 150 }), 
  location: varchar("location", { length: 255 }), // Dirección (opcional/interna)
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  coordinates: jsonb("coordinates"), // { lat, lng } (Candidate for refactor to replace lat/lng)
  agentId: integer("agentId").references(() => users.id), // Captador Oficial
  matriculaInmobiliaria: varchar("matriculaInmobiliaria", { length: 100 }).unique(),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  garages: integer("garages"),
  stratum: integer("stratum"),
  floorDetail: text("floor_detail"),
  areaTotal: decimal("areaTotal", { precision: 10, scale: 2 }),
  areaPrivate: decimal("areaPrivate", { precision: 10, scale: 2 }),
  yearBuilt: integer("yearBuilt"),
  antiguedadAnos: integer("antiguedadAnos"), // 0, 1-5, 5-10, 10+
  isAmoblado: boolean("isAmoblado").default(false),
  adminFee: decimal("adminFee", { precision: 15, scale: 2 }),
  commissionPercent: decimal("commissionPercent", { precision: 5, scale: 2 }),
  mandateStatus: mandateStatusEnum("mandateStatus").default("pending"),
  mandateType: mandateTypeEnum("mandateType"),
  amenities: jsonb("amenities"), // { balcon: true, piscina: false, etc. }
  images: jsonb("images"), // Array of S3/Supabase URLs
  videoUrl: text("videoUrl"),
  externalUrl: text("externalUrl"), // URL original del scraping (Wasi, etc.)
  rawText: text("rawText"), // Texto original procesado por JanIA
  featured: boolean("featured").default(false),
  available: boolean("available").default(true),
  idUsuarioWhatsapp: varchar("idUsuarioWhatsapp", { length: 100 }),
  sourceRepository: varchar("sourceRepository", { length: 255 }),
  lastSyncedAt: timestamp("lastSyncedAt"),
  // Array of all accepted transaction types (e.g. ["venta","permuta"] or ["venta","aporte"])
  acceptedTransactionTypes: text("accepted_transaction_types").array(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

/**
 * Requirements (Demandas) - Table to facilitate matching
 */
export const requirements = pgTable("requirements", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id),
  name: varchar("name", { length: 255 }),
  tipoInmuebleDeseado: propertyTypeEnum("tipoInmuebleDeseado").notNull(),
  tipoNegocioDeseado: transactionTypeEnum("tipoNegocioDeseado").notNull(),
  // Array of all accepted transaction types for matching flexibility (e.g. ["venta","permuta"])
  tiposNegocioAceptados: text("tipos_negocio_aceptados").array(),
  ciudadDeseada: varchar("ciudadDeseada", { length: 100 }).notNull().default("Bogotá"),
  zonaDeseada: varchar("zonaDeseada", { length: 100 }), // Candidate for refactor to addressNeighborhood
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
  estratoDeseado: jsonb("estratoDeseado"), // Array: [3, 4, 5]
  amobladoDeseado: boolean("amobladoDeseado"),
  caracteristicasDeseadas: jsonb("caracteristicasDeseadas"),
  status: statusEnum("status").default("active"),
  idUsuarioWhatsapp: varchar("idUsuarioWhatsapp", { length: 100 }),
  rawText: text("rawText"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Requirement = typeof requirements.$inferSelect;
export type InsertRequirement = typeof requirements.$inferInsert;

/**
 * Leads table - Customer inquiries linked to properties or generic
 */
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  documentNumber: varchar("documentNumber", { length: 100 }),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  inquiryType: inquiryTypeEnum("inquiryType").notNull(),
  message: text("message"),
  status: leadStatusEnum("status").default("new").notNull(),
  source: varchar("source", { length: 100 }), // janIA, website, whatsapp
  propertyId: integer("propertyId").references(() => properties.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Conversations table - AI chat tracking
 */
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  leadId: integer("leadId").references(() => leads.id),
  userId: varchar("userId", { length: 255 }), 
  sessionId: varchar("sessionId", { length: 255 }).notNull(),
  status: conversationStatusEnum("status").default("active").notNull(),
  lastMessage: text("lastMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Messages table - Individual chat messages
 */
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversationId").references(() => conversations.id).notNull(),
  role: roleEnum("role").notNull(),
  content: text("content").notNull(),
  messageType: messageTypeEnum("messageType").default("text").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Property Matches table - AI-generated matches
 */
export const propertyMatches = pgTable("propertyMatches", {
  id: serial("id").primaryKey(),
  requirementId: integer("requirementId").references(() => requirements.id).notNull(),
  propertyId: integer("propertyId").references(() => properties.id).notNull(),
  matchScore: decimal("matchScore", { precision: 5, scale: 2 }), // 0-100
  matchReason: text("matchReason"),
  status: matchStatusEnum("status").default("suggested").notNull(),
  ownerConfirmed: boolean("ownerConfirmed").default(false).notNull(),
  seekerConfirmed: boolean("seekerConfirmed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Pending Sessions table - Persisting WhatsApp conversation context
 */
export const pendingSessions = pgTable("pendingSessions", {
  jid: varchar("jid", { length: 255 }).primaryKey(),
  sessionData: jsonb("sessionData").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});


/**
 * Referral Links table - Stealth links for agents/affiliates
 */
export const referralLinks = pgTable("referralLinks", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyId").references(() => properties.id).notNull(),
  agentId: integer("agentId").references(() => users.id).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(), // Unique referral slug
  clicks: integer("clicks").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Shares table - Tracking viral activity for the multilevel points system
 */
export const shares = pgTable("shares", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyId").references(() => properties.id).notNull(),
  agentId: integer("agentId").references(() => users.id).notNull(),
  platform: varchar("platform", { length: 50 }).notNull(), // WhatsApp, Facebook, Instagram, etc.
  shareLink: text("shareLink"), // Optional: link to the specific post
  pointsAwarded: integer("pointsAwarded").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Client Ledger table - Commissions and attribution tracking
 */
export const clientLedger = pgTable("clientLedger", {
  id: serial("id").primaryKey(),
  leadId: integer("leadId").references(() => leads.id).notNull(),
  agentId: integer("agentId").references(() => users.id).notNull(),
  propertyId: integer("propertyId").references(() => properties.id).notNull(),
  referralToken: varchar("referralToken", { length: 255 }),
  vPointsEarned: integer("vPointsEarned").default(0),
  shareId: integer("shareId").references(() => shares.id), // Link to the specific share that brought the lead
  status: statusEnum("status").default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Property Images table - Individual image tracking
 */
export const propertyImages = pgTable("propertyImages", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PropertyImage = typeof propertyImages.$inferSelect;
export type InsertPropertyImage = typeof propertyImages.$inferInsert;

// Placeholder tables for existing remote tables to avoid Drizzle push prompts
export const marketAnalysis = pgTable("marketAnalysis", {
  id: serial("id").primaryKey(),
});

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
});

/**
 * Colombia Geography table - Official DANE DIVIPOLA codes for municipalities
 */
export const colombiaGeography = pgTable("colombia_geography", {
  id: serial("id").primaryKey(),
  codeDept: varchar("code_dept", { length: 5 }).notNull(),
  nameDept: varchar("name_dept", { length: 100 }).notNull(),
  codeMun: varchar("code_mun", { length: 10 }).notNull().unique(),
  nameMun: varchar("name_mun", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  longitude: varchar("longitude", { length: 50 }),
  latitude: varchar("latitude", { length: 50 }),
});

export type ColombiaGeography = typeof colombiaGeography.$inferSelect;
export type InsertColombiaGeography = typeof colombiaGeography.$inferInsert;