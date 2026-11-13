/**
 * Script Ejecutable de Simulación en Campo E2E ($0 COP) — VECY BIENES RAÍCES (v34.19)
 * Uso: NODE_ENV=test npx tsx server/scripts/simulate_field_e2e.ts
 */
import { runFieldE2ESimulation } from "../_core/jania/fieldSimulatorService";

async function main() {
  const summary = await runFieldE2ESimulation();
  console.log("=== SIMULADOR E2E EN CAMPO JANIA (DM + GRUPOS @JanIA) ===");
  console.log(`Entorno: ${summary.environment} | $0 COP Verificado: ${summary.zeroPaidCostVerified}`);
  for (const j of summary.journeys) {
    console.log(`\n[${j.passed ? "PASS" : "FAIL"}] ${j.title} (Total: ${j.totalLatencyMs}ms, Max Interceptor: ${j.maxInterceptorLatencyMs}ms)`);
    for (const t of j.turns) {
      console.log(
        `  - Turno ${t.turnNumber} (${t.channel}): ${t.latencyMs}ms | Rol: ${t.persistedRole || "N/A"} | PDF: ${t.hadPdfAttachment ? t.pdfFileName || "SI" : "NO"} | ${t.assertionsPassed ? "OK" : "FAIL: " + t.failures.join("; ")}`
      );
    }
  }
  console.log("\n=== TELEMETRÍA CONSOLIDADA ===");
  console.log("Roles:", JSON.stringify(summary.telemetrySnapshot.roles));
  console.log("LLM:", JSON.stringify(summary.telemetrySnapshot.llm));
  console.log("TTS:", JSON.stringify(summary.telemetrySnapshot.tts));

  if (!summary.allPassed) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Error ejecutando simulador E2E:", err);
  process.exit(1);
});
