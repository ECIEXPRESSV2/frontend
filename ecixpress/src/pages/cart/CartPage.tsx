import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import Stepper from '../../components/cart/Stepper';
import CartList from '../../components/cart/CartList';
import OrderSummary from '../../components/cart/OrderSummary';
import { useCart } from '../../hooks/useCart';

interface CartPageProps {
  onBack?: () => void;
  onContinue?: () => void;
  onOrdersClick?: () => void;
  onMessagesClick?: () => void;
}

const CartPage: React.FC<CartPageProps> = ({ onBack, onContinue }) => {
  const navigate = useNavigate();
  const [activeSidebarItem, setActiveSidebarItem] = useState('cart');
  
  // Hook personalizado para lógica del carrito (fácil de migrar a backend)
  const {
    cartProducts,
    loading,
    error,
    loadCart,
    updateQuantity,
    removeItem,
    calculateTotals
  } = useCart();

  // Cargar datos del carrito al montar el componente
  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const totals = calculateTotals();

  const handleContinue = () => {
    onContinue?.();
  };

  const steps = [
    { id: 'cart', label: 'Carrito' },
    { id: 'payment', label: 'Pago' },
    { id: 'details', label: 'Detalles' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      {/* Sidebar */}
      <Sidebar
        activeItem={activeSidebarItem}
        onItemClick={setActiveSidebarItem}
      />

      {/* Main Content */}
      <main className="app-shift px-6 pb-6 pt-20 md:px-8 md:pb-8">
        <div className="w-full space-y-8">
          {/* Back Button */}
          <button
            onClick={() => onBack?.() ?? navigate('/home')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 backdrop-blur-xl border border-white/40 text-gray-700 font-medium text-sm hover:bg-yellow-50 hover:text-yellow-600 transition-all duration-300"
          >
            <ArrowLeft size={16} />
            Volver
          </button>

          {/* Stepper */}
          <Stepper steps={steps} currentStep={0} />

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Product List */}
            <div className="lg:col-span-2">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Cargando carrito...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-red-500">{error}</p>
                </div>
              ) : (
                <CartList
                  products={cartProducts}
                  onQuantityChange={updateQuantity}
                  onRemove={removeItem}
                />
              )}
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <OrderSummary
                products={cartProducts}
                totals={totals}
                onContinue={handleContinue}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CartPage;
