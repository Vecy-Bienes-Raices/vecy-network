import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  DollarSign, 
  FileText, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Upload, 
  ShieldCheck, 
  Sparkles, 
  Layers, 
  Phone, 
  Home, 
  Car, 
  Bath, 
  Bed, 
  Maximize2,
  AlertCircle
} from 'lucide-react';
import { trpc } from '../../lib/trpc';

// Tipos de transacciones completos doctrinales v17.2/v17.7
export type TransactionType = 
  | 'venta'
  | 'arriendo'
  | 'venta_o_arriendo'
  | 'arriendo_temporal'
  | 'arriendo_con_opcion_de_compra'
  | 'permuta'
  | 'venta_permuta'
  | 'aporte';

export type PropertyType = 
  | 'Apartamento'
  | 'Apartaestudio'
  | 'Loft'
  | 'Casa'
  | 'Local Comercial'
  | 'Bodega'
  | 'Oficina'
  | 'Consultorio'
  | 'Lote/Terreno'
  | 'Finca'
  | 'Edificio';

export interface PropertyCaptureFormData {
  // Paso 1: Catastral & Legal
  propertyType: PropertyType;
  transactionType: TransactionType;
  city: string;
  zoneBarrio: string;
  address: string;
  contactPhone: string;
  
  // Paso 2: Física e Infraestructura
  areaTotal: number;
  areaConstruida: number;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  floor: number;
  antiguedadAnos: number;
  hasElevator: boolean;
  isClubHouse: boolean;

  // Paso 3: Económico y Administración
  price: number;
  canon: number;
  administration: number;
  minPriceClose: number;

  // Paso 4: Multimedia y Documentación
  images: string[];
  pdfDocumentUrl: string;
  description: string;
}

interface PropertyCaptureFormProps {
  onSuccess?: (propertyId: string) => void;
  onCancel?: () => void;
}

