import { apiClient } from '../utils/api';
import type { ApiResponse, PaginatedResponse } from '../utils/api';
import type {
  ExecutionRequest,
  ExecutionRequestFilters,
  ExecutionRequestStats,
  ExecutionRequestShare,
  ExecutionPaymentLogsResponse,
} from '../types';

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
   * إحصائيات طلبات التنفيذ — clientId اختياري لملخّص مالي لعميل بعينه
   */
  static async getStatistics(clientId?: string | number): Promise<ExecutionRequestStats> {
    const qs = clientId && clientId !== 'all' ? `?client_id=${clientId}` : '';
    const response = await apiClient.get<ApiResponse<ExecutionRequestStats>>(`/execution-requests/statistics${qs}`);

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
   * سجل السدادات المرصودة عبر مزامنات ناجز («آخر السدادات»)
   */
  static async getPaymentLogs(filters: {
    execution_request_id?: number | string;
    client_id?: number | string;
    days?: number;
    only_positive?: '0' | '1';
    page?: number;
    limit?: number;
  } = {}): Promise<ExecutionPaymentLogsResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'all') {
        params.append(key, value.toString());
      }
    });
    const qs = params.toString();
    const response = await apiClient.get<ApiResponse<ExecutionPaymentLogsResponse>>(
      qs ? `/execution-requests/payment-logs?${qs}` : '/execution-requests/payment-logs'
    );

    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'فشل في جلب سجل السدادات');
  }

  /**
   * ربط طلب تنفيذ بعميل (null لفك الربط)
   */
  static async linkClient(id: number | string, clientId: number | null): Promise<ExecutionRequest> {
    const response = await apiClient.patch<ApiResponse<ExecutionRequest>>(`/execution-requests/${id}/link-client`, {
      client_id: clientId,
    });

    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'فشل في ربط الطلب بالعميل');
  }

  /**
   * مشاركة طلب تنفيذ مع مستخدم ليتابعه
   */
  static async share(id: number | string, userId: number | string, note?: string): Promise<ExecutionRequestShare> {
    const response = await apiClient.post<ApiResponse<ExecutionRequestShare>>(`/execution-requests/${id}/shares`, {
      user_id: userId,
      note: note || undefined,
    });

    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'فشل في مشاركة الطلب');
  }

  /**
   * إلغاء مشاركة طلب تنفيذ مع مستخدم
   */
  static async unshare(id: number | string, userId: number | string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<null>>(`/execution-requests/${id}/shares/${userId}`);

    if (!response.success) {
      throw new Error(response.message || 'فشل في إلغاء المشاركة');
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

  /**
   * حذف طلب تنفيذ
   */
  static async deleteRequest(id: number | string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<null>>(`/execution-requests/${id}`);

    if (!response.success) {
      throw new Error(response.message || 'فشل في حذف طلب التنفيذ');
    }
  }
}
