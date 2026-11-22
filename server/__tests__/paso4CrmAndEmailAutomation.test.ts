import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  CRM_PIPELINE_STAGES,
  isValidPipelineStage,
  mapLeadStatusToPipelineStage,
  mapPipelineStageToLeadStatus,
  validatePipelineTransition,
} from "../../shared/crm";
import {
  canAccessLead,
  canAccessTenantOwnedRecord,
  normalizeInquiryType,
  normalizeLeadEmailForStorage,
  type TenantAccessScope,
} from "../_core/crmService";
import {
  computeNextStepRunAt,
  decryptSmtpSecret,
  DEFAULT_LEAD_SEQUENCE_STEPS,
  DEFAULT_MATCH_SEQUENCE_STEPS,
  encryptSmtpSecret,
  evaluateSequenceEnrollmentStep,
  generateAiEmailDraft,
  isDeliverableEmail,
  renderEmailTemplate,
  validateSmtpHostSafety,
  wrapInBrandedEmailShell,
} from "../_core/emailAutomationEngine";
import {
  checkEmailQuotaLimit,
  DEFAULT_PLAN_CATALOG,
} from "../_core/planEntitlements";

describe("PASO 4 (v34.40) — CRM Inmobiliario Kanban y Gestor Automatizado de Correos con IA", () => {
  describe("1. Embudo Kanban y transiciones CRM", () => {
    it("define exactamente 7 etapas ordenadas del embudo y mapea status heredados", () => {
      expect(CRM_PIPELINE_STAGES.map((s) => s.id)).toEqual([
        "nuevo",
        "contactado",
        "calificado",
        "visita_agendada",
        "negociacion",
        "cerrado_ganado",
        "perdido",
      ]);
      expect(isValidPipelineStage("visita_agendada")).toBe(true);
      expect(isValidPipelineStage("etapa_inexistente")).toBe(false);

      expect(mapPipelineStageToLeadStatus("nuevo")).toBe("new");
      expect(mapPipelineStageToLeadStatus("contactado")).toBe("contacted");
      expect(mapPipelineStageToLeadStatus("negociacion")).toBe("qualified");
      expect(mapPipelineStageToLeadStatus("cerrado_ganado")).toBe("converted");
      expect(mapPipelineStageToLeadStatus("perdido")).toBe("rejected");

      expect(mapLeadStatusToPipelineStage("qualified")).toBe("calificado");
      expect(mapLeadStatusToPipelineStage("converted")).toBe("cerrado_ganado");
    });

    it("valida transiciones Kanban y distingue cambios reales de etapa", () => {
      const moved = validatePipelineTransition("nuevo", "visita_agendada");
      expect(moved.valid).toBe(true);
      expect(moved.isStageChange).toBe(true);

      const same = validatePipelineTransition("calificado", "calificado");
      expect(same.valid).toBe(true);
      expect(same.isStageChange).toBe(false);

      const invalid = validatePipelineTransition("nuevo", "desconocido");
      expect(invalid.valid).toBe(false);
    });

    it("normaliza correos faltantes de agenda sin romper BD y normaliza inquiryType", () => {
      expect(normalizeLeadEmailForStorage("Cliente@Dominio.com", "3001234567")).toBe(
        "cliente@dominio.com",
      );
      expect(normalizeLeadEmailForStorage("", "+57 316 656 9719")).toBe(
        "sin-correo-573166569719@vecy.local",
      );
      expect(isDeliverableEmail("sin-correo-573166569719@vecy.local")).toBe(false);
      expect(isDeliverableEmail("comprador@gmail.com")).toBe(true);

      expect(normalizeInquiryType("Venta")).toBe("buy");
      expect(normalizeInquiryType("Arriendo")).toBe("rent");
      expect(normalizeInquiryType("Inversión")).toBe("invest");
    });
  });

  describe("2. Aislamiento Multi-Tenant y cuotas de correo por plan", () => {
    const agentScope: TenantAccessScope = {
      userId: 101,
      isAdmin: false,
      agencyIdsAsManager: [],
      agencyIdsAsMember: [10],
      defaultAgencyId: 10,
    };

    const managerScope: TenantAccessScope = {
      userId: 200,
      isAdmin: false,
      agencyIdsAsManager: [10],
      agencyIdsAsMember: [10],
      defaultAgencyId: 10,
    };

    const adminScope: TenantAccessScope = {
      userId: 1,
      isAdmin: true,
      agencyIdsAsManager: [],
      agencyIdsAsMember: [],
      defaultAgencyId: null,
    };

    it("aísla leads, plantillas y mensajes entre agentes independientes, colegas y agencias", () => {
      expect(canAccessLead(agentScope, { agentId: 101, agencyId: 10 })).toBe(true);
      expect(canAccessLead(agentScope, { assignedAgentId: 101, agencyId: 10 })).toBe(true);
      // Un agente estándar NO accede a leads de otro compañero aunque compartan agencia 10
      expect(canAccessLead(agentScope, { agentId: 102, agencyId: 10 })).toBe(false);
      // Un agente estándar NO accede a leads de otra agencia 20
      expect(canAccessLead(agentScope, { agentId: 102, agencyId: 20 })).toBe(false);

      // Manager/owner de la agencia 10 SÍ ve leads de su agencia 10, pero NUNCA de agencia 20
      expect(canAccessLead(managerScope, { agentId: 102, agencyId: 10 })).toBe(true);
      expect(canAccessLead(managerScope, { agentId: 300, agencyId: 20 })).toBe(false);

      // Superadmin accede globalmente
      expect(canAccessLead(adminScope, { agentId: 300, agencyId: 20 })).toBe(true);

      // Registros propios de email/secuencias
      expect(canAccessTenantOwnedRecord(agentScope, { userId: 101, agencyId: 10 })).toBe(true);
      expect(canAccessTenantOwnedRecord(agentScope, { userId: 102, agencyId: 10 })).toBe(false);
      expect(canAccessTenantOwnedRecord(managerScope, { userId: 102, agencyId: 10 })).toBe(true);
      expect(canAccessTenantOwnedRecord(managerScope, { userId: 300, agencyId: 20 })).toBe(false);
    });

    it("expone maxEmailsPerMonth en todos los planes y bloquea al agotar cuota", () => {
      const byCode = Object.fromEntries(DEFAULT_PLAN_CATALOG.map((p) => [p.code, p]));
      expect(byCode.free.maxEmailsPerMonth).toBe(0);
      expect(byCode.agente_pro.maxEmailsPerMonth).toBe(100);
      expect(byCode.inmobiliaria_growth.maxEmailsPerMonth).toBe(500);
      expect(byCode.elite_ia.maxEmailsPerMonth).toBe(1500);

      expect(
        checkEmailQuotaLimit({ isAdmin: false, maxEmailsPerMonth: 0, used: 0 }).allowed,
      ).toBe(false);
      expect(
        checkEmailQuotaLimit({ isAdmin: false, maxEmailsPerMonth: 100, used: 99 }).allowed,
      ).toBe(true);
      expect(
        checkEmailQuotaLimit({ isAdmin: false, maxEmailsPerMonth: 100, used: 100 }).allowed,
      ).toBe(false);
      expect(
        checkEmailQuotaLimit({ isAdmin: true, maxEmailsPerMonth: 0, used: 5000 }).allowed,
      ).toBe(true);
    });
  });

  describe("3. Cifrado SMTP AES-256-GCM, renderizado HTML seguro y motor IA ($0 COP)", () => {
    it("cifra y descifra credenciales SMTP con AES-256-GCM y rechaza payloads manipulados", () => {
      const secret = "vecy-test-master-secret-2026";
      const plainPass = "AppPass#Smtp-987654";
      const encrypted = encryptSmtpSecret(plainPass, secret);

      expect(encrypted.startsWith("v1:")).toBe(true);
      expect(encrypted).not.toContain(plainPass);
      expect(decryptSmtpSecret(encrypted, secret)).toBe(plainPass);

      // Manipulación de un byte debe fallar en authTag GCM
      const tampered = encrypted.slice(0, -2) + (encrypted.endsWith("AA") ? "BB" : "AA");
      expect(() => decryptSmtpSecret(tampered, secret)).toThrow();
    });

    it("bloquea hosts SMTP privados/loopback y puertos inseguros", () => {
      expect(validateSmtpHostSafety("localhost", 587).valid).toBe(false);
      expect(validateSmtpHostSafety("127.0.0.1", 587).valid).toBe(false);
      expect(validateSmtpHostSafety("169.254.169.254", 587).valid).toBe(false);
      expect(validateSmtpHostSafety("smtp.zoho.com", 8080).valid).toBe(false);
      expect(validateSmtpHostSafety("smtp.zoho.com", 587).valid).toBe(true);
    });

    it("escapa XSS al renderizar plantillas y envuelve en shell corporativo", () => {
      const rendered = renderEmailTemplate(
        "<p>Hola {{lead_first_name}}, presupuesto {{lead_budget}}</p>",
        {
          lead_first_name: '<script>alert("xss")</script>Ana',
          lead_budget: "$450.000.000 COP",
        },
      );
      expect(rendered).not.toContain("<script>");
      expect(rendered).toContain("&lt;script&gt;");
      expect(rendered).toContain("$450.000.000 COP");

      const wrapped = wrapInBrandedEmailShell({
        bodyHtml: rendered,
        brandName: "Inmobiliaria Imperial",
        primaryColor: "#D4AF37",
        signatureHtml: "<strong>Asesora VIP</strong>",
      });
      expect(wrapped).toContain("Inmobiliaria Imperial");
      expect(wrapped).toContain("#D4AF37");
      expect(wrapped).toContain("Asesora VIP");
    });

    it("genera borradores IA sin red en tests usando datos reales del lead e inmueble", async () => {
      const morningBogota = new Date("2026-11-22T14:00:00.000Z"); // 09:00 AM Bogota
      const draft = await generateAiEmailDraft({
        lead: {
          name: "Carlos Andrés Torres",
          email: "carlos@example.com",
          inquiryType: "buy",
          preferredZone: "Cedritos",
          preferredCity: "Bogotá",
          estimatedBudget: "520000000",
        },
        property: {
          name: "Apartamento Exterior Cedritos 105 m²",
          propertyType: "apartment",
          transactionType: "venta",
          price: "510000000",
          zone: "Cedritos",
          city: "Bogotá",
          areaTotal: "105",
          bedrooms: 3,
          bathrooms: 2,
          garages: 2,
        },
        matchScore: 93,
        agentName: "Laura Gómez",
        agencyName: "Capital Raíz",
        agentPhone: "+57 300 111 2233",
        intent: "match_alert",
        referenceDate: morningBogota,
      });

      expect(draft.aiGenerated).toBe(true);
      expect(draft.usedFallback).toBe(true);
      expect(draft.subject).toContain("93%");
      expect(draft.subject).toContain("Cedritos");
      expect(draft.bodyText).toContain("Buenos días, Carlos Andrés");
      expect(draft.bodyText).toContain("Capital Raíz");
      expect(draft.bodyText).toContain("105 m²");
    });
  });

  describe("4. Máquina de estados de secuencias (0h / 24h / 72h / Match >= 85%)", () => {
    it("avanza secuencia 0h -> 24h -> 72h y se detiene cuando el lead cierra o se pierde", () => {
      const t0 = new Date("2026-11-22T15:00:00.000Z");

      // Paso 0 (0h) listo para enviar -> siguiente salto +24h
      const step0 = evaluateSequenceEnrollmentStep({
        enrollmentStatus: "active",
        currentStepIndex: 0,
        steps: DEFAULT_LEAD_SEQUENCE_STEPS,
        leadStage: "nuevo",
        stopOnStageChange: false,
        stopStages: ["cerrado_ganado", "perdido"],
        nextRunAt: t0,
        now: t0,
      });
      expect(step0.action).toBe("send_step");
      expect(step0.nextStepDelayDeltaHours).toBe(24);

      const t24 = computeNextStepRunAt(t0, step0.nextStepDelayDeltaHours!);
      expect(t24.getTime() - t0.getTime()).toBe(24 * 60 * 60 * 1000);

      // Paso 1 antes de 24h debe esperar
      const waitStep1 = evaluateSequenceEnrollmentStep({
        enrollmentStatus: "active",
        currentStepIndex: 1,
        steps: DEFAULT_LEAD_SEQUENCE_STEPS,
        leadStage: "contactado",
        stopOnStageChange: false,
        stopStages: ["cerrado_ganado", "perdido"],
        nextRunAt: t24,
        now: new Date(t0.getTime() + 5 * 60 * 60 * 1000),
      });
      expect(waitStep1.action).toBe("wait");

      // Paso 1 a las 24h -> siguiente salto +48h (total 72h)
      const sendStep1 = evaluateSequenceEnrollmentStep({
        enrollmentStatus: "active",
        currentStepIndex: 1,
        steps: DEFAULT_LEAD_SEQUENCE_STEPS,
        leadStage: "contactado",
        stopOnStageChange: false,
        stopStages: ["cerrado_ganado", "perdido"],
        nextRunAt: t24,
        now: t24,
      });
      expect(sendStep1.action).toBe("send_step");
      expect(sendStep1.nextStepDelayDeltaHours).toBe(48);

      // Si el lead pasa a cerrado_ganado, la secuencia se detiene
      const stopped = evaluateSequenceEnrollmentStep({
        enrollmentStatus: "active",
        currentStepIndex: 2,
        steps: DEFAULT_LEAD_SEQUENCE_STEPS,
        leadStage: "cerrado_ganado",
        stopOnStageChange: false,
        stopStages: ["cerrado_ganado", "perdido"],
        nextRunAt: t0,
        now: t0,
      });
      expect(stopped.action).toBe("stop_stage");

      expect(DEFAULT_MATCH_SEQUENCE_STEPS[0].delayHours).toBe(0);
    });

    it("verifica migración 0016, routers montados y cron cada 5 minutos sin tocar whatsapp-match", () => {
      const sql0016 = fs.readFileSync(
        path.resolve(process.cwd(), "drizzle/0016_crm_kanban_and_email_automation.sql"),
        "utf-8",
      );
      expect(sql0016).toContain('CREATE TABLE IF NOT EXISTS "crm_activities"');
      expect(sql0016).toContain('CREATE TABLE IF NOT EXISTS "email_accounts"');
      expect(sql0016).toContain('CREATE TABLE IF NOT EXISTS "email_templates"');
      expect(sql0016).toContain('CREATE TABLE IF NOT EXISTS "email_sequences"');
      expect(sql0016).toContain('CREATE TABLE IF NOT EXISTS "email_sequence_enrollments"');
      expect(sql0016).toContain('CREATE TABLE IF NOT EXISTS "email_messages"');

      const routersSrc = fs.readFileSync(path.resolve(process.cwd(), "server/routers.ts"), "utf-8");
      expect(routersSrc).toContain("crm: crmRouter");
      expect(routersSrc).toContain("emailAutomation: emailAutomationRouter");

      const cronSrc = fs.readFileSync(
        path.resolve(process.cwd(), "server/_core/cronService.ts"),
        "utf-8",
      );
      expect(cronSrc).toContain("processDueEmailAutomations");
      expect(cronSrc).toContain("*/5 * * * *");
    });
  });
});
