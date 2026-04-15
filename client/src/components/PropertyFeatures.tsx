import { Bed, Bath, Ruler, Zap, Wifi, Utensils, Dumbbell, Wind, Building2, Home, Warehouse, Hotel, Trees, Briefcase, Map, CheckCircle2 } from 'lucide-react';

interface Feature {
  icon: React.ReactNode;
  label: string;
  value: string;
}

interface PropertyFeaturesProps {
  bedrooms: number;
  bathrooms: number;
  area: number;
  amenities: string[];
  yearBuilt: number;
  propertyType: string;
  floor?: number;
  totalFloors?: number;
  propertyDetails?: any;
  description?: string;
  internalFeatures?: string[];
}

export default function PropertyFeatures({
  bedrooms,
  bathrooms,
  area,
  amenities,
  yearBuilt,
  propertyType,
  floor,
  totalFloors,
  propertyDetails,
  description,
  internalFeatures,
}: PropertyFeaturesProps) {
  const mainFeatures: Feature[] = [
    { icon: <Bed className="w-6 h-6" />, label: 'Habitaciones', value: bedrooms.toString() },
    { icon: <Bath className="w-6 h-6" />, label: 'Baños', value: bathrooms.toString() },
    { icon: <Ruler className="w-6 h-6" />, label: 'Área', value: `${area.toLocaleString()} m²` },
  ];

  if (floor && totalFloors) {
    mainFeatures.push({
      icon: <Zap className="w-6 h-6" />,
      label: 'Piso',
      value: `${floor}/${totalFloors}`,
    });
  }

  const amenityIcons: { [key: string]: React.ReactNode } = {
    wifi: <Wifi className="w-5 h-5" />,
    kitchen: <Utensils className="w-5 h-5" />,
    gym: <Dumbbell className="w-5 h-5" />,
    ac: <Wind className="w-5 h-5" />,
  };

  const getPropertyTypeIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('apartamento') || t.includes('apartment') || t.includes('edificio') || t.includes('building')) return <Building2 className="w-4 h-4" />;
    if (t.includes('casa') || t.includes('house')) return <Home className="w-4 h-4" />;
    if (t.includes('bodega') || t.includes('warehouse')) return <Warehouse className="w-4 h-4" />;
    if (t.includes('hotel') || t.includes('hostal')) return <Hotel className="w-4 h-4" />;
    if (t.includes('terreno') || t.includes('lote') || t.includes('land')) return <Map className="w-4 h-4" />;
    if (t.includes('finca') || t.includes('farm') || t.includes('campestre')) return <Trees className="w-4 h-4" />;
    if (t.includes('oficina') || t.includes('office')) return <Briefcase className="w-4 h-4" />;
    return <Zap className="w-4 h-4" />;
  };

  return (
    <div className="space-y-8">
      {/* Características Principales */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-6 uppercase tracking-wider">
          Características Principales
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {mainFeatures.map((feature, idx) => (
            <div
              key={idx}
              className="card-float p-6 text-center hover:glow-gold transition-all duration-300"
            >
              <div className="flex justify-center mb-3 text-accent">
                {feature.icon}
              </div>
              <p className="text-gray-400 text-sm mb-2">{feature.label}</p>
              <p className="text-white text-xl font-bold">{feature.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Información Adicional */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card-float p-6">
          <h4 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">
            🔎 Detalles
          </h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-gray-400">Tipo de Propiedad</span>
              <span className="text-white font-semibold flex items-center gap-2">
                <span className="text-accent">{getPropertyTypeIcon(propertyType)}</span>
                {propertyType}
                {propertyDetails?.houseType === 'conjunto' && <span className="bg-white/5 text-[10px] px-2 py-0.5 rounded-full text-accent border border-accent/20">En Conjunto</span>}
                {propertyDetails?.houseType === 'barrio' && <span className="bg-gray-800 text-[10px] px-2 py-0.5 rounded-full text-gray-300">De Barrio</span>}
              </span>
            </div>
            {propertyDetails?.viewType && (
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Vista</span>
                <span className="text-white font-semibold uppercase text-xs">{propertyDetails.viewType}</span>
              </div>
            )}
            {propertyDetails?.privateArea && (
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Área Privada</span>
                <span className="text-white font-semibold">{propertyDetails.privateArea} m²</span>
              </div>
            )}
            {propertyDetails?.estrato && (
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Estrato</span>
                <span className="text-white font-semibold">{propertyDetails.estrato}</span>
              </div>
            )}
            {propertyDetails?.parking && (
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Parqueadero</span>
                <span className="text-white font-semibold">{propertyDetails.parking}</span>
              </div>
            )}
            {propertyDetails?.deposito && (
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Depósito</span>
                <span className="text-white font-semibold">{propertyDetails.deposito}</span>
              </div>
            )}
            {propertyDetails?.administrationFee !== undefined && (
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Administración</span>
                <span className="text-white font-semibold">
                  {propertyDetails.administrationFee === '0' || propertyDetails.administrationFee === 0 
                    ? 'No Aplica' 
                    : `$${propertyDetails.administrationFee.toLocaleString()} COP`}
                </span>
              </div>
            )}
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-gray-400">Año de Construcción</span>
              <span className="text-white font-semibold">{yearBuilt}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Estado</span>
              <span className="text-white font-semibold">{propertyDetails?.estado || 'Excelente'}</span>
            </div>

            {/* Fusión de la Distribución Interna dentro de Detalles */}
            {internalFeatures && internalFeatures.length > 0 && (
              <div className="pt-3 mt-3 border-t border-accent/20">
                <span className="text-gray-400 block mb-3 font-bold uppercase text-[10px] tracking-widest text-accent">Distribución Interna</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-300">
                  {internalFeatures.map((feat, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <CheckCircle2 className="text-accent w-4 h-4 shrink-0" />
                      <span className="font-semibold text-xs">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Características Externas (Antiguas Amenidades) */}
        <div className="card-float p-6">
          <h4 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">
            🌟 Características del Edificio
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {amenities.map((amenity, idx) => (
              <div key={idx} className="flex items-center gap-2 text-gray-300">
                <div className="text-accent shrink-0">
                  {amenityIcons[amenity.toLowerCase()] || <CheckCircle2 className="w-5 h-5" />}
                </div>
                <span className="text-sm font-semibold">{amenity}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resumen Descriptivo aislado */}
      <div className="card-float p-8">
        <h4 className="text-lg font-bold text-white mb-4 uppercase tracking-wider text-accent border-b border-white/10 pb-2">
          📝 Resumen Descriptivo
        </h4>
        <p className="text-gray-300 leading-relaxed text-[15px]">
          {description || `Esta propiedad premium ofrece una ubicación privilegiada en ${propertyType.toLowerCase()} con acceso a las mejores amenidades de Bogotá. Diseño moderno, acabados de lujo y vistas espectaculares hacen de este inmueble la opción ideal para inversores y familias que buscan calidad de vida excepcional.`}
        </p>
      </div>
    </div>
  );
}
