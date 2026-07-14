import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { ArrowLeft, RefreshCw, MessageCircle, RotateCcw, XCircle, Star, Plus, Undo2, X, Trash2, CreditCard, Loader2, Store as StoreIcon, ChevronLeft, ChevronRight, Search, ShoppingCart } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import TrianglePattern from '../../components/home/TrianglePattern';
import ModalShell from '../../components/wallet/ModalShell';
import { OrderFulfillmentPanel } from '../../components/orders/OrderFulfillmentPanel';
import { OrderProgressTimeline } from '../../components/orders/OrderProgressTimeline';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import { useOrdersApi } from '../../hooks/useOrdersApi';
import { useRefreshOnScrollTop } from '../../hooks/useRefreshOnScrollTop';
import { ORDERS_WS_URL, type OrderResponse, type OrderStatus } from '../../lib/orders-api';
import { formatCOP, formatDateTime } from '../../lib/format';
import { isCancellable, isPayable, isRateable, isReorderable, isReturnable, orderDisplayName, statusLabel, statusTone } from '../../lib/orders-ui';

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

const PAGE_SIZE = 4;

const PAYMENT_LABEL: Record<OrderResponse['paymentMethod'], string> = {
  wallet: 'Billetera ECIExpress',
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
};

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
  const [search, setSearch] = useState('');
  const [connected, setConnected] = useState(false);

  const [page, setPage] = useState(1);

  const [rating, setRating] = useState<{ open: boolean; score: number; comment: string }>({ open: false, score: 5, comment: '' });
  const [returnModal, setReturnModal] = useState<{ open: boolean; full: boolean; qty: Record<string, number> }>({ open: false, full: true, qty: {} });
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  // Mensaje de éxito (banner verde) para recreación de pedidos.
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  const selected = useMemo(() => orders.find((o) => o.id === selectedId) ?? null, [orders, selectedId]);
  const selectedItemCount = selected?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const visibleOrders = useMemo(() => {
    const byStatus = filter === 'ALL' ? orders : orders.filter((o) => o.status === filter);
    const query = search.trim().toLowerCase();
    const bySearch = query
      ? byStatus.filter((order) =>
          [
            order.storeName,
            order.orderNumber,
            order.items.map((item) => item.name).join(' '),
          ].some((value) => value.toLowerCase().includes(query)),
        )
      : byStatus;
    return bySearch;
  }, [orders, filter, search]);
  const totalPages = Math.max(1, Math.ceil(visibleOrders.length / PAGE_SIZE));
  const pagedOrders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return visibleOrders.slice(start, start + PAGE_SIZE);
  }, [visibleOrders, page]);
  const upsertOrder = (order: OrderResponse) =>
    setOrders((current) => {
      const exists = current.some((o) => o.id === order.id);
      return exists ? current.map((o) => (o.id === order.id ? order : o)) : [order, ...current];
    });

  const openOrderSummary = (id: string) => {
    setActionMsg(null);
    const index = visibleOrders.findIndex((order) => order.id === id);
    if (index >= 0) setPage(Math.floor(index / PAGE_SIZE) + 1);
    const next = new URLSearchParams(searchParams);
    next.set('orderId', id);
    setSearchParams(next);
    setSelectedId(id);
  };

  // Un pedido en estado carrito (DRAFT) no se "ve", se continúa: se vuelve a la tienda con el
  // draft para seguir agregando productos y pagar.
  const continueDraft = (order: OrderResponse) => navigate(`/store/${order.storeId}?draft=${order.id}`);
  const openOrder = (order: OrderResponse) =>
    order.status === 'DRAFT' ? continueDraft(order) : openOrderSummary(order.id);

  const closeOrderSummary = () => {
    setActionMsg(null);
    const next = new URLSearchParams(searchParams);
    next.delete('orderId');
    setSearchParams(next);
    setSelectedId('');
  };

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    setSelectedId(orderId ?? '');
  }, [searchParams]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  useEffect(() => {
    if (!selectedId) return;
    const index = visibleOrders.findIndex((order) => order.id === selectedId);
    if (index >= 0) setPage(Math.floor(index / PAGE_SIZE) + 1);
  }, [selectedId, visibleOrders]);

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

  useRefreshOnScrollTop(load, { disabled: loading });

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
      // token en query: requerido por el WS proxy del API Gateway, que lee ?token= del
      // HTTP upgrade. También en auth.token para conexión directa al servicio sin gateway.
      // Riesgo aceptado: el token aparece en la URL del upgrade (visible en logs de red).
      // Los tokens de Firebase expiran en ~1 h; getToken() siempre devuelve uno vigente.
      socket = io(ORDERS_WS_URL, { path: '/orders/socket.io', transports: ['websocket'], auth: { token }, query: { token } });
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
      const message = e instanceof Error ? e.message : '';
      setActionMsg(
        message.includes('IN_PREPARATION')
          ? 'Tu pedido ya está en preparación y no se puede cancelar.'
          : message || 'No se pudo cancelar el pedido.',
      );
    }
  };

  const handleDelete = async (order: OrderResponse) => {
    if (!window.confirm(`¿Borrar pedido ${order.orderNumber.slice(-4)}? Esta acción no se puede deshacer.`)) return;
    setActionMsg(null);
    setSuccessMsg(null);
    try {
      await api.deleteOrder(order.id);
      setOrders((current) => current.filter((o) => o.id !== order.id));
      if (selectedId === order.id) closeOrderSummary();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'No se pudo borrar el pedido');
    }
  };

  const handleBulkDelete = async (status: 'DELIVERED' | 'CANCELLED') => {
    const targets = orders.filter((o) => o.status === status);
    if (targets.length === 0) return;
    const label = status === 'CANCELLED' ? 'cancelados' : 'entregados';
    if (!window.confirm(`¿Borrar ${targets.length} pedido${targets.length === 1 ? '' : 's'} ${label}?`)) return;
    setActionMsg(null);
    setSuccessMsg(null);
    let deleted = 0;
    for (const order of targets) {
      try {
        await api.deleteOrder(order.id);
        deleted++;
      } catch { /* skip individual failures */ }
    }
    setOrders((current) => current.filter((o) => o.status !== status));
    if (selected && selected.status === status) closeOrderSummary();
    if (deleted > 0) setActionMsg(`Se borraron ${deleted} pedido${deleted === 1 ? '' : 's'} ${label}.`);
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

      <main className="app-shift px-4 pb-28 pt-20 md:px-8 md:pb-8 lg:px-10">
        <div className="relative mx-auto w-full max-w-7xl space-y-6">
          <header className="theme-surface relative overflow-hidden rounded-[32px] border border-white/60 bg-[linear-gradient(140deg,rgb(var(--accent-rgb)/0.32)_0%,rgba(255,255,255,0.62)_42%,rgb(var(--accent-rgb)/0.14)_72%,rgb(var(--accent-rgb)/0.36)_100%)] backdrop-blur-2xl [box-shadow:0_28px_50px_-28px_rgb(var(--accent-rgb)/0.45)]">
            <div aria-hidden="true" className="theme-surface absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[rgb(var(--accent-rgb)/0.32)] blur-3xl" />
            <div aria-hidden="true" className="theme-surface absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-[rgb(var(--accent-rgb)/0.20)] blur-3xl" />
            <TrianglePattern className="absolute inset-0 pointer-events-none" />
            <div className="relative flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between md:p-6">
              <div className="max-w-3xl">
                <nav className="mb-3 inline-flex items-center rounded-xl border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm backdrop-blur" aria-label="Ruta de navegacion">
                  ECIxpress <span className="mx-2 text-gray-400">/</span>
                  <span className="text-gray-950">Pedidos</span>
                </nav>
                <h1 className="font-display text-3xl font-bold tracking-normal text-gray-900 md:text-4xl">Mis pedidos</h1>
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
                <span title={connected ? 'Conectado en tiempo real' : 'Sin conexión en tiempo real'} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider ${connected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  <span className={`inline-block h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  {connected ? 'EN VIVO' : 'SIN CONEXIÓN'}
                </span>
                <button onClick={() => setMapOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-bold text-amber-700 shadow-sm transition hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-white">
                  <Plus size={16} /> Nuevo pedido
                </button>
              </div>
            </div>
          </header>

          <div className="rounded-3xl border border-white/70 bg-white/82 p-4 shadow-lg shadow-gray-200/60 backdrop-blur-xl">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <label className="relative block">
                <span className="sr-only">Buscar pedidos</span>
                <input
                  className="min-h-12 w-full rounded-2xl border border-gray-100 bg-white py-3 pl-5 pr-24 text-base font-medium text-gray-900 outline-none transition placeholder:text-gray-400 hover:border-yellow-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                  placeholder="Buscar por tienda, código o producto"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
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
                <span className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl bg-yellow-400 text-white" aria-hidden="true">
                  <Search size={16} />
                </span>
              </label>
              <p className="text-sm font-semibold text-gray-500">
                {visibleOrders.length} pedido{visibleOrders.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
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
            {(orders.some(o => o.status === 'CANCELLED') || orders.some(o => o.status === 'DELIVERED')) && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                {orders.some(o => o.status === 'CANCELLED') && (
                  <button
                    onClick={() => handleBulkDelete('CANCELLED')}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition"
                  >
                    <Trash2 size={12} /> Limpiar cancelados
                  </button>
                )}
                {orders.some(o => o.status === 'DELIVERED') && (
                  <button
                    onClick={() => handleBulkDelete('DELIVERED')}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                  >
                    <Trash2 size={12} /> Limpiar entregados
                  </button>
                )}
              </div>
            )}
          </div>

          {successMsg && <div className="rounded-xl bg-green-50 border border-green-300 px-4 py-3 text-sm font-bold text-green-700">{successMsg}</div>}
          {actionMsg && !selected && <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-gray-700">{actionMsg}</div>}
          {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="space-y-5">
            {/* Lista */}
            <section className="space-y-4">
              {loading && <p className="text-sm text-gray-500">Cargando pedidos…</p>}
              {!loading && visibleOrders.length === 0 && (
                <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 p-8 text-center text-gray-500">
                  {search ? `No hay pedidos que coincidan con "${search}".` : `No tienes pedidos ${filter !== 'ALL' ? 'con ese estado' : 'todavía'}.`}
                </div>
              )}
              {pagedOrders.map((order) => {
                const firstItem = order.items[0];
                return (
                <article key={order.id} aria-label={`Pedido ${order.orderNumber} de ${order.storeName}`} className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:border-yellow-200 hover:shadow-md ${selectedId === order.id ? 'border-yellow-300 ring-2 ring-yellow-100' : 'border-gray-100'}`}>
                  <div className={`absolute inset-x-0 top-0 h-1 ${selectedId === order.id ? 'bg-yellow-400' : 'bg-amber-200'}`} aria-hidden="true" />
                  <div className="grid gap-0 md:grid-cols-[160px_1fr_auto]">
                      <button
                        type="button"
                      onClick={() => openOrder(order)}
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
                      onClick={() => openOrder(order)}
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
                        {order.status === 'DRAFT' ? (
                          <button
                            type="button"
                            onClick={() => continueDraft(order)}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-gray-950 transition hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                          >
                            <ShoppingCart size={16} /> Continuar
                          </button>
                        ) : (
                          <>
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
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {(order.status === 'DELIVERED' || order.status === 'CANCELLED' || order.status === 'FAILED') && (
                    <button
                      onClick={() => handleDelete(order)}
                      title="Borrar pedido"
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-400 flex items-center justify-center hover:text-red-500 hover:border-red-300 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </article>
              );
              })}

              {!loading && visibleOrders.length > PAGE_SIZE && (
                <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-500">
                    Mostrando <span className="font-semibold text-gray-900">{(page - 1) * PAGE_SIZE + 1}</span> a{' '}
                    <span className="font-semibold text-gray-900">{Math.min(page * PAGE_SIZE, visibleOrders.length)}</span> de{' '}
                    <span className="font-semibold text-gray-900">{visibleOrders.length}</span> pedidos
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
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
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                      disabled={page === totalPages}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 transition hover:border-yellow-300 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Siguiente
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
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
                  <p className="mt-1 text-sm text-gray-500">{formatDateTime(selected.createdAt)}</p>
                </div>
              </div>
              <span className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-black ${statusTone[selected.status]}`}>
                {statusLabel[selected.status]}
              </span>
            </div>

            {actionMsg && (
              <div role="alert" className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <XCircle size={17} className="shrink-0 text-amber-600" aria-hidden="true" />
                <span>{actionMsg}</span>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-6">
                <OrderProgressTimeline order={selected} />

                <OrderFulfillmentPanel order={selected} />

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
                <section className="rounded-3xl border border-amber-100 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-black text-gray-950">Resumen</h3>

                  <div className="mt-4 space-y-3">
                    {selected.items.map((item) => (
                      <div key={item.id} className="grid grid-cols-[40px_1fr_auto] items-center gap-3">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="h-10 w-10 rounded-xl object-contain" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-sm font-black text-amber-700">
                            {item.name.trim()[0]?.toUpperCase() ?? 'P'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-gray-900">{item.name}</p>
                          <p className="text-xs font-semibold text-gray-400">x{item.quantity} · {formatCOP(item.unitPrice)}</p>
                        </div>
                        <p className="text-sm font-black text-gray-950 tabular-nums">{formatCOP(item.totalAmount)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="my-4 border-t border-dashed border-amber-200" />

                  <dl className="space-y-2.5 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-gray-500">Productos</dt>
                      <dd className="font-bold text-gray-900 tabular-nums">{formatCOP(selected.subtotalAmount)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-gray-500">Descuentos</dt>
                      <dd className="font-bold text-emerald-600 tabular-nums">
                        {selected.discountAmount > 0 ? `-${formatCOP(selected.discountAmount)}` : formatCOP(0)}
                      </dd>
                    </div>
                  </dl>

                  <div className="my-4 border-t border-dashed border-amber-200" />

                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-black text-gray-950">Total</span>
                    <span className="text-2xl font-black text-amber-600 tabular-nums">{formatCOP(selected.totalAmount)}</span>
                  </div>

                  <div className="my-4 border-t border-dashed border-amber-200" />

                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-gray-500">Método de pago</span>
                    <span className="font-bold text-gray-900">{PAYMENT_LABEL[selected.paymentMethod]}</span>
                  </div>
                  {selected.pickupExpiresAt && (
                    <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                      Recoger antes de {formatDateTime(selected.pickupExpiresAt)}
                    </p>
                  )}
                </section>

                <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-black text-gray-950">Gestionar pedido</h3>
                  <div className="mt-4 grid gap-2">
                    <button onClick={() => navigate(`/messages?orderId=${selected.id}`)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-normal text-amber-800 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-yellow-300">
                      <MessageCircle size={16} /> Chat con la tienda
                    </button>
                    {isPayable(selected.status) && (
                      <button onClick={openRecharge} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-normal text-amber-800 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-yellow-300">
                        <CreditCard size={16} /> Pagar
                      </button>
                    )}
                    {isReorderable(selected.status) && (
                      <button
                        onClick={() => handleReorder(selected)}
                        disabled={reorderingId === selected.id}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-normal text-amber-800 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:cursor-wait disabled:opacity-70"
                      >
                        {reorderingId === selected.id ? <><Loader2 size={16} className="animate-spin" /> Recreando...</> : <><RotateCcw size={16} /> Reordenar</>}
                      </button>
                    )}
                    {isRateable(selected.status) && !selected.rating && (
                      <button onClick={() => setRating({ open: true, score: 5, comment: '' })} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-normal text-amber-800 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-yellow-300">
                        <Star size={16} /> Calificar
                      </button>
                    )}
                    {isReturnable(selected.status) && (
                      <button onClick={openReturn} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-normal text-amber-800 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-yellow-300">
                        <Undo2 size={16} /> Devolver
                      </button>
                    )}
                    {isCancellable(selected.status) && (
                      <button onClick={() => handleCancel(selected)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-normal text-amber-800 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-yellow-300">
                        <XCircle size={16} /> Cancelar
                      </button>
                    )}
                    {(selected.status === 'DELIVERED' || selected.status === 'CANCELLED' || selected.status === 'FAILED') && (
                      <button onClick={() => handleDelete(selected)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-normal text-amber-800 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-yellow-300">
                        <Trash2 size={16} /> Borrar pedido
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
