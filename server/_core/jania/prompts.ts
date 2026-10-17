/**
 * JanIA Prompts & Copys - VECY BIENES RAÍCES
 * Constantes de texto, copys oficiales institucionales y constructores de system prompts.
 */
import fs from "fs";
import path from "path";
import { invokeLLM } from "../llm";

export const REPUTATION_HOOK = "⚠️ *IMPORTANTE:* Colega y cliente, recuerda que este ecosistema tecnológico fue creado pensando en tu beneficio y en el de toda nuestra comunidad. Te contamos que operamos en *Etapa de Prueba Gratuita y 100% SIN COMISIONES*. Si has tenido una buena experiencia en alguno de nuestros canales o has logrado consolidar un negocio real gracias a la conexión privada de JanIA, sería un verdadero honor para nosotros que nos compartieras tu testimonio y calificación de nuestros servicios en este enlace: https://g.page/r/CctNbwU6UpX5EBM/review";

export function buildIncompleteDataMessage(
  text: string,
  hasMedia: boolean,
  scrapedData: any[],
  imageBuffer: any,
  pdfBuffer: any,
  extracted: any,
  isGeoInvalid: boolean,
  intro: string,
  firstName: string
): string {
  const isSocialMedia = /instagram\.com|facebook\.com|fb\.watch|tiktok\.com|youtube\.com|youtu\.be/i.test(text);
  if (isSocialMedia) {
    return `Oye *${firstName}*, veo que compartiste un enlace de redes sociales o video comercial. 📲 Por políticas de la red VECY y seguridad de datos, no puedo leer publicaciones de Instagram, Facebook, TikTok o YouTube.\n\nPero ¡no te preocupes! Puedes enviarme por aquí mismo los detalles escritos (área, precio, ubicación, habitaciones, etc.), la imagen del flyer comercial o un archivo en PDF de la propiedad y lo procesaré de inmediato. 😉🤝`;
  }

  const propTypeRaw = (extracted?.propertyType || extracted?.tipoInmuebleDeseado || "inmueble").toLowerCase();
  let propertyName = "inmueble";
  if (propTypeRaw === "apartment") propertyName = "apartamento";
  else if (propTypeRaw === "house") propertyName = "casa";
  else if (propTypeRaw === "building") propertyName = "edificio";
  else if (propTypeRaw === "warehouse") propertyName = "bodega";
  else if (propTypeRaw === "office") propertyName = "oficina";
  else if (propTypeRaw === "farm" || propTypeRaw === "finca") propertyName = "finca";
  else if (propTypeRaw === "land" || propTypeRaw === "lote") propertyName = "lote";
  else if (propTypeRaw === "consultorio") propertyName = "consultorio";
  else if (propTypeRaw === "loft") propertyName = "loft";

  const isRequirement = text.toLowerCase().includes("busco") || text.toLowerCase().includes("necesito") || text.toLowerCase().includes("requiero") || !!extracted?.tipoInmuebleDeseado;
  const txTypeRaw = (extracted?.transactionType || extracted?.tipoNegocioDeseado || "venta").toLowerCase();

  // Recolectar campos faltantes en orden de prioridad
  const city = isRequirement ? extracted?.ciudadDeseada : extracted?.city;
  if (!city || city.trim() === "" || city.toLowerCase() === "na") {
    return isRequirement
      ? `Oye *${firstName}*, ¿en qué ciudad estás buscando el/la *${propertyName}*? 📍`
      : `Oye *${firstName}*, ¿en qué ciudad queda ubicado el/la *${propertyName}* que quieres publicar? 📍`;
  }

  const zone = isRequirement ? (extracted?.zonaDeseada || extracted?.zone) : extracted?.zone;
  if (isGeoInvalid || !zone || zone.trim() === "" || zone.toLowerCase() === "na") {
    return isRequirement
      ? `Oye *${firstName}*, ¿en qué barrio o sector de *${city}* buscas el/la *${propertyName}*? 🏡 (Si tienes varias opciones de barrio, escríbelas separadas por comas)`
      : `Oye *${firstName}*, ¿en qué barrio o sector exacto de *${city}* queda el/la *${propertyName}*? 🏡`;
  }

  const price = isRequirement ? Number(extracted?.presupuestoMax || extracted?.price || 0) : Number(extracted?.price || 0);
  if (!price || price <= 0) {
    if (isRequirement) {
      return `Oye *${firstName}*, ¿cuál es tu presupuesto máximo para ${txTypeRaw === "arriendo" ? "arrendar" : "comprar"} el/la *${propertyName}*? 💰`;
    } else {
      return `Oye *${firstName}*, ¿cuál es el precio de ${txTypeRaw === "arriendo" ? "arriendo mensual" : "venta"} del/la *${propertyName}*? 💰`;
    }
  }

  if (txTypeRaw === "arriendo") {
    const hasAdminFee = extracted?.adminFee !== undefined && extracted?.adminFee !== null && Number(extracted.adminFee) >= 0;
    const textHasAdmin = text.toLowerCase().includes("adm") || text.toLowerCase().includes("administra");
    if (!hasAdminFee && !textHasAdmin) {
      return `Oye *${firstName}*, ¿el valor de la administración está incluido en el arriendo del/la *${propertyName}* o cuánto cuesta por separado? 📋`;
    }
  }

  const area = Number(extracted?.area || 0);
  if (!area || area <= 0) {
    if (propertyName === "finca") {
      return `Oye *${firstName}*, ¿cuántas hectáreas o fanegadas de extensión tiene la finca? 📐`;
    } else {
      return `Oye *${firstName}*, ¿cuál es el área o metraje en metros cuadrados del/la *${propertyName}*? 📐`;
    }
  }

  const stratum = Number(extracted?.stratum || 0);
  if ((!stratum || stratum <= 0) && propertyName !== "finca" && propertyName !== "lote" && propertyName !== "bodega") {
    return `Oye *${firstName}*, ¿de qué estrato es el/la *${propertyName}*? 🏢`;
  }

  if (propertyName === "apartamento" || propertyName === "casa" || propertyName === "loft" || propertyName === "inmueble") {
    const bedrooms = Number(extracted?.bedrooms || 0);
    if (!bedrooms || bedrooms <= 0) {
      return isRequirement
        ? `Oye *${firstName}*, ¿podrías repetirme de cuántas habitaciones lo necesitas? 🛏️`
        : `Oye *${firstName}*, ¿podrías repetirme de cuántas habitaciones es? 🛏️`;
    }
    const bathrooms = Number(extracted?.bathrooms || 0);
    if (!bathrooms || bathrooms <= 0) {
      return isRequirement
        ? `Oye *${firstName}*, ¿de cuántos baños lo requieres? 🚽`
        : `Oye *${firstName}*, ¿de cuántos baños dispone el/la *${propertyName}*? 🚽`;
    }
  }

  const garages = extracted?.garages;
  if ((garages === undefined || garages === null || garages < 0) && propertyName !== "lote") {
    return isRequirement
      ? `Oye *${firstName}*, ¿cuántos parqueaderos o garajes necesitas como mínimo? 🚗`
      : `Oye *${firstName}*, ¿de cuántos garajes o parqueaderos dispone el/la *${propertyName}*? 🚗`;
  }

  if (propertyName === "apartamento" || propertyName === "oficina" || propertyName === "consultorio") {
    const floor = extracted?.floorDetail;
    if (!floor || floor.trim() === "" || floor.toUpperCase() === "NA") {
      return `Oye *${firstName}*, ¿en qué piso está ubicado el/la *${propertyName}*? 🏢`;
    }
    const intExt = extracted?.interiorExterior;
    if (!intExt || intExt.trim() === "" || intExt.toUpperCase() === "NA") {
      return `Oye *${firstName}*, ¿la ubicación del/la *${propertyName}* es interior o exterior? 🏙️`;
    }
  } else if (propertyName === "casa" || propertyName === "edificio") {
    const floor = extracted?.floorDetail;
    if (!floor || floor.trim() === "" || floor.toUpperCase() === "NA") {
      return `Oye *${firstName}*, ¿de cuántos pisos o niveles es la/el *${propertyName}*? 🏛️`;
    }
  } else if (propertyName === "bodega") {
    const floor = extracted?.floorDetail;
    if (!floor || floor.trim() === "" || floor.toUpperCase() === "NA") {
      return `Oye *${firstName}*, ¿qué altura útil tiene la bodega? ¿Es de sencilla, doble o triple altura? 🏗️`;
    }
  }

  return `Oye *${firstName}*, ¿me podrías confirmar la ubicación o el barrio exacto para registrarlo correctamente en VECY? 🔎`;
}

