export const MAILSUITE_COLOR_GREEN = "#10B981" as const;
export const MAILSUITE_COLOR_GRAY = "#9CA3AF" as const;
export const MAILSUITE_COLOR_RED = "#EF4444" as const;

export type MailsuiteVisualState =
  | "opened_read"
  | "sent_unread"
  | "queued"
  | "draft"
  | "error";

export type MailsuiteIconType =
  | "double_check_read"
  | "double_check_unread"
  | "clock"
  | "draft"
  | "error";

export interface MailsuiteStatusInput {
  status?: string | null;
  openCount?: number | null;
  clickCount?: number | null;
  firstOpenedAt?: string | Date | null;
  lastOpenedAt?: string | Date | null;
  sentAt?: string | Date | null;
  scheduledFor?: string | Date | null;
  errorMessage?: string | null;
}

export interface MailsuiteVisualResolution {
  state: MailsuiteVisualState;
  checkCount: 0 | 2;
  firstCheckColor: typeof MAILSUITE_COLOR_GREEN | null;
  secondCheckColor: typeof MAILSUITE_COLOR_GREEN | typeof MAILSUITE_COLOR_GRAY | null;
  iconType: MailsuiteIconType;
  iconColor:
    | typeof MAILSUITE_COLOR_GREEN
    | typeof MAILSUITE_COLOR_GRAY
    | typeof MAILSUITE_COLOR_RED;
  shortLabel: string;
  tooltipTitle: string;
  tooltipLines: string[];
  tooltipText: string;
  openCount: number;
  clickCount: number;
  firstOpenedBogota: string | null;
  lastOpenedBogota: string | null;
  sentAtBogota: string | null;
}

const bogotaPartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

/**
 * Formatea una marca temporal de forma determinista en zona horaria America/Bogota.
 * Ejemplo: "23/11/2026 09:04:12 AM (America/Bogota)"
 */
export function formatBogotaDateTime(value?: string | Date | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = bogotaPartsFormatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }

  const day = map.day || "01";
  const month = map.month || "01";
  const year = map.year || "2026";
  const hour = map.hour || "12";
  const minute = map.minute || "00";
  const second = map.second || "00";
  const period = (map.dayPeriod || "AM").toUpperCase();

  return `${day}/${month}/${year} ${hour}:${minute}:${second} ${period} (America/Bogota)`;
}

/**
 * Resuelve el estado visual tipo Mailsuite para un correo certificado:
 * - sent + openCount === 0 => sent_unread (chulito 1 verde #10B981 + chulito 2 gris #9CA3AF)
 * - sent + openCount >= 1  => opened_read (dos chulitos verdes #10B981)
 * - queued / draft / error => icono de reloj / borrador / error sin chulitos
 */
