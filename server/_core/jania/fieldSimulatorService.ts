/**
 * Simulador de Pruebas en Campo End-to-End (DM + Grupos sin Costo $0 COP) — v34.19
 * VECY BIENES RAÍCES — Doctrina Eduardo A. Rivera
 *
 * Simula 4 recorridos conversacionales multi-turno reales completos:
 * 1. Agente Inmobiliario (Alianza 40/20/40 + Gastos Notariales + Reseña Google)
 * 2. Propietario Directo (Corretaje Virtual + Minuta PDF + Pre-liquidación Tributaria)
 * 3. Comprador / Inversionista Directo (Hipotecario vs Leasing + Cap Rate + Resumen Ejecutivo de Voz)
 * 4. Consultor Grupal @JanIA con Audio / PDF (Nota de Voz Notarial + Concepto PH Ley 675 PDF + Satisfacción)
 */

import { processPrivateDmConversationalMessage, popLatestDmPdf } from "./handlers/dmHandler";
import { processConsultingMessage } from "./handlers/consultingHandler";
import { buildSessionOnboardingDirectives } from "./handlers/dmOnboardingAndDocsHelper";
import { getUserBusinessRole, type UserBusinessRole } from "./sessionManager";
import { buildConciseVoiceSummaryText, detectaVoz, getTtsUsageStats } from "../whatsapp-utils";
import { getLlmUsageStats } from "../geminiKeyManager";
import {
  getOperationalTelemetrySnapshot,
  type OperationalTelemetrySnapshot,
} from "../telemetryAndAlertsService";

export interface SimulatedTurnReport {
  turnNumber: number;
  channel: "dm" | "group_consulting";
  userMessage: string;
  replyPreview: string;
  replyLength: number;
  latencyMs: number;
  persistedRole?: UserBusinessRole;
  hadPdfAttachment: boolean;
  pdfFileName?: string;
  voiceSummary?: {
    wasSummarized: boolean;
    spokenLength: number;
    hasNoTablePipes: boolean;
    hasNoRawUrls: boolean;
  };
  assertionsPassed: boolean;
  failures: string[];
}

export interface SimulatedJourneyReport {
  journeyId: string;
  title: string;
  expectedRole: UserBusinessRole | "group_consultant";
  turns: SimulatedTurnReport[];
  totalLatencyMs: number;
  maxInterceptorLatencyMs: number;
  passed: boolean;
  failures: string[];
}

export interface FieldE2ESimulationSummary {
  executedAt: string;
  environment: string;
  zeroPaidCostVerified: boolean;
  llmTier2PaidCalls: number;
  ttsPaidCalls: number;
  allPassed: boolean;
  journeys: SimulatedJourneyReport[];
  telemetrySnapshot: OperationalTelemetrySnapshot;
}

const ROLE_REPROMPT_REGEX = /(?:en calidad de qu[eé]\s+(?:nos\s+)?escribes|cu[aá]l\s+es\s+tu\s+rol|a\s+qu[eé]\s+te\s+dedicas)/i;

