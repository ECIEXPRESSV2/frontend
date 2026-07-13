import React from 'react';

interface StoreItemProps {
  id: number;
  name: string;
  imageUrl: string;
  /** Imagen de respaldo si `imageUrl` no carga (p. ej. el logo aún no está subido → 404). */
  fallbackUrl?: string;
  isActive?: boolean;
  /** `sm` = círculos compactos del carrusel del Home; `md` = tamaño original. */
  size?: 'md' | 'sm';
  /** La tienda está cerrada / fuera de horario: se atenúa y se muestra un badge. */
  closed?: boolean;
  /** Etiqueta del badge cuando `closed` (p. ej. "Fuera de horario", "Cerrado"). */
  closedLabel?: string;
  onClick?: () => void;
}

const SIZE_CLASSES = {
  md: { button: 'w-[134px]', circle: 'w-[134px] h-[134px]' },
  sm: { button: 'w-[96px]', circle: 'w-[96px] h-[96px]' },
} as const;

const StoreItem: React.FC<StoreItemProps> = ({
  id,
  name,
  imageUrl,
  fallbackUrl,
  isActive = false,
  size = 'md',
  closed = false,
  closedLabel = 'Cerrado',
  onClick
}) => {
  const sizes = SIZE_CLASSES[size];
  return (
    <button
      onClick={onClick}
      data-store-id={id}
      className={`flex ${sizes.button} flex-col items-center gap-2 transition-all duration-300 ease-in-out group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] rounded-2xl
        ${isActive ? 'scale-110' : 'hover:scale-105'}`}
    >
      <div className={`theme-surface relative ${sizes.circle} rounded-full overflow-hidden border-2 transition-all duration-300 ease-in-out
        ${isActive
          ? 'border-[var(--accent-400)] shadow-[0_10px_22px_rgb(var(--accent-rgb)/0.35)]'
          : 'border-gray-200 group-hover:border-[var(--accent-300)] group-hover:shadow-md'
        }`}>
        <img
          src={imageUrl}
          alt={name}
          className={`w-full h-full object-cover ${closed ? 'grayscale opacity-60' : ''}`}
          onError={(e) => {
            // Si el logo no existe (404), caemos a la imagen de respaldo una sola vez.
            const img = e.currentTarget;
            if (fallbackUrl && img.src !== fallbackUrl) img.src = fallbackUrl;
          }}
        />
        {isActive && (
          <div className="absolute inset-0 bg-[rgb(var(--accent-rgb)/0.18)]" />
        )}
        {closed && (
          <div className="absolute inset-0 flex items-end justify-center bg-black/25 pb-1.5">
            <span className="max-w-[92%] truncate rounded-full bg-red-600/95 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white shadow-sm">
              {closedLabel}
            </span>
          </div>
        )}
      </div>
      <span className={`max-w-full truncate text-center text-sm font-medium transition-colors duration-300
        ${isActive ? 'text-[var(--accent-600)]' : 'text-gray-600 group-hover:text-gray-900'}`}>
        {name}
      </span>
    </button>
  );
};

export default StoreItem;
