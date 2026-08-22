/**
 * VECY Network — Script de Enriquecimiento Retroactivo Maestro v25.0
 * 
 * Audita y enriquece la base de datos Supabase:
 *   1. Precios de Venta de Propiedades (formato colombiano de miles: 1.390.000.000)
 *   2. Cánones de Arriendo de Propiedades (rentPrice y canon mensual)
 *   3. Cuotas de Administración de Propiedades (adminFee)
 *   4. Áreas Totales de Propiedades (areaTotal si estaba null/0)
 *   5. Presupuestos de Requerimientos (Venta y Arriendo)
 *   6. Cuotas de Administración Máximas en Requerimientos (adminFeeMax)
 *   7. Áreas Mínimas en Requerimientos (areaMin: "Mínimo 150m2", etc.)
 *
 * Ejecución: npx tsx server/scripts/enrich_data_v25.ts
 */

import 'dotenv/config';
import { getDb } from '../db';
import { properties, requirements } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

// ─── UTILIDADES DE DETECCIÓN Y PARSEO ────────────────────────────────────────

function cleanText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/[\u2060\u200B\u200C\u200D\uFEFF\u00A0]/g, ' ')
    .replace(/\r\n/g, '\n')
    .trim();
}

function isPhoneLike(num: number, rawText?: string): boolean {
  const s = String(Math.round(num));
  if (s.length === 10 && s.startsWith('3')) {
    if (rawText && /(?:\$|precio|valor|ppto|presupuesto|canon|hasta|venta)\s*3\d{9}/i.test(rawText)) return false;
    return true;
  }
  if (s.length === 12 && s.startsWith('573')) return true;
  return false;
}

/**
 * Extrae cuota de administración en pesos COP.
 * Ej: "Admon $960.000", "Administración: 1.200.000", "admon 450 mil", "admin 850.000/mes"
 */
