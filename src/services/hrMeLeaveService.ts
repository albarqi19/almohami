import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';
import type {
  LeaveBlocker,
  LeaveCategory,
  LeaveColorKey,
  LeaveDurationBasis,
  LeaveDurationBreakdown,
  LeaveGenderRestriction,
  LeaveSource,
  LeaveStatus,
  LeaveWarning,
  PayTreatment,
} from '../types/hr';

/**
 * **خدمةُ الطلب الذاتيّ** — سطحُ `/hr/me/leaves` وحدَه: الموظفُ يطلب لنفسه.
 *
 * ملفٌّ مستقلٌّ عن `hrLeaveService` عمداً لا تكراراً: تلك خدمةُ **الإدارة** (٢٥ مساراً كلُّها
 * خلف `hr.*` وكلُّها تحمل معرّفَ موظّف)، وهذه ثلاثةُ مساراتٍ **بلا معرِّفٍ إطلاقاً** لأن الملفَّ
 * يُلتقط من الجلسة في الخادم. وخلطُهما يجعل قارئَ الشيفرة يظنّ أن معرِّفَ الموظف اختياريٌّ في
 * بعض النداءات — وهو الظنُّ الذي يُنتج IDOR يوماً.
 *
 * والأنواعُ هنا لا في `types/hr.ts`: هي عقدُ هذه المسارات الثلاثة وحدَها، ولا يقرؤها أحدٌ
 * سواها. وما كان مشتركاً فعلاً (`LeaveBlocker` · `LeaveDurationBreakdown` · `LeaveStatus`)
 * يُستورَد من مصدره ولا يُنسَخ.
 *
 * ⚠️ حدٌّ معلومٌ في طبقة النقل: `apiClient` يرمي على غير-2xx **برسالةٍ فقط** — حقلُ `code`
 * (`attachment_required` · `overlap` …) لا يعبر. فالرسالةُ العربية من الخادم هي ما يُعرض،
 * ولا يُبنى فرعُ واجهةٍ على رمزٍ لا يصل. أمّا حواجزُ المعاينة فتصل كاملةً لأنها **٢٠٠ داخل
 * `data.blockers`** — وعليها وحدَها يُعطَّل زرُّ الإرسال.
 */

const R = {
  list: '/hr/me/leaves', // GET  HrMeLeaveController@index
  preview: '/hr/me/leaves/preview', // POST HrMeLeaveController@preview
  store: '/hr/me/leaves', // POST HrMeLeaveController@store
} as const;

// ══════════ عقدُ الخادم ══════════

/** نوعٌ **يُطلَب** — المفعَّلُ ناقصَ فئة الغياب (يوثّقها المكتب ولا تُطلَب). */
export interface MyLeaveTypeOption {
  id: number;
  code: string;
  name: string;
  category: LeaveCategory;
  duration_basis: LeaveDurationBasis;
  color_key: LeaveColorKey;
  legal_reference: string | null;
  has_ledger_chain: boolean;
  pay_ratio: number;
  /** قيودُ النوع كما هي في صفّه — تُقرأ للعرض، ويعيد الخادمُ فرضَها عند الحفظ. */
  requires_reason: boolean;
  requires_event_date: boolean;
  requires_attachment: boolean;
  min_service_months: number | null;
  max_days_per_event: number | null;
  claim_window_days: number | null;
  /** يُعرَض ولا يُفرَض — لا عمودَ جنسٍ على ملفّ الموظف. */
  gender_restriction: LeaveGenderRestriction | null;
}

/** مستندٌ في ملفّ الموظف نفسِه — منتقي المرفق، بلا معرّفِ ملفٍّ سحابيّ. */
export interface MyLeaveDocumentOption {
  id: number;
  doc_type: string;
  title: string | null;
  file_name: string | null;
  issue_date: string | null;
  is_current: boolean;
}

