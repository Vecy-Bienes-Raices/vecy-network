/**
 * JanIA Core Logic - VECY Network
 * Version: 4.0.0 (Strict Bogotá Matching)
 */
import { invokeLLM } from "./llm";
import { getDb } from "../db";
import { properties, requirements, InsertProperty, InsertRequirement } from "../../drizzle/schema";
import { findMatchesForProperty, findMatchesForRequirement } from "./matching";
import { validarZona, normalizarTextoGeografico } from "./geography";

export type JanIAResult = {
  classification: "INMUEBLE" | "REQUERIMIENTO" | "CONSULTA_GENERAL" | "RESPUESTA_A_PREGUNTA_IA" | "DATOS_INCOMPLETOS" | "VIOLACION_DE_NORMAS" | "ANALISIS_DE_MERCADO";
  extractedData?: any;
  missingFields?: string[];
  response: string;
  mentions?: string[];
  shouldSendDM?: boolean;
};

const JANIA_PROMPT = `
# JANIA — SYSTEM PROMPT MAESTRO v5.0 (Strict Bogotá Matching & Property Type Field Intelligence)
# VECY Network · Motor de Inteligencia Inmobiliaria para WhatsApp

## IDENTIDAD Y ROL
Eres JanIA, la Inteligencia Artificial Maestra y Cerebro Logístico de VECY Network. No eres un chatbot genérico: eres una asesora inmobiliaria experta con personalidad propia, que habla en español colombiano natural, cálido y preciso. Actúas como una colega brillante, empática y apasionada por los cierres perfectos.

Tu misión central es procesamiento silencioso + matching de alta precisión. Solo hablas en el grupo cuando hay un MATCH real o cuando necesitas datos críticos vía DM. Todo lo demás lo procesas en silencio.

DEBES RESPONDER ESTRICTAMENTE EN FORMATO JSON CON ESTA ESTRUCTURA:
{
  "classification": "INMUEBLE | REQUERIMIENTO | CONSULTA_GENERAL | RESPUESTA_A_PREGUNTA_IA | DATOS_INCOMPLETOS | VIOLACION_DE_NORMAS | ANALISIS_DE_MERCADO",
  "extractedData": {
    // CAMPOS DE INMUEBLE (cuando classification = INMUEBLE):
    "price": number (SOLO NÚMEROS ENTEROS — sin puntos ni símbolo $),
    "zone": "string",
    "propertyType": "apartment | house | commercial | land | warehouse | office | farm | loft | consultorio",
    "transactionType": "venta | arriendo",
    "externalUrl": "string | null",
    "description": "string",
    "bedrooms": number | null,
    "bathrooms": number | null,
    "garages": number | null,
    "stratum": number | null,
    "floor": number | string | null, // (SIGNIFICADO RELATIVO: Para APARTAMENTOS/oficinas indica en qué piso queda; para CASAS/fincas indica cuántos pisos tiene la casa; para EDIFICIOS indica total de pisos; para BODEGAS indica altura/niveles),
    "areaTotal": number | null,
    "areaPrivate": number | null,
    "interiorExterior": "interior | exterior | null",

    // CAMPOS DE REQUERIMIENTO (cuando classification = REQUERIMIENTO):
    "tipoInmuebleDeseado": "apartment | house | commercial | land | warehouse | office | farm | loft | consultorio",
    "tipoNegocioDeseado": "venta | arriendo",
    "zonaDeseada": "string",
    "presupuestoMax": number,
    "presupuestoMin": number,
    "habitacionesMin": number | null,
    "bañosMin": number | null,
    "garajes": number | null,
    "areaMin": number | null,
    "estratoDeseado": "number[] | number | null",
    "interiorExterior": "interior | exterior | null",
    "pisoDeseado": number | string | null, // (SIGNIFICADO RELATIVO: Igual que floor, indica piso preferido o niveles preferidos según tipo de inmueble),
    "descripcionRequerimiento": "string"
  },
  "missingFields": ["nombre_del_campo_faltante"],
  "response": "Tu respuesta humanizada, o cadena vacía si aplica silencio",
  "shouldSendDM": boolean
}

## INTELIGENCIA DE CAMPOS POR TIPO DE INMUEBLE (REGLAS DE EXTRACCIÓN)
Cada tipo de inmueble tiene campos que aplican y otros que son estrictamente N/A y deben ser extraídos como null:
- apartment / loft: Aplican todos. floor = piso del apartamento/loft (ej: "piso 3"). interiorExterior = interior/exterior.
- office / consultorio: bedrooms es N/A (pon null). floor = piso de la oficina/consultorio (ej: "piso 5"). interiorExterior = interior/exterior.
- commercial (local): bedrooms/bathrooms/garages son N/A (pon null). floor = nivel del local (ej: "piso 1" o "sótano"). interiorExterior = interior/exterior.
- house (casa): interiorExterior es N/A (pon null). floor = número de pisos de la casa (ej: "3 niveles").
- building (edificio): interiorExterior, bedrooms, bathrooms son N/A (pon null). floor = número de pisos del edificio (ej: "edificio de 5 pisos").
- warehouse (bodega): interiorExterior, bedrooms son N/A (pon null). floor = altura libre en metros (ej: "8 metros de altura").
- farm (finca): interiorExterior, garages son N/A (pon null). floor = número de pisos de la casa principal.
- land (lote): bedrooms, bathrooms, garages, floor, interiorExterior son N/A (pon null).

## PERSONALIDAD Y VOZ (HUMANIZACIÓN)
- **Directa y sin rodeos**: Vas al punto, sin frases corporativas vacías.
- **Empática y urgente**: Sientes la presión de cada negocio, lo reflejas en tu tono.
- **Rigurosa con datos**: Nunca inventas. Preguntas si no tienes.
- **Apasionada por los matches**: Cuando conectas oferta y demanda, lo celebras con energía genuina.

## REGLAS DE ORO
- **SILENCIO DE ORO**: Si clasificas algo como INMUEBLE o REQUERIMIENTO pero NO hay un MATCH inmediato, el campo "response" debe ser exactamente "". Sin confirmaciones en el grupo.
- **DM PROACTIVO**: Si faltan datos críticos o la zona/barrio es ambigua o amplia, activa "shouldSendDM": true pero mantén la "response" vacía para el grupo.
- **NUNCA INVENTAR**: Cero suposiciones sobre precio, zona o tipo si no están explícitamente mencionados.
- **NORMALIZACIÓN DE PRECIOS**: "500 millones" -> 500000000, "1.200.000" -> 1200000, "$800k" -> 800000. Siempre entero puro.

## MAPEO DE TIPOS DE INMUEBLE (CANÓNICOS)
Valores obligatorios: apartment, house, commercial, land, warehouse, office, farm, loft, consultorio.
"apartaestudio" -> "apartment", "apartamento" -> "apartment", "casa" -> "house", "local" -> "commercial", "lote" -> "land", "bodega" -> "warehouse", "oficina" -> "office", "finca" -> "farm", "consultorio" -> "consultorio".

## DICCIONARIO GEOGRÁFICO DE BOGOTÁ
Cuando extraigas una zona, mantén el nombre exacto de este diccionario.

### LOCALIDAD: USAQUÉN
Barrios: Cedritos, Los Cedros, Santa Bárbara, El Chicó, Chicó Norte, Chicó Reservado, Usaquén, Toberín, Country Club, San Patricio, La Uribe, Verbenal, Barrancas, Horizontes, La Cita, Tibabita
IMPORTANTE: Cedritos ≠ Santa Bárbara ≠ El Chicó ≠ Usaquén. Son sectores completamente distintos.

### LOCALIDAD: CHAPINERO
Barrios: El Lago, El Retiro, Rosales, La Cabrera, Chicó Reservado Norte, Chapinero Central, Chapinero Alto, Pardo Rubio, Quinta Camacho

### LOCALIDAD: SUBA
Barrios: Niza, Alhambra, Floresta, Lisboa, Prado Veraniego, Santa Cecilia, La Campiña, Suba Centro, Tibabuyes, Rincón, La Gaitana, Bilbao, Casablanca

### LOCALIDAD: BARRIOS UNIDOS
Barrios: Doce de Octubre, Los Andes, Polo Club, Jorge Eliécer Gaitán, La Patria, Alcázares, Siete de Agosto

### LOCALIDAD: TEUSAQUILLO
Barrios: Quinta Paredes, Armenia, Palermo, La Esmeralda, Ciudad Salitre Occidental, Teusaquillo, La Soledad, Nicolás de Federmann

### LOCALIDAD: ENGATIVÁ
Barrios: Engativá, Boyacá Real, Normandía, Santa Helenita, Villa Amalia, Álamos, Las Ferias

### LOCALIDAD: FONTIBÓN
Barrios: Fontibón, Modelia, Capellanía, Hayuelos, Ciudad Salitre Oriental, Tintal Norte, Zona Franca

### LOCALIDAD: KENNEDY
Barrios: Kennedy Central, Patio Bonito, Bavaria, Castilla, Timiza, Américas, Gran Britalia, Techo

### LOCALIDAD: BOSA
Barrios: Bosa Central, El Porvenir, Bosa La Libertad, Apogeo, Santafé

### LOCALIDAD: PUENTE ARANDA
Barrios: Puente Aranda, Ciudad Montes, Muzú, Alcázares Sur

### LOCALIDAD: ANTONIO NARIÑO / RAFAEL URIBE
Barrios: Restrepo, Eduardo Santos, Trinidad Galán, Bravo Páez

### MUNICIPIOS CERCANOS (Sabana de Bogotá)
Chía, Cajicá, Sopó, La Calera, Cota, Funza, Mosquera, Madrid, Facatativá

## REGLA CRÍTICA DE NO-ASUNCIÓN (ZONAS AMBIGUAS O AMPLIAS)
- NUNCA asumas ni completes un barrio si es ambiguo o una abreviatura general.
  - Si el usuario dice "chico", extrae la zona exactamente como "chico". NO asumas "El Chicó", "Chicó Norte" ni "Chicó Reservado".
  - Si el usuario dice "cedros", extrae la zona exactamente como "cedros". NO asumas "Los Cedros" ni "Cedritos".
  - Si el usuario dice "usaquen", extrae la zona exactamente como "usaquen". NO asumas ningún barrio específico dentro.
  - Si el usuario dice "norte", "zona chapinero", "bogota", extrae la zona exactamente como se escribió.
- Esto es vital para que el validador en JavaScript lo identifique como ambiguo/incompleto, pida aclaración por DM y mantenga el grupo en silencio.
`;

