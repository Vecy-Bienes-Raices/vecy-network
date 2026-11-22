import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { eq, ne, desc, asc, ilike, or, isNull, and, gte, lte, sql } from "drizzle-orm";
import {
  assertCanCreateProperty,
  assertCanImportByUrl,
  getUserEffectiveEntitlements,
  incrementUsageQuota,
} from "../_core/planEntitlements";

import { getDb } from "../db";
import { properties, propertyImages } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { getPropertyRefCityPrefix, findDepartmentForCity, BOGOTA_LOCALITIES } from "../../shared/colombiaCatalog";
import { parseArea } from "../../shared/colombianRealEstateParser";
import { buscarLugarColombia } from "../_core/colombia-geography";
import { extractFallbackDataFromText } from "../_core/janIA";

const propertyInputSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  propertyType: z.enum([
    "apartment", "house", "building", "warehouse", "farm", "hotel", 
    "office", "land", "commercial", "loft", "consultorio", "cabin"
  ]),
  transactionType: z.enum([
    "venta", "arriendo", "venta_o_arriendo", "arriendo_temporal", 
    "arriendo_con_opcion_de_compra", "permuta", "venta_permuta", "aporte"
  ]).default("venta"),
  price: z.string().min(1),
  rentPrice: z.string().optional().nullable(),
  currency: z.enum(["COP", "USD"]).default("COP"),
  city: z.string().default("Bogotá"),
  location: z.string().optional().nullable(),
  zone: z.string().min(2),
  addressCity: z.string().optional().nullable(),
  addressLocality: z.string().optional().nullable(),
  addressNeighborhood: z.string().optional().nullable(),
  coordinates: z.any().optional().nullable(),
  bedrooms: z.number().optional().nullable(),
  bathrooms: z.number().optional().nullable(),
  garages: z.number().optional().nullable(),
  stratum: z.number().optional().nullable(),
  floorDetail: z.string().optional().nullable(),
  areaTotal: z.string().optional().nullable(),
  areaPrivate: z.string().optional().nullable(),
  yearBuilt: z.number().optional().nullable(),
  antiguedadAnos: z.number().optional().nullable(),
  isAmoblado: z.boolean().optional().default(false),
  adminFee: z.string().optional().nullable(),
  commissionPercent: z.string().optional().nullable(),
  matriculaInmobiliaria: z.string().optional().nullable(),
  videoUrl: z.string().optional().nullable(),
  externalUrl: z.string().optional().nullable(),
  rawText: z.string().optional().nullable(),
  featured: z.boolean().optional().default(false),
  available: z.boolean().optional().default(true),
  idUsuarioWhatsapp: z.string().optional().nullable(),
  amenities: z.any().optional().nullable(),
  latitude: z.string().optional().nullable(),
  longitude: z.string().optional().nullable(),
  images: z.array(z.string()).optional().nullable(),
  republishToVecyStore: z.boolean().optional(),
  visibilityScope: z.enum(["public_and_agent", "agent_only", "private"]).optional(),
  agencyId: z.number().optional().nullable(),
  sourcePortal: z.string().max(80).optional().nullable(),
  sourceUrl: z.string().max(2048).optional().nullable(),
  rawImportPayload: z.any().optional().nullable(),
});

type AdminPropertyListItem = {
  id: number;
  name: string;
  price: string;
  rentPrice: string | null;
  city: string | null;
  location: string | null;
  zone: string;
  addressCity: string | null;
  addressLocality: string | null;
  addressNeighborhood: string | null;
  propertyType: typeof properties.$inferSelect.propertyType;
  transactionType: typeof properties.$inferSelect.transactionType;
  description: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  stratum: number | null;
  floorDetail: string | null;
  areaTotal: string | null;
  yearBuilt: number | null;
  adminFee: string | null;
  matriculaInmobiliaria: string | null;
  featured: boolean | null;
  available: boolean | null;
  standByDirectoVecy: boolean | null;
  aceptaTerceria: boolean | null;
  estadoComercial: string | null;
  amenities: unknown;
  images: unknown;
  videoUrl: string | null;
  republishToVecyStore: boolean | null;
  visibilityScope: string | null;
  sourcePortal: string | null;
  agentId: number | null;
  agencyId: number | null;
  createdAt: Date;
};

const propertyFields = {
  id: properties.id,
  name: properties.name,
  price: properties.price,
  rentPrice: properties.rentPrice,
  city: properties.city,
  location: properties.location,
  zone: properties.zone,
  addressCity: properties.addressCity,
  addressLocality: properties.addressLocality,
  addressNeighborhood: properties.addressNeighborhood,
  propertyType: properties.propertyType,
  transactionType: properties.transactionType,
  description: properties.description,
  bedrooms: properties.bedrooms,
  bathrooms: properties.bathrooms,
  garages: properties.garages,
  stratum: properties.stratum,
  floorDetail: properties.floorDetail,
  areaTotal: properties.areaTotal,
  yearBuilt: properties.yearBuilt,
  adminFee: properties.adminFee,
  matriculaInmobiliaria: properties.matriculaInmobiliaria,
  featured: properties.featured,
  available: properties.available,
  standByDirectoVecy: properties.standByDirectoVecy,
  aceptaTerceria: properties.aceptaTerceria,
  estadoComercial: properties.estadoComercial,
  amenities: properties.amenities,
  images: properties.images,
  videoUrl: properties.videoUrl,
  republishToVecyStore: properties.republishToVecyStore,
  visibilityScope: properties.visibilityScope,
  sourcePortal: properties.sourcePortal,
  agentId: properties.agentId,
  agencyId: properties.agencyId,
  createdAt: properties.createdAt,
};

/**
 * Puntaje determinista de completitud y calidad visual para priorizar en VECY TIENDA
 * las publicaciones completas con fotos propias de agentes.
 */
