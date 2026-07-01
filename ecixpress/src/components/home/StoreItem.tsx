import React from 'react';

interface StoreItemProps {
  id: number;
  name: string;
  imageUrl: string;
  /** Imagen de respaldo si `imageUrl` no carga (p. ej. el logo aún no está subido → 404). */
  fallbackUrl?: string;
  isActive?: boolean;
  onClick?: () => void;
}

const StoreItem: React.FC<StoreItemProps> = ({
  id,
  name,
  imageUrl,
  fallbackUrl,
  isActive = false,
  onClick
}) => {
  return (
    <button
      onClick={onClick}
      data-store-id={id}
      className={`flex flex-col items-center gap-2 transition-all duration-300 ease-in-out group
        ${isActive ? 'scale-110' : 'hover:scale-105'}`}
    >
      <div className={`relative w-32 h-32 rounded-full overflow-hidden border-2 transition-all duration-300 ease-in-out
        ${isActive 
          ? 'border-yellow-400 shadow-lg shadow-yellow-200/60' 
          : 'border-gray-200 group-hover:border-yellow-300 group-hover:shadow-md'
        }`}>
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Si el logo no existe (404), caemos a la imagen de respaldo una sola vez.
            const img = e.currentTarget;
            if (fallbackUrl && img.src !== fallbackUrl) img.src = fallbackUrl;
          }}
        />
        {isActive && (
          <div className="absolute inset-0 bg-yellow-400/20" />
        )}
      </div>
      <span className={`text-base font-medium transition-colors duration-300
        ${isActive ? 'text-yellow-600' : 'text-gray-600 group-hover:text-gray-900'}`}>
        {name}
      </span>
    </button>
  );
};

export default StoreItem;
