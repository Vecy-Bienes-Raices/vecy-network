import React from 'react';
import { 
  Bed, Bath, Ruler, Zap, Building2, Home, Warehouse, 
  Hotel, Trees, Briefcase, Map, CheckCircle2, 
  Layers, TrendingUp, Droplets, Fence, Star, 
  Utensils, Globe, Construction, Truck
} from 'lucide-react';

interface PropertySheetProps {
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  area: number;
  yearBuilt?: number;
  amenities: string[];
  internalFeatures?: string[];
  description?: string;
  propertyDetails?: any;
}

export default function PropertySheet({
  propertyType,
  bedrooms,
  bathrooms,
  area,
  yearBuilt,
  amenities,
  internalFeatures,
  description,
  propertyDetails = {}
}: PropertySheetProps) {
  
  const type = propertyType.toLowerCase();
  const details = propertyDetails || {};

  // Configuration for Main Features based on Property Type
  const getMainFeatures = () => {
    const features = [];
    
    // Area is common to all
    features.push({ icon: <Ruler className="w-6 h-6" />, label: 'Área Total', value: `${area.toLocaleString()} m²` });

    if (type.includes('apartamento') || type.includes('casa') || type.includes('apartment') || type.includes('house')) {
      if (bedrooms) features.push({ icon: <Bed className="w-6 h-6" />, label: 'Habitaciones', value: bedrooms.toString() });
      if (bathrooms) features.push({ icon: <Bath className="w-6 h-6" />, label: 'Baños', value: bathrooms.toString() });
      if (details.parking) features.push({ icon: <Zap className="w-6 h-6" />, label: 'Parqueaderos', value: details.parking });
    } 
    else if (type.includes('bodega') || type.includes('warehouse')) {
      if (details.height) features.push({ icon: <Layers className="w-6 h-6" />, label: 'Altura Libre', value: details.height });
      if (details.power) features.push({ icon: <Zap className="w-6 h-6" />, label: 'Capacidad KVA', value: details.power });
      if (details.docks) features.push({ icon: <Truck className="w-6 h-6" />, label: 'Muelles', value: details.docks });
    }
    else if (type.includes('edificio') || type.includes('building')) {
      if (details.units) features.push({ icon: <Home className="w-6 h-6" />, label: 'Unidades', value: details.units });
      if (details.floors) features.push({ icon: <Layers className="w-6 h-6" />, label: 'Pisos', value: details.floors });
      if (details.rent) features.push({ icon: <TrendingUp className="w-6 h-6" />, label: 'Renta Mensual', value: details.rent });
    }
    else if (type.includes('finca') || type.includes('farm')) {
      if (details.water) features.push({ icon: <Droplets className="w-6 h-6" />, label: 'Fuentes de Agua', value: details.water });
      if (details.topography) features.push({ icon: <Map className="w-6 h-6" />, label: 'Topografía', value: details.topography });
      if (details.fence) features.push({ icon: <Fence className="w-6 h-6" />, label: 'Cercado', value: details.fence });
    }
    else if (type.includes('hotel')) {
      if (details.rooms) features.push({ icon: <Bed className="w-6 h-6" />, label: 'Habitaciones', value: details.rooms });
      if (details.stars) features.push({ icon: <Star className="w-6 h-6" />, label: 'Estrellas', value: details.stars });
      if (details.restaurant) features.push({ icon: <Utensils className="w-6 h-6" />, label: 'Restaurante', value: details.restaurant ? 'Sí' : 'No' });
    }
    else if (type.includes('lote') || type.includes('terreno') || type.includes('land')) {
      if (details.usage) features.push({ icon: <Construction className="w-6 h-6" />, label: 'Uso de Suelo', value: details.usage });
      if (details.services) features.push({ icon: <Globe className="w-6 h-6" />, label: 'Servicios Públicos', value: details.services });
    }
    else if (type.includes('oficina') || type.includes('office')) {
      if (details.divisions) features.push({ icon: <Layers className="w-6 h-6" />, label: 'Divisiones', value: details.divisions });
      if (details.leed) features.push({ icon: <Star className="w-6 h-6" />, label: 'Certificación LEED', value: details.leed });
    }

    return features;
  };

  const getPropertyTypeIcon = (typeStr: string) => {
    const t = typeStr.toLowerCase();
    if (t.includes('apartamento') || t.includes('apartment') || t.includes('edificio') || t.includes('building')) return <Building2 className="w-4 h-4" />;
    if (t.includes('casa') || t.includes('house')) return <Home className="w-4 h-4" />;
    if (t.includes('bodega') || t.includes('warehouse')) return <Warehouse className="w-4 h-4" />;
    if (t.includes('hotel')) return <Hotel className="w-4 h-4" />;
    if (t.includes('terreno') || t.includes('lote') || t.includes('land')) return <Map className="w-4 h-4" />;
    if (t.includes('finca') || t.includes('farm')) return <Trees className="w-4 h-4" />;
    if (t.includes('oficina') || t.includes('office')) return <Briefcase className="w-4 h-4" />;
    return <Zap className="w-4 h-4" />;
  };

  const mainFeatures = getMainFeatures();

  return (
    <div className="space-y-12">
      {/* 1. SECCIÓN DE ICONOS DE ALTO IMPACTO */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-8 uppercase tracking-wider flex items-center gap-3">
          <span className="w-8 h-px bg-accent/50"></span>
          Características de Alto Valor
          <span className="w-8 h-px bg-accent/50"></span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {mainFeatures.map((feature, idx) => (
            <div
              key={idx}
              className="card-float p-6 text-center border-t border-accent/20 hover:border-accent/50 transition-all duration-500 group"
            >
              <div className="flex justify-center mb-4 text-accent group-hover:scale-110 transition-transform duration-500">
                {feature.icon}
              </div>
              <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1 font-bold">{feature.label}</p>
              <p className="text-white text-lg font-black tracking-tight">{feature.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 2. GRID DE DETALLES TÉCNICOS Y DISTRIBUCIÓN */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Columna Izquierda: Ficha Técnica Detallada */}
        <div className="card-float p-8 border-l-2 border-accent/30 bg-gradient-to-b from-white/[0.02] to-transparent">
          <h4 className="text-xl font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-accent" />
            Especificaciones Técnicas
          </h4>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between border-b border-white/5 pb-3 items-center">
              <span className="text-gray-400">Tipo de Activo</span>
              <span className="text-white font-bold flex items-center gap-2 bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                <span className="text-accent">{getPropertyTypeIcon(propertyType)}</span>
                {propertyType}
              </span>
            </div>
            
            {/* Dinámico basado en lo que exista en propertyDetails */}
            {Object.entries(details).map(([key, value]: [string, any]) => {
              if (typeof value === 'object' || key === 'internalFeatures') return null;
              
              // Formatear labels
              const label = key
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, (str) => str.toUpperCase())
                .replace(/Fee$/, ' Mensual')
                .replace(/Area$/, ' Área');

              return (
                <div key={key} className="flex justify-between border-b border-white/5 pb-3">
                  <span className="text-gray-400">{label}</span>
                  <span className="text-white font-semibold">
                    {typeof value === 'number' && key.toLowerCase().includes('price') 
                      ? `$${value.toLocaleString()}` 
                      : value.toString()}
                  </span>
                </div>
              );
            })}

            {yearBuilt && (
              <div className="flex justify-between border-b border-white/5 pb-3">
                <span className="text-gray-400">Año de Construcción</span>
                <span className="text-white font-semibold">{yearBuilt}</span>
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Características Internas / Amenidades */}
        <div className="space-y-8">
          {internalFeatures && internalFeatures.length > 0 && (
            <div className="card-float p-8 border-l-2 border-esmeralda/30">
              <h4 className="text-xl font-bold text-white mb-6 uppercase tracking-wider">
                🚪 Distribución y Espacios
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {internalFeatures.map((feat, idx) => (
                  <div key={idx} className="flex gap-3 items-start group">
                    <CheckCircle2 className="text-esmeralda w-4 h-4 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span className="text-gray-300 text-sm font-medium leading-tight">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card-float p-8 border-l-2 border-soft-gold/30">
            <h4 className="text-xl font-bold text-white mb-6 uppercase tracking-wider">
              🏙️ Características del Sector/Edificio
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {amenities.map((amenity, idx) => (
                <div key={idx} className="flex items-center gap-3 text-gray-300 group">
                  <div className="w-2 h-2 rounded-full bg-accent/40 group-hover:bg-accent transition-colors" />
                  <span className="text-sm font-semibold">{amenity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. RESUMEN EJECUTIVO (Descripción) */}
      <div className="card-float p-10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <TrendingUp className="w-32 h-32 text-accent" />
        </div>
        <h4 className="text-2xl font-bold text-white mb-6 uppercase tracking-widest text-accent flex items-center gap-3">
          Resumen Ejecutivo
          <div className="h-px flex-1 bg-gradient-to-r from-accent/50 to-transparent"></div>
        </h4>
        <p className="text-gray-300 leading-relaxed text-lg font-light">
          {description || `Inversión estratégica en activo inmobiliario tipo ${propertyType.toLowerCase()}. El inmueble destaca por su excelente estado de conservación, ubicación en zona de alta demanda y especificaciones técnicas optimizadas para rentabilidad inmediata.`}
        </p>
      </div>
    </div>
  );
}
