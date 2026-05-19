import { getDb } from '../server/db';
import { properties, propertyMatches, propertyImages } from '../drizzle/schema';
import { eq, sql, and, isNotNull, inArray } from 'drizzle-orm';

async function cleanup() {
  const db = await getDb();
  if (!db) return;

  console.log('--- INICIANDO LIMPIEZA DE DUPLICADOS CON MANEJO DE FK ---');

  // 1. Identificar URLs duplicadas
  const duplicates = await db.select({
    externalUrl: properties.externalUrl,
    count: sql<number>`count(*)`,
    minId: sql<number>`min(id)`
  })
  .from(properties)
  .where(isNotNull(properties.externalUrl))
  .groupBy(properties.externalUrl)
  .having(sql`count(*) > 1`);

  console.log(`[INFO] Se encontraron ${duplicates.length} URLs con duplicados.`);

  for (const dup of duplicates) {
    if (!dup.externalUrl) continue;
    
    // Obtener IDs de los duplicados que vamos a borrar
    const dupRecords = await db.select({ id: properties.id })
      .from(properties)
      .where(
        and(
          eq(properties.externalUrl, dup.externalUrl),
          sql`id != ${dup.minId}`
        )
      );
    
    const idsToDelete = dupRecords.map(r => r.id);

    if (idsToDelete.length > 0) {
      // Borrar dependencias primero para evitar error de FK
      await db.delete(propertyMatches).where(inArray(propertyMatches.propertyId, idsToDelete));
      await db.delete(propertyImages).where(inArray(propertyImages.propertyId, idsToDelete));
      
      // Ahora sí, borrar los inmuebles duplicados
      const deleted = await db.delete(properties)
        .where(inArray(properties.id, idsToDelete))
        .returning();
      
      console.log(`[CLEAN] URL: ${dup.externalUrl} - Borrados ${deleted.length} duplicados. Mantenido ID: ${dup.minId}`);
    }
  }

  // 2. Corregir Atribución (Adriana y Diego)
  console.log('\n--- CORRIGIENDO ATRIBUCIÓN DE PROPIEDARIOS ---');
  
  const ADRIANA_ID = '4900725465196@lid';
  const DIEGO_ID = '573105718712@c.us'; 

  const LINKS_ADRIANA = [
    'https://info.wasi.co/apartamento-venta-pasadena-bogota-dc/9995378',
    'https://info.wasi.co/apartamento-venta-bogota-dc/9995358',
    'https://info.wasi.co/apartamento-venta-santa-barbara-bogota-dc/9995342',
    'https://info.wasi.co/duplex-venta-cedritos-bogota-dc/9995309',
    'https://info.wasi.co/apartamento-venta-cedritos-bogota-dc/9995084',
    'https://info.wasi.co/apartamento-venta-cedritos-bogota-dc/9995071',
    'https://info.wasi.co/apartaestudio-venta-santa-paula-bogota-dc/9995064',
    'https://info.wasi.co/apartamento-venta-santa-barbara-bogota-dc/9776147',
    'https://info.wasi.co/lote-comercial-venta-el-prado-bogota-dc/9776104',
    'https://info.wasi.co/duplex-venta-bogota-dc/9775586',
    'https://info.wasi.co/apartamento-venta-chico-bogota-dc/9775499',
    'https://info.wasi.co/apartamento-venta-san-jose-de-bavaria-bogota-dc/9994536'
  ];

  const LINKS_DIEGO = [
    'https://info.wasi.co/casa-venta-alquiler-quinta-camacho-bogotá-d-c/9757801?shared=whatsapp',
    'https://info.wasi.co/casa-venta-alquiler-quinta-camacho-bogotá-d-c/7810837?shared=whatsapp'
  ];

  for (const url of LINKS_ADRIANA) {
    await db.update(properties)
      .set({ idUsuarioWhatsapp: ADRIANA_ID })
      .where(eq(properties.externalUrl, url));
  }
  console.log(`[UPDATE] ${LINKS_ADRIANA.length} links atribuidos a Adriana.`);

  for (const url of LINKS_DIEGO) {
    await db.update(properties)
      .set({ idUsuarioWhatsapp: DIEGO_ID })
      .where(eq(properties.externalUrl, url));
  }
  console.log(`[UPDATE] ${LINKS_DIEGO.length} links atribuidos a Diego.`);

  console.log('\n✅ Limpieza y corrección completada.');
  process.exit(0);
}

cleanup().catch(console.error);
