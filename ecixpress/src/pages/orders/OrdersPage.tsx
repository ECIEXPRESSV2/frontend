import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { ArrowLeft, RefreshCw, MessageCircle, RotateCcw, XCircle, Star, CheckCircle2, Clock, Plus, QrCode, Undo2, X, Eye, EyeOff, CreditCard, Loader2 } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import ModalShell from '../../components/wallet/ModalShell';
import FormInput from '../../components/ui/FormInput';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import { useOrdersApi } from '../../hooks/useOrdersApi';
import { ORDERS_API_BASE_URL, type OrderResponse, type OrderStatus } from '../../lib/orders-api';
import { getAvailableStores, type Store } from '../../services/storeService';
import { productsApi, priceToCents, type Product } from '../../lib/products-api';
import { formatCOP, formatDateTime } from '../../lib/format';
import { ORDER_FLOW, hasPickupCode, isCancellable, isHideable, isPayable, isRateable, isReorderable, isReturnable, orderDisplayName, statusLabel, statusTone } from '../../lib/orders-ui';

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
  // Mensaje de éxito (banner verde) para creación/recreación de pedidos.
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  // Indicadores de carga: creación de pedido y recreación (por id de pedido).
  const [creating, setCreating] = useState(false);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState({
    storeId: '',
    storeName: '',
    productId: '',
    productName: '',
    price: '', // en pesos; se convierte a centavos al enviar
    quantity: '1',
    paymentMethod: 'wallet' as 'wallet' | 'cash' | 'card' | 'transfer',
  });

  // Catálogo para el formulario de nuevo pedido (tiendas y sus productos).
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

  const selected = useMemo(() => orders.find((o) => o.id === selectedId) ?? null, [orders, selectedId]);
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

  const hideOrder = (id: string) => {
    const next = new Set(hiddenIds);
    next.add(id);
    persistHidden(next);
    if (selectedId === id) setSelectedId('');
  };

  const unhideOrder = (id: string) => {
    const next = new Set(hiddenIds);
    next.delete(id);
    persistHidden(next);
  };

  // Atajo "Nuevo pedido" del sidebar: navega a /orders?new=1 y aquí abrimos el modal.
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setCreateOpen(true);
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
      setSelectedId(created.id);
      socketRef.current?.emit('order:subscribe', { orderId: created.id });
      setSuccessMsg(`Tu pedido fue recreado exitosamente con numero de orden #${created.orderNumber.slice(-4)}`);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'No se pudo reordenar');
    } finally {
      setReorderingId(null);
    }
  };

  const handleCreate = async () => {
    setActionMsg(null);
    setSuccessMsg(null);
    if (!draft.storeId) { setActionMsg('Selecciona una tienda'); return; }
    if (!draft.productId) { setActionMsg('Selecciona un producto'); return; }
    setCreating(true);
    try {
      const created = await api.createOrder({
        storeId: draft.storeId,
        storeName: draft.storeName,
        items: [{
          productId: draft.productId,
          name: draft.productName,
          unitPrice: priceToCents(draft.price), // pesos (catálogo) -> centavos
          quantity: Number(draft.quantity) || 1,
        }],
        paymentMethod: draft.paymentMethod,
        deliveryMethod: 'pickup',
        currency: 'COP',
        // Evita pedidos duplicados ante doble clic / reintentos.
        idempotencyKey: crypto.randomUUID(),
      });
      upsertOrder(created);
      setSelectedId(created.id);
      socketRef.current?.emit('order:subscribe', { orderId: created.id });
      setCreateOpen(false);
      setSuccessMsg(`Tu pedido fue creado exitosamente con numero de orden #${created.orderNumber.slice(-4)}`);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'No se pudo crear el pedido');
    } finally {
      setCreating(false);
    }
  };

  // Carga las tiendas disponibles al abrir el modal de nuevo pedido.
  useEffect(() => {
    if (!createOpen || stores.length) return;
    let active = true;
    (async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const token = await getToken().catch(() => null);
        const data = await getAvailableStores(token);
        if (active) setStores(data);
      } catch (e) {
        if (active) setCatalogError(e instanceof Error ? e.message : 'No se pudieron cargar las tiendas');
      } finally {
        if (active) setCatalogLoading(false);
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOpen]);

  // Al elegir tienda: guarda id/nombre, limpia el producto y carga su catálogo.
  const handleSelectStore = async (storeId: string) => {
    const store = stores.find((s) => s.id === storeId);
    setDraft((d) => ({ ...d, storeId, storeName: store?.name ?? '', productId: '', productName: '', price: '' }));
    setProducts([]);
    if (!storeId) return;
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const token = await getToken().catch(() => null);
      const data = await productsApi.getAll(storeId, {}, token);
      setProducts(data.filter((p) => p.isActive));
    } catch (e) {
      setCatalogError(e instanceof Error ? e.message : 'No se pudieron cargar los productos');
    } finally {
      setCatalogLoading(false);
    }
  };

  // Al elegir producto: fija nombre y precio (no editable) desde el catálogo.
  const handleSelectProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    setDraft((d) => ({
      ...d,
      productId,
      productName: product?.name ?? '',
      price: product ? String(product.price) : '',
    }));
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
              <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/70 border border-white/50 text-gray-700 font-semibold hover:bg-white transition-all">
                <RefreshCw size={16} /> Refrescar
              </button>
              <button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-white font-semibold shadow-md shadow-yellow-200/60 hover:bg-yellow-500 transition-all">
                <Plus size={16} /> Nuevo pedido
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Lista */}
            <section className="lg:col-span-5 space-y-3">
              {loading && <p className="text-sm text-gray-500">Cargando pedidos…</p>}
              {!loading && visibleOrders.length === 0 && (
                <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 p-8 text-center text-gray-500">
                  {showHidden ? 'No tienes pedidos ocultos.' : `No tienes pedidos ${filter !== 'ALL' ? 'con ese estado' : 'todavía'}.`}
                </div>
              )}
              {visibleOrders.map((order) => (
                <div key={order.id} className="relative">
                  <button
                    onClick={() => setSelectedId(order.id)}
                    className={`w-full text-left rounded-2xl border p-4 transition-all ${selectedId === order.id ? 'bg-yellow-50 border-yellow-300 shadow-sm' : 'bg-white/70 border-white/60 hover:border-yellow-200 hover:bg-yellow-50/60'}`}
                  >
                    <div className="mb-2 pr-7">
                      <p className="font-semibold text-gray-900 truncate">{orderDisplayName(order)}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(order.createdAt)} · {order.items.length} ítem(s)</p>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusTone[order.status]}`}>{statusLabel[order.status]}</span>
                      <span className="font-semibold text-gray-900">{formatCOP(order.totalAmount)}</span>
                    </div>
                  </button>

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
                </div>
              ))}
            </section>

            {/* Detalle + seguimiento */}
            <section className="lg:col-span-7">
              {selected ? (
                <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm p-6 space-y-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{orderDisplayName(selected)}</h2>
                      <p className="text-sm text-gray-500">{selected.storeName} · Código {selected.orderNumber}</p>
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
                    {hasPickupCode(selected.status) && (
                      <button onClick={() => navigate(`/fulfillment/code/${selected.id}`)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 text-white font-semibold px-4 py-2.5 hover:bg-emerald-600 transition-all">
                        <QrCode size={16} /> Ver código de retiro
                      </button>
                    )}
                    <button onClick={() => navigate(`/messages?orderId=${selected.id}`)} className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 text-white font-semibold px-4 py-2.5 hover:bg-yellow-500 transition-all">
                      <MessageCircle size={16} /> Chat con la tienda
                    </button>
                    {isPayable(selected.status) && (
                      <button onClick={openRecharge} className="inline-flex items-center gap-2 rounded-xl bg-blue-500 text-white font-semibold px-4 py-2.5 hover:bg-blue-600 transition-all">
                        <CreditCard size={16} /> Pagar
                      </button>
                    )}
                    {isReorderable(selected.status) && (
                      <button
                        onClick={() => handleReorder(selected)}
                        disabled={reorderingId === selected.id}
                        className="inline-flex items-center gap-2 rounded-xl bg-white/80 border border-white/60 text-gray-700 font-semibold px-4 py-2.5 hover:bg-white transition-all disabled:opacity-70 disabled:cursor-wait"
                      >
                        {reorderingId === selected.id ? <><Loader2 size={16} className="animate-spin" /> Recreando…</> : <><RotateCcw size={16} /> Reordenar</>}
                      </button>
                    )}
                    {isRateable(selected.status) && !selected.rating && (
                      <button onClick={() => setRating({ open: true, score: 5, comment: '' })} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 text-white font-semibold px-4 py-2.5 hover:bg-emerald-600 transition-all">
                        <Star size={16} /> Calificar
                      </button>
                    )}
                    {isReturnable(selected.status) && (
                      <button onClick={openReturn} className="inline-flex items-center gap-2 rounded-xl bg-purple-500 text-white font-semibold px-4 py-2.5 hover:bg-purple-600 transition-all">
                        <Undo2 size={16} /> Devolver
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

      {/* Modal crear pedido (para pruebas / flujo directo) */}
      <ModalShell open={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo pedido" subtitle="Crea un pedido contra el microservicio">
        <div className="space-y-3">
          {catalogError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{catalogError}</div>
          )}

          {/* Tienda: lista desplegable con los restaurantes disponibles */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Tienda</label>
            <select
              value={draft.storeId}
              onChange={(e) => handleSelectStore(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white/60 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
            >
              <option value="">{catalogLoading && !stores.length ? 'Cargando tiendas…' : 'Selecciona una tienda'}</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Producto: lista desplegable con el catálogo de la tienda elegida */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Producto</label>
            <select
              value={draft.productId}
              onChange={(e) => handleSelectProduct(e.target.value)}
              disabled={!draft.storeId}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white/60 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {!draft.storeId
                  ? 'Primero elige una tienda'
                  : catalogLoading
                    ? 'Cargando productos…'
                    : products.length
                      ? 'Selecciona un producto'
                      : 'Esta tienda no tiene productos'}
              </option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} · {formatCOP(priceToCents(p.price))}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Precio: se calcula solo (precio unitario × cantidad), no editable */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Precio</label>
              <div className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-700">
                {draft.price ? formatCOP(priceToCents(draft.price) * (Number(draft.quantity) || 1)) : '—'}
              </div>
            </div>
            <FormInput label="Cantidad" type="number" value={draft.quantity} onChange={(v) => setDraft((d) => ({ ...d, quantity: v }))} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Método de pago</label>
            <select
              value={draft.paymentMethod}
              onChange={(e) => setDraft((d) => ({ ...d, paymentMethod: e.target.value as typeof d.paymentMethod }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white/60 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
            >
              <option value="wallet">Billetera (pago digital)</option>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">Con billetera/tarjeta el pedido queda "Pago pendiente" hasta que financial confirme.</p>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold hover:from-yellow-500 hover:to-yellow-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
          >
            {creating ? <><Loader2 size={18} className="animate-spin" /> Creando pedido…</> : 'Crear pedido'}
          </button>
        </div>
      </ModalShell>

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
