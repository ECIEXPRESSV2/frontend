import React, { useMemo, useState } from 'react';
import { getStoreOpenState, type Store } from '../../services/storeService';
import { FAVORITES_CHIP_ID, type HomeSection } from './homeSections';
import CategoryChips, { type ChipOption } from './CategoryChips';
import StoreCarousel from './StoreCarousel';
import StoreItem from './StoreItem';
import EmptyCategoryState from './EmptyCategoryState';
import TrianglePattern from './TrianglePattern';

const STORE_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200&auto=format&fit=crop';

interface OurStoresSectionProps {
  section: HomeSection;
  /** Todas las tiendas disponibles (sin filtrar): la búsqueda es global. */
  stores: Store[];
  favoriteIds: string[];
  loading: boolean;
  /** Texto de búsqueda ya recortado (trim). Si no está vacío, ignora sección y chips. */
  query: string;
  onStoreClick: (store: Store) => void;
}

/**
 * Sección "Nuestras tiendas": título, filtros por categoría (chips) y carrusel de círculos.
 * El chip activo vive aquí (estado local); Home remonta el componente con key={section.id}
 * para que el filtro se resetee al cambiar entre Comida y Tienda.
 */
const OurStoresSection: React.FC<OurStoresSectionProps> = ({
  section,
  stores,
  favoriteIds,
  loading,
  query,
  onStoreClick,
}) => {
  const [activeChipId, setActiveChipId] = useState<string | null>(null);

  const sectionStores = useMemo(
    () => stores.filter((s) => section.types.includes(s.type)),
    [stores, section],
  );
  const favoriteStores = useMemo(
    () => sectionStores.filter((s) => favoriteIds.includes(String(s.id))),
    [sectionStores, favoriteIds],
  );

  const chips: ChipOption[] = useMemo(() => {
    const base: ChipOption[] = section.chips.map(({ id, label }) => ({ id, label }));
    if (favoriteStores.length > 0) {
      base.unshift({ id: FAVORITES_CHIP_ID, label: 'Favoritas' });
    }
    return base;
  }, [section, favoriteStores.length]);

  const isSearching = query.length > 0;

  // Con búsqueda activa se ignoran sección y chips (búsqueda global por nombre).
  const searchResults = useMemo(
    () => stores.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())),
    [stores, query],
  );

  const activeChip = section.chips.find((c) => c.id === activeChipId) ?? null;
  const comingSoon = activeChip !== null && activeChip.types.length === 0;

  let shownStores: Store[];
  if (isSearching) {
    shownStores = searchResults;
  } else if (activeChipId === FAVORITES_CHIP_ID) {
    shownStores = favoriteStores;
  } else if (activeChip) {
    shownStores = sectionStores.filter((s) => activeChip.types.includes(s.type));
  } else {
    shownStores = sectionStores;
  }

  const handleToggleChip = (id: string) => {
    setActiveChipId((current) => (current === id ? null : id));
  };

  return (
    // Contenedor propio de la sección; el título es un recuadro "puente" que queda a caballo
    // entre el borde inferior del hero y este panel (estilo píldora central del ejemplo KFC).
    <section className="theme-surface relative mt-3 space-y-3 rounded-[32px] border border-white/60 bg-white/50 px-3 pb-5 pt-9 shadow-[0_18px_40px_-24px_rgb(var(--accent-rgb)/0.35)] backdrop-blur-xl md:px-6">
      <TrianglePattern className="opacity-60" />
      <h2 className="theme-surface absolute left-1/2 top-0 z-20 max-w-[85vw] -translate-x-1/2 -translate-y-1/2 truncate whitespace-nowrap rounded-full bg-[linear-gradient(135deg,var(--accent-300),var(--accent-400))] px-7 py-2.5 text-base font-bold text-gray-950 shadow-[0_10px_24px_rgb(var(--accent-rgb)/0.40)] md:text-lg">
        {isSearching ? `Resultados para "${query}"` : 'Nuestras tiendas'}
      </h2>

      {!isSearching && <CategoryChips chips={chips} activeId={activeChipId} onToggle={handleToggleChip} />}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent-400)] border-t-transparent" />
        </div>
      ) : comingSoon ? (
        <EmptyCategoryState />
      ) : shownStores.length === 0 ? (
        isSearching ? (
          <EmptyCategoryState variant="search" message="No se encontraron tiendas con ese nombre." />
        ) : (
          <EmptyCategoryState />
        )
      ) : (
        <StoreCarousel>
          {shownStores.map((store) => {
            const openState = getStoreOpenState(store.status, store.schedules);
            return (
              <StoreItem
                key={store.id}
                id={store.id as unknown as number}
                name={store.name}
                imageUrl={store.imageUrl || STORE_FALLBACK_IMAGE}
                fallbackUrl={STORE_FALLBACK_IMAGE}
                size="sm"
                closed={!openState.open}
                closedLabel={openState.label}
                onClick={() => onStoreClick(store)}
              />
            );
          })}
        </StoreCarousel>
      )}
    </section>
  );
};

export default OurStoresSection;
