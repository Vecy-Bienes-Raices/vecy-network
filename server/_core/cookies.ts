import type { CookieOptions, Request } from "express";
import { normalizeHostname, VECY_PRIMARY_DOMAIN } from "../../shared/whitelabel";
import { ENV } from "./env";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  if (!host) return false;
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

export function getRequestHostname(req: Request): string {
  const forwardedHost = req.headers?.["x-forwarded-host"];
  const rawForwarded = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
  const hostHeader = typeof req.headers?.host === "string" ? req.headers.host : "";
  return normalizeHostname(rawForwarded || hostHeader || req.hostname || "");
}

export function isSecureRequest(req: Request): boolean {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers?.["x-forwarded-proto"];
  if (forwardedProto) {
    const protoList = Array.isArray(forwardedProto)
      ? forwardedProto
      : forwardedProto.split(",");
    if (protoList.some(proto => proto.trim().toLowerCase() === "https")) {
      return true;
    }
  }

  const cfVisitor = req.headers?.["cf-visitor"];
  if (typeof cfVisitor === "string" && /"scheme"\s*:\s*"https"/i.test(cfVisitor)) {
    return true;
  }

  return false;
}

export function resolveCookieDomain(req: Request): string | undefined {
  const hostname = getRequestHostname(req);
  if (!hostname || LOCAL_HOSTS.has(hostname) || isIpAddress(hostname) || hostname.endsWith(".localhost")) {
    return undefined;
  }

  const rootDomain = normalizeHostname(ENV.rootDomain) || VECY_PRIMARY_DOMAIN;
  if (rootDomain && (hostname === rootDomain || hostname.endsWith(`.${rootDomain}`))) {
    return `.${rootDomain}`;
  }

  return undefined;
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const hostname = getRequestHostname(req);
  const isLocal = !hostname || LOCAL_HOSTS.has(hostname) || isIpAddress(hostname) || hostname.endsWith(".localhost");
  const domain = resolveCookieDomain(req);
  const isProd = process.env.NODE_ENV === "production";

  return {
    ...(domain ? { domain } : {}),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isProd && !isLocal ? true : isSecureRequest(req),
  };
}
