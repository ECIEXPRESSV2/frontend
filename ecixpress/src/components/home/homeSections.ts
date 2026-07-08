import type { Store } from '../../services/storeService';

/**
 * Configuración de las dos secciones del Home ("Comida" y "Tienda") y de sus filtros
 * por categoría. Los chips con `types` vacío son categorías anunciadas pero aún sin
 * tiendas en el backend: muestran el estado vacío "próximamente" en vez de un listado.
 */
export type SectionId = 'comida' | 'tienda';

export interface CategoryChip {
  id: string;
  label: string;
  /** Tipos de tienda del backend que agrupa este chip. Vacío = categoría "próximamente". */
  types: Store['type'][];
}

export interface HomeSection {
  id: SectionId;
  label: string;
  /** Todos los tipos de la sección: es el filtro por defecto cuando no hay chip activo. */
  types: Store['type'][];
  chips: CategoryChip[];
}

/** Id reservado del chip "Favoritas" (lo inyecta OurStoresSection cuando aplica). */
export const FAVORITES_CHIP_ID = 'favoritas';

export const HOME_SECTIONS: Record<SectionId, HomeSection> = {
  comida: {
    id: 'comida',
    label: 'Comida',
    types: ['CAFETERIA', 'RESTAURANTE'],
    chips: [
      { id: 'restaurantes', label: 'Restaurantes', types: ['RESTAURANTE'] },
      { id: 'cafeterias', label: 'Cafeterías', types: ['CAFETERIA'] },
      { id: 'panaderias', label: 'Panaderías', types: [] },
      { id: 'heladerias', label: 'Heladerías', types: [] },
      { id: 'bebidas', label: 'Bebidas', types: [] },
    ],
  },
  tienda: {
    id: 'tienda',
    label: 'Tienda',
    types: ['PAPELERIA'],
    chips: [
      { id: 'papelerias', label: 'Papelerías', types: ['PAPELERIA'] },
      { id: 'droguerias', label: 'Droguerías', types: [] },
      { id: 'librerias', label: 'Librerías', types: [] },
      { id: 'tecnologia', label: 'Tecnología', types: [] },
      { id: 'ropa', label: 'Ropa', types: [] },
    ],
  },
};
