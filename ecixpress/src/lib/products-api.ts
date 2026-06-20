/**
 * Cliente REST de products-service. El catálogo (productos, categorías, precios y
 * promociones) lo sirve este microservicio. El precio (`price`) llega como string
 * decimal en PESOS COP; para trabajar con el carrito/órdenes lo convertimos a
 * centavos con `priceToCents`.
 */

export const PRODUCTS_API_BASE_URL =
  import.meta.env.VITE_PRODUCTS_SERVICE_URL ?? 'http://localhost:3002';

export interface ProductCategory {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  parentId?: string | null;
  description?: string | null;
  isActive: boolean;
}

export interface Product {
  id: string;
  storeId: string;
  categoryId: string;
  name: string;
  slug: string;
  description?: string | null;
  /** Precio unitario en PESOS COP (string decimal, p. ej. "3500.00"). */
  price: string;
  imageUrl?: string | null;
  stock: number;
  reservedStock: number;
  isActive: boolean;
  category?: ProductCategory;
}

/** Pesos (string del catálogo) → centavos COP enteros. */
export const priceToCents = (price: string | number): number =>
  Math.round(parseFloat(String(price)) * 100);

async function requestJson<T>(path: string, token?: string | null): Promise<T> {
  const response = await fetch(`${PRODUCTS_API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(payload.message)) message = payload.message.join(', ');
      else if (payload.message) message = payload.message;
    } catch {
      /* keep fallback */
    }
    throw new Error(message);
  }
  return (await response.json()) as Promise<T>;
}

export const productsApi = {
  /** Categorías de una tienda. */
  getCategories: (storeId: string, token?: string | null) =>
    requestJson<ProductCategory[]>(`/categories?storeId=${encodeURIComponent(storeId)}`, token),

  /**
   * Productos activos de una tienda. Filtra por categoría (`categoryId`) o por
   * nombre (`search`); si ambos llegan, el backend prioriza la búsqueda por nombre.
   */
  getProducts: (
    storeId: string,
    params: { categoryId?: string; search?: string } = {},
    token?: string | null,
  ) => {
    const q = new URLSearchParams({ storeId });
    if (params.search) q.set('search', params.search);
    else if (params.categoryId) q.set('categoryId', params.categoryId);
    return requestJson<Product[]>(`/products?${q.toString()}`, token);
  },
};
