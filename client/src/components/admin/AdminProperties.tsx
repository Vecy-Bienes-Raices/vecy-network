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
  const [currentPage, setCurrentPage] = useState(1);
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

  const { data: properties = [], isLoading, error, refetch } = trpc.properties.myList.useQuery(undefined, {
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
  });


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

  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginatedProps = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Shared input/label styles
  const label = "block text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5";
  const input = "w-full input-vecy rounded-lg px-3 py-2.5 text-sm";
  const sectionTitle = (text: string) => (
    <p className="text-[11px] font-bold text-primary/60 uppercase tracking-widest mb-4 flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
      {text}
    </p>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Gestión de Inmuebles</h2>
          <p className="text-sm text-muted-foreground">Catálogo de inmuebles en venta y arriendo</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-900 border border-white/5 px-4 py-2 rounded-xl text-center">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Total Inmuebles</p>
              <p className="text-xl font-black text-white">{isLoading ? '...' : (properties || []).length}</p>
            </div>
          </div>
          {!showForm && (
            <button onClick={() => { cancelForm(); setShowForm(true); }} className="btn-gold">
              <Plus className="w-4 h-4 mr-2" /> Nuevo Inmueble
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      {!showForm && (
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por nombre, barrio, ciudad..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full input-vecy rounded-xl px-4 py-3 text-sm"
          />
        </div>
      )}

      {/* ===== FORM ===== */}
      {showForm && (
        <div className="panel-card p-6 border-primary/20">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <h3 className="font-bold text-foreground text-lg">
              {editingId ? 'Editar Inmueble' : 'Nuevo Inmueble'}
            </h3>
            <button onClick={cancelForm} className="p-2 hover:bg-secondary rounded-lg transition text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tipo y Negocio */}
            {sectionTitle("Información Principal")}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={label}>Tipo de Inmueble *</label>
                <select
                  className={input}
                  value={formData.propertyType}
                  onChange={e => setFormData({ ...formData, propertyType: e.target.value })}
                >
                  {PROPERTY_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={label}>Título / Nombre *</label>
                <input
                  required
                  className={input}
                  placeholder="Ej: Apartamento Penthouse Chicó"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className={label}>Precio (COP) *</label>
                <input
                  required
                  className={input}
                  placeholder="Ej: 1200000000"
                  type="number"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={label}>Cuota de Administración (COP)</label>
                <input
                  className={input}
                  placeholder="Ej: 450000 (0 si incluye)"
                  value={formData.adminFee}
                  onChange={e => setFormData({ ...formData, adminFee: e.target.value })}
                />
              </div>
              <div>
                <label className={label}>Ubicación / Barrio *</label>
                <input
                  required
                  className={input}
                  placeholder="Ej: Chicó Norte, Cra 11 # 93"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div>
                <label className={label}>Zona / Localidad</label>
                <input
                  className={input}
                  placeholder="Ej: Chapinero / Zona Norte"
                  value={formData.zone}
                  onChange={e => setFormData({ ...formData, zone: e.target.value })}
                />
              </div>
            </div>

            <div className="separator-gold" />

            {/* Ficha Técnica */}
            {sectionTitle("Especificaciones Físicas")}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: 'bedrooms', label: 'Habitaciones', ph: '3' },
                { key: 'bathrooms', label: 'Baños', ph: '2' },
                { key: 'garages', label: 'Parqueaderos', ph: '1' },
                { key: 'stratum', label: 'Estrato', ph: '4' },
                { key: 'floorDetail', label: 'Piso / Niveles', ph: 'Piso 4' },
                { key: 'areaTotal', label: 'Área (m²)', ph: '54' },
                { key: 'yearBuilt', label: 'Año Const.', ph: '2018' },
                { key: 'wildcardFeature', label: 'Extra', ph: 'Jacuzzi' },
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
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {formData.images.map((img, idx) => (
                <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-border group">
                  <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-destructive rounded transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              <label className="flex flex-col items-center justify-center aspect-video rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer bg-secondary/50">
                <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" disabled={uploading} />
                {uploading ? <div className="w-5 h-5 border-2 border-primary border-t-transparent animate-spin rounded-full" /> : <Plus className="w-6 h-6 text-muted-foreground" />}
              </label>
            </div>

            {/* Descripción */}
            {sectionTitle("Descripción")}
            <textarea
              rows={4}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className={`${input} resize-none`}
            />

            {/* Toggles */}
            <div className="flex items-center gap-8 py-2">
              {[
                { key: 'featured', label: 'Destacado', color: 'bg-primary' },
                { key: 'available', label: 'Disponible', color: 'bg-green-500' },
              ].map(t => (
                <label key={t.key} className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setFormData({ ...formData, [t.key]: !(formData as any)[t.key] })}
                    className={`w-10 h-5 rounded-full transition-colors relative ${(formData as any)[t.key] ? t.color : 'bg-muted'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${(formData as any)[t.key] ? 'left-5.5' : 'left-0.5'}`} />
                  </div>
                  <span className="text-sm text-muted-foreground">{t.label}</span>
                </label>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4 border-t border-border">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn-gold px-8 h-12 flex-1 sm:flex-none"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Guardando...'
                  : editingId ? '✅ Actualizar Inmueble' : '🏢 Publicar Inmueble'}
              </button>
              <button type="button" onClick={cancelForm} className="btn-electric px-8 h-12">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* ===== TABLE ===== */}
      {!showForm && (
        <div className="panel-card overflow-hidden">
          {isLoading ? (
            <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-[#bf953f] border-t-transparent rounded-full animate-spin" />
              <span>Cargando catálogo de inmuebles...</span>
            </div>
          ) : error ? (
            <div className="py-20 text-center text-red-400 space-y-3">
              <p>Error al cargar inmuebles: {error.message}</p>
              <button onClick={() => refetch()} className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-xl text-xs font-bold transition">
                Reintentar
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">No hay inmuebles encontrados.</div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {['Inmueble', 'Ubicación', 'Precio', 'Estado', 'Acciones'].map(h => (
                        <th key={h} className="px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProps.map(prop => (
                      <tr key={prop.id} className="table-row-vecy cv-auto-card">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-foreground">{prop.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{prop.propertyType}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{prop.location}</td>
                        <td className="px-6 py-4 font-semibold text-primary">
                          ${Number(prop.price).toLocaleString('es-CO')}
                        </td>
                        <td className="px-6 py-4">
                          <span className={prop.available ? 'badge-active' : 'badge-muted'}>
                            {prop.available ? 'Disponible' : 'No disponible'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button onClick={() => startEdit(prop)} className="p-2 hover:bg-primary/10 rounded-lg text-primary"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => { if (confirm('¿Eliminar?')) deleteMutation.mutate({ id: prop.id }); }} className="p-2 hover:bg-destructive/10 rounded-lg text-destructive"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* VISTA MÓVIL (CARDS) */}
              <div className="grid grid-cols-1 gap-3 p-3 md:hidden">
                {paginatedProps.map(prop => (
                  <div key={prop.id} className="bg-card border border-border p-4 rounded-2xl space-y-3 shadow-md cv-auto-card">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-foreground text-sm">{prop.name}</h4>
                        <p className="text-xs text-muted-foreground capitalize">{prop.propertyType} · {prop.location}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => startEdit(prop)} className="p-2 bg-primary/10 text-primary rounded-xl"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => { if (confirm('¿Eliminar?')) deleteMutation.mutate({ id: prop.id }); }} className="p-2 bg-destructive/10 text-destructive rounded-xl"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-2.5">
                      <p className="font-bold text-primary text-sm">${Number(prop.price).toLocaleString('es-CO')}</p>
                      <span className={prop.available ? 'badge-active text-[10px]' : 'badge-muted text-[10px]'}>
                        {prop.available ? 'Disponible' : 'No disponible'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* PAGINACIÓN */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-black/20 text-xs">
                  <span className="text-muted-foreground text-center sm:text-left">
                    Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} de {filtered.length} inmuebles
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button 
                      disabled={currentPage === 1} 
                      onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="px-3 py-1.5 rounded-lg border border-border text-foreground disabled:opacity-30 disabled:pointer-events-none hover:bg-secondary transition"
                    >
                      ‹ Anterior
                    </button>
                    <span className="px-2 font-bold text-foreground">
                      Pág. {currentPage} de {totalPages}
                    </span>
                    <button 
                      disabled={currentPage === totalPages} 
                      onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="px-3 py-1.5 rounded-lg border border-border text-foreground disabled:opacity-30 disabled:pointer-events-none hover:bg-secondary transition"
                    >
                      Siguiente ›
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
