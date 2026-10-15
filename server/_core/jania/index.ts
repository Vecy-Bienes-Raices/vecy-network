/**
 * JanIA Module Index - VECY BIENES RAÍCES
 * Exporta de forma limpia y organizada todos los submódulos de JanIA:
 * - types: Definiciones de interfaces y esquemas
 * - parsers: Parsers de moneda colombiana, teléfonos, nombres, calificaciones
 * - heuristics: Detección de spam, horario laboral, multi-item, off-topic
 * - vision: Extracción multimodal de flyers con cascada Gemini
 * - prompts: Prompts del sistema, plantillas y copys institucionales
 * - sessionManager: Estado de sesiones, saludos del día, historial de DMs y consultoría
 * - handlers: Manejadores especializados de Grupo 1 (Inmuebles), Grupo 2 (Consultoría),
 *             Grupo 3 (Círculo Cero / Debate) y DMs privados (Atención al cliente con IA Pura).
 */

export * from "./types";
export * from "./parsers";
export * from "./heuristics";
export * from "./vision";
export * from "./prompts";
export * from "./sessionManager";
export * from "./handlers/consultingHandler";
export * from "./handlers/circuloHandler";
export * from "./handlers/dmHandler";
export * from "./handlers/propertiesHandler";
export * from "./trustedContacts";

// Re-exportar directorio permanente de asesores para compatibilidad total con consumidores previos
export {
  brokerDirectoryCache,
  isGenericName,
  extractColombianPhoneFromText,
  normalizeAdvisorPhone,
  isLidIdentifier,
  lookupAdvisorSync,
  preserveVerifiedAdvisorContact,
  saveOrUpdateAdvisor,
  initAdvisorsDirectory,
  lookupAdvisor,
} from "../advisors";
