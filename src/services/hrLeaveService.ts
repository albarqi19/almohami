import { apiClient } from '../utils/api';
import type { ApiResponse, PaginatedResponse } from '../utils/api';
import type {
  HrLeave,
  HrLeaveRule,
  HrLeaveType,
  LeaveApproveResult,
  LeaveBalanceSnapshot,
  LeaveBulkOpeningResult,
  LeaveBulkRecomputeResult,
  LeaveCalendarPayload,
  LeaveCancelResult,
  LeaveConflictContext,
  LeaveLedgerEntry,
  LeaveLedgerFilters,
  LeaveLedgerSummary,
  LeaveListFilters,
  LeaveOpeningResult,
  LeavePreview,
  LeavePreviewPayload,
  LeaveRecomputeResult,
  LeaveRecordPayload,
  LeaveRecordResult,
  LeaveRosterBalance,
  LeaveRosterCounts,
  LeaveRosterFilters,
  LeaveRosterRow,
  LeaveShortenResult,
  LeaveStats,
  LedgerEntryType,
  LegacyConvertPreview,
  LegacyConvertResult,
  LegacyLeaveFilters,
  LegacyLeaveRow,
  LegacyLeaveSummary,
  MyLeaveSummary,
  OnLeaveNowRow,
  OpeningBasis,
  OpeningPreviewRow,
} from '../types/hr';

/**
 * خدمة «الإجازات والغياب» — الوحيدة للوحدة.
 *
 * · نمط `hrService` حرفياً: `apiClient` ← `if (res.success && res.data) return res.data`
 *   ← `throw new Error(res.message || 'رسالة عربية احتياطية')`.
 * · **صفرُ استدعاءٍ لـ`AdminRequestService`**: التعايشُ يمرّ بمسار HR وحدَه
 *   (`legacy-requests` و`legacy-summary`) وخلفه `LegacyLeaveReader`.
 * · **صفرُ `AbortController`**: `apiClient.request` لا يقبل `signal`، فالإلغاءُ يتحقّق
 *   بمفتاح `useQuery` نفسِه — أصدقُ من ادّعاء إلغاءٍ شبكيٍّ غير موجود.
 *
 * ⚠️ حدٌّ معلوم في طبقة النقل: `apiClient` يرمي على غير-2xx برسالةٍ فقط — حقلُ `code`
 * الذي يردّه متحكّم الإجازات (`terminal_status` · `overlap` · `opening_exists` …)
 * **لا يعبر**. فالرسالةُ العربية من الخادم هي ما يُعرض بـtoast، ولا يُبنى فرعُ واجهةٍ
 * على رمزٍ لا يصل. أمّا حواجزُ المعاينة فتصل كاملةً لأنها **200 داخل `data.blockers`**.
 */

// ══════════ خريطة المسارات — موضعٌ واحدٌ أعلى الملفّ ══════════
//
// كلُّ سطرٍ أدناه مطابقٌ لمخرَج `php artisan route:list --path=hr` (٢٥ مساراً من ٥٦).
// أيُّ تغييرٍ في `routes/api.php` تعديلُ سطرٍ واحدٍ هنا لا مطاردةُ سلاسلَ في المكوّنات.
// والبادئة `/api/v1` يضيفها `apiClient` — لا تُكتب هنا.

const HR = '/hr';
const emp = (employeeId: number) => `${HR}/employees/${employeeId}`;
const oneLeave = (employeeId: number, leaveId: number) => `${emp(employeeId)}/leaves/${leaveId}`;

