import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { trpc } from '@/lib/trpc';
import {
  X, Sparkles, Upload, Image as ImageIcon, Video, FileText, Check,
  AlertTriangle, Plus, RefreshCw, Trash2, Building2, Home, DollarSign,
  MapPin, Bed, Bath, Car, Layers, Eye, CheckCircle2, FileUp, Sparkle
} from 'lucide-react';
import { toast } from 'sonner';

interface UnifiedPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'oferta' | 'demanda';
  onSuccess?: () => void;
}

export default function UnifiedPublishModal({
  isOpen,
  onClose,
  defaultTab = 'oferta',
  onSuccess,
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
  // ESTADOS PESTAÑA 1: OFERTA (INMUEBLE)
  // ═══════════════════════════════════════════════════════════════
  const [propRawText, setPropRawText] = useState('');
  const [propName, setPropName] = useState('');
  const [propDescription, setPropDescription] = useState('');
  const [propType, setPropType] = useState<string>('apartment');
  const [propTxType, setPropTxType] = useState<string>('venta');
  const [propPrice, setPropPrice] = useState('');
  const [propAdminFee, setPropAdminFee] = useState('');
  const [propCity, setPropCity] = useState('Bogotá');
  const [propZone, setPropZone] = useState('');
  const [propNeighborhood, setPropNeighborhood] = useState('');
  const [propBedrooms, setPropBedrooms] = useState<number | ''>('');
  const [propBathrooms, setPropBathrooms] = useState<number | ''>('');
  const [propGarages, setPropGarages] = useState<number | ''>('');
  const [propStratum, setPropStratum] = useState<number | ''>(4);
  const [propArea, setPropArea] = useState('');
  const [propIsAmoblado, setPropIsAmoblado] = useState(false);
  const [propImages, setPropImages] = useState<string[]>([]);
  const [propVideoUrl, setPropVideoUrl] = useState('');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const flyerInputRef = useRef<HTMLInputElement | null>(null);

  // Mutación parseText para Inmuebles
  const parsePropMutation = trpc.properties.parseText.useMutation({
    onSuccess: (data) => {
      if (data) {
        if (data.name) setPropName(data.name);
        if (data.description) setPropDescription(data.description);
        if (data.propertyType) setPropType(data.propertyType);
        if (data.transactionType) setPropTxType(data.transactionType);
        if (data.price) setPropPrice(String(data.price));
        if (data.adminFee) setPropAdminFee(String(data.adminFee));
        if (data.city) setPropCity(data.city);
        if (data.zone) setPropZone(data.zone);
        if (data.addressNeighborhood) setPropNeighborhood(data.addressNeighborhood);
        if (data.bedrooms !== undefined && data.bedrooms !== null) setPropBedrooms(Number(data.bedrooms));
        if (data.bathrooms !== undefined && data.bathrooms !== null) setPropBathrooms(Number(data.bathrooms));
        if (data.garages !== undefined && data.garages !== null) setPropGarages(Number(data.garages));
        if (data.stratum !== undefined && data.stratum !== null) setPropStratum(Number(data.stratum));
        if (data.areaTotal) setPropArea(String(data.areaTotal));
        toast.success('JanIA ha estructurado y llenado los campos del inmueble');
      }
    },
    onError: (err) => {
      toast.error(`Error al estructurar texto: ${err.message}`);
    },
  });

  // Mutación crear Inmueble
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

  const resetPropForm = () => {
    setPropRawText('');
    setPropName('');
    setPropDescription('');
    setPropType('apartment');
    setPropTxType('venta');
    setPropPrice('');
    setPropAdminFee('');
    setPropCity('Bogotá');
    setPropZone('');
    setPropNeighborhood('');
    setPropBedrooms('');
    setPropBathrooms('');
    setPropGarages('');
    setPropStratum(4);
    setPropArea('');
    setPropIsAmoblado(false);
    setPropImages([]);
    setPropVideoUrl('');
  };

  const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingMedia(true);
    const newUploaded: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
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
            newUploaded.push(json.fileUrl);
          }
        }
      } catch (err) {
        console.error('Error subiendo imagen:', err);
      }
    }

    setPropImages((prev) => [...prev, ...newUploaded]);
    setIsUploadingMedia(false);
    toast.success(`${newUploaded.length} imagen(es) subida(s) correctamente`);
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

  const handleSaveProperty = () => {
    if (!propName || !propPrice || !propZone) {
      toast.error('Por favor completa al menos el título, precio y zona/barrio');
      return;
    }

    createPropMutation.mutate({
      name: propName,
      description: propDescription,
      propertyType: propType as any,
      transactionType: propTxType as any,
      price: propPrice,
      city: propCity,
      zone: propZone,
      addressNeighborhood: propNeighborhood || propZone,
      bedrooms: propBedrooms !== '' ? Number(propBedrooms) : null,
      bathrooms: propBathrooms !== '' ? Number(propBathrooms) : null,
      garages: propGarages !== '' ? Number(propGarages) : null,
      stratum: propStratum !== '' ? Number(propStratum) : null,
      areaTotal: propArea || null,
      adminFee: propAdminFee || null,
      isAmoblado: propIsAmoblado,
      images: propImages,
      videoUrl: propVideoUrl || null,
      rawText: propRawText || null,
    });
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

  // Parser Requerimiento Texto
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

  // Parser Requerimiento Flyer / Imagen con JanIA Vision
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

  // Crear Requerimiento
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
    if (extracted.presupuestoMax) setReqPresupuestoMax(String(extracted.presupuestoMax));
    if (extracted.presupuestoMin) setReqPresupuestoMin(String(extracted.presupuestoMin));
    if (extracted.areaMin) setReqAreaMin(String(extracted.areaMin));
    if (extracted.habitacionesMin !== undefined && extracted.habitacionesMin !== null) setReqBedroomsMin(Number(extracted.habitacionesMin));
    if (extracted.banosMin !== undefined && extracted.banosMin !== null) setReqBathroomsMin(Number(extracted.banosMin));
    if (extracted.parqueaderosMin !== undefined && extracted.parqueaderosMin !== null) setReqGaragesMin(Number(extracted.parqueaderosMin));
    if (extracted.adminFeeMax) setReqAdminFeeMax(String(extracted.adminFeeMax));
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
    if (!reqName || !reqPresupuestoMax) {
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
      presupuestoMax: reqPresupuestoMax,
      presupuestoMin: reqPresupuestoMin || null,
      areaMin: reqAreaMin || null,
      habitacionesMin: reqBedroomsMin !== '' ? Number(reqBedroomsMin) : null,
      banosMin: reqBathroomsMin !== '' ? Number(reqBathroomsMin) : null,
      parqueaderosMin: reqGaragesMin !== '' ? Number(reqGaragesMin) : null,
      adminFeeMax: reqAdminFeeMax || null,
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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-gradient-to-b from-[#161618] via-[#0d0d0f] to-[#080809] border border-[#bf953f]/40 shadow-[0_0_50px_rgba(191,149,63,0.25)] overflow-hidden text-foreground">
        
        {/* ENCABEZADO CON SELECTOR DUAL DE PESTAÑA */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/40 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-gradient-to-br from-[#bf953f] to-[#aa771c] text-black font-extrabold text-xs">
                VECY
              </span>
              <h2 className="text-base sm:text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#bf953f] tracking-wide">
                Centro de Publicación Inteligente
              </h2>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Sube inmuebles o demandas asistido por JanIA con extracción de texto y flyers con visión artificial.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Dual Tabs Pill */}
            <div className="flex p-1 rounded-xl bg-white/5 border border-white/10 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('oferta')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'oferta'
                    ? 'bg-gradient-to-r from-[#bf953f] to-[#aa771c] text-black shadow font-extrabold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>Oferta (Inmueble)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('demanda')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'demanda'
                    ? 'bg-gradient-to-r from-[#bf953f] to-[#aa771c] text-black shadow font-extrabold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Demanda (Requerimiento)</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CUERPO CON SCROLL */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin">

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* PESTAÑA 1: SUBIR INMUEBLE (OFERTA)                            */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'oferta' && (
            <div className="space-y-5 animate-fade-in">
              {/* ASISTENTE JANIA: PEGAR TEXTO LIBRE */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-black/40 to-amber-500/5 border border-amber-500/30 space-y-2.5 shadow-inner">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#bf953f] animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#fcf6ba]">
                      Asistente JanIA: Pegar Texto Libre de WhatsApp o Ficha Técnica
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 italic">Opcional pero ultra rápido</span>
                </div>
                <textarea
                  rows={3}
                  value={propRawText}
                  onChange={(e) => setPropRawText(e.target.value)}
                  placeholder="Ej: Vendo hermoso apartamento en Cedritos, piso 5 exterior, 3 habitaciones, 2 baños, parqueadero cubierto, 85 m², estrato 4. Precio $420.000.000, admon $320.000..."
                  className="w-full bg-black/60 border border-white/10 focus:border-amber-400 rounded-xl p-3 text-xs text-white placeholder:text-zinc-500 outline-none resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!propRawText.trim() || parsePropMutation.isPending}
                    onClick={() => parsePropMutation.mutate({ text: propRawText })}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#bf953f] to-[#aa771c] hover:brightness-110 text-black font-extrabold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow disabled:opacity-50"
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

              {/* CAMPOS ESTRUCTURADOS DEL INMUEBLE */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Características Principales del Inmueble
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Título / Nombre del Inmueble *</label>
                    <input
                      type="text"
                      value={propName}
                      onChange={(e) => setPropName(e.target.value)}
                      placeholder="Ej: Apto en Venta Cedritos Piso 5 Exterior"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Tipo de Inmueble *</label>
                    <select
                      value={propType}
                      onChange={(e) => setPropType(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="apartment">Apartamento</option>
                      <option value="house">Casa</option>
                      <option value="office">Oficina</option>
                      <option value="commercial">Local Comercial</option>
                      <option value="warehouse">Bodega</option>
                      <option value="building">Edificio</option>
                      <option value="farm">Finca / Lote Campestre</option>
                      <option value="land">Lote / Terreno</option>
                      <option value="loft">Loft / Studio</option>
                      <option value="consultorio">Consultorio</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Tipo de Negocio *</label>
                    <select
                      value={propTxType}
                      onChange={(e) => setPropTxType(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                    >
                      <option value="venta">Venta</option>
                      <option value="arriendo">Arriendo</option>
                      <option value="venta_o_arriendo">Venta o Arriendo</option>
                      <option value="arriendo_temporal">Arriendo Temporal</option>
                      <option value="arriendo_con_opcion_de_compra">Arriendo con Opción de Compra</option>
                      <option value="venta_permuta">Venta / Permuta</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Precio (COP) *</label>
                    <input
                      type="text"
                      value={propPrice}
                      onChange={(e) => setPropPrice(e.target.value)}
                      placeholder="Ej: 450000000"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white font-mono font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Cuota Administración (COP)</label>
                    <input
                      type="text"
                      value={propAdminFee}
                      onChange={(e) => setPropAdminFee(e.target.value)}
                      placeholder="Ej: 350000"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Ciudad *</label>
                    <input
                      type="text"
                      value={propCity}
                      onChange={(e) => setPropCity(e.target.value)}
                      placeholder="Bogotá"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Zona o Localidad *</label>
                    <input
                      type="text"
                      value={propZone}
                      onChange={(e) => setPropZone(e.target.value)}
                      placeholder="Ej: Usaquén, Chapinero, Suba"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Barrio Específico</label>
                    <input
                      type="text"
                      value={propNeighborhood}
                      onChange={(e) => setPropNeighborhood(e.target.value)}
                      placeholder="Ej: Cedritos, Chico Norte, Rosales"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Área Total (m²)</label>
                    <input
                      type="text"
                      value={propArea}
                      onChange={(e) => setPropArea(e.target.value)}
                      placeholder="Ej: 85"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Habitaciones</label>
                    <input
                      type="number"
                      value={propBedrooms}
                      onChange={(e) => setPropBedrooms(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej: 3"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Baños</label>
                    <input
                      type="number"
                      value={propBathrooms}
                      onChange={(e) => setPropBathrooms(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej: 2"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Parqueaderos</label>
                    <input
                      type="number"
                      value={propGarages}
                      onChange={(e) => setPropGarages(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej: 1"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Estrato</label>
                    <select
                      value={propStratum}
                      onChange={(e) => setPropStratum(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="1">Estrato 1</option>
                      <option value="2">Estrato 2</option>
                      <option value="3">Estrato 3</option>
                      <option value="4">Estrato 4</option>
                      <option value="5">Estrato 5</option>
                      <option value="6">Estrato 6</option>
                      <option value="commercial">Comercial / No residencial</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="isAmoblado"
                      checked={propIsAmoblado}
                      onChange={(e) => setPropIsAmoblado(e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary accent-[#bf953f]"
                    />
                    <label htmlFor="isAmoblado" className="text-xs text-zinc-300 font-semibold cursor-pointer">
                      Inmueble Amoblado
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Descripción Comercial</label>
                  <textarea
                    rows={3}
                    value={propDescription}
                    onChange={(e) => setPropDescription(e.target.value)}
                    placeholder="Detalles sobre amenidades, iluminación, vista, estado de acabados..."
                    className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl p-3 text-xs text-white placeholder:text-zinc-500 outline-none resize-none"
                  />
                </div>
              </div>

              {/* ZONA MULTIMEDIA: FOTOS Y VIDEO */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  Galería Multimedia (Fotos y Video del Inmueble)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Subir Fotos */}
                  <div className="p-4 rounded-xl bg-black/40 border border-dashed border-white/20 hover:border-primary/50 transition-colors text-center space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleUploadImages}
                      className="hidden"
                    />
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Subir Fotos del Inmueble</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">JPG, PNG o WEBP (puedes elegir varias)</p>
                    </div>
                    <button
                      type="button"
                      disabled={isUploadingMedia}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      {isUploadingMedia ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      <span>Seleccionar Fotos</span>
                    </button>
                  </div>

                  {/* Subir o enlazar Video */}
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-zinc-300 font-bold">
                      <Video className="w-4 h-4 text-primary" />
                      <span>Video del Inmueble o Recorrido Virtual</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">Puedes subir un video local o pegar un enlace de YouTube/Drive:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={propVideoUrl}
                        onChange={(e) => setPropVideoUrl(e.target.value)}
                        placeholder="https://youtube.com/watch?v=... o URL de video"
                        className="flex-1 bg-black/60 border border-white/10 focus:border-primary rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
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
                        title="Subir archivo de video local MP4"
                      >
                        Subir MP4
                      </button>
                    </div>
                  </div>
                </div>

                {/* Previsualización de Fotos Subidas */}
                {propImages.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-zinc-300">Fotos cargadas ({propImages.length}):</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {propImages.map((imgUrl, i) => (
                        <div key={i} className="relative group rounded-lg overflow-hidden border border-white/10 aspect-video bg-black/60">
                          <img src={imgUrl} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setPropImages((prev) => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-1 right-1 p-1 rounded-full bg-black/70 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Eliminar foto"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* PESTAÑA 2: SUBIR DEMANDA (REQUERIMIENTO)                      */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'demanda' && (
            <div className="space-y-5 animate-fade-in">
              {/* ASISTENTE JANIA DUAL: PEGAR TEXTO O SUBIR FLYER */}
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
                      className="w-full bg-black/60 border border-white/10 focus:border-amber-400 rounded-xl p-3 text-xs text-white placeholder:text-zinc-500 outline-none resize-none"
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
                      className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-black font-extrabold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow disabled:opacity-50"
                    >
                      {parseReqFlyerMutation.isPending ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                      <span>{parseReqFlyerMutation.isPending ? 'Leyendo Flyer...' : 'Cambiar Flyer'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* BANNER DE AUDITORÍA DE DATOS FALTANTES DETECTADOS */}
              {missingFields.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2 animate-fade-in shadow-inner">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="font-extrabold uppercase tracking-wide text-amber-300">
                      Auditoría JanIA: {missingFields.length} Datos no especificados en el requerimiento
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed">
                    Para que el motor de matching de Vecy (85% - 100%) logre cruzar este requerimiento con las ofertas disponibles con exactitud, te recomendamos completar los siguientes campos en el formulario de abajo:
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {missingFields.map((field, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold inline-flex items-center gap-1"
                      >
                        <span>⚠️</span>
                        <span>{field}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* FORMULARIO ESTRUCTURADO DEL REQUERIMIENTO */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Especificaciones del Requerimiento / Demanda
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Título de la Demanda *</label>
                    <input
                      type="text"
                      value={reqName}
                      onChange={(e) => setReqName(e.target.value)}
                      placeholder="Ej: Busco Apto Arriendo Chicó o Rosales 2 Habs"
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
                      <option value="farm">Finca</option>
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
                      <option value="venta">Venta / Compra</option>
                      <option value="venta_o_arriendo">Venta o Arriendo</option>
                      <option value="arriendo_temporal">Arriendo Temporal</option>
                      <option value="arriendo_con_opcion_de_compra">Arriendo con Opción de Compra</option>
                      <option value="permuta">Permuta</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Presupuesto Máximo (COP) *</label>
                    <input
                      type="text"
                      value={reqPresupuestoMax}
                      onChange={(e) => setReqPresupuestoMax(e.target.value)}
                      placeholder="Ej: 4200000"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white font-mono font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Presupuesto Mínimo (COP)</label>
                    <input
                      type="text"
                      value={reqPresupuestoMin}
                      onChange={(e) => setReqPresupuestoMin(e.target.value)}
                      placeholder="Ej: 3000000"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Ciudad Deseada</label>
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
                      placeholder="Ej: Chapinero Alto, Rosales, Virrey"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Área Mínima (m²)</label>
                    <input
                      type="text"
                      value={reqAreaMin}
                      onChange={(e) => setReqAreaMin(e.target.value)}
                      placeholder="Ej: 70"
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
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Parqueaderos Mínimos</label>
                    <input
                      type="number"
                      value={reqGaragesMin}
                      onChange={(e) => setReqGaragesMin(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej: 1"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Estrato Deseado</label>
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
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Contacto / Nombre Solicitante</label>
                    <input
                      type="text"
                      value={reqContactName}
                      onChange={(e) => setReqContactName(e.target.value)}
                      placeholder="Ej: Carlos Gómez (Agente aliado)"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Celular / WhatsApp Contacto</label>
                    <input
                      type="text"
                      value={reqContactPhone}
                      onChange={(e) => setReqContactPhone(e.target.value)}
                      placeholder="Ej: 3101234567"
                      className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="reqAmoblado"
                      checked={reqAmoblado}
                      onChange={(e) => setReqAmoblado(e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary accent-[#bf953f]"
                    />
                    <label htmlFor="reqAmoblado" className="text-xs text-zinc-300 font-semibold cursor-pointer">
                      Requiere Amoblado
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER CON BOTONES DE ACCIÓN */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-black/60 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-zinc-300 transition-all cursor-pointer"
          >
            Cancelar
          </button>

          {activeTab === 'oferta' ? (
            <button
              type="button"
              onClick={handleSaveProperty}
              disabled={createPropMutation.isPending}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#bf953f] to-[#aa771c] hover:brightness-110 text-black font-extrabold text-xs inline-flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(191,149,63,0.3)] disabled:opacity-50"
            >
              {createPropMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Publicar Inmueble (Oferta)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveRequirement}
              disabled={createReqMutation.isPending}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#bf953f] to-[#aa771c] hover:brightness-110 text-black font-extrabold text-xs inline-flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(191,149,63,0.3)] disabled:opacity-50"
            >
              {createReqMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Publicar Demanda (Requerimiento)</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
