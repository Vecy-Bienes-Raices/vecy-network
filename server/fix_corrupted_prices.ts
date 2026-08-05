import { getDb } from "./db";
import { properties, requirements, propertyMatches } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { explicarMatch } from "./_core/matching";

function sanitizePropertyText(text: string) {
  if (!text) return {};
  const t = text.toLowerCase();

  // 1. Extraer Área M2
  let areaTotal: number | undefined = undefined;
  const areaMatch = text.match(/(?:área|area|m2|mts2?|metros|superficie)\s*:?\s*([\d.,]+)/i)
                 || text.match(/([\d.,]+)\s*(?:m2|mts2?|m²|metros)/i);
  if (areaMatch) {
    const parsedA = parseFloat(areaMatch[1].replace(/\./g, "").replace(",", "."));
    if (!isNaN(parsedA) && parsedA > 10 && parsedA < 10000) {
      areaTotal = parsedA;
    }
  }

  // 2. Extraer Valor Administración
  let adminFee: number | undefined = undefined;
  const adminMatch = text.match(/(?:admón|admon|administración|administracion|adm)\s*:?\s*\/?\s*\$?([\d.,]+)/i);
  if (adminMatch) {
    let parsedAdm = parseFloat(adminMatch[1].replace(/\./g, "").replace(",", ""));
    if (!isNaN(parsedAdm) && parsedAdm > 10000 && parsedAdm < 10000000) {
      adminFee = parsedAdm;
    }
  }

  // 3. Extraer Precio Venta Real
  let realPrice: number | undefined = undefined;
  const saleMatch = text.match(/(?:precio\s*de\s*venta|valor\s*de\s*venta|v\/venta\/|venta\s*de|valor|precio)\s*:?\s*\$?([\d.,]+)\s*(millones|millón|mll|mlls|mm|m|M)?/i)
                 || text.match(/\$\s*([\d.]{7,12})\b/);

  if (saleMatch) {
    let rawNum = saleMatch[1].replace(/\./g, "").replace(",", "");
    let num = parseFloat(rawNum);
    if (!isNaN(num)) {
      const unit = saleMatch[2] ? saleMatch[2].toLowerCase() : "";
      if (unit.includes("mill") || unit === "m" || unit === "mll" || unit === "mlls" || unit === "mm") {
        if (num < 10000) num *= 1_000_000;
      }
      if (num >= 30_000_000 && num !== adminFee) {
        realPrice = num;
      }
    }
  }

  // 4. Extraer Canon de Arriendo
  let rentPrice: number | undefined = undefined;
  const rentMatch = text.match(/(?:arriendo|canon|renta|alquiler)\s*:?\s*\$?([\d.,]+)\s*(millones|millón|mil|m)?/i);
  if (rentMatch) {
    let rawRent = rentMatch[1].replace(/\./g, "").replace(",", "");
    let numR = parseFloat(rawRent);
    if (!isNaN(numR)) {
      if (rentMatch[2] && rentMatch[2].toLowerCase().includes("mil") && numR < 10000) numR *= 1000;
      if (rentMatch[2] && rentMatch[2].toLowerCase().includes("mill") && numR < 10000) numR *= 1_000_000;
      if (numR > 300_000 && numR < 50_000_000) {
        rentPrice = numR;
      }
    }
  }

  // 5. Extraer Habitaciones
  let bedrooms: number | undefined = undefined;
  const bedMatch = text.match(/(\d+)\s*(?:hab|habitaciones|alcoba|alcobas|alc|dormitorio)/i);
  if (bedMatch) bedrooms = parseInt(bedMatch[1], 10);

  // 6. Extraer Baños
  let bathrooms: number | undefined = undefined;
  const bathMatch = text.match(/(\d+)\s*(?:wc|baño|baños|bñ)/i);
  if (bathMatch) bathrooms = parseInt(bathMatch[1], 10);

  // 7. Extraer Parqueaderos
  let garages: number | undefined = undefined;
  const garMatch = text.match(/(\d+)\s*(?:parqueo|parqueos|parqueadero|parqueaderos|garaje|garajes|ptero)/i)
                || text.match(/(?:parqueo|parqueos|parqueadero|parqueaderos|garaje|garajes|ptero)\s*:?\s*(\d+)/i);
  if (garMatch) garages = parseInt(garMatch[1], 10);

  return { areaTotal, adminFee, realPrice, rentPrice, bedrooms, bathrooms, garages };
}

