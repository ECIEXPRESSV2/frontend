import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Plus, RefreshCw, MapPin, Clock, Users, AlertTriangle, Pencil, ImagePlus, Map } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import { CardSkeleton, TableSkeleton } from '../../components/common/LoadingSkeleton';
// Carga diferida: incluye maplibre-gl, solo se descarga al abrir el selector de mapa.
const LocationPickerModal = lazy(() => import('../../components/admin/LocationPickerModal'));
import { useAuth } from '../../context/AuthContext';
import {
  getStores, createStore, updateStore, updateStoreStatus,
  getStoreSchedules, createSchedule, updateSchedule, deleteSchedule,
  getStoreClosures, createClosure, cancelClosure,
  assignStaff, removeStaff, getStoreById,
  getDayName,
  type Store, type StoreSchedule, type StoreClosure, type StoreStaff, type CreateStoreDto,
} from '../../services/storeService';
import { getUsers, type UserItem } from '../../services/userService';
import { deletePageCache, getPageCache, pageCacheKeys, setPageCache } from '../../services/pageCache';
import { getStoreImage, setStoreImage, fileToDataUrl } from '../../services/storeImageStore';

type TabType = 'stores' | 'schedules' | 'closures' | 'staff';
type StoreDetailCache = {
  schedules: StoreSchedule[];
  closures: StoreClosure[];
  staff: StoreStaff[];
  users: UserItem[];
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-700',
  CLOSED: 'bg-red-100 text-red-700',
  TEMPORARILY_CLOSED: 'bg-orange-100 text-orange-700',
};