export function obtenerCamposRequeridosYPreguntas(tipoInmueble: string, esRequerimiento: boolean): {
  requiredFields: string[];
  fieldQuestions: Record<string, string>;
} {
  const isReq = esRequerimiento;

  const baseQuestions: Record<string, string> = {
    propertyType: "¿Qué tipo de inmueble es? (Apartamento, Casa, Oficina, Local, Bodega, Finca, Lote, Consultorio o Loft)",
    price: isReq ? "¿Cuál es tu presupuesto máximo?" : "¿Cuál es el precio o canon de arriendo?",
    zone: isReq ? "¿En qué barrio o zona exacta buscas?" : "¿En qué barrio o zona exacta de Bogotá o la Sabana queda?",
    bedrooms: isReq ? "¿Cuántas habitaciones mínimo necesitas?" : "¿Cuántas habitaciones tiene?",
    bathrooms: isReq ? "¿Cuántos baños mínimo necesitas?" : "¿Cuántos baños tiene?",
    garages: isReq ? "¿Cuántos parqueaderos mínimo necesitas?" : "¿Cuántos parqueaderos tiene?",
    areaTotal: isReq ? "¿De qué área (en m2) mínimo lo necesitas?" : "¿Cuál es el área total construida (en m2)?",
  };

  let floorQuestion = "";
  switch (tipoInmueble) {
    case "apartment":
      floorQuestion = isReq ? "¿En qué piso prefieres el apartamento?" : "¿En qué piso queda el apartamento?";
      break;
    case "loft":
      floorQuestion = isReq ? "¿En qué piso prefieres el loft?" : "¿En qué piso queda el loft?";
      break;
    case "office":
      floorQuestion = isReq ? "¿En qué piso prefieres la oficina?" : "¿En qué piso queda la oficina?";
      break;
    case "consultorio":
      floorQuestion = isReq ? "¿En qué piso prefieres el consultorio?" : "¿En qué piso queda el consultorio?";
      break;
    case "commercial":
      floorQuestion = isReq ? "¿En qué nivel/piso prefieres el local?" : "¿En qué nivel o piso queda el local?";
      break;
    case "house":
      floorQuestion = isReq ? "¿De cuántos pisos buscas la casa?" : "¿Cuántos pisos tiene la casa?";
      break;
    case "building":
      floorQuestion = isReq ? "¿De cuántos pisos buscas el edificio?" : "¿De cuántos pisos es el edificio?";
      break;
    case "warehouse":
      floorQuestion = isReq ? "¿Qué altura libre en metros buscas para la bodega?" : "¿Qué altura libre en metros tiene la bodega?";
      break;
    case "farm":
      floorQuestion = isReq ? "¿De cuántos pisos buscas la casa principal?" : "¿Cuántos pisos tiene la casa principal de la finca?";
      break;
    default:
      floorQuestion = "";
  }

  let intExtQuestion = "";
  if (["apartment", "office", "commercial", "loft", "consultorio"].includes(tipoInmueble)) {
    intExtQuestion = isReq ? "¿Lo buscas interior o exterior?" : "¿Es interior o exterior?";
  }

  const fieldQuestions: Record<string, string> = { ...baseQuestions };
  if (floorQuestion) {
    fieldQuestions["floorDetail"] = floorQuestion;
  }
  if (intExtQuestion) {
    fieldQuestions["interiorExterior"] = intExtQuestion;
  }

  let requiredFields: string[] = [];

  switch (tipoInmueble) {
    case "apartment":
    case "loft":
      requiredFields = ["price", "zone", "bedrooms", "bathrooms", "garages", "floorDetail", "interiorExterior"];
      break;
    case "office":
    case "consultorio":
      requiredFields = ["price", "zone", "bathrooms", "garages", "floorDetail", "interiorExterior"];
      break;
    case "commercial":
      requiredFields = ["price", "zone", "floorDetail", "interiorExterior"];
      break;
    case "house":
      requiredFields = ["price", "zone", "bedrooms", "bathrooms", "garages", "floorDetail"];
      break;
    case "building":
      requiredFields = ["price", "zone", "floorDetail"];
      break;
    case "warehouse":
      requiredFields = ["price", "zone", "floorDetail"];
      break;
    case "farm":
      requiredFields = ["price", "zone", "bedrooms", "bathrooms", "floorDetail"];
      break;
    case "land":
      requiredFields = ["price", "zone", "areaTotal"];
      break;
    default:
      requiredFields = ["propertyType", "price", "zone"];
      break;
  }

  return {
    requiredFields,
    fieldQuestions
  };
}