export async function runFieldE2ESimulation(options?: {
  runId?: string;
}): Promise<FieldE2ESimulationSummary> {
  const runSuffix = (options?.runId || String(Date.now())).replace(/\D/g, "").slice(-6) || "205001";
  const journeys: SimulatedJourneyReport[] = [];

  // ── RECORRIDO 1: AGENTE INMOBILIARIO (40/20/40) ──────────────────────────
  {
    const userId = `5730081${runSuffix}1@s.whatsapp.net`;
    const userName = "Laura Gómez";
    const turns: SimulatedTurnReport[] = [];
    const journeyFailures: string[] = [];

    // Turno 1: Primer contacto declarando rol agente
    const t1Start = performance.now();
    const r1 = await processPrivateDmConversationalMessage(
      "Buenos días JanIA, soy Laura Gómez, agente inmobiliaria y represento a un cliente.",
      userId,
      userName
    );
    const t1Ms = Math.round(performance.now() - t1Start);
    const role1 = await getUserBusinessRole(userId);
    const dir1 = await buildSessionOnboardingDirectives(userId);
    const t1Failures: string[] = [];
    if (role1 !== "agente_inmobiliario") t1Failures.push(`Rol esperado agente_inmobiliario, obtenido ${role1}`);
    if (!dir1.contextRoleDirective.includes("PROHIBIDO volver a preguntarle su rol")) {
      t1Failures.push("Directiva no bloquea repregunta de rol");
    }
    if (ROLE_REPROMPT_REGEX.test(r1)) t1Failures.push("Respuesta Turno 1 repreguntó el rol ya declarado");
    turns.push({
      turnNumber: 1,
      channel: "dm",
      userMessage: "Buenos días JanIA, soy Laura Gómez, agente inmobiliaria...",
      replyPreview: r1.slice(0, 140),
      replyLength: r1.length,
      latencyMs: t1Ms,
      persistedRole: role1,
      hadPdfAttachment: false,
      assertionsPassed: t1Failures.length === 0,
      failures: t1Failures,
    });

    // Turno 2: Liquidación notarial determinística + cero repregunta de rol
    const t2Start = performance.now();
    const r2 = await processPrivateDmConversationalMessage(
      "Necesito calcular gastos notariales para una compraventa de $450.000.000 en Bogotá",
      userId,
      userName
    );
    const t2Ms = Math.round(performance.now() - t2Start);
    const role2 = await getUserBusinessRole(userId);
    const pdf2 = popLatestDmPdf(userId);
    const t2Failures: string[] = [];
    if (role2 !== "agente_inmobiliario") t2Failures.push("Se perdió rol agente_inmobiliario en turno 2");
    if (ROLE_REPROMPT_REGEX.test(r2)) t2Failures.push("Turno 2 volvió a preguntar el rol");
    if (!/notarial|retenci[oó]n|registro|beneficencia/i.test(r2)) {
      t2Failures.push("Turno 2 no entregó desglose notarial esperado");
    }
    turns.push({
      turnNumber: 2,
      channel: "dm",
      userMessage: "Necesito calcular gastos notariales para una compraventa de $450.000.000 en Bogotá",
      replyPreview: r2.slice(0, 140),
      replyLength: r2.length,
      latencyMs: t2Ms,
      persistedRole: role2,
      hadPdfAttachment: Boolean(pdf2?.pdfBuffer),
      pdfFileName: pdf2?.pdfFileName,
      assertionsPassed: t2Failures.length === 0,
      failures: t2Failures,
    });

    // Turno 3: Feedback de satisfacción + entrega autónoma de enlace Google Reviews
    const t3Start = performance.now();
    const r3 = await processPrivateDmConversationalMessage(
      "Excelente liquidación, me encantó el servicio muchas gracias",
      userId,
      userName
    );
    const t3Ms = Math.round(performance.now() - t3Start);
    const t3Failures: string[] = [];
    if (!r3.includes("g.page/r/CctNbwU6UpX5EBM/review")) {
      t3Failures.push("Turno 3 no entregó el enlace oficial de Google Reviews");
    }
    if (ROLE_REPROMPT_REGEX.test(r3)) t3Failures.push("Turno 3 volvió a preguntar el rol");
    turns.push({
      turnNumber: 3,
      channel: "dm",
      userMessage: "Excelente liquidación, me encantó el servicio muchas gracias",
      replyPreview: r3.slice(0, 140),
      replyLength: r3.length,
      latencyMs: t3Ms,
      persistedRole: await getUserBusinessRole(userId),
      hadPdfAttachment: false,
      assertionsPassed: t3Failures.length === 0,
      failures: t3Failures,
    });

    turns.forEach((t) => journeyFailures.push(...t.failures));
    journeys.push({
      journeyId: "journey_1_agente_402040",
      title: "Agente Inmobiliario (40/20/40 + Notarial + Google Reviews)",
      expectedRole: "agente_inmobiliario",
      turns,
      totalLatencyMs: turns.reduce((acc, t) => acc + t.latencyMs, 0),
      maxInterceptorLatencyMs: t2Ms,
      passed: journeyFailures.length === 0,
      failures: journeyFailures,
    });
  }

  // ── RECORRIDO 2: PROPIETARIO DIRECTO ─────────────────────────────────────
  {
    const userId = `5730082${runSuffix}2@s.whatsapp.net`;
    const userName = "Carlos Mendoza";
    const turns: SimulatedTurnReport[] = [];
    const journeyFailures: string[] = [];

    // Turno 1: Primer contacto como propietario directo
    const t1Start = performance.now();
    const r1 = await processPrivateDmConversationalMessage(
      "Buenas tardes, soy propietario directo y quiero vender mi apartamento en Chicó",
      userId,
      userName
    );
    const t1Ms = Math.round(performance.now() - t1Start);
    const role1 = await getUserBusinessRole(userId);
    const dir1 = await buildSessionOnboardingDirectives(userId);
    const t1Failures: string[] = [];
    if (role1 !== "propietario_directo") t1Failures.push(`Rol esperado propietario_directo, obtenido ${role1}`);
    if (!dir1.contextRoleDirective.includes("PROHIBIDO ofrecerle 40/20/40")) {
      t1Failures.push("Directiva propietario_directo no prohíbe ofrecer 40/20/40");
    }
    if (ROLE_REPROMPT_REGEX.test(r1)) t1Failures.push("Turno 1 repreguntó el rol ya confirmado");
    turns.push({
      turnNumber: 1,
      channel: "dm",
      userMessage: "Buenas tardes, soy propietario directo y quiero vender mi apartamento en Chicó",
      replyPreview: r1.slice(0, 140),
      replyLength: r1.length,
      latencyMs: t1Ms,
      persistedRole: role1,
      hadPdfAttachment: false,
      assertionsPassed: t1Failures.length === 0,
      failures: t1Failures,
    });

    // Turno 2: Generación determinística de minuta de corretaje PDF sin mencionar 40/20/40
    const t2Start = performance.now();
    const r2 = await processPrivateDmConversationalMessage(
      "Hazme una minuta personalizada de contrato de corretaje en PDF para vender mi apartamento en Chicó por $680 millones, propietario Carlos Mendoza",
      userId,
      userName
    );
    const t2Ms = Math.round(performance.now() - t2Start);
    const pdf2 = popLatestDmPdf(userId);
    const t2Failures: string[] = [];
    if (!pdf2?.pdfBuffer || pdf2.pdfBuffer.length < 500) {
      t2Failures.push("Turno 2 no generó PDF membretado de minuta de corretaje");
    }
    if (/40\/20\/40/i.test(r2)) t2Failures.push("Turno 2 filtró 40/20/40 a propietario directo");
    if (ROLE_REPROMPT_REGEX.test(r2)) t2Failures.push("Turno 2 repreguntó el rol");
    turns.push({
      turnNumber: 2,
      channel: "dm",
      userMessage: "Hazme una minuta personalizada de contrato de corretaje en PDF...",
      replyPreview: r2.slice(0, 140),
      replyLength: r2.length,
      latencyMs: t2Ms,
      persistedRole: await getUserBusinessRole(userId),
      hadPdfAttachment: Boolean(pdf2?.pdfBuffer),
      pdfFileName: pdf2?.pdfFileName,
      assertionsPassed: t2Failures.length === 0,
      failures: t2Failures,
    });

    // Turno 3: Pre-liquidación tributaria de venta
    const t3Start = performance.now();
    const r3 = await processPrivateDmConversationalMessage(
      "Pre-liquida retención en la fuente y ganancia ocasional si vendo en $680 millones con costo fiscal de $420 millones hace 5 años",
      userId,
      userName
    );
    const t3Ms = Math.round(performance.now() - t3Start);
    const pdf3 = popLatestDmPdf(userId);
    const t3Failures: string[] = [];
    if (!/ganancia ocasional|retenci[oó]n/i.test(r3)) {
      t3Failures.push("Turno 3 no entregó pre-liquidación tributaria esperada");
    }
    if (!pdf3?.pdfBuffer) t3Failures.push("Turno 3 no adjuntó ficha financiera/tributaria PDF");
    if (ROLE_REPROMPT_REGEX.test(r3)) t3Failures.push("Turno 3 repreguntó el rol");
    turns.push({
      turnNumber: 3,
      channel: "dm",
      userMessage: "Pre-liquida retención en la fuente y ganancia ocasional...",
      replyPreview: r3.slice(0, 140),
      replyLength: r3.length,
      latencyMs: t3Ms,
      persistedRole: await getUserBusinessRole(userId),
      hadPdfAttachment: Boolean(pdf3?.pdfBuffer),
      pdfFileName: pdf3?.pdfFileName,
      assertionsPassed: t3Failures.length === 0,
      failures: t3Failures,
    });

    turns.forEach((t) => journeyFailures.push(...t.failures));
    journeys.push({
      journeyId: "journey_2_propietario_directo",
      title: "Propietario Directo (Corretaje + Minuta PDF + Tributario)",
      expectedRole: "propietario_directo",
      turns,
      totalLatencyMs: turns.reduce((acc, t) => acc + t.latencyMs, 0),
      maxInterceptorLatencyMs: Math.max(t2Ms, t3Ms),
      passed: journeyFailures.length === 0,
      failures: journeyFailures,
    });
  }

  // ── RECORRIDO 3: COMPRADOR / INVERSIONISTA DIRECTO ───────────────────────
  {
    const userId = `5730083${runSuffix}3@s.whatsapp.net`;
    const userName = "Andrés Castillo";
    const turns: SimulatedTurnReport[] = [];
    const journeyFailures: string[] = [];

    // Turno 1: Primer contacto comprador/inversionista
    const t1Start = performance.now();
    const r1 = await processPrivateDmConversationalMessage(
      "Hola JanIA, soy comprador directo e inversionista, busco invertir en Bogotá",
      userId,
      userName
    );
    const t1Ms = Math.round(performance.now() - t1Start);
    const role1 = await getUserBusinessRole(userId);
    const dir1 = await buildSessionOnboardingDirectives(userId);
    const t1Failures: string[] = [];
    if (role1 !== "comprador_inversionista") {
      t1Failures.push(`Rol esperado comprador_inversionista, obtenido ${role1}`);
    }
    if (!dir1.contextRoleDirective.includes("JAMÁS le ofrezcas esquema de comisión 40/20/40")) {
      t1Failures.push("Directiva comprador_inversionista no bloquea 40/20/40");
    }
    if (ROLE_REPROMPT_REGEX.test(r1)) t1Failures.push("Turno 1 repreguntó el rol ya confirmado");
    turns.push({
      turnNumber: 1,
      channel: "dm",
      userMessage: "Hola JanIA, soy comprador directo e inversionista...",
      replyPreview: r1.slice(0, 140),
      replyLength: r1.length,
      latencyMs: t1Ms,
      persistedRole: role1,
      hadPdfAttachment: false,
      assertionsPassed: t1Failures.length === 0,
      failures: t1Failures,
    });

    // Turno 2: Simulación Hipotecario vs Leasing + Cap Rate + Resumen Ejecutivo de Voz
    const t2Start = performance.now();
    const r2 = await processPrivateDmConversationalMessage(
      "Simula crédito hipotecario vs leasing habitacional y Cap Rate para un apartamento de $520 millones con arriendo de $3.2 millones y cuota inicial del 30%",
      userId,
      userName
    );
    const t2Ms = Math.round(performance.now() - t2Start);
    const pdf2 = popLatestDmPdf(userId);
    const voiceSummary2 = buildConciseVoiceSummaryText(r2);
    const t2Failures: string[] = [];
    if (!/cap rate|leasing|hipotecario/i.test(r2)) {
      t2Failures.push("Turno 2 no entregó simulación hipotecaria/leasing/Cap Rate");
    }
    if (!pdf2?.pdfBuffer) t2Failures.push("Turno 2 no adjuntó PDF de ficha financiera");
    if (!voiceSummary2.wasSummarized) {
      t2Failures.push("Resumen ejecutivo de voz debió compactar la ficha financiera extensa");
    }
    if (voiceSummary2.spokenText.length > 480) {
      t2Failures.push(`Resumen de voz excede 480 chars (${voiceSummary2.spokenText.length})`);
    }
    if (voiceSummary2.spokenText.includes("|")) {
      t2Failures.push("Resumen de voz filtró pipes de tabla Markdown");
    }
    if (/https?:\/\//i.test(voiceSummary2.spokenText)) {
      t2Failures.push("Resumen de voz conservó URLs crudas");
    }
    if (ROLE_REPROMPT_REGEX.test(r2)) t2Failures.push("Turno 2 repreguntó el rol");
    turns.push({
      turnNumber: 2,
      channel: "dm",
      userMessage: "Simula crédito hipotecario vs leasing habitacional y Cap Rate...",
      replyPreview: r2.slice(0, 140),
      replyLength: r2.length,
      latencyMs: t2Ms,
      persistedRole: await getUserBusinessRole(userId),
      hadPdfAttachment: Boolean(pdf2?.pdfBuffer),
      pdfFileName: pdf2?.pdfFileName,
      voiceSummary: {
        wasSummarized: voiceSummary2.wasSummarized,
        spokenLength: voiceSummary2.spokenText.length,
        hasNoTablePipes: !voiceSummary2.spokenText.includes("|"),
        hasNoRawUrls: !/https?:\/\//i.test(voiceSummary2.spokenText),
      },
      assertionsPassed: t2Failures.length === 0,
      failures: t2Failures,
    });

    turns.forEach((t) => journeyFailures.push(...t.failures));
    journeys.push({
      journeyId: "journey_3_comprador_inversionista",
      title: "Comprador / Inversionista (Hipotecario/Leasing + Cap Rate + Resumen Voz)",
      expectedRole: "comprador_inversionista",
      turns,
      totalLatencyMs: turns.reduce((acc, t) => acc + t.latencyMs, 0),
      maxInterceptorLatencyMs: t2Ms,
      passed: journeyFailures.length === 0,
      failures: journeyFailures,
    });
  }

  // ── RECORRIDO 4: CONSULTOR GRUPAL @JANIA CON AUDIO Y PDF ─────────────────
  {
    const groupUserId = `5730084${runSuffix}4@s.whatsapp.net`;
    const userName = "Mariana Salgado";
    const turns: SimulatedTurnReport[] = [];
    const journeyFailures: string[] = [];

    // Turno 1: Solicitud por nota de voz en Grupo 2 (Gastos Notariales + Resumen Ejecutivo de Voz)
    const msg1 = "@JanIA envíame una nota de voz con la liquidación de gastos notariales para compraventa de $600 millones en Bogotá";
    const t1Start = performance.now();
    const g1 = await processConsultingMessage(
      msg1,
      groupUserId,
      userName,
      undefined,
      undefined,
      undefined,
      `mock-audio:${msg1}`
    );
    const t1Ms = Math.round(performance.now() - t1Start);
    const voiceSummary1 = buildConciseVoiceSummaryText(g1.voiceResponse || g1.response);
    const t1Failures: string[] = [];
    if (!detectaVoz(msg1)) t1Failures.push("detectaVoz no detectó solicitud explícita de nota de voz");
    if (!/notarial|escrituraci[oó]n|retenci[oó]n/i.test(g1.response)) {
      t1Failures.push("Grupo Turno 1 no ejecutó liquidación notarial determinística");
    }
    if (voiceSummary1.spokenText.length === 0 || voiceSummary1.spokenText.length > 480) {
      t1Failures.push(`Resumen de voz grupal fuera de rango: ${voiceSummary1.spokenText.length}`);
    }
    if (voiceSummary1.spokenText.includes("|") || /https?:\/\//i.test(voiceSummary1.spokenText)) {
      t1Failures.push("Resumen de voz grupal contiene pipes o URLs crudas");
    }
    turns.push({
      turnNumber: 1,
      channel: "group_consulting",
      userMessage: msg1,
      replyPreview: g1.response.slice(0, 140),
      replyLength: g1.response.length,
      latencyMs: t1Ms,
      hadPdfAttachment: Boolean(g1.document),
      pdfFileName: g1.fileName,
      voiceSummary: {
        wasSummarized: voiceSummary1.wasSummarized,
        spokenLength: voiceSummary1.spokenText.length,
        hasNoTablePipes: !voiceSummary1.spokenText.includes("|"),
        hasNoRawUrls: !/https?:\/\//i.test(voiceSummary1.spokenText),
      },
      assertionsPassed: t1Failures.length === 0,
      failures: t1Failures,
    });

    // Turno 2: Concepto Propiedad Horizontal Ley 675 con entrega PDF nativa en grupo
    const msg2 = "@JanIA calcula coeficientes y quórum Ley 675 para una asamblea de propiedad horizontal con coeficiente 12.5% sobre presupuesto de $240 millones y expensa extraordinaria de 5 veces el presupuesto mensual";
    const t2Start = performance.now();
    const g2 = await processConsultingMessage(msg2, groupUserId, userName);
    const t2Ms = Math.round(performance.now() - t2Start);
    const t2Failures: string[] = [];
    if (!/675|70%|qu[oó]rum|coeficiente/i.test(g2.response)) {
      t2Failures.push("Grupo Turno 2 no respondió con análisis Ley 675");
    }
    if (!g2.document || !Buffer.isBuffer(g2.document) || g2.document.length < 500) {
      t2Failures.push("Grupo Turno 2 no generó PDF de Concepto Propiedad Horizontal");
    }
    turns.push({
      turnNumber: 2,
      channel: "group_consulting",
      userMessage: msg2,
      replyPreview: g2.response.slice(0, 140),
      replyLength: g2.response.length,
      latencyMs: t2Ms,
      hadPdfAttachment: Boolean(g2.document),
      pdfFileName: g2.fileName,
      assertionsPassed: t2Failures.length === 0,
      failures: t2Failures,
    });

    // Turno 3: Cierre de satisfacción en grupo -> invitación autónoma a Google Reviews
    const msg3 = "@JanIA excelente concepto, muchas gracias";
    const t3Start = performance.now();
    const g3 = await processConsultingMessage(msg3, groupUserId, userName);
    const t3Ms = Math.round(performance.now() - t3Start);
    const t3Failures: string[] = [];
    if (!g3.response.includes("g.page/r/CctNbwU6UpX5EBM/review")) {
      t3Failures.push("Grupo Turno 3 no entregó invitación autónoma de Google Reviews");
    }
    turns.push({
      turnNumber: 3,
      channel: "group_consulting",
      userMessage: msg3,
      replyPreview: g3.response.slice(0, 140),
      replyLength: g3.response.length,
      latencyMs: t3Ms,
      hadPdfAttachment: false,
      assertionsPassed: t3Failures.length === 0,
      failures: t3Failures,
    });

    turns.forEach((t) => journeyFailures.push(...t.failures));
    journeys.push({
      journeyId: "journey_4_consultor_grupal_audio_pdf",
      title: "Consultor Grupal @JanIA (Audio PTT + Ley 675 PDF + Satisfacción)",
      expectedRole: "group_consultant",
      turns,
      totalLatencyMs: turns.reduce((acc, t) => acc + t.latencyMs, 0),
      maxInterceptorLatencyMs: Math.max(t1Ms, t2Ms),
      passed: journeyFailures.length === 0,
      failures: journeyFailures,
    });
  }

  const llmStats = getLlmUsageStats();
  const ttsStats = getTtsUsageStats();
  const telemetrySnapshot = await getOperationalTelemetrySnapshot();
  const zeroPaidCostVerified = llmStats.tier2PaidCalls === 0 && ttsStats.paidTtsCalls === 0;
  const allPassed = journeys.every((j) => j.passed) && zeroPaidCostVerified;

  return {
    executedAt: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    zeroPaidCostVerified,
    llmTier2PaidCalls: llmStats.tier2PaidCalls,
    ttsPaidCalls: ttsStats.paidTtsCalls,
    allPassed,
    journeys,
    telemetrySnapshot,
  };
}

