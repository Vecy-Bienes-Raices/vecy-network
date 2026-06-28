import { useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
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
  name: '', price: '', location: '', zone: '',
  propertyType: 'apartment', description: '',
  bedrooms: '', bathrooms: '', garages: '', stratum: '',
  floorDetail: '', areaTotal: '', yearBuilt: '',
  adminFee: '', matriculaInmobiliaria: '', wildcardFeature: '',
  featured: false, available: true,
  images: [] as string[],
};

export default function AdminProperties() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    const filesArray = Array.from(e.target.files);
    const newImages = [...formData.images];

    for (const file of filesArray) {
      const data = new FormData();
      data.append('file', file);
      try {
        const response = await fetch('/api/janIA/upload', {
          method: 'POST',
          body: data,
        });
        if (!response.ok) throw new Error('Upload failed');
        const resJson = await response.json();
        if (resJson.fileUrl) {
          newImages.push(resJson.fileUrl);
        }
      } catch (err) {
        toast.error(`Error al subir ${file.name}`);
      }
    }
    setFormData(prev => ({ ...prev, images: newImages }));
    setUploading(false);
  };

  const removeImage = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const { data: properties, isLoading, refetch } = trpc.properties.myList.useQuery();

  const createMutation = trpc.properties.create.useMutation({
    onSuccess: () => { toast.success('✅ Inmueble publicado'); refetch(); cancelForm(); },
    onError: (e) => toast.error('Error: ' + e.message),
  });

  const updateMutation = trpc.properties.update.useMutation({
    onSuccess: () => { toast.success('✅ Inmueble actualizado'); refetch(); cancelForm(); },
    onError: (e) => toast.error('Error: ' + e.message),
  });

  const deleteMutation = trpc.properties.delete.useMutation({
    onSuccess: () => { toast.success('Inmueble eliminado'); refetch(); },
    onError: (e) => toast.error('Error: ' + e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name, price: formData.price,
      location: formData.location, zone: formData.zone,
      propertyType: formData.propertyType as any,
      description: formData.description || undefined,
      bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
      bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
      garages: formData.garages ? parseInt(formData.garages) : null,
      stratum: formData.stratum ? parseInt(formData.stratum) : null,
      floorDetail: formData.floorDetail || null,
      areaTotal: formData.areaTotal || null,
      yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt) : null,
      adminFee: formData.adminFee || null,
      matriculaInmobiliaria: formData.matriculaInmobiliaria || null,
      wildcardFeature: formData.wildcardFeature || null,
      featured: formData.featured, available: formData.available,
      images: formData.images,
    };
    editingId ? updateMutation.mutate({ id: editingId, data: payload }) : createMutation.mutate(payload);
  };

  const startEdit = (prop: any) => {
    setEditingId(prop.id);
    setFormData({
      name: prop.name || '', price: prop.price || '',
      location: prop.location || '', zone: prop.zone || '',
      propertyType: prop.propertyType || 'apartment',
      description: prop.description || '',
      bedrooms: prop.bedrooms?.toString() || '', bathrooms: prop.bathrooms?.toString() || '',
      garages: prop.garages?.toString() || '', stratum: prop.stratum?.toString() || '',
      floorDetail: prop.floorDetail || '', areaTotal: prop.areaTotal?.toString() || '',
      yearBuilt: prop.yearBuilt?.toString() || '', adminFee: prop.adminFee?.toString() || '',
      matriculaInmobiliaria: prop.matriculaInmobiliaria || '',
      wildcardFeature: prop.wildcardFeature || '',
      featured: prop.featured || false, available: prop.available ?? true,
      images: Array.isArray(prop.images) ? (prop.images as string[]) : [],
    });
    setShowForm(true);
  };

  const cancelForm = () => { setShowForm(false); setEditingId(null); setFormData({ ...emptyForm }); };

  const filtered = (properties || []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.location ?? '').toLowerCase().includes(search.toLowerCase())
  );

  // Shared input/label styles
  const label = "block text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5";
  const input = "w-full input-vecy rounded-lg px-3 py-2.5 text-sm";
  const sectionTitle = (text: string) => (
    <p className="text-[11px] font-bold text-primary/60 uppercase tracking-widest mb-4 flex items-center gap-2">
      <span className="w-6 h-px bg-primary/30 block" /> {text}
    </p>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground">Portafolio de Inmuebles</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {isLoading ? 'Cargando...' : `${properties?.length ?? 0} inmueble${(properties?.length ?? 0) !== 1 ? 's' : ''} registrado${(properties?.length ?? 0) !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ ...emptyForm }); }}
          className="btn-gold text-sm gap-2"
        >
          <Plus className="w-4 h-4" />
          Crear Inmueble
        </button>
      </div>

      {/* Search */}
      {!showForm && (
        <input
          className={`${input} max-w-sm`}
          placeholder="Buscar por nombre o ubicación..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      )}

      {/* ===== FORM ===== */}
      {showForm && (
        <div className="panel-card p-8 animate-fade-in">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-foreground">
                {editingId ? '✏️ Editar Inmueble' : '🏢 Nuevo Inmueble'}
              </h3>
              <p className="text-muted-foreground text-sm mt-1">Completa los datos del inmueble. Los campos con * son obligatorios.</p>
            </div>
            <button onClick={cancelForm} className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-secondary">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Sección 1 */}
            {sectionTitle("Identificación")}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className={label}>Nombre del Inmueble *</label>
                <input required className={input} placeholder="Ej. Apartamento Cedritos UBIK" value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <label className={label}>Tipo *</label>
                <select required value={formData.propertyType}
                  onChange={e => setFormData({ ...formData, propertyType: e.target.value })}
                  className={`${input} cursor-pointer`}>
                  {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Matrícula Inmobiliaria</label>
                <input className={input} placeholder="Ej. 50N-123456" value={formData.matriculaInmobiliaria}
                  onChange={e => setFormData({ ...formData, matriculaInmobiliaria: e.target.value })} />
              </div>
            </div>

            <div className="separator-gold" />

            {/* Sección 2 */}
            {sectionTitle("Precio y Ubicación")}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={label}>Precio * (solo números, sin puntos ni comas)</label>
                <input required className={input} placeholder="450000000" value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })} />
              </div>
              <div>
                <label className={label}>Administración mensual (COP)</label>
                <input className={input} placeholder="350000" value={formData.adminFee}
                  onChange={e => setFormData({ ...formData, adminFee: e.target.value })} />
              </div>
              <div>
                <label className={label}>Ciudad / Dirección *</label>
                <input required className={input} placeholder="Bogotá, Chapinero" value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })} />
              </div>
              <div>
                <label className={label}>Zona / Barrio *</label>
                <input required className={input} placeholder="Cedritos" value={formData.zone}
                  onChange={e => setFormData({ ...formData, zone: e.target.value })} />
              </div>
            </div>

            <div className="separator-gold" />

            {/* Sección 3 */}
            {sectionTitle("Características")}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {[
                { key: 'bedrooms', label: 'Habitaciones', ph: '3' },
                { key: 'bathrooms', label: 'Baños', ph: '2' },
                { key: 'garages', label: 'Parqueaderos', ph: '1' },
                { key: 'stratum', label: 'Estrato', ph: '4' },
                { key: 'floorDetail', label: 'Piso / Niveles / Altura', ph: 'Piso 4 / 2 niveles / 8 metros' },
                { key: 'areaTotal', label: 'Área Total (m²)', ph: '54' },
                { key: 'yearBuilt', label: 'Año Const.', ph: '2018' },
                { key: 'wildcardFeature', label: 'Característica Extra', ph: 'Jacuzzi, vista...' },
              ].map(f => (
                <div key={f.key}>
                  <label className={label}>{f.label}</label>
                  <input
                    className={input}
                    placeholder={f.ph}
                    type={['bedrooms','bathrooms','garages','stratum','yearBuilt'].includes(f.key) ? 'number' : 'text'}
                    value={(formData as any)[f.key]}
                    onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                  />
                </div>
              ))}
            </div>

            <div className="separator-gold" />

            {/* Fotos */}
            {sectionTitle("Fotos del Inmueble")}
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {formData.images.map((img, idx) => (
                  <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-white/10 group bg-card">
                    <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1.5 right-1.5 p-1.5 bg-black/80 hover:bg-destructive rounded-lg transition-colors opacity-0 group-hover:opacity-100 duration-200"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                    </button>
                    <span className="absolute bottom-1 left-1.5 text-[8px] bg-black/60 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest text-primary">
                      Foto {idx + 1}
                    </span>
                  </div>
                ))}
                
                {/* Upload Button Box */}
                <label className="flex flex-col items-center justify-center aspect-video rounded-xl border border-dashed border-white/20 hover:border-primary/50 bg-white/5 hover:bg-white/10 cursor-pointer transition-all duration-300 group">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploading}
                  />
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-5 h-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                      <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Subiendo...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <Plus className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                      <span className="text-[9px] uppercase tracking-widest text-gray-400 group-hover:text-primary transition-colors font-bold">
                        Añadir Fotos
                      </span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="separator-gold" />

            {/* Descripción */}
            {sectionTitle("Descripción")}
            <textarea
              rows={4}
              placeholder="Describe las características más atractivas del inmueble para los compradores..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className={`${input} resize-none h-28`}
            />

            {/* Toggles */}
            <div className="flex items-center gap-8">
              {[
                { key: 'featured', label: 'Destacar en portada', color: 'bg-primary' },
                { key: 'available', label: 'Disponible para venta/arriendo', color: 'bg-green-500' },
              ].map(t => (
                <label key={t.key} className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setFormData({ ...formData, [t.key]: !(formData as any)[t.key] })}
                    className={`w-11 h-6 rounded-full transition-colors relative ${(formData as any)[t.key] ? t.color : 'bg-secondary'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${(formData as any)[t.key] ? 'left-6' : 'left-1'}`} />
                  </div>
                  <span className="text-sm text-muted-foreground">{t.label}</span>
                </label>
              ))}
            </div>

            {/* Botones */}
            <div className="flex gap-4 pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn-gold flex-1 h-12 text-base"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Guardando...'
                  : editingId ? '✅ Actualizar Inmueble' : '🏢 Publicar Inmueble'}
              </button>
              <button type="button" onClick={cancelForm} className="btn-electric px-8 h-12">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===== TABLE ===== */}
      {!showForm && (
        <div className="panel-card overflow-hidden">
          {isLoading ? (
            <div className="py-20 text-center text-muted-foreground">Cargando inmuebles...</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-muted-foreground mb-4">{search ? 'Sin resultados para tu búsqueda.' : 'No hay inmuebles registrados aún.'}</p>
              {!search && (
                <button onClick={() => setShowForm(true)} className="btn-gold text-sm">
                  <Plus className="w-4 h-4 mr-2" /> Crear primer inmueble
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {['Inmueble', 'Ubicación', 'Precio', 'Datos', 'Estado', 'Acciones'].map(h => (
                      <th key={h} className="px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(prop => (
                    <tr key={prop.id} className="table-row-vecy">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-foreground">{prop.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{prop.propertyType}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{prop.location}</td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-primary">
                          ${Number(prop.price).toLocaleString('es-CO')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {[
                          prop.bedrooms && `${prop.bedrooms} hab`,
                          prop.bathrooms && `${prop.bathrooms} baños`,
                          prop.areaTotal && `${prop.areaTotal}m²`,
                        ].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          <span className={prop.available ? 'badge-active' : 'badge-muted'}>
                            {prop.available ? 'Disponible' : 'No disponible'}
                          </span>
                          {prop.featured && <span className="badge-gold">★ Destacado</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEdit(prop)}
                            className="p-2 hover:bg-primary/10 rounded-lg transition text-primary/60 hover:text-primary"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`¿Eliminar "${prop.name}"?`)) deleteMutation.mutate({ id: prop.id });
                            }}
                            className="p-2 hover:bg-destructive/10 rounded-lg transition text-destructive/40 hover:text-destructive"
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
