/**
 * Helper HTTP compartido para los clientes de products-service
 * (`products-api.ts`, `promotions-api.ts`, `inventory-api.ts`). Centraliza la
 * base URL, el header de autenticación y el desempaquetado de errores del
 * backend (NestJS), que puede devolver `message` como string o string[].
 */

import { getFirebaseIdToken } from './auth-token';

export const CATALOG_API_BASE_URL =
  (import.meta.env.VITE_PRODUCTS_SERVICE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/**
 * Identidad del usuario para products-service. products NO valida el token de Firebase:
 * confía en los headers `x-user-id` / `x-user-role` (en producción los inyecta el API
 * Gateway; en desarrollo los enviamos directo). `AuthContext` setea esto al cargar el
 * perfil y lo limpia al cerrar sesión.
 */
let catalogUserId: string | null = null;
let catalogUserRole: string | null = null;

export function setCatalogIdentity(
  identity: { userId: string; role?: string | null } | null,
): void {
  catalogUserId = identity?.userId ?? null;
  catalogUserRole = identity?.role ?? null;
}

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

/**
 * Cliente fetch para products-service: arma headers, base URL y errores.
 * El 2º parámetro (antes el token de Firebase) ya no se usa: products autentica por
 * `x-user-id` / `x-user-role`, que se toman de la identidad compartida (`setCatalogIdentity`).
 * Se conserva en la firma por compatibilidad con los call sites existentes.
 */
export async function catalogFetch<T>(
  path: string,
  _auth?: string | null,
  init?: RequestInit,
): Promise<T> {
  // Bearer de Firebase: requerido al pasar por el API Gateway (valida y enriquece;
  // descarta el x-user-id del cliente). En modo directo products lo ignora.
  const token = await getFirebaseIdToken();
  const response = await fetch(`${CATALOG_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(catalogUserId ? { 'x-user-id': catalogUserId } : {}),
      ...(catalogUserRole ? { 'x-user-role': catalogUserRole } : {}),
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
