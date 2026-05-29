import "dotenv/config";
import { whatsappBot } from "../server/_core/whatsapp";

async function main() {
  console.log("Esperando a que el bot esté listo...");
  while (!whatsappBot.isReady) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  const client = (whatsappBot as any).client;
  const groups = [
    { name: "VECY INMUEBLES NETWORK", id: (whatsappBot as any).targetGroupId },
    { name: "Buzón de Consultoría Inmobiliaria 24/7", id: (whatsappBot as any).buzonGroupId },
    { name: "Círculo CERO 👌", id: (whatsappBot as any).circuloGroupId }
  ];

  const botId = client.info?.wid?._serialized;
  console.log("Bot JID:", botId);

  for (const g of groups) {
    try {
      const chat = await client.getChatById(g.id);
      const participants = chat.participants || [];
      const botParticipant = participants.find((p: any) => p.id._serialized === botId);
      
      console.log(`\nGrupo: ${g.name} (${g.id})`);
      console.log(`- Participantes: ${participants.length}`);
      if (botParticipant) {
        console.log(`- Bot en el grupo: Sí`);
        console.log(`- Bot es Admin: ${botParticipant.isAdmin ? 'SÍ' : 'NO'}`);
        console.log(`- Bot es SuperAdmin: ${botParticipant.isSuperAdmin ? 'SÍ' : 'NO'}`);
      } else {
        console.log(`- Bot en el grupo: NO ENCONTRADO EN LA LISTA`);
      }
    } catch (e: any) {
      console.error(`Error inspectando grupo ${g.name}:`, e.message);
    }
  }
  process.exit(0);
}

main();
