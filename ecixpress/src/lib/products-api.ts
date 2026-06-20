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

/** Genera un slug URL-friendly a partir de un nombre (único por tienda). */
export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos (marcas diacríticas)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);

export interface CreateCategoryInput {
  storeId: string;
  name: string;
  slug: string;
  parentId?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateProductInput {
  storeId: string;
  categoryId: string;
  name: string;
  slug: string;
  /** Precio en PESOS COP (number, hasta 2 decimales). */
  price: number;
  description?: string;
  sku?: string;
  imageUrl?: string;
  stock?: number;
  minStock?: number;
  isActive?: boolean;
}

export type StockOperation = 'set' | 'add' | 'subtract';

async function requestJson<T>(path: string, token?: string | null, init?: RequestInit): Promise<T> {
  const response = await fetch(`${PRODUCTS_API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
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
  if (response.status === 204) return undefined as T;
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
    params: { categoryId?: string; search?: string; includeInactive?: boolean } = {},
    token?: string | null,
  ) => {
    const q = new URLSearchParams({ storeId });
    if (params.search) q.set('search', params.search);
    else if (params.categoryId) q.set('categoryId', params.categoryId);
    if (params.includeInactive) q.set('includeInactive', 'true');
    return requestJson<Product[]>(`/products?${q.toString()}`, token);
  },

  // ─── Gestión (VENDOR / ADMIN) ──────────────────────────────────────────
  createCategory: (input: CreateCategoryInput, token?: string | null) =>
    requestJson<ProductCategory>('/categories', token, { method: 'POST', body: JSON.stringify(input) }),

  createProduct: (input: CreateProductInput, token?: string | null) =>
    requestJson<Product>('/products', token, { method: 'POST', body: JSON.stringify(input) }),

  updateProduct: (id: string, input: Partial<CreateProductInput>, token?: string | null) =>
    requestJson<Product>(`/products/${id}`, token, { method: 'PATCH', body: JSON.stringify(input) }),

  adjustStock: (
    id: string,
    payload: { operation: StockOperation; quantity: number; notes?: string },
    token?: string | null,
  ) => requestJson<Product>(`/products/${id}/stock`, token, { method: 'PATCH', body: JSON.stringify(payload) }),

  setActive: (id: string, active: boolean, token?: string | null) =>
    requestJson<Product>(`/products/${id}/${active ? 'activate' : 'deactivate'}`, token, { method: 'PATCH' }),

  deleteProduct: (id: string, token?: string | null) =>
    requestJson<void>(`/products/${id}`, token, { method: 'DELETE' }),
};
