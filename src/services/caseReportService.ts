// خدمةُ «تقرير القضية» — قوالبُ وأشكالٌ ومسوّداتٌ وإصدار.
import { apiClient, API_BASE_URL } from '../utils/api';

/** الأشكالُ الستّة. `ai_letter` يختلف جنساً: الذكاءُ يكتب التقريرَ كلَّه رسالةً. */
export type CaseReportLayout =
  | 'tabular'
  | 'classic'
  | 'timeline'
  | 'executive'
  | 'corporate'
  | 'ai_letter';

export type CaseReportStatus = 'draft' | 'issuing' | 'issued' | 'failed';

export type CaseReportChannel = 'whatsapp' | 'email' | 'print';

export interface CaseReportTemplate {
  id: number;
  tenant_id: number;
  name: string;
  layout: CaseReportLayout;
  show_fields?: Record<string, boolean> | null;
  intro_text?: string | null;
  closing_text?: string | null;
  custom_sections?: CustomSection[] | null;
  letterhead_id?: number | null;
  accent_color?: string | null;
  watermark_override?: string | null;
  sessions_limit: number;
  activities_limit: number;
  redact_pii: boolean;
  is_active: boolean;
  is_default: boolean;
  description?: string | null;
}

export interface CustomSection {
  title: string;
  body: string;
  order?: number;
}

export interface LetterSection {
  title: string;
  body: string;
}

export interface CaseReportLetter {
  opening: string | null;
  sections: LetterSection[];
  closing: string | null;
  edited: boolean;
  generated_at: string | null;
}

export interface CaseReport {
  id: number;
  case_id: number;
  template_id: number | null;
  template_name: string | null;
  status: CaseReportStatus;
  status_label: string;
  layout: CaseReportLayout;
  layout_label: string;
  report_number: string | null;
  outgoing_number: string | null;
  period_label: string | null;
  channels: CaseReportChannel[];
  channel_status: Record<string, string>;
  issued_at: string | null;
  issued_by_name: string | null;
  created_by_name: string | null;
  created_at: string | null;
  is_editable: boolean;
  has_file: boolean;
  // تفاصيلُ تُرجَع في العرض المفصّل وحده
  show_fields?: Record<string, boolean>;
  custom_sections?: CustomSection[];
  selected_activity_ids?: number[] | null;
  sessions_limit?: number | null;
  is_letter_layout?: boolean;
  summary?: string | null;
  summary_short?: string | null;
  next_step?: string | null;
  summary_edited?: boolean;
  summary_generated_at?: string | null;
  letter?: CaseReportLetter | null;
}

export interface CaseReportActivity {
  id: number;
  type: string;
  title: string | null;
  description: string | null;
  by: string | null;
  created_at: string | null;
}

interface Meta {
  layouts: Record<CaseReportLayout, string>;
  field_labels: Record<string, string>;
  default_fields?: Record<string, boolean>;
}

interface ListResponse {
  success: boolean;
  data: CaseReport[];
  meta: Meta;
}

interface ItemResponse {
  success: boolean;
  message?: string;
  data: CaseReport;
}

interface TemplatesResponse {
  success: boolean;
  data: CaseReportTemplate[];
  meta: Meta;
}

interface IssueResponse {
  success: boolean;
  message: string;
  code?: string;
  number?: string;
  channels?: Record<string, string>;
  data?: CaseReport;
}

interface SummaryResponse {
  success: boolean;
  message?: string;
  data: {
    is_letter: boolean;
    source: string;
    edited: boolean;
    generated_at: string | null;
    summary?: string | null;
    summary_short?: string | null;
    next_step?: string | null;
    opening?: string | null;
    sections?: LetterSection[];
    closing?: string | null;
  };
}

