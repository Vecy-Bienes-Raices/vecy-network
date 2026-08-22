/**
 * SCRIPT MAESTRO DE PROPAGACIÓN Y AUTO-APRENDIZAJE DE TELÉFONOS DE BROKERS v25.2
 * 
 * Recorre todas las propiedades y requerimientos en Supabase.
 * Para cada remitente (broker) que tenga un teléfono real en al menos una publicación,
 * propaga ese teléfono a TODAS sus demás publicaciones (ofertas y demandas) que aún
 * tengan LIDs anónimos o teléfonos vacíos.
 */

import 'dotenv/config';
import { getDb } from '../db';
import { properties, requirements } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { extractColombianPhoneFromText, isGenericName } from '../_core/janIA';

async function propagateAllBrokerPhones() {
  const db = await getDb();
  if (!db) {
    console.error('❌ Error: No hay conexión a base de datos.');
    process.exit(1);
  }

  console.log('🚀 Iniciando escaneo y propagación universal de teléfonos de brokers...');

  // 1. Cargar todas las propiedades y requerimientos
  const allProps = await db.select().from(properties);
  const allReqs = await db.select().from(requirements);

  console.log(`📊 Analizando ${allProps.length} propiedades y ${allReqs.length} requerimientos...`);

  // 2. Construir el Directorio Maestro de Teléfonos por Nombre y por LID
  // Mapa: nombreNormalizado -> teléfonoReal
  const phoneByName = new Map<string, string>();
  // Mapa: lid -> teléfonoReal
  const phoneByLid = new Map<string, string>();

  function registerKnownPhone(name: string | null | undefined, phone: string | null | undefined, rawText?: string | null) {
    let cleanPhone: string | null = null;

    // Intentar extraer de rawText
    const fromText = extractColombianPhoneFromText(rawText);
    if (fromText) {
      cleanPhone = fromText;
    } else if (phone) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length === 10 && digits.startsWith('3')) {
        cleanPhone = '57' + digits;
      } else if (digits.length === 12 && digits.startsWith('573')) {
        cleanPhone = digits;
      }
    }

    if (cleanPhone) {
      if (name && !isGenericName(name) && name.trim().length > 3) {
        phoneByName.set(name.trim().toLowerCase(), cleanPhone);
      }
      if (phone && (phone.length > 12 || phone.startsWith('1203'))) {
        phoneByLid.set(phone, cleanPhone);
      }
    }
  }

  // Escanear publicaciones para construir el directorio
  for (const p of allProps) {
    registerKnownPhone(p.nombreUsuarioWhatsapp, p.idUsuarioWhatsapp, p.rawText);
  }
  for (const r of allReqs) {
    registerKnownPhone(r.nombreUsuarioWhatsapp, r.idUsuarioWhatsapp, r.rawText);
  }

  console.log(`📋 Directorio maestro construido con ${phoneByName.size} brokers y ${phoneByLid.size} LIDs vinculados a números reales.`);
  for (const [name, phone] of phoneByName.entries()) {
    console.log(`   👤 ${name} -> 📞 +${phone}`);
  }

  // 3. Propagar a PROPIEDADES que tengan LID o falten de teléfono
  let updatedPropsCount = 0;
  for (const p of allProps) {
    const isLid = p.idUsuarioWhatsapp && (p.idUsuarioWhatsapp.length > 12 || p.idUsuarioWhatsapp.startsWith('1203'));
    const isMissingPhone = !p.idUsuarioWhatsapp || isLid;

    let realPhoneToAssign: string | null = null;
    if (p.nombreUsuarioWhatsapp && phoneByName.has(p.nombreUsuarioWhatsapp.trim().toLowerCase())) {
      realPhoneToAssign = phoneByName.get(p.nombreUsuarioWhatsapp.trim().toLowerCase())!;
    } else if (p.idUsuarioWhatsapp && phoneByLid.has(p.idUsuarioWhatsapp)) {
      realPhoneToAssign = phoneByLid.get(p.idUsuarioWhatsapp)!;
    }

    if (realPhoneToAssign && isMissingPhone && p.idUsuarioWhatsapp !== realPhoneToAssign) {
      await db.update(properties).set({ idUsuarioWhatsapp: realPhoneToAssign }).where(eq(properties.id, p.id));
      console.log(`   🏠 Propiedad #${p.id} (${p.nombreUsuarioWhatsapp || 'Sin Nombre'}) actualizada con 📞 +${realPhoneToAssign}`);
      updatedPropsCount++;
    }
  }

  // 4. Propagar a REQUERIMIENTOS que tengan LID o falten de teléfono
  let updatedReqsCount = 0;
  for (const r of allReqs) {
    const isLid = r.idUsuarioWhatsapp && (r.idUsuarioWhatsapp.length > 12 || r.idUsuarioWhatsapp.startsWith('1203'));
    const isMissingPhone = !r.idUsuarioWhatsapp || isLid;

    let realPhoneToAssign: string | null = null;
    if (r.nombreUsuarioWhatsapp && phoneByName.has(r.nombreUsuarioWhatsapp.trim().toLowerCase())) {
      realPhoneToAssign = phoneByName.get(r.nombreUsuarioWhatsapp.trim().toLowerCase())!;
    } else if (r.idUsuarioWhatsapp && phoneByLid.has(r.idUsuarioWhatsapp)) {
      realPhoneToAssign = phoneByLid.get(r.idUsuarioWhatsapp)!;
    }

    if (realPhoneToAssign && isMissingPhone && r.idUsuarioWhatsapp !== realPhoneToAssign) {
      await db.update(requirements).set({ idUsuarioWhatsapp: realPhoneToAssign }).where(eq(requirements.id, r.id));
      console.log(`   📋 Requerimiento #${r.id} (${r.nombreUsuarioWhatsapp || 'Sin Nombre'}) actualizado con 📞 +${realPhoneToAssign}`);
      updatedReqsCount++;
    }
  }

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`✨ PROPAGACIÓN COMPLETADA CON ÉXITO:`);
  console.log(`   🏠 Propiedades enriquecidas con teléfono real   : ${updatedPropsCount}`);
  console.log(`   📋 Requerimientos enriquecidos con teléfono real: ${updatedReqsCount}`);
  console.log('═══════════════════════════════════════════════════════════════════');
}

propagateAllBrokerPhones()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error en propagación:', err);
    process.exit(1);
  });
