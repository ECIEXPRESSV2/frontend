import React from 'react';

interface CartProduct {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

interface CartTotals {
  subtotal: number;
  discount: number;
  total: number;
}

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
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-6 sticky top-6">
      <h2 className="text-lg font-bold text-gray-900">Resumen del Pedido</h2>

      {/* Product List */}
      <div className="space-y-3 max-h-60 overflow-auto pr-1">
        {products.map((product) => (
          <div key={product.id} className="flex justify-between items-center text-sm">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{product.name}</p>
              <p className="text-xs text-gray-400">x{product.quantity}</p>
            </div>
            <p className="font-semibold text-gray-900 whitespace-nowrap">
              ${(product.price * product.quantity).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Totals */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Subtotal</span>
          <span>${subtotal.toLocaleString()}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm font-medium text-green-600">
            <span>Descuentos</span>
            <span>-${discount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between items-baseline text-gray-900 pt-2 border-t border-gray-100">
          <span className="font-bold">Total</span>
          <span className="text-xl font-bold">${total.toLocaleString()}</span>
        </div>
      </div>

      {/* Continue Button */}
      <button
        onClick={onContinue}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold hover:from-yellow-500 hover:to-yellow-600 transition-all duration-300 shadow-md shadow-yellow-300/50 hover:shadow-yellow-300/70"
      >
        Continuar
      </button>

      {/* Info Message */}
      <p className="text-xs text-gray-400 text-center">
        Al continuar, podrás elegir tu método de pago y dirección de entrega.
      </p>
    </div>
  );
};

export default OrderSummary;
