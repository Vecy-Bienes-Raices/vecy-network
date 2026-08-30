import dotenv from "dotenv";
dotenv.config();
import postgres from "postgres";
import { explicarMatch } from "./server/_core/matching";
import { extractFallbackDataFromText } from "./server/_core/janIA";

const sql = postgres(process.env.DATABASE_URL, { prepare: false, connect_timeout: 10 });

async function run() {
  console.log("🔬 DIAGNÓSTICO EN VIVO DE EXPLICAR_MATCH CON DATOS REALES...\n");

  const statusStr = "active";
  const reqs = await sql`
    SELECT * FROM requirements 
    WHERE status = ${statusStr} AND "rawText" IS NOT NULL
    ORDER BY id DESC
    LIMIT 30
  `;

  const props = await sql`
    SELECT * FROM properties 
    WHERE available = true AND "rawText" IS NOT NULL
    ORDER BY id DESC
  `;

  let matchFound = 0;

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

    if (!reqData.presupuestoMax && !reqData.areaMin && !reqData.habitacionesMin) continue;

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
      
      // Si tiene score >= 80% o blockers interesantes
      if (exp.score >= 80) {
        matchFound++;
        console.log(`========================================================================`);
        console.log(`🎯 [MATCH ENCONTRADO #${matchFound}] Score: ${exp.score}%`);
        console.log(`   DEMANDA #REQ #${reqData.id}: "${reqData.name || reqData.zonaDeseada}" (Ppto: $${reqData.presupuestoMax}, Area: ${reqData.areaMin}m², Habs: ${reqData.habitacionesMin})`);
        console.log(`   OFERTA #PROP #${propData.id}: "${propData.name || propData.zone}" (Precio: $${propData.price || propData.rentPrice}, Area: ${propData.areaTotal}m², Habs: ${propData.bedrooms})`);
        console.log(`   Positivos:`, exp.positives);
        console.log(`   Blockers:`, exp.blockers);
        
        // Insertar en Supabase
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
        if (matchFound >= 15) break;
      }
    }
    if (matchFound >= 15) break;
  }

  console.log(`\n🎉 TOTAL MATCHES ENCONTRADOS E INSERTADOS EN ESTE LOTE: ${matchFound}`);
  const [total] = await sql`SELECT count(*) FROM "propertyMatches"`;
  console.log(`📊 TOTAL EN TABLA propertyMatches: ${total.count}`);
  await sql.end();
}
run();
