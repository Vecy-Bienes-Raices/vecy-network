import { getDb } from "./db";
import { properties, requirements, propertyMatches } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { explicarMatch } from "./_core/matching";

async function fixCorruptedPricesAndMatches() {
  console.log("🚀 INICIANDO SCRIPT DE SANIDAD PREDIAL DE PRECIOS Y PURGA DE MATCHES INVIABLES EN SUPABASE...");
  const db = await getDb();
  if (!db) {
    console.error("❌ No se pudo conectar a la base de datos Supabase.");
    process.exit(1);
  }

  const allProps = await db.select().from(properties);
  let updatedProps = 0;

  for (const prop of allProps) {
    const rawText = `${prop.rawText || ""} ${prop.description || ""} ${prop.name || ""}`;
    const priceVal = parseFloat(String(prop.price || "0"));
    const transType = String(prop.transactionType || "").toLowerCase();
    const isSale = transType.includes("venta") || transType === "venta" || transType === "venta_o_arriendo";

    if (isSale && priceVal > 0 && priceVal < 30_000_000) {
      // Buscar el verdadero precio de venta en el texto (ej: "V/VENTA/ $950.000.000" o "950 millones" o "950'000.000")
      const saleMatches = rawText.match(/(?:v\/venta\/|precio\s*de\s*venta|venta\s*en|valor\s*venta|venta)\s*:?\s*\$?([\d.,]+)\s*(mil\s*millones?|millones?|m|M)?/i)
                       || rawText.match(/\$\s*([\d]{2,3}(?:[.,]\d{3}){2})/);

      let realPrice = 0;
      if (saleMatches) {
        let rawNumStr = saleMatches[1].replace(/\./g, "").replace(/,/g, "");
        realPrice = parseFloat(rawNumStr);
        if (saleMatches[2] && (saleMatches[2].toLowerCase().includes("mill") || saleMatches[2].toLowerCase() === "m") && realPrice < 10000) {
          realPrice *= 1_000_000;
        }
      }

      // Si no se extrajo con el regex específico, buscar cualquier cifra mayor a 30M en el texto
      if (realPrice < 30_000_000) {
        const bigNumbers = rawText.match(/\b\d{8,11}\b/g) || rawText.match(/\b\d{2,3}[.,]\d{3}[.,]\d{3}\b/g);
        if (bigNumbers && bigNumbers.length > 0) {
          for (const bn of bigNumbers) {
            const parsed = parseFloat(bn.replace(/\D/g, ""));
            if (parsed >= 30_000_000) {
              realPrice = parsed;
              break;
            }
          }
        }
      }

      if (realPrice >= 30_000_000) {
        const newAdminFee = priceVal < 10_000_000 ? priceVal : parseFloat(String(prop.adminFee || "0"));
        console.log(`🔧 Corrigiendo Inmueble ID #${prop.id} ("${prop.name}"): Precio anterior $${priceVal.toLocaleString()} -> Precio Venta Real $${realPrice.toLocaleString()} | Admin Fee: $${newAdminFee.toLocaleString()}`);

        await db.update(properties)
          .set({
            price: String(realPrice),
            adminFee: String(newAdminFee),
            updatedAt: new Date()
          })
          .where(eq(properties.id, prop.id));
        updatedProps++;
      }
    }
  }

  console.log(`✅ Sanidad Predial Completada: ${updatedProps} inmuebles corregidos.`);

  // ── PURGA DE MATCHES INVIABLES EN TABLA propertyMatches DE SUPABASE ──
  console.log("🧹 Iniciando purga y recalculo de matches en Supabase...");
  const currentProps = await db.select().from(properties);
  const currentReqs = await db.select().from(requirements);

  let deletedCount = 0;
  let validCount = 0;

  for (const p of currentProps) {
    for (const r of currentReqs) {
      const exp = explicarMatch(r, p);
      const [existingMatch] = await db.select()
        .from(propertyMatches)
        .where(sql`${propertyMatches.propertyId} = ${p.id} AND ${propertyMatches.requirementId} = ${r.id}`)
        .limit(1);

      if (exp.score < 80 || exp.blockers.length > 0) {
        if (existingMatch) {
          await db.delete(propertyMatches).where(eq(propertyMatches.id, existingMatch.id));
          deletedCount++;
        }
      } else {
        validCount++;
        if (existingMatch) {
          await db.update(propertyMatches)
            .set({
              matchScore: String(exp.score),
              status: "suggested"
            })
            .where(eq(propertyMatches.id, existingMatch.id));
        } else {
          await db.insert(propertyMatches).values({
            propertyId: p.id,
            requirementId: r.id,
            matchScore: String(exp.score),
            status: "suggested",
            createdAt: new Date()
          });
        }
      }
    }
  }

  console.log(`🎉 PROCESO COMPLETADO: ${deletedCount} matches inviables eliminados. Total Matches Válidos en BD: ${validCount}`);
  process.exit(0);
}

fixCorruptedPricesAndMatches().catch(err => {
  console.error("❌ Error en script de sanidad predial:", err);
  process.exit(1);
});
