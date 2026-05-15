import React, { useEffect } from 'react';
import { useRoute } from 'wouter';
import { propertiesDatabase } from '@/lib/properties';
import { 
  ChevronLeft, Download, Ruler, Bed, Bath, Car, Building, 
  Zap, Layers, Truck, Home, Trees, Hotel, Map, Construction, 
  Star, Utensils, Droplets, Briefcase 
} from 'lucide-react';

const colors = {
  gold: '#d4af37',
  coffee: '#3e2723',
  cream: '#fdfbf0',
};

export default function UnbrandedFicha() {
  const [, params] = useRoute('/ficha/:id');
  const propertyId = params?.id;
  const property = propertyId ? propertiesDatabase[propertyId] : null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!property) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Propiedad No Encontrada</h1>
          <a href="/properties" className="text-accent underline">Volver al Catálogo</a>
        </div>
      </div>
    );
  }

  const type = (property.propertyType || '').toLowerCase();

  const getDynamicSpecs = () => {
    const specs = [];
    const details = property.propertyDetails || {};

    // Área siempre va primero
    specs.push({ label: "Área Total", value: `${property.area} m²`, icon: <Ruler className="w-4 h-4"/> });

    if (type.includes('apartamento') || type.includes('casa') || type.includes('house') || type.includes('apartaestudio')) {
      specs.push({ label: "Habitaciones", value: property.bedrooms || details.bedrooms || 'N/A', icon: <Bed className="w-4 h-4"/> });
      specs.push({ label: "Baños", value: property.bathrooms || details.bathrooms || 'N/A', icon: <Bath className="w-4 h-4"/> });
      specs.push({ label: "Parqueaderos", value: details.parking || '1', icon: <Car className="w-4 h-4"/> });
      if (details.estrato) specs.push({ label: "Estrato", value: details.estrato, icon: <Star className="w-4 h-4"/> });
      if (property.yearBuilt) specs.push({ label: "Antigüedad", value: property.yearBuilt, icon: <Building className="w-4 h-4"/> });
    } 
    else if (type.includes('bodega') || type.includes('warehouse')) {
      if (details.height) specs.push({ label: "Altura Libre", value: details.height, icon: <Layers className="w-4 h-4"/> });
      if (details.power) specs.push({ label: "Capacidad KVA", value: details.power, icon: <Zap className="w-4 h-4"/> });
      if (details.docks) specs.push({ label: "Muelles", value: details.docks, icon: <Truck className="w-4 h-4"/> });
      if (details.officeArea) specs.push({ label: "Área Oficina", value: details.officeArea, icon: <Briefcase className="w-4 h-4"/> });
    }
    else if (type.includes('edificio') || type.includes('building')) {
      if (details.units) specs.push({ label: "Unidades", value: details.units, icon: <Home className="w-4 h-4"/> });
      if (details.floors) specs.push({ label: "Pisos", value: details.floors, icon: <Layers className="w-4 h-4"/> });
      if (details.rent) specs.push({ label: "Renta Estimada", value: details.rent, icon: <Zap className="w-4 h-4"/> });
    }
    else if (type.includes('finca') || type.includes('farm')) {
      if (details.water) specs.push({ label: "Agua", value: details.water, icon: <Droplets className="w-4 h-4"/> });
      if (details.topography) specs.push({ label: "Topografía", value: details.topography, icon: <Map className="w-4 h-4"/> });
      if (details.climate) specs.push({ label: "Clima", value: details.climate, icon: <Trees className="w-4 h-4"/> });
    }
    else if (type.includes('hotel')) {
      if (details.rooms) specs.push({ label: "Habitaciones", value: details.rooms, icon: <Bed className="w-4 h-4"/> });
      if (details.stars) specs.push({ label: "Estrellas", value: details.stars, icon: <Star className="w-4 h-4"/> });
      if (details.restaurant) specs.push({ label: "Restaurante", value: "Sí", icon: <Utensils className="w-4 h-4"/> });
    }
    else if (type.includes('lote') || type.includes('terreno') || type.includes('land')) {
      if (details.usage) specs.push({ label: "Uso de Suelo", value: details.usage, icon: <Construction className="w-4 h-4"/> });
      if (details.services) specs.push({ label: "Servicios", value: details.services, icon: <Zap className="w-4 h-4"/> });
    }
    else if (type.includes('oficina') || type.includes('office')) {
      if (details.divisions) specs.push({ label: "Divisiones", value: details.divisions, icon: <Layers className="w-4 h-4"/> });
      if (details.leed) specs.push({ label: "Certificación", value: details.leed, icon: <Star className="w-4 h-4"/> });
      if (details.parking) specs.push({ label: "Parqueos", value: details.parking, icon: <Car className="w-4 h-4"/> });
    }

    if (details.administrationFee) {
      specs.push({ label: "Administración", value: `$${details.administrationFee.toLocaleString()}`, icon: <Zap className="w-4 h-4" /> });
    }

    return specs;
  };

  const handlePrint = () => {
    window.print();
  };

  const specs = getDynamicSpecs();

  return (
    <div className="min-h-screen font-['Outfit'] antialiased" 
      style={{ 
        background: `radial-gradient(ellipse at center, #c19a6b 0%, ${colors.coffee} 100%)`,
        backgroundAttachment: 'fixed'
      }}>
      
      {/* Navigation UI */}
      <div className="max-w-[210mm] mx-auto p-5 flex justify-between items-center print:hidden">
        <button onClick={() => window.history.back()} className="flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-full font-black text-xs uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all">
          <ChevronLeft className="w-4 h-4" /> Volver
        </button>
        <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-b from-[#FFD700] via-[#FDB931] to-[#DAA520] text-[#3E2723] rounded-full font-black text-xs uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all" style={{ boxShadow: '0 4px 0 #B8860B, 0 8px 15px rgba(0,0,0,0.3)' }}>
          <Download className="w-4 h-4" /> Descargar PDF
        </button>
      </div>

      <div id="export-container" className="max-w-[210mm] mx-auto space-y-8 pb-20 print:space-y-0 print:pb-0">
        
        {/* PAGE 1: PORTADA */}
        <div className="bg-white w-[210mm] h-[295mm] p-[20mm] flex flex-col justify-between shadow-2xl rounded-sm mx-auto print:shadow-none print:rounded-none print:m-0 print:h-screen print:page-break-after-always">
          <div className="text-[10px] font-extrabold text-neutral-300 text-center tracking-[4px] uppercase">
            REF: {property.id.toUpperCase()}
          </div>
          <div className="flex-grow flex flex-col justify-center">
            <h1 className="text-[40px] font-extrabold text-center text-[#3E2723] mb-5 tracking-tight uppercase">Brochure Técnico</h1>
            <div className="w-full h-[600px] border-2 border-[#d4af37] rounded-xl shadow-lg overflow-hidden relative">
              <img src={property.images[0]} alt="Portada" className="w-full h-full object-cover" />
            </div>
            <div className="mt-8 text-center text-lg text-neutral-500 font-light tracking-[5px] uppercase">
              {property.propertyType} - {property.location.split(',')[1] || property.location}
            </div>
          </div>
          <div className="text-[9px] text-center text-neutral-300 tracking-[2px] uppercase">DOCUMENTO COMERCIAL - EXCLUSIVO - MARCA BLANCA PARA ALIADOS</div>
        </div>

        {/* PAGE 2: SPECS */}
        <div className="bg-white w-[210mm] h-[295mm] p-[20mm] flex flex-col justify-between shadow-2xl rounded-sm mx-auto print:shadow-none print:rounded-none print:m-0 print:h-screen print:page-break-after-always">
          <div className="text-[10px] font-extrabold text-neutral-300 text-center tracking-[4px] uppercase">CARACTERÍSTICAS Y DETALLES / 02</div>
          <div className="flex-grow flex flex-col justify-center">
            <h2 className="text-lg font-extrabold border-b-[3px] border-[#d4af37] pb-2 mb-6 text-[#3E2723] uppercase">1. Descripción del Inmueble</h2>
            <div className="grid grid-cols-2 gap-8">
              <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-100 text-sm leading-[1.7] text-justify text-neutral-800">{property.description}</div>
              <div>
                <h3 className="mb-5 font-bold text-[#d4af37] uppercase">Especificaciones Técnicas</h3>
                <ul className="space-y-3">
                  {specs.map((s, i) => (
                    <li key={i} className="flex justify-between items-center border-b border-neutral-100 pb-2 text-sm">
                      <span className="flex items-center gap-2 text-neutral-500"><span className="text-[#d4af37]">{s.icon}</span> {s.label}</span>
                      <strong className="text-neutral-800 font-bold">{s.value}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="text-[9px] text-center text-neutral-300 tracking-[2px] uppercase">PÁGINA 02 | {property.id.toUpperCase()}</div>
        </div>

        {/* PAGE 3: AMENITIES */}
        <div className="bg-white w-[210mm] h-[295mm] p-[20mm] flex flex-col justify-between shadow-2xl rounded-sm mx-auto print:shadow-none print:rounded-none print:m-0 print:h-screen print:page-break-after-always">
          <div className="text-[10px] font-extrabold text-neutral-300 text-center tracking-[4px] uppercase">UBICACIÓN Y BENEFICIOS / 03</div>
          <div className="flex-grow flex flex-col justify-center">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h2 className="text-lg font-extrabold border-b-[3px] border-[#d4af37] pb-2 mb-6 text-[#3E2723] uppercase">2. Amenidades y Ventajas</h2>
                <ul className="space-y-2">
                  {property.amenities?.slice(0, 12).map((item: string, idx: number) => (
                    <li key={idx} className="text-xs border-b border-neutral-100 pb-2 flex gap-2">
                      <span className="text-[#d4af37]">✨</span> <span className="text-neutral-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="text-lg font-extrabold border-b-[3px] border-[#d4af37] pb-2 mb-6 text-[#3E2723] uppercase">3. Distribución</h2>
                <div className="bg-neutral-50 p-6 rounded-xl border-l-[6px] border-[#d4af37] text-sm text-neutral-800 leading-relaxed">
                  <ul className="space-y-2">
                    {property.internalFeatures?.slice(0, 8).map((f: string, i: number) => (
                      <li key={i} className="flex gap-2">✔️ {f}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="text-[9px] text-center text-neutral-300 tracking-[2px] uppercase">PÁGINA 03 | {property.id.toUpperCase()}</div>
        </div>

        {/* PAGE 4: GALLERY */}
        <div className="bg-white w-[210mm] h-[295mm] p-[20mm] flex flex-col justify-between shadow-2xl rounded-sm mx-auto print:shadow-none print:rounded-none print:m-0 print:h-screen print:page-break-after-always">
          <div className="text-[10px] font-extrabold text-neutral-300 text-center tracking-[4px] uppercase">GALERÍA VISUAL / 04</div>
          <div className="flex-grow flex flex-col justify-center">
            <div className="grid grid-cols-2 grid-rows-2 gap-4 h-[650px]">
              {property.images.slice(1, 5).map((img: string, idx: number) => (
                <img key={idx} src={img} alt={`G${idx}`} className="w-full h-full object-cover rounded-lg border border-neutral-100" />
              ))}
            </div>
          </div>
          <div className="text-[9px] text-center text-neutral-300 tracking-[2px] uppercase">PÁGINA 04 | {property.id.toUpperCase()}</div>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; padding: 0 !important; }
          .print\\:hidden { display: none !important; }
          #export-container { width: 100% !important; max-width: none !important; margin: 0 !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
}
