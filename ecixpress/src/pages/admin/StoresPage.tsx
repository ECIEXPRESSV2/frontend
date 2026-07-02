import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  ImagePlus,
  Map,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Store as StoreIcon,
  Tag,
  Users,
  X,
} from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import { CardSkeleton, TableSkeleton } from '../../components/common/LoadingSkeleton';
// Carga diferida: incluye maplibre-gl, solo se descarga al abrir el selector de mapa.
const LocationPickerModal = lazy(() => import('../../components/admin/LocationPickerModal'));
import { useAuth } from '../../context/AuthContext';
import {
  getStores, createStore, updateStore, updateStoreStatus, uploadStoreLogo,
  getStoreSchedules, createSchedule, updateSchedule, deleteSchedule,
  getStoreClosures, createClosure, cancelClosure,
  assignStaff, removeStaff, getStoreById,
  getDayName,
  type Store, type StoreSchedule, type StoreClosure, type StoreStaff, type CreateStoreDto,
} from '../../services/storeService';
import { getUsers, type UserItem } from '../../services/userService';
import { deletePageCache, getPageCache, pageCacheKeys, setPageCache } from '../../services/pageCache';
import { getStoreLogoUrl, fileToDataUrl } from '../../services/storeAssets';

type TabType = 'schedules' | 'staff' | 'menu';
type StatusAction = { store: Store; nextStatus: Store['status'] } | null;

type StoreDetailCache = {
  schedules: StoreSchedule[];
  closures: StoreClosure[];
  staff: StoreStaff[];
  users: UserItem[];
};

const TYPE_META: Record<Store['type'], { label: string; icon: typeof StoreIcon; className: string }> = {
  CAFETERIA: {
    label: 'Cafetería',
    icon: StoreIcon,
    className: 'bg-yellow-50 text-amber-800 border-yellow-200',
  },
  PAPELERIA: {
    label: 'Papelería',
    icon: Tag,
    className: 'bg-cyan-50 text-cyan-800 border-cyan-100',
  },
  RESTAURANTE: {
    label: 'Restaurante',
    icon: StoreIcon,
    className: 'bg-orange-50 text-orange-800 border-orange-100',
  },
};

const STATUS_META: Record<Store['status'], {
  label: string;
  description: string;
  icon: typeof CheckCircle;
  badgeClass: string;
  dotClass: string;
}> = {
  OPEN: {
    label: 'Abierta',
    description: 'Recibiendo pedidos',
    icon: CheckCircle,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-400',
  },
  CLOSED: {
    label: 'Cerrada',
    description: 'No recibe nuevos pedidos',
    icon: Clock,
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
    dotClass: 'bg-gray-400',
  },
  TEMPORARILY_CLOSED: {
    label: 'Suspendida',
    description: 'Cierre temporal activo',
    icon: AlertTriangle,
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    dotClass: 'bg-orange-400',
  },
};

const DETAIL_TABS: Array<{ id: TabType; label: string; icon: typeof StoreIcon }> = [
  { id: 'schedules', label: 'Horario', icon: Clock },
  { id: 'staff', label: 'Vendedores', icon: Users },
  { id: 'menu', label: 'Menú', icon: Tag },
];

const STORES_PAGE_SIZE = 6;

const DAY_SHORT_NAMES = ['D', 'L', 'M', 'Mi', 'J', 'V', 'S'];

const formatTime = (value?: string) => {
  if (!value) return '';
  const [hour, minute] = value.split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value;
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(date);
};

const formatCompactTime = (value?: string) => {
  if (!value) return '';
  const [hourValue, minuteValue] = value.split(':').map(Number);
  if (Number.isNaN(hourValue) || Number.isNaN(minuteValue)) return value;
  const period = hourValue < 12 ? 'a. m.' : 'p. m.';
  const hour = hourValue % 12 || 12;
  const minutes = minuteValue === 0 ? '' : `:${String(minuteValue).padStart(2, '0')}`;
  return `${hour}${minutes} ${period}`;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));

const getStoreInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'EC';

// Imagen de la tienda: la URL pública del Blob (imageUrl, seteada por el backend al subir el logo),
// con cache-bust por updatedAt para reflejar reemplazos al instante; si no hay, la URL por convención.
const getStoreVisual = (store: Store): string =>
  store.imageUrl
    ? `${store.imageUrl}?v=${encodeURIComponent(store.updatedAt ?? '')}`
    : getStoreLogoUrl(store.id) ?? '';


const formatDaySet = (days: number[]) => {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  const ranges: string[] = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const start = sorted[index];
    let end = start;

    while (index + 1 < sorted.length && sorted[index + 1] === end + 1) {
      index += 1;
      end = sorted[index];
    }

    ranges.push(start === end ? DAY_SHORT_NAMES[start] : `${DAY_SHORT_NAMES[start]}-${DAY_SHORT_NAMES[end]}`);
  }

  return ranges.join(', ');
};

const getConfiguredScheduleSummary = (schedules?: StoreSchedule[]) => {
  const activeSchedules = schedules?.filter(schedule => schedule.isActive) ?? [];
  if (activeSchedules.length === 0) return 'Horario por configurar';

  const grouped = activeSchedules.reduce<Record<string, { openTime: string; closeTime: string; days: number[] }>>((acc, schedule) => {
    const key = `${schedule.openTime}-${schedule.closeTime}`;
    if (!acc[key]) acc[key] = { openTime: schedule.openTime, closeTime: schedule.closeTime, days: [] };
    acc[key].days.push(schedule.dayOfWeek);
    return acc;
  }, {});

  return Object.values(grouped)
    .sort((a, b) => Math.min(...a.days) - Math.min(...b.days))
    .map(group => `${formatDaySet(group.days)} ${formatCompactTime(group.openTime)} - ${formatCompactTime(group.closeTime)}`)
    .join(' · ');
};