const R = {
  // الكتالوج
  leaveTypes: `${HR}/leave-types`,                                   // GET  HrLeaveTypeController@index
  leaveRules: `${HR}/leave-rules`,                                   // GET  HrLeaveRuleController@index

  // المعاينة والتسجيل
  preview: `${HR}/leaves/preview`,                                   // POST HrLeaveController@preview
  store: (e: number) => `${emp(e)}/leaves`,                          // POST HrLeaveController@store
  storeForUser: (u: number) => `${HR}/leaves/for-user/${u}`,         // POST HrLeaveController@storeForUser

  // القرار والتصحيح
  approve: (e: number, l: number) => `${oneLeave(e, l)}/approve`,    // POST HrLeaveController@approve
  reject: (e: number, l: number) => `${oneLeave(e, l)}/reject`,      // POST HrLeaveController@reject
  cancel: (e: number, l: number) => `${oneLeave(e, l)}/cancel`,      // POST HrLeaveController@cancel
  shorten: (e: number, l: number) => `${oneLeave(e, l)}/shorten`,    // POST HrLeaveController@shorten
  recompute: (e: number, l: number) => `${oneLeave(e, l)}/recompute`, // POST HrLeaveController@recompute
  bulkRecompute: `${HR}/leaves/recompute`,                           // POST HrLeaveController@bulkRecompute

  // الرصيد والدفتر
  balance: (e: number) => `${emp(e)}/leave-balance`,                 // GET  HrLeaveBalanceController@show
  balances: `${HR}/leaves/balances`,                                 // GET  HrLeaveBalanceController@balances
  roster: `${HR}/leaves/roster`,                                     // GET  HrLeaveBalanceController@roster
  ledger: (e: number) => `${emp(e)}/leave-ledger`,                   // GET  HrLeaveBalanceController@ledger
  opening: (e: number) => `${emp(e)}/leave-balance/opening`,         // POST HrLeaveBalanceController@opening
  bulkOpening: `${HR}/leave-balances/bulk-opening`,                  // POST HrLeaveBalanceController@bulkOpening
  openingPreview: `${HR}/leave-balances/opening-preview`,            // POST HrLeaveBalanceController@openingPreview

  // سطح القراءة
  list: `${HR}/leaves`,                                              // GET  HrLeaveController@index
  employeeLeaves: (e: number) => `${emp(e)}/leaves`,                 // GET  HrLeaveController@index (بمعرّف المسار)
  stats: `${HR}/leaves/stats`,                                       // GET  HrLeaveController@stats
  calendar: `${HR}/leaves/calendar`,                                 // GET  HrLeaveController@calendar
  onLeaveNow: `${HR}/leaves/on-leave-now`,                           // GET  HrLeaveController@onLeaveNow
  conflicts: `${HR}/leaves/conflicts`,                               // GET  HrLeaveController@conflicts

  // التعايش وحساب المستخدم
  legacyRequests: (e: number) => `${emp(e)}/legacy-requests`,        // GET  HrLeaveController@legacyRequests
  legacyPreview: (e: number, r: number) => `${emp(e)}/legacy-requests/${r}/preview`, // POST HrLeaveController@legacyConvertPreview
  legacyConvert: (e: number, r: number) => `${emp(e)}/legacy-requests/${r}/convert`, // POST HrLeaveController@legacyConvert
  legacySummary: `${HR}/leaves/legacy-summary`,                      // GET  HrLeaveController@legacySummary
  meSummary: `${HR}/me/leave-summary`,                               // GET  HrLeaveController@meLeaveSummary
} as const;

// ══════════ مساعدات ══════════

type QueryScalar = string | number | boolean | null | undefined;
type QueryInput = Record<string, QueryScalar | Array<string | number>>;

/**
 * بناء سلسلة الاستعلام — إسقاطُ `''`/`null`/`undefined` (نسخُ `hrService:26-28`).
 *
 * البوليان يُرسَل `1`/`0` **لا** `true`/`false`: قاعدةُ Laravel `boolean` ترفض النصّ
 * `"true"`، فيسقط `drift` صامتاً ويُعرض انحرافٌ معدوم حيث الصواب رقم. و`false` **لا
 * يُسقَط** — `is_active=0` مرشِّحٌ مقصود لا قيمةٌ فارغة.
 */
function qs(params: QueryInput): string {
  const sp = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;

    if (Array.isArray(value)) {
      value.forEach((item) => sp.append(`${key}[]`, String(item)));
      return;
    }

    sp.append(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
  });

  const query = sp.toString();
  return query ? `?${query}` : '';
}

/**
 * هيكلُ سياق التعارض فارغاً — **موضعٌ واحدٌ يملك قائمة المفاتيح** في الفرونت، مطابقٌ
 * لـ`LeaveConflictDetector::emptyResult` في الباك. يُستعمل في `catch` وحدَه.
 */
