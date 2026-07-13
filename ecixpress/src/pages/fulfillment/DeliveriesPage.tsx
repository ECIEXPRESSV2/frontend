import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  PackageCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  Store as StoreIcon,
  AlertTriangle,
  Camera,
  QrCode,
} from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import TrianglePattern from '../../components/home/TrianglePattern';

import ModalShell from '../../components/wallet/ModalShell';
import QrScannerModal from '../../components/fulfillment/QrScannerModal';
import { useAuth } from '../../context/AuthContext';
import { useFulfillmentApi } from '../../hooks/useFulfillmentApi';
import { useRefreshOnScrollTop } from '../../hooks/useRefreshOnScrollTop';
import {
  FulfillmentApiError,
  type PaginatedDeliveries,
  type ValidatedOrder,
} from '../../lib/fulfillment-api';
import {
  deliveryMethodLabel,
  failureReasonLabel,
  validationErrorLabel,
} from '../../lib/fulfillment-ui';
import { formatDateTime } from '../../lib/format';
import { getMyStores, getStoreById, type Store } from '../../services/storeService';

interface DeliveriesPageProps {
  onBack?: () => void;
}

type ValidationState =
  | { kind: 'idle' }
  | { kind: 'valid'; order: ValidatedOrder }
  | { kind: 'invalid'; message: string };

const PAGE_SIZE = 10;

/**
 * Centro de entregas del vendedor. Reúne los casos de uso operativos de Fulfillment:
 * validar (UC-03) y confirmar (UC-04) por código, e historial paginado por tienda (UC-10).
 */
