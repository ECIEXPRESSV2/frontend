import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Activity, RefreshCw, Play, Store, Gauge, Loader2, X, Radio, Send, Inbox, AlertTriangle, Layers, GitBranch, ExternalLink } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import { CardSkeleton } from '../../components/common/LoadingSkeleton';
import TrianglePattern from '../../components/home/TrianglePattern';
import { formatCOP } from '../../lib/format';
import type { Store as StoreT } from '../../services/storeService';
import {
  getServicesHealth,
  getQuickCatalog,
  runQuickQuery,
  getLatency,
  getEventFlow,
  getServiceDeploy,
  getServiceBusBacklog,
  ReportingError,
  type ServiceHealth,
  type QuickQueryMeta,
  type QuickQueryResult,
  type LatencyResponse,
  type LatencyPoint,
  type EventFlowResponse,
  type ServiceDeploy,
  type ServiceBusBacklog,
} from '../../services/reportingService';

const StoreMapModal = lazy(() => import('../../components/store/StoreMapModal'));

const HEALTH_POLL_MS = 5000;
const LATENCY_POLL_MS = 15000;
const POPUP_RANGES = [10, 30, 60] as const;

// La salud de microservicios identifica cada servicio con una clave corta (identity, orders...),
// pero Application Insights registra su telemetría bajo el AppRoleName real del proceso Node
// (identity-service, orders-service...). "gateway" es la única excepción sin sufijo — por eso
// era el único que, por coincidencia, mostraba datos de latencia/tráfico.
const APP_ROLE_NAME: Record<string, string> = {
  gateway: 'gateway',
  identity: 'identity-service',
  products: 'products-service',
  orders: 'orders-service',
  financial: 'financial-service',
  fulfillment: 'fulfillment-service',
  notifications: 'notifications-service',
  reporting: 'reporting-service',
};

const isMoneyCol = (c: string) => /monto/i.test(c) || c === 'total_recargas' || c === 'total_charged';

const fmtCell = (col: string, val: unknown): string => {
  if (val === null || val === undefined || val === '') return '—';
  const isNumeric = typeof val === 'number' || (typeof val === 'string' && /^-?\d+$/.test(val));
  if (isNumeric) {
    const n = Number(val);
    return isMoneyCol(col) ? formatCOP(n) : n.toLocaleString('es-CO');
  }
  return String(val);
};

const errMsg = (err: unknown): string =>
  err instanceof ReportingError
    ? err.status === 403
      ? 'No tienes acceso al centro de monitoreo (se requiere ADMIN o ANALYST).'
      : err.message
    : err instanceof Error
      ? err.message
      : 'Error en el centro de monitoreo';

