import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { eq, and, desc, isNull, or } from "drizzle-orm";
import { getDb } from "../db";
import { properties, referralLinks, users } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";

export const PERSONALITY_PROMPTS: Record<string, string> = {
  normal: "Mantén un tono equilibrado, claro, amable y servicial. Responde con precisión y naturalidad.",
  audaz: "Mantén un tono audaz, persuasivo y orientado al cierre comercial. Destaca oportunidades únicas, valorización y sentido de urgencia con elegancia.",
  profesional: "Mantén un tono altamente ejecutivo, corporativo, técnico y jurídico. Habla como un consultor patrimonial de alto nivel.",
  extrovertida: "Mantén un tono entusiasta, carismático, cálido, energético y cercano. Transmite emoción positiva por cada inmueble.",
  seria: "Mantén un tono sobrio, directo al grano, formal y enfocado estrictamente en cifras, áreas, precios y datos verificables sin adornos.",
  cordial: "Mantén un tono profundamente empático, hospitalario, paciente y familiar. Haz que el cliente se sienta acompañado paso a paso.",
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
        instantValuator: z.object({
          enabled: z.boolean().default(false),
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
});

