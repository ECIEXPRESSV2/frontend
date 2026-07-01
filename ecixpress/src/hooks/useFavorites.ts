import { useCallback, useEffect, useState } from 'react';
import {
  FAVORITES_KEY,
  getFavorites,
  subscribeFavorites,
  toggleFavorite,
} from '../services/favoritesStore';

/**
 * Estado reactivo de las tiendas favoritas. Se re-renderiza cuando cambian (en esta pestaña vía
 * la suscripción del store, y entre pestañas vía el evento `storage`).
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(getFavorites);

  useEffect(() => {
    const refresh = () => setFavorites(getFavorites());
    const unsubscribe = subscribeFavorites(refresh);
    const onStorage = (e: StorageEvent) => { if (e.key === FAVORITES_KEY) refresh(); };
    window.addEventListener('storage', onStorage);
    return () => { unsubscribe(); window.removeEventListener('storage', onStorage); };
  }, []);

  const isFavorite = useCallback((id: string | number) => favorites.includes(String(id)), [favorites]);
  const toggle = useCallback((id: string | number) => toggleFavorite(id), []);

  return { favorites, isFavorite, toggle };
}