const getPrimaryStatusAction = (store: Store) => {
  if (store.status === 'OPEN') return { label: 'Cerrar tienda', nextStatus: 'CLOSED' as Store['status'], tone: 'danger' };
  if (store.status === 'TEMPORARILY_CLOSED') return { label: 'Reabrir tienda', nextStatus: 'OPEN' as Store['status'], tone: 'primary' };
  return { label: 'Abrir tienda', nextStatus: 'OPEN' as Store['status'], tone: 'primary' };
};

const getStatusSuccessMessage = (store: Store, status: Store['status']) => {
  if (status === 'OPEN') return `${store.name} fue abierta correctamente.`;
  if (status === 'TEMPORARILY_CLOSED') return `${store.name} quedó suspendida temporalmente.`;
  return `${store.name} fue cerrada correctamente.`;
};

const getConfirmationCopy = (store: Store, status: Store['status']) => {
  if (status === 'OPEN') {
    return {
      title: `¿Abrir ${store.name}?`,
      description: 'La tienda volverá a estar disponible para recibir pedidos según su horario configurado.',
      confirmLabel: 'Abrir tienda',
      tone: 'primary',
    };
  }

  if (status === 'TEMPORARILY_CLOSED') {
    return {
      title: `¿Suspender ${store.name}?`,
      description: 'La tienda dejará de estar disponible temporalmente hasta que un administrador la reabra.',
      confirmLabel: 'Suspender tienda',
      tone: 'warning',
    };
  }

  return {
    title: `¿Cerrar ${store.name}?`,
    description: 'La tienda dejará de recibir nuevos pedidos. Los pedidos en preparación podrán seguir gestionándose.',
    confirmLabel: 'Cerrar tienda',
    tone: 'danger',
  };
};

const StatusBadge: React.FC<{ store: Store; compact?: boolean }> = ({ store, compact = false }) => {
  const meta = STATUS_META[store.status];
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold shadow-sm ${meta.badgeClass} ${
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <Icon size={compact ? 12 : 14} aria-hidden="true" />
      {meta.label}
    </span>
  );
};

const StoreLogo: React.FC<{ store: Store; size?: 'sm' | 'md' | 'lg'; selected?: boolean }> = ({
  store,
  size = 'md',
  selected = false,
}) => {
  const image = getStoreVisual(store);
  const sizeClass = size === 'lg' ? 'h-20 w-20 text-xl' : size === 'sm' ? 'h-12 w-12 text-sm' : 'h-16 w-16 text-base';
  const meta = STATUS_META[store.status];

  return (
    <span className={`relative inline-flex ${sizeClass} flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-white font-bold text-gray-950 shadow-md ${
      selected ? 'border-yellow-300 shadow-yellow-200/70' : 'border-white shadow-gray-200/70'
    }`}>
      {image ? (
        <img src={image} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-yellow-100 via-white to-cyan-100">
          {getStoreInitials(store.name)}
        </span>
      )}
      <span className={`absolute bottom-0 right-1 h-3.5 w-3.5 rounded-full border-2 border-white ${meta.dotClass}`} aria-hidden="true" />
    </span>
  );
};

