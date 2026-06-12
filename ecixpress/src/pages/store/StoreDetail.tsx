import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Tag } from 'lucide-react';
import { toast } from 'react-toastify';
import Sidebar from '../../components/home/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { getStoreById, getStoreSchedules, getDayName, type Store, type StoreSchedule } from '../../services/storeService';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Abierto', color: 'text-green-600 bg-green-50' },
  CLOSED: { label: 'Cerrado', color: 'text-red-600 bg-red-50' },
  TEMPORARILY_CLOSED: { label: 'Cierre temporal', color: 'text-orange-600 bg-orange-50' },
};

const StoreDetail: React.FC = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [activeSidebarItem, setActiveSidebarItem] = useState('home');
  const [store, setStore] = useState<Store | null>(null);
  const [schedules, setSchedules] = useState<StoreSchedule[]>([]);
  const [loading, setLoading] = useState(true);

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
              onClick={() => navigate('/home')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[store.status] || { label: store.status, color: 'text-gray-600 bg-gray-50' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <Sidebar activeItem={activeSidebarItem} onItemClick={setActiveSidebarItem} />

      <main className="ml-16 p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 backdrop-blur-xl border border-white/40 text-gray-700 font-medium text-sm hover:bg-yellow-50 hover:text-yellow-600 transition-all duration-300"
          >
            <ArrowLeft size={16} />
            Volver
          </button>

          {/* Store Card */}
          <div className="rounded-2xl bg-white/60 backdrop-blur-xl shadow-sm overflow-hidden">
            {store.imageUrl && (
              <img
                src={store.imageUrl}
                alt={store.name}
                className="w-full h-48 object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
                  {store.description && <p className="text-gray-500 mt-1 text-sm">{store.description}</p>}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <MapPin size={15} className="text-yellow-500" />
                  {store.location}
                </div>
                <div className="flex items-center gap-1.5">
                  <Tag size={15} className="text-yellow-500" />
                  {store.type === 'CAFETERIA' ? 'Cafetería' : store.type === 'PAPELERIA' ? 'Papelería' : 'Restaurante'}
                </div>
              </div>
            </div>
          </div>

          {/* Schedules */}
          <div className="rounded-2xl bg-white/60 backdrop-blur-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-yellow-500" />
              <h2 className="text-lg font-bold text-gray-900">Horarios de Atención</h2>
            </div>
            {schedules.length === 0 ? (
              <p className="text-gray-500 text-sm">No hay horarios configurados.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {schedules
                  .filter(s => s.isActive)
                  .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                  .map(s => (
                    <div key={s.id} className="flex justify-between items-center p-3 bg-yellow-50 rounded-xl">
                      <span className="text-sm font-medium text-gray-700">{getDayName(s.dayOfWeek)}</span>
                      <span className="text-sm text-gray-600">{s.openTime} – {s.closeTime}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Productos — gestionados por Product Management (otro microservicio) */}
          <div className="rounded-2xl bg-white/60 backdrop-blur-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Productos</h2>
            <p className="text-gray-400 text-sm">
              Los productos de esta tienda se cargan desde el módulo de catálogo (Product Management).
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StoreDetail;
