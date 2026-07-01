// Resolución de imágenes de tienda alojadas en Azure Blob Storage.
//
// Las imágenes se suben a un contenedor PÚBLICO (lectura anónima) cuyo nombre de archivo es el
// id de la tienda, p. ej.  <cuenta>.blob.core.windows.net/store-logos/<storeId>.png
// Así el frontend arma la URL absoluta a partir del id y funciona IGUAL en local y en Azure,
// sin necesitar ningún backend. La URL base se configura por variable de entorno (VITE_*).
//
// IMPORTANTE: aquí solo va la URL pública de LECTURA. La cadena de conexión / AccountKey (que da
// permiso de ESCRITURA) nunca debe estar en el frontend: solo se usa para SUBIR las imágenes.

const LOGOS_BASE = (import.meta.env.VITE_STORE_LOGOS_URL ?? '').replace(/\/$/, '');

/** URL pública del logo de una tienda, o null si aún no se configuró el contenedor. */
export const getStoreLogoUrl = (storeId: string | number): string | null =>
  LOGOS_BASE ? `${LOGOS_BASE}/${storeId}.png` : null;
