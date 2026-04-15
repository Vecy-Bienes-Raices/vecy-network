import { serial, integer, pgEnum, pgTable, text, timestamp, varchar, decimal, boolean, jsonb } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "janIA", "system", "admin", "agent"]);
export const propertyTypeEnum = pgEnum("propertyType", ["apartment", "house", "building", "warehouse", "farm", "hotel", "office", "land", "commercial", "loft"]);
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


/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  documentType: varchar("documentType", { length: 50 }),
  documentNumber: varchar("documentNumber", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  vPoints: integer("vPoints").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================
// REAL ESTATE TABLES FOR JANÍA
// ============================================

/**
 * Properties table - Stores all real estate listings
 */
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  pricePerSqm: decimal("pricePerSqm", { precision: 10, scale: 2 }),
  location: varchar("location", { length: 255 }).notNull(),
  zone: varchar("zone", { length: 100 }).notNull(), // Zona Rosa, Chapinero, Usaquén, etc.
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  propertyType: propertyTypeEnum("propertyType").notNull(),
  agentId: integer("agentId").references(() => users.id), // Captador Oficial
  matriculaInmobiliaria: varchar("matriculaInmobiliaria", { length: 100 }).unique(), // UNIQUE anti-bypass
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  garages: integer("garages"),
  stratum: integer("stratum"),
  floor: integer("floor"),
  areaSquareMeters: decimal("areaSquareMeters", { precision: 10, scale: 2 }),
  areaPrivateSquareMeters: decimal("areaPrivateSquareMeters", { precision: 10, scale: 2 }),
  yearBuilt: integer("yearBuilt"),
  wildcardFeature: varchar("wildcardFeature", { length: 255 }),
  adminFee: decimal("adminFee", { precision: 15, scale: 2 }),
  commissionPercent: decimal("commissionPercent", { precision: 5, scale: 2 }),
  mandateStatus: mandateStatusEnum("mandateStatus").default("pending"),
  mandateType: mandateTypeEnum("mandateType"),
  amenities: jsonb("amenities"), // JSON array of amenities
  images: jsonb("images"), // JSON array of image URLs
  propertyDetails: jsonb("propertyDetails"), // Polymorphic JSON for property type-specific variables
  featured: boolean("featured").default(false),
  available: boolean("available").default(true),
  sourceRepository: varchar("sourceRepository", { length: 255 }), // GitHub repository name
  lastSyncedAt: timestamp("lastSyncedAt"), // Last sync from GitHub
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

/**
 * Leads table - Stores customer inquiries and requests
 */
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  documentNumber: varchar("documentNumber", { length: 100 }), // Cédula para soporte legal
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  inquiryType: inquiryTypeEnum("inquiryType").notNull(),
  budget: varchar("budget", { length: 100 }),
  preferredZones: jsonb("preferredZones"), // JSON array of zones
  propertyType: varchar("propertyType", { length: 100 }),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  message: text("message"),
  status: leadStatusEnum("status").default("new").notNull(),
  source: varchar("source", { length: 100 }), // janIA, website, phone, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Conversations table - Stores JanIA chat conversations
 */
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  leadId: integer("leadId"),
  userId: varchar("userId", { length: 255 }), // Anonymous or authenticated user ID
  sessionId: varchar("sessionId", { length: 255 }).notNull(),
  topic: varchar("topic", { length: 255 }), // buying, selling, investing, general, etc.
  messageCount: integer("messageCount").default(0),
  lastMessage: text("lastMessage"),
  status: conversationStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Messages table - Stores individual messages in conversations
 */
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversationId").notNull(),
  role: roleEnum("role").notNull(),
  content: text("content").notNull(),
  messageType: messageTypeEnum("messageType").default("text").notNull(),
  attachments: jsonb("attachments"), // JSON array of attachment URLs
  metadata: jsonb("metadata"), // Additional metadata (e.g., transcription, analysis)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Property Matches table - Stores AI-generated property matches for leads
 */
export const propertyMatches = pgTable("propertyMatches", {
  id: serial("id").primaryKey(),
  leadId: integer("leadId").notNull(),
  propertyId: integer("propertyId").notNull(),
  matchScore: decimal("matchScore", { precision: 5, scale: 2 }), // 0-100
  matchReason: text("matchReason"), // Why this property matches
  priceRecommendation: decimal("priceRecommendation", { precision: 15, scale: 2 }),
  status: matchStatusEnum("status").default("suggested").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PropertyMatch = typeof propertyMatches.$inferSelect;
export type InsertPropertyMatch = typeof propertyMatches.$inferInsert;

/**
 * Market Analysis table - Stores market analysis data for zones
 */
export const marketAnalysis = pgTable("marketAnalysis", {
  id: serial("id").primaryKey(),
  zone: varchar("zone", { length: 100 }).notNull().unique(),
  averagePrice: decimal("averagePrice", { precision: 15, scale: 2 }),
  averagePricePerSqm: decimal("averagePricePerSqm", { precision: 10, scale: 2 }),
  priceChange12Months: decimal("priceChange12Months", { precision: 5, scale: 2 }), // Percentage
  demandLevel: demandLevelEnum("demandLevel"),
  supplyLevel: supplyLevelEnum("supplyLevel"),
  marketTrend: marketTrendEnum("marketTrend"),
  investmentPotential: varchar("investmentPotential", { length: 100 }),
  nearbyAmenities: jsonb("nearbyAmenities"), // JSON array of nearby amenities
  transportAccess: text("transportAccess"), // Description of transport access
  safetyRating: decimal("safetyRating", { precision: 3, scale: 1 }), // 1-10
  lastUpdated: timestamp("lastUpdated").defaultNow().notNull(),
});

export type MarketAnalysis = typeof marketAnalysis.$inferSelect;
export type InsertMarketAnalysis = typeof marketAnalysis.$inferInsert;

/**
 * Favorites table - Stores user favorite properties
 */
export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: varchar("userId", { length: 255 }).notNull(),
  propertyId: integer("propertyId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

/**
 * Property Images table - Stores images for properties
 */
export const propertyImages = pgTable("propertyImages", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyId").notNull(),
  imageUrl: text("imageUrl").notNull(), // S3 URL
  thumbnailUrl: text("thumbnailUrl"), // Thumbnail S3 URL
  caption: varchar("caption", { length: 255 }),
  displayOrder: integer("displayOrder").default(0), // Order in gallery
  isMainImage: boolean("isMainImage").default(false), // Primary image for property
  uploadedBy: varchar("uploadedBy", { length: 255 }), // User who uploaded
  fileSize: integer("fileSize"), // File size in bytes
  mimeType: varchar("mimeType", { length: 50 }), // image/jpeg, image/png, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PropertyImage = typeof propertyImages.$inferSelect;
export type InsertPropertyImage = typeof propertyImages.$inferInsert;

/**
 * Referral Links table - Stores stealth referral links for agents
 */
export const referralLinks = pgTable("referralLinks", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyId").notNull(),
  agentId: integer("agentId").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(), // the ?ref=token content
  clicks: integer("clicks").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReferralLink = typeof referralLinks.$inferSelect;
export type InsertReferralLink = typeof referralLinks.$inferInsert;

/**
 * Client Ledger table - Immutable record of client generation for anti-bypass tracking
 */
export const clientLedger = pgTable("clientLedger", {
  id: serial("id").primaryKey(),
  leadId: integer("leadId").notNull(), // Form submission
  agentId: integer("agentId").notNull(), // Link owner (user ID)
  propertyId: integer("propertyId").notNull(), // Intersecting property
  token: varchar("token", { length: 255 }).notNull(), // The source Stealth Link
  status: statusEnum("status").default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(), // Immutably recorded
});

export type ClientLedger = typeof clientLedger.$inferSelect;
export type InsertClientLedger = typeof clientLedger.$inferInsert;