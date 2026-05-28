import 'dotenv/config';
import { whatsappBot } from '../server/_core/whatsapp';

async function main() {
  console.log("⏳ Waiting for WhatsApp bot to be ready...");
  
  // Wait for the bot to be ready
  let attempts = 0;
  while (!whatsappBot.isReady && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    attempts++;
  }

  if (!whatsappBot.isReady) {
    console.error("❌ WhatsApp bot is not ready. Exiting.");
    process.exit(1);
  }

  const client = (whatsappBot as any).client;
  const targetGroupId = (whatsappBot as any).targetGroupId;
  console.log(`✅ Client ready. Fetching chat for group: ${targetGroupId}...`);

  try {
    const chat = await client.getChatById(targetGroupId);
    console.log(`Group Name: ${chat.name}`);
    const messages = await chat.fetchMessages({ limit: 40 });
    console.log(`\n--- LAST 40 MESSAGES IN GROUP ---`);
    for (const msg of messages) {
      const date = new Date(msg.timestamp * 1000).toLocaleString('es-CO', { timeZone: 'America/Bogota' });
      const sender = msg.fromMe ? 'JanIA' : msg.author || msg.from;
      console.log(`[${date}] ${sender}: ${msg.body.substring(0, 100).replace(/\n/g, ' ')}`);
      if (msg.hasQuotedMsg) {
        try {
          const quoted = await msg.getQuotedMessage();
          console.log(`  └─ Quoting: ${quoted.body.substring(0, 60).replace(/\n/g, ' ')}`);
        } catch (e) {}
      }
    }
  } catch (err: any) {
    console.error("❌ Error fetching group messages:", err.message || err);
  }
  process.exit(0);
}

// Start the bot client (it is already running in background, but we need to wait/use it)
// Wait, we can't initialize it here because it will try to open another Puppeteer session!
// Instead of initializing, let's check if we can fetch the messages via a simple curl request 
// to a new temporary API endpoint on the running server!
// Yes, the running server already has an active client, so we can just hit a temporary endpoint!
