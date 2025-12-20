import { apiClient } from '../utils/api';
import type { ApiResponse, PaginatedResponse } from '../utils/api';
import type { Case, CreateCaseForm } from '../types';

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
    
    const response = await apiClient.post<ApiResponse<Case>>('/cases', caseData);
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في إنشاء القضية');
    }
  }

  static async updateCase(id: string, caseData: Partial<CreateCaseForm>): Promise<Case> {
    const response = await apiClient.put<ApiResponse<Case>>(`/cases/${id}`, caseData);
    
    if (response.success && response.data) {
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
}
