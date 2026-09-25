import { getDb } from '../db';
import { advisors, properties, requirements, users } from '../../drizzle/schema';
import { and, eq, or, sql } from 'drizzle-orm';

// ── DIRECTORIO GLOBAL DE BROKERS Y RESOLUCIÓN INTELIGENTE EN MEMORIA ──
export const brokerDirectoryCache = new Map<string, { phone: string; name?: string }>();

/**
 * Determina si un nombre es genérico o placeholder en lugar de un nombre real.
 */
export function isGenericName(n: string | null | undefined): boolean {
  if (!n) return true;
  const lower = n.toLowerCase().trim();
  return lower.startsWith("asesor +") || 
         lower.startsWith("cliente +") || 
         lower.startsWith("broker +") || 
         lower.startsWith("captador +") || 
         lower === "asesor" || 
         lower === "nuevo asesor" || 
         lower === "colega" || 
         lower === "sin nombre" || 
         lower === "desconocido" || 
         lower === "";
}

/**
 * Extrae un número celular colombiano canónico (573XXXXXXXXX) desde texto no estructurado.
 */
export function extractColombianPhoneFromText(text: string | null | undefined): string | null {
  if (!text) return null;
  const clean = text.replace(/[\u2060\u200B\u200C\u200D\uFEFF\u00A0]/g, ' ');

  // 1. Enlaces directos wa.me y api.whatsapp.com
  const waMatch = clean.match(/(?:wa\.me\/|api\.whatsapp\.com\/send\/?\?(?:[^&\s]*&)*phone=)(?:\+?57)?(3\d{9})/i);
  if (waMatch) {
    const p = waMatch[1];
    if (p !== '3192919978') return '57' + p;
  }

  // 2. Prefijos explícitos de contacto (Tel, Cel, WhatsApp, Inf, Contacto, Asesor, etc.)
  const contactMatch = clean.match(/(?:tel[eé]fono|tel|celular|cel|whatsapp|wapp|wa|contacto|llamar|inf|info|informaci[oó]n|asesor|escribir|comunicarse|m[oó]vil)\s*:?\s*(?:\+?57\s*)?(3[\d\s.\-]{8,14})/i);
  if (contactMatch) {
    const digits = contactMatch[1].replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('3') && digits !== '3192919978') {
      return '57' + digits;
    }
  }

  // 3. Patrón genérico celular Colombia (3xx xxx xxxx) validando que no sea precio ni área
  const genericMatches = clean.matchAll(/(?:\+?57\s*)?(3\d{2}[\s.\-]?\d{3}[\s.\-]?\d{4})\b/g);
  for (const m of genericMatches) {
    const digits = m[1].replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('3') && digits !== '3192919978') {
      const idx = m.index ?? 0;
      const before = clean.substring(Math.max(0, idx - 15), idx).toLowerCase();
      const after = clean.substring(idx + m[0].length, idx + m[0].length + 15).toLowerCase();
      
      if (before.includes('$') || before.includes('precio') || before.includes('canon') || before.includes('ppto') || before.includes('presupuesto')) {
        continue;
      }
      if (after.includes('millon') || after.includes('mil') || after.includes('m2') || after.includes('mts') || after.includes('pesos')) {
        continue;
      }
      return '57' + digits;
    }
  }
  return null;
}

/**
 * Normaliza un número de teléfono a formato canónico (ej: 573101234567).
 * Rechaza números oficiales de JanIA (+573192919978) y LIDs de WhatsApp.
 */
export function normalizeAdvisorPhone(val?: string | null): string | null {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (trimmed.includes('@') && !trimmed.endsWith('@s.whatsapp.net')) {
    // Si es un JID que no es de usuario directo (ej: @g.us o @lid)
    if (trimmed.includes('@lid') || trimmed.includes('@g.us')) return null;
  }

  const digits = trimmed.split('@')[0].replace(/\D/g, '');

  // ⛔ EXCLUSIÓN ABSOLUTA: Número oficial del socket JanIA Bot (Baileys VPS)
  if (digits === '573192919978' || digits === '3192919978') {
    return null;
  }

  // Rechazar LIDs o identificadores de grupo (> 13 dígitos o empieza por 11 / 1203)
  if (digits.length > 13 || digits.startsWith('11') || digits.startsWith('1203')) {
    return null;
  }

  // Celular Colombia 10 dígitos (3XXXXXXXXX) -> 573XXXXXXXXX
  if (digits.length === 10 && digits.startsWith('3')) {
    return `57${digits}`;
  }

  // Celular Colombia 12 dígitos (573XXXXXXXXX)
  if (digits.length === 12 && digits.startsWith('573')) {
    return digits;
  }

  // Teléfono fijo Colombia o internacional válido (10-12 dígitos)
  if (digits.length >= 10 && digits.length <= 12) {
    return digits;
  }

  return null;
}

