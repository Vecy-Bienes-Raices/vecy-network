/**
 * VECY NETWORK — FICHA ULTRA-COMPLETA DE REQUERIMIENTOS POR DM ("UNA SOLA PREGUNTA A LA VEZ")
 * Acumulador progresivo en sesión (`pendingRequirementDraft` en keyFacts) para guiar al usuario
 * turno por turno antes de radicar en PostgreSQL + Web y ejecutar Matching 85%-100%.
 */
import {
  getPropertyCategoryGroup,
  findDepartmentForCity,
  PROPERTY_TYPES_EXACT,
} from "../../../shared/colombiaCatalog";
import { parseArea, parseColombianCurrency } from "../../../shared/colombianRealEstateParser";
import { buscarLugarColombia } from "../colombia-geography";
import { extractAllBarriosFromText } from "../matching";
import { getUserPerpetualSession, saveUserPerpetualSession } from "./sessionManager";
import { createMatchSignatureRequest } from "../matchSignatureService";

export type DraftAskedField =
  | "transactionType"
  | "propertyType"
  | "city"
  | "neighborhood"
  | "budgetMax"
  | "paymentMethod"
  | "areaMin"
  | "bedroomsExact"
  | "bathroomsMin"
  | "garagesMin"
  | "extrasAndSpecs";

export interface PendingRequirementDraft {
  active: boolean;
  transactionType?: "venta" | "arriendo" | "venta_o_arriendo" | "arriendo_con_opcion_de_compra" | "permuta";
  propertyTypeExact?: string;
  propertyTypeDb?: string;
  subtype?: string;
  city?: string;
  department?: string;
  locality?: string;
  neighborhood?: string;
  budgetMax?: number;
  paymentMethod?: string;
  areaMin?: number;
  bedroomsExact?: number;
  bathroomsMin?: number;
  garagesMin?: number;
  garageType?: string;
  extrasAndSpecs?: string;
  extrasPrompted?: boolean;
  askedField?: DraftAskedField;
  rawChunks: string[];
  updatedAt: string;
}

const PROPERTY_KEYWORD_MAP: Array<{ regex: RegExp; exact: string; db: string; subtype?: string }> = [
  { regex: /\bpent\s*house\s*d[uú]plex\b/i, exact: "Pent House Dúplex", db: "apartment" },
  { regex: /\bpent\s*house\b|\bpenthouse\b/i, exact: "Pent House", db: "apartment" },
  { regex: /\bapartamento\s*d[uú]plex\b|\bapto\s*d[uú]plex\b/i, exact: "Apartamento Dúplex", db: "apartment" },
  { regex: /\baparta\s*hotel\b|\bapartahotel\b/i, exact: "Aparta Hotel", db: "hotel" },
  { regex: /\baparta\s*estudio\b|\bloft\b|\bstudio\b/i, exact: "Apartaestudio", db: "apartment" },
  { regex: /\bcasa\s*campestre\b/i, exact: "Casa Campestre", db: "house" },
  { regex: /\bcasa\s*quinta\b/i, exact: "Casa Quinta", db: "house" },
  { regex: /\bconsultorio\b/i, exact: "Oficina", db: "consultorio", subtype: "Consultorio Médico / Salud" },
  { regex: /\bapartamento\b|\bapto\b/i, exact: "Apartamento", db: "apartment" },
  { regex: /\bcaba[ñn]a\b/i, exact: "Cabaña", db: "cabin" },
  { regex: /\bvilla\b/i, exact: "Villa", db: "house" },
  { regex: /\bfinca\b|\bhacienda\b/i, exact: "Finca", db: "farm" },
  { regex: /\bcasa\b/i, exact: "Casa", db: "house" },
  { regex: /\blote\b|\bterreno\b|\bpredio\s*rural\b|\btierra\b/i, exact: "Lote / Terreno", db: "land" },
  { regex: /\boficina\b/i, exact: "Oficina", db: "office" },
  { regex: /\blocal\b/i, exact: "Local", db: "commercial" },
  { regex: /\bbodega\b/i, exact: "Bodega", db: "warehouse" },
  { regex: /\bedificio\b/i, exact: "Edificio", db: "building" },
  { regex: /\bhostal\b/i, exact: "Hostal", db: "hotel" },
  { regex: /\bhotel\b/i, exact: "Hotel", db: "hotel" },
];