function sanitizeRequirementText(text: string) {
  if (!text) return {};
  const t = text.toLowerCase();

  let presupuestoMax: number | undefined = undefined;
  const mP = t.match(/(?:ppto|presupuesto|busco|hasta|canon|valor)\s*:?\s*\$?([\d.]+)\s*(millones|millón|mll|mlls|mm|m|M)?/i)
          || t.match(/\$?\s*([\d.]+)\s*(millones|millón|mll|mlls|mm|m|M)\b/i);
  if (mP) {
    let valR = parseFloat(mP[1].replace(/\./g, ""));
    if (!isNaN(valR)) {
      if (valR < 1000) valR *= 1_000_000;
      presupuestoMax = valR;
    }
  }

  let areaMin: number | undefined = undefined;
  const mRA = t.match(/(?:mínimo|min|de|área)?\s*([\d.,]+)\s*(?:m2|mts|m²|metros)/i);
  if (mRA) {
    let valRA = parseFloat(mRA[1].replace(/\./g, "").replace(",", "."));
    if (!isNaN(valRA) && valRA > 10 && valRA < 10000) areaMin = valRA;
  }

  let habitacionesMin: number | undefined = undefined;
  const mB = t.match(/(\d+(?:\s*-\s*\d+)?)\s*(?:hab|habitaciones|alcoba|alcobas|alc|dormitorio|cuarto|cuartos|hb)/i);
  if (mB) habitacionesMin = parseInt(mB[1].split("-")[0].trim(), 10);

  let banosMin: number | undefined = undefined;
  const mW = t.match(/(\d+(?:\.\d+)?)\s*(?:o\s*más\s*)?(?:wc|baño|baños|bñ)/i) || t.match(/(\d+)\s*hab\s*con\s*baño/i);
  if (mW) banosMin = parseFloat(mW[1]);

  let parqueaderosMin: number | undefined = undefined;
  const mG = t.match(/(?:parqueadero|parqueaderos|garaje|garajes|ptero|g\.)\s*\.?\s*(\d+)/i)
          || t.match(/(\d+)\s*(?:parqueadero|parqueaderos|garaje|garajes|ptero|g\.|individuales)/i);
  if (mG && mG[1]) parqueaderosMin = parseInt(mG[1], 10);
  else if (/garajes|parqueaderos/i.test(t)) parqueaderosMin = 1;

  return { presupuestoMax, areaMin, habitacionesMin, banosMin, parqueaderosMin };
}

