import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  CERTIFIED_SENDER_DEFAULT,
  formatEmailFromHeader,
  isAuthenticatedVecySenderEmail,
  resolveCustomSmtpSenderEmail,
} from "../_core/emailAutomationEngine";

describe("v34.45 — Corrección de encabezado FROM @vecygroup.com en SMTP propio (Brevo) y reset de formulario", () => {
  it("detecta exclusivamente remitentes autenticados @vecygroup.com y rechaza logins SMTP técnicos como Brevo", () => {
    expect(isAuthenticatedVecySenderEmail("notificaciones@vecygroup.com")).toBe(true);
    expect(isAuthenticatedVecySenderEmail("CONTACTO@VECYGROUP.COM")).toBe(true);
    expect(isAuthenticatedVecySenderEmail("c4ad31001@smtp-brevo.com")).toBe(false);
    expect(isAuthenticatedVecySenderEmail("usuario@gmail.com")).toBe(false);
    expect(isAuthenticatedVecySenderEmail(null)).toBe(false);
  });

  it("resuelve el remitente custom_smtp usando replyTo @vecygroup.com o notificaciones@vecygroup.com por defecto, nunca smtpUser", () => {
    expect(
      resolveCustomSmtpSenderEmail({
        fromEmail: "c4ad31001@smtp-brevo.com",
        replyToEmail: "notificaciones@vecygroup.com",
      }),
    ).toBe("notificaciones@vecygroup.com");

    expect(
      resolveCustomSmtpSenderEmail({
        fromEmail: "c4ad31001@smtp-brevo.com",
        replyToEmail: "gerencia@vecygroup.com",
      }),
    ).toBe("gerencia@vecygroup.com");

    expect(
      resolveCustomSmtpSenderEmail({
        fromEmail: "asesor@vecygroup.com",
        replyToEmail: "asesor@gmail.com",
      }),
    ).toBe("asesor@vecygroup.com");

    expect(
      resolveCustomSmtpSenderEmail({
        fromEmail: "c4ad31001@smtp-brevo.com",
        replyToEmail: "asesor@gmail.com",
      }),
    ).toBe(CERTIFIED_SENDER_DEFAULT);
  });

  it("formatea el encabezado From como 'Vecy Bienes Raíces <notificaciones@vecygroup.com>' y limpia comillas/saltos", () => {
    expect(
      formatEmailFromHeader("Vecy Bienes Raíces", "notificaciones@vecygroup.com"),
    ).toBe("Vecy Bienes Raíces <notificaciones@vecygroup.com>");

    expect(
      formatEmailFromHeader(' "Vecy\nBienes" <Raíces> ', "NOTIFICACIONES@VECYGROUP.COM"),
    ).toBe("VecyBienes Raíces <notificaciones@vecygroup.com>");
  });

  it("verifica la separación entre auth.user (smtpUser) y from (@vecygroup.com) y el reset visual en EmailAutomationPanel.tsx", () => {
    const root = process.cwd();
    const engineSrc = fs.readFileSync(
      path.resolve(root, "server/_core/emailAutomationEngine.ts"),
      "utf-8",
    );
    expect(engineSrc).toContain("resolveCustomSmtpSenderEmail(");
    expect(engineSrc).toContain("from: formatEmailFromHeader(identity.displayName, identity.fromEmail)");
    expect(engineSrc).toContain("user: identity.smtpConfig.user");

    const routerSrc = fs.readFileSync(
      path.resolve(root, "server/routers/emailAutomation.ts"),
      "utf-8",
    );
    expect(routerSrc).toContain("resolveCustomSmtpSenderEmail(");

    const panelSrc = fs.readFileSync(
      path.resolve(root, "client/src/components/crm/EmailAutomationPanel.tsx"),
      "utf-8",
    );
    expect(panelSrc).toContain("clearComposeValidationErrors");
    expect(panelSrc).toContain("setComposeFormKey");
    expect(panelSrc).toContain("key={composeFormKey}");
  });
});
