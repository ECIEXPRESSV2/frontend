/** Formatea un monto en centavos COP a una cadena legible ($1.500). */
export function formatCOP(centavos: number): string {
  const pesos = (centavos ?? 0) / 100;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(pesos);
}

/** Fecha/hora corta en español. */
export function formatDateTime(value?: string): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}
