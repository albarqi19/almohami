import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';
import type { GrievanceDetail } from '../types';

/**
 * خدمة «ديوان المظالم» — قراءة تفاصيل الدعوى الإدارية (المرساة في cases).
 * المعرّف هو معرّف صف القضية المرساة (case.id).
 */
export class GrievanceService {
  static async getGrievance(caseId: string | number): Promise<GrievanceDetail> {
    const response = await apiClient.get<ApiResponse<GrievanceDetail>>(`/grievance/${caseId}`);

    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'فشل في جلب تفاصيل الدعوى الإدارية');
  }
}

export default GrievanceService;
