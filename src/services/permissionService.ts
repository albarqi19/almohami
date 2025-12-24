import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

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
   * الحصول على جميع الصلاحيات
   */
  async getAllPermissions(filters: PermissionFilters = {}) {
    try {
      console.log('🔍 PermissionService: Fetching permissions from:', `${API_BASE_URL}/permissions`);
      console.log('🔍 PermissionService: Filters:', filters);
      console.log('🔍 PermissionService: Headers:', this.getAuthHeaders());

      const response = await axios.get(`${API_BASE_URL}/permissions`, {
        headers: this.getAuthHeaders(),
        params: filters
      });

      console.log('✅ PermissionService: Response received:', response.data);
      return response.data;
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
      const response = await axios.get(`${API_BASE_URL}/permissions/grouped`, {
        headers: this.getAuthHeaders()
      });
      return response.data;
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
      const response = await axios.get(`${API_BASE_URL}/permissions/${id}`, {
        headers: this.getAuthHeaders()
      });
      return response.data;
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
      const response = await axios.post(`${API_BASE_URL}/permissions`, data, {
        headers: this.getAuthHeaders()
      });
      return response.data;
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
      const response = await axios.put(`${API_BASE_URL}/permissions/${id}`, data, {
        headers: this.getAuthHeaders()
      });
      return response.data;
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
      const response = await axios.delete(`${API_BASE_URL}/permissions/${id}`, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error: any) {
      console.error('Error deleting permission:', error);
      throw error.response?.data || error;
    }
  }
}

export default new PermissionService();
