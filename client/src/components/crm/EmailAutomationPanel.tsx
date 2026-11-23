import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Mail,
  Server,
  ShieldCheck,
  Sparkles,
  Play,
  Pause,
  Send,
  FileCode2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  FileDown,
  Bell,
  Search,
  UserCheck,
  Settings2,
} from "lucide-react";
import { EMAIL_TEMPLATE_VARIABLES } from "@shared/crm";
import {
  formatBogotaDateTime,
  resolveMailsuiteVisualStatus,
} from "@shared/mailsuiteStatus";
import MailsuiteCheckIndicator from "./MailsuiteCheckIndicator";

function downloadBase64Pdf(base64Data: string, filename: string) {
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildHtmlEmailFromPlainText(rawText: string): string {
  const escapeSegment = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(
        /https?:\/\/[^\s<>"']+/gi,
        (url) =>
          `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`,
      );

  return rawText
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeSegment(paragraph).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

function syncValidationAria(
  input: HTMLInputElement | HTMLTextAreaElement,
  interacted: boolean,
) {
  const errorId = input.dataset.error;
  const isValid = input.validity.valid;
  const showError = interacted && !isValid;

  input.setAttribute("aria-invalid", showError ? "true" : "false");
  input.classList.toggle("user-invalid-fallback", showError);

  if (errorId) {
    const existing = (input.getAttribute("aria-describedby") || "")
      .split(/\s+/)
      .filter((id) => id && id !== errorId);
    if (showError) existing.push(errorId);
    if (existing.length > 0) {
      input.setAttribute("aria-describedby", existing.join(" "));
    } else {
      input.removeAttribute("aria-describedby");
    }
  }
}

export default function EmailAutomationPanel() {
  const composeTabId = useId();
  const configTabId = useId();
  const toHintId = useId();
  const toErrorId = useId();
  const subjectErrorId = useId();
  const bodyErrorId = useId();

  const [mainTab, setMainTab] = useState<"compose_sent" | "config_automation">(
    "compose_sent",
  );
  const [configSubTab, setConfigSubTab] = useState<
    "identity" | "sequences" | "templates" | "queue"
  >("identity");

  // Estado del redactor webmail simple
  const [composeLeadId, setComposeLeadId] = useState<number>(0);
  const [composeRecipientName, setComposeRecipientName] = useState("");
  const [composeToEmail, setComposeToEmail] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBodyText, setComposeBodyText] = useState("");
  const [composeNotifyOnOpen, setComposeNotifyOnOpen] = useState(true);
  const [composeAiGenerated, setComposeAiGenerated] = useState(false);
  const [composeAiIntent, setComposeAiIntent] = useState<
    | "welcome"
    | "followup_24h"
    | "followup_72h"
    | "match_alert"
    | "visit_confirmation"
    | "reply"
  >("welcome");
  const [composeAiTone, setComposeAiTone] = useState<
    "profesional" | "cercano" | "ejecutivo" | "persuasivo"
  >("profesional");
  const [composeAiInstructions, setComposeAiInstructions] = useState("");

  // Filtros de bandeja de enviados
  const [sentFilter, setSentFilter] = useState<
    "all" | "sent" | "opened" | "unread" | "queued" | "error"
  >("all");
  const [sentSearch, setSentSearch] = useState("");

  // Estado de configuración técnica (pestaña secundaria)
  const [mode, setMode] = useState<"vecy_relay" | "custom_smtp">("vecy_relay");
  const [displayName, setDisplayName] = useState("");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [signatureHtml, setSignatureHtml] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");

  const [enrollSeqId, setEnrollSeqId] = useState<number>(0);
  const [enrollLeadId, setEnrollLeadId] = useState<number>(0);

  const [msgStatusFilter, setMsgStatusFilter] = useState<
    "all" | "sent" | "queued" | "failed" | "quota_blocked"
  >("all");

  const [tplName, setTplName] = useState("");
  const [tplCategory, setTplCategory] = useState<
    "welcome" | "follow_up" | "match_alert" | "visit" | "custom"
  >("follow_up");
  const [tplSubject, setTplSubject] = useState("");
  const [tplBody, setTplBody] = useState("");
  const [liveOpenAlerts, setLiveOpenAlerts] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const prevTrackSnapshotRef = useRef<
    Map<number, { opens: number; clicks: number }>
  >(new Map());
  const snapshotInitializedRef = useRef(false);

  const { data: overview, refetch: refetchOverview } =
    trpc.emailAutomation.getOverview.useQuery(undefined, {
      refetchInterval: liveOpenAlerts ? 30_000 : false,
    });
  const { data: sequences, refetch: refetchSequences } =
    trpc.emailAutomation.listSequences.useQuery();
  const { data: templates, refetch: refetchTemplates } =
    trpc.emailAutomation.listTemplates.useQuery();

  const backendListStatus =
    mainTab === "compose_sent"
      ? sentFilter === "opened" || sentFilter === "unread" || sentFilter === "sent"
        ? "sent"
        : sentFilter === "queued"
          ? "queued"
          : "all"
      : msgStatusFilter;

  const {
    data: messages,
    refetch: refetchMessages,
    isFetching: fetchingMessages,
  } = trpc.emailAutomation.listMessages.useQuery(
    {
      status: backendListStatus,
      limit: 120,
    },
    { refetchInterval: liveOpenAlerts ? 30_000 : false },
  );
  const { data: enrollments, refetch: refetchEnrollments } =
    trpc.emailAutomation.listEnrollments.useQuery();
  const { data: myLeads } = trpc.crm.listLeads.useQuery({ limit: 100 });

  useEffect(() => {
    const trackedList = overview?.recentTrackingActivity;
    if (!trackedList) return;
    if (!snapshotInitializedRef.current) {
      for (const item of trackedList) {
        prevTrackSnapshotRef.current.set(item.id, {
          opens: Number(item.openCount ?? 0),
          clicks: Number(item.clickCount ?? 0),
        });
      }
      snapshotInitializedRef.current = true;
      return;
    }
    if (!liveOpenAlerts) return;
    for (const item of trackedList) {
      const prev = prevTrackSnapshotRef.current.get(item.id) || {
        opens: 0,
        clicks: 0,
      };
      const curOpens = Number(item.openCount ?? 0);
      const curClicks = Number(item.clickCount ?? 0);
      if (curOpens > prev.opens) {
        toast.info(`✓✓ ${item.toEmail} leyó tu correo certificado`, {
          description: item.subject,
        });
      } else if (curClicks > prev.clicks) {
        toast.info(`🔗 ${item.toEmail} hizo clic en tu correo`, {
          description: item.subject,
        });
      }
      prevTrackSnapshotRef.current.set(item.id, {
        opens: curOpens,
        clicks: curClicks,
      });
    }
  }, [overview?.recentTrackingActivity, liveOpenAlerts]);

  useEffect(() => {
    if (!overview) return;
    const acc = overview.account;
    if (acc) {
      setMode((acc.mode as "vecy_relay" | "custom_smtp") || "vecy_relay");
      setDisplayName(acc.displayName || overview.defaultDisplayName || "");
      setReplyToEmail(acc.replyToEmail || overview.defaultReplyTo || "");
      setFromEmail(acc.fromEmail || "");
      setSignatureHtml(acc.signatureHtml || "");
      setSmtpHost(acc.smtpHost || "");
      setSmtpPort(acc.smtpPort || 587);
      setSmtpSecure(Boolean(acc.smtpSecure));
      setSmtpUser(acc.smtpUser || "");
    } else {
      setDisplayName(overview.defaultDisplayName || "");
      setReplyToEmail(overview.defaultReplyTo || "");
    }
  }, [overview]);

  const deliverableLeads = useMemo(() => {
    return (myLeads ?? []).filter(
      (l: any) => l.email && !String(l.email).endsWith("@vecy.local"),
    );
  }, [myLeads]);

  const filteredComposeMessages = useMemo(() => {
    const query = sentSearch.trim().toLowerCase();
    return (messages ?? []).filter((row: any) => {
      const m = row.message;
      const visual = resolveMailsuiteVisualStatus({
        status: m.status,
        openCount: m.openCount,
        clickCount: m.clickCount,
        firstOpenedAt: m.firstOpenedAt,
        lastOpenedAt: m.lastOpenedAt,
        sentAt: m.sentAt,
        scheduledFor: m.scheduledFor,
        errorMessage: m.errorMessage,
      });

      if (sentFilter === "opened" && visual.state !== "opened_read") return false;
      if (sentFilter === "unread" && visual.state !== "sent_unread") return false;
      if (sentFilter === "sent" && m.status !== "sent") return false;
      if (sentFilter === "queued" && visual.state !== "queued") return false;
      if (sentFilter === "error" && visual.state !== "error") return false;

      if (query) {
        const haystack = [
          m.toEmail,
          m.subject,
          row.leadName,
          m.certificateCode,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [messages, sentFilter, sentSearch]);

  const generateDraftMutation = trpc.emailAutomation.generateAiDraft.useMutation({
    onSuccess: (draft) => {
      setComposeSubject(draft.subject);
      setComposeBodyText(draft.bodyText);
      setComposeAiGenerated(true);
      toast.success("Borrador redactado con JanIA");
    },
    onError: (err) =>
      toast.error("Error generando borrador IA", { description: err.message }),
  });

  const sendEmailMutation = trpc.emailAutomation.sendEmail.useMutation({
    onSuccess: () => {
      toast.success("Correo certificado enviado", {
        description:
          "Ya aparece en tu bandeja con sello SHA-256 y seguimiento ✓✓ tipo Mailsuite.",
      });
      setComposeSubject("");
      setComposeBodyText("");
      setComposeAiGenerated(false);
      setComposeAiInstructions("");
      refetchMessages();
      refetchOverview();
    },
    onError: (err) =>
      toast.error("No se pudo enviar el correo", { description: err.message }),
  });

  const upsertAccountMutation = trpc.emailAutomation.upsertAccount.useMutation({
    onSuccess: () => {
      toast.success("Identidad de correo guardada de forma segura");
      setSmtpPassword("");
      refetchOverview();
    },
    onError: (err) =>
      toast.error("Error guardando identidad", { description: err.message }),
  });

  const verifySmtpMutation =
    trpc.emailAutomation.verifySmtpAccount.useMutation({
      onSuccess: (res) => {
        if (res.ok) toast.success("Conexión SMTP verificada con éxito");
        else toast.error("Falló verificación SMTP", { description: res.error });
        refetchOverview();
      },
      onError: (err) =>
        toast.error("Error verificando SMTP", { description: err.message }),
    });

  const bootstrapSeqMutation =
    trpc.emailAutomation.bootstrapDefaults.useMutation({
      onSuccess: () => {
        toast.success(
          "Secuencias recomendadas activadas (0h/24h/72h y Match >= 85%)",
        );
        refetchSequences();
        refetchOverview();
      },
      onError: (err) =>
        toast.error("Error activando secuencias", { description: err.message }),
    });

  const toggleSeqMutation = trpc.emailAutomation.toggleSequence.useMutation({
    onSuccess: () => {
      toast.success("Estado de secuencia actualizado");
      refetchSequences();
      refetchOverview();
    },
  });

  const enrollLeadMutation = trpc.emailAutomation.enrollLead.useMutation({
    onSuccess: () => {
      toast.success("Prospecto inscrito en la secuencia automática");
      refetchEnrollments();
      refetchOverview();
    },
    onError: (err) =>
      toast.error("No se pudo inscribir", { description: err.message }),
  });

  const runQueueMutation = trpc.emailAutomation.runDueQueueNow.useMutation({
    onSuccess: (res) => {
      toast.success(
        `Cola procesada: ${res.sentCount} enviados, ${res.quotaBlockedCount} bloqueados por cuota`,
      );
      refetchMessages();
      refetchEnrollments();
      refetchOverview();
    },
    onError: (err) =>
      toast.error("Error procesando cola", { description: err.message }),
  });

  const upsertTemplateMutation = trpc.emailAutomation.upsertTemplate.useMutation({
    onSuccess: () => {
      toast.success("Plantilla guardada");
      setTplName("");
      setTplSubject("");
      setTplBody("");
      refetchTemplates();
    },
    onError: (err) =>
      toast.error("Error guardando plantilla", { description: err.message }),
  });

  const getCertPdfMutation = trpc.emailAutomation.getCertificatePdf.useMutation({
    onSuccess: (res) => {
      downloadBase64Pdf(res.pdfBase64, res.filename);
      toast.success(`Constancia Ley 527 descargada (${res.certificateCode})`);
    },
    onError: (err) =>
      toast.error("Error descargando constancia PDF", {
        description: err.message,
      }),
    onSettled: () => setDownloadingId(null),
  });

  const toggleNotifyMutation =
    trpc.emailAutomation.toggleNotifyOnOpen.useMutation({
      onSuccess: () => {
        toast.success("Preferencia de aviso de apertura actualizada");
        refetchMessages();
      },
      onError: (err) =>
        toast.error("Error actualizando alerta", { description: err.message }),
    });

  const handleSelectLeadForCompose = (leadIdValue: number) => {
    setComposeLeadId(leadIdValue);
    if (!leadIdValue) {
      setComposeRecipientName("");
      return;
    }
    const found = deliverableLeads.find((l: any) => l.id === leadIdValue);
    if (found) {
      setComposeToEmail(String(found.email || ""));
      setComposeRecipientName(String(found.name || ""));
    }
  };

  const handleGenerateAiDraft = () => {
    generateDraftMutation.mutate({
      leadId: composeLeadId > 0 ? composeLeadId : null,
      recipientName: composeRecipientName.trim() || null,
      recipientEmail: composeToEmail.trim().includes("@")
        ? composeToEmail.trim()
        : null,
      subjectHint: composeSubject.trim() || null,
      intent: composeAiIntent,
      tone: composeAiTone,
      customInstructions: composeAiInstructions.trim() || null,
    });
  };

  const handleSendDirectEmail = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      const controls = Array.from(
        form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
          "input, textarea",
        ),
      );
      for (const ctrl of controls) {
        syncValidationAria(ctrl, true);
      }
      form.reportValidity();
      return;
    }

    sendEmailMutation.mutate({
      leadId: composeLeadId > 0 ? composeLeadId : null,
      toEmail: composeToEmail.trim(),
      subject: composeSubject.trim(),
      bodyHtml: buildHtmlEmailFromPlainText(composeBodyText),
      bodyText: composeBodyText.trim(),
      aiGenerated: composeAiGenerated,
      notifyOnOpen: composeNotifyOnOpen,
    });
  };

  const handleSaveIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    upsertAccountMutation.mutate({
      mode,
      displayName: displayName.trim(),
      replyToEmail: replyToEmail.trim(),
      fromEmail: fromEmail.trim() || null,
      signatureHtml: signatureHtml.trim() || null,
      smtpHost: mode === "custom_smtp" ? smtpHost.trim() : null,
      smtpPort: Number(smtpPort) || 587,
      smtpSecure,
      smtpUser: mode === "custom_smtp" ? smtpUser.trim() : null,
      smtpPassword:
        mode === "custom_smtp" && smtpPassword.trim()
          ? smtpPassword.trim()
          : null,
    });
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    upsertTemplateMutation.mutate({
      name: tplName.trim(),
      category: tplCategory,
      subjectTemplate: tplSubject.trim(),
      bodyHtmlTemplate: tplBody.trim(),
    });
  };

  const handleMainTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    tab: "compose_sent" | "config_automation",
  ) => {
    if (
      e.key === "ArrowRight" ||
      e.key === "ArrowLeft" ||
      e.key === "Home" ||
      e.key === "End"
    ) {
      e.preventDefault();
      const next =
        e.key === "Home"
          ? "compose_sent"
          : e.key === "End"
            ? "config_automation"
            : tab === "compose_sent"
              ? "config_automation"
              : "compose_sent";
      setMainTab(next);
    }
  };

  const quota = overview?.quota;
  const senderLabel =
    overview?.account?.displayName ||
    overview?.defaultDisplayName ||
    "Vecy Bienes Raíces";
  const replyLabel =
    overview?.account?.replyToEmail || overview?.defaultReplyTo || "";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabecera compacta con cuota y métricas de lectura */}
      <div className="panel-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2 min-w-[260px] flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-black text-white">
              Gestor de Correos Certificados (Ley 527)
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 font-bold">
              Rastreo ✓✓ tipo Mailsuite
            </span>
          </div>

          {quota && (
            <div className="space-y-1.5 max-w-md">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Plan <strong className="text-white">{quota.planName}</strong> (
                  {quota.periodKey})
                </span>
                <span className="font-bold text-primary">
                  {quota.maxEmailsPerMonth < 0
                    ? `${quota.used} enviados (Ilimitado)`
                    : `${quota.used} / ${quota.maxEmailsPerMonth} correos/mes`}
                </span>
              </div>
              {quota.maxEmailsPerMonth > 0 && (
                <progress
                  className="vecy-quota-progress"
                  value={Math.min(quota.used, quota.maxEmailsPerMonth)}
                  max={quota.maxEmailsPerMonth}
                  aria-label="Cuota mensual de correos certificados"
                />
              )}
              {quota.maxEmailsPerMonth === 0 && (
                <p className="text-xs text-amber-300">
                  Tu plan gratuito incluye 0 envíos automáticos/mes.{" "}
                  <a href="/planes" className="underline font-black">
                    Activa Agente Pro (100/mes) o Growth (500/mes)
                  </a>
                  .
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {[
              {
                label: "Enviados",
                val: overview?.stats.sent ?? 0,
                cls: "text-zinc-100",
              },
              {
                label: "Leídos ✓✓",
                val: overview?.stats.openedCount ?? 0,
                cls: "text-emerald-400",
              },
              {
                label: "Clics",
                val: overview?.stats.totalClicks ?? 0,
                cls: "text-cyan-300",
              },
              {
                label: "En Cola",
                val: overview?.stats.queued ?? 0,
                cls: "text-sky-400",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="px-3 py-1.5 rounded-xl bg-secondary/70 border border-border min-w-[78px]"
              >
                <div className={`text-base font-black ${s.cls}`}>{s.val}</div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none px-3 py-1.5 rounded-xl bg-background/80 border border-border">
            <input
              type="checkbox"
              checked={liveOpenAlerts}
              onChange={(e) => setLiveOpenAlerts(e.target.checked)}
              className="accent-amber-500"
            />
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            Alertas en vivo de apertura
          </label>
        </div>
      </div>

      {/* Pestañas principales: 1. Redactar y Enviados | 2. Configuración y Automatización */}
      <div
        className="vecy-mail-tabs border-b border-border pb-1"
        {...({ focusgroup: "tablist nomemory" } as any)}
        aria-label="Vistas del Gestor de Correos"
      >
        <button
          id={composeTabId}
          type="button"
          role="tab"
          aria-selected={mainTab === "compose_sent"}
          {...(mainTab === "compose_sent" ? { focusgroupstart: "" } : {})}
          onClick={() => setMainTab("compose_sent")}
          onKeyDown={(e) => handleMainTabKeyDown(e, "compose_sent")}
          className={`vecy-mail-tab px-4 py-2.5 rounded-t-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors ${
            mainTab === "compose_sent"
              ? "text-primary bg-primary/10"
              : "text-muted-foreground hover:text-white"
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Redactar y Enviados</span>
        </button>

        <button
          id={configTabId}
          type="button"
          role="tab"
          aria-selected={mainTab === "config_automation"}
          {...(mainTab === "config_automation" ? { focusgroupstart: "" } : {})}
          onClick={() => setMainTab("config_automation")}
          onKeyDown={(e) => handleMainTabKeyDown(e, "config_automation")}
          className={`vecy-mail-tab px-4 py-2.5 rounded-t-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors ${
            mainTab === "config_automation"
              ? "text-primary bg-primary/10"
              : "text-muted-foreground hover:text-white"
          }`}
        >
          <Settings2 className="w-4 h-4" />
          <span>Configuración y Automatización</span>
        </button>
      </div>

      {/* PESTAÑA PRINCIPAL 1: REDACTAR Y ENVIADOS (WEBMAIL SIMPLE) */}
      <div
        role="tabpanel"
        aria-labelledby={composeTabId}
        hidden={mainTab !== "compose_sent"}
      >
        {mainTab === "compose_sent" && (
          <div className="space-y-6">
            {/* Redactor directo estilo webmail */}
            <form
              onSubmit={handleSendDirectEmail}
              noValidate
              className="panel-card p-6 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                <div>
                  <h3 className="text-base font-black text-white">
                    Nuevo Correo Certificado
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Se enviará con firma digital SHA-256 (Ley 527 de 1999) y seguimiento de lectura ✓✓
                    {replyLabel ? ` · Remitente: ${senderLabel} (${replyLabel})` : ""}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={generateDraftMutation.isPending}
                  onClick={handleGenerateAiDraft}
                  className="px-3.5 py-2 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/40 text-primary text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  {generateDraftMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  Redactar con IA
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="webmail-lead-select"
                    className="text-[11px] font-bold uppercase text-muted-foreground block mb-1"
                  >
                    Cliente / Lead del CRM (opcional)
                  </label>
                  <select
                    id="webmail-lead-select"
                    value={composeLeadId}
                    onChange={(e) =>
                      handleSelectLeadForCompose(Number(e.target.value))
                    }
                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary"
                  >
                    <option value={0}>
                      Envío directo a cualquier correo...
                    </option>
                    {deliverableLeads.map((l: any) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="webmail-to-email"
                    className="text-[11px] font-bold uppercase text-muted-foreground block mb-1"
                  >
                    Para (correo destinatario) *
                  </label>
                  <span
                    id={toHintId}
                    className="text-[10px] text-muted-foreground block mb-1"
                  >
                    Formato esperado: cliente@dominio.com
                  </span>
                  <input
                    id="webmail-to-email"
                    type="email"
                    required
                    autoComplete="email"
                    aria-describedby={toHintId}
                    data-error={toErrorId}
                    placeholder="cliente@ejemplo.com"
                    value={composeToEmail}
                    onChange={(e) => {
                      const nextVal = e.target.value;
                      setComposeToEmail(nextVal);
                      if (composeLeadId > 0) {
                        const selected = deliverableLeads.find(
                          (l: any) => l.id === composeLeadId,
                        );
                        if (
                          selected &&
                          String(selected.email || "").toLowerCase() !==
                            nextVal.trim().toLowerCase()
                        ) {
                          setComposeLeadId(0);
                        }
                      }
                      syncValidationAria(e.currentTarget, false);
                    }}
                    onBlur={(e) => syncValidationAria(e.currentTarget, true)}
                    onInvalid={(e) => syncValidationAria(e.currentTarget, true)}
                    className="vecy-field-input w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary"
                  />
                  <div id={toErrorId} className="vecy-field-error">
                    <span role="img" aria-label="Error">
                      ❌
                    </span>{" "}
                    Ingresa un correo electrónico válido (ej. cliente@dominio.com).
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="webmail-subject"
                  className="text-[11px] font-bold uppercase text-muted-foreground block mb-1"
                >
                  Asunto *
                </label>
                <input
                  id="webmail-subject"
                  type="text"
                  required
                  minLength={2}
                  data-error={subjectErrorId}
                  placeholder="Ej: Ficha técnica y condiciones del inmueble de tu interés"
                  value={composeSubject}
                  onChange={(e) => {
                    setComposeSubject(e.target.value);
                    syncValidationAria(e.currentTarget, false);
                  }}
                  onBlur={(e) => syncValidationAria(e.currentTarget, true)}
                  onInvalid={(e) => syncValidationAria(e.currentTarget, true)}
                  className="vecy-field-input w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs font-semibold text-foreground outline-none focus:border-primary"
                />
                <div id={subjectErrorId} className="vecy-field-error">
                  <span role="img" aria-label="Error">
                    ❌
                  </span>{" "}
                  Escribe un asunto de al menos 2 caracteres.
                </div>
              </div>

              <div>
                <label
                  htmlFor="webmail-body"
                  className="text-[11px] font-bold uppercase text-muted-foreground block mb-1"
                >
                  Mensaje *
                </label>
                <textarea
                  id="webmail-body"
                  required
                  minLength={2}
                  rows={5}
                  data-error={bodyErrorId}
                  placeholder="Escribe aquí tu mensaje con claridad. También puedes hacer clic en 'Redactar con IA' arriba y editar el borrador..."
                  value={composeBodyText}
                  onChange={(e) => {
                    setComposeBodyText(e.target.value);
                    syncValidationAria(e.currentTarget, false);
                  }}
                  onBlur={(e) => syncValidationAria(e.currentTarget, true)}
                  onInvalid={(e) => syncValidationAria(e.currentTarget, true)}
                  className="vecy-field-input w-full bg-background border border-border rounded-xl p-3.5 text-xs text-foreground outline-none focus:border-primary resize-y"
                />
                <div id={bodyErrorId} className="vecy-field-error">
                  <span role="img" aria-label="Error">
                    ❌
                  </span>{" "}
                  Escribe el contenido del correo antes de enviar.
                </div>
              </div>

              <details className="rounded-xl bg-background/60 border border-border px-3.5 py-2.5 text-xs">
                <summary className="cursor-pointer font-bold text-muted-foreground hover:text-white select-none">
                  Opciones rápidas de redacción con IA (tono, objetivo o instrucción extra)
                </summary>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                      Objetivo
                    </label>
                    <select
                      value={composeAiIntent}
                      onChange={(e) => setComposeAiIntent(e.target.value as any)}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-xs text-foreground"
                    >
                      <option value="welcome">Presentación / Bienvenida</option>
                      <option value="followup_24h">Seguimiento cordial</option>
                      <option value="followup_72h">Propuesta de visita</option>
                      <option value="match_alert">Inmueble compatible (Match)</option>
                      <option value="visit_confirmation">Confirmación de cita</option>
                      <option value="reply">Respuesta comercial</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                      Tono
                    </label>
                    <select
                      value={composeAiTone}
                      onChange={(e) => setComposeAiTone(e.target.value as any)}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-xs text-foreground"
                    >
                      <option value="profesional">Profesional</option>
                      <option value="cercano">Cercano</option>
                      <option value="ejecutivo">Ejecutivo</option>
                      <option value="persuasivo">Persuasivo</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                      Nombre del destinatario (si no está en CRM)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Carlos Méndez"
                      value={composeRecipientName}
                      onChange={(e) => setComposeRecipientName(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-xs text-foreground"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      placeholder="Instrucción extra para la IA (ej: invitar a visitar mañana a las 3 PM o mencionar descuento en administración)"
                      value={composeAiInstructions}
                      onChange={(e) => setComposeAiInstructions(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground"
                    />
                  </div>
                </div>
              </details>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/80">
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={composeNotifyOnOpen}
                    onChange={(e) => setComposeNotifyOnOpen(e.target.checked)}
                    className="accent-amber-500"
                  />
                  Avisarme en tiempo real cuando abran este correo o hagan clic
                </label>

                <button
                  type="submit"
                  disabled={sendEmailMutation.isPending}
                  className="btn-gold px-6 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                >
                  {sendEmailMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Enviar Correo Certificado
                </button>
              </div>
            </form>

            {/* Listado de correos enviados con chulitos Mailsuite */}
            <div className="panel-card p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: "all", label: "Todos" },
                    { id: "opened", label: "Leídos ✓✓" },
                    { id: "unread", label: "Pendientes de lectura ✓✓" },
                    { id: "queued", label: "En cola" },
                    { id: "error", label: "Con error" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSentFilter(f.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                        sentFilter === f.id
                          ? "bg-primary text-black font-black"
                          : "bg-background border border-border text-zinc-300 hover:text-white"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={sentSearch}
                      onChange={(e) => setSentSearch(e.target.value)}
                      placeholder="Buscar correo o asunto..."
                      className="bg-background border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-foreground outline-none focus:border-primary w-52 sm:w-64"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      refetchMessages();
                      refetchOverview();
                    }}
                    className="p-2 rounded-xl bg-secondary hover:bg-muted border border-border text-zinc-300 hover:text-white cursor-pointer"
                    title="Actualizar lecturas y clics"
                    aria-label="Actualizar bandeja de enviados"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${fetchingMessages ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border text-[10px] uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2.5 pr-3">Destinatario</th>
                      <th className="py-2.5 pr-3">Asunto / Integridad SHA-256</th>
                      <th className="py-2.5 pr-3">Lectura (Mailsuite)</th>
                      <th className="py-2.5 pr-3">Fecha (Colombia)</th>
                      <th className="py-2.5">Evidencia Ley 527</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {filteredComposeMessages.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-10 text-center text-muted-foreground"
                        >
                          No hay correos registrados para este filtro. Envía tu primer correo certificado arriba.
                        </td>
                      </tr>
                    ) : (
                      filteredComposeMessages.map((row: any) => {
                        const m = row.message;
                        const sentDateStr =
                          formatBogotaDateTime(m.sentAt || m.scheduledFor || m.createdAt) ||
                          "—";
                        return (
                          <tr key={m.id} className="hover:bg-white/[0.02]">
                            <td className="py-3 pr-3">
                              <div className="font-bold text-white flex items-center gap-1.5">
                                {row.leadName ? (
                                  <>
                                    <UserCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span>{row.leadName}</span>
                                  </>
                                ) : (
                                  <span>Envío directo</span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {m.toEmail}
                              </div>
                            </td>

                            <td className="py-3 pr-3 max-w-[270px]">
                              <div className="text-zinc-100 font-semibold truncate">
                                {m.subject}
                              </div>
                              {m.contentSha256 && (
                                <div className="text-[10px] font-mono text-zinc-400">
                                  SHA-256: {String(m.contentSha256).slice(0, 14)}...
                                </div>
                              )}
                              {m.errorMessage && (
                                <div className="text-[11px] text-rose-400 mt-0.5">
                                  {m.errorMessage}
                                </div>
                              )}
                            </td>

                            <td className="py-3 pr-3">
                              <MailsuiteCheckIndicator
                                status={m.status}
                                openCount={m.openCount}
                                clickCount={m.clickCount}
                                firstOpenedAt={m.firstOpenedAt}
                                lastOpenedAt={m.lastOpenedAt}
                                sentAt={m.sentAt}
                                scheduledFor={m.scheduledFor}
                                errorMessage={m.errorMessage}
                              />
                            </td>

                            <td className="py-3 pr-3 text-[11px] text-muted-foreground whitespace-nowrap">
                              {sentDateStr}
                            </td>

                            <td className="py-3">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={downloadingId === m.id}
                                  onClick={() => {
                                    setDownloadingId(m.id);
                                    getCertPdfMutation.mutate({ messageId: m.id });
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-primary/15 hover:bg-primary/25 border border-primary/40 text-primary text-[10px] font-black uppercase inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                >
                                  {downloadingId === m.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <FileDown className="w-3 h-3" />
                                  )}
                                  PDF Ley 527
                                </button>
                                <button
                                  type="button"
                                  title={
                                    m.notifyOnOpen
                                      ? "Desactivar aviso por apertura"
                                      : "Avisarme cuando lo abran"
                                  }
                                  onClick={() =>
                                    toggleNotifyMutation.mutate({
                                      messageId: m.id,
                                      notifyOnOpen: !m.notifyOnOpen,
                                    })
                                  }
                                  className={`p-1.5 rounded-lg border text-[10px] cursor-pointer ${
                                    m.notifyOnOpen
                                      ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                                      : "bg-secondary border-border text-zinc-400 hover:text-white"
                                  }`}
                                >
                                  <Bell className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PESTAÑA SECUNDARIA 2: CONFIGURACIÓN Y AUTOMATIZACIÓN (SMTP, SECUENCIAS, PLANTILLAS, COLA) */}
      <div
        role="tabpanel"
        aria-labelledby={configTabId}
        hidden={mainTab !== "config_automation"}
      >
        {mainTab === "config_automation" && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {[
                { id: "identity", label: "Identidad & SMTP", icon: Server },
                { id: "sequences", label: "Secuencias Automáticas", icon: Sparkles },
                { id: "templates", label: "Plantillas", icon: FileCode2 },
                { id: "queue", label: "Cola Programada", icon: RefreshCw },
              ].map((t) => {
                const Icon = t.icon;
                const active = configSubTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setConfigSubTab(t.id as any)}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer ${
                      active
                        ? "panel-tab-active"
                        : "bg-card border border-border text-muted-foreground hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {configSubTab === "identity" && (
              <form onSubmit={handleSaveIdentity} className="panel-card p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <h3 className="text-base font-black text-white">
                      Configuración de Remitente y SMTP
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Envía usando el Relay oficial de VECY con tu Reply-To o conecta tu propio SMTP cifrado (AES-256-GCM).
                    </p>
                  </div>
                  {overview?.account && (
                    <button
                      type="button"
                      disabled={verifySmtpMutation.isPending}
                      onClick={() => verifySmtpMutation.mutate()}
                      className="px-4 py-2 rounded-xl bg-secondary hover:bg-muted border border-border text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      {verifySmtpMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      Verificar Conexión
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label
                    className={`p-4 rounded-xl border cursor-pointer flex items-start gap-3 ${
                      mode === "vecy_relay"
                        ? "bg-primary/10 border-primary"
                        : "bg-background border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="emailMode"
                      checked={mode === "vecy_relay"}
                      onChange={() => setMode("vecy_relay")}
                      className="mt-1 accent-amber-500"
                    />
                    <div className="text-xs">
                      <strong className="text-white block">
                        Relay Oficial VECY con tu Reply-To (Recomendado)
                      </strong>
                      <span className="text-muted-foreground">
                        Cero configuración técnica. Los destinatarios ven tu nombre/agencia y responden directo a tu correo.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`p-4 rounded-xl border cursor-pointer flex items-start gap-3 ${
                      mode === "custom_smtp"
                        ? "bg-primary/10 border-primary"
                        : "bg-background border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="emailMode"
                      checked={mode === "custom_smtp"}
                      onChange={() => setMode("custom_smtp")}
                      className="mt-1 accent-amber-500"
                    />
                    <div className="text-xs">
                      <strong className="text-white block">
                        Servidor SMTP Propio (Cifrado AES-256-GCM)
                      </strong>
                      <span className="text-muted-foreground">
                        Usa tu dominio corporativo (Google Workspace, Zoho, Microsoft 365 o SMTP propio).
                      </span>
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                      Nombre de Remitente *
                    </label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ej: Laura Gómez • Inmobiliaria Capital"
                      className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                      Correo Reply-To (donde recibirás respuestas) *
                    </label>
                    <input
                      type="email"
                      required
                      value={replyToEmail}
                      onChange={(e) => setReplyToEmail(e.target.value)}
                      placeholder="asesor@tuinmobiliaria.com"
                      className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary"
                    />
                  </div>

                  {mode === "custom_smtp" && (
                    <>
                      <div>
                        <label className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                          Host SMTP *
                        </label>
                        <input
                          type="text"
                          required
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          placeholder="smtp.zoho.com"
                          className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                            Puerto *
                          </label>
                          <input
                            type="number"
                            required
                            value={smtpPort}
                            onChange={(e) => setSmtpPort(Number(e.target.value))}
                            className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none"
                          />
                        </div>
                        <label className="flex items-center gap-2 pt-6 text-xs text-zinc-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={smtpSecure}
                            onChange={(e) => setSmtpSecure(e.target.checked)}
                            className="accent-amber-500"
                          />
                          SSL/TLS directo (465)
                        </label>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                          Usuario SMTP *
                        </label>
                        <input
                          type="text"
                          required
                          value={smtpUser}
                          onChange={(e) => setSmtpUser(e.target.value)}
                          placeholder="comercial@tuinmobiliaria.com"
                          className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                          Contraseña / App Password SMTP{" "}
                          {overview?.account?.hasSmtpPassword
                            ? "(guardada, escribe para cambiar)"
                            : "*"}
                        </label>
                        <input
                          type="password"
                          value={smtpPassword}
                          onChange={(e) => setSmtpPassword(e.target.value)}
                          placeholder={
                            overview?.account?.hasSmtpPassword
                              ? "••••••••••••"
                              : "App password"
                          }
                          className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none"
                        />
                      </div>
                    </>
                  )}

                  <div className="md:col-span-2">
                    <label className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                      Firma HTML / Corporativa (opcional)
                    </label>
                    <textarea
                      rows={2}
                      value={signatureHtml}
                      onChange={(e) => setSignatureHtml(e.target.value)}
                      placeholder="<strong>Laura Gómez</strong><br/>Asesora Inmobiliaria • Tel: +57 300 000 0000"
                      className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="text-xs">
                    {overview?.account?.isVerified ? (
                      <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-4 h-4" /> Identidad verificada
                      </span>
                    ) : overview?.account?.lastError ? (
                      <span className="text-rose-400 flex items-center gap-1.5 font-bold">
                        <AlertCircle className="w-4 h-4" />{" "}
                        {overview.account.lastError}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="submit"
                    disabled={upsertAccountMutation.isPending}
                    className="btn-gold px-6 py-2.5 text-xs font-black uppercase tracking-wider cursor-pointer"
                  >
                    {upsertAccountMutation.isPending
                      ? "Guardando..."
                      : "Guardar Identidad"}
                  </button>
                </div>
              </form>
            )}

            {configSubTab === "sequences" && (
              <div className="space-y-4">
                <div className="panel-card p-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-white">
                      Secuencias Automáticas de Seguimiento
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Bienvenida inmediata (0h), seguimiento (24h y 72h) y alerta automática ante Matches &gt;= 85%.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={bootstrapSeqMutation.isPending}
                    onClick={() => bootstrapSeqMutation.mutate()}
                    className="btn-gold px-4 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    {bootstrapSeqMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Activar Secuencias Recomendadas
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {(sequences ?? []).length === 0 ? (
                    <div className="col-span-full panel-card p-10 text-center text-xs text-muted-foreground">
                      Aún no tienes secuencias creadas. Haz clic en "Activar Secuencias Recomendadas".
                    </div>
                  ) : (
                    sequences?.map((seq: any) => {
                      const steps = Array.isArray(seq.stepsJson)
                        ? seq.stepsJson
                        : [];
                      return (
                        <div key={seq.id} className="panel-card p-5 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-secondary border border-border font-bold uppercase text-primary">
                                Trigger: {seq.triggerType}
                              </span>
                              <h4 className="text-sm font-black text-white mt-1.5">
                                {seq.name}
                              </h4>
                              {seq.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {seq.description}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                toggleSeqMutation.mutate({
                                  id: seq.id,
                                  isActive: !seq.isActive,
                                })
                              }
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase flex items-center gap-1 cursor-pointer shrink-0 ${
                                seq.isActive
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : "bg-secondary text-zinc-400 border border-border"
                              }`}
                            >
                              {seq.isActive ? (
                                <Pause className="w-3 h-3" />
                              ) : (
                                <Play className="w-3 h-3" />
                              )}
                              {seq.isActive ? "Activa" : "Pausada"}
                            </button>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-border/70">
                            {steps.map((st: any, idx: number) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-xl bg-background/70 border border-border text-xs flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <span className="font-bold text-primary mr-2">
                                    Paso {idx + 1} ({st.delayHours}h)
                                  </span>
                                  <span className="text-zinc-200 truncate">
                                    {st.subjectTemplate}
                                  </span>
                                </div>
                                {st.useAiPersonalization && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-black shrink-0">
                                    IA
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {(sequences ?? []).length > 0 && (myLeads ?? []).length > 0 && (
                  <div className="panel-card p-5 flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                        Secuencia
                      </label>
                      <select
                        value={enrollSeqId}
                        onChange={(e) => setEnrollSeqId(Number(e.target.value))}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                      >
                        <option value={0}>Selecciona secuencia...</option>
                        {sequences?.map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                        Prospecto CRM
                      </label>
                      <select
                        value={enrollLeadId}
                        onChange={(e) => setEnrollLeadId(Number(e.target.value))}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                      >
                        <option value={0}>Selecciona prospecto...</option>
                        {myLeads?.map((l: any) => (
                          <option key={l.id} value={l.id}>
                            {l.name} ({l.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      disabled={
                        !enrollSeqId ||
                        !enrollLeadId ||
                        enrollLeadMutation.isPending
                      }
                      onClick={() =>
                        enrollLeadMutation.mutate({
                          sequenceId: enrollSeqId,
                          leadId: enrollLeadId,
                          startDelayHours: 0,
                        })
                      }
                      className="btn-gold px-4 py-2 text-xs font-black uppercase tracking-wider cursor-pointer"
                    >
                      Inscribir Ahora
                    </button>
                  </div>
                )}

                {(enrollments ?? []).length > 0 && (
                  <div className="panel-card p-5 space-y-2.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                      Inscripciones Recientes ({enrollments?.length})
                    </h4>
                    <div className="space-y-2">
                      {enrollments?.slice(0, 15).map((row: any) => (
                        <div
                          key={row.enrollment.id}
                          className="p-3 rounded-xl bg-background/70 border border-border flex flex-wrap items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <strong className="text-white">{row.leadName}</strong>
                            <span className="text-muted-foreground">
                              {" "}
                              • {row.sequenceName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-zinc-400">
                              Paso #{row.enrollment.currentStepIndex + 1}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-secondary font-bold uppercase text-primary">
                              {row.enrollment.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {configSubTab === "templates" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="panel-card p-5 space-y-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    Plantillas Disponibles ({templates?.length ?? 0})
                  </h3>
                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {templates?.map((t: any) => (
                      <div
                        key={t.id}
                        className="p-3.5 rounded-xl bg-background/70 border border-border space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-xs text-white">{t.name}</strong>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-primary font-bold uppercase">
                            {t.isSystem ? "Sistema" : t.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300">
                          {t.subjectTemplate}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <form
                  onSubmit={handleCreateTemplate}
                  className="panel-card p-5 space-y-3"
                >
                  <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-primary" /> Crear Plantilla Personalizada
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Nombre de la plantilla"
                      value={tplName}
                      onChange={(e) => setTplName(e.target.value)}
                      className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                    />
                    <select
                      value={tplCategory}
                      onChange={(e) => setTplCategory(e.target.value as any)}
                      className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                    >
                      <option value="welcome">Bienvenida</option>
                      <option value="follow_up">Seguimiento</option>
                      <option value="match_alert">Alerta Match</option>
                      <option value="visit">Visita</option>
                      <option value="custom">Personalizada</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Asunto (ej: Hola {{lead_first_name}}, ficha de {{property_name}})"
                    value={tplSubject}
                    onChange={(e) => setTplSubject(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                  />
                  <textarea
                    required
                    rows={5}
                    placeholder="<p>Hola {{lead_first_name}}, ...</p>"
                    value={tplBody}
                    onChange={(e) => setTplBody(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground resize-none"
                  />
                  <div className="text-[10px] text-muted-foreground">
                    Variables disponibles: {EMAIL_TEMPLATE_VARIABLES.join(" ")}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={upsertTemplateMutation.isPending}
                      className="btn-gold px-5 py-2 text-xs font-black uppercase tracking-wider cursor-pointer"
                    >
                      Guardar Plantilla
                    </button>
                  </div>
                </form>
              </div>
            )}

            {configSubTab === "queue" && (
              <div className="panel-card p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <select
                    value={msgStatusFilter}
                    onChange={(e) => setMsgStatusFilter(e.target.value as any)}
                    className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="queued">Programados / En Cola</option>
                    <option value="sent">Enviados</option>
                    <option value="failed">Fallidos</option>
                    <option value="quota_blocked">Bloqueados por Cuota</option>
                  </select>

                  <button
                    type="button"
                    disabled={runQueueMutation.isPending}
                    onClick={() => runQueueMutation.mutate()}
                    className="btn-gold px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    {runQueueMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    Procesar Cola Ahora
                  </button>
                </div>

                <div className="space-y-2">
                  {(messages ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground py-6 text-center">
                      No hay correos en cola para el filtro seleccionado.
                    </p>
                  ) : (
                    messages?.map((row: any) => {
                      const m = row.message;
                      return (
                        <div
                          key={m.id}
                          className="p-3 rounded-xl bg-background/70 border border-border flex flex-wrap items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate">
                              {m.subject}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {row.leadName || "Envío directo"} · {m.toEmail}
                            </div>
                          </div>
                          <MailsuiteCheckIndicator
                            status={m.status}
                            openCount={m.openCount}
                            clickCount={m.clickCount}
                            firstOpenedAt={m.firstOpenedAt}
                            lastOpenedAt={m.lastOpenedAt}
                            sentAt={m.sentAt}
                            scheduledFor={m.scheduledFor}
                            errorMessage={m.errorMessage}
                            compact
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
