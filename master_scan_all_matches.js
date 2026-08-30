import dotenv from "dotenv";
dotenv.config();
import postgres from "postgres";
import { explicarMatch } from "./server/_core/matching";
import { extractFallbackDataFromText } from "./server/_core/janIA";

const sql = postgres(process.env.DATABASE_URL, { prepare: false, connect_timeout: 10 });

async function run() {
  console.log("🚀 EJECUTANDO BARRIDO MAESTRO DE MATCHES EN TODO EL INVENTARIO...");

  // Limpiar antes de poblar con el lote completo definitivo
  await sql`DELETE FROM "propertyMatches"`;

  const reqs = await sql`
    SELECT * FROM requirements 
    WHERE status = 'active' AND "rawText" IS NOT NULL
    ORDER BY id DESC
  `;

  const props = await sql`
    SELECT * FROM properties 
    WHERE available = true AND "rawText" IS NOT NULL
    ORDER BY id DESC
  `;

  console.log("📊 Evaluando:", reqs.length, "Demandas y", props.length, "Inmuebles.");

  let insertedCount = 0;
  const matchesList = [];

  for (const r of reqs) {
    const fbR = extractFallbackDataFromText(r.rawText);
    const reqData = {
      ...r,
      presupuestoMax: r.presupuestoMax || fbR.budget,
      areaMin: r.areaMin || fbR.area,
      habitacionesMin: r.habitacionesMin || fbR.bedrooms,
      zonaDeseada: r.zonaDeseada || fbR.zone,
      tipoInmuebleDeseado: r.tipoInmuebleDeseado || fbR.propertyType,
      tipoNegocioDeseado: r.tipoNegocioDeseado || fbR.transactionType
    };

    // Validar que la demanda tenga al menos presupuesto o área o habitaciones
    const hasPpto = reqData.presupuestoMax != null && parseFloat(String(reqData.presupuestoMax)) > 0;
    const hasArea = reqData.areaMin != null && parseFloat(String(reqData.areaMin)) > 0;
    const hasBeds = reqData.habitacionesMin != null && parseInt(String(reqData.habitacionesMin), 10) > 0;
    if (!hasPpto && !hasArea && !hasBeds) continue;

    for (const p of props) {
      const fbP = extractFallbackDataFromText(p.rawText);
      const propData = {
        ...p,
        price: p.price || fbP.price,
        rentPrice: p.rentPrice || p.rent_price || fbP.rentPrice,
        areaTotal: p.areaTotal || fbP.area,
        bedrooms: p.bedrooms || fbP.bedrooms,
        zone: p.zone || fbP.zone,
        propertyType: p.propertyType || fbP.propertyType,
        transactionType: p.transactionType || fbP.transactionType
      };

      // Filtro rápido de tipo de negocio (arriendo vs venta)
      const rBiz = (reqData.tipoNegocioDeseado || "").toLowerCase();
      const pBiz = (propData.transactionType || "").toLowerCase();
      if (rBiz === "arriendo" && pBiz === "venta") continue;
      if (rBiz === "venta" && pBiz === "arriendo") continue;

      const exp = explicarMatch(reqData, propData);
      if (exp.score >= 80 && exp.blockers.length === 0) {
        insertedCount++;
        matchesList.push({
          score: exp.score,
          reqId: reqData.id,
          reqName: reqData.name || reqData.zonaDeseada,
          reqUser: reqData.nombre_usuario_whatsapp || 'Broker',
          reqPpto: Number(reqData.presupuestoMax || 0),
          propId: propData.id,
          propName: propData.name || propData.zone,
          propUser: propData.nombre_usuario_whatsapp || 'Broker',
          propPrice: Number(propData.price || propData.rentPrice || 0),
          zone: reqData.zonaDeseada || propData.zone,
          positives: exp.positives
        });

        const reason = "VECY DOCTRINAL v27.2: " + exp.score.toFixed(0) + "/100";
        await sql`
          INSERT INTO "propertyMatches" (
            "requirementId", "propertyId", "matchScore", "matchReason", "status", "matchExplanation", "createdAt"
          ) VALUES (
            ${reqData.id}, ${propData.id}, ${exp.score.toFixed(2)}, 
            ${reason}, 
            'suggested', 
            ${sql.json(exp)}, 
            NOW()
          )
        `;
      }
    }
  }

  console.log("\n🎉 BARRIDO COMPLETO FINALIZADO:");
  console.log("✅ Total Matches Legítimos Almacenados en Supabase:", insertedCount);

  const [total] = await sql`SELECT count(*) FROM "propertyMatches"`;
  console.log("📊 Total Oficial en Base de Datos:", total.count);

  await sql.end();
}
run();
