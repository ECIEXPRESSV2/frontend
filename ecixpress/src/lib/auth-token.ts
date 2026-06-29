import { auth } from './firebase';

/**
 * ID token de Firebase del usuario actual (o `null` si no hay sesión).
 *
 * Lo necesitan los clientes de products / financial / notifications / fulfillment
 * cuando el tráfico pasa por el API Gateway: el gateway valida el token, enriquece
 * la identidad y descarta cualquier `x-user-id` que mande el cliente (anti-spoofing).
 * Sin `Authorization: Bearer`, esos servicios responden 401 a través del gateway.
 *
 * En modo directo (sin gateway) estos servicios igual ignoran el Bearer y usan el
 * `x-user-id`, así que adjuntarlo siempre es seguro en ambos modos.
 */
export async function getFirebaseIdToken(): Promise<string | null> {
  try {
    return (await auth.currentUser?.getIdToken()) ?? null;
  } catch {
    return null;
  }
}
