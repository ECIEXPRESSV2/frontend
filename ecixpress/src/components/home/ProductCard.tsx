import React from 'react';
import { Clock, Star, Plus } from 'lucide-react';

interface ProductCardProps {
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  rating: number;
  estimatedTime: string;
  onAdd?: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  title,
  description,
  imageUrl,
  price,
  rating,
  estimatedTime,
  onAdd
}) => {
  return (
    <div className="group relative rounded-2xl bg-white/60 backdrop-blur-xl shadow-sm hover:shadow-lg transition-all duration-300 ease-in-out hover:scale-105 overflow-hidden">
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{description}</p>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-3">
          <Star size={16} className="fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-medium text-gray-700">{rating}</span>
        </div>

        {/* Price and Time */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-bold text-gray-900">${price}</span>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Clock size={14} />
            <span>{estimatedTime}</span>
          </div>
        </div>

        {/* Add Button */}
        <button
          onClick={onAdd}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold hover:from-yellow-500 hover:to-yellow-600 transition-all duration-300 ease-in-out shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Agregar
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
