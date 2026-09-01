import dotenv from 'dotenv';
dotenv.config();
import postgres from 'postgres';
import { extractFallbackDataFromText, parseColombianPriceOrBudget } from '../server/_core/janIA';

const client = postgres(process.env.DATABASE_URL!);

async function sanitizeDatabase() {
  console.log('================================================================');
  console.log('🧹 INICIANDO SANEAMIENTO PROFUNDO DETERMINISTA DE TODA LA BD');
  console.log('================================================================\n');

  // 1. Saneamiento de Propiedades
  const props = await client`SELECT * FROM properties`;
  console.log(`Aud Piping ${props.length} Propiedades...`);

  let pUpdated = 0;
  for (const p of props) {
    if (!p.rawText && !p.description) continue;
    const text = ((p.rawText || '') + '\n' + (p.description || '')).trim();
    const fb = extractFallbackDataFromText(text);

    let price = parseFloat(String(p.price || 0));
    let rentPrice = p.rent_price ? parseFloat(String(p.rent_price)) : 0;
    let area = parseFloat(String(p.areaTotal || 0));
    let bedrooms = p.bedrooms != null ? Number(p.bedrooms) : null;
    let bathrooms = p.bathrooms != null ? Number(p.bathrooms) : null;
    let garages = p.garages != null ? Number(p.garages) : null;
    let zone = p.zone;
    let transactionType = p.transactionType;

    let changed = false;

    // A. Corrección de Precio si el extraído de fallback es más confiable
    if (fb.price && fb.price >= 50_000_000 && (price <= 0 || price < 50_000_000 || price === area)) {
      price = fb.price;
      changed = true;
    }
    if (fb.rentPrice && fb.rentPrice >= 500_000 && fb.rentPrice <= 50_000_000 && rentPrice !== fb.rentPrice) {
      rentPrice = fb.rentPrice;
      changed = true;
    }

    // B. Corrección de Tipo de Negocio
    if (fb.transactionType && fb.transactionType !== transactionType) {
      transactionType = fb.transactionType;
      changed = true;
    }

    // C. Corrección de Área
    if (fb.area && fb.area >= 15 && fb.area <= 5000 && (area <= 0 || area > 10000)) {
      area = fb.area;
      changed = true;
    }

    // D. Corrección de Habitaciones/Baños/Garajes
    if (fb.bedrooms && fb.bedrooms >= 1 && fb.bedrooms <= 20 && (!bedrooms || bedrooms <= 0)) {
      bedrooms = fb.bedrooms;
      changed = true;
    }
    if (fb.bathrooms && fb.bathrooms >= 1 && fb.bathrooms <= 20 && (!bathrooms || bathrooms <= 0)) {
      bathrooms = fb.bathrooms;
      changed = true;
    }
    if (fb.garages && fb.garages >= 1 && fb.garages <= 20 && (!garages || garages < 0)) {
      garages = fb.garages;
      changed = true;
    }

    // E. Corrección de Zona / Barrio
    if (fb.zone && fb.zone !== zone && fb.zone !== 'Bogotá' && fb.zone !== 'N/E') {
      zone = fb.zone;
      changed = true;
    }

    if (changed) {
      await client`
        UPDATE properties
        SET price = ${price > 0 ? price : 0},
            rent_price = ${rentPrice > 0 ? rentPrice : null},
            "transactionType" = ${transactionType},
            "areaTotal" = ${area > 0 ? area : null},
            bedrooms = ${bedrooms},
            bathrooms = ${bathrooms},
            garages = ${garages},
            zone = ${zone},
            "updatedAt" = NOW()
        WHERE id = ${p.id}
      `;
      pUpdated++;
    }
  }
  console.log(`✅ ${pUpdated} Propiedades saneadas y actualizadas en Supabase.\n`);

  // 2. Saneamiento de Requerimientos
  const reqs = await client`SELECT * FROM requirements`;
  console.log(`Aud Piping ${reqs.length} Requerimientos...`);

  let rUpdated = 0;
  for (const r of reqs) {
    if (!r.rawText && !r.name) continue;
    const text = ((r.rawText || '') + '\n' + (r.name || '')).trim();
    const fb = extractFallbackDataFromText(text);

    let budgetMax = parseFloat(String(r.presupuestoMax || 0));
    let areaMin = parseFloat(String(r.areaMin || 0));
    let bedroomsMin = r.habitacionesMin != null ? Number(r.habitacionesMin) : null;
    let bathroomsMin = r.banosMin != null ? Number(r.banosMin) : null;
    let garagesMin = r.parqueaderosMin != null ? Number(r.parqueaderosMin) : null;
    let zonaDeseada = r.zonaDeseada;
    let tipoNegocioDeseado = r.tipoNegocioDeseado;

    let changed = false;

    // A. Tipo de Negocio
    if (fb.transactionType && fb.transactionType !== tipoNegocioDeseado) {
      tipoNegocioDeseado = fb.transactionType;
      changed = true;
    }

    // B. Presupuesto Máximo
    if (fb.presupuestoMax && fb.presupuestoMax > 0 && fb.presupuestoMax !== budgetMax) {
      budgetMax = fb.presupuestoMax;
      changed = true;
    }

    // C. Área Mínima
    if (fb.areaMin && fb.areaMin >= 15 && fb.areaMin !== areaMin) {
      areaMin = fb.areaMin;
      changed = true;
    }

    // D. Físico
    if (fb.bedroomsMin && fb.bedroomsMin >= 1 && fb.bedroomsMin !== bedroomsMin) {
      bedroomsMin = fb.bedroomsMin;
      changed = true;
    }
    if (fb.bathrooms && fb.bathrooms >= 1 && fb.bathrooms !== bathroomsMin) {
      bathroomsMin = fb.bathrooms;
      changed = true;
    }
    if (fb.garages && fb.garages >= 1 && fb.garages !== garagesMin) {
      garagesMin = fb.garages;
      changed = true;
    }

    // E. Zona
    if (fb.zone && fb.zone !== zonaDeseada && fb.zone !== 'Bogotá' && fb.zone !== 'N/E') {
      zonaDeseada = fb.zone;
      changed = true;
    }

    if (changed) {
      await client`
        UPDATE requirements
        SET "presupuestoMax" = ${budgetMax > 0 ? budgetMax : null},
            "tipoNegocioDeseado" = ${tipoNegocioDeseado},
            "areaMin" = ${areaMin > 0 ? areaMin : null},
            "habitacionesMin" = ${bedroomsMin},
            "banosMin" = ${bathroomsMin},
            "parqueaderosMin" = ${garagesMin},
            "zonaDeseada" = ${zonaDeseada},
            "updatedAt" = NOW()
        WHERE id = ${r.id}
      `;
      rUpdated++;
    }
  }
  console.log(`✅ ${rUpdated} Requerimientos saneados y actualizados en Supabase.\n`);

  process.exit(0);
}

sanitizeDatabase().catch(err => {
  console.error('❌ Error en saneamiento:', err);
  process.exit(1);
});
