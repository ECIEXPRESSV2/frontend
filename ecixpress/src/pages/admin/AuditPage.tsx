import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { RefreshCw, Search } from 'lucide-react';
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

  const handleSearch = () => { setPage(1); load(1, { actionValue: action }); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <Sidebar activeItem="admin-audit" />
      <main className="ml-16 p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Log de Auditoría</h1>
            <button onClick={() => load(page, { actionValue: action })} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-white font-medium text-sm hover:bg-yellow-500">
              <RefreshCw size={15} /> Actualizar
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <select
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400 bg-white"
              value={action}
              onChange={e => { setAction(e.target.value); }}
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
            <button onClick={handleSearch} className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200">
              <Search size={15} />
            </button>
          </div>

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
            <div className="flex justify-center gap-3">
              <button
                onClick={() => { const p = page - 1; setPage(p); load(p, { actionValue: action }); }}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="px-4 py-2 text-sm text-gray-500">Página {page} de {Math.ceil(total / limit)}</span>
              <button
                onClick={() => { const p = page + 1; setPage(p); load(p, { actionValue: action }); }}
                disabled={page >= Math.ceil(total / limit)}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AuditPage;
