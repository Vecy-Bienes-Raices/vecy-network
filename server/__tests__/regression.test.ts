import { describe, it, expect } from "vitest";
import { parseColombianPriceOrBudget, extractFallbackDataFromText, extractFirstName } from "../_core/janIA";
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
});

