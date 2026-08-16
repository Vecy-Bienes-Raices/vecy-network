import dotenv from "dotenv";
dotenv.config();
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function executeDatabaseCleanup() {
  const db = await getDb();
  if (!db) {
    console.error("❌ No hay conexión a Supabase");
    return;
  }

  console.log("🚀 INICIANDO DEPURACIÓN Y LIMPIEZA INTELIGENTE DE SUPABASE...");

  // Función auxiliar para eliminar propiedades de forma segura con cascada
  async function safeDeleteProperties(propIds: number[]) {
    if (!propIds || propIds.length === 0) return 0;
    const idsList = propIds.join(",");

    await db!.execute(sql.raw(`DELETE FROM match_feedback WHERE property_id IN (${idsList});`));
    await db!.execute(sql.raw(`DELETE FROM property_publication_history WHERE "propertyId" IN (${idsList});`));
    await db!.execute(sql.raw(`DELETE FROM "propertyMatches" WHERE "propertyId" IN (${idsList});`));
    await db!.execute(sql.raw(`DELETE FROM "propertyImages" WHERE "propertyId" IN (${idsList});`));
    await db!.execute(sql.raw(`DELETE FROM leads WHERE "propertyId" IN (${idsList});`));
    await db!.execute(sql.raw(`DELETE FROM "referralLinks" WHERE "propertyId" IN (${idsList});`));
    await db!.execute(sql.raw(`DELETE FROM shares WHERE "propertyId" IN (${idsList});`));
    await db!.execute(sql.raw(`DELETE FROM "clientLedger" WHERE "propertyId" IN (${idsList});`));
    const res = await db!.execute(sql.raw(`DELETE FROM properties WHERE id IN (${idsList}) RETURNING id;`));
    return res.length;
  }

  // Función auxiliar para eliminar requerimientos de forma segura con cascada
  async function safeDeleteRequirements(reqIds: number[]) {
    if (!reqIds || reqIds.length === 0) return 0;
    const idsList = reqIds.join(",");

    await db!.execute(sql.raw(`DELETE FROM match_feedback WHERE requirement_id IN (${idsList});`));
    await db!.execute(sql.raw(`DELETE FROM "propertyMatches" WHERE "requirementId" IN (${idsList});`));
    const res = await db!.execute(sql.raw(`DELETE FROM requirements WHERE id IN (${idsList}) RETURNING id;`));
    return res.length;
  }

  // =========================================================================
  // 1. REUBICAR PROP #621 A REQUIREMENTS (SI EXISTE)
  // =========================================================================
  console.log("\n📦 1. Reubicando requerimientos mal clasificados...");
  const [prop621] = await db.execute(sql`SELECT * FROM properties WHERE id = 621`);
  if (prop621) {
    await db.execute(sql`
      INSERT INTO requirements (
        name, "tipoInmuebleDeseado", "tipoNegocioDeseado", "ciudadDeseada", "zonaDeseada",
        "presupuestoMax", "idUsuarioWhatsapp", "nombre_usuario_whatsapp", "rawText", "createdAt"
      ) VALUES (
        'Requerimiento de Casa en Cota o Subachoque', 'house', 'venta', 'Cota', 'Cota',
        600000000, ${prop621.idUsuarioWhatsapp || '573000000000'}, ${prop621.nombre_usuario_whatsapp || 'Misión Inmobiliaria'},
        ${prop621.rawText}, ${prop621.createdAt}
      );
    `);
    await safeDeleteProperties([621]);
    console.log("   ✅ PROP #621 transferido exitosamente a requirements como demanda de Casa en Cota ($600M).");
  }

  // =========================================================================
  // 2. PURGA DE SPAM, NOTICIAS POLÍTICAS Y REGISTROS VACÍOS
  // =========================================================================
  console.log("\n🗑️ 2. Eliminando registros de spam, noticias y mensajes vacíos...");
  const spamPropIds = [743, 82, 325, 547, 548];
  const deletedSpam = await safeDeleteProperties(spamPropIds);
  console.log(`   ✅ Eliminados ${deletedSpam} registros de spam de properties.`);

  // Propiedades vacías sin datos
  const emptyProps = await db.execute(sql`
    SELECT id FROM properties 
    WHERE (COALESCE("rawText", '') = '' OR LENGTH(TRIM("rawText")) < 5)
      AND (price IS NULL OR price = 0)
      AND (rent_price IS NULL OR rent_price = 0)
      AND ("areaTotal" IS NULL OR "areaTotal" = 0);
  `);
  if (emptyProps.length > 0) {
    const emptyIds = emptyProps.map((p: any) => p.id);
    const deletedEmpty = await safeDeleteProperties(emptyIds);
    console.log(`   ✅ Eliminadas ${deletedEmpty} propiedades vacías sin datos.`);
  }

  // Requerimientos spam (REQ #183 noticias y REQ #280 vacío)
  const spamReqIds = [183, 280];
  const deletedReqSpam = await safeDeleteRequirements(spamReqIds);
  console.log(`   ✅ Eliminados ${deletedReqSpam} requerimientos de spam/noticias.`);

  // =========================================================================
  // 3. DEDUPLICACIÓN DE INMUEBLES (Conserva siempre el MAX(id) más reciente)
  // =========================================================================
  console.log("\n🏠 3. Deduplicando inmuebles repetidos (conservando la publicación más reciente)...");
  const dupProps = await db.execute(sql`
    SELECT "idUsuarioWhatsapp", "rawText", array_agg(id ORDER BY id DESC) as ids
    FROM properties
    WHERE "rawText" IS NOT NULL AND LENGTH("rawText") > 15
    GROUP BY "idUsuarioWhatsapp", "rawText"
    HAVING COUNT(*) > 1;
  `);

  const propRemoveIds: number[] = [];
  dupProps.forEach((g: any) => {
    const [keepId, ...removeIds] = g.ids;
    propRemoveIds.push(...removeIds);
  });

  if (propRemoveIds.length > 0) {
    const deletedPropDups = await safeDeleteProperties(propRemoveIds);
    console.log(`   ✅ Eliminadas ${deletedPropDups} copias viejas de propiedades repetidas (se conservaron las ${dupProps.length} versiones más recientes).`);
  }

  // =========================================================================
  // 4. DEDUPLICACIÓN DE REQUERIMIENTOS (Conserva siempre el MAX(id) más reciente)
  // =========================================================================
  console.log("\n📝 4. Deduplicando requerimientos repetidos (conservando la demanda más reciente)...");
  const dupReqs = await db.execute(sql`
    SELECT "idUsuarioWhatsapp", "rawText", array_agg(id ORDER BY id DESC) as ids
    FROM requirements
    WHERE "rawText" IS NOT NULL AND LENGTH("rawText") > 15
    GROUP BY "idUsuarioWhatsapp", "rawText"
    HAVING COUNT(*) > 1;
  `);

  const reqRemoveIds: number[] = [];
  dupReqs.forEach((g: any) => {
    const [keepId, ...removeIds] = g.ids;
    reqRemoveIds.push(...removeIds);
  });

  if (reqRemoveIds.length > 0) {
    const deletedReqDups = await safeDeleteRequirements(reqRemoveIds);
    console.log(`   ✅ Eliminadas ${deletedReqDups} copias viejas de requerimientos repetidos (se conservaron las ${dupReqs.length} versiones más recientes).`);
  }

  // =========================================================================
  // 5. CONTEO FINAL Y RESUMEN
  // =========================================================================
  const finalCounts = await db.execute(sql`
    SELECT 
      (SELECT COUNT(*) FROM properties) as total_properties,
      (SELECT COUNT(*) FROM requirements) as total_requirements,
      (SELECT COUNT(*) FROM "propertyMatches") as total_matches
  `);

  console.log("\n============================================================");
  console.log("🎉 DEPURACIÓN Y LIMPIEZA COMPLETADA CON ÉXITO");
  console.log("============================================================");
  console.log(`🏠 Inmuebles Únicos y Limpios en DB:    ${finalCounts[0].total_properties}`);
  console.log(`📝 Requerimientos Únicos y Limpios:     ${finalCounts[0].total_requirements}`);
  console.log(`⚡ Matches Activos en DB:              ${finalCounts[0].total_matches}`);
}

executeDatabaseCleanup();
