import { apiClient } from '../utils/api';
import type { ApiResponse, PaginatedResponse } from '../utils/api';
import type {
  AttendanceClaim,
  AttendanceDayPayload,
  AttendanceDecisionResult,
  AttendanceEmployeeRef,
  AttendanceQueuePayload,
  AttendanceRecomputePayload,
  AttendanceRecomputeResult,
  AttendanceRecord,
  AttendanceResolution,
  AttendanceSetupHealthReport,
  AttendanceSetupPayload,
  AttendanceSetupResult,
  ClaimApproveResult,
  ClaimListFilters,
  CreateClaimPayload,
  ManualPunchPayload,
  MyAttendanceRecord,
  PunchDirection,
  PunchResult,
  ScheduleAssignPayload,
  ScheduleAssignResult,
  WorkSchedulePage,
  WorkSchedulePayload,
  WorkScheduleResult,
} from '../types/hr';

/**
 * خدمة «الحضور والانصراف» — الوحيدة للوحدة.
 *
 * · نمط `hrService`/`hrLeaveService` حرفياً: `apiClient` ← `if (res.success && res.data) return res.data`
 *   ← `throw new Error(res.message || 'رسالةٌ عربيةٌ احتياطية')`.
 * · المرشِّحات بـ`URLSearchParams` مع إسقاط `''`/`null`/`undefined`.
 * · **صفرُ استطلاعٍ دوريّ يبدأ من هنا**: لا مؤقّت ولا نبض. البصمةُ حدثٌ يقع مرّتين في
 *   اليوم، وكلُّ طلبٍ يمرّ بـ`Tenant::updateLastActivity()` على صفٍّ متوسّطُه ١٢٢ كيلوبايت.
 *
 * ⚠️ حدٌّ معلومٌ في طبقة النقل: `apiClient` يرمي على غير-2xx **برسالةٍ فقط** — حقلُ `code`
 * الذي يردّه المتحكّم (`attendance_disabled` · `not_tracked` · `range_too_long` …) لا يعبر
 * في مسار الخطأ. فالرسالةُ العربية من الخادم هي ما يُعرض، ولا يُبنى فرعُ واجهةٍ على رمزٍ
 * لا يصل. أمّا `punch_blocked_reason` فيصل كاملاً لأنه **٢٠٠ داخل `data`**.
 */

// ══════════ خريطة المسارات — موضعٌ واحدٌ أعلى الملفّ ══════════
//
// كلُّ سطرٍ أدناه مطابقٌ **حرفياً** لمخرَج `php artisan route:list --path=hr`:
//
//   GET  api/v1/hr/attendance/day .................. HrAttendanceController@day
//   GET  api/v1/hr/attendance/queue ................ HrAttendanceController@queue
//   GET  api/v1/hr/attendance/employees/{id} ....... HrAttendanceController@employee
//   POST api/v1/hr/attendance/resolutions .......... HrAttendanceController@storeResolution
//   POST api/v1/hr/attendance/resolutions/{id}/void  HrAttendanceController@voidResolution
//   POST api/v1/hr/attendance/punches .............. HrAttendanceController@storePunch
//   GET  api/v1/hr/attendance/claims ............... HrAttendanceClaimController@index
//   POST api/v1/hr/attendance/claims/{id}/approve .. HrAttendanceClaimController@approve
//   POST api/v1/hr/attendance/claims/{id}/reject ... HrAttendanceClaimController@reject
//   POST api/v1/hr/attendance/claims/{id}/cancel ... HrAttendanceClaimController@cancel
//   GET  api/v1/hr/me/attendance ................... HrAttendanceController@meIndex
//   POST api/v1/hr/me/attendance/punch ............. HrAttendanceController@punch
//   POST api/v1/hr/me/attendance/claims ............ HrAttendanceClaimController@meStore
//   POST api/v1/hr/attendance/setup ................ HrAttendanceSetupController@setup
//   GET  api/v1/hr/attendance/setup-health ......... HrAttendanceSetupController@health
//   POST api/v1/hr/attendance/recompute ............ HrAttendanceSetupController@recompute
//   GET  api/v1/hr/work-schedules .................. HrWorkScheduleController@index
//   POST api/v1/hr/work-schedules .................. HrWorkScheduleController@store
//   PUT  api/v1/hr/work-schedules/{id} ............. HrWorkScheduleController@update
//   POST api/v1/hr/work-schedules/{id}/new-version . HrWorkScheduleController@newVersion
//   POST api/v1/hr/work-schedules/{id}/assign ...... HrWorkScheduleController@assign
//   POST api/v1/hr/work-schedules/{id}/activate .... HrWorkScheduleController@activate
//   POST api/v1/hr/work-schedules/{id}/deactivate .. HrWorkScheduleController@deactivate
//
// 🚫 **ولا مفتاحَ لمسارٍ لا تناديه شاشة**: `/hr/work-sites` قائمٌ في `route:list` **ولا
// مفتاحَ له هنا** — مصدرُ البصمة في v1 هو `web` بلا موقع، والمتحكّمُ نفسُه يردّ
// `meta.used_by_punches = false`. فشاشةُ مواقعَ تُدخِل إحداثيّاً ونصفَ قطرٍ لا يدخلان
// احتساباً تَعِد المستخدمَ بأثرٍ لا يقع — وهو نقيضُ العرف الذي أبقى `setup` خارج هذه
// الخريطة حتى بُني. يُضاف المفتاحُ يومَ يُفتح علَمُ `hr_attendance_sources`.
//
// والبادئة `/api/v1` يضيفها `apiClient` — لا تُكتب هنا.