export const PropertyCaptureForm: React.FC<PropertyCaptureFormProps> = ({
  onSuccess,
  onCancel
}) => {
  // HOOK DE ESTADO PRINCIPAL: Captura Progresiva en 4 Pasos
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // HOOK DE ESTADO DE DATOS DEL FORMULARIO CON VALORES POR DEFECTO RIGUROSOS
  const [formData, setFormData] = useState<PropertyCaptureFormData>({
    // Paso 1
    propertyType: 'Apartamento',
    transactionType: 'venta',
    city: 'Bogotá',
    zoneBarrio: '',
    address: '',
    contactPhone: '',
    
    // Paso 2 (Valores numéricos estrictos sin N/E innecesario)
    areaTotal: 75,
    areaConstruida: 75,
    bedrooms: 2,
    bathrooms: 2,
    parking: 1,
    floor: 4,
    antiguedadAnos: 3,
    hasElevator: true,
    isClubHouse: false,

    // Paso 3
    price: 450000000,
    canon: 0,
    administration: 350000,
    minPriceClose: 430000000,

    // Paso 4
    images: [],
    pdfDocumentUrl: '',
    description: ''
  });

  // Mapping de etiquetas en español a enums de Supabase
  const mapPropertyTypeToEnum = (pType: PropertyType) => {
    const map: Record<PropertyType, string> = {
      'Apartamento': 'apartment',
      'Apartaestudio': 'apartment',
      'Loft': 'loft',
      'Casa': 'house',
      'Local Comercial': 'commercial',
      'Bodega': 'warehouse',
      'Oficina': 'office',
      'Consultorio': 'consultorio',
      'Lote/Terreno': 'land',
      'Finca': 'farm',
      'Edificio': 'building'
    };
    return (map[pType] || 'apartment') as any;
  };

  // Mutación tRPC para guardar inmueble en Supabase
  const createPropertyMutation = trpc.properties.create.useMutation({
    onSuccess: (data) => {
      setIsSubmitting(false);
      if (onSuccess) onSuccess(String(data.id || 'new-prop'));
    },
    onError: (err) => {
      setIsSubmitting(false);
      setValidationError(`Error al registrar inmueble: ${err.message}`);
    }
  });

  // MANEJADOR DE CAMBIOS EN CAMPOS
  const handleChange = (field: keyof PropertyCaptureFormData, value: any) => {
    setValidationError(null);
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // VALIDACIONES POR PASO (FILTROS DUROS)
  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!formData.zoneBarrio.trim()) {
        setValidationError('Por favor ingresa el Barrio o Sector del inmueble.');
        return false;
      }
      if (!formData.contactPhone.trim() || formData.contactPhone.length < 7) {
        setValidationError('Por favor ingresa un número de teléfono / WhatsApp válido (Filtro 0B).');
        return false;
      }
    }

    if (step === 2) {
      if (formData.areaTotal <= 0) {
        setValidationError('El Área Total (m²) debe ser un número mayor a 0.');
        return false;
      }
      if (formData.bedrooms < 0 || formData.bathrooms < 0 || formData.parking < 0) {
        setValidationError('Los valores de Habitaciones, Baños y Parqueaderos deben ser números positivos.');
        return false;
      }
    }

    if (step === 3) {
      if (formData.transactionType === 'arriendo' && formData.canon <= 0) {
        setValidationError('Para transacciones de Arriendo, el Canon mensual debe ser mayor a 0.');
        return false;
      }
      if ((formData.transactionType === 'venta' || formData.transactionType === 'venta_o_arriendo') && formData.price <= 0) {
        setValidationError('Para transacciones de Venta, el Precio debe ser mayor a 0.');
        return false;
      }
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(4, prev + 1));
    }
  };

  const handlePrevStep = () => {
    setValidationError(null);
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    setValidationError(null);

    try {
      // Envío de la captura completa a la API / Supabase
      const targetPrice = formData.transactionType === 'arriendo' ? formData.canon : formData.price;

      await createPropertyMutation.mutateAsync({
        name: `${formData.propertyType} en ${formData.zoneBarrio}`,
        propertyType: mapPropertyTypeToEnum(formData.propertyType),
        transactionType: formData.transactionType as any,
        price: String(targetPrice || 0),
        city: formData.city || 'Bogotá',
        zone: formData.zoneBarrio,
        addressNeighborhood: formData.zoneBarrio,
        idUsuarioWhatsapp: formData.contactPhone,
        areaTotal: String(formData.areaTotal || 0),
        areaPrivate: String(formData.areaConstruida || formData.areaTotal || 0),
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        garages: formData.parking,
        antiguedadAnos: formData.antiguedadAnos,
        adminFee: String(formData.administration || 0),
        externalUrl: formData.pdfDocumentUrl || undefined,
        description: formData.description || undefined,
        images: formData.images
      });
    } catch (err: any) {
      console.error("Error submitting property:", err);
    }
  };

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-zinc-950 border border-[#bf953f]/30 rounded-3xl shadow-2xl overflow-hidden text-zinc-100 font-sans">
      {/* CABECERA CORPORATIVA Y BARRA DE PROGRESO DE 4 PASOS */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 border-b border-white/10 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#bf953f]/10 border border-[#bf953f]/30 flex items-center justify-center text-[#bf953f]">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white tracking-tight">Captura Progresiva Inmobiliaria</h2>
                <span className="text-[10px] font-extrabold text-[#bf953f] bg-[#bf953f]/10 border border-[#bf953f]/20 px-2 py-0.5 rounded-full uppercase">
                  VECY v17.8
                </span>
              </div>
              <p className="text-xs text-zinc-400">Validación estricta de filtros duros para emparejamiento con IA</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 bg-black/40 px-3.5 py-2 rounded-xl border border-white/5 self-start sm:self-auto">
            <span>Paso {currentStep} de 4</span>
            <span className="text-[#22d3ee]">({currentStep === 1 ? 'Legales' : currentStep === 2 ? 'Físicos' : currentStep === 3 ? 'Económicos' : 'Multimedia'})</span>
          </div>
        </div>

        {/* BARRAS DE PROGRESO INTERACTIVAS EN DORADO Y CYAN */}
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((stepNum) => {
            const isActive = currentStep === stepNum;
            const isCompleted = currentStep > stepNum;
            return (
              <div key={stepNum} className="space-y-1">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-gradient-to-r from-[#bf953f] to-[#22d3ee]' 
                      : isActive 
                        ? 'bg-[#bf953f] shadow-[0_0_10px_rgba(191,149,63,0.5)]' 
                        : 'bg-white/10'
                  }`}
                />
                <span className={`text-[10px] font-bold block text-center truncate ${
                  isActive ? 'text-[#bf953f]' : isCompleted ? 'text-[#22d3ee]' : 'text-zinc-500'
                }`}>
                  {stepNum === 1 ? '1. Catastral' : stepNum === 2 ? '2. Física' : stepNum === 3 ? '3. Precio' : '4. Multimedia'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ERRORES DE VALIDACIÓN (CYAN/ROJO) */}
      {validationError && (
        <div className="mx-6 mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-300 text-xs animate-shake">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
          <span>{validationError}</span>
        </div>
      )}

      {/* FORMULARIO Y PASOS DINÁMICOS */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* ─── PASO 1: DATOS CATASTRALES Y LEGALES ──────────────────────────────── */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div className="border-b border-white/10 pb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#bf953f]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Paso 1: Identificación Catastral y Ubicación</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Tipo de Inmueble */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Tipo de Inmueble *</label>
                <select
                  value={formData.propertyType}
                  onChange={(e) => handleChange('propertyType', e.target.value as PropertyType)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:border-[#bf953f] focus:ring-1 focus:ring-[#bf953f] outline-none"
                >
                  <option value="Apartamento">Apartamento</option>
                  <option value="Apartaestudio">Apartaestudio</option>
                  <option value="Loft">Loft</option>
                  <option value="Casa">Casa</option>
                  <option value="Local Comercial">Local Comercial</option>
                  <option value="Bodega">Bodega</option>
                  <option value="Oficina">Oficina</option>
                  <option value="Consultorio">Consultorio</option>
                  <option value="Lote/Terreno">Lote / Terreno</option>
                  <option value="Finca">Finca</option>
                  <option value="Edificio">Edificio</option>
                </select>
              </div>

              {/* Tipo de Negocio */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Tipo de Transacción *</label>
                <select
                  value={formData.transactionType}
                  onChange={(e) => handleChange('transactionType', e.target.value as TransactionType)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:border-[#bf953f] focus:ring-1 focus:ring-[#bf953f] outline-none"
                >
                  <option value="venta">Venta Pura</option>
                  <option value="arriendo">Arriendo Puro</option>
                  <option value="venta_o_arriendo">Venta o Arriendo (Lo que primero ocurra)</option>
                  <option value="arriendo_temporal">Arriendo Temporal / Vacacional</option>
                  <option value="arriendo_con_opcion_de_compra">Arriendo con Opción de Compra</option>
                  <option value="permuta">Permuta Pura</option>
                  <option value="venta_permuta">Venta + Permuta Parte de Pago</option>
                  <option value="aporte">Aporte a Proyecto</option>
                </select>
              </div>

              {/* Ciudad */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Ciudad / Municipio *</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Ej: Bogotá, Medellín, Cali"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:border-[#bf953f] outline-none"
                />
              </div>

              {/* Barrio / Sector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Barrio / Sector Especifico *</label>
                <input
                  type="text"
                  value={formData.zoneBarrio}
                  onChange={(e) => handleChange('zoneBarrio', e.target.value)}
                  placeholder="Ej: Cedritos, Chapinero, Poblado"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:border-[#bf953f] outline-none"
                />
              </div>

              {/* Dirección Completa */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Dirección / Torre / Apto (Privado)</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Ej: Calle 140 # 11-45 Torre 2 Apto 501"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:border-[#bf953f] outline-none"
                />
              </div>

              {/* Teléfono / WhatsApp del Captador (Filtro 0B) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Teléfono WhatsApp de Contacto * (Filtro 0B)</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 text-[#22d3ee] w-4 h-4" />
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => handleChange('contactPhone', e.target.value)}
                    placeholder="Ej: +573192919978"
                    className="w-full bg-zinc-900 border border-[#22d3ee]/30 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-bold text-white focus:border-[#22d3ee] outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── PASO 2: ESTRUCTURA FÍSICA E INFRAESTRUCTURA ─────────────────────── */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-fade-in">
            <div className="border-b border-white/10 pb-3 flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#22d3ee]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Paso 2: Especificaciones Físicas e Infraestructura</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Área Total (m²) - Numérica Estricta */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Área Total (m²) *</label>
                <div className="relative">
                  <Maximize2 className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="number"
                    min="1"
                    value={formData.areaTotal}
                    onChange={(e) => handleChange('areaTotal', Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-white focus:border-[#bf953f] outline-none"
                  />
                </div>
              </div>

              {/* Área Construida (m²) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Área Construida (m²)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.areaConstruida}
                  onChange={(e) => handleChange('areaConstruida', Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:border-[#bf953f] outline-none"
                />
              </div>

              {/* Habitaciones */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Habitaciones *</label>
                <div className="relative">
                  <Bed className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={formData.bedrooms}
                    onChange={(e) => handleChange('bedrooms', Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-white focus:border-[#bf953f] outline-none"
                  />
                </div>
              </div>

              {/* Baños */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Baños *</label>
                <div className="relative">
                  <Bath className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={formData.bathrooms}
                    onChange={(e) => handleChange('bathrooms', Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-white focus:border-[#bf953f] outline-none"
                  />
                </div>
              </div>

              {/* Parqueaderos */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Parqueaderos / Garajes *</label>
                <div className="relative">
                  <Car className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={formData.parking}
                    onChange={(e) => handleChange('parking', Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-white focus:border-[#bf953f] outline-none"
                  />
                </div>
              </div>

              {/* Piso */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Piso Ubicación</label>
                <input
                  type="number"
                  min="0"
                  value={formData.floor}
                  onChange={(e) => handleChange('floor', Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:border-[#bf953f] outline-none"
                />
              </div>

              {/* Antigüedad en Años */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Antigüedad (Años)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.antiguedadAnos}
                  onChange={(e) => handleChange('antiguedadAnos', Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:border-[#bf953f] outline-none"
                />
              </div>

              {/* Toggles de Ascensor & Club House */}
              <div className="sm:col-span-2 grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2.5 bg-zinc-900 border border-white/10 p-3 rounded-xl cursor-pointer hover:border-white/20">
                  <input
                    type="checkbox"
                    checked={formData.hasElevator}
                    onChange={(e) => handleChange('hasElevator', e.target.checked)}
                    className="w-4 h-4 accent-[#bf953f] rounded"
                  />
                  <span className="text-xs font-bold text-white">¿Tiene Ascensor?</span>
                </label>

                <label className="flex items-center gap-2.5 bg-zinc-900 border border-white/10 p-3 rounded-xl cursor-pointer hover:border-white/20">
                  <input
                    type="checkbox"
                    checked={formData.isClubHouse}
                    onChange={(e) => handleChange('isClubHouse', e.target.checked)}
                    className="w-4 h-4 accent-[#22d3ee] rounded"
                  />
                  <span className="text-xs font-bold text-white">¿Club House / Gym?</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ─── PASO 3: ESQUEMA ECONÓMICO Y ADMINISTRACIÓN ─────────────────────── */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-fade-in">
            <div className="border-b border-white/10 pb-3 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#bf953f]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Paso 3: Esquema Económico y Valores de Cierre</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Precio de Venta ($ COP) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Precio de Venta ($ COP)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-zinc-500 text-xs">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1000000"
                    value={formData.price}
                    onChange={(e) => handleChange('price', Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-8 pr-3.5 py-2.5 text-xs font-bold text-white focus:border-[#bf953f] outline-none"
                  />
                </div>
                <p className="text-[10px] text-[#bf953f] font-semibold">{formatCOP(formData.price)}</p>
              </div>

              {/* Canon de Arriendo ($ COP) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Canon de Arriendo Mensual ($ COP)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-zinc-500 text-xs">$</span>
                  <input
                    type="number"
                    min="0"
                    step="100000"
                    value={formData.canon}
                    onChange={(e) => handleChange('canon', Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-8 pr-3.5 py-2.5 text-xs font-bold text-white focus:border-[#bf953f] outline-none"
                  />
                </div>
                <p className="text-[10px] text-[#22d3ee] font-semibold">{formatCOP(formData.canon)}</p>
              </div>

              {/* Valor Administración ($ COP) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Valor Administración ($ COP)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-zinc-500 text-xs">$</span>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={formData.administration}
                    onChange={(e) => handleChange('administration', Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-8 pr-3.5 py-2.5 text-xs font-bold text-white focus:border-[#bf953f] outline-none"
                  />
                </div>
                <p className="text-[10px] text-zinc-400">{formatCOP(formData.administration)}</p>
              </div>

              {/* Precio de Cierre Mínimo Negociable */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Precio Mínimo de Cierre / Piso ($ COP)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-zinc-500 text-xs">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1000000"
                    value={formData.minPriceClose}
                    onChange={(e) => handleChange('minPriceClose', Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-8 pr-3.5 py-2.5 text-xs font-bold text-white focus:border-[#bf953f] outline-none"
                  />
                </div>
                <p className="text-[10px] text-emerald-400">Límite mínimo autorizado por el captador</p>
              </div>
            </div>
          </div>
        )}

        {/* ─── PASO 4: MULTIMEDIA Y CARGA DE PDFS ─────────────────────────────── */}
        {currentStep === 4 && (
          <div className="space-y-5 animate-fade-in">
            <div className="border-b border-white/10 pb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#22d3ee]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Paso 4: Documentación Ficha PDF y Galería</h3>
            </div>

            <div className="space-y-4">
              {/* Enlace o PDF del Inmueble */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">URL Ficha Técnica PDF / Certificado de Tradición</label>
                <div className="relative">
                  <Upload className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                  <input
                    type="url"
                    value={formData.pdfDocumentUrl}
                    onChange={(e) => handleChange('pdfDocumentUrl', e.target.value)}
                    placeholder="https://servidor.com/ficha_inmueble.pdf"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-bold text-white focus:border-[#22d3ee] outline-none"
                  />
                </div>
              </div>

              {/* Descripción Detallada */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Descripción / Observaciones Prediales</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Escribe detalles adicionales: acabados, remodelado, iluminación, estado de escrituras..."
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3.5 text-xs font-medium text-white focus:border-[#bf953f] outline-none resize-none"
                />
              </div>

              {/* Resumen de Confirmación Final */}
              <div className="bg-black/50 border border-[#bf953f]/30 p-4 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center gap-2 text-[#bf953f] font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Resumen para Ingesta en Supabase & Matching IA</span>
                </div>
                <p className="text-zinc-300">
                  Inmueble <strong>{formData.propertyType}</strong> en <strong>{formData.transactionType.toUpperCase()}</strong> localizado en <strong>{formData.zoneBarrio}, {formData.city}</strong>.
                  Área: <strong>{formData.areaTotal} m²</strong> | Habitaciones: <strong>{formData.bedrooms}</strong> | Baños: <strong>{formData.bathrooms}</strong> | Garajes: <strong>{formData.parking}</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* NAVEGACIÓN ENTRE PASOS Y BOTONES DE ACCIÓN */}
        <div className="border-t border-white/10 pt-5 flex items-center justify-between gap-3">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-bold text-zinc-300 flex items-center gap-1.5 transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-all"
            >
              Cancelar
            </button>
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="bg-[#bf953f] hover:bg-[#a37d32] text-zinc-950 font-extrabold text-xs px-6 py-2.5 rounded-xl transition-all shadow-lg flex items-center gap-1.5"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#22d3ee] text-zinc-950 font-black text-xs px-8 py-3 rounded-xl transition-all shadow-xl hover:scale-105 flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>Procesando Ingesta...</>
              ) : (
                <>Registrar Inmueble en Bolsa VECY <Sparkles className="w-4 h-4" /></>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
