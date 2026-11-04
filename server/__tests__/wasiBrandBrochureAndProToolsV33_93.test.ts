import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { VECY_VERSION } from "../../shared/const";
import { PERSONALITY_PROMPTS } from "../routers/agent";
import { POINTS_MATRIX } from "../routers/affiliates";
import { appRouter } from "../routers";

describe("Suite 179 (v33.93): Wasi-IA Fichas Técnicas (Con Marca y Marca Blanca Cero Rastro), Sensores SEO/Puntos y Herramientas Pro Personalizables", () => {
  it("1. Verifica versión oficial v33.93 en shared/const.ts y package.json", () => {
    expect(VECY_VERSION).toBe("v33.93");
    const pkgPath = path.resolve(process.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    expect(pkg.version).toBe("33.93.0");
  });

  it("2. Verifica la directriz fundacional seed-wasi-ia-fichas-marca-blanca-agenda-pro-widget-v33-93 en founderKnowledgeService", () => {
    const teachingsPath = path.resolve(
      process.cwd(),
      "server/_core/jania/founderKnowledgeService.ts"
    );
    const teachingsSrc = fs.readFileSync(teachingsPath, "utf-8");
    expect(teachingsSrc).toContain(
      "seed-wasi-ia-fichas-marca-blanca-agenda-pro-widget-v33-93"
    );
    expect(teachingsSrc).toContain("Marca Blanca Neutra");
    expect(teachingsSrc).toContain("Vecy Agenda Pro Marca Propia");
    expect(teachingsSrc).toContain("Widget de Agente IA Personalizable");
  });

  it("3. Verifica las 6 personalidades configurables del Widget de Agente IA (Normal, Audaz, Profesional, Extrovertida, Seria, Cordial)", () => {
    expect(PERSONALITY_PROMPTS).toBeDefined();
    expect(Object.keys(PERSONALITY_PROMPTS)).toEqual(
      expect.arrayContaining([
        "normal",
        "audaz",
        "profesional",
        "extrovertida",
        "seria",
        "cordial",
      ])
    );
    expect(PERSONALITY_PROMPTS.audaz.toLowerCase()).toContain("audaz");
    expect(PERSONALITY_PROMPTS.profesional.toLowerCase()).toContain("ejecutivo");
    expect(PERSONALITY_PROMPTS.extrovertida.toLowerCase()).toContain("entusiasta");
    expect(PERSONALITY_PROMPTS.seria.toLowerCase()).toContain("sobrio");
    expect(PERSONALITY_PROMPTS.cordial.toLowerCase()).toContain("empático");
  });

  it("4. Verifica la matriz de puntos (POINTS_MATRIX) del sensor de telemetría y atribución colaborativa", () => {
    expect(POINTS_MATRIX).toEqual({
      view: 2,
      engaged_read: 10,
      pdf_download: 15,
      qr_scan: 20,
      whatsapp_click: 25,
      share: 5,
      lead_conversion: 100,
    });
  });

  it("5. Verifica que agentRouter y affiliatesRouter estén montados en appRouter con todos sus procedimientos", () => {
    const procedures = Object.keys(appRouter._def.procedures);
    expect(procedures).toContain("agent.getProfile");
    expect(procedures).toContain("agent.getStoreBySubdomain");
    expect(procedures).toContain("agent.getMyBrandConfig");
    expect(procedures).toContain("agent.updateBrandConfig");
    expect(procedures).toContain("agent.chatWithCustomAgent");

    expect(procedures).toContain("affiliates.generateLink");
    expect(procedures).toContain("affiliates.resolveToken");
    expect(procedures).toContain("affiliates.trackTelemetryEvent");
    expect(procedures).toContain("affiliates.getMyStats");
  });

  it("6. Verifica que UnbrandedFicha.tsx esté conectado a PostgreSQL (trpc.properties.getById) y soporte los 3 modos de marca + QR + Telemetría", () => {
    const fichaPath = path.resolve(
      process.cwd(),
      "client/src/pages/UnbrandedFicha.tsx"
    );
    const content = fs.readFileSync(fichaPath, "utf-8");
    expect(content).toContain("trpc.properties.getById.useQuery");
    expect(content).toContain("trpc.affiliates.trackTelemetryEvent.useMutation");
    expect(content).toContain("Mi Marca (Estilo Wasi)");
    expect(content).toContain("Marca Blanca Neutra (Cero Rastro)");
    expect(content).toContain("pdf_qr");
    expect(content).toContain("engaged_read");
    expect(content).toContain("pdf_download");
  });

  it("7. Verifica el enrutamiento multi-tenant de notificaciones de Vecy Agenda Pro hacia correo y WhatsApp propios del suscriptor", () => {
    const agendaWaPath = path.resolve(
      process.cwd(),
      "server/_core/agendaWhatsAppService.ts"
    );
    const agendaEmailPath = path.resolve(
      process.cwd(),
      "server/_core/emailContractService.ts"
    );
    const agendaRouterPath = path.resolve(
      process.cwd(),
      "server/routers/agenda.ts"
    );

    const waContent = fs.readFileSync(agendaWaPath, "utf-8");
    const emailContent = fs.readFileSync(agendaEmailPath, "utf-8");
    const routerContent = fs.readFileSync(agendaRouterPath, "utf-8");

    expect(waContent).toContain("customAgentWhatsapp");
    expect(waContent).toContain("customAgencyName");
    expect(emailContent).toContain("customAgentEmail");
    expect(emailContent).toContain("customAgencyName");
    expect(routerContent).toContain("customAgentWhatsapp");
    expect(routerContent).toContain("customAgentEmail");
  });

  it("8. Verifica la existencia e integración de AgentMicrosite.tsx, AgentProToolsWidget.tsx y las pestañas Wasi-IA en AgentDashboard.tsx", () => {
    const micrositePath = path.resolve(
      process.cwd(),
      "client/src/pages/AgentMicrosite.tsx"
    );
    const widgetPath = path.resolve(
      process.cwd(),
      "client/src/components/AgentProToolsWidget.tsx"
    );
    const dashboardPath = path.resolve(
      process.cwd(),
      "client/src/pages/AgentDashboard.tsx"
    );
    const appPath = path.resolve(process.cwd(), "client/src/App.tsx");

    expect(fs.existsSync(micrositePath)).toBe(true);
    expect(fs.existsSync(widgetPath)).toBe(true);

    const dashboardContent = fs.readFileSync(dashboardPath, "utf-8");
    expect(dashboardContent).toContain("UnifiedPublishModal");
    expect(dashboardContent).toContain("Mi Sitio & Marca (Wasi IA)");
    expect(dashboardContent).toContain("Herramientas Pro & Agente IA");
    expect(dashboardContent).toContain("Métricas SEO & Puntos");

    const appContent = fs.readFileSync(appPath, "utf-8");
    expect(appContent).toContain("/s/:slug");
    expect(appContent).toContain("/agencia/:slug");
  });
});
