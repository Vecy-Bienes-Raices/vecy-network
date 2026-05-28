import 'dotenv/config';
import { getDb } from "../server/db";
import { messages, conversations } from "../drizzle/schema";
import { desc, eq, and, sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed");
    return;
  }
  try {
    console.log("🔍 Querying conversations...");
    const convs = await db.select().from(conversations).orderBy(desc(conversations.id)).limit(10);
    console.log("Recent conversations:");
    convs.forEach(c => {
      console.log(`[ID: ${c.id}] SessionId: ${c.sessionId} | LastMsg: ${c.lastMessage?.substring(0, 50)}...`);
    });

    console.log("\n🔍 Querying messages for Diego Gómez or sent to him...");
    // Let's find Diego's conversation
    // Diego's number starts with 573153100972
    const diegoConv = convs.find(c => c.sessionId.includes("573153100972") || c.sessionId.includes("3153100972"));
    if (diegoConv) {
      console.log(`Found Diego conversation ID: ${diegoConv.id}`);
      const diegoMsgs = await db.select().from(messages).where(eq(messages.conversationId, diegoConv.id)).orderBy(desc(messages.id)).limit(20);
      diegoMsgs.forEach(m => {
        console.log(`[ID: ${m.id} | ${m.createdAt?.toISOString()} | ${m.role}]: ${m.content.substring(0, 150)}`);
      });
    } else {
      console.log("Diego conversation not found in recent 10. Querying all messages from today...");
      const allMsgs = await db.select().from(messages).orderBy(desc(messages.id)).limit(50);
      allMsgs.forEach(m => {
        console.log(`[Conv: ${m.conversationId} | ID: ${m.id} | ${m.role}]: ${m.content.substring(0, 100)}`);
      });
    }

  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

main();
