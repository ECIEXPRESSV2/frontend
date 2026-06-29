/**
 * Cliente REST del microservicio Fulfillment (logística y entrega).
 *
 * A diferencia de orders/identity (que usan `Authorization: Bearer <token Firebase>`),
 * Fulfillment es un servicio downstream que confía en los headers que normalmente inyecta
 * el API Gateway: `x-user-id`, `x-user-role` y `x-user-store`. En local no hay gateway, así
 * que el frontend los envía directamente a partir del usuario autenticado.
 *
 * El prefijo de la API es `/api/v1` (salvo la imagen pública del QR, que vive fuera).
 */

import { getFirebaseIdToken } from './auth-token';

// ─── Enums de negocio (contrato con el backend) ─────────────────
export type PickupCodeStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'INVALIDATED';
export type DeliveryMethod = 'QR' | 'MANUAL';
export type DeliveryFailureReason =
  | 'CUSTOMER_NO_SHOW'
  | 'SELLER_REJECTED'
  | 'ORDER_NOT_AVAILABLE'
  | 'OTHER';
export type ValidationError =
  | 'CODE_NOT_FOUND'
  | 'CODE_EXPIRED'
  | 'CODE_ALREADY_USED'
  | 'CODE_INVALIDATED'
  | 'WRONG_STORE';

// ─── Respuestas ─────────────────────────────────────────────────

/** UC-02: el código de retiro del pedido para el comprador. */
export interface PickupCodeResponse {
  orderId: string;
  token: string;
  shortCode: string;
  qrCode: string; // URL pública del PNG
  status: PickupCodeStatus;
  expiresAt: string;
  usedAt: string | null;
}

/** Datos del pedido cuando el código es válido (UC-03). */
export interface ValidatedOrder {
  orderId: string;
  buyerId: string;
  storeId: string;
  expiresAt: string;
}

/** UC-03: resultado de validar un código (válido, o rechazado con motivo tipificado). */
export interface ValidateCodeResponse {
  valid: boolean;
  validationError?: ValidationError | null;
  order?: ValidatedOrder | null;
}

/** Respuesta de las operaciones de entrega (confirmar, manual, fallida). */
export interface DeliveryResponse {
  id: string;
  orderId: string;
  storeId: string;
  confirmedByUserId: string;
  method: DeliveryMethod | null;
  failureReason: DeliveryFailureReason | null;
  deliveredAt: string;
  note: string | null;
  /** `true` cuando el pedido ya estaba entregado (operación idempotente, no se creó una entrega nueva). */
  alreadyDelivered: boolean;
}

/** UC-09: estado del proceso de retiro de un pedido (no el estado del pedido). */
export interface FulfillmentStatus {
  orderId: string;
  code: { status: PickupCodeStatus; expiresAt: string; usedAt: string | null } | null;
  delivery: { method: DeliveryMethod; deliveredAt: string; confirmedByUserId: string } | null;
  failure: { reason: DeliveryFailureReason; occurredAt: string; note: string | null } | null;
}

/** UC-10: respuesta paginada del historial de entregas por tienda. */
export interface PaginatedDeliveries {
  data: DeliveryResponse[];
  page: number;
  limit: number;
  total: number;
}

export interface StoreDeliveriesQuery {
  page?: number;
  limit?: number;
  method?: DeliveryMethod;
  from?: string;
  to?: string;
  confirmedByUserId?: string;
  order?: 'ASC' | 'DESC';
}

/** Identidad del solicitante: se traduce a los headers `x-user-*` del gateway. */
export interface FulfillmentIdentity {
  userId: string;
  role?: string;
  storeId?: string;
}

export const FULFILLMENT_API_BASE_URL =
  (import.meta.env.VITE_FULFILLMENT_API_URL ?? 'http://localhost:3005').replace(/\/$/, '');

// Prefijo de la API de Fulfillment.
//  - Modo DIRECTO (default): el servicio sirve en `/api/v1/fulfillment/...`, así que
//    el cliente antepone `/api/v1` (los paths ya incluyen `/fulfillment`).
//  - Modo GATEWAY: el gateway recibe `/fulfillment/...` y él mismo lo reescribe a
//    `/api/v1/fulfillment/...`. Para no duplicarlo, se pone VITE_FULFILLMENT_API_PREFIX=
//    (vacío) y VITE_FULFILLMENT_API_URL=http://localhost:3000 (raíz del gateway).
const API_PREFIX = import.meta.env.VITE_FULFILLMENT_API_PREFIX ?? '/api/v1';