export function isExplicitRequirementSearchIntent(text: string): boolean {
  const clean = (text || "").trim();
  if (!clean || clean.length < 6) return false;
  const low = clean.toLowerCase();

  // No secuestrar consultas informativas, honorarios, predial, IDU, cédulas o créditos
  if (/(?:cu[aá]nto\s+cobran|comisi[oó]n|40\/20\/40|retenci[oó]n|notarial|predial|idu|rues|nit|c[eé]dula|antecedentes|adres|cr[eé]dito|leasing|cap\s*rate|ley\s*675|retroventa|dinosaurios)/i.test(low)) {
    return false;
  }

  const hasSearchVerb = /\b(?:busco|estoy\s+buscando|and[oa]\s+buscando|necesito|requiero|quiero\s+(?:comprar|arrendar|tomar\s+en\s+arriendo|alquilar)|me\s+interesa\s+(?:comprar|arrendar))\b/i.test(low);
  const hasType = PROPERTY_KEYWORD_MAP.some((p) => p.regex.test(low));
  return hasSearchVerb && hasType;
}

export async function getActiveRequirementDraft(userId: string): Promise<PendingRequirementDraft | null> {
  const sess = await getUserPerpetualSession(userId);
  const draft = sess.keyFacts?.pendingRequirementDraft as PendingRequirementDraft | undefined;
  if (draft && draft.active) return draft;
  return null;
}

export async function saveRequirementDraft(userId: string, draft: PendingRequirementDraft | null): Promise<void> {
  const sess = await getUserPerpetualSession(userId);
  sess.keyFacts = sess.keyFacts || {};
  if (!draft) {
    delete sess.keyFacts.pendingRequirementDraft;
  } else {
    sess.keyFacts.pendingRequirementDraft = draft;
  }
  await saveUserPerpetualSession(sess);
}

