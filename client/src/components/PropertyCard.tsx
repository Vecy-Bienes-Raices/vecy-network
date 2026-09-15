/**
 * PROPERTY CARD - VECY GOLD EDITION
 *
 * Estructura exacta requerida:
 * - Título: "[Tipo de Propiedad], en [Barrio], [Localidad], [Ciudad]"
 * - Precio: Con oferta si aplica
 * - Área, Habitaciones, Baños, Parqueaderos, Antigüedad
 * - Viralización Pro: Botones de compartir con/sin marca
 */

import { useState, useRef } from 'react';
import { 
  MapPin, 
  Bed, 
  Bath, 
  Square, 
  Heart, 
  Share2, 
  Calendar, 
  Car, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Zap, 
  Check 
} from 'lucide-react';
import { useLocation } from 'wouter';

// ─── Tipos de propiedad soportados ────────────────────────────────────────────
type PropertyType =
  | 'apartment'
  | 'house'
  | 'loft'
  | 'commercial'
  | 'land'
  | 'building'
  | 'hotel'
  | 'farm'
  | 'warehouse'
  | 'office';

interface PropertyCardProps {
  id: string | number;
  name: string;
  propertyType?: PropertyType;
  transactionType?: string;
  price: string | number;
  priceOffer?: string | number;
  location: string;
  zone?: string;
  neighborhood?: string;
  locality?: string;
  city?: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: string | number;
  parking?: number;
  piso?: string | number;
  yearBuilt?: number;
  image: string;
  gallery?: string[];
  featured?: boolean;
  fichaUrl?: string;
  agentId?: number;
  onViewDetails?: () => void;
}

const getTransactionBadge = (type?: string) => {
  if (!type) return { label: 'Venta', className: 'bg-gradient-to-r from-red-600 to-rose-700 text-white border border-red-500/40 shadow-lg' };
  const low = type.toLowerCase();
  // 🟪 Arriendo Temporal / Opción Compra
  if (low.includes('arriendo_con_opcion') || low.includes('opcion_de_compra') || low.includes('arriendo_temporal') || low.includes('temporal')) {
    return { 
      label: low.includes('temporal') ? 'Arriendo Temporal' : 'Opción Compra', 
      className: 'bg-gradient-to-r from-purple-600 to-fuchsia-700 text-white border border-purple-500/40 shadow-lg' 
    };
  }
  // 🟦 Venta | Permuta / Permuta
  if (low.includes('venta_permuta') || low.includes('permuta') || low.includes('venta_o_arriendo')) {
    return { 
      label: low.includes('venta_permuta') ? 'Venta | Permuta' : (low.includes('permuta') ? 'Permuta' : 'Venta | Arriendo'), 
      className: 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white border border-blue-500/40 shadow-lg' 
    };
  }
  // 🟩 Arriendo
  if (low.includes('arriendo') || low.includes('rent')) {
    return { 
      label: 'Arriendo', 
      className: 'bg-gradient-to-r from-emerald-600 to-green-700 text-white border border-emerald-500/40 shadow-lg' 
    };
  }
  // 🟥 Venta
  return { 
    label: 'Venta', 
    className: 'bg-gradient-to-r from-red-600 to-rose-700 text-white border border-red-500/40 shadow-lg' 
  };
};

const PROPERTY_TYPE_LABELS: Record<PropertyType | string, string> = {
  apartment: 'Apartamento',
  house: 'Casa',
  loft: 'Loft',
  commercial: 'Local Comercial',
  land: 'Terreno',
  building: 'Edificio',
  hotel: 'Hotel',
  farm: 'Finca',
  warehouse: 'Bodega',
  office: 'Oficina',
};