const MonitoringPage: React.FC = () => {
  const [health, setHealth] = useState<ServiceHealth[] | null>(null);
  const [healthAt, setHealthAt] = useState<Date | null>(null);
  const [latency, setLatency] = useState<LatencyResponse | null>(null);
  const [events, setEvents] = useState<EventFlowResponse | null>(null);
  const [bus, setBus] = useState<ServiceBusBacklog | null>(null);

  const [catalog, setCatalog] = useState<QuickQueryMeta[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [params, setParams] = useState<Record<string, string>>({});
  const [storeSel, setStoreSel] = useState<Record<string, { id: string; name: string }>>({});
  const [quickResult, setQuickResult] = useState<QuickQueryResult | null>(null);
  const [running, setRunning] = useState(false);

  // Modal de selección de tienda: guarda el nombre del parámetro que se está eligiendo.
  const [storePickerParam, setStorePickerParam] = useState<string | null>(null);
  // Popup de latencia histórica: servicio seleccionado.
  const [popupService, setPopupService] = useState<{ key: string; label: string } | null>(null);

  const [bootError, setBootError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const pollHealth = useCallback(async () => {
    try {
      const h = await getServicesHealth();
      setHealth(h);
      setHealthAt(new Date());
    } catch { /* mantiene último estado */ }
  }, []);

  const pollLatency = useCallback(async () => {
    try { setLatency(await getLatency(10)); } catch { /* App Insights puede no estar */ }
  }, []);

  const loadEvents = useCallback(async () => {
    try { setEvents(await getEventFlow(60)); } catch { /* App Insights puede no estar */ }
  }, []);

  const loadBus = useCallback(async () => {
    try { setBus(await getServiceBusBacklog()); } catch { /* Azure metrics puede no estar */ }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setBootError(null);
      try {
        const cat = await getQuickCatalog();
        setCatalog(cat);
        setSelectedKey((prev) => prev || cat[0]?.key || '');
        await Promise.all([pollHealth(), pollLatency(), loadEvents(), loadBus()]);
      } catch (err) {
        setBootError(errMsg(err));
        toast.error(errMsg(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [pollHealth, pollLatency]);

  useEffect(() => {
    const h = setInterval(pollHealth, HEALTH_POLL_MS);
    const l = setInterval(pollLatency, LATENCY_POLL_MS);
    return () => { clearInterval(h); clearInterval(l); };
  }, [pollHealth, pollLatency]);

  // Punto de latencia del minuto más reciente por servicio (avg + rpm para la tarjeta).
  const latestByService = useMemo(() => {
    const map: Record<string, LatencyPoint> = {};
    for (const p of latency?.points ?? []) map[p.service] = p; // points vienen ordenados asc
    return map;
  }, [latency]);
  const latencyEnabled = latency?.enabled ?? false;

  const selectedQuery = useMemo(
    () => catalog.find((q) => q.key === selectedKey) ?? null,
    [catalog, selectedKey],
  );

  useEffect(() => {
    if (!selectedQuery) return;
    const next: Record<string, string> = {};
    for (const p of selectedQuery.params) next[p.name] = p.default != null ? String(p.default) : '';
    setParams(next);
    setStoreSel({});
    setQuickResult(null);
  }, [selectedQuery]);

  const runSelected = async () => {
    if (!selectedQuery) return;
    setRunning(true);
    try { setQuickResult(await runQuickQuery(selectedQuery.key, params)); }
    catch (err) { toast.error(errMsg(err)); }
    finally { setRunning(false); }
  };

  const pickStore = (store: StoreT) => {
    if (!storePickerParam) return;
    setParams((prev) => ({ ...prev, [storePickerParam]: store.id }));
    setStoreSel((prev) => ({ ...prev, [storePickerParam]: { id: store.id, name: store.name } }));
    setStorePickerParam(null);
  };
  const clearStore = (name: string) => {
    setParams((prev) => ({ ...prev, [name]: '' }));
    setStoreSel((prev) => { const n = { ...prev }; delete n[name]; return n; });
  };

  const upCount = health?.filter((s) => s.up).length ?? 0;
  const total = health?.length ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <Sidebar activeItem="admin-monitoring" />
      <main className="app-shift px-4 pb-28 pt-20 md:px-8 md:pb-8 lg:px-10">
        <div className="relative mx-auto max-w-7xl space-y-6">
          <header className="theme-surface relative overflow-hidden rounded-[32px] border border-white/60 bg-[linear-gradient(140deg,rgb(var(--accent-rgb)/0.32)_0%,rgba(255,255,255,0.62)_42%,rgb(var(--accent-rgb)/0.14)_72%,rgb(var(--accent-rgb)/0.36)_100%)] backdrop-blur-2xl [box-shadow:0_28px_50px_-28px_rgb(var(--accent-rgb)/0.45)] p-5 md:p-6">
            <TrianglePattern className="absolute inset-0 pointer-events-none" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <nav className="mb-3 inline-flex items-center rounded-xl border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm backdrop-blur">
                  Monitoreo <span className="mx-2 text-gray-400">/</span>
                  <span className="text-gray-950">Centro de monitoreo</span>
                </nav>
                <h1 className="font-display text-3xl font-bold tracking-normal text-gray-900 md:text-4xl">Centro de monitoreo</h1>
                {total > 0 && (
                  <p className="mt-2 text-sm font-medium text-gray-600">
                    {upCount}/{total} servicios activos
                    {healthAt && ` · salud ${healthAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
                  </p>
                )}
              </div>
              <button
                onClick={() => { pollHealth(); pollLatency(); loadEvents(); loadBus(); }}
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-4 py-2 text-sm font-bold text-gray-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-gray-950"
              >
                <RefreshCw size={16} /> Actualizar
              </button>
            </div>
          </header>

          {bootError && !catalog.length ? (
            <div className="rounded-2xl border border-red-200 bg-red-50/80 p-6 text-sm font-semibold text-red-700">{bootError}</div>
          ) : loading && !health ? (
            <CardSkeleton rows={6} />
          ) : (
            <>
              {/* ── Salud de microservicios ── */}
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Activity size={18} className="text-amber-500" />
                  <h2 className="text-base font-bold text-gray-900">Salud de microservicios</h2>
                  <span className="text-xs font-medium text-gray-400">salud cada 5s · latencia (promedio/min) cada 15s · clic para ver histórico</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {(health ?? []).map((s) => {
                    const pt = latestByService[APP_ROLE_NAME[s.service] ?? s.service];
                    const ms = pt?.avgMs;
                    return (
                      <button
                        key={s.service}
                        onClick={() => setPopupService({ key: s.service, label: s.label })}
                        className="rounded-2xl border border-white/70 bg-white/85 p-4 text-left shadow-sm backdrop-blur-xl transition hover:border-amber-200 hover:shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900">{s.label}</span>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold ${s.up ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-red-50 text-red-700 ring-1 ring-red-200'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${s.up ? 'bg-green-500' : 'bg-red-500'}`} />
                            {s.up ? 'Activo' : 'Caído'}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
                          <Gauge size={14} className="text-gray-400" />
                          {ms != null
                            ? <><span className="font-semibold text-gray-800">{Math.round(ms).toLocaleString('es-CO')} ms</span><span className="text-xs text-gray-400">· {Math.round(pt?.requests ?? 0).toLocaleString('es-CO')} req/min</span></>
                            : <span className="text-xs text-gray-400">{latencyEnabled ? 'sin tráfico este minuto' : 'latencia/tráfico solo en desplegado'}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* ── Flujo de eventos ── */}
              <EventsSection data={events} />

              {/* ── Backlog del Service Bus ── */}
              <ServiceBusSection data={bus} />

              {/* ── Consultas rápidas ── */}
              <section className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-lg shadow-gray-200/50 backdrop-blur-xl">
                <div className="mb-4 flex items-center gap-2">
                  <Play size={18} className="text-amber-500" />
                  <h2 className="text-base font-bold text-gray-900">Consultas rápidas</h2>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-gray-500">Consulta</span>
                    <select
                      value={selectedKey}
                      onChange={(e) => setSelectedKey(e.target.value)}
                      className="min-w-[16rem] rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    >
                      {catalog.map((q) => (
                        <option key={q.key} value={q.key} disabled={!q.available}>
                          {q.label}{!q.available ? ' (no disponible)' : ''}
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedQuery?.params.map((p) => (
                    <div key={p.name} className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-gray-500">{p.label}{p.required ? ' *' : ''}</span>
                      {p.widget === 'store' ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setStorePickerParam(p.name)}
                            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:border-amber-300 hover:bg-amber-50"
                          >
                            <Store size={14} className="text-amber-500" />
                            {storeSel[p.name]?.name ?? 'Todas las tiendas'}
                          </button>
                          {storeSel[p.name] && (
                            <button onClick={() => clearStore(p.name)} title="Quitar filtro" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <input
                          value={params[p.name] ?? ''}
                          onChange={(e) => setParams((prev) => ({ ...prev, [p.name]: e.target.value }))}
                          placeholder={p.type === 'uuid' ? 'ID (UUID)' : 'número'}
                          className="w-56 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                        />
                      )}
                    </div>
                  ))}

                  <button
                    onClick={runSelected}
                    disabled={running || !selectedQuery?.available}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-50"
                  >
                    {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                    Ejecutar
                  </button>
                </div>

                {selectedQuery && <p className="mt-2 text-xs text-gray-400">{selectedQuery.description}</p>}

                <div className="mt-4">
                  <ResultTable result={quickResult} empty="Ejecuta la consulta para ver resultados." />
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      {/* Selector de tienda: reusa el modal de "nuevo pedido" en modo selección. */}
      {storePickerParam && (
        <Suspense fallback={null}>
          <StoreMapModal open onClose={() => setStorePickerParam(null)} onSelect={pickStore} />
        </Suspense>
      )}

      {/* Popup de latencia histórica del servicio. */}
      {popupService && (
        <LatencyPopup service={popupService} onClose={() => setPopupService(null)} />
      )}
    </div>
  );
};

/** Tabla genérica de una consulta rápida. */
const ResultTable: React.FC<{ result: QuickQueryResult | null; empty: string }> = ({ result, empty }) => {
  if (!result) return <p className="py-8 text-center text-sm text-gray-400">{empty}</p>;
  if (result.rows.length === 0) return <p className="py-8 text-center text-sm text-gray-400">Sin resultados.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-gray-500">
            {result.columns.map((c) => (
              <th key={c} className="px-3 py-2 font-semibold capitalize">{c.replace(/_/g, ' ')}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-yellow-50/30">
              {result.columns.map((c) => (
                <td key={c} className="px-3 py-2 tabular-nums text-gray-700">{fmtCell(c, row[c])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/** Flujo de eventos entre microservicios (generados / recibidos / fallidos). */
const EventsSection: React.FC<{ data: EventFlowResponse | null }> = ({ data }) => {
  const isEmpty = !data || (data.published.length === 0 && data.received.length === 0 && data.failed.length === 0);
  return (
    <section className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-lg shadow-gray-200/50 backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2">
        <Radio size={18} className="text-amber-500" />
        <h2 className="text-base font-bold text-gray-900">Flujo de eventos</h2>
        <span className="text-xs font-medium text-gray-400">últimos {data?.minutes ?? 60} min</span>
      </div>
      {isEmpty ? (
        <p className="py-6 text-center text-sm text-gray-400">
          {data && !data.enabled
            ? 'El flujo de eventos viene de App Insights (solo en el entorno desplegado).'
            : 'Sin eventos en la ventana.'}
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <EventCountPanel title="Generados" icon={<Send size={14} className="text-green-500" />} rows={data.published} />
          <EventCountPanel title="Recibidos" icon={<Inbox size={14} className="text-blue-500" />} rows={data.received} />
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
              <AlertTriangle size={14} className="text-red-500" /> Fallidos
            </div>
            {data.failed.length === 0 ? (
              <p className="py-4 text-center text-xs text-gray-400">Sin fallos</p>
            ) : (
              <div className="space-y-1.5">
                {data.failed.slice(0, 8).map((f, i) => (
                  <div key={i} className="rounded-lg bg-red-50/70 px-2.5 py-1.5 text-xs" title={f.muestra}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-700">{f.service}</span>
                      <span className="font-bold tabular-nums text-red-700">{f.fallos}</span>
                    </div>
                    <span className="text-gray-500">{f.tipo}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

const EventCountPanel: React.FC<{ title: string; icon: React.ReactNode; rows: { service: string; routingKey: string; eventos: number }[] }> = ({ title, icon, rows }) => (
  <div>
    <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">{icon} {title}</div>
    {rows.length === 0 ? (
      <p className="py-4 text-center text-xs text-gray-400">Sin eventos.</p>
    ) : (
      <div className="space-y-1">
        {rows.slice(0, 10).map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs">
            <span className="min-w-0 flex-1 truncate">
              <span className="font-mono text-gray-600">{r.routingKey}</span>
              <span className="ml-1 text-gray-400">· {r.service}</span>
            </span>
            <span className="font-bold tabular-nums text-gray-800">{r.eventos.toLocaleString('es-CO')}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

/** Backlog del Service Bus: mensajes activos y dead-letter por entidad. */
const ServiceBusSection: React.FC<{ data: ServiceBusBacklog | null }> = ({ data }) => (
  <section className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-lg shadow-gray-200/50 backdrop-blur-xl">
    <div className="mb-4 flex items-center gap-2">
      <Layers size={18} className="text-amber-500" />
      <h2 className="text-base font-bold text-gray-900">Service Bus · backlog</h2>
    </div>
    {!data || !data.available ? (
      <p className="py-6 text-center text-sm text-gray-400">
        {data?.note ?? 'Solo en el entorno desplegado (Azure Monitor metrics).'}
      </p>
    ) : data.entities.length === 0 ? (
      <p className="py-6 text-center text-sm text-gray-400">Sin mensajes en el bus</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-gray-500">
              <th className="px-3 py-2 font-semibold">Entidad / suscripción</th>
              <th className="px-3 py-2 text-right font-semibold">Activos</th>
              <th className="px-3 py-2 text-right font-semibold">Dead-letter</th>
            </tr>
          </thead>
          <tbody>
            {data.entities.map((e) => (
              <tr key={e.entity} className="border-b border-gray-50 hover:bg-yellow-50/30">
                <td className="px-3 py-2 font-mono text-xs text-gray-700">{e.entity}</td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-700">{e.active.toLocaleString('es-CO')}</td>
                <td className={`px-3 py-2 text-right font-bold tabular-nums ${e.deadLettered > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {e.deadLettered.toLocaleString('es-CO')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

/** Popup con la gráfica de latencia promedio histórica de un servicio + filtro de tiempo. */
type Metric = 'avgMs' | 'requests';
const METRICS: { key: Metric; label: string; unit: string }[] = [
  { key: 'avgMs', label: 'Promedio', unit: 'ms' },
  { key: 'requests', label: 'Peticiones', unit: '/min' },
];

const LatencyPopup: React.FC<{ service: { key: string; label: string }; onClose: () => void }> = ({ service, onClose }) => {
  const [minutes, setMinutes] = useState<number>(10);
  const [metric, setMetric] = useState<Metric>('avgMs');
  const [data, setData] = useState<LatencyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [deploy, setDeploy] = useState<ServiceDeploy | null>(null);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    getLatency(minutes)
      .then((res) => { if (!cancel) setData(res); })
      .catch(() => { if (!cancel) setData(null); })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [minutes]);

  useEffect(() => {
    let cancel = false;
    getServiceDeploy(service.key).then((d) => { if (!cancel) setDeploy(d); }).catch(() => {});
    return () => { cancel = true; };
  }, [service.key]);

  const series = useMemo(
    () => (data?.points ?? []).filter((p) => p.service === (APP_ROLE_NAME[service.key] ?? service.key))
      .map((p) => ({ t: new Date(p.timestamp).getTime(), avgMs: p.avgMs, requests: p.requests })),
    [data, service.key],
  );
  const meanOf = (k: Metric) => series.length ? Math.round(series.reduce((a, s) => a + s[k], 0) / series.length) : null;
  const chartPoints = series.map((s) => ({ t: s.t, y: s[metric] }));
  const peak = series.length ? Math.round(Math.max(...series.map((s) => s[metric]))) : null;
  const unit = METRICS.find((m) => m.key === metric)!.unit;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Latencia · {service.label}</h3>
            <p className="text-sm text-gray-500">Promedio por minuto, últimos {minutes} min.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-gray-200 p-1">
            {POPUP_RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setMinutes(r)}
                className={`rounded-lg px-3 py-1 text-sm font-semibold transition ${minutes === r ? 'bg-amber-500 text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {r} min
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-xl border border-gray-200 p-1">
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={`rounded-lg px-3 py-1 text-sm font-semibold transition ${metric === m.key ? 'bg-gray-800 text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-gray-400"><Loader2 className="animate-spin" size={22} /></div>
          ) : series.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-1 text-center text-sm text-gray-400">
              <span>Sin datos de latencia/tráfico.</span>
              {!data?.enabled && <span className="text-xs">Viene de App Insights (solo en el entorno desplegado).</span>}
            </div>
          ) : (
            <>
              <AreaChart points={chartPoints} unit={unit} />
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span className="text-gray-500">Promedio: <b className="text-gray-900">{meanOf('avgMs')} ms</b></span>
                <span className="text-gray-500">Peticiones/min: <b className="text-gray-900">{meanOf('requests')}</b></span>
                <span className="text-gray-500">Pico ({METRICS.find((m) => m.key === metric)!.label}): <b className="text-gray-900">{peak}{unit === 'ms' ? ' ms' : ''}</b></span>
              </div>
            </>
          )}
        </div>

        {/* Deploy: GitHub Actions + revisión de Container Apps */}
        <DeployBlock deploy={deploy} />
      </div>
    </div>
  );
};

/** Bloque de deploy del microservicio: workflow de GitHub Actions + revisión de Container Apps. */
const DeployBlock: React.FC<{ deploy: ServiceDeploy | null }> = ({ deploy }) => {
  if (!deploy) return null;
  const g = deploy.github;
  const r = deploy.revision;
  const runColor = g.conclusion === 'success' ? 'text-green-700 bg-green-50 ring-green-200'
    : g.conclusion === 'failure' ? 'text-red-700 bg-red-50 ring-red-200'
    : g.status === 'in_progress' || g.status === 'queued' ? 'text-amber-700 bg-amber-50 ring-amber-200'
    : 'text-gray-600 bg-gray-50 ring-gray-200';
  const runLabel = g.status === 'completed' ? (g.conclusion ?? 'completado')
    : g.status === 'in_progress' ? 'en progreso' : g.status ?? '—';
  return (
    <div className="mt-5 border-t border-gray-100 pt-4">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
        <GitBranch size={14} className="text-amber-500" /> Deploy
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {/* GitHub Actions */}
        <div className="rounded-xl bg-gray-50 p-3 text-xs">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-semibold text-gray-700">GitHub Actions</span>
            {g.available && g.status && (
              <span className={`rounded-full px-2 py-0.5 font-bold ring-1 ${runColor}`}>{runLabel}</span>
            )}
          </div>
          {!g.available ? (
            <p className="text-gray-400">{g.note ?? 'No disponible.'}</p>
          ) : (
            <div className="space-y-0.5 text-gray-500">
              <p className="truncate text-gray-700">{g.workflow ?? g.repo}</p>
              {g.status === 'in_progress' && g.currentStage && <p>Etapa: <b className="text-amber-700">{g.currentStage}</b></p>}
              {g.branch && <p>Rama: <span className="font-mono">{g.branch}</span> · {g.event}</p>}
              {g.commitMessage && <p className="truncate" title={g.commitMessage}>“{g.commitMessage}”</p>}
              {g.updatedAt && <p>{new Date(g.updatedAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}{g.actor ? ` · ${g.actor}` : ''}</p>}
              {g.url && <a href={g.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-amber-600 hover:underline">Ver run <ExternalLink size={11} /></a>}
            </div>
          )}
        </div>
        {/* Container Apps */}
        <div className="rounded-xl bg-gray-50 p-3 text-xs">
          <div className="mb-1 font-semibold text-gray-700">Container Apps</div>
          {!r.available ? (
            <p className="text-gray-400">{r.note ?? 'No disponible.'}</p>
          ) : (
            <div className="space-y-0.5 text-gray-500">
              <p>Revisión activa: <span className="font-mono text-gray-700">{r.activeRevision ?? '—'}</span></p>
              {r.latestRevision && r.latestRevision !== r.activeRevision && <p className="text-amber-700">Última: <span className="font-mono">{r.latestRevision}</span> (desplegando)</p>}
              <p>Réplicas: <b className="text-gray-700">{r.replicas ?? '—'}</b> · {r.runningState ?? '—'}</p>
              {r.createdTime && <p>Creada: {new Date(r.createdTime).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/** Gráfica de área SVG en amarillo (como la referencia). */
const AreaChart: React.FC<{ points: { t: number; y: number }[]; unit: string }> = ({ points, unit }) => {
  const W = 560, H = 160, P = 8;
  const xs = points.map((p) => p.t);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const rawMaxY = Math.max(...ys);
  const minY = 0, maxY = rawMaxY * 1.15 || 1;
  const sx = (x: number) => P + ((x - minX) / (maxX - minX || 1)) * (W - 2 * P);
  const sy = (y: number) => H - P - ((y - minY) / (maxY - minY || 1)) * (H - 2 * P);
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.t).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ');
  const area = `${line} L ${sx(maxX).toFixed(1)} ${H - P} L ${sx(minX).toFixed(1)} ${H - P} Z`;
  // Rótulos del eje Y: cada métrica autoescala a su propio máximo, así que la silueta puede
  // lucir parecida entre Promedio y Peticiones aunque los valores reales sean muy distintos.
  // Mostrar el techo y el piso deja ver el cambio real de escala al cambiar de tab.
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full" preserveAspectRatio="none" role="img" aria-label="Latencia promedio">
      <defs>
        <linearGradient id="latFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(245 185 66 / 0.45)" />
          <stop offset="100%" stopColor="rgb(245 185 66 / 0.03)" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="rgb(0 0 0 / 0.05)" strokeWidth={1} />
      ))}
      <path d={area} fill="url(#latFill)" />
      <path d={line} fill="none" stroke="rgb(234 165 43)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <text x={P + 4} y={P + 12} fontSize="11" fill="rgb(107 114 128)">{Math.round(rawMaxY).toLocaleString('es-CO')}{unit}</text>
      <text x={P + 4} y={H - P - 4} fontSize="11" fill="rgb(107 114 128)">0{unit}</text>
    </svg>
  );
};

export default MonitoringPage;
