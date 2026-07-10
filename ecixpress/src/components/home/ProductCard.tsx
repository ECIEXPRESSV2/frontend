import React from 'react';
import { ShoppingCart, Star, Clock } from 'lucide-react';

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
    <div className="group relative rounded-xl bg-white border border-gray-100/80 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-200 overflow-hidden flex flex-col">
      {/* Image — square 1:1 */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
        <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-white/80 backdrop-blur-sm text-[10px] font-semibold text-gray-600 border border-white/60 shadow-sm">
          {description?.substring(0, 20)}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col p-3 pt-2">
        <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">
          {title}
        </h3>

        <div className="flex items-center gap-1.5 mt-1.5">
          <Star size={13} className="fill-amber-400 text-amber-400" />
          <span className="text-xs font-semibold text-gray-700">{rating}</span>
          <span className="text-[10px] text-gray-400 flex items-center gap-0.5 ml-auto">
            <Clock size={11} />
            {estimatedTime}
          </span>
        </div>

        <p className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
          ${price.toLocaleString()}
        </p>

        <div className="mt-2">
          <button
            onClick={onAdd}
            className="w-full py-2 rounded-lg bg-amber-400 text-white text-sm font-semibold shadow-sm hover:bg-amber-500 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
          >
            <ShoppingCart size={16} />
            Agregar al carrito
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