export default function PropertyCard({
  id,
  name,
  propertyType = 'apartment',
  transactionType,
  price,
  priceOffer,
  location,
  zone,
  neighborhood,
  locality,
  city = 'Bogotá',
  bedrooms = 0,
  bathrooms = 0,
  area = 0,
  parking = 0,
  piso,
  yearBuilt,
  image,
  gallery = [],
  featured = false,
  agentId,
  onViewDetails,
}: PropertyCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [copied, setCopied] = useState<'branded' | 'stealth' | null>(null);
  const [, navigate] = useLocation();

  // 📱 Referencias para Detección de Gestos Táctiles (Swipe en Celulares)
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 40; // Umbral táctil cómodo en píxeles

    if (diff > minSwipeDistance) {
      // Deslizó hacia la izquierda -> Siguiente foto
      e.stopPropagation();
      setImgError(false);
      setCurrentImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1);
    } else if (diff < -minSwipeDistance) {
      // Deslizó hacia la derecha -> Foto anterior
      e.stopPropagation();
      setImgError(false);
      setCurrentImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const VECY_FALLBACK = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop';
  
  const formatImageUrl = (u: string | null | undefined): string => {
    if (!u) return VECY_FALLBACK;
    if (u.includes('/uploads/')) {
      return u.substring(u.indexOf('/uploads/'));
    }
    return u;
  };

  const images: string[] = (gallery && gallery.length > 0 ? gallery : [image]).map(formatImageUrl);
  const displayImage = imgError ? VECY_FALLBACK : (images[currentImageIndex] || VECY_FALLBACK);

  const handleCopyLink = (type: 'branded' | 'stealth') => {
    const baseUrl = window.location.origin;
    const path = `/property/${id}`;
    const url = type === 'branded' 
      ? `${baseUrl}${path}` 
      : `${baseUrl}${path}?mode=stealth&ref=${agentId || 'VECY'}`;

    navigator.clipboard.writeText(url).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const propertyLabel = PROPERTY_TYPE_LABELS[propertyType as PropertyType] || 'Inmueble';

  let derivedNeighborhood = neighborhood || zone || null;
  let derivedLocality = locality || null;
  let derivedCity = city || 'Bogotá';

  if (!derivedNeighborhood && location) {
    const parts = location.split(',').map(s => s.trim());
    if (parts.length > 0 && parts[0] && !parts[0].toLowerCase().includes('bogot')) {
      derivedNeighborhood = parts[0];
    }
    if (parts.length > 1 && !derivedLocality && !parts[1].toLowerCase().includes('bogot')) {
      derivedLocality = parts[1];
    }
  }

  const displayNeighborhood = derivedNeighborhood;
  const displayLocality = derivedLocality;
  const displayCity = derivedCity;
  const badge = getTransactionBadge(transactionType);

  // Formato conciso
  const formattedTitle = displayNeighborhood 
    ? `${propertyLabel} en ${displayNeighborhood}`
    : name
        .replace(/super oferta/gi, '')
        .replace(/en venta/gi, '')
        .replace(/en arriendo/gi, '')
        .replace(/para venta/gi, '')
        .replace(/para arriendo/gi, '')
        .replace(/\b(bogot[aá]|colombia)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim() || `${propertyLabel} en Bogotá`;

  const formatPriceNumber = (p: string | number) => {
    const num = Number(p || 0);
    return num.toLocaleString('es-CO');
  };

  return (
    <div className="vecy-card-apple group overflow-hidden hover:glow-gold transition-all duration-500 p-0 flex flex-col h-full bg-zinc-950/90 border border-white/10 shadow-2xl hover:border-primary/40">
      {/* ── Imagen / Carousel Táctil con Ribbon Doctrinal ── */}
      <div 
        className="relative h-64 overflow-hidden bg-white/5 select-none touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img 
          src={displayImage} 
          alt={formattedTitle} 
          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" 
          onError={() => setImgError(true)} 
        />
        
        {/* 🏷️ Etiqueta de Negocio sobre la Foto (Estilo Wix Eduardo) */}
        <div className="absolute top-0 right-0 z-10 pointer-events-none">
          <span className={`px-4 py-1.5 rounded-bl-2xl text-[11px] font-black uppercase tracking-wider ${badge.className}`}>
            {badge.label}
          </span>
        </div>

        {/* Overlays de Viralización Pro */}
        <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-6 text-center z-20">
          <div className="space-y-3 w-full">
            <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mb-4 flex items-center justify-center gap-2">
              <Zap className="w-3 h-3 animate-pulse" /> Viralización Pro
            </p>
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCopyLink('branded'); }}
              className="w-full py-2.5 bg-primary text-black rounded-xl font-bold text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all"
            >
              {copied === 'branded' ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
              {copied === 'branded' ? 'Copiado' : 'Link con Mi Marca'}
            </button>
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCopyLink('stealth'); }}
              className="w-full py-2.5 bg-white/10 border border-white/20 text-white rounded-xl font-bold text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/20 active:scale-95 transition-all"
            >
              {copied === 'stealth' ? <Check className="w-3 h-3" /> : <Users className="w-3 h-3" />}
              {copied === 'stealth' ? 'Copiado' : 'Red de Apoyo (Limpio)'}
            </button>
            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter mt-2">Gana Puntos al compartir</p>
          </div>
        </div>

        {featured && (
          <div className="absolute top-3 left-3 bg-accent text-accent-foreground px-2.5 py-1 rounded-md font-bold text-[9px] uppercase tracking-widest z-10 shadow-md">
            Destacado
          </div>
        )}

        <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsFavorite(!isFavorite); }} className="bg-black/70 backdrop-blur p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-all cursor-pointer">
            <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>

        {images.length > 1 && (
          <>
            {/* Contador Compacto */}
            <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[9px] font-black text-zinc-300 border border-white/10 z-10">
              {currentImageIndex + 1} / {images.length}
            </div>

            {/* 📱 Indicadores de Fotos Táctiles (Dots Táctiles Estilo Móvil) */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 pointer-events-auto">
              {images.slice(0, 5).map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setImgError(false);
                    setCurrentImageIndex(i);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    currentImageIndex === i ? 'w-4 bg-primary' : 'w-1.5 bg-white/40 hover:bg-white/70'
                  }`}
                  aria-label={`Ver foto ${i + 1}`}
                />
              ))}
              {images.length > 5 && (
                <span className="text-[8px] font-black text-zinc-400 pl-0.5">+{images.length - 5}</span>
              )}
            </div>

            {/* Flechas de Navegación (Visibles en hover desktop y táctiles) */}
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImgError(false); setCurrentImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1); }} 
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-accent text-white p-2 rounded-full transition-all z-10 opacity-0 group-hover:opacity-100 active:scale-90 cursor-pointer"
              aria-label="Foto anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImgError(false); setCurrentImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1); }} 
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-accent text-white p-2 rounded-full transition-all z-10 opacity-0 group-hover:opacity-100 active:scale-90 cursor-pointer"
              aria-label="Siguiente foto"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>

      {/* ── Contenido Estructurado Fiel a Wix Eduardo ── */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Precio Prominente ($ en Verde + Número en Naranja) */}
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400">$</span>
            <span className="text-2xl sm:text-3xl font-black text-orange-500 tracking-tight">
              {formatPriceNumber(price)}
            </span>
          </div>

          <div className="border-b border-white/10 mb-3" />

          {/* Título Concreto: [TIPO DE INMUEBLE] EN [BARRIO] */}
          <h3 
            className="text-sm sm:text-base font-black text-white uppercase tracking-tight line-clamp-1 hover:text-primary transition-colors cursor-pointer mb-1.5"
            onClick={() => navigate(`/property/${id}`)}
            title={formattedTitle}
          >
            {formattedTitle}
          </h3>

          {/* Símbolo Dorado de Ubicación: [Localidad], [Ciudad] */}
          <div className="flex items-center gap-1.5 text-zinc-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <MapPin size={13} className="text-primary shrink-0" />
            <span className="truncate">
              {displayLocality ? `${displayLocality}, ` : ''}{displayCity}
            </span>
          </div>

          <div className="border-b border-white/10 my-3" />

          {/* Grilla de 4 Especificaciones (Alcobas, Baños, Piso, Área) */}
          <div className="grid grid-cols-4 gap-2 text-center pt-1 pb-3">
            <div>
              <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Alcobas</p>
              <p className="text-sm font-black text-white mt-0.5">{bedrooms || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Baños</p>
              <p className="text-sm font-black text-white mt-0.5">{bathrooms || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                {piso ? 'Piso' : 'Garajes'}
              </p>
              <p className="text-sm font-black text-white mt-0.5">{piso || parking || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Área</p>
              <p className="text-sm font-black text-white mt-0.5">{area} m²</p>
            </div>
          </div>
        </div>

        {/* Botonera de Tarjeta Ergonómica Táctil */}
        <div className="grid grid-cols-2 gap-2.5 mt-auto pt-3 border-t border-white/5">
          <button 
            className="btn-gold text-[10px] min-h-[44px] py-2.5 tracking-widest font-black uppercase flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 touch-manipulation transition-all cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              const code = `ID-BOG-${(zone || locality || 'VECY').slice(0, 3).toUpperCase()}-${id}`;
              navigate(`/agenda/${id}?nombre=${encodeURIComponent(formattedTitle || name)}&codigo=${encodeURIComponent(code)}`);
            }}
            title="Agendar visita oficial para este inmueble"
          >
            <Calendar size={14} className="text-black shrink-0" /> Agendar
          </button>
          <button 
            className="btn-gold-outline text-[10px] min-h-[44px] py-2.5 tracking-widest font-black uppercase flex items-center justify-center hover:bg-white/10 active:scale-95 touch-manipulation transition-all cursor-pointer" 
            onClick={() => navigate(`/property/${id}`)}
          >
            Ver Detalles
          </button>
        </div>
      </div>
    </div>
  );
}
