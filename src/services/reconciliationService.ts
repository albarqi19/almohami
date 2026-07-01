import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';
import type { ReconciliationData } from '../types';

/**
 * خدمة الصلح (تراضي) — تجلب تفاصيل طلب الصلح المرتبط بصفّ المرساة في cases.
 * الـ endpoint: GET /api/v1/reconciliation/{caseId} (معرّف صف المرساة في cases).
 * يعيد { case, request:{ parties, sessions, agreements, ... } }.
 */
export class ReconciliationService {
  static async getReconciliation(caseId: string | number): Promise<ReconciliationData> {
    const response = await apiClient.get<ApiResponse<ReconciliationData>>(`/reconciliation/${caseId}`);

    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'فشل في جلب تفاصيل الصلح');
  }
}
