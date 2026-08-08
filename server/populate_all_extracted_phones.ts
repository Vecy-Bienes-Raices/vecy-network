import "dotenv/config";
import postgres from "postgres";

async function populateAllExtractedPhones() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL no encontrada.");
    process.exit(1);
  }

  console.log("📱 Escaneando 100% de la base de datos para recuperar y enlazar teléfonos de WhatsApp reales...");
  const sql = postgres(dbUrl, { prepare: false });

  try {
    // 1. Propiedades
    const props = await sql`SELECT id, "idUsuarioWhatsapp", "rawText", "description", name FROM properties`;
    let propsUpdated = 0;

    for (const p of props) {
      const textToSearch = `${p.rawText || ""} ${p.description || ""} ${p.name || ""}`;
      const phoneMatches = textToSearch.match(/(?:\+?57\s*)?3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/g);

      if (phoneMatches && phoneMatches.length > 0) {
        for (const pm of phoneMatches) {
          const clean = pm.replace(/\D/g, "");
          const clean10 = clean.startsWith("57") && clean.length === 12 ? clean.substring(2) : clean;
          if (clean10.length === 10 && clean10.startsWith("3") && clean10 !== "3192919978") {
            const fullPhone = `57${clean10}`;
            if (p.idUsuarioWhatsapp !== fullPhone) {
              await sql`UPDATE properties SET "idUsuarioWhatsapp" = ${fullPhone} WHERE id = ${p.id}`;
              propsUpdated++;
              console.log(`  ✅ Propiedad #${p.id}: Enlazado teléfono real extraído del texto -> +${fullPhone}`);
            }
            break;
          }
        }
      }
    }

    // 2. Requerimientos
    const reqs = await sql`SELECT id, "idUsuarioWhatsapp", "rawText", name FROM requirements`;
    let reqsUpdated = 0;

    for (const r of reqs) {
      const textToSearch = `${r.rawText || ""} ${r.name || ""}`;
      const phoneMatches = textToSearch.match(/(?:\+?57\s*)?3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/g);

      if (phoneMatches && phoneMatches.length > 0) {
        for (const pm of phoneMatches) {
          const clean = pm.replace(/\D/g, "");
          const clean10 = clean.startsWith("57") && clean.length === 12 ? clean.substring(2) : clean;
          if (clean10.length === 10 && clean10.startsWith("3") && clean10 !== "3192919978") {
            const fullPhone = `57${clean10}`;
            if (r.idUsuarioWhatsapp !== fullPhone) {
              await sql`UPDATE requirements SET "idUsuarioWhatsapp" = ${fullPhone} WHERE id = ${r.id}`;
              reqsUpdated++;
              console.log(`  ✅ Requerimiento #${r.id}: Enlazado teléfono real extraído del texto -> +${fullPhone}`);
            }
            break;
          }
        }
      }
    }

    console.log(`🎉 Escaneo completado. ${propsUpdated} propiedades y ${reqsUpdated} requerimientos actualizados con sus teléfonos de WhatsApp directos.`);
  } catch (err) {
    console.error("❌ Error poblando teléfonos:", err);
  } finally {
    await sql.end();
  }
}

populateAllExtractedPhones();
