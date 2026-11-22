import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  detectSourcePortal,
  extractPropertyFromHtml,
  importPropertyFromUrl,
  isPrivateOrReservedIp,
  normalizeImportedPropertyType,
  normalizeImportedTransactionType,
  scrubCompetitorAndContactInfo,
  validateAndAssertSafeUrl,
} from "../_core/urlImportService";
import { computeListingCompletenessRank } from "../routers/properties";
import {
  evaluateProposalCompatibility,
  shieldRequirementForPublicView,
  VECY_MIN_MATCH_SCORE,
} from "../routers/matching";
import {
  completeMatchSignature,
  createMatchSignatureRequest,
  getMatchSignaturePublicView,
} from "../_core/matchSignatureService";
import { extractTenantSlugFromHost, isCustomWhiteLabelHost } from "../../shared/whitelabel";
import { injectOpenGraphMeta } from "../_core/ogMetaService";

describe("PASO 3 (v34.37) — Importador Inteligente por URL, Tiendas y Marca Blanca", () => {
  describe("1. Defensa SSRF (IPs privadas, metadatos, DNS rebinding y redirects)", () => {
    it("detecta correctamente IPs privadas, loopback, metadatos cloud e IPv4-mapped IPv6", () => {
      expect(isPrivateOrReservedIp("127.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("10.20.30.40")).toBe(true);
      expect(isPrivateOrReservedIp("172.16.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("172.31.255.254")).toBe(true);
      expect(isPrivateOrReservedIp("192.168.1.50")).toBe(true);
      expect(isPrivateOrReservedIp("169.254.169.254")).toBe(true);
      expect(isPrivateOrReservedIp("100.64.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("::1")).toBe(true);
      expect(isPrivateOrReservedIp("fe80::1")).toBe(true);
      expect(isPrivateOrReservedIp("fc00::1")).toBe(true);
      expect(isPrivateOrReservedIp("::ffff:127.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("::ffff:7f00:1")).toBe(true);
      expect(isPrivateOrReservedIp("::ffff:a9fe:a9fe")).toBe(true);

      expect(isPrivateOrReservedIp("8.8.8.8")).toBe(false);
      expect(isPrivateOrReservedIp("104.21.40.12")).toBe(false);
      expect(isPrivateOrReservedIp("2606:4700:4700::1111")).toBe(false);
    });

    it("rechaza URLs locales, protocolos no HTTP, credenciales, puertos no estándar y DNS rebinding", async () => {
      const blockedUrls = [
        "http://localhost/admin",
        "http://127.0.0.1/api/health",
        "http://169.254.169.254/latest/meta-data/",
        "http://10.0.0.12/internal",
        "http://192.168.0.1/router",
        "http://[::1]/secret",
        "http://[::ffff:127.0.0.1]/secret",
        "file:///etc/passwd",
        "http://user:pass@info.wasi.co/inmueble/123",
        "https://info.wasi.co:8080/inmueble/123",
        "http://metadata.google.internal/computeMetadata/v1/",
      ];

      for (const badUrl of blockedUrls) {
        await expect(
          validateAndAssertSafeUrl(badUrl, { resolveHost: async () => ["104.21.10.10"] }),
        ).rejects.toThrow();
      }

      // DNS rebinding: dominio aparentemente público que resuelve a 10.0.0.5
      const rebindRes = await importPropertyFromUrl("https://evil-rebind.example.com/casa", {
        resolveHost: async () => ["10.0.0.5"],
        fetchHtml: async () => {
          throw new Error("NO DEBE EJECUTAR FETCH ANTE SSRF");
        },
      });
      expect(rebindRes.success).toBe(false);
      expect(rebindRes.status).toBe("ssrf_blocked");

      // Redirección HTTP 302 hacia metadatos AWS/GCP
      const redirectRes = await importPropertyFromUrl("https://info.wasi.co/inmueble/999", {
        resolveHost: async () => ["104.21.10.10"],
        fetchHtml: async () => ({
          status: 302,
          headers: { location: "http://169.254.169.254/latest/meta-data/" },
          body: "",
        }),
      });
      expect(redirectRes.success).toBe(false);
      expect(redirectRes.status).toBe("ssrf_blocked");
    });
  });

  describe("2. Extracción sin medios de terceros en los 9 portales soportados", () => {
    const publicDns = async () => ["104.21.20.30"];

    it("extrae correctamente __NEXT_DATA__ (Fincaraíz y Metrocuadrado) ANTES de limpiar scripts y sin copiar fotos", async () => {
      const fincaraizHtml = `<!doctype html><html><head>
        <title>Apartamento en venta en Chicó Norte | Fincaraíz</title>
        <meta property="og:image" content="https://cdn.fincaraiz.com.co/foto1.jpg" />
        <script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
          props: {
            pageProps: {
              property: {
                title: "Apartamento en Venta Chicó Norte - Cód Fincaraíz 998812",
                description:
                  "Hermoso apartamento exterior en Chicó Norte, Bogotá. Contacto directo 3102223344 o asesor@fincaraiz.com.co. Cuenta con balcón, estudio y ascensor.",
                propertyType: "Apartamento",
                transactionType: "Venta",
                price: 980000000,
                adminFee: 850000,
                areaTotal: 145,
                areaPrivate: 132,
                bedrooms: 3,
                bathrooms: 3,
                garages: 2,
                stratum: 6,
                location: {
                  department: "Bogotá D.C.",
                  city: "Bogotá",
                  locality: "Chapinero",
                  neighborhood: "Chicó Norte",
                },
                images: [
                  "https://cdn.fincaraiz.com.co/1.jpg",
                  "https://cdn.fincaraiz.com.co/2.jpg",
                ],
                videoUrl: "https://youtube.com/watch?v=competitor",
              },
            },
          },
        })}</script>
      </head><body><div id="__next">Cargando...</div></body></html>`;

      const res = await importPropertyFromUrl("https://www.fincaraiz.com.co/apartamento-en-venta/998812", {
        resolveHost: publicDns,
        fetchHtml: async () => ({ status: 200, headers: {}, body: fincaraizHtml }),
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe("ok");
      expect(res.portal).toBe("Fincaraíz");
      expect(res.data).toBeTruthy();
      expect(res.data!.images).toEqual([]);
      expect(res.data!.videoUrl).toBeNull();
      expect(res.data!.thirdPartyMediaStripped).toBe(true);
      expect(res.data!.thirdPartyMediaCount).toBeGreaterThanOrEqual(2);
      expect(res.data!.price).toBe("980000000");
      expect(res.data!.adminFee).toBe("850000");
      expect(res.data!.areaTotal).toBe("145");
      expect(res.data!.bedrooms).toBe(3);
      expect(res.data!.bathrooms).toBe(3);
      expect(res.data!.garages).toBe(2);
      expect(res.data!.propertyType).toBe("apartment");
      expect(res.data!.transactionType).toBe("venta");
      expect(res.data!.city).toContain("Bogotá");
      expect(res.data!.description).not.toContain("3102223344");
      expect(res.data!.description).not.toContain("asesor@fincaraiz.com.co");
      expect(res.data!.description.toLowerCase()).not.toContain("fincaraiz");

      const metrocuadradoHtml = `<!doctype html><html><head>
        <script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
          props: {
            pageProps: {
              data: {
                title: "Apartamento en Arriendo El Poblado Metrocuadrado",
                description: "Acogedor apartamento en El Poblado Medellín, canon incluye administración.",
                propertyType: "Apartamento",
                businessType: "Arriendo",
                rentPrice: 5200000,
                adminFee: 450000,
                builtArea: 98,
                rooms: 2,
                bathrooms: 2,
                parking: 1,
                city: "Medellín",
                neighborhood: "El Poblado",
              },
            },
          },
        })}</script>
      </head><body></body></html>`;

      const resM2 = await importPropertyFromUrl("https://www.metrocuadrado.com/inmueble/arriendo-el-poblado/MC-123", {
        resolveHost: publicDns,
        fetchHtml: async () => ({ status: 200, headers: {}, body: metrocuadradoHtml }),
      });

      expect(resM2.success).toBe(true);
      expect(resM2.portal).toBe("Metrocuadrado");
      expect(resM2.data!.transactionType).toBe("arriendo");
      expect(resM2.data!.price).toBe("5200000");
      expect(resM2.data!.rentPrice).toBe("5200000");
      expect(resM2.data!.city).toBe("Medellín");
      expect(resM2.data!.images).toEqual([]);
    });

    it("detecta y extrae los portales Wasi, Qrador, NexoApp, Vitrina Raíz, KiteProp, Habi y Ciencuadras", () => {
      const portalCases: Array<{ url: string; expectedPortal: string; html: string; expectedType: string; expectedTx: string }> = [
        {
          url: "https://info.wasi.co/casa-campestre-chia-vereda-fagua/771234",
          expectedPortal: "Wasi",
          expectedType: "house",
          expectedTx: "venta_permuta",
          html: `<html><head><title>Casa Campestre en Vereda Fagua Chía | Wasi</title></head>
            <body><h1>Casa Campestre en Venta o Permuta Vereda Fagua, Chía</h1>
            <div class="price">$ 1.450.000.000</div>
            <div class="details">Área construida 280 m², 4 habitaciones, 4 baños, 3 garajes. Llama al 315 888 9900 Wasi.</div>
            <img src="https://image.wasi.co/1.jpg" /></body></html>`,
        },
        {
          url: "https://qrador.com/inmueble/oficina-el-nogal-112",
          expectedPortal: "Qrador",
          expectedType: "office",
          expectedTx: "arriendo",
          html: `<html><head><meta property="og:title" content="Oficina en Arriendo El Nogal" />
            <meta property="og:description" content="Oficina corporativa de 120 m2, 2 baños, 2 parqueaderos en Bogotá. Canon $6.800.000." /></head>
            <body><span class="price">$ 6.800.000</span></body></html>`,
        },
        {
          url: "https://app.nexoapp.co/p/bodega-fontibon-88",
          expectedPortal: "NexoApp",
          expectedType: "warehouse",
          expectedTx: "venta_o_arriendo",
          html: `<html><head><script type="application/ld+json">${JSON.stringify({
            "@type": "RealEstateListing",
            name: "Bodega Industrial en Fontibón",
            description: "Bodega en venta o arriendo con energía trifásica.",
            price: 2200000000,
            rentPrice: 18000000,
            areaTotal: 600,
            city: "Bogotá",
            neighborhood: "Fontibón",
          })}</script></head><body><h1>Bodega Industrial Venta y Arriendo</h1></body></html>`,
        },
        {
          url: "https://vitrinaraiz.com/propiedad/local-chapinero-55",
          expectedPortal: "Vitrina Raíz",
          expectedType: "commercial",
          expectedTx: "arriendo",
          html: `<html><head><title>Local Comercial en Chapinero</title></head>
            <body><h1>Local comercial en arriendo en Chapinero, Bogotá</h1>
            <div class="price">$ 4.200.000</div><div class="details">Local de 85 m2 con 1 baño, sobre vía principal.</div></body></html>`,
        },
        {
          url: "https://miagencia.kiteprop.com/fincas/finca-llanogrande-rionegro",
          expectedPortal: "KiteProp",
          expectedType: "farm",
          expectedTx: "venta",
          html: `<html><head><title>Finca en Venta Llanogrande Rionegro</title></head>
            <body><h1>Finca de Recreo en Llanogrande, Rionegro, Antioquia</h1>
            <div class="price">$ 2.600.000.000</div><div class="details">Área 500 m2 construidos, 5 alcobas, 6 baños.</div></body></html>`,
        },
        {
          url: "https://habi.co/venta-apartamento/cedritos-bogota-441",
          expectedPortal: "Habi",
          expectedType: "apartment",
          expectedTx: "venta",
          html: `<html><head><script type="application/ld+json">${JSON.stringify({
            "@type": "Apartment",
            name: "Apartamento en Cedritos",
            description: "Apartamento remodelado en Cedritos Usaquén Bogotá, 3 alcobas, 2 baños, 88 m2.",
            offers: { price: 465000000, priceCurrency: "COP" },
          })}</script></head><body></body></html>`,
        },
        {
          url: "https://www.ciencuadras.com/inmueble/lote-sopó-5521",
          expectedPortal: "Ciencuadras",
          expectedType: "land",
          expectedTx: "venta",
          html: `<html><head><script type="application/ld+json">${JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Product",
                name: "Lote / Terreno en Sopó Cundinamarca",
                description: "Lote plano de 2500 m2 en Sopó, Cundinamarca.",
                offers: { price: 720000000, priceCurrency: "COP" },
              },
            ],
          })}</script></head><body></body></html>`,
        },
      ];

      for (const tc of portalCases) {
        expect(detectSourcePortal(tc.url, tc.html)).toBe(tc.expectedPortal);
        const extracted = extractPropertyFromHtml(tc.html, tc.url, 200);
        expect(extracted.success).toBe(true);
        expect(extracted.portal).toBe(tc.expectedPortal);
        expect(extracted.data!.images).toEqual([]);
        expect(extracted.data!.videoUrl).toBeNull();
        expect(extracted.data!.propertyType).toBe(tc.expectedType);
        expect(extracted.data!.transactionType).toBe(tc.expectedTx);
      }
    });

    it("normaliza tipologías sin falsos positivos y limpia competidores/contactos", () => {
      const colina = normalizeImportedPropertyType("", "Apartamento en Colina Campestre Localidad Suba");
      expect(colina.propertyType).toBe("apartment");
      expect(colina.propertyTypeExact).toBe("Apartamento");

      const consultorio = normalizeImportedPropertyType("Consultorio Odontológico", "");
      expect(consultorio.propertyType).toBe("consultorio");

      const opCompra = normalizeImportedTransactionType("", "Arriendo con opción de compra en Bogotá");
      expect(opCompra).toBe("arriendo_con_opcion_de_compra");

      const scrubbed = scrubCompetitorAndContactInfo(
        "Visita https://wasi.co/123 escribe a demo@habi.co o al +57 311 456 7890 con Remax y Century 21. Valor $450.000.000",
      );
      expect(scrubbed).not.toContain("311 456 7890");
      expect(scrubbed).not.toContain("demo@habi.co");
      expect(scrubbed.toLowerCase()).not.toContain("wasi");
      expect(scrubbed.toLowerCase()).not.toContain("remax");
      expect(scrubbed).toContain("$450.000.000");
    });

    it("retorna fallback asistido claro ante bloqueo WAF 403/429 o SPA vacía", async () => {
      const publicDns = async () => ["104.21.20.30"];

      const waf403 = await importPropertyFromUrl("https://www.fincaraiz.com.co/inmueble/123", {
        resolveHost: publicDns,
        fetchHtml: async () => ({
          status: 403,
          headers: {},
          body: "<html><title>Attention Required! | Cloudflare</title><div>cf-browser-verification</div></html>",
        }),
      });
      expect(waf403.success).toBe(false);
      expect(waf403.status).toBe("blocked_waf");
      expect(waf403.fallbackAction).toBe("paste_text");
      expect(waf403.data).toBeNull();

      const waf429 = extractPropertyFromHtml("Too Many Requests", "https://www.metrocuadrado.com/123", 429);
      expect(waf429.success).toBe(false);
      expect(waf429.status).toBe("blocked_waf");
      expect(waf429.fallbackAction).toBe("paste_text");

      const emptySpa = extractPropertyFromHtml(
        "<html><head><title>Inmueble</title></head><body><div id='root'></div><script src='/app.js'></script></body></html>",
        "https://habi.co/inmueble/99",
        200,
      );
      expect(emptySpa.success).toBe(false);
      expect(emptySpa.status).toBe("empty_spa");
      expect(emptySpa.fallbackAction).toBe("paste_text");
    });
  });

  describe("3. VECY TIENDA, Tienda de Requerimientos (contactShielded + postulaciones) y Portal Marca Blanca", () => {
    it("prioriza en VECY TIENDA publicaciones completas con fotos propias frente a fichas sin fotos", () => {
      const withPhotos = computeListingCompletenessRank({
        images: ["/uploads/foto1.jpg", "/uploads/foto2.jpg"],
        price: "650000000",
        areaTotal: "110",
        description: "Apartamento completamente remodelado con terraza privada en Cedritos.",
        addressNeighborhood: "Cedritos",
        city: "Bogotá, D.C.",
        agentId: 42,
      });
      const withoutPhotos = computeListingCompletenessRank({
        images: [],
        price: "650000000",
        areaTotal: "110",
        description: "Apartamento",
        addressNeighborhood: "Cedritos",
        city: "Bogotá, D.C.",
        agentId: null,
      });
      expect(withPhotos).toBeGreaterThan(withoutPhotos + 400);
    });

    it("blinda el contacto en Tienda de Requerimientos y evalúa postulaciones con firma Ley 527", async () => {
      const shielded = shieldRequirementForPublicView({
        id: 501,
        name: "Busco Apartamento en Chicó",
        idUsuarioWhatsapp: "573109998877",
        nombreUsuarioWhatsapp: "María Fernanda Gómez",
        rawText: "Busco apto en Chicó, llamar al +57 310 999 8877 o maria@correo.com vía Wasi",
        caracteristicasDeseadas: {
          otrasEspecificaciones: "Contactar por https://wasi.co/req/1 o 3109998877",
        },
      });

      expect(shielded.contactShielded).toBe(true);
      expect(shielded.idUsuarioWhatsapp).toBeNull();
      expect(shielded.nombreUsuarioWhatsapp).not.toContain("310");
      expect(shielded.rawText).not.toContain("310 999 8877");
      expect(shielded.rawText).not.toContain("maria@correo.com");
      expect(shielded.caracteristicasDeseadas.otrasEspecificaciones).not.toContain("3109998877");

      const compatHigh = evaluateProposalCompatibility(
        {
          id: 1,
          name: "Busco Apartamento en Chicó",
          tipoInmuebleDeseado: "apartment",
          tipoNegocioDeseado: "venta",
          ciudadDeseada: "Bogotá, D.C.",
          zonaDeseada: "Chicó",
          addressNeighborhood: "Chicó",
          presupuestoMax: "950000000",
          areaMin: "110",
          habitacionesMin: 3,
          banosMin: 2,
          parqueaderosMin: 2,
        },
        {
          id: 20,
          name: "Apartamento en Chicó",
          description: "Apartamento remodelado en venta en Chicó Bogotá, 120 m2, 3 habitaciones, 3 baños, 2 garajes.",
          propertyType: "apartment",
          transactionType: "venta",
          city: "Bogotá, D.C.",
          addressCity: "Bogotá, D.C.",
          zone: "Chicó",
          addressNeighborhood: "Chicó",
          price: "900000000",
          areaTotal: "120",
          bedrooms: 3,
          bathrooms: 3,
          garages: 2,
          stratum: 6,
        },
      );
      expect(compatHigh.score).toBeGreaterThanOrEqual(VECY_MIN_MATCH_SCORE);
      expect(compatHigh.qualifiesHighMatch).toBe(true);

      const compatMismatch = evaluateProposalCompatibility(
        {
          id: 2,
          tipoInmuebleDeseado: "apartment",
          tipoNegocioDeseado: "arriendo",
          ciudadDeseada: "Bogotá, D.C.",
          zonaDeseada: "Chicó",
          presupuestoMax: "4000000",
          habitacionesMin: 3,
        },
        {
          id: 21,
          propertyType: "warehouse",
          transactionType: "venta",
          city: "Cali",
          zone: "Yumbo",
          price: "2500000000",
          areaTotal: "800",
          bedrooms: 0,
        },
      );
      expect(compatMismatch.qualifiesHighMatch).toBe(false);

      // Flujo de firma previa para postulación
      const sigReq = await createMatchSignatureRequest({
        userJid: "573001112233@s.whatsapp.net",
        userName: "Carlos Agente",
        userRole: "agente_inmobiliario",
        requirementId: 501,
        requirementTitle: "Requerimiento Chicó",
        matches: [
          {
            matchCode: "#R501-P20",
            propertyCode: "ID-BOG-CHI20",
            propertyId: 20,
            score: 96,
            tipoInmueble: "Apartamento",
            zona: "Chicó",
            ciudad: "Bogotá, D.C.",
            precioOCanon: "$900.000.000 COP",
            area: "120 m²",
          },
        ],
      });

      const beforeSign = await getMatchSignaturePublicView(sigReq.token);
      expect(beforeSign.found).toBe(true);
      if (beforeSign.found) expect(beforeSign.status).toBe("pending");

      const signed = await completeMatchSignature({
        token: sigReq.token,
        signerName: "Carlos Agente",
        signerDocumentType: "CC",
        signerDocument: "80123456",
        acceptedTerms: true,
        method: "whatsapp_text",
      });
      expect(signed.success).toBe(true);
      expect(signed.cuv).toMatch(/^CUV-/);

      const afterSign = await getMatchSignaturePublicView(sigReq.token);
      if (afterSign.found) expect(afterSign.status).toBe("signed");
    });

    it("resuelve subdominios marca blanca *.vecygroup.com e inyecta OpenGraph dinámico con escape XSS", () => {
      expect(extractTenantSlugFromHost("demo.vecygroup.com")).toBe("demo");
      expect(extractTenantSlugFromHost("inmo-imperial.vecygroup.com:443")).toBe("inmo-imperial");
      expect(extractTenantSlugFromHost("www.vecygroup.com")).toBeNull();
      expect(extractTenantSlugFromHost("api.vecygroup.com")).toBeNull();
      expect(extractTenantSlugFromHost("vecygroup.com")).toBeNull();
      expect(extractTenantSlugFromHost("vecy-bienes-raices.vercel.app")).toBeNull();
      expect(extractTenantSlugFromHost("localhost:3000")).toBeNull();

      expect(isCustomWhiteLabelHost("portal.imperialraices.co")).toBe(true);
      expect(isCustomWhiteLabelHost("demo.vecygroup.com")).toBe(false);
      expect(isCustomWhiteLabelHost("vecygroup.com")).toBe(false);

      const baseHtml = fs.readFileSync(path.resolve(process.cwd(), "client/index.html"), "utf-8");
      const injected = injectOpenGraphMeta(baseHtml, {
        title: 'Imperial "Luxury" <RealEstate> | Portafolio',
        description: "Casas y apartamentos exclusivos en Chicó y Rosales.",
        siteName: "Imperial Bienes Raíces",
        url: "https://imperial.vecygroup.com/",
        image: "https://imperial.vecygroup.com/uploads/logo.png",
        imageAlt: "Imperial Bienes Raíces",
        themeColor: "#D4AF37",
      });

      expect(injected).toContain("<title>Imperial &quot;Luxury&quot; &lt;RealEstate&gt; | Portafolio</title>");
      expect(injected).toContain('<meta property="og:site_name" content="Imperial Bienes Raíces" />');
      expect(injected).toContain('<meta property="og:image" content="https://imperial.vecygroup.com/uploads/logo.png" />');
      expect(injected).toContain('<meta name="theme-color" content="#D4AF37" />');

      const mig0015 = fs.readFileSync(
        path.resolve(process.cwd(), "drizzle/0015_requirement_proposals_and_whitelabel.sql"),
        "utf-8",
      );
      expect(mig0015).toContain('CREATE TABLE IF NOT EXISTS "requirement_proposals"');
      expect(mig0015).toContain("signature_token");
      expect(mig0015).toContain("contact_unlocked");
    });
  });
});

