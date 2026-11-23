import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  formatBogotaDateTime,
  MAILSUITE_COLOR_GRAY,
  MAILSUITE_COLOR_GREEN,
  MAILSUITE_COLOR_RED,
  resolveMailsuiteVisualStatus,
} from "../../shared/mailsuiteStatus";

describe("v34.44 (PASO 7) — Gestor Webmail Simplificado y Chulitos Visuales tipo Mailsuite", () => {
  describe("1. Lógica pura de estados Mailsuite (✓✓ verde/gris vs ✓✓ dos verdes)", () => {
    it("resuelve sent + openCount=0 como sent_unread: primer chulito verde (#10B981) y segundo gris (#9CA3AF)", () => {
      const res = resolveMailsuiteVisualStatus({
        status: "sent",
        openCount: 0,
        clickCount: 0,
        sentAt: "2026-11-23T14:00:00.000Z", // 09:00:00 AM COT
      });

      expect(res.state).toBe("sent_unread");
      expect(res.checkCount).toBe(2);
      expect(res.firstCheckColor).toBe(MAILSUITE_COLOR_GREEN);
      expect(res.firstCheckColor).toBe("#10B981");
      expect(res.secondCheckColor).toBe(MAILSUITE_COLOR_GRAY);
      expect(res.secondCheckColor).toBe("#9CA3AF");
      expect(res.iconType).toBe("double_check_unread");
      expect(res.shortLabel).toBe("Enviado · Pendiente de lectura");
      expect(res.tooltipTitle).toBe("Enviado · Pendiente de lectura");
      expect(res.tooltipText).toContain("America/Bogota");
      expect(res.tooltipText).toContain("09:00:00 AM");
    });

    it("resuelve sent + openCount>=1 como opened_read: dos chulitos verde esmeralda (#10B981) con fechas America/Bogota", () => {
      const singleOpen = resolveMailsuiteVisualStatus({
        status: "sent",
        openCount: 1,
        clickCount: 0,
        firstOpenedAt: "2026-11-23T14:04:12.000Z", // 09:04:12 AM COT
        lastOpenedAt: "2026-11-23T14:04:12.000Z",
      });

      expect(singleOpen.state).toBe("opened_read");
      expect(singleOpen.checkCount).toBe(2);
      expect(singleOpen.firstCheckColor).toBe("#10B981");
      expect(singleOpen.secondCheckColor).toBe("#10B981");
      expect(singleOpen.iconType).toBe("double_check_read");
      expect(singleOpen.shortLabel).toBe("Leído");
      expect(singleOpen.tooltipText).toContain("Leído 1 vez");
      expect(singleOpen.tooltipText).toContain("Primera apertura: 23/11/2026 09:04:12 AM (America/Bogota)");

      const multiOpen = resolveMailsuiteVisualStatus({
        status: "sent",
        openCount: 3,
        clickCount: 2,
        firstOpenedAt: "2026-11-23T14:04:12.000Z",
        lastOpenedAt: "2026-11-23T19:15:30.000Z", // 02:15:30 PM COT
      });

      expect(multiOpen.state).toBe("opened_read");
      expect(multiOpen.firstCheckColor).toBe("#10B981");
      expect(multiOpen.secondCheckColor).toBe("#10B981");
      expect(multiOpen.shortLabel).toBe("Leído (3x)");
      expect(multiOpen.tooltipLines).toEqual([
        "Leído 3 veces · 2 clics en enlaces",
        "Primera apertura: 23/11/2026 09:04:12 AM (America/Bogota)",
        "Última apertura: 23/11/2026 02:15:30 PM (America/Bogota)",
      ]);
    });

    it("resuelve estados queued, draft, failed, quota_blocked y cancelled sin chulitos y con íconos en gris o rojo", () => {
      const queued = resolveMailsuiteVisualStatus({
        status: "queued",
        openCount: 0,
        scheduledFor: "2026-11-24T15:00:00.000Z", // 10:00:00 AM COT
      });
      expect(queued.state).toBe("queued");
      expect(queued.checkCount).toBe(0);
      expect(queued.iconType).toBe("clock");
      expect(queued.iconColor).toBe(MAILSUITE_COLOR_GRAY);
      expect(queued.shortLabel).toBe("En cola");
      expect(queued.tooltipText).toContain("10:00:00 AM (America/Bogota)");

      const draft = resolveMailsuiteVisualStatus({ status: "draft" });
      expect(draft.state).toBe("draft");
      expect(draft.checkCount).toBe(0);
      expect(draft.iconType).toBe("draft");
      expect(draft.iconColor).toBe("#9CA3AF");
      expect(draft.shortLabel).toBe("Borrador");

      const failed = resolveMailsuiteVisualStatus({
        status: "failed",
        errorMessage: "SMTP 550 mailbox unavailable",
      });
      expect(failed.state).toBe("error");
      expect(failed.checkCount).toBe(0);
      expect(failed.iconType).toBe("error");
      expect(failed.iconColor).toBe(MAILSUITE_COLOR_RED);
      expect(failed.iconColor).toBe("#EF4444");
      expect(failed.tooltipText).toContain("SMTP 550 mailbox unavailable");

      const quota = resolveMailsuiteVisualStatus({ status: "quota_blocked" });
      expect(quota.state).toBe("error");
      expect(quota.shortLabel).toBe("Cuota agotada");
      expect(quota.iconColor).toBe("#EF4444");

      const cancelled = resolveMailsuiteVisualStatus({ status: "cancelled" });
      expect(cancelled.state).toBe("error");
      expect(cancelled.shortLabel).toBe("Cancelado");
      expect(cancelled.iconColor).toBe("#EF4444");
    });

    it("normaliza edge cases: openCount negativo/nulo y fechas inválidas sin lanzar excepciones", () => {
      expect(formatBogotaDateTime("not-a-date")).toBeNull();
      expect(formatBogotaDateTime(null)).toBeNull();

      const res = resolveMailsuiteVisualStatus({
        status: "sent",
        openCount: -3,
        clickCount: null,
        sentAt: "fecha-invalida",
      });
      expect(res.state).toBe("sent_unread");
      expect(res.openCount).toBe(0);
      expect(res.clickCount).toBe(0);
      expect(res.firstCheckColor).toBe("#10B981");
      expect(res.secondCheckColor).toBe("#9CA3AF");
    });
  });

  describe("2. Integración UI Webmail Simplificado, Indicador Mailsuite y Router sin leadId obligatorio", () => {
    it("verifica MailsuiteCheckIndicator, EmailAutomationPanel (2 pestañas), LeadDetailDrawer, Admin y AgentDashboard", () => {
      const root = process.cwd();
      const indicatorSrc = fs.readFileSync(
        path.resolve(root, "client/src/components/crm/MailsuiteCheckIndicator.tsx"),
        "utf-8",
      );
      expect(indicatorSrc).toContain("resolveMailsuiteVisualStatus");
      expect(indicatorSrc).toContain('role="tooltip"');
      expect(indicatorSrc).toContain("interestfor");
      expect(indicatorSrc).toContain('popover: "hint"');

      const panelSrc = fs.readFileSync(
        path.resolve(root, "client/src/components/crm/EmailAutomationPanel.tsx"),
        "utf-8",
      );
      expect(panelSrc).toContain("Redactar y Enviados");
      expect(panelSrc).toContain("Configuración y Automatización");
      expect(panelSrc).toContain("Enviar Correo Certificado");
      expect(panelSrc).toContain("Redactar con IA");
      expect(panelSrc).toContain("PDF Ley 527");
      expect(panelSrc).toContain("Alertas en vivo de apertura");
      expect(panelSrc).toContain("MailsuiteCheckIndicator");

      const drawerSrc = fs.readFileSync(
        path.resolve(root, "client/src/components/crm/LeadDetailDrawer.tsx"),
        "utf-8",
      );
      expect(drawerSrc).toContain("MailsuiteCheckIndicator");
      expect(drawerSrc).toContain("Constancia PDF (Ley 527)");
      expect(drawerSrc).toContain("notifyOnOpen");

      const adminSrc = fs.readFileSync(
        path.resolve(root, "client/src/pages/Admin.tsx"),
        "utf-8",
      );
      expect(adminSrc).toContain("EmailAutomationPanel");
      expect(adminSrc).toContain("Correos Certificados");
      expect(adminSrc).toContain("case 'emails'");

      const agentDashSrc = fs.readFileSync(
        path.resolve(root, "client/src/pages/AgentDashboard.tsx"),
        "utf-8",
      );
      expect(agentDashSrc).toContain("EmailAutomationPanel");
      expect(agentDashSrc).toContain("Correos Certificados");
      expect(agentDashSrc).toContain("Redactar Correo");

      const routerSrc = fs.readFileSync(
        path.resolve(root, "server/routers/emailAutomation.ts"),
        "utf-8",
      );
      expect(routerSrc).toContain("leadId: z.number().int().positive().optional().nullable()");
      expect(routerSrc).toContain("recipientEmail:");
    });
  });
});