function emptyConflictContext(startDate: string, endDate: string): LeaveConflictContext {
  return {
    request_window: { start_date: startDate, end_date: endDate, duration_days: 0 },
    employee: { id: 0, name: null, role: null },
    previous_leaves: {
      same_type_count: 0,
      same_type_days: 0,
      this_year_count: 0,
      this_year_days: 0,
      all_approved: 0,
      recent_same_type: [],
    },
    pending_tasks: [],
    scheduled_sessions: [],
    overlapping_leaves: [],
    has_conflicts: false,
  };
}

function emptyLegacySummary(): LegacyLeaveSummary {
  return {
    approved_count: 0,
    pending_count: 0,
    total_calendar_days: 0,
    first_date: null,
    last_date: null,
    note: '',
  };
}

function emptyPage<T>(perPage = 20): PaginatedResponse<T> {
  return { data: [], current_page: 1, last_page: 1, per_page: perPage, total: 0, from: 0, to: 0 };
}

// ══════════ الأشكال المركّبة التي يردّها المتحكّم خارج `data` ══════════

/** سردُ الدفتر: صفحةٌ في `data` وملخّصٌ في `summary` (خارج المغلَّف). */
export interface LeaveLedgerPage {
  page: PaginatedResponse<LeaveLedgerEntry>;
  summary: LeaveLedgerSummary | null;
}

/** الطلبات الإدارية: صفحةٌ في `data` وتعليمٌ صريحٌ في `meta`. */
export interface LegacyRequestsPage {
  page: PaginatedResponse<LegacyLeaveRow>;
  counted_in_balance: boolean;
  note: string;
}

/**
 * صفحةُ العمود الأيمن: صفوفٌ بأرصدتها في `data`، وعدّاداتُ الشرائح في `counts` (خارج
 * المغلَّف كـ`summary` في سرد الدفتر).
 *
 * `counts` **قد تكون `null`**: خادمٌ قديمٌ لم يرسلها. والمتصفّحُ حينئذٍ **لا يخترع رقماً** —
 * تُعرض الشريحةُ بلا عدد. عدُّ الصفحة المعروضة محلياً كان بالضبط ما جعل «الكل ٠» يقف فوق
 * ثمانيةِ صفوف، و«غائبٌ الآن ٠» بينما الغائبُ في الصفحة الثانية.
 */
export interface LeaveRosterPage {
  page: PaginatedResponse<LeaveRosterRow>;
  counts: LeaveRosterCounts | null;
  /** العتبةُ التي حُسب بها `counts.low` كما أعادها الخادم. */
  low_threshold: number | null;
}

// ══════════ الخدمة ══════════

