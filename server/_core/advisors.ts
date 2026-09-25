import { getDb } from '../db';
import { advisors, properties, requirements, users } from '../../drizzle/schema';
import { eq, or, sql } from 'drizzle-orm';

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

  // ── 4. PROPAGACIÓN EN CASCADA A TODAS LAS PROPIEDADES EN BD ──
  let updatedProps = 0;
  let updatedReqs = 0;

  try {
    const allProps = await db.select({
      id: properties.id,
      name: properties.nombreUsuarioWhatsapp,
      phone: properties.idUsuarioWhatsapp
    }).from(properties);

    for (const p of allProps) {
      const isSamePhone = cleanPhone && p.phone === cleanPhone;
      const isSameLid = extractedLid && p.phone === extractedLid;
      const isOldPhone = oldPhoneOrLid && p.phone === oldPhoneOrLid;
      const isSameName = validName && p.name && !isGenericName(p.name) && (
        p.name.trim().toLowerCase() === validName.toLowerCase()
      );

      if (!isSamePhone && !isSameLid && !isOldPhone && !isSameName) continue;

      const pUpdates: { idUsuarioWhatsapp?: string; nombreUsuarioWhatsapp?: string } = {};

      if (cleanPhone && p.phone !== cleanPhone) {
        // Asignar si no tiene teléfono real o tiene LID o coincidió por nombre/LID
        if (!p.phone || isLidIdentifier(p.phone) || p.phone === oldPhoneOrLid || isSameName) {
          pUpdates.idUsuarioWhatsapp = cleanPhone;
        }
      }

      if (validName && p.name !== validName) {
        if (!p.name || isGenericName(p.name) || isSameLid || isSamePhone) {
          pUpdates.nombreUsuarioWhatsapp = validName;
        }
      }

      if (Object.keys(pUpdates).length > 0) {
        await db.update(properties).set(pUpdates).where(eq(properties.id, p.id));
        updatedProps++;
      }
    }
  } catch (propErr: any) {
    console.error(`[AdvisorsCore] Error propagando en properties:`, propErr?.message);
  }

  // ── 5. PROPAGACIÓN EN CASCADA A TODOS LOS REQUERIMIENTOS EN BD ──
  try {
    const allReqs = await db.select({
      id: requirements.id,
      name: requirements.nombreUsuarioWhatsapp,
      phone: requirements.idUsuarioWhatsapp
    }).from(requirements);

    for (const r of allReqs) {
      const isSamePhone = cleanPhone && r.phone === cleanPhone;
      const isSameLid = extractedLid && r.phone === extractedLid;
      const isOldPhone = oldPhoneOrLid && r.phone === oldPhoneOrLid;
      const isSameName = validName && r.name && !isGenericName(r.name) && (
        r.name.trim().toLowerCase() === validName.toLowerCase()
      );

      if (!isSamePhone && !isSameLid && !isOldPhone && !isSameName) continue;

      const rUpdates: { idUsuarioWhatsapp?: string; nombreUsuarioWhatsapp?: string } = {};

      if (cleanPhone && r.phone !== cleanPhone) {
        if (!r.phone || isLidIdentifier(r.phone) || r.phone === oldPhoneOrLid || isSameName) {
          rUpdates.idUsuarioWhatsapp = cleanPhone;
        }
      }

      if (validName && r.name !== validName) {
        if (!r.name || isGenericName(r.name) || isSameLid || isSamePhone) {
          rUpdates.nombreUsuarioWhatsapp = validName;
        }
      }

      if (Object.keys(rUpdates).length > 0) {
        await db.update(requirements).set(rUpdates).where(eq(requirements.id, r.id));
        updatedReqs++;
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
 * Inicializa y carga en memoria el directorio permanente de asesores desde PostgreSQL al arrancar el servidor.
 * Restaura LIDs, nombres y teléfonos para que ningún reinicio de PM2 borre lo aprendido.
 */
export async function initAdvisorsDirectory(): Promise<number> {
  let loadedCount = 0;
  try {
    const db = await getDb();
    if (!db) return 0;

    // 1. Cargar desde la tabla canónica `advisors`
    const allAdvisors = await db.select().from(advisors);
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

    // 2. Bootstrap complementario desde `properties` y `requirements` para poblar asesores históricos
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
