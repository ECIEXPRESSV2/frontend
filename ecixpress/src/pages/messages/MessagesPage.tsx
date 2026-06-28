import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Archive, ArchiveRestore, ArrowLeft, Check, CheckCheck, Inbox, MessageSquare, Send } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useOrdersApi } from '../../hooks/useOrdersApi';
import { getMyStores } from '../../services/storeService';
import { ORDERS_API_BASE_URL, type ConversationResponse, type MessageResponse } from '../../lib/orders-api';
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
 * Avatar circular con iniciales y degradado, consistente con administración de usuarios.
 * `online` pinta una bolita verde/roja indicando si hay conexión para chatear.
 */
const ChatAvatar: React.FC<{ name?: string; size?: 'md' | 'lg'; online?: boolean }> = ({ name, size = 'md', online }) => {
  const sizeClass = size === 'lg' ? 'h-12 w-12 text-base' : 'h-11 w-11 text-sm';
  const dotClass = size === 'lg' ? 'h-3.5 w-3.5' : 'h-3 w-3';
  return (
    <div className="relative flex-shrink-0">
      <div
        className={`${sizeClass} flex items-center justify-center rounded-full border border-white/70 bg-gradient-to-br from-cyan-100 via-white to-yellow-100 font-bold text-gray-900 shadow-md shadow-gray-200/60`}
      >
        {getInitials(name)}
      </div>
      {online !== undefined && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 ${dotClass} rounded-full border-2 border-white shadow-sm transition-colors duration-500 ${
            online ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
          title={online ? 'En línea' : 'Desconectado'}
        />
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
  const [storeNames, setStoreNames] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string>('');
  const [view, setView] = useState<'active' | 'archived'>('active');
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [draft, setDraft] = useState('');
  const [connected, setConnected] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingSent = useRef(false);

  const upsertMessage = (msg: MessageResponse) =>
    setMessages((current) => (current.some((m) => m.id === msg.id) ? current : [...current, msg]));

  /** Inserta o actualiza una conversación en la lista (para eventos en vivo). */
  const patchConversation = (conv: ConversationResponse) =>
    setConversations((prev) => (prev.some((c) => c.id === conv.id) ? prev.map((c) => (c.id === conv.id ? conv : c)) : [conv, ...prev]));

  /** Nombre legible de una conversación: nombre de la tienda o "Pedido XXXX…". */
  const conversationName = (c: ConversationResponse) => storeNames[c.orderId] ?? `Pedido ${c.orderId.slice(0, 8)}…`;

  const unreadFor = (c: ConversationResponse) =>
    c.participants.find((p) => p.userId === userProfile?.id)?.unreadCount ?? 0;

  // Cargar conversaciones (y auto-seleccionar por orderId si viene en la URL)
  useEffect(() => {
    if (!userProfile?.id) return;
    (async () => {
      try {
        const list = vendor
          ? (await Promise.all((await getMyStores(await getToken())).map((s) => api.getConversations({ storeId: s.id })))).flat()
          : await api.getConversations({ customerId: userProfile.id });
        setConversations(list);
        if (orderIdParam) {
          const byOrder = await api.getConversations({ orderId: orderIdParam });
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

  // Enriquecer la lista con el nombre real de la tienda (best-effort).
  useEffect(() => {
    if (!userProfile?.id) return;
    (async () => {
      try {
        const orders = vendor
          ? (await Promise.all((await getMyStores(await getToken())).map((s) => api.getOrders({ storeId: s.id })))).flat()
          : await api.getOrders({ customerId: userProfile.id });
        setStoreNames(Object.fromEntries(orders.map((o) => [o.id, o.storeName])));
      } catch { /* la lista funciona sin nombres de tienda */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.id, vendor]);

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
      socket = io(`${ORDERS_API_BASE_URL}/communication`, { transports: ['websocket'], auth: { token } });
      socketRef.current = socket;
      socket.on('connect', () => {
        setConnected(true);
        if (selectedIdRef.current) socket?.emit('conversation:joined', { conversationId: selectedIdRef.current, role: chatRole });
      });
      socket.on('disconnect', () => setConnected(false));
      socket.on('message:new', (msg: MessageResponse) => {
        if (msg.conversationId !== selectedIdRef.current) return;
        upsertMessage(msg);
        if (msg.senderId !== userProfile?.id) void markRead(msg.conversationId);
      });
      // Actualización de la lista en vivo (preview, hora, no leídos, archivado).
      socket.on('conversation:updated', (conv: ConversationResponse) => patchConversation(conv));
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

  const handleArchiveToggle = async (e: React.MouseEvent, c: ConversationResponse) => {
    e.stopPropagation();
    const archiving = c.status !== 'archived';
    // Actualización optimista; el evento en vivo confirma.
    patchConversation({ ...c, status: archiving ? 'archived' : 'active' });
    if (archiving && selectedId === c.id) setSelectedId('');
    try {
      if (archiving) await api.archiveConversation(c.id);
      else await api.unarchiveConversation(c.id);
    } catch (err) {
      patchConversation(c); // revertir
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el chat');
    }
  };

  // Conversaciones por sección, ordenadas por actividad reciente (estilo mensajería).
  const sortByRecent = (a: ConversationResponse, b: ConversationResponse) =>
    new Date(b.lastMessageAt ?? b.updatedAt).getTime() - new Date(a.lastMessageAt ?? a.updatedAt).getTime();
  const activeConversations = useMemo(() => conversations.filter((c) => c.status !== 'archived').sort(sortByRecent), [conversations]);
  const archivedConversations = useMemo(() => conversations.filter((c) => c.status === 'archived').sort(sortByRecent), [conversations]);
  const visibleConversations = view === 'archived' ? archivedConversations : activeConversations;

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <Sidebar activeItem="messages" />

      <main className="ml-16 px-6 pb-6 pt-20 md:px-8 md:pb-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => (onBack ? onBack() : navigate('/home'))} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/55 backdrop-blur-xl border border-white/50 text-gray-700 font-medium text-sm shadow-sm shadow-gray-200/40 hover:bg-white/80 hover:text-yellow-600 hover:shadow-md transition-all duration-300">
              <ArrowLeft size={16} /> Volver
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Mensajes</h1>
          </div>

          {error && <div className="rounded-xl bg-red-50/80 backdrop-blur-xl border border-red-200/70 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Lista de conversaciones */}
            <section className="lg:col-span-4">
              <div className="rounded-3xl bg-white/45 backdrop-blur-2xl border border-white/50 shadow-xl shadow-gray-200/40 p-2.5">
                {/* Toggle Chats / Archivados */}
                <div className="flex items-center gap-1 p-1 mb-1.5 rounded-2xl bg-white/40 border border-white/50">
                  {([
                    { key: 'active' as const, label: 'Chats', count: activeConversations.length, icon: Inbox },
                    { key: 'archived' as const, label: 'Archivados', count: archivedConversations.length, icon: Archive },
                  ]).map(({ key, label, count, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setView(key)}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-300 ${
                        view === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Icon size={14} /> {label}
                      {count > 0 && <span className="text-[10px] text-gray-400">({count})</span>}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  {visibleConversations.length === 0 && (
                    <div className="rounded-2xl p-6 text-center text-gray-500 text-sm">
                      {view === 'archived'
                        ? 'No tienes chats archivados.'
                        : 'No tienes conversaciones. Crea un pedido para chatear con la tienda.'}
                    </div>
                  )}
                  {visibleConversations.map((c) => {
                    const unread = unreadFor(c);
                    const isActive = selectedId === c.id;
                    const archived = c.status === 'archived';
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedId(c.id)}
                        className={`group glass-spotlight glass-spotlight-soft relative w-full text-left rounded-2xl border p-3 flex items-center gap-3 cursor-pointer transition-all duration-300 ${
                          isActive
                            ? 'bg-white/80 border-yellow-300/80 shadow-md shadow-yellow-100/60'
                            : 'bg-white/0 border-transparent hover:bg-white/60 hover:border-white/60 hover:shadow-sm'
                        }`}
                      >
                        <ChatAvatar name={conversationName(c)} online={connected} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-gray-900 text-sm truncate">{conversationName(c)}</p>
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
                        {/* Acción archivar / desarchivar */}
                        <button
                          onClick={(e) => handleArchiveToggle(e, c)}
                          title={archived ? 'Restaurar chat' : 'Archivar chat'}
                          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-gray-500 opacity-0 shadow-sm transition-all duration-200 hover:bg-white hover:text-yellow-600 group-hover:opacity-100"
                        >
                          {archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Chat */}
            <section className="lg:col-span-8">
              <div className="glass-spotlight glass-spotlight-soft rounded-3xl bg-white/45 backdrop-blur-2xl border border-white/50 shadow-xl shadow-gray-200/40 flex flex-col h-[70vh] overflow-hidden">
                {selected ? (
                  <>
                    <div className="px-5 py-4 border-b border-white/50 bg-white/30 backdrop-blur-xl flex items-center gap-3">
                      <ChatAvatar name={conversationName(selected)} size="lg" online={connected} />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 truncate">{conversationName(selected)}</p>
                        <p className="text-xs">
                          {otherTyping ? (
                            <span className="text-emerald-600">escribiendo…</span>
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 transition-colors duration-500 ${connected ? 'text-emerald-600' : 'text-rose-500'}`}>
                              <span className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {connected ? 'En línea' : 'Desconectado'}
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleArchiveToggle(e, selected)}
                        title={selected.status === 'archived' ? 'Restaurar chat' : 'Archivar chat'}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white/60 border border-white/60 px-3 py-2 text-xs font-medium text-gray-600 shadow-sm transition-all duration-300 hover:bg-white hover:text-yellow-600"
                      >
                        {selected.status === 'archived' ? <><ArchiveRestore size={14} /> Restaurar</> : <><Archive size={14} /> Archivar</>}
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-auto-hide p-5 space-y-2.5">
                      {messages.map((m) => {
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
    </div>
  );
};

export default MessagesPage;