const BASE = '/hr/attendance';
const ME = '/hr/me/attendance';
const SCHED = '/hr/work-schedules';

const R = {
  // سطحُ المدير
  day: `${BASE}/day`,
  queue: `${BASE}/queue`,
  employee: (id: number) => `${BASE}/employees/${id}`,
  resolutions: `${BASE}/resolutions`,
  voidResolution: (id: number) => `${BASE}/resolutions/${id}/void`,
  punches: `${BASE}/punches`,
  claims: `${BASE}/claims`,
  approveClaim: (id: number) => `${BASE}/claims/${id}/approve`,
  rejectClaim: (id: number) => `${BASE}/claims/${id}/reject`,
  cancelClaim: (id: number) => `${BASE}/claims/${id}/cancel`,

  // التهيئةُ والتشخيصُ وإعادةُ الاحتساب — البابُ الذي يفتح الوحدةَ من الواجهة
  setup: `${BASE}/setup`,
  setupHealth: `${BASE}/setup-health`,
  recompute: `${BASE}/recompute`,

  // جداولُ الدوام — النسخةُ ثابتةٌ والتغييرُ نسخةٌ جديدةٌ بإسنادٍ من تاريخ
  schedules: SCHED,
  schedule: (id: number) => `${SCHED}/${id}`,
  scheduleVersion: (id: number) => `${SCHED}/${id}/new-version`,
  scheduleAssign: (id: number) => `${SCHED}/${id}/assign`,
  scheduleActivate: (id: number) => `${SCHED}/${id}/activate`,
  scheduleDeactivate: (id: number) => `${SCHED}/${id}/deactivate`,

  // بوّابةُ الموظف — بلا أيّ بارامتر معرِّف (الملفّ يُلتقط بالجلسة، وإلّا IDOR)
  mine: ME,
  punch: `${ME}/punch`,
  myClaims: `${ME}/claims`,
} as const;

// ══════════ مساعدات ══════════

type QueryScalar = string | number | boolean | null | undefined;
type QueryInput = Record<string, QueryScalar>;

/** بناءُ سلسلة الاستعلام — إسقاطُ `''`/`null`/`undefined` (نسخُ `hrService:26-28`). */
function qs(params: QueryInput): string {
  const sp = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    sp.append(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
  });

  const query = sp.toString();
  return query ? `?${query}` : '';
}

/** صفحةُ الادّعاءات: الترقيمُ في `data` وأسماءُ أصحابها في `employees` **خارج** المغلَّف. */
export interface ClaimsPage {
  page: PaginatedResponse<AttendanceClaim>;
  employees: Record<number, AttendanceEmployeeRef>;
}

