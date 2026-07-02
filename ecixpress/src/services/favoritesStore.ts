// Tiendas favoritas del usuario — almacenamiento local (localStorage).
//
// TODO: mover a un backend de preferencias del usuario (p. ej. identity-service) cuando exista
// el servicio; por ahora las favoritas viven solo en el navegador donde se marcaron.

export const FAVORITES_KEY = 'eci.store.favorites';

type Listener = () => void;
const listeners = new Set<Listener>();

/** Ids de tiendas favoritas (siempre como string). */
export const getFavorites = (): string[] => {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

export const isFavorite = (storeId: string | number): boolean =>
  getFavorites().includes(String(storeId));

const save = (ids: string[]): void => {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  } catch {
    /* localStorage lleno: se ignora, no es crítico */
  }
  listeners.forEach((l) => l());
};

/** Agrega/quita la tienda de favoritas. Devuelve el nuevo estado (true = ahora es favorita). */
export const toggleFavorite = (storeId: string | number): boolean => {
  const id = String(storeId);
  const current = getFavorites();
  const has = current.includes(id);
  save(has ? current.filter((x) => x !== id) : [...current, id]);
  return !has;
};

/** Suscripción a cambios de favoritas (para que la UI reaccione en vivo). */
export const subscribeFavorites = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
