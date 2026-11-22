import React, { useEffect, useId, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Clock,
  Mail,
  Building2,
  Loader2,
  X,
  ArrowRight,
  Users,
} from "lucide-react";
import {
  CRM_PIPELINE_STAGES,
  CRM_SOURCE_LABELS,
  CRM_TEMPERATURE_LABELS,
  type CrmLeadTemperature,
  type CrmPipelineStage,
} from "@shared/crm";
import LeadDetailDrawer from "./LeadDetailDrawer";

interface CrmKanbanBoardProps {
  onOpenEmailPanel?: () => void;
}

export default function CrmKanbanBoard({ onOpenEmailPanel }: CrmKanbanBoardProps) {
  const [scopeMode, setScopeMode] = useState<"agency" | "mine">("agency");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [tempFilter, setTempFilter] = useState<"all" | "cold" | "warm" | "hot">("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [draggedLeadId, setDraggedLeadId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<CrmPipelineStage | null>(null);

  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [drawerInitialTab, setDrawerInitialTab] = useState<"timeline" | "email" | "profile">("timeline");

  const createDialogRef = useRef<HTMLDialogElement>(null);
  const createTitleId = useId();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newInquiryType, setNewInquiryType] = useState<"buy" | "sell" | "rent" | "invest" | "general">("buy");
  const [newStage, setNewStage] = useState<CrmPipelineStage>("nuevo");
  const [newTemp, setNewTemp] = useState<CrmLeadTemperature>("warm");
  const [newBudget, setNewBudget] = useState("");
  const [newCity, setNewCity] = useState("Bogotá");
  const [newZone, setNewZone] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [enrollWelcome, setEnrollWelcome] = useState(true);

  const { data: board, isLoading, refetch } = trpc.crm.getBoard.useQuery({
    scopeMode,
    search: search || undefined,
    temperature: tempFilter,
    source: sourceFilter !== "all" ? sourceFilter : undefined,
  });

  useEffect(() => {
    const dlg = createDialogRef.current;
    if (!dlg) return;
    if (isCreateOpen && !dlg.open) {
      dlg.showModal();
    } else if (!isCreateOpen && dlg.open) {
      dlg.close();
    }
  }, [isCreateOpen]);

  useEffect(() => {
    const dlg = createDialogRef.current;
    if (!dlg) return;
    const onClose = () => {
      dlg.returnValue = "";
      setIsCreateOpen(false);
    };
    dlg.addEventListener("close", onClose);

    let cleanupFallback: (() => void) | undefined;
    if (!("closedBy" in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const isOutside = (e: PointerEvent) => {
        const r = dlg.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      const onDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e);
      };
      const onUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e)) dlg.close();
        pressedOutside = false;
      };
      dlg.addEventListener("pointerdown", onDown);
      dlg.addEventListener("pointerup", onUp);
      cleanupFallback = () => {
        dlg.removeEventListener("pointerdown", onDown);
        dlg.removeEventListener("pointerup", onUp);
      };
    }

    return () => {
      dlg.removeEventListener("close", onClose);
      if (cleanupFallback) cleanupFallback();
    };
  }, []);

  const updateStageMutation = trpc.crm.updateStage.useMutation({
    onSuccess: () => {
      toast.success("Prospecto movido de etapa");
      refetch();
    },
    onError: (err) => toast.error("Error moviendo etapa", { description: err.message }),
  });

  const createLeadMutation = trpc.crm.createLead.useMutation({
    onSuccess: () => {
      toast.success("Prospecto registrado en el CRM Kanban");
      setIsCreateOpen(false);
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewBudget("");
      setNewZone("");
      setNewNotes("");
      refetch();
    },
    onError: (err) => toast.error("Error creando prospecto", { description: err.message }),
  });

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!e.currentTarget.checkValidity()) {
      e.currentTarget.reportValidity();
      return;
    }
    createLeadMutation.mutate({
      name: newName.trim(),
      email: newEmail.trim() || null,
      phone: newPhone.trim() || null,
      inquiryType: newInquiryType,
      pipelineStage: newStage,
      temperature: newTemp,
      estimatedBudget: newBudget.trim() || null,
      preferredCity: newCity.trim() || null,
      preferredZone: newZone.trim() || null,
      notes: newNotes.trim() || null,
      enrollWelcomeSequence: enrollWelcome,
    });
  };

  const handleDropOnStage = (targetStage: CrmPipelineStage) => {
    setDragOverStage(null);
    if (!draggedLeadId) return;
    const current = board?.leads.find((l) => l.id === draggedLeadId);
    setDraggedLeadId(null);
    if (!current || current.pipelineStage === targetStage) return;
    updateStageMutation.mutate({ leadId: current.id, toStage: targetStage });
  };

  const openLead = (id: number, tab: "timeline" | "email" | "profile" = "timeline") => {
    setDrawerInitialTab(tab);
    setSelectedLeadId(id);
  };

  const kpis = board?.kpis;
  const emailQuota = board?.emailQuota;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Prospectos", value: kpis?.totalLeads ?? 0, accent: "text-primary" },
          { label: "Leads Calientes", value: kpis?.hotLeads ?? 0, accent: "text-rose-400" },
          { label: "Seguimientos Vencidos", value: kpis?.overdueFollowUps ?? 0, accent: "text-amber-400" },
          { label: "Visitas Agendadas", value: kpis?.visitsScheduled ?? 0, accent: "text-teal-400" },
          { label: "Cerrados Ganados", value: kpis?.wonLeads ?? 0, accent: "text-emerald-400" },
          {
            label: "Embudo Activo (COP)",
            value:
              kpis?.pipelineBudgetCop && kpis.pipelineBudgetCop > 0
                ? `$${Math.round(kpis.pipelineBudgetCop / 1_000_000).toLocaleString("es-CO")}M`
                : "$0",
            accent: "text-primary",
          },
        ].map((k) => (
          <div key={k.label} className="panel-card px-4 py-3.5 flex flex-col">
            <span className={`text-xl font-black ${k.accent}`}>{k.value}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
              {k.label}
            </span>
          </div>
        ))}
      </div>

      <div className="panel-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Buscar nombre, correo, zona..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground outline-none focus:border-primary"
            />
          </div>

          <select
            value={tempFilter}
            onChange={(e) => setTempFilter(e.target.value as any)}
            aria-label="Filtrar por temperatura"
            className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
          >
            <option value="all">Todas las temperaturas</option>
            <option value="hot">Calientes</option>
            <option value="warm">Tibios</option>
            <option value="cold">Fríos</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            aria-label="Filtrar por origen"
            className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
          >
            <option value="all">Todos los orígenes</option>
            <option value="microsite">Portal Marca Blanca</option>
            <option value="stealth_link">Enlace Blindado</option>
            <option value="tracking_link">Enlace Sensor</option>
            <option value="agenda">Vecy Agenda</option>
            <option value="manual">Manual</option>
          </select>

          {board?.canViewAgencyScope && (
            <button
              type="button"
              onClick={() => setScopeMode((prev) => (prev === "agency" ? "mine" : "agency"))}
              className="px-3 py-2 rounded-xl bg-secondary border border-border text-xs font-bold text-zinc-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-primary" />
              {scopeMode === "agency" ? "Vista: Agencia" : "Vista: Mis Leads"}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {emailQuota && (
            <button
              type="button"
              onClick={() => onOpenEmailPanel?.()}
              className="px-3 py-2 rounded-xl bg-secondary border border-border text-[11px] font-bold text-zinc-200 hover:border-primary/40 flex items-center gap-1.5 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-primary" />
              <span>
                Correos: {emailQuota.used}
                {emailQuota.maxEmailsPerMonth < 0 ? " (Ilim.)" : `/${emailQuota.maxEmailsPerMonth}`}
              </span>
            </button>
          )}

          <div className="inline-flex rounded-xl bg-secondary border border-border p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                viewMode === "kanban" ? "bg-primary text-black" : "text-muted-foreground"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                viewMode === "list" ? "bg-primary text-black" : "text-muted-foreground"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Lista
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="btn-gold px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nuevo Prospecto
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="panel-card py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Cargando embudo CRM...
          </p>
        </div>
      ) : viewMode === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {CRM_PIPELINE_STAGES.map((stage) => {
            const items = board?.columns?.[stage.id] ?? [];
            const isDragTarget = dragOverStage === stage.id;
            return (
              <div
                key={stage.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverStage !== stage.id) setDragOverStage(stage.id);
                }}
                onDragLeave={() => {
                  if (dragOverStage === stage.id) setDragOverStage(null);
                }}
                onDrop={() => handleDropOnStage(stage.id)}
                className={`w-[295px] shrink-0 rounded-2xl border p-3 flex flex-col gap-3 transition-colors ${
                  isDragTarget
                    ? "bg-primary/10 border-primary"
                    : "bg-card/80 border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/70">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: stage.colorHex }}
                    />
                    <h3 className="text-xs font-black uppercase tracking-wider text-white truncate">
                      {stage.label}
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-[11px] font-black text-zinc-300">
                    {items.length}
                  </span>
                </div>

                <div className="space-y-2.5 min-h-[220px]">
                  {items.length === 0 ? (
                    <div className="h-28 rounded-xl border border-dashed border-border/80 flex items-center justify-center text-[11px] text-muted-foreground text-center px-3">
                      Arrastra una tarjeta aquí
                    </div>
                  ) : (
                    items.map((lead: any) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => setDraggedLeadId(lead.id)}
                        onDragEnd={() => {
                          setDraggedLeadId(null);
                          setDragOverStage(null);
                        }}
                        className="p-3.5 rounded-xl bg-zinc-950/90 border border-border hover:border-primary/40 transition-all space-y-2.5 shadow-sm cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => openLead(lead.id, "timeline")}
                            className="text-left min-w-0 cursor-pointer group"
                          >
                            <p className="text-sm font-bold text-white group-hover:text-primary truncate">
                              {lead.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {lead.preferredZone || lead.preferredCity || "Colombia"}
                            </p>
                          </button>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase shrink-0 ${
                              lead.temperature === "hot"
                                ? "bg-rose-500/20 text-rose-300"
                                : lead.temperature === "warm"
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-sky-500/20 text-sky-300"
                            }`}
                          >
                            {CRM_TEMPERATURE_LABELS[lead.temperature as CrmLeadTemperature] || lead.temperature}
                          </span>
                        </div>

                        {lead.property && (
                          <p className="text-[11px] text-zinc-300 flex items-center gap-1 truncate">
                            <Building2 className="w-3 h-3 text-primary shrink-0" />
                            <span className="truncate">{lead.property.name}</span>
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                          {lead.estimatedBudget && Number(lead.estimatedBudget) > 0 && (
                            <span className="px-2 py-0.5 rounded bg-secondary text-primary font-bold">
                              ${Math.round(Number(lead.estimatedBudget) / 1_000_000)}M COP
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded bg-secondary text-zinc-400">
                            {CRM_SOURCE_LABELS[lead.source || "manual"] || lead.source}
                          </span>
                          {lead.isOverdueFollowUp && (
                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" /> Vencido
                            </span>
                          )}
                        </div>

                        <div className="pt-2 border-t border-border/70 flex items-center justify-between gap-2">
                          <select
                            aria-label={`Mover ${lead.name} de etapa`}
                            value={lead.pipelineStage}
                            onChange={(e) =>
                              updateStageMutation.mutate({
                                leadId: lead.id,
                                toStage: e.target.value as CrmPipelineStage,
                              })
                            }
                            className="bg-secondary border border-border rounded-lg px-2 py-1 text-[10px] font-bold text-zinc-200 outline-none max-w-[130px]"
                          >
                            {CRM_PIPELINE_STAGES.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.label}
                              </option>
                            ))}
                          </select>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openLead(lead.id, "email")}
                              title="Redactar correo con IA"
                              className="p-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary cursor-pointer"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openLead(lead.id, "timeline")}
                              title="Abrir detalle y notas"
                              className="p-1.5 rounded-lg bg-secondary hover:bg-muted text-zinc-200 cursor-pointer"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="panel-card overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3.5">Prospecto</th>
                <th className="p-3.5">Contacto</th>
                <th className="p-3.5">Etapa</th>
                <th className="p-3.5">Presupuesto / Zona</th>
                <th className="p-3.5">Origen</th>
                <th className="p-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {(board?.leads ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No hay prospectos registrados con estos filtros.
                  </td>
                </tr>
              ) : (
                board?.leads.map((lead: any) => (
                  <tr key={lead.id} className="hover:bg-secondary/30">
                    <td className="p-3.5 font-bold text-white">{lead.name}</td>
                    <td className="p-3.5 text-zinc-300">
                      <div>{lead.email && !lead.email.endsWith("@vecy.local") ? lead.email : "Sin correo"}</div>
                      <div className="text-[11px] text-muted-foreground">{lead.phone || "Sin teléfono"}</div>
                    </td>
                    <td className="p-3.5">
                      <select
                        value={lead.pipelineStage}
                        onChange={(e) =>
                          updateStageMutation.mutate({
                            leadId: lead.id,
                            toStage: e.target.value as CrmPipelineStage,
                          })
                        }
                        className="bg-background border border-border rounded-lg px-2 py-1 text-xs font-bold text-foreground"
                      >
                        {CRM_PIPELINE_STAGES.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3.5 text-zinc-300">
                      <div>
                        {lead.estimatedBudget
                          ? `$${Number(lead.estimatedBudget).toLocaleString("es-CO")} COP`
                          : "Por definir"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {lead.preferredZone || lead.preferredCity || "-"}
                      </div>
                    </td>
                    <td className="p-3.5 text-zinc-400">
                      {CRM_SOURCE_LABELS[lead.source || "manual"] || lead.source}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openLead(lead.id, "email")}
                          className="px-2.5 py-1.5 rounded-lg bg-primary/15 text-primary font-bold cursor-pointer"
                        >
                          Correo IA
                        </button>
                        <button
                          type="button"
                          onClick={() => openLead(lead.id, "timeline")}
                          className="px-2.5 py-1.5 rounded-lg bg-secondary text-white font-bold cursor-pointer"
                        >
                          Detalle
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <dialog
        ref={createDialogRef}
        {...({ closedby: "any" } as any)}
        aria-labelledby={createTitleId}
        className="vecy-native-modal m-auto w-[calc(100%-2rem)] max-w-xl rounded-2xl bg-zinc-950 text-foreground border border-primary/40 shadow-2xl p-0 overflow-hidden"
      >
        <div className="p-5 border-b border-border bg-black/80 flex items-center justify-between">
          <h2 id={createTitleId} className="text-lg font-black text-white">
            Nuevo Prospecto en CRM
          </h2>
          <button
            type="button"
            onClick={() => setIsCreateOpen(false)}
            aria-label="Cerrar formulario de nuevo prospecto"
            className="p-1.5 rounded-lg bg-secondary text-zinc-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[80dvh]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="crm-new-name" className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                Nombre del Prospecto *
              </label>
              <input
                id="crm-new-name"
                type="text"
                required
                minLength={2}
                autoFocus
                placeholder="Ej: Carolina Mendoza"
                data-error="crm-new-name-err"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="vecy-field-input w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none"
              />
              <div id="crm-new-name-err" className="vecy-field-error">
                <span role="img" aria-label="Error">❌</span> Escribe el nombre completo del prospecto.
              </div>
            </div>

            <div>
              <label htmlFor="crm-new-email" className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                Correo Electrónico
              </label>
              <span id="crm-new-email-hint" className="text-[10px] text-muted-foreground block mb-1">
                Formato: nombre@dominio.com
              </span>
              <input
                id="crm-new-email"
                type="email"
                autoComplete="email"
                aria-describedby="crm-new-email-hint"
                data-error="crm-new-email-err"
                placeholder="prospecto@correo.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="vecy-field-input w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none"
              />
              <div id="crm-new-email-err" className="vecy-field-error">
                <span role="img" aria-label="Error">❌</span> Ingresa un correo electrónico válido.
              </div>
            </div>

            <div>
              <label htmlFor="crm-new-phone" className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                WhatsApp / Celular
              </label>
              <input
                id="crm-new-phone"
                type="tel"
                placeholder="+57 300 000 0000"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none mt-5"
              />
            </div>

            <div>
              <label htmlFor="crm-new-inquiry" className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                Intención
              </label>
              <select
                id="crm-new-inquiry"
                value={newInquiryType}
                onChange={(e) => setNewInquiryType(e.target.value as any)}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none"
              >
                <option value="buy">Comprar inmueble</option>
                <option value="rent">Arrendar inmueble</option>
                <option value="sell">Vender / Consignar</option>
                <option value="invest">Inversión</option>
                <option value="general">Asesoría general</option>
              </select>
            </div>

            <div>
              <label htmlFor="crm-new-temp" className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                Temperatura
              </label>
              <select
                id="crm-new-temp"
                value={newTemp}
                onChange={(e) => setNewTemp(e.target.value as CrmLeadTemperature)}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none"
              >
                <option value="hot">Caliente</option>
                <option value="warm">Tibio</option>
                <option value="cold">Frío</option>
              </select>
            </div>

            <div>
              <label htmlFor="crm-new-budget" className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                Presupuesto (COP)
              </label>
              <input
                id="crm-new-budget"
                type="number"
                min={0}
                placeholder="450000000"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono text-foreground outline-none"
              />
            </div>

            <div>
              <label htmlFor="crm-new-stage" className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                Etapa Inicial
              </label>
              <select
                id="crm-new-stage"
                value={newStage}
                onChange={(e) => setNewStage(e.target.value as CrmPipelineStage)}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none"
              >
                {CRM_PIPELINE_STAGES.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="crm-new-city" className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                Ciudad
              </label>
              <input
                id="crm-new-city"
                type="text"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none"
              />
            </div>

            <div>
              <label htmlFor="crm-new-zone" className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                Sector / Barrio
              </label>
              <input
                id="crm-new-zone"
                type="text"
                placeholder="Ej: Cedritos, Poblado"
                value={newZone}
                onChange={(e) => setNewZone(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="crm-new-notes" className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
              Notas de Perfilamiento
            </label>
            <textarea
              id="crm-new-notes"
              rows={2}
              placeholder="Ej: Busca 3 alcobas, 2 garajes independientes, crédito preaprobado..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground outline-none resize-none"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={enrollWelcome}
              onChange={(e) => setEnrollWelcome(e.target.checked)}
              className="accent-amber-500"
            />
            Activar secuencia automática de bienvenida y seguimiento (0h / 24h / 72h)
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 rounded-xl bg-secondary text-xs font-bold text-zinc-300 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createLeadMutation.isPending}
              className="btn-gold px-5 py-2 text-xs font-black uppercase tracking-wider cursor-pointer"
            >
              {createLeadMutation.isPending ? "Creando..." : "Crear Prospecto"}
            </button>
          </div>
        </form>
      </dialog>

      <LeadDetailDrawer
        leadId={selectedLeadId}
        initialTab={drawerInitialTab}
        onClose={() => setSelectedLeadId(null)}
        onUpdated={() => refetch()}
      />
    </div>
  );
}