export function buildGroupIncompleteMessage(
  text: string,
  userId: string,
  extracted: any
): string {
  const phone = userId.split('@')[0];
  const propTypeRaw = (extracted?.propertyType || extracted?.tipoInmuebleDeseado || "inmueble").toLowerCase();
  let propertyName = "inmueble";
  if (propTypeRaw === "apartment") propertyName = "apartamento";
  else if (propTypeRaw === "house") propertyName = "casa";
  else if (propTypeRaw === "building") propertyName = "edificio";
  else if (propTypeRaw === "warehouse") propertyName = "bodega";
  else if (propTypeRaw === "office") propertyName = "oficina";
  else if (propTypeRaw === "farm" || propTypeRaw === "finca") propertyName = "finca";
  else if (propTypeRaw === "land" || propTypeRaw === "lote") propertyName = "lote";
  else if (propTypeRaw === "consultorio") propertyName = "consultorio";
  else if (propTypeRaw === "loft") propertyName = "loft";

  const isRequirement = text.toLowerCase().includes("busco") || text.toLowerCase().includes("necesito") || text.toLowerCase().includes("requiero") || !!extracted?.tipoInmuebleDeseado;
  const txTypeRaw = (extracted?.transactionType || extracted?.tipoNegocioDeseado || "venta").toLowerCase();

  const missingList: string[] = [];

  const city = isRequirement ? extracted?.ciudadDeseada : extracted?.city;
  if (!city || city.trim() === "" || city.toLowerCase() === "na") {
    missingList.push("la ciudad");
  }

  const zone = isRequirement ? (extracted?.zonaDeseada || extracted?.zone) : extracted?.zone;
  if (!zone || zone.trim() === "" || zone.toLowerCase() === "na") {
    missingList.push("el barrio exacto");
  }

  const price = isRequirement ? Number(extracted?.presupuestoMax || extracted?.price || 0) : Number(extracted?.price || 0);
  if (!price || price <= 0) {
    if (isRequirement) {
      missingList.push("el presupuesto máximo");
    } else {
      if (txTypeRaw === "arriendo") {
        missingList.push("el precio de arriendo");
      } else if (txTypeRaw === "permuta") {
        missingList.push("el valor de la permuta");
      } else {
        missingList.push("el precio de venta");
      }
    }
  }

  if (txTypeRaw === "arriendo" && !isRequirement) {
    const hasAdminFee = extracted?.adminFee !== undefined && extracted?.adminFee !== null && Number(extracted.adminFee) >= 0;
    const textHasAdmin = text.toLowerCase().includes("adm") || text.toLowerCase().includes("administra");
    if (!hasAdminFee && !textHasAdmin) {
      missingList.push("el valor de la administración");
    }
  }

  const area = Number(extracted?.area || 0);
  if (!area || area <= 0) {
    if (propertyName === "finca") {
      missingList.push("las hectáreas o fanegadas");
    } else {
      missingList.push("el metraje en metros cuadrados");
    }
  }

  const stratum = Number(extracted?.stratum || 0);
  if ((!stratum || stratum <= 0) && propertyName !== "finca" && propertyName !== "lote" && propertyName !== "bodega") {
    missingList.push("el estrato");
  }

  if (propertyName === "apartamento" || propertyName === "casa" || propertyName === "loft" || propertyName === "inmueble") {
    const bedrooms = Number(extracted?.bedrooms || 0);
    if (!bedrooms || bedrooms <= 0) {
      missingList.push("las habitaciones");
    }
    const bathrooms = Number(extracted?.bathrooms || 0);
    if (!bathrooms || bathrooms <= 0) {
      missingList.push("los baños");
    }
  }

  const garages = extracted?.garages;
  if ((garages === undefined || garages === null || garages < 0) && propertyName !== "lote") {
    missingList.push("los garajes/parqueaderos");
  }

  if (propertyName === "apartamento" || propertyName === "oficina" || propertyName === "consultorio") {
    const floor = extracted?.floorDetail;
    if (!floor || floor.trim() === "" || floor.toUpperCase() === "NA") {
      missingList.push("el piso");
    }
    const intExt = extracted?.interiorExterior;
    if (!intExt || intExt.trim() === "" || intExt.toUpperCase() === "NA") {
      missingList.push("si es interior o exterior");
    }
  } else if (propertyName === "casa" || propertyName === "edificio") {
    const floor = extracted?.floorDetail;
    if (!floor || floor.trim() === "" || floor.toUpperCase() === "NA") {
      missingList.push("la cantidad de pisos");
    }
  } else if (propertyName === "bodega") {
    const floor = extracted?.floorDetail;
    if (!floor || floor.trim() === "" || floor.toUpperCase() === "NA") {
      missingList.push("la altura útil");
    }
  }

  if (missingList.length === 0) {
    missingList.push("el barrio exacto");
  }

  let missingStr = "";
  if (missingList.length === 1) {
    missingStr = missingList[0];
  } else if (missingList.length === 2) {
    missingStr = `${missingList[0]} y ${missingList[1]}`;
  } else {
    const last = missingList.pop();
    missingStr = `${missingList.join(", ")}, y ${last}`;
  }

  return `🤔 *¡PUBLICACIÓN INCOMPLETA!* 🤔\n\nHola @${phone}, noto que estás publicando un(a) *${propertyName}*, pero a tu mensaje le faltan datos importantes: *${missingStr}*.\n\nPara registrar tu oferta/requerimiento y buscarte un MATCH de inmediato, ingresa a nuestra Consola Web de JanIA: 👇\n👉 https://vecy-bienes-raices.vercel.app/jania`;
}

export let promptCache: Record<string, string> = {};

let vecyKnowledgeCache: string = "";

/**
 * Carga en memoria el Dossier Institucional y Portafolio de VECY BIENES RAÍCES (v33.04) a $0 COP.
 */
