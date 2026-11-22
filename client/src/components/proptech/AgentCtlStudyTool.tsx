import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  FileCheck2,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Upload,
  Download,
  Loader2,
  History,
  UserCheck,
  AlertTriangle,
  Bot,
} from "lucide-react";
import { toast } from "sonner";

type LegalSuiteTab = "ctl" | "identity" | "valuation" | "history";

function QuotaMeter({
  label,
  used,
  limit,
  icon,
}: {
  label: string;
  used: number;
  limit: number;
  icon: React.ReactNode;
}) {
  const isUnlimited = limit < 0;
  const maxVal = isUnlimited ? Math.max(used || 1, 100) : Math.max(limit, 1);
  const currentVal = isUnlimited ? Math.min(used, maxVal) : Math.min(used, limit);

  return (
    <div className="p-4 rounded-xl border border-border bg-secondary/40 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <span className="text-[11px] font-black text-primary tabular-nums">
          {isUnlimited ? `${used} / Ilimitado` : limit === 0 ? "No incluido" : `${used} / ${limit}`}
        </span>
      </div>
      <progress
        className="vecy-quota-progress"
        value={limit === 0 ? 0 : currentVal}
        max={maxVal}
        aria-label={`Consumo mensual de ${label}: ${isUnlimited ? "ilimitado" : `${used} de ${limit}`}`}
      />
    </div>
  );
}

