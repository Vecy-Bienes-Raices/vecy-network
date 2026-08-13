import 'dotenv/config';
import { getDb } from '../db';
import { propertyMatches, properties, requirements, notificationLogs } from '../../drizzle/schema';
import { explicarMatch } from '../_core/matching';
import { eq } from 'drizzle-orm';

async function runPurge() {
  console.log('⚡ Starting Addendum v8 Strict 3-Level Geo Purge...');
  const db = await getDb();
  if (!db) {
    console.error('❌ Could not connect to DB');
    process.exit(1);
  }

  const allMatches = await db.select().from(propertyMatches);
  console.log(`🔍 Total historical matches in database: ${allMatches.length}`);

  let purgedCount = 0;
  let validCount = 0;

  for (const m of allMatches) {
    if (!m.propertyId || !m.requirementId) continue;

    const [prop] = await db.select().from(properties).where(eq(properties.id, m.propertyId)).limit(1);
    const [req] = await db.select().from(requirements).where(eq(requirements.id, m.requirementId)).limit(1);

    if (!prop || !req) {
      console.log(`🚫 Purging Match #${m.id}: Property or Requirement missing.`);
      await db.delete(notificationLogs).where(eq(notificationLogs.matchId, m.id));
      await db.delete(propertyMatches).where(eq(propertyMatches.id, m.id));
      purgedCount++;
      continue;
    }

    const result = explicarMatch(req, prop);

    if (result.score < 85) {
      console.log(`🚫 Purging Match #${m.id} (${prop.zone || prop.addressNeighborhood || 'N/E'} ↔ ${req.zonaDeseada || req.addressNeighborhood || 'N/E'}): Score ${result.score}% < 85% Mínimo Doctrinal.`);
      await db.delete(notificationLogs).where(eq(notificationLogs.matchId, m.id));
      await db.delete(propertyMatches).where(eq(propertyMatches.id, m.id));
      purgedCount++;
    } else {
      validCount++;
    }
  }

  console.log(`\n🎉 Purge Finished!`);
  console.log(`✅ Valid 3-Level Matches Kept: ${validCount}`);
  console.log(`🗑️ Invalid Matches Purged: ${purgedCount}`);
  process.exit(0);
}

runPurge().catch(err => {
  console.error('❌ Error during purge:', err);
  process.exit(1);
});
