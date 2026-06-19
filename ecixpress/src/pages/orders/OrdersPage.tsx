import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { ArrowLeft, RefreshCw, Wifi, MessageCircle, RotateCcw, XCircle, Star, CheckCircle2, Clock } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import ModalShell from '../../components/wallet/ModalShell';
import { useAuth } from '../../context/AuthContext';
import { useOrdersApi } from '../../hooks/useOrdersApi';
import { ORDERS_API_BASE_URL, type OrderResponse, type OrderStatus } from '../../lib/orders-api';
import { formatCOP, formatDateTime } from '../../lib/format';
import { ORDER_FLOW, isCancellable, isRateable, statusLabel, statusTone } from '../../lib/orders-ui';

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

const OrdersPage: React.FC<OrdersPageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { userProfile, getToken } = useAuth();
  const api = useOrdersApi();

  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [connected, setConnected] = useState(false);

  const [rating, setRating] = useState<{ open: boolean; score: number; comment: string }>({ open: false, score: 5, comment: '' });
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

  const selected = useMemo(() => orders.find((o) => o.id === selectedId) ?? null, [orders, selectedId]);
  const visibleOrders = useMemo(
    () => (filter === 'ALL' ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter],
  );

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
      const data = await api.getOrders({ customerId: userProfile.id });
      setOrders(data);
      if (data.length && !selectedId) setSelectedId(data[0].id);
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
    try {
      const updated = await api.cancelOrder(order.id, { reason: 'Cancelado por el comprador' });
      upsertOrder(updated);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'No se pudo cancelar');
    }
  };

  const handleReorder = async (order: OrderResponse) => {
    setActionMsg(null);
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
      setSelectedId(created.id);
      socketRef.current?.emit('order:subscribe', { orderId: created.id });
      setActionMsg(`Pedido recreado: ${created.orderNumber}`);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'No se pudo reordenar');
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

      <main className="ml-16 p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => (onBack ? onBack() : navigate('/home'))}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 backdrop-blur-xl border border-white/40 text-gray-700 font-medium text-sm hover:bg-yellow-50 hover:text-yellow-600 transition-all"
              >
                <ArrowLeft size={16} /> Volver
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Mis pedidos</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${connected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                <Wifi size={14} /> {connected ? 'En vivo' : 'Sin conexión'}
              </span>
              <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-white font-semibold shadow-md shadow-yellow-200/60 hover:bg-yellow-500 transition-all">
                <RefreshCw size={16} /> Refrescar
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${filter === f.value ? 'bg-yellow-400 text-white' : 'bg-white/80 text-gray-600 hover:bg-white'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {actionMsg && <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-gray-700">{actionMsg}</div>}
          {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Lista */}
            <section className="lg:col-span-5 space-y-3">
              {loading && <p className="text-sm text-gray-500">Cargando pedidos…</p>}
              {!loading && visibleOrders.length === 0 && (
                <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 p-8 text-center text-gray-500">
                  No tienes pedidos {filter !== 'ALL' ? 'con ese estado' : 'todavía'}.
                </div>
              )}
              {visibleOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => setSelectedId(order.id)}
                  className={`w-full text-left rounded-2xl border p-4 transition-all ${selectedId === order.id ? 'bg-yellow-50 border-yellow-300 shadow-sm' : 'bg-white/70 border-white/60 hover:border-yellow-200 hover:bg-yellow-50/60'}`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                      <p className="text-xs text-gray-500">{order.storeName} · {formatDateTime(order.createdAt)}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusTone[order.status]}`}>{statusLabel[order.status]}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{order.items.length} ítem(s)</span>
                    <span className="font-semibold text-gray-900">{formatCOP(order.totalAmount)}</span>
                  </div>
                </button>
              ))}
            </section>

            {/* Detalle + seguimiento */}
            <section className="lg:col-span-7">
              {selected ? (
                <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm p-6 space-y-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selected.orderNumber}</h2>
                      <p className="text-sm text-gray-500">{selected.storeName}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusTone[selected.status]}`}>{statusLabel[selected.status]}</span>
                  </div>

                  {/* Seguimiento (RF-08) */}
                  <OrderTracker order={selected} />

                  {/* Items */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Productos</p>
                    <div className="space-y-2">
                      {selected.items.map((item) => (
                        <div key={item.id} className="rounded-xl bg-white/70 p-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">{item.name}</p>
                            <p className="text-xs text-gray-500">x{item.quantity} · {formatCOP(item.unitPrice)}</p>
                          </div>
                          <p className="font-semibold text-gray-900">{formatCOP(item.totalAmount)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-3 text-sm">
                      <span className="text-gray-500">Total</span>
                      <span className="font-bold text-gray-900">{formatCOP(selected.totalAmount)}</span>
                    </div>
                    {selected.pickupExpiresAt && (
                      <p className="text-xs text-gray-500 mt-1">Recoger antes de: {formatDateTime(selected.pickupExpiresAt)}</p>
                    )}
                  </div>

                  {/* Calificación existente */}
                  {selected.rating && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm">
                      <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                        {Array.from({ length: selected.rating.score }).map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                      </div>
                      {selected.rating.comment && <p className="text-gray-600 mt-1">{selected.rating.comment}</p>}
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => navigate(`/messages?orderId=${selected.id}`)} className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 text-white font-semibold px-4 py-2.5 hover:bg-yellow-500 transition-all">
                      <MessageCircle size={16} /> Chat con la tienda
                    </button>
                    <button onClick={() => handleReorder(selected)} className="inline-flex items-center gap-2 rounded-xl bg-white/80 border border-white/60 text-gray-700 font-semibold px-4 py-2.5 hover:bg-white transition-all">
                      <RotateCcw size={16} /> Reordenar
                    </button>
                    {isRateable(selected.status) && !selected.rating && (
                      <button onClick={() => setRating({ open: true, score: 5, comment: '' })} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 text-white font-semibold px-4 py-2.5 hover:bg-emerald-600 transition-all">
                        <Star size={16} /> Calificar
                      </button>
                    )}
                    {isCancellable(selected.status) && (
                      <button onClick={() => handleCancel(selected)} className="inline-flex items-center gap-2 rounded-xl bg-red-500 text-white font-semibold px-4 py-2.5 hover:bg-red-600 transition-all">
                        <XCircle size={16} /> Cancelar
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 p-8 text-center text-gray-500">
                  Selecciona un pedido para ver el detalle y su seguimiento.
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

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

/** Línea de seguimiento del pedido (RF-08). */
const OrderTracker: React.FC<{ order: OrderResponse }> = ({ order }) => {
  const reached = new Set(order.statusHistory.map((h) => h.toStatus));
  const terminalBad = order.status === 'CANCELLED' || order.status === 'FAILED';

  if (terminalBad) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
        Pedido {statusLabel[order.status].toLowerCase()}.
        {order.statusHistory.at(-1)?.reason ? ` Motivo: ${order.statusHistory.at(-1)?.reason}` : ''}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-1">
      {ORDER_FLOW.map((step, idx) => {
        const done = reached.has(step);
        const current = order.status === step;
        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${done ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-400'} ${current ? 'ring-4 ring-yellow-100' : ''}`}>
                {done ? <CheckCircle2 size={16} /> : <Clock size={14} />}
              </div>
              <span className={`text-[10px] text-center leading-tight ${done ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{statusLabel[step]}</span>
            </div>
            {idx < ORDER_FLOW.length - 1 && <div className={`h-0.5 flex-1 ${reached.has(ORDER_FLOW[idx + 1]) ? 'bg-yellow-400' : 'bg-gray-200'}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default OrdersPage;
