import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MapPin, Clock, RefreshCw, Tag, Package } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import { CardSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuth } from '../../context/AuthContext';
import { getMyStores, getDayName, type Store, type StoreSchedule } from '../../services/storeService';

const isWithinSchedule = (schedules: StoreSchedule[]): boolean => {
  const now = new Date();
  const day = now.getDay();
  const time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  return schedules.some(s => s.isActive && s.dayOfWeek === day && time >= s.openTime && time < s.closeTime);
};

const getStoreLabel = (store: Store): { label: string; color: string } => {
  if (store.status === 'TEMPORARILY_CLOSED') return { label: 'Cierre temporal', color: 'bg-orange-100 text-orange-700' };
  if (store.status === 'CLOSED')             return { label: 'Cerrado', color: 'bg-red-100 text-red-700' };
  if (isWithinSchedule(store.schedules ?? [])) return { label: 'Abierto', color: 'bg-green-100 text-green-700' };
  return { label: 'Fuera de horario', color: 'bg-gray-100 text-gray-600' };
};

const VendorStoresPage: React.FC = () => {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    try {
      const token = await getToken();
      const data = await getMyStores(token);
      setStores(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error cargando tus tiendas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const typeLabel = (type: string) =>
    type === 'CAFETERIA' ? 'Cafetería' : type === 'PAPELERIA' ? 'Papelería' : 'Restaurante';

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <Sidebar activeItem="vendor-stores" />
      <main className="ml-16 px-4 pb-6 pt-20 md:ml-64 md:px-8 md:pb-8 lg:px-10">
        <div className="relative mx-auto max-w-6xl space-y-6">
          <header className="relative overflow-hidden rounded-[28px] border border-yellow-200/70 bg-[linear-gradient(135deg,#F4B942_0%,#FBBF24_48%,#FDE68A_100%)] p-5 shadow-lg shadow-yellow-200/60 md:p-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/60" />
            <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-white/22 blur-3xl" />
            <div className="pointer-events-none absolute right-[-90px] top-[-110px] h-72 w-72 rounded-full bg-[#FB923C]/22 blur-3xl" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <nav className="mb-3 inline-flex items-center rounded-xl border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm backdrop-blur" aria-label="Ruta de navegacion">
                  Vendedor <span className="mx-2 text-gray-400">/</span>
                  <span className="text-gray-950">Mis tiendas</span>
                </nav>
                <h1 className="text-3xl font-bold tracking-normal text-white md:text-4xl">Mis puntos de venta</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={load} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-4 py-2 text-sm font-bold text-gray-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-gray-950 focus:outline-none focus:ring-2 focus:ring-white">
                  <RefreshCw size={16} /> Actualizar
                </button>
              </div>
            </div>
          </header>

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
                        {(() => {
                          const { label, color } = getStoreLabel(store);
                          return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{label}</span>;
                        })()}
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><MapPin size={13} className="text-yellow-500" />{store.location}</span>
                        <span className="flex items-center gap-1"><Tag size={13} className="text-yellow-500" />{typeLabel(store.type)}</span>
                      </div>
                      {store.description && <p className="text-sm text-gray-400 mt-1">{store.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/vendor/stores/${store.id}/products`); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-400 text-white text-sm font-semibold hover:bg-yellow-500"
                      >
                        <Package size={14} /> Productos
                      </button>
                      <span className="text-gray-400 text-sm">{expanded === store.id ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Schedules accordion */}
                  {expanded === store.id && (
                    <div className="border-t border-gray-100 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock size={16} className="text-yellow-500" />
                        <h3 className="font-semibold text-gray-800 text-sm">Horarios de Atención</h3>
                      </div>
                      {!store.schedules || store.schedules.length === 0 ? (
                        <p className="text-gray-400 text-sm">Sin horarios configurados. Contacta al administrador.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {store.schedules
                            .filter((s: StoreSchedule) => s.isActive)
                            .sort((a: StoreSchedule, b: StoreSchedule) => a.dayOfWeek - b.dayOfWeek)
                            .map((s: StoreSchedule) => (
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
