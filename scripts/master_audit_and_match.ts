import dotenv from 'dotenv';
dotenv.config();
import postgres from 'postgres';
import { calcularScoreMatch, explicarMatch } from '../server/_core/matching';
import { extractFallbackDataFromText, parseColombianPriceOrBudget } from '../server/_core/janIA';

const client = postgres(process.env.DATABASE_URL!);

// ── 1. CLASIFICACIÓN DE USOS Y TIPOLOGÍAS ──
export type InmuebleUso = 'residencial' | 'comercial' | 'oficinas_salud' | 'industrial' | 'lote' | 'otro';

export function clasificarUso(tipo: string, rawText: string): InmuebleUso {
  const t = (tipo || '').toLowerCase().trim();
  const text = (rawText || '').toLowerCase();

  // 1. Oficinas y Salud
  if (t === 'consultorio' || t === 'office' || t === 'oficina' || text.includes('consultorio') || text.includes('centro medico') || text.includes('centro médico')) {
    if (t === 'consultorio' || text.includes('consultorio') || text.includes('odontolog') || text.includes('médico') || text.includes('medico')) {
      return 'oficinas_salud';
    }
    if (t === 'office' || t === 'oficina' || text.includes('oficina')) {
      return 'oficinas_salud';
    }
  }

  // 2. Industrial / Logístico
  if (t === 'warehouse' || t === 'bodega' || t === 'nave industrial' || text.includes('bodega industrial') || text.includes('parque industrial') || text.includes('muelle de carga')) {
    return 'industrial';
  }

  // 3. Comercial
  if (t === 'commercial' || t === 'local' || t === 'local_comercial' || text.includes('local comercial') || text.includes('centro comercial') || text.includes('vitrina comercial')) {
    return 'comercial';
  }

  // 4. Lotes / Terrenos
  if (t === 'land' || t === 'lote' || t === 'terreno' || text.includes('lote') || text.includes('terreno')) {
    return 'lote';
  }

  // 5. Residencial (Default para vivienda)
  return 'residencial';
}

