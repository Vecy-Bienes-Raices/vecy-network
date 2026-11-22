export type CrmPipelineStage =
  | "nuevo"
  | "contactado"
  | "calificado"
  | "visita_agendada"
  | "negociacion"
  | "cerrado_ganado"
  | "perdido";

export type CrmLeadTemperature = "cold" | "warm" | "hot";

export type CrmActivityType =
  | "note"
  | "call"
  | "whatsapp"
  | "email"
  | "visit"
  | "stage_change"
  | "ai_summary"
  | "task"
  | "match_alert"
  | "lead_captured";

export type EmailAccountMode = "vecy_relay" | "custom_smtp";

export type EmailSequenceTrigger =
  | "lead_created"
  | "match_85_plus"
  | "visit_scheduled"
  | "manual";

export type EmailMessageStatus =
  | "draft"
  | "queued"
  | "sent"
  | "failed"
  | "quota_blocked"
  | "cancelled";

export interface EmailSequenceStep {
  stepOrder: number;
  delayHours: number;
  subjectTemplate: string;
  bodyHtmlTemplate: string;
  bodyTextTemplate?: string;
  useAiPersonalization?: boolean;
  aiGoal?: string;
}

export interface CrmStageMeta {
  id: CrmPipelineStage;
  label: string;
  shortLabel: string;
  colorHex: string;
  badgeClass: string;
  description: string;
}

export const CRM_PIPELINE_STAGES: CrmStageMeta[] = [
  {
    id: "nuevo",
    label: "Nuevo",
    shortLabel: "Nuevo",
    colorHex: "#38bdf8",
    badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    description: "Prospectos recién capturados desde micrositio, enlace sensor, agenda o creación directa.",
  },
  {
    id: "contactado",
    label: "Contactado",
    shortLabel: "Contactado",
    colorHex: "#818cf8",
    badgeClass: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    description: "Primer contacto enviado por correo, WhatsApp o llamada.",
  },
  {
    id: "calificado",
    label: "Calificado",
    shortLabel: "Calificado",
    colorHex: "#d4af37",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    description: "Presupuesto, zona y necesidad financiera confirmados.",
  },
  {
    id: "visita_agendada",
    label: "Visita Agendada",
    shortLabel: "Visita",
    colorHex: "#2dd4bf",
    badgeClass: "bg-teal-500/15 text-teal-300 border-teal-500/30",
    description: "Recorrido presencial o virtual confirmado.",
  },
  {
    id: "negociacion",
    label: "Negociación",
    shortLabel: "Negociación",
    colorHex: "#fb923c",
    badgeClass: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    description: "Propuesta económica, promesa de compraventa o estudio de contrato.",
  },
  {
    id: "cerrado_ganado",
    label: "Cerrado Ganado",
    shortLabel: "Ganado",
    colorHex: "#10b981",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    description: "Negocio cerrado y comisión asegurada.",
  },
  {
    id: "perdido",
    label: "Perdido",
    shortLabel: "Perdido",
    colorHex: "#f87171",
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    description: "Prospecto descartado o que desistió.",
  },
];

export const CRM_STAGE_LABELS: Record<CrmPipelineStage, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  calificado: "Calificado",
  visita_agendada: "Visita Agendada",
  negociacion: "Negociación",
  cerrado_ganado: "Cerrado Ganado",
  perdido: "Perdido",
};

export const CRM_TEMPERATURE_LABELS: Record<CrmLeadTemperature, string> = {
  cold: "Frío",
  warm: "Tibio",
  hot: "Caliente",
};

export const CRM_SOURCE_LABELS: Record<string, string> = {
  microsite: "Portal Marca Blanca",
  stealth_link: "Enlace Blindado",
  tracking_link: "Enlace Sensor",
  agenda: "Vecy Agenda",
  manual: "Registro Manual",
  janIA: "JanIA Chat",
  whatsapp: "WhatsApp",
  website: "Portal Web",
};

export const EMAIL_TEMPLATE_VARIABLES = [
  "{{lead_first_name}}",
  "{{lead_name}}",
  "{{lead_email}}",
  "{{lead_phone}}",
  "{{lead_city}}",
  "{{lead_zone}}",
  "{{lead_budget}}",
  "{{property_name}}",
  "{{property_price}}",
  "{{property_zone}}",
  "{{property_city}}",
  "{{match_score}}",
  "{{agent_name}}",
  "{{agency_name}}",
  "{{agent_phone}}",
  "{{agent_email}}",
];

const VALID_STAGE_SET = new Set<string>(CRM_PIPELINE_STAGES.map((s) => s.id));

export function isValidPipelineStage(stage: string): stage is CrmPipelineStage {
  return VALID_STAGE_SET.has(stage);
}

export function validatePipelineTransition(
  fromStage: string,
  toStage: string,
): { valid: boolean; reason?: string; isStageChange: boolean } {
  if (!isValidPipelineStage(fromStage)) {
    return { valid: false, reason: `Etapa de origen inválida: ${fromStage}`, isStageChange: false };
  }
  if (!isValidPipelineStage(toStage)) {
    return { valid: false, reason: `Etapa de destino inválida: ${toStage}`, isStageChange: false };
  }
  return {
    valid: true,
    isStageChange: fromStage !== toStage,
  };
}

export function mapPipelineStageToLeadStatus(
  stage: CrmPipelineStage,
): "new" | "contacted" | "qualified" | "converted" | "rejected" {
  switch (stage) {
    case "nuevo":
      return "new";
    case "contactado":
      return "contacted";
    case "calificado":
    case "visita_agendada":
    case "negociacion":
      return "qualified";
    case "cerrado_ganado":
      return "converted";
    case "perdido":
      return "rejected";
  }
}

export function mapLeadStatusToPipelineStage(status?: string | null): CrmPipelineStage {
  switch ((status || "").toLowerCase()) {
    case "contacted":
      return "contactado";
    case "qualified":
      return "calificado";
    case "converted":
      return "cerrado_ganado";
    case "rejected":
      return "perdido";
    case "new":
    default:
      return "nuevo";
  }
}
