import "dotenv/config";
import { getDb } from "../db";
import { properties, requirements, propertyMatches } from "../../drizzle/schema";
import { deducirGeografiaTripartita, normalizarTextoGeografico } from "../_core/geography";
import { findMatchesForProperty } from "../_core/matching";
import { eq, sql } from "drizzle-orm";

async function cleanAndRecalculateGeo() {
  console.log("🚀 Iniciando Limpieza y Deducción Geográfica Tripartita en Supabase (v22.0)...");
  const startTime = Date.now();
  const db = await getDb();
  if (!db) {
    console.error("❌ No se pudo conectar a la base de datos Supabase.");
    process.exit(1);
  }

  // 1. DEDUCIR Y AUTOCOMPLETAR GEOGRAFÍA TRIPARTITA EN PROPIEDADES
  console.log("📦 1/4 Procesando y normalizando Inmuebles (properties)...");
  const allProps = await db.select().from(properties);
  let updatedPropsCount = 0;

  for (const p of allProps) {
    const tri = deducirGeografiaTripartita(p.zone || p.addressNeighborhood, p.city || p.addressCity, p.origenNombre, p.rawText || p.description);
    
    // Verificar si hay cambios en la deducción
    const needsUpdate = p.addressCity !== tri.city || p.addressLocality !== tri.locality || p.addressNeighborhood !== tri.neighborhood || p.city !== tri.city;
    if (needsUpdate) {
      await db.update(properties).set({
        city: tri.city,
        addressCity: tri.city,
        addressLocality: tri.locality,
        addressNeighborhood: tri.neighborhood,
        zone: tri.neighborhood
      }).where(eq(properties.id, p.id));
      updatedPropsCount++;
    }
  }
  console.log(`✅ Inmuebles procesados. ${updatedPropsCount} registros actualizados con geografía tripartita.`);

  // 2. DEDUCIR Y AUTOCOMPLETAR GEOGRAFÍA TRIPARTITA EN REQUERIMIENTOS
  console.log("📋 2/4 Procesando y normalizando Requerimientos (requirements)...");
  const allReqs = await db.select().from(requirements);
  let updatedReqsCount = 0;

  for (const r of allReqs) {
    const tri = deducirGeografiaTripartita(r.zonaDeseada || r.addressNeighborhood, r.ciudadDeseada || r.addressCity, null, r.rawText);
    
    const needsUpdate = r.addressCity !== tri.city || r.addressLocality !== tri.locality || r.addressNeighborhood !== tri.neighborhood || r.ciudadDeseada !== tri.city;
    if (needsUpdate) {
      await db.update(requirements).set({
        ciudadDeseada: tri.city,
        addressCity: tri.city,
        addressLocality: tri.locality,
        addressNeighborhood: tri.neighborhood,
        zonaDeseada: tri.neighborhood
      }).where(eq(requirements.id, r.id));
      updatedReqsCount++;
    }
  }
  console.log(`✅ Requerimientos procesados. ${updatedReqsCount} registros actualizados con geografía tripartita.`);

  // 3. DEPURACIÓN DE MATCHES INCOMPATIBLES DE CIUDAD EN SUPABASE (ej: Cali vs Bogotá)
  console.log("🧹 3/4 Eliminando matches obsoletos con ciudades incompatibles...");
  await db.execute(sql`
    DELETE FROM "propertyMatches" pm
    USING properties p, requirements r
    WHERE pm."propertyId" = p.id AND pm."requirementId" = r.id
      AND LOWER(COALESCE(p.address_city, p.city, '')) <> LOWER(COALESCE(r.address_city, r."ciudadDeseada", ''))
      AND COALESCE(p.address_city, p.city, '') <> '' 
      AND COALESCE(r.address_city, r."ciudadDeseada", '') <> '';
  `);
  console.log("✅ Matches con ciudad incompatible purgados exitosamente.");

  // 4. RECÁLCULO COMPLETO CON EL NUEVO MOTOR TRIPARTITO
  console.log("⚡ 4/4 Ejecutando recálculo masivo de coincidencias...");
  const activeProps = await db.select({ id: properties.id }).from(properties).where(eq(properties.available, true));
  let totalNewMatches = 0;

  for (const prop of activeProps) {
    const matches = await findMatchesForProperty(prop.id);
    totalNewMatches += matches.length;
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`🎉 LIMPIEZA Y RECÁLCULO COMPLETADOS CON ÉXITO EN ${durationSec} s.`);
  console.log(`📊 Inmuebles Evaluados: ${activeProps.length} | Matches Validados en DB: ${totalNewMatches}`);
  process.exit(0);
}

cleanAndRecalculateGeo().catch(err => {
  console.error("❌ Error en script cleanAndRecalculateGeo:", err);
  process.exit(1);
});
