// Paleta de estado y utilidades del centro de monitoreo. Vive fuera de charts.tsx
// para que ese archivo exporte SOLO componentes (regla react-refresh) y para
// compartir la clasificación de estado con la página.
//
// Paleta de estado fija (nunca tematizada). Ver dataviz/references/palette.md.

export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
} as const;

export type StatusRole = keyof typeof STATUS;

export const STATUS_LABEL: Record<StatusRole, string> = {
  good: 'Saludable',
  warning: 'Atención',
  serious: 'Elevado',
  critical: 'Crítico',
};

/** Hue secuencial por defecto para magnitud (azul validado). */
export const SERIES_BLUE = '#2a78d6';

/** Clasifica una tasa de error (%) en un rol de estado. */
export function errorStatus(pct: number): StatusRole {
  if (pct >= 15) return 'critical';
  if (pct >= 5) return 'serious';
  if (pct >= 1) return 'warning';
  return 'good';
}
