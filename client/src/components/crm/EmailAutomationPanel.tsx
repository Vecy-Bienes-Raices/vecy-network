import React, { useEffect, useRef, useState } from "react";
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
  Eye,
  MousePointerClick,
  FileDown,
  Bell,
} from "lucide-react";
import { EMAIL_TEMPLATE_VARIABLES } from "@shared/crm";

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

export default function EmailAutomationPanel() {
  const [subTab, setSubTab] = useState<"identity" | "sequences" | "queue" | "templates">("identity");

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
  const [tplCategory, setTplCategory] = useState<"welcome" | "follow_up" | "match_alert" | "visit" | "custom">("follow_up");
  const [tplSubject, setTplSubject] = useState("");
  const [tplBody, setTplBody] = useState("");
  const [liveOpenAlerts, setLiveOpenAlerts] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const prevTrackSnapshotRef = useRef<Map<number, { opens: number; clicks: number }>>(new Map());
  const snapshotInitializedRef = useRef(false);

  const { data: overview, refetch: refetchOverview } = trpc.emailAutomation.getOverview.useQuery(
    undefined,
    { refetchInterval: liveOpenAlerts ? 30_000 : false },
  );
  const { data: sequences, refetch: refetchSequences } = trpc.emailAutomation.listSequences.useQuery();
  const { data: templates, refetch: refetchTemplates } = trpc.emailAutomation.listTemplates.useQuery();
  const { data: messages, refetch: refetchMessages } = trpc.emailAutomation.listMessages.useQuery(
    {
      status: msgStatusFilter,
      limit: 60,
    },
    { refetchInterval: liveOpenAlerts ? 30_000 : false },
  );
  const { data: enrollments, refetch: refetchEnrollments } = trpc.emailAutomation.listEnrollments.useQuery();
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
      const prev = prevTrackSnapshotRef.current.get(item.id) || { opens: 0, clicks: 0 };
      const curOpens = Number(item.openCount ?? 0);
      const curClicks = Number(item.clickCount ?? 0);
      if (curOpens > prev.opens) {
        toast.info(`👁️ ${item.toEmail} abrió tu correo certificado`, {
          description: item.subject,
        });
      } else if (curClicks > prev.clicks) {
        toast.info(`🔗 ${item.toEmail} hizo clic en tu correo`, {
          description: item.subject,
        });
      }
      prevTrackSnapshotRef.current.set(item.id, { opens: curOpens, clicks: curClicks });
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

  const upsertAccountMutation = trpc.emailAutomation.upsertAccount.useMutation({
    onSuccess: () => {
      toast.success("Identidad de correo guardada de forma segura");
      setSmtpPassword("");
      refetchOverview();
    },
    onError: (err) => toast.error("Error guardando identidad", { description: err.message }),
  });

  const verifySmtpMutation = trpc.emailAutomation.verifySmtpAccount.useMutation({
    onSuccess: (res) => {
      if (res.ok) toast.success("Conexión SMTP verificada con éxito");
      else toast.error("Falló verificación SMTP", { description: res.error });
      refetchOverview();
    },
    onError: (err) => toast.error("Error verificando SMTP", { description: err.message }),
  });

  const bootstrapSeqMutation = trpc.emailAutomation.bootstrapDefaults.useMutation({
    onSuccess: () => {
      toast.success("Secuencias recomendadas activadas (0h/24h/72h y Match >= 85%)");
      refetchSequences();
      refetchOverview();
    },
    onError: (err) => toast.error("Error activando secuencias", { description: err.message }),
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
    onError: (err) => toast.error("No se pudo inscribir", { description: err.message }),
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
    onError: (err) => toast.error("Error procesando cola", { description: err.message }),
  });

  const upsertTemplateMutation = trpc.emailAutomation.upsertTemplate.useMutation({
    onSuccess: () => {
      toast.success("Plantilla guardada");
      setTplName("");
      setTplSubject("");
      setTplBody("");
      refetchTemplates();
    },
    onError: (err) => toast.error("Error guardando plantilla", { description: err.message }),
  });

  const getCertPdfMutation = trpc.emailAutomation.getCertificatePdf.useMutation({
    onSuccess: (res) => {
      downloadBase64Pdf(res.pdfBase64, res.filename);
      toast.success(`Constancia Ley 527 descargada (${res.certificateCode})`);
    },
    onError: (err) => toast.error("Error descargando constancia PDF", { description: err.message }),
    onSettled: () => setDownloadingId(null),
  });

  const toggleNotifyMutation = trpc.emailAutomation.toggleNotifyOnOpen.useMutation({
    onSuccess: () => {
      toast.success("Preferencia de aviso de apertura actualizada");
      refetchMessages();
    },
    onError: (err) => toast.error("Error actualizando alerta", { description: err.message }),
  });

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
      smtpPassword: mode === "custom_smtp" && smtpPassword.trim() ? smtpPassword.trim() : null,
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

  const quota = overview?.quota;
  const quotaPct =
    quota && quota.maxEmailsPerMonth > 0
      ? Math.min(100, Math.round((quota.used / quota.maxEmailsPerMonth) * 100))
      : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="panel-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-[260px] flex-1">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-black text-white">
              Gestor Automatizado de Correos con IA
            </h2>
          </div>
          {quota && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs max-w-md">
                <span className="text-muted-foreground">
                  Plan <strong className="text-white">{quota.planName}</strong> ({quota.periodKey})
                </span>
                <span className="font-bold text-primary">
                  {quota.maxEmailsPerMonth < 0
                    ? `${quota.used} enviados (Ilimitado)`
                    : `${quota.used} / ${quota.maxEmailsPerMonth} correos/mes`}
                </span>
              </div>
              {quota.maxEmailsPerMonth > 0 && (
                <div className="w-full max-w-md h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${quotaPct}%` }}
                  />
                </div>
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-center">
          {[
            { label: "Enviados", val: overview?.stats.sent ?? 0, cls: "text-emerald-400" },
            { label: "Abiertos", val: overview?.stats.openedCount ?? 0, cls: "text-amber-300" },
            { label: "Clics", val: overview?.stats.totalClicks ?? 0, cls: "text-cyan-300" },
            { label: "En Cola", val: overview?.stats.queued ?? 0, cls: "text-sky-400" },
            { label: "Secuencias Activas", val: overview?.stats.activeSequences ?? 0, cls: "text-primary" },
            { label: "Inscripciones", val: overview?.stats.activeEnrollments ?? 0, cls: "text-zinc-200" },
          ].map((s) => (
            <div key={s.label} className="px-3 py-2 rounded-xl bg-secondary/70 border border-border">
              <div className={`text-lg font-black ${s.cls}`}>{s.val}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: "identity", label: "Identidad & SMTP", icon: Server },
          { id: "sequences", label: "Secuencias Automáticas", icon: Sparkles },
          { id: "queue", label: "Envíos & Cola", icon: Send },
          { id: "templates", label: "Plantillas", icon: FileCode2 },
        ].map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as any)}
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

      {subTab === "identity" && (
        <form onSubmit={handleSaveIdentity} className="panel-card p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h3 className="text-base font-black text-white">Configuración de Remitente</h3>
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
                <strong className="text-white block">Relay Oficial VECY con tu Reply-To (Recomendado)</strong>
                <span className="text-muted-foreground">
                  Cero configuración técnica. Los prospectos ven tu nombre/agencia y responden directo a tu correo.
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
                <strong className="text-white block">Servidor SMTP Propio (Cifrado AES-256-GCM)</strong>
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
                    Contraseña / App Password SMTP {overview?.account?.hasSmtpPassword ? "(guardada, escribe para cambiar)" : "*"}
                  </label>
                  <input
                    type="password"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    placeholder={overview?.account?.hasSmtpPassword ? "••••••••••••" : "App password"}
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
                  <AlertCircle className="w-4 h-4" /> {overview.account.lastError}
                </span>
              ) : null}
            </div>
            <button
              type="submit"
              disabled={upsertAccountMutation.isPending}
              className="btn-gold px-6 py-2.5 text-xs font-black uppercase tracking-wider cursor-pointer"
            >
              {upsertAccountMutation.isPending ? "Guardando..." : "Guardar Identidad"}
            </button>
          </div>
        </form>
      )}

      {subTab === "sequences" && (
        <div className="space-y-4">
          <div className="panel-card p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-white">Secuencias Automáticas de Seguimiento</h3>
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
                const steps = Array.isArray(seq.stepsJson) ? seq.stepsJson : [];
                return (
                  <div key={seq.id} className="panel-card p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-secondary border border-border font-bold uppercase text-primary">
                          Trigger: {seq.triggerType}
                        </span>
                        <h4 className="text-sm font-black text-white mt-1.5">{seq.name}</h4>
                        {seq.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{seq.description}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          toggleSeqMutation.mutate({ id: seq.id, isActive: !seq.isActive })
                        }
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase flex items-center gap-1 cursor-pointer shrink-0 ${
                          seq.isActive
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-secondary text-zinc-400 border border-border"
                        }`}
                      >
                        {seq.isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
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
                            <span className="text-zinc-200 truncate">{st.subjectTemplate}</span>
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
                disabled={!enrollSeqId || !enrollLeadId || enrollLeadMutation.isPending}
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
                      <span className="text-muted-foreground"> • {row.sequenceName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-zinc-400">Paso #{row.enrollment.currentStepIndex + 1}</span>
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

      {subTab === "queue" && (
        <div className="panel-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={msgStatusFilter}
                onChange={(e) => setMsgStatusFilter(e.target.value as any)}
                className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground"
              >
                <option value="all">Todos los estados</option>
                <option value="sent">Enviados</option>
                <option value="queued">Programados / En Cola</option>
                <option value="failed">Fallidos</option>
                <option value="quota_blocked">Bloqueados por Cuota</option>
              </select>

              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none px-3 py-1.5 rounded-xl bg-background border border-border">
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

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="py-2.5 pr-3">Destinatario</th>
                  <th className="py-2.5 pr-3">Asunto / SHA-256</th>
                  <th className="py-2.5 pr-3">Estado</th>
                  <th className="py-2.5 pr-3">Rastreo Mailsuite</th>
                  <th className="py-2.5 pr-3">Fecha</th>
                  <th className="py-2.5">Certificado Ley 527</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {(messages ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      Sin mensajes registrados en esta vista.
                    </td>
                  </tr>
                ) : (
                  messages?.map((row: any) => {
                    const m = row.message;
                    const opens = Number(m.openCount ?? 0);
                    const clicks = Number(m.clickCount ?? 0);
                    return (
                      <tr key={m.id}>
                        <td className="py-3 pr-3">
                          <div className="font-bold text-white">{row.leadName || "Prospecto"}</div>
                          <div className="text-[11px] text-muted-foreground">{m.toEmail}</div>
                        </td>
                        <td className="py-3 pr-3 max-w-[260px]">
                          <div className="text-zinc-200 font-semibold truncate">{m.subject}</div>
                          {m.contentSha256 && (
                            <div className="text-[10px] font-mono text-zinc-400">
                              SHA-256: {String(m.contentSha256).slice(0, 14)}...
                            </div>
                          )}
                          {m.errorMessage && (
                            <div className="text-[11px] text-rose-400">{m.errorMessage}</div>
                          )}
                        </td>
                        <td className="py-3 pr-3">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                              m.status === "sent"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : m.status === "queued"
                                  ? "bg-sky-500/20 text-sky-300"
                                  : "bg-rose-500/20 text-rose-300"
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td className="py-3 pr-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold ${
                                opens > 0
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-secondary text-zinc-400"
                              }`}
                            >
                              <Eye className="w-3 h-3" />
                              {opens > 0 ? `Abierto (${opens})` : "Sin abrir"}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold ${
                                clicks > 0
                                  ? "bg-cyan-500/20 text-cyan-300"
                                  : "bg-secondary text-zinc-400"
                              }`}
                            >
                              <MousePointerClick className="w-3 h-3" />
                              {clicks}
                            </span>
                          </div>
                          {m.lastOpenedAt && (
                            <div className="text-[10px] text-zinc-400 mt-0.5">
                              Última: {new Date(m.lastOpenedAt).toLocaleString("es-CO", { timeZone: "America/Bogota" })}
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-3 text-[11px] text-muted-foreground">
                          {new Date(m.sentAt || m.scheduledFor || m.createdAt).toLocaleString("es-CO", {
                            timeZone: "America/Bogota",
                          })}
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
                              className="px-2.5 py-1 rounded-lg bg-primary/15 hover:bg-primary/25 border border-primary/40 text-primary text-[10px] font-black uppercase inline-flex items-center gap-1 cursor-pointer"
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
                              title={m.notifyOnOpen ? "Desactivar aviso por apertura" : "Avisarme cuando lo abran"}
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
      )}

      {subTab === "templates" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="panel-card p-5 space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              Plantillas Disponibles ({templates?.length ?? 0})
            </h3>
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {templates?.map((t: any) => (
                <div key={t.id} className="p-3.5 rounded-xl bg-background/70 border border-border space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-xs text-white">{t.name}</strong>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-primary font-bold uppercase">
                      {t.isSystem ? "Sistema" : t.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300">{t.subjectTemplate}</p>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleCreateTemplate} className="panel-card p-5 space-y-3">
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
    </div>
  );
}
