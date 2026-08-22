/**
 * VECY Network — MASTER SANEAMIENTO Y RECÁLCULO GLOBAL v25.0
 *
 * 1. Saneamiento Geográfico Total (Barrio, Localidad, Ciudad) con deducirGeografiaTripartita
 * 2. Saneamiento Financiero Total (Precios Venta, Cánones Arriendo, Cuotas Admon, Presupuestos)
 * 3. Saneamiento Físico Total (Áreas Totales, Áreas Mínimas)
 * 4. Purga y Recálculo Global de Matches (elimina < 85%, actualiza/crea >= 85%)
 *
 * Ejecución: npx tsx server/scripts/master_resanitize_and_rematch.ts
 */

import 'dotenv/config';
import { getDb } from '../db';
import { sql, eq } from 'drizzle-orm';
import { properties, requirements, propertyMatches } from '../../drizzle/schema';
import { deducirGeografiaTripartita } from '../_core/geography';
import { explicarMatch, calcularIPC } from '../_core/matching';

// ─── EXTRACTORES FINANCIEROS Y FÍSICOS (Doctrina v25.0) ───────────────────────

function cleanText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/[\u2060\u200B\u200C\u200D\uFEFF\u00A0]/g, ' ')
    .replace(/\r\n/g, '\n')
    .trim();
}

function isPhoneLike(num: number, rawText?: string): boolean {
  if (num > 50_000_000_000) return true;
  const s = String(Math.round(num));
  if (s.length === 10 && s.startsWith('3')) {
    if (rawText && /(?:\$|precio|valor|ppto|presupuesto|canon|hasta|venta)\s*3\d{9}/i.test(rawText)) return false;
    return true;
  }
  if (s.length === 12 && s.startsWith('573')) return true;
  return false;
}

