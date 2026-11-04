import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Copy, Check, Shield, Plus, Search, BarChart3, Zap, Sparkles,
  Loader2, Globe, FileText, Palette, Bot, CalendarCheck, EyeOff,
  Download, Share2, ExternalLink, TrendingUp, QrCode, Calculator
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import UnifiedPublishModal from "@/components/publish/UnifiedPublishModal";

type DashboardTab = "properties" | "links" | "branding" | "pro_tools" | "analytics" | "claim" | "publish";
type PersonalityOption = "normal" | "audaz" | "profesional" | "extrovertida" | "seria" | "cordial";

const PERSONALITY_OPTIONS: Array<{ id: PersonalityOption; label: string; desc: string }> = [
  { id: "normal", label: "Normal", desc: "Equilibrada, clara y servicial" },
  { id: "audaz", label: "Audaz", desc: "Persuasiva, enfocada en cierre rápido" },
  { id: "profesional", label: "Profesional", desc: "Ejecutiva, corporativa y jurídica" },
  { id: "extrovertida", label: "Extrovertida", desc: "Entusiasta, cálida y carismática" },
  { id: "seria", label: "Seria", desc: "Directa al grano, sobria y financiera" },
  { id: "cordial", label: "Cordial", desc: "Empática, paciente y hospitalaria" },
];

