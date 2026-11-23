import { and, desc, eq } from "drizzle-orm";
import { properties } from "../../drizzle/schema";
import { getDb } from "../db";

export const CANONICAL_SEO_ORIGIN = "https://vecygroup.com";

export interface SitemapRouteEntry {
  path: string;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: string;
  lastmod?: string;
}

export const CORE_SITEMAP_ROUTES: SitemapRouteEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/ofertas", changefreq: "daily", priority: "0.9" },
  { path: "/demandas", changefreq: "daily", priority: "0.9" },
  { path: "/planes", changefreq: "weekly", priority: "0.85" },
  { path: "/services", changefreq: "weekly", priority: "0.8" },
  { path: "/jania", changefreq: "weekly", priority: "0.8" },
  { path: "/red-colaboracion", changefreq: "weekly", priority: "0.7" },
  { path: "/historia", changefreq: "monthly", priority: "0.6" },
  { path: "/terminos-y-condiciones", changefreq: "monthly", priority: "0.5" },
  { path: "/politica-privacidad", changefreq: "monthly", priority: "0.5" },
];

export function escapeXml(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildRobotsTxt(origin: string = CANONICAL_SEO_ORIGIN): string {
  const cleanOrigin = (origin || CANONICAL_SEO_ORIGIN).trim().replace(/\/+$/, "");
  return [
    "# VECY BIENES RAÍCES — robots.txt",
    "User-agent: *",
    "Allow: /",
    "",
    "# Rutas privadas o administrativas",
    "Disallow: /admin",
    "Disallow: /admin/",
    "Disallow: /api/",
    "Disallow: /trpc/",
    "Disallow: /login",
    "",
    "# Mapa del sitio oficial para Google y motores de búsqueda",
    `Sitemap: ${cleanOrigin}/sitemap.xml`,
    "",
  ].join("\n");
}

export function buildSitemapXml(options?: {
  origin?: string;
  lastmod?: string;
  propertyEntries?: Array<{ id: number; updatedAt?: Date | string | null }>;
}): string {
  const cleanOrigin = (options?.origin || CANONICAL_SEO_ORIGIN).trim().replace(/\/+$/, "");
  const defaultLastmod = options?.lastmod || new Date().toISOString().slice(0, 10);

  const entries: SitemapRouteEntry[] = CORE_SITEMAP_ROUTES.map((r) => ({
    ...r,
    lastmod: r.lastmod || defaultLastmod,
  }));

  for (const prop of options?.propertyEntries || []) {
    if (!prop?.id || Number(prop.id) <= 0) continue;
    let lastmodStr = defaultLastmod;
    if (prop.updatedAt) {
      const parsed = prop.updatedAt instanceof Date ? prop.updatedAt : new Date(prop.updatedAt);
      if (!Number.isNaN(parsed.getTime())) {
        lastmodStr = parsed.toISOString().slice(0, 10);
      }
    }
    entries.push({
      path: `/property/${prop.id}`,
      changefreq: "weekly",
      priority: "0.75",
      lastmod: lastmodStr,
    });
  }

  const urlsXml = entries
    .map((entry) => {
      const normalizedPath = entry.path.startsWith("/") ? entry.path : `/${entry.path}`;
      const loc = `${cleanOrigin}${normalizedPath}`;
      return [
        "  <url>",
        `    <loc>${escapeXml(loc)}</loc>`,
        `    <lastmod>${escapeXml(entry.lastmod || defaultLastmod)}</lastmod>`,
        `    <changefreq>${escapeXml(entry.changefreq)}</changefreq>`,
        `    <priority>${escapeXml(entry.priority)}</priority>`,
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urlsXml,
    "</urlset>",
    "",
  ].join("\n");
}

export async function getDynamicSitemapXml(origin: string = CANONICAL_SEO_ORIGIN): Promise<string> {
  const fallbackXml = buildSitemapXml({ origin });
  try {
    const queryDb = async (): Promise<Array<{ id: number; updatedAt: Date | null }>> => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select({
          id: properties.id,
          updatedAt: properties.updatedAt,
        })
        .from(properties)
        .where(and(eq(properties.available, true), eq(properties.republishToVecyStore, true)))
        .orderBy(desc(properties.updatedAt), desc(properties.id))
        .limit(200);
      return rows;
    };

    const propertyEntries = await Promise.race([
      queryDb(),
      new Promise<Array<{ id: number; updatedAt: Date | null }>>((resolve) =>
        setTimeout(() => resolve([]), 1500),
      ),
    ]);

    return buildSitemapXml({
      origin,
      propertyEntries,
    });
  } catch {
    return fallbackXml;
  }
}

export interface VercelConfigRule {
  source: string;
  destination: string;
  statusCode?: number;
  has?: Array<{ type: string; value: string }>;
}

export function evaluateVercelRedirectRule(
  vercelConfig: { redirects?: VercelConfigRule[]; rewrites?: VercelConfigRule[] },
  host: string,
  pathname: string,
): { action: "redirect"; statusCode: number; destination: string } | { action: "rewrite"; destination: string } {
  const cleanHost = String(host || "").trim().toLowerCase();
  const cleanPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const pathWithoutLeadingSlash = cleanPath.replace(/^\/+/, "");

  for (const rule of vercelConfig.redirects || []) {
    const hostMatched =
      !rule.has ||
      rule.has.length === 0 ||
      rule.has.every((cond) => cond.type === "host" && cond.value.toLowerCase() === cleanHost);

    if (!hostMatched) continue;

    // Soporta patrón Vercel "/:path((?!api(?:/|$)|uploads(?:/|$)).*)"
    const isApiOrUploads =
      cleanPath === "/api" ||
      cleanPath.startsWith("/api/") ||
      cleanPath === "/uploads" ||
      cleanPath.startsWith("/uploads/");

    if (rule.source.includes("(?!api") && isApiOrUploads) {
      continue;
    }

    const destination = rule.destination.replace(":path*", pathWithoutLeadingSlash);
    return {
      action: "redirect",
      statusCode: rule.statusCode || 308,
      destination,
    };
  }

  for (const rw of vercelConfig.rewrites || []) {
    if (rw.source.startsWith("/api/") && (cleanPath === "/api" || cleanPath.startsWith("/api/"))) {
      return {
        action: "rewrite",
        destination: rw.destination.replace(":path*", cleanPath.replace(/^\/api\/?/, "")),
      };
    }
    if (rw.source.startsWith("/uploads/") && (cleanPath === "/uploads" || cleanPath.startsWith("/uploads/"))) {
      return {
        action: "rewrite",
        destination: rw.destination.replace(":path*", cleanPath.replace(/^\/uploads\/?/, "")),
      };
    }
  }

  return { action: "rewrite", destination: "/index.html" };
}
