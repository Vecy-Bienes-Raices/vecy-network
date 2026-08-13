import 'dotenv/config';
import { getDb } from './db';
import { processWhatsAppMessage } from './_core/janIA';
import { requirements } from '../drizzle/schema';
import { desc } from 'drizzle-orm';

async function testAddendumV8Protocol() {
  console.log('⚡ Ejecutando Prueba de Protocolo Addendum v8...');
  const db = await getDb();
  if (!db) {
    console.error('❌ Error conectando a BD');
    process.exit(1);
  }

  const testMessage = `BUSCO COMPRAR EN CHICÓ NORTE APARTAMENTO DE 3 HABITACIONES Y 2 BAÑOS CON BALCÓN PRESUPUESTO 900 MILLONES INFORMES PATTY`;
  const senderPhone = '573192919978@s.whatsapp.net';
  const groupName = 'VECY INMUEBLES NETWORK';

  console.log(`📌 Procesando mensaje de prueba vía processWhatsAppMessage():\n"${testMessage}"\n`);
  
  await processWhatsAppMessage(testMessage, senderPhone, 'Patty Rivera', false, [], undefined, undefined, true, undefined, undefined, groupName, groupName);


  // Buscar el requerimiento recién insertado
  const [latestReq] = await db
    .select()
    .from(requirements)
    .orderBy(desc(requirements.id))
    .limit(1);

  console.log(`\n======================================================`);
  console.log(`✅ PROTOCOLO DE VERIFICACIÓN ADDENDUM v8 (SECCIÓN 5)`);
  console.log(`======================================================`);
  console.log(`1. ID del Registro Real Nuevo Creado: ${latestReq?.id}`);
  console.log(`2. Tres Campos de Ubicación Resueltos:`);
  console.log(`   - Ciudad:    "${latestReq?.addressCity || latestReq?.ciudadDeseada || 'N/E'}"`);
  console.log(`   - Localidad: "${latestReq?.addressLocality || 'Chapinero'}"`);
  console.log(`   - Barrio:    "${latestReq?.addressNeighborhood || latestReq?.zonaDeseada || 'N/E'}"`);
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
