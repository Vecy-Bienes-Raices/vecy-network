import { serial, integer, pgEnum, pgTable, text, timestamp, varchar, decimal, boolean, jsonb, bigint, uuid, index, uniqueIndex } from "drizzle-orm/pg-core";

// Enums expanded based on VECY CORE Blueprint
export const roleEnum = pgEnum("role", ["user", "janIA", "system", "admin", "agent"]);
export const propertyTypeEnum = pgEnum("propertyType", [
  "apartment", "house", "building", "warehouse", "farm", "hotel", 
  "office", "land", "commercial", "loft", "consultorio", "cabin"
]);
export const transactionTypeEnum = pgEnum("transactionType", [
  "venta",
  "arriendo",
  "venta_o_arriendo",
  "arriendo_temporal",
  "arriendo_con_opcion_de_compra",
  "permuta",
  "venta_permuta",
  "aporte"
]);
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
  planCode: varchar("plan_code", { length: 50 }).default("free").notNull(),
  subscriptionStatus: varchar("subscription_status", { length: 30 }).default("active").notNull(),
  defaultAgencyId: integer("default_agency_id"),
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
  rentPrice: decimal("rent_price", { precision: 15, scale: 2 }), // Precio de arriendo cuando transactionType = venta_o_arriendo
  currency: currencyEnum("currency").default("COP").notNull(),
  pricePerSqm: decimal("pricePerSqm", { precision: 10, scale: 2 }),
  city: varchar("city", { length: 100 }),
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
  garageType: text("garageType"), // "independiente" | "lineal" | "mixto" | null
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
  nombreUsuarioWhatsapp: varchar("nombre_usuario_whatsapp", { length: 255 }),
  sourceRepository: varchar("sourceRepository", { length: 255 }),
  lastSyncedAt: timestamp("lastSyncedAt"),
  // Array of all accepted transaction types (e.g. ["venta","permuta"] or ["venta","aporte"])
  acceptedTransactionTypes: text("accepted_transaction_types").array(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  fechaExtraccion: timestamp("fecha_extraccion").defaultNow(),
  origenTipo: varchar("origen_tipo", { length: 50 }),
  origenId: varchar("origen_id", { length: 100 }),
  origenNombre: varchar("origen_nombre", { length: 255 }),
  calificacion: varchar("calificacion", { length: 50 }),
  portal: varchar("portal", { length: 50 }),
  externalListingId: varchar("external_listing_id", { length: 100 }),
  canonicalExternalId: varchar("canonical_external_id", { length: 150 }).unique(),
  enlaceOrigen: text("enlace_origen"),
  fechaPrimeraPublicacion: timestamp("fecha_primera_publicacion").defaultNow(),
  fechaUltimaPublicacion: timestamp("fecha_ultima_publicacion").defaultNow(),
  republicacionesCount: integer("republicaciones_count").default(0).notNull(),
  estadoComercial: varchar("estado_comercial", { length: 50 }).default("ACTIVO").notNull(),
  ultimaActividad: varchar("ultima_actividad", { length: 50 }).default("PUBLICACIÓN").notNull(),
  vigenciaIa: varchar("vigencia_ia", { length: 50 }).default("VIGENTE").notNull(),
  aceptaTerceria: boolean("acepta_terceria").default(true),
  standByDirectoVecy: boolean("stand_by_directo_vecy").default(false),
  agencyId: integer("agency_id"),
  republishToVecyStore: boolean("republish_to_vecy_store").default(true).notNull(),
  visibilityScope: varchar("visibility_scope", { length: 30 }).default("public_and_agent").notNull(),
  sourcePortal: varchar("source_portal", { length: 80 }),
  sourceUrl: text("source_url"),
  rawImportPayload: jsonb("raw_import_payload"),
}, (table) => [
  index("idx_properties_available").on(table.available),
  index("idx_properties_tx_type").on(table.transactionType),
  index("idx_properties_agency_id").on(table.agencyId),
  index("idx_properties_visibility_scope").on(table.visibilityScope),
]);

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
  ciudadDeseada: varchar("ciudadDeseada", { length: 100 }).default("Bogotá").notNull(),
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
  adminFeeMax: decimal("adminFeeMax", { precision: 15, scale: 2 }), // Admón mensual máxima aceptada (null = N/A o sin restricción)
  estratoDeseado: jsonb("estratoDeseado"), // Array: [3, 4, 5]
  amobladoDeseado: boolean("amobladoDeseado"),
  caracteristicasDeseadas: jsonb("caracteristicasDeseadas"),
  status: statusEnum("status").default("active"),
  idUsuarioWhatsapp: varchar("idUsuarioWhatsapp", { length: 100 }),
  nombreUsuarioWhatsapp: varchar("nombre_usuario_whatsapp", { length: 255 }),
  rawText: text("rawText"),
  enlaceOrigen: text("enlace_origen"),
  calificacion: varchar("calificacion", { length: 50 }),
  fechaPrimeraPublicacion: timestamp("fecha_primera_publicacion").defaultNow(),
  fechaUltimaPublicacion: timestamp("fecha_ultima_publicacion").defaultNow(),
  republicacionesCount: integer("republicaciones_count").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  fechaExtraccion: timestamp("fecha_extraccion").defaultNow(),
  origenTipo: varchar("origen_tipo", { length: 50 }),
  origenId: varchar("origen_id", { length: 100 }),
  origenNombre: varchar("origen_nombre", { length: 255 }),
  aceptaTerceria: boolean("acepta_terceria").default(true),
  standByDirectoVecy: boolean("stand_by_directo_vecy").default(false),
  agencyId: integer("agency_id"),
  publishToReqStore: boolean("publish_to_req_store").default(true).notNull(),
  anonymizedPublicSummary: text("anonymized_public_summary"),
}, (table) => [
  index("idx_requirements_status").on(table.status),
  index("idx_requirements_agency_id").on(table.agencyId),
]);

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
  source: varchar("source", { length: 100 }), // janIA, website, whatsapp, microsite, stealth_link, agenda, manual
  propertyId: integer("propertyId").references(() => properties.id),
  agentId: integer("agent_id").references(() => users.id),
  agencyId: integer("agency_id"),
  assignedAgentId: integer("assigned_agent_id").references(() => users.id),
  requirementId: integer("requirement_id").references(() => requirements.id),
  pipelineStage: varchar("pipeline_stage", { length: 40 }).default("nuevo").notNull(),
  temperature: varchar("temperature", { length: 20 }).default("warm").notNull(),
  estimatedBudget: decimal("estimated_budget", { precision: 15, scale: 2 }),
  nextFollowUpAt: timestamp("next_follow_up_at"),
  lastContactedAt: timestamp("last_contacted_at"),
  tags: jsonb("tags").$type<string[]>().default([]).notNull(),
  notes: text("notes"),
  preferredCity: varchar("preferred_city", { length: 100 }),
  preferredZone: varchar("preferred_zone", { length: 150 }),
  referralToken: varchar("referral_token", { length: 255 }),
  solicitudId: bigint("solicitud_id", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  index("idx_leads_agent_id").on(table.agentId),
  index("idx_leads_agency_id").on(table.agencyId),
  index("idx_leads_pipeline_stage").on(table.pipelineStage),
  index("idx_leads_next_followup").on(table.nextFollowUpAt),
  index("idx_leads_email").on(table.email),
  index("idx_leads_solicitud_id").on(table.solicitudId),
]);

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

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
  matchExplanation: jsonb("matchExplanation"),
  ipc: jsonb("ipc"), // VRIF Core v2.0: { score: number, factors: { matching: number, ... }, version: string, generatedAt: string }
  status: matchStatusEnum("status").default("suggested").notNull(),
  ownerConfirmed: boolean("ownerConfirmed").default(false).notNull(),
  seekerConfirmed: boolean("seekerConfirmed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("idx_property_matches_req_id").on(table.requirementId),
  index("idx_property_matches_prop_id").on(table.propertyId),
  index("idx_property_matches_score").on(table.matchScore),
  index("idx_property_matches_status").on(table.status),
  index("idx_property_matches_created").on(table.createdAt),
]);