function mergeMessageIntoDraft(draft: PendingRequirementDraft, text: string): PendingRequirementDraft {
  const clean = text.trim();
  const low = clean.toLowerCase();
  const next: PendingRequirementDraft = {
    ...draft,
    active: true,
    rawChunks: [...(draft.rawChunks || []), clean],
    updatedAt: new Date().toISOString(),
  };

  // 1. Si JanIA esperaba respuesta a una pregunta puntual (askedField)
  if (draft.askedField === "transactionType") {
    if (/\b(?:venta\s*o\s*arriendo|ambos|cualquiera\s+de\s+los\s+dos)\b/i.test(low)) next.transactionType = "venta_o_arriendo";
    else if (/\bopci[oó]n\s+de\s+compra\b/i.test(low)) next.transactionType = "arriendo_con_opcion_de_compra";
    else if (/\bpermuta\b/i.test(low)) next.transactionType = "permuta";
    else if (/\b(?:arriendo|alquiler|arrendar|alquilar)\b/i.test(low)) next.transactionType = "arriendo";
    else if (/\b(?:compra|comprar|venta)\b/i.test(low)) next.transactionType = "venta";
  } else if (draft.askedField === "propertyType") {
    const matchedType = PROPERTY_KEYWORD_MAP.find((p) => p.regex.test(clean));
    if (matchedType) {
      next.propertyTypeExact = matchedType.exact;
      next.propertyTypeDb = matchedType.db;
      if (matchedType.subtype) next.subtype = matchedType.subtype;
    } else if (clean.length <= 40) {
      const exactFromList = PROPERTY_TYPES_EXACT.find((t) => t.toLowerCase() === low);
      if (exactFromList) next.propertyTypeExact = exactFromList;
    }
  } else if (draft.askedField === "city" && clean.length <= 60) {
    const geo = buscarLugarColombia(clean);
    if (geo && geo.nombreCanonico) {
      next.city = geo.nombreCanonico;
      next.department = geo.departamento || findDepartmentForCity(geo.nombreCanonico) || undefined;
    } else {
      next.city = clean.replace(/^(?:en\s+|ciudad\s*:?\s*)/i, "").trim();
      const dep = findDepartmentForCity(next.city);
      if (dep) next.department = dep;
    }
  } else if (draft.askedField === "neighborhood" && clean.length <= 120) {
    const nClean = clean.replace(/^(?:en\s+|barrio\s*:?\s*|sector\s*:?\s*|vereda\s*:?\s*)/i, "").trim();
    if (nClean) next.neighborhood = nClean;
  } else if (draft.askedField === "paymentMethod" && !next.paymentMethod) {
    next.paymentMethod = clean;
  } else if (draft.askedField === "areaMin") {
    const areaParsed = parseArea(clean);
    if (areaParsed && areaParsed > 0) {
      next.areaMin = areaParsed;
    } else {
      const bareNum = parseFloat(clean.replace(/,/g, ".").replace(/[^\d.]/g, ""));
      if (!isNaN(bareNum) && bareNum > 5) next.areaMin = bareNum;
    }
  } else if (draft.askedField === "bedroomsExact") {
    const m = clean.match(/(\d{1,2})/);
    if (m) next.bedroomsExact = parseInt(m[1], 10);
  } else if (draft.askedField === "bathroomsMin") {
    const m = clean.match(/(\d{1,2})/);
    if (m) next.bathroomsMin = parseInt(m[1], 10);
  } else if (draft.askedField === "garagesMin") {
    if (/\b(?:no\s+requiero|ninguno|sin\s+(?:garaje|parqueadero)|cero)\b/i.test(low)) {
      next.garagesMin = 0;
    } else {
      const m = clean.match(/(\d{1,2})/);
      if (m) next.garagesMin = parseInt(m[1], 10);
      else if (/\b(?:independiente|lineal|cubierto)\b/i.test(low)) next.garagesMin = 1;
    }
    if (/independiente/i.test(low)) next.garageType = "Independientes";
    else if (/lineal/i.test(low)) next.garageType = "Lineales";
  } else if (draft.askedField === "extrasAndSpecs") {
    next.extrasPrompted = true;
    if (!/^(?:no|ningun[oa]?|nada|as[ií]\s+est[aá]\s+bien|todo\s+bien|listo|eso\s+es\s+todo)\b/i.test(low)) {
      next.extrasAndSpecs = clean;
    } else {
      next.extrasAndSpecs = "Sin requisitos adicionales";
    }
  }

  // 2. Extracción general oportunista desde cualquier frase libre (ej: Turno 1 con muchos datos)
  if (!next.transactionType) {
    if (/\b(?:venta\s*o\s*arriendo)\b/i.test(low)) next.transactionType = "venta_o_arriendo";
    else if (/\bopci[oó]n\s+de\s+compra\b/i.test(low)) next.transactionType = "arriendo_con_opcion_de_compra";
    else if (/\bpermuta\b/i.test(low)) next.transactionType = "permuta";
    else if (/\b(?:arriendo|arrendar|alquilo|alquiler)\b/i.test(low)) next.transactionType = "arriendo";
    else if (/\b(?:comprar|compra|venta)\b/i.test(low)) next.transactionType = "venta";
  }

  if (!next.propertyTypeDb) {
    const matched = PROPERTY_KEYWORD_MAP.find((p) => p.regex.test(clean));
    if (matched) {
      next.propertyTypeExact = matched.exact;
      next.propertyTypeDb = matched.db;
      if (matched.subtype) next.subtype = matched.subtype;
    }
  }

  if (!next.city) {
    const geo = buscarLugarColombia(clean);
    if (geo && geo.nombreCanonico) {
      next.city = geo.nombreCanonico;
      next.department = geo.departamento || findDepartmentForCity(geo.nombreCanonico) || undefined;
    }
  }

  if (!next.neighborhood) {
    const barriosFound = extractAllBarriosFromText(clean).filter(
      (b) => b.toLowerCase() !== (next.city || "").toLowerCase()
    );
    if (barriosFound.length > 0) {
      next.neighborhood = barriosFound.join(", ");
    } else {
      const barM = clean.match(/(?:barrio|sector|vereda|zona)\s+(?:de\s+|en\s+)?([A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s,]{3,45}?)(?:,|\.|;|$|\s+(?:en|con|hasta|de\s+\d|por))/i);
      if (barM && barM[1]) {
        const candidate = barM[1].trim();
        if (candidate.toLowerCase() !== (next.city || "").toLowerCase()) {
          next.neighborhood = candidate;
        }
      } else if (next.city) {
        const escapedCity = next.city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const afterCityM = clean.match(
          new RegExp(`${escapedCity}(?:\\s*,\\s*|\\s+)(?!en\\b|con\\b|hasta\\b|por\\b|de\\b|para\\b|venta\\b|arriendo\\b)([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúÑñ\\s]{2,32}?)(?=\\s+(?:hasta|por|de|con|para|\\$|\\d)|,|\\.|;|$)`)
        );
        if (afterCityM && afterCityM[1]) {
          next.neighborhood = afterCityM[1].trim();
        }
      }
    }
  }

  if (!next.budgetMax) {
    const budgetParsed = parseColombianCurrency(clean);
    if (budgetParsed && budgetParsed >= 300_000) {
      next.budgetMax = budgetParsed;
    } else if (draft.askedField === "budgetMax") {
      const numOnly = parseFloat(clean.replace(/\./g, "").replace(",", "."));
      if (!isNaN(numOnly) && numOnly > 0) {
        next.budgetMax = numOnly < 10_000 ? numOnly * 1_000_000 : numOnly;
      }
    }
  }

  if (!next.paymentMethod) {
    if (/\b(?:contado|recursos\s+propios|efectivo)\b/i.test(low)) next.paymentMethod = "Recursos propios / Contado";
    else if (/\bcr[eé]dito\b|\bhipotecario\b|\bbanco\b/i.test(low)) next.paymentMethod = "Crédito bancario";
    else if (/\bleasing\b/i.test(low)) next.paymentMethod = "Leasing";
  }

  if (!next.areaMin) {
    const aParsed = parseArea(clean);
    if (aParsed && aParsed > 0) next.areaMin = aParsed;
  }

  if (next.bedroomsExact === undefined) {
    const bedM = clean.match(/(\d{1,2})\s*(?:alcobas?|hab(?:s|itaciones|itaci[oó]n)?|dormitorios?)\b/i);
    if (bedM) next.bedroomsExact = parseInt(bedM[1], 10);
  }

  if (next.bathroomsMin === undefined) {
    const bathM = clean.match(/(\d{1,2})\s*(?:ba[ñn]os?|wc)\b/i);
    if (bathM) next.bathroomsMin = parseInt(bathM[1], 10);
  }

  if (next.garagesMin === undefined) {
    const garM = clean.match(/(\d{1,2})\s*(?:parqueaderos?|garajes?)\b/i);
    if (garM) next.garagesMin = parseInt(garM[1], 10);
    if (/independiente/i.test(low)) next.garageType = "Independientes";
  }

  return next;
}