/**
 * Determina si una cadena es un LID o identificador interno de WhatsApp
 */
export function isLidIdentifier(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  const clean = val.split('@')[0].replace(/\D/g, '');
  return clean.length > 13 || clean.startsWith('11') || clean.startsWith('1203') || val.includes('@lid');
}

/**
 * Consulta sincrónica ultrarrápida (0ms) en el caché en memoria de asesores.
 */
export function lookupAdvisorSync(phoneOrLid?: string | null, name?: string | null): { phone: string; name?: string } | null {
  if (phoneOrLid) {
    const cleanDigits = phoneOrLid.split('@')[0].replace(/\D/g, '');
    const found = brokerDirectoryCache.get(cleanDigits) || brokerDirectoryCache.get(phoneOrLid);
    if (found && found.phone) return found;
  }
  if (name && !isGenericName(name)) {
    const trimmed = name.trim();
    const found = brokerDirectoryCache.get(trimmed.toLowerCase()) || brokerDirectoryCache.get(trimmed);
    if (found && found.phone) return found;
  }
  return null;
}

/**
 * Preserva el contacto verificado de un asesor contra sobreescritura accidental
 * por LIDs de WhatsApp o nombres genéricos en republicaciones y deduplicación.
 */
export function preserveVerifiedAdvisorContact(
  existingPhone: string | null | undefined,
  existingName: string | null | undefined,
  incomingPhone: string | null | undefined,
  incomingName: string | null | undefined
): { effectivePhone: string | null; effectiveName: string | null } {
  const normExisting = normalizeAdvisorPhone(existingPhone);
  const normIncoming = normalizeAdvisorPhone(incomingPhone);

  // 1. Teléfono: Si el existente es real y el entrante es LID/nulo, PRESERVAR EL EXISTENTE
  let effectivePhone = normIncoming || incomingPhone || null;
  let knownAdvisorName: string | null = null;
  if (normExisting && (!normIncoming || isLidIdentifier(incomingPhone))) {
    effectivePhone = normExisting;
    // Asociar en segundo plano el LID entrante con el teléfono verificado
    if (incomingPhone && isLidIdentifier(incomingPhone)) {
      saveOrUpdateAdvisor({
        phone: normExisting,
        name: existingName || incomingName,
        oldPhoneOrLid: incomingPhone,
      }).catch(() => {});
    }
  } else if (!normIncoming && incomingPhone && isLidIdentifier(incomingPhone)) {
    // Si no tenemos entrante real, buscar si el LID ya pertenece a un asesor registrado
    const known = lookupAdvisorSync(incomingPhone);
    if (known && known.phone) {
      effectivePhone = known.phone;
      if (known.name && !isGenericName(known.name)) {
        knownAdvisorName = known.name;
      }
    }
  }

  // 2. Nombre: Si el existente es real (no genérico) y el entrante es genérico/vacío, PRESERVAR EL EXISTENTE
  let effectiveName = incomingName || null;
  const isExistingGoodName = existingName && !isGenericName(existingName);
  const isIncomingGoodName = incomingName && !isGenericName(incomingName);

  if (isExistingGoodName && !isIncomingGoodName) {
    effectiveName = existingName.trim();
  } else if (isIncomingGoodName) {
    effectiveName = incomingName.trim();
  } else if (knownAdvisorName) {
    effectiveName = knownAdvisorName;
  } else if (effectivePhone) {
    const known = lookupAdvisorSync(effectivePhone);
    if (known?.name && !isGenericName(known.name)) {
      effectiveName = known.name;
    }
  }

  return { effectivePhone, effectiveName };
}

/**
 * Guarda o actualiza permanentemente un Asesor en la tabla PostgreSQL `advisors`,
 * sincroniza la tabla `users`, propaga en cascada a `properties` y `requirements`,
 * y alimenta el caché de directorio en memoria para que JAMÁS se pierda el dato.
 */
