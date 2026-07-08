import React from 'react';
import { HOME_SECTIONS, type SectionId } from './homeSections';

interface SectionToggleProps {
  active: SectionId;
  onChange: (section: SectionId) => void;
}

/**
 * Toggle "Comida / Tienda" integrado con el lenguaje del Home: base glass sin borde visible
 * y un "thumb" deslizante que usa los MISMOS tokens de acento que las demás píldoras
 * (--accent-300/400), así que en Comida es amarillo suave y en Tienda azul, igual que el
 * resto de la página. El thumb se desliza a la mitad activa y su color cruza con el tema.
 */
const SectionToggle: React.FC<SectionToggleProps> = ({ active, onChange }) => {
  const isComida = active === 'comida';

  const labelClass = (isActive: boolean) =>
    `relative z-10 rounded-full px-6 py-2.5 text-lg font-bold transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] ${
      isActive ? 'text-gray-950' : 'text-gray-400 hover:text-gray-600'
    }`;

  return (
    <div className="theme-surface group relative inline-grid grid-cols-2 items-center overflow-hidden rounded-full border border-transparent bg-white/40 shadow-[0_8px_24px_rgb(var(--accent-rgb)/0.20)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgb(var(--accent-rgb)/0.30)]">
      {/* Thumb deslizante: ocupa la mitad activa con el gradiente de acento del tema. */}
      <div
        aria-hidden="true"
        className={`theme-surface absolute inset-y-0 w-1/2 rounded-full bg-[linear-gradient(135deg,var(--accent-300),var(--accent-400))] shadow-[0_6px_16px_rgb(var(--accent-rgb)/0.35)] transition-transform duration-500 ease-out ${
          isComida ? 'translate-x-0' : 'translate-x-full'
        }`}
      />

      <button type="button" aria-pressed={isComida} onClick={() => onChange('comida')} className={labelClass(isComida)}>
        {HOME_SECTIONS.comida.label}
      </button>
      <button type="button" aria-pressed={!isComida} onClick={() => onChange('tienda')} className={labelClass(!isComida)}>
        {HOME_SECTIONS.tienda.label}
      </button>
    </div>
  );
};

export default SectionToggle;
