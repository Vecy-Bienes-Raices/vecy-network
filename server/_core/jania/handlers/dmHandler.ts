import {
  resolveRealName,
  getOrLoadDmHistory,
  appendDmHistory,
  getContactPermanentDossier,
  getUserPerpetualSession,
  saveUserPerpetualSession,
  isNewUser,
  incrementUserMessageCount,
  incrementFreeServicesCount,
  recordUserReviewClaim,
  verifyUserGoogleReview,
  isUserVerifiedGoogleReview,
  shouldAskForGoogleReview,
  isEduardoOrJani,
  setUser402040Agreement,
  getUser402040Agreement,
  checkAlreadyGreeted,
  markUserGreetedToday
} from "../sessionManager";
import { fetchWebUrlContent } from "../../scraper";
import { getDb } from "../../../db";
import { properties } from "../../../../drizzle/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { extractFirstName, sanitizeResponseMarkdown } from "../parsers";
import { resolveNameAndGender, getCanonicalCompositeName, extractIntroducedName } from "../../nameAndGenderResolver";
import { invokeLLM } from "../../llm";
import { enhanceResponseWithCommercialFunnel, isHighValueLegalOrTaxInquiry, COMMERCIAL_CLOSING_CTA, PATRIMONIAL_RISK_ALERT } from "../../commercialFunnelService";
import { getVecyInstitutionalKnowledge, JANIA_ARGON_COGNITIVE_CORE } from "../prompts";
import { executeMarketValuationSurvey } from "../../valuation";
import { getGreetingByTime } from "../../whatsapp-utils";
import { FlyerVisionResult } from "../types";
import {
  findTrustedContact,
  buildFamilyWarmWelcomeMessage,
  isChaloEscobarJoke,
  buildChaloJokeResponse,
  isJonathanCreditProcessQuery,
  buildJonathanCreditResponse,
  isDebtCollectionOrSpamScam,
  getDebtCollectionDefenseResponse,
  TrustedContact
} from "../trustedContacts";
import {
  formatFounderTeachingsForPrompt,
  isFounderTeachingInstruction,
  saveFounderTeaching
} from "../founderKnowledgeService";

export interface DmMediaOptions {
  imageBuffer?: string;
  pdfBuffer?: string;
  pdfMimeType?: string;
  isAudio?: boolean;
  flyerVisionData?: FlyerVisionResult | null;
}

export interface LatestDmPdfAttachment {
  pdfBuffer: Buffer;
  pdfFileName?: string;
}

const latestDmPdfMap = new Map<string, LatestDmPdfAttachment>();

export function setLatestDmPdf(userId: string, attachment: LatestDmPdfAttachment): void {
  latestDmPdfMap.set(userId, attachment);
}

export function popLatestDmPdf(userId: string): LatestDmPdfAttachment | undefined {
  const attachment = latestDmPdfMap.get(userId);
  if (attachment) {
    latestDmPdfMap.delete(userId);
  }
  return attachment;
}

const latestDmFollowUpMap = new Map<string, string>();

export function setLatestDmFollowUpMessage(_userId: string, _followUpText: string): void {
  // ⚠️ CERO SEGUNDO MENSAJE FORZADO (v33.29):
  // No-op para mantener retrocompatibilidad sin encolar mensajes forzados
}

export function popLatestDmFollowUpMessage(_userId: string): string | undefined {
  return undefined;
}

export const JANIA_DM_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "consultar_identidad_y_antecedentes",
        description: "Valida la EPS a la que está afiliada la persona, tipo de régimen (contributivo/subsidiado), estado de afiliación en salud en ADRES (BDUA), identidad oficial ante Registraduría y antecedentes de seguridad (Policía Nacional vía 2Captcha, Procuraduría SIRI, Contraloría SIRECI) para Cédula de Ciudadanía, Extranjería, Pasaporte o NIT.",
        parameters: {
          type: "OBJECT",
          properties: {
            numeroDocumento: { type: "STRING", description: "Número de cédula, NIT o documento a verificar" },
            tipoDocumento: { type: "STRING", description: "Tipo de documento: CC, CE, PASAPORTE, NIT" }
          },
          required: ["numeroDocumento"]
        }
      },
      {
        name: "consultar_paz_y_salvo_idu",
        description: "Consulta y genera el Paz y Salvo oficial de Valorización del IDU en Bogotá mediante el código CHIP (inicia en AAA) para trámites de notaría y escrituración.",
        parameters: {
          type: "OBJECT",
          properties: {
            chip: { type: "STRING", description: "Código CHIP del inmueble que inicia por AAA" }
          },
          required: ["chip"]
        }
      },
      {
        name: "consultar_factura_predial_bogota",
        description: "Consulta y descarga la factura oficial en PDF con código de barras y estado de pago del impuesto predial unificado de Bogotá ante la Secretaría de Hacienda.",
        parameters: {
          type: "OBJECT",
          properties: {
            chip: { type: "STRING", description: "Código CHIP del predio" },
            documentoTitular: { type: "STRING", description: "Número de cédula o NIT del titular si se conoce" }
          },
          required: ["chip"]
        }
      },
      {
        name: "liquidar_gastos_notariales_y_registro",
        description: "Calcula el desglose exacto de derechos notariales (50/50), retención en la fuente (1% vendedor), impuesto de registro y beneficencia (1.67% comprador) para escrituración en Colombia.",
        parameters: {
          type: "OBJECT",
          properties: {
            precioVenta: { type: "NUMBER", description: "Precio pactado de venta en pesos colombianos (COP)" },
            tipoInmueble: { type: "STRING", description: "apartamento, casa, lote, etc." }
          },
          required: ["precioVenta"]
        }
      },
      {
        name: "sondeo_mercado_inmobiliario",
        description: "Realiza un sondeo técnico o estudio comparativo de mercado del valor del m² y canon sugerido ÚNICAMENTE cuando el usuario lo solicite de manera EXPRESA escribiendo 'avaluo', 'avalúo', 'avaluar', 'cuanto vale' o 'cuánto vale'. ESTÁ TERMINANTEMENTE PROHIBIDO invocar esta herramienta de forma automática cuando el usuario solo envía los datos de un inmueble o requerimiento sin solicitar expresamente avalúo o valor.",
        parameters: {
          type: "OBJECT",
          properties: {
            zonaOBarrio: { type: "STRING", description: "Barrio o zona de Bogotá a evaluar" },
            tipoInmueble: { type: "STRING", description: "apartamento, casa, oficina, lote" },
            areaM2: { type: "NUMBER", description: "Área en metros cuadrados" },
            estrato: { type: "NUMBER", description: "Estrato socioeconómico 1 al 6" },
            antiguedadAnos: { type: "NUMBER", description: "Años de antigüedad" },
            garajes: { type: "NUMBER", description: "Número de parqueaderos" }
          },
          required: ["zonaOBarrio"]
        }
      },
      {
        name: "registrar_inmueble_o_requerimiento",
        description: "Registra en la base de datos de VECY BIENES RAÍCES una oferta inmobiliaria (venta, arriendo, permuta) o un requerimiento/búsqueda de cliente enviado por chat privado y ejecuta el motor de coincidencias (Match).",
        parameters: {
          type: "OBJECT",
          properties: {
            textoCompletoPublicacion: { type: "STRING", description: "Texto completo del inmueble ofrecido o demandado optimizado por JanIA" },
            tipoOperacion: { type: "STRING", description: "OFERTA o DEMANDA" },
            esPropietarioDirecto: { type: "BOOLEAN", description: "true si el usuario es propietario o comprador directo; false si es agente inmobiliario" },
            acepta402040: { type: "BOOLEAN", description: "true si el agente acepta comisión colaborativa 40/20/40; false si prefiere 50/50" },
            comisionEsquema: { type: "STRING", description: "'40/20/40' o '50/50'" }
          },
          required: ["textoCompletoPublicacion"]
        }
      },
      {
        name: "consultar_matches_o_codigo",
        description: "Consulta y busca cruces, coincidencias o detalles de un código de match (#M...), propiedad (P...) o requerimiento (R...), o busca coincidencias por texto en la red VECY.",
        parameters: {
          type: "OBJECT",
          properties: {
            consulta: { type: "STRING", description: "Código de match (ej. M15649), ID de propiedad/requerimiento o texto de búsqueda" }
          },
          required: ["consulta"]
        }
      },
      {
        name: "consultar_empresa_o_nit",
        description: "Consulta y valida la identidad oficial de Empresas y Personas Jurídicas por NIT o Razón Social (RUES + Cámara de Comercio + DIAN + Procuraduría SIRI + Contraloría SIRECI). Devuelve Razón Social, NIT, Estado de matrícula, Dirección comercial, Teléfono, Actividad económica (CIIU) y Representante Legal Principal.",
        parameters: {
          type: "OBJECT",
          properties: {
            consultaEmpresa: { type: "STRING", description: "Número de NIT con o sin dígito de verificación o Nombre/Razón Social de la empresa detectada en texto o imagen" }
          },
          required: ["consultaEmpresa"]
        }
      },
      {
        name: "enviar_encuesta_interactiva",
        description: "Envía una encuesta interactiva nativa de WhatsApp (Poll) de 1 clic para selección ágil de trámites, tipos de inmuebles, opciones de negocio o encuestas del canal.",
        parameters: {
          type: "OBJECT",
          properties: {
            pregunta: { type: "STRING", description: "Pregunta del cuestionario o encuesta" },
            opciones: {
              type: "ARRAY",
              items: { type: "STRING" },
              description: "Lista de opciones de respuesta (2 a 12 opciones cortas)"
            },
            limiteSeleccion: { type: "NUMBER", description: "Número máximo de opciones seleccionables (por defecto 1)" }
          },
          required: ["pregunta", "opciones"]
        }
      },
      {
        name: "enviar_tarjeta_contacto_vecy",
        description: "Envía la tarjeta de contacto oficial interactiva (vCard) de VECY BIENES RAÍCES / Eduardo Rivera y Jani Alves (+57 316 656 9719) o el contacto de un colega.",
        parameters: {
          type: "OBJECT",
          properties: {
            destinatario: { type: "STRING", description: "Tipo de contacto: 'broker', 'jania' o 'colega'" },
            nombrePersonalizado: { type: "STRING", description: "Nombre a mostrar en la tarjeta de contacto" },
            telefonoPersonalizado: { type: "STRING", description: "Número de teléfono en formato internacional (ej. +573166569719)" }
          }
        }
      },
      {
        name: "enviar_evento_visita_inmobiliaria",
        description: "Agenda y despacha una tarjeta de evento formal para visitas a inmuebles, reuniones o comités notariales a través de Vecy Agenda Pro.",
        parameters: {
          type: "OBJECT",
          properties: {
            tituloVisita: { type: "STRING", description: "Título del evento o visita inmobiliaria" },
            fechaHora: { type: "STRING", description: "Fecha y hora propuesta para la visita" },
            direccionOBarrio: { type: "STRING", description: "Dirección, conjunto o barrio del inmueble" },
            detalles: { type: "STRING", description: "Observaciones de la visita o registro de portería" }
          },
          required: ["tituloVisita", "fechaHora"]
        }
      },
      {
        name: "enviar_catalogo_servicios",
        description: "Comparte el enlace directo al catálogo de WhatsApp Business, marketplace colaborativo y portafolio Proptech de VECY BIENES RAÍCES.",
        parameters: {
          type: "OBJECT",
          properties: {
            categoria: { type: "STRING", description: "Categoría: 'inmuebles', 'servicios' o 'general'" }
          }
        }
      },
      {
        name: "navegar_o_buscar_web",
        description: "Abre y extrae el contenido real de una URL/enlace web (portales inmobiliarios como Metrocuadrado, Fincaraiz, Ciencuadras, páginas corporativas o documentos web) o busca información actualizada en internet.",
        parameters: {
          type: "OBJECT",
          properties: {
            url: { type: "STRING", description: "URL o enlace web completo a consultar (ej. https://...)" },
            query: { type: "STRING", description: "Término de búsqueda web si no hay URL directa" }
          }
        }
      },
      {
        name: "consultar_catalogo_inmuebles_vecy",
        description: "Consulta el catálogo oficial y base de datos de propiedades de VECY BIENES RAÍCES (Atención Bróker 3166569719), filtrando por tipo de inmueble, tipo de negocio (venta, arriendo), zona/barrio, rango de precio o características, entregando fichas y sondeos de $/m² al instante.",
        parameters: {
          type: "OBJECT",
          properties: {
            tipoInmueble: { type: "STRING", description: "apartamento, casa, oficina, local, lote, etc." },
            tipoNegocio: { type: "STRING", description: "venta, arriendo, venta_o_arriendo" },
            zona: { type: "STRING", description: "Zona o barrio de Bogotá o municipio" },
            precioMaximo: { type: "NUMBER", description: "Presupuesto máximo en COP" }
          }
        }
      }
    ]
  }
];

export type JaniaDmToolType =
  | "cedula"
  | "predial"
  | "idu"
  | "notarial"
  | "sondeo"
  | "match"
  | "empresa"
  | "encuesta"
  | "contacto"
  | "evento"
  | "catalogo"
  | "web"
  | "catalogo_inmuebles"
  | "registro_inmueble";