function extractAdminFeeFromText(rawText: string): number | null {
  const clean = cleanText(rawText).toLowerCase();

  // 1. "Admon 450 mil" / "admin 1.2 millones"
  const textUnitsMatch = clean.match(/(?:administraci[oó]n|admin|admon|cta\s*admon)\s*:?\s*(?:aprox\.?|mensual)?\s*\$?\s*([\d.,]+)\s*(mil|millones?|mm)\b/i);
  if (textUnitsMatch) {
    let val = parseFloat(textUnitsMatch[1].replace(',', '.'));
    const unit = textUnitsMatch[2].toLowerCase();
    if (unit === 'mil') val *= 1_000;
    else if (unit.includes('millon') || unit === 'mm') val *= 1_000_000;
    if (val >= 10_000 && val <= 30_000_000 && !isPhoneLike(val, rawText)) {
      return Math.round(val);
    }
  }

  // 2. "Admon $960.000" / "Administración: 1.250.000"
  const adminMatch = clean.match(/(?:administraci[oó]n|admin|admon|cta\s*admon)\s*:?\s*(?:aprox\.?|mensual)?\s*\$?\s*([\d.,\s]+?)(?:-|\s|\(|\/|\+|$|\n)/i);
  if (adminMatch) {
    const rawNum = parseFloat(adminMatch[1].replace(/[.,\s]/g, ''));
    if (!isNaN(rawNum) && rawNum >= 10_000 && rawNum <= 30_000_000 && !isPhoneLike(rawNum, rawText)) {
      return Math.round(rawNum);
    }
  }

  return null;
}

/**
 * Extrae canon de arriendo en pesos COP.
 * Ej: "Canon $8.500.000", "Arriendo: 4.500.000", "Canon 8.5 millones", "Valor mes $3.200.000"
 */
function extractRentPriceFromText(rawText: string): number | null {
  const clean = cleanText(rawText).toLowerCase();

  // 1. "Canon 8.5 millones" / "Arriendo 4.5 mm"
  const canonUnitMatch = clean.match(/(?:canon|arriendo|renta|alquiler|valor\s*(?:del\s*)?mes)\s*:?\s*\$?\s*([\d.,]+)\s*(mil\s*millones?|millones?|millon|mm|m)\b/i);
  if (canonUnitMatch) {
    let val = parseFloat(canonUnitMatch[1].replace(',', '.'));
    const unit = canonUnitMatch[2].toLowerCase();
    let mult = 1_000_000;
    if (unit.includes('mil millon')) mult = 1_000_000_000;
    else mult = 1_000_000;
    const computed = Math.round(val * mult);
    if (computed >= 300_000 && computed <= 200_000_000 && !isPhoneLike(computed, rawText)) {
      return computed;
    }
  }

  // 2. "Canon más administración incluida total mes $8,500,000" / "Canon: $4.500.000"
  const canonMatch = clean.match(/(?:canon|arriendo|renta|alquiler)(?:\s*(?:m[aá]s|\+|con)?\s*administraci[oó]n\s*incluida)?(?:\s*total\s*mes)?\s*:?\s*\$?\s*([\d.,\s]+?)(?:-|\s|\(|$|\n)/i);
  if (canonMatch) {
    const rawCNum = parseFloat(canonMatch[1].replace(/[.,\s]/g, ''));
    if (!isNaN(rawCNum) && rawCNum >= 300_000 && rawCNum <= 200_000_000 && !isPhoneLike(rawCNum, rawText)) {
      return Math.round(rawCNum);
    }
  }

  // 3. Formato colombiano de canon ($3.500.000 / $8.500.000)
  const generalMatch = rawText.match(/\$?\s*(\d{1,3}(?:\.\d{3}){2})/);
  if (generalMatch) {
    const parsed = parseFloat(generalMatch[1].replace(/\./g, ''));
    if (!isNaN(parsed) && parsed >= 300_000 && parsed <= 50_000_000 && !isPhoneLike(parsed, rawText)) {
      return Math.round(parsed);
    }
  }

  return null;
}

/**
 * Extrae precio de venta en pesos COP.
 * Ej: "$1.390.000.000", "1.390 millones", "1700 MM", "$1,250.MM", "950 mm"
 */
function extractSalePriceFromText(rawText: string): number | null {
  const clean = cleanText(rawText).toLowerCase();

  // 1. Formato largo colombiano: 1.390.000.000 (3+ grupos de miles separados por punto)
  const colombianMatch = rawText.match(/\$?\s*(\d{1,3}(?:\.\d{3}){2,4})/);
  if (colombianMatch) {
    const parsed = parseFloat(colombianMatch[1].replace(/\./g, ''));
    if (!isNaN(parsed) && parsed >= 10_000_000 && !isPhoneLike(parsed, rawText)) {
      return parsed;
    }
  }

  // 2. Millones taquigráficos: "1.390 millones", "1700 mm", "950 MM"
  const millonMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*(mil\s*millones?|millones?|millon|mill|mm|m)\b/i);
  if (millonMatch) {
    let val = parseFloat(millonMatch[1].replace(',', '.'));
    const unit = millonMatch[2].toLowerCase();
    let mult = 1_000_000;
    if (unit.includes('mil millon')) mult = 1_000_000_000;
    else if (unit === 'mm' && val < 100 && val > 15) mult = 10_000_000;
    else mult = 1_000_000;
    const computed = Math.round(val * mult);
    if (!isNaN(computed) && computed >= 10_000_000 && !isPhoneLike(computed, rawText)) {
      return computed;
    }
  }

  // 3. Formato con comas: "$1,390,000,000"
  const commaMatch = rawText.match(/\$?\s*(\d{1,3}(?:,\d{3}){2,4})/);
  if (commaMatch) {
    const parsed = parseFloat(commaMatch[1].replace(/,/g, ''));
    if (!isNaN(parsed) && parsed >= 10_000_000 && !isPhoneLike(parsed, rawText)) {
      return parsed;
    }
  }

  return null;
}

/**
 * Extrae área (m2) desde el texto.
 */
function extractAreaFromText(rawText: string): number | null {
  const clean = cleanText(rawText).toLowerCase();

  const withPrefix = clean.match(
    /(?:(?:m[ií]nimo|min|m[aá]ximo|max|de|desde|área\s*(?:m[ií]nima)?|area\s*(?:minima)?|área\s*(?:total)?|area\s*(?:total)?)\s+)?([\d]+(?:[.,][\d]+)?)\s*(?:m2|mts2|mts|metros(?:\s+cuadrados)?|m²)/i
  );
  if (withPrefix) {
    const v = parseFloat(withPrefix[1].replace(',', '.'));
    if (!isNaN(v) && v >= 10 && v <= 5000) return v;
  }

  return null;
}

/**
 * Extrae presupuesto de requerimiento (venta o arriendo).
 */
function extractRequirementBudget(rawText: string, isRent: boolean): number | null {
  const clean = cleanText(rawText).toLowerCase();

  // Rango: "8 a 11 millones", "800 a 1200 millones"
  const rangeMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:a|hasta|-)\s*\$?(\d+(?:[.,]\d+)?)\s*(mil\s*millones?|millones?|millón|mll|mm|m)\b/i);
  if (rangeMatch) {
    let maxVal = parseFloat(rangeMatch[2].replace(',', '.'));
    const unit = rangeMatch[3].toLowerCase();
    let mult = 1_000_000;
    if (unit.includes('mil millon')) mult = 1_000_000_000;
    else if (maxVal > 1000) maxVal /= 1000;
    const computed = Math.round(maxVal * mult);
    if (computed >= (isRent ? 300_000 : 10_000_000)) return computed;
  }

  // Prefijo explícito de presupuesto: "ppto 1700 mm", "hasta 5 millones", "presupuesto $1.700.000.000"
  const budgetPrefix = clean.match(
    /(?:presupuesto|ppto|hasta|máximo|max|canon|valor)\s*:?\s*\$?\s*([\d.,\s]+?)\s*(mil\s*millones?|millones?|mm|m)?\b/i
  );
  if (budgetPrefix) {
    let valStr = budgetPrefix[1].replace(/[.,\s]/g, '');
    let val = parseFloat(valStr);
    if (!isNaN(val)) {
      const unit = (budgetPrefix[2] || '').toLowerCase();
      if (unit.includes('mil millon')) val *= 1_000_000_000;
      else if (unit.includes('millon') || unit === 'mm' || unit === 'm') val *= 1_000_000;
      else if (!isRent && val < 10_000) val *= 1_000_000; // e.g. 1700 -> 1700M
      if (val >= (isRent ? 300_000 : 10_000_000) && val <= 50_000_000_000 && !isPhoneLike(val, rawText)) {
        return Math.round(val);
      }
    }
  }

  // Si es arriendo, intentar extractor de canon
  if (isRent) {
    const rent = extractRentPriceFromText(rawText);
    if (rent) return rent;
  } else {
    const sale = extractSalePriceFromText(rawText);
    if (sale) return sale;
  }

  return null;
}

