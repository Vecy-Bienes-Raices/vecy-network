import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { VECY_VERSION } from "../../shared/const";
import {
  PERSONALITY_PROMPTS,
  VIRTUAL_STAGING_STYLES,
  CONTRACT_TEMPLATES_CATALOG,
} from "../routers/agent";
import { POINTS_MATRIX } from "../routers/affiliates";
import { appRouter } from "../routers";

describe("Suite 179 & 180 (v33.93 - v33.94): Wasi-IA Fichas Técnicas, Sensores SEO/Puntos y Las 7 Herramientas Pro Personalizables (Qrador Search, Habi Valuator, Matterport Staging, DocuSign Contracts)", () => {
  it("1. Verifica versión oficial v33.94+ en shared/const.ts y package.json", () => {
    expect(VECY_VERSION).toMatch(/^v33\.(9[4-9]|\d{3,})/);
    const pkgPath = path.resolve(process.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    expect(pkg.version).toMatch(/^33\.(9[4-9]|\d{3,})\.0$/);
  });

  it("2. Verifica las directrices fundacionales v33.93 y v33.94 en founderKnowledgeService", () => {
    const teachingsPath = path.resolve(
      process.cwd(),
      "server/_core/jania/founderKnowledgeService.ts"
    );
    const teachingsSrc = fs.readFileSync(teachingsPath, "utf-8");
    expect(teachingsSrc).toContain(
      "seed-wasi-ia-fichas-marca-blanca-agenda-pro-widget-v33-93"
    );
    expect(teachingsSrc).toContain(
      "seed-suite-proptech-ia-qrador-habi-staging-docusign-v33-94"
    );
    expect(teachingsSrc).toContain("Qrador");
    expect(teachingsSrc).toContain("Habi/Casacol");
    expect(teachingsSrc).toContain("Matterport");
    expect(teachingsSrc).toContain("DocuSign/Autentic");
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

  it("5. Verifica que agentRouter y affiliatesRouter estén montados en appRouter con los nuevos procedimientos Proptech (Qrador, Habi, Staging, DocuSign)", () => {
    const procedures = Object.keys(appRouter._def.procedures);
    expect(procedures).toContain("agent.getProfile");
    expect(procedures).toContain("agent.getStoreBySubdomain");
    expect(procedures).toContain("agent.getMyBrandConfig");
    expect(procedures).toContain("agent.updateBrandConfig");
    expect(procedures).toContain("agent.chatWithCustomAgent");
    expect(procedures).toContain("agent.semanticCuratorSearch");
    expect(procedures).toContain("agent.calculateInstantValuation");
    expect(procedures).toContain("agent.generateVirtualStagingPlan");
    expect(procedures).toContain("agent.generateBrandedLegalContract");

    expect(procedures).toContain("affiliates.generateLink");
    expect(procedures).toContain("affiliates.resolveToken");
    expect(procedures).toContain("affiliates.trackTelemetryEvent");
    expect(procedures).toContain("affiliates.getMyStats");
  });

  it("6. Verifica los 5 estilos de Home Staging Virtual IA y las 4 Minutas Legales Ley 527", () => {
    expect(Object.keys(VIRTUAL_STAGING_STYLES)).toEqual(
      expect.arrayContaining([
        "modern-scandinavian",
        "luxury-minimalist",
        "industrial-loft",
        "executive-office",
        "declutter-clean",
      ])
    );
    expect(Object.keys(CONTRACT_TEMPLATES_CATALOG)).toEqual(
      expect.arrayContaining([
        "arrendamiento_vivienda",
        "promesa_compraventa",
        "mandato_consignacion",
        "presentacion_cliente",
      ])
    );
  });

  it("7. Verifica que UnbrandedFicha.tsx esté conectado a PostgreSQL y soporte los 3 modos de marca + QR + Telemetría", () => {
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

  it("8. Verifica la existencia e integración de AgentProptechSuite.tsx en AgentMicrosite.tsx y AgentDashboard.tsx", () => {
    const suitePath = path.resolve(
      process.cwd(),
      "client/src/components/AgentProptechSuite.tsx"
    );
    const micrositePath = path.resolve(
      process.cwd(),
      "client/src/pages/AgentMicrosite.tsx"
    );
    const dashboardPath = path.resolve(
      process.cwd(),
      "client/src/pages/AgentDashboard.tsx"
    );

    expect(fs.existsSync(suitePath)).toBe(true);
    const suiteContent = fs.readFileSync(suitePath, "utf-8");
    expect(suiteContent).toContain("Curador IA (Estilo Qrador)");
    expect(suiteContent).toContain("Avalúo ACM Instantáneo");
    expect(suiteContent).toContain("Home Staging IA");
    expect(suiteContent).toContain("Contratos Digitales Ley 527");

    const micrositeContent = fs.readFileSync(micrositePath, "utf-8");
    expect(micrositeContent).toContain("AgentProptechSuite");

    const dashboardContent = fs.readFileSync(dashboardPath, "utf-8");
    expect(dashboardContent).toContain("AgentProptechSuite");
    expect(dashboardContent).toContain("Guardar y Activar Mis 7 Herramientas Pro");
  });
});
