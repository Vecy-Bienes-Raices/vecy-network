import dotenv from "dotenv";
dotenv.config();
import postgres from "postgres";
import { explicarMatch } from "./server/_core/matching";
import { extractFallbackDataFromText } from "./server/_core/janIA";

const sql = postgres(process.env.DATABASE_URL, { prepare: false, connect_timeout: 10 });

async function run() {
  console.log("⚡ INICIANDO BARRIDO RÁPIDO INDEXADO POR ZONAS...\n");

  // Limpiar tabla matches antes de insertar los verificados
  await sql`DELETE FROM "propertyMatches"`;

  const topZones = [
    "santa barbara", "rosales", "chico", "cedritos", "virrey", "cabrera", "nogal",
    "chapinero", "usaquen", "suba", "colina", "salitre", "la castellana", "pontevedra",
    "bella suiza", "santa paula", "san patricio", "unicentro", "calleja", "batn",
    "chico navarra", "chico norte", "chico reservado", "rincon del chico", "country",
    "laureles", "poblado", "envigado", "cali", "chia", "cajica", "sopo", "tabio",
    "tenjo", "fontibon", "teusaquillo", "modelia", "cedro golf", "alcala"
  ];

  let matchesCount = 0;
  const insertedPairs = new Set();

  for (const zone of topZones) {
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
        presupuestoMax: r.presupuestoMax || fbR.budget,
        areaMin: r.areaMin || fbR.area,
        habitacionesMin: r.habitacionesMin || fbR.bedrooms,
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
          zone: p.zone || fbP.zone,
          propertyType: p.propertyType || fbP.propertyType,
          transactionType: p.transactionType || fbP.transactionType
        };

        const exp = explicarMatch(reqData, propData);
        if (exp.score >= 80 && exp.blockers.length === 0) {
          matchesCount++;
          insertedPairs.add(pairKey);

          console.log(`========================================================================`);
          console.log(`🏆 MATCH #${matchesCount} (${exp.score}%) — [${zone.toUpperCase()}]`);
          console.log(`   📝 DEMANDA #REQ #${reqData.id} (${reqData.nombre_usuario_whatsapp || 'Broker'}):`);
          console.log(`      Ppto: $${Number(reqData.presupuestoMax).toLocaleString('es-CO')} | Área: ${reqData.areaMin}m² | Habs: ${reqData.habitacionesMin}`);
          console.log(`      Demanda: "${(reqData.rawText || reqData.name).substring(0, 95).replace(/\n/g, ' ')}..."`);
          console.log(`   🏠 OFERTA #PROP #${propData.id} (${propData.nombre_usuario_whatsapp || 'Broker'}):`);
          console.log(`      Precio: $${Number(propData.price || propData.rentPrice).toLocaleString('es-CO')} | Área: ${propData.areaTotal}m² | Habs: ${propData.bedrooms}`);
          console.log(`      Oferta: "${(propData.rawText || propData.name).substring(0, 95).replace(/\n/g, ' ')}..."`);
          console.log(`   ✅ Aspectos Clave: ${exp.positives.slice(0, 4).join(' | ')}`);

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
        }
      }
    }
  }

  console.log(`\n🎉 BARRIDO INDEXADO FINALIZADO CON ÉXITO:`);
  console.log(`✅ Total Matches Verídicos Guardados: ${matchesCount}`);
  const [total] = await sql`SELECT count(*) FROM "propertyMatches"`;
  console.log(`📊 TOTAL OFICIAL EN SUPABASE: ${total.count} MATCHES.`);
  await sql.end();
}
run();
