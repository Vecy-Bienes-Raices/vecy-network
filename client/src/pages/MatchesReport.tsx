import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { 
  Sparkles, 
  Search, 
  Phone, 
  MapPin, 
  DollarSign, 
  Home as HomeIcon, 
  ArrowRightLeft, 
  RefreshCw, 
  Calendar,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";

// Helper to format WhatsApp numbers to clean wa.me links
function getWhatsAppLink(phone: string | null | undefined): string {
  if (!phone) return "#";
  // Remove suffix @c.us if present, and any non-digits
  let clean = phone.split("@")[0].replace(/\D/g, "");
  // If it's a 10-digit number starting with 3, prefix with 57 (Colombia country code)
  if (clean.length === 10 && clean.startsWith("3")) {
    clean = "57" + clean;
  }
  return `https://wa.me/${clean}`;
}

// Format phone number for display (e.g. +57 316 656 9719)
function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return "No disponible";
  let clean = phone.split("@")[0].replace(/\D/g, "");
  if (clean.startsWith("57") && clean.length === 12) {
    return `+57 ${clean.substring(2, 5)} ${clean.substring(5, 8)} ${clean.substring(8)}`;
  }
  if (clean.length === 10 && clean.startsWith("3")) {
    return `+57 ${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6)}`;
  }
  return `+${clean}`;
}

