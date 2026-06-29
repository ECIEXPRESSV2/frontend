import React from 'react';
import { Filter } from 'lucide-react';
import CartItem from './CartItem';

interface CartProduct {
  id: number;
  name: string;
  description?: string;
  imageUrl: string;
  price: number;
  quantity: number;
}

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
        <h2 className="text-xl font-bold text-gray-900">Productos <span className="text-gray-400 font-medium">({products.length})</span></h2>
        <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-100 shadow-sm text-gray-700 font-medium text-sm hover:bg-yellow-50 hover:text-yellow-600 transition-all duration-300">
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
        <div className="text-center py-16 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/40">
          <p className="text-gray-500 font-medium">Tu carrito está vacío</p>
          <p className="text-sm text-gray-400 mt-1">Explora una tienda y añade productos para empezar.</p>
        </div>
      )}
    </div>
  );
};

export default CartList;
