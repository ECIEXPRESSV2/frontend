// Cliente del reporting-service (centro de monitoreo). Va SIEMPRE por el gateway:
// reporting-service no se expone directo al host, y es el gateway quien valida el
// token Firebase e inyecta x-user-role (el RolesGuard del backend exige ADMIN/ANALYST).
//
// Convención del proyecto (ver .env): base = gateway + su prefijo; el gateway quita
// el prefijo /reporting antes de reenviar, así que los paths de aquí son los bare
// downstream ('/kpis/overview').

import { getFirebaseIdToken } from '../lib/auth-token';

const REPORTING_URL = (
  import.meta.env.VITE_REPORTING_API_URL || 'http://localhost:3000/reporting'
).replace(/\/$/, '');

// ─── Tipos del overview (espejo de OverviewResponse en el backend) ────────────

export interface OverviewTotals {
  totalRequests: number;
  failedRequests: number;
  errorRatePct: number;
  p50Ms: number;
  p95Ms: number;
}

export interface ServiceRow {
  service: string;
  requests: number;
  failed: number;
  errorRatePct: number;
  p95Ms: number;
}

export interface ExceptionRow {
  service: string;
  type: string;
  count: number;
  sampleMessage: string;
}

export interface OverviewResponse {
  rangeHours: number;
  generatedAt: string;
  /** false cuando el backend corre sin APPLICATIONINSIGHTS_RESOURCE_ID (local/tests). */
  enabled: boolean;
  totals: OverviewTotals | null;
  services: ServiceRow[] | null;
  topExceptions: ExceptionRow[] | null;
}

export class ReportingError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function reportingFetch<T>(path: string): Promise<T> {
  const token = await getFirebaseIdToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const sessionId = sessionStorage.getItem('sessionId');
  if (sessionId) headers['X-Session-Id'] = sessionId;

  const res = await fetch(`${REPORTING_URL}${path}`, { headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const raw = (body as { message?: unknown }).message;
    const message = Array.isArray(raw)
      ? raw.join(', ')
      : typeof raw === 'string'
        ? raw
        : `Error ${res.status}`;
    throw new ReportingError(res.status, message);
  }

  return res.json();
}

/** Overview del centro de monitoreo. `hours` acota la ventana (1–720, default 24). */
export const getMonitoringOverview = (hours = 24) =>
  reportingFetch<OverviewResponse>(`/kpis/overview?hours=${hours}`);
