import { getDb } from "../server/db";
import { messages } from "../drizzle/schema";
import { desc } from "drizzle-orm";

async function checkLatest() {
  console.log("🔍 Buscando los ÚLTIMOS mensajes registrados en TODA la base de datos...");
  const db = await getDb();
  if (!db) return;

  try {
    const res = await db.select().from(messages).orderBy(desc(messages.id)).limit(20);

    if (res.length === 0) {
      console.log("⚠️ La tabla 'messages' está completamente vacía.");
    } else {
      console.log(`\n✅ Se encontraron ${res.length} mensajes recientes:`);
      res.forEach(m => {
        console.log(`[ID: ${m.id} | ${m.createdAt?.toISOString()}] ${m.role}: ${m.content.substring(0, 80)}...`);
      });
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

checkLatest();
