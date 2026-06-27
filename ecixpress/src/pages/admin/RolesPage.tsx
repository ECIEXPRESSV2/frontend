import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sliders,
  X,
} from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuth } from '../../context/AuthContext';
import {
  getRoles,
  createRole,
  getPermissions,
  getRolePermissions,
  setRolePermissions,
  type Role,
  type Permission,
} from '../../services/roleService';
import { getPageCache, pageCacheKeys, setPageCache } from '../../services/pageCache';

type RolesCache = { roles: Role[]; permissions: Permission[] };

const PAGE_SIZE = 10;

const getTypeClass = (isSystem: boolean) =>
  isSystem
    ? 'bg-violet-50 text-violet-700 border-violet-100'
    : 'bg-amber-50 text-amber-700 border-amber-100';

const groupPermissions = (perms: Permission[]) => {
  const map: Record<string, Permission[]> = {};
  for (const p of perms) {
    if (!map[p.resource]) map[p.resource] = [];
    map[p.resource].push(p);
  }
  return map;
};

export const PermissionItem: React.FC<{
  perm: Permission;
  checked: boolean;
  disabled: boolean;
  onToggle: (id: string) => void;
  borderTop: boolean;
}> = ({ perm, checked, disabled, onToggle, borderTop }) => (
  <label
    htmlFor={`perm-${perm.id}`}
    className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-yellow-50/60 ${borderTop ? 'border-t border-gray-100' : ''} ${disabled ? 'cursor-default opacity-60' : ''}`}
  >
    <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition ${checked ? 'border-yellow-400 bg-yellow-400' : 'border-gray-300 bg-white'}`}>
      {checked && (
        <svg viewBox="0 0 10 8" fill="none" className="h-3 w-3">
          <path d="M1 4l3 3 5-6" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
    <input
      id={`perm-${perm.id}`}
      type="checkbox"
      className="sr-only"
      checked={checked}
      onChange={() => onToggle(perm.id)}
      disabled={disabled}
    />
    <span className="text-sm font-medium text-gray-700">{perm.action}</span>
  </label>
);

const RolesPage: React.FC = () => {
  const { getToken } = useAuth();
  const initialCache = getPageCache<RolesCache>(pageCacheKeys.adminRoles);

  const [roles, setRoles] = useState<Role[]>(() => initialCache?.roles ?? []);
  const [permissions, setPermissions] = useState<Permission[]>(() => initialCache?.permissions ?? []);
  const [loading, setLoading] = useState(() => !initialCache);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permSearch, setPermSearch] = useState('');
  const drawerRef = useRef<HTMLDivElement>(null);

  const load = async ({ showLoading = false, silent = false } = {}) => {
    const cached = getPageCache<RolesCache>(pageCacheKeys.adminRoles);
    if (cached) { setRoles(cached.roles); setPermissions(cached.permissions); }
    setLoading(showLoading && !cached);
    setRefreshing(silent);
    try {
      const token = await getToken();
      const [r, p] = await Promise.all([getRoles(token), getPermissions(token)]);
      setRoles(r);
      setPermissions(p);
      setPageCache(pageCacheKeys.adminRoles, { roles: r, permissions: p });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error cargando roles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load({ showLoading: !initialCache }); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(r =>
      r.name.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q),
    );
  }, [roles, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRoles = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    setCreating(true);
    try {
      const token = await getToken();
      await createRole({ name: newRoleName.trim().toUpperCase(), description: newRoleDesc.trim() || undefined }, token);
      toast.success('Rol creado correctamente');
      setNewRoleName('');
      setNewRoleDesc('');
      setShowCreate(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error creando rol');
    } finally {
      setCreating(false);
    }
  };

  const openPermissions = async (role: Role) => {
    setSelectedRole(role);
    setLoadingPerms(true);
    setPermSearch('');
    try {
      const token = await getToken();
      const current = await getRolePermissions(role.id, token);
      setSelectedPerms(new Set(current.map(p => p.id)));
    } catch {
      setSelectedPerms(new Set());
    } finally {
      setLoadingPerms(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const token = await getToken();
      await setRolePermissions(selectedRole.id, Array.from(selectedPerms), token);
      toast.success('Permisos actualizados');
      setSelectedRole(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error guardando permisos');
    } finally {
      setSaving(false);
    }
  };

  const togglePerm = (id: string) => {
    if (selectedRole?.isSystem) return;
    setSelectedPerms(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const groupedPerms = useMemo(() => groupPermissions(
    permissions.filter(p =>
      permSearch.trim() === '' ||
      p.resource.toLowerCase().includes(permSearch.toLowerCase()) ||
      p.action.toLowerCase().includes(permSearch.toLowerCase()),
    ),
  ), [permissions, permSearch]);


  // ── render helpers ──────────────────────────────────────────────────────────

  const renderTableContent = () => {
    if (loading && roles.length === 0) return <TableSkeleton rows={5} columns={4} />;
    const emptyMsg = search ? 'Sin resultados para esa búsqueda' : 'No hay roles registrados';
    if (filtered.length === 0) return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
        <Shield size={36} className="opacity-30" />
        <p className="text-sm font-medium">{emptyMsg}</p>
      </div>
    );
    return (
      <>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/70 bg-gradient-to-r from-gray-50/90 via-white/85 to-cyan-50/55 text-xs font-bold uppercase tracking-wide text-gray-600">
              <tr>
                <th scope="col" className="px-6 py-4 text-left">Rol</th>
                <th scope="col" className="px-6 py-4 text-left">Descripción</th>
                <th scope="col" className="px-6 py-4 text-left">Tipo</th>
                <th scope="col" className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageRoles.map(role => {
                const typeLabel = role.isSystem
                  ? <><Lock size={10} aria-hidden="true" /> Sistema</>
                  : <><Sliders size={10} aria-hidden="true" /> Personalizado</>;
                return (
                  <tr key={role.id} className="group transition hover:bg-yellow-50/40">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <span className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border ${getTypeClass(role.isSystem)}`}>
                          <Shield size={14} aria-hidden="true" />
                        </span>
                        <span className="font-semibold text-gray-900">{role.name}</span>
                      </div>
                    </td>
                    <td className="max-w-xs px-6 py-4 text-gray-500">
                      {role.description || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getTypeClass(role.isSystem)}`}>
                        {typeLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openPermissions(role)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-yellow-300 hover:bg-yellow-50 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                      >
                        <CheckSquare size={13} aria-hidden="true" />
                        Permisos
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
            <p className="text-xs text-gray-500">
              Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} roles
            </p>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} type="button" onClick={() => setPage(n)}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-xs font-semibold transition ${n === page ? 'bg-yellow-400 text-gray-950 shadow-sm' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {n}
                </button>
              ))}
              <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 disabled:opacity-40">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  const renderPermsContent = () => {
    if (loadingPerms) return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
      </div>
    );
    if (Object.entries(groupedPerms).length === 0) return (
      <p className="py-8 text-center text-sm text-gray-400">Sin permisos disponibles</p>
    );
    return (
      <div className="space-y-4">
        {Object.entries(groupedPerms).map(([resource, perms]) => (
          <div key={resource}>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">{resource}</p>
            <div className="overflow-hidden rounded-xl border border-gray-100">
              {perms.map((p, idx) => (
                <PermissionItem
                  key={p.id}
                  perm={p}
                  checked={selectedPerms.has(p.id)}
                  disabled={!!selectedRole?.isSystem}
                  onToggle={togglePerm}
                  borderTop={idx > 0}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ── JSX ─────────────────────────────────────────────────────────────────────

  const tableContent = renderTableContent();
  const permsContent = renderPermsContent();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white text-gray-900">
      <Sidebar
        activeItem="admin-roles"
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
      />

      <main className={`relative z-[51] ml-16 min-h-screen px-4 pb-5 pt-20 transition-all duration-300 ${sidebarExpanded ? 'md:ml-64' : 'md:ml-16'} md:px-8 lg:px-10`}>
        {/* background blobs */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-52 left-1/2 h-[560px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.08)_0%,transparent_66%)] blur-3xl" />
          <div className="absolute right-[-220px] top-44 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.07)_0%,transparent_68%)] blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl space-y-6">
          {/* ── HEADER ── */}
          <header className="relative overflow-hidden rounded-[28px] border border-yellow-200/70 bg-[linear-gradient(135deg,#F4B942_0%,#FBBF24_48%,#FDE68A_100%)] p-5 shadow-lg shadow-yellow-200/60 md:p-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/60" />
            <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
            <div className="pointer-events-none absolute right-[-90px] top-[-110px] h-72 w-72 rounded-full bg-violet-400/15 blur-3xl" />

            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <nav className="mb-3 inline-flex items-center rounded-xl border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm backdrop-blur">
                  Administración <span className="mx-2 text-gray-400">/</span>
                  <span className="text-gray-950">Roles y Permisos</span>
                </nav>
                <h1 className="flex items-center gap-3 text-3xl font-bold tracking-normal text-white md:text-4xl">
                  Gestión de roles
                </h1>
              </div>
            </div>
          </header>

          {/* ── SEARCH BAR + CREAR ROL ── */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="search"
                  placeholder="Buscar por nombre o descripción..."
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-gray-200 bg-white py-2 pl-4 pr-20 text-sm font-medium text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => handleSearch('')}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-11 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-yellow-400 text-white" aria-hidden="true">
                  <Search size={15} />
                </span>
              </div>
              <button
                type="button"
                onClick={() => load({ silent: true })}
                disabled={refreshing}
                title={refreshing ? 'Actualizando...' : 'Actualizar'}
                aria-label="Actualizar lista de roles"
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 text-sm font-bold text-amber-800 shadow-sm transition hover:border-amber-300 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
                Actualizar
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-yellow-400 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300"
              >
                <Plus size={15} aria-hidden="true" />
                Crear rol
              </button>
            </div>

            {!loading && (
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-gray-100 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm">
                  <Shield size={12} className="text-violet-500" aria-hidden="true" />
                  {roles.filter(r => r.isSystem).length} del sistema
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-gray-100 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm">
                  <Sliders size={12} className="text-amber-500" aria-hidden="true" />
                  {roles.filter(r => !r.isSystem).length} personalizados
                </span>
              </div>
            )}
          </div>

          {/* ── TABLE ── */}
          <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/78 shadow-xl shadow-gray-200/70 backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[#F4B942]" />
            {tableContent}
          </div>
        </div>
      </main>

      {/* ── CREATE ROLE MODAL ── */}
      {showCreate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar modal"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowCreate(false)}
          />
          <div className="w-full max-w-md rounded-[22px] border border-gray-100 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <Plus size={17} className="text-amber-600" />
                Crear rol personalizado
              </h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label htmlFor="new-role-name" className="mb-1 block text-xs font-semibold text-amber-700">
                  Nombre del rol
                </label>
                <input
                  id="new-role-name"
                  autoFocus
                  className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm font-medium uppercase outline-none placeholder:normal-case placeholder:text-gray-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                  placeholder="Ej. SUPERVISOR"
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateRole(); }}
                />
              </div>
              <div>
                <label htmlFor="new-role-desc" className="mb-1 block text-xs font-semibold text-gray-500">
                  Descripción (opcional)
                </label>
                <input
                  id="new-role-desc"
                  className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none placeholder:text-gray-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                  placeholder="Breve descripción del rol"
                  value={newRoleDesc}
                  onChange={e => setNewRoleDesc(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateRole(); }}
                />
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleCreateRole}
                disabled={creating || !newRoleName.trim()}
                className="flex-1 rounded-xl bg-yellow-400 py-2.5 text-sm font-bold text-gray-950 transition hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? 'Creando...' : 'Crear rol'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PERMISSIONS DRAWER ── */}
      {selectedRole && (
        <>
          <button
            type="button"
            aria-label="Cerrar panel de permisos"
            className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]"
            onClick={() => setSelectedRole(null)}
          />
          <div
            ref={drawerRef}
            className="fixed bottom-0 right-0 top-0 z-[61] flex w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl md:rounded-l-[28px]"
          >
            <div className="h-1 flex-shrink-0 bg-[#F4B942]" />
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${getTypeClass(selectedRole.isSystem)}`}>
                  <Shield size={18} />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Permisos del rol</p>
                  <h3 className="text-lg font-bold text-gray-900">{selectedRole.name}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRole(null)}
                className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            {selectedRole.isSystem && (
              <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50/60 px-6 py-3">
                <Lock size={13} className="flex-shrink-0 text-amber-600" />
                <p className="text-xs font-medium text-amber-800">
                  Los roles del sistema no pueden modificarse.
                </p>
              </div>
            )}

            <div className="border-b border-gray-100 px-4 py-3">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Filtrar permisos..."
                  value={permSearch}
                  onChange={e => setPermSearch(e.target.value)}
                  className="h-9 w-full rounded-xl border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {permsContent}
            </div>

            <div className="border-t border-gray-100 px-6 py-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={saving || selectedRole.isSystem}
                  className="flex-1 rounded-xl bg-yellow-400 py-2.5 text-sm font-bold text-gray-950 transition hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar permisos'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole(null)}
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RolesPage;
