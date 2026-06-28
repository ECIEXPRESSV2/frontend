import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { ArrowLeft, RefreshCw, MessageCircle, RotateCcw, XCircle, Star, Plus, Undo2, X, Eye, EyeOff, CreditCard, Loader2, Store as StoreIcon } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import ModalShell from '../../components/wallet/ModalShell';
import { OrderFulfillmentPanel } from '../../components/orders/OrderFulfillmentPanel';
import { OrderProgressTimeline, isActiveOrder } from '../../components/orders/OrderProgressTimeline';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import { useOrdersApi } from '../../hooks/useOrdersApi';
import { ORDERS_API_BASE_URL, type OrderResponse, type OrderStatus } from '../../lib/orders-api';
import { formatCOP, formatDateTime } from '../../lib/format';
import { isCancellable, isHideable, isPayable, isRateable, isReorderable, isReturnable, orderDisplayName, statusLabel, statusTone } from '../../lib/orders-ui';

const StoreMapModal = lazy(() => import('../../components/store/StoreMapModal'));

interface OrdersPageProps {
  onBack?: () => void;
}

const STATUS_FILTERS: Array<{ value: 'ALL' | OrderStatus; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PENDING_PAYMENT', label: 'Pago pendiente' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'READY_FOR_PICKUP', label: 'Listo' },
  { value: 'DELIVERED', label: 'Entregado' },
  { value: 'CANCELLED', label: 'Cancelado' },
];

const PAYMENT_LABEL: Record<OrderResponse['paymentMethod'], string> = {
  wallet: 'Billetera ECIExpress',
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
};

const DELIVERY_LABEL: Record<OrderResponse['deliveryMethod'], string> = {
  pickup: 'Retiro en tienda',
  delivery: 'Entrega',
};

function statusChangedAt(order: OrderResponse, status: OrderStatus): string | undefined {
  return [...order.statusHistory]
    .reverse()
    .find((entry) => entry.toStatus === status)?.occurredAt;
}

/** Clave de localStorage donde guardamos los pedidos ocultos por usuario. */
const hiddenStorageKey = (userId?: string) => `eciexpress:orders:hidden:${userId ?? 'anon'}`;

