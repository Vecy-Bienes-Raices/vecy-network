/**
 * VECY NETWORK — IMPORTADOR INTELIGENTE POR URL (PASO 3 — v34.37)
 *
 * Características:
 * - Defensa SSRF estricta (protocolo, credenciales, puertos, rangos IPv4/IPv6 privados/metadatos, DNS lookup y validación por salto en redirecciones).
 * - Detección de 9 portales colombianos/PropTech: Wasi, Qrador, NexoApp, Vitrina Raíz, KiteProp, Habi, Fincaraíz, Ciencuadras y Metrocuadrado (+ sitios externos).
 * - Extracción estructurada ANTES de limpiar <script> (__NEXT_DATA__, application/ld+json, OpenGraph/meta y selectores DOM).
 * - Cero copia/descarga de imágenes o videos de terceros (images: [], videoUrl: null, thirdPartyMediaStripped: true).
 * - Limpieza de teléfonos, correos, URLs y marcas de competidores.
 * - Normalización a los 19 tipos exactos (12 categorías BD), 8 modalidades, precios (price/rentPrice/adminFee) y geografía nacional DIVIPOLA/veredas.
 * - Fallback claro cuando hay WAF/403/429 o SPA vacía.
 */

import dns from "dns";
import net from "net";
import axios, { type AxiosRequestConfig } from "axios";
import * as cheerio from "cheerio";
import {
  BOGOTA_LOCALITIES,
  PROPERTY_TYPES_EXACT,
  findDepartmentForCity,
} from "../../shared/colombiaCatalog";
import {
  parseAdminFee,
  parseArea,
  parseColombianCurrency,
  parseColombianListing,
} from "../../shared/colombianRealEstateParser";
import { buscarLugarColombia } from "./colombia-geography";
import { findDivipolaInText, lookupDivipolaMunicipality } from "./divipola";
import { deducirGeografiaTripartita } from "./geography";
import { extractFallbackDataFromText, isPhoneNumberNotPrice } from "./janIA";
import { findVeredaInText } from "./veredas-lookup";

export type SupportedPortalName =
  | "Wasi"
  | "Qrador"
  | "NexoApp"
  | "Vitrina Raíz"
  | "KiteProp"
  | "Habi"
  | "Fincaraíz"
  | "Ciencuadras"
  | "Metrocuadrado"
  | "Sitio Inmobiliario Externo";

export type UrlImportStatus =
  | "ok"
  | "partial"
  | "blocked_waf"
  | "empty_spa"
  | "ssrf_blocked"
  | "invalid_url"
  | "network_error";

export interface UrlImportExtraction {
  name: string;
  description: string;
  propertyType: string;
  propertyTypeExact: string;
  subtype: string | null;
  isSubtipoComercial: boolean;
  transactionType: string;
  price: string;
  rentPrice?: string;
  adminFee?: string;
  currency: "COP" | "USD";
  department: string;
  city: string;
  addressLocality: string;
  zone: string;
  addressNeighborhood: string;
  areaTotal: string;
  areaConstruida: string;
  areaPrivada: string;
  yearBuilt: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  garajesCarro: number | null;
  garajesMoto: number;
  stratum: number;
  cocina: string;
  estudios: number;
  estarTv: number;
  depositos: number;
  piso: string;
  selectedInternas: string[];
  selectedExternas: string[];
  images: string[];
  videoUrl: null;
  republishToVecyStore: boolean;
  sourcePortal: SupportedPortalName;
  sourceUrl: string;
  thirdPartyMediaStripped: true;
  thirdPartyMediaCount: number;
  rawImportPayload: Record<string, unknown>;
}

export interface UrlImportResult {
  status: UrlImportStatus;
  success: boolean;
  sourceUrl: string;
  portal: SupportedPortalName;
  message: string;
  fallbackAction?: "paste_text" | "none";
  httpStatus?: number;
  warnings: string[];
  data: UrlImportExtraction | null;
}

export interface FetchHtmlResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

export interface ImportPropertyFromUrlOptions {
  fetchHtml?: (url: string, config?: AxiosRequestConfig) => Promise<FetchHtmlResponse>;
  resolveHost?: (hostname: string) => Promise<string[]>;
  timeoutMs?: number;
  maxRedirects?: number;
}

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "metadata",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
  "169.254.169.254",
  "100.100.100.200",
]);

const ALLOWED_PORTS = new Set(["", "80", "443"]);

const COMPETITOR_PATTERNS: RegExp[] = [
  /\b(?:wasi(?:\.co)?|qrador(?:\.com)?|nexoapp(?:\.co|\.com)?|vitrina\s*ra[ií]z|kiteprop(?:\.com)?|habi(?:\.co)?|finca\s*ra[ií]z(?:\.com\.co)?|fincaraiz(?:\.com\.co)?|ciencuadras(?:\.com)?|metrocuadrado(?:\.com)?|properati(?:\.com\.co)?|proppit(?:\.com)?|mercadolibre(?:\.com\.co)?|century\s*21|re\/?max|coldwell\s*banker|la\s*haus|pads(?:\.com\.co)?|engel\s*&?\s*v[oö]lkers|keller\s*williams|houm)\b/gi,
];

function parseIpv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let num = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    num = (num << 8) | octet;
  }
  return num >>> 0;
}

function isPrivateOrReservedIpv4Int(n: number): boolean {
  const b1 = (n >>> 24) & 0xff;
  const b2 = (n >>> 16) & 0xff;
  const b3 = (n >>> 8) & 0xff;

  if (b1 === 0) return true; // 0.0.0.0/8
  if (b1 === 10) return true; // 10.0.0.0/8
  if (b1 === 100 && b2 >= 64 && b2 <= 127) return true; // 100.64.0.0/10 CGNAT
  if (b1 === 127) return true; // 127.0.0.0/8 loopback
  if (b1 === 169 && b2 === 254) return true; // 169.254.0.0/16 link-local / cloud metadata
  if (b1 === 172 && b2 >= 16 && b2 <= 31) return true; // 172.16.0.0/12
  if (b1 === 192 && b2 === 0 && b3 === 0) return true; // 192.0.0.0/24
  if (b1 === 192 && b2 === 0 && b3 === 2) return true; // 192.0.2.0/24 TEST-NET-1
  if (b1 === 192 && b2 === 168) return true; // 192.168.0.0/16
  if (b1 === 198 && (b2 === 18 || b2 === 19)) return true; // 198.18.0.0/15 benchmarking
  if (b1 === 198 && b2 === 51 && b3 === 100) return true; // 198.51.100.0/24
  if (b1 === 203 && b2 === 0 && b3 === 113) return true; // 203.0.113.0/24
  if (b1 >= 224) return true; // multicast & reserved 224.0.0.0/4 + 240.0.0.0/4
  return false;
}

function decodeIpv4MappedIpv6(ipLower: string): string | null {
  const withoutBrackets = ipLower.replace(/^\[|\]$/g, "").split("%")[0];
  if (!withoutBrackets.includes("::ffff:")) return null;
  const tail = withoutBrackets.split("::ffff:")[1];
  if (!tail) return null;
  if (net.isIPv4(tail)) return tail;
  const hexPair = tail.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (hexPair) {
    const hi = parseInt(hexPair[1], 16);
    const lo = parseInt(hexPair[2], 16);
    if (Number.isFinite(hi) && Number.isFinite(lo)) {
      return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
    }
  }
  return null;
}

