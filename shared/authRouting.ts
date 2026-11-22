export const ADMIN_EMAILS_LIST = [
  "vecybienesraices@gmail.com",
  "edduinnova@gmail.com",
  "edduainnova@gmail.com",
  "jani79alves@gmail.com",
  "eduardoariveram@gmail.com",
  "eddu.mendoza@gmail.com",
  "mejorpontealdia@gmail.com",
];

export function resolvePostLoginDestination(params: {
  userEmail: string;
  userRole?: string;
  redirectQuery?: string;
  savedReturn?: string;
}): string {
  const targetRedirect = params.redirectQuery || params.savedReturn || "";
  if (
    targetRedirect &&
    targetRedirect.startsWith("/") &&
    !targetRedirect.startsWith("/login")
  ) {
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