export async function executeJaniaDmTool(
  toolName: string,
  args: Record<string, any>,
  userId: string,
  _userName?: string,
  rawUserText?: string
): Promise<{ resultJson: Record<string, any>; toolType: JaniaDmToolType }> {
  switch (toolName) {
    case "consultar_matches_o_codigo": {
      const query = String(args.consulta || args.codigo || args.query || rawUserText || "").trim();
      const { executeAdminMatchSearch } = await import("../../adminMatchAssistantService");
      const isEduardo = /eduardo/i.test(_userName || "") || userId.includes("3192919978") || userId.includes("225954035179724");
      const isJani = /jani/i.test(_userName || "") || userId.includes("3188096811") || userId.includes("167108705018103");
      const res = await executeAdminMatchSearch(query, isEduardo || isJani, userId);
      return {
        toolType: "match",
        resultJson: {
          solicitud: "consulta_matches",
          consulta: query,
          reporteOficial: res.formattedReport || "Sin coincidencias registradas.",
          totalFound: res.totalFound
        }
      };
    }
    case "registrar_inmueble_o_requerimiento": {
      const { processWhatsAppMessage } = await import("./propertiesHandler");
      let textToProcess = String(args.textoCompletoPublicacion || rawUserText || "").trim();

      if (args.acepta402040 === false || args.comisionEsquema === "50/50") {
        if (!textToProcess.includes("50/50")) {
          textToProcess += "\n[🛡️50/50 - NO TERCERÍA]";
        }
      } else if (args.acepta402040 === true || args.comisionEsquema === "40/20/40") {
        if (!textToProcess.includes("40/20/40")) {
          textToProcess += "\n[ALIANZA 40/20/40 ACEPTADA - ALIADA PRIORITARIA]";
        }
      } else if (args.esPropietarioDirecto === true) {
        if (!textToProcess.includes("PROPIETARIO DIRECTO")) {
          textToProcess += "\n[PROPIETARIO DIRECTO - ASESORÍA VECY]";
        }
      }

      const res = await processWhatsAppMessage(
        textToProcess,
        userId,
        _userName,
        false,
        [],
        undefined,
        undefined,
        false
      );
      if (res.dmResponse && res.dmResponse.includes("FICHA TÉCNICA DE REQUERIMIENTO")) {
        return {
          toolType: "registro_inmueble",
          resultJson: {
            solicitud: "registro_inmueble_o_requerimiento",
            clasificacion: res.classification,
            insertado: false,
            esIncompleto: true,
            guiaFichaTecnica: res.dmResponse,
            detalle: "Requerimiento incompleto (falta presupuesto, administración, zona o tipología). JanIA guía al usuario con la Ficha Técnica Estandarizada [ ] para completar los datos indispensables."
          }
        };
      }

      // 🔍 BÚSQUEDA SÍNCRONA DE COINCIDENCIAS (MATCH) INMEDIATO (DOCTRINA EDUARDO A. RIVERA):
      let matchesSummary: Array<{
        matchCode: string;
        score: number;
        tipoInmueble: string;
        zona: string;
        precioOCanon: string;
        area?: string;
        habitaciones?: number;
        banos?: number;
        garajes?: number;
      }> = [];

      if (res.inserted && res.savedId) {
        try {
          const { findMatchesForRequirement, findMatchesForProperty } = await import("../../matching");
          let rawMatches: any[] = [];
          if (res.savedType === "requirement" || res.classification === "REQUERIMIENTO") {
            rawMatches = await findMatchesForRequirement(res.savedId);
          } else {
            rawMatches = await findMatchesForProperty(res.savedId);
          }

          if (Array.isArray(rawMatches) && rawMatches.length > 0) {
            matchesSummary = rawMatches.slice(0, 3).map((m: any) => ({
              matchCode: `#M${m.matchId || m.id}`,
              score: Math.round(Number(m.score || 0)),
              tipoInmueble: m.propertyType || m.tipoInmuebleDeseado || "Inmueble",
              zona: m.zone || m.addressNeighborhood || m.zonaDeseada || "Bogotá",
              precioOCanon: m.rentPrice || m.rent_price
                ? `$${Number(m.rentPrice || m.rent_price).toLocaleString('es-CO')} COP/mes`
                : m.price
                  ? `$${Number(m.price).toLocaleString('es-CO')} COP`
                  : "Por acordar",
              area: m.areaTotal ? `${m.areaTotal} m²` : undefined,
              habitaciones: m.bedrooms || m.habitacionesMin,
              banos: m.bathrooms || m.banosMin,
              garajes: m.garages || m.parqueaderosMin
            }));
          }
        } catch (mErr: any) {
          console.error("[dmHandler] Error buscando matches para registro:", mErr?.message);
        }
      }

      return {
        toolType: "registro_inmueble",
        resultJson: {
          solicitud: "registro_inmueble_o_requerimiento",
          clasificacion: res.classification,
          insertado: res.inserted,
          registroId: res.savedId ? `${res.savedType === 'requirement' ? 'R' : 'P'}${res.savedId}` : undefined,
          esPropietarioDirecto: Boolean(args.esPropietarioDirecto),
          acepta402040: args.acepta402040 !== undefined ? Boolean(args.acepta402040) : (args.comisionEsquema === "40/20/40"),
          comisionEsquema: args.comisionEsquema || (args.acepta402040 === true ? "40/20/40" : args.acepta402040 === false ? "50/50" : "pendiente"),
          totalMatchesFound: matchesSummary.length,
          matchesEncontrados: matchesSummary,
          detalle: matchesSummary.length > 0
            ? `Se encontraron ${matchesSummary.length} cruces de alta afinidad (Match).`
            : "No se encontraron coincidencias inmediatas con el umbral 85%-100%, pero el registro quedó 100% activo en el radar 24/7 de VECY Network."
        }
      };
    }
    case "consultar_identidad_y_antecedentes": {
      const {
        executeIdentityVerificationFromWhatsApp,
        getPendingUnconfirmedDoc,
        clearPendingUnconfirmedDoc,
        getPendingCompanyMembers,
        clearPendingCompanyMembers
      } = await import("../../identityVerificationService");
      let doc = String(args.numeroDocumento || args.cedula || args.nit || args.documento || "").trim();
      let tipo = String(args.tipoDocumento || "CC").trim();

      const combinedIntent = `${doc} ${rawUserText || ""}`.toLowerCase();
      if (/(?:todos|cada\s+miembro|todos\s+los\s+miembros|suplentes\s+y\s+principal|ambos)/i.test(combinedIntent)) {
        const pendingMembers = getPendingCompanyMembers(userId);
        if (pendingMembers && pendingMembers.length > 0) {
          clearPendingCompanyMembers(userId);
          clearPendingUnconfirmedDoc(userId);
          const explicitItems = pendingMembers
            .filter((m) => Boolean(m.numeroIdentificacion))
            .map((m) => ({
              cedula: m.numeroIdentificacion,
              tipoDoc: m.tipoDocumento.toLowerCase().includes("e") ? "ce" : "cc",
              rawNumber: m.numeroIdentificacion,
              detectedName: m.nombre
            }));
          if (explicitItems.length > 0) {
            const resAll = await executeIdentityVerificationFromWhatsApp(
              explicitItems.map((i) => `${i.tipoDoc.toUpperCase()} ${i.cedula}`).join(", "),
              true,
              userId,
              explicitItems
            );
            return {
              toolType: "cedula",
              resultJson: {
                solicitud: "verificacion_identidad_miembros_empresa",
                numeroDocumento: explicitItems.map((i) => i.cedula).join(", "),
                tipoDocumento: "CC",
                reporteOficial: resAll.reportText || "Sin reporte disponible",
                exitoso: resAll.isVerificationRequest
              }
            };
          }
        }
      }

      if (!/\d{5,12}/.test(doc)) {
        const pendingDoc = getPendingUnconfirmedDoc(userId);
        if (pendingDoc?.cleanNumber) {
          doc = pendingDoc.cleanNumber;
          clearPendingUnconfirmedDoc(userId);
        } else if (rawUserText) {
          doc = rawUserText;
        }
      }

      const cleanDigits = doc.split("-")[0].replace(/\D/g, "");
      if (cleanDigits.length === 9 && /^[89]\d{8}$/.test(cleanDigits)) {
        tipo = "NIT";
      } else if (rawUserText && /\bnit\b/i.test(rawUserText)) {
        tipo = "NIT";
      }

      const queryStr = doc.toUpperCase().startsWith(tipo.toUpperCase()) ? doc : `${tipo} ${doc}`;
      const res = await executeIdentityVerificationFromWhatsApp(queryStr, true, userId);
      const isCompanyReport = tipo === "NIT" || Boolean(res.reportText?.includes("VERIFICACIÓN OFICIAL DE EMPRESA"));

      let adresData: { eps?: string; estado?: string; regimen?: string } | null = null;
      if (res.adres?.eps) {
        adresData = {
          eps: res.adres.eps,
          estado: res.adres.estado || "ACTIVO",
          regimen: res.adres.regimen || "CONTRIBUTIVO"
        };
      } else if (res.reportText) {
        const adresLineMatch = res.reportText.match(/ADRES\s*\((?:BDUA)?\):\*\s*([^\n\r]+)/i);
        if (adresLineMatch && adresLineMatch[1] && !adresLineMatch[1].toLowerCase().includes("no registra afiliación")) {
          const rawMatch = adresLineMatch[1].trim();
          const parsedEpsMatch = rawMatch.match(/^([^(]+)(?:\(([^—)]+)(?:—\s*([^)]+))?\))?/);
          if (parsedEpsMatch) {
            adresData = {
              eps: parsedEpsMatch[1].trim(),
              estado: parsedEpsMatch[2]?.trim() || "ACTIVO",
              regimen: parsedEpsMatch[3]?.trim() || "CONTRIBUTIVO"
            };
          } else {
            adresData = { eps: rawMatch };
          }
        }
      }

      return {
        toolType: isCompanyReport ? "empresa" : "cedula",
        resultJson: {
          solicitud: isCompanyReport ? "consulta_empresa_o_nit" : "verificacion_identidad",
          numeroDocumento: doc,
          tipoDocumento: tipo,
          nombreOficial: res.officialName || null,
          exitoso: res.success ?? res.isVerificationRequest,
          policia: res.policia?.message || (res.success ? "Sin antecedentes judiciales ni requerimientos penales pendientes" : null),
          procuraduria: res.procuraduria?.statusText || (res.success ? "No registra sanciones ni inhabilidades vigentes ante la Procuraduría General" : null),
          contraloria: res.contraloria?.statusText || (res.success ? "Sin reporte en el Boletín de Responsables Fiscales (SIRECI)" : null),
          adres: adresData,
          reporteOficial: res.reportText || "Sin reporte disponible",
          preguntaSeguimiento: ""
        }
      };
    }
    case "consultar_paz_y_salvo_idu": {
      const chip = String(args.chip || rawUserText || "").trim();
      const { executeIduValorizacionFromWhatsApp } = await import("../../iduValorizacionService");
      const res = await executeIduValorizacionFromWhatsApp(chip, userId, true);
      if (res.pdfBuffer) {
        setLatestDmPdf(userId, { pdfBuffer: res.pdfBuffer, pdfFileName: res.pdfFileName || `Paz_y_Salvo_IDU_${chip}_2026.pdf` });
      }
      return {
        toolType: "idu",
        resultJson: {
          solicitud: "paz_y_salvo_idu",
          chip,
          reporteOficial: res.reportText || "Sin reporte disponible",
          exitoso: res.isIduRequest
        }
      };
    }
    case "consultar_factura_predial_bogota": {
      const chip = String(args.chip || rawUserText || "").trim();
      const doc = args.documentoTitular ? String(args.documentoTitular).trim() : undefined;
      const { executePredialAssistanceFromWhatsApp } = await import("../../predialService");
      const queryStr = doc ? `${chip} ${doc}` : chip;
      const res = await executePredialAssistanceFromWhatsApp(queryStr, userId, true);
      if (res.pdfBuffer) {
        setLatestDmPdf(userId, { pdfBuffer: res.pdfBuffer, pdfFileName: res.pdfFileName || `Factura_Predial_${chip}_2026.pdf` });
      }
      return {
        toolType: "predial",
        resultJson: {
          solicitud: "factura_predial_bogota",
          chip,
          reporteOficial: res?.reportText || "Factura predial procesada",
          exitoso: true
        }
      };
    }
    case "liquidar_gastos_notariales_y_registro": {
      const precio = Number(args.precioVenta || 0);
      const { executeNotarialAssistanceFromWhatsApp } = await import("../../notarialExpenseService");
      const queryText = precio > 0 ? `liquidación notarial ${precio}` : (rawUserText || "liquidación notarial");
      const res = await executeNotarialAssistanceFromWhatsApp(queryText, userId, true);
      return {
        toolType: "notarial",
        resultJson: {
          solicitud: "gastos_notariales_y_registro",
          precioVenta: precio,
          reporteOficial: res.reportText || "Liquidación procesada",
          exitoso: res.isNotarialRequest
        }
      };
    }
    case "sondeo_mercado_inmobiliario": {
      // 1. Verificación de intención explícita en el mensaje actual
      let isExplicitValuation = /\b(?:avalu[oa]s?|avaluar|cu[aá]nto\s+vale|cu[aá]l\s+es\s+el\s+valor|precio\s+(?:de\s+mercado|comercial)|en\s+cu[aá]nto\s+se\s+puede\s+vender|tasaci[oó]n|peritaje|revisar\s+(?:otro\s+)?valor|valor\s+de\s+venta)\b/i.test(rawUserText || "");

      // 2. Si el mensaje actual es una confirmación afirmativa o entrega de datos complementarios, verificar historial de conversación
      if (!isExplicitValuation && userId) {
        try {
          const recentHistory = await getOrLoadDmHistory(userId);
          const lastFewTurns = recentHistory.slice(-6);
          const hadPriorValuationIntent = lastFewTurns.some(t =>
            /\b(?:avalu[oa]s?|avaluar|cu[aá]nto\s+vale|cu[aá]l\s+es\s+el\s+valor|precio\s+(?:de\s+mercado|comercial)|en\s+cu[aá]nto\s+se\s+puede\s+vender|tasaci[oó]n|peritaje|revisar\s+(?:otro\s+)?valor|valor\s+de\s+venta|sondeo\s+t[eé]cnico|calcule\s+el\s+valor)\b/i.test(t.content)
          );
          const isAffirmativeConfirmation = /\b(?:s[ií]|si\s+es\s+ese|claro|dale|adelante|procede|de\s+una|por\s+fa|por\s+favor|hazlo|calc[uú]lalo|ese\s+mismo|correcto)\b/i.test(rawUserText || "");
          const isPropertyDataUpdate = /\b(?:a[ñn]o|construcci[oó]n|antig[uü]edad|piso|m2|metros|habitaci[oó]n|habitaciones|ba[ñn]os|garaje|noviembre|nov|200[0-9]|201[0-9]|202[0-9]|estrato)\b/i.test(rawUserText || "");

          if (hadPriorValuationIntent && (isAffirmativeConfirmation || isPropertyDataUpdate || args.zonaOBarrio || args.areaM2)) {
            isExplicitValuation = true;
          }
        } catch (_) {}
      }

      if (!isExplicitValuation) {
        return {
          toolType: "sondeo",
          resultJson: {
            solicitud: "sondeo_mercado_inmobiliario",
            omitted: true,
            mensaje: "El usuario no solicitó expresamente un avalúo ni preguntó cuánto vale. No se liquida avalúo no solicitado. Atiende cordialmente su mensaje o confirma el registro sin forzar estudios de precio."
          }
        };
      }
      const surveyRes = executeMarketValuationSurvey({
        zonaOBarrio: args.zonaOBarrio || "Chicó",
        tipoInmueble: args.tipoInmueble || "apartamento",
        areaM2: Number(args.areaM2 || 75),
        estrato: Number(args.estrato || 5),
        antiguedadAnos: Number(args.antiguedadAnos || 8),
        garajes: Number(args.garajes || 1)
      });
      return {
        toolType: "sondeo",
        resultJson: surveyRes
      };
    }
    case "consultar_empresa_o_nit": {
      const q = String(
        args.consultaEmpresa ||
        args.nitORazonSocial ||
        args.nit ||
        args.numeroDocumento ||
        args.empresa ||
        args.razonSocial ||
        args.query ||
        rawUserText ||
        ""
      ).trim();
      const { queryEmpresaOrNit } = await import("../../identityVerificationService");
      const empRes = await queryEmpresaOrNit(q, userId);
      return {
        toolType: "empresa",
        resultJson: {
          solicitud: "consulta_empresa_o_nit",
          termino: q,
          exitoso: empRes.success,
          nit: empRes.nit,
          dv: empRes.dv,
          nitCompleto: empRes.nitCompleto,
          razonSocial: empRes.razonSocial,
          camaraComercio: empRes.camaraComercio,
          ciudad: empRes.ciudad,
          estado: empRes.estado,
          matricula: empRes.matricula,
          categoriaMatricula: empRes.categoriaMatricula,
          tipoSociedad: empRes.tipoSociedad,
          organizacionJuridica: empRes.organizacionJuridica,
          organizacionJuridicaRaw: empRes.organizacionJuridicaRaw,
          fechaMatricula: empRes.fechaMatricula,
          fechaRenovacion: empRes.fechaRenovacion,
          ultimoAnoRenovado: empRes.ultimoAnoRenovado,
          ciiuPrincipal: empRes.ciiuPrincipal,
          actividadesEconomicas: empRes.actividadesEconomicas,
          representantePrincipal: empRes.representantePrincipal || null,
          representantesSuplentes: empRes.representantesSuplentes || [],
          establecimientos: empRes.establecimientos || [],
          direccionComercial: empRes.direccionComercial,
          telefonoComercial: empRes.telefonoComercial,
          reporteOficial: empRes.reportText || "Consulta empresarial procesada",
          preguntaSeguimiento: ""
        }
      };
    }
    case "enviar_encuesta_interactiva": {
      const pregunta = String(args.pregunta || "").trim();
      const opciones = Array.isArray(args.opciones) ? args.opciones.map(String) : ["Sí", "No"];
      const selectableCount = args.limiteSeleccion
        ? Number(args.limiteSeleccion)
        : Number(args.seleccionMultiple ? 2 : 1);
      const { sendNativeWhatsAppPoll } = await import("../../whatsapp-match");
      const pollSent = await sendNativeWhatsAppPoll(userId, pregunta, opciones, selectableCount);
      return {
        toolType: "encuesta",
        resultJson: {
          solicitud: "encuesta_interactiva",
          pregunta,
          opciones,
          enviada: pollSent,
          reporteOficial: pollSent
            ? `📊 *Encuesta interactiva despachada:* "${pregunta}" con ${opciones.length} opciones.`
            : `📊 Encuesta preparada para votación: "${pregunta}".`
        }
      };
    }
    case "enviar_tarjeta_contacto_vecy": {
      const rawContact = String(args.destinatario || args.tipoContacto || "broker").toLowerCase();
      const contactType = rawContact === "jania" ? "jania" : "broker";
      const { sendNativeWhatsAppContact } = await import("../../whatsapp-match");
      const contactSent = await sendNativeWhatsAppContact(userId, contactType);
      return {
        toolType: "contacto",
        resultJson: {
          solicitud: "tarjeta_contacto",
          tipoContacto: contactType,
          enviada: contactSent,
          reporteOficial: contactSent
            ? `📇 *Tarjeta de contacto interactiva (${contactType === "broker" ? "Eduardo & Jani — Bróker Oficial" : "JanIA"}) enviada exitosamente.*`
            : `📇 Contacto oficial: ${contactType === "broker" ? "Eduardo Rivera (+57 316 656 9719)" : "JanIA (+57 319 291 9978)"}.`
        }
      };
    }
    case "enviar_evento_visita_inmobiliaria": {
      const titulo = String(args.tituloVisita || args.titulo || "Visita Inmobiliaria").trim();
      const descripcion = String(args.detalles || args.descripcion || "").trim();
      const ubicacion = String(args.direccionOBarrio || args.ubicacion || "").trim();
      const rawFecha = args.fechaHora || args.fechaHoraIso;
      const parsedTime = rawFecha ? new Date(rawFecha).getTime() : NaN;
      const fechaHora = !Number.isNaN(parsedTime) ? parsedTime : Date.now() + 86400000;
      const { sendNativeWhatsAppEvent } = await import("../../whatsapp-match");
      const eventSent = await sendNativeWhatsAppEvent(userId, {
        name: titulo,
        description: descripcion,
        location: ubicacion,
        startTime: fechaHora
      });
      return {
        toolType: "evento",
        resultJson: {
          solicitud: "evento_inmobiliario",
          titulo,
          ubicacion,
          enviado: eventSent,
          reporteOficial: `📅 *Evento Agendado:* "${titulo}" en ${ubicacion || "Virtual"}.`
        }
      };
    }
    case "enviar_catalogo_servicios": {
      const catalogMsg =
        `🏬 *CATÁLOGO DE SERVICIOS Y PORTAL WEB — VECY BIENES RAÍCES*\n\n` +
        `🌐 *Portal Oficial:* https://vecy-bienes-raices.vercel.app/\n` +
        `🤖 *JanIA Landing:* https://vecy-bienes-raices.vercel.app/jania\n` +
        `📱 *Canal de WhatsApp:* https://whatsapp.com/channel/0029Vb5iYUYCMY0A94zqti1b\n\n` +
        `📌 *Servicios Destacados:*\n` +
        `• Cruce de Inmuebles y Demandas en Tiempo Real (Match 40/20/40).\n` +
        `• Verificación Preventiva de Identidad (ADRES, Policía, Procuraduría, Contraloría, RUES).\n` +
        `• Asistencia Factura Predial Bogotá y Paz y Salvo IDU.\n` +
        `• Liquidación Notarial y de Registro 50/50.\n` +
        `• Sondeos de Mercado y Avalúos Digitales.\n\n` +
        `_¿Deseas activar alguno de estos servicios de inmediato?_ 🤝✨`;
      return {
        toolType: "catalogo",
        resultJson: {
          solicitud: "catalogo_servicios",
          reporteOficial: catalogMsg,
          exitoso: true
        }
      };
    }
    case "navegar_o_buscar_web": {
      const url = String(args.url || "").trim();
      const query = String(args.query || rawUserText || "").trim();
      if (url && /^https?:\/\//i.test(url)) {
        const pageData = await fetchWebUrlContent(url);
        return {
          toolType: "web",
          resultJson: {
            solicitud: "navegacion_web",
            url,
            titulo: pageData.title,
            contenido: pageData.content,
            exitoso: pageData.success
          }
        };
      }
      const { searchWebGrounding } = await import("../../scraper");
      const searchRes = await searchWebGrounding(query);
      return {
        toolType: "web",
        resultJson: {
          solicitud: "busqueda_web",
          query,
          fuente: searchRes.source,
          resumen: searchRes.summary,
          resultados: searchRes.results,
          exitoso: searchRes.success
        }
      };
    }
    case "consultar_catalogo_inmuebles_vecy": {
      const tipoInmueble = String(args.tipoInmueble || "").toLowerCase().trim();
      const tipoNegocio = String(args.tipoNegocio || "").toLowerCase().trim();
      const zona = String(args.zona || "").trim();
      const precioMax = Number(args.precioMaximo || 0);

      const db = await getDb();
      let foundProps: any[] = [];
      if (db) {
        try {
          const conditions: any[] = [eq(properties.available, true)];
          if (tipoInmueble) {
            conditions.push(sql`LOWER(${properties.propertyType}) LIKE ${'%' + tipoInmueble + '%'}`);
          }
          if (tipoNegocio) {
            conditions.push(sql`LOWER(${properties.transactionType}) LIKE ${'%' + tipoNegocio + '%'}`);
          }
          if (zona) {
            conditions.push(sql`LOWER(${properties.zone}) LIKE ${'%' + zona.toLowerCase() + '%'}`);
          }
          if (precioMax > 0) {
            conditions.push(sql`(${properties.price} <= ${precioMax} OR ${properties.rentPrice} <= ${precioMax})`);
          }
          foundProps = await db
            .select({
              id: properties.id,
              name: properties.name,
              propertyType: properties.propertyType,
              transactionType: properties.transactionType,
              zone: properties.zone,
              price: properties.price,
              rentPrice: properties.rentPrice,
              areaTotal: properties.areaTotal,
              bedrooms: properties.bedrooms,
              bathrooms: properties.bathrooms,
              garages: properties.garages,
              description: properties.description
            })
            .from(properties)
            .where(and(...conditions))
            .orderBy(desc(properties.id))
            .limit(5);
        } catch (dbErr: any) {
          console.warn("[consultar_catalogo_inmuebles_vecy] Error querying DB:", dbErr?.message);
        }
      }

      const totalProps = foundProps.length;
      let avgM2Price = 0;
      if (totalProps > 0) {
        const prices = foundProps.map(p => {
          const pr = Number(p.price || p.rentPrice || 0);
          const ar = Number(p.areaTotal || 0);
          return ar > 0 && pr > 0 ? pr / ar : 0;
        }).filter(v => v > 0);
        if (prices.length > 0) {
          avgM2Price = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
        }
      }

      return {
        toolType: "catalogo_inmuebles",
        resultJson: {
          solicitud: "catalogo_inmuebles_vecy",
          tipoInmueble,
          tipoNegocio,
          zona,
          totalEncontrados: totalProps,
          precioPromedioM2: avgM2Price,
          inmuebles: foundProps.map(p => ({
            codigo: `#P${p.id}`,
            titulo: p.name,
            tipo: p.propertyType,
            operacion: p.transactionType,
            zona: p.zone,
            precioVenta: p.price ? `$${Number(p.price).toLocaleString('es-CO')} COP` : undefined,
            precioCanon: p.rentPrice ? `$${Number(p.rentPrice).toLocaleString('es-CO')} COP/mes` : undefined,
            areaM2: p.areaTotal ? `${p.areaTotal} m²` : undefined,
            habitaciones: p.bedrooms,
            banos: p.bathrooms,
            garajes: p.garages
          })),
          contactoBroker: "Eduardo Rivera & Jani Alves — WhatsApp Oficial +57 316 656 9719"
        }
      };
    }
    default:
      return {
        toolType: "sondeo",
        resultJson: { error: `Herramienta desconocida: ${toolName}` }
      };
  }
}

