import { useEffect, useRef } from 'react';

const AUTO_REFRESH_START = 'eciexpress:auto-refresh-start';
const AUTO_REFRESH_END = 'eciexpress:auto-refresh-end';
const OPEN_MODAL_SELECTOR = '[aria-modal="true"], [data-modal-root="true"]';

interface UseRefreshOnScrollTopOptions {
  disabled?: boolean;
  threshold?: number;
  cooldownMs?: number;
  pullDistance?: number;
}

export function useRefreshOnScrollTop(
  onRefresh: () => void | Promise<void>,
  {
    disabled = false,
    threshold = 8,
    cooldownMs = 2500,
    pullDistance = 90,
  }: UseRefreshOnScrollTopOptions = {},
) {
  const refreshRef = useRef(onRefresh);
  const lastRefreshAtRef = useRef(0);
  const runningRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (disabled) return undefined;

    const resetPull = () => {
      pullDistanceRef.current = 0;
      touchStartYRef.current = null;
    };

    const hasOpenModal = () => document.querySelector(OPEN_MODAL_SELECTOR) !== null;

    const runRefresh = () => {
      const now = Date.now();
      if (runningRef.current || now - lastRefreshAtRef.current <= cooldownMs) return;

      runningRef.current = true;
      resetPull();
      lastRefreshAtRef.current = now;
      window.dispatchEvent(new CustomEvent(AUTO_REFRESH_START));

      Promise.resolve(refreshRef.current())
        .finally(() => {
          runningRef.current = false;
          window.dispatchEvent(new CustomEvent(AUTO_REFRESH_END));
        });
    };

    const handleScroll = () => {
      if (hasOpenModal() || window.scrollY > threshold) resetPull();
    };

    const handleWheel = (event: WheelEvent) => {
      if (hasOpenModal()) {
        resetPull();
        return;
      }

      if (window.scrollY > threshold || event.deltaY >= 0) {
        resetPull();
        return;
      }

      pullDistanceRef.current += Math.abs(event.deltaY);
      if (pullDistanceRef.current >= pullDistance) runRefresh();
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (hasOpenModal()) {
        resetPull();
        return;
      }

      touchStartYRef.current = window.scrollY <= threshold
        ? event.touches[0]?.clientY ?? null
        : null;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (hasOpenModal()) {
        resetPull();
        return;
      }

      if (touchStartYRef.current === null || window.scrollY > threshold) return;

      const currentY = event.touches[0]?.clientY;
      if (currentY === undefined) return;

      if (currentY - touchStartYRef.current >= pullDistance) {
        touchStartYRef.current = null;
        runRefresh();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [cooldownMs, disabled, pullDistance, threshold]);
}

export { AUTO_REFRESH_END, AUTO_REFRESH_START };