const StoresPage: React.FC = () => {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const { storeId } = useParams<{ storeId?: string }>();
  const isStoreProfileRoute = Boolean(storeId);
  const initialStoresCache = getPageCache<Store[]>(pageCacheKeys.adminStores);
  const [stores, setStores] = useState<Store[]>(() => initialStoresCache ?? []);
  const [loading, setLoading] = useState(() => !initialStoresCache);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('schedules');

  // Schedules
  const [schedules, setSchedules] = useState<StoreSchedule[]>([]);
  const [newSched, setNewSched] = useState<{ selectedDays: Set<number>; openTime: string; closeTime: string }>({
    selectedDays: new Set(),
    openTime: '07:00',
    closeTime: '16:00',
  });

  // Closures
  const [closures, setClosures] = useState<StoreClosure[]>([]);
  const [newClosure, setNewClosure] = useState({ startDate: '', endDate: '', reason: '' });

  // Staff
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [staffList, setStaffList] = useState<StoreStaff[]>([]);
  const [staffUserId, setStaffUserId] = useState('');
  const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [staffDropdownPos, setStaffDropdownPos] = useState<{ top: number; triggerTop: number; left: number; width: number; openUp: boolean } | null>(null);
  const staffTriggerRef = useRef<HTMLDivElement>(null);
  const staffPanelRef = useRef<HTMLDivElement>(null);

  // Create store form
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateStoreDto>({ name: '', type: 'CAFETERIA', location: '' });
  const [createImage, setCreateImage] = useState<string | undefined>(undefined);
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  // Edit store
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [editForm, setEditForm] = useState<Partial<CreateStoreDto>>({});
  const [editImage, setEditImage] = useState<string | undefined>(undefined);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Selector de ubicación (mapa 3D); 'create' | 'edit' indica a qué formulario aplica.
  const [locationPickerFor, setLocationPickerFor] = useState<'create' | 'edit' | null>(null);
  const createFileRef = useRef<HTMLInputElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  // Edit schedule
  const [editingSchedule, setEditingSchedule] = useState<StoreSchedule | null>(null);
  const [editSched, setEditSched] = useState({ openTime: '', closeTime: '' });

  const [loadingDetail, setLoadingDetail] = useState(false);
  const [statusAction, setStatusAction] = useState<StatusAction>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const visibleStores = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stores;

    return stores.filter(store =>
      [store.name, store.location, store.description ?? '', TYPE_META[store.type]?.label ?? store.type]
        .some(value => value.toLowerCase().includes(q)),
    );
  }, [stores, search]);

  const totalPages = Math.max(1, Math.ceil(visibleStores.length / STORES_PAGE_SIZE));
  const pagedStores = useMemo(
    () => visibleStores.slice((page - 1) * STORES_PAGE_SIZE, page * STORES_PAGE_SIZE),
    [visibleStores, page],
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    setPage(current => Math.min(current, totalPages));
  }, [totalPages]);

  const loadStores = async ({ showLoading = false } = {}) => {
    const cached = getPageCache<Store[]>(pageCacheKeys.adminStores);
    if (cached) setStores(cached);
    setLoading(showLoading && !cached);
    setError('');
    try {
      const token = await getToken();
      const data = await getStores(token);
      setStores(data);
      setPageCache(pageCacheKeys.adminStores, data);
    } catch (err) {
      setError('No fue posible cargar las tiendas. Intenta nuevamente.');
      toast.error(err instanceof Error ? err.message : 'Error cargando tiendas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStores({ showLoading: !initialStoresCache }); }, []);

  useEffect(() => {
    if (!selectedStore) return;
    const updated = stores.find(store => store.id === selectedStore.id);
    if (!updated) {
      setSelectedStore(null);
      return;
    }
    setSelectedStore(current => current ? { ...current, ...updated } : current);
  }, [stores, selectedStore?.id]);

  useEffect(() => {
    if (!staffDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!staffTriggerRef.current?.contains(t) && !staffPanelRef.current?.contains(t)) {
        setStaffDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [staffDropdownOpen]);

  const openStaffDropdown = () => {
    if (!staffTriggerRef.current) return;
    const rect = staffTriggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 300 && rect.top > spaceBelow;
    setStaffDropdownPos({ top: rect.bottom, triggerTop: rect.top, left: rect.left, width: rect.width, openUp });
    setStaffDropdownOpen(o => !o);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStores();
    setRefreshing(false);
  };

  const openStoreProfile = (store: Store) => {
    navigate(`/admin/stores/${encodeURIComponent(store.id)}`);
  };

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

  useEffect(() => {
    let cancelled = false;

    const syncRouteStore = async () => {
      if (!storeId) {
        setSelectedStore(null);
        return;
      }

      if (selectedStore?.id === storeId) return;

      const storeFromList = stores.find(store => store.id === storeId);
      if (storeFromList) {
        await handleSelectStore(storeFromList);
        return;
      }

      if (loading) return;

      try {
        const token = await getToken();
        const store = await getStoreById(storeId, token);
        if (!cancelled) await handleSelectStore(store);
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'No fue posible abrir la tienda.');
          navigate('/admin/stores');
        }
      }
    };

    void syncRouteStore();

    return () => {
      cancelled = true;
    };
  }, [storeId, stores, loading, selectedStore?.id]);

  const handleCreateStore = async () => {
    if (!createForm.name || !createForm.location) return;
    setCreating(true);
    try {
      const token = await getToken();
      const created = await createStore(createForm, token);
      // La imagen viaja al backend, que la sube a Azure Blob Storage como <storeId>.png.
      let logoOk = true;
      if (createImageFile && created?.id) {
        try {
          await uploadStoreLogo(created.id, createImageFile, token);
        } catch {
          logoOk = false;
        }
      }
      toast[logoOk ? 'success' : 'warning'](
        logoOk ? 'Tienda creada correctamente.' : 'Tienda creada, pero no se pudo subir el logo.',
      );
      setShowCreate(false);
      setCreateForm({ name: '', type: 'CAFETERIA', location: '' });
      setCreateImage(undefined);
      setCreateImageFile(null);
      await loadStores();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No fue posible crear la tienda.');
    } finally {
      setCreating(false);
    }
  };

  const handleImageFile = async (
    file: File | undefined,
    setPreview: (v: string | undefined) => void,
    setFile: (f: File | null) => void,
  ) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('El archivo debe ser una imagen');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen no debe superar 2 MB');
      return;
    }
    try {
      setPreview(await fileToDataUrl(file)); // vista previa local (base64)
      setFile(file);                          // archivo real que se subirá al guardar
    } catch {
      toast.error('No se pudo leer la imagen');
    }
  };

  const openEditStore = (store: Store, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditForm({
      name: store.name,
      description: store.description ?? undefined,
      location: store.location,
      imageUrl: store.imageUrl ?? undefined,
    });
    setEditImage(store.imageUrl ?? undefined); // vista previa del logo actual (si existe)
    setEditImageFile(null);
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
      // Si el usuario eligió una nueva imagen, se sube al Blob vía backend.
      let logoOk = true;
      if (editImageFile) {
        try {
          await uploadStoreLogo(editingStore.id, editImageFile, token);
        } catch {
          logoOk = false;
        }
      }
      toast[logoOk ? 'success' : 'warning'](
        logoOk ? 'Tienda actualizada correctamente.' : 'Datos guardados, pero no se pudo subir el logo.',
      );
      deletePageCache(pageCacheKeys.adminStoreDetail(editingStore.id));
      setEditingStore(null);
      setEditImage(undefined);
      setEditImageFile(null);
      await loadStores();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No fue posible guardar los cambios.');
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
      toast.error(err instanceof Error ? err.message : 'No fue posible actualizar el horario.');
    }
  };

  const handleStatusChange = async () => {
    if (!statusAction) return;
    const { store, nextStatus } = statusAction;
    setStatusUpdating(true);
    try {
      const token = await getToken();
      await updateStoreStatus(store.id, nextStatus, token);
      toast.success(getStatusSuccessMessage(store, nextStatus));
      deletePageCache(pageCacheKeys.adminStoreDetail(store.id));
      setStatusAction(null);
      setSelectedStore(current => current?.id === store.id ? { ...current, status: nextStatus } : current);
      await loadStores();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No fue posible cambiar el estado de la tienda.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!selectedStore || newSched.selectedDays.size === 0) return;
    try {
      const token = await getToken();
      await Promise.all(
        Array.from(newSched.selectedDays).map(day =>
          createSchedule(selectedStore.id, { dayOfWeek: day, openTime: newSched.openTime, closeTime: newSched.closeTime, isActive: true }, token),
        ),
      );
      const count = newSched.selectedDays.size;
      toast.success(`Horario aplicado a ${count} día${count !== 1 ? 's' : ''}`);
      const updated = await getStoreSchedules(selectedStore.id, token);
      setSchedules(updated);
      setNewSched(prev => ({ ...prev, selectedDays: new Set() }));
      deletePageCache(pageCacheKeys.adminStoreDetail(selectedStore.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No fue posible agregar el horario.');
    }
  };

  const toggleSchedDay = (day: number) => {
    setNewSched(prev => {
      const next = new Set(prev.selectedDays);
      if (next.has(day)) next.delete(day); else next.add(day);
      return { ...prev, selectedDays: next };
    });
  };

  const setSchedDays = (days: number[]) => {
    setNewSched(prev => ({ ...prev, selectedDays: new Set(days) }));
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
      toast.error(err instanceof Error ? err.message : 'No fue posible eliminar el horario.');
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
      toast.error(err instanceof Error ? err.message : 'No fue posible programar el cierre.');
    }
  };

  const handleCancelClosure = async (closureId: string) => {
    if (!selectedStore) return;
    try {
      const token = await getToken();
      await cancelClosure(selectedStore.id, closureId, token);
      toast.success('Cierre cancelado');
      setClosures(prev => prev.filter(c => c.id !== closureId));
      deletePageCache(pageCacheKeys.adminStoreDetail(selectedStore.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No fue posible cancelar el cierre.');
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
      toast.error(err instanceof Error ? err.message : 'No fue posible asignar el vendedor.');
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
      toast.error(err instanceof Error ? err.message : 'No fue posible remover el vendedor.');
    }
  };

  const renderDetailContent = () => {
    if (!selectedStore) return null;

    if (loadingDetail) {
      return (
        <div className="rounded-2xl border border-gray-100 bg-white p-2">
          <TableSkeleton rows={4} columns={2} />
        </div>
      );
    }

    const DAY_PILLS = [
      { day: 1, label: 'Lu' },
      { day: 2, label: 'Ma' },
      { day: 3, label: 'Mi' },
      { day: 4, label: 'Ju' },
      { day: 5, label: 'Vi' },
      { day: 6, label: 'Sá' },
      { day: 0, label: 'Do' },
    ];

    if (activeTab === 'schedules') {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-yellow-100 bg-yellow-50/60 p-4 space-y-3">
            {/* Atajos rápidos */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-semibold text-amber-700 self-center mr-1">Atajo:</span>
              <button type="button" onClick={() => setSchedDays([1,2,3,4,5])} className="rounded-full border border-yellow-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800 transition hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-300">
                Lun – Vie
              </button>
              <button type="button" onClick={() => setSchedDays([0,6])} className="rounded-full border border-yellow-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800 transition hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-300">
                Fin de semana
              </button>
              <button type="button" onClick={() => setSchedDays([0,1,2,3,4,5,6])} className="rounded-full border border-yellow-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800 transition hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-300">
                Todos los días
              </button>
              {newSched.selectedDays.size > 0 && (
                <button type="button" onClick={() => setSchedDays([])} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-500 transition hover:text-red-600 focus:outline-none">
                  Limpiar
                </button>
              )}
            </div>
            {/* Pills de días */}
            <div className="flex flex-wrap gap-2">
              {DAY_PILLS.map(({ day, label }) => {
                const selected = newSched.selectedDays.has(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleSchedDay(day)}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-yellow-300 ${
                      selected
                        ? 'border-yellow-400 bg-yellow-400 text-gray-950 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-yellow-300 hover:bg-yellow-50'
                    }`}
                    aria-pressed={selected}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {/* Horas */}
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-amber-700">Apertura</span>
                <input
                  type="time"
                  className="min-h-11 w-full rounded-xl border border-yellow-200 bg-white px-3 text-sm font-medium text-gray-700 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                  value={newSched.openTime}
                  onChange={e => setNewSched(p => ({ ...p, openTime: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-amber-700">Cierre</span>
                <input
                  type="time"
                  className="min-h-11 w-full rounded-xl border border-yellow-200 bg-white px-3 text-sm font-medium text-gray-700 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                  value={newSched.closeTime}
                  onChange={e => setNewSched(p => ({ ...p, closeTime: e.target.value }))}
                />
              </label>
              <button
                type="button"
                onClick={handleAddSchedule}
                disabled={newSched.selectedDays.size === 0}
                className="mt-auto inline-flex min-h-11 items-center justify-center rounded-xl bg-yellow-400 px-4 text-sm font-bold text-gray-950 shadow-sm transition hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Aplicar {newSched.selectedDays.size > 0 ? `(${newSched.selectedDays.size})` : ''}
              </button>
            </div>
          </div>

          {schedules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              Sin horarios configurados.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
              {schedules.map((s, idx) => (
                <div key={s.id} className={idx > 0 ? 'border-t border-gray-100' : ''}>
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-[4.5rem] flex-shrink-0 text-xs font-semibold text-gray-500">{getDayName(s.dayOfWeek)}</span>
                    <span className="flex-1 text-sm font-medium text-gray-800">{formatTime(s.openTime)} – {formatTime(s.closeTime)}</span>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => openEditSchedule(s)} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-500 transition hover:bg-yellow-50 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-yellow-200">
                        Editar
                      </button>
                      <button type="button" onClick={() => handleDeleteSchedule(s.id)} className="rounded-lg border border-red-100 bg-red-50/60 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200">
                        Eliminar
                      </button>
                    </div>
                  </div>
                  {editingSchedule?.id === s.id && (
                    <div className="grid gap-2 border-t border-gray-100 bg-gray-50/60 px-4 py-3 sm:grid-cols-[1fr_1fr_auto_auto]">
                      <input type="time" className="min-h-9 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100" value={editSched.openTime} onChange={e => setEditSched(p => ({ ...p, openTime: e.target.value }))} />
                      <input type="time" className="min-h-9 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100" value={editSched.closeTime} onChange={e => setEditSched(p => ({ ...p, closeTime: e.target.value }))} />
                      <button type="button" onClick={handleUpdateSchedule} className="rounded-xl bg-yellow-400 px-3 py-1.5 text-xs font-bold text-gray-950 transition hover:bg-yellow-500">Guardar</button>
                      <button type="button" onClick={() => setEditingSchedule(null)} className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600">Cancelar</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-600" aria-hidden="true" />
              <h4 className="text-sm font-bold text-gray-700">Cierres temporales</h4>
            </div>
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_1.2fr_auto]">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-amber-700">Desde</span>
                <input type="date" className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100" value={newClosure.startDate} onChange={e => setNewClosure(p => ({ ...p, startDate: e.target.value }))} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-amber-700">Hasta</span>
                <input type="date" className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100" value={newClosure.endDate} onChange={e => setNewClosure(p => ({ ...p, endDate: e.target.value }))} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-amber-700">Motivo</span>
                <input className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100" placeholder="Opcional" value={newClosure.reason} onChange={e => setNewClosure(p => ({ ...p, reason: e.target.value }))} />
              </label>
              <button type="button" onClick={handleAddClosure} className="mt-auto inline-flex min-h-11 items-center justify-center rounded-xl bg-yellow-400 px-4 text-sm font-bold text-gray-950 transition hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300">
                Programar
              </button>
            </div>
          </div>

          {closures.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-center text-sm text-gray-500">
              Sin cierres programados.
            </div>
          ) : (
            <div className="space-y-2">
              {closures.map(c => (
                <div key={c.id} className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                      <AlertTriangle size={16} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-gray-950">{formatDate(c.startDate)} - {formatDate(c.endDate)}</p>
                      <p className="text-sm text-gray-500">{c.reason || 'Sin motivo especificado'}</p>
                      <p className="mt-1 text-xs font-semibold text-gray-400">{{ SCHEDULED: 'Programado', ACTIVE: 'Activo', EXPIRED: 'Expirado', CANCELLED: 'Cancelado' }[c.status] ?? c.status}</p>
                    </div>
                  </div>
                  {c.status !== 'EXPIRED' && c.status !== 'CANCELLED' && (
                    <button type="button" onClick={() => handleCancelClosure(c.id)} className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300">
                      Cancelar cierre
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'staff') {
      const filteredStaffUsers = allUsers.filter(u =>
        staffSearch.trim() === '' ||
        u.fullName.toLowerCase().includes(staffSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(staffSearch.toLowerCase()),
      );
      return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-yellow-100 bg-yellow-50/40 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div ref={staffTriggerRef} className="relative flex-1">
              <button
                type="button"
                onClick={openStaffDropdown}
                className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-yellow-200 bg-white px-3 text-left text-sm font-medium outline-none transition hover:border-yellow-300 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
              >
                <span className={staffUserId ? 'text-gray-900' : 'text-gray-400'}>
                  {staffUserId
                    ? (allUsers.find(u => u.id === staffUserId)?.fullName ?? 'Usuario seleccionado')
                    : 'Seleccionar usuario...'}
                </span>
                <ChevronRight size={15} className={`flex-shrink-0 text-gray-400 transition-transform ${staffDropdownOpen ? 'rotate-90' : ''}`} aria-hidden="true" />
              </button>
              {staffDropdownOpen && staffDropdownPos && createPortal(
                <div
                  ref={staffPanelRef}
                  style={{
                    position: 'fixed',
                    left: staffDropdownPos.left,
                    width: staffDropdownPos.width,
                    zIndex: 9999,
                    ...(staffDropdownPos.openUp
                      ? { bottom: window.innerHeight - staffDropdownPos.triggerTop + 4 }
                      : { top: staffDropdownPos.top + 4 }),
                  }}
                  className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl shadow-gray-300/40"
                >
                  <div className="border-b border-gray-100 bg-white p-2">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Buscar por nombre o correo..."
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                      value={staffSearch}
                      onChange={e => setStaffSearch(e.target.value)}
                    />
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {filteredStaffUsers.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-400">Sin resultados</div>
                    ) : filteredStaffUsers.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => { setStaffUserId(u.id); setStaffDropdownOpen(false); setStaffSearch(''); }}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-yellow-50 ${staffUserId === u.id ? 'bg-yellow-50 font-semibold text-amber-700' : 'text-gray-700'}`}
                      >
                        <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-100 to-amber-100 text-xs font-bold text-amber-700">
                          {(u.fullName || u.email || 'U')[0].toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{u.fullName}</p>
                          <p className="truncate text-xs text-gray-400">{u.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>,
                document.body,
              )}
            </div>
            <button
              type="button"
              onClick={handleAssignStaff}
              disabled={!staffUserId}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 text-sm font-bold text-gray-950 transition hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Users size={16} aria-hidden="true" />
              Asignar
            </button>
          </div>
          <p className="mt-2 text-xs text-amber-700">El usuario debe tener rol vendedor para operar la tienda.</p>
        </div>

        {staffList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            No hay vendedores asignados.
          </div>
        ) : (
          <div className="space-y-2">
            {staffList.map(s => (
              <div key={s.id} className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 via-white to-yellow-100 text-sm font-bold text-gray-950">
                    {getStoreInitials(s.user?.fullName ?? 'Usuario')}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-950">{s.user?.fullName ?? s.userId}</p>
                    <p className="truncate text-xs text-gray-500">{s.user?.email ?? 'Correo no disponible'}</p>
                  </div>
                </div>
                <button type="button" onClick={() => handleRemoveStaff(s.userId)} className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300">
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-yellow-100 bg-yellow-50/70 p-5">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm">
              <Tag size={18} aria-hidden="true" />
            </span>
            <div>
              <h4 className="text-sm font-bold text-gray-950">Menú de {selectedStore.name}</h4>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Los productos, precios, inventario y disponibilidad se gestionan en el módulo de productos conectado para vendedores.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/vendor/stores/${selectedStore.id}/products`)}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-gray-950 transition hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300"
          >
            <Tag size={16} aria-hidden="true" />
            Gestionar menú
          </button>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Vista administrativa</p>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Este perfil conserva la gestión de tienda en administración y abre el catálogo solo cuando necesitas editar productos.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white text-gray-900">
      <Sidebar
        activeItem="admin-stores"
        expanded={sidebarExpanded}
        showProfile={false}
        showNotifications={false}
        onExpandedChange={setSidebarExpanded}
      />

      <main className="relative z-[51] app-shift min-h-screen px-4 pb-5 pt-20 md:px-8 lg:px-10">
        <div className="relative mx-auto max-w-6xl space-y-6">
          {!isStoreProfileRoute && (
            <>
              <header className="relative overflow-hidden rounded-[28px] border border-yellow-200/70 bg-[linear-gradient(135deg,#F4B942_0%,#FBBF24_48%,#FDE68A_100%)] p-5 shadow-lg shadow-yellow-200/60 md:p-6">
                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <nav className="mb-3 inline-flex items-center rounded-xl border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm backdrop-blur" aria-label="Ruta de navegación">
                      Administración <span className="mx-2 text-gray-400">/</span>
                      <span className="text-gray-950">Tiendas</span>
                    </nav>
                    <h1 className="flex flex-wrap items-center gap-3 text-3xl font-bold tracking-normal text-white md:text-4xl">
                      Gestión de tiendas
                    </h1>
                  </div>
                </div>
              </header>

              <section className="sticky top-20 z-30 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-lg shadow-gray-200/60 backdrop-blur-xl md:p-5">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center">
                  <label className="relative block">
                    <span className="sr-only">Buscar por nombre o ubicación</span>
                    <input
                      className="min-h-12 w-full rounded-2xl border border-gray-100 bg-gray-50 py-3 pl-5 pr-24 text-base font-medium text-gray-900 outline-none transition placeholder:text-gray-400 hover:border-yellow-200 focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
                      placeholder="Buscar por nombre o ubicación"
                      value={search}
                      onChange={event => setSearch(event.target.value)}
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="absolute right-12 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none"
                        aria-label="Limpiar búsqueda"
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    )}
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-yellow-400 text-white" aria-hidden="true">
                      <Search size={16} />
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setCreateImage(undefined); setCreateImageFile(null); setShowCreate(true); }}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  >
                    <Plus size={16} aria-hidden="true" />
                    Nueva tienda
                  </button>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    title={refreshing ? 'Actualizando...' : 'Actualizar datos'}
                    aria-label="Actualizar datos"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm font-bold text-amber-800 shadow-sm transition hover:border-amber-300 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:cursor-wait disabled:opacity-60"
                  >
                    <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
                    Actualizar
                  </button>
                  <span className="text-sm font-semibold text-gray-500">
                    {visibleStores.length} resultado{visibleStores.length === 1 ? '' : 's'}
                  </span>
                </div>
              </section>
            </>
          )}

          {error && (
            <section className="rounded-2xl border border-red-100 bg-red-50 p-5 text-red-800">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <p className="text-sm font-semibold">{error}</p>
                </div>
                <button type="button" onClick={handleRefresh} className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300">
                  Reintentar
                </button>
              </div>
            </section>
          )}

          <div>
          {isStoreProfileRoute ? (
            selectedStore ? (
              <section className="overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-lg shadow-gray-200/60">
              {(() => {
                const store = selectedStore;
                const image = getStoreVisual(store);
                const typeMeta = TYPE_META[store.type];
                const TypeIcon = typeMeta.icon;
                const action = getPrimaryStatusAction(store);

                return (
                  <>
                    <div className="relative min-h-[260px] overflow-hidden bg-gradient-to-br from-yellow-100 via-white to-cyan-100">
                      {image ? (
                        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.55),transparent_32%),linear-gradient(135deg,#fef9c3_0%,#ffffff_48%,#cffafe_100%)]">
                          <StoreIcon size={72} className="text-amber-600/45" aria-hidden="true" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-950/75 via-gray-950/25 to-gray-950/5" />
                      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4 md:p-6">
                        <button
                          type="button"
                          onClick={() => navigate('/admin/stores')}
                          className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/70 bg-white/90 px-4 py-2 text-sm font-bold text-gray-800 shadow-md shadow-gray-900/10 backdrop-blur transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
                        >
                          <ChevronLeft size={17} aria-hidden="true" />
                          Todas las tiendas
                        </button>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <StatusBadge store={store} />
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold shadow-sm ${typeMeta.className}`}>
                            <TypeIcon size={13} aria-hidden="true" />
                            {typeMeta.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 pb-5 md:px-7 md:pb-7">
                      <div className="-mt-12 flex flex-col gap-4 md:-mt-14 md:flex-row md:items-start md:justify-between">
                        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
                          <StoreLogo store={store} size="lg" selected />
                          <div className="min-w-0 pb-1 sm:pt-14 md:pt-16">
                            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Perfil de tienda</p>
                            <h2 className="mt-1 text-3xl font-black tracking-tight text-gray-950 md:text-4xl">{store.name}</h2>
                            <p className="mt-2 flex items-start gap-1.5 text-sm leading-5 text-gray-500">
                              <MapPin size={15} className="mt-0.5 flex-shrink-0 text-amber-600" aria-hidden="true" />
                              <span>{store.location}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 md:self-start md:pt-16">
                          <button
                            type="button"
                            onClick={() => setStatusAction({ store, nextStatus: action.nextStatus })}
                            className={`inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-bold shadow-sm transition focus:outline-none focus:ring-2 ${
                              action.tone === 'danger'
                                ? 'border-red-200 bg-red-50/90 text-red-700 hover:bg-red-100 focus:ring-red-300'
                                : 'border-amber-200 bg-amber-50/90 text-amber-800 hover:bg-amber-100 focus:ring-yellow-300'
                            }`}
                          >
                            {action.label}
                          </button>
                          <button
                            type="button"
                            onClick={event => openEditStore(store, event)}
                            className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-gray-200 bg-gray-50/80 px-3.5 py-2 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
                          >
                            <Pencil size={15} aria-hidden="true" />
                            Editar datos
                          </button>
                        </div>
                      </div>

                      <dl className="mt-5 divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-gray-50">
                        <div className="flex items-center justify-between px-4 py-2">
                          <dt className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock size={14} className="flex-shrink-0 text-gray-400" aria-hidden="true" />
                            Horario
                          </dt>
                          <dd className="text-sm font-semibold text-gray-900">
                            {loadingDetail ? 'Cargando...' : getConfiguredScheduleSummary(schedules)}
                          </dd>
                        </div>
                        <div className="flex items-start justify-between px-4 py-2">
                          <dt className="flex items-center gap-2 text-sm text-gray-500">
                            <Users size={14} className="mt-0.5 flex-shrink-0 text-gray-400" aria-hidden="true" />
                            Vendedores
                          </dt>
                          <dd className="text-sm font-semibold text-gray-900 text-right max-w-[55%]">
                            {loadingDetail
                              ? 'Cargando...'
                              : staffList.length === 0
                                ? <span className="text-gray-400 font-normal">Sin asignar</span>
                                : <span className="flex flex-col items-end gap-0.5">
                                    {staffList.map(s => (
                                      <span key={s.id}>{s.user?.fullName ?? s.userId}</span>
                                    ))}
                                  </span>
                            }
                          </dd>
                        </div>
                      </dl>

                      {store.status !== 'TEMPORARILY_CLOSED' && (
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setStatusAction({ store, nextStatus: 'TEMPORARILY_CLOSED' })}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-100 hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                          >
                            <AlertTriangle size={12} aria-hidden="true" />
                            Suspender temporalmente
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="border-y border-gray-100 bg-gray-50/50 px-4 py-3 md:px-7">
                      <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 gap-0.5">
                        {DETAIL_TABS.map(tab => {
                          const Icon = tab.icon;
                          const isActive = activeTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setActiveTab(tab.id)}
                              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-yellow-300 ${
                                isActive
                                  ? 'bg-yellow-400 text-gray-950 shadow-sm'
                                  : 'text-gray-500 hover:text-gray-800'
                              }`}
                            >
                              <Icon size={15} aria-hidden="true" />
                              {tab.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-gray-50/70 p-4 md:p-6">
                      {renderDetailContent()}
                    </div>
                  </>
                );
              })()}
              </section>
            ) : (
              <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-lg shadow-gray-200/60">
                <CardSkeleton rows={3} />
              </section>
            )
          ) : (
            <section className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-950">Todas las tiendas</h2>
                  <p className="text-sm text-gray-500">Selecciona una tarjeta para abrir el perfil de la tienda.</p>
                </div>
              </div>

              {loading && stores.length === 0 ? (
                <CardSkeleton rows={6} />
              ) : stores.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-50 text-amber-700">
                    <StoreIcon size={24} aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-950">No hay tiendas registradas</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">Crea la primera tienda para empezar a configurar horarios, responsables y disponibilidad.</p>
                  <button type="button" onClick={() => { setCreateImage(undefined); setCreateImageFile(null); setShowCreate(true); }} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-gray-950 transition hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300">
                    <Plus size={16} aria-hidden="true" />
                    Nueva tienda
                  </button>
                </div>
              ) : visibleStores.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-500">
                    <Search size={24} aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-950">Sin resultados</h3>
                  <p className="mt-2 text-sm text-gray-500">No encontramos tiendas que coincidan con "{search}".</p>
                  <button type="button" onClick={() => setSearch('')} className="mt-5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-yellow-50 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-yellow-300">
                    Limpiar búsqueda
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    {pagedStores.map(store => {
                      const image = getStoreVisual(store);
                      const statusActionInfo = getPrimaryStatusAction(store);
                      const typeMeta = TYPE_META[store.type];
                      const TypeIcon = typeMeta.icon;
                      return (
                        <article
                          key={store.id}
                          className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-yellow-200 hover:shadow-lg"
                        >
                          <button type="button" onClick={() => openStoreProfile(store)} className="block w-full text-left focus:outline-none focus:ring-4 focus:ring-yellow-100">
                            <div className="relative h-40 overflow-hidden bg-gradient-to-br from-yellow-100 via-white to-cyan-100">
                              {image ? (
                                <img src={image} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <StoreLogo store={store} size="lg" />
                                </div>
                              )}
                              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-gray-950/55 to-transparent" />
                              <div className="absolute left-3 top-3">
                                <StatusBadge store={store} />
                              </div>
                              <span className={`absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold shadow-sm ${typeMeta.className}`}>
                                <TypeIcon size={13} aria-hidden="true" />
                                {typeMeta.label}
                              </span>
                            </div>
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h3 className="truncate text-lg font-bold text-gray-950">{store.name}</h3>
                                  <p className="mt-1 flex items-start gap-1.5 text-sm leading-5 text-gray-500">
                                    <MapPin size={15} className="mt-0.5 flex-shrink-0 text-amber-600" aria-hidden="true" />
                                    <span className="line-clamp-2">{store.location}</span>
                                  </p>
                                </div>
                                <ChevronRight size={18} className="mt-1 flex-shrink-0 text-gray-300 transition group-hover:text-amber-600" aria-hidden="true" />
                              </div>
                              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-400">
                                <Clock size={12} className="flex-shrink-0 text-amber-500" aria-hidden="true" />
                                <span className="truncate">{getConfiguredScheduleSummary(store.schedules)}</span>
                              </p>
                            </div>
                          </button>
                          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2">
                            <button
                              type="button"
                              onClick={e => openEditStore(store, e)}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-400 transition hover:bg-gray-50 hover:text-gray-700 focus:outline-none"
                            >
                              <Pencil size={13} aria-hidden="true" />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => setStatusAction({ store, nextStatus: statusActionInfo.nextStatus })}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition focus:outline-none ${
                                statusActionInfo.tone === 'danger'
                                  ? 'text-red-400 hover:bg-red-50 hover:text-red-600'
                                  : 'text-amber-500 hover:bg-amber-50 hover:text-amber-700'
                              }`}
                            >
                              {statusActionInfo.label}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  {visibleStores.length > STORES_PAGE_SIZE && (
                    <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-gray-500">
                        Mostrando <span className="font-semibold text-gray-900">{(page - 1) * STORES_PAGE_SIZE + 1}</span> a{' '}
                        <span className="font-semibold text-gray-900">{Math.min(page * STORES_PAGE_SIZE, visibleStores.length)}</span> de{' '}
                        <span className="font-semibold text-gray-900">{visibleStores.length}</span> tiendas
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPage(current => Math.max(1, current - 1))}
                          disabled={page === 1}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 transition hover:border-yellow-300 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronLeft size={14} />
                          Anterior
                        </button>
                        <span className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
                          Página {page} de {totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPage(current => Math.min(totalPages, current + 1))}
                          disabled={page === totalPages}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 transition hover:border-yellow-300 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Siguiente
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

          )}
          </div>
        </div>
      </main>

      {statusAction && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/80 bg-white p-6 shadow-2xl shadow-gray-900/20">
            {(() => {
              const copy = getConfirmationCopy(statusAction.store, statusAction.nextStatus);
              const danger = copy.tone === 'danger';
              const warning = copy.tone === 'warning';

              return (
                <>
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${
                    danger ? 'bg-red-50 text-red-700' : warning ? 'bg-orange-50 text-orange-700' : 'bg-yellow-50 text-amber-700'
                  }`}>
                    {danger || warning ? <AlertTriangle size={22} aria-hidden="true" /> : <CheckCircle size={22} aria-hidden="true" />}
                  </div>
                  <h3 className="text-xl font-bold text-gray-950">{copy.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{copy.description}</p>
                  <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Tienda</p>
                    <p className="mt-1 font-bold text-gray-950">{statusAction.store.name}</p>
                    <p className="mt-1 text-sm text-gray-500">{statusAction.store.location}</p>
                  </div>
                  <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setStatusAction(null)}
                      disabled={statusUpdating}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleStatusChange}
                      disabled={statusUpdating}
                      className={`inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 disabled:cursor-wait disabled:opacity-70 ${
                        danger
                          ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-300'
                          : warning
                            ? 'bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-300'
                            : 'bg-yellow-400 text-gray-950 hover:bg-yellow-500 focus:ring-yellow-300'
                      }`}
                    >
                      {statusUpdating ? 'Aplicando...' : copy.confirmLabel}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Edit store modal */}
      {editingStore && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/45 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/80 bg-white shadow-2xl shadow-gray-900/20">
          <div className="h-1 flex-shrink-0 bg-[#F4B942]" />
          <div className="overflow-y-auto p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-600">Editar tienda</p>
                <h3 className="mt-1 text-xl font-bold text-gray-950">{editingStore.name}</h3>
              </div>
              <button type="button" onClick={() => { setEditingStore(null); setEditImage(undefined); setEditImageFile(null); }} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-300" aria-label="Cerrar">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                placeholder="Nombre *"
                value={editForm.name ?? ''}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              />
              <div className="flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                  placeholder="Ubicación *"
                  value={editForm.location ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                />
                <button type="button" onClick={() => setLocationPickerFor('edit')} title="Elegir en el mapa del campus" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-gray-100 px-3 text-sm font-bold text-gray-700 transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-300">
                  <Map size={15} aria-hidden="true" /> Mapa
                </button>
              </div>
              <input
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                placeholder="Descripción (opcional)"
                value={editForm.description ?? ''}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              />
              <div>
                <input ref={editFileRef} type="file" accept="image/*" className="hidden" onChange={e => { handleImageFile(e.target.files?.[0], setEditImage, setEditImageFile); e.target.value = ''; }} />
                <button type="button" onClick={() => editFileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-4 text-sm font-bold text-gray-500 transition hover:border-yellow-400 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-yellow-300">
                  <ImagePlus size={16} aria-hidden="true" /> {editImage ? 'Cambiar imagen' : 'Subir imagen (opcional)'}
                </button>
                {editImage && <img src={editImage} alt="Vista previa" className="mt-3 h-36 w-full rounded-xl border border-gray-100 object-cover" />}
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
              <button onClick={() => { setEditingStore(null); setEditImage(undefined); setEditImageFile(null); }} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-300">
                Cancelar
              </button>
              <button
                onClick={handleEditStore}
                disabled={saving || !editForm.name || !editForm.location}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-gray-950 transition hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/45 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/80 bg-white p-6 shadow-2xl shadow-gray-900/20">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-600">Nuevo punto de venta</p>
                <h3 className="mt-1 text-xl font-bold text-gray-950">Crear tienda</h3>
              </div>
              <button type="button" onClick={() => { setShowCreate(false); setCreateImage(undefined); setCreateImageFile(null); }} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-300" aria-label="Cerrar">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-3">
              <input className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100" placeholder="Nombre *" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
              <select className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100" value={createForm.type} onChange={e => setCreateForm(f => ({ ...f, type: e.target.value as CreateStoreDto['type'] }))}>
                <option value="CAFETERIA">Cafetería</option>
                <option value="PAPELERIA">Papelería</option>
                <option value="RESTAURANTE">Restaurante</option>
              </select>
              <div className="flex gap-2">
                <input className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100" placeholder="Ubicación *" value={createForm.location} onChange={e => setCreateForm(f => ({ ...f, location: e.target.value }))} />
                <button type="button" onClick={() => setLocationPickerFor('create')} title="Elegir en el mapa del campus" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-gray-100 px-3 text-sm font-bold text-gray-700 transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-300">
                  <Map size={15} aria-hidden="true" /> Mapa
                </button>
              </div>
              <input className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100" placeholder="Descripción (opcional)" value={createForm.description || ''} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} />
              <div>
                <input ref={createFileRef} type="file" accept="image/*" className="hidden" onChange={e => { handleImageFile(e.target.files?.[0], setCreateImage, setCreateImageFile); e.target.value = ''; }} />
                <button type="button" onClick={() => createFileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-4 text-sm font-bold text-gray-500 transition hover:border-yellow-400 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-yellow-300">
                  <ImagePlus size={16} aria-hidden="true" /> {createImage ? 'Cambiar imagen' : 'Subir imagen (opcional)'}
                </button>
                {createImage && <img src={createImage} alt="Vista previa" className="mt-3 h-36 w-full rounded-xl border border-gray-100 object-cover" />}
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
              <button onClick={() => { setShowCreate(false); setCreateImage(undefined); setCreateImageFile(null); }} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-300">
                Cancelar
              </button>
              <button onClick={handleCreateStore} disabled={creating || !createForm.name || !createForm.location} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-gray-950 transition hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:cursor-not-allowed disabled:opacity-50">
                {creating ? 'Creando...' : 'Crear tienda'}
              </button>
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
