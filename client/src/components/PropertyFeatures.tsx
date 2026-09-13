import { Bed, Bath, Ruler, Zap, Wifi, Utensils, Dumbbell, Wind, Building2, Home, Warehouse, Hotel, Trees, Briefcase, Map, CheckCircle2 } from 'lucide-react';

interface Feature {
  icon: React.ReactNode;
  label: string;
  value: string;
}

interface PropertyFeaturesProps {
  property: any;
}

export default function PropertyFeatures({ property }: PropertyFeaturesProps) {
  const bedrooms = property.bedrooms || 0;
  const bathrooms = property.bathrooms || 0;
  const area = Number(property.areaTotal || 0);
  const yearBuilt = property.yearBuilt || 0;
  const propertyType = property.propertyType || "";
  const floorDetail = property.floorDetail;
  const propertyDetails = property.propertyDetails || {};
  const description = property.description || "";

  // 🛡️ Extracción Segura y Defensiva de Amenidades y Características (v31.41)
  const rawAmenities = property.amenities;
  let externalFeaturesList: string[] = [];
  let internalFeaturesList: string[] = [];
  let enrichedAmenities: any = null;

  if (Array.isArray(rawAmenities)) {
    externalFeaturesList = rawAmenities.filter(Boolean);
  } else if (rawAmenities && typeof rawAmenities === 'object') {
    enrichedAmenities = rawAmenities;
    if (Array.isArray(rawAmenities.caracteristicasExternas)) {
      externalFeaturesList = rawAmenities.caracteristicasExternas.filter(Boolean);
    }
    if (Array.isArray(rawAmenities.caracteristicasInternas)) {
      internalFeaturesList = rawAmenities.caracteristicasInternas.filter(Boolean);
    }
  }

  // Compatibilidad con campo directo internalFeatures
  if (Array.isArray(property.internalFeatures) && property.internalFeatures.length > 0) {
    internalFeaturesList = Array.from(new Set([...internalFeaturesList, ...property.internalFeatures.filter(Boolean)]));
  }

  const mainFeatures: Feature[] = [
    { icon: <Bed className="w-6 h-6" />, label: 'Habitaciones', value: bedrooms.toString() },
    { icon: <Bath className="w-6 h-6" />, label: 'Baños', value: bathrooms.toString() },
    { icon: <Ruler className="w-6 h-6" />, label: 'Área Construida', value: `${area.toLocaleString()} m²` },
  ];

  if (enrichedAmenities?.garajesMoto !== undefined && enrichedAmenities?.garajesMoto > 0) {
    mainFeatures.push({
      icon: <Zap className="w-6 h-6" />,
      label: 'Garajes Moto',
      value: `${enrichedAmenities.garajesMoto}`,
    });
  } else if (floorDetail) {
    mainFeatures.push({
      icon: <Zap className="w-6 h-6" />,
      label: 'Piso / Niveles / Altura',
      value: floorDetail,
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

  const displayType = enrichedAmenities?.tipoExacto || propertyType;

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
          <h4 className="text-lg font-bold text-white mb-4 uppercase tracking-wider flex items-center justify-between">
            <span>🔎 Detalles Técnicos</span>
            {enrichedAmenities?.subtipoComercial && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#bf953f] text-black uppercase tracking-wider">
                Uso Comercial
              </span>
            )}
          </h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-gray-400">Tipo de Inmueble</span>
              <span className="text-white font-semibold flex items-center gap-2">
                <span className="text-accent">{getPropertyTypeIcon(displayType)}</span>
                {displayType}
              </span>
            </div>

            {/* Negocio de Permuta */}
            {enrichedAmenities?.permutaDetalle && (
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Modalidad Negocio</span>
                <span className="text-[#bf953f] font-bold text-xs">{enrichedAmenities.permutaDetalle}</span>
              </div>
            )}

            {/* Cocina */}
            {enrichedAmenities?.cocina && (
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Tipo de Cocina</span>
                <span className="text-white font-semibold">{enrichedAmenities.cocina}</span>
              </div>
            )}

            {/* Cuarto de servicio */}
            {enrichedAmenities?.cuartoServicio && enrichedAmenities.cuartoServicio !== 'No' && (
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Cuarto de Servicio</span>
                <span className="text-white font-semibold">{enrichedAmenities.cuartoServicio}</span>
              </div>
            )}

            {/* Chimeneas */}
            {enrichedAmenities?.chimeneas?.tiene && (
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Chimeneas</span>
                <span className="text-white font-semibold">{enrichedAmenities.chimeneas.cantidad} a {enrichedAmenities.chimeneas.tipo}</span>
              </div>
            )}

            {/* Cava de Vinos */}
            {enrichedAmenities?.cavaVinos?.tiene && (
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Cava de Vinos</span>
                <span className="text-white font-semibold">{enrichedAmenities.cavaVinos.cantidad} Cava(s)</span>
              </div>
            )}

            {/* Terrazas */}
            {enrichedAmenities?.terrazas?.tiene && (
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Terraza</span>
                <span className="text-white font-semibold">
                  {enrichedAmenities.terrazas.cantidad} {enrichedAmenities.terrazas.areaM2 ? `(${enrichedAmenities.terrazas.areaM2} m²)` : ''}
                  {enrichedAmenities.terrazas.tieneBBQ ? ' + BBQ' : ''}
                </span>
              </div>
            )}

            {/* Balcones */}
            {enrichedAmenities?.balcones !== undefined && Number(enrichedAmenities.balcones) > 0 && (
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Balcones</span>
                <span className="text-white font-semibold">{enrichedAmenities.balcones}</span>
              </div>
            )}

            {/* Piso y Ubicación */}
            {enrichedAmenities?.pisoEdificio && (
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Piso / Ubicación</span>
                <span className="text-white font-semibold">
                  Piso {enrichedAmenities.pisoEdificio} {enrichedAmenities.ubicacionPiso ? `(${enrichedAmenities.ubicacionPiso})` : ''}
                </span>
              </div>
            )}

            {/* Área Privada */}
            {(property.areaPrivate || propertyDetails?.privateArea) && (
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Área Privada</span>
                <span className="text-white font-semibold">{property.areaPrivate || propertyDetails.privateArea} m²</span>
              </div>
            )}

            {/* Estrato */}
            {property.stratum && (
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Estrato</span>
                <span className="text-white font-semibold">{property.stratum}</span>
              </div>
            )}

            {/* Garajes Carro y Moto */}
            {(property.garages || enrichedAmenities?.garajesMoto) && (
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Parqueaderos</span>
                <span className="text-white font-semibold">
                  {property.garages ? `${property.garages} Carro(s)` : ''}
                  {property.garages && enrichedAmenities?.garajesMoto ? ' / ' : ''}
                  {enrichedAmenities?.garajesMoto ? `${enrichedAmenities.garajesMoto} Moto(s)` : ''}
                </span>
              </div>
            )}

            {/* Depósitos */}
            {enrichedAmenities?.depositos !== undefined && Number(enrichedAmenities.depositos) > 0 && (
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Depósitos</span>
                <span className="text-white font-semibold">{enrichedAmenities.depositos}</span>
              </div>
            )}

            {/* Administración */}
            {property.adminFee && (
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Administración</span>
                <span className="text-white font-semibold">
                  ${Number(property.adminFee).toLocaleString('es-CO')} COP
                </span>
              </div>
            )}

            {yearBuilt > 0 && (
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Año de Construcción</span>
                <span className="text-white font-semibold">{yearBuilt}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-400">Estado</span>
              <span className="text-white font-semibold">{enrichedAmenities?.estadoInmueble || propertyDetails?.estado || 'Excelente'}</span>
            </div>

            {/* Distribución Interna */}
            {internalFeaturesList.length > 0 && (
              <div className="pt-3 mt-3 border-t border-accent/20">
                <span className="text-gray-400 block mb-3 font-bold uppercase text-[10px] tracking-widest text-accent">
                  Distribución & Características Internas ({internalFeaturesList.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-300">
                  {internalFeaturesList.map((feat: string, idx: number) => (
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

        {/* Características Externas del Edificio / Conjunto */}
        <div className="card-float p-6">
          <h4 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">
            🌟 Características del Edificio / Sector ({externalFeaturesList.length})
          </h4>
          {externalFeaturesList.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {externalFeaturesList.map((amenity, idx) => (
                <div key={idx} className="flex items-center gap-2 text-gray-300">
                  <div className="text-accent shrink-0">
                    {amenityIcons[amenity.toLowerCase()] || <CheckCircle2 className="w-5 h-5" />}
                  </div>
                  <span className="text-sm font-semibold">{amenity}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No se han registrado características externas específicas para este inmueble.</p>
          )}
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
