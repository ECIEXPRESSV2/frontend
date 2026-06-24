import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'react-toastify';
import { useAuth } from './AuthContext';
import {
  fetchInbox,
  markAllRead as apiMarkAllRead,
  markRead as apiMarkRead,
  type InboxNotification,
} from '../services/notificationsService';

const NOTIFICATIONS_URL =
  import.meta.env.VITE_NOTIFICATIONS_API_URL || 'http://localhost:3006';

/**
 * Estilo del toast según el `type` de la notificación (definido en el catálogo del
 * notifications-service). Lo no listado usa `info`. Agregar un caso es añadir una
 * entrada aquí — no requiere tocar el backend.
 */
const TOAST_VARIANT: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
  'wallet.topup_approved': 'success',
  'payment.processed': 'success',
  'payment.released': 'success',
  'refund.issued': 'success',
  'order.confirmed': 'success',
  'delivery.confirmed': 'success',
  'wallet.topup_failed': 'error',
  'payment.failed': 'error',
  'delivery.failed': 'error',
  'order.cancelled': 'warning',
  'delivery.qr_expired': 'warning',
  'inventory.low_stock': 'warning',
};

function toastVariantFor(type?: string | null) {
  const variant = (type && TOAST_VARIANT[type]) || 'info';
  return toast[variant];
}

/**
 * Evento recibido en vivo por el socket. Se expone para que otros contextos (p. ej. la
 * billetera) reaccionen al instante sin esperar a que el usuario abra un modal. El
 * contador `seq` cambia en cada evento, de modo que un `useEffect` se dispara aunque
 * lleguen dos eventos del mismo `type` seguidos.
 */
export interface LiveNotificationEvent {
  type: string | null;
  data: Record<string, unknown> | null;
  seq: number;
}

interface NotificationsContextValue {
  /** True si el socket está conectado al notifications-service. */
  connected: boolean;
  /** Bandeja completa (histórico persistido), más recientes primero. */
  notifications: InboxNotification[];
  /** Último evento recibido en vivo por el socket (null hasta que llegue el primero). */
  liveEvent: LiveNotificationEvent | null;
  /** Notificaciones sin leer. */
  unreadCount: number;
  /** Cargando la bandeja desde el backend. */
  loading: boolean;
  /** Recarga la bandeja desde el backend. */
  refresh: () => Promise<void>;
  /** Marca una notificación como leída (optimista). */
  markRead: (id: string) => Promise<void>;
  /** Marca todas como leídas (optimista). */
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

/**
 * Fuente única de notificaciones del usuario. Combina:
 *  - el WebSocket en tiempo real (toast instantáneo + recarga de la bandeja), y
 *  - la bandeja persistida del backend (histórico y estado leído/no leído).
 *
 * Cualquier microservicio que publique un evento cuyo catálogo incluya el canal REALTIME
 * dispara la notificación en vivo; aunque el usuario esté desconectado, queda en la
 * bandeja y aparece aquí al volver.
 */
export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { userProfile } = useAuth();
  const userId = userProfile?.id ?? null;

  const socketRef = useRef<Socket | null>(null);
  const seqRef = useRef(0);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [liveEvent, setLiveEvent] = useState<LiveNotificationEvent | null>(null);
  const [loading, setLoading] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const inbox = await fetchInbox(userId);
      setNotifications(inbox);
    } catch (err) {
      console.error('No se pudo cargar la bandeja de notificaciones:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const markRead = useCallback(
    async (id: string) => {
      if (!userId) return;
      // Optimista: marca local y persiste; si falla, recarga del backend.
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, read: true, readAt: new Date().toISOString() }
            : n,
        ),
      );
      try {
        await apiMarkRead(userId, id);
      } catch {
        void refresh();
      }
    },
    [userId, refresh],
  );

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        read: true,
        readAt: n.readAt ?? new Date().toISOString(),
      })),
    );
    try {
      await apiMarkAllRead(userId);
    } catch {
      void refresh();
    }
  }, [userId, refresh]);

  // Cargar la bandeja y abrir el socket cuando hay usuario autenticado.
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setConnected(false);
      return;
    }

    void refresh();

    // El gateway lee el userId del handshake (query `userId` o header x-user-id).
    const socket = io(NOTIFICATIONS_URL, {
      query: { userId },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    // En cada (re)conexión recargamos la bandeja: si llegaron notificaciones mientras
    // el socket estuvo caído (red, reinicio del backend, sleep de Render), aparecen sin
    // tener que abrir la campana. Cubre tanto la conexión inicial como las reconexiones.
    socket.on('connect', () => {
      setConnected(true);
      void refresh();
    });
    socket.on('disconnect', () => setConnected(false));

    // Evento emitido por RealtimeChannel.emitToUser → { type, title, body, data }.
    socket.on(
      'notification',
      (payload: {
        type?: string | null;
        title: string;
        body: string;
        data?: Record<string, unknown> | null;
      }) => {
        const show = toastVariantFor(payload.type);
        show(
          <div>
            <strong>{payload.title}</strong>
            <div style={{ fontSize: '0.875rem' }}>{payload.body}</div>
          </div>,
        );
        // Publicar el evento en vivo para que otros contextos reaccionen (la billetera
        // refresca su saldo, el modal de recarga auto-verifica el estado, etc.).
        seqRef.current += 1;
        setLiveEvent({
          type: payload.type ?? null,
          data: payload.data ?? null,
          seq: seqRef.current,
        });
        // Recargar la bandeja para traer la notificación ya persistida (con su id y
        // estado). El evento en vivo no incluye el id, por eso se refresca.
        void refresh();
      },
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [userId, refresh]);

  return (
    <NotificationsContext.Provider
      value={{
        connected,
        notifications,
        liveEvent,
        unreadCount,
        loading,
        refresh,
        markRead,
        markAllRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useNotifications = (): NotificationsContextValue => {
  const ctx = useContext(NotificationsContext);
  if (!ctx)
    throw new Error('useNotifications must be used inside NotificationsProvider');
  return ctx;
};
