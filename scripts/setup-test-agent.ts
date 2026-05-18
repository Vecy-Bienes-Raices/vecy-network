import { getDb } from "../server/db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🎨 Configurando Agente de Prueba con Branding VECY...");
  const db = await getDb();
  if (!db) return;

  try {
    // 1. Buscamos al usuario admin o el primero disponible para el demo
    const allUsers = await db.select().from(users).limit(1);
    if (allUsers.length === 0) {
      console.log("⚠️ No hay usuarios en la base de datos.");
      return;
    }

    const testAgent = allUsers[0];
    
    // 2. Le inyectamos una identidad visual "Gold Edition" personalizada
    await db.update(users).set({
      customLogoUrl: "https://i.ibb.co/LdrP9fG/logo-agente-demo.png", // Un logo de ejemplo
      themeConfig: {
        primaryColor: "#d4af37", // Oro más suave
        accentColor: "#10b981",  // Acento esmeralda
      },
      subdomain: "demo-agente"
    }).where(eq(users.id, testAgent.id));

    console.log(`✅ Agente "${testAgent.name}" configurado como Agente de Prueba.`);
    console.log(`\n🚀 URL DE EJEMPLO PARA AGENDA PRO:`);
    console.log(`http://localhost:5173/agenda/7?agentId=${testAgent.id}`);
    console.log(`\n(Reemplaza '7' por el ID de un inmueble real en tu local si es necesario)`);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    process.exit(0);
  }
}

main();
