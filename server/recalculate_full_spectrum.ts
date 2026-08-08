import { executeMatchEngine } from "./_core/matching";

async function runFullSpectrumRecalculation() {
  console.log("🚀 Iniciando recálculo completo de Coincidencias en Supabase (Espectro 80% a 100%)...");
  const startTime = Date.now();
  
  try {
    await executeMatchEngine(null, null);
    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Recálculo exitoso completado en ${durationSec} segundos.`);
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Error durante el recálculo:", err.message || err);
    process.exit(1);
  }
}

runFullSpectrumRecalculation();