export function getNextMissingRequirementQuestion(
  draft: PendingRequirementDraft,
  displayName?: string
): { field: DraftAskedField; question: string } | null {
  const nameTag = displayName ? `, ${displayName}` : "";
  const catGroup = getPropertyCategoryGroup(draft.propertyTypeDb || draft.propertyTypeExact || "apartment");

  if (!draft.transactionType) {
    return {
      field: "transactionType",
      question: `¡Con gusto${nameTag}! ¿Lo estás buscando para compra o para arriendo?`,
    };
  }
  if (!draft.propertyTypeDb) {
    return {
      field: "propertyType",
      question: `Perfecto${nameTag}. ¿Qué tipo de inmueble buscas exactamente (apartamento, casa, lote, oficina, local, bodega, finca)?`,
    };
  }
  if (!draft.city) {
    return {
      field: "city",
      question: `¡Anotado${nameTag}! ¿En qué ciudad o municipio de Colombia buscas ese ${draft.propertyTypeExact || "inmueble"}?`,
    };
  }
  if (!draft.neighborhood) {
    return {
      field: "neighborhood",
      question: `Súper, ${draft.city}. ¿En qué barrios, sectores, localidad o vereda prefieres buscar?`,
    };
  }
  if (!draft.budgetMax) {
    const pagoHint = draft.transactionType === "venta" ? " y si sería de contado o con crédito" : "";
    return {
      field: "budgetMax",
      question: `¿Cuál es tu presupuesto máximo en pesos${pagoHint}?`,
    };
  }
  if (draft.transactionType === "venta" && !draft.paymentMethod) {
    return {
      field: "paymentMethod",
      question: `¿La compra sería con recursos propios (contado) o con crédito aprobado?`,
    };
  }
  if (!draft.areaMin) {
    const unitHint = catGroup === "land" || catGroup === "rural_farm" ? " (m², fanegadas o hectáreas)" : " en m²";
    return {
      field: "areaMin",
      question: `¿Desde qué área mínima${unitHint} te sirve?`,
    };
  }
  if ((catGroup === "residential" || catGroup === "rural_farm") && draft.bedroomsExact === undefined) {
    return {
      field: "bedroomsExact",
      question: `¿De cuántas habitaciones exactas lo necesitas?`,
    };
  }
  if (catGroup !== "land" && draft.bathroomsMin === undefined) {
    return {
      field: "bathroomsMin",
      question: `¿Cuántos baños mínimos necesitas?`,
    };
  }
  if (catGroup !== "land" && draft.garagesMin === undefined) {
    return {
      field: "garagesMin",
      question: `¿Cuántos parqueaderos necesitas (y si deben ser independientes)? Si no requieres, dime 0.`,
    };
  }
  if (!draft.extrasPrompted) {
    const tailHint =
      catGroup === "land"
        ? "uso de suelo, topografía o servicios públicos"
        : catGroup === "office_consultorio" || catGroup === "commercial_warehouse"
          ? "administración máxima, altura, energía trifásica o habilitación"
          : "administración máxima, piso/ascensor, balcón o si aceptan mascotas";
    return {
      field: "extrasAndSpecs",
      question: `Por último, ¿tienes algún requisito clave sobre ${tailHint}? Si no, dime *"así está bien"*.`,
    };
  }

  return null;
}