/**
 * Determina si una IP (IPv4, IPv6 o IPv4-mapped IPv6) es privada, loopback, link-local o reservada.
 */
export function isPrivateOrReservedIp(ipRaw: string): boolean {
  const ip = (ipRaw || "").trim().replace(/^\[|\]$/g, "").split("%")[0].toLowerCase();
  if (!ip) return true;

  if (net.isIPv4(ip)) {
    const intVal = parseIpv4ToInt(ip);
    return intVal === null ? true : isPrivateOrReservedIpv4Int(intVal);
  }

  // Verificar literales decimales o hexadecimales sueltos
  if (/^\d+$/.test(ip)) {
    const decVal = Number(ip);
    if (!Number.isFinite(decVal) || decVal < 0 || decVal > 0xffffffff) return true;
    return isPrivateOrReservedIpv4Int(decVal >>> 0);
  }
  if (/^0x[0-9a-f]+$/i.test(ip)) {
    const hexVal = parseInt(ip, 16);
    if (!Number.isFinite(hexVal)) return true;
    return isPrivateOrReservedIpv4Int(hexVal >>> 0);
  }

  if (net.isIPv6(ip)) {
    if (ip === "::" || ip === "::1" || ip === "0:0:0:0:0:0:0:0" || ip === "0:0:0:0:0:0:0:1") {
      return true;
    }
    const mappedV4 = decodeIpv4MappedIpv6(ip);
    if (mappedV4) {
      const intVal = parseIpv4ToInt(mappedV4);
      return intVal === null ? true : isPrivateOrReservedIpv4Int(intVal);
    }
    const firstHextet = parseInt(ip.split(":")[0] || "0", 16);
    if ((firstHextet & 0xfe00) === 0xfc00) return true; // fc00::/7 Unique Local Address
    if ((firstHextet & 0xffc0) === 0xfe80) return true; // fe80::/10 Link-local
    if ((firstHextet & 0xff00) === 0xff00) return true; // ff00::/8 Multicast
    if (ip.startsWith("2001:db8:")) return true; // Documentation
    if (ip.startsWith("64:ff9b::")) return true; // NAT64
    return false;
  }

  return true;
}

export class SsrfValidationError extends Error {
  public readonly code: "INVALID_URL" | "SSRF_BLOCKED";
  constructor(code: "INVALID_URL" | "SSRF_BLOCKED", message: string) {
    super(message);
    this.name = "SsrfValidationError";
    this.code = code;
  }
}

async function defaultResolveHost(hostname: string): Promise<string[]> {
  const results = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  return results.map((r) => r.address);
}

/**
 * Valida sintaxis, protocolo, puerto, credenciales, hostname y resolución DNS contra SSRF.
 */
export async function validateAndAssertSafeUrl(
  rawUrl: string,
  options?: { resolveHost?: (hostname: string) => Promise<string[]> },
): Promise<{ url: URL; resolvedIps: string[] }> {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed || trimmed.length > 2048) {
    throw new SsrfValidationError("INVALID_URL", "Ingresa una URL válida de un portal inmobiliario (https://...).");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new SsrfValidationError("INVALID_URL", "La URL ingresada no tiene un formato válido.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new SsrfValidationError(
      "SSRF_BLOCKED",
      "Por seguridad solo se permiten enlaces HTTP o HTTPS públicos.",
    );
  }

  if (parsed.username || parsed.password) {
    throw new SsrfValidationError(
      "SSRF_BLOCKED",
      "No se permiten URLs con credenciales embebidas.",
    );
  }

  if (!ALLOWED_PORTS.has(parsed.port)) {
    throw new SsrfValidationError(
      "SSRF_BLOCKED",
      `El puerto ${parsed.port} no está permitido para importación externa.`,
    );
  }

  const hostLower = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!hostLower) {
    throw new SsrfValidationError("INVALID_URL", "La URL no contiene un dominio válido.");
  }

  if (
    BLOCKED_HOSTNAMES.has(hostLower) ||
    hostLower.endsWith(".localhost") ||
    hostLower.endsWith(".local") ||
    hostLower.endsWith(".internal") ||
    hostLower.endsWith(".localdomain") ||
    hostLower.endsWith(".arpa")
  ) {
    throw new SsrfValidationError(
      "SSRF_BLOCKED",
      "Destino bloqueado por política de seguridad SSRF (host local o metadatos internos).",
    );
  }

  // IP literal en el hostname
  if (
    net.isIP(hostLower) !== 0 ||
    /^\d+$/.test(hostLower) ||
    /^0x[0-9a-f]+$/i.test(hostLower) ||
    /^(?:\d{1,3}|0x[0-9a-f]+)(?:\.(?:\d{1,3}|0x[0-9a-f]+)){1,3}$/i.test(hostLower)
  ) {
    if (isPrivateOrReservedIp(hostLower)) {
      throw new SsrfValidationError(
        "SSRF_BLOCKED",
        "Destino bloqueado por política de seguridad SSRF (dirección IP privada o reservada).",
      );
    }
    return { url: parsed, resolvedIps: [hostLower] };
  }

  if (!hostLower.includes(".")) {
    throw new SsrfValidationError(
      "SSRF_BLOCKED",
      "Solo se permiten dominios públicos completos (FQDN).",
    );
  }

  const resolver = options?.resolveHost || defaultResolveHost;
  let ips: string[] = [];
  try {
    ips = await resolver(hostLower);
  } catch {
    throw new SsrfValidationError(
      "INVALID_URL",
      `No se pudo resolver el dominio "${hostLower}". Verifica que el enlace sea correcto.`,
    );
  }

  if (!ips || ips.length === 0) {
    throw new SsrfValidationError(
      "INVALID_URL",
      `El dominio "${hostLower}" no devolvió direcciones IP públicas válidas.`,
    );
  }

  for (const ip of ips) {
    if (isPrivateOrReservedIp(ip)) {
      throw new SsrfValidationError(
        "SSRF_BLOCKED",
        "Destino bloqueado por política de seguridad SSRF (el dominio resuelve a una IP interna o reservada).",
      );
    }
  }

  return { url: parsed, resolvedIps: ips };
}

/**
 * Detecta el portal fuente a partir de la URL y opcionalmente firmas del HTML.
 */
export function detectSourcePortal(urlStr: string, html?: string): SupportedPortalName {
  let host = "";
  let full = (urlStr || "").toLowerCase();
  try {
    host = new URL(urlStr).hostname.toLowerCase();
  } catch {
    host = full;
  }
  const h = (html || "").toLowerCase();

  if (host.includes("wasi.co") || host.includes("wasi.") || h.includes("wasi.co") || h.includes("wasi-cdn") || h.includes("wasi_property")) {
    return "Wasi";
  }
  if (host.includes("qrador.com") || h.includes("qrador.com") || h.includes("qrador")) {
    return "Qrador";
  }
  if (host.includes("nexoapp") || h.includes("nexoapp")) {
    return "NexoApp";
  }
  if (host.includes("vitrinaraiz") || host.includes("vitrina-raiz") || h.includes("vitrinaraiz") || h.includes("vitrina raíz") || h.includes("vitrina raiz")) {
    return "Vitrina Raíz";
  }
  if (host.includes("kiteprop") || h.includes("kiteprop")) {
    return "KiteProp";
  }
  if (host.includes("habi.co") || h.includes("habi.co") || h.includes('"habi"')) {
    return "Habi";
  }
  if (host.includes("fincaraiz") || h.includes("fincaraiz.com.co")) {
    return "Fincaraíz";
  }
  if (host.includes("ciencuadras") || h.includes("ciencuadras.com")) {
    return "Ciencuadras";
  }
  if (host.includes("metrocuadrado") || h.includes("metrocuadrado.com")) {
    return "Metrocuadrado";
  }
  return "Sitio Inmobiliario Externo";
}

