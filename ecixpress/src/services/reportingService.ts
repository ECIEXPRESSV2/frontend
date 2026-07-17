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
    Accept: 'application/json',
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

// ─── Salud de microservicios ──────────────────────────────────────────────────

export interface ServiceHealth {
  service: string;
  label: string;
  up: boolean;
  /** Tiempo de respuesta del ping a /health (ms). null si está caído. */
  responseMs: number | null;
  statusCode?: number;
  checkedAt: string;
}

/** Estado (activo/caído) + tiempo de respuesta de cada microservicio. Para polling. */
export const getServicesHealth = () => reportingFetch<ServiceHealth[]>('/kpis/health');

// ─── Latencia (App Insights; vacío en local) ──────────────────────────────────

export interface LatencyPoint {
  timestamp: string;
  service: string;
  avgMs: number;
  p95Ms: number;
  p99Ms: number;
  requests: number;
}

export interface LatencyResponse {
  minutes: number;
  generatedAt: string;
  /** false en local (sin App Insights): points viene vacío. */
  enabled: boolean;
  points: LatencyPoint[];
}

/** Serie de latencia promedio por minuto y servicio (últimos `minutes`). */
export const getLatency = (minutes = 10) =>
  reportingFetch<LatencyResponse>(`/kpis/latency?minutes=${minutes}`);

// ─── Flujo de eventos entre microservicios (App Insights; vacío en local) ──────

export interface EventCountRow { service: string; routingKey: string; eventos: number }
export interface EventFailRow { service: string; tipo: string; fallos: number; muestra: string }

export interface EventFlowResponse {
  minutes: number;
  generatedAt: string;
  enabled: boolean;
  published: EventCountRow[];
  received: EventCountRow[];
  failed: EventFailRow[];
}

/** Eventos generados/recibidos/fallidos por servicio (últimos `minutes`). */
export const getEventFlow = (minutes = 60) =>
  reportingFetch<EventFlowResponse>(`/kpis/events?minutes=${minutes}`);

// ─── Deploy (GitHub Actions público + revisión Container Apps) ─────────────────

export interface GithubDeploy {
  available: boolean;
  repo?: string;
  workflow?: string;
  status?: string;
  conclusion?: string | null;
  branch?: string;
  event?: string;
  commitMessage?: string;
  actor?: string;
  currentStage?: string | null;
  createdAt?: string;
  updatedAt?: string;
  url?: string;
  note?: string;
}

export interface RevisionInfo {
  available: boolean;
  app?: string;
  latestRevision?: string;
  activeRevision?: string;
  replicas?: number;
  runningState?: string;
  createdTime?: string;
  note?: string;
}

export interface ServiceDeploy {
  service: string;
  github: GithubDeploy;
  revision: RevisionInfo;
}

/** Estado de deploy de un microservicio (workflow de GitHub + revisión de Container Apps). */
export const getServiceDeploy = (service: string) =>
  reportingFetch<ServiceDeploy>(`/kpis/deploy/${service}`);

// ─── Logs "en vivo" (consola) ──────────────────────────────────────────────────

export type ServiceLogSource = 'app' | 'waf' | 'access';

export interface ServiceLogLine {
  timestamp: string;
  source: ServiceLogSource;
  stream?: string;
  text: string;
  clientIp?: string;
  ruleId?: string;
  ruleGroup?: string;
  action?: string;
  requestUri?: string;
}

export interface ServiceLogsResult {
  service: string;
  /** false cuando el backend corre sin LOG_ANALYTICS_WORKSPACE_ID (local/tests). */
  enabled: boolean;
  lines: ServiceLogLine[];
}

/**
 * Logs de un microservicio. Sin `since`, trae los últimos `minutes` (primera carga); con
 * `since` (timestamp ISO de la última línea ya vista), trae solo las líneas nuevas -- así
 * el frontend puede hacer polling para simular una consola "en vivo" sin duplicar el
 * historial. Para `gateway`, el backend agrega también el log de WAF/acceso del Application
 * Gateway (`source: 'waf' | 'access'`).
 */
export const getServiceLogs = (service: string, opts: { minutes?: number; since?: string } = {}) => {
  const params = new URLSearchParams();
  if (opts.minutes != null) params.set('minutes', String(opts.minutes));
  if (opts.since) params.set('since', opts.since);
  const qs = params.toString();
  return reportingFetch<ServiceLogsResult>(`/kpis/logs/${service}${qs ? `?${qs}` : ''}`);
};

// ─── Backlog del Service Bus (Azure Monitor metrics; solo desplegado) ──────────

export interface ServiceBusEntity { entity: string; active: number; deadLettered: number }
export interface ServiceBusBacklog {
  available: boolean;
  generatedAt: string;
  entities: ServiceBusEntity[];
  note?: string;
}

/** Mensajes activos y dead-letter por entidad/suscripción del Service Bus. */
export const getServiceBusBacklog = () =>
  reportingFetch<ServiceBusBacklog>('/kpis/servicebus');

// ─── Consultas rápidas (catálogo extensible) ──────────────────────────────────

export interface QuickParamMeta {
  name: string;
  type: 'uuid' | 'int' | 'bigint';
  required: boolean;
  label: string;
  default: string | number | null;
  /** 'store' => el dashboard muestra el selector de tienda (modal) en vez de un input. */
  widget: 'store' | null;
}

export interface QuickQueryMeta {
  key: string;
  label: string;
  description: string;
  db: string;
  /** false si falta la connection string de esa BD en reporting. */
  available: boolean;
  params: QuickParamMeta[];
}

export interface QuickQueryResult {
  key: string;
  label: string;
  columns: string[];
  rows: Record<string, unknown>[];
}

/** Catálogo de consultas rápidas disponibles (con sus parámetros). */
export const getQuickCatalog = () => reportingFetch<QuickQueryMeta[]>('/kpis/quick');

/** Ejecuta una consulta rápida del catálogo con sus parámetros. */
export const runQuickQuery = (key: string, params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v != null),
  ).toString();
  return reportingFetch<QuickQueryResult>(`/kpis/quick/${key}${qs ? `?${qs}` : ''}`);
};