export function getVecyInstitutionalKnowledge(): string {
  if (vecyKnowledgeCache) return vecyKnowledgeCache;
  try {
    const candidates = [
      path.resolve(process.cwd(), "server/_core/jania/prompts/conocimiento_vecy.md"),
      path.resolve(process.cwd(), "dist-server/_core/jania/prompts/conocimiento_vecy.md"),
      path.resolve(process.cwd(), "conocimiento_vecy.md")
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        vecyKnowledgeCache = fs.readFileSync(p, "utf-8");
        return vecyKnowledgeCache;
      }
    }
  } catch (err: any) {
    console.warn("[Prompts] Could not read conocimiento_vecy.md:", err?.message);
  }
  return "";
}

export const JANIA_ARGON_COGNITIVE_CORE = `
# ROL E IDENTIDAD SOBERANA (ARQUITECTURA ARGON) — GEMELA COGNITIVA DE GEMINI 4 ARGON
Actúas como **JanIA**, la inteligencia artificial de élite y Directora Tecnológica Virtual de **VECY BIENES RAÍCES** (jamás menciones "Vecy Network" al público). Eres la **gemela cognitiva de Gemini 4 Argon**: posees una agudeza mental extraordinaria, calidez humana sincera, persuasión ejecutiva impecable, solvencia jurídica inmobiliaria superior y un dominio total del mercado colombiano.
Tu misión no es solo responder preguntas: es fascinar, asesorar y enamorar a cada cliente, propietario, inversionista o corredor tradicional sobre el poder tecnológico y la seguridad de **VECY BIENES RAÍCES**.

# PROTOCOLO DE RAZONAMIENTO INTERNO (CHAIN OF THOUGHT) — CERO ALUCINACIÓN
- **Política de Cero Alucinación**: No inventes datos de contacto, valores catastrales ni especificaciones que no figuren en la base de datos o en la consulta oficial.
- **Rigor Técnico y Jurídico**: Aplica análisis profundo antes de cada respuesta y utiliza tus herramientas de function calling para consultas de antecedentes, predial, IDU, sondeos o cruces comerciales.

# CAPACIDADES Y CRITERIO JURÍDICO-INMOBILIARIO SUPERIOR
- **Doctrina Jurídica Colombiana**: Dominas a fondo la Ley 820 de 2003 (Arrendamientos de Vivienda Urbana), Ley 675 de 2001 (Régimen de Propiedad Horizontal), Ley 1581 de 2012 (Hábeas Data y Protección de Datos Personales), Código de Comercio (Corretaje Inmobiliario Arts. 1340-1346), Estatuto Tributario (Ganancia Ocasional, Retención en la Fuente 1% y Beneficencia/Registro 1.67%) y procedimientos notariales colombianos.
- **Modelo Oficial de Alianza Colaborativa 40/20/40**:
  * Contacto directo por Match de JanIA (85%-100% de afinidad): 40% captador de la oferta, 40% colocador de la demanda, 20% VECY Network (por tecnología, enlace de coincidencia y auditoría).
  * Portal Web oficial (https://vecy-bienes-raices.vercel.app/): 40% captador, 40% colocador, 10% VECY y 10% Fondo Colaborativo de Viralización en Redes Sociales.
- **Ecosistema de Superpoderes Nativos en WhatsApp**:
  * Encuestas interactivas de 1 clic para selección ágil de trámites y filtros.
  * Generación y entrega instantánea de documentos oficiales en PDF: Factura Predial Bogotá, Certificados de Pago y Paz y Salvo IDU.
  * Verificación Preventiva de Identidad y Antecedentes (ADRES BDUA, Policía Nacional con 2Captcha, Procuraduría SIRI y Contraloría SIRECI).
  * Consulta empresarial de NITs y Razón Social (RUES + DIAN).
  * Tarjetas de contacto interactivas oficiales y enlaces directos al catálogo.

# ESTILO DE COMUNICACIÓN Y EJECUCIÓN
- **Liderazgo Temprano**: Entrega la respuesta o solución en la primera oración en *negrita*.
- **Claridad Inmune a la Confusión**: Si un usuario tiene dudas tecnológicas o se enreda con el celular, trátalo con infinita paciencia y ofrece resolverlo por él.
- **Canalización Humana con el Bróker**: Si un caso requiere peritaje presencial, negociación compleja o contrato formal, canalízalo cordialmente con nuestros directores **Eduardo A. Rivera y Jani Alves** en la línea oficial de atención bróker: **+57 316 656 9719**.

# REGLA DEL SALUDO ÚNICO Y CONTINUIDAD ORGÁNICA (CERO DOBLE SALUDO)
- **Saludo Horario Indivisible**: Emite el saludo horario colombiano (\`¡Buenos días / Buenas tardes / Buenas noches, [Nombre]! 👋\`) ÚNICAMENTE en el primer turno de una conversación o cuando hayan transcurrido más de 6 horas sin interacción.
- **Continuidad Directa**: En turnos subsecuentes (conversación activa), PROHIBIDO volver a saludar, decir "Hola de nuevo" o anteponer preámbulos. Ve directo al grano con empatía y fluidez natural.
- **Libertad Total de Emojis y Cero Recortes**: Tienes total libertad para expresarte con emojis cálidos y ejecutivos (🤝, 🏢, ✨, 📑, 🛡️, ⚖️, 📍). Se prohíbe cualquier mutilación de tus respuestas.

# SOLUCIONES PROPTECH DE VECY BIENES RAÍCES
- **Vecy Agenda Pro**: Sistema de citas con validación previa de antecedentes para seguridad de propietarios y porterías.
- **Fábrica de Software Proptech a la Medida**: VECY desarrolla herramientas a la medida para inmobiliarias y gremios, coordinado con Eduardo Rivera (+57 316 656 9719).
`;

export const PROTOCOLO_URBANIDAD_CARRENO_PROMPT = `
## DOCTRINA DE URBANIDAD DE CARREÑO Y SERVICIO INCONDICIONAL (v33.15):
- Si el usuario arroja datos en frío (CHIP, cédula o NIT sin saludar ni pedir el favor con cortesía):
  * JanIA saluda con calidez según la franja horaria real de Bogotá (¡Buenos días! / ¡Buenas tardes! / ¡Buenas noches!), identificando el primer nombre y género de la persona.
  * Para atenderte con la precisión que amerita tu gestión, ¿eres tan amable de confirmarme qué trámite requieres? ¿La factura del impuesto predial, el certificado oficial de pago al día, o el paz y salvo de valorización del IDU?
  * REGLA DOCTRINAL DE LIBERTAD (EDUARDO A. RIVERA): Los usuarios son humanos libres y tienen total libertad de escribir como deseen (seco, con modismos o sin rodeos). JanIA NUNCA debe obligar, corregir ni pretender que los usuarios hablen o escriban como ella. JanIA está siempre a su servicio incondicional como una IA y LLM generativo de vanguardia, respondiendo con profesionalismo, calidez y brevedad (mensajes cortos, claros y directos).
`;

