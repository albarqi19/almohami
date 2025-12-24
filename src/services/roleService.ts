import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

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
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    };
  }

  /**
   * الحصول على جميع الأدوار
   */
  async getAllRoles(filters: RoleFilters = {}) {
    try {
      console.log('🔍 RoleService: Fetching roles from:', `${API_BASE_URL}/roles`);
      console.log('🔍 RoleService: Filters:', filters);
      console.log('🔍 RoleService: Headers:', this.getAuthHeaders());

      const response = await axios.get(`${API_BASE_URL}/roles`, {
        headers: this.getAuthHeaders(),
        params: filters
      });

      console.log('✅ RoleService: Response received:', response.data);
      return response.data;
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
      const response = await axios.get(`${API_BASE_URL}/roles/${id}`, {
        headers: this.getAuthHeaders()
      });
      return response.data;
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
      const response = await axios.post(`${API_BASE_URL}/roles`, data, {
        headers: this.getAuthHeaders()
      });
      return response.data;
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
      const response = await axios.put(`${API_BASE_URL}/roles/${id}`, data, {
        headers: this.getAuthHeaders()
      });
      return response.data;
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
      const response = await axios.delete(`${API_BASE_URL}/roles/${id}`, {
        headers: this.getAuthHeaders()
      });
      return response.data;
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
      const response = await axios.post(
        `${API_BASE_URL}/roles/${id}/permissions/attach`,
        { permissions },
        { headers: this.getAuthHeaders() }
      );
      return response.data;
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
      const response = await axios.post(
        `${API_BASE_URL}/roles/${id}/permissions/detach`,
        { permissions },
        { headers: this.getAuthHeaders() }
      );
      return response.data;
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
      const response = await axios.post(
        `${API_BASE_URL}/roles/${id}/permissions/sync`,
        { permissions },
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error syncing permissions:', error);
      throw error.response?.data || error;
    }
  }
}

export default new RoleService();
