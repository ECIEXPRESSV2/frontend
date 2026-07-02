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
