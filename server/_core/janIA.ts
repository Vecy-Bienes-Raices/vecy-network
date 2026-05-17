import { invokeLLM } from "./llm";
import { getDb } from "../db";
import { properties, requirements, InsertProperty, InsertRequirement } from "../../drizzle/schema";
import { findMatchesForProperty, findMatchesForRequirement } from "./matching";
import { geocodeAddress } from "./geocoding";

export type JanIAResult = {
  classification: "INMUEBLE" | "REQUERIMIENTO" | "CONSULTA_GENERAL" | "RESPUESTA_A_PREGUNTA_IA" | "DATOS_INCOMPLETOS" | "VIOLACION_DE_NORMAS" | "ANALISIS_DE_MERCADO";
  extractedData?: any;
  missingFields?: string[];
  response: string;
  mentions?: string[];
};

const JANIA_PROMPT = `
Eres JanIA, la Super Agente, COACH, CONSULTORA JURÍDICA y EXPERTA NOTARIAL de VECY Network. 

TU HISTORIA Y EL ARMAGEDÓN INMOBILIARIO:
- VECY no es una empresa tradicional; es el resultado de una "idea loca e inverosímil" que nació en el grupo de WhatsApp "Círculo Cero".
- Eres el arma principal del ARMAGEDÓN que extinguirá a los dinosaurios inmobiliarios (portales y CRMs obsoletos) para dar vía a la nueva era del Círculo Cero: un ecosistema 100% digital, inteligente y extraordinario.
- Mientras otros inventaron la rueda pero nunca la echaron a rodar, VECY ya tiene forma, peso y engranajes reales.

TU FILOSOFÍA: INNOVACIÓN CONSTANTE Y SOSTENIBLE (EL EFECTO ASTEROIDE):
- Misión: Revolucionar el sector eliminando la fricción ("Cero Esfuerzo"). Automatizas el matching, análisis de mercado y consultoría.
- Visión: Ser el Bróker Virtual Definitivo y la autoridad máxima en data de Colombia (hacia el Big Data con BigQuery y Claude).
- Modelo SaaS: El acceso a tu inteligencia se gestiona vía suscripción externa (Stripe/Paddle), asegurando la sostenibilidad sin conflictos con WhatsApp.

TU PODER TÉCNICO Y ROADMAP (EDICIÓN GOLD):
- Estandarización Geográfica: Utilizas geocodificación estructurada (Google Maps/Nominatim) para limpiar direcciones y barrios automáticamente.
- Ingesta de Activos: Ya procesas activos reales (Edificios Teusaquillo, Santa Bárbara) y expandes categorías a bodegas, hoteles y lotes.
- Ecosistema Pro: Cuentas con "Stealth Share" para compartir inmuebles con elegancia y sincronización con Google Reviews.

TU ROL COMO CONSULTORA JURÍDICA Y EXPERTA NOTARIAL:
- Conocimiento profundo del Derecho Inmobiliario Colombiano.
- Recomiendas SIEMPRE la Firma Electrónica (Ley 527/99) para saltar la burocracia notarial lenta.

NUEVA FACULTAD: TASACIÓN Y SONDEO (SOLO BOGOTÁ):
- Realizas análisis de mercado rápidos en privado con Dirección, Barrio y Localidad, estableciendo valores promedio por m2.

RESTRICCIÓN DE DOMINIO Y PERSONALIDAD:
- Solo Bienes Raíces y ecosistema VECY. Declina temas ajenos con elegancia.
- Eres profesional, diligente, educada, con humor cálido y "picardía sana".
- Saluda con cariño y despídete: "Con cariño, su JanIA".

RESPONDE ÚNICAMENTE CON ESTE JSON:
{
  "classification": "...",
  "response": "Tu respuesta humanizada, cordial y con un toque de picardía aquí.",
  "missingFields": [],
  "extractedData": { ... }
}
`;

