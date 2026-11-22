import React, { useState } from "react";
import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NetworkBackground from "@/components/NetworkBackground";
import { ScrollReveal } from "@/components/ScrollReveal";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  Check,
  Crown,
  Sparkles,
  Building2,
  ShieldCheck,
  Zap,
  Globe,
  Loader2,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

function formatCop(amount: number): string {
  if (amount <= 0) return "$0 COP";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function Planes() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [lastCheckoutRef, setLastCheckoutRef] = useState<string | null>(null);

  const { data: plans = [], isLoading: loadingPlans } = trpc.billing.listPlans.useQuery();
  const { data: mySub, refetch: refetchMySub } = trpc.billing.mySubscription.useQuery(
    undefined,
    { enabled: Boolean(user) },
  );
  const startCheckoutMutation = trpc.billing.startCheckout.useMutation();

  const currentPlanCode = mySub?.entitlements?.plan?.code || (user as any)?.planCode || "free";

  const handleSelectPlan = async (planCode: "free" | "agente_pro" | "inmobiliaria_growth" | "elite_ia") => {
    if (!user) {
      try {
        localStorage.setItem("vecy_login_return_url", "/planes");
      } catch (_) {}
      toast.info("Inicia sesión o crea tu cuenta gratis para activar un plan VECY.");
      navigate("/login?redirect=/planes");
      return;
    }

    setSelectedPlan(planCode);
    try {
      const res = await startCheckoutMutation.mutateAsync({
        planCode,
        billingCycle,
        redirectPath: "/planes",
      });

      setLastCheckoutRef(res.reference);

      if (res.activatedImmediately) {
        toast.success(`Plan ${res.plan.name} activado correctamente ($0 COP).`);
        await refetchMySub();
        return;
      }

      if (res.checkoutUrl) {
        toast.success("Redirigiendo a pasarela segura Wompi COP...");
        window.location.href = res.checkoutUrl;
        return;
      }

      toast.info(
        `Orden registrada (${res.reference}). La pasarela Wompi se encuentra en configuración de llaves finales en producción.`,
      );
      await refetchMySub();
    } catch (err: any) {
      toast.error(err?.message || "No fue posible iniciar la suscripción");
    } finally {
      setSelectedPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col">
      <NetworkBackground />
      <Navbar />

      <main className="flex-1 pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full relative z-10">
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-black uppercase tracking-widest mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              SaaS PropTech Colombia — Tope Máximo $200.000 COP/mes
            </span>
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4">
              Planes <span className="text-gradient-gold">VECY Network</span>
            </h1>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              Empieza gratis publicando inmuebles y requerimientos en VECY TIENDA, o escala a tu portal marca blanca en{" "}
              <span className="text-primary font-semibold">vecygroup.com</span> con Importador URL, CRM IA y Agente JanIA privado.
            </p>

            <div className="mt-7 inline-flex items-center p-1 rounded-xl bg-zinc-900/90 border border-zinc-800">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  billingCycle === "monthly"
                    ? "bg-primary text-black shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Mensual
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("annual")}
                className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  billingCycle === "annual"
                    ? "bg-primary text-black shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Anual
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  2 meses gratis
                </span>
              </button>
            </div>
          </div>
        </ScrollReveal>

        {user && mySub?.entitlements && (
          <div className="mb-10 rounded-2xl bg-zinc-900/80 border border-primary/30 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary font-black">
                <ShieldCheck className="w-4 h-4" />
                Tu Suscripción Actual
              </div>
              <p className="text-lg font-black text-white mt-1">
                {mySub.entitlements.plan.name}{" "}
                <span className="text-xs font-mono text-zinc-400">
                  ({currentPlanCode})
                </span>
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Inmuebles activos: <strong className="text-white">{mySub.entitlements.usage.activeProperties}</strong> /{" "}
                {mySub.entitlements.plan.maxActiveProperties < 0 ? "Ilimitados" : mySub.entitlements.plan.maxActiveProperties} ·{" "}
                Requerimientos: <strong className="text-white">{mySub.entitlements.usage.activeRequirements}</strong> /{" "}
                {mySub.entitlements.plan.maxActiveRequirements < 0 ? "Ilimitados" : mySub.entitlements.plan.maxActiveRequirements} ·{" "}
                Importaciones URL ({mySub.entitlements.periodKey}): <strong className="text-white">{mySub.entitlements.usage.urlImportsUsed}</strong> /{" "}
                {mySub.entitlements.plan.maxUrlImportsPerMonth < 0 ? "Ilimitadas" : mySub.entitlements.plan.maxUrlImportsPerMonth}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {mySub.agency?.slug && (
                <a
                  href={`https://${mySub.agency.slug}.vecygroup.com`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold inline-flex items-center gap-1.5 text-zinc-100"
                >
                  <Globe className="w-3.5 h-3.5 text-primary" />
                  {mySub.agency.slug}.vecygroup.com
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button
                type="button"
                onClick={() => navigate("/agent-dashboard")}
                className="btn-gold px-4 py-2 text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
              >
                Ir a Mi Panel Agente
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {lastCheckoutRef && (
          <div className="mb-8 rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 text-xs text-amber-200 flex items-center justify-between gap-4">
            <span>
              Referencia generada: <strong className="font-mono">{lastCheckoutRef}</strong>. Cuando completes tu pago Wompi, tu plan se activará automáticamente.
            </span>
          </div>
        )}

        {loadingPlans ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const isCurrent = currentPlanCode === plan.code;
              const isFeatured = plan.code === "inmobiliaria_growth";
              const displayPrice =
                billingCycle === "annual" ? plan.annualPriceCop : plan.monthlyPriceCop;
              const isBusy = selectedPlan === plan.code && startCheckoutMutation.isPending;

              return (
                <div
                  key={plan.code}
                  className={`rounded-2xl p-6 flex flex-col justify-between transition-all relative overflow-hidden border ${
                    isFeatured
                      ? "bg-gradient-to-b from-zinc-900 via-zinc-900 to-black border-primary shadow-[0_0_35px_rgba(212,175,55,0.18)]"
                      : "bg-zinc-950/90 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  {isFeatured && (
                    <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-primary text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      Recomendado
                    </div>
                  )}

                  <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-tight pr-16">
                      {plan.name}
                    </h2>
                    <p className="text-xs text-zinc-400 mt-2 min-h-[48px] leading-relaxed">
                      {plan.description}
                    </p>

                    <div className="mt-5 pb-5 border-b border-zinc-800">
                      <div className="text-3xl font-black text-primary">
                        {formatCop(displayPrice)}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-semibold mt-1 uppercase tracking-wider">
                        {displayPrice === 0
                          ? "Gratis para siempre"
                          : billingCycle === "annual"
                            ? "COP / año · Facturación anual Wompi"
                            : "COP / mes · IVA incluido según normativa"}
                      </div>
                    </div>

                    <ul className="mt-5 space-y-2.5 text-xs text-zinc-300">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-7 pt-4 border-t border-zinc-900">
                    <button
                      type="button"
                      disabled={isBusy || isCurrent}
                      onClick={() => handleSelectPlan(plan.code)}
                      className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all inline-flex items-center justify-center gap-2 cursor-pointer ${
                        isCurrent
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default"
                          : isFeatured
                            ? "btn-gold"
                            : "bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700"
                      }`}
                    >
                      {isBusy ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Procesando...
                        </>
                      ) : isCurrent ? (
                        <>
                          <Check className="w-4 h-4" />
                          Plan Activo
                        </>
                      ) : plan.monthlyPriceCop === 0 ? (
                        <>
                          <Zap className="w-4 h-4 text-primary" />
                          Comenzar Gratis
                        </>
                      ) : (
                        <>
                          <Building2 className="w-4 h-4" />
                          Suscribirme con Wompi
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