export async function saveOrUpdateAdvisor(params: {
  name?: string | null;
  phone?: string | null;
  oldPhoneOrLid?: string | null;
  sourceGroup?: string | null;
  agency?: string | null;
  notes?: string | null;
}): Promise<{
  success: boolean;
  advisorId?: number;
  cleanPhone: string | null;
  validName: string | null;
  updatedProps: number;
  updatedReqs: number;
}> {
  const { name, phone, oldPhoneOrLid, sourceGroup, agency, notes } = params;

  const cleanPhone = normalizeAdvisorPhone(phone) || (oldPhoneOrLid ? normalizeAdvisorPhone(oldPhoneOrLid) : null);
  const validName = name && !isGenericName(name) ? name.trim() : null;

  if (!cleanPhone && !validName) {
    return { success: false, cleanPhone: null, validName: null, updatedProps: 0, updatedReqs: 0 };
  }

  const db = await getDb();
  if (!db) {
    return { success: false, cleanPhone, validName, updatedProps: 0, updatedReqs: 0 };
  }

  let advisorId: number | undefined;
  const extractedLid = oldPhoneOrLid && isLidIdentifier(oldPhoneOrLid) ? oldPhoneOrLid.split('@')[0].replace(/\D/g, '') : null;

  // ── 1. REGISTRO PERMANENTE EN TABLA `advisors` (PostgreSQL) ──
  try {
    if (cleanPhone) {
      // Buscar si ya existe por normalizedPhone
      const existing = await db
        .select()
        .from(advisors)
        .where(eq(advisors.normalizedPhone, cleanPhone))
        .limit(1)
        .then(r => r[0]);

      if (existing) {
        advisorId = existing.id;
        const currentLids = Array.isArray(existing.whatsappLids) ? existing.whatsappLids : [];
        const currentAliases = Array.isArray(existing.aliases) ? existing.aliases : [];

        const newLids = [...currentLids];
        if (extractedLid && !newLids.includes(extractedLid)) {
          newLids.push(extractedLid);
        }

        const newAliases = [...currentAliases];
        if (validName && !newAliases.some(a => a.toLowerCase() === validName.toLowerCase())) {
          newAliases.push(validName);
        }

        const updates: Record<string, any> = {
          updatedAt: new Date(),
          whatsappLids: newLids,
          aliases: newAliases,
        };

        if (validName && (isGenericName(existing.name) || validName.length > existing.name.length)) {
          updates.name = validName;
        }
        if (sourceGroup && (!existing.sourceGroup || existing.sourceGroup.trim() === '')) {
          updates.sourceGroup = sourceGroup.trim();
        }
        if (agency && (!existing.agency || existing.agency.trim() === '')) {
          updates.agency = agency.trim();
        }
        if (notes) {
          updates.notes = existing.notes ? `${existing.notes}\n${notes}` : notes;
        }

        await db.update(advisors).set(updates).where(eq(advisors.id, existing.id));
      } else {
        // Si no existe por teléfono, verificar si existe por nombre exacto
        let existingByName: any = null;
        if (validName) {
          existingByName = await db
            .select()
            .from(advisors)
            .where(sql`LOWER(${advisors.name}) = LOWER(${validName})`)
            .limit(1)
            .then(r => r[0]);
        }

        if (existingByName) {
          advisorId = existingByName.id;
          const currentLids = Array.isArray(existingByName.whatsappLids) ? existingByName.whatsappLids : [];
          const newLids = [...currentLids];
          if (extractedLid && !newLids.includes(extractedLid)) {
            newLids.push(extractedLid);
          }

          await db
            .update(advisors)
            .set({
              phone: cleanPhone,
              normalizedPhone: cleanPhone,
              whatsappLids: newLids,
              sourceGroup: sourceGroup?.trim() || existingByName.sourceGroup,
              agency: agency?.trim() || existingByName.agency,
              updatedAt: new Date(),
            })
            .where(eq(advisors.id, existingByName.id));
        } else {
          // Insertar nuevo registro oficial de Asesor
          const initialLids = extractedLid ? [extractedLid] : [];
          const initialAliases = validName ? [validName] : [];

          const [inserted] = await db
            .insert(advisors)
            .values({
              name: validName || `Asesor +${cleanPhone}`,
              phone: cleanPhone,
              normalizedPhone: cleanPhone,
              whatsappLids: initialLids,
              aliases: initialAliases,
              sourceGroup: sourceGroup?.trim() || null,
              agency: agency?.trim() || null,
              notes: notes?.trim() || null,
            })
            .returning();

          advisorId = inserted.id;
        }
      }
    } else if (validName && extractedLid) {
      // Caso especial: Solo tenemos nombre y LID (sin celular confirmado aún)
      const existing = await db
        .select()
        .from(advisors)
        .where(sql`LOWER(${advisors.name}) = LOWER(${validName})`)
        .limit(1)
        .then(r => r[0]);

      if (existing) {
        advisorId = existing.id;
        const currentLids = Array.isArray(existing.whatsappLids) ? existing.whatsappLids : [];
        if (!currentLids.includes(extractedLid)) {
          await db
            .update(advisors)
            .set({
              whatsappLids: [...currentLids, extractedLid],
              updatedAt: new Date(),
            })
            .where(eq(advisors.id, existing.id));
        }
      }
    }
  } catch (dbErr: any) {
    console.error(`[AdvisorsCore] Error al persistir asesor en tabla advisors:`, dbErr?.message);
  }

  // ── 2. SINCRONIZACIÓN EN TABLA `users` ──
  try {
    if (cleanPhone) {
      const openId = `wa-${cleanPhone}`;
      const existingUser = await db
        .select()
        .from(users)
        .where(or(eq(users.phone, cleanPhone), eq(users.openId, openId)))
        .limit(1)
        .then(r => r[0]);

      if (existingUser) {
        const uUpdates: Record<string, any> = { updatedAt: new Date() };
        if (validName && (isGenericName(existingUser.name) || validName.length > (existingUser.name?.length || 0))) {
          uUpdates.name = validName;
        }
        if (!existingUser.phone || existingUser.phone !== cleanPhone) {
          uUpdates.phone = cleanPhone;
        }
        if (Object.keys(uUpdates).length > 1) {
          await db.update(users).set(uUpdates).where(eq(users.id, existingUser.id));
        }
      } else if (extractedLid) {
        // Verificar si había un usuario con el LID
        const userByLid = await db
          .select()
          .from(users)
          .where(eq(users.openId, `wa-${extractedLid}`))
          .limit(1)
          .then(r => r[0]);

        if (userByLid) {
          await db
            .update(users)
            .set({
              phone: cleanPhone,
              name: validName || userByLid.name,
              updatedAt: new Date(),
            })
            .where(eq(users.id, userByLid.id));
        } else {
          // Crear usuario con el teléfono verificado
          try {
            await db.insert(users).values({
              openId,
              name: validName || `Asesor +${cleanPhone}`,
              phone: cleanPhone,
              role: 'agent',
              loginMethod: 'whatsapp',
            });
          } catch (uInsErr) {
            // Ignorar colisiones concurrentes
          }
        }
      }
    }
  } catch (uErr: any) {
    console.warn(`[AdvisorsCore] Advertencia sincronizando users:`, uErr?.message);
  }

  // ── 3. ACTUALIZACIÓN EN CALIENTE DEL DIRECTORIO EN MEMORIA ──
  const finalEffectiveName = validName || `Asesor +${cleanPhone}`;
  if (cleanPhone) {
    brokerDirectoryCache.set(cleanPhone, { phone: cleanPhone, name: finalEffectiveName });
    if (cleanPhone.startsWith('57') && cleanPhone.length === 12) {
      brokerDirectoryCache.set(cleanPhone.substring(2), { phone: cleanPhone, name: finalEffectiveName });
    }
    if (validName) {
      brokerDirectoryCache.set(validName.toLowerCase(), { phone: cleanPhone, name: validName });
      brokerDirectoryCache.set(validName, { phone: cleanPhone, name: validName });
    }
    if (extractedLid) {
      brokerDirectoryCache.set(extractedLid, { phone: cleanPhone, name: finalEffectiveName });
    }
    if (oldPhoneOrLid && oldPhoneOrLid !== cleanPhone) {
      brokerDirectoryCache.set(oldPhoneOrLid, { phone: cleanPhone, name: finalEffectiveName });
    }
  }

  // ── 4. PROPAGACIÓN EN CASCADA A TODAS LAS PROPIEDADES EN BD (SQL Atómico Ultrarrápido) ──
  let updatedProps = 0;
  let updatedReqs = 0;

  try {
    if (cleanPhone) {
      // A. Si se proporcionó un LID anterior, actualizar todas las propiedades con ese LID
      if (extractedLid) {
        const resLid = await db
          .update(properties)
          .set({
            idUsuarioWhatsapp: cleanPhone,
            ...(validName ? { nombreUsuarioWhatsapp: validName } : {}),
            updatedAt: new Date(),
          })
          .where(or(
            eq(properties.idUsuarioWhatsapp, extractedLid),
            eq(properties.idUsuarioWhatsapp, `${extractedLid}@lid`),
            eq(properties.idUsuarioWhatsapp, `${extractedLid}@s.whatsapp.net`)
          ))
          .returning({ id: properties.id });
        updatedProps += resLid.length;
      }

      // B. Si se proporcionó un teléfono anterior distinto, actualizar
      if (oldPhoneOrLid && oldPhoneOrLid !== cleanPhone && !isLidIdentifier(oldPhoneOrLid)) {
        const resOld = await db
          .update(properties)
          .set({
            idUsuarioWhatsapp: cleanPhone,
            ...(validName ? { nombreUsuarioWhatsapp: validName } : {}),
            updatedAt: new Date(),
          })
          .where(eq(properties.idUsuarioWhatsapp, oldPhoneOrLid))
          .returning({ id: properties.id });
        updatedProps += resOld.length;
      }

      // C. Si se proporcionó un nombre válido, actualizar propiedades con ese nombre que tengan LID o no tengan teléfono
      if (validName) {
        const resName = await db
          .update(properties)
          .set({
            idUsuarioWhatsapp: cleanPhone,
            nombreUsuarioWhatsapp: validName,
            updatedAt: new Date(),
          })
          .where(sql`LOWER(${properties.nombreUsuarioWhatsapp}) = LOWER(${validName}) AND (${properties.idUsuarioWhatsapp} IS NULL OR ${properties.idUsuarioWhatsapp} = '' OR ${properties.idUsuarioWhatsapp} ~ '^[0-9]{13,}$' OR ${properties.idUsuarioWhatsapp} LIKE '%@lid')`)
          .returning({ id: properties.id });
        updatedProps += resName.length;
      }

      // D. Si hay propiedades con este teléfono pero con nombre genérico o vacío, asignar el nombre válido
      if (validName) {
        await db
          .update(properties)
          .set({
            nombreUsuarioWhatsapp: validName,
            updatedAt: new Date(),
          })
          .where(and(
            eq(properties.idUsuarioWhatsapp, cleanPhone),
            or(
              sql`${properties.nombreUsuarioWhatsapp} IS NULL`,
              sql`${properties.nombreUsuarioWhatsapp} = ''`,
              sql`LOWER(${properties.nombreUsuarioWhatsapp}) LIKE 'asesor%'`,
              sql`LOWER(${properties.nombreUsuarioWhatsapp}) LIKE 'cliente%'`
            )
          ));
      }
    }
  } catch (propErr: any) {
    console.error(`[AdvisorsCore] Error propagando en properties:`, propErr?.message);
  }

  // ── 5. PROPAGACIÓN EN CASCADA A TODOS LOS REQUERIMIENTOS EN BD (SQL Atómico Ultrarrápido) ──
  try {
    if (cleanPhone) {
      if (extractedLid) {
        const resReqLid = await db
          .update(requirements)
          .set({
            idUsuarioWhatsapp: cleanPhone,
            ...(validName ? { nombreUsuarioWhatsapp: validName } : {}),
            updatedAt: new Date(),
          })
          .where(or(
            eq(requirements.idUsuarioWhatsapp, extractedLid),
            eq(requirements.idUsuarioWhatsapp, `${extractedLid}@lid`),
            eq(requirements.idUsuarioWhatsapp, `${extractedLid}@s.whatsapp.net`)
          ))
          .returning({ id: requirements.id });
        updatedReqs += resReqLid.length;
      }

      if (oldPhoneOrLid && oldPhoneOrLid !== cleanPhone && !isLidIdentifier(oldPhoneOrLid)) {
        const resReqOld = await db
          .update(requirements)
          .set({
            idUsuarioWhatsapp: cleanPhone,
            ...(validName ? { nombreUsuarioWhatsapp: validName } : {}),
            updatedAt: new Date(),
          })
          .where(eq(requirements.idUsuarioWhatsapp, oldPhoneOrLid))
          .returning({ id: requirements.id });
        updatedReqs += resReqOld.length;
      }

      if (validName) {
        const resReqName = await db
          .update(requirements)
          .set({
            idUsuarioWhatsapp: cleanPhone,
            nombreUsuarioWhatsapp: validName,
            updatedAt: new Date(),
          })
          .where(sql`LOWER(${requirements.nombreUsuarioWhatsapp}) = LOWER(${validName}) AND (${requirements.idUsuarioWhatsapp} IS NULL OR ${requirements.idUsuarioWhatsapp} = '' OR ${requirements.idUsuarioWhatsapp} ~ '^[0-9]{13,}$' OR ${requirements.idUsuarioWhatsapp} LIKE '%@lid')`)
          .returning({ id: requirements.id });
        updatedReqs += resReqName.length;
      }

      if (validName) {
        await db
          .update(requirements)
          .set({
            nombreUsuarioWhatsapp: validName,
            updatedAt: new Date(),
          })
          .where(and(
            eq(requirements.idUsuarioWhatsapp, cleanPhone),
            or(
              sql`${requirements.nombreUsuarioWhatsapp} IS NULL`,
              sql`${requirements.nombreUsuarioWhatsapp} = ''`,
              sql`LOWER(${requirements.nombreUsuarioWhatsapp}) LIKE 'asesor%'`,
              sql`LOWER(${requirements.nombreUsuarioWhatsapp}) LIKE 'cliente%'`
            )
          ));
      }
    }
  } catch (reqErr: any) {
    console.error(`[AdvisorsCore] Error propagando en requirements:`, reqErr?.message);
  }

  console.log(`[AdvisorsCore] 🏛️ Asesor persistido para siempre: ${validName || 'Sin Nombre'} (${cleanPhone || 'Sin Celular'}). Propagado a ${updatedProps} props y ${updatedReqs} reqs.`);

  return {
    success: true,
    advisorId,
    cleanPhone,
    validName,
    updatedProps,
    updatedReqs,
  };
}

