import dotenv from "dotenv";
dotenv.config();
import postgres from "postgres";
import { explicarMatch } from "./server/_core/matching";
import { normalizarTextoGeografico } from "./server/_core/geography";
import { extractFallbackDataFromText } from "./server/_core/janIA";

const sql = postgres(process.env.DATABASE_URL, { prepare: false, connect_timeout: 10 });

async function run() {
  console.log("⚡ INICIANDO BÚSQUEDA OPTIMIZADA DE MATCHES VERÍDICOS...\n");

  const statusStr = "active";
  const reqs = await sql`
    SELECT * FROM requirements 
    WHERE status = ${statusStr} AND "rawText" IS NOT NULL
    ORDER BY id DESC
  `;

  const props = await sql`
    SELECT * FROM properties 
    WHERE available = true AND "rawText" IS NOT NULL
    ORDER BY id DESC
  `;

  console.log("📊 Analizando", reqs.length, "Demandas y", props.length, "Inmuebles.");

  // Pre-procesar inmuebles una sola vez en memoria
  const preProps = props.map(p => {
    const fbP = extractFallbackDataFromText(p.rawText);
    const zoneClean = normalizarTextoGeografico(p.zone || p.address_neighborhood || fbP.zone || "");
    return {
      ...p,
      zoneClean,
      priceNum: Number(p.price || fbP.price || 0),
      rentPriceNum: Number(p.rentPrice || p.rent_price || fbP.rentPrice || 0),
      areaTotalNum: Number(p.areaTotal || fbP.area || 0),
      bedroomsNum: Number(p.bedrooms || fbP.bedrooms || 0),
      fbP
    };
  });

  const verifiedMatches = [];

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

    const hasPpto = reqData.presupuestoMax != null && parseFloat(String(reqData.presupuestoMax)) > 0;
    const hasArea = reqData.areaMin != null && parseFloat(String(reqData.areaMin)) > 0;
    const hasBeds = reqData.habitacionesMin != null && parseInt(String(reqData.habitacionesMin), 10) > 0;
    if (!hasPpto && !hasArea && !hasBeds) continue;

    const rZone = normalizarTextoGeografico(reqData.zonaDeseada || "");
    if (!rZone || rZone.length < 3) continue;

    for (const p of preProps) {
      if (!p.zoneClean) continue;
      const zoneMatch = p.zoneClean === rZone || p.zoneClean.includes(rZone) || rZone.includes(p.zoneClean);
      if (!zoneMatch) continue;

      const propData = {
        ...p,
        price: p.priceNum || undefined,
        rentPrice: p.rentPriceNum || undefined,
        areaTotal: p.areaTotalNum || undefined,
        bedrooms: p.bedroomsNum || undefined
      };

      const exp = explicarMatch(reqData, propData);
      if (exp.score >= 85 && exp.blockers.length === 0) {
        verifiedMatches.push({
          req: reqData,
          prop: propData,
          explanation: exp,
          score: exp.score
        });
      }
    }
  }

  verifiedMatches.sort((a, b) => b.score - a.score);

  console.log("\n🎉 ENCONTRADOS", verifiedMatches.length, "MATCHES VERÍDICOS Y LEGÍTIMOS.");

  if (verifiedMatches.length > 0) {
    console.log("💾 Guardando en Supabase...");
    for (const m of verifiedMatches) {
      const reason = "VECY DOCTRINAL v27.2: " + m.score.toFixed(0) + "/100";
      await sql`
        INSERT INTO "propertyMatches" (
          "requirementId", "propertyId", "matchScore", "matchReason", "status", "matchExplanation", "createdAt"
        ) VALUES (
          ${m.req.id}, ${m.prop.id}, ${m.score.toFixed(2)}, 
          ${reason}, 
          'suggested', 
          ${sql.json(m.explanation)}, 
          NOW()
        )
      `;
    }
    console.log("✅", verifiedMatches.length, "Matches Guardados en Supabase.\n");
  }

  for (let i = 0; i < Math.min(10, verifiedMatches.length); i++) {
    const m = verifiedMatches[i];
    console.log("========================================================================");
    console.log("🏆 MATCH #" + (i + 1) + " — SCORE: " + m.score.toFixed(1) + "%");
    console.log("   📝 DEMANDA #REQ #" + m.req.id + " (" + (m.req.nombre_usuario_whatsapp || "Broker") + "):");
    console.log("      Zona: " + m.req.zonaDeseada + " | Ppto: $" + Number(m.req.presupuestoMax).toLocaleString("es-CO") + " | Área: " + m.req.areaMin + "m² | Habs: " + m.req.habitacionesMin);
    console.log("      Texto: \"" + m.req.rawText.substring(0, 110).replace(/\n/g, " ") + "...\"");
    console.log("   🏠 OFERTA #PROP #" + m.prop.id + " (" + (m.prop.nombre_usuario_whatsapp || "Broker") + "):");
    console.log("      Zona: " + m.prop.zone + " | Precio: $" + Number(m.prop.price || m.prop.rentPrice).toLocaleString("es-CO") + " | Área: " + m.prop.areaTotal + "m² | Habs: " + m.prop.bedrooms);
    console.log("      Texto: \"" + m.prop.rawText.substring(0, 110).replace(/\n/g, " ") + "...\"");
    console.log("   ✅ Aspectos Positivos: " + m.explanation.positives.join(" | "));
  }

  await sql.end();
}
run();