/** Error con el `code` técnico del backend (ej. WRONG_STORE) además del status HTTP. */
export class FulfillmentApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function gatewayHeaders(identity?: FulfillmentIdentity): Record<string, string> {
  if (!identity?.userId) return {};
  const headers: Record<string, string> = { 'x-user-id': identity.userId };
  if (identity.role) headers['x-user-role'] = identity.role;
  if (identity.storeId) headers['x-user-store'] = identity.storeId;
  return headers;
}

async function requestJson<T>(
  path: string,
  identity?: FulfillmentIdentity,
  init?: RequestInit,
): Promise<T> {
  // Bearer de Firebase: requerido al pasar por el API Gateway (valida y enriquece;
  // descarta el x-user-id del cliente). En modo directo fulfillment lo ignora.
  const token = await getFirebaseIdToken();
  const response = await fetch(`${FULFILLMENT_API_BASE_URL}${API_PREFIX}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...gatewayHeaders(identity),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    let message = `La solicitud falló (estado ${response.status}).`;
    let code: string | undefined;
    try {
      const payload = (await response.json()) as { message?: string | string[]; code?: string };
      code = payload.code;
      if (Array.isArray(payload.message)) message = payload.message.join(', ');
      else if (payload.message) message = payload.message;
    } catch {
      /* se mantiene el mensaje por defecto */
    }
    throw new FulfillmentApiError(response.status, message, code);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as Promise<T>;
}

/**
 * Cliente REST de Fulfillment. Cada método recibe la identidad del solicitante; el hook
 * `useFulfillmentApi` la inyecta a partir del usuario autenticado (AuthContext).
 */
export const fulfillmentApi = {
  /** Healthcheck (público, fuera del prefijo /api/v1). */
  health: () =>
    fetch(`${FULFILLMENT_API_BASE_URL}/health`).then((r) => r.json() as Promise<{ status: string }>),

  /** UC-02: el comprador consulta el código de retiro de su pedido. */
  getOrderCode: (orderId: string, identity: FulfillmentIdentity) =>
    requestJson<PickupCodeResponse>(`/fulfillment/orders/${encodeURIComponent(orderId)}/code`, identity),

  /** UC-03: el vendedor valida un código (solo lectura, no cambia el estado). */
  validateCode: (code: string, identity: FulfillmentIdentity) =>
    requestJson<ValidateCodeResponse>('/fulfillment/codes/validate', identity, {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  /** UC-04: el vendedor confirma la entrega por QR/código. */
  confirmCode: (code: string, identity: FulfillmentIdentity) =>
    requestJson<DeliveryResponse>('/fulfillment/codes/confirm', identity, {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  /** UC-05: entrega manual (fallback). Requiere acceso a la tienda del pedido. */
  manualDelivery: (
    orderId: string,
    body: { reason: string; note?: string },
    identity: FulfillmentIdentity,
  ) =>
    requestJson<DeliveryResponse>(
      `/fulfillment/orders/${encodeURIComponent(orderId)}/manual-delivery`,
      identity,
      { method: 'POST', body: JSON.stringify(body) },
    ),

  /** UC-06: registrar una entrega fallida con motivo tipificado. */
  deliveryFailure: (
    orderId: string,
    body: { reason: DeliveryFailureReason; note?: string },
    identity: FulfillmentIdentity,
  ) =>
    requestJson<DeliveryResponse>(
      `/fulfillment/orders/${encodeURIComponent(orderId)}/delivery-failure`,
      identity,
      { method: 'POST', body: JSON.stringify(body) },
    ),

  /** UC-09: estado del proceso de retiro de un pedido. */
  getFulfillmentStatus: (orderId: string, identity: FulfillmentIdentity) =>
    requestJson<FulfillmentStatus>(`/fulfillment/orders/${encodeURIComponent(orderId)}`, identity),

  /** UC-10: historial paginado de entregas de una tienda. */
  getStoreDeliveries: (storeId: string, query: StoreDeliveriesQuery, identity: FulfillmentIdentity) => {
    const q = new URLSearchParams();
    if (query.page) q.set('page', String(query.page));
    if (query.limit) q.set('limit', String(query.limit));
    if (query.method) q.set('method', query.method);
    if (query.from) q.set('from', query.from);
    if (query.to) q.set('to', query.to);
    if (query.confirmedByUserId) q.set('confirmedByUserId', query.confirmedByUserId);
    if (query.order) q.set('order', query.order);
    const qs = q.toString();
    return requestJson<PaginatedDeliveries>(
      `/fulfillment/stores/${encodeURIComponent(storeId)}/deliveries${qs ? `?${qs}` : ''}`,
      identity,
    );
  },
};