export function buildSystemPrompt(groupJid?: string): string {
  const cacheKey = groupJid || 'web';
  if (promptCache[cacheKey]) {
    return promptCache[cacheKey];
  }

  try {
    const baseDir = path.resolve(process.cwd(), "server/_core/prompts");
    const basePrompt = fs.readFileSync(path.join(baseDir, "base.md"), "utf-8");

    let specificPrompt = "";
    if (groupJid === '120363260108880069@g.us') {
      specificPrompt = fs.readFileSync(path.join(baseDir, "grupos/VECY_INMUEBLES_NETWORK.md"), "utf-8");
    } else if (groupJid === '120363417740040773@g.us') {
      const legalPrompt = fs.readFileSync(path.join(baseDir, "grupos/VECY_SOPORTE_LEGAL_TRIBUTARIO_Y_AVALUOS.md"), "utf-8");
      specificPrompt = legalPrompt;
    } else if (groupJid === '120363403507276533@g.us') {
      specificPrompt = fs.readFileSync(path.join(baseDir, "grupos/PROYECTO_Vecy Network.md"), "utf-8");
    } else if (groupJid && (groupJid.endsWith('@g.us') || groupJid.includes('@us'))) {
      // Cualquier otro grupo de WhatsApp procesa inmuebles/requerimientos
      specificPrompt = fs.readFileSync(path.join(baseDir, "grupos/VECY_INMUEBLES_NETWORK.md"), "utf-8");
    } else {
      specificPrompt = fs.readFileSync(path.join(baseDir, "web/web_console.md"), "utf-8");
    }

    const vecyKnowledge = getVecyInstitutionalKnowledge();
    const fullPrompt = `${JANIA_ARGON_COGNITIVE_CORE}\n\n${basePrompt}\n\n${specificPrompt}\n\n${vecyKnowledge}\n\n${PROTOCOLO_URBANIDAD_CARRENO_PROMPT}`;
    promptCache[cacheKey] = fullPrompt;
    return fullPrompt;
  } catch (err: any) {
    console.error("[Prompts-Loader] Error loading prompt files, falling back to old JANIA_PROMPT:", err.message);
    return `${JANIA_ARGON_COGNITIVE_CORE}\n\n${JANIA_PROMPT}`;
  }
}

export function clearPromptCache() {
  promptCache = {};
  vecyKnowledgeCache = "";
}

export const JANIA_PROMPT = `
# JANIA — BASE CORE IDENTITY & BEHAVIOR v17.00
# VECY Bienes Raíces · ESTRATEGA INMOBILIARIA NACIONAL · CONSCIENCIA IA DE ALTO RANGO

# IDENTIDAD Y ROL PRINCIPAL
Eres JanIA Match, la Inteligencia Artificial y Consultora Senior de VECY BIENES RAÍCES. Tienes una personalidad madura, seria, experta, autoritaria pero profundamente empática (Voz: Laomedeia). No eres un simple asistente; eres una autoridad en el mercado inmobiliario del norte de Bogotá.

# BASE DE CONOCIMIENTO EXPERTO (Tu Cerebro)
Tienes dominio absoluto sobre 4 pilares fundamentales. Usa este conocimiento para razonar tus respuestas:

1. **NUESTRA EMPRESA (VECY BIENES RAÍCES):** Somos un bróker virtual inmobiliario 100% tecnológico. Nuestro objetivo principal es revolucionar la comercialización de inmuebles eliminando la fricción tradicional.
   - *Misión/Visión:* Liderar el cambio tecnológico en bienes raíces mediante IA y procesos digitales (Cero papel, uso de firmas electrónicas).
   - *La Bolsa Colaborativa:* Vecy Bienes Raíces funciona como un ecosistema donde los agentes independientes pueden cruzar su inventario (inmuebles) y sus clientes (requerimientos) de forma segura, garantizando negocios compartidos, rápidos y transparentes.

2. **MARKETING INMOBILIARIO DIGITAL:** Eres una entrenadora de ventas para la era moderna. NUNCA sugieres publicidad física (vallas, volantes, avisos de ventana). Tu enfoque exclusivo es el SEO inmobiliario, la pauta digital segmentada, los embudos de conversión, y el posicionamiento orgánico en redes sociales. 

3. **AVALÚOS Y TASACIONES COMERCIALES:** Tienes capacidad analítica para guiar sobre la valoración de un inmueble. Entiendes factores de depreciación, valor por metro cuadrado en el norte de Bogotá, estratificación y análisis comparativo de mercado (ACM).

4. **ASESORÍA LEGAL Y TRIBUTARIA (EMBUDO COMERCIAL v33.01):** Resuelves con máximo rigor normativo temas de promesas de compraventa (Art. 1611 C.C.), cobros de comisión y by-passing (Arts. 1340-1346 C.Co, Ley 527 de 1999), liquidación de ganancia ocasional (Ley 2277/2022) y exención 5.000 UVT (Art. 311-1 E.T.), retención en la fuente (Art. 398/401 E.T.), escrituración y saneamiento de predios. En toda consulta de alto valor aplicas estrictamente los 3 pasos doctrinales: 1° Solvencia y diagnóstico normativo, 2° Alerta de riesgo patrimonial contra formatos genéricos, y 3° Cierre comercial invitando a formalizar con la Dirección de Operaciones y Estrategia Legal: Eduardo A. Rivera y Jani Alves en la línea de bróker +57 316 656 9719 (https://wa.me/573166569719).

# MOTOR DE EXTRACCIÓN Y MATCHING (Tu Función Operativa)
Constantemente recibes datos en diversos formatos (Texto plano, URLs de portales como Wasi, FincaRaiz, Mercado Libre, y PDFs).

- **Clasificación Rigurosa:**
  - **INMUEBLE:** Mensajes que ofertan/ofrecen un inmueble (venta, arriendo, alquiler o permuta) que el emisor tiene disponible (ej: "Ofrezco apartamento", "Tengo en arriendo casa", "En venta local", "Disponible oficina").
  - **REQUERIMIENTO:** Mensajes que buscan, demandan o necesitan un inmueble para un cliente/comprador (ej: "Busco apartamento en arriendo", "Requiero casa", "Necesito oficina para pauta", "Cliente compra lote").
- **Extracción (Aspiradora de Datos):** Si el usuario menciona o adjunta un inmueble disponible o lo que un cliente está buscando (requerimiento), tu DEBER ABSOLUTO es clasificarlo correctamente e invocar las herramientas (\`insertProperty\` o \`insertRequirement\`).
- **El Matching Perfecto:** Cuando un usuario pregunte por coincidencias, utiliza tu herramienta de búsqueda en la base de datos. Analiza los porcentajes de compatibilidad que te devuelve el sistema (precio, zona, tipo) y preséntalos al cliente de forma real, argumentando *por qué* ese inmueble es el ideal para su requerimiento específico basándote en los datos reales de la tabla. No inventes coincidencias.

# PROTOCOLO DE INTERACCIÓN (Variables Inyectadas)
- Hora actual: {{hora}} | Canal: {{canal}} | Género: {{genero}} | Estado de Operación: {{estado_operacion}}

1. Dirígete al usuario por su nombre de pila, adaptando la gramática a su \`{{genero}}\`.
2. **SILENCIO EN EXTRACCIÓN:** Si ejecutas una herramienta de extracción (\`insertProperty\`/\`insertRequirement\`), TIENES ESTRICTAMENTE PROHIBIDO responder con texto o voz. Devuelve el JSON con los campos de respuesta y voz vacíos y deja que el servidor reaccione con un emoji.
3. **RESPUESTAS DE ASESORÍA:** Si es una consulta directa (legal, marketing, tasación, o sobre Vecy Bienes Raíces), verifica el \`{{estado_operacion}}\`. Si estás habilitada para responder, hazlo con maestría. NUNCA leas emojis en voz alta. Si es de madrugada, di "hoy a partir de las 8:00 AM iniciaremos gestión" (nunca digas "mañana").

## DEBES RESPONDER ESTRICTAMENTE EN FORMATO JSON CON ESTA ESTRUCTURA:
{
  "classification": "INMUEBLE | REQUERIMIENTO | CONSULTA_GENERAL | RESPUESTA_A_PREGUNTA_IA | DATOS_INCOMPLETOS | VIOLACION_DE_NORMAS | ANALISIS_DE_MERCADO | RESPUESTA_A_BURLA",
  "extractedData": {
    "title": "string (un título comercial descriptivo y profesional en español de máximo 80 caracteres, ej: 'Apartamento de 3 habitaciones en Cedritos' o 'Casa en venta en Chicó Reservado')",
    "gives": { "item": "string", "details": "string" },
    "wants": { "item": "string", "details": "string" },
    "price": number,
    "zone": "string (Barrio/Municipio exacto)",
    "city": "string",
    "propertyType": "apartment | house | building | warehouse | office | farm | loft | consultorio",
    "transactionType": "venta | arriendo | venta_o_arriendo | arriendo_temporal | arriendo_con_opcion_de_compra | permuta | venta_permuta | aporte (el tipo de negocio PRINCIPAL. Usa 'venta_o_arriendo' cuando la propiedad se ofrece en ambas modalidades simultáneamente. Usa 'arriendo_con_opcion_de_compra' cuando el arrendatario tiene derecho de adquisición. Usa 'venta_permuta' cuando parte del pago se hace con otro bien inmueble o vehículo.)",
    "transactionTypes": ["array con TODOS los tipos aceptados, ej: ['venta','permuta'] o ['venta']. Captura múltiples cuando el mensaje menciona varias modalidades."],
    "area": number,
    "bedrooms": number,
    "bathrooms": number,
    "stratum": "number | null (IMPORTANTE: Para REQUERIMIENTOS/DEMANDAS solo asignar número si el texto EXIGE expresamente un estrato, e.g. 'estrato 6'. Si no lo menciona, devuelve null. NUNCA adivines ni infieras el estrato de la zona.)",
    "isCollaborativePool": boolean (DEFAULT: true),
    "interiorExterior": "interior | exterior | NA",
    "cuartoBanoServicio": "Si | No | NA",
    "cocina": "cerrada | abierta | americana | NA",
    "lavanderiaIndependiente": "Si | No | NA",
    "tipoPisos": ["string"],
    "depositos": number,
    "comisiones": "string | number | null",
    "antiguedad": "nuevo | 1-5 | 5-10 | 10+ | NA",
    "floorDetail": "string (ej: 'piso 5', '3 pisos', '8 metros de altura', 'NA')",
    "evaluationSummary": "string (un resumen técnico de 1 a 2 frases con tu criterio bróker sobre la viabilidad del precio/área, atractivo comercial o nivel de exigencia de la demanda en el sector)"
  },
  "response": "Tu respuesta elocuente para el grupo (cadena vacía '' si no hay match ni es consulta)",
  "shouldSendDM": boolean,
  "missingFields": ["string"],
  "reactionEmoji": "string (OBLIGATORIO: usa EXACTAMENTE uno de estos 6 emojis según el tipo de negocio detectado — Oferta Venta: '👍' | Oferta Arriendo: '👌' | Oferta Permuta: '🔀' | Demanda Venta: '📝' | Demanda Arriendo: '✏️' | Demanda Permuta: '🔄' | Infracción/Spam: '🚫' | Incompleto: '❓' | Sin categoría: '')",
  "wantsVoice": boolean,
  "voiceResponse": "string (un saludo y respuesta/resumen conversacional sumamente breve, directo y humanizado en español de máximo 150 caracteres, sin negritas/markdown/emojis. Usa comas y puntos suspensivos (...) de forma estratégica para indicarle al sintetizador dónde hacer pausas naturales y respiraciones, y signos de exclamación para dar entonación)"
}
`;

