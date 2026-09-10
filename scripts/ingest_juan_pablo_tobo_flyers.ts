import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { users, requirements } from "../drizzle/schema";
import { eq, ilike } from "drizzle-orm";
import { findMatchesForRequirement } from "../server/_core/matching";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("No DB connection");
    process.exit(1);
  }
  console.log("🚀 Iniciando ingesta forense de los flyers de Juan Pablo Tobo...");

  const phone = "573112911829";
  const name = "Juan Pablo Tobo Correa";
  const agency = "Inmo Propiedades";

  // 1. Buscar o crear usuario
  let user = (await db.select().from(users).where(eq(users.phone, phone)).limit(1))[0];
  if (!user) {
    user = (await db.select().from(users).where(ilike(users.name, "%Juan Pablo Tobo%")).limit(1))[0];
  }

  let userId: number | null = null;
  if (user) {
    userId = user.id;
    console.log(`✅ Usuario encontrado: ID ${userId} - ${user.name} (${user.phone})`);
  } else {
    const [newUser] = await db.insert(users).values({
      openId: `wa_${phone}`,
      name: `${name} (${agency})`,
      phone: phone,
      role: "agent",
    }).returning();
    userId = newUser.id;
    console.log(`✅ Usuario creado: ID ${userId} - ${newUser.name}`);
  }

  // 2. Requerimiento 1: Lotes Pablo VI / Cedritos
  console.log("\n📦 Creando Requerimiento 1: Lotes Pablo VI y Cedritos (600 - 1.600 m²)...");
  const [req1] = await db.insert(requirements).values({
    userId: userId,
    name: "Lotes para Constructores y Marcas en Expansión (600 - 1.600 m²)",
    tipoInmuebleDeseado: "land",
    tipoNegocioDeseado: "venta",
    tiposNegocioAceptados: ["venta"],
    ciudadDeseada: "Bogotá, D.C.",
    zonaDeseada: "Pablo VI / Cedritos",
    addressNeighborhood: "Pablo VI, Cedritos",
    addressLocality: "Teusaquillo / Usaquén",
    areaMin: "600",
    idUsuarioWhatsapp: phone,
    nombreUsuarioWhatsapp: `${name} (${agency})`,
    enlaceOrigen: "/uploads/flyers/wa_juan_pablo_tobo_lotes_1.jpg",
    calificacion: "ALTA",
    origenTipo: "WHATSAPP_GRUPO",
    origenNombre: "BODEGAS Y LOTES",
    status: "active",
    rawText: "BUSCAMOS LOTES PARA CONSTRUCTORES Y MARCAS EN EXPANSIÓN. Área: 600 m² a 1.600 m². Lotes consolidados o sin consolidar. Usos vivienda y comercial. Bien ubicados. Comerciales con alto tráfico y esquineros preferiblemente. Subzona Pablo VI: Alameda Tejada, Quinta Paredes, Corregidor Occidental, Nicolás de Federmán, Zona Industrial Franco, Montevideo, Granjas de Techo, Normandía. Subzona Cedritos: Lisboa, Cedritos, Cedro Narváez, Acacias, Caobos Salazar, Los Cedros Orientales. Condiciones de compra: 10% de inicio, saldo a plazos o contra entrega/escrituras. Solo 50/50. Contacto: Juan Pablo Tobo 311 291 1829 - Inmo Propiedades.",
    caracteristicasDeseadas: {
      comisiones: "50/50",
      sector: "Pablo VI / Cedritos",
      subzonaPabloVI: "Alameda Tejada, Quinta Paredes, Corregidor Occidental, Nicolás de Federmán, Zona Industrial Franco, Montevideo, Granjas de Techo, Normandía",
      subzonaCedritos: "Lisboa, Cedritos, Cedro Narváez, Acacias, Caobos Salazar, Los Cedros Orientales"
    }
  }).returning();

  console.log(`✅ Requerimiento 1 creado con ID: ${req1.id}`);

  // 3. Requerimiento 2: Lotes o Locales Nacional para Marcas
  console.log("\n📦 Creando Requerimiento 2: Lotes o Locales Nacional (desde 400 m²)...");
  const [req2] = await db.insert(requirements).values({
    userId: userId,
    name: "Busco Lotes o Locales para Importantes Marcas en Expansión (desde 400 m²)",
    tipoInmuebleDeseado: "land",
    tipoNegocioDeseado: "venta",
    tiposNegocioAceptados: ["venta"],
    ciudadDeseada: "Colombia (Nacional)",
    zonaDeseada: "Poblaciones mayores a 15.000 habitantes",
    areaMin: "400",
    idUsuarioWhatsapp: phone,
    nombreUsuarioWhatsapp: `${name} (${agency})`,
    enlaceOrigen: "/uploads/flyers/wa_juan_pablo_tobo_lotes_2.jpg",
    calificacion: "ALTA",
    origenTipo: "WHATSAPP_GRUPO",
    origenNombre: "BODEGAS Y LOTES",
    status: "active",
    rawText: "BUSCO LOTES O LOCALES PARA IMPORTANTES MARCAS EN EXPANSIÓN. Lotes consolidados desde 400 m². Lotes sin consolidar desde 600 m². Locales o lotes para importantes marcas en expansión en todo el país, en poblaciones mayores a 15.000 habitantes. Uso comercial. Presupuesto según la zona. Solo 50/50. Propietarios y corredores: Si tiene un lote o local que cumpla estas características ¡Contácteme! Juan Pablo Tobo 311 291 1829 - Inmo Propiedades.",
    caracteristicasDeseadas: {
      comisiones: "50/50",
      alcance: "Nacional",
      poblaciones: ">15.000 habitantes",
      uso: "comercial"
    }
  }).returning();

  console.log(`✅ Requerimiento 2 creado con ID: ${req2.id}`);

  // 4. Ejecutar matching para ambos requerimientos
  console.log("\n🔍 Ejecutando motor de Matching v20.0 para Requerimiento 1...");
  const matches1 = await findMatchesForRequirement(req1.id);
  console.log(`🎯 Coincidencias encontradas para Requerimiento #${req1.id}: ${matches1?.length || 0}`);

  console.log("\n🔍 Ejecutando motor de Matching v20.0 para Requerimiento 2...");
  const matches2 = await findMatchesForRequirement(req2.id);
  console.log(`🎯 Coincidencias encontradas para Requerimiento #${req2.id}: ${matches2?.length || 0}`);

  console.log("\n✨ Ingesta completada con éxito rotundo.");
  process.exit(0);
}

main().catch(err => {
  console.error("❌ Error en ingesta:", err);
  process.exit(1);
});
