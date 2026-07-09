import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface StoreCarouselProps {
  children: React.ReactNode;
  ariaLabel?: string;
}

/**
 * Carrusel horizontal de tiendas: scroll nativo con la barra oculta (.scrollbar-hidden).
 * En desktop se navega con flechas laterales (solo aparecen cuando hay desborde); en
 * táctil se desliza con el dedo. Si todo cabe, el contenido queda perfectamente centrado
 * y las flechas no se renderizan.
 */
const StoreCarousel: React.FC<StoreCarouselProps> = ({ children, ariaLabel = 'Tiendas disponibles' }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const overflow = el.scrollWidth > el.clientWidth + 4;
    setOverflowing(overflow);
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  // Sin lista de dependencias: re-mide tras cada render (cubre cambios de hijos por
  // filtros/búsqueda sin tener que observar los children explícitamente).
  useEffect(measure);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      observer.disconnect();
    };
  }, [measure]);

  const scrollByPage = (direction: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  const arrowClass = (enabled: boolean) =>
    `absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/85 text-gray-600 shadow-lg backdrop-blur-xl transition-all duration-300 hover:bg-white hover:text-gray-900 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] ${
      enabled ? 'opacity-100' : 'pointer-events-none opacity-0'
    }`;

  return (
    <div className="relative" role="group" aria-label={ariaLabel}>
      {overflowing && (
        <button
          type="button"
          aria-label="Ver tiendas anteriores"
          aria-disabled={!canPrev}
          onClick={() => scrollByPage(-1)}
          className={`${arrowClass(canPrev)} left-0`}
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
      )}

      <div
        ref={trackRef}
        className={`scrollbar-hidden flex gap-4 overflow-x-auto scroll-smooth py-2 ${
          overflowing ? 'snap-x px-12' : 'justify-center px-1'
        }`}
      >
        {React.Children.map(children, (child) =>
          child == null ? child : <div className="shrink-0 snap-start">{child}</div>,
        )}
      </div>

      {overflowing && (
        <button
          type="button"
          aria-label="Ver tiendas siguientes"
          aria-disabled={!canNext}
          onClick={() => scrollByPage(1)}
          className={`${arrowClass(canNext)} right-0`}
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default StoreCarousel;