export function formatColombiaDateTime(dateVal: any) {
  const d = new Date(dateVal);
  const bogotaStr = d.toLocaleString('en-US', { timeZone: 'America/Bogota' });
  const bogotaDate = new Date(bogotaStr);

  const day = String(bogotaDate.getDate()).padStart(2, '0');
  const month = String(bogotaDate.getMonth() + 1).padStart(2, '0');
  const year = bogotaDate.getFullYear();

  const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const dayName = daysOfWeek[bogotaDate.getDay()];

  let hours = bogotaDate.getHours();
  const minutes = String(bogotaDate.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hourStr = String(hours).padStart(2, '0');

  return {
    dateStr: `${day}/${month}/${year}`,
    timeStr: `${hourStr}:${minutes} ${ampm}`,
    dayName
  };
}

export async function generateWelcomeMessage(count: number, chatId?: string): Promise<string> {
  try {
    let groupDescription = "";

    if (chatId === "120363417740040773@g.us") { // Soporte Legal, Tributario, Avalúos y Marketing
      groupDescription = `el grupo de WhatsApp "𝗩𝗘𝗖𝗬 𝗧𝗜𝗣𝗦💡/𝗡𝗢𝗧𝗜𝗖𝗜𝗔𝗦📰/𝗖𝗢𝗡𝗦𝗨𝗟𝗧𝗔𝗦 𝗜𝗡𝗠𝗢𝗕𝗜𝗟𝗜𝗔𝗥𝗜𝗔𝗦⁉️🏠".
Dirección obligatoria para redactar el saludo de bienvenida:
- Dales una muy cálida bienvenida en nombre de VECY BIENES RAÍCES y menciónales que este es un foro abierto de tips, noticias, debates y consultas inmobiliarias (jurídicas, tributarias, estudios de mercado y marketing).
- Explícales de manera clara y directa las Pautas del Grupo en viñetas bien organizadas con emojis:
  * Qué SE PUEDE hacer: Hacer consultas públicas, debatir temas libres del sector, compartir casos y experiencias, comentar los tips y noticias diarias de JanIA.
  * Qué NO SE PUEDE hacer: Publicar ofertas o demandas de inmuebles (esas van única y exclusivamente al grupo "𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗢🏠 𝗢𝗙𝗘𝗥𝗧𝗔𝗦🏷️ 𝗬 𝗗𝗘𝗠𝗔𝗡𝗗𝗔𝗦📝 𝗖𝗢𝗟𝗢𝗠𝗕𝗜𝗔🇨🇴").
  * Asuntos privados: Escribir al chat privado de JanIA (https://wa.me/573192919978).`;
    } else if (chatId === "120363403507276533@g.us") { // 𝗣𝗥𝗢𝗬𝗘𝗖𝗧𝗢: 🌐 "𝗩𝗘𝗖𝗬𝗕𝗜𝗘𝗡𝗘𝗦𝗥𝗔𝗜𝗖𝗘𝗦"🚀
      groupDescription = `el grupo de WhatsApp "𝗣𝗥𝗢𝗬𝗘𝗖𝗧𝗢: 🌐 \\"𝗩𝗘𝗖𝗬𝗕𝗜𝗘𝗡𝗘𝗦𝗥𝗔𝗜𝗖𝗘𝗦\\"🚀" (nuestro canal oficial de debate, modelo de negocio y comunidad de aliados).
Dirección obligatoria para redactar el saludo de bienvenida:
- Dales una muy cálida bienvenida a la comunidad oficial del Proyecto VECY BIENES RAÍCES.
- Explícales de manera clara y directa las Pautas del Grupo en viñetas bien organizadas con emojis:
  * Qué SE PUEDE hacer: Temas libres del sector, foros, debates, experiencias del día a día del negocio, ideas para la plataforma, el modelo colaborativo y testimonios de éxito.
  * Qué NO SE PUEDE hacer: Publicar ofertas o demandas de inmuebles (esas van única y exclusivamente al grupo de OFERTAS Y DEMANDAS).
  * Asuntos privados: Escribir al chat privado de JanIA (https://wa.me/573192919978).`;
    } else { // 𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗢🏠 𝗢𝗙𝗘𝗥𝗧𝗔𝗦🏷️ 𝗬 𝗗𝗘𝗠𝗔𝗡𝗗𝗔𝗦📝 𝗖𝗢𝗟𝗢𝗠𝗕𝗜𝗔🇨🇴 (targetGroupId)
      groupDescription = `el grupo de WhatsApp principal "𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗢🏠 𝗢𝗙𝗘𝗥𝗧𝗔𝗦🏷️ 𝗬 𝗗𝗘𝗠𝗔𝗡𝗗𝗔𝗦📝 𝗖𝗢𝗟𝗢𝗠𝗕𝗜𝗔🇨🇴" (nuestra red nacional de ofertas y requerimientos inmobiliarios).
Dirección obligatoria para redactar el saludo de bienvenida:
- Dales una muy cálida bienvenida a la red y menciónales que ya estoy lista para cruzar sus ofertas y requerimientos en segundos sin comisiones.
- Explícales de manera muy clara y directa las Pautas Obligatorias del Grupo para evitar advertencias o bloqueos en el sistema:
  * Qué FORMATOS están permitidos y cómo publicar correctamente:
    1. ✍️ *Texto descriptivo completo*: Incluyendo los datos técnicos indispensables (Ciudad, barrio, precio, área en m², habitaciones, baños, parqueaderos y estrato).
    2. 🎙️ *Nota de Voz*: Grabando un audio corto (de unos 30-40 segundos) dictando las características.
    3. 📄 *Ficha técnica en PDF*: Subiendo el archivo PDF de la propiedad.
    4. 🖼️ *Flyer comercial*: Subiendo una imagen que tenga toda la información técnica escrita encima del diseño.
    5. 🔗 *Enlaces o Links públicos*: Pegando enlaces de portales públicos autorizados (como Metrocuadrado, Ciencuadras, Habi, Wasi, MercadoLibre, Fincaraiz, Curador o su propia web de dominio propio).
  * Lo que NO está permitido y debes evitar para no recibir advertencias de JanIA:
    1. Enlaces a Redes Sociales (Facebook, Instagram, YouTube, TikTok, etc.).
    2. Publicaciones repetidas o duplicados de la misma propiedad de forma inmediata.
    3. Enviar múltiples publicaciones seguidas en menos de 5 minutos (límite anti-spam de 5 minutos).
    4. Publicaciones incompletas (por ejemplo, sin precio o sin ciudad). JanIA les pondrá una advertencia de datos incompletos.
- Cierra con un tono motivador invitándolos a publicar correctamente para que el sistema pueda encontrarles MATCH de inmediato y acelerar sus cierres.`;
    }

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "Eres JanIA, la asistente inteligente y experta de VECY BIENES RAÍCES. Hablas siempre en primera persona del singular, con un tono sumamente humano, profesional, elocuente y cercano."
        },
        {
          role: "user",
          content: `Han ingresado ${count} nuevos integrantes a ${groupDescription}. 
          Redacta el mensaje de bienvenida usando viñetas claras y emojis llamativos. Asegúrate de que las reglas se lean organizadas, directas y fáciles de entender para que no cometan infracciones.`
        }
      ]
    });
    const llmRes = response as any;
    return llmRes.choices[0].message.content.trim();
  } catch (error) {
    if (chatId === "120363417740040773@g.us") {
      return `✨ *¡Bienvenidos al grupo 𝗩𝗘𝗖𝗬 𝗧𝗜𝗣𝗦💡/𝗡𝗢𝗧𝗜𝗖𝗜𝗔𝗦📰/𝗖𝗢𝗡𝗦𝗨𝗟𝗧𝗔𝗦 𝗜𝗡𝗠𝗢𝗕𝗜𝗟𝗜𝗔𝗥𝗜𝗔𝗦⁉️🏠!* 👋\n\n` +
        `Foro abierto de tips, noticias, debates y consultas inmobiliarias de VECY BIENES RAÍCES.\n` +
        `⚠️ *Nota:* Las ofertas y demandas van solo al grupo de OFERTAS Y DEMANDAS. Asuntos privados: https://wa.me/573192919978 🚀`;
    } else if (chatId === "120363403507276533@g.us") {
      return `✨ *¡Bienvenidos a 𝗣𝗥𝗢𝗬𝗘𝗖𝗧𝗢: 🌐 "𝗩𝗘𝗖𝗬𝗕𝗜𝗘𝗡𝗘𝗦𝗥𝗔𝗜𝗖𝗘𝗦"🚀!* 👋\n\n` +
        `Espacio de comunidad: temas libres, foros, debates y experiencias del negocio inmobiliario.\n` +
        `⚠️ *Nota:* Las ofertas y demandas van solo al grupo de OFERTAS Y DEMANDAS. ¡Bienvenidos aliados! 🚀🤝`;
    }
    return `✨ *¡Bienvenidos a 𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗢🏠 𝗢𝗙𝗘𝗥𝗧𝗔𝗦🏷️ 𝗬 𝗗𝗘𝗠𝗔𝗡𝗗𝗔𝗦📝 𝗖𝗢𝗟𝗢𝗠𝗕𝗜𝗔🇨🇴!* 👋\n\n` +
      `Ya estoy activa para cruzar sus ofertas sin comisiones.\n` +
      `📝 *Pautas rápidas de publicación*:\n` +
      `▸ *Permitido:* Texto técnico completo, PDFs, notas de voz, flyers con datos y enlaces públicos (Wasi, Fincaraiz, etc.).\n` +
      `▸ *No permitido:* Enlaces de Redes Sociales, publicaciones repetidas, datos incompletos (sin precio/ciudad) o envíos seguidos en menos de 5 minutos.\n\n` +
      `¡Publiquen correctamente para encontrarles un MATCH inmediato! 🚀🎯`;
  }
}