async function runMasterAudit() {
  console.log('================================================================');
  console.log('🚀 INICIANDO AUDITORÍA INTEGRAL Y ESCANEO MAESTRO DE COINCIDENCIAS');
  console.log('================================================================\n');

  // 1. Cargar Propiedades y Requerimientos
  const properties = await client`SELECT * FROM properties WHERE available = true`;
  const requirements = await client`SELECT * FROM requirements WHERE status = 'active' OR status IS NULL`;

  console.log(`📦 Propiedades Disponibles en BD: ${properties.length}`);
  console.log(`📋 Requerimientos Activos en BD: ${requirements.length}`);
  console.log(`⚡ Pares a Evaluar: ${properties.length * requirements.length} combinaciones\n`);

  // 2. Escaneo con los 5 Filtros Duros
  let matchesFound: any[] = [];
  let discardCounters = {
    usoDistinto: 0,
    negocioIncompatible: 0,
    geografiaIncompatible: 0,
    presupuestoSuperado: 0,
    areaDeficitaria: 0,
    alcobasDeficitarias: 0,
    banosDeficitarios: 0,
    garajesDeficitarios: 0,
    ocupacionIncompatible: 0,
    autoMatches: 0,
    otrosFiltros: 0
  };

  for (const req of requirements) {
    const reqUso = clasificarUso(req.tipoInmuebleDeseado, req.rawText || '');

    for (const prop of properties) {
      const propUso = clasificarUso(prop.propertyType, prop.rawText || '');

      // Guard 1: Uso de Suelo Incompatible (Residencial vs Comercial vs Oficinas vs Industrial)
      if (reqUso !== propUso) {
        discardCounters.usoDistinto++;
        continue;
      }

      // Evaluar con el motor doctrinal
      const exp = explicarMatch(req, prop);
      if (exp.score >= 80 && exp.blockers.length === 0) {
        matchesFound.push({
          req,
          prop,
          score: exp.score,
          explanation: exp
        });
      } else {
        const blk = exp.blockers.join(' | ');
        if (blk.includes('Auto-Match') || blk.includes('Duplicada')) discardCounters.autoMatches++;
        else if (blk.includes('negocio')) discardCounters.negocioIncompatible++;
        else if (blk.includes('Geografía') || blk.includes('geográfica') || blk.includes('Barrio')) discardCounters.geografiaIncompatible++;
        else if (blk.includes('presupuesto') || blk.includes('Financiera')) discardCounters.presupuestoSuperado++;
        else if (blk.includes('Área') || blk.includes('metraje')) discardCounters.areaDeficitaria++;
        else if (blk.includes('Habitaciones') || blk.includes('Alcoba')) discardCounters.alcobasDeficitarias++;
        else if (blk.includes('Baños')) discardCounters.banosDeficitarios++;
        else if (blk.includes('Parqueaderos')) discardCounters.garajesDeficitarios++;
        else if (blk.includes('Ocupada') || blk.includes('Inversionista') || blk.includes('Condición')) discardCounters.ocupacionIncompatible++;
        else discardCounters.otrosFiltros++;
      }
    }
  }

  console.log('----------------------------------------------------------------');
  console.log('📊 ESTADÍSTICAS DE DESCARTES POR FILTROS DUROS:');
  console.log(`  - Descartados por Auto-Match / Publicación Clonada: ${discardCounters.autoMatches.toLocaleString()}`);
  console.log(`  - Descartados por Uso Incompatible (ej. Residencial vs Comercial): ${discardCounters.usoDistinto.toLocaleString()}`);
  console.log(`  - Descartados por Negocio Incompatible (Venta vs Arriendo): ${discardCounters.negocioIncompatible.toLocaleString()}`);
  console.log(`  - Descartados por Geografía Incompatible (Ciudad/Barrio distinto): ${discardCounters.geografiaIncompatible.toLocaleString()}`);
  console.log(`  - Descartados por Presupuesto (Precio Oferta > Ppto Demanda): ${discardCounters.presupuestoSuperado.toLocaleString()}`);
  console.log(`  - Descartados por Área Deficitaria (Oferta m² < Demanda m²): ${discardCounters.areaDeficitaria.toLocaleString()}`);
  console.log(`  - Descartados por Déficit Físico (Alcobas/Baños/Garajes): ${(discardCounters.alcobasDeficitarias + discardCounters.banosDeficitarios + discardCounters.garajesDeficitarios).toLocaleString()}`);
  console.log(`  - Descartados por Inmueble Ocupado vs Demanda con Crédito: ${discardCounters.ocupacionIncompatible.toLocaleString()}`);
  console.log('----------------------------------------------------------------\n');

  console.log(`🎯 TOTAL MATCHES CERTIFICADOS ENCONTRADOS: ${matchesFound.length}\n`);

  // Imprimir cada Match encontrado con detalle cara a cara
  matchesFound.forEach((m, idx) => {
    console.log(`================================================================`);
    console.log(`✨ MATCH #${idx + 1} (Score: ${m.score}%)`);
    console.log(`================================================================`);
    console.log(`🏢 OFERTA (ID #${m.prop.id}):`);
    console.log(`   Título: ${m.prop.name}`);
    console.log(`   Barrio: ${m.prop.zone || m.prop.address_neighborhood || 'N/E'} | Ciudad: ${m.prop.city || m.prop.address_city || 'Bogotá'}`);
    console.log(`   Negocio: ${m.prop.transactionType} | Precio: $${Number(m.prop.price || m.prop.rentPrice || 0).toLocaleString()} COP`);
    console.log(`   Especificaciones: ${m.prop.areaTotal || m.prop.area || 0} m² | ${m.prop.bedrooms || 0} Habs | ${m.prop.bathrooms || 0} Baños | ${m.prop.garages || 0} Garajes`);
    console.log(`   Texto Oferta: "${(m.prop.rawText || '').replace(/[\n\r]+/g, ' ').slice(0, 160)}..."`);
    console.log(`\n🔍 DEMANDA (ID #${m.req.id}):`);
    console.log(`   Título: ${m.req.name}`);
    console.log(`   Barrio(s): ${m.req.zonaDeseada || m.req.address_neighborhood || 'N/E'} | Ciudad: ${m.req.ciudadDeseada || m.req.address_city || 'Bogotá'}`);
    console.log(`   Negocio: ${m.req.tipoNegocioDeseado} | Ppto Máx: $${Number(m.req.presupuestoMax || 0).toLocaleString()} COP`);
    console.log(`   Requisitos Mínimos: ${m.req.areaMin || 0} m² mín | ${m.req.habitacionesMin || 0} Habs mín | ${m.req.banosMin || 0} Baños mín | ${m.req.parqueaderosMin || 0} Garajes mín`);
    console.log(`   Texto Demanda: "${(m.req.rawText || '').replace(/[\n\r]+/g, ' ').slice(0, 160)}..."`);
    console.log(`\n✅ PUNTOS POSITIVOS DE COTEJO:`);
    m.explanation.positives.forEach((p: string) => console.log(`   • ${p}`));
    console.log(`\n`);
  });

  // 3. Sincronizar tabla "propertyMatches" en Supabase
  console.log('🔄 Sincronizando tabla propertyMatches en Supabase...');
  await client`DELETE FROM "propertyMatches"`;
  
  for (const m of matchesFound) {
    await client`
      INSERT INTO "propertyMatches" (
        "propertyId",
        "requirementId",
        "matchScore",
        "matchExplanation",
        "matchReason",
        "status",
        "createdAt"
      ) VALUES (
        ${m.prop.id},
        ${m.req.id},
        ${m.score},
        ${JSON.stringify({
          positives: m.explanation.positives,
          negatives: m.explanation.negatives,
          breakdown: m.explanation.breakdown
        })},
        ${m.explanation.positives.slice(0, 3).join(' | ')},
        'suggested',
        NOW()
      )
    `;
  }
  console.log(`✅ Base de datos actualizada con los ${matchesFound.length} matches certificados.\n`);

  process.exit(0);
}

runMasterAudit().catch(err => {
  console.error('❌ Error en auditoría:', err);
  process.exit(1);
});