export function computeListingCompletenessRank(prop: {
  images?: unknown;
  videoUrl?: string | null;
  price?: string | number | null;
  areaTotal?: string | number | null;
  description?: string | null;
  addressNeighborhood?: string | null;
  addressCity?: string | null;
  city?: string | null;
  agentId?: number | null;
  featured?: boolean | null;
}): number {
  let score = 0;
  const imgs = Array.isArray(prop.images) ? prop.images.filter((u) => typeof u === "string" && u.trim().length > 0) : [];
  if (imgs.length > 0) {
    score += 500 + Math.min(imgs.length, 10) * 10;
  }
  if (prop.videoUrl && prop.videoUrl.trim().length > 4) score += 40;
  if (Number(prop.price || 0) > 0) score += 40;
  if (Number(prop.areaTotal || 0) > 0) score += 30;
  if ((prop.description || "").trim().length >= 30) score += 25;
  if (prop.addressNeighborhood && (prop.addressCity || prop.city)) score += 20;
  if (prop.agentId) score += 25;
  if (prop.featured) score += 35;
  return score;
}

let cachedAdminMyList: AdminPropertyListItem[] | null = null;
let cachedAdminMyListTime = 0;

export function invalidatePropertiesListCache() {
  cachedAdminMyList = null;
  cachedAdminMyListTime = 0;
}

const propertyGetByIdCache = new Map<number, { data: any; expiresAt: number }>();

export function invalidatePropertyGetByIdCache(id?: number) {
  if (id) {
    propertyGetByIdCache.delete(id);
  } else {
    propertyGetByIdCache.clear();
  }
}

