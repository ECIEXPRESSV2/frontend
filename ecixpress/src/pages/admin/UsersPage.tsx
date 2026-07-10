import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import {
  AlertCircle,
  Ban,
  Calendar,
  Check,
  CheckSquare,
  CheckCircle,
  ChevronDown,
  Clock,
  Eye,
  Grid2X2,
  List,
  Lock,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sliders,
  Store,
  Trash2,
  UserCheck,
  UserMinus,
  X,
} from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuth } from '../../context/AuthContext';
import { assignRole, bulkAssignRole, bulkUpdateStatus, getUsers, revokeRole, updateUserStatus, type UserItem } from '../../services/userService';
import {
  createRole,
  getPermissions,
  getRolePermissions,
  getRoles,
  setRolePermissions,
  type Permission,
  type Role,
} from '../../services/roleService';
import { getPageCache, pageCacheKeys, setPageCache } from '../../services/pageCache';
import { getStoresByUser, type Store as StoreData } from '../../services/storeService';
import { useRefreshOnScrollTop } from '../../hooks/useRefreshOnScrollTop';

type UsersCache = {
  users: UserItem[];
  roles: Role[];
  permissions?: Permission[];
};

type ViewMode = 'table' | 'cards';
type RoleDialogState =
  | { mode: 'create'; selectAfterCreate?: boolean }
  | { mode: 'edit'; role: Role };
type ConfirmAction = {
  user: UserItem;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  title: string;
  description: string;
  confirmLabel: string;
  tone: 'danger' | 'success' | 'neutral';
} | null;

