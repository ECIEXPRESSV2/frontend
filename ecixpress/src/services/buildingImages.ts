import buildingImageMap from 'virtual:building-images';
import type { StoreGalleryImage } from './storeService';

/**
 * Imágenes de referencia de cada edificio del campus. A diferencia de la galería de tiendas (que
 * vive en Azure Blob Storage), estas son ESTÁTICAS y se sirven desde `/public`.
 *
 * Para añadir imágenes de un edificio NO hace falta tocar código:
 *   1. Crea una carpeta con el nombre del edificio en `public/edificios/`.
 *      Ej: `public/edificios/Bloque A/` (el nombre se compara ignorando mayúsculas,
 *      acentos y espacios, así que `bloque-a` también sirve).
 *   2. Suelta ahí las fotos (jpg, png, webp, gif, avif o svg).
 *
 * El plugin `vite-plugin-building-images` escanea esa carpeta en build/dev y genera el
 * mapa que se importa arriba. En dev, al añadir/quitar imágenes la página se recarga sola.
 */

/** Máximo de imágenes a mostrar por edificio. Si hay más, se eligen 10 al azar. */
const MAX_IMAGES = 10;

/** Normaliza para tolerar mayúsculas/acentos/espacios entre el nombre del edificio y la carpeta. */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

// Reindexa el mapa del plugin por nombre normalizado para el lookup.
const byNormalized: Record<string, string[]> = {};
for (const [folder, urls] of Object.entries(buildingImageMap)) {
  byNormalized[normalize(folder)] = urls;
}

// Cachea la selección aleatoria por edificio para que no cambie de orden en cada render.
const selectionCache = new Map<string, string[]>();

/** Devuelve hasta MAX_IMAGES imágenes: las primeras si hay <= 10, o 10 al azar si hay más. */
function pickImages(name: string, urls: string[]): string[] {
  if (urls.length <= MAX_IMAGES) return urls;

  const cached = selectionCache.get(name);
  if (cached) return cached;

  // Fisher-Yates sobre una copia y nos quedamos con las primeras MAX_IMAGES.
  const shuffled = urls.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const chosen = shuffled.slice(0, MAX_IMAGES);
  selectionCache.set(name, chosen);
  return chosen;
}

/** Devuelve las imágenes de referencia de un edificio en el formato que consume GalleryCarousel. */
export function getBuildingImages(name: string | null): StoreGalleryImage[] {
  if (!name) return [];
  const urls = byNormalized[normalize(name)] ?? [];
  return pickImages(name, urls).map((url) => ({
    url,
    name: decodeURIComponent(url.split('/').pop() ?? url),
    uploadedAt: null,
  }));
}
