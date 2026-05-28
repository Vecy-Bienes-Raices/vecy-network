import 'dotenv/config';
import { whatsappBot } from "../server/_core/whatsapp";

async function main() {
  console.log("Waiting for bot to be ready...");
  while (!whatsappBot.isReady) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log("Bot is ready. Triggering broadcastGroupPromos...");
  try {
    await whatsappBot.broadcastGroupPromos('./client/public/jania_post.png');
    console.log("broadcastGroupPromos finished.");
  } catch (e: any) {
    console.error("Broadcast failed:", e.message || e);
  }
  process.exit(0);
}

main();
