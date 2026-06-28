import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Tag } from 'lucide-react';
import { toast } from 'react-toastify';
import Sidebar from '../../components/home/Sidebar';
import StoreCatalogCart from '../../components/store/StoreCatalogCart';
import { useAuth } from '../../context/AuthContext';
import { getStoreById, getStoreSchedules, getDayName, type Store, type StoreSchedule } from '../../services/storeService';
import { getStoreImage } from '../../services/storeImageStore';

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
  const { getToken, userProfile } = useAuth();
  const [activeSidebarItem, setActiveSidebarItem] = useState('home');
  const [store, setStore] = useState<Store | null>(null);
  const [schedules, setSchedules] = useState<StoreSchedule[]>([]);
  const [loading, setLoading] = useState(true);
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
        <Sidebar activeItem="home" onItemClick={() => {}} />
        <div className="ml-16 flex items-center justify-center min-h-screen">
          <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
        <Sidebar activeItem="home" onItemClick={() => {}} />
        <div className="ml-16 flex items-center justify-center min-h-screen">
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
  const storeImage = store.imageUrl || getStoreImage(store.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      {/* Sidebar */}
      <Sidebar
        activeItem={activeSidebarItem}
        onItemClick={setActiveSidebarItem}
      />

      <main className="ml-16 px-4 pb-28 pt-20 md:px-8 lg:pb-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {storeImage ? (
            /* Con foto: el banner es la imagen a todo lo ancho (como una tarjeta de
               delivery), con los controles flotando encima y el nombre/meta debajo en
               una tarjeta blanca — la imagen manda, no compite con el degradado. */
            <div className="space-y-0">
              <div className="relative h-72 md:h-96 w-full overflow-hidden rounded-t-[28px]">
                <img
                  src={storeImage}
                  alt={store.name}
                  className="h-full w-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
                <button
                  onClick={() => onBack?.() ?? navigate('/home')}
                  className="absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-800 backdrop-blur-md transition hover:bg-white"
                  aria-label="Volver"
                >
                  <ArrowLeft size={18} />
                </button>
                <span className={`absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-md ${statusInfo.color} bg-white/95`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                  {statusInfo.label}
                </span>
              </div>
              <div className="rounded-b-[28px] border border-t-0 border-yellow-100 bg-white px-5 py-4 md:px-6">
                <nav className="mb-2 text-xs font-semibold text-gray-400" aria-label="Ruta de navegación">
                  ECIxpress <span className="mx-1.5">/</span> Tiendas <span className="mx-1.5">/</span>
                  <span className="text-gray-600">{store.name}</span>
                </nav>
                <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{store.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={14} className="text-yellow-500" />
                    {store.location}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-50 px-2.5 py-0.5 text-yellow-700">
                    <Tag size={12} />
                    {TYPE_LABELS[store.type] ?? store.type}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Sin foto todavía: degradado de marca, mismo lenguaje visual que "Mis pedidos". */
            <header className="relative overflow-hidden rounded-[28px] border border-yellow-200/70 bg-[linear-gradient(135deg,#F4B942_0%,#FBBF24_48%,#FDE68A_100%)] p-5 md:p-6">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/60" />
              <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-white/22 blur-3xl" />
              <div className="pointer-events-none absolute right-[-90px] top-[-110px] h-72 w-72 rounded-full bg-[#FB923C]/22 blur-3xl" />
              <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <nav className="mb-3 inline-flex items-center rounded-xl border border-yellow-100 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700" aria-label="Ruta de navegación">
                    ECIxpress <span className="mx-2 text-gray-400">/</span>
                    Tiendas <span className="mx-2 text-gray-400">/</span>
                    <span className="text-gray-950">{store.name}</span>
                  </nav>
                  <h1 className="text-3xl font-bold text-white md:text-4xl">{store.name}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-medium text-white/85">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={14} />
                      {store.location}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/25 px-2.5 py-0.5 backdrop-blur-sm">
                      <Tag size={12} />
                      {TYPE_LABELS[store.type] ?? store.type}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-semibold ${statusInfo.color} bg-white/95`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => onBack?.() ?? navigate('/home')}
                    className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-yellow-100 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 hover:text-gray-950 focus:outline-none focus:ring-2 focus:ring-white"
                  >
                    <ArrowLeft size={16} /> Volver
                  </button>
                </div>
              </div>
            </header>
          )}

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
              <StoreCatalogCart storeId={store.id} storeName={store.name} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StoreDetail;
