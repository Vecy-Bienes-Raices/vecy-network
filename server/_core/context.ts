import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { ADMIN_EMAILS_LIST } from "../../shared/authRouting";
import { sdk } from "./sdk";

// Emails que SIEMPRE tienen acceso de superadministrador
const SUPERADMIN_EMAILS = ADMIN_EMAILS_LIST;

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  console.log(`[TRPC-CONTEXT] createContext called for ${opts.req.method} ${opts.req.url}`);
  let user: User | null = null;

  try {
    const hasAuth = !!(opts.req.headers.cookie || opts.req.headers.authorization);
    if (hasAuth) {
      // Timeout protector de 3500ms para tolerar latencia puntual al validar tokens Supabase en frío
      // sin congelar ni devolver 504 si un servicio externo no responde.
      user = await Promise.race([
        sdk.authenticateRequest(opts.req),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500))
      ]);
    }

    // Auto-promote known admin emails on every login
    if (user && SUPERADMIN_EMAILS.includes((user.email || "").toLowerCase())) {
      if ((user.role as string) !== "admin") {
        try {
          const { getDb } = await import("../db");
          const { users } = await import("../../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const db = await getDb();
          if (db) {
            await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
            user = { ...user, role: "admin" };
            console.log(`[Auth] ✅ Admin auto-promocionado: ${user.email}`);
          }
        } catch (e) {
          console.error("[Auth] Error promoting admin:", e);
        }
      }
    }

  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      // Mock user for local testing without OAuth Portal
      try {
        const { getDb } = await import("../db");
        const { users } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        const db = await getDb();
        if (db) {
          const existingUser = await db.select().from(users).where(eq(users.openId, "mock-local-user")).limit(1);
          if (existingUser.length > 0) {
            user = existingUser[0];
          } else {
            const newUser = await db.insert(users).values({
              openId: "mock-local-user",
              name: "Eddu Mendoza (Local Agent)",
              email: "demo@vecynetwork.co",
              loginMethod: "mock",
              role: "agent",
              documentType: "CC",
              documentNumber: "123456789",
              phone: "555-0000",
              vPoints: 100,
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
    user,
  };
}
