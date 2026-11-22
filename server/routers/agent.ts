import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { eq, and, desc, isNull, ne, or, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  agencies,
  agentJaniaChannels,
  agentLegalToolLogs,
  properties,
  referralLinks,
  users,
} from "../../drizzle/schema";
import { extractTenantSlugFromHost, isCustomWhiteLabelHost, normalizeHostname } from "../../shared/whitelabel";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";
import crypto from "crypto";
import {
  decryptChannelSecret,
  encryptChannelSecret,
  executePrivateJaniaTurn,
  hashVerifyToken,
} from "../_core/privateJaniaService";
import {
  assertCanConfigureWhatsAppCloudByo,
  assertCanUseLegalTool,
  assertCanUsePrivateJania,
  getAiAndLegalQuotasSummary,
  getUserEffectiveEntitlements,
  incrementUsageQuota,
} from "../_core/planEntitlements";
import { resolveUserTenantScope } from "../_core/crmService";
import { analyzeCtlFromWhatsAppInput } from "../_core/ctlTitleStudyService";
import { persistWebGeneratedPdf } from "../_core/jania/handlers/webChatService";
import { executeIdentityVerification } from "./agenda";
import { executeMarketValuationSurvey } from "../_core/valuation";

export const PERSONALITY_PROMPTS: Record<string, string> = {
  normal: "Mantén un tono equilibrado, claro, amable y servicial. Responde con precisión y naturalidad.",
  audaz: "Mantén un tono audaz, persuasivo y orientado al cierre comercial. Destaca oportunidades únicas, valorización y sentido de urgencia con elegancia.",
  profesional: "Mantén un tono altamente ejecutivo, corporativo, técnico y jurídico. Habla como un consultor patrimonial de alto nivel.",
  extrovertida: "Mantén un tono entusiasta, carismático, cálido, energético y cercano. Transmite emoción positiva por cada inmueble.",
  seria: "Mantén un tono sobrio, directo al grano, formal y enfocado estrictamente en cifras, áreas, precios y datos verificables sin adornos.",
  cordial: "Mantén un tono profundamente empático, hospitalario, paciente y familiar. Haz que el cliente se sienta acompañado paso a paso.",
};

export const VIRTUAL_STAGING_STYLES: Record<string, {
  id: string;
  name: string;
  tagline: string;
  valueBoostPct: number;
  speedBoostPct: number;
  beforeImage: string;
  afterImage: string;
  materials: string[];
  furnitureSpec: string[];
  lightingSpec: string;
}> = {
  "modern-scandinavian": {
    id: "modern-scandinavian",
    name: "Escandinavo Moderno & Cálido",
    tagline: "Madera roble claro, lino crudo e iluminación cálida 3000K para apartamentos familiares",
    valueBoostPct: 14,
    speedBoostPct: 38,
    beforeImage: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
    afterImage: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
    materials: ["Piso SPC Roble Nórdico", "Pintura Blanco Hueso Mate", "Textiles en Lino Natural y Bouclé"],
    furnitureSpec: ["Sofá modular en L tono marfil", "Mesa de centro orgánica en roble", "Alfombra tejida de pelo corto", "Plantas Ficus Lyrata y Olivo interior"],
    lightingSpec: "Luz indirecta cálida 3000K en cortineros + lámpara de pie minimalista en bronce cepillado",
  },
  "luxury-minimalist": {
    id: "luxury-minimalist",
    name: "Luxury Minimalista & Mármol",
    tagline: "Estética de penthouse de alta gama tipo Rosales / Chicó con acentos en mármol Calacatta y nogal",
    valueBoostPct: 18,
    speedBoostPct: 45,
    beforeImage: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
    afterImage: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
    materials: ["Porcelanato Gran Formato Calacatta", "Paneles alistonados en Nogal Americano", "Perfilería Negra Anodizada"],
    furnitureSpec: ["Sofá italiano de perfil bajo en cuero cognac o gris topo", "Comedor de 8 puestos con cubierta en piedra sinterizada", "Arte abstracto de gran formato"],
    lightingSpec: "Rieles magnéticos empotrados + luminaria colgante escultural sobre comedor",
  },
  "industrial-loft": {
    id: "industrial-loft",
    name: "Loft Industrial Contemporáneo",
    tagline: "Ideal para apartaestudios, dúplex, Chapinero Alto, Poblado o renta corta AirBnB",
    valueBoostPct: 15,
    speedBoostPct: 42,
    beforeImage: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
    afterImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    materials: ["Microcemento gris satinado", "Ladrillo a la vista hidrofugado", "Acero negro mate y madera teca"],
    furnitureSpec: ["Sofá Chester contemporáneo en cuero camel", "Estantería abierta en hierro y madera maciza", "Barra tipo isla con butacos altos"],
    lightingSpec: "Spots dirigibles en riel negro + bombillería cálida de filamento LED",
  },
  "executive-office": {
    id: "executive-office",
    name: "Oficina Corporativa Boutique",
    tagline: "Transforma locales o plantas libres en oficinas ejecutivas listas para multinacionales",
    valueBoostPct: 16,
    speedBoostPct: 35,
    beforeImage: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
    afterImage: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
    materials: ["Divisiones en vidrio templado acústico 10mm", "Piso vinílico de tráfico pesado", "Cielo raso con paneles fonoabsorbentes"],
    furnitureSpec: ["Puestos de trabajo ergonómicos colaborativos", "Sala de juntas para 10 personas con pantalla 85\"", "Zona lounge de café corporativo"],
    lightingSpec: "Iluminación lineal LED neutra 4000K de alta eficiencia para productividad",
  },
  "declutter-clean": {
    id: "declutter-clean",
    name: "Despeje Visual & Luz Natural IA",
    tagline: "Limpia visualmente espacios recargados o antiguos para destacar amplitud y distribución real",
    valueBoostPct: 12,
    speedBoostPct: 30,
    beforeImage: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
    afterImage: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80",
    materials: ["Muros en blanco puro arquitectónico", "Pisos pulidos y lacados", "Ventanales despejados de cortinas pesadas"],
    furnitureSpec: ["Mobiliario neutro minimalista a escala exacta para evidenciar circulación libre"],
    lightingSpec: "Realce de luz solar natural + balance de blancos neutro HDR",
  },
};

export const CONTRACT_TEMPLATES_CATALOG: Record<string, {
  id: string;
  title: string;
  legalBasis: string;
  description: string;
}> = {
  arrendamiento_vivienda: {
    id: "arrendamiento_vivienda",
    title: "Contrato de Arrendamiento de Vivienda Urbana",
    legalBasis: "Ley 820 de 2003 y Código Civil Colombiano",
    description: "Cláusulas completas de canon, incremento IPC, obligaciones de mantenimiento, inventario, prohibición de subarriendo y mérito ejecutivo.",
  },
  promesa_compraventa: {
    id: "promesa_compraventa",
    title: "Promesa de Compraventa de Bien Inmueble",
    legalBasis: "Artículo 1611 del Código Civil y Ley 527 de 1999",
    description: "Tradición, libertad de gravámenes, arras confirmatorias/penales, forma de pago, fecha y Notaría de escrituración y entrega material.",
  },
  mandato_consignacion: {
    id: "mandato_consignacion",
    title: "Contrato de Consignación y Mandato Comercial",
    legalBasis: "Código de Comercio Colombiano (Arts. 1262 y ss.)",
    description: "Autorización de comercialización, honorarios de corretaje (3% venta / 1er canon arriendo), difusión en red colaborativa y protección de puntas.",
  },
  presentacion_cliente: {
    id: "presentacion_cliente",
    title: "Acta de Presentación de Cliente y Reserva de Comisión (40/20/40)",
    legalBasis: "Ley 527 de 1999 — Acuerdo de Corretaje Colaborativo",
    description: "Blindaje antielusión de punta captadora y punta colocadora, registro de identidad del comprador/arrendatario y distribución transparente.",
  },
};

