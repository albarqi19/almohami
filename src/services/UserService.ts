import { apiClient } from '../utils/api';
import type { ApiResponse, PaginatedResponse } from '../utils/api';
import { cacheManager, CACHE_KEYS } from '../utils/cacheManager';

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  national_id?: string;
  phone?: string;
  avatar?: string;
  is_active?: boolean;
  last_login_at?: string;
  created_at?: string;
  updated_at?: string;
  department?: string;
  status?: 'active' | 'inactive' | 'pending';
}

export interface CreateUserForm {
  name: string;
  email?: string;
  role: string;
  phone?: string;
  national_id: string;
}

export interface UpdateUserForm {
  name: string;
  email: string;
  role: string;
  phone?: string;
  national_id?: string;
  is_active?: boolean;
}

export interface UserFilters {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export class UserService {
  // جلب جميع المستخدمين مع pagination وfiltration
  static async getAllUsers(filters: UserFilters = {}): Promise<PaginatedResponse<User>> {
    try {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const queryString = params.toString();
      const endpoint = queryString ? `/users?${queryString}` : '/users';

      const response = await apiClient.get<ApiResponse<PaginatedResponse<User>>>(endpoint);

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'فشل في جلب المستخدمين');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  // جلب مستخدم واحد
  static async getUser(id: string): Promise<User> {
    try {
      const response = await apiClient.get<ApiResponse<User>>(`/users/${id}`);

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'فشل في جلب بيانات المستخدم');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  // إنشاء مستخدم جديد
  static async createUser(userData: CreateUserForm): Promise<any> {
    try {
      const response = await apiClient.post<ApiResponse<any>>('/users', userData);

      if (response.success && response.data) {
        // ✅ Invalidate cache after creating user
        cacheManager.invalidate(CACHE_KEYS.USERS);
        return response.data; // يحتوي على user, pin, temporary_password
      } else {
        throw new Error(response.message || 'فشل في إنشاء المستخدم');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // تحديث المستخدم
  static async updateUser(id: string, userData: UpdateUserForm): Promise<User> {
    try {
      const response = await apiClient.put<ApiResponse<User>>(`/users/${id}`, userData);

      if (response.success && response.data) {
        // ✅ Invalidate cache after updating user
        cacheManager.invalidate(CACHE_KEYS.USERS);
        return response.data;
      } else {
        throw new Error(response.message || 'فشل في تحديث المستخدم');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // حذف المستخدم
  static async deleteUser(id: string): Promise<void> {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(`/users/${id}`);

      if (!response.success) {
        throw new Error(response.message || 'فشل في حذف المستخدم');
      }
      // ✅ Invalidate cache after deleting user
      cacheManager.invalidate(CACHE_KEYS.USERS);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // تحديث حالة المستخدم (تفعيل/إلغاء تفعيل)
  static async updateUserStatus(id: string, isActive: boolean): Promise<User> {
    try {
      const response = await apiClient.put<ApiResponse<User>>(`/users/${id}`, { is_active: isActive });

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'فشل في تحديث حالة المستخدم');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  // جلب المحامين فقط (مع caching)
  static async getLawyers(): Promise<User[]> {
    try {
      // Check cache first
      const cacheKey = CACHE_KEYS.LAWYERS;
      const cached = cacheManager.get<User[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await apiClient.get<ApiResponse<User[]>>('/users?role=lawyer');

      if (response.success && response.data) {
        // إذا كانت البيانات في format pagination
        let lawyers: User[];
        if (typeof response.data === 'object' && 'data' in response.data) {
          lawyers = (response.data as any).data;
        } else {
          lawyers = response.data;
        }

        // Cache the result
        cacheManager.set(cacheKey, lawyers);
        return lawyers;
      } else {
        throw new Error(response.message || 'فشل في جلب المحامين');
      }
    } catch (error) {
      console.error('Error fetching lawyers:', error);
      throw error;
    }
  }

  // جلب العملاء فقط (مع caching)
  static async getClients(): Promise<User[]> {
    try {
      // Check cache first
      const cacheKey = CACHE_KEYS.CLIENTS;
      const cached = cacheManager.get<User[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await apiClient.get<ApiResponse<User[]>>('/users?role=client');

      if (response.success && response.data) {
        // إذا كانت البيانات في format pagination
        let clients: User[];
        if (typeof response.data === 'object' && 'data' in response.data) {
          clients = (response.data as any).data;
        } else {
          clients = response.data;
        }

        // Cache the result
        cacheManager.set(cacheKey, clients);
        return clients;
      } else {
        throw new Error(response.message || 'فشل في جلب العملاء');
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw error;
    }
  }

  // جلب إحصائيات المستخدمين للوحة الإدارة
  static async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    usersByRole: { [role: string]: number };
    recentUsers: User[];
  }> {
    try {
      const response = await apiClient.get<ApiResponse<any>>('/users/stats');

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'فشل في جلب إحصائيات المستخدمين');
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  }
}
