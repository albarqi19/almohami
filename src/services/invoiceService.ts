import { apiClient, API_BASE_URL } from '../utils/api';
import type {
  CaseInvoice,
  InvoiceFilters,
  InvoicesResponse,
  InvoiceResponse,
  CreateInvoiceData,
  IssueInvoicePayload,
  IssueNotePayload,
  VatExemptionReason,
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
   * [BILL-08] تحميل الفاتورة كـ PDF خادمي حقيقي (blob موثّق) وحفظه.
   */
  static async downloadPdf(id: number, invoiceNumber?: string): Promise<void> {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_BASE_URL}/case-invoices/${id}/pdf`, {
      headers: {
        Accept: 'application/pdf',
        'ngrok-skip-browser-warning': '69420',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      let message = 'تعذّر تنزيل ملف PDF';
      try {
        const body = await res.clone().json();
        if (body?.message) message = body.message;
      } catch {
        /* ليس JSON — نُبقي الرسالة الافتراضية */
      }
      throw new Error(message);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `invoice-${invoiceNumber || id}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
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
   * [INV-P2] إصدار المسودة (تثبيت التواريخ والنوع وQR ثم القفل).
   */
  static async issueInvoice(
    id: number,
    payload: IssueInvoicePayload = {}
  ): Promise<{ success: boolean; message: string; data: CaseInvoice; warnings?: string[] }> {
    return apiClient.post<{ success: boolean; message: string; data: CaseInvoice; warnings?: string[] }>(
      `/case-invoices/${id}/issue`,
      payload
    );
  }

  /**
   * [INV-P2] إشعار دائن/مدين على فاتورة صادرة.
   */
  static async issueNote(
    id: number,
    kind: 'credit' | 'debit',
    payload: IssueNotePayload
  ): Promise<{ success: boolean; message: string; data: CaseInvoice; original?: CaseInvoice }> {
    return apiClient.post<{ success: boolean; message: string; data: CaseInvoice; original?: CaseInvoice }>(
      `/case-invoices/${id}/${kind === 'credit' ? 'credit-note' : 'debit-note'}`,
      payload
    );
  }

  /**
   * [INV-PR] «مطالبة بالدفع» من المسودة (ليست فاتورة ضريبية) — ملف PDF يُحفظ.
   */
  static async downloadPaymentRequestPdf(id: number, invoiceNumber?: string): Promise<void> {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_BASE_URL}/case-invoices/${id}/payment-request-pdf`, {
      headers: { Accept: 'application/pdf', 'ngrok-skip-browser-warning': '69420', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) {
      let message = 'تعذّر تنزيل المطالبة';
      try {
        const body = await res.clone().json();
        if (body?.message) message = body.message;
      } catch { /* ليس JSON */ }
      throw new Error(message);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `payment-request-${invoiceNumber || id}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  /**
   * [INV-P6] أرشيف ZIP للفترة (PDF + XML الهيئة + فهرس) — ملف يُحفظ.
   */
  static async downloadArchive(from: string, to: string, kind: 'all' | 'invoices' | 'notes' = 'all'): Promise<void> {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_BASE_URL}/case-invoices/archive?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&kind=${kind}`, {
      headers: { Accept: 'application/zip', 'ngrok-skip-browser-warning': '69420', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) {
      let message = 'تعذّر تجهيز الأرشيف';
      try {
        const body = await res.clone().json();
        if (body?.message) message = body.message;
      } catch { /* ليس JSON */ }
      throw new Error(message);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `invoices-archive-${from}-${to}.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  /**
   * [INV-P2] أسباب عدم احتساب الضريبة (أكواد الهيئة).
   */
  static async getVatExemptionReasons(): Promise<{ success: boolean; data: { categories: Record<string, string>; reasons: VatExemptionReason[] } }> {
    return apiClient.get<{ success: boolean; data: { categories: Record<string, string>; reasons: VatExemptionReason[] } }>('/case-invoices/vat-exemption-reasons');
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
  issueInvoice: InvoiceService.issueInvoice.bind(InvoiceService),
  issueNote: InvoiceService.issueNote.bind(InvoiceService),
  getVatExemptionReasons: InvoiceService.getVatExemptionReasons.bind(InvoiceService),
  downloadArchive: InvoiceService.downloadArchive.bind(InvoiceService),
  downloadPaymentRequestPdf: InvoiceService.downloadPaymentRequestPdf.bind(InvoiceService),
  getClientInvoices: InvoiceService.getClientInvoices.bind(InvoiceService),
  getCaseInvoices: InvoiceService.getCaseInvoices.bind(InvoiceService),
  getContractInvoices: InvoiceService.getContractInvoices.bind(InvoiceService),
};
