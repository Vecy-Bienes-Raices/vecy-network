import dotenv from "dotenv";
dotenv.config();
import postgres from "postgres";
import { explicarMatch } from "./server/_core/matching";
import { extractFallbackDataFromText } from "./server/_core/janIA";

const sql = postgres(process.env.DATABASE_URL, { prepare: false, connect_timeout: 10 });

async function run() {
  console.log("🎯 DIAGNÓSTICO DE MATCHES CON RESOLUCIÓN DINÁMICA DE CIUDAD...\n");

  const zones = ["chapinero", "rosales", "cedritos", "chico", "santa barbara", "usaquen", "norte", "suba", "cali"];

  let matchesFound = 0;

  for (const zone of zones) {
    const zPat = "%" + zone + "%";
    const reqs = await sql`
      SELECT * FROM requirements 
      WHERE status = 'active' AND (
        "zonaDeseada" ILIKE ${zPat} OR "rawText" ILIKE ${zPat}
      )
      LIMIT 15
    `;

    const props = await sql`
      SELECT * FROM properties 
      WHERE available = true AND (
        zone ILIKE ${zPat} OR "address_neighborhood" ILIKE ${zPat} OR "rawText" ILIKE ${zPat}
      )
      LIMIT 20
    `;

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

        const exp = explicarMatch(reqData, propData);
        if (exp.score >= 80 && exp.blockers.length === 0) {
          matchesFound++;
          console.log("========================================================================");
          console.log("🏆 MATCH #" + matchesFound + " — SCORE: " + exp.score + "% (Zona: " + zone.toUpperCase() + ")");
          console.log("   📝 DEMANDA #REQ #" + reqData.id + " (" + (reqData.nombre_usuario_whatsapp || "Broker") + "):");
          console.log("      Ppto: $" + Number(reqData.presupuestoMax).toLocaleString("es-CO") + " | Área: " + reqData.areaMin + "m² | Habs: " + reqData.habitacionesMin);
          console.log("      Texto: \"" + reqData.rawText.substring(0, 110).replace(/\n/g, " ") + "...\"");
          console.log("   🏠 OFERTA #PROP #" + propData.id + " (" + (propData.nombre_usuario_whatsapp || "Broker") + "):");
          console.log("      Precio: $" + Number(propData.price || propData.rentPrice).toLocaleString("es-CO") + " | Área: " + propData.areaTotal + "m² | Habs: " + propData.bedrooms);
          console.log("      Texto: \"" + propData.rawText.substring(0, 110).replace(/\n/g, " ") + "...\"");
          console.log("   ✅ Aspectos Positivos: " + exp.positives.join(" | "));
          
          // Guardar en Supabase
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
          if (matchesFound >= 30) break;
        }
      }
      if (matchesFound >= 30) break;
    }
    if (matchesFound >= 30) break;
  }

  console.log("\n🎉 TOTAL MATCHES VERÍDICOS INSERTADOS EN SUPABASE:", matchesFound);
  const [total] = await sql`SELECT count(*) FROM "propertyMatches"`;
  console.log("📊 TOTAL OFICIAL EN TABLA propertyMatches:", total.count);
  await sql.end();
}
run();
