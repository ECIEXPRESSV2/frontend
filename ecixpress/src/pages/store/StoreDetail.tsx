import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import StoreHeader from '../../components/store/StoreHeader';
import StoreProducts from '../../components/store/StoreProducts';
import { getStoreById } from '../../mock/stores';

interface Product {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  rating: number;
  estimatedTime: string;
}

interface Store {
  id: number;
  name: string;
  imageUrl: string;
  rating: number;
  location: string;
  schedule: {
    weekdays: string;
    saturday: string;
  };
  products: Product[];
}

interface StoreDetailProps {
  storeId: number;
  onBack: () => void;
}

const StoreDetail: React.FC<StoreDetailProps> = ({ storeId, onBack }) => {
  const [activeSidebarItem, setActiveSidebarItem] = useState('home');
  const store: Store | undefined = getStoreById(storeId);

  if (!store) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Tienda no encontrada</h1>
          <button
            onClick={onBack}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold hover:from-yellow-500 hover:to-yellow-600 transition-all duration-300 shadow-md"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

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

          {/* Store Header */}
          <StoreHeader store={store} />

          {/* Products Section */}
          <StoreProducts products={store.products} />
        </div>
      </main>
    </div>
  );
};

export default StoreDetail;
