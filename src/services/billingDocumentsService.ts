// [INV-P4] إعدادات «شكل المستندات المالية» — الفاتورة والإشعار وعرض الأتعاب وسند القبض وكشف الحساب.
import { apiClient, API_BASE_URL } from '../utils/api';

export type LogoMode = 'auto' | 'letterhead' | 'tenant' | 'none';
export type PreviewDoc = 'invoice' | 'receipt' | 'statement' | 'fee_proposal';

export interface BillingDocumentSettings {
  letterhead_id: number;
  accent_color: string;
  logo_mode: LogoMode;
  text_scale: number;
  amount_in_words: boolean;
  status_stamp: boolean;
  footer_note: string;
}

export interface BillingDocumentsPayload {
  settings: BillingDocumentSettings;
  effective: {
    accent: string;
    font: string;
    font_label: string;
    letterhead_id: number | null;
    letterhead_name: string | null;
    has_logo: boolean;
    text_scale: number;
    white_label: boolean;
  };
  letterheads: Array<{ id: number; name: string; type: string; is_default: boolean; primary_color: string | null; body_font: string | null }>;
  tenant: { name: string; legal_name_ar: string | null; primary_color: string | null; has_logo: boolean };
  text_scales: number[];
  logo_modes: Record<LogoMode, string>;
}

interface ApiResponse<T> { success: boolean; message?: string; data: T }

export const BILLING_DOCUMENTS_QUERY_KEY = ['billingDocuments'] as const;

export class BillingDocumentsService {
  static async get(): Promise<BillingDocumentsPayload> {
    const res = await apiClient.get<ApiResponse<BillingDocumentsPayload>>('/tenant/billing-documents');
    return res.data;
  }

  static async update(payload: Partial<BillingDocumentSettings>): Promise<{ message: string; data: BillingDocumentsPayload }> {
    const res = await apiClient.put<ApiResponse<BillingDocumentsPayload>>('/tenant/billing-documents', payload);
    return { message: res.message ?? 'تم الحفظ', data: res.data };
  }

  /** يفتح معاينة PDF لمستند حقيقي من مستندات المكتب في تبويب جديد. */
  static async openPreview(doc: PreviewDoc): Promise<void> {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_BASE_URL}/tenant/billing-documents/preview?doc=${doc}`, {
      headers: { Accept: 'application/pdf', 'ngrok-skip-browser-warning': '69420', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) {
      let message = 'تعذّر توليد المعاينة';
      try {
        const body = await res.clone().json();
        if (body?.message) message = body.message;
      } catch { /* ليس JSON */ }
      throw new Error(message);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
