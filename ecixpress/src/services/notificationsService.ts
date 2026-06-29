/**
 * Cliente REST de la bandeja de notificaciones (notifications-service).
 *
 * Estos endpoints identifican al usuario con el header `x-user-id` (en desarrollo el
 * front lo envía directamente; en producción lo inyecta el API Gateway). Conviven con
 * el WebSocket en tiempo real: el socket avisa de notificaciones nuevas al instante y
 * estos endpoints exponen el histórico persistido y el estado leído/no leído.
 */

import { getFirebaseIdToken } from '../lib/auth-token';

const NOTIFICATIONS_URL =
  (import.meta.env.VITE_NOTIFICATIONS_API_URL || 'http://localhost:3006').replace(/\/$/, '');

export interface InboxNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  deliveries: { channel: string; status: string; provider: string | null }[];
}

async function request<T>(
  path: string,
  userId: string,
  options: RequestInit = {},
): Promise<T> {
  // Bearer de Firebase: requerido al pasar por el API Gateway (valida y enriquece;
  // descarta el x-user-id del cliente). En modo directo notifications lo ignora.
  const token = await getFirebaseIdToken();
  const res = await fetch(`${NOTIFICATIONS_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-user-id': userId,
      ...(options.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    throw new Error(`notifications ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/** Lista las notificaciones del usuario (más recientes primero). */
export function fetchInbox(
  userId: string,
  limit = 30,
): Promise<InboxNotification[]> {
  return request<InboxNotification[]>(`/notifications?limit=${limit}`, userId);
}

/** Cantidad de notificaciones sin leer. */
export function fetchUnreadCount(userId: string): Promise<number> {
  return request<{ count: number }>(
    '/notifications/unread-count',
    userId,
  ).then((r) => r.count);
}

/** Marca una notificación como leída. */
export function markRead(
  userId: string,
  id: string,
): Promise<InboxNotification> {
  return request<InboxNotification>(`/notifications/${id}/read`, userId, {
    method: 'PATCH',
  });
}

/** Marca todas las notificaciones del usuario como leídas. */
export function markAllRead(userId: string): Promise<{ updated: number }> {
  return request<{ updated: number }>('/notifications/read-all', userId, {
    method: 'POST',
  });
}