/** صفٌّ في «سجلّ طلباتي» — بحالته وسببِ رفضه إن رُفض. */
export interface MyLeaveRequestRow {
  id: number;
  leave_type_id: number;
  type_name_snapshot: string;
  start_date: string;
  end_date: string;
  duration_days: string | number;
  calendar_days: number;
  status: LeaveStatus;
  source: LeaveSource;
  reason: string | null;
  rejection_reason: string | null;
  cancellation_reason: string | null;
  employee_document_id: number | null;
  approved_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface MyLeaveFormOptions {
  /** يحسمها الخادم — بلا أنواعٍ مفعّلةٍ لا يُرسَم زرٌّ يرمي ٤٢٢. */
  can_request: boolean;
  types: MyLeaveTypeOption[];
  documents: MyLeaveDocumentOption[];
  hire_date: string | null;
  service_months: number | null;
}

export interface MyLeavesPayload {
  employee_profile_id: number;
  requests: MyLeaveRequestRow[];
  form: MyLeaveFormOptions;
}

export interface MyLeavePreviewPayload {
  leave_type_id: number;
  start_date: string;
  end_date: string;
  event_date?: string | null;
  reason?: string | null;
  employee_document_id?: number | null;
}

/** مُخرَجُ المعاينة — **٢٠٠ حتى مع الحواجز**، والحواجزُ في `blockers` لا في حالة HTTP. */
export interface MyLeavePreview {
  type: {
    id: number;
    code: string;
    name: string;
    category: LeaveCategory;
    duration_basis: LeaveDurationBasis;
    has_ledger_chain: boolean;
    pay_ratio: number;
    legal_reference: string | null;
    color_key: LeaveColorKey;
  };
  duration: LeaveDurationBreakdown;
  balance: {
    available: boolean;
    before: number | null;
    after: number | null;
    has_ledger_chain: boolean;
  };
  pay: {
    treatment: PayTreatment;
    breakdown: Array<{ days: number; pay_ratio: number }>;
  };
  blockers: LeaveBlocker[];
  warnings: LeaveWarning[];
}

export interface MyLeaveRequestPayload extends MyLeavePreviewPayload {
  /** ≤٣٢ حرفاً، **واحدٌ لكلّ فتحةِ نموذج** — النقرةُ المزدوجة تُرجع الصفَّ القائم لا صفّاً ثانياً. */
  client_key: string;
}

export interface MyLeaveRequestResult {
  leave: MyLeaveRequestRow;
  status: LeaveStatus;
  /** بابُ النجاة: مكتبٌ بلا معتمِدٍ غيرِ الطالب ⇒ اعتُمد موسوماً. يُقال ولا يُطمَس. */
  self_approved: boolean;
  pending: boolean;
  duration: LeaveDurationBreakdown;
  balance: MyLeavePreview['balance'] | null;
  warnings: LeaveWarning[];
}

// ══════════ النداءات ══════════

export const hrMeLeaveService = {
  /** سجلُّ طلباتي وخياراتُ النموذج في نداءٍ واحد — فلا تُرسَم الشاشةُ نصفَ صادقة. */
  async getMyLeaves(): Promise<MyLeavesPayload> {
    const res = await apiClient.get<ApiResponse<MyLeavesPayload>>(R.list);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب طلبات إجازتك');
  },

  /** معاينةُ ما سيُخصم قبل الإرسال — قراءةٌ محضة، والمحرّكُ نفسُه الذي سيحكم عند الحفظ. */
  async preview(payload: MyLeavePreviewPayload): Promise<MyLeavePreview> {
    const res = await apiClient.post<ApiResponse<MyLeavePreview>>(R.preview, payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّر احتساب المدّة');
  },

  /** تقديمُ الطلب — يُنشأ معلَّقاً، ولا يُخصم رصيدٌ حتى يُعتمَد. */
  async request(payload: MyLeaveRequestPayload): Promise<MyLeaveRequestResult> {
    const res = await apiClient.post<ApiResponse<MyLeaveRequestResult>>(R.store, payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في إرسال طلب الإجازة');
  },
};

/** يُصدَّر لمن يبني رابطاً — ولا تُكتب سلسلةُ مسارٍ خارج هذا الملفّ. */
export const HR_ME_LEAVE_ROUTES = R;

export default hrMeLeaveService;
