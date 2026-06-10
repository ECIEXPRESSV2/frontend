import React from 'react';
import { Star, MapPin } from 'lucide-react';

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

interface StoreInfoProps {
  store: Store;
  showMap?: boolean;
}

const StoreInfo: React.FC<StoreInfoProps> = ({ store, showMap = false }) => {
  return (
    <div className="space-y-4">
      {/* Name */}
      <h1 className="text-3xl font-bold text-gray-900">{store.name}</h1>
      
      {/* Rating */}
      <div className="flex items-center gap-2">
        <Star size={20} className="fill-yellow-400 text-yellow-400" />
        <span className="text-lg font-semibold text-gray-700">{store.rating}</span>
      </div>

      {/* Schedule */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-gray-600">
          <span className="font-medium">Lunes-Viernes:</span>
          <span>{store.schedule.weekdays}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <span className="font-medium">Sábado:</span>
          <span>{store.schedule.saturday}</span>
        </div>
      </div>

      {/* Location */}
      <div className="flex items-center gap-2 text-gray-600">
        <MapPin size={18} className="text-yellow-500" />
        <span>{store.location}</span>
      </div>

      {/* Map Preview */}
      {showMap && (
        <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center mt-4">
          <div className="text-center">
            <MapPin size={32} className="text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Mapa de ubicación</p>
            <p className="text-gray-400 text-xs">Próximamente</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreInfo;
