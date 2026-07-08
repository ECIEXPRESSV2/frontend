import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Search } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import SectionToggle from '../../components/home/SectionToggle';
import HeroBanner from '../../components/home/HeroBanner';
import OurStoresSection from '../../components/home/OurStoresSection';
import ActiveOrderBanner from '../../components/home/ActiveOrderBanner';
import AppPromoSection from '../../components/home/AppPromoSection';
import FeaturedProductsSection from '../../components/home/FeaturedProductsSection';
import HomeFooter from '../../components/home/HomeFooter';
import { HOME_SECTIONS, type SectionId } from '../../components/home/homeSections';
import { isActiveOrder } from '../../components/orders/OrderProgressTimeline';
import { useAuth } from '../../context/AuthContext';
import { useOrdersApi } from '../../hooks/useOrdersApi';
import type { OrderResponse } from '../../lib/orders-api';
import { getAvailableStores, type Store } from '../../services/storeService';
import { getStoreLogoUrl } from '../../services/storeAssets';
import { useFavorites } from '../../hooks/useFavorites';
import { useRefreshOnScrollTop } from '../../hooks/useRefreshOnScrollTop';

const StoreMapModal = lazy(() => import('../../components/store/StoreMapModal'));

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
  const [activeSection, setActiveSection] = useState<SectionId>('comida');
  const [activeSidebarItem, setActiveSidebarItem] = useState('home');
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  // Búsqueda de tiendas (barra superior, al nivel de la bolita del usuario).
  const [storeQuery, setStoreQuery] = useState('');
  const [homeSearchFocused, setHomeSearchFocused] = useState(false);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  // Modal de mapa que abre el CTA "Nuevo pedido" del banner (el Sidebar tiene el suyo propio).
  const [mapOpen, setMapOpen] = useState(false);

  const section = HOME_SECTIONS[activeSection];
  const firstName = (userProfile?.fullName || userProfile?.email || 'Usuario').trim().split(/\s+/)[0] || 'Usuario';

  const loadStores = useCallback(async ({ showLoading = false } = {}) => {
    if (showLoading) setLoadingStores(true);
    try {
      const token = await getToken().catch(() => null);
      const data = await getAvailableStores(token);
      setStores(data);
    } catch {
      toast.error('No se pudieron cargar las tiendas');
    } finally {
      setLoadingStores(false);
    }
  }, [getToken]);

  const loadOrders = useCallback(async () => {
    if (!userProfile?.id) return;
    setLoadingOrders(true);
    try {
      const data = await ordersApi.getOrders({ customerId: userProfile.id });
      setOrders(data);
    } catch {
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, [ordersApi, userProfile?.id]);

  useEffect(() => {
    void loadStores({ showLoading: true });
  }, [loadStores]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useRefreshOnScrollTop(async () => {
    await Promise.allSettled([loadStores(), loadOrders()]);
  }, { disabled: loadingStores || loadingOrders });

  const { favorites } = useFavorites();
  const query = storeQuery.trim();

  const activeOrder = useMemo(
    () =>
      orders
        .filter((order) => isActiveOrder(order.status))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] ?? null,
    [orders],
  );

  const handleStoreClick = (store: Store) => {
    if (onStoreClick) onStoreClick(Number(store.id));
    else navigate(`/store/${store.id}`);
  };

  return (
    // data-theme en el RAÍZ: al elegir "Tienda" toda la página (incluidos Sidebar y la
    // cápsula superior, hijos DOM de este div) pasa del amarillo al azul vía los tokens
    // --accent-* y las variables yellow/amber redefinidas en index.css.
    <div
      className="theme-surface min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100"
      data-theme={activeSection === 'tienda' ? 'tienda' : undefined}
    >
      <Sidebar
        activeItem={activeSidebarItem}
        onItemClick={setActiveSidebarItem}
        onUserClick={onUserClick}
        onCartClick={onCartClick}
        onOrdersClick={onOrdersClick}
        onMessagesClick={onMessagesClick}
      />

      {/* Toggle de sección — arriba a la IZQUIERDA, al nivel de la barra de búsqueda. En móvil
          la cápsula del avatar ocupa esa franja, así que el toggle se renderiza DENTRO del hero
          (slot sectionToggle) y esta versión fija solo existe desde md. */}
      <div className="app-shift fixed left-0 top-3 z-[56] hidden pl-3 md:block md:pl-6">
        <SectionToggle active={activeSection} onChange={setActiveSection} />
      </div>

      {/* Barra de búsqueda de tiendas — fija. En md+ va en la primera franja (el padding derecho
          evita que la cápsula del avatar la tape); en móvil baja a una segunda fila propia. */}
      <div className="app-shift fixed inset-x-0 top-[4.25rem] z-[55] flex items-center justify-center px-3 md:top-3 md:pl-64 md:pr-24 lg:pl-3">
        <div className={`relative transition-all duration-300 ease-out ${homeSearchFocused ? 'w-full max-w-2xl' : 'w-full max-w-md'}`}>
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-gray-400" />
          <input
            value={storeQuery}
            onChange={(e) => setStoreQuery(e.target.value)}
            onFocus={() => setHomeSearchFocused(true)}
            onBlur={() => setHomeSearchFocused(false)}
            placeholder="Buscar una tienda…"
            className="theme-surface w-full rounded-2xl border border-white/60 bg-white/80 py-3 pl-12 pr-4 text-sm shadow-lg backdrop-blur-xl transition focus:border-[var(--accent-300)] focus:bg-white/95 focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
          />
        </div>
      </div>

      {/* El padding-top reserva el espacio de los controles fijos: en móvil son dos filas
          (cápsula y buscador); desde md una sola. */}
      <main className="app-shift px-3 pb-8 pt-[8.5rem] md:px-6 md:pt-20 lg:px-8">
        <div className="w-full space-y-5 md:space-y-6">
          {/* Hero + tiendas van juntos: el título "Nuestras tiendas" es un recuadro puente
              que se superpone al borde entre ambos contenedores. */}
          <div>
            <HeroBanner
              userName={firstName}
              onNewOrder={() => setMapOpen(true)}
              sectionToggle={<SectionToggle active={activeSection} onChange={setActiveSection} />}
            />

            <OurStoresSection
              key={activeSection}
              section={section}
              stores={stores}
              favoriteIds={favorites}
              loading={loadingStores}
              query={query}
              onStoreClick={handleStoreClick}
            />
          </div>

          {loadingOrders ? (
            <section className="rounded-[28px] border border-white/70 bg-white/75 p-5 shadow-lg shadow-gray-200/50 backdrop-blur-xl">
              <div className="h-5 w-40 animate-pulse rounded-full bg-gray-100" />
              <div className="theme-surface mt-4 h-24 animate-pulse rounded-3xl bg-[var(--accent-50)]" />
            </section>
          ) : activeOrder ? (
            <ActiveOrderBanner
              order={activeOrder}
              onOpen={() => navigate(`/orders?orderId=${activeOrder.id}`)}
              onChat={() => navigate(`/messages?orderId=${activeOrder.id}`)}
            />
          ) : null}

<<<<<<< Updated upstream
          {shownFavoriteStores.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900">
                <Heart size={20} className="fill-red-500 text-red-500" />
                Tus tiendas favoritas
              </h2>
              <div className="flex flex-wrap gap-6 py-4 px-1">
                {shownFavoriteStores.map((store) => {
                  const fallback = store.imageUrl || STORE_FALLBACK_IMAGE;
                  return (
                    <StoreItem
                      key={store.id}
                      id={store.id as unknown as number}
                      name={store.name}
                      imageUrl={getStoreLogoUrl(store.id) ?? fallback}
                      fallbackUrl={fallback}
                      onClick={() => {
                        if (onStoreClick) onStoreClick(Number(store.id));
                        else navigate(`/store/${store.id}`);
                      }}
                    />
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {query ? `Resultados para "${storeQuery.trim()}"` : 'Tiendas Disponibles'}
            </h2>
            {loadingStores ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : shownStores.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">
                {query ? 'No se encontraron tiendas con ese nombre.' : 'No hay tiendas disponibles en esta categoría.'}
              </p>
            ) : (
              <div className="flex flex-wrap gap-6 py-4 px-1">
                {shownStores.map((store, index) => {
                  const fallback = store.imageUrl || STORE_FALLBACK_IMAGE;
                  return (
                    <StoreItem
                      key={store.id}
                      id={store.id as unknown as number}
                      name={store.name}
                      imageUrl={getStoreLogoUrl(store.id) ?? fallback}
                      fallbackUrl={fallback}
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
                  );
                })}
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
=======
          <FeaturedProductsSection
            key={`featured-${activeSection}`}
            section={section}
            stores={stores}
            onOpenStore={handleStoreClick}
            onTryProduct={(store, product) => navigate(`/store/${store.id}?addProduct=${product.id}`)}
          />

          <AppPromoSection />
>>>>>>> Stashed changes
        </div>
      </main>

      <HomeFooter onOpenMap={() => setMapOpen(true)} />

      {mapOpen && (
        <Suspense fallback={null}>
          <StoreMapModal open={mapOpen} onClose={() => setMapOpen(false)} />
        </Suspense>
      )}
    </div>
  );
};

export default Home;
