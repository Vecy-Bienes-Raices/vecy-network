import { getDb } from "../server/db";
import { properties } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function checkLatest() {
  console.log("🔍 Checking properties for user +57 300 7908850...");
  const db = await getDb();
  if (!db) return;

  try {
    const res = await db.select()
      .from(properties)
      .where(eq(properties.idUsuarioWhatsapp, "573007908850"));

    console.log(`Found ${res.length} properties:`);
    res.forEach(p => {
      console.log(`- ID: ${p.id} | Name: "${p.name}" | Price: ${p.price} | Created: ${p.createdAt} | JID: ${p.origenId} | Group: "${p.origenNombre}"`);
    });
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

checkLatest();
