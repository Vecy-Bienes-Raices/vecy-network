/**
 * PROPERTY IMAGE UPLOAD - Component for uploading images to properties
 */

import { useState, useRef } from 'react';
import { Upload, X, Star, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';

interface PropertyImageUploadProps {
  propertyId: number;
  onUploadSuccess?: () => void;
}

export default function PropertyImageUpload({ propertyId, onUploadSuccess }: PropertyImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isMainImage, setIsMainImage] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const imagesQuery = trpc.images.getPropertyImages.useQuery(
    { propertyId },
    { refetchInterval: 5000 }
  );

  // Mutations
  const uploadMutation = trpc.images.uploadPropertyImage.useMutation({
    onSuccess: (data) => {
      setUploadResult({
        success: true,
        message: 'Imagen cargada exitosamente',
      });
      setSelectedFile(null);
      setPreview(null);
      setCaption('');
      setIsMainImage(false);
      setUploading(false);
      imagesQuery.refetch();
      onUploadSuccess?.();

      // Clear result after 3 seconds
      setTimeout(() => setUploadResult(null), 3000);
    },
    onError: (error) => {
      setUploadResult({
        success: false,
        message: error.message,
      });
      setUploading(false);
    },
  });

  const deleteImageMutation = trpc.images.deletePropertyImage.useMutation({
    onSuccess: () => {
      imagesQuery.refetch();
    },
  });

  const setMainImageMutation = trpc.images.setMainImage.useMutation({
    onSuccess: () => {
      imagesQuery.refetch();
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadResult({
        success: false,
        message: 'Por favor selecciona un archivo de imagen válido',
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadResult({
        success: false,
        message: 'La imagen no puede exceder 10MB',
      });
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        await uploadMutation.mutateAsync({
          propertyId,
          fileBase64: base64,
          fileName: selectedFile.name,
          mimeType: selectedFile.type,
          caption: caption || undefined,
          isMainImage,
        });
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error('Upload error:', error);
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-gradient-to-br from-black/10 to-black border border-white/10 rounded-lg p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-zinc-500" />
          Cargar Nueva Imagen
        </h3>

        {/* File Input */}
        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center cursor-pointer hover:border-white/10 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
            <p className="text-white font-semibold">Haz clic para seleccionar imagen</p>
            <p className="text-gray-400 text-sm">o arrastra una imagen aquí</p>
            <p className="text-gray-500 text-xs mt-2">Máximo 10MB</p>
          </div>

          {/* Preview */}
          {preview && (
            <div className="relative">
              <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreview(null);
                }}
                className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Caption Input */}
          {selectedFile && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Descripción de la imagen (opcional)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full px-3 py-2 bg-black border border-white/10 rounded text-white placeholder-gray-500"
              />

              <label className="flex items-center gap-2 text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMainImage}
                  onChange={(e) => setIsMainImage(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Establecer como imagen principal</span>
              </label>

              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full bg-zinc-900 hover:bg-zinc-900 text-white disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Cargando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Cargar Imagen
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <div
              className={`rounded-lg p-4 flex items-start gap-3 ${
                uploadResult.success
                  ? 'bg-green-900/20 border border-green-700/50'
                  : 'bg-red-900/20 border border-red-700/50'
              }`}
            >
              {uploadResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <p
                className={`text-sm ${
                  uploadResult.success ? 'text-green-300' : 'text-red-300'
                }`}
              >
                {uploadResult.message}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Images Gallery */}
      {imagesQuery.data?.images && imagesQuery.data.images.length > 0 && (
        <div className="bg-gradient-to-br from-black/10 to-black border border-white/10 rounded-lg p-6">
          <h3 className="text-white font-semibold mb-4">
            Galería de Imágenes ({imagesQuery.data.images.length})
          </h3>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {imagesQuery.data.images.map((image: any) => (
              <div key={image.id} className="relative group">
                <img
                  src={image.imageUrl}
                  alt={image.caption}
                  className="w-full h-40 object-cover rounded-lg"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  {!image.isMainImage && (
                    <button
                      onClick={() =>
                        setMainImageMutation.mutate({
                          propertyId,
                          imageId: image.id,
                        })
                      }
                      className="bg-zinc-900 hover:bg-zinc-900 text-white p-2 rounded"
                      title="Establecer como principal"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => deleteImageMutation.mutate({ imageId: image.id })}
                    className="bg-red-600 hover:bg-red-700 text-white p-2 rounded"
                    title="Eliminar imagen"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Main Image Badge */}
                {image.isMainImage && (
                  <div className="absolute top-2 left-2 bg-zinc-900 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Principal
                  </div>
                )}

                {/* Caption */}
                {image.caption && (
                  <p className="text-gray-300 text-xs mt-2 truncate">{image.caption}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {imagesQuery.isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
        </div>
      )}
    </div>
  );
}
