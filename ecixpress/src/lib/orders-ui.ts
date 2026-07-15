import type { OrderStatus } from './orders-api';

/** Colores de badge por estado, en la paleta de la app. */
export const statusTone: Record<OrderStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  CREATED: 'bg-gray-100 text-gray-700',
  PENDING_STOCK: 'bg-sky-100 text-sky-700',
  PENDING_PAYMENT: 'bg-amber-100 text-amber-700',
  PAYMENT_APPROVED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  IN_PREPARATION: 'bg-orange-100 text-orange-700',
  READY_FOR_PICKUP: 'bg-yellow-100 text-yellow-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  FAILED: 'bg-rose-100 text-rose-700',
  PARTIALLY_RETURNED: 'bg-purple-100 text-purple-700',
  RETURNED: 'bg-fuchsia-100 text-fuchsia-700',
  RETURN_PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
};

export const statusLabel: Record<OrderStatus, string> = {
  DRAFT: 'Carrito',
  CREATED: 'Creado',
  PENDING_STOCK: 'Validando stock',
  PENDING_PAYMENT: 'Pago pendiente',
  PAYMENT_APPROVED: 'Pago aprobado',
  CONFIRMED: 'Confirmado',
  IN_PREPARATION: 'Listo para retirar',
  READY_FOR_PICKUP: 'Listo para retirar',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
  FAILED: 'Fallido',
  PARTIALLY_RETURNED: 'Devolución parcial',
  RETURNED: 'Devuelto',
  RETURN_PENDING_APPROVAL: 'Devolución en revisión',
};

/** Flujo "feliz" para la línea de seguimiento (RF-08). */
export const ORDER_FLOW: OrderStatus[] = [
  'CREATED',
  'PENDING_STOCK',
  'PENDING_PAYMENT',
  'PAYMENT_APPROVED',
  'CONFIRMED',
  'IN_PREPARATION',
  'READY_FOR_PICKUP',
  'DELIVERED',
];

/**
 * ¿El pedido admite cancelación? A partir de READY_FOR_PICKUP el negocio ya preparó el
 * pedido: el backend rechaza la cancelación desde ahí en adelante (solo el vencimiento del
 * QR lo cancela, sin reembolso — ver notification qr_expiring_soon).
 */
export const isCancellable = (status: OrderStatus): boolean =>
  !['READY_FOR_PICKUP', 'DELIVERED', 'CANCELLED', 'FAILED', 'PARTIALLY_RETURNED', 'RETURNED', 'RETURN_PENDING_APPROVAL'].includes(status);

export const isRateable = (status: OrderStatus): boolean =>
  status === 'DELIVERED' || status === 'READY_FOR_PICKUP';

/**
 * ¿El pedido ya tiene (o tuvo) código de retiro? Fulfillment lo genera al confirmarse el
 * pedido, así que el comprador puede consultarlo desde CONFIRMED en adelante.
 */
export const hasPickupCode = (status: OrderStatus): boolean =>
  ['CONFIRMED', 'IN_PREPARATION', 'READY_FOR_PICKUP', 'DELIVERED'].includes(status);

/**
 * ¿El pedido admite solicitar una devolución (total o parcial)? Desde READY_FOR_PICKUP ya
 * no se admite (el negocio preparó el pedido; para eso está cancelar, ver isCancellable,
 * bloqueado también desde ese estado). DELIVERED/PARTIALLY_RETURNED (post-recogida) pasan
 * por aprobación de un admin antes de reembolsar.
 */
export const isReturnable = (status: OrderStatus): boolean =>
  ['CONFIRMED', 'DELIVERED', 'PARTIALLY_RETURNED'].includes(status);

/**
 * ¿El pedido admite "reordenar"? Solo tiene sentido sobre pedidos ya cerrados
 * (entregado, cancelado o fallido); reordenar genera un pedido nuevo (otro id).
 */
export const isReorderable = (status: OrderStatus): boolean =>
  ['DELIVERED', 'CANCELLED', 'FAILED'].includes(status);

/** ¿El pedido está pendiente de pago y el comprador puede ir a pagarlo? */
export const isPayable = (status: OrderStatus): boolean =>
  status === 'PENDING_PAYMENT';

/**
 * Nombre amigable del pedido para mostrar al cliente: nombre de la tienda + los
 * últimos 4 caracteres del código (p. ej. "Café Central · #9558"). El código
 * completo (orderNumber) se sigue mostrando como referencia secundaria.
 */
export const orderDisplayName = (order: { storeName: string; orderNumber: string }): string =>
  `${order.storeName} · #${order.orderNumber.slice(-4)}`;
