/**
 * Cliente REST de products-service. El catálogo (productos, categorías, precios y
 * promociones) lo sirve este microservicio. El precio (`price`) llega como string
 * decimal en PESOS COP; para trabajar con el carrito/órdenes lo convertimos a
 * centavos con `priceToCents`.
 */

import { catalogFetch, buildQuery, CATALOG_API_BASE_URL } from './catalog-http';

export const PRODUCTS_API_BASE_URL = CATALOG_API_BASE_URL;

export interface ProductCategory {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  parentId?: string | null;
  description?: string | null;
  sortOrder?: number | null;
  isActive: boolean;
}

/** Categoría con hijos anidados, tal como la devuelve `GET /categories/tree`. */
export interface Category extends ProductCategory {
  parent?: ProductCategory | null;
  children?: ProductCategory[];
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
  sku?: string | null;
  stock: number;
  reservedStock: number;
  minStock: number;
  sortOrder?: number;
  isActive: boolean;
  category?: ProductCategory;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
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
  sortOrder?: number;
  isActive?: boolean;
}

export type StockOperation = 'set' | 'add' | 'subtract';

export interface AdjustStockInput {
  operation: StockOperation;
  quantity: number;
  notes?: string;
}

export interface ProductListFilters {
  categoryId?: string;
  search?: string;
  includeInactive?: boolean;
}

export interface PaginationFilters {
  page?: number;
  limit?: number;
  includeInactive?: boolean;
}

// ─── Categorías ────────────────────────────────────────────────────────────

export const categoriesApi = {
  /** Categorías activas de una tienda, ordenadas por sortOrder/nombre. */
  getAll: (storeId: string, token?: string | null) =>
    catalogFetch<ProductCategory[]>(`/categories${buildQuery({ storeId })}`, token),

  /** Árbol de categorías (raíces con `children[]`). */
  getTree: (storeId: string, token?: string | null) =>
    catalogFetch<Category[]>(`/categories/tree${buildQuery({ storeId })}`, token),

  getById: (id: string, token?: string | null) =>
    catalogFetch<Category>(`/categories/${id}`, token),

  create: (input: CreateCategoryInput, token?: string | null) =>
    catalogFetch<ProductCategory>('/categories', token, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  update: (id: string, input: Partial<CreateCategoryInput>, token?: string | null) =>
    catalogFetch<ProductCategory>(`/categories/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  /** 204 al eliminar. Si tiene subcategorías o productos activos, el backend responde 409
   * con un mensaje claro — se propaga sin modificar para mostrarlo verbatim. */
  remove: (id: string, token?: string | null) =>
    catalogFetch<void>(`/categories/${id}`, token, { method: 'DELETE' }),
};

// ─── Productos ─────────────────────────────────────────────────────────────

export const productsApi = {
  /**
   * Productos de una tienda. Filtra por categoría (`categoryId`) o por
   * nombre (`search`); si ambos llegan, el backend prioriza la búsqueda por nombre.
   */
  getAll: (storeId: string, params: ProductListFilters = {}, token?: string | null) =>
    catalogFetch<Product[]>(
      `/products${buildQuery({ storeId, ...params })}`,
      token,
    ),

  getByStorePaginated: (
    storeId: string,
    params: PaginationFilters = {},
    token?: string | null,
  ) =>
    catalogFetch<PaginatedResult<Product>>(
      `/products/store/${storeId}${buildQuery({ ...params })}`,
      token,
    ),

  getLowStock: (storeId: string, token?: string | null) =>
    catalogFetch<Product[]>(`/products/store/${storeId}/low-stock`, token),

  getByCategoryPaginated: (
    storeId: string,
    categoryId: string,
    params: PaginationFilters = {},
    token?: string | null,
  ) =>
    catalogFetch<PaginatedResult<Product>>(
      `/products/store/${storeId}/category/${categoryId}${buildQuery({ ...params })}`,
      token,
    ),

  getById: (id: string, token?: string | null) =>
    catalogFetch<Product>(`/products/${id}`, token),

  create: (input: CreateProductInput, token?: string | null) =>
    catalogFetch<Product>('/products', token, { method: 'POST', body: JSON.stringify(input) }),

  update: (id: string, input: Partial<CreateProductInput>, token?: string | null) =>
    catalogFetch<Product>(`/products/${id}`, token, { method: 'PATCH', body: JSON.stringify(input) }),

  activate: (id: string, token?: string | null) =>
    catalogFetch<Product>(`/products/${id}/activate`, token, { method: 'PATCH' }),

  deactivate: (id: string, token?: string | null) =>
    catalogFetch<Product>(`/products/${id}/deactivate`, token, { method: 'PATCH' }),

  adjustStock: (id: string, payload: AdjustStockInput, token?: string | null) =>
    catalogFetch<Product>(`/products/${id}/stock`, token, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  remove: (id: string, token?: string | null) =>
    catalogFetch<void>(`/products/${id}`, token, { method: 'DELETE' }),

  // ─── Alias retrocompatibles (call sites previos a la división de módulos) ──
  getCategories: (storeId: string, token?: string | null) => categoriesApi.getAll(storeId, token),

  createCategory: (input: CreateCategoryInput, token?: string | null) =>
    categoriesApi.create(input, token),

  /** Alias retrocompatible de `getAll` (nombre previo). */
  getProducts: (storeId: string, params: ProductListFilters = {}, token?: string | null) =>
    productsApi.getAll(storeId, params, token),

  /** Alias retrocompatible de `create` (nombre previo). */
  createProduct: (input: CreateProductInput, token?: string | null) =>
    productsApi.create(input, token),

  /** Alias retrocompatible de `update` (nombre previo). */
  updateProduct: (id: string, input: Partial<CreateProductInput>, token?: string | null) =>
    productsApi.update(id, input, token),

  /** Alias retrocompatible de `activate`/`deactivate` combinados. */
  setActive: (id: string, active: boolean, token?: string | null) =>
    active ? productsApi.activate(id, token) : productsApi.deactivate(id, token),

  /** Alias retrocompatible de `remove` (nombre previo). */
  deleteProduct: (id: string, token?: string | null) => productsApi.remove(id, token),
};
