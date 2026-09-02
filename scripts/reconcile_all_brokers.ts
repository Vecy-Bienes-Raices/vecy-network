import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { properties, requirements } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

function isGenericName(n?: string | null): boolean {
  if (!n) return true;
  const l = n.trim().toLowerCase();
  return (
    l.startsWith("asesor") ||
    l.startsWith("cliente") ||
    l.startsWith("broker") ||
    l.includes("sin nombre") ||
    l.includes("desconocido") ||
    l.length < 3
  );
}

function cleanColombianPhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits === "573192919978" || digits === "3192919978") return null; // Número de JanIA / Sistema
  if (digits.length === 12 && digits.startsWith("573")) return digits;
  if (digits.length === 10 && digits.startsWith("3")) return "57" + digits;
  return null;
}

function extractPhoneFromRawText(text?: string | null): string | null {
  if (!text) return null;
  const phoneRegex = /(?:\+?57\s*)?3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
  const matches = text.match(phoneRegex);
  if (!matches) return null;
  for (const m of matches) {
    const cp = cleanColombianPhone(m);
    if (cp) return cp;
  }
  return null;
}

async function reconcileAllBrokers() {
  console.log("================================================================================");
  console.log("🚀 INICIANDO RECONCILIACIÓN MASIVA DE BROKERS Y TELÉFONOS EN SUPABASE (v29.4.1)");
  console.log("================================================================================");

  const db = await getDb();
  if (!db) {
    console.error("❌ Base de datos no disponible.");
    process.exit(1);
  }

  const allProps = await db.select().from(properties);
  const allReqs = await db.select().from(requirements);

  console.log(`📊 Total registros analizados: ${allProps.length} Ofertas | ${allReqs.length} Demandas`);

  // 1. Corregir glitches puntuales de metraje detectados (Ej: Prop 671 M2: 78.52 guardado como 7852)
  for (const p of allProps) {
    if (p.areaTotal && parseFloat(p.areaTotal) > 2000 && p.rawText && /m2:\s*78\.52/i.test(p.rawText)) {
      console.log(`🛠️ Corrigiendo metraje de Propiedad #${p.id} (${p.areaTotal} -> 78.52)`);
      await db.update(properties).set({ areaTotal: "78.52" }).where(eq(properties.id, p.id));
      p.areaTotal = "78.52";
    }
  }

  // 2. Extracción de Teléfonos Directos desde el Texto Original (rawText)
  let extractedFromPropsText = 0;
  for (const p of allProps) {
    const currentPhone = cleanColombianPhone(p.idUsuarioWhatsapp);
    if (!currentPhone) {
      const phoneInText = extractPhoneFromRawText(p.rawText);
      if (phoneInText) {
        await db.update(properties).set({ idUsuarioWhatsapp: phoneInText }).where(eq(properties.id, p.id));
        p.idUsuarioWhatsapp = phoneInText;
        extractedFromPropsText++;
      }
    }
  }
  console.log(`✅ Teléfonos extraídos directamente del texto en Ofertas: ${extractedFromPropsText}`);

  let extractedFromReqsText = 0;
  for (const r of allReqs) {
    const currentPhone = cleanColombianPhone(r.idUsuarioWhatsapp);
    if (!currentPhone) {
      const phoneInText = extractPhoneFromRawText(r.rawText);
      if (phoneInText) {
        await db.update(requirements).set({ idUsuarioWhatsapp: phoneInText }).where(eq(requirements.id, r.id));
        r.idUsuarioWhatsapp = phoneInText;
        extractedFromReqsText++;
      }
    }
  }
  console.log(`✅ Teléfonos extraídos directamente del texto en Demandas: ${extractedFromReqsText}`);

  // 3. Construir Directorio Maestro Bidireccional (Nombre <-> Teléfono y LID <-> Teléfono)
  const nameToPhone = new Map<string, string>();
  const phoneToName = new Map<string, string>();
  const lidToPhone = new Map<string, string>();

  // Alimentar con todas las ofertas
  for (const p of allProps) {
    const phone = cleanColombianPhone(p.idUsuarioWhatsapp);
    const name = p.nombreUsuarioWhatsapp?.trim();
    if (phone && name && !isGenericName(name)) {
      nameToPhone.set(name.toLowerCase(), phone);
      if (!phoneToName.has(phone)) phoneToName.set(phone, name);
    }
  }

  // Alimentar con todas las demandas
  for (const r of allReqs) {
    const phone = cleanColombianPhone(r.idUsuarioWhatsapp);
    const name = r.nombreUsuarioWhatsapp?.trim();
    if (phone && name && !isGenericName(name)) {
      nameToPhone.set(name.toLowerCase(), phone);
      if (!phoneToName.has(phone)) phoneToName.set(phone, name);
    }
  }

  console.log(`📋 Directorio maestro consolidado: ${nameToPhone.size} asesores con nombre y celular verificado.`);

  // 4. Propagación en Cascada: Asignar Teléfono por Nombre de Broker Conocido
  let propsEnrichedByName = 0;
  let propsNamesEnrichedByPhone = 0;

  for (const p of allProps) {
    const currentPhone = cleanColombianPhone(p.idUsuarioWhatsapp);
    const name = p.nombreUsuarioWhatsapp?.trim();

    // Si no tiene teléfono pero su nombre está en el directorio maestro -> Asignar teléfono
    if (!currentPhone && name && nameToPhone.has(name.toLowerCase())) {
      const targetPhone = nameToPhone.get(name.toLowerCase())!;
      await db.update(properties).set({ idUsuarioWhatsapp: targetPhone }).where(eq(properties.id, p.id));
      p.idUsuarioWhatsapp = targetPhone;
      propsEnrichedByName++;
    }

    // Si tiene teléfono pero su nombre es genérico o nulo -> Asignar nombre del asesor
    if ((!name || isGenericName(name)) && currentPhone && phoneToName.has(currentPhone)) {
      const targetName = phoneToName.get(currentPhone)!;
      await db.update(properties).set({ nombreUsuarioWhatsapp: targetName }).where(eq(properties.id, p.id));
      p.nombreUsuarioWhatsapp = targetName;
      propsNamesEnrichedByPhone++;
    }
  }

  console.log(`✅ Ofertas enriquecidas con teléfono por nombre de broker: ${propsEnrichedByName}`);
  console.log(`✅ Ofertas enriquecidas con nombre de broker por teléfono: ${propsNamesEnrichedByPhone}`);

  let reqsEnrichedByName = 0;
  let reqsNamesEnrichedByPhone = 0;

  for (const r of allReqs) {
    const currentPhone = cleanColombianPhone(r.idUsuarioWhatsapp);
    const name = r.nombreUsuarioWhatsapp?.trim();

    if (!currentPhone && name && nameToPhone.has(name.toLowerCase())) {
      const targetPhone = nameToPhone.get(name.toLowerCase())!;
      await db.update(requirements).set({ idUsuarioWhatsapp: targetPhone }).where(eq(requirements.id, r.id));
      r.idUsuarioWhatsapp = targetPhone;
      reqsEnrichedByName++;
    }

    if ((!name || isGenericName(name)) && currentPhone && phoneToName.has(currentPhone)) {
      const targetName = phoneToName.get(currentPhone)!;
      await db.update(requirements).set({ nombreUsuarioWhatsapp: targetName }).where(eq(requirements.id, r.id));
      r.nombreUsuarioWhatsapp = targetName;
      reqsNamesEnrichedByPhone++;
    }
  }

  console.log(`✅ Demandas enriquecidas con teléfono por nombre de broker: ${reqsEnrichedByName}`);
  console.log(`✅ Demandas enriquecidas con nombre de broker por teléfono: ${reqsNamesEnrichedByPhone}`);

  console.log("================================================================================");
  console.log("🎉 RECONCILIACIÓN COMPLETADA CON ÉXITO.");
  console.log("================================================================================");
}

reconcileAllBrokers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error en reconciliación:", err);
    process.exit(1);
  });
