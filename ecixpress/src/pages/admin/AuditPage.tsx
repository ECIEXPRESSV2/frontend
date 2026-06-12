import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { RefreshCw, Search } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { getAuditLogs, type AuditLog } from '../../services/auditService';

const AuditPage: React.FC = () => {
  const { getToken } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const load = async (p = page) => {
    setLoading(true);
    try {
      const token = await getToken();
      const params: Record<string, string> = { page: String(p), limit: String(limit) };
      if (action) params.action = action;
      const res = await getAuditLogs(token, params);
      if (Array.isArray(res)) {
        setLogs(res);
        setTotal(res.length);
      } else {
        const paged = res as { data: AuditLog[]; meta?: { total: number } };
        setLogs(paged.data ?? []);
        setTotal(paged.meta?.total ?? paged.data?.length ?? 0);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, []);

  const handleSearch = () => { setPage(1); load(1); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <Sidebar activeItem="admin-audit" />
      <main className="ml-16 p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Log de Auditoría</h1>
            <button onClick={() => load(page)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-white font-medium text-sm hover:bg-yellow-500">
              <RefreshCw size={15} /> Actualizar
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-400"
                placeholder="Filtrar por acción..."
                value={action}
                onChange={e => setAction(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button onClick={handleSearch} className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200">Buscar</button>
          </div>

          {/* Table */}
          <div className="rounded-2xl bg-white/70 backdrop-blur-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              </div>
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
                onClick={() => { const p = page - 1; setPage(p); load(p); }}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="px-4 py-2 text-sm text-gray-500">Página {page} de {Math.ceil(total / limit)}</span>
              <button
                onClick={() => { const p = page + 1; setPage(p); load(p); }}
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