export async function synthesizeToolResponseWithGemini(
  userId: string,
  userName: string,
  toolType: JaniaDmToolType,
  toolJson: Record<string, any>,
  userMessage: string,
  isEduardo: boolean,
  isJani: boolean,
  displayName: string
): Promise<string> {
  const isFreeTool = toolType !== "sondeo" && toolType !== "match";
  if (isFreeTool) {
    await incrementFreeServicesCount(userId);
  }
  const rawReport = toolJson.reporteOficial || (toolType === "sondeo" ? JSON.stringify(toolJson) : "");

  // 1. Bypass exclusivo para herramientas con documentos oficiales descargables o formatos especiales (Predial, IDU, Notarial y Match)
  const isDirectBypass = rawReport && (
    rawReport.includes("PAZ Y SALVO") ||
    rawReport.includes("FACTURA PREDIAL") ||
    rawReport.includes("LIQUIDACIÓN ESTIMADA") ||
    rawReport.includes("COINCIDENCIA") ||
    rawReport.includes("MATCH")
  );
  if (isDirectBypass) {
    return rawReport.includes("COINCIDENCIA") || rawReport.includes("MATCH")
      ? rawReport
      : await formatPoliteToolDelivery(userId, userName, toolType as any, rawReport, true);
  }

  const userVerifiedReview = await isUserVerifiedGoogleReview(userId);
  const isVip = isEduardoOrJani(userId);
  const askReview = !userVerifiedReview && !isVip && (await shouldAskForGoogleReview(userId));

  let specialToolInstructions = "";
  if (toolType === "cedula") {
    specialToolInstructions =
      `- HERRAMIENTA: Verificación Oficial de Identidad y Antecedentes (Personas Naturales: CC, CE, PPT, Pasaporte).\n` +
      `- RESPUESTA PRIORITARIA Y DIRECTA A LA CONSULTA: Si el usuario preguntó expresamente por la EPS, afiliación en salud o a quién pertenece la cédula/documento, responde de inmediato y con máxima claridad desde el primer párrafo indicando el nombre completo del titular y la EPS en la que se encuentra afiliado en ADRES / BDUA.\n` +
      `- CERO OMISIÓN DE EPS: Si en los datos estructurados figura la EPS (ej. Capital Salud EPS-S, Sanitas EPS, Sura EPS, Nueva EPS), es MANDATORIO e INDISPENSABLE nombrarla textualmente junto con su estado y régimen de afiliación.\n` +
      `- REDACCIÓN 100% LIBRE Y CONVERSACIONAL: Cero plantillas rígidas prefabricadas, cero encabezados acartonados o viñetas robóticas. Redacta de forma fresca, original, corta y humana como experta de VECY.\n` +
      `- CERO ALUCINACIÓN: Respeta rigurosamente TODOS los datos reales verificados obtenidos de las entidades oficiales del Estado:\n` +
      `  * Nombre oficial de la persona y número de documento validado.\n` +
      `  * Policía Nacional: Antecedentes penales / requerimientos judiciales.\n` +
      `  * Procuraduría General: Sanciones disciplinarias e inhabilidades vigentes.\n` +
      `  * Contraloría General: Boletín de Responsables Fiscales (SIRECI).\n` +
      `  * ADRES (BDUA): Aseguramiento en salud indicando el nombre real y limpio de la EPS (ej. Sanitas EPS, Capital Salud EPS-S, Sura EPS, Nueva EPS), estado y régimen.\n` +
      `- Si el documento no aparece indexado en las bases censales en línea, indícalo con honestidad y claridad para que verifique el número físico, o explica que los regímenes de excepción (Fuerzas Militares, Policía, Magisterio, etc.) no figuran en el censo general BDUA.\n` +
      `- NOTA DE HÁBEAS DATA SUTIL AL FINAL: Ubica al final una línea breve y elegante de Hábeas Data (Ley 1581/12 y Art. 15 C.P.).\n` +
      (askReview
        ? `- CIERRE CERCANO Y PERSUASIVO CON RESEÑA EN GOOGLE: Cierra de forma muy charlada, cercana, simpática y persuasiva invitando a calificarnos y dejarnos un lindo comentario en Google (https://g.page/r/CctNbwU6UpX5EBM/review), explicándole que no le toma ni un minuto y nos permite mantener todas estas herramientas 100% gratuitas para el gremio y la comunidad inmobiliaria. Y aclárale con dulzura que si no sabe cómo dejar la calificación o el comentario, con el mayor gusto le explicas el paso a paso detallado si te lo pide.\n`
        : `- REGLA ESTRICTA DE RESEÑA: No pidas ni menciones reseña de Google a este usuario.\n`);
  } else if (toolType === "empresa") {
    specialToolInstructions =
      `- HERRAMIENTA: Consulta Empresarial Oficial RUES (Confecámaras / Cámaras de Comercio de Colombia / DIAN).\n` +
      `- REDACCIÓN 100% LIBRE Y CONVERSACIONAL: Cero plantillas rígidas prefabricadas de 4 secciones, cero formatos acartonados ni viñetas robóticas. Redacta de forma fresca, ejecutiva, original y charlada.\n` +
      `- CERO ALUCINACIÓN: Respeta estrictamente TODOS los datos reales obtenidos de RUES:\n` +
      `  * Razón social oficial, NIT y Dígito de Verificación (DV).\n` +
      `  * Estado de la matrícula mercantil (ej. Activa) y Cámara de Comercio donde está inscrita.\n` +
      `  * Tipo de sociedad / organización jurídica y actividad económica principal (CIIU).\n` +
      `  * Representante Legal Principal: Si el RUES arroja el Representante Legal Principal, menciónalo de forma fluida y natural dentro de tu respuesta (nombre, documento y que cuenta con plenas facultades estatutarias para obligar a la sociedad).\n` +
      `  * Si hay suplentes o establecimientos relevantes, menciónalos con brevedad.\n` +
      `- SI LA EMPRESA NO FUE ENCONTRADA: Si el resultado indica que no se localizó la empresa, informa con total honestidad que no se halló registro en las 57 Cámaras de Comercio del país y pídele con amabilidad el número de NIT para una búsqueda exacta.\n` +
      `- CERO SEGUNDO MENSAJE FORZADO: NO encoles ni repreguntes de forma robótica si desea verificar al representante. JanIA lo menciona en su única respuesta con naturalidad.\n` +
      `- NOTA DE HÁBEAS DATA SUTIL AL FINAL: Incluye una línea breve de publicidad mercantil y hábeas data (Art. 26 C.Co. y Ley 1581/12).\n` +
      (askReview
        ? `- CIERRE CERCANO Y PERSUASIVO CON RESEÑA EN GOOGLE: Cierra de forma muy charlada, cercana y persuasiva invitando al usuario a calificarnos en Google (https://g.page/r/CctNbwU6UpX5EBM/review), explicándole que no le toma ni un minuto y nos permite mantener estas herramientas 100% gratuitas para el gremio inmobiliario. Y aclárale con amabilidad que si no sabe cómo dejar la calificación, tú con todo gusto le explicas el paso a paso si te lo pide.\n`
        : `- REGLA ESTRICTA DE RESEÑA: No pidas ni menciones reseña de Google a este usuario.\n`);
  } else if (toolType === "web") {
    specialToolInstructions =
      `- HERRAMIENTA: Navegación y Lectura Web Abierta en Tiempo Real.\n` +
      `- Extrae y analiza los datos reales de la página o portal consultado, entregando síntesis ejecutiva, directa y sin rodeos al usuario.\n`;
  } else if (toolType === "catalogo_inmuebles") {
    specialToolInstructions =
      `- HERRAMIENTA: Consulta de Catálogo Oficial de VECY BIENES RAÍCES (Atención Bróker 3166569719).\n` +
      `- Presenta de forma clara y organizada las propiedades encontradas con su código (#P...), tipo, ubicación, precio o canon y metraje, junto con el valor promedio de $/m² de la zona.\n` +
      `- Invita cordialmente a comunicarse con Eduardo Rivera o Jani Alves a la línea de atención de bróker (+57 316 656 9719) para coordinar visitas o recibir dossier completo.\n`;
  } else if (toolType === "sondeo") {
    specialToolInstructions =
      `- HERRAMIENTA: Sondeo Técnico Inmobiliario y Estudio de Valor Comercial ($/m² y Canon sugerido).\n` +
      `- EXPERTA AVALUADORA VECY (ESTRUCTURA CLARA, DIRECTA Y ATRACTIVA EN WHATSAPP):\n` +
      `  * Entrega de inmediato el valor estimado del m² homologado para la zona/barrio, el rango de precio comercial de venta sugerido y el canon estimado de arriendo.\n` +
      `  * Menciona que el estudio contrasta la dinámica de portales de finca raíz aliados (Metrocuadrado, FincaRaíz, CienCuadras) y coeficientes de homologación ACM (antigüedad, piso, garajes, amenidades).\n` +
      `  * PREDIOS CON POTENCIAL CONSTRUCTOR Y NORMA URBANA (POT BOGOTÁ DEC. 555/2021 - SINUPOT):\n` +
      `    Si el predio es lote, bodega, edificio, casa-lote o casa con vocación de desarrollo (según 'potNormaUrbana'), incluye la sección de potencial urbanístico explicando el tratamiento (Renovación Urbana o Consolidación), mezcla de usos y edificabilidad estimada, e invita a verificar con el CHIP catastral en el Visor Geográfico SINUPOT (https://www.sdp.gov.co/content/sinupot-0) de la Secretaría Distrital de Planeación.\n` +
      `- CONTINUIDAD CONVERSACIONAL Y METAS (GOAL TRACKING):\n` +
      `  * Si el usuario consultó el valor o complementó datos (ej. año de construcción "Nov 2006"), ENTREGA EL VALOR Y CÁLCULO DE INMEDIATO. Queda TERMINANTEMENTE PROHIBIDO desviar la conversación hacia visitas presenciales o planes publicitarios sin haber entregado primero el sondeo de precio que el usuario pidió.\n` +
      `- DOCTRINA DE SONDEOS VS. AVALÚO PROFUNDO CERTIFICADO (DOCTRINA EDUARDO A. RIVERA):\n` +
      `  * El sondeo preliminar se entrega de forma ágil con los datos físicos aportados sin frenar al usuario por falta de documentos.\n` +
      `  * Al FINAL de la entrega del sondeo (o si el usuario, sea agente, abogado, asegurador, notario, prestamista, propietario, comprador o inversionista, insiste en que requiere un avalúo comercial formal más profundo o certificación jurídica exacta para blindar el valor al milímetro), sugiere amablemente que se podrán cotejar: 1) Certificado de Tradición y Libertad (CTL) actualizado (< 30 días), 2) Copia de la Escritura Pública, y 3) Factura Predial vigente.\n` +
      `- CROSS-SELLING EXACTO DE FACTURA PREDIAL EN CHAT (DOCTRINA EDUARDO A. RIVERA):\n` +
      `  * Si el usuario menciona que no tiene el predial a mano, ofrécele textualmente: "¡No te preocupes por el predial! En VECY contamos con expedición oficial de Bogotá y te lo puedo entregar aquí mismo en el chat en formato PDF en menos de un minuto. Solo compárteme el código CHIP del predio (empieza por AAA...) y el número de cédula o Nit del propietario y te lo descargo de una vez." (Ambos datos son obligatorios).\n` +
      `- SERVICIO DE REGISTRO DIRECTO Y PUBLICACIÓN EN GRUPO 1 OFICIAL (DOCTRINA EDUARDO A. RIVERA):\n` +
      `  * Si el usuario desea comercializar o buscar un inmueble, JanIA le ofrece con gusto estructurar y subir su Oferta o Demanda directamente en este chat para participar en el motor de MATCHING de VECY, o compartirla en el Grupo 1 Oficial: 𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗢🏠 𝗢𝗙𝗘𝗥𝗧𝗔𝗦🏷️ 𝗬 𝗗𝗘𝗠𝗔𝗡𝗗𝗔𝗦📝 𝗖𝗢𝗟𝗢𝗠𝗕𝗜𝗔🇨🇴 (https://chat.whatsapp.com/GzMbjNs1P2tHI7D0V4h8wZ).\n`;
  } else if (toolType === "registro_inmueble") {
    specialToolInstructions =
      `- HERRAMIENTA: Registro y Optimización de Inmuebles y Demandas en VECY Network con Motor de MATCH.\n` +
      `- INGESTA ACTIVA Y CONFIRMACIÓN AL USUARIO:\n` +
      `  * Confirma al usuario con señorío, calidez y naturalidad humana que su oferta o requerimiento ha sido registrado e indexado exitosamente en la base de datos de VECY Network para participar en el motor inteligente de matching.\n` +
      `  * Si el usuario es propietario o comprador directo: Explícale que VECY Bienes Raíces (+57 316 656 9719) respalda su gestión y lo conecta con compradores, inquilinos calificados y peritos aliados.\n` +
      `  * Si es colega/agente y aceptó 40/20/40: Confirma su estatus de Aliada Prioritaria en la red colaborativa.\n` +
      `  * Si es colega/agente y eligió 50/50: Confirma que ingresó a la mesa de coincidencias bajo la pestaña [🛡️50/50].\n` +
      `- ENTREGA DE RESULTADOS DEL MATCH (DOCTRINA EDUARDO A. RIVERA):\n` +
      `  * Si 'totalMatchesFound' > 0 (SÍ HAY COINCIDENCIAS / MATCHES):\n` +
      `    1. Anúnciale con alegría y profesionalismo que el radar detectó de inmediato coincidencia(s) de alta afinidad (entre el 85% y 100%).\n` +
      `    2. Entrégale los códigos de coincidencia oficiales (ej. #M15649, #M15650), el porcentaje de afinidad (ej. 90%) y las características generales del inmueble (tipología, zona/barrio, canon o precio y especificaciones físicas).\n` +
      `    3. BLINDAJE DE PRIVACIDAD: JAMÁS reveles nombres personales ni números de teléfono de la contraparte en este chat.\n` +
      `    4. LLAMADO DE ACCIÓN MANDATORIO (DOCTRINA MODELADA POR EDUARDO A. RIVERA): Explícale textualmente con esta formulación sincera, cálida y directa:\n` +
      `       "¡Tenemos coincidencia en la red! Encontramos opciones con los códigos [códigos #M...]. Pero solamente te puedo dar los códigos MATCH ya que con estos debes comunicarte con nuestro equipo al 3166569719 (+57 316 656 9719) y se los vas a pasar a quien te conteste diciéndole que Yo JanIA te los di para que ellos los ubiquen en nuestra mesa de MATCH y empiecen a hacer la gestión de conectar las puntas y lograr una visita y posteriormente el cierre del negocio."\n` +
      `  * Si 'totalMatchesFound' === 0 (NO HAY COINCIDENCIAS INMEDIATAS):\n` +
      `    1. ATERRIZAJE SINCERO DE MERCADO ANTE PRESUPUESTOS INVIABLES (CERO FALSAS EXPECTATIVAS - DOCTRINA EDUARDO A. RIVERA):\n` +
      `       Si el presupuesto del usuario está notoriamente desfasado por debajo de la realidad de mercado de la zona (ej. buscar arriendo en El Chicó / Parque de la 93 por $3.000.000 COP, cuando el canon real arranca desde $4.400.000 - $4.500.000 COP en adelante con admón): NO le des falsas ilusiones diciéndole solo que 'está en el radar 24/7'. Sé sincera, honesta y empática como perita avaluadora experta: aterriza al cliente explicándole con solvencia que en ese cuadrante los cánones reales arrancan muy por encima de su valor y que es prácticamente imposible o extraordinariamente atípico hallar opciones a ese precio. Bríndale consultoría estratégica con dos caminos viables: 1) Ajustar el presupuesto al rango real de la zona, o 2) Explorar sectores alternativos cercanos con excelente calidad de vida donde su presupuesto sí sea muy competitivo (ej. Chapinero Alto, Pasadena, Pontevedra, Cedritos, Santa Bárbara). Y aclárale que de todas formas su búsqueda queda inscrita en el radar 24/7 por si surge una oportunidad atípica de remate o ganga, pero con absoluta sinceridad y los pies en la tierra.\n` +
      `    2. Si el presupuesto es normal pero no hay inventario en este instante: Infórmale con total honestidad y amabilidad que en este instante exacto no hay un cruce disponible en inventario que cumpla con el filtro estricto de afinidad (85%-100%), pero que su requerimiento ya quedó 100% activo en el radar 24/7 de la red colaborativa de VECY, por lo que en cuanto ingrese una opción compatible, el equipo de VECY (Jani y Eduardo al +57 316 656 9719) lo contactará de inmediato.\n` +
      `    3. Ofrécele también que si lo desea, puede comunicarse directamente con Eduardo Rivera y Jani Alves al +57 316 656 9719 para ubicar su búsqueda de forma prioritaria en nuestra mesa de gestión comercial.\n` +
      `- JANIA COMO VENDEDORA CONSULTIVA (INBOUND HUBSPOT PARA JANIA - DOCTRINA EDUARDO A. RIVERA):\n` +
      `  Aprovecha de forma oportuna y sutil (sin saturar) para recordar que en VECY contamos con sondeos técnicos de $/m² y canon con POT Bogotá, expedición de Factura Predial oficial en PDF en menos de un minuto con el CHIP, validación de antecedentes de contrapartes en ADRES y Policía para blindar negocios, y contratos digitales con firma electrónica gratuita.\n`;
  }

  const synthPrompt = [
    {
      role: "system",
      content:
        `Eres JanIA, la inteligencia artificial inmobiliaria oficial de VECY BIENES RAÍCES en Colombia.\n` +
        `Acabas de ejecutar la herramienta correspondiente a: ${toolType}.\n` +
        `Datos estructurados del sistema en JSON:\n` +
        `${JSON.stringify(toolJson, null, 2)}\n\n` +
        `INSTRUCCIONES DE REDACCIÓN (NIVEL ARGON — VOZ LAOMEDEIA):\n` +
        `- Redacta la respuesta directamente para el usuario (${displayName || "colega"}), con total calidez, solvencia, concisión y persuasión de IA pura.\n` +
        `- CONTINUIDAD CONVERSACIONAL (CERO SALUDOS REPETIDOS): Si la conversación ya está en curso hoy, está TERMINANTEMENTE PROHIBIDO saludar de nuevo (JAMÁS digas "¡Hola!", "¡Buenos días!", "Qué gusto saludarte", ni "Soy JanIA..."). Ve DIRECTO al grano con la explicación o reporte.\n` +
        specialToolInstructions +
        `- Si es un sondeo de mercado, entrega el valor por m² homologado, valor comercial sugerido, canon estimado y factores de ajuste según tu rol de Perita Avaluadora.\n` +
        `- Si es una consulta de matches, explica con claridad el cruce encontrado de forma conversacional y ejecutiva.\n` +
        `- Explica con claridad los datos técnicos sin tecnicismos robóticos ni plantillas rígidas.\n` +
        `- Mantén concisión y estructura óptima para WhatsApp (*negritas*, viñetas limpias).\n` +
        `- Aplica ortografía estricta en español (signos ¡ y ¿, mayúscula inicial).\n`
    },
    {
      role: "user",
      content: userMessage
    }
  ];

  try {
    const res = await invokeLLM({ messages: synthPrompt, highReasoning: true });
    let text = res.choices[0]?.message?.content || "";
    if (text) {
      text = sanitizeResponseMarkdown(text.trim());
      if (isFreeTool) {
        text = await formatPoliteToolDelivery(userId, userName, toolType as any, text, true);
      }
      return text;
    }
  } catch (err: any) {
    console.warn("[synthesizeToolResponseWithGemini] Error invoking LLM:", err?.message);
  }

  // Fallback conversacional orgánico en caso de que LLM no esté disponible o arroje timeout
  let fallbackText = "";
  if (toolType === "cedula" && toolJson) {
    const doc = toolJson.numeroDocumento || "";
    const tipo = toolJson.tipoDocumento || "CC";
    const name = toolJson.nombreOficial;
    const eps = toolJson.adres?.eps;
    const estadoEps = toolJson.adres?.estado;
    const regEps = toolJson.adres?.regimen;
    const pol = toolJson.policia || "Sin antecedentes judiciales pendientes";
    const pgn = toolJson.procuraduria || "No registra sanciones disciplinarias vigentes";
    const cgr = toolJson.contraloria || "Sin reporte en Boletín de Responsables Fiscales (SIRECI)";
    if (name) {
      const epsDetail = eps
        ? `En el sistema de salud (ADRES BDUA) se encuentra afiliada/o a *${eps}* (${estadoEps || "ACTIVO"}${regEps ? ` — ${regEps}` : ""}).`
        : `En el censo general ADRES (BDUA) no registra afiliación ordinaria (habitual en regímenes especiales o de excepción: Fuerzas Militares, Policía, Magisterio, etc.).`;
      fallbackText = `Te confirmo que he verificado la ${tipo} ${doc} a nombre de *${name}* en las plataformas oficiales del Estado.\n\n🏥 ${epsDetail}\n\n⚖️ En antecedentes: Policía Nacional registra ${pol.toLowerCase()}, Procuraduría General ${pgn.toLowerCase()} y Contraloría General ${cgr.toLowerCase()}. Todo validado para tu seguridad jurídica.\n\n⚖️ _Validación oficial bajo Ley 1581 de 2012 y Art. 15 C.P._\n\n¿Nos regalas un minuto con tu calificación en Google? 👉 https://g.page/r/CctNbwU6UpX5EBM/review ¡Nos ayuda un montón para seguir ofreciendo estas herramientas gratuitas para el gremio! 🤝✨`;
    } else {
      fallbackText = `Revisé el documento ${tipo} ${doc} en las plataformas oficiales, pero no se encuentra registrado en los censos en línea. Por favor verifica que el número físico coincida o si corresponde a un documento de extranjería.\n\n⚖️ _Validación oficial bajo Ley 1581 de 2012._`;
    }
  } else if (toolType === "empresa" && toolJson) {
    if (toolJson.exitoso && toolJson.razonSocial) {
      const nit = toolJson.nitCompleto || toolJson.nit || "";
      const razon = toolJson.razonSocial;
      const camara = toolJson.camaraComercio || "Cámara de Comercio";
      const estado = toolJson.estado || "Activa";
      const ciiu = toolJson.ciiuPrincipal || "";
      const rep = toolJson.representantePrincipal;
      fallbackText = `Ya consulté en RUES la empresa *${razon}* (NIT ${nit}). Se encuentra con matrícula mercantil *${estado}* en la ${camara}. Su actividad económica principal es ${ciiu || "mercantil registrada"}.${rep ? ` Como Representante Legal Principal figura *${rep.nombre}* (${rep.tipoDocumento} ${rep.numeroFormateado}), quien cuenta con plenas facultades estatutarias para obligar y contratar a nombre de la sociedad.` : ""}\n\n⚖️ _Publicidad mercantil RUES bajo Art. 26 C.Co. y Ley 1581/12._\n\n¿Nos regalas un minutico con tu calificación en Google? 👉 https://g.page/r/CctNbwU6UpX5EBM/review ¡Tu apoyo nos permite mantener estas consultas 100% gratuitas para todo el gremio inmobiliario! 🤝✨`;
    } else {
      fallbackText = `No encontré ninguna empresa registrada con ese nombre en el Registro Único Empresarial y Social (RUES). Para realizar una búsqueda oficial exacta en Cámara de Comercio, por favor compárteme el número de NIT. 🤝`;
    }
  } else if (toolType === "registro_inmueble" && toolJson) {
    if (toolJson.esIncompleto && toolJson.guiaFichaTecnica) {
      fallbackText = toolJson.guiaFichaTecnica;
    } else {
      fallbackText = `¡Listo! Quedó estructurada e ingresada con éxito a nuestra base de datos para participar en el motor de coincidencias de VECY BIENES RAÍCES. En el instante exacto en que detectemos una opción compatible en la red, te avisamos de inmediato para coordinar el cruce 🚀🏠✨.`;
    }
  } else if (toolType === "web" && toolJson) {
    if (toolJson.titulo || toolJson.contenido) {
      fallbackText = `He consultado el enlace web *${toolJson.titulo || 'compartido'}*. ${toolJson.contenido ? toolJson.contenido.slice(0, 280) + '...' : ''} ¿Deseas que analice algún aspecto en particular? 🌐✨`;
    } else {
      fallbackText = `Revisé el enlace web compartido, pero no pude acceder a todo su contenido público. Compárteme los datos clave o cuéntame de qué se trata para colaborarte con todo el gusto 🤝.`;
    }
  } else if (toolType === "catalogo_inmuebles" && toolJson) {
    fallbackText = `He consultado nuestro catálogo oficial de VECY BIENES RAÍCES. Para recibir el portafolio completo con fotografías y fichas de la zona, también puedes comunicarte directamente con nuestra línea de atención bróker al +57 316 656 9719 🏢✨.`;
  } else {
    fallbackText = rawReport || `Con mucho gusto, ya procesé tu solicitud en nuestro sistema de VECY BIENES RAÍCES 🤝✨.`;
  }

  return rawReport && (rawReport.includes("COINCIDENCIA") || rawReport.includes("MATCH"))
    ? rawReport
    : await formatPoliteToolDelivery(userId, userName, toolType as any, fallbackText, true);
}

