/**
 * VECY NETWORK — OPENGRAPH DINÁMICO PARA WHATSAPP, REDES Y PORTALES MARCA BLANCA (v34.37)
 */
import { eq, or } from "drizzle-orm";
import { agencies, properties, users } from "../../drizzle/schema";
import { extractTenantSlugFromHost, isCustomWhiteLabelHost, normalizeHostname } from "../../shared/whitelabel";
import { getDb } from "../db";

export interface OpenGraphMeta {
  title: string;
  description: string;
  siteName: string;
  url: string;
  image: string;
  imageAlt: string;
  themeColor?: string;
}

export function escapeHtmlAttr(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function toAbsoluteMediaUrl(rawUrl: string | null | undefined, origin: string): string {
  const clean = (rawUrl || "").trim();
  if (!clean) return `${origin}/portada-metadatos.jpeg`;
  if (clean.startsWith("http://") || clean.startsWith("https://")) return clean;
  if (clean.startsWith("/")) return `${origin}${clean}`;
  return `${origin}/${clean}`;
}

function replaceMetaTag(html: string, pattern: RegExp, replacement: string): string {
  return pattern.test(html) ? html.replace(pattern, replacement) : html;
}

/**
 * Inyecta dinámicamente título, descripción, OpenGraph y Twitter Card en el HTML servido.
 */
export function injectOpenGraphMeta(html: string, meta: OpenGraphMeta): string {
  const safeTitle = escapeHtmlAttr(meta.title);
  const safeDesc = escapeHtmlAttr(meta.description);
  const safeSite = escapeHtmlAttr(meta.siteName);
  const safeUrl = escapeHtmlAttr(meta.url);
  const safeImg = escapeHtmlAttr(meta.image);
  const safeImgAlt = escapeHtmlAttr(meta.imageAlt || meta.title);

  let out = html;
  out = replaceMetaTag(out, /<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);
  out = replaceMetaTag(
    out,
    /<meta\s+name=["']description["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta name="description" content="${safeDesc}" />`,
  );
  out = replaceMetaTag(
    out,
    /<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?>/i,
    `<link rel="canonical" href="${safeUrl}" />`,
  );
  out = replaceMetaTag(
    out,
    /<meta\s+property=["']og:url["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta property="og:url" content="${safeUrl}" />`,
  );
  out = replaceMetaTag(
    out,
    /<meta\s+property=["']og:site_name["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta property="og:site_name" content="${safeSite}" />`,
  );
  out = replaceMetaTag(
    out,
    /<meta\s+property=["']og:title["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta property="og:title" content="${safeTitle}" />`,
  );
  out = replaceMetaTag(
    out,
    /<meta\s+property=["']og:description["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta property="og:description" content="${safeDesc}" />`,
  );
  out = replaceMetaTag(
    out,
    /<meta\s+property=["']og:image["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta property="og:image" content="${safeImg}" />`,
  );
  out = replaceMetaTag(
    out,
    /<meta\s+property=["']og:image:secure_url["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta property="og:image:secure_url" content="${safeImg}" />`,
  );
  out = replaceMetaTag(
    out,
    /<meta\s+property=["']og:image:alt["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta property="og:image:alt" content="${safeImgAlt}" />`,
  );
  out = replaceMetaTag(
    out,
    /<meta\s+name=["']twitter:url["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta name="twitter:url" content="${safeUrl}" />`,
  );
  out = replaceMetaTag(
    out,
    /<meta\s+name=["']twitter:title["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta name="twitter:title" content="${safeTitle}" />`,
  );
  out = replaceMetaTag(
    out,
    /<meta\s+name=["']twitter:description["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta name="twitter:description" content="${safeDesc}" />`,
  );
  out = replaceMetaTag(
    out,
    /<meta\s+name=["']twitter:image["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta name="twitter:image" content="${safeImg}" />`,
  );

  if (meta.themeColor && /^#[0-9a-fA-F]{3,8}$/.test(meta.themeColor)) {
    const safeColor = escapeHtmlAttr(meta.themeColor);
    if (/<meta\s+name=["']theme-color["']/i.test(out)) {
      out = out.replace(
        /<meta\s+name=["']theme-color["']\s+content=["'][^"']*["']\s*\/?>/i,
        `<meta name="theme-color" content="${safeColor}" />`,
      );
    } else {
      out = out.replace("</head>", `  <meta name="theme-color" content="${safeColor}" />\n  </head>`);
    }
  }

  return out;
}

async function resolveAgencyOrAgentMetaBySlugOrHost(
  slug: string | null,
  customHost: string | null,
  origin: string,
  fullUrl: string,
): Promise<OpenGraphMeta | null> {
  const db = await getDb();
  if (!db) return null;

  const cleanSlug = (slug || "").toLowerCase().trim();
  const numericId = cleanSlug && !isNaN(Number(cleanSlug)) ? Number(cleanSlug) : null;

  let agencyRow: typeof agencies.$inferSelect | undefined;
  if (customHost) {
    const rows = await db.select().from(agencies).where(eq(agencies.customDomain, customHost)).limit(1);
    agencyRow = rows[0];
  }
  if (!agencyRow && cleanSlug) {
    const rows = await db.select().from(agencies).where(eq(agencies.slug, cleanSlug)).limit(1);
    agencyRow = rows[0];
  }

  let userRow:
    | {
        id: number;
        name: string | null;
        customLogoUrl: string | null;
        themeConfig: unknown;
        subdomain: string | null;
      }
    | undefined;

  if (agencyRow) {
    const uRows = await db
      .select({
        id: users.id,
        name: users.name,
        customLogoUrl: users.customLogoUrl,
        themeConfig: users.themeConfig,
        subdomain: users.subdomain,
      })
      .from(users)
      .where(eq(users.id, agencyRow.ownerUserId))
      .limit(1);
    userRow = uRows[0];
  } else if (cleanSlug) {
    const uRows = await db
      .select({
        id: users.id,
        name: users.name,
        customLogoUrl: users.customLogoUrl,
        themeConfig: users.themeConfig,
        subdomain: users.subdomain,
      })
      .from(users)
      .where(numericId ? or(eq(users.subdomain, cleanSlug), eq(users.id, numericId)) : eq(users.subdomain, cleanSlug))
      .limit(1);
    userRow = uRows[0];
  }

  if (!agencyRow && !userRow) {
    if (cleanSlug) {
      const pretty = cleanSlug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      return {
        title: `${pretty} | Portal Inmobiliario Marca Blanca`,
        description: `Explora el portafolio verificado de ${pretty}. Fichas técnicas con marca blanca y agenda digital segura.`,
        siteName: pretty,
        url: fullUrl,
        image: `${origin}/portada-metadatos.jpeg`,
        imageAlt: pretty,
        themeColor: "#D4AF37",
      };
    }
    return null;
  }

  const theme = (userRow?.themeConfig as Record<string, any>) || (agencyRow?.themeConfig as Record<string, any>) || {};
  const brandName = agencyRow?.brandName || theme.agencyName || userRow?.name || "Portal Inmobiliario";
  const tagline =
    agencyRow?.tagline ||
    theme.slogan ||
    "Portafolio Inmobiliario Certificado • Fichas técnicas y agenda en línea.";
  const logoOrCover = agencyRow?.logoUrl || userRow?.customLogoUrl || `${origin}/portada-metadatos.jpeg`;
  const primaryColor = agencyRow?.primaryColor || theme.primaryColor || "#D4AF37";

  return {
    title: `${brandName} | Portafolio Inmobiliario`,
    description: tagline,
    siteName: brandName,
    url: fullUrl,
    image: toAbsoluteMediaUrl(logoOrCover, origin),
    imageAlt: brandName,
    themeColor: primaryColor,
  };
}

export async function resolveOpenGraphMeta(params: {
  host?: string | null;
  pathname: string;
  search?: string;
  protocol?: string;
}): Promise<OpenGraphMeta> {
  const host = normalizeHostname(params.host) || "vecygroup.com";
  const proto = params.protocol === "http" ? "http" : "https";
  const origin = `${proto}://${host}`;
  const cleanPath = (params.pathname || "/").split("?")[0];
  const fullUrl = `${origin}${cleanPath}`;
  const searchParams = new URLSearchParams(params.search || "");
  const isNeutralMode =
    searchParams.get("mode") === "neutral" || searchParams.get("mode") === "stealth";

  const defaultMeta: OpenGraphMeta = {
    title: "Vecy Bienes Raíces | Primer Portal Inmobiliario con IA en Colombia",
    description:
      "VECY BIENES RAÍCES: Motor de Match con IA activo 24/7 que cruza ofertas con demandas al instante, red colaborativa 40/20/40 y portales marca blanca.",
    siteName: "VECY BIENES RAÍCES",
    url: fullUrl,
    image: `${origin}/portada-metadatos.jpeg`,
    imageAlt: "VECY BIENES RAÍCES — Portal Inmobiliario con IA en Colombia",
    themeColor: "#D4AF37",
  };

  try {
    const dbResolve = async (): Promise<OpenGraphMeta | null> => {
      // 1. Subdominio *.vecygroup.com o dominio personalizado
      const hostSlug = extractTenantSlugFromHost(host);
      const customHost = isCustomWhiteLabelHost(host) ? host : null;
      if ((hostSlug || customHost) && !cleanPath.startsWith("/property/") && !cleanPath.startsWith("/ficha/")) {
        const tenantMeta = await resolveAgencyOrAgentMetaBySlugOrHost(hostSlug, customHost, origin, fullUrl);
        if (tenantMeta) return tenantMeta;
      }

      // 2. Ruta explícita /s/:slug o /agencia/:slug
      const storeMatch = cleanPath.match(/^\/(?:s|agencia)\/([^/]+)\/?$/i);
      if (storeMatch) {
        const tenantMeta = await resolveAgencyOrAgentMetaBySlugOrHost(storeMatch[1], null, origin, fullUrl);
        if (tenantMeta) return tenantMeta;
      }

      // 3. Ficha o detalle de inmueble (/property/:id o /ficha/:id)
      const propMatch = cleanPath.match(/^\/(?:property|ficha)\/(\d+)\/?$/i);
      if (propMatch) {
        const propId = Number(propMatch[1]);
        const db = await getDb();
        if (db && propId > 0) {
          const [prop] = await db.select().from(properties).where(eq(properties.id, propId)).limit(1);
          if (prop) {
            const imgs = Array.isArray(prop.images) ? (prop.images as string[]) : [];
            const firstImg = imgs.find((u) => typeof u === "string" && u.trim().length > 0);
            const priceFormatted =
              Number(prop.price || 0) > 0
                ? `$${Number(prop.price).toLocaleString("es-CO")} COP`
                : "Precio a consultar";
            const sector = [prop.addressNeighborhood || prop.zone, prop.addressCity || prop.city]
              .filter(Boolean)
              .join(", ");
            const specs = [
              prop.areaTotal ? `${prop.areaTotal} m²` : "",
              prop.bedrooms ? `${prop.bedrooms} hab` : "",
              prop.bathrooms ? `${prop.bathrooms} baños` : "",
            ]
              .filter(Boolean)
              .join(" · ");
            const brandSuffix = isNeutralMode ? "" : " | VECY BIENES RAÍCES";
            return {
              title: `${prop.name} · ${priceFormatted}${brandSuffix}`,
              description: `${sector}${specs ? ` · ${specs}` : ""}. ${String(prop.description || "").slice(0, 140)}`.trim(),
              siteName: isNeutralMode ? "Portafolio Inmobiliario" : "VECY BIENES RAÍCES",
              url: fullUrl,
              image: toAbsoluteMediaUrl(firstImg, origin),
              imageAlt: prop.name,
              themeColor: "#D4AF37",
            };
          }
        }
      }

      // 4. Rutas principales del marketplace
      if (cleanPath === "/ofertas" || cleanPath === "/properties") {
        return {
          ...defaultMeta,
          title: "VECY TIENDA — Ofertas Inmobiliarias Auditadas | VECY",
          description:
            "Explora inmuebles auditados con fotos reales en toda Colombia. Venta, arriendo, permuta y colaboración 40/20/40.",
        };
      }
      if (cleanPath === "/demandas" || cleanPath === "/requerimientos") {
        return {
          ...defaultMeta,
          title: "Tienda de Requerimientos — Demandas Activas | VECY",
          description:
            "Postula tus inmuebles a compradores y arrendatarios calificados con protección antielusión y firma digital Ley 527.",
        };
      }
      if (cleanPath === "/planes" || cleanPath === "/pricing") {
        return {
          ...defaultMeta,
          title: "Planes SaaS VECY Network — Desde $0 hasta $189.900 COP/mes",
          description:
            "Escala tu inmobiliaria con importador inteligente por URL, portal marca blanca *.vecygroup.com y JanIA privada 24/7.",
        };
      }

      return null;
    };

    const resolved = await Promise.race([
      dbResolve(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
    ]);

    return resolved || defaultMeta;
  } catch {
    return defaultMeta;
  }
}

