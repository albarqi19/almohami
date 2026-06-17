import { apiClient } from '../utils/api';
import type { ApiResponse, PaginatedResponse } from '../utils/api';
import type { Wekala, WekalaFilters } from '../types';

export class WekalatService {
  /**
   * إصلاح عكس الأطراف في وكالات ناجز.
   * ناجز يضع في حقل `agents` الموكِّلين (الأطراف الخارجية) وفي حقل `clients` الوكلاء
   * (محامي المكتب) — أي عكس المعنى الشرعي. لذا نعكسهما هنا في نقطة واحدة فيستفيد
   * كل المستهلكين (القائمة + التفاصيل + البحث). نقصر العكس على source==='najiz'
   * حتى لا نكسر الوكالات المُدخلة يدوياً (المخزّنة بالاتجاه الصحيح أصلاً).
   */
  private static fixNajizParties(wekala: Wekala): Wekala {
    if (!wekala || wekala.source !== 'najiz') return wekala;
    return { ...wekala, agents: wekala.clients ?? [], clients: wekala.agents ?? [] };
  }

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
      return {
        ...response.data,
        data: (response.data.data ?? []).map(w => this.fixNajizParties(w)),
      };
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
      return this.fixNajizParties(response.data);
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
   * إنشاء وكالة يدوياً
   */
  static async createWekala(data: {
    number: string;
    type?: string;
    status?: string;
    issue_date_hijri?: string;
    issue_date_gregorian?: string;
    expiry_date_hijri?: string;
    expiry_date_gregorian?: string;
    notary_name?: string;
    issuer?: string;
    agency_text?: string;
    agents?: { name: string; id_number?: string; id_type?: string; nationality?: string }[];
    clients?: { name: string; id_number?: string; id_type?: string; nationality?: string }[];
  }): Promise<Wekala> {
    const response = await apiClient.post<ApiResponse<Wekala>>('/wekalat', data);

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في إنشاء الوكالة');
    }
  }

  /**
   * تعديل وكالة
   */
  static async updateWekala(id: number, data: Record<string, unknown>): Promise<Wekala> {
    const response = await apiClient.put<ApiResponse<Wekala>>(`/wekalat/${id}`, data);

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في تعديل الوكالة');
    }
  }

  /**
   * حذف وكالة يدوية
   */
  static async deleteWekala(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/wekalat/${id}`);

    if (!response.success) {
      throw new Error(response.message || 'فشل في حذف الوكالة');
    }
  }

  /**
   * الحصول على إعداد خصوصية الوكالات
   */
  static async getVisibilitySetting(): Promise<string> {
    try {
      const response = await apiClient.get<ApiResponse<{ key: string; value: string }>>('/tenant/advanced-settings/wekala_visibility');
      return response.success && response.data ? response.data.value : 'all';
    } catch {
      return 'all';
    }
  }

  /**
   * تحديث إعداد خصوصية الوكالات
   */
  static async updateVisibilitySetting(value: 'all' | 'assigned'): Promise<boolean> {
    const response = await apiClient.put<ApiResponse<void>>('/tenant/advanced-settings/wekala_visibility', { value });
    if (!response.success) {
      throw new Error(response.message || 'فشل في تحديث الإعداد');
    }
    return true;
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
