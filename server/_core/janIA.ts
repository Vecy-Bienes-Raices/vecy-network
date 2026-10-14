/**
 * JanIA Core Facade - VECY BIENES RAÍCES
 * 
 * Este archivo actúa como la fachada retrocompatible oficial del sistema JanIA.
 * Toda la arquitectura interna ha sido desacoplada y modularizada bajo `server/_core/jania/`:
 * 
 * - `server/_core/jania/types.ts`: Tipos, interfaces y esquemas (JanIAResult, etc.)
 * - `server/_core/jania/parsers.ts`: Parsers de precios COP, nombres, teléfonos, completitud
 * - `server/_core/jania/heuristics.ts`: Detección de spam, horarios, multi-item, off-topic
 * - `server/_core/jania/vision.ts`: Extracción multimodal de flyers con Gemini
 * - `server/_core/jania/prompts.ts`: Prompts del sistema, plantillas y copys institucionales
 * - `server/_core/jania/sessionManager.ts`: Historial conversacional, saludos, estadísticas
 * - `server/_core/jania/handlers/consultingHandler.ts`: Grupo 2 (Soporte legal, tributario, avalúos)
 * - `server/_core/jania/handlers/circuloHandler.ts`: Grupo 3 (Proyecto Vecy / Foro abierto)
 * - `server/_core/jania/handlers/dmHandler.ts`: DMs privados de WhatsApp con IA Pura
 * - `server/_core/jania/handlers/propertiesHandler.ts`: Grupo 1 (Ofertas y Demandas de inmuebles)
 * 
 * Todas las funciones, tipos y constantes son re-exportados aquí para garantizar
 * 100% de compatibilidad hacia atrás en todos los servicios y tests del proyecto.
 */

export * from "./jania/index";