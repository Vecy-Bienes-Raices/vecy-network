/**
 * Helpers isomórficos para detección de portales marca blanca por subdominio (*.vecygroup.com)
 * o dominio personalizado en backend (Express) y frontend (React/Wouter).
 */

export const VECY_PRIMARY_DOMAIN = "vecygroup.com";

export const RESERVED_SUBDOMAINS = new Set([
  "www",
  "api",
  "admin",
  "app",
  "mail",
  "cdn",
  "static",
  "ws",
  "staging",
  "dev",
  "blog",
  "docs",
]);

const PLATFORM_MAIN_HOSTS = new Set([
  "vecygroup.com",
  "www.vecygroup.com",
  "vecy.co",
  "www.vecy.co",
  "vecy-bienes-raices.vercel.app",
  "vecy-network.vercel.app",
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
]);

export function normalizeHostname(host: string | null | undefined): string {
  if (!host || typeof host !== "string") return "";
  const firstHost = host.split(",")[0].trim().toLowerCase();
  if (firstHost.startsWith("[")) {
    const endIdx = firstHost.indexOf("]");
    return endIdx > 0 ? firstHost.slice(0, endIdx + 1) : firstHost;
  }
  return firstHost.replace(/:\d+$/, "").replace(/\.$/, "");
}

function isIpLiteral(hostname: string): boolean {
  if (!hostname) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true;
  if (hostname.startsWith("[") || hostname.includes(":")) return true;
  return false;
}

/**
 * Extrae el slug de subdominio si el hostname pertenece a <slug>.vecygroup.com o <slug>.vecy.co
 * y no es un subdominio reservado del sistema.
 */
export function extractTenantSlugFromHost(host: string | null | undefined): string | null {
  const hostname = normalizeHostname(host);
  if (!hostname) return null;

  for (const baseDomain of [VECY_PRIMARY_DOMAIN, "vecy.co"]) {
    const suffix = `.${baseDomain}`;
    if (hostname.endsWith(suffix)) {
      const prefix = hostname.slice(0, -suffix.length);
      if (!prefix || prefix.includes(".")) return null;
      if (!/^[a-z0-9-]+$/.test(prefix)) return null;
      if (RESERVED_SUBDOMAINS.has(prefix)) return null;
      return prefix;
    }
  }

  return null;
}

/**
 * Indica si el hostname es un dominio propio/marca blanca externo distinto de los dominios principales de VECY.
 */
export function isCustomWhiteLabelHost(host: string | null | undefined): boolean {
  const hostname = normalizeHostname(host);
  if (!hostname || isIpLiteral(hostname)) return false;
  if (PLATFORM_MAIN_HOSTS.has(hostname)) return false;
  if (hostname === VECY_PRIMARY_DOMAIN || hostname.endsWith(`.${VECY_PRIMARY_DOMAIN}`)) return false;
  if (hostname === "vecy.co" || hostname.endsWith(".vecy.co")) return false;
  if (hostname.endsWith(".vercel.app") || hostname.endsWith(".localhost")) return false;
  return hostname.includes(".");
}
