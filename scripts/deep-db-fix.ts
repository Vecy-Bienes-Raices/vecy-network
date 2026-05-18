import { getDb } from "../server/db";

async function main() {
  console.log("🛠️ Iniciando reparación profunda de la base de datos...");
  const db = await getDb();
  if (!db) {
    console.error("❌ No se pudo conectar a la base de datos.");
    process.exit(1);
  }

  try {
    // 1. Agregar la columna 'name' a la tabla requirements si no existe
    console.log("➡️ Agregando columna 'name' a requirements...");
    await db.execute(`ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS "name" character varying(255)`);
    console.log("✅ Columna 'name' verificada/añadida.");

    // 2. Insertar el requerimiento de María García Inmo con SQL puro para control total
    console.log("➡️ Insertando requerimiento de María García Inmo...");
    const rawText = `Busco apartamento ARRIENDO
1 alcoba
Moderno 
Presupuesto 4.000.000
Desde 72 a la 127 arriba de la autopista`;

    await db.execute(`
      INSERT INTO public.requirements (
        "name",
        "idUsuarioWhatsapp",
        "tipoInmuebleDeseado",
        "tipoNegocioDeseado",
        "presupuestoMax",
        "zonaDeseada",
        "habitacionesMin",
        "rawText",
        "status"
      ) VALUES (
        'María García Inmo',
        'maria_garcia_inmo',
        'apartment',
        'arriendo',
        4000000.00,
        'Desde 72 a la 127 arriba de la autopista',
        1,
        '${rawText.replace(/'/g, "''")}',
        'active'
      )
    `);
    console.log("✅ Requerimiento de María insertado exitosamente.");

  } catch (error) {
    console.error("❌ Error en la reparación:", error);
  } finally {
    process.exit(0);
  }
}

main();