export function buildConsolidatedRequirementText(draft: PendingRequirementDraft): string {
  const parts: string[] = [
    `Busco ${draft.propertyTypeExact || "Inmueble"}${draft.subtype ? ` (${draft.subtype})` : ""}`,
    `en ${draft.transactionType || "venta"}`,
    `en ${draft.neighborhood || ""}${draft.neighborhood && draft.city ? ", " : ""}${draft.city || ""}${draft.department ? ` (${draft.department})` : ""}`,
  ];
  if (draft.budgetMax) parts.push(`Presupuesto máximo: $${Number(draft.budgetMax).toLocaleString("es-CO")} COP`);
  if (draft.paymentMethod) parts.push(`Forma de pago: ${draft.paymentMethod}`);
  if (draft.areaMin) parts.push(`Área mínima: ${draft.areaMin} m2`);
  if (draft.bedroomsExact !== undefined) parts.push(`${draft.bedroomsExact} habitaciones`);
  if (draft.bathroomsMin !== undefined) parts.push(`${draft.bathroomsMin} baños`);
  if (draft.garagesMin !== undefined) parts.push(`${draft.garagesMin} parqueaderos${draft.garageType ? ` (${draft.garageType})` : ""}`);
  if (draft.extrasAndSpecs && draft.extrasAndSpecs !== "Sin requisitos adicionales") {
    parts.push(`Otras especificaciones: ${draft.extrasAndSpecs}`);
  }
  return parts.filter(Boolean).join(". ") + ".";
}

/**
 * Procesa un turno conversacional de ficha progresiva de requerimiento por DM ("1 pregunta a la vez").
 * Retorna string de respuesta si interceptó el flujo, o null si no aplica.
 */
