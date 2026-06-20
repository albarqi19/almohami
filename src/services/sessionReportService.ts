import { apiClient, API_BASE_URL } from '../utils/api';

export type SessionReportTemplateType = 'formal_summary' | 'full_dabt' | 'custom';
export type SessionReportDeliveryMode = 'auto_enhanced' | 'save_only' | 'raw';

export interface SessionReportTemplate {
  id: number;
  tenant_id: number;
  name: string;
  type: SessionReportTemplateType;
  delivery_mode: SessionReportDeliveryMode;
  show_fields?: Record<string, boolean> | null;
  intro_text?: string | null;
  closing_text?: string | null;
  body_template?: string | null;
  letterhead_id?: number | null;
  accent_color?: string | null;
  watermark_override?: string | null;
  redact_pii: boolean;
  is_active: boolean;
  is_default: boolean;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface ListResponse {
  success: boolean;
  data: SessionReportTemplate[];
}

interface ItemResponse {
  success: boolean;
  message?: string;
  data: SessionReportTemplate;
}

/** نتيجة توليد/حفظ الملخص الرسمي للجلسة. */
export interface SessionReportSummary {
  summary: string | null;
  judgement: string | null;
  next_action: string | null;
  source: 'ai' | 'edited' | 'existing' | 'no_dabt';
  edited: boolean;
  generated_at: string | null;
  /** كود لغة العميل إن كانت غير العربية ومدعومة (تُضاف صفحة ثانية مترجمة)، أو null. */
  client_language: string | null;
  client_language_name: string | null;
}

interface SummaryResponse {
  success: boolean;
  message?: string;
  data: SessionReportSummary;
}

export const SESSION_REPORT_FIELD_LABELS: Record<string, string> = {
  subject: 'الموضوع',
  case_name_number: 'القضية والرقم',
  client_party: 'العميل وصفته',
  opponent_party: 'الخصم وصفته',
  session_datetime: 'تاريخ الجلسة والوقت',
  court: 'المحكمة',
  summary: 'ملخص الجلسة',
  judgement: 'قرار المحكمة',
  next_session: 'الجلسة القادمة',
};

export const sessionReportService = {
  list: () => apiClient.get<ListResponse>('/session-report-templates'),

  get: (id: number) => apiClient.get<ItemResponse>(`/session-report-templates/${id}`),

  create: (data: Partial<SessionReportTemplate>) =>
    apiClient.post<ItemResponse>('/session-report-templates', data),

  update: (id: number, data: Partial<SessionReportTemplate>) =>
    apiClient.put<ItemResponse>(`/session-report-templates/${id}`, data),

  remove: (id: number) =>
    apiClient.delete<{ success: boolean; message: string }>(`/session-report-templates/${id}`),

  setDefault: (id: number) =>
    apiClient.post<ItemResponse>(`/session-report-templates/${id}/set-default`),

  duplicate: (id: number) =>
    apiClient.post<ItemResponse>(`/session-report-templates/${id}/duplicate`),

  /**
   * يفتح معاينة قالب (بيانات عيّنة) في تبويب جديد — يجلب الملف كـ blob مع التوكن.
   */
  async openPreview(id: number): Promise<void> {
    return openPdfBlob(`${API_BASE_URL}/session-report-templates/${id}/preview`);
  },

  // ===== إرسال/معاينة تقرير جلسة فعلية (صفحة القضية) =====

  /** إرسال تقرير الجلسة للعميل (مرفق واتساب). */
  sendReport: (sessionId: number, templateId?: number) =>
    apiClient.post<{ success: boolean; message: string; number?: string; channels?: Record<string, string>; code?: string }>(
      `/sessions/${sessionId}/send-report-now`,
      templateId ? { template_id: templateId } : {},
    ),

  /** معاينة تقرير الجلسة الفعلي (مسوّدة) في تبويب جديد. */
  async openSessionPreview(sessionId: number, templateId?: number): Promise<void> {
    const q = templateId ? `?template_id=${templateId}` : '';
    return openPdfBlob(`${API_BASE_URL}/sessions/${sessionId}/report-preview${q}`);
  },

  /** توليد «الملخص الرسمي» لضبط الجلسة بالذكاء (للمراجعة قبل الإرسال). */
  generateSummary: (sessionId: number, force = false) =>
    apiClient.post<SummaryResponse>(`/sessions/${sessionId}/generate-report-summary`, { force }),

  /** حفظ ملخص حرّره المحامي. */
  saveSummary: (
    sessionId: number,
    payload: { summary: string; judgement?: string | null; next_action?: string | null },
  ) => apiClient.post<SummaryResponse>(`/sessions/${sessionId}/save-report-summary`, payload),
};

/** يجلب PDF كـ blob (مع التوكن) ويفتحه في تبويب جديد. */
async function openPdfBlob(url: string): Promise<void> {
  const token = localStorage.getItem('authToken');
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) {
    throw new Error('تعذّر توليد المعاينة');
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, '_blank');
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
