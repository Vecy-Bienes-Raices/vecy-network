import 'dotenv/config';
import { getDb } from '../server/db';
import { properties, messages } from '../drizzle/schema';
import { eq, or, like } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) return;

  // Search properties
  const props = await db.select().from(properties).where(
    or(
      eq(properties.idUsuarioWhatsapp, '573054233460'),
      eq(properties.idUsuarioWhatsapp, '210530774028353'),
      eq(properties.idUsuarioWhatsapp, '210530774028353@lid')
    )
  );

  console.log('--- PROPERTIES BY INGRID ---');
  props.forEach(p => {
    console.log(`ID: ${p.id} | Name: ${p.name} | RawText: \n${p.rawText}\n------------------`);
  });

  // Search messages in database
  const msgs = await db.select().from(messages).where(
    or(
      like(messages.content, '%Ingrid%'),
      like(messages.content, '%573054233460%'),
      like(messages.content, '%210530774028353%')
    )
  );

  console.log('--- DATABASE MESSAGES INVOLVING INGRID ---');
  msgs.forEach(m => {
    console.log(`ID: ${m.id} | Role: ${m.role} | Content: ${m.content}\n------------------`);
  });
}

main().catch(console.error);