/**
 * Limpia teléfonos, correos, URLs externas, handles y marcas de competidores.
 */
export function scrubCompetitorAndContactInfo(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  let clean = raw;

  // Eliminar URLs externas
  clean = clean.replace(/https?:\/\/[^\s<>"{}|\\^`[\]]+/gi, " ");
  clean = clean.replace(/\bwww\.[^\s<>"{}|\\^`[\]]+/gi, " ");

  // Eliminar correos electrónicos
  clean = clean.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, " ");

  // Eliminar handles @usuario
  clean = clean.replace(/(?:^|\s)@[a-zA-Z0-9._-]{3,}/g, " ");

  // Eliminar teléfonos colombianos y WhatsApp (sin dañar cifras de precios precedidas por $ o montos compactos)
  clean = clean.replace(/(?<!\$)(?<!\$\s)(?:\+?57[\s.-]*)?\b3(?:0[0-5]|1[0-9]|2[0-4]|5[0-1])[\s.-]+\d{3}[\s.-]+\d{4}\b/g, " ");
  clean = clean.replace(/(?<!\$)(?<!\$\s)(?:\+?57[\s.-]*)?\b3(?:0[0-5]|1[0-9]|2[0-4]|5[0-1])\d{7}\b/g, " ");
  clean = clean.replace(/(?<!\$)(?:\+?57[\s.-]*)?\b60[1-8][\s.-]*\d{3}[\s.-]*\d{4}\b/g, " ");
  clean = clean.replace(/(?<!\$)\+?57[\s.-]+(?:\(?\d{1,3}\)?[\s.-]+)?\d{3}[\s.-]+\d{4}\b/g, " ");
  clean = clean.replace(/\b(?:cel(?:ular)?|tel(?:[eé]fono)?|whatsapp|wsp|contacto\s*directo|asesor\s*wasi|c[oó]d(?:igo)?\s*(?:wasi|fincara[ií]z|metrocuadrado|ciencuadras|habi|qrador|kiteprop|nexoapp))\s*:?\s*[A-Za-z0-9+()\-.\s]{3,24}/gi, " ");

  // Eliminar marcas de portales/competidores
  for (const pat of COMPETITOR_PATTERNS) {
    clean = clean.replace(pat, " ");
  }

  return clean
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function normKey(val: string): string {
  return (val || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function normalizeImportedPropertyType(
  rawType: string | null | undefined,
  hintText: string = "",
): { propertyType: string; propertyTypeExact: string; isSubtipoComercial: boolean; subtype: string | null } {
  const combined = normKey(`${rawType || ""} ${hintText || ""}`);
  const exactOnly = normKey(rawType || "");

  // Evitar falsos positivos: "localidad" o "centro comercial" en el barrio no convierten en "Local"
  const hasExplicitLocal =
    /\b(?:local\s+comercial|locales\s+comerciales|local(?:es)?)\b/.test(combined) &&
    !/\b(?:localidad|centro\s+comercial|centros\s+comerciales|zona\s+comercial)\b/.test(exactOnly || combined);

  const hasCasaComercial =
    /\b(?:casa\s+comercial|sede\s+empresarial|oficina\s+en\s+casa)\b/.test(combined);
  const hasExplicitCasaCampestre = /\b(?:casa\s+campestre)\b/.test(combined);
  const hasExplicitCasaQuinta = /\b(?:casa\s+quinta)\b/.test(combined);
  const hasExplicitVilla =
    /\bvilla\b(?!\s*(?:de\s+leyva|del\s+rosario|del\s+prado|del\s+rio|del\s+sol|magdala|carolina|santos|campestre|olimpica|luz|alsacia|gorgona|maria|pinzon|nueva|garzon))/.test(
      combined,
    );
  const hasCampestreNotColina =
    combined.includes("campestre") && !combined.includes("colina campestre") && !combined.includes("villa campestre");

  if (hasCasaComercial) {
    return {
      propertyType: "commercial",
      propertyTypeExact: "Casa",
      isSubtipoComercial: true,
      subtype: "Casa Comercial / Oficinas / Sede",
    };
  }
  if (/\b(?:consultorio|consultorios|odontol)\b/.test(combined) && !/\b(?:apartamento|apto)\b/.test(combined)) {
    return {
      propertyType: "consultorio",
      propertyTypeExact: "Oficina",
      isSubtipoComercial: true,
      subtype: "Consultorio Médico / Odontológico",
    };
  }
  if (/\b(?:pent\s*house\s+d[uú]plex|penthouse\s+duplex|ph\s+duplex)\b/.test(combined)) {
    return { propertyType: "apartment", propertyTypeExact: "Pent House Dúplex", isSubtipoComercial: false, subtype: null };
  }
  if (/\b(?:pent\s*house|penthouse)\b/.test(combined)) {
    return { propertyType: "apartment", propertyTypeExact: "Pent House", isSubtipoComercial: false, subtype: null };
  }
  if (/\b(?:apartamento\s+d[uú]plex|apto\s+duplex)\b/.test(combined)) {
    return { propertyType: "apartment", propertyTypeExact: "Apartamento Dúplex", isSubtipoComercial: false, subtype: null };
  }
  if (/\b(?:apartaestudio|aparta\s*estudio|apartasuite|loft)\b/.test(combined)) {
    return { propertyType: "loft", propertyTypeExact: "Apartaestudio", isSubtipoComercial: false, subtype: null };
  }
  if (/\b(?:aparta[\s-]?hotel)\b/.test(combined)) {
    return { propertyType: "hotel", propertyTypeExact: "Aparta Hotel", isSubtipoComercial: true, subtype: "Aparta-hotel" };
  }
  if (/\b(?:hostal|hostel)\b/.test(combined)) {
    return { propertyType: "hotel", propertyTypeExact: "Hostal", isSubtipoComercial: true, subtype: "Hostal" };
  }
  if (/\b(?:hotel|motel|hospedaje)\b/.test(combined)) {
    return { propertyType: "hotel", propertyTypeExact: "Hotel", isSubtipoComercial: true, subtype: "Hotel Boutique / Turístico" };
  }
  if (/\b(?:bodega|warehouse|galpon)\b/.test(combined)) {
    return {
      propertyType: "warehouse",
      propertyTypeExact: "Bodega",
      isSubtipoComercial: true,
      subtype: combined.includes("industrial") ? "Bodega Industrial / Producción" : "Bodega de Almacenamiento",
    };
  }
  if (/\b(?:edificio|building)\b/.test(combined) && !/\b(?:conjunto|edificio\s+residencial\s+con\s+apartamento)\b/.test(combined) && (exactOnly.includes("edificio") || /^\s*(?:se\s+vende\s+|venta\s+de\s+)?edificio\b/.test(normKey(hintText)))) {
    return { propertyType: "building", propertyTypeExact: "Edificio", isSubtipoComercial: true, subtype: "Edificio Mixto (Oficinas / Locales / Vivienda)" };
  }
  if (/\b(?:oficina|office)\b/.test(combined) && !/\b(?:home\s+office|apartamento|apto|casa)\b/.test(combined)) {
    return { propertyType: "office", propertyTypeExact: "Oficina", isSubtipoComercial: true, subtype: "Oficina Corporativa / Edificio Empresarial" };
  }
  if (hasExplicitLocal && !/\b(?:apartamento|apto|casa)\b/.test(combined)) {
    return { propertyType: "commercial", propertyTypeExact: "Local", isSubtipoComercial: true, subtype: "Local Comercial a la Calle" };
  }
  if (/\b(?:lote|terreno|casalote|casa\s*lote|land|parcela)\b/.test(combined) && !/\b(?:casa\s+en\s+lote|apartamento)\b/.test(combined)) {
    return { propertyType: "land", propertyTypeExact: "Lote / Terreno", isSubtipoComercial: false, subtype: null };
  }
  if (/\b(?:cabana|cabaña|cabin)\b/.test(combined)) {
    return { propertyType: "cabin", propertyTypeExact: "Cabaña", isSubtipoComercial: false, subtype: null };
  }
  if (hasExplicitCasaCampestre) {
    return { propertyType: "house", propertyTypeExact: "Casa Campestre", isSubtipoComercial: false, subtype: "Casa Campestre Residencial" };
  }
  if (hasExplicitCasaQuinta) {
    return { propertyType: "house", propertyTypeExact: "Casa Quinta", isSubtipoComercial: false, subtype: "Casa Quinta Recreacional" };
  }
  if (/\b(?:finca|hacienda|farm)\b/.test(combined) || (hasCampestreNotColina && !/\b(?:apartamento|apto|casa)\b/.test(combined))) {
    return { propertyType: "farm", propertyTypeExact: "Finca", isSubtipoComercial: false, subtype: "Finca de Recreo / Vacacional" };
  }
  if (hasExplicitVilla) {
    return { propertyType: "house", propertyTypeExact: "Villa", isSubtipoComercial: false, subtype: null };
  }
  if (/\b(?:casa|house|townhouse|chalet)\b/.test(combined) && !/\b(?:apartamento|apto)\b/.test(exactOnly)) {
    return { propertyType: "house", propertyTypeExact: "Casa", isSubtipoComercial: false, subtype: "Casa Familiar Unifamiliar" };
  }

  if (/\b(?:apartamento|apartment|apto)\b/.test(combined)) {
    return { propertyType: "apartment", propertyTypeExact: "Apartamento", isSubtipoComercial: false, subtype: null };
  }

  // Verificar coincidencia directa contra los 19 tipos exactos (sin recursión)
  const matchedExact = PROPERTY_TYPES_EXACT.find((exactLabel) => normKey(exactLabel) === exactOnly);
  if (matchedExact) {
    return { propertyType: "apartment", propertyTypeExact: matchedExact, isSubtipoComercial: false, subtype: null };
  }

  return { propertyType: "apartment", propertyTypeExact: "Apartamento", isSubtipoComercial: false, subtype: null };
}

export function normalizeImportedTransactionType(
  rawTx: string | null | undefined,
  hintText: string = "",
): string {
  const combined = normKey(`${rawTx || ""} ${hintText || ""}`);
  if (/\b(?:aporte|socio\s+constructor)\b/.test(combined)) return "aporte";
  if (/\b(?:arriendo\s+con\s+opci[oó]n\s+de\s+compra|opci[oó]n\s+de\s+compra|leasing\s+habitacional)\b/.test(combined)) {
    return "arriendo_con_opcion_de_compra";
  }
  if (/\b(?:arriendo\s+temporal|vacacional|por\s+d[ií]as|airbnb|renta\s+corta)\b/.test(combined)) {
    return "arriendo_temporal";
  }
  const hasPermuta = /\b(?:permuta|permuto|se\s+permuta|venpermuta|recibe\s+menor\s+valor|parte\s+de\s+pago)\b/.test(combined);
  const hasVenta = /\b(?:venta|vendo|vende|se\s+vende|compra|sale|buy)\b/.test(combined);
  const hasArriendo = /\b(?:arriendo|arrendar|se\s+arrienda|alquiler|alquila|canon|renta|rent)\b/.test(combined);

  if (hasPermuta) {
    return hasVenta ? "venta_permuta" : "permuta";
  }
  if (hasVenta && hasArriendo) {
    return "venta_o_arriendo";
  }
  if (hasArriendo && !hasVenta) {
    return "arriendo";
  }
  return "venta";
}

function parseNumericValue(val: unknown): number {
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  if (typeof val !== "string") return 0;
  const trimmed = val.trim();
  if (!trimmed) return 0;

  const colParsed = parseColombianCurrency(trimmed);
  if (colParsed && colParsed > 0) return colParsed;

  // Formato con separadores de miles ("850.000.000" o "850,000,000")
  const digits = trimmed.replace(/[^\d.,]/g, "");
  if (!digits) return 0;
  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(digits)) {
    const parsed = parseInt(digits.replace(/[.,]/g, ""), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const asFloat = parseFloat(digits.replace(",", "."));
  return Number.isFinite(asFloat) ? Math.round(asFloat) : 0;
}

function parseSmallInt(val: unknown): number | null {
  if (typeof val === "number") return Number.isFinite(val) && val >= 0 ? Math.round(val) : null;
  if (typeof val !== "string") return null;
  const m = val.match(/\d+/);
  if (!m) return null;
  const n = parseInt(m[0], 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

interface StructuredExtractCandidate {
  title?: string;
  description?: string;
  propertyType?: string;
  transactionType?: string;
  salePrice?: number;
  rentPrice?: number;
  adminFee?: number;
  currency?: "COP" | "USD";
  areaTotal?: number;
  areaPrivate?: number;
  bedrooms?: number;
  bathrooms?: number;
  garages?: number;
  stratum?: number;
  yearBuilt?: number;
  floor?: string;
  department?: string;
  city?: string;
  locality?: string;
  neighborhood?: string;
  mediaCount: number;
  sourcesUsed: string[];
}

function flattenJsonLdNodes(parsed: unknown): Record<string, any>[] {
  const nodes: Record<string, any>[] = [];
  const visit = (item: unknown) => {
    if (!item) return;
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    if (typeof item === "object") {
      const obj = item as Record<string, any>;
      nodes.push(obj);
      if (Array.isArray(obj["@graph"])) {
        obj["@graph"].forEach(visit);
      }
      if (obj.mainEntity && typeof obj.mainEntity === "object") {
        visit(obj.mainEntity);
      }
    }
  };
  visit(parsed);
  return nodes;
}

function findNextDataPropertyObject(root: unknown): Record<string, any> | null {
  if (!root || typeof root !== "object") return null;
  let best: Record<string, any> | null = null;
  let bestScore = 0;

  const queue: unknown[] = [root];
  const visited = new Set<unknown>();
  let iterations = 0;

  while (queue.length > 0 && iterations < 500) {
    iterations++;
    const curr = queue.shift();
    if (!curr || typeof curr !== "object" || visited.has(curr)) continue;
    visited.add(curr);

    if (!Array.isArray(curr)) {
      const obj = curr as Record<string, any>;
      let score = 0;
      const keys = Object.keys(obj);
      if (
        keys.some((k) => /^(?:title|name|nombre|titulo)$/i.test(k)) &&
        (obj.title !== undefined || obj.name !== undefined || obj.nombre !== undefined || obj.titulo !== undefined)
      ) {
        score += 2;
      }
      if ("price" in obj || "salePrice" in obj || "rentPrice" in obj || "valorVenta" in obj || "valorArriendo" in obj || "precio" in obj || "prices" in obj) score += 3;
      if ("area" in obj || "areaConstruida" in obj || "builtArea" in obj || "m2" in obj || "areaTotal" in obj) score += 2;
      if ("rooms" in obj || "bedrooms" in obj || "habitaciones" in obj || "alcobas" in obj) score += 2;
      if ("bathrooms" in obj || "banos" in obj) score += 1;
      if ("location" in obj || "neighborhood" in obj || "barrio" in obj || "city" in obj || "ciudad" in obj) score += 2;
      if ("propertyType" in obj || "tipoInmueble" in obj || "realEstateType" in obj) score += 2;

      if (score > bestScore && score >= 4) {
        bestScore = score;
        best = obj;
      }

      for (const v of Object.values(obj)) {
        if (v && typeof v === "object") queue.push(v);
      }
    } else {
      for (const item of curr.slice(0, 20)) {
        if (item && typeof item === "object") queue.push(item);
      }
    }
  }

  return best;
}

function extractFromObjectCandidate(obj: Record<string, any>): Partial<StructuredExtractCandidate> {
  const out: Partial<StructuredExtractCandidate> = {};

  out.title = String(obj.title || obj.name || obj.nombre || obj.titulo || "").trim() || undefined;
  out.description = String(obj.description || obj.descripcion || obj.comment || obj.observations || "").trim() || undefined;
  out.propertyType = String(
    obj.propertyType?.name || obj.propertyType || obj.tipoInmueble || obj.realEstateType || obj.category || "",
  ).trim() || undefined;
  out.transactionType = String(
    obj.transactionType?.name || obj.transactionType || obj.businessType || obj.operationType || obj.tipoNegocio || obj.oferta || "",
  ).trim() || undefined;

  const saleCandidates = [
    obj.salePrice,
    obj.valorVenta,
    obj.precioVenta,
    obj.prices?.sale?.amount,
    obj.prices?.venta,
    obj.price,
    obj.precio,
    obj.valor,
    obj.offers?.price,
  ];
  for (const sc of saleCandidates) {
    const val = parseNumericValue(sc);
    if (val >= 50_000) {
      out.salePrice = val;
      break;
    }
  }

  const rentCandidates = [
    obj.rentPrice,
    obj.valorArriendo,
    obj.precioArriendo,
    obj.canon,
    obj.prices?.rent?.amount,
    obj.prices?.arriendo,
  ];
  for (const rc of rentCandidates) {
    const val = parseNumericValue(rc);
    if (val >= 50_000) {
      out.rentPrice = val;
      break;
    }
  }

  const adminCandidates = [obj.adminFee, obj.administration, obj.administracion, obj.admon, obj.valorAdministracion];
  for (const ac of adminCandidates) {
    const val = parseNumericValue(ac);
    if (val >= 10_000 && val <= 30_000_000) {
      out.adminFee = val;
      break;
    }
  }

  const cur = String(obj.currency || obj.moneda || obj.offers?.priceCurrency || "").toUpperCase();
  if (cur === "USD") out.currency = "USD";

  const areaTotalVal = parseNumericValue(
    obj.areaTotal ?? obj.areaConstruida ?? obj.builtArea ?? obj.area ?? obj.m2 ?? obj.floorSize?.value,
  );
  if (areaTotalVal > 0) out.areaTotal = areaTotalVal;

  const areaPrivVal = parseNumericValue(obj.areaPrivate ?? obj.areaPrivada ?? obj.privateArea);
  if (areaPrivVal > 0) out.areaPrivate = areaPrivVal;

  const beds = parseSmallInt(obj.bedrooms ?? obj.rooms ?? obj.habitaciones ?? obj.alcobas ?? obj.numberOfRooms);
  if (beds !== null) out.bedrooms = beds;

  const baths = parseSmallInt(obj.bathrooms ?? obj.banos ?? obj.numberOfBathroomsTotal);
  if (baths !== null) out.bathrooms = baths;

  const gars = parseSmallInt(obj.garages ?? obj.parking ?? obj.parqueaderos ?? obj.garajes);
  if (gars !== null) out.garages = gars;

  const strat = parseSmallInt(obj.stratum ?? obj.estrato);
  if (strat !== null && strat >= 0 && strat <= 6) out.stratum = strat;

  const yr = parseSmallInt(obj.yearBuilt ?? obj.anoConstruccion);
  if (yr && yr >= 1900 && yr <= 2030) out.yearBuilt = yr;

  const loc = typeof obj.location === "object" && obj.location ? obj.location : obj;
  out.department = String(loc.department?.name || loc.department || loc.departamento || loc.address?.addressRegion || "").trim() || undefined;
  out.city = String(loc.city?.name || loc.city || loc.ciudad || loc.municipio || loc.address?.addressLocality || "").trim() || undefined;
  out.locality = String(loc.locality?.name || loc.locality || loc.localidad || loc.comuna || "").trim() || undefined;
  out.neighborhood = String(
    loc.neighborhood?.name || loc.neighborhood || loc.barrio || loc.zone || loc.sector || loc.vereda || "",
  ).trim() || undefined;

  let mediaCount = 0;
  if (Array.isArray(obj.images)) mediaCount += obj.images.length;
  if (Array.isArray(obj.photos)) mediaCount += obj.photos.length;
  if (Array.isArray(obj.galleries)) mediaCount += obj.galleries.length;
  if (typeof obj.image === "string") mediaCount += 1;
  if (typeof obj.videoUrl === "string" || typeof obj.video === "string") mediaCount += 1;
  out.mediaCount = mediaCount;

  return out;
}

/**
 * Detecta si la respuesta HTTP o HTML corresponde a bloqueo WAF/Anti-Bot (Cloudflare, Akamai, 403/429).
 */
export function detectWafOrChallenge(status: number, html: string): boolean {
  if (status === 403 || status === 429 || status === 503) return true;
  const low = (html || "").toLowerCase();
  if (!low) return false;
  return (
    low.includes("cf-browser-verification") ||
    low.includes("attention required! | cloudflare") ||
    low.includes("just a moment...") ||
    low.includes("_cf_chl_opt") ||
    low.includes("access denied") ||
    low.includes("perimeterx") ||
    low.includes("datadome") ||
    (low.includes("enable javascript and cookies to continue") && low.length < 15000)
  );
}

/**
 * Extrae y normaliza la información inmobiliaria de un HTML completo ANTES de eliminar scripts.
 * Jamás descarga ni incluye imágenes o videos de terceros en la salida.
 */
export function extractPropertyFromHtml(
  html: string,
  urlStr: string,
  httpStatus: number = 200,
): UrlImportResult {
  const portal = detectSourcePortal(urlStr, html);
  const warnings: string[] = [];

  if (detectWafOrChallenge(httpStatus, html)) {
    return {
      status: "blocked_waf",
      success: false,
      sourceUrl: urlStr,
      portal,
      httpStatus,
      fallbackAction: "paste_text",
      message: `${portal} bloqueó la descarga automática (protección anti-bot/WAF ${httpStatus || ""}). Copia el texto de la ficha en ${portal} y pégalo en la pestaña "Texto Libre / WhatsApp" para estructurarlo con JanIA en 1 clic.`,
      warnings: [`Bloqueo WAF/HTTP ${httpStatus || "challenge"} detectado.`],
      data: null,
    };
  }

  const $ = cheerio.load(html || "");
  const structured: StructuredExtractCandidate = {
    mediaCount: 0,
    sourcesUsed: [],
  };

  // 1. Extraer __NEXT_DATA__ ANTES de limpiar <script>
  const nextDataRaw = $("#__NEXT_DATA__").html();
  if (nextDataRaw) {
    try {
      const nextJson = JSON.parse(nextDataRaw);
      const propObj = findNextDataPropertyObject(nextJson?.props?.pageProps ?? nextJson);
      if (propObj) {
        const parsedNext = extractFromObjectCandidate(propObj);
        Object.assign(structured, parsedNext);
        structured.mediaCount = (structured.mediaCount || 0) + (parsedNext.mediaCount || 0);
        structured.sourcesUsed.push("__NEXT_DATA__");
      }
    } catch {
      warnings.push("No se pudo parsear el bloque __NEXT_DATA__.");
    }
  }

  // 2. Extraer JSON-LD ANTES de limpiar <script>
  $('script[type="application/ld+json"]').each((_idx, el) => {
    const rawJson = $(el).html();
    if (!rawJson) return;
    try {
      const parsedLd = JSON.parse(rawJson);
      const nodes = flattenJsonLdNodes(parsedLd);
      for (const node of nodes) {
        const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
        const typeStr = types.filter(Boolean).join(" ").toLowerCase();
        if (
          /realestate|residence|apartment|house|singlefamily|product|offer|place|accommodation|building/.test(typeStr) ||
          node.offers ||
          node.floorSize ||
          node.numberOfRooms
        ) {
          const parsedObj = extractFromObjectCandidate(node);
          structured.title = structured.title || parsedObj.title;
          structured.description = structured.description || parsedObj.description;
          structured.propertyType = structured.propertyType || parsedObj.propertyType || typeStr;
          structured.transactionType = structured.transactionType || parsedObj.transactionType;
          structured.salePrice = structured.salePrice || parsedObj.salePrice;
          structured.rentPrice = structured.rentPrice || parsedObj.rentPrice;
          structured.adminFee = structured.adminFee || parsedObj.adminFee;
          structured.currency = structured.currency || parsedObj.currency;
          structured.areaTotal = structured.areaTotal || parsedObj.areaTotal;
          structured.areaPrivate = structured.areaPrivate || parsedObj.areaPrivate;
          structured.bedrooms = structured.bedrooms ?? parsedObj.bedrooms;
          structured.bathrooms = structured.bathrooms ?? parsedObj.bathrooms;
          structured.garages = structured.garages ?? parsedObj.garages;
          structured.city = structured.city || parsedObj.city;
          structured.department = structured.department || parsedObj.department;
          structured.neighborhood = structured.neighborhood || parsedObj.neighborhood;
          structured.mediaCount += parsedObj.mediaCount || 0;
          if (!structured.sourcesUsed.includes("json-ld")) structured.sourcesUsed.push("json-ld");
        }
      }
    } catch {
      // Ignorar JSON-LD mal formado de terceros
    }
  });

  // 3. Extraer OpenGraph / Meta Tags ANTES de limpiar el DOM
  const ogTitle =
    $('meta[property="og:title"]').attr("content") ||
    $('meta[name="twitter:title"]').attr("content") ||
    $("title").text() ||
    "";
  const ogDesc =
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    $('meta[name="twitter:description"]').attr("content") ||
    "";
  const metaPrice =
    $('meta[property="product:price:amount"]').attr("content") ||
    $('meta[itemprop="price"]').attr("content") ||
    "";
  const metaLocality =
    $('meta[property="og:locality"]').attr("content") ||
    $('meta[name="geo.placename"]').attr("content") ||
    "";
  const metaRegion = $('meta[property="og:region"]').attr("content") || "";

  if (ogTitle || ogDesc || metaPrice) {
    structured.sourcesUsed.push("opengraph");
  }

  // Contabilizar medios externos para informar que fueron excluidos (NO se copian URLs ni binarios)
  const domMediaCount =
    $("img[src], source[src], video[src], meta[property='og:image'], iframe[src*='youtube'], iframe[src*='vimeo']").length;
  const totalThirdPartyMedia = Math.max(structured.mediaCount || 0, domMediaCount);

  // 4. Extraer texto y selectores DOM, luego limpiar basura HTML
  const h1Text = $("h1").first().text().trim();
  const priceSelectorText = $(
    ".price, .property-price, .item-price, .valor, [data-testid*='price'], [class*='price'], [itemprop='price']",
  )
    .first()
    .text()
    .trim();
  const detailsDomText = $(
    ".details, .features, .description, .caracteristicas, .ficha-tecnica, [class*='amenity'], [class*='feature'], [class*='spec']",
  )
    .text()
    .replace(/\s+/g, " ")
    .trim();

  $("script, style, nav, footer, iframe, header, noscript, svg, .related-properties, .similar-properties, .comments, .agent-contact").remove();
  const cleanBodyText = $("body").text().replace(/\s+/g, " ").trim();

  // Verificar si es SPA vacía sin información útil
  const hasAnyStructuredSignal = Boolean(
    structured.salePrice ||
      structured.rentPrice ||
      structured.areaTotal ||
      structured.sourcesUsed.includes("__NEXT_DATA__") ||
      structured.sourcesUsed.includes("json-ld"),
  );
  if (!hasAnyStructuredSignal && cleanBodyText.length < 140 && !priceSelectorText && !ogDesc) {
    return {
      status: "empty_spa",
      success: false,
      sourceUrl: urlStr,
      portal,
      httpStatus,
      fallbackAction: "paste_text",
      message: `${portal} cargó una página dinámica (SPA) sin datos visibles en el HTML inicial. Copia la descripción del inmueble y pégala en "Texto Libre / WhatsApp" para que JanIA la estructure.`,
      warnings: ["HTML sin datos estructurados ni texto suficiente (SPA vacía)."],
      data: null,
    };
  }

  // 5. Combinar señales estructuradas + parsers doctrinales de Colombia
  let urlPathHint = "";
  try {
    urlPathHint = decodeURIComponent(new URL(urlStr).pathname).replace(/[-_/]+/g, " ").trim();
  } catch {
    urlPathHint = "";
  }

  const combinedRawText = [
    structured.title || h1Text || ogTitle,
    ogTitle && ogTitle !== h1Text && ogTitle !== structured.title ? ogTitle : "",
    priceSelectorText ? `Precio: ${priceSelectorText}` : "",
    structured.description || ogDesc,
    detailsDomText,
    cleanBodyText.slice(0, 6000),
  ]
    .filter(Boolean)
    .join("\n");

  const scrubbedText = scrubCompetitorAndContactInfo(combinedRawText);
  const colombianParsed = parseColombianListing(scrubbedText);
  const fallbackParsed = extractFallbackDataFromText(scrubbedText);

  const txHintText = `${structured.title || ""} ${h1Text} ${ogTitle} ${urlPathHint} ${scrubbedText.slice(0, 1500)}`;
  const hasExplicitRentKeyword = /\b(?:arriendo|arrendar|se\s+arrienda|alquiler|alquila|canon|renta|rent)\b/i.test(
    normKey(txHintText),
  );
  const rawTxCandidate =
    structured.transactionType ||
    (fallbackParsed.transactionType && (fallbackParsed.transactionType !== "arriendo" || hasExplicitRentKeyword)
      ? fallbackParsed.transactionType
      : "");

  const txType = normalizeImportedTransactionType(rawTxCandidate, txHintText);

  const propTypeNorm = normalizeImportedPropertyType(
    structured.propertyType || fallbackParsed.propertyType,
    `${structured.title || ""} ${h1Text} ${ogTitle} ${urlPathHint} ${ogDesc}`,
  );

  // Precios (con filtro anti-teléfono)
  let salePrice = structured.salePrice || colombianParsed.salePriceCOP || 0;
  let rentPrice = structured.rentPrice || colombianParsed.rentPriceCOP || fallbackParsed.rentPrice || 0;
  let adminFee = structured.adminFee || colombianParsed.adminFeeCOP || fallbackParsed.adminFee || 0;

  if (!salePrice && fallbackParsed.price && !isPhoneNumberNotPrice(fallbackParsed.price, scrubbedText)) {
    salePrice = Number(fallbackParsed.price) || 0;
  }
  if (!salePrice && metaPrice) {
    const mp = parseNumericValue(metaPrice);
    if (mp >= 50_000 && !isPhoneNumberNotPrice(mp, scrubbedText)) {
      if (txType === "arriendo" && mp <= 80_000_000) rentPrice = rentPrice || mp;
      else salePrice = mp;
    }
  }
  if (!salePrice && !rentPrice && priceSelectorText) {
    const pSel = parseNumericValue(priceSelectorText);
    if (pSel >= 50_000 && !isPhoneNumberNotPrice(pSel, priceSelectorText)) {
      if (txType === "arriendo" && pSel <= 80_000_000) rentPrice = pSel;
      else salePrice = pSel;
    }
  }

  if (txType === "arriendo" && rentPrice > 0 && salePrice === 0) {
    salePrice = rentPrice;
  } else if (txType === "arriendo" && salePrice > 0 && rentPrice === 0 && salePrice <= 100_000_000) {
    rentPrice = salePrice;
  }

  const primaryPriceStr = salePrice > 0 ? String(Math.round(salePrice)) : rentPrice > 0 ? String(Math.round(rentPrice)) : "0";
  const rentPriceStr = rentPrice > 0 ? String(Math.round(rentPrice)) : undefined;
  const adminFeeStr = adminFee > 0 ? String(Math.round(adminFee)) : undefined;

  // Áreas
  const parsedAreaFallback = parseArea(scrubbedText);
  const areaTotalNum = structured.areaTotal || colombianParsed.areaM2 || fallbackParsed.areaTotal || parsedAreaFallback || 0;
  const areaPrivateNum = structured.areaPrivate || fallbackParsed.areaPrivate || 0;

  // Especificaciones físicas
  const bedrooms = structured.bedrooms ?? colombianParsed.bedrooms ?? fallbackParsed.bedrooms ?? null;
  const bathrooms = structured.bathrooms ?? fallbackParsed.bathrooms ?? null;
  const garages = structured.garages ?? fallbackParsed.garages ?? null;
  const stratum = structured.stratum ?? fallbackParsed.stratum ?? 4;
  const yearBuilt = structured.yearBuilt ?? (colombianParsed.maxAgeYears ? 2026 - colombianParsed.maxAgeYears : null);

  // Geografía nacional Colombia (DIVIPOLA + Localidades + Veredas)
  const geoRawInput = `${structured.neighborhood || ""} ${structured.locality || metaLocality || ""} ${structured.city || ""} ${structured.department || metaRegion || ""}`;
  const geoTri = deducirGeografiaTripartita(
    structured.neighborhood || fallbackParsed.zone || "",
    structured.city || metaLocality || fallbackParsed.city || "",
    "",
    `${structured.title || h1Text || ogTitle} ${scrubbedText.slice(0, 1500)}`,
  );

  let city = structured.city || geoTri.city || fallbackParsed.city || "";
  const divipolaExact = city ? lookupDivipolaMunicipality(city) : null;
  if (divipolaExact) {
    city = divipolaExact.municipio;
  } else if (!city) {
    const divInText = findDivipolaInText(`${geoRawInput} ${scrubbedText.slice(0, 1500)}`);
    if (divInText) city = divInText.municipio;
  }
  if (!city) {
    const lugar = buscarLugarColombia(`${geoRawInput} ${scrubbedText.slice(0, 1000)}`);
    if (lugar?.nombreCanonico) city = lugar.nombreCanonico;
  }
  if (!city) city = "Bogotá, D.C.";

  let department =
    structured.department ||
    geoTri.department ||
    divipolaExact?.departamento ||
    findDepartmentForCity(city) ||
    "";

  const veredaMatch = findVeredaInText(`${structured.neighborhood || ""} ${scrubbedText.slice(0, 1500)}`, city);
  let neighborhood =
    structured.neighborhood ||
    (veredaMatch ? `Vereda ${veredaMatch.vereda}` : "") ||
    (geoTri.neighborhood && geoTri.neighborhood !== city ? geoTri.neighborhood : "") ||
    fallbackParsed.addressNeighborhood ||
    "";
  neighborhood = scrubCompetitorAndContactInfo(neighborhood);

  let locality = structured.locality || geoTri.locality || "";
  if (!locality && normKey(city).includes("bogota")) {
    const textNorm = normKey(scrubbedText);
    for (const loc of BOGOTA_LOCALITIES) {
      if (textNorm.includes(normKey(loc))) {
        locality = loc;
        break;
      }
    }
  }

  const sectorDisplay = neighborhood || locality || city;
  const cleanTitleRaw = scrubCompetitorAndContactInfo(structured.title || h1Text || ogTitle || "");
  const standardizedTitle = sectorDisplay
    ? `${propTypeNorm.isSubtipoComercial && !propTypeNorm.propertyTypeExact.toLowerCase().includes("comercial") ? `${propTypeNorm.propertyTypeExact} Comercial` : propTypeNorm.propertyTypeExact} en ${sectorDisplay}`
    : cleanTitleRaw.slice(0, 120) || `${propTypeNorm.propertyTypeExact} en ${city}`;

  const cleanDescription = scrubCompetitorAndContactInfo(
    structured.description || ogDesc || detailsDomText || cleanBodyText,
  ).slice(0, 500);

  const lowerText = normKey(scrubbedText);
  const selectedInternas: string[] = [];
  if (lowerText.includes("balcon")) selectedInternas.push("Balcón");
  if (lowerText.includes("closet")) selectedInternas.push("Clósets");
  if (lowerText.includes("gas")) selectedInternas.push("Gas domiciliario");
  if (lowerText.includes("iluminacion")) selectedInternas.push("Iluminación natural");
  if (lowerText.includes("lavanderia") || lowerText.includes("zona de ropas")) selectedInternas.push("Zona de lavandería");
  if (lowerText.includes("estudio")) selectedInternas.push("Hall de alcobas");

  const selectedExternas: string[] = [];
  if (lowerText.includes("ascensor")) selectedExternas.push("Ascensor");
  if (lowerText.includes("gimnasio")) selectedExternas.push("Gimnasio");
  if (lowerText.includes("piscina")) selectedExternas.push("Piscina");
  if (lowerText.includes("vigilancia") || lowerText.includes("porteria")) selectedExternas.push("Seguridad privada 24/7");
  if (lowerText.includes("parque")) selectedExternas.push("Parques cercanos");
  if (lowerText.includes("transporte")) selectedExternas.push("Transporte público cercano");

  if (totalThirdPartyMedia > 0) {
    warnings.push(
      `Se omitieron ${totalThirdPartyMedia} archivos multimedia externos por derechos de autor; sube tus propias fotos y video en el Paso 2.`,
    );
  }
  if (primaryPriceStr === "0") {
    warnings.push("No se detectó el valor numérico automáticamente; verifica y completa el precio.");
  }

  const status: UrlImportStatus = primaryPriceStr !== "0" || areaTotalNum > 0 ? "ok" : "partial";

  return {
    status,
    success: true,
    sourceUrl: urlStr,
    portal,
    httpStatus,
    fallbackAction: status === "partial" ? "paste_text" : "none",
    message:
      status === "ok"
        ? `Datos extraídos desde ${portal} (sin copiar fotos ni contactos externos). Revisa los campos y sube tus fotos propias en el Paso 2.`
        : `Extracción parcial desde ${portal}. Completa los datos faltantes antes de pasar al Paso 2.`,
    warnings,
    data: {
      name: standardizedTitle,
      description: cleanDescription,
      propertyType: propTypeNorm.propertyType,
      propertyTypeExact: propTypeNorm.propertyTypeExact,
      subtype: propTypeNorm.subtype,
      isSubtipoComercial: propTypeNorm.isSubtipoComercial,
      transactionType: txType,
      price: primaryPriceStr,
      rentPrice: rentPriceStr,
      adminFee: adminFeeStr,
      currency: structured.currency || "COP",
      department,
      city,
      addressLocality: locality,
      zone: locality || neighborhood || city,
      addressNeighborhood: neighborhood,
      areaTotal: areaTotalNum > 0 ? String(areaTotalNum) : "",
      areaConstruida: areaTotalNum > 0 ? String(areaTotalNum) : "",
      areaPrivada: areaPrivateNum > 0 ? String(areaPrivateNum) : "",
      yearBuilt,
      bedrooms,
      bathrooms,
      garages,
      garajesCarro: garages,
      garajesMoto: 0,
      stratum,
      cocina: "Integral",
      estudios: colombianParsed.hasStudio ? 1 : 0,
      estarTv: 0,
      depositos: 0,
      piso: structured.floor || (colombianParsed.floor ? String(colombianParsed.floor) : ""),
      selectedInternas,
      selectedExternas,
      images: [], // CERO medios externos copiados
      videoUrl: null,
      republishToVecyStore: true,
      sourcePortal: portal,
      sourceUrl: urlStr,
      thirdPartyMediaStripped: true,
      thirdPartyMediaCount: totalThirdPartyMedia,
      rawImportPayload: {
        portal,
        sourcesUsed: structured.sourcesUsed,
        extractedAt: new Date().toISOString(),
        thirdPartyMediaStripped: true,
        thirdPartyMediaCount: totalThirdPartyMedia,
        originalTitleScrubbed: cleanTitleRaw.slice(0, 160),
      },
    },
  };
}

/**
 * Descarga de forma segura (SSRF-safe + validación manual de redirects) y extrae un inmueble desde URL.
 */
export async function importPropertyFromUrl(
  rawUrl: string,
  options: ImportPropertyFromUrlOptions = {},
): Promise<UrlImportResult> {
  const timeoutMs = options.timeoutMs ?? 12_000;
  const maxRedirects = options.maxRedirects ?? 3;
  const portalHint = detectSourcePortal(rawUrl);

  const defaultFetch: NonNullable<ImportPropertyFromUrlOptions["fetchHtml"]> = async (targetUrl, cfg) => {
    const res = await axios.get<string>(targetUrl, {
      timeout: timeoutMs,
      maxRedirects: 0,
      responseType: "text",
      validateStatus: () => true,
      maxContentLength: 4 * 1024 * 1024,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-CO,es;q=0.9,en;q=0.7",
        "Cache-Control": "no-cache",
      },
      ...cfg,
    });
    const normalizedHeaders: Record<string, string | string[] | undefined> = {};
    for (const [k, v] of Object.entries(res.headers || {})) {
      normalizedHeaders[k.toLowerCase()] = v as string | string[] | undefined;
    }
    return {
      status: res.status,
      headers: normalizedHeaders,
      body: typeof res.data === "string" ? res.data : JSON.stringify(res.data ?? ""),
    };
  };

  const fetcher = options.fetchHtml || defaultFetch;
  let currentUrl = rawUrl.trim();

  try {
    for (let hop = 0; hop <= maxRedirects; hop++) {
      const { url: safeUrl } = await validateAndAssertSafeUrl(currentUrl, {
        resolveHost: options.resolveHost,
      });

      const response = await fetcher(safeUrl.toString());

      // Validar redirecciones HTTP salto por salto contra SSRF
      if (response.status >= 300 && response.status < 400) {
        const rawLoc = response.headers["location"];
        const locStr = Array.isArray(rawLoc) ? rawLoc[0] : rawLoc;
        if (!locStr) {
          return {
            status: "network_error",
            success: false,
            sourceUrl: currentUrl,
            portal: detectSourcePortal(currentUrl),
            httpStatus: response.status,
            fallbackAction: "paste_text",
            message: "El enlace devolvió una redirección incompleta. Copia el texto de la ficha y pégalo manualmente.",
            warnings: [`HTTP ${response.status} sin cabecera Location.`],
            data: null,
          };
        }
        if (hop >= maxRedirects) {
          return {
            status: "network_error",
            success: false,
            sourceUrl: currentUrl,
            portal: detectSourcePortal(currentUrl),
            httpStatus: response.status,
            fallbackAction: "paste_text",
            message: "El enlace excedió el máximo de redirecciones permitidas. Pega el texto de la ficha manualmente.",
            warnings: ["Demasiadas redirecciones HTTP."],
            data: null,
          };
        }
        currentUrl = new URL(locStr, safeUrl).toString();
        continue;
      }

      return extractPropertyFromHtml(response.body, safeUrl.toString(), response.status);
    }

    return {
      status: "network_error",
      success: false,
      sourceUrl: rawUrl,
      portal: portalHint,
      fallbackAction: "paste_text",
      message: "No fue posible completar la descarga del enlace. Usa el modo de pegado de texto.",
      warnings: ["Límite de saltos alcanzado."],
      data: null,
    };
  } catch (err: any) {
    if (err instanceof SsrfValidationError) {
      return {
        status: err.code === "INVALID_URL" ? "invalid_url" : "ssrf_blocked",
        success: false,
        sourceUrl: rawUrl,
        portal: portalHint,
        fallbackAction: "paste_text",
        message: err.message,
        warnings: [err.message],
        data: null,
      };
    }

    return {
      status: "network_error",
      success: false,
      sourceUrl: currentUrl,
      portal: detectSourcePortal(currentUrl),
      fallbackAction: "paste_text",
      message: `No se pudo conectar con ${detectSourcePortal(currentUrl)} (${err?.message || "timeout"}). Pega el texto del inmueble en "Texto Libre / WhatsApp" para continuar.`,
      warnings: [err?.message || "Error de red"],
      data: null,
    };
  }
}
