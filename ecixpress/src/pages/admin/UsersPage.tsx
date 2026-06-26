import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Search, RefreshCw, UserCheck, UserX, UserMinus } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import UserCard from '../../components/ui/info-card';
import { useAuth } from '../../context/AuthContext';
import { getUsers, updateUserStatus, assignRole, revokeRole, type UserItem } from '../../services/userService';
import { getRoles, type Role } from '../../services/roleService';
import { getPageCache, pageCacheKeys, setPageCache } from '../../services/pageCache';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-600',
  SUSPENDED: 'bg-orange-100 text-orange-700',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE:    'Activo',
  INACTIVE:  'Inactivo',
  SUSPENDED: 'Suspendido',
};

const ROLE_DISPLAY: Record<string, string> = {
  ADMIN:    'ADMIN',
  VENDOR:   'VENDOR',
  SELLER:   'VENDOR',
  BUYER:    'BUYER',
  ANALYST:  'ANALYST',
};

type UsersCache = {
  users: UserItem[];
  roles: Role[];
};

const UsersPage: React.FC = () => {
  const { getToken } = useAuth();
  const initialCache = getPageCache<UsersCache>(pageCacheKeys.adminUsers());
  const [users, setUsers] = useState<UserItem[]>(() => initialCache?.users ?? []);
  const [roles, setRoles] = useState<Role[]>(() => initialCache?.roles ?? []);
  const [loading, setLoading] = useState(() => !initialCache);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [assigningRole, setAssigningRole] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

  const load = async ({ searchValue = search, showLoading = false } = {}) => {
    const cacheKey = pageCacheKeys.adminUsers(searchValue);
    const cached = getPageCache<UsersCache>(cacheKey);
    if (cached) {
      setUsers(cached.users);
      setRoles(cached.roles);
    }
    setLoading(showLoading && !cached);
    try {
      const token = await getToken();
      const [usersRes, rolesRes] = await Promise.all([
        getUsers(token, searchValue ? { search: searchValue } : undefined),
        getRoles(token),
      ]);
      const list = Array.isArray(usersRes) ? usersRes : (usersRes as { data: UserItem[] }).data ?? [];
      setUsers(list);
      setRoles(rolesRes);
      setPageCache(cacheKey, { users: list, roles: rolesRes });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load({ showLoading: !initialCache }); }, []);

  useEffect(() => {
    if (selectedUser) {
      const updated = users.find(u => u.id === selectedUser.id);
      if (updated) setSelectedUser(updated);
    }
  }, [users]);

  const handleStatusChange = async (user: UserItem, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') => {
    try {
      const token = await getToken();
      await updateUserStatus(user.id, status, token);
      toast.success(`Usuario ${STATUS_LABEL[status] ?? status}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !assigningRole) return;
    try {
      const token = await getToken();
      await assignRole(selectedUser.id, assigningRole, token);
      toast.success('Rol asignado');
      setAssigningRole('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleRevokeRole = async (user: UserItem, roleId: string) => {
    try {
      const token = await getToken();
      await revokeRole(user.id, roleId, token);
      toast.success('Rol revocado');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const getRoleNames = (user: UserItem): string[] => {
    if (!user.roles) return [];
    if (typeof user.roles[0] === 'string') return user.roles as string[];
    return (user.roles as Array<{ name: string }>).map(r => r.name);
  };

  const mapUserToCard = (user: UserItem) => ({
    name: user.fullName,
    email: user.email,
    roles: getRoleNames(user),
    status: user.status as "ACTIVE" | "INACTIVE" | "SUSPENDED",
    avatar: user.avatarUrl,
    onManageClick: () => setSelectedUser(user),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <Sidebar activeItem="admin-users" />
      <main className="ml-16 p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
            <div className="flex gap-2">
              <button 
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition ${viewMode === 'cards' ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Tarjetas
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition ${viewMode === 'table' ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Tabla
              </button>
              <button onClick={() => load({ searchValue: search })} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-white font-medium text-sm hover:bg-yellow-500 transition">
                <RefreshCw size={15} /> Actualizar
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-400"
                placeholder="Buscar por email o nombre..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && load({ searchValue: search })}
              />
            </div>
            <button onClick={() => load({ searchValue: search })} className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200">
              Buscar
            </button>
          </div>

          {/* Cards View */}
          {viewMode === 'cards' ? (
            <div className="rounded-2xl bg-white/70 backdrop-blur-xl shadow-sm p-6">
              {loading && users.length === 0 ? (
                <TableSkeleton rows={6} columns={4} />
              ) : users.length === 0 ? (
                <p className="text-center py-12 text-gray-400">No hay usuarios</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {users.map(user => (
                    <UserCard key={user.id} {...mapUserToCard(user)} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Table View */
            <div className="rounded-2xl bg-white/70 backdrop-blur-xl shadow-sm overflow-hidden">
              {loading && users.length === 0 ? (
                <TableSkeleton rows={6} columns={4} />
              ) : users.length === 0 ? (
                <p className="text-center py-12 text-gray-400">No hay usuarios</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="text-left px-6 py-3 font-semibold text-gray-600">Usuario</th>
                        <th className="text-left px-6 py-3 font-semibold text-gray-600">Roles</th>
                        <th className="text-left px-6 py-3 font-semibold text-gray-600">Estado</th>
                        <th className="text-left px-6 py-3 font-semibold text-gray-600">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id} className="border-b border-gray-50 hover:bg-yellow-50/30 transition">
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">{user.fullName}</p>
                            <p className="text-xs text-gray-400">{user.email}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {getRoleNames(user).map(r => (
                                <span key={r} className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">{ROLE_DISPLAY[r] ?? r}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[user.status] || ''}`}>
                              {STATUS_LABEL[user.status] ?? user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {user.status !== 'ACTIVE' && (
                                <button onClick={() => handleStatusChange(user, 'ACTIVE')} title="Activar" className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100">
                                  <UserCheck size={15} />
                                </button>
                              )}
                              {user.status !== 'SUSPENDED' && (
                                <button onClick={() => handleStatusChange(user, 'SUSPENDED')} title="Suspender" className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100">
                                  <UserMinus size={15} />
                                </button>
                              )}
                              {user.status !== 'INACTIVE' && (
                                <button onClick={() => handleStatusChange(user, 'INACTIVE')} title="Desactivar" className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                                  <UserX size={15} />
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedUser(user)}
                                className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs hover:bg-gray-200"
                              >
                                Roles
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Role Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Gestionar Roles — {selectedUser.fullName}</h3>

            {/* Roles actuales con botón de revocar */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-700">Roles actuales</p>
              {(() => {
                const names = getRoleNames(selectedUser);
                const roleObjs = names
                  .map(name => roles.find(r => r.name === name))
                  .filter(Boolean) as typeof roles;
                return roleObjs.length === 0
                  ? <p className="text-sm text-gray-400">Ninguno</p>
                  : (
                    <div className="flex flex-wrap gap-2">
                      {roleObjs.map(r => (
                        <div key={r.id} className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100">
                          <span className="text-xs font-medium text-yellow-700">{ROLE_DISPLAY[r.name] ?? r.name}</span>
                          <button
                            onClick={() => handleRevokeRole(selectedUser, r.id)}
                            className="text-yellow-500 hover:text-red-500 text-xs font-bold leading-none"
                            title="Revocar"
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  );
              })()}
            </div>

            {/* Asignar nuevo rol */}
            <div className="space-y-2">
              <label htmlFor="role-select" className="text-sm font-medium text-gray-700">Asignar rol</label>
              <select
                id="role-select"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400"
                value={assigningRole}
                onChange={e => setAssigningRole(e.target.value)}
              >
                <option value="">Seleccionar rol...</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAssignRole}
                disabled={!assigningRole}
                className="flex-1 py-2.5 rounded-xl bg-yellow-400 text-white font-medium text-sm hover:bg-yellow-500 disabled:opacity-50"
              >
                Asignar
              </button>
              <button onClick={() => { setSelectedUser(null); setAssigningRole(''); }} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