export function resolveMailsuiteVisualStatus(
  input: MailsuiteStatusInput,
): MailsuiteVisualResolution {
  const normalizedStatus = (input.status || "draft").trim().toLowerCase();
  const openCount = Math.max(0, Math.floor(Number(input.openCount ?? 0) || 0));
  const clickCount = Math.max(0, Math.floor(Number(input.clickCount ?? 0) || 0));

  const firstOpenedBogota = formatBogotaDateTime(input.firstOpenedAt);
  const lastOpenedBogota = formatBogotaDateTime(input.lastOpenedAt);
  const sentAtBogota = formatBogotaDateTime(input.sentAt);
  const scheduledBogota = formatBogotaDateTime(input.scheduledFor);

  if (
    normalizedStatus === "failed" ||
    normalizedStatus === "quota_blocked" ||
    normalizedStatus === "cancelled"
  ) {
    const shortLabel =
      normalizedStatus === "quota_blocked"
        ? "Cuota agotada"
        : normalizedStatus === "cancelled"
          ? "Cancelado"
          : "Error de envío";
    const detailLine =
      input.errorMessage?.trim() || "No se pudo completar la entrega del correo.";
    const tooltipLines = [shortLabel, detailLine];

    return {
      state: "error",
      checkCount: 0,
      firstCheckColor: null,
      secondCheckColor: null,
      iconType: "error",
      iconColor: MAILSUITE_COLOR_RED,
      shortLabel,
      tooltipTitle: shortLabel,
      tooltipLines,
      tooltipText: tooltipLines.join(" | "),
      openCount,
      clickCount,
      firstOpenedBogota,
      lastOpenedBogota,
      sentAtBogota,
    };
  }

  if (normalizedStatus === "queued") {
    const tooltipLines = [
      ...(scheduledBogota ? [`Programado: ${scheduledBogota}`] : []),
      "Pendiente de despacho automático.",
    ];
    return {
      state: "queued",
      checkCount: 0,
      firstCheckColor: null,
      secondCheckColor: null,
      iconType: "clock",
      iconColor: MAILSUITE_COLOR_GRAY,
      shortLabel: "En cola",
      tooltipTitle: "En cola · Programado",
      tooltipLines,
      tooltipText: tooltipLines.join(" | "),
      openCount,
      clickCount,
      firstOpenedBogota,
      lastOpenedBogota,
      sentAtBogota,
    };
  }

  if (normalizedStatus === "draft") {
    const tooltipLines = ["Borrador guardado, aún no enviado."];
    return {
      state: "draft",
      checkCount: 0,
      firstCheckColor: null,
      secondCheckColor: null,
      iconType: "draft",
      iconColor: MAILSUITE_COLOR_GRAY,
      shortLabel: "Borrador",
      tooltipTitle: "Borrador sin enviar",
      tooltipLines,
      tooltipText: tooltipLines.join(" | "),
      openCount,
      clickCount,
      firstOpenedBogota,
      lastOpenedBogota,
      sentAtBogota,
    };
  }

  if (normalizedStatus === "sent" && openCount >= 1) {
    const shortLabel = openCount > 1 ? `Leído (${openCount}x)` : "Leído";
    const tooltipTitle = "Correo leído / abierto";
    const tooltipLines = [
      `Leído ${openCount} ${openCount === 1 ? "vez" : "veces"} · ${clickCount} ${
        clickCount === 1 ? "clic" : "clics"
      } en enlaces`,
    ];
    if (firstOpenedBogota) {
      tooltipLines.push(`Primera apertura: ${firstOpenedBogota}`);
    }
    if (lastOpenedBogota) {
      tooltipLines.push(`Última apertura: ${lastOpenedBogota}`);
    }
    if (!firstOpenedBogota && !lastOpenedBogota && sentAtBogota) {
      tooltipLines.push(`Enviado: ${sentAtBogota}`);
    }

    return {
      state: "opened_read",
      checkCount: 2,
      firstCheckColor: MAILSUITE_COLOR_GREEN,
      secondCheckColor: MAILSUITE_COLOR_GREEN,
      iconType: "double_check_read",
      iconColor: MAILSUITE_COLOR_GREEN,
      shortLabel,
      tooltipTitle,
      tooltipLines,
      tooltipText: tooltipLines.join(" | "),
      openCount,
      clickCount,
      firstOpenedBogota,
      lastOpenedBogota,
      sentAtBogota,
    };
  }

  const tooltipLines = ["Enviado · Pendiente de lectura"];
  if (sentAtBogota) {
    tooltipLines.push(`Enviado: ${sentAtBogota}`);
  }
  tooltipLines.push(
    `0 aperturas · ${clickCount} ${clickCount === 1 ? "clic" : "clics"} en enlaces`,
  );

  return {
    state: "sent_unread",
    checkCount: 2,
    firstCheckColor: MAILSUITE_COLOR_GREEN,
    secondCheckColor: MAILSUITE_COLOR_GRAY,
    iconType: "double_check_unread",
    iconColor: MAILSUITE_COLOR_GREEN,
    shortLabel: "Enviado · Pendiente de lectura",
    tooltipTitle: "Enviado · Pendiente de lectura",
    tooltipLines,
    tooltipText: tooltipLines.join(" | "),
    openCount,
    clickCount,
    firstOpenedBogota,
    lastOpenedBogota,
    sentAtBogota,
  };
}