export default function AgentDashboard() {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>("properties");
  const [isUnifiedModalOpen, setIsUnifiedModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any>(null);

  // Magic Assist inputs
  const [publishText, setPublishText] = useState("");
  const [publishUrl, setPublishUrl] = useState("");

  // Form states (Inline Publisher)
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

  // Estados de Marca & Micro-Sitio (Estilo Wasi Mejorado)
  const [agencyName, setAgencyName] = useState("");
  const [slogan, setSlogan] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [customLogoUrl, setCustomLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0f4c81");
  const [secondaryColor, setSecondaryColor] = useState("#0f172a");
  const [templateStyle, setTemplateStyle] = useState<"wasi-classic" | "luxury-editorial" | "modern-minimal">("wasi-classic");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [nit, setNit] = useState("");

  // Estados de Herramientas Pro (Vecy Agenda Pro + Widget Agente IA Personalizable)
  const [agendaProEnabled, setAgendaProEnabled] = useState(true);
  const [agendaNotifyEmail, setAgendaNotifyEmail] = useState("");
  const [agendaNotifyWhatsapp, setAgendaNotifyWhatsapp] = useState("");
  const [agendaCustomHeader, setAgendaCustomHeader] = useState("");

  const [aiWidgetEnabled, setAiWidgetEnabled] = useState(true);
  const [aiAgentName, setAiAgentName] = useState("Sofía IA");
  const [aiGender, setAiGender] = useState<"female" | "male">("female");
  const [aiPersonality, setAiPersonality] = useState<PersonalityOption>("profesional");
  const [aiCustomPrompt, setAiCustomPrompt] = useState("");
  const [aiWelcomeMessage, setAiWelcomeMessage] = useState("");
  const [roiCalculatorEnabled, setRoiCalculatorEnabled] = useState(true);

  const { data: myProperties, refetch: refetchProps, isLoading: loadingProps } = trpc.agent.getMyProperties.useQuery();
  const { data: availableProperties, refetch: refetchAvailable, isLoading: loadingAvailable } = trpc.agent.getAvailablePropertiesToClaim.useQuery();
  const { data: stealthLinks, refetch: refetchLinks, isLoading: loadingLinks } = trpc.agent.getStealthLinks.useQuery();
  const { data: myBrand, refetch: refetchBrand } = trpc.agent.getMyBrandConfig.useQuery(undefined, { retry: false });
  const { data: affiliateStats, refetch: refetchStats } = trpc.affiliates.getMyStats.useQuery(undefined, { retry: false });

  useEffect(() => {
    if (myBrand) {
      const th = (myBrand.themeConfig as any) || {};
      const tl = (myBrand.activeTools as any) || {};
      setAgencyName(th.agencyName || myBrand.name || "");
      setSlogan(th.slogan || "Portafolio Inmobiliario Certificado • Red Colaborativa");
      setSubdomain(myBrand.subdomain || "");
      setCustomLogoUrl(myBrand.customLogoUrl || "");
      if (th.primaryColor) setPrimaryColor(th.primaryColor);
      if (th.secondaryColor) setSecondaryColor(th.secondaryColor);
      if (th.templateStyle) setTemplateStyle(th.templateStyle);
      setContactPhone(th.contactPhone || myBrand.phone || "");
      setContactEmail(th.contactEmail || myBrand.email || "");
      setNit(th.nit || "");

      if (tl.agendaPro) {
        setAgendaProEnabled(tl.agendaPro.enabled ?? true);
        setAgendaNotifyEmail(tl.agendaPro.notifyEmail || th.contactEmail || myBrand.email || "");
        setAgendaNotifyWhatsapp(tl.agendaPro.notifyWhatsapp || th.contactPhone || myBrand.phone || "");
        setAgendaCustomHeader(tl.agendaPro.customHeaderTitle || th.agencyName || "");
      } else {
        setAgendaNotifyEmail(myBrand.email || "");
        setAgendaNotifyWhatsapp(myBrand.phone || "");
      }

      if (tl.aiAgentWidget) {
        setAiWidgetEnabled(tl.aiAgentWidget.enabled ?? true);
        setAiAgentName(tl.aiAgentWidget.agentName || "Sofía IA");
        setAiGender(tl.aiAgentWidget.gender || "female");
        setAiPersonality(tl.aiAgentWidget.personality || "profesional");
        setAiCustomPrompt(tl.aiAgentWidget.customPrompt || "");
        setAiWelcomeMessage(tl.aiAgentWidget.welcomeMessage || "");
      }
      if (tl.roiCalculator) {
        setRoiCalculatorEnabled(tl.roiCalculator.enabled ?? true);
      }
    }
  }, [myBrand]);

  const updateBrandMutation = trpc.agent.updateBrandConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuración Guardada", {
        description: "Tu marca, plantillas tipo Wasi y herramientas Pro se actualizaron en tiempo real.",
      });
      refetchBrand();
    },
    onError: (err) => {
      toast.error("Error al guardar configuración", { description: err.message });
    },
  });

  const handleSaveBrandAndTools = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateBrandMutation.mutate({
      subdomain,
      customLogoUrl: customLogoUrl || null,
      phone: contactPhone,
      email: contactEmail,
      themeConfig: {
        agencyName,
        slogan,
        primaryColor,
        secondaryColor,
        templateStyle,
        contactPhone,
        contactEmail,
        nit,
      },
      activeTools: {
        agendaPro: {
          enabled: agendaProEnabled,
          notifyEmail: agendaNotifyEmail,
          notifyWhatsapp: agendaNotifyWhatsapp,
          requireIdentityVerification: true,
          customHeaderTitle: agendaCustomHeader || agencyName,
        },
        aiAgentWidget: {
          enabled: aiWidgetEnabled,
          agentName: aiAgentName,
          gender: aiGender,
          personality: aiPersonality,
          customPrompt: aiCustomPrompt,
          welcomeMessage: aiWelcomeMessage,
        },
        roiCalculator: {
          enabled: roiCalculatorEnabled,
          defaultInterestRateEA: 11.5,
        },
      },
    });
  };

  const claimMutation = trpc.agent.claimProperty.useMutation({
    onSuccess: () => {
      toast.success("Inmueble Captado", { description: "Ahora eres el Captador Oficial. Genera tu enlace blindado." });
      refetchProps(); refetchAvailable();
    }
  });

  const generateLinkMutation = trpc.agent.generateStealthLink.useMutation({
    onSuccess: () => {
      toast.success("Enlace Con Sensor Generado", { description: "Ya puedes compartirlo con Marca Propia o Marca Blanca Neutra." });
      refetchLinks();
      refetchStats();
    }
  });

  const createPropertyMutation = trpc.properties.create.useMutation({
    onSuccess: () => {
      toast.success("Inmueble Publicado", { description: "El inmueble ha sido agregado a tu catálogo y a la tienda con sus fichas listas." });
      refetchProps();
      setActiveTab("properties");
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
        const nameVal = d.name || d.titulo;
        if (nameVal) setFormName(nameVal);

        const descVal = d.description || d.descripcion;
        if (descVal) setFormDescription(descVal);

        const priceVal = d.price || d.precio;
        if (priceVal) {
          const priceClean = String(priceVal).replace(/\D/g, "");
          setFormPrice(priceClean);
        }

        const bedroomsVal = d.bedrooms !== undefined && d.bedrooms !== null ? d.bedrooms : d.habitaciones;
        if (bedroomsVal !== undefined && bedroomsVal !== null) setFormBedrooms(Number(bedroomsVal));

        const bathroomsVal = d.bathrooms !== undefined && d.bathrooms !== null ? d.bathrooms : d.banos;
        if (bathroomsVal !== undefined && bathroomsVal !== null) setFormBathrooms(Number(bathroomsVal));

        const garagesVal = d.garages !== undefined && d.garages !== null ? d.garages : d.parqueaderos;
        if (garagesVal !== undefined && garagesVal !== null) setFormGarages(Number(garagesVal));

        const areaVal = d.areaTotal || d.area;
        if (areaVal) setFormAreaTotal(String(areaVal));

        const stratumVal = d.stratum !== undefined && d.stratum !== null ? d.stratum : d.estrato;
        if (stratumVal !== undefined && stratumVal !== null) setFormStratum(Number(stratumVal));

        const neighborhoodVal = d.addressNeighborhood || d.barrio;
        if (neighborhoodVal) setFormNeighborhood(neighborhoodVal);

        const cityVal = d.city || d.ciudad;
        if (cityVal) setFormCity(cityVal);

        const zoneVal = d.zone || d.sector;
        if (zoneVal) setFormZone(zoneVal);

        const typeVal = d.propertyType;
        if (typeVal) setFormPropertyType(typeVal);

        const transVal = d.transactionType;
        if (transVal) setFormTransactionType(transVal === "arriendo" ? "arriendo" : "venta");

        const amobladoVal = d.isAmoblado;
        if (amobladoVal !== undefined && amobladoVal !== null) setFormIsAmoblado(Boolean(amobladoVal));
        
        toast.success("Enlace Escaneado", { description: "Datos del inmueble extraídos con éxito." });
      }
    },
    onError: (err) => {
      toast.error("Error al escanear link", { description: err.message });
    }
  });

  const handleCopyUrl = (fullPath: string, keyId: string, label: string) => {
    const url = fullPath.startsWith("http") ? fullPath : `${window.location.origin}${fullPath}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(keyId);
    setTimeout(() => setCopiedToken(null), 3000);
    toast.success(`${label} copiado al portapapeles`, { description: url });
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
    { id: "properties", label: "Mis Inmuebles & Fichas", icon: BarChart3, count: myProperties?.length },
    { id: "branding", label: "Mi Sitio & Marca (Wasi IA)", icon: Palette },
    { id: "pro_tools", label: "Herramientas Pro & Agente IA", icon: Bot },
    { id: "links", label: "Enlaces & Marca Blanca", icon: Zap, count: stealthLinks?.length },
    { id: "analytics", label: "Métricas SEO & Puntos", icon: TrendingUp, count: affiliateStats?.vPoints },
    { id: "claim", label: "Captar de la Red", icon: Plus },
    { id: "publish", label: "Subir Inmueble", icon: Sparkles },
  ];

  const mySiteSlug = subdomain || (myBrand?.id ? String(myBrand.id) : "");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto animate-fade-in">

          {/* ===== HEADER ===== */}
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center glow-gold-sm">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">
                  Centro de Comando del Suscriptor • Plan Publicación Ilimitada ($0 COP)
                </span>
              </div>
              <h1 className="page-header-gold text-3xl md:text-5xl font-black tracking-tight">
                ESTUDIO WASI-IA & MURO DE FUEGO
              </h1>
              <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
                Sube inmuebles ilimitados con IA, descarga brochures PDF con tu propia marca o en Marca Blanca Neutra para terceros, activa tus herramientas Pro y acumula puntos de comisión en cada enlace compartido.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => {
                  setEditingProperty(null);
                  setIsUnifiedModalOpen(true);
                }}
                className="btn-gold px-5 py-3 text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-xl cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-black" />
                <span>+ Subir Inmueble Completo (Estudio IA)</span>
              </button>

              {mySiteSlug && (
                <a
                  href={`/s/${mySiteSlug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-3 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 text-xs font-black uppercase tracking-wider flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Ver Mi Sitio Web</span>
                </a>
              )}
            </div>
          </div>

          <div className="separator-gold mb-8" />

          {/* ===== STAT PILLS ===== */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: "Inmuebles Captados", value: myProperties?.length ?? "0" },
              { label: "Enlaces con Sensor", value: stealthLinks?.length ?? "0" },
              { label: "Mis vPoints (Comisión)", value: affiliateStats?.vPoints ?? myBrand?.vPoints ?? 0 },
              { label: "Lecturas / Descargas PDF", value: (affiliateStats?.engagedReads || 0) + (affiliateStats?.pdfDownloads || 0) },
              { label: "Prospectos en Ledger", value: affiliateStats?.leadsAnchored ?? 0 },
            ].map((stat) => (
              <div key={stat.label} className="panel-card px-5 py-4 flex flex-col">
                <span className="text-2xl sm:text-3xl font-black text-primary">{stat.value}</span>
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1 font-bold">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* ===== TABS ===== */}
          <div className="flex flex-wrap gap-2 mb-8 p-1.5 bg-card rounded-2xl border border-border">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as DashboardTab)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                    isActive
                      ? "panel-tab-active shadow-[0_0_15px_rgba(191,149,63,0.3)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${isActive ? "bg-black/20" : "bg-muted"}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: MIS INMUEBLES & DESCARGA DE FICHAS (CON MARCA Y NEUTRAS)    */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "properties" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {loadingProps ? (
                Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl bg-card" />)
              ) : myProperties?.length === 0 ? (
                <div className="col-span-full py-16 text-center panel-card space-y-4">
                  <Search className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground font-semibold">No tienes inmuebles propios subidos todavía.</p>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => setIsUnifiedModalOpen(true)}
                      className="btn-gold px-6 py-3 text-xs font-black uppercase tracking-wider"
                    >
                      + Subir Mi Primer Inmueble con IA
                    </button>
                    <button
                      onClick={() => setActiveTab("claim")}
                      className="btn-gold-outline px-6 py-3 text-xs font-bold uppercase tracking-wider"
                    >
                      Captar Inmuebles de la Red
                    </button>
                  </div>
                </div>
              ) : (
                myProperties?.map(prop => (
                  <div key={prop.id} className="panel-card p-0 overflow-hidden group flex flex-col justify-between">
                    <div>
                      <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary opacity-80" />
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-3">
                          <span className="badge-gold">Captador Oficial</span>
                          <span className="text-xs font-mono text-muted-foreground">ID #{prop.id}</span>
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-1 line-clamp-2">{prop.name}</h3>
                        <p className="text-xs text-muted-foreground mb-3">{prop.addressNeighborhood || prop.zone}, {prop.city || "Bogotá"}</p>
                        <p className="text-2xl font-black text-primary mb-4">
                          ${Number(prop.price).toLocaleString("es-CO")} COP
                        </p>
                      </div>
                    </div>

                    <div className="p-6 pt-0 space-y-2">
                      {/* Botones directos de Ficha Técnica Con Marca vs Marca Blanca Neutra */}
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={`/ficha/${prop.id}?mode=branded${myBrand?.id ? `&agentId=${myBrand.id}` : ""}`}
                          target="_blank"
                          rel="noreferrer"
                          className="py-2.5 px-3 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
                          title="Abrir Brochure PDF con Tu Marca, Logo y Colores"
                        >
                          <Palette className="w-3.5 h-3.5" />
                          <span>PDF Mi Marca</span>
                        </a>

                        <a
                          href={`/ficha/${prop.id}?mode=neutral`}
                          target="_blank"
                          rel="noreferrer"
                          className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/15 text-zinc-200 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
                          title="Abrir Brochure PDF 100% Neutro Sin Contactos ni Colores para Terceros"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>PDF Sin Marca</span>
                        </a>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setEditingProperty(prop);
                            setIsUnifiedModalOpen(true);
                          }}
                          className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Editar Fotos / Datos
                        </button>

                        <button
                          onClick={() => generateLinkMutation.mutate({ propertyId: prop.id })}
                          disabled={generateLinkMutation.isPending}
                          className="btn-gold py-2 px-3 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Crear Link Sensor</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: MI SITIO & MARCA (INFRAESTRUCTURA ESTILO WASI MEJORADA)     */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "branding" && (
            <form onSubmit={handleSaveBrandAndTools} className="panel-card p-8 space-y-8 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
                <div>
                  <div className="flex items-center gap-2.5">
                    <Palette className="w-6 h-6 text-primary" />
                    <h2 className="text-2xl font-black text-foreground">
                      Infraestructura de Marca Propia & Plantillas (Estilo Wasi + IA)
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Personaliza los colores, logo y plantilla de tu agencia. Se aplicarán automáticamente a tu Micro-Sitio Web y a todas las Fichas Técnicas PDF que descargues en modo "Con Marca".
                  </p>
                </div>

                {mySiteSlug && (
                  <div className="flex items-center gap-2 bg-secondary/60 px-4 py-2.5 rounded-xl border border-primary/30">
                    <span className="text-xs text-muted-foreground">Tu Sitio Activo:</span>
                    <code className="text-xs font-mono text-primary font-bold">/s/{mySiteSlug}</code>
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(`/s/${mySiteSlug}`, "mysite", "Enlace de tu Sitio Web")}
                      className="p-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer"
                    >
                      {copiedToken === "mysite" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                    Nombre de tu Agencia o Marca Personal *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Inversiones & Bienes Raíces Imperial"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                    Identificador / Subdominio de tu Sitio Web
                  </label>
                  <div className="flex items-center bg-background border border-border rounded-xl overflow-hidden">
                    <span className="px-3 text-xs text-muted-foreground font-mono bg-secondary/40 py-3 border-r border-border">
                      vecy.co/s/
                    </span>
                    <input
                      type="text"
                      placeholder="mi-inmobiliaria"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                      className="flex-1 bg-transparent px-3 py-3 text-sm text-foreground font-mono outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                    Plantilla Prediseñada de Brochure & Sitio
                  </label>
                  <select
                    value={templateStyle}
                    onChange={(e) => setTemplateStyle(e.target.value as any)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                  >
                    <option value="wasi-classic">Ejecutiva Corporativa (Estilo Wasi Pro)</option>
                    <option value="luxury-editorial">Luxury Editorial Magazine</option>
                    <option value="modern-minimal">Minimalista Arquitectónica</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                    Color Primario de tu Marca
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-11 rounded-xl cursor-pointer bg-transparent border border-border"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-sm font-mono text-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                    Color Secundario / Fondos Oscuros
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-12 h-11 rounded-xl cursor-pointer bg-transparent border border-border"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-sm font-mono text-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                    URL de tu Logo (PNG/SVG/JPG)
                  </label>
                  <input
                    type="url"
                    placeholder="https://.../logo-mi-agencia.png"
                    value={customLogoUrl}
                    onChange={(e) => setCustomLogoUrl(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                    WhatsApp Comercial (Saldrá en tus Fichas con Marca)
                  </label>
                  <input
                    type="text"
                    placeholder="+57 300 000 0000"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                    Correo Comercial (Saldrá en tus Fichas con Marca)
                  </label>
                  <input
                    type="email"
                    placeholder="gerencia@miagencia.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                    Eslogan / Subtítulo Corporativo
                  </label>
                  <input
                    type="text"
                    placeholder="Especialistas en Inversiones & Corretaje"
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <button
                  type="submit"
                  disabled={updateBrandMutation.isPending}
                  className="btn-gold px-8 py-3.5 text-xs font-black uppercase tracking-widest cursor-pointer"
                >
                  {updateBrandMutation.isPending ? "Guardando..." : "Guardar Mi Marca & Actualizar Sitio Web"}
                </button>
              </div>
            </form>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB 3: HERRAMIENTAS PRO PERSONALIZABLES (AGENDA PRO + AGENTE IA)   */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "pro_tools" && (
            <form onSubmit={handleSaveBrandAndTools} className="space-y-8 animate-fade-in">
              {/* HERRAMIENTA PRO 1: VECY AGENDA PRO MARCA PROPIA */}
              <div className="panel-card p-8 border border-primary/30 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-primary/15 border border-primary/40 flex items-center justify-center text-primary">
                      <CalendarCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black text-foreground">1. Vecy Agenda Pro (Marca Propia)</h3>
                        <span className="badge-gold">Add-On Pro</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        El mismo motor antifraude con validación de identidad en Policía/Registraduría, firma electrónica y contrato de puntas en PDF, pero con tus colores, tu logo y enviando las notificaciones directamente a tu propio WhatsApp y Correo.
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2.5 cursor-pointer bg-secondary px-4 py-2 rounded-xl border border-border">
                    <input
                      type="checkbox"
                      checked={agendaProEnabled}
                      onChange={(e) => setAgendaProEnabled(e.target.checked)}
                      className="w-4 h-4 accent-amber-500"
                    />
                    <span className="text-xs font-black uppercase tracking-wider text-foreground">
                      {agendaProEnabled ? "Activa en Mi Sitio" : "Inactiva"}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                      WhatsApp Propio para Recibir Citas *
                    </label>
                    <input
                      type="text"
                      placeholder="+57 300 000 0000"
                      value={agendaNotifyWhatsapp}
                      onChange={(e) => setAgendaNotifyWhatsapp(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Recibirás al instante cada cita agendada y el estado de antecedentes del visitante.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                      Correo Propio para Recibir Contratos PDF *
                    </label>
                    <input
                      type="email"
                      placeholder="citas@tuinmobiliaria.com"
                      value={agendaNotifyEmail}
                      onChange={(e) => setAgendaNotifyEmail(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Recibirás copia automática del Contrato de Puntas Compartidas firmado digitalmente.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                      Título Personalizado de tu Agenda Pro
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Agenda Oficial Inmobiliaria Imperial"
                      value={agendaCustomHeader}
                      onChange={(e) => setAgendaCustomHeader(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                    />
                    {myBrand?.id && (
                      <a
                        href={`/agenda?agentId=${myBrand.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-bold pt-1"
                      >
                        Probar mi Vecy Agenda Pro personalizada →
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* HERRAMIENTA PRO 2: WIDGET DE AGENTE IA PERSONALIZABLE (FEMENINA/MASCULINA + PERSONALIDADES + PROMPT) */}
              <div className="panel-card p-8 border border-sky-500/30 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-500/40 flex items-center justify-center text-sky-400">
                      <Bot className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black text-foreground">
                          2. Widget de Agente IA Personalizable (Femenina / Masculina)
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          IA 24/7 en tu Sitio
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Elige el género de tu IA, ponle nombre, selecciona su personalidad con un botón o inyecta tu propio prompt para que atienda clientes en tu sitio web 24/7.
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2.5 cursor-pointer bg-secondary px-4 py-2 rounded-xl border border-border">
                    <input
                      type="checkbox"
                      checked={aiWidgetEnabled}
                      onChange={(e) => setAiWidgetEnabled(e.target.checked)}
                      className="w-4 h-4 accent-sky-500"
                    />
                    <span className="text-xs font-black uppercase tracking-wider text-foreground">
                      {aiWidgetEnabled ? "Widget IA Activo" : "Inactivo"}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Selección Femenina / Masculina */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                      Género de tu Agente IA
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setAiGender("female");
                          if (aiAgentName === "Mateo IA") setAiAgentName("Sofía IA");
                        }}
                        className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
                          aiGender === "female"
                            ? "bg-pink-500/20 border-pink-500 text-pink-300"
                            : "bg-background border-border text-muted-foreground"
                        }`}
                      >
                        👩 IA Femenina
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAiGender("male");
                          if (aiAgentName === "Sofía IA") setAiAgentName("Mateo IA");
                        }}
                        className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
                          aiGender === "male"
                            ? "bg-sky-500/20 border-sky-500 text-sky-300"
                            : "bg-background border-border text-muted-foreground"
                        }`}
                      >
                        👨 IA Masculino
                      </button>
                    </div>
                  </div>

                  {/* Nombre del Agente IA */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                      Nombre de tu Agente IA
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Sofía IA / Mateo IA"
                      value={aiAgentName}
                      onChange={(e) => setAiAgentName(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                    />
                  </div>

                  {/* Saludo de bienvenida */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                      Saludo Inicial en el Widget
                    </label>
                    <input
                      type="text"
                      placeholder="¡Hola! ¿Te ayudo a encontrar inmueble o agendar visita?"
                      value={aiWelcomeMessage}
                      onChange={(e) => setAiWelcomeMessage(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Botones Rápidos de Personalidad */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                    Personalidad Predefinida (Selecciona 1 con un clic)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {PERSONALITY_OPTIONS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setAiPersonality(p.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          aiPersonality === p.id
                            ? "bg-primary/20 border-primary text-foreground shadow-lg"
                            : "bg-background border-border text-muted-foreground hover:border-white/20"
                        }`}
                      >
                        <span className="text-xs font-black uppercase block text-primary">{p.label}</span>
                        <span className="text-[10px] leading-tight block mt-1">{p.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prompt Personalizado Libre */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                    Inyectar Prompt Propio / Reglas Especiales de tu Inmobiliaria (Opcional)
                  </label>
                  <textarea
                    placeholder="Ej: Somos especialistas en el norte de Bogotá y Sabana. Nuestro horario de atención presencial es de Lunes a Sábado de 8am a 6pm. Siempre ofrece primero agendar cita en nuestra Agenda Pro..."
                    value={aiCustomPrompt}
                    onChange={(e) => setAiCustomPrompt(e.target.value)}
                    className="w-full h-28 bg-background border border-border rounded-xl p-4 text-sm text-foreground outline-none focus:border-primary resize-none"
                  />
                </div>
              </div>

              {/* HERRAMIENTA PRO 3: SIMULADOR HIPOTECARIO & RENTABILIDAD ROI */}
              <div className="panel-card p-6 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-foreground">
                      3. Simulador Hipotecario Bancario & Calculadora ROI Inversor (Marca Propia)
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Se inserta automáticamente en tus fichas de inmuebles con los colores de tu agencia para calcular cuota mensual y renta estimada.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer bg-secondary px-4 py-2 rounded-xl border border-border">
                  <input
                    type="checkbox"
                    checked={roiCalculatorEnabled}
                    onChange={(e) => setRoiCalculatorEnabled(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500"
                  />
                  <span className="text-xs font-black uppercase">Activo</span>
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={updateBrandMutation.isPending}
                  className="btn-gold px-8 py-3.5 text-xs font-black uppercase tracking-widest cursor-pointer"
                >
                  {updateBrandMutation.isPending ? "Guardando Herramientas..." : "Guardar y Activar Mis Herramientas Pro"}
                </button>
              </div>
            </form>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB 4: FÁBRICA DE ENLACES CON SENSOR (MARCA PROPIA Y MARCA BLANCA) */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "links" && (
            <div className="animate-fade-in">
              <div className="panel-card p-8">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold text-foreground">
                    Fábrica de Enlaces con Sensor de Seguimiento (Con Marca y Marca Blanca Neutra)
                  </h2>
                </div>
                <p className="text-muted-foreground text-sm mb-8">
                  Cada enlace lleva instalado nuestro sensor inteligente de atribución. Tanto si lo compartes con tu marca como si lo publicas en Marca Blanca sin datos en redes sociales, el sistema detecta las visitas, descargas de PDF y te suma puntos (`vPoints`) para tu participación en las comisiones.
                </p>

                {loadingLinks ? (
                  <Skeleton className="h-40 w-full bg-secondary" />
                ) : stealthLinks?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No tienes enlaces generados aún. Ve a "Mis Inmuebles" y pulsa "Crear Link Sensor".</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stealthLinks?.map(({ link, property }) => {
                      const brandedFichaLink = `/ficha/${property.id}?mode=branded${myBrand?.id ? `&agentId=${myBrand.id}` : ""}&ref=${link.token}`;
                      const neutralFichaLink = `/ficha/${property.id}?mode=neutral&ref=${link.token}`;
                      const stealthFirewallLink = `/p/${link.token}`;

                      return (
                        <div
                          key={link.id}
                          className="p-5 rounded-2xl bg-secondary/50 border border-border hover:border-primary/30 transition-all space-y-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                              <p className="font-bold text-base text-primary">{property.name}</p>
                              <p className="text-xs font-mono text-muted-foreground mt-0.5">
                                Token Sensor: <span className="text-foreground">{link.token}</span> • {property.zone || property.location}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-center px-4 py-1.5 rounded-xl bg-background border border-border">
                                <p className="text-xl font-black text-primary">{link.clicks}</p>
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">Clics Reales</p>
                              </div>
                            </div>
                          </div>

                          {/* 3 Opciones de Enlace con el mismo Sensor de Puntos */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-white/5">
                            <button
                              type="button"
                              onClick={() => handleCopyUrl(brandedFichaLink, `${link.token}_brand`, "Link Ficha Con Tu Marca")}
                              className="p-3 rounded-xl bg-sky-950/50 hover:bg-sky-900/60 border border-sky-500/30 text-left flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <div>
                                <span className="text-xs font-black text-sky-300 uppercase block">1. Ficha Con Mi Marca</span>
                                <span className="text-[10px] text-zinc-400">Con tu logo, colores, datos y sensor</span>
                              </div>
                              {copiedToken === `${link.token}_brand` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-sky-400" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopyUrl(neutralFichaLink, `${link.token}_neutral`, "Link Ficha Marca Blanca Neutra")}
                              className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-left flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <div>
                                <span className="text-xs font-black text-white uppercase block">2. Ficha Marca Blanca (Terceros)</span>
                                <span className="text-[10px] text-zinc-400">Sin contactos ni colores + Sensor activo</span>
                              </div>
                              {copiedToken === `${link.token}_neutral` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-300" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopyUrl(stealthFirewallLink, `${link.token}_stealth`, "Link Muro de Fuego")}
                              className="p-3 rounded-xl bg-amber-950/30 hover:bg-amber-900/40 border border-amber-500/30 text-left flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <div>
                                <span className="text-xs font-black text-amber-300 uppercase block">3. Muro de Fuego Confidencial</span>
                                <span className="text-[10px] text-zinc-400">Exige registro de cédula para ver ficha</span>
                              </div>
                              {copiedToken === `${link.token}_stealth` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB 5: MÉTRICAS DE MARKETING, SEO Y PUNTOS EN REDES SOCIALES       */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "analytics" && (
            <div className="space-y-6 animate-fade-in">
              <div className="panel-card p-8">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-black text-foreground">
                    Estadísticas de Crecimiento Publicitario, SEO y Puntos por Red Social
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  Monitorea el tráfico real capturado por los sensores instalados en tus fichas con marca y en tus enlaces de marca blanca neutra.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                  <div className="p-4 rounded-2xl bg-secondary/60 border border-border">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">WhatsApp</span>
                    <span className="text-2xl font-black text-emerald-400">{affiliateStats?.byPlatform?.whatsapp ?? 0}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-secondary/60 border border-border">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Facebook / Instagram</span>
                    <span className="text-2xl font-black text-sky-400">
                      {(affiliateStats?.byPlatform?.facebook ?? 0) + (affiliateStats?.byPlatform?.instagram ?? 0)}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-secondary/60 border border-border">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Google SEO / Orgánico</span>
                    <span className="text-2xl font-black text-amber-400">{affiliateStats?.byPlatform?.google_seo ?? 0}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-secondary/60 border border-border">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Escaneos QR en PDF</span>
                    <span className="text-2xl font-black text-purple-400">{affiliateStats?.qrScans ?? 0}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-primary/10 border border-primary/30">
                    <span className="text-xs font-bold uppercase text-primary block">Interacciones en Fichas Con Marca</span>
                    <span className="text-3xl font-black text-foreground mt-1 block">{affiliateStats?.brandedInteractions ?? 0}</span>
                    <span className="text-[11px] text-muted-foreground">Posicionando tu propia marca inmobiliaria</span>
                  </div>

                  <div className="p-5 rounded-2xl bg-zinc-900 border border-white/15">
                    <span className="text-xs font-bold uppercase text-zinc-300 block">Interacciones en Marca Blanca Neutra</span>
                    <span className="text-3xl font-black text-white mt-1 block">{affiliateStats?.neutralInteractions ?? 0}</span>
                    <span className="text-[11px] text-zinc-400">Compartidos sin datos de contacto pero acreditados a ti</span>
                  </div>

                  <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30">
                    <span className="text-xs font-bold uppercase text-emerald-300 block">Total Puntos Acumulados (vPoints)</span>
                    <span className="text-3xl font-black text-emerald-400 mt-1 block">{affiliateStats?.vPoints ?? 0} pts</span>
                    <span className="text-[11px] text-emerald-200/70">Participación activa en distribución colaborativa</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB 6: CAPTAR INMUEBLE DE LA RED                                   */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "claim" && (
            <div className="animate-fade-in">
              <div className="panel-card p-8 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold text-foreground">Captar Inmueble de la Red Colaborativa</h2>
                </div>
                <p className="text-muted-foreground text-sm">
                  Los inmuebles mostrados aquí están disponibles para gestión comercial. Al vincularlos, puedes generar fichas con tu marca o enlaces de marca blanca neutra.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loadingAvailable ? (
                  Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl bg-card" />)
                ) : availableProperties?.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-muted-foreground panel-card">
                    <p>No hay inmuebles pendientes de asignación en este instante.</p>
                  </div>
                ) : (
                  availableProperties?.map(prop => (
                    <div key={prop.id} className="panel-card p-6 border-dashed flex flex-col justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-foreground mb-1">{prop.name}</h3>
                        <p className="text-xs text-muted-foreground mb-2">{prop.addressNeighborhood || prop.zone}</p>
                        <p className="text-lg font-bold text-primary mb-5">
                          ${Number(prop.price).toLocaleString("es-CO")} COP
                        </p>
                      </div>
                      <div className="space-y-2">
                        <button
                          onClick={() => claimMutation.mutate({ propertyId: prop.id })}
                          disabled={claimMutation.isPending}
                          className="btn-gold-outline w-full text-xs cursor-pointer"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Vincular a Mi Portafolio
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB 7: PUBLICAR INMUEBLE (ESTUDIO COMPLETO IA + ASISTENTE RÁPIDO)  */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "publish" && (
            <div className="animate-fade-in space-y-8">
              <div className="panel-card p-6 bg-gradient-to-r from-amber-500/15 via-primary/10 to-transparent border border-primary/40 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-foreground">
                    ¿Quieres subir galería fotográfica completa, amenidades internas/externas y subtipo exacto?
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Usa el Estudio Maestro de Publicación Unificada de Vecy Bienes Raíces para que la ficha técnica PDF quede perfecta al 100%.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProperty(null);
                    setIsUnifiedModalOpen(true);
                  }}
                  className="btn-gold px-6 py-3 text-xs font-black uppercase tracking-widest cursor-pointer"
                >
                  Abrir Estudio Maestro con Fotos + IA
                </button>
              </div>

              {/* ASISTENTE MAGICO */}
              <div className="panel-card p-8 border border-primary/20 relative overflow-hidden bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                  <h2 className="text-xl font-bold text-foreground">Asistente Rápido de JanIA (Texto o Link)</h2>
                </div>
                <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                  ¿Tienes una descripción de WhatsApp o el enlace de otra inmobiliaria? Pégalo aquí abajo y deja que JanIA rellene el formulario por ti.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Pegar Mensaje de WhatsApp</label>
                    <textarea
                      placeholder="Ej: Apto en venta Cedritos. 3 habitaciones, 2 baños, 85 mts. Valor: 450 millones..."
                      value={publishText}
                      onChange={(e) => setPublishText(e.target.value)}
                      className="w-full h-32 bg-background border border-border rounded-xl p-4 text-sm text-foreground outline-none resize-none"
                    />
                    <button
                      type="button"
                      disabled={parseTextMutation.isPending || !publishText.trim()}
                      onClick={() => parseTextMutation.mutate({ text: publishText })}
                      className="btn-gold w-full text-xs cursor-pointer"
                    >
                      {parseTextMutation.isPending ? "JanIA está leyendo..." : "Autocompletar con JanIA (Texto)"}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Pegar Enlace de Portal Inmobiliario</label>
                    <div className="flex flex-col h-full justify-between gap-3">
                      <div className="space-y-3">
                        <input
                          type="url"
                          placeholder="https://..."
                          value={publishUrl}
                          onChange={(e) => setPublishUrl(e.target.value)}
                          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none"
                        />
                        <p className="text-[11px] text-muted-foreground/60 leading-normal">
                          JanIA escaneará las características, título, precio y áreas para agilizar el registro.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={scrapeUrlMutation.isPending || !publishUrl.trim()}
                        onClick={() => scrapeUrlMutation.mutate({ url: publishUrl })}
                        className="btn-gold-outline w-full text-xs cursor-pointer"
                      >
                        {scrapeUrlMutation.isPending ? "Analizando enlace..." : "Autocompletar desde Enlace"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* FORMULARIO ESTRUCTURADO RÁPIDO */}
              <form onSubmit={handlePublishSubmit} className="panel-card p-8 space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-border">
                  <FileText className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">Detalles Estructurados del Inmueble</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2 col-span-full md:col-span-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Título del Anuncio *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Hermoso Apartamento Dúplex con Balcón en Cedritos"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Precio (COP) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: 450000000"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value.replace(/\D/g, ""))}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground font-mono outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Tipo de Transacción</label>
                    <select
                      value={formTransactionType}
                      onChange={(e) => setFormTransactionType(e.target.value as any)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none"
                    >
                      <option value="venta">Venta</option>
                      <option value="arriendo">Arriendo</option>
                      <option value="arriendo_temporal">Arriendo Temporal</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Tipo de Inmueble</label>
                    <select
                      value={formPropertyType}
                      onChange={(e) => setFormPropertyType(e.target.value as any)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none"
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

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Ciudad</label>
                    <input
                      type="text"
                      placeholder="Bogotá"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Zona / Localidad *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Usaquén"
                      value={formZone}
                      onChange={(e) => setFormZone(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Barrio</label>
                    <input
                      type="text"
                      placeholder="Ej: Cedritos"
                      value={formNeighborhood}
                      onChange={(e) => setFormNeighborhood(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Habitaciones</label>
                    <input
                      type="number"
                      min={0}
                      value={formBedrooms}
                      onChange={(e) => setFormBedrooms(Number(e.target.value))}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Baños</label>
                    <input
                      type="number"
                      min={0}
                      value={formBathrooms}
                      onChange={(e) => setFormBathrooms(Number(e.target.value))}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Garajes</label>
                    <input
                      type="number"
                      min={0}
                      value={formGarages}
                      onChange={(e) => setFormGarages(Number(e.target.value))}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Estrato</label>
                    <input
                      type="number"
                      min={1}
                      max={6}
                      value={formStratum}
                      onChange={(e) => setFormStratum(Number(e.target.value))}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Área Total (m²)</label>
                    <input
                      type="text"
                      placeholder="Ej: 85"
                      value={formAreaTotal}
                      onChange={(e) => setFormAreaTotal(e.target.value.replace(/\D/g, ""))}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      id="isAmoblado"
                      checked={formIsAmoblado}
                      onChange={(e) => setFormIsAmoblado(e.target.checked)}
                      className="w-5 h-5 rounded bg-background border-border text-primary"
                    />
                    <label htmlFor="isAmoblado" className="text-sm font-semibold text-foreground select-none cursor-pointer">¿Está Amoblado?</label>
                  </div>

                  <div className="space-y-2 col-span-full">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Descripción Detallada</label>
                    <textarea
                      placeholder="Comentarios adicionales sobre el inmueble..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full h-32 bg-background border border-border rounded-xl p-4 text-sm text-foreground outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-border flex justify-end">
                  <button
                    type="submit"
                    disabled={createPropertyMutation.isPending}
                    className="btn-gold px-8 py-3 text-sm cursor-pointer"
                  >
                    {createPropertyMutation.isPending ? "Publicando..." : "Publicar Inmueble en Vecy Bienes Raíces"}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>

      {/* Modal Unificado de Publicación (19 tipos + fotos + fichas) */}
      <UnifiedPublishModal
        isOpen={isUnifiedModalOpen}
        onClose={() => {
          setIsUnifiedModalOpen(false);
          setEditingProperty(null);
        }}
        defaultTab="oferta"
        editProperty={editingProperty}
        onSuccess={() => {
          refetchProps();
          refetchAvailable();
          setIsUnifiedModalOpen(false);
          setEditingProperty(null);
        }}
      />
    </div>
  );
}