function extractAdminFeeFromText(rawText: string): number | null {
  const clean = cleanText(rawText).toLowerCase();
  const textUnitsMatch = clean.match(/(?:administraci[oó]n|admin|admon|cta\s*admon)\s*(?:m[aá]xima|max|hasta|tope|no\s*mayor\s*a)?\s*:?\s*(?:aprox\.?|mensual)?\s*\$?\s*([\d.,]+)\s*(mil|millones?|mm)\b/i);
  if (textUnitsMatch) {
    let val = parseFloat(textUnitsMatch[1].replace(',', '.'));
    const unit = textUnitsMatch[2].toLowerCase();
    if (unit === 'mil') val *= 1_000;
    else if (unit.includes('millon') || unit === 'mm') val *= 1_000_000;
    if (val >= 10_000 && val <= 30_000_000 && !isPhoneLike(val, rawText)) return Math.round(val);
  }
  const adminMatch = clean.match(/(?:administraci[oó]n|admin|admon|cta\s*admon)\s*(?:m[aá]xima|max|hasta|tope|no\s*mayor\s*a)?\s*:?\s*(?:aprox\.?|mensual)?\s*\$?\s*([\d.,\s]+?)(?:-|\s|\(|\/|\+|$|\n)/i);
  if (adminMatch) {
    const rawNum = parseFloat(adminMatch[1].replace(/[.,\s]/g, ''));
    if (!isNaN(rawNum) && rawNum >= 10_000 && rawNum <= 30_000_000 && !isPhoneLike(rawNum, rawText)) return Math.round(rawNum);
  }
  return null;
}

function extractRentPriceFromText(rawText: string): number | null {
  const clean = cleanText(rawText).toLowerCase();
  const canonUnitMatch = clean.match(/(?:canon(?:\s*m[aá]ximo)?|arriendo(?:\s*m[aá]ximo)?|renta|alquiler|valor\s*(?:del\s*)?mes)\s*:?\s*\$?\s*([\d.,]+)\s*(mil\s*millones?|millones?|millon|mm|m)\b/i);
  if (canonUnitMatch) {
    let val = parseFloat(canonUnitMatch[1].replace(',', '.'));
    const unit = canonUnitMatch[2].toLowerCase();
    let mult = 1_000_000;
    if (unit.includes('mil millon')) mult = 1_000_000_000;
    else mult = 1_000_000;
    const computed = Math.round(val * mult);
    if (computed >= 300_000 && computed <= 200_000_000 && !isPhoneLike(computed, rawText)) return computed;
  }
  const canonMatch = clean.match(/(?:canon|arriendo|renta|alquiler)(?:\s*(?:m[aá]s|\+|con)?\s*administraci[oó]n\s*incluida)?(?:\s*total\s*mes)?\s*:?\s*\$?\s*([\d.,\s]+?)(?:-|\s|\(|$|\n)/i);
  if (canonMatch) {
    const rawCNum = parseFloat(canonMatch[1].replace(/[.,\s]/g, ''));
    if (!isNaN(rawCNum) && rawCNum >= 300_000 && rawCNum <= 200_000_000 && !isPhoneLike(rawCNum, rawText)) return Math.round(rawCNum);
  }
  return null;
}

function extractSalePriceFromText(rawText: string): number | null {
  const clean = cleanText(rawText).toLowerCase();
  const colombianMatch = rawText.match(/\$?\s*(\d{1,3}(?:\.\d{3}){2,4})/);
  if (colombianMatch) {
    const parsed = parseFloat(colombianMatch[1].replace(/\./g, ''));
    if (!isNaN(parsed) && parsed >= 10_000_000 && parsed <= 50_000_000_000 && !isPhoneLike(parsed, rawText)) return parsed;
  }
  const millonMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*(mil\s*millones?|millones?|millon|mill|mm|m)\b/i);
  if (millonMatch) {
    let val = parseFloat(millonMatch[1].replace(',', '.'));
    const unit = millonMatch[2].toLowerCase();
    let mult = 1_000_000;
    if (unit.includes('mil millon')) mult = 1_000_000_000;
    else if (unit === 'mm' && val < 100 && val > 15) mult = 10_000_000;
    else mult = 1_000_000;
    const computed = Math.round(val * mult);
    if (!isNaN(computed) && computed >= 10_000_000 && computed <= 50_000_000_000 && !isPhoneLike(computed, rawText)) return computed;
  }
  return null;
}

function extractAreaFromText(rawText: string): number | null {
  const clean = cleanText(rawText).toLowerCase();
  const withPrefix = clean.match(/(?:(?:m[ií]nimo|min|m[aá]ximo|max|de|desde|área\s*(?:m[ií]nima)?|area\s*(?:minima)?|área\s*(?:total)?|area\s*(?:total)?)\s+)?([\d]+(?:[.,][\d]+)?)\s*(?:m2|mts2|mts|metros(?:\s+cuadrados)?|m²)/i);
  if (withPrefix) {
    const v = parseFloat(withPrefix[1].replace(',', '.'));
    if (!isNaN(v) && v >= 10 && v <= 5000) return v;
  }
  return null;
}

function extractRequirementBudget(rawText: string, isRent: boolean): number | null {
  const clean = cleanText(rawText).toLowerCase();
  const budgetPrefix = clean.match(/(?:presupuesto(?:\s*m[aá]ximo)?|ppto(?:\s*m[aá]ximo)?|canon(?:\s*m[aá]ximo)?|hasta|m[aá]ximo|max|tope)\s*:?\s*\$?\s*([\d.,\s]+?)\s*(mil\s*millones?|millones?|mm|m)?\b/i);
  if (budgetPrefix) {
    let valStr = budgetPrefix[1].replace(/[.,\s]/g, '');
    let val = parseFloat(valStr);
    if (!isNaN(val) && !isPhoneLike(val, rawText)) {
      const unit = (budgetPrefix[2] || '').toLowerCase();
      if (unit.includes('mil millon')) val *= 1_000_000_000;
      else if (unit.includes('millon') || unit === 'mm' || unit === 'm') val *= 1_000_000;
      else if (!isRent && val < 10_000) val *= 1_000_000;
      if (val >= (isRent ? 300_000 : 10_000_000) && val <= 50_000_000_000 && !isPhoneLike(val, rawText)) return Math.round(val);
    }
  }
  if (isRent) {
    const rent = extractRentPriceFromText(rawText);
    if (rent && rent <= 50_000_000_000 && !isPhoneLike(rent, rawText)) return rent;
  } else {
    const sale = extractSalePriceFromText(rawText);
    if (sale && sale <= 50_000_000_000 && !isPhoneLike(sale, rawText)) return sale;
  }
  return null;
}

// ─── PROCESO PRINCIPAL ────────────────────────────────────────────────────────

async function masterRun() {
  const db = await getDb();
  if (!db) { console.error('❌ No hay conexión a Supabase'); process.exit(1); }

  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   VECY Network — MASTER SANEAMIENTO & RECÁLCULO GLOBAL v25.0       ║');
  console.log('║   Geografía Catastral • Finanzas (Venta/Arriendo/Admon) • Metrajes║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  // ── 1. SANEAMIENTO INTEGRAL DE PROPIEDADES ──
  console.log('🏠 [FASE 1/4] Auditando y saneando 100% de PROPIEDADES...');
  const allProps = await db.select().from(properties);
  let propsSanitized = 0;

  for (const prop of allProps) {
    const rawText = [prop.rawText, prop.description, prop.name].filter(Boolean).join(' ');
    if (!rawText.trim()) continue;

    const updates: Record<string, any> = {};

    // Geografía
    const geo = deducirGeografiaTripartita(prop.zone, prop.city, null, rawText);
    if (geo.city && geo.city !== prop.city) { updates.city = geo.city; updates.addressCity = geo.city; }
    if (geo.neighborhood && geo.neighborhood !== prop.zone) { updates.zone = geo.neighborhood; updates.addressNeighborhood = geo.neighborhood; }
    if (geo.locality && geo.locality !== prop.addressLocality) { updates.addressLocality = geo.locality; }

    // Precios
    const transType = (prop.transactionType || 'venta').toLowerCase();
    const isRent = transType.includes('arriendo');
    const isSale = transType.includes('venta') || transType.includes('permuta') || !isRent;
    const currentPrice = prop.price ? parseFloat(String(prop.price)) : 0;
    const currentArea = prop.areaTotal ? parseFloat(String(prop.areaTotal)) : 0;

    // Si el precio de venta es igual al área o sospechosamente bajo (< $200M)
    if (isSale && (currentPrice > 0 && currentPrice < 200_000_000)) {
      const extractedPrice = extractSalePriceFromText(rawText);
      if (extractedPrice && extractedPrice >= 10_000_000 && extractedPrice <= 50_000_000_000 && Math.abs(extractedPrice - currentPrice) / currentPrice > 0.05) {
        updates.price = String(extractedPrice);
      }
    }

    // Canon de arriendo
    if (isRent || transType === 'venta_o_arriendo') {
      const currentRent = prop.rentPrice ? parseFloat(String(prop.rentPrice)) : 0;
      if (currentRent <= 0) {
        const extractedRent = extractRentPriceFromText(rawText);
        if (extractedRent && extractedRent >= 300_000) {
          updates.rentPrice = String(extractedRent);
          if (isRent && currentPrice === 0) updates.price = String(extractedRent);
        }
      }
    }

    // Administración
    const currentAdmin = prop.adminFee ? parseFloat(String(prop.adminFee)) : 0;
    if (currentAdmin <= 0) {
      const extractedAdmin = extractAdminFeeFromText(rawText);
      if (extractedAdmin && extractedAdmin >= 10_000) updates.adminFee = String(extractedAdmin);
    }

    // Área Total
    if (currentArea <= 0) {
      const extractedArea = extractAreaFromText(rawText);
      if (extractedArea && extractedArea >= 10 && extractedArea <= 5000) updates.areaTotal = String(extractedArea);
    }

    if (Object.keys(updates).length > 0) {
      await db.update(properties).set(updates).where(eq(properties.id, prop.id));
      propsSanitized++;
    }
  }
  console.log(`   ✅ ${propsSanitized} propiedades saneadas integralmente de ${allProps.length}.\n`);

  // ── 2. SANEAMIENTO INTEGRAL DE REQUERIMIENTOS ──
  console.log('📋 [FASE 2/4] Auditando y saneando 100% de REQUERIMIENTOS...');
  const allReqs = await db.select().from(requirements);
  let reqsSanitized = 0;

  for (const req of allReqs) {
    const rawText = [req.rawText, req.name].filter(Boolean).join(' ');
    if (!rawText.trim()) continue;

    const updates: Record<string, any> = {};

    // Geografía
    const geo = deducirGeografiaTripartita(req.zonaDeseada, req.ciudadDeseada, null, rawText);
    if (geo.city && geo.city !== req.ciudadDeseada) { updates.ciudadDeseada = geo.city; updates.addressCity = geo.city; }
    if (geo.neighborhood && geo.neighborhood !== req.zonaDeseada) { updates.zonaDeseada = geo.neighborhood; updates.addressNeighborhood = geo.neighborhood; }
    if (geo.locality && geo.locality !== req.addressLocality) { updates.addressLocality = geo.locality; }

    // Presupuesto
    const transType = (req.tipoNegocioDeseado || 'venta').toLowerCase();
    const isRent = transType.includes('arriendo');
    const currentBudget = req.presupuestoMax ? parseFloat(String(req.presupuestoMax)) : 0;
    const isSuspiciousBudget = isRent ? currentBudget > 0 && currentBudget < 1_000_000 : currentBudget > 0 && currentBudget < 50_000_000;

    if (currentBudget <= 0 || isSuspiciousBudget || currentBudget > 50_000_000_000) {
      const extractedBudget = extractRequirementBudget(rawText, isRent);
      if (extractedBudget && extractedBudget >= (isRent ? 300_000 : 10_000_000) && extractedBudget <= 50_000_000_000) {
        updates.presupuestoMax = String(extractedBudget);
      }
    }

    // Administración Máxima
    const currentAdminMax = req.adminFeeMax ? parseFloat(String(req.adminFeeMax)) : 0;
    if (currentAdminMax <= 0 || currentAdminMax > 30_000_000) {
      const extractedAdmin = extractAdminFeeFromText(rawText);
      if (extractedAdmin && extractedAdmin >= 10_000 && extractedAdmin <= 30_000_000) updates.adminFeeMax = String(extractedAdmin);
    }

    // Área Mínima
    const currentAreaMin = req.areaMin ? parseFloat(String(req.areaMin)) : 0;
    if (currentAreaMin <= 0 || currentAreaMin > 5000) {
      const extractedArea = extractAreaFromText(rawText);
      if (extractedArea && extractedArea >= 10 && extractedArea <= 5000) updates.areaMin = String(extractedArea);
    }

    if (Object.keys(updates).length > 0) {
      await db.update(requirements).set(updates).where(eq(requirements.id, req.id));
      reqsSanitized++;
    }
  }
  console.log(`   ✅ ${reqsSanitized} requerimientos saneados integralmente de ${allReqs.length}.\n`);

  // ── 3. PURGA DE MATCHES INVÁLIDOS EXISTENTES (< 85%) ──
  console.log('🧹 [FASE 3/4] Purgando matches inválidos existentes en BD...');
  const existingMatches = await db.select().from(propertyMatches);
  let purgedCount = 0;

  for (const m of existingMatches) {
    const [prop] = await db.select().from(properties).where(eq(properties.id, m.propertyId)).limit(1);
    const [req] = await db.select().from(requirements).where(eq(requirements.id, m.requirementId)).limit(1);

    if (!prop || !req) {
      await db.execute(sql`DELETE FROM "notificationLogs" WHERE "matchId" = ${m.id};`);
      await db.execute(sql`DELETE FROM "match_feedback" WHERE "match_id" = ${m.id};`);
      await db.delete(propertyMatches).where(eq(propertyMatches.id, m.id));
      purgedCount++;
      continue;
    }

    const explanation = explicarMatch(req as any, prop as any);
    if (explanation.score < 85) {
      await db.execute(sql`DELETE FROM "notificationLogs" WHERE "matchId" = ${m.id};`);
      await db.execute(sql`DELETE FROM "match_feedback" WHERE "match_id" = ${m.id};`);
      await db.delete(propertyMatches).where(eq(propertyMatches.id, m.id));
      purgedCount++;
    }
  }
  console.log(`   ✅ ${purgedCount} matches falsos o < 85% eliminados definitivamente.\n`);

  // ── 4. RECÁLCULO GLOBAL CRUZADO (GENERACIÓN DE MATCHES REALES) ──
  console.log('⚡ [FASE 4/4] Ejecutando barrido global de cotejo entre Demandas y Ofertas activas...');
  const freshProps = await db.select().from(properties).where(eq(properties.available, true));
  const freshReqs = await db.select().from(requirements);

  let newMatches = 0;
  let updatedMatches = 0;

  for (const req of freshReqs) {
    for (const prop of freshProps) {
      const explanation = explicarMatch(req as any, prop as any);
      const score = explanation.score;

      if (score >= 85) {
        const [existing] = await db.select().from(propertyMatches).where(
          sql`"requirementId" = ${req.id} AND "propertyId" = ${prop.id}`
        ).limit(1);

        const ipcObj = calcularIPC(req as any, prop as any, score);
        explanation.ipc = ipcObj;

        if (existing) {
          await db.update(propertyMatches).set({
            matchScore: String(score.toFixed(2)),
            matchExplanation: explanation as any,
            ipc: ipcObj as any,
          }).where(eq(propertyMatches.id, existing.id));
          updatedMatches++;
        } else {
          const [inserted] = await db.insert(propertyMatches).values({
            propertyId: prop.id,
            requirementId: req.id,
            matchScore: String(score.toFixed(2)),
            matchReason: `VECY CORE v25.0: ${score.toFixed(2)}/100`,
            matchExplanation: explanation as any,
            ipc: ipcObj as any,
            status: 'suggested',
            ownerConfirmed: false,
            seekerConfirmed: false,
          }).returning();
          newMatches++;
          console.log(`   ✨ NUEVO MATCH #${inserted.id} [REQ #${req.id} ↔ PROP #${prop.id}] -> ${score}% (${req.tipoInmuebleDeseado} en ${req.zonaDeseada || req.ciudadDeseada})`);
        }
      }
    }
  }

  const [finalCount] = await db.execute(sql`SELECT COUNT(*) as count FROM "propertyMatches"`);

  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║               BALANCE GENERAL DE RECÁLCULO VECY v25.0              ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log(`  🏠 Propiedades saneadas              : ${propsSanitized}`);
  console.log(`  📋 Requerimientos saneados           : ${reqsSanitized}`);
  console.log(`  🗑️  Matches falsos purgados (<85%)   : ${purgedCount}`);
  console.log(`  ✨ Nuevos matches calificados        : ${newMatches}`);
  console.log(`  🔄 Matches actualizados              : ${updatedMatches}`);
  console.log(`  ⭐ TOTAL MATCHES ACTIVOS EN BD (≥85%): ${(finalCount as any).count}`);
  console.log('====================================================================\n');
  process.exit(0);
}

masterRun().catch(err => {
  console.error('❌ Error fatal en master run:', err);
  process.exit(1);
});
