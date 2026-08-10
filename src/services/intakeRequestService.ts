import { apiClient, API_BASE_URL } from '../utils/api';

// ─────────────────────────────────────────────────────────────────────
// «صندوق الطلبات الذكي» — طلبات واردة من بريد Outlook حوّلها الذكاء
// لاقتراحات (خدمة/استشارة/قضية) بانتظار اعتماد بشري.
// Types تعكس IntakeRequestController في الباك.
// ─────────────────────────────────────────────────────────────────────

export type IntakeStatus = 'pending_review' | 'approved' | 'rejected' | 'needs_info' | 'extraction_failed';
export type IntakeTarget = 'service' | 'consultation' | 'case';

export interface IntakeAttachment {
  id: number;
  file_name: string;
  mime: string | null;
  size: number;
  storage_path: string | null;
  extraction_status: 'pending' | 'done' | 'failed' | 'skipped';
  extracted_text?: string | null;
  /** وصف من سطر واحد كتبه الذكاء ضمن نداء الاستخلاص نفسه */
  ai_description?: string | null;
  /** يفتحه المتصفح داخل الصفحة (pdf/صورة) — ما عداه يُنزَّل */
  is_viewable?: boolean;
  /** روابط موقّعة ٣٠ دقيقة — تصلح لـ<iframe>/<img> لأنها لا تحتاج ترويسة مصادقة */
  preview_url?: string | null;
  download_url?: string | null;
}

/** نصّ الرسالة الأصلي كما ورد في Outlook (يُجلب عند الطلب، لا يُخزَّن) */
export interface IntakeOriginalMessage {
  content_type: 'html' | 'text';
  content: string;
  subject: string | null;
}

export interface IntakeRequest {
  id: number;
  from_email: string | null;
  from_name: string | null;
  subject: string | null;
  raw_body: string | null;
  received_at: string | null;
  has_attachments: boolean;
  is_service_request: boolean;
  confidence: number;
  suggested_target: IntakeTarget | null;
  suggested_service_type: string | null;
  extracted_payload: {
    title?: string | null;
    description?: string | null;
    client_name?: string | null;
    client_phone?: string | null;
    client_email?: string | null;
    opponent_name?: string | null;
    attachments_summary?: string | null;
  } | null;
  matched_client_id: number | null;
  matched_client?: { id: number; name: string; email?: string; phone?: string } | null;
  status: IntakeStatus;
  service_id: number | null;
  case_id: number | null;
  service?: { id: number; service_number: string; title: string } | null;
  case?: { id: number; file_number: string; title: string } | null;
  reviewed_by: number | null;
  reviewer?: { id: number; name: string } | null;
  reviewed_at: string | null;
  review_note: string | null;
  attachments_count?: number;
  attachments?: IntakeAttachment[];
  created_at: string;
}

export interface ApprovePayload {
  target: IntakeTarget;
  service_type?: string | null;
  client_id: number;
  /** المسؤول الأساسي — يبقى مفرداً ويكون ضمن assignee_ids */
  assigned_lawyer_id: number;
  /** تعدّد المكلّفين — الباك يضمن أن المسؤول الأساسي ضمن القائمة */
  assignee_ids?: number[];
  title: string;
  description?: string | null;
  send_confirmation: boolean;
  review_note?: string | null;
  /** الأتعاب — اختيارية؛ تمريرها يشغّل الفوترة التلقائية على الخدمة الناتجة */
  billing_type?: 'flat_fee' | 'hourly' | 'retainer' | 'contingency' | null;
  agreed_amount?: number | null;
  hourly_rate?: number | null;
  /** التكليف — مهمة تُنشأ مع الخدمة، مسؤولها المحامي المكلَّف ومعتمِدها المدير */
  create_task?: boolean;
  /** إلزامي عند create_task — ولا يصحّ أن يساوي assigned_lawyer_id */
  task_approver_id?: number | null;
  task_due_days?: number | null;
  task_title?: string | null;
}

export interface ApproveResult {
  service_id: number | null;
  case_id: number | null;
  /** عدد المرفقات التي انتقلت فعلاً إلى مستندات الكيان الناتج */
  attachments_promoted: number;
  /** معرّف المهمة المنشأة — null إن لم يُطلب التكليف */
  task_id: number | null;
}

/** مهلة التسليم الافتراضية — مطابقة IntakeRequestController::DEFAULT_TASK_DUE_DAYS */
export const DEFAULT_TASK_DUE_DAYS = 2;

/** أنواع الفوترة — مطابقة تحقّق IntakeRequestController::approve */
export const BILLING_TYPES: Record<string, string> = {
  flat_fee: 'مبلغ مقطوع',
  hourly: 'بالساعة',
  retainer: 'أتعاب شهرية',
  contingency: 'نسبة من المحصّل',
};

/** أنواع الخدمات المقترَحة (مطابقة EmailIntakeService::SERVICE_TYPES بلا consultation) */
export const INTAKE_SERVICE_TYPES: Record<string, string> = {
  contract_drafting: 'صياغة عقود',
  company_formation: 'تأسيس شركات',
  licenses: 'تراخيص وإجراءات حكومية',
  arbitration: 'تحكيم ووساطة',
  compliance: 'امتثال قانوني',
  labor: 'شؤون العمل',
  real_estate: 'عقارات',
  due_diligence: 'العناية القانونية الواجبة',
  ip: 'ملكية فكرية',
  legal_notices: 'إنذارات قانونية',
  training: 'تدريب قانوني',
  other: 'أخرى',
};

class IntakeRequestService {
  async list(params: { status?: string; per_page?: number; page?: number } = {}) {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.per_page) q.set('per_page', String(params.per_page));
    if (params.page) q.set('page', String(params.page));
    const qs = q.toString();
    return await apiClient.get<{
      success: boolean;
      data: { data: IntakeRequest[]; total: number; current_page: number; last_page: number };
      counts: Record<string, number>;
    }>(`/intake-requests${qs ? `?${qs}` : ''}`);
  }

  async show(id: number) {
    return await apiClient.get<{ success: boolean; data: IntakeRequest }>(`/intake-requests/${id}`);
  }

  async approve(id: number, payload: ApprovePayload) {
    return await apiClient.post<{ success: boolean; message: string; data: ApproveResult }>(
      `/intake-requests/${id}/approve`,
      payload,
    );
  }

  /**
   * نصّ الرسالة الأصلي بتنسيقه — يُجلب من Outlook لحظتَها ولا يُخزَّن في القاعدة.
   * قد يفشل إن حُذفت الرسالة أو انقطع ربط مايكروسوفت، فيسقط النداء والصفحة تعرض
   * النصّ المجرَّد المخزَّن بدلاً منه.
   */
  async original(id: number) {
    return await apiClient.get<{ success: boolean; data: IntakeOriginalMessage }>(
      `/intake-requests/${id}/original`,
    );
  }

  async reject(id: number, reviewNote?: string) {
    return await apiClient.post<{ success: boolean; message: string }>(
      `/intake-requests/${id}/reject`,
      { review_note: reviewNote ?? null },
    );
  }

  /** تنزيل المرفق المؤقت — fetch مباشر بالتوكن (نمط correspondenceService.download) */
  async downloadAttachment(requestId: number, attachmentId: number, fileName: string): Promise<void> {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_BASE_URL}/intake-requests/${requestId}/attachments/${attachmentId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('تعذّر تحميل الملف');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

export const intakeRequestService = new IntakeRequestService();
