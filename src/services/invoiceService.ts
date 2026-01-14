import { apiClient } from '../utils/api';
import type {
  CaseInvoice,
  InvoiceFilters,
  InvoicesResponse,
  InvoiceResponse,
  CreateInvoiceData,
} from '../types/billing';

export class InvoiceService {
  private static buildQueryString(filters: InvoiceFilters): string {
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
   * الحصول على قائمة الفواتير
   */
  static async getInvoices(filters: InvoiceFilters = {}): Promise<InvoicesResponse> {
    const query = this.buildQueryString(filters);
    return apiClient.get<InvoicesResponse>(`/case-invoices${query}`);
  }

  /**
   * الحصول على فاتورة محددة
   */
  static async getInvoice(id: number): Promise<InvoiceResponse> {
    return apiClient.get<InvoiceResponse>(`/case-invoices/${id}`);
  }

  /**
   * إنشاء فاتورة جديدة
   */
  static async createInvoice(data: CreateInvoiceData): Promise<InvoiceResponse> {
    return apiClient.post<InvoiceResponse>('/case-invoices', data);
  }

  /**
   * تحديث فاتورة
   */
  static async updateInvoice(id: number, data: Partial<CaseInvoice>): Promise<InvoiceResponse> {
    return apiClient.put<InvoiceResponse>(`/case-invoices/${id}`, data);
  }

  /**
   * حذف فاتورة
   */
  static async deleteInvoice(id: number): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(`/case-invoices/${id}`);
  }

  // === إجراءات الفاتورة ===

  /**
   * إرسال الفاتورة للعميل
   */
  static async sendInvoice(
    id: number,
    method: 'email' | 'whatsapp',
    message?: string
  ): Promise<{ success: boolean; message: string; data: CaseInvoice }> {
    return apiClient.post<{ success: boolean; message: string; data: CaseInvoice }>(
      `/case-invoices/${id}/send`,
      { method, message }
    );
  }

  /**
   * تحميل الفاتورة كـ PDF
   */
  static async downloadPdf(id: number): Promise<{ success: boolean; data: { url: string } }> {
    return apiClient.get<{ success: boolean; data: { url: string } }>(`/case-invoices/${id}/pdf`);
  }

  /**
   * إلغاء فاتورة
   */
  static async cancelInvoice(
    id: number,
    reason?: string
  ): Promise<{ success: boolean; message: string; data: CaseInvoice }> {
    return apiClient.post<{ success: boolean; message: string; data: CaseInvoice }>(
      `/case-invoices/${id}/cancel`,
      { reason }
    );
  }

  // === استعلامات خاصة ===

  /**
   * الحصول على الفواتير المتأخرة
   */
  static async getOverdue(): Promise<{
    success: boolean;
    data: CaseInvoice[];
    total_overdue: number;
    count: number;
  }> {
    return apiClient.get<{
      success: boolean;
      data: CaseInvoice[];
      total_overdue: number;
      count: number;
    }>('/case-invoices/overdue');
  }

  /**
   * الحصول على الفواتير المستحقة قريباً
   */
  static async getDue(days: number = 7): Promise<{
    success: boolean;
    data: CaseInvoice[];
    total_due: number;
    count: number;
  }> {
    return apiClient.get<{
      success: boolean;
      data: CaseInvoice[];
      total_due: number;
      count: number;
    }>(`/case-invoices/due?days=${days}`);
  }

  /**
   * الحصول على إحصائيات الفواتير
   */
  static async getStats(): Promise<{
    success: boolean;
    data: {
      total: number;
      draft: number;
      sent: number;
      pending: number;
      partial: number;
      paid: number;
      overdue: number;
      cancelled: number;
      total_invoiced: number;
      total_paid: number;
      total_remaining: number;
    };
  }> {
    return apiClient.get<{
      success: boolean;
      data: {
        total: number;
        draft: number;
        sent: number;
        pending: number;
        partial: number;
        paid: number;
        overdue: number;
        cancelled: number;
        total_invoiced: number;
        total_paid: number;
        total_remaining: number;
      };
    }>('/case-invoices/stats');
  }

  /**
   * الحصول على فواتير عميل محدد
   */
  static async getClientInvoices(clientId: number): Promise<InvoicesResponse> {
    return this.getInvoices({ client_id: clientId });
  }

  /**
   * الحصول على فواتير قضية محددة
   */
  static async getCaseInvoices(caseId: number): Promise<InvoicesResponse> {
    return this.getInvoices({ case_id: caseId });
  }

  /**
   * الحصول على فواتير عقد محدد
   */
  static async getContractInvoices(contractId: number): Promise<InvoicesResponse> {
    return this.getInvoices({ contract_id: contractId });
  }
}

// Instance export للاستخدام المباشر
export const invoiceService = {
  getInvoices: InvoiceService.getInvoices.bind(InvoiceService),
  getInvoice: InvoiceService.getInvoice.bind(InvoiceService),
  createInvoice: InvoiceService.createInvoice.bind(InvoiceService),
  updateInvoice: InvoiceService.updateInvoice.bind(InvoiceService),
  deleteInvoice: InvoiceService.deleteInvoice.bind(InvoiceService),
  sendInvoice: InvoiceService.sendInvoice.bind(InvoiceService),
  downloadPdf: InvoiceService.downloadPdf.bind(InvoiceService),
  cancelInvoice: InvoiceService.cancelInvoice.bind(InvoiceService),
  getOverdue: InvoiceService.getOverdue.bind(InvoiceService),
  getDue: InvoiceService.getDue.bind(InvoiceService),
  getStats: InvoiceService.getStats.bind(InvoiceService),
  getClientInvoices: InvoiceService.getClientInvoices.bind(InvoiceService),
  getCaseInvoices: InvoiceService.getCaseInvoices.bind(InvoiceService),
  getContractInvoices: InvoiceService.getContractInvoices.bind(InvoiceService),
};
