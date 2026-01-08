import { apiClient } from '../utils/api';
import type { ApiResponse, PaginatedResponse } from '../utils/api';
import type { Case, CreateCaseForm } from '../types';
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

  static async updateCase(id: string, caseData: Partial<CreateCaseForm>): Promise<Case> {
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
}
