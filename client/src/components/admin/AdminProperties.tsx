import { useState } from 'react';
import { Plus, Edit2, Trash2, Eye, X, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartamento' },
  { value: 'house', label: 'Casa' },
  { value: 'building', label: 'Edificio' },
  { value: 'warehouse', label: 'Bodega' },
  { value: 'farm', label: 'Finca / Hacienda' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'office', label: 'Oficina' },
  { value: 'land', label: 'Lote / Terreno' },
  { value: 'commercial', label: 'Local Comercial' },
  { value: 'loft', label: 'Loft' },
];

const emptyForm = {
  name: '',
  price: '',
  location: '',
  zone: '',
  propertyType: 'apartment',
  description: '',
  bedrooms: '',
  bathrooms: '',
  garages: '',
  stratum: '',
  floor: '',
  areaSquareMeters: '',
  yearBuilt: '',
  adminFee: '',
  matriculaInmobiliaria: '',
  wildcardFeature: '',
  featured: false,
  available: true,
};

export default function AdminProperties() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [searchTerm, setSearchTerm] = useState('');

  // Real data from DB
  const { data: properties, isLoading, refetch } = trpc.properties.myList.useQuery();

  const createMutation = trpc.properties.create.useMutation({
    onSuccess: () => {
      toast.success('✅ Propiedad creada exitosamente');
      refetch();
      setShowForm(false);
      setFormData({ ...emptyForm });
    },
    onError: (err) => toast.error('Error: ' + err.message),
  });

  const updateMutation = trpc.properties.update.useMutation({
    onSuccess: () => {
      toast.success('✅ Propiedad actualizada');
      refetch();
      setShowForm(false);
      setEditingId(null);
      setFormData({ ...emptyForm });
    },
    onError: (err) => toast.error('Error: ' + err.message),
  });

  const deleteMutation = trpc.properties.delete.useMutation({
    onSuccess: () => {
      toast.success('Propiedad eliminada');
      refetch();
    },
    onError: (err) => toast.error('Error: ' + err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      price: formData.price,
      location: formData.location,
      zone: formData.zone,
      propertyType: formData.propertyType as any,
      description: formData.description || undefined,
      bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
      bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
      garages: formData.garages ? parseInt(formData.garages) : null,
      stratum: formData.stratum ? parseInt(formData.stratum) : null,
      floor: formData.floor ? parseInt(formData.floor) : null,
      areaSquareMeters: formData.areaSquareMeters || null,
      yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt) : null,
      adminFee: formData.adminFee || null,
      matriculaInmobiliaria: formData.matriculaInmobiliaria || null,
      wildcardFeature: formData.wildcardFeature || null,
      featured: formData.featured,
      available: formData.available,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const startEdit = (prop: any) => {
    setEditingId(prop.id);
    setFormData({
      name: prop.name || '',
      price: prop.price || '',
      location: prop.location || '',
      zone: prop.zone || '',
      propertyType: prop.propertyType || 'apartment',
      description: prop.description || '',
      bedrooms: prop.bedrooms?.toString() || '',
      bathrooms: prop.bathrooms?.toString() || '',
      garages: prop.garages?.toString() || '',
      stratum: prop.stratum?.toString() || '',
      floor: prop.floor?.toString() || '',
      areaSquareMeters: prop.areaSquareMeters?.toString() || '',
      yearBuilt: prop.yearBuilt?.toString() || '',
      adminFee: prop.adminFee?.toString() || '',
      matriculaInmobiliaria: prop.matriculaInmobiliaria || '',
      wildcardFeature: prop.wildcardFeature || '',
      featured: prop.featured || false,
      available: prop.available ?? true,
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ ...emptyForm });
  };

  const filtered = (properties || []).filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inputClass = "bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-amber-500/20";
  const labelClass = "block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestión de Inmuebles</h2>
          <p className="text-zinc-500 text-sm mt-1">
            {isLoading ? 'Cargando...' : `${properties?.length || 0} propiedades en tu portafolio`}
          </p>
        </div>
        <Button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ ...emptyForm }); }}
          className="bg-amber-500 hover:bg-amber-400 text-black font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
        >
          <Plus className="w-4 h-4" />
          Crear Inmueble
        </Button>
      </div>

      {/* Search */}
      {!showForm && (
        <Input
          placeholder="Buscar por nombre o ubicación..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={inputClass}
        />
      )}

      {/* ===== FORM ===== */}
      {showForm && (
        <div className="bg-zinc-950 border border-amber-500/20 rounded-2xl p-8 shadow-[0_0_40px_rgba(245,158,11,0.05)]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-amber-400">
              {editingId ? '✏️ Editar Inmueble' : '🏢 Nuevo Inmueble'}
            </h3>
            <button onClick={cancelForm} className="text-zinc-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sección 1: Identificación */}
            <div>
              <p className="text-xs font-bold text-amber-500/70 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-4 h-px bg-amber-500/30" /> Datos Básicos
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={labelClass}>Nombre del Inmueble *</label>
                  <Input required placeholder="Ej. Apartamento Cedritos UBIK" value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Tipo de Inmueble *</label>
                  <select
                    required
                    value={formData.propertyType}
                    onChange={e => setFormData({ ...formData, propertyType: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-md px-3 py-2 focus:outline-none focus:border-amber-500/50"
                  >
                    {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Matrícula Inmobiliaria</label>
                  <Input placeholder="Ej. 50N-123456" value={formData.matriculaInmobiliaria}
                    onChange={e => setFormData({ ...formData, matriculaInmobiliaria: e.target.value })} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Sección 2: Precio y Ubicación */}
            <div>
              <p className="text-xs font-bold text-amber-500/70 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-4 h-px bg-amber-500/30" /> Precio y Ubicación
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Precio de Venta/Arriendo * (solo números)</label>
                  <Input required placeholder="Ej. 450000000" value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Administración (mensual)</label>
                  <Input placeholder="Ej. 350000" value={formData.adminFee}
                    onChange={e => setFormData({ ...formData, adminFee: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Dirección / Ciudad *</label>
                  <Input required placeholder="Ej. Bogotá, Usaquén" value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Zona / Barrio *</label>
                  <Input required placeholder="Ej. Cedritos" value={formData.zone}
                    onChange={e => setFormData({ ...formData, zone: e.target.value })} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Sección 3: Características */}
            <div>
              <p className="text-xs font-bold text-amber-500/70 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-4 h-px bg-amber-500/30" /> Características
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className={labelClass}>Habitaciones</label>
                  <Input type="number" min="0" placeholder="3" value={formData.bedrooms}
                    onChange={e => setFormData({ ...formData, bedrooms: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Baños</label>
                  <Input type="number" min="0" placeholder="2" value={formData.bathrooms}
                    onChange={e => setFormData({ ...formData, bathrooms: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Parqueaderos</label>
                  <Input type="number" min="0" placeholder="1" value={formData.garages}
                    onChange={e => setFormData({ ...formData, garages: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Estrato</label>
                  <Input type="number" min="1" max="6" placeholder="4" value={formData.stratum}
                    onChange={e => setFormData({ ...formData, stratum: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Piso</label>
                  <Input type="number" min="1" placeholder="8" value={formData.floor}
                    onChange={e => setFormData({ ...formData, floor: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Área Total (m²)</label>
                  <Input placeholder="54" value={formData.areaSquareMeters}
                    onChange={e => setFormData({ ...formData, areaSquareMeters: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Año Construcción</label>
                  <Input type="number" placeholder="2018" value={formData.yearBuilt}
                    onChange={e => setFormData({ ...formData, yearBuilt: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Característica Especial</label>
                  <Input placeholder="Vista 360°, Jacuzzi..." value={formData.wildcardFeature}
                    onChange={e => setFormData({ ...formData, wildcardFeature: e.target.value })} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Sección 4: Descripción */}
            <div>
              <label className={labelClass}>Descripción del Inmueble</label>
              <textarea
                rows={4}
                placeholder="Describe las características más atractivas del inmueble..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-md px-3 py-2 focus:outline-none focus:border-amber-500/50 placeholder:text-zinc-600 resize-none"
              />
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setFormData({ ...formData, featured: !formData.featured })}
                  className={`w-10 h-6 rounded-full transition-colors ${formData.featured ? 'bg-amber-500' : 'bg-zinc-800'} relative`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.featured ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm text-zinc-400">Destacar en portada</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setFormData({ ...formData, available: !formData.available })}
                  className={`w-10 h-6 rounded-full transition-colors ${formData.available ? 'bg-green-600' : 'bg-zinc-800'} relative`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.available ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm text-zinc-400">Disponible para venta/arriendo</span>
              </label>
            </div>

            {/* Botones */}
            <div className="flex gap-4 pt-2">
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold h-12 text-base shadow-[0_0_20px_rgba(245,158,11,0.2)]"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Guardando...'
                  : editingId ? 'Actualizar Inmueble' : '✅ Publicar Inmueble'}
              </Button>
              <Button type="button" onClick={cancelForm}
                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 h-12 px-8">
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ===== PROPERTIES TABLE ===== */}
      {!showForm && (
        <div className="bg-zinc-950 border border-zinc-800/60 rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="py-20 text-center text-zinc-600">Cargando inmuebles...</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-zinc-500 mb-4">No tienes inmuebles publicados todavía.</p>
              <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-400 text-black font-bold">
                <Plus className="w-4 h-4 mr-2" /> Crear tu primer inmueble
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-zinc-900/60 border-b border-zinc-800">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Inmueble</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Ubicación</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Precio</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Datos</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((prop) => (
                    <tr key={prop.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/40 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-white font-semibold">{prop.name}</p>
                        <p className="text-zinc-600 text-xs capitalize mt-0.5">{prop.propertyType}</p>
                      </td>
                      <td className="px-6 py-4 text-zinc-400 text-sm">{prop.location}</td>
                      <td className="px-6 py-4">
                        <span className="text-amber-400 font-semibold">
                          ${Number(prop.price).toLocaleString('es-CO')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 text-sm">
                        {prop.bedrooms && `${prop.bedrooms} hab`}
                        {prop.bathrooms && ` · ${prop.bathrooms} baños`}
                        {prop.areaSquareMeters && ` · ${prop.areaSquareMeters}m²`}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          prop.available
                            ? 'bg-green-900/30 text-green-400 border border-green-800/40'
                            : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                        }`}>
                          {prop.available ? 'Disponible' : 'No disponible'}
                        </span>
                        {prop.featured && (
                          <span className="ml-2 px-2 py-1 rounded-full text-xs bg-amber-900/30 text-amber-400 border border-amber-800/40">
                            ★ Destacado
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(prop)}
                            className="p-2 hover:bg-amber-500/10 rounded-lg transition text-amber-500/70 hover:text-amber-400"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`¿Eliminar "${prop.name}"? Esta acción no se puede deshacer.`)) {
                                deleteMutation.mutate({ id: prop.id });
                              }
                            }}
                            className="p-2 hover:bg-red-900/20 rounded-lg transition text-red-500/50 hover:text-red-400"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
