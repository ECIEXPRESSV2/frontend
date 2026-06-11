import React from 'react';
import { Filter } from 'lucide-react';
import CartItem from './CartItem';
import type { CartProduct } from '../../types/cart';

interface CartListProps {
  products: CartProduct[];
  onQuantityChange: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
}

const CartList: React.FC<CartListProps> = ({ products, onQuantityChange, onRemove }) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Productos ({products.length})</h2>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 backdrop-blur-xl border border-white/40 text-gray-700 font-medium text-sm hover:bg-yellow-50 hover:text-yellow-600 transition-all duration-300">
          <Filter size={16} />
          Filtrar
        </button>
      </div>

      {/* Products List */}
      <div className="space-y-3">
        {products.map((product) => (
          <CartItem
            key={product.id}
            product={product}
            onQuantityChange={onQuantityChange}
            onRemove={onRemove}
          />
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Tu carrito está vacío</p>
        </div>
      )}
    </div>
  );
};

export default CartList;
