import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { ArrowLeft, Send, Wifi } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useOrdersApi } from '../../hooks/useOrdersApi';
import { ORDERS_API_BASE_URL, type ConversationResponse, type MessageResponse } from '../../lib/orders-api';
import { formatDateTime } from '../../lib/format';

interface MessagesPageProps {
  onBack?: () => void;
}

const MessagesPage: React.FC<MessagesPageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderIdParam = searchParams.get('orderId');
  const { userProfile, getToken } = useAuth();
  const api = useOrdersApi();

  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
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

  // Cargar conversaciones (y auto-seleccionar por orderId si viene en la URL)
  useEffect(() => {
    if (!userProfile?.id) return;
    (async () => {
      try {
        const list = await api.getConversations({ customerId: userProfile.id });
        setConversations(list);
        if (orderIdParam) {
          const byOrder = await api.getConversations({ orderId: orderIdParam });
          if (byOrder[0]) { setSelectedId(byOrder[0].id); return; }
        }
        if (list[0]) setSelectedId((prev) => prev || list[0].id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudieron cargar las conversaciones');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.id, orderIdParam]);

  // Cargar mensajes al cambiar de conversación
  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      try {
        const res = await api.getMessages(selectedId);
        setMessages(res.items);
        socketRef.current?.emit('conversation:joined', { conversationId: selectedId, role: 'customer' });
      } catch {
        setMessages([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

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
        if (selectedId) socket?.emit('conversation:joined', { conversationId: selectedId, role: 'customer' });
      });
      socket.on('disconnect', () => setConnected(false));
      socket.on('message:new', (msg: MessageResponse) => {
        if (msg.conversationId === selectedIdRef.current) upsertMessage(msg);
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
    void api.setTyping({ conversationId: selectedId, role: 'customer', typing }).catch(() => undefined);
  };

  const handleSend = async () => {
    if (!selectedId || !draft.trim()) return;
    const content = draft.trim();
    setDraft('');
    notifyTyping(false);
    try {
      const sent = await api.sendMessage({ conversationId: selectedId, senderRole: 'customer', content });
      upsertMessage(sent);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar el mensaje');
    }
  };

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <Sidebar activeItem="messages" />

      <main className="ml-16 px-6 pb-6 pt-20 md:px-8 md:pb-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => (onBack ? onBack() : navigate('/home'))} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 backdrop-blur-xl border border-white/40 text-gray-700 font-medium text-sm hover:bg-yellow-50 hover:text-yellow-600 transition-all">
                <ArrowLeft size={16} /> Volver
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Mensajes</h1>
            </div>
            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${connected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
              <Wifi size={14} /> {connected ? 'En vivo' : 'Sin conexión'}
            </span>
          </div>

          {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Lista de conversaciones */}
            <section className="lg:col-span-4 space-y-2">
              {conversations.length === 0 && (
                <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 p-6 text-center text-gray-500 text-sm">
                  No tienes conversaciones. Crea un pedido para chatear con la tienda.
                </div>
              )}
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left rounded-2xl border p-4 transition-all ${selectedId === c.id ? 'bg-yellow-50 border-yellow-300' : 'bg-white/70 border-white/60 hover:border-yellow-200'}`}
                >
                  <p className="font-semibold text-gray-900 text-sm">Pedido {c.orderId.slice(0, 8)}…</p>
                  <p className="text-xs text-gray-500 truncate">{c.lastMessagePreview ?? 'Sin mensajes aún'}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{c.lastMessageAt ? formatDateTime(c.lastMessageAt) : ''}</p>
                </button>
              ))}
            </section>

            {/* Chat */}
            <section className="lg:col-span-8">
              <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm flex flex-col h-[70vh]">
                {selected ? (
                  <>
                    <div className="px-5 py-4 border-b border-white/60">
                      <p className="font-bold text-gray-900">Chat del pedido {selected.orderId.slice(0, 8)}…</p>
                      <p className="text-xs text-gray-500">Conversación con la tienda</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-3">
                      {messages.map((m) => {
                        const mine = m.senderId === userProfile?.id;
                        return (
                          <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? 'bg-yellow-400 text-white' : 'bg-white border border-gray-100 text-gray-800'}`}>
                              <p>{m.content}</p>
                              <p className={`text-[10px] mt-1 ${mine ? 'text-white/80' : 'text-gray-400'}`}>{formatDateTime(m.createdAt)}</p>
                            </div>
                          </div>
                        );
                      })}
                      {otherTyping && <p className="text-xs text-gray-400 italic">La tienda está escribiendo…</p>}
                      <div ref={bottomRef} />
                    </div>

                    <div className="p-4 border-t border-white/60 flex items-center gap-2">
                      <input
                        value={draft}
                        onChange={(e) => { setDraft(e.target.value); notifyTyping(e.target.value.length > 0); }}
                        onBlur={() => notifyTyping(false)}
                        onKeyDown={(e) => { if (e.key === 'Enter') void handleSend(); }}
                        placeholder="Escribe un mensaje…"
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white/70 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                      />
                      <button onClick={handleSend} className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 text-white font-semibold px-4 py-3 hover:bg-yellow-500 transition-all">
                        <Send size={16} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
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
