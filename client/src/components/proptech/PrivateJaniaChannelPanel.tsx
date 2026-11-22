import React, { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Bot,
  MessageSquare,
  ShieldCheck,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  Send,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export default function PrivateJaniaChannelPanel() {
  const { data, isLoading, refetch } = trpc.agent.getPrivateJaniaChannels.useQuery();

  // Config Web Widget RAG
  const [webActive, setWebActive] = useState(true);
  const [assistantName, setAssistantName] = useState("Sofía IA");
  const [personaGender, setPersonaGender] = useState<"female" | "male">("female");
  const [personaTone, setPersonaTone] = useState<
    "normal" | "audaz" | "profesional" | "extrovertida" | "seria" | "cordial"
  >("profesional");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [systemPromptOverride, setSystemPromptOverride] = useState("");
  const [includeOwnInventory, setIncludeOwnInventory] = useState(true);
  const [includeNetworkInventory, setIncludeNetworkInventory] = useState(true);
  const [allowCrmCapture, setAllowCrmCapture] = useState(true);
  const [allowVisitScheduling, setAllowVisitScheduling] = useState(true);
  const [allowNotarialCalc, setAllowNotarialCalc] = useState(true);

  // Config WhatsApp Cloud API BYO-Number (Plan Élite IA)
  const [cloudActive, setCloudActive] = useState(false);
  const [wabaId, setWabaId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [webhookVerifyToken, setWebhookVerifyToken] = useState("");
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);

  // Simulador RAG en vivo
  const [ragTestMsg, setRagTestMsg] = useState(
    "Busco apartamento en Bogotá de 3 habitaciones hasta 800 millones, cuánto valen los gastos notariales?",
  );

  useEffect(() => {
    if (!data?.channels) return;
    const webCh = data.channels.find((c) => c.channelType === "web_widget");
    if (webCh) {
      setWebActive(webCh.isActive);
      setAssistantName(webCh.assistantName);
      setPersonaGender((webCh.personaGender as "female" | "male") || "female");
      setPersonaTone((webCh.personaTone as any) || "profesional");
      setWelcomeMessage(webCh.welcomeMessage || "");
      setSystemPromptOverride(webCh.systemPromptOverride || "");
      setIncludeOwnInventory(webCh.includeOwnInventory);
      setIncludeNetworkInventory(webCh.includeNetworkInventory);
      setAllowCrmCapture(webCh.allowCrmCapture);
      setAllowVisitScheduling(webCh.allowVisitScheduling);
      setAllowNotarialCalc(webCh.allowNotarialCalc);
    }
    const cloudCh = data.channels.find((c) => c.channelType === "whatsapp_cloud_api");
    if (cloudCh) {
      setCloudActive(cloudCh.isActive);
      setWabaId(cloudCh.wabaId || "");
      setPhoneNumberId(cloudCh.phoneNumberId || "");
      setDisplayPhoneNumber(cloudCh.displayPhoneNumber || "");
    }
  }, [data]);

  const upsertMutation = trpc.agent.upsertPrivateJaniaChannel.useMutation({
    onSuccess: (res) => {
      toast.success(
        res.channelType === "whatsapp_cloud_api"
          ? "Canal WhatsApp Cloud API BYO-Number guardado y cifrado con AES-256-GCM"
          : "Configuración RAG de JanIA Privada guardada",
      );
      setAccessToken("");
      setAppSecret("");
      setWebhookVerifyToken("");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const testRagMutation = trpc.agent.testPrivateJaniaRag.useMutation({
    onError: (err) => toast.error(err.message),
  });

  const quotas = data?.quotas;
  const aiQuota = quotas?.aiMessages;
  const isUnlimited = (aiQuota?.limit ?? 0) < 0;
  const aiMax = isUnlimited ? Math.max(aiQuota?.used || 1, 100) : Math.max(aiQuota?.limit || 1, 1);

  const cloudExisting = data?.channels.find((c) => c.channelType === "whatsapp_cloud_api");

  const handleSaveWebChannel = (e: React.FormEvent) => {
    e.preventDefault();
    upsertMutation.mutate({
      channelType: "web_widget",
      isActive: webActive,
      assistantName,
      personaGender,
      personaTone,
      welcomeMessage: welcomeMessage || null,
      systemPromptOverride: systemPromptOverride || null,
      includeOwnInventory,
      includeNetworkInventory,
      allowCrmCapture,
      allowVisitScheduling,
      allowNotarialCalc,
    });
  };

  const handleSaveCloudChannel = (e: React.FormEvent) => {
    e.preventDefault();
    upsertMutation.mutate({
      channelType: "whatsapp_cloud_api",
      isActive: cloudActive,
      assistantName,
      personaGender,
      personaTone,
      systemPromptOverride: systemPromptOverride || null,
      includeOwnInventory,
      includeNetworkInventory,
      allowCrmCapture,
      allowVisitScheduling,
      allowNotarialCalc,
      wabaId: wabaId || null,
      phoneNumberId: phoneNumberId || null,
      displayPhoneNumber: displayPhoneNumber || null,
      accessToken: accessToken || null,
      appSecret: appSecret || null,
      webhookVerifyToken: webhookVerifyToken || null,
    });
  };

  const handleTestRag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ragTestMsg.trim()) return;
    testRagMutation.mutate({
      message: ragTestMsg.trim(),
      includeOwnInventory,
      includeNetworkInventory,
    });
  };

  return (
    <div className="space-y-6">
      <div className="panel-card p-6 border border-primary/30 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/15 border border-primary/40 flex items-center justify-center text-primary">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-foreground">
                Agente JanIA Privado (RAG sobre Inventario + CRM + WhatsApp Cloud BYO-Number)
              </h3>
              <p className="text-xs text-muted-foreground">
                Atiende clientes en tu micrositio y en tu número propio de WhatsApp Cloud API sin interferir con la línea maestra Baileys de VECY.
              </p>
            </div>
          </div>
          {quotas && (
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl border border-border bg-secondary">
              Plan {quotas.planName}
            </span>
          )}
        </div>

        {!isLoading && aiQuota && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground">Cuota mensual de mensajes IA privados</span>
              <span className="font-black text-primary tabular-nums">
                {isUnlimited
                  ? `${aiQuota.used} / Ilimitado`
                  : aiQuota.limit === 0
                    ? "Plan sin cuota (actualiza en /planes)"
                    : `${aiQuota.used} / ${aiQuota.limit}`}
              </span>
            </div>
            <progress
              className="vecy-quota-progress"
              value={aiQuota.limit === 0 ? 0 : Math.min(aiQuota.used, aiMax)}
              max={aiMax}
              aria-label="Consumo mensual de mensajes IA del Agente Privado"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario 1: Canal Web RAG & Comportamiento */}
        <form onSubmit={handleSaveWebChannel} className="panel-card p-6 border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-base text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Canal Web Widget & Motor RAG
            </h4>
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={webActive}
                onChange={(e) => setWebActive(e.target.checked)}
              />
              Activo
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="pj-assistant-name" className="block text-xs font-bold mb-1">Nombre del Asistente</label>
              <input
                id="pj-assistant-name"
                type="text"
                required
                value={assistantName}
                onChange={(e) => setAssistantName(e.target.value)}
                aria-invalid="false"
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label htmlFor="pj-gender" className="block text-xs font-bold mb-1">Voz / Identidad</label>
              <select
                id="pj-gender"
                value={personaGender}
                onChange={(e) => setPersonaGender(e.target.value as any)}
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground"
              >
                <option value="female">Femenina</option>
                <option value="male">Masculina</option>
              </select>
            </div>
            <div>
              <label htmlFor="pj-tone" className="block text-xs font-bold mb-1">Personalidad</label>
              <select
                id="pj-tone"
                value={personaTone}
                onChange={(e) => setPersonaTone(e.target.value as any)}
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground"
              >
                <option value="profesional">Profesional</option>
                <option value="audaz">Audaz</option>
                <option value="cordial">Cordial</option>
                <option value="extrovertida">Extrovertida</option>
                <option value="seria">Seria</option>
                <option value="normal">Normal</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/50 border border-border cursor-pointer">
              <input
                type="checkbox"
                checked={includeOwnInventory}
                onChange={(e) => setIncludeOwnInventory(e.target.checked)}
              />
              Consultar mi inventario propio
            </label>
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/50 border border-border cursor-pointer">
              <input
                type="checkbox"
                checked={includeNetworkInventory}
                onChange={(e) => setIncludeNetworkInventory(e.target.checked)}
              />
              Incluir red colaborativa VECY
            </label>
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/50 border border-border cursor-pointer">
              <input
                type="checkbox"
                checked={allowCrmCapture}
                onChange={(e) => setAllowCrmCapture(e.target.checked)}
              />
              Registrar leads en mi CRM
            </label>
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/50 border border-border cursor-pointer">
              <input
                type="checkbox"
                checked={allowVisitScheduling}
                onChange={(e) => setAllowVisitScheduling(e.target.checked)}
              />
              Agendar visitas automáticamente
            </label>
          </div>

          <div>
            <label htmlFor="pj-prompt-override" className="block text-xs font-bold mb-1">
              Instrucciones privadas de la agencia (opcional)
            </label>
            <textarea
              id="pj-prompt-override"
              rows={2}
              value={systemPromptOverride}
              onChange={(e) => setSystemPromptOverride(e.target.value)}
              placeholder="Ej: Priorizar propiedades en Chicó y Cedritos; horarios de visita de lunes a sábado 9am-5pm."
              className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground"
            />
          </div>

          <button
            type="submit"
            disabled={upsertMutation.isPending}
            className="btn-gold w-full py-2.5 text-xs font-black uppercase tracking-wider cursor-pointer disabled:opacity-50"
          >
            {upsertMutation.isPending ? "Guardando..." : "Guardar Canal Web RAG"}
          </button>
        </form>

        {/* Formulario 2: Canal WhatsApp Cloud API BYO-Number */}
        <form onSubmit={handleSaveCloudChannel} className="panel-card p-6 border border-border space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-black text-base text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" /> WhatsApp Cloud API BYO-Number (Élite IA)
            </h4>
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={cloudActive}
                onChange={(e) => setCloudActive(e.target.checked)}
              />
              Habilitado
            </label>
          </div>

          {data?.webhookUrl && (
            <div className="p-3 rounded-xl bg-secondary/60 border border-border flex items-center justify-between gap-2 text-[11px]">
              <div className="truncate">
                <span className="font-bold text-primary">Webhook URL: </span>
                <code className="font-mono">{data.webhookUrl}</code>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(data.webhookUrl);
                  toast.success("Webhook URL copiada");
                }}
                className="px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-secondary flex items-center gap-1 font-bold shrink-0"
              >
                <Copy className="w-3 h-3" /> Copiar
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="wa-phone-number-id" className="block text-xs font-bold mb-1">
                Phone Number ID (Meta)
              </label>
              <input
                id="wa-phone-number-id"
                type="text"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                aria-invalid="false"
                placeholder="Ej: 109283746501234"
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground font-mono"
              />
            </div>
            <div>
              <label htmlFor="wa-display-phone" className="block text-xs font-bold mb-1">
                Número Visible (E.164)
              </label>
              <input
                id="wa-display-phone"
                type="tel"
                inputMode="tel"
                value={displayPhoneNumber}
                onChange={(e) => setDisplayPhoneNumber(e.target.value)}
                aria-invalid="false"
                placeholder="+57 300 000 0000"
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground"
              />
            </div>
            <div>
              <label htmlFor="wa-waba-id" className="block text-xs font-bold mb-1">WABA ID (opcional)</label>
              <input
                id="wa-waba-id"
                type="text"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                placeholder="ID Cuenta WhatsApp Business"
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground font-mono"
              />
            </div>
            <div>
              <label htmlFor="wa-verify-token" className="block text-xs font-bold mb-1">
                Verify Token {cloudExisting?.hasVerifyToken ? "(Guardado)" : ""}
              </label>
              <input
                id="wa-verify-token"
                type="text"
                value={webhookVerifyToken}
                onChange={(e) => setWebhookVerifyToken(e.target.value)}
                placeholder={cloudExisting?.hasVerifyToken ? "Dejar vacío para conservar actual" : "Token verificación Meta"}
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="wa-access-token" className="block text-xs font-bold mb-1">
                Access Token Meta (AES-256-GCM) {cloudExisting?.hasAccessToken ? "✓" : ""}
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="wa-access-token"
                  type={showAccessToken ? "text" : "password"}
                  autoComplete="off"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder={cloudExisting?.hasAccessToken ? "•••••••• (cifrado)" : "EAAG..."}
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground font-mono"
                />
                <button
                  type="button"
                  aria-pressed={showAccessToken}
                  aria-label="Mostrar u ocultar Access Token"
                  onClick={() => setShowAccessToken((v) => !v)}
                  className="p-2 rounded-lg border border-border bg-secondary"
                >
                  {showAccessToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="wa-app-secret" className="block text-xs font-bold mb-1">
                App Secret Meta (HMAC-SHA256) {cloudExisting?.hasAppSecret ? "✓" : ""}
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="wa-app-secret"
                  type={showAppSecret ? "text" : "password"}
                  autoComplete="off"
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  placeholder={cloudExisting?.hasAppSecret ? "•••••••• (cifrado)" : "App Secret"}
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground font-mono"
                />
                <button
                  type="button"
                  aria-pressed={showAppSecret}
                  aria-label="Mostrar u ocultar App Secret"
                  onClick={() => setShowAppSecret((v) => !v)}
                  className="p-2 rounded-lg border border-border bg-secondary"
                >
                  {showAppSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={upsertMutation.isPending}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider cursor-pointer disabled:opacity-50"
          >
            {upsertMutation.isPending ? "Cifrando y guardando..." : "Guardar Canal WhatsApp Cloud API"}
          </button>
        </form>
      </div>

      {/* Formulario 3: Simulador en Vivo del Motor RAG */}
      <form onSubmit={handleTestRag} className="panel-card p-6 border border-border space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h4 className="font-black text-base text-foreground">
            Simulador en Vivo — Prueba tu Agente JanIA Privado sobre Inventario Real
          </h4>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <label htmlFor="rag-test-input" className="sr-only">Mensaje de prueba para el Agente RAG</label>
          <input
            id="rag-test-input"
            type="text"
            value={ragTestMsg}
            onChange={(e) => setRagTestMsg(e.target.value)}
            placeholder="Ej: Tienes apartamento de 3 alcobas en Bogotá o gastos notariales?"
            className="flex-1 rounded-xl border border-border bg-secondary px-3.5 py-2.5 text-xs text-foreground"
          />
          <button
            type="submit"
            disabled={testRagMutation.isPending || !ragTestMsg.trim()}
            className="btn-gold px-5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {testRagMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Probar RAG
          </button>
        </div>

        {testRagMutation.data && (
          <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-2 text-xs">
            <div className="font-bold text-primary flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {testRagMutation.data.botName} ({testRagMutation.data.agencyName}) — Inmuebles consultados:{" "}
              {testRagMutation.data.matchedProperties.length}
            </div>
            <p className="text-foreground leading-relaxed">{testRagMutation.data.reply}</p>
            {testRagMutation.data.notarialSummary && (
              <div className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">
                {testRagMutation.data.notarialSummary}
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
