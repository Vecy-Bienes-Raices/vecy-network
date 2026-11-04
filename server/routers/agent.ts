import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { eq, and, desc, isNull, or, sql } from "drizzle-orm";
import { getDb } from "../db";
import { properties, referralLinks, users } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";
import crypto from "crypto";

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

  // Public: Get complete Agent Microsite data (profile + own properties + network collaborative properties)
  getStoreBySubdomain: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const cleanSlug = input.slug.toLowerCase().trim();
      const numericId = !isNaN(Number(cleanSlug)) ? Number(cleanSlug) : null;

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
        numericId
          ? or(eq(users.subdomain, cleanSlug), eq(users.id, numericId))
          : eq(users.subdomain, cleanSlug)
      )
      .limit(1);

      if (agentRows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sitio de agente no encontrado" });
      }

      const agent = agentRows[0];

      // Inmuebles propios del agente + inmuebles colaborativos de la red Vecy que aceptan tercería
      const ownProperties = await db.select()
        .from(properties)
        .where(and(eq(properties.agentId, agent.id), eq(properties.available, true)))
        .orderBy(desc(properties.createdAt))
        .limit(50);

      const networkProperties = await db.select()
        .from(properties)
        .where(and(eq(properties.available, true), eq(properties.aceptaTerceria, true)))
        .orderBy(desc(properties.featured), desc(properties.createdAt))
        .limit(40);

      // Unificar sin duplicados poniendo primero los del propio agente
      const seenIds = new Set(ownProperties.map(p => p.id));
      const combinedProperties = [
        ...ownProperties,
        ...networkProperties.filter(p => !seenIds.has(p.id)),
      ];

      return {
        agent,
        ownCount: ownProperties.length,
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

  // Public: Chat con el Widget de Agente IA Personalizable del Suscriptor
  chatWithCustomAgent: publicProcedure
    .input(z.object({
      agentUserId: z.number(),
      message: z.string().min(1).max(1500),
      propertyContext: z.string().optional(),
      history: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const agentRows = await db.select()
        .from(users)
        .where(eq(users.id, input.agentUserId))
        .limit(1);

      const agentUser = agentRows[0];
      const theme = (agentUser?.themeConfig as any) || {};
      const tools = (agentUser?.activeTools as any) || {};
      const aiConfig = tools.aiAgentWidget || {};

      const botName = aiConfig.agentName || (aiConfig.gender === "male" ? "Mateo IA" : "Sofía IA");
      const genderLabel = aiConfig.gender === "male" ? "un asesor inmobiliario masculino" : "una asesora inmobiliaria femenina";
      const agencyName = theme.agencyName || agentUser?.name || "nuestra Agencia Inmobiliaria aliada de Vecy Network";
      const contactPhone = theme.contactPhone || agentUser?.phone || "+57 316 6569719";
      const contactEmail = theme.contactEmail || agentUser?.email || "";
      const personalityKey = aiConfig.personality || "profesional";
      const personalityDirective = PERSONALITY_PROMPTS[personalityKey] || PERSONALITY_PROMPTS.profesional;
      const customUserPrompt = aiConfig.customPrompt ? `\nINSTRUCCIONES PERSONALIZADAS DE LA AGENCIA:\n${aiConfig.customPrompt}` : "";

      const systemPrompt = `Eres ${botName}, ${genderLabel} con inteligencia artificial al servicio exclusivo de "${agencyName}".
PERSONALIDAD ACTIVA (${personalityKey.toUpperCase()}): ${personalityDirective}
${customUserPrompt}

DATOS OFICIALES DE CONTACTO DE LA AGENCIA:
- Agencia / Bróker: ${agencyName}
- WhatsApp / Teléfono directo: ${contactPhone}
${contactEmail ? `- Correo: ${contactEmail}` : ""}
${input.propertyContext ? `\nCONTEXTO DEL INMUEBLE O PÁGINA ACTUAL:\n${input.propertyContext}` : ""}

REGLAS DE ORO:
1. Responde en máximo 3 a 4 oraciones concisas, persuasivas y útiles en español colombiano.
2. Ayuda al visitante a resolver dudas sobre los inmuebles, financiación, ubicación, agendamiento de visitas y trámites.
3. Invita siempre de forma natural a agendar visita en línea o escribir al WhatsApp directo (${contactPhone}).`;

      try {
        const messagesPayload: any[] = [
          { role: "system", content: systemPrompt },
          ...(input.history || []).slice(-6).map(m => ({ role: m.role, content: m.content })),
          { role: "user", content: input.message },
        ];
        const llmRes = await invokeLLM({ messages: messagesPayload });
        const replyText = typeof llmRes?.choices?.[0]?.message?.content === "string"
          ? llmRes.choices[0].message.content
          : `¡Hola! Soy ${botName} de ${agencyName}. Con gusto te asesoro sobre este inmueble y agendamos tu visita. También puedes escribirnos directamente al WhatsApp ${contactPhone}.`;

        return {
          reply: replyText,
          botName,
          agencyName,
        };
      } catch (err) {
        return {
          reply: `¡Hola! Soy ${botName} de ${agencyName}. Estoy lista para ayudarte a agendar tu visita o brindarte todos los detalles técnicos en nuestro WhatsApp directo ${contactPhone}.`,
          botName,
          agencyName,
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
});

