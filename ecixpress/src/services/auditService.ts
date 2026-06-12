import { apiFetch } from './api';

export interface AuditLog {
  id: string;
  actorId?: string;
  targetId: string;
  targetType: string;
  action: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  createdAt: string;
}

export interface PaginatedAudit {
  data: AuditLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const getAuditLogs = (
  token: string,
  params?: Record<string, string>
) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<PaginatedAudit | AuditLog[]>(`/audit-logs${qs}`, token);
};
