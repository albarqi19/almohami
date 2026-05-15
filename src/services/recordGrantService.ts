import { apiClient } from '../utils/api';

export type RecordGrantResourceType = 'case' | 'session' | 'document' | 'task';
export type RecordGrantPermission = 'view' | 'edit' | 'comment';

export interface RecordGrant {
  id: number;
  tenant_id: number;
  user_id: number;
  resource_type: RecordGrantResourceType;
  resource_id: number;
  permission: RecordGrantPermission;
  granted_by: number;
  granted_at: string;
  expires_at: string | null;
  reason: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  user?: { id: number; name: string; email?: string };
  grantor?: { id: number; name: string };
}

export interface CreateRecordGrantData {
  user_id: number;
  resource_type: RecordGrantResourceType;
  resource_id: number;
  permission: RecordGrantPermission;
  expires_at?: string | null;
  reason?: string | null;
}

export interface RecordGrantFilters {
  user_id?: number;
  resource_type?: RecordGrantResourceType;
  status?: 'active' | 'expired';
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

class RecordGrantService {
  async list(filters: RecordGrantFilters = {}): Promise<{ data: PaginatedResponse<RecordGrant> }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.append(k, String(v));
    });
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get(`/record-grants${qs}`);
  }

  async create(data: CreateRecordGrantData): Promise<{ data: RecordGrant; message: string }> {
    return apiClient.post('/record-grants', data);
  }

  async show(id: number): Promise<{ data: RecordGrant }> {
    return apiClient.get(`/record-grants/${id}`);
  }

  async revoke(id: number): Promise<{ message: string }> {
    return apiClient.delete(`/record-grants/${id}`);
  }
}

export default new RecordGrantService();
