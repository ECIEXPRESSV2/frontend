// Resolución de imágenes de tienda alojadas en Azure Blob Storage.
//
// Las imágenes se suben a un contenedor PÚBLICO (lectura anónima) cuyo nombre de archivo es el
// id de la tienda, p. ej.  <cuenta>.blob.core.windows.net/store-logos/<storeId>.png
// Así el frontend arma la URL absoluta a partir del id y funciona IGUAL en local y en Azure,
// sin necesitar ningún backend. La URL base se configura por variable de entorno (VITE_*).
//
// IMPORTANTE: aquí solo va la URL pública de LECTURA. La cadena de conexión / AccountKey (que da
// permiso de ESCRITURA) nunca debe estar en el frontend: solo se usa para SUBIR las imágenes.

// Base de la cuenta de Azure Blob (p. ej. https://<cuenta>.blob.core.windows.net). El nombre del
// contenedor NO va en la variable: es una convención fija del código, así una sola variable de
// entorno basta para toda la cuenta. Se normaliza la barra final para no duplicarla al concatenar.
const STORAGE_BASE = (import.meta.env.VITE_BLOB_STORAGE ?? '').replace(/\/$/, '');

// Contenedores públicos (lectura anónima). Los archivos se llaman <storeId>.png.
const LOGOS_CONTAINER = 'store-logos';
const BANNERS_CONTAINER = 'store-banners';

const LOGOS_BASE = STORAGE_BASE ? `${STORAGE_BASE}/${LOGOS_CONTAINER}` : '';
const BANNERS_BASE = STORAGE_BASE ? `${STORAGE_BASE}/${BANNERS_CONTAINER}` : '';

/** URL pública del logo de una tienda, o null si aún no se configuró el contenedor. */
export const getStoreLogoUrl = (storeId: string | number): string | null =>
  LOGOS_BASE ? `${LOGOS_BASE}/${storeId}.png` : null;

/** URL pública del banner de una tienda, o null si aún no se configuró el contenedor. */
export const getStoreBannerUrl = (storeId: string | number): string | null =>
  BANNERS_BASE ? `${BANNERS_BASE}/${storeId}.png` : null;

/** Lee un archivo de imagen como data URL (base64) para previsualizarlo antes de subirlo. */
export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(file);
  });

/**
 * Redimensiona (máx. `maxDimension` px por lado) y recomprime la imagen a WebP EN EL NAVEGADOR,
 * antes de subirla. Reduce mucho el peso (una foto de cámara de 5-8 MB baja a ~300-600 KB) sin que
 * el usuario deba preocuparse por el tamaño, preserva la transparencia (útil para logos) y acelera
 * la carga de las páginas públicas. Si el navegador no puede procesarla, devuelve `null` y el
 * llamador usa el archivo original.
 */
export async function compressImageToWebp(
  file: File,
  maxDimension = 1600,
  quality = 0.85,
): Promise<File | null> {
  try {
    const dataUrl = await fileToDataUrl(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('No se pudo decodificar la imagen'));
      image.src = dataUrl;
    });

    const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', quality),
    );
    // Navegador sin soporte de codificación WebP en canvas → dejar que el llamador use el original.
    if (!blob || blob.type !== 'image/webp') return null;

    const name = `${file.name.replace(/\.[^.]+$/, '')}.webp`;
    return new File([blob], name, { type: 'image/webp' });
  } catch {
    return null;
  }
}
