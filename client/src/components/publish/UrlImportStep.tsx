import React, { useId, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Link2,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
  FileText,
  ArrowRight,
  CheckCircle2,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

const SUPPORTED_PORTALS = [
  "Wasi",
  "Qrador",
  "NexoApp",
  "Vitrina Raíz",
  "KiteProp",
  "Habi",
  "Fincaraíz",
  "Ciencuadras",
  "Metrocuadrado",
];

interface UrlImportStepProps {
  onImportSuccess: (result: any) => void;
  onFallbackToText: (suggestedHint?: string) => void;
  onAdvanceToMediaStep?: () => void;
}

function isValidHttpUrlSyntax(raw: string): boolean {
  const val = raw.trim();
  if (!val) return false;
  try {
    const parsed = new URL(val);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default function UrlImportStep({
  onImportSuccess,
  onFallbackToText,
  onAdvanceToMediaStep,
}: UrlImportStepProps) {
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();

  const [urlValue, setUrlValue] = useState("");
  const [hasInteracted, setHasInteracted] = useState(false);
  const [hasBlurred, setHasBlurred] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  const { data: quota, refetch: refetchQuota } = trpc.properties.getUrlImportQuota.useQuery(undefined, {
    retry: false,
  });

  const importMutation = trpc.properties.importFromUrl.useMutation({
    onSuccess: (res) => {
      setLastResult(res);
      refetchQuota();
      if (res.success && res.data) {
        onImportSuccess(res);
        toast.success(
          `¡Datos extraídos desde ${res.portal}! Revisa los campos editables y sube tus fotos propias en el Paso 2.`,
        );
      } else {
        toast.warning(res.message || "No se pudo extraer automáticamente desde el enlace.");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Error al importar desde la URL.");
    },
  });

  const validateUrlField = (val: string): string | null => {
    const trimmed = val.trim();
    if (!trimmed) return "Pega el enlace público del inmueble (ej. https://...).";
    if (!isValidHttpUrlSyntax(trimmed)) {
      return "Ingresa una URL válida que comience con https:// o http://.";
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasInteracted(true);
    setHasBlurred(true);
    const err = validateUrlField(urlValue);
    setValidationError(err);
    if (err) return;
    setLastResult(null);
    importMutation.mutate({ url: urlValue.trim() });
  };

  const isQuotaExhausted = quota && quota.limit >= 0 && quota.remaining <= 0;
  const showFieldError = Boolean(validationError && (hasBlurred || hasInteracted));

  return (
    <div className="space-y-3.5 animate-fade-in">
      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor={inputId} className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-[#bf953f]" />
            <span>Paso 1 · Enlace público del inmueble en portal o CRM externo *</span>
          </label>

          {quota && (
            <div className="inline-flex items-center gap-2 text-[10px] px-2.5 py-1 rounded-full bg-black/70 border border-white/10">
              <span className="text-zinc-400">Cuota mes ({quota.periodKey}):</span>
              <span className={`font-black ${isQuotaExhausted ? "text-rose-400" : "text-amber-300"}`}>
                {quota.limit < 0 ? `${quota.used} / Ilimitadas` : `${quota.used} / ${quota.limit}`}
              </span>
              {isQuotaExhausted && (
                <Link href="/planes">
                  <a className="text-[#fcf6ba] underline font-bold ml-1">Ampliar plan</a>
                </Link>
              )}
            </div>
          )}
        </div>

        <p id={hintId} className="text-[11px] text-zinc-400 leading-relaxed">
          Formato esperado: <span className="font-mono text-zinc-300">https://...</span> — Extraemos ficha técnica, precio, área, tipo y ubicación.
          <strong className="text-amber-300"> No copiamos fotos ni videos de terceros</strong> ni contactos externos; tus medios propios se cargan en el Paso 2.
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id={inputId}
            name="property_source_url"
            type="url"
            required
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="go"
            value={urlValue}
            aria-invalid={showFieldError ? "true" : "false"}
            aria-describedby={showFieldError ? `${hintId} ${errorId}` : hintId}
            onChange={(e) => {
              const next = e.target.value;
              setUrlValue(next);
              setHasInteracted(true);
              if (validationError && !validateUrlField(next)) {
                setValidationError(null);
              }
            }}
            onBlur={() => {
              setHasBlurred(true);
              if (hasInteracted) {
                setValidationError(validateUrlField(urlValue));
              }
            }}
            placeholder="https://info.wasi.co/... o https://www.fincaraiz.com.co/..."
            className={`flex-1 bg-black/75 border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none font-mono transition-colors ${
              showFieldError ? "border-rose-500 bg-rose-950/20" : "border-white/15 focus:border-[#bf953f]"
            }`}
          />

          <button
            type="submit"
            disabled={importMutation.isPending || Boolean(isQuotaExhausted)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#bf953f] via-[#d4af37] to-[#aa771c] hover:brightness-110 text-black font-black text-xs inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#bf953f]/30 disabled:opacity-50 shrink-0"
          >
            {importMutation.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Analizando URL...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Extraer Datos de URL</span>
              </>
            )}
          </button>
        </div>

        {showFieldError && (
          <p id={errorId} role="alert" className="text-[11px] text-rose-400 font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Error: {validationError}</span>
          </p>
        )}
      </form>

      {/* Chips de los 9 portales compatibles */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mr-1">Portales:</span>
        {SUPPORTED_PORTALS.map((portal) => (
          <span
            key={portal}
            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
              lastResult?.portal === portal
                ? "bg-[#bf953f]/20 text-[#fcf6ba] border-[#bf953f]/50"
                : "bg-black/50 text-zinc-400 border-white/10"
            }`}
          >
            {portal}
          </span>
        ))}
      </div>

      {/* Resultado exitoso o fallback WAF/SPA */}
      {lastResult && lastResult.success && (
        <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-2 text-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 text-emerald-300 font-bold">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{lastResult.message}</span>
            </div>
          </div>

          {Array.isArray(lastResult.warnings) && lastResult.warnings.length > 0 && (
            <ul className="text-[11px] text-amber-200/90 space-y-1 pl-6 list-disc">
              {lastResult.warnings.map((w: string, i: number) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}

          {onAdvanceToMediaStep && (
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={onAdvanceToMediaStep}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Revisa los campos abajo o ve al Paso 2 (Subir Fotos)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {lastResult && !lastResult.success && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-amber-950/35 border border-amber-500/45 space-y-2.5 text-xs"
        >
          <div className="flex items-start gap-2 text-amber-200 font-semibold">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
            <div>
              <p className="font-bold text-amber-300">
                {lastResult.status === "blocked_waf"
                  ? `Bloqueo anti-bot / WAF en ${lastResult.portal}`
                  : lastResult.status === "empty_spa"
                    ? `Página dinámica (SPA) sin datos en ${lastResult.portal}`
                    : lastResult.status === "ssrf_blocked"
                      ? "Enlace bloqueado por seguridad"
                      : "No fue posible extraer automáticamente"}
              </p>
              <p className="text-[11px] text-zinc-300 mt-0.5">{lastResult.message}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onFallbackToText(lastResult.portal)}
              className="px-3.5 py-2 rounded-lg bg-[#bf953f] hover:brightness-110 text-black font-black text-[11px] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Pegar Texto del Portal (Fallback Asistido)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

