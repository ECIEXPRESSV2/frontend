import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { ArrowLeft, RefreshCw, MessageCircle, Store as StoreIcon, User, ChevronRight, ChevronLeft, XCircle, Loader2, Search, X } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import TrianglePattern from '../../components/home/TrianglePattern';
import { useAuth } from '../../context/AuthContext';
import { useOrdersApi } from '../../hooks/useOrdersApi';
import { useRefreshOnScrollTop } from '../../hooks/useRefreshOnScrollTop';
import { getMyStores } from '../../services/storeService';
import { ORDERS_API_BASE_URL, type OrderResponse, type OrderStatus } from '../../lib/orders-api';
import { formatCOP, formatDateTime } from '../../lib/format';
import { statusLabel, statusTone, isCancellable } from '../../lib/orders-ui';

interface VendorOrdersPageProps {
  onBack?: () => void;
}

const NEXT_STATUS: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  CONFIRMED: { status: 'READY_FOR_PICKUP', label: 'Listo para retirar' },
  IN_PREPARATION: { status: 'READY_FOR_PICKUP', label: 'Listo para retirar' },
  READY_FOR_PICKUP: { status: 'DELIVERED', label: 'Marcar como entregado' },
};

const STATUS_FILTERS: Array<{ value: 'ALL' | OrderStatus; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'READY_FOR_PICKUP', label: 'Listo para retirar' },
  { value: 'DELIVERED', label: 'Entregado' },
];

const PAGE_SIZE = 4;

