import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { referralLinks, users, properties, clientLedger, shares } from "../../drizzle/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

// Control anti-fraude en memoria para evitar auto-clics repetidos en la misma ventana de 10 min
const recentTelemetryDedup = new Map<string, number>();

export const POINTS_MATRIX: Record<string, number> = {
  view: 2,
  engaged_read: 10,
  pdf_download: 15,
  qr_scan: 20,
  whatsapp_click: 25,
  share: 5,
  lead_conversion: 100,
};

export const affiliatesRouter = router({
  /**
   * Generar un enlace de referido para un inmueble (Soporta Modo Con Marca, Marca Blanca Neutra y Stealth)
   */
  generateLink: protectedProcedure
    .input(z.object({
      propertyId: z.number(),
      mode: z.enum(["branded", "neutral", "stealth", "ficha_branded", "ficha_neutral"]).optional().default("branded"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Verificar si ya existe un link para este usuario e inmueble
      const existing = await db.select().from(referralLinks).where(
        and(
          eq(referralLinks.propertyId, input.propertyId),
          eq(referralLinks.agentId, ctx.user.id)
        )
      ).limit(1);

      let token = existing[0]?.token;
      if (!token) {
        token = `vcy_${nanoid(10)}`;
        await db.insert(referralLinks).values({
          propertyId: input.propertyId,
          agentId: ctx.user.id,
          token: token,
        });
      }

      const buildUrlByMode = (tk: string, m: string) => {
        if (m === "stealth") return `/p/${tk}`;
        if (m === "neutral") return `/property/${input.propertyId}?mode=stealth&ref=${tk}`;
        if (m === "ficha_branded") return `/ficha/${input.propertyId}?mode=branded&agentId=${ctx.user.id}&ref=${tk}`;
        if (m === "ficha_neutral") return `/ficha/${input.propertyId}?mode=neutral&ref=${tk}`;
        return `/property/${input.propertyId}?mode=branded&agentId=${ctx.user.id}&ref=${tk}`;
      };

      return { 
        token, 
        url: buildUrlByMode(token, input.mode),
        urls: {
          brandedProperty: `/property/${input.propertyId}?mode=branded&agentId=${ctx.user.id}&ref=${token}`,
          neutralProperty: `/property/${input.propertyId}?mode=stealth&ref=${token}`,
          brandedFichaPdf: `/ficha/${input.propertyId}?mode=branded&agentId=${ctx.user.id}&ref=${token}`,
          neutralFichaPdf: `/ficha/${input.propertyId}?mode=neutral&ref=${token}`,
          stealthFirewall: `/p/${token}`,
        },
        message: "Enlace con sensor de seguimiento generado con éxito. ¡Comparte y acumula puntos de comisión!"
      };
    }),

  /**
   * Resolver un token de referido para obtener el Agente y su configuración de marca (si aplica)
   */
  resolveToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const linkRows = await db.select()
        .from(referralLinks)
        .where(eq(referralLinks.token, input.token))
        .limit(1);

      if (linkRows.length === 0) return null;
      const link = linkRows[0];

      const agentRows = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        customLogoUrl: users.customLogoUrl,
        themeConfig: users.themeConfig,
        subdomain: users.subdomain,
        activeTools: users.activeTools,
      })
      .from(users)
      .where(eq(users.id, link.agentId))
      .limit(1);

      return {
        link,
        agent: agentRows[0] || null,
      };
    }),

  /**
   * Registrar un clic en un link de referido (público - retrocompatible)
   */
  trackClick: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      await db.update(referralLinks)
        .set({ clicks: sql`${referralLinks.clicks} + 1` })
        .where(eq(referralLinks.token, input.token));

      return { success: true };
    }),

  /**
   * Sensor Inteligente ("Bot de Seguimiento") para Fichas Con Marca y Marca Blanca Neutra.
   * Detecta red social de origen, lectura real (>15s), descargas de PDF, escaneo de QR y otorga vPoints.
   */
  trackTelemetryEvent: publicProcedure
    .input(z.object({
      token: z.string().optional(),
      agentId: z.number().optional(),
      propertyId: z.number(),
      eventType: z.enum(["view", "engaged_read", "pdf_download", "qr_scan", "whatsapp_click", "share"]),
      platform: z.string().optional().default("direct"), // whatsapp, facebook, instagram, tiktok, linkedin, google_seo, pdf_qr, direct
      brandMode: z.enum(["branded", "neutral", "vecy", "stealth"]).optional().default("vecy"),
      visitorFingerprint: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false, pointsAwarded: 0 };

      let targetAgentId = input.agentId || null;
      let linkRecord: any = null;

      if (input.token) {
        const found = await db.select()
          .from(referralLinks)
          .where(eq(referralLinks.token, input.token))
          .limit(1);
        if (found.length > 0) {
          linkRecord = found[0];
          targetAgentId = found[0].agentId;
        }
      }

      if (!targetAgentId) {
        // Si no viene token ni agentId explícito, acreditar al captador oficial del inmueble si existe
        const propRows = await db.select({ agentId: properties.agentId })
          .from(properties)
          .where(eq(properties.id, input.propertyId))
          .limit(1);
        targetAgentId = propRows[0]?.agentId || null;
      }

      if (!targetAgentId) {
        return { success: true, pointsAwarded: 0 };
      }

      // Deduplicación anti-fraude por ventana de 10 minutos
      const dedupKey = `${targetAgentId}:${input.propertyId}:${input.eventType}:${input.visitorFingerprint || "anon"}`;
      const lastSeen = recentTelemetryDedup.get(dedupKey) || 0;
      const now = Date.now();
      if (now - lastSeen < 10 * 60 * 1000) {
        return { success: true, pointsAwarded: 0, deduplicated: true };
      }
      recentTelemetryDedup.set(dedupKey, now);

      const points = POINTS_MATRIX[input.eventType] || 2;

      // 1. Si es vista o clic con token, incrementar contador en referralLinks
      if (linkRecord && (input.eventType === "view" || input.eventType === "qr_scan")) {
        await db.update(referralLinks)
          .set({ clicks: sql`${referralLinks.clicks} + 1` })
          .where(eq(referralLinks.id, linkRecord.id));
      }

      // 2. Registrar el evento de marketing/SEO en la tabla shares
      const platformTag = `${(input.platform || "direct").toLowerCase()}_${input.brandMode}`;
      await db.insert(shares).values({
        propertyId: input.propertyId,
        agentId: targetAgentId,
        platform: platformTag.slice(0, 50),
        shareLink: input.token ? `ref:${input.token}|event:${input.eventType}` : `event:${input.eventType}`,
        pointsAwarded: points,
      });

      // 3. Acreditar vPoints al agente para el sistema de distribución de ganancias colaborativas
      await db.update(users)
        .set({ vPoints: sql`COALESCE(${users.vPoints}, 0) + ${points}` })
        .where(eq(users.id, targetAgentId));

      return {
        success: true,
        pointsAwarded: points,
        agentId: targetAgentId,
      };
    }),

  /**
   * Ver mis puntos, métricas de marketing por red social, descargas de PDF y estadísticas de referidos
   */
  getMyStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const user = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
    const myLinks = await db.select().from(referralLinks).where(eq(referralLinks.agentId, ctx.user.id));
    const myShares = await db.select()
      .from(shares)
      .where(eq(shares.agentId, ctx.user.id))
      .orderBy(desc(shares.createdAt))
      .limit(200);
    const myLedger = await db.select()
      .from(clientLedger)
      .where(eq(clientLedger.agentId, ctx.user.id));

    const totalClicks = myLinks.reduce((acc, link) => acc + (link.clicks || 0), 0);

    // Desglose por canal/red social y por tipo de evento
    const byPlatform: Record<string, number> = {
      whatsapp: 0,
      facebook: 0,
      instagram: 0,
      tiktok: 0,
      linkedin: 0,
      google_seo: 0,
      pdf_qr: 0,
      direct: 0,
    };

    let engagedReads = 0;
    let pdfDownloads = 0;
    let qrScans = 0;
    let brandedInteractions = 0;
    let neutralInteractions = 0;

    for (const s of myShares) {
      const plat = (s.platform || "").toLowerCase();
      if (plat.includes("whatsapp")) byPlatform.whatsapp++;
      else if (plat.includes("facebook") || plat.includes("fb")) byPlatform.facebook++;
      else if (plat.includes("instagram") || plat.includes("ig")) byPlatform.instagram++;
      else if (plat.includes("tiktok")) byPlatform.tiktok++;
      else if (plat.includes("linkedin")) byPlatform.linkedin++;
      else if (plat.includes("google") || plat.includes("seo")) byPlatform.google_seo++;
      else if (plat.includes("qr") || plat.includes("pdf")) byPlatform.pdf_qr++;
      else byPlatform.direct++;

      if (plat.includes("_neutral")) neutralInteractions++;
      else brandedInteractions++;

      const meta = s.shareLink || "";
      if (meta.includes("engaged_read")) engagedReads++;
      if (meta.includes("pdf_download")) pdfDownloads++;
      if (meta.includes("qr_scan")) qrScans++;
    }

    return {
      vPoints: user[0]?.vPoints || 0,
      totalLinks: myLinks.length,
      totalClicks: totalClicks,
      engagedReads,
      pdfDownloads,
      qrScans,
      leadsAnchored: myLedger.length,
      brandedInteractions,
      neutralInteractions,
      byPlatform,
      recentEvents: myShares.slice(0, 20),
      links: myLinks
    };
  }),

  /**
   * Reclamar puntos (Cuando se genera un lead válido o conversión)
   */
  rewardPoints: protectedProcedure
    .input(z.object({ referralToken: z.string(), points: z.number().default(100) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const link = await db.select().from(referralLinks).where(eq(referralLinks.token, input.referralToken)).limit(1);
      if (link.length === 0) throw new Error("Token de referido inválido");

      // Sumar puntos al dueño del link
      await db.update(users)
        .set({ vPoints: sql`COALESCE(${users.vPoints}, 0) + ${input.points}` })
        .where(eq(users.id, link[0].agentId));

      return { success: true, pointsAwarded: input.points };
    }),
});

