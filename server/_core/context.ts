import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

// Emails que SIEMPRE tienen acceso de superadministrador
const SUPERADMIN_EMAILS = ["vecybienesraices@gmail.com"];

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);

    // Auto-promote known admin emails on every login
    if (user && SUPERADMIN_EMAILS.includes(user.email || "")) {
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
