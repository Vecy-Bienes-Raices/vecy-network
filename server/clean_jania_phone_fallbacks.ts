import "dotenv/config";
import postgres from "postgres";

async function cleanJaniaPhoneFallbacks() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL no encontrada.");
    process.exit(1);
  }

  console.log("🧹 Iniciando limpieza de teléfonos de JanIA (573192919978) en Supabase...");
  const sql = postgres(dbUrl, { prepare: false });

  try {
    // 1. Audit Properties
    const props = await sql`SELECT id, "idUsuarioWhatsapp", "rawText", "description", name FROM properties WHERE "idUsuarioWhatsapp" LIKE '%3192919978%' OR "idUsuarioWhatsapp" IS NULL`;
    console.log(`📦 Encontradas ${props.length} propiedades con teléfono oficial de JanIA o nulo...`);

    let propsFixed = 0;
    for (const p of props) {
      const textToSearch = `${p.rawText || ""} ${p.description || ""} ${p.name || ""}`;
      const phoneMatches = textToSearch.match(/(?:\+?57\s*)?3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/g);

      let realPhone: string | null = null;
      if (phoneMatches && phoneMatches.length > 0) {
        for (const pm of phoneMatches) {
          const clean = pm.replace(/\D/g, "");
          const clean10 = clean.startsWith("57") && clean.length === 12 ? clean.substring(2) : clean;
          if (clean10.length === 10 && clean10.startsWith("3") && clean10 !== "3192919978") {
            realPhone = `57${clean10}`;
            break;
          }
        }
      }

      await sql`UPDATE properties SET "idUsuarioWhatsapp" = ${realPhone} WHERE id = ${p.id}`;
      propsFixed++;
      if (realPhone) {
        console.log(`  ✅ Propiedad #${p.id}: Reemplazado JanIA por teléfono real extraído del texto -> +${realPhone}`);
      } else {
        console.log(`  ✅ Propiedad #${p.id}: Removido número JanIA (dejado en NULL para trazabilidad por grupo)`);
      }
    }

    // 2. Audit Requirements
    const reqs = await sql`SELECT id, "idUsuarioWhatsapp", "rawText", name FROM requirements WHERE "idUsuarioWhatsapp" LIKE '%3192919978%' OR "idUsuarioWhatsapp" IS NULL`;
    console.log(`📦 Encontrados ${reqs.length} requerimientos con teléfono oficial de JanIA o nulo...`);

    let reqsFixed = 0;
    for (const r of reqs) {
      const textToSearch = `${r.rawText || ""} ${r.name || ""}`;
      const phoneMatches = textToSearch.match(/(?:\+?57\s*)?3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/g);

      let realPhone: string | null = null;
      if (phoneMatches && phoneMatches.length > 0) {
        for (const pm of phoneMatches) {
          const clean = pm.replace(/\D/g, "");
          const clean10 = clean.startsWith("57") && clean.length === 12 ? clean.substring(2) : clean;
          if (clean10.length === 10 && clean10.startsWith("3") && clean10 !== "3192919978") {
            realPhone = `57${clean10}`;
            break;
          }
        }
      }

      await sql`UPDATE requirements SET "idUsuarioWhatsapp" = ${realPhone} WHERE id = ${r.id}`;
      reqsFixed++;
      if (realPhone) {
        console.log(`  ✅ Requerimiento #${r.id}: Reemplazado JanIA por teléfono real extraído del texto -> +${realPhone}`);
      } else {
        console.log(`  ✅ Requerimiento #${r.id}: Removido número JanIA (dejado en NULL para trazabilidad por grupo)`);
      }
    }

    console.log(`🎉 Limpieza de teléfonos finalizada. ${propsFixed} propiedades y ${reqsFixed} requerimientos actualizados.`);
  } catch (err) {
    console.error("❌ Error limpiando teléfonos:", err);
  } finally {
    await sql.end();
  }
}

cleanJaniaPhoneFallbacks();
