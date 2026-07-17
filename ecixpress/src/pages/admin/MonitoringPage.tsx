import React, { Suspense, lazy, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Activity, RefreshCw, Play, Store, Gauge, Loader2, X, Radio, Send, Inbox, AlertTriangle, GitBranch, ExternalLink, TrendingUp, Clock, Percent, Save, PiggyBank, ChevronLeft, ChevronRight, Terminal, Pause, ShieldAlert } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import { CardSkeleton } from '../../components/common/LoadingSkeleton';
import TrianglePattern from '../../components/home/TrianglePattern';
import { formatCOP } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';
import { getStores, type Store as StoreT } from '../../services/storeService';
import {
  getStoreEarnings,
  getStoreCommission,
  updateCommissionConfig,
  PEAK_DAY_CODES,
  getPeakDayLabel,
  type StoreEarnings,
  type StoreCommissionInfo,
  type UpdateCommissionConfigDto,
} from '../../services/financialService';
import {
  getServicesHealth,
  getQuickCatalog,
  runQuickQuery,
  getLatency,
  getEventFlow,
  getServiceDeploy,
  getServiceLogs,
  ReportingError,
  type ServiceHealth,
  type QuickQueryMeta,
  type QuickQueryResult,
  type LatencyResponse,
  type LatencyPoint,
  type EventFlowResponse,
  type ServiceDeploy,
  type ServiceLogLine,
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
  const { getToken, userProfile, isAdmin } = useAuth();
  const [health, setHealth] = useState<ServiceHealth[] | null>(null);
  const [healthAt, setHealthAt] = useState<Date | null>(null);
  const [latency, setLatency] = useState<LatencyResponse | null>(null);
  const [events, setEvents] = useState<EventFlowResponse | null>(null);

  // Ganancias por tienda: tarjeta por tienda (logo + nombre) coloreada por margen.
  const [stores, setStores] = useState<StoreT[]>([]);
  const [storeEarnings, setStoreEarnings] = useState<Record<string, StoreEarnings>>({});
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [earningsStore, setEarningsStore] = useState<StoreT | null>(null);
  const earningsScrollRef = useRef<HTMLDivElement>(null);
  const scrollEarnings = (dir: 1 | -1) => {
    earningsScrollRef.current?.scrollBy({ left: dir * 460, behavior: 'smooth' });
  };

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

  const loadStoreEarnings = useCallback(async () => {
    const uid = userProfile?.id;
    if (!uid) return;
    setEarningsLoading(true);
    try {
      const token = await getToken();
      const list = await getStores(token);
      setStores(list);
      const results = await Promise.all(
        list.map((s) => getStoreEarnings(s.id, uid).catch(() => null)),
      );
      const map: Record<string, StoreEarnings> = {};
      list.forEach((s, i) => {
        const r = results[i];
        if (r) map[s.id] = r;
      });
      setStoreEarnings(map);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setEarningsLoading(false);
    }
  }, [userProfile?.id, getToken]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setBootError(null);
      try {
        const cat = await getQuickCatalog();
        setCatalog(cat);
        setSelectedKey((prev) => prev || cat[0]?.key || '');
        await Promise.all([pollHealth(), pollLatency(), loadEvents()]);
      } catch (err) {
        setBootError(errMsg(err));
        toast.error(errMsg(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [pollHealth, pollLatency]);

  useEffect(() => { loadStoreEarnings(); }, [loadStoreEarnings]);

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
  // Serie completa (últimos 10 min) por servicio, para la mini-gráfica de peticiones de la tarjeta.
  const seriesByService = useMemo(() => {
    const map: Record<string, LatencyPoint[]> = {};
    for (const p of latency?.points ?? []) (map[p.service] ??= []).push(p);
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
                onClick={() => { pollHealth(); pollLatency(); loadEvents(); loadStoreEarnings(); }}
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
                    const roleName = APP_ROLE_NAME[s.service] ?? s.service;
                    const pt = latestByService[roleName];
                    const ms = pt?.avgMs;
                    const series = seriesByService[roleName] ?? [];
                    return (
                      <button
                        key={s.service}
                        onClick={() => setPopupService({ key: s.service, label: s.label })}
                        className="flex flex-col gap-3 rounded-2xl border border-white/70 bg-white/85 p-5 text-left shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:border-amber-300 hover:shadow-xl"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900">{s.label}</span>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold ${s.up ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-red-50 text-red-700 ring-1 ring-red-200'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${s.up ? 'bg-green-500' : 'bg-red-500'}`} />
                            {s.up ? 'Activo' : 'Caído'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                          <Gauge size={14} className="text-gray-400" />
                          {ms != null
                            ? <><span className="font-semibold text-gray-800">{Math.round(ms).toLocaleString('es-CO')} ms</span><span className="text-xs text-gray-400">· {Math.round(pt?.requests ?? 0).toLocaleString('es-CO')} req/min</span></>
                            : <span className="text-xs text-gray-400">{latencyEnabled ? 'sin tráfico este minuto' : 'latencia/tráfico solo en desplegado'}</span>}
                        </div>
                        <MiniSparkline values={series.map((p) => p.requests)} />
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* ── Flujo de eventos ── */}
              <EventsSection data={events} />

              {/* ── Ganancias por tienda ── */}
              <section className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-lg shadow-gray-200/50 backdrop-blur-xl">
                <div className="mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-amber-500" />
                  <h2 className="text-base font-bold text-gray-900">Ganancias por tienda</h2>
                  <span className="text-xs font-medium text-gray-400">margen del mes · clic para ver detalle</span>
                </div>
                {earningsLoading && stores.length === 0 ? (
                  <CardSkeleton rows={2} />
                ) : stores.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-400">Sin tiendas.</p>
                ) : (
                  <div className="relative">
                    <div
                      ref={earningsScrollRef}
                      className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory p-3 -m-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                      {stores.map((s) => (
                        <StoreEarningsCard
                          key={s.id}
                          store={s}
                          earnings={storeEarnings[s.id]}
                          onClick={() => setEarningsStore(s)}
                        />
                      ))}
                    </div>
                    {stores.length > 3 && (
                      <>
                        <button
                          type="button"
                          onClick={() => scrollEarnings(-1)}
                          aria-label="Anterior"
                          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-md hover:bg-gray-50 hover:text-gray-800"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => scrollEarnings(1)}
                          aria-label="Siguiente"
                          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-md hover:bg-gray-50 hover:text-gray-800"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </section>

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

      {/* Popup de ganancias/comisión/hora pico de una tienda. */}
      {earningsStore && (
        <StoreEarningsPopup
          store={earningsStore}
          earnings={storeEarnings[earningsStore.id]}
          canEdit={isAdmin()}
          userId={userProfile?.id ?? ''}
          onClose={() => setEarningsStore(null)}
          onSaved={loadStoreEarnings}
        />
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
  const [consoleOpen, setConsoleOpen] = useState(false);

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
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setConsoleOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-900 px-3 py-1.5 text-xs font-bold text-green-400 shadow-sm transition hover:bg-gray-800"
              title="Ver logs en vivo de este microservicio"
            >
              <Terminal size={14} /> Consola
            </button>
            <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X size={18} /></button>
          </div>
        </div>

        {consoleOpen && <ConsolePopup service={service} onClose={() => setConsoleOpen(false)} />}

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

const CONSOLE_POLL_MS = 3000;
const CONSOLE_INITIAL_MINUTES = 15;
const CONSOLE_MAX_LINES = 500;

const SOURCE_TAG: Record<ServiceLogLine['source'], { label: string; className: string }> = {
  app: { label: 'APP', className: 'text-sky-400' },
  waf: { label: 'WAF', className: 'text-red-400' },
  access: { label: 'APPGW', className: 'text-amber-400' },
};

/**
 * Consola simulada con los logs "en vivo" de un microservicio (registros de aplicación de
 * Container Apps). Para `gateway` también intercala el log de WAF/acceso del Application
 * Gateway (etiqueta `WAF`/`APPGW`, en rojo/ámbar), para ver de un vistazo qué IP se está
 * bloqueando y por qué regla, sin salir de la app ni ir al portal de Azure.
 *
 * No hay push real: hace polling cada 3s pidiendo solo lo nuevo (`since` = timestamp de la
 * última línea ya mostrada), para no repetir el historial ya traído.
 */
const ConsolePopup: React.FC<{ service: { key: string; label: string }; onClose: () => void }> = ({ service, onClose }) => {
  const [lines, setLines] = useState<ServiceLogLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const lastTimestampRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const appendLines = (incoming: ServiceLogLine[]) => {
      if (incoming.length === 0) return;
      lastTimestampRef.current = incoming[incoming.length - 1].timestamp;
      setLines((prev) => [...prev, ...incoming].slice(-CONSOLE_MAX_LINES));
    };

    const poll = async () => {
      if (pausedRef.current) return;
      try {
        const res = lastTimestampRef.current
          ? await getServiceLogs(service.key, { since: lastTimestampRef.current })
          : await getServiceLogs(service.key, { minutes: CONSOLE_INITIAL_MINUTES });
        if (!active) return;
        setEnabled(res.enabled);
        setError(null);
        appendLines(res.lines);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'No se pudieron cargar los logs');
      } finally {
        if (active) setLoading(false);
      }
    };

    void poll();
    timer = setInterval(() => void poll(), CONSOLE_POLL_MS);
    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service.key]);

  useEffect(() => {
    if (!paused) bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [lines, paused]);

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-gray-950 shadow-2xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-gray-900 px-4 py-3">
          <div className="flex items-center gap-2 text-gray-200">
            <Terminal size={16} className="text-green-400" />
            <span className="font-mono text-sm font-semibold">Consola · {service.label}</span>
            {service.key === 'gateway' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-300 ring-1 ring-red-500/30">
                <ShieldAlert size={10} /> incluye WAF/AppGw
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPaused((p) => !p)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${paused ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
            >
              <Pause size={12} /> {paused ? 'Reanudar' : 'Pausar'}
            </button>
            <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed">
          {loading ? (
            <div className="flex h-full items-center justify-center text-gray-500"><Loader2 className="animate-spin" size={20} /></div>
          ) : !enabled ? (
            <p className="text-gray-500">Sin Log Analytics configurado (solo disponible en el entorno desplegado).</p>
          ) : error ? (
            <p className="text-red-400">{error}</p>
          ) : lines.length === 0 ? (
            <p className="text-gray-500">Esperando actividad de {service.label}…</p>
          ) : (
            lines.map((line, i) => {
              const tag = SOURCE_TAG[line.source];
              const blocked = line.action === 'Blocked';
              return (
                <div key={i} className={`whitespace-pre-wrap break-all ${blocked ? 'bg-red-500/10' : ''}`}>
                  <span className="text-gray-600">{new Date(line.timestamp).toLocaleTimeString('es-CO', { hour12: false })}</span>{' '}
                  <span className={`font-bold ${tag.className}`}>[{tag.label}]</span>{' '}
                  <span className={blocked ? 'text-red-300' : 'text-gray-300'}>{line.text}</span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
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

/** Mini vista previa (sin ejes) de la serie de peticiones/min de los últimos 10 min, dentro
 *  de la tarjeta de salud de un microservicio. */
const MiniSparkline: React.FC<{ values: number[] }> = ({ values }) => {
  const gradientId = useId();
  if (values.length < 2) {
    return <div className="flex h-12 items-center justify-center text-[11px] text-gray-300">Sin datos suficientes</div>;
  }
  const W = 200, H = 48, P = 2;
  const maxY = Math.max(...values) * 1.15 || 1;
  const sx = (i: number) => P + (i / (values.length - 1)) * (W - 2 * P);
  const sy = (v: number) => H - P - (v / maxY) * (H - 2 * P);
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(' ');
  const area = `${line} L ${sx(values.length - 1).toFixed(1)} ${H - P} L ${sx(0).toFixed(1)} ${H - P} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-12 w-full" preserveAspectRatio="none" role="img" aria-label="Peticiones por minuto (últimos 10 min)">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(245 185 66 / 0.35)" />
          <stop offset="100%" stopColor="rgb(245 185 66 / 0.02)" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke="rgb(234 165 43)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
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

/** Margen del mes (neto/bruto). null si todavía no hay datos (fetch pendiente o falló);
 *  0 si la tienda simplemente no tuvo pedidos este mes (bruto = 0). */
const marginOf = (e: StoreEarnings | undefined): number | null => {
  if (!e) return null;
  if (e.totals.grossAmount === 0) return 0;
  return (e.totals.netAmount / e.totals.grossAmount) * 100;
};

type EarningsTone = 'neutral' | 'red' | 'orange' | 'green';

const toneOf = (margin: number | null): EarningsTone => {
  if (margin === null) return 'neutral';
  if (margin < 0) return 'red';
  if (margin < 10) return 'orange';
  return 'green';
};

const TONE_STYLES: Record<EarningsTone, { card: string; circle: string; icon: string; text: string }> = {
  neutral: { card: 'border-gray-200 bg-white hover:border-gray-300', circle: 'bg-gray-100', icon: 'text-gray-400', text: 'text-gray-400' },
  red:     { card: 'border-red-300 bg-red-50 hover:border-red-400', circle: 'bg-red-100', icon: 'text-red-500', text: 'text-red-600' },
  orange:  { card: 'border-orange-200 bg-orange-50/80 hover:border-orange-300', circle: 'bg-orange-100', icon: 'text-orange-500', text: 'text-orange-600' },
  green:   { card: 'border-green-300 bg-green-50 hover:border-green-400', circle: 'bg-green-100', icon: 'text-green-600', text: 'text-green-700' },
};

/** Tarjeta de tienda: logo, margen del mes (%) y alcancía, todo coloreado según el mismo
 *  tono — rojo si el margen es negativo, naranja pálido si es menor a 10%, verde si es 10%
 *  o más. Ancho fijo para vivir dentro del carrusel horizontal. */
const StoreEarningsCard: React.FC<{
  store: StoreT;
  earnings?: StoreEarnings;
  onClick: () => void;
}> = ({ store, earnings, onClick }) => {
  const margin = marginOf(earnings);
  const tone = TONE_STYLES[toneOf(margin)];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-52 flex-shrink-0 snap-start flex-col items-center gap-4 rounded-3xl border p-6 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:scale-[1.04] hover:shadow-xl ${tone.card}`}
    >
      <div className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full ${tone.circle}`}>
        {store.imageUrl ? (
          <img
            src={store.imageUrl}
            alt={store.name}
            className="h-full w-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <Store size={26} className={tone.icon} />
        )}
      </div>

      <div>
        <p className={`text-3xl font-black tabular-nums ${tone.text}`}>
          {margin === null ? '—' : `${margin.toFixed(1)}%`}
        </p>
        <p className="mt-1 text-xs font-semibold text-gray-400">Ganancia del mes</p>
      </div>

      <span className="line-clamp-2 text-sm font-bold text-gray-900">{store.name}</span>

      <div className={`flex h-12 w-12 items-center justify-center rounded-full ${tone.circle}`}>
        <PiggyBank size={20} className={tone.icon} />
      </div>
    </button>
  );
};

/** Quita los segundos de un 'HH:mm[:ss]' para poblar un <input type="time">. */
const toTimeInput = (v: string | null | undefined): string => (v ? v.slice(0, 5) : '');

/**
 * Detalle de una tienda: ingresos del mes, hora pico y comisión de plataforma. Un ADMIN puede
 * editar la comisión y la hora pico aquí mismo, con vista previa del neto proyectado antes de
 * guardar. Un ANALYST (canEdit=false) solo ve los valores vigentes.
 */
const StoreEarningsPopup: React.FC<{
  store: StoreT;
  earnings?: StoreEarnings;
  canEdit: boolean;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}> = ({ store, earnings, canEdit, userId, onClose, onSaved }) => {
  const [commission, setCommission] = useState<StoreCommissionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [platformFeePercent, setPlatformFeePercent] = useState('');
  const [peakFeePercent, setPeakFeePercent] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [days, setDays] = useState<string[]>([]);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    getStoreCommission(store.id, userId)
      .then((c) => {
        if (cancel) return;
        setCommission(c);
        setPlatformFeePercent(String(c.platformFeePercent ?? 0));
        setPeakFeePercent(String(c.peakFeePercent ?? 0));
        setStart(toTimeInput(c.peakHoursStart));
        setEnd(toTimeInput(c.peakHoursEnd));
        setDays(c.peakDays ?? []);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'No se pudo cargar la comisión'))
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [store.id, userId]);

  const toggleDay = (code: string) =>
    setDays((prev) => (prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code]));

  const grossAmount = earnings?.totals.grossAmount ?? 0;
  const currentNet = earnings?.totals.netAmount ?? 0;
  const previewFee = Number(platformFeePercent);
  const projectedNet = Number.isFinite(previewFee)
    ? Math.round(grossAmount * (1 - Math.min(100, Math.max(0, previewFee)) / 100))
    : currentNet;

  const save = async () => {
    const fee = Number(platformFeePercent);
    const peakFee = Number(peakFeePercent);
    if (!Number.isFinite(fee) || fee < 0 || fee > 100) {
      toast.error('La comisión de plataforma debe estar entre 0 y 100.');
      return;
    }
    if (!Number.isFinite(peakFee) || peakFee < 0 || peakFee > 100) {
      toast.error('El recargo de hora pico debe estar entre 0 y 100.');
      return;
    }
    if ((start && !end) || (!start && end)) {
      toast.error('Indica hora de inicio y fin de la franja pico.');
      return;
    }
    setSaving(true);
    try {
      const dto: UpdateCommissionConfigDto = {
        platformFeePercent: fee,
        peakFeePercent: peakFee,
        peakHoursStart: start || undefined,
        peakHoursEnd: end || undefined,
        peakDays: days,
      };
      await updateCommissionConfig(store.id, userId, dto);
      toast.success('Comisión y hora pico actualizadas.');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-gray-100 bg-gray-50">
              {store.imageUrl
                ? <img src={store.imageUrl} alt={store.name} className="h-full w-full object-cover" />
                : <Store size={18} className="text-gray-400" />}
            </div>
            <h3 className="text-lg font-bold text-gray-900">{store.name}</h3>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X size={18} /></button>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-gray-400"><Loader2 className="animate-spin" size={22} /></div>
        ) : (
          <div className="mt-4 space-y-5">
            {/* Ingresos del mes */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <TrendingUp size={15} className="text-amber-500" />
                <h4 className="text-sm font-semibold text-gray-800">Ingresos {earnings ? `(${earnings.month})` : 'del mes'}</h4>
              </div>
              {earnings ? (
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-100">
                    <p className="text-[11px] font-semibold text-gray-500">Bruto</p>
                    <p className="font-bold text-gray-800 tabular-nums">{formatCOP(earnings.totals.grossAmount)}</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-100">
                    <p className="text-[11px] font-semibold text-amber-700">Comisión</p>
                    <p className="font-bold text-amber-800 tabular-nums">− {formatCOP(earnings.totals.platformFeeAmount)}</p>
                  </div>
                  <div className="rounded-xl bg-green-50 p-3 ring-1 ring-green-100">
                    <p className="text-[11px] font-semibold text-green-700">Neto</p>
                    <p className="font-bold text-green-800 tabular-nums">{formatCOP(earnings.totals.netAmount)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Sin pedidos este mes.</p>
              )}
            </div>

            {/* Comisión + hora pico */}
            <div className="border-t border-gray-100 pt-4">
              <div className="mb-1 flex items-center gap-2">
                <Percent size={15} className="text-amber-500" />
                <h4 className="text-sm font-semibold text-gray-800">Comisión de plataforma</h4>
              </div>
              {canEdit ? (
                <>
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-gray-500">Comisión ECIExpress (%)</span>
                      <input
                        type="number" min={0} max={100} step={0.5}
                        value={platformFeePercent}
                        onChange={(e) => setPlatformFeePercent(e.target.value)}
                        className="w-32 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                      />
                    </label>
                    {grossAmount > 0 && (
                      <p className="text-xs text-gray-500">
                        Neto actual: <b className="text-gray-800">{formatCOP(currentNet)}</b>
                        {' → '}proyectado: <b className={projectedNet >= currentNet ? 'text-green-700' : 'text-red-700'}>{formatCOP(projectedNet)}</b>
                        <span className="block text-[11px] text-gray-400">Si esta comisión hubiera aplicado a los pedidos de este mes. No cambia lo ya cobrado.</span>
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Clock size={15} className="text-amber-500" />
                    <h4 className="text-sm font-semibold text-gray-800">Hora pico</h4>
                    {commission?.isPeakHour && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-semibold">Activa ahora</span>
                    )}
                  </div>
                  <p className="mb-2 text-xs text-gray-400">Recargo que paga el comprador dentro de la franja.</p>
                  <div className="flex flex-wrap gap-2">
                    {PEAK_DAY_CODES.map((code) => {
                      const active = days.includes(code);
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => toggleDay(code)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            active ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {getPeakDayLabel(code)}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-gray-500">Recargo (%)</span>
                      <input
                        type="number" min={0} max={100} step={0.5}
                        value={peakFeePercent}
                        onChange={(e) => setPeakFeePercent(e.target.value)}
                        className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-gray-500">Inicio</span>
                      <input
                        type="time"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                        className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-gray-500">Fin</span>
                      <input
                        type="time"
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                        className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                      />
                    </label>
                  </div>

                  <div className="mt-5 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={saving}
                      className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={save}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-500 disabled:opacity-50"
                    >
                      {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                      Guardar
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-3 text-sm">
                  <p className="text-gray-700">Comisión vigente: <b>{commission?.platformFeePercent ?? 0}%</b></p>
                  <div>
                    <p className="mb-1 font-semibold text-gray-800">Hora pico</p>
                    {commission && (commission.peakDays?.length ?? 0) > 0 ? (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {PEAK_DAY_CODES.map((code) => {
                            const active = (commission.peakDays ?? []).includes(code);
                            return (
                              <span key={code} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${active ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                {getPeakDayLabel(code)}
                              </span>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-gray-500">
                          Recargo: <b className="text-gray-900">{commission.peakFeePercent}%</b> · Franja: <b className="text-gray-900">{toTimeInput(commission.peakHoursStart) || '—'} – {toTimeInput(commission.peakHoursEnd) || '—'}</b>
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-400">Sin hora pico configurada.</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">Solo un administrador puede editar la comisión y la hora pico.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitoringPage;