/**
 * Notification Logs table - audit trails for match notifications
 */
export const notificationLogs = pgTable("notificationLogs", {
  id: serial("id").primaryKey(),
  matchId: integer("matchId").references(() => propertyMatches.id),
  brokerId: integer("brokerId").references(() => users.id),
  brokerPhone: varchar("brokerPhone", { length: 50 }).notNull(),
  channel: varchar("channel", { length: 50 }).default("whatsapp").notNull(),
  status: varchar("status", { length: 50 }).default("pending").notNull(), // pending | sent | delivered | failed
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  error: text("error"),
  triggerSource: varchar("triggerSource", { length: 100 }).default("match_created"),
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

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  username: text("username"),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  website: text("website"),
  celular: text("celular"),
  tipoDocumento: text("tipo_documento"),
  numeroDocumento: text("numero_documento"),
  tipoCliente: text("tipo_cliente"),
  perfil: text("perfil"),
});

export const counters = pgTable("counters", {
  name: text("name").primaryKey(),
  currentValue: bigint("current_value", { mode: "number" }).notNull(),
});

export const solicitudes = pgTable("solicitudes", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  solicitudId: bigint("solicitud_id", { mode: "number" }),
  solicitanteNombre: text("solicitante_nombre"),
  solicitanteTipoPersona: text("solicitante_tipo_persona"),
  solicitantePerfil: text("solicitante_perfil"),
  solicitanteEmail: text("solicitante_email"),
  solicitanteCelular: text("solicitante_celular"),
  solicitanteTipoDocumento: text("solicitante_tipo_documento"),
  solicitanteNumeroDocumento: text("solicitante_numero_documento"),
  servicioSolicitado: text("servicio_solicitado"),
  nombreInmueble: text("nombre_inmueble"),
  codigoInmueble: text("codigo_inmueble"),
  opcionNegocio: text("opcion_negocio"),
  fechaCitaTexto: text("fecha_cita_texto"),
  horaCita: text("hora_cita"),
  cantidadPersonas: integer("cantidad_personas"),
  interesadoNombre: text("interesado_nombre"),
  interesadoTipoDocumento: text("interesado_tipo_documento"),
  interesadoDocumento: text("interesado_documento"),
  tipoCliente: text("tipo_cliente"),
  acompanantes: jsonb("acompanantes"),
  firmaVirtualBase64: text("firma_virtual_base64"),
  firmaFechahoraAudit: timestamp("firma_fechahora_audit", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }),
  solicitanteRepresentanteLegal: text("solicitante_representante_legal"),
  autorizacion: boolean("autorizacion"),
  agentId: text("agent_id"),
  hasAlertaAntecedentes: boolean("has_alerta_antecedentes"),
  alertaMotivo: text("alerta_motivo"),
  direccionDespachada: boolean("direccion_despachada").default(false),
  direccionDespachadaAt: timestamp("direccion_despachada_at", { withTimezone: true }),
  estado: text("estado").default("confirmada"),
  motivoCancelacion: text("motivo_cancelacion"),
  canceladaAt: timestamp("cancelada_at", { withTimezone: true }),
  reagendadaAt: timestamp("reagendada_at", { withTimezone: true }),
  fechaCitaAnterior: text("fecha_cita_anterior"),
  horaCitaAnterior: text("hora_cita_anterior"),
  asistenciaConfirmada: boolean("asistencia_confirmada").default(false),
  asistenciaConfirmadaAt: timestamp("asistencia_confirmada_at", { withTimezone: true }),
  modalidad: text("modalidad").default("visita_presencial"),
  direccionInmueble: text("direccion_inmueble"),
});