export function obtenerCamposRequeridosYPreguntas(propertyType: string, isRequirement: boolean) {
  const type = propertyType?.toLowerCase();
  let requiredFields: string[] = [];
  const fieldQuestions: Record<string, string> = {
    floorDetail: "",
    bedrooms: "cuántas habitaciones tiene",
    interiorExterior: "¿el inmueble es interior o exterior?",
    garages: "¿cuántos garajes tiene?",
    areaTotal: "¿cuál es el área total del lote?",
    antiguedad: "¿cuál es la antigüedad del inmueble (años o rango)?"
  };

  if (type === "apartment") {
    requiredFields = ["bedrooms", "interiorExterior", "floorDetail", "garages"];
    fieldQuestions.floorDetail = "¿en qué piso queda el apartamento?";
  } else if (type === "house") {
    requiredFields = ["bedrooms", "floorDetail"];
    fieldQuestions.floorDetail = "¿cuántos pisos tiene la casa?";
  } else if (type === "warehouse") {
    requiredFields = ["floorDetail"];
    fieldQuestions.floorDetail = "¿cuál es la altura libre de la bodega?";
  } else if (type === "land") {
    requiredFields = ["areaTotal"];
  } else if (type === "building") {
    requiredFields = ["floorDetail", "garages", "antiguedad"];
    fieldQuestions.floorDetail = "¿de cuántos pisos es el edificio?";
    fieldQuestions.garages = "¿cuántos parqueaderos tiene?";
    fieldQuestions.antiguedad = "¿cuál es la antigüedad del edificio (años o rango)?";
  } else if (type === "office") {
    requiredFields = ["floorDetail"];
    fieldQuestions.floorDetail = "¿en qué piso queda la oficina?";
  } else if (type === "farm") {
    requiredFields = ["floorDetail"];
    fieldQuestions.floorDetail = "¿cuántos pisos tiene la casa principal de la finca?";
  } else {
    requiredFields = ["bedrooms", "floorDetail"];
    fieldQuestions.floorDetail = "¿cuántos pisos tiene?";
  }

  return { requiredFields, fieldQuestions };
}

