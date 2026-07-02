import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Clock, Tag, Search, Store as StoreIcon, Heart } from 'lucide-react';
import { toast } from 'react-toastify';
import Sidebar from '../../components/home/Sidebar';
import StoreCatalogCart from '../../components/store/StoreCatalogCart';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../hooks/useFavorites';
import { getStoreById, getStoreSchedules, getDayName, type Store, type StoreSchedule } from '../../services/storeService';
import { getStoreBannerUrl, getStoreLogoUrl } from '../../services/storeAssets';

const STATUS_LABELS: Record<string, { label: string; dot: string; color: string }> = {
  OPEN: { label: 'Abierto', dot: 'bg-green-500', color: 'text-green-700 bg-green-50 ring-1 ring-green-200' },
  CLOSED: { label: 'Cerrado', dot: 'bg-red-500', color: 'text-red-700 bg-red-50 ring-1 ring-red-200' },
  TEMPORARILY_CLOSED: { label: 'Cierre temporal', dot: 'bg-orange-500', color: 'text-orange-700 bg-orange-50 ring-1 ring-orange-200' },
};

const TYPE_LABELS: Record<string, string> = {
  CAFETERIA: 'Cafetería',
  PAPELERIA: 'Papelería',
  RESTAURANTE: 'Restaurante',
};

const TODAY_INDEX = new Date().getDay();

interface StoreDetailProps {
  storeId?: number;
  onBack?: () => void;
  onOrdersClick?: () => void;
  onMessagesClick?: () => void;
}

