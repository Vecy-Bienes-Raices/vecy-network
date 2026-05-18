import { getDb } from "../server/db";
import { messages, conversations } from "../drizzle/schema";
import { desc, gte } from "drizzle-orm";

async function auditMessages() {
  console.log("🔍 Revisando historial de respuestas de JanIA de hoy...");
  const db = await getDb();
  if (!db) return;

  try {
    const today = new Date("2026-05-17T00:00:00Z");
    
    // Unir mensajes con sus conversaciones para tener contexto
    const latestMessages = await db.select().from(messages).where(gte(messages.createdAt, today)).orderBy(desc(messages.id)).limit(10);

    console.log("\n--- ÚLTIMOS 10 MENSAJES DE HOY ---");
    latestMessages.forEach(m => {
      console.log(`[${m.createdAt.toISOString()}] Rol: ${m.role} | Contenido: ${m.content.substring(0, 100)}...`);
    });

    if (latestMessages.length === 0) {
      console.log("\n⚠️ No hay mensajes registrados en la tabla 'messages' hoy. JanIA podría no estar registrando el historial o estar totalmente offline.");
    }

  } catch (e) {
    console.error("❌ Error auditando mensajes:", e);
  } finally {
    process.exit(0);
  }
}

auditMessages();
