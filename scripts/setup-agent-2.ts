import { getDb } from "../server/db";
import { users, InsertUser } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🎨 Configurando SEGUNDO Agente de Prueba (María Inmobiliaria)...");
  const db = await getDb();
  if (!db) return;

  try {
    // 1. Creamos un nuevo usuario para el demo si no existe uno suficiente
    // Para simplificar, buscaremos si hay al menos 2, si no creamos uno.
    const allUsers = await db.select().from(users);
    
    let secondAgent;
    if (allUsers.length < 2) {
       const [newUser] = await db.insert(users).values({
         openId: "demo_maria_id",
         name: "María Inmobiliaria",
         email: "maria.inmo@example.com",
         role: "agent",
       }).returning();
       secondAgent = newUser;
    } else {
       secondAgent = allUsers[1];
    }
    
    // 2. Le inyectamos una identidad visual COMPLETAMENTE DISTINTA
    await db.update(users).set({
      name: "María Inmobiliaria",
      customLogoUrl: "https://i.ibb.co/6P0qM7x/logo-maria-demo.png", // Otro logo
      themeConfig: {
        primaryColor: "#ef4444", // Rojo intenso
        accentColor: "#f59e0b",  // Ámbar
      },
      subdomain: "maria-inmo"
    }).where(eq(users.id, secondAgent.id));

    console.log(`✅ Agente "${secondAgent.name}" (ID: ${secondAgent.id}) configurado con marca ROJA.`);
    console.log(`\n🚀 URL DE EJEMPLO PARA AGENDA PRO (AGENTE 2):`);
    console.log(`http://localhost:5173/agenda/7?agentId=${secondAgent.id}`);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    process.exit(0);
  }
}

main();
