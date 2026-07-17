import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { ArrowLeft, Check, CheckCheck, ChevronDown, ChevronRight, MessageSquare, ReceiptText, Send } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import OrderDetailModal from '../../components/orders/OrderDetailModal';
import RefundCard from '../../components/messages/RefundCard';
import RefundDetailModal from '../../components/messages/RefundDetailModal';
import { useAuth } from '../../context/AuthContext';
import { useOrdersApi } from '../../hooks/useOrdersApi';
import { getMyStores } from '../../services/storeService';
import { ORDERS_WS_URL, parseRefundMessage, type ConversationResponse, type MessageResponse } from '../../lib/orders-api';
import { formatDateTime } from '../../lib/format';

interface MessagesPageProps {
  onBack?: () => void;
}

/** Iniciales (máx. 2) a partir de un nombre, igual que el módulo de administración. */
const getInitials = (name?: string) => {
  const parts = (name || 'Chat').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'CH';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
};

/** Hora estilo mensajería: HH:mm si es hoy, si no fecha corta. */
const formatChatTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (sameDay) {
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' });
};

/**
 * Avatar circular: foto real (logo de tienda o del cliente) si se conoce, si no
 * iniciales con degradado, consistente con administración de usuarios.
 */
const ChatAvatar: React.FC<{ name?: string; imageUrl?: string; size?: 'md' | 'lg' }> = ({ name, imageUrl, size = 'md' }) => {
  const sizeClass = size === 'lg' ? 'h-12 w-12 text-base' : 'h-11 w-11 text-sm';
  return (
    <div className="relative flex-shrink-0">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className={`${sizeClass} rounded-full border border-white/70 object-cover shadow-md shadow-gray-200/60`}
        />
      ) : (
        <div
          className={`${sizeClass} flex items-center justify-center rounded-full border border-white/70 bg-gradient-to-br from-cyan-100 via-white to-yellow-100 font-bold text-gray-900 shadow-md shadow-gray-200/60`}
        >
          {getInitials(name)}
        </div>
      )}
    </div>
  );
};

