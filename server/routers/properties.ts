import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { eq, desc, ilike, or, isNull, and, lte, sql } from "drizzle-orm";

import { getDb } from "../db";
import { properties, propertyImages } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";

const propertyInputSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  propertyType: z.enum([
    "apartment", "house", "building", "warehouse", "farm", "hotel", 
    "office", "land", "commercial", "loft", "consultorio"
  ]),
  transactionType: z.enum([
    "venta", "arriendo", "venta_o_arriendo", "arriendo_temporal", 
    "arriendo_con_opcion_de_compra", "permuta", "venta_permuta", "aporte"
  ]).default("venta"),
  price: z.string().min(1),
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
});

type AdminPropertyListItem = {
  id: number;
  name: string;
  price: string;
  rentPrice: string | null;
  location: string | null;
  zone: string;
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
  images: unknown;
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
  amenities: properties.amenities,
  images: properties.images,
  createdAt: properties.createdAt,
};

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
  } else if (lower.includes("oficina") || lower.includes("consultorio")) {
    propertyType = "office";
    propertyTypeExact = "Oficina";
    isSubtipoComercial = true;
    subtype = lower.includes("consultorio") ? "Consultorio / Salud" : "Oficina Corporativa / Edificio Empresarial";
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

  // Áreas
  let areaConstruida: string = "";
  const acM = norm.match(/(?:area construida|area total|construida)[\s\:\*]*([0-9]+(?:\.[0-9]+)?)\s*m/i) || norm.match(/([0-9]+(?:\.[0-9]+)?)\s*m[2²]/i);
  if (acM) areaConstruida = acM[1];

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

  // Barrio, Localidad y Ciudad
  let addressNeighborhood: string | null = null;
  let zone: string | null = null;
  let city = "Bogotá";

  const barrioMatch = norm.match(/barrio[\s\:\*]*([a-zA-Z\s]+)/i);
  if (barrioMatch) {
    addressNeighborhood = barrioMatch[1].split("\n")[0].trim();
  }
  if (!addressNeighborhood) {
    if (lower.includes("morato")) addressNeighborhood = "Morato";
    else if (lower.includes("cedritos")) addressNeighborhood = "Cedritos";
    else if (lower.includes("chico")) addressNeighborhood = "Chicó";
    else if (lower.includes("rosales")) addressNeighborhood = "Rosales";
    else if (lower.includes("santa barbara")) addressNeighborhood = "Santa Bárbara";
  }

  const locMatch = norm.match(/localidad[\s\:\*]*([a-zA-Z\s]+)/i);
  if (locMatch) {
    zone = locMatch[1].split("\n")[0].trim();
  }
  if (!zone) {
    if (lower.includes("suba")) zone = "Suba";
    else if (lower.includes("usaquen")) zone = "Usaquén";
    else if (lower.includes("chapinero")) zone = "Chapinero";
    else if (lower.includes("teusaquillo")) zone = "Teusaquillo";
  }

  // Título / Nombre Estandarizado Doctrinal: [Tipo de Inmueble] en [Barrio / Sector]
  // Regla de concisión v31.48: Título corto y limpio sin palabras de negocio redundantes
  const sectorDisplay = addressNeighborhood || zone || city || "Bogotá";
  const tipoDisplay = isSubtipoComercial && !propertyTypeExact.toLowerCase().includes("comercial")
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
    zone: zone || addressNeighborhood || "Bogotá",
    addressNeighborhood: addressNeighborhood || zone || "Bogotá",
    description: text.trim().slice(0, 500),
    selectedInternas,
    selectedExternas,
    pdfUrl: undefined as string | undefined,
  };
}

