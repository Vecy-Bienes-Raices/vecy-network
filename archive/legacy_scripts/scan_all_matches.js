import dotenv from "dotenv";
dotenv.config();
import postgres from "postgres";
import { explicarMatch, checkTransactionCompatibility, extractTrueCityFromText, normalizeCanonicalCity } from "./server/_core/matching";
import { extractFallbackDataFromText } from "./server/_core/janIA";

const sql = postgres(process.env.DIRECT_URL || process.env.DATABASE_URL, { prepare: false });

async function run() {
  console.time("⏱️ Tiempo Total de Escaneo");
  console.log("⚡ [1/4] Cargando todos los requerimientos e inmuebles desde Supabase...");

  const [allReqs, allProps] = await Promise.all([
    sql`SELECT * FROM requirements WHERE status = 'active'`,
    sql`SELECT * FROM properties WHERE available = true`
  ]);

  console.log(`📦 Requerimientos activos: ${allReqs.length} | Inmuebles disponibles: ${allProps.length}`);

  console.log("⚡ [2/4] Normalizando y enriqueciendo registros con fallback...");
  const enrichedReqs = allReqs.map(r => {
    const cleanText = (r.rawText || "").replace(/[\t ]+/g, " ");
    const fb = extractFallbackDataFromText(cleanText);
    const city = extractTrueCityFromText(cleanText || r.name, r.addressCity || r.ciudadDeseada);
    return {
      ...r,
      rawText: cleanText,
      _city: city ? normalizeCanonicalCity(city).toLowerCase() : null,
      presupuestoMax: r.presupuestoMax || fb.presupuestoMax || fb.budget,
      areaMin: r.areaMin || fb.areaMin || fb.area,
      habitacionesMin: r.habitacionesMin || fb.bedroomsMin || fb.bedrooms,
      parqueaderosMin: r.parqueaderosMin || fb.garages,
      zonaDeseada: r.zonaDeseada || fb.zone,
      tipoInmuebleDeseado: r.tipoInmuebleDeseado || fb.propertyType,
      tipoNegocioDeseado: r.tipoNegocioDeseado || fb.transactionType
    };
  });

  const enrichedProps = allProps.map(p => {
    const cleanText = (p.rawText || "").replace(/[\t ]+/g, " ");
    const fb = extractFallbackDataFromText(cleanText);
    const city = extractTrueCityFromText(cleanText || p.name, p.addressCity || p.city);
    return {
      ...p,
      rawText: cleanText,
      _city: city ? normalizeCanonicalCity(city).toLowerCase() : null,
      price: p.price || fb.price,
      rentPrice: p.rentPrice || p.rent_price || fb.rentPrice,
      areaTotal: p.areaTotal || fb.area,
      bedrooms: p.bedrooms || fb.bedrooms,
      bathrooms: p.bathrooms || fb.bathrooms,
      garages: p.garages || fb.garages,
      adminFee: p.adminFee || fb.adminFee,
      zone: p.zone || fb.zone,
      propertyType: p.propertyType || fb.propertyType,
      transactionType: p.transactionType || fb.transactionType
    };
  });

  console.log("⚡ [3/4] Limpiando tabla propertyMatches...");
  await sql`DELETE FROM "notificationLogs" WHERE "matchId" IS NOT NULL`;
  await sql`DELETE FROM "propertyMatches"`;

  console.log("⚡ [4/4] Ejecutando Matching Doctrinal v27.4 por lotes con reporte de progreso...");

  const validMatches = [];
  const seenPairs = new Set();
  const originalLog = console.log;

  const CHUNK_SIZE = 50;
  for (let i = 0; i < enrichedReqs.length; i += CHUNK_SIZE) {
    const reqChunk = enrichedReqs.slice(i, i + CHUNK_SIZE);
    const chunkMatches = [];

    for (const req of reqChunk) {
      for (const prop of enrichedProps) {
        const pairKey = `${req.id}-${prop.id}`;
        if (seenPairs.has(pairKey)) continue;

        // Pre-filtro rápido: Ciudad
        if (req._city && prop._city && req._city !== prop._city) continue;

        // Pre-filtro rápido: Transacción
        const transScore = checkTransactionCompatibility(req.tipoNegocioDeseado, prop.transactionType);
        if (transScore === 0) continue;

        // Pre-filtro rápido: Tolerancia 0% en déficit de área
        if (req.areaMin && prop.areaTotal && Number(prop.areaTotal) < Number(req.areaMin)) continue;

        // Pre-filtro rápido: Déficit de habitaciones
        if (req.habitacionesMin && prop.bedrooms && Number(prop.bedrooms) < Number(req.habitacionesMin)) continue;

        // Pre-filtro rápido: Presupuesto
        if (req.presupuestoMax && prop.price && Number(prop.price) > Number(req.presupuestoMax) * 1.05) {
          if (req.tipoNegocioDeseado === 'venta' && prop.transactionType === 'venta') continue;
        }

        // Evaluación completa con reglas doctrinales
        console.log = () => {};
        const exp = explicarMatch(req, prop);
        console.log = originalLog;

        if (exp.score >= 80 && exp.blockers.length === 0) {
          seenPairs.add(pairKey);
          chunkMatches.push({
            requirementId: req.id,
            propertyId: prop.id,
            matchScore: exp.score.toFixed(2),
            matchReason: "VECY DOCTRINAL v27.4: " + exp.score.toFixed(0) + "/100",
            status: 'suggested',
            matchExplanation: exp
          });
        }
      }
    }

    if (chunkMatches.length > 0) {
      validMatches.push(...chunkMatches);
      // Guardar lote inmediatamente en Supabase con nombres de columna entrecomillados
      for (const m of chunkMatches) {
        await sql`
          INSERT INTO "propertyMatches" ("requirementId", "propertyId", "matchScore", "matchReason", status, "matchExplanation", "createdAt")
          VALUES (${m.requirementId}, ${m.propertyId}, ${m.matchScore}, ${m.matchReason}, ${m.status}, ${sql.json(m.matchExplanation)}, NOW())
        `;
      }
    }

    const percent = Math.min(100, Math.round(((i + reqChunk.length) / enrichedReqs.length) * 100));
    console.log(`📊 [Progreso ${percent}%] Procesados ${i + reqChunk.length}/${enrichedReqs.length} requerimientos | Matches acumulados: ${validMatches.length}`);
  }

  const [count] = await sql`SELECT count(*) FROM "propertyMatches"`;
  console.log(`\n🎉 ¡ESCANEADO COMPLETADO CON ÉXITO!`);
  console.log(`🎯 Total Matches guardados en Supabase: ${count.count}`);
  console.timeEnd("⏱️ Tiempo Total de Escaneo");
  await sql.end();
}

run().catch(console.error);