export const securityFlaggedIdentities = pgTable("security_flagged_identities", {
  id: serial("id").primaryKey(),
  documento: varchar("documento", { length: 50 }).notNull(),
  tipoDocumento: varchar("tipo_documento", { length: 50 }),
  nombreCompleto: text("nombre_completo"),
  motivoAlerta: text("motivo_alerta"),
  fuente: varchar("fuente", { length: 100 }),
  solicitudId: bigint("solicitud_id", { mode: "number" }),
  detalles: jsonb("detalles"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type SecurityFlaggedIdentity = typeof securityFlaggedIdentities.$inferSelect;
export type InsertSecurityFlaggedIdentity = typeof securityFlaggedIdentities.$inferInsert;

export const propertyPublicationHistory = pgTable("property_publication_history", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyId").references(() => properties.id).notNull(),
  fecha: timestamp("fecha").defaultNow().notNull(),
  grupo: varchar("grupo", { length: 255 }),
  broker: varchar("broker", { length: 255 }),
  brokerPhone: varchar("broker_phone", { length: 50 }),
  accion: varchar("accion", { length: 50 }).notNull(), // PUBLICADO | REPUBLICADO | ACTUALIZADO | etc.
  portal: varchar("portal", { length: 50 }),
  externalListingId: varchar("external_listing_id", { length: 100 }),
  mensajeWhatsappId: varchar("mensaje_whatsapp_id", { length: 255 }),
  detalles: text("detalles")
}, (table) => [
  index("idx_pub_history_prop_id").on(table.propertyId),
]);

export type PropertyPublicationHistory = typeof propertyPublicationHistory.$inferSelect;
export type InsertPropertyPublicationHistory = typeof propertyPublicationHistory.$inferInsert;

/**
 * ADN del Comportamiento del Agente (userBehavioralFingerprints) - v20.0 Big Tech Intel
 */
export const userBehavioralFingerprints = pgTable("user_behavioral_fingerprints", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id),
  idUsuarioWhatsapp: varchar("idUsuarioWhatsapp", { length: 100 }),
  permuteProfile: varchar("permute_profile", { length: 50 }), // 'cash_only' | 'permuta_fan' | 'pelo_a_pelo_expert' | 'parte_de_pago'
  urgencyIndex: integer("urgency_index").default(0),
  avgPriceRange: jsonb("avg_price_range"),
  topZones: jsonb("top_zones"),
  technicalRigidity: integer("technical_rigidity").default(50), // Exigencia en detalles (1.5 baños, vistas, etc.)
  updatedAt: timestamp("updatedAt").defaultNow()
});

export type UserBehavioralFingerprint = typeof userBehavioralFingerprints.$inferSelect;
export type InsertUserBehavioralFingerprint = typeof userBehavioralFingerprints.$inferInsert;

/**
 * Patrones y Preferencias de Cierre de Agentes (userPatterns) - v20.0 Big Tech Memory
 */
export const userPatterns = pgTable("user_patterns", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id),
  favoriteZones: jsonb("favorite_zones"),
  avgClosingUrgency: integer("avg_urgency").default(50),
  preferredAssetClass: varchar("preferred_class", { length: 50 }), // 'apartment' | 'house' | 'warehouse' | 'commercial'
  updatedAt: timestamp("updatedAt").defaultNow()
});

export type UserPattern = typeof userPatterns.$inferSelect;
export type InsertUserPattern = typeof userPatterns.$inferInsert;

/**
 * Tabla de Equivalencias Aprendidas de Zona (zoneAliases) - v21.15 Addendum v6
 */
export const zoneAliases = pgTable("zone_aliases", {
  id: serial("id").primaryKey(),
  aliasTexto: varchar("alias_texto", { length: 150 }).notNull(),
  ciudad: varchar("ciudad", { length: 100 }).notNull().default("Bogotá"),
  barrioResuelto: varchar("barrio_resuelto", { length: 150 }).notNull(),
  confianza: varchar("confianza", { length: 20 }).default("alta"), // 'alta' | 'media' | 'baja'
  fuente: varchar("fuente", { length: 50 }).default("manual"), // 'manual' | 'geocoding_confirmado' | 'ia_inferido'
  createdAt: timestamp("created_at").defaultNow()
});