const StoresPage: React.FC = () => {
  const { getToken } = useAuth();
  const initialStoresCache = getPageCache<Store[]>(pageCacheKeys.adminStores);
  const [stores, setStores] = useState<Store[]>(() => initialStoresCache ?? []);
  const [loading, setLoading] = useState(() => !initialStoresCache);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('stores');

  // Schedules
  const [schedules, setSchedules] = useState<StoreSchedule[]>([]);
  const [newSched, setNewSched] = useState({ dayOfWeek: 1, openTime: '07:00', closeTime: '16:00', isActive: true });

  // Closures
  const [closures, setClosures] = useState<StoreClosure[]>([]);
  const [newClosure, setNewClosure] = useState({ startDate: '', endDate: '', reason: '' });

  // Staff
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [staffList, setStaffList] = useState<StoreStaff[]>([]);
  const [staffUserId, setStaffUserId] = useState('');

  // Create store form
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateStoreDto>({ name: '', type: 'CAFETERIA', location: '' });
  const [createImage, setCreateImage] = useState<string | undefined>(undefined);
  const [creating, setCreating] = useState(false);

  // Edit store
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [editForm, setEditForm] = useState<Partial<CreateStoreDto>>({});
  const [editImage, setEditImage] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  // Selector de ubicación (mapa 3D); 'create' | 'edit' indica a qué formulario aplica.
  const [locationPickerFor, setLocationPickerFor] = useState<'create' | 'edit' | null>(null);
  const createFileRef = useRef<HTMLInputElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  // Edit schedule
  const [editingSchedule, setEditingSchedule] = useState<StoreSchedule | null>(null);
  const [editSched, setEditSched] = useState({ openTime: '', closeTime: '' });

  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadStores = async ({ showLoading = false } = {}) => {
    const cached = getPageCache<Store[]>(pageCacheKeys.adminStores);
    if (cached) setStores(cached);
    setLoading(showLoading && !cached);
    try {
      const token = await getToken();
      const data = await getStores(token);
      setStores(data);
      setPageCache(pageCacheKeys.adminStores, data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error cargando tiendas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStores({ showLoading: !initialStoresCache }); }, []);

  const loadStaff = async (storeId: string) => {
    const token = await getToken();
    const store = await getStoreById(storeId, token).catch(() => null);
    setStaffList(store?.staff ?? []);
  };

  const handleSelectStore = async (store: Store) => {
    setSelectedStore(store);
    setActiveTab('schedules');

    const cacheKey = pageCacheKeys.adminStoreDetail(store.id);
    const cached = getPageCache<StoreDetailCache>(cacheKey);
    if (cached) {
      setSchedules(cached.schedules);
      setClosures(cached.closures);
      setStaffList(cached.staff);
      setAllUsers(cached.users);
      return;
    }

    setLoadingDetail(true);
    try {
      const token = await getToken();
      const [sched, clos, rawUsers, storeDetail] = await Promise.all([
        getStoreSchedules(store.id, token).catch(() => []),
        getStoreClosures(store.id, token).catch(() => []),
        getUsers(token).catch(() => []),
        getStoreById(store.id, token).catch(() => null),
      ]);
      const userList = Array.isArray(rawUsers) ? rawUsers : (rawUsers as { data: UserItem[] }).data ?? [];
      const staff = storeDetail?.staff ?? [];
      setSchedules(sched);
      setClosures(clos);
      setAllUsers(userList);
      setStaffList(staff);
      setPageCache(cacheKey, { schedules: sched, closures: clos, staff, users: userList });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateStore = async () => {
    if (!createForm.name || !createForm.location) return;
    setCreating(true);
    try {
      const token = await getToken();
      const created = await createStore(createForm, token);
      // La imagen elegida desde el dispositivo se guarda localmente (ver storeImageStore).
      // TODO: subirla a un Blob Storage y mandar la URL al backend cuando exista el servicio.
      if (createImage && created?.id) setStoreImage(created.id, createImage);
      toast.success('Tienda creada');
      setShowCreate(false);
      setCreateForm({ name: '', type: 'CAFETERIA', location: '' });
      setCreateImage(undefined);
      loadStores();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setCreating(false);
    }
  };

  // Lee un archivo de imagen elegido y lo guarda como data URL en el estado del form.
  const handleImageFile = async (
    file: File | undefined,
    set: (v: string | undefined) => void,
  ) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('El archivo debe ser una imagen');
      return;
    }
    try {
      set(await fileToDataUrl(file));
    } catch {
      toast.error('No se pudo leer la imagen');
    }
  };

  const openEditStore = (store: Store, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditForm({
      name: store.name,
      description: store.description ?? undefined,
      location: store.location,
      imageUrl: store.imageUrl ?? undefined,
    });
    setEditImage(getStoreImage(store.id) ?? undefined);
    setEditingStore(store);
  };

  const handleEditStore = async () => {
    if (!editingStore) return;
    setSaving(true);
    try {
      const token = await getToken();
      const payload = Object.fromEntries(
        Object.entries(editForm).filter(([, v]) => v !== '' && v !== undefined)
      ) as Partial<CreateStoreDto>;
      await updateStore(editingStore.id, payload, token);
      // Imagen local (TODO: migrar a Blob Storage).
      if (editImage) setStoreImage(editingStore.id, editImage);
      toast.success('Tienda actualizada');
      deletePageCache(pageCacheKeys.adminStoreDetail(editingStore.id));
      setEditingStore(null);
      setEditImage(undefined);
      loadStores();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const openEditSchedule = (sched: StoreSchedule) => {
    setEditSched({ openTime: sched.openTime, closeTime: sched.closeTime });
    setEditingSchedule(sched);
  };

  const handleUpdateSchedule = async () => {
    if (!selectedStore || !editingSchedule) return;
    try {
      const token = await getToken();
      await updateSchedule(selectedStore.id, editingSchedule.id, editSched, token);
      toast.success('Horario actualizado');
      setEditingSchedule(null);
      const updated = await getStoreSchedules(selectedStore.id, token);
      setSchedules(updated);
      deletePageCache(pageCacheKeys.adminStoreDetail(selectedStore.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleStatusToggle = async (store: Store) => {
    try {
      const token = await getToken();
      const next = store.status === 'OPEN' ? 'CLOSED' : 'OPEN';
      await updateStoreStatus(store.id, next, token);
      toast.success(`Tienda ${next === 'OPEN' ? 'abierta' : 'cerrada'}`);
      deletePageCache(pageCacheKeys.adminStoreDetail(store.id));
      loadStores();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleAddSchedule = async () => {
    if (!selectedStore) return;
    try {
      const token = await getToken();
      await createSchedule(selectedStore.id, newSched, token);
      toast.success('Horario agregado');
      const updated = await getStoreSchedules(selectedStore.id, token);
      setSchedules(updated);
      deletePageCache(pageCacheKeys.adminStoreDetail(selectedStore.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!selectedStore) return;
    try {
      const token = await getToken();
      await deleteSchedule(selectedStore.id, scheduleId, token);
      toast.success('Horario eliminado');
      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
      deletePageCache(pageCacheKeys.adminStoreDetail(selectedStore.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleAddClosure = async () => {
    if (!selectedStore || !newClosure.startDate || !newClosure.endDate) return;
    try {
      const token = await getToken();
      await createClosure(selectedStore.id, {
        startDate: new Date(newClosure.startDate).toISOString(),
        endDate: new Date(newClosure.endDate).toISOString(),
        reason: newClosure.reason || undefined,
      }, token);
      toast.success('Cierre temporal programado');
      const updated = await getStoreClosures(selectedStore.id, token);
      setClosures(updated);
      setNewClosure({ startDate: '', endDate: '', reason: '' });
      deletePageCache(pageCacheKeys.adminStoreDetail(selectedStore.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleCancelClosure = async (closureId: string) => {
    if (!selectedStore) return;
    try {
      const token = await getToken();
      await cancelClosure(selectedStore.id, closureId, token);
      toast.success('Cierre cancelado');
      setClosures(prev => prev.filter(c => c.id !== closureId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleAssignStaff = async () => {
    if (!selectedStore || !staffUserId) return;
    try {
      const token = await getToken();
      await assignStaff(selectedStore.id, staffUserId, token);
      toast.success('Vendedor asignado');
      setStaffUserId('');
      await loadStaff(selectedStore.id);
      deletePageCache(pageCacheKeys.adminStoreDetail(selectedStore.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleRemoveStaff = async (userId: string) => {
    if (!selectedStore) return;
    try {
      const token = await getToken();
      await removeStaff(selectedStore.id, userId, token);
      toast.success('Vendedor removido');
      await loadStaff(selectedStore.id);
      deletePageCache(pageCacheKeys.adminStoreDetail(selectedStore.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <Sidebar activeItem="admin-stores" />
      <main className="ml-16 p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Tiendas</h1>
            <div className="flex gap-3">
              <button onClick={() => loadStores()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200">
                <RefreshCw size={15} />
              </button>
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-white font-medium text-sm hover:bg-yellow-500">
                <Plus size={15} /> Nueva Tienda
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stores list */}
            <div className="lg:col-span-1 space-y-3">
              <h2 className="font-semibold text-gray-700 text-sm">Tiendas ({stores.length})</h2>
              {loading && stores.length === 0 ? (
                <CardSkeleton rows={4} />
              ) : stores.map(store => (
                <div
                  key={store.id}
                  onClick={() => handleSelectStore(store)}
                  className={`p-4 rounded-xl cursor-pointer transition border ${selectedStore?.id === store.id ? 'border-yellow-400 bg-yellow-50' : 'border-transparent bg-white/70 hover:bg-yellow-50/50'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{store.name}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin size={11} />{store.location}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[store.status] || ''}`}>{store.status}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={e => openEditStore(store, e)}
                          className="text-xs text-gray-400 hover:text-yellow-600"
                          title="Editar tienda"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleStatusToggle(store); }}
                          className="text-xs text-gray-400 hover:text-yellow-600 underline"
                        >
                          {store.status === 'OPEN' ? 'Cerrar' : 'Abrir'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Detail panel */}
            {selectedStore ? (
              <div className="lg:col-span-2 rounded-2xl bg-white/70 backdrop-blur-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900">{selectedStore.name}</h2>
                  <div className="flex gap-2 mt-3">
                    {(['schedules', 'closures', 'staff'] as TabType[]).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${activeTab === tab ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        {tab === 'schedules' ? 'Horarios' : tab === 'closures' ? 'Cierres' : 'Vendedores'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {loadingDetail && schedules.length === 0 ? (
                    <TableSkeleton rows={3} columns={2} />
                  ) : (<>
                  {/* Schedules Tab */}
                  {activeTab === 'schedules' && (
                    <>
                      <div className="grid grid-cols-4 gap-2">
                        <select className="border border-gray-200 rounded-lg px-2 py-2 text-sm" value={newSched.dayOfWeek} onChange={e => setNewSched(p => ({ ...p, dayOfWeek: +e.target.value }))}>
                          {[0,1,2,3,4,5,6].map(d => <option key={d} value={d}>{getDayName(d)}</option>)}
                        </select>
                        <input type="time" className="border border-gray-200 rounded-lg px-2 py-2 text-sm" value={newSched.openTime} onChange={e => setNewSched(p => ({ ...p, openTime: e.target.value }))} />
                        <input type="time" className="border border-gray-200 rounded-lg px-2 py-2 text-sm" value={newSched.closeTime} onChange={e => setNewSched(p => ({ ...p, closeTime: e.target.value }))} />
                        <button onClick={handleAddSchedule} className="px-3 py-2 rounded-lg bg-yellow-400 text-white text-sm font-medium hover:bg-yellow-500">Agregar</button>
                      </div>
                      <div className="space-y-2">
                        {schedules.length === 0 ? <p className="text-gray-400 text-sm">Sin horarios</p> : schedules.map(s => (
                          <div key={s.id} className="p-3 bg-gray-50 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm">
                                <Clock size={13} className="text-yellow-500" />
                                <span className="font-medium">{getDayName(s.dayOfWeek)}</span>
                                <span className="text-gray-500">{s.openTime} – {s.closeTime}</span>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => openEditSchedule(s)} className="text-xs text-yellow-600 hover:text-yellow-800">Editar</button>
                                <button onClick={() => handleDeleteSchedule(s.id)} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
                              </div>
                            </div>
                            {editingSchedule?.id === s.id && (
                              <div className="flex gap-2 pt-1">
                                <input type="time" className="border border-gray-200 rounded-lg px-2 py-1 text-sm" value={editSched.openTime} onChange={e => setEditSched(p => ({ ...p, openTime: e.target.value }))} />
                                <input type="time" className="border border-gray-200 rounded-lg px-2 py-1 text-sm" value={editSched.closeTime} onChange={e => setEditSched(p => ({ ...p, closeTime: e.target.value }))} />
                                <button onClick={handleUpdateSchedule} className="px-3 py-1 rounded-lg bg-yellow-400 text-white text-xs font-medium hover:bg-yellow-500">Guardar</button>
                                <button onClick={() => setEditingSchedule(null)} className="px-3 py-1 rounded-lg bg-gray-200 text-gray-600 text-xs">Cancelar</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Closures Tab */}
                  {activeTab === 'closures' && (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Desde</label>
                          <input type="date" className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm" value={newClosure.startDate} onChange={e => setNewClosure(p => ({ ...p, startDate: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Hasta</label>
                          <input type="date" className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm" value={newClosure.endDate} onChange={e => setNewClosure(p => ({ ...p, endDate: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Motivo</label>
                          <input className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm" placeholder="Opcional" value={newClosure.reason} onChange={e => setNewClosure(p => ({ ...p, reason: e.target.value }))} />
                        </div>
                      </div>
                      <button onClick={handleAddClosure} className="px-4 py-2 rounded-lg bg-yellow-400 text-white text-sm font-medium hover:bg-yellow-500">Programar Cierre</button>
                      <div className="space-y-2 mt-2">
                        {closures.length === 0 ? <p className="text-gray-400 text-sm">Sin cierres programados</p> : closures.map(c => (
                          <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-2 text-sm">
                              <AlertTriangle size={13} className="text-orange-500" />
                              <span>{new Date(c.startDate).toLocaleDateString()} → {new Date(c.endDate).toLocaleDateString()}</span>
                              {c.reason && <span className="text-gray-400">({c.reason})</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">{{ SCHEDULED: 'Programado', ACTIVE: 'Activo', EXPIRED: 'Expirado', CANCELLED: 'Cancelado' }[c.status] ?? c.status}</span>
                              {c.status !== 'EXPIRED' && c.status !== 'CANCELLED' && (
                                <button onClick={() => handleCancelClosure(c.id)} className="text-xs text-red-500 hover:text-red-700">Cancelar</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Staff Tab */}
                  {activeTab === 'staff' && (
                    <>
                      <div className="flex gap-2">
                        <select className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" value={staffUserId} onChange={e => setStaffUserId(e.target.value)}>
                          <option value="">Seleccionar usuario...</option>
                          {allUsers.map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>)}
                        </select>
                        <button onClick={handleAssignStaff} disabled={!staffUserId} className="px-4 py-2 rounded-lg bg-yellow-400 text-white text-sm font-medium hover:bg-yellow-500 disabled:opacity-50">
                          <Users size={15} />
                        </button>
                      </div>
                      <p className="text-xs text-gray-400">El usuario debe tener rol VENDOR para ser asignado como staff.</p>
                      {staffList.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-2">No hay vendedores asignados</p>
                      ) : (
                        <div className="space-y-1 mt-2">
                          {staffList.map(s => (
                            <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 text-sm">
                              <span className="text-gray-700">{s.user?.fullName ?? s.userId} <span className="text-gray-400 text-xs">({s.user?.email})</span></span>
                              <button onClick={() => handleRemoveStaff(s.userId)} className="text-xs text-red-500 hover:text-red-700">Remover</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  </>)}
                </div>
              </div>
            ) : (
              <div className="lg:col-span-2 flex items-center justify-center text-gray-300 text-sm rounded-2xl bg-white/40 min-h-48">
                Selecciona una tienda para gestionar
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Edit store modal */}
      {editingStore && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Editar — {editingStore.name}</h3>
            <div className="space-y-3">
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400"
                placeholder="Nombre *"
                value={editForm.name ?? ''}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              />
              <div className="flex gap-2">
                <input
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400"
                  placeholder="Ubicación *"
                  value={editForm.location ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                />
                <button type="button" onClick={() => setLocationPickerFor('edit')} title="Elegir en el mapa del campus" className="px-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-1.5 text-sm font-medium">
                  <Map size={15} /> Mapa
                </button>
              </div>
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400"
                placeholder="Descripción (opcional)"
                value={editForm.description ?? ''}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              />
              {/* Imagen de la tienda: archivo del dispositivo, guardado local (TODO: Blob Storage). */}
              <div>
                <input ref={editFileRef} type="file" accept="image/*" className="hidden" onChange={e => { handleImageFile(e.target.files?.[0], setEditImage); e.target.value = ''; }} />
                <button type="button" onClick={() => editFileRef.current?.click()} className="w-full border border-dashed border-gray-300 rounded-xl px-3 py-3 text-sm text-gray-500 hover:border-yellow-400 hover:text-yellow-600 flex items-center justify-center gap-2 transition">
                  <ImagePlus size={16} /> {editImage ? 'Cambiar imagen' : 'Subir imagen (opcional)'}
                </button>
                {editImage && <img src={editImage} alt="Vista previa" className="mt-2 w-full h-28 object-cover rounded-xl border border-gray-100" />}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleEditStore}
                disabled={saving || !editForm.name || !editForm.location}
                className="flex-1 py-2.5 rounded-xl bg-yellow-400 text-white font-medium text-sm hover:bg-yellow-500 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
              <button onClick={() => { setEditingStore(null); setEditImage(undefined); }} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Nueva Tienda</h3>
            <div className="space-y-3">
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400" placeholder="Nombre *" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400" value={createForm.type} onChange={e => setCreateForm(f => ({ ...f, type: e.target.value as CreateStoreDto['type'] }))}>
                <option value="CAFETERIA">Cafetería</option>
                <option value="PAPELERIA">Papelería</option>
                <option value="RESTAURANTE">Restaurante</option>
              </select>
              <div className="flex gap-2">
                <input className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400" placeholder="Ubicación *" value={createForm.location} onChange={e => setCreateForm(f => ({ ...f, location: e.target.value }))} />
                <button type="button" onClick={() => setLocationPickerFor('create')} title="Elegir en el mapa del campus" className="px-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-1.5 text-sm font-medium">
                  <Map size={15} /> Mapa
                </button>
              </div>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400" placeholder="Descripción (opcional)" value={createForm.description || ''} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} />
              {/* Imagen de la tienda: se elige del dispositivo y se guarda local (TODO: Blob Storage). */}
              <div>
                <input ref={createFileRef} type="file" accept="image/*" className="hidden" onChange={e => { handleImageFile(e.target.files?.[0], setCreateImage); e.target.value = ''; }} />
                <button type="button" onClick={() => createFileRef.current?.click()} className="w-full border border-dashed border-gray-300 rounded-xl px-3 py-3 text-sm text-gray-500 hover:border-yellow-400 hover:text-yellow-600 flex items-center justify-center gap-2 transition">
                  <ImagePlus size={16} /> {createImage ? 'Cambiar imagen' : 'Subir imagen (opcional)'}
                </button>
                {createImage && <img src={createImage} alt="Vista previa" className="mt-2 w-full h-28 object-cover rounded-xl border border-gray-100" />}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCreateStore} disabled={creating || !createForm.name || !createForm.location} className="flex-1 py-2.5 rounded-xl bg-yellow-400 text-white font-medium text-sm hover:bg-yellow-500 disabled:opacity-50">
                {creating ? 'Creando...' : 'Crear Tienda'}
              </button>
              <button onClick={() => { setShowCreate(false); setCreateImage(undefined); }} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Selector de ubicación: mapa 3D del campus (carga diferida) */}
      {locationPickerFor !== null && (
        <Suspense fallback={null}>
          <LocationPickerModal
            open
            initial={locationPickerFor === 'edit' ? editForm.location : createForm.location}
            onClose={() => setLocationPickerFor(null)}
            onSelect={(loc) => {
              if (locationPickerFor === 'edit') {
                setEditForm(f => ({ ...f, location: loc }));
              } else {
                setCreateForm(f => ({ ...f, location: loc }));
              }
            }}
          />
        </Suspense>
      )}
    </div>
  );
};

export default StoresPage;