const DeliveriesPage: React.FC<DeliveriesPageProps> = () => {
  const { userProfile, getToken } = useAuth();
  const api = useFulfillmentApi();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // ── Validar / confirmar ──────────────────────────────────────
  const [code, setCode] = useState('');
  const [validation, setValidation] = useState<ValidationState>({ kind: 'idle' });
  const [validating, setValidating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [storeName, setStoreName] = useState<string | null>(null);

  // ── Historial por tienda ─────────────────────────────────────
  // El vendedor busca su tienda por nombre (coincidencia parcial, no exacta) en vez de
  // tener que saberse el ID; internamente se resuelve al storeId real que pide la API.
  const [myStores, setMyStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState('');
  const [storeQuery, setStoreQuery] = useState('');
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [methodFilter, setMethodFilter] = useState<'' | 'QR' | 'MANUAL'>('');
  const [orderDir, setOrderDir] = useState<'DESC' | 'ASC'>('DESC');
  const [page, setPage] = useState(1);
  const [history, setHistory] = useState<PaginatedDeliveries | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const resetValidation = () => {
    setValidation({ kind: 'idle' });
    setStoreName(null);
  };

  const handleValidate = async (override?: string) => {
    const trimmed = (override ?? code).trim();
    if (!trimmed) return;
    setValidating(true);
    setValidation({ kind: 'idle' });
    try {
      const result = await api.validateCode(trimmed);
      if (result.valid && result.order) {
        setValidation({ kind: 'valid', order: result.order });
        // Resuelve el nombre de la tienda (endpoint público de identity) para no mostrar el UUID.
        setStoreName(null);
        void getStoreById(result.order.storeId, null)
          .then((s) => setStoreName(s.name))
          .catch(() => setStoreName(null));
      } else {
        const reason = result.validationError;
        setValidation({
          kind: 'invalid',
          message: reason ? validationErrorLabel[reason] : 'El código no es válido.',
        });
      }
    } catch (e) {
      setValidation({
        kind: 'invalid',
        message: e instanceof Error ? e.message : 'No pudimos validar el código.',
      });
    } finally {
      setValidating(false);
    }
  };

  // Resultado del escáner de cámara (UC-03): el QR trae el token; lo dejamos en el input y
  // validamos automáticamente para que el vendedor confirme en un solo paso.
  const handleScanResult = useCallback((token: string) => {
    setScannerOpen(false);
    setCode(token);
    void handleValidate(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setConfirming(true);
    try {
      const delivery = await api.confirmCode(trimmed);
      if (delivery.alreadyDelivered) {
        toast.warning(`Este pedido ya había sido entregado.`);
      } else {
        const orderNumber = validation.kind === 'valid' ? validation.order.orderNumber : null;
        toast.success(`Entrega confirmada para el pedido ${orderNumber ?? delivery.orderNumber ?? 'seleccionado'}.`);
      }
      setCode('');
      resetValidation();
      setConfirmOpen(false);
      if (storeId) void loadHistory(1);
    } catch (e) {
      const msg =
        e instanceof FulfillmentApiError ? e.message : 'No pudimos confirmar la entrega.';
      toast.error(msg);
      setConfirmOpen(false);
    } finally {
      setConfirming(false);
    }
  };

  const loadHistory = useCallback(
    async (toPage: number, storeOverride = storeId) => {
      const store = storeOverride.trim();
      if (!store) {
        setHistoryError('Selecciona una tienda para ver su historial.');
        return;
      }
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const result = await api.getStoreDeliveries(store, {
          page: toPage,
          limit: PAGE_SIZE,
          order: orderDir,
          method: methodFilter || undefined,
        });
        setHistory(result);
        setPage(toPage);
      } catch (e) {
        setHistory(null);
        setHistoryError(
          e instanceof Error ? e.message : 'No pudimos cargar el historial de entregas.',
        );
      } finally {
        setHistoryLoading(false);
      }
    },
    [api, methodFilter, orderDir, storeId],
  );

  const resolveHistoryStoreId = useCallback(async () => {
    const currentStore = storeId.trim();
    if (currentStore) return currentStore;

    const profileStore = (userProfile as { storeId?: string } | null)?.storeId?.trim();
    const stores = myStores.length > 0 ? myStores : await getMyStores(await getToken());
    const match = stores.find((s) => s.id === profileStore) ?? stores[0];
    if (match) {
      setStoreId(match.id);
      setStoreQuery(match.name);
      return match.id;
    }
    return '';
  }, [getToken, storeId, userProfile, myStores]);

  // Carga las tiendas del vendedor una vez, para que el buscador de historial filtre por
  // nombre (coincidencia parcial) en vez de exigir el ID de la tienda, y para dejar
  // preseleccionada la tienda del perfil (mejor recognition que recall).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const stores = await getMyStores(token);
        if (cancelled) return;
        setMyStores(stores);
        if (storeId) return;
        const profileStore = (userProfile as { storeId?: string } | null)?.storeId;
        const preselected = stores.find((s) => s.id === profileStore) ?? stores[0];
        if (preselected) {
          setStoreId(preselected.id);
          setStoreQuery(preselected.name);
        }
      } catch {
        // Silencioso: el vendedor puede escribir el nombre igual y reintentar "Buscar".
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredStores =
    storeQuery.trim().length === 0
      ? myStores
      : myStores.filter((s) => s.name.toLowerCase().includes(storeQuery.trim().toLowerCase()));

  const selectStore = (store: Store) => {
    setStoreId(store.id);
    setStoreQuery(store.name);
    setStoreDropdownOpen(false);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const refreshStoreId = await resolveHistoryStoreId();
      if (!refreshStoreId) {
        setHistoryError('No tienes tiendas asignadas para refrescar el historial.');
        return;
      }
      await loadHistory(page, refreshStoreId);
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : 'No pudimos refrescar el historial de entregas.');
    } finally {
      setRefreshing(false);
    }
  }, [loadHistory, page, resolveHistoryStoreId]);

  useRefreshOnScrollTop(handleRefresh, {
    disabled: historyLoading || refreshing,
    refreshOnReachTop: true,
  });

  const totalPages = history ? Math.max(1, Math.ceil(history.total / history.limit)) : 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100 text-gray-900">
      <Sidebar
        activeItem="deliveries"
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
      />

      <main className="relative z-[51] app-shift min-h-screen px-4 pb-28 pt-20 md:px-8 md:pb-8 lg:px-10">
        <div className="relative mx-auto w-full max-w-7xl space-y-6">
          <header className="theme-surface relative overflow-hidden rounded-[32px] border border-white/60 bg-[linear-gradient(140deg,rgb(var(--accent-rgb)/0.32)_0%,rgba(255,255,255,0.62)_42%,rgb(var(--accent-rgb)/0.14)_72%,rgb(var(--accent-rgb)/0.36)_100%)] backdrop-blur-2xl [box-shadow:0_28px_50px_-28px_rgb(var(--accent-rgb)/0.45)]">
            <div aria-hidden="true" className="theme-surface absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[rgb(var(--accent-rgb)/0.32)] blur-3xl" />
            <div aria-hidden="true" className="theme-surface absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-[rgb(var(--accent-rgb)/0.20)] blur-3xl" />
            <TrianglePattern className="absolute inset-0 pointer-events-none" />
            <div className="relative flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between md:p-6">
              <div className="max-w-3xl">
                <nav className="mb-3 inline-flex items-center rounded-xl border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm backdrop-blur" aria-label="Ruta de navegación">
                  Operaciones <span className="mx-2 text-gray-400">/</span>
                  <span className="text-gray-950">Entregas</span>
                </nav>
                <h1 className="font-display text-3xl font-bold tracking-normal text-gray-900 md:text-4xl">
                  Centro de entregas
                </h1>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* ── Columna izquierda: operación ── */}
            <div className="space-y-6">
              {/* Validar / confirmar (UC-03 / UC-04) */}
              <section className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/60 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <ScanLine size={20} className="text-yellow-500" />
                  <h2 className="text-lg font-bold text-gray-900">Validar código de retiro</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex min-h-[150px] flex-col justify-between rounded-2xl border border-amber-100 bg-white p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-amber-700">
                      <Camera size={17} aria-hidden="true" />
                      Cámara
                    </div>
                    <div className="flex flex-1 items-center justify-center py-3" aria-hidden="true">
                      <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl border border-amber-100 bg-amber-50 text-amber-500">
                        <QrCode size={32} strokeWidth={1.8} />
                      </div>
                    </div>
                    <button
                      onClick={() => setScannerOpen(true)}
                      className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-amber-800 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                    >
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                        <ScanLine size={18} aria-hidden="true" />
                      </span>
                      Escanear QR
                    </button>
                  </div>

                  <div className="flex min-h-[150px] flex-col justify-between rounded-2xl border border-gray-100 bg-white/65 p-4">
                    <label className="block text-sm font-bold text-gray-700">
                      Código manual
                      <input
                        value={code}
                        onChange={(e) => {
                          setCode(e.target.value);
                          if (validation.kind !== 'idle') resetValidation();
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                        placeholder="A7K9-P2MX"
                        className="mt-3 min-h-12 w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                      />
                    </label>
                    <button
                      onClick={() => handleValidate()}
                      disabled={validating || !code.trim()}
                      className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-yellow-50 hover:text-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Search size={16} /> {validating ? 'Validando…' : 'Validar'}
                    </button>
                  </div>
                </div>

                {/* Resultado de la validación */}
                {validation.kind === 'valid' && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                      <CheckCircle2 size={18} /> Código válido
                    </div>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <div>
                        <dt className="text-gray-400">Tienda</dt>
                        <dd className="font-medium text-gray-800 break-all">
                          {storeName ?? `${validation.order.storeId.slice(0, 8)}…`}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-400">Vence</dt>
                        <dd className="font-medium text-gray-800">{formatDateTime(validation.order.expiresAt)}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-gray-400">Pedido</dt>
                        <dd className="font-medium text-gray-800">
                          {validation.order.orderNumber}
                        </dd>
                      </div>
                    </dl>
                    {/* Con un código válido, la única acción es confirmar por QR/código (UC-04).
                        La entrega manual y la fallida viven abajo, para el caso SIN código. */}
                    <button
                      onClick={() => setConfirmOpen(true)}
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-amber-800 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                    >
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                        <PackageCheck size={17} aria-hidden="true" />
                      </span>
                      Confirmar entrega
                    </button>
                  </div>
                )}

                {validation.kind === 'invalid' && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-2 text-sm text-red-700">
                    <XCircle size={18} className="mt-0.5 flex-shrink-0" />
                    <span>{validation.message}</span>
                  </div>
                )}
              </section>

            </div>

            {/* ── Columna derecha: historial (UC-10) ── */}
            <section className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2">
                <StoreIcon size={20} className="text-yellow-500" />
                <h2 className="text-lg font-bold text-gray-900">Historial de entregas</h2>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tienda</label>
                  <input
                    type="text"
                    value={storeQuery}
                    onChange={(e) => {
                      setStoreQuery(e.target.value);
                      setStoreId('');
                      setStoreDropdownOpen(true);
                    }}
                    onFocus={() => setStoreDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setStoreDropdownOpen(false), 150)}
                    placeholder="Escribe el nombre de tu tienda…"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white/60 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                  />
                  {storeDropdownOpen && filteredStores.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                      {filteredStores.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onMouseDown={() => selectStore(s)}
                          className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-yellow-50 ${
                            s.id === storeId ? 'bg-yellow-50 text-amber-800 font-semibold' : 'text-gray-700'
                          }`}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {storeDropdownOpen && storeQuery.trim().length > 0 && filteredStores.length === 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-500 shadow-lg">
                      No encontramos una tienda tuya con ese nombre.
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Método</label>
                    <select
                      value={methodFilter}
                      onChange={(e) => setMethodFilter(e.target.value as typeof methodFilter)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white/60 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                    >
                      <option value="">Todas</option>
                      <option value="QR">Código QR</option>
                      <option value="MANUAL">Manual</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Orden</label>
                    <select
                      value={orderDir}
                      onChange={(e) => setOrderDir(e.target.value as typeof orderDir)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white/60 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                    >
                      <option value="DESC">Más recientes primero</option>
                      <option value="ASC">Más antiguas primero</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => loadHistory(1)}
                  disabled={historyLoading || !storeId.trim()}
                  className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-amber-800 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <Search size={17} aria-hidden="true" />
                  </span>
                  {historyLoading ? 'Buscando…' : 'Buscar entregas'}
                </button>
              </div>

              {historyError && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 flex items-start gap-2 text-sm text-red-700">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{historyError}</span>
                </div>
              )}

              {history && (
                <div className="space-y-3">
                  {history.data.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-6">
                      No hay entregas que coincidan con el filtro.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {history.data.map((d) => (
                        <div key={d.id} className="rounded-xl bg-white/70 border border-white/60 p-3 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-gray-800">
                              {d.orderNumber ?? 'Código de pedido no disponible'}
                            </span>
                            {d.method ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                {deliveryMethodLabel[d.method]}
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                {d.failureReason ? failureReasonLabel[d.failureReason] : 'Fallida'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDateTime(d.deliveredAt)} · por{' '}
                            {d.confirmedByUserName ?? 'Vendedor de la tienda'}
                          </p>
                          {d.note && <p className="text-xs text-gray-600 mt-1 italic">“{d.note}”</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Paginación */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-gray-500">
                      Página {history.page} de {totalPages} · {history.total} entrega(s)
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadHistory(page - 1)}
                        disabled={page <= 1 || historyLoading}
                        className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-yellow-50 disabled:opacity-40 transition"
                        aria-label="Página anterior"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        onClick={() => loadHistory(page + 1)}
                        disabled={page >= totalPages || historyLoading}
                        className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-yellow-50 disabled:opacity-40 transition"
                        aria-label="Página siguiente"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* Escáner de QR con la cámara (UC-03). Se monta solo al abrir para arrancar con
          estado limpio y liberar la cámara al cerrar. */}
      {scannerOpen && (
        <QrScannerModal
          open
          onClose={() => setScannerOpen(false)}
          onResult={handleScanResult}
        />
      )}

      {/* Confirmar entrega (error prevention: acción irreversible) */}
      <ModalShell
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirmar entrega"
        subtitle="Esta acción marca el código como usado y no se puede deshacer."
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Vas a confirmar la entrega del pedido{' '}
            <span className="font-semibold">
              {validation.kind === 'valid'
                ? validation.order.orderNumber
                : ''}
            </span>
            . El comprador será notificado y se liberará el pago a la tienda.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmOpen(false)}
              className="flex-1 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold hover:from-yellow-500 hover:to-yellow-600 transition-all disabled:opacity-50"
            >
              {confirming ? 'Confirmando…' : 'Sí, confirmar'}
            </button>
          </div>
        </div>
      </ModalShell>
    </div>
  );
};

export default DeliveriesPage;
