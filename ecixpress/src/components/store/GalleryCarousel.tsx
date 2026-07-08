import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { StoreGalleryImage } from '../../services/storeService';

interface Props {
  images: StoreGalleryImage[];
  /** Si se pasa, cada tarjeta muestra un botón de eliminar (modo gestión). Si no, es solo lectura. */
  onDelete?: (name: string) => void;
  /** Nombre de la imagen que se está borrando (para mostrar spinner en su botón). */
  deletingName?: string | null;
  /** Versión reducida (miniaturas): para espacios pequeños como el panel del mapa. */
  compact?: boolean;
}

/**
 * Carrusel presentacional de la galería de una tienda: fotos con flechas amarillas para desplazarse
 * y efecto de "relieve" en la foto bajo el cursor (sobresale como una carta del mazo). En modo
 * gestión (`onDelete`) cada tarjeta trae su botón de eliminar; en `compact` usa miniaturas.
 * Solo se debe renderizar cuando hay al menos una imagen.
 */
const GalleryCarousel: React.FC<Props> = ({ images, onDelete, deletingName, compact = false }) => {
  const [arrows, setArrows] = useState({ left: false, right: false });
  const scrollerRef = useRef<HTMLDivElement>(null);
  const gap = compact ? 8 : 16; // gap-2 vs gap-4

  // Muestra las flechas solo cuando hay contenido desbordado a cada lado.
  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setArrows({ left: el.scrollLeft > 4, right: el.scrollLeft < maxScroll - 4 });
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(updateArrows);
    window.addEventListener('resize', updateArrows);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', updateArrows);
    };
  }, [images, updateArrows]);

  // Desplaza una tarjeta hacia dir (+1 derecha, -1 izquierda).
  const scrollByCards = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-card]');
    const step = card ? card.getBoundingClientRect().width + gap : el.clientWidth / 2;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  const arrowBase =
    'absolute top-1/2 z-20 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-yellow-300 bg-yellow-100/95 text-amber-700 shadow-md backdrop-blur transition hover:bg-yellow-200 hover:text-amber-900 focus:outline-none focus:ring-2 focus:ring-yellow-400';

  const trackCls = compact
    ? 'flex gap-2 overflow-x-auto scroll-smooth px-0 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
    : 'flex gap-4 overflow-x-auto scroll-smooth px-2 py-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

  const cardWrapCls = compact
    ? 'group relative shrink-0 w-32 sm:w-36'
    : 'group relative shrink-0 basis-[calc(50%-8px)] sm:basis-[calc(33.333%-11px)] lg:basis-[calc(25%-12px)]';

  const cardInnerCls = compact
    ? 'relative h-24 w-full overflow-hidden rounded-xl border border-gray-100 bg-gray-50 shadow-sm transition-all duration-200 ease-out group-hover:z-10 group-hover:-translate-y-1 group-hover:scale-[1.05] group-hover:border-yellow-300 group-hover:shadow-xl group-hover:shadow-gray-900/25'
    : 'relative aspect-square w-full overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 shadow-sm transition-all duration-200 ease-out group-hover:z-10 group-hover:-translate-y-1.5 group-hover:scale-[1.07] group-hover:border-yellow-300 group-hover:shadow-2xl group-hover:shadow-gray-900/25';

  return (
    <div className="relative">
      {arrows.left && (
        <button
          type="button"
          onClick={() => scrollByCards(-1)}
          aria-label="Anterior"
          className={`${arrowBase} left-1`}
        >
          <ChevronLeft size={17} />
        </button>
      )}

      <div ref={scrollerRef} onScroll={updateArrows} className={trackCls}>
        {images.map(img => (
          <div key={img.name} data-card className={cardWrapCls}>
            <div className={cardInnerCls}>
              <img src={img.url} alt="Foto de la tienda" loading="lazy" className="h-full w-full object-cover" />
              {onDelete && (
                <>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                  <button
                    type="button"
                    onClick={() => onDelete(img.name)}
                    disabled={deletingName === img.name}
                    aria-label="Eliminar foto"
                    className="absolute right-2 top-2 inline-flex h-8 w-8 translate-y-1 items-center justify-center rounded-lg bg-black/55 text-white opacity-0 backdrop-blur-sm transition-all duration-200 hover:bg-red-500 focus:opacity-100 focus:outline-none group-hover:translate-y-0 group-hover:opacity-100 disabled:cursor-not-allowed"
                  >
                    {deletingName === img.name ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {arrows.right && (
        <button
          type="button"
          onClick={() => scrollByCards(1)}
          aria-label="Siguiente"
          className={`${arrowBase} right-1`}
        >
          <ChevronRight size={17} />
        </button>
      )}
    </div>
  );
};

export default GalleryCarousel;
