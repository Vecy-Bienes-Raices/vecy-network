import { getDb } from './db';
import { properties, propertyMatches, requirements } from '../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { explicarMatch } from './_core/matching';

async function fixCorruptedPrices() {
  console.log('🚀 Iniciando script de Sanidad Predial de Precios en Supabase...');

  const db = await getDb();
  if (!db) {
    console.error('❌ No se pudo conectar a la base de datos Supabase.');
    process.exit(1);
  }

  // 1. Obtener inmuebles de venta cuyo precio registrado sea < 30.000.000 COP (cuota de administración corrupta)
  const candidateProps = await db.select().from(properties);
  
  let fixedCount = 0;
  let matchPurgedCount = 0;

  for (const prop of candidateProps) {
    const priceNum = prop.price ? parseFloat(String(prop.price)) : 0;
    const txType = (prop.transactionType || '').toLowerCase();
    const isVenta = txType.includes('venta') || !txType.includes('arriendo');

    if (isVenta && priceNum > 0 && priceNum < 30_000_000 && prop.rawText) {
      const rawLower = prop.rawText.toLowerCase();
      // Regex para detectar precio de venta real (ej. V/VENTA/ $950.000.000)
      const saleMatch = rawLower.match(/(?:v\/venta\/|precio\s*(?:de\s*)?venta|venta)\s*:?\s*\$?([\d.,]+)\s*(mil\s*millones?|millones?|m|M)?/i)
                     || rawLower.match(/venta\/.*?\$?\s*([\d.]{7,12})/i);

      if (saleMatch) {
        let rawNum = parseFloat(saleMatch[1].replace(/\./g, '').replace(/,/g, ''));
        const unitStr = (saleMatch[2] || '').toLowerCase();
        const mult = unitStr.includes('mil millon') ? 1_000_000_000
          : unitStr.includes('millon') || unitStr === 'm' ? 1_000_000
          : rawNum < 10_000 ? 1_000_000 : 1;
        const realSalePrice = rawNum * mult;

        if (realSalePrice >= 30_000_000) {
          const newAdminFee = prop.adminFee && parseFloat(String(prop.adminFee)) > 0 ? prop.adminFee : String(priceNum);
          
          console.log(`[FIX-PRECIO] Propiedad ID #${prop.id} "${prop.name}":`);
          console.log(`   Precio Corrupto Anterior: $${priceNum.toLocaleString()} COP`);
          console.log(`   Precio Venta Real Corregido: $${realSalePrice.toLocaleString()} COP`);
          console.log(`   Admin Fee: $${parseFloat(newAdminFee).toLocaleString()} COP`);

          // Actualizar en Supabase
          await db.update(properties)
            .set({
              price: String(realSalePrice),
              adminFee: newAdminFee
            })
            .where(eq(properties.id, prop.id));

          fixedCount++;
        }
      }
    }
  }

  console.log(`\n✅ Sanidad Predial completada: ${fixedCount} propiedades corregidas.`);

  // 2. Recalcular matches existentes y purgar aquellos violados por Guillotina Financiera (o score < 85)
  console.log('\n🧹 Recalculando coincidencia de matches existentes para purgar falsos positivos...');
  const allMatches = await db.select({
    matchId: propertyMatches.id,
    reqId: propertyMatches.requirementId,
    propId: propertyMatches.propertyId,
    oldScore: propertyMatches.matchScore
  }).from(propertyMatches);

  for (const m of allMatches) {
    const [req] = await db.select().from(requirements).where(eq(requirements.id, m.reqId));
    const [prop] = await db.select().from(properties).where(eq(properties.id, m.propId));

    if (req && prop) {
      const explanation = explicarMatch(req, prop);
      const newScore = explanation.score;

      if (newScore < 85) {
        console.log(`❌ Purgando Match #M${m.matchId} (Inmueble #${prop.id} vs Req #${req.id}): Antiguo Score=${m.oldScore}% → Nuevo Score=${newScore}%. Blocker: ${explanation.blockers.join(' | ')}`);
        await db.delete(propertyMatches).where(eq(propertyMatches.id, m.matchId));
        matchPurgedCount++;
      } else if (newScore !== parseFloat(String(m.oldScore))) {
        await db.update(propertyMatches)
          .set({
            matchScore: String(newScore),
            matchReason: explanation.positives.join(' | ')
          })
          .where(eq(propertyMatches.id, m.matchId));
      }
    }
  }

  console.log(`\n🎉 Proceso completado exitosamente:`);
  console.log(`   • Inmuebles corregidos en Supabase: ${fixedCount}`);
  console.log(`   • Matches inviables purgados: ${matchPurgedCount}`);
  process.exit(0);
}

fixCorruptedPrices().catch(err => {
  console.error('❌ Error ejecutando fixCorruptedPrices:', err);
  process.exit(1);
});
