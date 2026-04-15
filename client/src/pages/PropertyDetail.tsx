import { useState } from 'react';
import { useRoute } from 'wouter';
import { ChevronLeft, MapPin, Phone, Mail, Share2, Heart, CalendarCheck } from 'lucide-react';
import PropertyGallery from '@/components/PropertyGallery';
import PropertyFeatures from '@/components/PropertyFeatures';
import Navbar from '@/components/Navbar';

/**
 * DESIGN PHILOSOPHY: Lujo Inmobiliario Futurista
 * - Fondos: Negros profundos (#050505), Cafés oscuros (#1a1410)
 * - Bordes: Dorados eléctricos (#d4af37, #bf953f)
 * - Tipografía: Playfair Display Bold + Inter
 * - Animaciones: Entrada suave, glow dorado, transiciones fluidas
 */

// Base de datos de propiedades (Activos Reales Vecy)
const propertiesDatabase: { [key: string]: any } = {
  'apto-cantalejo': {
    id: 'apto-cantalejo',
    name: 'Apartamento en Cantalejo',
    location: 'Bogotá, Suba',
    price: 470000000,
    bedrooms: 3,
    bathrooms: 2,
    area: 71,
    propertyType: 'Apartamento',
    floor: 2,
    totalFloors: 12,
    yearBuilt: 2018,
    images: Array.from({ length: 24 }, (_, i) => `https://ap-cantalejo-bogota.netlify.app/assets/${i + 1}.jpeg`),
    amenities: ['Gimnasio Dotado', 'Terraza BBQ Panorámica', '2 Ascensores', 'Portería / Sala Espera', 'Cerca C.C. La Colina', 'Parques Cercanos', 'Vigilancia 24/7', 'Acceso Pavimentado', 'Paradero SITP a media cuadra'],
    internalFeatures: ['Sala comedor en un mismo ambiente', 'Cocina Integral Funcional', 'Zona Lavandería Independiente', 'Habitación principal con baño', 'Estudio / Hall para Home Office', 'Balcón en área social'],
    latitude: 4.7456,
    longitude: -74.0537,
    virtualTourVideo: 'https://ap-cantalejo-bogota.netlify.app/assets/Apartamento%20en%20venta%20en%20Cantalejo%20Bogot%C3%A1.mp4', 
    propertyDetails: {
      viewType: 'Exterior',
      houseType: 'conjunto',
      administrationFee: 500000,
      privateArea: 64.44,
      parking: '1 (Cubierto)',
      estrato: 3,
      estado: 'Ocupado / Crédito Hipotecario Vigente'
    },
    description: 'Elegante apartamento en segundo piso con balcón exterior. El espacio cuenta con iluminación natural en áreas sociales. Al recorrer el pasillo, un estudio ideal para home office conecta hacia el área privada. Ubicado estratégicamente en Cantalejo.',
    stealthFichaUrl: 'https://ap-cantalejo-bogota.netlify.app/'
  },
  'apto-cedritos-ubik': {
    id: 'apto-cedritos-ubik',
    name: 'Apartamento Cedritos UBIK',
    location: 'Bogotá, Usaquén',
    price: 1300000000,
    bedrooms: 3,
    bathrooms: 4,
    area: 151.70,
    propertyType: 'Apartamento',
    floor: 5,
    totalFloors: 5,
    yearBuilt: 2026,
    images: Array.from({ length: 15 }, (_, i) => `https://ap-nuevo-cedritos-bog.netlify.app/assets/${i + 1}.jpeg`),
    amenities: ['Terraza social con BBQ', 'Gimnasio dotado', 'Sauna', 'Salón social', 'Vigilancia 24/7', '2 Ascensores modernos'],
    internalFeatures: ['3 Hab. con baño privado', '2 Hab. con Walk-in closets', 'Cocina abierta americana', 'Zona social amplia', 'Baño social', 'Lavandería independiente', 'Depósito privado', 'Hermosa vista al occidente de Bogotá'],
    latitude: 4.723,
    longitude: -74.045,
    virtualTourVideo: 'https://ap-nuevo-cedritos-bog.netlify.app/assets/video_recorrido_inmueble_apto_150_mt2_y_terraza_84mt2.mp4',
    propertyDetails: {
      administrationFee: 420000,
      parking: '2',
      privateArea: 141.25,
      estrato: 5,
      estado: 'Libre de Gravámenes'
    },
    description: 'Disfruta de un oasis urbano con una terraza de 84 m² de uso exclusivo. Ideal para reuniones o asados al aire libre, con acabados de primera categoría en el corazón de Cedritos.',
    stealthFichaUrl: 'https://ap-nuevo-cedritos-bog.netlify.app/'
  },
  'apto-cedritos-zaira': {
    id: 'apto-cedritos-zaira',
    name: 'Apartamento Cedritos - Zaira',
    location: 'Bogotá, Usaquén',
    price: 480000000,
    bedrooms: 3,
    bathrooms: 2,
    area: 83,
    propertyType: 'Apartamento',
    yearBuilt: 1993,
    images: Array.from({ length: 20 }, (_, i) => `https://ap-cedritos-bog-ce01.netlify.app/assets/${i + 1}.jpeg`),
    amenities: ['C.C. Caobos a pasos', 'Construcción Clásica', 'Vigilancia 24/7', 'Ascensor Disponible'],
    internalFeatures: ['3 Alcobas Amplias', 'Biblioteca / Home Office', '2 Baños Completos', 'Cocina Independiente', 'Cuarto Servicio / Depósito', 'Espacios Muy Iluminados'],
    latitude: 4.725,
    longitude: -74.048,
    virtualTourVideo: 'https://ap-cedritos-bog-ce01.netlify.app/assets/video_presentacion_animada_recorrido_apto.mp4',
    propertyDetails: {
      administrationFee: 550000,
      parking: '1',
      privateArea: 82.98,
      estrato: 4,
      estado: 'Crédito Hipotecario Vigente'
    },
    description: 'Amplio apartamento clásico con un gran potencial para ser remodelado y revalorizado. Su distribución tradicional garantiza excelente iluminación natural y confort.',
    stealthFichaUrl: 'https://ap-cedritos-bog-ce01.netlify.app/'
  }
};

