import React, { useEffect, useId, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  X,
  Mail,
  Sparkles,
  Clock,
  CheckCircle2,
  Calendar,
  FileText,
  UserCheck,
  Loader2,
  Building2,
  SendHorizonal,
  FileDown,
} from "lucide-react";
import MailsuiteCheckIndicator from "./MailsuiteCheckIndicator";
import {
  CRM_PIPELINE_STAGES,
  CRM_SOURCE_LABELS,
  CRM_TEMPERATURE_LABELS,
  type CrmActivityType,
  type CrmLeadTemperature,
  type CrmPipelineStage,
} from "@shared/crm";

interface LeadDetailDrawerProps {
  leadId: number | null;
  initialTab?: "timeline" | "email" | "profile";
  onClose: () => void;
  onUpdated?: () => void;
}

export default function LeadDetailDrawer({
  leadId,
  initialTab = "timeline",
  onClose,
  onUpdated,
}: LeadDetailDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [drawerTab, setDrawerTab] = useState<"timeline" | "email" | "profile">(initialTab);

  // Estado formulario actividad/nota
  const [actType, setActType] = useState<CrmActivityType>("note");
  const [actTitle, setActTitle] = useState("");
  const [actBody, setActBody] = useState("");
  const [actDueAt, setActDueAt] = useState("");
  const [setNextFollowUp, setSetNextFollowUp] = useState(true);

  // Estado redactor IA de correos
  const [emailIntent, setEmailIntent] = useState<
    "welcome" | "followup_24h" | "followup_72h" | "match_alert" | "visit_confirmation" | "reply"
  >("welcome");
  const [emailTone, setEmailTone] = useState<"profesional" | "cercano" | "ejecutivo" | "persuasivo">(
    "profesional",
  );
  const [incomingMsg, setIncomingMsg] = useState("");
  const [customInstr, setCustomInstr] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBodyText, setEmailBodyText] = useState("");
  const [emailScheduledFor, setEmailScheduledFor] = useState("");
  const [aiDraftGenerated, setAiDraftGenerated] = useState(false);
  const [notifyOnOpen, setNotifyOnOpen] = useState(false);
  const [downloadingEmailId, setDownloadingEmailId] = useState<number | null>(null);

  // Estado perfil editable del prospecto
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editZone, setEditZone] = useState("");
  const [editTemp, setEditTemp] = useState<CrmLeadTemperature>("warm");
  const [editFollowUp, setEditFollowUp] = useState("");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    setDrawerTab(initialTab);
  }, [initialTab, leadId]);

  const {
    data: detail,
    isLoading,
    refetch,
  } = trpc.crm.getLeadDetail.useQuery(
    { leadId: leadId ?? 0 },
    { enabled: Boolean(leadId) },
  );

  const { data: emailOverview, refetch: refetchEmailOverview } =
    trpc.emailAutomation.getOverview.useQuery(undefined, { enabled: Boolean(leadId) });

  useEffect(() => {
    if (detail?.lead) {
      const l = detail.lead;
      setEditName(l.name || "");
      setEditEmail(l.email && !l.email.endsWith("@vecy.local") ? l.email : "");
      setEditPhone(l.phone || "");
      setEditBudget(l.estimatedBudget ? String(Math.round(Number(l.estimatedBudget))) : "");
      setEditCity(l.preferredCity || "");
      setEditZone(l.preferredZone || "");
      setEditTemp((l.temperature as CrmLeadTemperature) || "warm");
      setEditNotes(l.notes || "");
      setEditFollowUp(
        l.nextFollowUpAt
          ? new Date(l.nextFollowUpAt).toISOString().slice(0, 16)
          : "",
      );
    }
  }, [detail?.lead]);

  // Manejo nativo de <dialog> con showModal() + fallback Safari light-dismiss
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (leadId) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [leadId]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = "";
      onClose();
    };
    dialog.addEventListener("close", handleClose);

    // Fallback Safari para closedby="any" verificando pointerdown + pointerup fuera del contenido
    let cleanupFallback: (() => void) | undefined;
    if (!("closedBy" in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const isOutside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e)) {
          dialog.close();
        }
        pressedOutside = false;
      };
      dialog.addEventListener("pointerdown", onPointerDown);
      dialog.addEventListener("pointerup", onPointerUp);
      cleanupFallback = () => {
        dialog.removeEventListener("pointerdown", onPointerDown);
        dialog.removeEventListener("pointerup", onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener("close", handleClose);
      if (cleanupFallback) cleanupFallback();
    };
  }, [onClose]);

  const updateStageMutation = trpc.crm.updateStage.useMutation({
    onSuccess: () => {
      toast.success("Etapa actualizada en el embudo");
      refetch();
      onUpdated?.();
    },
    onError: (err) => toast.error("Error cambiando etapa", { description: err.message }),
  });

  const addActivityMutation = trpc.crm.addActivity.useMutation({
    onSuccess: () => {
      toast.success("Actividad registrada");
      setActTitle("");
      setActBody("");
      setActDueAt("");
      refetch();
      onUpdated?.();
    },
    onError: (err) => toast.error("Error al registrar actividad", { description: err.message }),
  });

  const completeTaskMutation = trpc.crm.completeTask.useMutation({
    onSuccess: () => {
      refetch();
      onUpdated?.();
    },
  });

  const aiSummaryMutation = trpc.crm.generateAiLeadSummary.useMutation({
    onSuccess: () => {
      toast.success("Resumen IA generado y guardado en historial");
      refetch();
    },
    onError: (err) => toast.error("No se pudo generar resumen", { description: err.message }),
  });

  const updateLeadMutation = trpc.crm.updateLead.useMutation({
    onSuccess: () => {
      toast.success("Ficha del prospecto actualizada");
      refetch();
      onUpdated?.();
    },
    onError: (err) => toast.error("Error actualizando prospecto", { description: err.message }),
  });

  const generateDraftMutation = trpc.emailAutomation.generateAiDraft.useMutation({
    onSuccess: (draft) => {
      setEmailSubject(draft.subject);
      setEmailBodyText(draft.bodyText);
      setAiDraftGenerated(true);
      toast.success("Borrador redactado con JanIA");
    },
    onError: (err) => toast.error("Error generando borrador IA", { description: err.message }),
  });

  const sendEmailMutation = trpc.emailAutomation.sendEmail.useMutation({
    onSuccess: (res) => {
      toast.success(
        res.status === "queued"
          ? "Correo programado en cola"
          : "Correo enviado y registrado en el CRM",
      );
      setEmailSubject("");
      setEmailBodyText("");
      setEmailScheduledFor("");
      setAiDraftGenerated(false);
      refetch();
      refetchEmailOverview();
      onUpdated?.();
    },
    onError: (err) => toast.error("No se pudo enviar el correo", { description: err.message }),
  });

  const downloadCertMutation = trpc.emailAutomation.getCertificatePdf.useMutation({
    onSuccess: (res) => {
      const binary = atob(res.pdfBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Constancia Ley 527 descargada (${res.certificateCode})`);
    },
    onError: (err) => toast.error("Error descargando constancia PDF", { description: err.message }),
    onSettled: () => setDownloadingEmailId(null),
  });

  const lead = detail?.lead;
  const property = detail?.property;
  const quota = emailOverview?.quota;

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !actBody.trim()) return;
    addActivityMutation.mutate({
      leadId: lead.id,
      activityType: actType,
      title: actTitle.trim() || undefined,
      body: actBody.trim(),
      dueAt: actDueAt ? new Date(actDueAt).toISOString() : null,
      setAsNextFollowUp: Boolean(actDueAt && setNextFollowUp),
    });
  };

  const handleSaveProfile = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!lead) return;
    if (!e.currentTarget.checkValidity()) {
      e.currentTarget.reportValidity();
      return;
    }
    updateLeadMutation.mutate({
      leadId: lead.id,
      name: editName.trim(),
      email: editEmail.trim() || undefined,
      phone: editPhone.trim() || null,
      estimatedBudget: editBudget.trim() || null,
      preferredCity: editCity.trim() || null,
      preferredZone: editZone.trim() || null,
      temperature: editTemp,
      nextFollowUpAt: editFollowUp ? new Date(editFollowUp).toISOString() : null,
      notes: editNotes.trim() || null,
    });
  };

  const handleSendEmail = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!lead) return;
    const htmlFromText = emailBodyText
      .split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
      .join("\n");

    sendEmailMutation.mutate({
      leadId: lead.id,
      toEmail: editEmail || undefined,
      subject: emailSubject.trim(),
      bodyHtml: htmlFromText,
      bodyText: emailBodyText.trim(),
      scheduledFor: emailScheduledFor ? new Date(emailScheduledFor).toISOString() : null,
      aiGenerated: aiDraftGenerated,
      notifyOnOpen,
    });
  };

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: "any" } as any)}
      aria-labelledby={titleId}
      className="vecy-native-drawer fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-2xl bg-zinc-950 text-foreground border-l border-primary/30 shadow-2xl p-0 overflow-hidden"
    >
      {/* Cabecera fija del Drawer */}
      <div className="p-5 border-b border-border bg-black/80 flex items-start justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="badge-gold">CRM Prospecto #{leadId}</span>
            {lead?.source && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground font-bold uppercase">
                {CRM_SOURCE_LABELS[lead.source] || lead.source}
              </span>
            )}
            {lead?.temperature && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  lead.temperature === "hot"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    : lead.temperature === "warm"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                }`}
              >
                {CRM_TEMPERATURE_LABELS[lead.temperature as CrmLeadTemperature] || lead.temperature}
              </span>
            )}
          </div>
          <h2 id={titleId} className="text-xl font-black text-white truncate">
            {lead?.name || "Cargando prospecto..."}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {lead?.email && !lead.email.endsWith("@vecy.local") ? lead.email : "Sin correo"} •{" "}
            {lead?.phone || "Sin teléfono"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Cerrar panel de detalle del prospecto"
          className="p-2 rounded-xl bg-secondary hover:bg-muted text-zinc-300 hover:text-white border border-border cursor-pointer shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Selector rápido de etapa + sub-navegación */}
      {lead && (
        <div className="px-5 py-3 bg-secondary/40 border-b border-border flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <label htmlFor="drawer-stage-select" className="text-[11px] font-bold uppercase text-muted-foreground">
              Etapa:
            </label>
            <select
              id="drawer-stage-select"
              value={lead.pipelineStage}
              disabled={updateStageMutation.isPending}
              onChange={(e) =>
                updateStageMutation.mutate({
                  leadId: lead.id,
                  toStage: e.target.value as CrmPipelineStage,
                })
              }
              className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-bold text-foreground outline-none focus:border-primary"
            >
              {CRM_PIPELINE_STAGES.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { id: "timeline", label: "Historial", icon: Clock },
              { id: "email", label: "Correo IA", icon: Mail },
              { id: "profile", label: "Ficha & Match", icon: UserCheck },
            ].map((t) => {
              const Icon = t.icon;
              const active = drawerTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setDrawerTab(t.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? "bg-primary text-black"
                      : "bg-background/60 text-muted-foreground hover:text-white border border-border"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider">Cargando historial CRM...</span>
          </div>
        ) : !lead ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No se encontró información del prospecto.
          </div>
        ) : (
          <>
            {property && (
              <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Building2 className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{property.name}</p>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {property.zone}, {property.city || "Colombia"} • $
                      {Number(property.price || 0).toLocaleString("es-CO")} COP
                    </p>
                  </div>
                </div>
                <a
                  href={`/property/${property.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-black uppercase text-primary hover:underline shrink-0"
                >
                  Ver Ficha
                </a>
              </div>
            )}

            {drawerTab === "timeline" && (
              <div className="space-y-5">
                <form onSubmit={handleAddActivity} className="p-4 rounded-2xl bg-card border border-border space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-white">
                      Registrar Nota / Seguimiento
                    </span>
                    <button
                      type="button"
                      disabled={aiSummaryMutation.isPending}
                      onClick={() => aiSummaryMutation.mutate({ leadId: lead.id })}
                      className="px-3 py-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 border border-primary/40 text-primary text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer"
                    >
                      {aiSummaryMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      Resumen IA
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={actType}
                      onChange={(e) => setActType(e.target.value as CrmActivityType)}
                      className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                    >
                      <option value="note">Nota interna</option>
                      <option value="call">Llamada telefónica</option>
                      <option value="whatsapp">Mensaje WhatsApp</option>
                      <option value="visit">Visita / Recorrido</option>
                      <option value="task">Recordatorio / Tarea</option>
                    </select>
                    <input
                      type="datetime-local"
                      value={actDueAt}
                      onChange={(e) => setActDueAt(e.target.value)}
                      className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                      aria-label="Fecha y hora de seguimiento o recordatorio"
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Título corto (opcional, ej: Confirmar preaprobado bancario)"
                    value={actTitle}
                    onChange={(e) => setActTitle(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                  />

                  <textarea
                    required
                    rows={3}
                    placeholder="Detalle de la llamada, acuerdos, presupuesto o próximos pasos..."
                    value={actBody}
                    onChange={(e) => setActBody(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground outline-none focus:border-primary resize-none"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={setNextFollowUp}
                        onChange={(e) => setSetNextFollowUp(e.target.checked)}
                        className="accent-amber-500"
                      />
                      Fijar fecha como próximo seguimiento del prospecto
                    </label>
                    <button
                      type="submit"
                      disabled={addActivityMutation.isPending || !actBody.trim()}
                      className="btn-gold px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                    >
                      {addActivityMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                      Guardar Actividad
                    </button>
                  </div>
                </form>

                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Línea de Tiempo ({detail.activities.length})
                  </h3>
                  {detail.activities.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-6 text-center bg-card rounded-xl border border-border">
                      Aún no hay actividades registradas para este prospecto.
                    </p>
                  ) : (
                    detail.activities.map((act: any) => (
                      <div
                        key={act.id}
                        className="p-3.5 rounded-xl bg-card border border-border space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-secondary border border-border font-bold uppercase text-primary">
                              {act.activityType}
                            </span>
                            <span className="text-xs font-bold text-white truncate">
                              {act.title || "Actividad CRM"}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(act.createdAt).toLocaleString("es-CO", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 whitespace-pre-line">{act.body}</p>
                        {act.dueAt && (
                          <div className="flex items-center justify-between pt-1 border-t border-border/60 text-[11px]">
                            <span className="text-amber-300 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Recordatorio: {new Date(act.dueAt).toLocaleString("es-CO")}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                completeTaskMutation.mutate({
                                  activityId: act.id,
                                  completed: !act.completedAt,
                                })
                              }
                              className={`px-2 py-0.5 rounded font-bold cursor-pointer flex items-center gap-1 ${
                                act.completedAt
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-secondary text-zinc-300 hover:text-white"
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              {act.completedAt ? "Completada" : "Marcar hecha"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {drawerTab === "email" && (
              <div className="space-y-5">
                {quota && (
                  <div className="p-3.5 rounded-xl bg-card border border-border flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Cuota mensual ({quota.planName}): </span>
                      <strong className="text-white">
                        {quota.maxEmailsPerMonth < 0
                          ? `${quota.used} enviados (Ilimitado)`
                          : `${quota.used} / ${quota.maxEmailsPerMonth} correos`}
                      </strong>
                    </div>
                    {!quota.canSend && (
                      <a
                        href="/planes"
                        className="text-primary font-black uppercase text-[11px] underline"
                      >
                        Ampliar Plan
                      </a>
                    )}
                  </div>
                )}

                <form onSubmit={handleSendEmail} className="p-4 rounded-2xl bg-card border border-border space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-white">
                      Redactar o Responder Correo con JanIA
                    </span>
                    <button
                      type="button"
                      disabled={generateDraftMutation.isPending}
                      onClick={() =>
                        generateDraftMutation.mutate({
                          leadId: lead.id,
                          intent: emailIntent,
                          tone: emailTone,
                          customInstructions: customInstr || undefined,
                          incomingMessage: incomingMsg || undefined,
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 border border-primary/40 text-primary text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer"
                    >
                      {generateDraftMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      Redactar con IA
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                        Objetivo del Correo
                      </label>
                      <select
                        value={emailIntent}
                        onChange={(e) => setEmailIntent(e.target.value as any)}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                      >
                        <option value="welcome">Bienvenida Inmediata</option>
                        <option value="followup_24h">Seguimiento 24h</option>
                        <option value="followup_72h">Propuesta de Cierre 72h</option>
                        <option value="match_alert">Alerta Match &gt;= 85%</option>
                        <option value="visit_confirmation">Confirmación de Visita</option>
                        <option value="reply">Responder Mensaje del Cliente</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                        Tono Comercial
                      </label>
                      <select
                        value={emailTone}
                        onChange={(e) => setEmailTone(e.target.value as any)}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                      >
                        <option value="profesional">Profesional / Ejecutivo</option>
                        <option value="cercano">Cercano y Cálido</option>
                        <option value="persuasivo">Persuasivo / Cierre</option>
                        <option value="ejecutivo">Corporativo Directo</option>
                      </select>
                    </div>
                  </div>

                  {emailIntent === "reply" && (
                    <textarea
                      rows={2}
                      placeholder="Pega aquí el mensaje o pregunta que envió el cliente para redactar la respuesta..."
                      value={incomingMsg}
                      onChange={(e) => setIncomingMsg(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground outline-none resize-none"
                    />
                  )}

                  <input
                    type="text"
                    placeholder="Instrucción extra para la IA (ej: mencionar financiación bancaria o parqueadero doble)"
                    value={customInstr}
                    onChange={(e) => setCustomInstr(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                  />

                  <input
                    type="text"
                    required
                    placeholder="Asunto del correo *"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold text-foreground outline-none focus:border-primary"
                  />

                  <textarea
                    required
                    rows={6}
                    placeholder="Cuerpo del correo (puedes editar libremente lo generado por la IA)..."
                    value={emailBodyText}
                    onChange={(e) => setEmailBodyText(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground outline-none focus:border-primary resize-y"
                  />

                  <label className="flex items-center gap-2 text-[11px] text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyOnOpen}
                      onChange={(e) => setNotifyOnOpen(e.target.checked)}
                      className="accent-amber-500"
                    />
                    Notificarme en tiempo real cuando abran este correo o enlace (Certificado Ley 527)
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                        Programar envío (opcional)
                      </label>
                      <input
                        type="datetime-local"
                        value={emailScheduledFor}
                        onChange={(e) => setEmailScheduledFor(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={
                        sendEmailMutation.isPending ||
                        !emailSubject.trim() ||
                        !emailBodyText.trim() ||
                        !editEmail
                      }
                      className="btn-gold px-4 py-2.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {sendEmailMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <SendHorizonal className="w-4 h-4" />
                      )}
                      {emailScheduledFor ? "Programar Envío" : "Enviar Correo Ahora"}
                    </button>
                  </div>
                  {!editEmail && (
                    <p className="text-[11px] text-rose-400">
                      Este prospecto no tiene un correo válido aún. Agrega uno en la pestaña "Ficha &amp; Match".
                    </p>
                  )}
                </form>

                <div className="space-y-2.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Correos del Prospecto ({detail.emails.length})
                  </h3>
                  {detail.emails.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center bg-card rounded-xl border border-border">
                      Sin correos enviados todavía.
                    </p>
                  ) : (
                    detail.emails.map((m: any) => (
                      <div key={m.id} className="p-3 rounded-xl bg-card border border-border text-xs space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-white truncate">{m.subject}</span>
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
                        <p className="text-[11px] text-zinc-400 line-clamp-2">{m.bodyText}</p>
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-border/60">
                          <div className="flex flex-wrap items-center gap-2">
                            {m.contentSha256 && (
                              <span className="text-[10px] font-mono text-zinc-400">
                                SHA-256: {String(m.contentSha256).slice(0, 10)}...
                              </span>
                            )}
                            {m.notifyOnOpen && (
                              <span className="text-[10px] text-amber-300 font-semibold">
                                Aviso en vivo activo
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={downloadingEmailId === m.id}
                            onClick={() => {
                              setDownloadingEmailId(m.id);
                              downloadCertMutation.mutate({ messageId: m.id });
                            }}
                            className="px-2.5 py-1 rounded-lg bg-primary/15 hover:bg-primary/25 border border-primary/40 text-primary text-[10px] font-black uppercase inline-flex items-center gap-1 cursor-pointer"
                          >
                            {downloadingEmailId === m.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <FileDown className="w-3 h-3" />
                            )}
                            Constancia PDF (Ley 527)
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {drawerTab === "profile" && (
              <div className="space-y-5">
                <form onSubmit={handleSaveProfile} className="p-4 rounded-2xl bg-card border border-border space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="lead-edit-name" className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                        Nombre Completo *
                      </label>
                      <input
                        id="lead-edit-name"
                        type="text"
                        required
                        minLength={2}
                        autoFocus
                        data-error="lead-edit-name-err"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="vecy-field-input w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                      />
                      <div id="lead-edit-name-err" className="vecy-field-error">
                        <span role="img" aria-label="Error">❌</span> Ingresa al menos 2 caracteres.
                      </div>
                    </div>

                    <div>
                      <label htmlFor="lead-edit-email" className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                        Correo Electrónico
                      </label>
                      <span id="lead-edit-email-hint" className="text-[10px] text-muted-foreground block mb-1">
                        Formato: cliente@dominio.com
                      </span>
                      <input
                        id="lead-edit-email"
                        type="email"
                        autoComplete="email"
                        aria-describedby="lead-edit-email-hint"
                        data-error="lead-edit-email-err"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="vecy-field-input w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                      />
                      <div id="lead-edit-email-err" className="vecy-field-error">
                        <span role="img" aria-label="Error">❌</span> Ingresa un correo electrónico válido.
                      </div>
                    </div>

                    <div>
                      <label htmlFor="lead-edit-phone" className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                        Teléfono / WhatsApp
                      </label>
                      <input
                        id="lead-edit-phone"
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="lead-edit-temp" className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                        Temperatura
                      </label>
                      <select
                        id="lead-edit-temp"
                        value={editTemp}
                        onChange={(e) => setEditTemp(e.target.value as CrmLeadTemperature)}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                      >
                        <option value="hot">Caliente (Listo para visita/cierre)</option>
                        <option value="warm">Tibio (En evaluación)</option>
                        <option value="cold">Frío (Largo plazo)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="lead-edit-budget" className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                        Presupuesto Estimado (COP)
                      </label>
                      <input
                        id="lead-edit-budget"
                        type="number"
                        min={0}
                        value={editBudget}
                        onChange={(e) => setEditBudget(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="lead-edit-followup" className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                        Próximo Seguimiento
                      </label>
                      <input
                        id="lead-edit-followup"
                        type="datetime-local"
                        value={editFollowUp}
                        onChange={(e) => setEditFollowUp(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="lead-edit-city" className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                        Ciudad de Interés
                      </label>
                      <input
                        id="lead-edit-city"
                        type="text"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="lead-edit-zone" className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                        Zona / Barrio
                      </label>
                      <input
                        id="lead-edit-zone"
                        type="text"
                        value={editZone}
                        onChange={(e) => setEditZone(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="lead-edit-notes" className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                      Notas Estratégicas del Asesor
                    </label>
                    <textarea
                      id="lead-edit-notes"
                      rows={3}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground outline-none resize-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={updateLeadMutation.isPending}
                      className="btn-gold px-5 py-2.5 text-xs font-black uppercase tracking-wider cursor-pointer"
                    >
                      {updateLeadMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                    </button>
                  </div>
                </form>

                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Matches Compatibles &gt;= 85% ({detail.matches.length})
                  </h3>
                  {detail.matches.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center bg-card rounded-xl border border-border">
                      Sin matches &gt;= 85% vinculados todavía.
                    </p>
                  ) : (
                    detail.matches.map((m: any) => (
                      <div key={m.id} className="p-3 rounded-xl bg-card border border-border flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{m.propertyName}</p>
                          <p className="text-[11px] text-zinc-400">
                            {m.propertyZone}, {m.propertyCity} • $
                            {Number(m.propertyPrice || 0).toLocaleString("es-CO")} COP
                          </p>
                        </div>
                        <span className="badge-gold shrink-0">
                          {Math.round(Number(m.matchScore || 0))}% Match
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}
