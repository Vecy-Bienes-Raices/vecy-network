/**
 * CHANNEL INTERACTIVE SERVICE — VECY BIENES RAÍCES (v33.53)
 * Módulo para orquestar la toma de decisiones (Tool Calling / Structured Output en la IA)
 * y la ejecución técnica (Baileys nativo + Puppeteer WhatsApp Web para canales/newsletters).
 *
 * Directriz de Eduardo A. Rivera:
 * "Para que JanIA decida de forma autónoma cuándo y cómo usar esas herramientas interactivas del canal de WhatsApp
 * (Encuesta, Cuestionario, Preguntar o Fotos y videos), debes estructurar el flujo en dos capas:
 * 1. Toma de decisiones (Tool Calling / Structured Output en la IA)
 * 2. Ejecución técnica (Baileys para multimedia y texto ágil / Puppeteer para interfaz web interactiva de canal)."
 */

export interface CanalPostMultimediaArgs {
  copyExplicativo: string;
  categoriaTematica: "juridico" | "comercial" | "mercado" | "tecnologia" | "notarial";
  promptImagenSugerido?: string;
  enlaceReferencia?: string;
}

export interface CanalEncuestaArgs {
  pregunta: string;
  opciones: string[];
  permiteMultiples?: boolean;
}

export interface CanalCuestionarioArgs {
  pregunta: string;
  opciones: string[];
  indiceCorrecto: number;
  explicacionJuridica: string;
}

export interface CanalPreguntaBuzonArgs {
  temaBuzon: string;
  invitacionTexto: string;
}

export const CANAL_INTERACTIVE_TOOLS = [
  {
    name: "publicar_post_multimedia",
    description: "Publica un análisis pedagógico, infografía o noticia inmobiliaria con copy explicativo y pieza visual en el Canal Oficial de WhatsApp.",
    parameters: {
      type: "OBJECT",
      properties: {
        copyExplicativo: { type: "STRING", description: "Texto estructurado de alto valor pedagógico con formato Markdown" },
        categoriaTematica: {
          type: "STRING",
          description: "Categoría: 'juridico', 'comercial', 'mercado', 'tecnologia' o 'notarial'"
        },
        promptImagenSugerido: { type: "STRING", description: "Prompt en inglés para generar la imagen complementaria 3D estilizada o infografía conceptual" },
        enlaceReferencia: { type: "STRING", description: "URL o enlace oficial de respaldo si aplica" }
      },
      required: ["copyExplicativo", "categoriaTematica"]
    }
  },
  {
    name: "publicar_encuesta",
    description: "Crea una encuesta interactiva de opciones múltiples en el canal de WhatsApp para medir la opinión o hábitos de la comunidad inmobiliaria.",
    parameters: {
      type: "OBJECT",
      properties: {
        pregunta: { type: "STRING", description: "Texto principal de la consulta o sondeo" },
        opciones: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Lista de 2 a 12 opciones para votar"
        },
        permiteMultiples: { type: "BOOLEAN", description: "Indica si el usuario puede marcar más de una opción" }
      },
      required: ["pregunta", "opciones"]
    }
  },
  {
    name: "publicar_cuestionario",
    description: "Crea una trivia o quiz legal interactivo con una respuesta correcta en el canal para evaluar el conocimiento jurídico de la comunidad.",
    parameters: {
      type: "OBJECT",
      properties: {
        pregunta: { type: "STRING", description: "Pregunta técnica jurídica o notarial" },
        opciones: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Lista de opciones de respuesta (2 a 4 opciones)"
        },
        indiceCorrecto: { type: "NUMBER", description: "Índice de la respuesta correcta (0-indexed)" },
        explicacionJuridica: { type: "STRING", description: "Explicación jurídica fundamentada del porqué esa es la opción correcta" }
      },
      required: ["pregunta", "opciones", "indiceCorrecto", "explicacionJuridica"]
    }
  },
  {
    name: "publicar_pregunta",
    description: "Abre un buzón interactivo de dudas en el canal de WhatsApp donde los seguidores dejen consultas puntuales sobre trámites, títulos o estudio de crédito.",
    parameters: {
      type: "OBJECT",
      properties: {
        temaBuzon: { type: "STRING", description: "Tema focal del buzón (ej. Ley 675, Promesas de compraventa, Tiempos notariales)" },
        invitacionTexto: { type: "STRING", description: "Llamado a la acción invitando a dejar preguntas en la caja" }
      },
      required: ["temaBuzon", "invitacionTexto"]
    }
  }
];

/**
 * Validador de payloads estructurados para publicaciones del canal
 */
export function validateCanalInteractivePayload(toolName: string, args: Record<string, any>): { valid: boolean; error?: string } {
  if (toolName === "publicar_encuesta") {
    if (!args.pregunta || typeof args.pregunta !== "string") return { valid: false, error: "Pregunta inválida" };
    if (!Array.isArray(args.opciones) || args.opciones.length < 2) return { valid: false, error: "Requiere al menos 2 opciones" };
    return { valid: true };
  }
  if (toolName === "publicar_cuestionario") {
    if (!args.pregunta || typeof args.pregunta !== "string") return { valid: false, error: "Pregunta inválida" };
    if (!Array.isArray(args.opciones) || args.opciones.length < 2) return { valid: false, error: "Requiere al menos 2 opciones" };
    if (typeof args.indiceCorrecto !== "number" || args.indiceCorrecto < 0 || args.indiceCorrecto >= args.opciones.length) {
      return { valid: false, error: "Índice de respuesta correcta fuera de rango" };
    }
    return { valid: true };
  }
  if (toolName === "publicar_post_multimedia") {
    if (!args.copyExplicativo || typeof args.copyExplicativo !== "string") return { valid: false, error: "Copy explicativo obligatorio" };
    return { valid: true };
  }
  if (toolName === "publicar_pregunta") {
    if (!args.temaBuzon || !args.invitacionTexto) return { valid: false, error: "Tema e invitación obligatorios" };
    return { valid: true };
  }
  return { valid: false, error: `Herramienta desconocida: ${toolName}` };
}
