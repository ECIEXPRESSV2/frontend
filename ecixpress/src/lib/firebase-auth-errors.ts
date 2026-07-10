export function isFirebasePopupCancelled(error: unknown): boolean {
  const maybeError = error as { code?: unknown; message?: unknown };
  const code = typeof maybeError.code === 'string' ? maybeError.code : '';
  const message = typeof maybeError.message === 'string' ? maybeError.message : '';

  return (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    message.includes('auth/popup-closed-by-user') ||
    message.includes('auth/cancelled-popup-request')
  );
}
