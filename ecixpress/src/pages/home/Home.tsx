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
import { useFavorites } from '../../hooks/useFavorites';
import { useRefreshOnScrollTop } from '../../hooks/useRefreshOnScrollTop';
import { applySectionTheme, getStoredSection } from '../../lib/sectionTheme';

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
  // La sección es un TEMA GLOBAL: se restaura de localStorage y, al cambiarla, se aplica a
  // toda la app (data-theme en <html> vía sectionTheme) — no solo a esta página.
  const [activeSection, setActiveSection] = useState<SectionId>(getStoredSection);
  const handleSectionChange = useCallback((next: SectionId) => {
    setActiveSection(next);
    applySectionTheme(next);
  }, []);
  const [activeSidebarItem, setActiveSidebarItem] = useState('home');
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  // Búsqueda de tiendas (barra superior, al nivel de la bolita del usuario).
  const [storeQuery, setStoreQuery] = useState('');
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
    // El tema Comida/Tienda ya NO se pone aquí: vive en <html> (lo aplica sectionTheme.ts),
    // así toda la app —esta página incluida— pasa del ámbar al terracota vía los tokens
    // --accent-* y las variables yellow/amber redefinidas en index.css.
    <div className="theme-surface min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
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
        <SectionToggle active={activeSection} onChange={handleSectionChange} />
      </div>

      {/* Barra de búsqueda de tiendas — fluye con el contenido (desaparece al scrollear). */}
      <div className="app-shift flex items-center justify-center px-3 pt-20 md:pt-3">
        <div className="relative w-full max-w-2xl">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-gray-400" />
          <input
            value={storeQuery}
            onChange={(e) => setStoreQuery(e.target.value)}
            placeholder="Buscar una tienda…"
            className="theme-surface w-full rounded-2xl border border-white/60 bg-white/80 py-3 pl-12 pr-4 text-sm shadow-lg backdrop-blur-xl transition focus:border-[var(--accent-300)] focus:bg-white/95 focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
          />
        </div>
      </div>

      {/* La barra de búsqueda fluye con el contenido, así que el main solo necesita
          un padding pequeño de separación. */}
      <main className="app-shift px-4 pb-8 pt-4 md:px-8 md:pb-8 lg:px-10">
        <div className="relative mx-auto w-full max-w-7xl space-y-5 md:space-y-6">
          {/* Hero + tiendas van juntos: el título "Nuestras tiendas" es un recuadro puente
              que se superpone al borde entre ambos contenedores. */}
          <div>
            <HeroBanner
              userName={firstName}
              onNewOrder={() => setMapOpen(true)}
              sectionToggle={<SectionToggle active={activeSection} onChange={handleSectionChange} />}
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

          <FeaturedProductsSection
            key={`featured-${activeSection}`}
            section={section}
            stores={stores}
            onOpenStore={handleStoreClick}
            onTryProduct={(store, product) => navigate(`/store/${store.id}?addProduct=${product.id}`)}
          />

          <AppPromoSection />
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
