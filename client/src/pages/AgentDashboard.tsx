import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link as RouterLink, Copy, Check, Shield, Plus, Search, BarChart3, Zap, Sparkles, Loader2, Globe, FileText } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

export default function AgentDashboard() {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"properties" | "links" | "claim" | "publish">("properties");

  // Magic Assist inputs
  const [publishText, setPublishText] = useState("");
  const [publishUrl, setPublishUrl] = useState("");

  // Form states
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPropertyType, setFormPropertyType] = useState<
    "apartment" | "house" | "building" | "warehouse" | "farm" | "hotel" | "office" | "land" | "commercial" | "loft" | "consultorio"
  >("apartment");
  const [formTransactionType, setFormTransactionType] = useState<"venta" | "arriendo" | "arriendo_temporal">("venta");
  const [formPrice, setFormPrice] = useState("");
  const [formCity, setFormCity] = useState("Bogotá");
  const [formZone, setFormZone] = useState("");
  const [formNeighborhood, setFormNeighborhood] = useState("");
  const [formBedrooms, setFormBedrooms] = useState<number>(0);
  const [formBathrooms, setFormBathrooms] = useState<number>(0);
  const [formGarages, setFormGarages] = useState<number>(0);
  const [formStratum, setFormStratum] = useState<number>(3);
  const [formAreaTotal, setFormAreaTotal] = useState("");
  const [formIsAmoblado, setFormIsAmoblado] = useState(false);

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

  const createPropertyMutation = trpc.properties.create.useMutation({
    onSuccess: () => {
      toast.success("Inmueble Publicado", { description: "El inmueble ha sido agregado a tu catálogo y a la red." });
      refetchProps();
      setActiveTab("properties");
      // Reset form
      setFormName("");
      setFormDescription("");
      setFormPrice("");
      setFormZone("");
      setFormNeighborhood("");
      setFormBedrooms(0);
      setFormBathrooms(0);
      setFormGarages(0);
      setFormAreaTotal("");
      setFormIsAmoblado(false);
      setPublishText("");
      setPublishUrl("");
    },
    onError: (err) => {
      toast.error("Error al publicar", { description: err.message });
    }
  });

  const parseTextMutation = trpc.properties.parseText.useMutation({
    onSuccess: (data) => {
      if (data) {
        if (data.name) setFormName(data.name);
        if (data.description) setFormDescription(data.description);
        if (data.propertyType) setFormPropertyType(data.propertyType);
        if (data.transactionType) setFormTransactionType(data.transactionType);
        if (data.price) setFormPrice(data.price);
        if (data.city) setFormCity(data.city);
        if (data.zone) setFormZone(data.zone);
        if (data.addressNeighborhood) setFormNeighborhood(data.addressNeighborhood);
        if (data.bedrooms !== undefined && data.bedrooms !== null) setFormBedrooms(Number(data.bedrooms));
        if (data.bathrooms !== undefined && data.bathrooms !== null) setFormBathrooms(Number(data.bathrooms));
        if (data.garages !== undefined && data.garages !== null) setFormGarages(Number(data.garages));
        if (data.stratum !== undefined && data.stratum !== null) setFormStratum(Number(data.stratum));
        if (data.areaTotal) setFormAreaTotal(String(data.areaTotal));
        if (data.isAmoblado !== undefined && data.isAmoblado !== null) setFormIsAmoblado(Boolean(data.isAmoblado));
        
        toast.success("Autocompletado Exitoso", { description: "JanIA ha estructurado y llenado los campos." });
      }
    },
    onError: (err) => {
      toast.error("Error de análisis", { description: err.message });
    }
  });

  const scrapeUrlMutation = trpc.janIA.extractFromLink.useMutation({
    onSuccess: (res) => {
      if (res && res.success && res.data) {
        const d = res.data;
        if (d.titulo) setFormName(d.titulo);
        if (d.descripcion) setFormDescription(d.descripcion);
        if (d.precio) {
          const priceClean = String(d.precio).replace(/\D/g, "");
          setFormPrice(priceClean);
        }
        if (d.habitaciones) setFormBedrooms(Number(d.habitaciones));
        if (d.banos) setFormBathrooms(Number(d.banos));
        if (d.parqueaderos) setFormGarages(Number(d.parqueaderos));
        if (d.area) setFormAreaTotal(String(d.area));
        if (d.estrato) setFormStratum(Number(d.estrato));
        if (d.barrio) setFormNeighborhood(d.barrio);
        if (d.ciudad) setFormCity(d.ciudad);
        if (d.sector) setFormZone(d.sector);
        
        toast.success("Enlace Escaneado", { description: "Datos extraídos con éxito." });
      }
    },
    onError: (err) => {
      toast.error("Error al escanear link", { description: err.message });
    }
  });

  const handleCopy = (token: string) => {
    const url = `${window.location.origin}/p/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
    toast("Copiado al portapapeles");
  };

  const handlePublishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPrice || !formZone) {
      toast.error("Faltan campos obligatorios", { description: "Por favor indica un título, precio y zona/localidad." });
      return;
    }
    createPropertyMutation.mutate({
      name: formName,
      description: formDescription,
      propertyType: formPropertyType,
      transactionType: formTransactionType,
      price: formPrice,
      city: formCity,
      zone: formZone,
      addressNeighborhood: formNeighborhood,
      bedrooms: formBedrooms || null,
      bathrooms: formBathrooms || null,
      garages: formGarages || null,
      stratum: formStratum || null,
      areaTotal: formAreaTotal || null,
      isAmoblado: formIsAmoblado,
    });
  };

  const tabs = [
    { id: "properties", label: "Mis Inmuebles", icon: BarChart3, count: myProperties?.length },
    { id: "links", label: "Red de Conexión", icon: Zap, count: stealthLinks?.length },
    { id: "claim", label: "Captar Inmueble", icon: Plus },
    { id: "publish", label: "Publicar Inmueble", icon: Sparkles },
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
              { label: "Mis Puntos (Comisión)", value: "0" },
              { label: "Prospectos en Ledger", value: "∞" },
            ].map((stat) => (
              <div key={stat.label} className="panel-card px-6 py-4 flex flex-col min-w-[180px]">
                <span className="text-3xl font-black text-primary">{stat.value}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="panel-card p-6 bg-primary/5 border-primary/20 mb-10">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground italic">¡Novedad VECY Network!</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nuestro sistema **Gana-Gana** ya está activo. Al compartir cualquier inmueble del portal en tus redes, acumulas **Puntos**. Estos puntos se convierten en una comisión real de cierre (Multinivel) al momento del negocio. ¡Ayuda a tus colegas y gana tú también!
            </p>
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

          {/* ===== TAB: PUBLICAR INMUEBLE ===== */}
          {activeTab === "publish" && (
            <div className="animate-fade-in space-y-8">
              {/* ASISTENTE MAGICO */}
              <div className="panel-card p-8 border border-primary/20 relative overflow-hidden bg-gradient-to-br from-primary/5 to-transparent">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full filter blur-3xl pointer-events-none" />
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                  <h2 className="text-xl font-bold text-foreground">Asistente Mágico de JanIA</h2>
                </div>
                <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                  ¿Tienes una descripción sucia de WhatsApp o el enlace de otra inmobiliaria? Pégalo aquí abajo y deja que JanIA rellene el formulario por ti de forma estructurada.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Whatsapp Raw Text */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Pegar Mensaje de WhatsApp</label>
                    <textarea
                      placeholder="Ej: Apto en venta Cedritos. 3 habitaciones, 2 baños, 85 mts. Piso 5 exterior. Salón social, parqueadero propio. Valor: 450 millones. Administración: 350 mil. Contacto..."
                      value={publishText}
                      onChange={(e) => setPublishText(e.target.value)}
                      className="w-full h-32 bg-background border border-border rounded-xl p-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none resize-none"
                    />
                    <button
                      type="button"
                      disabled={parseTextMutation.isPending || !publishText.trim()}
                      onClick={() => parseTextMutation.mutate({ text: publishText })}
                      className="btn-gold w-full text-xs"
                    >
                      {parseTextMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          JanIA está leyendo...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Autocompletar con JanIA (Texto)
                        </>
                      )}
                    </button>
                  </div>

                  {/* Scraper link */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Pegar Enlace de Portal Inmobiliario</label>
                    <div className="flex flex-col h-full justify-between gap-3">
                      <div className="space-y-3">
                        <input
                          type="url"
                          placeholder="https://www.fincaraiz.com.co/..."
                          value={publishUrl}
                          onChange={(e) => setPublishUrl(e.target.value)}
                          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none"
                        />
                        <p className="text-[11px] text-muted-foreground/60 leading-normal">
                          JanIA escaneará las características, título, precio y áreas para agilizar el registro.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={scrapeUrlMutation.isPending || !publishUrl.trim()}
                        onClick={() => scrapeUrlMutation.mutate({ url: publishUrl })}
                        className="btn-gold-outline w-full text-xs"
                      >
                        {scrapeUrlMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            JanIA está analizando el enlace...
                          </>
                        ) : (
                          <>
                            <Globe className="w-4 h-4 mr-2" />
                            Autocompletar desde Enlace
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* FORMULARIO ESTRUCTURADO */}
              <form onSubmit={handlePublishSubmit} className="panel-card p-8 space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-border">
                  <FileText className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">Detalles Estructurados del Inmueble</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Titulo */}
                  <div className="space-y-2 col-span-full md:col-span-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Título del Anuncio *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Hermoso Apartamento Dúplex con Balcón en Cedritos"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none"
                    />
                  </div>

                  {/* Precio */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Precio (COP) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: 450000000"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value.replace(/\D/g, ""))}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground font-mono focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none"
                    />
                  </div>

                  {/* Transaccion */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Tipo de Transacción</label>
                    <select
                      value={formTransactionType}
                      onChange={(e) => setFormTransactionType(e.target.value as any)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none"
                    >
                      <option value="venta">Venta</option>
                      <option value="arriendo">Arriendo</option>
                      <option value="arriendo_temporal">Arriendo Temporal</option>
                    </select>
                  </div>

                  {/* Tipo de Inmueble */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Tipo de Inmueble</label>
                    <select
                      value={formPropertyType}
                      onChange={(e) => setFormPropertyType(e.target.value as any)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none"
                    >
                      <option value="apartment">Apartamento</option>
                      <option value="house">Casa</option>
                      <option value="building">Edificio</option>
                      <option value="warehouse">Bodega</option>
                      <option value="farm">Finca</option>
                      <option value="hotel">Hotel</option>
                      <option value="office">Oficina</option>
                      <option value="land">Lote / Terreno</option>
                      <option value="commercial">Local Comercial</option>
                      <option value="loft">Loft</option>
                      <option value="consultorio">Consultorio</option>
                    </select>
                  </div>

                  {/* Ciudad */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Ciudad</label>
                    <input
                      type="text"
                      placeholder="Bogotá"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none"
                    />
                  </div>

                  {/* Localidad / Zona */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Zona / Localidad *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Usaquén"
                      value={formZone}
                      onChange={(e) => setFormZone(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none"
                    />
                  </div>

                  {/* Barrio */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Barrio</label>
                    <input
                      type="text"
                      placeholder="Ej: Cedritos"
                      value={formNeighborhood}
                      onChange={(e) => setFormNeighborhood(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none"
                    />
                  </div>

                  {/* Habitaciones */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Habitaciones</label>
                    <input
                      type="number"
                      min={0}
                      value={formBedrooms}
                      onChange={(e) => setFormBedrooms(Number(e.target.value))}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none"
                    />
                  </div>

                  {/* Baños */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Baños</label>
                    <input
                      type="number"
                      min={0}
                      value={formBathrooms}
                      onChange={(e) => setFormBathrooms(Number(e.target.value))}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none"
                    />
                  </div>

                  {/* Garajes */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Garajes</label>
                    <input
                      type="number"
                      min={0}
                      value={formGarages}
                      onChange={(e) => setFormGarages(Number(e.target.value))}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none"
                    />
                  </div>

                  {/* Estrato */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Estrato</label>
                    <input
                      type="number"
                      min={1}
                      max={6}
                      value={formStratum}
                      onChange={(e) => setFormStratum(Number(e.target.value))}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none"
                    />
                  </div>

                  {/* Area */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Área Privada (m²)</label>
                    <input
                      type="text"
                      placeholder="Ej: 85"
                      value={formAreaTotal}
                      onChange={(e) => setFormAreaTotal(e.target.value.replace(/\D/g, ""))}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none"
                    />
                  </div>

                  {/* Amoblado */}
                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      id="isAmoblado"
                      checked={formIsAmoblado}
                      onChange={(e) => setFormIsAmoblado(e.target.checked)}
                      className="w-5 h-5 rounded bg-background border-border text-primary focus:ring-primary"
                    />
                    <label htmlFor="isAmoblado" className="text-sm font-semibold text-foreground select-none cursor-pointer">¿Está Amoblado?</label>
                  </div>

                  {/* Descripcion */}
                  <div className="space-y-2 col-span-full">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Descripción Detallada</label>
                    <textarea
                      placeholder="Comentarios adicionales sobre el inmueble..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full h-32 bg-background border border-border rounded-xl p-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-border flex justify-end">
                  <button
                    type="submit"
                    disabled={createPropertyMutation.isPending}
                    className="btn-gold px-8 py-3 text-sm"
                  >
                    {createPropertyMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Publicando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Publicar Inmueble en Vecy Network
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