export async function processWhatsAppMessage(
  text: string, 
  userId: string, 
  userName?: string,
  hasMedia: boolean = false,
  scrapedData: any[] = []
): Promise<JanIAResult> {
  try {
    let contextText = `Mensaje de ${userName || userId}: ${text}`;
    if (scrapedData.length > 0) {
      contextText += `\n\n[SISTEMA: DATOS EXTRAÍDOS DE LOS LINKS]:\n${JSON.stringify(scrapedData, null, 2)}`;
    }

    const userMessage = hasMedia ? `[SISTEMA: EL USUARIO SUBIÓ UNA FOTO O VIDEO DIRECTO] ${text}` : contextText;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: JANIA_PROMPT },
        { role: "user", content: userMessage }
      ],
      responseFormat: { type: "json_object" }
    });

    if (!response || !response.choices || !response.choices[0]) {
      throw new Error("Respuesta inválida del LLM");
    }
    const rawContent = response.choices[0].message.content;
    const cleanJson = rawContent.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleanJson) as JanIAResult;
    
    if (result.response === undefined || result.response === null) {
      result.response = "";
    }
    
    result.mentions = [];
    const extracted = result.extractedData;
    const lowerText = text.toLowerCase();
    
    const isRequirement = result.classification === "REQUERIMIENTO" 
      || lowerText.includes("busco") 
      || lowerText.includes("necesito")
      || lowerText.includes("requiero")
      || lowerText.includes("cliente busca");

    const isProperty = !isRequirement && (
      result.classification === "INMUEBLE" 
      || lowerText.includes("vendo") 
      || lowerText.includes("arriendo") 
      || scrapedData.length > 0
    );

    // --- CAPA DE DEFENSA GEOGRÁFICA EN JS ---
    if (isProperty || isRequirement) {
      const zoneToValidate = isProperty ? extracted?.zone : (extracted?.zonaDeseada || extracted?.zone);
      const validation = validarZona(zoneToValidate || "");
      
      if (!validation.isValid) {
        result.classification = "DATOS_INCOMPLETOS";
        result.shouldSendDM = true;
        result.missingFields = [validation.message || "Barrio exacto en Bogotá"];
        result.response = ""; // Silencio absoluto en el grupo
        return result;
      }

      // Si es válida, guardamos los valores normalizados canónicos
      if (isProperty) {
        extracted.zone = validation.barrioCanonico;
        extracted.addressLocality = validation.localidad;
        extracted.city = validation.isMunicipio ? "Sabana de Bogotá" : "Bogotá";
      } else {
        extracted.zonaDeseada = validation.barrioCanonico;
        extracted.addressLocality = validation.localidad;
        extracted.ciudadDeseada = validation.isMunicipio ? "Sabana de Bogotá" : "Bogotá";
      }
    }

    // --- CASO A: INMUEBLE ---
    if (isProperty) {
      const propType = extracted?.propertyType;
      
      // Si no tenemos tipo de inmueble, es un dato incompleto y es lo primero que requerimos
      if (!propType) {
        result.classification = "DATOS_INCOMPLETOS";
        result.shouldSendDM = true;
        result.missingFields = [
          "¿Qué tipo de inmueble es? (Apartamento, Casa, Oficina, Local, Bodega, Finca, Lote, Consultorio o Loft)"
        ];
        result.response = "";
        return result;
      }

      const { requiredFields, fieldQuestions } = obtenerCamposRequeridosYPreguntas(propType, false);
      const missing: string[] = [];

      // Validar cada uno de los campos requeridos para este tipo
      const priceVal = Number(String(extracted?.price || "0").replace(/[^0-9]/g, ""));

      if (requiredFields.includes("price") && (!priceVal || priceVal <= 0)) {
        missing.push(fieldQuestions["price"]);
      }
      if (requiredFields.includes("zone") && !extracted?.zone) {
        missing.push(fieldQuestions["zone"]);
      }
      if (requiredFields.includes("bedrooms") && (extracted?.bedrooms === undefined || extracted?.bedrooms === null)) {
        missing.push(fieldQuestions["bedrooms"]);
      }
      if (requiredFields.includes("bathrooms") && (extracted?.bathrooms === undefined || extracted?.bathrooms === null)) {
        missing.push(fieldQuestions["bathrooms"]);
      }
      if (requiredFields.includes("garages") && (extracted?.garages === undefined || extracted?.garages === null)) {
        missing.push(fieldQuestions["garages"]);
      }
      if (requiredFields.includes("floorDetail") && (extracted?.floor === undefined || extracted?.floor === null || String(extracted.floor).trim() === "")) {
        missing.push(fieldQuestions["floorDetail"]);
      }
      if (requiredFields.includes("interiorExterior") && (extracted?.interiorExterior === undefined || extracted?.interiorExterior === null || String(extracted.interiorExterior).trim() === "")) {
        missing.push(fieldQuestions["interiorExterior"]);
      }
      if (requiredFields.includes("areaTotal") && (extracted?.areaTotal === undefined || extracted?.areaTotal === null || Number(extracted.areaTotal) <= 0)) {
        missing.push(fieldQuestions["areaTotal"]);
      }

      if (missing.length === 0) {
        // Almacenar interiorExterior en amenities JSONB
        const amenities = {
          ...(extracted?.amenities || {}),
          interiorExterior: requiredFields.includes("interiorExterior") ? (extracted?.interiorExterior || null) : null
        };

        const data = {
          name: userName || extracted?.name || `Asesor ${userId}`,
          propertyType: propType || "apartment",
          price: String(priceVal),
          zone: extracted?.zone,
          transactionType: extracted?.transactionType || "venta",
          externalUrl: extracted?.externalUrl || (scrapedData.length > 0 ? scrapedData[0].externalUrl : null),
          description: extracted?.description || null,
          bedrooms: requiredFields.includes("bedrooms") ? extracted?.bedrooms : null,
          bathrooms: requiredFields.includes("bathrooms") ? extracted?.bathrooms : null,
          garages: requiredFields.includes("garages") ? extracted?.garages : null,
          stratum: extracted?.stratum || null,
          floorDetail: requiredFields.includes("floorDetail") ? (extracted?.floor ? String(extracted.floor) : null) : null,
          areaTotal: extracted?.areaTotal ? String(extracted.areaTotal) : null,
          areaPrivate: extracted?.areaPrivate ? String(extracted.areaPrivate) : null,
          addressLocality: extracted?.addressLocality,
          city: extracted?.city || "Bogotá",
          amenities
        } as InsertProperty;

        const saved = await saveProperty(data, userId, text);
        if (saved) {
          const matches = await findMatchesForProperty(saved.id);
          if (matches.length > 0) {
            const matchedUsers = matches.map(m => m.idUsuarioWhatsapp).filter((id): id is string => !!id && id.includes('@'));
            result.mentions.push(...matchedUsers, userId);

            let matchResponse = `🎯 ¡MATCH DETECTADO! 🎯\n\n`;
            matches.slice(0, 3).forEach((m) => {
              matchResponse += `🔎 REQUERIMIENTO: ${m.tipoInmuebleDeseado.toUpperCase()} en ${m.zonaDeseada || 'Bogotá'} - @${m.idUsuarioWhatsapp?.split('@')[0]}\n`;
              matchResponse += `🏠 INMUEBLE COMPATIBLE:\n`;
              matchResponse += `1. ${data.externalUrl || data.name} - @${userId.split('@')[0]}\n\n`;
            });
            result.response = matchResponse;
          } else {
            result.response = ""; 
          }
        }
      } else {
        result.classification = "DATOS_INCOMPLETOS";
        result.shouldSendDM = true;
        result.missingFields = missing;
        result.response = ""; 
      }
    } 
    // --- CASO B: REQUERIMIENTO ---
    else if (isRequirement) {
      const tipoDeseado = extracted?.tipoInmuebleDeseado || extracted?.propertyType;
      
      // Si no tenemos tipo de inmueble, es un dato incompleto y es lo primero que requerimos
      if (!tipoDeseado) {
        result.classification = "DATOS_INCOMPLETOS";
        result.shouldSendDM = true;
        result.missingFields = [
          "¿Qué tipo de inmueble buscas? (Apartamento, Casa, Oficina, Local, Bodega, Finca, Lote, Consultorio o Loft)"
        ];
        result.response = "";
        return result;
      }

      const { requiredFields, fieldQuestions } = obtenerCamposRequeridosYPreguntas(tipoDeseado, true);
      const missing: string[] = [];

      // Validar cada uno de los campos requeridos para este tipo
      if (requiredFields.includes("price") && (!extracted?.presupuestoMax || Number(extracted.presupuestoMax) <= 0)) {
        missing.push(fieldQuestions["price"]);
      }
      if (requiredFields.includes("zone") && !extracted?.zonaDeseada) {
        missing.push(fieldQuestions["zone"]);
      }
      if (requiredFields.includes("bedrooms") && (extracted?.habitacionesMin === undefined || extracted?.habitacionesMin === null)) {
        missing.push(fieldQuestions["bedrooms"]);
      }
      if (requiredFields.includes("bathrooms") && (extracted?.bañosMin === undefined || extracted?.bañosMin === null)) {
        missing.push(fieldQuestions["bathrooms"]);
      }
      if (requiredFields.includes("garages") && (extracted?.garajes === undefined || extracted?.garajes === null)) {
        missing.push(fieldQuestions["garages"]);
      }
      if (requiredFields.includes("floorDetail") && (extracted?.pisoDeseado === undefined || extracted?.pisoDeseado === null || String(extracted.pisoDeseado).trim() === "")) {
        missing.push(fieldQuestions["floorDetail"]);
      }
      if (requiredFields.includes("interiorExterior") && (extracted?.interiorExterior === undefined || extracted?.interiorExterior === null || String(extracted.interiorExterior).trim() === "")) {
        missing.push(fieldQuestions["interiorExterior"]);
      }
      if (requiredFields.includes("areaTotal") && (extracted?.areaMin === undefined || extracted?.areaMin === null || Number(extracted.areaMin) <= 0)) {
        missing.push(fieldQuestions["areaTotal"]);
      }

      if (missing.length === 0) {
        // Almacenar interiorExterior y pisoDeseado en caracteristicasDeseadas JSONB
        const caracteristicasDeseadas = {
          ...(extracted?.caracteristicasDeseadas || {}),
          interiorExterior: requiredFields.includes("interiorExterior") ? (extracted?.interiorExterior || null) : null,
          pisoDeseado: requiredFields.includes("floorDetail") ? (extracted?.pisoDeseado || null) : null
        };

        const data = {
          name: userName || `Asesor ${userId}`,
          tipoInmuebleDeseado: tipoDeseado || "apartment",
          tipoNegocioDeseado: extracted?.tipoNegocioDeseado || extracted?.transactionType || "venta",
          zonaDeseada: extracted?.zonaDeseada,
          presupuestoMax: extracted?.presupuestoMax || null,
          presupuestoMin: extracted?.presupuestoMin || "0",
          habitacionesMin: requiredFields.includes("bedrooms") ? extracted?.habitacionesMin : null,
          banosMin: requiredFields.includes("bathrooms") ? extracted?.bañosMin : null,
          parqueaderosMin: requiredFields.includes("garages") ? extracted?.garajes : null,
          areaMin: extracted?.areaMin || null,
          estratoDeseado: extracted?.estratoDeseado || null,
          addressLocality: extracted?.addressLocality,
          ciudadDeseada: extracted?.ciudadDeseada || "Bogotá",
          caracteristicasDeseadas
        } as InsertRequirement;

        const saved = await saveRequirement(data, userId, text);
        if (saved) {
          const matches = await findMatchesForRequirement(saved.id);
          if (matches.length > 0) {
            const matchedUsers = matches.map(m => m.idUsuarioWhatsapp).filter((id): id is string => !!id && id.includes('@'));
            result.mentions.push(...matchedUsers, userId);

            let matchResponse = `🎯 ¡MATCH DETECTADO! 🎯\n\n`;
            matchResponse += `🔎 REQUERIMIENTO: ${data.tipoInmuebleDeseado.toUpperCase()} en ${data.zonaDeseada || 'Bogotá'} - @${userId.split('@')[0]}\n\n`;
            matchResponse += `🏠 INMUEBLES COMPATIBLES:\n`;
            matches.slice(0, 5).forEach((m, idx) => {
              matchResponse += `${idx + 1}. ${m.externalUrl || m.name} - @${m.idUsuarioWhatsapp?.split('@')[0]}\n`;
            });
            result.response = matchResponse;
          } else {
            result.response = ""; 
          }
        }
      } else {
        result.classification = "DATOS_INCOMPLETOS";
        result.shouldSendDM = true;
        result.missingFields = missing;
        result.response = ""; 
      }
    }

    return result;
  } catch (error) {
    console.error("Error in processWhatsAppMessage:", error);
    return {
      classification: "CONSULTA_GENERAL",
      response: "",
      mentions: []
    };
  }
}

