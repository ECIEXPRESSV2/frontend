import React from 'react';

interface StoreItemProps {
  id: number;
  name: string;
  imageUrl: string;
  isActive?: boolean;
  onClick?: () => void;
}

const StoreItem: React.FC<StoreItemProps> = ({ 
  id,
  name, 
  imageUrl, 
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
