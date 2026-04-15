import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Bed, Bath, Ruler } from 'lucide-react';

interface Property {
  id: string;
  name: string;
  price: number;
  location: string;
  beds: number;
  baths: number;
  area: number;
  image: string;
  propertyType: string;
}

interface SimilarPropertiesCarouselProps {
  currentPropertyId: string;
  allProperties: Property[];
  onPropertySelect: (propertyId: string) => void;
}

export default function SimilarPropertiesCarousel({
  currentPropertyId,
  allProperties,
  onPropertySelect,
}: SimilarPropertiesCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(3);

  // Filtrar propiedades similares (excluir la actual)
  const similarProperties = allProperties.filter((p) => p.id !== currentPropertyId);

  // Calcular número de items por vista según pantalla
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setItemsPerView(1);
      } else if (window.innerWidth < 1024) {
        setItemsPerView(2);
      } else {
        setItemsPerView(3);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePrevious = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? Math.max(0, similarProperties.length - itemsPerView) : prev - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prev) =>
      prev >= similarProperties.length - itemsPerView ? 0 : prev + 1
    );
  };

  const visibleProperties = similarProperties.slice(
    currentIndex,
    currentIndex + itemsPerView
  );

  return (
    <div className="space-y-8">
      {/* Título */}
      <div className="text-center">
        <h2 className="text-4xl font-bold text-white mb-2 uppercase tracking-wider">
          Propiedades Similares
        </h2>
        <div className="line-gold w-24 mx-auto"></div>
        <p className="text-gray-400 mt-4">
          Descubre otras propiedades que podrían interesarte
        </p>
      </div>

      {/* Carrusel */}
      <div className="relative">
        {/* Contenedor de propiedades */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleProperties.map((property, idx) => (
            <a
              key={property.id}
              href={`/property/${property.id}`}
              onClick={(e) => {
                e.preventDefault();
                onPropertySelect(property.id);
              }}
              className="card-float group overflow-hidden hover:glow-gold transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {/* Imagen */}
              <div className="relative h-64 overflow-hidden">
                <img
                  src={property.image}
                  alt={property.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300"></div>

                {/* Badge de tipo */}
                <div className="absolute top-4 left-4 bg-accent text-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  {property.propertyType}
                </div>
              </div>

              {/* Contenido */}
              <div className="p-6">
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-accent transition-colors">
                  {property.name}
                </h3>

                {/* Ubicación */}
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
                  <MapPin className="w-4 h-4 text-accent" />
                  <span>{property.location}</span>
                </div>

                {/* Precio */}
                <p className="text-2xl font-bold text-accent mb-4">
                  ${property.price.toLocaleString()} USD
                </p>

                {/* Características */}
                <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-white/10">
                  <div className="text-center">
                    <Bed className="w-5 h-5 mx-auto text-accent mb-1" />
                    <p className="text-xs text-gray-400">{property.beds} Hab</p>
                  </div>
                  <div className="text-center">
                    <Bath className="w-5 h-5 mx-auto text-accent mb-1" />
                    <p className="text-xs text-gray-400">{property.baths} Baños</p>
                  </div>
                  <div className="text-center">
                    <Ruler className="w-5 h-5 mx-auto text-accent mb-1" />
                    <p className="text-xs text-gray-400">{property.area} m²</p>
                  </div>
                </div>

                {/* Botón */}
                <button className="btn-gold w-full text-sm">
                  Ver Detalles
                </button>
              </div>
            </a>
          ))}
        </div>

        {/* Controles de navegación */}
        {similarProperties.length > itemsPerView && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute -left-6 top-1/3 transform -translate-y-1/2 bg-accent text-black p-3 rounded-full hover:scale-110 transition-transform duration-300 glow-gold hidden lg:block"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute -right-6 top-1/3 transform -translate-y-1/2 bg-accent text-black p-3 rounded-full hover:scale-110 transition-transform duration-300 glow-gold hidden lg:block"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Indicadores */}
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({
                length: Math.ceil(similarProperties.length / itemsPerView),
              }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx * itemsPerView)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === Math.floor(currentIndex / itemsPerView)
                      ? 'bg-accent w-8 glow-gold'
                      : 'bg-white/5 w-2 hover:bg-zinc-900'
                  }`}
                  aria-label={`Ir a grupo ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Mensaje si no hay propiedades similares */}
      {similarProperties.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No hay propiedades similares disponibles en este momento.</p>
        </div>
      )}
    </div>
  );
}
