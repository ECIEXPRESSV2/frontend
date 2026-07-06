import type { StoreGalleryImage } from './storeService';

/**
 * Imágenes de referencia de cada edificio del campus. A diferencia de la galería de tiendas (que
 * vive en Azure Blob Storage), estas son ESTÁTICAS y se sirven desde `/public`.
 *
 * Para añadir imágenes de un edificio:
 *   1. Copia los archivos a `public/edificios/<lo-que-quieras>/...`
 *   2. Regístralos aquí, con la clave EXACTA = nombre del edificio en el mapa (propiedad `name`
 *      del GeoJSON, la misma que se usa como "ubicación" de la tienda).
 *
 * Ejemplo:
 *   'Bloque A': ['/edificios/bloque-a/1.jpg', '/edificios/bloque-a/2.jpg'],
 *
 * Por ahora está vacío a propósito, así que todos los edificios muestran "Sin imágenes de referencia".
 */
const BUILDING_IMAGE_PATHS: Record<string, string[]> = {};

/** Devuelve las imágenes de referencia de un edificio en el formato que consume GalleryCarousel. */
export function getBuildingImages(name: string | null): StoreGalleryImage[] {
  if (!name) return [];
  const paths = BUILDING_IMAGE_PATHS[name] ?? [];
  return paths.map((url) => ({ url, name: url.split('/').pop() ?? url, uploadedAt: null }));
}
