import React from 'react';
import { Trash2 } from 'lucide-react';

interface CartProduct {
  id: number;
  name: string;
  description?: string;
  imageUrl: string;
  price: number;
  quantity: number;
}

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
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
      {/* Image */}
      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-yellow-50">
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
      <div className="flex items-center gap-2 bg-gray-50 rounded-full p-1">
        <button
          onClick={() => onQuantityChange(id, Math.max(1, quantity - 1))}
          className="w-7 h-7 rounded-full bg-white shadow-sm hover:bg-gray-100 text-gray-700 font-semibold transition-colors flex items-center justify-center"
        >
          -
        </button>
        <span className="w-7 text-center font-semibold text-gray-900 text-sm">{quantity}</span>
        <button
          onClick={() => onQuantityChange(id, quantity + 1)}
          className="w-7 h-7 rounded-full bg-yellow-400 hover:bg-yellow-500 text-white font-semibold transition-colors flex items-center justify-center"
        >
          +
        </button>
      </div>

      {/* Remove Button */}
      <button
        onClick={() => onRemove(id)}
        className="w-10 h-10 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 transition-colors flex items-center justify-center"
        title="Eliminar"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
};

export default CartItem;
