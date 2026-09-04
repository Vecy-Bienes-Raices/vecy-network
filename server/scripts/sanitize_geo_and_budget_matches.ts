/**
 * sanitize_geo_and_budget_matches.ts
 * 
 * Script doctrinal v31.4:
 * Purga de matches en Supabase que violen:
 * 1. Perímetro vial / límites de barrio (BOGOTA_BARRIO_STREET_BOUNDS)
 * 2. Incompatibilidad de micro-sectores (Virrey vs Nogal / Rincón / Polo, Rosales vs Chicó)
 * 3. Incompatibilidad de estado (Moderno vs Remodelar)
 * 4. Presupuestos y precios de venta saneados
 * 5. Matches rechazados previamente por operador humano (match_feedback)
 */

import { getDb } from "../db";
import { propertyMatches, properties, requirements, matchFeedback, notificationLogs } from "../../drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import { explicarMatch, getRejectedPairsSet } from "../_core/matching";

async function runSanitization() {
  console.log("=== INICIANDO AUDITORÍA Y PURGA DOCTRINAL v31.4 ===");
  const db = await getDb();
  if (!db) {
    console.error("No se pudo conectar a la BD");
    process.exit(1);
  }

  // Cargar conjunto de vetos humanos
  const rejectedPairs = await getRejectedPairsSet();
  console.log(`[Vetos Humanos] Cargadas ${rejectedPairs.size} parejas rechazadas.`);

  const allMatches = await db.select().from(propertyMatches);
  console.log(`[Matches Totales] Se evaluarán ${allMatches.length} matches existentes en BD.`);

  // Precargar propiedades y requerimientos para velocidad
  const propIds = Array.from(new Set(allMatches.map((m: any) => m.propertyId).filter(Boolean)));
  const reqIds = Array.from(new Set(allMatches.map((m: any) => m.requirementId).filter(Boolean)));

  const propMap = new Map<number, any>();
  const reqMap = new Map<number, any>();

  for (let i = 0; i < propIds.length; i += 100) {
    const chunk = propIds.slice(i, i + 100);
    const loaded = await db.select().from(properties).where(inArray(properties.id, chunk));
    loaded.forEach((p: any) => propMap.set(p.id, p));
  }

  for (let i = 0; i < reqIds.length; i += 100) {
    const chunk = reqIds.slice(i, i + 100);
    const loaded = await db.select().from(requirements).where(inArray(requirements.id, chunk));
    loaded.forEach((r: any) => reqMap.set(r.id, r));
  }

  const toDeleteIds: number[] = [];
  let validCount = 0;

  for (const m of allMatches) {
    const prop = propMap.get(m.propertyId);
    const req = reqMap.get(m.requirementId);

    if (!prop || !req) {
      console.log(`[PURGE] Match #${m.id}: Propiedad #${m.propertyId} o Requerimiento #${m.requirementId} no existen.`);
      toDeleteIds.push(m.id);
      continue;
    }

    // Verificar si está vetado manualmente
    const pairKey = `${prop.id}_${req.id}`;
    if (rejectedPairs.has(pairKey)) {
      console.log(`[PURGE-VETO] Match #${m.id}: Pareja Prop #${prop.id} ↔ Req #${req.id} vetada por operador humano.`);
      toDeleteIds.push(m.id);
      continue;
    }

    const evaluation = explicarMatch(req, prop);

    if (!evaluation || evaluation.score < 85 || (evaluation.blockers && evaluation.blockers.length > 0)) {
      const blockerMsg = evaluation.blockers?.length ? evaluation.blockers.join(" | ") : `Score insuficiente (${evaluation.score}/100)`;
      console.log(`[PURGE-CRITERIA] Match #${m.id}: Prop #${prop.id} (${prop.zone || prop.barrio || 'N/E'}) ↔ Req #${req.id} (${req.zonaDeseada || req.barrio || 'N/E'}) ➔ Score: ${evaluation.score}%. Motivo: ${blockerMsg}`);
      toDeleteIds.push(m.id);
    } else {
      validCount++;
    }
  }

  console.log(`\n=== RESUMEN AUDITORÍA ===`);
  console.log(`Total evaluados: ${allMatches.length}`);
  console.log(`Matches válidos retenidos: ${validCount}`);
  console.log(`Matches inválidos a purgar: ${toDeleteIds.length}`);

  if (toDeleteIds.length > 0) {
    console.log(`\nPurgando ${toDeleteIds.length} matches espurios de propertyMatches...`);
    for (let i = 0; i < toDeleteIds.length; i += 50) {
      const chunk = toDeleteIds.slice(i, i + 50);
      // 1. Desvincular en matchFeedback (mantener registro de aprendizaje con propertyId y requirementId)
      await db.update(matchFeedback).set({ matchId: null }).where(inArray(matchFeedback.matchId, chunk));
      // 2. Limpiar logs de notificación asociados
      await db.delete(notificationLogs).where(inArray(notificationLogs.matchId, chunk));
      // 3. Eliminar los matches inválidos
      await db.delete(propertyMatches).where(inArray(propertyMatches.id, chunk));
    }
    console.log(`✅ Purga de ${toDeleteIds.length} matches completada con éxito.`);
  }

  process.exit(0);
}

runSanitization().catch(err => {
  console.error("Error en runSanitization:", err);
  process.exit(1);
});
