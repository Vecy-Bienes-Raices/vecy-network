import { getDb } from '../server/db';
import { properties } from '../drizzle/schema';
import { eq, isNull } from 'drizzle-orm';
import { esDominioPermitido, extractPortalAndListingId } from '../server/_core/scraper';
import { extractColombianPhoneFromText } from '../server/_core/janIA';

async function healProperties() {
  const db = await getDb();
  if (!db) {
    console.error("Database unavailable");
    process.exit(1);
  }

  console.log("=== INICIANDO SANEAMIENTO DE PROPIEDADES Y ENLACES ===");

  // 1. Curar específicamente la propiedad #2527 (Chicó Alto - La Raqueta)
  const [prop2527] = await db.select().from(properties).where(eq(properties.id, 2527));
  if (prop2527) {
    console.log("-> Encontrada propiedad 2527:", prop2527.name);
    let cleanedRawText = (prop2527.rawText || "").replace(/__is_sub_message__/g, "").trim();
    if (!cleanedRawText.includes("10295048")) {
      cleanedRawText += `\n\nCONTACTO: https://api.whatsapp.com/send?phone=573187755390\nInfo y galería acá:\nhttps://info.wasi.co/apartamento-venta-chico-alto-bogota-dc/10295048`;
    }

    const wasiUrl = 'https://info.wasi.co/apartamento-venta-chico-alto-bogota-dc/10295048';
    const portalInfo = extractPortalAndListingId(wasiUrl);

    await db.update(properties).set({
      externalUrl: wasiUrl,
      enlaceOrigen: wasiUrl,
      idUsuarioWhatsapp: '573187755390',
      portal: portalInfo.portal || 'Wasi',
      externalListingId: portalInfo.listingId || '10295048',
      canonicalExternalId: portalInfo.canonicalExternalId || 'WASI:10295048',
      rawText: cleanedRawText,
      updatedAt: new Date(),
    }).where(eq(properties.id, 2527));

    console.log("✅ Propiedad #2527 actualizada con éxito (enlace Wasi, teléfono 573187755390 y texto limpio).");
  } else {
    console.warn("⚠️ Propiedad #2527 no encontrada.");
  }

  // 2. Curar la propiedad #2344 (la publicación previa del 3 de Septiembre que había quedado partida con 2345)
  const [prop2344] = await db.select().from(properties).where(eq(properties.id, 2344));
  if (prop2344 && !prop2344.externalUrl) {
    const wasiUrl2344 = 'https://info.wasi.co/apartamento-venta-chico-alto-bogota-dc/10295048';
    const portalInfo = extractPortalAndListingId(wasiUrl2344);
    try {
      await db.update(properties).set({
        externalUrl: wasiUrl2344,
        enlaceOrigen: wasiUrl2344,
        idUsuarioWhatsapp: '573187755390',
        portal: portalInfo.portal || 'Wasi',
        rawText: (prop2344.rawText || "").replace(/__is_sub_message__/g, "").trim(),
        updatedAt: new Date(),
      }).where(eq(properties.id, 2344));
      console.log("✅ Propiedad #2344 (versión anterior de La Raqueta) sanada con su enlace de Wasi.");
    } catch (err: any) {
      console.log("ℹ️ Propiedad #2344 ya referenciada o actualizada.");
    }
  }

  // 3. Escaneo pasivo de todas las propiedades donde externalUrl IS NULL pero rawText contiene enlaces
  console.log("-> Escaneando propiedades con externalUrl NULL...");
  const nullProps = await db.select({
    id: properties.id,
    name: properties.name,
    rawText: properties.rawText,
    idUsuarioWhatsapp: properties.idUsuarioWhatsapp,
  }).from(properties).where(isNull(properties.externalUrl));

  console.log(`-> Analizando ${nullProps.length} propiedades sin externalUrl...`);

  let recoveredCount = 0;
  let phoneFixedCount = 0;

  for (const p of nullProps) {
    if (!p.rawText) continue;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = p.rawText.match(urlRegex);
    let targetUrl: string | undefined = undefined;
    if (matches && matches.length > 0) {
      targetUrl = matches.find(u => esDominioPermitido(u));
    }

    const updates: Record<string, any> = {};

    if (targetUrl) {
      const pInfo = extractPortalAndListingId(targetUrl);
      updates.externalUrl = targetUrl;
      updates.enlaceOrigen = targetUrl;
      if (pInfo.portal) updates.portal = pInfo.portal;
      if (pInfo.listingId) updates.externalListingId = pInfo.listingId;
      if (pInfo.canonicalExternalId) updates.canonicalExternalId = pInfo.canonicalExternalId;
      recoveredCount++;
    }

    // Si el teléfono guardado es un LID o no es celular colombiano válido, intentar extraerlo del rawText
    const currentPhone = p.idUsuarioWhatsapp?.split('@')[0] || '';
    const isLid = currentPhone.length > 13 || currentPhone.startsWith('1203') || currentPhone.startsWith('63');
    if (isLid || !currentPhone.startsWith('573')) {
      const extractedPhone = extractColombianPhoneFromText(p.rawText);
      if (extractedPhone && extractedPhone.startsWith('573') && extractedPhone !== '573192919978') {
        updates.idUsuarioWhatsapp = extractedPhone;
        phoneFixedCount++;
      }
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      try {
        await db.update(properties).set(updates).where(eq(properties.id, p.id));
        console.log(`   [Reparado] Propiedad #${p.id} (${p.name}):`, Object.keys(updates).join(', '));
      } catch (err: any) {
        if (err.message?.includes('canonical_external_id') || err.code === '23505') {
          // Si colisiona el canonicalExternalId, actualizar solo externalUrl y teléfono
          delete updates.canonicalExternalId;
          delete updates.externalListingId;
          await db.update(properties).set(updates).where(eq(properties.id, p.id));
          console.log(`   [Reparado sin canonical] Propiedad #${p.id} (${p.name}):`, Object.keys(updates).join(', '));
        } else {
          console.warn(`   [Error actualizando #${p.id}]:`, err.message);
        }
      }
    }
  }

  console.log(`\n=== SANEAMIENTO COMPLETADO ===`);
  console.log(`🔗 Enlaces recuperados: ${recoveredCount}`);
  console.log(`📞 Teléfonos de asesores corregidos: ${phoneFixedCount}`);

  process.exit(0);
}

healProperties().catch(err => {
  console.error("Error en saneamiento:", err);
  process.exit(1);
});
