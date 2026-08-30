import dotenv from "dotenv";
dotenv.config();
import postgres from "postgres";
import { explicarMatch } from "./server/_core/matching";
import { extractFallbackDataFromText } from "./server/_core/janIA";

const sql = postgres(process.env.DATABASE_URL, { prepare: false, connect_timeout: 10 });

async function run() {
  console.log("⚡ POBLANDO SUPABASE CON MATCHES VERÍDICOS AHORA MISMO...");

  // Limpiar antes de insertar
  await sql`DELETE FROM "notificationLogs" WHERE "matchId" IS NOT NULL`;
  await sql`DELETE FROM "propertyMatches"`;

  const topZones = [
    "santa barbara", "rosales", "chico", "cedritos", "virrey", "cabrera", "nogal",
    "chapinero", "usaquen", "suba", "colina", "salitre", "la castellana", "pontevedra",
    "bella suiza", "santa paula", "san patricio", "unicentro", "calleja", "batan",
    "chico navarra", "chico norte", "chico reservado", "rincon del chico", "country",
    "laureles", "poblado", "envigado", "cali", "chia", "cajica", "sopo", "tabio",
    "tenjo", "fontibon", "teusaquillo", "modelia", "cedro golf", "alcala"
  ];

  let matchesCount = 0;
  const insertedPairs = new Set();
  const statusStr = "active";

  for (const zone of topZones) {
    const zPat = "%" + zone + "%";
    const reqs = await sql`
      SELECT * FROM requirements 
      WHERE status = ${statusStr} AND (
        "zonaDeseada" ILIKE ${zPat} OR "rawText" ILIKE ${zPat}
      )
    `;

    const props = await sql`
      SELECT * FROM properties 
      WHERE available = true AND (
        zone ILIKE ${zPat} OR "address_neighborhood" ILIKE ${zPat} OR "rawText" ILIKE ${zPat}
      )
    `;

    if (reqs.length === 0 || props.length === 0) continue;

    for (const r of reqs) {
      const fbR = extractFallbackDataFromText(r.rawText);
      const reqData = {
        ...r,
        presupuestoMax: r.presupuestoMax || fbR.presupuestoMax || fbR.budget,
        areaMin: r.areaMin || fbR.areaMin || fbR.area,
        habitacionesMin: r.habitacionesMin || fbR.bedroomsMin || fbR.bedrooms,
        parqueaderosMin: r.parqueaderosMin || fbR.garages,
        zonaDeseada: r.zonaDeseada || fbR.zone,
        tipoInmuebleDeseado: r.tipoInmuebleDeseado || fbR.propertyType,
        tipoNegocioDeseado: r.tipoNegocioDeseado || fbR.transactionType
      };

      for (const p of props) {
        const pairKey = `${reqData.id}-${p.id}`;
        if (insertedPairs.has(pairKey)) continue;

        const fbP = extractFallbackDataFromText(p.rawText);
        const propData = {
          ...p,
          price: p.price || fbP.price,
          rentPrice: p.rentPrice || p.rent_price || fbP.rentPrice,
          areaTotal: p.areaTotal || fbP.area,
          bedrooms: p.bedrooms || fbP.bedrooms,
          bathrooms: p.bathrooms || fbP.bathrooms,
          garages: p.garages || fbP.garages,
          adminFee: p.adminFee || fbP.adminFee,
          zone: p.zone || fbP.zone,
          propertyType: p.propertyType || fbP.propertyType,
          transactionType: p.transactionType || fbP.transactionType
        };

        const exp = explicarMatch(reqData, propData);
        if (exp.score >= 80 && exp.blockers.length === 0) {
          matchesCount++;
          insertedPairs.add(pairKey);

          const reason = "VECY DOCTRINAL v27.4: " + exp.score.toFixed(0) + "/100";
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
          console.log(`✅ [${matchesCount}] Guardado Match #${reqData.id} ↔ #${propData.id} (${exp.score}%) en ${zone}`);
        }
      }
    }
  }

  const [total] = await sql`SELECT count(*) FROM "propertyMatches"`;
  console.log(`\n🎉 TOTAL INSERTADOS Y CONFIRMADOS EN SUPABASE: ${total.count} MATCHES.`);
  await sql.end();
}
run();