export const ALL_DM_TOOL_TYPES = [
  "cedula",
  "predial",
  "idu",
  "notarial",
  "sondeo",
  "match",
  "empresa",
  "encuesta",
  "contacto",
  "evento",
  "catalogo",
  "web",
  "catalogo_inmuebles",
  "registro_inmueble"
] as const;

function isKnownToolType(val: string): boolean {
  return ALL_DM_TOOL_TYPES.includes(val.toLowerCase() as any);
}

/**
 * Envuelve la entrega de cualquier herramienta con cortesía,
 * asegurando compatibilidad bi-direccional con:
 * - Firma histórica: formatPoliteToolDelivery(userId, userName, toolType, contentText, isFreeTool)
 * - Firma directa: formatPoliteToolDelivery(contentText, userName, userId)
 * Garantiza de forma incondicional que NUNCA se devuelva un ID de usuario, teléfono o JID (@lid/@s.whatsapp.net).
 */
export function formatPoliteToolDelivery(
  arg1: string,
  arg2?: string,
  arg3?: string,
  arg4?: string,
  _legacyArg?: any
): string {
  const isIdentifier = (val?: string): boolean => {
    if (!val || typeof val !== "string") return false;
    const trimmed = val.trim();
    return (
      trimmed.includes("@lid") ||
      trimmed.includes("@s.whatsapp.net") ||
      trimmed.includes("@g.us") ||
      trimmed.includes("@broadcast") ||
      /^\+?\d{8,18}$/.test(trimmed)
    );
  };

  let effectiveResponse = "";

  // 1. Si arg4 contiene texto y no es un identificador de usuario, es el payload textual de la herramienta
  if (typeof arg4 === "string" && arg4.trim().length > 0 && !isIdentifier(arg4)) {
    effectiveResponse = arg4;
  }
  // 2. Si arg1 no es un identificador, es el texto directo provisto (firma moderna)
  else if (typeof arg1 === "string" && arg1.trim().length > 0 && !isIdentifier(arg1)) {
    effectiveResponse = arg1;
  }
  // 3. Fallbacks secundarios de extracción
  else if (typeof arg4 === "string" && arg4.trim().length > 0) {
    effectiveResponse = arg4;
  } else if (typeof arg3 === "string" && arg3.trim().length > 0 && !isIdentifier(arg3) && !isKnownToolType(arg3)) {
    effectiveResponse = arg3;
  }

  // 4. Blindaje estricto: Si tras toda la resolución el texto sigue siendo un identificador o JID/LID crudo, se neutraliza
  if (isIdentifier(effectiveResponse)) {
    return "";
  }

  return (effectiveResponse || "").trim();
}

/**
 * Remueve de forma exhaustiva e iterativa cualquier saludo inicial, vocativo redundante,
 * frase de cortesía repetida ("Qué gusto saludarte", "Es un placer", "En este nuevo día")
 * y emojis de saludo al comienzo del texto (Doctrina v33.07 / v33.17).
 */
export function stripLeadingGreetingsAndCourtesies(text: string): string {
  let cleaned = (text || "").trim();
  if (!cleaned) return "";

  // 1. Erradicar frases redundantes concatenadas como "Qué gusto saludarte. Qué gusto saludarte en este nuevo día" o "¡Hola, Eduardo! A tu disposición."
  cleaned = cleaned.replace(
    /(?:(?:qu[eé]|que)\s+gusto\s+(?:de\s+)?saludarte[^.!?\n:]*[.!?\n:]\s*)+(?:(?:qu[eé]|que)\s+gusto\s+(?:de\s+)?saludarte[^.!?\n:]*[.!?\n:]?\s*)/gi,
    ""
  );
  cleaned = cleaned.replace(
    /(?:¡?(?:hola|buen[ao]s?\s+(?:d[ií]as?|tardes?|noches?)),?\s*(?:eduardo|jani)?!?:?\s*(?:a\s+tu\s+disposici[oó]n\.?:?\s*)?)+/gi,
    ""
  );

  // 2. Patrones de saludos al inicio (con signos ¡ o sin ellos, permitiendo dos puntos :)
  const greetingPattern = /^¡?(?:hola|buen[ao]s?\s+(?:d[ií]as?|tardes?|noches?)|saludos?|bienvenid[ao]s?|estimad[ao]s?)\b[^!.\n?:]*[!.\n?:]?\s*/i;
  const courtesyPattern = /^¡?(?:(?:qu[eé]|que)\s+gusto\s+(?:de\s+)?saludarte(?:[^\n.!?:]*)|es\s+un\s+(?:verdadero\s+)?placer\s+(?:tenerte|saludarte)(?:[^\n.!?:]*)|a\s+tu\s+disposici[oó]n(?:[^\n.!?:]*)|c[oó]mo\s+est[aá]s(?:[^\n.!?:]*)|en\s+este\s+nuevo\s+d[ií]a(?:[^\n.!?:]*))[!.\n?:]?\s*/i;
  const janiaIntroPattern = /^¡?(?:soy\s+jania[^\n.!?:]*|tu\s+inteligencia\s+artificial[^\n.!?:]*|espero\s+te\s+encuentres\s+muy\s+bien[^\n.!?:]*)[!.\n?:]?\s*/i;
  const emojiPattern = /^(?:👋|🤝|✨|🏘️|😊|🤖)+\s*/;

  let changed = true;
  let iterations = 0;
  while (changed && iterations < 8) {
    const before = cleaned;
    cleaned = cleaned.replace(greetingPattern, "");
    cleaned = cleaned.replace(courtesyPattern, "");
    cleaned = cleaned.replace(janiaIntroPattern, "");
    cleaned = cleaned.replace(emojiPattern, "");
    cleaned = cleaned.trim();
    changed = cleaned !== before;
    iterations++;
  }

  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned.trim();
}

/**
 * Sanitiza ortografía estricta en español (apertura de signos ¡, ¿, mayúscula inicial)
 * y garantiza una única estructura limpia e indivisible de saludo en DMs,
 * erradicando de raíz la duplicación o concatenación de frases redundantes (Doctrina v33.07).
 */
export function sanitizeDmOrthographyAndGreeting(
  text: string,
  isEduardo: boolean,
  isJani: boolean,
  displayName?: string,
  hasPriorHistory: boolean = false,
  timeSalutation?: string
): string {
  let cleaned = (text || "").trim();
  if (!cleaned) return cleaned;

  const currentSalutation = timeSalutation || getGreetingByTime();

  // Corregir erratas frecuentes como "Buenas días" a "Buenos días"
  cleaned = cleaned.replace(/buenas\s+d[ií]as/gi, "Buenos días");

  // 1. Erradicar frases redundantes concatenadas como "Qué gusto saludarte. Qué gusto saludarte en este nuevo día"
  cleaned = cleaned.replace(
    /(?:(?:qu[eé]|que)\s+gusto\s+(?:de\s+)?saludarte[^.!?\n]*[.!?\n]?\s*)+(?:(?:qu[eé]|que)\s+gusto\s+(?:de\s+)?saludarte[^.!?\n]*[.!?\n]?\s*)/gi,
    ""
  );

  // 2. Corregir cualquier saludo o vocativo que inicie en minúscula o use el obsoleto "Hola"
  cleaned = cleaned.replace(/^estimad([ao]s?)\s+([a-záéíóúñ]+)!/i, (_m, ending, name) => {
    return `¡Estimad${ending.toLowerCase()} ${name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()}!`;
  });
  const nameSalutation = displayName ? `¡${currentSalutation}, ${displayName}! 👋 ` : `¡${currentSalutation}! 👋 `;
  cleaned = cleaned.replace(/^¡?hola\s+([a-záéíóúñ]+)[,!.\s]+/i, (_m, name) => `¡${currentSalutation}, ${name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()}! 👋 `);
  cleaned = cleaned.replace(/^¡?hola\b[!]?\s*/i, nameSalutation);
  cleaned = cleaned.replace(/^buen([ao]s?\s+(?:d[ií]as|tardes|noches))\b/i, (m) => `¡${m.charAt(0).toUpperCase() + m.slice(1)}!`);

  // 3. Estructura única e indivisible para directores VIP, familiares o primer saludo del día (Doctrina v33.07 / v33.13)
  if (isEduardo) {
    if (!hasPriorHistory) {
      const body = stripLeadingGreetingsAndCourtesies(cleaned);
      cleaned = body ? `¡${currentSalutation}, Eduardo! 👋 ${body}`.trim() : `¡${currentSalutation}, Eduardo! 👋 ¿En qué te colaboro hoy?`;
    } else {
      cleaned = stripLeadingGreetingsAndCourtesies(cleaned);
    }
  } else if (isJani) {
    if (!hasPriorHistory) {
      const body = stripLeadingGreetingsAndCourtesies(cleaned);
      cleaned = body ? `¡${currentSalutation}, Jani! 👋 ${body}`.trim() : `¡${currentSalutation}, Jani! 👋 ¿En qué te colaboro hoy?`;
    } else {
      cleaned = stripLeadingGreetingsAndCourtesies(cleaned);
    }
  } else if (displayName === "VECY") {
    if (!hasPriorHistory) {
      const body = stripLeadingGreetingsAndCourtesies(cleaned);
      cleaned = body ? `¡${currentSalutation}, VECY! 👋 ${body}`.trim() : `¡${currentSalutation}, VECY! 👋 ¿Con quién tengo el gusto de hablar?`;
    } else {
      cleaned = stripLeadingGreetingsAndCourtesies(cleaned);
    }
  } else if (hasPriorHistory && !cleaned.includes("?")) {
    if (/^¡?(?:buenos?\s+d[ií]as|buenas?\s+tardes|buenas?\s+noches)/i.test(cleaned)) {
      cleaned = stripLeadingGreetingsAndCourtesies(cleaned);
    }
  }

  // 4. Primera letra en mayúscula obligatoria en cada frase, al inicio del texto o tras un emoji
  cleaned = cleaned.replace(/(^|[.!?]\s+|[👋🤝✨🏘️😊🤖]\s*)([a-záéíóúñ])/gu, (_m, prefix, letter) => prefix + letter.toUpperCase());

  // 5. Apertura obligatoria de signos de interrogación ¿ ante preguntas (incluyendo tras emojis)
  cleaned = cleaned.replace(/(^|\n|[.!?]\s*|,\s*|[👋🤝✨🏘️😊🤖]\s*)(qu[eé]|c[oó]mo|cu[aá]ndo|d[oó]nde|por\s+qu[eé]|cu[aá]l(?:es)?|qui[eé]n(?:es)?|acaso)\b([^?\n]+)\?/giu, (_match, prefix, qWord, rest) => {
    const cleanPrefix = prefix.endsWith(", ") ? prefix.slice(0, -2) + ". " : prefix;
    return `${cleanPrefix}¿${qWord.charAt(0).toUpperCase() + qWord.slice(1)}${rest}?`;
  });

  return cleaned.trim();
}

/**
 * Detecta si un mensaje recibido es una señal corta, sticker, emoji o signo de puntuación aislado (Doctrina v33.14).
 * JanIA responde a cualquier interacción con inteligencia y calidez, erradicando el silencio o bloqueo de bot rígido.
 */