/** حمولةُ القرار الجماعيّ — موظفٌ واحدٌ وتواريخُ متعدّدةٌ وسببٌ واحدٌ يُكتب مرّة. */
export interface DecidePayload {
  employee_profile_id: number;
  dates: string[];
  /** القيمةُ المسموحة من الشاشة **واحدة**: `present_confirmed`. */
  decision: 'present_confirmed';
  reason: string;
}

// ══════════ الخدمة ══════════

export const hrAttendanceService = {
  // ───────────── سطحُ المدير (hr.attendance.view / .manage) ─────────────

  /**
   * شاشةُ اليوم — مكتبٌ لم يُفعّل الحضور يُرجع **٢٠٠ بمصفوفةٍ فارغة** لا ٤٠٤.
   *
   * 🔑 وتحمل الحمولةُ **صنفين لا يختلطان**: `rows` أحكامٌ مشتقّةٌ كتبها المحرّك، و
   * `uncomputed_punches` وقائعُ خامٌّ لم يُحتسب يومُها بعد — ومعها `engine_runs_at`. الفصلُ
   * في المفتاح هو ما يمنع أن تُقرأ واقعةٌ على أنها حكم.
   */
  async getDay(date?: string): Promise<AttendanceDayPayload> {
    const res = await apiClient.get<ApiResponse<AttendanceDayPayload>>(`${R.day}${qs({ date })}`);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب حضور اليوم');
  },

  /**
   * الطابورُ **مجموعٌ تحت الموظف** ومعه اقتراحٌ مُسبَّقٌ لكلّ يوم.
   * افتراضُ المدى أسبوعان، ونافذةُ الصمت (٧٢ ساعة) يفرضها الخادمُ لا الواجهة.
   */
  async getQueue(params: { from?: string; to?: string; employee_profile_id?: number | null } = {}):
    Promise<AttendanceQueuePayload> {
    const res = await apiClient.get<ApiResponse<AttendanceQueuePayload>>(`${R.queue}${qs(params)}`);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب طابور المراجعة');
  },

  /** سجلُّ موظفٍ بعينه — سقفُ المدى ٩٢ يوماً يفرضه الخادم. */
  async getEmployee(employeeProfileId: number, params: { from?: string; to?: string } = {}):
    Promise<AttendanceRecord> {
    const res = await apiClient.get<ApiResponse<AttendanceRecord>>(
      `${R.employee(employeeProfileId)}${qs(params)}`
    );
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب سجلّ الحضور');
  },

  /** قرارٌ جماعيٌّ بسببٍ واحد — ويومٌ ليس محلَّ التباسٍ يُردّ مفصَّلاً في `skipped`. */
  async decide(payload: DecidePayload): Promise<AttendanceDecisionResult> {
    const res = await apiClient.post<ApiResponse<AttendanceDecisionResult>>(R.resolutions, payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في حفظ القرار');
  },

  /** النقضُ **إلحاقٌ لا تعديل** — صفُّ `void` يشير إلى سابقه، ولا يُنقض قرارٌ مرّتين. */
  async voidResolution(resolutionId: number, reason: string):
    Promise<{ resolution: AttendanceResolution; voided_id: number }> {
    const res = await apiClient.post<ApiResponse<{ resolution: AttendanceResolution; voided_id: number }>>(
      R.voidResolution(resolutionId),
      { reason }
    );
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في نقض القرار');
  },

  /** إدخالٌ يدويٌّ من المدير — بصمةٌ **جديدة** بمصدر `manual`، ولا تُعدَّل بصمةٌ قائمة. */
  async addManualPunch(payload: ManualPunchPayload): Promise<PunchResult> {
    const res = await apiClient.post<ApiResponse<PunchResult>>(R.punches, payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في تسجيل البصمة');
  },

  /** طابورُ اعتماد الادّعاءات — الترقيمُ كما يصل، والأسماءُ خارج المغلَّف. */
  async listClaims(filters: ClaimListFilters = {}): Promise<ClaimsPage> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<AttendanceClaim>> & {
      employees?: Record<number, AttendanceEmployeeRef>;
    }>(`${R.claims}${qs(filters as QueryInput)}`);

    if (res.success && res.data) return { page: res.data, employees: res.employees ?? {} };
    throw new Error(res.message || 'فشل في جلب الادّعاءات');
  },

  async approveClaim(claimId: number): Promise<ClaimApproveResult> {
    const res = await apiClient.post<ApiResponse<ClaimApproveResult>>(R.approveClaim(claimId), {});
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في اعتماد الادّعاء');
  },

  async rejectClaim(claimId: number, reason: string): Promise<AttendanceClaim> {
    const res = await apiClient.post<ApiResponse<AttendanceClaim>>(R.rejectClaim(claimId), { reason });
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في رفض الادّعاء');
  },

  async cancelClaim(claimId: number, reason: string): Promise<AttendanceClaim> {
    const res = await apiClient.post<ApiResponse<AttendanceClaim>>(R.cancelClaim(claimId), { reason });
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في سحب الادّعاء');
  },

  // ───────────── التهيئة والتشخيص (hr.attendance.manage / .view) ─────────────

  /**
   * 🔑 **البابُ الوحيد لتفعيل الوحدة**: نسخةُ جدولٍ + إسنادٌ مؤرَّخ + عَلَمُ الملفّات + عَلَمُ
   * المكتب — في معاملةٍ واحدة.
   *
   * `created:false` يعني **نداءً عديمَ الأثر** (تكرارٌ) لا فشلاً: النسخةُ المطابقةُ دلالياً
   * تُعاد بلا كتابة، والإسنادُ `insertOrIgnore`، والأعلامُ لا تُكتب إلا لمن يتغيّر.
   */
  async setup(payload: AttendanceSetupPayload): Promise<AttendanceSetupResult> {
    const res = await apiClient.post<ApiResponse<AttendanceSetupResult>>(R.setup, payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في تهيئة الحضور');
  },

  /** تشخيصُ التهيئة — قراءةٌ محضةٌ بصفر كتابةٍ وعددِ استعلاماتٍ ثابت. */
  async getSetupHealth(params: { from?: string; to?: string } = {}): Promise<AttendanceSetupHealthReport> {
    const res = await apiClient.get<ApiResponse<AttendanceSetupHealthReport>>(
      `${R.setupHealth}${qs(params)}`
    );
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في قراءة حالة التهيئة');
  },

  /**
   * إعادةُ الاحتساب — **وسمٌ فقط**. الطلبُ يكتب في طابور الاتّساخ وينصرف، والمحرّكُ يصرفه
   * في `engine_runs_at`. ولذلك يُقال للمدير **متى يعمل** لا «تمّ» — وإلا وقف أمام رقمٍ
   * لا يتغيّر أمامه فظنّ العطل.
   */
  async recompute(payload: AttendanceRecomputePayload): Promise<AttendanceRecomputeResult> {
    const res = await apiClient.post<ApiResponse<AttendanceRecomputeResult>>(R.recompute, payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في طلب إعادة الاحتساب');
  },

  // ───────────── جداولُ الدوام ─────────────

  /** القائمةُ ومعها استعمالُ كلّ نسخةٍ و`editable` — و`meta` **خارج** المغلَّف. */
  async listSchedules(params: { is_active?: boolean } = {}): Promise<WorkSchedulePage> {
    const res = await apiClient.get<ApiResponse<WorkSchedulePage['schedules']> & {
      meta?: {
        weekend_setting?: string[];
        default_schedule_id?: number | null;
        day_keys?: WorkSchedulePage['day_keys'];
      };
    }>(`${R.schedules}${qs(params as QueryInput)}`);

    if (res.success && res.data) {
      return {
        schedules: res.data,
        weekend_setting: res.meta?.weekend_setting ?? [],
        default_schedule_id: res.meta?.default_schedule_id ?? null,
        day_keys: res.meta?.day_keys ?? [],
      };
    }

    throw new Error(res.message || 'فشل في جلب جداول الدوام');
  },

  /** جدولٌ جديدٌ باسمٍ جديد — أوّلُ جدولٍ في المكتب يصير الافتراضيَّ تلقائياً. */
  async createSchedule(payload: WorkSchedulePayload): Promise<WorkScheduleResult> {
    const res = await apiClient.post<ApiResponse<WorkScheduleResult>>(R.schedules, payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في إنشاء جدول الدوام');
  },

  /**
   * تحريرٌ في المكان — **لنسخةٍ لم تُستعمل بعد وحدَها** (`editable === true`).
   * ونسخةٌ مستعمَلةٌ تُردّ ٤٢٢ ترشد إلى «نسخةٌ جديدة من تاريخ»، ولا تُحرَّر.
   */
  async updateSchedule(scheduleId: number, payload: WorkSchedulePayload): Promise<WorkScheduleResult> {
    const res = await apiClient.put<ApiResponse<WorkScheduleResult>>(R.schedule(scheduleId), payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في تحديث الجدول');
  },

  /**
   * 🔑 **نسخةٌ جديدةٌ من نسخةٍ قائمة** — الطريقُ الوحيد لتغيير جدولٍ مستعمَل.
   * والقديمةُ تبقى كما هي: **وهي وحدَها ما يحرس الماضي**.
   */
  async newScheduleVersion(scheduleId: number, payload: WorkSchedulePayload): Promise<WorkScheduleResult> {
    const res = await apiClient.post<ApiResponse<WorkScheduleResult>>(
      R.scheduleVersion(scheduleId),
      payload
    );
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في إنشاء نسخةٍ جديدة');
  },

  /** إسنادُ النسخة لموظفين **من تاريخ** — والرجعيُّ يلزمه سببٌ ويُرجع عددَ الأيام المتأثّرة. */
  async assignSchedule(scheduleId: number, payload: ScheduleAssignPayload): Promise<ScheduleAssignResult> {
    const res = await apiClient.post<ApiResponse<ScheduleAssignResult>>(
      R.scheduleAssign(scheduleId),
      payload
    );
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في إسناد الجدول');
  },

  /** تعطيلٌ/تفعيل — **بديلُ الحذف الذي لا وجودَ له**: الصفُّ مرجعُ كلّ يومٍ يُشير إليه. */
  async setScheduleActive(scheduleId: number, active: boolean): Promise<WorkScheduleResult> {
    const res = await apiClient.post<ApiResponse<WorkScheduleResult>>(
      active ? R.scheduleActivate(scheduleId) : R.scheduleDeactivate(scheduleId),
      {}
    );
    if (res.success && res.data) return res.data;
    throw new Error(res.message || (active ? 'فشل في تفعيل الجدول' : 'فشل في تعطيل الجدول'));
  },

  // ───────────── بوّابةُ الموظف (بلا أيّ صلاحية — العزلُ بالجلسة) ─────────────

  /** سجلُّ الموظف عن نفسه — **مطابقٌ حقلاً بحقلٍ لما يراه مديرُه**. */
  async getMine(params: { from?: string; to?: string } = {}): Promise<MyAttendanceRecord> {
    const res = await apiClient.get<ApiResponse<MyAttendanceRecord>>(`${R.mine}${qs(params)}`);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب سجلّ حضورك');
  },

  /**
   * البصمة. `punched_at` **لا يُرسَل إطلاقاً**: وقتُ الخادم هو الحُجّة.
   * و`client_key` يجعل النقرةَ المكرّرة صفّاً واحداً بـ٢٠٠ لا خطأً يبدو عطلاً.
   */
  async punch(direction: PunchDirection, clientKey: string): Promise<PunchResult> {
    const res = await apiClient.post<ApiResponse<PunchResult>>(R.punch, {
      direction,
      client_key: clientKey,
    });
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في تسجيل البصمة');
  },

  /** «هذا غير صحيح» — الطريقُ الوحيد الذي يملكه الموظفُ لتصحيح يومه. */
  async createMyClaim(payload: CreateClaimPayload): Promise<AttendanceClaim> {
    const res = await apiClient.post<ApiResponse<AttendanceClaim>>(R.myClaims, payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في إرسال الطلب');
  },
};

export default hrAttendanceService;