async function fixCorruptedPricesAndRebuildMatches() {
  console.log("🚀 INICIANDO DESINFECCIÓN TOTAL DE DATOS PREDIALES Y RECONSTRUCCIÓN EN SUPABASE...");
  const db = await getDb();
  if (!db) {
    console.error("❌ No se pudo conectar a la base de datos Supabase.");
    process.exit(1);
  }

  // 1. Desinfección y Reparación de la Tabla INMUEBLES (properties)
  const allProps = await db.select().from(properties);
  let updatedProps = 0;

  for (const prop of allProps) {
    const rawText = `${prop.rawText || ""} ${prop.description || ""} ${prop.name || ""}`;
    const s = sanitizePropertyText(rawText);
    const updates: Record<string, any> = {};

    const currentPrice = parseFloat(String(prop.price || "0"));
    if (s.realPrice && s.realPrice >= 30_000_000 && s.realPrice !== currentPrice) {
      console.log(`🔧 Corrigiendo Precio Venta ID #${prop.id} ("${prop.name}"): De $${currentPrice.toLocaleString()} a $${s.realPrice.toLocaleString()}`);
      updates.price = String(s.realPrice);
    }
    if (s.areaTotal && (parseFloat(String(prop.areaTotal || "0")) <= 0)) {
      updates.areaTotal = String(s.areaTotal);
    }
    if (s.adminFee && (parseFloat(String(prop.adminFee || "0")) <= 0)) {
      updates.adminFee = String(s.adminFee);
    }
    if (s.bedrooms && (!prop.bedrooms || Number(prop.bedrooms) <= 0)) {
      updates.bedrooms = s.bedrooms;
    }
    if (s.bathrooms && (!prop.bathrooms || Number(prop.bathrooms) <= 0)) {
      updates.bathrooms = s.bathrooms;
    }
    if (s.garages && (!prop.garages || Number(prop.garages) <= 0)) {
      updates.garages = s.garages;
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      await db.update(properties).set(updates).where(eq(properties.id, prop.id));
      updatedProps++;
    }
  }

  console.log(`✅ Sanidad Predial Completada: ${updatedProps} inmuebles desinfectados y corregidos.`);

  // 2. Desinfección y Reparación de la Tabla REQUERIMIENTOS (requirements)
  const allReqs = await db.select().from(requirements);
  let updatedReqs = 0;

  for (const reqItem of allReqs) {
    const rawText = `${reqItem.rawText || ""} ${reqItem.name || ""}`;
    const s = sanitizeRequirementText(rawText);
    const updates: Record<string, any> = {};

    const currentBudget = parseFloat(String(reqItem.presupuestoMax || "0"));
    if (s.presupuestoMax && s.presupuestoMax > 0 && currentBudget <= 0) {
      console.log(`🔧 Corrigiendo Presupuesto Requerimiento ID #${reqItem.id}: $${s.presupuestoMax.toLocaleString()}`);
      updates.presupuestoMax = String(s.presupuestoMax);
    }
    if (s.areaMin && (parseFloat(String(reqItem.areaMin || "0")) <= 0)) {
      updates.areaMin = String(s.areaMin);
    }
    if (s.habitacionesMin && (!reqItem.habitacionesMin || Number(reqItem.habitacionesMin) <= 0)) {
      updates.habitacionesMin = s.habitacionesMin;
    }
    if (s.banosMin && (!reqItem.banosMin || Number(reqItem.banosMin) <= 0)) {
      updates.banosMin = Math.round(s.banosMin);
    }
    if (s.parqueaderosMin && (!reqItem.parqueaderosMin || Number(reqItem.parqueaderosMin) <= 0)) {
      updates.parqueaderosMin = s.parqueaderosMin;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(requirements).set(updates).where(eq(requirements.id, reqItem.id));
      updatedReqs++;
    }
  }

  console.log(`✅ Sanidad de Requerimientos Completada: ${updatedReqs} demandas desinfectadas y corregidas.`);

  // 3. PURGA Y RECONSTRUCCIÓN DE MATCHES EN SUPABASE
  console.log("🧹 VACIANDO NORMAS DE NOTIFICACIÓN Y TABLA DE MATCHES EN SUPABASE...");
  await db.execute(sql`DELETE FROM "notificationLogs"`);
  await db.execute(sql`DELETE FROM "propertyMatches"`);
  console.log("✅ Tablas notificationLogs y propertyMatches vaciadas exitosamente.");

  console.log("🔍 Recalculando e insertando matches en Supabase...");
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
          await db.insert(propertyMatches).values({
            propertyId: p.id,
            requirementId: r.id,
            matchScore: String(exp.score),
            matchReason: `[Faltan Datos por Enriquecer: ${(exp.missingFields || []).join(", ")}] | ` + exp.positives.join(" | "),
            matchExplanation: exp,
            status: "interested",
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
  console.log(`   ❌ ${rejectedCount} combinaciones inviables descartadas por choque duro.`);
  process.exit(0);
}

fixCorruptedPricesAndRebuildMatches().catch(err => {
  console.error("❌ Error en script de sanidad predial:", err);
  process.exit(1);
});
