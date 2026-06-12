import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Sidebar from '../../components/home/Sidebar';
import Banner from '../../components/home/Banner';
import StoreItem from '../../components/home/StoreItem';
import ProductCard from '../../components/home/ProductCard';
import CategoryTabs from '../../components/home/CategoryTabs';
import { useAuth } from '../../context/AuthContext';
import { getAvailableStores, type Store } from '../../services/storeService';

const FALLBACK_PRODUCTS = [
  { id: 1, title: 'Cappuccino Italiano', description: 'Café espresso con leche espumada', imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&auto=format&fit=crop', price: 4.50, rating: 4.8, estimatedTime: '5 min' },
  { id: 2, title: 'Croissant de Almendra', description: 'Horneado fresco con relleno de crema', imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop', price: 3.75, rating: 4.6, estimatedTime: '3 min' },
  { id: 3, title: 'Sandwich Club', description: 'Pan tostado con pollo y vegetales', imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&auto=format&fit=crop', price: 8.50, rating: 4.7, estimatedTime: '8 min' },
  { id: 4, title: 'Mocha Latte', description: 'Café con chocolate y leche espumada', imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&auto=format&fit=crop', price: 5.25, rating: 4.9, estimatedTime: '6 min' },
];

const STORE_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200&auto=format&fit=crop';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [activeCategory, setActiveCategory] = useState('Cafetería');
  const [activeStore, setActiveStore] = useState(0);
  const [activeSidebarItem, setActiveSidebarItem] = useState('home');
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);

  const categories = ['Cafetería', 'Papelería'];

  useEffect(() => {
    const loadStores = async () => {
      try {
        const token = await getToken().catch(() => null);
        const data = await getAvailableStores(token);
        setStores(data);
      } catch (err) {
        toast.error('No se pudieron cargar las tiendas');
      } finally {
        setLoadingStores(false);
      }
    };
    loadStores();
  }, []);

  const filteredStores = stores.filter(s => {
    if (activeCategory === 'Cafetería') return s.type === 'CAFETERIA' || s.type === 'RESTAURANTE';
    if (activeCategory === 'Papelería') return s.type === 'PAPELERIA';
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <Sidebar activeItem={activeSidebarItem} onItemClick={setActiveSidebarItem} />

      <main className="ml-16 p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <CategoryTabs
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />

          <Banner />

          {/* Stores Section */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Tiendas Disponibles</h2>
            {loadingStores ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredStores.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">No hay tiendas disponibles en esta categoría.</p>
            ) : (
              <div className="flex flex-wrap gap-8 py-4 px-4">
                {filteredStores.map((store, index) => (
                  <StoreItem
                    key={store.id}
                    id={store.id as unknown as number}
                    name={store.name}
                    imageUrl={store.imageUrl || STORE_FALLBACK_IMAGE}
                    isActive={activeStore === index}
                    onClick={() => {
                      setActiveStore(index);
                      navigate(`/store/${store.id}`);
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Products Section — datos del catálogo (otro microservicio) */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Productos Destacados</h2>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-lg bg-yellow-400 text-white font-medium text-sm">
                  Populares
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {FALLBACK_PRODUCTS.map((product) => (
                <ProductCard
                  key={product.id}
                  title={product.title}
                  description={product.description}
                  imageUrl={product.imageUrl}
                  price={product.price}
                  rating={product.rating}
                  estimatedTime={product.estimatedTime}
                  onAdd={() => toast.info(`${product.title} agregado`)}
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
