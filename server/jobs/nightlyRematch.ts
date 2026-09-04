import { getDb } from "../db";
import { properties, requirements, propertyMatches } from "../../drizzle/schema";
import { and, eq } from "drizzle-orm";
import {
  explicarMatch,
  extractTrueCityFromText,
  normalizeCanonicalCity,
  checkTransactionCompatibility,
} from "../_core/matching";
import { extractFallbackDataFromText } from "../_core/janIA";

/**
 * Cruce masivo nocturno — Motor Doctrinal v28.0
 * Usa explicarMatch (engine doctrinal completo) con umbral >= 80 y cero bloqueadores.
 * Estrategia: UPSERT (inserta o actualiza — NUNCA borra matches existentes).
 * NOTA DOCTRINAL: Sin notificaciones a WhatsApp. Los matches se gestionan en /admin.
 */
export async function runNightlyRematch() {
  console.log("[NIGHTLY-REMATCH v28.0] Iniciando cruce masivo doctrinal...");
  const db = await getDb();
  if (!db) {
    console.error("[NIGHTLY-REMATCH] No se pudo conectar a la base de datos.");
    return;
  }

  try {
    const [activeReqs, availProps] = await Promise.all([
      db.select().from(requirements).where(eq(requirements.status, "active")),
      db.select().from(properties).where(eq(properties.available, true)),
    ]);

    console.log(
      `[NIGHTLY-REMATCH] ${activeReqs.length} reqs × ${availProps.length} props = ${
        activeReqs.length * availProps.length
      } pares a evaluar`
    );

    // Enriquecer con fallback igual que scan_all_matches.js
    const enrichedReqs = activeReqs.map((r) => {
      const cleanText = (r.rawText || "").replace(/[\t ]+/g, " ");
      const fb = extractFallbackDataFromText(cleanText);
      const city = extractTrueCityFromText(cleanText || r.name || "", r.ciudadDeseada || "");
      return {
        ...r,
        rawText: cleanText,
        _city: city ? normalizeCanonicalCity(city).toLowerCase() : null,
        presupuestoMax: r.presupuestoMax || fb.presupuestoMax || fb.budget,
        areaMin: r.areaMin || fb.areaMin || fb.area,
        habitacionesMin: r.habitacionesMin || fb.bedroomsMin || fb.bedrooms,
        parqueaderosMin: r.parqueaderosMin || fb.garages,
        zonaDeseada: r.zonaDeseada || fb.zone,
        tipoInmuebleDeseado: r.tipoInmuebleDeseado || fb.propertyType,
        tipoNegocioDeseado: r.tipoNegocioDeseado || fb.transactionType,
      };
    });

    const enrichedProps = availProps.map((p) => {
      const cleanText = (p.rawText || "").replace(/[\t ]+/g, " ");
      const fb = extractFallbackDataFromText(cleanText);
      const city = extractTrueCityFromText(cleanText || p.name || "", p.city || "");
      return {
        ...p,
        rawText: cleanText,
        _city: city ? normalizeCanonicalCity(city).toLowerCase() : null,
        price: p.price || fb.price,
        rentPrice: (p as any).rentPrice || (p as any).rent_price || fb.rentPrice,
        areaTotal: p.areaTotal || fb.area,
        bedrooms: p.bedrooms || fb.bedrooms,
        bathrooms: p.bathrooms || fb.bathrooms,
        garages: p.garages || fb.garages,
        propertyType: p.propertyType || fb.propertyType,
        transactionType: p.transactionType || fb.transactionType,
      };
    });

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const seenPairs = new Set<string>();

    const CHUNK_SIZE = 50;
    for (let i = 0; i < enrichedReqs.length; i += CHUNK_SIZE) {
      const chunk = enrichedReqs.slice(i, i + CHUNK_SIZE);

      for (const req of chunk) {
        for (const prop of enrichedProps) {
          const pairKey = `${req.id}-${prop.id}`;
          if (seenPairs.has(pairKey)) continue;

          // Pre-filtros rápidos (mismos que scan_all_matches)
          if (req._city && prop._city && req._city !== prop._city) continue;
          const transScore = checkTransactionCompatibility(
            req.tipoNegocioDeseado,
            prop.transactionType
          );
          if (transScore === false) continue;
          if (
            req.areaMin &&
            prop.areaTotal &&
            Number(prop.areaTotal) < Number(req.areaMin)
          )
            continue;
          if (
            req.habitacionesMin &&
            prop.bedrooms &&
            Number(prop.bedrooms) < Number(req.habitacionesMin)
          )
            continue;

          let exp: any;
          try {
            exp = explicarMatch(req, prop);
          } catch {
            exp = null;
          }

          if (!exp || exp.score < 80 || exp.blockers.length > 0) {
            skippedCount++;
            // Si el match existía previamente pero ahora es inviable o tiene blockers, purgarlo
            try {
              await db.delete(propertyMatches).where(
                and(
                  eq(propertyMatches.requirementId, req.id),
                  eq(propertyMatches.propertyId, prop.id)
                )
              );
            } catch {}
            continue;
          }

          seenPairs.add(pairKey);

          // UPSERT — inserta o actualiza el score, NUNCA borra
          const existing = await db
            .select({ id: propertyMatches.id, matchScore: propertyMatches.matchScore })
            .from(propertyMatches)
            .where(
              and(
                eq(propertyMatches.requirementId, req.id),
                eq(propertyMatches.propertyId, prop.id)
              )
            )
            .limit(1);

          if (existing.length === 0) {
            await db.insert(propertyMatches).values({
              requirementId: req.id,
              propertyId: prop.id,
              matchScore: exp.score.toFixed(2),
              matchReason: `VECY DOCTRINAL v28.0: ${exp.score.toFixed(0)}/100`,
              status: "suggested",
              ownerConfirmed: false,
              seekerConfirmed: false,
            });
            insertedCount++;
          } else {
            const storedScore = parseFloat(String(existing[0].matchScore));
            if (Math.abs(storedScore - exp.score) > 0.5) {
              await db
                .update(propertyMatches)
                .set({
                  matchScore: exp.score.toFixed(2),
                  matchReason: `VECY DOCTRINAL v28.0: ${exp.score.toFixed(0)}/100`,
                })
                .where(eq(propertyMatches.id, existing[0].id));
              updatedCount++;
            }
          }
        }
      }

      const pct = Math.min(
        100,
        Math.round(((i + chunk.length) / enrichedReqs.length) * 100)
      );
      console.log(
        `[NIGHTLY-REMATCH ${pct}%] Procesados ${i + chunk.length}/${enrichedReqs.length} reqs | Nuevos: ${insertedCount} | Actualizados: ${updatedCount}`
      );
    }

    console.log(
      `[NIGHTLY-REMATCH] ✅ Finalizado. Nuevos: ${insertedCount} | Actualizados: ${updatedCount} | Descartados: ${skippedCount}`
    );
  } catch (error: any) {
    console.error(
      "[NIGHTLY-REMATCH] Error durante el cruce masivo nocturno:",
      error.message || error
    );
  }
}

