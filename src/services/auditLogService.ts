import { apiClient } from '../utils/api';

export type AuditEvent =
  | 'role_created' | 'role_updated' | 'role_deleted'
  | 'permission_granted_to_role' | 'permission_revoked_from_role'
  | 'role_assigned_to_user' | 'role_revoked_from_user'
  | 'permission_granted_to_user' | 'permission_revoked_from_user'
  | 'record_grant_created' | 'record_grant_revoked';

export interface AuditLogEntry {
  id: number;
  tenant_id: number | null;
  actor_id: number | null;
  event: AuditEvent;
  target_type: string | null;
  target_id: number | null;
  target_label: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  actor?: { id: number; name: string } | null;
}

export interface AuditLogFilters {
  actor_id?: number;
  event?: AuditEvent | string;
  target_type?: string;
  from?: string;
  to?: string;
  per_page?: number;
  page?: number;
}

interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

class AuditLogService {
  async list(filters: AuditLogFilters = {}): Promise<{ data: PaginatedResponse<AuditLogEntry> }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
    });
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get(`/audit-log${qs}`);
  }
}

export default new AuditLogService();
