import 'dotenv/config';
import { getDb } from '../server/db';
import { messages } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) return;

  const [msg] = await db.select().from(messages).where(eq(messages.id, 449));
  if (msg) {
    console.log('ID:', msg.id);
    console.log('Role:', msg.role);
    console.log('Content:', msg.content.substring(0, 100));
    console.log('Metadata:', JSON.stringify(msg.metadata, null, 2));
  } else {
    console.log('Message 449 not found.');
  }
}

main().catch(console.error);
