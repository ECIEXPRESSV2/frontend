import { apiFetch } from './api';

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  createdAt: string;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
}

export const getRoles = (token: string) =>
  apiFetch<Role[]>('/roles', token);

export const createRole = (data: { name: string; description?: string }, token: string) =>
  apiFetch<Role>('/roles', token, { method: 'POST', body: JSON.stringify(data) });

export const getPermissions = (token: string) =>
  apiFetch<Permission[]>('/permissions', token);

export const getRolePermissions = (roleId: string, token: string) =>
  apiFetch<Permission[]>(`/roles/${roleId}/permissions`, token);

export const setRolePermissions = (roleId: string, permissionIds: string[], token: string) =>
  apiFetch<unknown>(`/roles/${roleId}/permissions`, token, {
    method: 'PUT',
    body: JSON.stringify({ permissionIds }),
  });
