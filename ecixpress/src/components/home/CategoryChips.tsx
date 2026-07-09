import React from 'react';

export interface ChipOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface CategoryChipsProps {
  chips: ChipOption[];
  /** Chip activo; null = sin filtro (se muestran todas las tiendas de la sección). */
  activeId: string | null;
  /** Clic en el chip activo lo deselecciona (vuelve a "todas"). */
  onToggle: (id: string) => void;
}

/** Fila de filtros por categoría: píldoras glass centradas bajo el título de la sección. */
const CategoryChips: React.FC<CategoryChipsProps> = ({ chips, activeId, onToggle }) => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Filtrar tiendas por categoría">
      {chips.map((chip) => {
        const isActive = chip.id === activeId;
        return (
          <button
            key={chip.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onToggle(chip.id)}
            className={`theme-surface inline-flex min-h-9 items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] ${
              isActive
                ? 'border-transparent bg-[var(--accent-400)] font-semibold text-gray-950 shadow-[0_6px_16px_rgb(var(--accent-rgb)/0.35)]'
                : 'border-white/40 bg-white/40 font-medium text-gray-400 backdrop-blur-xl hover:bg-white/70 hover:text-gray-600 hover:shadow-sm'
            }`}
          >
            {chip.icon}
            {chip.label}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryChips;
