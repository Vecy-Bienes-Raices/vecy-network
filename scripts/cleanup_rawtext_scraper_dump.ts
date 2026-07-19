/**
 * Cleanup Script: Strip scraper content from rawText in existing properties
 *
 * Removes the `[CONTENIDO DE ENLACE WEB EXTRAÍDO DE ...]` blocks that were
 * accidentally stored in rawText for properties processed before the Sprint 3 fix.
 *
 * Safe to run multiple times — only updates rows that still contain the marker.
 *
 * Usage (from project root):
 *   npx tsx scripts/cleanup_rawtext_scraper_dump.ts
 */

import "dotenv/config";
import { getDb } from "../server/db";
import { properties } from "../drizzle/schema";
import { sql } from "drizzle-orm";

// Regex: removes everything from the scraper block marker onwards
const SCRAPER_MARKER = /\n\n\[CONTENIDO DE ENLACE WEB EXTRA[IÍ]DO DE .*$/s;
// Also strip bare URLs that appear as entire lines (Google Photos style)
const BARE_URL_LINES = /^https?:\/\/[^\s]+$/gm;
// Collapse excessive blank lines
const EXCESSIVE_NEWLINES = /\n{3,}/g;

function cleanRawText(raw: string): string {
  return raw
    .replace(SCRAPER_MARKER, "")
    .replace(BARE_URL_LINES, "")
    .replace(EXCESSIVE_NEWLINES, "\n\n")
    .trim();
}

async function main() {
  console.log("🧹 rawText Cleanup Script Starting...");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not set.");
    process.exit(1);
  }

  const db = await getDb();
  if (!db) {
    console.error("❌ Could not connect to database.");
    process.exit(1);
  }

  // Fetch all properties that contain the scraper marker (using raw SQL for flexibility)
  const result = await db.execute(sql`
    SELECT id, "rawText"
    FROM properties
    WHERE "rawText" LIKE '%[CONTENIDO DE ENLACE WEB%'
       OR "rawText" LIKE '%photos.app.goo.gl%'
       OR "rawText" LIKE '%photos.google.com/share%'
       OR "rawText" LIKE '%Markdown Content:%'
  `);

  // db.execute returns an array-like object; normalize to a plain array
  const rows: { id: number; rawText: string }[] = Array.from(result as any).map((r: any) => ({
    id: r.id,
    rawText: r.rawText ?? r.raw_text ?? "",
  }));

  console.log(`\n📋 Found ${rows.length} properties with contaminated rawText.\n`);

  if (rows.length === 0) {
    console.log("✅ Nothing to clean. All records are already clean.");
    process.exit(0);
  }

  let updated = 0;
  let failed = 0;

  for (const row of rows) {
    const cleaned = cleanRawText(row.rawText || "");
    
    if (cleaned === (row.rawText || "").trim()) {
      console.log(`   ⏭️  ID ${row.id} — no changes after cleaning (skipped)`);
      continue;
    }

    try {
      await db.execute(sql`
        UPDATE properties
        SET "rawText" = ${cleaned}
        WHERE id = ${row.id}
      `);
      console.log(`   ✅ ID ${row.id} — cleaned (${(row.rawText || "").length} → ${cleaned.length} chars)`);
      updated++;
    } catch (err: any) {
      console.error(`   ❌ ID ${row.id} — failed: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n🚀 Done. Updated: ${updated} | Failed: ${failed} | Skipped: ${rows.length - updated - failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("❌ Unhandled error:", err);
  process.exit(1);
});
