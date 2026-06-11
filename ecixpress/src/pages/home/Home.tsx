import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/home/Sidebar';
import Banner from '../../components/home/Banner';
import StoreItem from '../../components/home/StoreItem';
import ProductCard from '../../components/home/ProductCard';
import CategoryTabs from '../../components/home/CategoryTabs';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('Cafetería');
  const [activeStore, setActiveStore] = useState(0);
  const [activeSidebarItem, setActiveSidebarItem] = useState('home');

  const categories = ['Cafetería', 'Papelería'];

  const stores = [
    { id: 1, name: 'Café Central', imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200&auto=format&fit=crop' },
    { id: 2, name: 'Pastelería Dulce', imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=200&auto=format&fit=crop' },
    { id: 3, name: 'Sandwich Express', imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=200&auto=format&fit=crop' },
    { id: 4, name: 'Pizza Hut', imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&auto=format&fit=crop' },
    { id: 5, name: 'Burger King', imageUrl: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=200&auto=format&fit=crop' },
  ];

  const products = [
    {
      id: 1,
      title: 'Cappuccino Italiano',
      description: 'Café espresso con leche espumada y un toque de cacao',
      imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&auto=format&fit=crop',
      price: 4.50,
      rating: 4.8,
      estimatedTime: '5 min'
    },
    {
      id: 2,
      title: 'Croissant de Almendra',
      description: 'Horneado fresco con relleno de crema de almendras',
      imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop',
      price: 3.75,
      rating: 4.6,
      estimatedTime: '3 min'
    },
    {
      id: 3,
      title: 'Sandwich Club',
      description: 'Pan tostado con pollo, bacon, lechuga y tomate',
      imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&auto=format&fit=crop',
      price: 8.50,
      rating: 4.7,
      estimatedTime: '8 min'
    },
    {
      id: 4,
      title: 'Mocha Latte',
      description: 'Café con chocolate y leche espumada',
      imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&auto=format&fit=crop',
      price: 5.25,
      rating: 4.9,
      estimatedTime: '6 min'
    },
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
          {/* Category Tabs */}
          <CategoryTabs
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />

          {/* Banner */}
          <Banner />

          {/* Stores Section */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Tiendas Populares</h2>
            <div className="flex justify-center gap-12 py-8 px-4">
              {stores.map((store, index) => (
                <StoreItem
                  key={store.id}
                  id={store.id}
                  name={store.name}
                  imageUrl={store.imageUrl}
                  isActive={activeStore === index}
                  onClick={() => {
                    setActiveStore(index);
                    navigate(`/store/${store.id}`);
                  }}
                />
              ))}
            </div>
          </section>

          {/* Products Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Productos Destacados</h2>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-lg bg-yellow-400 text-white font-medium text-sm">
                  Populares
                </button>
                <button className="px-4 py-2 rounded-lg text-gray-500 font-medium text-sm hover:text-gray-700">
                  Favoritos
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
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
          </section>
        </div>
      </main>
    </div>
  );
};

export default Home;