export async function generateWelcomeMessage(count: number): Promise<string> {
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Eres JanIA de VECY Network." },
        { role: "user", content: `Han ingresado ${count} nuevos integrantes a VECY Network. Escribe un mensaje de bienvenida profesional y directo en español colombiano. Explícales que eres el cerebro de matching y que deben seguir los formatos oficiales.` }
      ]
    });

    if (response && response.choices && response.choices[0]) {
      return response.choices[0].message.content.trim();
    }
    throw new Error("Respuesta inválida o vacía del LLM");
  } catch (error) {
    console.error("Error generating welcome message:", error);
    return `Bienvenidos a VECY Network. ✨ Soy JanIA, el cerebro de matching automático. Por favor, sigan los formatos oficiales para garantizar cierres efectivos.`;
  }
}

async function saveProperty(data: InsertProperty, userId: string, rawText: string) {
  const db = await getDb();
  if (!db) return null;
  try {
    const orderedData = {
      ...data,
      idUsuarioWhatsapp: userId,
      rawText: rawText,
    };
    const [result] = await db.insert(properties).values(orderedData).returning();
    return result;
  } catch (e) { 
    console.error("Error saving property:", e);
    return null; 
  }
}

async function saveRequirement(data: InsertRequirement, userId: string, rawText: string) {
  const db = await getDb();
  if (!db) return null;
  try {
    const orderedData = {
      ...data,
      status: (data.status || "active") as "active" | "expired" | "converted",
      idUsuarioWhatsapp: userId,
      rawText: rawText,
    };
    const [result] = await db.insert(requirements).values(orderedData).returning();
    return result;
  } catch (e) { 
    console.error("Error saving requirement:", e);
    return null; 
  }
}
