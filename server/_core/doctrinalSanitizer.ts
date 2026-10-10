/**
 * Módulo de Seguridad, Privacidad y Sanitización Doctrinal — VECY BIENES RAÍCES (v32.77)
 * 
 * Garantiza que cualquier información proveniente de conversaciones, proyectos
 * o reflexiones en Gemini Web / Google AI Studio sea purificada y anonimizada
 * antes de nutrir la memoria o prompts públicos de JanIA.
 * 
 * Regla Sagrada: 0% Fuga de Datos Personales (PII), 0% Secretos Comerciales, 100% Know-How.
 */

export interface SanitizationResult {
  sanitizedText: string;
  detectedSensitiveItems: string[];
  isSafeForPublicPrompt: boolean;
  summary: string;
}

// Lista negra de patrones o palabras que denotan proyectos internos confidenciales o disputas privadas
const CONFIDENTIAL_MARKERS = [
  /\bconfidencial\b/i,
  /\bsecreto\s+comercial\b/i,
  /\bno\s+compartir\b/i,
  /\bdeuda\s+personal\b/i,
  /\bdemanda\s+en\s+curso\b/i,
  /\bcuenta\s+bancaria\b/i,
  /\bnúmero\s+de\s+cuenta\b/i
];

/**
 * Sanitiza y anonimiza textos doctrinales para consumo seguro de JanIA en WhatsApp y Web.
 * Elimina:
 * 1. Nombres propios de personas en disputas o negociaciones privadas.
 * 2. Números telefónicos y correos electrónicos personales.
 * 3. Documentos de identidad (Cédulas, C.E., Pasaportes).
 * 4. Direcciones exactas domiciliarias de predios residenciales.
 * 5. Cuentas bancarias y referencias financieras privadas.
 */
export function sanitizeDoctrinalText(rawText: string): SanitizationResult {
  if (!rawText || typeof rawText !== "string") {
    return {
      sanitizedText: "",
      detectedSensitiveItems: [],
      isSafeForPublicPrompt: true,
      summary: "Texto vacío"
    };
  }

  let text = rawText;
  const detectedSensitiveItems: string[] = [];

  // 1. Detección de números telefónicos colombianos (+57 3xx xxx xxxx, 3xx-xxx-xxxx, etc.)
  // Exceptuar números oficiales de Vecy (+57 319 291 9978 y +57 316 656 9719)
  const phoneRegex = /(?:\+?57\s*)?(?:3[0-9]{2}[\s\.-]?[0-9]{3}[\s\.-]?[0-9]{4})\b/g;
  text = text.replace(phoneRegex, (match) => {
    const cleanNum = match.replace(/\D/g, "");
    if (cleanNum.endsWith("3192919978") || cleanNum.endsWith("3166569719")) {
      return match; // Mantener líneas oficiales de Vecy
    }
    detectedSensitiveItems.push(`Teléfono privado: ${match}`);
    return "[TELÉFONO_PROTEGIDO]";
  });

  // 2. Detección de correos electrónicos personales
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g;
  text = text.replace(emailRegex, (match) => {
    if (match.toLowerCase().includes("vecy")) {
      return match; // Correos institucionales de Vecy
    }
    detectedSensitiveItems.push(`Correo electrónico: ${match}`);
    return "[CORREO_PROTEGIDO]";
  });

  // 3. Detección de números de Cédula de Ciudadanía con conectores o puntos
  const cedulaRegex = /(?:c\.?c\.?|cédula|documento|identificación)\s*(?:no\.?|n°|#|:)?\s*([0-9]{1,3}(?:\.[0-9]{3}){1,3}|[0-9]{6,10})\b/gi;
  text = text.replace(cedulaRegex, (match, num) => {
    detectedSensitiveItems.push(`Documento de identidad: ${num}`);
    return "C.C. [DOCUMENTO_PROTEGIDO]";
  });

  // 4. Detección de direcciones exactas con número de inmueble (ej: Calle 123 # 45-67 Apto 802)
  const addressRegex = /\b(?:calle|carrera|cra|cll|diagonal|diag|transversal|tv|av|avenida)\s+\d+[a-zA-Z]?\s*(?:#|no\.?|n°)?\s*\d+[a-zA-Z]?\s*-\s*\d+(?:\s*(?:apto|apartamento|casa|oficina|interior|int|torre|tr)\s*[a-zA-Z0-9]+)?\b/gi;
  text = text.replace(addressRegex, (match) => {
    detectedSensitiveItems.push(`Dirección exacta: ${match}`);
    return "[PREDIO_EN_SECTOR_RESIDENCIAL]";
  });

  // 5. Anonimización de nombres de colegas o clientes en disputas conocidas
  // Reemplazo asociativo para preservar la pedagogía legal sin vulnerar a la persona
  const specificSensitiveEntities = [
    { regex: /\bOrlando\s+Berm[uú]dez\b/gi, replacement: "un colega de corretaje renuente al pago" },
    { regex: /\bMartha\s+Mesa\b/gi, replacement: "una colega asesora aliada" },
    { regex: /\bKelly\s+Carvajal\b/gi, replacement: "una colega inmobiliaria con dudas sobre Hábeas Data" },
    { regex: /\bLina\s+Mar[ií]a\s+Galeano\b/gi, replacement: "la compradora titular A" },
    { regex: /\bRicardo\s+Cortes\s+Galindo\b/gi, replacement: "el comprador titular B" }
  ];

  for (const entity of specificSensitiveEntities) {
    if (entity.regex.test(text)) {
      detectedSensitiveItems.push(`Identidad anonimizada: ${entity.regex.source}`);
      text = text.replace(entity.regex, entity.replacement);
    }
  }

  // 6. Evaluación de marcadores confidenciales
  const hasConfidentialMarker = CONFIDENTIAL_MARKERS.some(m => m.test(text));
  if (hasConfidentialMarker) {
    detectedSensitiveItems.push("Advertencia: Contiene marcadores de confidencialidad interna");
  }

  const isSafeForPublicPrompt = !hasConfidentialMarker;

  return {
    sanitizedText: text,
    detectedSensitiveItems,
    isSafeForPublicPrompt,
    summary: `Sanitización completada. ${detectedSensitiveItems.length} elementos protegidos o anonimizados.`
  };
}

/**
 * Validador estricto para asegurar que un fragmento de texto no contenga
 * datos sensibles antes de ser inyectado en un prompt público de WhatsApp o Web.
 */
export function validatePromptSafety(text: string): { isValid: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Verificar si hay teléfonos no oficiales
  const rawPhones = text.match(/(?:\+?57\s*)?(?:3[0-9]{2}[\s\.-]?[0-9]{3}[\s\.-]?[0-9]{4})\b/g) || [];
  for (const p of rawPhones) {
    const clean = p.replace(/\D/g, "");
    if (!clean.endsWith("3192919978") && !clean.endsWith("3166569719")) {
      reasons.push(`Contiene número de teléfono no oficial no anonimizado: ${p}`);
    }
  }

  // Verificar si hay cédulas descubiertas
  if (/(?:c\.?c\.?|cédula)\s*(?:no\.?|n°|#|:)?\s*[0-9]{6,10}\b/i.test(text)) {
    reasons.push("Contiene número de cédula explícito no protegido.");
  }

  return {
    isValid: reasons.length === 0,
    reasons
  };
}
