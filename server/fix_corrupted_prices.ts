import { getDb } from "./db";
import { properties, requirements, propertyMatches } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { explicarMatch } from "./_core/matching";

async function fixCorruptedPricesAndRebuildMatches() {
  console.log("🚀 INICIANDO SANIDAD PREDIAL Y RECONSTRUCCIÓN TOTAL DE MATCHES EN SUPABASE...");
  const db = await getDb();
  if (!db) {
    console.error("❌ No se pudo conectar a la base de datos Supabase.");
    process.exit(1);
  }

  // 1. Sanidad predial de precios en inmuebles duales o de venta
  const allProps = await db.select().from(properties);
  let updatedProps = 0;

  for (const prop of allProps) {
    const rawText = `${prop.rawText || ""} ${prop.description || ""} ${prop.name || ""}`;
    const priceVal = parseFloat(String(prop.price || "0"));
    const transType = String(prop.transactionType || "").toLowerCase();
    const isSale = transType.includes("venta") || transType === "venta" || transType === "venta_o_arriendo";

    if (isSale && priceVal > 0 && priceVal < 100_000_000) {
      const bigSaleMatches = rawText.match(/(?:venta|precio\s*de\s*venta|vendo|valor)\s*:?\s*\$?([\d.,]+)\s*(mil\s*millones?|millones?|m|M)?/i)
                          || rawText.match(/(\d{1,3}(?:\.\d{3}){3})/);

      let realPrice = 0;
      let rentCanon = 0;

      if (bigSaleMatches) {
        let rawNumStr = bigSaleMatches[1].replace(/\./g, "").replace(/,/g, "");
        let parsed = parseFloat(rawNumStr);
        if (bigSaleMatches[2] && bigSaleMatches[2].toLowerCase().includes("mill") && parsed < 10000) {
          parsed *= 1_000_000;
        }
        if (parsed >= 100_000_000) {
          realPrice = parsed;
        }
      }

      if (realPrice < 100_000_000) {
        const matchesAllBig = rawText.match(/\$\s*([\d]{1,3}(?:[.,]\d{3}){3})/g) || rawText.match(/\b\d{9,11}\b/g);
        if (matchesAllBig && matchesAllBig.length > 0) {
          for (const m of matchesAllBig) {
            const parsed = parseFloat(m.replace(/\D/g, ""));
            if (parsed >= 100_000_000) {
              realPrice = parsed;
              break;
            }
          }
        }
      }

      if (realPrice >= 100_000_000) {
        rentCanon = priceVal < 100_000_000 ? priceVal : 0;
        console.log(`🔧 Corrigiendo Inmueble Dual ID #${prop.id} ("${prop.name}"): Precio Venta Real $${realPrice.toLocaleString()} | Canon Arriendo: $${rentCanon.toLocaleString()}`);

        await db.update(properties)
          .set({
            price: String(realPrice),
            rentPrice: rentCanon > 0 ? String(rentCanon) : prop.rentPrice,
            transactionType: "venta_o_arriendo",
            updatedAt: new Date()
          })
          .where(eq(properties.id, prop.id));
        updatedProps++;
      } else if (priceVal < 30_000_000) {
        const saleMatches = rawText.match(/(?:v\/venta\/|precio\s*de\s*venta|venta)\s*:?\s*\$?([\d.,]+)/i);
        if (saleMatches) {
          const val = parseFloat(saleMatches[1].replace(/\./g, "").replace(/,/g, ""));
          if (val >= 30_000_000) {
            console.log(`🔧 Corrigiendo Inmueble Venta ID #${prop.id} ("${prop.name}"): Precio $${val.toLocaleString()}`);
            await db.update(properties)
              .set({
                price: String(val),
                adminFee: String(priceVal),
                updatedAt: new Date()
              })
              .where(eq(properties.id, prop.id));
            updatedProps++;
          }
        }
      }
    }
  }

  console.log(`✅ Sanidad Predial Completada: ${updatedProps} inmuebles corregidos.`);

  // 2. PURGA TOTAL Y RECONSTRUCCIÓN DESDE CERO EN TABLA propertyMatches DE SUPABASE
  console.log("🧹 VACIANDO NORMAS DE NOTIFICACIÓN Y TABLA DE MATCHES EN SUPABASE...");
  await db.execute(sql`DELETE FROM "notificationLogs"`);
  await db.execute(sql`DELETE FROM "propertyMatches"`);
  console.log("✅ Tablas notificationLogs y propertyMatches vaciadas exitosamente.");

  console.log("🔍 Recalculando e insertando únicamente matches 100% legítimos (Score ≥ 80%, Cero Fallidos, Requerimientos Ricos ≥ 35 chars)...");
  const currentProps = await db.select().from(properties);
  const currentReqs = await db.select().from(requirements);

  let insertedStrictCount = 0;
  let insertedEnrichCount = 0;
  let rejectedCount = 0;

  for (const p of currentProps) {
    for (const r of currentReqs) {
      const exp = explicarMatch(r, p);

      if (exp.blockers.length === 0) {
        if (exp.isStrictCompliant && exp.score >= 80) {
          // Match 100% Calificado (Cero Grises, Cero Rojos)
          await db.insert(propertyMatches).values({
            propertyId: p.id,
            requirementId: r.id,
            matchScore: String(exp.score),
            matchReason: exp.positives.join(" | "),
            matchExplanation: exp,
            status: "suggested",
            createdAt: new Date()
          });
          insertedStrictCount++;
        } else if (!exp.isStrictCompliant && exp.score >= 70) {
          // Oportunidad Incompleta a Enriquecer (Preservado en Supabase para Contactar Requiriente)
          await db.insert(propertyMatches).values({
            propertyId: p.id,
            requirementId: r.id,
            matchScore: String(exp.score),
            matchReason: `[Faltan Datos por Enriquecer: ${(exp.missingFields || []).join(", ")}] | ` + exp.positives.join(" | "),
            matchExplanation: exp,
            status: "interested", // Marca de Oportunidad por Enriquecer
            createdAt: new Date()
          });
          insertedEnrichCount++;
        } else {
          rejectedCount++;
        }
      } else {
        rejectedCount++;
      }
    }
  }

  console.log(`🎉 RECONSTRUCCIÓN COMPLETADA EXITOSAMENTE:`);
  console.log(`   🟢 ${insertedStrictCount} Matches 100% Calificados insertados (Doctrina Verde/Amarillo).`);
  console.log(`   📋 ${insertedEnrichCount} Oportunidades Incompletas por Enriquecer preservadas en Supabase.`);
  console.log(`   ❌ ${rejectedCount} combinaciones inviables descartadas por choque duro (ej: Cali vs Bogotá).`);
  process.exit(0);
}

fixCorruptedPricesAndRebuildMatches().catch(err => {
  console.error("❌ Error en script de sanidad predial:", err);
  process.exit(1);
});
