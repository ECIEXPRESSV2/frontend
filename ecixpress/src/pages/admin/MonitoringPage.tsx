import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Activity, AlertTriangle, Gauge, RefreshCw, TrendingUp, XCircle } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import { CardSkeleton } from '../../components/common/LoadingSkeleton';
import {
  ErrorRateBars,
  HBarChart,
  KpiTile,
  StatusLegend,
  type BarDatum,
  type ErrorDatum,
} from '../../components/monitoring/charts';
import { errorStatus } from '../../components/monitoring/status';
import {
  getMonitoringOverview,
  ReportingError,
  type OverviewResponse,
} from '../../services/reportingService';

// Rangos predefinidos (horas). El backend acota a 1–720.
const RANGES = [
  { label: '24 h', hours: 24 },
  { label: '7 días', hours: 24 * 7 },
  { label: '30 días', hours: 24 * 30 },
] as const;

const fmtInt = (v: number) => v.toLocaleString('es-CO');
const fmtMs = (v: number) => `${Math.round(v).toLocaleString('es-CO')} ms`;

const MonitoringPage: React.FC = () => {
  const [hours, setHours] = useState<number>(24);
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (h: number, showLoading = true) => {
      if (showLoading) setLoading(true);
      setError(null);
      try {
        const res = await getMonitoringOverview(h);
        setData(res);
      } catch (err) {
        const msg =
          err instanceof ReportingError
            ? err.status === 403
              ? 'No tienes acceso al centro de monitoreo.'
              : err.message
            : err instanceof Error
              ? err.message
              : 'Error cargando métricas';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(hours);
  }, [hours, load]);

  const totals = data?.totals ?? null;
  const services = data?.services ?? [];
  const exceptions = data?.topExceptions ?? [];

  const requestBars: BarDatum[] = services.map((s) => ({
    label: s.service,
    value: s.requests,
    hint: `p95 ${fmtMs(s.p95Ms)}`,
  }));

  const errorBars: ErrorDatum[] = [...services]
    .sort((a, b) => b.errorRatePct - a.errorRatePct)
    .map((s) => ({
      label: s.service,
      pct: s.errorRatePct,
      requests: s.requests,
      failed: s.failed,
    }));

  const overallStatus = totals ? errorStatus(totals.errorRatePct) : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <Sidebar activeItem="admin-monitoring" />
      <main className="app-shift px-4 pb-28 pt-20 md:px-8 md:pb-8 lg:px-10">
        <div className="relative mx-auto max-w-6xl space-y-6">
          {/* Header */}
          <header className="relative overflow-hidden rounded-[28px] border border-yellow-200/70 bg-[linear-gradient(135deg,#F4B942_0%,#FBBF24_48%,#FDE68A_100%)] p-5 shadow-lg shadow-yellow-200/60 md:p-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/60" />
            <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-white/22 blur-3xl" />
            <div className="pointer-events-none absolute right-[-90px] top-[-110px] h-72 w-72 rounded-full bg-[#FB923C]/22 blur-3xl" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <nav className="mb-3 inline-flex items-center rounded-xl border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm backdrop-blur">
                  Monitoreo <span className="mx-2 text-gray-400">/</span>
                  <span className="text-gray-950">Centro de monitoreo</span>
                </nav>
                <h1 className="text-3xl font-bold tracking-normal text-white md:text-4xl">Salud & KPIs</h1>
                {data && (
                  <p className="mt-2 text-sm font-medium text-white/85">
                    Actualizado {new Date(data.generatedAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                    {' · ventana de '}
                    {RANGES.find((r) => r.hours === hours)?.label ?? `${hours} h`}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Selector de rango */}
                <div className="inline-flex rounded-2xl border border-white/70 bg-white/80 p-1 shadow-sm backdrop-blur">
                  {RANGES.map((r) => (
                    <button
                      key={r.hours}
                      onClick={() => setHours(r.hours)}
                      className={`min-h-9 rounded-xl px-3 py-1.5 text-sm font-bold transition ${
                        hours === r.hours ? 'bg-amber-500 text-white shadow' : 'text-gray-700 hover:text-gray-950'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => load(hours, false)}
                  disabled={loading}
                  className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-4 py-2 text-sm font-bold text-gray-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-gray-950 disabled:opacity-50"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar
                </button>
              </div>
            </div>
          </header>

          {/* Aviso: App Insights no configurado (local) */}
          {data && !data.enabled && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-800 shadow-sm">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <p>
                Application Insights no está configurado en este entorno (falta <code className="font-mono">APPLICATIONINSIGHTS_RESOURCE_ID</code>).
                Las métricas se muestran vacías. En Azure, tras el <code className="font-mono">terraform apply</code>, este panel se llena solo.
              </p>
            </div>
          )}

          {error && !data ? (
            <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-6 text-sm font-semibold text-red-700">
              <XCircle size={18} /> {error}
            </div>
          ) : loading && !data ? (
            <CardSkeleton rows={6} />
          ) : (
            <>
              {/* KPI tiles */}
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4">
                <KpiTile
                  label="Peticiones"
                  value={fmtInt(totals?.totalRequests ?? 0)}
                  sub="Total en la ventana"
                  icon={<TrendingUp size={18} />}
                />
                <KpiTile
                  label="Tasa de error"
                  value={`${(totals?.errorRatePct ?? 0).toFixed(2)}%`}
                  sub={`${fmtInt(totals?.failedRequests ?? 0)} fallidas`}
                  status={overallStatus}
                  icon={<AlertTriangle size={18} />}
                />
                <KpiTile
                  label="Latencia p95"
                  value={fmtMs(totals?.p95Ms ?? 0)}
                  sub={`p50 ${fmtMs(totals?.p50Ms ?? 0)}`}
                  icon={<Gauge size={18} />}
                />
                <KpiTile
                  label="Servicios activos"
                  value={fmtInt(services.length)}
                  sub="Con tráfico en la ventana"
                  icon={<Activity size={18} />}
                />
              </section>

              {/* Charts */}
              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-lg shadow-gray-200/50 backdrop-blur-xl">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-bold text-gray-900">Peticiones por servicio</h2>
                    <span className="text-xs font-medium text-gray-400">volumen</span>
                  </div>
                  <HBarChart data={requestBars} />
                </div>

                <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-lg shadow-gray-200/50 backdrop-blur-xl">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-base font-bold text-gray-900">Tasa de error por servicio</h2>
                    <StatusLegend />
                  </div>
                  <ErrorRateBars data={errorBars} />
                </div>
              </section>

              {/* Top excepciones */}
              <section className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-lg shadow-gray-200/50 backdrop-blur-xl">
                <h2 className="mb-4 text-base font-bold text-gray-900">Top excepciones</h2>
                {exceptions.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">Sin excepciones en el rango 🎉</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-left text-gray-500">
                          <th className="px-3 py-2 font-semibold">Servicio</th>
                          <th className="px-3 py-2 font-semibold">Tipo</th>
                          <th className="px-3 py-2 font-semibold">Mensaje</th>
                          <th className="px-3 py-2 text-right font-semibold">Conteo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exceptions.map((e, i) => (
                          <tr key={`${e.service}-${e.type}-${i}`} className="border-b border-gray-50 hover:bg-yellow-50/30">
                            <td className="px-3 py-2 font-semibold text-gray-700">{e.service || '—'}</td>
                            <td className="px-3 py-2 font-mono text-xs text-gray-600">{e.type || '—'}</td>
                            <td className="max-w-md truncate px-3 py-2 text-gray-500" title={e.sampleMessage}>
                              {e.sampleMessage || '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-bold tabular-nums text-gray-800">{fmtInt(e.count)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default MonitoringPage;
