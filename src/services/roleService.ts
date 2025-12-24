import { apiClient } from '../utils/api';

export interface Role {
  id: string | number;
  name: string;
  display_name: string;
  description: string;
  guard_name: string;
  tenant_id: number | null;
  users_count: number;
  permissions_count: number;
  permissions: string[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRoleData {
  name: string;
  display_name: string;
  description?: string;
  permissions?: string[];
}

export interface UpdateRoleData {
  display_name?: string;
  description?: string;
  permissions?: string[];
}

export interface RoleFilters {
  search?: string;
  type?: 'system' | 'custom' | 'all';
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

class RoleService {
  /**
   * الحصول على جميع الأدوار
   */
  async getAllRoles(filters: RoleFilters = {}) {
    try {
      console.log('🔍 RoleService: Fetching roles');
      console.log('🔍 RoleService: Filters:', filters);

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await apiClient.get(`/roles${queryString}`);

      console.log('✅ RoleService: Response received:', response);
      return response;
    } catch (error: any) {
      console.error('❌ RoleService Error fetching roles:', error);
      console.error('❌ RoleService Error response:', error.response);
      throw error.response?.data || error;
    }
  }

  /**
   * الحصول على دور محدد
   */
  async getRoleById(id: string | number) {
    try {
      const response = await apiClient.get(`/roles/${id}`);
      return response;
    } catch (error: any) {
      console.error('Error fetching role:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * إنشاء دور جديد
   */
  async createRole(data: CreateRoleData) {
    try {
      const response = await apiClient.post('/roles', data);
      return response;
    } catch (error: any) {
      console.error('Error creating role:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * تحديث دور
   */
  async updateRole(id: string | number, data: UpdateRoleData) {
    try {
      const response = await apiClient.put(`/roles/${id}`, data);
      return response;
    } catch (error: any) {
      console.error('Error updating role:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * حذف دور
   */
  async deleteRole(id: string | number) {
    try {
      const response = await apiClient.delete(`/roles/${id}`);
      return response;
    } catch (error: any) {
      console.error('Error deleting role:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * إضافة صلاحيات لدور
   */
  async attachPermissions(id: string | number, permissions: string[]) {
    try {
      const response = await apiClient.post(
        `/roles/${id}/permissions/attach`,
        { permissions }
      );
      return response;
    } catch (error: any) {
      console.error('Error attaching permissions:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * إزالة صلاحيات من دور
   */
  async detachPermissions(id: string | number, permissions: string[]) {
    try {
      const response = await apiClient.post(
        `/roles/${id}/permissions/detach`,
        { permissions }
      );
      return response;
    } catch (error: any) {
      console.error('Error detaching permissions:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * مزامنة صلاحيات الدور
   */
  async syncPermissions(id: string | number, permissions: string[]) {
    try {
      const response = await apiClient.post(
        `/roles/${id}/permissions/sync`,
        { permissions }
      );
      return response;
    } catch (error: any) {
      console.error('Error syncing permissions:', error);
      throw error.response?.data || error;
    }
  }
}

export default new RoleService();
