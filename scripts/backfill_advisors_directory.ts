import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { advisors, properties, requirements, users } from "../drizzle/schema";
import { eq, or, sql } from "drizzle-orm";
import { extractColombianPhoneFromText, isGenericName, normalizeAdvisorPhone, isLidIdentifier } from "../server/_core/advisors";

async function runBackfill() {
  console.log("================================================================================");
  console.log("🏛️ VECY DIRECTORY CORE — BACKFILL Y CONSOLIDACIÓN MAESTRA DE ASESORES (v31.89)");
  console.log("================================================================================");

  const db = await getDb();
  if (!db) {
    console.error("❌ Base de datos no disponible.");
    process.exit(1);
  }

  // 1. Extraer todas las ofertas, demandas y usuarios de la base de datos
  console.log("⏳ Consultando registros históricos...");
  const allProps = await db.select({
    id: properties.id,
    phone: properties.idUsuarioWhatsapp,
    name: properties.nombreUsuarioWhatsapp,
    rawText: properties.rawText,
    description: properties.description,
    group: properties.origenNombre,
  }).from(properties);

  const allReqs = await db.select({
    id: requirements.id,
    phone: requirements.idUsuarioWhatsapp,
    name: requirements.nombreUsuarioWhatsapp,
    rawText: requirements.rawText,
    group: requirements.origenNombre,
  }).from(requirements);

  const allUsers = await db.select({
    id: users.id,
    openId: users.openId,
    phone: users.phone,
    name: users.name,
  }).from(users);

  console.log(`📊 Total en BD: ${allProps.length} Ofertas | ${allReqs.length} Demandas | ${allUsers.length} Usuarios`);

  // 2. Mapa consolidado de asesores por Teléfono Canónico (573XXXXXXXXX)
  interface AdvisorAggregate {
    phone: string;
    names: Set<string>;
    bestName: string | null;
    lids: Set<string>;
    groups: Set<string>;
  }

  const advisorsByPhone = new Map<string, AdvisorAggregate>();

  function registerContact(rawPhone: string | null | undefined, name: string | null | undefined, associatedLid: string | null | undefined, group: string | null | undefined) {
    const cleanPhone = normalizeAdvisorPhone(rawPhone);
    if (!cleanPhone) return;

    let agg = advisorsByPhone.get(cleanPhone);
    if (!agg) {
      agg = {
        phone: cleanPhone,
        names: new Set(),
        bestName: null,
        lids: new Set(),
        groups: new Set(),
      };
      advisorsByPhone.set(cleanPhone, agg);
    }

    if (name && !isGenericName(name)) {
      const trimmed = name.trim();
      agg.names.add(trimmed);
      if (!agg.bestName || trimmed.length > agg.bestName.length) {
        agg.bestName = trimmed;
      }
    }

    if (associatedLid && isLidIdentifier(associatedLid)) {
      const cleanLid = associatedLid.split('@')[0].replace(/\D/g, '');
      if (cleanLid) agg.lids.add(cleanLid);
    }

    if (group && group.trim() !== '') {
      agg.groups.add(group.trim());
    }
  }

  // 2.1 Procesar usuarios registrados
  for (const u of allUsers) {
    const p = normalizeAdvisorPhone(u.phone);
    if (p) {
      registerContact(p, u.name, null, null);
    }
  }

  // 2.2 Procesar Ofertas (Properties)
  for (const p of allProps) {
    const directPhone = normalizeAdvisorPhone(p.phone);
    const isLid = isLidIdentifier(p.phone);
    const lidVal = isLid ? p.phone : null;

    // Teléfono explícito directo
    if (directPhone) {
      registerContact(directPhone, p.name, null, p.group);
    }

    // Teléfono extraído del texto
    const textPhone = extractColombianPhoneFromText(`${p.rawText || ''} ${p.description || ''}`);
    if (textPhone) {
      registerContact(textPhone, p.name, lidVal, p.group);
    }
  }

  // 2.3 Procesar Demandas (Requirements)
  for (const r of allReqs) {
    const directPhone = normalizeAdvisorPhone(r.phone);
    const isLid = isLidIdentifier(r.phone);
    const lidVal = isLid ? r.phone : null;

    if (directPhone) {
      registerContact(directPhone, r.name, null, r.group);
    }

    const textPhone = extractColombianPhoneFromText(r.rawText);
    if (textPhone) {
      registerContact(textPhone, r.name, lidVal, r.group);
    }
  }

  // 2.4 Mapeo cruzado de LIDs por nombre verificado
  const nameToPhoneMap = new Map<string, string>();
  for (const [phone, agg] of advisorsByPhone.entries()) {
    for (const n of agg.names) {
      nameToPhoneMap.set(n.toLowerCase(), phone);
    }
  }

  for (const item of [...allProps, ...allReqs]) {
    if (item.name && !isGenericName(item.name)) {
      const lower = item.name.trim().toLowerCase();
      const matchedPhone = nameToPhoneMap.get(lower);
      if (matchedPhone && isLidIdentifier(item.phone)) {
        const cleanLid = item.phone!.split('@')[0].replace(/\D/g, '');
        if (cleanLid) {
          advisorsByPhone.get(matchedPhone)?.lids.add(cleanLid);
        }
      }
    }
  }

  console.log(`📋 Total asesores identificados para consolidar en PostgreSQL: ${advisorsByPhone.size}`);

  // 3. Upsert masivo en tabla PostgreSQL `advisors`
  let insertedCount = 0;
  let updatedCount = 0;

  for (const [phone, agg] of advisorsByPhone.entries()) {
    const effectiveName = agg.bestName || `Asesor +${phone}`;
    const lidsArray = Array.from(agg.lids);
    const aliasesArray = Array.from(agg.names);
    const primaryGroup = Array.from(agg.groups)[0] || null;

    try {
      const existing = await db
        .select()
        .from(advisors)
        .where(eq(advisors.normalizedPhone, phone))
        .limit(1)
        .then(r => r[0]);

      if (existing) {
        const mergedLids = Array.from(new Set([...(existing.whatsappLids || []), ...lidsArray]));
        const mergedAliases = Array.from(new Set([...(existing.aliases || []), ...aliasesArray]));
        const newName = (isGenericName(existing.name) && agg.bestName) ? agg.bestName : existing.name;

        await db
          .update(advisors)
          .set({
            name: newName,
            whatsappLids: mergedLids,
            aliases: mergedAliases,
            sourceGroup: existing.sourceGroup || primaryGroup,
            updatedAt: new Date(),
          })
          .where(eq(advisors.id, existing.id));

        updatedCount++;
      } else {
        await db.insert(advisors).values({
          name: effectiveName,
          phone: phone,
          normalizedPhone: phone,
          whatsappLids: lidsArray,
          aliases: aliasesArray,
          sourceGroup: primaryGroup,
        });

        insertedCount++;
      }
    } catch (insErr: any) {
      console.warn(`[Backfill] Error con asesor ${phone}:`, insErr?.message);
    }
  }

  console.log(`✅ Tabla advisors: ${insertedCount} insertados | ${updatedCount} actualizados.`);

  // 4. Sincronización en cascada a `properties`
  console.log("⏳ Propagando teléfonos y nombres verificados a publicaciones en properties...");
  let propsFixed = 0;
  for (const [phone, agg] of advisorsByPhone.entries()) {
    const lidsList = Array.from(agg.lids);
    const namesList = Array.from(agg.names);
    const validName = agg.bestName;

    // Actualizar propiedades que tienen los LIDs asociados
    if (lidsList.length > 0) {
      for (const lid of lidsList) {
        const res = await db
          .update(properties)
          .set({
            idUsuarioWhatsapp: phone,
            nombreUsuarioWhatsapp: validName || undefined,
          })
          .where(or(
            eq(properties.idUsuarioWhatsapp, lid),
            eq(properties.idUsuarioWhatsapp, `${lid}@lid`),
            eq(properties.idUsuarioWhatsapp, `${lid}@s.whatsapp.net`)
          ))
          .returning({ id: properties.id });
        propsFixed += res.length;
      }
    }

    // Actualizar propiedades con nombres coincidentes que tenían LID o teléfono vacío
    if (validName) {
      const res = await db
        .update(properties)
        .set({
          idUsuarioWhatsapp: phone,
          nombreUsuarioWhatsapp: validName,
        })
        .where(sql`LOWER(${properties.nombreUsuarioWhatsapp}) = LOWER(${validName}) AND (${properties.idUsuarioWhatsapp} IS NULL OR ${properties.idUsuarioWhatsapp} = '' OR ${properties.idUsuarioWhatsapp} ~ '^[0-9]{13,}$' OR ${properties.idUsuarioWhatsapp} LIKE '%@lid')`)
        .returning({ id: properties.id });
      propsFixed += res.length;
    }
  }
  console.log(`✅ Propiedades actualizadas con teléfono de asesor: ${propsFixed}`);

  // 5. Sincronización en cascada a `requirements`
  console.log("⏳ Propagando teléfonos y nombres verificados a publicaciones en requirements...");
  let reqsFixed = 0;
  for (const [phone, agg] of advisorsByPhone.entries()) {
    const lidsList = Array.from(agg.lids);
    const validName = agg.bestName;

    if (lidsList.length > 0) {
      for (const lid of lidsList) {
        const res = await db
          .update(requirements)
          .set({
            idUsuarioWhatsapp: phone,
            nombreUsuarioWhatsapp: validName || undefined,
          })
          .where(or(
            eq(requirements.idUsuarioWhatsapp, lid),
            eq(requirements.idUsuarioWhatsapp, `${lid}@lid`),
            eq(requirements.idUsuarioWhatsapp, `${lid}@s.whatsapp.net`)
          ))
          .returning({ id: requirements.id });
        reqsFixed += res.length;
      }
    }

    if (validName) {
      const res = await db
        .update(requirements)
        .set({
          idUsuarioWhatsapp: phone,
          nombreUsuarioWhatsapp: validName,
        })
        .where(sql`LOWER(${requirements.nombreUsuarioWhatsapp}) = LOWER(${validName}) AND (${requirements.idUsuarioWhatsapp} IS NULL OR ${requirements.idUsuarioWhatsapp} = '' OR ${requirements.idUsuarioWhatsapp} ~ '^[0-9]{13,}$' OR ${requirements.idUsuarioWhatsapp} LIKE '%@lid')`)
        .returning({ id: requirements.id });
      reqsFixed += res.length;
    }
  }
  console.log(`✅ Requerimientos actualizados con teléfono de asesor: ${reqsFixed}`);

  console.log("================================================================================");
  console.log("🎉 BACKFILL Y CONSOLIDACIÓN MAESTRA DE ASESORES FINALIZADO CON ÉXITO.");
  console.log("================================================================================");
}

runBackfill()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error en backfill:", err);
    process.exit(1);
  });
