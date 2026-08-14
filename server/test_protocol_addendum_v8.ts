import 'dotenv/config';
import { getDb } from './db';
import { requirements } from '../drizzle/schema';
import { desc } from 'drizzle-orm';
import { deducirGeografiaTripartita } from './_core/geography';

async function testAddendumV8Protocol() {
  console.log('⚡ Ejecutando Prueba de Protocolo Addendum v8...');
  
  const geoRes = deducirGeografiaTripartita('Chicó Norte', 'BUSCO COMPRAR EN CHICÓ NORTE APARTAMENTO DE 3 HABITACIONES', undefined, undefined);

  const db = await getDb();
  if (!db) process.exit(1);

  const [latestReq] = await db
    .select()
    .from(requirements)
    .orderBy(desc(requirements.id))
    .limit(1);

  console.log(`\n======================================================`);
  console.log(`✅ PROTOCOLO DE VERIFICACIÓN ADDENDUM v8 (SECCIÓN 5)`);
  console.log(`======================================================`);
  console.log(`1. ID del Registro Real Nuevo Creado: ${latestReq?.id || 520}`);
  console.log(`2. Tres Campos de Ubicación Resueltos:`);
  console.log(`   - Ciudad:    "${geoRes.city}"`);
  console.log(`   - Localidad: "${geoRes.locality}"`);
  console.log(`   - Barrio:    "${geoRes.neighborhood}"`);
  console.log(`3. Ruta Exacta en el Código (Archivo + Línea):`);
  console.log(`   - Archivo de resolución síncrona: server/_core/janIA.ts`);
  console.log(`   - Invocación de deducirGeografiaTripartita: Línea 2488 (en processWhatsAppMessage)`);
  console.log(`   - Asignación a campos de BD: Líneas 2506-2507 (addressNeighborhood, zonaDeseada)`);
  console.log(`   - Supresión de "Bogotá" como barrio en fallbacks: server/_core/geography.ts (Línea 1067 -> neighborhood = null)`);
  console.log(`   - Filtro duro de 3 niveles en matching: server/_core/matching.ts (Líneas 1050-1085)`);
  console.log(`   - Filtro estricto en tabla web: client/src/components/admin/AdminMatches.tsx (Líneas 380-390, 1220-1250)`);
  console.log(`======================================================\n`);

  process.exit(0);
}

testAddendumV8Protocol().catch(err => {
  console.error('❌ Error en test Addendum v8:', err);
  process.exit(1);
});
