import { apiClient } from '../utils/api';
import type { ApiResponse, PaginatedResponse } from '../utils/api';
import type { ExecutionRequest, ExecutionRequestFilters, ExecutionRequestStats } from '../types';

export class ExecutionRequestService {
  /**
   * جلب قائمة طلبات التنفيذ مع الفلاتر والتصفح
   */
  static async getRequests(filters: ExecutionRequestFilters = {}): Promise<PaginatedResponse<ExecutionRequest>> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const endpoint = queryString ? `/execution-requests?${queryString}` : '/execution-requests';

    const response = await apiClient.get<ApiResponse<PaginatedResponse<ExecutionRequest>>>(endpoint);

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب طلبات التنفيذ');
    }
  }

  /**
   * جلب تفاصيل طلب تنفيذ واحد
   */
  static async getRequest(id: string | number): Promise<ExecutionRequest> {
    const response = await apiClient.get<ApiResponse<ExecutionRequest>>(`/execution-requests/${id}`);

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب تفاصيل الطلب');
    }
  }

  /**
   * إحصائيات طلبات التنفيذ
   */
  static async getStatistics(): Promise<ExecutionRequestStats> {
    const response = await apiClient.get<ApiResponse<ExecutionRequestStats>>('/execution-requests/statistics');

    if (response.success && response.data) {
      return response.data;
    } else {
      return {
        total: 0,
        total_amount: 0,
        paid_amount: 0,
        remaining_amount: 0,
        by_status: [],
        by_party_role: [],
        by_court: [],
      };
    }
  }

  /**
   * ربط طلب تنفيذ بقضية
   */
  static async linkCase(id: number, caseId: number | null): Promise<ExecutionRequest> {
    const response = await apiClient.patch<ApiResponse<ExecutionRequest>>(`/execution-requests/${id}/link-case`, {
      case_id: caseId
    });

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في ربط الطلب بالقضية');
    }
  }
}
