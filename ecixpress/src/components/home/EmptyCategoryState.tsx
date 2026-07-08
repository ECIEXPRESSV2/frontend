import React from 'react';
import { Sparkles, SearchX } from 'lucide-react';

interface EmptyCategoryStateProps {
  /** Mensaje principal; por defecto el copy de categorías "próximamente". */
  message?: string;
  variant?: 'soon' | 'search';
}

/**
 * Estado vacío elegante para categorías sin tiendas (o búsquedas sin resultados).
 * Panel glass discreto — nunca toasts, popups ni modales.
 */
const EmptyCategoryState: React.FC<EmptyCategoryStateProps> = ({
  message = 'Más tiendas estarán disponibles próximamente.',
  variant = 'soon',
}) => {
  const Icon = variant === 'search' ? SearchX : Sparkles;
  return (
    <div className="theme-surface mx-auto flex w-full max-w-xl flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-[var(--accent-200)] bg-white/50 px-6 py-9 text-center backdrop-blur-xl">
      <div className="theme-surface flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-100)] text-[var(--accent-600)]">
        <Icon size={22} aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-gray-700">{message}</p>
    </div>
  );
};

export default EmptyCategoryState;
