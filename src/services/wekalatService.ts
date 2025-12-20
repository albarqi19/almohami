import { apiClient } from '../utils/api';
import type { ApiResponse, PaginatedResponse } from '../utils/api';
import type { Wekala, WekalaFilters } from '../types';

export class WekalatService {
  /**
   * الحصول على قائمة الوكالات مع الفلترة والتصفح
   */
  static async getWekalat(filters: WekalaFilters = {}): Promise<PaginatedResponse<Wekala>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const queryString = params.toString();
    const endpoint = queryString ? `/najiz/wekalat?${queryString}` : '/najiz/wekalat';
    
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Wekala>>>(endpoint);
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب الوكالات');
    }
  }

  /**
   * الحصول على تفاصيل وكالة محددة
   */
  static async getWekala(id: string | number): Promise<Wekala> {
    const response = await apiClient.get<ApiResponse<Wekala>>(`/najiz/wekalat/${id}`);
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب تفاصيل الوكالة');
    }
  }

  /**
   * مزامنة الوكالات من ناجز (يستخدمها الإضافة)
   */
  static async syncWekalat(wekalat: any[]): Promise<{ success: boolean; message: string; count: number }> {
    const response = await apiClient.post<ApiResponse<{ count: number }>>('/najiz/wekalat/sync', {
      wekalat
    });
    
    if (response.success) {
      return {
        success: true,
        message: response.message || 'تم مزامنة الوكالات بنجاح',
        count: response.data?.count || 0
      };
    } else {
      throw new Error(response.message || 'فشل في مزامنة الوكالات');
    }
  }

  /**
   * إحصائيات الوكالات
   */
  static async getWekalatStats(): Promise<{
    total: number;
    approved: number;
    expired: number;
    cancelled: number;
    pending: number;
  }> {
    const response = await apiClient.get<ApiResponse<{
      total: number;
      approved: number;
      expired: number;
      cancelled: number;
      pending: number;
    }>>('/najiz/wekalat/stats');
    
    if (response.success && response.data) {
      return response.data;
    } else {
      // إرجاع قيم افتراضية
      return {
        total: 0,
        approved: 0,
        expired: 0,
        cancelled: 0,
        pending: 0
      };
    }
  }
}
