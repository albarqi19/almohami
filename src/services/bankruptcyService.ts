import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';
import type { BankruptcyDetail } from '../types';

/**
 * خدمة «طلبات الإفلاس» — قراءة تفاصيل الطلب الرئيسي (المرساة في cases).
 * المعرّف هو معرّف صف القضية المرساة (case.id).
 */
export class BankruptcyService {
  static async getBankruptcy(caseId: string | number): Promise<BankruptcyDetail> {
    const response = await apiClient.get<ApiResponse<BankruptcyDetail>>(`/bankruptcy/${caseId}`);

    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'فشل في جلب تفاصيل طلب الإفلاس');
  }
}

export default BankruptcyService;
