import React, { useState } from 'react';
import { Filter } from 'lucide-react';
import ProductCard from '../home/ProductCard';

interface Product {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  rating: number;
  estimatedTime: string;
}

interface StoreProductsProps {
  products: Product[];
}

const StoreProducts: React.FC<StoreProductsProps> = ({ products }) => {
  const [filter, setFilter] = useState<'all' | 'popular' | 'rating'>('all');

  const filteredProducts = products.filter(product => {
    if (filter === 'all') return true;
    if (filter === 'popular') return product.rating >= 4.7;
    if (filter === 'rating') return product.rating >= 4.5;
    return true;
  });

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Productos</h2>
        
        {/* Filter Button */}
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 backdrop-blur-xl border border-white/40 text-gray-700 font-medium text-sm hover:bg-yellow-50 hover:text-yellow-600 transition-all duration-300">
          <Filter size={16} />
          Filtrar
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
            filter === 'all'
              ? 'bg-yellow-400 text-white shadow-md shadow-yellow-200/60'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilter('popular')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
            filter === 'popular'
              ? 'bg-yellow-400 text-white shadow-md shadow-yellow-200/60'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Populares
        </button>
        <button
          onClick={() => setFilter('rating')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
            filter === 'rating'
              ? 'bg-yellow-400 text-white shadow-md shadow-yellow-200/60'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Mejor valorados
        </button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            title={product.title}
            description={product.description}
            imageUrl={product.imageUrl}
            price={product.price}
            rating={product.rating}
            estimatedTime={product.estimatedTime}
            onAdd={() => console.log('Added to cart:', product.title)}
          />
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No hay productos que coincidan con el filtro.</p>
        </div>
      )}
    </section>
  );
};

export default StoreProducts;
