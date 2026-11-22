export const ADMIN_EMAILS_LIST = [
  "vecybienesraices@gmail.com",
  "edduinnova@gmail.com",
  "edduainnova@gmail.com",
  "jani79alves@gmail.com",
  "eduardoariveram@gmail.com",
  "eddu.mendoza@gmail.com",
  "mejorpontealdia@gmail.com",
];

/**
 * Sanitiza un destino de redirección post-login para garantizar navegación
 * estrictamente interna (mismo origen) y evitar saltos hacia dominios antiguos.
 */
export function sanitizeInternalRedirectPath(
  rawPath?: string | null,
  currentOrigin?: string,
): string | null {
  const trimmed = (rawPath || "").trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return null;
    if (trimmed === "/login" || trimmed.startsWith("/login?") || trimmed.startsWith("/login/")) {
      return null;
    }
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed) && currentOrigin) {
    try {
      const parsed = new URL(trimmed);
      const base = new URL(currentOrigin);
      if (parsed.origin !== base.origin) {
        return null;
      }
      const relative = `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
      if (relative === "/login" || relative.startsWith("/login?") || relative.startsWith("/login/")) {
        return null;
      }
      return relative;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Valida que una URL de retorno pertenezca estrictamente al origen actual.
 */
export function isSameOriginUrl(
  rawUrl: string | null | undefined,
  currentOrigin: string,
): boolean {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/")) {
    return !trimmed.startsWith("//") && !trimmed.startsWith("/\\");
  }
  try {
    const parsed = new URL(trimmed);
    const base = new URL(currentOrigin);
    return parsed.origin === base.origin;
  } catch {
    return false;
  }
}

/**
 * Construye la ruta relativa de login preservando un redirect interno válido.
 */
export function buildLoginPath(redirectPath?: string | null, currentOrigin?: string): string {
  const safeRedirect = sanitizeInternalRedirectPath(redirectPath, currentOrigin);
  return safeRedirect ? `/login?redirect=${encodeURIComponent(safeRedirect)}` : "/login";
}

/**
 * Construye la URL absoluta de callback OAuth sobre el origen actual (sin query string
 * para coincidir con reglas exactas o wildcard en Supabase Auth).
 */
export function buildAuthCallbackUrl(origin: string): string {
  const cleanOrigin = (origin || "").trim().replace(/\/+$/, "");
  return cleanOrigin ? `${cleanOrigin}/login` : "/login";
}

export function resolvePostLoginDestination(params: {
  userEmail: string;
  userRole?: string;
  redirectQuery?: string;
  savedReturn?: string;
  currentOrigin?: string;
}): string {
  const safeQuery = sanitizeInternalRedirectPath(params.redirectQuery, params.currentOrigin);
  const safeSaved = sanitizeInternalRedirectPath(params.savedReturn, params.currentOrigin);
  const targetRedirect = safeQuery || safeSaved || "";
  if (targetRedirect) {
    return targetRedirect;
  }
  const emailLower = (params.userEmail || "").toLowerCase();
  if (ADMIN_EMAILS_LIST.includes(emailLower) || params.userRole === "admin") {
    return "/admin";
  }
  if (params.userRole === "agent") {
    return "/agent-dashboard";
  }
  return "/jania";
}