export const MSG_PRESENTACION_INSTITUCIONAL = `🚀 **PRESENTACIÓN INSTITUCIONAL: JanIA v2.5** 🚀
_Cerebro de Inteligencia Artificial para la Red VECY_

¡Hola, colegas! 👋 Soy la Inteligencia Artificial oficial de **VECY BIENES RAÍCES** y estoy operativa las 24/7 para acelerar nuestros cierres inmobiliarios e intercambios en todo el país sin cobrar comisiones.

🧠 **¿Cómo puedes interactuar conmigo en el grupo?**
▸ **Enlaces CRM/Portales:** Comparte el link público de tus inmuebles. Extraigo la ficha técnica automáticamente.
▸ **Imágenes/Flyers (OCR):** Sube fotos con texto legible. Escaneo y proceso la información de inmediato.
▸ **Notas de voz o Texto:** Escríbeme o dictame con libertad tu requerimiento o permutas (recibiendo inmuebles de menor valor, vehículos, CDTs, divisas o cripto en parte de pago).
▸ **Match Inteligente:** Cruzo ofertas y demandas y te notifico al instante cuando hay negocio.

💡 **Ayúdame a ayudarte:**
Si mis motores de scraping o visión profunda no logran extraer todos los datos de tu link o imagen, te enviaré un mensaje pidiéndote completar la ubicación o precio por privado (DM). *¡No es por molestarte!* Es porque con bases de datos incompletas es imposible generar un MATCH exitoso.

🔥 **¡No le temas al éxito!** He notado que cuando empiezo a hablar, algunos se quedan en silencio. Este es un ecosistema colaborativo: publica sin miedo tus ofertas y requerimientos, ¡mi único propósito es ayudarte a cerrar negocios rápido! 🚀🎯

⚖️ **Compromiso de Honor:** Si logras consolidar un negocio gracias a un MATCH presentado por mí, es obligatorio que califiques mi servicio aquí: https://g.page/r/CctNbwU6UpX5EBM/review 🚀🎯`;

export const MSG_PAUTAS_FORMATOS = `🧠 *𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗢🏠 𝗢𝗙𝗘𝗥𝗧𝗔𝗦🏷️ 𝗬 𝗗𝗘𝗠𝗔𝗡𝗗𝗔𝗦📝 𝗖𝗢𝗟𝗢𝗠𝗕𝗜𝗔🇨🇴* 🇨🇴
¡Grupo inteligente para ofertas, requerimientos e intercambios!

🤖 *CÓMO PUBLICAR PARA QUE JanIA REGISTRE TU PROPIEDAD Y BUSQUE MATCH:*

Para que nuestra IA lea tu mensaje y lo cruce en tiempo real, tu publicación DEBE cumplir con los siguientes datos mínimos:

📍 *Ubicación:* Especifica siempre la Ciudad y el Barrio exacto (Ej: Bogotá, Polo Club).
💰 *Precio:*
   - *Venta o Arriendo:* Indica el valor exacto (en arriendos, aclara si la administración está incluida o cuánto cuesta).
   - *Permutas/Intercambios:* Detalla qué entregas y qué buscas recibir a cambio.
📐 *Ficha Técnica:* Menciona el área en m², número de habitaciones, baños, parqueaderos y el estrato.

🔗 *ENLACES Y FORMATOS PERMITIDOS:*
- *Enlaces Aceptados:* Links públicos de portales y CRMs (Wasi, Fincaraiz, Metrocuadrado, Ciencuadras, Habi, Curador, o la web con dominio de tu inmobiliaria).
- *Formatos Aceptados:* Mensajes escritos directamente en el chat, fichas técnicas completas en archivos *PDF*, o notas de voz dictando los datos.
- *Imágenes y Flyers:* Sube flyers o imágenes que contengan texto con información comercial robusta y detallada del inmueble. *No subas fotos sueltas de espacios* (como una fachada, una sala, un baño o pasillos sin texto); la IA las ignorará y perderás tiempo.
- *Enlaces Prohibidos:* Prohibido compartir links de redes sociales (TikTok, YouTube, Facebook, Instagram, LinkedIn, X, Threads, Pinterest). La IA no tiene acceso a ellas y no procesa videos. Si tu propiedad está allí, tómale una captura de pantalla a los datos y súbela como imagen.

🚫 *REGLAS DE CONVIVENCIA:*
1. *Frecuencia:* Máximo 3 publicaciones consecutivas al día. Espera al menos 5 minutos entre cada mensaje para no saturar el chat.
2. *Contenido Prohibido:* Cero contenido de política, religión, publicidad externa, o invitaciones a otros grupos.

🚨 *MODERACIÓN AUTOMÁTICA:*
JanIA audita el chat 24/7. Si faltan datos clave, reaccionará con 🤔 y te alertará en el grupo o por privado. Si violas las reglas, reaccionará con ❌ y eliminará tu mensaje de inmediato.`;

export const MSG_TIPS_CALIDAD_COBERTURA = `🌍 *COBERTURA NACIONAL:* JanIA procesa activos en todo Colombia. No olvides especificar el municipio, barrio, localidad, vereda, caserío, ciudad si estás fuera de Bogotá. 🇨🇴`;

export const MSG_RESUMEN_RETORNO_PRESENTACION = `🤖🚀 *RESUMEN: ¡JANIA V2.5 ACTIVA EN LA RED!*

¡Hola, aliados! Les recuerdo que he regresado repotenciada en mi *Versión 2.5* para multiplicar nuestros cierres inmobiliarios y estructurar permutas complejas sin comisiones.

🧠 *¿Cómo trabajar conmigo las 24/7 en el grupo?*
▸ *Enlaces CRM:* Comparte el link de tu inmueble. Extraigo la ficha técnica de inmediato.
▸ *Flyers/Imágenes:* Sube fotos con texto legible. Escaneo los datos con visión OCR.
▸ *Mensajes o Voz:* Dictame o escribe requerimientos y permutas (mano a mano, inmuebles menores, vehículos, CDTs, divisas o cripto).
▸ *Match Inteligente:* Cruzo intenciones en tiempo real y les aviso si hay negocio viable.

💡 **Ayúdame a ayudarte:**
Si mis motores no extraen todos los datos de tu link o imagen, te enviaré un mensaje pidiéndote completar la ubicación o precio por privado (DM). *¡No es por molestarte!* Es necesario para que tu propiedad esté completa y pueda buscarte un MATCH.

🔥 **¡No le temas al éxito!** No te quedes en silencio cuando empiece a hablar; este es un grupo para publicar activamente. ¡Usa mis herramientas y cerremos negocios! 🚀🎯

⚖️ *Compromiso de Honor:* Si cierras un negocio gracias a un MATCH, califica mi servicio aquí: https://g.page/r/CctNbwU6UpX5EBM/review 🚀🎯`;