export async function handleIncrementalRequirementDraftTurn(params: {
  userId: string;
  userName?: string;
  displayName?: string;
  messageText: string;
  isFounder?: boolean;
}): Promise<string | null> {
  const clean = (params.messageText || "").trim();
  const low = clean.toLowerCase();
  const existingDraft = await getActiveRequirementDraft(params.userId);

  if (existingDraft) {
    // Permitir cancelar limpiamente el borrador en cualquier momento
    if (/^(?:cancelar|salir|ya\s+no|olv[ií]dalo|dejar\s+as[ií]|no\s+quiero\s+seguir)\b/i.test(low)) {
      await saveRequirementDraft(params.userId, null);
      return `¡Listo${params.displayName ? `, ${params.displayName}` : ""}! Dejamos esa búsqueda en pausa. Cuando quieras retomarla, me cuentas.`;
    }
    // Si envía un número suelto largo (cédula) o hace pregunta jurídica/predial explícita, no secuestrar
    if (/^\d{7,12}$/.test(clean) && existingDraft.askedField !== "budgetMax" && existingDraft.askedField !== "areaMin") {
      return null;
    }
  } else {
    if (!isExplicitRequirementSearchIntent(clean)) {
      return null;
    }
  }

  const baseDraft: PendingRequirementDraft = existingDraft || {
    active: true,
    rawChunks: [],
    updatedAt: new Date().toISOString(),
  };

  const updated = mergeMessageIntoDraft(baseDraft, clean);
  const nextMissing = getNextMissingRequirementQuestion(updated, params.displayName);

  if (nextMissing) {
    updated.askedField = nextMissing.field;
    await saveRequirementDraft(params.userId, updated);
    return nextMissing.question;
  }

  // Ficha ultra-completa lista -> radicar en BD/Web y correr matching 85%-100%
  await saveRequirementDraft(params.userId, null);
  const consolidatedText = buildConsolidatedRequirementText(updated);
  const sess = await getUserPerpetualSession(params.userId);
  const userRole = String(sess.keyFacts?.businessRole || "comprador_inversionista");

  try {
    const { processWhatsAppMessage } = await import("./handlers/propertiesHandler");
    const res = await processWhatsAppMessage(
      consolidatedText,
      params.userId,
      params.userName || params.displayName,
      false,
      [],
      undefined,
      undefined,
      false
    );

    if (res.inserted && res.savedId) {
      const { findMatchesForRequirement } = await import("../matching");
      const rawMatches = await findMatchesForRequirement(res.savedId);

      if (Array.isArray(rawMatches) && rawMatches.length > 0) {
        if (params.isFounder) {
          const topList = rawMatches
            .slice(0, 3)
            .map((m: any) => `• *#M${m.matchId || m.id}* (${Math.round(Number(m.score || 0))}%) — ${m.zone || updated.neighborhood}`)
            .join("\n");
          return `¡Radicado *REQ-${res.savedId}* con ${rawMatches.length} coincidencia(s)!\n${topList}`;
        }

        const sigReq = await createMatchSignatureRequest({
          userJid: params.userId,
          userName: params.displayName || params.userName,
          userRole,
          requirementId: res.savedId,
          requirementTitle: `${updated.propertyTypeExact || "Inmueble"} en ${updated.neighborhood || updated.city}`,
          matches: rawMatches.slice(0, 3).map((m: any) => ({
            matchCode: `#M${m.matchId || m.id}`,
            propertyCode: m.propertyId ? `PROP-${m.propertyId}` : undefined,
            propertyId: m.propertyId,
            score: Math.round(Number(m.score || 0)),
            tipoInmueble: m.propertyType || updated.propertyTypeExact || "Inmueble",
            zona: m.zone || m.addressNeighborhood || updated.neighborhood || "Sector compatible",
            ciudad: m.addressCity || updated.city || "Colombia",
            precioOCanon: m.rentPrice || m.rent_price
              ? `$${Number(m.rentPrice || m.rent_price).toLocaleString("es-CO")}/mes`
              : m.price
                ? `$${Number(m.price).toLocaleString("es-CO")}`
                : "Por confirmar",
            area: m.areaTotal ? `${m.areaTotal} m²` : undefined,
          })),
        });

        const best = rawMatches[0];
        const bestScore = Math.round(Number(best.score || 85));
        const bestZone = best.zone || updated.neighborhood || updated.city;
        return (
          `¡Excelente noticia${params.displayName ? `, ${params.displayName}` : ""}! 🎯 Guardé tu búsqueda (*REQ-${res.savedId}*) y encontré *${rawMatches.length} opción(es)* hasta con *${bestScore}%* de afinidad en *${bestZone}*.\n` +
          `Para desbloquear los códigos y recibir tu constancia en PDF por aquí, firma tus Términos y Política de Privacidad en 20 segundos:\n` +
          `👉 ${sigReq.url}\n` +
          `_(Si prefieres hacerlo desde este chat, responde *"Sí acepto"*)._`
        );
      }

      return (
        `¡Listo${params.displayName ? `, ${params.displayName}` : ""}! Tu requerimiento quedó activo en nuestra red nacional con radicado *REQ-${res.savedId}*.\n` +
        `Ahora mismo no hay opciones arriba del 85% en *${updated.neighborhood || updated.city}*, pero nuestro radar queda atento y Eduardo o Jani te contactarán en cuanto aparezca.`
      );
    }
  } catch (err: any) {
    console.warn("[requirementDraftService] Error radicando requerimiento:", err?.message);
  }

  return `¡Perfecto${params.displayName ? `, ${params.displayName}` : ""}! Tomé nota completa de tu búsqueda en *${updated.neighborhood || updated.city}*. Si deseas ajustarle algo o publicarla directo en web, entra a 👉 https://vecy-bienes-raices.vercel.app/demandas`;
}
