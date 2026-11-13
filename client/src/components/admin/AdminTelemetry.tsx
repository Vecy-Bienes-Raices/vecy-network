import React from 'react';
import { trpc } from '@/lib/trpc';
import {
  Activity,
  Cpu,
  Volume2,
  Users,
  Bell,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

const ROLE_LABELS: Record<string, string> = {
  agente_inmobiliario: 'Agentes / Inmobiliarias',
  propietario_directo: 'Propietarios Directos',
  comprador_inversionista: 'Compradores / Inversionistas',
  arrendatario: 'Arrendatarios Directos',
};

export default function AdminTelemetry() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    trpc.janIA.getOperationalTelemetry.useQuery(undefined, {
      refetchInterval: 60000,
      refetchOnWindowFocus: false,
      retry: 1,
    });

  const evaluateAlertsMutation = trpc.janIA.evaluateCostAlerts.useMutation({
    onSuccess: (res) => {
      if (res.triggered.length > 0) {
        toast.success(`Evaluación ejecutada: ${res.triggered.length} alerta(s) generada(s).`);
      } else {
        toast.info('Consumo dentro de parámetros normales (0 alertas nuevas).');
      }
      refetch();
    },
    onError: (err) => {
      toast.error(`Error evaluando alertas: ${err.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <p className="text-xs text-muted-foreground uppercase tracking-widest">
          Cargando telemetría en vivo...
        </p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mt-6 panel-card p-6 border border-amber-500/30 bg-amber-500/5 rounded-2xl">
        <div className="flex items-center gap-3 text-amber-400 mb-2">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="font-bold text-sm uppercase tracking-wider">
            Acceso Restringido / Telemetría No Disponible
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {error?.message || 'Esta vista es exclusiva para administradores autenticados de VECY.'}
        </p>
      </div>
    );
  }

  const { llm, tts, roles, alerts } = data;

  return (
    <div className="space-y-6 pt-6">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 border border-white/10 rounded-2xl p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Observabilidad API &amp; Perfilamiento de Roles
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
              {data.version}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Ventana Bogotá: <span className="font-mono text-zinc-300">{data.dateKey}</span> · Entorno:{' '}
            <span className="font-mono text-zinc-300">{data.environment}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => evaluateAlertsMutation.mutate({ dryRun: true })}
            disabled={evaluateAlertsMutation.isPending}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Simular Alertas</span>
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gemini LLM */}
        <div className="bg-card/80 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Google Gemini</h3>
                <p className="text-[11px] text-muted-foreground">Nivel 1 Gratis vs Nivel 2 Pago</p>
              </div>
            </div>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                llm.capExhausted
                  ? 'bg-red-500/15 text-red-300 border-red-500/30'
                  : llm.alertThresholdReached
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {llm.utilizationPct}% tope pago
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-black/30 rounded-xl p-3 border border-white/5">
              <p className="text-muted-foreground text-[11px]">Nivel 1 ($0 COP)</p>
              <p className="text-lg font-black text-emerald-400 mt-0.5">{llm.tier1FreeCalls}</p>
            </div>
            <div className="bg-black/30 rounded-xl p-3 border border-white/5">
              <p className="text-muted-foreground text-[11px]">Nivel 2 Pago</p>
              <p className="text-lg font-black text-amber-300 mt-0.5">
                {llm.tier2PaidCalls} <span className="text-xs font-normal text-zinc-500">/ {llm.paidDailyCap}</span>
              </p>
            </div>
            <div className="bg-black/30 rounded-xl p-3 border border-white/5">
              <p className="text-muted-foreground text-[11px]">Umbral Alerta</p>
              <p className="text-sm font-bold text-zinc-200 mt-0.5">{llm.paidAlertThreshold} llamadas</p>
            </div>
            <div className="bg-black/30 rounded-xl p-3 border border-white/5">
              <p className="text-muted-foreground text-[11px]">Bloqueos Gobernanza</p>
              <p className="text-sm font-bold text-zinc-200 mt-0.5">{llm.paidBudgetBlockedCount}</p>
            </div>
          </div>
        </div>

        {/* TTS Laomedeia */}
        <div className="bg-card/80 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Voz Laomedeia TTS</h3>
                <p className="text-[11px] text-muted-foreground">Laomedeia Pago vs Salomé Gratis</p>
              </div>
            </div>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                tts.capExhausted
                  ? 'bg-red-500/15 text-red-300 border-red-500/30'
                  : tts.alertThresholdReached
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
              }`}
            >
              {tts.utilizationPct}% tope global
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-black/30 rounded-xl p-3 border border-white/5">
              <p className="text-muted-foreground text-[11px]">Audios Laomedeia</p>
              <p className="text-lg font-black text-sky-400 mt-0.5">
                {tts.paidTtsCalls} <span className="text-xs font-normal text-zinc-500">/ {tts.globalDailyCap}</span>
              </p>
            </div>
            <div className="bg-black/30 rounded-xl p-3 border border-white/5">
              <p className="text-muted-foreground text-[11px]">Salomé Gratis ($0)</p>
              <p className="text-lg font-black text-emerald-400 mt-0.5">{tts.freeFallbackCalls}</p>
            </div>
            <div className="bg-black/30 rounded-xl p-3 border border-white/5">
              <p className="text-muted-foreground text-[11px]">Caracteres / Tope</p>
              <p className="text-sm font-bold text-zinc-200 mt-0.5">
                {tts.paidTtsChars} ({tts.maxCharsPerAudio}/audio)
              </p>
            </div>
            <div className="bg-black/30 rounded-xl p-3 border border-white/5">
              <p className="text-muted-foreground text-[11px]">Degradados por Cuota</p>
              <p className="text-sm font-bold text-zinc-200 mt-0.5">
                {tts.blockedByQuotaCount} ({tts.userDailyCap}/usuario)
              </p>
            </div>
          </div>
        </div>

        {/* Role Distribution */}
        <div className="bg-card/80 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/15 text-primary">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Roles Detectados</h3>
                <p className="text-[11px] text-muted-foreground">
                  {roles.confirmedRolesTotal} confirmados · {roles.unassignedCount} sin rol
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/10">
              {roles.totalSessions} sesiones
            </span>
          </div>

          <div className="space-y-2.5">
            {Object.entries(roles.counts).map(([roleKey, count]) => {
              const pct = (roles.percentages as Record<string, number>)[roleKey] || 0;
              return (
                <div key={roleKey} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300">{ROLE_LABELS[roleKey] || roleKey}</span>
                    <span className="font-mono text-zinc-400">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#bf953f] to-[#fcf6ba] rounded-full transition-all"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Early Alerts Status */}
      <div className="bg-card/70 border border-white/10 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-foreground">
              Alertas Tempranas Anti-Spam a Eduardo (+{alerts.recipientPhone})
            </h3>
          </div>
          <span
            className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${
              alerts.enabled
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30'
            }`}
          >
            {alerts.enabled ? 'ACTIVAS (máx 1/canal/nivel/día)' : 'DESACTIVADAS'}
          </span>
        </div>
        {alerts.dispatchedToday.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No se han disparado alertas hoy ({data.dateKey}). El sistema monitorea automáticamente los umbrales de Gemini Nivel 2 y Voz Laomedeia.
          </p>
        ) : (
          <div className="space-y-2">
            {alerts.dispatchedToday.map((item) => (
              <div
                key={item.key}
                className="text-xs bg-black/30 border border-white/10 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <span className="font-mono text-amber-300 font-bold">{item.key}</span>{' '}
                  <span className="text-zinc-300">
                    ({item.currentCount}/{item.cap} · {item.utilizationPct}%)
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {item.sentViaWhatsApp ? 'Enviada WhatsApp' : item.simulatedInTest ? 'Simulada Test' : 'Registrada'} ·{' '}
                  {item.dispatchedAt}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

