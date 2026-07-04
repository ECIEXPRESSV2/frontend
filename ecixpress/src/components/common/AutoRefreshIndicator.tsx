import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { AUTO_REFRESH_END, AUTO_REFRESH_START } from '../../hooks/useRefreshOnScrollTop';

const AutoRefreshIndicator: React.FC = () => {
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    const onStart = () => setActiveCount((count) => count + 1);
    const onEnd = () => setActiveCount((count) => Math.max(0, count - 1));

    window.addEventListener(AUTO_REFRESH_START, onStart);
    window.addEventListener(AUTO_REFRESH_END, onEnd);
    return () => {
      window.removeEventListener(AUTO_REFRESH_START, onStart);
      window.removeEventListener(AUTO_REFRESH_END, onEnd);
    };
  }, []);

  if (activeCount === 0) return null;

  return (
    <div
      className="pointer-events-none fixed left-1/2 top-4 z-[120] flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-gray-200/70 bg-white/90 text-gray-500 shadow-lg shadow-gray-900/10 backdrop-blur-xl"
      role="status"
      aria-label="Actualizando"
      aria-live="polite"
    >
      <RefreshCw size={15} className="animate-spin" aria-hidden="true" />
    </div>
  );
};

export default AutoRefreshIndicator;