const VendorOrdersPage: React.FC<VendorOrdersPageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { userProfile, getToken } = useAuth();
  const api = useOrdersApi();

  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const socketRef = useRef<Socket | null>(null);

  const upsertOrder = (order: OrderResponse) =>
    setOrders((current) => {
      const exists = current.some((o) => o.id === order.id);
      return exists ? current.map((o) => (o.id === order.id ? order : o)) : [order, ...current];
    });

  const load = async () => {
    if (!userProfile?.id) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const stores = await getMyStores(token);
      // Trae los pedidos de cada tienda del vendedor y los une (sin carritos DRAFT).
      const lists = await Promise.all(stores.map((store) => api.getOrders({ storeId: store.id })));
      const merged = lists
        .flat()
        .filter((order) => order.status !== 'DRAFT')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setOrders(merged);
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

  useRefreshOnScrollTop(load, { disabled: loading || !userProfile?.id });

  // Tiempo real: el socket se une solo a la sala personal `user:<id>` del vendedor;
  // orders-service empuja `order:new` al crearse un pedido y `order:status-updated`
  // en cada cambio de estado.
  useEffect(() => {
    let active = true;
    let socket: Socket | null = null;
    (async () => {
      let token = '';
      try { token = await getToken(); } catch { /* sin sesión */ }
      if (!active) return;
      socket = io(`${ORDERS_API_BASE_URL}/communication`, { transports: ['websocket'], auth: { token } });
      socketRef.current = socket;
      socket.on('order:new', (payload: OrderResponse) => {
        if (payload.status !== 'DRAFT') upsertOrder(payload);
      });
      socket.on('order:status-updated', (payload: OrderResponse) => upsertOrder(payload));
    })();
    return () => {
      active = false;
      socket?.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const advanceStatus = async (order: OrderResponse) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setActionMsg(null);
    setUpdatingId(order.id);
    try {
      // Orders-service exige pasar por IN_PREPARATION; se completa internamente
      // para que el vendedor tenga una sola acción visible.
      if (order.status === 'CONFIRMED') {
        await api.updateOrderStatus(order.id, {
          status: 'IN_PREPARATION',
          actorType: 'fulfillment',
          actorId: userProfile?.id,
        });
      }
      const updated = await api.updateOrderStatus(order.id, {
        status: next.status,
        actorType: 'fulfillment',
        actorId: userProfile?.id,
      });
      upsertOrder(updated);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'No se pudo actualizar el estado');
    } finally {
      setUpdatingId(null);
    }
  };

  const cancelOrder = async (order: OrderResponse) => {
    setActionMsg(null);
    setUpdatingId(order.id);
    try {
      const updated = await api.cancelOrder(order.id, { actorType: 'vendor', reason: 'Cancelado por la tienda' });
      upsertOrder(updated);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'No se pudo cancelar el pedido');
    } finally {
      setUpdatingId(null);
    }
  };

  const visibleOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    const byFilter = filter === 'ALL' ? orders : orders.filter((o) => o.status === filter);
    const bySearch = query
      ? byFilter.filter((o) => o.orderNumber.toLowerCase().includes(query) || o.customerId.toLowerCase().includes(query))
      : byFilter;
    return bySearch;
  }, [orders, filter, search]);

  const totalPages = Math.max(1, Math.ceil(visibleOrders.length / PAGE_SIZE));

  const pagedOrders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return visibleOrders.slice(start, start + PAGE_SIZE);
  }, [visibleOrders, page]);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <Sidebar activeItem="vendor-orders" />

      <main className="app-shift px-4 pb-28 pt-20 md:px-8 md:pb-8 lg:px-10">
        <div className="relative mx-auto max-w-7xl space-y-6">
          <header className="theme-surface relative overflow-hidden rounded-[32px] border border-white/60 bg-[linear-gradient(140deg,rgb(var(--accent-rgb)/0.32)_0%,rgba(255,255,255,0.62)_42%,rgb(var(--accent-rgb)/0.14)_72%,rgb(var(--accent-rgb)/0.36)_100%)] backdrop-blur-2xl [box-shadow:0_28px_50px_-28px_rgb(var(--accent-rgb)/0.45)]">
            <div aria-hidden="true" className="theme-surface absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[rgb(var(--accent-rgb)/0.32)] blur-3xl" />
            <div aria-hidden="true" className="theme-surface absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-[rgb(var(--accent-rgb)/0.20)] blur-3xl" />
            <TrianglePattern className="absolute inset-0 pointer-events-none" />
            <div className="relative flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between md:p-6">
              <div className="max-w-3xl">
                <nav className="mb-3 inline-flex items-center rounded-xl border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm backdrop-blur" aria-label="Ruta de navegacion">
                  ECIxpress <span className="mx-2 text-gray-400">/</span>
                  <span className="text-gray-950">Pedidos entrantes</span>
                </nav>
                <h1 className="font-display text-3xl font-bold tracking-normal text-gray-900 md:text-4xl">Pedidos de mis tiendas</h1>
                <p className="mt-2 max-w-2xl text-sm font-medium text-gray-600">
                  Recibe los pedidos de tus clientes, avanza su estado y chatea con cada comprador.
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
              </div>
            </div>
          </header>

          {/* Buscador + Filtros */}
          <div className="rounded-3xl border border-white/70 bg-white/82 p-4 shadow-lg shadow-gray-200/60 backdrop-blur-xl">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <label className="relative block">
                <span className="sr-only">Buscar pedidos</span>
                <input
                  className="min-h-12 w-full rounded-2xl border border-gray-100 bg-white py-3 pl-5 pr-24 text-base font-medium text-gray-900 outline-none transition placeholder:text-gray-400 hover:border-yellow-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                  placeholder="Buscar por número de orden o cliente"
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
          </div>

          {actionMsg && <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-gray-700">{actionMsg}</div>}
          {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

          <section className="space-y-4">
            {loading && <p className="text-sm text-gray-500">Cargando pedidos…</p>}
            {!loading && visibleOrders.length === 0 && (
              <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 p-8 text-center text-gray-500">
                {filter === 'ALL' && !search ? 'Aún no has recibido pedidos.' : 'No se encontraron pedidos con esos criterios.'}
              </div>
            )}
            {pagedOrders.map((order) => {
              const next = NEXT_STATUS[order.status];
              const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
              const busy = updatingId === order.id;
              return (
                <article key={order.id} className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:border-yellow-200 hover:shadow-md">
                  <div className="absolute inset-x-0 top-0 h-1 bg-amber-200" aria-hidden="true" />
                  <div className="grid gap-0 md:grid-cols-[1fr_auto]">
                    <div className="flex min-h-[140px] flex-col justify-center px-5 py-4">
                      <div className="mb-3 flex items-center gap-2">
                        <StoreIcon size={15} className="text-amber-600" aria-hidden="true" />
                        <h2 className="truncate text-lg font-black tracking-tight text-gray-950">{order.storeName}</h2>
                        <span className="text-xs font-semibold text-gray-400">#{order.orderNumber.slice(-4)}</span>
                      </div>
                      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr_auto_1fr]">
                        <dt className="flex items-center gap-1 font-semibold text-gray-900"><User size={13} className="text-amber-500" /> Cliente:</dt>
                        <dd className="truncate text-gray-500">#{order.customerId.slice(0, 8)}</dd>
                        <dt className="font-semibold text-gray-900">Fecha:</dt>
                        <dd className="truncate text-gray-500">{formatDateTime(order.createdAt)}</dd>
                        <dt className="font-semibold text-gray-900">Productos:</dt>
                        <dd className="text-gray-500">{itemCount}</dd>
                        <dt className="font-semibold text-gray-900">Total:</dt>
                        <dd className="font-semibold text-gray-500">{formatCOP(order.totalAmount)}</dd>
                      </dl>
                      <p className="mt-2 line-clamp-1 text-xs text-gray-400">
                        {order.items.map((i) => `${i.quantity}× ${i.name}`).join(' · ')}
                      </p>
                    </div>

                    <div className="flex min-h-[140px] w-full flex-col items-stretch justify-between gap-3 border-t border-gray-100 bg-white px-4 py-4 md:w-72 md:border-l md:border-t-0">
                      <span className={`inline-flex justify-center rounded-2xl px-4 py-2 text-sm font-bold ${statusTone[order.status]}`}>{statusLabel[order.status]}</span>
                      <div className="grid gap-2">
                        {next && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => advanceStatus(order)}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-gray-950 transition hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:cursor-wait disabled:opacity-70"
                          >
                            {busy ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />} {next.label}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`/messages?orderId=${order.id}`)}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-bold text-amber-700 transition hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                        >
                          <MessageCircle size={16} /> Chat con el cliente
                        </button>
                        {isCancellable(order.status) && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => cancelOrder(order)}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:cursor-wait disabled:opacity-70"
                          >
                            <XCircle size={16} /> Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
            {visibleOrders.length > PAGE_SIZE && (
              <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500">
                  Mostrando{' '}
                  <span className="font-semibold text-gray-900">{(page - 1) * PAGE_SIZE + 1}</span> a{' '}
                  <span className="font-semibold text-gray-900">{Math.min(page * PAGE_SIZE, visibleOrders.length)}</span> de{' '}
                  <span className="font-semibold text-gray-900">{visibleOrders.length}</span> pedidos
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
      </main>
    </div>
  );
};

export default VendorOrdersPage;
