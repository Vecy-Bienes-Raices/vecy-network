import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import {
  buildRobotsTxt,
  buildSitemapXml,
  CANONICAL_SEO_ORIGIN,
  evaluateVercelRedirectRule,
} from "../_core/seoService";
import {
  computeCertifiedEmailHash,
  computeEvidenceChainHash,
  formatBogotaTimestamp,
  generateEmailCertificateCode,
  instrumentEmailHtmlForTracking,
  TRANSPARENT_1X1_PNG_BUFFER,
} from "../_core/emailAutomationEngine";
import {
  createCertifiedEmailEvidencePdf,
  sanitizePdfWinAnsiText,
} from "../_core/emailContractService";

describe("v34.43 — Redirección 301 SEO (Vercel -> vecygroup.com), Sitemap/Robots y Correo Certificado Ley 527", () => {
  describe("1. Redirección permanente 301 y SEO canónico en vecygroup.com", () => {
    it("configura 301 en vercel.json desde vecy-bienes-raices.vercel.app hacia https://vecygroup.com/:path* preservando /api y /uploads", () => {
      const vercelJsonPath = path.resolve(process.cwd(), "vercel.json");
      const vercelCfg = JSON.parse(fs.readFileSync(vercelJsonPath, "utf-8"));

      expect(Array.isArray(vercelCfg.redirects)).toBe(true);
      expect(vercelCfg.redirects[0].statusCode).toBe(301);
      expect(vercelCfg.redirects[0].destination).toBe("https://vecygroup.com/:path*");

      const rootRedirect = evaluateVercelRedirectRule(
        vercelCfg,
        "vecy-bienes-raices.vercel.app",
        "/",
      );
      expect(rootRedirect).toEqual({
        action: "redirect",
        statusCode: 301,
        destination: "https://vecygroup.com/",
      });

      const subPathRedirect = evaluateVercelRedirectRule(
        vercelCfg,
        "vecy-bienes-raices.vercel.app",
        "/ofertas",
      );
      expect(subPathRedirect).toEqual({
        action: "redirect",
        statusCode: 301,
        destination: "https://vecygroup.com/ofertas",
      });

      const apiRewrite = evaluateVercelRedirectRule(
        vercelCfg,
        "vecy-bienes-raices.vercel.app",
        "/api/health",
      );
      expect(apiRewrite).toEqual({
        action: "rewrite",
        destination: "http://13.140.149.144/api/health",
      });

      const uploadsRewrite = evaluateVercelRedirectRule(
        vercelCfg,
        "vecy-bienes-raices.vercel.app",
        "/uploads/foto.jpg",
      );
      expect(uploadsRewrite).toEqual({
        action: "rewrite",
        destination: "http://13.140.149.144/uploads/foto.jpg",
      });
    });

    it("genera robots.txt y sitemap.xml con URLs canónicas exclusivamente en https://vecygroup.com", () => {
      const robotsDynamic = buildRobotsTxt();
      expect(robotsDynamic).toContain(`Sitemap: ${CANONICAL_SEO_ORIGIN}/sitemap.xml`);
      expect(robotsDynamic).not.toContain("vercel.app");

      const sitemapDynamic = buildSitemapXml({
        lastmod: "2026-11-23",
        propertyEntries: [{ id: 777, updatedAt: new Date("2026-11-23T10:00:00.000Z") }],
      });
      expect(sitemapDynamic).toContain("<loc>https://vecygroup.com/</loc>");
      expect(sitemapDynamic).toContain("<loc>https://vecygroup.com/ofertas</loc>");
      expect(sitemapDynamic).toContain("<loc>https://vecygroup.com/demandas</loc>");
      expect(sitemapDynamic).toContain("<loc>https://vecygroup.com/property/777</loc>");
      expect(sitemapDynamic).not.toContain("vercel.app");

      const staticRobots = fs.readFileSync(
        path.resolve(process.cwd(), "client/public/robots.txt"),
        "utf-8",
      );
      const staticSitemap = fs.readFileSync(
        path.resolve(process.cwd(), "client/public/sitemap.xml"),
        "utf-8",
      );
      expect(staticRobots).toContain("Sitemap: https://vecygroup.com/sitemap.xml");
      expect(staticRobots).not.toContain("vercel.app");
      expect(staticSitemap).toContain("https://vecygroup.com/");
      expect(staticSitemap).not.toContain("vercel.app");
    });
  });

  describe("2. Rastreo tipo Mailsuite (píxel 1x1 PNG, clics y hora America/Bogota)", () => {
    it("expone PNG transparente 1x1 válido y formatea sellos de tiempo en America/Bogota", () => {
      // Firma mágica PNG: 89 50 4E 47 0D 0A 1A 0A
      expect(TRANSPARENT_1X1_PNG_BUFFER.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect(TRANSPARENT_1X1_PNG_BUFFER.length).toBeGreaterThan(20);

      // 2026-11-23T05:10:05Z = 2026-11-23 00:10:05 COT (UTC-5)
      const bogotaStr = formatBogotaTimestamp(new Date("2026-11-23T05:10:05.000Z"));
      expect(bogotaStr).toContain("2026-11-23 00:10:05 COT (America/Bogota)");
    });

    it("instrumenta HTML con píxel /api/email/track/open/:token.png y reescribe enlaces HTTP/HTTPS sin tocar mailto/tel/#", () => {
      const htmlInput = `<!DOCTYPE html><html><body>
        <p>Hola, revisa <a href="https://vecygroup.com/property/15?ref=abc&amp;mode=vip">este inmueble</a></p>
        <p>O revisa <a href="https://vecygroup.com/ofertas">la tienda</a> y otra vez <a href="https://vecygroup.com/ofertas">tienda</a></p>
        <p><a href="mailto:asesor@vecygroup.com">Correo</a> | <a href="tel:+573166569719">Llamar</a> | <a href="#top">Subir</a></p>
      </body></html>`;

      let seq = 0;
      const instrumented = instrumentEmailHtmlForTracking({
        html: htmlInput,
        openTrackingToken: "open_tok_abc123",
        baseUrl: "https://vecygroup.com",
        createLinkToken: () => `lnk_tok_${++seq}`,
      });

      expect(instrumented.trackedLinks).toEqual([
        { token: "lnk_tok_1", targetUrl: "https://vecygroup.com/property/15?ref=abc&mode=vip" },
        { token: "lnk_tok_2", targetUrl: "https://vecygroup.com/ofertas" },
      ]);
      expect(instrumented.html).toContain(
        '<img src="https://vecygroup.com/api/email/track/open/open_tok_abc123.png"',
      );
      expect(instrumented.html).toContain("https://vecygroup.com/api/email/track/click/lnk_tok_1");
      expect(instrumented.html).toContain("https://vecygroup.com/api/email/track/click/lnk_tok_2");
      expect(instrumented.html).toContain('href="mailto:asesor@vecygroup.com"');
      expect(instrumented.html).toContain('href="tel:+573166569719"');
      expect(instrumented.html).toContain('href="#top"');
    });
  });

  describe("3. Integridad probatoria SHA-256 (Ley 527 de 1999) y Constancia PDF", () => {
    it("calcula hash SHA-256 determinístico y sensible a cualquier alteración en contenido, adjuntos o apertura", () => {
      const sentAt = new Date("2026-11-23T14:30:00.000Z");
      const baseHash = computeCertifiedEmailHash({
        fromEmail: "notificaciones@vecygroup.com",
        toEmail: "cliente@ejemplo.com",
        replyToEmail: "asesor@vecygroup.com",
        subject: "Propuesta apartamento Chicó",
        bodyHtml: "<p>Adjuntamos estudio de títulos y ficha técnica.</p>",
        bodyText: "Adjuntamos estudio de títulos y ficha técnica.",
        attachments: [
          {
            filename: "Ficha_Inmueble_101.pdf",
            contentType: "application/pdf",
            sizeBytes: 42100,
            sha256: "a".repeat(64),
          },
        ],
        sentAt,
      });

      expect(baseHash).toMatch(/^[a-f0-9]{64}$/);

      // Alterar 1 carácter en el asunto debe cambiar el hash SHA-256
      const alteredSubjectHash = computeCertifiedEmailHash({
        fromEmail: "notificaciones@vecygroup.com",
        toEmail: "cliente@ejemplo.com",
        replyToEmail: "asesor@vecygroup.com",
        subject: "Propuesta apartamento Chicó!",
        bodyHtml: "<p>Adjuntamos estudio de títulos y ficha técnica.</p>",
        bodyText: "Adjuntamos estudio de títulos y ficha técnica.",
        attachments: [
          {
            filename: "Ficha_Inmueble_101.pdf",
            contentType: "application/pdf",
            sizeBytes: 42100,
            sha256: "a".repeat(64),
          },
        ],
        sentAt,
      });
      expect(alteredSubjectHash).not.toBe(baseHash);

      const cuv = generateEmailCertificateCode(baseHash, sentAt);
      expect(cuv).toMatch(/^VECY-MAIL-20261123-[A-F0-9]{8}$/);

      const chainBeforeOpen = computeEvidenceChainHash({
        contentSha256: baseHash,
        certificateCode: cuv,
        providerMessageId: "<smtp-1@vecygroup.com>",
        sentAtIso: sentAt.toISOString(),
        openCount: 0,
        clickCount: 0,
        eventsCount: 0,
      });
      const chainAfterOpen = computeEvidenceChainHash({
        contentSha256: baseHash,
        certificateCode: cuv,
        providerMessageId: "<smtp-1@vecygroup.com>",
        sentAtIso: sentAt.toISOString(),
        firstOpenedAtIso: "2026-11-23T14:35:00.000Z",
        lastOpenedAtIso: "2026-11-23T14:35:00.000Z",
        openCount: 1,
        clickCount: 0,
        eventsCount: 1,
      });
      expect(chainBeforeOpen).toMatch(/^[a-f0-9]{64}$/);
      expect(chainAfterOpen).toMatch(/^[a-f0-9]{64}$/);
      expect(chainAfterOpen).not.toBe(chainBeforeOpen);
    });

    it("genera Constancia Probatoria PDF válida con QR, SHA-256, eventos de apertura/clic y tolerancia a emojis", async () => {
      expect(sanitizePdfWinAnsiText("🎯 Match 95% — Bogotá D.C.")).toBe("Match 95% - Bogotá D.C.");

      const pdfBytes = await createCertifiedEmailEvidencePdf({
        messageId: 42,
        certificateCode: "VECY-MAIL-20261123-ABCDEF12",
        contentSha256: "0123456789abcdef".repeat(4),
        evidenceSha256: "fedcba9876543210".repeat(4),
        fromEmail: "notificaciones@vecygroup.com",
        replyToEmail: "asesor@vecygroup.com",
        toEmail: "comprador@gmail.com",
        leadName: "María Fernanda Gómez",
        subject: "🎯 Match 95%: Apartamento Santa Bárbara 🏠",
        status: "sent",
        providerMessageId: "<msg-42@vecygroup.com>",
        sentAtIso: "2026-11-23T14:00:00.000Z",
        sentAtBogota: "2026-11-23 09:00:00 COT (America/Bogota)",
        openCount: 2,
        firstOpenedAtBogota: "2026-11-23 09:04:12 COT (America/Bogota)",
        lastOpenedAtBogota: "2026-11-23 09:15:30 COT (America/Bogota)",
        lastOpenIp: "181.53.12.44",
        lastOpenUserAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        clickCount: 1,
        firstClickedAtBogota: "2026-11-23 09:05:00 COT (America/Bogota)",
        lastClickedAtBogota: "2026-11-23 09:05:00 COT (America/Bogota)",
        lastClickIp: "181.53.12.44",
        lastClickUserAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        attachments: [
          {
            filename: "Ficha_Santa_Barbara.pdf",
            contentType: "application/pdf",
            sizeBytes: 98304,
            sha256: "abcd".repeat(16),
          },
        ],
        bodyExcerpt: "Hola María Fernanda, te compartimos la ficha certificada del inmueble en Santa Bárbara.",
        events: [
          {
            type: "open",
            occurredAtIso: "2026-11-23T14:04:12.000Z",
            occurredAtBogota: "2026-11-23 09:04:12 COT (America/Bogota)",
            ip: "181.53.12.44",
            userAgent: "Mozilla/5.0",
          },
          {
            type: "click",
            occurredAtIso: "2026-11-23T14:05:00.000Z",
            occurredAtBogota: "2026-11-23 09:05:00 COT (America/Bogota)",
            ip: "181.53.12.44",
            targetUrl: "https://vecygroup.com/property/55",
          },
        ],
        generatedAtBogota: "2026-11-23 09:20:00 COT (America/Bogota)",
      });

      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(2000);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(1);
    });
  });
});
