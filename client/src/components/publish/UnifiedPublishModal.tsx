import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { trpc } from '@/lib/trpc';
import {
  X, Sparkles, Upload, Image as ImageIcon, Video, FileText, Check,
  AlertTriangle, Plus, RefreshCw, Trash2, Building2, Home, DollarSign,
  MapPin, Bed, Bath, Car, Layers, Eye, CheckCircle2, FileUp, Star,
  ChevronDown, ChevronUp, Sliders, Compass, Shield, Flame, Wine, Tv,
  BookOpen, Coffee, Sun, Trees, CheckSquare, Square, Edit2, PlusCircle,
  ChevronLeft, ChevronRight, GripVertical, Clipboard, ClipboardCheck,
  FileDown, Paperclip, Link2, Camera, Store, ArrowRight, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import UrlImportStep from './UrlImportStep';
import {
  COLOMBIA_DEPARTMENTS,
  getSuggestedLocalitiesForCity,
  findDepartmentForCity,
  getPropertyCategoryGroup,
} from '../../../../shared/colombiaCatalog';

interface UnifiedPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'oferta' | 'demanda';
  initialAssistantTab?: 'url' | 'text' | 'pdf';
  onSuccess?: () => void;
  editProperty?: any;
}

// 19 Tipos exactos de inmuebles tanto en OFERTAS como en DEMANDAS (Doctrina Eduardo A. Rivera)
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

// Subtipos especializados de inmuebles (v31.56)
export const PROPERTY_SUBTYPES: Record<string, string[]> = {
  'Edificio': [
    'Edificio Residencial',
    'Edificio de Oficinas',
    'Edificio de Locales / Comercial',
    'Edificio Mixto (Oficinas / Locales / Vivienda)',
    'Edificio Institucional / Educativo / Salud'
  ],
  'Hotel': [
    'Aparta-hotel',
    'Aparta-Suites',
    'Hospedaje',
    'Hostal',
    'Motel',
    'Residencia',
    'Hotel Boutique / Turístico'
  ],
  'Hostal': [
    'Hostal Turístico',
    'Hospedaje / Posada',
    'Aparta-Suites'
  ],
  'Aparta Hotel': [
    'Aparta-hotel',
    'Aparta-Suites',
    'Residencias con Servicios'
  ],
  'Casa': [
    'Casa Comercial / Oficinas / Sede',
    'Oficina en Casa',
    'Sede Empresarial / Institucional',
    'Casa Familiar Unifamiliar',
    'Casa Multifamiliar (Con Renta)',
    'Casa con Locales'
  ],
  'Casa Campestre': [
    'Casa Campestre Residencial',
    'Casa Campestre para Eventos',
    'Chalet / Cabaña Campestre'
  ],
  'Casa Quinta': [
    'Casa Quinta Recreacional',
    'Casa Quinta con Renta Turística'
  ],
  'Finca': [
    'Finca de Recreo / Vacacional',
    'Finca Productiva / Agropecuaria',
    'Finca Agroturística / Hotel Campestre'
  ],
  'Local': [
    'Local Comercial a la Calle',
    'Local en Centro Comercial',
    'Local en Plazoleta de Comidas',
    'Isla / Stand Comercial'
  ],
  'Oficina': [
    'Oficina Corporativa / Edificio Empresarial',
    'Oficina en Casa Comercial',
    'Consultorio Médico / Salud',
    'Piso Completo de Oficinas'
  ],
  'Bodega': [
    'Bodega de Almacenamiento',
    'Bodega Industrial / Producción',
    'Bodega con Oficinas / Showroom',
    'Minibodega'
  ]
};

// Componente Desplegable Numérico Limpio (0 a 10+) con selector elegante
export interface NumericFieldProps {
  label: string;
  sublabel?: string;
  value: number | '';
  onChange: (val: number | '') => void;
  min?: number;
  max?: number;
  pills?: number[];
  className?: string;
}

export function NumericField({
  label,
  sublabel,
  value,
  onChange,
  min = 0,
  className = ""
}: NumericFieldProps) {
  const options: number[] = [];
  for (let i = min; i <= 10; i++) {
    options.push(i);
  }

  // Opciones extendidas para casas comerciales, fincas, edificios y hoteles
  const extendedOptions = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 30, 35, 40, 45, 50];

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-zinc-300 block">{label}</label>
        {sublabel && <span className="text-[10px] text-zinc-500">{sublabel}</span>}
      </div>
      <div className="relative">
        <select
          value={value === '' ? '' : value}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === '' ? '' : Number(v));
          }}
          className="w-full bg-black/60 border border-white/10 hover:border-[#bf953f]/50 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none transition-colors cursor-pointer appearance-none pr-8"
        >
          <option value="" className="bg-zinc-900 text-zinc-400">Seleccionar...</option>
          {options.map((num) => (
            <option key={num} value={num} className="bg-zinc-900 text-white">
              {num === 10 ? '10+' : num}
            </option>
          ))}
          <optgroup label="Más de 10 (Edificios / Hoteles / Fincas)" className="bg-zinc-950 text-amber-300 font-bold">
            {extendedOptions.map((num) => (
              <option key={num} value={num} className="bg-zinc-900 text-white font-normal">
                {num}
              </option>
            ))}
          </optgroup>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-400">
          <ChevronDown className="w-3.5 h-3.5 text-[#bf953f]" />
        </div>
      </div>
    </div>
  );
}

// Mapeo al enum de base de datos
export function mapExactTypeToDbEnum(exact: string, subtype?: string): string {
  const low = exact.toLowerCase();
  const subLow = (subtype || '').toLowerCase();
  if (low.includes('consultorio') || subLow.includes('consultorio')) return 'consultorio';
  if (low.includes('apartaestudio') || low.includes('apartamento') || low.includes('pent house')) return 'apartment';
  if (low.includes('casa') || low.includes('quinta') || low.includes('villa')) return 'house';
  if (low.includes('cabaña') || low.includes('cabana')) return 'cabin';
  if (low.includes('bodega')) return 'warehouse';
  if (low.includes('edificio')) return 'building';
  if (low.includes('finca')) return 'farm';
  if (low.includes('hotel') || low.includes('hostal') || low.includes('aparta hotel')) return 'hotel';
  if (low.includes('local')) return 'commercial';
  if (low.includes('lote') || low.includes('terreno')) return 'land';
  if (low.includes('oficina')) return 'office';
  return 'apartment';
}