/** وصفٌ قصيرٌ لكلّ شكل — يُعرض تحت اسمه في شاشة الاختيار. */
export const CASE_REPORT_LAYOUT_HINTS: Record<CaseReportLayout, string> = {
  tabular: 'كلُّ الأقسام في جداولَ مرتّبة. الأشملُ والأنسبُ للتقرير الكامل.',
  classic: 'بلا لون، عناوينُ مرقّمة وتوقيعٌ في الأسفل. أقربُ إلى مذكّرةٍ قضائية.',
  timeline: 'عمودٌ زمنيٌّ تتعلّق به الجلسات وآخرُها الجلسةُ القادمة. أوضحُ جوابٍ على «أين وصلت».',
  executive: 'صفحةٌ واحدة: بطاقاتٌ رقمية وآخرُ الجلسات. لمن يتابع قضايا كثيرة.',
  corporate: 'عمودان وشريطٌ جانبيٌّ بالمسار والأطراف والجلسة القادمة.',
  ai_letter: 'يكتب الذكاءُ التقريرَ رسالةً متّصلةً بفصولٍ وعناوين، ثم تراجعُها قبل الإصدار.',
};

export const CASE_REPORT_CHANNEL_LABELS: Record<CaseReportChannel, string> = {
  whatsapp: 'واتساب',
  email: 'بريد إلكتروني',
  print: 'طباعة دون إرسال',
};

export const caseReportService = {
  // ── القوالب ──
  listTemplates: () => apiClient.get<TemplatesResponse>('/case-report-templates'),

  createTemplate: (data: Partial<CaseReportTemplate>) =>
    apiClient.post<{ success: boolean; message: string; data: CaseReportTemplate }>(
      '/case-report-templates',
      data,
    ),

  updateTemplate: (id: number, data: Partial<CaseReportTemplate>) =>
    apiClient.put<{ success: boolean; message: string; data: CaseReportTemplate }>(
      `/case-report-templates/${id}`,
      data,
    ),

  removeTemplate: (id: number) =>
    apiClient.delete<{ success: boolean; message: string }>(`/case-report-templates/${id}`),

  setTemplateDefault: (id: number) =>
    apiClient.post<{ success: boolean; message: string; data: CaseReportTemplate }>(
      `/case-report-templates/${id}/set-default`,
    ),

  duplicateTemplate: (id: number) =>
    apiClient.post<{ success: boolean; message: string; data: CaseReportTemplate }>(
      `/case-report-templates/${id}/duplicate`,
    ),

  /** معاينةُ قالبٍ ببياناتٍ تركيبية — لاختيار الشكل قبل وجود أيّ تقرير. */
  openTemplatePreview: (id: number) =>
    openPdfBlob(`${API_BASE_URL}/case-report-templates/${id}/preview`),

  // ── التقارير ──
  list: (caseId: number) => apiClient.get<ListResponse>(`/cases/${caseId}/reports`),

  get: (id: number) => apiClient.get<ItemResponse>(`/case-reports/${id}`),

  create: (caseId: number, templateId?: number) =>
    apiClient.post<ItemResponse>(
      `/cases/${caseId}/reports`,
      templateId ? { template_id: templateId } : {},
    ),

  update: (id: number, data: Partial<CaseReport> & { template_id?: number }) =>
    apiClient.put<ItemResponse>(`/case-reports/${id}`, data),

  remove: (id: number) =>
    apiClient.delete<{ success: boolean; message: string }>(`/case-reports/${id}`),

  /** النشاطاتُ القابلةُ للانتقاء — المرئيّةُ للعميل حصراً (الخادم يُرشّح). */
  activities: (caseId: number) =>
    apiClient.get<{ success: boolean; data: CaseReportActivity[] }>(
      `/cases/${caseId}/report-activities`,
    ),

  generateSummary: (id: number, force = false) =>
    apiClient.post<SummaryResponse>(`/case-reports/${id}/generate-summary`, { force }),

  saveSummary: (
    id: number,
    payload:
      | { summary: string; summary_short?: string | null; next_step?: string | null }
      | { opening?: string | null; sections: LetterSection[]; closing?: string | null },
  ) => apiClient.post<SummaryResponse>(`/case-reports/${id}/save-summary`, payload),

  openPreview: (id: number) => openPdfBlob(`${API_BASE_URL}/case-reports/${id}/preview`),

  openIssued: (id: number) => openPdfBlob(`${API_BASE_URL}/case-reports/${id}/download`),

  issue: (id: number, channels: CaseReportChannel[]) =>
    apiClient.post<IssueResponse>(`/case-reports/${id}/issue`, { channels }),
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
