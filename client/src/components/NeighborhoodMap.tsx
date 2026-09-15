import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ShieldCheck } from 'lucide-react';

interface NeighborhoodMapProps {
  lat: number;
  lng: number;
  neighborhood?: string;
  locality?: string;
  city?: string;
  radius?: number;
  className?: string;
}

export default function NeighborhoodMap({
  lat,
  lng,
  neighborhood = 'Sector Residencial',
  locality = 'Bogotá',
  city = 'Bogotá',
  radius = 550,
  className = 'h-80 w-full',
}: NeighborhoodMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Si ya existe instancia previa, destruirla para evitar fugas de memoria
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Coordenadas seguras por defecto (Bogotá Centro-Norte)
    const validLat = (!isNaN(lat) && lat !== 0) ? lat : 4.6980;
    const validLng = (!isNaN(lng) && lng !== 0) ? lng : -74.0540;

    // Desplazamiento determinístico (~120m) para garantizar PRIVACIDAD DOCTRINAL
    // Nunca muestra el punto exacto de la propiedad, solo el cuadrante del barrio
    const hash = (neighborhood + locality).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const offsetLat = ((hash % 7) - 3) * 0.0008;
    const offsetLng = (((hash * 13) % 7) - 3) * 0.0008;

    const centerLat = validLat + offsetLat;
    const centerLng = validLng + offsetLng;

    // Inicializar mapa de Leaflet
    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: 15,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false,
    });

    mapInstanceRef.current = map;

    // Capa de mosaicos oscura de alta elegancia (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Dibujar LÍMITES PERIMETRALES DEL BARRIO (Círculo perimetral con resplandor dorado)
    const perimeterCircle = L.circle([centerLat, centerLng], {
      radius: radius,
      color: '#d4af37', // Borde dorado
      weight: 2.5,
      opacity: 0.9,
      fillColor: '#bf953f', // Relleno oro tenue
      fillOpacity: 0.14,
      dashArray: '8, 8', // Borde perimetral estilizado discontinuo
    }).addTo(map);

    // Círculo concéntrico sutil interior para efecto radar/zona
    L.circle([centerLat, centerLng], {
      radius: radius * 0.45,
      color: '#bf953f',
      weight: 1,
      opacity: 0.5,
      fillColor: '#bf953f',
      fillOpacity: 0.06,
    }).addTo(map);

    // Tooltip en el perímetro
    perimeterCircle.bindTooltip(
      `<div style="font-family: sans-serif; font-size: 11px; font-weight: bold; color: #d4af37; background: #000; padding: 4px 8px; border: 1px solid #bf953f; border-radius: 6px;">
        📍 Perímetro Barrio ${neighborhood}
      </div>`,
      { permanent: false, direction: 'top', className: 'vecy-custom-tooltip' }
    );

    // Ajustar vista a los límites del círculo con padding
    map.fitBounds(perimeterCircle.getBounds(), { padding: [25, 25] });

    // Invalidate size tras montaje en el DOM para evitar tiles grises
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng, neighborhood, locality, radius]);

  const displaySector = neighborhood !== 'Sector Residencial' 
    ? `Barrio ${neighborhood}` 
    : (locality || 'Zona Norte de Bogotá');

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-zinc-950 ${className}`}>
      {/* Contenedor del Mapa Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Insignia Doctrinal de Privacidad y Límites Perimetrales */}
      <div className="absolute top-3 left-3 right-3 sm:right-auto z-[400] pointer-events-none">
        <div className="bg-black/85 backdrop-blur-md border border-primary/40 px-3.5 py-2 rounded-xl shadow-lg flex items-center gap-2 max-w-md">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0 animate-pulse" />
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wider text-white truncate">
              {displaySector}
            </p>
            <p className="text-[9px] font-semibold text-zinc-400">
              Límites perimetrales aproximados • Ubicación exacta reservada
            </p>
          </div>
        </div>
      </div>

      {/* Indicador inferior derecho de escala */}
      <div className="absolute bottom-2 right-2 z-[400] pointer-events-none">
        <span className="text-[9px] font-mono font-bold text-primary/80 bg-black/80 px-2 py-0.5 rounded border border-white/10 backdrop-blur-sm">
          Radio ~{radius}m
        </span>
      </div>
    </div>
  );
}
