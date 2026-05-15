import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { referralLinks, users, properties, clientLedger } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

export const affiliatesRouter = router({
  /**
   * Generar un enlace de referido para un inmueble
   */
  generateLink: protectedProcedure
    .input(z.object({ propertyId: z.number() }))
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

      if (existing.length > 0) {
        return { token: existing[0].token, url: `/property/${input.propertyId}?ref=${existing[0].token}` };
      }

      // Crear nuevo token único
      const token = nanoid(10);
      await db.insert(referralLinks).values({
        propertyId: input.propertyId,
        agentId: ctx.user.id,
        token: token,
      });

      return { 
        token, 
        url: `/property/${input.propertyId}?ref=${token}`,
        message: "Link de referido generado con éxito. ¡Empieza a compartir y gana puntos!"
      };
    }),

  /**
   * Registrar un clic en un link de referido (público)
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
   * Ver mis puntos y estadísticas de referidos
   */
  getMyStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const user = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
    const myLinks = await db.select().from(referralLinks).where(eq(referralLinks.agentId, ctx.user.id));
    
    const totalClicks = myLinks.reduce((acc, link) => acc + (link.clicks || 0), 0);

    return {
      vPoints: user[0]?.vPoints || 0,
      totalLinks: myLinks.length,
      totalClicks: totalClicks,
      links: myLinks
    };
  }),

  /**
   * Reclamar puntos (Simulación de cuando se genera un lead válido)
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
        .set({ vPoints: sql`${users.vPoints} + ${input.points}` })
        .where(eq(users.id, link[0].agentId));

      return { success: true, pointsAwarded: input.points };
    }),
});
