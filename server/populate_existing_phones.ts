import "dotenv/config";
import { getDb } from "./db";
import { properties, requirements } from "../drizzle/schema";
import { eq } from "drizzle-orm";

function extractPhoneFromText(text: string | null | undefined): string | null {
  if (!text) return null;
  const phoneMatches = text.match(/(?:\+?57\s*)?3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/g);
  if (phoneMatches && phoneMatches.length > 0) {
    for (const pMatch of phoneMatches) {
      const rawMatch = pMatch.replace(/\D/g, "");
      const clean10 = rawMatch.startsWith("57") && rawMatch.length === 12 ? rawMatch.substring(2) : rawMatch;
      if (clean10.length === 10 && clean10.startsWith("3") && clean10 !== "3192919978") {
        return `57${clean10}@s.whatsapp.net`;
      }
    }
  }
  return null;
}

async function main() {
  console.log("🚀 Iniciando extracción masiva de teléfonos de WhatsApp para registros existentes...");
  const db = await getDb();
  if (!db) {
    console.error("❌ No se pudo conectar a la base de datos Supabase.");
    process.exit(1);
  }

  // 1. Inmuebles (Properties)
  const allProps = await db.select().from(properties);
  let propUpdated = 0;
  for (const p of allProps) {
    if (!p.idUsuarioWhatsapp || p.idUsuarioWhatsapp.trim() === "" || p.idUsuarioWhatsapp.includes("573192919978")) {
      const extractedPhone = extractPhoneFromText(`${p.rawText || ''} ${p.description || ''} ${p.name || ''}`);
      if (extractedPhone) {
        await db.update(properties).set({ idUsuarioWhatsapp: extractedPhone }).where(eq(properties.id, p.id));
        propUpdated++;
        console.log(`[Prop #${p.id}] Teléfono extraído y guardado: ${extractedPhone}`);
      }
    }
  }

  // 2. Requerimientos (Requirements)
  const allReqs = await db.select().from(requirements);
  let reqUpdated = 0;
  for (const r of allReqs) {
    if (!r.idUsuarioWhatsapp || r.idUsuarioWhatsapp.trim() === "" || r.idUsuarioWhatsapp.includes("573192919978")) {
      const extractedPhone = extractPhoneFromText(`${r.rawText || ''} ${(r as any).description || ''} ${r.name || ''}`);
      if (extractedPhone) {
        await db.update(requirements).set({ idUsuarioWhatsapp: extractedPhone }).where(eq(requirements.id, r.id));
        reqUpdated++;
        console.log(`[Req #${r.id}] Teléfono extraído y guardado: ${extractedPhone}`);
      }
    }
  }

  console.log(`✅ Finalizado: ${propUpdated} inmuebles y ${reqUpdated} requerimientos actualizados con sus teléfonos de WhatsApp.`);
  process.exit(0);
}

main().catch(err => {
  console.error("❌ Error en script de extracción:", err);
  process.exit(1);
});
