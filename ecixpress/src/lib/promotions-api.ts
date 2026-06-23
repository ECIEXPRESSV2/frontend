/**
 * Cliente REST de promociones de products-service. Las promociones aplican un
 * descuento a un producto o categoría completa durante una ventana de fechas;
 * el backend garantiza que no se solapen dos promociones activas sobre el
 * mismo target+rango de fechas (409 si se intenta).
 */

import { catalogFetch, buildQuery } from './catalog-http';

export type PromotionScope = 'PRODUCT' | 'CATEGORY';
export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface Promotion {
  id: string;
  storeId: string;
  scope: PromotionScope;
  targetId: string;
  discountType: DiscountType;
  discountValue: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

export interface CreatePromotionInput {
  storeId: string;
  scope: PromotionScope;
  targetId: string;
  discountType: DiscountType;
  discountValue: number;
  startsAt: string;
  endsAt: string;
  isActive?: boolean;
}

export interface ByTargetFilters {
  storeId: string;
  scope: PromotionScope;
  targetId: string;
}

export interface EffectivePriceFilters {
  storeId: string;
  productId?: string;
  categoryId?: string;
  basePrice: number;
}

export const promotionsApi = {
  getAll: (storeId: string, includeInactive?: boolean, token?: string | null) =>
    catalogFetch<Promotion[]>(`/promotions${buildQuery({ storeId, includeInactive })}`, token),

  getActive: (storeId: string, token?: string | null) =>
    catalogFetch<Promotion[]>(`/promotions/active${buildQuery({ storeId })}`, token),

  getByTarget: (filters: ByTargetFilters, token?: string | null) =>
    catalogFetch<Promotion[]>(`/promotions/by-target${buildQuery({ ...filters })}`, token),

  getEffectivePrice: (filters: EffectivePriceFilters, token?: string | null) =>
    catalogFetch<{ effectivePrice: number }>(
      `/promotions/effective-price${buildQuery({ ...filters })}`,
      token,
    ),

  getById: (id: string, token?: string | null) =>
    catalogFetch<Promotion>(`/promotions/${id}`, token),

  /** 409 si se solapa con otra promoción activa en el mismo target+rango de fechas. */
  create: (input: CreatePromotionInput, token?: string | null) =>
    catalogFetch<Promotion>('/promotions', token, { method: 'POST', body: JSON.stringify(input) }),

  update: (id: string, input: Partial<CreatePromotionInput>, token?: string | null) =>
    catalogFetch<Promotion>(`/promotions/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  activate: (id: string, token?: string | null) =>
    catalogFetch<Promotion>(`/promotions/${id}/activate`, token, { method: 'PATCH' }),

  deactivate: (id: string, token?: string | null) =>
    catalogFetch<Promotion>(`/promotions/${id}/deactivate`, token, { method: 'PATCH' }),

  remove: (id: string, token?: string | null) =>
    catalogFetch<void>(`/promotions/${id}`, token, { method: 'DELETE' }),
};

/**
 * Calcula el mejor descuento aplicable entre una lista de promociones, para
 * mostrar una vista previa instantánea (badges, precio tachado). Es un puerto
 * cliente de la regla "best discount wins" de `PromotionService.calculateEffectivePrice`
 * en el backend — el precio final autoritativo siempre lo calcula el backend al
 * cotizar la orden; esta función solo sirve para UI. Mantener sincronizada si
 * cambia la regla del backend: PERCENTAGE = basePrice*value/100, FIXED_AMOUNT =
 * min(value, basePrice), ambos en PESOS COP (no centavos).
 */
export function pickBestPromotion(
  basePrice: number,
  promotions: Promotion[],
): { promotion: Promotion; effectivePrice: number } | null {
  const now = Date.now();
  const applicable = promotions.filter(
    (p) => p.isActive && new Date(p.startsAt).getTime() <= now && new Date(p.endsAt).getTime() >= now,
  );
  if (applicable.length === 0) return null;

  let best: { promotion: Promotion; effectivePrice: number } | null = null;
  for (const promotion of applicable) {
    const discount =
      promotion.discountType === 'PERCENTAGE'
        ? (basePrice * promotion.discountValue) / 100
        : Math.min(promotion.discountValue, basePrice);
    const effectivePrice = Math.max(basePrice - discount, 0);
    if (!best || effectivePrice < best.effectivePrice) {
      best = { promotion, effectivePrice };
    }
  }
  return best;
}