export type ZoneAlias = typeof zoneAliases.$inferSelect;
export type InsertZoneAlias = typeof zoneAliases.$inferInsert;

/**
 * Memoria y Diccionario Semántico Evolutivo de JanIA (inmobiliarioLexicon) - v22.5
 */
export const inmobiliarioLexicon = pgTable("inmobiliario_lexicon", {
  id: serial("id").primaryKey(),
  terminoColoquial: varchar("termino_coloquial", { length: 255 }).notNull().unique(),
  categoria: varchar("categoria", { length: 100 }).notNull(), // 'espacio' | 'acabado' | 'infraestructura' | 'negocio' | 'amenidad' | 'equipamiento'
  conceptoCanonico: varchar("concepto_canonico", { length: 150 }).notNull(), // 'cuarto_bano_servicio' | 'cocina_cerrada' | 'acabado_madera' | etc.
  frecuenciaUso: integer("frecuencia_uso").default(1).notNull(),
  ejemplosDetectados: jsonb("ejemplos_detectados"),
  origen: varchar("origen", { length: 50 }).default("ia_autodescubierto").notNull(), // 'ia_autodescubierto' | 'humano_validado'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type InmobiliarioLexicon = typeof inmobiliarioLexicon.$inferSelect;
export type InsertInmobiliarioLexicon = typeof inmobiliarioLexicon.$inferInsert;

/**
 * Bucle de Retroalimentación y Aprendizaje de Brokers (matchFeedback) - v22.5
 */
export const matchFeedback = pgTable("match_feedback", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").references(() => propertyMatches.id),
  propertyId: integer("property_id").references(() => properties.id),
  requirementId: integer("requirement_id").references(() => requirements.id),
  action: varchar("action", { length: 50 }).notNull(), // 'exitoso' | 'rechazado' | 'en_negociacion'
  motivoRechazo: text("motivo_rechazo"),
  notasBroker: text("notas_broker"),
  ajustesGuardados: jsonb("ajustes_guardados"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MatchFeedback = typeof matchFeedback.$inferSelect;
export type InsertMatchFeedback = typeof matchFeedback.$inferInsert;

/**
 * Registro y Auditoría de Difusiones Diarias de JanIA (Cero Duplicados & Memoria Temática) - v31.71
 */
export const dailyBroadcasts = pgTable("daily_broadcasts", {
  id: serial("id").primaryKey(),
  dateBogota: varchar("date_bogota", { length: 12 }).notNull(), // 'YYYY-MM-DD'
  targetGroup: varchar("target_group", { length: 50 }).notNull(), // 'grupo2' | 'grupo3'
  tipCategory: varchar("tip_category", { length: 80 }).notNull(), // 'lunes_arranque', 'martes_juridico', etc.
  topicTitle: text("topic_title").notNull(), // Título descriptivo único del tema tratado
  themeKey: varchar("theme_key", { length: 50 }), // 'juridico', 'tributario', 'marketing', etc.
  imageFileName: varchar("image_file_name", { length: 255 }),
  voiceText: text("voice_text"),
  captionText: text("caption_text"),
  status: varchar("status", { length: 20 }).default("completed").notNull(), // 'in_progress' | 'completed' | 'failed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("daily_broadcasts_date_idx").on(table.dateBogota),
  index("daily_broadcasts_target_date_idx").on(table.targetGroup, table.dateBogota),
]);

export type DailyBroadcast = typeof dailyBroadcasts.$inferSelect;
export type InsertDailyBroadcast = typeof dailyBroadcasts.$inferInsert;

/**
 * Directorio Permanente de Asesores e Inmobiliarias (VECY Directory Core) - v31.88
 * Garantiza persistencia indestructible de nombres, teléfonos y LIDs de WhatsApp de brokers.
 */
export const advisors = pgTable("advisors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  normalizedPhone: varchar("normalized_phone", { length: 50 }).notNull().unique(),
  whatsappLids: text("whatsapp_lids").array().default([]), // LIDs asociados de WhatsApp Baileys
  aliases: text("aliases").array().default([]), // Nombres alternativos o pushNames observados
  agency: varchar("agency", { length: 255 }),
  sourceGroup: varchar("source_group", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("advisors_norm_phone_idx").on(table.normalizedPhone),
  index("advisors_name_idx").on(table.name),
]);

export type Advisor = typeof advisors.$inferSelect;
export type InsertAdvisor = typeof advisors.$inferInsert;

/**
 * Registro Permanente de Consultas Prediales (Big Data para Avalúos Inmobiliarios y Leads) - v32.23
 * Almacena el historial de consultas de CHIP, contribuyentes, vigencias y enlaces de descarga oficial.
 */
export const predialConsultations = pgTable("predial_consultations", {
  id: serial("id").primaryKey(),
  chip: varchar("chip", { length: 50 }).notNull(),
  documentType: varchar("document_type", { length: 20 }).default("CC"),
  documentNumber: varchar("document_number", { length: 50 }).notNull(),
  nombreContribuyente: text("nombre_contribuyente"),
  numBp: varchar("num_bp", { length: 50 }),
  anoGravable: varchar("ano_gravable", { length: 10 }).default("2026"),
  queryType: varchar("query_type", { length: 50 }).default("factura"), // "factura" | "certificado_pago"
  downloadUrl: text("download_url"),
  requesterPhone: varchar("requester_phone", { length: 50 }),
  requesterName: text("requester_name"),
  source: varchar("source", { length: 50 }).default("whatsapp_dm"),
  status: varchar("status", { length: 50 }).default("completed"), // "completed" | "paid" | "error"
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("predial_consultations_chip_idx").on(table.chip),
  index("predial_consultations_doc_idx").on(table.documentNumber),
  index("predial_consultations_phone_idx").on(table.requesterPhone),
]);

export type PredialConsultation = typeof predialConsultations.$inferSelect;
export type InsertPredialConsultation = typeof predialConsultations.$inferInsert;

/**
 * Planes SaaS VECY Network (Free $0 hasta <= $200.000 COP/mes)
 */
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  monthlyPriceCop: integer("monthly_price_cop").notNull().default(0),
  annualPriceCop: integer("annual_price_cop").notNull().default(0),
  maxActiveProperties: integer("max_active_properties").notNull().default(5),
  maxActiveRequirements: integer("max_active_requirements").notNull().default(10),
  maxUrlImportsPerMonth: integer("max_url_imports_per_month").notNull().default(3),
  maxTeamSeats: integer("max_team_seats").notNull().default(1),
  customDomainEnabled: boolean("custom_domain_enabled").notNull().default(false),
  privateJaniaEnabled: boolean("private_jania_enabled").notNull().default(false),
  emailCampaignsMonthlyQuota: integer("email_campaigns_monthly_quota").notNull().default(0),
  maxAiMessagesMonth: integer("max_ai_messages_month").notNull().default(0),
  whatsappCloudByoEnabled: boolean("whatsapp_cloud_byo_enabled").notNull().default(false),
  maxCtlStudiesMonth: integer("max_ctl_studies_month").notNull().default(0),
  maxIdentityChecksMonth: integer("max_identity_checks_month").notNull().default(3),
  maxValuationsMonth: integer("max_valuations_month").notNull().default(5),
  autoRepublishStore: boolean("auto_republish_store").notNull().default(true),
  featuresJson: jsonb("features_json"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;

/**
 * Inmobiliarias / Agencias Marca Blanca (<slug>.vecygroup.com o dominio propio)
 */
export const agencies = pgTable("agencies", {
  id: serial("id").primaryKey(),
  ownerUserId: integer("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  brandName: varchar("brand_name", { length: 200 }).notNull(),
  tagline: text("tagline"),
  logoUrl: text("logo_url"),
  primaryColor: varchar("primary_color", { length: 20 }).default("#D4AF37").notNull(),
  secondaryColor: varchar("secondary_color", { length: 20 }).default("#0A0A0A").notNull(),
  customDomain: varchar("custom_domain", { length: 255 }).unique(),
  whatsappBusinessPhone: varchar("whatsapp_business_phone", { length: 30 }),
  contactEmail: varchar("contact_email", { length: 320 }),
  city: varchar("city", { length: 100 }).default("Bogotá, D.C."),
  planCode: varchar("plan_code", { length: 50 }).default("free").notNull(),
  republishByDefault: boolean("republish_by_default").default(true).notNull(),
  themeConfig: jsonb("theme_config"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_agencies_owner").on(table.ownerUserId),
]);

export type Agency = typeof agencies.$inferSelect;
export type InsertAgency = typeof agencies.$inferInsert;

/**
 * Miembros y roles dentro de una agencia marca blanca
 */
export const agencyMembers = pgTable("agency_members", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id").notNull().references(() => agencies.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  memberRole: varchar("member_role", { length: 40 }).default("agent").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  joinedAt: timestamp("joined_at"),
}, (table) => [
  uniqueIndex("uq_agency_members_agency_user").on(table.agencyId, table.userId),
]);

export type AgencyMember = typeof agencyMembers.$inferSelect;
export type InsertAgencyMember = typeof agencyMembers.$inferInsert;

/**
 * Suscripciones activas/históricas por usuario
 */
export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  agencyId: integer("agency_id").references(() => agencies.id, { onDelete: "set null" }),
  planCode: varchar("plan_code", { length: 50 }).notNull(),
  status: varchar("status", { length: 30 }).default("active").notNull(),
  billingCycle: varchar("billing_cycle", { length: 20 }).default("monthly").notNull(),
  priceCop: integer("price_cop").notNull().default(0),
  provider: varchar("provider", { length: 40 }).default("wompi").notNull(),
  providerSubscriptionId: varchar("provider_subscription_id", { length: 160 }),
  currentPeriodStart: timestamp("current_period_start").defaultNow().notNull(),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_user_subscriptions_user_id").on(table.userId),
  index("idx_user_subscriptions_status").on(table.status),
]);

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = typeof userSubscriptions.$inferInsert;

/**
 * Transacciones de pago Wompi (COP en centavos) con firma de integridad y trazabilidad de webhook
 */
export const paymentTransactions = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subscriptionId: integer("subscription_id").references(() => userSubscriptions.id, { onDelete: "set null" }),
  planCode: varchar("plan_code", { length: 50 }).notNull(),
  provider: varchar("provider", { length: 40 }).default("wompi").notNull(),
  reference: varchar("reference", { length: 120 }).notNull().unique(),
  providerTransactionId: varchar("provider_transaction_id", { length: 160 }),
  amountInCents: bigint("amount_in_cents", { mode: "number" }).notNull(),
  currency: varchar("currency", { length: 10 }).default("COP").notNull(),
  status: varchar("status", { length: 30 }).default("PENDING").notNull(),
  paymentMethodType: varchar("payment_method_type", { length: 60 }),
  integritySignature: varchar("integrity_signature", { length: 128 }),
  rawWebhookPayload: jsonb("raw_webhook_payload"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_payment_transactions_user_id").on(table.userId),
  index("idx_payment_transactions_status").on(table.status),
]);

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = typeof paymentTransactions.$inferInsert;

/**
 * Consumo mensual por usuario (importaciones URL, campañas email CRM, JanIA privada)
 */
export const usageQuotas = pgTable("usage_quotas", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  periodKey: varchar("period_key", { length: 20 }).notNull(),
  urlImportsUsed: integer("url_imports_used").default(0).notNull(),
  emailCampaignsUsed: integer("email_campaigns_used").default(0).notNull(),
  privateJaniaMessagesUsed: integer("private_jania_messages_used").default(0).notNull(),
  aiMessagesUsed: integer("ai_messages_used").default(0).notNull(),
  ctlStudiesUsed: integer("ctl_studies_used").default(0).notNull(),
  identityChecksUsed: integer("identity_checks_used").default(0).notNull(),
  valuationsUsed: integer("valuations_used").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uq_usage_quotas_user_period").on(table.userId, table.periodKey),
]);

export type UsageQuota = typeof usageQuotas.$inferSelect;
export type InsertUsageQuota = typeof usageQuotas.$inferInsert;

/**
 * Postulaciones de inmuebles a requerimientos (Tienda de Demandas con acuerdo 40/20/40)
 */
export const requirementProposals = pgTable("requirement_proposals", {
  id: serial("id").primaryKey(),
  requirementId: integer("requirement_id").notNull().references(() => requirements.id, { onDelete: "cascade" }),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  proposingUserId: integer("proposing_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  matchScore: decimal("match_score", { precision: 5, scale: 2 }),
  message: text("message"),
  status: varchar("status", { length: 30 }).default("pending_signature").notNull(),
  agreementRequired: boolean("agreement_required").default(true).notNull(),
  signatureToken: varchar("signature_token", { length: 120 }),
  agreementSignedAt: timestamp("agreement_signed_at"),
  contactUnlocked: boolean("contact_unlocked").default(false).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_req_proposals_req_id").on(table.requirementId),
  index("idx_req_proposals_prop_id").on(table.propertyId),
  index("idx_req_proposals_user_id").on(table.proposingUserId),
  index("idx_req_proposals_sig_token").on(table.signatureToken),
  uniqueIndex("uq_req_proposals_req_prop_user").on(table.requirementId, table.propertyId, table.proposingUserId),
]);

export type RequirementProposal = typeof requirementProposals.$inferSelect;
export type InsertRequirementProposal = typeof requirementProposals.$inferInsert;

/**
 * Actividades, notas, tareas y transiciones de etapa del CRM Kanban (PASO 4 — v34.40)
 */
export const crmActivities = pgTable("crm_activities", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  agentId: integer("agent_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  agencyId: integer("agency_id").references(() => agencies.id, { onDelete: "set null" }),
  activityType: varchar("activity_type", { length: 40 }).default("note").notNull(),
  title: varchar("title", { length: 255 }),
  body: text("body").notNull(),
  fromStage: varchar("from_stage", { length: 40 }),
  toStage: varchar("to_stage", { length: 40 }),
  dueAt: timestamp("due_at"),
  completedAt: timestamp("completed_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_crm_activities_lead_id").on(table.leadId),
  index("idx_crm_activities_agent_id").on(table.agentId),
  index("idx_crm_activities_agency_id").on(table.agencyId),
  index("idx_crm_activities_created_at").on(table.createdAt),
]);

export type CrmActivity = typeof crmActivities.$inferSelect;
export type InsertCrmActivity = typeof crmActivities.$inferInsert;

/**
 * Identidades de correo del agente (Relay VECY con Reply-To o SMTP propio cifrado AES-256-GCM)
 */
export const emailAccounts = pgTable("email_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  agencyId: integer("agency_id").references(() => agencies.id, { onDelete: "set null" }),
  mode: varchar("mode", { length: 30 }).default("vecy_relay").notNull(),
  displayName: varchar("display_name", { length: 180 }).notNull(),
  fromEmail: varchar("from_email", { length: 320 }),
  replyToEmail: varchar("reply_to_email", { length: 320 }).notNull(),
  signatureHtml: text("signature_html"),
  smtpHost: varchar("smtp_host", { length: 255 }),
  smtpPort: integer("smtp_port").default(587).notNull(),
  smtpSecure: boolean("smtp_secure").default(false).notNull(),
  smtpUser: varchar("smtp_user", { length: 320 }),
  smtpPasswordEncrypted: text("smtp_password_encrypted"),
  isVerified: boolean("is_verified").default(false).notNull(),
  lastVerifiedAt: timestamp("last_verified_at"),
  lastError: text("last_error"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uq_email_accounts_user").on(table.userId),
  index("idx_email_accounts_agency_id").on(table.agencyId),
]);

export type EmailAccount = typeof emailAccounts.$inferSelect;
export type InsertEmailAccount = typeof emailAccounts.$inferInsert;

/**
 * Plantillas de correo (sistema y personalizadas por agente/agencia)
 */
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  agencyId: integer("agency_id").references(() => agencies.id, { onDelete: "set null" }),
  code: varchar("code", { length: 80 }),
  name: varchar("name", { length: 180 }).notNull(),
  category: varchar("category", { length: 50 }).default("follow_up").notNull(),
  subjectTemplate: varchar("subject_template", { length: 300 }).notNull(),
  bodyHtmlTemplate: text("body_html_template").notNull(),
  bodyTextTemplate: text("body_text_template"),
  aiPromptHint: text("ai_prompt_hint"),
  isSystem: boolean("is_system").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_email_templates_user_id").on(table.userId),
  index("idx_email_templates_agency_id").on(table.agencyId),
  index("idx_email_templates_category").on(table.category),
]);

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

/**
 * Secuencias automatizadas de correos (bienvenida 0h, seguimiento 24h/72h, alerta Match >= 85%)
 */
export const emailSequences = pgTable("email_sequences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  agencyId: integer("agency_id").references(() => agencies.id, { onDelete: "set null" }),
  name: varchar("name", { length: 180 }).notNull(),
  description: text("description"),
  triggerType: varchar("trigger_type", { length: 50 }).default("lead_created").notNull(),
  stepsJson: jsonb("steps_json").default([]).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  stopOnStageChange: boolean("stop_on_stage_change").default(false).notNull(),
  stopStagesJson: jsonb("stop_stages_json").default(["cerrado_ganado", "perdido"]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_email_sequences_user_id").on(table.userId),
  index("idx_email_sequences_trigger_active").on(table.triggerType, table.isActive),
  index("idx_email_sequences_agency_id").on(table.agencyId),
]);

export type EmailSequence = typeof emailSequences.$inferSelect;
export type InsertEmailSequence = typeof emailSequences.$inferInsert;

/**
 * Inscripciones activas/históricas de leads en secuencias de correo
 */
export const emailSequenceEnrollments = pgTable("email_sequence_enrollments", {
  id: serial("id").primaryKey(),
  sequenceId: integer("sequence_id").notNull().references(() => emailSequences.id, { onDelete: "cascade" }),
  leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  agencyId: integer("agency_id").references(() => agencies.id, { onDelete: "set null" }),
  currentStepIndex: integer("current_step_index").default(0).notNull(),
  status: varchar("status", { length: 30 }).default("active").notNull(),
  nextRunAt: timestamp("next_run_at"),
  lastSentAt: timestamp("last_sent_at"),
  contextJson: jsonb("context_json"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_email_enrollments_due").on(table.status, table.nextRunAt),
  index("idx_email_enrollments_lead_id").on(table.leadId),
  index("idx_email_enrollments_user_id").on(table.userId),
  index("idx_email_enrollments_seq_lead").on(table.sequenceId, table.leadId),
]);

export type EmailSequenceEnrollment = typeof emailSequenceEnrollments.$inferSelect;
export type InsertEmailSequenceEnrollment = typeof emailSequenceEnrollments.$inferInsert;

/**
 * Cola y trazabilidad de mensajes de correo CRM
 */
export const emailMessages = pgTable("email_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  agencyId: integer("agency_id").references(() => agencies.id, { onDelete: "set null" }),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: "set null" }),
  accountId: integer("account_id").references(() => emailAccounts.id, { onDelete: "set null" }),
  sequenceId: integer("sequence_id").references(() => emailSequences.id, { onDelete: "set null" }),
  enrollmentId: integer("enrollment_id").references(() => emailSequenceEnrollments.id, { onDelete: "set null" }),
  direction: varchar("direction", { length: 20 }).default("outbound").notNull(),
  toEmail: varchar("to_email", { length: 320 }).notNull(),
  fromEmail: varchar("from_email", { length: 320 }).notNull(),
  replyToEmail: varchar("reply_to_email", { length: 320 }),
  subject: varchar("subject", { length: 300 }).notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text"),
  status: varchar("status", { length: 30 }).default("queued").notNull(),
  providerMessageId: varchar("provider_message_id", { length: 255 }),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  aiGenerated: boolean("ai_generated").default(false).notNull(),
  metadata: jsonb("metadata"),
  trackingToken: varchar("tracking_token", { length: 64 }),
  certificateCode: varchar("certificate_code", { length: 80 }),
  contentSha256: varchar("content_sha256", { length: 64 }),
  evidenceSha256: varchar("evidence_sha256", { length: 64 }),
  attachmentsJson: jsonb("attachments_json").default([]).notNull(),
  openCount: integer("open_count").default(0).notNull(),
  firstOpenedAt: timestamp("first_opened_at"),
  lastOpenedAt: timestamp("last_opened_at"),
  lastOpenIp: varchar("last_open_ip", { length: 64 }),
  lastOpenUserAgent: text("last_open_user_agent"),
  clickCount: integer("click_count").default(0).notNull(),
  firstClickedAt: timestamp("first_clicked_at"),
  lastClickedAt: timestamp("last_clicked_at"),
  lastClickIp: varchar("last_click_ip", { length: 64 }),
  lastClickUserAgent: text("last_click_user_agent"),
  notifyOnOpen: boolean("notify_on_open").default(false).notNull(),
  openNotifiedAt: timestamp("open_notified_at"),
  trackingEventsJson: jsonb("tracking_events_json").default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_email_messages_user_id").on(table.userId),
  index("idx_email_messages_lead_id").on(table.leadId),
  index("idx_email_messages_queue").on(table.status, table.scheduledFor),
  index("idx_email_messages_agency_id").on(table.agencyId),
]);

export type EmailMessage = typeof emailMessages.$inferSelect;
export type InsertEmailMessage = typeof emailMessages.$inferInsert;

export const emailTrackedLinks = pgTable("email_tracked_links", {
  id: serial("id").primaryKey(),
  emailMessageId: integer("email_message_id")
    .notNull()
    .references(() => emailMessages.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 64 }).notNull(),
  targetUrl: text("target_url").notNull(),
  clickCount: integer("click_count").default(0).notNull(),
  firstClickedAt: timestamp("first_clicked_at"),
  lastClickedAt: timestamp("last_clicked_at"),
  lastIp: varchar("last_ip", { length: 64 }),
  lastUserAgent: text("last_user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uq_email_tracked_links_token").on(table.token),
  index("idx_email_tracked_links_msg_id").on(table.emailMessageId),
]);