export const agentRouter = router({
  // Public: Get agent profile for branding (Agenda Pro, Personal Shops, Branded Fichas)
  getProfile: publicProcedure
    .input(z.object({ id: z.number().optional(), subdomain: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      if (!input.id && !input.subdomain) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "id or subdomain required" });
      }

      const whereClause = input.id
        ? eq(users.id, input.id)
        : eq(users.subdomain, (input.subdomain || "").toLowerCase().trim());

      const agent = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        vPoints: users.vPoints,
        customLogoUrl: users.customLogoUrl,
        themeConfig: users.themeConfig,
        subdomain: users.subdomain,
        activeTools: users.activeTools,
      })
      .from(users)
      .where(whereClause)
      .limit(1);

      if (agent.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      return agent[0];
    }),

  // Public: Get complete Agent Microsite data (profile + own properties + optional network collaborative properties)
  getStoreBySubdomain: publicProcedure
    .input(z.object({
      slug: z.string().optional(),
      host: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const requestHost = normalizeHostname(input.host || (ctx.req?.headers?.["x-forwarded-host"] as string) || (ctx.req?.headers?.host as string));
      const hostSlug = extractTenantSlugFromHost(requestHost);
      const customHost = isCustomWhiteLabelHost(requestHost) ? requestHost : null;
      const cleanSlug = (input.slug || hostSlug || "").toLowerCase().trim();

      if (!cleanSlug && !customHost) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "slug or custom host required" });
      }

      const numericId = cleanSlug && !isNaN(Number(cleanSlug)) ? Number(cleanSlug) : null;

      let agencyRow: typeof agencies.$inferSelect | undefined;
      if (customHost) {
        const rows = await db.select().from(agencies).where(eq(agencies.customDomain, customHost)).limit(1);
        agencyRow = rows[0];
      }
      if (!agencyRow && cleanSlug) {
        const rows = await db.select().from(agencies).where(eq(agencies.slug, cleanSlug)).limit(1);
        agencyRow = rows[0];
      }

      const agentRows = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        vPoints: users.vPoints,
        customLogoUrl: users.customLogoUrl,
        themeConfig: users.themeConfig,
        subdomain: users.subdomain,
        activeTools: users.activeTools,
      })
      .from(users)
      .where(
        agencyRow
          ? eq(users.id, agencyRow.ownerUserId)
          : numericId
            ? or(eq(users.subdomain, cleanSlug), eq(users.id, numericId))
            : eq(users.subdomain, cleanSlug)
      )
      .limit(1);

      if (agentRows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sitio de agente no encontrado" });
      }

      const baseAgent = agentRows[0];
      const baseTheme = (baseAgent.themeConfig as Record<string, any>) || {};
      const agencyTheme = (agencyRow?.themeConfig as Record<string, any>) || {};
      const mergedTheme: Record<string, any> = {
        ...agencyTheme,
        ...baseTheme,
        agencyName: baseTheme.agencyName || agencyRow?.brandName || baseAgent.name || "Inmobiliaria Asociada",
        slogan: baseTheme.slogan || agencyRow?.tagline || "Portafolio Inmobiliario Certificado • Red Colaborativa",
        primaryColor: baseTheme.primaryColor || agencyRow?.primaryColor || "#0f4c81",
        secondaryColor: baseTheme.secondaryColor || agencyRow?.secondaryColor || "#0f172a",
        contactPhone: baseTheme.contactPhone || agencyRow?.whatsappBusinessPhone || baseAgent.phone || "",
        contactEmail: baseTheme.contactEmail || agencyRow?.contactEmail || baseAgent.email || "",
      };

      const agent = {
        ...baseAgent,
        subdomain: baseAgent.subdomain || agencyRow?.slug || cleanSlug,
        customLogoUrl: baseAgent.customLogoUrl || agencyRow?.logoUrl || null,
        themeConfig: mergedTheme,
      };

      const showNetworkCatalog = mergedTheme.showNetworkCatalog !== false;

      // Inmuebles propios del agente (excluye privados)
      const ownProperties = await db.select()
        .from(properties)
        .where(
          and(
            eq(properties.agentId, agent.id),
            eq(properties.available, true),
            or(ne(properties.visibilityScope, "private"), isNull(properties.visibilityScope))
          )
        )
        .orderBy(desc(properties.featured), desc(properties.createdAt))
        .limit(80);

      // Inmuebles de la red colaborativa (solo si showNetworkCatalog está activo)
      const networkProperties = showNetworkCatalog
        ? await db.select()
            .from(properties)
            .where(
              and(
                eq(properties.available, true),
                eq(properties.aceptaTerceria, true),
                or(eq(properties.republishToVecyStore, true), isNull(properties.republishToVecyStore)),
                or(
                  and(ne(properties.visibilityScope, "agent_only"), ne(properties.visibilityScope, "private")),
                  isNull(properties.visibilityScope)
                )
              )
            )
            .orderBy(desc(properties.featured), desc(properties.createdAt))
            .limit(40)
        : [];

      const seenIds = new Set(ownProperties.map(p => p.id));
      const combinedProperties = [
        ...ownProperties.map(p => ({ ...p, isOwnProperty: true })),
        ...networkProperties
          .filter(p => !seenIds.has(p.id))
          .map(p => ({ ...p, isOwnProperty: false })),
      ];

      return {
        agent,
        agency: agencyRow || null,
        ownCount: ownProperties.length,
        networkCount: combinedProperties.length - ownProperties.length,
        showNetworkCatalog,
        properties: combinedProperties,
      };
    }),

  // Protected: Obtener la configuración completa de marca y herramientas del usuario autenticado
  getMyBrandConfig: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const rows = await db.select()
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (rows.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    return rows[0];
  }),

  // Protected: Actualizar marca, plantilla tipo Wasi, colores, subdominio y herramientas Pro (Agenda Pro, Widget IA, etc.)
  updateBrandConfig: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      subdomain: z.string().optional(),
      customLogoUrl: z.string().optional().nullable(),
      themeConfig: z.object({
        agencyName: z.string().optional(),
        slogan: z.string().optional(),
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        accentColor: z.string().optional(),
        templateStyle: z.enum(["wasi-classic", "luxury-editorial", "modern-minimal"]).optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().optional(),
        websiteUrl: z.string().optional(),
        instagramUrl: z.string().optional(),
        facebookUrl: z.string().optional(),
        linkedinUrl: z.string().optional(),
        address: z.string().optional(),
        nit: z.string().optional(),
        showNetworkCatalog: z.boolean().optional(),
      }).optional(),
      activeTools: z.object({
        agendaPro: z.object({
          enabled: z.boolean().default(false),
          notifyEmail: z.string().optional(),
          notifyWhatsapp: z.string().optional(),
          requireIdentityVerification: z.boolean().default(true),
          customHeaderTitle: z.string().optional(),
        }).optional(),
        aiAgentWidget: z.object({
          enabled: z.boolean().default(false),
          agentName: z.string().default("Sofía IA"),
          gender: z.enum(["female", "male"]).default("female"),
          personality: z.enum(["normal", "audaz", "profesional", "extrovertida", "seria", "cordial"]).default("profesional"),
          customPrompt: z.string().optional(),
          welcomeMessage: z.string().optional(),
          avatarUrl: z.string().optional(),
        }).optional(),
        roiCalculator: z.object({
          enabled: z.boolean().default(true),
          defaultInterestRateEA: z.number().default(11.5),
        }).optional(),
        qradorSmartSearch: z.object({
          enabled: z.boolean().default(true),
          allowCollaborativeNetwork: z.boolean().default(true),
        }).optional(),
        instantValuator: z.object({
          enabled: z.boolean().default(true),
          captureOwnerLeads: z.boolean().default(true),
        }).optional(),
        virtualStaging: z.object({
          enabled: z.boolean().default(true),
          defaultStyle: z.string().default("modern-scandinavian"),
        }).optional(),
        contractGenerator: z.object({
          enabled: z.boolean().default(true),
          includeDigitalSeal: z.boolean().default(true),
        }).optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const currentRows = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (currentRows.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
      const current = currentRows[0];

      // Normalizar subdominio si viene
      let cleanSubdomain = current.subdomain;
      if (input.subdomain !== undefined) {
        const normalized = input.subdomain
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");
        if (normalized.length > 0) {
          const existingSub = await db.select({ id: users.id })
            .from(users)
            .where(eq(users.subdomain, normalized))
            .limit(1);
          if (existingSub.length > 0 && existingSub[0].id !== ctx.user.id) {
            throw new TRPCError({ code: "CONFLICT", message: "Ese subdominio/enlace ya está en uso por otro miembro de la red." });
          }
          cleanSubdomain = normalized;
        } else {
          cleanSubdomain = null;
        }
      }

      const mergedTheme = {
        ...((current.themeConfig as Record<string, any>) || {}),
        ...(input.themeConfig || {}),
      };

      const mergedTools = {
        ...((current.activeTools as Record<string, any>) || {}),
        ...(input.activeTools || {}),
      };

      const updated = await db.update(users)
        .set({
          name: input.name !== undefined ? input.name : current.name,
          phone: input.phone !== undefined ? input.phone : current.phone,
          email: input.email !== undefined ? input.email : current.email,
          subdomain: cleanSubdomain,
          customLogoUrl: input.customLogoUrl !== undefined ? input.customLogoUrl : current.customLogoUrl,
          themeConfig: mergedTheme,
          activeTools: mergedTools,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id))
        .returning();

      return updated[0];
    }),

  // Public: Chat con el Widget Privado de JanIA del Suscriptor (RAG Inventario + Notarial + CRM/Agenda)
  chatWithCustomAgent: publicProcedure
    .input(z.object({
      agentUserId: z.number(),
      message: z.string().min(1).max(1500),
      propertyContext: z.string().optional(),
      propertyId: z.number().int().positive().optional(),
      visitorName: z.string().max(160).optional(),
      visitorEmail: z.string().email().optional().or(z.literal("")),
      visitorPhone: z.string().max(40).optional(),
      history: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const res = await executePrivateJaniaTurn({
          agentUserId: input.agentUserId,
          channelType: "web_widget",
          message: input.message,
          propertyContext: input.propertyContext,
          propertyId: input.propertyId,
          history: input.history,
          visitorName: input.visitorName || undefined,
          visitorEmail: input.visitorEmail || undefined,
          visitorPhone: input.visitorPhone || undefined,
        });
        return res;
      } catch (err: any) {
        return {
          reply: "Estoy lista para asesorarte con el portafolio de la agencia o agendar tu visita personalizada.",
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
    }),

  getMyProperties: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    return await db.select()
      .from(properties)
      .where(eq(properties.agentId, ctx.user.id))
      .orderBy(desc(properties.createdAt));
  }),

  // For testing: Allows an agent to claim a property that has no agent assigned
  claimProperty: protectedProcedure
    .input(z.object({ propertyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const property = await db.select().from(properties).where(eq(properties.id, input.propertyId)).limit(1);
      if (property.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found" });
      if (property[0].agentId) throw new TRPCError({ code: "FORBIDDEN", message: "Property already has an agent" });

      await db.update(properties)
        .set({ agentId: ctx.user.id })
        .where(eq(properties.id, input.propertyId));
        
      return { success: true };
    }),

  getAvailablePropertiesToClaim: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    // En un escenario real, sólo admin podría asignar. Aquí para pruebas dejamos claim general
    return await db.select()
      .from(properties)
      .where(isNull(properties.agentId))
      .orderBy(desc(properties.createdAt));
  }),

  generateStealthLink: protectedProcedure
    .input(z.object({ propertyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Permitimos generar enlace blindado tanto para inmuebles propios como de la red colaborativa (Gana-Gana)
      const property = await db.select().from(properties).where(eq(properties.id, input.propertyId)).limit(1);
      if (property.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found" });

      // Check if link already exists
      const existingLink = await db.select()
        .from(referralLinks)
        .where(
          and(
            eq(referralLinks.propertyId, input.propertyId),
            eq(referralLinks.agentId, ctx.user.id)
          )
        ).limit(1);

      if (existingLink.length > 0) {
        return existingLink[0];
      }

      // Generate a unique token
      const token = `vcy_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;

      const newLinks = await db.insert(referralLinks).values({
        propertyId: input.propertyId,
        agentId: ctx.user.id,
        token,
      }).returning();

      return newLinks[0];
    }),

  getStealthLinks: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    return await db.select({
      link: referralLinks,
      property: {
        id: properties.id,
        name: properties.name,
        matriculaInmobiliaria: properties.matriculaInmobiliaria,
        location: properties.location,
        zone: properties.zone,
        price: properties.price,
      }
    })
    .from(referralLinks)
    .innerJoin(properties, eq(referralLinks.propertyId, properties.id))
    .where(eq(referralLinks.agentId, ctx.user.id))
    .orderBy(desc(referralLinks.createdAt));
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔎 HERRAMIENTA PRO 4 (ESTILO QRADOR + IA): BUSCADOR SEMÁNTICO EN LENGUAJE NATURAL & CURADOR DE COLECCIONES
  // ═══════════════════════════════════════════════════════════════════════════
  semanticCuratorSearch: publicProcedure
    .input(z.object({
      query: z.string().min(3).max(600),
      agentUserId: z.number().optional(),
      includeNetwork: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const raw = input.query.toLowerCase();

      // 1. Extracción semántica determinística de alta velocidad ($0 COP)
      let detectedType: string | null = null;
      if (/\b(apartaestudio|loft)\b/i.test(raw)) detectedType = "Apartaestudio";
      else if (/\b(apartamento|apto|penthouse|duplex|dúplex)\b/i.test(raw)) detectedType = "Apartamento";
      else if (/\b(casa|campestre|condominio|chalet|quinta)\b/i.test(raw)) detectedType = "Casa";
      else if (/\b(bodega|industrial|galpon)\b/i.test(raw)) detectedType = "Bodega";
      else if (/\b(oficina|consultorio)\b/i.test(raw)) detectedType = "Oficina";
      else if (/\b(local|comercial|vitrina)\b/i.test(raw)) detectedType = "Local";
      else if (/\b(lote|terreno|finca)\b/i.test(raw)) detectedType = "Lote";

      let detectedTx: string | null = null;
      if (/\b(permuta|cambio|reciba|parte de pago)\b/i.test(raw)) detectedTx = "permuta";
      else if (/\b(arriendo|arrendar|alquiler|canon|renta)\b/i.test(raw)) detectedTx = "arriendo";
      else if (/\b(venta|comprar|compra|inversion|inversión)\b/i.test(raw)) detectedTx = "venta";

      // Presupuesto en millones (ej: "850 millones", "850M", "$850.000.000")
      let maxBudgetCop: number | null = null;
      const millMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*(?:millones|mill|m\b|mm\b)/i);
      if (millMatch) {
        const val = parseFloat(millMatch[1].replace(",", "."));
        if (!isNaN(val) && val > 0) {
          maxBudgetCop = val < 20000 ? val * 1_000_000 : val;
        }
      } else {
        const bigNumMatch = raw.match(/\$?\s*(\d{2,4})\.(\d{3})\.(\d{3})/);
        if (bigNumMatch) {
          maxBudgetCop = parseInt(`${bigNumMatch[1]}${bigNumMatch[2]}${bigNumMatch[3]}`, 10);
        }
      }

      // Habitaciones / Alcobas
      let detectedBeds: number | null = null;
      const bedsMatch = raw.match(/(\d)\s*(?:habitaciones|alcobas|hab|cuartos|dormitorios)/i);
      if (bedsMatch) detectedBeds = parseInt(bedsMatch[1], 10);

      // Área mínima (m2)
      let minArea: number | null = null;
      const areaMatch = raw.match(/(\d{2,4})\s*(?:m2|mts|metros|m²)/i);
      if (areaMatch) minArea = parseInt(areaMatch[1], 10);

      // Palabras clave de ubicación y estilo de vida
      const stopWords = new Set([
        "busco", "quiero", "necesito", "para", "con", "sin", "que", "tenga", "hasta", "desde",
        "millones", "apartamento", "apto", "casa", "bodega", "oficina", "local", "lote", "venta",
        "arriendo", "comprar", "habitaciones", "alcobas", "baños", "garaje", "parqueadero", "en",
        "el", "la", "los", "las", "un", "una", "por", "cerca", "sector", "zona", "barrio", "de", "del", "o", "y"
      ]);
      const keywords = raw
        .replace(/[^\wáéíóúñ\s]/gi, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !stopWords.has(w) && !/^\d+$/.test(w));

      // 2. Consultar catálogo de PostgreSQL
      const allProps = await db.select()
        .from(properties)
        .orderBy(desc(properties.createdAt))
        .limit(80);

      // 3. Puntuación inteligente de afinidad estilo Curador IA (Qrador + Vecy Match)
      const scored = allProps.map((prop) => {
        let score = 82;
        const reasons: string[] = [];
        const propText = `${prop.name || ""} ${prop.zone || ""} ${prop.location || ""} ${prop.description || ""} ${prop.propertyType || ""}`.toLowerCase();
        const numPrice = Number(prop.price || 0);
        const numArea = Number(prop.areaTotal || 0);

        // Bonificación si pertenece al propio suscriptor
        const isOwnProperty = input.agentUserId ? prop.agentId === input.agentUserId : false;
        if (isOwnProperty) {
          score += 4;
          reasons.push("Destacado de nuestra agencia");
        }

        if (detectedType) {
          if ((prop.propertyType || "").toLowerCase().includes(detectedType.toLowerCase())) {
            score += 6;
            reasons.push(`Tipología exacta (${prop.propertyType})`);
          } else {
            score -= 12;
          }
        }

        if (detectedTx) {
          const pTx = (prop.transactionType || "venta").toLowerCase();
          if (pTx.includes(detectedTx) || (detectedTx === "permuta" && pTx.includes("permuta"))) {
            score += 5;
            reasons.push(detectedTx === "permuta" ? "Acepta permuta / canje" : `Modalidad ${prop.transactionType}`);
          } else {
            score -= 10;
          }
        }

        if (maxBudgetCop && numPrice > 0) {
          if (numPrice <= maxBudgetCop) {
            score += 6;
            reasons.push(`Dentro de presupuesto ($${(numPrice / 1_000_000).toFixed(0)}M)`);
          } else if (numPrice <= maxBudgetCop * 1.12) {
            score += 2;
            reasons.push(`Precio negociable cercano ($${(numPrice / 1_000_000).toFixed(0)}M)`);
          } else {
            score -= 15;
          }
        }

        if (detectedBeds !== null && prop.bedrooms !== null) {
          if (prop.bedrooms === detectedBeds) {
            score += 6;
            reasons.push(`${prop.bedrooms} alcobas exactas`);
          } else {
            score -= 10;
          }
        }

        if (minArea !== null && numArea > 0) {
          if (numArea >= minArea) {
            score += 4;
            reasons.push(`Área amplia (${numArea} m²)`);
          } else {
            score -= 8;
          }
        }

        let matchedKeywords = 0;
        for (const kw of keywords) {
          if (propText.includes(kw)) {
            matchedKeywords++;
            score += 4;
          }
        }
        if (matchedKeywords > 0) {
          reasons.push(`Coincide en ubicación/atributos clave`);
        }

        const clampedScore = Math.max(65, Math.min(99, score));
        return {
          property: prop,
          affinityScore: clampedScore,
          isOwnProperty,
          curatorReason: reasons.length > 0
            ? reasons.slice(0, 3).join(" • ")
            : `Seleccionado por relación área/precio (${numArea || 90} m² en ${prop.zone || prop.location})`,
        };
      });

      const curatedList = scored
        .filter((item) => input.includeNetwork || item.isOwnProperty)
        .sort((a, b) => b.affinityScore - a.affinityScore)
        .slice(0, 6);

      const collectionCode = `COL-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      return {
        collectionCode,
        parsedFilters: {
          propertyType: detectedType,
          transactionType: detectedTx,
          maxBudgetCop,
          bedrooms: detectedBeds,
          minArea,
          keywords,
        },
        totalMatched: curatedList.length,
        curatedProperties: curatedList,
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // 📈 HERRAMIENTA PRO 5 (ESTILO HABI / CASACOL + IA): AVALÚO INSTANTÁNEO ACM & CAPTADOR DE PROPIETARIOS
  // ═══════════════════════════════════════════════════════════════════════════
  calculateInstantValuation: publicProcedure
    .input(z.object({
      agentUserId: z.number().optional(),
      city: z.string().default("Bogotá"),
      zone: z.string().min(2),
      propertyType: z.string().default("Apartamento"),
      areaM2: z.number().min(15).max(10000),
      bedrooms: z.number().min(0).max(20).default(3),
      bathrooms: z.number().min(1).max(20).default(2),
      garages: z.number().min(0).max(10).default(1),
      estrato: z.number().min(1).max(6).default(4),
      ageYears: z.number().min(0).max(80).default(8),
      condition: z.enum(["excelente", "bueno", "remodelar"]).default("bueno"),
      ownerName: z.string().optional(),
      ownerWhatsapp: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();

      // Matriz base de valor m² en Colombia por zona y estrato
      const zLower = `${input.city} ${input.zone}`.toLowerCase();
      let baseM2Cop = 6_200_000;

      if (/(rosales|chico|chicó|cabrera|virrey|retiro|santa ana|multicentro)/i.test(zLower)) {
        baseM2Cop = 10_800_000;
      } else if (/(santa barbara|bárbara|usaque|usaquén|colina|cedritos|contador|castellana|niza|salitre|modelia)/i.test(zLower)) {
        baseM2Cop = 7_400_000;
      } else if (/(chapinero|teusaquillo|javeriana|macarena|bosque|polo)/i.test(zLower)) {
        baseM2Cop = 7_100_000;
      } else if (/(chia|chía|cajica|cajicá|cota|sopó|sopo|la calera|sabana)/i.test(zLower)) {
        baseM2Cop = 6_600_000;
      } else if (/(poblado|tesoro|provenza|llanogrande|laureles|envigado)/i.test(zLower)) {
        baseM2Cop = 8_900_000;
      } else if (/(bocagrande|castillogrande|manga|manzanillo|alto prado|ciudad jardin|ciudad jardín)/i.test(zLower)) {
        baseM2Cop = 7_800_000;
      } else {
        // Ajuste por estrato
        const estratoMap: Record<number, number> = {
          1: 3_200_000,
          2: 4_100_000,
          3: 5_200_000,
          4: 6_500_000,
          5: 8_100_000,
          6: 10_200_000,
        };
        baseM2Cop = estratoMap[input.estrato] || 6_200_000;
      }

      // Factor por depreciación de antigüedad (Fitto y Corvini simplificado)
      const ageFactor = Math.max(0.72, 1 - input.ageYears * 0.0085);

      // Factor por estado de conservación / remodelación
      const conditionFactor =
        input.condition === "excelente" ? 1.08 : input.condition === "remodelar" ? 0.86 : 1.0;

      // Bono por garajes y baños
      const garageBonusCop = input.garages * 28_000_000;
      const bathBonusCop = Math.max(0, input.bathrooms - 1) * 8_500_000;

      const adjustedM2Cop = Math.round(baseM2Cop * ageFactor * conditionFactor);
      const optimalSalePrice = Math.round((adjustedM2Cop * input.areaM2 + garageBonusCop + bathBonusCop) / 1_000_000) * 1_000_000;
      const minQuickSalePrice = Math.round((optimalSalePrice * 0.93) / 1_000_000) * 1_000_000;
      const maxMarketCeilingPrice = Math.round((optimalSalePrice * 1.07) / 1_000_000) * 1_000_000;

      // Canon mensual estimado (0.58% mensual promedio en Colombia)
      const estimatedMonthlyRent = Math.round((optimalSalePrice * 0.0058) / 50_000) * 50_000;
      const annualGrossYieldPct = Number((((estimatedMonthlyRent * 12) / optimalSalePrice) * 100).toFixed(2));

      // Si el propietario dejó sus datos y hay un agente dueño del micro-sitio, premiamos con +50 vPoints
      if (db && input.agentUserId && input.ownerWhatsapp) {
        await db.update(users)
          .set({ vPoints: sql`COALESCE(${users.vPoints}, 0) + 50` })
          .where(eq(users.id, input.agentUserId));
      }

      return {
        valuationCode: `ACM-${Date.now().toString(36).toUpperCase()}`,
        city: input.city,
        zone: input.zone,
        propertyType: input.propertyType,
        areaM2: input.areaM2,
        pricePerM2Cop: adjustedM2Cop,
        minQuickSalePrice,
        optimalSalePrice,
        maxMarketCeilingPrice,
        estimatedMonthlyRent,
        annualGrossYieldPct,
        estimatedSaleDaysWithVecy: 45,
        traditionalPortalDays: 180,
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎨 HERRAMIENTA PRO 6 (ESTILO MATTERPORT / GIRAFFE360 / QRADOR PHOTO AI): HOME STAGING VIRTUAL IA
  // ═══════════════════════════════════════════════════════════════════════════
  generateVirtualStagingPlan: publicProcedure
    .input(z.object({
      styleId: z.string().default("modern-scandinavian"),
      roomType: z.enum(["sala_comedor", "alcoba_principal", "cocina_abierta", "oficina_estudio", "terraza_lounge"]).default("sala_comedor"),
      areaM2: z.number().min(8).max(500).default(35),
      customPhotoUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const style = VIRTUAL_STAGING_STYLES[input.styleId] || VIRTUAL_STAGING_STYLES["modern-scandinavian"];
      const estimatedStagingCostCop = Math.round((input.areaM2 * 380_000) / 100_000) * 100_000;

      const roomLabels: Record<string, string> = {
        sala_comedor: "Sala - Comedor Social",
        alcoba_principal: "Suite / Alcoba Principal",
        cocina_abierta: "Cocina Abierta Tipo Isla",
        oficina_estudio: "Oficina / Estudio Ejecutivo",
        terraza_lounge: "Terraza & Zona Lounge Exterior",
      };

      return {
        style,
        roomLabel: roomLabels[input.roomType] || "Sala Social",
        areaM2: input.areaM2,
        estimatedStagingCostCop,
        aiArchitecturalPrompt: `Architectural interior photography of a ${input.areaM2}sqm ${roomLabels[input.roomType]} in ${style.name} style, ${style.materials.join(", ")}, ${style.lightingSpec}, photorealistic 8k, ArchDaily Colombia featured.`,
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // ⚖️ HERRAMIENTA PRO 7 (ESTILO DOCUSIGN / AUTENTIC): GENERADOR DE CONTRATOS Y PROMESAS CON FIRMA DIGITAL LEY 527
  // ═══════════════════════════════════════════════════════════════════════════
  generateBrandedLegalContract: publicProcedure
    .input(z.object({
      agentUserId: z.number().optional(),
      contractType: z.enum([
        "arrendamiento_vivienda",
        "promesa_compraventa",
        "mandato_consignacion",
        "presentacion_cliente",
      ]),
      partyAName: z.string().min(2),
      partyADoc: z.string().min(4),
      partyBName: z.string().min(2),
      partyBDoc: z.string().min(4),
      propertyAddress: z.string().min(4),
      propertyCity: z.string().default("Bogotá D.C."),
      propertyMatricula: z.string().optional(),
      contractValueCop: z.number().min(100000),
      additionalClauses: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const template = CONTRACT_TEMPLATES_CATALOG[input.contractType] || CONTRACT_TEMPLATES_CATALOG.arrendamiento_vivienda;
      const nowIso = new Date().toISOString();
      const dateFormatted = new Date().toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const hashPayload = `${input.contractType}|${input.partyADoc}|${input.partyBDoc}|${input.propertyAddress}|${input.contractValueCop}|${nowIso}`;
      const sha256Seal = crypto.createHash("sha256").update(hashPayload).digest("hex");
      const cuvCode = `CUV-LEY527-${sha256Seal.substring(0, 10).toUpperCase()}`;

      const formattedCop = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
      }).format(input.contractValueCop);

      let clausesBody = "";
      if (input.contractType === "arrendamiento_vivienda") {
        clausesBody = `PRIMERA — OBJETO: EL ARRENDADOR entrega a título de arrendamiento de vivienda urbana a EL ARRENDATARIO el inmueble ubicado en ${input.propertyAddress}, ciudad de ${input.propertyCity}${input.propertyMatricula ? `, identificado con Folio de Matrícula Inmobiliaria No. ${input.propertyMatricula}` : ""}.

SEGUNDA — CANON DE ARRENDAMIENTO: El canon mensual será la suma de ${formattedCop} M/CTE, pagaderos dentro de los primeros cinco (5) días hábiles de cada período mensual conforme a la Ley 820 de 2003.

TERCERA — DESTINACIÓN Y CONSERVACIÓN: El inmueble se destinará exclusivamente a vivienda familiar de EL ARRENDATARIO, quien se obliga a conservarlo en perfecto estado y restituirlo en las mismas condiciones salvo el deterioro natural.

CUARTA — REAJUSTE ANUAL: Cumplidos doce (12) meses de ejecución, el canon se reajustará automáticamente hasta en el 100% del IPC certificado por el DANE para el año inmediatamente anterior (Art. 20 Ley 820 de 2003).`;
      } else if (input.contractType === "promesa_compraventa") {
        clausesBody = `PRIMERA — OBJETO: EL PROMITENTE VENDEDOR se obliga a vender y EL PROMITENTE COMPRADOR se obliga a adquirir a título de compraventa el bien inmueble ubicado en ${input.propertyAddress}, ciudad de ${input.propertyCity}${input.propertyMatricula ? `, Folio de Matrícula Inmobiliaria No. ${input.propertyMatricula}` : ""}.

SEGUNDA — PRECIO Y FORMA DE PAGO: El precio total pactado de común acuerdo es la suma de ${formattedCop} M/CTE, que EL PROMITENTE COMPRADOR pagará conforme al cronograma de desembolso acordado entre las partes.

TERCERA — LIBERTAD DE GRAVÁMENES Y SANEAMIENTO: EL PROMITENTE VENDEDOR garantiza que el inmueble se entregará libre de hipotecas, embargos, pleitos pendientes, condiciones resolutorias e impuestos prediales o de valorización al día.

CUARTA — ARRAS Y MÉRITO EJECUTIVO: Las partes pactan como arras de retractación y/o cláusula penal el equivalente al diez por ciento (10%) del valor total del negocio conforme al artículo 1611 del Código Civil Colombiano.`;
      } else if (input.contractType === "mandato_consignacion") {
        clausesBody = `PRIMERA — ENCARGO DE COMERCIALIZACIÓN: EL PROPIETARIO / MANDANTE faculta a LA AGENCIA INMOBILIARIA para promover, ofertar y gestionar la comercialización del inmueble situado en ${input.propertyAddress}, ciudad de ${input.propertyCity}, por un valor base de oferta de ${formattedCop} M/CTE.

SEGUNDA — HONORARIOS DE CORRETAJE: En caso de perfeccionarse la operación comercial con cliente presentado por LA AGENCIA o su Red Colaborativa, EL PROPIETARIO reconocerá por concepto de comisión el tres por ciento (3%) en compraventa (o el equivalente al primer canon mensual en arrendamiento).

TERCERA — AUTORIZACIÓN DE DIFUSIÓN Y FICHAS TÉCNICAS: Se autoriza la elaboración de fichas técnicas digitales, posicionamiento SEO y promoción calificada con filtro de seguridad de visitantes.`;
      } else {
        clausesBody = `PRIMERA — REGISTRO Y PROTECCIÓN DE PUNTA CLIENTE: Por medio de la presente acta se deja constancia fehaciente de la presentación oficial del cliente interesado (${input.partyBName} - Doc. ${input.partyBDoc}) para el inmueble ubicado en ${input.propertyAddress} (${input.propertyCity}), ofertado en ${formattedCop} M/CTE.

SEGUNDA — DISTRIBUCIÓN COLABORATIVA Y NO ELUSIÓN: Las partes intervinientes reconocen la trazabilidad de presentación del cliente y se obligan a respetar la distribución de comisión acordada bajo el esquema colaborativo protegido, absteniéndose de realizar contacto directo elusivo por un término de doce (12) meses.`;
      }

      if (input.additionalClauses && input.additionalClauses.trim().length > 0) {
        clausesBody += `\n\nCLÁUSULA ESPECIAL ADICIONAL: ${input.additionalClauses.trim()}`;
      }

      return {
        cuvCode,
        sha256Seal,
        generatedAt: dateFormatted,
        title: template.title,
        legalBasis: template.legalBasis,
        partyAName: input.partyAName,
        partyADoc: input.partyADoc,
        partyBName: input.partyBName,
        partyBDoc: input.partyBDoc,
        propertyAddress: input.propertyAddress,
        propertyCity: input.propertyCity,
        propertyMatricula: input.propertyMatricula || "En verificación registral",
        formattedValue: formattedCop,
        clausesBody,
      };
    }),

  captureMicrositeLead: publicProcedure
    .input(z.object({
      agentUserId: z.number().int().positive().optional(),
      slug: z.string().max(120).optional(),
      propertyId: z.number().int().positive().optional(),
      name: z.string().min(2).max(200),
      email: z.string().email(),
      phone: z.string().max(30).optional(),
      inquiryType: z.enum(["buy", "sell", "rent", "invest", "general"]).default("buy"),
      estimatedBudget: z.union([z.number(), z.string()]).optional(),
      preferredCity: z.string().max(100).optional(),
      preferredZone: z.string().max(150).optional(),
      message: z.string().max(2500).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      let targetAgentId = input.agentUserId ?? null;
      let targetAgencyId: number | null = null;

      if (!targetAgentId && input.slug) {
        const cleanSlug = input.slug.trim().toLowerCase();
        const [ag] = await db
          .select({ id: agencies.id, ownerUserId: agencies.ownerUserId })
          .from(agencies)
          .where(eq(agencies.slug, cleanSlug))
          .limit(1);
        if (ag) {
          targetAgentId = ag.ownerUserId;
          targetAgencyId = ag.id;
        } else {
          const [usr] = await db
            .select({ id: users.id, defaultAgencyId: users.defaultAgencyId })
            .from(users)
            .where(eq(users.subdomain, cleanSlug))
            .limit(1);
          if (usr) {
            targetAgentId = usr.id;
            targetAgencyId = usr.defaultAgencyId ?? null;
          }
        }
      }

      if (!targetAgentId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No se identificó el asesor del portal." });
      }

      const { captureLeadIntoCrm } = await import("../_core/crmService");
      const captured = await captureLeadIntoCrm({
        agentId: targetAgentId,
        agencyId: targetAgencyId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        inquiryType: input.inquiryType,
        propertyId: input.propertyId ?? null,
        estimatedBudget: input.estimatedBudget ?? null,
        preferredCity: input.preferredCity ?? null,
        preferredZone: input.preferredZone ?? null,
        message: input.message ?? null,
        source: "microsite",
        pipelineStage: "nuevo",
        temperature: "warm",
        tags: ["microsite", input.slug ? `portal:${input.slug}` : "marca_blanca"],
        activityTitle: "Lead capturado desde Portal Marca Blanca",
        activityBody:
          input.message?.trim() ||
          `Nuevo prospecto ${input.name} registrado desde tu portal marca blanca.`,
      });

      return {
        success: true,
        leadId: captured.lead?.id ?? null,
        created: captured.created,
      };
    }),

  // Protected: Consultar canales privados de JanIA (web_widget + whatsapp_cloud_api) y cuotas del plan
  getPrivateJaniaChannels: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const rows = await db
      .select()
      .from(agentJaniaChannels)
      .where(eq(agentJaniaChannels.userId, ctx.user.id));

    const quotas = await getAiAndLegalQuotasSummary(ctx.user.id, ctx.user.role);
    const baseAppUrl = (
      process.env.APP_URL ||
      process.env.PUBLIC_BASE_URL ||
      process.env.VITE_APP_URL ||
      "https://vecygroup.com"
    ).replace(/\/+$/, "");

    return {
      quotas,
      webhookUrl: `${baseAppUrl}/api/whatsapp/webhook`,
      channels: rows.map((ch) => ({
        id: ch.id,
        channelType: ch.channelType as "web_widget" | "whatsapp_cloud_api",
        isActive: ch.isActive,
        assistantName: ch.assistantName,
        personaGender: ch.personaGender,
        personaTone: ch.personaTone,
        systemPromptOverride: ch.systemPromptOverride || "",
        welcomeMessage: ch.welcomeMessage || "",
        includeOwnInventory: ch.includeOwnInventory,
        includeNetworkInventory: ch.includeNetworkInventory,
        allowCrmCapture: ch.allowCrmCapture,
        allowVisitScheduling: ch.allowVisitScheduling,
        allowNotarialCalc: ch.allowNotarialCalc,
        wabaId: ch.wabaId || "",
        phoneNumberId: ch.phoneNumberId || "",
        displayPhoneNumber: ch.displayPhoneNumber || "",
        hasAccessToken: Boolean(ch.accessTokenEncrypted),
        hasAppSecret: Boolean(ch.appSecretEncrypted),
        hasVerifyToken: Boolean(ch.webhookVerifyTokenEncrypted || ch.webhookVerifyTokenHash),
        lastVerifiedAt: ch.lastVerifiedAt,
        lastInboundAt: ch.lastInboundAt,
        lastError: ch.lastError,
        updatedAt: ch.updatedAt,
      })),
    };
  }),

  // Protected: Configurar o actualizar canal privado de JanIA (cifrado AES-256-GCM para BYO-Number)
  upsertPrivateJaniaChannel: protectedProcedure
    .input(z.object({
      channelType: z.enum(["web_widget", "whatsapp_cloud_api"]),
      isActive: z.boolean().default(true),
      assistantName: z.string().min(2).max(120).default("Sofía IA"),
      personaGender: z.enum(["female", "male"]).default("female"),
      personaTone: z.enum(["normal", "audaz", "profesional", "extrovertida", "seria", "cordial"]).default("profesional"),
      systemPromptOverride: z.string().max(4000).optional().nullable(),
      welcomeMessage: z.string().max(600).optional().nullable(),
      includeOwnInventory: z.boolean().default(true),
      includeNetworkInventory: z.boolean().default(true),
      allowCrmCapture: z.boolean().default(true),
      allowVisitScheduling: z.boolean().default(true),
      allowNotarialCalc: z.boolean().default(true),
      wabaId: z.string().max(120).optional().nullable(),
      phoneNumberId: z.string().max(120).optional().nullable(),
      displayPhoneNumber: z.string().max(40).optional().nullable(),
      accessToken: z.string().max(2000).optional().nullable(),
      appSecret: z.string().max(500).optional().nullable(),
      webhookVerifyToken: z.string().max(300).optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      if (input.channelType === "whatsapp_cloud_api") {
        await assertCanConfigureWhatsAppCloudByo(ctx.user.id, ctx.user.role);
      } else {
        const ent = await getUserEffectiveEntitlements(ctx.user.id, ctx.user.role);
        if (!ent.isAdmin && !ent.plan.privateJaniaEnabled) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `El Agente JanIA Privado requiere plan Inmobiliaria Growth o Élite IA. Tu plan actual es ${ent.plan.name}.`,
          });
        }
      }

      const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);
      const primaryAgencyId =
        scope.defaultAgencyId ?? scope.agencyIdsAsManager[0] ?? scope.agencyIdsAsMember[0] ?? null;
      const [existing] = await db
        .select()
        .from(agentJaniaChannels)
        .where(
          and(
            eq(agentJaniaChannels.userId, ctx.user.id),
            eq(agentJaniaChannels.channelType, input.channelType),
          ),
        )
        .limit(1);

      const cleanAccessToken = input.accessToken?.trim() || "";
      const cleanAppSecret = input.appSecret?.trim() || "";
      const cleanVerifyToken = input.webhookVerifyToken?.trim() || "";

      const accessTokenEncrypted = cleanAccessToken
        ? encryptChannelSecret(cleanAccessToken)
        : existing?.accessTokenEncrypted ?? null;
      const appSecretEncrypted = cleanAppSecret
        ? encryptChannelSecret(cleanAppSecret)
        : existing?.appSecretEncrypted ?? null;
      const webhookVerifyTokenEncrypted = cleanVerifyToken
        ? encryptChannelSecret(cleanVerifyToken)
        : existing?.webhookVerifyTokenEncrypted ?? null;
      const webhookVerifyTokenHash = cleanVerifyToken
        ? hashVerifyToken(cleanVerifyToken)
        : existing?.webhookVerifyTokenHash ?? null;

      if (input.channelType === "whatsapp_cloud_api" && input.isActive) {
        if (!input.phoneNumberId?.trim() || !accessTokenEncrypted || !webhookVerifyTokenHash) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Para activar WhatsApp Cloud API BYO-Number debes suministrar Phone Number ID, Access Token y Verify Token.",
          });
        }
      }

      const values = {
        userId: ctx.user.id,
        agencyId: primaryAgencyId,
        channelType: input.channelType,
        isActive: input.isActive,
        assistantName: input.assistantName.trim(),
        personaGender: input.personaGender,
        personaTone: input.personaTone,
        systemPromptOverride: input.systemPromptOverride?.trim() || null,
        welcomeMessage: input.welcomeMessage?.trim() || null,
        includeOwnInventory: input.includeOwnInventory,
        includeNetworkInventory: input.includeNetworkInventory,
        allowCrmCapture: input.allowCrmCapture,
        allowVisitScheduling: input.allowVisitScheduling,
        allowNotarialCalc: input.allowNotarialCalc,
        wabaId: input.wabaId?.trim() || null,
        phoneNumberId: input.phoneNumberId?.trim() || null,
        displayPhoneNumber: input.displayPhoneNumber?.trim() || null,
        accessTokenEncrypted,
        appSecretEncrypted,
        webhookVerifyTokenEncrypted,
        webhookVerifyTokenHash,
        lastError: null,
        updatedAt: new Date(),
      };

      if (existing) {
        await db
          .update(agentJaniaChannels)
          .set(values)
          .where(eq(agentJaniaChannels.id, existing.id));
      } else {
        await db.insert(agentJaniaChannels).values(values);
      }

      return {
        success: true,
        channelType: input.channelType,
        hasSecretRoundTrip: Boolean(accessTokenEncrypted && decryptChannelSecret(accessTokenEncrypted)),
      };
    }),

  // Protected: Probar consulta RAG del Agente JanIA Privado desde el Dashboard
  testPrivateJaniaRag: protectedProcedure
    .input(z.object({
      message: z.string().min(2).max(1500),
      includeOwnInventory: z.boolean().optional(),
      includeNetworkInventory: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertCanUsePrivateJania(ctx.user.id, ctx.user.role, 1);
      return await executePrivateJaniaTurn({
        agentUserId: ctx.user.id,
        channelType: "web_widget",
        message: input.message,
        includeOwnOverride: input.includeOwnInventory,
        includeNetworkOverride: input.includeNetworkInventory,
      });
    }),

  // Protected: Resumen de cuotas legales/IA y trazabilidad histórica del agente/agencia
  getLegalSuiteSummary: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const quotas = await getAiAndLegalQuotasSummary(ctx.user.id, ctx.user.role);
    const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);
    const primaryAgencyId =
      scope.defaultAgencyId ?? scope.agencyIdsAsManager[0] ?? scope.agencyIdsAsMember[0] ?? null;

    const logs = await db
      .select()
      .from(agentLegalToolLogs)
      .where(
        primaryAgencyId
          ? or(
              eq(agentLegalToolLogs.userId, ctx.user.id),
              eq(agentLegalToolLogs.agencyId, primaryAgencyId),
            )
          : eq(agentLegalToolLogs.userId, ctx.user.id),
      )
      .orderBy(desc(agentLegalToolLogs.createdAt))
      .limit(25);

    return {
      quotas,
      logs,
    };
  }),

  // Protected: Estudio de Títulos SNR/CTL desde Dashboard SaaS con control de cuota y PDF membretado
  runCtlTitleStudy: protectedProcedure
    .input(z.object({
      text: z.string().max(60000).optional(),
      fileBase64: z.string().max(15_000_000).optional(),
      fileMimeType: z.string().max(120).optional(),
      fileName: z.string().max(260).optional(),
      matriculaHint: z.string().max(120).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      if (!input.text?.trim() && !input.fileBase64?.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Adjunta un PDF o imagen del Certificado de Tradición y Libertad, o pega el texto SNR.",
        });
      }

      await assertCanUseLegalTool(ctx.user.id, "ctl_study", ctx.user.role);
      const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);
      const primaryAgencyId =
        scope.defaultAgencyId ?? scope.agencyIdsAsManager[0] ?? scope.agencyIdsAsMember[0] ?? null;

      const cleanBase64 = input.fileBase64
        ? input.fileBase64.replace(/^data:[^;]+;base64,/i, "").trim()
        : undefined;
      const mime = (input.fileMimeType || "").toLowerCase();
      const isPdf = mime.includes("pdf") || /\.pdf$/i.test(input.fileName || "");

      const execution = await analyzeCtlFromWhatsAppInput({
        text: input.text?.trim() || null,
        pdfBuffer: isPdf ? cleanBase64 : undefined,
        pdfMimeType: isPdf ? input.fileMimeType || "application/pdf" : undefined,
        imageBuffer: !isPdf ? cleanBase64 : undefined,
        requesterName: ctx.user.name || "Asesor VECY",
      });

      if (!execution.isCtlDocument || !execution.report) {
        return {
          success: false,
          needsMediaGuidance: execution.needsMediaGuidance,
          message: execution.responseText,
          report: null,
          pdfUrl: null,
          quotas: await getAiAndLegalQuotasSummary(ctx.user.id, ctx.user.role),
        };
      }

      const pdfUrl = persistWebGeneratedPdf(execution.pdfBuffer, execution.pdfFileName) || null;
      await incrementUsageQuota(ctx.user.id, "ctlStudiesUsed", 1);

      const report = execution.report;
      await db.insert(agentLegalToolLogs).values({
        userId: ctx.user.id,
        agencyId: primaryAgencyId,
        toolType: "ctl_study",
        referenceCode: report.metadata.matriculaInmobiliaria || input.matriculaHint || null,
        subjectLabel:
          report.metadata.direccion ||
          report.metadata.matriculaInmobiliaria ||
          input.fileName ||
          "Estudio de Títulos SNR",
        verdictOrStatus: report.verdictCode,
        summaryText: report.whatsappSummary.slice(0, 1200),
        pdfUrl,
        metadata: {
          verdictLabel: report.verdictLabel,
          sourceType: report.sourceType,
          annotationsCount: report.auditoriaAnotaciones.length,
          criticalAlerts: report.alertasCriticasVigentes.length,
          gravamenesCount: report.gravamenesVigentes.length,
          limitacionesCount: report.limitacionesVigentes.length,
        },
      });

      return {
        success: true,
        needsMediaGuidance: false,
        message: report.whatsappSummary,
        report,
        pdfUrl,
        quotas: await getAiAndLegalQuotasSummary(ctx.user.id, ctx.user.role),
      };
    }),

  // Protected: Verificación de Identidad y Antecedentes con control de cuota SaaS
  runAgentIdentityCheck: protectedProcedure
    .input(z.object({
      tipoDocumento: z.enum(["CC", "CE", "NIT", "PAS"]),
      numeroDocumento: z.string().min(4).max(30),
      nombreCompleto: z.string().max(180).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await assertCanUseLegalTool(ctx.user.id, "identity_check", ctx.user.role);
      const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);
      const primaryAgencyId =
        scope.defaultAgencyId ?? scope.agencyIdsAsManager[0] ?? scope.agencyIdsAsMember[0] ?? null;
      const cleanDoc = input.numeroDocumento.replace(/[^0-9A-Za-z]/g, "").trim();

      const idRes = await executeIdentityVerification(
        input.tipoDocumento,
        cleanDoc,
        input.nombreCompleto?.trim() || undefined,
      );

      await incrementUsageQuota(ctx.user.id, "identityChecksUsed", 1);

      const statusBadge = idRes.alertaSeguridad
        ? "ALERTA"
        : idRes.valid && idRes.match
          ? "VERIFICADO"
          : idRes.valid
            ? "OBSERVACION"
            : "INVALIDO";

      await db.insert(agentLegalToolLogs).values({
        userId: ctx.user.id,
        agencyId: primaryAgencyId,
        toolType: "identity_check",
        referenceCode: `${input.tipoDocumento} ${cleanDoc}`,
        subjectLabel: idRes.officialName || input.nombreCompleto?.trim() || cleanDoc,
        verdictOrStatus: statusBadge,
        summaryText:
          idRes.advertenciaAntecedentes ||
          idRes.message ||
          idRes.error ||
          "Consulta de identidad y antecedentes completada.",
        metadata: {
          valid: idRes.valid,
          match: idRes.match,
          hasAntecedentes: Boolean(idRes.hasAntecedentes),
          alertaSeguridad: Boolean(idRes.alertaSeguridad),
          nameAutoCorrected: Boolean(idRes.nameAutoCorrected),
        },
      });

      return {
        success: true,
        statusBadge,
        result: idRes,
        quotas: await getAiAndLegalQuotasSummary(ctx.user.id, ctx.user.role),
      };
    }),

  // Protected: Avalúo Comercial ACM con control de cuota SaaS y trazabilidad
  runAgentValuation: protectedProcedure
    .input(z.object({
      ciudad: z.string().min(2).max(120),
      zonaOBarrio: z.string().min(2).max(160),
      direccionExacta: z.string().max(220).optional(),
      tipoInmueble: z.string().min(2).max(80).default("Apartamento"),
      areaM2: z.number().positive().max(1_000_000),
      antiguedadAnos: z.number().min(0).max(150).optional(),
      piso: z.number().int().min(1).max(80).optional(),
      garajes: z.number().int().min(0).max(30).optional(),
      habitaciones: z.number().int().min(0).max(30).optional(),
      banos: z.number().int().min(0).max(30).optional(),
      estrato: z.number().int().min(1).max(6).optional(),
      tieneAscensor: z.boolean().optional(),
      esClubHouse: z.boolean().optional(),
      esRemodelado: z.boolean().optional(),
      administracionCop: z.number().min(0).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await assertCanUseLegalTool(ctx.user.id, "valuation", ctx.user.role);
      const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);
      const primaryAgencyId =
        scope.defaultAgencyId ?? scope.agencyIdsAsManager[0] ?? scope.agencyIdsAsMember[0] ?? null;

      const survey = executeMarketValuationSurvey({
        ciudad: input.ciudad,
        zonaOBarrio: input.zonaOBarrio,
        barrio: input.zonaOBarrio,
        direccionExacta: input.direccionExacta,
        tipoInmueble: input.tipoInmueble,
        areaM2: input.areaM2,
        antiguedadAnos: input.antiguedadAnos,
        piso: input.piso,
        garajes: input.garajes,
        habitaciones: input.habitaciones,
        banos: input.banos,
        estrato: input.estrato,
        tieneAscensor: input.tieneAscensor,
        esClubHouse: input.esClubHouse,
        esRemodelado: input.esRemodelado,
        administracionCop: input.administracionCop,
        userId: String(ctx.user.id),
      });

      await incrementUsageQuota(ctx.user.id, "valuationsUsed", 1);

      const suggestedFormatted = Math.round(survey.suggestedCommercialValue).toLocaleString("es-CO");
      const rentFormatted = Math.round(survey.estimatedMonthlyRent).toLocaleString("es-CO");
      await db.insert(agentLegalToolLogs).values({
        userId: ctx.user.id,
        agencyId: primaryAgencyId,
        toolType: "valuation",
        referenceCode: `${input.ciudad} · ${input.areaM2}m²`,
        subjectLabel: `${input.tipoInmueble} · ${input.zonaOBarrio} (${input.ciudad})`,
        verdictOrStatus: "CALCULADO",
        summaryText: `Valor comercial sugerido: $${suggestedFormatted} COP · Canon est.: $${rentFormatted} COP/mes · Cap Rate: ${survey.estimatedCapRate}%`,
        metadata: {
          suggestedCommercialValue: survey.suggestedCommercialValue,
          minClosingPrice: survey.minClosingPrice,
          maxNegotiationPrice: survey.maxNegotiationPrice,
          homologatedPricePerM2: survey.valorM2Estimado,
          estimatedMonthlyRent: survey.estimatedMonthlyRent,
          estimatedCapRate: survey.estimatedCapRate,
        },
      });

      return {
        success: true,
        valuation: survey,
        quotas: await getAiAndLegalQuotasSummary(ctx.user.id, ctx.user.role),
      };
    }),
});

