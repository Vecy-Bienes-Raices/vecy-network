import "dotenv/config";
import fs from "fs";
import path from "path";
import { getDb } from "../server/db";
import { colombiaGeography } from "../drizzle/schema";

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function seed() {
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed");
    return;
  }

  const csvPath = path.resolve(process.cwd(), "scratch/divipola.csv");
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found at ${csvPath}`);
    return;
  }

  console.log("Reading DIVIPOLA CSV file...");
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== "");

  // Skip header line
  const dataLines = lines.slice(1);
  console.log(`Found ${dataLines.length} municipalities to insert.`);

  const batchSize = 100;
  let batch = [];
  let insertedCount = 0;

  for (const line of dataLines) {
    const cols = parseCsvLine(line);
    if (cols.length < 5) {
      console.warn(`Skipping invalid CSV line: ${line}`);
      continue;
    }

    const [codeDept, nameDept, codeMun, nameMun, type, longitude, latitude] = cols;

    batch.push({
      codeDept,
      nameDept,
      codeMun,
      nameMun,
      type,
      longitude: longitude || null,
      latitude: latitude || null
    });

    if (batch.length >= batchSize) {
      await db.insert(colombiaGeography).values(batch).onConflictDoNothing();
      insertedCount += batch.length;
      console.log(`Inserted ${insertedCount}/${dataLines.length} records...`);
      batch = [];
    }
  }

  // Insert remaining
  if (batch.length > 0) {
    await db.insert(colombiaGeography).values(batch).onConflictDoNothing();
    insertedCount += batch.length;
  }

  console.log(`DIVIPOLA Seeding completed successfully. Total records processed: ${insertedCount}`);
  process.exit(0);
}

seed().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
