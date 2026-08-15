import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';
import type { HrLetter, IssueLetterPayload } from '../types/hr';

/**
 * خدمة «خطابات الموارد البشرية» — الوحيدة للوحدة.
 *
 * · نمط `hrService`/`hrLeaveService` حرفياً: `apiClient` ← `if (res.success && res.data)
 *   return res.data` ← `throw new Error(res.message || 'رسالةٌ عربيةٌ احتياطية')`.
 * · **ولا تنزيلَ ثنائياً هنا**: `apiClient` يُرجع JSON مفكوكاً ولا يعرف `blob`، فالـPDF
 *   يعيش في `pages/hr/letters/letterPdf.ts` بـ`fetch` خام — تنفيذٌ واحدٌ يتقاسمه الجدارُ
 *   و`/my-hr` (تصحيحاً لنسخةِ `ContractsTab:299-343` المنسوخةِ من `AdminRequests:51-67`).
 *
 * ⚠️ حدٌّ معلوم في طبقة النقل: `apiClient` يرمي على غير-2xx **برسالةٍ فقط**، فحقلُ
 * `warnings` الذي يردّه المتحكّم بجانب `data` عند الإصدار (تنبيهُ «لا كليشةَ افتراضية»)
 * لا يعبر. ولذلك تُقرأ الكليشةُ الافتراضية قبل الإصدار من `/letterheads/default`
 * (`is_fallback`) وتُعرض تنبيهاً في المودال — لا بعد حرقِ رقمٍ تسلسليّ.
 */

// ══════════ خريطة المسارات — موضعٌ واحدٌ أعلى الملفّ ══════════
//
// كلُّ سطرٍ أدناه مطابقٌ لـ`routes/api.php:1765-1771` (بوّابةُ الموظف) و`:1799-1805`
// (المسارُ المكتبيّ). والبادئة `/api/v1` يضيفها `apiClient` — لا تُكتب هنا.
//
// ولا `PUT` ولا `PATCH` ولا `DELETE` في الخريطة كلِّها: الخطابُ الصادرُ لا يُعدَّل ولا
// يُلغى، والتصحيحُ إصدارٌ جديدٌ برقمٍ جديد.

const HR = '/hr';

const R = {
  list: (employeeId: number) => `${HR}/employees/${employeeId}/letters`,
  issue: (employeeId: number) => `${HR}/employees/${employeeId}/letters`,
  pdf: (employeeId: number, letterId: number) => `${HR}/employees/${employeeId}/letters/${letterId}/pdf`,

  myList: `${HR}/me/letters`,
  myIssue: `${HR}/me/letters`,
  myPdf: (letterId: number) => `${HR}/me/letters/${letterId}/pdf`,
} as const;

// ══════════ الخدمة ══════════

export const hrLetterService = {
  // ───────────── المسار المكتبيّ (القراءة `hr.view` · الإصدار `hr.letters.issue`) ─────────────

  /** سردُ خطابات المنسوب — لقطاتُ الأجر مخفيّةٌ في الخادم لمن لا يملك `hr.compensation.view`. */
  async list(employeeId: number): Promise<HrLetter[]> {
    const res = await apiClient.get<ApiResponse<HrLetter[]>>(R.list(employeeId));
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب الخطابات');
  },

  /** الإصدار — يحرق رقماً تسلسلياً، والخادمُ يوقف كلَّ بيانٍ ناقصٍ بـ422 **قبل** حجزه. */
  async issue(employeeId: number, payload: IssueLetterPayload): Promise<HrLetter> {
    const res = await apiClient.post<ApiResponse<HrLetter>>(R.issue(employeeId), payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّر إصدار الخطاب');
  },

  // ───────────── بوّابةُ الموظف (بلا أيّ `hr.*` — الملفُّ من الجلسة، لا معرّفَ في المسار) ─────────────

  /** خطاباتُ المستخدم لنفسه — الخادمُ لا يكشف لقطةَ أجرٍ هنا إطلاقاً (الأرقامُ في الورقة). */
  async myList(): Promise<HrLetter[]> {
    const res = await apiClient.get<ApiResponse<HrLetter[]>>(R.myList);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب خطاباتك');
  },

  /**
   * إصدارٌ ذاتيّ — «تعريف بالعمل» وحدَه؛ وأيُّ نوعٍ آخر يردّه الخادمُ **422 من التحقّق
   * لا 403**، فلا يُفشى وجودُ الأنواع الأخرى ولا يُفهم الردُّ نقصَ صلاحية.
   */
  async myIssue(payload: IssueLetterPayload): Promise<HrLetter> {
    const res = await apiClient.post<ApiResponse<HrLetter>>(R.myIssue, payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّر إصدار الخطاب');
  },
};

/** يُصدَّر لمن يبني رابطَ تنزيلٍ — ولا تُكتب سلسلةُ مسارٍ خارج هذا الملفّ. */
export const HR_LETTER_ROUTES = R;