// ─── PROCESO PRINCIPAL ────────────────────────────────────────────────────────

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('❌ No se pudo conectar a Supabase.');
    process.exit(1);
  }

  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   VECY Network — Auditoría & Enriquecimiento Retroactivo v25.0    ║');
  console.log('║   Precios Venta • Cánones Arriendo • Administración • Áreas       ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  let propPriceFixed = 0;
  let propRentFixed = 0;
  let propAdminFixed = 0;
  let propAreaFixed = 0;

  let reqBudgetFixed = 0;
  let reqAdminFixed = 0;
  let reqAreaFixed = 0;

  const errors: string[] = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 1: PROPIEDADES (OFERTAS)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('🏠 ─── AUDITANDO PROPIEDADES (INMUEBLES) ──────────────────────');
  const allProps = await db.select().from(properties);
  console.log(`   Total inmuebles en base de datos: ${allProps.length}\n`);

  for (const prop of allProps) {
    try {
      const rawText = [prop.rawText, prop.description, prop.name].filter(Boolean).join(' ');
      if (!rawText.trim()) continue;

      const transType = (prop.transactionType || 'venta').toLowerCase();
      const isRent = transType.includes('arriendo');
      const isSale = transType.includes('venta') || transType.includes('permuta') || !isRent;
      const isDual = transType === 'venta_o_arriendo';

      const updates: Record<string, any> = {};

      // 1.1 Precio de Venta
      if (isSale) {
        const currentPrice = prop.price ? parseFloat(String(prop.price)) : 0;
        // Si el precio de venta es menor a $200M (sospechoso por malformateo de miles)
        if (currentPrice > 0 && currentPrice < 200_000_000) {
          const extractedPrice = extractSalePriceFromText(rawText);
          if (extractedPrice && extractedPrice >= 10_000_000 && Math.abs(extractedPrice - currentPrice) / currentPrice > 0.05) {
            console.log(`   💰 [PRECIO VENTA] Prop #${prop.id}: $${currentPrice.toLocaleString('es-CO')} → $${extractedPrice.toLocaleString('es-CO')}`);
            console.log(`      Snippet: "${rawText.substring(0, 75).replace(/\n/g, ' ')}..."`);
            updates.price = String(extractedPrice);
            propPriceFixed++;
          }
        }
      }

      // 1.2 Canon de Arriendo (rentPrice)
      if (isRent || isDual) {
        const currentRent = prop.rentPrice ? parseFloat(String(prop.rentPrice)) : 0;
        if (currentRent <= 0) {
          const extractedRent = extractRentPriceFromText(rawText);
          if (extractedRent && extractedRent >= 300_000) {
            console.log(`   🔑 [CANON ARRIENDO] Prop #${prop.id}: $${currentRent.toLocaleString('es-CO')} → $${extractedRent.toLocaleString('es-CO')}`);
            console.log(`      Snippet: "${rawText.substring(0, 75).replace(/\n/g, ' ')}..."`);
            updates.rentPrice = String(extractedRent);
            if (isRent && (!prop.price || parseFloat(String(prop.price)) === 0)) {
              updates.price = String(extractedRent);
            }
            propRentFixed++;
          }
        }
      }

      // 1.3 Cuota de Administración (adminFee)
      const currentAdmin = prop.adminFee ? parseFloat(String(prop.adminFee)) : 0;
      if (currentAdmin <= 0) {
        const extractedAdmin = extractAdminFeeFromText(rawText);
        if (extractedAdmin && extractedAdmin >= 10_000) {
          console.log(`   🏢 [ADMINISTRACIÓN] Prop #${prop.id}: $${currentAdmin.toLocaleString('es-CO')} → $${extractedAdmin.toLocaleString('es-CO')}`);
          console.log(`      Snippet: "${rawText.substring(0, 75).replace(/\n/g, ' ')}..."`);
          updates.adminFee = String(extractedAdmin);
          propAdminFixed++;
        }
      }

      // 1.4 Área Total (areaTotal)
      const currentArea = prop.areaTotal ? parseFloat(String(prop.areaTotal)) : 0;
      if (currentArea <= 0) {
        const extractedArea = extractAreaFromText(rawText);
        if (extractedArea && extractedArea >= 10 && extractedArea <= 5000) {
          console.log(`   📐 [ÁREA TOTAL] Prop #${prop.id}: ${currentArea} m² → ${extractedArea} m²`);
          console.log(`      Snippet: "${rawText.substring(0, 75).replace(/\n/g, ' ')}..."`);
          updates.areaTotal = String(extractedArea);
          propAreaFixed++;
        }
      }

      // Aplicar actualización si hubo cambios
      if (Object.keys(updates).length > 0) {
        await db.update(properties).set(updates).where(eq(properties.id, prop.id));
      }
    } catch (err: any) {
      errors.push(`Prop #${prop.id}: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 2: REQUERIMIENTOS (DEMANDAS)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n📋 ─── AUDITANDO REQUERIMIENTOS (DEMANDAS) ────────────────────');
  const allReqs = await db.select().from(requirements);
  console.log(`   Total requerimientos en base de datos: ${allReqs.length}\n`);

  for (const req of allReqs) {
    try {
      const rawText = [req.rawText, req.name].filter(Boolean).join(' ');
      if (!rawText.trim()) continue;

      const transType = (req.tipoNegocioDeseado || 'venta').toLowerCase();
      const isRent = transType.includes('arriendo');

      const updates: Record<string, any> = {};

      // 2.1 Presupuesto Máximo (presupuestoMax)
      const currentBudget = req.presupuestoMax ? parseFloat(String(req.presupuestoMax)) : 0;
      const isSuspiciousBudget = isRent
        ? currentBudget > 0 && currentBudget < 1_000_000
        : currentBudget > 0 && currentBudget < 50_000_000;

      if (currentBudget <= 0 || isSuspiciousBudget) {
        const extractedBudget = extractRequirementBudget(rawText, isRent);
        if (extractedBudget) {
          const isReasonable = isRent
            ? extractedBudget >= 300_000 && extractedBudget <= 200_000_000
            : extractedBudget >= 10_000_000 && extractedBudget <= 50_000_000_000;

          if (isReasonable && (currentBudget <= 0 || Math.abs(extractedBudget - currentBudget) / currentBudget > 0.05)) {
            console.log(`   💵 [PRESUPUESTO] Req #${req.id} (${transType}): $${currentBudget.toLocaleString('es-CO')} → $${extractedBudget.toLocaleString('es-CO')}`);
            console.log(`      Snippet: "${rawText.substring(0, 75).replace(/\n/g, ' ')}..."`);
            updates.presupuestoMax = String(extractedBudget);
            reqBudgetFixed++;
          }
        }
      }

      // 2.2 Cuota de Administración Máxima (adminFeeMax)
      const currentAdminMax = req.adminFeeMax ? parseFloat(String(req.adminFeeMax)) : 0;
      if (currentAdminMax <= 0) {
        const extractedAdmin = extractAdminFeeFromText(rawText);
        if (extractedAdmin && extractedAdmin >= 10_000) {
          console.log(`   🏢 [ADMON MÁXIMA] Req #${req.id}: $${currentAdminMax.toLocaleString('es-CO')} → $${extractedAdmin.toLocaleString('es-CO')}`);
          console.log(`      Snippet: "${rawText.substring(0, 75).replace(/\n/g, ' ')}..."`);
          updates.adminFeeMax = String(extractedAdmin);
          reqAdminFixed++;
        }
      }

      // 2.3 Área Mínima (areaMin)
      const currentAreaMin = req.areaMin ? parseFloat(String(req.areaMin)) : 0;
      if (currentAreaMin <= 0) {
        const extractedArea = extractAreaFromText(rawText);
        if (extractedArea && extractedArea >= 10 && extractedArea <= 5000) {
          console.log(`   📐 [ÁREA MÍNIMA] Req #${req.id}: ${currentAreaMin} m² → ${extractedArea} m²`);
          console.log(`      Snippet: "${rawText.substring(0, 75).replace(/\n/g, ' ')}..."`);
          updates.areaMin = String(extractedArea);
          reqAreaFixed++;
        }
      }

      // Aplicar actualización si hubo cambios
      if (Object.keys(updates).length > 0) {
        await db.update(requirements).set(updates).where(eq(requirements.id, req.id));
      }
    } catch (err: any) {
      errors.push(`Req #${req.id}: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORTE CONSOLIDADO
  // ═══════════════════════════════════════════════════════════════════════════
  const totalProps = propPriceFixed + propRentFixed + propAdminFixed + propAreaFixed;
  const totalReqs = reqBudgetFixed + reqAdminFixed + reqAreaFixed;
  const grandTotal = totalProps + totalReqs;

  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                   BALANCE FINAL DE ENRIQUECIMIENTO                 ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log(`\n  🏠 PROPIEDADES ENRIQUECIDAS:`);
  console.log(`     • Precios de Venta corregidos        : ${propPriceFixed}`);
  console.log(`     • Cánones de Arriendo recuperados    : ${propRentFixed}`);
  console.log(`     • Cuotas de Administración añadidas  : ${propAdminFixed}`);
  console.log(`     • Áreas Totales rescatadas           : ${propAreaFixed}`);
  console.log(`     ───────────────────────────────────────────`);
  console.log(`     Subtotal campos de propiedades       : ${totalProps}`);

  console.log(`\n  📋 REQUERIMIENTOS ENRIQUECIDOS:`);
  console.log(`     • Presupuestos corregidos/asignados  : ${reqBudgetFixed}`);
  console.log(`     • Cuotas de Administración Máximas   : ${reqAdminFixed}`);
  console.log(`     • Áreas Mínimas recuperadas          : ${reqAreaFixed}`);
  console.log(`     ───────────────────────────────────────────`);
  console.log(`     Subtotal campos de requerimientos    : ${totalReqs}`);

  console.log(`\n  ⭐ TOTAL DE CAMPOS ENRIQUECIDOS EN SUPABASE: ${grandTotal}`);

  if (errors.length > 0) {
    console.log(`\n  ⚠️  INCIDENCIAS (${errors.length}):`);
    errors.slice(0, 10).forEach(e => console.log(`     - ${e}`));
    if (errors.length > 10) console.log(`     ... y ${errors.length - 10} más`);
  }

  console.log('\n  🚀 Proceso completado exitosamente con persistencia 100% en BD.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error fatal durante la ejecución:', err);
  process.exit(1);
});
