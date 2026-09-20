import { describe, it, expect } from "vitest";
import { scoreRows, REJECT_CATEGORIES } from "../../client/src/components/admin/AdminMatches";

describe("VERIFICACIÓN DE COINCIDENCIA CON MATCH PERFECTO 100% Y TODAS LAS CASILLAS EN VERDE", () => {
  const amenitiesText = [
    "aire acondicionado",
    "sistema de alarma",
    "amoblado",
    "acabados de lujo",
    "acabados modernos",
    "zona de bar",
    "baño en alcoba principal",
    "baño en todas las alcobas",
    "citófono",
    "clósets empotrados",
    "comedor auxiliar",
    "despensa alacena",
    "doble ventana antiruido",
    "gas natural domiciliario",
    "muy iluminado luz natural",
    "hall de alcobas",
    "jacuzzi hidromasaje",
    "turco privado",
    "vestier walk-in closet",
    "vista panorámica a la ciudad",
    "zona de lavandería cuarto de ropas",
    "acceso pavimentado vía pavimentada",
    "área social zonas sociales",
    "área turística",
    "zona bancaria bancos cercanos",
    "parrilla comunal barbacoa",
    "reserva forestal bosques nativos",
    "caldera central agua caliente central",
    "cancha de baloncesto",
    "cancha de fútbol",
    "campo de golf cancha de golf",
    "cancha de squash",
    "cancha de tenis",
    "cerca a centros comerciales",
    "cerca a clínicas y hospitales",
    "club house",
    "cerca a colegios universidades",
    "edificio inteligente domótica",
    "gimnasio dotado gym",
    "kiosco bohío",
    "espejo de agua lago",
    "lavandería comunal",
    "frente a parque parques cercanos",
    "parque infantil juegos infantiles",
    "piscina climatizada",
    "pista de pádel cancha de padel",
    "planta eléctrica suplencia total",
    "portería recepción lobby",
    "salón infantil playroom",
    "salón comunal salón de eventos",
    "salón de juegos billar ping pong",
    "sauna turco comunal zonas húmedas",
    "seguridad 24 circuito cerrado cctv",
    "sobre vía principal frente a avenida",
    "shut de basuras",
    "teatrino sala de cine",
    "terraza comunal rooftop",
    "transporte público transmilenio sitp",
    "zonas deportivas polideportivo"
  ].join(". ");

  const coreReqText = `Busco para compra apartamento en venta en Chicó Norte, Chapinero, Bogotá. 
Presupuesto $1.800.000.000. 
Administración máxima $1.200.000. 
Área 180 m2. 
Piso 5 exterior. 
3 habitaciones, 3 baños, 2 parqueaderos independientes. 
Estrato 6, máximo 10 años de construido. Remodelado.
Cocina integral. Chimenea a gas.
Balcón. Terraza con zona BBQ. Cava de vinos.
Estudio o estar de TV, cuarto y baño de servicio (CBS), vigilancia 24 horas, ascensor, depósito, parqueadero de visitantes y parqueadero moto. 
Contacto: 3001234567. 
${amenitiesText}`;

  const corePropText = `Hermoso apartamento en venta en Chicó Norte, Chapinero, Bogotá. 
Precio $1.800.000.000. 
Administración $1.200.000 / mes. 
Área total 180 m2 (180 m2 privados). 
Piso 5 con vista exterior muy iluminado. 
3 habitaciones, 3 baños, 2 parqueaderos independientes. 
Estrato 6, 10 años de construido (año 2016). Totalmente remodelado en excelente estado. 
Cocina integral. Chimenea a gas.
Balcón exterior. Terraza con zona BBQ. Cava de vinos incluida.
Estudio privado, cuarto y baño de servicio (CBS), portería y vigilancia 24/7, ascensor, depósito privado, parqueadero de visitantes y garaje parqueadero moto. 
Contacto: 3109876543. 
${amenitiesText}`;

  const req = {
    id: 999991,
    name: "Apartamento 180m² en Chicó Norte Venta",
    tipoInmuebleDeseado: "apartment",
    tipoNegocioDeseado: "venta",
    ciudadDeseada: "Bogotá",
    zonaDeseada: "Chicó Norte",
    addressCity: "Bogotá",
    addressLocality: "Chapinero",
    addressNeighborhood: "Chicó Norte",
    presupuestoMin: "1800000000",
    presupuestoMax: "1800000000",
    monedaPresupuesto: "COP",
    areaMin: "180",
    habitacionesMin: 3,
    banosMin: 3,
    parqueaderosMin: 2,
    adminFeeMax: "1200000",
    estratoDeseado: [6],
    status: "active",
    idUsuarioWhatsapp: "573001234567@s.whatsapp.net",
    nombreUsuarioWhatsapp: "Broker Comprador Directo",
    kitchenType: "Integral",
    rawText: coreReqText,
    caracteristicasDeseadas: {
      antiguedadMax: 10,
      piso: "Piso 5",
      interiorExterior: "Exterior",
      kitchenType: "Integral"
    }
  };

  const prop = {
    id: 999992,
    name: "Apartamento en Venta en Chicó Norte 180m² Piso 5",
    description: corePropText,
    propertyType: "apartment",
    transactionType: "venta",
    price: "1800000000",
    adminFee: "1200000",
    currency: "COP",
    city: "Bogotá",
    zone: "Chicó Norte",
    addressCity: "Bogotá",
    addressLocality: "Chapinero",
    addressNeighborhood: "Chicó Norte",
    bedrooms: 3,
    bathrooms: 3,
    garages: 2,
    garageType: "independiente",
    stratum: 6,
    floorDetail: "Piso 5",
    areaTotal: "180",
    areaPrivate: "180",
    yearBuilt: 2016,
    antiguedadAnos: 10,
    available: true,
    idUsuarioWhatsapp: "573109876543@s.whatsapp.net",
    nombreUsuarioWhatsapp: "Broker Captador Exclusivo",
    kitchenType: "Integral",
    interiorExterior: "Exterior",
    hasBalcony: true,
    hasElevator: true,
    hasStorage: true,
    hasServiceRoom: true,
    hasStudy: true,
    hasVisitorParking: true,
    rawText: corePropText,
    amenities: {
      balcon: true,
      ascensor: true,
      deposito: true,
      cbs: true,
      estudio: true,
      vigilancia: true,
      visitantes: true,
      moto: true,
      cava: true,
      bbq: true,
      interiorExterior: "Exterior",
      piso: "Piso 5",
      kitchenType: "Integral"
    }
  };

  it("debe generar todas las casillas de la tabla de cotejo en estado 'exact' sin ninguna advertencia, plus ni dato pendiente", () => {
    const result = scoreRows(req, prop);

    console.log(`\n==============================================`);
    console.log(`TOTAL CASILLAS GENERADAS EN TABLA DE COTEJO: ${result.rows.length}`);
    console.log(`SCORE AUTOMÁTICO VECY: ${result.autoScore}%`);
    console.log(`==============================================\n`);

    const nonExact = result.rows.filter(r => r.status !== "exact");
    if (nonExact.length > 0) {
      console.log("FILAS QUE NO SON EXACTAS:");
      nonExact.forEach(r => {
        console.log(` - [${r.status}] ${r.label}: Req="${r.reqVal}" | Prop="${r.propVal}"`);
      });
    }

    expect(result.autoScore).toBe(100);
    expect(nonExact.length).toBe(0);
    expect(result.rows.length).toBeGreaterThanOrEqual(70);
    expect(result.rows.every(r => r.status === "exact")).toBe(true);
  });

  it("debe calificar con precisión decimal (ej. 99.99% con un Plus Ofertado)", () => {
    // Tomamos la demanda y oferta completas, pero removemos 'piscina climatizada' de la demanda
    const reqSinPiscina = {
      ...req,
      id: 8881,
      rawText: req.rawText.replace(/piscina(?:\s*climatizada)?/gi, "sin_amenidad")
    };

    const result = scoreRows(reqSinPiscina, prop);
    const plusRows = result.rows.filter(r => r.status === "plus");
    expect(plusRows.length).toBe(1);
    expect(plusRows[0].label).toBe("Piscina");
    expect(result.autoScore).toBe(99.99); // 100 - 0.01 = 99.99%
  });

  it("debe aplicar castigo financiero severo (cae a ~83.50%) si falta el dato de Precio de Venta", () => {
    // Tomamos la demanda y oferta completas, pero sin precio de venta en ninguna
    const reqSinPrecio = {
      ...req,
      id: 7771,
      presupuestoMin: null,
      presupuestoMax: null,
      rawText: req.rawText.replace(/Presupuesto \$1\.800\.000\.000\./gi, "")
    };

    const propSinPrecio = {
      ...prop,
      id: 7772,
      price: null,
      rawText: prop.rawText.replace(/Precio \$1\.800\.000\.000\./gi, "")
    };

    const result = scoreRows(reqSinPrecio, propSinPrecio);
    const priceRow = result.rows.find(r => r.label.includes("Precio de Venta"));
    expect(priceRow?.status).toBe("neutral"); // Dato Pendiente en Precio
    expect(result.autoScore).toBe(83.5); // 100 - 16.50 = 83.50% (cercano al piso del 80%)
  });

  it("debe aplicar guillotina total (0.00%) si cualquier casilla resulta en 'No Coincide'", () => {
    const reqChico = {
      id: 6661,
      tipoInmuebleDeseado: "apartment",
      tipoNegocioDeseado: "venta",
      ciudadDeseada: "Bogotá",
      zonaDeseada: "Chicó Norte",
      rawText: "Busco en Chicó Norte venta. Tel: 3001234567"
    };

    const propCedritos = {
      id: 6662,
      propertyType: "apartment",
      transactionType: "venta",
      city: "Bogotá",
      zone: "Cedritos", // Barrio totalmente incompatible -> missing en barrio
      rawText: "Apartamento en Cedritos venta. Tel: 3109876543"
    };

    const result = scoreRows(reqChico, propCedritos);
    expect(result.rows.some(r => r.status === "missing")).toBe(true);
    expect(result.autoScore).toBe(0); // 0% Guillotina Inmediata
  });

  it("debe inyectar atributos personalizados agregados al cotejo (ej. Calentador a Gas, Mascotas o personalizado) y reflejarlos en la tabla de cotejo", () => {
    const reqConAtributo = {
      ...req,
      id: 8881,
      caracteristicasDeseadas: {
        calentador_a_gas: "Exige calentador a gas",
        puerta_seguridad: "Desea puerta blindada"
      }
    };

    const propConAtributo = {
      ...prop,
      id: 8882,
      amenities: {
        ...prop.amenities,
        calentador_a_gas: "Sí (Calentador a gas nuevo Bosch)",
        puerta_seguridad: "Sí (Puerta de seguridad blindada)"
      }
    };

    const result = scoreRows(reqConAtributo, propConAtributo);
    const calentadorRow = result.rows.find(r => r.label.toLowerCase().includes("calentador"));
    const puertaRow = result.rows.find(r => r.label.toLowerCase().includes("puerta"));

    expect(calentadorRow).toBeDefined();
    expect(calentadorRow?.status).toBe("exact");
    expect(calentadorRow?.reqVal).toBe("Exige calentador a gas");
    expect(calentadorRow?.propVal).toBe("Sí (Calentador a gas nuevo Bosch)");

    expect(puertaRow).toBeDefined();
    expect(puertaRow?.status).toBe("exact");
    expect(puertaRow?.propVal).toBe("Sí (Puerta de seguridad blindada)");
  });

  it("debe contener en REJECT_CATEGORIES las opciones de descarte por no-tercería para Oferta y Demanda", () => {
    const allOptions = REJECT_CATEGORIES.flatMap(c => c.options);
    const ofertaNoTerceria = allOptions.find(o => o.id === "oferta_no_terceria");
    const demandaNoTerceria = allOptions.find(o => o.id === "demanda_no_terceria");

    expect(ofertaNoTerceria).toBeDefined();
    expect(ofertaNoTerceria?.label).toContain("El colega de OFERTA no acepta Tercería, ni referidos");

    expect(demandaNoTerceria).toBeDefined();
    expect(demandaNoTerceria?.label).toContain("El colega Demanda No acepta tercería, ni referidos");
  });
});
