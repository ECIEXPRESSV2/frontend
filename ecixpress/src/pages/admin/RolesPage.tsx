import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Plus, RefreshCw, Shield } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuth } from '../../context/AuthContext';
import { getRoles, createRole, getPermissions, getRolePermissions, setRolePermissions, type Role, type Permission } from '../../services/roleService';
import { getPageCache, pageCacheKeys, setPageCache } from '../../services/pageCache';

type RolesCache = {
  roles: Role[];
  permissions: Permission[];
};

const RolesPage: React.FC = () => {
  const { getToken } = useAuth();
  const initialCache = getPageCache<RolesCache>(pageCacheKeys.adminRoles);
  const [roles, setRoles] = useState<Role[]>(() => initialCache?.roles ?? []);
  const [permissions, setPermissions] = useState<Permission[]>(() => initialCache?.permissions ?? []);
  const [loading, setLoading] = useState(() => !initialCache);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async ({ showLoading = false } = {}) => {
    const cached = getPageCache<RolesCache>(pageCacheKeys.adminRoles);
    if (cached) {
      setRoles(cached.roles);
      setPermissions(cached.permissions);
    }
    setLoading(showLoading && !cached);
    try {
      const token = await getToken();
      const [r, p] = await Promise.all([getRoles(token), getPermissions(token)]);
      setRoles(r);
      setPermissions(p);
      setPageCache(pageCacheKeys.adminRoles, { roles: r, permissions: p });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load({ showLoading: !initialCache }); }, []);

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    setCreating(true);
    try {
      const token = await getToken();
      await createRole({ name: newRoleName.trim(), description: newRoleDesc.trim() || undefined }, token);
      toast.success('Rol creado');
      setNewRoleName('');
      setNewRoleDesc('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setCreating(false);
    }
  };

  const openPermissions = async (role: Role) => {
    try {
      const token = await getToken();
      const current = await getRolePermissions(role.id, token);
      setSelectedPerms(new Set(current.map(p => p.id)));
    } catch {
      setSelectedPerms(new Set());
    }
    setSelectedRole(role);
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
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const togglePerm = (id: string) => {
    setSelectedPerms(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <Sidebar activeItem="admin-roles" />
      <main className="ml-16 px-6 pb-6 pt-20 md:px-8 md:pb-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Roles y Permisos</h1>
            <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-white font-medium text-sm hover:bg-yellow-500">
              <RefreshCw size={15} /> Actualizar
            </button>
          </div>

          {/* Create role */}
          <div className="rounded-2xl bg-white/70 backdrop-blur-xl shadow-sm p-6 space-y-3">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><Plus size={16} /> Crear Rol Personalizado</h2>
            <div className="flex gap-3">
              <input
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400"
                placeholder="Nombre del rol (ej. SUPERVISOR)"
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value)}
              />
              <input
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400"
                placeholder="Descripción (opcional)"
                value={newRoleDesc}
                onChange={e => setNewRoleDesc(e.target.value)}
              />
              <button
                onClick={handleCreateRole}
                disabled={creating || !newRoleName.trim()}
                className="px-5 py-2.5 rounded-xl bg-yellow-400 text-white font-medium text-sm hover:bg-yellow-500 disabled:opacity-50"
              >
                {creating ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </div>

          {/* Roles list */}
          <div className="rounded-2xl bg-white/70 backdrop-blur-xl shadow-sm overflow-hidden">
            {loading && roles.length === 0 ? (
              <TableSkeleton rows={5} columns={4} />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-6 py-3 font-semibold text-gray-600">Rol</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-600">Descripción</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-600">Tipo</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map(role => (
                    <tr key={role.id} className="border-b border-gray-50 hover:bg-yellow-50/30 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Shield size={14} className="text-yellow-500" />
                          <span className="font-medium text-gray-900">{role.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{role.description || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${role.isSystem ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          {role.isSystem ? 'Sistema' : 'Personalizado'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openPermissions(role)}
                          className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs hover:bg-gray-200"
                        >
                          Permisos
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Permissions Modal */}
      {selectedRole && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg space-y-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900">Permisos — {selectedRole.name}</h3>
            {selectedRole.isSystem
              ? <p className="text-xs text-orange-500 font-medium">Los roles de sistema no pueden modificarse.</p>
              : <p className="text-xs text-gray-400">Selecciona los permisos para reemplazar los actuales del rol.</p>
            }
            <div className="grid grid-cols-2 gap-2">
              {permissions.map(p => (
                <label key={p.id} className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 hover:bg-yellow-50 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-yellow-400"
                    checked={selectedPerms.has(p.id)}
                    onChange={() => togglePerm(p.id)}
                  />
                  <span className="text-xs text-gray-700 font-medium">{p.resource}:{p.action}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSavePermissions}
                disabled={saving || selectedRole.isSystem}
                className="flex-1 py-2.5 rounded-xl bg-yellow-400 text-white font-medium text-sm hover:bg-yellow-500 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar Permisos'}
              </button>
              <button onClick={() => setSelectedRole(null)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesPage;
