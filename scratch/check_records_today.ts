import 'dotenv/config';
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed");
    return;
  }
  try {
    const props = await db.execute(sql`
      SELECT id, name, "idUsuarioWhatsapp", "createdAt"
      FROM properties
      WHERE id >= 100
      ORDER BY id DESC
    `);
    console.log("=== PROPERTIES (ID >= 100) ===");
    console.log(props);

    const reqs = await db.execute(sql`
      SELECT id, name, "idUsuarioWhatsapp", "createdAt"
      FROM requirements
      WHERE id >= 100
      ORDER BY id DESC
    `);
    console.log("=== REQUIREMENTS (ID >= 100) ===");
    console.log(reqs);

    const allMsgs = await db.execute(sql`
      SELECT m.id, m.role, m.content, m."createdAt", c."sessionId"
      FROM messages m
      JOIN conversations c ON m."conversationId" = c.id
      WHERE m.id >= 450
      ORDER BY m.id DESC
    `);
    console.log("=== MESSAGES (ID >= 450) ===");
    console.log(allMsgs);

  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

main();
