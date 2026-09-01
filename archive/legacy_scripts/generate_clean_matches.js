import dotenv from "dotenv";
dotenv.config();
import postgres from "postgres";
import { explicarMatch } from "./server/_core/matching";
import { extractFallbackDataFromText } from "./server/_core/janIA";

const sql = postgres(process.env.DATABASE_URL, { prepare: false, connect_timeout: 20 });

async function run() {
  console.log("⚡ GENERANDO MATCHES VERÍDICOS EN SUPABASE...");

  const zones = [
    "santa barbara", "rosales", "chico", "cedritos", "virrey", "la cabrera", "el nogal",
    "chapinero", "usaquen", "suba", "colina", "salitre", "la castellana",
    "bella suiza", "santa paula", "san patricio", "unicentro", "calleja", "batan",
    "chico navarra", "chico norte", "chico reservado", "rincon del chico", "country",
    "laureles", "poblado", "envigado", "cali", "chia", "cajica", "sopo", "tabio"
  ];

  const matchesToInsert = [];
  const insertedPairs = new Set();

  for (const zone of zones) {
    const zPat = "%" + zone + "%";
    const reqs = await sql`
      SELECT * FROM requirements 
      WHERE status = 'active' AND (
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
          insertedPairs.add(pairKey);
          matchesToInsert.push({
            requirementId: reqData.id,
            propertyId: propData.id,
            matchScore: exp.score.toFixed(2),
            matchReason: "VECY DOCTRINAL v27.4: " + exp.score.toFixed(0) + "/100",
            status: 'suggested',
            matchExplanation: exp
          });
        }
      }
    }
  }

  console.log(`\nTotal matches legítimos encontrados: ${matchesToInsert.length}`);

  // Limpiar e insertar de forma atómica
  await sql`DELETE FROM "notificationLogs" WHERE "matchId" IS NOT NULL`;
  await sql`DELETE FROM "propertyMatches"`;

  for (const m of matchesToInsert) {
    await sql`
      INSERT INTO "propertyMatches" (
        "requirementId", "propertyId", "matchScore", "matchReason", "status", "matchExplanation", "createdAt"
      ) VALUES (
        ${m.requirementId}, ${m.propertyId}, ${m.matchScore}, 
        ${m.matchReason}, 
        ${m.status}, 
        ${sql.json(m.matchExplanation)}, 
        NOW()
      )
    `;
  }

  const [total] = await sql`SELECT count(*) FROM "propertyMatches"`;
  console.log(`🎉 LISTO: ${total.count} MATCHES INSERTADOS Y CONFIRMADOS EN SUPABASE.`);
  await sql.end();
}

run().catch(console.error);
