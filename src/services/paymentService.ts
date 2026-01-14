import { apiClient } from '../utils/api';
import type {
  Payment,
  PaymentFilters,
  PaymentsResponse,
  PaymentResponse,
  PaymentStats,
  CreatePaymentData,
} from '../types/billing';

export class PaymentService {
  private static buildQueryString(filters: PaymentFilters): string {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const query = params.toString();
    return query ? `?${query}` : '';
  }

  // === CRUD ===

  /**
   * الحصول على قائمة المدفوعات
   */
  static async getPayments(filters: PaymentFilters = {}): Promise<PaymentsResponse> {
    const query = this.buildQueryString(filters);
    return apiClient.get<PaymentsResponse>(`/payments${query}`);
  }

  /**
   * الحصول على دفعة محددة
   */
  static async getPayment(id: number): Promise<PaymentResponse> {
    return apiClient.get<PaymentResponse>(`/payments/${id}`);
  }

  /**
   * تسجيل دفعة جديدة
   */
  static async createPayment(data: CreatePaymentData): Promise<PaymentResponse> {
    return apiClient.post<PaymentResponse>('/payments', data);
  }

  /**
   * تحديث دفعة
   */
  static async updatePayment(id: number, data: Partial<Payment>): Promise<PaymentResponse> {
    return apiClient.put<PaymentResponse>(`/payments/${id}`, data);
  }

  /**
   * حذف دفعة
   */
  static async deletePayment(id: number): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(`/payments/${id}`);
  }

  // === إجراءات الدفعة ===

  /**
   * تأكيد دفعة
   */
  static async confirmPayment(id: number): Promise<PaymentResponse> {
    return apiClient.post<PaymentResponse>(`/payments/${id}/confirm`);
  }

  /**
   * رفض دفعة
   */
  static async rejectPayment(
    id: number,
    reason: string
  ): Promise<PaymentResponse> {
    return apiClient.post<PaymentResponse>(`/payments/${id}/reject`, { reason });
  }

  /**
   * استرداد دفعة
   */
  static async refundPayment(
    id: number,
    reason?: string
  ): Promise<PaymentResponse> {
    return apiClient.post<PaymentResponse>(`/payments/${id}/refund`, { reason });
  }

  /**
   * رفع إيصال الدفع
   */
  static async uploadReceipt(
    id: number,
    file: File
  ): Promise<{
    success: boolean;
    message: string;
    data: { receipt_path: string; receipt_url: string };
  }> {
    const formData = new FormData();
    formData.append('receipt', file);
    return apiClient.postFormData<{
      success: boolean;
      message: string;
      data: { receipt_path: string; receipt_url: string };
    }>(`/payments/${id}/receipt`, formData);
  }

  // === استعلامات خاصة ===

  /**
   * الحصول على مدفوعات فاتورة محددة
   */
  static async getInvoicePayments(invoiceId: number): Promise<{ success: boolean; data: Payment[] }> {
    return apiClient.get<{ success: boolean; data: Payment[] }>(`/case-invoices/${invoiceId}/payments`);
  }

  /**
   * الحصول على إحصائيات المدفوعات
   */
  static async getStats(filters?: {
    date_from?: string;
    date_to?: string;
  }): Promise<{ success: boolean; data: PaymentStats }> {
    let query = '';
    if (filters) {
      const params = new URLSearchParams();
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      query = params.toString() ? `?${params.toString()}` : '';
    }
    return apiClient.get<{ success: boolean; data: PaymentStats }>(`/payments/stats${query}`);
  }

  /**
   * الحصول على مدفوعات عميل محدد
   */
  static async getClientPayments(clientId: number): Promise<PaymentsResponse> {
    return this.getPayments({ client_id: clientId });
  }

  /**
   * الحصول على مدفوعات هذا الشهر
   */
  static async getThisMonthPayments(): Promise<PaymentsResponse> {
    return this.getPayments({ this_month: true });
  }

  /**
   * الحصول على المدفوعات المعلقة
   */
  static async getPendingPayments(): Promise<PaymentsResponse> {
    return this.getPayments({ status: 'pending' });
  }
}

// Instance export للاستخدام المباشر
export const paymentService = {
  getPayments: PaymentService.getPayments.bind(PaymentService),
  getPayment: PaymentService.getPayment.bind(PaymentService),
  createPayment: PaymentService.createPayment.bind(PaymentService),
  updatePayment: PaymentService.updatePayment.bind(PaymentService),
  deletePayment: PaymentService.deletePayment.bind(PaymentService),
  confirmPayment: PaymentService.confirmPayment.bind(PaymentService),
  rejectPayment: PaymentService.rejectPayment.bind(PaymentService),
  refundPayment: PaymentService.refundPayment.bind(PaymentService),
  uploadReceipt: PaymentService.uploadReceipt.bind(PaymentService),
  getInvoicePayments: PaymentService.getInvoicePayments.bind(PaymentService),
  getStats: PaymentService.getStats.bind(PaymentService),
  getClientPayments: PaymentService.getClientPayments.bind(PaymentService),
  getThisMonthPayments: PaymentService.getThisMonthPayments.bind(PaymentService),
  getPendingPayments: PaymentService.getPendingPayments.bind(PaymentService),
};
