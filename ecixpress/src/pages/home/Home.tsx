import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MessageCircle, PackageCheck, Store as StoreIcon } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import Banner from '../../components/home/Banner';
import StoreItem from '../../components/home/StoreItem';
import ProductCard from '../../components/home/ProductCard';
import CategoryTabs from '../../components/home/CategoryTabs';
import { OrderProgressTimeline, isActiveOrder } from '../../components/orders/OrderProgressTimeline';
import { useAuth } from '../../context/AuthContext';
import { useOrdersApi } from '../../hooks/useOrdersApi';
import type { OrderResponse } from '../../lib/orders-api';
import { formatCOP } from '../../lib/format';
import { statusLabel, statusTone } from '../../lib/orders-ui';
import { getAvailableStores, type Store } from '../../services/storeService';
import { getStoreImage } from '../../services/storeImageStore';

const FALLBACK_PRODUCTS = [
  { id: 1, title: 'Cappuccino Italiano', description: 'Café espresso con leche espumada', imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&auto=format&fit=crop', price: 4.50, rating: 4.8, estimatedTime: '5 min' },
  { id: 2, title: 'Croissant de Almendra', description: 'Horneado fresco con relleno de crema', imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop', price: 3.75, rating: 4.6, estimatedTime: '3 min' },
  { id: 3, title: 'Sandwich Club', description: 'Pan tostado con pollo y vegetales', imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&auto=format&fit=crop', price: 8.50, rating: 4.7, estimatedTime: '8 min' },
  { id: 4, title: 'Mocha Latte', description: 'Café con chocolate y leche espumada', imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&auto=format&fit=crop', price: 5.25, rating: 4.9, estimatedTime: '6 min' },
];

const STORE_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200&auto=format&fit=crop';

interface HomeProps {
  onUserClick?: () => void;
  onCartClick?: () => void;
  onOrdersClick?: () => void;
  onMessagesClick?: () => void;
  onStoreClick?: (storeId: number) => void;
}

const Home: React.FC<HomeProps> = ({ onUserClick, onCartClick, onOrdersClick, onMessagesClick, onStoreClick }) => {
  const navigate = useNavigate();
  const { getToken, userProfile } = useAuth();
  const ordersApi = useOrdersApi();
  const [activeCategory, setActiveCategory] = useState('Cafetería');
  const [activeStore, setActiveStore] = useState(0);
  const [activeSidebarItem, setActiveSidebarItem] = useState('home');
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const categories = ['Cafetería', 'Papelería'];

  useEffect(() => {
    const loadStores = async () => {
      try {
        const token = await getToken().catch(() => null);
        const data = await getAvailableStores(token);
        setStores(data);
      } catch {
        toast.error('No se pudieron cargar las tiendas');
      } finally {
        setLoadingStores(false);
      }
    };
    void loadStores();
  }, [getToken]);

  useEffect(() => {
    if (!userProfile?.id) return;
    let active = true;
    const loadOrders = async () => {
      setLoadingOrders(true);
      try {
        const data = await ordersApi.getOrders({ customerId: userProfile.id });
        if (active) setOrders(data);
      } catch {
        if (active) setOrders([]);
      } finally {
        if (active) setLoadingOrders(false);
      }
    };
    void loadOrders();
    return () => { active = false; };
  }, [ordersApi, userProfile?.id]);

  const filteredStores = stores.filter(s => {
    if (activeCategory === 'Cafetería') return s.type === 'CAFETERIA' || s.type === 'RESTAURANTE';
    if (activeCategory === 'Papelería') return s.type === 'PAPELERIA';
    return true;
  });

  const activeOrder = useMemo(
    () =>
      orders
        .filter((order) => isActiveOrder(order.status))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] ?? null,
    [orders],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <Sidebar
        activeItem={activeSidebarItem}
        onItemClick={setActiveSidebarItem}
        onUserClick={onUserClick}
        onCartClick={onCartClick}
        onOrdersClick={onOrdersClick}
        onMessagesClick={onMessagesClick}
      />

      <main className="ml-16 px-6 pb-6 pt-20 md:px-8 md:pb-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <CategoryTabs
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />

          <Banner />

          {loadingOrders ? (
            <section className="rounded-[28px] border border-white/70 bg-white/75 p-5 shadow-lg shadow-gray-200/50 backdrop-blur-xl">
              <div className="h-5 w-40 animate-pulse rounded-full bg-gray-100" />
              <div className="mt-4 h-28 animate-pulse rounded-3xl bg-amber-50/70" />
            </section>
          ) : activeOrder ? (
            <ActiveOrderCard
              order={activeOrder}
              onOpen={() => navigate(`/orders?orderId=${activeOrder.id}`)}
              onChat={() => navigate(`/messages?orderId=${activeOrder.id}`)}
            />
          ) : null}

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
                    imageUrl={getStoreImage(String(store.id)) || store.imageUrl || STORE_FALLBACK_IMAGE}
                    isActive={activeStore === index}
                    onClick={() => {
                      setActiveStore(index);
                      if (onStoreClick) {
                        onStoreClick(Number(store.id));
                      } else {
                        navigate(`/store/${store.id}`);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </section>

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

const ActiveOrderCard: React.FC<{
  order: OrderResponse;
  onOpen: () => void;
  onChat: () => void;
}> = ({ order, onOpen, onChat }) => {
  const firstItem = order.items[0];
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <section className="rounded-[28px] border border-yellow-200/80 bg-[linear-gradient(135deg,#fff7d6_0%,#ffffff_55%,#fffbeb_100%)] p-5 shadow-lg shadow-yellow-200/40">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-stretch">
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400 text-gray-950 shadow-sm">
                <PackageCheck size={22} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-600">Pedido activo</p>
                <h2 className="text-xl font-black text-gray-950">{order.storeName}</h2>
                <p className="mt-1 text-sm text-gray-500">Pedido #{order.orderNumber.slice(-4)} · {itemCount} producto{itemCount === 1 ? '' : 's'}</p>
              </div>
            </div>
            <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${statusTone[order.status]}`}>
              {statusLabel[order.status]}
            </span>
          </div>

          <OrderProgressTimeline order={order} variant="compact" />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-gray-950 transition hover:bg-yellow-500"
            >
              Ver resumen
            </button>
            <button
              type="button"
              onClick={onChat}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-black text-amber-700 transition hover:bg-yellow-50"
            >
              <MessageCircle size={16} /> Chat
            </button>
          </div>
        </div>

        <aside className="rounded-3xl border border-white bg-white/85 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-gray-950">
            <StoreIcon size={16} className="text-amber-600" />
            En preparación
          </div>
          <div className="flex items-center gap-3">
            {firstItem?.imageUrl ? (
              <img src={firstItem.imageUrl} alt={firstItem.name} className="h-16 w-16 rounded-2xl object-contain" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-xl font-black text-amber-700">
                {firstItem?.name.trim()[0]?.toUpperCase() ?? 'P'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-black text-gray-950">{firstItem?.name ?? 'Pedido ECIExpress'}</p>
              <p className="text-sm text-gray-500">
                {firstItem ? `x${firstItem.quantity}` : `${itemCount} productos`}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
            <span className="text-sm text-gray-500">Total</span>
            <span className="text-lg font-black text-gray-950">{formatCOP(order.totalAmount)}</span>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default Home;
