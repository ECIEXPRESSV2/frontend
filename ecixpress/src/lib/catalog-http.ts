/**
 * Helper HTTP compartido para los clientes de products-service
 * (`products-api.ts`, `promotions-api.ts`, `inventory-api.ts`). Centraliza la
 * base URL, el header de autenticación y el desempaquetado de errores del
 * backend (NestJS), que puede devolver `message` como string o string[].
 */

export const CATALOG_API_BASE_URL =
  (import.meta.env.VITE_PRODUCTS_SERVICE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/**
 * Construye un query string a partir de un objeto, omitiendo claves
 * `undefined` y codificando valores con `encodeURIComponent`.
 */
export function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '';
  const q = new URLSearchParams();
  for (const [key, value] of entries) {
    q.set(key, String(value));
  }
  return `?${q.toString()}`;
}

/** Cliente fetch para products-service: arma headers, base URL y errores. */
export async function catalogFetch<T>(
  path: string,
  token?: string | null,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${CATALOG_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
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

  if (response.status === 204) return undefined as T;
  return (await response.json()) as Promise<T>;
}
