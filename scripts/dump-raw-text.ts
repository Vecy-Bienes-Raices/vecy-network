import { getDb } from "../server/db";

async function dumpRawText() {
  const db = await getDb();
  if (!db) return;
  try {
    const res = await db.execute(`
      SELECT id, name, "rawText", "createdAt" 
      FROM properties 
      WHERE "createdAt" >= '2026-05-18' 
      ORDER BY id DESC
    `);
    console.log(JSON.stringify(res, null, 2));
    
    const reqs = await db.execute(`
      SELECT id, name, "rawText", "createdAt" 
      FROM requirements 
      WHERE "createdAt" >= '2026-05-18' 
      ORDER BY id DESC
    `);
    console.log("\nREQUERIMIENTOS:");
    console.log(JSON.stringify(reqs, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

dumpRawText();