export type EmailTrackedLink = typeof emailTrackedLinks.$inferSelect;
export type InsertEmailTrackedLink = typeof emailTrackedLinks.$inferInsert;

/**
 * Canales privados de JanIA por suscripción (Web Widget RAG + WhatsApp Cloud API BYO-Number) — PASO 5 (v34.41)
 */
export const agentJaniaChannels = pgTable("agent_jania_channels", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  agencyId: integer("agency_id").references(() => agencies.id, { onDelete: "set null" }),
  channelType: varchar("channel_type", { length: 30 }).default("web_widget").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  assistantName: varchar("assistant_name", { length: 120 }).default("Sofía IA").notNull(),
  personaGender: varchar("persona_gender", { length: 20 }).default("female").notNull(),
  personaTone: varchar("persona_tone", { length: 40 }).default("profesional").notNull(),
  systemPromptOverride: text("system_prompt_override"),
  welcomeMessage: text("welcome_message"),
  includeOwnInventory: boolean("include_own_inventory").default(true).notNull(),
  includeNetworkInventory: boolean("include_network_inventory").default(true).notNull(),
  allowCrmCapture: boolean("allow_crm_capture").default(true).notNull(),
  allowVisitScheduling: boolean("allow_visit_scheduling").default(true).notNull(),
  allowNotarialCalc: boolean("allow_notarial_calc").default(true).notNull(),
  wabaId: varchar("waba_id", { length: 120 }),
  phoneNumberId: varchar("phone_number_id", { length: 120 }),
  displayPhoneNumber: varchar("display_phone_number", { length: 40 }),
  accessTokenEncrypted: text("access_token_encrypted"),
  appSecretEncrypted: text("app_secret_encrypted"),
  webhookVerifyTokenEncrypted: text("webhook_verify_token_encrypted"),
  webhookVerifyTokenHash: varchar("webhook_verify_token_hash", { length: 64 }),
  lastVerifiedAt: timestamp("last_verified_at"),
  lastInboundAt: timestamp("last_inbound_at"),
  lastError: text("last_error"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uq_agent_jania_channels_user_type").on(table.userId, table.channelType),
  index("idx_agent_jania_channels_agency_id").on(table.agencyId),
  index("idx_agent_jania_channels_active_type").on(table.channelType, table.isActive),
]);

