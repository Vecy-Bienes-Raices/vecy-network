import dotenv from "dotenv";
dotenv.config();
import postgres from "postgres";
import { explicarMatch, checkTransactionCompatibility, normalizeCanonicalCity, extractTrueCityFromText } from "./server/_core/matching";
import { extractFallbackDataFromText } from "./server/_core/janIA";

const sql = postgres(process.env.DATABASE_URL, { prepare: false, connect_timeout: 20 });

async function run() {
  console.log("⚡ INICIANDO ESCANEO MAESTRO INTELIGENTE (v27.4 DOCTRINAL)...");

  // Limpiar antes de insertar
  await sql`DELETE FROM "notificationLogs" WHERE "matchId" IS NOT NULL`;
  await sql`DELETE FROM "propertyMatches"`;

  const reqs = await sql`SELECT * FROM requirements WHERE status = ${"active"}`;
  const props = await sql`SELECT * FROM properties WHERE available = ${true}`;

  console.log(`1. Pre-procesando ${reqs.length} requerimientos...`);
  const reqDataList = reqs.map(r => {
    const fbR = extractFallbackDataFromText(r.rawText);
    const city = extractTrueCityFromText(r.rawText || r.name, r.addressCity || r.ciudadDeseada || fbR.city) || "Bogotá";
    return {
      ...r,
      city: normalizeCanonicalCity(city),
      presupuestoMax: r.presupuestoMax || fbR.presupuestoMax || fbR.budget,
      areaMin: r.areaMin || fbR.areaMin || fbR.area,
      habitacionesMin: r.habitacionesMin || fbR.bedroomsMin || fbR.bedrooms,
      parqueaderosMin: r.parqueaderosMin || fbR.garages,
      zonaDeseada: r.zonaDeseada || fbR.zone,
      tipoInmuebleDeseado: r.tipoInmuebleDeseado || fbR.propertyType,
      tipoNegocioDeseado: r.tipoNegocioDeseado || fbR.transactionType
    };
  });

  console.log(`2. Pre-procesando ${props.length} inmuebles...`);
  const propDataList = props.map(p => {
    const fbP = extractFallbackDataFromText(p.rawText);
    const city = extractTrueCityFromText(p.rawText || p.name, p.addressCity || p.city || fbP.city) || "Bogotá";
    return {
      ...p,
      city: normalizeCanonicalCity(city),
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
  });

  console.log("3. Evaluando cruzamiento con pre-filtros de negocio y ciudad...");
  const toInsert = [];
  const insertedPairs = new Set();
  let comparisons = 0;

  for (const r of reqDataList) {
    for (const p of propDataList) {
      // Pre-filtro 1: Compatibilidad de negocio (ej: arriendo puro vs venta pura -> skip)
      if (!checkTransactionCompatibility(r.tipoNegocioDeseado, p.transactionType)) continue;

      // Pre-filtro 2: Ciudad (Bogotá vs Cali / Medellín -> skip)
      if (r.city && p.city && r.city !== p.city) continue;

      comparisons++;
      const pairKey = `${r.id}-${p.id}`;
      if (insertedPairs.has(pairKey)) continue;

      const exp = explicarMatch(r, p);
      if (exp.score >= 80 && exp.blockers.length === 0) {
        insertedPairs.add(pairKey);
        toInsert.push({
          requirementId: r.id,
          propertyId: p.id,
          matchScore: exp.score.toFixed(2),
          matchReason: `VECY DOCTRINAL v27.4: ${exp.score.toFixed(0)}/100`,
          status: 'suggested',
          matchExplanation: exp
        });
      }
    }
  }

  console.log(`Comparaciones útiles realizadas: ${comparisons}. Matches encontrados: ${toInsert.length}`);
  console.log(`4. Insertando ${toInsert.length} matches verídicos en Supabase...`);

  for (const m of toInsert) {
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
  console.log(`\n🎉 ESCANEO MAESTRO COMPLETADO EXITOSAMENTE: ${total.count} MATCHES INSERTADOS EN SUPABASE.`);
  await sql.end();
}

run().catch(console.error);
