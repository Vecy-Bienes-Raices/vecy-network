import { WhatsAppBot } from './server/_core/whatsapp.ts';

async function main() {
  const bot = new WhatsAppBot();
  await bot.initialize();
  const client = (bot as any).client;
  
  const g1 = '120363259687769411@g.us';
  const g2 = '120363260445880355@g.us';
  
  try {
    const chat1 = await client.getChatById(g1);
    const msgs1 = await chat1.fetchMessages({ limit: 3 });
    console.log(`--- messages for ${g1} (${chat1.name}) ---`);
    msgs1.forEach((m: any) => console.log(`- FromMe: ${m.fromMe}, Author: ${m.author}, Body: ${m.body}`));
  } catch (err: any) {
    console.error(`Error ${g1}:`, err.message);
  }

  try {
    const chat2 = await client.getChatById(g2);
    const msgs2 = await chat2.fetchMessages({ limit: 3 });
    console.log(`--- messages for ${g2} (${chat2.name}) ---`);
    msgs2.forEach((m: any) => console.log(`- FromMe: ${m.fromMe}, Author: ${m.author}, Body: ${m.body}`));
  } catch (err: any) {
    console.error(`Error ${g2}:`, err.message);
  }
  
  process.exit(0);
}

main();
