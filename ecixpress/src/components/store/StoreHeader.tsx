import React from 'react';
import { MapPin } from 'lucide-react';
import StoreInfo from './StoreInfo';

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

interface StoreHeaderProps {
  store: Store;
}

const StoreHeader: React.FC<StoreHeaderProps> = ({ store }) => {
  return (
    <div className="rounded-2xl bg-white/60 backdrop-blur-xl shadow-sm overflow-hidden">
      <div className="flex flex-col lg:flex-row">
        {/* Image */}
        <div className="lg:w-1/2 h-64 lg:h-auto">
          <img
            src={store.imageUrl}
            alt={store.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info */}
        <div className="lg:w-1/2 p-6 lg:p-8">
          <StoreInfo store={store} showMap={false} />
        </div>
      </div>

      {/* Map Preview */}
      <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="text-center">
          <MapPin size={32} className="text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Mapa de ubicación</p>
          <p className="text-gray-400 text-xs">Próximamente</p>
        </div>
      </div>
    </div>
  );
};

export default StoreHeader;