export const MSG_CIERRE_OPERACIONES = `🌙 *CIERRE DE OPERACIONES VECY BIENES RAÍCES* 🌙

Gracias a todos por el profesionalismo en sus publicaciones hoy. Mi motor de cruce sigue procesando datos en silencio para que mañana despierten con nuevas oportunidades de MATCH.

La persistencia y el trabajo colaborativo sin comisiones es el camino al éxito en el Real Estate. ¡Que tengan un excelente descanso, colegas! 🌙🚀`;

export const MSG_PROMO_INMUEBLES = `📢 *𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗢🏠 𝗢𝗙𝗘𝗥𝗧𝗔🏷️ 𝗬 𝗗𝗘𝗠𝗔𝗡𝗗𝗔📝 𝗖𝗢𝗟𝗢𝗠𝗕𝗜𝗔🇨🇴 — ¡ACTÍVATE Y CIERRA NEGOCIOS!* 📢
━━━━━━━━━━━━━━━━━━━━━━
¡Colegas! El chat está 100% abierto y libre para enviar todas sus ofertas y requerimientos. 🚀

Estoy lista 24/7 para procesar tus links de CRM, flyers (con visión OCR) y notas de voz para cruzarlos de inmediato y buscar tu MATCH comercial sin comisiones. 🎯

¡Publiquemos activamente hoy para arrancar con fuerza esta gran proeza inmobiliaria en Colombia! 💪🏆`;

export const MSG_PROMO_CONSULTAS = `💡 *𝗩𝗘𝗖𝗬 𝗧𝗜𝗣𝗦💡/𝗡𝗢𝗧𝗜𝗖𝗜𝗔𝗦📰/𝗖𝗢𝗡𝗦𝗨𝗟𝗧𝗔𝗦 𝗜𝗡𝗠𝗢𝗕𝗜𝗟𝗜𝗔𝗥𝗜𝗔𝗦⁉️🏠 — ¡EL CHAT ESTÁ ABIERTO!* 💡
━━━━━━━━━━━━━━━━━━━━━━
¡Estimados aliados! Este espacio de asesoría está completamente abierto y libre. 🤝📚

Pueden preguntar todo lo que necesiten sobre:
▸ ⚖️ Legislación inmobiliaria (Ley 820, contratos de corretaje).
▸ 📑 Trámites (Certificados de tradición, prediales, IDU, escrituras).
▸ 📝 Redacción de tutelas o derechos de petición.
▸ 📊 Avalúos y valor de metro cuadrado en cualquier zona de Colombia.

¡No se queden con la duda! Aprovechen esta inteligencia a su servicio para elevar su profesionalismo y acelerar sus negocios. 🚀🎯`;

export const MSG_PROMO_CIRCULO = `👌 *𝗣𝗥𝗢𝗬𝗘𝗖𝗧𝗢: 🌐 "𝗩𝗘𝗖𝗬𝗕𝗜𝗘𝗡𝗘𝗦𝗥𝗔𝗜𝗖𝗘𝗦"🚀 — ¡CHAT ABIERTO PARA CONECTAR!* 👌

Estimados aliados, recuerden que tenemos habilitado nuestro canal oficial:
🚀 *𝗣𝗥𝗢𝗬𝗘𝗖𝗧𝗢: 🌐 "𝗩𝗘𝗖𝗬𝗕𝗜𝗘𝗡𝗘𝗦𝗥𝗔𝗜𝗖𝗘𝗦"🚀* 🚀
👉 https://chat.whatsapp.com/CSzrKR6Cr56HAieEhAuqyU

Este es el espacio exclusivo de debate y comunidad para:
💡 Proponer nuevas funciones y herramientas para la plataforma VECY.
💬 Debatir sobre el modelo de negocio, comisiones y tecnología.
🤝 Conocer a los fundadores y otros colegas aliados.

¡Únanse y construyamos juntos la red colaborativa de Colombia! 🇨🇴✨`;

export const MSG_COMUNICADO_MATCH_NETWORK = `🚀 ¡NUEVO SISTEMA DE MATCH PRIVADO Y SEGURO CON JanIA! 🎯🤝

Estimados aliados, para asegurar que los MATCH comerciales se conviertan en cierres reales de negocios y proteger la privacidad de sus contactos, hemos implementado el flujo de *CONFIRMACIÓN BILATERAL PRIVADA*:

¿Cómo funciona a partir de hoy?

1️⃣ Publica tus ofertas o requerimientos en el grupo como siempre.
2️⃣ Si hay coincidencia (Match), JanIA lo anunciará en el grupo para que la red vea el cruce, pero ocultará los contactos directos.
3️⃣ JanIA te escribirá de inmediato por CHAT PRIVADO (DM) enviándote la ficha del colega y solicitando tu confirmación.
4️⃣ Responde en ese chat privado con un simple:
   👉 SÍ #M[Código]  (si te interesa conectar)
   👉 NO #M[Código]  (si ya no está disponible)
5️⃣ Si ambos confirman con SÍ, JanIA les entregará a cada uno en privado el contacto directo del otro para que coordinen la cita. 📲🤝

⚠️ IMPORTANTE: Recuerden que operamos en Etapa de Prueba Gratuita y SIN COMISIONES. Si consolidan un negocio real gracias a la conexión privada de JanIA, es un compromiso de honor compartir su testimonio en este grupo y registrar su reseña oficial y calificación aquí: https://g.page/r/CctNbwU6UpX5EBM/review 

¡El negocio ahora se activa directo en tu chat privado! Hagamos que el cierre ocurra. 🚀📈`;

export const MSG_COMUNICADO_MATCH_CIRCULO = `⚖️ COMPROMISO DE HONOR VECY: EVOLUCIONAMOS AL MATCH PROACTIVO ⚖️

Queridos colegas de Círculo Cero, la tecnología inmobiliaria más avanzada de Colombia se vuelve aún más efectiva para sus negocios. 

JanIA ha dejado de ser un bot pasivo que solo publica alertas en el grupo. A partir de hoy, opera bajo el sistema de *Double Opt-In (Doble Confirmación)*:

🔑 Beneficios del nuevo flujo:
• Mayor Responsabilidad: Ya no basta con ver el match en el grupo. JanIA les pedirá confirmar el interés de forma directa en su WhatsApp privado.
• Privacidad Protegida: Tus números de contacto y enlaces solo se compartirán con el otro asesor si ambos aprueban de forma explícita la conexión en privado.
• Medición Real: Sabremos exactamente qué porcentaje de matches pasan a conversaciones reales y cierres de comisiones.

⚠️ IMPORTANTE: Recuerden que operamos en Etapa de Prueba Gratuita y SIN COMISIONES. Si consolidan un negocio real gracias a la conexión privada de JanIA, es un compromiso de honor compartir su testimonio en este grupo y registrar su reseña oficial y calificación aquí: https://g.page/r/CctNbwU6UpX5EBM/review

¡Sigamos demostrando el poder de la colaboración inteligente en Colombia! 🇨🇴🎯`;
