import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Search, RefreshCw, UserCheck, UserX, UserMinus } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { getUsers, updateUserStatus, assignRole, type UserItem } from '../../services/userService';
import { getRoles, type Role } from '../../services/roleService';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-600',
  SUSPENDED: 'bg-orange-100 text-orange-700',
};

const UsersPage: React.FC = () => {
  const { getToken } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [assigningRole, setAssigningRole] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const [usersRes, rolesRes] = await Promise.all([
        getUsers(token, search ? { search } : undefined),
        getRoles(token),
      ]);
      const list = Array.isArray(usersRes) ? usersRes : (usersRes as { data: UserItem[] }).data ?? [];
      setUsers(list);
      setRoles(rolesRes);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (user: UserItem, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') => {
    try {
      const token = await getToken();
      await updateUserStatus(user.id, status, token);
      toast.success(`Estado cambiado a ${status}`);
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
      setSelectedUser(null);
      setAssigningRole('');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <Sidebar activeItem="admin-users" />
      <main className="ml-16 p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
            <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-white font-medium text-sm hover:bg-yellow-500 transition">
              <RefreshCw size={15} /> Actualizar
            </button>
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
                onKeyDown={e => e.key === 'Enter' && load()}
              />
            </div>
            <button onClick={load} className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200">
              Buscar
            </button>
          </div>

          {/* Table */}
          <div className="rounded-2xl bg-white/70 backdrop-blur-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              </div>
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
                              <span key={r} className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">{r}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[user.status] || ''}`}>
                            {user.status}
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
        </div>
      </main>

      {/* Role Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Gestionar Roles — {selectedUser.fullName}</h3>
            <p className="text-sm text-gray-500">Roles actuales: {getRoleNames(selectedUser).join(', ') || 'Ninguno'}</p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Asignar rol</label>
              <select
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
