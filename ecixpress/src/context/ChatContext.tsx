import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getMyStores } from '../services/storeService';
import { ordersApi, ORDERS_WS_URL, type ConversationResponse } from '../lib/orders-api';

interface ChatContextValue {
  /** Suma de mensajes sin leer de todas las conversaciones del usuario, en vivo. */
  unreadMessagesCount: number;
}

const ChatContext = createContext<ChatContextValue | null>(null);

/**
 * Fuente única del contador de mensajes sin leer, para que la burbuja de chat del
 * topbar (Sidebar) muestre un badge en vivo sin depender de tener la página de
 * Mensajes abierta. El chat ya NO pasa por la campana de notificaciones (RF-09):
 * este contador es su único aviso, alimentado por el mismo WebSocket de
 * orders-service que usa MessagesPage (`conversation:updated` en la sala `user:<id>`).
 */
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile, getToken, isVendor } = useAuth();
  const userId = userProfile?.id ?? null;
  const vendor = isVendor();

  const socketRef = useRef<Socket | null>(null);
  // unreadCount por conversationId, para poder sumar sin duplicar al llegar updates.
  const [unreadByConversation, setUnreadByConversation] = useState<Record<string, number>>({});

  const applyConversation = useCallback((conv: ConversationResponse) => {
    setUnreadByConversation((prev) => {
      if (conv.status === 'closed') {
        if (!(conv.id in prev)) return prev;
        const next = { ...prev };
        delete next[conv.id];
        return next;
      }
      const unread = conv.participants.find((p) => p.userId === userId)?.unreadCount ?? 0;
      if (prev[conv.id] === unread) return prev;
      return { ...prev, [conv.id]: unread };
    });
  }, [userId]);

  const seed = useCallback(async () => {
    if (!userId) return;
    try {
      const token = await getToken().catch(() => null);
      let list;
      if (vendor) {
        // allSettled: una tienda que falle (403 puntual, sin chats) no tumba el conteo.
        const stores = await getMyStores(token ?? '');
        const results = await Promise.allSettled(stores.map((s) => ordersApi.getConversations(token, { storeId: s.id })));
        list = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
      } else {
        list = await ordersApi.getConversations(token, {});
      }
      const next: Record<string, number> = {};
      for (const conv of list) {
        if (conv.status === 'closed') continue;
        next[conv.id] = conv.participants.find((p) => p.userId === userId)?.unreadCount ?? 0;
      }
      setUnreadByConversation(next);
    } catch {
      /* el badge se corrige con el siguiente evento en vivo */
    }
  }, [userId, vendor, getToken]);

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mismo patrón aceptado en NotificationsContext: reset de estado al cerrar sesión.
      setUnreadByConversation({});
      return;
    }
    void seed();

    let active = true;
    let socket: Socket | null = null;
    (async () => {
      let token = '';
      try { token = await getToken(); } catch { /* sin sesión */ }
      if (!active) return;
      // userId en el handshake: en modo local (AUTH_DISABLED) orders lo necesita para unir
      // el socket a la sala `user:<id>` y recibir los `conversation:updated` en vivo; en
      // producción sale del token validado y este se ignora.
      socket = io(ORDERS_WS_URL, { path: '/orders/socket.io', transports: ['websocket'], auth: { token, userId }, query: { token, userId } });
      socketRef.current = socket;
      socket.on('connect', () => void seed());
      // Empuja preview/no-leídos/cierre de cada chat a `user:<id>`, esté o no abierta
      // la página de Mensajes (mismo evento que usa MessagesPage para su propia lista).
      socket.on('conversation:updated', (conv: ConversationResponse) => applyConversation(conv));
    })();

    return () => { active = false; socket?.disconnect(); socketRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const unreadMessagesCount = Object.values(unreadByConversation).reduce((sum, n) => sum + n, 0);

  return (
    <ChatContext.Provider value={{ unreadMessagesCount }}>
      {children}
    </ChatContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useChat = (): ChatContextValue => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
};
