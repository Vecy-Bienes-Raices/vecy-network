import { getDb } from "../db";
import { properties, requirements, propertyMatches } from "../../drizzle/schema";
import { and, eq } from "drizzle-orm";
import { calcularScoreMatch } from "../_core/matching";
import { handleDetectedMatches } from "../_core/janIA";
import { janiaMatchBot as whatsappBot } from "../_core/whatsapp-match";

/**
 * Recorre todos los requerimientos activos y los cruza contra todas las propiedades disponibles.
 * Registra y notifica los nuevos matches detectados.
 */
export async function runNightlyRematch() {
  console.log("[NIGHTLY-REMATCH] Iniciando cruce masivo de base de datos...");
  const db = await getDb();
  if (!db) {
    console.error("[NIGHTLY-REMATCH] No se pudo conectar a la base de datos.");
    return;
  }

  try {
    const activeReqs = await db.select().from(requirements).where(eq(requirements.status, "active"));
    const availProps = await db.select().from(properties).where(eq(properties.available, true));

    console.log(`[NIGHTLY-REMATCH] Procesando ${activeReqs.length} requerimientos activos contra ${availProps.length} inmuebles disponibles...`);

    let newMatchesCount = 0;

    for (const req of activeReqs) {
      for (const prop of availProps) {
        const score = calcularScoreMatch(req, prop);
        if (score >= 60) {
          // Verificar si ya existe este match
          const existing = await db
            .select()
            .from(propertyMatches)
            .where(
              and(
                eq(propertyMatches.propertyId, prop.id),
                eq(propertyMatches.requirementId, req.id)
              )
            )
            .limit(1);

          if (existing.length === 0) {
            console.log(`[NIGHTLY-REMATCH] ¡Match nuevo detectado! Req #${req.id} <-> Prop #${prop.id} (Score: ${score.toFixed(0)}%)`);

            const [newMatch] = await db.insert(propertyMatches).values({
              propertyId: prop.id,
              requirementId: req.id,
              matchScore: score.toFixed(2),
              matchReason: `VECY CORE TS Scoring (Nightly): ${score.toFixed(2)}/100`,
              status: "suggested",
              ownerConfirmed: false,
              seekerConfirmed: false,
            }).returning();

            newMatchesCount++;

            // Notificar por WhatsApp
            if (whatsappBot && whatsappBot.isReady) {
              const matchedItem = {
                ...prop,
                score: score,
                matchId: newMatch.id,
                idUsuarioWhatsapp: prop.idUsuarioWhatsapp
              };

              const matchDetails = await handleDetectedMatches(
                [matchedItem],
                false,
                req,
                req.idUsuarioWhatsapp || "",
                "Aliado VECY"
              );

              // Enviar al grupo de inmuebles principal
              if (matchDetails.response && whatsappBot.targetGroupId) {
                await whatsappBot.sendToGroup(matchDetails.response, undefined, matchDetails.mentions);
              }

              // Enviar DMs de Double Opt-In
              if (matchDetails.extraDMs && matchDetails.extraDMs.length > 0) {
                for (const dm of matchDetails.extraDMs) {
                  await whatsappBot.queuedSend(dm.jid, dm.message);
                }
              }
            }
          }
        }
      }
    }

    console.log(`[NIGHTLY-REMATCH] Proceso finalizado. Se registraron ${newMatchesCount} nuevos matches.`);
  } catch (error: any) {
    console.error("[NIGHTLY-REMATCH] Error durante el cruce masivo nocturno:", error.message || error);
  }
}

/**
 * Recalcula todos los matches de la base de datos aplicando las nuevas reglas de negocio estrictas.
 * Si el score calculado es < 60, elimina el match de la base de datos para depurar reportes obsoletos.
 * Si el score es >= 60 pero diferente, actualiza la puntuación.
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
      const [prop] = await db.select().from(properties).where(eq(properties.id, m.propertyId)).limit(1);
      const [req] = await db.select().from(requirements).where(eq(requirements.id, m.requirementId)).limit(1);

      if (!prop || !req) {
        console.log(`[MATCH-CLEANUP] Eliminando Match #${m.id} por propiedad o requerimiento inexistente.`);
        await db.delete(propertyMatches).where(eq(propertyMatches.id, m.id));
        deletedCount++;
        continue;
      }

      const newScore = calcularScoreMatch(req, prop);
      if (newScore < 35) {
        console.log(`[MATCH-CLEANUP] Eliminando Match #${m.id} por incompatibilidad (Nuevo Score: ${newScore}%, Score anterior: ${m.matchScore}%).`);
        await db.delete(propertyMatches).where(eq(propertyMatches.id, m.id));
        deletedCount++;
      } else {
        const storedScore = parseFloat(String(m.matchScore));
        if (Math.abs(storedScore - newScore) > 0.1) {
          console.log(`[MATCH-CLEANUP] Actualizando Score de Match #${m.id}: ${storedScore}% -> ${newScore}%`);
          await db
            .update(propertyMatches)
            .set({ matchScore: newScore.toFixed(2), matchReason: `Recalculado con VECY CORE v12.0` })
            .where(eq(propertyMatches.id, m.id));
          updatedCount++;
        }
      }
    }

    console.log(`[MATCH-CLEANUP] Limpieza finalizada. Eliminados: ${deletedCount}, Actualizados: ${updatedCount}`);
  } catch (error: any) {
    console.error("[MATCH-CLEANUP] Error durante la limpieza:", error.message || error);
  }
}