const MessagesPage: React.FC<MessagesPageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderIdParam = searchParams.get('orderId');
  const { userProfile, getToken, isVendor } = useAuth();
  const api = useOrdersApi();

  // El vendedor ve las conversaciones de sus tiendas (filtradas por storeId) y chatea
  // como 'vendor'; cualquier otro usuario las ve como comprador (por customerId).
  const vendor = isVendor();
  const chatRole = vendor ? 'vendor' : 'customer';

  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [notice, setNotice] = useState<string | null>(null);
  // Grupos (cliente/tienda) desplegados en la bandeja.
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  // Pedido cuyo detalle (recibo) se está viendo en el modal; null = cerrado.
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  // Tarjeta de reembolso cuyo detalle se está viendo; null = cerrado.
  const [refundDetail, setRefundDetail] = useState<MessageResponse | null>(null);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [draft, setDraft] = useState('');
  const [otherTyping, setOtherTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingSent = useRef(false);

  const upsertMessage = (msg: MessageResponse) =>
    setMessages((current) => (current.some((m) => m.id === msg.id) ? current : [...current, msg]));

  /** Reemplaza un mensaje existente en el hilo (p. ej. la tarjeta de reembolso al resolverse). */
  const patchMessage = (msg: MessageResponse) =>
    setMessages((current) => current.map((m) => (m.id === msg.id ? msg : m)));

  /** Inserta o actualiza una conversación en la lista (para eventos en vivo). */
  const patchConversation = (conv: ConversationResponse) =>
    setConversations((prev) => (prev.some((c) => c.id === conv.id) ? prev.map((c) => (c.id === conv.id ? conv : c)) : [conv, ...prev]));

  // Nombre/foto de "con quién estoy hablando": el vendedor ve al cliente que le escribe
  // (antes veía el nombre de su propia tienda repetido en cada fila); el cliente ve la
  // tienda. Vienen denormalizados en la propia conversación (identity-service, al confirmarse).
  const conversationName = (c: ConversationResponse) =>
    vendor ? (c.customerName ?? 'Cliente') : (c.storeName ?? `Pedido ${c.orderId.slice(0, 8)}…`);
  const conversationAvatar = (c: ConversationResponse) => (vendor ? c.customerAvatarUrl : c.storeLogoUrl);

  const unreadFor = (c: ConversationResponse) =>
    c.participants.find((p) => p.userId === userProfile?.id)?.unreadCount ?? 0;

  /**
   * Chats del vendedor de TODAS sus tiendas. Usa allSettled: si una tienda falla (p. ej.
   * 403 puntual, o una tienda sin chats), NO se pierde la lista completa; se ignora esa
   * tienda y se muestran las demás.
   */
  const loadVendorConversations = async (extra: { orderId?: string } = {}) => {
    const stores = await getMyStores(await getToken());
    const results = await Promise.allSettled(stores.map((s) => api.getConversations({ storeId: s.id, ...extra })));
    return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  };

  // Cargar conversaciones (y auto-seleccionar por orderId si viene en la URL)
  useEffect(() => {
    if (!userProfile?.id) return;
    (async () => {
      try {
        const list = vendor ? await loadVendorConversations() : await api.getConversations({});
        setConversations(list);
        if (orderIdParam) {
          const byOrder = vendor
            ? await loadVendorConversations({ orderId: orderIdParam })
            : await api.getConversations({ orderId: orderIdParam });
          if (byOrder[0]) { setSelectedId(byOrder[0].id); return; }
        }
        const firstActive = list.find((c) => c.status !== 'archived');
        if (firstActive) setSelectedId((prev) => prev || firstActive.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudieron cargar las conversaciones');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.id, orderIdParam, vendor]);

  // Cargar mensajes al cambiar de conversación + marcar como leído
  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      try {
        const res = await api.getMessages(selectedId);
        setMessages(res.items);
        socketRef.current?.emit('conversation:joined', { conversationId: selectedId, role: chatRole });
        void markRead(selectedId);
      } catch {
        setMessages([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  /** Marca la conversación como leída (servidor + reset local del badge). */
  const markRead = async (conversationId: string) => {
    try {
      await api.markConversationRead(conversationId);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, participants: c.participants.map((p) => (p.userId === userProfile?.id ? { ...p, unreadCount: 0 } : p)) }
            : c,
        ),
      );
    } catch { /* el badge se reajusta con el siguiente evento en vivo */ }
  };

  // Socket en tiempo real
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
      // userId: en modo local (AUTH_DISABLED) orders NO valida el token, así que necesita
      // el userId real en el handshake; sin él usaría el socket.id y el control de acceso
      // del chat rechazaría el join (no habría tiempo real). En producción se ignora: el
      // userId sale del token validado.
      const userId = userProfile?.id;
      socket = io(ORDERS_WS_URL, { path: '/orders/socket.io', transports: ['websocket'], auth: { token, userId }, query: { token, userId } });
      socketRef.current = socket;
      socket.on('connect', () => {
        if (selectedIdRef.current) socket?.emit('conversation:joined', { conversationId: selectedIdRef.current, role: chatRole });
      });
      socket.on('message:new', (msg: MessageResponse) => {
        if (msg.conversationId !== selectedIdRef.current) return;
        upsertMessage(msg);
        if (msg.senderId !== userProfile?.id) void markRead(msg.conversationId);
      });
      // Una tarjeta de reembolso cambió de estado (aprobada/rechazada) en el mismo mensaje.
      socket.on('message:updated', (msg: MessageResponse) => {
        if (msg.conversationId !== selectedIdRef.current) return;
        patchMessage(msg);
        // El modal de detalle guarda su propia copia del mensaje al abrirse (`refundDetail`);
        // si está mostrando justo este reembolso, se queda con el estado viejo (pendiente)
        // aunque la tarjeta del chat sí se actualice -- se refresca también.
        setRefundDetail((prev) => (prev && prev.id === msg.id ? msg : prev));
      });
      // Actualización de la lista en vivo (preview, hora, no leídos, archivado). Si el
      // pedido se entregó o canceló, el chat se cierra para siempre: se saca de la lista
      // y, si estaba abierto, se limpia la selección (nadie vuelve a verlo).
      socket.on('conversation:updated', (conv: ConversationResponse) => {
        if (conv.status === 'closed') {
          setConversations((prev) => prev.filter((c) => c.id !== conv.id));
          if (selectedIdRef.current === conv.id) {
            setSelectedId('');
            setMessages([]);
            setNotice('Este chat se cerró porque el pedido finalizó.');
          }
          return;
        }
        patchConversation(conv);
        // `conversation:updated` llega siempre (sala personal `user:<id>`, unida al conectar
        // el socket), a diferencia de `message:new` que depende de haberse unido a tiempo a
        // la sala de ESA conversación (carrera real si se navega directo al chat justo cuando
        // se está generando el mensaje, p. ej. la tarjeta de reembolso). Si cambió justo la
        // conversación abierta, refrescamos sus mensajes por si el `message:new` se perdió.
        if (conv.id === selectedIdRef.current) {
          api.getMessages(conv.id).then((res) => setMessages(res.items)).catch(() => undefined);
        }
      });
      // El otro participante leyó: pinta doble check en mis mensajes.
      socket.on('conversation:read', (p: { readerId: string; messageIds: string[] }) => {
        if (p.readerId === userProfile?.id) return;
        setMessages((prev) => prev.map((m) => (p.messageIds.includes(m.id) ? { ...m, status: 'read' } : m)));
      });
      socket.on('typing:start', (p: { userId: string }) => {
        if (p.userId !== userProfile?.id) setOtherTyping(true);
      });
      socket.on('typing:stop', () => setOtherTyping(false));
    })();
    return () => { active = false; socket?.disconnect(); socketRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mantener una ref del id seleccionado para el handler del socket
  const selectedIdRef = useRef(selectedId);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  // Autoscroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, otherTyping]);

  const notifyTyping = (typing: boolean) => {
    if (!selectedId || typingSent.current === typing) return;
    typingSent.current = typing;
    void api.setTyping({ conversationId: selectedId, role: chatRole, typing }).catch(() => undefined);
  };

  const handleSend = async () => {
    if (!selectedId || !draft.trim()) return;
    const content = draft.trim();
    setDraft('');
    notifyTyping(false);
    try {
      const sent = await api.sendMessage({ conversationId: selectedId, senderRole: chatRole, content });
      upsertMessage(sent);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar el mensaje');
    }
  };

  const openOrderDetail = (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    setDetailOrderId(orderId);
  };

  // Conversaciones ordenadas por actividad reciente (el backend ya excluye las cerradas).
  const sortByRecent = (a: ConversationResponse, b: ConversationResponse) =>
    new Date(b.lastMessageAt ?? b.updatedAt).getTime() - new Date(a.lastMessageAt ?? a.updatedAt).getTime();
  const visibleConversations = useMemo(() => [...conversations].sort(sortByRecent), [conversations]);

  // Agrupa la bandeja por la contraparte (vendedor → cliente; cliente → tienda), para que
  // varios pedidos con la misma persona no llenen la lista de filas repetidas. Cada grupo
  // se despliega en sus chats por pedido.
  interface ChatGroup {
    key: string;
    name: string;
    avatar?: string;
    convs: ConversationResponse[];
    unread: number;
    lastAt: string;
    preview: string;
  }
  const groups = useMemo<ChatGroup[]>(() => {
    const byKey = new Map<string, ConversationResponse[]>();
    for (const c of visibleConversations) {
      const key = (vendor ? c.customerId : c.storeId) || c.id;
      const list = byKey.get(key) ?? [];
      list.push(c);
      byKey.set(key, list);
    }
    const result: ChatGroup[] = [];
    byKey.forEach((convs, key) => {
      const sorted = [...convs].sort(sortByRecent);
      const head = sorted[0];
      result.push({
        key,
        name: conversationName(head),
        avatar: conversationAvatar(head),
        convs: sorted,
        unread: sorted.reduce((sum, c) => sum + unreadFor(c), 0),
        lastAt: head.lastMessageAt ?? head.updatedAt,
        preview: head.lastMessagePreview ?? 'Sin mensajes aún',
      });
    });
    return result.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleConversations, vendor]);

  const toggleGroup = (key: string) =>
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  // Al abrir un chat, su grupo se despliega UNA sola vez (para que se vea cuál quedó
  // seleccionado), pero el estado sigue siendo manual: el usuario puede recogerlo aunque
  // el chat abierto viva dentro. La ref evita re-desplegarlo con cada actualización en
  // vivo de la lista (mensajes nuevos, previews) mientras siga seleccionado el mismo chat.
  const lastAutoExpandedFor = useRef<string>('');
  useEffect(() => {
    if (!selectedId || lastAutoExpandedFor.current === selectedId) return;
    const conv = conversations.find((c) => c.id === selectedId);
    if (!conv) return;
    lastAutoExpandedFor.current = selectedId;
    const key = (vendor ? conv.customerId : conv.storeId) || conv.id;
    setExpandedGroups((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }, [selectedId, conversations, vendor]);

  // Etiqueta corta del pedido para distinguir chats dentro de un mismo grupo.
  const orderLabel = (c: ConversationResponse) => `Pedido ${c.orderId.slice(0, 8)}…`;

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    // Layout estilo WhatsApp: la página ocupa exactamente el viewport y NO scrollea
    // (h-dvh + overflow-hidden); lo único que scrollea es la lista de conversaciones
    // (y el hilo de mensajes dentro del panel). El chat queda siempre fijo en pantalla.
    <div className="h-dvh overflow-hidden bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      {/* Con un chat abierto en móvil, el bottom nav se oculta (pantalla completa estilo
          WhatsApp) y el padding inferior se reduce al mínimo. */}
      <Sidebar activeItem="messages" hideMobileBottomNav={!!selectedId} />

      <main className={`app-shift flex h-full min-h-0 flex-col px-4 pt-20 md:px-8 md:pb-8 lg:px-10 ${selectedId ? 'pb-3' : 'pb-24'}`}>
        <div className="relative mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-6">
          <div className="flex items-center gap-3">
            <button onClick={() => (onBack ? onBack() : navigate('/home'))} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/55 backdrop-blur-xl border border-white/50 text-gray-700 font-medium text-sm shadow-sm shadow-gray-200/40 hover:bg-white/80 hover:text-yellow-600 hover:shadow-md transition-all duration-300">
              <ArrowLeft size={16} /> Volver
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Mensajes</h1>
          </div>

          {error && <div className="rounded-xl bg-red-50/80 backdrop-blur-xl border border-red-200/70 px-4 py-3 text-sm text-red-700">{error}</div>}
          {notice && (
            <div className="rounded-xl bg-yellow-50/80 backdrop-blur-xl border border-yellow-200/70 px-4 py-3 text-sm text-yellow-800 flex items-center justify-between gap-3">
              {notice}
              <button onClick={() => setNotice(null)} className="text-yellow-700/70 hover:text-yellow-900 text-xs font-medium">Cerrar</button>
            </div>
          )}

          {/* auto-rows-[minmax(0,1fr)]: en móvil (grid-cols-1) cada sección cae en una fila
              implícita; sin esto la fila mide `auto` (alto del contenido), el h-full de los
              paneles no resuelve contra nada, la lista no scrollea internamente y el chat
              crecía por debajo del bottom nav fijo — tocar el input terminaba pulsando
              "Inicio" y expulsaba al Home. Con filas 1fr, el panel visible llena exactamente
              el alto disponible en móvil y escritorio. */}
          <div className="grid min-h-0 flex-1 auto-rows-[minmax(0,1fr)] grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Lista de conversaciones — en mobile se oculta mientras hay un chat abierto,
                para que el chat use la pantalla completa en vez de apilarse debajo.
                Es la ÚNICA zona con scroll de página: la lista desborda hacia adentro. */}
            <section className={`min-h-0 lg:col-span-4 ${selectedId ? 'hidden lg:block' : ''}`}>
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl bg-white/45 backdrop-blur-2xl border border-white/50 shadow-xl shadow-gray-200/40 p-2.5">
                <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto scrollbar-auto-hide">
                  {groups.length === 0 && (
                    <div className="rounded-2xl p-6 text-center text-gray-500 text-sm">
                      No tienes conversaciones. Crea un pedido para chatear con la tienda.
                    </div>
                  )}
                  {groups.map((g) => {
                    // Un solo pedido con esta persona: fila directa (sin desplegable).
                    if (g.convs.length === 1) {
                      const c = g.convs[0];
                      const unread = unreadFor(c);
                      const isActive = selectedId === c.id;
                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedId(c.id)}
                          className={`group glass-spotlight glass-spotlight-soft relative w-full text-left rounded-2xl border p-3 flex items-center gap-3 cursor-pointer transition-all duration-200 ${
                            isActive
                              ? 'bg-white/80 border-yellow-300/80 shadow-md shadow-yellow-100/60'
                              : 'bg-white/0 border-transparent hover:bg-yellow-50/90 hover:border-yellow-200/80 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-yellow-200/50 hover:ring-2 hover:ring-yellow-200/50'
                          }`}
                        >
                          <ChatAvatar name={g.name} imageUrl={g.avatar} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-gray-900 text-sm truncate">{g.name}</p>
                              <span className="text-[10px] text-gray-400 shrink-0">{formatChatTime(c.lastMessageAt)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-0.5">
                              <p className={`text-xs truncate ${unread > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                                {c.lastMessagePreview ?? 'Sin mensajes aún'}
                              </p>
                              {unread > 0 && (
                                <span className="inline-flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full bg-yellow-400 text-white text-[10px] font-bold shadow-sm">
                                  {unread > 99 ? '99+' : unread}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => openOrderDetail(e, c.orderId)}
                            title="Ver detalle del pedido"
                            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-gray-500 opacity-0 shadow-sm transition-all duration-200 hover:bg-white hover:text-yellow-600 group-hover:opacity-100"
                          >
                            <ReceiptText size={14} />
                          </button>
                        </div>
                      );
                    }

                    // Varios pedidos con la misma persona: cabecera de grupo desplegable.
                    // El abrir/recoger es SIEMPRE manual (aunque el chat abierto esté dentro);
                    // al seleccionar un chat, un efecto lo despliega una única vez.
                    const activeInGroup = g.convs.some((c) => c.id === selectedId);
                    const isOpen = expandedGroups.has(g.key);
                    return (
                      <div key={g.key} className="space-y-1">
                        <div
                          onClick={() => toggleGroup(g.key)}
                          className={`relative w-full text-left rounded-2xl border p-3 flex items-center gap-3 cursor-pointer transition-all duration-300 ${
                            activeInGroup && !isOpen
                              ? 'bg-white/70 border-yellow-300/70 shadow-sm'
                              : 'bg-white/0 border-transparent hover:bg-white/60 hover:border-white/60'
                          }`}
                        >
                          <ChatAvatar name={g.name} imageUrl={g.avatar} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-gray-900 text-sm truncate">{g.name}</p>
                              <span className="text-[10px] text-gray-400 shrink-0">{formatChatTime(g.lastAt)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-0.5">
                              <p className="text-xs text-gray-500 truncate">
                                {g.convs.length} pedidos · {g.preview}
                              </p>
                              {g.unread > 0 && (
                                <span className="inline-flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full bg-yellow-400 text-white text-[10px] font-bold shadow-sm">
                                  {g.unread > 99 ? '99+' : g.unread}
                                </span>
                              )}
                            </div>
                          </div>
                          {isOpen ? <ChevronDown size={16} className="text-gray-400 shrink-0" /> : <ChevronRight size={16} className="text-gray-400 shrink-0" />}
                        </div>

                        {isOpen && (
                          <div className="ml-4 space-y-1 border-l-2 border-yellow-100 pl-2">
                            {g.convs.map((c) => {
                              const unread = unreadFor(c);
                              const isActive = selectedId === c.id;
                              return (
                                <div
                                  key={c.id}
                                  onClick={() => setSelectedId(c.id)}
                                  className={`group relative w-full text-left rounded-xl border p-2.5 flex items-center gap-2 cursor-pointer transition-all duration-200 ${
                                    isActive
                                      ? 'bg-white/80 border-yellow-300/80 shadow-sm'
                                      : 'bg-white/0 border-transparent hover:bg-yellow-50/90 hover:border-yellow-200/80 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-yellow-200/50 hover:ring-2 hover:ring-yellow-200/50'
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="font-medium text-gray-800 text-xs truncate">{orderLabel(c)}</p>
                                      <span className="text-[10px] text-gray-400 shrink-0">{formatChatTime(c.lastMessageAt)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 mt-0.5">
                                      <p className={`text-xs truncate ${unread > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                                        {c.lastMessagePreview ?? 'Sin mensajes aún'}
                                      </p>
                                      {unread > 0 && (
                                        <span className="inline-flex min-w-[16px] h-4 px-1 items-center justify-center rounded-full bg-yellow-400 text-white text-[10px] font-bold shadow-sm">
                                          {unread > 99 ? '99+' : unread}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={(e) => openOrderDetail(e, c.orderId)}
                                    title="Ver detalle del pedido"
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white/80 text-gray-400 opacity-0 shadow-sm transition-all duration-200 hover:bg-white hover:text-yellow-600 group-hover:opacity-100"
                                  >
                                    <ReceiptText size={13} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Chat — en mobile solo se muestra cuando hay una conversación seleccionada
                (ver `selectedId` arriba); en lg+ va siempre junto a la lista. Llena la fila
                del grid (que ya está acotada al viewport), así queda fijo en pantalla y solo
                su hilo de mensajes scrollea. */}
            <section className={`min-h-0 lg:col-span-8 ${selectedId ? '' : 'hidden lg:block'}`}>
              <div className="glass-spotlight glass-spotlight-soft rounded-3xl bg-white/45 backdrop-blur-2xl border border-white/50 shadow-xl shadow-gray-200/40 flex flex-col h-full overflow-hidden">
                {selected ? (
                  <>
                    <div className="px-5 py-4 border-b border-white/50 bg-white/30 backdrop-blur-xl flex items-center gap-3">
                      <button
                        onClick={() => setSelectedId('')}
                        aria-label="Volver a conversaciones"
                        className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/60 border border-white/60 text-gray-600 shadow-sm transition-all duration-300 hover:bg-white hover:text-yellow-600 lg:hidden"
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <ChatAvatar name={conversationName(selected)} imageUrl={conversationAvatar(selected)} size="lg" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 truncate">{conversationName(selected)}</p>
                        {/* Pedido al que pertenece este chat (clave cuando la persona tiene varios). */}
                        <p className="text-[11px] text-gray-400 truncate">{orderLabel(selected)}</p>
                        <p className="text-xs text-emerald-600 min-h-[1rem]">
                          {otherTyping ? 'escribiendo…' : ''}
                        </p>
                      </div>
                      <button
                        onClick={(e) => openOrderDetail(e, selected.orderId)}
                        title="Ver detalle del pedido"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white/60 border border-white/60 px-3 py-2 text-xs font-medium text-gray-600 shadow-sm transition-all duration-300 hover:bg-white hover:text-yellow-600"
                      >
                        <ReceiptText size={14} /> Ver pedido
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-auto-hide p-5 space-y-2.5">
                      {messages.map((m) => {
                        const refundPayload = parseRefundMessage(m);
                        if (refundPayload) {
                          return (
                            <div key={m.id} className="flex justify-start animate-[fadeIn_0.25s_ease]">
                              <RefundCard kind={refundPayload.kind} requestedAt={m.createdAt} onOpenDetail={() => setRefundDetail(m)} />
                            </div>
                          );
                        }
                        const mine = m.senderId === userProfile?.id;
                        return (
                          <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} animate-[fadeIn_0.25s_ease]`}>
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm transition-all duration-200 ${
                                mine
                                  ? 'bg-gradient-to-br from-yellow-400 to-amber-400 text-white rounded-br-md shadow-yellow-200/50'
                                  : 'bg-white/80 backdrop-blur-xl border border-white/70 text-gray-800 rounded-bl-md'
                              }`}
                            >
                              <p className="leading-relaxed break-words">{m.content}</p>
                              <p className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${mine ? 'text-white/80' : 'text-gray-400'}`}>
                                {formatDateTime(m.createdAt)}
                                {mine && (m.status === 'read'
                                  ? <CheckCheck size={13} className="text-white" />
                                  : <Check size={13} className="text-white/70" />)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      {otherTyping && (
                        <div className="flex justify-start">
                          <div className="rounded-2xl rounded-bl-md bg-white/80 backdrop-blur-xl border border-white/70 px-4 py-3 shadow-sm">
                            <span className="flex gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
                              <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
                              <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" />
                            </span>
                          </div>
                        </div>
                      )}
                      <div ref={bottomRef} />
                    </div>

                    <div className="p-4 border-t border-white/50 bg-white/30 backdrop-blur-xl flex items-center gap-2">
                      <input
                        value={draft}
                        onChange={(e) => { setDraft(e.target.value); notifyTyping(e.target.value.length > 0); }}
                        onBlur={() => notifyTyping(false)}
                        onKeyDown={(e) => { if (e.key === 'Enter') void handleSend(); }}
                        placeholder="Escribe un mensaje…"
                        className="flex-1 px-4 py-3 rounded-2xl border border-white/60 text-sm bg-white/70 backdrop-blur-xl outline-none transition-all duration-300 focus:border-yellow-300 focus:bg-white/90 focus:ring-2 focus:ring-yellow-100"
                      />
                      <button
                        onClick={handleSend}
                        disabled={!draft.trim()}
                        className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 text-white font-semibold p-3 shadow-md shadow-yellow-200/50 transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-sm gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/60 backdrop-blur-xl border border-white/60 text-yellow-500 shadow-sm">
                      <MessageSquare size={28} />
                    </div>
                    Selecciona una conversación para chatear.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      <OrderDetailModal open={!!detailOrderId} orderId={detailOrderId} onClose={() => setDetailOrderId(null)} />

      {refundDetail && selected && (
        <RefundDetailModal
          open={!!refundDetail}
          onClose={() => setRefundDetail(null)}
          orderId={selected.orderId}
          message={refundDetail}
          payload={parseRefundMessage(refundDetail) ?? { orderId: selected.orderId, amount: 0, full: true, kind: 'requested' }}
          requesterName={selected.customerName}
          requesterAvatar={selected.customerAvatarUrl}
          canResolve={vendor}
          onResolved={(updated) => { patchMessage(updated); setRefundDetail(updated); }}
        />
      )}
    </div>
  );
};

export default MessagesPage;