/**
 * Realiza una consolidación y backfill masivo de todos los asesores existentes en la base de datos
 * hacia la tabla `advisors`, asociando sus LIDs, alias y propagando sus teléfonos verificados
 * a todas las publicaciones que tenían solo LID o teléfono vacío.
 */
export async function reconcileAndBackfillAdvisors(db: any): Promise<number> {
  console.log(`[JanIA-Advisors] 🏛️ Iniciando consolidación y backfill masivo de asesores en PostgreSQL...`);
  let totalConsolidated = 0;

  try {
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
      phone: users.phone,
      name: users.name,
    }).from(users);

    interface AdvisorAggregate {
      phone: string;
      names: Set<string>;
      bestName: string | null;
      lids: Set<string>;
      groups: Set<string>;
    }

    const advisorsByPhone = new Map<string, AdvisorAggregate>();

    function register(rawPhone: string | null | undefined, name: string | null | undefined, associatedLid: string | null | undefined, group: string | null | undefined) {
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

    for (const u of allUsers) {
      const p = normalizeAdvisorPhone(u.phone);
      if (p) register(p, u.name, null, null);
    }

    for (const p of allProps) {
      const directPhone = normalizeAdvisorPhone(p.phone);
      const isLid = isLidIdentifier(p.phone);
      const lidVal = isLid ? p.phone : null;

      if (directPhone) register(directPhone, p.name, null, p.group);

      const textPhone = extractColombianPhoneFromText(`${p.rawText || ''} ${p.description || ''}`);
      if (textPhone) register(textPhone, p.name, lidVal, p.group);
    }

    for (const r of allReqs) {
      const directPhone = normalizeAdvisorPhone(r.phone);
      const isLid = isLidIdentifier(r.phone);
      const lidVal = isLid ? r.phone : null;

      if (directPhone) register(directPhone, r.name, null, r.group);

      const textPhone = extractColombianPhoneFromText(r.rawText);
      if (textPhone) register(textPhone, r.name, lidVal, r.group);
    }

    // Mapear LIDs por nombres de asesores
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

    // Upsert masivo en tabla `advisors`
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
          .then((r: any) => r[0]);

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
        } else {
          await db.insert(advisors).values({
            name: effectiveName,
            phone: phone,
            normalizedPhone: phone,
            whatsappLids: lidsArray,
            aliases: aliasesArray,
            sourceGroup: primaryGroup,
          });
        }
        totalConsolidated++;
      } catch (e: any) {
        // Ignorar colisiones concurrentes
      }
    }

    // Propagar teléfonos de vuelta a properties con LIDs
    for (const [phone, agg] of advisorsByPhone.entries()) {
      const lidsList = Array.from(agg.lids);
      const validName = agg.bestName;

      if (lidsList.length > 0) {
        for (const lid of lidsList) {
          await db
            .update(properties)
            .set({
              idUsuarioWhatsapp: phone,
              ...(validName ? { nombreUsuarioWhatsapp: validName } : {}),
              updatedAt: new Date(),
            })
            .where(or(
              eq(properties.idUsuarioWhatsapp, lid),
              eq(properties.idUsuarioWhatsapp, `${lid}@lid`),
              eq(properties.idUsuarioWhatsapp, `${lid}@s.whatsapp.net`)
            ));
          await db
            .update(requirements)
            .set({
              idUsuarioWhatsapp: phone,
              ...(validName ? { nombreUsuarioWhatsapp: validName } : {}),
              updatedAt: new Date(),
            })
            .where(or(
              eq(requirements.idUsuarioWhatsapp, lid),
              eq(requirements.idUsuarioWhatsapp, `${lid}@lid`),
              eq(requirements.idUsuarioWhatsapp, `${lid}@s.whatsapp.net`)
            ));
        }
      }

      if (validName) {
        await db
          .update(properties)
          .set({
            idUsuarioWhatsapp: phone,
            nombreUsuarioWhatsapp: validName,
            updatedAt: new Date(),
          })
          .where(sql`LOWER(${properties.nombreUsuarioWhatsapp}) = LOWER(${validName}) AND (${properties.idUsuarioWhatsapp} IS NULL OR ${properties.idUsuarioWhatsapp} = '' OR ${properties.idUsuarioWhatsapp} ~ '^[0-9]{13,}$' OR ${properties.idUsuarioWhatsapp} LIKE '%@lid')`);
        await db
          .update(requirements)
          .set({
            idUsuarioWhatsapp: phone,
            nombreUsuarioWhatsapp: validName,
            updatedAt: new Date(),
          })
          .where(sql`LOWER(${requirements.nombreUsuarioWhatsapp}) = LOWER(${validName}) AND (${requirements.idUsuarioWhatsapp} IS NULL OR ${requirements.idUsuarioWhatsapp} = '' OR ${requirements.idUsuarioWhatsapp} ~ '^[0-9]{13,}$' OR ${requirements.idUsuarioWhatsapp} LIKE '%@lid')`);
      }
    }

    console.log(`[JanIA-Advisors] ✅ Consolidación completada: ${totalConsolidated} asesores guardados en PostgreSQL.`);
  } catch (err: any) {
    console.error(`[JanIA-Advisors] Error durante la consolidación:`, err?.message);
  }

  return totalConsolidated;
}

