import { apiClient } from '../utils/api';

export interface Permission {
  id: string | number;
  name: string;
  display_name: string;
  description: string;
  category: string;
  category_display: string;
  guard_name: string;
  tenant_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePermissionData {
  name: string;
  display_name: string;
  description?: string;
  category: 'cases' | 'tasks' | 'documents' | 'reports' | 'admin' | 'clients' | 'other';
}

export interface UpdatePermissionData {
  display_name?: string;
  description?: string;
  category?: 'cases' | 'tasks' | 'documents' | 'reports' | 'admin' | 'clients' | 'other';
}

export interface PermissionFilters {
  search?: string;
  category?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
  all?: boolean;
  grouped?: boolean;
}

export interface GroupedPermission {
  category: string;
  category_display: string;
  permissions: Permission[];
}

class PermissionService {
  /**
   * الحصول على جميع الصلاحيات
   */
  async getAllPermissions(filters: PermissionFilters = {}) {
    try {
      console.log('🔍 PermissionService: Fetching permissions');
      console.log('🔍 PermissionService: Filters:', filters);

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await apiClient.get(`/permissions${queryString}`);

      console.log('✅ PermissionService: Response received:', response);
      return response;
    } catch (error: any) {
      console.error('❌ PermissionService Error fetching permissions:', error);
      console.error('❌ PermissionService Error response:', error.response);
      throw error.response?.data || error;
    }
  }

  /**
   * الحصول على الصلاحيات مجمعة حسب الفئة
   */
  async getGroupedPermissions(): Promise<{ data: GroupedPermission[] }> {
    try {
      const response = await apiClient.get('/permissions/grouped') as { data: GroupedPermission[] };
      return response;
    } catch (error: any) {
      console.error('Error fetching grouped permissions:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * الحصول على صلاحية محددة
   */
  async getPermissionById(id: string | number) {
    try {
      const response = await apiClient.get(`/permissions/${id}`);
      return response;
    } catch (error: any) {
      console.error('Error fetching permission:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * إنشاء صلاحية جديدة
   */
  async createPermission(data: CreatePermissionData) {
    try {
      const response = await apiClient.post('/permissions', data);
      return response;
    } catch (error: any) {
      console.error('Error creating permission:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * تحديث صلاحية
   */
  async updatePermission(id: string | number, data: UpdatePermissionData) {
    try {
      const response = await apiClient.put(`/permissions/${id}`, data);
      return response;
    } catch (error: any) {
      console.error('Error updating permission:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * حذف صلاحية
   */
  async deletePermission(id: string | number) {
    try {
      const response = await apiClient.delete(`/permissions/${id}`);
      return response;
    } catch (error: any) {
      console.error('Error deleting permission:', error);
      throw error.response?.data || error;
    }
  }
}

export default new PermissionService();
