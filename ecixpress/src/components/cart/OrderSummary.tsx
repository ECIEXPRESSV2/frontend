import React from 'react';
import type { CartProduct, CartTotals } from '../../types/cart';

interface OrderSummaryProps {
  products: CartProduct[];
  totals: CartTotals;
  onContinue: () => void;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  products,
  totals,
  onContinue
}) => {
  const { subtotal, discount, total } = totals;
  return (
    <div className="rounded-2xl bg-white/60 backdrop-blur-xl shadow-sm p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Resumen del Pedido</h2>

      {/* Product List */}
      <div className="space-y-3">
        {products.map((product) => (
          <div key={product.id} className="flex justify-between items-center">
            <div className="flex-1">
              <p className="font-medium text-gray-900">{product.name}</p>
              <p className="text-sm text-gray-500">x{product.quantity}</p>
            </div>
            <p className="font-semibold text-gray-900">
              ${(product.price * product.quantity).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Totals */}
      <div className="space-y-2">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>${subtotal.toLocaleString()}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Descuentos</span>
            <span>-${discount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
          <span>Total</span>
          <span>${total.toLocaleString()}</span>
        </div>
      </div>

      {/* Continue Button */}
      <button
        onClick={onContinue}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold hover:from-yellow-500 hover:to-yellow-600 transition-all duration-300 shadow-md shadow-yellow-200/60"
      >
        Continuar
      </button>

      {/* Info Message */}
      <p className="text-xs text-gray-500 text-center">
        Al continuar, podrás elegir tu método de pago y dirección de entrega.
      </p>
    </div>
  );
};

export default OrderSummary;