// Format currency in COP
function formatCOP(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "$0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "$0";
  
  if (num >= 1_000_000_000) {
    return `$${(num / 1_000_000_000).toFixed(1)}M millones`;
  }
  if (num >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(0)}M`;
  }
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(num);
}

// Convert property type to friendly Spanish text
function getPropertyTypeLabel(type: string): string {
  const mapping: Record<string, string> = {
    apartment: "Apartamento",
    house: "Casa",
    building: "Edificio",
    warehouse: "Bodega",
    farm: "Finca",
    hotel: "Hotel",
    office: "Oficina",
    land: "Lote/Terreno",
    commercial: "Local Comercial",
    loft: "Loft",
    consultorio: "Consultorio"
  };
  return mapping[type] || type;
}

export default function MatchesReport() {
  const { data: matches, isLoading, refetch, isFetching } = trpc.janIA.getAllMatches.useQuery();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [minScore, setMinScore] = useState(70);
  const [selectedCity, setSelectedCity] = useState("Todas");
  const [selectedType, setSelectedType] = useState("Todos");
  const [showFilters, setShowFilters] = useState(false);

  // Extract unique cities and property types for filters
  const cities = ["Todas", ...Array.from(new Set(
    (matches || []).map(m => m.property.city).filter(Boolean)
  ))];

  const propertyTypes = ["Todos", ...Array.from(new Set(
    (matches || []).map(m => m.property.propertyType).filter(Boolean)
  ))];

  // Filtering matches
  const filteredMatches = (matches || []).filter((m) => {
    const scoreVal = parseFloat(m.matchScore?.toString() || "0");
    if (scoreVal < minScore) return false;

    if (selectedCity !== "Todas" && m.property.city !== selectedCity) return false;
    if (selectedType !== "Todos" && m.property.propertyType !== selectedType) return false;

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const matchText = [
        m.property.name,
        m.property.zone,
        m.property.city,
        m.requirement.name,
        m.requirement.zonaDeseada,
        m.matchReason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      
      if (!matchText.includes(term)) return false;
    }

    return true;
  });

  // Calculate statistics
  const totalCount = matches?.length || 0;
  const filteredCount = filteredMatches.length;
  const avgScore = totalCount > 0 
    ? (matches!.reduce((acc, m) => acc + parseFloat(m.matchScore?.toString() || "0"), 0) / totalCount).toFixed(1)
    : "0";
  const highQualityCount = (matches || []).filter(m => parseFloat(m.matchScore?.toString() || "0") >= 85).length;

  return (
    <div className="min-h-screen bg-[#060606] text-white selection:bg-[#bf953f]/30">
      <Navbar />

      {/* Background radial effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-[#bf953f]/5 rounded-full blur-[150px] pointer-events-none" />

      <main className="container pt-32 pb-24 relative z-10">
        
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-[#bf953f]/10 border border-[#bf953f]/20 text-[#bf953f]">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </span>
              <span className="text-xs font-bold tracking-widest uppercase text-[#bf953f]">
                Inteligencia Vecy Network
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
              Coincidencias de JanIA
            </h1>
            <p className="text-zinc-400 mt-2 font-light max-w-xl">
              Reporte consolidado de cruces de Oferta (Inmuebles) y Demanda (Requerimientos) detectados en tiempo real.
            </p>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <Button
              onClick={() => refetch()}
              disabled={isFetching}
              variant="outline"
              className="border-white/10 bg-white/5 hover:bg-white/10 hover:text-white flex items-center gap-2 rounded-xl h-11"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
          </div>
        </div>

        {/* Statistics Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Coincidencias Totales", value: totalCount, subtitle: "Cruzados por IA", icon: ArrowRightLeft, color: "from-blue-500/10 to-cyan-500/10 border-blue-500/20 text-blue-400" },
            { label: "Afinidad Promedio", value: `${avgScore}%`, subtitle: "Coeficiente de match", icon: TrendingUp, color: "from-amber-500/10 to-[#bf953f]/10 border-[#bf953f]/20 text-[#bf953f]" },
            { label: "Matches Premium", value: highQualityCount, subtitle: "Afinidad >= 85%", icon: Sparkles, color: "from-purple-500/10 to-pink-500/10 border-purple-500/20 text-purple-400" },
            { label: "Filtrados / Mostrados", value: `${filteredCount} / ${totalCount}`, subtitle: "Aplicando filtros", icon: SlidersHorizontal, color: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-400" }
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`bg-gradient-to-br ${stat.color} border rounded-2xl p-5 backdrop-blur-md relative overflow-hidden`}
            >
              <div className="absolute right-4 top-4 opacity-10">
                <stat.icon className="w-12 h-12" />
              </div>
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">{stat.label}</p>
              <h3 className="text-3xl font-extrabold mt-1 tracking-tight">{stat.value}</h3>
              <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">{stat.subtitle}</p>
            </motion.div>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-4 mb-8 backdrop-blur-md">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            
            {/* Search Input */}
            <div className="relative w-full md:flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar por barrio, requerimiento, ciudad, razón..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-[#bf953f] transition-all"
              />
            </div>

            {/* Toggle Filters Button */}
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="border-white/10 bg-white/5 hover:bg-white/10 hover:text-white flex items-center gap-2 rounded-xl h-11 w-full md:w-auto"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtros Avanzados
            </Button>
          </div>

          {/* Advanced Filters Drawer/Content */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-4 pt-4 border-t border-white/5 grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                {/* Min Affinity Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Afinidad Mínima</span>
                    <span className="font-bold text-[#bf953f]">{minScore}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={minScore}
                    onChange={(e) => setMinScore(parseInt(e.target.value))}
                    className="w-full accent-[#bf953f] bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* City Filter */}
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Ciudad de Inmueble</label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-[#bf953f] text-zinc-300"
                  >
                    {cities.map((city) => (
                      <option key={city} value={city} className="bg-[#0c0c0c] text-white">
                        {city}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Property Type Filter */}
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Tipo de Inmueble</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-[#bf953f] text-zinc-300"
                  >
                    {propertyTypes.map((type) => (
                      <option key={type} value={type} className="bg-[#0c0c0c] text-white">
                        {type === "Todos" ? "Todos" : getPropertyTypeLabel(type)}
                      </option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Matches List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="w-10 h-10 text-[#bf953f] animate-spin" />
            <p className="text-zinc-500 font-mono text-sm">Cargando coincidencias neuronales...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-16 text-center">
            <AlertCircle className="w-12 h-12 text-[#bf953f] mx-auto mb-4 opacity-60 animate-bounce" />
            <h3 className="text-lg font-bold text-white">No se encontraron coincidencias</h3>
            <p className="text-zinc-500 text-sm mt-1 max-w-md mx-auto">
              Intenta reduciendo el filtro de afinidad mínima o buscando otros términos.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {filteredMatches.map((m, idx) => {
                const score = parseFloat(m.matchScore?.toString() || "0");
                const date = new Date(m.createdAt || new Date()).toLocaleDateString("es-CO", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                });

                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, delay: Math.min(idx * 0.05, 0.5) }}
                    className="group bg-[#0c0c0c] border border-white/5 hover:border-[#bf953f]/30 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300"
                  >
                    
                    {/* Top Ribbon - Score & Date */}
                    <div className="bg-white/[0.02] px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        {/* Score Indicator */}
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${
                            score >= 85 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                            score >= 75 ? 'bg-[#bf953f] shadow-[0_0_8px_rgba(191,149,63,0.5)]' :
                            'bg-cyan-500'
                          }`} />
                          <span className="text-lg font-extrabold tracking-tight">
                            {score.toFixed(0)}% Afinidad
                          </span>
                        </div>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 capitalize">
                          {m.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-mono">
                        <Calendar className="w-3.5 h-3.5" />
                        {date}
                      </div>
                    </div>

                    {/* Middle Section - Left (Property) / Right (Requirement) */}
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                      
                      {/* Divider icon in the center */}
                      <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#111] border border-white/10 items-center justify-center text-[#bf953f] z-10">
                        <ArrowRightLeft className="w-4 h-4" />
                      </div>

                      {/* Left Block: Inmueble (Oferta) */}
                      <div className="space-y-4">
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-widest text-[#bf953f] bg-[#bf953f]/5 px-2 py-0.5 rounded border border-[#bf953f]/10">
                            Oferta / Inmueble
                          </span>
                          <h4 className="text-lg font-bold text-white mt-2 group-hover:text-[#bf953f] transition-colors">
                            {m.property.name}
                          </h4>
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-2 italic font-light">
                            {m.property.rawText || "Sin descripción corta"}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-white/[0.02] border border-white/5 p-2.5 rounded-xl flex items-center gap-2">
                            <HomeIcon className="w-4 h-4 text-zinc-400" />
                            <div>
                              <p className="text-[10px] text-zinc-500">Tipo</p>
                              <p className="font-medium">{getPropertyTypeLabel(m.property.propertyType)}</p>
                            </div>
                          </div>
                          <div className="bg-white/[0.02] border border-white/5 p-2.5 rounded-xl flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-zinc-400" />
                            <div>
                              <p className="text-[10px] text-zinc-500">Valor</p>
                              <p className="font-medium text-emerald-400">{formatCOP(m.property.price)}</p>
                            </div>
                          </div>
                          <div className="col-span-2 bg-white/[0.02] border border-white/5 p-2.5 rounded-xl flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-zinc-400" />
                            <div>
                              <p className="text-[10px] text-zinc-500">Ubicación</p>
                              <p className="font-medium truncate">{m.property.zone}, {m.property.city}</p>
                            </div>
                          </div>
                        </div>

                        {/* Property Contact Info */}
                        <div className="bg-[#bf953f]/5 border border-[#bf953f]/10 rounded-2xl p-4 flex items-center justify-between gap-4 mt-2">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#bf953f]/10 border border-[#bf953f]/20 flex items-center justify-center text-[#bf953f]">
                              <Phone className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Captador / Dueño</p>
                              <p className="text-sm font-bold tracking-tight text-zinc-200">
                                {formatPhoneDisplay(m.property.idUsuarioWhatsapp)}
                              </p>
                            </div>
                          </div>
                          
                          {m.property.idUsuarioWhatsapp && (
                            <a
                              href={getWhatsAppLink(m.property.idUsuarioWhatsapp)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-[#25D366] hover:bg-[#20ba5a] text-black text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors"
                            >
                              WhatsApp
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Right Block: Requerimiento (Demanda) */}
                      <div className="space-y-4 md:pl-4">
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-widest text-[#00d2ff] bg-[#00d2ff]/5 px-2 py-0.5 rounded border border-[#00d2ff]/10">
                            Demanda / Requerimiento
                          </span>
                          <h4 className="text-lg font-bold text-white mt-2">
                            {m.requirement.name || `Cliente Requerimiento #${m.requirement.id}`}
                          </h4>
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-2 italic font-light">
                            {m.requirement.rawText || "Sin descripción corta"}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-white/[0.02] border border-white/5 p-2.5 rounded-xl flex items-center gap-2">
                            <HomeIcon className="w-4 h-4 text-zinc-400" />
                            <div>
                              <p className="text-[10px] text-zinc-500">Deseado</p>
                              <p className="font-medium">{getPropertyTypeLabel(m.requirement.tipoInmuebleDeseado)}</p>
                            </div>
                          </div>
                          <div className="bg-white/[0.02] border border-white/5 p-2.5 rounded-xl flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-zinc-400" />
                            <div>
                              <p className="text-[10px] text-zinc-500">Presupuesto Max</p>
                              <p className="font-medium text-emerald-400">{formatCOP(m.requirement.presupuestoMax)}</p>
                            </div>
                          </div>
                          <div className="col-span-2 bg-white/[0.02] border border-white/5 p-2.5 rounded-xl flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-zinc-400" />
                            <div>
                              <p className="text-[10px] text-zinc-500">Zona Preferida</p>
                              <p className="font-medium truncate">{m.requirement.zonaDeseada || "Cualquiera"}, {m.requirement.ciudadDeseada}</p>
                            </div>
                          </div>
                        </div>

                        {/* Seeker Contact Info */}
                        <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-2xl p-4 flex items-center justify-between gap-4 mt-2">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                              <Phone className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Buscador / Cliente</p>
                              <p className="text-sm font-bold tracking-tight text-zinc-200">
                                {formatPhoneDisplay(m.requirement.idUsuarioWhatsapp)}
                              </p>
                            </div>
                          </div>
                          
                          {m.requirement.idUsuarioWhatsapp && (
                            <a
                              href={getWhatsAppLink(m.requirement.idUsuarioWhatsapp)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-[#25D366] hover:bg-[#20ba5a] text-black text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors"
                            >
                              WhatsApp
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Bottom Explanation Panel */}
                    <div className="bg-white/[0.01] border-t border-white/5 p-6">
                      <div className="flex gap-3 items-start">
                        <div className="p-2 rounded-xl bg-[#bf953f]/10 text-[#bf953f] mt-0.5">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Análisis Neuronal de JanIA</h5>
                          <p className="text-sm text-zinc-300 mt-1 font-light leading-relaxed">
                            {m.matchReason || "No hay justificación detallada para esta coincidencia."}
                          </p>
                        </div>
                      </div>
                    </div>

                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

      </main>
    </div>
  );
}
