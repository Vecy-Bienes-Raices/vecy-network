import { scrapePropertyLink } from '../server/_core/scraper';
import { getDb } from '../server/db';
import { properties, InsertProperty } from '../drizzle/schema';
import { findMatchesForProperty } from '../server/_core/matching';
import { whatsappBot } from '../server/_core/whatsapp';

const ADRIANA_ID = '4900725465196@lid';
const DIEGO_ID = 'diego_ojeda_wasi'; // Placeholder

const LINKS_ADRIANA = [
  'https://info.wasi.co/apartamento-venta-san-jose-de-bavaria-bogota-dc/9994536',
  'https://info.wasi.co/apartamento-venta-chico-bogota-dc/9775499',
  'https://info.wasi.co/duplex-venta-bogota-dc/9775586',
  'https://info.wasi.co/lote-comercial-venta-el-prado-bogota-dc/9776104',
  'https://info.wasi.co/apartamento-venta-santa-barbara-bogota-dc/9776147',
  'https://info.wasi.co/apartaestudio-venta-santa-paula-bogota-dc/9995064',
  'https://info.wasi.co/apartamento-venta-cedritos-bogota-dc/9995071',
  'https://info.wasi.co/apartamento-venta-cedritos-bogota-dc/9995084',
  'https://info.wasi.co/duplex-venta-cedritos-bogota-dc/9995309',
  'https://info.wasi.co/apartamento-venta-santa-barbara-bogota-dc/9995342',
  'https://info.wasi.co/apartamento-venta-bogota-dc/9995358',
  'https://info.wasi.co/apartamento-venta-pasadena-bogota-dc/9995378'
];

const LINKS_DIEGO = [
  'https://info.wasi.co/casa-venta-alquiler-quinta-camacho-bogotá-d-c/7810837?shared=whatsapp',
  'https://info.wasi.co/casa-venta-alquiler-quinta-camacho-bogotá-d-c/9757801?shared=whatsapp'
];

async function ingest(links: string[], ownerId: string) {
  const db = await getDb();
  if (!db) return;

  console.log(`\n--- INICIANDO INGESTA PARA ${ownerId} ---`);
  
  for (const url of links) {
    try {
      console.log(`[PROCESS] Scrapeando: ${url}`);
      const data = await scrapePropertyLink(url);
      
      if (!data || !data.price) {
        console.warn(`[WARN] No se pudo extraer precio para: ${url}`);
      }

      const propertyData: InsertProperty = {
        name: data.name,
        description: data.description,
        propertyType: data.propertyType || 'apartment',
        transactionType: data.transactionType || 'venta',
        price: data.price ? data.price.toString() : '0',
        currency: data.currency || 'COP',
        city: data.city || 'Bogotá',
        zone: data.zone || 'Bogotá',
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        garages: data.garages,
        stratum: data.stratum,
        areaTotal: data.areaTotal ? data.areaTotal.toString() : null,
        areaPrivate: data.areaPrivate ? data.areaPrivate.toString() : null,
        isAmoblado: data.isAmoblado,
        amenities: data.amenities,
        images: data.images,
        externalUrl: url,
        idUsuarioWhatsapp: ownerId,
        rawText: `Ingesta masiva via link: ${url}`
      };

      const [saved] = await db.insert(properties).values(propertyData).returning();
      console.log(`[SUCCESS] Guardado ID: ${saved.id} - ${saved.name} ($${saved.price})`);

      // Opcional: Buscar matches de inmediato (esto no enviará mensaje al grupo porque el bot no está inicializado en modo escucha)
      const matches = await findMatchesForProperty(saved.id);
      if (matches.length > 0) {
        console.log(`[MATCH] ¡Se encontraron ${matches.length} matches para este inmueble!`);
      }

    } catch (e) {
      console.error(`[ERROR] Fallo en ${url}:`, e);
    }
  }
}

async function run() {
  await ingest(LINKS_ADRIANA, ADRIANA_ID);
  await ingest(LINKS_DIEGO, DIEGO_ID);
  console.log('\n✅ Ingesta masiva completada.');
  process.exit(0);
}

run();
