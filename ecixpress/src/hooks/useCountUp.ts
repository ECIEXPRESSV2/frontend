import { useEffect, useRef, useState } from 'react';

interface UseCountUpOptions {
  target: number;
  /** Valor inicial antes de la primera animación. */
  start?: number;
  /** Gate: no anima hasta que sea true (p.ej. isVisible de un IntersectionObserver). */
  isActive?: boolean;
  duration?: number;
}

/**
 * Anima un número hacia `target` con easing cúbico. Si `target` cambia mientras
 * ya está activo, retoma el tween desde el valor actual (útil para tickers en vivo).
 * Respeta prefers-reduced-motion saltando directo al valor final.
 */
export function useCountUp({ target, start = 0, isActive = true, duration = 1600 }: UseCountUpOptions) {
  const [value, setValue] = useState(start);
  const fromRef = useRef(start);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!isActive) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = fromRef.current;
    const to = target;

    if (prefersReduced || from === to) {
      setValue(to);
      fromRef.current = to;
      return;
    }

    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
     
  }, [target, isActive, duration]);

  return value;
}