export default function AgentCtlStudyTool() {
  const [activeSubTab, setActiveSubTab] = useState<LegalSuiteTab>("ctl");
  const [statusMessage, setStatusMessage] = useState<string>("");

  const { data: suiteData, isLoading: isLoadingSuite, refetch: refetchSuite } =
    trpc.agent.getLegalSuiteSummary.useQuery();

  // ── 1. Estado Estudio de Títulos CTL / SNR ──
  const [ctlText, setCtlText] = useState("");
  const [matriculaHint, setMatriculaHint] = useState("");
  const [ctlFileBase64, setCtlFileBase64] = useState<string | undefined>(undefined);
  const [ctlFileMimeType, setCtlFileMimeType] = useState<string | undefined>(undefined);
  const [ctlFileName, setCtlFileName] = useState<string>("");
  const [ctlError, setCtlError] = useState<string>("");

  const ctlMutation = trpc.agent.runCtlTitleStudy.useMutation({
    onSuccess: (res) => {
      if (res.success && res.report) {
        setCtlError("");
        setStatusMessage(`Estudio de Títulos completado: ${res.report.verdictLabel}`);
        toast.success(`Estudio CTL completado (${res.report.verdictCode})`);
        refetchSuite();
      } else {
        setCtlError(res.message || "El documento no pudo reconocerse como Certificado de Tradición y Libertad SNR.");
        setStatusMessage("No se reconoció un CTL válido. Revisa el documento.");
      }
    },
    onError: (err) => {
      setCtlError(err.message);
      setStatusMessage(err.message);
      toast.error(err.message);
    },
  });

  // ── 2. Estado Verificación de Identidad y Antecedentes ──
  const [idDocType, setIdDocType] = useState<"CC" | "CE" | "NIT" | "PAS">("CC");
  const [idDocNumber, setIdDocNumber] = useState("");
  const [idFullName, setIdFullName] = useState("");
  const [idNumTouchedError, setIdNumTouchedError] = useState<string>("");

  const identityMutation = trpc.agent.runAgentIdentityCheck.useMutation({
    onSuccess: (res) => {
      setIdNumTouchedError("");
      setStatusMessage(`Verificación completada: ${res.statusBadge}`);
      toast.success(`Verificación de identidad: ${res.statusBadge}`);
      refetchSuite();
    },
    onError: (err) => {
      setStatusMessage(err.message);
      toast.error(err.message);
    },
  });

  // ── 3. Estado Avalúo Comercial ACM ──
  const [valCity, setValCity] = useState("Bogotá");
  const [valZone, setValZone] = useState("Cedritos");
  const [valType, setValType] = useState("Apartamento");
  const [valArea, setValArea] = useState(85);
  const [valAge, setValAge] = useState(10);
  const [valGarages, setValGarages] = useState(1);
  const [valFloor, setValFloor] = useState(4);
  const [valElevator, setValElevator] = useState(true);
  const [valRemodeled, setValRemodeled] = useState(false);

  const valuationMutation = trpc.agent.runAgentValuation.useMutation({
    onSuccess: (res) => {
      setStatusMessage(
        `Avalúo ACM generado: $${Math.round(res.valuation.suggestedCommercialValue).toLocaleString("es-CO")} COP`,
      );
      toast.success("Avalúo ACM calculado y guardado en historial");
      refetchSuite();
    },
    onError: (err) => {
      setStatusMessage(err.message);
      toast.error(err.message);
    },
  });

  const handleCtlFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setCtlError("El archivo supera 10 MB. Reduce el tamaño del PDF o imagen.");
      return;
    }
    setCtlError("");
    setCtlFileName(file.name);
    setCtlFileMimeType(file.type || "application/pdf");
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setCtlFileBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitCtl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ctlText.trim() && !ctlFileBase64) {
      setCtlError("Adjunta un PDF/imagen del Certificado de Tradición o pega el texto SNR.");
      return;
    }
    setCtlError("");
    setStatusMessage("Analizando Certificado de Tradición y Libertad SNR...");
    ctlMutation.mutate({
      text: ctlText.trim() || undefined,
      fileBase64: ctlFileBase64,
      fileMimeType: ctlFileMimeType,
      fileName: ctlFileName || undefined,
      matriculaHint: matriculaHint.trim() || undefined,
    });
  };

  const handleSubmitIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = idDocNumber.replace(/[^0-9A-Za-z]/g, "").trim();
    if (cleaned.length < 4) {
      setIdNumTouchedError("Ingresa un número de documento válido de mínimo 4 caracteres.");
      return;
    }
    setIdNumTouchedError("");
    setStatusMessage("Consultando validación documental y antecedentes...");
    identityMutation.mutate({
      tipoDocumento: idDocType,
      numeroDocumento: cleaned,
      nombreCompleto: idFullName.trim() || undefined,
    });
  };

  const handleSubmitValuation = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage("Calculando homologación ACM Fitto y Corvini...");
    valuationMutation.mutate({
      ciudad: valCity.trim(),
      zonaOBarrio: valZone.trim(),
      tipoInmueble: valType,
      areaM2: Number(valArea) || 75,
      antiguedadAnos: Number(valAge) || 0,
      garajes: Number(valGarages) || 0,
      piso: Number(valFloor) || 1,
      tieneAscensor: valElevator,
      esRemodelado: valRemodeled,
    });
  };

  const quotas = suiteData?.quotas;
  const logs = suiteData?.logs || [];

  return (
    <div className="space-y-6">
      {/* Encabezado y cuotas en tiempo real */}
      <div className="panel-card p-6 border border-primary/30 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">
              Suite Legal & Técnica SaaS • Plan {quotas?.planName || "Cargando..."}
            </span>
            <h2 className="text-2xl font-black text-foreground mt-1">
              Estudios de Títulos SNR/CTL, Identidad y Avalúos ACM con Cuotas Auditables
            </h2>
          </div>
          <a
            href="/planes"
            className="px-4 py-2 rounded-xl border border-primary/40 bg-primary/10 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
          >
            Gestionar Plan / Cuotas
          </a>
        </div>

        <div role="status" aria-live="polite" className="text-xs text-muted-foreground min-h-[1rem]">
          {statusMessage}
        </div>

        {isLoadingSuite || !quotas ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-secondary/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <QuotaMeter
              label="Mensajes JanIA Privada"
              used={quotas.aiMessages.used}
              limit={quotas.aiMessages.limit}
              icon={<Bot className="w-4 h-4 text-primary" />}
            />
            <QuotaMeter
              label="Estudios CTL (SNR)"
              used={quotas.ctlStudies.used}
              limit={quotas.ctlStudies.limit}
              icon={<FileCheck2 className="w-4 h-4 text-emerald-400" />}
            />
            <QuotaMeter
              label="Antecedentes / ID"
              used={quotas.identityChecks.used}
              limit={quotas.identityChecks.limit}
              icon={<UserCheck className="w-4 h-4 text-sky-400" />}
            />
            <QuotaMeter
              label="Avalúos ACM"
              used={quotas.valuations.used}
              limit={quotas.valuations.limit}
              icon={<TrendingUp className="w-4 h-4 text-amber-400" />}
            />
          </div>
        )}

        {/* Sub-navegador de la Suite Legal */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={() => setActiveSubTab("ctl")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border cursor-pointer transition-colors ${
              activeSubTab === "ctl"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            <FileCheck2 className="w-4 h-4" /> Estudio de Títulos CTL (SNR)
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("identity")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border cursor-pointer transition-colors ${
              activeSubTab === "identity"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Identidad & Antecedentes
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("valuation")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border cursor-pointer transition-colors ${
              activeSubTab === "valuation"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Avalúo ACM Fitto & Corvini
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("history")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border cursor-pointer transition-colors ${
              activeSubTab === "history"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            <History className="w-4 h-4" /> Trazabilidad ({logs.length})
          </button>
        </div>
      </div>

      {/* PANEL 1: ESTUDIO DE TÍTULOS CTL */}
      {activeSubTab === "ctl" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleSubmitCtl} className="panel-card p-6 border border-border space-y-4">
            <h3 className="text-lg font-black text-foreground">
              1. Analizar Certificado de Tradición y Libertad (SNR)
            </h3>
            <p className="text-xs text-muted-foreground">
              Sube el PDF o imagen del Certificado SNR o pega las anotaciones. JanIA detecta embargos, hipotecas vigentes, patrimonio de familia, falsa tradición y genera informe PDF membretado.
            </p>

            <div>
              <label htmlFor="ctl-file-upload" className="block text-xs font-bold text-foreground mb-1.5">
                Archivo PDF o Imagen del CTL
              </label>
              <label
                htmlFor="ctl-file-upload"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 cursor-pointer text-xs font-bold text-primary"
              >
                <Upload className="w-4 h-4" />
                <span>{ctlFileName ? `Adjunto: ${ctlFileName}` : "Seleccionar PDF o Foto del Certificado"}</span>
              </label>
              <input
                id="ctl-file-upload"
                type="file"
                accept=".pdf,image/*"
                onChange={handleCtlFileSelect}
                className="sr-only"
              />
            </div>

            <div>
              <label htmlFor="ctl-matricula-hint" className="block text-xs font-bold text-foreground mb-1">
                Matrícula Inmobiliaria (opcional)
              </label>
              <input
                id="ctl-matricula-hint"
                type="text"
                value={matriculaHint}
                onChange={(e) => setMatriculaHint(e.target.value)}
                aria-invalid="false"
                placeholder="Ej: 50N-20145891"
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground"
              />
            </div>

            <div>
              <label htmlFor="ctl-text-input" className="block text-xs font-bold text-foreground mb-1">
                Texto del Certificado SNR (opcional si adjuntaste archivo)
              </label>
              <textarea
                id="ctl-text-input"
                rows={6}
                value={ctlText}
                onChange={(e) => {
                  setCtlText(e.target.value);
                  if (ctlError) setCtlError("");
                }}
                aria-invalid={ctlError ? "true" : "false"}
                placeholder="Pega aquí las anotaciones del Certificado de Tradición y Libertad (Oficina de Registro, Matrícula, Especificación COMPRAVENTA / HIPOTECA / EMBARGO...)"
                className="vecy-field-input w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground"
              />
              {ctlError && (
                <p role="status" aria-live="polite" className="mt-1 text-xs font-semibold text-rose-400">
                  {ctlError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={ctlMutation.isPending}
              className="btn-gold w-full py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {ctlMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Auditando Folio SNR...
                </>
              ) : (
                <>
                  <FileCheck2 className="w-4 h-4" />
                  Ejecutar Estudio de Títulos CTL
                </>
              )}
            </button>
          </form>

          <div className="panel-card p-6 border border-border space-y-4">
            <h3 className="text-lg font-black text-foreground">Dictamen Registral y Alertas</h3>
            {ctlMutation.data?.report ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl border border-primary/40 bg-primary/10 space-y-1">
                  <div className="font-black text-sm text-foreground">
                    {ctlMutation.data.report.verdictEmoji} {ctlMutation.data.report.verdictLabel}
                  </div>
                  <p className="text-muted-foreground">{ctlMutation.data.report.riskHeadline}</p>
                  <div className="text-[11px] font-mono pt-1 text-primary">
                    Matrícula: {ctlMutation.data.report.metadata.matriculaInmobiliaria || "Detectada"} ·
                    Anotaciones: {ctlMutation.data.report.auditoriaAnotaciones.length}
                  </div>
                </div>

                {ctlMutation.data.report.alertasCriticasVigentes.length > 0 && (
                  <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 space-y-1">
                    <div className="font-bold text-rose-300 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" /> Alertas Críticas Vigentes (
                      {ctlMutation.data.report.alertasCriticasVigentes.length})
                    </div>
                    {ctlMutation.data.report.alertasCriticasVigentes.map((a, idx) => (
                      <div key={idx} className="text-[11px] text-rose-200">
                        • Anotación #{a.numero}: {a.especificacion} — {a.impactoJuridico}
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3 rounded-xl bg-secondary/60 border border-border whitespace-pre-line max-h-60 overflow-y-auto text-[11px] leading-relaxed">
                  {ctlMutation.data.report.whatsappSummary}
                </div>

                {ctlMutation.data.pdfUrl && (
                  <a
                    href={ctlMutation.data.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                  >
                    <Download className="w-4 h-4" />
                    Descargar Informe Jurídico CTL en PDF
                  </a>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                <FileCheck2 className="w-10 h-10 mx-auto text-muted-foreground/60" />
                <p>El dictamen jurídico del folio aparecerá aquí con semáforo de viabilidad y PDF descargable.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PANEL 2: VERIFICACIÓN DE IDENTIDAD Y ANTECEDENTES */}
      {activeSubTab === "identity" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleSubmitIdentity} className="panel-card p-6 border border-border space-y-4">
            <h3 className="text-lg font-black text-foreground">
              2. Verificación de Identidad y Antecedentes Judiciales
            </h3>
            <p className="text-xs text-muted-foreground">
              Valida contrapartes (arrendatarios, compradores o propietarios) antes de firmar contratos o visitar inmuebles.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="id-doc-type" className="block text-xs font-bold text-foreground mb-1">
                  Tipo de Documento
                </label>
                <select
                  id="id-doc-type"
                  value={idDocType}
                  onChange={(e) => setIdDocType(e.target.value as any)}
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground"
                >
                  <option value="CC">Cédula (CC)</option>
                  <option value="CE">Extranjería (CE)</option>
                  <option value="NIT">NIT</option>
                  <option value="PAS">Pasaporte (PAS)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="id-doc-number" className="block text-xs font-bold text-foreground mb-1">
                  Número de Documento *
                </label>
                <input
                  id="id-doc-number"
                  type="text"
                  required
                  minLength={4}
                  value={idDocNumber}
                  onChange={(e) => {
                    setIdDocNumber(e.target.value);
                    if (idNumTouchedError) setIdNumTouchedError("");
                  }}
                  aria-invalid={idNumTouchedError ? "true" : "false"}
                  placeholder="Ej: 1020304050"
                  className="vecy-field-input w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground"
                />
                {idNumTouchedError && (
                  <p role="status" aria-live="polite" className="mt-1 text-xs font-semibold text-rose-400">
                    {idNumTouchedError}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="id-full-name" className="block text-xs font-bold text-foreground mb-1">
                Nombre o Razón Social Declarada (para cotejo)
              </label>
              <input
                id="id-full-name"
                type="text"
                autoComplete="name"
                value={idFullName}
                onChange={(e) => setIdFullName(e.target.value)}
                aria-invalid="false"
                placeholder="Ej: Carlos Andrés Gómez"
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground"
              />
            </div>

            <button
              type="submit"
              disabled={identityMutation.isPending}
              className="btn-gold w-full py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {identityMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Consultando Fuentes Oficiales...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  Verificar Identidad y Antecedentes
                </>
              )}
            </button>
          </form>

          <div className="panel-card p-6 border border-border space-y-4">
            <h3 className="text-lg font-black text-foreground">Resultado de Seguridad Documental</h3>
            {identityMutation.data ? (
              <div className="space-y-3 text-xs">
                <div
                  className={`p-4 rounded-xl border ${
                    identityMutation.data.result.alertaSeguridad
                      ? "border-rose-500/40 bg-rose-500/10"
                      : "border-emerald-500/40 bg-emerald-500/10"
                  }`}
                >
                  <div className="font-black text-sm flex items-center gap-2">
                    {identityMutation.data.result.alertaSeguridad ? (
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    )}
                    Estado: {identityMutation.data.statusBadge}
                  </div>
                  {identityMutation.data.result.officialName && (
                    <p className="mt-1 font-semibold">
                      Titular registrado: {identityMutation.data.result.officialName}
                    </p>
                  )}
                  <p className="mt-2 text-muted-foreground">
                    {identityMutation.data.result.advertenciaAntecedentes ||
                      identityMutation.data.result.message ||
                      identityMutation.data.result.error ||
                      "Validación ejecutada."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Ingresa el documento para ejecutar la validación antifraude con trazabilidad en tu historial.
              </div>
            )}
          </div>
        </div>
      )}

      {/* PANEL 3: AVALÚO COMERCIAL ACM */}
      {activeSubTab === "valuation" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleSubmitValuation} className="panel-card p-6 border border-border space-y-4">
            <h3 className="text-lg font-black text-foreground">3. Avalúo Comparativo ACM (Fitto y Corvini)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="acm-city" className="block text-xs font-bold text-foreground mb-1">Ciudad *</label>
                <input
                  id="acm-city"
                  type="text"
                  required
                  value={valCity}
                  onChange={(e) => setValCity(e.target.value)}
                  aria-invalid="false"
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label htmlFor="acm-zone" className="block text-xs font-bold text-foreground mb-1">Barrio / Sector *</label>
                <input
                  id="acm-zone"
                  type="text"
                  required
                  value={valZone}
                  onChange={(e) => setValZone(e.target.value)}
                  aria-invalid="false"
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label htmlFor="acm-type" className="block text-xs font-bold text-foreground mb-1">Tipo de Inmueble</label>
                <select
                  id="acm-type"
                  value={valType}
                  onChange={(e) => setValType(e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground"
                >
                  <option value="Apartamento">Apartamento</option>
                  <option value="Casa">Casa</option>
                  <option value="Oficina">Oficina</option>
                  <option value="Local">Local</option>
                  <option value="Bodega">Bodega</option>
                  <option value="Lote">Lote</option>
                </select>
              </div>
              <div>
                <label htmlFor="acm-area" className="block text-xs font-bold text-foreground mb-1">Área (m²) *</label>
                <input
                  id="acm-area"
                  type="number"
                  min={1}
                  required
                  value={valArea}
                  onChange={(e) => setValArea(Number(e.target.value))}
                  aria-invalid="false"
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label htmlFor="acm-age" className="block text-xs font-bold text-foreground mb-1">Antigüedad (años)</label>
                <input
                  id="acm-age"
                  type="number"
                  min={0}
                  value={valAge}
                  onChange={(e) => setValAge(Number(e.target.value))}
                  aria-invalid="false"
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label htmlFor="acm-floor" className="block text-xs font-bold text-foreground mb-1">Piso / Garajes</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    id="acm-floor"
                    type="number"
                    min={1}
                    value={valFloor}
                    onChange={(e) => setValFloor(Number(e.target.value))}
                    aria-label="Número de piso"
                    className="w-full rounded-xl border border-border bg-secondary px-2 py-2 text-sm text-foreground"
                  />
                  <input
                    type="number"
                    min={0}
                    value={valGarages}
                    onChange={(e) => setValGarages(Number(e.target.value))}
                    aria-label="Número de garajes"
                    className="w-full rounded-xl border border-border bg-secondary px-2 py-2 text-sm text-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={valElevator}
                  onChange={(e) => setValElevator(e.target.checked)}
                />
                Tiene ascensor
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={valRemodeled}
                  onChange={(e) => setValRemodeled(e.target.checked)}
                />
                Remodelado / Acabados modernos
              </label>
            </div>

            <button
              type="submit"
              disabled={valuationMutation.isPending}
              className="btn-gold w-full py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {valuationMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calculando Homologación...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4" />
                  Calcular Avalúo ACM y Registrar Cuota
                </>
              )}
            </button>
          </form>

          <div className="panel-card p-6 border border-border space-y-4">
            <h3 className="text-lg font-black text-foreground">Escenarios de Valoración Comercial</h3>
            {valuationMutation.data?.valuation ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl border border-primary/40 bg-primary/10">
                  <div className="text-[11px] uppercase font-bold text-primary">Valor Comercial Sugerido</div>
                  <div className="text-2xl font-black text-foreground mt-1">
                    ${Math.round(valuationMutation.data.valuation.suggestedCommercialValue).toLocaleString("es-CO")} COP
                  </div>
                  <div className="text-muted-foreground mt-1">
                    ${Math.round(valuationMutation.data.valuation.valorM2Estimado).toLocaleString("es-CO")} / m² · Canon est.: $
                    {Math.round(valuationMutation.data.valuation.estimatedMonthlyRent).toLocaleString("es-CO")}/mes (Cap Rate{" "}
                    {valuationMutation.data.valuation.estimatedCapRate}%)
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-secondary/60 border border-border">
                    <div className="text-[10px] uppercase text-muted-foreground">Cierre Rápido</div>
                    <div className="font-bold text-sm mt-0.5">
                      ${Math.round(valuationMutation.data.valuation.minClosingPrice).toLocaleString("es-CO")}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary/60 border border-border">
                    <div className="text-[10px] uppercase text-muted-foreground">Techo Negociación</div>
                    <div className="font-bold text-sm mt-0.5">
                      ${Math.round(valuationMutation.data.valuation.maxNegotiationPrice).toLocaleString("es-CO")}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Completa los atributos del inmueble para obtener el avalúo comparativo ACM con consumo auditado.
              </div>
            )}
          </div>
        </div>
      )}

      {/* PANEL 4: TRAZABILIDAD HISTÓRICA */}
      {activeSubTab === "history" && (
        <div className="panel-card p-6 border border-border space-y-4">
          <h3 className="text-lg font-black text-foreground">Historial Auditable de Herramientas Legales & Técnicas</h3>
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">
              Aún no has ejecutado estudios CTL, verificaciones de identidad ni avalúos en este mes.
            </p>
          ) : (
            <div className="space-y-2.5">
              {logs.map((log: any) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl border border-border bg-secondary/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-primary/15 text-primary font-black uppercase text-[10px]">
                        {log.toolType}
                      </span>
                      <span className="font-bold text-foreground">{log.subjectLabel || log.referenceCode || "Registro"}</span>
                      {log.verdictOrStatus && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold text-[10px]">
                          {log.verdictOrStatus}
                        </span>
                      )}
                    </div>
                    {log.summaryText && <p className="text-muted-foreground line-clamp-2">{log.summaryText}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {log.pdfUrl && (
                      <a
                        href={log.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </a>
                    )}
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {new Date(log.createdAt).toLocaleString("es-CO")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