export const hrLeaveService = {
  // ───────────── الكتالوج (staleTime طويل — لا يُبطله إبطال ['hr','leave']) ─────────────

  async getTypes(filters: { is_active?: boolean; category?: string } = {}): Promise<HrLeaveType[]> {
    const res = await apiClient.get<ApiResponse<HrLeaveType[]>>(`${R.leaveTypes}${qs(filters)}`);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب أنواع الإجازات');
  },

  async getRules(onDate?: string, codes?: string[]): Promise<HrLeaveRule[]> {
    const res = await apiClient.get<ApiResponse<HrLeaveRule[]>>(
      `${R.leaveRules}${qs({ on_date: onDate, codes })}`
    );
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب القواعد النظامية');
  },

  // ───────────── المعاينة والتسجيل ─────────────

  /**
   * المعاينة تُردّ **بـ200 حتى مع الحواجز** — الحواجزُ داخل `data.blockers`.
   * لا يُقرأ رمزُ HTTP دليلاً على الصلاحية، ولا يُبتلع الرد لأنّ فيه حاجزاً.
   */
  async preview(payload: LeavePreviewPayload): Promise<LeavePreview> {
    const res = await apiClient.post<ApiResponse<LeavePreview>>(R.preview, payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّرت معاينة الاحتساب');
  },

  /** التسجيل على موظفٍ له ملفّ. الواقعةُ في `data.leave` — **لا** في `data` نفسها. */
  async record(employeeId: number, payload: LeaveRecordPayload): Promise<LeaveRecordResult> {
    const res = await apiClient.post<ApiResponse<LeaveRecordResult>>(R.store(employeeId), payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل تسجيل الواقعة');
  },

  /** التسجيل على منسوبٍ بلا ملفّ — الملفُّ يُنشأ في نفس معاملة التسجيل. */
  async recordForUser(userId: number, payload: LeaveRecordPayload): Promise<LeaveRecordResult> {
    const res = await apiClient.post<ApiResponse<LeaveRecordResult>>(R.storeForUser(userId), payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل تسجيل الواقعة');
  },

  // ───────────── القرار ─────────────

  async approve(employeeId: number, leaveId: number, notes?: string): Promise<LeaveApproveResult> {
    const res = await apiClient.post<ApiResponse<LeaveApproveResult>>(
      R.approve(employeeId, leaveId),
      { notes: notes ?? null }
    );
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل اعتماد الإجازة');
  },

  /** السببُ إلزاميّ في الباك — والتحقّق القبليّ في المودال يمنع نداءً محكوماً بالرفض. */
  async reject(employeeId: number, leaveId: number, rejectionReason: string): Promise<HrLeave> {
    const res = await apiClient.post<ApiResponse<HrLeave>>(
      R.reject(employeeId, leaveId),
      { rejection_reason: rejectionReason }
    );
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل رفض الإجازة');
  },

  // ───────────── التصحيح (بلا حذفٍ إطلاقاً — لا مسارَ DELETE في الوحدة) ─────────────

  async cancel(
    employeeId: number,
    leaveId: number,
    cancellationReason: string,
    effectiveDate?: string
  ): Promise<LeaveCancelResult> {
    const res = await apiClient.post<ApiResponse<LeaveCancelResult>>(R.cancel(employeeId, leaveId), {
      cancellation_reason: cancellationReason,
      effective_date: effectiveDate ?? null,
    });
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل إلغاء الإجازة');
  },

  /** «عاد مبكّراً» — إخلافٌ لا تعديلٌ في المكان. `client_key` يمنع خَلَفَين من نقرةٍ مزدوجة. */
  async shorten(
    employeeId: number,
    leaveId: number,
    payload: { end_date: string; reason: string; client_key?: string }
  ): Promise<LeaveShortenResult> {
    const res = await apiClient.post<ApiResponse<LeaveShortenResult>>(
      R.shorten(employeeId, leaveId),
      payload
    );
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل تقصير الإجازة');
  },

  /** فارقٌ صفرٌ ⇒ صفرُ كتابة، والرسالةُ تقولها صراحةً — تُعرض كما وصلت. */
  async recompute(
    employeeId: number,
    leaveId: number,
    payload: { reason?: string; holiday_id?: number } = {}
  ): Promise<LeaveRecomputeResult> {
    const res = await apiClient.post<ApiResponse<LeaveRecomputeResult>>(
      R.recompute(employeeId, leaveId),
      payload
    );
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّرت إعادة الاحتساب');
  },

  /** جماعيةٌ محدودة — `reason` إلزاميّ، والصفحاتُ تُتابَع بـ`after_id`. */
  async bulkRecompute(payload: {
    from_date: string;
    to_date?: string;
    employee_profile_id?: number;
    holiday_id?: number;
    reason: string;
    after_id?: number;
  }): Promise<LeaveBulkRecomputeResult> {
    const res = await apiClient.post<ApiResponse<LeaveBulkRecomputeResult>>(R.bulkRecompute, payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّرت إعادة الاحتساب الجماعية');
  },

  // ───────────── الرصيد والدفتر ─────────────

  /** لقطةُ الرصيد من ذيل الدفتر. `as_of` للقراءة التاريخية وحدَها (تَسِم المُخرَج `historical`). */
  async getBalance(employeeId: number, asOf?: string): Promise<LeaveBalanceSnapshot> {
    const res = await apiClient.get<ApiResponse<LeaveBalanceSnapshot>>(
      `${R.balance(employeeId)}${qs({ as_of: asOf })}`
    );
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب الرصيد');
  },

  /** أرصدةُ دفعةٍ (≤٢٠٠ معرّفاً) — خريطةٌ بمفتاح `employee_profile_id`. */
  async getBalances(profileIds: number[], leaveTypeId?: number): Promise<Record<number, LeaveRosterBalance>> {
    if (profileIds.length === 0) return {};

    const res = await apiClient.get<ApiResponse<Record<number, LeaveRosterBalance>>>(
      `${R.balances}${qs({ profile_ids: profileIds, leave_type_id: leaveTypeId })}`
    );
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب الأرصدة');
  },

  async getLedger(employeeId: number, filters: LeaveLedgerFilters = {}): Promise<LeaveLedgerPage> {
    const res = await apiClient.get<
      ApiResponse<PaginatedResponse<LeaveLedgerEntry>> & { summary?: LeaveLedgerSummary }
    >(
      `${R.ledger(employeeId)}${qs({
        leave_type_id: filters.leave_type_id,
        entry_type: filters.entry_type as LedgerEntryType | undefined,
        from: filters.from,
        to: filters.to,
        page: filters.page,
        per_page: filters.per_page,
      })}`
    );

    if (res.success && res.data) return { page: res.data, summary: res.summary ?? null };
    throw new Error(res.message || 'فشل في جلب حركات الرصيد');
  },

  /** قيدُ افتتاحٍ واحدٌ للأبد لكل (موظف، نوع) — والفهرسُ الفريد هو المنع لا الواجهة. */
  async setOpening(
    employeeId: number,
    payload: {
      leave_type_id: number;
      days: number;
      effective_date?: string;
      accrual_start_date?: string;
      description?: string;
      opening_basis?: OpeningBasis;
    }
  ): Promise<LeaveOpeningResult> {
    const res = await apiClient.post<ApiResponse<LeaveOpeningResult>>(R.opening(employeeId), payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل تسجيل الرصيد الافتتاحي');
  },

  /** التهيئةُ الجماعية — النجاحُ الجزئيّ يُعاد مفصَّلاً `{created, skipped, failed[]}`. */
  async bulkOpening(payload: {
    leave_type_id: number;
    effective_date: string;
    rows: Array<{ employee_profile_id: number; days: number; accrual_start_date?: string }>;
    description?: string;
    opening_basis?: OpeningBasis;
  }): Promise<LeaveBulkOpeningResult> {
    const res = await apiClient.post<ApiResponse<LeaveBulkOpeningResult>>(R.bulkOpening, payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشلت التهيئة الجماعية');
  },

  /**
   * **المعاينةُ الحيّةُ قبل كتابة الرصيد الافتتاحيّ** — «تكتب ٢١ · وله ٣ طلباتٍ بمجموع ٩
   * ⇒ رصيدُه ١٢». صفرُ كتابة، والجملةُ تأتي جاهزةً من الخادم فلا تُصاغ في موضعين.
   *
   * الفشلُ يُرجع صفراً من الصفوف لا استثناءً: معاينةٌ ساقطةٌ لا يجوز أن تُسقط شاشةَ التهيئة،
   * وزرُّ الحفظِ يبقى محروساً بالخادم على أيّ حال.
   */
  async openingPreview(payload: {
    leave_type_id: number;
    opening_basis: OpeningBasis;
    rows: Array<{ employee_profile_id: number; days: number }>;
  }): Promise<OpeningPreviewRow[]> {
    try {
      const res = await apiClient.post<ApiResponse<{ rows: OpeningPreviewRow[] }>>(R.openingPreview, payload);
      if (res.success && res.data) return res.data.rows;
    } catch {
      // معاينةٌ مساعدة — غيابُها سطرٌ لا يظهر، لا شاشةٌ تسقط.
    }

    return [];
  },

  // ───────────── سطح القراءة ─────────────

  /** سجلُّ المكتب. `charged_days` يصل مع كلّ صفّ؛ ولا يُحسب في الفرونت أبداً. */
  async getLeaves(filters: LeaveListFilters = {}): Promise<PaginatedResponse<HrLeave>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<HrLeave>>>(
      `${R.list}${qs(filters as QueryInput)}`
    );
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب سجلّ الإجازات');
  },

  /** الخطُّ الزمنيُّ لموظفٍ بعينه — عزلُه بـ404 عبر معرّف المسار لا بمرشِّح استعلام. */
  async getEmployeeLeaves(
    employeeId: number,
    filters: Omit<LeaveListFilters, 'employee_profile_id'> = {}
  ): Promise<PaginatedResponse<HrLeave>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<HrLeave>>>(
      `${R.employeeLeaves(employeeId)}${qs(filters as QueryInput)}`
    );
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب إجازات الموظف');
  },

  async getStats(year?: number): Promise<LeaveStats> {
    const res = await apiClient.get<ApiResponse<LeaveStats>>(`${R.stats}${qs({ year })}`);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب حقائق الإجازات');
  },

  /** مصدرٌ واحدٌ لشبكة التقويم: الوقائع + العطل + نهاية الأسبوع في نداءٍ واحد. */
  async getCalendar(
    month: string,
    options: { department?: string; employee_profile_id?: number } = {}
  ): Promise<LeaveCalendarPayload> {
    const res = await apiClient.get<ApiResponse<LeaveCalendarPayload>>(
      `${R.calendar}${qs({ month, ...options })}`
    );
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب تقويم الإجازات');
  },

  async getOnLeaveNow(options: { date?: string; department?: string } = {}): Promise<OnLeaveNowRow[]> {
    const res = await apiClient.get<ApiResponse<OnLeaveNowRow[]>>(`${R.onLeaveNow}${qs(options)}`);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب الغائبين اليوم');
  },

  /**
   * سياقُ التعارض — **إضافيٌّ لا حرج**: أيُّ إخفاقٍ يُرجع الهيكلَ فارغاً ولا يرمي.
   * بانرُ سياقٍ يسقط فيُسقط مودالَ التسجيل كلَّه عطلٌ أكبرُ من فائدته (عرف `ReviewModal`).
   */
  async getConflicts(params: {
    employee_profile_id: number;
    start_date: string;
    end_date: string;
    exclude_leave_id?: number;
    leave_type_id?: number;
  }): Promise<LeaveConflictContext> {
    try {
      const res = await apiClient.get<ApiResponse<LeaveConflictContext>>(`${R.conflicts}${qs(params)}`);
      if (res.success && res.data) return res.data;
      return emptyConflictContext(params.start_date, params.end_date);
    } catch {
      return emptyConflictContext(params.start_date, params.end_date);
    }
  },

  // ───────────── التعايش: قراءةٌ محضة، وصفرُ زرٍّ يكتب ─────────────

  /** طلباتُ «الطلبات الإدارية» لموظفٍ بعينه — من مسار HR، بلا `AdminRequestService`. */
  async getLegacyRequests(employeeId: number, filters: LegacyLeaveFilters = {}): Promise<LegacyRequestsPage> {
    try {
      const res = await apiClient.get<
        ApiResponse<PaginatedResponse<LegacyLeaveRow>> & {
          meta?: { counted_in_balance?: boolean; note?: string };
        }
      >(`${R.legacyRequests(employeeId)}${qs(filters as QueryInput)}`);

      if (res.success && res.data) {
        return {
          page: res.data,
          counted_in_balance: res.meta?.counted_in_balance ?? false,
          note: res.meta?.note ?? '',
        };
      }
    } catch {
      // القائمةُ ثانوية: تبويبٌ فارغٌ أهونُ من شاشةٍ ساقطة.
    }

    return { page: emptyPage<LegacyLeaveRow>(filters.per_page ?? 20), counted_in_balance: false, note: '' };
  },

  /**
   * معاينةُ تحويلِ طلبٍ إداريٍّ بعينه — **صفرُ كتابة**، والحواجزُ في `data.blockers` بـ200.
   *
   * لا `try/catch` هنا خلافاً لبقيّة قراءات التعايش: هذه معاينةُ فعلٍ كتابيّ، وابتلاعُ فشلها
   * يُظهر مودالاً بأرقامٍ فارغةٍ يبدو صالحاً — والمستخدمُ يضغط «حوّل» على العدم.
   */
  async previewLegacyConversion(
    employeeId: number,
    adminRequestId: number,
    payload: { leave_type_id: number; acknowledge_negative?: boolean }
  ): Promise<LegacyConvertPreview> {
    const res = await apiClient.post<ApiResponse<LegacyConvertPreview>>(
      R.legacyPreview(employeeId, adminRequestId),
      payload
    );
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّرت معاينة التحويل');
  },

  /**
   * **التحويل** — الطلبُ المعتمَدُ يصير واقعةً في السجلّ وقيداً في الدفتر.
   *
   * `acknowledge_negative` يُرسَل `true` **فقط** بعد إقرارٍ صريحٍ من المستخدم أمام رصيدٍ سالب.
   */
  async convertLegacyRequest(
    employeeId: number,
    adminRequestId: number,
    payload: { leave_type_id: number; acknowledge_negative?: boolean }
  ): Promise<LegacyConvertResult> {
    const res = await apiClient.post<ApiResponse<LegacyConvertResult>>(
      R.legacyConvert(employeeId, adminRequestId),
      payload
    );
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل التحويل');
  },

  /** عدّادُ المكتب — يُعرض حدّاً **معطَّلاً** بجانب معادلة الرصيد، لا حدّاً يُطرح. */
  async getLegacySummary(
    options: { employee_profile_id?: number; from?: string; to?: string } = {}
  ): Promise<LegacyLeaveSummary> {
    try {
      const res = await apiClient.get<ApiResponse<LegacyLeaveSummary>>(`${R.legacySummary}${qs(options)}`);
      if (res.success && res.data) return res.data;
    } catch {
      // عدّادٌ إضافيّ: غيابُه سطرٌ لا يظهر، لا شاشةٌ تسقط.
    }

    return emptyLegacySummary();
  },

  // ───────────── رصيد المستخدم لنفسه ─────────────

  /** المسارُ الوحيد غير المحروس بـ`hr.*` — ولا معرّفَ فيه (الملفُّ من الجلسة، لا IDOR). */
  async getMySummary(): Promise<MyLeaveSummary> {
    const res = await apiClient.get<ApiResponse<MyLeaveSummary>>(R.meSummary);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب ملخّص إجازاتك');
  },

  // ───────────── العمود الأيمن: نداءٌ واحدٌ يحمل الصفحةَ وعدّادَها ─────────────

  /**
   * صفوفُ العمود وعدّاداتُ شرائحه — **نداءٌ واحدٌ إلى `/hr/leaves/roster`**.
   *
   * كان هنا تركيبٌ في المتصفّح: `hrService.getEmployees` ثم `getBalances` ثم دمج، والعدّادُ
   * يُحسب على الصفوف الواصلة. ولذلك كان يقول «الكل ٠» ما دام النداءان لم يكتملا (وهما
   * متسلسلان، فالانتظارُ ضِعفٌ)، ويقول «الكل ٢٥» في مكتبٍ فيه مئتان. المسارُ الموحَّد يُرجع
   * الاثنين معاً: الصفحةُ مرشَّحةٌ في الخادم، والعدّادُ على المكتب كلِّه — فلا يفترقان.
   *
   * والصفُّ بلا `leave_balance` يبقى ممكناً (لقطةٌ مفقودة) فيعرض الاسمَ بلا رقم — لا شرطةً
   * تُقرأ رقماً ولا صفراً يُبنى عليه قرارُ منح.
   */
  async getRoster(filters: LeaveRosterFilters = {}, leaveTypeId?: number): Promise<LeaveRosterPage> {
    const res = await apiClient.get<
      ApiResponse<PaginatedResponse<LeaveRosterRow>> & { counts?: LeaveRosterCounts; low_threshold?: number }
    >(
      `${R.roster}${qs({
        search: filters.search,
        department: filters.department,
        status: filters.status,
        filter: filters.filter,
        low_threshold: filters.low_threshold,
        leave_type_id: leaveTypeId,
        page: filters.page,
        per_page: filters.per_page,
      })}`
    );

    if (res.success && res.data) {
      return {
        page: res.data,
        counts: res.counts ?? null,
        low_threshold: res.low_threshold ?? null,
      };
    }

    throw new Error(res.message || 'فشل في جلب المنسوبين');
  },
};

/** يُصدَّر للاختبارات ولمن يبني رابطاً — ولا تُكتب سلسلةُ مسارٍ خارج هذا الملفّ. */
export const HR_LEAVE_ROUTES = R;