/**
 * Inicializa y carga en memoria el directorio permanente de asesores desde PostgreSQL al arrancar el servidor.
 * Restaura LIDs, nombres y teléfonos para que ningún reinicio de PM2 borre lo aprendido.
 */
export async function initAdvisorsDirectory(): Promise<number> {
  let loadedCount = 0;
  try {
    const db = await getDb();
    if (!db) return 0;

    // 0. Auto-verificar y crear tabla e índices en PostgreSQL si no existen (Self-healing DDL)
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS advisors (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(50) NOT NULL,
          normalized_phone VARCHAR(50) NOT NULL UNIQUE,
          whatsapp_lids TEXT[] DEFAULT '{}',
          aliases TEXT[] DEFAULT '{}',
          agency VARCHAR(255),
          source_group VARCHAR(255),
          notes TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS advisors_norm_phone_idx ON advisors (normalized_phone);
        CREATE INDEX IF NOT EXISTS advisors_name_idx ON advisors (name);
      `);
    } catch (ddlErr: any) {
      console.warn("[JanIA-Advisors] Aviso comprobando DDL de advisors:", ddlErr?.message);
    }

    // 1. Cargar desde la tabla canónica `advisors`
    let allAdvisors = await db.select().from(advisors);

    // Si la tabla advisors tiene menos de 20 registros, disparar backfill automático de bootstrap
    if (allAdvisors.length < 20) {
      console.log(`[JanIA-Advisors] 🏛️ Tabla advisors con pocos registros (${allAdvisors.length}). Ejecutando backfill masivo automático...`);
      await reconcileAndBackfillAdvisors(db);
      allAdvisors = await db.select().from(advisors);
    }

    for (const adv of allAdvisors) {
      if (adv.normalizedPhone) {
        const cleanPhone = adv.normalizedPhone;
        const name = adv.name || undefined;

        brokerDirectoryCache.set(cleanPhone, { phone: cleanPhone, name });
        if (cleanPhone.startsWith('57') && cleanPhone.length === 12) {
          brokerDirectoryCache.set(cleanPhone.substring(2), { phone: cleanPhone, name });
        }
        if (name && !isGenericName(name)) {
          brokerDirectoryCache.set(name.toLowerCase(), { phone: cleanPhone, name });
          brokerDirectoryCache.set(name, { phone: cleanPhone, name });
        }

        // Registrar todos los LIDs asociados
        if (Array.isArray(adv.whatsappLids)) {
          for (const lid of adv.whatsappLids) {
            if (lid && lid.trim() !== '') {
              brokerDirectoryCache.set(lid.trim(), { phone: cleanPhone, name });
            }
          }
        }

        // Registrar todos los aliases asociados
        if (Array.isArray(adv.aliases)) {
          for (const alias of adv.aliases) {
            if (alias && alias.trim() !== '' && !isGenericName(alias)) {
              brokerDirectoryCache.set(alias.trim().toLowerCase(), { phone: cleanPhone, name });
            }
          }
        }
        loadedCount++;
      }
    }

    // 2. Bootstrap complementario desde `properties` y `requirements`
    const knownProps = await db
      .select({
        phone: properties.idUsuarioWhatsapp,
        name: properties.nombreUsuarioWhatsapp,
        group: properties.origenNombre,
      })
      .from(properties)
      .where(sql`${properties.idUsuarioWhatsapp} IS NOT NULL AND ${properties.idUsuarioWhatsapp} != ''`);

    const knownReqs = await db
      .select({
        phone: requirements.idUsuarioWhatsapp,
        name: requirements.nombreUsuarioWhatsapp,
        group: requirements.origenNombre,
      })
      .from(requirements)
      .where(sql`${requirements.idUsuarioWhatsapp} IS NOT NULL AND ${requirements.idUsuarioWhatsapp} != ''`);

    for (const item of [...knownProps, ...knownReqs]) {
      const cleanPhone = normalizeAdvisorPhone(item.phone);
      const name = item.name && !isGenericName(item.name) ? item.name.trim() : null;

      if (cleanPhone) {
        if (!brokerDirectoryCache.has(cleanPhone)) {
          brokerDirectoryCache.set(cleanPhone, { phone: cleanPhone, name: name || undefined });
        }
        if (name) {
          const lowerName = name.toLowerCase();
          if (!brokerDirectoryCache.has(lowerName)) {
            brokerDirectoryCache.set(lowerName, { phone: cleanPhone, name });
          }
        }
      }
    }

    console.log(`[JanIA-Advisors] ✅ Directorio permanente cargado (${loadedCount} asesores oficiales en PostgreSQL, ${brokerDirectoryCache.size} claves activas en memoria).`);
  } catch (err: any) {
    console.warn(`[JanIA-Advisors] Advertencia cargando directorio permanente:`, err?.message || err);
  }
  return loadedCount;
}

/**
 * Consulta un asesor por LID, teléfono o nombre en el directorio permanente.
 */
export async function lookupAdvisor(identifier: {
  lidOrUserId?: string | null;
  phone?: string | null;
  name?: string | null;
}): Promise<{ phone: string; name: string } | null> {
  const { lidOrUserId, phone, name } = identifier;

  // 1. Búsqueda ultrarrápida en memoria (0ms)
  const syncFound = lookupAdvisorSync(phone || lidOrUserId, name);
  if (syncFound) return { phone: syncFound.phone, name: syncFound.name || syncFound.phone };

  // 2. Consulta en base de datos PostgreSQL
  const db = await getDb();
  if (!db) return null;

  try {
    if (lidOrUserId) {
      const cleanLid = lidOrUserId.split('@')[0].replace(/\D/g, '');
      const foundByLid = await db
        .select()
        .from(advisors)
        .where(sql`${cleanLid} = ANY(${advisors.whatsappLids})`)
        .limit(1)
        .then(r => r[0]);

      if (foundByLid) {
        // Cachear en memoria
        brokerDirectoryCache.set(cleanLid, { phone: foundByLid.normalizedPhone, name: foundByLid.name });
        return { phone: foundByLid.normalizedPhone, name: foundByLid.name };
      }
    }

    if (name && !isGenericName(name)) {
      const trimmedName = name.trim();
      const foundByName = await db
        .select()
        .from(advisors)
        .where(or(
          sql`LOWER(${advisors.name}) = LOWER(${trimmedName})`,
          sql`${trimmedName} = ANY(${advisors.aliases})`
        ))
        .limit(1)
        .then(r => r[0]);

      if (foundByName) {
        brokerDirectoryCache.set(trimmedName.toLowerCase(), { phone: foundByName.normalizedPhone, name: foundByName.name });
        return { phone: foundByName.normalizedPhone, name: foundByName.name };
      }
    }
  } catch (err: any) {
    console.warn(`[AdvisorsCore] Error consultando advisors en BD:`, err?.message);
  }

  return null;
}
