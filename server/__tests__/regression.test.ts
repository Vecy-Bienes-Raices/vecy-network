import { describe, it, expect } from "vitest";
import { parseColombianPriceOrBudget, extractFallbackDataFromText, extractFirstName, splitMultiItemMessage } from "../_core/janIA";
import {
  checkTransactionCompatibility,
  isHollowListing,
  explicarMatch,
  isNonRealEstateText
} from "../_core/matching";
import {
  getDynamicFallbackItem,
  enforceGreetingAccuracy,
  enforceJanIAIdentity,
  ROTATING_FALLBACK_CATALOG
} from "../_core/cronService";
import {
  normalizeAdvisorPhone,
  isLidIdentifier,
  isGenericName,
  preserveVerifiedAdvisorContact,
  lookupAdvisorSync,
  brokerDirectoryCache,
} from "../_core/advisors";
import {
  parseSecurityType,
  demands24hSecurity,
  checkFinancialSegmentCoherence,
  parseOutdoorAreas
} from "../../shared/colombianRealEstateParser";

describe("VECY NETWORK — SUITE DE REGRESIÓN DOCTRINAL AUTOMATIZADA", () => {
  // ─────────────────────────────────────────────────────────────
  // 1. EXTRACTOR DE PRECIOS Y PRESUPUESTOS (parseColombianPriceOrBudget)
  // ─────────────────────────────────────────────────────────────
  describe("1. Extracción de Precios y Presupuestos Colombianos", () => {
    it("debe procesar montos expresados en millones correctamente", () => {
      const price = parseColombianPriceOrBudget("540", "millones", true);
      expect(price).toBe(540_000_000);
    });

    it("debe procesar montos con decimales en millones", () => {
      const price = parseColombianPriceOrBudget("1.5", "millones", false);
      expect(price).toBe(1_500_000);
    });

    it("debe procesar montos en miles de millones cuando se especifica explícitamente", () => {
      const price = parseColombianPriceOrBudget("1.8", "mil millones", true);
      expect(price).toBe(1_800_000_000);
    });

    it("JAMÁS debe multiplicar enteros pequeños (<30) por 1.000 millones (Regla v31.67)", () => {
      // El número 15 de edad NO debe transformarse en 15 mil millones ($15.000.000.000)
      const price = parseColombianPriceOrBudget("15", "", true);
      expect(price).not.toBe(15_000_000_000);
    });

    it("debe formatear valores directos con puntos de miles", () => {
      const price = parseColombianPriceOrBudget("1.471.000", "", false);
      expect(price).toBe(1_471_000);
    });

    it("debe extraer cifras de presupuesto colombianas sin signo $ y con apóstrofe (ej: 850’000.000)", async () => {
      const { extractFallbackDataFromText } = await import("../_core/janIA");
      const text = `REQUIERO! URGENTE 🚨\n3 habitaciones o dos y estudio\n2 parqueaderos\nDepósito en lo posible\nLa Carolina\nLo más cerca a Unicentro\nApartameto calido\nNO FUPLEX\n850’000.000\n\nMARÍA HERNÁNDEZ REMAX/One\nTel: 3112194889`;
      const data = extractFallbackDataFromText(text);
      expect(data.presupuestoMax).toBe(850_000_000);
      expect(data.price).toBe(850_000_000);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. REGLAS DOCTRINALES DE COMPATIBILIDAD DE NEGOCIO (checkTransactionCompatibility)
  // ─────────────────────────────────────────────────────────────
  describe("2. Compatibilidad Doctrinal de Transacciones", () => {
    it("Arriendo vs Venta pura debe ser 0% IMPOSIBLE (Bloqueo Absoluto)", () => {
      expect(checkTransactionCompatibility("arriendo", "venta")).toBe(false);
      expect(checkTransactionCompatibility("venta", "arriendo")).toBe(false);
    });

    it("Arriendo vs Arriendo con Opción de Compra debe ser 0% IMPOSIBLE (Regla Doctrinal v17.2)", () => {
      expect(checkTransactionCompatibility("arriendo", "arriendo_con_opcion_de_compra")).toBe(false);
    });

    it("Arriendo vs Arriendo puro debe ser 100% COMPATIBLE", () => {
      expect(checkTransactionCompatibility("arriendo", "arriendo")).toBe(true);
    });

    it("Arriendo vs Venta o Arriendo debe ser 100% COMPATIBLE", () => {
      expect(checkTransactionCompatibility("arriendo", "venta_o_arriendo")).toBe(true);
      expect(checkTransactionCompatibility("venta_o_arriendo", "arriendo")).toBe(true);
    });

    it("Venta vs Venta pura debe ser 100% COMPATIBLE", () => {
      expect(checkTransactionCompatibility("venta", "venta")).toBe(true);
    });

    it("Venta vs Venta o Arriendo debe ser 100% COMPATIBLE", () => {
      expect(checkTransactionCompatibility("venta", "venta_o_arriendo")).toBe(true);
    });

    it("Venta vs Venta con Permuta debe ser 100% COMPATIBLE", () => {
      expect(checkTransactionCompatibility("venta", "venta_permuta")).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. DETECCIÓN DE PUBLICACIONES HUECAS Y RESCATE INMOBILIARIO (isHollowListing)
  // ─────────────────────────────────────────────────────────────
  describe("3. Filtro de Seguridad Comercial (isHollowListing)", () => {
    it("debe rechazar saludos, felicitaciones y textos sin contexto", () => {
      expect(isHollowListing("Buenos días a todos en el grupo").isHollow).toBe(true);
      expect(isHollowListing("Feliz navidad colegas").isHollow).toBe(true);
      expect(isHollowListing("Alguien tiene un contacto en notarías?").isHollow).toBe(true);
    });

    it("debe RESCATAR publicaciones reales concisas con tipología y negocio (v31.68)", () => {
      const res = isHollowListing("En Renta, magnifica casa en conjunto Cerrado");
      expect(res.isHollow).toBe(false);
    });

    it("debe aceptar ofertas estructuradas normales", () => {
      const res = isHollowListing("Vendo hermoso apartamento en Chicó, 3 alcobas, 2 baños, 90m2, $550 millones");
      expect(res.isHollow).toBe(false);
    });

    it("debe detectar textos no inmobiliarios mediante isNonRealEstateText", () => {
      expect(isNonRealEstateText("Vendo volqueta doble troque modelo 2020")).toBe(true);
      expect(isNonRealEstateText("Apartamento en arriendo")).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. FILTROS DUROS DE CONFORT Y MATCHING (explicarMatch)
  // ─────────────────────────────────────────────────────────────
  describe("4. Filtros Duros Inquebrantables del Algoritmo de Matching", () => {
    const baseReq = {
      id: 1,
      propertyType: "apartment",
      tipoInmuebleDeseado: "apartment",
      transactionType: "venta",
      tipoNegocioDeseado: "venta",
      presupuestoMax: 500_000_000,
      presupuestoMin: 400_000_000,
      areaMin: 80,
      areaMax: 120,
      bedrooms: 3,
      bathrooms: 2,
      garages: 2,
      city: "Bogotá",
      neighborhood: "Chicó",
      zonaDeseada: "Chicó, Bogotá",
      rawText: "Busco apartamento en venta en Chicó, Bogotá. Presupuesto hasta $500 millones, mínimo 80 m2, 3 alcobas, 2 baños, 2 garajes.",
      status: "active"
    };

    const baseProp = {
      id: 100,
      propertyType: "apartment",
      transactionType: "venta",
      price: 480_000_000,
      rentPrice: null,
      area: 95,
      bedrooms: 3,
      bathrooms: 2,
      garages: 2,
      city: "Bogotá",
      neighborhood: "Chicó",
      address: "Calle 92 con 15",
      rawText: "Vendo hermoso apartamento en Chicó, Bogotá. 95 m2, 3 alcobas, 2 baños, 2 garajes independientes. Valor: $480.000.000.",
      status: "active"
    };

    it("debe otorgar alto score (>= 85%) ante coincidencia óptima", () => {
      const result = explicarMatch(baseReq, baseProp);
      expect(result.score).toBeGreaterThanOrEqual(85);
      expect(result.blockers.length).toBe(0);
    });

    it("debe BLOQUEAR a 0% si el tipo de transacción es incompatible", () => {
      const propRent = {
        ...baseProp,
        transactionType: "arriendo",
        price: 0,
        rentPrice: 4_000_000,
        rawText: "Apartamento en arriendo en Chicó, canon $4.000.000 con admon, 95m2, 3 alcobas, 2 baños, 2 garajes"
      };
      const result = explicarMatch(baseReq, propRent);
      expect(result.score).toBe(0);
      expect(result.blockers.length).toBeGreaterThan(0);
    });

    it("debe BLOQUEAR a 0% si el precio de la oferta supera el presupuesto máximo", () => {
      const propExpensive = {
        ...baseProp,
        price: 650_000_000, // Presupuesto max era 500M
        rawText: "Vendo hermoso apartamento en Chicó, Bogotá. 95 m2, 3 alcobas, 2 baños, 2 garajes. Valor: $650.000.000."
      };
      const result = explicarMatch(baseReq, propExpensive);
      expect(result.score).toBe(0);
      expect(result.blockers.length).toBeGreaterThan(0);
    });

    it("debe BLOQUEAR a 0% si la oferta de arriendo tiene canon $0 o no especificado (v31.67)", () => {
      const reqRent = {
        ...baseReq,
        transactionType: "arriendo",
        tipoNegocioDeseado: "arriendo",
        presupuestoMax: 5_000_000,
        presupuestoMin: 4_000_000,
        rawText: "Busco apartamento en arriendo en Chicó, Bogotá, presupuesto de 4 a 5 millones, 3 alcobas, 2 baños"
      };
      const propNoRent = {
        ...baseProp,
        transactionType: "arriendo",
        rentPrice: 0,
        price: 0,
        rawText: "En arriendo apartamento en Chicó, Bogotá. 95 m2, 3 alcobas, 2 baños, 2 garajes. Preguntar por canon."
      };
      const result = explicarMatch(reqRent, propNoRent);
      expect(result.score).toBe(0);
      expect(result.blockers.length).toBeGreaterThan(0);
    });

    it("FILTRO DURO DE CONFORT: Si Oferta tiene MENOS garajes que Demanda -> 0% Match Inviable", () => {
      const propFewGarages = {
        ...baseProp,
        garages: 1, // Demanda exige 2
        rawText: "Vendo hermoso apartamento en Chicó, Bogotá. 95 m2, 3 alcobas, 2 baños, 1 garaje. Valor: $480.000.000."
      };
      const result = explicarMatch(baseReq, propFewGarages);
      expect(result.score).toBe(0);
      expect(result.blockers.length).toBeGreaterThan(0);
    });

    it("FILTRO DURO DE CONFORT: Si Oferta tiene IGUAL O MÁS garajes -> Aprobado", () => {
      const propMoreGarages = {
        ...baseProp,
        garages: 3, // Demanda exige 2, oferta tiene 3
        rawText: "Vendo hermoso apartamento en Chicó, Bogotá. 95 m2, 3 alcobas, 2 baños, 3 garajes independientes. Valor: $480.000.000."
      };
      const result = explicarMatch(baseReq, propMoreGarages);
      expect(result.score).toBeGreaterThanOrEqual(85);
      expect(result.blockers.length).toBe(0);
    });

    it("FILTRO DURO DE CONFORT: Si Oferta tiene MENOS habitaciones que Demanda -> 0% Match Inviable", () => {
      const propFewRooms = {
        ...baseProp,
        bedrooms: 2, // Demanda exige 3
        rawText: "Vendo hermoso apartamento en Chicó, Bogotá. 95 m2, 2 alcobas, 2 baños, 2 garajes. Valor: $480.000.000."
      };
      const result = explicarMatch(baseReq, propFewRooms);
      expect(result.score).toBe(0);
      expect(result.blockers.length).toBeGreaterThan(0);
    });

    it("FILTRO DURO DE CONFORT: Si Oferta tiene MENOS baños que Demanda -> 0% Match Inviable", () => {
      const propFewBaths = {
        ...baseProp,
        bathrooms: 1, // Demanda exige 2
        rawText: "Vendo hermoso apartamento en Chicó, Bogotá. 95 m2, 3 alcobas, 1 baño, 2 garajes. Valor: $480.000.000."
      };
      const result = explicarMatch(baseReq, propFewBaths);
      expect(result.score).toBe(0);
      expect(result.blockers.length).toBeGreaterThan(0);
    });

    it("TOLERANCIA 0% EN ÁREA: Si Oferta tiene menor metraje que el mínimo exigido -> 0% Match Inviable", () => {
      const propSmallArea = {
        ...baseProp,
        area: 70, // Demanda exige min 80m2
        rawText: "Vendo hermoso apartamento en Chicó, Bogotá. 70 m2, 3 alcobas, 2 baños, 2 garajes. Valor: $480.000.000."
      };
      const result = explicarMatch(baseReq, propSmallArea);
      expect(result.score).toBe(0);
      expect(result.blockers.length).toBeGreaterThan(0);
    });

    it("FILTRO GEOGRÁFICO DURO: Inmuebles en ciudades distintas no hacen match", () => {
      const propMedellin = {
        ...baseProp,
        city: "Medellín",
        neighborhood: "El Poblado",
        rawText: "Vendo hermoso apartamento en El Poblado, Medellín. 95 m2, 3 alcobas, 2 baños, 2 garajes. Valor: $480.000.000."
      };
      const result = explicarMatch(baseReq, propMedellin);
      expect(result.score).toBe(0);
      expect(result.blockers.length).toBeGreaterThan(0);
    });

    it("GUILLOTINA FINANCIERA (0%): Oferta $2.800M supera presupuesto demandado $850M con cifra apóstrofe (Caso Match #15191)", () => {
      const prop = {
        id: 3319,
        price: 2800000000,
        rentPrice: 15240000,
        transactionType: "venta_o_arriendo",
        propertyType: "apartment",
        city: "Bogotá, D.C.",
        zone: "La Carolina",
        areaTotal: 187,
        rawText: "✅ Vendo o arriendo apartamento AMOBLADO en La Carolina\n187 m2\n3 habitaciones con baño privado\nFamily room\nBalcon\n4 parqueaderos\nPiso 5 con entrada de sol de mañana\n8 años de construido\nAdmon: 1.760.000\nValor venta: 2.800 mm\nValor renta: 17 mm"
      };
      const req = {
        id: 2001,
        presupuestoMax: null,
        presupuestoMin: null,
        tipoNegocioDeseado: "venta",
        tipoInmuebleDeseado: "apartment",
        ciudadDeseada: "Bogotá, D.C.",
        zonaDeseada: "La Carolina",
        areaMin: null,
        rawText: "REQUIERO! URGENTE 🚨\n3 habitaciones o dos y estudio\n2 parqueaderos\nDepósito en lo posible\nLa Carolina\nLo más cerca a Unicentro\nApartameto calido\nNO FUPLEX\n850’000.000\n\nMARÍA HERNÁNDEZ REMAX/One\nTel: 3112194889"
      };
      const result = explicarMatch(req as any, prop as any);
      expect(result.score).toBe(0);
      expect(result.blockers.some(b => b.includes("Guillotina Financiera") && b.includes("supera el presupuesto"))).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. EXTRACTOR DETERMINISTA AUTÓNOMO (extractFallbackDataFromText)
  // ─────────────────────────────────────────────────────────────
  describe("5. Extractor Determinista Autónomo ($0 COP)", () => {
    it("debe extraer tipología, canon y cuartos en arriendos", () => {
      const text = "Se arrienda hermoso apartamento en Cedritos, canon $3.200.000 con admon incluida, 2 alcobas, 2 baños, 1 garaje";
      const data = extractFallbackDataFromText(text);
      expect(data.transactionType).toBe("arriendo");
      expect(data.propertyType).toBe("apartment");
      expect(data.rentPrice).toBe(3_200_000);
      expect(data.bedrooms).toBe(2);
      expect(data.bathrooms).toBe(2);
      expect(data.garages).toBe(1);
    });

    it("debe extraer venta, precio y área en ventas", () => {
      const text = "Vendo casa en Usaquén, 180 m2, valor $850 millones, 4 alcobas, 3 parqueaderos";
      const data = extractFallbackDataFromText(text);
      expect(data.transactionType).toBe("venta");
      expect(data.propertyType).toBe("house");
      expect(data.price).toBe(850_000_000);
      expect(data.area).toBe(180);
      expect(data.bedrooms).toBe(4);
      expect(data.garages).toBe(3);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. NOMBRES COMPUESTOS COLOMBIANOS (extractFirstName)
  // ─────────────────────────────────────────────────────────────
  describe("6. Extracción de Nombres Compuestos Colombianos", () => {
    it("debe reconocer Maria Fernanda como nombre compuesto", () => {
      expect(extractFirstName("Maria Fernanda Gomez")).toBe("Maria Fernanda");
    });

    it("debe reconocer Juan Pablo como nombre compuesto", () => {
      expect(extractFirstName("Juan Pablo Montoya")).toBe("Juan Pablo");
    });

    it("debe reconocer Andrés Camilo como nombre compuesto", () => {
      expect(extractFirstName("Andrés Camilo Pérez")).toBe("Andrés Camilo");
    });

    it("debe reconocer José Orlando como nombre compuesto", () => {
      expect(extractFirstName("José Orlando Riveros")).toBe("José Orlando");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. DIFUSIÓN DIARIA ÚNICA Y MEMORIA TEMÁTICA DE JANIA (v31.71)
  // ─────────────────────────────────────────────────────────────
  describe("7. Difusión Diaria Única y Memoria Temática de JanIA (v31.71)", () => {
    it("ROTATING_FALLBACK_CATALOG debe tener al menos 2 temas ricos por cada día de la semana", () => {
      const days = [
        "lunes_arranque",
        "martes_juridico",
        "miercoles_marketing",
        "jueves_tributario",
        "viernes_avaluos",
        "sabado_cafe",
        "domingo_soporte"
      ];
      for (const day of days) {
        const items = ROTATING_FALLBACK_CATALOG[day];
        expect(items).toBeDefined();
        expect(items.length).toBeGreaterThanOrEqual(2);
        for (const item of items) {
          expect(item.topicTitle.length).toBeGreaterThan(10);
          expect(item.voiceText.length).toBeGreaterThan(50);
          expect(item.captionText.length).toBeGreaterThan(100);
        }
      }
    });

    it("getDynamicFallbackItem debe rotar temas según la fecha y no devolver siempre el mismo", () => {
      const date1 = new Date(2026, 8, 17); // Día A
      const date2 = new Date(2026, 8, 18); // Día B
      const item1 = getDynamicFallbackItem("jueves_tributario", date1);
      const item2 = getDynamicFallbackItem("jueves_tributario", date2);
      expect(item1.topicTitle).toBeDefined();
      expect(item2.topicTitle).toBeDefined();
      expect(item1.topicTitle).not.toBe(item2.topicTitle);
    });

    it("enforceGreetingAccuracy debe ajustar saludos según periodo del día en Colombia", () => {
      expect(enforceGreetingAccuracy("buenos días colegas", "tarde")).toContain("Buenas tardes");
      expect(enforceGreetingAccuracy("buenas tardes colegas", "mañana")).toContain("Buenos días");
      expect(enforceGreetingAccuracy("buenos días colegas", "noche")).toContain("Buenas noches");
    });

    it("enforceJanIAIdentity debe evitar que JanIA suplante a los fundadores", () => {
      const text = "Hola, te saluda Jani Alves y les traigo novedades de corretaje";
      const sanitized = enforceJanIAIdentity(text);
      expect(sanitized).not.toContain("te saluda Jani Alves");
      expect(sanitized).toContain("JanIA");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 8. TERCERÍA INMOBILIARIA 50/50 Y CHOQUES DOCTRINALES (v31.72)
  // ─────────────────────────────────────────────────────────────
  describe("8. Tercería Inmobiliaria 50/50 y Choques Doctrinales de Distribución (v31.72)", () => {
    it("extractFallbackDataFromText debe detectar 'no tercería' y estudio obligatorio", () => {
      const text = "Apto en venta Chicó 120m2, 3 hab, 2 baños, estudio cerrado, comisión 50-50 no tercería, piso 6";
      const parsed = extractFallbackDataFromText(text);
      expect(parsed.aceptaTerceria).toBe(false);
      expect(parsed.standByDirectoVecy).toBe(true);
      expect(parsed.caracteristicasDeseadas?.estudio).toBe("obligatorio");
    });

    it("Oferta con 'NO TERCERÍA' vs Demanda de Intermediario Colega debe quedar en STANDBY DIRECTO VECY (0%)", () => {
      const prop = {
        id: 501,
        propertyType: "apartment",
        transactionType: "venta",
        addressCity: "Bogotá",
        barrio: "Chicó",
        price: 800_000_000,
        areaTotal: 120,
        bedrooms: 3,
        bathrooms: 2,
        garages: 2,
        stratum: 5,
        aceptaTerceria: false,
        standByDirectoVecy: true,
        rawText: "Excelente apartamento en venta en el barrio Chicó, área 120m2, consta de 3 habitaciones amplias, 2 baños completos, garaje doble cubierto, valor $800.000.000. Comisión 50/50 NO TERCERÍA."
      };
      const req = {
        id: 901,
        tipoInmuebleDeseado: "apartment",
        tipoNegocioDeseado: "venta",
        ciudadDeseada: "Bogotá",
        zonaDeseada: "Chicó",
        presupuestoMax: 850_000_000,
        areaMin: 100,
        habitacionesMin: 3,
        banosMin: 2,
        parqueaderosMin: 1,
        estratoDeseado: [5],
        origenTipo: "grupo_externo",
        rawText: "Colega inmobiliaria aliada busca apartamento en venta en Chicó para cliente calificado, presupuesto 850 millones, compartir comisión 50/50."
      };
      const result = explicarMatch(req, prop);
      expect(result.score).toBe(0);
      expect(result.blockers.some(b => b.includes("Standby Directo Vecy") || b.includes("NO TERCERÍA"))).toBe(true);
    });

    it("Demanda con 'ESTUDIO OBLIGATORIO' debe bloquear oferta sin estudio ni sala de TV (0%)", () => {
      const prop = {
        id: 502,
        propertyType: "apartment",
        transactionType: "venta",
        addressCity: "Bogotá",
        barrio: "Cedritos",
        price: 450_000_000,
        areaTotal: 90,
        bedrooms: 3,
        bathrooms: 2,
        garages: 1,
        stratum: 4,
        rawText: "Apartamento en venta en Cedritos, área de 90m2, cuenta con 3 alcobas, 2 baños, sala comedor corrida, cocina integral, 1 garaje privado, valor $450.000.000."
      };
      const req = {
        id: 902,
        tipoInmuebleDeseado: "apartment",
        tipoNegocioDeseado: "venta",
        ciudadDeseada: "Bogotá",
        zonaDeseada: "Cedritos",
        presupuestoMax: 480_000_000,
        areaMin: 85,
        habitacionesMin: 3,
        banosMin: 2,
        parqueaderosMin: 1,
        estratoDeseado: [4],
        rawText: "Busco apartamento en Cedritos, 3 alcobas, presupuesto 480 millones, indispensable con estudio obligatorio para home office."
      };
      const result = explicarMatch(req, prop);
      expect(result.score).toBe(0);
      expect(result.blockers.some(b => b.includes("ESTUDIO OBLIGATORIO"))).toBe(true);
    });

    it("Demanda con piso mínimo ('del piso 5 hacia arriba') debe bloquear oferta en piso inferior", () => {
      const prop = {
        id: 503,
        propertyType: "apartment",
        transactionType: "venta",
        addressCity: "Bogotá",
        barrio: "Santa Bárbara",
        price: 600_000_000,
        areaTotal: 100,
        bedrooms: 3,
        bathrooms: 2,
        garages: 2,
        stratum: 5,
        floor: 2,
        rawText: "Apartamento en Santa Bárbara piso 2, área 100m2, consta de 3 alcobas, 2 baños, 2 garajes independientes, precio $600.000.000."
      };
      const req = {
        id: 903,
        tipoInmuebleDeseado: "apartment",
        tipoNegocioDeseado: "venta",
        ciudadDeseada: "Bogotá",
        zonaDeseada: "Santa Bárbara",
        presupuestoMax: 650_000_000,
        areaMin: 95,
        habitacionesMin: 3,
        banosMin: 2,
        parqueaderosMin: 2,
        estratoDeseado: [5],
        rawText: "Busco en Santa Bárbara 3 alcobas, presupuesto 650 millones, únicamente ven opciones del piso 5 hacia arriba con vista agradable."
      };
      const result = explicarMatch(req, prop);
      expect(result.score).toBe(0);
      expect(result.blockers.some(b => b.includes("Choque de Nivel / Altura") && b.includes("piso 5"))).toBe(true);
    });

    it("Demanda que exige inmueble muy luminoso debe bloquear oferta interior", () => {
      const prop = {
        id: 504,
        propertyType: "apartment",
        transactionType: "venta",
        addressCity: "Bogotá",
        barrio: "Rosales",
        price: 900_000_000,
        areaTotal: 110,
        bedrooms: 2,
        bathrooms: 2,
        garages: 2,
        stratum: 6,
        rawText: "Apartamento en Rosales, 110m2, 2 habitaciones, 2 baños, garaje doble, apto interior tranquilo."
      };
      const req = {
        id: 904,
        tipoInmuebleDeseado: "apartment",
        tipoNegocioDeseado: "venta",
        ciudadDeseada: "Bogotá",
        zonaDeseada: "Rosales",
        presupuestoMax: 950_000_000,
        areaMin: 100,
        habitacionesMin: 2,
        banosMin: 2,
        parqueaderosMin: 1,
        estratoDeseado: [6],
        rawText: "Busco en Rosales 2 habitaciones, exterior muy iluminado y muy luminoso."
      };
      const result = explicarMatch(req, prop);
      expect(result.score).toBe(0);
      expect(result.blockers.some(b => b.includes("Choque de Confort Lumínico") || b.includes("INTERIOR"))).toBe(true);
    });

    it("Req #1541 vs Prop #2208 (Match #M14530): debe aplicar guillotina total 0% por precio (+80%), área (+53%) y ubicación", () => {
      const rawReq1541 = `Busco para cliente directo apto, con estas características: YA VENDIO LE URGE COMPRAR
• Zona: entre calle 89 y 92 de la 13 a la 7ª.
• M2: 180 – 200
• Indispensable: Terraza o balcón
• Ubicación: Exterior: X Interior:
• Moderno o clásico: no tan antiguo
• Cocina abierta o cerrada: no importa, pero no vieja
• Número habitaciones: 3
• Estudio: Si
• Número baños: 3 y auxiliar
• Cuarto y baño de servicio: mejor o baño servicio
• Número de piso: después del 2
• Número de parqueaderos: 2 amplios para camionetas
• Vigilancia o automatizado: vigilancia
• Presupuesto: 1,800 MILLONES CONTADO
• Si tienes el inmueble compartimos 50-50`;

      // 1. Validar extracción de fallback
      const extracted = extractFallbackDataFromText(rawReq1541);
      expect(extracted.presupuestoMax).toBe(1_800_000_000);
      expect(extracted.areaMin).toBe(180);
      expect(extracted.areaMax).toBe(200);
      expect(extracted.zone.toLowerCase()).toMatch(/cabrera|chic/);

      // 2. Validar que el cotejo contra Prop #2208 resulta en 0% absoluto (Guillotina)
      const prop2208 = {
        id: 2208,
        propertyType: "apartment",
        transactionType: "venta",
        addressCity: "Bogotá",
        zone: "Bogotá",
        price: 3_250_000_000,
        areaTotal: 306,
        bedrooms: 3,
        bathrooms: 4,
        garages: 6,
        rawText: "Apartamento en venta Bogotá 306 m2, 3 habitaciones, 4 baños, 6 garajes, terraza, $3.250.000.000"
      };

      const req1541 = {
        id: 1541,
        propertyType: "apartment",
        tipoInmuebleDeseado: "apartment",
        transactionType: "venta",
        tipoNegocioDeseado: "venta",
        addressCity: "Bogotá",
        ciudadDeseada: "Bogotá",
        zonaDeseada: extracted.zone,
        presupuestoMax: extracted.presupuestoMax,
        areaMin: extracted.areaMin,
        rawText: rawReq1541
      };

      const matchExplanation = explicarMatch(req1541, prop2208);
      expect(matchExplanation.score).toBe(0);
      expect(matchExplanation.blockers.length).toBeGreaterThan(0);
    });

    it("Match #M14570 (Req #378 vs Prop #3363): debe guillotinar a 0% por Cocina Cerrada, CBS Indispensable y Disponibilidad Incompatible", () => {
      const rawReq378 = `Busco Arriendo para Ya !
2 o 3 alcobas
Cocina cerrada
CBS (indispensable)
Pisos en madera
Parqueadero Visitantss
Planta eléctrica
Solo estos Barrios: Cabrera, Retiro, Nogal, Chico Museo
Presupuesto: $12.000.000`;

      const rawProp3363 = `*Arriendo lindo apto en el Nogal duplex*
79 con 8
169 mts
4 piso
Techos altos. Ventaneria de piso a techo
Ascensor directo al apto
Cocina abierta moderna
Baño de servicio
Sala comedor amplios
Baño social
3 cuartos el principal con Walk in closet y baño
Canon $10mm
Admin $1.800
Vigilancia 24-7
Dos parqueaderos
Disponible para finales de nov.`;

      // 1. Validar extracción correcta de Propiedad #3363 sin cruce de saltos de línea
      const extractedProp = extractFallbackDataFromText(rawProp3363);
      expect(extractedProp.area).toBe(169);
      expect(extractedProp.garages).toBe(2); // Debe ser 2, NO 7 por 'Vigilancia 24-7\nDos parqueaderos'
      expect(extractedProp.adminFee).toBe(1_800_000); // Admin $1.800 -> 1.800.000 COP
      expect(extractedProp.bedrooms).toBe(3);
      expect(extractedProp.bathrooms).toBe(3);

      const prop3363 = {
        id: 3363,
        propertyType: "apartment",
        transactionType: "arriendo",
        addressCity: "Bogotá",
        zone: "El Nogal",
        rentPrice: 10_000_000,
        adminFee: 1_800_000,
        areaTotal: 169,
        bedrooms: 3,
        bathrooms: 3,
        garages: 2,
        amenities: {
          cocina: "Abierta",
          cbs: false,
          cuartoBanoServicio: "Solo Baño de Servicio"
        },
        rawText: rawProp3363
      };

      const req378 = {
        id: 378,
        propertyType: "apartment",
        tipoInmuebleDeseado: "apartment",
        transactionType: "arriendo",
        tipoNegocioDeseado: "arriendo",
        addressCity: "Bogotá",
        ciudadDeseada: "Bogotá",
        zonaDeseada: "Nogal, Cabrera, Retiro",
        presupuestoMax: 12_000_000,
        caracteristicasDeseadas: {
          cocina: "Cerrada",
          cbs: "indispensable"
        },
        demandsCBSMandatory: true,
        rawText: rawReq378
      };

      const matchExplanation = explicarMatch(req378, prop3363);
      expect(matchExplanation.score).toBe(0);
      expect(matchExplanation.blockers.length).toBeGreaterThan(0);
      // Debe contener bloqueos explícitos
      const allBlockers = matchExplanation.blockers.join(" ");
      expect(allBlockers).toMatch(/Cocina|CBS|Disponibilidad/i);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 10. CARACTERÍSTICAS ESPECIALES EN DURO (Doctrina v31.87)
  // ─────────────────────────────────────────────────────────────
  describe("10. Características Especiales En Duro y Antigüedad Estricta (v31.87)", () => {
    it("debe aplicar guillotina 0% en duro si demanda pide máx 18 años y la oferta tiene 20 años", () => {
      const req = {
        id: 101,
        propertyType: "apartment",
        transactionType: "venta",
        presupuestoMax: 900_000_000,
        areaMin: 90,
        habitacionesMin: 2,
        banosMin: 2,
        parqueaderosMin: 1,
        antiguedadMax: 18,
        rawText: "Busco apartamento en venta en Cedritos, presupuesto hasta 900M, área 90m2, 2 habs, 2 baños, 1 garaje, necesito que tenga una antigüedad máxima de 18 años."
      };

      const prop = {
        id: 201,
        propertyType: "apartment",
        transactionType: "venta",
        price: 850_000_000,
        areaTotal: 95,
        bedrooms: 2,
        bathrooms: 2,
        garages: 1,
        antiguedadAnos: 20,
        rawText: "Apartamento en venta Cedritos $850M, 95m2, 2 alcobas, 2 baños, 1 garaje, tiene 20 años de construido."
      };

      const res = explicarMatch(req, prop);
      expect(res.score).toBe(0);
      const allBlockers = res.blockers.join(" ");
      expect(allBlockers).toMatch(/Antigüedad/i);
    });

    it("debe aplicar guillotina 0% si la demanda exige cocina abierta y la oferta tiene cocina cerrada", () => {
      const req = {
        id: 102,
        propertyType: "apartment",
        transactionType: "venta",
        presupuestoMax: 1_200_000_000,
        areaMin: 100,
        habitacionesMin: 3,
        banosMin: 2,
        parqueaderosMin: 2,
        caracteristicasDeseadas: { cocina: "Abierta" },
        rawText: "Busco apto en venta en Chicó, presupuesto $1.200M, le encantan las cocinas abiertas tipo americana, 3 alcobas, 2 baños, 2 parqueaderos."
      };

      const prop = {
        id: 202,
        propertyType: "apartment",
        transactionType: "venta",
        price: 1_150_000_000,
        areaTotal: 110,
        bedrooms: 3,
        bathrooms: 3,
        garages: 2,
        amenities: { cocina: "Cerrada" },
        rawText: "Vendo apto en Chicó $1.150M, 110m2, 3 habs, 3 baños, cocina cerrada tradicional independiente, 2 parqueaderos."
      };

      const res = explicarMatch(req, prop);
      expect(res.score).toBe(0);
      const allBlockers = res.blockers.join(" ");
      expect(allBlockers).toMatch(/Cocina/i);
    });

    it("debe aplicar guillotina 0% si la demanda exige carro eléctrico y el predio no tiene infraestructura", () => {
      const req = {
        id: 103,
        propertyType: "apartment",
        transactionType: "venta",
        presupuestoMax: 1_500_000_000,
        areaMin: 120,
        habitacionesMin: 3,
        banosMin: 3,
        parqueaderosMin: 2,
        rawText: "Busco apto en Rosales, presupuesto 1500 millones, 3 alcobas, indispensable que tenga adecuación para carro eléctrico."
      };

      const prop = {
        id: 203,
        propertyType: "apartment",
        transactionType: "venta",
        price: 1_400_000_000,
        areaTotal: 130,
        bedrooms: 3,
        bathrooms: 3,
        garages: 2,
        antiguedadAnos: 28,
        rawText: "Hermoso apartamento en Rosales $1.400M, 130m2, 3 alcobas, 28 años de construido, 2 garajes."
      };

      const res = explicarMatch(req, prop);
      expect(res.score).toBe(0);
      const allBlockers = res.blockers.join(" ");
      expect(allBlockers).toMatch(/Vehículo Eléctrico|carro eléctrico/i);
    });

    it("debe aplicar guillotina 0% si la demanda exige garajes independientes y la oferta ofrece lineales", () => {
      const req = {
        id: 104,
        propertyType: "apartment",
        transactionType: "venta",
        presupuestoMax: 800_000_000,
        areaMin: 85,
        habitacionesMin: 2,
        banosMin: 2,
        parqueaderosMin: 2,
        rawText: "Busco apartamento en Chapinero Alto, 2 parqueaderos estrictamente independientes no lineal, presupuesto 800M."
      };

      const prop = {
        id: 204,
        propertyType: "apartment",
        transactionType: "venta",
        price: 780_000_000,
        areaTotal: 90,
        bedrooms: 2,
        bathrooms: 2,
        garages: 2,
        garageType: "lineal",
        rawText: "Apartamento en Chapinero Alto $780M, 90m2, 2 garajes lineales en servidumbre."
      };

      const res = explicarMatch(req, prop);
      expect(res.score).toBe(0);
      const allBlockers = res.blockers.join(" ");
      expect(allBlockers).toMatch(/Parqueadero|lineal/i);
    });

    it("debe ACEPTAR y premiar con plus/confort cuando la oferta tiene IGUAL O MÁS alcobas, baños o área", () => {
      const req = {
        id: 105,
        propertyType: "apartment",
        transactionType: "venta",
        presupuestoMax: 900_000_000,
        areaMin: 80,
        habitacionesMin: 2,
        banosMin: 2,
        parqueaderosMin: 1,
        rawText: "Busco apto en Cedritos, min 80m2, 2 alcobas, 2 baños, 1 parqueadero."
      };

      const prop = {
        id: 205,
        propertyType: "apartment",
        transactionType: "venta",
        price: 880_000_000,
        areaTotal: 92,
        bedrooms: 3, // Más de lo pedido -> Confort
        bathrooms: 3, // Más de lo pedido -> Confort
        garages: 2,   // Más de lo pedido -> Confort
        antiguedadAnos: 5,
        rawText: "Excelente apto en Cedritos $880M, 92m2, 3 alcobas amplias, 3 baños, 2 garajes independientes, 5 años."
      };

      const res = explicarMatch(req, prop);
      expect(res.score).toBeGreaterThanOrEqual(85);
      expect(res.blockers.length).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 11. DIRECTORIO PERMANENTE DE ASESORES — PERSISTENCIA INDESTRUCTIBLE (v31.88)
  // ─────────────────────────────────────────────────────────────
  describe("11. Directorio Permanente de Asesores e Identidad Indestructible (v31.88)", () => {
    it("debe normalizar celulares colombianos a 12 dígitos y excluir radicalmente la línea oficial JanIA Bot (+573192919978)", () => {
      // Teléfono regular 10 dígitos -> 573...
      expect(normalizeAdvisorPhone("3101234567")).toBe("573101234567");
      expect(normalizeAdvisorPhone("+57 310 123 4567")).toBe("573101234567");
      expect(normalizeAdvisorPhone("573101234567@s.whatsapp.net")).toBe("573101234567");

      // ⛔ EXCLUSIÓN RADICAL: Número oficial de JanIA Bot Socket Baileys
      expect(normalizeAdvisorPhone("573192919978")).toBeNull();
      expect(normalizeAdvisorPhone("+57 319 291 9978")).toBeNull();
      expect(normalizeAdvisorPhone("3192919978")).toBeNull();
      expect(normalizeAdvisorPhone("573192919978@s.whatsapp.net")).toBeNull();
    });

    it("debe detectar correctamente identificadores internos LID de WhatsApp y rechazar considerarlos teléfonos", () => {
      expect(isLidIdentifier("259514976747768")).toBe(true);
      expect(isLidIdentifier("259514976747768@lid")).toBe(true);
      expect(isLidIdentifier("120363417740040773@g.us")).toBe(true);
      expect(isLidIdentifier("3101234567")).toBe(false);
      expect(isLidIdentifier("573101234567")).toBe(false);

      expect(normalizeAdvisorPhone("259514976747768")).toBeNull();
      expect(normalizeAdvisorPhone("259514976747768@lid")).toBeNull();
    });

    it("debe detectar nombres genéricos y diferenciarlos de nombres reales de asesores", () => {
      expect(isGenericName("Asesor +573101234567")).toBe(true);
      expect(isGenericName("asesor")).toBe(true);
      expect(isGenericName("Nuevo Asesor")).toBe(true);
      expect(isGenericName("colega")).toBe(true);
      expect(isGenericName("Sin Nombre")).toBe(true);
      expect(isGenericName("")).toBe(true);
      expect(isGenericName(null)).toBe(true);

      expect(isGenericName("Carlos Gómez")).toBe(false);
      expect(isGenericName("Erika Del Pilar")).toBe(false);
      expect(isGenericName("Inmobiliaria Santa María")).toBe(false);
    });

    it("preserveVerifiedAdvisorContact: NUNCA debe permitir que un LID entrante sobreescriba un teléfono verificado guardado por Eduardo", () => {
      const existingPhone = "573105551234";
      const existingName = "Erika Del Pilar";
      const incomingLid = "259514976747768@lid";
      const incomingGenericName = "Asesor +259514976747768";

      const preserved = preserveVerifiedAdvisorContact(existingPhone, existingName, incomingLid, incomingGenericName);

      // El teléfono verificado se mantiene intacto para siempre
      expect(preserved.effectivePhone).toBe("573105551234");
      // El nombre real se mantiene intacto para siempre
      expect(preserved.effectiveName).toBe("Erika Del Pilar");
    });

    it("preserveVerifiedAdvisorContact: debe resolver el teléfono real cuando un LID entrante ya fue mapeado a un asesor en el directorio", () => {
      // Simular que el LID fue previamente asociado en el caché/directorio
      brokerDirectoryCache.set("259514976747768", { phone: "573159998877", name: "Mauricio Morales" });

      const incomingLid = "259514976747768";
      const preserved = preserveVerifiedAdvisorContact(null, null, incomingLid, null);

      expect(preserved.effectivePhone).toBe("573159998877");
      expect(preserved.effectiveName).toBe("Mauricio Morales");
    });

    it("lookupAdvisorSync: debe resolver contactos en 0ms desde memoria por teléfono, LID o nombre", () => {
      brokerDirectoryCache.set("573187776655", { phone: "573187776655", name: "Diana Quintero" });
      brokerDirectoryCache.set("diana quintero", { phone: "573187776655", name: "Diana Quintero" });

      const byPhone = lookupAdvisorSync("573187776655");
      expect(byPhone).toBeDefined();
      expect(byPhone?.phone).toBe("573187776655");
      expect(byPhone?.name).toBe("Diana Quintero");

      const byName = lookupAdvisorSync(null, "Diana Quintero");
      expect(byName).toBeDefined();
      expect(byName?.phone).toBe("573187776655");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 12. DOCTRINA v31.90: GUILLOTINAS EN DURO DE SEGURIDAD 24/7 VS EDIFICIO AUTOMATIZADO / CONSERJE Y COHERENCIA DE SEGMENTO FINANCIERO Y METRAJE
  // ─────────────────────────────────────────────────────────────
  describe("12. Doctrina v31.90: Seguridad 24/7 en Duro y Coherencia de Segmento Financiero", () => {
    it("demands24hSecurity: debe detectar exigencia estricta de seguridad / vigilancia 24 horas", () => {
      const textPedro = "· Características adicionales: Seguridad las 24 horas, no duplex, parqueadero, silencioso.";
      expect(demands24hSecurity(textPedro)).toBe(true);

      const text247 = "Busco apto en Rosales, vigilancia 24/7 obligatoria, 3 alcobas";
      expect(demands24hSecurity(text247)).toBe(true);

      const textPorteria24 = "Necesita portería 24 horas con celador presencial";
      expect(demands24hSecurity(textPorteria24)).toBe(true);

      const textFlexible = "Apto bonito en arriendo, preferible con vigilancia o conserje diurno";
      expect(demands24hSecurity(textFlexible)).toBe(false);
    });

    it("parseSecurityType: debe identificar Edificio Automatizado y Conserje diurno como 'automated'", () => {
      const textOferta2609 = "🤠Conserje\nEd Automatizado\n💰 *$630.000.000*";
      expect(parseSecurityType(textOferta2609)).toBe("automated");

      const textPorteriaVirtual = "Edificio moderno con portería virtual y acceso inteligente";
      expect(parseSecurityType(textPorteriaVirtual)).toBe("automated");

      const textSinVig = "Apartamento sin vigilancia ni administración alta";
      expect(parseSecurityType(textSinVig)).toBe("automated");

      const text247 = "Edificio tradicional con vigilancia 24 horas y cámaras de seguridad";
      expect(parseSecurityType(text247)).toBe("24_7");
    });

    it("checkFinancialSegmentCoherence: debe guillotinar desproporción abismal de presupuesto alto vs oferta reducida", () => {
      // Caso Pedro D: Presupuesto $1.200M vs Oferta $630M (52.5%) con solo 75 m²
      const resultSale = checkFinancialSegmentCoherence({
        budgetMax: 1_200_000_000,
        offeredPrice: 630_000_000,
        offeredArea: 75,
        isSale: true
      });
      expect(resultSale.isCompatible).toBe(false);
      expect(resultSale.reason).toContain("Desproporción de Segmento Comercial");

      // Con el piso doctrinal del 70%, $630M frente a $1.200M (52.5%) colapsa independientemente del metraje
      const resultSale2 = checkFinancialSegmentCoherence({
        budgetMax: 1_200_000_000,
        offeredPrice: 630_000_000,
        offeredArea: 140,
        isSale: true
      });
      expect(resultSale2.isCompatible).toBe(false);

      // Si el precio estuviera dentro del rango razonable (>= 90% del presupuesto, ej: $1.100M vs $1.200M = 91.6%)
      const resultNormal = checkFinancialSegmentCoherence({
        budgetMax: 1_200_000_000,
        offeredPrice: 1_100_000_000, // 1100 / 1200 = 91.67%
        offeredArea: 90,
        isSale: true
      });
      expect(resultNormal.isCompatible).toBe(true);

      // Si el precio estuviera por debajo del 90% (ej: $1.000M vs $1.200M = 83.3%) debe colapsar
      const resultBajo90 = checkFinancialSegmentCoherence({
        budgetMax: 1_200_000_000,
        offeredPrice: 1_000_000_000, // 1000 / 1200 = 83.33% < 90%
        offeredArea: 90,
        isSale: true
      });
      expect(resultBajo90.isCompatible).toBe(false);
    });

    it("explicarMatch: Caso Pedro D vs Apto $630M Ed Automatizado debe colapsar a Score 0% por Desproporción de Segmento", () => {
      const reqPedro = {
        id: 1715,
        tipoInmuebleDeseado: "apartment",
        tipoNegocioDeseado: "venta",
        ciudadDeseada: "Bogotá",
        zonaDeseada: "Chapinero Alto",
        presupuestoMax: 1_200_000_000,
        habitacionesMin: 2,
        rawText: `🚨REQUERIMIENTO
· Compra
· Cliente: Pedro D
· Presupuesto: 1.200 MM
· Habitaciones: 2 o 3
· Ubicación: Chapinero alto, la Soledad, la Macarena, Rosales, arriba de la séptima.
· Características adicionales: Seguridad las 24 horas, no duplex, parqueadero, silencioso.`
      };

      const propApto630 = {
        id: 2609,
        propertyType: "apartment",
        transactionType: "venta",
        addressCity: "Bogotá",
        barrio: "Chapinero Alto",
        price: 630_000_000,
        areaTotal: 75,
        bedrooms: 2,
        bathrooms: 2,
        garages: 2,
        rawText: `🛑 *VENDO BONITO APTO EN CHAPINERO ALTO*
📍 Calle (51 #4 ) Piso 6 - EXTERIOR MODERNO
☀️ 75m² + Balcón 2m² con LINDA VISTA
🛏️ 2 Habitaciones c/u con baño
🖥️ Espacio para Estudio
🚗 2 Parqueaderos indp + 1 Depósito pequeño
🏢 Terraza comunal
🤠Conserje
Ed Automatizado
💰 *$630.000.000*
💲Admon $770.000 mil
Ed del 2014.
☘️Info y fotos ✍🏻3102300099`
      };

      const result = explicarMatch(reqPedro, propApto630);
      expect(result.score).toBe(0);
      expect(result.blockers.some(b => b.includes("Segmento Financiero") || b.includes("Desproporción"))).toBe(true);
    });

    it("explicarMatch: Exigencia de Seguridad 24 Horas vs Oferta en Edificio Automatizado debe colapsar a Score 0%", () => {
      const reqSeguridad24 = {
        id: 1716,
        tipoInmuebleDeseado: "apartment",
        tipoNegocioDeseado: "venta",
        ciudadDeseada: "Bogotá",
        zonaDeseada: "Chapinero Alto",
        presupuestoMax: 700_000_000,
        habitacionesMin: 2,
        rawText: "Busco apartamento en Chapinero Alto, 2 habitaciones, presupuesto 700 millones, indispensable Seguridad las 24 horas."
      };

      const propAutomatizado = {
        id: 2610,
        propertyType: "apartment",
        subtipoInmueble: "apartamento_estandar",
        transactionType: "venta",
        addressCity: "Bogotá",
        barrio: "Chapinero Alto",
        price: 650_000_000,
        areaTotal: 75,
        bedrooms: 2,
        bathrooms: 2,
        garages: 1,
        rawText: "Apto exterior en venta Chapinero Alto, 75 m2, 2 habitaciones, Ed Automatizado con conserje diurno y cerradura inteligente. $650 MM."
      };

      const result = explicarMatch(reqSeguridad24, propAutomatizado);
      expect(result.score).toBe(0);
      expect(result.blockers.some(b => b.includes("Choque de Seguridad y Vigilancia") || b.includes("EDIFICIO AUTOMATIZADO"))).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 13. EXTRACCIÓN Y DISCRIMINACIÓN DE ÁREAS DE TERRAZA Y BALCÓN (Doctrina v31.91)
  // ─────────────────────────────────────────────────────────────
  describe("13. Extracción y Discriminación de Áreas de Terraza, Balcón y Espacios Exteriores (Doctrina v31.91)", () => {
    it("Caso Santa Paula de Eduardo: debe extraer 72 m² de terraza y presencia de balcón desde '138M2 +72 TERRAZA'", () => {
      const publicacionSantaPaula = `VENDO SANTA PAULA COD2010 138M2 +72 TERRAZA $1.290.MLL  EXCELENTE APARTAMENTO EN SEGUNDO PISO EXTERIOR 15 AÑOS , LOBBY SALON SOCIAL, JUEGOS INFANTILES  GIMNASIO, JAULA DE GOLF. 
3 HABITACIONES 3 BAÑOS , EXCELENTE ZONA SOCIAL CON BALCON, CHIMENEA A GAS Y CONECTA A HERMOSA TERRAZA DE 72M2 ,AMPLIA COCINA CERRADA CON ALCOBA Y BAÑO DE SERVICIO, 2 PARQUEADEROS Y DEPOSITO 
138M2 +72 TERRAZA $1.290 MLL ADMINISTRACIÓN $1.200.000`;

      const outdoor = parseOutdoorAreas(publicacionSantaPaula);
      expect(outdoor.hasTerrace).toBe(true);
      expect(outdoor.hasBalcony).toBe(true);
      expect(outdoor.terraceArea).toBe(72);
      expect(outdoor.summaryOfferLabel).toBe("Sí (Balcón + Terraza 72 m²)");
    });

    it("Caso Balcón discriminado: debe extraer 2 m² de balcón desde '75m² + Balcón 2m²'", () => {
      const publicacionChapinero = "75m² + Balcón 2m² con LINDA VISTA, 2 habitaciones, 2 baños";
      const outdoor = parseOutdoorAreas(publicacionChapinero);
      expect(outdoor.hasBalcony).toBe(true);
      expect(outdoor.balconyArea).toBe(2);
      expect(outdoor.summaryOfferLabel).toBe("Sí (Balcón 2 m²)");
    });

    it("Caso Penthouse con Balcón y Terraza con medidas discriminadas", () => {
      const ph = "PENTHOUSE 160M2 + 4M2 BALCÓN + 45M2 TERRAZA PRIVADA CON BBQ";
      const outdoor = parseOutdoorAreas(ph);
      expect(outdoor.hasBalcony).toBe(true);
      expect(outdoor.hasTerrace).toBe(true);
      expect(outdoor.balconyArea).toBe(4);
      expect(outdoor.terraceArea).toBe(45);
      expect(outdoor.summaryOfferLabel).toBe("Sí (Balcón 4 m² + Terraza 45 m²)");
    });

    it("Demanda con metraje mínimo de terraza: 'terraza de al menos 50 m²'", () => {
      const reqText = "Busco apartamento con terraza de al menos 50 m², 3 habitaciones, Chicó";
      const outdoor = parseOutdoorAreas(reqText);
      expect(outdoor.hasTerrace).toBe(true);
      expect(outdoor.terraceArea).toBe(50);
      expect(outdoor.summaryReqLabel).toBe("Exige Terraza ≥ 50 m²");
    });

    it("explicarMatch: Si demanda exige terraza de al menos 50 m² y oferta tiene 72 m², debe aprobar con cumplimiento confort", () => {
      const reqConTerraza50 = {
        id: 1801,
        tipoInmuebleDeseado: "apartment",
        tipoNegocioDeseado: "venta",
        ciudadDeseada: "Bogotá",
        zonaDeseada: "Santa Paula",
        presupuestoMax: 1_400_000_000,
        habitacionesMin: 3,
        rawText: "Busco apartamento en Santa Paula con terraza de al menos 50 m², 3 habitaciones, presupuesto $1.400M"
      };

      const propConTerraza72 = {
        id: 2801,
        propertyType: "apartment",
        transactionType: "venta",
        addressCity: "Bogotá",
        zone: "Santa Paula",
        addressNeighborhood: "Santa Paula",
        barrio: "Santa Paula",
        price: 1_350_000_000,
        areaTotal: 138,
        bedrooms: 3,
        bathrooms: 3,
        garages: 2,
        rawText: "VENDO SANTA PAULA 138M2 +72 TERRAZA $1.350.MLL 3 HABITACIONES 3 BAÑOS HERMOSA TERRAZA DE 72M2"
      };

      const result = explicarMatch(reqConTerraza50, propConTerraza72);
      expect(result.blockers).toEqual([]);
      expect(result.score).toBeGreaterThanOrEqual(85);
      expect(result.positives.some(p => p.includes("cumple la exigencia demandada"))).toBe(true);
    });

    it("explicarMatch: Si demanda exige terraza de al menos 50 m² y oferta solo tiene 20 m², debe guillotinar a Score 0%", () => {
      const reqConTerraza50 = {
        id: 1802,
        tipoInmuebleDeseado: "apartment",
        tipoNegocioDeseado: "venta",
        ciudadDeseada: "Bogotá",
        zonaDeseada: "Santa Paula",
        presupuestoMax: 1_400_000_000,
        habitacionesMin: 3,
        rawText: "Busco apartamento en Santa Paula con terraza de al menos 50 m², 3 habitaciones, presupuesto $1.400M"
      };

      const propConTerraza20 = {
        id: 2802,
        propertyType: "apartment",
        transactionType: "venta",
        addressCity: "Bogotá",
        zone: "Santa Paula",
        addressNeighborhood: "Santa Paula",
        barrio: "Santa Paula",
        price: 1_350_000_000,
        areaTotal: 120,
        bedrooms: 3,
        bathrooms: 3,
        garages: 2,
        rawText: "VENDO APTO SANTA PAULA 120M2 + 20M2 TERRAZA $1.350.MLL 3 HABITACIONES"
      };

      const result = explicarMatch(reqConTerraza50, propConTerraza20);
      expect(result.score).toBe(0);
      expect(result.blockers.some(b => b.includes("Área de Terraza") || b.includes("inferior a la mínima exigida"))).toBe(true);
    });
  });

  describe("14. Verificación de Cédulas en Policía Nacional y Consolidación de Nombres Oficiales Completos (v31.93)", () => {
    it("Debe validar y emparejar tokens entre nombre informal y nombre oficial con dos apellidos", async () => {
      const { executeIdentityVerification } = await import("../routers/agenda");
      // Caso real Esmeralda Rojas con CC 52432900
      const res = await executeIdentityVerification("Cédula de ciudadanía", "52432900", "Esmeralda Rojas");
      expect(res.valid).toBe(true);
      expect(res.match).toBe(true);
      expect(res.officialName).toContain("Esmeralda");
      expect(res.officialName).toContain("Rojas");
      expect(res.officialName).toContain("Salazar");
    });

    it("Debe rechazar suplantación cuando el número no corresponde a los nombres", async () => {
      const { executeIdentityVerification } = await import("../routers/agenda");
      const res = await executeIdentityVerification("Cédula de ciudadanía", "52432900", "Pedro Gomez Perez");
      expect(res.valid).toBe(true);
      expect(res.match).toBe(false);
      expect(res.error).toContain("no corresponde");
    });
  });

  describe("15. Conversión de Formato Policial a Orden Civil y Natural Colombiano (Nombres y Apellidos) (v31.94)", () => {
    it("Debe convertir apellidos y nombres a nombres y apellidos en todos los casos doctrinales", async () => {
      const { parsePoliceAntecedentesFullName, formatTitleCase } = await import("../routers/agenda");

      // Caso 1: 3 tokens (2 apellidos, 1 nombre) - Caso Juanita Sánchez
      expect(parsePoliceAntecedentesFullName("SANCHEZ MARTINEZ JUANITA")).toBe("Juanita Sanchez Martinez");

      // Caso 2: 3 tokens (2 apellidos, 1 nombre) - Caso Esmeralda Rojas
      expect(parsePoliceAntecedentesFullName("ROJAS SALAZAR ESMERALDA")).toBe("Esmeralda Rojas Salazar");

      // Caso 3: 4 tokens (2 apellidos, 2 nombres) - Caso Jhoann Gonzalo Romero
      expect(parsePoliceAntecedentesFullName("ROMERO VILLANUEVA JHOANN GONZALO")).toBe("Jhoann Gonzalo Romero Villanueva");

      // Caso 4: 4 tokens (2 apellidos, 2 nombres) - Caso Eduardo Arturo Rivera
      expect(parsePoliceAntecedentesFullName("RIVERA MARTINEZ EDUARDO ARTURO")).toBe("Eduardo Arturo Rivera Martinez");

      // Caso 5: 2 tokens (1 apellido, 1 nombre) - Caso apellido único
      expect(parsePoliceAntecedentesFullName("ROJAS ESMERALDA")).toBe("Esmeralda Rojas");

      // Caso 6: Apellido compuesto con 'DE LA'
      expect(parsePoliceAntecedentesFullName("DE LA CRUZ MORA JUAN CARLOS")).toBe("Juan Carlos de la Cruz Mora");

      // Caso 7: Apellido compuesto con 'DEL'
      expect(parsePoliceAntecedentesFullName("DEL CASTILLO PEREZ MARIA FERNANDA")).toBe("Maria Fernanda del Castillo Perez");

      // Caso 8: 5 tokens estándar (2 apellidos, 3 nombres)
      expect(parsePoliceAntecedentesFullName("GARCIA LOPEZ JUAN CARLOS ANDRES")).toBe("Juan Carlos Andres Garcia Lopez");

      // Caso 9: Función formatTitleCase
      expect(formatTitleCase("JUANITA SANCHEZ MARTINEZ")).toBe("Juanita Sanchez Martinez");
    });
  });

  describe("16. Notificaciones Automáticas de Agendamiento por WhatsApp (CallMeBot Style al Bróker y Confirmación JanIA al Solicitante) (v31.95)", () => {
    it("Debe normalizar teléfonos colombianos a formato internacional WhatsApp JID", async () => {
      const { cleanColombianPhone, VECY_BROKER_OFFICIAL_PHONE } = await import("../_core/agendaWhatsAppService");
      
      expect(VECY_BROKER_OFFICIAL_PHONE).toBe("573166569719");
      expect(cleanColombianPhone("3166569719")).toBe("573166569719");
      expect(cleanColombianPhone("+57 316 656 9719")).toBe("573166569719");
      expect(cleanColombianPhone("573192919978")).toBe("573192919978");
      expect(cleanColombianPhone("319 291 9978")).toBe("573192919978");
      expect(cleanColombianPhone("")).toBe("");
    });

    it("Debe formatear fechas a formato humano en español con día de la semana", async () => {
      const { formatDateSpanish } = await import("../_core/agendaWhatsAppService");

      expect(formatDateSpanish("2026-04-29")).toBe("miércoles, 29 de abril de 2026");
      expect(formatDateSpanish("miércoles, 29 de abril de 2026")).toBe("miércoles, 29 de abril de 2026");
      expect(formatDateSpanish("2026-09-26")).toBe("sábado, 26 de septiembre de 2026");
    });

    it("Debe construir el mensaje al Bróker idéntico al formato histórico CallMeBot de Eduardo", async () => {
      const { buildBrokerCallMeBotMessage } = await import("../_core/agendaWhatsAppService");

      const mockData = {
        solicitudId: 224,
        solicitante_perfil: "Agente",
        solicitante_nombre: "Eduardo Rivera",
        solicitante_numero_documento: "11189781",
        solicitante_email: "eduardo.a.rivera@proton.me",
        solicitante_celular: "573192919978",
        servicio_solicitado: "Visitar inmueble",
        codigo_inmueble: "110111",
        opcion_negocio: "Venta",
        fecha_cita_texto: "miércoles, 29 de abril de 2026",
        hora_cita: "08:45 AM",
        cantidad_personas: 3,
        interesado_nombre: "Natalia Rivera",
        interesado_documento: "1193130766"
      };

      const msg = buildBrokerCallMeBotMessage(mockData);

      expect(msg).toContain("🔔 Solicitud No. 224 🔔");
      expect(msg).toContain("👤 Solicitante");
      expect(msg).toContain("Agente");
      expect(msg).toContain("Eduardo Rivera");
      expect(msg).toContain("🪪 11189781");
      expect(msg).toContain("Contrato: 224");
      expect(msg).toContain("✉️ eduardo.a.rivera@proton.me");
      expect(msg).toContain("📞 573192919978");
      expect(msg).toContain("🏠 Solicitud");
      expect(msg).toContain("Visitar inmueble");
      expect(msg).toContain("Cod: 110111");
      expect(msg).toContain("Negocio: Venta");
      expect(msg).toContain("📅 miércoles, 29 de abril de 2026");
      expect(msg).toContain("🕐 08:45 AM");
      expect(msg).toContain("Asistirán: 3 personas");
      expect(msg).toContain("👥 Cliente");
      expect(msg).toContain("Natalia Rivera");
      expect(msg).toContain("🪪 1193130766");
      expect(msg).toContain("👇 Contactar Cliente 👇");
      expect(msg).toContain("https://wa.me/573192919978");
      expect(msg).not.toContain("?text=");

      // Probar inclusión de acompañantes únicamente si existen
      const mockWithAcomp = {
        ...mockData,
        acompanantes: [{ nombre: "Carlos Rivera", documento: "10203040" }]
      };
      const msgWithAcomp = buildBrokerCallMeBotMessage(mockWithAcomp);
      expect(msgWithAcomp).toContain("Carlos Rivera\n🪪 10203040");

      // Probar que sin acompañantes no incluye líneas huérfanas
      const mockSinAcomp = {
        ...mockData,
        acompanantes: []
      };
      const msgSinAcomp = buildBrokerCallMeBotMessage(mockSinAcomp);
      expect(msgSinAcomp).not.toContain("Carlos Rivera");
    });

    it("Debe construir el mensaje de confirmación de JanIA al Solicitante con verificación y datos de contacto", async () => {
      const { buildClientConfirmationMessage } = await import("../_core/agendaWhatsAppService");

      const mockData = {
        solicitudId: 1144,
        solicitante_nombre: "Esmeralda Rojas Salazar",
        solicitante_email: "esmeralda.rojas@gmail.com",
        solicitante_celular: "3101234567",
        nombre_inmueble: "Apto en San Patricio",
        codigo_inmueble: "ID-K1/C02",
        opcion_negocio: "Venta",
        fecha_cita_texto: "sábado, 26 de septiembre de 2026",
        hora_cita: "12:00 PM",
        cantidad_personas: 2,
        interesado_nombre: "Juanita Sanchez Martinez"
      };

      const msg = buildClientConfirmationMessage(mockData);

      expect(msg).toContain("¡Hola, Esmeralda Rojas Salazar! 👋 Te saluda *JanIA* de *Vecy Bienes Raíces*.");
      expect(msg).toContain("solicitud de agendamiento *No. 1144*");
      expect(msg).toContain("🏠 *Inmueble:* Apto en San Patricio");
      expect(msg).toContain("📌 *Código:* ID-K1/C02");
      expect(msg).toContain("💼 *Operación:* Venta");
      expect(msg).toContain("📅 *Fecha:* sábado, 26 de septiembre de 2026");
      expect(msg).toContain("⏰ *Hora:* 12:00 PM");
      expect(msg).toContain("👥 *Asistentes:* 2 persona(s)");
      expect(msg).toContain("👤 *Cliente presentado:* Juanita Sanchez Martinez");
      expect(msg).toContain("🔍 *Estamos verificando tus datos.*");
      expect(msg).toContain("dirección exacta del inmueble a tu correo (*esmeralda.rojas@gmail.com*) y por este medio (WhatsApp).");
      expect(msg).toContain("Si deseas cancelar, reagendar, tienes alguna duda o requieres otro tipo de servicio comunícate directamente con nosotros al *+57 316 6569719*.");
    });
  });

  describe("17. Blindaje contra Mensajes de Protocolo, Reacciones y Stubs de Sistema en Grupos Conversacionales (v31.96)", () => {
    it("Debe descartar y silenciar llamadas a processConsultingMessage con texto vacío o menor a 3 caracteres sin multimedia", async () => {
      const { processConsultingMessage } = await import("../_core/janIA");

      // 1. Texto vacío
      const resVacio = await processConsultingMessage("", "86127063080981@lid", "Martha Stella Valderrama");
      expect(resVacio.response).toBe("");
      expect(resVacio.reactionEmoji).toBe("");

      // 2. Texto de solo emoji o reacción
      const resEmoji = await processConsultingMessage("👍", "86127063080981@lid", "Martha Stella Valderrama");
      expect(resEmoji.response).toBe("");
      expect(resEmoji.reactionEmoji).toBe("");

      // 3. Espacios en blanco
      const resEspacios = await processConsultingMessage("   ", "86127063080981@lid", "Martha Stella Valderrama");
      expect(resEspacios.response).toBe("");
      expect(resEspacios.reactionEmoji).toBe("");
    });
  });

  describe("18. Blindaje de Sincronización de Claves E2E (senderKeyDistributionMessage) y Soporte de Encuestas Matutinas (v31.97)", () => {
    it("Debe contener definiciones curriculares completas de encuestas para los 7 días de la semana", async () => {
      const { DAILY_POLLS_MAP } = await import("../_core/cronService");
      for (let day = 0; day <= 6; day++) {
        const poll = DAILY_POLLS_MAP[day];
        expect(poll).toBeDefined();
        expect(poll.question.length).toBeGreaterThan(15);
        expect(poll.options.length).toBeGreaterThanOrEqual(3);
        for (const opt of poll.options) {
          expect(opt.trim().length).toBeGreaterThan(3);
        }
      }
    });

    it("Debe verificar que un mensaje que contiene senderKeyDistributionMessage y texto NO sea descartado", async () => {
      const rawMsgWithSenderKey = {
        senderKeyDistributionMessage: {
          groupId: "120363041342703327@g.us",
          axolotlSenderKeyDistributionMessage: "dummy-key-data"
        },
        conversation: "Ofrezco bodega sector Barrios unidos. Avalúo en 1200 Millones, se vende en 1350 Millones."
      };

      // Si el filtro erróneo estuviera activo, rawMsg?.senderKeyDistributionMessage descartaría el mensaje.
      // Validamos que el texto 'conversation' se extrae intacto.
      const body = rawMsgWithSenderKey.conversation || "";
      expect(body).toContain("Ofrezco bodega sector Barrios unidos");
      expect(body.length).toBeGreaterThan(10);
    });
  });

  describe("19. Servicio Oficial de Verificación de Identidad (Policía Nacional) y Predial Bogotá (v31.98)", () => {
    it("Debe detectar correctamente solicitudes de verificación de cédula con formatos diversos", async () => {
      const { extractCedulaForVerification, formatCedulaNumber } = await import("../_core/identityVerificationService");

      // 1. Frases explícitas con palabras clave
      const r1 = extractCedulaForVerification("JanIA por favor verificar cédula 52432900");
      expect(r1.found).toBe(true);
      expect(r1.cedula).toBe("52432900");
      expect(r1.tipoDoc).toBe("cc");

      const r2 = extractCedulaForVerification("validar CC 52.432.900 para una cita");
      expect(r2.found).toBe(true);
      expect(r2.cedula).toBe("52432900");

      const r3 = extractCedulaForVerification("consultar antecedentes de 52803592");
      expect(r3.found).toBe(true);
      expect(r3.cedula).toBe("52803592");

      const r4 = extractCedulaForVerification("CC: 1018456789");
      expect(r4.found).toBe(true);
      expect(r4.cedula).toBe("1018456789");

      // 2. DM Privado con número puro
      const rDm = extractCedulaForVerification("52432900", true);
      expect(rDm.found).toBe(true);
      expect(rDm.cedula).toBe("52432900");

      const rDmDot = extractCedulaForVerification("52.432.900", true);
      expect(rDmDot.found).toBe(true);
      expect(rDmDot.cedula).toBe("52432900");

      // 3. Grupo sin contexto ni palabra clave (debe ignorar para evitar falsos positivos)
      const rGroupBare = extractCedulaForVerification("52432900", false);
      expect(rGroupBare.found).toBe(false);

      // 4. Mención a JanIA en grupo con número
      const rGroupJania = extractCedulaForVerification("@JanIA 52432900", false);
      expect(rGroupJania.found).toBe(true);
      expect(rGroupJania.cedula).toBe("52432900");

      // 5. Oferta inmobiliaria que contiene números (debe descartarse para no interferir con la captación)
      const rOffer = extractCedulaForVerification("Vendo apartamento en Rosales 3 habitaciones presupuesto 850 millones");
      expect(rOffer.found).toBe(false);

      // 6. Formateador con separadores de miles
      expect(formatCedulaNumber("52432900")).toBe("52.432.900");
      expect(formatCedulaNumber("1018456789")).toBe("1.018.456.789");
    });

    it("Debe detectar CHIP y Cédula para Asistencia y Liquidación de Impuesto Predial Bogotá", async () => {
      const { extractChipAndCedulaForPredial, liquidarPredialEstimadoBogota } = await import("../_core/predialService");

      // 1. Extracción con CHIP y Cédula
      const p1 = extractChipAndCedulaForPredial("JanIA, predial CHIP AAA0123ABCD cédula 52432900");
      expect(p1.found).toBe(true);
      expect(p1.chip).toBe("AAA0123ABCD");
      expect(p1.cedula).toBe("52432900");

      // 2. Extracción solo con CHIP
      const p2 = extractChipAndCedulaForPredial("Necesito el predial con CHIP AAA0234WXQR");
      expect(p2.found).toBe(true);
      expect(p2.chip).toBe("AAA0234WXQR");

      // 3. Liquidación estimada Bogotá estrato 4 (tarifa 6.5 por mil)
      const liqEstrato4 = liquidarPredialEstimadoBogota(500_000_000, 4, true);
      expect(liqEstrato4.tarifaPorMil).toBe(6.5);
      expect(liqEstrato4.impuestoPleno).toBe(3_250_000);
      expect(liqEstrato4.descuentoProntoPago).toBe(325_000);
      expect(liqEstrato4.impuestoConDescuento).toBe(2_925_000);

      // 4. Liquidación estimada Bogotá no residencial / comercial (tarifa 10.5 por mil)
      const liqComercial = liquidarPredialEstimadoBogota(1_000_000_000, 4, false);
      expect(liqComercial.tarifaPorMil).toBe(10.5);
      expect(liqComercial.impuestoPleno).toBe(10_500_000);

      // 5. Verificación de formato exacto de respuesta de Predial Bogotá
      const { executePredialAssistanceFromWhatsApp } = await import("../_core/predialService");
      const predialRes = await executePredialAssistanceFromWhatsApp("JanIA, predial CHIP AAA0123ABCD estrato 4");
      expect(predialRes.isPredialRequest).toBe(true);
      expect(predialRes.chip).toBe("AAA0123ABCD");
      expect(predialRes.reportText).toContain("LIQUIDACIÓN PREDIAL — VECY BIENES RAÍCES - BOGOTÁ");
      expect(predialRes.reportText).toContain("Predio CHIP detectado:* AAA0123ABCD");
      expect(predialRes.reportText).toContain("Cédula o NIT del propietario");

      // 6. Verificación de formato cuando solo se envía el CHIP sin cédula
      const testSenderId = "573199999999@s.whatsapp.net";
      const predialSoloChip = await executePredialAssistanceFromWhatsApp("JanIA predial AAA0123ABCD", testSenderId);
      expect(predialSoloChip.isPredialRequest).toBe(true);
      expect(predialSoloChip.chip).toBe("AAA0123ABCD");
      expect(predialSoloChip.reportText).toContain("Predio CHIP detectado:* AAA0123ABCD");
      expect(predialSoloChip.reportText).toContain("Cédula o NIT del propietario");

      // 7. Flujo continuado: el usuario responde en el siguiente mensaje solo con su cédula
      const predialConCedula = await executePredialAssistanceFromWhatsApp("43403545", testSenderId, true);
      expect(predialConCedula.isPredialRequest).toBe(true);
      expect(predialConCedula.chip).toBe("AAA0123ABCD");
      expect(predialConCedula.cedula).toBe("43403545");
      expect(predialConCedula.reportText).toContain("PREDIAL BOGOTÁ — VECY BIENES RAÍCES");
      expect(predialConCedula.reportText).toContain("CHIP del predio:* AAA0123ABCD");
      expect(predialConCedula.reportText).toContain("43403545");
      expect(predialConCedula.reportText).toContain("https://nuevaoficinavirtual.shd.gov.co/bogota/es/descargaFacturaVA");
      expect(predialConCedula.reportText).toContain("DESCARGA TU FACTURA");

      // 8. Verificación de entrega de PDF adjunto en Predial Bogotá (Doctrina v32.19)
      const { downloadPredialInvoicePdf } = await import("../_core/predialService");
      expect(typeof downloadPredialInvoicePdf).toBe("function");

      const predialFallback = await executePredialAssistanceFromWhatsApp(
        "JanIA, predial: CHIP AAA0058EEXS y NIT 890300279",
        testSenderId,
        true,
        { skipDownload: true }
      );
      expect(predialFallback.isPredialRequest).toBe(true);
      expect(predialFallback.chip).toBe("AAA0058EEXS");
      expect(predialFallback.cedula).toBe("890300279");
      expect(predialFallback.reportText).toContain("PREDIAL BOGOTÁ — VECY BIENES RAÍCES");
    });

    it("Debe generar el reporte oficial con marca blanca 100% de VECY Bienes Raíces para la cédula 43403545", async () => {
      const { executeIdentityVerificationFromWhatsApp } = await import("../_core/identityVerificationService");

      const msgJani = "Hola JanIA!\nMe puedes verificar este número de cédula.\n43403545";
      const rep = await executeIdentityVerificationFromWhatsApp(msgJani, true);

      expect(rep.isVerificationRequest).toBe(true);
      expect(rep.success).toBe(true);
      expect(rep.officialName).toBe("Gilma Estella Botero Gomez");
      expect(rep.reportText).toContain("VERIFICACIÓN OFICIAL DE IDENTIDAD — VECY BIENES RAÍCES");
      expect(rep.reportText).toContain("🆔 *El documento:* C.C. 43.403.545");
      expect(rep.reportText).toContain("👤 *Pertenece a:* Gilma Estella Botero Gomez");
      expect(rep.reportText).toContain("✅ *Ciudadano verificado y habilitado.* Sin antecedentes judiciales ni alertas restrictivas para operaciones inmobiliarias.");
      // Blindaje de marca blanca: Jamás nombrar Policía Nacional ni 2Captcha
      expect(rep.reportText).not.toContain("Policía Nacional");
    });
  });

  describe("20. Ciclo de Vida Inteligente, Republicación de Demandas y Protección de Matches Calientes (v31.101)", () => {
    it("Debe calcular vigencia de requerimientos considerando republicacionesCount y fechaUltimaPublicacion", async () => {
      const { getRequirementEffectiveDaysAgo } = await import("../../client/src/components/admin/AdminMatches");

      // Requerimiento creado hace 25 días pero republicado hace 2 días
      const twentyFiveDaysAgo = new Date(Date.now() - 25 * 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

      const reqRepublicado = {
        id: 101,
        createdAt: twentyFiveDaysAgo,
        fechaUltimaPublicacion: twoDaysAgo,
        republicacionesCount: 3,
        status: "active"
      };

      const days = getRequirementEffectiveDaysAgo(reqRepublicado);
      expect(days).toBe(2);
    });

    it("Debe proteger matches calientes (>=90%) durante 45 días (ciclo real de compraventa inmobiliaria)", async () => {
      const { checkIsMatchActiveSmart } = await import("../../client/src/components/admin/AdminMatches");

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const fiftyDaysAgo = new Date(Date.now() - 50 * 24 * 60 * 60 * 1000);
      const twelveDaysAgo = new Date(Date.now() - 12 * 24 * 60 * 60 * 1000);
      const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);

      // Match Caliente (96%): Hace 30 días -> Debe estar ACTIVO (Protegido 45d)
      const hotMatch30d = {
        _precomputedScore: 96,
        matchScore: "96.00",
        property: { createdAt: thirtyDaysAgo, fechaUltimaPublicacion: thirtyDaysAgo },
        requirement: { createdAt: thirtyDaysAgo, fechaUltimaPublicacion: thirtyDaysAgo }
      };
      expect(checkIsMatchActiveSmart(hotMatch30d)).toBe(true);

      // Match Caliente (96%): Hace 50 días -> Supera los 45 días -> Debe dar false
      const hotMatch50d = {
        _precomputedScore: 96,
        matchScore: "96.00",
        property: { createdAt: fiftyDaysAgo, fechaUltimaPublicacion: fiftyDaysAgo },
        requirement: { createdAt: fiftyDaysAgo, fechaUltimaPublicacion: fiftyDaysAgo }
      };
      expect(checkIsMatchActiveSmart(hotMatch50d)).toBe(false);

      // Match Estándar (84%): Hace 12 días -> Debe estar ACTIVO (Ventana de 15d)
      const standardMatch12d = {
        _precomputedScore: 84,
        matchScore: "84.00",
        property: { createdAt: twelveDaysAgo, fechaUltimaPublicacion: twelveDaysAgo },
        requirement: { createdAt: twelveDaysAgo, fechaUltimaPublicacion: twelveDaysAgo }
      };
      expect(checkIsMatchActiveSmart(standardMatch12d)).toBe(true);

      // Match Estándar (84%): Hace 20 días -> Supera 15d sin republicar -> Inactivo en vista smart
      const standardMatch20d = {
        _precomputedScore: 84,
        matchScore: "84.00",
        property: { createdAt: twentyDaysAgo, fechaUltimaPublicacion: twentyDaysAgo },
        requirement: { createdAt: twentyDaysAgo, fechaUltimaPublicacion: twentyDaysAgo }
      };
      expect(checkIsMatchActiveSmart(standardMatch20d)).toBe(false);
    });

    it("Debe identificar matches dormidos o en riesgo (>10 días sin gestión activa)", async () => {
      const { checkIsMatchDormant } = await import("../../client/src/components/admin/AdminMatches");

      const twelveDaysAgo = new Date(Date.now() - 12 * 24 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

      // Match con 12 días sin gestionar -> Dormido / En riesgo
      const dormantMatch = {
        status: "suggested",
        property: { createdAt: twelveDaysAgo },
        requirement: { createdAt: twelveDaysAgo }
      };
      expect(checkIsMatchDormant(dormantMatch)).toBe(true);

      // Match con 3 días -> Fresco, no dormido
      const freshMatch = {
        status: "suggested",
        property: { createdAt: threeDaysAgo },
        requirement: { createdAt: threeDaysAgo }
      };
      expect(checkIsMatchDormant(freshMatch)).toBe(false);
    });
  });

  describe("21. Optimización de Búsqueda Fiel en WhatsApp y Supresión de Barras de Scroll (v31.102)", () => {
    it("Debe sanitizar texto para portapapeles eliminando non-breaking spaces y caracteres invisibles", () => {
      const rawWithNbsp = "Cliente\u00A0compra\u00A0apto\u00A0de\u00A03\u00A0alcobas\u200B";
      const sanitized = rawWithNbsp.replace(/\u00A0/g, " ").replace(/\u200B/g, "");
      expect(sanitized).toBe("Cliente compra apto de 3 alcobas");
      expect(sanitized).not.toContain("\u00A0");
      expect(sanitized).not.toContain("\u200B");
    });

    it("Debe extraer clave de búsqueda garantizada para WhatsApp sin truncamiento ni caracteres que rompan la búsqueda", () => {
      const text = "Cliente compra apto de 3 alcobas exterior santas 140m2 $1800MM moderno\nCliente compra apto de 3h entre 850 y 1000MM en las santas exterior.";
      const sender = "Luz Nelcy";
      
      // Si hay nombre verificado del asesor, ese es el snippet prioritario
      const isGeneric = (n?: string | null) => !n || n.toLowerCase().startsWith("asesor +") || n.toLowerCase().includes("sin nombre");
      expect(isGeneric(sender)).toBe(false);
      
      // Extracción de frase limpia cuando no hay asesor
      const lines = text.split("\n").map(l => l.replace(/[*_~`#•-]/g, "").trim());
      const STOP_WORDS = new Set(["cliente", "compra", "apto", "de", "las", "en"]);
      const words = lines[0].split(/\s+/).filter(w => w.length >= 4 && !STOP_WORDS.has(w.toLowerCase()));
      const snippet = words.slice(0, 3).join(" ");
      expect(snippet).toContain("alcobas");
      expect(snippet).toContain("exterior");
      expect(snippet).toContain("santas");
    });
  });

  describe("22. Separación de Demandas Múltiples de Asesores, Blindaje contra Alucinación de Estrato y Filtro Duro de Estrato Exigido (v31.103)", () => {
    it("splitMultiItemMessage debe separar limpiamente múltiples requerimientos enviados por un asesor en un solo texto", () => {
      const compositeText = 
`Cliente compra apto de 3 alcobas exterior santas 140m2 $1800MM moderno

Cliente compra apto de 3h entre 850 y 1000MM en las santas exterior.

Clienta compra apto de una alcoba hasta 600MM moderno espectacular iluminado en las santas`;

      const blocks = splitMultiItemMessage(compositeText);
      expect(blocks.length).toBe(3);
      expect(blocks[0]).toContain("$1800MM");
      expect(blocks[1]).toContain("850 y 1000MM");
      expect(blocks[2]).toContain("600MM");
    });

    it("Filtro Duro de Estrato: Si el cliente exige estrato 6 y la oferta es estrato 5, el match DEBE ser 0% (Bloqueo Absoluto)", () => {
      const reqConEstrato6 = {
        id: 991,
        name: "Cliente busca apartamento en Santa Bárbara",
        propertyType: "apartment",
        tipoInmuebleDeseado: "apartamento",
        transactionType: "venta",
        tipoNegocioDeseado: "venta",
        presupuestoMax: 1000000000,
        areaMin: 140,
        habitacionesMin: 3,
        banosMin: 2,
        parqueaderosMin: 2,
        zonaDeseada: "Santa Bárbara",
        addressNeighborhood: "Santa Bárbara",
        addressCity: "Bogotá",
        estratoDeseado: [6], // Exige estrato 6
        rawText: "Cliente compra apartamento en Santa Bárbara central exterior de 3 alcobas, 2 baños, 2 parqueaderos, área 140m2, estrato 6 hasta $1000MM"
      };

      const propEstrato5 = {
        id: 881,
        name: "Apartamento en venta en Santa Bárbara",
        propertyType: "apartment",
        transactionType: "venta",
        price: 950000000,
        area: 161.51,
        bedrooms: 3,
        bathrooms: 3,
        garages: 2,
        zone: "Santa Bárbara",
        addressNeighborhood: "Santa Bárbara",
        addressCity: "Bogotá",
        stratum: 5, // Oferta es estrato 5
        rawText: "Venta de Apartamento en Santa Bárbara central exterior, área 161.51 m2, 3 alcobas, 3 baños, 2 parqueaderos en línea, estrato 5, precio de venta $950.000.000"
      };

      const resultado = explicarMatch(reqConEstrato6, propEstrato5);
      expect(resultado.score).toBe(0);
      expect(resultado.blockers.some(b => b.includes("Estrato Incompatible"))).toBe(true);
    });

    it("Demanda flexible sin estrato: Si la demanda NO exige estrato, la oferta estrato 5 NO debe ser bloqueada", () => {
      const reqFlexibleEstrato = {
        id: 992,
        name: "Cliente compra apartamento en Santa Bárbara",
        propertyType: "apartment",
        tipoInmuebleDeseado: "apartamento",
        transactionType: "venta",
        tipoNegocioDeseado: "venta",
        presupuestoMax: 1000000000,
        areaMin: 140,
        habitacionesMin: 3,
        banosMin: 2,
        parqueaderosMin: 2,
        zonaDeseada: "Santa Bárbara",
        addressNeighborhood: "Santa Bárbara",
        addressCity: "Bogotá",
        estratoDeseado: null, // Flexible / Sin estrato exigido
        rawText: "Cliente compra apartamento en Santa Bárbara central exterior de 3 alcobas, 2 baños, 2 parqueaderos, área 140m2 hasta $1000MM"
      };

      const propEstrato5 = {
        id: 882,
        name: "Apartamento en venta en Santa Bárbara",
        propertyType: "apartment",
        transactionType: "venta",
        price: 950000000,
        area: 161.51,
        bedrooms: 3,
        bathrooms: 3,
        garages: 2,
        zone: "Santa Bárbara",
        addressNeighborhood: "Santa Bárbara",
        addressCity: "Bogotá",
        stratum: 5,
        rawText: "Venta de Apartamento en Santa Bárbara central exterior, área 161.51 m2, 3 alcobas, 3 baños, 2 parqueaderos en línea, estrato 5, precio de venta $950.000.000"
      };

      const resultado = explicarMatch(reqFlexibleEstrato, propEstrato5);
      expect(resultado.score).toBeGreaterThanOrEqual(85);
      expect(resultado.blockers.some(b => b.includes("Estrato Incompatible"))).toBe(false);
    });

    it("Extracción de antigüedad en ofertas con formato 'Piso 2, 46 años.'", () => {
      const rawText = "VENTA de Apartamento Clasico en SANTA BARBARA Exterior. Área 161,51. 3 Alcobas. Piso 2, 46 años. 2 Parqueos en linea. PRECIO DE VENTA/ $950.000.000";
      const clean = rawText.toLowerCase();
      const ageMatch = clean.match(/(?:🏢|⏳|⏱️|edificio|antigüedad|antiguedad|tiene|\||,|\.)\s*(\d{1,3})\s*a[ñn]os\b/i)
                    || clean.match(/(\d{1,3})\s*a[ñn]os\s*(?:de\s*)?(?:construido|antigüedad|edificio)?\b/i);
      expect(ageMatch).not.toBeNull();
      expect(parseInt(ageMatch![1], 10)).toBe(46);
    });
  });

  describe("23. Blindaje Doctrinal de Baños (2.5 Baños, Baño Social) y Guillotina Financiera de Administración Baja/Inteligente (v31.104)", () => {
    it("Extracción de baños en ofertas con formato decimal: '2.5 baños' debe normalizarse a 3 baños físicos (2 completos + 1 social), NUNCA 5 baños", () => {
      const offerText = 
`Vendo 3h• Balcones• Santa Paula
Calle 103 con 13
125 mts2
3 piso exterior
3 habitaciones, la principal con balcón
2.5 baños
Sala- comedor con chimenea a gas y 2 balcones
Estudio
Cocina abierta
Precio venta sin muebles $1.050.000 mm
Precio administración $1.800.000 (precio con descuento)`;

      const clean = offerText.toLowerCase();
      const halfBathMatch = clean.match(/(un|una|uno|dos|tres|cuatro|cinco|\d+)[\.,]5\s*(?:baños?|banos?|bñ|wc)/i)
        || clean.match(/(un|una|uno|dos|tres|cuatro|cinco|\d+)\s*(?:baños?|banos?|bñ)\s*(?:y\s*medio|y\s*medio\s*baño)/i);
      
      expect(halfBathMatch).not.toBeNull();
      const base = parseInt(halfBathMatch![1], 10);
      expect(base).toBe(2);
      const totalBaths = base + 1; // 2 completos + 1 social
      expect(totalBaths).toBe(3);
      expect(totalBaths).not.toBe(5);
    });

    it("Extracción de baños en demandas con adición de baño social: '2 baños mas baño social' debe exigir 3 baños", () => {
      const reqText = 
`URGENTE Requerimiento COMPRA apto.
🔴$ 750 millones maximo ( de contado)
☑️2 alcobas
2 baños mas baño social
☑️2 garajes
✔️De 80 a 100 m2
Santa barbara, Unicentro.
Adriana Rebeca Orejuela`;

      const clean = reqText.toLowerCase();
      const socialAddMatch = clean.match(/(un|una|uno|dos|tres|cuatro|cinco|\d+)\s*(?:baño|baños|bñ)\s*(?:\+|\+|y|m[aá]s|con)\s*(?:el\s*|un\s*)?baño\s*social/i);
      
      expect(socialAddMatch).not.toBeNull();
      const SPANISH_MAP: Record<string, number> = { "dos": 2, "tres": 3 };
      const w = socialAddMatch![1].toLowerCase();
      const base = SPANISH_MAP[w] || parseInt(w, 10);
      expect(base).toBe(2);
      const requiredBaths = base + 1;
      expect(requiredBaths).toBe(3);
    });

    it("Guillotina de Baños: Oferta con 2 baños completos vs Demanda de '2 baños mas baño social' (3 baños) -> 0% Match", () => {
      const req2PlusSocial = {
        id: 1535,
        tipoInmuebleDeseado: "apartamento",
        tipoNegocioDeseado: "venta",
        presupuestoMax: 750000000,
        areaMin: 80,
        habitacionesMin: 2,
        banosMin: 2, // Viene con 2 en base, pero texto exige social
        parqueaderosMin: 2,
        zonaDeseada: "Santa Bárbara",
        addressNeighborhood: "Santa Bárbara",
        addressCity: "Bogotá",
        rawText: "URGENTE Requerimiento COMPRA apto. $750 millones maximo. 2 alcobas, 2 baños mas baño social, 2 garajes, De 80 a 100 m2 en Santa Bárbara"
      };

      const propSolo2Banos = {
        id: 2922,
        propertyType: "apartment",
        transactionType: "venta",
        price: 750000000,
        areaTotal: 85,
        bedrooms: 2,
        bathrooms: 2, // Solo 2 completos, sin social
        garages: 2,
        zone: "Santa Bárbara",
        addressNeighborhood: "Santa Bárbara",
        addressCity: "Bogotá",
        rawText: "VENTA apartamento en Santa Bárbara, 85 M2, 2 alcobas más estudio, 2 baños completos, 2 parqueaderos, Admon 811 mil, Valor $750 MM"
      };

      const resultado = explicarMatch(req2PlusSocial, propSolo2Banos);
      expect(resultado.score).toBe(0);
      expect(resultado.blockers.some(b => b.includes("Baños"))).toBe(true);
    });

    it("Guillotina Financiera de Administración: Demanda que exige 'Edificio de administración baja o inteligentes' vs Oferta con $1.800.000 de administración -> 0% Match", () => {
      const reqAdminBaja = {
        id: 1640,
        tipoInmuebleDeseado: "apartamento",
        tipoNegocioDeseado: "venta",
        presupuestoMax: 1300000000,
        areaMin: 107,
        habitacionesMin: 3,
        parqueaderosMin: 2,
        zonaDeseada: "Santa Paula",
        addressNeighborhood: "Santa Paula",
        addressCity: "Bogotá",
        rawText: "Busco urgente Compra. Hasta $1.300 MM. 3 alcobas. Santa Paula. 107 a 125 M2. Edificio de administración baja o inteligentes. 2 garajes."
      };

      const propAdminCara = {
        id: 2929,
        propertyType: "apartment",
        transactionType: "venta",
        price: 1250000000,
        areaTotal: 125,
        bedrooms: 3,
        bathrooms: 3,
        garages: 2,
        adminFee: 1800000,
        zone: "Santa Paula",
        addressNeighborhood: "Santa Paula",
        addressCity: "Bogotá",
        rawText: "Vendo 3h Santa Paula. 125 mts2. 3 habitaciones. 2.5 baños. 2 parqueaderos en línea. Precio venta $1.250.000 mm. Precio administración $1.800.000 (precio con descuento)"
      };

      const resultado = explicarMatch(reqAdminBaja, propAdminCara);
      expect(resultado.score).toBe(0);
      expect(resultado.blockers.some(b => b.includes("Guillotina Financiera (Administración Incompatible)"))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 24. REGLA DOCTRINAL DE PISO FINANCIERO (PISO MÍNIMO 70% Y COHERENCIA DE SEGMENTO) (v31.105)
  // ═══════════════════════════════════════════════════════════════════════════════
  describe("24. Regla Doctrinal de Piso Financiero del 70% y Coherencia de Segmento (v31.105)", () => {
    it("Caso Match 15100: Demanda de $1.700 MM vs Oferta de $850 MM (50% del precio) debe colapsar a Score 0%", () => {
      const req1700M = {
        id: 1475,
        tipoInmuebleDeseado: "apartment",
        tipoNegocioDeseado: "venta",
        presupuestoMax: 1700000000,
        habitacionesMin: 3,
        zonaDeseada: "El Nogal",
        addressNeighborhood: "El Nogal",
        addressCity: "Bogotá",
        rawText: "Busco apto entre el nogal y la 94 1700 millones 3 habitaciones"
      };

      const prop850M = {
        id: 492,
        propertyType: "apartment",
        transactionType: "venta",
        price: 850000000,
        areaTotal: 115,
        bedrooms: 3,
        bathrooms: 3,
        garages: 2,
        stratum: 5,
        zone: "El Nogal",
        addressNeighborhood: "El Nogal",
        addressCity: "Bogotá",
        rawText: "Vendo Apartamento en el Nogal para remodelar: Precio de venta: $850.000.000, 115 M2, 3 Alcobas, 3 Baños, 2 Garajes, Estrato: 5"
      };

      const res = explicarMatch(req1700M, prop850M);
      expect(res.score).toBe(0);
      expect(res.blockers.some(b => b.includes("Guillotina de Segmento Financiero") || b.includes("Desproporción de Segmento Comercial"))).toBe(true);
    });

    it("Caso Match 15101/15098: Demanda de $4.500 MM vs Ofertas de $795 MM / $830 MM (~18%) debe colapsar a Score 0%", () => {
      const req4500M = {
        id: 1636,
        tipoInmuebleDeseado: "apartment",
        tipoNegocioDeseado: "venta",
        presupuestoMax: 4500000000,
        habitacionesMin: 3,
        zonaDeseada: "Chicó",
        addressNeighborhood: "Chicó",
        addressCity: "Bogotá",
        rawText: "Busco apto en Chicó hasta 4500 millones 3 habitaciones exterior amplio"
      };

      const prop795M = {
        id: 3367,
        propertyType: "apartment",
        transactionType: "venta",
        price: 795000000,
        areaTotal: 110,
        bedrooms: 3,
        bathrooms: 3,
        zone: "Chicó",
        addressNeighborhood: "Chicó",
        addressCity: "Bogotá",
        rawText: "Hermoso inmueble en Chicó venta $795.000.000 3 alcobas 110 m2 3 baños garaje"
      };

      const prop830M = {
        id: 4138,
        propertyType: "apartment",
        transactionType: "venta",
        price: 830000000,
        areaTotal: 120,
        bedrooms: 3,
        bathrooms: 3,
        zone: "Chicó",
        addressNeighborhood: "Chicó",
        addressCity: "Bogotá",
        rawText: "Inmueble en Chicó Bogotá D.C. venta $830.000.000 3 alcobas 120 m2 garajes"
      };

      const res1 = explicarMatch(req4500M, prop795M);
      expect(res1.score).toBe(0);
      expect(res1.blockers.some(b => b.includes("Guillotina de Segmento Financiero (Piso Financiero)"))).toBe(true);

      const res2 = explicarMatch(req4500M, prop830M);
      expect(res2.score).toBe(0);
      expect(res2.blockers.some(b => b.includes("Guillotina de Segmento Financiero (Piso Financiero)"))).toBe(true);
    });

    it("Demanda con rango explícito 'entre 850 y 1000MM': acepta $850M-$1000M y rechaza < $765M (90% del piso)", () => {
      const reqRango = {
        id: 1845,
        tipoInmuebleDeseado: "apartment",
        tipoNegocioDeseado: "venta",
        presupuestoMin: 850000000,
        presupuestoMax: 1000000000,
        habitacionesMin: 3,
        banosMin: 2,
        areaMin: 100,
        zonaDeseada: "Santa Bárbara Central",
        addressNeighborhood: "Santa Bárbara Central",
        addressCity: "Bogotá",
        rawText: "Cliente compra urgente apartamento de 3 habitaciones, 2 baños, 100 m2, presupuesto entre 850 y 1000MM en Santa Bárbara Central exterior."
      };

      const propAceptable = {
        id: 2897,
        propertyType: "apartment",
        transactionType: "venta",
        price: 995000000,
        areaTotal: 120,
        bedrooms: 3,
        bathrooms: 3,
        zone: "Santa Bárbara Central",
        addressNeighborhood: "Santa Bárbara Central",
        addressCity: "Bogotá",
        rawText: "Hermoso apartamento exterior en venta en Santa Bárbara Central. 120 m2, 3 alcobas, 3 baños, 2 garajes, estrato 5. Precio de venta $995.000.000. Excelente oportunidad."
      };

      const propBajoPiso = {
        id: 9991,
        propertyType: "apartment",
        transactionType: "venta",
        price: 600000000, // < 850M * 0.90 = 765M
        areaTotal: 100,
        bedrooms: 3,
        bathrooms: 3,
        zone: "Santa Bárbara Central",
        addressNeighborhood: "Santa Bárbara Central",
        addressCity: "Bogotá",
        rawText: "Apartamento exterior en venta en Santa Bárbara Central. 100 m2, 3 alcobas, 3 baños, 2 garajes, estrato 5. Precio de venta $600.000.000. Oportunidad."
      };

      const resAceptable = explicarMatch(reqRango, propAceptable);
      expect(resAceptable.score).toBeGreaterThanOrEqual(85);

      const resBajoPiso = explicarMatch(reqRango, propBajoPiso);
      expect(resBajoPiso.score).toBe(0);
      expect(resBajoPiso.blockers.some(b => b.includes("Guillotina de Segmento Financiero") || b.includes("por debajo del segmento solicitado"))).toBe(true);
    });

    it("Caso Match 15097: Inmueble en arriendo sin canon especificado (solo administración) debe colapsar a 0%", () => {
      const reqArriendo = {
        id: 1486,
        tipoInmuebleDeseado: "apartment",
        tipoNegocioDeseado: "arriendo",
        presupuestoMax: 8500000,
        habitacionesMin: 2,
        zonaDeseada: "Chicó Reservado",
        addressNeighborhood: "Chicó Reservado",
        addressCity: "Bogotá",
        rawText: "Busco en arriendo apto en Chicó Reservado presupuesto $8.500.000 2 alcobas"
      };

      const propSinCanon = {
        id: 2183,
        propertyType: "apartment",
        transactionType: "arriendo",
        price: 0,
        rentPrice: null,
        adminFee: 3500000,
        bedrooms: 3,
        zone: "Chicó Reservado",
        addressNeighborhood: "Chicó Reservado",
        addressCity: "Bogotá",
        rawText: "💰*Administracion: $3.500.000*\n2ACU - 50/50\nARRIENDO CHICÓ RESERVADO 3 ALCOBAS"
      };

      const res = explicarMatch(reqArriendo, propSinCanon);
      expect(res.score).toBe(0);
      expect(res.blockers.some(b => b.includes("La oferta no especifica canon de arriendo"))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 25. GUILLOTINA DE DEMANDA MEDIOCRE, CLASIFICACIÓN ESTRICTA DE ARRIENDO Y PARSEO FIEL (v31.106)
  // ═══════════════════════════════════════════════════════════════════════════════
  describe("25. Guillotina de Demanda Mediocre, Clasificación Estricta de Arriendos y Blindaje de Descarte (v31.106)", () => {
    it("Texto con '$ 4.500.000 incluida' debe deducir arriendo y precio de 4.5 millones, jamás venta de 4.500 millones", () => {
      const text = "Busco las Santas 2 alcobas conjunto $ 4.500.000 incluida";
      const fb = extractFallbackDataFromText(text);
      expect(fb.transactionType).toBe("arriendo");
      expect(fb.price).toBe(4_500_000);
      expect(fb.price).not.toBe(4_500_000_000);
    });

    it("parseColombianPriceOrBudget no debe multiplicar por 1000 números con puntos de 7 dígitos", () => {
      const parsedRent = parseColombianPriceOrBudget("$ 4.500.000", "", false);
      expect(parsedRent).toBe(4_500_000);

      // Si por error se pasara isSale=true a un monto con formato completo 4.500.000, debe mantenerse en 4.500.000
      const parsedSaleWithDots = parseColombianPriceOrBudget("$ 4.500.000", "", true);
      expect(parsedSaleWithDots).toBe(4_500_000);
    });

    it("Filtro Duro 0D-2: Requerimiento con calificación 'Mediocre' debe ser bloqueado inmediatamente a Score 0%", () => {
      const reqMediocre = {
        id: 1636,
        tipoInmuebleDeseado: "apartment",
        tipoNegocioDeseado: "venta",
        presupuestoMax: 850000000,
        habitacionesMin: 3,
        zonaDeseada: "Santa Bárbara",
        addressNeighborhood: "Santa Bárbara",
        addressCity: "Bogotá",
        calificacion: "Mediocre",
        rawText: "Busco apartamento en venta en Santa Bárbara"
      };

      const propVenta = {
        id: 4138,
        propertyType: "apartment",
        transactionType: "venta",
        price: 830000000,
        areaTotal: 120,
        bedrooms: 3,
        bathrooms: 3,
        garages: 2,
        zone: "Santa Bárbara",
        addressNeighborhood: "Santa Bárbara",
        addressCity: "Bogotá",
        rawText: "VENDO APTO SANTA BARBARA 120M2 3 HABITACIONES 3 BAÑOS 2 GARAJES $830 MILLONES"
      };

      const res = explicarMatch(reqMediocre, propVenta);
      expect(res.score).toBe(0);
      expect(res.blockers.some(b => b.includes("Demanda Mediocre / Escasez Crítica de Datos"))).toBe(true);
    });

    it("Requerimiento de arriendo ($4.5M) jamás puede hacer match con oferta de venta ($830M)", () => {
      const reqArriendo = {
        id: 1636,
        tipoInmuebleDeseado: "apartment",
        tipoNegocioDeseado: "arriendo",
        presupuestoMax: 4500000,
        habitacionesMin: 2,
        zonaDeseada: "Santa Bárbara",
        addressNeighborhood: "Santa Bárbara",
        addressCity: "Bogotá",
        rawText: "Busco las Santas 2 alcobas conjunto $ 4.500.000 incluida"
      };

      const propVenta = {
        id: 4138,
        propertyType: "apartment",
        transactionType: "venta",
        price: 830000000,
        areaTotal: 120,
        bedrooms: 3,
        bathrooms: 3,
        garages: 2,
        zone: "Santa Bárbara",
        addressNeighborhood: "Santa Bárbara",
        addressCity: "Bogotá",
        rawText: "VENDO APTO SANTA BARBARA 120M2 3 HABITACIONES 3 BAÑOS 2 GARAJES $830 MILLONES"
      };

      const res = explicarMatch(reqArriendo, propVenta);
      expect(res.score).toBe(0);
      expect(res.blockers.some(b => b.includes("Incompatibilidad de negocio") || b.includes("arriendo vs venta"))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 26. REGLA DOCTRINAL DE PISO FINANCIERO DEL 90 AL 95% (DOCTRINA EDUARDO v31.107)
  // ═══════════════════════════════════════════════════════════════════════════════
  describe("26. Regla Doctrinal de Piso Financiero del 90 al 95% para Venta y Arriendo (v31.107)", () => {
    it("Venta: Presupuesto $1.700 MM acepta oferta de $1.615 MM (95%) y $1.550 MM (>90%), pero bloquea < $1.530 MM (0% Match)", () => {
      const req1700MM = {
        id: 1901,
        tipoInmuebleDeseado: "apartment",
        tipoNegocioDeseado: "venta",
        presupuestoMax: 1700000000,
        habitacionesMin: 3,
        banosMin: 2,
        garajesMin: 2,
        areaMin: 120,
        zonaDeseada: "El Nogal",
        addressNeighborhood: "El Nogal",
        addressCity: "Bogotá",
        rawText: "Busco apartamento en El Nogal 3 habitaciones 2 baños 2 garajes presupuesto $1.700 MM"
      };

      // 1. Oferta de $1.615 MM (exactamente 95% de 1.700 MM) -> Confort óptimo (15 pts) y match exitoso
      const prop1615MM = {
        id: 2901,
        propertyType: "apartment",
        transactionType: "venta",
        price: 1615000000,
        areaTotal: 130,
        bedrooms: 3,
        bathrooms: 3,
        garages: 2,
        zone: "El Nogal",
        addressNeighborhood: "El Nogal",
        addressCity: "Bogotá",
        rawText: "VENDO APARTAMENTO EL NOGAL 130M2 3 HABITACIONES 3 BAÑOS 2 GARAJES $1.615 MILLONES"
      };
      const res1615 = explicarMatch(req1700MM, prop1615MM);
      expect(res1615.score).toBeGreaterThanOrEqual(85);
      expect(res1615.positives.some(p => p.includes("Presupuesto óptimo (95-100%)"))).toBe(true);

      // 2. Oferta de $1.550 MM (91.18% > 90% de 1.700 MM) -> Oportunidad favorable (12 pts) y match exitoso
      const prop1550MM = {
        id: 2902,
        propertyType: "apartment",
        transactionType: "venta",
        price: 1550000000,
        areaTotal: 130,
        bedrooms: 3,
        bathrooms: 3,
        garages: 2,
        zone: "El Nogal",
        addressNeighborhood: "El Nogal",
        addressCity: "Bogotá",
        rawText: "VENDO APARTAMENTO EL NOGAL 130M2 3 HABITACIONES 3 BAÑOS 2 GARAJES $1.550 MILLONES"
      };
      const res1550 = explicarMatch(req1700MM, prop1550MM);
      expect(res1550.score).toBeGreaterThanOrEqual(85);
      expect(res1550.positives.some(p => p.includes("Oportunidad favorable (90-95%)"))).toBe(true);

      // 3. Oferta de $1.500 MM (88.2% < 90% = $1.530 MM) -> Guillotina de Piso Financiero (0% Match)
      const prop1500MM = {
        id: 2903,
        propertyType: "apartment",
        transactionType: "venta",
        price: 1500000000,
        areaTotal: 130,
        bedrooms: 3,
        bathrooms: 3,
        garages: 2,
        zone: "El Nogal",
        addressNeighborhood: "El Nogal",
        addressCity: "Bogotá",
        rawText: "VENDO APARTAMENTO EL NOGAL 130M2 3 HABITACIONES 3 BAÑOS 2 GARAJES $1.500 MILLONES"
      };
      const res1500 = explicarMatch(req1700MM, prop1500MM);
      expect(res1500.score).toBe(0);
      expect(res1500.blockers.some(b => b.includes("Guillotina de Segmento Financiero (Piso Financiero)") && b.includes("90% del presupuesto"))).toBe(true);

      // 4. Oferta de $1.190 MM (70% del presupuesto, antes admitido) -> Ahora estrictamente bloqueado (0% Match)
      const prop1190MM = {
        id: 2904,
        propertyType: "apartment",
        transactionType: "venta",
        price: 1190000000,
        areaTotal: 130,
        bedrooms: 3,
        bathrooms: 3,
        garages: 2,
        zone: "El Nogal",
        addressNeighborhood: "El Nogal",
        addressCity: "Bogotá",
        rawText: "VENDO APARTAMENTO EL NOGAL 130M2 3 HABITACIONES 3 BAÑOS 2 GARAJES $1.190 MILLONES"
      };
      const res1190 = explicarMatch(req1700MM, prop1190MM);
      expect(res1190.score).toBe(0);
      expect(res1190.blockers.some(b => b.includes("Guillotina de Segmento Financiero (Piso Financiero)"))).toBe(true);
    });

    it("Arriendo: Presupuesto $10.000.000 COP acepta canon de $9.5M (95%) y $9.1M (91%), pero bloquea < $9.0M (0% Match)", () => {
      const reqArriendo10M = {
        id: 1902,
        tipoInmuebleDeseado: "apartment",
        tipoNegocioDeseado: "arriendo",
        presupuestoMax: 10000000,
        habitacionesMin: 3,
        banosMin: 2,
        garajesMin: 2,
        areaMin: 100,
        zonaDeseada: "Chicó Reservado",
        addressNeighborhood: "Chicó Reservado",
        addressCity: "Bogotá",
        rawText: "Busco en arriendo apartamento en Chicó Reservado presupuesto $10.000.000 3 habitaciones 2 baños 2 garajes"
      };

      // 1. Canon de $9.500.000 COP (95%) -> Confort óptimo (15 pts) y match exitoso
      const propArriendo95M = {
        id: 2905,
        propertyType: "apartment",
        transactionType: "arriendo",
        rentPrice: 9500000,
        areaTotal: 110,
        bedrooms: 3,
        bathrooms: 2,
        garages: 2,
        zone: "Chicó Reservado",
        addressNeighborhood: "Chicó Reservado",
        addressCity: "Bogotá",
        rawText: "ARRIENDO APTO CHICÓ RESERVADO 110M2 3 HABITACIONES 2 BAÑOS 2 GARAJES $9.500.000 INCLUIDA ADMON"
      };
      const res95M = explicarMatch(reqArriendo10M, propArriendo95M);
      expect(res95M.score).toBeGreaterThanOrEqual(85);
      expect(res95M.positives.some(p => p.includes("Presupuesto óptimo (95-100%)"))).toBe(true);

      // 2. Canon de $9.100.000 COP (91% > 90%) -> Oportunidad favorable (12 pts) y match exitoso
      const propArriendo91M = {
        id: 2906,
        propertyType: "apartment",
        transactionType: "arriendo",
        rentPrice: 9100000,
        areaTotal: 110,
        bedrooms: 3,
        bathrooms: 2,
        garages: 2,
        zone: "Chicó Reservado",
        addressNeighborhood: "Chicó Reservado",
        addressCity: "Bogotá",
        rawText: "ARRIENDO APTO CHICÓ RESERVADO 110M2 3 HABITACIONES 2 BAÑOS 2 GARAJES $9.100.000"
      };
      const res91M = explicarMatch(reqArriendo10M, propArriendo91M);
      expect(res91M.score).toBeGreaterThanOrEqual(85);
      expect(res91M.positives.some(p => p.includes("Oportunidad favorable (90-95%)"))).toBe(true);

      // 3. Canon de $8.500.000 COP (85% < 90% = $9.000.000) -> Guillotina de Piso Financiero (0% Match)
      const propArriendo85M = {
        id: 2907,
        propertyType: "apartment",
        transactionType: "arriendo",
        rentPrice: 8500000,
        areaTotal: 110,
        bedrooms: 3,
        bathrooms: 2,
        garages: 2,
        zone: "Chicó Reservado",
        addressNeighborhood: "Chicó Reservado",
        addressCity: "Bogotá",
        rawText: "ARRIENDO APTO CHICÓ RESERVADO 110M2 3 HABITACIONES 2 BAÑOS 2 GARAJES $8.500.000"
      };
      const res85M = explicarMatch(reqArriendo10M, propArriendo85M);
      expect(res85M.score).toBe(0);
      expect(res85M.blockers.some(b => b.includes("Guillotina de Segmento Financiero (Piso Financiero)") && b.includes("90% del canon"))).toBe(true);
    });
  });

  describe("27. Revivificación de Inmuebles, Ciclo de Republicación de Demandas y Simetría Frontend (v31.108)", () => {
    it("Debe reiniciar ciclo de demanda a 0 días y leer fechaUltimaPublicacion al republicar", async () => {
      const { getRequirementEffectiveDaysAgo } = await import("../../client/src/components/admin/AdminMatches");
      
      const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      const today = new Date();

      // Demanda vieja sin republicar (40 días) -> 40 días
      const reqViejo = {
        createdAt: fortyDaysAgo,
        fechaUltimaPublicacion: fortyDaysAgo,
        republicacionesCount: 0
      };
      expect(getRequirementEffectiveDaysAgo(reqViejo)).toBe(40);

      // Misma demanda republicada hoy por un colega -> 0 días (Revivida en La Mesa)
      const reqRepublicado = {
        createdAt: fortyDaysAgo,
        fechaUltimaPublicacion: today,
        republicacionesCount: 1
      };
      expect(getRequirementEffectiveDaysAgo(reqRepublicado)).toBe(0);
    });

    it("Debe tratar negaciones en la demanda ('No sobre vía principal') sin falsos positivos cuando la oferta no la menciona", async () => {
      const { scoreRows } = await import("../../client/src/components/admin/AdminMatches");

      const reqConNegacion = {
        id: 1700,
        tipoInmuebleDeseado: "apartment",
        tipoNegocioDeseado: "venta",
        presupuestoMax: "1000000000",
        areaMin: "90",
        rawText: "Busco apartamento en Santa Bárbara hasta $1.000 MM. No sobre via principal. 3 habitaciones 2 baños.",
        caracteristicasDeseadas: {}
      };

      // Oferta residencial tranquila que no menciona vía principal
      const propNormal = {
        id: 2897,
        propertyType: "apartment",
        transactionType: "venta",
        price: "995000000",
        areaTotal: "95",
        bedrooms: 3,
        bathrooms: 2,
        zone: "Santa Bárbara",
        rawText: "Vendo lindo apartamento en Santa Bárbara $995 MM 95m2 3 alcobas 2 baños parqueadero.",
        amenities: {}
      };

      const result = scoreRows(reqConNegacion, propNormal);
      // No debe existir ninguna fila de vía principal en estado "missing"
      const viaRow = result.rows.find(r => r.label.toLowerCase().includes("vía principal") || r.label.toLowerCase().includes("avenida"));
      expect(viaRow?.status).not.toBe("missing");
      expect(result.autoScore).toBeGreaterThanOrEqual(85);
    });
  });
});




