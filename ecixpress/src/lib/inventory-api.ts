/**
 * Cliente REST de movimientos de inventario de products-service. Es de solo
 * lectura: el log de movimientos lo genera el backend internamente cada vez
 * que se llama `productsApi.adjustStock`. Requiere rol VENDOR/ADMIN/ANALYST.
 */

import { catalogFetch, buildQuery } from './catalog-http';

export type MovementType =
  | 'ADJUSTMENT_ADD'
  | 'ADJUSTMENT_SUBTRACT'
  | 'ADJUSTMENT_SET'
  | 'RESERVATION'
  | 'RELEASE';

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  ADJUSTMENT_ADD: 'Ajuste (suma)',
  ADJUSTMENT_SUBTRACT: 'Ajuste (resta)',
  ADJUSTMENT_SET: 'Ajuste (valor exacto)',
  RESERVATION: 'Reserva',
  RELEASE: 'Liberación',
};

export interface InventoryMovement {
  id: string;
  productId: string;
  storeId: string;
  type: MovementType;
  quantity: number;
  stockAfter: number;
  notes?: string | null;
  createdAt: string;
}

export interface MovementFilters {
  type?: MovementType;
  from?: string;
  to?: string;
}

export const inventoryApi = {
  /** Requiere `storeId` o `productId`. */
  getMovements: (
    filters: MovementFilters & { storeId?: string; productId?: string },
    token?: string | null,
  ) => catalogFetch<InventoryMovement[]>(`/inventory/movements${buildQuery({ ...filters })}`, token),

  getByProduct: (productId: string, filters: MovementFilters = {}, token?: string | null) =>
    catalogFetch<InventoryMovement[]>(
      `/inventory/movements/product/${productId}${buildQuery({ ...filters })}`,
      token,
    ),

  getByStore: (storeId: string, filters: MovementFilters = {}, token?: string | null) =>
    catalogFetch<InventoryMovement[]>(
      `/inventory/movements/store/${storeId}${buildQuery({ ...filters })}`,
      token,
    ),

  getById: (id: string, token?: string | null) =>
    catalogFetch<InventoryMovement>(`/inventory/movements/${id}`, token),
};
