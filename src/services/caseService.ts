import { apiClient } from '../utils/api';
import type { ApiResponse, PaginatedResponse } from '../utils/api';
import type { Case } from '../types';
import { cacheManager, CACHE_KEYS } from '../utils/cacheManager';

export interface CaseFilters {
  status?: string;
  case_type?: string;
  priority?: string;
  assigned_lawyer?: string;
  client_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class CaseService {
  static async getCases(filters: CaseFilters = {}): Promise<PaginatedResponse<Case>> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const endpoint = queryString ? `/cases?${queryString}` : '/cases';

    const response = await apiClient.get<ApiResponse<PaginatedResponse<Case>>>(endpoint);

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب القضايا');
    }
  }

  static async getCase(id: string): Promise<Case> {
    const response = await apiClient.get<ApiResponse<Case>>(`/cases/${id}`);

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب تفاصيل القضية');
    }
  }

  static async createCase(caseData: any): Promise<Case> {
    console.log('CaseService.createCase called with:', caseData);

    try {
      const response = await apiClient.post<ApiResponse<Case>>('/cases', caseData);

      if (response.success && response.data) {
        // ✅ Invalidate cache after creating case
        cacheManager.invalidate(CACHE_KEYS.CASES);
        return response.data;
      } else {
        throw new Error(response.message || 'فشل في إنشاء القضية');
      }
    } catch (error: any) {
      // طباعة تفاصيل الخطأ للتصحيح
      console.error('Create case error details:', error);
      if (error.errors) {
        console.error('Validation errors:', error.errors);
        // تحويل أخطاء الـ validation لرسالة واضحة
        const errorMessages = Object.entries(error.errors)
          .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
          .join('\n');
        throw new Error(errorMessages || error.message);
      }
      throw error;
    }
  }

  static async updateCase(id: string, caseData: Partial<Case>): Promise<Case> {
    const response = await apiClient.put<ApiResponse<Case>>(`/cases/${id}`, caseData);

    if (response.success && response.data) {
      // ✅ Invalidate cache after updating case
      cacheManager.invalidate(CACHE_KEYS.CASES);
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في تحديث القضية');
    }
  }

  static async deleteCase(id: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse>(`/cases/${id}`);

    if (!response.success) {
      throw new Error(response.message || 'فشل في حذف القضية');
    }
    // ✅ Invalidate cache after deleting case
    cacheManager.invalidate(CACHE_KEYS.CASES);
  }

  static async assignLawyer(caseId: string, lawyerId: string, role: string = 'secondary'): Promise<void> {
    const response = await apiClient.post<ApiResponse>(`/cases/${caseId}/assign-lawyer`, {
      lawyer_id: lawyerId,
      role,
    });

    if (!response.success) {
      throw new Error(response.message || 'فشل في تعيين المحامي');
    }
  }

  static async removeLawyer(caseId: string, lawyerId: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse>(`/cases/${caseId}/lawyers/${lawyerId}`);

    if (!response.success) {
      throw new Error(response.message || 'فشل في إزالة المحامي');
    }
  }

  static async getCaseStatistics(): Promise<any> {
    const response = await apiClient.get<ApiResponse>('/cases/statistics');

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب إحصائيات القضايا');
    }
  }

  // Client-specific methods
  static async getClientCases(): Promise<Case[]> {
    const response = await apiClient.get<ApiResponse<Case[]>>('/client/cases');

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب قضايا العميل');
    }
  }

  static async getClientCaseDetails(caseId: string): Promise<Case> {
    const response = await apiClient.get<ApiResponse<Case>>(`/client/cases/${caseId}`);

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب تفاصيل القضية');
    }
  }

  static async getClientDashboard(): Promise<any> {
    const response = await apiClient.get<ApiResponse>('/client/dashboard');

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب بيانات لوحة التحكم');
    }
  }

  // Case sharing methods
  static async canShare(caseId: string | number): Promise<{
    can_share: boolean;
    is_admin: boolean;
    allow_lawyer_sharing: boolean;
  }> {
    const response = await apiClient.get<ApiResponse<any>>(`/cases/${caseId}/can-share`);

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في التحقق من الصلاحيات');
    }
  }

  static async getCaseShares(caseId: string | number): Promise<any[]> {
    const response = await apiClient.get<ApiResponse<any[]>>(`/cases/${caseId}/shares`);

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب المشاركات');
    }
  }

  static async updateSharingPermission(caseId: string | number, allowLawyerSharing: boolean): Promise<void> {
    const response = await apiClient.patch<ApiResponse>(`/cases/${caseId}/sharing-permission`, {
      allow_lawyer_sharing: allowLawyerSharing,
    });

    if (!response.success) {
      throw new Error(response.message || 'فشل في تحديث الإعداد');
    }
  }

  static async shareCase(caseId: string | number, userIds: number[]): Promise<void> {
    const response = await apiClient.post<ApiResponse>(`/cases/${caseId}/shares`, {
      user_ids: userIds,
    });

    if (!response.success) {
      throw new Error(response.message || 'فشل في مشاركة القضية');
    }
  }

  static async removeShare(caseId: string | number, userId: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse>(`/cases/${caseId}/shares/${userId}`);

    if (!response.success) {
      throw new Error(response.message || 'فشل في إزالة المشاركة');
    }
  }

  /**
   * تبديل علامة "مسؤول" لمشارك في القضية
   */
  static async toggleResponsibility(caseId: string | number, userId: number): Promise<boolean> {
    const response = await apiClient.patch<ApiResponse<{ is_responsible: boolean }>>(
      `/cases/${caseId}/shares/${userId}/responsible`
    );
    if (response.success && response.data) {
      return response.data.is_responsible;
    }
    throw new Error(response.message || 'فشل في تعديل المسؤولية');
  }

  /**
   * جلب محامي القضية من الأطراف، مع تمييز من منهم موظف بالمكتب ومن أُضيف كمشارك
   */
  static async getEligibleParties(caseId: string | number): Promise<Array<{
    party_id: number;
    name: string;
    national_id: string | null;
    role: string | null;
    represents: string | null;
    matched_user_id: number | null;
    is_staff: boolean;
    already_shared: boolean;
  }>> {
    const response = await apiClient.get<ApiResponse<any[]>>(`/cases/${caseId}/eligible-parties`);
    if (response.success && response.data) return response.data;
    return [];
  }

  // ========== Najiz Linking Methods - ربط القضايا بناجز ==========

  /**
   * التحقق من إمكانية ربط القضية بقضية ناجز
   */
  static async canLinkToNajiz(caseId: string | number): Promise<{
    can_link: boolean;
    source: string;
    najiz_id: string | null;
    reason: string | null;
  }> {
    const response = await apiClient.get<ApiResponse<any>>(`/cases/${caseId}/can-link-najiz`);

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في التحقق');
    }
  }

  /**
   * الحصول على قضايا ناجز المتاحة للربط
   */
  static async getAvailableNajizCases(caseId: string | number): Promise<Case[]> {
    const response = await apiClient.get<ApiResponse<Case[]>>(`/cases/${caseId}/available-najiz-cases`);

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب قضايا ناجز');
    }
  }

  /**
   * ربط القضية المحلية بقضية ناجز
   */
  static async linkToNajiz(caseId: string | number, najizCaseId: number): Promise<Case> {
    const response = await apiClient.post<ApiResponse<Case>>(`/cases/${caseId}/link-najiz`, {
      najiz_case_id: najizCaseId
    });

    if (response.success && response.data) {
      // Invalidate cache after linking
      cacheManager.invalidate(CACHE_KEYS.CASES);
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في ربط القضية');
    }
  }

  // =================== مطبخ التجهيز ===================

  static async getPrepTasks(caseId: string | number) {
    return apiClient.get(`/cases/${caseId}/prep-tasks`);
  }

  static async initDefaultPrepTasks(caseId: string | number) {
    return apiClient.post(`/cases/${caseId}/prep-tasks/init`);
  }

  static async addPrepTask(caseId: string | number, title: string) {
    return apiClient.post(`/cases/${caseId}/prep-tasks`, { title });
  }

  static async updatePrepTask(caseId: string | number, taskId: number, title: string) {
    return apiClient.put(`/cases/${caseId}/prep-tasks/${taskId}`, { title });
  }

  static async togglePrepTask(caseId: string | number, taskId: number) {
    return apiClient.patch(`/cases/${caseId}/prep-tasks/${taskId}/toggle`);
  }

  static async reorderPrepTasks(caseId: string | number, order: number[]) {
    return apiClient.post(`/cases/${caseId}/prep-tasks/reorder`, { order });
  }

  static async deletePrepTask(caseId: string | number, taskId: number) {
    return apiClient.delete(`/cases/${caseId}/prep-tasks/${taskId}`);
  }

  static async activateCase(caseId: string | number, filingDate?: string) {
    return apiClient.post(`/cases/${caseId}/activate`, filingDate ? { filing_date: filingDate } : {});
  }

  static async updatePrepStatus(caseId: string | number, status: 'draft' | 'preparation' | 'filed') {
    return apiClient.patch(`/cases/${caseId}/prep-status`, { status });
  }
}
