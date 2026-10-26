/**
 * JanIA Types & Schemas - VECY BIENES RAÍCES
 * Módulo central de tipos, interfaces y esquemas para JanIA.
 */

export type JanIAResult = {
  classification: "INMUEBLE" | "REQUERIMIENTO" | "CONSULTA_GENERAL" | "RESPUESTA_A_PREGUNTA_IA" | "DATOS_INCOMPLETOS" | "VIOLACION_DE_NORMAS" | "ANALISIS_DE_MERCADO" | "RESPUESTA_A_BURLA" | "SOBRE_VECY";
  extractedData?: any;
  missingFields?: string[];
  response: string;      // Respuesta para el grupo (Silencio de Oro si no hay match)
  dmResponse?: string;   // Respuesta para el chat privado (DM)
  mentions?: string[];
  shouldSendDM?: boolean;
  dmShouldReply?: boolean; // Flag para indicar que el DM debe ser un reply
  reactionEmoji?: string;  // Emoji que la IA recomienda para reaccionar al mensaje original
  extraDMs?: { jid: string; message: string; viaMainBot?: boolean }[];
  wantsVoice?: boolean;
  voiceResponse?: string;
  sendReputationHook?: boolean;
  inserted?: boolean;
  savedId?: number;
  savedType?: "property" | "requirement";
  isFlyerOrBanner?: boolean;
  flyerVerbatimText?: string;
  document?: Buffer;
  fileName?: string;
};

export const janiaResultSchema = {
  type: "OBJECT",
  properties: {
    classification: {
      type: "STRING",
      enum: [
        "INMUEBLE",
        "REQUERIMIENTO",
        "CONSULTA_GENERAL",
        "RESPUESTA_A_PREGUNTA_IA",
        "DATOS_INCOMPLETOS",
        "VIOLACION_DE_NORMAS",
        "ANALISIS_DE_MERCADO",
        "RESPUESTA_A_BURLA",
        "SOBRE_VECY"
      ]
    },
    response: { type: "STRING" },
    dmResponse: { type: "STRING" },
    shouldSendDM: { type: "BOOLEAN" },
    dmShouldReply: { type: "BOOLEAN" },
    reactionEmoji: { type: "STRING" },
    wantsVoice: { type: "BOOLEAN" },
    voiceResponse: { type: "STRING" },
    isFlyerOrBanner: { type: "BOOLEAN" },
    flyerVerbatimText: { type: "STRING" },
    missingFields: {
      type: "ARRAY",
      items: { type: "STRING" }
    },
    extractedData: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        isFlyerOrBanner: { type: "BOOLEAN" },
        flyerVerbatimText: { type: "STRING" },
        gives: {
          type: "OBJECT",
          properties: {
            item: { type: "STRING" },
            details: { type: "STRING" }
          }
        },
        wants: {
          type: "OBJECT",
          properties: {
            item: { type: "STRING" },
            details: { type: "STRING" }
          }
        },
        price: { type: "NUMBER" },
        zone: { type: "STRING" },
        city: { type: "STRING" },
        propertyType: {
          type: "STRING",
          enum: [
            "apartment", "house", "building", "warehouse", "office", "farm",
            "land", "commercial", "loft", "consultorio", "cabin", "hotel"
          ]
        },
        transactionType: {
          type: "STRING",
          enum: [
            "venta", "arriendo", "venta_o_arriendo", "arriendo_temporal",
            "arriendo_con_opcion_de_compra", "permuta", "venta_permuta", "aporte"
          ]
        },
        transactionTypes: {
          type: "ARRAY",
          items: { type: "STRING" }
        },
        area: { type: "NUMBER" },
        bedrooms: { type: "NUMBER" },
        bathrooms: { type: "NUMBER" },
        garages: { type: "NUMBER" },
        stratum: { type: "NUMBER" },
        adminFee: { type: "NUMBER" },
        isCollaborativePool: { type: "BOOLEAN" },
        interiorExterior: {
          type: "STRING",
          enum: ["interior", "exterior", "NA"]
        },
        cuartoBanoServicio: {
          type: "STRING",
          enum: ["Si", "No", "NA"]
        },
        cocina: {
          type: "STRING",
          enum: ["cerrada", "abierta", "americana", "NA"]
        },
        lavanderiaIndependiente: {
          type: "STRING",
          enum: ["Si", "No", "NA"]
        },
        tipoPisos: {
          type: "ARRAY",
          items: { type: "STRING" }
        },
        depositos: { type: "NUMBER" },
        comisiones: { type: "STRING" },
        antiguedad: {
          type: "STRING",
          enum: ["nuevo", "1-5", "5-10", "10+", "NA"]
        },
        floorDetail: { type: "STRING" }
      }
    }
  },
  required: ["classification", "response"]
};

export interface CanonicalBarrioItem {
  canonical: string;
  lower: string;
  city?: string;
}

export interface FlyerVisionResult {
  isFlyerOrBanner: boolean;
  classification: "INMUEBLE" | "REQUERIMIENTO" | "CONSULTA_GENERAL";
  transactionType: "venta" | "arriendo" | "venta_permuta" | "arriendo_temporal";
  propertyType?: string;
  title?: string;
  price?: number;
  rentPrice?: number;
  presupuestoMax?: number;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  garages?: number;
  city?: string;
  zone?: string;
  contactPhone?: string;
  contactName?: string;
  flyerVerbatimText?: string;
  reactionEmoji?: string;
}

export interface ConsultingTurn {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

export interface DmTurn {
  role: "user" | "assistant";
  content: string;
  ts: number;
}