const StoreDetail: React.FC<StoreDetailProps> = ({ storeId: storeIdProp, onBack }) => {
  const { storeId: routeStoreId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Carrito DRAFT a reanudar (viene del atajo "Carritos pendientes"). Sirve además como parte
  // de la `key` del catálogo para forzar un montaje limpio al cambiar entre carritos de la
  // MISMA tienda — así se puede volver a CUALQUIERA de los carritos guardados, no solo el último.
  const resumeDraftId = searchParams.get('draft');
  const { getToken, userProfile } = useAuth();
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  // La tienda no corresponde a ningún ítem del menú lateral (Inicio/Pedidos), así que no marcamos
  // ninguno como activo mientras se está aquí.
  const [activeSidebarItem, setActiveSidebarItem] = useState('');
  const [store, setStore] = useState<Store | null>(null);
  const [schedules, setSchedules] = useState<StoreSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  // Búsqueda de productos, elevada aquí para que la barra viva arriba de la página.
  const [productSearch, setProductSearch] = useState('');
  // La barra de búsqueda se expande hacia los lados al enfocarla.
  const [searchFocused, setSearchFocused] = useState(false);
  // Al bajar, el banner se "recoge" hacia arriba y se oscurece (queda fijo como barra compacta).
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const storeId = routeStoreId ?? (storeIdProp !== undefined ? String(storeIdProp) : undefined);

  useEffect(() => {
    if (!storeId) return;
    const load = async () => {
      try {
        const token = await getToken().catch(() => null);
        const [storeData, schedulesData] = await Promise.all([
          getStoreById(storeId, token),
          getStoreSchedules(storeId, token).catch(() => []),
        ]);
        setStore(storeData);
        setSchedules(schedulesData);
      } catch {
        toast.error('No se pudo cargar la tienda');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [storeId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
        <Sidebar activeItem="" onItemClick={() => {}} />
        <div className="app-shift flex items-center justify-center min-h-screen">
          <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
        <Sidebar activeItem="" onItemClick={() => {}} />
        <div className="app-shift flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Tienda no encontrada</h1>
            <button
              onClick={() => onBack?.() ?? navigate('/home')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold shadow-lg shadow-yellow-300/50 hover:shadow-yellow-300/70 transition-shadow"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[store.status] || { label: store.status, dot: 'bg-gray-400', color: 'text-gray-600 bg-gray-50 ring-1 ring-gray-200' };
  const storeImage = store.imageUrl;
  const bannerUrl = getStoreBannerUrl(store.id);
  const logoUrl = getStoreLogoUrl(store.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      {/* Sidebar */}
      <Sidebar
        activeItem={activeSidebarItem}
        onItemClick={setActiveSidebarItem}
      />

      <main className="app-shift px-3 pb-28 md:px-6 lg:pb-8">
        <div className="w-full">
          {/* HERO: banner grande y FIJO. Al bajar se "recoge" hacia arriba y se oscurece, quedando
              como una barra compacta oscura. La barra de búsqueda va superpuesta a la altura de la
              bolita del usuario y permanece visible siempre. */}
          <div
            className={`sticky top-0 z-20 -mx-3 overflow-hidden transition-all duration-300 ease-out md:-mx-6 ${
              scrolled ? 'h-20 rounded-b-2xl shadow-xl' : 'h-80 rounded-b-[32px] md:h-[22rem]'
            }`}
          >
            {/* Fondo: banner remoto de la tienda, o imagen local temporal, o degradado de marca. */}
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#F4B942_0%,#FBBF24_48%,#FDE68A_100%)]" />
            {storeImage && (
              <img
                src={storeImage}
                alt={store.name}
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            {bannerUrl && (
              <img
                src={bannerUrl}
                alt={`Banner de ${store.name}`}
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            {/* Capa de oscurecido: al recogerse se pone MÁS oscuro (no negro del todo). */}
            <div
              className={`absolute inset-0 transition-colors duration-300 ${
                scrolled ? 'bg-gray-900/55' : 'bg-gradient-to-t from-black/25 via-transparent to-transparent'
              }`}
            />

            {/* Fila superpuesta a la altura de la bolita del usuario (top-3): búsqueda + favorito.
                El padding derecho evita que el avatar de la esquina superior derecha los tape. */}
            <div className="absolute inset-x-0 top-3 z-10 flex items-center justify-center gap-2 px-3 pr-16 md:pr-20">
              {/* Búsqueda: más angosta por defecto y se expande hacia los lados al enfocarla. */}
              <div className={`relative transition-all duration-300 ease-out ${searchFocused ? 'w-full max-w-2xl' : 'w-full max-w-md'}`}>
                <Search size={18} className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-gray-400" />
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder={`Buscar en ${store.name}…`}
                  className="w-full rounded-2xl border border-white/60 bg-white/95 py-3 pl-12 pr-4 text-sm shadow-lg backdrop-blur transition focus:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </div>

              {/* Favorito: agrega/quita esta tienda de favoritas. */}
              <button
                type="button"
                onClick={() => toggleFavorite(store.id)}
                aria-pressed={isFavorite(store.id)}
                aria-label={isFavorite(store.id) ? 'Quitar de favoritas' : 'Agregar a favoritas'}
                title={isFavorite(store.id) ? 'Quitar de favoritas' : 'Agregar a favoritas'}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white/60 bg-white/95 shadow-lg backdrop-blur transition hover:scale-105 hover:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300 active:scale-95"
              >
                <Heart
                  size={20}
                  className={`transition-colors ${isFavorite(store.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                />
              </button>
            </div>
          </div>

          {/* Logo circular centrado, sobresaliendo del borde inferior del banner; se desvanece al recoger. */}
          <div className={`relative z-30 -mt-12 flex justify-center transition-opacity duration-300 ${scrolled ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
            <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white shadow-lg">
              {/* Ícono de respaldo detrás: si el logo carga lo tapa; si no hay logo o falla (404), queda visible. */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-500">
                <StoreIcon size={34} strokeWidth={1.75} />
              </div>
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt={`Logo de ${store.name}`}
                  className="relative h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
            </div>
          </div>

          {/* Nombre + badges (ubicación, tipo y estado "Abierto") centrados bajo el logo. */}
          <div className="mb-6 mt-3 text-center">
            <h1 className="font-display text-2xl font-semibold text-gray-900 md:text-3xl">{store.name}</h1>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2.5 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} className="text-yellow-500" />
                {store.location}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-50 px-2.5 py-0.5 text-yellow-700">
                <Tag size={12} />
                {TYPE_LABELS[store.type] ?? store.type}
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-semibold ${statusInfo.color}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`} />
                {statusInfo.label}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            {/* Schedules */}
            <details className="group rounded-2xl border border-gray-100 bg-white overflow-hidden" open={false}>
              <summary className="flex items-center gap-2 px-6 py-4 cursor-pointer select-none list-none">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-600">
                  <Clock size={16} />
                </span>
                <h2 className="font-bold text-gray-900">Horarios de Atención</h2>
                <span className="ml-auto text-xs text-gray-400 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <div className="px-6 pb-5">
                {schedules.length === 0 ? (
                  <p className="text-gray-500 text-sm">No hay horarios configurados.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {schedules
                      .filter(s => s.isActive)
                      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                      .map(s => {
                        const isToday = s.dayOfWeek === TODAY_INDEX;
                        return (
                          <div
                            key={s.id}
                            className={`flex justify-between items-center px-4 py-2.5 rounded-xl text-sm ${
                              isToday ? 'bg-yellow-400 text-white font-semibold' : 'bg-yellow-50 text-gray-700'
                            }`}
                          >
                            <span className="font-medium">{getDayName(s.dayOfWeek)}{isToday && ' · Hoy'}</span>
                            <span className={isToday ? 'text-white/90' : 'text-gray-500'}>{s.openTime} – {s.closeTime}</span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </details>

            {/* Menú + carrito — catálogo de products-service, carrito como orden DRAFT */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">Menú</h2>
                {(userProfile?.roles?.includes('VENDOR') || userProfile?.roles?.includes('ADMIN')) && (
                  <button
                    onClick={() => navigate(`/vendor/stores/${store.id}/products`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800"
                  >
                    <Tag size={14} /> Gestionar productos
                  </button>
                )}
              </div>
              {/* `key` incluye el draft: al elegir otro carrito pendiente de la MISMA tienda, el
                  catálogo se remonta y reanuda EXACTAMENTE ese carrito (no solo el último). */}
              <StoreCatalogCart
                key={`${store.id}:${resumeDraftId ?? 'new'}`}
                storeId={store.id}
                storeName={store.name}
                search={productSearch}
                onSearchChange={setProductSearch}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StoreDetail;
