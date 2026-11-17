import React, { useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
// @ts-ignore JSX signature pad component
import SignaturePadComponent from "@/components/agenda-pro/SignaturePad.jsx";
import {
  ShieldCheck,
  FileText,
  CheckCircle2,
  Download,
  Phone,
  Lock,
  Sparkles,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export default function FirmaMatch() {
  const [, params] = useRoute("/firma-match/:token");
  const token = params?.token || "";

  const { data, isLoading, refetch } = trpc.janIA.getMatchSignatureStatus.useQuery(
    { token },
    { enabled: Boolean(token) }
  );

  const [signerName, setSignerName] = useState("");
  const [signerDocumentType, setSignerDocumentType] = useState("CC");
  const [signerDocument, setSignerDocument] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [signatureBase64, setSignatureBase64] = useState("");

  React.useEffect(() => {
    if (data?.found && data.userName && !signerName) {
      setSignerName(data.userName);
    }
  }, [data?.found, data?.userName]);

  const submitMutation = trpc.janIA.submitMatchSignature.useMutation({
    onSuccess: (res) => {
      toast.success("¡Firma registrada! Te enviamos el PDF y tus códigos por WhatsApp.");
      refetch();
      if (res?.cuv) {
        // Estado actualizado vía refetch()
      }
    },
    onError: (err) => {
      toast.error(err.message || "No se pudo registrar la firma. Intenta de nuevo.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim()) {
      toast.error("Por favor escribe tu nombre completo.");
      return;
    }
    if (!signerDocument.trim()) {
      toast.error("Por favor ingresa tu número de documento.");
      return;
    }
    if (!acceptedTerms) {
      toast.error("Debes marcar la casilla de aceptación de Términos y Política de Privacidad.");
      return;
    }
    if (!signatureBase64) {
      toast.error("Por favor traza tu firma manuscrita dentro del recuadro.");
      return;
    }

    submitMutation.mutate({
      token,
      signerName: signerName.trim(),
      signerDocumentType,
      signerDocument: signerDocument.trim(),
      signatureBase64,
      acceptedTerms,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6 gap-4">
        <Loader2 className="w-10 h-10 text-[#bf953f] animate-spin" />
        <p className="text-xs uppercase tracking-widest text-zinc-400">Cargando acuerdo seguro VECY...</p>
      </div>
    );
  }

  if (!data || !data.found) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl bg-zinc-950 border border-white/10 p-7 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
          <h1 className="text-lg font-black text-white">Enlace de Firma no Encontrado</h1>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Este enlace puede haber expirado o estar mal copiado. Pídele a JanIA un nuevo enlace en WhatsApp o contáctanos al +57 316 656 9719.
          </p>
        </div>
      </div>
    );
  }

  const isSigned = data.status === "signed";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b0b0e] via-[#09090b] to-black text-white py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header Marca */}
        <div className="rounded-3xl bg-zinc-950/90 border border-[#bf953f]/40 p-5 sm:p-6 shadow-[0_0_40px_rgba(191,149,63,0.18)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#bf953f]/20 text-[#fcf6ba] border border-[#bf953f]/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                Validación Jurídica Ley 527/1999
              </span>
              <h1 className="text-lg sm:text-2xl font-black mt-2 text-white">
                VECY BIENES RAÍCES
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                {data.termsTitle}
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-[10px] text-zinc-500 uppercase font-mono">Token</div>
              <div className="text-xs font-mono font-bold text-[#fcf6ba]">{data.token}</div>
            </div>
          </div>

          {/* Resumen de Opciones Encontradas (Sin exponer códigos hasta firmar) */}
          <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#bf953f]" />
                Coincidencias listas para liberar ({data.matchesCount}):
              </span>
              <span className="text-[10px] text-zinc-400">{data.termsRoleLabel}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(isSigned ? data.unlockedCodes : data.matchesPreview).map((m: any, i: number) => (
                <div
                  key={i}
                  className="rounded-xl bg-black/60 border border-white/10 p-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-[#fcf6ba]">
                      {isSigned ? `${m.matchCode}${m.propertyCode ? ` · ${m.propertyCode}` : ""}` : `Opción #${i + 1} (Bloqueada)`}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-black text-[10px]">
                      {m.score}% Match
                    </span>
                  </div>
                  <div className="text-zinc-300 font-semibold">{m.tipoInmueble} en {m.zona}</div>
                  <div className="text-[11px] text-zinc-400">
                    {m.ciudad} · {m.precioOCanon}{m.area ? ` · ${m.area}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Estado ya firmado vs Formulario de Firma */}
        {isSigned ? (
          <div className="rounded-3xl bg-emerald-950/20 border border-emerald-500/40 p-6 space-y-5 text-center">
            <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
            <div className="space-y-1">
              <h2 className="text-xl font-black text-white">¡Acuerdo Firmado y Códigos Desbloqueados!</h2>
              <p className="text-xs text-zinc-300">
                CUV de verificación: <span className="font-mono font-bold text-[#fcf6ba]">{data.cuv}</span>
              </p>
              <p className="text-xs text-zinc-400">
                JanIA ya despachó este acuerdo firmado en PDF junto con tus códigos directamente a tu WhatsApp.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {data.signedPdfUrl && (
                <a
                  href={data.signedPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/15"
                >
                  <Download className="w-4 h-4 text-[#bf953f]" />
                  Descargar PDF Firmado
                </a>
              )}
              <a
                href={`https://wa.me/573166569719?text=${encodeURIComponent(
                  `Hola Eduardo/Jani, acabo de firmar en el portal y JanIA me entregó el código ${data.unlockedCodes?.[0]?.matchCode || ""} para coordinar visita.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#bf953f] to-[#aa771c] text-xs font-black text-black shadow-lg"
              >
                <Phone className="w-4 h-4" />
                Hablar con Eduardo o Jani (+57 316 656 9719)
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-3xl bg-zinc-950/90 border border-white/10 p-5 sm:p-6 space-y-5">
            {/* Cláusulas de T&C y Política de Privacidad */}
            <div className="space-y-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#fcf6ba] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#bf953f]" />
                Términos, Condiciones y Política de Privacidad
              </h2>
              <div className="rounded-2xl bg-black/60 border border-white/10 p-4 space-y-2.5 max-h-60 overflow-y-auto text-xs text-zinc-300 leading-relaxed">
                {data.termsClauses.map((clause: string, idx: number) => (
                  <p key={idx}>{clause}</p>
                ))}
              </div>
            </div>

            {/* Datos del Firmante */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Tu nombre y apellidos completos"
                  className="w-full bg-black/70 border border-white/15 focus:border-[#bf953f] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Tipo Doc. *</label>
                <select
                  value={signerDocumentType}
                  onChange={(e) => setSignerDocumentType(e.target.value)}
                  className="w-full bg-black/70 border border-white/15 focus:border-[#bf953f] rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                >
                  <option value="CC">C.C.</option>
                  <option value="CE">C.E.</option>
                  <option value="NIT">NIT</option>
                  <option value="PAS">Pasaporte</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Número de Documento *</label>
                <input
                  type="text"
                  value={signerDocument}
                  onChange={(e) => setSignerDocument(e.target.value)}
                  placeholder="Ej: 1018456789"
                  className="w-full bg-black/70 border border-white/15 focus:border-[#bf953f] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none"
                />
              </div>
            </div>

            {/* Checkbox de Aceptación */}
            <label className="flex items-start gap-2.5 cursor-pointer rounded-2xl bg-[#bf953f]/10 border border-[#bf953f]/30 p-3.5 text-xs text-zinc-200">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-[#bf953f]"
              />
              <span>
                <strong>Sí acepto</strong> los Términos y Condiciones de VECY BIENES RAÍCES y la Política de Tratamiento de Datos Personales (Ley 1581 de 2012).
              </span>
            </label>

            {/* Recuadro SignaturePad Táctil */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-zinc-300 block">
                Firma Manuscrita en Pantalla (usa tu dedo o mouse) *
              </label>
              <SignaturePadComponent onSignatureChange={setSignatureBase64} />
            </div>

            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#bf953f] to-[#aa771c] hover:opacity-95 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(191,149,63,0.35)] cursor-pointer disabled:opacity-50"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generando PDF y Liberando Códigos...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Firmar Acuerdo y Desbloquear Códigos Match
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