export type AgentJaniaChannel = typeof agentJaniaChannels.$inferSelect;
export type InsertAgentJaniaChannel = typeof agentJaniaChannels.$inferInsert;

/**
 * Trazabilidad auditable de herramientas legales y técnicas SaaS (Estudio CTL, Identidad, Avalúos ACM) — PASO 5 (v34.41)
 */
export const agentLegalToolLogs = pgTable("agent_legal_tool_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  agencyId: integer("agency_id").references(() => agencies.id, { onDelete: "set null" }),
  toolType: varchar("tool_type", { length: 40 }).notNull(),
  referenceCode: varchar("reference_code", { length: 120 }),
  subjectLabel: varchar("subject_label", { length: 255 }),
  verdictOrStatus: varchar("verdict_or_status", { length: 60 }),
  summaryText: text("summary_text"),
  pdfUrl: text("pdf_url"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_agent_legal_tool_logs_user_id").on(table.userId),
  index("idx_agent_legal_tool_logs_agency_id").on(table.agencyId),
  index("idx_agent_legal_tool_logs_tool_type").on(table.toolType),
  index("idx_agent_legal_tool_logs_created_at").on(table.createdAt),
]);

export type AgentLegalToolLog = typeof agentLegalToolLogs.$inferSelect;
export type InsertAgentLegalToolLog = typeof agentLegalToolLogs.$inferInsert;
