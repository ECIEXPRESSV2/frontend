// Cliente de PQRS (peticiones, quejas, reclamos, sugerencias), sobre identity-service.
// Va por el gateway (/identity/pqrs) con el token Firebase de la sesión -- igual que
// userService.ts. El backend decide el alcance según el rol: un ADMIN ve todas las PQRS,
// cualquier otro usuario solo ve las suyas (mismo endpoint GET /pqrs para ambos casos).

import { apiFetch } from './api';

export type PqrsStatus = 'OPEN' | 'CLOSED';
export type PqrsSenderRole = 'USER' | 'ADMIN';

export interface PqrsMessage {
  id: string;
  pqrsId: string;
  senderId: string;
  senderRole: PqrsSenderRole;
  body: string;
  createdAt: string;
}

export interface PqrsListItem {
  id: string;
  subject: string;
  status: PqrsStatus;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  user: { id: string; fullName: string; email: string };
  /** Solo el último mensaje (vista previa). */
  messages: { body: string; senderRole: PqrsSenderRole; createdAt: string }[];
}

export interface PqrsThread {
  id: string;
  userId: string;
  subject: string;
  status: PqrsStatus;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  closedBy: string | null;
  user?: { id: string; fullName: string; email: string };
  messages: PqrsMessage[];
}

/** Crea una PQRS (asunto + primer mensaje). */
export const createPqrs = (data: { subject: string; body: string }, token: string) =>
  apiFetch<PqrsThread>('/pqrs', token, { method: 'POST', body: JSON.stringify(data) });

/** Lista PQRS: las propias (usuario normal) o todas (administrador). */
export const listPqrs = (token: string, status?: PqrsStatus) =>
  apiFetch<PqrsListItem[]>(`/pqrs${status ? `?status=${status}` : ''}`, token);

/** Hilo completo de una PQRS (dueño o administrador). */
export const getPqrsThread = (id: string, token: string) =>
  apiFetch<PqrsThread>(`/pqrs/${id}`, token);

/** Responde una PQRS (dueño o administrador; solo si sigue abierta). */
export const addPqrsMessage = (id: string, body: string, token: string) =>
  apiFetch<PqrsThread>(`/pqrs/${id}/messages`, token, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });

/** Cierra una PQRS (solo administrador). */
export const closePqrs = (id: string, token: string) =>
  apiFetch<PqrsThread>(`/pqrs/${id}/close`, token, { method: 'PATCH' });
