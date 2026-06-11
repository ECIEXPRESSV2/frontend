import React from 'react';
import { Trash2 } from 'lucide-react';
import type { CartProduct } from '../../types/cart';

interface CartItemProps {
  product: CartProduct;
  onQuantityChange: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
}

const CartItem: React.FC<CartItemProps> = ({
  product,
  onQuantityChange,
  onRemove
}) => {
  const { id, name, description, imageUrl, price, quantity } = product;
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm hover:shadow-md transition-all duration-300">
      {/* Image */}
      <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
        {description && (
          <p className="text-sm text-gray-500 truncate">{description}</p>
        )}
        <p className="font-bold text-gray-900 mt-1">${price.toLocaleString()}</p>
      </div>

      {/* Quantity Selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onQuantityChange(id, Math.max(1, quantity - 1))}
          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors"
        >
          -
        </button>
        <span className="w-8 text-center font-semibold text-gray-900">{quantity}</span>
        <button
          onClick={() => onQuantityChange(id, quantity + 1)}
          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors"
        >
          +
        </button>
      </div>

      {/* Remove Button */}
      <button
        onClick={() => onRemove(id)}
        className="w-10 h-10 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors flex items-center justify-center"
        title="Eliminar"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
};

export default CartItem;
