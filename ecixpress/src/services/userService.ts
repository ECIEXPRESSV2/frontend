import { apiFetch } from './api';

export interface UserItem {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  lastLoginAt?: string | null;
  createdAt: string;
  roles?: string[] | Array<{ id: string; name: string }>;
}

export interface PaginatedUsers {
  data: UserItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UpdateProfileDto {
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
}

export const getMe = (token: string) =>
  apiFetch<Record<string, unknown>>('/users/me', token);

export const updateMe = (data: UpdateProfileDto, token: string) =>
  apiFetch<Record<string, unknown>>('/users/me', token, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const getUsers = (token: string, params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<PaginatedUsers>(`/users${qs}`, token);
};

export const getUserById = (id: string, token: string) =>
  apiFetch<UserItem>(`/users/${id}`, token);

export const updateUserStatus = (
  id: string,
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
  token: string
) =>
  apiFetch<UserItem>(`/users/${id}/status`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const assignRole = (userId: string, roleId: string, token: string) =>
  apiFetch<unknown>(`/users/${userId}/roles`, token, {
    method: 'POST',
    body: JSON.stringify({ roleId }),
  });

export const revokeRole = (userId: string, roleId: string, token: string) =>
  apiFetch<void>(`/users/${userId}/roles/${roleId}`, token, { method: 'DELETE' });

export const bulkUpdateStatus = (
  userIds: string[],
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
  token: string,
) =>
  apiFetch<{ updated: number; users: UserItem[] }>('/users/bulk/status', token, {
    method: 'PATCH',
    body: JSON.stringify({ userIds, status }),
  });

export const bulkAssignRole = (userIds: string[], roleId: string, token: string) =>
  apiFetch<{ updated: number; roleId: string; roleName: string }>('/users/bulk/roles', token, {
    method: 'POST',
    body: JSON.stringify({ userIds, roleId }),
  });
