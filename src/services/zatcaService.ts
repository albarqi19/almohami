// === خدمة الفوترة الإلكترونية ZATCA ===
// تتبع نمط invoiceService (تصدير مزدوج: class + instance مربوط).
// النداءات العادية عبر apiClient؛ تنزيلات XML/PDF عبر fetch موثّق بمفتاح authToken
// (apiClient لا يدعم blob) — بنمط DocumentService.downloadDocument.

import { apiClient, API_BASE_URL } from '../utils/api';
import type { ApiResponse } from '../utils/api';
import type { CaseInvoice } from '../types/billing';
import type {
  ZatcaStatusData,
  ZatcaCertificate,
  ZatcaComplianceResults,
  StartOnboardingPayload,
  ZatcaInvoiceSubmitResult,
  ZatcaQrData,
  ZatcaCounts,
} from '../types/zatca';

// --- أنواع استجابة قائمة فواتير ZATCA (paginator + عدّادات) ---
export interface ZatcaInvoicesPage {
  data: CaseInvoice[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

export interface ZatcaInvoicesResponse {
  success: boolean;
  data: ZatcaInvoicesPage;
  zatca_counts?: ZatcaCounts;
}

export interface ZatcaInvoiceFilters {
  zatca_status?: string;       // قيمة واحدة أو عدة قيم مفصولة بفاصلة (whereIn)
  search?: string;
  page?: number;
  per_page?: number;
}

export class ZatcaService {
  // === الحالة (متاحة دائماً) ===

  static async getStatus(): Promise<ApiResponse<ZatcaStatusData>> {
    return apiClient.get<ApiResponse<ZatcaStatusData>>('/zatca/status');
  }

  static async getCredentialHealth(): Promise<ApiResponse<ZatcaCertificate>> {
    return apiClient.get<ApiResponse<ZatcaCertificate>>('/zatca/credentials/health');
  }

  // === التفعيل (Onboarding) ===

  static async startOnboarding(
    payload: StartOnboardingPayload
  ): Promise<ApiResponse<{ status: string }>> {
    return apiClient.post<ApiResponse<{ status: string }>>('/zatca/onboard/start', payload);
  }

  static async submitComplianceInvoices(): Promise<ApiResponse<ZatcaComplianceResults>> {
    return apiClient.post<ApiResponse<ZatcaComplianceResults>>('/zatca/onboard/test-invoices');
  }

  static async finalizeProduction(): Promise<ApiResponse<{ status: string }>> {
    return apiClient.post<ApiResponse<{ status: string }>>('/zatca/onboard/finalize');
  }

  // === إجراءات الفواتير (خلف middleware zatca.enabled) ===

  static async submitInvoice(id: number): Promise<ApiResponse<ZatcaInvoiceSubmitResult>> {
    return apiClient.post<ApiResponse<ZatcaInvoiceSubmitResult>>(`/case-invoices/${id}/submit-to-zatca`);
  }

  static async retryInvoice(id: number): Promise<ApiResponse<ZatcaInvoiceSubmitResult>> {
    return apiClient.post<ApiResponse<ZatcaInvoiceSubmitResult>>(`/case-invoices/${id}/zatca/retry`);
  }

  static async issueCreditNote(
    id: number,
    reason: string
  ): Promise<ApiResponse<ZatcaInvoiceSubmitResult>> {
    return apiClient.post<ApiResponse<ZatcaInvoiceSubmitResult>>(
      `/case-invoices/${id}/zatca/credit-note`,
      { reason }
    );
  }

  static async issueDebitNote(
    id: number,
    reason: string
  ): Promise<ApiResponse<ZatcaInvoiceSubmitResult>> {
    return apiClient.post<ApiResponse<ZatcaInvoiceSubmitResult>>(
      `/case-invoices/${id}/zatca/debit-note`,
      { reason }
    );
  }

  static async getQr(id: number): Promise<ApiResponse<ZatcaQrData>> {
    return apiClient.get<ApiResponse<ZatcaQrData>>(`/case-invoices/${id}/zatca/qr`);
  }

  // === قائمة فواتير ZATCA (فلترة + عدّادات من الباك) ===

  static buildQueryString(filters: ZatcaInvoiceFilters): string {
    const params = new URLSearchParams();
    params.append('zatca_only', 'true');
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    return `?${params.toString()}`;
  }

  static async getInvoices(filters: ZatcaInvoiceFilters = {}): Promise<ZatcaInvoicesResponse> {
    const query = this.buildQueryString(filters);
    return apiClient.get<ZatcaInvoicesResponse>(`/case-invoices${query}`);
  }

  // === تنزيلات blob موثّقة (XML / PDF) ===
  // fetch مباشر بمفتاح authToken — apiClient لا يدعم blob.

  private static authHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${localStorage.getItem('authToken')}`,
      Accept: '*/*',
      'ngrok-skip-browser-warning': '69420',
    };
  }

  private static async fetchBlob(path: string, fallbackError: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}${path}`, { headers: this.authHeaders() });
    if (!response.ok) {
      // الباك قد يرجع JSON برسالة خطأ (404/422)
      let message = fallbackError;
      try {
        const body = await response.clone().json();
        if (body?.message) message = body.message;
      } catch {
        // ليس JSON — نُبقي الرسالة الافتراضية
      }
      throw new Error(message);
    }
    return response.blob();
  }

  private static saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  static async downloadXml(id: number, invoiceNumber?: string): Promise<void> {
    const blob = await this.fetchBlob(
      `/case-invoices/${id}/zatca/xml`,
      'تعذّر تنزيل ملف XML'
    );
    this.saveBlob(blob, `zatca-${invoiceNumber || id}.xml`);
  }

  static async downloadPdf(id: number, invoiceNumber?: string): Promise<void> {
    const blob = await this.fetchBlob(
      `/case-invoices/${id}/zatca/pdf`,
      'تعذّر تنزيل ملف PDF'
    );
    this.saveBlob(blob, `zatca-${invoiceNumber || id}.pdf`);
  }
}

// نسخة مربوطة للاستخدام في الـ hooks/components (مثل invoiceService).
export const zatcaService = {
  getStatus: ZatcaService.getStatus.bind(ZatcaService),
  getCredentialHealth: ZatcaService.getCredentialHealth.bind(ZatcaService),
  startOnboarding: ZatcaService.startOnboarding.bind(ZatcaService),
  submitComplianceInvoices: ZatcaService.submitComplianceInvoices.bind(ZatcaService),
  finalizeProduction: ZatcaService.finalizeProduction.bind(ZatcaService),
  submitInvoice: ZatcaService.submitInvoice.bind(ZatcaService),
  retryInvoice: ZatcaService.retryInvoice.bind(ZatcaService),
  issueCreditNote: ZatcaService.issueCreditNote.bind(ZatcaService),
  issueDebitNote: ZatcaService.issueDebitNote.bind(ZatcaService),
  getQr: ZatcaService.getQr.bind(ZatcaService),
  getInvoices: ZatcaService.getInvoices.bind(ZatcaService),
  downloadXml: ZatcaService.downloadXml.bind(ZatcaService),
  downloadPdf: ZatcaService.downloadPdf.bind(ZatcaService),
};
