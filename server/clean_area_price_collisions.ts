import "dotenv/config";
import postgres from "postgres";

export function normalizarNumeroColombiano(val: any): number | null {
  if (val === undefined || val === null) return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  let str = String(val).trim();
  if (!str) return null;

  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(str)) {
    str = str.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(str)) {
    str = str.replace(/,/g, "");
  }
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

export function detectarColisionAreaPrecio(area: number | null, price: number | null): boolean {
  if (!area || !price) return false;
  const priceEnMillones = price / 1_000_000;
  return Math.abs(priceEnMillones - area) < 0.01;
}

async function auditAndCleanDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL no encontrada en el entorno.");
    process.exit(1);
  }

  console.log("🔍 Iniciando Auditoría y Limpieza Retroactiva v5 en Supabase...");
  const sql = postgres(dbUrl, { prepare: false });

  try {
    // 1. Auditoría de Propiedades (properties)
    const props = await sql`SELECT id, name, "propertyType", price, rent_price, "areaTotal", "rawText", "address_neighborhood", zone, city FROM properties`;
    console.log(`📦 Auditando ${props.length} propiedades en Supabase...`);

    let propsFixedCount = 0;

    for (const p of props) {
      const pId = p.id;
      const rawText = p.rawText || "";
      let currPrice = p.price ? parseFloat(String(p.price)) : 0;
      let currRentPrice = p.rent_price ? parseFloat(String(p.rent_price)) : 0;
      let currArea = p.areaTotal ? parseFloat(String(p.areaTotal)) : 0;
      let currType = p.propertyType;
      let currNeighborhood = p.address_neighborhood;

      let needsUpdate = false;
      const updates: Record<string, any> = {};

      // A. Hallazgo #1: Colisión Área ↔ Precio (ej. price = 116000000 cuando area = 116 m²)
      if (currArea > 0 && currPrice > 0 && detectarColisionAreaPrecio(currArea, currPrice)) {
        console.log(`⚠️ Colisión detectada en Propiedad #${pId}: price = $${currPrice} | area = ${currArea} m²`);
        const lowerRaw = rawText.toLowerCase();

        // Buscar el precio de venta real en el texto crudo
        const saleMatch = lowerRaw.match(/(?:venta|precio|valor|vta|v\/venta\/)\s*:?\s*\$?([\d.,]+)\s*(mil\s*millones?|millones?|mlls|mm|m|M)?/i)
                       || lowerRaw.match(/venta\/.*?\$?\s*([\d.]{7,12})/i)
                       || lowerRaw.match(/\$?\s*([\d.]{8,12})/);

        if (saleMatch) {
          const rawNumStr = saleMatch[1].replace(/\./g, "").replace(/,/g, "");
          let rawNum = parseFloat(rawNumStr);
          const unitStr = (saleMatch[2] || "").toLowerCase();
          const mult = unitStr.includes("mil millon") ? 1_000_000_000
            : unitStr.includes("millon") || unitStr === "mlls" || unitStr === "mm" || unitStr === "m" ? 1_000_000
            : rawNum < 10_000 ? 1_000_000 : 1;
          const realPrice = rawNum * mult;

          // Evitar número de teléfono colombiano de 10 dígitos (ej. 311 228 6001) o precios > $50.000M
          if (!isNaN(realPrice) && realPrice >= 10_000_000 && realPrice <= 50_000_000_000 && realPrice !== currPrice) {
            updates.price = realPrice;
            console.log(`  ✅ Corregido Precio de Venta Propiedad #${pId}: $${currPrice} → $${realPrice}`);
            needsUpdate = true;
          }
        }
      }

      // B. Hallazgo #3: Plantilla Commercial por Default
      const firstLine = rawText.toLowerCase().split("\n")[0] || "";
      if (currType === "commercial" && (firstLine.includes("apartamento") || firstLine.includes("apto") || firstLine.includes("casa"))) {
        const correctType = (firstLine.includes("apartamento") || firstLine.includes("apto")) ? "apartment" : "house";
        updates.propertyType = correctType;
        console.log(`  ✅ Corregido propertyType de Propiedad #${pId}: commercial → ${correctType}`);
        needsUpdate = true;
      }

      // C. Hallazgo #4: Población de address_neighborhood
      if (!currNeighborhood && (p.zone || p.name)) {
        const knownNeighborhoods = ["Cedritos", "Santa Paula", "Santa Bárbara", "Chicó", "Rosales", "El Nogal", "Pasadena", "Salitre", "Laureles", "El Poblado", "Granada", "Cañaveral"];
        const lowerSrc = `${p.zone || ""} ${p.name || ""} ${rawText}`.toLowerCase();
        for (const kn of knownNeighborhoods) {
          if (lowerSrc.includes(kn.toLowerCase())) {
            updates.address_neighborhood = kn;
            needsUpdate = true;
            break;
          }
        }
      }

      if (needsUpdate) {
        propsFixedCount++;
        await sql`UPDATE properties SET ${sql(updates)} WHERE id = ${pId}`;
      }
    }

    console.log(`🎉 Propiedades auditadas: ${propsFixedCount} registros corregidos.`);

    // 2. Auditoría de Requerimientos (requirements)
    const reqs = await sql`SELECT id, name, "tipoInmuebleDeseado", "presupuestoMax", "areaMin", "rawText", "address_neighborhood", "zonaDeseada" FROM requirements`;
    console.log(`📦 Auditando ${reqs.length} requerimientos en Supabase...`);

    let reqsFixedCount = 0;

    for (const r of reqs) {
      const rId = r.id;
      const rawText = r.rawText || "";
      let currBudget = r.presupuestoMax ? parseFloat(String(r.presupuestoMax)) : 0;
      let currArea = r.areaMin ? parseFloat(String(r.areaMin)) : 0;
      let currNeighborhood = r.address_neighborhood;

      let needsUpdate = false;
      const updates: Record<string, any> = {};

      if (currArea > 0 && currBudget > 0 && detectarColisionAreaPrecio(currArea, currBudget)) {
        console.log(`⚠️ Colisión detectada en Requerimiento #${rId}: presupuestoMax = $${currBudget} | areaMin = ${currArea} m²`);
        const lowerRaw = rawText.toLowerCase();
        const budgetMatch = lowerRaw.match(/(?:presupuesto|ppto|ppsto|hasta|\$)\s*:?\s*\$?([\d.,]+)\s*(mil\s*millones?|millones?|mlls|mm|m|M)?/i);

        if (budgetMatch) {
          const rawNumStr = budgetMatch[1].replace(/\./g, "").replace(/,/g, "");
          let rawNum = parseFloat(rawNumStr);
          const unitStr = (budgetMatch[2] || "").toLowerCase();
          const mult = unitStr.includes("mil millon") ? 1_000_000_000
            : unitStr.includes("millon") || unitStr === "mlls" || unitStr === "mm" || unitStr === "m" ? 1_000_000
            : rawNum < 10_000 ? 1_000_000 : 1;
          const realBudget = rawNum * mult;

          if (!isNaN(realBudget) && realBudget >= 300_000 && realBudget <= 50_000_000_000 && realBudget !== currBudget) {
            updates.presupuestoMax = realBudget;
            console.log(`  ✅ Corregido Presupuesto Requerimiento #${rId}: $${currBudget} → $${realBudget}`);
            needsUpdate = true;
          }
        }
      }

      if (!currNeighborhood && (r.zonaDeseada || r.name)) {
        const knownNeighborhoods = ["Cedritos", "Santa Paula", "Santa Bárbara", "Chicó", "Rosales", "El Nogal", "Pasadena", "Salitre", "Laureles", "El Poblado", "Granada", "Cañaveral"];
        const lowerSrc = `${r.zonaDeseada || ""} ${r.name || ""} ${rawText}`.toLowerCase();
        for (const kn of knownNeighborhoods) {
          if (lowerSrc.includes(kn.toLowerCase())) {
            updates.address_neighborhood = kn;
            needsUpdate = true;
            break;
          }
        }
      }

      if (needsUpdate) {
        reqsFixedCount++;
        await sql`UPDATE requirements SET ${sql(updates)} WHERE id = ${rId}`;
      }
    }

    console.log(`🎉 Requerimientos auditados: ${reqsFixedCount} registros corregidos.`);

  } catch (err) {
    console.error("❌ Error durante la auditoría Supabase:", err);
  } finally {
    await sql.end();
  }
}

auditAndCleanDatabase();
