/**
 * Cleanup Script: Strip scraper content from rawText in existing REQUIREMENTS
 *
 * Same as cleanup_rawtext_scraper_dump.ts but targets the `requirements` table.
 * Removes [CONTENIDO DE ENLACE WEB...] blocks, wa.me page dumps, Google Photos
 * links, and WhatsApp marketing page content accidentally stored in rawText.
 *
 * Safe to run multiple times.
 *
 * Usage (from project root):
 *   npx tsx scripts/cleanup_requirements_rawtext.ts
 */

import "dotenv/config";
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

const SCRAPER_MARKER = /\n\n\[CONTENIDO DE ENLACE WEB EXTRA[IÍ]DO DE .*$/s;
const BARE_URL_LINES = /^https?:\/\/[^\s]+$/gm;
const MARKDOWN_LINKS = /\[.*?\]\(https?:\/\/[^\)]+\)/g;
const EXCESSIVE_NEWLINES = /\n{3,}/g;

function cleanRawText(raw: string): string {
  return raw
    .replace(SCRAPER_MARKER, "")           // Cut everything from the scraper block
    .replace(BARE_URL_LINES, "")           // Remove lines that are only a URL
    .replace(MARKDOWN_LINKS, "")           // Remove [text](url) markdown links
    .replace(EXCESSIVE_NEWLINES, "\n\n")   // Collapse blank lines
    .trim();
}

async function main() {
  console.log("🧹 Requirements rawText Cleanup Script Starting...");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not set.");
    process.exit(1);
  }

  const db = await getDb();
  if (!db) {
    console.error("❌ Could not connect to database.");
    process.exit(1);
  }

  // Fetch all requirements that contain contaminated content
  const result = await db.execute(sql`
    SELECT id, "rawText"
    FROM requirements
    WHERE "rawText" LIKE '%[CONTENIDO DE ENLACE WEB%'
       OR "rawText" LIKE '%wa.me%'
       OR "rawText" LIKE '%whatsapp.com%'
       OR "rawText" LIKE '%photos.app.goo.gl%'
       OR "rawText" LIKE '%photos.google.com/share%'
       OR "rawText" LIKE '%Markdown Content:%'
       OR "rawText" LIKE '%URL Source:%'
  `);

  const rows: { id: number; rawText: string }[] = Array.from(result as any).map((r: any) => ({
    id: r.id,
    rawText: r.rawText ?? r.raw_text ?? "",
  }));

  console.log(`\n📋 Found ${rows.length} requirements with contaminated rawText.\n`);

  if (rows.length === 0) {
    console.log("✅ Nothing to clean. All requirements are already clean.");
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
        UPDATE requirements
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
