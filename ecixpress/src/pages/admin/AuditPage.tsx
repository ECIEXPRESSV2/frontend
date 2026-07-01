import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { RefreshCw } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuth } from '../../context/AuthContext';
import { getAuditLogs, type AuditLog } from '../../services/auditService';
import { getPageCache, pageCacheKeys, setPageCache } from '../../services/pageCache';

type AuditCache = {
  logs: AuditLog[];
  total: number;
};

const AuditPage: React.FC = () => {
  const { getToken } = useAuth();
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;
  const initialCache = getPageCache<AuditCache>(pageCacheKeys.adminAudit(1));
  const [logs, setLogs] = useState<AuditLog[]>(() => initialCache?.logs ?? []);
  const [loading, setLoading] = useState(() => !initialCache);
  const [total, setTotal] = useState(() => initialCache?.total ?? 0);

  const load = async (p = page, { actionValue = action, showLoading = false } = {}) => {
    const cacheKey = pageCacheKeys.adminAudit(p, actionValue);
    const cached = getPageCache<AuditCache>(cacheKey);
    if (cached) {
      setLogs(cached.logs);
      setTotal(cached.total);
    }
    setLoading(showLoading && !cached);
    try {
      const token = await getToken();
      const params: Record<string, string> = { page: String(p), limit: String(limit) };
      if (actionValue) params.action = actionValue;
      const res = await getAuditLogs(token, params);
      let nextLogs: AuditLog[];
      let nextTotal: number;
      if (Array.isArray(res)) {
        nextLogs = res;
        nextTotal = res.length;
      } else {
        const paged = res as { data: AuditLog[]; meta?: { total: number } };
        nextLogs = paged.data ?? [];
        nextTotal = paged.meta?.total ?? paged.data?.length ?? 0;
      }
      setLogs(nextLogs);
      setTotal(nextTotal);
      setPageCache(cacheKey, { logs: nextLogs, total: nextTotal });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1, { showLoading: !initialCache }); }, []);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleActionChange = (value: string) => {
    setAction(value);
    setPage(1);
    load(1, { actionValue: value, showLoading: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <Sidebar activeItem="admin-audit" />
      <main className="app-shift px-4 pb-5 pt-20 md:px-8 lg:px-10">
        <div className="relative mx-auto max-w-6xl space-y-6">
          <header className="relative overflow-hidden rounded-[28px] border border-yellow-200/70 bg-[linear-gradient(135deg,#F4B942_0%,#FBBF24_48%,#FDE68A_100%)] p-5 shadow-lg shadow-yellow-200/60 md:p-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/60" />
            <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-white/22 blur-3xl" />
            <div className="pointer-events-none absolute right-[-90px] top-[-110px] h-72 w-72 rounded-full bg-[#FB923C]/22 blur-3xl" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <nav className="mb-3 inline-flex items-center rounded-xl border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm backdrop-blur" aria-label="Ruta de navegacion">
                  Administración <span className="mx-2 text-gray-400">/</span>
                  <span className="text-gray-950">Auditoría</span>
                </nav>
                <h1 className="text-3xl font-bold tracking-normal text-white md:text-4xl">Log de auditoría</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => load(page, { actionValue: action })} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-4 py-2 text-sm font-bold text-gray-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-gray-950 focus:outline-none focus:ring-2 focus:ring-white">
                  <RefreshCw size={16} /> Actualizar
                </button>
              </div>
            </div>
          </header>

          <section className="rounded-3xl border border-white/70 bg-white/82 p-4 shadow-lg shadow-gray-200/60 backdrop-blur-xl md:p-5">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <select
              className="min-h-12 rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none transition hover:border-yellow-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
              value={action}
              onChange={e => handleActionChange(e.target.value)}
            >
              <option value="">Todas las acciones</option>
              <option value="USER_CREATED">USER_CREATED</option>
              <option value="USER_UPDATED">USER_UPDATED</option>
              <option value="USER_DEACTIVATED">USER_DEACTIVATED</option>
              <option value="ROLE_ASSIGNED">ROLE_ASSIGNED</option>
              <option value="ROLE_REVOKED">ROLE_REVOKED</option>
              <option value="STORE_CREATED">STORE_CREATED</option>
              <option value="STORE_UPDATED">STORE_UPDATED</option>
              <option value="STORE_CLOSURE_CREATED">STORE_CLOSURE_CREATED</option>
              <option value="STORE_CLOSURE_CANCELLED">STORE_CLOSURE_CANCELLED</option>
              <option value="STORE_STAFF_ASSIGNED">STORE_STAFF_ASSIGNED</option>
              <option value="STORE_STAFF_REMOVED">STORE_STAFF_REMOVED</option>
              <option value="PERMISSION_GRANTED">PERMISSION_GRANTED</option>
              <option value="PERMISSION_REVOKED">PERMISSION_REVOKED</option>
            </select>
            <p className="text-sm font-semibold text-gray-500">
              {loading ? 'Cargando registros...' : `${total} registro${total === 1 ? '' : 's'}`}
            </p>
            </div>
          </section>

          {/* Table */}
          <div className="rounded-2xl bg-white/70 backdrop-blur-xl shadow-sm overflow-hidden">
            {loading && logs.length === 0 ? (
              <TableSkeleton rows={6} columns={5} />
            ) : logs.length === 0 ? (
              <p className="text-center py-12 text-gray-400">No hay registros de auditoría</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Fecha</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Acción</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Tipo Objetivo</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Actor</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id} className="border-b border-gray-50 hover:bg-yellow-50/20 transition">
                        <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-500">{log.targetType}</td>
                        <td className="px-5 py-3 text-gray-500 font-mono text-xs">
                          {log.actorId ? log.actorId.slice(0, 8) + '...' : 'Sistema'}
                        </td>
                        <td className="px-5 py-3 text-gray-400 text-xs">{log.ipAddress || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                Mostrando <span className="font-semibold text-gray-900">{(page - 1) * limit + 1}</span> a{' '}
                <span className="font-semibold text-gray-900">{Math.min(page * limit, total)}</span> de{' '}
                <span className="font-semibold text-gray-900">{total}</span> registros
              </p>
              <div className="flex items-center gap-2">
              <button
                onClick={() => { const p = page - 1; setPage(p); load(p, { actionValue: action }); }}
                disabled={page === 1}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 transition hover:border-yellow-300 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">Página {page} de {totalPages}</span>
              <button
                onClick={() => { const p = page + 1; setPage(p); load(p, { actionValue: action }); }}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 transition hover:border-yellow-300 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AuditPage;
