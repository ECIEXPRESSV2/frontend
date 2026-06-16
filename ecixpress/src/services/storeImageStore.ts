// Almacenamiento temporal de imágenes de tienda.
//
// TODO: Reemplazar por subida a un Blob Storage (Azure Blob Storage) cuando haya
// servicios de nube disponibles. Por ahora la imagen elegida desde el dispositivo
// se guarda como data URL (base64) en el localStorage del navegador, indexada por
// el id de la tienda. Esto es solo para desarrollo: la imagen solo es visible en
// el dispositivo donde se cargó y no se persiste en el backend.

const key = (storeId: string) => `eci.store.image.${storeId}`;

export const getStoreImage = (storeId: string): string | null =>
  localStorage.getItem(key(storeId));

export const setStoreImage = (storeId: string, dataUrl: string): void => {
  try {
    localStorage.setItem(key(storeId), dataUrl);
  } catch {
    // localStorage lleno o imagen demasiado grande: se ignora (no es crítico).
  }
};

export const removeStoreImage = (storeId: string): void => {
  localStorage.removeItem(key(storeId));
};

/** Lee un archivo de imagen como data URL (base64) para previsualizar/guardar. */
export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(file);
  });
