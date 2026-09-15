import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { trpc } from '@/lib/trpc';
import {
  X, Sparkles, Upload, Image as ImageIcon, Video, FileText, Check,
  AlertTriangle, Plus, RefreshCw, Trash2, Building2, Home, DollarSign,
  MapPin, Bed, Bath, Car, Layers, Eye, CheckCircle2, FileUp, Star,
  ChevronDown, ChevronUp, Sliders, Compass, Shield, Flame, Wine, Tv,
  BookOpen, Coffee, Sun, Trees, CheckSquare, Square, Edit2, PlusCircle,
  ChevronLeft, ChevronRight, GripVertical
} from 'lucide-react';
import { toast } from 'sonner';

interface UnifiedPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'oferta' | 'demanda';
  onSuccess?: () => void;
  editProperty?: any;
}

// 19 Tipos de inmuebles exactos solicitados por Eduardo
export const PROPERTY_TYPES_EXACT = [
  'Apartaestudio',
  'Apartamento',
  'Apartamento Dúplex',
  'Pent House',
  'Pent House Dúplex',
  'Bodega',
  'Cabaña',
  'Casa',
  'Casa Campestre',
  'Casa Quinta',
  'Edificio',
  'Finca',
  'Hostal',
  'Hotel',
  'Aparta Hotel',
  'Local',
  'Lote / Terreno',
  'Oficina',
  'Villa'
] as const;

// Mapeo al enum de base de datos
export function mapExactTypeToDbEnum(exact: string): string {
  const low = exact.toLowerCase();
  if (low.includes('apartaestudio') || low.includes('apartamento') || low.includes('pent house')) return 'apartment';
  if (low.includes('casa') || low.includes('cabaña') || low.includes('quinta') || low.includes('villa')) return 'house';
  if (low.includes('bodega')) return 'warehouse';
  if (low.includes('edificio')) return 'building';
  if (low.includes('finca')) return 'farm';
  if (low.includes('hotel') || low.includes('hostal')) return 'hotel';
  if (low.includes('local')) return 'commercial';
  if (low.includes('lote') || low.includes('terreno')) return 'land';
  if (low.includes('oficina')) return 'office';
  return 'apartment';
}

// Opciones de permuta solicitadas
export const PERMUTA_OPTIONS = [
  'Venta / Permuta / Alquiler',
  'Venta 50% / Permuta 50%',
  'Venta 60% / Permuta 40%',
  'Venta 70% / Permuta 30%',
  'Venta 80% / Permuta 20%',
  'Venta 90% / Permuta 10%',
  'Venta 10% / Permuta 90%',
  'Venta 20% / Permuta 80%',
  'Venta 30% / Permuta 70%',
  'Venta 40% / Permuta 60%',
];

// Opciones de cocina
export const COCINA_OPTIONS = [
  'Abierta',
  'Abierta tipo isla',
  'Cerrada convencional',
  'Cerrada remodelada',
  'Moderna',
  'Integral',
  'A remodelar'
];

// Características internas del inmueble (25 exactas)
export const CARACTERISTICAS_INTERNAS = [
  'Aire acondicionado',
  'Alarma',
  'Amoblado',
  'Acabados alta gama',
  'Acabados modernos',
  'Balcón',
  'Bar',
  'Baño auxiliar',
  'Baño en alcoba principal',
  'Baño en todas las alcobas',
  'Citófono',
  'Clósets',
  'Comedor auxiliar',
  'Despensa',
  'Doble Ventana',
  'Gas domiciliario',
  'Iluminación natural',
  'Hall de alcobas',
  'Jacuzzi',
  'Patio',
  'Turco',
  'Vestier',
  'Vista panorámica ciudad',
  'Vista panorámica verde',
  'Zona de lavandería'
];

// Características externas del inmueble (45 exactas)
export const CARACTERISTICAS_EXTERNAS = [
  'Acceso pavimentado',
  'Área Social',
  'Áreas turísticas',
  'Ascensor',
  'Bancos cercanos',
  'Barbacoa / Parrilla / Quincho',
  'Bosques nativos',
  'Caldera',
  'Cancha de Baloncesto',
  'Cancha de futbol',
  'Cancha de golf',
  'Cancha de Squash',
  'Cancha de Tenis',
  'Centros Comerciales',
  'Centros médicos hospitalarios',
  'Club house',
  'Colegios / Universidades',
  'Conjunto residencial',
  'Edificio de barrio',
  'Edificio inteligente',
  'Gimnasio',
  'Kiosco',
  'Lago',
  'Lavandería',
  'Parqueadero visitantes',
  'Parques cercanos',
  'Parque infantil',
  'Piscina',
  'Pista de pádel',
  'Planta eléctrica',
  'Portería / Recepción',
  'Salón infantil',
  'Salón comunal',
  'Salón de juegos',
  'Sauna/Turco',
  'Seguridad privada 24/7',
  'Sobre vía principal',
  'Shut',
  'Teatrino',
  'Terraza',
  'Transporte público cercano',
  'Zona infantil',
  'Zona residencial',
  'Zonas deportivas',
  'Zonas verdes'
];

// Años de construcción (2026 hasta 1960)
export const YEARS_LIST = Array.from({ length: 2026 - 1960 + 1 }, (_, i) => 2026 - i);

// Formateador de moneda COP en vivo
export function formatCOP(val: string | number): string {
  const clean = String(val).replace(/[^\d]/g, '');
  if (!clean) return '';
  return '$ ' + Number(clean).toLocaleString('es-CO');
}

export function cleanCOP(val: string | number): string {
  return String(val).replace(/[^\d]/g, '');
}