export async function processWhatsAppMessage(
  text: string, 
  userId: string, 
  userName?: string,
  hasMedia: boolean = false
): Promise<JanIAResult> {
...
`;
  try {
    // Si tiene media (foto/video), forzamos la amonestación
    const userMessage = hasMedia ? `[SISTEMA: EL USUARIO SUBIÓ UNA FOTO O VIDEO DIRECTO] ${text}` : `Mensaje de ${userName || userId}: ${text}`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: JANIA_PROMPT },
        { role: "user", content: userMessage }
      ],
      responseFormat: { type: "json_object" }
    });

    const rawContent = response.choices[0].message.content;
    const cleanJson = rawContent.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleanJson) as JanIAResult;
    result.mentions = [];

    // Lógica de guardado y matches (se mantiene igual)
    if (result.classification === "INMUEBLE" || result.classification === "DATOS_INCOMPLETOS") {
      const data = {
        name: result.extractedData?.name || `Inmueble de ${userName || userId}`,
        propertyType: result.extractedData?.propertyType || "apartment",
        price: result.extractedData?.price || "0",
        zone: result.extractedData?.zone || "Bogotá",
        ...result.extractedData
      } as InsertProperty;

      const saved = await saveProperty(data, userId, text);
      if (saved && (!result.missingFields || result.missingFields.length === 0)) {
        const matches = await findMatchesForProperty(saved.id);
        if (matches.length > 0) {
          result.response += `\n\n🎯 ¡Oigan! 🧐 Encontré ${matches.length} matches para esta joyita. ¡Llamen ya a sus clientes!`;
          const matchedUsers = matches.map(m => m.idUsuarioWhatsapp).filter((id): id is string => !!id);
          result.mentions.push(...matchedUsers);
        }
      }
    } else if (result.classification === "REQUERIMIENTO") {
      const data = {
        tipoInmuebleDeseado: result.extractedData?.tipoInmuebleDeseado || "apartment",
        tipoNegocioDeseado: result.extractedData?.tipoNegocioDeseado || "venta",
        ...result.extractedData
      } as InsertRequirement;

      const saved = await saveRequirement(data, userId, text);
      if (saved) {
        const matches = await findMatchesForRequirement(saved.id);
        if (matches.length > 0) {
          result.response += `\n\n🎯 ¡Mis queridos! Tengo ${matches.length} inmuebles en mi radar que le van a encantar a tu cliente. ✨`;
          const matchedUsers = matches.map(m => m.idUsuarioWhatsapp).filter((id): id is string => !!id);
          result.mentions.push(...matchedUsers);
        }
      }
    }

    return result;
  } catch (error) {
    console.error("Error in processWhatsAppMessage:", error);
    return {
      classification: "CONSULTA_GENERAL",
      response: "Mil disculpas, colegas. 🧐 Tuve un pequeño inconveniente técnico momentáneo, pero ya estoy aquí lista para seguir apoyándolos en sus cierres. ¿En qué estábamos? ✨",
      mentions: []
    };
  }
}

export async function generateWelcomeMessage(count: number): Promise<string> {
  try {
    const prompt = `
      ${JANIA_PROMPT}
      
      INSTRUCCIÓN ADICIONAL:
      Han ingresado ${count} nuevos integrantes al grupo de VECY Network. 
      Escribe un mensaje de bienvenida cálido, profesional y con tu toque de picardía. 
      
      HABLA DEL ARMAGEDÓN Y EL CÍRCULO CERO:
      Explícales que son parte del cambio que extinguirá a los dinosaurios inmobiliarios. 
      Cuéntales brevemente de dónde venimos (Círculo Cero) y lo que hemos logrado (Ediciones Gold, automatización total).
      
      Explícales brevemente que eres su asistente IA, que haces MATCHES automáticos leyendo sus mensajes y que deben seguir las normas y formatos oficiales que se enviarán a continuación.
      
      VARÍA EL MENSAJE: No siempre digas lo mismo. Sé creativa, usa diferentes saludos y formas de motivarlos. 
      RESPONDE SOLO CON EL TEXTO DEL MENSAJE, NO USES JSON PARA ESTA TAREA.
    `;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Eres JanIA de VECY Network." },
        { role: "user", content: prompt }
      ]
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error generating welcome message:", error);
    return `¡Hola, mis estimados colegas! ✨ Qué alegría ver cómo crece este equipo. ¡Una acogedora bienvenida para los nuevos integrantes que se han unido recientemente! 🥳👋 Soy JanIA, su asistente de IA...`; // Fallback
  }
}

async function saveProperty(data: InsertProperty, userId: string, rawText: string) {
  const db = await getDb();
  if (!db) return null;
  try {
    const [result] = await db.insert(properties).values({ ...data, idUsuarioWhatsapp: userId, rawText }).returning();
    return result;
  } catch (e) { return null; }
}

async function saveRequirement(data: InsertRequirement, userId: string, rawText: string) {
  const db = await getDb();
  if (!db) return null;
  try {
    const [result] = await db.insert(requirements).values({ ...data, idUsuarioWhatsapp: userId, rawText }).returning();
    return result;
  } catch (e) { return null; }
}
