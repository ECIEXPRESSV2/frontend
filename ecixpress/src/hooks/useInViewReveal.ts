import { useEffect, useRef, useState } from 'react';

interface UseInViewRevealOptions {
  threshold?: number;
  rootMargin?: string;
  /** Una vez visible, permanece visible (no vuelve a ocultarse al salir del viewport). */
  once?: boolean;
}

export function useInViewReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewRevealOptions = {}
) {
  const { threshold = 0.2, rootMargin, once = true } = options;
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, isVisible } as const;
}
