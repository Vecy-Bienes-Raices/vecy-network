import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_PLAN_CATALOG,
  MAX_MONTHLY_PLAN_PRICE_COP,
  checkAiMessageQuotaLimit,
  checkLegalToolQuotaLimit,
} from "../_core/planEntitlements";
import {
  computeFinancialOrNotarialSnippet,
  decryptChannelSecret,
  detectPrivateJaniaIntents,
  encryptChannelSecret,
  filterAndRankTenantInventory,
  hashVerifyToken,
  type RagPropertyCandidate,
} from "../_core/privateJaniaService";
import {
  clearProcessedCloudMessageIdsForTest,
  parseWhatsAppCloudWebhookPayload,
  routeWhatsAppCloudWebhookPost,
  verifyMetaWebhookSignature,
} from "../_core/whatsappCloudTenantService";
import {
  CALENDARIO_30_DIAS_VECY,
  DAILY_EDITORIAL_PILLARS_V34_41,
  buildDailyRoutineGuidanceBlock,
  getDailyEditorialPillar,
} from "../_core/cronService";
import { SEED_TEACHINGS } from "../_core/jania/founderKnowledgeService";

describe("PASO 5 (v34.41) — Agente JanIA Privado, Suite Legal SaaS y WhatsApp Cloud BYO-Number", () => {
  describe("1. Aislamiento Multi-Tenant en RAG de Inventario", () => {
    const sampleCatalog: RagPropertyCandidate[] = [
      {
        id: 101,
        name: "Apartamento Chicó Norte Propio",
        propertyType: "Apartamento",
        transactionType: "venta",
        price: "780000000",
        city: "Bogotá",
        zone: "Chicó",
        bedrooms: 3,
        agentId: 10,
        agencyId: 500,
        available: true,
        aceptaTerceria: true,
        republishToVecyStore: true,
        visibilityScope: "public_and_agent",
      },
      {
        id: 102,
        name: "Casa Privada Exclusiva de Otro Agente",
        propertyType: "Apartamento",
        transactionType: "venta",
        price: "720000000",
        city: "Bogotá",
        zone: "Chicó",
        bedrooms: 3,
        agentId: 99,
        agencyId: 999,
        available: true,
        aceptaTerceria: true,
        republishToVecyStore: true,
        visibilityScope: "private",
      },
      {
        id: 103,
        name: "Apartamento Sin Tercería de Otro Agente",
        propertyType: "Apartamento",
        transactionType: "venta",
        price: "750000000",
        city: "Bogotá",
        zone: "Rosales",
        bedrooms: 3,
        agentId: 88,
        agencyId: 888,
        available: true,
        aceptaTerceria: false,
        republishToVecyStore: true,
        visibilityScope: "public_and_agent",
      },
      {
        id: 104,
        name: "Apartamento Colaborativo Red Aliada",
        propertyType: "Apartamento",
        transactionType: "venta",
        price: "790000000",
        city: "Bogotá",
        zone: "Santa Bárbara",
        bedrooms: 3,
        agentId: 77,
        agencyId: 777,
        available: true,
        aceptaTerceria: true,
        republishToVecyStore: true,
        visibilityScope: "public_and_agent",
      },
      {
        id: 105,
        name: "Inmueble No Disponible Propio",
        propertyType: "Apartamento",
        transactionType: "venta",
        price: "700000000",
        city: "Bogotá",
        zone: "Cedritos",
        bedrooms: 3,
        agentId: 10,
        agencyId: 500,
        available: false,
        aceptaTerceria: true,
        republishToVecyStore: true,
        visibilityScope: "public_and_agent",
      },
    ];

    it("prioriza inventario propio, bloquea registros privados/sin tercería de terceros y respeta includeNetworkInventory=false", () => {
      const withNetwork = filterAndRankTenantInventory(sampleCatalog, {
        tenantUserId: 10,
        tenantAgencyId: 500,
        includeOwnInventory: true,
        includeNetworkInventory: true,
        query: "Busco apartamento en Bogotá de 3 alcobas hasta 800 millones",
        limit: 5,
      });

      const idsWithNetwork = withNetwork.map((p) => p.id);
      expect(idsWithNetwork).toContain(101);
      expect(idsWithNetwork).toContain(104);
      expect(idsWithNetwork).not.toContain(102);
      expect(idsWithNetwork).not.toContain(103);
      expect(idsWithNetwork).not.toContain(105);
      expect(withNetwork[0].id).toBe(101);
      expect(withNetwork[0].isOwnProperty).toBe(true);

      const ownOnly = filterAndRankTenantInventory(sampleCatalog, {
        tenantUserId: 10,
        tenantAgencyId: 500,
        includeOwnInventory: true,
        includeNetworkInventory: false,
        query: "Apartamento en Bogotá",
        limit: 5,
      });

      expect(ownOnly.map((p) => p.id)).toEqual([101]);
    });
  });

  describe("2. Cifrado AES-256-GCM de Canales e Intenciones + Cálculos Reales", () => {
    it("cifra y descifra secretos Meta con AES-256-GCM y rechaza alteraciones o clave distinta", () => {
      const secret = "EAAG_test_meta_token_12345";
      const cipherText = encryptChannelSecret(secret, "master-key-a");
      expect(cipherText.startsWith("v1:")).toBe(true);
      expect(cipherText).not.toContain(secret);

      expect(decryptChannelSecret(cipherText, "master-key-a")).toBe(secret);
      expect(() => decryptChannelSecret(cipherText, "master-key-b")).toThrow();

      const hash = hashVerifyToken("verify-secret-vecy");
      expect(hash).toHaveLength(64);
      expect(hash).toBe(hashVerifyToken("  verify-secret-vecy  "));
    });

    it("detecta intenciones notariales, financieras, agenda de visita y ejecuta liquidación COP", () => {
      const msg =
        "Hola, me llamo Laura Méndez, mi celular es 3161234567 y correo laura@example.com. Quiero agendar visita mañana 10:00 am y saber cuánto valen los gastos notariales y cuota del crédito para 600 millones.";
      const intents = detectPrivateJaniaIntents(msg);
      expect(intents.wantsNotarialCalc).toBe(true);
      expect(intents.wantsMortgageCalc).toBe(true);
      expect(intents.wantsVisitSchedule).toBe(true);
      expect(intents.extractedPriceCop).toBe(600_000_000);
      expect(intents.extractedEmail).toBe("laura@example.com");
      expect(intents.extractedPhone).toBe("3161234567");

      const calc = computeFinancialOrNotarialSnippet(msg, 600_000_000);
      expect(calc.notarialSummary).toContain("Estimación notarial y de registro");
      expect(calc.notarialSummary).toContain("Retefuente");
      expect(calc.financialSummary).toContain("Simulación referencial");
    });
  });

  describe("3. Cuotas SaaS IA y Suite Legal (Precios <= $200.000 COP/mes)", () => {
    it("mantiene todos los planes <= $200.000 COP/mes y expone cuotas IA/CTL/Identidad/Avalúo", () => {
      for (const plan of DEFAULT_PLAN_CATALOG) {
        expect(plan.monthlyPriceCop).toBeLessThanOrEqual(MAX_MONTHLY_PLAN_PRICE_COP);
        expect(typeof plan.maxAiMessagesMonth).toBe("number");
        expect(typeof plan.maxCtlStudiesMonth).toBe("number");
        expect(typeof plan.maxIdentityChecksMonth).toBe("number");
        expect(typeof plan.maxValuationsMonth).toBe("number");
      }

      const elite = DEFAULT_PLAN_CATALOG.find((p) => p.code === "elite_ia");
      const growth = DEFAULT_PLAN_CATALOG.find((p) => p.code === "inmobiliaria_growth");
      expect(elite?.whatsappCloudByoEnabled).toBe(true);
      expect(growth?.whatsappCloudByoEnabled).toBe(false);
    });

    it("aplica bloqueos estrictos en checkAiMessageQuotaLimit y checkLegalToolQuotaLimit", () => {
      expect(
        checkAiMessageQuotaLimit({
          isAdmin: false,
          privateJaniaEnabled: false,
          maxAiMessagesMonth: 0,
          used: 0,
        }).allowed,
      ).toBe(false);

      expect(
        checkAiMessageQuotaLimit({
          isAdmin: false,
          privateJaniaEnabled: true,
          maxAiMessagesMonth: 800,
          used: 799,
        }),
      ).toEqual({ allowed: true, remaining: 1 });

      expect(
        checkAiMessageQuotaLimit({
          isAdmin: false,
          privateJaniaEnabled: true,
          maxAiMessagesMonth: 800,
          used: 800,
        }).allowed,
      ).toBe(false);

      expect(
        checkAiMessageQuotaLimit({
          isAdmin: true,
          privateJaniaEnabled: false,
          maxAiMessagesMonth: 0,
          used: 9999,
        }).allowed,
      ).toBe(true);

      expect(
        checkLegalToolQuotaLimit({
          isAdmin: false,
          toolType: "ctl_study",
          maxAllowed: 0,
          used: 0,
        }).allowed,
      ).toBe(false);

      expect(
        checkLegalToolQuotaLimit({
          isAdmin: false,
          toolType: "ctl_study",
          maxAllowed: 15,
          used: 15,
        }).allowed,
      ).toBe(false);

      expect(
        checkLegalToolQuotaLimit({
          isAdmin: false,
          toolType: "valuation",
          maxAllowed: 60,
          used: 12,
        }),
      ).toEqual({ allowed: true, remaining: 48 });
    });
  });

  describe("4. Enrutamiento Multi-Tenant WhatsApp Cloud API BYO-Number (Plan Élite IA)", () => {
    beforeEach(() => {
      clearProcessedCloudMessageIdsForTest();
    });

    it("verifica firma HMAC SHA-256 X-Hub-Signature-256 y parsea mensajes entrantes ignorando statuses", () => {
      const appSecret = "meta-app-secret-test-999";
      const payload = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "WABA_123",
            changes: [
              {
                field: "messages",
                value: {
                  metadata: {
                    phone_number_id: "PN_ELITE_01",
                    display_phone_number: "+573001112233",
                  },
                  contacts: [{ wa_id: "573158889900", profile: { name: "Camila Torres" } }],
                  messages: [
                    {
                      id: "wamid.HBgMNTczMTU=",
                      from: "573158889900",
                      timestamp: "1760000000",
                      type: "text",
                      text: { body: "Hola Sofía IA, busco apartamento en Cedritos" },
                    },
                  ],
                },
              },
              {
                field: "messages",
                value: {
                  metadata: { phone_number_id: "PN_ELITE_01" },
                  statuses: [{ id: "wamid.status.1", status: "delivered" }],
                },
              },
            ],
          },
        ],
      };

      const rawBody = JSON.stringify(payload);
      const validSig =
        "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");

      expect(verifyMetaWebhookSignature(rawBody, validSig, appSecret)).toBe(true);
      expect(verifyMetaWebhookSignature(rawBody, "sha256=deadbeef", appSecret)).toBe(false);

      const parsed = parseWhatsAppCloudWebhookPayload(payload);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toMatchObject({
        phoneNumberId: "PN_ELITE_01",
        from: "573158889900",
        contactName: "Camila Torres",
        messageId: "wamid.HBgMNTczMTU=",
      });
    });

    it("enruta al tenant propietario con deduplicación, valida plan Élite IA y nunca toca Baileys", async () => {
      const appSecret = "meta-secret-byo-01";
      const payload = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "WABA_777",
            changes: [
              {
                field: "messages",
                value: {
                  metadata: { phone_number_id: "PN_TENANT_42" },
                  contacts: [{ wa_id: "573112223344", profile: { name: "Andrés Rojas" } }],
                  messages: [
                    {
                      id: "wamid.unique.42",
                      from: "573112223344",
                      type: "text",
                      text: { body: "Quiero agendar visita" },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };
      const rawBody = JSON.stringify(payload);
      const validSig =
        "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");

      let sentPayloads: Array<{ phoneNumberId: string; to: string; text: string }> = [];

      const res1 = await routeWhatsAppCloudWebhookPost({
        payload,
        rawBody,
        signatureHeader: validSig,
        channelResolver: async (pnId) =>
          pnId === "PN_TENANT_42"
            ? {
                id: 7,
                userId: 42,
                agencyId: 8,
                phoneNumberId: "PN_TENANT_42",
                isActive: true,
                accessTokenPlain: "token-42",
                appSecretPlain: appSecret,
              }
            : null,
        entitlementChecker: async (userId) => userId === 42,
        turnExecutor: async (turn) => ({
          reply: `Hola ${turn.visitorName}, agendemos tu visita en el portafolio del tenant ${turn.agentUserId}.`,
          botName: "Sofía IA",
          agencyName: "Inmobiliaria Élite 42",
          matchedProperties: [],
          notarialSummary: null,
          financialSummary: null,
          leadId: 901,
          visitBooked: false,
          appointmentCode: null,
          blockedByQuota: false,
          quota: { used: 1, limit: 3000, remaining: 2999, periodKey: "2026-11" },
        }),
        sendReplyFn: async (s) => {
          sentPayloads.push({ phoneNumberId: s.phoneNumberId, to: s.to, text: s.text });
          return { ok: true, status: 200, messageId: "outbound-42" };
        },
      });

      expect(res1.processed).toBe(1);
      expect(res1.skipped).toBe(0);
      expect(res1.routes[0]).toMatchObject({ tenantUserId: 42, phoneNumberId: "PN_TENANT_42" });
      expect(sentPayloads).toHaveLength(1);
      expect(sentPayloads[0].text).toContain("tenant 42");

      // Re-entrega duplicada del mismo wamid debe omitirse sin volver a cobrar ni responder
      const resDuplicate = await routeWhatsAppCloudWebhookPost({
        payload,
        rawBody,
        signatureHeader: validSig,
      });
      expect(resDuplicate.processed).toBe(0);
      expect(resDuplicate.skipped).toBe(1);
      expect(sentPayloads).toHaveLength(1);

      // Nuevo wamid con firma inválida debe rechazarse
      clearProcessedCloudMessageIdsForTest();
      const resBadSig = await routeWhatsAppCloudWebhookPost({
        payload,
        rawBody,
        signatureHeader: "sha256=00000000000000000000000000000000",
        channelResolver: async () => ({
          id: 7,
          userId: 42,
          agencyId: 8,
          phoneNumberId: "PN_TENANT_42",
          isActive: true,
          accessTokenPlain: "token-42",
          appSecretPlain: appSecret,
        }),
        entitlementChecker: async () => true,
      });
      expect(resBadSig.processed).toBe(0);
      expect(resBadSig.skipped).toBe(1);
      expect(resBadSig.errors[0]).toContain("X-Hub-Signature-256 inválida");
    });
  });

  describe("5. Base de Conocimiento y Rutina Diaria de JanIA (v34.41)", () => {
    it("actualiza enseñanzas fundacionales y mantiene calendario de 30 días + pilares rotativos", () => {
      const seedIds = SEED_TEACHINGS.filter((t) => t.active).map((t) => t.id);
      expect(seedIds).toContain("seed-paso5-jania-privada-suite-legal-vecygroup-v34-41");
      expect(seedIds).toContain("seed-guia-participacion-jania-emojis-match-85-v34-41");
      expect(seedIds).toContain("seed-rutina-diaria-comunidad-grupos-oficiales-externos-v34-41");

      expect(CALENDARIO_30_DIAS_VECY).toHaveLength(30);
      expect(DAILY_EDITORIAL_PILLARS_V34_41.length).toBeGreaterThanOrEqual(5);
      expect(getDailyEditorialPillar(3).key).toBe("avances_ia_proptech");

      const block = buildDailyRoutineGuidanceBlock(5);
      expect(block).toContain("https://vecygroup.com");
      expect(block).toContain("@JanIA");
      expect(block).toContain("👍");
      expect(block).toContain("📝");
      expect(block).toContain("85%");
    });

    it("actualiza circuloHandler.ts con el estado real de vecygroup.com sin afirmaciones obsoletas", () => {
      const circuloSrc = fs.readFileSync(
        path.resolve(process.cwd(), "server/_core/jania/handlers/circuloHandler.ts"),
        "utf-8",
      );
      expect(circuloSrc).toContain("https://vecygroup.com");
      expect(circuloSrc).toContain("@JanIA");
      expect(circuloSrc).toContain("formatFounderTeachingsForPrompt");
      expect(circuloSrc).not.toContain("Módulos como CRM de leads y digitalización de contratos formalizados se desplegarán en fases posteriores");
    });
  });
});
