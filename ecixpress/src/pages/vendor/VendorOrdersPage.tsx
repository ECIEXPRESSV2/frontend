import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { ArrowLeft, RefreshCw, MessageCircle, Store as StoreIcon, User, ChevronRight, XCircle, Loader2 } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useOrdersApi } from '../../hooks/useOrdersApi';
import { getMyStores } from '../../services/storeService';
import { ORDERS_API_BASE_URL, type OrderResponse, type OrderStatus } from '../../lib/orders-api';
import { formatCOP, formatDateTime } from '../../lib/format';
import { statusLabel, statusTone, isCancellable } from '../../lib/orders-ui';

interface VendorOrdersPageProps {
  onBack?: () => void;
}

/**
 * Siguiente estado que el vendedor puede aplicar a un pedido siguiendo el flujo de
 * preparación (RF-08). El backend valida la transición; aquí solo ofrecemos el botón.
 */
const NEXT_STATUS: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  CONFIRMED: { status: 'IN_PREPARATION', label: 'Iniciar preparación' },
  IN_PREPARATION: { status: 'READY_FOR_PICKUP', label: 'Marcar como listo' },
  READY_FOR_PICKUP: { status: 'DELIVERED', label: 'Marcar como entregado' },
};

const STATUS_FILTERS: Array<{ value: 'ALL' | OrderStatus; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'IN_PREPARATION', label: 'En preparación' },
  { value: 'READY_FOR_PICKUP', label: 'Listo' },
  { value: 'DELIVERED', label: 'Entregado' },
];

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

  const visibleOrders = useMemo(
    () => (filter === 'ALL' ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <Sidebar activeItem="vendor-orders" />

      <main className="ml-16 px-4 pb-6 pt-20 md:px-8 md:pb-8 lg:px-10">
        <div className="relative mx-auto max-w-6xl space-y-6">
          <header className="relative overflow-hidden rounded-[28px] border border-yellow-200/70 bg-[linear-gradient(135deg,#F4B942_0%,#FBBF24_48%,#FDE68A_100%)] p-5 shadow-lg shadow-yellow-200/60 md:p-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/60" />
            <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-white/22 blur-3xl" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <nav className="mb-3 inline-flex items-center rounded-xl border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm backdrop-blur" aria-label="Ruta de navegacion">
                  ECIxpress <span className="mx-2 text-gray-400">/</span>
                  <span className="text-gray-950">Pedidos entrantes</span>
                </nav>
                <h1 className="text-3xl font-bold tracking-normal text-white md:text-4xl">Pedidos de mis tiendas</h1>
                <p className="mt-2 max-w-2xl text-sm font-medium text-white/85">
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

          {actionMsg && <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-gray-700">{actionMsg}</div>}
          {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

          <section className="space-y-4">
            {loading && <p className="text-sm text-gray-500">Cargando pedidos…</p>}
            {!loading && visibleOrders.length === 0 && (
              <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 p-8 text-center text-gray-500">
                {filter === 'ALL' ? 'Aún no has recibido pedidos.' : 'No tienes pedidos con ese estado.'}
              </div>
            )}
            {visibleOrders.map((order) => {
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
          </section>
        </div>
      </main>
    </div>
  );
};

export default VendorOrdersPage;