export default function PropertyDetail() {
  const [, params] = useRoute('/property/:id');
  const [isFavorite, setIsFavorite] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);

  // Stealth Mode Detection
  const searchParams = new URLSearchParams(window.location.search);
  const isStealth = searchParams.get('mode') === 'stealth';

  const propertyId = params?.id;
  const property = propertyId ? propertiesDatabase[propertyId] : null;

  if (!property) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Propiedad No Encontrada</h1>
          <p className="text-gray-400 mb-8">La propiedad que buscas no existe o ha sido removida.</p>
          <a href="/properties" className="btn-gold">
            Volver al Catálogo
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Barra de Navegación Universal */}
      <Navbar />

      {/* Contenido Principal */}
      <main className="container py-12">
        {/* Título y Precio */}
        <div className="mb-12 animate-fade-in mt-14">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 uppercase tracking-tighter">
            {property.name}
          </h1>
          <div className="flex items-center gap-2 text-gray-400 mb-6">
            <MapPin className="w-5 h-5 text-accent" />
            <span>{property.location}</span>
          </div>
          <div className="text-4xl font-bold text-accent mb-8">
            ${property.price.toLocaleString()} COP
            {property.propertyDetails?.administrationFee && (
              <span className="text-sm text-gray-400 font-normal ml-3 block sm:inline mt-2 sm:mt-0">
                + ${property.propertyDetails.administrationFee.toLocaleString()} Admin
              </span>
            )}
          </div>
          
          {/* Botonera de Acción de la Propiedad */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <button
               onClick={() => {
                 if (navigator.share) {
                   navigator.share({ title: property.name, url: window.location.href });
                 } else {
                   navigator.clipboard.writeText(window.location.href);
                   alert('¡Enlace de activo inmobiliario copiado al portapapeles!');
                 }
               }}
               className="btn-gold flex items-center justify-center gap-2"
            >
              <Share2 className="w-5 h-5"/> COMPARTIR INMUEBLE
            </button>
            <a
              href={property.stealthFichaUrl || '#'} 
              target="_blank" rel="noreferrer"
              className="py-3 px-6 bg-black border border-white/20 text-white rounded-lg hover:border-accent hover:text-accent transition-colors flex items-center justify-center font-bold tracking-widest text-[10px] uppercase glow-gold-sm"
            >
              DESCARGAR FICHA SIN MARCA NI DATOS DE CONTACTO
            </a>
          </div>
        </div>

        {/* MEDIA SECTION: Panel Dual (Video Izquierda, Galería Derecha en Desktop) */}
        <div className="flex flex-col lg:flex-row gap-8 mb-16 animate-fade-in delay-200">
          
          {/* Columna Izquierda: Celular Empotrado (Corto) */}
          {property.virtualTourVideo && (
            <div className="lg:w-1/3 flex flex-col shrink-0">
              <h3 className="text-2xl font-bold text-white mb-8 uppercase tracking-wider text-center lg:text-left xl:whitespace-nowrap">
                 🎥 Video
              </h3>
              <div className="flex justify-center w-full">
                <div className="aspect-[9/16] w-full max-w-[280px] sm:max-w-[320px] rounded-[2.5rem] overflow-hidden shadow-[0_0_40px_rgba(212,175,55,0.15)] border-[6px] border-[#161616] relative bg-black ring-1 ring-white/10 group-hover:shadow-[0_0_60px_rgba(212,175,55,0.3)] transition-shadow duration-500">
                  {/* Notch Dinámico Tipo iPhone */}
                  <div className="absolute top-0 inset-x-0 h-6 z-20 flex justify-center">
                    <div className="w-20 h-4 bg-[#161616] rounded-b-2xl flex justify-center items-center gap-1.5 border-b border-white/5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#112a52]"></div>
                      <div className="w-5 h-1 rounded-full bg-[#2a2a2a]"></div>
                    </div>
                  </div>
                  <iframe 
                    className="w-full h-full relative z-10 pt-[2px]"
                    src={property.virtualTourVideo} 
                    title="Recorrido Virtual"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>
          )}

          {/* Columna Derecha: Galería Inmobiliaria */}
          <div className={`${property.virtualTourVideo ? 'lg:w-2/3' : 'w-full'} flex flex-col`}>
             <h3 className="text-2xl font-bold text-white mb-8 uppercase tracking-wider text-center lg:text-left">
               📷 Fotos
            </h3>
            <div className="h-full w-full">
              <PropertyGallery images={property.images} propertyName={property.name} />
            </div>
          </div>
        </div>

        {/* Grid de Contenido */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Características y Detalles */}
          <div className="lg:col-span-2 animate-slide-in-up space-y-8">
            <PropertyFeatures
              bedrooms={property.bedrooms}
              bathrooms={property.bathrooms}
              area={property.area}
              amenities={property.amenities}
              yearBuilt={property.yearBuilt}
              propertyType={property.propertyType}
              floor={property.floor}
              totalFloors={property.totalFloors}
              propertyDetails={property.propertyDetails}
              description={property.description}
              internalFeatures={property.internalFeatures}
            />

            {/* Mega Sección Interactiva: Ubicación y Entorno (Fusión) */}
            <div className="card-float p-6 lg:p-10 border-t-2 border-accent/40 rounded-3xl mt-12 bg-gradient-to-br from-black to-[#0a0a0a]">
              <div className="flex items-center gap-3 mb-8">
                <MapPin className="w-8 h-8 text-accent shrink-0" />
                <h3 className="text-2xl lg:text-3xl font-bold text-white uppercase tracking-wider">
                   📍 Ubicación y Entorno
                </h3>
              </div>
              
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Narrativa del sector */}
                {/* Espacio reservado para texto y listados de zona - El mapa gigantesco se trasladó al nivel inferor para el impacto visual 1000% */}
                <div className="w-full text-gray-300 text-sm leading-relaxed space-y-4 pr-0">
                  <p>
                    <strong className="text-accent uppercase text-xs tracking-widest block mb-1">Zona Estratégica: {property.location.split(',')[1] || property.location}</strong>
                    Ubicado en uno de los ejes más estratégicos para revalorización. Sus colindancias garantizan alta demanda patrimonial.
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-4 mt-4 py-2 border-t border-white/10 pt-4">
                    <li className="flex gap-2">✔️ <span>Flujo vial primario y rápida descongestión.</span></li>
                    <li className="flex gap-2">✔️ <span>Acceso inmediato a hipermercados y plazas AAA.</span></li>
                    <li className="flex gap-2">✔️ <span>Zonas verdes.</span></li>
                    <li className="flex gap-2">✔️ <span>Microentorno residencial altamente vigilado.</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar: Contacto / CTA Financiero */}
          <div className="space-y-6 animate-slide-in-right">

            {/* Formulario de Contacto */}
            <div className="card-float p-6">
              <h3 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">
                Inversión Directa
              </h3>
              <div className="space-y-4">
                <a 
                  href="https://wa.me/573166569719?text=%C2%A1Hola%20Vecy!%20%F0%9F%91%8B%20Estoy%20interesado%20en%20el%20activo%20%22${property.name}%22.%20%C2%BFPodr%C3%ADan%20asesorarme?"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-gray-300 hover:text-accent transition-colors group"
                >
                  <div className="bg-accent/10 p-2 rounded-lg group-hover:bg-accent/20">
                    <Phone className="w-5 h-5 text-accent" />
                  </div>
                  <span className="font-semibold">+57 316 656 9719</span>
                </a>
                <a 
                  href="mailto:vecybienesraices@gmail.com"
                  className="flex items-center gap-3 text-gray-300 hover:text-accent transition-colors group"
                >
                  <div className="bg-accent/10 p-2 rounded-lg group-hover:bg-accent/20">
                    <Mail className="w-5 h-5 text-accent" />
                  </div>
                  <span className="font-semibold text-sm sm:text-base break-words w-[200px] sm:w-auto">vecybienesraices@gmail.com</span>
                </a>
              </div>

              <button
                onClick={() => window.open('https://vecy-agenda-pro.vercel.app/', '_blank')}
                className="btn-gold w-full mt-6 flex justify-center items-center gap-2"
              >
                <CalendarCheck className="w-5 h-5" />
                Agendar Cita Inmediata
              </button>

              <button
                onClick={() => setShowContactForm(!showContactForm)}
                className="w-full mt-3 py-3 px-6 bg-black border border-white/10 text-white rounded-lg hover:bg-white/5 hover:border-accent transition-all duration-300 uppercase tracking-widest text-xs font-bold"
              >
                Solicitar Información
              </button>

              {showContactForm && (
                <form className="mt-6 space-y-3 animate-fade-in">
                  <input
                    type="text"
                    placeholder="Tu Nombre"
                    className="w-full px-4 py-2 bg-black border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-accent focus:outline-none transition-colors"
                  />
                  <input
                    type="email"
                    placeholder="Tu Email"
                    className="w-full px-4 py-2 bg-black border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-accent focus:outline-none transition-colors"
                  />
                  <textarea
                    placeholder="Tu Mensaje"
                    rows={3}
                    className="w-full px-4 py-2 bg-black border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-accent focus:outline-none transition-colors resize-none"
                  ></textarea>
                  <button type="submit" className="btn-gold w-full">
                    Enviar Consulta
                  </button>
                </form>
              )}
            </div>

            {/* Información Adicional */}
            <div className="card-float p-6">
              <h4 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">
                Detalles Legales
              </h4>
              <div className="space-y-2 text-sm text-gray-400">
                <p>✓ Documentación completa</p>
                <p>✓ Certificado de libertad y tradición</p>
                <p>✓ Avalúo catastral actualizado</p>
                <p>✓ Disponible para financiamiento</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mega Mapa inmersivo Full-Width (1000% Boost) con Polígono o demarcación natural del Barrio */}
        <div className="mt-20 pt-10 border-t border-white/5 animate-fade-in w-full">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white uppercase tracking-wider">
                Geolocalización <span className="text-accent italic">VIP</span>
              </h2>
              <p className="text-sm text-gray-400 mt-2">Visión Satelital Completa del Entorno y Conectividad del Barrio Cantalejo</p>
            </div>
            {/* El Iframe que ocupa el 100% de la página */}
            <div className="w-full h-[50vh] sm:h-[65vh] xl:h-[75vh] 2xl:h-[800px] overflow-hidden bg-black shadow-[0_0_80px_rgba(212,175,55,0.06)] group relative border-y border-accent/20 mb-20">
              <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] z-10"></div>
              <iframe
                title="Mega Mapa Satelital Barrio Cantalejo"
                width="100%"
                height="100%"
                style={{ border: 'none', filter: 'contrast(1.1) saturate(1.1)' }}
                src="https://maps.google.com/maps?q=Barrio+Cantalejo,+Bogot%C3%A1&t=&z=15&ie=UTF8&iwloc=&output=embed"
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
        </div>
      </main>

      {/* Footer Constante */}
      <footer className="bg-black border-t border-accent/20 py-12">
        <div className="container flex flex-col items-center">
          <div className="flex items-center gap-3 mb-6 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer">
              <img src="/logo-vecy.png" alt="Vecy Logo" className="w-8 h-8 object-contain" />
              <span className="text-white font-bold tracking-tighter text-sm">VECY <span className="text-accent italic">BIENES RAÍCES</span></span>
          </div>
          <p className="text-gray-500 text-sm text-center">&copy; {new Date().getFullYear()} Vecy. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