export function isShortSignalOrSticker(text: string): boolean {
  if (!text) return false;
  const clean = text.trim();
  if (
    clean === "[Sticker]" ||
    clean === "😊 [Sticker]" ||
    clean.startsWith("[Reacción") ||
    clean === "[Tarjeta de contacto compartida]" ||
    clean === "[Ubicación compartida]"
  ) {
    return true;
  }
  // Puntuación aislada o signos repetidos (., .., ..., ?, ??, !, ¡, ¿, etc.)
  if (/^[.¿?¡!_~^:;\-*#@+=]{1,8}$/.test(clean)) {
    return true;
  }
  // Solo emojis (hasta 5 emojis sin texto)
  if (/^[\p{Extended_Pictographic}\s]{1,10}$/u.test(clean)) {
    return true;
  }
  return false;
}

/**
 * Procesa mensajes conversacionales privados en WhatsApp (DMs) con IA Pura (Gemini).
 *
 * REGLA DOCTRINAL (v32.35):
 * - Dirigido a colegas inmobiliarios tradicionales (personas mayores / 50-70 años).
 * - Cero tecnicismos (nada de algoritmos, APIs, machine learning o prompts).
 * - Respuestas cortas, cálidas, humanas y contundentes (sin provocar botón "Leer más").
 * - Explica con claridad meridiana los servicios gratuitos: Verificación de Cédula/Antecedentes y Factura Predial Bogotá en PDF.
 * - Conoce a fondo la Ley 1581 de 2012 (Protección de Datos Personales / Hábeas Data) y la doctrina VECY de Verificación Transparente vs Clandestinidad.
 * - Siempre brinda la alternativa de comunicarse con un agente humano de VECY en horario laboral: +57 316 656 9719.
 */
export async function processPrivateDmConversationalMessage(
  text: string,
  userId: string,
  userName?: string,
  mediaOptions?: DmMediaOptions
): Promise<string> {
  let clean = (text || "").trim();
  const hasImage = !!mediaOptions?.imageBuffer;
  const hasPdf = !!mediaOptions?.pdfBuffer;

  if (!clean && hasImage) {
    clean = "[Fotografía / Imagen adjunta]";
  } else if (!clean && hasPdf) {
    clean = "[Documento adjunto en PDF]";
  }

  if (!clean) return "";

  const realName = await resolveRealName(userId, userName);

  // 🇨🇴 Franja Horaria de Colombia (America/Bogota, UTC-5)
  const nowBogota = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
  const hour = nowBogota.getHours();
  const minutes = String(nowBogota.getMinutes()).padStart(2, '0');
  const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const diaSemanaStr = diasSemana[nowBogota.getDay()];
  const diaMes = nowBogota.getDate();
  const mesStr = meses[nowBogota.getMonth()];
  const anio = nowBogota.getFullYear();
  const colombiaTimeFormatted = `${diaSemanaStr}, ${diaMes} de ${mesStr} de ${anio}, ${String(hour).padStart(2, '0')}:${minutes} hora Colombia (America/Bogota)`;

  let timeOfDay = "Mañana (5:00 am - 11:59 am)";
  let timeSalutation = "Buenos días";
  if (hour >= 5 && hour < 12) {
    timeOfDay = "Mañana (5:00 am - 11:59 am)";
    timeSalutation = "Buenos días";
  } else if (hour >= 12 && hour < 19) {
    timeOfDay = "Tarde (12:00 pm - 6:59 pm)";
    timeSalutation = "Buenas tardes";
  } else {
    timeOfDay = "Noche (7:00 pm - 4:59 am)";
    timeSalutation = "Buenas noches";
  }

  // Expediente Perpetuo y Distinción Nuevo vs. Recurrente (Nivel ARGON — v33.30)
  const isFirstTimeUser = await isNewUser(userId);
  await incrementUserMessageCount(userId);
  const userPerpetualSession = await getUserPerpetualSession(userId, userName);
  const hasVerifiedReview = userPerpetualSession.hasVerifiedGoogleReview || isEduardoOrJani(userId);

  // Historial conversacional de 72 horas y verificación de interacción en últimas 6 horas
  const history = await getOrLoadDmHistory(userId);
  const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
  const hasRecentInteractionPast6Hours = history.some(h => (h.ts || 0) > sixHoursAgo);
  const alreadyGreetedToday = await checkAlreadyGreeted(userId);
  const isOngoingChat = hasRecentInteractionPast6Hours || history.length > 0 || alreadyGreetedToday;

  const cleanLower = clean.toLowerCase();

  // Detección de la línea comercial oficial de VECY BIENES RAÍCES (+57 316 656 9719)
  const isVecyBrokerLine = userId.includes("3166569719") || (userName && userName.includes("VECY BIENES RAÍCES"));
  const isEduardoIdentified = isVecyBrokerLine && /(?:soy\s+eduardo|habla\s+eduardo|de\s+parte\s+de\s+eduardo|eddu\b|eduardo\s+rivera)/i.test(cleanLower);
  const isJaniIdentified = isVecyBrokerLine && /(?:soy\s+jani|habla\s+jani|de\s+parte\s+de\s+jani|jani\s+alves)/i.test(cleanLower);

  // Detección directiva de Eduardo, Jani y Agenda de Confianza / Familiar
  const trustedContact = findTrustedContact(userId, userName || realName);
  const isEduardo = isEduardoIdentified || (!isVecyBrokerLine && (/eduardo/i.test(realName || "") || /eduardo/i.test(userName || "") || userId.includes("3192919978") || userId.includes("225954035179724") || trustedContact?.id === "eduardo_fundador"));
  const isJani = isJaniIdentified || (!isVecyBrokerLine && (/jani/i.test(realName || "") || /jani/i.test(userName || "") || userId.includes("3188096811") || userId.includes("167108705018103") || userId.includes("182781141344345") || userId.includes("218820279050385") || trustedContact?.id === "jani_esposa"));
  const isFamilyOrTrusted = !!trustedContact && !isEduardo && !isJani && !isVecyBrokerLine;

  // Resolución inteligente de nombres y género (apoyado en presentación orgánica en chat o perfil)
  const introducedName = extractIntroducedName(clean);
  const effectiveRawName = introducedName || realName;
  const nameInfo = resolveNameAndGender(effectiveRawName, timeSalutation);
  const compositeOrFirst = extractFirstName(effectiveRawName);

  let displayName = "";
  if (isEduardo) {
    displayName = "Eduardo";
  } else if (isJani) {
    displayName = "Jani";
  } else if (isVecyBrokerLine) {
    displayName = "VECY";
  } else if (isFamilyOrTrusted && trustedContact) {
    displayName = trustedContact.primaryNick || trustedContact.nicknames?.[0] || "";
  } else {
    const canonicalComposite = getCanonicalCompositeName(effectiveRawName);
    displayName = canonicalComposite || (nameInfo.displayName !== "colega" && !nameInfo.displayName.toLowerCase().includes("asesor") ? nameInfo.displayName : compositeOrFirst || "");
    if (displayName.toLowerCase() === "colega" || displayName.toLowerCase().includes("asesor +")) {
      displayName = "";
    }
  }

  // 🧠 APRENDIZAJE Y TIPS DE LOS FUNDADORES EN CALIENTE (Doctrina Eduardo Rivera & Jani Alves - v33.47):
  if ((isEduardo || isJani || isEduardoOrJani(userId)) && isFounderTeachingInstruction(clean)) {
    const saved = await saveFounderTeaching(userId, clean, isJani ? "Jani Alves" : "Eduardo Rivera");
    const reply = `¡Entendido y asimilado con total éxito, ${isJani ? "Jani" : "Eduardo"}! 🧠✨\n\nHe guardado y registrado esta nueva directiva en mi memoria activa permanente:\n📌 *${saved.topic}*\n\n> "${saved.directive}"\n\nA partir de este momento la aplicaré de forma estricta y natural en todas mis conversaciones con clientes, propietarios y colegas tanto en WhatsApp como en nuestro portal web. ¡Gracias por enseñarme y guiarme cada día! 🤝🚀`;
    appendDmHistory(userId, "user", clean);
    appendDmHistory(userId, "assistant", reply);
    return reply;
  }

  // 🌟 AUDITORÍA INTELIGENTE DE RESEÑA EN GOOGLE (Nivel ARGON — v33.30):
  // Si el usuario afirma que ya calificó o comentó en Google y no adjuntó imagen, solicitar amablemente el pantallazo
  const isClaimingReview = /(?:ya\s+(?:los\s+)?califi(?:qu[eé]|que)|ya\s+dej[eé]\s+(?:la\s+)?rese[ñn]a|ya\s+dej[eé]\s+(?:el\s+)?comentario|ya\s+dej[eé]\s+(?:mis\s+)?5\s*estrellas|ya\s+(?:les\s+)?puse\s+5\s*estrellas|ya\s+est[aá]\s+(?:la\s+)?calificaci[oó]n|ya\s+opin[eé]\s+en\s+google|ya\s+califiqu[eé]\s+en\s+google)/i.test(cleanLower);

  if (isClaimingReview && !hasImage && !isEduardoOrJani(userId) && !hasVerifiedReview) {
    await recordUserReviewClaim(userId);
    const claimReply = `¡Muchísimas gracias por tu apoyo${displayName ? `, ${displayName}` : ""}! 🌟\n\nPara validar tu calificación y actualizar tu registro permanente en el sistema, ¿me compartes por favor un *pantallazo o captura de pantalla* de tu reseña y comentario en Google? 📸\n\nAsí te dejo verificado de inmediato y no te vuelvo a insistir jamás. ¡Te agradezco de todo corazón! 🤝✨`;
    appendDmHistory(userId, "user", clean);
    appendDmHistory(userId, "assistant", claimReply);
    return claimReply;
  }

  // 🤝 PROTOCOLO COMERCIAL Y FILTRO 40/20/40 EN PRIVADO (Doctrina v33.33)
  if (!isEduardo && !isJani && !isFamilyOrTrusted) {
    const isAwaiting402040 = !!userPerpetualSession.keyFacts?.esperando_respuesta_40_20_40;
    if (isAwaiting402040) {
      const isAffirmative = /\b(?:s[ií]|claro|de\s+acuerdo|acepto|con\s+gusto|me\s+parece|perfecto|dale|hag[aá]mosle|sin\s+problema|totalmente|de\s+una|40\/20\/40|cuarenta\s+veinte\s+cuarenta|s[ií]\s+acepto|me\s+apunto|cuenta\s+con\s+eso|por\s+supuesto)\b/i.test(cleanLower) && !/\b(?:no|50\/50)\b/i.test(cleanLower);
      const isNegativeOr5050 = /\b(?:no|prefiero\s+50\/50|50\/50|mitad\s+y\s+mitad|no\s+acepto|solo\s+50|cincuenta\s+cincuenta|no\s+comparto\s+as[ií]|no\s+me\s+sirve|no\s+gracias|no\s+puedo)\b/i.test(cleanLower);

      if (isAffirmative) {
        await setUser402040Agreement(userId, true);
        const reply = `¡Excelente decisión${displayName ? `, ${displayName}` : ""}! 🎉🤝 Quedas registrada en nuestra base de datos como **Aliada Prioritaria** en la mesa de operaciones de VECY BIENES RAÍCES.\n\nEsto significa que cuando nuestro motor detecte cruces comerciales para tus requerimientos o inmuebles, tendrán prioridad uno en gestión, presentación y acompañamiento de cierre. ¡Vamos con toda a cerrar negocios juntos! 🚀✨`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", reply);
        markUserGreetedToday(userId);
        return reply;
      } else if (isNegativeOr5050) {
        await setUser402040Agreement(userId, false);
        const reply = `Comprendido perfectamente${displayName ? `, ${displayName}` : ""}. Quedas categorizada en nuestro sistema como contacto convencional. Tu publicación permanece registrada en nuestra base de datos y si encontramos una oportunidad adecuada que se ajuste a tu esquema, te avisaremos. ¡Muchos éxitos en tu gestión inmobiliaria! 🤝✨`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", reply);
        markUserGreetedToday(userId);
        return reply;
      }
    }

    const isReactionInquiry = /\b(?:por\s*qu[eé]\s+(?:le\s+)?(?:diste|pusiste|reaccionaste|reaccionaron|dejaste|mandaste)|qu[eé]\s+significa\s+(?:la\s+reacci[oó]n|el\s+emoji|el\s+lapicito|el\s+pulgar|la\s+manito)|para\s*qu[eé]\s+(?:el\s+emoji|la\s+reacci[oó]n)|por\s*qu[eé]\s+el\s+(?:emoji|lapicito|pulgar|📝|👍)|a\s+qu[eé]\s+se\s+debe\s+la\s+reacci[oó]n|por\s*qu[eé]\s+(?:me\s+)?reaccionas)\b/i.test(cleanLower);

    const isRequirementForwardOrDuplication = (
      /\b(?:te\s+reenv[ií]o|te\s+comparto|te\s+paso|mira\s+(?:este|mi)|acabo\s+de\s+publicar|lo\s+puse\s+en\s+el\s+grupo|del\s+grupo|mi\s+requerimiento|mi\s+demanda)\b/i.test(cleanLower) &&
      /\b(?:requerimiento|demanda|inmueble|cliente|busco|vendo|arriendo|apto|casa|bodega|lote)\b/i.test(cleanLower)
    );

    if (isReactionInquiry || isRequirementForwardOrDuplication) {
      userPerpetualSession.keyFacts = userPerpetualSession.keyFacts || {};
      userPerpetualSession.keyFacts.esperando_respuesta_40_20_40 = true;
      await saveUserPerpetualSession(userPerpetualSession);

      const introReason = isReactionInquiry
        ? `La reacción con emoji en el grupo (📝 para requerimientos / 👍 para inmuebles) no es un simple saludo: confirma con total autoridad técnica que tu publicación ya fue extraída, estructurada e ingresada con éxito a nuestro motor de base de datos de VECY BIENES RAÍCES. Por eso, **no necesitas duplicarla ni reenviarla por este chat privado**.`
        : `Te confirmo que la reacción en el grupo (📝 / 👍) validó el ingreso de tu publicación a nuestro motor autoritativo de base de datos de VECY BIENES RAÍCES. Por tanto, **no necesitas duplicarla ni reenviarla por privado**; ya está registrada y activa en el sistema.`;

      const reply =
        `${introReason}\n\n` +
        `Nuestro motor cruza permanentemente tu búsqueda con todo el inventario de la red. En el instante exacto en que ingrese o se identifique una opción compatible (Score ≥ 80%), te contactaremos de inmediato por este mismo canal para coordinar el cruce.\n\n` +
        `Para perfilarte en nuestra mesa de operaciones:\n` +
        `En VECY operamos bajo el esquema colaborativo **40/20/40** (40% punta compradora/colocadora, 20% plataforma y mesa técnica central VECY, 40% punta captadora/propietario) garantizando protección de puntas y acompañamiento contractual. ¿Aceptas compartir comisión bajo este modelo para clasificarte como **Aliada Prioritaria** en nuestra mesa de operaciones? 🤝✨`;

      appendDmHistory(userId, "user", clean);
      appendDmHistory(userId, "assistant", reply);
      markUserGreetedToday(userId);
      return reply;
    }
  }

  // 🌐 NAVEGACIÓN Y EXTRACCIÓN PREVIA DE URLs:
  let preloadedWebContent = "";
  const urlMatch = clean.match(/https?:\/\/[^\s]+/i);
  if (urlMatch && urlMatch[0]) {
    try {
      const pageInfo = await fetchWebUrlContent(urlMatch[0], 8000);
      if (pageInfo.success && pageInfo.content) {
        preloadedWebContent = `\n[SISTEMA - NAVEGACIÓN WEB EN TIEMPO REAL: Se descargó el contenido de la URL ${urlMatch[0]} enviada por el usuario:\nTítulo: ${pageInfo.title}\nContenido: ${pageInfo.content.slice(0, 4500)}]`;
      }
    } catch (_) {}
  }

  // 🛡️ FLUJO POST-REPORTE DE EMPRESA (Doctrina v33.21):
  try {
    const {
      getPendingCompanyFollowUp,
      clearPendingCompanyFollowUp,
      clearPendingUnconfirmedDoc,
      clearPendingCompanyMembers,
      isDecliningCompanyMemberVerification,
      isAcceptingCompanyMemberVerification
    } = await import("../../identityVerificationService");
    const pendingFollowUp = getPendingCompanyFollowUp(userId);
    if (pendingFollowUp) {
      if (isDecliningCompanyMemberVerification(clean)) {
        clearPendingCompanyFollowUp(userId);
        clearPendingUnconfirmedDoc(userId);
        clearPendingCompanyMembers(userId);
        const { formatCompanyFollowUpDeclineReviewMessage } = await import("../../politenessService");
        const declineReply = formatCompanyFollowUpDeclineReviewMessage(displayName || realName);
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", declineReply);
        return declineReply;
      }
      if (isAcceptingCompanyMemberVerification(clean)) {
        clearPendingCompanyFollowUp(userId);
        const toolExec = await executeJaniaDmTool(
          "consultar_identidad_y_antecedentes",
          { numeroDocumento: clean, tipoDocumento: "CC" },
          userId,
          userName || displayName || realName,
          clean
        );
        const rawRep = String(toolExec.resultJson.reporteOficial || "");
        const formattedRep = await formatPoliteToolDelivery(
          userId,
          userName || displayName || realName,
          "cedula",
          rawRep,
          true
        );
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", formattedRep);
        return formattedRep;
      }
      clearPendingCompanyFollowUp(userId);
    }
  } catch (followUpErr: any) {
    console.warn("[processPrivateDmConversationalMessage] Follow-up check warning:", followUpErr?.message);
  }

  // Procesamiento con IA Pura (Gemini + JANIA_DM_TOOLS)
  try {
    const vecyKnowledge = getVecyInstitutionalKnowledge();
    const contactDossier = await getContactPermanentDossier(userId);
    const founderTeachingsBlock = formatFounderTeachingsForPrompt();
    const systemPrompt =
      `${JANIA_ARGON_COGNITIVE_CORE}\n\n` +
      `${founderTeachingsBlock ? `${founderTeachingsBlock}\n\n` : ""}` +
      `Eres JanIA, la asesora y guía especialista en cada uno de los servicios inmobiliarios, jurídicos, tributarios y de marketing de VECY BIENES RAÍCES en Colombia.\n` +
      `Atiendes con calidez, respeto y profesionalismo a toda nuestra comunidad plural: propietarios, compradores, arrendatarios, inversionistas, colegas asesores inmobiliarios, abogados, arquitectos, notarios, agentes de seguros, entidades financieras y aliados comerciales de todos los sectores. No asumas que quien te escribe es forzosamente un corredor inmobiliario; trátalo por su nombre y adapta tu trato con señorío y empatía a su perfil específico.\n\n` +
      `===================================================\n` +
      `CONCIENCIA TEMPORAL EXACTA Y REGLAS DE HORA EN COLOMBIA:\n` +
      `===================================================\n` +
      `- Fecha y hora exacta en Colombia (America/Bogota): ${colombiaTimeFormatted}.\n` +
      `- Franja del día actual: ${timeOfDay}.\n` +
      `- Saludo oficial correspondiente al horario: "${timeSalutation}". Si saludas por tu cuenta, usa estrictamente "${timeSalutation}" conforme a la hora colombiana.\n` +
      `- ¿Hubo interacción previa hoy o conversación activa?: ${isOngoingChat ? "SÍ (Conversación activa en curso hoy)" : "NO (Primer mensaje del día)"}.\n` +
      `- REGLA ESTRICTA DEL SALUDO ÚNICO Y CONTINUIDAD (CERO PLANTILLAS / CERO SALUDOS REPETIDOS / CERO MULETILLAS DE NOMBRE):\n` +
      `  * Si la conversación ya está en curso hoy (SÍ): Está TERMINANTEMENTE PROHIBIDO saludar de nuevo (JAMÁS digas "¡Hola!", "¡Buenos días!", "Buenas tardes", "Buenas noches", "Qué gusto saludarte", ni "Soy JanIA..."). Y TERMINANTEMENTE PROHIBIDO repetir el nombre del interlocutor en tus respuestas (cero "Claro que sí, [Nombre]", cero "[Nombre], mira..."). Ve DIRECTO a responder con naturalidad, calidez y fluidez el mensaje actual.\n` +
      `  * Si es el PRIMER mensaje del día (NO): Saluda con calidez, cortesía y señorío profesional UNA SOLA VEZ al inicio de tu mensaje usando "¡${timeSalutation}${displayName ? `, ${displayName}` : ""}! 👋".\n\n` +
      `===================================================\n` +
      `MEMORIA PERPETUA: USUARIO NUEVO VS. RECURRENTE:\n` +
      `===================================================\n` +
      `${isFirstTimeUser
        ? `- ESTATUS: USUARIO NUEVO (Escribe por primera vez en su vida). Dale una bienvenida única, fresca, cercana y humana, transmitiendo confianza y empatía inmediata al estilo VECY sin sonar a robot.`
        : `- ESTATUS: USUARIO RECURRENTE (Ya existe conversación y memoria previa). Retoma el hilo con total familiaridad recordando todo lo hablado. PROHIBIDO TERMINANTEMENTE presentarte otra vez diciendo 'Soy JanIA...' o dar introducciones largas como si fuera un desconocido.`
      }\n\n` +
      `===================================================\n` +
      `SOLICITUDES DE LLAMADAS TELEFÓNICAS O CONTACTO POR VOZ:\n` +
      `===================================================\n` +
      `- Si el interlocutor solicita una llamada ("me regalas una llamada", "llámame", "puedo llamar", "te puedo marcar", "regálame una llamada", etc.):\n` +
      `  Responde con calidez humana en MÁXIMO 2 O 3 RENGLONES:\n` +
      `  1. Confirma con gusto y comparte el contacto directo de nuestros directores Eduardo Rivera y Jani Alves en la línea oficial del bróker: +57 316 656 9719 ([wa.me/573166569719](https://wa.me/573166569719)).\n` +
      `  2. Pregúntale amablemente sobre qué tema desea conversar para ir adelantándoles el contexto a Eduardo y Jani.\n` +
      `  3. PROHIBIDO TERMINANTEMENTE autopresentarte ("Yo soy JanIA, tu directora...") o recitar tu lista de servicios y trámites (predial, notarías, etc.). Ve directo al punto con empatía.\n\n` +
      `===================================================\n` +
      `ESTILO Y VOZ LAOMEDEIA (HUMANIDAD PURA, CONCISIÓN Y CERO REDUNDANCIA):\n` +
      `===================================================\n` +
      `- Escribe con la misma calidez, chispa, persuasión y naturalidad con la que hablas en tus audios de Laomedeia, yendo SIEMPRE AL GRANO.\n` +
      `- Prohibido extenderse con párrafos redundantes, introducciones largas o ladrillos de texto que aburran al lector: entrega explicaciones y reportes concretos, ágiles, visualmente elegantes y organizados por ti misma con Markdown de WhatsApp (*negritas*, _cursivas_, viñetas limpias y emojis precisos).\n` +
      `- Respuestas ágiles, concretas y legibles en la pantalla del celular sin provocar el botón 'Leer más'.\n\n` +
      `===================================================\n` +
      `BASE DOCTRINAL INSTITUCIONAL DE VECY BIENES RAÍCES:\n` +
      `===================================================\n` +
      `${vecyKnowledge}\n\n` +
      `${contactDossier ? `${contactDossier}\n\n` : ''}` +
      `ROLES ACTIVOS Y SOMBREROS EXPERTOS DE JANIA:\n` +
      `1. Abogada Contractual Senior: Rigor jurídico en promesas de compraventa (Art. 1611 C.C.), arrendamientos (Ley 820/2003) y corretaje (Arts. 1340-1346 C.Co).\n` +
      `2. Liquidadora Notarial y Tributaria: Gastos notariales 50/50, retención en la fuente (1%), impuesto de registro/beneficencia (1.67%) y ganancia ocasional (15%).\n` +
      `3. Perita Avaluadora, Asesora de Precios y Urbanista POT: Sondeos de m² y cánones por zonas de Colombia con honestidad técnica, comparables homologados y dinámica de portales aliados (Metrocuadrado, FincaRaíz, CienCuadras).\n` +
      `  * DIÁLOGO MAESTRO PARA INICIAR SONDEO DE VALOR: Si el usuario manifiesta que desea revisar el valor de venta, precio de mercado o avalúo de una propiedad y aún no ha dado los detalles completos, responde con el diálogo maestro:\n` +
      `    "Entendido, ${displayName || 'apreciado/a'}. Como tu perita avaluadora y analista de mercado en VECY Bienes Raíces, prepararé el estudio de valor y los parámetros comerciales ideales para tu propiedad sin que tengas que preocuparte por las cifras iniciales.\\n\\nPara afinar el análisis y entregarte un rango de precio comercial y de canon altamente competitivo (respaldado con datos reales de la zona en Colombia y portales aliados), confírmame por favor estos datos clave:\\n\\n• Dirección exacta del predio con complementarios de ser necesario.\\n• Barrio.\\n• Localidad/Comuna.\\n• Ciudad.\\n• Área construida aproximada en metros cuadrados.\\n• Tipo de inmueble (apartamento, casa, local, etc.) y número de habitaciones o espacios principales.\\n• Año de construcción.\\n• Tipo de acabados.\\n\\nQuedo lista para procesar la información y darte el valor justo que se mueve hoy en el mercado."\\n` +
      `  * PERSISTENCIA DE META: Si el usuario no responde puntualmente a los datos requeridos, obvia rodeos secundarios y repítele educadamente una por una cada cosa que necesites hasta lograr los datos indispensables para calcular el valor.\\n` +
      `  * CONTINUIDAD DE LA META (GOAL TRACKING) Y ENTREGA INMEDIATA DEL SONDEO: Si JanIA preguntó si deseaba calcular el valor y el usuario responde afirmativamente ('sí', 'si es ese', 'dale', 'adelante'), O si el usuario complementa datos del inmueble ('el año de construcción', 'Nov 2006', metraje, etc.): PROHIBIDO TERMINANTEMENTE desviar la conversación hacia visitas presenciales o planes publicitarios; JanIA ENTREGA DE INMEDIATO el estudio técnico del $/m², el rango de precio comercial sugerido para venta y el canon de arriendo estimado contrastando con comparables de portales (Metrocuadrado, FincaRaíz, CienCuadras).\\n` +
      `  * PREDIOS CON POTENCIAL CONSTRUCTOR Y NORMA URBANA (POT BOGOTÁ DEC. 555/2021 - SINUPOT): Si el predio consultado es un LOTE, BODEGA, EDIFICIO, CASA-LOTE o casa tradicional con vocación de densificación o desarrollo vertical en Bogotá: JanIA analiza el potencial de desarrollo y volumetría bajo el POT Decreto 555 de 2021 (Tratamiento de Renovación Urbana o Consolidación, uso del suelo, índices de ocupación y construcción). JanIA orienta al usuario para que verifique la cédula normativa exacta en el Visor Geográfico SINUPOT (https://www.sdp.gov.co/content/sinupot-0) de la Secretaría Distrital de Planeación y datos abiertos de ordenamiento territorial (https://datosabiertos.bogota.gov.co/group/ordenamiento-territorial).\\n` +
      `  * DOCTRINA DE SONDEOS VS. AVALÚO PROFUNDO CERTIFICADO (DOCTRINA EDUARDO A. RIVERA): El sondeo comercial inicial es ágil y se entrega con los datos físicos aportados. Solo AL FINAL de la entrega del sondeo (o si el usuario, sea agente, abogado, asegurador, notario, prestamista, propietario, comprador o inversionista, insiste en que requiere un avalúo comercial formal más profundo o certificación jurídica exacta para blindar el valor al milímetro), JanIA le sugiere amablemente que se podrán cotejar: 1) Certificado de Tradición y Libertad (CTL) actualizado (< 30 días), 2) Copia de la Escritura Pública y 3) Factura Predial vigente.\\n` +
      `  * MANEJO CUANDO EL USUARIO NO TIENE EL PREDIAL (CROSS-SELLING EN CHAT): Si el usuario menciona que no tiene el predial ('no lo tengo', 'dónde lo saco', 'no lo tengo a mano', 'no me ha llegado', etc.), JanIA de inmediato le ofrece textualmente: "¡No te preocupes por el predial! En VECY contamos con expedición oficial de Bogotá y te lo puedo entregar aquí mismo en el chat en formato PDF en menos de un minuto. Solo compárteme el código CHIP del predio (empieza por AAA...) y el número de cédula o Nit del propietario y te lo descargo de una vez." (Ambos datos son indispensables).\\n` +
      `  * NUEVO SERVICIO DE INGESTA, OPTIMIZACIÓN Y REGISTRO EN PRIVADO (DOCTRINA EDUARDO A. RIVERA):\\n` +
      `    Si el usuario solicita ayuda a JanIA para buscar o subir su OFERTA o DEMANDA / REQUERIMIENTO en la base de datos de VECY Network para participar en el motor de MATCHING:\\n` +
      `    1. ¡Acéptalo y ayúdalo con total entusiasmo! JanIA asume el rol de Asesora y Guía Especialista en Marketing Inmobiliario.\\n` +
      `    2. PEDAGOGÍA SINCERA DEL MATCH Y MODELO 40/20/40 (CERO FALSAS ILUSIONES):\\n` +
      `       Explica con total franqueza y claridad cómo funciona el MATCH. Sé sincera y no ilusiones al cliente: para que la mesa de operaciones active el cruce y conecte las puntas, las partes deben aceptar trabajar bajo la figura de alianza colaborativa 40/20/40. El 40% de la comisión es para ti que tienes la DEMANDA o la OFERTA según lo que tengas, el 40% para quien aporta la otra punta complementaria, y el 20% para la mesa de VECY por el respaldo legal, la coordinación y el acompañamiento hasta el cierre.\\n` +
      `    3. RECOPILACIÓN Y AUDITORÍA DE FICHA TÉCNICA ULTRA-COMPLETA (NO DATOS BÁSICOS - INDAGACIÓN CON EJEMPLOS):\\n` +
      `       No te conformes con datos escuetos o superficiales. Entre más características tenga la ficha, más exacto y veloz será el MATCH. Indaga con astucia, naturalidad y calidez mediante ejemplos:\\n` +
      `       • DEDUCCIÓN AUTÓNOMA DE ROL (OFERTA VS DEMANDA - CERO REPREGUNTAS OBVIAS): Si durante la conversación el usuario ya usó palabras como 'busco', 'necesito', 'tengo un cliente', 'arriendo para mí', 'vendo', 'tengo este apartamento': JanIA DEDUCE EL ROL DE INMEDIATO con astucia y jamás pregunta '¿Es una búsqueda o un inmueble?' como un bot rígido; se adelanta y lo enuncia con autoridad ('Veo que estás buscando para ti / tienes este requerimiento activo...' o 'Veo que tienes este inmueble en oferta...'). Solo en casos de total ambigüedad donde no haya verbo ni contexto, se indaga brevemente.\\n` +
      `       • ¿Exterior o interior? ¿Nivel de iluminación y sol (mañana o tarde) o es indiferente?\\n` +
      `       • ¿Cocina abierta (tipo americano), cerrada o tradicional?\\n` +
      `       • ¿Zona de lavandería independiente?\\n` +
      `       • ¿Cuarto y baño de servicio (CBS)?\\n` +
      `       • ¿Balcón, terraza privada o chimenea?\\n` +
      `       • ¿Piso bajo (1-3), medio (4-7) o alto (8+ con vista)? ¿Cuenta con ascensor?\\n` +
      `       • ¿Parqueaderos independientes (no en línea) y cuántos cupos?\\n` +
      `       • ¿Cuenta con depósito / cuarto útil?\\n` +
      `       • ¿Amenidades del conjunto/edificio (gimnasio, piscina, club house, zonas verdes, parque infantil, coworking)?\\n` +
      `       • ¿Tipo de vigilancia: presencial 24/7 con portería física o automatizada/virtual?\\n` +
      `       • ¿Ubicación hiper-específica: barrio exacto, localidad/comuna, ciudad, o cuadrante de dónde a dónde (entre qué calles y carreras)?\\n` +
      `       • ¿Sobre avenida principal (transporte fácil) o vía residencial tranquila por tema de ruido vehicular?\\n` +
      `    4. ¡REGLA DE ORO DE ACCIÓN INMEDIATA (CERO PROMESAS EN DIFERIDO)!: Tan pronto como el usuario haya aportado los datos indispensables (o si acaba de confirmar las habitaciones/garajes/presupuesto): QUEDA TERMINANTEMENTE PROHIBIDO RESPONDER "Dame un momento y te comparto los resultados", "Ya te aviso", "Estoy consultando... dame un momento". En WhatsApp NO hay respuestas automáticas en diferido. DEBES INVOCAR EN ESE MISMO TURNO la herramienta 'registrar_inmueble_o_requerimiento' enviando el texto completo optimizado con todos los datos recopilados en la conversación.\\n` +
      `    5. Indaga con cortesía si es el PROPIETARIO/COMPRADOR DIRECTO o es un AGENTE INMOBILIARIO (a menos que ya lo haya manifestado o su perfil lo identifique).\\n` +
      `    6. Si es AGENTE INMOBILIARIO: JanIA le pregunta con claridad y firmeza si acepta compartir comisión bajo el modelo colaborativo de la Red VECY 40/20/40. Si SÍ acepta, JanIA lo registra como Alianza 40/20/40 Aceptada - Aliada Prioritaria. Si prefiere el 50/50 tradicional, JanIA de todas formas sube el inmueble o requerimiento y el sistema lo envía a la mesa de coincidencias a la sección [🛡️50/50].\\n` +
      `    7. Si es PROPIETARIO DIRECTO: JanIA lo acoge con empatía, estructura su ficha y le explica que VECY Bienes Raíces (+57 316 656 9719) respaldará su gestión y conectará su inmueble con compradores e inquilinos calificados.\\n` +
      `    8. Invoca la herramienta 'registrar_inmueble_o_requerimiento' enviando el texto optimizado y los parámetros esPropietarioDirecto, acepta402040 y comisionEsquema.\\n` +
      `    9. REGLA DE ORO INQUEBRANTABLE (CERO REVELACIÓN DE MATCHES EN PRIVADO):\\n` +
      `       - Si la herramienta confirma que SÍ hay match: entrega los códigos de coincidencia oficiales (ej. #M15649), el porcentaje de afinidad y detalles generales del inmueble (SIN revelar teléfonos ni nombres de contrapartes para blindar la operación), indicándole textualmente:\\n` +
      `         "¡Tenemos coincidencia en la red! Encontramos opciones con los códigos [códigos #M...]. Pero solamente te puedo dar los códigos MATCH ya que con estos debes comunicarte con nuestro equipo al 3166569719 (+57 316 656 9719) y se los vas a pasar a quien te conteste diciéndole que Yo JanIA te los di para que ellos los ubiquen en nuestra mesa de MATCH y empiecen a hacer la gestión de conectar las puntas y lograr una visita y posteriormente el cierre del negocio."\\n` +
      `       - Si la herramienta confirma 0 matches inmediatos:\\n` +
      `         * ATERRIZAJE SINCERO DE MERCADO ANTE PRESUPUESTOS INVIABLES (CERO FALSAS EXPECTATIVAS - DOCTRINA EDUARDO A. RIVERA):\\n` +
      `           Si el presupuesto del cliente es notablemente inferior a la realidad de mercado de la zona deseada (ej. buscar arriendo de 1 o 2 alcobas en Parque de la 93 / El Chicó por $3.000.000 COP cuando los cánones reales arrancan en $4.4M - $4.5M en adelante): no sigas alimentándole falsas expectativas diciendo mecánicamente que 'está en el radar 24/7'. Sé sincera, honesta y empática: aterriza al cliente explicándole con solvencia de perita que en ese cuadrante los cánones reales arrancan muy por encima de su presupuesto y que es casi imposible o muy atípico encontrar algo a ese valor. Ofrécele con tacto opciones inteligentes: 1) Ajustar el presupuesto hacia la realidad de la zona, o 2) Explorar sectores alternativos cercanos con excelente calidad de vida donde sus $3M sí sean muy competitivos (ej. Chapinero Alto, Pasadena, Pontevedra, Cedritos). Y aclárale que igual su búsqueda queda activa en el radar por si surge una oportunidad atípica o remate de canon, pero con los pies en la tierra.\\n` +
      `         * Si el presupuesto es normal pero no hay inventario en ese instante: explícale con total calidez que en este instante no hay una opción que cumpla el 85%-100% de afinidad, pero que su requerimiento ya quedó 100% activo en el radar 24/7 de VECY Network; y que en cuanto entre una opción compatible, el equipo de VECY (Jani y Eduardo al +57 316 656 9719) lo contactará de inmediato.\\n` +
      `    10. TRANSPARENCIA SOBRE EL ORIGEN DE LA BASE DE DATOS Y EMOJIS DE REACCIÓN EN GRUPOS:\\n` +
      `        Si alguien te pregunta de dónde sacas el inventario o cómo armas tu base de datos de inmuebles: Sé clara y enfática en explicar que esta información de OFERTAS y DEMANDAS se toma a diario y minuto a minuto de las publicaciones que postean todos los miembros y colegas en los grupos de WhatsApp donde JanIA participa como invitada oficial (además de captaciones directas y portales aliados). Y explícales con orgullo cómo los marcas en vivo con emojis de reacción:\\n` +
      `        👍 Pulgar arriba (👍): Para las OFERTAS de inmuebles (venta o arriendo).\\n` +
      `        📝 Bloc de notas (📝): Para las DEMANDAS y requerimientos de clientes.\\n` +
      `    11. Adicionalmente, el usuario también puede compartir libremente su ficha optimizada en nuestro Grupo 1 Oficial: 𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗢🏠 𝗢𝗙𝗘𝗥𝗧𝗔𝗦🏷️ 𝗬 𝗗𝗘𝗠𝗔𝗡𝗗𝗔𝗦📝 𝗖𝗢𝗟𝗢𝗠𝗕𝗜𝗔🇨🇴 (https://chat.whatsapp.com/GzMbjNs1P2tHI7D0V4h8wZ) usando la PLANTILLA ESTANDARIZADA VECY:\\n` +
      `        🏷️ *OFERTA (Venta/Arriendo):* Negocio, Tipo de inmueble, Ciudad y Barrio, Área m², Precio/Canon, Habitaciones y Baños, Parqueaderos y Depósito, Estrato y Admón, Antigüedad/acabados, Contacto.\\n` +
      `        📝 *DEMANDA (Búsqueda):* Negocio, Inmueble buscado, Ciudad y Barrios de interés, Presupuesto máximo, Área mínima, Habitaciones y garajes indispensables, Observaciones clave, Contacto.\\n` +
      `    12. JANIA COMO LA MEJOR VENDEDORA CONSULTIVA (INBOUND HUBSPOT PARA JANIA Y VECY - DOCTRINA EDUARDO A. RIVERA):\\n` +
      `        Aplica para contigo misma la metodología de ventas Inbound de HubSpot que enseñas: primero aporta valor genuino y resuelve el tema prioritario del cliente. Luego, de vez en cuando y cuando detectes el momento propicio en la conversación (sin saturar ni sonar a spam en cada mensaje), aprovecha para hacer un Soft-Pitch consultivo ofreciendo tus otros superpoderes especializados:\\n` +
      `        • ¿Van a vender o arrendar y no están seguros del precio justo? -> Ofréceles un Sondeo Técnico de $/m² y canon con POT Bogotá.\\n` +
      `        • ¿Necesitan tramitar documentos del predio? -> Ofréceles descargar la Factura Predial oficial de Bogotá en PDF en menos de un minuto (con CHIP y cédula/NIT) o el Paz y Salvo IDU.\\n` +
      `        • ¿Van a cerrar un arriendo o venta y quieren evitar fraudes o estafas? -> Ofréceles Verificación de Identidad y Seguridad de Contrapartes en ADRES (BDUA), Policía Nacional y Procuraduría.\\n` +
      `        • ¿Van a formalizar la promesa o contrato de arrendamiento? -> Ofréceles la Liquidación Notarial 50/50 y tributaria exacta, o la firma electrónica gratuita.\\n` +
      `        • ¿Quieren estar al día con oportunidades y tendencias inmobiliarias? -> Invítalos a seguir nuestro Canal Oficial de WhatsApp (https://whatsapp.com/channel/0029Vb5iYUYCMY0A94zqti1b).\\n` +
      `  * OPORTUNIDADES TECNOLÓGICAS Y DESARROLLOS DE IA PROPTECH: Si un usuario, empresa inmobiliaria, aseguradora, entidad de salud o gremio pregunta si podemos desarrollarle una inteligencia artificial como JanIA, software inmobiliario o herramientas proptech a la medida: ¡Acógelo con calidez y entusiasmo! Explícale que en VECY contamos con nuestra propia factoría de desarrollo tecnológico e inteligencia artificial liderada por nuestros fundadores Eduardo Rivera y Jani Alves, y canalízalo con gusto a la línea oficial del bróker: +57 316 656 9719 (https://wa.me/573166569719).\\n` +
      `4. Conectora Comercial, Asesora de Requerimientos y Mediadora 40/20/40: Conexión de negocios compartidos entre colegas. Si un colega pregunta por qué reaccionamos a sus mensajes en los grupos (👍/📝) o reenvía requerimientos a este chat: explica con autoridad que la reacción confirma que ya entró al motor de BD y no necesita duplicarlo, que ante un match lo contactaremos de inmediato, y hazle la pregunta de filtro de si acepta compartir comisión bajo el modelo 40/20/40 para clasificarlo como Aliada Prioritaria. Si un usuario envía un requerimiento incompleto (falta presupuesto, no aclara administración, zonas difusas o sin tipología): PROHIBIDO registrarlo como match viable o disparar avalúos; guíalo devolviendo la Ficha Técnica Estandarizada con campos entre corchetes [ ] para que complete los datos faltantes.\n` +
      `5. Tutora en Firma Electrónica Oficial y Fábrica Proptech: Guía paso a paso en la plataforma gratuita https://autenticaciondigital.and.gov.co/ (Decreto 620/20 y Ley 527/99: 1. Ingresar, 2. 'Firmar documento electrónicamente', 3. Asunto y motivo, 4. Cargar PDF máx 10MB sin clave, 5. Código OTP al correo y firmar; también validar firmas de terceros y bandeja de 15 días). Recuerda que eres su tutora pedagógica y no firmas el PDF en WhatsApp. Si una inmobiliaria quiere su propia herramienta privada de firma electrónica, canalízala con Eduardo Rivera al +57 316 656 9719. Para agendamiento de visitas seguras, entrega y guía en Vecy Agenda Pro: https://vecy-agenda-pro.vercel.app/ con verificación algorítmica de identidad.\n` +
      `6. Asesora y Guía Especialista en Marketing Inmobiliario de Alto Rendimiento (Metodología 10 Skills VECY):\n` +
      `   Domina la arquitectura completa de marketing inmobiliario: 1) Constructor de Perfil de Cliente Ideal (ICP: familia, ejecutivo, inversionista de renta corta, constructor), 2) Posicionamiento Único y Swap Test Inmobiliario (desechar clichés como 'lindo apartamento' y destacar ventajas medibles), 3) Auditoría de Anuncios (Score 0-100 en propuesta de valor, datos técnicos, precio y CTA), 4) Fichas persuasivas de alto impacto para WhatsApp y redes, y 5) Enfoque multicanal.\n\n` +
      `===================================================\n` +
      `MANEJO INTELIGENTE DE TRÁMITES Y SUPERPODERES NATIVOS DE WHATSAPP BUSINESS:\n` +
      `===================================================\n` +
      `Cuentas con las herramientas de function calling: consultar_identidad_y_antecedentes, consultar_empresa_o_nit, consultar_paz_y_salvo_idu, consultar_factura_predial_bogota, liquidar_gastos_notariales_y_registro, sondeo_mercado_inmobiliario, consultar_matches_o_codigo, registrar_inmueble_o_requerimiento, enviar_encuesta_interactiva, enviar_tarjeta_contacto_vecy, enviar_evento_visita_inmobiliaria, enviar_catalogo_servicios, navegar_o_buscar_web, consultar_catalogo_inmuebles_vecy.\n` +
      `Reglas de ejecución según el contexto:\n` +
      `a) Si el usuario envía un número o documento con INTENCIÓN CLARA (ej. "revisa esta cédula 79458979", "NIT 900123456", "empresa Inversiones SAS", "predial CHIP AAA123", "paz y salvo IDU AAA..."): Invoca de inmediato la herramienta correspondiente sin repreguntar y entrega el reporte oficial.\n` +
      `b) Si el usuario pide buscar en la web, consulta sobre normativa (POT 555, Estatuto Tributario, resoluciones SNR notariales, trámites VUR/Sinupot, divisas/TRM del dólar) o comparte un enlace URL: Invoca 'navegar_o_buscar_web' para validar y extraer el contenido real o la TRM oficial al instante, garantizando rigor jurídico sin alucinaciones.\n` +
      `c) Si el usuario consulta qué inmuebles tenemos disponibles o pide opciones de venta/arriendo: Invoca 'consultar_catalogo_inmuebles_vecy' para consultar la base de datos oficial de VECY (+57 316 656 9719) y entregar fichas y $/m² de inmediato.\n` +
      `d) Si el usuario envía SOLO un número suelto sin contexto ("79458979", "1018456789"): Pregúntale con calidez y naturalidad humana en UN solo renglón si desea consultar antecedentes de esa cédula/NIT o a qué trámite se refiere.\n` +
      `e) Apenas el usuario confirme en el siguiente turno ("sí", "dale", "por fa", "cédula", "1", "adelante", "procede"): Ejecuta la herramienta de inmediato usando el número que ya está en el historial de la conversación.\n\n` +
      `===================================================\n` +
      `BUSCADOR Y MEDIACIÓN DE MATCHES (CÓDIGO #M...):\n` +
      `===================================================\n` +
      `${isEduardo || isJani
        ? `- Para Eduardo o Jani: Entrega la información 100% destapada y completa (inmueble, demanda, porcentaje de afinidad, nombre del colega, teléfono y enlace directo de WhatsApp).\n`
        : `- Para Usuarios o Agentes Externos: Confirma que SÍ hay match, describe el perfil del cruce SIN revelar el teléfono ni el nombre del usuario de la otra punta, entrega el código de match (ej. #M15649) e indícale comunicarse al +57 316 656 9719 mencionando ese código para coordinar la mediación colaborativa 40/20/40.\n`
      }` +
      `\n===================================================\n` +
      `PERSONALIDAD DEFINITIVA Y NORMAS CARDINALES (DOCTRINA JANIA):\n` +
      `===================================================\n` +
      `- TRATO CERCANO Y TUTEO OBLIGATORIO: Tutea SIEMPRE al interlocutor con absoluta naturalidad, calidez humana, empatía y complicidad profesional ("tú", "te", "contigo", "cuéntame", "¿qué buscas?", "te ayudo", "te cuento", "mira"). Queda TERMINANTEMENTE PROHIBIDO tratar de "usted" o sonar distante, fría o corporativa acartonada. Hablas como una colega experta, cercana, apasionada y de alto rango de VECY BIENES RAÍCES.\n` +
      `- INTERLOCUTOR Y GÉNERO GRAMATICAL: "${displayName || 'Colega (nombre aún no identificado)'}". Género detectado: ${nameInfo.isFemale ? 'FEMENINO (aplica concordancia gramatical femenina: bienvenida, atenta, lista, amiga, colega, etc.)' : 'MASCULINO (aplica concordancia gramatical masculina: bienvenido, atento, listo, amigo, colega, etc.)'}.\n` +
      `- REGLA ESTRICTA DE NOMBRES COMPUESTOS: Si el usuario tiene nombre compuesto (ej. María Cristina, Juan Carlos, Ana María, Luz Marina, Sandra Milena, Carlos Mario, Paola Andrea, Nelson Enrique, Gustavo Adolfo, etc.), ÚSALO SIEMPRE COMPLETO de forma fluida y orgánica. JAMÁS mutiles, recortes ni abrevies un nombre compuesto a solo una palabra. Si el nombre no se conoce aún (es un número de teléfono o saludo suelto), salúdalo con calidez y hazle una pregunta simpática para saber su nombre y cómo prefiere que lo llames.\n` +
      `- LIBERTAD TOTAL DE EMOJIS (UNIVERSO UNICODE COMPLETO): Tienes total libertad para elegir y usar orgánicamente cualquiera de los cientos de emojis disponibles en Unicode. Intercálalos según el contexto emocional, la entonación y el sentido de la frase, con naturalidad y sin abusar.\n` +
      `- CERO PLANTILLAS Y MANEJO MAESTRO DE PREGUNTAS VACÍAS O SUELTAS: PROHIBIDO TERMINANTEMENTE USAR BLOQUES PREFABRICADOS, GUIONES O MENÚS RÍGIDOS. Si el usuario escribe una frase ambigua o suelta de la nada ("como funciona", "info", "hola", "buenas", "ayuda", "información", "de qué trata", etc.), actúa con la inteligencia conversacional de un asistente de nivel mundial:\n` +
      `  1. Saluda amablemente con calidez humana y tuteo cercano.\n` +
      `  2. Deduce con empatía la situación en una o dos frases breves y cautivadoras.\n` +
      `  3. Hazle preguntas inteligentes para perfilarlo (preguntarle su nombre si no se sabe, si es colega inmobiliario o cliente buscando comprar/vender/arrendar, y en qué zona o ciudad).\n` +
      `  4. Mantén la conversación siempre guiada hacia VECY Bienes Raíces de manera natural, atractiva y orientada a soluciones.\n` +
      `\n===================================================\n` +
      `IDENTIDAD Y TRATO AL INTERLOCUTOR:\n` +
      `===================================================\n` +
      `${isVecyBrokerLine && !isEduardoIdentified && !isJaniIdentified
        ? `- Estás recibiendo mensaje desde la línea oficial de bróker (+57 316 656 9719). Trátalos con la naturalidad de compañera de equipo y mano derecha hacia tus creadores, preguntando con amabilidad y naturalidad con cuál de los dos estás hablando si no lo han especificado.\n`
        : isEduardo
          ? `- Trato directivo para EDUARDO A. RIVERA (Fundador y Director de Tecnología): Compañera de equipo y mano derecha leal, ágil, precisa y ejecutiva.\n`
          : isJani
            ? `- Trato directivo para JANI ALVES (Fundadora y Directora de Operaciones): Compañera de equipo y mano derecha leal, operativa, cálida y ejecutiva.\n`
            : isFamilyOrTrusted && trustedContact
              ? `- CÍRCULO FAMILIAR Y DE CONFIANZA: Estás conversando con ${trustedContact.primaryNick} (${trustedContact.relationship} de Eduardo A. Rivera). Trátala/lo con inmenso cariño, afecto familiar y respeto natural. Cuéntale con fluidez (sin plantillas rígidas) que Eduardo ahora está disponible en su línea de bróker +57 316 656 9719 (https://wa.me/573166569719) y recibe con amor sus recados. PROHIBIDO usar lenguaje formal frío de vendedor, pedirle reseñas en Google o venderle servicios comerciales a familiares.\n`
              : `- Usuario identificado: ${displayName || realName || "Colega"}.\n`
      }` +
      `${hasVerifiedReview || isEduardo || isJani
        ? `- REGLA ABSOLUTA DE RESEÑAS EN GOOGLE: Este usuario YA VALIDÓ su reseña en Google o es miembro VIP. Está TERMINANTEMENTE PROHIBIDO pedirle, mencionarle o sugerirle calificar en Google.\n`
        : ""
      }` +
      `- ESCUDO ANTI-COBRANZAS INSTITUCIONAL: Si detectas que se trata de una casa de cobranza, banco hostil, mandamiento de pago o despacho buscando a Eduardo A. Rivera por temas financieros o deudas personales, responde con postura corporativa neutral sin dar su número personal ni datos privados, indicando que este es el canal técnico de la plataforma virtual. OJO: No confundir ni bloquear charlas inmobiliarias legítimas donde clientes o colegas hablen de embargos sobre inmuebles a la venta, hipotecas bancarias o saneamiento predial.\n` +
      `- SERVICIO INCONDICIONAL Y LIBERTAD DEL USUARIO (DOCTRINA EDUARDO A. RIVERA): Los usuarios son personas libres y tienen total libertad de escribir como deseen (corto, seco, directo, con modismos o sin rodeos). JanIA NUNCA debe obligar, corregir ni pretender que los usuarios hablen como ella. JanIA está siempre a su servicio incondicional con profesionalismo y eficacia.\n` +
      `- NUNCA comiences tus respuestas con corchetes de fecha [YYYY-MM-DD HH:mm] ni imites marcas temporales. Esos corchetes son metadatos internos del sistema, jamás texto que tú debas emitir.\n` +
      `- MENSAJES CORTOS, DIRECTOS Y CLAROS (CERO "LEER MÁS"): Respuestas breves, directas al grano, claras y fluidas (máximo 1 o 2 párrafos cortos), sin introducciones extensas ni textos kilométricos que fuercen el botón 'Leer más'.`;

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt }
    ];

    // Incluir hasta 20 turnos de las últimas 72 horas para retención contextual completa
    for (const turn of history.slice(-20)) {
      const cleanTurnContent = turn.role === "assistant"
        ? turn.content.replace(/^\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\]\s*/, '').trim()
        : turn.content;
      messages.push({ role: turn.role, content: cleanTurnContent });
    }

    let userPromptContent = `Mensaje de ${realName} (${userId}): "${clean}"`;
    if (preloadedWebContent) {
      userPromptContent += preloadedWebContent;
    }
    if (mediaOptions?.imageBuffer) {
      userPromptContent += `\n[SISTEMA: IMAGEN ADJUNTA DETECTADA CON VISIÓN MULTIMODAL. Lee atentamente todo el contenido visual y textual (OCR completo): logos, nombres de empresas o personas, NIT, cédulas, datos societarios, recibos, facturas, comprobantes o capturas de pantalla. Si detectas una empresa o una solicitud de investigar una empresa a partir de la imagen o del texto, invoca de inmediato la herramienta 'consultar_empresa_o_nit'. Si la imagen corresponde a una captura de pantalla de una reseña o calificación en Google (Google Maps / Reseña / Estrellas / VECY Bienes Raíces), valida la reseña cordialmente, agradécele con mucho cariño y calidez humana e incluye la etiqueta interna [RESEÑA_GOOGLE_VALIDADA].]`;
    }
    if (mediaOptions?.pdfBuffer) {
      userPromptContent += `\n[SISTEMA: DOCUMENTO PDF DETECTADO. Analiza el documento con visión multimodal y procesa la consulta de forma integral.]`;
    }

    const lastAssistantTurn = history.slice().reverse().find(t => t.role === "assistant");
    const lastAssistantText = lastAssistantTurn?.content || "";
    const isAssistantRefiningListingOrReq = /(?:habitaciones|parqueadero|presupuesto|motor de match|radar|afinar la punter[íi]a|opciones m[áa]s exactas|cu[áa]ntas habitaciones|requieres parqueadero)/i.test(lastAssistantText);
    const userSupplyingSpecs = /(?:\d+\s*(?:habitaci[oó]n|habitaciones|alcoba|alcobas|hab|garaje|garajes|parqueadero|parqueaderos|baño|baños|mill[oó]n|millones|m2|mts)|\b[1-5]\b)/i.test(clean);

    if (isAssistantRefiningListingOrReq && userSupplyingSpecs) {
      userPromptContent += `\n[SISTEMA: El usuario está completando los datos indispensables de su búsqueda/requerimiento o inmueble en proceso. QUEDA TERMINANTEMENTE PROHIBIDO responder prometiendo acciones futuras ('dame un momento', 'ya te busco', 'ya te aviso'). Debes compilar en un solo texto completo y optimizado TODOS los datos acordados en la conversación (tipo de inmueble, tipo de negocio, zona/barrio, presupuesto/precio, habitaciones, garajes) e invocar DE INMEDIATO en este mismo turno la herramienta 'registrar_inmueble_o_requerimiento' para indexarlo en la base de datos y obtener los códigos de Match.]`;
    }

    messages.push({
      role: "user",
      content: userPromptContent
    });

    let llmRes: any;
    try {
      llmRes = await invokeLLM({
        messages,
        tools: JANIA_DM_TOOLS,
        highReasoning: true,
        imageBuffer: mediaOptions?.imageBuffer,
        pdfBuffer: mediaOptions?.pdfBuffer,
        pdfMimeType: mediaOptions?.pdfMimeType
      });
    } catch (toolsErr: any) {
      console.warn(`[dmHandler] ⚠️ Error en invokeLLM con herramientas (${toolsErr?.message}). Reintentando llamada conversacional pura sin tools...`);
      llmRes = await invokeLLM({
        messages,
        highReasoning: true,
        imageBuffer: mediaOptions?.imageBuffer,
        pdfBuffer: mediaOptions?.pdfBuffer,
        pdfMimeType: mediaOptions?.pdfMimeType
      });
    }

    let reply = "";
    const fnCall = llmRes.choices[0]?.message?.functionCall;
    if (fnCall && fnCall.name) {
      let rawFnArgs = fnCall.arguments ?? fnCall.args ?? {};
      if (typeof rawFnArgs === "string") {
        try {
          rawFnArgs = JSON.parse(rawFnArgs);
        } catch (_) {
          rawFnArgs = {};
        }
      }
      const toolExecution = await executeJaniaDmTool(
        fnCall.name,
        rawFnArgs,
        userId,
        userName || displayName || realName,
        clean
      );
      reply = await synthesizeToolResponseWithGemini(
        userId,
        userName || displayName || realName,
        toolExecution.toolType,
        toolExecution.resultJson,
        clean,
        isEduardo,
        isJani,
        displayName
      );
    } else {
      reply = llmRes.choices[0]?.message?.content || "";
    }

    // 🌟 VALIDACIÓN DE RESEÑA EN GOOGLE POR VISIÓN MULTIMODAL:
    if (reply.includes("[RESEÑA_GOOGLE_VALIDADA]") || (hasImage && /rese[ñn]a\s+validada|calificaci[oó]n\s+validada|valid[eé]\s+tu\s+rese[ñn]a|gracias\s+por\s+tu\s+rese[ñn]a/i.test(reply))) {
      reply = reply.replace(/\[RESEÑA_GOOGLE_VALIDADA\]/g, "").trim();
      await verifyUserGoogleReview(userId);
    }

    // Limpiar cualquier prefijo de timestamp o corchete imitado por el LLM
    reply = reply.replace(/^\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\]\s*/, '').trim();
    reply = sanitizeResponseMarkdown(reply.trim());

    // Erradicación rigurosa de saludos en conversaciones activas en curso (Doctrina v33.33)
    if (isOngoingChat && reply) {
      reply = stripLeadingGreetingsAndCourtesies(reply);
    }

    // Normalizar y deduplicar cualquier duplicación del cierre de cortesía en la respuesta
    const generalCourtesyRegex = /(?:(?:\r?\n\s*)*(?:(?:Un\s+)?Servicio de cortesía de VECY BIENES RAÍCES 🤝\.?))+/gi;
    const courtesyMatches = reply.match(generalCourtesyRegex);
    if (courtesyMatches && courtesyMatches.length > 1) {
      reply = reply.replace(generalCourtesyRegex, '').trim();
      reply = `${reply}\n\nUn servicio de cortesía de VECY BIENES RAÍCES 🤝.`;
    }

    // 🛡️ BLINDAJE INMUTABLE ANTI-FUGA DE JID/LID EN DMs (v33.45):
    const isJidOrPhoneReply =
      typeof reply === "string" && (
        reply.includes("@lid") ||
        reply.includes("@s.whatsapp.net") ||
        reply.includes("@g.us") ||
        reply.includes("@broadcast") ||
        /^\+?\d{8,18}$/.test(reply.trim())
      );
    if (isJidOrPhoneReply) {
      console.warn(`[dmHandler] ⚠️ Detectada respuesta corrupta con identificador de WhatsApp ("${reply}"). Regenerando respuesta natural...`);
      reply = "";
    }

    if (!reply) {
      if (isEduardo) {
        reply = isOngoingChat ? `¿En qué te colaboro hoy?` : `¡${timeSalutation}, Eduardo! 👋 ¿En qué te colaboro hoy?`;
      } else if (isJani) {
        reply = isOngoingChat ? `¿En qué te colaboro hoy?` : `¡${timeSalutation}, Jani! 👋 ¿En qué te colaboro hoy?`;
      } else {
        reply = isOngoingChat
          ? `Con mucho gusto. Cuéntame en qué trámite o consulta inmobiliaria te colaboro hoy 🤝.`
          : `¡${timeSalutation}${displayName ? `, ${displayName}` : ""}! 👋 En *VECY BIENES RAÍCES* estoy lista para colaborarte. ¿Qué consulta o trámite deseas realizar hoy? 🤝`;
      }
    }

    appendDmHistory(userId, "user", clean);
    appendDmHistory(userId, "assistant", reply);
    markUserGreetedToday(userId);
    return reply;
  } catch (err: any) {
    console.error("[processPrivateDmConversationalMessage Error]:", err?.message);

    {
      const { getGreetingByTime } = await import("../../whatsapp-utils");
      const timeGreeting = getGreetingByTime();

      if (isEduardo) {
        const welcomeMsg = `¡${timeGreeting}, Eduardo! 👋 Estoy 100% activa y a tu entera disposición para hablar o apoyarte en cualquier gestión. ¿En qué te colaboro hoy?`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", welcomeMsg);
        return welcomeMsg;
      }
      if (isVecyBrokerLine && !isEduardoIdentified && !isJaniIdentified) {
        const brokerLineMsg = `¡${timeGreeting}, VECY! 👋 Estás en la línea oficial de VECY BIENES RAÍCES (+57 316 656 9719). ¿Con quién tengo el gusto de hablar hoy? ¿Con Eduardo o con Jani?`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", brokerLineMsg);
        return brokerLineMsg;
      }
      if (isShortSignalOrSticker(clean)) {
        const dotMsg = `¡${timeGreeting}${displayName ? ` ${displayName}` : ""}! 👋 Recibí tu señal / puntico por aquí. En *VECY BIENES RAÍCES* estoy lista para colaborarte. ¿Qué consulta o trámite deseas realizar hoy? 🤝`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", dotMsg);
        return dotMsg;
      }
      if (isFamilyOrTrusted && trustedContact) {
        let famMsg = "";
        if (/(?:dile\s+a\s+eddu|dile\s+a\s+eduardo|mensaje\s+a\s+eddu|av[ií]sale\s+a\s+eddu)/i.test(cleanLower)) {
          famMsg = `¡Anotadísimo, ${trustedContact.primaryNick || trustedContact.nicknames?.[0] || "Pollotote"}! Le paso tu mensaje a Eduardo (Eddu) de inmediato 🤝✨.`;
        } else if (trustedContact.customMessage) {
          famMsg = `¡${timeGreeting}, ${trustedContact.customMessage}`;
        } else {
          famMsg = `¡${timeGreeting}, ${trustedContact.primaryNick || displayName}! JanIA, la inteligencia artificial de VECY BIENES RAÍCES 🤖✨. Te cuento que Eduardo está disponible en su línea de bróker: +57 316 656 9719 (https://wa.me/573166569719).`;
        }
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", famMsg);
        return famMsg;
      }
      if (/(?:cobro|prejur[ií]dico|embargo|serlefin|deuda|cobranza)/i.test(cleanLower)) {
        const shieldMsg = `No tengo información de esa persona ni manejo agendas personales. En VECY BIENES RAÍCES este es el canal técnico de la plataforma virtual.`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", shieldMsg);
        return shieldMsg;
      }
      if (mediaOptions?.flyerVisionData?.isFlyerOrBanner || mediaOptions?.flyerVisionData?.title) {
        const title = mediaOptions.flyerVisionData.title || (mediaOptions.flyerVisionData as any).propertyTitle || "Apartamento en Venta Chico 120m2";
        const flyerMsg = `¡${timeGreeting} ${displayName}! 👋 He analizado con visión artificial tu afiche comercial: *${title}*. Ya quedó registrado en el sistema de VECY BIENES RAÍCES para cruzarlo con nuestra base de demandas 🤝✨.`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", flyerMsg);
        return flyerMsg;
      }
      if (hasImage) {
        const photoMsg = `¡${timeGreeting} ${displayName}! 👋 He recibido tu imagen. En VECY BIENES RAÍCES estamos a tu servicio para Factura Predial, Policía Nacional y trámites inmobiliarios. ¿En qué te podemos colaborar hoy? 🤝✨`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", photoMsg);
        return photoMsg;
      }

      const { getPendingCedulaSession, extractAllCedulasForVerification, extractCedulaForVerification, savePendingCedulaSession } = await import("../../identityVerificationService");
      const savedCedSession = getPendingCedulaSession(userId);
      if (savedCedSession?.reportText) {
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", savedCedSession.reportText);
        return savedCedSession.reportText;
      }

      const multiCed = extractAllCedulasForVerification(clean, true);
      if (multiCed.length > 1) {
        const { executeIdentityVerificationFromWhatsApp } = await import("../../identityVerificationService");
        const verif = await executeIdentityVerificationFromWhatsApp(clean, true);
        if (verif.reportText) {
          savePendingCedulaSession(userId, multiCed, verif.reportText, true);
        }
        const rawNumMsg = `¡${timeGreeting}${displayName ? ` ${displayName}` : ""}! 👋 Recibí el dato *${multiCed.map(c => c.cedula).join(", ")}*. Confírmame qué trámite requieres:\n• Cédula de Ciudadanía (C.C.) / Cédula de Extranjería (C.E.) / Pasaporte / NIT (Persona Jurídica) para antecedentes.\n• O consulta de Factura Predial Bogotá / Paz y Salvo IDU. Quedo atenta para emitir el reporte oficial 🤝✨.\n\n_⚖️ Tratamiento de datos Ley 1581/12._`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", rawNumMsg);
        return rawNumMsg;
      }

      const singleCedCheck = extractCedulaForVerification(clean, true);
      if (singleCedCheck.found && singleCedCheck.cedula) {
        const { setPendingUnconfirmedDoc } = await import("../../identityVerificationService");
        setPendingUnconfirmedDoc(userId, singleCedCheck.cedula);
        const rawNumMsg = `¡${timeGreeting}${displayName ? ` ${displayName}` : ""}! 👋 Recibí el dato *${singleCedCheck.cedula}*. Confírmame qué trámite requieres:\n• Cédula de Ciudadanía (C.C.) / Cédula de Extranjería (C.E.) / Pasaporte / NIT (Persona Jurídica) para antecedentes.\n• O consulta de Factura Predial Bogotá / Paz y Salvo IDU. Quedo atenta para emitir el reporte oficial 🤝✨.\n\n_⚖️ Tratamiento de datos Ley 1581/12._`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", rawNumMsg);
        return rawNumMsg;
      }

      if (/^\d{5,12}$/.test(clean)) {
        const { setPendingUnconfirmedDoc } = await import("../../identityVerificationService");
        setPendingUnconfirmedDoc(userId, clean);
        const rawNumMsg = `¡${timeGreeting}${displayName ? ` ${displayName}` : ""}! 👋 Recibí el dato *${clean}*. Confírmame qué trámite requieres:\n• Cédula de Ciudadanía (C.C.) / Cédula de Extranjería (C.E.) / Pasaporte / NIT (Persona Jurídica) para antecedentes.\n• O consulta de Factura Predial Bogotá / Paz y Salvo IDU. Quedo atenta para emitir el reporte oficial 🤝✨.\n\n_⚖️ Tratamiento de datos Ley 1581/12._`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", rawNumMsg);
        return rawNumMsg;
      }
      if (/^[A-Za-z]{3}\d{4}[A-Za-z0-9]{4}$/.test(clean)) {
        const { setPendingUnconfirmedDoc } = await import("../../identityVerificationService");
        setPendingUnconfirmedDoc(userId, clean);
        const chipMsg = `¡${timeGreeting}${displayName ? ` ${displayName}` : ""}! 👋 Recibí el código CHIP *${clean}*. ¿Deseas la factura del impuesto predial de Bogotá o el paz y salvo de valorización del IDU? Quedo atenta para emitirte el documento de inmediato 🤝✨.\n\n_⚖️ Tratamiento de datos Ley 1581/12._`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", chipMsg);
        return chipMsg;
      }
      if (/(?:^|\b)(?:es\s+cc|cc|c[eé]dula|1|antecedentes|idu|3|predial|2)\b/i.test(cleanLower)) {
        const { getPendingUnconfirmedDoc, clearPendingUnconfirmedDoc, executeIdentityVerificationFromWhatsApp } = await import("../../identityVerificationService");
        const pendingDoc = getPendingUnconfirmedDoc(userId);
        if (pendingDoc) {
          clearPendingUnconfirmedDoc(userId);
          const rawVal = pendingDoc.rawNumber || (pendingDoc as any);
          if (/^[A-Za-z]{3}\d{4}[A-Za-z0-9]{4}$/.test(rawVal)) {
            const { executeIduValorizacionFromWhatsApp } = await import("../../iduValorizacionService");
            const resIdu = await executeIduValorizacionFromWhatsApp(rawVal, userId, true);
            const reportOut = resIdu.reportText || "";
            appendDmHistory(userId, "user", clean);
            appendDmHistory(userId, "assistant", reportOut);
            return reportOut;
          }
          const verifResult = await executeIdentityVerificationFromWhatsApp(rawVal, true);
          if (verifResult.reportText) {
            const out = `¡Confirmado, ${displayName}!\n\n${verifResult.reportText}`;
            appendDmHistory(userId, "user", clean);
            appendDmHistory(userId, "assistant", out);
            return out;
          }
        }
      }
      if (/qu[eé] es vecy|qui[eé]nes son|presentaci[oó]n|a qu[eé] se dedican/i.test(cleanLower)) {
        const presMsg = `Somos *VECY BIENES RAÍCES*, fundada por Eduardo A. Rivera y Jani Alves. Conoce nuestras operaciones en https://www.instagram.com/vecybienesraices/ y califica nuestro servicio en https://g.page/r/CctNbwU6UpX5EBM/review.`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", presMsg);
        return presMsg;
      }
      if (/paz y salvo.*idu|valorizaci[oó]n idu|certificado.*idu|enlace.*webidu/i.test(cleanLower)) {
        const { formatIduAssistanceGuide } = await import("../../iduValorizacionService");
        const guide = formatIduAssistanceGuide(displayName || "Colega");
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", guide);
        return guide;
      }
      if (/c[oó]mo se hace la verificaci[oó]n|c[oó]mo se hace/i.test(cleanLower)) {
        const howTo = `¡No te preocupes ni un segundo, ${displayName}! Para eso estoy yo aquí. Para verificar una cédula o antecedentes. Para sacar el Impuesto Predial de Bogotá. Si te cuesta la tecnología o te enredas con el celular, tengo toda la paciencia del mundo. Solo facilítame el dato para el registro de portería previo a la visita.`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", howTo);
        return howTo;
      }
      if (/revisar los antecedentes de un cliente/i.test(cleanLower)) {
        const docIntent = `¡Claro que sí, ${displayName}! Con el mayor gusto te colaboro con la verificación preventiva para el registro de portería y control de acceso. Por favor compárteme el número de documento y el nombre completo.`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", docIntent);
        return docIntent;
      }
      if (/(?:quieto|quiero|revisar|rrvisar).*(?:antecedentes)/i.test(cleanLower)) {
        const habMsg = `¡Claro que sí, ${displayName}! Para consultar los antecedentes y verificar la identidad en la Policía Nacional, es indispensable contar con el número de cédula exacto. Por normatividad de Hábeas Data (Ley 1581 de 2012), las bases oficiales no permiten buscar números de documento usando únicamente nombres o apellidos.`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", habMsg);
        return habMsg;
      }
      if (/(?:consultar\s+c[eé]dula)/i.test(cleanLower)) {
        const docMsg = `¡Claro que sí, ${displayName}! Por favor indícame el número de documento y el nombre completo de la persona a consultar.`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", docMsg);
        return docMsg;
      }
      if (/costos/i.test(cleanLower)) {
        const cMsg = `Nuestros servicios de consulta y verificación son completamente *GRATIS*. Envíame el número de cédula.`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", cMsg);
        return cMsg;
      }
      if (/como es lo de las consultas/i.test(cleanLower)) {
        const qMsg = `Primero cuéntame qué clase de consulta deseas hacer. Ofrecemos Servicios 100% Gratuitos de Autoservicio: Verificación oficial de documentos, Factura Predial Bogotá y Certificados de Pago. Y Consultas Especializadas y Asesoría Profesional: Sondeos de mercado, Asesoría jurídica inmobiliaria, Recuperación de cartera, Avalúos digitales, Liquidaciones tributarias y Préstamos sobre hipoteca.`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", qMsg);
        return qMsg;
      }
      if (/(?:c[oó]mo\s+funciona|info|informaci[oó]n|qu[eé]\s+es|de\s+qu[eé]\s+trata|ayuda)/i.test(cleanLower)) {
        const nameGreeting = displayName ? `, ${displayName}` : "";
        const askName = !displayName ? " ¿Cómo es tu nombre para saber con quién tengo el gusto de hablar?" : "";
        const infoMsg = `¡${timeGreeting}${nameGreeting}! 👋 En *VECY BIENES RAÍCES* cruzamos ofertas y demandas inmobiliarias al instante, emitimos facturas de predial, certificados IDU y verificamos seguridad para tus visitas sin costo alguno.${askName} ¿Eres colega asesor inmobiliario o estás buscando alguna propiedad en especial para colaborarte hoy? 🤝✨`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", infoMsg);
        return infoMsg;
      }
      if (/muchas gracias|gracias/i.test(cleanLower)) {
        const gMsg = `¡Con todo el gusto${displayName ? `, ${displayName}` : ""}! 🤝✨ Te invito a unirte a nuestro Canal Oficial de WhatsApp (https://whatsapp.com/channel/0029Vb5iYUYCMY0A94zqti1b) y calificar nuestro servicio. ¿Hay algo más en lo que te pueda apoyar hoy?`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", gMsg);
        return gMsg;
      }
      if (/^hola\b|^buenas\b|^buenos\s+d[ií]as\b|^buenas\s+tardes\b|^buenas\s+noches\b/i.test(cleanLower)) {
        const nameGreeting = displayName ? `, ${displayName}` : "";
        const askName = !displayName ? " ¿Cómo es tu nombre para poder saludarte como se debe?" : "";
        const hMsg = `¡${timeGreeting}${nameGreeting}! 👋 Soy *JanIA*, tu colega y asistente inmobiliaria con IA de *VECY BIENES RAÍCES*.${askName} ¿Eres colega asesor inmobiliario o te gustaría consultar alguna propiedad o trámite hoy? 🏡✨`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", hMsg);
        return hMsg;
      }
    }

    const fallback = isEduardo
      ? `¡${timeSalutation}, Eduardo! 👋 Estoy 100% atenta. Tuve una breve demora de conexión de red con el modelo de lenguaje, pero ya me restablecí. ¿En qué te colaboro hoy? 🤝`
      : isJani
        ? `¡${timeSalutation}, Jani! Qué gusto saludarte. Tuve una breve demora de red en la consulta, pero ya estoy a tu entera disposición. ¿En qué te colaboro hoy? 🤝`
        : isFamilyOrTrusted
          ? `¡${timeSalutation}, ${displayName}! Qué pena contigo, ocurrió una pequeña demora de red en mi sistema (un pequeño fallo en la matrix 🤖😅). ¿Me confirmas nuevamente qué necesitas para ayudarte de inmediato? 🤝`
          : `¡${timeSalutation}${displayName ? ` ${displayName}` : ""}! Qué pena contigo. Tuve una pequeña demora de conexión de red con mi servicio de lenguaje. ¿Podrías por favor repetirme qué necesitas para orientarte de inmediato? 🤝`;
    appendDmHistory(userId, "user", clean);
    appendDmHistory(userId, "assistant", fallback);
    return fallback;
  }
}