const ROLE_META: Record<string, { label: string; className: string }> = {
  BUYER: {
    label: 'Comprador',
    className: 'bg-cyan-50 text-cyan-800 border-cyan-100',
  },
  VENDOR: {
    label: 'Vendedor',
    className: 'bg-yellow-50 text-amber-800 border-yellow-200',
  },
  SELLER: {
    label: 'Vendedor',
    className: 'bg-yellow-50 text-amber-800 border-yellow-200',
  },
  ADMIN: {
    label: 'Administrador',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  ANALYST: {
    label: 'Analista',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-100',
  },
  SUPERVISOR: {
    label: 'Supervisor',
    className: 'bg-violet-50 text-violet-800 border-violet-100',
  },
};

const getTypeClass = (isSystem: boolean) =>
  isSystem
    ? 'bg-violet-50 text-violet-700 border-violet-100'
    : 'bg-amber-50 text-amber-700 border-amber-100';

const groupPermissions = (perms: Permission[]) => {
  const map: Record<string, Permission[]> = {};
  for (const permission of perms) {
    if (!map[permission.resource]) map[permission.resource] = [];
    map[permission.resource].push(permission);
  }
  return map;
};

const STATUS_META: Record<string, {
  label: string;
  icon: typeof CheckCircle;
  badgeClass: string;
  summaryClass: string;
}> = {
  ACTIVE: {
    label: 'Activa',
    icon: CheckCircle,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    summaryClass: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  SUSPENDED: {
    label: 'Suspendida',
    icon: Ban,
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    summaryClass: 'bg-red-50 text-red-700 border-red-100',
  },
  INACTIVE: {
    label: 'Eliminada',
    icon: Trash2,
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
    summaryClass: 'bg-gray-50 text-gray-700 border-gray-200',
  },
  PENDING: {
    label: 'Pendiente',
    icon: AlertCircle,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    summaryClass: 'bg-amber-50 text-amber-800 border-amber-100',
  },
  PENDING_VERIFICATION: {
    label: 'Pendiente',
    icon: AlertCircle,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    summaryClass: 'bg-amber-50 text-amber-800 border-amber-100',
  },
};

const getRoleKey = (role: string) => role.trim().toUpperCase();

const getCanonicalRoleKey = (role: string) => {
  const key = getRoleKey(role);
  if (key === 'SELLER') return 'VENDOR';
  return key;
};

const getRoleLabel = (role: string) => ROLE_META[getRoleKey(role)]?.label ?? role;

const getRoleClass = (role: string) =>
  ROLE_META[getRoleKey(role)]?.className ?? 'bg-gray-50 text-gray-700 border-gray-200';

const getRoleDotClass = (role: string) => {
  const key = getCanonicalRoleKey(role);
  if (key === 'BUYER') return 'bg-cyan-400';
  if (key === 'VENDOR') return 'bg-yellow-400';
  if (key === 'ADMIN') return 'bg-gray-500';
  if (key === 'ANALYST') return 'bg-emerald-400';
  if (key === 'SUPERVISOR') return 'bg-violet-400';
  return 'bg-gray-300';
};

const getStatusMeta = (status: string) => {
  const key = status.toUpperCase();
  return STATUS_META[key] ?? {
    label: status,
    icon: AlertCircle,
    badgeClass: 'bg-gray-50 text-gray-700 border-gray-200',
    summaryClass: 'bg-gray-50 text-gray-700 border-gray-200',
  };
};

const getInitials = (name?: string) => {
  const parts = (name || 'Usuario').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'US';
  return parts.slice(0, 2).map(part => part[0]?.toUpperCase()).join('');
};

const formatDate = (value?: string) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const getRoleNames = (user: UserItem): string[] => {
  if (!user.roles?.length) return [];
  if (typeof user.roles[0] === 'string') return user.roles as string[];
  return (user.roles as Array<{ name: string }>).map(role => role.name);
};

const getRoleIdForName = (user: UserItem, roles: Role[], roleName: string) => {
  const roleKey = getCanonicalRoleKey(roleName);

  if (user.roles?.length && typeof user.roles[0] !== 'string') {
    const assignedRole = (user.roles as Array<{ id?: string; name: string }>).find(
      role => getCanonicalRoleKey(role.name) === roleKey,
    );
    if (assignedRole?.id) return assignedRole.id;
  }

  return roles.find(role => getCanonicalRoleKey(role.name) === roleKey)?.id;
};

const RoleBadge: React.FC<{ role: string; compact?: boolean }> = ({ role, compact = false }) => (
  <span
    className={`inline-flex items-center rounded-full border font-semibold ${getRoleClass(role)} ${
      compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
    }`}
  >
    {getRoleLabel(role)}
  </span>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const meta = getStatusMeta(status);
  const StatusIcon = meta.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm ${meta.badgeClass}`}>
      <StatusIcon size={14} aria-hidden="true" />
      {meta.label}
    </span>
  );
};

const UsersPage: React.FC = () => {
  const { getToken } = useAuth();
  const initialCache = getPageCache<UsersCache>(pageCacheKeys.adminUsers());
  const [users, setUsers] = useState<UserItem[]>(() => initialCache?.users ?? []);
  const [roles, setRoles] = useState<Role[]>(() => initialCache?.roles ?? []);
  const [permissions, setPermissions] = useState<Permission[]>(() => initialCache?.permissions ?? []);
  const [loading, setLoading] = useState(() => !initialCache);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [drawerStores, setDrawerStores] = useState<StoreData[]>([]);
  const [assigningRole, setAssigningRole] = useState('');
  const [roleUpdating, setRoleUpdating] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [openFilterMenu, setOpenFilterMenu] = useState<'role' | 'status' | 'sort' | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<'createdAt' | 'lastLoginAt'>('createdAt');
  const [bulkRoleId, setBulkRoleId] = useState('');
  const [openBulkRoleMenu, setOpenBulkRoleMenu] = useState(false);
  const [bulkRoleMenuPos, setBulkRoleMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [roleDialog, setRoleDialog] = useState<RoleDialogState | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [permSearch, setPermSearch] = useState('');
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const bulkRoleButtonRef = React.useRef<HTMLButtonElement>(null);
  const searchTimerRef = React.useRef<number | null>(null);
  const PAGE_LIMIT = 20;

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const clearSelection = () => setSelectedUserIds(new Set());

  const closeBulkRoleMenu = () => {
    setOpenBulkRoleMenu(false);
    setBulkRoleMenuPos(null);
  };

  const toggleBulkRoleMenu = () => {
    if (openBulkRoleMenu) {
      closeBulkRoleMenu();
      return;
    }

    if (bulkRoleButtonRef.current) {
      const rect = bulkRoleButtonRef.current.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, 180), window.innerWidth - 24);
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
      setBulkRoleMenuPos({ top: rect.top - 6, left, width });
    }

    if (openFilterMenu) setOpenFilterMenu(null);
    setOpenBulkRoleMenu(true);
  };

  const load = async ({
    searchValue = appliedSearch,
    pageNum = page,
    roleFilter = filterRole,
    statusFilter = filterStatus,
    sortFilter = sortBy,
    showLoading = false,
    silent = false,
  } = {}) => {
    const normalizedSearch = searchValue.trim();
    setError('');
    setLoading(showLoading);
    setRefreshing(silent);

    try {
      const token = await getToken();
      const params: Record<string, string> = {
        page: String(pageNum),
        limit: String(PAGE_LIMIT),
      };
      if (normalizedSearch) params.search = normalizedSearch;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;
      if (sortFilter !== 'createdAt') params.sortBy = sortFilter;

      const [usersRes, rolesRes] = await Promise.all([
        getUsers(token, params),
        roles.length === 0 ? getRoles(token) : Promise.resolve(roles),
      ]);

      const nextRoles = roles.length === 0 ? (rolesRes as typeof roles) : roles;
      setUsers(usersRes.data ?? []);
      setTotal(usersRes.meta?.total ?? 0);
      setTotalPages(usersRes.meta?.totalPages ?? 1);
      if (roles.length === 0) setRoles(nextRoles);
      setAppliedSearch(normalizedSearch);
      setPageCache(pageCacheKeys.adminUsers(normalizedSearch), {
        users: usersRes.data ?? [],
        roles: nextRoles,
        permissions,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron cargar los usuarios.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load({ showLoading: !initialCache });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload cuando cambian filtros u orden, reseteando a página 1
  useEffect(() => {
    setPage(1);
    setSelectedUserIds(new Set());
    load({ pageNum: 1, roleFilter: filterRole, statusFilter: filterStatus, sortFilter: sortBy, showLoading: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRole, filterStatus, sortBy]);

  useEffect(() => {
    if (!selectedUser) return;
    const updated = users.find(user => user.id === selectedUser.id);
    if (updated) setSelectedUser(updated);
  }, [users, selectedUser]);

  // Carga tiendas asignadas cuando se abre el drawer de un VENDOR o ADMIN
  useEffect(() => {
    if (!selectedUser) { setDrawerStores([]); return; }
    const roleKeys = getRoleNames(selectedUser).map(getCanonicalRoleKey);
    if (!roleKeys.some(k => k === 'VENDOR' || k === 'ADMIN')) { setDrawerStores([]); return; }
    let cancelled = false;
    getToken().then(token => getStoresByUser(selectedUser.id, token)).then(stores => {
      if (!cancelled) setDrawerStores(stores);
    }).catch(() => { if (!cancelled) setDrawerStores([]); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?.id]);

  // El backend ya filtra — `users` es siempre el resultado filtrado/paginado
  const filteredUsers = users;

  const availableFilterRoles = useMemo(() => {
    return roles.map(role => ({
      value: role.name,
      label: ROLE_META[getRoleKey(role.name)]?.label ?? role.name,
    }));
  }, [roles]);

  const availableRoles = useMemo(() => {
    if (!selectedUser) return roles;
    const assignedKeys = getRoleNames(selectedUser).map(getCanonicalRoleKey);
    return roles.filter(role => !assignedKeys.includes(getCanonicalRoleKey(role.name)));
  }, [roles, selectedUser]);

  const handleSearch = () => {
    setPage(1);
    setSelectedUserIds(new Set());
    load({ searchValue: search, pageNum: 1, showLoading: true });
  };

  const clearSearch = () => {
    setSearch('');
    setPage(1);
    setSelectedUserIds(new Set());
    load({ searchValue: '', pageNum: 1, showLoading: true });
  };

  const handleRefresh = () => {
    load({ showLoading: false, silent: true });
  };

  const persistRolesCache = (nextRoles: Role[], nextPermissions = permissions) => {
    setPageCache(pageCacheKeys.adminUsers(appliedSearch), {
      users,
      roles: nextRoles,
      permissions: nextPermissions,
    });
  };

  const ensurePermissions = async (token?: string) => {
    if (permissions.length > 0) return permissions;
    const resolvedToken = token ?? await getToken();
    const loadedPermissions = await getPermissions(resolvedToken);
    setPermissions(loadedPermissions);
    persistRolesCache(roles, loadedPermissions);
    return loadedPermissions;
  };

  const openCreateRole = async (selectAfterCreate = false) => {
    setRoleDialog({ mode: 'create', selectAfterCreate });
    setNewRoleName('');
    setNewRoleDesc('');
    setSelectedPerms(new Set());
    setPermSearch('');
    setLoadingPerms(true);

    try {
      const token = await getToken();
      await ensurePermissions(token);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar los permisos.');
    } finally {
      setLoadingPerms(false);
    }
  };

  const openRolePermissions = async (role: Role) => {
    setRoleDialog({ mode: 'edit', role });
    setSelectedPerms(new Set());
    setPermSearch('');
    setLoadingPerms(true);

    try {
      const token = await getToken();
      const [, currentPermissions] = await Promise.all([
        ensurePermissions(token),
        getRolePermissions(role.id, token),
      ]);
      setSelectedPerms(new Set(currentPermissions.map(permission => permission.id)));
    } catch (err) {
      setSelectedPerms(new Set());
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar los permisos del rol.');
    } finally {
      setLoadingPerms(false);
    }
  };

  const closeRoleDialog = () => {
    setRoleDialog(null);
    setNewRoleName('');
    setNewRoleDesc('');
    setSelectedPerms(new Set());
    setPermSearch('');
  };

  const toggleRolePermission = (permissionId: string) => {
    if (roleDialog?.mode === 'edit' && roleDialog.role.isSystem) return;
    setSelectedPerms(prev => {
      const next = new Set(prev);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  };

  const handleSaveRoleDialog = async () => {
    if (!roleDialog) return;
    if (roleDialog.mode === 'edit' && roleDialog.role.isSystem) return;

    setSavingRole(true);
    try {
      const token = await getToken();

      if (roleDialog.mode === 'edit') {
        await setRolePermissions(roleDialog.role.id, Array.from(selectedPerms), token);
        toast.success('Permisos actualizados.');
        closeRoleDialog();
        return;
      }

      const roleName = newRoleName.trim().toUpperCase();
      if (!roleName) return;

      const createdRole = await createRole({
        name: roleName,
        description: newRoleDesc.trim() || undefined,
      }, token);

      const nextRoles = [...roles.filter(role => role.id !== createdRole.id), createdRole]
        .sort((a, b) => a.name.localeCompare(b.name));

      if (selectedPerms.size > 0) {
        try {
          await setRolePermissions(createdRole.id, Array.from(selectedPerms), token);
        } catch {
          setRoles(nextRoles);
          persistRolesCache(nextRoles);
          if (roleDialog.selectAfterCreate) setAssigningRole(createdRole.id);
          toast.error('El rol se creo, pero no se pudieron guardar sus permisos.');
          closeRoleDialog();
          return;
        }
      }

      setRoles(nextRoles);
      persistRolesCache(nextRoles);
      if (roleDialog.selectAfterCreate) setAssigningRole(createdRole.id);
      toast.success('Rol creado correctamente.');
      closeRoleDialog();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el rol.');
    } finally {
      setSavingRole(false);
    }
  };

  useRefreshOnScrollTop(() => load({ showLoading: false, silent: true }), { disabled: loading || refreshing });

  const goToPage = (p: number) => {
    setPage(p);
    setSelectedUserIds(new Set());
    load({ pageNum: p, showLoading: true });
  };

  const handleBulkStatus = async (status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') => {
    if (selectedUserIds.size === 0) return;
    try {
      setBulkActionLoading(true);
      const token = await getToken();
      await bulkUpdateStatus(Array.from(selectedUserIds), status, token);
      const label = status === 'ACTIVE' ? 'reactivadas' : status === 'INACTIVE' ? 'eliminadas' : 'suspendidas';
      toast.success(`${selectedUserIds.size} cuenta${selectedUserIds.size !== 1 ? 's' : ''} ${label}.`);
      clearSelection();
      await load({ silent: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el estado.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkAssignRole = async () => {
    if (selectedUserIds.size === 0 || !bulkRoleId) return;
    try {
      setBulkActionLoading(true);
      const token = await getToken();
      const res = await bulkAssignRole(Array.from(selectedUserIds), bulkRoleId, token);
      toast.success(`Rol ${res.roleName} asignado a ${res.updated} usuario${res.updated !== 1 ? 's' : ''}.`);
      setBulkRoleId('');
      clearSelection();
      await load({ silent: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo asignar el rol.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !assigningRole) return;

    try {
      setRoleUpdating(true);
      const token = await getToken();
      await assignRole(selectedUser.id, assigningRole, token);
      toast.success('Rol asignado correctamente.');
      setAssigningRole('');
      await load({ searchValue: appliedSearch, silent: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo asignar el rol.');
    } finally {
      setRoleUpdating(false);
    }
  };

  const handleRevokeRole = async (user: UserItem, roleId: string) => {
    try {
      setRoleUpdating(true);
      const token = await getToken();
      await revokeRole(user.id, roleId, token);
      toast.success('Rol retirado correctamente.');
      await load({ searchValue: appliedSearch, silent: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo retirar el rol.');
    } finally {
      setRoleUpdating(false);
    }
  };

  const openStatusConfirmation = (user: UserItem, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') => {
    const name = user.fullName || user.email;

    if (status === 'SUSPENDED') {
      setConfirmAction({
        user,
        status,
        title: `Suspender la cuenta de ${name}`,
        description: 'La persona no podra ingresar ni realizar operaciones hasta que un administrador reactive su cuenta.',
        confirmLabel: 'Suspender cuenta',
        tone: 'danger',
      });
      return;
    }

    if (status === 'ACTIVE') {
      setConfirmAction({
        user,
        status,
        title: `Reactivar la cuenta de ${name}`,
        description: 'La persona recuperara el acceso a ECIxpress con los roles que tiene asignados actualmente.',
        confirmLabel: 'Reactivar cuenta',
        tone: 'success',
      });
      return;
    }

    setConfirmAction({
      user,
      status,
      title: `Eliminar la cuenta de ${name}`,
      description: 'La cuenta quedara dada de baja y sin acceso hasta que un administrador la reactive.',
      confirmLabel: 'Eliminar cuenta',
      tone: 'danger',
    });
  };

  const handleConfirmStatusChange = async (reason?: string) => {
    if (!confirmAction) return;

    try {
      setStatusUpdating(true);
      const token = await getToken();
      await updateUserStatus(confirmAction.user.id, confirmAction.status, token, reason);
      toast.success('Estado de cuenta actualizado.');
      setConfirmAction(null);
      await load({ searchValue: appliedSearch, silent: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el estado de la cuenta.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const renderRoles = (user: UserItem, compact = false) => {
    const roleNames = getRoleNames(user);

    if (roleNames.length === 0) {
      return <span className="text-sm text-gray-400">Sin roles asignados</span>;
    }

    const visibleRoles = compact ? roleNames.slice(0, 2) : roleNames;
    const hiddenCount = roleNames.length - visibleRoles.length;

    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {visibleRoles.map(role => (
          <RoleBadge key={role} role={role} compact={compact} />
        ))}
        {hiddenCount > 0 && (
          <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-600">
            +{hiddenCount}
          </span>
        )}
      </div>
    );
  };

  const groupedPerms = useMemo(() => groupPermissions(
    permissions.filter(permission =>
      permSearch.trim() === '' ||
      permission.resource.toLowerCase().includes(permSearch.toLowerCase()) ||
      permission.action.toLowerCase().includes(permSearch.toLowerCase()),
    ),
  ), [permissions, permSearch]);
  const roleDialogReadOnly = roleDialog?.mode === 'edit' && roleDialog.role.isSystem;

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white text-gray-900"
      onClick={() => {
        if (openFilterMenu) setOpenFilterMenu(null);
        if (openBulkRoleMenu) closeBulkRoleMenu();
      }}
    >
      <Sidebar
        activeItem="admin-users"
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
      />

      <main className="relative z-[51] app-shift min-h-screen px-4 pb-5 pt-20 md:px-8 lg:px-10">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-52 left-1/2 h-[560px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.08)_0%,transparent_66%)] blur-3xl" />
          <div className="absolute right-[-220px] top-44 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(94,192,217,0.10)_0%,transparent_68%)] blur-3xl" />
          <div className="absolute bottom-[-260px] left-20 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.05)_0%,transparent_66%)] blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl space-y-6">
          <AdminHeroBanner
            section="Usuarios"
            title="Gestion de"
            accent="usuarios"
            sidebarExpanded={sidebarExpanded}
          />
          <header className="hidden relative overflow-hidden rounded-[28px] border border-yellow-200/70 bg-[linear-gradient(135deg,#F4B942_0%,#FBBF24_48%,#FDE68A_100%)] p-5 shadow-lg shadow-yellow-200/60 md:p-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/60" />
            <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-white/22 blur-3xl" />
            <div className="pointer-events-none absolute right-[-90px] top-[-110px] h-72 w-72 rounded-full bg-[#FB923C]/22 blur-3xl" />
            <div className="pointer-events-none absolute bottom-[-120px] left-[42%] h-64 w-64 rounded-full bg-white/16 blur-3xl" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <nav className="mb-3 inline-flex items-center rounded-xl border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm backdrop-blur" aria-label="Ruta de navegación">
                  Administración <span className="mx-2 text-gray-400">/</span>
                  <span className="text-gray-950">Usuarios</span>
                </nav>
                <h1 className="flex items-center gap-3 text-3xl font-bold tracking-normal text-white md:text-4xl">
                  Gestión de usuarios
                </h1>
              </div>
            </div>
          </header>

          <section className="sticky top-20 z-30 relative rounded-3xl border border-white/70 bg-white/88 p-4 shadow-lg shadow-gray-200/60 backdrop-blur-xl md:p-5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
              <label className="relative block">
                <span className="sr-only">Buscar por nombre o correo electrónico</span>
                <input
                  className="min-h-12 w-full rounded-2xl border border-white/70 bg-white/85 py-3 pl-5 pr-24 text-base font-medium text-gray-900 shadow-sm outline-none backdrop-blur transition placeholder:text-gray-400 hover:border-yellow-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                  placeholder="Buscar por nombre o correo electrónico"
                  value={search}
                  onChange={event => {
                    const val = event.target.value;
                    setSearch(val);
                    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                    searchTimerRef.current = window.setTimeout(() => {
                      setPage(1);
                      setSelectedUserIds(new Set());
                      load({ searchValue: val.trim(), pageNum: 1 });
                    }, 380);
                  }}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                      handleSearch();
                    }
                  }}
                />
                {search && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-12 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
                <span className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl bg-yellow-400 text-white" aria-hidden="true">
                  <Search size={16} aria-hidden="true" />
                </span>
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex min-h-12 rounded-2xl border border-white/60 bg-white/60 p-1 shadow-sm backdrop-blur">
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`inline-flex h-10 w-12 items-center justify-center rounded-xl transition focus:outline-none focus:ring-2 focus:ring-yellow-300 ${
                      viewMode === 'table' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                    }`}
                    aria-label="Ver como tabla"
                    title="Vista de tabla"
                  >
                    <List size={21} strokeWidth={2.4} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    className={`inline-flex h-10 w-12 items-center justify-center rounded-xl transition focus:outline-none focus:ring-2 focus:ring-yellow-300 ${
                      viewMode === 'cards' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                    }`}
                    aria-label="Ver como tarjetas"
                    title="Vista de tarjetas"
                  >
                    <Grid2X2 size={20} strokeWidth={2.4} aria-hidden="true" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => openCreateRole(false)}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-4 text-sm font-bold text-white shadow-sm shadow-yellow-500/20 transition hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                >
                  <Plus size={16} aria-hidden="true" />
                  Crear rol
                </button>
              </div>
            </div>

            <div className="relative z-[200] mt-3 flex flex-wrap items-center gap-2">
              <FilterChip
                label="Rol"
                icon={Shield}
                value={filterRole}
                options={availableFilterRoles}
                isOpen={openFilterMenu === 'role'}
                onOpen={() => setOpenFilterMenu(openFilterMenu === 'role' ? null : 'role')}
                onSelect={val => { setFilterRole(val); setOpenFilterMenu(null); }}
                onClear={() => setFilterRole('')}
              />
              <FilterChip
                label="Estado"
                icon={CheckCircle}
                value={filterStatus}
                options={[
                  { value: 'ACTIVE', label: 'Activa' },
                  { value: 'INACTIVE', label: 'Eliminada' },
                  { value: 'SUSPENDED', label: 'Suspendida' },
                  { value: 'PENDING_VERIFICATION', label: 'Pendiente' },
                ]}
                isOpen={openFilterMenu === 'status'}
                onOpen={() => setOpenFilterMenu(openFilterMenu === 'status' ? null : 'status')}
                onSelect={val => { setFilterStatus(val); setOpenFilterMenu(null); }}
                onClear={() => setFilterStatus('')}
              />
              <FilterChip
                label="Ordenar"
                icon={Clock}
                value={sortBy === 'lastLoginAt' ? 'lastLoginAt' : ''}
                options={[
                  { value: 'lastLoginAt', label: 'Última conexión' },
                ]}
                isOpen={openFilterMenu === 'sort'}
                onOpen={() => setOpenFilterMenu(openFilterMenu === 'sort' ? null : 'sort')}
                onSelect={val => { setSortBy(val === 'lastLoginAt' ? 'lastLoginAt' : 'createdAt'); setOpenFilterMenu(null); }}
                onClear={() => setSortBy('createdAt')}
              />
              {(filterRole || filterStatus || sortBy !== 'createdAt') && (
                <button
                  type="button"
                  onClick={() => { setFilterRole(''); setFilterStatus(''); setSortBy('createdAt'); }}
                  className="ml-1 inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-semibold text-gray-500 transition hover:text-red-600 focus:outline-none"
                >
                  <X size={12} aria-hidden="true" />
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-3 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {loading
                    ? 'Cargando usuarios...'
                    : `${total} usuario${total === 1 ? '' : 's'}${filterRole || filterStatus ? ' filtrados' : ' encontrados'}`}
                </span>
                {appliedSearch && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-semibold text-amber-800">
                    Búsqueda: {appliedSearch}
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="rounded-full p-0.5 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                      aria-label="Limpiar búsqueda"
                    >
                      <X size={13} aria-hidden="true" />
                    </button>
                  </span>
                )}
                {!loading && (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                      <Shield size={12} aria-hidden="true" />
                      {roles.length} roles
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      <Sliders size={12} aria-hidden="true" />
                      {roles.filter(role => !role.isSystem).length} personalizados
                    </span>
                  </>
                )}
              </div>

              {selectedUserIds.size > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-yellow-200 bg-yellow-50/80 px-4 py-2 shadow-sm backdrop-blur">
                  <span className="text-xs font-bold text-amber-800">
                    {selectedUserIds.size} seleccionado{selectedUserIds.size !== 1 ? 's' : ''}
                  </span>
                  <span className="h-4 w-px bg-yellow-200" aria-hidden="true" />
                  {/* Asignar rol en bulk — custom dropdown con puntos de color */}
                  <div className="relative flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <button
                      ref={bulkRoleButtonRef}
                      type="button"
                      onClick={toggleBulkRoleMenu}
                      disabled={bulkActionLoading}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:cursor-wait ${
                        bulkRoleId
                          ? 'border-yellow-300 bg-yellow-50 text-amber-800'
                          : 'border-gray-200 bg-white/80 text-gray-600 hover:border-yellow-200 hover:bg-yellow-50/50'
                      }`}
                      aria-label="Seleccionar rol para asignar"
                    >
                      <Shield size={13} aria-hidden="true" />
                      {(() => {
                        const r = roles.find(r => r.id === bulkRoleId);
                        return r ? (
                          <>
                            <span className={`inline-block h-2 w-2 rounded-full ${getRoleDotClass(r.name)}`} />
                            {ROLE_META[getRoleKey(r.name)]?.label ?? r.name}
                          </>
                        ) : 'Seleccionar rol';
                      })()}
                      <ChevronDown size={12} className={`transition-transform ${openBulkRoleMenu ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>
                    {openBulkRoleMenu && bulkRoleMenuPos && createPortal(
                      <>
                        <div
                          style={{ position: 'fixed', inset: 0, zIndex: 99998 }}
                          onClick={closeBulkRoleMenu}
                        />
                        <div
                          style={{
                            position: 'fixed',
                            top: bulkRoleMenuPos.top,
                            left: bulkRoleMenuPos.left,
                            width: bulkRoleMenuPos.width,
                            zIndex: 99999,
                            transform: 'translateY(-100%)',
                          }}
                          className="overflow-hidden rounded-2xl border border-white/80 bg-white/95 p-1.5 shadow-xl shadow-gray-200/80 backdrop-blur-xl"
                          onClick={e => e.stopPropagation()}
                        >
                          {roles.map(r => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => { setBulkRoleId(r.id); closeBulkRoleMenu(); }}
                              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                                bulkRoleId === r.id ? 'bg-yellow-50 text-amber-800' : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <span className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${getRoleDotClass(r.name)}`} />
                              {ROLE_META[getRoleKey(r.name)]?.label ?? r.name}
                              {bulkRoleId === r.id && <Check size={13} className="ml-auto text-amber-700" aria-hidden="true" />}
                            </button>
                          ))}
                        </div>
                      </>,
                      document.body,
                    )}
                    <button
                      type="button"
                      onClick={handleBulkAssignRole}
                      disabled={!bulkRoleId || bulkActionLoading}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-yellow-300 bg-yellow-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Aplicar
                    </button>
                  </div>
                  <span className="h-4 w-px bg-yellow-200" aria-hidden="true" />
                  {/* Cambiar estado en bulk */}
                  <button
                    type="button"
                    onClick={() => handleBulkStatus('ACTIVE')}
                    disabled={bulkActionLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-wait disabled:opacity-50"
                  >
                    <UserCheck size={13} aria-hidden="true" />
                    Activar
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="inline-flex items-center gap-1 rounded-xl px-2 py-1.5 text-xs font-semibold text-gray-500 transition hover:text-red-600 focus:outline-none"
                  >
                    <X size={12} aria-hidden="true" />
                    Limpiar
                  </button>
                </div>
              )}
            </div>
          </section>

          {error && !loading && (
            <section className="rounded-3xl border border-red-100 bg-red-50 p-5 text-red-800">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-3">
                  <AlertCircle className="mt-0.5 flex-shrink-0" size={20} aria-hidden="true" />
                  <div>
                    <h2 className="font-bold">No se pudieron cargar los usuarios</h2>
                    <p className="mt-1 text-sm text-red-700">{error}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-red-700 shadow-sm hover:bg-red-100"
                >
                  <RefreshCw size={16} aria-hidden="true" />
                  Reintentar
                </button>
              </div>
            </section>
          )}

          <section className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/78 shadow-xl shadow-gray-200/70 backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[#F4B942]" />
            <div className="max-h-[calc(100vh-24rem)] overflow-auto">
              {loading && users.length === 0 ? (
                <div>
                  <div className="border-b border-white/70 px-5 py-4">
                    <div className="h-5 w-48 animate-pulse rounded-full bg-gray-100" />
                  </div>
                  <TableSkeleton rows={8} columns={4} />
                </div>
              ) : users.length === 0 ? (
                <EmptyUsersState search={appliedSearch} onClearSearch={clearSearch} />
              ) : filteredUsers.length === 0 ? (
                <div className="flex min-h-[240px] flex-col items-center justify-center px-6 py-10 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-200 bg-gradient-to-br from-white to-yellow-50 text-amber-700 shadow-md">
                    <Search size={22} aria-hidden="true" />
                  </div>
                  <p className="font-bold text-gray-950">Sin resultados para los filtros aplicados</p>
                  <p className="mt-1 text-sm text-gray-500">Prueba cambiando el rol o estado seleccionado.</p>
                  <button
                    type="button"
                    onClick={() => { setFilterRole(''); setFilterStatus(''); }}
                    className="mt-4 inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-yellow-50 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  >
                    <X size={14} aria-hidden="true" />
                    Limpiar filtros
                  </button>
                </div>
              ) : viewMode === 'table' ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[780px] text-left text-sm">
                  <caption className="sr-only">Listado de usuarios de ECIxpress</caption>
                  <thead className="border-b border-white/70 bg-gradient-to-r from-gray-50/90 via-white/85 to-cyan-50/55 text-xs font-bold uppercase tracking-wide text-gray-600">
                    <tr>
                      <th scope="col" className="w-12 px-4 py-4">
                        <input
                          type="checkbox"
                          checked={filteredUsers.length > 0 && selectedUserIds.size === filteredUsers.length}
                          ref={el => { if (el) el.indeterminate = selectedUserIds.size > 0 && selectedUserIds.size < filteredUsers.length; }}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-amber-500"
                          aria-label="Seleccionar todos"
                        />
                      </th>
                      <th scope="col" className="px-5 py-4">Usuario</th>
                      <th scope="col" className="px-5 py-4">Roles</th>
                      <th scope="col" className="px-5 py-4">Estado</th>
                      <th scope="col" className="px-5 py-4 text-right">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map(user => (
                      <tr
                        key={user.id}
                        onClick={() => setSelectedUser(user)}
                        className={`cursor-pointer transition hover:bg-yellow-50/50 ${selectedUserIds.has(user.id) ? 'bg-yellow-50/60' : ''}`}
                      >
                        <td className="w-12 px-4 py-4" onClick={event => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedUserIds.has(user.id)}
                            onChange={() => toggleSelectUser(user.id)}
                            className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-amber-500"
                            aria-label={`Seleccionar ${user.fullName || user.email}`}
                          />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar user={user} />
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={event => { event.stopPropagation(); setSelectedUser(user); }}
                                className="block max-w-[320px] truncate text-left font-bold text-gray-950 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                                title={user.fullName}
                              >
                                {user.fullName || 'Usuario sin nombre'}
                              </button>
                              <p className="mt-0.5 max-w-[340px] truncate text-sm text-gray-500" title={user.email}>
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">{renderRoles(user, true)}</td>
                        <td className="px-5 py-4">
                          <StatusBadge status={user.status} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={event => { event.stopPropagation(); setSelectedUser(user); }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-yellow-300 hover:bg-yellow-50 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                            >
                              <Eye size={13} aria-hidden="true" />
                              Ver detalles
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3">
                  <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-gray-600 hover:text-gray-900">
                    <input
                      type="checkbox"
                      checked={filteredUsers.length > 0 && selectedUserIds.size === filteredUsers.length}
                      ref={el => { if (el) el.indeterminate = selectedUserIds.size > 0 && selectedUserIds.size < filteredUsers.length; }}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-amber-500"
                      aria-label="Seleccionar todos"
                    />
                    {selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0
                      ? 'Todos seleccionados'
                      : 'Seleccionar todos'}
                  </label>
                  {selectedUserIds.size > 0 && selectedUserIds.size < filteredUsers.length && (
                    <span className="text-xs text-gray-400">{selectedUserIds.size} de {filteredUsers.length}</span>
                  )}
                </div>
                  <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredUsers.map(user => (
                  <article
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`relative rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                      selectedUserIds.has(user.id)
                        ? 'cursor-pointer border-yellow-300 bg-yellow-50/50'
                        : 'cursor-pointer border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    {/* Fila superior: checkbox + avatar + info + menú */}
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.has(user.id)}
                        onChange={() => toggleSelectUser(user.id)}
                        onClick={event => event.stopPropagation()}
                        className="mt-1 h-4 w-4 flex-shrink-0 cursor-pointer rounded border-gray-300 accent-amber-500"
                        aria-label={`Seleccionar ${user.fullName || user.email}`}
                      />
                      <Avatar user={user} size="md" />
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-base font-bold text-gray-950" title={user.fullName}>
                          {user.fullName || 'Usuario sin nombre'}
                        </h2>
                        <p className="truncate text-xs text-gray-400" title={user.email}>{user.email}</p>
                        {getRoleNames(user).length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {getRoleNames(user).map(role => (
                              <span
                                key={role}
                                className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold shadow-sm ${getRoleClass(role)}`}
                              >
                                {getRoleLabel(role)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer: estado + ver detalles sutil */}
                    <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-3">
                      <StatusBadge status={user.status} />
                      <button
                        type="button"
                        onClick={event => { event.stopPropagation(); setSelectedUser(user); }}
                        className="inline-flex items-center gap-1.5 rounded text-xs font-semibold text-gray-400 transition hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                      >
                        <Eye size={13} aria-hidden="true" />
                        Ver detalles
                      </button>
                    </div>
                  </article>
                ))}
                  </div>
                </div>
              )}

              {total > 0 && !loading && (
                <footer className="flex flex-col gap-3 border-t border-white/70 bg-white/75 px-5 py-4 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
                <p>
                  Mostrando{' '}
                  <span className="font-bold text-gray-950">
                    {(page - 1) * PAGE_LIMIT + 1}–{Math.min(page * PAGE_LIMIT, total)}
                  </span>{' '}
                  de <span className="font-bold text-gray-950">{total}</span> usuarios
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => goToPage(page - 1)}
                      disabled={page === 1}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:border-yellow-300 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Página anterior"
                    >
                      ‹
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                      .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, idx) =>
                        p === '…' ? (
                          <span key={`ellipsis-${idx}`} className="px-1 text-gray-400">…</span>
                        ) : (
                          <button
                            key={p}
                            type="button"
                            onClick={() => goToPage(p as number)}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border text-sm font-semibold transition ${
                              p === page
                                ? 'border-yellow-300 bg-yellow-50 text-amber-800'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-yellow-200 hover:text-amber-700'
                            }`}
                            aria-current={p === page ? 'page' : undefined}
                          >
                            {p}
                          </button>
                        ),
                      )}
                    <button
                      type="button"
                      onClick={() => goToPage(page + 1)}
                      disabled={page === totalPages}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:border-yellow-300 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Página siguiente"
                    >
                      ›
                    </button>
                  </div>
                )}
                </footer>
              )}
            </div>
          </section>
        </div>
      </main>

      {selectedUser && (
        <UserDetailDrawer
          user={selectedUser}
          roles={roles}
          availableRoles={availableRoles}
          stores={drawerStores}
          assigningRole={assigningRole}
          roleUpdating={roleUpdating}
          onAssigningRoleChange={setAssigningRole}
          onAssignRole={handleAssignRole}
          onRevokeRole={handleRevokeRole}
          onCreateRole={() => openCreateRole(true)}
          onManageRolePermissions={openRolePermissions}
          onClose={() => {
            setSelectedUser(null);
            setAssigningRole('');
          }}
          onStatusAction={openStatusConfirmation}
        />
      )}

      {roleDialog && (
        <RolePermissionsDialog
          dialog={roleDialog}
          groupedPermissions={groupedPerms}
          selectedPerms={selectedPerms}
          loadingPerms={loadingPerms}
          saving={savingRole}
          readOnly={!!roleDialogReadOnly}
          newRoleName={newRoleName}
          newRoleDesc={newRoleDesc}
          permSearch={permSearch}
          onNewRoleNameChange={setNewRoleName}
          onNewRoleDescChange={setNewRoleDesc}
          onPermSearchChange={setPermSearch}
          onTogglePermission={toggleRolePermission}
          onCancel={closeRoleDialog}
          onSave={handleSaveRoleDialog}
        />
      )}

      {confirmAction && (
        <ConfirmStatusDialog
          action={confirmAction}
          loading={statusUpdating}
          onCancel={() => setConfirmAction(null)}
          onConfirm={handleConfirmStatusChange}
        />
      )}
    </div>
  );
};

const Avatar: React.FC<{ user: UserItem; size?: 'sm' | 'md' | 'lg' }> = ({ user, size = 'sm' }) => {
  const sizeClass = size === 'lg' ? 'h-20 w-20 text-2xl' : size === 'md' ? 'h-14 w-14 text-base' : 'h-11 w-11 text-sm';
  const image = user.avatarUrl;

  if (image) {
    return (
      <img
        src={image}
        alt={`Avatar de ${user.fullName || user.email}`}
        className={`${sizeClass} flex-shrink-0 rounded-full border-2 border-white object-cover shadow-sm`}
      />
    );
  }

  return (
    <div className={`${sizeClass} flex flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-cyan-100 via-white to-yellow-100 font-bold text-gray-950 shadow-md shadow-gray-200/70`}>
      {getInitials(user.fullName)}
    </div>
  );
};

const EmptyUsersState: React.FC<{ search: string; onClearSearch: () => void }> = ({ search, onClearSearch }) => (
  <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center">
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-200 bg-gradient-to-br from-white to-cyan-50 text-amber-700 shadow-md shadow-gray-200/70">
      <Search size={28} aria-hidden="true" />
    </div>
    <h2 className="text-xl font-bold text-gray-950">
      {search ? 'No encontramos usuarios para esta búsqueda' : 'Aún no hay usuarios registrados'}
    </h2>
    <p className="mt-2 max-w-md text-sm leading-6 text-gray-600">
      {search
        ? `No hay resultados para "${search}". Verifica el nombre o correo electrónico, o limpia la búsqueda para ver todos los usuarios.`
        : 'Cuando existan usuarios registrados en ECIxpress aparecerán en este listado.'}
    </p>
    {search && (
      <button
        type="button"
        onClick={onClearSearch}
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-800 transition hover:bg-yellow-50 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-yellow-300"
      >
        Limpiar búsqueda
      </button>
    )}
  </div>
);

const RoleSelect: React.FC<{
  id: string;
  roles: Role[];
  value: string;
  disabled: boolean;
  isOpen: boolean;
  onOpen: () => void;
  onChange: (roleId: string) => void;
  onCreateRole: () => void;
  onManageRolePermissions: (role: Role) => void;
}> = ({ id, roles, value, disabled, isOpen, onOpen, onChange, onCreateRole, onManageRolePermissions }) => {
  const [dropdownPos, setDropdownPos] = React.useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const selected = roles.find(role => role.id === value);
  const placeholder = roles.length === 0 ? 'Todos los roles están asignados' : 'Seleccionar rol';

  const handleOpen = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 8, left: rect.left, width: rect.width });
    }
    onOpen();
  };

  const dropdownContent = isOpen && !disabled && dropdownPos
    ? createPortal(
        <>
          {/* overlay transparente para asegurar que nada quede por encima */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99998 }}
            onClick={onOpen}
          />
          <div
            style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 99999 }}
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-1.5 shadow-xl shadow-gray-300/50"
            role="listbox"
            aria-labelledby={id}
            onClick={e => e.stopPropagation()}
          >
            {roles.length === 0 && (
              <p className="px-3 py-3 text-sm font-medium text-gray-400">
                Todos los roles existentes ya estan asignados.
              </p>
            )}
            {roles.map(role => {
              const isSelected = role.id === value;
              return (
                <div
                  key={role.id}
                  role="option"
                  aria-selected={isSelected}
                  className={`flex w-full items-center gap-2 rounded-xl px-1.5 py-1.5 text-sm transition ${
                    isSelected
                      ? 'bg-yellow-50 text-amber-800'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-950'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onChange(role.id);
                      onOpen();
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  >
                    <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${getRoleDotClass(role.name)}`} />
                    <span className="truncate font-medium">{getRoleLabel(role.name)}</span>
                    {isSelected && <Check size={16} className="ml-auto flex-shrink-0 text-amber-700" aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onOpen();
                      onManageRolePermissions(role);
                    }}
                    className="inline-flex h-8 flex-shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 text-xs font-bold text-gray-500 transition hover:border-yellow-300 hover:bg-yellow-50 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  >
                    <CheckSquare size={12} aria-hidden="true" />
                    Permisos
                  </button>
                </div>
              );
            })}
            <div className="mt-1 border-t border-gray-100 pt-1">
              <button
                type="button"
                onClick={() => {
                  onOpen();
                  onCreateRole();
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-amber-700 transition hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-300"
              >
                <Plus size={15} aria-hidden="true" />
                Crear nuevo rol
              </button>
            </div>
          </div>
        </>,
        document.body,
      )
    : null;

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white/90 px-3 py-2 text-left text-sm text-gray-900 shadow-sm outline-none transition hover:border-yellow-300 hover:bg-yellow-50/50 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-yellow-200 bg-yellow-50 text-amber-700">
            <Shield size={15} aria-hidden="true" />
          </span>
          <span className="truncate">{selected ? getRoleLabel(selected.name) : placeholder}</span>
        </span>
        <ChevronDown size={16} className={`flex-shrink-0 text-gray-400 transition ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {dropdownContent}
    </div>
  );
};

const InfoRow: React.FC<{ icon: React.ElementType; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div className="flex items-center justify-between py-3">
    <dt className="flex items-center gap-2 text-sm text-gray-500">
      <Icon size={14} className="flex-shrink-0 text-gray-400" aria-hidden="true" />
      {label}
    </dt>
    <dd className="text-sm font-semibold text-gray-900">{value}</dd>
  </div>
);

type UserDetailDrawerProps = {
  user: UserItem;
  roles: Role[];
  availableRoles: Role[];
  assigningRole: string;
  roleUpdating: boolean;
  stores: StoreData[];
  onAssigningRoleChange: (roleId: string) => void;
  onAssignRole: () => void;
  onRevokeRole: (user: UserItem, roleId: string) => void;
  onCreateRole: () => void;
  onManageRolePermissions: (role: Role) => void;
  onClose: () => void;
  onStatusAction: (user: UserItem, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') => void;
};

const UserDetailDrawer: React.FC<UserDetailDrawerProps> = ({
  user,
  roles,
  availableRoles,
  assigningRole,
  roleUpdating,
  stores,
  onAssigningRoleChange,
  onAssignRole,
  onRevokeRole,
  onCreateRole,
  onManageRolePermissions,
  onClose,
  onStatusAction,
}) => {
  const roleNames = getRoleNames(user);
  const status = String(user.status).toUpperCase();
  const isSuspended = status === 'SUSPENDED';
  const isInactive = status === 'INACTIVE';
  const [openRoleSelect, setOpenRoleSelect] = useState(false);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-gray-950/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Cerrar detalle de usuario"
      />

      <aside
        className="relative flex max-h-[min(92vh,820px)] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-gray-900/20"
        role="dialog"
        aria-modal="true"
        data-modal-root="true"
        aria-label="Detalle del usuario"
        onClick={() => { if (openRoleSelect) setOpenRoleSelect(false); }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur-xl">
          <div className="h-1 bg-[#F4B942]" />
          <div className="flex items-center justify-between px-5 py-3.5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">Gestión de acceso</p>
            <button
              type="button"
              onClick={onClose}
              className="ml-3 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-300"
              aria-label="Cerrar panel"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col divide-y divide-gray-100">
          {/* Perfil */}
          <div className="flex items-center gap-4 px-5 py-5">
            <Avatar user={user} size="lg" />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-xl font-bold text-gray-950" title={user.fullName}>
                {user.fullName || 'Usuario sin nombre'}
              </h3>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-gray-500">
                <Mail size={13} className="flex-shrink-0" aria-hidden="true" />
                <span className="truncate" title={user.email}>{user.email}</span>
              </p>
              <div className="mt-2.5">
                <StatusBadge status={user.status} />
              </div>
            </div>
          </div>

          {/* Información de la cuenta — filas estilo ref 1 */}
          <div className="px-5 py-4">
            <h3 className="mb-1 text-sm font-bold text-gray-950">Información de la cuenta</h3>
            <dl className="divide-y divide-gray-50">
              <InfoRow icon={Phone} label="Celular" value={(user as UserItem & { phone?: string }).phone ?? 'No registrado'} />
              <InfoRow icon={Calendar} label="Fecha de registro" value={formatDate(user.createdAt)} />
              <InfoRow icon={Clock} label="Último acceso" value={formatDate(user.lastLoginAt ?? undefined)} />
              <InfoRow
                icon={Store}
                label="Punto de venta"
                value={
                  stores.length > 0
                    ? stores.map(s => s.name).join(', ')
                    : roleNames.some(role => ['VENDOR', 'ADMIN'].includes(getCanonicalRoleKey(role)))
                      ? 'Sin tienda asignada'
                      : 'No aplica'
                }
              />
              <InfoRow
                icon={Shield}
                label="Roles activos"
                value={`${roleNames.length} rol${roleNames.length === 1 ? '' : 'es'}`}
              />
            </dl>
          </div>

          {/* Roles y permisos */}
          <div className="px-5 py-4">
            <h3 className="mb-3 text-sm font-bold text-gray-950">Roles y permisos</h3>

            {roleNames.length > 0 ? (
              <div className="mb-4 space-y-1.5">
                {roleNames.map((role, index) => {
                  const roleId = getRoleIdForName(user, roles, role);
                  const roleItem = roles.find(item => getCanonicalRoleKey(item.name) === getCanonicalRoleKey(role));
                  return (
                    <div
                      key={`${role}-${index}`}
                      className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 flex-shrink-0 rounded-full ${getRoleDotClass(role)}`} aria-hidden="true" />
                        <span className="text-sm font-semibold text-gray-800">{getRoleLabel(role)}</span>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => roleItem && onManageRolePermissions(roleItem)}
                          disabled={!roleItem}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-amber-700 transition hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:cursor-not-allowed disabled:text-gray-400"
                        >
                          <CheckSquare size={12} aria-hidden="true" />
                          Permisos
                        </button>
                        <button
                          type="button"
                          onClick={() => roleId && onRevokeRole(user, roleId)}
                          disabled={!roleId || roleUpdating}
                          className="text-xs font-bold text-red-600 transition hover:text-red-800 focus:outline-none disabled:cursor-not-allowed disabled:text-gray-400"
                        >
                          Retirar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mb-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                Este usuario no tiene roles asignados.
              </p>
            )}

            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Asignar nuevo rol</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <RoleSelect
                  id="role-select"
                  roles={availableRoles}
                  value={assigningRole}
                  disabled={roleUpdating}
                  isOpen={openRoleSelect}
                  onOpen={() => setOpenRoleSelect(v => !v)}
                  onChange={onAssigningRoleChange}
                  onCreateRole={onCreateRole}
                  onManageRolePermissions={onManageRolePermissions}
                />
              </div>
              <button
                type="button"
                onClick={onAssignRole}
                disabled={!assigningRole || roleUpdating}
                className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 px-4 text-sm font-bold text-white shadow-md shadow-yellow-500/20 transition hover:from-yellow-500 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {roleUpdating ? '...' : 'Asignar'}
              </button>
            </div>
          </div>

          {/* Estado de la cuenta — estilo "Delete Profile" de ref 2 */}
          <div className="px-5 py-4">
            <h3 className="text-sm font-bold text-gray-950">Estado de la cuenta</h3>
            <p className="mb-4 mt-1 text-sm text-gray-500">
              {isInactive
                ? 'La cuenta fue eliminada y no se puede reactivar desde la plataforma.'
                : isSuspended
                  ? 'La cuenta esta suspendida. Puedes reactivarla desde este panel.'
                  : 'Desde aqui puedes eliminar o suspender la cuenta. Ambas acciones requieren una razon antes de aplicarse.'}
            </p>
            {isInactive ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Trash2 size={16} aria-hidden="true" />
                  Cuenta eliminada
                </div>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Esta accion es irreversible. Para recuperar acceso se debe crear una cuenta nueva.
                </p>
              </div>
            ) : isSuspended ? (
              <button
                type="button"
                onClick={() => onStatusAction(user, 'ACTIVE')}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                <UserCheck size={16} aria-hidden="true" />
                Reactivar cuenta
              </button>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => onStatusAction(user, 'INACTIVE')}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  <Trash2 size={16} aria-hidden="true" />
                  Eliminar cuenta
                </button>
                <button
                  type="button"
                  onClick={() => onStatusAction(user, 'SUSPENDED')}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                >
                  <UserMinus size={16} aria-hidden="true" />
                  Suspender cuenta
                </button>
              </div>
            )}
            <p className="mt-2.5 text-xs text-gray-400">
              Las acciones de estado requieren confirmacion antes de aplicarse.
            </p>
          </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

const PermissionToggleItem: React.FC<{
  permission: Permission;
  checked: boolean;
  disabled: boolean;
  borderTop: boolean;
  onToggle: (permissionId: string) => void;
}> = ({ permission, checked, disabled, borderTop, onToggle }) => (
  <label
    htmlFor={`user-role-perm-${permission.id}`}
    className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-yellow-50/60 ${borderTop ? 'border-t border-gray-100' : ''} ${disabled ? 'cursor-default opacity-60' : ''}`}
  >
    <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition ${checked ? 'border-yellow-400 bg-yellow-400' : 'border-gray-300 bg-white'}`}>
      {checked && (
        <svg viewBox="0 0 10 8" fill="none" className="h-3 w-3" aria-hidden="true">
          <path d="M1 4l3 3 5-6" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
    <input
      id={`user-role-perm-${permission.id}`}
      type="checkbox"
      className="sr-only"
      checked={checked}
      onChange={() => onToggle(permission.id)}
      disabled={disabled}
    />
    <span className="text-sm font-medium text-gray-700">{permission.action}</span>
  </label>
);

const RolePermissionsDialog: React.FC<{
  dialog: RoleDialogState;
  groupedPermissions: Record<string, Permission[]>;
  selectedPerms: Set<string>;
  loadingPerms: boolean;
  saving: boolean;
  readOnly: boolean;
  newRoleName: string;
  newRoleDesc: string;
  permSearch: string;
  onNewRoleNameChange: (value: string) => void;
  onNewRoleDescChange: (value: string) => void;
  onPermSearchChange: (value: string) => void;
  onTogglePermission: (permissionId: string) => void;
  onCancel: () => void;
  onSave: () => void;
}> = ({
  dialog,
  groupedPermissions,
  selectedPerms,
  loadingPerms,
  saving,
  readOnly,
  newRoleName,
  newRoleDesc,
  permSearch,
  onNewRoleNameChange,
  onNewRoleDescChange,
  onPermSearchChange,
  onTogglePermission,
  onCancel,
  onSave,
}) => {
  const isCreate = dialog.mode === 'create';
  const role = dialog.mode === 'edit' ? dialog.role : null;
  const title = isCreate ? 'Crear nuevo rol' : role?.name ?? '';
  const permissionEntries = Object.entries(groupedPermissions);
  const canSave = isCreate
    ? newRoleName.trim().length > 0 && !saving && !loadingPerms
    : !readOnly && !saving && !loadingPerms;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        aria-label="Cerrar permisos del rol"
        className="absolute inset-0 bg-gray-950/45 backdrop-blur-sm"
        onClick={onCancel}
        disabled={saving}
      />
      <div
        className="relative flex max-h-[min(92vh,840px)] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-gray-900/20"
        role="dialog"
        aria-modal="true"
        data-modal-root="true"
      >
        <div className="h-1 flex-shrink-0 bg-[#F4B942]" />
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border ${getTypeClass(role?.isSystem ?? false)}`}>
              {isCreate ? <Plus size={20} aria-hidden="true" /> : <Shield size={20} aria-hidden="true" />}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                {isCreate ? 'Nuevo rol' : 'Permisos del rol'}
              </p>
              <h2 className="truncate text-xl font-bold text-gray-950">{title}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="ml-3 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:opacity-50"
            aria-label="Cerrar modal"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {isCreate && (
          <div className="grid gap-3 border-b border-gray-100 px-5 py-4 sm:grid-cols-[1fr_1.2fr] sm:px-6">
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-amber-700">Nombre del rol</span>
              <input
                autoFocus
                value={newRoleName}
                onChange={event => onNewRoleNameChange(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter' && canSave) onSave(); }}
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm font-semibold uppercase outline-none placeholder:normal-case placeholder:text-gray-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                placeholder="Ej. SUPERVISOR"
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Descripcion</span>
              <input
                value={newRoleDesc}
                onChange={event => onNewRoleDescChange(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter' && canSave) onSave(); }}
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none placeholder:text-gray-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                placeholder="Descripcion opcional"
              />
            </label>
          </div>
        )}

        {readOnly && (
          <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50/70 px-5 py-3 sm:px-6">
            <Lock size={14} className="flex-shrink-0 text-amber-700" aria-hidden="true" />
            <p className="text-xs font-semibold text-amber-800">
              Los roles del sistema no pueden modificarse.
            </p>
          </div>
        )}

        <div className="border-b border-gray-100 px-5 py-3 sm:px-6">
          <label className="relative block">
            <span className="sr-only">Filtrar permisos</span>
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              type="text"
              value={permSearch}
              onChange={event => onPermSearchChange(event.target.value)}
              placeholder="Filtrar permisos..."
              className="h-12 w-full rounded-2xl border border-gray-200 bg-white pl-11 pr-4 text-sm outline-none placeholder:text-gray-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
            />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {loadingPerms ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
            </div>
          ) : permissionEntries.length === 0 ? (
            <p className="py-10 text-center text-sm font-medium text-gray-400">Sin permisos disponibles</p>
          ) : (
            <div className="space-y-5">
              {permissionEntries.map(([resource, resourcePermissions]) => (
                <section key={resource}>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">{resource}</h3>
                  <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                    {resourcePermissions.map((permission, index) => (
                      <PermissionToggleItem
                        key={permission.id}
                        permission={permission}
                        checked={selectedPerms.has(permission.id)}
                        disabled={readOnly}
                        borderTop={index > 0}
                        onToggle={onTogglePermission}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 bg-white px-5 py-4 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onSave}
              disabled={!canSave}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-yellow-400 px-4 text-sm font-bold text-gray-950 transition hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Guardando...' : isCreate ? 'Crear rol' : 'Guardar permisos'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ConfirmStatusDialog: React.FC<{
  action: Exclude<ConfirmAction, null>;
  loading: boolean;
  onCancel: () => void;
  onConfirm: (reason?: string) => void;
}> = ({ action, loading, onCancel, onConfirm }) => {
  const [reason, setReason] = useState('');
  const requiresReason = action.status === 'INACTIVE' || action.status === 'SUSPENDED';
  const canConfirm = !requiresReason || reason.trim().length > 0;
  const buttonClass = action.tone === 'danger'
    ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-300'
    : action.tone === 'success'
      ? 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-300'
      : 'bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-300';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-gray-950/45 backdrop-blur-sm"
        onClick={onCancel}
        aria-label="Cancelar cambio de estado"
      />
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-6 shadow-2xl shadow-gray-900/20 backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[#F4B942]" />
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-white text-amber-700 shadow-lg shadow-yellow-200/40">
          <AlertCircle size={24} aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-bold text-gray-950">{action.title}</h2>
        <p className="mt-3 text-sm leading-6 text-gray-600">{action.description}</p>
        <div className="mt-5 rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
          <p className="text-sm font-bold text-gray-950">{action.user.fullName || 'Usuario sin nombre'}</p>
          <p className="mt-1 text-sm text-gray-500">{action.user.email}</p>
        </div>
        {requiresReason && (
          <label className="mt-5 block">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Justificacion <span className="text-red-500">*</span>
            </span>
            <textarea
              value={reason}
              onChange={event => setReason(event.target.value)}
              rows={4}
              className="mt-2 w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
              placeholder={action.status === 'SUSPENDED' ? 'Explica por que se suspende la cuenta...' : 'Explica por que se elimina la cuenta...'}
            />
            <span className="mt-1.5 block text-xs text-gray-400">
              Debes escribir una razon antes de confirmar esta accion.
            </span>
          </label>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(requiresReason ? reason.trim() : undefined)}
            disabled={loading || !canConfirm}
            className={`inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70 ${buttonClass}`}
          >
            {loading ? 'Aplicando...' : action.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

type FilterChipOption = { value: string; label: string };

const FilterChip: React.FC<{
  label: string;
  icon: React.ElementType;
  value: string;
  options: FilterChipOption[];
  isOpen: boolean;
  onOpen: () => void;
  onSelect: (value: string) => void;
  onClear: () => void;
}> = ({ label, icon: Icon, value, options, isOpen, onOpen, onSelect, onClear }) => {
  const selectedOption = options.find(opt => opt.value === value);
  const isActive = !!value;
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = React.useState<{ top: number; left: number } | null>(null);

  const handleOpen = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 6, left: rect.left });
    }
    onOpen();
  };

  const dropdownContent = isOpen && dropdownPos
    ? createPortal(
        <>
          {/* overlay transparente para cerrar y asegurar que nada quede por encima */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99998 }}
            onClick={onOpen}
          />
          <div
            style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, zIndex: 99999 }}
            className="min-w-[170px] overflow-hidden rounded-2xl border border-gray-100 bg-white p-1.5 shadow-xl shadow-gray-300/50"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onSelect('')}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                !value ? 'bg-yellow-50 text-amber-800' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Todos
              {!value && <Check size={14} className="ml-auto text-amber-700" aria-hidden="true" />}
            </button>
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSelect(opt.value)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                  value === opt.value ? 'bg-yellow-50 text-amber-800' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {opt.label}
                {value === opt.value && <Check size={14} className="ml-auto text-amber-700" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </>,
        document.body,
      )
    : null;

  return (
    <div className="relative" onClick={event => event.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-yellow-300 ${
          isActive
            ? 'border-yellow-300 bg-yellow-50 text-amber-800'
            : 'border-gray-200 bg-white/80 text-gray-600 hover:border-yellow-200 hover:bg-yellow-50/50 hover:text-amber-700'
        }`}
      >
        <Icon size={13} aria-hidden="true" />
        <span>{isActive ? `${label}: ${selectedOption?.label ?? value}` : label}</span>
        {isActive ? (
          <span
            role="button"
            tabIndex={0}
            onClick={event => { event.stopPropagation(); onClear(); }}
            onKeyDown={event => { if (event.key === 'Enter') onClear(); }}
            className="ml-0.5 rounded-full p-0.5 hover:bg-yellow-100"
            aria-label={`Limpiar filtro ${label}`}
          >
            <X size={11} aria-hidden="true" />
          </span>
        ) : (
          <ChevronDown size={13} className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        )}
      </button>
      {dropdownContent}
    </div>
  );
};

export default UsersPage;
