/**
 * PROPERTY SEARCH - VECY GOLD EDITION
 * 
 * Componente de búsqueda avanzada de propiedades
 */

import { useState } from 'react';
import { Search, MapPin, DollarSign, Bed } from 'lucide-react';

interface SearchFilters {
  location: string;
  priceMin: string;
  priceMax: string;
  bedrooms: string;
  type: string;
}

export default function PropertySearch() {
  const [filters, setFilters] = useState<SearchFilters>({
    location: '',
    priceMin: '',
    priceMax: '',
    bedrooms: '',
    type: 'all',
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Búsqueda con filtros:', filters);
    // Aquí iría la lógica de búsqueda
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="glass rounded-2xl p-8 mb-12">
      <h3 className="text-2xl font-bold text-white mb-6 uppercase tracking-wider">Buscar Propiedades</h3>
      
      <form onSubmit={handleSearch} className="space-y-6">
        {/* Primera fila */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Ubicación */}
          <div>
            <label className="block text-sm font-bold text-gray-200 uppercase tracking-wider mb-2">
              Ubicación
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-accent" size={20} />
              <input
                type="text"
                name="location"
                value={filters.location}
                onChange={handleChange}
                placeholder="Ej: Zona Rosa, Chapinero..."
                className="w-full pl-12 pr-4 py-3 bg-black border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          {/* Tipo de propiedad */}
          <div>
            <label className="block text-sm font-bold text-gray-200 uppercase tracking-wider mb-2">
              Tipo de Propiedad
            </label>
            <select
              name="type"
              value={filters.type}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-black border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent transition-colors uppercase text-sm tracking-widest font-bold"
            >
              <option value="all">Todos los Activos</option>
              <option value="apartment">Apartamentos</option>
              <option value="warehouse">Bodegas</option>
              <option value="house">Casas (Urbana / Rural)</option>
              <option value="building">Edificios</option>
              <option value="farm">Fincas / Campestres</option>
              <option value="hotel">Hoteles / Hostales</option>
              <option value="land">Lotes / Terrenos</option>
              <option value="office">Oficinas</option>
            </select>
          </div>
        </div>

        {/* Segunda fila */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Precio mínimo */}
          <div>
            <label className="block text-sm font-bold text-gray-200 uppercase tracking-wider mb-2">
              Precio Mínimo
            </label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 text-accent" size={20} />
              <input
                type="number"
                name="priceMin"
                value={filters.priceMin}
                onChange={handleChange}
                placeholder="0"
                className="w-full pl-12 pr-4 py-3 bg-black border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          {/* Precio máximo */}
          <div>
            <label className="block text-sm font-bold text-gray-200 uppercase tracking-wider mb-2">
              Precio Máximo
            </label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 text-accent" size={20} />
              <input
                type="number"
                name="priceMax"
                value={filters.priceMax}
                onChange={handleChange}
                placeholder="Sin límite"
                className="w-full pl-12 pr-4 py-3 bg-black border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          {/* Habitaciones */}
          <div>
            <label className="block text-sm font-bold text-gray-200 uppercase tracking-wider mb-2">
              Habitaciones
            </label>
            <div className="relative">
              <Bed className="absolute left-4 top-1/2 transform -translate-y-1/2 text-accent" size={20} />
              <select
                name="bedrooms"
                value={filters.bedrooms}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3 bg-black border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent transition-colors"
              >
                <option value="">Cualquiera</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            className="btn-gold flex-1 flex items-center justify-center gap-2"
          >
            <Search size={20} />
            BUSCAR PROPIEDADES
          </button>
          <button
            type="button"
            onClick={() =>
              setFilters({
                location: '',
                priceMin: '',
                priceMax: '',
                bedrooms: '',
                type: 'all',
              })
            }
            className="btn-gold-outline flex-1"
          >
            LIMPIAR FILTROS
          </button>
        </div>
      </form>
    </div>
  );
}
