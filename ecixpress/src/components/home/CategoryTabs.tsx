import React from 'react';

interface CategoryTabsProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

/**
 * Una sola pieza "Cafetería   Papelería" (sin barra): el color va en el FONDO, no en las letras
 * (que quedan siempre en blanco). El color de la categoría activa llena su mitad y se difumina
 * hacia un gris neutro justo en el centro — ese límite de color hace las veces del "/". Cafetería
 * pinta el fondo de amarillo; Papelería, de azul. El cambio es un crossfade fluido entre dos capas.
 */
const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  activeCategory,
  onCategoryChange,
}) => {
  const isFirst = activeCategory === categories[0];

  return (
    <div className="relative inline-flex items-center overflow-hidden rounded-2xl border border-white/60 shadow-lg backdrop-blur">
      {/* Fondo Cafetería: amarillo (izquierda) → gris neutro a partir del centro. */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 transition-opacity duration-500 ease-out ${isFirst ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'linear-gradient(to right, #FBBF24 0%, #F59E0B 44%, #9ca3af 58%, #9ca3af 100%)' }}
      />
      {/* Fondo Papelería: gris neutro (izquierda) → azul a partir del centro. */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 transition-opacity duration-500 ease-out ${isFirst ? 'opacity-0' : 'opacity-100'}`}
        style={{ background: 'linear-gradient(to right, #9ca3af 0%, #9ca3af 42%, #5EC1D9 56%, #3FA7C2 100%)' }}
      />

      {/* Letras (siempre blancas). El hueco central reemplaza al "/": el límite de color lo representa. */}
      <span className="relative z-10 flex items-center gap-7 whitespace-nowrap px-6 py-2.5 text-lg font-bold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.18)]">
        <span>{categories[0]}</span>
        <span>{categories[1]}</span>
      </span>

      {/* Zonas de clic: mitad izquierda = primera categoría, mitad derecha = segunda. */}
      <button
        type="button"
        aria-label={categories[0]}
        aria-pressed={isFirst}
        onClick={() => onCategoryChange(categories[0])}
        className="absolute inset-y-0 left-0 z-20 w-1/2 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
      />
      <button
        type="button"
        aria-label={categories[1]}
        aria-pressed={!isFirst}
        onClick={() => onCategoryChange(categories[1])}
        className="absolute inset-y-0 right-0 z-20 w-1/2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
      />
    </div>
  );
};

export default CategoryTabs;
