import 'dotenv/config';
import { getDb } from '../server/db';
import { properties, requirements } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { calcularScoreMatch } from '../server/_core/matching';

async function main() {
  const db = await getDb();
  if (!db) return;

  const [prop] = await db.select().from(properties).where(eq(properties.id, 110));
  const [req] = await db.select().from(requirements).where(eq(requirements.id, 25));

  console.log('--- Property 110 ---', JSON.stringify(prop, null, 2));
  console.log('--- Requirement 25 ---', JSON.stringify(req, null, 2));

  const score = calcularScoreMatch(req, prop);
  console.log('Calculated Score:', score);
}

main().catch(console.error);
