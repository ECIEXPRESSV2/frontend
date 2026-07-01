import React from 'react';

interface CategoryTabsProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

/**
 * Una sola pieza "Cafetería / Papelería": no son dos botones, sino una frase cuyo color se
 * DIFUMINA. En Cafetería el amarillo (izquierda) se desvanece hacia el blanco de "papelería";
 * en Papelería, "cafetería" queda claro y "/ papelería" en azul. El cambio se hace con un
 * crossfade fluido entre dos capas de degradado. Cada mitad es la zona de clic de su categoría.
 */
const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  activeCategory,
  onCategoryChange,
}) => {
  const isFirst = activeCategory === categories[0];
  const label = `${categories[0]} / ${categories[1]}`;

  return (
    <div className="relative inline-flex items-center rounded-2xl border border-white/60 bg-white/80 px-5 py-2.5 shadow-lg backdrop-blur">
      <span className="relative whitespace-nowrap text-lg font-bold leading-none">
        {/* Reserva el ancho para que las capas absolutas tengan caja. */}
        <span className="invisible">{label}</span>
        {/* Capa Cafetería: amarillo → (blanco) */}
        <span
          className={`absolute inset-0 bg-gradient-to-r from-amber-400 via-amber-500 to-gray-400 bg-clip-text text-transparent transition-opacity duration-500 ease-out ${isFirst ? 'opacity-100' : 'opacity-0'}`}
          aria-hidden="true"
        >
          {label}
        </span>
        {/* Capa Papelería: (blanco) → azul */}
        <span
          className={`absolute inset-0 bg-gradient-to-r from-gray-400 via-[#5EC1D9] to-[#3FA7C2] bg-clip-text text-transparent transition-opacity duration-500 ease-out ${isFirst ? 'opacity-0' : 'opacity-100'}`}
          aria-hidden="true"
        >
          {label}
        </span>
      </span>

      {/* Zonas de clic: mitad izquierda = primera categoría, mitad derecha = segunda. */}
      <button
        type="button"
        aria-label={categories[0]}
        aria-pressed={isFirst}
        onClick={() => onCategoryChange(categories[0])}
        className="absolute inset-y-0 left-0 w-1/2 rounded-l-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
      />
      <button
        type="button"
        aria-label={categories[1]}
        aria-pressed={!isFirst}
        onClick={() => onCategoryChange(categories[1])}
        className="absolute inset-y-0 right-0 w-1/2 rounded-r-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
      />
    </div>
  );
};

export default CategoryTabs;
