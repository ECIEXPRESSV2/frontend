import type { OrderStatus } from './orders-api';

/** Colores de badge por estado, en la paleta de la app. */
export const statusTone: Record<OrderStatus, string> = {
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

export const statusLabel: Record<OrderStatus, string> = {
  CREATED: 'Creado',
  PENDING_PAYMENT: 'Pago pendiente',
  PAYMENT_APPROVED: 'Pago aprobado',
  CONFIRMED: 'Confirmado',
  IN_PREPARATION: 'En preparación',
  READY_FOR_PICKUP: 'Listo para recoger',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
  FAILED: 'Fallido',
};

/** Flujo "feliz" para la línea de seguimiento (RF-08). */
export const ORDER_FLOW: OrderStatus[] = [
  'CREATED',
  'PENDING_PAYMENT',
  'PAYMENT_APPROVED',
  'CONFIRMED',
  'IN_PREPARATION',
  'READY_FOR_PICKUP',
  'DELIVERED',
];

export const isCancellable = (status: OrderStatus): boolean =>
  !['DELIVERED', 'CANCELLED', 'FAILED'].includes(status);

export const isRateable = (status: OrderStatus): boolean =>
  status === 'DELIVERED' || status === 'READY_FOR_PICKUP';

/**
 * ¿El pedido ya tiene (o tuvo) código de retiro? Fulfillment lo genera al confirmarse el
 * pedido, así que el comprador puede consultarlo desde CONFIRMED en adelante.
 */
export const hasPickupCode = (status: OrderStatus): boolean =>
  ['CONFIRMED', 'IN_PREPARATION', 'READY_FOR_PICKUP', 'DELIVERED'].includes(status);
