import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { ImagePlus, Loader2, Images } from 'lucide-react';
import { compressImageToWebp } from '../../services/storeAssets';
import {
  getStoreImages,
  addStoreImages,
  deleteStoreImage,
  type StoreGalleryImage,
} from '../../services/storeService';
import { useAuth } from '../../context/AuthContext';
import GalleryCarousel from './GalleryCarousel';

// Formatos que acepta el backend (ALLOWED_IMAGE_TYPES en identity). Se comprime a WebP antes de subir.
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

interface Props {
  storeId: string;
}

/**
 * Gestor de la galería de una tienda: muestra las fotos en carrusel (ver GalleryCarousel) y permite
 * subir varias (se comprimen a WebP) y eliminarlas. Lo usan dueños, ADMIN y staff activo desde
 * "Mis tiendas" / panel de admin; el backend valida el permiso en cada operación.
 */
const StoreGalleryManager: React.FC<Props> = ({ storeId }) => {
  const { getToken } = useAuth();
  const [images, setImages] = useState<StoreGalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await getStoreImages(storeId, token);
      setImages(res.images);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la galería');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      // Optimiza cada archivo a WebP (o usa el original si el navegador no puede) y valida tipo/tamaño.
      const prepared: File[] = [];
      for (const file of Array.from(fileList)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`"${file.name}" no es una imagen`);
          continue;
        }
        const optimized = (await compressImageToWebp(file)) ?? file;
        if (!ACCEPTED_IMAGE_TYPES.includes(optimized.type)) {
          toast.error(`"${file.name}": formato no soportado (PNG, JPG o WebP)`);
          continue;
        }
        if (optimized.size > MAX_UPLOAD_BYTES) {
          toast.error(`"${file.name}" supera 5 MB tras optimizar`);
          continue;
        }
        prepared.push(optimized);
      }
      if (prepared.length === 0) return;

      const token = await getToken();
      const res = await addStoreImages(storeId, prepared, token);
      setImages(res.images);
      toast.success(prepared.length === 1 ? 'Imagen agregada' : `${prepared.length} imágenes agregadas`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron subir las imágenes');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (name: string) => {
    setDeleting(name);
    try {
      const token = await getToken();
      await deleteStoreImage(storeId, name, token);
      setImages(prev => prev.filter(img => img.name !== name));
      toast.success('Imagen eliminada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la imagen');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Images size={16} className="text-yellow-500" />
          <h3 className="text-sm font-semibold text-gray-800">
            Galería de fotos
            {!loading && images.length > 0 && (
              <span className="ml-1 font-normal text-gray-400">({images.length})</span>
            )}
          </h3>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => { void handleFiles(e.target.files); e.target.value = ''; }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-yellow-400 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
          {uploading ? 'Subiendo…' : 'Agregar fotos'}
        </button>
      </div>

      <p className="mb-2 text-xs text-gray-400">
        Sube fotos del local, ambiente o lo que quieras mostrar. Puedes seleccionar varias a la vez.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin" /> Cargando galería…
        </div>
      ) : images.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 py-8 text-center">
          <p className="text-sm text-gray-500">Aún no hay fotos en la galería.</p>
          <p className="mt-0.5 text-xs text-gray-400">Usa “Agregar fotos” para empezar.</p>
        </div>
      ) : (
        <GalleryCarousel images={images} onDelete={name => void handleDelete(name)} deletingName={deleting} />
      )}
    </div>
  );
};

export default StoreGalleryManager;