export function parsePropertyDeterministically(text: string) {
  const norm = text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const lower = norm.toLowerCase();

  // Tipo de inmueble exacto y subtipo comercial
  let propertyType = "apartment";
  let propertyTypeExact = "Casa";
  let isSubtipoComercial = false;
  let subtype: string | null = null;

  if (lower.includes("casa comercial") || lower.includes("sede empresarial") || lower.includes("oficina en casa")) {
    propertyType = "commercial";
    propertyTypeExact = "Casa";
    isSubtipoComercial = true;
    subtype = lower.includes("sede") 
      ? "Sede Empresarial / Institucional" 
      : (lower.includes("oficina") ? "Oficina en Casa" : "Casa Comercial / Oficinas / Sede");
  } else if (lower.includes("local comercial") || lower.includes("local")) {
    propertyType = "commercial";
    propertyTypeExact = "Local";
    isSubtipoComercial = true;
    subtype = lower.includes("centro comercial") ? "Local en Centro Comercial" : "Local Comercial a la Calle";
  } else if (lower.includes("consultorio")) {
    propertyType = "consultorio";
    propertyTypeExact = "Consultorio";
    isSubtipoComercial = true;
    subtype = lower.includes("odontol") ? "Consultorio Odontológico" : "Consultorio Médico / Salud";
  } else if (lower.includes("oficina")) {
    propertyType = "office";
    propertyTypeExact = "Oficina";
    isSubtipoComercial = true;
    subtype = "Oficina Corporativa / Edificio Empresarial";
  } else if (lower.includes("apartaestudio")) {
    propertyType = "apartment";
    propertyTypeExact = "Apartaestudio";
  } else if (lower.includes("penthouse duplex") || lower.includes("pent house duplex")) {
    propertyType = "apartment";
    propertyTypeExact = "Pent House Dúplex";
  } else if (lower.includes("penthouse") || lower.includes("pent house")) {
    propertyType = "apartment";
    propertyTypeExact = "Pent House";
  } else if (lower.includes("apartamento duplex") || lower.includes("apto duplex")) {
    propertyType = "apartment";
    propertyTypeExact = "Apartamento Dúplex";
  } else if (lower.includes("apartamento") || lower.includes("apto")) {
    propertyType = "apartment";
    propertyTypeExact = "Apartamento";
  } else if (lower.includes("casa campestre")) {
    propertyType = "house";
    propertyTypeExact = "Casa Campestre";
    subtype = "Casa Campestre";
  } else if (lower.includes("casa quinta")) {
    propertyType = "house";
    propertyTypeExact = "Casa Quinta";
    subtype = "Casa Quinta";
  } else if (lower.includes("casa") || lower.includes("chalet") || lower.includes("townhouse")) {
    propertyType = "house";
    propertyTypeExact = "Casa";
    subtype = "Casa Familiar Unifamiliar";
  } else if (lower.includes("bodega")) {
    propertyType = "warehouse";
    propertyTypeExact = "Bodega";
    subtype = lower.includes("industrial") ? "Bodega Industrial / Producción" : "Bodega de Almacenamiento";
  } else if (lower.includes("edificio")) {
    propertyType = "building";
    propertyTypeExact = "Edificio";
    if (lower.includes("oficina")) subtype = "Edificio de Oficinas";
    else if (lower.includes("local")) subtype = "Edificio de Locales / Comercial";
    else if (lower.includes("residencial")) subtype = "Edificio Residencial";
    else subtype = "Edificio Mixto (Oficinas / Locales / Vivienda)";
  } else if (lower.includes("lote") || lower.includes("terreno")) {
    propertyType = "land";
    propertyTypeExact = "Lote / Terreno";
  } else if (lower.includes("finca")) {
    propertyType = "farm";
    propertyTypeExact = "Finca";
    if (lower.includes("productiva") || lower.includes("agro")) subtype = "Finca Productiva / Agropecuaria";
    else if (lower.includes("hotel") || lower.includes("turis")) subtype = "Finca Agroturística / Hotel Campestre";
    else subtype = "Finca de Recreo / Vacacional";
  } else if (lower.includes("cabaña")) {
    propertyType = "house";
    propertyTypeExact = "Cabaña";
  } else if (lower.includes("aparta-hotel") || lower.includes("aparta hotel")) {
    propertyType = "hotel";
    propertyTypeExact = "Aparta Hotel";
    subtype = "Aparta-hotel";
  } else if (lower.includes("aparta-suites") || lower.includes("aparta suites")) {
    propertyType = "hotel";
    propertyTypeExact = "Hotel";
    subtype = "Aparta-Suites";
  } else if (lower.includes("hostal")) {
    propertyType = "hotel";
    propertyTypeExact = "Hostal";
    subtype = "Hostal";
  } else if (lower.includes("motel")) {
    propertyType = "hotel";
    propertyTypeExact = "Hotel";
    subtype = "Motel";
  } else if (lower.includes("residencia")) {
    propertyType = "hotel";
    propertyTypeExact = "Hotel";
    subtype = "Residencia";
  } else if (lower.includes("hospedaje")) {
    propertyType = "hotel";
    propertyTypeExact = "Hotel";
    subtype = "Hospedaje";
  } else if (lower.includes("hotel")) {
    propertyType = "hotel";
    propertyTypeExact = "Hotel";
    subtype = "Hotel Boutique / Turístico";
  } else if (lower.includes("villa")) {
    propertyType = "house";
    propertyTypeExact = "Villa";
  }

  // Tipo de negocio
  let transactionType = "venta";
  if (lower.includes("arriendo") || lower.includes("alquiler") || lower.includes("renta")) {
    transactionType = "arriendo";
  } else if (lower.includes("permuta")) {
    transactionType = "venta_permuta";
  }

  // Precio
  let price: string = "0";
  const ahoraMatch = norm.match(/(?:ahora|hoy|precio|valor|venta)[\s\:\$💲🔥]*([0-9\.\,]+(?:\s*(?:millones|mil millones|mm))?)/i);
  if (ahoraMatch) {
    const cleanNum = ahoraMatch[1].replace(/\./g, "").replace(/\,/g, "").trim();
    const parsed = parseInt(cleanNum, 10);
    if (!isNaN(parsed) && parsed > 100000) price = String(parsed);
  }
  if (price === "0") {
    const prices = Array.from(norm.matchAll(/\$\s*([0-9]{1,3}(?:\.[0-9]{3}){1,4})/g));
    if (prices.length > 0) {
      const last = prices[prices.length - 1][1].replace(/[^\d]/g, "");
      const parsed = parseInt(last, 10);
      if (!isNaN(parsed) && parsed > 100000) price = String(parsed);
    }
  }

  // Canon de Arriendo
  let rentPrice: string = "0";
  if (transactionType === "arriendo") {
    const canonM = norm.match(/(?:canon(?:\s*de\s*arriendo)?|valor\s*(?:de\s*)?arriendo|precio\s*(?:de\s*)?arriendo|vr\s*[\.\/]?\s*renta|renta|arriendo)\s*[:\/\-=\s]?\s*\$?\s*([\d.]+)\s*(mil\s*millones?|millones?|millon|millón|mll|mlls|mill|mills|mm|m)?/i);
    if (canonM) {
      const cleanNum = canonM[1].replace(/\./g, '').replace(/\,/g, '').trim();
      const parsed = parseInt(cleanNum, 10);
      if (!isNaN(parsed) && parsed >= 300_000 && parsed <= 100_000_000) {
        rentPrice = String(parsed);
      }
    }
  }

  // Cuota de Administración (ej: "-ADMÓN: $1.471.000", "Admon: $800.000")
  let adminFee: string = "0";
  const admM = norm.match(/(?:^|[-•*#\s])(?:v\s*[\/\-]\s*)?(?:adm[oó]n|admon|administraci[oó]n|administ|admin|cta\s*adm[oó]n|cuota\s*adm[oó]n)\s*(?:m[aá]xima|max|hasta|tope|no\s*mayor\s*a|no\s*superior\s*a|l[ií]mite)?\s*[:\/\-=\s]?\s*(?:aprox\.?)?\s*\$?\s*([\d.]+)(?:\s*mil\b|\s*k\b)?/i);
  if (admM) {
    const rawANum = parseFloat(admM[1].replace(/\./g, ''));
    if (!isNaN(rawANum) && rawANum >= 10_000 && rawANum <= 30_000_000) {
      adminFee = String(rawANum);
    }
  }

  // Áreas (soporta m², hectáreas y fanegadas)
  let areaConstruida: string = "";
  const acM = norm.match(/(?:area construida|area total|construida)[\s\:\*]*([0-9]+(?:\.[0-9]+)?)\s*m/i) || norm.match(/([0-9]+(?:\.[0-9]+)?)\s*m[2²]/i);
  if (acM) areaConstruida = acM[1];
  if (!areaConstruida) {
    const parsedA = parseArea(text);
    if (parsedA && parsedA > 0) areaConstruida = String(parsedA);
  }

  let areaPrivada: string = "";
  const apM = norm.match(/(?:area privada|privada)[\s\:\*]*([0-9]+(?:\.[0-9]+)?)\s*m/i);
  if (apM) areaPrivada = apM[1];

  // Año de construcción
  let yearBuilt: number | null = null;
  const antM = norm.match(/(?:antiguedad|edad|anos de construccion)[\s\:\*]*([0-9]+)/i);
  if (antM) {
    yearBuilt = 2026 - parseInt(antM[1], 10);
  }

  // Habitaciones
  let bedrooms: number | null = null;
  const bedMatch = norm.match(/(?:habitacion|habitaciones|alcoba|alcobas|oficinas|dormitorio)[\s\:\/\*]*([0-9]+)/i);
  if (bedMatch) {
    bedrooms = parseInt(bedMatch[1], 10);
  }

  // Baños
  let bathrooms: number | null = null;
  const bathMatch = norm.match(/(?:bano|banos)[\s\:\/\*]*([0-9]+)/i);
  if (bathMatch) {
    bathrooms = parseInt(bathMatch[1], 10);
  }

  // Garajes
  let garages: number | null = null;
  const garMatch = norm.match(/(?:garaje|garajes|parqueadero|parqueaderos)[\s\:\/\*]*([0-9]+)/i);
  if (garMatch) {
    garages = parseInt(garMatch[1], 10);
  }

  // Estrato
  let stratum: number = 4;
  const strMatch = norm.match(/estrato[\s\:\*]*([0-6])/i);
  if (strMatch) {
    stratum = parseInt(strMatch[1], 10);
  }

  // Cocina
  let cocina = 'Integral';
  if (lower.includes('abierta tipo isla')) cocina = 'Abierta tipo isla';
  else if (lower.includes('abierta')) cocina = 'Abierta';
  else if (lower.includes('cerrada remodelada')) cocina = 'Cerrada remodelada';
  else if (lower.includes('cerrada')) cocina = 'Cerrada convencional';
  else if (lower.includes('moderna')) cocina = 'Moderna';
  else if (lower.includes('integral')) cocina = 'Integral';
  else if (lower.includes('a remodelar')) cocina = 'A remodelar';

  // Espacios
  let estudios = 0;
  const estM = norm.match(/(?:estudio|sala de juntas)[\s\:\/\*\D]*?([0-9]+)/i);
  if (estM) estudios = parseInt(estM[1], 10);

  let depositos = 0;
  const depM = norm.match(/(?:deposito|depositos)[\s\:\/\*\D]*?([0-9]+)/i);
  if (depM) depositos = parseInt(depM[1], 10);

  let piso = '';
  const pisoM = norm.match(/(?:plantas|pisos|piso)[\s\:\/\*\D]*?([0-9]+)/i);
  if (pisoM) piso = pisoM[1];

  // Barrio, Localidad, Ciudad y Departamento (Cobertura Nacional Real)
  const fbGeo = extractFallbackDataFromText(text);
  let addressNeighborhood: string | null = null;
  let zone: string | null = null;
  let city = fbGeo.city || "";

  const barrioMatch = norm.match(/(?:barrio|vereda|sector)[\s\:\*]*([a-zA-Z0-9\s]+?)(?:,|\n|$)/i);
  if (barrioMatch) {
    addressNeighborhood = barrioMatch[1].trim();
  }
  if (!addressNeighborhood && fbGeo.zone) {
    addressNeighborhood = fbGeo.zone;
  }

  const locMatch = norm.match(/(?:localidad|comuna|corregimiento)[\s\:\*]*([a-zA-Z0-9\s\-]+?)(?:,|\n|$)/i);
  if (locMatch) {
    zone = locMatch[1].trim();
  }
  if (!zone) {
    for (const loc of BOGOTA_LOCALITIES) {
      const locNorm = loc.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (lower.includes(locNorm)) {
        zone = loc;
        if (!city) city = "Bogotá, D.C.";
        break;
      }
    }
  }

  if (!city) {
    const lugar = buscarLugarColombia(text);
    if (lugar && lugar.nombreCanonico) {
      city = lugar.nombreCanonico;
    }
  }
  if (!city) city = "Bogotá, D.C.";
  const department = findDepartmentForCity(city) || "";

  // Título / Nombre Estandarizado Doctrinal: [Tipo de Inmueble] en [Barrio / Sector]
  // Regla de concisión v31.48: Título corto y limpio sin palabras de negocio redundantes
  const sectorDisplay = addressNeighborhood || zone || city || "Colombia";
  const tipoDisplay = isSubtipoComercial && !propertyTypeExact.toLowerCase().includes("comercial") && propertyTypeExact !== "Consultorio"
    ? `${propertyTypeExact} Comercial`
    : propertyTypeExact;
  const name = `${tipoDisplay} en ${sectorDisplay}`;

  // Autodetección de características internas
  const selectedInternas: string[] = [];
  if (lower.includes('iluminacion natural') || lower.includes('luz natural')) selectedInternas.push('Iluminación natural');
  if (lower.includes('closet') || lower.includes('closets') || lower.includes('archiveros')) selectedInternas.push('Clósets');
  if (lower.includes('comedor')) selectedInternas.push('Comedor auxiliar');
  if (lower.includes('doble ventana')) selectedInternas.push('Doble Ventana');
  if (lower.includes('gas')) selectedInternas.push('Gas domiciliario');
  if (lower.includes('balcon')) selectedInternas.push('Balcón');
  if (lower.includes('alarma') || lower.includes('seguridad')) selectedInternas.push('Alarma');
  if (lower.includes('lavanderia') || lower.includes('zona de ropas')) selectedInternas.push('Zona de lavandería');
  if (lower.includes('acabados modernos') || lower.includes('madera flotante')) selectedInternas.push('Acabados modernos');
  if (lower.includes('patio')) selectedInternas.push('Patio');

  // Autodetección de características externas
  const selectedExternas: string[] = [];
  if (lower.includes('pavimentado') || lower.includes('acceso')) selectedExternas.push('Acceso pavimentado');
  if (lower.includes('transporte') || lower.includes('transmilenio')) selectedExternas.push('Transporte público cercano');
  if (lower.includes('via principal') || lower.includes('av.') || lower.includes('avenida')) selectedExternas.push('Sobre vía principal');
  if (lower.includes('banco') || lower.includes('bancos')) selectedExternas.push('Bancos cercanos');
  if (lower.includes('comercial') || lower.includes('centro comercial') || lower.includes('comercios')) selectedExternas.push('Centros Comerciales');
  if (lower.includes('medico') || lower.includes('clinica') || lower.includes('hospital')) selectedExternas.push('Centros médicos hospitalarios');
  if (lower.includes('parque') || lower.includes('parques')) selectedExternas.push('Parques cercanos');
  if (lower.includes('zonas verdes') || lower.includes('verde')) selectedExternas.push('Zonas verdes');
  if (lower.includes('recepcion') || lower.includes('porteria')) selectedExternas.push('Portería / Recepción');
  if (lower.includes('seguridad 24/7') || lower.includes('vigilancia')) selectedExternas.push('Seguridad privada 24/7');

  return {
    name: name || `Inmueble en ${addressNeighborhood || city}`,
    propertyType,
    propertyTypeExact,
    subtype,
    isSubtipoComercial,
    transactionType,
    price,
    rentPrice: rentPrice !== "0" ? rentPrice : undefined,
    adminFee: adminFee !== "0" ? adminFee : undefined,
    areaTotal: areaConstruida || "",
    areaConstruida: areaConstruida || "",
    areaPrivada: areaPrivada || "",
    yearBuilt,
    bedrooms,
    bathrooms,
    garages,
    garajesCarro: garages,
    garajesMoto: 0,
    stratum,
    cocina,
    estudios,
    estarTv: 0,
    depositos,
    piso,
    city,
    department,
    addressLocality: zone || "",
    zone: zone || addressNeighborhood || city,
    addressNeighborhood: addressNeighborhood || zone || "",
    description: text.trim().slice(0, 500),
    selectedInternas,
    selectedExternas,
    pdfUrl: undefined as string | undefined,
  };
}

const storeListInputSchema = z.object({
  search: z.string().optional(),
  zone: z.string().optional(),
  city: z.string().optional(),
  type: z.string().optional(),
  transactionType: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  minBedrooms: z.number().optional(),
  onlyWithPhotos: z.boolean().optional(),
  sortBy: z.enum(["recommended", "recent", "price_asc", "price_desc", "area_desc"]).optional().default("recommended"),
  limit: z.number().min(1).max(200).default(100),
  offset: z.number().min(0).default(0),
});

function buildStoreWhereConditions(input?: z.infer<typeof storeListInputSchema>) {
  const whereConditions = [];

  if (input?.search) {
    whereConditions.push(
      or(
        ilike(properties.name, `%${input.search}%`),
        ilike(properties.description, `%${input.search}%`),
        ilike(properties.zone, `%${input.search}%`),
        ilike(properties.addressNeighborhood, `%${input.search}%`),
        ilike(properties.addressLocality, `%${input.search}%`),
        ilike(properties.city, `%${input.search}%`),
        ilike(properties.addressCity, `%${input.search}%`),
        ilike(properties.externalListingId, `%${input.search}%`)
      )
    );
  }

  if (input?.zone) {
    whereConditions.push(
      or(
        ilike(properties.zone, `%${input.zone}%`),
        ilike(properties.addressNeighborhood, `%${input.zone}%`),
        ilike(properties.addressLocality, `%${input.zone}%`)
      )
    );
  }

  if (input?.city) {
    whereConditions.push(
      or(
        ilike(properties.city, `%${input.city}%`),
        ilike(properties.addressCity, `%${input.city}%`)
      )
    );
  }

  if (input?.type) {
    whereConditions.push(eq(properties.propertyType, input.type as any));
  }

  if (input?.transactionType) {
    whereConditions.push(eq(properties.transactionType, input.transactionType as any));
  }

  if (input?.minPrice && input.minPrice > 0) {
    whereConditions.push(sql`CAST(${properties.price} AS NUMERIC) >= ${input.minPrice}`);
  }

  if (input?.maxPrice && input.maxPrice > 0) {
    whereConditions.push(sql`CAST(${properties.price} AS NUMERIC) <= ${input.maxPrice}`);
  }

  if (input?.minBedrooms !== undefined && input.minBedrooms >= 0) {
    whereConditions.push(gte(properties.bedrooms, input.minBedrooms));
  }

  if (input?.onlyWithPhotos) {
    whereConditions.push(
      sql`jsonb_typeof(${properties.images}) = 'array' AND jsonb_array_length(${properties.images}) > 0`
    );
  }

  // Por defecto mostrar inmuebles disponibles y elegibles para VECY TIENDA
  whereConditions.push(eq(properties.available, true));
  whereConditions.push(
    or(eq(properties.republishToVecyStore, true), isNull(properties.republishToVecyStore))
  );
  whereConditions.push(
    or(
      and(ne(properties.visibilityScope, "agent_only"), ne(properties.visibilityScope, "private")),
      isNull(properties.visibilityScope)
    )
  );

  return whereConditions;
}

function getStoreOrderBy(sortBy: string | undefined) {
  const hasPhotosExpr = sql`CASE WHEN jsonb_typeof(${properties.images}) = 'array' AND jsonb_array_length(${properties.images}) > 0 THEN 1 ELSE 0 END DESC`;
  const completenessExpr = sql`(
    (CASE WHEN jsonb_typeof(${properties.images}) = 'array' AND jsonb_array_length(${properties.images}) > 0 THEN 4 ELSE 0 END) +
    (CASE WHEN ${properties.agentId} IS NOT NULL THEN 2 ELSE 0 END) +
    (CASE WHEN ${properties.areaTotal} IS NOT NULL AND CAST(${properties.areaTotal} AS NUMERIC) > 0 THEN 1 ELSE 0 END) +
    (CASE WHEN length(COALESCE(${properties.description}, '')) >= 30 THEN 1 ELSE 0 END)
  ) DESC`;

  switch (sortBy) {
    case "price_asc":
      return [asc(sql`CAST(${properties.price} AS NUMERIC)`), desc(properties.id)];
    case "price_desc":
      return [desc(sql`CAST(${properties.price} AS NUMERIC)`), desc(properties.id)];
    case "area_desc":
      return [desc(sql`COALESCE(CAST(${properties.areaTotal} AS NUMERIC), 0)`), desc(properties.id)];
    case "recent":
      return [desc(properties.id)];
    case "recommended":
    default:
      return [hasPhotosExpr, completenessExpr, desc(properties.featured), desc(properties.id)];
  }
}

export const propertiesRouter = router({
  // --- PUBLIC ---
  list: publicProcedure
    .input(storeListInputSchema.optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const whereConditions = buildStoreWhereConditions(input);
      const orderClauses = getStoreOrderBy(input?.sortBy || "recommended");

      const items = await db
        .select(propertyFields)
        .from(properties)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(...orderClauses)
        .limit(input?.limit || 100)
        .offset(input?.offset || 0);

      return items;
    }),

  listCatalog: publicProcedure
    .input(
      storeListInputSchema
        .omit({ limit: true, offset: true })
        .extend({
          page: z.number().min(1).default(1),
          pageSize: z.number().min(1).max(150).default(12),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 12;
      const offset = (page - 1) * pageSize;

      const whereConditions = buildStoreWhereConditions(
        input ? { ...input, limit: pageSize, offset } : undefined
      );
      const whereExpr = whereConditions.length > 0 ? and(...whereConditions) : undefined;
      const orderClauses = getStoreOrderBy(input?.sortBy || "recommended");

      const [[countRow], items] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(properties)
          .where(whereExpr),
        db
          .select(propertyFields)
          .from(properties)
          .where(whereExpr)
          .orderBy(...orderClauses)
          .limit(pageSize)
          .offset(offset),
      ]);

      const total = countRow?.count ?? items.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));

      return {
        items,
        total,
        page,
        pageSize,
        totalPages,
      };
    }),
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const now = Date.now();
      const cached = propertyGetByIdCache.get(input.id);
      if (cached && cached.expiresAt > now) {
        return cached.data;
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const item = await db.select().from(properties).where(eq(properties.id, input.id)).limit(1);
      if (item.length === 0) throw new TRPCError({ code: "NOT_FOUND" });

      const images = await db
        .select()
        .from(propertyImages)
        .where(eq(propertyImages.propertyId, input.id))
        .orderBy(propertyImages.displayOrder);

      const result = {
        ...item[0],
        imagesList: images,
      };

      propertyGetByIdCache.set(input.id, { data: result, expiresAt: now + 60000 });
      return result;
    }),

  // --- IMPORTADOR INTELIGENTE POR URL (2 PASOS — SIN COPIA DE MEDIOS EXTERNOS) ---
  getUrlImportQuota: protectedProcedure.query(async ({ ctx }) => {
    const ent = await getUserEffectiveEntitlements(ctx.user.id, ctx.user.role);
    const limit = ent.isAdmin ? -1 : ent.plan.maxUrlImportsPerMonth;
    const used = ent.usage.urlImportsUsed;
    return {
      planCode: ent.plan.code,
      planName: ent.plan.name,
      periodKey: ent.periodKey,
      used,
      limit,
      remaining: limit < 0 ? -1 : Math.max(0, limit - used),
    };
  }),

  importFromUrl: protectedProcedure
    .input(z.object({ url: z.string().min(4).max(2048) }))
    .mutation(async ({ ctx, input }) => {
      await assertCanImportByUrl(ctx.user.id, ctx.user.role);
      const { importPropertyFromUrl } = await import("../_core/urlImportService");
      const result = await importPropertyFromUrl(input.url);

      if (result.status === "ok" || result.status === "partial") {
        await incrementUsageQuota(ctx.user.id, "urlImportsUsed", 1);
      }

      const ent = await getUserEffectiveEntitlements(ctx.user.id, ctx.user.role);
      const limit = ent.isAdmin ? -1 : ent.plan.maxUrlImportsPerMonth;
      return {
        ...result,
        quota: {
          planCode: ent.plan.code,
          planName: ent.plan.name,
          periodKey: ent.periodKey,
          used: ent.usage.urlImportsUsed,
          limit,
          remaining: limit < 0 ? -1 : Math.max(0, limit - ent.usage.urlImportsUsed),
        },
      };
    }),

  // --- MUTATIONS (CREAR / EDITAR — RBAC PROTEGIDO) ---
  create: protectedProcedure
    .input(propertyInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const entitlements = await assertCanCreateProperty(ctx.user.id, ctx.user.role);

      // Generación automática del código oficial único nacional del inmueble (Doctrina v34.25)
      // Formato: ID-[CIUDAD3]-[ZONA3][CONSECUTIVO] (ej: ID-BOG-KEN01, ID-MED-POB05, ID-CAL-PAN12)
      const cityPrefix = getPropertyRefCityPrefix(input.addressCity || input.city);
      const cleanZone = (input.addressNeighborhood || input.zone || cityPrefix)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z]/g, "")
        .toUpperCase()
        .substring(0, 3) || cityPrefix;

      const providedRawText = String(input.rawText || "").trim();
      const effectiveRawText =
        providedRawText.length >= 25
          ? providedRawText
          : [
              input.name,
              input.propertyType ? `tipo ${input.propertyType}` : "",
              input.transactionType ? `en ${input.transactionType}` : "",
              input.addressNeighborhood || input.zone ? `sector ${input.addressNeighborhood || input.zone}` : "",
              input.city || input.addressCity ? `ciudad ${input.city || input.addressCity}` : "",
              input.price || input.rentPrice ? `valor $${input.price || input.rentPrice}` : "",
              input.areaTotal ? `área ${input.areaTotal} m2` : "",
              input.bedrooms ? `${input.bedrooms} habitaciones` : "",
              input.bathrooms ? `${input.bathrooms} baños` : "",
              input.garages ? `${input.garages} parqueaderos` : "",
              input.description || "",
            ]
              .filter(Boolean)
              .join(", ") || providedRawText || null;

      const newProperty = await db.insert(properties).values({
        ...input,
        rawText: effectiveRawText,
        addressCity: input.addressCity || input.city || null,
        origenTipo: input.sourceUrl ? "web_url_import" : "web_admin_unified",
        origenNombre: input.sourcePortal ? `Importado ${input.sourcePortal} (Medios Propios)` : "Centro de Publicación Vecy",
        agentId: ctx.user.id,
        agencyId: input.agencyId ?? entitlements.defaultAgencyId ?? null,
        republishToVecyStore: input.republishToVecyStore ?? entitlements.plan.autoRepublishStore ?? true,
        visibilityScope: input.visibilityScope ?? "public_and_agent",
        sourcePortal: input.sourcePortal ?? null,
        sourceUrl: input.sourceUrl ?? null,
        rawImportPayload: input.rawImportPayload ?? null,
      }).returning();
      invalidatePropertiesListCache();

      const created = newProperty[0];
      if (created?.id) {
        const autoRefCode = `ID-${cityPrefix}-${cleanZone}${String(created.id).padStart(2, '0')}`;
        await db.update(properties).set({
          externalListingId: autoRefCode,
          canonicalExternalId: `VECY:${autoRefCode}`,
        }).where(eq(properties.id, created.id));
        created.externalListingId = autoRefCode;
        created.canonicalExternalId = `VECY:${autoRefCode}`;

        if (Array.isArray(input.images) && input.images.length > 0) {
          try {
            await db.insert(propertyImages).values(
              input.images.slice(0, 30).map((url, idx) => ({
                propertyId: created.id,
                imageUrl: url,
                displayOrder: idx,
                isMainImage: idx === 0,
                uploadedBy: String(ctx.user.id),
              }))
            );
          } catch (imgErr: any) {
            console.warn("[properties.create] Aviso sincronizando propertyImages:", imgErr?.message);
          }
        }

        import("../_core/matching")
          .then(({ findMatchesForProperty }) =>
            findMatchesForProperty(created.id).catch((err) =>
              console.warn("[properties.create] Error calculando matches en background:", err?.message || err)
            )
          )
          .catch(() => {});
      }

      invalidatePropertiesListCache();
      return created;
    }),

  parseText: publicProcedure
    .input(z.object({
      text: z.string().optional().default(""),
      pdfBase64: z.string().optional(),
      pdfMimeType: z.string().optional(),
      fileName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // 1. Extracción determinista instantánea (0ms) con normalización Unicode
      const deterministic = parsePropertyDeterministically(input.text || "");
      let pdfUrl: string | undefined = undefined;

      // 2. Almacenar PDF en VPS si viene adjunto
      if (input.pdfBase64) {
        try {
          const cleanBase64 = input.pdfBase64.replace(/^data:[^;]+;base64,/, '');
          const safeName = (input.fileName || 'ficha_tecnica.pdf').replace(/[^\w\d_\-\.]/g, '_');
          const { storagePut } = await import("../storage");
          const stored = await storagePut(`documents/ficha_${Date.now()}_${safeName}`, cleanBase64, input.pdfMimeType || 'application/pdf');
          pdfUrl = stored.url;
        } catch (storageErr: any) {
          console.warn("[parseText] No se pudo guardar el archivo PDF:", storageErr.message);
        }
      }

      try {
        const { invokeLLM } = await import("../_core/llm");
        const prompt = `Eres JanIA, arquitecta e ingeniera inmobiliaria senior de VECY BIENES RAÍCES Colombia.
Analiza minuciosamente este texto y/o documento PDF adjunto de un inmueble.
Extrae de forma exhaustiva y precisa los datos clave en formato JSON con la siguiente estructura estricta:
{
  "name": "Título estandarizado corto en formato '[Tipo de Inmueble] en [Barrio]', ej: 'Casa en Morato', 'Edificio de Oficinas en Chicó', 'Apartamento en Rosales'",
  "propertyType": "apartment | house | building | warehouse | farm | hotel | office | land | commercial | loft | consultorio",
  "propertyTypeExact": "Casa | Edificio | Hotel | Hostal | Aparta Hotel | Local | Bodega | Finca | Oficina | Consultorio | Lote / Terreno | Apartamento | Pent House | etc.",
  "subtype": "Subtipo específico (ej: 'Casa Comercial / Oficinas / Sede', 'Consultorio Médico / Odontológico', 'Lote Urbano / Suburbano / Rural', 'Edificio de Oficinas', 'Finca Productiva')",
  "isSubtipoComercial": true o false,
  "transactionType": "venta | arriendo | venta_o_arriendo | permuta",
  "price": "precio de venta o canon en COP numérico sin puntos",
  "adminFee": "cuota administración mensual en COP numérico o null",
  "areaConstruida": "área construida o total del lote/finca en m2 (convierte hectáreas*10000 y fanegadas*6400) en número string o null",
  "areaPrivada": "área privada en m2 en número string o null",
  "yearBuilt": año numérico de construcción o null,
  "bedrooms": número entero de habitaciones u oficinas (puede ser de 1 a 50+),
  "bathrooms": número entero de baños (puede ser de 1 a 50+),
  "garages": número entero de parqueaderos (puede ser de 1 a 50+),
  "garajesCarro": número entero de garajes para carro,
  "garajesMoto": número entero de garajes para moto,
  "depositos": número entero de depósitos o bodegas,
  "estudios": número entero de estudios o salas de juntas,
  "estarTv": número entero de salas de estar o espera,
  "stratum": estrato socioeconómico 0 a 6,
  "cocina": "Integral | Abierta | Abierta tipo isla | Cerrada convencional | Cerrada remodelada | Moderna | A remodelar",
  "department": "Departamento de Colombia (ej: Bogotá D.C., Antioquia, Valle del Cauca, Cundinamarca, Santander, Bolívar, Atlántico)",
  "city": "Ciudad o municipio exacto de Colombia (ej: Bogotá, D.C., Medellín, Cali, Barranquilla, Cartagena, Bucaramanga, Pereira, Rionegro, Chía)",
  "addressLocality": "Localidad, Comuna o Corregimiento (ej: Kennedy, Suba, Usaquén, Chapinero, El Poblado, Comuna 14, Pance)",
  "zone": "Localidad, Comuna o Sector principal",
  "addressNeighborhood": "Barrio o Vereda específico (ej: Castilla, El Poblado, Cabecera, Pance, Morato, Cedritos, Vereda La Balsa)",
  "description": "Descripción profesional atractiva destacando potencial urbanístico (POT 555, valoración, usos permitidos, etc.)",
  "potUrbanistico": "Información normativa de POT o tratamiento si se menciona (ej: POT 555, Tratamiento Renovación Urbana, Altura hasta 7 pisos, Valor Catastral)",
  "selectedInternas": ["lista de características internas encontradas"],
  "selectedExternas": ["lista de características externas encontradas"]
}
Devuelve ÚNICAMENTE el objeto JSON sin texto introductorio ni bloques de código extra.

Texto del inmueble:\n${input.text || "Ver documento PDF adjunto"}`;

        // Timeout de 8.5s para permitir análisis multimodal de PDFs en Gemini sin bloquear al usuario
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("AI_TIMEOUT")), 8500));
        const cleanBase64 = input.pdfBase64 ? input.pdfBase64.replace(/^data:[^;]+;base64,/, '') : undefined;
        
        const aiPromise = invokeLLM({ 
          messages: [{ role: "user", content: prompt }],
          pdfBuffer: cleanBase64,
          pdfMimeType: input.pdfMimeType || "application/pdf"
        });

        const response: any = await Promise.race([aiPromise, timeoutPromise]);
        const text = response?.choices?.[0]?.message?.content;
        const cleaned = typeof text === 'string' ? text.replace(/```json\n?|\n?```/g, '').trim() : "{}";
        const parsed = JSON.parse(cleaned);

        // Mezclar dando prioridad a campos bien estructurados
        return {
          ...deterministic,
          ...parsed,
          price: parsed.price ? String(parsed.price) : deterministic.price,
          name: deterministic.name || parsed.name,
          propertyType: parsed.propertyType || deterministic.propertyType,
          propertyTypeExact: parsed.propertyTypeExact || deterministic.propertyTypeExact,
          subtype: parsed.subtype || deterministic.subtype,
          isSubtipoComercial: parsed.isSubtipoComercial !== undefined ? parsed.isSubtipoComercial : deterministic.isSubtipoComercial,
          transactionType: parsed.transactionType || deterministic.transactionType,
          city: parsed.city || deterministic.city,
          department: parsed.department || deterministic.department || findDepartmentForCity(parsed.city || deterministic.city),
          addressLocality: parsed.addressLocality || parsed.zone || deterministic.addressLocality,
          zone: parsed.zone || parsed.addressLocality || deterministic.zone,
          addressNeighborhood: parsed.addressNeighborhood || parsed.zone || deterministic.addressNeighborhood,
          areaTotal: parsed.areaConstruida ? String(parsed.areaConstruida) : (parsed.areaTotal ? String(parsed.areaTotal) : deterministic.areaTotal),
          areaConstruida: parsed.areaConstruida ? String(parsed.areaConstruida) : deterministic.areaConstruida,
          areaPrivada: parsed.areaPrivada ? String(parsed.areaPrivada) : deterministic.areaPrivada,
          bedrooms: parsed.bedrooms !== undefined && parsed.bedrooms !== null ? Number(parsed.bedrooms) : deterministic.bedrooms,
          bathrooms: parsed.bathrooms !== undefined && parsed.bathrooms !== null ? Number(parsed.bathrooms) : deterministic.bathrooms,
          garages: parsed.garages !== undefined && parsed.garages !== null ? Number(parsed.garages) : deterministic.garages,
          garajesCarro: parsed.garajesCarro !== undefined && parsed.garajesCarro !== null ? Number(parsed.garajesCarro) : deterministic.garajesCarro,
          garajesMoto: parsed.garajesMoto !== undefined && parsed.garajesMoto !== null ? Number(parsed.garajesMoto) : deterministic.garajesMoto,
          depositos: parsed.depositos !== undefined && parsed.depositos !== null ? Number(parsed.depositos) : deterministic.depositos,
          estudios: parsed.estudios !== undefined && parsed.estudios !== null ? Number(parsed.estudios) : deterministic.estudios,
          estarTv: parsed.estarTv !== undefined && parsed.estarTv !== null ? Number(parsed.estarTv) : deterministic.estarTv,
          stratum: parsed.stratum !== undefined && parsed.stratum !== null ? Number(parsed.stratum) : deterministic.stratum,
          description: parsed.description || deterministic.description,
          pdfUrl: pdfUrl || deterministic.pdfUrl,
        };
      } catch (err: any) {
        console.warn("[parseText] Gemini no respondió a tiempo o error. Usando extracción determinista:", err.message);
        return {
          ...deterministic,
          pdfUrl,
        };
      }
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: propertyInputSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const existing = await db.select().from(properties).where(eq(properties.id, input.id)).limit(1);
      if (existing.length === 0) throw new TRPCError({ code: "NOT_FOUND" });

      // RBAC estricto: solo admin o propietario asignado
      if (ctx.user.role !== "admin" && existing[0].agentId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para editar este inmueble" });
      }

      const updated = await db.update(properties)
        .set({ ...input.data, updatedAt: new Date() })
        .where(eq(properties.id, input.id))
        .returning();

      cachedAdminMyList = null;
      invalidatePropertiesListCache();
      invalidatePropertyGetByIdCache(input.id);

      if (updated[0]?.id && updated[0].available !== false) {
        import("../_core/matching")
          .then(({ findMatchesForProperty }) =>
            findMatchesForProperty(updated[0].id).catch((err) =>
              console.warn("[properties.update] Error calculando matches en background:", err?.message || err)
            )
          )
          .catch(() => {});
      }

      return updated[0];
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const existing = await db.select().from(properties).where(eq(properties.id, input.id)).limit(1);
      if (existing.length === 0) throw new TRPCError({ code: "NOT_FOUND" });

      // RBAC estricto: solo admin o propietario asignado
      if (ctx.user.role !== "admin" && existing[0].agentId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para eliminar este inmueble" });
      }

      await db.delete(properties).where(eq(properties.id, input.id));
      cachedAdminMyList = null;
      invalidatePropertiesListCache();
      return { success: true };
    }),

  // List my own properties (agent view) or all properties (admin view) - Protegido con RBAC y micro-caché
  myList: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const user = ctx.user;
    if ((user.role as string) === "admin") {
      const now = Date.now();
      if (cachedAdminMyList && (now - cachedAdminMyListTime) < 180000) {
        return cachedAdminMyList;
      }
      const data = await db.select(propertyFields).from(properties).orderBy(desc(properties.id));
      cachedAdminMyList = data;
      cachedAdminMyListTime = now;
      return data;
    }
    return await db.select(propertyFields).from(properties)
      .where(eq(properties.agentId, user.id))
      .orderBy(desc(properties.id));
  }),
});
