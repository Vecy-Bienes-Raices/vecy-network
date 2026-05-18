/**
 * PROPERTY CARD - VECY GOLD EDITION
 *
 * Estructura exacta requerida:
 * - Título: "[Tipo de Propiedad], en [Barrio], [Localidad], [Ciudad]"
 * - Precio: Con oferta si aplica
 * - Área, Habitaciones, Baños, Parqueaderos, Antigüedad
 * - Viralización Pro: Botones de compartir con/sin marca
 */

import { useState } from 'react';
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
  yearBuilt?: number;
  image: string;
  gallery?: string[];
  featured?: boolean;
  fichaUrl?: string;
  agentId?: number;
  onViewDetails?: () => void;
}

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

  const images: string[] = gallery && gallery.length > 0 ? gallery : [image];
  const VECY_FALLBACK = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop';
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
  const displayNeighborhood = neighborhood || zone || null;
  const displayCity = city || 'Bogotá';

  const formattedTitle = displayNeighborhood 
    ? `${propertyLabel} en ${displayNeighborhood}${locality ? `, ${locality}` : ''}`
    : name;

  const displayLocation = displayNeighborhood ? `${displayNeighborhood}, ${displayCity}` : location;
  const age = yearBuilt ? new Date().getFullYear() - yearBuilt : null;

  const formatPrice = (p: string | number) => {
    if (typeof p === 'string') return p;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(p);
  };

  return (
    <div className="vecy-card-apple group overflow-hidden hover:glow-gold transition-all duration-500 p-0 flex flex-col h-full">
      {/* ── Imagen / Carousel ── */}
      <div className="relative h-64 overflow-hidden bg-white/5">
        <img src={displayImage} alt={formattedTitle} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onError={() => setImgError(true)} />
        
        {/* Overlays de Viralización Pro */}
        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-6 text-center z-20">
          <div className="space-y-3 w-full">
            <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mb-4 flex items-center justify-center gap-2">
              <Zap className="w-3 h-3 animate-pulse" /> Viralización Pro
            </p>
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCopyLink('branded'); }}
              className="w-full py-2.5 bg-primary text-black rounded-xl font-bold text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-105 transition-transform"
            >
              {copied === 'branded' ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
              {copied === 'branded' ? 'Copiado' : 'Link con Mi Marca'}
            </button>
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCopyLink('stealth'); }}
              className="w-full py-2.5 bg-white/10 border border-white/20 text-white rounded-xl font-bold text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/20 transition-all"
            >
              {copied === 'stealth' ? <Check className="w-3 h-3" /> : <Users className="w-3 h-3" />}
              {copied === 'stealth' ? 'Copiado' : 'Red de Apoyo (Limpio)'}
            </button>
            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter mt-2">Gana Puntos al compartir</p>
          </div>
        </div>

        {featured && <div className="absolute top-4 right-4 bg-accent text-accent-foreground px-3 py-1 rounded-md font-bold text-[10px] uppercase tracking-widest z-10">Destacado</div>}

        <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsFavorite(!isFavorite); }} className="bg-black/60 backdrop-blur p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-all">
            <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>

        {images.length > 1 && (
          <>
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImgError(false); setCurrentImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1); }} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-accent text-white p-1.5 rounded-full transition-all z-10 opacity-0 group-hover:opacity-100"><ChevronLeft size={16} /></button>
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImgError(false); setCurrentImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1); }} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-accent text-white p-1.5 rounded-full transition-all z-10 opacity-0 group-hover:opacity-100"><ChevronRight size={16} /></button>
          </>
        )}
      </div>

      {/* ── Contenido ── */}
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-sm font-black text-white mb-2 uppercase tracking-tight line-clamp-2 leading-tight h-10">{formattedTitle}</h3>
        <div className="flex items-center gap-1.5 text-gray-500 mb-4 uppercase tracking-widest text-[9px] font-bold">
          <MapPin size={12} className="text-primary flex-shrink-0" />
          <span className="truncate">{displayLocation}</span>
        </div>

        <div className="mb-4 pb-4 border-b border-white/5">
          <p className="text-2xl font-black text-primary leading-tight">{formatPrice(price)}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 flex-1">
          <div className="flex items-center gap-2">
            <Square size={14} className="text-primary/50" />
            <div><p className="text-[8px] text-gray-500 font-bold uppercase">Área</p><p className="text-xs font-black text-white">{area} m²</p></div>
          </div>
          {(bedrooms ?? 0) > 0 && (
            <div className="flex items-center gap-2">
              <Bed size={14} className="text-primary/50" />
              <div><p className="text-[8px] text-gray-500 font-bold uppercase">Hab</p><p className="text-xs font-black text-white">{bedrooms}</p></div>
            </div>
          )}
        </div>

        <button className="btn-gold-outline w-full text-[10px] py-3.5 tracking-[0.2em] font-black uppercase" onClick={() => navigate(`/property/${id}`)}>Ver Detalles Pro</button>
      </div>
    </div>
  );
}
