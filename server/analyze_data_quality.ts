import 'dotenv/config';
import { getDb } from './db';
import { properties, requirements, messages } from '../drizzle/schema';
import { eq, isNull, or, lt, sql } from 'drizzle-orm';
import postgres from 'postgres';

async function analyzeQuality() {
  console.log("==========================================================================");
  console.log("ANÁLISIS DE CALIDAD Y LIMPIEZA DE INMUEBLES Y REQUERIMIENTOS EN SUPABASE");
  console.log("==========================================================================\n");

  const db = await getDb();
  if (!db) {
    console.error("❌ No se pudo conectar a Supabase");
    process.exit(1);
  }

  const pRows = await db.select().from(properties);
  const rRows = await db.select().from(requirements);

  console.log(`📊 TOTAL INMUEBLES EN BD: ${pRows.length}`);
  console.log(`📊 TOTAL REQUERIMIENTOS EN BD: ${rRows.length}\n`);

  // --- ANÁLISIS DE REQUERIMIENTOS ---
  let reqIncompletos = 0; // Sin ciudad o sin zona y sin texto suficiente (< 25 caracteres)
  let reqSpamPub = 0; // Textos de publicidad o enlaces externos
  let reqRobustos = 0;

  rRows.forEach(r => {
    const raw = (r.rawText || r.name || "").toLowerCase();
    const len = raw.trim().length;

    const isSpam = raw.includes("http") || raw.includes("www.") || raw.includes("síguenos") || raw.includes("descuento") || raw.includes("inscríbete") || raw.includes("asesoría gratis");
    const isTooShort = len < 25 && !r.addressNeighborhood && !r.zonaDeseada;
    const isMissingCore = !r.presupuestoMax && !r.areaMin && !r.habitacionesMin && !r.addressNeighborhood && !r.zonaDeseada;

    if (isSpam) {
      reqSpamPub++;
    } else if (isTooShort || isMissingCore) {
      reqIncompletos++;
    } else {
      reqRobustos++;
    }
  });

  console.log("📌 CLASIFICACIÓN DE REQUERIMIENTOS:");
  console.log(`  ✅ Robustos y Completos:      ${reqRobustos} (${((reqRobustos/rRows.length)*100).toFixed(1)}%)`);
  console.log(`  ⚠️ Incompletos / Deficientes: ${reqIncompletos} (${((reqIncompletos/rRows.length)*100).toFixed(1)}%)`);
  console.log(`  🚫 Spam / Publicidad:         ${reqSpamPub} (${((reqSpamPub/rRows.length)*100).toFixed(1)}%)\n`);

  // --- ANÁLISIS DE INMUEBLES ---
  let propIncompletos = 0;
  let propSpamPub = 0;
  let propRobustos = 0;

  pRows.forEach(p => {
    const raw = (p.rawText || p.description || p.name || "").toLowerCase();
    const len = raw.trim().length;

    const isSpam = raw.includes("inscríbete") || raw.includes("diplomado") || raw.includes("seminario") || raw.includes("asesoría legal gratis") || raw.includes("crédito preaprobado");
    const isTooShort = len < 30 && !p.price && !p.rentPrice && !p.addressNeighborhood && !p.zone;
    const isMissingPriceAndArea = (!p.price || Number(p.price) === 0) && (!p.rentPrice || Number(p.rentPrice) === 0) && (!p.areaTotal || Number(p.areaTotal) === 0);

    if (isSpam) {
      propSpamPub++;
    } else if (isTooShort || isMissingPriceAndArea) {
      propIncompletos++;
    } else {
      propRobustos++;
    }
  });

  console.log("📌 CLASIFICACIÓN DE INMUEBLES:");
  console.log(`  ✅ Robustos y Completos:      ${propRobustos} (${((propRobustos/pRows.length)*100).toFixed(1)}%)`);
  console.log(`  ⚠️ Incompletos / Deficientes: ${propIncompletos} (${((propIncompletos/pRows.length)*100).toFixed(1)}%)`);
  console.log(`  🚫 Spam / Publicidad:         ${propSpamPub} (${((propSpamPub/pRows.length)*100).toFixed(1)}%)\n`);

  process.exit(0);
}

analyzeQuality().catch(err => {
  console.error("❌ Error en análisis:", err);
  process.exit(1);
});
