import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, Copy, Check, Shield, Plus, Search, BarChart3, Zap } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

export default function AgentDashboard() {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"properties" | "links" | "claim">("properties");

  const { data: myProperties, refetch: refetchProps, isLoading: loadingProps } = trpc.agent.getMyProperties.useQuery();
  const { data: availableProperties, refetch: refetchAvailable, isLoading: loadingAvailable } = trpc.agent.getAvailablePropertiesToClaim.useQuery();
  const { data: stealthLinks, refetch: refetchLinks, isLoading: loadingLinks } = trpc.agent.getStealthLinks.useQuery();

  const claimMutation = trpc.agent.claimProperty.useMutation({
    onSuccess: () => {
      toast.success("Inmueble Captado", { description: "Ahora eres el Captador Oficial. Genera tu enlace blindado." });
      refetchProps(); refetchAvailable();
    }
  });

  const generateLinkMutation = trpc.agent.generateStealthLink.useMutation({
    onSuccess: () => {
      toast.success("Enlace Blindado Generado", { description: "Cópialo y compártelo. El prospecto queda anclado a ti." });
      refetchLinks();
    }
  });

  const handleCopy = (token: string) => {
    const url = `${window.location.origin}/p/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
    toast("Copiado al portapapeles");
  };

  const tabs = [
    { id: "properties", label: "Mis Inmuebles", icon: BarChart3, count: myProperties?.length },
    { id: "links", label: "Red de Conexión", icon: Zap, count: stealthLinks?.length },
    { id: "claim", label: "Captar Inmueble", icon: Plus },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto animate-fade-in">

          {/* ===== HEADER ===== */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center glow-gold-sm">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Panel del Captador Oficial</span>
            </div>
            <h1 className="page-header-gold text-4xl md:text-5xl font-black tracking-tight">
              MURO DE FUEGO
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Gestiona tu portafolio, genera enlaces blindados y protege tus comisiones con el sistema de Ledger inmutable de Vecy.
            </p>
            <div className="separator-gold mt-6" />
          </div>

          {/* ===== STAT PILLS ===== */}
          <div className="flex flex-wrap gap-4 mb-10">
            {[
              { label: "Inmuebles Captados", value: myProperties?.length ?? "—" },
              { label: "Enlaces Activos", value: stealthLinks?.length ?? "—" },
              { label: "Prospectos en Ledger", value: "∞" },
            ].map((stat) => (
              <div key={stat.label} className="panel-card px-6 py-4 flex flex-col">
                <span className="text-3xl font-black text-primary">{stat.value}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* ===== TABS ===== */}
          <div className="flex gap-2 mb-8 p-1.5 bg-card rounded-2xl border border-border w-fit">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    isActive
                      ? "panel-tab-active shadow-[0_0_15px_rgba(191,149,63,0.3)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${isActive ? "bg-black/20" : "bg-muted"}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ===== TAB: MIS INMUEBLES ===== */}
          {activeTab === "properties" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {loadingProps ? (
                Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl bg-card" />)
              ) : myProperties?.length === 0 ? (
                <div className="col-span-full py-20 text-center panel-card">
                  <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-2">No tienes inmuebles captados todavía.</p>
                  <p className="text-xs text-muted-foreground/60">Ve a "Captar Inmueble" para comenzar.</p>
                </div>
              ) : (
                myProperties?.map(prop => (
                  <div key={prop.id} className="panel-card p-0 overflow-hidden group">
                    {/* Barra superior gold */}
                    <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-80" />
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <span className="badge-gold">Captador Oficial</span>
                        {prop.matriculaInmobiliaria && (
                          <span className="text-xs font-mono text-muted-foreground">{prop.matriculaInmobiliaria}</span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-1">{prop.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{prop.location}</p>
                      <p className="text-2xl font-light text-primary mb-6">
                        ${Number(prop.price).toLocaleString("es-CO")} COP
                      </p>
                      <button
                        onClick={() => generateLinkMutation.mutate({ propertyId: prop.id })}
                        disabled={generateLinkMutation.isPending}
                        className="btn-gold w-full text-sm"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Generar Enlace Blindado
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ===== TAB: RED DE CONEXIÓN ===== */}
          {activeTab === "links" && (
            <div className="animate-fade-in">
              <div className="panel-card p-8">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold text-foreground">Fábrica de Enlaces Blindados</h2>
                </div>
                <p className="text-muted-foreground text-sm mb-8">
                  Cada enlace es único, inmutable y te ancla legalmente al prospecto. 
                  Compártelo por WhatsApp, email o redes sociales.
                </p>

                {loadingLinks ? (
                  <Skeleton className="h-40 w-full bg-secondary" />
                ) : stealthLinks?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No hay enlaces generados. Ve a "Mis Inmuebles" y genera uno.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stealthLinks?.map(({ link, property }) => (
                      <div
                        key={link.id}
                        className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 rounded-xl bg-secondary/50 border border-border hover:border-primary/30 transition-all gap-4"
                      >
                        <div>
                          <p className="font-semibold text-primary">{property.name}</p>
                          <p className="text-xs font-mono text-muted-foreground mt-0.5">{property.location}</p>
                        </div>
                        <div className="flex items-center gap-4 w-full md:w-auto">
                          <code className="flex-1 md:flex-none bg-background px-4 py-2 rounded-lg font-mono text-xs text-foreground/70 border border-border">
                            /p/{link.token.substring(0, 10)}...
                          </code>
                          <div className="text-center px-3">
                            <p className="text-xl font-bold text-foreground">{link.clicks}</p>
                            <p className="text-xs text-muted-foreground">clics</p>
                          </div>
                          <button
                            onClick={() => handleCopy(link.token)}
                            className={`btn-electric p-2.5 rounded-lg transition-all ${copiedToken === link.token ? "border-green-500/50 text-green-400" : ""}`}
                          >
                            {copiedToken === link.token ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== TAB: CAPTAR INMUEBLE ===== */}
          {activeTab === "claim" && (
            <div className="animate-fade-in">
              <div className="panel-card p-8 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold text-foreground">Captar Inmueble sin Agente</h2>
                </div>
                <p className="text-muted-foreground text-sm">
                  Los inmuebles mostrados aquí no tienen agente asignado. 
                  Al captarlo, quedas registrado como intermediario oficial y puedes generar tu enlace blindado.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loadingAvailable ? (
                  Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl bg-card" />)
                ) : availableProperties?.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-muted-foreground panel-card">
                    <p>No hay inmuebles sin agente disponibles.</p>
                  </div>
                ) : (
                  availableProperties?.map(prop => (
                    <div key={prop.id} className="panel-card p-6 border-dashed">
                      <h3 className="text-base font-semibold text-foreground mb-1">{prop.name}</h3>
                      <p className="text-sm text-muted-foreground mb-1">{prop.location}</p>
                      <p className="text-lg font-light text-primary mb-5">
                        ${Number(prop.price).toLocaleString("es-CO")}
                      </p>
                      <button
                        onClick={() => claimMutation.mutate({ propertyId: prop.id })}
                        disabled={claimMutation.isPending}
                        className="btn-gold-outline w-full text-sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Captarme como Agente
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
