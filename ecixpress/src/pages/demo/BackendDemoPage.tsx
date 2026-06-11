import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ArrowLeft, CheckCircle2, CircleDashed, MessageSquare, RefreshCw, Send, Server, Wifi, Zap } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import FormInput from '../../components/ui/FormInput';
import { ordersApi, ORDERS_API_BASE_URL, type ConversationResponse, type CreateOrderRequest, type FrequentProduct, type MessageResponse, type OrderResponse, type OrderStatus } from '../../lib/orders-api';

interface BackendDemoPageProps {
  onBack: () => void;
  initialTab?: 'orders' | 'messages';
}

type DemoTab = 'orders' | 'messages' | 'live';
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

type EventLogItem = {
  id: string;
  type: string;
  room?: string;
  payload: unknown;
  occurredAt: string;
};

const defaultOrderDraft = {
  customerId: 'student-001',
  storeId: '1',
  storeName: 'Café Central',
  paymentMethod: 'wallet',
  deliveryMethod: 'pickup',
  currency: 'COP',
  notes: 'Sin mayonesa',
  source: 'web',
  discountAmount: '0',
  productId: '1',
  productName: 'Combo Hamburguesa',
  productDescription: 'Hamburguesa con papas y gaseosa',
  productImageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&auto=format&fit=crop',
  productPrice: '15000',
  productQuantity: '1',
};

const formatDate = (value: string) => new Date(value).toLocaleString('es-CO', {
  dateStyle: 'short',
  timeStyle: 'medium',
});

const statusTone: Record<OrderStatus, string> = {
  CREATED: 'bg-gray-100 text-gray-700',
  PENDING_PAYMENT: 'bg-amber-100 text-amber-700',
  PAYMENT_APPROVED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  IN_PREPARATION: 'bg-orange-100 text-orange-700',
  READY_FOR_PICKUP: 'bg-yellow-100 text-yellow-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  FAILED: 'bg-rose-100 text-rose-700',
};

const roleTone: Record<string, string> = {
  customer: 'bg-yellow-100 text-yellow-700',
  vendor: 'bg-sky-100 text-sky-700',
  support: 'bg-purple-100 text-purple-700',
  system: 'bg-gray-100 text-gray-700',
};