export default function UnifiedPublishModal({
  isOpen,
  onClose,
  defaultTab = 'oferta',
  onSuccess,
  editProperty,
}: UnifiedPublishModalProps) {
  const [activeTab, setActiveTab] = useState<'oferta' | 'demanda'>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Cerrar con Escape y bloquear scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // ═══════════════════════════════════════════════════════════════
  // ESTADOS PESTAÑA 1: OFERTA (INMUEBLE) - 4 SECCIONES COMPLETAS
  // ═══════════════════════════════════════════════════════════════
  const [propRawText, setPropRawText] = useState('');

  // SECCIÓN 1: DATOS PRINCIPALES & NEGOCIO
  const [propTxType, setPropTxType] = useState<string>('venta');
  const [propPermutaOption, setPropPermutaOption] = useState<string>('Venta 50% / Permuta 50%');
  const [propPermutaPercent, setPropPermutaPercent] = useState<number>(50);
  const [propTypeExact, setPropTypeExact] = useState<string>('Casa');
  const [propIsSubtipoComercial, setPropIsSubtipoComercial] = useState(false);
  const [propName, setPropName] = useState('');
  const [propPrice, setPropPrice] = useState('');
  const [propAdminFee, setPropAdminFee] = useState('');
  const [propAreaConstruida, setPropAreaConstruida] = useState('');
  const [propAreaPrivada, setPropAreaPrivada] = useState('');
  const [propYearBuilt, setPropYearBuilt] = useState<number | ''>('');
  const [propBedrooms, setPropBedrooms] = useState<number | '5+' | ''>('');
  const [propBathrooms, setPropBathrooms] = useState<number | '5+' | ''>('');
  const [propCocina, setPropCocina] = useState<string>('Integral');

  // SECCIÓN 2: ESPACIOS & CONFORT
  const [propCuartoServicio, setPropCuartoServicio] = useState<string>('No');
  const [propGarajesCarro, setPropGarajesCarro] = useState<number | '10+' | ''>(0);
  const [propGarajesMoto, setPropGarajesMoto] = useState<number | '10+' | ''>(0);
  const [propEstadoInmueble, setPropEstadoInmueble] = useState<string>('Excelente');
  const [propStratum, setPropStratum] = useState<number>(4);
  const [propEstarTv, setPropEstarTv] = useState<number | '5+' | ''>(0);
  const [propEstudios, setPropEstudios] = useState<number | '5+' | ''>(0);
  const [propHasCavaVinos, setPropHasCavaVinos] = useState(false);
  const [propCavaVinosCant, setPropCavaVinosCant] = useState<number | '5+'>(1);
  const [propHasChimenea, setPropHasChimenea] = useState(false);
  const [propChimeneaCant, setPropChimeneaCant] = useState<number | '5+'>(1);
  const [propChimeneaTipo, setPropChimeneaTipo] = useState<string>('Convencional a leña');
  const [propDepositos, setPropDepositos] = useState<number | '5+' | ''>(0);

  // SECCIÓN 3: TERRAZAS, NIVELES & UBICACIÓN GEOGRÁFICA
  const [propBalcones, setPropBalcones] = useState<number | '5+' | ''>(0);
  const [propHasTerrazas, setPropHasTerrazas] = useState(false);
  const [propTerrazasCant, setPropTerrazasCant] = useState<number | '5+'>(1);
  const [propAreaTerraza, setPropAreaTerraza] = useState('');
  const [propTerrazaHasBBQ, setPropTerrazaHasBBQ] = useState(false);
  const [propPiso, setPropPiso] = useState('');
  const [propUbicacionPiso, setPropUbicacionPiso] = useState<string>('Exterior');
  const [propAddress, setPropAddress] = useState('');
  const [propCoordinates, setPropCoordinates] = useState<{ lat: number; lng: number }>({ lat: 4.6953, lng: -74.0682 });
  const [propNeighborhood, setPropNeighborhood] = useState('');
  const [propZone, setPropZone] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [propDescription, setPropDescription] = useState('');

  // SECCIÓN 4: GALERÍA MULTIMEDIA & CHECKLISTS
  const [propImages, setPropImages] = useState<string[]>([]);
  const [coverIndex, setCoverIndex] = useState<number>(0);
  const [draggedPhotoIdx, setDraggedPhotoIdx] = useState<number | null>(null);
  const [propVideoUrl, setPropVideoUrl] = useState('');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [selectedInternas, setSelectedInternas] = useState<string[]>([]);
  const [selectedExternas, setSelectedExternas] = useState<string[]>([]);

  // Estados para características adicionales / personalizadas "Otro"
  const [customInternaInput, setCustomInternaInput] = useState('');
  const [editingInternaIndex, setEditingInternaIndex] = useState<number | null>(null);
  const [customInternasList, setCustomInternasList] = useState<string[]>([]);

  const [customExternaInput, setCustomExternaInput] = useState('');
  const [editingExternaIndex, setEditingExternaIndex] = useState<number | null>(null);
  const [customExternasList, setCustomExternasList] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const flyerInputRef = useRef<HTMLInputElement | null>(null);

  // Lógica de slider y opciones de permuta
  const handlePermutaSliderChange = (pct: number) => {
    setPropPermutaPercent(pct);
    const match = PERMUTA_OPTIONS.find(opt => opt.includes(`${pct}%`));
    if (match) {
      setPropPermutaOption(match);
    }
  };

  const handlePermutaOptionChange = (opt: string) => {
    setPropPermutaOption(opt);
    const m = opt.match(/Permuta\s*(\d+)%/i);
    if (m) {
      setPropPermutaPercent(Number(m[1]));
    }
  };

  // Toggle checklist de características internas
  const toggleInterna = (item: string) => {
    setSelectedInternas(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  // Handlers para "Otro" en Características Internas
  const handleAddCustomInterna = () => {
    const trimmed = customInternaInput.trim();
    if (!trimmed) return;
    if (customInternasList.includes(trimmed) || CARACTERISTICAS_INTERNAS.includes(trimmed)) {
      toast.info('Esta característica ya existe en la lista');
      setCustomInternaInput('');
      return;
    }
    setCustomInternasList(prev => [...prev, trimmed]);
    setSelectedInternas(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
    setCustomInternaInput('');
    toast.success(`Característica interna agregada: "${trimmed}"`);
  };

  const handleStartEditCustomInterna = (index: number) => {
    setEditingInternaIndex(index);
    setCustomInternaInput(customInternasList[index]);
  };

  const handleUpdateCustomInterna = () => {
    if (editingInternaIndex === null) return;
    const oldVal = customInternasList[editingInternaIndex];
    const newVal = customInternaInput.trim();
    if (!newVal) return;

    setCustomInternasList(prev => prev.map((item, idx) => idx === editingInternaIndex ? newVal : item));
    setSelectedInternas(prev => prev.map(item => item === oldVal ? newVal : item));
    setEditingInternaIndex(null);
    setCustomInternaInput('');
    toast.success('Característica actualizada correctamente');
  };

  const handleRemoveCustomInterna = (index: number) => {
    const val = customInternasList[index];
    setCustomInternasList(prev => prev.filter((_, idx) => idx !== index));
    setSelectedInternas(prev => prev.filter(i => i !== val));
    if (editingInternaIndex === index) {
      setEditingInternaIndex(null);
      setCustomInternaInput('');
    }
  };

  // Toggle checklist de características externas
  const toggleExterna = (item: string) => {
    setSelectedExternas(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  // Handlers para "Otro" en Características Externas
  const handleAddCustomExterna = () => {
    const trimmed = customExternaInput.trim();
    if (!trimmed) return;
    if (customExternasList.includes(trimmed) || CARACTERISTICAS_EXTERNAS.includes(trimmed)) {
      toast.info('Esta característica ya existe en la lista');
      setCustomExternaInput('');
      return;
    }
    setCustomExternasList(prev => [...prev, trimmed]);
    setSelectedExternas(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
    setCustomExternaInput('');
    toast.success(`Característica externa agregada: "${trimmed}"`);
  };

  const handleStartEditCustomExterna = (index: number) => {
    setEditingExternaIndex(index);
    setCustomExternaInput(customExternasList[index]);
  };

  const handleUpdateCustomExterna = () => {
    if (editingExternaIndex === null) return;
    const oldVal = customExternasList[editingExternaIndex];
    const newVal = customExternaInput.trim();
    if (!newVal) return;

    setCustomExternasList(prev => prev.map((item, idx) => idx === editingExternaIndex ? newVal : item));
    setSelectedExternas(prev => prev.map(item => item === oldVal ? newVal : item));
    setEditingExternaIndex(null);
    setCustomExternaInput('');
    toast.success('Característica actualizada correctamente');
  };

  const handleRemoveCustomExterna = (index: number) => {
    const val = customExternasList[index];
    setCustomExternasList(prev => prev.filter((_, idx) => idx !== index));
    setSelectedExternas(prev => prev.filter(i => i !== val));
    if (editingExternaIndex === index) {
      setEditingExternaIndex(null);
      setCustomExternaInput('');
    }
  };

  // Geocodificación gratuita con OpenStreetMap Nominatim ($0)
  const handleGeocodeAddress = async () => {
    if (!propAddress.trim()) {
      toast.error('Por favor escribe la dirección primero para ubicarla en el mapa');
      return;
    }
    setIsGeocoding(true);
    try {
      const query = `${propAddress}, Bogotá, Colombia`;
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
        headers: { 'Accept-Language': 'es' }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setPropCoordinates({ lat, lng });
        
        // Autocompletar sugerencia de barrio si está vacío
        const displayName = data[0].display_name || '';
        const parts = displayName.split(',').map((s: string) => s.trim());
        if (!propNeighborhood && parts.length > 1) {
          setPropNeighborhood(parts[0]);
        }
        toast.success('¡Dirección localizada en el mapa!');
      } else {
        toast.info('No se encontró la dirección exacta, el mapa se mantendrá centrado en Bogotá');
      }
    } catch (err) {
      console.warn('Error en geocodificación:', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Aplicar datos extraídos a todos los estados de las 4 secciones
  const applyPropData = (data: any) => {
    if (!data) return;
    if (data.name) setPropName(data.name);
    if (data.description) setPropDescription(data.description);
    if (data.propertyTypeExact) setPropTypeExact(data.propertyTypeExact);
    if (data.isSubtipoComercial !== undefined) setPropIsSubtipoComercial(Boolean(data.isSubtipoComercial));
    if (data.transactionType) setPropTxType(data.transactionType);
    if (data.price) setPropPrice(formatCOP(data.price));
    if (data.adminFee) setPropAdminFee(formatCOP(data.adminFee));
    if (data.zone) setPropZone(data.zone);
    if (data.addressNeighborhood) setPropNeighborhood(data.addressNeighborhood);
    else if (data.zone) setPropNeighborhood(data.zone);
    if (data.areaConstruida || data.areaTotal) setPropAreaConstruida(String(data.areaConstruida || data.areaTotal));
    if (data.areaPrivada || data.areaPrivate) setPropAreaPrivada(String(data.areaPrivada || data.areaPrivate));
    if (data.yearBuilt) setPropYearBuilt(Number(data.yearBuilt));
    if (data.bedrooms !== undefined && data.bedrooms !== null) setPropBedrooms(Number(data.bedrooms));
    if (data.bathrooms !== undefined && data.bathrooms !== null) setPropBathrooms(Number(data.bathrooms));
    if (data.garages !== undefined && data.garages !== null) setPropGarajesCarro(Number(data.garages));
    if (data.garajesCarro !== undefined) setPropGarajesCarro(Number(data.garajesCarro));
    if (data.garajesMoto !== undefined) setPropGarajesMoto(Number(data.garajesMoto));
    if (data.stratum !== undefined && data.stratum !== null) setPropStratum(Number(data.stratum));
    if (data.cocina) setPropCocina(data.cocina);
    if (data.cuartoServicio) setPropCuartoServicio(data.cuartoServicio);
    if (data.estadoInmueble) setPropEstadoInmueble(data.estadoInmueble);
    if (data.estudios !== undefined) setPropEstudios(Number(data.estudios));
    if (data.depositos !== undefined) setPropDepositos(Number(data.depositos));
    if (data.piso) setPropPiso(String(data.piso));
    if (data.balcones !== undefined) setPropBalcones(Number(data.balcones));
    if (data.hasTerrazas !== undefined) setPropHasTerrazas(Boolean(data.hasTerrazas));
    if (data.terrazasCant !== undefined) setPropTerrazasCant(Number(data.terrazasCant));
    if (data.areaTerraza) setPropAreaTerraza(String(data.areaTerraza));
    if (data.terrazaHasBBQ !== undefined) setPropTerrazaHasBBQ(Boolean(data.terrazaHasBBQ));
    if (data.selectedInternas && Array.isArray(data.selectedInternas)) {
      setSelectedInternas(data.selectedInternas);
      const customs = data.selectedInternas.filter((i: string) => !CARACTERISTICAS_INTERNAS.includes(i));
      if (customs.length > 0) setCustomInternasList(customs);
    }
    if (data.selectedExternas && Array.isArray(data.selectedExternas)) {
      setSelectedExternas(data.selectedExternas);
      const customs = data.selectedExternas.filter((i: string) => !CARACTERISTICAS_EXTERNAS.includes(i));
      if (customs.length > 0) setCustomExternasList(customs);
    }
  };

  // Motor Determinista Local en 0ms (con normalización matemática unicode)
  const extractPropertyLocally = (text: string) => {
    const norm = text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    const lower = norm.toLowerCase();

    // 1. Tipo exacto de inmueble y subtipo comercial
    let propertyTypeExact = "Casa";
    let isSubtipoComercial = false;

    if (lower.includes("casa comercial") || lower.includes("sede empresarial")) {
      propertyTypeExact = "Casa";
      isSubtipoComercial = true;
    } else if (lower.includes("local comercial") || lower.includes("local")) {
      propertyTypeExact = "Local";
      isSubtipoComercial = true;
    } else if (lower.includes("oficina") || lower.includes("consultorio")) {
      propertyTypeExact = "Oficina";
      isSubtipoComercial = true;
    } else if (lower.includes("apartaestudio")) {
      propertyTypeExact = "Apartaestudio";
    } else if (lower.includes("penthouse duplex") || lower.includes("pent house duplex")) {
      propertyTypeExact = "Pent House Dúplex";
    } else if (lower.includes("penthouse") || lower.includes("pent house")) {
      propertyTypeExact = "Pent House";
    } else if (lower.includes("apartamento duplex") || lower.includes("apto duplex")) {
      propertyTypeExact = "Apartamento Dúplex";
    } else if (lower.includes("apartamento") || lower.includes("apto")) {
      propertyTypeExact = "Apartamento";
    } else if (lower.includes("casa campestre")) {
      propertyTypeExact = "Casa Campestre";
    } else if (lower.includes("casa quinta")) {
      propertyTypeExact = "Casa Quinta";
    } else if (lower.includes("casa")) {
      propertyTypeExact = "Casa";
    } else if (lower.includes("bodega")) {
      propertyTypeExact = "Bodega";
    } else if (lower.includes("edificio")) {
      propertyTypeExact = "Edificio";
    } else if (lower.includes("finca")) {
      propertyTypeExact = "Finca";
    } else if (lower.includes("lote") || lower.includes("terreno")) {
      propertyTypeExact = "Lote / Terreno";
    } else if (lower.includes("cabaña")) {
      propertyTypeExact = "Cabaña";
    } else if (lower.includes("hotel")) {
      propertyTypeExact = "Hotel";
    } else if (lower.includes("hostal")) {
      propertyTypeExact = "Hostal";
    } else if (lower.includes("villa")) {
      propertyTypeExact = "Villa";
    }

    // 2. Tipo de negocio
    let transactionType = "venta";
    if (lower.includes("arriendo") || lower.includes("alquiler") || lower.includes("renta")) {
      transactionType = "arriendo";
    } else if (lower.includes("permuta")) {
      transactionType = "permuta";
    }

    // 3. Precio
    let price: string = "0";
    const ahoraMatch = norm.match(/(?:ahora|hoy|precio|valor|venta)[\s\:\$💲🔥]*([0-9\.\,]+(?:\s*(?:millones|mil millones|mm))?)/i);
    if (ahoraMatch) {
      const cleanNum = ahoraMatch[1].replace(/\./g, "").replace(/\,/g, "").trim();
      const parsed = parseInt(cleanNum, 10);
      if (!isNaN(parsed) && parsed > 100000) price = String(parsed);
    }
    if (price === "0") {
      const prices = Array.from(norm.matchAll(/\$\s*([0-9]{1,3}(?:\.[0-9]{3}){1,4})/g));
      if (prices.length > 0) {
        const last = prices[prices.length - 1][1].replace(/[^\d]/g, "");
        const parsed = parseInt(last, 10);
        if (!isNaN(parsed) && parsed > 100000) price = String(parsed);
      }
    }

    // 4. Áreas construida y privada
    let areaConstruida: string = "";
    const acM = norm.match(/(?:area construida|construida)[\s\:\*]*([0-9]+(?:\.[0-9]+)?)\s*m/i) || norm.match(/([0-9]+(?:\.[0-9]+)?)\s*m[2²]/i);
    if (acM) areaConstruida = acM[1];

    let areaPrivada: string = "";
    const apM = norm.match(/(?:area privada|privada)[\s\:\*]*([0-9]+(?:\.[0-9]+)?)\s*m/i);
    if (apM) areaPrivada = apM[1];

    // 5. Año de construcción o antigüedad
    let yearBuilt: number | '' = '';
    const antM = norm.match(/(?:antiguedad|edad|anos de construccion)[\s\:\*]*([0-9]+)/i);
    if (antM) {
      yearBuilt = 2026 - parseInt(antM[1], 10);
    } else {
      const yearM = norm.match(/(?:ano de construccion|construido en)[\s\:\*]*([0-9]{4})/i);
      if (yearM) yearBuilt = parseInt(yearM[1], 10);
    }

    // 6. Habitaciones, Baños, Garajes, Estrato
    let bedrooms: number | '' = '';
    const bedM = norm.match(/(?:habitacion|habitaciones|alcoba|alcobas|oficinas|dormitorio)[\s\:\/\*]*([0-9]+)/i);
    if (bedM) bedrooms = parseInt(bedM[1], 10);

    let bathrooms: number | '' = '';
    const bathM = norm.match(/(?:bano|banos)[\s\:\/\*]*([0-9]+)/i);
    if (bathM) bathrooms = parseInt(bathM[1], 10);

    let garages: number = 0;
    const garM = norm.match(/(?:garaje|garajes|parqueadero|parqueaderos)[\s\:\/\*]*([0-9]+)/i);
    if (garM) garages = parseInt(garM[1], 10);

    let stratum: number = 4;
    const strM = norm.match(/estrato[\s\:\*]*([0-6])/i);
    if (strM) stratum = parseInt(strM[1], 10);

    // 7. Cocina
    let cocina = 'Integral';
    if (lower.includes('abierta tipo isla')) cocina = 'Abierta tipo isla';
    else if (lower.includes('abierta')) cocina = 'Abierta';
    else if (lower.includes('cerrada remodelada')) cocina = 'Cerrada remodelada';
    else if (lower.includes('cerrada')) cocina = 'Cerrada convencional';
    else if (lower.includes('moderna')) cocina = 'Moderna';
    else if (lower.includes('integral')) cocina = 'Integral';
    else if (lower.includes('a remodelar')) cocina = 'A remodelar';

    // 8. Espacios adicionales
    let estudios = 0;
    const estM = norm.match(/(?:estudio|sala de juntas)[\s\:\/\*\D]*?([0-9]+)/i);
    if (estM) estudios = parseInt(estM[1], 10);

    let depositos = 0;
    const depM = norm.match(/(?:deposito|depositos)[\s\:\/\*\D]*?([0-9]+)/i);
    if (depM) depositos = parseInt(depM[1], 10);

    let piso = '';
    const pisoM = norm.match(/(?:plantas|pisos|piso)[\s\:\/\*\D]*?([0-9]+)/i);
    if (pisoM) piso = pisoM[1];

    // 9. Barrio y Localidad
    let addressNeighborhood = '';
    let zone = '';
    const barrioMatch = norm.match(/barrio[\s\:\*]*([a-zA-Z\s]+)/i);
    if (barrioMatch) addressNeighborhood = barrioMatch[1].split('\n')[0].trim();
    if (!addressNeighborhood) {
      if (lower.includes('morato')) addressNeighborhood = 'Morato';
      else if (lower.includes('cedritos')) addressNeighborhood = 'Cedritos';
      else if (lower.includes('chico')) addressNeighborhood = 'Chicó';
      else if (lower.includes('rosales')) addressNeighborhood = 'Rosales';
      else if (lower.includes('santa barbara')) addressNeighborhood = 'Santa Bárbara';
    }

    const locMatch = norm.match(/localidad[\s\:\*]*([a-zA-Z\s]+)/i);
    if (locMatch) zone = locMatch[1].split('\n')[0].trim();
    if (!zone) {
      if (lower.includes('suba')) zone = 'Suba';
      else if (lower.includes('usaquen')) zone = 'Usaquén';
      else if (lower.includes('chapinero')) zone = 'Chapinero';
      else if (lower.includes('teusaquillo')) zone = 'Teusaquillo';
    }

    // 10. Título Estandarizado Doctrinal: [Tipo de Inmueble] en [Barrio / Sector]
    // Regla de concisión v31.48: Título corto y limpio sin palabras de negocio redundantes
    const sectorDisplay = addressNeighborhood || zone || 'Bogotá';
    const tipoDisplay = isSubtipoComercial && !propertyTypeExact.toLowerCase().includes('comercial')
      ? `${propertyTypeExact} Comercial`
      : propertyTypeExact;
    const name = `${tipoDisplay} en ${sectorDisplay}`;

    // 11. Autodetección de características internas
    const internasDetectadas: string[] = [];
    if (lower.includes('iluminacion natural') || lower.includes('luz natural')) internasDetectadas.push('Iluminación natural');
    if (lower.includes('closet') || lower.includes('closets') || lower.includes('archiveros')) internasDetectadas.push('Clósets');
    if (lower.includes('comedor')) internasDetectadas.push('Comedor auxiliar');
    if (lower.includes('doble ventana')) internasDetectadas.push('Doble Ventana');
    if (lower.includes('gas')) internasDetectadas.push('Gas domiciliario');
    if (lower.includes('balcon')) internasDetectadas.push('Balcón');
    if (lower.includes('alarma') || lower.includes('seguridad')) internasDetectadas.push('Alarma');
    if (lower.includes('lavanderia') || lower.includes('zona de ropas')) internasDetectadas.push('Zona de lavandería');
    if (lower.includes('acabados modernos') || lower.includes('madera flotante')) internasDetectadas.push('Acabados modernos');
    if (lower.includes('patio')) internasDetectadas.push('Patio');

    // 12. Autodetección de características externas
    const externasDetectadas: string[] = [];
    if (lower.includes('pavimentado') || lower.includes('acceso')) externasDetectadas.push('Acceso pavimentado');
    if (lower.includes('transporte') || lower.includes('transmilenio')) externasDetectadas.push('Transporte público cercano');
    if (lower.includes('via principal') || lower.includes('av.') || lower.includes('avenida')) externasDetectadas.push('Sobre vía principal');
    if (lower.includes('banco') || lower.includes('bancos')) externasDetectadas.push('Bancos cercanos');
    if (lower.includes('comercial') || lower.includes('centro comercial') || lower.includes('comercios')) externasDetectadas.push('Centros Comerciales');
    if (lower.includes('medico') || lower.includes('clinica') || lower.includes('hospital')) externasDetectadas.push('Centros médicos hospitalarios');
    if (lower.includes('parque') || lower.includes('parques')) externasDetectadas.push('Parques cercanos');
    if (lower.includes('zonas verdes') || lower.includes('verde')) externasDetectadas.push('Zonas verdes');
    if (lower.includes('recepcion') || lower.includes('porteria')) externasDetectadas.push('Portería / Recepción');
    if (lower.includes('seguridad 24/7') || lower.includes('vigilancia')) externasDetectadas.push('Seguridad privada 24/7');

    return {
      name: name || `${propertyTypeExact} en ${addressNeighborhood || 'Bogotá'}`,
      propertyTypeExact,
      isSubtipoComercial,
      transactionType,
      price,
      areaConstruida,
      areaPrivada,
      yearBuilt,
      bedrooms,
      bathrooms,
      garajesCarro: garages,
      garajesMoto: 0,
      stratum,
      cocina,
      estudios,
      depositos,
      piso,
      zone: zone || addressNeighborhood || 'Suba',
      addressNeighborhood: addressNeighborhood || 'Morato',
      description: text.trim().slice(0, 500),
      selectedInternas: internasDetectadas,
      selectedExternas: externasDetectadas,
    };
  };

  const handleStructureProperty = () => {
    if (!propRawText.trim()) {
      toast.error('Pega primero el texto o ficha técnica en la caja superior');
      return;
    }

    // 1. Extracción determinista en 0 ms
    const local = extractPropertyLocally(propRawText);
    if (local) {
      applyPropData(local);
      toast.success('¡Datos del inmueble detectados y campos autollenados al instante!');
    }

    // 2. Disparo en background a la IA para refinar si está disponible
    parsePropMutation.mutate({ text: propRawText });
  };

  // Mutación parseText
  const parsePropMutation = trpc.properties.parseText.useMutation({
    onSuccess: (data) => {
      if (data) {
        applyPropData(data);
      }
    },
    onError: (err) => {
      console.warn('Notice parseText:', err.message);
    }
  });

  // Mutación crear Inmueble (Oferta)
  const createPropMutation = trpc.properties.create.useMutation({
    onSuccess: () => {
      toast.success('¡Inmueble publicado exitosamente en la Red Vecy!');
      resetPropForm();
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(`Error al publicar inmueble: ${err.message}`);
    },
  });

  // Mutación actualizar Inmueble (Oferta existente en modo edición)
  const updatePropMutation = trpc.properties.update.useMutation({
    onSuccess: () => {
      toast.success('¡Inmueble y galería de 30 fotos actualizados exitosamente!');
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(`Error al actualizar inmueble: ${err.message}`);
    },
  });

  // 🛡️ Hidratar estados en modo EDICIÓN cuando editProperty esté presente
  useEffect(() => {
    if (editProperty && isOpen) {
      setActiveTab('oferta');
      setPropName(editProperty.name || '');
      setPropPrice(editProperty.price ? formatCOP(String(editProperty.price)) : '');
      setPropAdminFee(editProperty.adminFee ? formatCOP(String(editProperty.adminFee)) : '');
      setPropAreaConstruida(editProperty.areaTotal ? String(editProperty.areaTotal) : '');
      setPropAreaPrivada(editProperty.areaPrivate ? String(editProperty.areaPrivate) : '');
      setPropYearBuilt(editProperty.yearBuilt || '');
      setPropBedrooms(editProperty.bedrooms !== null && editProperty.bedrooms !== undefined ? editProperty.bedrooms : '');
      setPropBathrooms(editProperty.bathrooms !== null && editProperty.bathrooms !== undefined ? editProperty.bathrooms : '');
      setPropStratum(editProperty.stratum || 4);
      setPropAddress(editProperty.location || '');
      setPropNeighborhood(editProperty.addressNeighborhood || editProperty.zone || '');
      setPropZone(editProperty.zone || editProperty.addressNeighborhood || '');
      setPropDescription(editProperty.description || editProperty.rawText || '');
      setPropVideoUrl(editProperty.videoUrl || '');

      if (editProperty.latitude && editProperty.longitude) {
        setPropCoordinates({
          lat: Number(editProperty.latitude),
          lng: Number(editProperty.longitude)
        });
      }

      if (Array.isArray(editProperty.images)) {
        setPropImages(editProperty.images.map((u: string) => {
          if (u && typeof u === 'string' && u.includes('/uploads/')) return u.substring(u.indexOf('/uploads/'));
          return u;
        }));
      }

      if (editProperty.transactionType) {
        if (editProperty.transactionType === 'venta_permuta') {
          setPropTxType('permuta');
        } else {
          setPropTxType(editProperty.transactionType);
        }
      }

      const a = editProperty.amenities;
      if (a && typeof a === 'object') {
        if (a.tipoExacto) setPropTypeExact(a.tipoExacto);
        if (a.subtipoComercial !== undefined) setPropIsSubtipoComercial(!!a.subtipoComercial);
        if (a.permutaDetalle) setPropPermutaOption(a.permutaDetalle);
        if (a.permutaPorcentaje) setPropPermutaPercent(Number(a.permutaPorcentaje));
        if (a.cocina) setPropCocina(a.cocina);
        if (a.cuartoServicio) setPropCuartoServicio(a.cuartoServicio);
        if (a.garajesMoto !== undefined) setPropGarajesMoto(a.garajesMoto);
        if (a.estadoInmueble) setPropEstadoInmueble(a.estadoInmueble);
        if (a.estarTv !== undefined) setPropEstarTv(a.estarTv);
        if (a.estudios !== undefined) setPropEstudios(a.estudios);
        if (a.cavaVinos?.tiene) {
          setPropHasCavaVinos(true);
          setPropCavaVinosCant(a.cavaVinos.cantidad || 1);
        }
        if (a.chimeneas?.tiene) {
          setPropHasChimenea(true);
          setPropChimeneaCant(a.chimeneas.cantidad || 1);
          setPropChimeneaTipo(a.chimeneas.tipo || 'Convencional a leña');
        }
        if (a.depositos !== undefined) setPropDepositos(a.depositos);
        if (a.balcones !== undefined) setPropBalcones(a.balcones);
        if (a.terrazas?.tiene) {
          setPropHasTerrazas(true);
          setPropTerrazasCant(a.terrazas.cantidad || 1);
          setPropAreaTerraza(a.terrazas.areaM2 || '');
          setPropTerrazaHasBBQ(!!a.terrazas.tieneBBQ);
        }
        if (a.pisoEdificio) setPropPiso(a.pisoEdificio);
        if (a.ubicacionPiso) setPropUbicacionPiso(a.ubicacionPiso);
        if (Array.isArray(a.caracteristicasInternas)) {
          setSelectedInternas(a.caracteristicasInternas);
          const standardInternas: readonly string[] = CARACTERISTICAS_INTERNAS;
          const customs = a.caracteristicasInternas.filter((c: string) => !standardInternas.includes(c));
          if (customs.length > 0) setCustomInternasList(customs);
        }
        if (Array.isArray(a.caracteristicasExternas)) {
          setSelectedExternas(a.caracteristicasExternas);
          const standardExternas: readonly string[] = CARACTERISTICAS_EXTERNAS;
          const customs = a.caracteristicasExternas.filter((c: string) => !standardExternas.includes(c));
          if (customs.length > 0) setCustomExternasList(customs);
        }
      }
      if (editProperty.garages !== undefined && editProperty.garages !== null) {
        setPropGarajesCarro(editProperty.garages);
      }
    }
  }, [editProperty, isOpen]);

  const resetPropForm = () => {
    setPropRawText('');
    setPropName('');
    setPropPrice('');
    setPropAdminFee('');
    setPropAreaConstruida('');
    setPropAreaPrivada('');
    setPropYearBuilt('');
    setPropBedrooms('');
    setPropBathrooms('');
    setPropCocina('Integral');
    setPropCuartoServicio('No');
    setPropGarajesCarro(0);
    setPropGarajesMoto(0);
    setPropEstadoInmueble('Excelente');
    setPropStratum(4);
    setPropEstarTv(0);
    setPropEstudios(0);
    setPropHasCavaVinos(false);
    setPropHasChimenea(false);
    setPropDepositos(0);
    setPropBalcones(0);
    setPropHasTerrazas(false);
    setPropAreaTerraza('');
    setPropTerrazaHasBBQ(false);
    setPropPiso('');
    setPropAddress('');
    setPropNeighborhood('');
    setPropZone('');
    setPropDescription('');
    setPropImages([]);
    setPropVideoUrl('');
    setSelectedInternas([]);
    setSelectedExternas([]);
    setCustomInternaInput('');
    setEditingInternaIndex(null);
    setCustomInternasList([]);
    setCustomExternaInput('');
    setEditingExternaIndex(null);
    setCustomExternasList([]);
  };

  // Función de optimización y compresión ligera en cliente para fotos grandes (>800KB)
  const compressImageForWeb = async (file: File): Promise<File | Blob> => {
    if (!file.type.startsWith('image/') || file.size < 600 * 1024) {
      return file;
    }
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDimension = 1920;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(file);
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob && blob.size < file.size) {
                const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.82
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0) return;

    let files = Array.from(rawFiles);

    // 1. ORDEN NUMÉRICO ASCENDENTE NATURAL (0.jpg, 1.jpg, 2.jpg, 3.jpg, 10.jpg, 25.jpg...)
    // Aunque no sean consecutivos exactos (porque se extraigan fotos intermedias), se preserva el orden numérico exacto.
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    let isReplacing = false;

    // Si ya existen fotos y el total sumado excede 30:
    if (propImages.length > 0 && propImages.length + files.length > 30) {
      const confirmReplace = window.confirm(
        `Has seleccionado ${files.length} fotos nuevas y actualmente tienes ${propImages.length} cargadas (el límite máximo es 30 fotos).\n\n¿Deseas REEMPLAZAR la galería actual con estas nuevas fotos ordenadas numéricamente?\n\n• Clic en ACEPTAR: Reemplazar la galería actual con las nuevas fotos seleccionadas.\n• Clic en CANCELAR: Mantener las fotos actuales sin cambios.`
      );
      if (confirmReplace) {
        isReplacing = true;
      } else {
        e.target.value = '';
        return;
      }
    }

    // Si seleccionó más de 30 fotos, tomar las primeras 30 ordenadas numéricamente
    if (files.length > 30) {
      files = files.slice(0, 30);
      toast.info('Se tomaron las primeras 30 fotos en orden numérico (límite máximo permitido).');
    }

    setIsUploadingMedia(true);
    setUploadProgressText(`Preparando ${files.length} foto(s) en orden numérico...`);

    const total = files.length;
    // Creamos ranuras fijas para asegurar que el orden numérico de las fotos sea 100% estricto
    const uploadedSlots: (string | null)[] = new Array(total).fill(null);
    let completedCount = 0;

    // Subir en lotes de 3 concurrentes para máxima velocidad y estabilidad
    const BATCH_SIZE = 3;
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batchIndices: number[] = [];
      for (let j = i; j < Math.min(i + BATCH_SIZE, total); j++) {
        batchIndices.push(j);
      }

      const batchPromises = batchIndices.map(async (idx) => {
        const file = files[idx];
        try {
          const optimized = await compressImageForWeb(file);
          const formData = new FormData();
          formData.append('file', optimized);

          const res = await fetch('/api/janIA/upload', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            const errText = await res.text().catch(() => '');
            console.error(`Error HTTP ${res.status} al subir ${file.name}:`, errText);
            return;
          }

          const json = await res.json();
          if (json && json.fileUrl) {
            let u = String(json.fileUrl);
            if (u.includes('/uploads/')) {
              u = u.substring(u.indexOf('/uploads/'));
            }
            uploadedSlots[idx] = u; // Se posiciona exactamente en su índice ordenado
            completedCount++;
            setUploadProgressText(`Subidas ${completedCount} de ${total} fotos (${file.name})...`);
          }
        } catch (err) {
          console.error(`Excepción al subir foto ${file.name}:`, err);
        }
      });

      await Promise.all(batchPromises);
    }

    const newUploaded = uploadedSlots.filter((u): u is string => !!u);

    if (newUploaded.length > 0) {
      if (isReplacing) {
        setPropImages(newUploaded);
        setCoverIndex(0);
        toast.success(`¡Galería reemplazada exitosamente con ${newUploaded.length} fotos en orden numérico!`);
      } else {
        setPropImages(prev => [...prev, ...newUploaded]);
        toast.success(`¡${newUploaded.length} foto(s) agregadas en estricto orden numérico!`);
      }
    } else {
      toast.error('No se pudieron cargar las fotos. Por favor verifica tu conexión o el formato de las imágenes.');
    }

    setIsUploadingMedia(false);
    setUploadProgressText('');
    e.target.value = '';
  };

  const handleSetCoverPhoto = (idx: number) => {
    if (idx === 0) return;
    const updated = [...propImages];
    const [selected] = updated.splice(idx, 1);
    updated.unshift(selected);
    setPropImages(updated);
    setCoverIndex(0);
    toast.success('¡Foto marcada como portada principal (#1)!');
  };

  const handleMovePhotoLeft = (idx: number) => {
    if (idx <= 0) return;
    const updated = [...propImages];
    const temp = updated[idx];
    updated[idx] = updated[idx - 1];
    updated[idx - 1] = temp;
    setPropImages(updated);
  };

  const handleMovePhotoRight = (idx: number) => {
    if (idx >= propImages.length - 1) return;
    const updated = [...propImages];
    const temp = updated[idx];
    updated[idx] = updated[idx + 1];
    updated[idx + 1] = temp;
    setPropImages(updated);
  };

  const handleRemovePhoto = (idx: number) => {
    setPropImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleClearAllPhotos = () => {
    if (window.confirm(`¿Seguro que deseas eliminar las ${propImages.length} fotos cargadas de la galería?`)) {
      setPropImages([]);
      setCoverIndex(0);
      toast.info('Galería de fotos vaciada.');
    }
  };

  const handlePhotoDragStart = (idx: number) => {
    setDraggedPhotoIdx(idx);
  };

  const handlePhotoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handlePhotoDrop = (targetIdx: number) => {
    if (draggedPhotoIdx === null || draggedPhotoIdx === targetIdx) return;
    const updated = [...propImages];
    const [movedItem] = updated.splice(draggedPhotoIdx, 1);
    updated.splice(targetIdx, 0, movedItem);
    setPropImages(updated);
    setDraggedPhotoIdx(null);
    toast.success(`Foto movida a la posición #${targetIdx + 1}`);
  };

  const handleUploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMedia(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/janIA/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const json = await res.json();
        if (json.fileUrl) {
          setPropVideoUrl(json.fileUrl);
          toast.success('Video del inmueble subido exitosamente');
        }
      }
    } catch (err) {
      toast.error('Error al subir video');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // Guardar Inmueble (Oferta)
  const handleSaveProperty = () => {
    if (!propName.trim()) {
      toast.error('Por favor escribe un título o nombre para el inmueble');
      return;
    }
    const cleanPrice = cleanCOP(propPrice);
    if (!cleanPrice || cleanPrice === '0') {
      toast.error('Por favor indica un precio válido para el inmueble');
      return;
    }

    const finalZone = (propZone || propNeighborhood || 'Bogotá').trim();
    const finalNeighborhood = (propNeighborhood || propZone || 'Bogotá').trim();
    const dbPropertyType = mapExactTypeToDbEnum(propTypeExact);

    const propertyPayload = {
      name: propName.trim(),
      description: (propDescription || propRawText || '').trim().slice(0, 500),
      propertyType: dbPropertyType as any,
      transactionType: (propTxType === 'permuta' ? 'venta_permuta' : propTxType) as any,
      price: cleanPrice,
      city: 'Bogotá',
      zone: finalZone,
      addressNeighborhood: finalNeighborhood,
      location: propAddress ? propAddress.trim() : null,
      latitude: propCoordinates.lat ? String(propCoordinates.lat) : null,
      longitude: propCoordinates.lng ? String(propCoordinates.lng) : null,
      coordinates: propCoordinates,
      bedrooms: propBedrooms !== '' ? (propBedrooms === '5+' ? 5 : Number(propBedrooms)) : null,
      bathrooms: propBathrooms !== '' ? (propBathrooms === '5+' ? 5 : Number(propBathrooms)) : null,
      garages: propGarajesCarro !== '' ? (propGarajesCarro === '10+' ? 10 : Number(propGarajesCarro)) : null,
      stratum: propStratum !== null ? Number(propStratum) : 4,
      areaTotal: propAreaConstruida ? propAreaConstruida.trim() : null,
      areaPrivate: propAreaPrivada ? propAreaPrivada.trim() : null,
      yearBuilt: propYearBuilt !== '' ? Number(propYearBuilt) : null,
      adminFee: propAdminFee ? cleanCOP(propAdminFee) : null,
      isAmoblado: selectedInternas.includes('Amoblado'),
      images: propImages,
      videoUrl: propVideoUrl ? propVideoUrl.trim() : null,
      rawText: propRawText || null,
      amenities: {
        tipoExacto: propTypeExact,
        subtipoComercial: propIsSubtipoComercial,
        permutaDetalle: propTxType === 'permuta' ? propPermutaOption : null,
        permutaPorcentaje: propTxType === 'permuta' ? propPermutaPercent : null,
        cocina: propCocina,
        cuartoServicio: propCuartoServicio,
        garajesMoto: propGarajesMoto,
        estadoInmueble: propEstadoInmueble,
        estarTv: propEstarTv,
        estudios: propEstudios,
        cavaVinos: propHasCavaVinos ? { tiene: true, cantidad: propCavaVinosCant } : { tiene: false },
        chimeneas: propHasChimenea ? { tiene: true, cantidad: propChimeneaCant, tipo: propChimeneaTipo } : { tiene: false },
        depositos: propDepositos,
        balcones: propBalcones,
        terrazas: propHasTerrazas ? { tiene: true, cantidad: propTerrazasCant, areaM2: propAreaTerraza, tieneBBQ: propTerrazaHasBBQ } : { tiene: false },
        pisoEdificio: propPiso,
        ubicacionPiso: propUbicacionPiso,
        caracteristicasInternas: selectedInternas,
        caracteristicasExternas: selectedExternas,
      }
    };

    if (editProperty?.id) {
      updatePropMutation.mutate({
        id: editProperty.id,
        data: propertyPayload
      });
    } else {
      createPropMutation.mutate(propertyPayload);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // ESTADOS PESTAÑA 2: DEMANDA (REQUERIMIENTO)
  // ═══════════════════════════════════════════════════════════════
  const [reqRawText, setReqRawText] = useState('');
  const [reqFlyerPreview, setReqFlyerPreview] = useState<string | null>(null);
  const [reqName, setReqName] = useState('');
  const [reqType, setReqType] = useState<string>('apartment');
  const [reqTxType, setReqTxType] = useState<string>('arriendo');
  const [reqCity, setReqCity] = useState('Bogotá');
  const [reqNeighborhood, setReqNeighborhood] = useState('');
  const [reqPresupuestoMax, setReqPresupuestoMax] = useState('');
  const [reqPresupuestoMin, setReqPresupuestoMin] = useState('');
  const [reqAreaMin, setReqAreaMin] = useState('');
  const [reqBedroomsMin, setReqBedroomsMin] = useState<number | ''>('');
  const [reqBathroomsMin, setReqBathroomsMin] = useState<number | ''>('');
  const [reqGaragesMin, setReqGaragesMin] = useState<number | ''>('');
  const [reqAdminFeeMax, setReqAdminFeeMax] = useState('');
  const [reqStratum, setReqStratum] = useState<number | ''>('');
  const [reqAmoblado, setReqAmoblado] = useState(false);
  const [reqContactName, setReqContactName] = useState('');
  const [reqContactPhone, setReqContactPhone] = useState('');
  const [reqFlyerUrl, setReqFlyerUrl] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const parseReqTextMutation = trpc.janIA.parseRequirementText.useMutation({
    onSuccess: (data) => {
      applyReqData(data.extracted);
      setMissingFields(data.missingFields || []);
      toast.success('JanIA ha extraído los datos del requerimiento');
    },
    onError: (err) => {
      toast.error(`Error al analizar texto: ${err.message}`);
    },
  });

  const parseReqFlyerMutation = trpc.janIA.parseRequirementFlyer.useMutation({
    onSuccess: (data) => {
      applyReqData(data.extracted);
      setMissingFields(data.missingFields || []);
      if (data.flyerUrl) setReqFlyerUrl(data.flyerUrl);
      toast.success('JanIA Vision transcribió el flyer y estructuró los datos');
    },
    onError: (err) => {
      toast.error(`Error al procesar flyer con IA: ${err.message}`);
    },
  });

  const createReqMutation = trpc.janIA.createRequirement.useMutation({
    onSuccess: () => {
      toast.success('¡Requerimiento publicado exitosamente en la Red Vecy!');
      resetReqForm();
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(`Error al publicar requerimiento: ${err.message}`);
    },
  });

  const applyReqData = (extracted: any) => {
    if (!extracted) return;
    if (extracted.name) setReqName(extracted.name);
    if (extracted.tipoInmuebleDeseado) setReqType(extracted.tipoInmuebleDeseado);
    if (extracted.tipoNegocioDeseado) setReqTxType(extracted.tipoNegocioDeseado);
    if (extracted.ciudadDeseada) setReqCity(extracted.ciudadDeseada);
    if (extracted.addressNeighborhood) setReqNeighborhood(extracted.addressNeighborhood);
    if (extracted.presupuestoMax) setReqPresupuestoMax(formatCOP(extracted.presupuestoMax));
    if (extracted.presupuestoMin) setReqPresupuestoMin(formatCOP(extracted.presupuestoMin));
    if (extracted.areaMin) setReqAreaMin(String(extracted.areaMin));
    if (extracted.habitacionesMin !== undefined && extracted.habitacionesMin !== null) setReqBedroomsMin(Number(extracted.habitacionesMin));
    if (extracted.banosMin !== undefined && extracted.banosMin !== null) setReqBathroomsMin(Number(extracted.banosMin));
    if (extracted.parqueaderosMin !== undefined && extracted.parqueaderosMin !== null) setReqGaragesMin(Number(extracted.parqueaderosMin));
    if (extracted.adminFeeMax) setReqAdminFeeMax(formatCOP(extracted.adminFeeMax));
    if (extracted.estratoDeseado && Array.isArray(extracted.estratoDeseado) && extracted.estratoDeseado.length > 0) {
      setReqStratum(extracted.estratoDeseado[0]);
    }
    if (extracted.amobladoDeseado !== undefined && extracted.amobladoDeseado !== null) setReqAmoblado(Boolean(extracted.amobladoDeseado));
    if (extracted.nombreUsuarioWhatsapp) setReqContactName(extracted.nombreUsuarioWhatsapp);
    if (extracted.idUsuarioWhatsapp) setReqContactPhone(extracted.idUsuarioWhatsapp);
    if (extracted.rawText && !reqRawText) setReqRawText(extracted.rawText);
  };

  const resetReqForm = () => {
    setReqRawText('');
    setReqFlyerPreview(null);
    setReqName('');
    setReqType('apartment');
    setReqTxType('arriendo');
    setReqCity('Bogotá');
    setReqNeighborhood('');
    setReqPresupuestoMax('');
    setReqPresupuestoMin('');
    setReqAreaMin('');
    setReqBedroomsMin('');
    setReqBathroomsMin('');
    setReqGaragesMin('');
    setReqAdminFeeMax('');
    setReqStratum('');
    setReqAmoblado(false);
    setReqContactName('');
    setReqContactPhone('');
    setReqFlyerUrl(null);
    setMissingFields([]);
  };

  const handleFlyerSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setReqFlyerPreview(base64);
      parseReqFlyerMutation.mutate({
        imageBase64: base64,
        mimeType: file.type || 'image/jpeg',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveRequirement = () => {
    const cleanPresupuesto = cleanCOP(reqPresupuestoMax);
    if (!reqName || !cleanPresupuesto) {
      toast.error('Por favor completa al menos el título y el presupuesto máximo');
      return;
    }

    createReqMutation.mutate({
      name: reqName,
      tipoInmuebleDeseado: reqType as any,
      tipoNegocioDeseado: reqTxType as any,
      ciudadDeseada: reqCity,
      addressNeighborhood: reqNeighborhood || null,
      zonaDeseada: reqNeighborhood || null,
      presupuestoMax: cleanPresupuesto,
      presupuestoMin: reqPresupuestoMin ? cleanCOP(reqPresupuestoMin) : null,
      areaMin: reqAreaMin || null,
      habitacionesMin: reqBedroomsMin !== '' ? Number(reqBedroomsMin) : null,
      banosMin: reqBathroomsMin !== '' ? Number(reqBathroomsMin) : null,
      parqueaderosMin: reqGaragesMin !== '' ? Number(reqGaragesMin) : null,
      adminFeeMax: reqAdminFeeMax ? cleanCOP(reqAdminFeeMax) : null,
      estratoDeseado: reqStratum !== '' ? [Number(reqStratum)] : null,
      amobladoDeseado: reqAmoblado,
      rawText: reqRawText || null,
      enlaceOrigen: reqFlyerUrl || null,
      nombreUsuarioWhatsapp: reqContactName || null,
      idUsuarioWhatsapp: reqContactPhone || null,
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-5xl max-h-[94vh] flex flex-col rounded-3xl bg-gradient-to-b from-[#161618] via-[#0d0d0f] to-[#080809] border border-[#bf953f]/40 shadow-[0_0_50px_rgba(191,149,63,0.25)] overflow-hidden text-foreground">
        
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#bf953f] to-[#aa771c] p-0.5 shadow-lg shadow-[#bf953f]/20">
              <div className="w-full h-full bg-[#121214] rounded-[14px] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-[#fcf6ba]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {editProperty ? `EDITAR INMUEBLE #${editProperty.id}` : 'CENTRO DE PUBLICACIÓN VECY'}
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest rounded-full bg-[#bf953f]/20 text-[#fcf6ba] border border-[#bf953f]/40">
                  {editProperty ? 'Modo Edición' : 'Gold Edition'}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {editProperty 
                  ? 'Modifica las características, precios, ubicación y gestiona las fotos del inmueble'
                  : 'Sube inmuebles con ficha profesional o publica requerimientos de clientes'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Pestañas Principales (Solo visibles si no se está editando un inmueble puntual) */}
            {!editProperty && (
              <div className="flex p-1 rounded-xl bg-black/60 border border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveTab('oferta')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'oferta'
                      ? 'bg-gradient-to-r from-[#bf953f] to-[#aa771c] text-black shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Inmueble (Oferta)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('demanda')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'demanda'
                      ? 'bg-gradient-to-r from-[#bf953f] to-[#aa771c] text-black shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Demanda (Requerimiento)
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CUERPO CON SCROLL */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin">

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* PESTAÑA 1: SUBIR INMUEBLE (OFERTA) - 4 SECCIONES EXACTAS       */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'oferta' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* ASISTENTE JANIA: PEGAR TEXTO LIBRE */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-black/40 to-amber-500/5 border border-amber-500/30 space-y-2.5 shadow-inner">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#bf953f] animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#fcf6ba]">
                      Asistente JanIA: Pegar Texto Libre de WhatsApp o Ficha Técnica
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-300/80 font-semibold">⚡ Autollenado Instantáneo en 0ms</span>
                </div>
                <textarea
                  rows={3}
                  value={propRawText}
                  onChange={(e) => setPropRawText(e.target.value)}
                  placeholder="Ej: 💥 SUPER OFERTA 🏠 Casa Comercial para Oficinas en Morato, Suba. Precio $1.500.000.000, 430 m², 5 oficinas, 6 baños, 4 garajes, estrato 4..."
                  className="w-full bg-black/60 border border-white/10 focus:border-amber-400 rounded-xl p-3 text-xs text-white placeholder:text-zinc-500 outline-none resize-none font-sans"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!propRawText.trim() || parsePropMutation.isPending}
                    onClick={handleStructureProperty}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#bf953f] to-[#aa771c] hover:brightness-110 text-black font-black text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-[#bf953f]/20 disabled:opacity-50"
                  >
                    {parsePropMutation.isPending ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Estructurar con JanIA</span>
                  </button>
                </div>
              </div>

              {/* ──────────────────────────────────────────────────────────── */}
              {/* A) SECCIÓN 1: DATOS PRINCIPALES & NEGOCIO                    */}
              {/* ──────────────────────────────────────────────────────────── */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#fcf6ba] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#bf953f]/20 text-[#bf953f] flex items-center justify-center text-[10px] font-black">A</span>
                    Sección 1: Tipo de Negocio, Inmueble & Precios
                  </h3>
                  <span className="text-[10px] text-zinc-400">Datos Financieros y Estructurales</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {/* Tipo de negocio */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Tipo de Negocio *</label>
                    <select
                      value={propTxType}
                      onChange={(e) => setPropTxType(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                    >
                      <option value="venta">Venta</option>
                      <option value="arriendo">Arriendo</option>
                      <option value="venta_o_arriendo">Venta y Arriendo</option>
                      <option value="permuta">Permuta</option>
                    </select>
                  </div>

                  {/* Tipo de inmueble (19 opciones exactas) */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Tipo de Inmueble *</label>
                    <select
                      value={propTypeExact}
                      onChange={(e) => setPropTypeExact(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                    >
                      {PROPERTY_TYPES_EXACT.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* Switch Subtipo Comercial */}
                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-black/40 border border-white/10 cursor-pointer hover:border-white/20 transition-colors">
                      <input
                        type="checkbox"
                        checked={propIsSubtipoComercial}
                        onChange={(e) => setPropIsSubtipoComercial(e.target.checked)}
                        className="w-4 h-4 rounded text-[#bf953f] accent-[#bf953f]"
                      />
                      <div className="text-[11px] text-zinc-200">
                        <span className="font-bold text-white block">Uso o Subtipo Comercial</span>
                        <span className="text-[10px] text-zinc-400">Ej: Casa Comercial, Oficina en Casa</span>
                      </div>
                    </label>
                  </div>

                  {/* SELECTOR DESLIZABLE DE PERMUTA (CONDICIONAL) */}
                  {propTxType === 'permuta' && (
                    <div className="sm:col-span-2 lg:col-span-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5" />
                          Selector de Permuta y Porcentaje
                        </span>
                        <span className="text-xs font-mono font-black text-white bg-black/60 px-2 py-0.5 rounded-md border border-white/10">
                          {propPermutaPercent}% Permuta / {100 - propPermutaPercent}% Venta
                        </span>
                      </div>
                      
                      {/* Slider deslizable */}
                      <input
                        type="range"
                        min={10}
                        max={90}
                        step={10}
                        value={propPermutaPercent}
                        onChange={(e) => handlePermutaSliderChange(Number(e.target.value))}
                        className="w-full accent-[#bf953f] cursor-pointer"
                      />

                      {/* Selector de opciones de permuta predefinidas */}
                      <select
                        value={propPermutaOption}
                        onChange={(e) => handlePermutaOptionChange(e.target.value)}
                        className="w-full bg-black/70 border border-amber-500/40 rounded-lg px-3 py-1.5 text-xs text-amber-200 outline-none font-semibold"
                      >
                        {PERMUTA_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Título / Nombre */}
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Título o Nombre del Inmueble *</label>
                    <input
                      type="text"
                      value={propName}
                      onChange={(e) => setPropName(e.target.value)}
                      placeholder="Ej: Casa Comercial para Oficinas o Sede Empresarial en Morato"
                      className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white font-bold outline-none"
                    />
                  </div>

                  {/* Precio (tipo moneda COP) */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Precio (COP) *</label>
                    <input
                      type="text"
                      value={propPrice}
                      onChange={(e) => setPropPrice(formatCOP(e.target.value))}
                      placeholder="$ 1.500.000.000"
                      className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold outline-none"
                    />
                  </div>

                  {/* Precio Administración */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Precio Administración (COP)</label>
                    <input
                      type="text"
                      value={propAdminFee}
                      onChange={(e) => setPropAdminFee(formatCOP(e.target.value))}
                      placeholder="$ 350.000"
                      className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                    />
                  </div>

                  {/* Área construida m² */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Área Construida (m²) *</label>
                    <input
                      type="text"
                      value={propAreaConstruida}
                      onChange={(e) => setPropAreaConstruida(e.target.value)}
                      placeholder="Ej: 430"
                      className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                    />
                  </div>

                  {/* Área privada m² */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Área Privada (m²)</label>
                    <input
                      type="text"
                      value={propAreaPrivada}
                      onChange={(e) => setPropAreaPrivada(e.target.value)}
                      placeholder="Ej: 387"
                      className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                    />
                  </div>

                  {/* Año de construcción */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Año de Construcción</label>
                    <select
                      value={propYearBuilt}
                      onChange={(e) => setPropYearBuilt(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="">No especificado</option>
                      {YEARS_LIST.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  {/* Cocina */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Tipo de Cocina</label>
                    <select
                      value={propCocina}
                      onChange={(e) => setPropCocina(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      {COCINA_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Habitaciones [0, 1, 2, 3, 4, 5+] */}
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Habitaciones / Oficinas</label>
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4, '5+'].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setPropBedrooms(val as any)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            propBedrooms === val 
                              ? 'bg-[#bf953f] text-black shadow' 
                              : 'bg-black/60 border border-white/10 text-zinc-300 hover:text-white'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Baños [0, 1, 2, 3, 4, 5+] */}
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Baños</label>
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4, '5+'].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setPropBathrooms(val as any)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            propBathrooms === val 
                              ? 'bg-[#bf953f] text-black shadow' 
                              : 'bg-black/60 border border-white/10 text-zinc-300 hover:text-white'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ──────────────────────────────────────────────────────────── */}
              {/* B) SECCIÓN 2: ESPACIOS, DISTRIBUCIÓN & CONFORT               */}
              {/* ──────────────────────────────────────────────────────────── */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#fcf6ba] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#bf953f]/20 text-[#bf953f] flex items-center justify-center text-[10px] font-black">B</span>
                    Sección 2: Garajes, Estado, Confort & Amenidades
                  </h3>
                  <span className="text-[10px] text-zinc-400">Distribución interna y servicios</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {/* Cuarto de servicio */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Cuarto de Servicio</label>
                    <select
                      value={propCuartoServicio}
                      onChange={(e) => setPropCuartoServicio(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="No">No tiene</option>
                      <option value="Si, con baño">Sí, con baño</option>
                      <option value="Si, sin baño">Sí, sin baño</option>
                    </select>
                  </div>

                  {/* Estado del inmueble */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Estado del Inmueble</label>
                    <select
                      value={propEstadoInmueble}
                      onChange={(e) => setPropEstadoInmueble(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="Excelente">Excelente</option>
                      <option value="Bueno">Bueno</option>
                      <option value="Regular">Regular</option>
                      <option value="Malo">Malo</option>
                      <option value="Remodelado">Remodelado</option>
                      <option value="A Remodelar">A Remodelar</option>
                    </select>
                  </div>

                  {/* Estrato [0, 1, 2, 3, 4, 5, 6] */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Estrato Socioeconómico</label>
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4, 5, 6].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setPropStratum(val)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            propStratum === val 
                              ? 'bg-[#bf953f] text-black shadow' 
                              : 'bg-black/60 border border-white/10 text-zinc-300 hover:text-white'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Garajes Carro [0 a 10+] */}
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Garajes para Carro</label>
                    <div className="flex gap-1 flex-wrap">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, '10+'].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setPropGarajesCarro(val as any)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            propGarajesCarro === val 
                              ? 'bg-[#bf953f] text-black shadow' 
                              : 'bg-black/60 border border-white/10 text-zinc-300 hover:text-white'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Garajes Moto [0 a 10+] */}
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Garajes para Moto</label>
                    <div className="flex gap-1 flex-wrap">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, '10+'].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setPropGarajesMoto(val as any)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            propGarajesMoto === val 
                              ? 'bg-[#bf953f] text-black shadow' 
                              : 'bg-black/60 border border-white/10 text-zinc-300 hover:text-white'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Estar de TV [0 a 5+] */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Estar de TV</label>
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4, '5+'].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setPropEstarTv(val as any)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            propEstarTv === val 
                              ? 'bg-[#bf953f] text-black shadow' 
                              : 'bg-black/60 border border-white/10 text-zinc-300 hover:text-white'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Estudios [0 a 5+] */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Estudios / Sala de Juntas</label>
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4, '5+'].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setPropEstudios(val as any)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            propEstudios === val 
                              ? 'bg-[#bf953f] text-black shadow' 
                              : 'bg-black/60 border border-white/10 text-zinc-300 hover:text-white'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Depósitos [0 a 5+] */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Depósitos / Bodegas</label>
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4, '5+'].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setPropDepositos(val as any)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            propDepositos === val 
                              ? 'bg-[#bf953f] text-black shadow' 
                              : 'bg-black/60 border border-white/10 text-zinc-300 hover:text-white'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cava de vinos */}
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Wine className="w-3.5 h-3.5 text-[#bf953f]" />
                        Cava de Vinos
                      </span>
                      <button
                        type="button"
                        onClick={() => setPropHasCavaVinos(!propHasCavaVinos)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          propHasCavaVinos ? 'bg-[#bf953f] text-black' : 'bg-white/10 text-zinc-400'
                        }`}
                      >
                        {propHasCavaVinos ? 'Sí tiene' : 'No'}
                      </button>
                    </div>
                    {propHasCavaVinos && (
                      <div className="flex gap-1 pt-1 animate-fade-in">
                        {[1, 2, 3, 4, '5+'].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setPropCavaVinosCant(val as any)}
                            className={`flex-1 py-1 rounded text-xs font-bold ${
                              propCavaVinosCant === val ? 'bg-[#bf953f] text-black' : 'bg-black/60 text-zinc-300'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Chimeneas */}
                  <div className="sm:col-span-2 p-3 rounded-xl bg-black/40 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        Chimeneas
                      </span>
                      <button
                        type="button"
                        onClick={() => setPropHasChimenea(!propHasChimenea)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          propHasChimenea ? 'bg-[#bf953f] text-black' : 'bg-white/10 text-zinc-400'
                        }`}
                      >
                        {propHasChimenea ? 'Sí tiene' : 'No'}
                      </button>
                    </div>
                    {propHasChimenea && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 animate-fade-in">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, '5+'].map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setPropChimeneaCant(val as any)}
                              className={`flex-1 py-1 rounded text-xs font-bold ${
                                propChimeneaCant === val ? 'bg-[#bf953f] text-black' : 'bg-black/60 text-zinc-300'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                        <select
                          value={propChimeneaTipo}
                          onChange={(e) => setPropChimeneaTipo(e.target.value)}
                          className="bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none"
                        >
                          <option value="Convencional a leña">Convencional a leña</option>
                          <option value="Gas">Chimenea de gas</option>
                          <option value="Bioetanol">Chimenea de bioetanol</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ──────────────────────────────────────────────────────────── */}
              {/* C) SECCIÓN 3: TERRAZAS, NIVELES & UBICACIÓN GEOGRÁFICA       */}
              {/* ──────────────────────────────────────────────────────────── */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#fcf6ba] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#bf953f]/20 text-[#bf953f] flex items-center justify-center text-[10px] font-black">C</span>
                    Sección 3: Balcones, Terrazas, Piso & Geolocalización en Mapa
                  </h3>
                  <span className="text-[10px] text-zinc-400">Bogotá D.C. + OpenStreetMap ($0)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {/* Balcones [0 a 5+] */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Balcones</label>
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4, '5+'].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setPropBalcones(val as any)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            propBalcones === val 
                              ? 'bg-[#bf953f] text-black shadow' 
                              : 'bg-black/60 border border-white/10 text-zinc-300 hover:text-white'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Piso en edificio o torre */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Piso o Plantas (Nivel)</label>
                    <input
                      type="text"
                      value={propPiso}
                      onChange={(e) => setPropPiso(e.target.value)}
                      placeholder="Ej: 2 (o piso 5)"
                      className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  {/* Ubicación en piso */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Vista del Piso</label>
                    <select
                      value={propUbicacionPiso}
                      onChange={(e) => setPropUbicacionPiso(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="Exterior">Exterior</option>
                      <option value="Interior">Interior</option>
                    </select>
                  </div>

                  {/* Terrazas (Condicional: cuántas, área m², BBQ) */}
                  <div className="sm:col-span-2 lg:col-span-3 p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">¿Tiene Terrazas?</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPropHasTerrazas(false)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                            !propHasTerrazas ? 'bg-zinc-700 text-white' : 'bg-black/40 text-zinc-400'
                          }`}
                        >
                          No tiene
                        </button>
                        <button
                          type="button"
                          onClick={() => setPropHasTerrazas(true)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                            propHasTerrazas ? 'bg-[#bf953f] text-black' : 'bg-black/40 text-zinc-400'
                          }`}
                        >
                          Sí tiene
                        </button>
                      </div>
                    </div>

                    {propHasTerrazas && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5 animate-fade-in">
                        <div>
                          <label className="text-[11px] text-zinc-300 block mb-1">Cuántas Terrazas</label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, '5+'].map(val => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setPropTerrazasCant(val as any)}
                                className={`flex-1 py-1 rounded text-xs font-bold ${
                                  propTerrazasCant === val ? 'bg-[#bf953f] text-black' : 'bg-black/60 text-zinc-300'
                                }`}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] text-zinc-300 block mb-1">Área de la Terraza (m²)</label>
                          <input
                            type="text"
                            value={propAreaTerraza}
                            onChange={(e) => setPropAreaTerraza(e.target.value)}
                            placeholder="Ej: 35"
                            className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-mono"
                          />
                        </div>

                        <div className="flex flex-col justify-end">
                          <label className="flex items-center gap-2 p-2 rounded-lg bg-black/60 border border-white/10 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={propTerrazaHasBBQ}
                              onChange={(e) => setPropTerrazaHasBBQ(e.target.checked)}
                              className="w-4 h-4 rounded text-[#bf953f] accent-[#bf953f]"
                            />
                            <span className="text-xs text-white font-bold">En la terraza hay zona BBQ</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dirección con Autocompletado y Mapa */}
                  <div className="sm:col-span-2 lg:col-span-3 space-y-2">
                    <label className="text-[11px] font-semibold text-zinc-300 block">
                      Dirección del Inmueble (Bogotá D.C.)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={propAddress}
                        onChange={(e) => setPropAddress(e.target.value)}
                        placeholder="Ej: Calle 116 # 70-15, Morato"
                        className="flex-1 bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none font-sans"
                      />
                      <button
                        type="button"
                        disabled={isGeocoding}
                        onClick={handleGeocodeAddress}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-[#fcf6ba] border border-[#bf953f]/30 inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        {isGeocoding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5 text-[#bf953f]" />}
                        <span>Ubicar en Mapa</span>
                      </button>
                    </div>

                    {/* MAPA INCRUSTADO INTERACTIVO GRATUITO (OpenStreetMap) */}
                    <div className="rounded-xl overflow-hidden border border-white/10 aspect-[21/9] max-h-48 bg-black">
                      <iframe
                        title="Mapa del Inmueble"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        scrolling="no"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${propCoordinates.lng - 0.006}%2C${propCoordinates.lat - 0.004}%2C${propCoordinates.lng + 0.006}%2C${propCoordinates.lat + 0.004}&layer=mapnik&marker=${propCoordinates.lat}%2C${propCoordinates.lng}`}
                        className="w-full h-full opacity-90 contrast-125"
                      />
                    </div>
                  </div>

                  {/* Barrio */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Barrio Correspondiente *</label>
                    <input
                      type="text"
                      value={propNeighborhood}
                      onChange={(e) => setPropNeighborhood(e.target.value)}
                      placeholder="Ej: Morato, Cedritos, Chicó"
                      className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white font-bold outline-none"
                    />
                  </div>

                  {/* Localidad */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Localidad Correspondiente *</label>
                    <input
                      type="text"
                      value={propZone}
                      onChange={(e) => setPropZone(e.target.value)}
                      placeholder="Ej: Suba, Usaquén, Chapinero"
                      className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  {/* Ciudad Fija */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Ciudad (Fijo)</label>
                    <input
                      type="text"
                      disabled
                      value="Bogotá D.C."
                      className="w-full bg-black/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-zinc-400 font-bold outline-none cursor-not-allowed"
                    />
                  </div>

                  {/* Descripción Adicional (Máx 500 caracteres) */}
                  <div className="sm:col-span-2 lg:col-span-3">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-zinc-300">Descripción Adicional del Inmueble</label>
                      <span className={`text-[10px] font-mono ${propDescription.length > 500 ? 'text-red-400 font-bold' : 'text-zinc-500'}`}>
                        {propDescription.length} / 500 caracteres
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      maxLength={500}
                      value={propDescription}
                      onChange={(e) => setPropDescription(e.target.value)}
                      placeholder="Describe los puntos fuertes del inmueble, acabados, cercanías, etc..."
                      className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl p-3 text-xs text-white outline-none resize-none font-sans"
                    />
                  </div>
                </div>
              </div>

              {/* ──────────────────────────────────────────────────────────── */}
              {/* D) SECCIÓN 4: GALERÍA (30 FOTOS), VIDEO & CHECKLISTS         */}
              {/* ──────────────────────────────────────────────────────────── */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-5">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#fcf6ba] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#bf953f]/20 text-[#bf953f] flex items-center justify-center text-[10px] font-black">D</span>
                    Sección 4: Galería (Hasta 30 Fotos), Video & Checklists
                  </h3>
                  <span className="text-[10px] text-zinc-400">1ª Foto = Portada Principal</span>
                </div>

                {/* GESTOR MULTIMEDIA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Selector Fotos */}
                  <div className="p-4 rounded-xl bg-black/40 border border-dashed border-white/20 hover:border-[#bf953f]/50 transition-colors text-center space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleUploadImages}
                      className="hidden"
                    />
                    <div className="w-10 h-10 rounded-xl bg-[#bf953f]/10 text-[#bf953f] flex items-center justify-center mx-auto">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Subir Fotos del Inmueble (Hasta 30)</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">La primera foto se mostrará como portada principal</p>
                    </div>
                    <button
                      type="button"
                      disabled={isUploadingMedia || propImages.length >= 30}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isUploadingMedia ? <RefreshCw className="w-3 h-3 animate-spin text-[#bf953f]" /> : <Plus className="w-3 h-3 text-[#bf953f]" />}
                      <span>{isUploadingMedia ? (uploadProgressText || 'Subiendo fotos...') : `Seleccionar Fotos (${propImages.length}/30)`}</span>
                    </button>
                  </div>

                  {/* Video */}
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-zinc-300 font-bold">
                      <Video className="w-4 h-4 text-[#bf953f]" />
                      <span>Video del Inmueble o Recorrido Virtual</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">Puedes subir un video local o pegar un enlace de YouTube/Drive:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={propVideoUrl}
                        onChange={(e) => setPropVideoUrl(e.target.value)}
                        placeholder="https://youtube.com/watch?v=... o URL"
                        className="flex-1 bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                      />
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/mp4,video/quicktime,video/webm"
                        onChange={handleUploadVideo}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        disabled={isUploadingMedia}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white shrink-0 cursor-pointer"
                      >
                        Subir MP4
                      </button>
                    </div>
                  </div>
                </div>

                {/* Previsualización de Fotos con selección de portada y reordenamiento */}
                {propImages.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-black/40 p-2.5 rounded-xl border border-white/10">
                      <div>
                        <p className="text-xs font-bold text-[#fcf6ba] flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-[#bf953f]" />
                          <span>Fotos Cargadas ({propImages.length}/30)</span>
                        </p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          Ordenadas numéricamente · Arrastra o usa <span className="text-[#bf953f] font-bold">◀ ▶</span> para organizar el recorrido
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleClearAllPhotos}
                          className="px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-500/20 text-red-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                          title="Eliminar todas las fotos"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Vaciar Galería</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                      {propImages.map((url, idx) => {
                        const cleanUrl = url.includes('/uploads/') ? url.substring(url.indexOf('/uploads/')) : url;
                        const isFirst = idx === 0;
                        const isLast = idx === propImages.length - 1;
                        const isDragged = draggedPhotoIdx === idx;

                        return (
                          <div 
                            key={idx} 
                            draggable
                            onDragStart={() => handlePhotoDragStart(idx)}
                            onDragOver={handlePhotoDragOver}
                            onDrop={() => handlePhotoDrop(idx)}
                            className={`relative rounded-xl overflow-hidden border aspect-square group bg-black/60 transition-all select-none cursor-grab active:cursor-grabbing ${
                              isDragged ? 'border-[#bf953f] scale-95 opacity-50 shadow-lg ring-2 ring-[#bf953f]/50' : 'border-white/10 hover:border-[#bf953f]/50'
                            }`}
                          >
                            <img 
                              src={cleanUrl} 
                              alt={`Foto ${idx + 1}`} 
                              className="w-full h-full object-cover pointer-events-none"
                              onError={(e) => {
                                const target = e.currentTarget;
                                if (!target.dataset.retried) {
                                  target.dataset.retried = 'true';
                                  setTimeout(() => { target.src = cleanUrl; }, 800);
                                }
                              }}
                            />

                            {/* Badge de número / Portada */}
                            <div className="absolute top-1 left-1 flex items-center gap-1 z-10">
                              {isFirst ? (
                                <span className="px-1.5 py-0.5 rounded-md bg-[#bf953f] text-black text-[9px] font-black shadow flex items-center gap-0.5">
                                  <Star className="w-2.5 h-2.5 fill-black" /> #1 PORTADA
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded-md bg-black/80 text-white text-[9px] font-bold border border-white/20 shadow">
                                  #{idx + 1}
                                </span>
                              )}
                            </div>

                            {/* Botón rápido ⭐ Portada (si no es la 1ra) */}
                            {!isFirst && (
                              <button
                                type="button"
                                onClick={() => handleSetCoverPhoto(idx)}
                                className="absolute top-1 right-8 px-1.5 py-0.5 rounded-md bg-black/80 hover:bg-[#bf953f] hover:text-black text-white text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10"
                                title="Mover como foto #1 de portada"
                              >
                                ⭐ Portada
                              </button>
                            )}

                            {/* Botón eliminar */}
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(idx)}
                              className="absolute top-1 right-1 p-1 rounded-full bg-black/80 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10"
                              title="Eliminar foto"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>

                            {/* Controles de reordenamiento inferior (Flechas ◀ ▶) */}
                            <div className="absolute bottom-0 inset-x-0 p-1 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all z-10">
                              <button
                                type="button"
                                disabled={isFirst}
                                onClick={(e) => { e.stopPropagation(); handleMovePhotoLeft(idx); }}
                                className="p-1 rounded bg-black/80 hover:bg-[#bf953f] hover:text-black text-white text-[10px] font-bold disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                                title="Mover a la izquierda (anterior)"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>

                              <span className="text-[9px] text-zinc-400 font-mono">
                                {idx + 1}/{propImages.length}
                              </span>

                              <button
                                type="button"
                                disabled={isLast}
                                onClick={(e) => { e.stopPropagation(); handleMovePhotoRight(idx); }}
                                className="p-1 rounded bg-black/80 hover:bg-[#bf953f] hover:text-black text-white text-[10px] font-bold disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                                title="Mover a la derecha (siguiente)"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* CHECKLIST CARACTERÍSTICAS INTERNAS (25 ITEMS + OTRO PERSONALIZADO) */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#fcf6ba] uppercase tracking-wider flex items-center gap-1.5">
                      <Home className="w-3.5 h-3.5 text-[#bf953f]" />
                      Características Internas ({selectedInternas.length} seleccionadas)
                    </h4>
                    <span className="text-[10px] text-zinc-400">Haz clic para activar o desactivar</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                    {CARACTERISTICAS_INTERNAS.map(item => {
                      const isSel = selectedInternas.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleInterna(item)}
                          className={`p-2 rounded-xl text-left text-[11px] font-medium transition-all flex items-center gap-2 cursor-pointer border ${
                            isSel 
                              ? 'bg-[#bf953f]/20 border-[#bf953f] text-[#fcf6ba] font-bold shadow-sm' 
                              : 'bg-black/40 border-white/5 text-zinc-400 hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                            isSel ? 'bg-[#bf953f] text-black font-black' : 'border border-white/20'
                          }`}>
                            {isSel && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <span className="truncate">{item}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* CAMPO EXTRA: OTRO (CON OPCIÓN DE EDITAR) */}
                  <div className="p-2.5 rounded-xl bg-gradient-to-r from-black/60 to-black/30 border border-[#bf953f]/30 space-y-2 shadow-inner mt-2">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#fcf6ba] shrink-0">
                        <PlusCircle className="w-4 h-4 text-[#bf953f]" />
                        <span>Otro:</span>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={customInternaInput}
                          onChange={(e) => setCustomInternaInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (editingInternaIndex !== null) handleUpdateCustomInterna();
                              else handleAddCustomInterna();
                            }
                          }}
                          placeholder={editingInternaIndex !== null ? "Modifica el nombre de la característica..." : "Escribe otra característica interna..."}
                          className="flex-1 bg-black/60 border border-white/15 focus:border-[#bf953f] rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none transition-all"
                        />
                        {editingInternaIndex !== null ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={handleUpdateCustomInterna}
                              className="px-3 py-1.5 bg-[#bf953f] hover:bg-[#d4af37] text-black text-xs font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-sm shadow-[#bf953f]/30"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Guardar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => { setEditingInternaIndex(null); setCustomInternaInput(''); }}
                              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white text-xs rounded-lg transition-all cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleAddCustomInterna}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-[#bf953f] to-[#aa771c] hover:brightness-110 text-black text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm shadow-[#bf953f]/30"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Agregar</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Chips de características adicionales agregadas */}
                    {customInternasList.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/5">
                        <span className="text-[10px] text-zinc-400 font-medium">Personalizadas agregadas:</span>
                        {customInternasList.map((item, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#bf953f]/20 border border-[#bf953f] text-[#fcf6ba] text-xs font-medium shadow-sm"
                          >
                            <span className="text-[9px] font-black uppercase tracking-wider bg-[#bf953f] text-black px-1 py-0.5 rounded">Otro</span>
                            <span className="font-bold">{item}</span>
                            <button
                              type="button"
                              title="Editar característica"
                              onClick={() => handleStartEditCustomInterna(idx)}
                              className="p-0.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              title="Eliminar característica"
                              onClick={() => handleRemoveCustomInterna(idx)}
                              className="p-0.5 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* CHECKLIST CARACTERÍSTICAS EXTERNAS (45 ITEMS + OTRO PERSONALIZADO) */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#fcf6ba] uppercase tracking-wider flex items-center gap-1.5">
                      <Trees className="w-3.5 h-3.5 text-emerald-400" />
                      Características Externas ({selectedExternas.length} seleccionadas)
                    </h4>
                    <span className="text-[10px] text-zinc-400">Haz clic para activar o desactivar</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                    {CARACTERISTICAS_EXTERNAS.map(item => {
                      const isSel = selectedExternas.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleExterna(item)}
                          className={`p-2 rounded-xl text-left text-[11px] font-medium transition-all flex items-center gap-2 cursor-pointer border ${
                            isSel 
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 font-bold shadow-sm' 
                              : 'bg-black/40 border-white/5 text-zinc-400 hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                            isSel ? 'bg-emerald-400 text-black font-black' : 'border border-white/20'
                          }`}>
                            {isSel && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <span className="truncate">{item}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* CAMPO EXTRA: OTRO (CON OPCIÓN DE EDITAR) */}
                  <div className="p-2.5 rounded-xl bg-gradient-to-r from-black/60 to-black/30 border border-emerald-500/30 space-y-2 shadow-inner mt-2">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 shrink-0">
                        <PlusCircle className="w-4 h-4 text-emerald-400" />
                        <span>Otro:</span>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={customExternaInput}
                          onChange={(e) => setCustomExternaInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (editingExternaIndex !== null) handleUpdateCustomExterna();
                              else handleAddCustomExterna();
                            }
                          }}
                          placeholder={editingExternaIndex !== null ? "Modifica el nombre de la característica..." : "Escribe otra característica externa..."}
                          className="flex-1 bg-black/60 border border-white/15 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none transition-all"
                        />
                        {editingExternaIndex !== null ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={handleUpdateCustomExterna}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-sm shadow-emerald-500/30"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Guardar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => { setEditingExternaIndex(null); setCustomExternaInput(''); }}
                              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white text-xs rounded-lg transition-all cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleAddCustomExterna}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-700 hover:brightness-110 text-black text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm shadow-emerald-500/30"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Agregar</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Chips de características adicionales agregadas */}
                    {customExternasList.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/5">
                        <span className="text-[10px] text-zinc-400 font-medium">Personalizadas agregadas:</span>
                        {customExternasList.map((item, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500 text-emerald-200 text-xs font-medium shadow-sm"
                          >
                            <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-400 text-black px-1 py-0.5 rounded">Otro</span>
                            <span className="font-bold">{item}</span>
                            <button
                              type="button"
                              title="Editar característica"
                              onClick={() => handleStartEditCustomExterna(idx)}
                              className="p-0.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              title="Eliminar característica"
                              onClick={() => handleRemoveCustomExterna(idx)}
                              className="p-0.5 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* BOTÓN FINAL PUBLICAR INMUEBLE */}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={createPropMutation.isPending || updatePropMutation.isPending}
                  onClick={handleSaveProperty}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#aa771c] hover:brightness-110 text-black font-black text-xs inline-flex items-center gap-2 shadow-lg shadow-[#bf953f]/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {(createPropMutation.isPending || updatePropMutation.isPending) ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{editProperty ? 'Guardar Cambios del Inmueble' : 'Publicar Inmueble (Oferta) en la Red'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* PESTAÑA 2: SUBIR DEMANDA (REQUERIMIENTO)                       */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'demanda' && (
            <div className="space-y-6 animate-fade-in">
              {/* ENTRADA DUAL: TEXTO O FLYER */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Opción A: Pegar Texto */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-black/40 to-transparent border border-amber-500/30 space-y-2.5 shadow-inner flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#bf953f]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-[#fcf6ba]">
                        Opción A: Pegar Texto de WhatsApp
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">Pega tal cual el mensaje que te envió el cliente o el bróker:</p>
                    <textarea
                      rows={3}
                      value={reqRawText}
                      onChange={(e) => setReqRawText(e.target.value)}
                      placeholder="Ej: Busco urgente en arriendo apto en Chapinero Alto o Rosales, 2 habitaciones, con parqueadero, presupuesto hasta 4.2 millones..."
                      className="w-full bg-black/60 border border-white/10 focus:border-amber-400 rounded-xl p-3 text-xs text-white placeholder:text-zinc-500 outline-none resize-none font-sans"
                    />
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={!reqRawText.trim() || parseReqTextMutation.isPending}
                      onClick={() => parseReqTextMutation.mutate({ text: reqRawText })}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#bf953f] to-[#aa771c] hover:brightness-110 text-black font-extrabold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow disabled:opacity-50"
                    >
                      {parseReqTextMutation.isPending ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>Estructurar con JanIA</span>
                    </button>
                  </div>
                </div>

                {/* Opción B: Subir Flyer / Afiche con JanIA Vision */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 via-black/40 to-transparent border border-blue-500/30 space-y-2.5 shadow-inner flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <FileUp className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                        Opción B: Subir Flyer / Imagen (JanIA Vision OCR)
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">¿Tienes un flyer publicitario o captura? JanIA lo transcribirá y extraerá los campos:</p>
                    
                    <input
                      ref={flyerInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFlyerSelected}
                      className="hidden"
                    />

                    {reqFlyerPreview ? (
                      <div className="relative rounded-xl overflow-hidden border border-blue-500/40 aspect-video max-h-32 bg-black flex items-center justify-center">
                        <img src={reqFlyerPreview} alt="Flyer preview" className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => {
                            setReqFlyerPreview(null);
                            setReqFlyerUrl(null);
                          }}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/80 hover:bg-red-600 text-white transition-colors cursor-pointer"
                          title="Remover flyer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => flyerInputRef.current?.click()}
                        className="p-4 rounded-xl border border-dashed border-blue-500/30 hover:border-blue-500/60 bg-black/40 text-center cursor-pointer transition-colors space-y-1"
                      >
                        <Upload className="w-5 h-5 text-blue-400 mx-auto" />
                        <p className="text-xs font-bold text-white">Haz clic para seleccionar el Flyer</p>
                        <p className="text-[10px] text-zinc-500">Captura de WhatsApp, afiche PNG, JPG o WEBP</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={!reqFlyerPreview || parseReqFlyerMutation.isPending}
                      onClick={() => flyerInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow disabled:opacity-50"
                    >
                      {parseReqFlyerMutation.isPending ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Analizando con JanIA Vision...</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>{reqFlyerPreview ? 'Re-escanear Flyer' : 'Cargar Flyer'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* AUDITORÍA DE DATOS FALTANTES PARA COTEJO */}
              {missingFields.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 space-y-2 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      Auditoría JanIA: Datos No Especificados / Faltantes para Matching
                    </h4>
                  </div>
                  <p className="text-[11px] text-zinc-300">
                    El flyer o mensaje no especificó los siguientes campos clave. Te sugerimos completarlos abajo para maximizar el puntaje de coincidencia:
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {missingFields.map((field, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-200 border border-amber-400/40"
                      >
                        ⚠️ {field}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* CAMPOS ESTRUCTURADOS DEL REQUERIMIENTO */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Parámetros de Búsqueda del Requerimiento
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Título de la Demanda *</label>
                    <input
                      type="text"
                      value={reqName}
                      onChange={(e) => setReqName(e.target.value)}
                      placeholder="Ej: Busco Apto Arriendo Chapinero 2 Habs"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Tipo de Inmueble Deseado *</label>
                    <select
                      value={reqType}
                      onChange={(e) => setReqType(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="apartment">Apartamento</option>
                      <option value="house">Casa</option>
                      <option value="office">Oficina</option>
                      <option value="commercial">Local Comercial</option>
                      <option value="warehouse">Bodega</option>
                      <option value="building">Edificio</option>
                      <option value="farm">Finca / Campestre</option>
                      <option value="land">Lote / Terreno</option>
                      <option value="loft">Loft / Studio</option>
                      <option value="consultorio">Consultorio</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Tipo de Negocio *</label>
                    <select
                      value={reqTxType}
                      onChange={(e) => setReqTxType(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                    >
                      <option value="arriendo">Arriendo</option>
                      <option value="venta">Compra (Venta)</option>
                      <option value="venta_o_arriendo">Venta o Arriendo</option>
                      <option value="arriendo_con_opcion_de_compra">Arriendo con Opción de Compra</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Presupuesto Máximo (COP) *</label>
                    <input
                      type="text"
                      value={reqPresupuestoMax}
                      onChange={(e) => setReqPresupuestoMax(formatCOP(e.target.value))}
                      placeholder="$ 4.500.000"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white font-mono font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Presupuesto Mínimo (COP)</label>
                    <input
                      type="text"
                      value={reqPresupuestoMin}
                      onChange={(e) => setReqPresupuestoMin(formatCOP(e.target.value))}
                      placeholder="$ 2.500.000"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Ciudad *</label>
                    <input
                      type="text"
                      value={reqCity}
                      onChange={(e) => setReqCity(e.target.value)}
                      placeholder="Bogotá"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Barrio o Sectores de Interés</label>
                    <input
                      type="text"
                      value={reqNeighborhood}
                      onChange={(e) => setReqNeighborhood(e.target.value)}
                      placeholder="Ej: Rosales, Chicó, Chapinero Alto"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Área Mínima (m²)</label>
                    <input
                      type="text"
                      value={reqAreaMin}
                      onChange={(e) => setReqAreaMin(e.target.value)}
                      placeholder="Ej: 75"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Habitaciones Mínimas</label>
                    <input
                      type="number"
                      value={reqBedroomsMin}
                      onChange={(e) => setReqBedroomsMin(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej: 2"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Baños Mínimos</label>
                    <input
                      type="number"
                      value={reqBathroomsMin}
                      onChange={(e) => setReqBathroomsMin(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej: 2"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Parqueaderos Requeridos</label>
                    <input
                      type="number"
                      value={reqGaragesMin}
                      onChange={(e) => setReqGaragesMin(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej: 1"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Estrato de Preferencia</label>
                    <select
                      value={reqStratum}
                      onChange={(e) => setReqStratum(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="">Cualquier estrato</option>
                      <option value="3">Estrato 3</option>
                      <option value="4">Estrato 4</option>
                      <option value="5">Estrato 5</option>
                      <option value="6">Estrato 6</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Nombre del Cliente / Contacto</label>
                    <input
                      type="text"
                      value={reqContactName}
                      onChange={(e) => setReqContactName(e.target.value)}
                      placeholder="Ej: Dra. María Fernanda Gómez"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Teléfono WhatsApp Contacto</label>
                    <input
                      type="text"
                      value={reqContactPhone}
                      onChange={(e) => setReqContactPhone(e.target.value)}
                      placeholder="Ej: 573101234567"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                    />
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                      <input
                        type="checkbox"
                        checked={reqAmoblado}
                        onChange={(e) => setReqAmoblado(e.target.checked)}
                        className="w-4 h-4 rounded text-primary accent-primary"
                      />
                      <span>¿Requiere Amoblado?</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* BOTÓN FINAL PUBLICAR REQUERIMIENTO */}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={createReqMutation.isPending}
                  onClick={handleSaveRequirement}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#bf953f] to-[#aa771c] hover:brightness-110 text-black font-black text-xs inline-flex items-center gap-2 shadow-lg shadow-[#bf953f]/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {createReqMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Publicar Requerimiento (Demanda)</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}
