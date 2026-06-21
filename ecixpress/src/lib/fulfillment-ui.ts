import type {
  DeliveryFailureReason,
  DeliveryMethod,
  PickupCodeStatus,
  ValidationError,
} from './fulfillment-api';

/** Etiqueta legible (español) del estado del código de retiro. */
export const pickupStatusLabel: Record<PickupCodeStatus, string> = {
  ACTIVE: 'Activo',
  USED: 'Usado',
  EXPIRED: 'Vencido',
  INVALIDATED: 'Anulado',
};

/** Color de badge por estado, en la paleta de la app. */
export const pickupStatusTone: Record<PickupCodeStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  USED: 'bg-blue-100 text-blue-700',
  EXPIRED: 'bg-amber-100 text-amber-700',
  INVALIDATED: 'bg-red-100 text-red-700',
};

/** Texto guía de cada estado (heurística de Nielsen: visibilidad del estado). */
export const pickupStatusHint: Record<PickupCodeStatus, string> = {
  ACTIVE: 'Muestra este código al vendedor para recoger tu pedido.',
  USED: 'Este código ya fue utilizado: tu pedido fue entregado.',
  EXPIRED: 'El código venció. Comunícate con la tienda si aún no recoges tu pedido.',
  INVALIDATED: 'El código fue anulado porque el pedido se canceló.',
};

export const deliveryMethodLabel: Record<DeliveryMethod, string> = {
  QR: 'Código QR',
  MANUAL: 'Manual',
};

/** Motivos tipificados de entrega fallida (UC-06). */
export const failureReasonLabel: Record<DeliveryFailureReason, string> = {
  CUSTOMER_NO_SHOW: 'El cliente no se presentó',
  SELLER_REJECTED: 'Rechazada por el vendedor',
  ORDER_NOT_AVAILABLE: 'El pedido no estaba disponible',
  OTHER: 'Otro motivo',
};

/** Mensajes amigables (español) para cada motivo de rechazo de validación (UC-03). */
export const validationErrorLabel: Record<ValidationError, string> = {
  CODE_NOT_FOUND: 'No encontramos un código con ese valor. Revisa que esté bien escrito.',
  CODE_EXPIRED: 'Este código de retiro ya venció.',
  CODE_ALREADY_USED: 'Este código de retiro ya fue utilizado.',
  CODE_INVALIDATED: 'Este código fue anulado porque el pedido se canceló.',
  WRONG_STORE: 'Este código no pertenece a tu tienda.',
};

/** Lista de motivos para poblar selects (UC-06). */
export const FAILURE_REASONS: DeliveryFailureReason[] = [
  'CUSTOMER_NO_SHOW',
  'SELLER_REJECTED',
  'ORDER_NOT_AVAILABLE',
  'OTHER',
];
