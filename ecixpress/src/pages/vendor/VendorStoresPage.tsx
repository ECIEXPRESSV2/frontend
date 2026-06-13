import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { MapPin, Clock, RefreshCw, Tag } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import { CardSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuth } from '../../context/AuthContext';
import { getMyStores, getStoreSchedules, getDayName, type Store, type StoreSchedule } from '../../services/storeService';
import { getPageCache, pageCacheKeys, setPageCache } from '../../services/pageCache';

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-700',
  CLOSED: 'bg-red-100 text-red-700',
  TEMPORARILY_CLOSED: 'bg-orange-100 text-orange-700',
};

type VendorStoresCache = {
  stores: Store[];
  schedules: Record<string, StoreSchedule[]>;
};

const VendorStoresPage: React.FC = () => {
  const { getToken } = useAuth();
  const initialCache = getPageCache<VendorStoresCache>(pageCacheKeys.vendorStores);
  const [stores, setStores] = useState<Store[]>(() => initialCache?.stores ?? []);
  const [schedules, setSchedules] = useState<Record<string, StoreSchedule[]>>(() => initialCache?.schedules ?? {});
  const [loading, setLoading] = useState(() => !initialCache);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async ({ showLoading = false } = {}) => {
    const cached = getPageCache<VendorStoresCache>(pageCacheKeys.vendorStores);
    if (cached) {
      setStores(cached.stores);
      setSchedules(cached.schedules);
    }
    setLoading(showLoading && !cached);
    setLoadingSchedules(false);
    try {
      const token = await getToken();
      const data = await getMyStores(token);
      setStores(data);
      setLoading(false);

      setLoadingSchedules(true);
      const schedMap: Record<string, StoreSchedule[]> = {};
      await Promise.all(
        data.map(async (store) => {
          try {
            const s = await getStoreSchedules(store.id, token);
            schedMap[store.id] = s;
          } catch {
            schedMap[store.id] = [];
          }
        })
      );
      setSchedules(schedMap);
      setPageCache(pageCacheKeys.vendorStores, { stores: data, schedules: schedMap });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error cargando tus tiendas');
    } finally {
      setLoading(false);
      setLoadingSchedules(false);
    }
  };

  useEffect(() => { load({ showLoading: !initialCache }); }, []);

  const typeLabel = (type: string) =>
    type === 'CAFETERIA' ? 'Cafetería' : type === 'PAPELERIA' ? 'Papelería' : 'Restaurante';

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <Sidebar activeItem="vendor-stores" />
      <main className="ml-16 p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Mis Puntos de Venta</h1>
            <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-white font-medium text-sm hover:bg-yellow-500">
              <RefreshCw size={15} /> Actualizar
            </button>
          </div>

          {loading && stores.length === 0 ? (
            <CardSkeleton rows={3} />
          ) : stores.length === 0 ? (
            <div className="text-center py-16 bg-white/60 rounded-2xl shadow-sm">
              <p className="text-gray-500 font-medium">No tienes puntos de venta asignados.</p>
              <p className="text-gray-400 text-sm mt-1">Contacta al administrador para que te asigne una tienda.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stores.map(store => (
                <div key={store.id} className="rounded-2xl bg-white/70 backdrop-blur-xl shadow-sm overflow-hidden">
                  {/* Store header */}
                  <div
                    className="p-5 cursor-pointer flex items-start justify-between gap-4"
                    onClick={() => setExpanded(expanded === store.id ? null : store.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-lg font-bold text-gray-900">{store.name}</h2>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[store.status] || ''}`}>
                          {store.status === 'OPEN' ? 'Abierto' : store.status === 'CLOSED' ? 'Cerrado' : 'Cierre temporal'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><MapPin size={13} className="text-yellow-500" />{store.location}</span>
                        <span className="flex items-center gap-1"><Tag size={13} className="text-yellow-500" />{typeLabel(store.type)}</span>
                      </div>
                      {store.description && <p className="text-sm text-gray-400 mt-1">{store.description}</p>}
                    </div>
                    <span className="text-gray-400 text-sm">{expanded === store.id ? '▲' : '▼'}</span>
                  </div>

                  {/* Schedules accordion */}
                  {expanded === store.id && (
                    <div className="border-t border-gray-100 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock size={16} className="text-yellow-500" />
                        <h3 className="font-semibold text-gray-800 text-sm">Horarios de Atención</h3>
                      </div>
                      {loadingSchedules && !schedules[store.id] ? (
                        <div className="space-y-2 animate-pulse">
                          <div className="h-3 w-1/2 rounded-full bg-gray-100" />
                          <div className="h-3 w-1/3 rounded-full bg-gray-100" />
                        </div>
                      ) : !schedules[store.id] || schedules[store.id].length === 0 ? (
                        <p className="text-gray-400 text-sm">Sin horarios configurados. Contacta al administrador.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {schedules[store.id]
                            .filter(s => s.isActive)
                            .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                            .map(s => (
                              <div key={s.id} className="flex flex-col p-3 bg-yellow-50 rounded-xl">
                                <span className="text-xs font-semibold text-yellow-700">{getDayName(s.dayOfWeek)}</span>
                                <span className="text-sm text-gray-700 mt-0.5">{s.openTime} – {s.closeTime}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default VendorStoresPage;
