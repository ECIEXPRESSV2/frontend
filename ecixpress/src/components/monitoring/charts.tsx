import React from 'react';
import { errorStatus, SERIES_BLUE, STATUS, STATUS_LABEL, type StatusRole } from './status';

// ─────────────────────────────────────────────────────────────────────────────
// Piezas visuales del centro de monitoreo. La app es light-only (aesthetic ámbar),
// así que las marcas de datos NO usan amarillo (contraste < 3:1 sobre blanco): la
// magnitud usa el azul secuencial validado y la tasa de error usa la paleta de
// estado (good/warning/serious/critical), siempre con etiqueta directa (pocas
// categorías → etiquetar cada barra es lo correcto, no un número por punto).
// La clasificación y la paleta viven en ./status para no romper react-refresh.
// ─────────────────────────────────────────────────────────────────────────────

// ─── KPI tile (número héroe, sin gráfica) ─────────────────────────────────────

interface KpiTileProps {
  label: string;
  value: string;
  sub?: string;
  /** Acento del estado; por defecto neutro. */
  status?: StatusRole;
  icon?: React.ReactNode;
}

export const KpiTile: React.FC<KpiTileProps> = ({ label, value, sub, status, icon }) => (
  <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-lg shadow-gray-200/50 backdrop-blur-xl">
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      {icon && <span className="text-gray-400">{icon}</span>}
    </div>
    <p
      className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-gray-900"
      style={status ? { color: STATUS[status] } : undefined}
    >
      {value}
    </p>
    {sub && <p className="mt-1 text-xs font-medium text-gray-500">{sub}</p>}
  </div>
);

// ─── Barras horizontales de magnitud (peticiones por servicio) ────────────────

export interface BarDatum {
  label: string;
  value: number;
  /** Texto extra en el tooltip nativo (p. ej. p95). */
  hint?: string;
}

interface HBarChartProps {
  data: BarDatum[];
  /** Formatea el valor mostrado al final de la barra. */
  format?: (v: number) => string;
  emptyLabel?: string;
}

export const HBarChart: React.FC<HBarChartProps> = ({
  data,
  format = (v) => v.toLocaleString('es-CO'),
  emptyLabel = 'Sin datos en el rango',
}) => {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-gray-400">{emptyLabel}</p>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="flex flex-col gap-3">
      {data.map((d) => {
        const pct = Math.max((d.value / max) * 100, d.value > 0 ? 2 : 0);
        return (
          <li key={d.label} className="grid grid-cols-1 gap-1 sm:grid-cols-[9rem_1fr] sm:items-center sm:gap-3">
            <span className="truncate text-sm font-semibold text-gray-700" title={d.label}>
              {d.label}
            </span>
            <div className="flex items-center gap-2">
              <div className="h-4 flex-1 overflow-hidden rounded-md bg-gray-100">
                <div
                  className="h-full rounded-md transition-[width] duration-500 ease-out"
                  style={{ width: `${pct}%`, backgroundColor: SERIES_BLUE }}
                  title={d.hint ? `${d.label}: ${format(d.value)} · ${d.hint}` : `${d.label}: ${format(d.value)}`}
                />
              </div>
              <span className="w-16 shrink-0 text-right text-sm font-bold tabular-nums text-gray-800">
                {format(d.value)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

// ─── Barras de tasa de error por servicio (coloreadas por estado) ─────────────

export interface ErrorDatum {
  label: string;
  pct: number;
  requests: number;
  failed: number;
}

export const ErrorRateBars: React.FC<{ data: ErrorDatum[] }> = ({ data }) => {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-gray-400">Sin peticiones en el rango</p>;
  }
  // Escala hasta el máximo observado (mín. 5%) para que las diferencias se vean.
  const max = Math.max(...data.map((d) => d.pct), 5);
  return (
    <ul className="flex flex-col gap-3">
      {data.map((d) => {
        const status = errorStatus(d.pct);
        const color = STATUS[status];
        const pct = Math.max((d.pct / max) * 100, d.pct > 0 ? 2 : 0);
        return (
          <li key={d.label} className="grid grid-cols-1 gap-1 sm:grid-cols-[9rem_1fr] sm:items-center sm:gap-3">
            <span className="truncate text-sm font-semibold text-gray-700" title={d.label}>
              {d.label}
            </span>
            <div className="flex items-center gap-2">
              <div className="h-4 flex-1 overflow-hidden rounded-md bg-gray-100">
                <div
                  className="h-full rounded-md transition-[width] duration-500 ease-out"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                  title={`${d.label}: ${d.pct.toFixed(2)}% (${d.failed}/${d.requests}) · ${STATUS_LABEL[status]}`}
                />
              </div>
              <span
                className="flex w-24 shrink-0 items-center justify-end gap-1 text-right text-sm font-bold tabular-nums"
                style={{ color }}
              >
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
                {d.pct.toFixed(1)}%
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

// ─── Leyenda de estado (para no depender solo del color) ──────────────────────

export const StatusLegend: React.FC = () => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-gray-500">
    {(Object.keys(STATUS) as Array<keyof typeof STATUS>).map((k) => (
      <span key={k} className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS[k] }} aria-hidden />
        {STATUS_LABEL[k]}
      </span>
    ))}
  </div>
);