const OrdersPage: React.FC<OrdersPageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userProfile, getToken } = useAuth();
  const { openRecharge } = useWallet();
  const api = useOrdersApi();

  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [connected, setConnected] = useState(false);

  // Pedidos que el cliente ocultó de su vista (persisten en localStorage por usuario).
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);

  const [rating, setRating] = useState<{ open: boolean; score: number; comment: string }>({ open: false, score: 5, comment: '' });
  const [returnModal, setReturnModal] = useState<{ open: boolean; full: boolean; qty: Record<string, number> }>({ open: false, full: true, qty: {} });
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  // Mensaje de éxito (banner verde) para recreación de pedidos.
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  const selected = useMemo(() => orders.find((o) => o.id === selectedId) ?? null, [orders, selectedId]);
  const selectedIsActive = selected ? isActiveOrder(selected.status) : false;
  const selectedDeliveredAt = selected
    ? statusChangedAt(selected, 'DELIVERED') ?? selected.cancelledAt ?? selected.updatedAt
    : undefined;
  const selectedItemCount = selected?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const selectedMilestoneLabel = selectedIsActive
    ? 'Siguiente paso'
    : selected?.status === 'DELIVERED'
      ? 'Entrega'
      : 'Cierre';
  const visibleOrders = useMemo(() => {
    const byStatus = filter === 'ALL' ? orders : orders.filter((o) => o.status === filter);
    // En la vista normal escondemos los ocultos; en la vista "ocultos" solo mostramos esos.
    return byStatus.filter((o) => (showHidden ? hiddenIds.has(o.id) : !hiddenIds.has(o.id)));
  }, [orders, filter, hiddenIds, showHidden]);
  const hiddenCount = useMemo(() => orders.filter((o) => hiddenIds.has(o.id)).length, [orders, hiddenIds]);

  const upsertOrder = (order: OrderResponse) =>
    setOrders((current) => {
      const exists = current.some((o) => o.id === order.id);
      return exists ? current.map((o) => (o.id === order.id ? order : o)) : [order, ...current];
    });

  // Carga los pedidos ocultos guardados para este usuario.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(hiddenStorageKey(userProfile?.id));
      setHiddenIds(new Set(raw ? (JSON.parse(raw) as string[]) : []));
    } catch {
      setHiddenIds(new Set());
    }
  }, [userProfile?.id]);

  const persistHidden = (next: Set<string>) => {
    setHiddenIds(next);
    try {
      localStorage.setItem(hiddenStorageKey(userProfile?.id), JSON.stringify([...next]));
    } catch { /* localStorage no disponible */ }
  };

  const openOrderSummary = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('orderId', id);
    setSearchParams(next);
    setSelectedId(id);
  };

  const closeOrderSummary = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('orderId');
    setSearchParams(next);
    setSelectedId('');
  };

  const hideOrder = (id: string) => {
    const next = new Set(hiddenIds);
    next.add(id);
    persistHidden(next);
    if (selectedId === id) closeOrderSummary();
  };

  const unhideOrder = (id: string) => {
    const next = new Set(hiddenIds);
    next.delete(id);
    persistHidden(next);
  };

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    setSelectedId(orderId ?? '');
  }, [searchParams]);

  const load = async () => {
    if (!userProfile?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getOrders({ customerId: userProfile.id });
      setOrders(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los pedidos');
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial
  useEffect(() => {
    if (userProfile?.id) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.id]);

  // Socket en tiempo real (RF-08)
  useEffect(() => {
    let active = true;
    let socket: Socket | null = null;
    (async () => {
      let token = '';
      try { token = await getToken(); } catch { /* sin sesión */ }
      if (!active) return;
      socket = io(`${ORDERS_API_BASE_URL}/communication`, { transports: ['websocket'], auth: { token } });
      socketRef.current = socket;
      socket.on('connect', () => {
        setConnected(true);
        orders.forEach((o) => socket?.emit('order:subscribe', { orderId: o.id }));
      });
      socket.on('disconnect', () => setConnected(false));
      socket.on('order:status-updated', (payload: OrderResponse) => upsertOrder(payload));
    })();
    return () => {
      active = false;
      socket?.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Suscribirse a la sala de cada pedido cargado
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !connected) return;
    orders.forEach((o) => socket.emit('order:subscribe', { orderId: o.id }));
  }, [orders, connected]);

  const handleCancel = async (order: OrderResponse) => {
    setActionMsg(null);
    setSuccessMsg(null);
    try {
      const updated = await api.cancelOrder(order.id, { reason: 'Cancelado por el comprador' });
      upsertOrder(updated);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'No se pudo cancelar');
    }
  };

  const handleReorder = async (order: OrderResponse) => {
    setActionMsg(null);
    setSuccessMsg(null);
    setReorderingId(order.id);
    try {
      const created = await api.createOrder({
        storeId: order.storeId,
        storeName: order.storeName,
        items: order.items.map((i) => ({
          productId: i.productId,
          name: i.name,
          description: i.description,
          imageUrl: i.imageUrl,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
        })),
        paymentMethod: order.paymentMethod,
        deliveryMethod: order.deliveryMethod,
        currency: order.currency,
      });
      upsertOrder(created);
      // Volver a la vista de pedidos no ocultos para ver el pedido recién recreado.
      setShowHidden(false);
      setFilter('ALL');
      openOrderSummary(created.id);
      socketRef.current?.emit('order:subscribe', { orderId: created.id });
      setSuccessMsg(`Tu pedido fue recreado exitosamente con numero de orden #${created.orderNumber.slice(-4)}`);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'No se pudo reordenar');
    } finally {
      setReorderingId(null);
    }
  };

  const openReturn = () => {
    if (!selected) return;
    setReturnModal({ open: true, full: true, qty: Object.fromEntries(selected.items.map((i) => [i.productId, 0])) });
  };

  const submitReturn = async () => {
    if (!selected) return;
    try {
      const payload = returnModal.full
        ? { full: true }
        : {
            full: false,
            items: Object.entries(returnModal.qty)
              .filter(([, q]) => q > 0)
              .map(([productId, quantity]) => ({ productId, quantity })),
          };
      if (!returnModal.full && (!payload.items || payload.items.length === 0)) {
        setActionMsg('Selecciona al menos un producto a devolver');
        return;
      }
      await api.requestReturn(selected.id, payload);
      setReturnModal({ open: false, full: true, qty: {} });
      setActionMsg('Devolución solicitada. Se reembolsará a tu billetera al confirmarse.');
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'No se pudo solicitar la devolución');
    }
  };

  const submitRating = async () => {
    if (!selected) return;
    try {
      const updated = await api.rateOrder(selected.id, { score: rating.score, comment: rating.comment || undefined });
      upsertOrder(updated);
      setRating({ open: false, score: 5, comment: '' });
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'No se pudo calificar');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <Sidebar activeItem="orders" />

      <main className="ml-16 px-4 pb-6 pt-20 md:px-8 md:pb-8 lg:px-10">
        <div className="max-w-7xl mx-auto space-y-6">
          <header className="relative overflow-hidden rounded-[28px] border border-yellow-200/70 bg-[linear-gradient(135deg,#F4B942_0%,#FBBF24_48%,#FDE68A_100%)] p-5 shadow-lg shadow-yellow-200/60 md:p-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/60" />
            <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-white/22 blur-3xl" />
            <div className="pointer-events-none absolute right-[-90px] top-[-110px] h-72 w-72 rounded-full bg-[#FB923C]/22 blur-3xl" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <nav className="mb-3 inline-flex items-center rounded-xl border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm backdrop-blur" aria-label="Ruta de navegacion">
                  ECIxpress <span className="mx-2 text-gray-400">/</span>
                  <span className="text-gray-950">Pedidos</span>
                </nav>
                <h1 className="text-3xl font-bold tracking-normal text-white md:text-4xl">Mis pedidos</h1>
                <p className="mt-2 max-w-2xl text-sm font-medium text-white/85">
                  Haz seguimiento, revisa el detalle y contacta a la tienda cuando lo necesites.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => (onBack ? onBack() : navigate('/home'))}
                  className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-4 py-2 text-sm font-bold text-gray-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-gray-950 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  <ArrowLeft size={16} /> Volver
                </button>
                <button onClick={load} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-4 py-2 text-sm font-bold text-gray-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-gray-950 focus:outline-none focus:ring-2 focus:ring-white">
                  <RefreshCw size={16} /> Actualizar
                </button>
                <button onClick={() => setMapOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-bold text-amber-700 shadow-sm transition hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-white">
                  <Plus size={16} /> Nuevo pedido
                </button>
              </div>
            </div>
          </header>

          {/* Filtros */}
          <div className="rounded-3xl border border-white/70 bg-white/82 p-4 shadow-lg shadow-gray-200/60 backdrop-blur-xl">
            <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${filter === f.value ? 'bg-yellow-400 text-gray-950 shadow-sm' : 'border border-gray-100 bg-white text-gray-600 hover:border-yellow-200 hover:bg-yellow-50 hover:text-amber-700'}`}
              >
                {f.label}
              </button>
            ))}
            </div>
          </div>

          {/* Organizar la vista: mostrar/ocultar los pedidos cerrados que el cliente archivó */}
          {(hiddenCount > 0 || showHidden) && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowHidden((v) => !v)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/80 text-gray-600 border border-white/60 hover:bg-white transition-all"
              >
                {showHidden ? <><Eye size={14} /> Ver pedidos activos</> : <><EyeOff size={14} /> Ver ocultos ({hiddenCount})</>}
              </button>
            </div>
          )}

          {successMsg && <div className="rounded-xl bg-green-50 border border-green-300 px-4 py-3 text-sm font-bold text-green-700">{successMsg}</div>}
          {actionMsg && <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-gray-700">{actionMsg}</div>}
          {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="space-y-5">
            {/* Lista */}
            <section className="space-y-4">
              {loading && <p className="text-sm text-gray-500">Cargando pedidos…</p>}
              {!loading && visibleOrders.length === 0 && (
                <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 p-8 text-center text-gray-500">
                  {showHidden ? 'No tienes pedidos ocultos.' : `No tienes pedidos ${filter !== 'ALL' ? 'con ese estado' : 'todavía'}.`}
                </div>
              )}
              {visibleOrders.map((order) => {
                const firstItem = order.items[0];
                return (
                <article key={order.id} aria-label={`Pedido ${order.orderNumber} de ${order.storeName}`} className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:border-yellow-200 hover:shadow-md ${selectedId === order.id ? 'border-yellow-300 ring-2 ring-yellow-100' : 'border-gray-100'}`}>
                  <div className={`absolute inset-x-0 top-0 h-1 ${selectedId === order.id ? 'bg-yellow-400' : 'bg-amber-200'}`} aria-hidden="true" />
                  <div className="grid gap-0 md:grid-cols-[220px_1fr_auto]">
                      <button
                        type="button"
                      onClick={() => openOrderSummary(order.id)}
                      className="flex min-h-[150px] flex-col items-center justify-center border-b border-gray-100 bg-white px-4 py-4 text-center transition hover:bg-yellow-50/40 md:border-b-0 md:border-r"
                    >
                      {firstItem?.imageUrl ? (
                        <img src={firstItem.imageUrl} alt={firstItem.name} className="h-24 w-32 rounded-xl object-contain" />
                      ) : (
                        <div className="flex h-24 w-32 items-center justify-center rounded-xl border border-amber-100 bg-amber-50 text-xl font-black text-amber-700">
                          {firstItem?.name.trim()[0]?.toUpperCase() ?? 'P'}
                        </div>
                      )}
                      <p className="mt-2 line-clamp-1 text-xs font-bold text-gray-600">{firstItem?.name ?? 'Pedido'}</p>
                      <p className="text-xs font-semibold text-gray-950">{firstItem ? formatCOP(firstItem.totalAmount) : formatCOP(order.totalAmount)}</p>
                    </button>

                      <button
                        type="button"
                      onClick={() => openOrderSummary(order.id)}
                      className="flex min-h-[150px] flex-col justify-center px-5 py-4 text-left transition hover:bg-yellow-50/40"
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <StoreIcon size={15} className="text-amber-600" aria-hidden="true" />
                        <h2 className="truncate text-lg font-black tracking-tight text-gray-950">{order.storeName}</h2>
                      </div>
                      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr_auto_1fr]">
                        <dt className="font-semibold text-gray-900">Fecha:</dt>
                        <dd className="truncate text-gray-500">{formatDateTime(order.createdAt)}</dd>
                        <dt className="font-semibold text-gray-900">Cantidad:</dt>
                        <dd className="text-gray-500">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</dd>
                        <dt className="font-semibold text-gray-900">Total:</dt>
                        <dd className="font-semibold text-gray-500">{formatCOP(order.totalAmount)}</dd>
                        <dt className="font-semibold text-gray-900">Código:</dt>
                        <dd className="text-gray-500">#{order.orderNumber.slice(-4)}</dd>
                      </dl>
                    </button>

                    <div className="flex min-h-[150px] flex-col items-stretch justify-between gap-4 border-t border-gray-100 bg-white px-4 py-4 md:w-64 md:border-l md:border-t-0">
                      <span className={`inline-flex justify-center rounded-2xl px-4 py-2 text-sm font-bold ${statusTone[order.status]}`}>{statusLabel[order.status]}</span>
                      <div className="grid gap-2">
                        <button
                          type="button"
                          onClick={() => openOrderSummary(order.id)}
                          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-gray-950 transition hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                        >
                          Ver resumen
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/messages?orderId=${order.id}`)}
                          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-bold text-amber-700 transition hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                        >
                          Contactar tienda
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Ocultar (pedidos cerrados) o restaurar (vista de ocultos) */}
                  {showHidden ? (
                    <button
                      onClick={() => unhideOrder(order.id)}
                      title="Restaurar a mi vista"
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-400 flex items-center justify-center hover:text-emerald-600 hover:border-emerald-300 transition-colors"
                    >
                      <Eye size={14} />
                    </button>
                  ) : isHideable(order.status) ? (
                    <button
                      onClick={() => hideOrder(order.id)}
                      title="Ocultar de mi vista"
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-400 flex items-center justify-center hover:text-red-500 hover:border-red-300 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </article>
              );
              })}
            </section>

          </div>
        </div>
      </main>

      <ModalShell
        open={Boolean(selected)}
        onClose={closeOrderSummary}
        title="Resumen del pedido"
        subtitle={selected ? `Pedido ${selected.orderNumber}` : undefined}
        maxWidth="max-w-6xl"
        bodyClassName="bg-white px-4 py-5 md:px-6"
      >
        {selected && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={closeOrderSummary}
                  className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-100 bg-white text-amber-700 transition hover:bg-yellow-50"
                  aria-label="Cerrar resumen"
                >
                  <ArrowLeft size={17} />
                </button>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-600">Resumen</p>
                  <h2 className="text-2xl font-black text-gray-950">{orderDisplayName(selected)}</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Pedido {selected.orderNumber} · {selectedItemCount} producto{selectedItemCount === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <span className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-black ${statusTone[selected.status]}`}>
                {statusLabel[selected.status]}
              </span>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-6">
                <section className="rounded-3xl border border-amber-100 bg-white/80 p-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <h3 className="text-lg font-black text-gray-950">Inicio</h3>
                      <p className="mt-1 text-sm font-semibold text-gray-700">{formatDateTime(selected.createdAt)}</p>
                      <p className="mt-2 text-sm text-gray-500">{selected.storeName}</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-950">{selectedMilestoneLabel}</h3>
                      <p className="mt-1 text-sm font-semibold text-gray-700">
                        {selectedIsActive ? statusLabel[selected.status] : formatDateTime(selectedDeliveredAt)}
                      </p>
                      <p className="mt-2 text-sm text-gray-500">{DELIVERY_LABEL[selected.deliveryMethod]}</p>
                    </div>
                  </div>
                </section>

                <OrderProgressTimeline
                  order={selected}
                  variant={selectedIsActive ? 'vertical' : 'horizontal'}
                  showDates={!selectedIsActive}
                />

                <OrderFulfillmentPanel order={selected} />

                <section className="rounded-3xl border border-gray-100 bg-white/80 p-5">
                  <h3 className="mb-4 text-lg font-black text-gray-950">Resumen del pedido</h3>
                  <div className="space-y-3">
                    {selected.items.map((item) => (
                      <div key={item.id} className="grid gap-3 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[56px_1fr_auto] sm:items-center">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="h-14 w-14 rounded-2xl object-contain" />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-lg font-black text-amber-700">
                            {item.name.trim()[0]?.toUpperCase() ?? 'P'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-black text-gray-950">{item.name}</p>
                          {item.description && <p className="line-clamp-2 text-sm text-gray-500">{item.description}</p>}
                          <p className="mt-1 text-xs font-semibold text-gray-400">x{item.quantity} · {formatCOP(item.unitPrice)}</p>
                        </div>
                        <p className="font-black text-gray-950">{formatCOP(item.totalAmount)}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {selected.rating && (
                  <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-sm">
                    <div className="flex items-center gap-1 text-emerald-700 font-black">
                      {Array.from({ length: selected.rating.score }).map((_, i) => <Star key={i} size={15} fill="currentColor" />)}
                    </div>
                    {selected.rating.comment && <p className="mt-1 text-gray-600">{selected.rating.comment}</p>}
                  </section>
                )}
              </div>

              <aside className="space-y-4">
                <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-black text-gray-950">Costos</h3>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-gray-500">Productos</dt>
                      <dd className="font-bold text-gray-900">{formatCOP(selected.subtotalAmount)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-gray-500">Descuentos</dt>
                      <dd className="font-bold text-emerald-600">
                        {selected.discountAmount > 0 ? `-${formatCOP(selected.discountAmount)}` : formatCOP(0)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3 border-t border-gray-100 pt-3 text-base">
                      <dt className="font-black text-gray-950">Total</dt>
                      <dd className="font-black text-gray-950">{formatCOP(selected.totalAmount)}</dd>
                    </div>
                  </dl>
                </section>

                <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-black text-gray-950">Método de pago</h3>
                  <p className="mt-3 text-sm font-bold text-gray-700">{PAYMENT_LABEL[selected.paymentMethod]}</p>
                  {selected.pickupExpiresAt && (
                    <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                      Recoger antes de {formatDateTime(selected.pickupExpiresAt)}
                    </p>
                  )}
                </section>

                <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-black text-gray-950">Acciones</h3>
                  <div className="mt-4 grid gap-2">
                    <button onClick={() => navigate(`/messages?orderId=${selected.id}`)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-gray-950 transition hover:bg-yellow-500">
                      <MessageCircle size={16} /> Chat con la tienda
                    </button>
                    {isPayable(selected.status) && (
                      <button onClick={openRecharge} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-600">
                        <CreditCard size={16} /> Pagar
                      </button>
                    )}
                    {isReorderable(selected.status) && (
                      <button
                        onClick={() => handleReorder(selected)}
                        disabled={reorderingId === selected.id}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-700 transition hover:bg-yellow-50 disabled:cursor-wait disabled:opacity-70"
                      >
                        {reorderingId === selected.id ? <><Loader2 size={16} className="animate-spin" /> Recreando...</> : <><RotateCcw size={16} /> Reordenar</>}
                      </button>
                    )}
                    {isRateable(selected.status) && !selected.rating && (
                      <button onClick={() => setRating({ open: true, score: 5, comment: '' })} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-600">
                        <Star size={16} /> Calificar
                      </button>
                    )}
                    {isReturnable(selected.status) && (
                      <button onClick={openReturn} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-purple-500 px-4 py-2 text-sm font-black text-white transition hover:bg-purple-600">
                        <Undo2 size={16} /> Devolver
                      </button>
                    )}
                    {isCancellable(selected.status) && (
                      <button onClick={() => handleCancel(selected)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-black text-white transition hover:bg-red-600">
                        <XCircle size={16} /> Cancelar
                      </button>
                    )}
                  </div>
                </section>
              </aside>
            </div>
          </div>
        )}
      </ModalShell>

      {mapOpen && (
        <Suspense fallback={null}>
          <StoreMapModal open={mapOpen} onClose={() => setMapOpen(false)} />
        </Suspense>
      )}

      {/* Modal de devolución (total o parcial) */}
      <ModalShell open={returnModal.open} onClose={() => setReturnModal((r) => ({ ...r, open: false }))} title="Solicitar devolución" subtitle="Elige qué devolver; products calcula el monto y financial lo reembolsa">
        {selected && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setReturnModal((r) => ({ ...r, full: true }))}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${returnModal.full ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Devolución total
              </button>
              <button
                onClick={() => setReturnModal((r) => ({ ...r, full: false }))}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${!returnModal.full ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Parcial
              </button>
            </div>

            {!returnModal.full && (
              <ul className="space-y-2 max-h-72 overflow-auto">
                {selected.items.map((item) => {
                  const q = returnModal.qty[item.productId] ?? 0;
                  return (
                    <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">comprados: {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setReturnModal((r) => ({ ...r, qty: { ...r.qty, [item.productId]: Math.max(0, (r.qty[item.productId] ?? 0) - 1) } }))}
                          className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                        >–</button>
                        <span className="w-6 text-center font-semibold">{q}</span>
                        <button
                          onClick={() => setReturnModal((r) => ({ ...r, qty: { ...r.qty, [item.productId]: Math.min(item.quantity, (r.qty[item.productId] ?? 0) + 1) } }))}
                          className="w-7 h-7 rounded-lg bg-purple-500 text-white flex items-center justify-center hover:bg-purple-600"
                        >+</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <button onClick={submitReturn} className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold hover:from-purple-600 hover:to-purple-700 transition-all">
              Confirmar devolución
            </button>
          </div>
        )}
      </ModalShell>

      {/* Modal de calificación (RF-10) */}
      <ModalShell open={rating.open} onClose={() => setRating((r) => ({ ...r, open: false }))} title="Calificar pedido" subtitle="¿Cómo estuvo tu experiencia?">
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating((r) => ({ ...r, score: n }))} className="p-1">
                <Star size={32} className={n <= rating.score ? 'text-yellow-400' : 'text-gray-300'} fill={n <= rating.score ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
          <textarea
            value={rating.comment}
            onChange={(e) => setRating((r) => ({ ...r, comment: e.target.value }))}
            placeholder="Comentario (opcional)"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white/60 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
          />
          <button onClick={submitRating} className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold hover:from-yellow-500 hover:to-yellow-600 transition-all">
            Enviar calificación
          </button>
        </div>
      </ModalShell>
    </div>
  );
};

export default OrdersPage;
