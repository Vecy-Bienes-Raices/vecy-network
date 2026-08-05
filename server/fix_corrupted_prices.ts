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
    const isDual = transType === "venta_o_arriendo" || (rawText.toLowerCase().includes("venta") && rawText.toLowerCase().includes("arriendo"));

    // Sanidad Predial: si es venta o dual y el precio guardado es < 100M pero en el texto hay un precio de venta de miles de millones (ej: 2.000.000.000)
    if (isSale && priceVal > 0 && priceVal < 100_000_000) {
      // Buscar venta explícita de miles de millones o cientos de millones
      const bigSaleMatches = rawText.match(/(?:venta|precio\s*de\s*venta|vendo|valor)\s*:?\s*\$?([\d.,]+)\s*(mil\s*millones?|millones?|m|M)?/i)
                          || rawText.match(/(\d{1,3}(?:\.\d{3}){3})/); // Regex para 2.000.000.000

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
