import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import Stepper from '../../components/cart/Stepper';
import CartList from '../../components/cart/CartList';
import OrderSummary from '../../components/cart/OrderSummary';

interface CartProduct {
  id: number;
  name: string;
  description?: string;
  imageUrl: string;
  price: number;
  quantity: number;
}

interface CartPageProps {
  onBack: () => void;
  onContinue: () => void;
}

const CartPage: React.FC<CartPageProps> = ({ onBack, onContinue }) => {
  const [activeSidebarItem, setActiveSidebarItem] = useState('cart');
  
  // Mock data - fácil de reemplazar con datos del backend
  const [cartProducts, setCartProducts] = useState<CartProduct[]>([
    {
      id: 1,
      name: 'Combo Hamburguesa',
      description: 'Hamburguesa con papas y gaseosa',
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&auto=format&fit=crop',
      price: 15000,
      quantity: 1
    },
    {
      id: 2,
      name: 'Té Hatsu',
      description: 'Té verde con limón',
      imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=200&auto=format&fit=crop',
      price: 5000,
      quantity: 2
    },
    {
      id: 3,
      name: 'Chicles Trident',
      description: 'Paquete de chicles menta',
      imageUrl: 'https://images.unsplash.com/photo-1589496933738-9c4f9b6c5a6a?w=200&auto=format&fit=crop',
      price: 2500,
      quantity: 1
    }
  ]);

  const handleQuantityChange = (id: number, quantity: number) => {
    setCartProducts(products =>
      products.map(product =>
        product.id === id ? { ...product, quantity } : product
      )
    );
  };

  const handleRemove = (id: number) => {
    setCartProducts(products => products.filter(product => product.id !== id));
  };

  const calculateTotals = () => {
    const subtotal = cartProducts.reduce((sum, product) => sum + (product.price * product.quantity), 0);
    const discount = 0; // Se puede agregar lógica de descuentos
    const total = subtotal - discount;
    return { subtotal, discount, total };
  };

  const { subtotal, discount, total } = calculateTotals();

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
      <main className="ml-16 p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Back Button */}
          <button
            onClick={onBack}
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
              <CartList
                products={cartProducts}
                onQuantityChange={handleQuantityChange}
                onRemove={handleRemove}
              />
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <OrderSummary
                products={cartProducts}
                subtotal={subtotal}
                discount={discount}
                total={total}
                onContinue={onContinue}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CartPage;