/**
 * Recalcula todos los matches existentes. Si el score cae < 80, los elimina.
 * Operación de mantenimiento, no destructiva por defecto.
 */
export async function recalculateAndCleanupMatches() {
  console.log("[MATCH-CLEANUP] Iniciando recalculo y limpieza de matches en BD...");
  const db = await getDb();
  if (!db) {
    console.error("[MATCH-CLEANUP] No se pudo conectar a la base de datos.");
    return;
  }

  try {
    const allMatches = await db
      .select({
        id: propertyMatches.id,
        propertyId: propertyMatches.propertyId,
        requirementId: propertyMatches.requirementId,
        matchScore: propertyMatches.matchScore,
      })
      .from(propertyMatches);

    console.log(`[MATCH-CLEANUP] Encontrados ${allMatches.length} registros para evaluar.`);
    let deletedCount = 0;
    let updatedCount = 0;

    for (const m of allMatches) {
      const [prop] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, m.propertyId))
        .limit(1);
      const [req] = await db
        .select()
        .from(requirements)
        .where(eq(requirements.id, m.requirementId))
        .limit(1);

      if (!prop || !req) {
        await db.delete(propertyMatches).where(eq(propertyMatches.id, m.id));
        deletedCount++;
        continue;
      }

      let exp: any;
      try {
        exp = explicarMatch(req, prop);
      } catch {
        exp = null;
      }

      const newScore = exp ? exp.score : 0;
      const hasBlockers = exp ? exp.blockers.length > 0 : true;

      if (newScore < 80 || hasBlockers) {
        await db.delete(propertyMatches).where(eq(propertyMatches.id, m.id));
        deletedCount++;
      } else {
        const storedScore = parseFloat(String(m.matchScore));
        if (Math.abs(storedScore - newScore) > 0.5) {
          await db
            .update(propertyMatches)
            .set({ matchScore: newScore.toFixed(2), matchReason: `Recalculado v28.0: ${newScore.toFixed(0)}/100` })
            .where(eq(propertyMatches.id, m.id));
          updatedCount++;
        }
      }
    }

    console.log(
      `[MATCH-CLEANUP] Limpieza finalizada. Eliminados: ${deletedCount}, Actualizados: ${updatedCount}`
    );
  } catch (error: any) {
    console.error("[MATCH-CLEANUP] Error durante la limpieza:", error.message || error);
  }
}
