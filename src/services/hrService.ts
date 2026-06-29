import { apiClient } from '../utils/api';
import type { ApiResponse, PaginatedResponse } from '../utils/api';
import type {
  EmployeeProfile,
  EmployeeCompensation,
  HrStats,
  EmployeeFilters,
} from '../types/hr';

const BASE = '/hr/employees';

/**
 * خدمة الموارد البشرية — المرحلة 1.
 * كل المسارات محروسة في الباك بـ hr.* + بوابة hr_enabled (المدير فقط).
 */
export const hrService = {
  async getEmployees(filters: EmployeeFilters = {}): Promise<PaginatedResponse<EmployeeProfile>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
    });
    const qs = params.toString();
    const res = await apiClient.get<ApiResponse<PaginatedResponse<EmployeeProfile>>>(qs ? `${BASE}?${qs}` : BASE);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب الموظفين');
  },

  async getStats(): Promise<HrStats> {
    const res = await apiClient.get<ApiResponse<HrStats>>(`${BASE}/stats`);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب الإحصائيات');
  },

  async getEmployee(id: number): Promise<EmployeeProfile> {
    const res = await apiClient.get<ApiResponse<EmployeeProfile>>(`${BASE}/${id}`);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب بيانات الموظف');
  },

  async createEmployee(payload: Partial<EmployeeProfile> & { user_id: number }): Promise<EmployeeProfile> {
    const res = await apiClient.post<ApiResponse<EmployeeProfile>>(BASE, payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في إنشاء ملف الموظف');
  },

  async updateEmployee(id: number, payload: Partial<EmployeeProfile>): Promise<EmployeeProfile> {
    const res = await apiClient.put<ApiResponse<EmployeeProfile>>(`${BASE}/${id}`, payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في تحديث الملف');
  },

  async deleteEmployee(id: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse>(`${BASE}/${id}`);
    if (!res.success) throw new Error(res.message || 'فشل في حذف الملف');
  },

  async upsertCompensation(id: number, payload: Partial<EmployeeCompensation>): Promise<EmployeeCompensation> {
    const res = await apiClient.put<ApiResponse<EmployeeCompensation>>(`${BASE}/${id}/compensation`, payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في حفظ التعويضات');
  },
};