export function mapDbEnumToExactType(dbEnum: string, hintText?: string): string {
  const low = (dbEnum || '').toLowerCase();
  const hint = (hintText || '').toLowerCase();
  if (hint.includes('pent house duplex') || hint.includes('pent house dúplex') || hint.includes('penthouse duplex')) return 'Pent House Dúplex';
  if (hint.includes('pent house') || hint.includes('penthouse')) return 'Pent House';
  if (hint.includes('apartamento duplex') || hint.includes('apartamento dúplex') || hint.includes('apto duplex')) return 'Apartamento Dúplex';
  if (hint.includes('apartaestudio') || low === 'loft') return 'Apartaestudio';
  if (hint.includes('aparta hotel') || hint.includes('apartahotel') || hint.includes('aparta-hotel')) return 'Aparta Hotel';
  if (hint.includes('hostal')) return 'Hostal';
  if (hint.includes('casa campestre')) return 'Casa Campestre';
  if (hint.includes('casa quinta')) return 'Casa Quinta';
  if (hint.includes('villa')) return 'Villa';
  if (hint.includes('cabaña') || hint.includes('cabana') || low === 'cabin') return 'Cabaña';
  if (low === 'consultorio' || hint.includes('consultorio')) return 'Oficina';
  if (low === 'office') return 'Oficina';
  if (low === 'commercial') return 'Local';
  if (low === 'warehouse') return 'Bodega';
  if (low === 'building') return 'Edificio';
  if (low === 'farm') return 'Finca';
  if (low === 'hotel') return 'Hotel';
  if (low === 'land') return 'Lote / Terreno';
  if (low === 'house') return 'Casa';
  return 'Apartamento';
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
  initialAssistantTab = 'text',
  onSuccess,
  editProperty,
}: UnifiedPublishModalProps) {
  const [activeTab, setActiveTab] = useState<'oferta' | 'demanda'>(defaultTab);
  const [propWizardStep, setPropWizardStep] = useState<1 | 2>(1);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (isOpen && !editProperty) {
      setJaniaAssistantTab(initialAssistantTab);
      setPropWizardStep(1);
    }
  }, [isOpen, initialAssistantTab, editProperty]);

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
  const [propSubtype, setPropSubtype] = useState<string>('');
  const [propName, setPropName] = useState('');
  const [propPrice, setPropPrice] = useState('');
  const [propRentPrice, setPropRentPrice] = useState('');
  const [propAdminFee, setPropAdminFee] = useState('');
  const [propAreaConstruida, setPropAreaConstruida] = useState('');
  const [propAreaPrivada, setPropAreaPrivada] = useState('');
  const [propYearBuilt, setPropYearBuilt] = useState<number | ''>('');
  const [propBedrooms, setPropBedrooms] = useState<number | ''>('');
  const [propBathrooms, setPropBathrooms] = useState<number | ''>('');
  const [propCocina, setPropCocina] = useState<string>('Integral');

  // ASISTENTE JANIA WORKSPACE: URL, TEXTO & FICHA TÉCNICA PDF
  const [janiaAssistantTab, setJaniaAssistantTab] = useState<'url' | 'text' | 'pdf'>(initialAssistantTab);
  const [propRepublishToVecyStore, setPropRepublishToVecyStore] = useState<boolean>(true);
  const [propVisibilityScope, setPropVisibilityScope] = useState<'public_and_agent' | 'agent_only'>('public_and_agent');
  const [propSourcePortal, setPropSourcePortal] = useState<string | null>(null);
  const [propSourceUrl, setPropSourceUrl] = useState<string | null>(null);
  const [propRawImportPayload, setPropRawImportPayload] = useState<any>(null);
  const step1HeadingRef = useRef<HTMLHeadingElement | null>(null);
  const step2HeadingRef = useRef<HTMLHeadingElement | null>(null);
  const propRawTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [propPdfFile, setPropPdfFile] = useState<File | null>(null);
  const [propPdfFileName, setPropPdfFileName] = useState<string>('');
  const [propPdfBase64, setPropPdfBase64] = useState<string>('');
  const [propPdfUrl, setPropPdfUrl] = useState<string | null>(null);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [isDraggingPdf, setIsDraggingPdf] = useState(false);
  const [isCopiedClipboard, setIsCopiedClipboard] = useState(false);

  // SECCIÓN 2: ESPACIOS & CONFORT
  const [propCuartoServicio, setPropCuartoServicio] = useState<string>('No');
  const [propGarajesCarro, setPropGarajesCarro] = useState<number | ''>(0);
  const [propGarajesMoto, setPropGarajesMoto] = useState<number | ''>(0);
  const [propEstadoInmueble, setPropEstadoInmueble] = useState<string>('Excelente');
  const [propStratum, setPropStratum] = useState<number>(4);
  const [propEstarTv, setPropEstarTv] = useState<number | ''>(0);
  const [propEstudios, setPropEstudios] = useState<number | ''>(0);
  const [propHasCavaVinos, setPropHasCavaVinos] = useState(false);
  const [propCavaVinosCant, setPropCavaVinosCant] = useState<number | ''>(1);
  const [propHasChimenea, setPropHasChimenea] = useState(false);
  const [propChimeneaCant, setPropChimeneaCant] = useState<number | ''>(1);
  const [propChimeneaTipo, setPropChimeneaTipo] = useState<string>('Convencional a leña');
  const [propDepositos, setPropDepositos] = useState<number | ''>(0);

  // SECCIÓN 3: TERRAZAS, NIVELES & UBICACIÓN GEOGRÁFICA
  const [propBalcones, setPropBalcones] = useState<number | ''>(0);
  const [propHasTerrazas, setPropHasTerrazas] = useState(false);
  const [propTerrazasCant, setPropTerrazasCant] = useState<number | ''>(1);
  const [propAreaTerraza, setPropAreaTerraza] = useState('');
  const [propTerrazaHasBBQ, setPropTerrazaHasBBQ] = useState(false);
  const [propPiso, setPropPiso] = useState('');
  const [propUbicacionPiso, setPropUbicacionPiso] = useState<string>('Exterior');
  const [propAddress, setPropAddress] = useState('');
  const [propCoordinates, setPropCoordinates] = useState<{ lat: number; lng: number }>({ lat: 4.6953, lng: -74.0682 });
  const [propDepartment, setPropDepartment] = useState('Bogotá D.C.');
  const [propCity, setPropCity] = useState('Bogotá, D.C.');
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

  // Geocodificación gratuita con OpenStreetMap Nominatim ($0 — Cobertura Nacional)
  const handleGeocodeAddress = async () => {
    if (!propAddress.trim() && !propNeighborhood.trim()) {
      toast.error('Por favor escribe la dirección o el barrio para ubicarlo en el mapa');
      return;
    }
    setIsGeocoding(true);
    try {
      const query = [propAddress.trim(), propNeighborhood.trim(), propCity.trim() || 'Colombia', propDepartment.trim(), 'Colombia']
        .filter(Boolean)
        .join(', ');
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
        toast.success(`¡Ubicación localizada en ${propCity || 'Colombia'}!`);
      } else {
        toast.info(`No se encontró la dirección exacta en ${propCity || 'Colombia'}. Verifica los datos o ajusta el barrio.`);
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
    if (data.subtype) setPropSubtype(data.subtype);
    if (data.pdfUrl) setPropPdfUrl(data.pdfUrl);
    if (data.isSubtipoComercial !== undefined) setPropIsSubtipoComercial(Boolean(data.isSubtipoComercial));
    if (data.transactionType) setPropTxType(data.transactionType);
    if (data.price && String(data.price) !== '0') setPropPrice(formatCOP(data.price));
    if (data.rentPrice && String(data.rentPrice) !== '0') setPropRentPrice(formatCOP(data.rentPrice));
    if (data.adminFee) setPropAdminFee(formatCOP(data.adminFee));
    if (data.sourcePortal) setPropSourcePortal(data.sourcePortal);
    if (data.sourceUrl) setPropSourceUrl(data.sourceUrl);
    if (data.rawImportPayload) setPropRawImportPayload(data.rawImportPayload);
    if (data.republishToVecyStore !== undefined) setPropRepublishToVecyStore(Boolean(data.republishToVecyStore));
    if (data.thirdPartyMediaStripped) {
      setPropImages([]);
      setPropVideoUrl('');
    }
    if (data.city) {
      setPropCity(data.city);
      const dep = data.department || findDepartmentForCity(data.city);
      if (dep) setPropDepartment(dep);
    } else if (data.department) {
      setPropDepartment(data.department);
    }
    if (data.addressLocality) setPropZone(data.addressLocality);
    else if (data.zone) setPropZone(data.zone);
    if (data.addressNeighborhood) setPropNeighborhood(data.addressNeighborhood);
    else if (data.zone) setPropNeighborhood(data.zone);
    if (data.areaConstruida || data.areaTotal) setPropAreaConstruida(String(data.areaConstruida || data.areaTotal));
    if (data.areaPrivada || data.areaPrivate) setPropAreaPrivada(String(data.areaPrivada || data.areaPrivate));
    if (data.yearBuilt) setPropYearBuilt(Number(data.yearBuilt));
    if (data.bedrooms !== undefined && data.bedrooms !== null) setPropBedrooms(data.bedrooms === '' ? '' : Number(data.bedrooms));
    if (data.bathrooms !== undefined && data.bathrooms !== null) setPropBathrooms(data.bathrooms === '' ? '' : Number(data.bathrooms));
    if (data.garages !== undefined && data.garages !== null) setPropGarajesCarro(Number(data.garages));
    if (data.garajesCarro !== undefined) setPropGarajesCarro(data.garajesCarro === '' ? '' : Number(data.garajesCarro));
    if (data.garajesMoto !== undefined) setPropGarajesMoto(data.garajesMoto === '' ? '' : Number(data.garajesMoto));
    if (data.stratum !== undefined && data.stratum !== null) setPropStratum(Number(data.stratum));
    if (data.cocina) setPropCocina(data.cocina);
    if (data.cuartoServicio) setPropCuartoServicio(data.cuartoServicio);
    if (data.estadoInmueble) setPropEstadoInmueble(data.estadoInmueble);
    if (data.estudios !== undefined) setPropEstudios(data.estudios === '' ? '' : Number(data.estudios));
    if (data.depositos !== undefined) setPropDepositos(data.depositos === '' ? '' : Number(data.depositos));
    if (data.estarTv !== undefined) setPropEstarTv(data.estarTv === '' ? '' : Number(data.estarTv));
    if (data.piso) setPropPiso(String(data.piso));
    if (data.balcones !== undefined) setPropBalcones(data.balcones === '' ? '' : Number(data.balcones));
    if (data.hasTerrazas !== undefined) setPropHasTerrazas(Boolean(data.hasTerrazas));
    if (data.terrazasCant !== undefined) setPropTerrazasCant(data.terrazasCant === '' ? '' : Number(data.terrazasCant));
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
    let subtype: string | null = null;

    if (lower.includes("casa comercial") || lower.includes("sede empresarial") || lower.includes("oficina en casa")) {
      propertyTypeExact = "Casa";
      isSubtipoComercial = true;
      subtype = lower.includes("sede") 
        ? "Sede Empresarial / Institucional" 
        : (lower.includes("oficina") ? "Oficina en Casa" : "Casa Comercial / Oficinas / Sede");
    } else if (lower.includes("local comercial") || lower.includes("local")) {
      propertyTypeExact = "Local";
      isSubtipoComercial = true;
      subtype = lower.includes("centro comercial") ? "Local en Centro Comercial" : "Local Comercial a la Calle";
    } else if (lower.includes("consultorio")) {
      propertyTypeExact = "Consultorio";
      isSubtipoComercial = true;
      subtype = "Consultorio Médico / Odontológico / Salud";
    } else if (lower.includes("oficina")) {
      propertyTypeExact = "Oficina";
      isSubtipoComercial = true;
      subtype = "Oficina Corporativa / Edificio Empresarial";
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
      subtype = "Casa Campestre Residencial";
    } else if (lower.includes("casa quinta")) {
      propertyTypeExact = "Casa Quinta";
      subtype = "Casa Quinta Recreacional";
    } else if (lower.includes("casa")) {
      propertyTypeExact = "Casa";
      subtype = "Casa Familiar Unifamiliar";
    } else if (lower.includes("bodega")) {
      propertyTypeExact = "Bodega";
      subtype = lower.includes("industrial") ? "Bodega Industrial / Producción" : "Bodega de Almacenamiento";
    } else if (lower.includes("edificio")) {
      propertyTypeExact = "Edificio";
      if (lower.includes("oficina")) subtype = "Edificio de Oficinas";
      else if (lower.includes("local")) subtype = "Edificio de Locales / Comercial";
      else if (lower.includes("residencial")) subtype = "Edificio Residencial";
      else subtype = "Edificio Mixto (Oficinas / Locales / Vivienda)";
    } else if (lower.includes("finca")) {
      propertyTypeExact = "Finca";
      if (lower.includes("productiva") || lower.includes("agro")) subtype = "Finca Productiva / Agropecuaria";
      else if (lower.includes("hotel") || lower.includes("turis")) subtype = "Finca Agroturística / Hotel Campestre";
      else subtype = "Finca de Recreo / Vacacional";
    } else if (lower.includes("lote") || lower.includes("terreno")) {
      propertyTypeExact = "Lote / Terreno";
    } else if (lower.includes("cabaña")) {
      propertyTypeExact = "Cabaña";
    } else if (lower.includes("aparta-hotel") || lower.includes("aparta hotel")) {
      propertyTypeExact = "Aparta Hotel";
      subtype = "Aparta-hotel";
    } else if (lower.includes("aparta-suites") || lower.includes("aparta suites")) {
      propertyTypeExact = "Hotel";
      subtype = "Aparta-Suites";
    } else if (lower.includes("hostal")) {
      propertyTypeExact = "Hostal";
      subtype = "Hostal";
    } else if (lower.includes("motel")) {
      propertyTypeExact = "Hotel";
      subtype = "Motel";
    } else if (lower.includes("residencia")) {
      propertyTypeExact = "Hotel";
      subtype = "Residencia";
    } else if (lower.includes("hospedaje")) {
      propertyTypeExact = "Hotel";
      subtype = "Hospedaje";
    } else if (lower.includes("hotel")) {
      propertyTypeExact = "Hotel";
      subtype = "Hotel Boutique / Turístico";
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

    // 6. Habitaciones, Baños, Garajes, Estrato (soporta enteros hasta 50+)
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

    // 9. Barrio y Localidad (sin forzar Suba/Morato)
    let addressNeighborhood = '';
    let zone = '';
    const barrioMatch = norm.match(/(?:barrio|vereda)[\s\:\*]*([a-zA-Z0-9\s]+?)(?:,|\n|$)/i);
    if (barrioMatch) addressNeighborhood = barrioMatch[1].trim();

    const locMatch = norm.match(/(?:localidad|comuna)[\s\:\*]*([a-zA-Z0-9\s\-]+?)(?:,|\n|$)/i);
    if (locMatch) zone = locMatch[1].trim();

    // 10. Título Estandarizado Doctrinal: [Tipo de Inmueble] en [Barrio / Sector]
    const sectorDisplay = addressNeighborhood || zone || 'Colombia';
    const tipoDisplay = isSubtipoComercial && !propertyTypeExact.toLowerCase().includes('comercial') && propertyTypeExact !== 'Consultorio'
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
      subtype,
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
      zone: zone || addressNeighborhood || '',
      addressNeighborhood: addressNeighborhood || '',
      description: text.trim().slice(0, 500),
      selectedInternas: internasDetectadas,
      selectedExternas: externasDetectadas,
    };
  };

  // Carga y procesamiento local de PDF
  const handlePdfUpload = (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Por favor selecciona un archivo en formato PDF');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error('El archivo supera el límite de 25 MB');
      return;
    }

    setPropPdfFile(file);
    setPropPdfFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string) || '';
      setPropPdfBase64(base64);
      toast.success(`Ficha técnica "${file.name}" cargada correctamente`);
    };
    reader.onerror = () => {
      toast.error('Error al leer el archivo PDF local');
    };
    reader.readAsDataURL(file);
  };

  // Pegar instantáneo de texto desde el portapapeles
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setPropRawText(text);
        setIsCopiedClipboard(true);
        setTimeout(() => setIsCopiedClipboard(false), 2000);
        toast.success('¡Texto pegado desde el portapapeles!');
      } else {
        toast.error('El portapapeles está vacío o no contiene texto');
      }
    } catch (e) {
      toast.error('Usa Ctrl+V directamente sobre el campo de texto');
    }
  };

  const handleStructureProperty = () => {
    if (!propRawText.trim() && !propPdfBase64) {
      toast.error('Pega el texto del inmueble o sube una Ficha Técnica en PDF para estructurar');
      return;
    }

    // 1. Extracción determinista en 0 ms si hay texto
    if (propRawText.trim()) {
      const local = extractPropertyLocally(propRawText);
      if (local) {
        applyPropData(local);
        toast.success('¡Datos del inmueble detectados y campos autollenados al instante!');
      }
    }

    // 2. Disparo a JanIA con texto y/o PDF
    setIsParsingPdf(!!propPdfBase64);
    parsePropMutation.mutate({
      text: propRawText.trim() || undefined,
      pdfBase64: propPdfBase64 || undefined,
      pdfMimeType: 'application/pdf',
      fileName: propPdfFileName || undefined,
    });
  };

  // Mutación parseText
  const parsePropMutation = trpc.properties.parseText.useMutation({
    onSuccess: (data) => {
      setIsParsingPdf(false);
      if (data) {
        applyPropData(data);
        if (data.pdfUrl) {
          setPropPdfUrl(data.pdfUrl);
          toast.success('¡Ficha Técnica PDF analizada, vinculada y estructurada por JanIA!');
        } else {
          toast.success('¡Estructurado con JanIA completado con éxito!');
        }
      }
    },
    onError: (err) => {
      setIsParsingPdf(false);
      console.warn('Notice parseText:', err.message);
      toast.error(`Aviso JanIA: ${err.message}`);
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
      setPropWizardStep(1);
      setPropName(editProperty.name || '');
      setPropPrice(editProperty.price ? formatCOP(String(editProperty.price)) : '');
      setPropRentPrice(editProperty.rentPrice ? formatCOP(String(editProperty.rentPrice)) : '');
      setPropAdminFee(editProperty.adminFee ? formatCOP(String(editProperty.adminFee)) : '');
      setPropRepublishToVecyStore(editProperty.republishToVecyStore !== false);
      setPropVisibilityScope(editProperty.visibilityScope === 'agent_only' ? 'agent_only' : 'public_and_agent');
      setPropSourcePortal(editProperty.sourcePortal || null);
      setPropSourceUrl(editProperty.sourceUrl || null);
      setPropRawImportPayload(editProperty.rawImportPayload || null);
      setPropAreaConstruida(editProperty.areaTotal ? String(editProperty.areaTotal) : '');
      setPropAreaPrivada(editProperty.areaPrivate ? String(editProperty.areaPrivate) : '');
      setPropYearBuilt(editProperty.yearBuilt || '');
      setPropBedrooms(editProperty.bedrooms !== null && editProperty.bedrooms !== undefined ? editProperty.bedrooms : '');
      setPropBathrooms(editProperty.bathrooms !== null && editProperty.bathrooms !== undefined ? editProperty.bathrooms : '');
      setPropStratum(editProperty.stratum || 4);
      setPropAddress(editProperty.location || '');
      const hydratedCity = editProperty.addressCity || editProperty.city || 'Bogotá, D.C.';
      setPropCity(hydratedCity);
      setPropDepartment(editProperty.amenities?.departamento || findDepartmentForCity(hydratedCity) || 'Bogotá D.C.');
      setPropNeighborhood(editProperty.addressNeighborhood || editProperty.zone || '');
      setPropZone(editProperty.addressLocality || editProperty.zone || editProperty.addressNeighborhood || '');
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
        if (a.subtipo) setPropSubtype(a.subtipo);
        if (a.fichaTecnicaPdfUrl) {
          setPropPdfUrl(a.fichaTecnicaPdfUrl);
          setPropPdfFileName(a.fichaTecnicaPdfUrl.split('/').pop() || 'Ficha_Tecnica.pdf');
        }
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
      if (editProperty.externalUrl && !propPdfUrl && editProperty.externalUrl.toLowerCase().includes('.pdf')) {
        setPropPdfUrl(editProperty.externalUrl);
        setPropPdfFileName(editProperty.externalUrl.split('/').pop() || 'Ficha_Tecnica.pdf');
      }
      if (editProperty.garages !== undefined && editProperty.garages !== null) {
        setPropGarajesCarro(editProperty.garages);
      }
    }
  }, [editProperty, isOpen]);

  const resetPropForm = () => {
    setPropWizardStep(1);
    setPropRawText('');
    setPropName('');
    setPropPrice('');
    setPropRentPrice('');
    setPropAdminFee('');
    setPropRepublishToVecyStore(true);
    setPropVisibilityScope('public_and_agent');
    setPropSourcePortal(null);
    setPropSourceUrl(null);
    setPropRawImportPayload(null);
    setPropAreaConstruida('');
    setPropAreaPrivada('');
    setPropYearBuilt('');
    setPropBedrooms('');
    setPropBathrooms('');
    setPropSubtype('');
    setPropPdfFile(null);
    setPropPdfFileName('');
    setPropPdfBase64('');
    setPropPdfUrl('');
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
    setPropDepartment('Bogotá D.C.');
    setPropCity('Bogotá, D.C.');
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

  const goToWizardStep = (step: 1 | 2) => {
    setPropWizardStep(step);
    requestAnimationFrame(() => {
      if (step === 1) step1HeadingRef.current?.focus();
      else step2HeadingRef.current?.focus();
    });
  };

  // Guardar Inmueble (Oferta)
  const handleSaveProperty = () => {
    if (!propName.trim()) {
      toast.error('Por favor escribe un título o nombre para el inmueble');
      goToWizardStep(1);
      return;
    }
    const cleanPrice = cleanCOP(propPrice);
    const cleanRentPrice = cleanCOP(propRentPrice);
    const effectivePrice = cleanPrice && cleanPrice !== '0' ? cleanPrice : cleanRentPrice;
    if (!effectivePrice || effectivePrice === '0') {
      toast.error('Por favor indica un precio válido para el inmueble');
      goToWizardStep(1);
      return;
    }
    if (propSourceUrl && propImages.length === 0) {
      toast.error('Para publicaciones importadas por URL debes subir al menos 1 foto propia en el Paso 2.');
      goToWizardStep(2);
      return;
    }

    const finalCity = (propCity || 'Bogotá, D.C.').trim();
    const finalLocality = (propZone || '').trim() || null;
    const finalZone = (propNeighborhood || propZone || finalCity).trim();
    const finalNeighborhood = (propNeighborhood || propZone || '').trim() || null;
    const dbPropertyType = mapExactTypeToDbEnum(propTypeExact, propSubtype);

    const propertyPayload = {
      name: propName.trim(),
      description: (propDescription || propRawText || '').trim().slice(0, 500),
      propertyType: dbPropertyType as any,
      transactionType: (propTxType === 'permuta' ? 'venta_permuta' : propTxType) as any,
      price: effectivePrice,
      rentPrice: cleanRentPrice && cleanRentPrice !== '0' ? cleanRentPrice : null,
      republishToVecyStore: propRepublishToVecyStore,
      visibilityScope: propVisibilityScope,
      sourcePortal: propSourcePortal,
      sourceUrl: propSourceUrl,
      rawImportPayload: propRawImportPayload,
      city: finalCity,
      addressCity: finalCity,
      addressLocality: finalLocality,
      zone: finalZone,
      addressNeighborhood: finalNeighborhood,
      location: propAddress ? propAddress.trim() : null,
      latitude: propCoordinates.lat ? String(propCoordinates.lat) : null,
      longitude: propCoordinates.lng ? String(propCoordinates.lng) : null,
      coordinates: propCoordinates,
      bedrooms: propBedrooms !== '' ? Number(propBedrooms) : null,
      bathrooms: propBathrooms !== '' ? Number(propBathrooms) : null,
      garages: propGarajesCarro !== '' ? Number(propGarajesCarro) : null,
      stratum: propStratum !== null ? Number(propStratum) : 4,
      areaTotal: propAreaConstruida ? propAreaConstruida.trim() : null,
      areaPrivate: propAreaPrivada ? propAreaPrivada.trim() : null,
      yearBuilt: propYearBuilt !== '' ? Number(propYearBuilt) : null,
      adminFee: propAdminFee ? cleanCOP(propAdminFee) : null,
      isAmoblado: selectedInternas.includes('Amoblado'),
      images: propImages,
      videoUrl: propVideoUrl ? propVideoUrl.trim() : null,
      externalUrl: propPdfUrl ? propPdfUrl.trim() : null,
      rawText: propRawText || null,
      amenities: {
        departamento: propDepartment || null,
        tipoExacto: propTypeExact,
        subtipo: propSubtype || null,
        subtipoComercial: propIsSubtipoComercial,
        fichaTecnicaPdfUrl: propPdfUrl || null,
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
  // ESTADOS PESTAÑA 2: DEMANDA (REQUERIMIENTO NACIONAL COMPLETO)
  // ═══════════════════════════════════════════════════════════════
  const [reqRawText, setReqRawText] = useState('');
  const [reqFlyerPreview, setReqFlyerPreview] = useState<string | null>(null);
  const [reqName, setReqName] = useState('');
  const [reqTypeExact, setReqTypeExact] = useState<string>('Apartamento');
  const [reqSubtype, setReqSubtype] = useState<string>('');
  const [reqType, setReqType] = useState<string>('apartment');
  const [reqTxType, setReqTxType] = useState<string>('arriendo');
  const [reqDepartment, setReqDepartment] = useState('');
  const [reqCity, setReqCity] = useState('');
  const [reqLocality, setReqLocality] = useState('');
  const [reqNeighborhood, setReqNeighborhood] = useState('');
  const [reqVereda, setReqVereda] = useState('');
  const [reqPresupuestoMax, setReqPresupuestoMax] = useState('');
  const [reqPresupuestoMin, setReqPresupuestoMin] = useState('');
  const [reqAreaUnit, setReqAreaUnit] = useState<'m2' | 'fanegadas' | 'hectareas'>('m2');
  const [reqAreaMin, setReqAreaMin] = useState('');
  const [reqAreaMax, setReqAreaMax] = useState('');
  const [reqBedroomsMin, setReqBedroomsMin] = useState<number | ''>('');
  const [reqBathroomsMin, setReqBathroomsMin] = useState<number | ''>('');
  const [reqGaragesMin, setReqGaragesMin] = useState<number | ''>('');
  const [reqGarageType, setReqGarageType] = useState<string>('Indiferente');
  const [reqAdminFeeMax, setReqAdminFeeMax] = useState('');
  const [reqStratum, setReqStratum] = useState<number | ''>('');
  const [reqAmoblado, setReqAmoblado] = useState(false);
  const [reqDeposito, setReqDeposito] = useState<string>('Indiferente');
  const [reqCocina, setReqCocina] = useState<string>('Indiferente');
  const [reqBalconTerraza, setReqBalconTerraza] = useState<string>('Indiferente');
  const [reqPisoAscensor, setReqPisoAscensor] = useState<string>('Indiferente');
  const [reqFormaPago, setReqFormaPago] = useState<string>('Indiferente');
  // Campos especializados (Lotes, Fincas, Oficinas, Consultorios, Bodegas, Locales)
  const [reqUsoSuelo, setReqUsoSuelo] = useState<string>('Indiferente');
  const [reqTopografia, setReqTopografia] = useState<string>('Indiferente');
  const [reqServiciosLicencia, setReqServiciosLicencia] = useState<string>('Indiferente');
  const [reqHabilitacionSalud, setReqHabilitacionSalud] = useState<boolean>(false);
  const [reqSalaJuntasRecepcion, setReqSalaJuntasRecepcion] = useState<boolean>(false);
  const [reqAlturaCargaTrifasica, setReqAlturaCargaTrifasica] = useState<string>('');
  const [reqOtrasEspecificaciones, setReqOtrasEspecificaciones] = useState('');
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
    if (extracted.tipoInmuebleDeseado || extracted.tipoExacto) {
      const dbT = extracted.tipoInmuebleDeseado || mapExactTypeToDbEnum(extracted.tipoExacto || 'Apartamento');
      setReqType(dbT);
      const exactT = extracted.tipoExacto || mapDbEnumToExactType(dbT, extracted.rawText || extracted.name);
      setReqTypeExact(exactT);
      if (dbT === 'consultorio' || /consultorio/i.test(extracted.rawText || extracted.name || '')) {
        setReqSubtype('Consultorio Médico / Salud');
      } else {
        setReqSubtype('');
      }
    }
    if (extracted.tipoNegocioDeseado) setReqTxType(extracted.tipoNegocioDeseado);
    if (extracted.ciudadDeseada) {
      setReqCity(extracted.ciudadDeseada);
      const dep = extracted.departamento || findDepartmentForCity(extracted.ciudadDeseada);
      if (dep) setReqDepartment(dep);
    } else if (extracted.departamento) {
      setReqDepartment(extracted.departamento);
    }
    if (extracted.addressLocality) setReqLocality(extracted.addressLocality);
    if (extracted.addressNeighborhood) setReqNeighborhood(extracted.addressNeighborhood);
    else if (extracted.zonaDeseada) setReqNeighborhood(extracted.zonaDeseada);
    if (extracted.vereda) setReqVereda(extracted.vereda);
    if (extracted.presupuestoMax) setReqPresupuestoMax(formatCOP(extracted.presupuestoMax));
    if (extracted.presupuestoMin) setReqPresupuestoMin(formatCOP(extracted.presupuestoMin));
    if (extracted.areaMin) {
      setReqAreaUnit('m2');
      setReqAreaMin(String(extracted.areaMin));
    }
    if (extracted.habitacionesMin !== undefined && extracted.habitacionesMin !== null) setReqBedroomsMin(Number(extracted.habitacionesMin));
    if (extracted.banosMin !== undefined && extracted.banosMin !== null) setReqBathroomsMin(Number(extracted.banosMin));
    if (extracted.parqueaderosMin !== undefined && extracted.parqueaderosMin !== null) setReqGaragesMin(Number(extracted.parqueaderosMin));
    if (extracted.adminFeeMax) setReqAdminFeeMax(formatCOP(extracted.adminFeeMax));
    if (extracted.estratoDeseado && Array.isArray(extracted.estratoDeseado) && extracted.estratoDeseado.length > 0) {
      setReqStratum(extracted.estratoDeseado[0]);
    }
    if (extracted.amobladoDeseado !== undefined && extracted.amobladoDeseado !== null) setReqAmoblado(Boolean(extracted.amobladoDeseado));
    if (extracted.otrasEspecificaciones) setReqOtrasEspecificaciones(String(extracted.otrasEspecificaciones));
    if (extracted.nombreUsuarioWhatsapp) setReqContactName(extracted.nombreUsuarioWhatsapp);
    if (extracted.idUsuarioWhatsapp) setReqContactPhone(extracted.idUsuarioWhatsapp);
    if (extracted.rawText && !reqRawText) setReqRawText(extracted.rawText);
  };

  const resetReqForm = () => {
    setReqRawText('');
    setReqFlyerPreview(null);
    setReqName('');
    setReqTypeExact('Apartamento');
    setReqSubtype('');
    setReqType('apartment');
    setReqTxType('arriendo');
    setReqDepartment('');
    setReqCity('');
    setReqLocality('');
    setReqNeighborhood('');
    setReqVereda('');
    setReqPresupuestoMax('');
    setReqPresupuestoMin('');
    setReqAreaUnit('m2');
    setReqAreaMin('');
    setReqAreaMax('');
    setReqBedroomsMin('');
    setReqBathroomsMin('');
    setReqGaragesMin('');
    setReqGarageType('Indiferente');
    setReqAdminFeeMax('');
    setReqStratum('');
    setReqAmoblado(false);
    setReqDeposito('Indiferente');
    setReqCocina('Indiferente');
    setReqBalconTerraza('Indiferente');
    setReqPisoAscensor('Indiferente');
    setReqFormaPago('Indiferente');
    setReqUsoSuelo('Indiferente');
    setReqTopografia('Indiferente');
    setReqServiciosLicencia('Indiferente');
    setReqHabilitacionSalud(false);
    setReqSalaJuntasRecepcion(false);
    setReqAlturaCargaTrifasica('');
    setReqOtrasEspecificaciones('');
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
    if (!reqName.trim() || !cleanPresupuesto) {
      toast.error('Por favor completa el título de la demanda y el presupuesto máximo');
      return;
    }
    if (!reqCity.trim()) {
      toast.error('Por favor selecciona o escribe la ciudad o municipio de búsqueda');
      return;
    }
    if (!reqNeighborhood.trim() && !reqVereda.trim() && !reqLocality.trim()) {
      toast.error('Por favor indica al menos el barrio, vereda o localidad/comuna de interés');
      return;
    }

    const catGroup = getPropertyCategoryGroup(reqType);
    const parsedAreaNum = parseFloat(reqAreaMin.replace(',', '.'));
    let areaMinM2: string | null = null;
    if (!isNaN(parsedAreaNum) && parsedAreaNum > 0) {
      const factor = reqAreaUnit === 'hectareas' ? 10000 : reqAreaUnit === 'fanegadas' ? 6400 : 1;
      areaMinM2 = String(Math.round(parsedAreaNum * factor));
    }

    const extraNotesList: string[] = [];
    if (reqTypeExact && !['Apartamento', 'Casa', 'Bodega', 'Edificio', 'Finca', 'Hotel', 'Local', 'Oficina'].includes(reqTypeExact)) {
      extraNotesList.push(`Tipo exacto: ${reqTypeExact}`);
    }
    if (reqSubtype.trim()) {
      extraNotesList.push(`Subtipo: ${reqSubtype.trim()}`);
    }
    if (reqGarageType !== 'Indiferente' && catGroup !== 'land') extraNotesList.push(`Garaje: ${reqGarageType}`);
    if (reqDeposito !== 'Indiferente' && catGroup === 'residential') extraNotesList.push(`Depósito: ${reqDeposito}`);
    if (reqCocina !== 'Indiferente' && catGroup === 'residential') extraNotesList.push(`Cocina ${reqCocina}`);
    if (reqBalconTerraza !== 'Indiferente' && catGroup === 'residential') extraNotesList.push(reqBalconTerraza);
    if (reqPisoAscensor !== 'Indiferente' && (catGroup === 'residential' || catGroup === 'office_consultorio')) extraNotesList.push(reqPisoAscensor);
    if (reqFormaPago !== 'Indiferente') extraNotesList.push(`Forma de pago: ${reqFormaPago}`);
    if (catGroup === 'land' || catGroup === 'rural_farm') {
      if (reqUsoSuelo !== 'Indiferente') extraNotesList.push(`Uso de suelo: ${reqUsoSuelo}`);
      if (reqTopografia !== 'Indiferente') extraNotesList.push(`Topografía: ${reqTopografia}`);
      if (reqServiciosLicencia !== 'Indiferente') extraNotesList.push(`Servicios/Licencia: ${reqServiciosLicencia}`);
    }
    if (catGroup === 'office_consultorio') {
      if (reqHabilitacionSalud) extraNotesList.push('Requiere habilitación Secretaría de Salud');
      if (reqSalaJuntasRecepcion) extraNotesList.push('Requiere recepción / sala de juntas');
    }
    if (catGroup === 'commercial_warehouse' && reqAlturaCargaTrifasica.trim()) {
      extraNotesList.push(`Especificación técnica: ${reqAlturaCargaTrifasica.trim()}`);
    }
    if (reqOtrasEspecificaciones.trim()) {
      extraNotesList.push(reqOtrasEspecificaciones.trim());
    }

    const consolidatedSpecs = extraNotesList.join(' | ') || null;
    const barrioO_Vereda = reqNeighborhood.trim() || reqVereda.trim() || null;

    createReqMutation.mutate({
      name: reqName.trim(),
      tipoInmuebleDeseado: reqType as any,
      tipoNegocioDeseado: reqTxType as any,
      departamento: reqDepartment.trim() || findDepartmentForCity(reqCity) || null,
      ciudadDeseada: reqCity.trim(),
      addressCity: reqCity.trim(),
      addressLocality: reqLocality.trim() || null,
      addressNeighborhood: barrioO_Vereda,
      zonaDeseada: barrioO_Vereda || reqLocality.trim() || null,
      vereda: reqVereda.trim() || null,
      presupuestoMax: cleanPresupuesto,
      presupuestoMin: reqPresupuestoMin ? cleanCOP(reqPresupuestoMin) : null,
      areaMin: areaMinM2,
      habitacionesMin: catGroup === 'land' ? null : (reqBedroomsMin !== '' ? Number(reqBedroomsMin) : null),
      banosMin: catGroup === 'land' ? null : (reqBathroomsMin !== '' ? Number(reqBathroomsMin) : null),
      parqueaderosMin: catGroup === 'land' ? null : (reqGaragesMin !== '' ? Number(reqGaragesMin) : null),
      adminFeeMax: reqAdminFeeMax ? cleanCOP(reqAdminFeeMax) : null,
      estratoDeseado: reqStratum !== '' ? [Number(reqStratum)] : null,
      amobladoDeseado: catGroup === 'land' ? false : reqAmoblado,
      otrasEspecificaciones: consolidatedSpecs,
      caracteristicasDeseadas: {
        tipoExacto: reqTypeExact,
        subtipo: reqSubtype.trim() || null,
        departamento: reqDepartment.trim() || findDepartmentForCity(reqCity) || null,
        vereda: reqVereda.trim() || null,
        unidadAreaOriginal: reqAreaUnit,
        areaMax: reqAreaMax || null,
        tipoGaraje: reqGarageType !== 'Indiferente' ? reqGarageType : null,
        depositos: reqDeposito !== 'Indiferente' ? reqDeposito : null,
        cocina: reqCocina !== 'Indiferente' ? reqCocina : null,
        balconTerraza: reqBalconTerraza !== 'Indiferente' ? reqBalconTerraza : null,
        pisoAscensor: reqPisoAscensor !== 'Indiferente' ? reqPisoAscensor : null,
        formaPago: reqFormaPago !== 'Indiferente' ? reqFormaPago : null,
        usoSuelo: reqUsoSuelo !== 'Indiferente' ? reqUsoSuelo : null,
        topografia: reqTopografia !== 'Indiferente' ? reqTopografia : null,
        serviciosLicencia: reqServiciosLicencia !== 'Indiferente' ? reqServiciosLicencia : null,
        habilitacionSalud: reqHabilitacionSalud || undefined,
        salaJuntasRecepcion: reqSalaJuntasRecepcion || undefined,
        especificacionIndustrial: reqAlturaCargaTrifasica.trim() || null,
        otrasEspecificaciones: consolidatedSpecs,
      },
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

              {/* NAVEGADOR DE 2 PASOS (PASO 1: DATOS / URL -> PASO 2: FOTOS Y VIDEO PROPIOS + VECY TIENDA) */}
              <nav aria-label="Pasos de publicación del inmueble" className="grid grid-cols-2 gap-2.5 p-2 rounded-2xl bg-black/60 border border-white/10">
                <button
                  type="button"
                  aria-current={propWizardStep === 1 ? 'step' : undefined}
                  onClick={() => goToWizardStep(1)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    propWizardStep === 1
                      ? 'bg-gradient-to-r from-[#bf953f]/25 to-[#aa771c]/15 border border-[#bf953f]/60 text-white shadow'
                      : 'bg-white/[0.02] hover:bg-white/[0.05] border border-transparent text-zinc-400'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${propWizardStep === 1 ? 'bg-[#bf953f] text-black' : 'bg-white/10 text-zinc-300'}`}>1</span>
                  <div className="min-w-0">
                    <span className="text-xs font-black block truncate">Paso 1 · Datos e Importación URL</span>
                    <span className="text-[10px] text-zinc-400 block truncate">Enlace externo, texto o ficha editable</span>
                  </div>
                </button>

                <button
                  type="button"
                  aria-current={propWizardStep === 2 ? 'step' : undefined}
                  onClick={() => goToWizardStep(2)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    propWizardStep === 2
                      ? 'bg-gradient-to-r from-[#bf953f]/25 to-[#aa771c]/15 border border-[#bf953f]/60 text-white shadow'
                      : 'bg-white/[0.02] hover:bg-white/[0.05] border border-transparent text-zinc-400'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${propWizardStep === 2 ? 'bg-[#bf953f] text-black' : 'bg-white/10 text-zinc-300'}`}>2</span>
                  <div className="min-w-0">
                    <span className="text-xs font-black block truncate">Paso 2 · Fotos/Video Propios ({propImages.length})</span>
                    <span className="text-[10px] text-zinc-400 block truncate">Medios propios + VECY TIENDA</span>
                  </div>
                </button>
              </nav>

              <div className={propWizardStep === 1 ? 'space-y-6' : 'hidden'} hidden={propWizardStep !== 1}>
                <h3 ref={step1HeadingRef} tabIndex={-1} className="sr-only">
                  Paso 1: Datos del inmueble e importación por URL
                </h3>

              {/* ASISTENTE JANIA WORKSPACE: URL, TEXTO & FICHA TÉCNICA PDF */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-black/60 to-amber-500/5 border border-[#bf953f]/40 space-y-4 shadow-[0_4px_25px_rgba(191,149,63,0.15)]">
                {/* Header con pestañas y status */}
                <div className="flex items-center justify-between flex-wrap gap-2.5 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#bf953f] to-[#aa771c] p-0.5 flex items-center justify-center shadow-md shadow-amber-500/20">
                      <Sparkles className="w-4 h-4 text-black animate-pulse" />
                    </div>
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-[#fcf6ba] block">
                        Asistente JanIA: Importación por URL & Estructuración IA
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        Importa desde un enlace (9 portales), pega descripción o adjunta Ficha Técnica PDF
                      </span>
                    </div>
                  </div>

                  {/* Switcher de Pestaña: URL vs Texto vs PDF */}
                  <div className="flex flex-wrap items-center p-1 bg-black/80 rounded-xl border border-white/10 gap-1">
                    <button
                      type="button"
                      onClick={() => setJaniaAssistantTab('url')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        janiaAssistantTab === 'url'
                          ? 'bg-[#bf953f] text-black shadow font-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Importar por URL</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setJaniaAssistantTab('text')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        janiaAssistantTab === 'text'
                          ? 'bg-[#bf953f] text-black shadow font-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Texto Libre / WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setJaniaAssistantTab('pdf')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        janiaAssistantTab === 'pdf'
                          ? 'bg-[#bf953f] text-black shadow font-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <FileUp className="w-3.5 h-3.5" />
                      <span>Ficha Técnica PDF</span>
                      {propPdfFile && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      )}
                    </button>
                  </div>
                </div>

                {/* CONTENIDO TAB 0: IMPORTAR POR URL */}
                {janiaAssistantTab === 'url' && (
                  <UrlImportStep
                    onImportSuccess={(res) => {
                      if (res?.data) {
                        applyPropData(res.data);
                      }
                    }}
                    onFallbackToText={() => {
                      setJaniaAssistantTab('text');
                      requestAnimationFrame(() => propRawTextareaRef.current?.focus());
                    }}
                    onAdvanceToMediaStep={() => goToWizardStep(2)}
                  />
                )}

                {/* CONTENIDO TAB 1: TEXTO LIBRE */}
                {janiaAssistantTab === 'text' && (
                  <div className="space-y-2.5 animate-fade-in">
                    {/* Barra de herramientas de texto */}
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handlePasteFromClipboard}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-amber-200 border border-white/10 hover:border-amber-400/40 inline-flex items-center gap-1 transition-colors cursor-pointer text-[11px] font-semibold"
                          title="Pegar directamente desde tu portapapeles"
                        >
                          {isCopiedClipboard ? <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Clipboard className="w-3.5 h-3.5 text-[#bf953f]" />}
                          <span>Pegar de Portapapeles</span>
                        </button>
                        {propRawText && (
                          <button
                            type="button"
                            onClick={() => setPropRawText('')}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-red-500/10 text-zinc-400 hover:text-rose-300 border border-white/5 hover:border-rose-500/20 inline-flex items-center gap-1 transition-colors cursor-pointer text-[11px]"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Limpiar</span>
                          </button>
                        )}
                      </div>

                      <div className="text-[10px] text-zinc-500 font-mono">
                        {propRawText.split('\n').filter(Boolean).length} líneas · {propRawText.length} caracteres
                      </div>
                    </div>

                    {/* Textarea amplio y expansible */}
                    <textarea
                      ref={propRawTextareaRef}
                      rows={6}
                      value={propRawText}
                      onChange={(e) => setPropRawText(e.target.value)}
                      placeholder="Pega aquí la descripción completa del inmueble, ficha técnica, mensaje de WhatsApp o notas comerciales.&#10;&#10;Ejemplo:&#10;Casa Comercial en Morato, Suba, Bogotá. Precio $1.600.000.000 negociables. Área construida 430 m², área privada 387 m², antigüedad 35 años. 5 habitaciones/oficinas, 6 baños, 5 garajes, 1 depósito, estudio y bodega. Estrato 4. POT 555 con tratamiento de renovación urbana hasta 7 pisos..."
                      className="w-full bg-black/70 border border-white/15 focus:border-[#bf953f] rounded-xl p-3.5 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none resize-y min-h-[160px] max-h-[420px] font-sans leading-relaxed shadow-inner"
                    />
                  </div>
                )}

                {/* CONTENIDO TAB 2: SUBIR PDF */}
                {janiaAssistantTab === 'pdf' && (
                  <div className="space-y-3 animate-fade-in">
                    {!propPdfFile ? (
                      <label
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingPdf(true); }}
                        onDragLeave={() => setIsDraggingPdf(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingPdf(false);
                          const f = e.dataTransfer.files?.[0];
                          if (f) handlePdfUpload(f);
                        }}
                        className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                          isDraggingPdf
                            ? 'border-[#bf953f] bg-[#bf953f]/10 scale-[1.01]'
                            : 'border-white/15 hover:border-[#bf953f]/60 bg-black/40 hover:bg-black/60'
                        }`}
                      >
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handlePdfUpload(f);
                          }}
                        />
                        <div className="w-12 h-12 rounded-2xl bg-[#bf953f]/10 border border-[#bf953f]/30 flex items-center justify-center text-[#bf953f] mb-3 shadow-lg">
                          <FileText className="w-6 h-6" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-white block mb-1">
                          Arrastra tu Ficha Técnica o Brochure en PDF aquí
                        </span>
                        <span className="text-[11px] text-zinc-400 block mb-2">
                          o haz clic para explorar tu equipo (hasta 25 MB)
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-[10px] font-semibold border border-amber-500/20">
                          <Sparkles className="w-3 h-3 text-[#bf953f]" />
                          JanIA Vision extraerá tablas, POT 555, áreas, habitaciones, baños y precios
                        </span>
                      </label>
                    ) : (
                      <div className="p-4 rounded-xl bg-black/80 border border-[#bf953f]/40 flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white block truncate max-w-[240px] sm:max-w-md">
                                {propPdfFileName}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                                PDF
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-400">
                              {(propPdfFile.size / 1024 / 1024).toFixed(2)} MB · {propPdfUrl ? 'Adjuntado y guardado en servidor' : 'Listo para procesar'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {propPdfUrl && (
                            <a
                              href={propPdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 border border-white/10 hover:border-amber-400/40 inline-flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ver PDF</span>
                            </a>
                          )}
                          <label className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 inline-flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer">
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handlePdfUpload(f);
                              }}
                            />
                            <span>Cambiar</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setPropPdfFile(null);
                              setPropPdfFileName('');
                              setPropPdfBase64('');
                              setPropPdfUrl(null);
                            }}
                            className="p-1.5 rounded-lg bg-red-500/10 text-rose-400 hover:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer"
                            title="Remover PDF"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer de acción de estructurar (solo para Texto y PDF) */}
                {janiaAssistantTab !== 'url' && (
                <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-amber-300/80 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#bf953f]" />
                      Motor Híbrido: Autollenado local 0ms + Red Neuronal Multimodal Gemini
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={(!propRawText.trim() && !propPdfBase64) || parsePropMutation.isPending}
                    onClick={handleStructureProperty}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#bf953f] via-[#d4af37] to-[#aa771c] hover:brightness-110 text-black font-black text-xs inline-flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#bf953f]/30 disabled:opacity-50 active:scale-98"
                  >
                    {parsePropMutation.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-black" />
                        <span>JanIA analizando {isParsingPdf ? 'documento PDF y tablas' : 'texto'}...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-black" />
                        <span>Estructurar con JanIA</span>
                      </>
                    )}
                  </button>
                </div>
                )}
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
                      onChange={(e) => {
                        const newType = e.target.value;
                        setPropTypeExact(newType);
                        if (PROPERTY_SUBTYPES[newType]?.length) {
                          setPropSubtype(PROPERTY_SUBTYPES[newType][0]);
                        } else {
                          setPropSubtype('');
                        }
                      }}
                      className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                    >
                      {PROPERTY_TYPES_EXACT.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* Subtipo de Inmueble (Edificio, Hotel, Casa Comercial, Finca, etc.) */}
                  {(PROPERTY_SUBTYPES[propTypeExact] || propIsSubtipoComercial) && (
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-300 block mb-1 flex items-center justify-between">
                        <span>Subtipo Especializado</span>
                        <span className="text-[9px] text-[#bf953f] font-black uppercase tracking-wider">Doctrinal</span>
                      </label>
                      <select
                        value={propSubtype}
                        onChange={(e) => setPropSubtype(e.target.value)}
                        className="w-full bg-black/60 border border-[#bf953f]/40 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-amber-200 outline-none font-bold"
                      >
                        <option value="">Seleccionar Subtipo...</option>
                        {(PROPERTY_SUBTYPES[propTypeExact] || PROPERTY_SUBTYPES['Casa'] || []).map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Switch Subtipo Comercial */}
                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-black/40 border border-white/10 cursor-pointer hover:border-white/20 transition-colors">
                      <input
                        type="checkbox"
                        checked={propIsSubtipoComercial}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setPropIsSubtipoComercial(checked);
                          if (checked && !propSubtype) {
                            setPropSubtype('Casa Comercial / Oficinas / Sede');
                          }
                        }}
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
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                      {propTxType === 'arriendo' ? 'Canon Mensual (COP) *' : 'Precio Venta / Principal (COP) *'}
                    </label>
                    <input
                      type="text"
                      value={propPrice}
                      onChange={(e) => setPropPrice(formatCOP(e.target.value))}
                      placeholder={propTxType === 'arriendo' ? '$ 4.500.000' : '$ 1.500.000.000'}
                      className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold outline-none"
                    />
                  </div>

                  {/* Canon de Arriendo opcional para Venta o Arriendo */}
                  {propTxType === 'venta_o_arriendo' && (
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Canon de Arriendo (COP)</label>
                      <input
                        type="text"
                        value={propRentPrice}
                        onChange={(e) => setPropRentPrice(formatCOP(e.target.value))}
                        placeholder="$ 6.500.000"
                        className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold outline-none"
                      />
                    </div>
                  )}

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

                  {/* Habitaciones / Oficinas */}
                  <div>
                    <NumericField
                      label="Habitaciones / Oficinas"
                      sublabel={propIsSubtipoComercial ? "Oficinas" : undefined}
                      value={propBedrooms}
                      onChange={setPropBedrooms}
                    />
                  </div>

                  {/* Baños */}
                  <div>
                    <NumericField
                      label="Baños"
                      sublabel="Baterías / Privados"
                      value={propBathrooms}
                      onChange={setPropBathrooms}
                    />
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

                  {/* Garajes Carro */}
                  <div>
                    <NumericField
                      label="Garajes para Carro"
                      sublabel="Cubiertos / descubiertos"
                      value={propGarajesCarro}
                      onChange={setPropGarajesCarro}
                    />
                  </div>

                  {/* Garajes Moto */}
                  <div>
                    <NumericField
                      label="Garajes para Moto"
                      sublabel="Motos"
                      value={propGarajesMoto}
                      onChange={setPropGarajesMoto}
                    />
                  </div>

                  {/* Estar de TV */}
                  <div>
                    <NumericField
                      label="Estar de TV / Sala de Espera"
                      value={propEstarTv}
                      onChange={setPropEstarTv}
                    />
                  </div>

                  {/* Estudios */}
                  <div>
                    <NumericField
                      label="Estudios / Sala de Juntas"
                      value={propEstudios}
                      onChange={setPropEstudios}
                    />
                  </div>

                  {/* Depósitos / Bodegas */}
                  <div>
                    <NumericField
                      label="Depósitos / Bodegas"
                      value={propDepositos}
                      onChange={setPropDepositos}
                    />
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
                      <div className="pt-1 animate-fade-in">
                        <NumericField
                          label="Cavas de Vinos"
                          value={propCavaVinosCant}
                          onChange={(val) => setPropCavaVinosCant(val === '' ? 1 : Number(val))}
                          min={1}
                        />
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 animate-fade-in items-end">
                        <NumericField
                          label="Número de Chimeneas"
                          value={propChimeneaCant}
                          onChange={(val) => setPropChimeneaCant(val === '' ? 1 : Number(val))}
                          min={1}
                        />
                        <div>
                          <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Tipo de Chimenea</label>
                          <select
                            value={propChimeneaTipo}
                            onChange={(e) => setPropChimeneaTipo(e.target.value)}
                            className="w-full bg-black/60 border border-white/10 rounded-lg px-2 py-2 text-xs text-white outline-none"
                          >
                            <option value="Convencional a leña">Convencional a leña</option>
                            <option value="Gas">Chimenea de gas</option>
                            <option value="Bioetanol">Chimenea de bioetanol</option>
                          </select>
                        </div>
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
                    Sección 3: Balcones, Terrazas, Piso & Geolocalización Nacional
                  </h3>
                  <span className="text-[10px] text-zinc-400">Cobertura Nacional Colombia + OpenStreetMap ($0)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {/* Balcones */}
                  <div>
                    <NumericField
                      label="Balcones"
                      value={propBalcones}
                      onChange={setPropBalcones}
                      min={0}
                    />
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
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5 animate-fade-in items-end">
                        <div>
                          <NumericField
                            label="Cuántas Terrazas"
                            value={propTerrazasCant}
                            onChange={(val) => setPropTerrazasCant(val === '' ? 1 : Number(val))}
                            min={1}
                          />
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
                      Dirección o Sector del Inmueble (Colombia)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={propAddress}
                        onChange={(e) => setPropAddress(e.target.value)}
                        placeholder="Ej: Calle 45 # 19-20, Av. El Poblado, Cra 7 # 116..."
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

                  {/* Departamento */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Departamento *</label>
                    <select
                      value={propDepartment}
                      onChange={(e) => {
                        const dept = e.target.value;
                        setPropDepartment(dept);
                        const match = COLOMBIA_DEPARTMENTS.find(d => d.departamento === dept);
                        if (match && match.municipios.length > 0 && !match.municipios.includes(propCity)) {
                          setPropCity(match.municipios[0]);
                          setPropZone('');
                        }
                      }}
                      className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      {COLOMBIA_DEPARTMENTS.map((d) => (
                        <option key={d.departamento} value={d.departamento} className="bg-zinc-900 text-white">
                          {d.departamento}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Ciudad / Municipio */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Ciudad / Municipio *</label>
                    <input
                      type="text"
                      list="offer-cities-list"
                      value={propCity}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPropCity(val);
                        const detectedDept = findDepartmentForCity(val);
                        if (detectedDept) setPropDepartment(detectedDept);
                      }}
                      placeholder="Ej: Bogotá, D.C., Medellín, Cali, Chía..."
                      className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white font-bold outline-none"
                    />
                    <datalist id="offer-cities-list">
                      {(COLOMBIA_DEPARTMENTS.find(d => d.departamento === propDepartment)?.municipios || []).map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </div>

                  {/* Localidad / Comuna / Corregimiento */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Localidad / Comuna / Corregimiento</label>
                    <input
                      type="text"
                      list="offer-localities-list"
                      value={propZone}
                      onChange={(e) => setPropZone(e.target.value)}
                      placeholder="Ej: Kennedy, Suba, El Poblado, Comuna 17..."
                      className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                    <datalist id="offer-localities-list">
                      {getSuggestedLocalitiesForCity(propCity).map((loc) => (
                        <option key={loc} value={loc} />
                      ))}
                    </datalist>
                  </div>

                  {/* Barrio / Vereda */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Barrio / Vereda *</label>
                    <input
                      type="text"
                      value={propNeighborhood}
                      onChange={(e) => setPropNeighborhood(e.target.value)}
                      placeholder="Ej: Castilla, Teusaquillo, El Poblado, Vereda..."
                      className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white font-bold outline-none"
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

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] text-zinc-400">
                    {propSourcePortal ? `Datos prellenados desde ${propSourcePortal}. Verifica y continúa al Paso 2.` : 'Siguiente: sube las fotos y el video propio del inmueble.'}
                  </span>
                  <button
                    type="button"
                    onClick={() => goToWizardStep(2)}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#bf953f] via-[#d4af37] to-[#aa771c] hover:brightness-110 text-black font-black text-xs inline-flex items-center gap-2 shadow-lg shadow-[#bf953f]/30 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Continuar al Paso 2: Subir Fotos y Video Propios</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ──────────────────────────────────────────────────────────── */}
              {/* PASO 2: MEDIOS PROPIOS (FOTOS Y VIDEO) + VECY TIENDA         */}
              {/* ──────────────────────────────────────────────────────────── */}
              <div className={propWizardStep === 2 ? 'space-y-6' : 'hidden'} hidden={propWizardStep !== 2}>
                <h3 ref={step2HeadingRef} tabIndex={-1} className="sr-only">
                  Paso 2: Carga de fotos y video propios y republicación en VECY TIENDA
                </h3>

                <div className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
                  propSourceUrl && propImages.length === 0
                    ? 'bg-amber-950/35 border-amber-500/50 text-amber-200'
                    : 'bg-emerald-950/25 border-emerald-500/35 text-emerald-200'
                }`}>
                  <Camera className="w-5 h-5 shrink-0 mt-0.5 text-[#bf953f]" />
                  <div className="space-y-1">
                    <p className="font-black uppercase tracking-wider text-white">
                      Paso 2 · Sube tus fotos y video propios
                    </p>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      {propSourceUrl
                        ? `Importaste datos desde ${propSourcePortal || 'un enlace externo'}. Para proteger los derechos de autor, no copiamos fotografías ni videos externos: sube al menos 1 foto propia para publicar.`
                        : 'Las publicaciones con fotos propias reales y video reciben prioridad máxima en VECY TIENDA y aumentan los cierres en tu portal marca blanca.'}
                    </p>
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

              {/* OPCIÓN DE REPUBLICACIÓN EN VECY TIENDA + ALCANCE */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-[#bf953f]/30 space-y-3">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#fcf6ba]">
                  <Store className="w-4 h-4 text-[#bf953f]" />
                  <span>Visibilidad y Republicación en VECY TIENDA</span>
                </div>

                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-black/50 border border-white/10 hover:border-[#bf953f]/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={propRepublishToVecyStore}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setPropRepublishToVecyStore(checked);
                      setPropVisibilityScope(checked ? 'public_and_agent' : 'agent_only');
                    }}
                    className="w-4 h-4 mt-0.5 accent-[#bf953f]"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-white block">
                      Republicar automáticamente en VECY TIENDA (/ofertas) y Mesa de Matches &gt;= 85%
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Recomendado: tu inmueble aparece en tu portal marca blanca y también en la vitrina colaborativa 40/20/40 de VECY TIENDA. Si lo desmarcas, solo será visible en tu sitio personal.
                    </span>
                  </div>
                </label>
              </div>

              {/* BOTÓN FINAL PUBLICAR INMUEBLE */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => goToWizardStep(1)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver al Paso 1 (Datos)</span>
                </button>

                <div className="flex items-center gap-3">
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
                      placeholder="Ej: Busco lote comercial de 2.500 m² o 1 hectárea en Rionegro / El Poblado / Kennedy / Suba, o consultorio médico habilitado en Cali, presupuesto hasta $1.200M..."
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

              {/* CAMPOS ESTRUCTURADOS DEL REQUERIMIENTO NACIONAL */}
              {(() => {
                const reqCatGroup = getPropertyCategoryGroup(reqType);
                const isLandReq = reqCatGroup === 'land';
                const isOfficeConsultorioReq = reqCatGroup === 'office_consultorio';
                const isCommercialWarehouseReq = reqCatGroup === 'commercial_warehouse';
                const isRuralReq = reqCatGroup === 'rural_farm';
                const isResidentialOrBuildingReq = reqCatGroup === 'residential' || reqCatGroup === 'building_hotel';
                const showBedrooms = isResidentialOrBuildingReq || isRuralReq;
                const showBathrooms = !isLandReq;
                const showGarages = !isLandReq;
                const showStratum = isResidentialOrBuildingReq || isOfficeConsultorioReq;
                const reqDeptCities = COLOMBIA_DEPARTMENTS.find(d => d.departamento === reqDepartment)?.municipios || [];
                const reqSuggestedLocalities = getSuggestedLocalitiesForCity(reqCity);

                return (
                  <div className="space-y-4">
                    {/* Sub-bloque 1: Datos Base, Negocio y Presupuesto */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#fcf6ba] flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#bf953f]" />
                        1. Datos Base del Requerimiento & Presupuesto
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Título de la Demanda *</label>
                          <input
                            type="text"
                            value={reqName}
                            onChange={(e) => setReqName(e.target.value)}
                            placeholder="Ej: Busco Consultorio 60m² en El Poblado / Lote 1 Ha en Chía / Apto 3 Habs en Castilla"
                            className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white font-bold outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Tipo de Inmueble Deseado *</label>
                          <select
                            value={reqTypeExact}
                            onChange={(e) => {
                              const exactVal = e.target.value;
                              setReqTypeExact(exactVal);
                              setReqSubtype('');
                              setReqType(mapExactTypeToDbEnum(exactVal));
                            }}
                            className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none font-semibold"
                          >
                            {PROPERTY_TYPES_EXACT.map((t) => (
                              <option key={t} value={t} className="bg-zinc-900 text-white">
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>

                        {PROPERTY_SUBTYPES[reqTypeExact] && (
                          <div>
                            <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Subtipo / Uso Especializado</label>
                            <select
                              value={reqSubtype}
                              onChange={(e) => {
                                const sub = e.target.value;
                                setReqSubtype(sub);
                                setReqType(mapExactTypeToDbEnum(reqTypeExact, sub));
                              }}
                              className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                            >
                              <option value="" className="bg-zinc-900">Cualquiera / General</option>
                              {PROPERTY_SUBTYPES[reqTypeExact].map((sub) => (
                                <option key={sub} value={sub} className="bg-zinc-900 text-white">
                                  {sub}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Tipo de Negocio *</label>
                          <select
                            value={reqTxType}
                            onChange={(e) => setReqTxType(e.target.value)}
                            className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                          >
                            <option value="arriendo" className="bg-zinc-900">Arriendo</option>
                            <option value="venta" className="bg-zinc-900">Compra (Venta)</option>
                            <option value="venta_o_arriendo" className="bg-zinc-900">Venta o Arriendo</option>
                            <option value="arriendo_con_opcion_de_compra" className="bg-zinc-900">Arriendo con Opción de Compra</option>
                            <option value="permuta" className="bg-zinc-900">Permuta</option>
                            <option value="venta_permuta" className="bg-zinc-900">Venta / Permuta</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Presupuesto Máximo (COP) *</label>
                          <input
                            type="text"
                            value={reqPresupuestoMax}
                            onChange={(e) => setReqPresupuestoMax(formatCOP(e.target.value))}
                            placeholder="$ 450.000.000"
                            className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Presupuesto Mínimo (COP)</label>
                          <input
                            type="text"
                            value={reqPresupuestoMin}
                            onChange={(e) => setReqPresupuestoMin(formatCOP(e.target.value))}
                            placeholder="$ 250.000.000"
                            className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Forma de Pago / Financiación</label>
                          <select
                            value={reqFormaPago}
                            onChange={(e) => setReqFormaPago(e.target.value)}
                            className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                          >
                            <option value="Indiferente" className="bg-zinc-900">Indiferente / Por definir</option>
                            <option value="Recursos propios / Contado" className="bg-zinc-900">Recursos propios / Contado</option>
                            <option value="Crédito aprobado" className="bg-zinc-900">Crédito hipotecario / comercial aprobado</option>
                            <option value="Leasing habitacional / inmobiliario" className="bg-zinc-900">Leasing habitacional / inmobiliario</option>
                            <option value="Permuta + Efectivo" className="bg-zinc-900">Permuta + Efectivo</option>
                            <option value="Canon mensual / Póliza" className="bg-zinc-900">Arriendo con póliza / codeudor</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Sub-bloque 2: Ubicación Geográfica Nacional */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#fcf6ba] flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[#bf953f]" />
                          2. Ubicación Geográfica Nacional (Toda Colombia)
                        </h3>
                        <span className="text-[10px] text-zinc-400">32 Departamentos + 20 Localidades Bogotá</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Departamento *</label>
                          <select
                            value={reqDepartment}
                            onChange={(e) => {
                              const dept = e.target.value;
                              setReqDepartment(dept);
                              const match = COLOMBIA_DEPARTMENTS.find(d => d.departamento === dept);
                              if (match && match.municipios.length > 0 && !match.municipios.includes(reqCity)) {
                                setReqCity(match.municipios[0]);
                                setReqLocality('');
                              }
                            }}
                            className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                          >
                            <option value="" className="bg-zinc-900">Seleccionar departamento...</option>
                            {COLOMBIA_DEPARTMENTS.map((d) => (
                              <option key={d.departamento} value={d.departamento} className="bg-zinc-900 text-white">
                                {d.departamento}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Ciudad / Municipio *</label>
                          <input
                            type="text"
                            list="req-cities-list"
                            value={reqCity}
                            onChange={(e) => {
                              const val = e.target.value;
                              setReqCity(val);
                              const detectedDept = findDepartmentForCity(val);
                              if (detectedDept) setReqDepartment(detectedDept);
                            }}
                            placeholder="Ej: Medellín, Cali, Bogotá, D.C., Bucaramanga, Rionegro..."
                            className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white font-bold outline-none"
                          />
                          <datalist id="req-cities-list">
                            {reqDeptCities.map((m) => (
                              <option key={m} value={m} />
                            ))}
                          </datalist>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Localidad / Comuna / Zona</label>
                          <input
                            type="text"
                            list="req-localities-list"
                            value={reqLocality}
                            onChange={(e) => setReqLocality(e.target.value)}
                            placeholder="Ej: Kennedy, Bosa, El Poblado, Comuna 17, Centro..."
                            className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                          />
                          <datalist id="req-localities-list">
                            {reqSuggestedLocalities.map((loc) => (
                              <option key={loc} value={loc} />
                            ))}
                          </datalist>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Barrio(s) / Sectores Aledaños Aceptados</label>
                          <input
                            type="text"
                            value={reqNeighborhood}
                            onChange={(e) => setReqNeighborhood(e.target.value)}
                            placeholder="Ej: Castilla, Teusaquillo, Restrepo, Laureles, Pance, Cabecera..."
                            className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Vereda / Corregimiento (Rural / Lotes)</label>
                          <input
                            type="text"
                            value={reqVereda}
                            onChange={(e) => setReqVereda(e.target.value)}
                            placeholder="Ej: Vereda Yerbabuena, Llanogrande, Dapa..."
                            className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sub-bloque 3: Especificaciones Técnicas Adaptativas según Tipo de Inmueble */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#fcf6ba] flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-[#bf953f]" />
                          3. Especificaciones Técnicas del Inmueble
                        </h3>
                        <span className="text-[10px] text-amber-300/90 font-semibold">
                          {isLandReq
                            ? 'Campos para Lote / Terreno'
                            : isOfficeConsultorioReq
                              ? 'Campos para Oficina / Consultorio'
                              : isCommercialWarehouseReq
                                ? 'Campos para Local / Bodega'
                                : isRuralReq
                                  ? 'Campos para Finca / Campestre'
                                  : 'Campos Residencial / Edificio'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {/* Área Mínima + Unidad + Área Máxima */}
                        <div>
                          <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                            Área Mínima ({reqAreaUnit === 'm2' ? 'm²' : reqAreaUnit === 'fanegadas' ? 'Fanegadas' : 'Hectáreas'})
                          </label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={reqAreaMin}
                              onChange={(e) => setReqAreaMin(e.target.value)}
                              placeholder={reqAreaUnit === 'm2' ? 'Ej: 120' : 'Ej: 2.5'}
                              className="flex-1 bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                            />
                            <select
                              value={reqAreaUnit}
                              onChange={(e) => setReqAreaUnit(e.target.value as 'm2' | 'fanegadas' | 'hectareas')}
                              className="bg-black/80 border border-white/10 focus:border-[#bf953f] rounded-xl px-2 py-2 text-[11px] text-amber-300 font-bold outline-none"
                            >
                              <option value="m2">m²</option>
                              <option value="fanegadas">Faneg.</option>
                              <option value="hectareas">Ha</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Área Máxima (Opcional)</label>
                          <input
                            type="text"
                            value={reqAreaMax}
                            onChange={(e) => setReqAreaMax(e.target.value)}
                            placeholder={reqAreaUnit === 'm2' ? 'Ej: 5000' : 'Ej: 10'}
                            className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                          />
                        </div>

                        {showBedrooms && (
                          <div>
                            <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Habitaciones Exactas (1=1)</label>
                            <input
                              type="number"
                              min={0}
                              value={reqBedroomsMin}
                              onChange={(e) => setReqBedroomsMin(e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="Ej: 3"
                              className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                            />
                          </div>
                        )}

                        {showBathrooms && (
                          <div>
                            <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Baños Mínimos</label>
                            <input
                              type="number"
                              min={0}
                              value={reqBathroomsMin}
                              onChange={(e) => setReqBathroomsMin(e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="Ej: 2"
                              className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                            />
                          </div>
                        )}

                        {showGarages && (
                          <>
                            <div>
                              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Parqueaderos Mínimos</label>
                              <input
                                type="number"
                                min={0}
                                value={reqGaragesMin}
                                onChange={(e) => setReqGaragesMin(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="Ej: 1"
                                className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Tipo de Parqueadero</label>
                              <select
                                value={reqGarageType}
                                onChange={(e) => setReqGarageType(e.target.value)}
                                className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                              >
                                <option value="Indiferente" className="bg-zinc-900">Indiferente</option>
                                <option value="Independientes" className="bg-zinc-900">Exige Independientes</option>
                                <option value="Lineales" className="bg-zinc-900">Acepta Lineales / En tándem</option>
                              </select>
                            </div>
                          </>
                        )}

                        {!isLandReq && !isRuralReq && (
                          <div>
                            <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Administración Máxima (COP)</label>
                            <input
                              type="text"
                              value={reqAdminFeeMax}
                              onChange={(e) => setReqAdminFeeMax(formatCOP(e.target.value))}
                              placeholder="$ 600.000"
                              className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                            />
                          </div>
                        )}

                        {showStratum && (
                          <div>
                            <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Estrato de Preferencia</label>
                            <select
                              value={reqStratum}
                              onChange={(e) => setReqStratum(e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                            >
                              <option value="" className="bg-zinc-900">Cualquier estrato</option>
                              <option value="1" className="bg-zinc-900">Estrato 1</option>
                              <option value="2" className="bg-zinc-900">Estrato 2</option>
                              <option value="3" className="bg-zinc-900">Estrato 3</option>
                              <option value="4" className="bg-zinc-900">Estrato 4</option>
                              <option value="5" className="bg-zinc-900">Estrato 5</option>
                              <option value="6" className="bg-zinc-900">Estrato 6</option>
                            </select>
                          </div>
                        )}

                        {(isLandReq || isRuralReq) && (
                          <>
                            <div>
                              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Uso de Suelo / POT</label>
                              <select
                                value={reqUsoSuelo}
                                onChange={(e) => setReqUsoSuelo(e.target.value)}
                                className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                              >
                                <option value="Indiferente" className="bg-zinc-900">Indiferente / Mixto</option>
                                <option value="Residencial" className="bg-zinc-900">Residencial / Vivienda</option>
                                <option value="Comercial / Dotacional" className="bg-zinc-900">Comercial / Dotacional</option>
                                <option value="Industrial / Logístico" className="bg-zinc-900">Industrial / Logístico</option>
                                <option value="Rural / Agropecuario / Campestre" className="bg-zinc-900">Rural / Agropecuario / Campestre</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Servicios Públicos / Licencia</label>
                              <input
                                type="text"
                                value={reqServiciosLicencia === 'Indiferente' ? '' : reqServiciosLicencia}
                                onChange={(e) => setReqServiciosLicencia(e.target.value || 'Indiferente')}
                                placeholder="Ej: Agua, luz, pozo, licencia construcción..."
                                className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                              />
                            </div>
                          </>
                        )}

                        {isLandReq && (
                          <div>
                            <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Topografía / Índice</label>
                            <select
                              value={reqTopografia}
                              onChange={(e) => setReqTopografia(e.target.value)}
                              className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                            >
                              <option value="Indiferente" className="bg-zinc-900">Indiferente</option>
                              <option value="Plano 100%" className="bg-zinc-900">Plano 100%</option>
                              <option value="Semi-ondulado / Mixto" className="bg-zinc-900">Semi-ondulado / Mixto</option>
                              <option value="Esquinero / Sobre vía principal" className="bg-zinc-900">Esquinero / Sobre vía principal</option>
                            </select>
                          </div>
                        )}

                        {isCommercialWarehouseReq && (
                          <div className="sm:col-span-2">
                            <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Altura Libre, Muelle de Carga, Vitrina o Trifásica</label>
                            <input
                              type="text"
                              value={reqAlturaCargaTrifasica}
                              onChange={(e) => setReqAlturaCargaTrifasica(e.target.value)}
                              placeholder="Ej: Altura min 8m, energía trifásica 45 kVA, muelle tractomula, vitrina sobre vía..."
                              className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                            />
                          </div>
                        )}

                        {(isResidentialOrBuildingReq || isOfficeConsultorioReq) && (
                          <>
                            <div>
                              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Piso / Ascensor</label>
                              <select
                                value={reqPisoAscensor}
                                onChange={(e) => setReqPisoAscensor(e.target.value)}
                                className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                              >
                                <option value="Indiferente" className="bg-zinc-900">Indiferente</option>
                                <option value="Piso bajo (1-3)" className="bg-zinc-900">Piso bajo (1-3) / Sin ascensor</option>
                                <option value="Piso alto con ascensor" className="bg-zinc-900">Piso alto con ascensor</option>
                                <option value="Ascensor obligatorio" className="bg-zinc-900">Ascensor obligatorio</option>
                                <option value="Exterior con buena luz" className="bg-zinc-900">Exterior con buena iluminación</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Depósito / Archivo</label>
                              <select
                                value={reqDeposito}
                                onChange={(e) => setReqDeposito(e.target.value)}
                                className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                              >
                                <option value="Indiferente" className="bg-zinc-900">Indiferente</option>
                                <option value="Con depósito" className="bg-zinc-900">Requiere depósito</option>
                                <option value="No requiere" className="bg-zinc-900">No requiere</option>
                              </select>
                            </div>
                          </>
                        )}

                        {isResidentialOrBuildingReq && (
                          <>
                            <div>
                              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Tipo de Cocina</label>
                              <select
                                value={reqCocina}
                                onChange={(e) => setReqCocina(e.target.value)}
                                className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                              >
                                <option value="Indiferente" className="bg-zinc-900">Indiferente</option>
                                <option value="Abierta / Americana" className="bg-zinc-900">Abierta / Americana</option>
                                <option value="Cerrada" className="bg-zinc-900">Cerrada</option>
                                <option value="Remodelada / Integral" className="bg-zinc-900">Remodelada / Integral</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Balcón / Terraza</label>
                              <select
                                value={reqBalconTerraza}
                                onChange={(e) => setReqBalconTerraza(e.target.value)}
                                className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                              >
                                <option value="Indiferente" className="bg-zinc-900">Indiferente</option>
                                <option value="Balcón" className="bg-zinc-900">Requiere Balcón</option>
                                <option value="Terraza" className="bg-zinc-900">Requiere Terraza</option>
                                <option value="Balcón o Terraza" className="bg-zinc-900">Balcón o Terraza</option>
                              </select>
                            </div>
                          </>
                        )}

                        {isOfficeConsultorioReq && (
                          <div className="sm:col-span-2 flex flex-wrap items-center gap-4 pt-3">
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-200">
                              <input
                                type="checkbox"
                                checked={reqHabilitacionSalud}
                                onChange={(e) => setReqHabilitacionSalud(e.target.checked)}
                                className="w-4 h-4 rounded accent-[#bf953f]"
                              />
                              <span>Habilitación Secretaría de Salud / Lavamanos</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-200">
                              <input
                                type="checkbox"
                                checked={reqSalaJuntasRecepcion}
                                onChange={(e) => setReqSalaJuntasRecepcion(e.target.checked)}
                                className="w-4 h-4 rounded accent-[#bf953f]"
                              />
                              <span>Recepción / Sala de Juntas</span>
                            </label>
                          </div>
                        )}

                        {!isLandReq && (
                          <div className="flex items-center pt-3">
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                              <input
                                type="checkbox"
                                checked={reqAmoblado}
                                onChange={(e) => setReqAmoblado(e.target.checked)}
                                className="w-4 h-4 rounded text-primary accent-[#bf953f]"
                              />
                              <span>¿Requiere Amoblado?</span>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sub-bloque 4: Otras Especificaciones y Contacto */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#fcf6ba] flex items-center gap-2">
                        <ClipboardCheck className="w-4 h-4 text-[#bf953f]" />
                        4. Otras Especificaciones del Cliente & Datos de Contacto
                      </h3>

                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                            Otras Especificaciones / Requisitos Especiales del Cliente
                          </label>
                          <textarea
                            rows={3}
                            value={reqOtrasEspecificaciones}
                            onChange={(e) => setReqOtrasEspecificaciones(e.target.value)}
                            placeholder="Ej: Acepta mascotas, vista a parque, cerca a estación de Metro/TransMilenio, portería 24h, edificio sin restricciones Airbnb, frente mínimo de 15m para lote, canon incluye administración..."
                            className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl p-3 text-xs text-white placeholder:text-zinc-500 outline-none resize-y font-sans"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Nombre del Cliente / Colega *</label>
                            <input
                              type="text"
                              value={reqContactName}
                              onChange={(e) => setReqContactName(e.target.value)}
                              placeholder="Ej: Dra. María Fernanda Gómez"
                              className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Teléfono WhatsApp Contacto</label>
                            <input
                              type="text"
                              value={reqContactPhone}
                              onChange={(e) => setReqContactPhone(e.target.value)}
                              placeholder="Ej: 573101234567"
                              className="w-full bg-black/60 border border-white/10 focus:border-[#bf953f] rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

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
