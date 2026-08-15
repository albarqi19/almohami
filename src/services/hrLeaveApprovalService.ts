import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';
import type { LeaveConflictContext } from '../types/hr';

/**
 * **سطحُ ما يراه المعتمِد** — الطابورُ وسياقُ القرار، قراءةً محضة.
 *
 * ══════ لماذا ملفُّ خدمةٍ مستقلٌّ عن `hrLeaveService` ══════
 * ليس تكراراً بل فصلُ عقود: تلك تخدم شاشةَ الإدارة (التسجيلُ والتصحيحُ والدفتر، ٢٥ مساراً)،
 * وهذه مساران للقراءة قبل قرارٍ بشريّ. **وكتابةُ القرار لا تُنسَخ هنا إطلاقاً**: الاعتمادُ
 * والرفضُ يُناديان `hrLeaveService.approve/reject` كما هما — مسارٌ واحدٌ لكلّ فعلٍ في المنصّة،
 * ونسخةٌ ثانيةٌ من نداءِ اعتمادٍ تعني يوماً أنّ أحدَهما أُصلح والآخرَ لا.
 *
 * ══════ الفشلُ صامتٌ في التعارض، صريحٌ في الطابور ══════
 * `getDecision` تفشل **صراحةً** (ترمي): هي كلُّ محتوى الشاشة، وإخفاءُ عطلِها يرسم قراراً على
 * بياناتٍ لا وجودَ لها. أمّا سياقُ التعارض داخلها فالخادمُ يبنيه بمصفوفاتٍ فارغةٍ عند تعثّره
 * (`LeaveConflictDetector::emptyResult`) — فلا يسقط القرارُ لسقوط بانرِ سياق.
 *
 * 🔴 و`conflict_summary` في الطابور **`null` لا `false`** لمن تجاوز سقفَ المسح: «لم يُفحص»
 * حقيقةٌ ثالثةٌ لا تُخلَط بـ«فُحص فلم يُوجد»، والواجهةُ تكتبها كذلك.
 *
 * ⚠️ حدٌّ معلومٌ في طبقة النقل: `apiClient` يرمي على غير-2xx برسالةٍ فقط — لا يعبر حقلُ
 * `code`. فالرسالةُ العربية من الخادم هي ما يُعرض، ولا يُبنى فرعُ واجهةٍ على رمزٍ لا يصل.
 */

const HR = '/hr';

const R = {
  queue: `${HR}/leaves/approval-queue`,               // GET HrLeaveApprovalController@queue
  decision: (leaveId: number) => `${HR}/leaves/${leaveId}/decision`, // GET @decision
} as const;

// ══════════ الأشكال ══════════

/** عدّادُ التعارض لصفٍّ في الطابور — أعدادٌ لا صفوف؛ التفصيلُ في `getDecision`. */
export interface ApprovalConflictSummary {
  scheduled_sessions: number;
  pending_tasks: number;
  overlapping_leaves: number;
  has_conflicts: boolean;
}

/**
 * أثرُ الاعتماد في الرصيد — محاكاةُ ما سيكتبه الدفتر لا حسابٌ موازٍ.
 *
 * `balance_before`/`balance_after` **معدومان** (لا صفران) للأنواع بلا سلسلةِ دفتر:
 * نوعٌ لا رصيدَ له ليس نوعاً رصيدُه صفر.
 */
export interface ApprovalImpact {
  charges_ledger: boolean;
  days: number;
  balance_before: number | null;
  balance_after: number | null;
  will_go_negative: boolean;
}

export interface ApprovalQueueRow {
  id: number;
  employee_profile_id: number;
  employee_name: string | null;
  department: string | null;
  leave_type_id: number;
  type_name: string | null;
  type_code: string | null;
  color_key: string | null;
  start_date: string | null;
  end_date: string | null;
  duration_days: number;
  reason: string | null;
  source: string;
  requested_at: string | null;
  /** `null` = لم يُفحص (تجاوز سقفَ المسح) — **ليس** «لا تعارض». */
  conflict_summary: ApprovalConflictSummary | null;
  impact: ApprovalImpact;
}

export interface ApprovalQueuePayload {
  rows: ApprovalQueueRow[];
  count: number;
  limit: number;
  conflict_scan_limit: number;
  conflicts_scanned: number;
}

export interface ApprovalDecisionLeave {
  id: number;
  employee_profile_id: number;
  employee_name: string | null;
  department: string | null;
  leave_type_id: number;
  type_name: string | null;
  type_code: string | null;
  color_key: string | null;
  legal_reference: string | null;
  start_date: string | null;
  end_date: string | null;
  duration_days: number;
  reason: string | null;
  status: string;
  source: string;
  requested_at: string | null;
  rejection_reason: string | null;
}

export interface ApprovalDecisionPayload {
  leave: ApprovalDecisionLeave;
  is_pending: boolean;
  /** طالبُ الإجازة هو الناظرُ نفسُه — لا يعتمد المرءُ صفَّ نفسِه (`assertCanApprove`). */
  is_own_request: boolean;
  /** الشكلُ نفسُه الذي يرجعه `HrLeaveController@conflicts` — بلا نوعٍ ثانٍ مخترَع. */
  conflict: LeaveConflictContext;
  impact: ApprovalImpact;
}

// ══════════ النداءات ══════════

export const hrLeaveApprovalService = {
  /**
   * طابورُ المعلَّق — الصفوفُ وتعارضُها وأثرُها في الرصيد في نداءٍ واحد.
   *
   * ثلاثُ موجاتٍ شبكيةٍ ترسم شاشةً نصفَ صادقة: يرى المعتمِدُ الأسماءَ قبل أن يرى تحذيرَها
   * فيقرّر بين الموجتين.
   */
  async getQueue(params: { limit?: number; employee_profile_id?: number } = {}): Promise<ApprovalQueuePayload> {
    const sp = new URLSearchParams();
    if (params.limit !== undefined) sp.append('limit', String(params.limit));
    if (params.employee_profile_id !== undefined) {
      sp.append('employee_profile_id', String(params.employee_profile_id));
    }

    const query = sp.toString();
    const res = await apiClient.get<ApiResponse<ApprovalQueuePayload>>(
      `${R.queue}${query ? `?${query}` : ''}`
    );

    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّر جلب طلبات الاعتماد');
  },

  /** سياقُ قرارٍ واحد — يرمي على الفشل: هذه كلُّ محتوى الشاشة، لا بانرٌ مساعد. */
  async getDecision(leaveId: number): Promise<ApprovalDecisionPayload> {
    const res = await apiClient.get<ApiResponse<ApprovalDecisionPayload>>(R.decision(leaveId));
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّر جلب سياق القرار');
  },
};