export const propertiesRouter = router({
  // --- PUBLIC ---
  list: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      zone: z.string().optional(),
      type: z.string().optional(),
      transactionType: z.string().optional(),
      limit: z.number().min(1).max(200).default(100),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const whereConditions = [];

      if (input?.search) {
        whereConditions.push(
          or(
            ilike(properties.name, `%${input.search}%`),
            ilike(properties.description, `%${input.search}%`),
            ilike(properties.zone, `%${input.search}%`),
            ilike(properties.addressNeighborhood, `%${input.search}%`),
            ilike(properties.city, `%${input.search}%`)
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

      if (input?.type) {
        whereConditions.push(eq(properties.propertyType, input.type as any));
      }

      if (input?.transactionType) {
        whereConditions.push(eq(properties.transactionType, input.transactionType as any));
      }

      // Por defecto mostrar inmuebles disponibles
      whereConditions.push(eq(properties.available, true));

      const query = db
        .select(propertyFields)
        .from(properties)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(properties.id))
        .limit(input?.limit || 100)
        .offset(input?.offset || 0);

      const items = await query;
      return items;
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

  // --- MUTATIONS (CREAR / EDITAR) ---
  create: publicProcedure
    .input(propertyInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const newProperty = await db.insert(properties).values({
        ...input,
        agentId: ctx?.user?.id ?? 1,
      }).returning();

      invalidatePropertiesListCache();
      return newProperty[0];
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
        const prompt = `Eres JanIA, arquitecta e ingeniera inmobiliaria senior de Vecy Network Colombia.
Analiza minuciosamente este texto y/o documento PDF adjunto de un inmueble.
Extrae de forma exhaustiva y precisa los datos clave en formato JSON con la siguiente estructura estricta:
{
  "name": "Título estandarizado corto en formato '[Tipo de Inmueble] en [Barrio]', ej: 'Casa en Morato', 'Edificio de Oficinas en Chicó', 'Apartamento en Rosales'",
  "propertyType": "apartment | house | building | warehouse | farm | hotel | office | land | commercial | loft | consultorio",
  "propertyTypeExact": "Casa | Edificio | Hotel | Hostal | Aparta Hotel | Local | Bodega | Finca | Oficina | Apartamento | Pent House | etc.",
  "subtype": "Subtipo específico (ej: 'Casa Comercial / Oficinas / Sede', 'Edificio de Oficinas', 'Edificio Residencial', 'Edificio de Locales', 'Aparta-hotel', 'Aparta-Suites', 'Hospedaje', 'Hostal', 'Motel', 'Residencia', 'Finca de Recreo', 'Finca Productiva')",
  "isSubtipoComercial": true o false,
  "transactionType": "venta | arriendo | venta_o_arriendo | permuta",
  "price": "precio de venta o canon en COP numérico sin puntos",
  "adminFee": "cuota administración mensual en COP numérico o null",
  "areaConstruida": "área construida total en m2 en número string o null",
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
  "city": "Bogotá u otra ciudad",
  "zone": "Localidad o zona principal (ej: Suba, Usaquén)",
  "addressNeighborhood": "Barrio específico (ej: Morato, Cedritos, Santa Bárbara)",
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
          zone: parsed.zone || deterministic.zone,
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

  update: publicProcedure
    .input(z.object({
      id: z.number(),
      data: propertyInputSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const existing = await db.select().from(properties).where(eq(properties.id, input.id)).limit(1);
      if (existing.length === 0) throw new TRPCError({ code: "NOT_FOUND" });

      // Si hay usuario y no es admin ni dueño, bloquear
      if (ctx?.user && ctx.user.role !== "admin" && existing[0].agentId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const updated = await db.update(properties)
        .set({ ...input.data, updatedAt: new Date() })
        .where(eq(properties.id, input.id))
        .returning();

      invalidatePropertiesListCache();
      return updated[0];
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const existing = await db.select().from(properties).where(eq(properties.id, input.id)).limit(1);
      if (existing.length === 0) throw new TRPCError({ code: "NOT_FOUND" });

      // Si hay usuario y no es admin ni dueño, bloquear
      if (ctx?.user && ctx.user.role !== "admin" && existing[0].agentId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db.delete(properties).where(eq(properties.id, input.id));
      invalidatePropertiesListCache();
      return { success: true };
    }),

  // List my own properties (agent view) or all properties (admin view) - Protegido con micro-caché para Supabase Egress
  myList: publicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const user = ctx?.user;
    if (!user || (user.role as string) === "admin") {
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
