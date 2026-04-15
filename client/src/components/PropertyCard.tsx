/**
 * PROPERTY CARD - VECY GOLD EDITION
 *
 * Estructura exacta requerida:
 * - Título: "[Tipo de Propiedad], en [Barrio], [Localidad], [Ciudad]"
 * - Precio: Con oferta si aplica
 * - Área, Habitaciones, Baños, Parqueaderos, Antigüedad
 * - Carousel de imágenes funcional
 */

import { useState } from 'react';
import { MapPin, Bed, Bath, Square, Heart, Share2, Calendar, Car, ChevronLeft, ChevronRight } from 'lucide-react';

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
  fichaUrl,
  onViewDetails,
}: PropertyCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imgError, setImgError] = useState(false);

  // ─── Galería de imágenes ─────────────────────────────────────────────────────
  // Prioridad: gallery prop > imagen individual
  const images: string[] = gallery && gallery.length > 0
    ? gallery
    : image
      ? [image]
      : [];

  // Fallback profesional: Imagen de edificio moderna y neutra (no baños)
  const VECY_FALLBACK = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop';
  const displayImage = imgError
    ? VECY_FALLBACK
    : (images[currentImageIndex] || VECY_FALLBACK);

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImgError(false);
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImgError(false);
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // ─── Título en formato requerido ─────────────────────────────────────────────
  // Se usa el nombre provisto de forma estricta desde la base de datos
  const formattedTitle = name;

  // ─── Antigüedad ──────────────────────────────────────────────────────────────
  const age = yearBuilt ? new Date().getFullYear() - yearBuilt : null;

  // ─── Formateo de precios ─────────────────────────────────────────────────────
  const formatPrice = (p: string | number) => {
    if (typeof p === 'string') return p;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(p);
  };

  const formattedPrice = formatPrice(price);
  const formattedOfferPrice = priceOffer ? formatPrice(priceOffer) : null;

  // ─── Destino del botón ───────────────────────────────────────────────────────
  const detailHref = `/property/${id}`;

  return (
    <div className="card-float group overflow-hidden hover:glow-gold transition-all duration-300">
      {/* ── Imagen / Carousel ── */}
      <div className="relative h-64 overflow-hidden bg-white/5">
        <img
          src={displayImage}
          alt={formattedTitle}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={() => setImgError(true)}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

        {/* Badge destacado */}
        {featured && (
          <div className="absolute top-4 right-4 bg-accent text-accent-foreground px-3 py-1 rounded-md font-bold text-xs uppercase tracking-wider z-10">
            Destacado
          </div>
        )}

        {/* Acciones flotantes */}
        <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <button
            onClick={(e) => { e.preventDefault(); setIsFavorite(!isFavorite); }}
            className="bg-background/80 backdrop-blur p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-all duration-300"
          >
            <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button className="bg-background/80 backdrop-blur p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-all duration-300">
            <Share2 size={18} />
          </button>
        </div>

        {/* Carousel controls — solo si hay más de 1 imagen */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-accent text-white hover:text-accent-foreground p-1.5 rounded-full transition-all duration-200 z-10 opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-accent text-white hover:text-accent-foreground p-1.5 rounded-full transition-all duration-200 z-10 opacity-0 group-hover:opacity-100"
            >
              <ChevronRight size={18} />
            </button>

            {/* Dots indicadores */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
              {images.slice(0, 8).map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImgError(false); setCurrentImageIndex(i); }}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                    i === currentImageIndex ? 'bg-accent w-3' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Contenido ── */}
      <div className="p-5">
        {/* Título estructurado */}
        <h3 className="text-base font-bold text-white mb-1.5 line-clamp-2 leading-snug">
          {formattedTitle}
        </h3>

        <div className="flex items-center gap-1.5 text-gray-400 mb-3">
          <MapPin size={14} className="text-accent flex-shrink-0" />
          <span className="text-xs truncate">{location}</span>
        </div>

        {/* Precio */}
        <div className="mb-3 pb-3 border-b border-white/10">
          {formattedOfferPrice ? (
            <div>
              <p className="text-xs text-gray-500 line-through">{formattedPrice}</p>
              <p className="text-2xl font-bold text-accent leading-tight">{formattedOfferPrice}</p>
              <p className="text-xs text-green-400 mt-0.5">En oferta</p>
            </div>
          ) : (
            <div>
              <p className="text-2xl font-bold text-accent leading-tight">{formattedPrice}</p>
              <p className="text-xs text-gray-500 mt-0.5">Precio de venta</p>
            </div>
          )}
        </div>

        {/* Características */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* Área */}
          <div className="flex items-center gap-1.5">
            <Square size={15} className="text-accent flex-shrink-0" />
            <div>
              <p className="text-[10px] text-gray-500">Área</p>
              <p className="text-xs font-semibold text-white">{area} m²</p>
            </div>
          </div>

          {/* Habitaciones / Apartamentos / Unidades */}
          {(bedrooms ?? 0) > 0 && (
            <div className="flex items-center gap-1.5">
              <Bed size={15} className="text-accent flex-shrink-0" />
              <div>
                <p className="text-[10px] text-gray-500">
                  {propertyType === 'building' ? 'Apartamentos' : 'Habitaciones'}
                </p>
                <p className="text-xs font-semibold text-white">{bedrooms}</p>
              </div>
            </div>
          )}

          {/* Baños */}
          {(bathrooms ?? 0) > 0 && (
            <div className="flex items-center gap-1.5">
              <Bath size={15} className="text-accent flex-shrink-0" />
              <div>
                <p className="text-[10px] text-gray-500">Baños</p>
                <p className="text-xs font-semibold text-white">{bathrooms}</p>
              </div>
            </div>
          )}

          {/* Parqueaderos */}
          {(parking ?? 0) > 0 && (
            <div className="flex items-center gap-1.5">
              <Car size={15} className="text-accent flex-shrink-0" />
              <div>
                <p className="text-[10px] text-gray-500">Parqueaderos</p>
                <p className="text-xs font-semibold text-white">{parking}</p>
              </div>
            </div>
          )}
        </div>

        {/* Antigüedad */}
        {age !== null && (
          <div className="mb-3 px-2.5 py-2 bg-white/5 border border-white/10 rounded-lg flex items-center gap-2">
            <Calendar size={14} className="text-accent flex-shrink-0" />
            <div>
              <p className="text-[10px] text-gray-500">Antigüedad</p>
              <p className="text-xs font-semibold text-white">
                {age} {age === 1 ? 'año' : 'años'}
              </p>
            </div>
          </div>
        )}

        {/* Botón de acción */}
        <a
          href={detailHref}
          target="_self"
          className="btn-gold w-full text-xs block text-center py-2.5"
          onClick={() => {
            if (onViewDetails) onViewDetails();
          }}
        >
          VER DETALLES
        </a>
      </div>
    </div>
  );
}