const BackendDemoPage: React.FC<BackendDemoPageProps> = ({ onBack, initialTab = 'orders' }) => {
  const [activeSidebarItem, setActiveSidebarItem] = useState('orders');
  const [activeTab, setActiveTab] = useState<DemoTab>(initialTab);
  const [health, setHealth] = useState<{ status: string; service: string; timestamp: string } | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [socketMessage, setSocketMessage] = useState<string>('');
  const [liveEvents, setLiveEvents] = useState<EventLogItem[]>([]);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [frequentProducts, setFrequentProducts] = useState<FrequentProduct[]>([]);
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedConversationId, setSelectedConversationId] = useState<string>('conv-0001');
  const [orderDetail, setOrderDetail] = useState<OrderResponse | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [messageDraft, setMessageDraft] = useState('Ya voy en camino');
  const [typing, setTyping] = useState(false);
  const [eventFilter, setEventFilter] = useState<'all' | 'message:new' | 'order:status-updated' | 'typing:start'>('all');
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const [draft, setDraft] = useState(defaultOrderDraft);

  const filteredEvents = useMemo(() => {
    if (eventFilter === 'all') {
      return liveEvents;
    }
    return liveEvents.filter((event) => event.type === eventFilter);
  }, [eventFilter, liveEvents]);

  const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedOrderId) ?? orderDetail, [orders, orderDetail, selectedOrderId]);
  const selectedConversation = useMemo(() => conversations.find((conversation) => conversation.id === selectedConversationId) ?? conversations[0], [conversations, selectedConversationId]);

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const [healthResponse, ordersResponse, conversationsResponse, frequentResponse] = await Promise.all([
          ordersApi.health(),
          ordersApi.getOrders(),
          ordersApi.getConversations('student-001'),
          ordersApi.getFrequent('student-001'),
        ]);

        if (!isMounted) {
          return;
        }

        setHealth(healthResponse);
        setOrders(ordersResponse);
        setConversations(conversationsResponse);
        setFrequentProducts(frequentResponse);
        if (ordersResponse.length > 0) {
          setSelectedOrderId(ordersResponse[0].id);
          setOrderDetail(ordersResponse[0]);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message = error instanceof Error ? error.message : 'No se pudo cargar el backend';
        setHealthError(message);
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!selectedConversationId) {
      return;
    }

    const loadMessages = async () => {
      try {
        const response = await ordersApi.getMessages(selectedConversationId);
        if (!isMounted) {
          return;
        }

        setMessages(response.items);
      } catch {
        if (!isMounted) {
          return;
        }

        setMessages([]);
      }
    };

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [selectedConversationId]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const socket = io(`${ORDERS_API_BASE_URL}/communication`, {
      transports: ['websocket'],
      autoConnect: true,
      auth: { userId: 'student-001' },
    });

    socketRef.current = socket;
    setConnectionState('connecting');

    socket.on('connect', () => {
      setConnectionState('connected');
      setSocketMessage('Socket conectado');
      if (selectedConversationId) {
        socket.emit('conversation:joined', {
          conversationId: selectedConversationId,
          userId: 'student-001',
          role: 'customer',
        });
      }
    });

    socket.on('disconnect', () => {
      setConnectionState('disconnected');
      setSocketMessage('Socket desconectado');
    });

    socket.on('connect_error', (error) => {
      setConnectionState('error');
      setSocketMessage(error.message);
    });

    const eventTypes = ['message:new', 'message:read', 'typing:start', 'typing:stop', 'conversation:joined', 'conversation:left', 'order:status-updated'] as const;
    eventTypes.forEach((eventType) => {
      socket.on(eventType, (payload) => {
        setLiveEvents((current) => [
          {
            id: crypto.randomUUID(),
            type: eventType,
            room: eventType.startsWith('order:') ? 'order-room' : `conversation:${selectedConversationId}`,
            payload,
            occurredAt: new Date().toISOString(),
          },
          ...current,
        ].slice(0, 25));
      });
    });

    return () => {
      eventTypes.forEach((eventType) => {
        socket.off(eventType);
      });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [selectedConversationId]);

  const loadOrders = async () => {
    setOrderLoading(true);
    try {
      const response = await ordersApi.getOrders();
      setOrders(response);
      if (!selectedOrderId && response[0]) {
        setSelectedOrderId(response[0].id);
      }
    } finally {
      setOrderLoading(false);
    }
  };

  const refreshConversation = async () => {
    if (!selectedConversationId) {
      return;
    }

    const [conversationResponse, messagesResponse] = await Promise.all([
      ordersApi.getConversationById(selectedConversationId),
      ordersApi.getMessages(selectedConversationId),
    ]);

    setConversations((current) => current.map((conversation) => (conversation.id === conversationResponse.id ? conversationResponse : conversation)));
    setMessages(messagesResponse.items);
  };

  const emitLog = (type: string, payload: unknown, room?: string) => {
    setLiveEvents((current) => [
      {
        id: crypto.randomUUID(),
        type,
        room,
        payload,
        occurredAt: new Date().toISOString(),
      },
      ...current,
    ].slice(0, 25));
  };

  const handleCreateOrder = async () => {
    setCreateStatus(null);
    const payload = {
      customerId: draft.customerId,
      storeId: Number(draft.storeId),
      storeName: draft.storeName,
      items: [
        {
          productId: Number(draft.productId),
          name: draft.productName,
          description: draft.productDescription,
          imageUrl: draft.productImageUrl,
          unitPrice: Number(draft.productPrice),
          quantity: Number(draft.productQuantity),
        },
      ],
      paymentMethod: draft.paymentMethod as CreateOrderRequest['paymentMethod'],
      deliveryMethod: draft.deliveryMethod as CreateOrderRequest['deliveryMethod'],
      currency: draft.currency,
      notes: draft.notes,
      source: draft.source as CreateOrderRequest['source'],
      discountAmount: Number(draft.discountAmount),
    };

    try {
      const createdOrder = await ordersApi.createOrder(payload);
      setCreateStatus(`Pedido creado: ${createdOrder.orderNumber}`);
      setOrders((current) => [createdOrder, ...current.filter((order) => order.id !== createdOrder.id)]);
      setSelectedOrderId(createdOrder.id);
      setOrderDetail(createdOrder);
      setActiveTab('orders');
      emitLog('order:status-updated', createdOrder, `order:${createdOrder.id}`);
    } catch (error) {
      setCreateStatus(error instanceof Error ? error.message : 'Error al crear el pedido');
    }
  };

  const handleSelectOrder = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setOrderLoading(true);
    try {
      const detail = await ordersApi.getOrderById(orderId);
      setOrderDetail(detail);
    } finally {
      setOrderLoading(false);
    }
  };

  const handleAdvanceStatus = async () => {
    if (!selectedOrder) {
      return;
    }

    const nextStatusMap: Partial<Record<OrderStatus, OrderStatus>> = {
      CREATED: 'PENDING_PAYMENT',
      PENDING_PAYMENT: 'PAYMENT_APPROVED',
      PAYMENT_APPROVED: 'CONFIRMED',
      CONFIRMED: 'IN_PREPARATION',
      IN_PREPARATION: 'READY_FOR_PICKUP',
      READY_FOR_PICKUP: 'DELIVERED',
    };

    const nextStatus = nextStatusMap[selectedOrder.status];
    if (!nextStatus) {
      return;
    }

    const updated = await ordersApi.updateOrderStatus(selectedOrder.id, {
      status: nextStatus,
      actorType: 'vendor',
      actorId: 'store-operator-1',
      reason: `Transitioned to ${nextStatus}`,
    });

    setOrderDetail(updated);
    setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));
    emitLog('order:status-updated', updated, `order:${updated.id}`);
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) {
      return;
    }

    const updated = await ordersApi.cancelOrder(selectedOrder.id, {
      actorType: 'customer',
      actorId: 'student-001',
      reason: 'Demo cancellation',
    });

    setOrderDetail(updated);
    setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));
    emitLog('order:status-updated', updated, `order:${updated.id}`);
  };

  const handleRateOrder = async () => {
    if (!selectedOrder) {
      return;
    }

    const updated = await ordersApi.rateOrder(selectedOrder.id, {
      customerId: 'student-001',
      score: 5,
      comment: 'Excelente servicio en la demo',
    });

    setOrderDetail(updated);
    setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));
    emitLog('order:status-updated', updated, `order:${updated.id}`);
  };

  const handleSendMessage = async () => {
    if (!selectedConversationId || !messageDraft.trim()) {
      return;
    }

    const sent = await ordersApi.sendMessage({
      conversationId: selectedConversationId,
      senderId: 'student-001',
      senderRole: 'customer',
      content: messageDraft.trim(),
    });

    setMessages((current) => [...current, sent]);
    setMessageDraft('');
    await refreshConversation();
    emitLog('message:new', sent, `conversation:${selectedConversationId}`);
  };

  const handleJoinConversation = async (conversationId: string) => {
    setSelectedConversationId(conversationId);
    const socket = socketRef.current;
    socket?.emit('conversation:joined', {
      conversationId,
      userId: 'student-001',
      role: 'customer',
    });
    await refreshConversation();
  };

  const handleTyping = async (nextTyping: boolean) => {
    if (!selectedConversationId) {
      return;
    }

    setTyping(nextTyping);
    await ordersApi.setTyping({
      conversationId: selectedConversationId,
      userId: 'student-001',
      role: 'customer',
      typing: nextTyping,
    });
    emitLog(nextTyping ? 'typing:start' : 'typing:stop', { conversationId: selectedConversationId, userId: 'student-001' }, `conversation:${selectedConversationId}`);
  };

  const openSelectedOrder = async () => {
    if (!selectedOrder) {
      return;
    }

    await handleSelectOrder(selectedOrder.id);
    setActiveTab('orders');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <Sidebar
        activeItem={activeSidebarItem}
        onItemClick={setActiveSidebarItem}
      />

      <main className="ml-16 p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 backdrop-blur-xl border border-white/40 text-gray-700 font-medium text-sm hover:bg-yellow-50 hover:text-yellow-600 transition-all duration-300"
            >
              <ArrowLeft size={16} />
              Volver
            </button>

            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${connectionState === 'connected' ? 'bg-emerald-100 text-emerald-700' : connectionState === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                <Wifi size={14} />
                {connectionState}
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-white/70 border border-white/40 text-gray-700">
                <Server size={14} />
                {ORDERS_API_BASE_URL}
              </span>
              <button
                onClick={loadOrders}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-white font-semibold shadow-md shadow-yellow-200/60 hover:bg-yellow-500 transition-all duration-300"
              >
                <RefreshCw size={16} />
                Refrescar
              </button>
            </div>
          </div>

          <section className="rounded-3xl bg-gradient-to-r from-yellow-400 via-yellow-300 to-amber-300 p-6 md:p-8 shadow-lg shadow-yellow-200/60 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_white,_transparent_30%),radial-gradient(circle_at_bottom_left,_white,_transparent_25%)]" />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="space-y-3 max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/90">Demo técnica temporal</p>
                <h1 className="text-3xl md:text-4xl font-bold text-white">Order & Communication conectado al backend</h1>
                <p className="text-white/90 text-base md:text-lg">
                  Esta pantalla crea pedidos reales contra el microservicio, consume historial, conversa en tiempo real y escucha eventos Socket.IO para validar que el flujo completo responde.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 ${activeTab === 'orders' ? 'bg-white text-yellow-700' : 'bg-white/20 text-white hover:bg-white/30'}`}
                >
                  Pedidos
                </button>
                <button
                  onClick={() => setActiveTab('messages')}
                  className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 ${activeTab === 'messages' ? 'bg-white text-yellow-700' : 'bg-white/20 text-white hover:bg-white/30'}`}
                >
                  Conversaciones
                </button>
                <button
                  onClick={() => setActiveTab('live')}
                  className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 ${activeTab === 'live' ? 'bg-white text-yellow-700' : 'bg-white/20 text-white hover:bg-white/30'}`}
                >
                  Eventos live
                </button>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-4 space-y-6">
              <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Estado del backend</h2>
                  <CheckCircle2 size={18} className="text-yellow-500" />
                </div>
                {health ? (
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between gap-3"><span>Servicio</span><span className="font-semibold text-gray-900">{health.service}</span></div>
                    <div className="flex justify-between gap-3"><span>Status</span><span className="font-semibold text-emerald-600">{health.status}</span></div>
                    <div className="flex justify-between gap-3"><span>Último ping</span><span className="font-semibold text-gray-900">{formatDate(health.timestamp)}</span></div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">{healthError ?? 'Cargando health...'}</p>
                )}
              </div>

              <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Crear pedido</h2>
                  <CircleDashed size={18} className="text-yellow-500" />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <FormInput label="Customer ID" value={draft.customerId} onChange={(value) => setDraft((current) => ({ ...current, customerId: value }))} />
                  <div className="grid grid-cols-2 gap-3">
                    <FormInput label="Store ID" value={draft.storeId} onChange={(value) => setDraft((current) => ({ ...current, storeId: value }))} />
                    <FormInput label="Store Name" value={draft.storeName} onChange={(value) => setDraft((current) => ({ ...current, storeName: value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormInput label="Payment" value={draft.paymentMethod} onChange={(value) => setDraft((current) => ({ ...current, paymentMethod: value }))} />
                    <FormInput label="Delivery" value={draft.deliveryMethod} onChange={(value) => setDraft((current) => ({ ...current, deliveryMethod: value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormInput label="Currency" value={draft.currency} onChange={(value) => setDraft((current) => ({ ...current, currency: value }))} />
                    <FormInput label="Discount" value={draft.discountAmount} onChange={(value) => setDraft((current) => ({ ...current, discountAmount: value }))} />
                  </div>
                  <FormInput label="Product Name" value={draft.productName} onChange={(value) => setDraft((current) => ({ ...current, productName: value }))} />
                  <FormInput label="Product Description" value={draft.productDescription} onChange={(value) => setDraft((current) => ({ ...current, productDescription: value }))} />
                  <div className="grid grid-cols-2 gap-3">
                    <FormInput label="Product Price" value={draft.productPrice} onChange={(value) => setDraft((current) => ({ ...current, productPrice: value }))} />
                    <FormInput label="Quantity" value={draft.productQuantity} onChange={(value) => setDraft((current) => ({ ...current, productQuantity: value }))} />
                  </div>
                  <FormInput label="Image URL" value={draft.productImageUrl} onChange={(value) => setDraft((current) => ({ ...current, productImageUrl: value }))} />
                  <FormInput label="Notes" value={draft.notes} onChange={(value) => setDraft((current) => ({ ...current, notes: value }))} />
                  <button
                    onClick={handleCreateOrder}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold shadow-md shadow-yellow-200/60 hover:from-yellow-500 hover:to-yellow-600 transition-all duration-300"
                  >
                    Crear pedido real
                  </button>
                  {createStatus && <p className="text-sm text-gray-600">{createStatus}</p>}
                </div>
              </div>

              <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm p-5 space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Productos frecuentes</h2>
                <div className="space-y-3">
                  {frequentProducts.map((product) => (
                    <div key={product.productId} className="flex items-center justify-between gap-3 rounded-xl bg-white/60 border border-white/50 px-4 py-3">
                      <div>
                        <p className="font-semibold text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500">ID {product.productId}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">{product.totalOrders}</span>
                    </div>
                  ))}
                  {frequentProducts.length === 0 && <p className="text-sm text-gray-500">Sin datos frecuentes todavía.</p>}
                </div>
              </div>
            </section>

            <section className="lg:col-span-4 space-y-6">
              <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-gray-900">Pedidos creados</h2>
                  <button onClick={loadOrders} className="text-sm font-semibold text-yellow-600 hover:text-yellow-700">Recargar</button>
                </div>
                <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
                  {orderLoading && <p className="text-sm text-gray-500">Cargando pedidos...</p>}
                  {orders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => handleSelectOrder(order.id)}
                      className={`w-full text-left rounded-xl border p-4 transition-all duration-300 ${selectedOrderId === order.id ? 'bg-yellow-50 border-yellow-300 shadow-sm' : 'bg-white/70 border-white/60 hover:border-yellow-200 hover:bg-yellow-50/60'}`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                          <p className="text-xs text-gray-500">{order.storeName} · {order.customerId}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusTone[order.status]}`}>{order.status}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>{order.items.length} item(s)</span>
                        <span>${order.totalAmount.toLocaleString()}</span>
                      </div>
                    </button>
                  ))}
                  {orders.length === 0 && <p className="text-sm text-gray-500">No hay pedidos todavía.</p>}
                </div>
              </div>

              <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Detalle del pedido</h2>
                  {selectedOrder && <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusTone[selectedOrder.status]}`}>{selectedOrder.status}</span>}
                </div>
                {selectedOrder ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-white/70 p-3"><p className="text-gray-500">Número</p><p className="font-semibold text-gray-900">{selectedOrder.orderNumber}</p></div>
                      <div className="rounded-xl bg-white/70 p-3"><p className="text-gray-500">Total</p><p className="font-semibold text-gray-900">${selectedOrder.totalAmount.toLocaleString()}</p></div>
                      <div className="rounded-xl bg-white/70 p-3"><p className="text-gray-500">Método</p><p className="font-semibold text-gray-900">{selectedOrder.paymentMethod}</p></div>
                      <div className="rounded-xl bg-white/70 p-3"><p className="text-gray-500">Entrega</p><p className="font-semibold text-gray-900">{selectedOrder.deliveryMethod}</p></div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">Items</p>
                      <div className="space-y-2">
                        {selectedOrder.items.map((item) => (
                          <div key={item.id} className="rounded-xl bg-white/70 p-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-gray-900">{item.name}</p>
                              <p className="text-xs text-gray-500">x{item.quantity} · ${item.unitPrice.toLocaleString()}</p>
                            </div>
                            <p className="font-semibold text-gray-900">${item.totalAmount.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">Historial</p>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {selectedOrder.statusHistory.map((history) => (
                          <div key={history.id} className="rounded-xl bg-white/70 p-3 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-gray-900">{history.fromStatus ?? 'NONE'} → {history.toStatus}</p>
                              <span className={`px-2 py-1 rounded-full text-xs ${roleTone[history.actorType] ?? 'bg-gray-100 text-gray-700'}`}>{history.actorType}</span>
                            </div>
                            <p className="text-gray-500">{history.reason ?? 'Sin motivo'}</p>
                            <p className="text-xs text-gray-400">{formatDate(history.occurredAt)}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button onClick={handleAdvanceStatus} className="rounded-xl bg-yellow-400 text-white font-semibold py-2.5 hover:bg-yellow-500 transition-all duration-300">Avanzar estado</button>
                      <button onClick={handleCancelOrder} className="rounded-xl bg-red-500 text-white font-semibold py-2.5 hover:bg-red-600 transition-all duration-300">Cancelar</button>
                      <button onClick={handleRateOrder} className="rounded-xl bg-emerald-500 text-white font-semibold py-2.5 hover:bg-emerald-600 transition-all duration-300">Calificar</button>
                    </div>
                    <button onClick={openSelectedOrder} className="text-sm font-semibold text-yellow-700 hover:text-yellow-800">Abrir de nuevo desde API</button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Selecciona un pedido o crea uno nuevo para ver el detalle.</p>
                )}
              </div>
            </section>

            <section className="lg:col-span-4 space-y-6">
              <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Chat de pedido</h2>
                  <MessageSquare size={18} className="text-yellow-500" />
                </div>
                <div className="space-y-2">
                  {conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => handleJoinConversation(conversation.id)}
                      className={`w-full rounded-xl border p-3 text-left transition-all duration-300 ${selectedConversationId === conversation.id ? 'bg-yellow-50 border-yellow-300' : 'bg-white/70 border-white/60 hover:border-yellow-200'}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-semibold text-gray-900">{conversation.id}</p>
                        <span className="text-xs text-gray-500">Pedido {conversation.orderId}</span>
                      </div>
                      <p className="text-sm text-gray-600">{conversation.lastMessagePreview}</p>
                    </button>
                  ))}
                  {conversations.length === 0 && <p className="text-sm text-gray-500">No hay conversaciones.</p>}
                </div>
              </div>

              <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Mensajes</h2>
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                    <span className={`w-2.5 h-2.5 rounded-full ${connectionState === 'connected' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                    {socketMessage || 'Esperando socket'}
                  </div>
                </div>
                {selectedConversation && (
                  <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-gray-700">
                    <p className="font-semibold text-gray-900">{selectedConversation.id}</p>
                    <p className="text-gray-500">{selectedConversation.lastMessagePreview ?? 'Sin último mensaje registrado todavía.'}</p>
                  </div>
                )}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {messages.map((message) => (
                    <div key={message.id} className="rounded-xl bg-white/70 border border-white/60 p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-semibold text-gray-900">{message.senderId}</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${roleTone[message.senderRole] ?? 'bg-gray-100 text-gray-700'}`}>{message.senderRole}</span>
                      </div>
                      <p className="text-sm text-gray-700">{message.content}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(message.createdAt)}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <FormInput label="Mensaje nuevo" value={messageDraft} onChange={setMessageDraft} />
                  <div className="flex gap-2">
                    <button onClick={handleSendMessage} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 text-white font-semibold py-2.5 hover:bg-yellow-500 transition-all duration-300"><Send size={16} />Enviar</button>
                    <button onClick={() => handleTyping(!typing)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/80 border border-white/60 px-4 py-2.5 text-gray-700 font-semibold hover:bg-white transition-all duration-300"><Zap size={16} />{typing ? 'Stop' : 'Typing'}</button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Eventos live</h2>
                  <button onClick={() => setLiveEvents([])} className="text-sm font-semibold text-gray-500 hover:text-gray-700">Limpiar</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'message:new', 'order:status-updated', 'typing:start'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setEventFilter(type)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${eventFilter === type ? 'bg-yellow-400 text-white' : 'bg-white/80 text-gray-600 hover:bg-white'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {filteredEvents.map((event) => (
                    <div key={event.id} className="rounded-xl bg-gray-900 text-white p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{event.type}</p>
                        <span className="text-white/60">{formatDate(event.occurredAt)}</span>
                      </div>
                      {event.room && <p className="text-white/70">Room: {event.room}</p>}
                      <pre className="whitespace-pre-wrap break-words text-[11px] text-white/80">{JSON.stringify(event.payload, null, 2)}</pre>
                    </div>
                  ))}
                  {filteredEvents.length === 0 && <p className="text-sm text-gray-500">Todavía no hay eventos capturados.</p>}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BackendDemoPage;