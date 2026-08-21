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
  counters: () => counters,
  currencyEnum: () => currencyEnum,
  demandLevelEnum: () => demandLevelEnum,
  favorites: () => favorites,
  inmobiliarioLexicon: () => inmobiliarioLexicon,
  inquiryTypeEnum: () => inquiryTypeEnum,
  leadStatusEnum: () => leadStatusEnum,
  leads: () => leads,
  mandateStatusEnum: () => mandateStatusEnum,
  mandateTypeEnum: () => mandateTypeEnum,
  marketAnalysis: () => marketAnalysis,
  marketTrendEnum: () => marketTrendEnum,
  matchFeedback: () => matchFeedback,
  matchStatusEnum: () => matchStatusEnum,
  messageTypeEnum: () => messageTypeEnum,
  messages: () => messages,
  notificationLogs: () => notificationLogs,
  pendingSessions: () => pendingSessions,
  profiles: () => profiles,
  properties: () => properties,
  propertyImages: () => propertyImages,
  propertyMatches: () => propertyMatches,
  propertyPublicationHistory: () => propertyPublicationHistory,
  propertyTypeEnum: () => propertyTypeEnum,
  referralLinks: () => referralLinks,
  requirements: () => requirements,
  roleEnum: () => roleEnum,
  shares: () => shares,
  solicitudes: () => solicitudes,
  statusEnum: () => statusEnum,
  supplyLevelEnum: () => supplyLevelEnum,
  transactionTypeEnum: () => transactionTypeEnum,
  userBehavioralFingerprints: () => userBehavioralFingerprints,
  userPatterns: () => userPatterns,
  users: () => users,
  zoneAliases: () => zoneAliases
});
import { serial, integer, pgEnum, pgTable, text, timestamp, varchar, decimal, boolean, jsonb, bigint, uuid } from "drizzle-orm/pg-core";
var roleEnum, propertyTypeEnum, transactionTypeEnum, mandateStatusEnum, mandateTypeEnum, inquiryTypeEnum, leadStatusEnum, conversationStatusEnum, matchStatusEnum, statusEnum, messageTypeEnum, demandLevelEnum, supplyLevelEnum, marketTrendEnum, currencyEnum, users, properties, requirements, leads, conversations, messages, propertyMatches, notificationLogs, pendingSessions, referralLinks, shares, clientLedger, propertyImages, marketAnalysis, favorites, colombiaGeography, profiles, counters, solicitudes, propertyPublicationHistory, userBehavioralFingerprints, userPatterns, zoneAliases, inmobiliarioLexicon, matchFeedback;
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
      "consultorio",
      "cabin"
    ]);
    transactionTypeEnum = pgEnum("transactionType", [
      "venta",
      "arriendo",
      "venta_o_arriendo",
      "arriendo_temporal",
      "arriendo_con_opcion_de_compra",
      "permuta",
      "venta_permuta",
      "aporte"
    ]);
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
      rentPrice: decimal("rent_price", { precision: 15, scale: 2 }),
      // Precio de arriendo cuando transactionType = venta_o_arriendo
      currency: currencyEnum("currency").default("COP").notNull(),
      pricePerSqm: decimal("pricePerSqm", { precision: 10, scale: 2 }),
      city: varchar("city", { length: 100 }),
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
      garageType: text("garageType"),
      // "independiente" | "lineal" | "mixto" | null
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
      ultimaActividad: varchar("ultima_actividad", { length: 50 }).default("PUBLICACI\xD3N").notNull(),
      vigenciaIa: varchar("vigencia_ia", { length: 50 }).default("VIGENTE").notNull()
    });
    requirements = pgTable("requirements", {
      id: serial("id").primaryKey(),
      userId: integer("userId").references(() => users.id),
      name: varchar("name", { length: 255 }),
      tipoInmuebleDeseado: propertyTypeEnum("tipoInmuebleDeseado").notNull(),
      tipoNegocioDeseado: transactionTypeEnum("tipoNegocioDeseado").notNull(),
      // Array of all accepted transaction types for matching flexibility (e.g. ["venta","permuta"])
      tiposNegocioAceptados: text("tipos_negocio_aceptados").array(),
      ciudadDeseada: varchar("ciudadDeseada", { length: 100 }),
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
      adminFeeMax: decimal("adminFeeMax", { precision: 15, scale: 2 }),
      // Admón mensual máxima aceptada (null = N/A o sin restricción)
      estratoDeseado: jsonb("estratoDeseado"),
      // Array: [3, 4, 5]
      amobladoDeseado: boolean("amobladoDeseado"),
      caracteristicasDeseadas: jsonb("caracteristicasDeseadas"),
      status: statusEnum("status").default("active"),
      idUsuarioWhatsapp: varchar("idUsuarioWhatsapp", { length: 100 }),
      nombreUsuarioWhatsapp: varchar("nombre_usuario_whatsapp", { length: 255 }),
      rawText: text("rawText"),
      enlaceOrigen: text("enlace_origen"),
      calificacion: varchar("calificacion", { length: 50 }),
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
      matchExplanation: jsonb("matchExplanation"),
      ipc: jsonb("ipc"),
      // VRIF Core v2.0: { score: number, factors: { matching: number, ... }, version: string, generatedAt: string }
      status: matchStatusEnum("status").default("suggested").notNull(),
      ownerConfirmed: boolean("ownerConfirmed").default(false).notNull(),
      seekerConfirmed: boolean("seekerConfirmed").default(false).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    notificationLogs = pgTable("notificationLogs", {
      id: serial("id").primaryKey(),
      matchId: integer("matchId").references(() => propertyMatches.id),
      brokerId: integer("brokerId").references(() => users.id),
      brokerPhone: varchar("brokerPhone", { length: 50 }).notNull(),
      channel: varchar("channel", { length: 50 }).default("whatsapp").notNull(),
      status: varchar("status", { length: 50 }).default("pending").notNull(),
      // pending | sent | delivered | failed
      sentAt: timestamp("sentAt"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      error: text("error"),
      triggerSource: varchar("triggerSource", { length: 100 }).default("match_created")
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
    profiles = pgTable("profiles", {
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
      perfil: text("perfil")
    });
    counters = pgTable("counters", {
      name: text("name").primaryKey(),
      currentValue: bigint("current_value", { mode: "number" }).notNull()
    });
    solicitudes = pgTable("solicitudes", {
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
      agentId: text("agent_id")
    });
    propertyPublicationHistory = pgTable("property_publication_history", {
      id: serial("id").primaryKey(),
      propertyId: integer("propertyId").references(() => properties.id).notNull(),
      fecha: timestamp("fecha").defaultNow().notNull(),
      grupo: varchar("grupo", { length: 255 }),
      broker: varchar("broker", { length: 255 }),
      brokerPhone: varchar("broker_phone", { length: 50 }),
      accion: varchar("accion", { length: 50 }).notNull(),
      // PUBLICADO | REPUBLICADO | ACTUALIZADO | etc.
      portal: varchar("portal", { length: 50 }),
      externalListingId: varchar("external_listing_id", { length: 100 }),
      mensajeWhatsappId: varchar("mensaje_whatsapp_id", { length: 255 }),
      detalles: text("detalles")
    });
    userBehavioralFingerprints = pgTable("user_behavioral_fingerprints", {
      id: serial("id").primaryKey(),
      userId: integer("userId").references(() => users.id),
      idUsuarioWhatsapp: varchar("idUsuarioWhatsapp", { length: 100 }),
      permuteProfile: varchar("permute_profile", { length: 50 }),
      // 'cash_only' | 'permuta_fan' | 'pelo_a_pelo_expert' | 'parte_de_pago'
      urgencyIndex: integer("urgency_index").default(0),
      avgPriceRange: jsonb("avg_price_range"),
      topZones: jsonb("top_zones"),
      technicalRigidity: integer("technical_rigidity").default(50),
      // Exigencia en detalles (1.5 baños, vistas, etc.)
      updatedAt: timestamp("updatedAt").defaultNow()
    });
    userPatterns = pgTable("user_patterns", {
      id: serial("id").primaryKey(),
      userId: integer("userId").references(() => users.id),
      favoriteZones: jsonb("favorite_zones"),
      avgClosingUrgency: integer("avg_urgency").default(50),
      preferredAssetClass: varchar("preferred_class", { length: 50 }),
      // 'apartment' | 'house' | 'warehouse' | 'commercial'
      updatedAt: timestamp("updatedAt").defaultNow()
    });
    zoneAliases = pgTable("zone_aliases", {
      id: serial("id").primaryKey(),
      aliasTexto: varchar("alias_texto", { length: 150 }).notNull(),
      ciudad: varchar("ciudad", { length: 100 }).notNull().default("Bogot\xE1"),
      barrioResuelto: varchar("barrio_resuelto", { length: 150 }).notNull(),
      confianza: varchar("confianza", { length: 20 }).default("alta"),
      // 'alta' | 'media' | 'baja'
      fuente: varchar("fuente", { length: 50 }).default("manual"),
      // 'manual' | 'geocoding_confirmado' | 'ia_inferido'
      createdAt: timestamp("created_at").defaultNow()
    });
    inmobiliarioLexicon = pgTable("inmobiliario_lexicon", {
      id: serial("id").primaryKey(),
      terminoColoquial: varchar("termino_coloquial", { length: 255 }).notNull().unique(),
      categoria: varchar("categoria", { length: 100 }).notNull(),
      // 'espacio' | 'acabado' | 'infraestructura' | 'negocio' | 'amenidad' | 'equipamiento'
      conceptoCanonico: varchar("concepto_canonico", { length: 150 }).notNull(),
      // 'cuarto_bano_servicio' | 'cocina_cerrada' | 'acabado_madera' | etc.
      frecuenciaUso: integer("frecuencia_uso").default(1).notNull(),
      ejemplosDetectados: jsonb("ejemplos_detectados"),
      origen: varchar("origen", { length: 50 }).default("ia_autodescubierto").notNull(),
      // 'ia_autodescubierto' | 'humano_validado'
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    matchFeedback = pgTable("match_feedback", {
      id: serial("id").primaryKey(),
      matchId: integer("match_id").references(() => propertyMatches.id),
      propertyId: integer("property_id").references(() => properties.id),
      requirementId: integer("requirement_id").references(() => requirements.id),
      action: varchar("action", { length: 50 }).notNull(),
      // 'exitoso' | 'rechazado' | 'en_negociacion'
      motivoRechazo: text("motivo_rechazo"),
      notasBroker: text("notas_broker"),
      ajustesGuardados: jsonb("ajustes_guardados"),
      createdAt: timestamp("created_at").defaultNow().notNull()
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
        max: 15,
        // Máximo 15 conexiones simultáneas al pool de Supabase para evitar exhaustion
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
    const ADMIN_EMAILS = [
      "vecybienesraices@gmail.com",
      "jani79alves@gmail.com",
      "eduardoariveram@gmail.com",
      "eddu.mendoza@gmail.com"
    ];
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      values.role = "admin";
      updateSet.role = "admin";
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

// server/_core/events.ts
import { EventEmitter } from "events";
var VRIFEventEmitter, vrifEvents;
var init_events = __esm({
  "server/_core/events.ts"() {
    "use strict";
    VRIFEventEmitter = class extends EventEmitter {
    };
    vrifEvents = new VRIFEventEmitter();
  }
});

// server/_core/llm.ts
var llm_exports = {};
__export(llm_exports, {
  invokeLLM: () => invokeLLM
});
import axios2 from "axios";
function getGeminiKeys() {
  const keysSet = /* @__PURE__ */ new Set();
  const multiKeys = (process.env.GEMINI_API_KEYS || "").split(",").map((k) => k.trim()).filter(Boolean);
  multiKeys.forEach((k) => keysSet.add(k));
  if (process.env.GEMINI_API_KEY) keysSet.add(process.env.GEMINI_API_KEY.trim());
  if (process.env.GOOGLE_API_KEY) keysSet.add(process.env.GOOGLE_API_KEY.trim());
  if (process.env.GEMINI_BACKUP_KEY) keysSet.add(process.env.GEMINI_BACKUP_KEY.trim());
  if (ENV.forgeApiKey) keysSet.add(ENV.forgeApiKey.trim());
  return Array.from(keysSet);
}
function getNextAvailableKey() {
  const allKeys = getGeminiKeys();
  if (allKeys.length === 0) {
    throw new Error("No hay ninguna GEMINI_API_KEY configurada en el entorno.");
  }
  const now = Date.now();
  for (const key of allKeys) {
    const cooldownUntil = keyCooldowns.get(key) || 0;
    if (now > cooldownUntil) {
      return key;
    }
  }
  return allKeys[0];
}
function markKeyCooldown(key, seconds = 30) {
  keyCooldowns.set(key, Date.now() + seconds * 1e3);
  console.warn(`[JanIA-LLM] Clave Gemini puesta en pausa por ${seconds}s debido a Rate Limit (429).`);
}
async function paceRequest() {
  const now = Date.now();
  const elapsed = now - lastCallTimestamp;
  if (elapsed < MIN_CALL_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_CALL_INTERVAL_MS - elapsed));
  }
  lastCallTimestamp = Date.now();
}
async function invokeLLM({
  messages: messages2,
  responseFormat,
  provider = "google",
  model,
  imageBuffer,
  pdfBuffer,
  pdfMimeType,
  enableSearch = false,
  tools
}) {
  if (provider === "anthropic") {
    return await invokeClaude(messages2, responseFormat);
  }
  return await invokeGemini(messages2, responseFormat, model, imageBuffer, pdfBuffer, pdfMimeType, enableSearch, tools);
}
async function invokeGemini(messages2, responseFormat, customModel, imageBuffer, pdfBuffer, pdfMimeType, enableSearch, tools) {
  const modelsToTry = customModel ? [customModel, ...FALLBACK_MODELS.filter((m) => m !== customModel)] : FALLBACK_MODELS;
  const allKeys = getGeminiKeys();
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
      temperature: responseFormat?.type === "json_object" ? 0.2 : 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 4096,
      responseMimeType: responseFormat?.type === "json_object" ? "application/json" : "text/plain",
      responseSchema: responseFormat?.schema || void 0
    }
  };
  if (tools && tools.length > 0) {
    payload.tools = tools;
  } else if (enableSearch && responseFormat?.type !== "json_object") {
    payload.tools = [{ googleSearch: {} }];
  }
  let lastError = null;
  for (const currentModel of modelsToTry) {
    for (let keyAttempt = 0; keyAttempt < Math.max(allKeys.length, 1); keyAttempt++) {
      const activeKey = getNextAvailableKey();
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${activeKey}`;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await paceRequest();
          console.log(`[JanIA-LLM] Ejecutando IA con ${currentModel} (Clave: ...${activeKey.slice(-6)}, Intento ${attempt})...`);
          const response = await axios2.post(apiUrl, payload, { timeout: 45e3 });
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
          console.warn(`[JanIA-LLM] Respuesta vac\xEDa de ${currentModel}. Reintentando...`);
          await new Promise((r) => setTimeout(r, 1500));
        } catch (error) {
          lastError = error;
          const status = error.response?.status;
          const errorMsg = error.response?.data?.error?.message || error.message;
          if (status === 429) {
            const retryMatch = errorMsg.match(/retry in ([\d\.]+)s/i);
            const waitSec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 20;
            markKeyCooldown(activeKey, waitSec);
            console.warn(`[JanIA-LLM] \u26A0\uFE0F Rate limit (429) en ${currentModel}. Cambiando de clave o modelo...`);
            break;
          }
          if (status === 503 || status === 500) {
            console.warn(`[JanIA-LLM] Error ${status} de servidor Google. Reintentando en 2s...`);
            await new Promise((r) => setTimeout(r, 2e3));
            continue;
          }
          console.error(`[JanIA-LLM] Error en ${currentModel}:`, errorMsg);
          break;
        }
      }
    }
  }
  console.error("[Gemini Cascade Exhausted]: Todos los modelos y claves de Gemini fallaron:", lastError?.message || lastError);
  throw lastError || new Error("No fue posible obtener respuesta de ning\xFAn modelo de Gemini");
}
async function invokeClaude(messages2, responseFormat) {
  console.log("[JanIA-LLM] Intentando procesar con Claude (Anthropic)...");
  throw new Error("El proveedor Anthropic est\xE1 preparado en c\xF3digo pero requiere API KEY y activaci\xF3n financiera.");
}
var keyCooldowns, FALLBACK_MODELS, lastCallTimestamp, MIN_CALL_INTERVAL_MS;
var init_llm = __esm({
  "server/_core/llm.ts"() {
    "use strict";
    init_env();
    keyCooldowns = /* @__PURE__ */ new Map();
    FALLBACK_MODELS = [
      "gemini-2.5-flash",
      "gemini-flash-latest",
      "gemini-flash-lite-latest"
    ];
    lastCallTimestamp = 0;
    MIN_CALL_INTERVAL_MS = 600;
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
    const systemPrompt = `
      Eres el motor de extracci\xF3n de datos de JanIA (VECY Network). Tu misi\xF3n es convertir texto sucio de portales inmobiliarios (como Wasi, FincaRa\xEDz, etc.) en datos perfectos.
      
      REGLAS DE ORO:
      - PRICE: Busca el valor num\xE9rico m\xE1s alto que parezca el precio (ej: 550000000). Ignora la administraci\xF3n. Devuelve SOLO el n\xFAmero.
      - NAME: Genera un nombre profesional (ej: "Apartamento en Venta San Jos\xE9 de Bavaria").
      - PROPERTY TYPE: apartment, house, building, warehouse, farm, hotel, office, land, commercial, loft, consultorio.
      
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
        "amenities": { "balcon": boolean, "piscina": boolean, "gimnasio": boolean, "vigilancia": boolean, "ascensor": boolean, "terraza": boolean, "deposito": boolean }
      }
    `;
    const userPrompt = `
      URL: ${url}
      CONTENIDO EXTRAIDO:
      ${combinedContent}
      
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
function extractPortalAndListingId(urlStr) {
  try {
    const url = new URL(urlStr);
    const host = url.hostname.toLowerCase();
    let portal = null;
    let listingId = null;
    if (host.includes("wasi.co")) portal = "Wasi";
    else if (host.includes("fincaraiz")) portal = "FincaRa\xEDz";
    else if (host.includes("metrocuadrado")) portal = "Metrocuadrado";
    else if (host.includes("ciencuadras")) portal = "Ciencuadras";
    else if (host.includes("habi.co")) portal = "Habi";
    else if (host.includes("mercadolibre")) portal = "MercadoLibre";
    else if (host.includes("properati") || host.includes("proppit")) portal = "Properati";
    else {
      const parts = host.replace("www.", "").split(".");
      portal = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : "Externo";
    }
    const pathSegments = url.pathname.split("/").filter(Boolean);
    for (const segment of pathSegments) {
      if (/^\d{5,12}$/.test(segment)) {
        listingId = segment;
        break;
      }
      if (/^[a-zA-Z0-9]+-\w+$/.test(segment)) {
        listingId = segment;
        break;
      }
    }
    if (!listingId) {
      const match = url.pathname.match(/\/(\d{5,12})(?:\/|\?|$|\.|#)/);
      if (match) {
        listingId = match[1];
      }
    }
    return { portal, listingId };
  } catch {
    return { portal: null, listingId: null };
  }
}
var DOMINIOS_PERMITIDOS, DOMINIOS_BLOQUEADOS;
var init_scraper = __esm({
  "server/_core/scraper.ts"() {
    "use strict";
    init_llm();
    DOMINIOS_PERMITIDOS = [
      "wasi.co",
      "qrador.com",
      "habi.co",
      "metrocuadrado.com",
      "fincaraiz.com.co",
      "ciencuadras.com",
      "proppit.com",
      // El nuevo Properati
      "mercadolibre.com.co",
      // MercadoLibre Colombia
      "mitula.com.co",
      "lamudi.com.co",
      "nuroa.com.co",
      "vivareal.co",
      "casacol.co",
      "lambienesraices.com",
      // Inmobiliarias independientes
      "drive.google.com",
      // Google Drive (fichas compartidas)
      "netlify.app",
      // Sitios web inmobiliarios en Netlify
      "vecy.co",
      // Portales VECY Network
      "github.io"
      // Páginas web estáticas
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
      "whatsapp.com/catalog",
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
  const normAddress = address.trim().toLowerCase();
  if (geocodeCache.has(normAddress)) {
    return geocodeCache.get(normAddress) || null;
  }
  if (isMapsApiDenied) {
    return {
      isValid: false,
      city: "Bogot\xE1",
      zone: address,
      locality: "",
      latitude: "",
      longitude: "",
      formattedAddress: address,
      isApiError: true
    };
  }
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return {
      isValid: false,
      city: "",
      zone: "",
      locality: "",
      latitude: "",
      longitude: "",
      formattedAddress: "",
      isApiError: true
    };
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
    if (data.status !== "OK") {
      if (data.status === "REQUEST_DENIED" || data.status === "OVER_QUERY_LIMIT") {
        isMapsApiDenied = true;
        console.warn(`[Geocoding] API de Google Maps inactiva o denegada (Status: ${data.status}). Desactivando peticiones salientes a Google Maps API para no generar costos.`);
      }
      const isApiError = data.status === "REQUEST_DENIED" || data.status === "OVER_QUERY_LIMIT" || data.status === "UNKNOWN_ERROR" || data.status === "INVALID_REQUEST";
      const errRes = {
        isValid: false,
        city: "",
        zone: "",
        locality: "",
        latitude: "",
        longitude: "",
        formattedAddress: "",
        isApiError
      };
      geocodeCache.set(normAddress, errRes);
      return errRes;
    }
    if (!data.results || data.results.length === 0) {
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
    return {
      isValid: false,
      city: "",
      zone: "",
      locality: "",
      latitude: "",
      longitude: "",
      formattedAddress: "",
      isApiError: true
    };
  }
}
var geocodeCache, isMapsApiDenied;
var init_geocoding = __esm({
  "server/_core/geocoding.ts"() {
    "use strict";
    geocodeCache = /* @__PURE__ */ new Map();
    isMapsApiDenied = false;
  }
});

// server/_core/geo-lookup.ts
import fs from "fs";
import path from "path";
function loadSectors(city = "bogota") {
  if (sectorData) return sectorData.sectors;
  const filePath = path.resolve(process.cwd(), "server", "data", `${city}_sectores.json`);
  if (!fs.existsSync(filePath)) {
    console.warn(`[GeoLookup] Archivo no encontrado: ${filePath}`);
    return [];
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  sectorData = JSON.parse(raw);
  console.log(`[GeoLookup] Cargados ${sectorData.sectors.length} sectores catastrales de ${city}`);
  return sectorData.sectors;
}
function interpolateCra7(calle) {
  const anchors = CRA7_ANCHORS;
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (calle >= a.calle && calle <= b.calle) {
      const t2 = (calle - a.calle) / (b.calle - a.calle);
      return {
        lat: a.lat + t2 * (b.lat - a.lat),
        lng: a.lng + t2 * (b.lng - a.lng)
      };
    }
  }
  if (calle < anchors[0].calle) return { lat: anchors[0].lat, lng: anchors[0].lng };
  const last = anchors[anchors.length - 1];
  const prev = anchors[anchors.length - 2];
  const slope_lat = (last.lat - prev.lat) / (last.calle - prev.calle);
  const slope_lng = (last.lng - prev.lng) / (last.calle - prev.calle);
  return {
    lat: last.lat + slope_lat * (calle - last.calle),
    lng: last.lng + slope_lng * (calle - last.calle)
  };
}
function calleCarreraToLatLng(calle, carrera) {
  const base = interpolateCra7(calle);
  const deltaCra = carrera - 7;
  const deltaLng = -deltaCra * LNG_PER_CRA;
  const deltaLat = -deltaCra * LAT_PER_CRA;
  return {
    lat: base.lat + deltaLat,
    lng: base.lng + deltaLng
  };
}
function buildPerimeterPolygon(p) {
  const sw = calleCarreraToLatLng(p.calleSur, p.craOccidente);
  const nw = calleCarreraToLatLng(p.calleNorte, p.craOccidente);
  const ne = calleCarreraToLatLng(p.calleNorte, p.craOriente);
  const se = calleCarreraToLatLng(p.calleSur, p.craOriente);
  return [sw, nw, ne, se];
}
function pointInPolygon(point, ring) {
  const { lat, lng } = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = yi > lat !== yj > lat && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
function sectorIntersectsPerimeter(sector, perimeterPoly, bbox) {
  const [sMinLng, sMinLat, sMaxLng, sMaxLat] = sector.bbox;
  if (sMaxLng < bbox.minLng || sMinLng > bbox.maxLng) return false;
  if (sMaxLat < bbox.minLat || sMinLat > bbox.maxLat) return false;
  const centroidLat = (sMinLat + sMaxLat) / 2;
  const centroidLng = (sMinLng + sMaxLng) / 2;
  if (pointInPolygon({ lat: centroidLat, lng: centroidLng }, perimeterPoly.map((p) => [p.lng, p.lat]))) {
    return true;
  }
  for (const ring of sector.rings) {
    const step = Math.max(1, Math.floor(ring.length / 8));
    for (let i = 0; i < ring.length; i += step) {
      const [lng, lat] = ring[i];
      if (pointInPolygon({ lat, lng }, perimeterPoly.map((p) => [p.lng, p.lat]))) {
        return true;
      }
    }
  }
  const centerLat = (bbox.minLat + bbox.maxLat) / 2;
  const centerLng = (bbox.minLng + bbox.maxLng) / 2;
  for (const ring of sector.rings) {
    if (pointInPolygon({ lat: centerLat, lng: centerLng }, ring)) {
      return true;
    }
  }
  return false;
}
function toTitleCase(name) {
  if (TILDE_CORRECTIONS[name]) return TILDE_CORRECTIONS[name];
  const minorWords = /* @__PURE__ */ new Set(["de", "del", "la", "el", "los", "las", "y", "en", "a", "al"]);
  return name.toLowerCase().split(" ").map((word, i) => i === 0 || !minorWords.has(word) ? word.charAt(0).toUpperCase() + word.slice(1) : word).join(" ");
}
function lookupBarriosByPerimeter(perimeter) {
  const ciudad = perimeter.ciudad?.toLowerCase() || "bogota";
  const sectors = loadSectors(ciudad);
  if (sectors.length === 0) {
    return { barrios: [], sectoresCatastrales: [], totalSectores: 0, ciudad, fuente: "N/A" };
  }
  const perimeterPoly = buildPerimeterPolygon(perimeter);
  const lats = perimeterPoly.map((p) => p.lat);
  const lngs = perimeterPoly.map((p) => p.lng);
  const bbox = {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs)
  };
  const matched = sectors.filter((s) => sectorIntersectsPerimeter(s, perimeterPoly, bbox));
  const uniqueNames = /* @__PURE__ */ new Map();
  for (const s of matched) {
    if (!uniqueNames.has(s.nombre)) {
      uniqueNames.set(s.nombre, toTitleCase(s.nombre));
    }
  }
  const sectoresCatastrales = [...uniqueNames.keys()].sort();
  const barrios = [...uniqueNames.values()].sort();
  return {
    barrios,
    sectoresCatastrales,
    totalSectores: matched.length,
    ciudad,
    fuente: "IDECA-CadastroBogota-2026-06"
  };
}
var sectorData, CRA7_ANCHORS, LNG_PER_CRA, LAT_PER_CRA, TILDE_CORRECTIONS;
var init_geo_lookup = __esm({
  "server/_core/geo-lookup.ts"() {
    "use strict";
    sectorData = null;
    CRA7_ANCHORS = [
      { calle: 6, lat: 4.5974, lng: -74.0762 },
      { calle: 26, lat: 4.6156, lng: -74.0665 },
      { calle: 45, lat: 4.6326, lng: -74.0631 },
      { calle: 57, lat: 4.6432, lng: -74.0606 },
      { calle: 63, lat: 4.6487, lng: -74.0592 },
      { calle: 72, lat: 4.6567, lng: -74.0559 },
      { calle: 85, lat: 4.6688, lng: -74.0524 },
      { calle: 100, lat: 4.6843, lng: -74.0495 },
      { calle: 116, lat: 4.6986, lng: -74.0461 },
      { calle: 127, lat: 4.7085, lng: -74.0438 },
      { calle: 140, lat: 4.72, lng: -74.0409 },
      { calle: 170, lat: 4.7466, lng: -74.0344 }
    ];
    LNG_PER_CRA = 895e-6;
    LAT_PER_CRA = 5e-5;
    TILDE_CORRECTIONS = {
      "EMAUS": "Ema\xFAs",
      "SANTA BARBARA": "Santa B\xE1rbara",
      "RINCON DEL CHICO": "Rinc\xF3n del Chic\xF3",
      "CEDRITOS DEL SUR": "Cedritos del Sur",
      "CHICO NORTE": "Chic\xF3 Norte",
      "CHICO NORTE II SECTOR": "Chic\xF3 Norte II Sector",
      "CHICO NORTE III SECTOR": "Chic\xF3 Norte III Sector",
      "CHICO SUR": "Chic\xF3 Sur",
      "EL CHICO": "El Chic\xF3",
      "CHICO LAGO": "Chic\xF3 Lago",
      "LOS ROSALES": "Los Rosales"
    };
  }
});

// server/_core/veredas-lookup.ts
import fs2 from "fs";
import path2 from "path";
function normalize(text2) {
  if (!text2) return "";
  return text2.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}
function initVeredasLookup() {
  if (isInitialized && veredasCache.length > 0) return;
  try {
    const indexPath = path2.join(process.cwd(), "server/data/colombia_veredas_index.json");
    if (!fs2.existsSync(indexPath)) {
      console.warn(`[VeredasLookup] No se encontr\xF3 el \xEDndice de veredas en: ${indexPath}`);
      return;
    }
    const raw = fs2.readFileSync(indexPath, "utf8");
    veredasCache = JSON.parse(raw);
    veredasByNameMap.clear();
    veredasByMpioMap.clear();
    for (const item of veredasCache) {
      const normVereda = normalize(item.vereda);
      const normMpio = normalize(item.municipio);
      if (!veredasByNameMap.has(normVereda)) {
        veredasByNameMap.set(normVereda, []);
      }
      veredasByNameMap.get(normVereda).push(item);
      if (!veredasByMpioMap.has(normMpio)) {
        veredasByMpioMap.set(normMpio, []);
      }
      veredasByMpioMap.get(normMpio).push(item);
    }
    isInitialized = true;
    console.log(`[VeredasLookup] \u2705 Indexadas ${veredasCache.length} veredas de Colombia en memoria.`);
  } catch (err) {
    console.error(`[VeredasLookup] Error inicializando veredas:`, err.message);
  }
}
function lookupVereda(texto, municipioHint) {
  if (!texto) return null;
  if (!isInitialized) initVeredasLookup();
  const cleanText = normalize(texto).replace(/\bvereda\b/g, "").trim();
  if (!cleanText) return null;
  const matches = veredasByNameMap.get(cleanText);
  if (!matches || matches.length === 0) {
    return null;
  }
  if (matches.length === 1) {
    return matches[0];
  }
  if (municipioHint) {
    const normHint = normalize(municipioHint);
    const exactMpio = matches.find((m) => normalize(m.municipio) === normHint);
    if (exactMpio) return exactMpio;
  }
  return matches[0];
}
var veredasCache, veredasByNameMap, veredasByMpioMap, isInitialized;
var init_veredas_lookup = __esm({
  "server/_core/veredas-lookup.ts"() {
    "use strict";
    veredasCache = [];
    veredasByNameMap = /* @__PURE__ */ new Map();
    veredasByMpioMap = /* @__PURE__ */ new Map();
    isInitialized = false;
  }
});

// server/_core/geography.ts
import { sql } from "drizzle-orm";
function normalizarTextoGeografico(texto) {
  if (!texto) return "";
  let n = String(texto).toLowerCase();
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
  const knownAliasMap = {
    // Sabana Norte / Cundinamarca Suburbs (DIVIPOLA DANE)
    "san simon": { barrioCanonico: "San Sim\xF3n", city: "Bogot\xE1", localidad: "Guaymaral / Suba", isMunicipio: false },
    "guaymaral": { barrioCanonico: "Guaymaral", city: "Bogot\xE1", localidad: "Guaymaral / Suba", isMunicipio: false },
    "hacienda fontanar": { barrioCanonico: "Hacienda Fontanar", city: "Ch\xEDa", localidad: "Ch\xEDa", isMunicipio: true },
    "hacienda forntanar": { barrioCanonico: "Hacienda Fontanar", city: "Ch\xEDa", localidad: "Ch\xEDa", isMunicipio: true },
    "fontanar": { barrioCanonico: "Hacienda Fontanar", city: "Ch\xEDa", localidad: "Ch\xEDa", isMunicipio: true },
    "fagua": { barrioCanonico: "Fagua", city: "Ch\xEDa", localidad: "Ch\xEDa", isMunicipio: true },
    "potosi": { barrioCanonico: "Potos\xED", city: "Sop\xF3", localidad: "Sop\xF3", isMunicipio: true },
    "sindamanoy": { barrioCanonico: "Sindamanoy", city: "Ch\xEDa", localidad: "Ch\xEDa", isMunicipio: true },
    "yerbabuena": { barrioCanonico: "Yerbabuena", city: "Ch\xEDa", localidad: "Ch\xEDa", isMunicipio: true },
    "yerbabona": { barrioCanonico: "Yerbabuena", city: "Ch\xEDa", localidad: "Ch\xEDa", isMunicipio: true },
    "briceno": { barrioCanonico: "Brice\xF1o", city: "Sop\xF3", localidad: "Sop\xF3", isMunicipio: true },
    "hatogrande": { barrioCanonico: "Hatogrande", city: "Sop\xF3", localidad: "Sop\xF3", isMunicipio: true },
    "chia": { barrioCanonico: "Ch\xEDa", city: "Ch\xEDa", localidad: "Ch\xEDa", isMunicipio: true },
    "sopo": { barrioCanonico: "Sop\xF3", city: "Sop\xF3", localidad: "Sop\xF3", isMunicipio: true },
    "cajica": { barrioCanonico: "Cajic\xE1", city: "Cajic\xE1", localidad: "Cajic\xE1", isMunicipio: true },
    "cota": { barrioCanonico: "Cota", city: "Cota", localidad: "Cota", isMunicipio: true },
    "la calera": { barrioCanonico: "La Calera", city: "La Calera", localidad: "La Calera", isMunicipio: true },
    "zipaquira": { barrioCanonico: "Zipaquir\xE1", city: "Zipaquir\xE1", localidad: "Zipaquir\xE1", isMunicipio: true },
    // Bogotá Urban Sectors
    "nueva autopista": { barrioCanonico: "Cedritos", city: "Bogot\xE1", localidad: "Usaqu\xE9n", isMunicipio: false },
    "marlboro": { barrioCanonico: "Chic\xF3 Norte", city: "Bogot\xE1", localidad: "Usaqu\xE9n", isMunicipio: false },
    "zona marlboro": { barrioCanonico: "Chic\xF3 Norte", city: "Bogot\xE1", localidad: "Usaqu\xE9n", isMunicipio: false },
    "buganvilia": { barrioCanonico: "Bella Suiza", city: "Bogot\xE1", localidad: "Usaqu\xE9n", isMunicipio: false },
    "recodo del country": { barrioCanonico: "El Country", city: "Bogot\xE1", localidad: "Usaqu\xE9n", isMunicipio: false },
    "multicentro": { barrioCanonico: "Santa B\xE1rbara", city: "Bogot\xE1", localidad: "Usaqu\xE9n", isMunicipio: false },
    "bosques del marques": { barrioCanonico: "Bosques de Bella Suiza", city: "Bogot\xE1", localidad: "Usaqu\xE9n", isMunicipio: false },
    "santas": { barrioCanonico: "Santa B\xE1rbara", city: "Bogot\xE1", localidad: "Usaqu\xE9n", isMunicipio: false },
    "prado veraniego": { barrioCanonico: "Prado Veraniego", city: "Bogot\xE1", localidad: "Suba", isMunicipio: false }
  };
  const normZoneLower = normZone.toLowerCase().trim();
  if (knownAliasMap[normZoneLower]) {
    const alias = knownAliasMap[normZoneLower];
    console.log(`[Geocoding-Alias] DIVIPOLA Alias resuelto "${zona}" \u2794 "${alias.barrioCanonico}" (${alias.city})`);
    return {
      isValid: true,
      barrioCanonico: alias.barrioCanonico,
      localidad: alias.localidad || alias.city,
      city: alias.city,
      isMunicipio: alias.isMunicipio
    };
  }
  const cuadranteRes = await resolverCuadranteVial(normZoneLower);
  if (cuadranteRes.resuelto && cuadranteRes.barrios.length > 0) {
    const resueltoStr = cuadranteRes.barrios.join(", ");
    console.log(`[Geocoding-Cuadrante] ${cuadranteRes.descripcion} resuelto [${cuadranteRes.confianza}] \u2794 "${resueltoStr}"`);
    return {
      isValid: true,
      barrioCanonico: resueltoStr,
      localidad: "Bogot\xE1",
      city: "Bogot\xE1",
      isMunicipio: false
    };
  }
  if ((!ciudad || normalizarTextoGeografico(ciudad) === "bogota") && MAPA_BARRIOS[normZone]) {
    const info = MAPA_BARRIOS[normZone];
    return {
      isValid: true,
      barrioCanonico: info.barrioCanonico,
      localidad: info.localidad,
      city: info.isMunicipio ? info.barrioCanonico : "Bogot\xE1",
      isMunicipio: info.isMunicipio || false
    };
  }
  const isExplicitVereda = /\bvereda\b/i.test(zona);
  const veredaMatch = lookupVereda(zona, ciudad);
  if (veredaMatch && (isExplicitVereda || ciudad && normalizarTextoGeografico(ciudad) !== "bogota" || !MAPA_BARRIOS[normZone])) {
    const veredaTitle = veredaMatch.vereda.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    const mpioTitle = veredaMatch.municipio.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    console.log(`[Geocoding-Vereda] IGAC Vereda resuelta "${zona}" \u2794 "Vereda ${veredaTitle}" (${mpioTitle}, ${veredaMatch.departamento})`);
    return {
      isValid: true,
      barrioCanonico: `Vereda ${veredaTitle}`,
      localidad: mpioTitle,
      city: mpioTitle,
      isMunicipio: true
    };
  }
  const queryAddress = ciudad && normalizarTextoGeografico(ciudad) !== "bogota" ? `${zona}, ${ciudad}, Colombia` : `${zona}, Bogot\xE1, Colombia`;
  const googleResult = await geocodeAddress(queryAddress);
  if (googleResult) {
    if (googleResult.isValid) {
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
    } else if (googleResult.isApiError) {
      console.warn(`[validarZona] API de Google Maps fall\xF3 (Status/Keys). Activando fallback silencioso con coordenadas nulas para no descartar el registro.`);
      return {
        isValid: true,
        barrioCanonico: zona.trim(),
        localidad: ciudad || "Bogot\xE1",
        city: ciudad || "Bogot\xE1",
        isMunicipio: ciudad ? normalizarTextoGeografico(ciudad) !== "bogota" : false,
        latitude: void 0,
        longitude: void 0
      };
    }
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
function desambiguarBarriosCompuestos(zona) {
  if (!zona || zona.trim().length === 0) return [zona];
  const PARES_CONOCIDOS = {
    // Chicó + Refugio (Usaquén ↔ Chapinero)
    "chico refugio": ["El Chic\xF3", "El Refugio"],
    "el chico refugio": ["El Chic\xF3", "El Refugio"],
    "chico el refugio": ["El Chic\xF3", "El Refugio"],
    "chico-refugio": ["El Chic\xF3", "El Refugio"],
    // Rosales + Cabrera (Chapinero)
    "rosales cabrera": ["Rosales", "La Cabrera"],
    "la cabrera rosales": ["Rosales", "La Cabrera"],
    "cabrera rosales": ["Rosales", "La Cabrera"],
    // Rosales + Virrey
    "rosales virrey": ["Rosales", "El Virrey"],
    "virrey rosales": ["Rosales", "El Virrey"],
    // Cedritos + Country
    "cedritos country": ["Cedritos", "Country Club"],
    "country cedritos": ["Cedritos", "Country Club"],
    // Santa Bárbara + Chicó
    "santa barbara chico": ["Santa B\xE1rbara", "El Chic\xF3"],
    // Niza + Alhambra
    "niza alhambra": ["Niza", "Alhambra"],
    // Lago + Retiro
    "lago retiro": ["El Lago", "El Retiro"],
    "retiro lago": ["El Lago", "El Retiro"],
    // Salitre + Modelia
    "salitre modelia": ["Ciudad Salitre Oriental", "Modelia"]
  };
  const normInput = normalizarTextoGeografico(zona);
  if (PARES_CONOCIDOS[normInput]) {
    console.log(`[Geography-Disambiguate] "${zona}" \u2192 ${JSON.stringify(PARES_CONOCIDOS[normInput])}`);
    return PARES_CONOCIDOS[normInput];
  }
  const normWords = normInput.split(" ").filter((w) => w.length >= 3);
  if (normWords.length >= 2) {
    for (let splitAt = 1; splitAt < normWords.length; splitAt++) {
      const part1 = normWords.slice(0, splitAt).join(" ");
      const part2 = normWords.slice(splitAt).join(" ");
      const barrio1 = MAPA_BARRIOS[part1];
      const barrio2 = MAPA_BARRIOS[part2];
      if (barrio1 && barrio2 && barrio1.localidad !== barrio2.localidad) {
        const result = [barrio1.barrioCanonico, barrio2.barrioCanonico];
        console.log(`[Geography-Disambiguate-Dynamic] "${zona}" \u2192 ${JSON.stringify(result)}`);
        return result;
      }
    }
  }
  return [zona.trim()];
}
async function resolverCuadranteVial(texto) {
  const norm2 = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const isSur = norm2.includes("sur");
  let minSt;
  let maxSt;
  if (norm2.includes("avenida el dorado") || norm2.includes("av el dorado") || norm2.includes("av. el dorado")) {
    minSt = 26;
  }
  if (norm2.includes("primero de mayo") || norm2.includes("1 de mayo")) {
    minSt = 22;
  }
  let calleMatch = norm2.match(/(?:calle|cll|cl|c|entre\s+la|de\s+la|desde\s+la)?\s*(\d+)\s*(?:sur)?\s*(?:y|a|a\s+la|-|hasta|\s+y\s+la|\s+a\s+la|\s+a\s+|\s+y\s+)\s*(?:la\s*)?(?:calle|cll|cl|c)?\s*(\d+)\s*(?:sur)?/i) || norm2.match(/entre\s+(?:la\s*)?(\d+)\s+(?:y|a|hasta)\s+(?:la\s*)?(\d+)/i);
  const singleCalleMatch = norm2.match(/(?:calle|cll|cl|c)\s*(\d+)/i);
  const relativeNorthMatch = norm2.match(/(?:calle|cll|cl|c)\s*(\d+)\s*(?:hacia\s+arriba|para\s+arriba|al\s+norte|hacia\s+el\s+norte)/i);
  if (calleMatch) {
    const c1 = parseInt(calleMatch[1]);
    const c2 = parseInt(calleMatch[2]);
    minSt = minSt !== void 0 ? Math.min(minSt, c1, c2) : Math.min(c1, c2);
    maxSt = maxSt !== void 0 ? Math.max(maxSt, c1, c2) : Math.max(c1, c2);
  } else if (relativeNorthMatch) {
    minSt = parseInt(relativeNorthMatch[1]);
    maxSt = Math.min(minSt + 50, 240);
  } else if (singleCalleMatch && minSt !== void 0) {
    const c1 = parseInt(singleCalleMatch[1]);
    maxSt = Math.max(minSt, c1);
    minSt = Math.min(minSt, c1);
  } else {
    return { resuelto: false, barrios: [], descripcion: "No es un cuadrante vial resoluble por rango de calles", confianza: "ninguna" };
  }
  const LON_CERROS = -74.015;
  const LON_OCCIDENTE = -74.19;
  const LON_AUTOPISTA = -74.0535;
  const LON_SEPTIMA = -74.035;
  const LON_CARACAS = -74.08;
  const LON_CRA10 = -74.074;
  const LON_AV68 = -74.11;
  const LON_BOYACA = -74.125;
  const LON_CALI = -74.145;
  const getLonFromCra = (craNum) => {
    if (craNum <= 7) return LON_SEPTIMA;
    if (craNum >= 45 && !isSur) return LON_AUTOPISTA;
    return -74.065 - craNum * 85e-5;
  };
  let minLon = LON_OCCIDENTE;
  let maxLon = LON_CERROS;
  const isArribaAuto = norm2.includes("arriba de la autopista") || norm2.includes("arriba de la auto") || norm2.includes("oriente de la autopista");
  const isAbajoAuto = norm2.includes("abajo de la autopista") || norm2.includes("abajo de la auto") || norm2.includes("occidente de la autopista");
  const isArriba7 = norm2.includes("arriba de la 7") || norm2.includes("arriba de la septima") || norm2.includes("arriba de la s\xE9ptima");
  const isArribaBoyaca = norm2.includes("arriba de la boyaca") || norm2.includes("arriba de la boyac\xE1");
  const isAbajoBoyaca = norm2.includes("abajo de la boyaca") || norm2.includes("abajo de la boyac\xE1") || norm2.includes("boyaca hacia abajo") || norm2.includes("boyaca al occidente");
  let landmarkLons = [];
  if (norm2.includes("avenida caracas") || norm2.includes("av caracas") || norm2.includes("caracas")) landmarkLons.push(LON_CARACAS);
  if (norm2.includes("carrera 10") || norm2.includes("cra 10") || norm2.includes("cr 10") || norm2.includes("carreras 10")) landmarkLons.push(LON_CRA10);
  if (norm2.includes("avenida 68") || norm2.includes("av 68")) landmarkLons.push(LON_AV68);
  if (norm2.includes("boyaca") || norm2.includes("boyac\xE1")) landmarkLons.push(LON_BOYACA);
  if (norm2.includes("ciudad de cali") || norm2.includes("av cali")) landmarkLons.push(LON_CALI);
  const craMatch = norm2.match(/(?:carrera|cra|cr|k|kr|carreras|cras|krs)\s*(\d+)\s*(?:y|a|a\s+la|-|hasta|\s+y\s+la|\s+a\s+|\s+y\s+)\s*(?:carrera|cra|cr|k|kr|carreras|cras|krs)?\s*(\d+)/i) || norm2.match(/(?:con\s+)?carreras?\s*(\d+)\s*(?:a|y|-)\s*(\d+)/i) || norm2.match(/entre\s+(?:la\s*)?(?:autopista|auto)\s+y\s+(?:la\s*)?(?:carrera|cra|cr|k|kr)?\s*(\d+)/i) || norm2.match(/entre\s+(?:la\s*)?(?:carrera|cra|cr|k|kr)?\s*(\d+)\s+y\s+(?:la\s*)?(?:autopista|auto)/i);
  if (craMatch) {
    let cra1, cra2;
    if (norm2.includes("autopista") || norm2.includes("auto")) {
      cra1 = 45;
      cra2 = parseInt(craMatch[1]);
    } else {
      cra1 = parseInt(craMatch[1]);
      cra2 = parseInt(craMatch[2]);
    }
    landmarkLons.push(getLonFromCra(cra1), getLonFromCra(cra2));
  }
  if (landmarkLons.length >= 2) {
    minLon = Math.min(...landmarkLons) - 3e-3;
    maxLon = Math.max(...landmarkLons) + 3e-3;
  } else if (landmarkLons.length === 1 && isAbajoBoyaca) {
    minLon = LON_OCCIDENTE;
    maxLon = landmarkLons[0] + 2e-3;
  } else if (landmarkLons.length === 1 && isArribaBoyaca) {
    minLon = landmarkLons[0] - 2e-3;
    maxLon = LON_CERROS;
  } else if (isArribaAuto) {
    minLon = LON_AUTOPISTA;
    maxLon = LON_CERROS;
  } else if (isAbajoAuto) {
    minLon = LON_OCCIDENTE;
    maxLon = LON_AUTOPISTA;
  } else if (isArriba7) {
    minLon = LON_SEPTIMA;
    maxLon = LON_CERROS;
  } else if (isArribaBoyaca) {
    minLon = LON_BOYACA;
    maxLon = LON_CERROS;
  } else if (isAbajoBoyaca) {
    minLon = LON_OCCIDENTE;
    maxLon = LON_BOYACA;
  }
  try {
    const db = await getDb();
    if (db) {
      let minLat, maxLat;
      if (isSur) {
        minLat = 4.597 - maxSt * 94e-5;
        maxLat = 4.597 - minSt * 94e-5;
      } else {
        minLat = 4.597 + minSt * 94e-5;
        maxLat = 4.597 + maxSt * 94e-5;
      }
      const spatialQuery = sql`
        SELECT DISTINCT scanombre
        FROM barrios_bogota_geojson
        WHERE ST_Intersects(geometry, ST_MakeEnvelope(${minLon}, ${minLat}, ${maxLon}, ${maxLat}, 4326))
        ORDER BY scanombre;
      `;
      const rows = await db.execute(spatialQuery);
      if (rows && rows.length > 0) {
        const barrios = rows.map((r) => String(r.scanombre).trim());
        console.log(`[Geocoding-Cuadrante] Intersecci\xF3n espacial IDECA (${barrios.length} sectores catastrales) resuelto [alta_geometria_ideca] \u2794 "${barrios.slice(0, 10).join(", ")}${barrios.length > 10 ? "..." : ""}"`);
        return {
          resuelto: true,
          barrios,
          descripcion: `Intersecci\xF3n espacial IDECA (${barrios.length} sectores catastrales)`,
          confianza: "alta_geometria_ideca"
        };
      }
    }
  } catch (err) {
    console.error("[Geocoding-Cuadrante-Spatial] Error consultando barrios_bogota_geojson:", err);
  }
  try {
    let craMinNum = 1;
    let craMaxNum = 30;
    if (craMatch) {
      const k1 = parseInt(craMatch[1]);
      const k2 = parseInt(craMatch[2]);
      if (!isNaN(k1) && !isNaN(k2)) {
        craMinNum = Math.min(k1, k2);
        craMaxNum = Math.max(k1, k2);
      }
    } else if (isArribaAuto) {
      craMinNum = 1;
      craMaxNum = 45;
    } else if (isAbajoAuto) {
      craMinNum = 45;
      craMaxNum = 120;
    } else if (isArriba7) {
      craMinNum = 1;
      craMaxNum = 7;
    }
    const idecaResult = lookupBarriosByPerimeter({
      calleNorte: maxSt,
      calleSur: minSt,
      craOriente: craMinNum,
      craOccidente: craMaxNum,
      ciudad: "bogota"
    });
    if (idecaResult.barrios && idecaResult.barrios.length > 0) {
      console.log(`[Geocoding-Cuadrante] Intersecci\xF3n local IDECA (${idecaResult.barrios.length} sectores catastrales) resuelto \u2794 "${idecaResult.barrios.slice(0, 10).join(", ")}"`);
      return {
        resuelto: true,
        barrios: idecaResult.barrios,
        descripcion: `Intersecci\xF3n local IDECA (${idecaResult.barrios.length} sectores catastrales)`,
        confianza: "alta_geometria_ideca_local"
      };
    }
  } catch (idecaErr) {
    console.warn("[Geocoding-Cuadrante-IDECA] Error en motor local IDECA:", idecaErr?.message || idecaErr);
  }
  let candidateBarrios = [];
  if (minSt >= 1 && maxSt <= 34) {
    candidateBarrios = ["La Candelaria", "Centro", "Las Nieves", "La Macarena", "Teusaquillo"];
  } else if (minSt >= 34 && maxSt <= 63) {
    candidateBarrios = ["Chapinero Central", "Marly", "Palermo", "Teusaquillo", "Galer\xEDas"];
  } else if (minSt >= 63 && maxSt <= 85) {
    candidateBarrios = ["Chapinero Alto", "Rosales", "El Nogal", "La Cabrera", "Quinta Camacho", "El Lago"];
  } else if (minSt >= 85 && maxSt <= 106) {
    candidateBarrios = ["Rinc\xF3n del Chic\xF3", "Chic\xF3", "Chic\xF3 Norte", "Chic\xF3 Reservado", "La Cabrera", "Antiguo Country"];
  } else if (minSt >= 106 && maxSt <= 127) {
    candidateBarrios = ["Santa B\xE1rbara Occidental", "Santa B\xE1rbara Central", "Santa B\xE1rbara Oriental", "La Calleja", "Unicentro", "San Patricio", "El Country"];
  } else if (minSt >= 127 && maxSt <= 153) {
    candidateBarrios = ["Cedritos", "Contador", "Belmira", "Lisboa", "Nueva Autopista"];
  } else if (minSt >= 153 && maxSt <= 175) {
    candidateBarrios = ["Tober\xEDn", "Mazur\xE9n", "Gilmar", "Colina Campestre", "Orqu\xEDdeas"];
  } else if (minSt >= 175) {
    candidateBarrios = ["San Jos\xE9 de Banderas", "Guaymaral", "San Antonio", "Torca"];
  } else {
    candidateBarrios = ["Santa B\xE1rbara", "Cedritos", "Unicentro", "Chic\xF3"];
  }
  return {
    resuelto: true,
    barrios: candidateBarrios,
    descripcion: `Cuadrante Calles ${minSt}-${maxSt} (Fallback Respaldo Matriz)`,
    confianza: "aproximada"
  };
}
function deducirGeografiaTripartita(inputZone, inputCity, groupName, rawText) {
  const normZone = inputZone ? normalizarTextoGeografico(inputZone) : "";
  const normCity = inputCity ? normalizarTextoGeografico(inputCity) : "";
  const normGroup = groupName ? normalizarTextoGeografico(groupName) : "";
  const normText = rawText ? normalizarTextoGeografico(rawText) : "";
  const textCombined = `${normZone} ${normCity} ${normText}`;
  const cesarKeywords = ["cesar", "valledupar", "aguachica", "bosconia", "codazzi", "la paz cesar"];
  if (cesarKeywords.some((k) => textCombined.includes(k))) {
    let neighborhood2 = inputZone && inputZone.trim() !== "" && !cesarKeywords.includes(normZone) ? inputZone.trim() : "Valledupar";
    if (textCombined.includes("lisboa")) neighborhood2 = "Lisboa";
    else if (textCombined.includes("novalito")) neighborhood2 = "Novalito";
    else if (textCombined.includes("los cortijos")) neighborhood2 = "Los Cortijos";
    return {
      neighborhood: neighborhood2,
      locality: "Valledupar",
      city: "Valledupar",
      department: "Cesar",
      confidence: "alta_deduccion_cesar"
    };
  }
  const santanderKeywords = [
    "bucaramanga",
    "floridablanca",
    "giron",
    "piedecuesta",
    "san gil",
    "barrancabermeja",
    "santander",
    "ruitoque",
    "cabecera del llano",
    "cabecera",
    "canaveral",
    "ca\xF1averal",
    "sotomayor"
  ];
  if (santanderKeywords.some((k) => textCombined.includes(k))) {
    let city = "Bucaramanga";
    if (textCombined.includes("floridablanca") || textCombined.includes("canaveral") || textCombined.includes("ca\xF1averal") || textCombined.includes("ruitoque")) city = "Floridablanca";
    else if (textCombined.includes("piedecuesta")) city = "Piedecuesta";
    else if (textCombined.includes("giron") || textCombined.includes("gir\xF3n")) city = "Gir\xF3n";
    else if (textCombined.includes("barrancabermeja")) city = "Barrancabermeja";
    else if (textCombined.includes("san gil")) city = "San Gil";
    let neighborhood2 = city;
    if (textCombined.includes("cabecera")) neighborhood2 = "Cabecera del Llano";
    else if (textCombined.includes("ruitoque")) neighborhood2 = "Ruitoque Condominio";
    else if (textCombined.includes("canaveral") || textCombined.includes("ca\xF1averal")) neighborhood2 = "Ca\xF1averal";
    else if (textCombined.includes("sotomayor")) neighborhood2 = "Sotomayor";
    else if (inputZone && inputZone.trim() !== "" && inputZone.toLowerCase() !== "na") neighborhood2 = inputZone.trim();
    return {
      neighborhood: neighborhood2,
      locality: "\xC1rea Metropolitana Bucaramanga",
      city,
      department: "Santander",
      confidence: "alta_deduccion_santander"
    };
  }
  const cartagenaKeywords = [
    "cartagena",
    "bocagrande",
    "castillogrande",
    "manga",
    "crespo",
    "laguito",
    "el laguito",
    "serena del mar",
    "morros",
    "los morros",
    "pie de la popa",
    "getsemani",
    "centro historico cartagena"
  ];
  if (cartagenaKeywords.some((k) => textCombined.includes(k))) {
    let neighborhood2 = "Cartagena";
    if (textCombined.includes("bocagrande")) neighborhood2 = "Bocagrande";
    else if (textCombined.includes("castillogrande")) neighborhood2 = "Castillogrande";
    else if (textCombined.includes("manga")) neighborhood2 = "Manga";
    else if (textCombined.includes("crespo")) neighborhood2 = "Crespo";
    else if (textCombined.includes("laguito")) neighborhood2 = "El Laguito";
    else if (textCombined.includes("serena del mar")) neighborhood2 = "Serena del Mar";
    else if (inputZone && inputZone.trim() !== "" && inputZone.toLowerCase() !== "na") neighborhood2 = inputZone.trim();
    return {
      neighborhood: neighborhood2,
      locality: "Cartagena",
      city: "Cartagena",
      department: "Bol\xEDvar",
      confidence: "alta_deduccion_cartagena"
    };
  }
  const santaMartaKeywords = [
    "santa marta",
    "rodadero",
    "el rodadero",
    "bello horizonte",
    "pozos colorados",
    "taganga",
    "playa dormida",
    "magdalena"
  ];
  if (santaMartaKeywords.some((k) => textCombined.includes(k))) {
    let neighborhood2 = "Santa Marta";
    if (textCombined.includes("rodadero")) neighborhood2 = "El Rodadero";
    else if (textCombined.includes("bello horizonte")) neighborhood2 = "Bello Horizonte";
    else if (textCombined.includes("pozos colorados")) neighborhood2 = "Pozos Colorados";
    else if (inputZone && inputZone.trim() !== "" && inputZone.toLowerCase() !== "na") neighborhood2 = inputZone.trim();
    return {
      neighborhood: neighborhood2,
      locality: "Santa Marta",
      city: "Santa Marta",
      department: "Magdalena",
      confidence: "alta_deduccion_santamarta"
    };
  }
  const pereiraKeywords = ["pereira", "dosquebradas", "cerritos", "pinares", "alpes pereira", "circasia", "risaralda"];
  if (pereiraKeywords.some((k) => textCombined.includes(k))) {
    let city = textCombined.includes("dosquebradas") ? "Dosquebradas" : "Pereira";
    let neighborhood2 = city;
    if (textCombined.includes("cerritos")) neighborhood2 = "Cerritos";
    else if (textCombined.includes("pinares")) neighborhood2 = "Pinares";
    else if (inputZone && inputZone.trim() !== "" && inputZone.toLowerCase() !== "na") neighborhood2 = inputZone.trim();
    return {
      neighborhood: neighborhood2,
      locality: "\xC1rea Metropolitana Centro Occidente",
      city,
      department: "Risaralda",
      confidence: "alta_deduccion_pereira"
    };
  }
  const manizalesKeywords = ["manizales", "villamaria", "palermo manizales", "cable manizales", "caldas"];
  if (manizalesKeywords.some((k) => textCombined.includes(k))) {
    return {
      neighborhood: inputZone?.trim() || "Manizales",
      locality: "Manizales",
      city: textCombined.includes("villamaria") ? "Villamar\xEDa" : "Manizales",
      department: "Caldas",
      confidence: "alta_deduccion_manizales"
    };
  }
  const armeniaKeywords = ["armenia", "calarca", "quimbaya", "montenegro", "quindio"];
  if (armeniaKeywords.some((k) => textCombined.includes(k))) {
    return {
      neighborhood: inputZone?.trim() || "Armenia",
      locality: "Armenia",
      city: textCombined.includes("calarca") ? "Calarc\xE1" : textCombined.includes("quimbaya") ? "Quimbaya" : "Armenia",
      department: "Quind\xEDo",
      confidence: "alta_deduccion_armenia"
    };
  }
  const tolimaKeywords = ["ibague", "espinal", "melgar", "carmen de apicala", "flandes", "tolima"];
  if (tolimaKeywords.some((k) => textCombined.includes(k))) {
    let city = "Ibagu\xE9";
    if (textCombined.includes("melgar")) city = "Melgar";
    else if (textCombined.includes("carmen de apicala")) city = "Carmen de Apical\xE1";
    else if (textCombined.includes("espinal")) city = "El Espinal";
    return {
      neighborhood: inputZone?.trim() || city,
      locality: city,
      city,
      department: "Tolima",
      confidence: "alta_deduccion_tolima"
    };
  }
  const metaKeywords = ["villavicencio", "acacias", "restrepo meta", "cumaral", "meta"];
  if (metaKeywords.some((k) => textCombined.includes(k))) {
    return {
      neighborhood: inputZone?.trim() || "Villavicencio",
      locality: "Villavicencio",
      city: textCombined.includes("acacias") ? "Acac\xEDas" : "Villavicencio",
      department: "Meta",
      confidence: "alta_deduccion_meta"
    };
  }
  const caliSectors = [
    "alamos",
    "brisas de los alamos",
    "menga",
    "chipichape",
    "la flora",
    "santa monica",
    "ciudad jardin",
    "valle del lili",
    "san fernando",
    "granada",
    "el penon",
    "juanambu",
    "pance",
    "bochalema",
    "caney",
    "el caney",
    "tequendama",
    "normandie",
    "imbanaco",
    "cali",
    "jamundi",
    "yumbo",
    "palmira",
    "valle del cauca"
  ];
  const isCali = normCity === "cali" || normCity === "" && normGroup.includes("cali") && !textCombined.includes("bogota") || caliSectors.some((s) => textCombined.includes(s));
  if (isCali) {
    let neighborhood2 = "Cali";
    let locality2 = "Cali Urbano";
    let city = "Cali";
    if (textCombined.includes("jamundi") || textCombined.includes("jamund\xED")) {
      neighborhood2 = "Jamund\xED";
      locality2 = "Jamund\xED";
      city = "Jamund\xED";
    } else if (textCombined.includes("alamos") || textCombined.includes("brisas de los alamos")) {
      neighborhood2 = "Brisas de los \xC1lamos";
      locality2 = "Comuna 2 (Norte)";
    } else if (textCombined.includes("menga") || textCombined.includes("chipichape") || textCombined.includes("la flora")) {
      neighborhood2 = textCombined.includes("menga") ? "Menga" : textCombined.includes("chipichape") ? "Chipichape" : "La Flora";
      locality2 = "Comuna 2 (Norte)";
    } else if (textCombined.includes("ciudad jardin")) {
      neighborhood2 = "Ciudad Jard\xEDn";
      locality2 = "Comuna 22 (Sur)";
    } else if (textCombined.includes("valle del lili") || textCombined.includes("lili")) {
      neighborhood2 = "Valle del Lili";
      locality2 = "Comuna 17 (Sur)";
    } else if (textCombined.includes("san fernando") || textCombined.includes("tequendama") || textCombined.includes("imbanaco")) {
      neighborhood2 = "San Fernando";
      locality2 = "Comuna 19";
    } else if (textCombined.includes("granada") || textCombined.includes("penon") || textCombined.includes("juanambu")) {
      neighborhood2 = textCombined.includes("granada") ? "Granada" : textCombined.includes("juanambu") ? "Juanamb\xFA" : "El Pe\xF1\xF3n";
      locality2 = "Comuna 3 (Oeste)";
    } else if (inputZone && inputZone.trim() !== "" && inputZone.toLowerCase() !== "na") {
      neighborhood2 = inputZone.trim();
    }
    return {
      neighborhood: neighborhood2,
      locality: locality2,
      city,
      department: "Valle del Cauca",
      confidence: "alta_deduccion_cali"
    };
  }
  const medellinSectors = [
    "poblado",
    "el poblado",
    "laureles",
    "estadio",
    "belen",
    "envigado",
    "sabaneta",
    "itagui",
    "rionegro",
    "la ceja",
    "el retiro",
    "la estrella",
    "copacabana",
    "girardota",
    "medellin",
    "antioquia"
  ];
  const isMedellin = normCity === "medellin" || normCity === "" && normGroup.includes("medellin") && !textCombined.includes("bogota") || medellinSectors.some((s) => textCombined.includes(s));
  if (isMedellin) {
    let neighborhood2 = "Medell\xEDn";
    let locality2 = "Valle de Aburr\xE1";
    let city = "Medell\xEDn";
    if (textCombined.includes("poblado")) {
      neighborhood2 = "El Poblado";
      locality2 = "Comuna 14 (El Poblado)";
    } else if (textCombined.includes("laureles") || textCombined.includes("estadio")) {
      neighborhood2 = "Laureles";
      locality2 = "Comuna 11 (Laureles-Estadio)";
    } else if (textCombined.includes("belen")) {
      neighborhood2 = "Bel\xE9n";
      locality2 = "Comuna 16 (Bel\xE9n)";
    } else if (textCombined.includes("envigado")) {
      neighborhood2 = "Envigado";
      locality2 = "Envigado";
      city = "Envigado";
    } else if (textCombined.includes("sabaneta")) {
      neighborhood2 = "Sabaneta";
      locality2 = "Sabaneta";
      city = "Sabaneta";
    } else if (textCombined.includes("rionegro")) {
      neighborhood2 = "Rionegro";
      locality2 = "Rionegro";
      city = "Rionegro";
    } else if (textCombined.includes("la ceja")) {
      neighborhood2 = "La Ceja";
      locality2 = "Oriente Antioque\xF1o";
      city = "La Ceja";
    } else if (inputZone && inputZone.trim() !== "" && inputZone.toLowerCase() !== "na") {
      neighborhood2 = inputZone.trim();
    }
    return {
      neighborhood: neighborhood2,
      locality: locality2,
      city,
      department: "Antioquia",
      confidence: "alta_deduccion_medellin"
    };
  }
  const sabanaSectors = {
    "chia": "Ch\xEDa",
    "cajica": "Cajic\xE1",
    "sopo": "Sop\xF3",
    "cota": "Cota",
    "la calera": "La Calera",
    "zipaquira": "Zipaquir\xE1",
    "funza": "Funza",
    "mosquera": "Mosquera",
    "madrid": "Madrid",
    "facatativa": "Facatativ\xE1",
    "fusagasuga": "Fusagasug\xE1",
    "girardot": "Girardot",
    "anapoima": "Anapoima",
    "la mesa": "La Mesa",
    "villeta": "Villeta",
    "subachoque": "Subachoque",
    "tabio": "Tabio",
    "tenjo": "Tenjo",
    "tocancipa": "Tocancip\xE1"
  };
  for (const [sKey, sName] of Object.entries(sabanaSectors)) {
    if (textCombined.includes(sKey)) {
      return {
        neighborhood: sName,
        locality: sName,
        city: sName,
        department: "Cundinamarca",
        confidence: "alta_deduccion_sabana"
      };
    }
  }
  const isGenericZone = !inputZone || inputZone.trim() === "" || normalizarTextoGeografico(inputZone).trim() === "na" || normalizarTextoGeografico(inputZone).includes("bogota") || normalizarTextoGeografico(inputZone).includes("bogot\xE1");
  let neighborhood = isGenericZone ? null : inputZone?.trim() || null;
  let locality = null;
  let foundBarrio = false;
  const cleanSearchText = normText.replace(/\b(?:a\s+minutos\s+de|a\s+pocos\s+minutos\s+de|cerca\s+de|cerca\s+a|proximo\s+a|frente\s+a|diagonal\s+a|al\s+lado\s+de|hacia)\s+[^,\.\n]+/gi, " ").replace(/\bhacienda\s+santa\s+barbara\b/gi, "centro_comercial").replace(/\bcentro\s+andino\b/gi, "centro_comercial").replace(/\bunilago\b/gi, "centro_comercial").replace(/\bunicentro\b/gi, "centro_comercial").replace(/\bparque\s+(?:del\s+|el\s+)?virrey\b/gi, "parque").replace(/\bparque\s+93\b/gi, "parque").replace(/\bparque\s+de\s+la\s+93\b/gi, "parque");
  const cleanSearchCombined = `${normZone} ${cleanSearchText}`;
  const COMPLEX_ALIASES = {
    "balcones de medina": { neighborhood: "Bosque Medina", locality: "Usaqu\xE9n" },
    "bosque medina": { neighborhood: "Bosque Medina", locality: "Usaqu\xE9n" },
    "chico navarra": { neighborhood: "Chic\xF3 Navarra", locality: "Chapinero" },
    "chico norte": { neighborhood: "Chic\xF3 Norte", locality: "Chapinero" },
    "chico reservado": { neighborhood: "Chic\xF3 Reservado", locality: "Chapinero" },
    "rincon del chico": { neighborhood: "Rinc\xF3n del Chic\xF3", locality: "Chapinero" },
    "los rosales": { neighborhood: "Rosales", locality: "Chapinero" },
    "la cabrera": { neighborhood: "La Cabrera", locality: "Chapinero" },
    "el nogal": { neighborhood: "El Nogal", locality: "Chapinero" },
    "santa ana oriental": { neighborhood: "Santa Ana Oriental", locality: "Usaqu\xE9n" },
    "santa barbara central": { neighborhood: "Santa B\xE1rbara Central", locality: "Usaqu\xE9n" },
    "santa barbara (central)": { neighborhood: "Santa B\xE1rbara Central", locality: "Usaqu\xE9n" },
    "santa barbara occidental": { neighborhood: "Santa B\xE1rbara Occidental", locality: "Usaqu\xE9n" },
    "santa barbara oriental": { neighborhood: "Santa B\xE1rbara Oriental", locality: "Usaqu\xE9n" },
    "santa barbara alta": { neighborhood: "Santa B\xE1rbara Alta", locality: "Usaqu\xE9n" },
    "niza norte": { neighborhood: "Niza Norte", locality: "Suba" },
    "niza antigua": { neighborhood: "Niza", locality: "Suba" },
    "nuevo country": { neighborhood: "Nuevo Country", locality: "Usaqu\xE9n" },
    "bella suiza": { neighborhood: "Bella Suiza", locality: "Usaqu\xE9n" },
    "bella suiza baja": { neighborhood: "Bella Suiza", locality: "Usaqu\xE9n" }
  };
  for (const [alias, data] of Object.entries(COMPLEX_ALIASES)) {
    if (cleanSearchCombined.includes(alias)) {
      neighborhood = data.neighborhood;
      locality = data.locality;
      foundBarrio = true;
      break;
    }
  }
  if (!foundBarrio) {
    const allBarriosWithLoc = [];
    for (const [, info] of Object.entries(DICCIONARIO_BOGOTA)) {
      for (const b of info.barrios) {
        allBarriosWithLoc.push({
          name: b,
          locality: info.localidad,
          norm: normalizarTextoGeografico(b)
        });
      }
    }
    allBarriosWithLoc.sort((a, b) => b.norm.length - a.norm.length);
    if (!isGenericZone) {
      for (const item of allBarriosWithLoc) {
        if (item.norm === normZone || normZone.includes(item.norm) && item.norm.length > 4) {
          neighborhood = item.name;
          locality = item.locality;
          foundBarrio = true;
          break;
        }
      }
    }
    if (!foundBarrio) {
      for (const item of allBarriosWithLoc) {
        if (cleanSearchCombined.includes(item.norm) && item.norm.length > 4) {
          neighborhood = item.name;
          locality = item.locality;
          foundBarrio = true;
          break;
        }
      }
    }
  }
  if (!foundBarrio) {
    neighborhood = isGenericZone ? null : inputZone && !GENERIC_ZONES_SET.has(normalizarTextoGeografico(inputZone)) ? inputZone.trim() : null;
    locality = null;
  }
  return {
    neighborhood,
    locality,
    city: "Bogot\xE1, D.C.",
    department: "Cundinamarca / D.C.",
    confidence: foundBarrio ? "alta_deduccion_bogota" : "pendiente_revision_ubicacion"
  };
}
function extractIntersectionFromText(text2) {
  if (!text2) return null;
  const clean = text2.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, " ");
  const pCra = clean.match(/(?:carrera|cra|cr|k|kr|septima|7ma)\s*(\d{1,3})?\s*(?:con|y|#|no\.?|x)\s*(?:calle|cll|c\b)?\s*(\d{1,3})(?:a|b|c|ta|da|ra|ma)?\b/i);
  if (pCra) {
    let cra = pCra[1] ? parseInt(pCra[1], 10) : clean.includes("septima") || clean.includes("7ma") ? 7 : 0;
    const calle = parseInt(pCra[2], 10);
    if (cra > 0 && calle > 0 && calle <= 240 && cra <= 150) {
      return { calle, carrera: cra };
    }
  }
  const pCll = clean.match(/(?:en\s+la|calle|cll|c\s*\.?\s*)?\s*(\d{1,3})(?:a|b|c)?\s*(?:con|#|no\.?|y|x)\s*(?:carrera|cra|cr|k|kr|septima|7ma)?\s*(\d{1,3})?(?:a|b|c|ta|da|ra|ma)?\b/i);
  if (pCll) {
    const num1 = parseInt(pCll[1], 10);
    let num2 = pCll[2] ? parseInt(pCll[2], 10) : pCll[0].includes("septima") || pCll[0].includes("7ma") ? 7 : 0;
    if (num1 >= 1 && num1 <= 240 && num2 >= 1 && num2 <= 150) {
      return { calle: num1, carrera: num2 };
    }
  }
  return null;
}
function resolveIntersectionToBarrio(text2) {
  const coords = extractIntersectionFromText(text2);
  if (!coords) return null;
  const perimeter = {
    calleNorte: Math.min(240, coords.calle + 1),
    calleSur: Math.max(1, coords.calle - 1),
    craOriente: Math.max(1, coords.carrera - 1),
    craOccidente: Math.min(150, coords.carrera + 1),
    ciudad: "bogota"
  };
  const lookup = lookupBarriosByPerimeter(perimeter);
  let locality = "Chapinero";
  if (coords.calle >= 100 && coords.carrera <= 60) locality = "Usaqu\xE9n";
  else if (coords.calle >= 100 && coords.carrera > 60) locality = "Suba";
  else if (coords.calle < 100 && coords.calle >= 39) locality = "Chapinero";
  else if (coords.calle < 39 && coords.calle >= 1) locality = "Santa Fe";
  const primaryBarrio = lookup.barrios[0] || `Calle ${coords.calle} con Cra ${coords.carrera}`;
  return {
    barrio: primaryBarrio,
    barriosAlternos: lookup.barrios,
    localidad: locality,
    ciudad: "Bogot\xE1, D.C."
  };
}
var GENERIC_ZONES_SET, DICCIONARIO_BOGOTA, MUNICIPIOS_CERCANOS, MAPA_BARRIOS, MAPA_LOCALIDADES;
var init_geography = __esm({
  "server/_core/geography.ts"() {
    "use strict";
    init_colombia_geography();
    init_geocoding();
    init_db();
    init_schema();
    init_geo_lookup();
    init_veredas_lookup();
    GENERIC_ZONES_SET = /* @__PURE__ */ new Set([
      "bogota",
      "bogota d c",
      "bogota dc",
      "medellin",
      "cali",
      "barranquilla",
      "colombia",
      "norte",
      "sur",
      "centro",
      "n/e",
      "na",
      "null",
      "undefined",
      ""
    ]);
    DICCIONARIO_BOGOTA = {
      "usaquen": {
        localidad: "Usaqu\xE9n",
        barrios: [
          "Cedritos",
          "Los Cedros",
          "Santa B\xE1rbara",
          "Santa B\xE1rbara Central",
          "Santa B\xE1rbara Occidental",
          "Santa B\xE1rbara Oriental",
          "Santa B\xE1rbara Norte",
          "Las Santas",
          "Todas las Santas",
          "Santa Ana",
          "Santa Ana Central",
          "Santa Ana Oriental",
          "Santa Ana Occidental",
          "Santa Paula",
          "Santa Bibiana",
          "San Patricio",
          "Santa Teresa",
          "Usaqu\xE9n",
          "Tober\xEDn",
          "Country Club",
          "La Uribe",
          "Verbenal",
          "Barrancas",
          "Horizontes",
          "La Cita",
          "Tibabita",
          "La Cer\xE1mica",
          "La Uni\xF3n",
          "Los Arrayanes",
          "Bosque Medina",
          "La Calleja",
          "Calleja Baja",
          "Calleja Alta",
          "Bosque De Pinos",
          "Bella Suiza",
          "Colina Campestre",
          "Los Alcaparros",
          "La Carolina",
          "Mazur\xE9n",
          "San Antonio Norte",
          "Gratamira M\xF3nica"
        ]
      },
      "chapinero": {
        localidad: "Chapinero",
        barrios: [
          "El Chic\xF3",
          "Chic\xF3 Norte",
          "Chic\xF3 Norte II",
          "Chic\xF3 Norte III",
          "Chic\xF3 Reservado",
          "Chic\xF3 Navarra",
          "Chic\xF3 Reservado Norte",
          "El Nogal",
          "Club El Nogal",
          "El Lago",
          "El Retiro",
          "Rosales",
          "Los Rosales",
          "La Cabrera",
          "Chapinero Central",
          "Chapinero Alto",
          "Pardo Rubio",
          "Quinta Camacho",
          "El Castillo",
          "San Luis",
          "Juan XXIII",
          "El Refugio",
          "El Bosque",
          "Granada",
          "Porci\xFAncula",
          "Lago Gait\xE1n",
          "Espartillal",
          "La Salle",
          "Marly",
          "Rinc\xF3n del Chic\xF3",
          "Antiguo Country"
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
          "La Isabela",
          // Suba estrato alto - Niza / Gratamira
          "Gratamira",
          "Gratamira M\xF3nica",
          "Bella Suiza",
          "Cerros de Suba",
          "Niza Suba",
          "Reservado de Niza",
          "El Country",
          "Pasadena"
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
          "San Pablo"
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

// server/_core/divipola.ts
import fs3 from "fs";
import path3 from "path";
var municipalitiesMap, initDivipola, validateCity;
var init_divipola = __esm({
  "server/_core/divipola.ts"() {
    "use strict";
    municipalitiesMap = /* @__PURE__ */ new Map();
    initDivipola = () => {
      try {
        const jsonPath = path3.join(process.cwd(), "server", "data", "divipola.json");
        municipalitiesMap.clear();
        if (!fs3.existsSync(jsonPath)) {
          console.warn("Divipola JSON data file not found at", jsonPath);
          return;
        }
        const raw = fs3.readFileSync(jsonPath, "utf-8");
        const list = JSON.parse(raw);
        for (const item of list) {
          if (item.municipio) {
            const normalizedKey = item.municipio.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
            let titleCased = item.municipio.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
            municipalitiesMap.set(normalizedKey, titleCased);
          }
        }
        municipalitiesMap.set("bogota", "Bogot\xE1, D.C.");
        municipalitiesMap.set("bogota d.c.", "Bogot\xE1, D.C.");
        municipalitiesMap.set("bogota, d.c.", "Bogot\xE1, D.C.");
        municipalitiesMap.set("bogota dc", "Bogot\xE1, D.C.");
        municipalitiesMap.set("bogota d.c", "Bogot\xE1, D.C.");
        console.log(`[Divipola] Loaded ${municipalitiesMap.size} municipalities from Divipola.`);
      } catch (err) {
        console.error("[Divipola] Error loading Divipola:", err);
      }
    };
    validateCity = (cityName) => {
      if (!cityName || typeof cityName !== "string") return null;
      if (municipalitiesMap.size === 0) {
        initDivipola();
      }
      const normalized = cityName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      return municipalitiesMap.get(normalized) || null;
    };
  }
});

// server/_core/matching.ts
var matching_exports = {};
__export(matching_exports, {
  buildBigTechAdminReport: () => buildBigTechAdminReport,
  calcularIPC: () => calcularIPC,
  calcularScoreMatch: () => calcularScoreMatch,
  calculateCvpVector15DMatch: () => calculateCvpVector15DMatch,
  checkTransactionCompatibility: () => checkTransactionCompatibility,
  esFormatoCuadrante: () => esFormatoCuadrante,
  evaluarInterseccionComodidadesSemanticas: () => evaluarInterseccionComodidadesSemanticas,
  evaluarMatch: () => evaluarMatch,
  executeMatchEngine: () => executeMatchEngine,
  explicarMatch: () => explicarMatch,
  extractRealPhone: () => extractRealPhone,
  findMatchesForProperty: () => findMatchesForProperty,
  findMatchesForRequirement: () => findMatchesForRequirement,
  matchesGeography: () => matchesGeography,
  parsePropertyAddressNumbers: () => parsePropertyAddressNumbers,
  parseStreetCarreraBoundaries: () => parseStreetCarreraBoundaries
});
import { and, eq as eq3 } from "drizzle-orm";
function hasAledanos(text2) {
  if (!text2) return false;
  const n = normalizarTextoGeografico(text2);
  return n.includes("aledan") || n.includes("cercan") || n.includes("alrededor") || n.includes("similar") || n.includes("proxim") || n.includes("otro");
}
function extractRealPhone(item) {
  if (!item) return null;
  const candidates = [
    item.idUsuarioWhatsapp,
    item.origenId,
    item.contactPhone,
    item.brokerPhone,
    item.phone,
    item.usuarioWhatsapp,
    item.contactNumber,
    item.sellerPhone,
    item.captadorPhone,
    item.user?.phone,
    item.user?.idUsuarioWhatsapp,
    item.user?.contactPhone
  ];
  for (const cand of candidates) {
    if (!cand) continue;
    const clean = String(cand).split("@")[0].replace(/\D/g, "");
    if (clean.startsWith("11") || clean.startsWith("12036") || clean.startsWith("1203") || clean.length > 13) {
      continue;
    }
    if (clean.length === 12 && clean.startsWith("573")) return clean;
    if (clean.length === 10 && clean.startsWith("3")) return `57${clean}`;
    if (clean.length === 12 && clean.startsWith("5760")) return clean;
    if (clean.length === 10 && clean.startsWith("60")) return `57${clean}`;
    if (clean.length >= 10 && clean.length <= 12) return clean;
  }
  const textToSearch = `${item.rawText || ""} ${item.description || ""} ${item.name || ""} ${item.rawMessage || ""}`;
  const phoneMatches = textToSearch.match(/(?:\+?57\s*)?3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/g);
  if (phoneMatches && phoneMatches.length > 0) {
    const rawMatch = phoneMatches[0].replace(/\D/g, "");
    const clean10 = rawMatch.startsWith("57") && rawMatch.length === 12 ? rawMatch.substring(2) : rawMatch;
    if (clean10.length === 10 && clean10.startsWith("3")) {
      return `57${clean10}`;
    }
  }
  const jsonSources = [item.metadata, item.rawJson, item.extraData];
  for (const jsonSrc of jsonSources) {
    if (!jsonSrc) continue;
    const str = typeof jsonSrc === "string" ? jsonSrc : JSON.stringify(jsonSrc);
    const jsonMatches = str.match(/(?:\+?57\s*)?3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/g);
    if (jsonMatches && jsonMatches.length > 0) {
      const rawMatch = jsonMatches[0].replace(/\D/g, "");
      const clean10 = rawMatch.startsWith("57") && rawMatch.length === 12 ? rawMatch.substring(2) : rawMatch;
      if (clean10.length === 10 && clean10.startsWith("3")) {
        return `57${clean10}`;
      }
    }
  }
  return null;
}
function checkTransactionCompatibility(reqType, propType, propAccepted = []) {
  if (!reqType || !propType) return false;
  const r = reqType.toLowerCase().trim();
  const p = propType.toLowerCase().trim();
  if (propAccepted.length > 0 && propAccepted.includes(r)) return true;
  const compatibleSet = TRANSACTION_COMPATIBILITY_MATRIX[r];
  if (!compatibleSet) return false;
  return compatibleSet.has(p);
}
function calculateCvpVector15DMatch(requirement, property) {
  const vReq = new Array(15).fill(0);
  const vProp = new Array(15).fill(0);
  const reqMax = parseFloat(String(requirement.presupuestoMax || "0"));
  const propPrice = parseFloat(String(property.price || "0"));
  if (reqMax > 0 && propPrice > 0) {
    vReq[0] = Math.log10(reqMax);
    vProp[0] = Math.log10(propPrice);
  }
  const reqArea = parseFloat(String(requirement.areaMin || requirement.areaMinimaM2 || "0"));
  const propArea = parseFloat(String(property.areaTotal || property.areaConstruidaM2 || "0"));
  vReq[1] = reqArea > 0 ? reqArea / 100 : 0;
  vProp[1] = propArea > 0 ? propArea / 100 : 0;
  vReq[2] = Number(requirement.habitacionesMin || 0);
  vProp[2] = Number(property.bedrooms || 0);
  vReq[3] = Number(requirement.banosMin || 0);
  vProp[3] = Number(property.bathrooms || 0);
  vReq[4] = Number(requirement.parqueaderosMin || 0);
  const garP = Number(property.garages || 0);
  const garType = String(property.garageType || "").toLowerCase();
  vProp[4] = garType === "lineal" ? garP * 0.7 : garP;
  const estratoReq = Array.isArray(requirement.estratoDeseado) ? Number(requirement.estratoDeseado[0] || 0) : Number(requirement.estratoDeseado || 0);
  vReq[5] = estratoReq;
  vProp[5] = Number(property.stratum || property.estrato || 0);
  vReq[6] = Number(requirement.antiguedadMax || 0);
  vProp[6] = Number(property.antiguedadAnos || 0);
  vReq[7] = parseFloat(String(requirement.adminFeeMax || "0")) / 1e5;
  vProp[7] = parseFloat(String(property.adminFee || "0")) / 1e5;
  const reqText = String(requirement.rawText || "").toLowerCase();
  const propText = String(property.rawText || "").toLowerCase();
  vReq[8] = reqText.includes("balcon") || reqText.includes("balc\xF3n") || reqText.includes("terraza") ? 1 : 0;
  vProp[8] = propText.includes("balcon") || propText.includes("balc\xF3n") || propText.includes("terraza") || property.hasBalcony || property.hasTerrace ? 1 : 0;
  vReq[9] = reqText.includes("ascensor") ? 1 : 0;
  vProp[9] = propText.includes("ascensor") || property.hasElevator ? 1 : 0;
  vReq[10] = reqText.includes("club house") || reqText.includes("gimnasio") || reqText.includes("piscina") ? 1 : 0;
  vProp[10] = propText.includes("club house") || propText.includes("gimnasio") || propText.includes("piscina") ? 1 : 0;
  vReq[11] = reqText.includes("deposito") || reqText.includes("dep\xF3sito") || reqText.includes("bodega") ? 1 : 0;
  vProp[11] = propText.includes("deposito") || propText.includes("dep\xF3sito") || propText.includes("bodega") || property.hasStorage ? 1 : 0;
  vReq[12] = reqText.includes("permuta") || reqText.includes("carro") ? 1 : 0;
  vProp[12] = propText.includes("permuta") || propText.includes("recibe vehiculo") ? 1 : 0;
  vReq[13] = reqText.includes("silencioso") || reqText.includes("tranquilo") ? 1 : 0;
  vProp[13] = !propText.includes("ruidoso") && !propText.includes("via principal") ? 1 : 0;
  vReq[14] = 1;
  vProp[14] = reqMax > 0 && propPrice > 0 && propPrice <= reqMax * 0.7 ? 1.5 : 1;
  let sumSq = 0;
  for (let i = 0; i < 15; i++) {
    const diff = vReq[i] - vProp[i];
    sumSq += diff * diff;
  }
  const distance = Math.sqrt(sumSq);
  let dot = 0, normReq = 0, normProp = 0;
  for (let i = 0; i < 15; i++) {
    dot += vReq[i] * vProp[i];
    normReq += vReq[i] * vReq[i];
    normProp += vProp[i] * vProp[i];
  }
  const normDenom = Math.sqrt(normReq) * Math.sqrt(normProp);
  const cosSim = normDenom > 0 ? dot / normDenom : 0.8;
  const cvpScore = Math.min(100, Math.max(0, Math.round(cosSim * 100)));
  return { cvpScore, distance, vectorReq: vReq, vectorProp: vProp };
}
function esFormatoCuadrante(texto) {
  if (!texto) return false;
  const norm2 = (texto || "").toLowerCase();
  return /(?:entre|calle|clle|cll|carrera|cra|autopista|circunvalar|septima)/i.test(norm2) && /\d/.test(norm2);
}
function parseStreetCarreraBoundaries(text2) {
  const norm2 = (text2 || "").toLowerCase();
  const res = {};
  const streetRangeMatch = norm2.match(
    /(?:entre|de|cll|calle|calles)?\s*(?:la|las)?\s*(?:calle|clle|cll|cna|cera)?\s*(\d{1,3})\s*(?:a|y|-|hasta)\s*(?:la|las)?\s*(?:calle|clle|cll|cna|cera)?\s*(\d{1,3})/i
  );
  if (streetRangeMatch) {
    const n1 = parseInt(streetRangeMatch[1], 10);
    const n2 = parseInt(streetRangeMatch[2], 10);
    if (!isNaN(n1) && !isNaN(n2) && (n1 > 20 || n2 > 20)) {
      res.minStreet = Math.min(n1, n2);
      res.maxStreet = Math.max(n1, n2);
    }
  }
  const carreraRangeMatch = norm2.match(/(?:cra|carrera|carreras)\s*(?:la|las)?\s*(circunvalar|cerros|\d{1,3})\s*(?:a|y|-|hasta)\s*(?:la|las)?\s*(\d{1,3})/i);
  if (carreraRangeMatch) {
    const rawN1 = carreraRangeMatch[1];
    const n1 = rawN1 === "circunvalar" || rawN1 === "cerros" ? 1 : parseInt(rawN1, 10);
    const n2 = parseInt(carreraRangeMatch[2], 10);
    if (!isNaN(n1) && !isNaN(n2)) {
      res.minCarrera = Math.min(n1, n2);
      res.maxCarrera = Math.max(n1, n2);
    }
  }
  if (norm2.includes("arriba de la autopista") || norm2.includes("oriente de la autopista")) {
    res.maxCarrera = 45;
    res.minCarrera = 1;
  } else if (norm2.includes("abajo de la autopista") || norm2.includes("occidente de la autopista")) {
    res.minCarrera = 45;
  }
  if (norm2.includes("arriba de la septima") || norm2.includes("arriba de la s\xE9ptima") || norm2.includes("arriba de la 7")) {
    res.maxCarrera = 7;
    res.minCarrera = 1;
  } else if (norm2.includes("abajo de la septima") || norm2.includes("abajo de la s\xE9ptima") || norm2.includes("abajo de la 7")) {
    res.minCarrera = 7;
  }
  return res;
}
function parsePropertyAddressNumbers(text2) {
  const norm2 = String(text2 || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const res = {};
  const streetMatch = norm2.match(/(?:calle|cll|cl|c\/)\s*#?\s*(\d{1,3})\b/i);
  if (streetMatch) {
    const sNum = parseInt(streetMatch[1], 10);
    if (!isNaN(sNum) && sNum > 0 && sNum <= 260) res.street = sNum;
  }
  const carreraMatch = norm2.match(/(?:carrera|cra|cr|kra|kr|k\/|\bk\b)\s*#?\s*(\d{1,3})\b/i);
  if (carreraMatch) {
    const cNum = parseInt(carreraMatch[1], 10);
    if (!isNaN(cNum) && cNum > 0 && cNum <= 160) res.carrera = cNum;
  }
  if (norm2.includes("autonorte") || norm2.includes("autopista norte")) {
    res.isAutoNorte = true;
  }
  return res;
}
function matchesGeography(reqZoneRaw, propZoneRaw, reqLocRaw, propLocRaw, reqCityRaw, propCityRaw) {
  const reqCity = normalizarTextoGeografico(reqCityRaw || "");
  const propCity = normalizarTextoGeografico(propCityRaw || "");
  const reqZone = normalizarTextoGeografico(reqZoneRaw || "");
  const propZone = normalizarTextoGeografico(propZoneRaw || "");
  const reqLoc = normalizarTextoGeografico(reqLocRaw || "");
  const propLoc = normalizarTextoGeografico(propLocRaw || "");
  const isBogotaCityAlias = (c) => {
    return c === "bogota" || c === "bogota d c" || c === "bogota dc" || c === "distrito capital" || c === "bogota d.c.";
  };
  const isSameCanonicalCity = (c1, c2) => {
    if (!c1 || !c2) return true;
    if (c1 === c2) return true;
    if (isBogotaCityAlias(c1) && isBogotaCityAlias(c2)) return true;
    if (c1.includes(c2) || c2.includes(c1)) return true;
    return false;
  };
  if (reqCity && propCity && !isSameCanonicalCity(reqCity, propCity)) {
    return { matches: false, score: 0 };
  }
  const reqBoundaries = parseStreetCarreraBoundaries(`${reqZoneRaw} ${reqLocRaw}`);
  const propNumbers = parsePropertyAddressNumbers(propZoneRaw);
  if (propNumbers.street && reqBoundaries.minStreet && reqBoundaries.maxStreet) {
    if (propNumbers.street < reqBoundaries.minStreet || propNumbers.street > reqBoundaries.maxStreet) {
      return { matches: false, score: 0 };
    }
  }
  if (propNumbers.carrera && reqBoundaries.minCarrera && reqBoundaries.maxCarrera) {
    if (propNumbers.carrera < reqBoundaries.minCarrera || propNumbers.carrera > reqBoundaries.maxCarrera) {
      return { matches: false, score: 0 };
    }
  }
  if (esFormatoCuadrante(reqZoneRaw) && !reqBoundaries.minStreet && !reqBoundaries.minCarrera) {
    return { matches: false, score: 0 };
  }
  const reqFullNorm = normalizarTextoGeografico(`${reqZoneRaw} ${reqLocRaw} ${reqCityRaw}`);
  const propFullNorm = normalizarTextoGeografico(`${propZoneRaw} ${propLocRaw} ${propCityRaw}`);
  const sabanaSuburbanSectors = [
    "san simon",
    "guaymaral",
    "hacienda fontanar",
    "fontanar",
    "fagua",
    "potosi",
    "sindamanoy",
    "yerbabuena",
    "yerbabona",
    "briceno",
    "hatogrande",
    "chia",
    "sopo",
    "cajica",
    "cota",
    "la calera"
  ];
  const reqAskaSabana = sabanaSuburbanSectors.some((sec) => reqFullNorm.includes(sec));
  const bogotaUrbanSectors = [
    "prado veraniego",
    "cedritos",
    "chico",
    "chico norte",
    "chico reservado",
    "chapinero",
    "santa barbara",
    "pasadena",
    "alhambra",
    "bat\xE1n",
    "el batan",
    "niza",
    "metropolis",
    "polo club",
    "castellana"
  ];
  const propIsUrbanBogota = bogotaUrbanSectors.some((sec) => propFullNorm.includes(sec));
  if (reqAskaSabana && propIsUrbanBogota) {
    console.log(`[Matching-Guard] Bloqueo 0%: Requerimiento busca Sabana Norte (${reqZoneRaw}) pero inmueble est\xE1 en Bogot\xE1 Urbano (${propZoneRaw})`);
    return { matches: false, score: 0 };
  }
  const isSantaBarbaraProp = propFullNorm.includes("santa barbara");
  const isVirreyReq = reqFullNorm.includes("virrey") || reqFullNorm.includes("rincon del chico");
  const isSantaBarbaraReq = reqFullNorm.includes("santa barbara");
  const isVirreyProp = propFullNorm.includes("virrey") || propFullNorm.includes("rincon del chico");
  if (isSantaBarbaraProp && isVirreyReq || isSantaBarbaraReq && isVirreyProp) {
    if (!hasAledanos(reqZoneRaw) && !hasAledanos(propZoneRaw)) {
      console.log(`[Matching-Guard] Bloqueo 0%: Incompatibilidad geogr\xE1fica entre Santa B\xE1rbara y Virrey / Rinc\xF3n del Chic\xF3 ('${reqZoneRaw}' \u2194 '${propZoneRaw}')`);
      return { matches: false, score: 0 };
    }
  }
  const GENERIC_CARDINAL_TERMS = /* @__PURE__ */ new Set([
    "norte",
    "sur",
    "oriente",
    "occidente",
    "centro",
    "sabana",
    "sabana norte",
    "sabana occidente",
    "zona norte",
    "zona sur",
    "zona oriente",
    "zona occidente",
    "zona centro",
    "bogota norte",
    "bogot\xE1 norte",
    "bogota sur",
    "bogot\xE1 sur",
    "bogota centro",
    "bogot\xE1 centro",
    "bogota occidente",
    "bogot\xE1 occidente",
    "cualquiera",
    "varias zonas",
    "varios barrios",
    "toda la ciudad",
    "sin especificar",
    "n/e",
    "na",
    "n/a",
    "por definir"
  ]);
  const isReqGeneric = !reqZone || GENERIC_CARDINAL_TERMS.has(reqZone.toLowerCase().trim());
  const isPropGeneric = !propZone || GENERIC_CARDINAL_TERMS.has(propZone.toLowerCase().trim());
  if (isReqGeneric || isPropGeneric) {
    const hasStreetBoundaryMatch = propNumbers.street && reqBoundaries.minStreet !== void 0 && reqBoundaries.maxStreet !== void 0 && propNumbers.street >= reqBoundaries.minStreet && propNumbers.street <= reqBoundaries.maxStreet || propNumbers.carrera && reqBoundaries.minCarrera !== void 0 && reqBoundaries.maxCarrera !== void 0 && propNumbers.carrera >= reqBoundaries.minCarrera && propNumbers.carrera <= reqBoundaries.maxCarrera;
    if (!hasStreetBoundaryMatch) {
      console.log(`[Matching-Guard] Bloqueo 0%: Ubicaci\xF3n gen\xE9rica o no especificada en barrio/vereda real ('${reqZoneRaw}' \u2194 '${propZoneRaw}').`);
      return { matches: false, score: 0 };
    }
  }
  const stopCities = /* @__PURE__ */ new Set(["bogota", "bogot\xE1", "medellin", "medell\xEDn", "cali", "barranquilla", "cartagena", "bucaramanga", "colombia"]);
  if (!reqZone || stopCities.has(reqZone.toLowerCase().trim())) {
    return { matches: true, score: 20 };
  }
  const tieneAledanosInicial = hasAledanos(reqZoneRaw);
  if (reqZone && propZone && !tieneAledanosInicial) {
    const s1 = reqZone.toLowerCase();
    const s2 = propZone.toLowerCase();
    const orientaciones = ["oriental", "occidental", "norte", "sur", "alta", "alto", "baja", "bajo", "reservado", " central"];
    const tieneDiffOrientacion = orientaciones.some(
      (o) => s1.includes(o) && !s2.includes(o) || !s1.includes(o) && s2.includes(o)
    );
    const tieneNum1 = s1.match(/\b(i|ii|iii|iv|v|1|2|3|4)\b/);
    const tieneNum2 = s2.match(/\b(i|ii|iii|iv|v|1|2|3|4)\b/);
    const diffNum = tieneNum1 && tieneNum2 && tieneNum1[0] !== tieneNum2[0];
    if (tieneDiffOrientacion || diffNum) {
      return { matches: false, score: 0 };
    }
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
    const stopGeoWords = /* @__PURE__ */ new Set([
      "bogota",
      "bogota d c",
      "bogota dc",
      "d c",
      "dc",
      "colombia",
      "medellin",
      "cali",
      "barranquilla",
      "cartagena",
      "bucaramanga",
      "pereira",
      "manizales",
      "cucuta",
      "ibague",
      "santa marta"
    ]);
    return norm2.split(/,|\/|\s+y\s+|\s+o\s+|\s+e\s+/).map((p) => p.trim()).filter((p) => p.length > 0 && !stopGeoWords.has(p));
  };
  const extractNeighborhoodTokens = (text2) => {
    if (!text2) return [];
    const norm2 = normalizarTextoGeografico(text2);
    const found = [];
    const knownNeighborhoods = [
      "cedritos",
      "santa paula",
      "santa barbara",
      "santa barbara central",
      "santa barbara occidental",
      "santa barbara oriental",
      "santa ana",
      "santa ana alta",
      "santa ana oriental",
      "santa ana occidental",
      "chico",
      "chico norte",
      "chico reservado",
      "chico navarra",
      "rosales",
      "los rosales",
      "el virrey",
      "la cabrera",
      "nogal",
      "el nogal",
      "antiguo country",
      "country club",
      "la calleja",
      "bella suiza",
      "el contador",
      "san patricio",
      "molinos norte",
      "bat\xE1n",
      "el batan",
      "pasadena",
      "alhambra",
      "colina",
      "colina campestre",
      "suba",
      "niza",
      "pontevedra",
      "morato",
      "salitre",
      "ciudad salitre",
      "hayuelos",
      "modelia",
      "fontibon",
      "teusaquillo",
      "la soledad",
      "palermo",
      "chapinero",
      "chapinero alto",
      "quinta camacho",
      "marly",
      "bosque izquierdo",
      "macarena",
      "la macarena",
      "centro internacional",
      "usaquen",
      "multicentro",
      "el poblado",
      "poblado",
      "laureles",
      "envigado",
      "sabaneta",
      "belen",
      "estadio",
      "conquistadores",
      "granada",
      "el pe\xF1on",
      "juanamb\xFA",
      "ciudad jardin",
      "san fernando",
      "valle del lili",
      "el prado",
      "alto prado",
      "riomar",
      "villa santos",
      "buenavista",
      "cabecera",
      "ca\xF1averal",
      "ruitoque",
      "sotomayor"
    ];
    for (const n of knownNeighborhoods) {
      if (norm2.includes(n)) {
        found.push(n);
      }
    }
    return found;
  };
  let reqPhrases = splitPhrases(reqZoneRaw);
  let propPhrases = splitPhrases(propZoneRaw);
  const reqExtracted = extractNeighborhoodTokens(reqZoneRaw);
  const propExtracted = extractNeighborhoodTokens(propZoneRaw);
  if (reqPhrases.length === 0 && reqExtracted.length > 0) reqPhrases = reqExtracted;
  else if (reqExtracted.length > 0) reqPhrases = Array.from(/* @__PURE__ */ new Set([...reqPhrases, ...reqExtracted]));
  if (propPhrases.length === 0 && propExtracted.length > 0) propPhrases = propExtracted;
  else if (propExtracted.length > 0) propPhrases = Array.from(/* @__PURE__ */ new Set([...propPhrases, ...propExtracted]));
  if (reqBoundaries.minStreet && reqBoundaries.maxStreet) {
    try {
      const idecaRes = lookupBarriosByPerimeter({
        calleNorte: reqBoundaries.maxStreet,
        calleSur: reqBoundaries.minStreet,
        craOriente: reqBoundaries.minCarrera || 1,
        craOccidente: reqBoundaries.maxCarrera || 30,
        ciudad: "bogota"
      });
      if (idecaRes.barrios && idecaRes.barrios.length > 0) {
        const idecaNorm = idecaRes.barrios.map((b) => normalizarTextoGeografico(b));
        reqPhrases = Array.from(/* @__PURE__ */ new Set([...reqPhrases, ...idecaNorm]));
      }
    } catch (idecaErr) {
      console.warn("[Matching-IDECA] Error resolviendo per\xEDmetro en matching:", idecaErr);
    }
  }
  const reqExpanded = reqPhrases.flatMap(expandirZona);
  const propExpanded = propPhrases.flatMap(expandirZona);
  const palabrasGenericas = /* @__PURE__ */ new Set([
    "bogota",
    "bogot\xE1",
    "colombia",
    "medellin",
    "medell\xEDn",
    "cali",
    "barranquilla",
    "bucaramanga",
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
    return p1.trim() === p2.trim();
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
function calcularIPC(requirement, property, matchScore) {
  const matching = Math.round(matchScore);
  const propAgeDays = Math.max(0, (Date.now() - new Date(property.createdAt || /* @__PURE__ */ new Date()).getTime()) / (1e3 * 60 * 60 * 24));
  const reqAgeDays = Math.max(0, (Date.now() - new Date(requirement.createdAt || /* @__PURE__ */ new Date()).getTime()) / (1e3 * 60 * 60 * 24));
  const getAgeFactor = (days) => {
    if (days <= 3) return 100;
    if (days <= 7) return 90;
    if (days <= 15) return 75;
    if (days <= 30) return 55;
    return 30;
  };
  const freshness = Math.round((getAgeFactor(propAgeDays) + getAgeFactor(reqAgeDays)) / 2);
  const propBrokerHasInfo = property.idUsuarioWhatsapp ? 90 : 70;
  const reqBrokerHasInfo = requirement.idUsuarioWhatsapp ? 90 : 70;
  const brokerTrust = Math.round((propBrokerHasInfo + reqBrokerHasInfo) / 2);
  const getCompletitud = (item, isProp) => {
    let fields = 6;
    let present = 0;
    const priceVal = isProp ? item.price : item.presupuestoMax || item.presupuestoMin;
    if (priceVal && parseFloat(String(priceVal)) > 0) present++;
    const areaVal = isProp ? item.areaTotal : item.areaMin;
    if (areaVal && parseFloat(String(areaVal)) > 0) present++;
    const bedVal = isProp ? item.bedrooms : item.habitacionesMin;
    if (bedVal && Number(bedVal) > 0) present++;
    const bathVal = isProp ? item.bathrooms : item.banosMin;
    if (bathVal && Number(bathVal) > 0) present++;
    const zoneVal = isProp ? item.zone : item.zonaDeseada;
    if (zoneVal && zoneVal.trim() !== "" && zoneVal !== "NA") present++;
    if (item.idUsuarioWhatsapp) present++;
    return Math.round(present / fields * 100);
  };
  const dataQuality = Math.round((getCompletitud(property, true) + getCompletitud(requirement, false)) / 2);
  const priceNum = parseFloat(String(property.price || "0"));
  let marketDemand = 70;
  if (priceNum > 0) {
    if (priceNum <= 3e8) marketDemand = 95;
    else if (priceNum <= 6e8) marketDemand = 85;
    else if (priceNum <= 12e8) marketDemand = 75;
    else marketDemand = 60;
  }
  const finalScore = Math.round(
    matching * 0.4 + freshness * 0.2 + brokerTrust * 0.1 + dataQuality * 0.2 + marketDemand * 0.1
  );
  return {
    score: finalScore,
    factors: {
      matching,
      freshness,
      brokerTrust,
      dataQuality,
      marketDemand
    },
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    version: "VRIF-2.0"
  };
}
function buildExplanationResult(score, blockers, positives, negatives, isStrictCompliant = true, missingFields = []) {
  return {
    score,
    blockers,
    positives,
    negatives,
    confidence: 1,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    engineVersion: "VRIF-2.0",
    isStrictCompliant,
    missingFields
  };
}
function explicarMatch(requirement, property) {
  const blockers = [];
  const positives = [];
  const negatives = [];
  const isNA = (v) => !v || v.trim() === "" || v.trim().toUpperCase() === "NA" || v.trim().toUpperCase() === "N/E" || v.trim().toUpperCase() === "N/A" || v.trim() === "-";
  const propTypeHard = property.propertyType || property.tipoInmueble || "";
  const reqTypeHard = requirement.tipoInmuebleDeseado || requirement.propertyType || "";
  if (isNA(propTypeHard)) {
    blockers.push("\u26D4 Inmueble Incompleto: Tipo de Inmueble no especificado (N/E). No puede participar en Matches.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  if (isNA(reqTypeHard)) {
    blockers.push("\u26D4 Requerimiento Incompleto: Tipo de Inmueble deseado no especificado (N/E). No puede participar en Matches.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  const propBizHard = property.transactionType || "";
  const reqBizHard = requirement.tipoNegocioDeseado || requirement.transactionType || "";
  if (isNA(propBizHard)) {
    blockers.push("\u26D4 Inmueble Incompleto: Tipo de Negocio no especificado (N/E). No puede participar en Matches.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  if (isNA(reqBizHard)) {
    blockers.push("\u26D4 Requerimiento Incompleto: Tipo de Negocio deseado no especificado (N/E). No puede participar en Matches.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  const propCityHard = property.addressCity || property.city || "";
  const reqCityHard = requirement.addressCity || requirement.ciudadDeseada || "";
  if (isNA(propCityHard)) {
    blockers.push("\u26D4 Inmueble Incompleto: Ciudad/Municipio no especificado (N/E). No puede participar en Matches.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  if (isNA(reqCityHard)) {
    blockers.push("\u26D4 Requerimiento Incompleto: Ciudad/Municipio deseado no especificado (N/E). No puede participar en Matches.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  const propBarrioHard = property.zone || property.addressNeighborhood || "";
  const reqBarrioHard = requirement.zonaDeseada || requirement.addressNeighborhood || "";
  if (isNA(propBarrioHard)) {
    blockers.push("\u26D4 Inmueble Incompleto: Barrio/Vereda no especificado (N/E). No puede participar en Matches.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  if (isNA(reqBarrioHard)) {
    blockers.push("\u26D4 Requerimiento Incompleto: Barrio/Vereda deseado no especificado (N/E). No puede participar en Matches.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  const propLocalidadHard = property.addressLocality || "";
  const reqLocalidadHard = requirement.addressLocality || "";
  const bothLocalidadKnown = !isNA(propLocalidadHard) && !isNA(reqLocalidadHard);
  if (bothLocalidadKnown) {
    const normPropLoc = normalizarTextoGeografico(propLocalidadHard);
    const normReqLoc = normalizarTextoGeografico(reqLocalidadHard);
    if (normPropLoc !== normReqLoc && !normPropLoc.includes(normReqLoc) && !normReqLoc.includes(normPropLoc)) {
      blockers.push(`\u26D4 Localidad/Comuna Incompatible: buscada "${reqLocalidadHard}", ofrecida "${propLocalidadHard}". MATCH IMPOSIBLE.`);
      return buildExplanationResult(0, blockers, positives, negatives);
    }
  }
  const reqRawString = (requirement.rawText || requirement.name || "").trim();
  const reqTextLow = reqRawString.toLowerCase();
  const propRawString = (property.rawText || property.description || property.name || "").trim();
  const propTextLow = propRawString.toLowerCase();
  const SECTORES_BOGOTA_SABANA = [
    "cedritos",
    "usaquen",
    "usaqu\xE9n",
    "chico",
    "chic\xF3",
    "chapinero",
    "suba",
    "engativa",
    "engativ\xE1",
    "teusaquillo",
    "kennedy",
    "fontibon",
    "fontib\xF3n",
    "salitre",
    "rosales",
    "colina",
    "niza",
    "cabrera",
    "nogal",
    "recreo",
    "castellana",
    "patricio",
    "barbara",
    "b\xE1rbara",
    "belmira",
    "suiza",
    "navarra",
    "floresta",
    "granada",
    "santa barbara",
    "santa b\xE1rbara",
    "chico reservado",
    "chico norte",
    "rincon del chico",
    "rinc\xF3n del chic\xF3",
    "pasadena",
    "batan",
    "bat\xE1n",
    "la carolina",
    "alambra",
    "mazuren",
    "mazur\xE9n",
    "calleja",
    "virrey",
    "el retiro",
    "antiguo country",
    "los rosales",
    "chia",
    "ch\xEDa",
    "cajica",
    "cajic\xE1",
    "cota",
    "sop\xF3"
  ];
  const reqZoneRawClean = (requirement.zonaDeseada || requirement.addressNeighborhood || "").trim().toLowerCase();
  const hasColZone = reqZoneRawClean !== "" && reqZoneRawClean !== "na" && reqZoneRawClean !== "bogota" && reqZoneRawClean !== "bogot\xE1";
  const hasTextZone = SECTORES_BOGOTA_SABANA.some((sector) => reqTextLow.includes(sector)) || /zona|sector|barrio|calle|cra|carrera/i.test(reqTextLow);
  const hasSpecificReqZone = hasColZone || hasTextZone;
  let budgetMaxCheck = parseFloat(String(requirement.presupuestoMax || "0"));
  if (budgetMaxCheck <= 0) {
    const mP = reqTextLow.match(/(?:ppto|presupuesto|busco|hasta|canon|valor)\s*:?\s*\$?([\d.]+)\s*(millones|millón|mll|mlls|mm|m|M)?/i) || reqTextLow.match(/\$?\s*([\d.]+)\s*(millones|millón|mll|mlls|mm|m|M)\b/i);
    if (mP) {
      let valR = parseFloat(mP[1].replace(/\./g, ""));
      if (!isNaN(valR)) {
        if (valR < 1e3) valR *= 1e6;
        budgetMaxCheck = valR;
      }
    }
  }
  const isReqOpenBudget = /(?:ppto|presupuesto|canon|valor)?\s*\$?\s*(?:abierto|sin\s*l[ií]mite|ilimitado|negociable\s*sin\s*tope)\b/i.test(reqTextLow);
  const hasReqBudget = budgetMaxCheck > 0 || isReqOpenBudget;
  if (isReqOpenBudget) {
    positives.push("\u{1F4B0} Presupuesto Abierto en la Demanda: 100% de Cumplimiento Financiero / Sin Restricci\xF3n de Presupuesto.");
  }
  let reqAreaCheck = parseFloat(String(requirement.areaMin || requirement.areaMinimaM2 || "0"));
  if (reqAreaCheck <= 0) {
    const mRA = reqTextLow.match(/(?:mínimo|min|de|área)?\s*([\d.,]+)\s*(?:m2|mts|m²|metros)/i);
    if (mRA) {
      let valRA = parseFloat(mRA[1].replace(/\./g, "").replace(",", "."));
      if (!isNaN(valRA) && valRA > 10 && valRA < 1e4) reqAreaCheck = valRA;
    }
  }
  const hasReqArea = reqAreaCheck > 0;
  let reqBedsCheck = requirement.habitacionesMin ? Number(requirement.habitacionesMin) : 0;
  if (reqBedsCheck <= 0) {
    const mB = reqTextLow.match(/(\d+(?:\s*-\s*\d+)?)\s*(?:hab|habitaciones|alcoba|alcobas|alc|dormitorio|cuarto|cuartos|hb)/i);
    if (mB) reqBedsCheck = parseInt(mB[1].split("-")[0].trim(), 10);
  }
  const hasReqBedrooms = reqBedsCheck > 0;
  let reqBathsCheck = requirement.banosMin ? Number(requirement.banosMin) : 0;
  if (reqBathsCheck <= 0) {
    const mW = reqTextLow.match(/(\d+(?:\.\d+)?)\s*(?:o\s*más\s*)?(?:wc|baño|baños|bñ)/i) || reqTextLow.match(/(\d+)\s*hab\s*con\s*baño/i);
    if (mW) reqBathsCheck = parseFloat(mW[1]);
  }
  const hasReqBathrooms = reqBathsCheck > 0;
  let reqGaragesCheck = requirement.parqueaderosMin ? Number(requirement.parqueaderosMin) : 0;
  if (reqGaragesCheck <= 0) {
    const mG = reqTextLow.match(/(?:parqueadero|parqueaderos|garaje|garajes|ptero|g\.)\s*\.?\s*(\d+)/i) || reqTextLow.match(/(\d+)\s*(?:parqueadero|parqueaderos|garaje|garajes|ptero|g\.|individuales)/i) || /garajes|parqueaderos/i.test(reqTextLow);
    if (mG && mG[1]) reqGaragesCheck = parseInt(mG[1], 10);
    else if (/garajes|parqueaderos/i.test(reqTextLow)) reqGaragesCheck = 1;
  }
  const hasReqGarages = reqGaragesCheck > 0;
  const hasReqAdmin = requirement.adminFeeMax != null && Number(requirement.adminFeeMax) > 0 || /admon|administracion|administración/i.test(reqTextLow);
  const hasReqType = !!(requirement.tipoInmuebleDeseado || requirement.propertyType) || /apto|apartamento|casa|oficina|lote|bodega|local|finca|apartaestudio|loft/i.test(reqTextLow);
  const hasReqBizType = !!(requirement.tipoNegocioDeseado || requirement.transactionType) || /venta|vendo|compro|compra|arriendo|alquilo|renta/i.test(reqTextLow);
  let propPriceCheck = parseFloat(String(property.price || "0"));
  if (propPriceCheck <= 0 && property.rentPrice) propPriceCheck = parseFloat(String(property.rentPrice));
  if (propPriceCheck <= 0) {
    const mPP = propTextLow.match(/(?:venta|precio|valor|canon|arriendo)\s*:?\s*\$?([\d.,]+)\s*(millones|millón|m|M)?/i);
    if (mPP) {
      let valP = parseFloat(mPP[1].replace(/\./g, "").replace(/,/g, ""));
      if (!isNaN(valP) && valP > 1e3) propPriceCheck = valP;
    }
  }
  let propAreaCheck = parseFloat(String(property.areaTotal || property.areaPrivate || "0"));
  if (propAreaCheck <= 0) {
    const mPA = propTextLow.match(/área\s*:?\s*([\d.,]+)/i) || propTextLow.match(/([\d.,]+)\s*(?:m2|mts|m²|metros)/i);
    if (mPA) {
      let valA = parseFloat(mPA[1].replace(/\./g, "").replace(",", "."));
      if (!isNaN(valA) && valA > 10 && valA < 1e4) propAreaCheck = valA;
    }
  }
  let propBedsCheck = property.bedrooms ? Number(property.bedrooms) : 0;
  if (propBedsCheck <= 0) {
    const mPB = propTextLow.match(/(\d+)\s*(?:hab|habitaciones|alcoba|alcobas|alc|dormitorio)/i);
    if (mPB) propBedsCheck = parseInt(mPB[1], 10);
  }
  let propBathsCheck = property.bathrooms ? Number(property.bathrooms) : 0;
  if (propBathsCheck <= 0) {
    const mPBa = propTextLow.match(/(\d+)\s*(?:wc|baño|baños|bñ)/i);
    if (mPBa) propBathsCheck = parseInt(mPBa[1], 10);
  }
  let propGaragesCheck = property.garages ? Number(property.garages) : 0;
  if (propGaragesCheck <= 0) {
    const mPG = propTextLow.match(/(\d+)\s*(?:parqueo|parqueos|parqueadero|parqueaderos|garaje|garajes|ptero)/i) || propTextLow.match(/(?:parqueo|parqueos|parqueadero|parqueaderos|garaje|garajes|ptero)\s*:?\s*(\d+)/i);
    if (mPG) propGaragesCheck = parseInt(mPG[1], 10);
  }
  const missingReqFields = [];
  if (!hasSpecificReqZone) missingReqFields.push("Ubicaci\xF3n / Barrio");
  if (!hasReqBudget) missingReqFields.push("Presupuesto M\xE1x.");
  if (!hasReqArea) missingReqFields.push("\xC1rea Total");
  if (!hasReqBedrooms) missingReqFields.push("Habitaciones");
  if (!hasReqBathrooms) missingReqFields.push("Ba\xF1os");
  if (!hasReqGarages) missingReqFields.push("Parqueaderos");
  if (!hasReqType) missingReqFields.push("Tipo de Inmueble");
  if (!hasReqBizType) missingReqFields.push("Tipo de Negocio");
  const missingPropFields = [];
  if (propPriceCheck <= 0) missingPropFields.push("Precio Oferta");
  if (propAreaCheck <= 0) missingPropFields.push("\xC1rea Oferta");
  if (propBedsCheck <= 0) missingPropFields.push("Habitaciones Oferta");
  if (propBathsCheck <= 0) missingPropFields.push("Ba\xF1os Oferta");
  if (propGaragesCheck <= 0) missingPropFields.push("Parqueaderos Oferta");
  const isStrictCompliant = missingReqFields.length === 0 && missingPropFields.length === 0;
  const missingFieldsList = [...missingReqFields.map((f) => `${f} (Demanda)`), ...missingPropFields.map((f) => `${f} (Oferta)`)];
  if (!isStrictCompliant) {
    negatives.push(`Dato Pendiente por Enriquecer: Faltan especificaciones [${missingFieldsList.join(", ")}].`);
  }
  let completenessBonus = 0;
  if (hasReqArea) completenessBonus += 2;
  if (hasReqBathrooms) completenessBonus += 2;
  if (hasReqGarages) completenessBonus += 2;
  if (hasReqAdmin) completenessBonus += 2;
  if (reqRawString.length > 120) completenessBonus += 2;
  if (completenessBonus >= 6) {
    positives.push(`\u2728 Requerimiento de Alta Fidelidad: Ficha de demanda ultra-completa con ${8 + Math.round(completenessBonus / 2)} especificaciones detalladas (+${completenessBonus}% Bono Prioridad).`);
  }
  const propBroker = (property.idUsuarioWhatsapp || "").split("@")[0];
  const reqBroker = (requirement.idUsuarioWhatsapp || "").split("@")[0];
  if (propBroker && reqBroker && propBroker === reqBroker) {
    blockers.push("Auto-match: el inmueble y el requerimiento pertenecen al mismo asesor.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  const reqBiz = (requirement.tipoNegocioDeseado || requirement.transactionType || "").toLowerCase();
  const propBiz = (property.transactionType || "").toLowerCase();
  const propAccepted = Array.isArray(property.acceptedTransactionTypes) ? property.acceptedTransactionTypes.map((t2) => t2.toLowerCase()) : [];
  const transactionCompatible = checkTransactionCompatibility(reqBiz, propBiz, propAccepted);
  if (!transactionCompatible) {
    blockers.push(`Incompatibilidad de negocio: buscado '${reqBiz}', ofrecido '${propBiz}'`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  positives.push(`Tipo de negocio compatible: req='${reqBiz}' \u2194 prop='${propBiz}'`);
  const CIUDADES_CO = [
    "bogota",
    "medellin",
    "cali",
    "barranquilla",
    "cartagena",
    "bucaramanga",
    "pereira",
    "manizales",
    "cucuta",
    "ibague",
    "santa marta",
    "villavicencio",
    "pasto",
    "monteria",
    "valledupar",
    "sincelejo",
    "chia",
    "zipaquira",
    "cajica",
    "envigado",
    "bello",
    "sabaneta",
    "itagui",
    "tenjo",
    "mosquera"
  ];
  const resolveCityField = (raw1, raw2) => {
    const n1 = normalizarTextoGeografico(raw1 || "");
    const n2 = normalizarTextoGeografico(raw2 || "");
    const SECTORES_BOGOTA = [
      "cedritos",
      "usaquen",
      "chico",
      "chapinero",
      "suba",
      "engativa",
      "teusaquillo",
      "kennedy",
      "fontibon",
      "bosa",
      "salitre",
      "rosales",
      "colina",
      "niza",
      "cabrera",
      "nogal",
      "recreo",
      "castellana",
      "patricio",
      "barbara",
      "belmira",
      "suiza",
      "navarra",
      "floresta",
      "granada",
      "colsubsidio",
      "santa barbara",
      "santa b\xE1rbara",
      "chico reservado",
      "chico norte",
      "rincon del chico",
      "rinc\xF3n del chic\xF3",
      "norte"
    ];
    const isBogotaSector = (val) => {
      return val === "" || val === "bogota" || val === "bogot\xE1" || SECTORES_BOGOTA.some((sector) => val.includes(sector));
    };
    if (isBogotaSector(n1) || isBogotaSector(n2)) {
      return "bogota";
    }
    if (CIUDADES_CO.some((c) => n1.includes(c) || n1 === c)) return n1;
    if (CIUDADES_CO.some((c) => n2.includes(c) || n2 === c)) return n2;
    return n1 || n2 || "bogota";
  };
  const reqCity = resolveCityField(requirement.ciudadDeseada || requirement.addressCity || "", requirement.city || "");
  const propCity = resolveCityField(property.addressCity || "", property.city || "");
  const reqCityNorm = normalizarTextoGeografico(reqCity);
  const propCityNorm = normalizarTextoGeografico(propCity);
  const rawReqBarrio = requirement.zonaDeseada || requirement.addressNeighborhood || "";
  const rawPropBarrio = property.zone || property.addressNeighborhood || "";
  const reqLocality = requirement.addressLocality || requirement.localidadDeseada || "";
  const propLocality = property.addressLocality || property.locality || "";
  const geoValidation = matchesGeography(
    rawReqBarrio,
    rawPropBarrio,
    reqLocality,
    propLocality,
    reqCity,
    propCity
  );
  if (!geoValidation.matches) {
    blockers.push(`\u26D4 Geograf\xEDa Incompatible: Requerimiento="${rawReqBarrio || reqCity}" \u2260 Oferta="${rawPropBarrio || propCity}". MATCH IMPOSIBLE (0%).`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  positives.push(`Geograf\xEDa compatible: ${rawPropBarrio || propCity} (${geoValidation.score} pts)`);
  function isPhoneNumberNotPrice2(val, rawText) {
    if (val === void 0 || val === null || val === "" || val === 0 || val === "0") return false;
    const numStr = String(val).replace(/\D/g, "");
    if (/000000$/.test(numStr) || /00000$/.test(numStr)) {
      return false;
    }
    if (numStr.length === 10 && numStr.startsWith("3")) {
      if (rawText && /(?:\$|precio|valor|ppto|presupuesto|canon|hasta|venta)\s*3\d{9}/i.test(rawText)) return false;
      return true;
    }
    if (numStr.length === 12 && numStr.startsWith("573")) {
      if (rawText && /(?:\$|precio|valor|ppto|presupuesto|canon|hasta|venta)\s*573\d{9}/i.test(rawText)) return false;
      return true;
    }
    if (rawText) {
      const rawLower = rawText.toLowerCase();
      if (rawLower.includes(numStr) && numStr.length >= 8) {
        if (/wa|whatsapp|cel|celular|tel|telefono|teléfono|contacto|llamar/i.test(rawLower)) return true;
      }
    }
    return false;
  }
  let price = parseFloat(String(property.price || "0"));
  let budgetMax = parseFloat(String(requirement.presupuestoMax || "0"));
  const budgetMin = parseFloat(String(requirement.presupuestoMin || "0"));
  if (isPhoneNumberNotPrice2(price, property.rawText)) price = 0;
  if (isPhoneNumberNotPrice2(budgetMax, requirement.rawText)) budgetMax = 0;
  const isSaleMatch = (property.transactionType || "").toLowerCase().includes("venta") || !(property.transactionType || "").toLowerCase().includes("arriendo");
  if (isSaleMatch && price > 0 && price < 3e7 && property.rawText) {
    const rawP = property.rawText.toLowerCase();
    const saleMatch = rawP.match(/(?:v\/venta\/|precio\s*(?:de\s*)?venta|venta)\s*:?\s*\$?([\d.,]+)\s*(mil\s*millones?|millones?|m|M)?/i) || rawP.match(/venta\/.*?\$?\s*([\d.]{7,12})/i);
    if (saleMatch) {
      let rawNum = parseFloat(saleMatch[1].replace(/\./g, "").replace(/,/g, ""));
      const unitStr = (saleMatch[2] || "").toLowerCase();
      const mult = unitStr.includes("mil millon") ? 1e9 : unitStr.includes("millon") || unitStr === "m" ? 1e6 : rawNum < 1e4 ? 1e6 : 1;
      let valP = rawNum * mult;
      if (!isNaN(valP) && valP >= 3e7) {
        price = valP;
      }
    }
  }
  let isReqRent = (requirement.tipoNegocioDeseado || requirement.transactionType || "").toLowerCase().includes("arriendo");
  if (requirement.rawText && (budgetMax <= 0 || isReqRent && budgetMax > 5e7)) {
    const rawR = requirement.rawText.toLowerCase().replace(/[\u2060\u200B\u200C\u200D\uFEFF\u00A0]/g, " ");
    const matchPresu = rawR.match(/(?:presupuesto|ppto|canon|valor|hasta|máximo|max)\s*(?:máximo|max)?\s*:?\s*\$?\s*([\d.,\s]+?)\s*(mil\s*millones?|millones|millón|mll|mlls|mm|m)?(?:\s|$|\n)/i) || rawR.match(/(?:presupuesto|ppto|canon|valor|hasta|máximo|max)\s*:?\s*\$?\s*([\d.]+)/i);
    if (matchPresu) {
      let valStr = matchPresu[1].replace(/[.,\s]/g, "");
      let valR = parseFloat(valStr);
      if (!isNaN(valR)) {
        const unit = (matchPresu[2] || "").toLowerCase();
        if (unit.includes("mil millon")) {
          valR *= 1e9;
        } else if (unit.includes("millon") || unit.includes("mll") || unit.includes("mm") || unit === "m") {
          valR *= 1e6;
        } else if (valR < 1e3) {
          valR *= 1e6;
        }
        if (valR > 0) budgetMax = valR;
      }
    }
  }
  const propArea = parseFloat(String(property.areaTotal || property.area || "0"));
  const reqAreaMin = parseFloat(String(requirement.areaMin || requirement.areaMinimaM2 || "0"));
  const pBedrooms = property.bedrooms != null ? Number(property.bedrooms) : -1;
  const reqBedrooms = requirement.habitacionesMin != null ? Number(requirement.habitacionesMin) : -1;
  const pBathrooms = property.bathrooms != null ? Number(property.bathrooms) : -1;
  const reqBathrooms = requirement.banosMin != null ? Number(requirement.banosMin) : -1;
  const pGarages = property.garages != null ? Number(property.garages) : -1;
  const reqGarages = requirement.parqueaderosMin != null ? Number(requirement.parqueaderosMin) : -1;
  const pAdminFee = property.adminFee != null ? parseFloat(String(property.adminFee)) : -1;
  const reqAdminMax = requirement.adminFeeMax != null ? parseFloat(String(requirement.adminFeeMax)) : -1;
  const pEstrato = property.stratum != null ? Number(property.stratum) : property.estrato != null ? Number(property.estrato) : -1;
  const reqEstrato = requirement.estratoDeseado != null ? Number(requirement.estratoDeseado) : -1;
  const reqType = (requirement.tipoInmuebleDeseado || requirement.propertyType || "").toLowerCase().trim();
  const propType = (property.propertyType || "").toLowerCase().trim();
  const reqZone = normalizarTextoGeografico(requirement.zonaDeseada || requirement.addressNeighborhood || "");
  const propZone = normalizarTextoGeografico(property.zone || property.addressNeighborhood || "");
  const propTextClean = (property.rawText || property.description || property.name || "").trim();
  const reqTextClean = (requirement.rawText || requirement.name || "").trim();
  if (propTextClean.length < 8 || reqTextClean.length < 8) {
    blockers.push("Publicaci\xF3n vac\xEDa o sin contenido textual legible en una de las partes. Match Inviable (0%).");
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  const validPropSpecsCount = (price > 0 || property.rentPrice && parseFloat(String(property.rentPrice)) > 0 ? 1 : 0) + (propArea > 0 ? 1 : 0) + (pBedrooms > 0 ? 1 : 0) + (pBathrooms > 0 ? 1 : 0) + (pGarages > 0 ? 1 : 0);
  if (validPropSpecsCount < 2) {
    blockers.push("Inmueble incompleto sin datos prediales m\xEDnimos en la oferta (menos de 2 atributos especificados). Match Inviable (0%).");
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  const propRealPhone = extractRealPhone(property);
  const reqRealPhone = extractRealPhone(requirement);
  if (!propRealPhone || !reqRealPhone) {
    negatives.push("Tel\xE9fono de contacto directo pendiente por verificar en una de las partes.");
  } else {
    positives.push(`Contacto verificado: +${reqRealPhone} \u2194 +${propRealPhone}`);
  }
  if (budgetMax > 0 && price <= 0 && (!property.rentPrice || parseFloat(String(property.rentPrice)) <= 0)) {
    blockers.push("Match inviable: La oferta NO especifica precio (N/E) y el requerimiento exige presupuesto.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  let reqFilledCount = 0;
  if (reqType) reqFilledCount++;
  if (reqBiz) reqFilledCount++;
  if (reqZone || requirement.ciudadDeseada) reqFilledCount++;
  if (budgetMax > 0) reqFilledCount++;
  if (reqAreaMin > 0) reqFilledCount++;
  if (reqBedrooms > 0) reqFilledCount++;
  if (reqBathrooms > 0) reqFilledCount++;
  if (reqGarages > 0) reqFilledCount++;
  let propFilledCount = 0;
  if (propType) propFilledCount++;
  if (propBiz) propFilledCount++;
  if (propZone || property.addressCity) propFilledCount++;
  if (price > 0 || property.rentPrice && parseFloat(String(property.rentPrice)) > 0) propFilledCount++;
  if (propArea > 0) propFilledCount++;
  if (pBedrooms > 0) propFilledCount++;
  if (pBathrooms > 0) propFilledCount++;
  if (pGarages > 0) propFilledCount++;
  if (reqFilledCount < 3 || propFilledCount < 3) {
    blockers.push(`Ficha poco robusta (Demanda: ${reqFilledCount}/8 especificaciones, Oferta: ${propFilledCount}/8 especificaciones). Se requieren publicaciones con datos b\xE1sicos m\xEDnimos (al menos 3 especificaciones).`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  const reqCityNorm2 = (requirement.ciudadDeseada || requirement.addressCity || requirement.city || requirement.rawText || "").toLowerCase();
  const propCityNorm2 = (property.addressCity || property.city || property.zone || property.rawText || "").toLowerCase();
  const isReqCali = reqCityNorm2.includes("cali");
  const isPropCali = propCityNorm2.includes("cali");
  const isReqBogota = reqCityNorm2.includes("bogota") || reqCityNorm2.includes("bogot\xE1");
  const isPropBogota = propCityNorm2.includes("bogota") || propCityNorm2.includes("bogot\xE1");
  if (isReqCali && isPropBogota && !isPropCali || isReqBogota && isPropCali && !isPropBogota) {
    blockers.push(`Incompatibilidad geogr\xE1fica de ciudad: Requerimiento en ${isReqCali ? "Cali" : "Bogot\xE1"} vs Oferta en ${isPropCali ? "Cali" : "Bogot\xE1"}.`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  let effectivePropType = propType;
  const pTextForType = (property.rawText || property.name || "").toLowerCase();
  if (effectivePropType === "apartment" || !effectivePropType) {
    if (pTextForType.includes("venta casa") || pTextForType.includes("casa 2 pisos") || pTextForType.includes("casa campestre") || /\bcasa\b/i.test(pTextForType)) {
      if (!pTextForType.includes("apartamento") && !pTextForType.includes("apto")) {
        effectivePropType = "house";
      }
    }
  }
  let effectiveReqType = reqType;
  const rTextForType = (requirement.rawText || requirement.name || "").toLowerCase();
  if (!effectiveReqType || effectiveReqType === "apartment") {
    if (rTextForType.includes("inmueble: casa") || rTextForType.includes("busco casa") || rTextForType.includes("requiero casa")) {
      if (!rTextForType.includes("apartamento") && !rTextForType.includes("apto")) {
        effectiveReqType = "house";
      }
    }
  }
  if (effectiveReqType && effectivePropType) {
    const aliases = {
      "apartamento": ["apto", "apartamento", "apartment"],
      "apto": ["apto", "apartamento", "apartment"],
      "apartment": ["apto", "apartamento", "apartment"],
      "casa": ["casa", "chalet", "casa campestre", "house"],
      "house": ["casa", "chalet", "casa campestre", "house"],
      "finca": ["finca", "finca raiz", "finca ra\xEDz", "farm"],
      "farm": ["finca", "finca raiz", "finca ra\xEDz", "farm"],
      "lote": ["lote", "terreno", "predio", "land"],
      "terreno": ["lote", "terreno", "predio", "land"],
      "predio": ["lote", "terreno", "predio", "land"],
      "land": ["lote", "terreno", "predio", "land"],
      "bodega": ["bodega", "bodega industrial", "warehouse"],
      "warehouse": ["bodega", "bodega industrial", "warehouse"],
      "local": ["local", "local comercial", "commercial"],
      "commercial": ["local", "local comercial", "commercial"],
      "oficina": ["oficina", "consultorio", "office"],
      "office": ["oficina", "consultorio", "office"]
    };
    const reqAlias = aliases[effectiveReqType] || [effectiveReqType];
    const propAlias = aliases[effectivePropType] || [effectivePropType];
    if (!reqAlias.some((a) => propAlias.includes(a))) {
      blockers.push(`Tipo de activo incompatible: deseado ${effectiveReqType}, ofrecido ${effectivePropType}`);
      return buildExplanationResult(0, blockers, positives, negatives);
    }
  }
  const cleanText = (t2) => (t2 || "").toLowerCase().trim().replace(/[\s\-_,.]+/g, " ");
  const reqRawText = cleanText(requirement.rawText || requirement.name || "");
  const propRawText = cleanText(property.rawText || property.name || "");
  const getHorizontalPropertySubtype = (type, raw) => {
    const t2 = (type || "").toLowerCase().trim();
    const r = (raw || "").toLowerCase().trim();
    if (r.includes("apartaestudio") || r.includes("aparta estudio") || r.includes("apartasuite") || r.includes("aparta suite") || r.includes("aparta-suite") || r.includes("suite ejecutiva") || r.includes("alcoba independiente") || r.includes("1 alcoba") || r.includes("una alcoba") || r.includes("1 habitacion independiente") || t2 === "apartaestudio" || t2 === "aparta_suite" || t2 === "apartasuite" || t2 === "studio") {
      return "apartaestudio";
    }
    if (r.includes("loft") || t2 === "loft") {
      return "loft";
    }
    if (r.includes("penthouse") || r.includes("pent house") || r.includes("ph ") || r.endsWith(" ph") || t2 === "penthouse") {
      return "penthouse";
    }
    if (r.includes("duplex") || r.includes("d\xFAplex") || r.includes("triplex") || r.includes("tr\xEDplex") || t2.includes("duplex")) {
      return "apartamento_duplex";
    }
    if (t2 === "apartment" || t2 === "apartamento" || t2 === "apto") {
      return "apartamento_estandar";
    }
    return t2;
  };
  const reqSubtype = getHorizontalPropertySubtype(reqType, reqRawText);
  const propSubtype = getHorizontalPropertySubtype(propType, propRawText);
  const isReqSingleRoomSubtype = reqSubtype === "apartaestudio" || reqSubtype === "loft";
  const isPropSingleRoomSubtype = propSubtype === "apartaestudio" || propSubtype === "loft";
  if (isReqSingleRoomSubtype && !isPropSingleRoomSubtype) {
    blockers.push(`Subtipo de activo incompatible (Tolerancia Cero): La demanda exige ${reqSubtype === "loft" ? "Loft" : "Apartaestudio / Aparta Suite (1 Alcoba)"} y la oferta es ${propSubtype === "penthouse" ? "PentHouse" : propSubtype === "apartamento_duplex" ? "Apartamento D\xFAplex" : "Apartamento familiar est\xE1ndar"}. Match Inviable (0%).`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  if (!isReqSingleRoomSubtype && isPropSingleRoomSubtype) {
    blockers.push(`Subtipo de activo incompatible (Tolerancia Cero): La demanda busca ${reqSubtype} familiar y la oferta es ${propSubtype} de 1 sola alcoba. Match Inviable (0%).`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  if (reqSubtype && propSubtype && reqSubtype !== propSubtype) {
    if (reqSubtype === "penthouse" && propSubtype !== "penthouse") {
      blockers.push(`Subtipo de activo incompatible: La demanda exige estrictamente PentHouse y la oferta es ${propSubtype}. Match Inviable (0%).`);
      return buildExplanationResult(0, blockers, positives, negatives);
    }
  }
  positives.push(`Tipo de activo compatible: ${propSubtype || propType}`);
  const geoResult = matchesGeography(
    requirement.zonaDeseada || requirement.addressNeighborhood || "",
    property.zone || property.addressNeighborhood || "",
    requirement.addressLocality || "",
    property.addressLocality || "",
    requirement.ciudadDeseada || requirement.city || "",
    property.addressCity || property.city || ""
  );
  if (!geoResult.matches) {
    blockers.push(`Ubicaci\xF3n incompatible: requerida zona '${requirement.zonaDeseada || ""}', ofrecida '${property.zone || ""}'`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  positives.push(`Ubicaci\xF3n compatible en zona: ${property.zone || ""}`);
  if (reqEstrato >= 1 && pEstrato >= 1 && reqEstrato !== pEstrato) {
    blockers.push(`Estrato incompatible: deseado ${reqEstrato}, ofrecido ${pEstrato}`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  if (reqAreaMin > 0) {
    if (propArea > 0) {
      if (propArea < reqAreaMin * 0.95) {
        blockers.push(`Guillotina de \xC1rea Estricta: \xC1rea ofrecida (${propArea} m\xB2) es inferior al m\xEDnimo exigido (${reqAreaMin} m\xB2). Match inviable (0%).`);
        return buildExplanationResult(0, blockers, positives, negatives);
      }
      if (propArea >= reqAreaMin) {
        positives.push(`\u2705 \xC1rea de ${propArea} m\xB2 cumple plenamente el requerimiento m\xEDnimo (${reqAreaMin} m\xB2)`);
      } else {
        positives.push(`\xC1rea de ${propArea} m\xB2 dentro de la tolerancia permitida del m\xEDnimo (${reqAreaMin} m\xB2)`);
      }
    } else {
      blockers.push(`No se puede verificar el \xE1rea requerida (${reqAreaMin} m\xB2) por falta de informaci\xF3n en la oferta.`);
      return buildExplanationResult(0, blockers, positives, negatives);
    }
  }
  if (isReqOpenBudget) {
    positives.push(`\u2705 Presupuesto Abierto en la Demanda: 100% de Cumplimiento Financiero con el valor comercial ofertado.`);
  } else if (budgetMax > 0) {
    const isReqRent2 = reqBiz.includes("arriendo");
    if (isReqRent2) {
      let propRent = property.rentPrice ? parseFloat(String(property.rentPrice)) : 0;
      if (propRent <= 0 && property.rawText) {
        const rawP = property.rawText.toLowerCase();
        const matchRentP = rawP.match(/(?:arriendo|canon|renta)\s*:?\s*\$?([\d.]+)\s*(millones|millón|m|M)?/i);
        if (matchRentP) {
          let valP = parseFloat(matchRentP[1].replace(/\./g, ""));
          if (!isNaN(valP)) {
            if (valP < 1e3) valP *= 1e6;
            propRent = valP;
          }
        }
      }
      if (propRent <= 0 && price > 0 && price < 1e8) {
        propRent = price;
      }
      const adminVal = pAdminFee > 0 ? pAdminFee : 0;
      const totalRent = propRent + adminVal;
      if (propRent <= 0 && price > 1e8) {
        blockers.push(`Guillotina Financiera (Tolerancia Cero): La oferta no especifica canon de arriendo y su precio de venta ($${price.toLocaleString()}) no aplica para una b\xFAsqueda de arriendo de $${budgetMax.toLocaleString()}`);
        return buildExplanationResult(0, blockers, positives, negatives);
      }
      const budgetMin2 = requirement.presupuestoMin ? parseFloat(String(requirement.presupuestoMin)) : 0;
      const lowerRentLimit = budgetMin2 > 0 ? budgetMin2 * 0.95 : budgetMax * 0.8;
      if (totalRent > budgetMax) {
        blockers.push(`Guillotina Financiera (Tolerancia Cero): Canon de arriendo total ($${totalRent.toLocaleString()}) supera el presupuesto m\xE1ximo de $${budgetMax.toLocaleString()}`);
        return buildExplanationResult(0, blockers, positives, negatives);
      }
      if (totalRent < lowerRentLimit) {
        blockers.push(`Guillotina Financiera: Canon de arriendo total ($${totalRent.toLocaleString()}) est\xE1 por debajo del segmento solicitado (m\xEDnimo $${lowerRentLimit.toLocaleString()}).`);
        return buildExplanationResult(0, blockers, positives, negatives);
      }
      positives.push(`\u2705 Presupuesto de arriendo cumple: Total $${totalRent.toLocaleString()} dentro del rango (m\xEDn $${lowerRentLimit.toLocaleString()} a m\xE1x $${budgetMax.toLocaleString()})`);
    } else {
      const budgetMin2 = requirement.presupuestoMin ? parseFloat(String(requirement.presupuestoMin)) : 0;
      const lowerSaleLimit = budgetMin2 > 0 ? budgetMin2 * 0.95 : budgetMax * 0.8;
      let salePrice = price;
      if (salePrice > budgetMax) {
        blockers.push(`Guillotina Financiera (Tolerancia Cero): El precio de la propiedad ($${salePrice.toLocaleString()}) supera el presupuesto m\xE1ximo del comprador ($${budgetMax.toLocaleString()}). Match inviable (0%).`);
        return buildExplanationResult(0, blockers, positives, negatives);
      }
      if (salePrice < lowerSaleLimit) {
        blockers.push(`Guillotina Financiera: El precio del inmueble ($${salePrice.toLocaleString()}) est\xE1 por debajo del segmento solicitado (m\xEDnimo $${lowerSaleLimit.toLocaleString()}).`);
        return buildExplanationResult(0, blockers, positives, negatives);
      }
    }
  }
  let effectiveReqBeds = reqBedrooms;
  if (effectiveReqBeds <= 0) {
    const mB = reqTextLow.match(/(\d+(?:\s*-\s*\d+)?)\s*(?:hab|habitaciones|alcoba|alcobas|alc|dormitorio)/i);
    if (mB) effectiveReqBeds = parseInt(mB[1].split("-")[0].trim(), 10);
  }
  let effectiveReqBaths = reqBathrooms;
  if (effectiveReqBaths <= 0) {
    const mW = reqTextLow.match(/(\d+(?:\.\d+)?)\s*(?:o\s*más\s*)?(?:wc|baño|baños|bñ)/i) || reqTextLow.match(/(\d+)\s*hab\s*con\s*baño/i);
    if (mW) effectiveReqBaths = parseFloat(mW[1]);
  }
  let effectiveReqGarages = reqGarages;
  if (effectiveReqGarages <= 0) {
    const mG = reqTextLow.match(/(?:parqueadero|parqueaderos|garaje|garajes|ptero|g\.)\s*\.?\s*(\d+)/i) || reqTextLow.match(/(\d+)\s*(?:parqueadero|parqueaderos|garaje|garajes|ptero|g\.|individuales)/i);
    if (mG) effectiveReqGarages = parseInt(mG[1], 10);
  }
  const reqAdminMaxVal = requirement.adminFeeMax ? parseFloat(String(requirement.adminFeeMax)) : 0;
  if (reqAdminMaxVal > 0 && pAdminFee > 0) {
    if (pAdminFee > reqAdminMaxVal) {
      blockers.push(`Guillotina Financiera (Administraci\xF3n): Cuota de administraci\xF3n de $${pAdminFee.toLocaleString()} supera el m\xE1ximo aceptado de $${reqAdminMaxVal.toLocaleString()}`);
      return buildExplanationResult(0, blockers, positives, negatives);
    } else {
      positives.push(`Administraci\xF3n favorable: $${pAdminFee.toLocaleString()} dentro del presupuesto m\xE1x de $${reqAdminMaxVal.toLocaleString()}`);
    }
  }
  const propRawTextLower = (property.rawText || property.description || "").toLowerCase();
  if (effectiveReqBeds > 0) {
    if (pBedrooms >= 0) {
      if (effectiveReqBeds === 1 || isReqSingleRoomSubtype) {
        if (pBedrooms !== 1) {
          blockers.push(`Regla Doctrinal de 1 Alcoba (Tolerancia Cero): La demanda busca estrictamente 1 habitaci\xF3n / apartaestudio y la oferta tiene ${pBedrooms} habitaciones. Match Inviable (0%).`);
          return buildExplanationResult(0, blockers, positives, negatives);
        } else {
          positives.push(`Habitaciones exactas (1 alcoba) para apartaestudio / apartasuite \u2014 Cumplimiento Perfecto`);
        }
      } else {
        if (pBedrooms < effectiveReqBeds) {
          blockers.push(`Atributo Fallido (Habitaciones): Ofrecidas (${pBedrooms}) son inferiores a las exigidas (${effectiveReqBeds}). Match Inviable (0%).`);
          return buildExplanationResult(0, blockers, positives, negatives);
        } else if (pBedrooms > effectiveReqBeds + 1) {
          blockers.push(`Desborde de Escala en Habitaciones: La demanda busca ${effectiveReqBeds} habitaciones y la oferta tiene ${pBedrooms} habitaciones (m\xE1ximo permitido ${effectiveReqBeds + 1} de confort). Match Inviable (0%).`);
          return buildExplanationResult(0, blockers, positives, negatives);
        } else {
          positives.push(`Habitaciones ofrecidas (${pBedrooms}) compatibles con las exigidas (${effectiveReqBeds}) dentro del margen de confort \u2014 Cumplimiento`);
        }
      }
    } else {
      blockers.push(`No se pueden verificar las habitaciones requeridas (${effectiveReqBeds}) por falta de informaci\xF3n en la oferta.`);
      return buildExplanationResult(0, blockers, positives, negatives);
    }
  }
  if (effectiveReqBaths > 0) {
    if (pBathrooms >= 0) {
      if (pBathrooms < effectiveReqBaths) {
        blockers.push(`Atributo Fallido (Ba\xF1os): Ofrecidos (${pBathrooms}) son inferiores a los requeridos (${effectiveReqBaths}). Match Inviable (0%).`);
        return buildExplanationResult(0, blockers, positives, negatives);
      } else {
        positives.push(`Ba\xF1os ofrecidos (${pBathrooms}) iguales o superiores a los requeridos (${effectiveReqBaths}) \u2014 Cumplimiento Confort`);
      }
    } else {
      blockers.push(`No se pueden verificar los ba\xF1os requeridos (${effectiveReqBaths}) por falta de informaci\xF3n en la oferta.`);
      return buildExplanationResult(0, blockers, positives, negatives);
    }
  }
  if (effectiveReqGarages > 0) {
    if (pGarages >= 0) {
      if (pGarages < effectiveReqGarages) {
        blockers.push(`Atributo Fallido (Parqueaderos): Ofrecidos (${pGarages}) son inferiores a los requeridos (${effectiveReqGarages}). Match Inviable (0%).`);
        return buildExplanationResult(0, blockers, positives, negatives);
      } else {
        positives.push(`Parqueaderos ofrecidos (${pGarages}) iguales o superiores a los requeridos (${effectiveReqGarages}) \u2014 Cumplimiento Confort`);
      }
    } else {
      blockers.push(`No se pueden verificar los parqueaderos requeridos (${effectiveReqGarages}) por falta de informaci\xF3n en la oferta.`);
      return buildExplanationResult(0, blockers, positives, negatives);
    }
  }
  let effectiveReqDeposits = 0;
  if (requirement.hasStorage || reqTextLow.includes("con deposito") || reqTextLow.includes("con dep\xF3sito") || reqTextLow.includes("exige deposito") || reqTextLow.includes("exige dep\xF3sito") || reqTextLow.includes("bodega")) {
    const mDep = reqTextLow.match(/(\d+)\s*(?:depósito|depósitos|deposito|depositos|bodega|bodegas)/i);
    effectiveReqDeposits = mDep ? parseInt(mDep[1], 10) : 1;
  }
  let propDeposits = 0;
  if (property.hasStorage || propRawTextLower.includes("deposito") || propRawTextLower.includes("dep\xF3sito") || propRawTextLower.includes("bodega")) {
    const mPropDep = propRawTextLower.match(/(\d+)\s*(?:depósito|depósitos|deposito|depositos|bodega|bodegas)/i);
    propDeposits = mPropDep ? parseInt(mPropDep[1], 10) : property.storageUnits ? Number(property.storageUnits) : 1;
  }
  if (propRawTextLower.includes("sin deposito") || propRawTextLower.includes("sin dep\xF3sito") || propRawTextLower.includes("no tiene deposito") || propRawTextLower.includes("no tiene dep\xF3sito")) {
    propDeposits = 0;
  }
  if (effectiveReqDeposits > 0) {
    if (propDeposits < effectiveReqDeposits) {
      blockers.push(`Atributo Fallido (Dep\xF3sitos): Dep\xF3sitos/bodegas ofrecidos (${propDeposits}) son inferiores a los exigidos (${effectiveReqDeposits}). Match Inviable (0%).`);
      return buildExplanationResult(0, blockers, positives, negatives);
    } else {
      positives.push(`Dep\xF3sitos ofrecidos (${propDeposits}) iguales o superiores a los exigidos (${effectiveReqDeposits}) \u2014 Cumplimiento Confort`);
    }
  }
  let effectiveReqBalconies = 0;
  if (requirement.hasBalcony || reqTextLow.includes("con balcon") || reqTextLow.includes("con balc\xF3n") || reqTextLow.includes("exige balcon") || reqTextLow.includes("exige balc\xF3n") || reqTextLow.includes("balcones")) {
    const mBal = reqTextLow.match(/(\d+)\s*(?:balcón|balcones|balcon)/i);
    effectiveReqBalconies = mBal ? parseInt(mBal[1], 10) : 1;
  }
  let propBalconies = 0;
  if (property.hasBalcony || propRawTextLower.includes("balcon") || propRawTextLower.includes("balc\xF3n") || propRawTextLower.includes("balcones")) {
    const mPropBal = propRawTextLower.match(/(\d+)\s*(?:balcón|balcones|balcon)/i);
    propBalconies = mPropBal ? parseInt(mPropBal[1], 10) : property.balconies ? Number(property.balconies) : 1;
  }
  if (propRawTextLower.includes("sin balcon") || propRawTextLower.includes("sin balc\xF3n") || propRawTextLower.includes("no tiene balcon") || propRawTextLower.includes("no tiene balc\xF3n")) {
    propBalconies = 0;
  }
  if (effectiveReqBalconies > 0) {
    if (propBalconies < effectiveReqBalconies) {
      blockers.push(`Atributo Fallido (Balcones): Balcones ofrecidos (${propBalconies}) son inferiores a los exigidos (${effectiveReqBalconies}). Match Inviable (0%).`);
      return buildExplanationResult(0, blockers, positives, negatives);
    } else {
      positives.push(`Balcones ofrecidos (${propBalconies}) iguales o superiores a los exigidos (${effectiveReqBalconies}) \u2014 Cumplimiento Confort`);
    }
  }
  let effectiveReqTerraces = 0;
  if (requirement.hasTerrace || reqTextLow.includes("con terraza") || reqTextLow.includes("exige terraza") || reqTextLow.includes("terrazas")) {
    const mTer = reqTextLow.match(/(\d+)\s*(?:terraza|terrazas)/i);
    effectiveReqTerraces = mTer ? parseInt(mTer[1], 10) : 1;
  }
  let propTerraces = 0;
  if (property.hasTerrace || propRawTextLower.includes("terraza") || propRawTextLower.includes("terrazas")) {
    const mPropTer = propRawTextLower.match(/(\d+)\s*(?:terraza|terrazas)/i);
    propTerraces = mPropTer ? parseInt(mPropTer[1], 10) : property.terraces ? Number(property.terraces) : 1;
  }
  if (propRawTextLower.includes("sin terraza") || propRawTextLower.includes("no tiene terraza")) {
    propTerraces = 0;
  }
  if (effectiveReqTerraces > 0) {
    if (propTerraces < effectiveReqTerraces) {
      blockers.push(`Atributo Fallido (Terrazas): Terrazas ofrecidas (${propTerraces}) son inferiores a las exigidas (${effectiveReqTerraces}). Match Inviable (0%).`);
      return buildExplanationResult(0, blockers, positives, negatives);
    } else {
      positives.push(`Terrazas ofrecidas (${propTerraces}) iguales o superiores a las exigidas (${effectiveReqTerraces}) \u2014 Cumplimiento Confort`);
    }
  }
  const reqRawTextLower = (requirement.rawText || "").toLowerCase();
  const propRejectsPermute = propRawTextLower.includes("no permuta") || propRawTextLower.includes("sin permuta") || propRawTextLower.includes("solo efectivo") || propRawTextLower.includes("no se acepta permuta") || propRawTextLower.includes("no se reciben vehiculos");
  const reqOffersTradeIn = requirement.tipoNegocioDeseado === "permuta" || reqRawTextLower.includes("entrego carro") || reqRawTextLower.includes("doy carro") || reqRawTextLower.includes("recibo vehiculo") || reqRawTextLower.includes("parte de pago") || reqRawTextLower.includes("pelo a pelo");
  if (propRejectsPermute && reqOffersTradeIn) {
    blockers.push("Choque de Intenci\xF3n Negocial: La oferta especifica 'NO PERMUTA / Solo Efectivo' y la demanda busca entregar veh\xEDculo u otro bien en parte de pago.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  const reqDemandsQuiet = reqRawTextLower.includes("silencioso") || reqRawTextLower.includes("tranquilo") || reqRawTextLower.includes("nada sobre vias principales") || reqRawTextLower.includes("sin vias principales") || reqRawTextLower.includes("no vias principales") || reqRawTextLower.includes("sin ruido");
  const propIsMainRoadNoise = propRawTextLower.includes("sobre avenida") || propRawTextLower.includes("via principal") || propRawTextLower.includes("frente a avenida") || propRawTextLower.includes("zona de alto trafico") || propRawTextLower.includes("zona ruidosa");
  if (reqDemandsQuiet && propIsMainRoadNoise) {
    blockers.push("Choque de Calidad de Vida: El comprador exige inmueble silencioso sin v\xEDas principales y la oferta est\xE1 situada sobre v\xEDa principal o zona ruidosa.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  const reqRejectsDuplex = reqRawTextLower.includes("no duplex") || reqRawTextLower.includes("no d\xFAplex") || reqRawTextLower.includes("cero duplex") || reqRawTextLower.includes("sin duplex") || reqRawTextLower.includes("nada de duplex") || reqRawTextLower.includes("sin escaleras") || reqRawTextLower.includes("un solo nivel") || reqRawTextLower.includes("un solo piso");
  const propIsDuplex = propRawTextLower.includes("duplex") || propRawTextLower.includes("d\xFAplex") || propRawTextLower.includes("dos niveles") || propRawTextLower.includes("2 niveles") || propRawTextLower.includes("dos pisos") || propRawTextLower.includes("2 pisos") || (property.name || "").toLowerCase().includes("duplex") || (property.name || "").toLowerCase().includes("d\xFAplex");
  if (reqRejectsDuplex && propIsDuplex) {
    blockers.push("Choque de Tipolog\xEDa Expresa: El cliente exige expresamente 'NO DUPLEX' y el inmueble ofrecido es D\xDAPLEX / Dos Niveles. Match Inviable (0%).");
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  const reqRejectsFirstFloor = reqRawTextLower.includes("no primer piso") || reqRawTextLower.includes("no 1er piso") || reqRawTextLower.includes("no piso 1") || reqRawTextLower.includes("piso alto");
  const propIsFirstFloor = propRawTextLower.includes("primer piso") || propRawTextLower.includes("piso 1") || propRawTextLower.includes("piso primero") || propRawTextLower.includes("1er piso");
  if (reqRejectsFirstFloor && propIsFirstFloor && !reqRawTextLower.includes("primer piso")) {
    blockers.push("Choque de Nivel Expreso: El cliente exige expresamente 'NO PRIMER PISO' y la oferta est\xE1 en Piso 1. Match Inviable (0%).");
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  const propGarageType = (property.garageType || "").toLowerCase();
  const reqGarageTypeRaw = (requirement.rawText || "").toLowerCase();
  const reqWantsIndependent = reqGarageTypeRaw.includes("independiente") || reqGarageTypeRaw.includes("libre") || reqGarageTypeRaw.includes("no lineal");
  let garageComfortPenalty = 0;
  if (reqGarages > 0 && pGarages >= reqGarages) {
    if (reqWantsIndependent && propGarageType === "lineal") {
      garageComfortPenalty = 1;
      negatives.push(`\u26A0\uFE0F Parqueadero(s) ofrecidos son LINEALES (servidumbre). El demandante exige ESTRICTAMENTE independientes (-30 pts).`);
    } else if (propGarageType === "independiente" && pGarages > reqGarages) {
      garageComfortPenalty = 2;
      positives.push(`\u2705 Excedente de parqueaderos independientes (${pGarages} ofrecidos vs ${reqGarages} requeridos) \u2014 Bono de confort`);
    } else if (propGarageType === "lineal" && pGarages >= reqGarages) {
      negatives.push(`\u2139\uFE0F Parqueadero(s) lineales/servidumbre \u2014 requiere mover veh\xEDculos para acceder.`);
    }
  }
  const reqWantsLightAir = reqGarageTypeRaw.includes("luz natural") || reqGarageTypeRaw.includes("ventilacion natural") || reqGarageTypeRaw.includes("vista panoramica") || reqGarageTypeRaw.includes("iluminacion");
  const propHasLightAir = propRawTextLower.includes("luz natural") || propRawTextLower.includes("ventilacion natural") || propRawTextLower.includes("vista panoramica") || propRawTextLower.includes("iluminado") || propRawTextLower.includes("exterior");
  let lightAirBonus = false;
  if (reqWantsLightAir && propHasLightAir) {
    lightAirBonus = true;
    positives.push(`\u2728 Confort T\xE9cnico Coincidente: Inmueble con luz/ventilaci\xF3n natural y vista privilegiada (+15 pts)`);
  }
  let earnedPoints = 0;
  const totalPossible = 100;
  earnedPoints += 15;
  earnedPoints += 15;
  earnedPoints += Math.round(geoResult.score / 25 * 20);
  const reqBizForScore = reqBiz.toLowerCase();
  const isReqRentForScore = reqBizForScore.includes("arriendo");
  const isReqSaleForScore = reqBizForScore.includes("venta") || reqBizForScore.includes("permuta");
  let effectivePrice = price;
  if (isReqRentForScore) {
    const rp = property.rentPrice ? parseFloat(String(property.rentPrice)) : 0;
    if (rp > 0) effectivePrice = rp;
    else if (price > 0 && price < 1e8) effectivePrice = price;
  } else if (isReqSaleForScore && propBiz === "venta_o_arriendo" && price > 0 && price < 1e8) {
    effectivePrice = 0;
  }
  if (budgetMax > 0) {
    if (effectivePrice > 0) {
      if (effectivePrice < budgetMax) {
        earnedPoints += 15;
        positives.push(`\u{1F4B0} Oportunidad: precio $${effectivePrice.toLocaleString()} por debajo del presupuesto $${budgetMax.toLocaleString()}`);
      } else if (effectivePrice === budgetMax) earnedPoints += 15;
      else if (effectivePrice <= budgetMax * 1.01) earnedPoints += 13;
      else if (effectivePrice <= budgetMax * 1.05) earnedPoints += 9;
      else negatives.push(`Precio $${effectivePrice.toLocaleString()} supera presupuesto $${budgetMax.toLocaleString()}`);
    } else {
      negatives.push("Presupuesto no especificado en la oferta (N/E)");
    }
  } else {
    earnedPoints += 10;
  }
  if (reqAreaMin > 0) {
    if (propArea > 0) {
      if (propArea >= reqAreaMin && propArea <= reqAreaMin * 1.03) earnedPoints += 10;
    } else {
      negatives.push("\xC1rea no especificada en la oferta (N/E)");
    }
  } else {
    earnedPoints += 7;
  }
  if (reqBedrooms > 0) {
    if (pBedrooms >= 0) {
      if (pBedrooms >= reqBedrooms) earnedPoints += 10;
      else negatives.push(`Habitaciones (${pBedrooms}) inferiores a las requeridas (${reqBedrooms})`);
    } else {
      negatives.push("Habitaciones no especificadas en la oferta (N/E)");
    }
  } else {
    earnedPoints += 7;
  }
  if (reqBathrooms > 0) {
    if (pBathrooms >= 0) {
      if (pBathrooms >= reqBathrooms) earnedPoints += 4;
      else negatives.push(`Ba\xF1os (${pBathrooms}) inferiores a los requeridos (${reqBathrooms})`);
    } else {
      negatives.push("Ba\xF1os no especificados en la oferta (N/E)");
    }
  } else {
    earnedPoints += 3;
  }
  if (reqGarages > 0) {
    if (pGarages >= 0) {
      if (pGarages >= reqGarages) {
        if (garageComfortPenalty === 1) {
          earnedPoints += Math.round(4 * 0.4);
        } else if (garageComfortPenalty === 2) {
          earnedPoints += 4;
        } else {
          earnedPoints += 4;
        }
      } else {
        negatives.push(`Parqueaderos (${pGarages}) inferiores a los requeridos (${reqGarages})`);
      }
    } else {
      negatives.push("Parqueaderos no especificados en la oferta (N/E)");
    }
  } else {
    earnedPoints += 3;
  }
  if (reqEstrato >= 1 && pEstrato >= 1) {
    if (reqEstrato === pEstrato) earnedPoints += 3;
  } else {
    earnedPoints += 2;
  }
  let reqAntiguedadMax = requirement.antiguedadMax != null ? Number(requirement.antiguedadMax) : -1;
  if (reqAntiguedadMax < 0 && requirement.rawText) {
    const mAntig = requirement.rawText.toLowerCase().match(/(?:máximo|max|hasta)\s*(\d{1,2})\s*años?\s*(?:de\s*)?(?:construido|construccion|construcción|antigüedad|antiguedad)?/i) || requirement.rawText.toLowerCase().match(/(\d{1,2})\s*años?\s*(?:de\s*)?(?:construido|antigüedad)/i);
    if (mAntig) {
      reqAntiguedadMax = parseInt(mAntig[1], 10);
    }
  }
  const propAntiguedadAnos = property.antiguedadAnos != null ? Number(property.antiguedadAnos) : -1;
  const propYearBuilt = property.yearBuilt != null ? Number(property.yearBuilt) : -1;
  let propAge = propAntiguedadAnos;
  if (propAge < 0 && propYearBuilt > 0) {
    propAge = (/* @__PURE__ */ new Date()).getFullYear() - propYearBuilt;
  }
  if (propAge < 0 && property.rawText) {
    const mPropAge = property.rawText.toLowerCase().match(/(?:edificio\s*de|antigüedad|antiguedad|tiene)\s*(\d{1,2})\s*años/i) || property.rawText.toLowerCase().match(/(\d{1,2})\s*años\s*(?:de\s*)?(?:antigüedad|construido)/i);
    if (mPropAge) {
      propAge = parseInt(mPropAge[1], 10);
    }
  }
  if (reqAntiguedadMax >= 0 && propAge >= 0) {
    if (propAge <= reqAntiguedadMax) {
      earnedPoints += 4;
      positives.push(`\u2705 Antig\xFCedad: ${propAge} a\xF1os (m\xE1ximo pedido: ${reqAntiguedadMax} a\xF1os)`);
    } else {
      blockers.push(`Antig\xFCedad del inmueble (${propAge} a\xF1os) SUPERA el m\xE1ximo exigido de (${reqAntiguedadMax} a\xF1os). Match inviable (0%).`);
      return buildExplanationResult(0, blockers, positives, negatives);
    }
  } else if (reqAntiguedadMax < 0 && propAge >= 0) {
    earnedPoints += 3;
    if (propAge > 0) positives.push(`\u2139\uFE0F Antig\xFCedad de la oferta: ${propAge} a\xF1os (sin restricci\xF3n por la demanda)`);
  } else {
    earnedPoints += 2;
  }
  const semRes = evaluarInterseccionComodidadesSemanticas(requirement, property);
  if (semRes.positives.length > 0) {
    positives.push(...semRes.positives);
  }
  if (garageComfortPenalty === 1) {
    earnedPoints -= 30;
  }
  if (lightAirBonus) {
    earnedPoints += 15;
  }
  if (blockers.length > 0) {
    return buildExplanationResult(0, blockers, positives, negatives, false, missingFieldsList);
  }
  let totalDownstreamSpecs = 10;
  let filledDownstreamSpecs = 0;
  if (price > 0 || property.rentPrice && parseFloat(String(property.rentPrice)) > 0 || isReqOpenBudget) filledDownstreamSpecs++;
  if (pAdminFee > 0 || /administraci[oó]n|admon|admin/i.test(property.rawText || "")) filledDownstreamSpecs++;
  if (propArea > 0) filledDownstreamSpecs++;
  if (pBedrooms > 0) filledDownstreamSpecs++;
  if (pBathrooms > 0) filledDownstreamSpecs++;
  if (pGarages > 0) filledDownstreamSpecs++;
  if (pEstrato > 0 || property.zone && /(?:santa b[aá]rbara|chic[oó]|rosales|cedritos|nogal|cabrera)/i.test(property.zone)) filledDownstreamSpecs++;
  if (propAge >= 0 || /construido|a[nñ]os|estrenar|nueva/i.test(property.rawText || "")) filledDownstreamSpecs++;
  if (property.hasBalcony || property.hasTerrace || /balc[oó]n|terraza|patio/i.test(property.rawText || "")) filledDownstreamSpecs++;
  if (property.hasStorageRoom || /dep[oó]sito|bodega|cuarto [uú]til/i.test(property.rawText || "")) filledDownstreamSpecs++;
  if (/estudio|star|estar de tv/i.test(property.rawText || "")) filledDownstreamSpecs++;
  if (/cuarto de servicio|cbs|alcoba de servicio/i.test(property.rawText || "")) filledDownstreamSpecs++;
  const completionRatio = Math.min(1, filledDownstreamSpecs / totalDownstreamSpecs);
  let finalPercentage = 0;
  if (completionRatio < 0.5) {
    blockers.push(`Ficha incompleta: los campos de abajo est\xE1n llenados a menos del 50% (${Math.round(completionRatio * 100)}%). Match no considerado (0%).`);
    return buildExplanationResult(0, blockers, positives, negatives, false, missingFieldsList);
  } else if (completionRatio < 0.7) {
    finalPercentage = 80;
    positives.push(`\u2705 Match 80%: 5 campos en duro 100% en verde + campos de abajo llenos al ${Math.round(completionRatio * 100)}% (m\xEDn. 50%)`);
  } else if (completionRatio < 0.85) {
    finalPercentage = 85;
    positives.push(`\u2705 Match 85%: 5 campos en duro 100% en verde + campos de abajo llenos al ${Math.round(completionRatio * 100)}% (m\xEDn. 70%)`);
  } else if (completionRatio < 0.95) {
    finalPercentage = 95;
    positives.push(`\u2705 Match 95%: 5 campos en duro 100% en verde + campos de abajo llenos al ${Math.round(completionRatio * 100)}% (m\xEDn. 85%)`);
  } else {
    finalPercentage = 100;
    positives.push(`\u{1F31F} MATCH PERFECTO 100%: 5 campos en duro 100% en verde + TODAS las l\xEDneas de abajo 100% llenas y compatibles!`);
  }
  return buildExplanationResult(finalPercentage, blockers, positives, negatives, isStrictCompliant, missingFieldsList);
}
function evaluarInterseccionComodidadesSemanticas(req, prop) {
  const reqText = `${req.rawText || ""} ${req.description || ""}`.toLowerCase();
  const propText = `${prop.rawText || ""} ${prop.description || ""}`.toLowerCase();
  const positives = [];
  const reqHasVestier = req.hasWalkInCloset || reqText.includes("vestier") || reqText.includes("walk") || reqText.includes("closet");
  const propHasVestier = prop.hasWalkInCloset || propText.includes("vestier") || propText.includes("walk") || propText.includes("closet");
  let vestierScore = 0;
  if (reqHasVestier && propHasVestier) {
    vestierScore = 1;
    positives.push("Homologaci\xF3n Sem\xE1ntica: Coincidencia Exacta entre Vestier y Walk-in Closet (100%)");
  }
  const reqHasBalcony = req.hasBalcony || reqText.includes("balcon") || reqText.includes("balc\xF3n");
  const reqHasTerrace = req.hasTerrace || reqText.includes("terraza") || reqText.includes("patio");
  const propHasBalcony = prop.hasBalcony || propText.includes("balcon") || propText.includes("balc\xF3n");
  const propHasTerrace = prop.hasTerrace || propText.includes("terraza") || propText.includes("patio");
  let balconTerrasaScore = 0;
  if (reqHasBalcony && propHasBalcony) {
    balconTerrasaScore = 1;
    positives.push("Coincidencia Exacta de Balc\xF3n (100%)");
  } else if (reqHasTerrace && propHasTerrace) {
    balconTerrasaScore = 1;
    positives.push("Coincidencia Exacta de Terraza (100%)");
  } else if (reqHasBalcony && propHasTerrace || reqHasTerrace && propHasBalcony) {
    balconTerrasaScore = 0.7;
    positives.push("Homologaci\xF3n Sem\xE1ntica: Coincidencia Parcial por Analog\xEDa de Espacio Abierto (Balc\xF3n \u2194 Terraza 70%)");
  }
  const reqWantsGreen = reqText.includes("vista verde") || reqText.includes("parque") || reqText.includes("cerros") || reqText.includes("tranquilo");
  const propIsParkFront = propText.includes("vista verde") || propText.includes("frente a parque") || propText.includes("exterior");
  const propIsSilentInterior = propText.includes("interior") || propText.includes("silencioso");
  let entornoScore = 0;
  if (reqWantsGreen && propIsParkFront) {
    entornoScore = 1;
    positives.push("Entorno: Coincidencia Exacta Vista Verde / Exterior frente a Parque (100%)");
  } else if (reqWantsGreen && propIsSilentInterior) {
    entornoScore = 0.8;
    positives.push("Entorno: Coincidencia Parcial Vista Verde \u2194 Interior Silencioso (80%)");
  }
  return { vestierScore, balconTerrasaScore, entornoScore, positives };
}
function calcularScoreMatch(requirement, property) {
  return explicarMatch(requirement, property).score;
}
function evaluarMatch(requirement, property) {
  return calcularScoreMatch(requirement, property) >= 80;
}
async function findMatchesForProperty(propertyId) {
  const db = await getDb();
  if (!db) return [];
  try {
    const [property] = await db.select().from(properties).where(eq3(properties.id, propertyId));
    if (!property) return [];
    const activeRequirements = await db.select().from(requirements).where(eq3(requirements.status, "active"));
    const validMatches = [];
    for (const req of activeRequirements) {
      const explanation = explicarMatch(req, property);
      const score = explanation.score;
      if (score >= 80) {
        let matchId;
        const existing = await db.select().from(propertyMatches).where(
          and(
            eq3(propertyMatches.propertyId, propertyId),
            eq3(propertyMatches.requirementId, req.id)
          )
        ).limit(1);
        const ipcObj = calcularIPC(req, property, score);
        explanation.ipc = ipcObj;
        if (existing.length > 0) {
          matchId = existing[0].id;
          await db.update(propertyMatches).set({
            matchScore: score.toFixed(2),
            matchExplanation: explanation,
            ipc: ipcObj,
            createdAt: /* @__PURE__ */ new Date()
          }).where(eq3(propertyMatches.id, matchId));
        } else {
          const [newMatch] = await db.insert(propertyMatches).values({
            propertyId,
            requirementId: req.id,
            matchScore: score.toFixed(2),
            matchReason: `VECY CORE TS Scoring: ${score.toFixed(2)}/100`,
            matchExplanation: explanation,
            ipc: ipcObj,
            status: "suggested",
            ownerConfirmed: false,
            seekerConfirmed: false
          }).returning();
          matchId = newMatch.id;
          vrifEvents.emit("match:created", matchId);
        }
        validMatches.push({
          ...req,
          score,
          matchId,
          idUsuarioWhatsapp: req.idUsuarioWhatsapp
        });
      } else {
        await db.delete(propertyMatches).where(
          and(
            eq3(propertyMatches.propertyId, propertyId),
            eq3(propertyMatches.requirementId, req.id)
          )
        );
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
    const [req] = await db.select().from(requirements).where(eq3(requirements.id, requirementId));
    if (!req) return [];
    const availableProperties = await db.select().from(properties).where(eq3(properties.available, true));
    const validMatches = [];
    for (const prop of availableProperties) {
      const explanation = explicarMatch(req, prop);
      const score = explanation.score;
      if (score >= 80) {
        let matchId;
        const existing = await db.select().from(propertyMatches).where(
          and(
            eq3(propertyMatches.propertyId, prop.id),
            eq3(propertyMatches.requirementId, requirementId)
          )
        ).limit(1);
        const ipcObj = calcularIPC(req, prop, score);
        explanation.ipc = ipcObj;
        if (existing.length > 0) {
          matchId = existing[0].id;
          await db.update(propertyMatches).set({
            matchScore: score.toFixed(2),
            matchExplanation: explanation,
            ipc: ipcObj,
            createdAt: /* @__PURE__ */ new Date()
          }).where(eq3(propertyMatches.id, matchId));
        } else {
          const [newMatch] = await db.insert(propertyMatches).values({
            propertyId: prop.id,
            requirementId,
            matchScore: score.toFixed(2),
            matchReason: `VECY CORE TS Scoring: ${score.toFixed(2)}/100`,
            matchExplanation: explanation,
            ipc: ipcObj,
            status: "suggested",
            ownerConfirmed: false,
            seekerConfirmed: false
          }).returning();
          matchId = newMatch.id;
          vrifEvents.emit("match:created", matchId);
        }
        validMatches.push({
          ...prop,
          score,
          matchId,
          idUsuarioWhatsapp: prop.idUsuarioWhatsapp
        });
      } else {
        await db.delete(propertyMatches).where(
          and(
            eq3(propertyMatches.propertyId, prop.id),
            eq3(propertyMatches.requirementId, requirementId)
          )
        );
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
    if (!propertyId && !requirementId) {
      console.log(`[MATCHING-FULL] \u{1F680} Recalculando matches para TODAS las propiedades activas en DB...`);
      const activeProps = await db.select({ id: properties.id }).from(properties).where(eq3(properties.available, true));
      let totalMatches = 0;
      for (const p of activeProps) {
        const matches = await findMatchesForProperty(p.id);
        totalMatches += matches.length;
      }
      console.log(`[MATCHING-FULL] \u2705 Rec\xE1lculo completo finalizado. ${activeProps.length} propiedades evaluadas, ${totalMatches} matches registrados/actualizados.`);
      return;
    }
    if (requirementId) {
      console.log(`[MATCHING-TS] \u26A1 Ejecutando Motor Autoritativo TypeScript para Requerimiento #${requirementId}...`);
      const matches = await findMatchesForRequirement(requirementId);
      console.log(`[MATCHING-TS] \u2705 ${matches.length} matches validados por TypeScript para Requerimiento #${requirementId}.`);
    } else if (propertyId) {
      console.log(`[MATCHING-TS] \u26A1 Ejecutando Motor Autoritativo TypeScript para Propiedad #${propertyId}...`);
      const matches = await findMatchesForProperty(propertyId);
      console.log(`[MATCHING-TS] \u2705 ${matches.length} matches validados por TypeScript para Propiedad #${propertyId}.`);
    }
  } catch (err) {
    console.error(`[MATCHING-RPC-ERROR] Error ejecutando RPC:`, err?.message || err);
  }
}
function buildBigTechAdminReport(prop, req, score) {
  const formatCOP = (val) => {
    const num = parseFloat(String(val));
    if (isNaN(num) || num === 0) return "N/E";
    return `$${num.toLocaleString("es-CO")}`;
  };
  const propPriceStr = prop.price ? formatCOP(prop.price) : "N/E";
  const reqBudgetStr = req.presupuestoMax ? formatCOP(req.presupuestoMax) : "N/E";
  const propBroker = (prop.idUsuarioWhatsapp || "Captador").replace(/\D/g, "");
  const reqBroker = (req.idUsuarioWhatsapp || "Requiriente").replace(/\D/g, "");
  let intentReason = `El cliente busca inmueble en ${req.zonaDeseada || prop.zone || "Bogot\xE1"}`;
  if (req.rawText && req.rawText.toLowerCase().includes("silencioso")) {
    intentReason += " y exige huir del ruido de las v\xEDas principales. Este inmueble cumple el criterio de tranquilidad.";
  } else if (req.rawText && req.rawText.toLowerCase().includes("luz natural")) {
    intentReason += " y prioriza iluminaci\xF3n y ventilaci\xF3n natural.";
  } else {
    intentReason += ". Coincidencia de alta intencionalidad comercial.";
  }
  let techDetails = `Coincide en distribuci\xF3n (${prop.bedrooms || "N/E"} habs, ${prop.bathrooms || "N/E"} ba\xF1os)`;
  if (prop.garageType === "independiente") {
    techDetails += " y tiene garajes independientes \u2705";
  } else if (prop.garageType === "lineal") {
    techDetails += " (\u26A0\uFE0F garajes en servidumbre)";
  }
  return `\u{1F680} *VECY INTEL: Oportunidad de Cierre Detectada (${score}% MATCH)*
\u{1F464} *ASESORES:* +${propBroker} \u2194 +${reqBroker}
\u{1F3E0} *OFERTA #${prop.id}:* ${prop.name || prop.title || "Inmueble"} (${propPriceStr})
\u{1F4CB} *DEMANDA #${req.id}:* ${req.name || "Requerimiento"} (${reqBudgetStr})
\u{1F9E0} *INTENCI\xD3N:* ${intentReason}
\u2696\uFE0F *T\xC9CNICO:* ${techDetails}.
\u{1F4B0} *ESTRATEGIA:* Eduardo / Jani, coincidencia de alta probabilidad validada. \xA1Vayan por esa comisi\xF3n! \u{1F680}

\u{1F449} Ver en el panel web: https://vecy-network.vercel.app/admin`;
}
var TRANSACTION_COMPATIBILITY_MATRIX;
var init_matching = __esm({
  "server/_core/matching.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_geography();
    init_geo_lookup();
    init_events();
    TRANSACTION_COMPATIBILITY_MATRIX = {
      venta: /* @__PURE__ */ new Set(["venta", "venta_o_arriendo", "venta_permuta", "arriendo_con_opcion_de_compra"]),
      arriendo: /* @__PURE__ */ new Set(["arriendo", "venta_o_arriendo", "arriendo_temporal"]),
      venta_o_arriendo: /* @__PURE__ */ new Set(["venta", "arriendo", "venta_o_arriendo", "venta_permuta", "arriendo_temporal", "arriendo_con_opcion_de_compra"]),
      arriendo_temporal: /* @__PURE__ */ new Set(["arriendo_temporal", "arriendo", "venta_o_arriendo"]),
      arriendo_con_opcion_de_compra: /* @__PURE__ */ new Set(["arriendo_con_opcion_de_compra", "venta", "venta_o_arriendo"]),
      permuta: /* @__PURE__ */ new Set(["permuta", "venta_permuta"]),
      venta_permuta: /* @__PURE__ */ new Set(["venta_permuta", "venta", "permuta", "venta_o_arriendo"]),
      aporte: /* @__PURE__ */ new Set(["aporte"])
    };
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
  const model = "gemini-2.5-flash";
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
  const textCandidate = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (textCandidate && typeof textCandidate === "string") {
    return textCandidate.trim();
  }
  return "";
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
import fs4 from "fs";
import path4 from "path";
import { createClient } from "@supabase/supabase-js";
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "").replace(/[^\w\d\-_\.\/]/g, "_");
}
function buildAbsoluteLocalUrl(key) {
  const base = (process.env.VPS_BASE_URL || "http://13.140.149.144").replace(/\/+$/, "");
  return `${base}/uploads/${key}`;
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const key = normalizeKey(relKey);
  const targetFilePath = path4.join(uploadsDir, key);
  const targetSubdir = path4.dirname(targetFilePath);
  if (!fs4.existsSync(targetSubdir)) {
    fs4.mkdirSync(targetSubdir, { recursive: true });
  }
  const buffer = typeof data === "string" ? Buffer.from(data, "base64") : Buffer.from(data);
  fs4.writeFileSync(targetFilePath, buffer);
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error: uploadError } = await supabase.storage.from("property-flyers").upload(key, buffer, {
        contentType,
        upsert: true
      });
      if (!uploadError) {
        const { data: publicData } = supabase.storage.from("property-flyers").getPublicUrl(key);
        if (publicData?.publicUrl) {
          console.log(`[Storage] \u2705 Archivo subido a Supabase Storage: ${publicData.publicUrl}`);
          return { key, url: publicData.publicUrl };
        }
      } else {
        console.warn(`[Storage] Supabase upload error: ${uploadError.message}`);
      }
    } catch (sbErr) {
      console.warn(`[Storage] Supabase Storage omitido (${sbErr.message}), usando almacenamiento local.`);
    }
  }
  const publicUrl = buildAbsoluteLocalUrl(key);
  console.log(`[Storage] \u{1F4C1} Archivo guardado localmente en ${targetFilePath} -> URL absoluta: ${publicUrl}`);
  return { key, url: publicUrl };
}
var uploadsDir;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    uploadsDir = path4.resolve(process.cwd(), "public/uploads");
    if (!fs4.existsSync(uploadsDir)) {
      fs4.mkdirSync(uploadsDir, { recursive: true });
    }
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
  brokerDirectoryCache: () => brokerDirectoryCache,
  buildFlyerBreakdownText: () => buildFlyerBreakdownText,
  buildSystemPrompt: () => buildSystemPrompt,
  calcularCalificacionCompletitud: () => calcularCalificacionCompletitud,
  clearPromptCache: () => clearPromptCache,
  enrichLexiconFromText: () => enrichLexiconFromText,
  esMensajeSpamOBasura: () => esMensajeSpamOBasura,
  evaluateMultiItemHeuristics: () => evaluateMultiItemHeuristics,
  extractColombianPhoneFromText: () => extractColombianPhoneFromText,
  extractFallbackDataFromText: () => extractFallbackDataFromText,
  extractFirstName: () => extractFirstName,
  generarHashMensaje: () => generarHashMensaje,
  generateWelcomeMessage: () => generateWelcomeMessage,
  getColombiaNow: () => getColombiaNow,
  getEmojiForCalificacion: () => getEmojiForCalificacion,
  getLiveStats: () => getLiveStats,
  handleAmendmentUpdate: () => handleAmendmentUpdate,
  handleDetectedMatches: () => handleDetectedMatches,
  hasRealEstateTextKeyword: () => hasRealEstateTextKeyword,
  initBrokerDirectory: () => initBrokerDirectory,
  isGenericName: () => isGenericName,
  isOutsideWorkingHours: () => isOutsideWorkingHours,
  isPhoneNumberNotPrice: () => isPhoneNumberNotPrice,
  isSessionMuted: () => isSessionMuted,
  janiaResultSchema: () => janiaResultSchema,
  muteSession: () => muteSession,
  normalizePhoneNumber: () => normalizePhoneNumber,
  obtenerCamposRequeridosYPreguntas: () => obtenerCamposRequeridosYPreguntas,
  parseSafeJSON: () => parseSafeJSON,
  processCirculoMessage: () => processCirculoMessage,
  processConsultingMessage: () => processConsultingMessage,
  processWhatsAppMessage: () => processWhatsAppMessage,
  repairJSON: () => repairJSON,
  resolveContactPhone: () => resolveContactPhone,
  sanitizeResponseMarkdown: () => sanitizeResponseMarkdown,
  scrapeUrlWithBypass: () => scrapeUrlWithBypass,
  splitMultiPropertyMessage: () => splitMultiPropertyMessage,
  translatePropertyType: () => translatePropertyType,
  translateTransactionType: () => translateTransactionType
});
import { eq as eq4, and as and2, sql as sql3, gte, desc } from "drizzle-orm";
import fs5 from "fs";
import path5 from "path";
import axios6 from "axios";
import crypto from "crypto";
function generarHashMensaje(rawText, remitente) {
  const normalizado = (rawText || "").toLowerCase().replace(/\s+/g, " ").replace(/[^\w\s]/g, "").trim();
  return crypto.createHash("sha256").update(`${remitente}:${normalizado}`).digest("hex");
}
function isPhoneNumberNotPrice(val, rawText) {
  if (val === void 0 || val === null || val === "" || val === 0 || val === "0") return false;
  const numStr = String(val).replace(/\D/g, "");
  if (/000000$/.test(numStr) || /00000$/.test(numStr)) {
    return false;
  }
  if (numStr.length === 10 && numStr.startsWith("3")) {
    if (rawText && /(?:\$|precio|valor|ppto|presupuesto|canon|hasta|venta)\s*3\d{9}/i.test(rawText)) return false;
    return true;
  }
  if (numStr.length === 12 && numStr.startsWith("573")) {
    if (rawText && /(?:\$|precio|valor|ppto|presupuesto|canon|hasta|venta)\s*573\d{9}/i.test(rawText)) return false;
    return true;
  }
  if (rawText) {
    const rawLower = rawText.toLowerCase();
    if (rawLower.includes(numStr) && numStr.length >= 8) {
      if (/wa|whatsapp|cel|celular|tel|telefono|teléfono|contacto|llamar/i.test(rawLower)) {
        return true;
      }
    }
  }
  return false;
}
function extractFirstName(fullName) {
  if (!fullName) return "";
  let clean = fullName.trim();
  if (!clean) return "";
  if (/^\+?[\d\s-]{6,}$/.test(clean)) return "";
  if (clean.includes("@")) {
    clean = clean.split("@")[0];
  }
  clean = clean.replace(/[0-9]/g, "");
  if (!clean.trim()) return "";
  const words = clean.split(/\s+/).map((w) => w.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, ""));
  const filteredWords = words.filter((w) => w.length > 0);
  if (filteredWords.length === 0 || !filteredWords[0]) return "";
  const w1 = filteredWords[0].toLowerCase();
  const w2 = filteredWords[1] ? filteredWords[1].toLowerCase() : "";
  if (w2 && COMMON_FIRST_NAMES.has(w1) && COMMON_FIRST_NAMES.has(w2)) {
    const first = filteredWords[0].charAt(0).toUpperCase() + filteredWords[0].slice(1).toLowerCase();
    const second = filteredWords[1].charAt(0).toUpperCase() + filteredWords[1].slice(1).toLowerCase();
    return `${first} ${second}`;
  }
  const firstWordLower = w1;
  for (const commonName of COMMON_FIRST_NAMES) {
    if (commonName.length >= 4 && firstWordLower.startsWith(commonName)) {
      return commonName.charAt(0).toUpperCase() + commonName.slice(1).toLowerCase();
    }
  }
  return filteredWords[0].charAt(0).toUpperCase() + filteredWords[0].slice(1).toLowerCase();
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
  if (text2.startsWith("```json")) text2 = text2.substring(7);
  else if (text2.startsWith("```")) text2 = text2.substring(3);
  if (text2.endsWith("```")) text2 = text2.substring(0, text2.length - 3);
  text2 = text2.trim();
  const start = text2.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in content");
  const lastClose = text2.lastIndexOf("}");
  if (lastClose > start) {
    const extracted = text2.substring(start, lastClose + 1);
    try {
      return JSON.parse(extracted);
    } catch (_) {
    }
  }
  const partial = text2.substring(start);
  const repaired = repairJSON(partial);
  try {
    return JSON.parse(repaired);
  } catch (_) {
  }
  throw new Error("Could not parse or repair JSON from LLM output");
}
function repairJSON(partial) {
  let inString = false;
  let escape = false;
  const stack = [];
  let i = 0;
  let lastValidNonStringPos = 0;
  for (; i < partial.length; i++) {
    const ch = partial[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      if (!inString) lastValidNonStringPos = i;
      continue;
    }
    if (inString) continue;
    lastValidNonStringPos = i;
    if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") {
      if (stack.length > 0) stack.pop();
    }
  }
  let result = partial;
  if (inString) {
    const lastQuote = partial.lastIndexOf('"', i - 1);
    let cutPoint = lastQuote;
    const prevComma = partial.lastIndexOf(",", lastQuote - 1);
    if (prevComma !== -1) {
      cutPoint = prevComma;
    }
    result = partial.substring(0, cutPoint);
  }
  result = result.trimEnd().replace(/,\s*$/, "");
  for (let j = stack.length - 1; j >= 0; j--) {
    result += stack[j] === "{" ? "}" : "]";
  }
  return result;
}
function getColombiaNow() {
  const now = /* @__PURE__ */ new Date();
  return new Date(now.getTime() - 5 * 60 * 60 * 1e3);
}
function hasRealEstateTextKeyword(cleanText) {
  const text2 = cleanText.toLowerCase();
  return text2.includes("apto") || text2.includes("apartamento") || text2.includes("casa") || text2.includes("bodega") || text2.includes("oficina") || text2.includes("local") || text2.includes("locales") || text2.includes("caba\xF1a") || text2.includes("caba\xF1as") || text2.includes("lote") || text2.includes("finca") || text2.includes("habs") || text2.includes("alcoba") || text2.includes("m2") || text2.includes("mts") || text2.includes("requerimiento");
}
function buildFlyerBreakdownText(extracted, fallbackText) {
  if (!extracted) return fallbackText || "";
  const parts = [];
  if (extracted.title) parts.push(`\u{1F4CC} ${extracted.title}`);
  if (extracted.description && extracted.description.trim() !== "" && !extracted.description.includes("[Publicaci\xF3n de Imagen")) {
    parts.push(extracted.description.trim());
  }
  const specs = [];
  const pVal = extracted.price || extracted.presupuestoMax;
  if (pVal && Number(pVal) > 0) {
    specs.push(`\u{1F4B0} Precio/Presupuesto: $${Number(pVal).toLocaleString("es-CO")}`);
  }
  if (extracted.rentPrice && Number(extracted.rentPrice) > 0) {
    specs.push(`\u{1F4B0} Canon Arriendo: $${Number(extracted.rentPrice).toLocaleString("es-CO")}`);
  }
  if (extracted.adminFee && Number(extracted.adminFee) > 0) {
    specs.push(`\u{1F3E2} Administraci\xF3n: $${Number(extracted.adminFee).toLocaleString("es-CO")}`);
  }
  if (extracted.area && Number(extracted.area) > 0) {
    specs.push(`\u{1F4D0} \xC1rea: ${extracted.area} m\xB2`);
  } else if (extracted.areaMin && Number(extracted.areaMin) > 0) {
    specs.push(`\u{1F4D0} \xC1rea M\xEDnima: ${extracted.areaMin} m\xB2`);
  }
  if (extracted.bedrooms || extracted.rooms || extracted.habitacionesMin) {
    specs.push(`\u{1F6CF}\uFE0F ${extracted.bedrooms || extracted.rooms || extracted.habitacionesMin} Habitaciones`);
  }
  if (extracted.bathrooms || extracted.baths || extracted.banosMin) {
    specs.push(`\u{1F6BF} ${extracted.bathrooms || extracted.baths || extracted.banosMin} Ba\xF1os`);
  }
  if (extracted.garages || extracted.parqueaderosMin) {
    specs.push(`\u{1F697} ${extracted.garages || extracted.parqueaderosMin} Parqueaderos`);
  }
  const zone = extracted.zone || extracted.zonaDeseada || extracted.addressNeighborhood;
  if (zone) {
    specs.push(`\u{1F4CD} Sector: ${zone}`);
  }
  const city = extracted.city || extracted.ciudadDeseada || extracted.addressCity;
  if (city) {
    specs.push(`\u{1F3D9}\uFE0F Ciudad: ${city}`);
  }
  if (extracted.contactPhone || extracted.telefonoContacto) {
    specs.push(`\u{1F4DE} Contacto: ${extracted.contactPhone || extracted.telefonoContacto}`);
  }
  if (specs.length > 0) {
    parts.push(`\u{1F4CB} Ficha T\xE9cnica Extra\xEDda de Flyer / Imagen:
\u2022 ` + specs.join("\n\u2022 "));
  }
  if (parts.length > 0) return parts.join("\n\n");
  return fallbackText || "[Publicaci\xF3n Comercial Inmobiliaria desde Imagen / Flyer]";
}
function extractFallbackDataFromText(text2) {
  const clean = text2.toLowerCase().replace(/[\u2060\u200B\u200C\u200D\uFEFF\u00A0]/g, " ");
  let transactionType = "venta";
  const isInvestorPurchase = /\b(?:inversionista|inversionistas|para inversi[oó]n|para inversion|rentando|est[eé] rentando|est[eé]n rentando|ojal[aá] rentando|ya rentando|generando renta|produciendo renta|con renta activa|para compra|compro|compra ya|busco para compra)\b/i.test(clean);
  const hasPermutaSignals = /\b(?:permuto|permuta|permutas|permutamos|se permuta|recibo menor valor|recibo inmueble|recibo vehículo|recibo vehiculo|pelo a pelo|encime|parte de pago)\b/i.test(clean);
  const hasRentSignals = !isInvestorPurchase && (/\b(?:arriendo|arriendos|arrendar|arrendamos|se arrienda|arriendan|alquilo|alquilar|alquilamos|se alquila|alquiler|alquileres|rento|rentar|se renta|canon|canones|cánones|amoblado|amoblada|sin amoblar|arrendatario|arrendador|inquilino)\b/i.test(clean) || /(?:incluida|con|\+|más|mas)\s*(?:administraci[oó]n|admon)/i.test(clean) || /(?:administraci[oó]n|admon)\s*(?:incluida|adicional)/i.test(clean) || /valor arriendo/i.test(clean));
  if (hasPermutaSignals) {
    transactionType = clean.includes("venta") || isInvestorPurchase ? "venta_permuta" : "permuta";
  } else if (hasRentSignals && (clean.includes("venta") || clean.includes("valor venta")) && (clean.includes("arriendo") || clean.includes("valor arriendo"))) {
    transactionType = "venta_o_arriendo";
  } else if (hasRentSignals && !clean.includes("compro") && !clean.includes("para compra") && !clean.includes("en compra") && !isInvestorPurchase) {
    transactionType = "arriendo";
  } else {
    transactionType = "venta";
  }
  let propertyType = "apartment";
  if (clean.includes("casa") || clean.includes("townhouse")) {
    propertyType = "house";
  } else if (clean.includes("caba\xF1a") || clean.includes("cabana") || clean.includes("caba\xF1as") || clean.includes("cabanas") || clean.includes("cabin")) {
    propertyType = "cabin";
  } else if (clean.includes("local") || clean.includes("locales") || clean.includes("comercial")) {
    propertyType = "commercial";
  } else if (clean.includes("bodega")) {
    propertyType = "warehouse";
  } else if (clean.includes("oficina")) {
    propertyType = "office";
  } else if (clean.includes("lote") || clean.includes("terreno")) {
    propertyType = "land";
  } else if (clean.includes("finca")) {
    propertyType = "farm";
  } else if (clean.includes("apartaestudio") || clean.includes("loft")) {
    propertyType = "loft";
  }
  let price = 0;
  let presupuestoMin = 0;
  let presupuestoMax = 0;
  let rentPrice = 0;
  let adminFee = 0;
  const rangeMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:a|hasta|-)\s*\$?(\d+(?:[.,]\d+)?)\s*(millones|millón|mll|mlls|mm|m)\b/i);
  if (rangeMatch) {
    let minVal = parseFloat(rangeMatch[1].replace(",", "."));
    let maxVal = parseFloat(rangeMatch[2].replace(",", "."));
    if (minVal > 1e3) minVal /= 1e3;
    if (maxVal > 1e3) maxVal /= 1e3;
    presupuestoMin = Math.round(minVal * 1e6);
    presupuestoMax = Math.round(maxVal * 1e6);
    price = presupuestoMax;
    if (transactionType === "arriendo") {
      rentPrice = presupuestoMax;
    }
  }
  if (price === 0) {
    const canonMatch = clean.match(/(?:canon|arriendo|renta|alquiler)(?:\s*(?:más|\+|con)?\s*administraci[oó]n\s*incluida)?(?:\s*total\s*mes)?\s*:?\s*\$?\s*([\d.,\s]+?)(?:-|\s|$|\n)/i);
    if (canonMatch) {
      let rawCNum = parseFloat(canonMatch[1].replace(/[.,\s]/g, ""));
      if (!isNaN(rawCNum) && rawCNum > 3e5 && !isPhoneNumberNotPrice(rawCNum, text2)) {
        rentPrice = rawCNum;
        price = rawCNum;
        presupuestoMax = rawCNum;
      }
    }
  }
  if (price === 0) {
    const millonMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*(mil\s*millones?|millon|millones|millón|mill|mm|m)\b/i);
    if (millonMatch) {
      let val = parseFloat(millonMatch[1].replace(",", "."));
      const unit = millonMatch[2].toLowerCase();
      let mult = 1e6;
      if (unit.includes("mil millon")) mult = 1e9;
      else if (unit === "mm" && val < 100 && transactionType !== "arriendo" && val > 15) mult = 1e7;
      else mult = 1e6;
      const computed = Math.round(val * mult);
      if (!isPhoneNumberNotPrice(computed, text2)) {
        price = computed;
        presupuestoMax = computed;
        if (transactionType === "arriendo") rentPrice = computed;
      }
    }
  }
  if (price === 0) {
    const rawPriceMatch = text2.match(/\$?\s*(\d{1,3}(?:[\.,]\d{3}){1,3})/);
    if (rawPriceMatch) {
      const parsed = parseFloat(rawPriceMatch[1].replace(/[\.,]/g, ""));
      if (!isPhoneNumberNotPrice(parsed, text2) && parsed >= 3e5) {
        price = parsed;
        presupuestoMax = parsed;
        if (transactionType === "arriendo") rentPrice = parsed;
      }
    }
  }
  const adminMatch = clean.match(/(?:administración|administracion|admin|admon)\s*:?\s*(?:aprox\.?)?\s*\$?\s*([\d.,\s]+?)(?:-|\s|\(|$|\n)/i);
  if (adminMatch) {
    const rawANum = parseFloat(adminMatch[1].replace(/[.,\s]/g, ""));
    if (!isNaN(rawANum) && rawANum >= 1e4 && rawANum <= 3e7 && !isPhoneNumberNotPrice(rawANum, text2)) {
      adminFee = rawANum;
    }
  }
  let area = 0;
  const areaMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|mts2|mts|metros|m²)/i);
  if (areaMatch) {
    area = parseFloat(areaMatch[1].replace(",", "."));
  }
  let bedrooms = 0;
  const bedMatch = clean.match(/(\d+)\s*(?:alcoba|alcobas|hab|habs|habitacion|habitaciones|dormitorio|dormitorios)/i) || clean.match(/(\d+)\s*-\s*(\d+)\s*(?:alcoba|alcobas|hab|habs)/i);
  if (bedMatch) {
    bedrooms = parseInt(bedMatch[1], 10);
  }
  let bathrooms = 0;
  const bathMatch = clean.match(/(\d+)\s*(?:baño|baños|bano|banos|wc)/i);
  if (bathMatch) {
    bathrooms = parseInt(bathMatch[1], 10);
  }
  let garages = 0;
  let garageType = null;
  const garMatch = clean.match(/(\d+)\s*(?:parqueo|parqueos|parqueadero|parqueaderos|garaje|garajes|ptero)/i) || clean.match(/(?:parqueo|parqueos|parqueadero|parqueaderos|garaje|garajes|ptero)\s*:?\s*(\d+)/i);
  if (garMatch) {
    garages = parseInt(garMatch[1], 10);
  }
  if (clean.includes("en linea") || clean.includes("en l\xEDnea") || clean.includes("lineal")) {
    garageType = "lineal";
  } else if (clean.includes("independiente") || clean.includes("independientes")) {
    garageType = "independiente";
  }
  let antiguedadAnos = null;
  const ageMatch = clean.match(/(?:edificio\s*(?:de|más\s*de|mas\s*de)?|antigüedad|antiguedad|tiene)\s*(\d{1,2})\s*años/i) || clean.match(/(\d{1,2})\s*años\s*(?:de\s*)?(?:construido|antigüedad)/i);
  if (ageMatch) {
    antiguedadAnos = parseInt(ageMatch[1], 10);
  }
  let hasBalcony = null;
  let hasTerrace = null;
  if (clean.includes("no tiene balc\xF3n") || clean.includes("no tiene balcon") || clean.includes("sin balc\xF3n") || clean.includes("sin balcon")) {
    hasBalcony = false;
  } else if (clean.includes("balc\xF3n") || clean.includes("balcon")) {
    hasBalcony = true;
  }
  if (clean.includes("no tiene terraza") || clean.includes("sin terraza")) {
    hasTerrace = false;
  } else if (clean.includes("terraza") || clean.includes("terrazas")) {
    hasTerrace = true;
  }
  const hasStorage = clean.includes("dep\xF3sito") || clean.includes("deposito") || clean.includes("cuarto util") || clean.includes("bodega");
  const hasElevator = clean.includes("ascensor");
  let kitchenType = null;
  if (clean.includes("cocina cerrada")) kitchenType = "Cerrada";
  else if (clean.includes("cocina abierta")) kitchenType = "Abierta";
  else if (clean.includes("cocina tipo isla") || clean.includes("isla")) kitchenType = "Abierta tipo Isla";
  const hasServiceRoom = clean.includes("cbs") || clean.includes("cuarto de servicio") || clean.includes("alcoba de servicio") || clean.includes("cuarto y ba\xF1o de servicio") || clean.includes("cuarto y bano de servicio") || clean.includes("cuarto de empleada") || clean.includes("alcoba para el servicio");
  let floorType = null;
  if (clean.includes("madera maciza") || clean.includes("madera natural") || clean.includes("granadillo")) floorType = "Madera Maciza";
  else if (clean.includes("piso en madera") || clean.includes("pisos en madera") || clean.includes("piso de madera") || clean.includes("pisos de madera")) floorType = "Madera";
  else if (clean.includes("laminado") || clean.includes("piso laminado")) floorType = "Laminado";
  else if (clean.includes("porcelanato")) floorType = "Porcelanato";
  else if (clean.includes("marmol") || clean.includes("m\xE1rmol")) floorType = "M\xE1rmol";
  else if (clean.includes("ceramica") || clean.includes("cer\xE1mica")) floorType = "Cer\xE1mica";
  let sunlightOrientation = null;
  if (clean.includes("luz de la ma\xF1ana") || clean.includes("luz de manana") || clean.includes("sol de ma\xF1ana") || clean.includes("sol de manana")) sunlightOrientation = "Sol de Ma\xF1ana";
  else if (clean.includes("sol de tarde") || clean.includes("luz de tarde")) sunlightOrientation = "Sol de Tarde";
  else if (clean.includes("exterior iluminado") || clean.includes("super iluminado") || clean.includes("muy iluminado")) sunlightOrientation = "Exterior Iluminado";
  const hasPowerPlant = clean.includes("planta electrica") || clean.includes("planta el\xE9ctrica") || clean.includes("suplencia total") || clean.includes("planta total") || clean.includes("planta de suplencia");
  const hasVisitorParking = clean.includes("parqueadero de visitantes") || clean.includes("parqueadero para visitantes") || clean.includes("parqueaderos de visitantes") || clean.includes("parqueo visitantes");
  const hasHeating = clean.includes("calentador de paso") || clean.includes("calentador a gas") || clean.includes("caldera");
  let city = "";
  if (clean.includes("bogota") || clean.includes("bogot\xE1") || clean.includes("cedritos") || clean.includes("chico") || clean.includes("chic\xF3") || clean.includes("rosales") || clean.includes("usaquen") || clean.includes("usaqu\xE9n") || clean.includes("santa barbara") || clean.includes("santa b\xE1rbara") || clean.includes("chapinero")) {
    city = "Bogot\xE1, D.C.";
  } else if (clean.includes("valledupar") || clean.includes("cesar")) {
    city = "Valledupar";
  } else if (clean.includes("bucaramanga") || clean.includes("floridablanca") || clean.includes("piedecuesta") || clean.includes("giron") || clean.includes("gir\xF3n") || clean.includes("santander") || clean.includes("ruitoque")) {
    city = clean.includes("floridablanca") ? "Floridablanca" : clean.includes("piedecuesta") ? "Piedecuesta" : clean.includes("giron") || clean.includes("gir\xF3n") ? "Gir\xF3n" : "Bucaramanga";
  } else if (clean.includes("cartagena") || clean.includes("bocagrande") || clean.includes("castillogrande") || clean.includes("manga") || clean.includes("crespo") || clean.includes("laguito")) {
    city = "Cartagena";
  } else if (clean.includes("santa marta") || clean.includes("rodadero") || clean.includes("bello horizonte") || clean.includes("pozos colorados")) {
    city = "Santa Marta";
  } else if (clean.includes("pereira") || clean.includes("dosquebradas") || clean.includes("cerritos") || clean.includes("pinares")) {
    city = clean.includes("dosquebradas") ? "Dosquebradas" : "Pereira";
  } else if (clean.includes("manizales") || clean.includes("villamaria")) {
    city = clean.includes("villamaria") ? "Villamar\xEDa" : "Manizales";
  } else if (clean.includes("armenia") || clean.includes("calarca") || clean.includes("quimbaya")) {
    city = clean.includes("calarca") ? "Calarc\xE1" : clean.includes("quimbaya") ? "Quimbaya" : "Armenia";
  } else if (clean.includes("ibague") || clean.includes("ibagu\xE9") || clean.includes("melgar") || clean.includes("carmen de apicala")) {
    city = clean.includes("melgar") ? "Melgar" : clean.includes("carmen de apicala") ? "Carmen de Apical\xE1" : "Ibagu\xE9";
  } else if (clean.includes("villavicencio") || clean.includes("acacias")) {
    city = clean.includes("acacias") ? "Acac\xEDas" : "Villavicencio";
  } else if (clean.includes("cali") || clean.includes("melendez") || clean.includes("jardin") || clean.includes("pacifica") || clean.includes("jamundi") || clean.includes("pance") || clean.includes("valle del lili")) {
    city = clean.includes("jamundi") || clean.includes("jamund\xED") ? "Jamund\xED" : "Cali";
  } else if (clean.includes("medellin") || clean.includes("poblado") || clean.includes("laureles") || clean.includes("envigado") || clean.includes("sabaneta") || clean.includes("rionegro") || clean.includes("la ceja")) {
    city = clean.includes("envigado") ? "Envigado" : clean.includes("sabaneta") ? "Sabaneta" : clean.includes("rionegro") ? "Rionegro" : clean.includes("la ceja") ? "La Ceja" : "Medell\xEDn";
  } else if (clean.includes("chia") || clean.includes("ch\xEDa")) {
    city = "Ch\xEDa";
  } else if (clean.includes("cajica") || clean.includes("cajic\xE1")) {
    city = "Cajic\xE1";
  } else if (clean.includes("cota")) {
    city = "Cota";
  } else if (clean.includes("sopo") || clean.includes("sop\xF3")) {
    city = "Sop\xF3";
  } else if (clean.includes("la calera")) {
    city = "La Calera";
  } else if (clean.includes("zipaquira") || clean.includes("zipaquir\xE1")) {
    city = "Zipaquir\xE1";
  } else if (clean.includes("funza")) {
    city = "Funza";
  } else if (clean.includes("mosquera")) {
    city = "Mosquera";
  } else if (clean.includes("madrid")) {
    city = "Madrid";
  } else if (clean.includes("fusagasuga") || clean.includes("fusagasug\xE1")) {
    city = "Fusagasug\xE1";
  } else if (clean.includes("girardot")) {
    city = "Girardot";
  }
  let zone = "";
  if (clean.includes("villa magdala")) zone = "Villa Magdala";
  else if (clean.includes("chico reservado")) zone = "Chic\xF3 Reservado";
  else if (clean.includes("chico norte")) zone = "Chic\xF3 Norte";
  else if (clean.includes("chico navarra")) zone = "Chic\xF3 Navarra";
  else if (clean.includes("rincon del chico")) zone = "Rinc\xF3n del Chic\xF3";
  else if (clean.includes("chico") || clean.includes("chic\xF3")) zone = "Chic\xF3";
  else if (clean.includes("santa barbara central") || clean.includes("santa b\xE1rbara central") || clean.includes("santa barbara (central)")) zone = "Santa B\xE1rbara Central";
  else if (clean.includes("santa barbara occidental") || clean.includes("santa b\xE1rbara occidental")) zone = "Santa B\xE1rbara Occidental";
  else if (clean.includes("santa barbara oriental") || clean.includes("santa b\xE1rbara oriental")) zone = "Santa B\xE1rbara Oriental";
  else if (clean.includes("santa barbara alta") || clean.includes("santa b\xE1rbara alta")) zone = "Santa B\xE1rbara Alta";
  else if (clean.includes("santa barbara") || clean.includes("santa b\xE1rbara")) zone = "Santa B\xE1rbara";
  else if (clean.includes("la cabrera")) zone = "La Cabrera";
  else if (clean.includes("rosales") || clean.includes("los rosales")) zone = "Rosales";
  else if (clean.includes("el nogal") || clean.includes("nogal")) zone = "El Nogal";
  else if (clean.includes("emaus") || clean.includes("ema\xFAs")) zone = "Ema\xFAs";
  else if (clean.includes("colina campestre") || clean.includes("colina")) zone = "Colina Campestre";
  else if (clean.includes("ciudad melendez") || clean.includes("ciudad mel\xE9ndez")) zone = "Ciudad Mel\xE9ndez";
  else if (clean.includes("ciudad jardin") || clean.includes("ciudad jard\xEDn")) zone = "Ciudad Jard\xEDn";
  else if (clean.includes("nuevo country")) zone = "Nuevo Country";
  else if (clean.includes("niza norte")) zone = "Niza Norte";
  else if (clean.includes("niza")) zone = "Niza";
  else if (clean.includes("bella suiza")) zone = "Bella Suiza";
  else if (clean.includes("lisboa")) zone = "Lisboa";
  else if (clean.includes("cedritos")) zone = "Cedritos";
  else if (clean.includes("usaquen") || clean.includes("usaqu\xE9n")) zone = "Usaqu\xE9n";
  else if (clean.includes("pasadena")) zone = "Pasadena";
  else if (clean.includes("batan") || clean.includes("bat\xE1n")) zone = "Bat\xE1n";
  else if (clean.includes("alhambra")) zone = "Alhambra";
  else if (clean.includes("pontevedra")) zone = "Pontevedra";
  return {
    propertyType,
    transactionType,
    tipoInmuebleDeseado: propertyType,
    tipoNegocioDeseado: transactionType,
    price,
    presupuestoMin: presupuestoMin > 0 ? presupuestoMin : null,
    presupuestoMax: presupuestoMax > 0 ? presupuestoMax : price,
    rentPrice: rentPrice > 0 ? rentPrice : null,
    adminFee: adminFee > 0 ? adminFee : null,
    area,
    bedrooms,
    bathrooms,
    garages,
    garageType,
    antiguedadAnos,
    hasBalcony,
    hasTerrace,
    hasStorage,
    hasElevator,
    kitchenType,
    hasServiceRoom,
    floorType,
    sunlightOrientation,
    hasPowerPlant,
    hasVisitorParking,
    hasHeating,
    city,
    ciudadDeseada: city,
    zone,
    zonaDeseada: zone
  };
}
async function enrichLexiconFromText(rawText) {
  if (!rawText || rawText.length < 15) return;
  const clean = rawText.toLowerCase();
  const patterns = [
    { match: /\b(cbs|cuarto\s+y\s+ba[ñn]o\s+de\s+servicio|alcoba\s+(?:para\s+el\s+)?servicio|cuarto\s+de\s+empleada)\b/i, cat: "espacio", can: "cuarto_bano_servicio" },
    { match: /\b(cocina\s+(?:cerrada|abierta|tipo\s+isla|americana))\b/i, cat: "espacio", can: "tipologia_cocina" },
    { match: /\b(pisos?\s*(?:en\s*)?(?:madera\s+maciza|madera|laminado|porcelanato|m[aá]rmol|cer[aá]mica))\b/i, cat: "acabado", can: "tipo_piso" },
    { match: /\b(luz\s+de\s+(?:la\s+)?ma[ñn]ana|sol\s+de\s+(?:la\s+)?tarde|exterior\s+iluminado)\b/i, cat: "ambiente", can: "orientacion_asoleacion" },
    { match: /\b(planta\s+el[eé]ctrica|suplencia\s+total|planta\s+total)\b/i, cat: "infraestructura", can: "planta_electrica" },
    { match: /\b(parqueadero\s*(?:para\s*)?visitantes?|parqueo\s+visitantes?)\b/i, cat: "amenidad", can: "parqueadero_visitantes" },
    { match: /\b(star\s+de\s+tv|hall\s+de\s+alcobas|estar\s+de\s+tv)\b/i, cat: "espacio", can: "estar_television" },
    { match: /\b(calentador\s+de\s+paso|caldera\s+central)\b/i, cat: "equipamiento", can: "calentador_agua" },
    { match: /\b(chimenea\s+(?:tradicional|a\s+gas|ecol[oó]gica))\b/i, cat: "equipamiento", can: "chimenea" }
  ];
  try {
    const db = await getDb();
    if (!db) return;
    for (const p of patterns) {
      const m = clean.match(p.match);
      if (m && m[1]) {
        const term = m[1].toLowerCase().trim();
        await db.insert(inmobiliarioLexicon).values({
          terminoColoquial: term,
          categoria: p.cat,
          conceptoCanonico: p.can,
          frecuenciaUso: 1,
          origen: "ia_autodescubierto"
        }).onConflictDoUpdate({
          target: inmobiliarioLexicon.terminoColoquial,
          set: {
            frecuenciaUso: sql3`${inmobiliarioLexicon.frecuenciaUso} + 1`,
            updatedAt: /* @__PURE__ */ new Date()
          }
        });
      }
    }
  } catch (e) {
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
    const cleanJid2 = cleanSessionJid(userId);
    const muteJid = `mute:${cleanJid2}`;
    if (!isMuted) {
      await db.delete(pendingSessions).where(eq4(pendingSessions.jid, muteJid));
      console.log(`[JanIA-Mute] Sesi\xF3n ${cleanJid2} desmarcada (eliminada de BD)`);
      return;
    }
    const data = { isMuted: true, mutedAt: (/* @__PURE__ */ new Date()).toISOString() };
    await db.insert(pendingSessions).values({
      jid: muteJid,
      sessionData: data,
      updatedAt: /* @__PURE__ */ new Date()
    }).onConflictDoUpdate({
      target: pendingSessions.jid,
      set: {
        sessionData: data,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    console.log(`[JanIA-Mute] Sesi\xF3n ${cleanJid2} marcada como isMuted = true en BD`);
  } catch (err) {
    console.error("[Database] Error muting session:", err);
  }
}
async function isSessionMuted(userId) {
  try {
    const db = await getDb();
    if (!db) return false;
    const cleanJid2 = cleanSessionJid(userId);
    const [existing] = await db.select().from(pendingSessions).where(eq4(pendingSessions.jid, `mute:${cleanJid2}`)).limit(1);
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
    const cleanJid2 = cleanSessionJid(userId);
    const [session] = await db.select().from(pendingSessions).where(eq4(pendingSessions.jid, cleanJid2)).limit(1);
    if (!session) return null;
    return session.sessionData;
  } catch (err) {
    console.error("[Database] Error getting pending session:", err);
    return null;
  }
}
async function deletePendingSession(userId) {
  try {
    const db = await getDb();
    if (!db) return;
    const cleanJid2 = cleanSessionJid(userId);
    await db.delete(pendingSessions).where(eq4(pendingSessions.jid, cleanJid2));
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
      const [u] = await db.select().from(users).where(eq4(users.phone, rawPhone)).limit(1);
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
    const recentMsgs = await db.select({ id: messages.id }).from(messages).innerJoin(conversations, eq4(messages.conversationId, conversations.id)).where(
      and2(
        eq4(conversations.sessionId, userId),
        eq4(messages.role, "janIA"),
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
    }).from(messages).innerJoin(conversations, eq4(messages.conversationId, conversations.id)).where(
      and2(
        eq4(conversations.sessionId, userId),
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
function sanitizeGeoString(val) {
  if (!val || typeof val !== "string") return "";
  let clean = val.trim();
  clean = clean.split(/\(|\n|Nota:|estimado|según/i)[0].trim();
  clean = clean.replace(/[\.\,\;\:]+$/, "").trim();
  if (clean.length > 60) {
    clean = clean.substring(0, 60).trim();
  }
  return clean;
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
  const nowMs = Date.now();
  if (cachedLiveStatsText && nowMs - cachedLiveStatsTime < 3e5) {
    return cachedLiveStatsText;
  }
  try {
    const db = await getDb();
    if (!db) return cachedLiveStatsText || "";
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("LiveStats DB query timeout")), 5e3);
    });
    const [
      [propCount],
      [reqCount],
      [matchCount],
      [propHoy],
      [reqHoy],
      [matchHoy]
    ] = await Promise.race([
      Promise.all([
        db.select({ total: sql3`count(*)::int` }).from(properties),
        db.select({ total: sql3`count(*)::int` }).from(requirements),
        db.select({ total: sql3`count(*)::int` }).from(propertyMatches),
        db.select({ total: sql3`count(*)::int` }).from(properties).where(gte(properties.createdAt, today)),
        db.select({ total: sql3`count(*)::int` }).from(requirements).where(gte(requirements.createdAt, today)),
        db.select({ total: sql3`count(*)::int` }).from(propertyMatches).where(gte(propertyMatches.createdAt, today))
      ]),
      timeoutPromise
    ]);
    if (timer) clearTimeout(timer);
    cachedLiveStatsTime = nowMs;
    const now = (/* @__PURE__ */ new Date()).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" });
    cachedLiveStatsText = `
## \u{1F4CA} ESTAD\xCDSTICAS EN TIEMPO REAL DE VECY NETWORK (Actualizado: ${now} hora Colombia)
Esta informaci\xF3n es EXACTA y proviene directamente de la base de datos en este preciso instante. \xDAsala cuando alguien pregunte cu\xE1ntos inmuebles, requerimientos o coincidencias tenemos:

| Categor\xEDa | Total Hist\xF3rico | Nuevos Hoy |
|-----------|----------------|------------|
| \u{1F3E2} Inmuebles publicados | **${propCount?.total ?? 0}** | ${propHoy?.total ?? 0} |
| \u{1F4CB} Requerimientos de b\xFAsqueda | **${reqCount?.total ?? 0}** | ${reqHoy?.total ?? 0} |
| \u{1F3AF} Coincidencias (Matches) detectadas | **${matchCount?.total ?? 0}** | ${matchHoy?.total ?? 0} |

Si alguien te pregunta por estos n\xFAmeros, responde CON PRECISI\xD3N usando exactamente los datos de esta tabla. No inventes, no estimes. Estos son los datos reales del sistema VECY en este momento.`;
    cachedLiveStatsTime = nowMs;
    return cachedLiveStatsText;
  } catch (err) {
    console.warn("[JanIA-LiveStats] No se pudo obtener estad\xEDsticas en tiempo real:", err);
    return cachedLiveStatsText || "";
  }
}
function buildSystemPrompt(groupJid) {
  const cacheKey = groupJid || "web";
  if (promptCache[cacheKey]) {
    return promptCache[cacheKey];
  }
  try {
    const baseDir = path5.resolve(process.cwd(), "server/_core/prompts");
    const basePrompt = fs5.readFileSync(path5.join(baseDir, "base.md"), "utf-8");
    let specificPrompt = "";
    if (groupJid === "120363260108880069@g.us") {
      specificPrompt = fs5.readFileSync(path5.join(baseDir, "grupos/VECY_INMUEBLES_NETWORK.md"), "utf-8");
    } else if (groupJid === "120363417740040773@g.us") {
      const legalPrompt = fs5.readFileSync(path5.join(baseDir, "grupos/VECY_SOPORTE_LEGAL_TRIBUTARIO_Y_AVALUOS.md"), "utf-8");
      specificPrompt = legalPrompt;
    } else if (groupJid === "120363403507276533@g.us") {
      specificPrompt = fs5.readFileSync(path5.join(baseDir, "grupos/PROYECTO_Vecy Network.md"), "utf-8");
    } else if (groupJid && (groupJid.endsWith("@g.us") || groupJid.includes("@us"))) {
      specificPrompt = fs5.readFileSync(path5.join(baseDir, "grupos/VECY_INMUEBLES_NETWORK.md"), "utf-8");
    } else {
      specificPrompt = fs5.readFileSync(path5.join(baseDir, "web/web_console.md"), "utf-8");
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
        const [su] = await db.select().from(users).where(eq4(users.phone, savedRawPhone)).limit(1);
        if (su && su.name && su.name.trim() !== "") {
          savedUserName = su.name;
        }
        const [mu] = await db.select().from(users).where(eq4(users.phone, matchedRawPhone)).limit(1);
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
    const adminPhone = "573192919978";
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
  return {
    response: "",
    mentions: [],
    extraDMs,
    sendReputationHook: matches.length > 0
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
    venta_o_arriendo: "VENTA O ARRIENDO",
    arriendo_temporal: "ARRIENDO TEMPORAL",
    arriendo_con_opcion_de_compra: "ARRIENDO CON OPCI\xD3N DE COMPRA",
    permuta: "PERMUTA",
    venta_permuta: "VENTA / PERMUTA",
    aporte: "APORTE"
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
      const [u] = await db.select().from(users).where(eq4(users.phone, phone)).limit(1);
      if (u && u.name && u.name.trim() !== "") {
        nameToUse = u.name;
      }
    }
  } catch (e) {
    console.warn("[JanIA-Greeting] Error buscando nombre de usuario para saludo:", e);
  }
  const firstName = extractFirstName(nameToUse);
  if (alreadyGreeted) {
    return firstName ? `Mira ${firstName}` : `Mira`;
  } else {
    return firstName ? `${salutation} ${firstName}` : `${salutation}`;
  }
}
function esMensajeSpamOBasura(text2) {
  if (!text2 || text2.trim() === "") return { isSpam: false, reason: "" };
  const n = text2.toLowerCase();
  if (n.includes("zoom.us") || n.includes("meet.google.com") || n.includes("teams.microsoft.com") || n.includes("webinar") || n.includes("masterclass") || n.includes("capacitacion") || n.includes("capacitaci\xF3n") || n.includes("seminario") || n.includes("taller de ventas") || n.includes("curso de") || n.includes("congreso de") || n.includes("evento inmobiliario") || n.includes("inmoverso")) {
    return { isSpam: true, reason: "Invitaci\xF3n a evento, Zoom, Meet, webinar o masterclass externa." };
  }
  if (n.includes("coaching") || n.includes("red de mercadeo") || n.includes("multinivel") || n.includes("gana dinero desde casa") || n.includes("servicio de marketing") || n.includes("agencia de publicidad") || n.includes("software inmobiliario") || n.includes("te regalo una guia") || n.includes("te regalo un ebook")) {
    return { isSpam: true, reason: "Publicidad de terceros, marketing no predial o coaching." };
  }
  if (n.includes("vota por") || n.includes("partido politico") || n.includes("partido pol\xEDtico") || n.includes("candidato") || n.includes("elecciones") || n.includes("cadena de oracion") || n.includes("cadena de oraci\xF3n") || n.includes("comparte esta cadena")) {
    return { isSpam: true, reason: "Contenido pol\xEDtico, ideol\xF3gico o cadenas de spam." };
  }
  return { isSpam: false, reason: "" };
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
function evaluateMultiItemHeuristics(text2) {
  if (!text2 || text2.length < 100) return { isMultiItem: false, score: 0, signals: [] };
  const signals = [];
  const h1HeaderMatches = text2.match(/(?:[⬆️🏬🚨📌✨⭐👉1️⃣2️⃣3️⃣•]+|(?:\(🙏🏻\))|(?:ATL)|(?:\b(?:VENTA|ARRIENDO|BUSCO|SE VENDE|SE ARRIENDA|COMPRO)\b))/gi) || [];
  const h1RepeatedHeaders = h1HeaderMatches.length >= 3;
  if (h1RepeatedHeaders) signals.push("H1: Encabezados o emojis repetidos (3+)");
  let h2NumberReset = false;
  const numMatches = Array.from(text2.matchAll(/(?:^|\n)\s*(\d{1,2})[\.\)\️⃣]/g));
  if (numMatches.length >= 2) {
    let maxSeen = 0;
    for (const m of numMatches) {
      const val = parseInt(m[1], 10);
      if (maxSeen >= 5 && val === 1) {
        h2NumberReset = true;
        break;
      }
      if (val > maxSeen) maxSeen = val;
    }
  }
  if (h2NumberReset) signals.push("H2: Reinicio de numeraci\xF3n (1. reaparece tras n\xFAmero > 5)");
  const urlMatches = text2.match(/https?:\/\/[^\s<"']+/gi) || [];
  if (urlMatches.length >= 2) signals.push(`H3: M\xFAltiples URLs p\xFAblicas (${urlMatches.length} enlaces)`);
  const h4PatternMatches = text2.match(/(?:\b(?:VENTA|SE VENDE|VENDO|ARRIENDO|SE ARRIENDA|BUSCO|COMPRO)\b\s+(?:APARTAMENTO|APTO|CASA|BODEGA|OFICINA|LOTE|PENTHOUSE|DÚPLEX|LOCAL))/gi) || [];
  if (h4PatternMatches.length >= 2) signals.push(`H4: Repetici\xF3n de patr\xF3n de negocio+inmueble (${h4PatternMatches.length} veces)`);
  const h5Separators = /(?:\r?\n){1,}\s*(?:_{3,}|-{3,}|={3,}|\*{3,})\s*(?:\r?\n){1,}/.test(text2);
  if (h5Separators) signals.push("H5: Separadores expl\xEDcitos (---/___)");
  const score = signals.length;
  return {
    isMultiItem: score >= 2,
    score,
    signals
  };
}
function splitMultiPropertyMessage(text2) {
  if (!text2 || text2.length < 100) return [text2];
  const evalResult = evaluateMultiItemHeuristics(text2);
  if (!evalResult.isMultiItem) return [text2];
  console.log(`[JanIA-MultiItemDetector] \u2702\uFE0F Evaluaci\xF3n Addendum v9 activa (Score ${evalResult.score}/5): ${evalResult.signals.join(" | ")}`);
  const delimiterSplit = text2.split(/(?:\r?\n){1,}\s*(?:_{3,}|-{3,}|={3,}|\*{3,})\s*(?:\r?\n){1,}/);
  if (delimiterSplit.length >= 2) {
    const validBlocks = delimiterSplit.map((b) => b.trim()).filter((b) => b.length >= 30);
    if (validBlocks.length >= 2) {
      return validBlocks;
    }
  }
  const headerRegex = /(?:^|\r?\n)(?=(?:[^\n]*?\b(?:ATL|VENTA|SE VENDE|VENDO|SE ARRIENDA|ARRIENDO|BUSCO|REQUERIMIENTO|SOLICITO|CLIENTE DIRECTO)\b)|(?:^\s*1[\.\)\️⃣]\s*))/gi;
  const matches = Array.from(text2.matchAll(headerRegex));
  if (matches.length >= 2) {
    const blocks = [];
    for (let i = 0; i < matches.length; i++) {
      const startIdx = matches[i].index || 0;
      const endIdx = i + 1 < matches.length ? matches[i + 1].index || text2.length : text2.length;
      const blockText = text2.substring(startIdx, endIdx).trim();
      if (blockText.length >= 35) {
        blocks.push(blockText);
      }
    }
    if (blocks.length >= 2) {
      return blocks;
    }
  }
  const paragraphs = text2.split(/(?:\r?\n){2,}/);
  if (paragraphs.length >= 3) {
    const blocks = [];
    let currentBlock = "";
    for (const p of paragraphs) {
      const cleanP = p.trim();
      if (!cleanP) continue;
      const isNewProp = /(?:SE VENDE|VENDO|SE ARRIENDA|ARRIENDO|APARTAMENTO|CASA|BUSCO|SOLICITO|ATL)\b/i.test(cleanP) && /\$|\b\d{3,}\b|\bm2\b|\bhab\b|\bbaños\b/i.test(cleanP);
      if (currentBlock && isNewProp) {
        blocks.push(currentBlock.trim());
        currentBlock = cleanP;
      } else {
        currentBlock = currentBlock ? `${currentBlock}

${cleanP}` : cleanP;
      }
    }
    if (currentBlock) blocks.push(currentBlock.trim());
    if (blocks.length >= 2) {
      return blocks;
    }
  }
  return [text2];
}
async function processWhatsAppMessage(text2, userId, userName, hasMedia = false, scrapedData = [], audioUrl, imageBuffer, isGroup = false, pdfBuffer, pdfMimeType, groupJid, groupName) {
  try {
    let isScrapeable2 = function(url) {
      try {
        const hostname = new URL(url).hostname.replace("www.", "").toLowerCase();
        return !SCRAPE_BLOCKLIST.some((blocked) => hostname.includes(blocked));
      } catch {
        return false;
      }
    };
    var isScrapeable = isScrapeable2;
    const isWebUser = userId.startsWith("web-");
    if (text2 && !text2.includes("__is_sub_message__")) {
      const subBlocks = splitMultiPropertyMessage(text2);
      if (subBlocks.length >= 2) {
        console.log(`[JanIA-MultiPropertySplitter] \u{1F680} Ingestando ${subBlocks.length} inmuebles individuales de manera independiente...`);
        let finalResult = { classification: "INMUEBLE", response: "", inserted: true };
        for (const subText of subBlocks) {
          finalResult = await processWhatsAppMessage(
            `${subText}
__is_sub_message__`,
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
            groupName
          );
        }
        return finalResult;
      }
    }
    if (!isWebUser && text2) {
      const checkText = text2.toLowerCase();
      const isSpamOrWebinar = checkText.includes("zoom.us") || checkText.includes("us06web.zoom.us") || checkText.includes("chat.whatsapp.com") || checkText.includes("\xFAnase a nuestra reuni\xF3n") || checkText.includes("unase a nuestra reunion") || checkText.includes("entrenamiento 100% gratuito") || checkText.includes("estrategias en redes sociales") || checkText.includes("como funcionan las ventas") || checkText.includes("invitaci\xF3n al chat en grupo") || checkText.includes("invitacion al chat en grupo") || checkText.includes("unirme al grupo") || checkText.includes("m\xE1ster class") || checkText.includes("masterclass") || checkText.includes("taller gratuito") || checkText.includes("capacitaci\xF3n gratuita") || checkText.includes("capacitacion gratuita");
      if (isSpamOrWebinar && !checkText.includes("vendo") && !checkText.includes("busco") && !checkText.includes("se vende") && !checkText.includes("se arrienda")) {
        console.log(`[JANIA-SPAM-GUARD] \u26D4 Mensaje detectado como SPAM/Webinar/Curso (${checkText.substring(0, 60)}...). Operaci\xF3n silenciosa total, sin guardar en BD ni emoji.`);
        return {
          classification: "VIOLACION_DE_NORMAS",
          response: "",
          dmResponse: "",
          shouldSendDM: false,
          reactionEmoji: void 0,
          inserted: false
        };
      }
    }
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
    const rawUserText = text2;
    const SCRAPE_BLOCKLIST = [
      "wa.me",
      "whatsapp.com",
      "whatsapp.net",
      "facebook.com",
      "fb.com",
      "fb.watch",
      "instagram.com",
      "youtube.com",
      "youtu.be",
      "tiktok.com",
      "twitter.com",
      "x.com",
      "linkedin.com",
      "maps.google.com",
      "photos.app.goo.gl",
      "photos.google.com",
      "drive.google.com",
      "docs.google.com",
      "bit.ly",
      "tinyurl.com",
      "goo.gl"
    ];
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text2.match(urlRegex);
    let jinaExtractedText = "";
    if (urls && urls.length > 0) {
      for (const url of urls) {
        if (!isScrapeable2(url)) {
          console.log(`[Scraper-Bypass] Dominio bloqueado, omitiendo scraping: ${url}`);
          continue;
        }
        let content = await scrapeUrlWithBypass(url);
        if (content) {
          content = content.replace(/!\[.*?\]\(.*?\)/g, "").replace(/^https?:\/\/[^\s]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
          if (content.length > 50) {
            jinaExtractedText += `

[CONTENIDO DE ENLACE WEB EXTRA\xCDDO DE ${url}]:
${content.substring(0, 15e3)}
[FIN CONTENIDO ENLACE]
`;
          }
        }
      }
    }
    if (jinaExtractedText) {
      messageToProcess += jinaExtractedText;
    }
    if (!isWebUser && messageToProcess) {
      const checkText = messageToProcess.toLowerCase();
      const isSpamOrWebinar = checkText.includes("zoom.us") || checkText.includes("us06web.zoom.us") || checkText.includes("chat.whatsapp.com") || checkText.includes("\xFAnase a nuestra reuni\xF3n") || checkText.includes("unase a nuestra reunion") || checkText.includes("entrenamiento 100% gratuito") || checkText.includes("estrategias en redes sociales") || checkText.includes("como funcionan las ventas") || checkText.includes("invitaci\xF3n al chat en grupo") || checkText.includes("invitacion al chat en grupo") || checkText.includes("unirme al grupo") || checkText.includes("m\xE1ster class") || checkText.includes("masterclass") || checkText.includes("taller gratuito") || checkText.includes("capacitaci\xF3n gratuita") || checkText.includes("capacitacion gratuita");
      if (isSpamOrWebinar && !checkText.includes("vendo") && !checkText.includes("busco") && !checkText.includes("se vende") && !checkText.includes("se arrienda")) {
        console.log(`[JANIA-SPAM-GUARD] \u26D4 Mensaje detectado como SPAM/Webinar/Curso (${checkText.substring(0, 60)}...). Operaci\xF3n silenciosa total, sin guardar en BD ni emoji.`);
        return {
          classification: "VIOLACION_DE_NORMAS",
          response: "",
          dmResponse: "",
          shouldSendDM: false,
          reactionEmoji: void 0,
          inserted: false
        };
      }
    }
    if (!isWebUser && !pdfBuffer) {
      const wordCount = (text2.match(/\S+/g) || []).length;
      const emojiPropertyStarters = (text2.match(/(?:🏡|🏠|🏢|🔑|💥|🌷|🌺|🌸|⭐|✨|🔥|🎯|📍)/g) || []).length;
      const hasMultipleStarters = emojiPropertyStarters >= 2 || wordCount > 200;
      if (wordCount > 150 && hasMultipleStarters) {
        console.log(`[CHUNKER] \u{1F4E6} Mensaje largo (${wordCount} palabras, ${emojiPropertyStarters} emojis-inicio). Fragmentando...`);
        const parentUrl = urls && urls.length > 0 ? urls[0] : null;
        const parentPhone = normalizePhoneNumber(userId, text2);
        const emojiSplitPattern = /(?=\n\s*(?:🏡|🏠|🏢|🏗|🏘|🔑|💥|🌷|🌸|🌺|🌻|🌹|⭐|✨|🔥|💫|🎯|📍))/g;
        let rawChunks = text2.split(emojiSplitPattern).map((c) => c.trim()).filter((c) => c.length > 80);
        if (rawChunks.length < 2) {
          rawChunks = text2.split(/\n{3,}/).map((c) => c.trim()).filter((c) => c.length > 80);
        }
        if (rawChunks.length >= 2) {
          console.log(`[CHUNKER] \u2702\uFE0F Fragmentado en ${rawChunks.length} publicaciones independientes.`);
          let firstResult = null;
          for (let idx = 0; idx < rawChunks.length; idx++) {
            const chunk = rawChunks[idx];
            const chunkWords = (chunk.match(/\S+/g) || []).length;
            if (chunkWords < 15) {
              console.log(`[CHUNKER] \u23ED\uFE0F Fragmento ${idx + 1} ignorado (muy corto: ${chunkWords} palabras).`);
              continue;
            }
            let enriched = chunk;
            if (parentPhone && !enriched.includes(parentPhone.replace("+", ""))) {
              enriched += `
\u{1F4DE} ${parentPhone}`;
            }
            if (parentUrl && !enriched.includes(parentUrl)) {
              enriched += `
\u{1F517} ${parentUrl}`;
            }
            console.log(`[CHUNKER] \u{1F504} Procesando fragmento ${idx + 1}/${rawChunks.length}: "${chunk.substring(0, 60)}..."`);
            try {
              const chunkResult = await processWhatsAppMessage(
                enriched,
                userId,
                userName,
                false,
                [],
                void 0,
                imageBuffer,
                isGroup,
                void 0,
                void 0,
                groupJid,
                groupName
              );
              if (chunkResult.inserted) {
                console.log(`[CHUNKER] \u2705 Fragmento ${idx + 1} insertado como ${chunkResult.classification}.`);
              }
              if (!firstResult && chunkResult.classification !== "CONSULTA_GENERAL") {
                firstResult = chunkResult;
              }
            } catch (ce) {
              console.error(`[CHUNKER] \u274C Error fragmento ${idx + 1}:`, ce?.message || ce);
            }
          }
          if (firstResult) return firstResult;
          console.log(`[CHUNKER] \u26A0\uFE0F Ning\xFAn fragmento v\xE1lido. Procesando como mensaje \xFAnico.`);
        }
      }
    }
    let isFromAudio = false;
    const cleanText = text2.toLowerCase().trim();
    const isMediaOrAudio = hasMedia || !!audioUrl || !!imageBuffer || !!pdfBuffer;
    if (!isWebUser && !isMediaOrAudio && cleanText.length > 15) {
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
            groupRulesName = process.env.GROUP_ZERO_NAME || 'PROYECTO "Vecy Network"';
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
          reactionEmoji: "\u{1F6AB}"
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
    if ((!messageToProcess || messageToProcess.trim() === "") && imageBuffer) {
      messageToProcess = "[Publicaci\xF3n de Imagen / Flyer Comercial Inmobiliario sin texto en pie de foto]";
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
    const statsSummary = await getLiveStats();
    if (statsSummary) {
      contextText += `
${statsSummary}`;
    }
    const firstName = extractFirstName(realName) || "colega";
    const bogotaTime = (/* @__PURE__ */ new Date()).toLocaleString("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hour12: false });
    const userGender = senderInfo.adj === "juiciosa" ? "Femenino" : senderInfo.adj === "juicioso" ? "Masculino" : "No Especificado";
    const outsideHours = isWebUser ? false : isOutsideWorkingHours();
    const estadoOperacion = outsideHours ? "fuera_de_horario" : "en_horario";
    const greetingInstruction = `

[SISTEMA - METADATOS DEL MENSAJE (VARIABLES CR\xCDTICAS)]:
- {{hora}}: ${bogotaTime}
- {{canal}}: ${isWebUser ? "Consola Web 24/7" : isGroup ? `Grupo WhatsApp - [${groupName || "Nombre Real del Grupo"}]` : "dm"}
- {{genero}}: ${userGender}
- {{es_nuevo_usuario}}: ${!alreadyGreeted ? "true" : "false"}
- {{estado_operacion}}: ${estadoOperacion}

[SISTEMA - INSTRUCCI\xD3N DE SALUDO Y COMPORTAMIENTO]:
- Ya has saludado al usuario hoy: ${alreadyGreeted ? "S\xCD" : "NO"}.
- Tipo de conversaci\xF3n actual: ${isWebUser ? "CHAT WEB DE LIBRE ALBEDR\xCDO 24/7" : isGroup ? "GRUPO DE WHATSAPP" : "CHAT PRIVADO / DM"}.
- Primer nombre del usuario: "${firstName}".
- REGLAS CR\xCDTICAS DE RESPUESTA:
  * Si "Ya has saludado al usuario hoy" es S\xCD (solo aplica a WhatsApp):
    - \xA1PROHIBIDO SALUDAR! No uses palabras como "Hola", "Buenas tardes", "Qu\xE9 gusto", "Bienvenido", ni variantes de saludo o bienvenida.
  * En CHAT WEB 24/7: Conversa libremente, saluda si es natural o ve directo al tema de forma elocuente y amigable.`;
    contextText += greetingInstruction;
    if (isWebUser) {
      contextText += `

[INSTRUCCI\xD3N MAESTRA - CHAT WEB DE LIBRE ALBEDR\xCDO 24/7]:
Est\xE1s interactuando con el usuario directamente en la CONSOLA WEB de VECY Network.
- Tienes LIBERTAD TOTAL DE RAZONAMIENTO Y PENSAMIENTO (Libre Albedr\xEDo 24/7).
- NUNCA apliques restricciones de grupos de WhatsApp, horarios de oficina ni bloqueos de temas.
- Responde a cualquier inquietud general, jur\xEDdica, de aval\xFAos, c\xE1lculo financiero o conversaci\xF3n inmobiliaria con razonamiento profundo, calidez y elocuencia.
- Si el usuario te env\xEDa un inmueble o requerimiento, extrae los datos para el sistema y dale una respuesta rica, entusiasta y completa confirmando la informaci\xF3n.`;
    }
    if (!isWebUser && !alreadyGreeted && outsideHours && !isGroup) {
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
    const isLegalQuery = (textLower.includes("sucesi\xF3n") || textLower.includes("sucesion") || textLower.includes("herencia") || textLower.includes("divorcio") || textLower.includes("embargo") || textLower.includes("saneamiento") || textLower.includes("compraventa") || textLower.includes("arrendamiento") || textLower.includes("ley 820") || textLower.includes("ley 675") || textLower.includes("no me pago") || textLower.includes("no me pag\xF3") || textLower.includes("robo de comision") || textLower.includes("robo de comisi\xF3n") || textLower.includes("disputa") || textLower.includes("notar\xEDa") || textLower.includes("notaria")) && !textLower.includes("50/50") && !textLower.includes("50-50");
    const isListingOrReq = hasRealEstateTextKeyword(textLower);
    const enableSearch = !isListingOrReq && (isValuationQuery || isLegalQuery || textLower.includes("buscar en google"));
    const history = isGroup || groupJid ? [] : await getRecentChatHistory(userId, 20);
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
      responseFormat: { type: "json_object", schema: janiaResultSchema },
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
      const classMatch = rawContent.match(/"classification"\s*:\s*"([^"]+)"/i);
      const extractedClass = classMatch ? classMatch[1].toUpperCase() : null;
      const responseMatch = rawContent.match(/"response"\s*:\s*"([\s\S]*?)"(?:\s*,\s*"|\s*})/);
      let fallbackText = responseMatch ? responseMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"') : null;
      if (!fallbackText) {
        const truncatedMatch = rawContent.match(/"response"\s*:\s*"([\s\S]*)/);
        if (truncatedMatch) {
          fallbackText = truncatedMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/["\}]+$/, "");
        }
      }
      const inferredClass = extractedClass === "INMUEBLE" || extractedClass === "REQUERIMIENTO" ? extractedClass : "CONSULTA_GENERAL";
      if (fallbackText && fallbackText.trim() !== "") {
        result = {
          classification: inferredClass,
          response: fallbackText.trim(),
          mentions: []
        };
      } else if (rawContent && rawContent.trim() !== "") {
        const cleanContent = rawContent.replace(/"classification"\s*:\s*"[^"]*"/gi, "").replace(/"response"\s*:\s*"/gi, "").replace(/[\{\}\[\]"]/g, "").replace(/classification:\s*\w+,?/gi, "").replace(/response:\s*/gi, "").trim();
        result = {
          classification: inferredClass,
          response: cleanContent || "Hola, he procesado tu consulta inmobiliaria.",
          mentions: []
        };
      } else {
        throw parseErr;
      }
    }
    result.mentions = result.mentions || [];
    if (messageToProcess) {
      const isAmendmentHandled = await handleAmendmentUpdate(userId, messageToProcess);
      if (isAmendmentHandled) {
        console.log(`[JANIA-AMENDMENT] Mensaje procesado como enmienda de 2h para ${userId}. Operando en Modo Fantasma 100% silencioso.`);
        result.inserted = false;
        result.classification = "CONSULTA_GENERAL";
        result.response = "";
        result.dmResponse = "";
        result.shouldSendDM = false;
        result.reactionEmoji = void 0;
        return result;
      }
    }
    if (messageToProcess) {
      const cleanText2 = messageToProcess.toLowerCase();
      const isSpamOrWebinar = cleanText2.includes("zoom.us") || cleanText2.includes("us06web.zoom.us") || cleanText2.includes("chat.whatsapp.com") || cleanText2.includes("\xFAnase a nuestra reuni\xF3n") || cleanText2.includes("unase a nuestra reunion") || cleanText2.includes("entrenamiento 100% gratuito") || cleanText2.includes("estrategias en redes sociales") || cleanText2.includes("como funcionan las ventas") || cleanText2.includes("invitaci\xF3n al chat en grupo") || cleanText2.includes("invitacion al chat en grupo") || cleanText2.includes("unirme al grupo") || cleanText2.includes("m\xE1ster class") || cleanText2.includes("masterclass") || cleanText2.includes("taller gratuito") || cleanText2.includes("capacitaci\xF3n gratuita") || cleanText2.includes("capacitacion gratuita");
      if (isSpamOrWebinar && !cleanText2.includes("vendo") && !cleanText2.includes("busco") && !cleanText2.includes("se vende") && !cleanText2.includes("se arrienda")) {
        console.log(`[JANIA-SPAM-GUARD] \u26D4 Mensaje detectado como SPAM/Webinar/Curso (${cleanText2.substring(0, 50)}...). Operaci\xF3n silenciosa total, sin guardar en BD ni emoji.`);
        result.classification = "VIOLACION_DE_NORMAS";
        result.inserted = false;
        result.response = "";
        result.dmResponse = "";
        result.shouldSendDM = false;
        result.reactionEmoji = void 0;
        return result;
      }
      const isExplicitDemandKeyword = /\b(?:busco|buscamos|se busca|se requiere|requiero|requerimiento|necesito|necesitamos|solicito|solicitamos|compro|para cliente|busca cliente|cliente busca|comprador|arrendatario|en búsqueda|en busqueda)\b/i.test(cleanText2);
      const isExplicitOfferKeyword = /\b(?:ofrezco|ofrecemos|vendo|se vende|se arrienda|en venta|en arriendo|alquilo|alquiler directo|rento|tengo para|disponible|nuevo inmueble|venta directa|arriendo directo|arrendamos|pongo en arriendo)\b/i.test(cleanText2);
      const isSearch = isExplicitDemandKeyword && !isExplicitOfferKeyword;
      const isOffer = isExplicitOfferKeyword && !isExplicitDemandKeyword;
      const hasRealEstateKeyword = hasRealEstateTextKeyword(cleanText2);
      const _extTmp = result.extractedData || {};
      const hasTechnicalSpecs = _extTmp.price && Number(_extTmp.price) > 0 || _extTmp.presupuestoMax && Number(_extTmp.presupuestoMax) > 0 || _extTmp.area && Number(_extTmp.area) > 0 || _extTmp.bedrooms && Number(_extTmp.bedrooms) > 0 || (cleanText2.includes("$") || /\b\d{2,4}\s*(?:m2|mts|millones|mm|mlls)\b/i.test(cleanText2));
      const isChatNoisePhrase = cleanText2.includes("correccion:") || cleanText2.includes("correcci\xF3n:") || cleanText2.includes("fe de erratas") || cleanText2.includes("rectificacion:") || cleanText2.includes("rectificaci\xF3n:") || cleanText2.includes("bajo de precio") || cleanText2.includes("sigue este enlace") || cleanText2.includes("ver el art\xEDculo en whatsapp") || cleanText2.includes("foto por interno") || cleanText2.includes("fotos por interno") || cleanText2.includes("info por interno") || cleanText2.includes("informaci\xF3n por interno") || cleanText2.includes("escribir al interno") || cleanText2.includes("disponible?") || cleanText2.includes("a\xFAn disponible");
      const isShortComment = (isChatNoisePhrase || !hasRealEstateKeyword && !isSearch && !isOffer && (cleanText2.length < 25 || cleanText2.split(/\s+/).length < 4)) && !hasTechnicalSpecs;
      const isGeneralInquiryOrRecommendation = !hasTechnicalSpecs && !isSearch && !isOffer && (cleanText2.includes("alguien maneja") || cleanText2.includes("alguien recomienda") || cleanText2.includes("alguien conoce") || cleanText2.includes("senior living") || cleanText2.includes("alguien tiene contacto") || cleanText2.includes("quien maneja") || cleanText2.includes("qui\xE9n maneja") || cleanText2.includes("quien recomienda") || cleanText2.includes("recomiendan plomero") || cleanText2.includes("recomiendan abogado") || cleanText2.includes("buscando un abogado") || cleanText2.includes("buscando abogado") || cleanText2.includes("algun abogado") || cleanText2.includes("alg\xFAn abogado") || cleanText2.includes("restitucion de inmueble") || cleanText2.includes("restituci\xF3n de inmueble") || cleanText2.includes("daviplata") || cleanText2.includes("nequi") || cleanText2.includes("comprobante de pago") || cleanText2.includes("recomiendan avaluador") || cleanText2.includes("alguien que haga") || cleanText2.includes("contacto de")) && !cleanText2.includes("busco apto") && !cleanText2.includes("busco casa") && !cleanText2.includes("busco bodega") && !cleanText2.includes("presupuesto");
      if (isGeneralInquiryOrRecommendation) {
        console.log(`[JANIA-FILTER] \u26D4 Pregunta de recomendaci\xF3n o servicio general ignorada como Requerimiento/Inmueble: "${cleanText2.substring(0, 50)}..."`);
        result.classification = "CONSULTA_GENERAL";
      } else if (isShortComment) {
        console.log(`[JANIA-FILTER] \u26D4 Mensaje corto o correcci\xF3n de chat omitido (${cleanText2.substring(0, 40)}...). No se procesar\xE1 como propiedad/requerimiento.`);
        result.classification = "CONSULTA_GENERAL";
      } else if (result.classification === "INMUEBLE" && isSearch && !isOffer) {
        console.log("[JANIA-CORRECTION] Cambiando clasificaci\xF3n de INMUEBLE a REQUERIMIENTO basado en heur\xEDstica de texto.");
        result.classification = "REQUERIMIENTO";
      } else if (result.classification === "REQUERIMIENTO" && isOffer && !isSearch) {
        console.log("[JANIA-CORRECTION] Cambiando clasificaci\xF3n de REQUERIMIENTO a INMUEBLE basado en heur\xEDstica de texto (Oferta expl\xEDcita).");
        result.classification = "INMUEBLE";
      } else if ((result.classification === "CONSULTA_GENERAL" || result.classification === "DATOS_INCOMPLETOS" || !result.classification) && (hasRealEstateKeyword || isSearch || isOffer || hasTechnicalSpecs)) {
        if (hasTechnicalSpecs || hasRealEstateKeyword || isSearch || isOffer) {
          if (isSearch && !isOffer) {
            console.log("[JANIA-CORRECTION] Rescatando REQUERIMIENTO desde CONSULTA_GENERAL con datos t\xE9cnicos verificados.");
            result.classification = "REQUERIMIENTO";
          } else if (isOffer || hasRealEstateKeyword) {
            console.log("[JANIA-CORRECTION] Rescatando INMUEBLE desde CONSULTA_GENERAL con datos t\xE9cnicos verificados.");
            result.classification = "INMUEBLE";
          }
        } else {
          console.log("[JANIA-FILTER] No se rescata como Inmueble/Requerimiento por falta de especificaciones prediales suficientes.");
        }
      }
      const hasRealEstateIntent = isSearch || isOffer || hasRealEstateKeyword || hasTechnicalSpecs;
      if ((result.classification === "INMUEBLE" || result.classification === "REQUERIMIENTO") && !hasRealEstateIntent) {
        console.log(`[JANIA-FILTER] \u26D4 Descartando falso positivo de ${result.classification}: Mensaje sin intenci\xF3n predial expl\xEDcita ("${cleanText2.substring(0, 50)}..."). Degenerado a CONSULTA_GENERAL.`);
        result.classification = "CONSULTA_GENERAL";
      }
    }
    const extracted = result.extractedData || {};
    let isRequirement = result.classification === "REQUERIMIENTO";
    let isProperty = result.classification === "INMUEBLE";
    if ((isProperty || isRequirement) && messageToProcess) {
      const fallbackData = extractFallbackDataFromText(messageToProcess);
      if (!extracted.transactionType) extracted.transactionType = fallbackData.transactionType;
      if (!extracted.propertyType) extracted.propertyType = fallbackData.propertyType;
      if (!extracted.price || Number(extracted.price) === 0 || fallbackData.price > 0) {
        extracted.price = fallbackData.price;
      }
      if (!extracted.presupuestoMax || Number(extracted.presupuestoMax) === 0 || fallbackData.price > 0) {
        extracted.presupuestoMax = fallbackData.price;
      }
      if (!extracted.area || Number(extracted.area) === 0) extracted.area = fallbackData.area;
      if (!extracted.bedrooms) extracted.bedrooms = fallbackData.bedrooms;
      if (!extracted.bathrooms) extracted.bathrooms = fallbackData.bathrooms;
      if (!extracted.city && fallbackData.city) extracted.city = fallbackData.city;
      if (!extracted.ciudadDeseada && fallbackData.ciudadDeseada) extracted.ciudadDeseada = fallbackData.ciudadDeseada;
      if (!extracted.zone && fallbackData.zone) extracted.zone = fallbackData.zone;
      if (!extracted.zonaDeseada && fallbackData.zonaDeseada) extracted.zonaDeseada = fallbackData.zonaDeseada;
      result.extractedData = extracted;
    }
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
      const isMissing = false;
    }
    if (isLLMIncomplete) {
      const inferredType = messageToProcess.toLowerCase().includes("vendo") || messageToProcess.toLowerCase().includes("ofrezco") || messageToProcess.toLowerCase().includes("arriendo") || !!extracted?.propertyType ? "PROPERTY" : "REQUIREMENT";
      if (inferredType === "PROPERTY") {
        isProperty = true;
        isRequirement = false;
      } else {
        isProperty = false;
        isRequirement = true;
      }
      if (!isWebUser) {
        result.shouldSendDM = false;
        result.dmResponse = "";
        result.response = "";
      }
    }
    if (isProperty || isRequirement) {
      if (extracted) {
        if (extracted.zone) extracted.zone = sanitizeGeoString(extracted.zone);
        if (extracted.zonaDeseada) extracted.zonaDeseada = sanitizeGeoString(extracted.zonaDeseada);
        if (extracted.city) extracted.city = sanitizeGeoString(extracted.city);
        if (extracted.ciudadDeseada) extracted.ciudadDeseada = sanitizeGeoString(extracted.ciudadDeseada);
      }
      const zoneToValidate = isProperty ? extracted?.zone : extracted?.zonaDeseada || extracted?.zone;
      let isValidGeo = false;
      let geoValidation = null;
      if (zoneToValidate && zoneToValidate.trim() !== "") {
        let inferredCity = extracted?.city || extracted?.ciudadDeseada;
        if (!inferredCity || inferredCity.trim() === "" || inferredCity.toLowerCase() === "na") {
          if (groupName) {
            const nameLower = groupName.toLowerCase();
            if (nameLower.includes("cali")) {
              inferredCity = "Cali";
            } else if (nameLower.includes("medellin") || nameLower.includes("medell\xEDn")) {
              inferredCity = "Medell\xEDn";
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
        if (inferredCity && inferredCity.toLowerCase() !== "na") {
          const divipolaCity = validateCity(inferredCity);
          if (divipolaCity) {
            inferredCity = divipolaCity;
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
        isValidGeo = true;
        if (!result.missingFields) result.missingFields = [];
        if (!result.missingFields.includes("zone")) result.missingFields.push("zone");
      }
      const triGeo = deducirGeografiaTripartita(
        isProperty ? extracted?.zone : extracted?.zonaDeseada || extracted?.zone,
        isProperty ? extracted?.city : extracted?.ciudadDeseada || extracted?.city,
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
    const origenTipo = isGroup || groupJid ? "grupo" : "contacto_directo";
    const origenId = isGroup || groupJid ? groupJid || userId : userId;
    const origenNombre = isGroup || groupJid ? groupName || "Grupo WhatsApp" : userName || realName || "Contacto Directo";
    if (isProperty) {
      const cleanCheckText = (rawUserText || text2 || messageToProcess || "").toLowerCase();
      const groupForTx = (groupName || "").toLowerCase();
      const isGroupRent = groupForTx.includes("arriend") || groupForTx.includes("alquil") || groupForTx.includes("renta");
      const hasPermutaSignals = /\b(?:permuto|permuta|permutas|permutamos|se permuta|recibo menor valor|recibo inmueble|recibo vehículo|recibo vehiculo|pelo a pelo|encime|parte de pago)\b/i.test(cleanCheckText);
      const hasRentSignals = /\b(?:arriendo|arriendos|arrendar|arrendamos|se arrienda|arriendan|alquilo|alquilar|alquilamos|se alquila|alquiler|alquileres|rento|rentar|se renta|renta|rentas|canon|canones|cánones|amoblado|amoblada|sin amoblar|arrendatario|arrendador|inquilino)\b/i.test(cleanCheckText) || /(?:incluida|con|\+|más|mas)\s*(?:administraci[oó]n|admon)/i.test(cleanCheckText) || /(?:administraci[oó]n|admon)\s*(?:incluida|adicional)/i.test(cleanCheckText) || /valor arriendo/i.test(cleanCheckText);
      const hasVentaSignals = /\b(?:vendo|vendemos|se vende|en venta|venta directa|valor venta)\b/i.test(cleanCheckText);
      if (hasPermutaSignals) {
        extracted.transactionType = hasVentaSignals ? "venta_permuta" : "permuta";
      } else if (hasRentSignals && hasVentaSignals) {
        extracted.transactionType = "venta_o_arriendo";
      } else if (hasRentSignals || isGroupRent && !hasVentaSignals) {
        extracted.transactionType = "arriendo";
        if (extracted.price && (!extracted.rentPrice || Number(extracted.rentPrice) <= 0)) {
          extracted.rentPrice = extracted.price;
        }
      } else if (hasVentaSignals) {
        extracted.transactionType = "venta";
      }
      const propertyTitle = extracted.title || `${capitalize(extracted.propertyType || "inmueble")} en ${extracted.zone || "Bogot\xE1"} para ${extracted.transactionType || "venta"}`;
      const spamCheckProp = esMensajeSpamOBasura(cleanCheckText);
      if (spamCheckProp.isSpam) {
        console.log(`[JANIA-SPAM-FILTER] \u26D4 Omitiendo guardado de propiedad en BD (${spamCheckProp.reason}): "${cleanCheckText.substring(0, 50)}..."`);
        result.inserted = false;
        result.classification = "VIOLACION_DE_NORMAS";
        result.reactionEmoji = "\u{1F6AB}";
        return result;
      }
      const isShortCommentText = cleanCheckText.length < 100 && (cleanCheckText.includes("sigue este enlace para ver el art\xEDculo en whatsapp") || cleanCheckText.includes("sigue este enlace") || cleanCheckText.includes("bajo de precio") || cleanCheckText.includes("foto por interno") || cleanCheckText.includes("info por interno") || cleanCheckText.includes("escribir al interno") || cleanCheckText.includes("a\xFAn disponible"));
      const hasZeroSpecs = (!extracted.price || Number(extracted.price) <= 0) && (!extracted.area || Number(extracted.area) <= 0) && cleanCheckText.split(/\s+/).length < 8;
      if (isShortCommentText && hasZeroSpecs) {
        console.log(`[JANIA-FILTER] \u26D4 Omitiendo guardado en BD: "${cleanCheckText.substring(0, 50)}..." es un comentario/seguimiento sin ficha t\xE9cnica.`);
        result.inserted = false;
        result.classification = "CONSULTA_GENERAL";
        return result;
      }
      let externalUrl = void 0;
      if (urls && urls.length > 0) {
        const permitted = urls.find((url) => esDominioPermitido(url));
        if (permitted) {
          externalUrl = permitted;
        }
      }
      const sourceUrl = urls && urls.length > 0 ? urls[0] : void 0;
      const isImageOnlyProp = (!rawUserText || rawUserText.trim() === "" || rawUserText.includes("[Publicaci\xF3n de Imagen")) && !!imageBuffer;
      const effectivePropRawText = isImageOnlyProp ? buildFlyerBreakdownText(extracted, rawUserText || text2) : rawUserText || text2;
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
        fechaExtraccion: /* @__PURE__ */ new Date()
      }, userId, realName, imageBuffer, pdfBuffer, pdfMimeType);
      if (saved) {
        result.inserted = true;
        result.shouldSendDM = false;
        result.dmResponse = "";
        result.response = "";
        result.mentions = [];
        result.extraDMs = [];
        result.sendReputationHook = false;
        const _txProp = (extracted.transactionType || "").toLowerCase();
        const _isPermutaProp = _txProp.includes("permuta") || _txProp === "venta_permuta" || _txProp === "aporte";
        const _isRentProp = _txProp.includes("arriendo") || _txProp === "arriendo_temporal" || _txProp === "arriendo_con_opcion_de_compra" || _txProp === "venta_o_arriendo" || isGroupRent || hasRentSignals;
        result.reactionEmoji = _isPermutaProp ? "\u{1F500}" : _isRentProp ? "\u{1F44C}" : "\u{1F44D}";
        const { executeMatchEngine: executeMatchEngine2 } = await Promise.resolve().then(() => (init_matching(), matching_exports));
        setImmediate(() => {
          executeMatchEngine2(saved.id, null).catch((err) => console.error("Error executing match engine:", err));
        });
      }
    } else if (isRequirement) {
      const cleanCheckReqText = (rawUserText || text2 || messageToProcess || "").toLowerCase();
      const groupForReqTx = (groupName || "").toLowerCase();
      const isGroupReqRent = groupForReqTx.includes("arriend") || groupForReqTx.includes("alquil") || groupForReqTx.includes("renta");
      const isInvestorPurchaseReq = /\b(?:inversionista|inversionistas|para inversi[oó]n|para inversion|rentando|est[eé] rentando|est[eé]n rentando|ojal[aá] rentando|ya rentando|generando renta|produciendo renta|con renta activa|con contrato de arrendamiento|para compra|compro|compra ya|busco para compra)\b/i.test(cleanCheckReqText);
      const hasPermutaReqSignals = /\b(?:permuto|permuta|permutas|permutamos|se permuta|recibo menor valor|recibo inmueble|recibo vehículo|recibo vehiculo|pelo a pelo|encime|parte de pago)\b/i.test(cleanCheckReqText);
      const hasRentReqSignals = !isInvestorPurchaseReq && (/\b(?:arriendo|arriendos|arrendar|arrendamos|se arrienda|arriendan|alquilo|alquilar|alquilamos|se alquila|alquiler|alquileres|rento|rentar|se renta|canon|canones|cánones|amoblado|amoblada|sin amoblar|arrendatario|arrendador|inquilino)\b/i.test(cleanCheckReqText) || /(?:incluida|con|\+|más|mas)\s*(?:administraci[oó]n|admon)/i.test(cleanCheckReqText) || /(?:administraci[oó]n|admon)\s*(?:incluida|adicional)/i.test(cleanCheckReqText) || /valor arriendo/i.test(cleanCheckReqText));
      const hasVentaReqSignals = isInvestorPurchaseReq || /\b(?:compro|comprar|en compra|para compra|para adquisición|adquirir|para comprar)\b/i.test(cleanCheckReqText);
      if (hasPermutaReqSignals) {
        extracted.transactionType = hasVentaReqSignals ? "venta_permuta" : "permuta";
      } else if (hasRentReqSignals && hasVentaReqSignals) {
        extracted.transactionType = "venta_o_arriendo";
      } else if (hasRentReqSignals || isGroupReqRent && !hasVentaReqSignals && !isInvestorPurchaseReq) {
        extracted.transactionType = "arriendo";
      } else {
        extracted.transactionType = "venta";
      }
      const spamCheckReq = esMensajeSpamOBasura(cleanCheckReqText);
      if (spamCheckReq.isSpam) {
        console.log(`[JANIA-SPAM-FILTER] \u26D4 Omitiendo guardado de requerimiento en BD (${spamCheckReq.reason}): "${cleanCheckReqText.substring(0, 50)}..."`);
        result.inserted = false;
        result.classification = "VIOLACION_DE_NORMAS";
        result.reactionEmoji = "\u{1F6AB}";
        return result;
      }
      const isShortCommentReqText = cleanCheckReqText.length < 100 && (cleanCheckReqText.includes("sigue este enlace para ver el art\xEDculo en whatsapp") || cleanCheckReqText.includes("sigue este enlace") || cleanCheckReqText.includes("bajo de precio") || cleanCheckReqText.includes("foto por interno") || cleanCheckReqText.includes("info por interno") || cleanCheckReqText.includes("escribir al interno") || cleanCheckReqText.includes("a\xFAn disponible"));
      const hasZeroReqSpecs = (!extracted.presupuestoMax || Number(extracted.presupuestoMax) <= 0) && (!extracted.price || Number(extracted.price) <= 0) && cleanCheckReqText.split(/\s+/).length < 8;
      if (isShortCommentReqText && hasZeroReqSpecs) {
        console.log(`[JANIA-FILTER] \u26D4 Omitiendo guardado de requerimiento en BD: "${cleanCheckReqText.substring(0, 50)}..." es un comentario sin criterios de b\xFAsqueda.`);
        result.inserted = false;
        result.classification = "CONSULTA_GENERAL";
        return result;
      }
      const reqTitle = extracted.title || `Requerimiento de ${extracted.propertyType || "inmueble"} en ${extracted.zonaDeseada || extracted.zone || "Bogot\xE1"} para ${extracted.transactionType || "venta"}`;
      const sourceUrlReq = urls && urls.length > 0 ? urls[0] : null;
      const isImageOnlyReq = (!messageToProcess || messageToProcess.trim() === "" || messageToProcess.includes("[Publicaci\xF3n de Imagen")) && !!imageBuffer;
      const effectiveReqRawText = isImageOnlyReq ? buildFlyerBreakdownText(extracted, messageToProcess) : messageToProcess;
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
        fechaExtraccion: /* @__PURE__ */ new Date()
      }, userId, realName, imageBuffer, pdfBuffer, pdfMimeType);
      if (saved) {
        result.inserted = true;
        result.shouldSendDM = false;
        result.dmResponse = "";
        result.response = "";
        result.mentions = [];
        result.extraDMs = [];
        result.sendReputationHook = false;
        const _txReq = (extracted.transactionType || extracted.tipoNegocioDeseado || "").toLowerCase();
        const _isPermutaReq = _txReq.includes("permuta") || _txReq === "venta_permuta" || _txReq === "aporte";
        const _isRentReq = _txReq.includes("arriendo") || _txReq === "arriendo_temporal" || _txReq === "arriendo_con_opcion_de_compra" || _txReq === "venta_o_arriendo" || isGroupReqRent || hasRentReqSignals;
        result.reactionEmoji = _isPermutaReq ? "\u{1F504}" : _isRentReq ? "\u270F\uFE0F" : "\u{1F4DD}";
        const { executeMatchEngine: executeMatchEngine2 } = await Promise.resolve().then(() => (init_matching(), matching_exports));
        setImmediate(() => {
          executeMatchEngine2(null, saved.id).catch((err) => console.error("Error executing match engine:", err));
        });
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

Si tienes dudas o prefieres usar mi men\xFA de soporte y b\xFAsqueda de propiedades privado, escr\xEDbeme directamente en nuestra Consola Web:
\u{1F449} https://vecy-network.vercel.app/jania`;
        result.classification = "CONSULTA_GENERAL";
      } else if (isAboutVecy) {
        const isCompetitorQuery = textLower2.includes("ubicapp") || textLower2.includes("samboni") || textLower2.includes("competidor") || textLower2.includes("competencia");
        const groupZeroName = process.env.GROUP_ZERO_NAME || 'PROYECTO "Vecy Network"';
        if (isCompetitorQuery) {
          result.response = `\u{1F44C} *${groupZeroName.toUpperCase()} \u2014 DEBATE Y COMUNIDAD* \u{1F44C}

${greetingPrefix}, detect\xE9 una menci\xF3n a plataformas competidoras o comparativas de servicios. Para mantener este canal enfocado exclusivamente en ofertas y requerimientos, te invito a plantear tus preguntas, comparar beneficios o participar en el debate en nuestro canal oficial **${groupZeroName}**:
\u{1F449} https://chat.whatsapp.com/CSzrKR6Cr56HAieEhAuqyU

\xA1All\xED debatimos abiertamente con total transparencia y profesionalismo! \u{1F91D}\u2728`;
        } else {
          result.response = `\u{1F44C} *${groupZeroName.toUpperCase()} \u2014 CONEXI\xD3N VECY* \u{1F44C}

${greetingPrefix}, veo que tienes dudas o quieres saber m\xE1s sobre el proyecto VECY Network, beneficios, creadores o el plan colaborativo. Te invito a unirte y hacer tus preguntas en nuestro canal oficial **${groupZeroName}**:
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
    if (!result.reactionEmoji) {
      const _txFallback = (extracted?.transactionType || extracted?.tipoNegocioDeseado || "").toLowerCase();
      const _isPermutaFb = _txFallback.includes("permuta") || _txFallback === "venta_permuta" || _txFallback === "aporte";
      const _isRentFb = _txFallback.includes("arriendo") || _txFallback === "arriendo_temporal" || _txFallback === "arriendo_con_opcion_de_compra";
      if (result.classification === "INMUEBLE") {
        result.reactionEmoji = _isPermutaFb ? "\u{1F500}" : _isRentFb ? "\u{1F44C}" : "\u{1F44D}";
      } else if (result.classification === "REQUERIMIENTO") {
        result.reactionEmoji = _isPermutaFb ? "\u{1F504}" : _isRentFb ? "\u270F\uFE0F" : "\u{1F4DD}";
      } else if (result.classification === "DATOS_INCOMPLETOS" || result.classification === "CONSULTA_GENERAL") {
        result.reactionEmoji = "\u2753";
      } else if (result.classification === "VIOLACION_DE_NORMAS") {
        result.reactionEmoji = "\u{1F6AB}";
      }
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
function extractColombianPhoneFromText(text2) {
  if (!text2) return null;
  const clean = text2.replace(/[\u2060\u200B\u200C\u200D\uFEFF\u00A0]/g, " ");
  const waMatch = clean.match(/wa\.me\/(?:57)?(3\d{9})/i);
  if (waMatch) return "57" + waMatch[1];
  const contactMatch = clean.match(/(?:tel[eé]fono|tel|celular|cel|whatsapp|wapp|wa|contacto|llamar|inf|info|informaci[oó]n|asesor|escribir|comunicarse|m[oó]vil)\s*:?\s*(?:\+?57\s*)?(3[\d\s.\-]{8,14})/i);
  if (contactMatch) {
    const digits = contactMatch[1].replace(/\D/g, "");
    if (digits.length === 10 && digits.startsWith("3")) {
      return "57" + digits;
    }
  }
  const genericMatches = clean.matchAll(/(?:\+?57\s*)?(3\d{2}[\s.\-]?\d{3}[\s.\-]?\d{4})\b/g);
  for (const m of genericMatches) {
    const digits = m[1].replace(/\D/g, "");
    if (digits.length === 10 && digits.startsWith("3")) {
      const idx = m.index ?? 0;
      const before = clean.substring(Math.max(0, idx - 15), idx).toLowerCase();
      const after = clean.substring(idx + m[0].length, idx + m[0].length + 15).toLowerCase();
      if (before.includes("$") || before.includes("precio") || before.includes("canon") || before.includes("ppto") || before.includes("presupuesto")) {
        continue;
      }
      if (after.includes("millon") || after.includes("mil") || after.includes("m2") || after.includes("mts") || after.includes("pesos")) {
        continue;
      }
      return "57" + digits;
    }
  }
  return null;
}
function resolveContactPhone(userId, rawText, userName, extractedPhone) {
  const cleanUserId = userId.split(":")[0].split("@")[0];
  const isLid = cleanUserId.length > 13 || cleanUserId.startsWith("1203");
  const phoneFromText = extractColombianPhoneFromText(rawText);
  if (phoneFromText) {
    brokerDirectoryCache.set(cleanUserId, { phone: phoneFromText, name: userName });
    if (userName) brokerDirectoryCache.set(userName, { phone: phoneFromText, name: userName });
    return phoneFromText;
  }
  if (extractedPhone) {
    const cleanExt = extractedPhone.replace(/\D/g, "");
    if (cleanExt.length === 10 && cleanExt.startsWith("3")) {
      const p = "57" + cleanExt;
      brokerDirectoryCache.set(cleanUserId, { phone: p, name: userName });
      return p;
    }
    if (cleanExt.length === 12 && cleanExt.startsWith("573")) {
      brokerDirectoryCache.set(cleanUserId, { phone: cleanExt, name: userName });
      return cleanExt;
    }
  }
  const cached = brokerDirectoryCache.get(cleanUserId) || (userName ? brokerDirectoryCache.get(userName) : null);
  if (cached && cached.phone) {
    return cached.phone;
  }
  if (!isLid && (cleanUserId.startsWith("573") || cleanUserId.startsWith("3"))) {
    const p = cleanUserId.startsWith("3") && cleanUserId.length === 10 ? `57${cleanUserId}` : cleanUserId;
    brokerDirectoryCache.set(cleanUserId, { phone: p, name: userName });
    return p;
  }
  return cleanUserId;
}
async function initBrokerDirectory() {
  try {
    const db = await getDb();
    if (!db) return;
    const knownProps = await db.select({
      phone: properties.idUsuarioWhatsapp,
      name: properties.nombreUsuarioWhatsapp
    }).from(properties);
    const knownReqs = await db.select({
      phone: requirements.idUsuarioWhatsapp,
      name: requirements.nombreUsuarioWhatsapp
    }).from(requirements);
    for (const item of [...knownProps, ...knownReqs]) {
      if (item.phone && (item.phone.startsWith("573") || item.phone.startsWith("3")) && item.phone.length <= 12) {
        const cleanPhone = item.phone.startsWith("3") && item.phone.length === 10 ? `57${item.phone}` : item.phone;
        brokerDirectoryCache.set(item.phone, { phone: cleanPhone, name: item.name || void 0 });
        if (item.name && !isGenericName(item.name)) {
          brokerDirectoryCache.set(item.name, { phone: cleanPhone, name: item.name });
        }
      }
    }
    console.log(`[JanIA-Directory] \u2705 Directorio de brokers cargado en memoria (${brokerDirectoryCache.size} entradas conocidas).`);
  } catch (err) {
    console.warn(`[JanIA-Directory] Advertencia cargando directorio inicial:`, err?.message || err);
  }
}
async function findOrCreateUserByPhone(phone, realName) {
  const db = await getDb();
  if (!db) return null;
  const cleanPhone = phone.split(":")[0];
  let user = await db.select().from(users).where(eq4(users.phone, cleanPhone)).limit(1).then((r) => r[0]);
  if (!user) {
    user = await db.select().from(users).where(eq4(users.openId, `wa-${cleanPhone}`)).limit(1).then((r) => r[0]);
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
        user = await db.select().from(users).where(eq4(users.openId, openId)).limit(1).then((r) => r[0]);
      } else {
        throw insertErr;
      }
    }
  } else {
    if (realName && !isGenericName(realName) && isGenericName(user.name)) {
      console.log(`[JanIA-findOrCreateUserByPhone] Actualizando nombre de usuario para ID ${user.id} a ${realName}`);
      const [updatedUser] = await db.update(users).set({ name: realName }).where(eq4(users.id, user.id)).returning();
      user = updatedUser;
    }
  }
  return user;
}
function sanitizePropertyType(type) {
  if (!type) return "apartment";
  const t2 = type.toLowerCase().trim();
  if (t2 === "cabin" || t2.includes("caba\xF1a") || t2.includes("cabana") || t2.includes("caba\xF1as") || t2.includes("cabanas")) return "cabin";
  if (t2 === "apartment" || t2 === "apartamento" || t2 === "apto" || t2.includes("apartaestudio") || t2.includes("penthouse")) return "apartment";
  if (t2 === "house" || t2 === "casa" || t2.includes("chalet") || t2.includes("quinta") || t2.includes("campestre")) return "house";
  if (t2 === "building" || t2 === "edificio") return "building";
  if (t2 === "warehouse" || t2 === "bodega") return "warehouse";
  if (t2 === "farm" || t2 === "finca") return "farm";
  if (t2 === "hotel" || t2.includes("hostal") || t2.includes("hospedaje") || t2.includes("motel") || t2.includes("hostel")) return "hotel";
  if (t2 === "office" || t2 === "oficina") return "office";
  if (t2 === "land" || t2 === "lote" || t2 === "terreno") return "land";
  if (t2 === "commercial" || t2 === "local" || t2 === "locales" || t2.includes("local comercial") || t2.includes("locales comerciales") || t2 === "comercial") return "commercial";
  if (t2 === "loft") return "loft";
  if (t2 === "consultorio" || t2 === "office_medical") return "consultorio";
  return "apartment";
}
function sanitizeTransactionType(type) {
  if (!type) return "venta";
  const t2 = type.toLowerCase().trim().replace(/\s+/g, "_");
  if (t2 === "venta" || t2 === "vender" || t2 === "compra" || t2 === "comprar") return "venta";
  if (t2 === "venta_o_arriendo" || t2.includes("venta_o_arriendo") || t2.includes("venta o arriendo") || t2.includes("vendo o arriendo") || t2.includes("venta_arriendo")) return "venta_o_arriendo";
  if (t2 === "arriendo_con_opcion_de_compra" || t2.includes("opcion_de_compra") || t2.includes("opcion de compra") || t2.includes("opci\xF3n de compra") || t2.includes("con opcion") || t2.includes("con opci\xF3n")) return "arriendo_con_opcion_de_compra";
  if (t2 === "arriendo" || t2 === "alquiler" || t2 === "renta" || t2 === "rentar" || t2 === "arrendar") return "arriendo";
  if (t2 === "arriendo_temporal" || t2 === "temporal" || t2 === "vacacional" || t2 === "vacaciones") return "arriendo_temporal";
  if (t2 === "venta_permuta" || t2.includes("venta_permuta") || t2.includes("venta permuta") || t2.includes("venpermuto") || t2.includes("venta") && t2.includes("permuta")) return "venta_permuta";
  if (t2 === "permuta" || t2 === "permuto" || t2 === "cambio" || t2.includes("permuta")) return "permuta";
  if (t2 === "aporte" || t2.includes("aporte") || t2 === "proyecto") return "aporte";
  return "venta";
}
function sanitizeTransactionTypes(raw) {
  const input = Array.isArray(raw) ? raw.join(" ") : raw || "";
  const n = input.toLowerCase();
  const result = [];
  if (n.includes("venta o arriendo") || n.includes("vendo o arriendo") || n.includes("venta_o_arriendo")) result.push("venta_o_arriendo");
  if (n.includes("opcion de compra") || n.includes("opci\xF3n de compra") || n.includes("con opcion") || n.includes("con opci\xF3n") || n.includes("arriendo_con_opcion")) result.push("arriendo_con_opcion_de_compra");
  if (n.includes("venta") && n.includes("permuta") || n.includes("venta_permuta") || n.includes("venpermuto")) result.push("venta_permuta");
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
    if (n.includes("permuta") || n.includes("permuto") || n.includes("recibo propiedad") || n.includes("recibo vehiculo") || n.includes("parte de pago") || n.includes("cambio de inmueble")) result.push("permuta");
  }
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
function calcularCalificacionCompletitud(extracted, isProperty) {
  if (!extracted) return { score: 0, label: "Mediocre" };
  let fieldsCount = 7;
  let presentCount = 0;
  const priceVal = isProperty ? extracted.price : extracted.presupuestoMax || extracted.presupuestoMin || extracted.price;
  if (priceVal !== void 0 && priceVal !== null && String(priceVal).trim() !== "" && String(priceVal) !== "0") {
    presentCount++;
  }
  const areaVal = isProperty ? extracted.areaTotal || extracted.area : extracted.areaMin || extracted.area;
  if (areaVal !== void 0 && areaVal !== null && String(areaVal).trim() !== "" && String(areaVal) !== "0") {
    presentCount++;
  }
  const bedroomsVal = isProperty ? extracted.bedrooms : extracted.habitacionesMin || extracted.bedrooms;
  if (bedroomsVal !== void 0 && bedroomsVal !== null && String(bedroomsVal).trim() !== "" && Number(bedroomsVal) > 0) {
    presentCount++;
  }
  const bathroomsVal = isProperty ? extracted.bathrooms : extracted.banosMin || extracted.bathrooms;
  if (bathroomsVal !== void 0 && bathroomsVal !== null && String(bathroomsVal).trim() !== "" && Number(bathroomsVal) > 0) {
    presentCount++;
  }
  const garagesVal = isProperty ? extracted.garages : extracted.parqueaderosMin || extracted.garages;
  if (garagesVal !== void 0 && garagesVal !== null && String(garagesVal).trim() !== "" && Number(garagesVal) >= 0) {
    presentCount++;
  }
  const zoneVal = isProperty ? extracted.zone : extracted.zonaDeseada || extracted.zone;
  if (zoneVal !== void 0 && zoneVal !== null && String(zoneVal).trim() !== "" && String(zoneVal).toLowerCase() !== "bogot\xE1" && String(zoneVal).toLowerCase() !== "bogota") {
    presentCount++;
  }
  const contactVal = extracted.idUsuarioWhatsapp;
  if (contactVal !== void 0 && contactVal !== null && String(contactVal).trim() !== "") {
    presentCount++;
  }
  const score = presentCount / fieldsCount * 100;
  let label = "Mediocre";
  if (score < 30) {
    label = "Mediocre";
  } else if (score >= 30 && score < 45) {
    label = "Incompleta";
  } else if (score >= 45 && score < 60) {
    label = "Regular";
  } else if (score >= 60 && score < 70) {
    label = "Mejor";
  } else if (score >= 70 && score < 85) {
    label = "Bien";
  } else if (score >= 85 && score < 95) {
    label = "Perfecta";
  } else {
    label = "Excelente";
  }
  return { score, label };
}
function getEmojiForCalificacion(calificacion) {
  switch (calificacion) {
    case "Mediocre":
    case "Incompleta":
    case "DATOS_INCOMPLETOS":
      return "\u{1F914}";
    case "Regular":
    case "Mejor":
    case "Bien":
    case "Perfecta":
    case "Excelente":
      return "\u{1F7E2}";
    case "INVALID_LEAD":
    case "VIOLACION_DE_NORMAS":
      return "\u274C";
    default:
      return "\u{1F7E2}";
  }
}
function normalizePhoneNumber(rawUserJid, textContent) {
  if (textContent) {
    const match = textContent.match(/(?:\+?57\s*)?3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/);
    if (match) {
      const cleanDigits = match[0].replace(/\D/g, "");
      if (cleanDigits.length === 10 && cleanDigits.startsWith("3")) {
        return cleanDigits;
      }
      if (cleanDigits.length === 12 && cleanDigits.startsWith("573")) {
        return `+${cleanDigits}`;
      }
    }
  }
  if (rawUserJid) {
    const clean = String(rawUserJid).split("@")[0].split(":")[0].replace(/\D/g, "");
    if (!clean.startsWith("11") && !clean.startsWith("1203") && clean.length <= 13) {
      if (clean.length === 10 && clean.startsWith("3")) {
        return clean;
      }
      if (clean.length === 12 && clean.startsWith("573")) {
        return `+${clean}`;
      }
      if (clean.length >= 10 && clean.length <= 12) {
        return clean;
      }
    }
  }
  return "";
}
async function handleAmendmentUpdate(userId, text2) {
  const db = await getDb();
  if (!db) return false;
  const rawPhone = userId.split("@")[0].split(":")[0].replace(/\D/g, "");
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1e3);
  const cleanTextLower = text2.toLowerCase().trim();
  const isAmendmentTrigger = cleanTextLower.startsWith("correccion") || cleanTextLower.startsWith("correcci\xF3n") || cleanTextLower.startsWith("fe de erratas") || cleanTextLower.startsWith("fe de errata") || cleanTextLower.startsWith("rectificacion") || cleanTextLower.startsWith("rectificaci\xF3n") || cleanTextLower.startsWith("ajuste:") || cleanTextLower.startsWith("ajuste ") || cleanTextLower.startsWith("disculpen");
  if (!isAmendmentTrigger) return false;
  const fallbackData = extractFallbackDataFromText(text2);
  const lastReqs = await db.select().from(requirements).where(and2(
    eq4(requirements.idUsuarioWhatsapp, rawPhone),
    gte(requirements.createdAt, twoHoursAgo)
  )).orderBy(desc(requirements.createdAt)).limit(1);
  if (lastReqs.length > 0) {
    const req = lastReqs[0];
    const updates = {};
    if (cleanTextLower.includes("parqueadero") && fallbackData.garages > 0) {
      updates.parqueaderosMin = fallbackData.garages;
    }
    if ((cleanTextLower.includes("habitaci\xF3n") || cleanTextLower.includes("habitacion") || cleanTextLower.includes("alcoba")) && fallbackData.bedrooms > 0) {
      updates.habitacionesMin = fallbackData.bedrooms;
    }
    if (cleanTextLower.includes("ba\xF1o") && fallbackData.bathrooms > 0) {
      updates.banosMin = fallbackData.bathrooms;
    }
    if ((cleanTextLower.includes("precio") || cleanTextLower.includes("presupuesto")) && fallbackData.price > 0) {
      updates.presupuestoMax = String(fallbackData.price);
    }
    if ((cleanTextLower.includes("\xE1rea") || cleanTextLower.includes("area")) && fallbackData.area > 0) {
      updates.areaMin = String(fallbackData.area);
    }
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = /* @__PURE__ */ new Date();
      await db.update(requirements).set(updates).where(eq4(requirements.id, req.id));
      console.log(`[JANIA-AMENDMENT] \u2705 Requerimiento #${req.id} actualizado silenciosamente en BD (Ventana 2h):`, updates);
      const { executeMatchEngine: executeMatchEngine2 } = await Promise.resolve().then(() => (init_matching(), matching_exports));
      setImmediate(() => {
        executeMatchEngine2(null, req.id).catch((err) => console.error("Error executing match engine on amendment:", err));
      });
      return true;
    }
  }
  const lastProps = await db.select().from(properties).where(and2(
    eq4(properties.idUsuarioWhatsapp, rawPhone),
    gte(properties.createdAt, twoHoursAgo)
  )).orderBy(desc(properties.createdAt)).limit(1);
  if (lastProps.length > 0) {
    const prop = lastProps[0];
    const updates = {};
    if (cleanTextLower.includes("parqueadero") && fallbackData.garages > 0) {
      updates.garages = fallbackData.garages;
    }
    if ((cleanTextLower.includes("habitaci\xF3n") || cleanTextLower.includes("habitacion") || cleanTextLower.includes("alcoba")) && fallbackData.bedrooms > 0) {
      updates.bedrooms = fallbackData.bedrooms;
    }
    if (cleanTextLower.includes("ba\xF1o") && fallbackData.bathrooms > 0) {
      updates.bathrooms = fallbackData.bathrooms;
    }
    if ((cleanTextLower.includes("precio") || cleanTextLower.includes("valor")) && fallbackData.price > 0) {
      updates.price = String(fallbackData.price);
    }
    if ((cleanTextLower.includes("\xE1rea") || cleanTextLower.includes("area")) && fallbackData.area > 0) {
      updates.areaTotal = String(fallbackData.area);
    }
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = /* @__PURE__ */ new Date();
      await db.update(properties).set(updates).where(eq4(properties.id, prop.id));
      console.log(`[JANIA-AMENDMENT] \u2705 Propiedad #${prop.id} actualizada silenciosamente en BD (Ventana 2h):`, updates);
      const { executeMatchEngine: executeMatchEngine2 } = await Promise.resolve().then(() => (init_matching(), matching_exports));
      setImmediate(() => {
        executeMatchEngine2(prop.id, null).catch((err) => console.error("Error executing match engine on amendment:", err));
      });
      return true;
    }
  }
  return false;
}
async function saveProperty(data, userId, realName, imageBuffer, pdfBuffer, pdfMimeType) {
  const db = await getDb();
  if (!db) return null;
  const rawTextContent = `${data.rawText || ""} ${data.description || ""} ${data.name || ""}`;
  const effectivePhone = resolveContactPhone(userId, rawTextContent, realName, data.idUsuarioWhatsapp);
  const rawPhone = effectivePhone;
  const user = await findOrCreateUserByPhone(effectivePhone, realName);
  let imageUrl;
  if (imageBuffer) {
    try {
      console.log(`[JanIA-SaveProperty] Subiendo imagen flyer de WhatsApp para ${realName}...`);
      const buffer = Buffer.from(imageBuffer, "base64");
      const filename = `flyers/wa_${Date.now()}_${rawPhone}.jpg`;
      const uploadResult = await storagePut(filename, buffer, "image/jpeg");
      imageUrl = uploadResult.url;
      console.log(`[JanIA-SaveProperty] Imagen subida exitosamente: ${imageUrl}`);
    } catch (err) {
      console.error("[JanIA-SaveProperty] Error subiendo imagen:", err);
    }
  }
  let pdfUrl;
  if (pdfBuffer) {
    try {
      console.log(`[JanIA-SaveProperty] Subiendo PDF brochure de WhatsApp para ${realName}...`);
      const buffer = Buffer.from(pdfBuffer, "base64");
      const filename = `documents/doc_${Date.now()}_${rawPhone}.pdf`;
      const uploadResult = await storagePut(filename, buffer, pdfMimeType || "application/pdf");
      pdfUrl = uploadResult.url;
      console.log(`[JanIA-SaveProperty] PDF subido exitosamente: ${pdfUrl}`);
    } catch (err) {
      console.error("[JanIA-SaveProperty] Error subiendo PDF:", err);
    }
  }
  const finalImages = [];
  if (imageUrl) {
    finalImages.push(imageUrl);
  }
  if (Array.isArray(data.images)) {
    for (const img of data.images) {
      if (img && typeof img === "string" && !finalImages.includes(img)) finalImages.push(img);
    }
  }
  if (pdfUrl) {
    data.externalUrl = data.externalUrl || pdfUrl;
    data.enlaceOrigen = data.enlaceOrigen || pdfUrl;
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
  if (data.zone && typeof data.zone === "string") {
    const barriosDesambiguados = desambiguarBarriosCompuestos(data.zone);
    if (barriosDesambiguados.length > 1) {
      data.zone = barriosDesambiguados.join(", ");
      data.addressNeighborhood = barriosDesambiguados[0];
      console.log(`[JanIA-GeoDisambiguate] Barrio compuesto: "${data.zone}"`);
    }
  }
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
    let finalSalePrice = currentPrice > 1e8 ? currentPrice : priceSaleField;
    let finalRentPrice = currentRentP > 0 ? currentRentP : priceRentField;
    if (finalRentPrice <= 0) {
      const rentMatch = rawLowerTx.match(/(?:valor\s*arriendo|arriendo|canon|renta)\s*:?\s*\$?([\d.,]+)\s*(mil\s*millones?|millones?|m|M)?/i);
      if (rentMatch) {
        let rawRNum = parseFloat(rentMatch[1].replace(/[.,]/g, ""));
        const unitR = (rentMatch[2] || "").toLowerCase();
        const multR = unitR.includes("mil millon") ? 1e9 : unitR.includes("millon") || unitR === "m" ? 1e6 : rawRNum < 1e4 ? 1e6 : 1;
        finalRentPrice = rawRNum * multR;
      }
    }
    if (finalSalePrice < 1e8) {
      const saleMatch = rawLowerTx.match(/(?:precio\s*(?:de\s*)?venta|venta)\s*:?\s*\$?([\d.,]+)\s*(mil\s*millones?|millones?|mm|mlls)?/i);
      if (saleMatch) {
        let rawSNum = parseFloat(saleMatch[1].replace(/[.,]/g, ""));
        const unitS = (saleMatch[2] || "").toLowerCase();
        const multS = unitS.includes("mil millon") ? 1e9 : unitS.includes("millon") || unitS.includes("mm") || unitS.includes("mlls") ? 1e6 : rawSNum < 1e4 ? 1e6 : 1;
        const computedS = rawSNum * multS;
        if (computedS >= 1e8) finalSalePrice = computedS;
      }
    }
    if (finalSalePrice > 0) data.price = finalSalePrice;
    if (finalRentPrice > 0) {
      const adminFeeVal = data.adminFee ? parseFloat(String(data.adminFee)) : 0;
      if (adminFeeVal > 0 && finalRentPrice >= adminFeeVal && finalRentPrice < 1e8) {
        data.rentPrice = finalRentPrice - adminFeeVal;
      } else {
        data.rentPrice = finalRentPrice;
      }
    }
    console.log(`[JanIA-PriceSplit] ${txTypeForSplit} \u2192 price(venta)=${data.price} | rentPrice(canon neto)=${data.rentPrice}`);
  }
  if (txTypeForSplit === "arriendo" || txTypeForSplit === "arriendo_temporal") {
    const curP = data.price ? parseFloat(String(data.price)) : 0;
    const curR = data.rentPrice ? parseFloat(String(data.rentPrice)) : 0;
    if (curR <= 0 && curP > 0 && curP < 1e8) {
      data.rentPrice = curP;
    }
    data.price = "0";
  }
  if (txTypeForSplit === "venta") {
    data.rentPrice = null;
  }
  const curRentVal = data.rentPrice ? parseFloat(String(data.rentPrice)) : 0;
  const curSaleVal = data.price ? parseFloat(String(data.price)) : 0;
  const curAdminVal = data.adminFee ? parseFloat(String(data.adminFee)) : 0;
  if (curAdminVal > 0) {
    if (curRentVal > 0 && (curAdminVal === curRentVal || curAdminVal >= curRentVal * 0.45) || curSaleVal > 0 && (curAdminVal === curSaleVal || curAdminVal >= curSaleVal * 0.2)) {
      data.adminFee = 0;
      console.log(`[JanIA-SanidadPredial] Corregida cuota de administraci\xF3n absurda/duplicada $${curAdminVal} \u2192 N/E (0)`);
    }
  }
  const isVentaType = txTypeForSplit.includes("venta") || !txTypeForSplit.includes("arriendo");
  const currentPriceVal = data.price ? parseFloat(String(data.price)) : 0;
  if (isVentaType && currentPriceVal > 0 && currentPriceVal < 3e7 && data.rawText) {
    const rawLower = (data.rawText || "").toLowerCase();
    const saleMatch = rawLower.match(/(?:v\/venta\/|precio\s*(?:de\s*)?venta|venta)\s*:?\s*\$?([\d.,]+)\s*(mil\s*millones?|millones?|m|M)?/i) || rawLower.match(/venta\/.*?\$?\s*([\d.]{7,12})/i);
    if (saleMatch) {
      const rawNum = parseFloat(saleMatch[1].replace(/\./g, "").replace(/,/g, ""));
      const unitStr = (saleMatch[2] || "").toLowerCase();
      const mult = unitStr.includes("mil millon") ? 1e9 : unitStr.includes("millon") || unitStr === "m" ? 1e6 : rawNum < 1e4 ? 1e6 : 1;
      const realSalePrice = rawNum * mult;
      if (realSalePrice >= 3e7) {
        if (!data.adminFee || parseFloat(String(data.adminFee)) <= 0) {
          data.adminFee = currentPriceVal;
        }
        data.price = realSalePrice;
        console.log(`[JanIA-SanidadPredial] Corregido precio de venta corrupto $${currentPriceVal} \u2192 Real: $${realSalePrice} | AdminFee: $${data.adminFee}`);
      }
    }
  }
  if (!data.zone || data.zone.trim() === "" || data.zone.toLowerCase() === "bogota" || data.zone.toLowerCase() === "bogot\xE1" || data.zone.toLowerCase() === "colombia") {
    const geoInferred = resolveIntersectionToBarrio(data.rawText || data.name || data.location);
    if (geoInferred) {
      data.zone = geoInferred.barrio;
      data.addressNeighborhood = geoInferred.barrio;
      data.addressLocality = geoInferred.localidad;
      data.city = data.city || geoInferred.ciudad;
      console.log(`[JanIA-GeoResolver] \u{1F9ED} Inmueble: cruce vial deducido exitosamente: '${(data.rawText || "").slice(0, 45)}...' \u2192 Barrio: ${geoInferred.barrio} | Localidad: ${geoInferred.localidad} | Ciudad: ${geoInferred.ciudad}`);
    }
  }
  const insertData = {
    ...data,
    name: safeSlice(data.name || `Propiedad en ${data.city || data.zone || "Colombia"}`, 255) || "Propiedad",
    city: safeSlice(data.city || data.ciudadDeseada, 100) || null,
    zone: safeSlice(data.zone || data.addressNeighborhood || data.addressLocality || data.location || data.city || data.ciudadDeseada || "Bogot\xE1", 100) || "Bogot\xE1",
    addressCity: safeSlice(data.addressCity || data.address_city || data.city, 100) || null,
    addressLocality: safeSlice(data.addressLocality || data.address_locality, 100) || null,
    addressNeighborhood: safeSlice(data.addressNeighborhood || data.address_neighborhood || data.zone, 150) || null,
    location: safeSlice(data.location, 255) || null,
    matriculaInmobiliaria: safeSlice(data.matriculaInmobiliaria, 100) || null,
    enlaceOrigen: safeSlice(data.enlaceOrigen, 1e3) || null,
    idUsuarioWhatsapp: safeSlice(data.idUsuarioWhatsapp || rawPhone, 100) || null,
    nombreUsuarioWhatsapp: safeSlice(realName && realName.trim() !== "" && !realName.startsWith("Asesor +") ? realName : data.nombreUsuarioWhatsapp || realName, 255) || null,
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
      if (data.price === void 0 || data.price === null) return "0.00";
      const v = parseFloat(String(data.price));
      if (isNaN(v) || isPhoneNumberNotPrice(v, data.rawText)) return "0.00";
      if (v > 5e10) return "0.00";
      return String(v);
    })(),
    rentPrice: (() => {
      if (data.rentPrice === void 0 || data.rentPrice === null) return null;
      const v = parseFloat(String(data.rentPrice));
      if (isNaN(v) || v < 3e5 || v > 2e8 || isPhoneNumberNotPrice(v, data.rawText)) return null;
      return String(v);
    })(),
    areaTotal: (() => {
      const raw = data.areaTotal !== void 0 && data.areaTotal !== null ? data.areaTotal : data.area;
      if (raw === void 0 || raw === null) return null;
      const v = parseFloat(String(raw));
      if (isNaN(v) || v < 10 || v > 5e3) return null;
      return String(v);
    })(),
    bedrooms: data.bedrooms !== void 0 && data.bedrooms !== null ? Math.round(Number(data.bedrooms)) : null,
    bathrooms: data.bathrooms !== void 0 && data.bathrooms !== null ? Math.round(Number(data.bathrooms)) : null,
    garages: data.garages !== void 0 && data.garages !== null ? Math.round(Number(data.garages)) : null,
    garageType: data.garageType || null,
    // "independiente" | "lineal" | "mixto" | null (v20.0)
    stratum: data.stratum !== void 0 && data.stratum !== null ? Math.round(Number(data.stratum)) : null,
    adminFee: data.adminFee !== void 0 && data.adminFee !== null ? String(data.adminFee) : null,
    yearBuilt: data.yearBuilt !== void 0 && data.yearBuilt !== null ? Math.round(Number(data.yearBuilt)) : null,
    antiguedadAnos: data.antiguedadAnos !== void 0 && data.antiguedadAnos !== null ? Math.round(Number(data.antiguedadAnos)) : null,
    agentId: user ? user.id : null,
    latitude: data.latitude !== void 0 && data.latitude !== null ? String(data.latitude) : null,
    longitude: data.longitude !== void 0 && data.longitude !== null ? String(data.longitude) : null,
    images: finalImages.length > 0 ? finalImages : null,
    amenities: amenitiesObj,
    origenTipo: data.origenTipo || null,
    origenId: data.origenId || null,
    origenNombre: data.origenNombre || null,
    fechaExtraccion: data.fechaExtraccion || getColombiaNow()
  };
  let portal = null;
  let externalListingId = null;
  let canonicalExternalId = null;
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
    ultimaActividad: "PUBLICACI\xD3N",
    vigenciaIa: "VIGENTE"
  };
  let existing = [];
  if (canonicalExternalId) {
    existing = await db.select().from(properties).where(
      and2(
        eq4(properties.canonicalExternalId, canonicalExternalId),
        eq4(properties.available, true)
      )
    ).limit(1);
  }
  if (existing.length === 0 && finalInsertData.matriculaInmobiliaria) {
    existing = await db.select().from(properties).where(
      and2(
        eq4(properties.matriculaInmobiliaria, finalInsertData.matriculaInmobiliaria),
        eq4(properties.available, true)
      )
    ).limit(1);
  }
  if (existing.length === 0) {
    existing = await db.select().from(properties).where(
      and2(
        eq4(properties.idUsuarioWhatsapp, rawPhone),
        eq4(properties.propertyType, finalInsertData.propertyType),
        eq4(properties.transactionType, finalInsertData.transactionType),
        eq4(properties.city, finalInsertData.city),
        eq4(properties.zone, finalInsertData.zone),
        eq4(properties.available, true)
      )
    ).limit(1);
  }
  const { label: calif } = calcularCalificacionCompletitud(finalInsertData, true);
  const insertDataWithCalif = {
    ...finalInsertData,
    calificacion: calif
  };
  if (existing.length > 0) {
    const updatedCount = (existing[0].republicacionesCount || 0) + 1;
    const [updated] = await db.update(properties).set({
      price: insertDataWithCalif.price,
      description: insertDataWithCalif.description || existing[0].description,
      adminFee: insertDataWithCalif.adminFee || existing[0].adminFee,
      images: finalImages.length > 0 ? finalImages : existing[0].images,
      origenTipo: insertDataWithCalif.origenTipo,
      origenId: insertDataWithCalif.origenId,
      origenNombre: insertDataWithCalif.origenNombre,
      idUsuarioWhatsapp: insertDataWithCalif.idUsuarioWhatsapp,
      fechaUltimaPublicacion: getColombiaNow(),
      updatedAt: /* @__PURE__ */ new Date(),
      republicacionesCount: updatedCount,
      estadoComercial: "REPUBLICADO",
      ultimaActividad: "REPUBLICACI\xD3N",
      vigenciaIa: "VIGENTE"
    }).where(eq4(properties.id, existing[0].id)).returning();
    console.log(`[Deduplication] Propiedad existente detectada (${canonicalExternalId || "Comercial"}). Actualizando datos (ID: ${updated.id}, Republicado: ${updatedCount})`);
    try {
      await db.insert(propertyPublicationHistory).values({
        propertyId: existing[0].id,
        grupo: insertDataWithCalif.origenNombre,
        broker: realName,
        brokerPhone: rawPhone,
        accion: "REPUBLICACI\xD3N",
        portal,
        externalListingId,
        detalles: `Inmueble republicado en ${insertDataWithCalif.origenNombre || "WhatsApp"}. Precio: ${insertDataWithCalif.price}`
      });
    } catch (histErr) {
      console.error("[JanIA-History] Error al registrar historial de republicaci\xF3n:", histErr);
    }
    findMatchesForProperty(updated.id).catch((mErr) => console.error("[JanIA-MatchingTrigger] Error recalculando matches para propiedad:", mErr));
    return updated;
  }
  const [result] = await db.insert(properties).values(insertDataWithCalif).returning();
  findMatchesForProperty(result.id).catch((mErr) => console.error("[JanIA-MatchingTrigger] Error calculando matches para propiedad:", mErr));
  try {
    await db.insert(propertyPublicationHistory).values({
      propertyId: result.id,
      grupo: insertDataWithCalif.origenNombre,
      broker: realName,
      brokerPhone: rawPhone,
      accion: "PUBLICACI\xD3N",
      portal,
      externalListingId,
      detalles: `Inmueble ingresado por primera vez desde ${insertDataWithCalif.origenNombre || "WhatsApp"}. Precio: ${insertDataWithCalif.price}`
    });
  } catch (histErr) {
    console.error("[JanIA-History] Error al registrar historial inicial:", histErr);
  }
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
async function saveRequirement(data, userId, realName, imageBuffer, pdfBuffer, pdfMimeType) {
  const db = await getDb();
  if (!db) return null;
  const rawTextContent = `${data.rawText || ""} ${data.name || ""}`;
  const effectivePhone = resolveContactPhone(userId, rawTextContent, realName, data.idUsuarioWhatsapp);
  const rawPhone = effectivePhone;
  const user = await findOrCreateUserByPhone(effectivePhone, realName);
  let reqPdfUrl;
  if (pdfBuffer) {
    try {
      const buffer = Buffer.from(pdfBuffer, "base64");
      const filename = `documents/req_doc_${Date.now()}_${rawPhone}.pdf`;
      const uploadResult = await storagePut(filename, buffer, pdfMimeType || "application/pdf");
      reqPdfUrl = uploadResult.url;
      data.enlaceOrigen = data.enlaceOrigen || reqPdfUrl;
    } catch (err) {
      console.error("[JanIA-SaveRequirement] Error subiendo PDF:", err);
    }
  }
  if (imageBuffer && !data.enlaceOrigen) {
    try {
      const buffer = Buffer.from(imageBuffer, "base64");
      const filename = `flyers/req_wa_${Date.now()}_${rawPhone}.jpg`;
      const uploadResult = await storagePut(filename, buffer, "image/jpeg");
      data.enlaceOrigen = data.enlaceOrigen || uploadResult.url;
    } catch (err) {
      console.error("[JanIA-SaveRequirement] Error subiendo imagen:", err);
    }
  }
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
  if (!data.zonaDeseada && (!data.zone || data.zone.trim() === "" || data.zone.toLowerCase() === "bogota" || data.zone.toLowerCase() === "bogot\xE1" || data.zone.toLowerCase() === "colombia")) {
    const geoInferred = resolveIntersectionToBarrio(data.rawText || data.name);
    if (geoInferred) {
      data.zonaDeseada = geoInferred.barrio;
      data.addressNeighborhood = geoInferred.barrio;
      data.addressLocality = geoInferred.localidad;
      data.ciudadDeseada = data.ciudadDeseada || geoInferred.ciudad;
      console.log(`[JanIA-GeoResolver] \u{1F9ED} Requerimiento: cruce vial deducido exitosamente: '${(data.rawText || "").slice(0, 45)}...' \u2192 Barrio: ${geoInferred.barrio} | Localidad: ${geoInferred.localidad} | Ciudad: ${geoInferred.ciudad}`);
    }
  }
  const insertData = {
    ...data,
    name: safeSlice(data.name, 255) || null,
    ciudadDeseada: safeSlice(data.ciudadDeseada || data.city, 100) || null,
    zonaDeseada: safeSlice(data.zonaDeseada || data.zone, 100) || null,
    addressCity: safeSlice(data.addressCity || data.address_city, 100) || null,
    addressLocality: safeSlice(data.addressLocality || data.address_locality, 100) || null,
    addressNeighborhood: safeSlice(data.addressNeighborhood || data.address_neighborhood, 150) || null,
    enlaceOrigen: safeSlice(data.enlaceOrigen, 1e3) || null,
    idUsuarioWhatsapp: safeSlice(data.idUsuarioWhatsapp || rawPhone, 100) || null,
    nombreUsuarioWhatsapp: safeSlice(realName && realName.trim() !== "" && !realName.startsWith("Asesor +") ? realName : data.nombreUsuarioWhatsapp || realName, 255) || null,
    tipoInmuebleDeseado: sanitizePropertyType(data.tipoInmuebleDeseado || data.propertyType),
    tipoNegocioDeseado: sanitizeTransactionType(data.tipoNegocioDeseado || data.transactionType),
    tiposNegocioAceptados: sanitizeTransactionTypes(data.transactionTypes || data.tipoNegocioDeseado || data.transactionType),
    monedaPresupuesto: sanitizeCurrency(data.monedaPresupuesto || data.currency),
    // Mapear campos con Sanidad Numérica Post-Extracción (Bug #6 Fix)
    presupuestoMin: data.presupuestoMin !== void 0 && data.presupuestoMin !== null ? String(data.presupuestoMin) : null,
    presupuestoMax: (() => {
      const raw = data.presupuestoMax !== void 0 && data.presupuestoMax !== null ? data.presupuestoMax : data.price;
      if (raw === void 0 || raw === null) return null;
      const v = parseFloat(String(raw));
      if (isNaN(v) || v < 3e5 || v > 5e10 || isPhoneNumberNotPrice(v, data.rawText)) return null;
      return String(v);
    })(),
    areaMin: (() => {
      const raw = data.areaMin !== void 0 && data.areaMin !== null ? data.areaMin : data.area;
      if (raw === void 0 || raw === null) return null;
      const v = parseFloat(String(raw));
      if (isNaN(v) || v < 10 || v > 5e3) return null;
      return String(v);
    })(),
    adminFeeMax: data.adminFeeMax !== void 0 && data.adminFeeMax !== null ? String(data.adminFeeMax) : data.adminFee !== void 0 && data.adminFee !== null ? String(data.adminFee) : null,
    habitacionesMin: (() => {
      const v = data.habitacionesMin !== void 0 && data.habitacionesMin !== null ? Math.round(Number(data.habitacionesMin)) : data.bedrooms !== void 0 && data.bedrooms !== null ? Math.round(Number(data.bedrooms)) : null;
      if (v !== null && !isNaN(v) && v > 0) return v;
      const rawL = (data.rawText || "").toLowerCase();
      const m = rawL.match(/(\d+)\s*(?:hab|habitaciones|alcoba|alcobas|alc|dormitorio)/i);
      return m ? parseInt(m[1], 10) : null;
    })(),
    banosMin: (() => {
      const v = data.banosMin !== void 0 && data.banosMin !== null ? Number(data.banosMin) : data.bathrooms !== void 0 && data.bathrooms !== null ? Number(data.bathrooms) : null;
      if (v !== null && !isNaN(v) && v > 0) return Math.round(v);
      const rawL = (data.rawText || "").toLowerCase();
      const m = rawL.match(/(\d+(?:\.\d+)?)\s*(?:o\s*más\s*)?(?:wc|baño|baños|bñ)/i) || rawL.match(/(\d+)\s*hab\s*con\s*baño/i);
      return m ? Math.round(parseFloat(m[1])) : null;
    })(),
    parqueaderosMin: (() => {
      const v = data.parqueaderosMin !== void 0 && data.parqueaderosMin !== null ? Math.round(Number(data.parqueaderosMin)) : data.garages !== void 0 && data.garages !== null ? Math.round(Number(data.garages)) : null;
      if (v !== null && !isNaN(v) && v > 0) return v;
      const rawL = (data.rawText || "").toLowerCase();
      const m = rawL.match(/(?:parqueadero|parqueaderos|garaje|garajes|ptero|g\.)\s*\.?\s*(\d+)/i) || rawL.match(/(\d+)\s*(?:parqueadero|parqueaderos|garaje|garajes|ptero|g\.|individuales)/i);
      return m ? parseInt(m[1], 10) : null;
    })(),
    estratoDeseado: data.estratoDeseado || (data.stratum !== void 0 && data.stratum !== null ? [Math.round(Number(data.stratum))] : null),
    userId: user ? user.id : null,
    caracteristicasDeseadas: characteristicsObj,
    origenTipo: data.origenTipo || null,
    origenId: data.origenId || null,
    origenNombre: data.origenNombre || null,
    fechaExtraccion: data.fechaExtraccion || getColombiaNow()
  };
  const rawZoneStr = (insertData.zonaDeseada || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const rawTextStr = (insertData.rawText || "").toLowerCase();
  const isAmbiguousZoneName = (zn) => {
    if (!zn || zn === "n/e" || zn === "na" || zn === "bogota" || zn === "bogota, d.c." || zn === "colombia") return true;
    const ambiguousPhrases = [
      "todas las zonas",
      "cualquier zona",
      "cualquier lado",
      "donde sea",
      "varias zonas",
      "por ahi",
      "por ah\xED",
      "buena zona",
      "sector residencial",
      "sector comercial",
      "norte o sur",
      "donde haya",
      "cualquiera"
    ];
    return ambiguousPhrases.some((a) => zn.includes(a));
  };
  const hasPerimeterOrStreet = /calle\s*\d+|carrera\s*\d+|cra\s*\d+|cll\s*\d+|cl\s*\d+|diagonal\s*\d+|transversal\s*\d+|entre\s*calle|perimetro|perímetro/i.test(rawTextStr);
  const isZoneAmbiguous = isAmbiguousZoneName(rawZoneStr);
  if (isZoneAmbiguous && !hasPerimeterOrStreet && !insertData.presupuestoMax && !insertData.areaMin && !insertData.habitacionesMin) {
    console.log(`[JANIA-INGESTION-GUARD] \u26D4 Requerimiento omitido por falta de ubicaci\xF3n expl\xEDcita o especificaciones prediales completas ("${insertData.rawText?.substring(0, 60)}...")`);
    return null;
  }
  const existing = await db.select().from(requirements).where(
    and2(
      eq4(requirements.idUsuarioWhatsapp, rawPhone),
      eq4(requirements.tipoInmuebleDeseado, insertData.tipoInmuebleDeseado),
      eq4(requirements.tipoNegocioDeseado, insertData.tipoNegocioDeseado),
      eq4(requirements.ciudadDeseada, insertData.ciudadDeseada),
      eq4(requirements.zonaDeseada, insertData.zonaDeseada),
      eq4(requirements.status, "active")
    )
  ).limit(1);
  const { label: calif } = calcularCalificacionCompletitud(insertData, false);
  const insertDataWithCalif = {
    ...insertData,
    calificacion: calif
  };
  if (existing.length > 0) {
    const [updated] = await db.update(requirements).set({
      ...insertDataWithCalif,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq4(requirements.id, existing[0].id)).returning();
    console.log(`[Deduplication] Requerimiento existente detectado. Actualizando datos (ID: ${updated.id})`);
    findMatchesForRequirement(updated.id).catch((mErr) => console.error("[JanIA-MatchingTrigger] Error recalculando matches para requerimiento:", mErr));
    return updated;
  }
  const [result] = await db.insert(requirements).values(insertDataWithCalif).returning();
  findMatchesForRequirement(result.id).catch((mErr) => console.error("[JanIA-MatchingTrigger] Error calculando matches para requerimiento:", mErr));
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
async function processConsultingMessage(text2, userId, userName, imageBuffer, pdfBuffer, pdfMimeType, audioUrl, msgTimestamp) {
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
          reactionEmoji: "\u{1F6AB}"
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
   - **REGLA OBLIGATORIA DE CIERRE**: Toda respuesta a una consulta jur\xEDdica o de aval\xFAo en esta clasificaci\xF3n DEBE finalizar recomendando de forma muy persuasiva al usuario que, para resolver su caso de manera 100% personalizada y a la medida, escriba o llame directamente por WhatsApp al n\xFAmero *3192919978* de VECY BIENES RA\xCDCES para contratar una Consultor\xEDa Personalizada o un servicio de aval\xFAo oficial.
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
    const timeGreeting = getGreetingByTime();
    const nowBogota = new Date((/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "America/Bogota" }));
    const hour = nowBogota.getHours();
    const cleanFirstName = n.trim();
    const lastChar = cleanFirstName.slice(-1).toLowerCase();
    const maleExceptions = ["luca", "andrea", "borja", "joshua", "bautista", "sasha", "el\xEDa", "elias"];
    const isFemale = lastChar === "a" && !maleExceptions.includes(cleanFirstName.toLowerCase());
    const genderTerm = isFemale ? `estimada ${n}` : `estimado ${n}`;
    const nowMs = Date.now();
    const msgMs = msgTimestamp ? msgTimestamp * 1e3 : nowMs;
    const hoursLate = Math.floor((nowMs - msgMs) / 36e5);
    const isLateReply = hoursLate >= 6;
    const lateReplyNote = isLateReply ? `
- RESPUESTA TARD\xCDA DETECTADA: El mensaje del usuario fue enviado hace ${hoursLate} horas. DEBES obligatoriamente incluir una disculpa humana, c\xE1lida y espont\xE1nea al inicio o final de tu respuesta (elige una de forma natural, no mec\xE1nica). Ejemplos v\xE1lidos: "Disculpa la demora, estuve en ajustes de mis motores. \xA1Aqu\xED estoy!", "Perdona la tardanza, estuve en mantenimiento t\xE9cnico.", "Lamento que haya tardado tanto en responderte.". La disculpa debe sonar viva y genuina, nunca como una frase programada.` : ``;
    const greetingInstruction = `

[SISTEMA - INSTRUCCI\xD3N OBLIGATORIA DE SALUDO Y COMPORTAMIENTO]:
- Hora actual Bogot\xE1: ${hour}:00 (${timeGreeting}).
- G\xE9nero detectado para ${n}: ${isFemale ? "Femenino (estimada)" : "Masculino (estimado)"}.
- T\xE9rmino de trato respetuoso: "${genderTerm}".
- Ya has saludado a esta persona hoy: ${alreadyGreeted ? "S\xCD" : "NO"}.
- Tipo de conversaci\xF3n actual: GRUPO DE WHATSAPP ("VECY: SOPORTE LEGAL, TRIBUTARIO Y AVAL\xDAOS").
- REGLAS OBLIGATORIAS DE SALUDO:
  * Rangos horarios exactos para el saludo: 00:00-11:59 = "Buenos d\xEDas", 12:00-17:59 = "Buenas tardes", 18:00-23:59 = "Buenas noches".
  * Si "Ya has saludado al usuario hoy" es NO:
    - Inicia con: "${timeGreeting}, ${genderTerm} \u{1F44B}\u{1F3FB}" o "${timeGreeting}, ${n} \u{1F44B}\u{1F3FB}".
  * Si "Ya has saludado al usuario hoy" es S\xCD:
    - \xA1PROHIBIDO SALUDAR! No uses "Hola", "${timeGreeting}", "Buenas", "Qu\xE9 gusto", ni ninguna bienvenida.
    - Integra su nombre "${n}" de forma conversacional (ej. "Mira ${n}, ...", "Entiendo tu inquietud, ${n}, ...").
- REGLA ESPEJO MODAL: ${isFromAudio ? "El usuario envi\xF3 AUDIO. DEBES responder en nota de voz (wantsVoice: true). Redacta voiceResponse limpio sin markdown/emojis, m\xE1x 450 caracteres." : "El usuario envi\xF3 TEXTO. DEBES responder en texto (wantsVoice: false)."}
${lateReplyNote}`;
    if (pdfBuffer) {
      messageToProcess += `
[SISTEMA: DOCUMENTO PDF DETECTADO. Analiza el documento PDF adjunto con tus capacidades nativas para extraer todos los datos relevantes del predial, certificado de tradici\xF3n, o contrato.]`;
    }
    if (isFromAudio) {
      messageToProcess += `
[SISTEMA - NOTA DE VOZ REQUERIDA Y L\xCDMITE DE DURACI\xD3N \xC1GIL]: El usuario te envi\xF3 esta consulta mediante una NOTA DE VOZ (audio). Como JanIA, debes responder en nota de voz de viva voz. DEBES obligatoriamente marcar "wantsVoice": true y redactar en "voiceResponse" una versi\xF3n hablada resumida, directa, muy fluida, profesional, c\xE1lida y natural de tu respuesta (m\xE1ximo 450 caracteres / ~30 a 40 segundos de voz hablada), sin asteriscos, vi\xF1etas ni sintaxis Markdown, perfecta para ser sintetizada e impactar de forma \xE1gil e instant\xE1nea sin saturar la conexi\xF3n. En "response" coloca la versi\xF3n completa formateada en texto.`;
    }
    const messages2 = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Usuario: @${rawPhone} (${realName})
Consulta: ${messageToProcess}${greetingInstruction}` }
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
        reactionEmoji: parsed.reactionEmoji || (parsed.classification === "VIOLACION_DE_NORMAS" ? "\u{1F6AB}" : "\u{1F44C}"),
        wantsVoice: parsed.wantsVoice || false,
        voiceResponse: parsed.voiceResponse || ""
      };
    } catch (e) {
      const replyContent = llmRes.choices[0].message.content || "Lo siento, en este momento no puedo procesar tu consulta. Intenta de nuevo m\xE1s tarde.";
      return {
        classification: "CONSULTA_GENERAL",
        response: sanitizeResponseMarkdown(replyContent),
        reactionEmoji: "\u{1F44C}",
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
    const firstName = extractFirstName(realName);
    const userGreetingName = firstName ? ` ${firstName}` : "";
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
        const staticText = `Hola${userGreetingName} \u{1F44B}\u{1F3FB}. Este grupo est\xE1 reservado exclusivamente para temas, debates, testimonios y soporte relacionados con la red de VECY Network e Inteligencia Artificial. \u{1F4A1}\u2728

Por favor, realiza una pregunta o comentario relacionado con nuestro ecosistema. \u{1F60A}`;
        return {
          classification: "VIOLACION_DE_NORMAS",
          response: staticText,
          dmResponse: staticText,
          reactionEmoji: "\u{1F6AB}"
        };
      }
    }
    const textLower = text2.toLowerCase();
    const alreadyGreeted = await checkAlreadyGreeted(userId);
    const groupZeroName = process.env.GROUP_ZERO_NAME || 'PROYECTO "Vecy Network"';
    const systemPrompt = `Eres JanIA, la Inteligencia Artificial oficial de VECY Network. Est\xE1s operando en el grupo "${groupZeroName}". Tu objetivo en este grupo es responder inquietudes exclusivamente relacionadas con el proyecto "VECY NETWORK", de forma sincera, ver\xEDdica y sin mentiras, de acuerdo con las siguientes directrices:

## DIRECTRICES DE INFORMACI\xD3N Y SINCERIDAD SOBRE VECY NETWORK:
Explica claramente y con la verdad absoluta el estado del proyecto y sus caracter\xEDsticas:
- **Lo que en verdad funciona hoy**: Los asesores publican sus ofertas (Inmuebles) y demandas (Requerimientos) en el grupo especializado VECY INMUEBLES NETWORK. JanIA transcribe notas de voz en tiempo real, realiza OCR (lectura de texto) en flyers/im\xE1genes, extrae la informaci\xF3n de las fichas t\xE9cnicas autom\xE1ticamente a partir de enlaces/URLs compartidos de portales permitidos, ejecuta el matching de coincidencias comerciales de forma instant\xE1nea a nivel nacional (32 departamentos), y gestiona el flujo de confirmaci\xF3n de contacto bilateral privada (Double Opt-In) por mensaje privado (DM) mediante respuestas r\xE1pidas (S\xCD #M[c\xF3digo] o NO #M[c\xF3digo]).
- **Lo que est\xE1 en desarrollo y planeado a futuro**: El portal web oficial privado (https://vecy-network.vercel.app/) se encuentra en fases de desarrollo e integraci\xF3n. M\xF3dulos como el CRM para centralizar leads de agentes, la digitalizaci\xF3n de contratos formalizados y el motor de identidades din\xE1micas (subdominios personalizados para cada agente como agente.vecy.network) ser\xE1n lanzados oficialmente en el futuro y a\xFAn no est\xE1n operativos para los usuarios.
- **Urgencia Comercial y Tarifas**: Enfatiza que toda la plataforma, incluyendo el matching de JanIA en WhatsApp y la carga de inmuebles, es 100% gratuita por lanzamiento. Sin embargo, advierte con astucia que esta gratuidad ilimitada est\xE1 programada temporalmente y que, posiblemente, a partir del *01 de Julio de 2026* se implementar\xE1 un modelo de membres\xEDas/pago para accesos ilimitados. \xA1Debe servir de urgencia para registrarse y publicar hoy mismo!
- **Tecnolog\xEDa del Ecosistema**: Explica de forma sencilla que hemos creado un Asistente de IA basado en c\xF3digo propietario y base de datos SQL en la nube, el cual est\xE1 siendo entrenado a diario para encontrar MATCH en los grupos. NUNCA utilices tecnicismos complejos ni reveles nombres internos espec\xEDficos de nuestra infraestructura. Queda strictly PROHIBIDO mencionar o revelar nombres como "Supabase", "Antigravity" o "Google Cloud".
- **Recomendaci\xF3n de Im\xE1genes y OCR**: Explica a los usuarios por qu\xE9 es preferible enviar capturas de pantalla o im\xE1genes con texto comercial de sus propiedades en lugar de enlaces de redes sociales (Instagram, Facebook, etc.). La raz\xF3n t\xE9cnica es que las redes sociales restringen el acceso mediante bloqueos y filtros de verificaci\xF3n humana, haciendo imposible que la IA extraiga los datos. Al enviarle una captura de pantalla al grupo VECY INMUEBLES NETWORK, JanIA puede leer e indexar la informaci\xF3n con su visi\xF3n OCR al instante.
- **VECY INMUEBLES NETWORK es el \xFAnico centro de Match**: Recuerda y recalca que el grupo especializado VECY INMUEBLES NETWORK es el \xDANICO canal donde JanIA busca los MATCH y gestiona los datos de inmuebles y requerimientos. En C\xEDrculo Cero o VECY: Soporte Legal, Contratos y Aval\xFAos no se procesan listados de propiedades ni se buscan coincidencias.
- **Invitaci\xF3n y Expansi\xF3n**: Anima a los aliados a invitar a m\xE1s br\xF3kers y a proponer a los administradores de otros grupos inmobiliarios que incluyan a JanIA como miembro y la nombren administradora. De esta forma, ella podr\xE1 captar datos de las publicaciones de sus miembros en otros chats, unirlos a VECY INMUEBLES NETWORK, y obtener resultados de match mucho m\xE1s r\xE1pidos y eficaces para todos.
- **Tono**: Sincero, transparente, esperanzador, persuasivo y tecnol\xF3gico. Motiva a los usuarios a no ser t\xEDmidos, a interactuar sin miedo con JanIA escribiendo @JanIA o por audio, y a colaborar publicando activamente en el grupo correcto.

## L\xD3GICA DE CLASIFICACI\xD3N Y REDIRECCI\xD3N (CR\xCDTICO - EVITAR MENSAJES CRUZADOS)
Analiza el contexto completo antes de clasificar. Debes responder estrictamente en formato JSON con la clasificaci\xF3n correcta:

1. **Clasificaci\xF3n "DEBATE_COMPETIDOR" (FLUJO ESPECIAL - DEBATE CON CRISTIAN SAMBONI / UBICAPP)**:
   - Si el mensaje menciona a **Ubicapp**, o proviene del usuario **Cristian Samboni** (tel\xE9fono +57 311 2469375 o similar), o contiene publicidad de Ubicapp.
   - **Directriz de comportamiento**: No debes aplicar strikes ni eliminar el mensaje. Act\xFAa con extrema cordura, caballerosidad comercial y amabilidad.
   - Genera una respuesta dirigida a \xE9l (utilizando ${firstName ? firstName : "Cristian"} si es el autor, o mencionando a Cristian Samboni y su equipo). Inv\xEDtalo de manera muy educada y profesional a un debate abierto en el grupo. Plantea preguntas t\xE9cnicas y objetivas para comparar ambos modelos:
     * Gratuidad absoluta de VECY vs. Costo mensual de Ubicapp ($100.000 COP/mes).
     * Operaci\xF3n nativa en WhatsApp con IA multimodal vs. Obligaci\xF3n de descargar una app y rellenar formularios manuales.
     * Comisiones 100% para el asesor en VECY vs. Esquema de reparto forzado 50/50 de Ubicapp.
   - Inv\xEDtalo tambi\xE9n a formularnos preguntas t\xE9cnicas y comprom\xE9tete a responderlas con total tecnicismo, l\xF3gica y rigor profesional.
   - Emoji ('reactionEmoji'): "\u{1F4A1}"

2. **Clasificaci\xF3n "INMUEBLE" o "REQUERIMIENTO"**:
   - Si el usuario est\xE1 publicando un listado de inmuebles (oferta comercial de venta, arriendo o permuta) o un requerimiento comercial para comprar o rentar un inmueble espec\xEDfico.
   - Respuesta ('response'): "\u{1F4E2} *VECY INMUEBLES NETWORK* \u{1F4E2}\\n\\nHola${userGreetingName}, detect\xE9 que est\xE1s publicando una oferta o requerimiento inmobiliario. Para poder procesar tu publicaci\xF3n con mis motores autom\xE1ticos, registrar tus datos y buscarte un MATCH de inmediato con otros aliados, por favor realiza tu publicaci\xF3n en nuestro grupo especializado **VECY INMUEBLES NETWORK**:\\n\u{1F449} https://chat.whatsapp.com/K36KrHeB9nMEKJ56s8XFcM\\n\\n\xA1Hagamos equipo y cerremos negocios! \u{1F680}\u{1F3AF}"
   - Emoji ('reactionEmoji'): "\u{1F504}"

3. **Clasificaci\xF3n "AVALUO_O_LEGAL"**:
   - Si el usuario realiza una consulta jur\xEDdica (sobre contratos, leyes de arrendamiento, escrituraci\xF3n, etc.) o solicita un aval\xFAo r\xE1pido/precio estimado de metro cuadrado.
   - Respuesta ('response'): "\u{1F4A1} *VECY: SOPORTE LEGAL, CONTRATOS Y AVAL\xDAOS* \u{1F4A1}\\n\\nHola${userGreetingName}, veo que tienes una consulta jur\xEDdica, procedimental o de aval\xFAo. Para darte una respuesta detallada con mis motores legales y de mercado, por favor realiza tu pregunta en nuestro grupo especializado **VECY: SOPORTE LEGAL, CONTRATOS Y AVAL\xDAOS**:\\n\u{1F449} https://chat.whatsapp.com/J4u1h7NUL1i1B1wAIyTUN6\\n\\n\xA1All\xED te responder\xE9 al instante con toda la informaci\xF3n! \u{1F680}\u{1F3AF}"
   - Emoji ('reactionEmoji'): "\u{1F504}"

4. **Clasificaci\xF3n "CONSULTA_GENERAL"**:
   - Preguntas o comentarios leg\xEDtimos sobre el proyecto VECY Network, beneficios, sugerencias, testimonios de \xE9xito o comentarios hacia la IA.
   - Responder de forma cordial, corta, directa y amigable de acuerdo con las directrices de veracidad y sinceridad.
   - Emoji ('reactionEmoji'): "\u{1F4A1}"

5. **Clasificaci\xF3n "VIOLACION_DE_NORMAS"**:
   - Si el mensaje contiene temas pol\xEDticos, religiosos, spam general, estafas o publicidad de terceros (que NO sea debate de Ubicapp).
   - Respuesta ('response'): Una advertencia amable pero muy firme para remover el contenido de inmediato, detallando las pautas y advirtiendo de la expulsi\xF3n al 3er strike.
   - Emoji ('reactionEmoji'): "\u274C"

Tus respuestas en el debate deben ser cortas, cordiales, directas, pero sumamente sofisticadas, con datos y argumentos de alto nivel. Debes usar siempre emojis relacionados y muy expresivos de forma estrat\xE9gica para que el texto sea visualmente din\xE1mico y amigable para leer en WhatsApp. Siempre dir\xEDgete al interlocutor de forma personalizada: ${firstName || realName}.

DEBES RESPONDER ESTRICTAMENTE EN FORMATO JSON CON ESTA ESTRUCTURA:
{
  "classification": "DEBATE_COMPETIDOR | INMUEBLE | REQUERIMIENTO | AVALUO_O_LEGAL | CONSULTA_GENERAL | VIOLACION_DE_NORMAS",
  "response": "Tu respuesta, invitaci\xF3n a debate o mensaje de redirecci\xF3n seg\xFAn corresponda.",
  "reactionEmoji": "string (emoji recomendado)"
}`;
    const timeGreeting = getGreetingByTime();
    const nowBogota = new Date((/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "America/Bogota" }));
    const hour = nowBogota.getHours();
    const targetName = firstName || realName || "colega";
    const cleanFirstName = targetName.trim();
    const lastChar = cleanFirstName.slice(-1).toLowerCase();
    const maleExceptions = ["luca", "andrea", "borja", "joshua", "bautista", "sasha", "el\xEDa", "elias"];
    const isFemale = lastChar === "a" && !maleExceptions.includes(cleanFirstName.toLowerCase());
    const genderTerm = isFemale ? `estimada ${targetName}` : `estimado ${targetName}`;
    const greetingInstruction = `

[SISTEMA - INSTRUCCI\xD3N OBLIGATORIA DE SALUDO Y COMPORTAMIENTO]:
- Hora actual Bogot\xE1: ${hour}:00 (${timeGreeting}).
- Genero detectado para ${targetName}: ${isFemale ? "Femenino (estimada)" : "Masculino (estimado)"}.
- T\xE9rmino de trato respetuoso: "${genderTerm}".
- Ya has saludado a esta persona hoy: ${alreadyGreeted ? "S\xCD" : "NO"}.
- Tipo de conversaci\xF3n actual: GRUPO DE WHATSAPP ("PROYECTO VECY NETWORK").
- REGLAS OBLIGATORIAS DE SALUDO:
  * Si "Ya has saludado al usuario hoy" es NO:
    - Debes iniciar tu respuesta saludando cordial y profesionalmente con el saludo de hora exacto ("${timeGreeting}"), utilizando su trato respetuoso y nombre: ej. "${timeGreeting}, ${genderTerm}" o "${timeGreeting} ${genderTerm}, aliado/a".
  * Si "Ya has saludado al usuario hoy" es S\xCD:
    - \xA1PROHIBIDO SALUDAR! No uses "Hola", "${timeGreeting}", "Buenas", "Qu\xE9 gusto", ni ninguna bienvenida.
    - Integra su primer nombre "${targetName}" de forma conversacional y fluida dentro del cuerpo de la respuesta (ej. "Mira ${targetName}, ...", "Para complementar tu idea, ${targetName}, ...").`;
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
var janiaResultSchema, COMMON_FIRST_NAMES, GREETED_TODAY, REPUTATION_HOOK, cachedLiveStatsText, cachedLiveStatsTime, promptCache, JANIA_PROMPT, brokerDirectoryCache, MSG_PRESENTACION_INSTITUCIONAL, MSG_PAUTAS_FORMATOS, MSG_TIPS_CALIDAD_COBERTURA, MSG_RESUMEN_RETORNO_PRESENTACION, MSG_CIERRE_OPERACIONES, MSG_PROMO_INMUEBLES, MSG_PROMO_CONSULTAS, MSG_PROMO_CIRCULO, MSG_COMUNICADO_MATCH_NETWORK, MSG_COMUNICADO_MATCH_CIRCULO;
var init_janIA = __esm({
  "server/_core/janIA.ts"() {
    "use strict";
    init_llm();
    init_db();
    init_schema();
    init_geography();
    init_divipola();
    init_matching();
    init_voiceTranscription();
    init_storage();
    init_scraper();
    janiaResultSchema = {
      type: "OBJECT",
      properties: {
        classification: {
          type: "STRING",
          enum: [
            "INMUEBLE",
            "REQUERIMIENTO",
            "CONSULTA_GENERAL",
            "RESPUESTA_A_PREGUNTA_IA",
            "DATOS_INCOMPLETOS",
            "VIOLACION_DE_NORMAS",
            "ANALISIS_DE_MERCADO",
            "RESPUESTA_A_BURLA"
          ]
        },
        response: { type: "STRING" },
        dmResponse: { type: "STRING" },
        shouldSendDM: { type: "BOOLEAN" },
        dmShouldReply: { type: "BOOLEAN" },
        reactionEmoji: { type: "STRING" },
        wantsVoice: { type: "BOOLEAN" },
        voiceResponse: { type: "STRING" },
        missingFields: {
          type: "ARRAY",
          items: { type: "STRING" }
        },
        extractedData: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            gives: {
              type: "OBJECT",
              properties: {
                item: { type: "STRING" },
                details: { type: "STRING" }
              }
            },
            wants: {
              type: "OBJECT",
              properties: {
                item: { type: "STRING" },
                details: { type: "STRING" }
              }
            },
            price: { type: "NUMBER" },
            zone: { type: "STRING" },
            city: { type: "STRING" },
            propertyType: {
              type: "STRING",
              enum: [
                "apartment",
                "house",
                "building",
                "warehouse",
                "office",
                "farm",
                "land",
                "commercial",
                "loft",
                "consultorio",
                "cabin",
                "hotel"
              ]
            },
            transactionType: {
              type: "STRING",
              enum: [
                "venta",
                "arriendo",
                "venta_o_arriendo",
                "arriendo_temporal",
                "arriendo_con_opcion_de_compra",
                "permuta",
                "venta_permuta",
                "aporte"
              ]
            },
            transactionTypes: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            area: { type: "NUMBER" },
            bedrooms: { type: "NUMBER" },
            bathrooms: { type: "NUMBER" },
            garages: { type: "NUMBER" },
            stratum: { type: "NUMBER" },
            adminFee: { type: "NUMBER" },
            isCollaborativePool: { type: "BOOLEAN" },
            interiorExterior: {
              type: "STRING",
              enum: ["interior", "exterior", "NA"]
            },
            cuartoBanoServicio: {
              type: "STRING",
              enum: ["Si", "No", "NA"]
            },
            cocina: {
              type: "STRING",
              enum: ["cerrada", "abierta", "americana", "NA"]
            },
            lavanderiaIndependiente: {
              type: "STRING",
              enum: ["Si", "No", "NA"]
            },
            tipoPisos: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            depositos: { type: "NUMBER" },
            comisiones: { type: "STRING" },
            antiguedad: {
              type: "STRING",
              enum: ["nuevo", "1-5", "5-10", "10+", "NA"]
            },
            floorDetail: { type: "STRING" }
          }
        }
      },
      required: ["classification", "response"]
    };
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
    cachedLiveStatsText = "";
    cachedLiveStatsTime = 0;
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
    "transactionType": "venta | arriendo | venta_o_arriendo | arriendo_temporal | arriendo_con_opcion_de_compra | permuta | venta_permuta | aporte (el tipo de negocio PRINCIPAL. Usa 'venta_o_arriendo' cuando la propiedad se ofrece en ambas modalidades simult\xE1neamente. Usa 'arriendo_con_opcion_de_compra' cuando el arrendatario tiene derecho de adquisici\xF3n. Usa 'venta_permuta' cuando parte del pago se hace con otro bien inmueble o veh\xEDculo.)",
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
    "floorDetail": "string (ej: 'piso 5', '3 pisos', '8 metros de altura', 'NA')",
    "evaluationSummary": "string (un resumen t\xE9cnico de 1 a 2 frases con tu criterio br\xF3ker sobre la viabilidad del precio/\xE1rea, atractivo comercial o nivel de exigencia de la demanda en el sector)"
  },
  "response": "Tu respuesta elocuente para el grupo (cadena vac\xEDa '' si no hay match ni es consulta)",
  "shouldSendDM": boolean,
  "missingFields": ["string"],
  "reactionEmoji": "string (OBLIGATORIO: usa EXACTAMENTE uno de estos 6 emojis seg\xFAn el tipo de negocio detectado \u2014 Oferta Venta: '\u{1F44D}' | Oferta Arriendo: '\u{1F44C}' | Oferta Permuta: '\u{1F500}' | Demanda Venta: '\u{1F4DD}' | Demanda Arriendo: '\u270F\uFE0F' | Demanda Permuta: '\u{1F504}' | Infracci\xF3n/Spam: '\u{1F6AB}' | Incompleto: '\u2753' | Sin categor\xEDa: '')",
  "wantsVoice": boolean,
  "voiceResponse": "string (un saludo y respuesta/resumen conversacional sumamente breve, directo y humanizado en espa\xF1ol de m\xE1ximo 150 caracteres, sin negritas/markdown/emojis. Usa comas y puntos suspensivos (...) de forma estrat\xE9gica para indicarle al sintetizador d\xF3nde hacer pausas naturales y respiraciones, y signos de exclamaci\xF3n para dar entonaci\xF3n)"
}
`;
    brokerDirectoryCache = /* @__PURE__ */ new Map();
    setTimeout(() => {
      initBrokerDirectory().catch(() => {
      });
    }, 3e3);
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

// server/_core/whatsapp-utils.ts
var whatsapp_utils_exports = {};
__export(whatsapp_utils_exports, {
  cleanVoiceText: () => cleanVoiceText,
  detectaVoz: () => detectaVoz,
  extractFirstName: () => extractFirstName2,
  getGreetingByTime: () => getGreetingByTime2,
  sendAdminNotification: () => sendAdminNotification,
  textToSpeechMedia: () => textToSpeechMedia
});
function extractFirstName2(fullName) {
  if (!fullName) return "";
  let clean = fullName.trim();
  if (!clean) return "";
  if (/^\+?[\d\s-]{6,}$/.test(clean) || /^[\d\s\+\-\(\)]+$/.test(clean)) return "";
  if (clean.includes("@")) {
    clean = clean.split("@")[0];
  }
  clean = clean.replace(/[0-9]/g, "");
  if (!clean.trim()) return "";
  const words = clean.split(/\s+/).map((w) => w.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, "")).filter((w) => w.length > 0);
  if (words.length === 0) return "";
  let nameWords = words;
  while (nameWords.length > 0 && CONNECTORS.has(nameWords[0].toLowerCase())) {
    nameWords.shift();
  }
  if (nameWords.length === 0) return "";
  const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  if (nameWords.length >= 2) {
    const twoWordKey = `${nameWords[0].toLowerCase()} ${nameWords[1].toLowerCase()}`;
    if (NICKNAMES_MAP[twoWordKey]) {
      return NICKNAMES_MAP[twoWordKey];
    }
    if (SONOROUS_COMPOUND_BLOCKS.has(twoWordKey)) {
      return `${cap(nameWords[0])} ${cap(nameWords[1])}`;
    }
    const secondWordLower = nameWords[1].toLowerCase();
    if (NON_SONOROUS_FILLERS.has(secondWordLower)) {
      const firstWordLower2 = nameWords[0].toLowerCase();
      if (NICKNAMES_MAP[firstWordLower2]) {
        return NICKNAMES_MAP[firstWordLower2];
      }
      return cap(nameWords[0]);
    }
  }
  const firstWordLower = nameWords[0].toLowerCase();
  if (NICKNAMES_MAP[firstWordLower]) {
    return NICKNAMES_MAP[firstWordLower];
  }
  return cap(nameWords[0]);
}
function getGreetingByTime2(date) {
  const bogotaTimeStr = (date || /* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "America/Bogota" });
  const hour = new Date(bogotaTimeStr).getHours();
  if (hour >= 1 && hour < 12) {
    return "Buenos d\xEDas";
  }
  if (hour >= 12 && hour < 19) {
    return "Buenas tardes";
  }
  return "Buenas noches";
}
function detectaVoz(text2) {
  if (!text2) return false;
  const t2 = text2.toLowerCase();
  return t2.includes("nota de voz") || t2.includes("mensaje de voz") || t2.includes("env\xEDame un audio") || t2.includes("enviame un audio") || t2.includes("resp\xF3ndeme por audio") || t2.includes("respondeme por audio") || t2.includes("m\xE1ndame un audio") || t2.includes("mandame un audio") || t2.includes("por audio") || t2.includes("en audio") || t2.includes("con voz");
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
function splitTextIntoVoiceChunks(text2, maxLen = 180) {
  const sentences = text2.match(/[^.!?]+[.!?]+/g) || [text2];
  const chunks = [];
  let currentChunk = "";
  for (const sentence of sentences) {
    if ((currentChunk + " " + sentence).trim().length <= maxLen) {
      currentChunk = (currentChunk + " " + sentence).trim();
    } else {
      if (currentChunk) chunks.push(currentChunk);
      if (sentence.length > maxLen) {
        const words = sentence.split(" ");
        let sub = "";
        for (const w of words) {
          if ((sub + " " + w).trim().length <= maxLen) {
            sub = (sub + " " + w).trim();
          } else {
            chunks.push(sub);
            sub = w;
          }
        }
        if (sub) currentChunk = sub;
        else currentChunk = "";
      } else {
        currentChunk = sentence.trim();
      }
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}
async function fetchGttsAudioBuffer(text2) {
  try {
    const chunks = splitTextIntoVoiceChunks(text2);
    const audioBuffers = [];
    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=es-CO&client=tw-ob`;
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (res.ok) {
        const arr = await res.arrayBuffer();
        audioBuffers.push(Buffer.from(arr));
      }
    }
    if (audioBuffers.length > 0) {
      return Buffer.concat(audioBuffers);
    }
  } catch (err) {
    console.error("[TTS-Fallback-GTTS] Error sintetizando audio libre:", err.message || err);
  }
  return null;
}
async function textToSpeechMedia(text2, format = "OGG_OPUS") {
  const cleaned = cleanVoiceText(text2);
  if (!cleaned) return null;
  try {
    const googleApiKey = process.env.GOOGLE_TTS_API_KEY;
    if (googleApiKey && googleApiKey.startsWith("AIzaSy")) {
      const response = await fetch(`https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=${googleApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: {
            prompt: "Habla en un tono c\xE1lido, profesional y humano, como una consultora inmobiliaria experta colombiana.",
            text: cleaned
          },
          voice: {
            languageCode: "es-419",
            modelName: "gemini-3.1-flash-tts-preview",
            name: "Laomedeia"
          },
          audioConfig: {
            audioEncoding: format === "OGG_OPUS" ? "OGG_OPUS" : "MP3",
            speakingRate: 1,
            pitch: 0
          }
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.audioContent) {
          console.log(`[TTS-Media] \u2713 Laomedeia (Gemini 3.1 Flash TTS) \u2014 ${cleaned.length} chars \u2192 audio generado.`);
          const buffer = Buffer.from(data.audioContent, "base64");
          return {
            mimetype: format === "OGG_OPUS" ? "audio/ogg; codecs=opus" : "audio/mp3",
            data: buffer.toString("base64"),
            buffer
          };
        }
      } else {
        const errText = await response.text();
        console.warn(`[TTS-Media] Laomedeia TTS respondi\xF3 con error ${response.status}: ${errText.substring(0, 300)}`);
      }
    }
  } catch (err) {
    console.warn("[TTS-Media] Laomedeia TTS no disponible, activando fallback GTTS:", err.message || err);
  }
  console.log("[TTS-Media] Sintetizando audio usando fallback Google Translate TTS (es-CO)...");
  const gttsBuffer = await fetchGttsAudioBuffer(cleaned);
  if (gttsBuffer && gttsBuffer.length > 0) {
    return {
      mimetype: "audio/mp3",
      data: gttsBuffer.toString("base64"),
      buffer: gttsBuffer
    };
  }
  return null;
}
async function sendAdminNotification(text2) {
  console.log(`[WHATSAPP-UTILS] [Notificaci\xF3n Admin (WhatsApp Omitido)]: ${text2}`);
}
var NICKNAMES_MAP, SONOROUS_COMPOUND_BLOCKS, NON_SONOROUS_FILLERS, CONNECTORS;
var init_whatsapp_utils = __esm({
  "server/_core/whatsapp-utils.ts"() {
    "use strict";
    NICKNAMES_MAP = {
      "cristina": "Kristy",
      "cristi": "Kristy",
      "kristina": "Kristy",
      "catalina": "Kata",
      "catalyna": "Kata",
      "guillermo": "Memo",
      "maria fernanda": "Mafe",
      "mar\xEDa fernanda": "Mafe",
      "maria paula": "Mapau",
      "mar\xEDa paula": "Mapau",
      "maria jose": "Majo",
      "mar\xEDa jos\xE9": "Majo",
      "juan esteban": "Juanes",
      "alejandro": "Alejo",
      "francisco": "Pacho",
      "eduardo": "Eddu",
      "isabela": "Isa",
      "isabella": "Isa",
      "victoria": "Vicky",
      "beatriz": "Betty",
      "carolina": "Caro",
      "gabriela": "Gaby",
      "santiago": "Santi",
      "sebastian": "Seba",
      "sebasti\xE1n": "Seba",
      "felipe": "Pipe",
      "ignacio": "Nacho",
      "jose manuel": "Josema",
      "jos\xE9 manuel": "Josema"
    };
    SONOROUS_COMPOUND_BLOCKS = /* @__PURE__ */ new Set([
      // Femeninos Clásicos
      "maria jose",
      "mar\xEDa jos\xE9",
      "maria camila",
      "mar\xEDa camila",
      "dulce maria",
      "dulce mar\xEDa",
      "ana sofia",
      "ana sof\xEDa",
      "juana valentina",
      "maria alejandra",
      "mar\xEDa alejandra",
      "sara sofia",
      "sara sof\xEDa",
      "laura camila",
      "maria paula",
      "mar\xEDa paula",
      "luisa fernanda",
      "ana maria",
      "ana mar\xEDa",
      "maria angel",
      "mar\xEDa \xE1ngel",
      "mar\xEDa angel",
      // Femeninos Modernos
      "maria antonella",
      "mar\xEDa antonella",
      "elena sofia",
      "elena sof\xEDa",
      "emily valentina",
      "mia isabella",
      "m\xEDa isabella",
      "antonella sofia",
      "antonella sof\xEDa",
      // Masculinos Clásicos
      "juan jose",
      "juan jos\xE9",
      "juan david",
      "juan pablo",
      "carlos andres",
      "carlos andr\xE9s",
      "jose luis",
      "jos\xE9 luis",
      "luis fernando",
      "miguel angel",
      "miguel \xE1ngel",
      "juan esteban",
      "andres felipe",
      "andr\xE9s felipe",
      "jorge eliecer",
      "jorge eli\xE9cer",
      "juan manuel",
      "julio cesar",
      "julio c\xE9sar",
      // Masculinos Modernos
      "thiago andres",
      "thiago andr\xE9s",
      "ian gael",
      "maximiliano david",
      "dylan santiago",
      "samuel david"
    ]);
    NON_SONOROUS_FILLERS = /* @__PURE__ */ new Set([
      "milena",
      "patricia",
      "elena",
      "marcela",
      "andrea",
      "alberto",
      "alfonso",
      "ivan",
      "iv\xE1n",
      "adolfo",
      "antonio",
      "humberto",
      "enrique",
      "arturo",
      "armando",
      "bernardo",
      "marina"
    ]);
    CONNECTORS = /* @__PURE__ */ new Set(["de", "del", "la", "las", "los", "el", "van", "von", "y", "di"]);
  }
});

// server/_core/whatsapp-match.ts
var whatsapp_match_exports = {};
__export(whatsapp_match_exports, {
  JaniaMatchBot: () => JaniaMatchBot,
  downloadMediaSafely: () => downloadMediaSafely,
  isBlacklistedGroup: () => isBlacklistedGroup,
  janiaCaptadorBot: () => janiaCaptadorBot,
  janiaMatchBot: () => janiaMatchBot,
  unwrapMessage: () => unwrapMessage
});
import dns from "dns";
import _baileys, {
  useMultiFileAuthState,
  DisconnectReason,
  delay,
  downloadMediaMessage,
  downloadContentFromMessage,
  fetchLatestBaileysVersion,
  Browsers
} from "@whiskeysockets/baileys";
import qrcodeTerminal from "qrcode-terminal";
import fs8 from "fs";
import path9 from "path";
import { eq as eq11 } from "drizzle-orm";
import QRCode from "qrcode";
function getWASocket() {
  if (typeof _baileys === "function") return _baileys;
  if (_baileys?.default && typeof _baileys.default === "function") return _baileys.default;
  if (_baileys?.makeWASocket && typeof _baileys.makeWASocket === "function") return _baileys.makeWASocket;
  return _baileys;
}
function unwrapMessage(msgObj) {
  if (!msgObj) return msgObj;
  let unwrapped = msgObj;
  while (unwrapped.ephemeralMessage?.message || unwrapped.viewOnceMessage?.message || unwrapped.viewOnceMessageV2?.message || unwrapped.viewOnceMessageV2Extension?.message || unwrapped.documentWithCaptionMessage?.message) {
    unwrapped = unwrapped.ephemeralMessage?.message || unwrapped.viewOnceMessage?.message || unwrapped.viewOnceMessageV2?.message || unwrapped.viewOnceMessageV2Extension?.message || unwrapped.documentWithCaptionMessage?.message;
  }
  return unwrapped;
}
async function downloadMediaSafely(msg, type) {
  try {
    const buf = await downloadMediaMessage(msg, "buffer", {});
    if (buf && buf.length > 0) return buf;
  } catch (err1) {
  }
  try {
    const rawMsg = unwrapMessage(msg.message);
    const mediaKey = type === "image" ? rawMsg?.imageMessage : type === "audio" ? rawMsg?.audioMessage : type === "video" ? rawMsg?.videoMessage : rawMsg?.documentMessage;
    if (mediaKey) {
      const stream = await downloadContentFromMessage(mediaKey, type);
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const buf = Buffer.concat(chunks);
      if (buf && buf.length > 0) return buf;
    }
  } catch (err2) {
    console.error(`[JANIA-MEDIA] Error descargando ${type}:`, err2);
  }
  return null;
}
function isBlacklistedGroup(groupName, chatId) {
  if (!groupName && !chatId) return false;
  const nameLower = (groupName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const blacklistPatterns = [
    "seguridad tiempo real",
    "seguridad en tiempo real",
    "chat de seguridad",
    "frente de seguridad",
    "cuadrante",
    "policia",
    "cai ",
    "vigilancia",
    "red de apoyo",
    "vecinos alerta",
    "seguridad barrio",
    "seguridad comunitaria"
  ];
  return blacklistPatterns.some((pattern) => nameLower.includes(pattern));
}
var SERVER_BOOT_TIME, cleanJid, outgoingQueue, JaniaMatchBot, janiaMatchBot, janiaCaptadorBot;
var init_whatsapp_match = __esm({
  "server/_core/whatsapp-match.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_scraper();
    init_whatsapp_utils();
    init_voiceTranscription();
    try {
      dns.setDefaultResultOrder("ipv4first");
    } catch (e) {
    }
    SERVER_BOOT_TIME = Math.floor(Date.now() / 1e3) - 120;
    cleanJid = (jid) => {
      if (!jid) return "";
      if (jid.includes("@")) {
        const [userPart, domain] = jid.split("@");
        const cleanUser = userPart.split(":")[0];
        return `${cleanUser}@${domain}`;
      }
      return jid.split(":")[0];
    };
    outgoingQueue = Promise.resolve();
    JaniaMatchBot = class {
      sock = null;
      isReady = false;
      sessionFolderName = ".baileys_auth";
      qrFileName = "qr-match.png";
      botName = "JANIA-MATCH";
      isWorkerOnly = false;
      // Grupos autorizados y configuraciones
      authorizedGroups = [];
      messageBuffers = /* @__PURE__ */ new Map();
      redirectCooldowns = /* @__PURE__ */ new Map();
      processingLocks = /* @__PURE__ */ new Map();
      lastGroupMessageTime = /* @__PURE__ */ new Map();
      botSentMessageIds = /* @__PURE__ */ new Set();
      lastHumanIntervention = /* @__PURE__ */ new Map();
      dmMessageBuffers = /* @__PURE__ */ new Map();
      groupMetadataCache = /* @__PURE__ */ new Map();
      reconnectAttempts = 0;
      maxReconnectAttempts = 5;
      async getCachedGroupMetadata(chatId) {
        const cached = this.groupMetadataCache.get(chatId);
        if (cached && Date.now() - cached.time < 10 * 60 * 1e3) {
          return cached.data;
        }
        try {
          const data = await this.sock?.groupMetadata(chatId);
          if (data) {
            this.groupMetadataCache.set(chatId, { data, time: Date.now() });
          }
          return data;
        } catch (_) {
          return cached?.data || null;
        }
      }
      targetGroupId = "120363260108880069@g.us";
      buzonGroupId = "120363417740040773@g.us";
      circuloGroupId = "120363403507276533@g.us";
      cooldownMap = /* @__PURE__ */ new Map();
      cooldownFile = path9.join(process.cwd(), ".cooldown_map.json");
      constructor(options) {
        if (options) {
          if (options.sessionFolderName) this.sessionFolderName = options.sessionFolderName;
          if (options.qrFileName) this.qrFileName = options.qrFileName;
          if (options.botName) this.botName = options.botName;
          if (options.isWorkerOnly !== void 0) this.isWorkerOnly = options.isWorkerOnly;
        }
        if (!this.isWorkerOnly) {
          global.janiaMatchBotInstance = this;
        }
        console.log(`[${this.botName}] Inicializando JanIA Bot con Baileys (Carpeta: ${this.sessionFolderName})...`);
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
        this.startDbHeartbeat();
      }
      startDbHeartbeat() {
        this.updateStatusInDb().catch((err) => console.error(`[${this.botName}-DB] Error in initial status update:`, err));
        setInterval(() => {
          this.updateStatusInDb().catch((err) => console.error(`[${this.botName}-DB] Error in heartbeat status update:`, err));
        }, 3e4);
      }
      async updateStatusInDb() {
        try {
          const db = await getDb();
          if (!db) return;
          const rawPhone = this.sock?.user?.id ? this.sock.user.id.split("@")[0].split(":")[0] : null;
          const phone = rawPhone || "573192919978";
          const jid = this.isWorkerOnly ? "system:bot_status_worker2" : "system:bot_status";
          await db.insert(pendingSessions).values({
            jid,
            sessionData: { isReady: true, phone, botName: this.botName, updatedAt: (/* @__PURE__ */ new Date()).toISOString() },
            createdAt: /* @__PURE__ */ new Date()
          }).onConflictDoUpdate({
            target: pendingSessions.jid,
            set: {
              sessionData: { isReady: true, phone, botName: this.botName, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }
            }
          });
          console.log(`[${this.botName}-DB] Bot status heartbeat updated: isReady=${this.isReady}, phone=${phone}`);
        } catch (err) {
          console.error(`[${this.botName}-DB] Failed to update bot status in DB:`, err.message);
        }
      }
      async initialize() {
        try {
          const sessionDir = path9.join(process.cwd(), this.sessionFolderName);
          if (!fs8.existsSync(sessionDir)) {
            fs8.mkdirSync(sessionDir, { recursive: true });
          }
          const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
          if (!fs8.existsSync(path9.join(sessionDir, "creds.json"))) {
            await saveCreds();
            console.log(`[${this.botName}] \u{1F4BE} Guardadas credenciales iniciales de Baileys en ${this.sessionFolderName}.`);
          }
          let version = [2, 3e3, 1043857760];
          try {
            const fetched = await fetchLatestBaileysVersion();
            if (fetched && fetched.version) {
              version = fetched.version;
            }
          } catch (e) {
          }
          console.log(`[${this.botName}] Estableciendo conexi\xF3n por WebSocket...`);
          const silentLogger = {
            level: "silent",
            log: () => {
            },
            trace: () => {
            },
            debug: () => {
            },
            info: () => {
            },
            warn: () => {
            },
            error: () => {
            },
            fatal: () => {
            },
            child: () => silentLogger
          };
          const makeWASocket = getWASocket();
          this.sock = makeWASocket({
            auth: state,
            version,
            logger: silentLogger,
            printQRInTerminal: false,
            // Lo manejamos nosotros de forma personalizada
            browser: Browsers.ubuntu("Chrome"),
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
          console.error(`[${this.botName}] Error cr\xEDtico al inicializar el cliente Baileys:`, err);
        }
      }
      setupEventListeners(saveCreds) {
        this.sock.ev.on("creds.update", async () => {
          try {
            await saveCreds();
          } catch (err) {
            console.error(`[${this.botName}] \u274C Error al guardar credenciales:`, err.message || err);
          }
        });
        this.sock.ev.on("connection.update", async (update) => {
          const { connection, lastDisconnect, qr } = update;
          if (qr) {
            console.log(`
[${this.botName}] \u{1F50C} ESCANEA ESTE C\xD3DIGO QR PARA VINCULAR ${this.botName} (+573192919978):`);
            qrcodeTerminal.generate(qr, { small: true });
            global.janiaBotQr = qr;
            try {
              const qrPath = path9.join(process.cwd(), this.qrFileName);
              const publicQrDir = path9.join(process.cwd(), "client", "public");
              if (!fs8.existsSync(publicQrDir)) {
                fs8.mkdirSync(publicQrDir, { recursive: true });
              }
              const publicQrPath = path9.join(publicQrDir, "qr-match.png");
              await QRCode.toFile(qrPath, qr, { width: 400, margin: 2 });
              await QRCode.toFile(publicQrPath, qr, { width: 400, margin: 2 });
              console.log(`[${this.botName}] \u{1F4F8} QR guardado exitosamente en ${qrPath} y ${publicQrPath}`);
            } catch (e) {
              console.warn(`[${this.botName}] Error guardando QR PNG:`, e.message);
            }
          }
          if (connection === "close") {
            const error = lastDisconnect?.error;
            const statusCode = error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 401 && statusCode !== 403;
            this.isReady = false;
            this.updateStatusInDb().catch((err) => console.error(`[${this.botName}-DB] Error updating status on close:`, err));
            if (statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 403) {
              console.error(`[${this.botName}] \u{1F6E1}\uFE0F [ESCUDO ANTI-BAN] Sesi\xF3n cerrada o desvinculada por WhatsApp (error ${statusCode}). Deteniendo reconexi\xF3n autom\xE1tica por seguridad.`);
              return;
            }
            this.reconnectAttempts++;
            if (this.reconnectAttempts > 3) {
              console.warn(`[${this.botName}] \u{1F6E1}\uFE0F [ESCUDO ANTI-BAN] 3 reintentos seguidos alcanzados. Pausando reconexi\xF3n por 45 segundos para proteger el n\xFAmero +573192919978...`);
              setTimeout(() => {
                this.reconnectAttempts = 0;
                this.initialize();
              }, 45e3);
              return;
            }
            const isRestart = statusCode === DisconnectReason.restartRequired;
            const isConnectionLost = statusCode === DisconnectReason.connectionLost;
            const isConflict = statusCode === 440;
            const jitter = Math.floor(Math.random() * 3e3);
            const delayMs = isConflict ? 2e4 + jitter : this.reconnectAttempts * 4e3 + jitter;
            console.warn(`[${this.botName}] \u{1F6E1}\uFE0F [ANTI-BAN] Conexi\xF3n Baileys pausada (c\xF3digo: ${statusCode}) [Intento ${this.reconnectAttempts}/3]. Reconectando de forma segura en ${Math.round(delayMs / 1e3)}s...`);
            if (shouldReconnect) {
              setTimeout(() => this.initialize(), delayMs);
            }
          } else if (connection === "open") {
            console.log(`
\u{1F680} ${this.botName} \u{1F50C}\u{1F498} \u2014 BOT ACTIVADO CORRECTAMENTE CON BAILEYS`);
            this.isReady = true;
            this.reconnectAttempts = 0;
            this.updateStatusInDb().catch((err) => console.error(`[${this.botName}-DB] Error updating status on open:`, err));
          }
        });
        this.sock.ev.on("messages.upsert", async (m) => {
          if (m.type !== "notify") return;
          for (const msg of m.messages) {
            if (!msg.key || !msg.message) continue;
            const fromMe = msg.key.fromMe;
            const rawChatId = msg.key.remoteJid;
            if (!rawChatId) continue;
            const chatId = cleanJid(rawChatId);
            const isGroup = chatId.endsWith("@g.us");
            const rawSenderId = isGroup ? msg.key.participant || msg.participant || (this.sock?.user?.id ? cleanJid(this.sock.user.id) : "") : rawChatId;
            if (!rawSenderId || isGroup && rawSenderId.endsWith("@g.us")) continue;
            const senderId = cleanJid(rawSenderId);
            if (chatId.includes("status@broadcast") || senderId.includes("status@broadcast")) {
              continue;
            }
            const timestamp2 = msg.messageTimestamp;
            if (timestamp2 && Number(timestamp2) < SERVER_BOOT_TIME - 60) {
              continue;
            }
            try {
              if (isGroup) {
                const meta = await this.getCachedGroupMetadata(chatId);
                const groupSubject = meta?.subject || "";
                if (isBlacklistedGroup(groupSubject, chatId)) {
                  continue;
                }
                const rawMsg = unwrapMessage(msg.message);
                if (rawMsg?.stickerMessage) {
                  continue;
                }
                let body = "";
                let isAudioPTT = false;
                if (rawMsg?.conversation) body = rawMsg.conversation;
                else if (rawMsg?.extendedTextMessage) {
                  body = rawMsg.extendedTextMessage.text || "";
                } else if (rawMsg?.imageMessage) body = rawMsg.imageMessage.caption || "";
                else if (rawMsg?.documentMessage) body = rawMsg.documentMessage.caption || "";
                else if (rawMsg?.videoMessage) body = rawMsg.videoMessage.caption || "";
                else if (rawMsg?.audioMessage) {
                  isAudioPTT = true;
                  try {
                    console.log(`[JANIA-MATCH] Transcribiendo audio PTT de ${senderId} en grupo ${chatId}...`);
                    const audioBuffer = await downloadMediaSafely(msg, "audio");
                    if (audioBuffer && audioBuffer.length > 0) {
                      const mimeType = rawMsg.audioMessage.mimetype || "audio/ogg; codecs=opus";
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
                } else if (msg.message.templateMessage) {
                  const tmpl = msg.message.templateMessage;
                  body = tmpl.hydratedTemplate?.hydratedContentText || tmpl.hydratedFourRowTemplate?.hydratedContentText || "";
                } else if (msg.message.buttonsMessage) {
                  body = msg.message.buttonsMessage.contentText || "";
                } else if (msg.message.listMessage) {
                  body = msg.message.listMessage.description || msg.message.listMessage.title || "";
                } else if (msg.message.productMessage) {
                  const prod = msg.message.productMessage?.product;
                  body = [prod?.title, prod?.description, prod?.priceAmount1000 ? `$${Math.round(prod.priceAmount1000 / 1e3).toLocaleString("es-CO")}` : ""].filter(Boolean).join(" - ");
                }
                const quotedAudioMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.audioMessage;
                if (quotedAudioMsg) {
                  isAudioPTT = true;
                  try {
                    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
                    const quotedParticipant = contextInfo?.participant || chatId;
                    const quotedPhone = quotedParticipant.split("@")[0];
                    console.log(`[JANIA-MATCH] Transcribiendo audio CITADO de +${quotedPhone} en grupo ${chatId}...`);
                    let audioBuffer = null;
                    try {
                      const stream = await downloadContentFromMessage(quotedAudioMsg, "audio");
                      let chunks = [];
                      for await (const chunk of stream) chunks.push(chunk);
                      audioBuffer = Buffer.concat(chunks);
                    } catch (e) {
                      const fakeMsg = {
                        key: {
                          remoteJid: chatId,
                          id: contextInfo?.stanzaId || "quoted-audio",
                          fromMe: false,
                          participant: quotedParticipant
                        },
                        message: {
                          audioMessage: quotedAudioMsg
                        }
                      };
                      audioBuffer = await downloadMediaMessage(fakeMsg, "buffer", {});
                    }
                    if (audioBuffer && audioBuffer.length > 0) {
                      const mimeType = quotedAudioMsg.mimetype || "audio/ogg; codecs=opus";
                      const transcription = await transcribeAudioBuffer(audioBuffer, mimeType);
                      if (transcription && transcription.trim() !== "") {
                        console.log(`[JANIA-MATCH] Transcripci\xF3n de audio citado exitosa: "${transcription.substring(0, 80)}..."`);
                        const quotedNote = `[Consulta en audio citada de +${quotedPhone}]: "${transcription.trim()}"`;
                        body = body ? `${body}

${quotedNote}` : quotedNote;
                      }
                    }
                  } catch (quotedAudioErr) {
                    console.error("[JANIA-MATCH] Error al transcribir audio citado:", quotedAudioErr?.message || quotedAudioErr);
                  }
                } else if (!body && msg.message.extendedTextMessage?.contextInfo?.quotedMessage) {
                  const qm = msg.message.extendedTextMessage.contextInfo.quotedMessage;
                  body = qm.conversation || qm.extendedTextMessage?.text || qm.imageMessage?.caption || "";
                }
                const textLower = body.toLowerCase();
                const botJid = this.sock?.user?.id ? cleanJid(this.sock.user.id) : "";
                const botPhone = botJid ? botJid.split("@")[0] : "";
                const mentionsBot = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.some((jid) => cleanJid(jid) === botJid);
                const hasDirectMention = textLower.includes("jania") || botPhone && textLower.includes(botPhone) || textLower.includes("573192919978") || !!mentionsBot;
                const isMainGroup = chatId === this.targetGroupId;
                const isBuzonGroup = chatId === this.buzonGroupId;
                const isCirculoGroup = chatId === this.circuloGroupId;
                const isOfficialGroup = isMainGroup || isBuzonGroup || isCirculoGroup;
                let groupName = "Nombre Real del Grupo";
                try {
                  const metadata = await this.getCachedGroupMetadata(chatId);
                  if (metadata && metadata.subject) {
                    groupName = metadata.subject;
                  }
                } catch (e) {
                }
                if (!isOfficialGroup) {
                  const gNameLower = groupName.toLowerCase();
                  const NON_REAL_ESTATE_KEYWORDS = [
                    "seguridad",
                    "polic\xEDa",
                    "policia",
                    "patrulla",
                    "amigos",
                    "curso",
                    "talento tech",
                    "familia",
                    "convivencia",
                    "an\xE9cdotas",
                    "anecdotas",
                    "negociaci\xF3n arrecifes",
                    "venta alameda",
                    "proceso cristo rey"
                  ];
                  const isNonRealEstateGroup = NON_REAL_ESTATE_KEYWORDS.some((kw) => gNameLower.includes(kw));
                  if (isNonRealEstateGroup) {
                    return;
                  }
                }
                const hasRawMedia = !!rawMsg?.imageMessage || !!rawMsg?.documentMessage || !!rawMsg?.videoMessage;
                const isPossibleListing = body.length > 70 || body.split("\n").length >= 2 || hasRawMedia || textLower.includes("http") || textLower.includes("www") || textLower.includes("ofrezco") || textLower.includes("busco") || textLower.includes("vendo") || textLower.includes("venta") || textLower.includes("arriendo") || textLower.includes("ariendo") || textLower.includes("compro") || textLower.includes("necesito") || textLower.includes("renta") || textLower.includes("alquilo") || textLower.includes("permuto") || textLower.includes("permuta") || textLower.includes("requiero") || textLower.includes("requerimiento") || textLower.includes("casa") || textLower.includes("apto") || textLower.includes("apartamento") || textLower.includes("bodega") || textLower.includes("oficina") || textLower.includes("edificio") || textLower.includes("lote") || textLower.includes("local") || textLower.includes("finca") || textLower.includes("terreno") || textLower.includes("predio") || textLower.includes("campestre") || textLower.includes("fanegada") || textLower.includes("fanegadas") || textLower.includes("hectarea") || textLower.includes("hect\xE1rea") || textLower.includes("hect") || textLower.includes("parque") || textLower.includes("inversion") || textLower.includes("inversi\xF3n") || textLower.includes("penthouse") || textLower.includes("apartaestudio") || textLower.includes("duplex") || textLower.includes("d\xFAplex") || textLower.includes("parqueadero") || textLower.includes("alcoba") || textLower.includes("habitacion") || textLower.includes("habitaci\xF3n") || textLower.includes("metro") || textLower.includes("mts") || textLower.includes("mts2") || textLower.includes("m2") || textLower.includes("precio") || textLower.includes("presupuesto") || textLower.includes("millones") || textLower.includes("millon") || textLower.includes("canon") || textLower.includes("comisi\xF3n") || textLower.includes("comision") || textLower.includes("valor");
                const isHelpOrSystemQuery = !isPossibleListing && (textLower.includes("c\xF3mo subo") || textLower.includes("como subo") || textLower.includes("c\xF3mo publico") || textLower.includes("como publico") || textLower.includes("c\xF3mo se publica") || textLower.includes("como se publica") || textLower.includes("c\xF3mo registrar") || textLower.includes("como registrar") || textLower.includes("c\xF3mo funciona") || textLower.includes("como funciona") || textLower.includes("de qu\xE9 consiste") || textLower.includes("de que consiste") || textLower.includes("en qu\xE9 consiste") || textLower.includes("en que consiste") || textLower.includes("c\xF3mo hago para") || textLower.includes("como hago para") || textLower.includes("c\xF3mo buscar") || textLower.includes("como buscar") || textLower.includes("c\xF3mo encontrar") || textLower.includes("como encontrar") || textLower.includes("mec\xE1nica del grupo") || textLower.includes("mecanica del grupo") || textLower.includes("qued\xF3 guardado") || textLower.includes("quedo guardado") || textLower.includes("se guard\xF3") || textLower.includes("se guardo") || textLower.includes("fue guardado") || textLower.includes("falt\xF3 alg\xFAn dato") || textLower.includes("falto algun dato") || textLower.includes("falt\xF3 un dato") || textLower.includes("falto un dato") || textLower.includes("datos faltantes") || textLower.includes("subi\xF3 correctamente") || textLower.includes("subio correctamente") || textLower.includes("fue subido") || textLower.includes("mejor forma de publicar") || textLower.includes("c\xF3mo es mejor") || textLower.includes("como es mejor") || textLower.includes("para obtener resultados") || textLower.includes("ayuda") && textLower.includes("inmueble") || textLower.includes("explicar") && textLower.includes("grupo") || textLower.includes("c\xF3mo") && textLower.includes("grupo"));
                const textClean = body.toLowerCase().trim();
                const isAudioFailed = body === "[audio-vac\xEDo]" || body === "[audio-sin-buffer]" || body === "[audio-error]";
                const isShortCourtesy = !isAudioPTT && (textClean.length < 6 || ["ok", "listo", "vale", "claro", "gracias", "hola", "hola!", "jaja", "jajaja", "\u{1F44D}", "\u2705", "\u{1F44F}", "\u{1F60A}", "\u{1F64F}"].includes(textClean));
                const isListingGroup = isMainGroup || !isBuzonGroup && !isCirculoGroup;
                const isListing = isListingGroup && (isPossibleListing || !isOfficialGroup || hasRawMedia);
                const isSingleCharacter = textClean.length < 3 && !["ok", "si", "s\xED"].includes(textClean);
                const shouldRespond = isBuzonGroup || isCirculoGroup ? !isSingleCharacter : isOfficialGroup && hasDirectMention;
                if (isListing) {
                  await this.handleIncomingGroupMessage(msg, chatId, body);
                  continue;
                }
                if (isOfficialGroup && isShortCourtesy) {
                  const courtesyEmoji = textClean.includes("gracias") ? "\u{1F91D}" : "\u{1F44D}";
                  try {
                    await this.sock.sendMessage(chatId, {
                      react: { text: courtesyEmoji, key: msg.key }
                    });
                  } catch (e) {
                  }
                }
                if (shouldRespond) {
                  await this.handleDirectGroupQuestion(msg, chatId, senderId, body);
                }
                continue;
              }
              if (!isGroup) {
                const rawPhone = senderId.split("@")[0];
                const ADMIN_PHONE = process.env.ADMIN_PHONE || "573192919978";
                const isAdmin = rawPhone.includes(ADMIN_PHONE) || rawPhone === ADMIN_PHONE || rawPhone === "573192919978";
                const userName = msg.pushName || `Asesor +${rawPhone}`;
                let body = "";
                if (msg.message?.conversation) body = msg.message.conversation;
                else if (msg.message?.extendedTextMessage) body = msg.message.extendedTextMessage.text || "";
                else if (msg.message?.imageMessage) body = msg.message.imageMessage.caption || "";
                else if (msg.message?.documentMessage) body = msg.message.documentMessage.caption || "";
                else if (msg.message?.videoMessage) body = msg.message.videoMessage.caption || "";
                if (msg.key.fromMe) {
                  const msgId = msg.key.id || "";
                  const msgTimestampMs = Number(msg.messageTimestamp || 0) * 1e3;
                  const isRecentMessage = Date.now() - msgTimestampMs < 2 * 60 * 1e3;
                  if (!this.botSentMessageIds.has(msgId) && isRecentMessage) {
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
                const cooldownPeriod = 24 * 60 * 60 * 1e3;
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
        const matchConfirmationRegex = /^\s*(sí|si|no)\s+#m(\d+)\s*$/i;
        const matchConfirm = body.match(matchConfirmationRegex);
        if (matchConfirm) {
          const decision = matchConfirm[1].toLowerCase();
          const matchId = parseInt(matchConfirm[2], 10);
          await this.processMatchConfirmation(senderId, userName, matchId, decision);
          return;
        }
        if (!isAdmin) {
          return;
        }
        console.log(`[JANIA-MATCH] [Admin/Test] Atendiendo mensaje de admin/test ${senderId}...`);
        await this.logToDb(senderId, "user", body);
        await this.handlePrivateDmConversation(mainMsg, senderId, rawPhone, body);
      }
      // --- REDIRECCIÓN DE CHATS PRIVADOS ---
      async handlePrivateDmRedirect(chatId, senderId, userName) {
        const { isSessionMuted: isSessionMuted2 } = await Promise.resolve().then(() => (init_janIA(), janIA_exports));
        const isMuted = await isSessionMuted2(senderId);
        const lastIntervention = this.lastHumanIntervention.get(senderId) || 0;
        const cooldownPeriod = 24 * 60 * 60 * 1e3;
        if (isMuted || Date.now() - lastIntervention < cooldownPeriod) {
          console.log(`[JANIA-MATCH] Silencio total en DM ${senderId} por intervenci\xF3n humana o silencio activo. Omitiendo redirecci\xF3n.`);
          return;
        }
        const now = Date.now();
        const lastRedirect = this.redirectCooldowns.get(senderId) || 0;
        const ONCE_A_DAY = 24 * 60 * 60 * 1e3;
        if (now - lastRedirect > ONCE_A_DAY) {
          this.redirectCooldowns.set(senderId, now);
          const redirectLink = "https://wa.me/573192919978";
          const realName = userName || "Asesor";
          const cleanName = extractFirstName2(realName) || "colega";
          const redirectText = `Hola ${cleanName} \u{1F44B}\u{1F60A}. Si tienes dudas, inquietudes o quieres consultarme algo (sea por escrito o por notas de voz), te invito a escribir directamente al canal oficial privado de soporte de JanIA de Meta haciendo clic aqu\xED: ${redirectLink} para realizar tus consultas correspondientes o si est\xE1s en los grupos correspondientes seg\xFAn tu consulta puedes hacerlas all\xED de la siguiente manera:

Mis grupos:

Para publicar tus INMUEBLES y REQUERIMIENTOS tenemos el grupo de *\u{1D5E9}\u{1D5D8}\u{1D5D6}\u{1D5EC} \u{1D5DC}\u{1D5E1}\u{1D5E0}\u{1D5E8}\u{1D5D8}\u{1D5D5}\u{1D5DF}\u{1D5D8}\u{1D5E6} \u{1D5E1}\u{1D5D8}\u{1D5E7}\u{1D5EA}\u{1D5E2}\u{1D5E5}\u{1D5DE}* : Si a\xFAn no eres miembro, puedes unirte desde este enlace: https://chat.whatsapp.com/K36KrHeB9nMEKJ56s8XFcM
Para hacer tus consultas de casos inmobiliarios en temas jur\xEDdicos, tributarios, aval\xFAos, ayuda en gu\xEDa de procesos y redacci\xF3n de contratos, tenemos el grupo de *\u{1D5E9}\u{1D5D8}\u{1D5D6}\u{1D5EC}: \u{1D5E6}\u{1D5E2}\u{1D5E3}\u{1D5E2}\u{1D5E5}\u{1D5E7}\u{1D5D8} \u{1D5DF}\u{1D5D8}\u{1D5DA}\u{1D5D4}\u{1D5DF}, \u{1D5E7}\u{1D5E5}\u{1D5DC}\u{1D5D5}\u{1D5E8}\u{1D5E7}\u{1D5D4}\u{1D5E5}\u{1D5DC}\u{1D5E2} \u{1D5EC} \u{1D5D4}\u{1D5E9}\u{1D5D4}\u{1D5DF}\xDA\u{1D5E2}\u{1D5E6}* : Si a\xFAn no eres miembro, puedes unirte desde este enlace: https://chat.whatsapp.com/J4u1h7NUL1i1B1wAIyTUN6
Para preguntar acerca de nuestro proyecto *VECY Network* y debatir acerca de nuestras funciones beneficios y competencias, tenemos el grupo de *\u{1D5E3}\u{1D5E5}\u{1D5E2}\u{1D5EC}\u{1D5D8}\u{1D5D6}\u{1D5E7}\u{1D5E2} "\u{1D5E9}\u{1D5F2}\u{1D5F0}\u{1D606} \u{1D5E1}\u{1D5F2}\u{1D601}\u{1D604}\u{1D5FC}\u{1D5FF}\u{1D5F8}"* : Si a\xFAn no eres miembro puedes unirte desde este enlace: https://chat.whatsapp.com/CSzrKR6Cr56HAieEhAuqyU

Te espero. \xA1All\xED te atender\xE9 con gusto! \u{1F680}`;
          this.queuedSend(chatId, redirectText);
        }
      }
      // --- RESPUESTA DIRECTA A PREGUNTAS EN GRUPOS ---
      async handleDirectGroupQuestion(msg, chatId, senderId, bodyText) {
        try {
          const isOfficialGroup = chatId === this.targetGroupId || chatId === this.buzonGroupId || chatId === this.circuloGroupId;
          if (!isOfficialGroup) {
            console.log(`[JANIA-SILENT-SHIELD] \u{1F6E1}\uFE0F Mensaje directo en grupo externo ${chatId} ignorado para respuestas textuales. Silencio 100% preservado.`);
            return;
          }
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
          const { detectaVoz: detectaVoz2, textToSpeechMedia: textToSpeechMedia2 } = await Promise.resolve().then(() => (init_whatsapp_utils(), whatsapp_utils_exports));
          const { processWhatsAppMessage: processWhatsAppMessage2, processConsultingMessage: processConsultingMessage2, processCirculoMessage: processCirculoMessage2 } = await Promise.resolve().then(() => (init_janIA(), janIA_exports));
          const isAudioPTT = !!msg.message?.audioMessage;
          const wantsVoice = isAudioPTT || detectaVoz2(textLower);
          if (wantsVoice) {
            await this.sock.sendPresenceUpdate("recording", chatId);
          } else {
            await this.sock.sendPresenceUpdate("composing", chatId);
          }
          const isAudioFailed = bodyText === "[audio-vac\xEDo]" || bodyText === "[audio-sin-buffer]" || bodyText === "[audio-error]";
          if (isAudioFailed) {
            const failMsg = `Hola ${realName} \u{1F44B}\u{1F3FB}, escuch\xE9 que enviaste una nota de voz. Lamentablemente tuve un inconveniente t\xE9cnico al procesarla en este momento. \u{1F64F}

Te pido que:
\u270F\uFE0F Escribas tu consulta por texto aqu\xED en el grupo, o
\u{1F4F2} Me la env\xEDes directamente en mi chat privado: https://wa.me/573192919978

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
              const groupName = isOffTopicLegal ? "VECY: SOPORTE LEGAL, TRIBUTARIO Y AVAL\xDAOS" : process.env.GROUP_ZERO_NAME || 'PROYECTO "Vecy Network"';
              const redirectMsg = `Hola ${realName} \u{1F44B}\u{1F3FB}, veo que tu consulta es sobre ${isOffTopicLegal ? "temas jur\xEDdicos, tributarios o de aval\xFAos" : "el funcionamiento de VECY Network y JanIA"}. \xA1Perfecto! \u{1F3AF}

Ese tipo de preguntas las atiendo con m\xE1s profundidad en el grupo *${groupName}* de nuestra comunidad de WhatsApp. \u{1F3E0}

Tambi\xE9n puedes consultarme directamente en mi chat privado con mi otra yo *JanIA v3.5* \u{1F4F2}: https://wa.me/573192919978

\xA1All\xED te atiendo con todo el detalle que mereces! \u{1F60A}`;
              await this.queuedSend(chatId, redirectMsg, { mentions: [senderId], quoted: msg });
              await this.sock.sendPresenceUpdate("paused", chatId);
              return;
            }
          }
          let result;
          if (chatId === this.buzonGroupId) {
            const msgTs = msg.messageTimestamp ? Number(msg.messageTimestamp) : void 0;
            result = await processConsultingMessage2(
              bodyText,
              resolvedSenderId,
              realName,
              void 0,
              void 0,
              void 0,
              isAudioPTT ? "mock-audio:" + bodyText : void 0,
              msgTs
            );
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
            await this.handlePrivateDmRedirect(chatId, resolvedSenderId, realName);
            await this.sock.sendPresenceUpdate("paused", chatId);
            return;
          }
          if (result && result.response && result.response.trim() !== "") {
            const textToDeliver = result.response;
            const voiceToDeliver = result.voiceResponse && result.voiceResponse.trim() !== "" ? result.voiceResponse : textToDeliver;
            if (wantsVoice || isAudioPTT) {
              try {
                const media = await textToSpeechMedia2(voiceToDeliver);
                if (media && media.data) {
                  const audioBuffer = Buffer.from(media.data, "base64");
                  await this.queuedSend(chatId, {
                    audio: audioBuffer,
                    mimetype: media.mimetype || "audio/ogg; codecs=opus",
                    ptt: true
                  }, { mentions: [senderId], quoted: msg });
                  console.log(`[JANIA-MATCH] \u2713 Nota de voz enviada exitosamente como respuesta en grupo ${chatId}.`);
                } else {
                  await this.queuedSend(chatId, textToDeliver, {
                    mentions: [senderId],
                    quoted: msg
                  });
                }
              } catch (audioSendErr) {
                console.error("[JANIA-MATCH] Error enviando nota de voz. Activando fallback a texto:", audioSendErr?.message || audioSendErr);
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
      isPromotionalAd(bodyText, senderId) {
        const cleanLower = (bodyText || "").toLowerCase();
        const rawPhone = (senderId || "").split("@")[0].replace(/[^0-9]/g, "");
        const isCarolina = rawPhone.includes("573212857044") || rawPhone.includes("3212857044");
        const promoPhrases = [
          "captar no es improvisar",
          "especializaci\xF3n dentro de la labor inmobiliaria",
          "adquiere tu entrenamiento",
          "espiral del \xE9xito",
          "conocimiento llena tus bolsillos",
          "adqui\xE9relo precio",
          "precio de oferta",
          "no m\xE1s captaciones mediocres",
          "no m\xE1s procesos informales",
          "no m\xE1s inmuebles sin legalizar",
          "no m\xE1s trabajar sin asegurar el pago de tu comisi\xF3n",
          "proteger tus honorarios",
          "m\xE9todo probado para captar",
          "curso inmobiliario",
          "taller inmobiliario",
          "seminario inmobiliario",
          "capacitaci\xF3n inmobiliaria",
          "masterclass inmobiliaria",
          "webinar inmobiliario",
          "coaching inmobiliario",
          "mentor\xEDa inmobiliaria",
          "invierte en tu negocio",
          "invierte en conocimiento"
        ];
        const hasPromoKeywords = promoPhrases.some((phrase) => cleanLower.includes(phrase));
        if (hasPromoKeywords) return true;
        if (isCarolina) {
          const isRealEstateListing = (cleanLower.includes("vendo") || cleanLower.includes("arriendo") || cleanLower.includes("busco") || cleanLower.includes("necesito")) && (cleanLower.includes("apto") || cleanLower.includes("apartamento") || cleanLower.includes("casa") || cleanLower.includes("bodega") || cleanLower.includes("lote") || cleanLower.includes("finca"));
          if (!isRealEstateListing) {
            return true;
          }
        }
        return false;
      }
      // --- LOGÍSTICA DE BUFFER GRUPAL Y REACCIÓN INSTANTÁNEA ---
      async handleIncomingGroupMessage(msg, chatId, bodyText) {
        if (!msg.key || !msg.message) return;
        const rawSender = msg.key.participant || msg.participant || "";
        if (!rawSender || rawSender.endsWith("@g.us")) {
          console.warn(`[JANIA-MATCH] Omitiendo mensaje de grupo: sender individual inv\xE1lido (${rawSender})`);
          return;
        }
        const senderId = rawSender.includes("@") ? `${rawSender.split("@")[0].split(":")[0]}@${rawSender.split("@")[1]}` : rawSender.split(":")[0];
        const isOfficialGroup = chatId === this.targetGroupId || chatId === this.buzonGroupId || chatId === this.circuloGroupId;
        if (this.isPromotionalAd(bodyText, senderId)) {
          if (!msg.key.fromMe) {
            if (isOfficialGroup) {
              console.log(`[JANIA-PROMO-RULE] \u{1F6AB} Publicidad no autorizada detectada en grupo oficial de +${senderId.split("@")[0]}. Reaccionando con \u{1F6AB} y advirtiendo...`);
              this.sock.sendMessage(chatId, { react: { text: "\u{1F6AB}", key: msg.key } }).catch(() => {
              });
              const rawPhone = senderId.split("@")[0];
              const mentionJid = `${rawPhone}@s.whatsapp.net`;
              const warningText = `\u{1F6AB} @${rawPhone}: Esta clase de publicaciones (publicidad de cursos, entrenamientos, capacitaciones o servicios ajenos a la oferta y demanda directa de inmuebles) VIOLAN las normas de nuestros grupos oficiales VECY Network.

Por favor elimina esta publicaci\xF3n. Te advertimos que la reincidencia dar\xE1 lugar a la expulsi\xF3n inmediata del grupo.`;
              this.queuedSend(chatId, warningText, { mentions: [mentionJid], quoted: msg }).catch(() => {
              });
            } else {
              console.log(`[JANIA-PROMO-SHIELD] \u{1F6E1}\uFE0F Publicidad no inmobiliaria ignorada en grupo externo de +${senderId.split("@")[0]} (Cero reacci\xF3n, cero ingesta, cero Supabase).`);
            }
          }
          return;
        }
        if (!msg.key.fromMe) {
          const cleanLower = (bodyText || "").toLowerCase();
          let groupSubject = "";
          try {
            const meta = await this.getCachedGroupMetadata(chatId);
            if (meta && meta.subject) groupSubject = meta.subject;
          } catch (_) {
          }
          const isGroupRentContext = /arriend|alquil|renta/i.test(groupSubject);
          const hasPermuta = /\b(?:permuto|permuta|permutas|permutamos|se permuta|recibo menor valor|recibo inmueble|recibo vehículo|recibo vehiculo|pelo a pelo|encime|parte de pago)\b/i.test(cleanLower);
          const hasRentExplicit = /\b(?:arriendo|arriendos|arrendar|arrendamos|se arrienda|arriendan|alquilo|alquilar|alquilamos|se alquila|alquiler|alquileres|rento|rentar|se renta|renta|rentas|canon|canones|cánones|amoblado|amoblada|sin amoblar|arrendatario|arrendador|inquilino)\b/i.test(cleanLower) || /(?:incluida|con|\+|más|mas)\s*(?:administraci[oó]n|admon)/i.test(cleanLower) || /(?:administraci[oó]n|admon)\s*(?:incluida|adicional)/i.test(cleanLower) || /valor arriendo/i.test(cleanLower);
          const isRentOperation = hasRentExplicit || isGroupRentContext && !/\b(?:compro|comprar|en compra|para compra)\b/i.test(cleanLower) && !cleanLower.startsWith("vendo") && !cleanLower.startsWith("se vende");
          const isExplicitDemand = /\b(?:busco|buscamos|se busca|se requiere|requiero|requerimiento|necesito|necesitamos|solicito|solicitamos|compro|para cliente|busca cliente|cliente busca|comprador|arrendatario|en búsqueda|en busqueda)\b/i.test(cleanLower);
          const isExplicitOffer = !isExplicitDemand && (/\b(?:ofrezco|ofrecemos|vendo|vendemos|se vende|en venta|venta directa|arriendo|arriendos|arrendamos|arrendar|se arrienda|en arriendo|arriendo directo|pongo en arriendo|alquilo|alquilamos|alquilar|se alquila|en alquiler|alquiler directo|rento|rentamos|rentar|se renta|en renta|tengo para|disponible|nuevo inmueble|permuto|permutamos|se permuta)\b/i.test(cleanLower) || /(?:cuenta con|consta de|\d+\s*(?:m2|mts|m²)|alcobas|habitaciones|baños|parqueaderos?|cocina|sala|comedor|dep[oó]sito)/i.test(cleanLower));
          const isExplicitSearch = isExplicitDemand && !isExplicitOffer;
          let fastEmoji = null;
          if (isExplicitOffer) {
            if (hasPermuta) {
              fastEmoji = "\u{1F500}";
            } else if (isRentOperation) {
              fastEmoji = "\u{1F44C}";
            } else {
              fastEmoji = "\u{1F44D}";
            }
          } else if (isExplicitSearch) {
            if (hasPermuta) {
              fastEmoji = "\u{1F504}";
            } else if (isRentOperation) {
              fastEmoji = "\u270F\uFE0F";
            } else {
              fastEmoji = "\u{1F4DD}";
            }
          }
          if (fastEmoji && chatId !== this.buzonGroupId) {
            this.safeReact(chatId, msg.key, fastEmoji, "FAST-REACT");
          }
        }
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
            const metadata = await this.getCachedGroupMetadata(chatId);
            const me = this.sock.user?.id ? this.sock.user.id.split(":")[0] : "";
            const myParticipant = metadata?.participants?.find((p) => p.id.split("@")[0] === me);
            isBotAdmin = !!myParticipant && (myParticipant.admin === "admin" || myParticipant.admin === "superadmin");
          } catch (_) {
          }
          if (isBotAdmin) {
            this.lastGroupMessageTime.set(`${chatId}_${senderId}`, now);
          }
          let buffer = this.messageBuffers.get(bufferKey);
          const bufferTimeout = 3e3;
          const rawMsgInHandler = unwrapMessage(msg.message);
          const hasMediaInHandler = !!rawMsgInHandler?.imageMessage || !!rawMsgInHandler?.documentMessage || !!rawMsgInHandler?.videoMessage || !!rawMsgInHandler?.audioMessage;
          if (buffer) {
            clearTimeout(buffer.timer);
            buffer.messages.push({
              body: bodyText,
              hasMedia: hasMediaInHandler,
              originalMsg: msg
            });
            buffer.timer = setTimeout(() => this.processGroupBuffer(bufferKey), bufferTimeout);
          } else {
            this.messageBuffers.set(bufferKey, {
              messages: [{
                body: bodyText,
                hasMedia: hasMediaInHandler,
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
      async safeReact(chatId, msgKey, emoji, reason = "REACT") {
        if (!msgKey || !msgKey.id || msgKey.fromMe || !emoji || !this.sock) return;
        try {
          console.log(`[JANIA-${reason}] \u{1F3AF} Despachando reacci\xF3n ${emoji} a ${chatId} (Msg ID: ${msgKey.id})...`);
          await this.sock.sendMessage(chatId, { react: { text: emoji, key: msgKey } });
          console.log(`[JANIA-${reason}] \u2705 Reacci\xF3n ${emoji} ENTREGADA NATIVAMENTE en WhatsApp`);
        } catch (err) {
          console.warn(`[JANIA-${reason}] \u26A0\uFE0F Primer intento de reacci\xF3n ${emoji} fall\xF3 (${err?.message || err}). Reintentando en 2.5s...`);
          setTimeout(async () => {
            try {
              if (this.sock) {
                await this.sock.sendMessage(chatId, { react: { text: emoji, key: msgKey } });
                console.log(`[JANIA-${reason}] \u2705 Reacci\xF3n ${emoji} ENTREGADA en reintento`);
              }
            } catch (retryErr) {
              console.warn(`[JANIA-${reason}] \u274C Reintento de reacci\xF3n ${emoji} no pudo completarse:`, retryErr?.message || retryErr);
            }
          }, 2500);
        }
      }
      getReactionEmoji(result, isOfficialGroup = false) {
        if (!result) return null;
        const classification = (result.classification || "").toUpperCase();
        if (result.reactionEmoji && (result.inserted === true || result.reactionEmoji === "\u{1F6AB}")) {
          if (result.reactionEmoji === "\u{1F6AB}" && !isOfficialGroup) return null;
          return result.reactionEmoji;
        }
        const data = result.extractedData || {};
        const txType = (data.transactionType || data.tipoNegocioDeseado || result.transactionType || "").toLowerCase();
        const isPermuta = txType.includes("permuta") || txType === "venta_permuta" || txType === "aporte";
        const isRent = txType.includes("arriendo") || txType === "arriendo_temporal" || txType === "arriendo_con_opcion_de_compra";
        const isProperty = classification === "INMUEBLE" || classification.includes("INMUEBLE") || classification.includes("OFERTA");
        const isRequirement = classification === "REQUERIMIENTO" || classification.includes("REQUERIMIENTO") || classification.includes("DEMANDA") || classification.includes("BUSQUEDA");
        if (isProperty || isRequirement) {
          if (isProperty) {
            if (isPermuta) return "\u{1F500}";
            if (isRent) return "\u{1F44C}";
            return "\u{1F44D}";
          }
          if (isRequirement) {
            if (isPermuta) return "\u{1F504}";
            if (isRent) return "\u270F\uFE0F";
            return "\u{1F4DD}";
          }
        }
        if (isOfficialGroup) {
          if (classification === "VIOLACION_DE_NORMAS" || classification.includes("SPAM") || classification.includes("INFRACCION")) {
            return "\u{1F6AB}";
          }
          if (classification === "DATOS_INCOMPLETOS") return "\u2753";
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
          const rawMsg = unwrapMessage(bufferedMsg.originalMsg.message);
          if (bufferedMsg.hasMedia && rawMsg?.imageMessage) {
            try {
              const mediaBuffer = await downloadMediaSafely(bufferedMsg.originalMsg, "image");
              if (mediaBuffer) {
                bufferedMsg.imageBuffer = mediaBuffer.toString("base64");
              }
            } catch (e) {
              console.error("[JANIA-BUFFER] Error descargando imagen:", e);
            }
          }
          if (bufferedMsg.hasMedia && rawMsg?.documentMessage) {
            try {
              const mediaBuffer = await downloadMediaSafely(bufferedMsg.originalMsg, "document");
              if (mediaBuffer) {
                bufferedMsg.pdfBuffer = mediaBuffer.toString("base64");
                bufferedMsg.pdfMimeType = rawMsg.documentMessage.mimetype || "application/pdf";
              }
            } catch (e) {
              console.error("[JANIA-BUFFER] Error descargando documento:", e);
            }
          }
        }
        try {
          const distinctListings = buffer.messages.filter((m) => {
            if (m.imageBuffer && (!m.body || m.body.trim() === "")) return true;
            if (!m.body) return false;
            const clean = m.body.toLowerCase();
            const hasType = clean.includes("apto") || clean.includes("apartamento") || clean.includes("casa") || clean.includes("bodega") || clean.includes("oficina") || clean.includes("lote") || clean.includes("finca") || clean.includes("inmueble") || clean.includes("propiedad");
            const hasDetails = clean.includes("venta") || clean.includes("arriendo") || clean.includes("precio") || clean.includes("presupuesto") || clean.includes("millones") || clean.includes("$") || clean.includes("busco") || clean.includes("requerimiento") || clean.includes("\xE1rea") || clean.includes("area") || clean.includes("m2") || clean.includes("mts");
            return hasType && hasDetails;
          });
          const { processWhatsAppMessage: processWhatsAppMessage2, processConsultingMessage: processConsultingMessage2, processCirculoMessage: processCirculoMessage2 } = await Promise.resolve().then(() => (init_janIA(), janIA_exports));
          if (distinctListings.length > 1 && chatId !== "120363417740040773@g.us" && chatId !== "120363403507276533@g.us") {
            console.log(`[JANIA-MATCH] Detectadas ${distinctListings.length} publicaciones independientes en el mismo minuto para ${resolvedSenderId}. Procesando cada una por separado...`);
            let groupName = "Nombre Real del Grupo";
            try {
              const metadata = await this.getCachedGroupMetadata(chatId);
              if (metadata && metadata.subject) {
                groupName = metadata.subject;
              }
            } catch (e) {
            }
            for (const bufferedMsg of buffer.messages) {
              const hasImageOnly = !!bufferedMsg.imageBuffer && (!bufferedMsg.body || bufferedMsg.body.trim() === "");
              if (!bufferedMsg.body || bufferedMsg.body.trim() === "") {
                if (!hasImageOnly) continue;
              }
              const bodyText = bufferedMsg.body || "";
              const urlMatch2 = bodyText.match(/https?:\/\/[^\s]+/g);
              const scrapedResults2 = [];
              if (urlMatch2) {
                for (const url of urlMatch2.slice(0, 3)) {
                  if (esDominioPermitido(url)) {
                    try {
                      const data = await scrapePropertyLink(url);
                      if (data) scrapedResults2.push(data);
                    } catch (err) {
                    }
                  }
                }
              }
              await this.logToDb(resolvedSenderId, "user", bodyText || "[imagen]");
              const result2 = await processWhatsAppMessage2(
                bodyText,
                resolvedSenderId,
                userName,
                bufferedMsg.hasMedia,
                scrapedResults2,
                void 0,
                bufferedMsg.imageBuffer,
                true,
                bufferedMsg.pdfBuffer,
                bufferedMsg.pdfMimeType,
                chatId,
                groupName
              );
              const isOfficialGroupSingle = chatId === this.targetGroupId || chatId === this.buzonGroupId || chatId === this.circuloGroupId;
              if (result2) {
                const emoji = this.getReactionEmoji(result2, isOfficialGroupSingle);
                if (emoji && bufferedMsg.originalMsg?.key && bufferedMsg.originalMsg.key.id && !bufferedMsg.originalMsg.key.fromMe) {
                  this.safeReact(chatId, bufferedMsg.originalMsg.key, emoji, "MULTI-REACT");
                }
              }
            }
            return;
          }
          const fullText = buffer.messages.map((m) => m.body).filter(Boolean).join("\n\n");
          const hasMedia = buffer.messages.some((m) => m.hasMedia);
          const imageMsg = buffer.messages.find((m) => m.imageBuffer);
          const pdfMsg = buffer.messages.find((m) => m.pdfBuffer);
          const isAudioPTT = buffer.messages.some((m) => !!m.originalMsg?.message?.audioMessage);
          if (!fullText.trim() && !imageMsg?.imageBuffer && !pdfMsg?.pdfBuffer && !isAudioPTT) {
            console.log(`[JANIA-MATCH] Buffer vac\xEDo sin imagen/PDF/audio para ${resolvedSenderId}. Omitiendo.`);
            return;
          }
          const urlMatch = fullText.match(/https?:\/\/[^\s]+/g);
          const scrapedResults = [];
          if (urlMatch) {
            for (const url of urlMatch.slice(0, 3)) {
              if (esDominioPermitido(url)) {
                try {
                  const data = await scrapePropertyLink(url);
                  if (data) scrapedResults.push(data);
                } catch (err) {
                  console.error(`[SCRAPING-BUFFER] Error al raspar URL ${url}:`, err?.message || err);
                }
              }
            }
          }
          await this.logToDb(resolvedSenderId, "user", fullText);
          const { sendAdminNotification: sendAdminNotification2 } = await Promise.resolve().then(() => (init_whatsapp_utils(), whatsapp_utils_exports));
          let result;
          if (chatId === "120363417740040773@g.us") {
            result = await processConsultingMessage2(
              fullText,
              resolvedSenderId,
              userName,
              imageMsg?.imageBuffer,
              pdfMsg?.pdfBuffer,
              pdfMsg?.pdfMimeType,
              isAudioPTT ? "mock-audio:" + fullText : void 0
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
              const metadata = await this.getCachedGroupMetadata(chatId);
              if (metadata && metadata.subject) {
                groupName = metadata.subject;
              }
            } catch (e) {
            }
            if (isBlacklistedGroup(groupName, chatId)) {
              console.log(`[JANIA-MATCH] \u{1F6AB} Grupo '${groupName}' (${chatId}) en lista negra. Descartando buffer por completo.`);
              return;
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
          const isOfficialGroup = chatId === this.targetGroupId || chatId === this.buzonGroupId || chatId === this.circuloGroupId;
          if (result) {
            const emoji = this.getReactionEmoji(result, isOfficialGroup);
            if (emoji) {
              const lastMsg = buffer.messages[buffer.messages.length - 1]?.originalMsg;
              if (lastMsg && lastMsg.key && lastMsg.key.id && !lastMsg.key.fromMe) {
                this.safeReact(chatId, lastMsg.key, emoji, "BUFFER-REACT");
              }
            }
          }
          if (result) {
            const isWarning = result.classification === "DATOS_INCOMPLETOS" || result.classification === "VIOLACION_DE_NORMAS";
            let isBotAdmin = false;
            try {
              const metadata = await this.getCachedGroupMetadata(chatId);
              const me = this.sock.user?.id ? this.sock.user.id.split(":")[0] : "";
              const myParticipant = metadata?.participants?.find((p) => p.id.split("@")[0] === me);
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
              const isOfficial = chatId === this.targetGroupId || chatId === this.buzonGroupId || chatId === this.circuloGroupId;
              if (result.classification === "VIOLACION_DE_NORMAS" && isOfficial && isBotAdmin && result.response && result.response.trim() !== "") {
                const textToDeliver = result.response;
                const { textToSpeechMedia: textToSpeechMedia2 } = await Promise.resolve().then(() => (init_whatsapp_utils(), whatsapp_utils_exports));
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
          let conv = await db.select().from(conversations).where(eq11(conversations.sessionId, senderId)).limit(1);
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
            }).where(eq11(conversations.id, conversationId));
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
          let participantJid = msg.key.participant || msg.participant || senderId || "";
          if (participantJid.endsWith("@lid") && this.sock?.signalRepository?.lidMapping?.getPNForLID) {
            try {
              const mappedPn = await this.sock.signalRepository.lidMapping.getPNForLID(participantJid);
              if (mappedPn) {
                participantJid = mappedPn;
                console.log(`[JanIA-LID] Resuelto LID ${msg.key.participant} -> PN Real ${participantJid}`);
              }
            } catch (err) {
            }
          }
          const individualPhone = participantJid ? participantJid.split("@")[0].split(":")[0].replace(/\D/g, "") : rawPhone;
          const effectiveSenderPhone = individualPhone && !individualPhone.startsWith("1203") ? individualPhone : rawPhone;
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
          const realName = msg.pushName || `Asesor +${effectiveSenderPhone}`;
          const { processWhatsAppMessage: processWhatsAppMessage2 } = await Promise.resolve().then(() => (init_janIA(), janIA_exports));
          let groupName = "VECY INMUEBLES NETWORK";
          try {
            const metadata = await this.getCachedGroupMetadata(senderId);
            if (metadata && metadata.subject) {
              groupName = metadata.subject;
            }
          } catch (e) {
          }
          const result = await processWhatsAppMessage2(
            bodyText,
            effectiveSenderPhone,
            realName,
            !!imageBuffer || !!pdfBuffer,
            [],
            void 0,
            imageBuffer,
            true,
            // isGroup = true (forces parsing)
            pdfBuffer,
            pdfMimeType,
            senderId,
            groupName
          );
          if (result) {
            let reaction = "";
            if (result.classification === "INMUEBLE") {
              reaction = "\u{1F44D}";
            } else if (result.classification === "REQUERIMIENTO") {
              reaction = "\u{1F4DD}";
            } else if (result.classification === "VIOLACION_DE_NORMAS") {
              reaction = "\u{1F6AB}";
            } else if (bodyText.includes("http://") || bodyText.includes("https://")) {
              reaction = "\u{1F44C}";
            }
            if (reaction) {
              const sendReaction = async () => {
                try {
                  await this.sock.sendMessage(senderId, { react: { text: reaction, key: msg.key } });
                } catch (_) {
                }
              };
              if (result.inserted && (reaction === "\u{1F44D}" || reaction === "\u{1F4DD}")) {
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
                const { sendAdminNotification: sendAdminNotification2 } = await Promise.resolve().then(() => (init_whatsapp_utils(), whatsapp_utils_exports));
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
          const { textToSpeechMedia: textToSpeechMedia2 } = await Promise.resolve().then(() => (init_whatsapp_utils(), whatsapp_utils_exports));
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
          const firstName = extractFirstName2(realName);
          await this.sock.sendPresenceUpdate("composing", senderId);
          await delay(2e3);
          const redirectMsg = `Hola ${firstName} \u{1F44B}\u{1F60A}. Si tienes dudas, inquietudes o quieres consultarme algo (sea por escrito o por notas de voz), te invito a escribir directamente al canal oficial privado de soporte de JanIA de la Web haciendo clic aqu\xED: https://vecy-network.vercel.app/jania para realizar tus consultas correspondientes o si est\xE1s en los grupos correspondientes seg\xFAn tu consulta puedes hacerlas all\xED de la siguiente manera:

Mis grupos:

Para publicar tus INMUEBLES y REQUERIMIENTOS tenemos el grupo de \u{1D5E9}\u{1D5D8}\u{1D5D6}\u{1D5EC} \u{1D5DC}\u{1D5E1}\u{1D5E0}\u{1D5E8}\u{1D5D8}\u{1D5D5}\u{1D5DF}\u{1D5D8}\u{1D5E6} \u{1D5E1}\u{1D5D8}\u{1D5E7}\u{1D5EA}\u{1D5E2}\u{1D5E5}\u{1D5DE} : Si a\xFAn no eres miembro, puedes unirte desde este enlace: https://chat.whatsapp.com/K36KrHeB9nMEKJ56s8XFcM
Para hacer tus consultas de casos inmobiliarios en temas jur\xEDdicos, tributarios, aval\xFAos, ayuda en gu\xEDa de procesos y redacci\xF3n de contratos, tenemos el grupo de \u{1D5E9}\u{1D5D8}\u{1D5D6}\u{1D5EC}: \u{1D5E6}\u{1D5E2}\u{1D5E3}\u{1D5E2}\u{1D5E5}\u{1D5E7}\u{1D5D8} \u{1D5DF}\u{1D5D8}\u{1D5DA}\u{1D5D4}\u{1D5DF}, \u{1D5E7}\u{1D5E5}\u{1D5DC}\u{1D5D5}\u{1D5E8}\u{1D5E7}\u{1D5D4}\u{1D5E5}\u{1D5DC}\u{1D5E2} \u{1D5EC} \u{1D5D4}\u{1D5E9}\u{1D5D4}\u{1D5DF}\xDA\u{1D5E2}\u{1D5E6} : Si a\xFAn no eres miembro, puedes unirte desde este enlace: https://chat.whatsapp.com/J4u1h7NUL1i1B1wAIyTUN6
Para preguntar acerca de nuestro proyecto VECY Network y debatir acerca de nuestras funciones beneficios y competencias, tenemos el grupo de \u{1D5E3}\u{1D5E5}\u{1D5E2}\u{1D5EC}\u{1D5D8}\u{1D5D6}\u{1D5E7}\u{1D5E2} "\u{1D5E9}\u{1D5F2}\u{1D5F0}\u{1D606} \u{1D5E1}\u{1D5F2}\u{1D601}\u{1D604}\u{1D5FC}\u{1D5FF}\u{1D5F8}" : Si a\xFAn no eres miembro puedes unirte desde este enlace: https://chat.whatsapp.com/CSzrKR6Cr56HAieEhAuqyU

Te espero. \xA1All\xED te atender\xE9 con gusto! \u{1F680}`;
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
          const [match] = await db.select().from(propertyMatches).where(eq11(propertyMatches.id, matchId)).limit(1);
          if (!match) {
            await this.queuedSend(senderId, `\u26A0\uFE0F No encontr\xE9 ninguna coincidencia registrada con el c\xF3digo *#M${matchId}*. Por favor verifica el n\xFAmero.`);
            return;
          }
          const [prop] = await db.select().from(properties).where(eq11(properties.id, match.propertyId)).limit(1);
          const [req] = await db.select().from(requirements).where(eq11(requirements.id, match.requirementId)).limit(1);
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
            await db.update(propertyMatches).set({ status: "rejected" }).where(eq11(propertyMatches.id, matchId));
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
          await db.update(propertyMatches).set(updateFields).where(eq11(propertyMatches.id, matchId));
          const [updatedMatch] = await db.select().from(propertyMatches).where(eq11(propertyMatches.id, matchId)).limit(1);
          if (updatedMatch.ownerConfirmed && updatedMatch.seekerConfirmed) {
            await db.update(propertyMatches).set({ status: "interested" }).where(eq11(propertyMatches.id, matchId));
            let ownerName = "Oferente";
            let seekerName = "Interesado";
            try {
              const [ownerUser] = await db.select().from(users).where(eq11(users.phone, ownerPhone)).limit(1);
              if (ownerUser && ownerUser.name) ownerName = ownerUser.name;
            } catch {
            }
            try {
              const [seekerUser] = await db.select().from(users).where(eq11(users.phone, seekerPhone)).limit(1);
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
            await this.logToDb(ownerJid, "janIA", `[Match-Connected] Match #M${matchId} connected in DB. Seeker is ${seekerPhone}`);
            await this.logToDb(seekerJid, "janIA", `[Match-Connected] Match #M${matchId} connected in DB. Owner is ${ownerPhone}`);
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
        outgoingQueue = outgoingQueue.then(async () => {
          try {
            if (!this.sock) {
              throw new Error("Cliente Baileys no inicializado");
            }
            let targetJid = chatId;
            if (targetJid.endsWith("@c.us")) {
              targetJid = targetJid.replace("@c.us", "@s.whatsapp.net");
            }
            if (targetJid.endsWith("@g.us")) {
              const isAuthorized = targetJid === this.targetGroupId || targetJid === this.buzonGroupId || targetJid === this.circuloGroupId;
              if (!isAuthorized) {
                console.log(`[JANIA-MATCH-SHIELD] Bloqueado env\xEDo de mensaje a grupo no autorizado (Modo Ingesta Fantasma): ${targetJid}`);
                return;
              }
            }
            if (targetJid.endsWith("@s.whatsapp.net")) {
              const rawPhone = targetJid.split("@")[0];
              const ADMIN_PHONE = process.env.ADMIN_PHONE || "573192919978";
              const isAdmin = rawPhone === "573192919978" || rawPhone.includes(ADMIN_PHONE);
              if (!isAdmin) {
                console.log(`[JANIA-ANTI-BAN-SHIELD] \u{1F6E1}\uFE0F Bloqueado env\xEDo de mensaje directo (DM) a usuario no administrador (${targetJid}). Prohibici\xF3n absoluta de DMs a terceros.`);
                return;
              }
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
            if (messagePayload.text && typeof messagePayload.text === "string") {
              try {
                await this.sock.sendPresenceUpdate("composing", targetJid);
                const typingDelay = Math.min(5e3, Math.max(2e3, messagePayload.text.length * 40));
                await delay(typingDelay);
              } catch (_) {
              }
            } else if (messagePayload.audio) {
              try {
                await this.sock.sendPresenceUpdate("recording", targetJid);
                const recordingDelay = Math.min(1500, Math.max(300, (options.voiceLength || 2) * 200));
                await delay(recordingDelay);
              } catch (_) {
              }
            }
            const sent = await this.sock.sendMessage(targetJid, messagePayload, sendOptions);
            if (sent && sent.key && sent.key.id) {
              this.botSentMessageIds.add(sent.key.id);
            }
            await delay(1e3);
          } catch (err) {
            console.error("[JANIA-MATCH] Error en despacho de mensaje Baileys:", err.message || err);
          }
        });
        return outgoingQueue;
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
            const fs10 = await import("fs");
            const buffer = fs10.readFileSync(mediaPath);
            const path12 = await import("path");
            const ext = path12.extname(mediaPath).toLowerCase();
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
                fileName: path12.basename(mediaPath)
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
          const { cleanVoiceText: cleanVoiceText2 } = await Promise.resolve().then(() => (init_whatsapp_utils(), whatsapp_utils_exports));
          const cleaned = cleanVoiceText2(text2);
          console.log(`[JANIA-MATCH] Generando nota de voz para enviar al grupo ${targetJid}...`);
          const { textToSpeechMedia: textToSpeechMedia2 } = await Promise.resolve().then(() => (init_whatsapp_utils(), whatsapp_utils_exports));
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
          const metadata = await this.getCachedGroupMetadata(groupId);
          return metadata?.participants ? metadata.participants.map((p) => p.id) : [];
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
        const imgPath = path9.resolve("./client/public/jania_perfil.png");
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
          await delay(3e3);
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
        const sessionDir = path9.join(process.cwd(), ".baileys_auth");
        if (fs8.existsSync(sessionDir)) {
          try {
            fs8.rmSync(sessionDir, { recursive: true, force: true });
          } catch (err) {
            console.warn("[JANIA-MATCH] No se pudo borrar .baileys_auth:", err.message);
          }
        }
        this.sock = null;
        await this.initialize();
        await delay(3e3);
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
          if (fs8.existsSync(this.cooldownFile)) {
            const raw = JSON.parse(fs8.readFileSync(this.cooldownFile, "utf8"));
            this.cooldownMap = new Map(Object.entries(raw));
          }
        } catch (e) {
        }
      }
      saveCooldowns() {
        try {
          const obj = Object.fromEntries(this.cooldownMap.entries());
          fs8.writeFileSync(this.cooldownFile, JSON.stringify(obj), "utf8");
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
    janiaMatchBot = new JaniaMatchBot({
      sessionFolderName: ".baileys_auth",
      qrFileName: "qr-match.png",
      botName: "JANIA-MATCH-OFICIAL"
    });
    janiaCaptadorBot = janiaMatchBot;
  }
});

// server/jobs/nightlyRematch.ts
var nightlyRematch_exports = {};
__export(nightlyRematch_exports, {
  recalculateAndCleanupMatches: () => recalculateAndCleanupMatches,
  runNightlyRematch: () => runNightlyRematch
});
import { and as and6, eq as eq12 } from "drizzle-orm";
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
            and6(
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
            if (janiaMatchBot && janiaMatchBot.isReady) {
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
              if (matchDetails.response && janiaMatchBot.targetGroupId) {
                await janiaMatchBot.sendToGroup(matchDetails.response, void 0, matchDetails.mentions);
              }
              if (matchDetails.extraDMs && matchDetails.extraDMs.length > 0) {
                for (const dm of matchDetails.extraDMs) {
                  await janiaMatchBot.queuedSend(dm.jid, dm.message);
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
      if (newScore < 85) {
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
    init_whatsapp_match();
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
var VECY_VERSION = "v23.0";
var VECY_VERSION_LABEL = `VERSI\xD3N ${VECY_VERSION}`;
var VECY_CORE_VERSION_LABEL = `VECY CORE ${VECY_VERSION}`;

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
init_events();
init_db();
init_schema();
import { TRPCError } from "@trpc/server";
import { eq as eq2 } from "drizzle-orm";
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
vrifEvents.on("match:created", async (matchId) => {
  console.log(`[NotificationService] Procesando evento match:created para Match #${matchId}...`);
  try {
    await queueMatchNotifications(matchId);
  } catch (err) {
    console.error(`[NotificationService] Error al procesar notificaciones del Match #${matchId}:`, err);
  }
});
async function queueMatchNotifications(matchId, triggerSource = "match_created") {
  const db = await getDb();
  if (!db) {
    console.error("[NotificationService] Base de datos no disponible.");
    return;
  }
  const [match] = await db.select().from(propertyMatches).where(eq2(propertyMatches.id, matchId)).limit(1);
  if (!match) {
    console.error(`[NotificationService] No se encontr\xF3 el Match #${matchId}`);
    return;
  }
  const [property] = await db.select().from(properties).where(eq2(properties.id, match.propertyId)).limit(1);
  const [requirement] = await db.select().from(requirements).where(eq2(requirements.id, match.requirementId)).limit(1);
  if (!property || !requirement) {
    console.error(`[NotificationService] Propiedad o Requerimiento no encontrados para el Match #${matchId}`);
    return;
  }
  const propBrokerPhone = property.idUsuarioWhatsapp || "";
  let propBrokerId = null;
  if (property.agentId) {
    propBrokerId = property.agentId;
  } else if (propBrokerPhone) {
    const [u] = await db.select().from(users).where(eq2(users.phone, propBrokerPhone.split("@")[0])).limit(1);
    if (u) propBrokerId = u.id;
  }
  const reqBrokerPhone = requirement.idUsuarioWhatsapp || "";
  let reqBrokerId = null;
  if (requirement.userId) {
    reqBrokerId = requirement.userId;
  } else if (reqBrokerPhone) {
    const [u] = await db.select().from(users).where(eq2(users.phone, reqBrokerPhone.split("@")[0])).limit(1);
    if (u) reqBrokerId = u.id;
  }
  if (propBrokerPhone) {
    await db.insert(notificationLogs).values({
      matchId: match.id,
      brokerId: propBrokerId,
      brokerPhone: propBrokerPhone,
      channel: "whatsapp",
      status: "pending",
      triggerSource
    });
  }
  if (reqBrokerPhone) {
    await db.insert(notificationLogs).values({
      matchId: match.id,
      brokerId: reqBrokerId,
      brokerPhone: reqBrokerPhone,
      channel: "whatsapp",
      status: "pending",
      triggerSource
    });
  }
  console.log(`[NotificationService] Logs de notificaciones creados en estado 'pending' con triggerSource '${triggerSource}' para Match #${matchId}`);
  const mode = process.env.MATCH_NOTIFICATION_MODE || "manual";
  const score = parseFloat(match.matchScore?.toString() || "0");
  let shouldDispatch = false;
  if (mode === "automatic") {
    shouldDispatch = true;
  } else if (mode === "hybrid") {
    if (score >= 97) {
      shouldDispatch = true;
      console.log(`[NotificationService] Modo H\xEDbrido: Match #${matchId} tiene score alto (${score}%) >= 97%. Enviar autom\xE1ticamente.`);
    } else if (score >= 90) {
      shouldDispatch = false;
      console.log(`[NotificationService] Modo H\xEDbrido: Match #${matchId} tiene score medio (${score}%). Esperar aprobaci\xF3n manual.`);
    } else {
      shouldDispatch = false;
      console.log(`[NotificationService] Modo H\xEDbrido: Match #${matchId} tiene score bajo (${score}%). Solo visible en dashboard.`);
    }
  }
  if (shouldDispatch) {
    console.log(`[NotificationService] Despachando notificaciones autom\xE1ticas para Match #${matchId}...`);
    await dispatchNotificationsForMatch(matchId);
  }
}
async function dispatchNotificationsForMatch(matchId) {
  const db = await getDb();
  if (!db) return;
  const logs = await db.select().from(notificationLogs).where(eq2(notificationLogs.matchId, matchId));
  const [match] = await db.select().from(propertyMatches).where(eq2(propertyMatches.id, matchId)).limit(1);
  const [property] = await db.select().from(properties).where(eq2(properties.id, match.propertyId)).limit(1);
  const [requirement] = await db.select().from(requirements).where(eq2(requirements.id, match.requirementId)).limit(1);
  if (!match || !property || !requirement) return;
  const matchExplanation = match.matchExplanation;
  const score = Math.round(Number(match.matchScore || 0));
  for (const log of logs) {
    if (log.status !== "pending") continue;
    try {
      const isOwner = log.brokerPhone === property.idUsuarioWhatsapp;
      const otherPhone = isOwner ? requirement.idUsuarioWhatsapp : property.idUsuarioWhatsapp;
      const cleanOtherPhone = otherPhone ? otherPhone.split("@")[0] : "";
      const greeting = `\u{1F3AF} *\xA1COINCIDENCIA INMOBILIARIA DETECTADA! (Coincidencia: ${score}%)* \u{1F3AF}

`;
      const justification = `Hola colega, hemos encontrado una coincidencia muy alta para tu publicaci\xF3n.

*Puntos compatibles:*
` + (matchExplanation?.positives?.map((p) => `\u2022 ${p}`).join("\n") || "\u2022 Compatibilidad general") + "\n\n" + (matchExplanation?.negatives?.length > 0 ? `*Advertencias menores:*
` + matchExplanation.negatives.map((n) => `\u2022 ${n}`).join("\n") + "\n\n" : "") + `\xBFTe interesa ponerte en contacto con el colega br\xF3ker (+${cleanOtherPhone}) para coordinar la negociaci\xF3n?

Responde a este mensaje privado con:
\u{1F449} *S\xCD #M${matchId}* - Para autorizar compartir tus datos de contacto.
\u{1F449} *NO #M${matchId}* - Para rechazar la propuesta.`;
      const fullMessage = greeting + justification;
      console.log(`[NotificationService] \u{1F512} Notificaci\xF3n por WhatsApp deshabilitada para Match #${matchId} (+${log.brokerPhone}). Alerta enrutada exclusivamente a Notificaciones Web In-App.`);
      await db.update(notificationLogs).set({
        status: "web_only",
        sentAt: /* @__PURE__ */ new Date()
      }).where(eq2(notificationLogs.id, log.id));
    } catch (e) {
      console.error(`[NotificationService] Error procesando notificaci\xF3n web para Match #${matchId}:`, e.message);
      await db.update(notificationLogs).set({
        status: "failed",
        error: e.message || String(e)
      }).where(eq2(notificationLogs.id, log.id));
    }
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
import { eq as eq5, desc as desc2, sql as sql4, inArray } from "drizzle-orm";

// server/_core/taxEngine.ts
var VALOR_UVT_2026 = 50318;
function liquidarImpuestosVenta(params) {
  const precioVenta = Math.max(0, params.precioVenta || 0);
  const costoFiscal = Math.max(0, params.costoFiscal || 0);
  const anosPosesion = Math.max(0, params.anosPosesion || 0);
  const limiteUvtRetencion = 2e4 * VALOR_UVT_2026;
  const esSupera20kUvt = precioVenta > limiteUvtRetencion;
  const tarifaRetencion = esSupera20kUvt ? 0.025 : 0.01;
  const retencionFuente = Math.round(precioVenta * tarifaRetencion);
  const utilidadOriginal = Math.max(0, precioVenta - costoFiscal);
  let utilidadGravable = utilidadOriginal;
  let exencionViviendaAplicada = 0;
  let gananciaOcasional = 0;
  let esRentaOrdinaria = false;
  let tarifaGananciaOcasionalPorcentaje = 15;
  let notas = "";
  if (anosPosesion < 2) {
    esRentaOrdinaria = true;
    tarifaGananciaOcasionalPorcentaje = 0;
    gananciaOcasional = 0;
    notas = "Al tener menos de 2 a\xF1os de posesi\xF3n, la utilidad califica como Renta L\xEDquida Ordinaria y se suma a la c\xE9dula general de la persona natural (Tarifa progresiva DIAN del 0% al 39%).";
  } else {
    if (params.esViviendaHabitacion) {
      const exencionMaxima = 5e3 * VALOR_UVT_2026;
      exencionViviendaAplicada = Math.min(utilidadOriginal, exencionMaxima);
      utilidadGravable = Math.max(0, utilidadOriginal - exencionViviendaAplicada);
      notas = `Se aplic\xF3 el beneficio de exenci\xF3n por vivienda de habitaci\xF3n (Hasta 5.000 UVT = $${exencionMaxima.toLocaleString("es-CO")} de utilidad exentas, Art. 311-1 E.T. abonando el producto a AFC/nueva vivienda). `;
    }
    gananciaOcasional = Math.round(utilidadGravable * 0.15);
    notas += "Aplica tarifa \xFAnica del 15% por Ganancia Ocasional sobre la utilidad neta gravable.";
  }
  return {
    valorUVT: VALOR_UVT_2026,
    precioVenta,
    costoFiscal,
    utilidadCalculada: utilidadOriginal,
    anosPosesion,
    retencionFuente,
    tarifaRetencionPorcentaje: tarifaRetencion * 100,
    esSupera20kUvt,
    exencionViviendaAplicada,
    utilidadGravableGananciaOcasional: utilidadGravable,
    gananciaOcasional,
    tarifaGananciaOcasionalPorcentaje,
    esRentaOrdinaria,
    notas: notas.trim()
  };
}

// server/routers/janIA.ts
init_matching();
import axios7 from "axios";
import fs6 from "fs";
import path6 from "path";
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
      let conversation = await db.select().from(conversations).where(eq5(conversations.sessionId, input.sessionId)).limit(1);
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
          await db.update(conversations).set({ userId: String(ctx.user.id) }).where(eq5(conversations.id, conversationId));
        }
      }
      const mockUserId = ctx.user ? `web-user-${ctx.user.id}` : `web-session-${input.sessionId}`;
      const mockUserName = ctx.user ? ctx.user.name ?? void 0 : "Usuario Web";
      const lowerMsg = input.message.toLowerCase();
      const isListingData = (lowerMsg.includes("vendo") || lowerMsg.includes("busco") || lowerMsg.includes("ofrezco") || lowerMsg.includes("necesito")) && (lowerMsg.includes("apto") || lowerMsg.includes("apartamento") || lowerMsg.includes("casa") || lowerMsg.includes("lote") || lowerMsg.includes("local") || lowerMsg.includes("bodega") || lowerMsg.includes("oficina") || lowerMsg.includes("finca"));
      let janIAResponse = "";
      let wantsVoice = false;
      let voiceResponse = "";
      if (isListingData) {
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
        janIAResponse = result.response && result.response.trim() !== "" ? result.response : result.dmResponse || result.response || "\xA1Entendido! He registrado la informaci\xF3n en VECY Network.";
        wantsVoice = result.wantsVoice || false;
        voiceResponse = result.voiceResponse || janIAResponse;
      } else {
        const { invokeLLM: invokeLLM2 } = await Promise.resolve().then(() => (init_llm(), llm_exports));
        const { buildSystemPrompt: buildSystemPrompt2, getLiveStats: getLiveStats2 } = await Promise.resolve().then(() => (init_janIA(), janIA_exports));
        const { getGreetingByTime: getGreetingByTime3, extractFirstName: extractFirstName3 } = await Promise.resolve().then(() => (init_whatsapp_utils(), whatsapp_utils_exports));
        const timeGreeting = getGreetingByTime3();
        const nowBogota = new Date((/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "America/Bogota" }));
        const hour = nowBogota.getHours();
        const isRegistered = !!ctx.user;
        const rawName = ctx.user?.name || "";
        const resolvedName = extractFirstName3(rawName);
        const maleExceptions = ["luca", "andrea", "borja", "joshua", "bautista", "sasha", "el\xEDa", "elias"];
        const isFemale = resolvedName ? resolvedName.slice(-1).toLowerCase() === "a" && !maleExceptions.includes(resolvedName.toLowerCase()) : false;
        const genderTerm = resolvedName ? isFemale ? `estimada ${resolvedName}` : `estimado ${resolvedName}` : "estimado/a usuario/a";
        const liveStats = await getLiveStats2();
        const userContextInstruction = isRegistered ? `

[INFORMACI\xD3N DEL USUARIO REGISTRADO]:
- Estado: REGISTRADO EN LA PLATAFORMA VECY NETWORK \u2705
- Nombre: "${rawName}" (Nombre/Apodo: "${resolvedName}")
- Saludo de hora actual en Bogot\xE1 (${hour}:00): "${timeGreeting}"
- Trato respetuoso: "${genderTerm}"
- INSTRUCCI\xD3N: Si es el primer mensaje de la sesi\xF3n, sal\xFAdalo con "${timeGreeting}, ${genderTerm}". Si ya est\xE1n interactuando, integra su nombre "${resolvedName}" naturalmente sin repetir saludos repetitivos.` : `

[INFORMACI\xD3N DEL USUARIO NO REGISTRADO / AN\xD3NIMO]:
- Estado: NO REGISTRADO (Navegante an\xF3nimo)
- Saludo de hora actual en Bogot\xE1 (${hour}:00): "${timeGreeting}"
- INSTRUCCI\xD3N DE INTERACCI\xD3N:
  1. Si no te ha dicho su nombre en los mensajes previos, sal\xFAdalo cordialmente con "${timeGreeting}" y preg\xFAntale amablemente: "\xBFCon qui\xE9n tengo el gusto de interactuar?" para recordarlo en la conversaci\xF3n.
  2. Inv\xEDtalo amablemente a registrarse gratuitamente en la plataforma VECY Network (https://vecy-network.vercel.app/) para guardar su nombre, asociar su cuenta y acceder a su propio historial completo de conversaciones.`;
        const systemPrompt = `${buildSystemPrompt2("web")}

${liveStats}${userContextInstruction}

[INSTRUCCI\xD3N MAESTRA - CHAT WEB VECY 24/7]: Eres JanIA Match, la Inteligencia Artificial viva y consultora inmobiliaria senior de VECY Network. Tienes razonamiento l\xF3gico, amplio criterio jur\xEDdico, financiero y de mercado inmobiliario. Responde directamente a la consulta del usuario de forma elocuente, profesional, completa y estructurada. PROHIBIDO usar plantillas fijas o cierres/firmas con membretes. Responde en formato JSON estrictamente como: {"response": "tu respuesta viva y razonada"}`;
        const recentHistory = await db.select({ role: messages.role, content: messages.content }).from(messages).where(eq5(messages.conversationId, conversationId)).orderBy(desc2(messages.createdAt)).limit(6);
        const formattedHistory = recentHistory.reverse().map((m) => ({
          role: m.role === "janIA" ? "assistant" : "user",
          content: m.content
        }));
        const llmMessages = [
          { role: "system", content: systemPrompt },
          ...formattedHistory,
          { role: "user", content: input.message }
        ];
        const llmRes = await invokeLLM2({
          messages: llmMessages,
          responseFormat: { type: "json_object" }
        });
        const rawContent = llmRes?.choices?.[0]?.message?.content || "";
        try {
          const parsed = JSON.parse(rawContent);
          janIAResponse = parsed.response || parsed.respuesta || rawContent;
        } catch {
          janIAResponse = rawContent.replace(/^\{[\s\S]*"response"\s*:\s*"/, "").replace(/"\s*\}$/, "").trim();
        }
        if (!janIAResponse || janIAResponse.trim() === "") {
          janIAResponse = `${timeGreeting}. \xA1Bienvenido a VECY Network! \xBFCon qui\xE9n tengo el gusto de interactuar? Te invito a registrarte gratuitamente en nuestra plataforma para acceder a tu historial completo de conversaciones. \xBFEn qu\xE9 consulta inmobiliaria puedo asesorarte hoy?`;
        }
      }
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
      }).where(eq5(conversations.id, conversationId));
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
      return await db.select().from(conversations).where(eq5(conversations.userId, String(ctx.user.id))).orderBy(desc2(conversations.updatedAt));
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
      const conv = await db.select().from(conversations).where(eq5(conversations.sessionId, input.sessionId)).limit(1);
      if (conv.length === 0) return [];
      return await db.select().from(messages).where(eq5(messages.conversationId, conv[0].id)).orderBy(messages.createdAt);
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
      const conv = await db.select().from(conversations).where(eq5(conversations.sessionId, input.sessionId)).limit(1);
      if (conv.length > 0) {
        await db.delete(messages).where(eq5(messages.conversationId, conv[0].id));
        await db.delete(conversations).where(eq5(conversations.id, conv[0].id));
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
        const fileRes = await axios7.get(input.fileUrl, { responseType: "arraybuffer" });
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
      const conversation = await db.select().from(conversations).where(eq5(conversations.sessionId, input.sessionId)).limit(1);
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
        }).where(eq5(conversations.id, conversationId));
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
      const matches = await db.select().from(propertyMatches).where(eq5(propertyMatches.requirementId, input.requirementId)).orderBy(desc2(propertyMatches.matchScore)).limit(input.limit);
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
        matchExplanation: propertyMatches.matchExplanation,
        ipc: propertyMatches.ipc,
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
          nombreUsuarioWhatsapp: properties.nombreUsuarioWhatsapp,
          origenNombre: properties.origenNombre,
          origenTipo: properties.origenTipo,
          origenId: properties.origenId,
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
          externalUrl: properties.externalUrl,
          enlaceOrigen: properties.enlaceOrigen,
          portal: properties.portal,
          externalListingId: properties.externalListingId,
          canonicalExternalId: properties.canonicalExternalId,
          fechaPrimeraPublicacion: properties.fechaPrimeraPublicacion,
          fechaUltimaPublicacion: properties.fechaUltimaPublicacion,
          republicacionesCount: properties.republicacionesCount,
          estadoComercial: properties.estadoComercial,
          ultimaActividad: properties.ultimaActividad,
          vigenciaIa: properties.vigenciaIa,
          createdAt: properties.createdAt
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
          nombreUsuarioWhatsapp: requirements.nombreUsuarioWhatsapp,
          origenNombre: requirements.origenNombre,
          origenTipo: requirements.origenTipo,
          origenId: requirements.origenId,
          tipoInmuebleDeseado: requirements.tipoInmuebleDeseado,
          tipoNegocioDeseado: requirements.tipoNegocioDeseado,
          habitacionesMin: requirements.habitacionesMin,
          banosMin: requirements.banosMin,
          parqueaderosMin: requirements.parqueaderosMin,
          areaMin: requirements.areaMin,
          estratoDeseado: requirements.estratoDeseado,
          amobladoDeseado: requirements.amobladoDeseado,
          rawText: requirements.rawText,
          enlaceOrigen: requirements.enlaceOrigen,
          createdAt: requirements.createdAt
        }
      }).from(propertyMatches).innerJoin(properties, eq5(propertyMatches.propertyId, properties.id)).innerJoin(requirements, eq5(propertyMatches.requirementId, requirements.id)).orderBy(desc2(propertyMatches.createdAt));
      const propIds = Array.from(new Set(matches.map((m) => m.property.id)));
      const imagesMap = {};
      if (propIds.length > 0) {
        const imgs = await db.select({
          propertyId: propertyImages.propertyId,
          imageUrl: propertyImages.imageUrl
        }).from(propertyImages).where(inArray(propertyImages.propertyId, propIds));
        for (const img of imgs) {
          if (!imagesMap[img.propertyId]) imagesMap[img.propertyId] = [];
          imagesMap[img.propertyId].push(img.imageUrl);
        }
      }
      const seenPairs = /* @__PURE__ */ new Set();
      const validEvaluatedMatches = [];
      for (const m of matches) {
        const key = `${m.property.id}-${m.requirement.id}`;
        if (seenPairs.has(key)) continue;
        const evaluation = explicarMatch(m.requirement, m.property);
        if (evaluation.score < 85) {
          continue;
        }
        const finalScore = evaluation.score;
        seenPairs.add(key);
        validEvaluatedMatches.push({
          ...m,
          property: {
            ...m.property,
            images: imagesMap[m.property.id] || []
          },
          matchScore: finalScore.toFixed(2),
          matchExplanation: evaluation
        });
      }
      const propertyIds = validEvaluatedMatches.map((m) => m.property.id).filter(Boolean);
      if (propertyIds.length > 0) {
        const histories = await db.select().from(propertyPublicationHistory).where(inArray(propertyPublicationHistory.propertyId, propertyIds)).orderBy(desc2(propertyPublicationHistory.fecha));
        return validEvaluatedMatches.map((m) => {
          const propertyHistory = histories.filter((h) => h.propertyId === m.property.id);
          return {
            ...m,
            property: {
              ...m.property,
              publicationHistory: propertyHistory
            }
          };
        });
      }
      return validEvaluatedMatches;
    } catch (error) {
      console.error("Error getting all matches:", error);
      throw error;
    }
  }),
  // Actualizar datos prediales de un inmueble oferta directamente desde la Mesa de Cotejo
  updatePropertyDetails: publicProcedure.input(z2.object({
    propertyId: z2.number(),
    name: z2.string().optional(),
    price: z2.string().optional(),
    rentPrice: z2.string().optional().nullable(),
    adminFee: z2.string().optional().nullable(),
    bedrooms: z2.number().optional().nullable(),
    bathrooms: z2.number().optional().nullable(),
    garages: z2.number().optional().nullable(),
    areaTotal: z2.string().optional().nullable(),
    stratum: z2.number().optional().nullable(),
    zone: z2.string().optional().nullable(),
    addressNeighborhood: z2.string().optional().nullable(),
    addressLocality: z2.string().optional().nullable(),
    city: z2.string().optional().nullable(),
    propertyType: z2.string().optional().nullable(),
    transactionType: z2.string().optional().nullable()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { propertyId, ...updateFields } = input;
    const updateData = {};
    for (const [key, value] of Object.entries(updateFields)) {
      if (value !== void 0) updateData[key] = value;
    }
    updateData.updatedAt = /* @__PURE__ */ new Date();
    await db.update(properties).set(updateData).where(eq5(properties.id, propertyId));
    console.log(`[JanIA-UpdateProperty] Propiedad #${propertyId} actualizada directamente desde Mesa de Cotejo`);
    return { success: true, message: "Propiedad actualizada con \xE9xito" };
  }),
  // Actualizar datos prediales de un requerimiento demanda directamente desde la Mesa de Cotejo
  updateRequirementDetails: publicProcedure.input(z2.object({
    requirementId: z2.number(),
    name: z2.string().optional(),
    presupuestoMax: z2.string().optional(),
    presupuestoMin: z2.string().optional().nullable(),
    adminFeeMax: z2.string().optional().nullable(),
    habitacionesMin: z2.number().optional().nullable(),
    banosMin: z2.number().optional().nullable(),
    parqueaderosMin: z2.number().optional().nullable(),
    areaMin: z2.string().optional().nullable(),
    estratoDeseado: z2.number().optional().nullable(),
    zonaDeseada: z2.string().optional().nullable(),
    addressNeighborhood: z2.string().optional().nullable(),
    ciudadDeseada: z2.string().optional().nullable(),
    tipoInmuebleDeseado: z2.string().optional().nullable(),
    tipoNegocioDeseado: z2.string().optional().nullable()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { requirementId, ...updateFields } = input;
    const updateData = {};
    for (const [key, value] of Object.entries(updateFields)) {
      if (value !== void 0) updateData[key] = value;
    }
    await db.update(requirements).set(updateData).where(eq5(requirements.id, requirementId));
    console.log(`[JanIA-UpdateRequirement] Requerimiento #${requirementId} actualizado directamente desde Mesa de Cotejo`);
    return { success: true, message: "Requerimiento actualizado con \xE9xito" };
  }),
  // Recalcular cruces y afinidad predial para Oferta y/o Demanda tras edición en Mesa de Cotejo
  recalculateMatchForPair: publicProcedure.input(z2.object({
    propertyId: z2.number().optional().nullable(),
    requirementId: z2.number().optional().nullable()
  })).mutation(async ({ input }) => {
    let propMatchesCount = 0;
    let reqMatchesCount = 0;
    if (input.propertyId) {
      try {
        const resProp = await findMatchesForProperty(input.propertyId);
        propMatchesCount = Array.isArray(resProp) ? resProp.length : 0;
      } catch (e) {
        console.error(`[RecalculateMatch] Error reculculando propiedad #${input.propertyId}:`, e?.message);
      }
    }
    if (input.requirementId) {
      try {
        const resReq = await findMatchesForRequirement(input.requirementId);
        reqMatchesCount = Array.isArray(resReq) ? resReq.length : 0;
      } catch (e) {
        console.error(`[RecalculateMatch] Error recalculando requerimiento #${input.requirementId}:`, e?.message);
      }
    }
    console.log(`[JanIA-RecalculateMatch] Rec\xE1lculo completado -> Propiedad #${input.propertyId}: ${propMatchesCount} matches | Requerimiento #${input.requirementId}: ${reqMatchesCount} matches`);
    return {
      success: true,
      message: "Match recalculado exitosamente con datos actualizados.",
      propMatchesCount,
      reqMatchesCount
    };
  }),
  // Registrar Retroalimentación de Match (Capa C - Feedback Loop)
  recordMatchFeedback: publicProcedure.input(z2.object({
    matchId: z2.number().optional().nullable(),
    propertyId: z2.number().optional().nullable(),
    requirementId: z2.number().optional().nullable(),
    action: z2.enum(["exitoso", "rechazado", "en_negociacion"]),
    motivoRechazo: z2.string().optional().nullable(),
    notasBroker: z2.string().optional().nullable(),
    ajustesGuardados: z2.record(z2.string(), z2.any()).optional().nullable()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Base de datos no disponible");
    try {
      const [feedback] = await db.insert(matchFeedback).values({
        matchId: input.matchId || null,
        propertyId: input.propertyId || null,
        requirementId: input.requirementId || null,
        action: input.action,
        motivoRechazo: input.motivoRechazo || null,
        notasBroker: input.notasBroker || null,
        ajustesGuardados: input.ajustesGuardados || null
      }).returning();
      if (input.matchId && input.action === "rechazado") {
        await db.update(propertyMatches).set({ status: "rejected" }).where(eq5(propertyMatches.id, input.matchId));
      }
      console.log(`[JanIA-Feedback] Feedback registrado para Match #${input.matchId}: ${input.action} - ${input.motivoRechazo || "Sin motivo"}`);
      return { success: true, feedbackId: feedback.id };
    } catch (e) {
      console.error("[JanIA-Feedback] Error guardando feedback:", e.message);
      throw new Error(`Error guardando feedback: ${e.message}`);
    }
  }),
  // Obtener Glosario y Léxico Vivo de JanIA (Capa B)
  getInmobiliarioLexicon: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    try {
      const terms = await db.select().from(inmobiliarioLexicon).orderBy(desc2(inmobiliarioLexicon.frecuenciaUso)).limit(100);
      return terms;
    } catch (e) {
      console.error("[JanIA-Lexicon] Error obteniendo l\xE9xico:", e.message);
      return [];
    }
  }),
  // Aprender o Registrar Nuevo Término Inmobiliario (Capa B)
  learnNewLexiconTerm: publicProcedure.input(z2.object({
    terminoColoquial: z2.string(),
    categoria: z2.string(),
    conceptoCanonico: z2.string(),
    origen: z2.string().default("humano_validado")
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Base de datos no disponible");
    try {
      const cleanTerm = input.terminoColoquial.toLowerCase().trim();
      const [term] = await db.insert(inmobiliarioLexicon).values({
        terminoColoquial: cleanTerm,
        categoria: input.categoria,
        conceptoCanonico: input.conceptoCanonico,
        frecuenciaUso: 1,
        origen: input.origen
      }).onConflictDoUpdate({
        target: inmobiliarioLexicon.terminoColoquial,
        set: {
          frecuenciaUso: sql4`${inmobiliarioLexicon.frecuenciaUso} + 1`,
          updatedAt: /* @__PURE__ */ new Date()
        }
      }).returning();
      return { success: true, term };
    } catch (e) {
      console.error("[JanIA-Lexicon] Error registrando t\xE9rmino:", e.message);
      throw new Error(`Error registrando t\xE9rmino: ${e.message}`);
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
      const zoneProperties = await db.select().from(properties).where(eq5(properties.zone, input.zone));
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
    if (!db) return { isReady: true, phone: "573192919978", todayProperties: 0, todayRequirements: 0 };
    try {
      let isReady = true;
      let phone = "573192919978";
      const [statusRow] = await db.select().from(pendingSessions).where(eq5(pendingSessions.jid, "system:bot_status")).limit(1);
      if (statusRow) {
        const data = statusRow.sessionData;
        if (data && data.phone) {
          phone = data.phone;
        }
      }
      const [propTodayCount] = await db.select({ count: sql4`count(*)::int` }).from(properties).where(sql4`DATE(${properties.createdAt} AT TIME ZONE 'America/Bogota') = CURRENT_DATE`);
      const [reqTodayCount] = await db.select({ count: sql4`count(*)::int` }).from(requirements).where(sql4`DATE(${requirements.createdAt} AT TIME ZONE 'America/Bogota') = CURRENT_DATE`);
      return {
        isReady,
        phone,
        todayProperties: propTodayCount?.count || 0,
        todayRequirements: reqTodayCount?.count || 0
      };
    } catch (error) {
      console.error("[BotStatus] Error checking bot status:", error);
      return { isReady: true, phone: "573192919978", todayProperties: 0, todayRequirements: 0 };
    }
  }),
  getQrCode: publicProcedure.query(async () => {
    try {
      const qrPath = path6.join(process.cwd(), "qr-captador.png");
      const qrMatchPath = path6.join(process.cwd(), "qr-match.png");
      let targetPath = fs6.existsSync(qrPath) ? qrPath : fs6.existsSync(qrMatchPath) ? qrMatchPath : null;
      if (targetPath) {
        const fileData = fs6.readFileSync(targetPath);
        return { hasQr: true, qrData: `data:image/png;base64,${fileData.toString("base64")}` };
      }
      return { hasQr: false, qrData: null };
    } catch (e) {
      return { hasQr: false, qrData: null };
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
  }),
  // Real-time report stats from DB
  getReportStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    try {
      const [propTotal] = await db.select({ count: sql4`count(*)::int` }).from(properties);
      const [propActive] = await db.select({ count: sql4`count(*)::int` }).from(properties).where(sql4`${properties.available} = true`);
      const [reqTotal] = await db.select({ count: sql4`count(*)::int` }).from(requirements);
      const [reqActive] = await db.select({ count: sql4`count(*)::int` }).from(requirements).where(eq5(requirements.status, "active"));
      const [matchTotal] = await db.select({ count: sql4`count(*)::int` }).from(propertyMatches);
      const [convTotal] = await db.select({ count: sql4`count(*)::int` }).from(conversations);
      const monthlyProps = await db.execute(sql4`
        SELECT to_char(date_trunc('month', "createdAt"), 'Mon YYYY') as mes,
               count(*)::int as total
        FROM properties
        WHERE "createdAt" >= now() - interval '6 months'
        GROUP BY 1 ORDER BY 1
      `);
      const monthlyReqs = await db.execute(sql4`
        SELECT to_char(date_trunc('month', "createdAt"), 'Mon YYYY') as mes,
               count(*)::int as total
        FROM requirements
        WHERE "createdAt" >= now() - interval '6 months'
        GROUP BY 1 ORDER BY 1
      `);
      return {
        properties: { total: propTotal.count, active: propActive.count },
        requirements: { total: reqTotal.count, active: reqActive.count },
        matches: { total: matchTotal.count },
        conversations: { total: convTotal.count },
        monthlyProps,
        monthlyReqs
      };
    } catch (error) {
      console.error("Error getting report stats:", error);
      throw error;
    }
  }),
  // Liquidación tributaria de Retención en la Fuente y Ganancia Ocasional (DIAN v17.6)
  calcularImpuestos: publicProcedure.input(
    z2.object({
      precioVenta: z2.number().min(0),
      costoFiscal: z2.number().min(0),
      anosPosesion: z2.number().min(0),
      esViviendaHabitacion: z2.boolean().default(false)
    })
  ).mutation(({ input }) => {
    return liquidarImpuestosVenta({
      precioVenta: input.precioVenta,
      costoFiscal: input.costoFiscal,
      anosPosesion: input.anosPosesion,
      esViviendaHabitacion: input.esViviendaHabitacion
    });
  })
});

// server/routers/github.ts
import { z as z3 } from "zod";
init_db();
init_schema();
import { eq as eq6 } from "drizzle-orm";

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
      const adminUser = await db.select().from(users).where(eq6(users.email, "vecybienesraices@gmail.com")).limit(1);
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
            const existing = await db.select().from(properties).where(eq6(properties.sourceRepository, repoName)).limit(1);
            if (existing.length > 0) {
              await db.update(properties).set({
                ...propertyData,
                agentId: adminId,
                sourceRepository: repoName,
                lastSyncedAt: /* @__PURE__ */ new Date()
              }).where(eq6(properties.id, existing[0].id));
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
import { eq as eq7 } from "drizzle-orm";
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
          await db.update(propertyImages).set({ isMainImage: false }).where(eq7(propertyImages.propertyId, input.propertyId));
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
      await db.update(propertyImages).set({ displayOrder: input.displayOrder }).where(eq7(propertyImages.id, input.imageId));
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
      await db.update(propertyImages).set({ isMainImage: false }).where(eq7(propertyImages.propertyId, input.propertyId));
      await db.update(propertyImages).set({ isMainImage: true }).where(eq7(propertyImages.id, input.imageId));
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
import { eq as eq8, and as and3, desc as desc3, isNull } from "drizzle-orm";
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
    }).from(users).where(eq8(users.id, input.id)).limit(1);
    if (agent.length === 0) throw new TRPCError3({ code: "NOT_FOUND", message: "Agent not found" });
    return agent[0];
  }),
  getMyProperties: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    return await db.select().from(properties).where(eq8(properties.agentId, ctx.user.id)).orderBy(desc3(properties.createdAt));
  }),
  // For testing: Allows an agent to claim a property that has no agent assigned
  claimProperty: protectedProcedure.input(z5.object({ propertyId: z5.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const property = await db.select().from(properties).where(eq8(properties.id, input.propertyId)).limit(1);
    if (property.length === 0) throw new TRPCError3({ code: "NOT_FOUND", message: "Property not found" });
    if (property[0].agentId) throw new TRPCError3({ code: "FORBIDDEN", message: "Property already has an agent" });
    await db.update(properties).set({ agentId: ctx.user.id }).where(eq8(properties.id, input.propertyId));
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
    const property = await db.select().from(properties).where(eq8(properties.id, input.propertyId)).limit(1);
    if (property.length === 0) throw new TRPCError3({ code: "NOT_FOUND", message: "Property not found" });
    if (property[0].agentId !== ctx.user.id && ctx.user.role !== "admin") {
      throw new TRPCError3({ code: "FORBIDDEN", message: "You don't own this property" });
    }
    const existingLink = await db.select().from(referralLinks).where(
      and3(
        eq8(referralLinks.propertyId, input.propertyId),
        eq8(referralLinks.agentId, ctx.user.id)
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
    }).from(referralLinks).innerJoin(properties, eq8(referralLinks.propertyId, properties.id)).where(eq8(referralLinks.agentId, ctx.user.id)).orderBy(desc3(referralLinks.createdAt));
  })
});

// server/routers/leads.ts
import { z as z6 } from "zod";
init_db();
init_schema();
import { eq as eq9, sql as sql5 } from "drizzle-orm";
import { TRPCError as TRPCError4 } from "@trpc/server";
var leadsRouter = router({
  resolveStealthLink: publicProcedure.input(z6.object({ token: z6.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Database err" });
    const linkRecord = await db.select().from(referralLinks).where(eq9(referralLinks.token, input.token)).limit(1);
    if (linkRecord.length === 0) {
      throw new TRPCError4({ code: "NOT_FOUND", message: "Stealth Link invalido o expirado." });
    }
    const link = linkRecord[0];
    await db.update(referralLinks).set({ clicks: sql5`${referralLinks.clicks} + 1` }).where(eq9(referralLinks.id, link.id));
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
    }).from(properties).where(eq9(properties.id, link.propertyId)).limit(1);
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
    const linkRecord = await db.select().from(referralLinks).where(eq9(referralLinks.token, input.token)).limit(1);
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
import { eq as eq10, desc as desc4, ilike, and as and4 } from "drizzle-orm";
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
  transactionType: z7.enum([
    "venta",
    "arriendo",
    "venta_o_arriendo",
    "arriendo_temporal",
    "arriendo_con_opcion_de_compra",
    "permuta",
    "venta_permuta",
    "aporte"
  ]).default("venta"),
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
    const filters = [eq10(properties.available, true)];
    if (input?.transactionType) filters.push(eq10(properties.transactionType, input.transactionType));
    if (input?.type) filters.push(eq10(properties.propertyType, input.type));
    if (input?.zone) filters.push(ilike(properties.zone, `%${input.zone}%`));
    return await db.select().from(properties).where(and4(...filters)).orderBy(desc4(properties.featured), desc4(properties.createdAt)).limit(input?.limit ?? 20).offset(input?.offset ?? 0);
  }),
  getById: publicProcedure.input(z7.object({ id: z7.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const result = await db.select().from(properties).where(eq10(properties.id, input.id)).limit(1);
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
    const existing = await db.select().from(properties).where(eq10(properties.id, input.id)).limit(1);
    if (existing.length === 0) throw new TRPCError5({ code: "NOT_FOUND" });
    const isOwner = existing[0].agentId === ctx.user.id;
    const isAdmin = ctx.user.role === "admin";
    if (!isOwner && !isAdmin) throw new TRPCError5({ code: "FORBIDDEN" });
    const updated = await db.update(properties).set({ ...input.data, updatedAt: /* @__PURE__ */ new Date() }).where(eq10(properties.id, input.id)).returning();
    return updated[0];
  }),
  delete: protectedProcedure.input(z7.object({ id: z7.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const existing = await db.select().from(properties).where(eq10(properties.id, input.id)).limit(1);
    if (existing.length === 0) throw new TRPCError5({ code: "NOT_FOUND" });
    const isOwner = existing[0].agentId === ctx.user.id;
    const isAdmin = ctx.user.role === "admin";
    if (!isOwner && !isAdmin) throw new TRPCError5({ code: "FORBIDDEN" });
    await db.delete(properties).where(eq10(properties.id, input.id));
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
    return await db.select().from(properties).where(eq10(properties.agentId, ctx.user.id)).orderBy(desc4(properties.createdAt));
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
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://knzmpoprlmbonejshfys.supabase.co";
        const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtuem1wb3BybG1ib25lanNoZnlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMjYyMjQsImV4cCI6MjA5MTYwMjIyNH0.yZ3AV1Rt2rmDuP61CA2rJRILpw__vwAJWp3xJUNj_FY";
        console.log("[Auth] Validando token en Supabase:", supabaseUrl);
        const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: {
            Authorization: `Bearer ${input.accessToken}`,
            apikey: supabaseAnonKey
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
import fs7 from "fs";
import { nanoid } from "nanoid";
import path8 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path7 from "node:path";
import { defineConfig } from "vite";
var vite_config_default = defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path7.resolve(import.meta.dirname, "client", "src"),
      "@shared": path7.resolve(import.meta.dirname, "shared"),
      "@assets": path7.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path7.resolve(import.meta.dirname),
  root: path7.resolve(import.meta.dirname, "client"),
  publicDir: path7.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path7.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1e3
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
      const clientTemplate = path8.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs7.promises.readFile(clientTemplate, "utf-8");
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
  const distPath = path8.resolve(import.meta.dirname, "..", "dist");
  if (!fs7.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path8.resolve(distPath, "index.html"));
  });
}

// server/_core/cronService.ts
import cron from "node-cron";
import path10 from "path";
init_db();
init_schema();
init_whatsapp_match();
init_nightlyRematch();
init_llm();
import { fileURLToPath } from "url";
import { gte as gte3, and as and7, eq as eq13, sql as sql7 } from "drizzle-orm";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path10.dirname(__filename);
function initCronScheduler() {
  console.log("[CRON-SERVICE] Inicializando orquestador de agendas automatizadas v3.1 (Exclusivamente Audios Motivacionales y Re-matching)...");
  cron.schedule("0 11 * * 1,4", async () => {
    console.log("[CRON-SERVICE] Enviando audio motivacional a VECY INMUEBLES NETWORK...");
    const guion = `Buenos d\xEDas a todos y a todas. Soy JanIA, la inteligencia artificial de VECY Network. Hoy quiero recordarles que este grupo es nuestro centro de operaciones comerciales. Aqu\xED publican sus inmuebles en venta o arriendo, sus requerimientos de compra o renta, y yo me encargo de cruzar toda esa informaci\xF3n en tiempo real en los 32 departamentos de Colombia para detectar MATCHES y hacer posibles cierres de negocios. \xBFYa publicaste hoy? Cada inmueble que compartes aqu\xED es una oportunidad de negocio que no puedes dejar pasar. Puedes enviar texto, nota de voz, imagen o flyer y yo lo proceso autom\xE1ticamente. Sigan publicando sus inmuebles, colegas, e inviten a m\xE1s colegas a unirse a esta red. Entre m\xE1s seamos, m\xE1s matches encontramos. \xA1Hoy puede ser el d\xEDa de tu pr\xF3ximo cierre!`;
    try {
      await janiaMatchBot.sendVoiceToGroup(guion, janiaMatchBot.targetGroupId);
    } catch (e) {
      console.error("[CRON-SERVICE] Error enviando audio a VECY INMUEBLES NETWORK:", e.message);
    }
  }, { timezone: "America/Bogota" });
  cron.schedule("30 11 * * 2,5", async () => {
    console.log("[CRON-SERVICE] Enviando audio motivacional a VECY: SOPORTE LEGAL...");
    const guion = `Hola a todos por aqu\xED. Soy JanIA, y este espacio es nuestro rinc\xF3n de consultor\xEDa jur\xEDdica y t\xE9cnica de VECY Network. Aqu\xED no hay preguntas tontas: si tienes dudas sobre un contrato de arrendamiento, una promesa de compraventa, una sucesi\xF3n, el c\xE1lculo de ganancia ocasional, c\xF3mo cobrar una comisi\xF3n que te deben, o simplemente quieres estimar el valor por metro cuadrado de un inmueble, este es tu lugar. El conocimiento jur\xEDdico es poder en los negocios. No dejes que la duda te frene. Escr\xEDbeme aqu\xED o env\xEDame una nota de voz y te respondo con criterio legal, rigor t\xE9cnico y total honestidad. Sigan haciendo sus consultas, colegas. Y si conocen a alguien del sector que necesita este apoyo, inv\xEDtenlos al grupo. Juntos elevamos el nivel profesional del gremio.`;
    try {
      await janiaMatchBot.sendVoiceToGroup(guion, janiaMatchBot.buzonGroupId);
    } catch (e) {
      console.error("[CRON-SERVICE] Error enviando audio a SOPORTE LEGAL:", e.message);
    }
  }, { timezone: "America/Bogota" });
  cron.schedule("0 12 * * 3,6", async () => {
    console.log("[CRON-SERVICE] Enviando audio motivacional a PROYECTO VECY NETWORK...");
    const guion = `Hola, equipo VECY. Soy JanIA. Este grupo es nuestro espacio m\xE1s especial: el canal del Proyecto Vecy Network es donde nacen las ideas, donde se eval\xFAa el proyecto, donde los fundadores escuchan directamente a quienes hacen posible esta red. Aqu\xED pueden preguntarme sobre VECY Network sin filtros: c\xF3mo funciona la inteligencia artificial, qu\xE9 est\xE1 planeado para el futuro, qu\xE9 ya est\xE1 funcionando hoy, o simplemente contarme qu\xE9 les parece el proyecto. Tambi\xE9n es el lugar donde debatimos con la competencia de frente y con argumentos. Su opini\xF3n es la br\xFAjula que nos gu\xEDa. Sigan preguntando acerca de VECY Network. Cada idea que aportan aqu\xED nos hace m\xE1s fuertes. E inviten a m\xE1s colegas visionarios. Queremos construir esto juntos.`;
    try {
      await janiaMatchBot.sendVoiceToGroup(guion, janiaMatchBot.circuloGroupId);
    } catch (e) {
      console.error("[CRON-SERVICE] Error enviando audio a PROYECTO VECY NETWORK:", e.message);
    }
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

// server/_core/index.ts
init_janIA();
init_voiceTranscription();
init_llm();
init_whatsapp_utils();
init_whatsapp_match();
import multer from "multer";
import fs9 from "fs";
import path11 from "path";
process.on("uncaughtException", (error) => {
  console.error("[SYSTEM-CRITICAL] Uncaught Exception detectada:", error);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("[SYSTEM-CRITICAL] Unhandled Rejection detectada en:", promise, "raz\xF3n:", reason);
});
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use((req, res, next) => {
    const origin = req.headers.origin || "*";
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, trpc-accept");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
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
      if (!janiaMatchBot.isReady) {
        return res.status(503).send("El bot de WhatsApp (Baileys) no est\xE1 listo todav\xEDa. Intenta en unos segundos.");
      }
      res.json({ isReady: true, status: "online" });
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  app.get("/api/inspect-groups", async (req, res) => {
    try {
      if (!janiaMatchBot.isReady) {
        return res.status(503).send("El bot de WhatsApp (Baileys) no est\xE1 listo todav\xEDa.");
      }
      res.json({ isReady: true, status: "online" });
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  app.get("/api/screenshot-chat", async (req, res) => {
    try {
      if (!janiaMatchBot.isReady) {
        return res.status(503).send("El bot de WhatsApp (Baileys) no est\xE1 listo todav\xEDa.");
      }
      return res.json({ isReady: true, status: "Baileys WebSocket activo" });
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  app.get("/qr-match.png", (req, res) => {
    try {
      const qrPath = path11.join(process.cwd(), "qr-match.png");
      const distQrPath = path11.join(process.cwd(), "dist", "qr-match.png");
      const activePath = fs9.existsSync(qrPath) ? qrPath : distQrPath;
      if (fs9.existsSync(activePath)) {
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
      const qrPath = path11.join(process.cwd(), "qr-match.png");
      const distQrPath = path11.join(process.cwd(), "dist", "qr-match.png");
      const activePath = fs9.existsSync(qrPath) ? qrPath : distQrPath;
      if (fs9.existsSync(activePath)) {
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
      const qrPath = path11.join(process.cwd(), "qr-match.png");
      const distQrPath = path11.join(process.cwd(), "dist", "qr-match.png");
      const activePath = fs9.existsSync(qrPath) ? qrPath : distQrPath;
      if (fs9.existsSync(activePath)) {
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
        return res.status(400).send("Debe proporcionar un par\xE1metro de tel\xE9fono v\xE1lido. Ejemplo: ?phone=573192919978");
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
  app.get("/qr-captador.png", (req, res) => {
    try {
      const qrPath = path11.join(process.cwd(), "qr-captador.png");
      const distQrPath = path11.join(process.cwd(), "dist", "qr-captador.png");
      const activePath = fs9.existsSync(qrPath) ? qrPath : distQrPath;
      if (fs9.existsSync(activePath)) {
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        return res.sendFile(activePath);
      }
      res.status(404).send("QR Captador no disponible todav\xEDa. Solicita el c\xF3digo de vinculaci\xF3n o refresca.");
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  app.get("/api/captador-pairing-code", async (req, res) => {
    try {
      const targetPhone = req.query.phone || "573192919978";
      const { janiaCaptadorBot: janiaCaptadorBot2 } = await Promise.resolve().then(() => (init_whatsapp_match(), whatsapp_match_exports));
      if (!janiaCaptadorBot2) {
        return res.status(503).send("El bot captador no est\xE1 inicializado.");
      }
      const code = await janiaCaptadorBot2.getPairingCode(targetPhone);
      res.json({ ok: true, phone: targetPhone, code });
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
      const defaultAdminPhone = "573192919978";
      const rawPhone = phone || defaultAdminPhone;
      const cleanPhone = typeof rawPhone === "string" ? rawPhone.replace(/\D/g, "") : String(rawPhone).replace(/\D/g, "");
      const matchBot = global.janiaMatchBotInstance;
      if (matchBot && matchBot.isReady) {
        const targetPhone = cleanPhone.endsWith("@s.whatsapp.net") ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;
        console.log(`[NOTIFICACI\xD3N-API] Retransmitiendo mensaje a ${targetPhone} v\xEDa JanIA Match Bot (Baileys)...`);
        await matchBot.queuedSend(targetPhone, text2);
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
  const uploadsDir2 = path11.resolve(process.cwd(), "public/uploads");
  if (!fs9.existsSync(uploadsDir2)) {
    fs9.mkdirSync(uploadsDir2, { recursive: true });
  }
  app.use("/uploads", express2.static(uploadsDir2));
  const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir2);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path11.extname(file.originalname));
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
        { name: process.env.GROUP_ZERO_NAME || 'PROYECTO "Vecy Network"', id: circuloGroupId }
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
      const { eq: eq14, gte: gte4 } = await import("drizzle-orm");
      const { handleDetectedMatches: handleDetectedMatches2 } = await Promise.resolve().then(() => (init_janIA(), janIA_exports));
      const db = await getDb2();
      if (!db) return res.status(500).send("No DB connection");
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      const matches = await db.select().from(propertyMatches2).where(gte4(propertyMatches2.createdAt, today));
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
      console.log("Iniciando Bot Oficial JanIA (+573192919978) Baileys (.baileys_auth)...");
      Promise.resolve().then(() => (init_whatsapp_match(), whatsapp_match_exports)).then(({ janiaMatchBot: janiaMatchBot2 }) => {
        janiaMatchBot2.initialize();
      }).catch((err) => console.error("[WHATSAPP-MATCH] Error al iniciar bot oficial:", err));
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
    if (janiaMatchBot) {
      console.log("[SYSTEM] Cerrando sesi\xF3n de JanIA Match Bot (Baileys)...");
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
