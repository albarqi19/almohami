import { apiClient, API_BASE_URL } from '../utils/api';
import type { ApiResponse, PaginatedResponse } from '../utils/api';
import type {
  AdvanceDetail,
  AdvanceListMeta,
  AdvancePayload,
  AdvanceRow,
  AdvanceStatus,
  BankInputFileMeta,
  BankInputFilePreview,
  MyPayslipRow,
  PayrollApproveResult,
  PayrollConfirmResult,
  PayrollDrift,
  PayrollDriftMeta,
  PayrollLinesMeta,
  PayrollLinesPayload,
  PayrollMarkSentResult,
  PayrollOverview,
  PayrollOverviewMeta,
  PayrollPaymentBoard,
  PayrollPaymentMeta,
  PayrollPayslip,
  PayrollPayslipMeta,
  PayrollPreflight,
  PayrollProposal,
  PayrollProposalsMeta,
  PayrollReadiness,
  PayrollRulesMeta,
  PayrollRulesPayload,
  PayrollRunDetail,
  PayrollRunDetailMeta,
  PayrollRunHead,
  PayrollRunHeadWithTotals,
  PayrollSimplePage,
  PayrollSweepResult,
  PayslipDocument,
  PenaltyFundMeta,
  PenaltyFundPayload,
  PenaltyListMeta,
  PenaltyPayload,
  PenaltyRow,
  PenaltyState,
  ProposalDecisionPreview,
  WageFile,
  WageFilePayload,
  WageRecord,
  WageRecordPayload,
  WageRegisterDetail,
  WageRegisterFilter,
  WageRegisterMeta,
  WageRegisterRow,
} from '../types/hrPayroll';

/**
 * خدمةُ وحدة الرواتب — **S1: سجلُّ الأجور** وحدَه.
 *
 * نمطُ `hrLeaveService` حرفياً: خريطةُ مساراتٍ أعلى الملفّ مطابقةٌ لـ`routes/api.php`، ثمّ
 * `apiClient` ← `if (res.success && res.data) return res.data` ← `throw new Error(…)`.
 *
 * 🔴 وردُّ السجلّ يحمل `meta` بجانب `data` — و**`meta.can_view_amounts` ليس تفصيلاً**: الخادمُ
 * يحذف مفاتيحَ المبالغ لمن لا يملك `hr.compensation.view` (لا يُصفّرها). فبلا هذا العلَم
 * تقرأ الشاشةُ غيابَ المفتاح «لا راتبَ مسجَّل» وتعرض دعوةَ تهيئةٍ لمكتبٍ رواتبُه مكتملة.
 *
 * ⚠️ حدٌّ معلومٌ في طبقة النقل: `apiClient` يرمي على غير-2xx برسالةٍ فقط — حقلُ `code` الذي
 * يردّه المتحكّم (`iban_invalid` · `claimed_by_approved_run` · `already_voided`) **لا يعبر**.
 * فالرسالةُ العربية من الخادم هي ما يُعرض، ولا يُبنى فرعُ واجهةٍ على رمزٍ لا يصل.
 *
 * 🔴 **والاعتمادُ وحدَه يخرج من هذا الحدّ** (انظر `postWithCode` أدناه): ردودُه أربعةُ رموزٍ
 * لكلٍّ منها بابٌ مختلفٌ في الشاشة — أحدُها يفتح مربّعَ إقرارٍ، وأحدُها **لا بابَ له**،
 * وأحدُها يقود إلى شاشةٍ أخرى. ومطابقةُ سلاسلَ عربيةٍ لتمييزها تنكسر بأوّل تعديلِ نصّ.
 */

const BASE = '/hr/payroll/wage-register';
const RULES = '/hr/payroll/rules';
const RUNS = '/hr/payroll/runs';
const one = (profileId: number) => `${BASE}/${profileId}`;
const run_ = (runId: number) => `${RUNS}/${runId}`;

const R = {
  index: BASE,                                             // GET  HrWageRegisterController@index
  show: one,                                               // GET  HrWageRegisterController@show
  storeFile: (p: number) => `${one(p)}/file`,              // POST HrWageRegisterController@storeFile
  updateFile: (p: number) => `${one(p)}/file`,             // PUT  HrWageRegisterController@updateFile
  storeRecord: (p: number) => `${one(p)}/records`,         // POST HrWageRegisterController@storeRecord
  voidRecord: (p: number, r: number) => `${one(p)}/records/${r}/void`, // POST @voidRecord

  // S2 — المرجعُ النظاميّ. 🔴 لا مسارَ كتابةٍ للقاعدة: التعديلُ النظاميُّ هجرةُ بيانات.
  rules: RULES,                                            // GET  HrPayrollRuleController@index
  confirmGosi: `${RULES}/gosi/confirm`,                    // POST HrPayrollRuleController@confirmGosi

  // S3 — المسير والطابور والفحصُ القبْليّ. 🔴 ولا `DELETE`: المسيرُ يُلغى ويبقى ظاهراً.
  overview: '/hr/payroll/overview',                        // GET  HrPayrollRunController@overview
  runs: RUNS,                                              // GET/POST HrPayrollRunController@index|store
  run: run_,                                               // GET  HrPayrollRunController@show
  runRoster: (id: number) => `${run_(id)}/roster`,         // POST @roster
  runPreflight: (id: number) => `${run_(id)}/preflight`,   // GET  @preflight
  runProposals: (id: number) => `${run_(id)}/proposals`,   // GET  @proposals
  runEvents: (id: number) => `${run_(id)}/events`,         // GET  @events

  // S4 — الاحتسابُ والمراجعة. 🔴 لا مسارَ اعتمادٍ هنا: خلطُ «احسب» بـ«اعتمد» أشيعُ عطلٍ
  // تصميميٍّ في هذا الصنف، ويجعل الفعلَ الذي لا رجعةَ فيه بلا معاينةِ أثر.
  runCompute: (id: number) => `${run_(id)}/compute`,       // POST @compute
  runLines: (id: number) => `${run_(id)}/lines`,           // GET  @lines
  runDrift: (id: number) => `${run_(id)}/drift`,           // GET  @drift
  runDecide: (id: number) => `${run_(id)}/proposals/decide`, // POST @decideProposals
  // S5 — الاعتماد: الفعلُ الذي يجمّد القسائم ويكتب مطالباتِ الأيام ويقيّد.
  runApprove: (id: number) => `${run_(id)}/approve`,       // POST @approve
  // S6 — الدفع: اللوحُ والإرسالُ والتأكيدُ والفشلُ والجرف. 🔴 ولا مسارَ «ألغِ الدفعة».
  runPayments: (id: number) => `${run_(id)}/payments`,     // GET  HrPayrollPaymentController@index
  runPaySent: (id: number) => `${run_(id)}/payments/mark-sent`, // POST @markSent
  runPayConfirm: (id: number) => `${run_(id)}/payments/confirm`, // POST @confirm
  runPayFail: (id: number) => `${run_(id)}/payments/fail`, // POST @fail
  runPaySweep: (id: number) => `${run_(id)}/payments/sweep`, // POST @sweep
  // كشفُ الرواتب المسلَّم للبنك (ملفُّ إدخال) — معاينةٌ ثمّ تنزيل.
  // 🔴 وليس هذا ملفَّ حماية الأجور: ذاك يصدره البنكُ موقَّعاً بمفتاحه بعد تنفيذ التحويلات.
  runBankFilePreview: (id: number) => `${run_(id)}/bank-input-file/preview`, // GET @exportPreview
  runBankFile: (id: number) => `${run_(id)}/bank-input-file`, // GET @export
  lineItems: (id: number, lineId: number) => `${run_(id)}/lines/${lineId}/items`,
  lineItem: (id: number, lineId: number, itemId: number) => `${run_(id)}/lines/${lineId}/items/${itemId}`,
  payslip: (lineId: number) => `/hr/payroll/lines/${lineId}`, // GET  @line

  // S5 — القسيمةُ مستنداً. 🔴 ومسارا الـPDF **ليسا في الخدمة**: `apiClient` يفكّ الردَّ
  // JSON دائماً ولا يعرف `blob`. يُمرَّران إلى `openLetterPdf` (fetch خام) كما يفعل
  // مسارُ الخطابات حرفاً — تنفيذٌ واحدٌ للتنزيل لا نسخةٌ ثانية.
  payslipPdf: (lineId: number) => `/hr/payroll/lines/${lineId}/pdf`, // GET  HrPayslipController@pdf

  // S7 — السلفُ والجزاءاتُ وصندوقُ م.٧٣. 🔴 ولا `DELETE` في أيٍّ منها: السلفةُ تُلغى أو
  // تُشطَب، والجزاءُ يُبطَل — ومحوُ أيٍّ منهما يمحو دليلاً يُسأل عنه.
  advances: '/hr/payroll/advances',                        // GET/POST HrAdvanceController@index|store
  advance: (id: number) => `/hr/payroll/advances/${id}`,   // GET  @show
  advancePause: (id: number) => `/hr/payroll/advances/${id}/pause`, // POST @pause
  advanceDisburse: (id: number) => `/hr/payroll/advances/${id}/disburse`, // POST @disburse
  penalties: '/hr/payroll/penalties',                      // GET/POST HrPenaltyController@index|store
  penaltyNotify: (id: number) => `/hr/payroll/penalties/${id}/notify`, // POST @notify
  penaltyFinalise: (id: number) => `/hr/payroll/penalties/${id}/finalise`, // POST @finalise
  penaltyOverturn: (id: number) => `/hr/payroll/penalties/${id}/overturn`, // POST @overturn
  penaltyFund: '/hr/payroll/penalty-fund',                 // GET  @fund

  myPayslips: '/hr/me/payslips',                                    // GET  @meIndex
  myPayslip: (lineId: number) => `/hr/me/payslips/${lineId}`,       // GET  @meShow
  myPayslipPdf: (lineId: number) => `/hr/me/payslips/${lineId}/pdf`, // GET  @mePdf
} as const;

/** خريطةُ مسارات الـPDF مصدَّرةً — الشاشاتُ لا تركّب مساراً بيدها. */
export const payslipPdfPath = {
  office: R.payslipPdf,
  mine: R.myPayslipPdf,
} as const;

export interface WageRegisterFilters {
  search?: string;
  filter?: WageRegisterFilter;
  status?: string;
  page?: number;
  per_page?: number;
}

export interface WageRegisterPage {
  page: PaginatedResponse<WageRegisterRow>;
  meta: WageRegisterMeta;
}

/** إسقاطُ `''`/`null`/`undefined` من الاستعلام — نسخُ عرف `hrService`. */
function qs(input: Record<string, string | number | undefined | null>): string {
  const params = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.append(key, String(value));
  });
  const out = params.toString();
  return out ? `?${out}` : '';
}

type MetaResponse<T> = ApiResponse<T> & { meta?: WageRegisterMeta };

/**
 * 🔑 **خطأُ فعلٍ في الرواتب — يحمل رمزَ الخادم لا رسالتَه وحدَها.**
 *
 * يرث `Error` فيمرّ من `errorText(…)` بلا استثناء، ويضيف `code` و`status` كي تختار الشاشةُ
 * بابَها: «لك قسيمةٌ هنا» بابُ إقرارٍ يُطبَع أثرُه على القسيمة، و«أنت المعتمِدُ الوحيد» بابُ
 * إقرارٍ ظاهر، و«مَن أعدّ لا يعتمد» بابٌ إلى **شخصٍ آخر**، و«النسبُ غيرُ مؤكَّدة» بابٌ إلى
 * شاشةٍ أخرى — وكلُّها ٤٠٣/٤٢٢ بنصوصٍ تتحسّن.
 *
 * 🔴 و`data` يحمل حمولةَ الرفض (`denialData`) — وفيها `acks_required`: **كم إقراراً يلزم**.
 * وبدونها تكتشف الشاشةُ الإقرارَ الثاني بعد أن وقّع المستخدمُ الأوّلَ ورُدَّ ثانيةً، فيقرأ
 * الردَّ الثانيَ على أنّ توقيعَه لم يصل.
 */
export class PayrollActionError extends Error {
  // ⚠️ حقولٌ صريحةٌ لا خصائصُ مُعامِلات: `erasableSyntaxOnly` مفعَّلٌ في هذا المستودع.
  readonly code: string | null;

  readonly status: number;

  readonly data: Record<string, unknown> | null;

  constructor(
    message: string,
    code: string | null,
    status: number,
    data: Record<string, unknown> | null = null
  ) {
    super(message);
    this.name = 'PayrollActionError';
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

/**
 * `POST` خامٌّ يُبقي `code` حيّاً — على سابقة `openLetterPdf` حرفاً (fetch خام حين يعجز
 * `apiClient` عن حمل ما يلزم)، وبنفس ترويسته: `Authorization` من `localStorage`، ورسالةُ
 * الخادم قبل الرمي، و`try/catch` حول فكّ JSON لأنّ الردَّ قد يكون HTML عند عطلٍ في الحافة.
 *
 * 🔴 ولا يُعمَّم على الوحدة: تعديلُ `apiClient` ليحمل `code` تعديلٌ في طبقةِ نقلٍ يستعملها
 * التطبيقُ كلُّه، وهذه نقطةٌ واحدةٌ تحتاجه.
 */
async function postWithCode<T>(
  path: string,
  body: Record<string, unknown>
): Promise<{ data: T; message: string | null }> {
  const token = localStorage.getItem('authToken');

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': '69420',
      ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });

  let payload: { success?: boolean; message?: string; code?: string; data?: unknown } = {};

  try {
    payload = (await res.json()) as typeof payload;
  } catch {
    /* ردٌّ بلا JSON — تبقى الرسالةُ الاحتياطية */
  }

  if (!res.ok || payload.success !== true || payload.data === undefined) {
    // حمولةُ الرفض كائنٌ من الخادم (`denialData`) — وما ليس كائناً يسقط إلى `null` بدل أن
    // يُمرَّر فيُقرأ كخريطةٍ ليست منه.
    const denial =
      typeof payload.data === 'object' && payload.data !== null && !Array.isArray(payload.data)
        ? (payload.data as Record<string, unknown>)
        : null;

    throw new PayrollActionError(
      payload.message ?? `تعذّر إتمامُ الطلب (${res.status}).`,
      payload.code ?? null,
      res.status,
      denial
    );
  }

  return { data: payload.data as T, message: payload.message ?? null };
}

export const hrPayrollService = {
  /** سجلُّ الأجور: صفحةٌ + عدّاداتُ الشرائح **من الخادم** (لا تُحسب على الصفحة المعروضة). */
  async getRegister(filters: WageRegisterFilters = {}): Promise<WageRegisterPage> {
    const res = (await apiClient.get(
      `${R.index}${qs({
        search: filters.search,
        filter: filters.filter,
        status: filters.status,
        page: filters.page,
        per_page: filters.per_page,
      })}`
    )) as MetaResponse<PaginatedResponse<WageRegisterRow>>;

    if (res.success && res.data && res.meta) {
      return { page: res.data, meta: res.meta };
    }

    throw new Error(res.message || 'فشل في جلب سجلّ الأجور');
  },

  /** ملفُّ الأجر + خطُّ النسخ التاريخيّ كاملاً — **بما فيه الملغى**، موسوماً لا محذوفاً. */
  async getProfile(profileId: number): Promise<{ detail: WageRegisterDetail; meta: WageRegisterMeta }> {
    const res = (await apiClient.get(R.show(profileId))) as MetaResponse<WageRegisterDetail>;

    if (res.success && res.data && res.meta) {
      return { detail: res.data, meta: res.meta };
    }

    throw new Error(res.message || 'فشل في جلب ملفّ الأجر');
  },

  /** فتحُ ملفّ أجرٍ — سببٌ ونظامُ تأميناتٍ إلزاميّان. */
  async openFile(profileId: number, payload: WageFilePayload): Promise<WageFile> {
    const res = await apiClient.post<ApiResponse<WageFile>>(R.storeFile(profileId), payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في فتح ملفّ الأجر');
  },

  async updateFile(profileId: number, payload: WageFilePayload): Promise<WageFile> {
    const res = await apiClient.put<ApiResponse<WageFile>>(R.updateFile(profileId), payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في حفظ سياسة الأجر');
  },

  /** 🔑 نسخةُ أجرٍ جديدةٌ من تاريخ — لا تعديلَ لنسخةٍ قائمة. */
  async recordWage(profileId: number, payload: WageRecordPayload): Promise<WageRecord> {
    const res = await apiClient.post<ApiResponse<WageRecord>>(R.storeRecord(profileId), payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في تسجيل الأجر');
  },

  /** إلغاءُ نسخةٍ بسببٍ — لا حذف. */
  async voidRecord(profileId: number, recordId: number, reason: string): Promise<WageRecord> {
    const res = await apiClient.post<ApiResponse<WageRecord>>(R.voidRecord(profileId, recordId), { reason });
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في إلغاء النسخة');
  },

  /**
   * المرجعُ النظاميّ — القواعدُ السارية **في تاريخٍ بعينه** لا «اليوم» ضمناً.
   *
   * الوسيطُ `on` يخدم سؤالاً مشروعاً عند مراجعة قسيمةٍ مضت: «ما القاعدةُ التي طُبِّقت في
   * ١٢ يوليو؟». وإسقاطُه يجعل الشاشةَ تجيب دائماً بقاعدة اليوم — وهو أشيعُ كذبٍ في
   * عرض بياناتٍ مؤرَّخة.
   */
  async getRules(on?: string): Promise<{ data: PayrollRulesPayload; meta: PayrollRulesMeta }> {
    const res = (await apiClient.get(`${R.rules}${qs({ on })}`)) as ApiResponse<PayrollRulesPayload> & {
      meta?: PayrollRulesMeta;
    };

    if (res.success && res.data && res.meta) {
      return { data: res.data, meta: res.meta };
    }

    throw new Error(res.message || 'فشل في جلب المرجع النظاميّ');
  },

  /**
   * 🔴 تأكيدُ نسب التأمينات — الفعلُ الذي يرفع حاجزَ الاعتماد، ويُسجَّل باسم صاحبه.
   *
   * `acknowledged` صريحةٌ في الحمولة ولا تُرسَل ضمناً: الخادمُ يشترطها، والزرُّ الذي
   * يرسلها بلا أن يقرأ صاحبُه ما يؤكّده ليس توقيعاً.
   */
  async confirmGosi(note?: string): Promise<{ confirmed_codes: string[]; confirmed_at: string }> {
    const res = await apiClient.post<ApiResponse<{ confirmed_codes: string[]; confirmed_at: string }>>(
      R.confirmGosi,
      { acknowledged: true, note }
    );

    if (res.success && res.data) return res.data;

    throw new Error(res.message || 'فشل في تأكيد نسب التأمينات');
  },

  // ═══════════════════ S3 — المسير والطابور والفحصُ القبْليّ ═══════════════════

  /**
   * رأسُ صفحة الرواتب: الفترةُ ولوحُ الجاهزية والقراراتُ المنتظرة.
   *
   * 🔴 يُنادى **مرّةً عند الفتح** ولا يُستطلَع دورياً: الرواتبُ حالةٌ يغيّرها إنسانٌ بفعلٍ
   * معلوم، لا مجرىً يتدفّق. والاستطلاعُ الدوريُّ هنا حِملٌ بلا خبر.
   */
  async getOverview(period?: string): Promise<{ data: PayrollOverview; meta: PayrollOverviewMeta }> {
    const res = (await apiClient.get(`${R.overview}${qs({ period })}`)) as ApiResponse<PayrollOverview> & {
      meta?: PayrollOverviewMeta;
    };

    if (res.success && res.data && res.meta) return { data: res.data, meta: res.meta };

    throw new Error(res.message || 'فشل في جلب حالة الرواتب');
  },

  async getRuns(filters: { stage?: string; year?: number; per_page?: number } = {}): Promise<PaginatedResponse<PayrollRunHead>> {
    const res = (await apiClient.get(
      `${R.runs}${qs({ stage: filters.stage, year: filters.year, per_page: filters.per_page })}`
    )) as ApiResponse<PaginatedResponse<PayrollRunHead>>;

    if (res.success && res.data) return res.data;

    throw new Error(res.message || 'فشل في جلب المسيرات');
  },

  /**
   * 🔴 فتحُ مسير — ويُردّ ٤٢٢ إن كان المشمولون صفراً (D23).
   *
   * والرسالةُ حينها **تسمّي الناقصَ بالرقم**، فتُعرَض كما هي. ولذلك لا تُبتلع هنا ولا
   * تُستبدَل بنصٍّ عامّ: «تعذّر فتحُ المسير» تجعل المستخدمَ يبحث عن العطل في الزرّ.
   */
  async openRun(period: string, payload: { pay_date?: string; idempotency_key?: string } = {}): Promise<PayrollRunHead> {
    const res = await apiClient.post<ApiResponse<PayrollRunHead>>(R.runs, {
      period,
      run_type: 'monthly',
      ...payload,
    });

    if (res.success && res.data) return res.data;

    throw new Error(res.message || 'تعذّر فتحُ المسير');
  },

  async getRun(runId: number): Promise<{ data: PayrollRunDetail; meta: PayrollRunDetailMeta }> {
    const res = (await apiClient.get(R.run(runId))) as ApiResponse<PayrollRunDetail> & { meta?: PayrollRunDetailMeta };

    if (res.success && res.data && res.meta) return { data: res.data, meta: res.meta };

    throw new Error(res.message || 'فشل في جلب المسير');
  },

  /** إعادةُ بناء النطاق — قبل الاحتساب فقط؛ بعده الطابورُ لقطةٌ لا استعلام. */
  async rebuildRoster(runId: number): Promise<{ run: PayrollRunHead; readiness: PayrollReadiness }> {
    const res = await apiClient.post<ApiResponse<{ run: PayrollRunHead; readiness: PayrollReadiness }>>(
      R.runRoster(runId),
      {}
    );

    if (res.success && res.data) return res.data;

    throw new Error(res.message || 'تعذّرت إعادةُ بناء النطاق');
  },

  async getPreflight(runId: number): Promise<PayrollPreflight> {
    const res = (await apiClient.get(R.runPreflight(runId))) as ApiResponse<PayrollPreflight>;

    if (res.success && res.data) return res.data;

    throw new Error(res.message || 'فشل في جلب الفحص القبْليّ');
  },

  /** طابورُ القرارات — مقترحاتٌ معروضةٌ لا خصومٌ واقعة. */
  async getProposals(runId: number): Promise<{ data: PayrollProposal[]; meta: PayrollProposalsMeta }> {
    const res = (await apiClient.get(R.runProposals(runId))) as ApiResponse<PayrollProposal[]> & {
      meta?: PayrollProposalsMeta;
    };

    if (res.success && res.data && res.meta) return { data: res.data, meta: res.meta };

    throw new Error(res.message || 'فشل في جلب طابور القرارات');
  },

  // ═══════════════════ S4 — الاحتسابُ والمراجعةُ والقسيمة ═══════════════════

  /**
   * 🔑 الاحتساب — فعلٌ متكرّرٌ لا نهائيٌّ ما دام المسيرُ مسوّدةً أو محتسَباً.
   *
   * ولا يُعتمد شيءٌ به: الاعتمادُ فعلٌ مستقلٌّ لا يجوز طيُّه في زرِّ حساب.
   */
  async compute(runId: number): Promise<{ run: PayrollRunHead; totals: Record<string, string | number> }> {
    const res = await apiClient.post<ApiResponse<{ run: PayrollRunHead; totals: Record<string, string | number> }>>(
      R.runCompute(runId),
      {}
    );

    if (res.success && res.data) return res.data;

    throw new Error(res.message || 'تعذّر الاحتساب');
  },

  /**
   * جدولُ الاحتساب.
   *
   * 🔴 و`meta.can_view_amounts` ليس تفصيلاً: الخادمُ يُرجع **صفرَ صفٍّ** لمن لا يملك
   * `hr.compensation.view` (لا صفوفاً مصفَّرة). فبلا هذا العلَم تقرأ الشاشةُ الفراغَ
   * «لا أحدَ في المسير» وتعرض دعوةَ تهيئةٍ لمسيرٍ مكتملٍ محسوب.
   */
  async getLines(runId: number): Promise<{ data: PayrollLinesPayload; meta: PayrollLinesMeta }> {
    const res = (await apiClient.get(R.runLines(runId))) as ApiResponse<PayrollLinesPayload> & {
      meta?: PayrollLinesMeta;
    };

    if (res.success && res.data && res.meta) return { data: res.data, meta: res.meta };

    throw new Error(res.message || 'فشل في جلب جدول الاحتساب');
  },

  /** القسيمةُ بتفصيلها — كلُّ بندٍ بوعائه ومعامله وقاعدته. */
  async getPayslip(lineId: number): Promise<{ data: PayrollPayslip; meta: PayrollPayslipMeta }> {
    const res = (await apiClient.get(R.payslip(lineId))) as ApiResponse<PayrollPayslip> & {
      meta?: PayrollPayslipMeta;
    };

    if (res.success && res.data && res.meta) return { data: res.data, meta: res.meta };

    throw new Error(res.message || 'فشل في جلب القسيمة');
  },

  /** المراجعة — ما تغيّر عن المسير السابق ومعه سببُ كلّ فرق. */
  async getDrift(runId: number): Promise<{ data: PayrollDrift; meta: PayrollDriftMeta }> {
    const res = (await apiClient.get(R.runDrift(runId))) as ApiResponse<PayrollDrift> & { meta?: PayrollDriftMeta };

    if (res.success && res.data && res.meta) return { data: res.data, meta: res.meta };

    throw new Error(res.message || 'فشل في جلب المراجعة');
  },

  /**
   * 🔴 القرارُ الجامع — و`preview` يردّ **الأثرَ بالريال قبل النقر** (D11).
   *
   * والسببُ إلزاميٌّ في الطرفين: نقرةٌ تغطّي عشرةَ أرقامٍ بلا سببٍ مسجَّلٍ ليست قراراً.
   */
  async decideProposals(
    runId: number,
    payload: { proposal_ids: number[]; action: 'accepted' | 'dismissed'; reason: string; preview?: boolean }
  ): Promise<ProposalDecisionPreview> {
    const res = await apiClient.post<ApiResponse<ProposalDecisionPreview>>(R.runDecide(runId), payload);

    if (res.success && res.data) return res.data;

    throw new Error(res.message || 'تعذّر بتُّ المقترحات');
  },

  /** بندٌ يدويّ — والخصمُ منه يحمل اسمَ صاحبه وسببَه بحكم القاعدة (D10). */
  async addItem(
    runId: number,
    lineId: number,
    payload: { component_code: string; amount?: string; hours?: string; reason?: string; accrual_period?: string }
  ): Promise<{ item_id: number; run: PayrollRunHeadWithTotals }> {
    const res = await apiClient.post<ApiResponse<{ item_id: number; run: PayrollRunHeadWithTotals }>>(
      R.lineItems(runId, lineId),
      payload
    );

    if (res.success && res.data) return res.data;

    throw new Error(res.message || 'تعذّرت إضافةُ البند');
  },

  /** حذفُ بندٍ يدويٍّ — قبل الاعتماد فقط، والزرُّ يظهر معطَّلاً بعده لا مخفيّاً. */
  async removeItem(runId: number, lineId: number, itemId: number): Promise<{ run: PayrollRunHeadWithTotals }> {
    const res = await apiClient.delete<ApiResponse<{ run: PayrollRunHeadWithTotals }>>(
      R.lineItem(runId, lineId, itemId)
    );

    if (res.success && res.data) return res.data;

    throw new Error(res.message || 'تعذّر حذفُ البند');
  },

  /**
   * 🔑 **الاعتماد** — الفعلُ الذي يحوّل أرقاماً مراجَعةً إلى مستندٍ لا يتحوّر.
   *
   * ونقرةٌ مزدوجةٌ تُرجع المسيرَ نفسَه بـ٢٠٠ لا اعتمادين — الخادمُ يتكفّل بذلك، فلا يُبنى
   * هنا حارسٌ ثانٍ يكذب تحت التزامن.
   *
   * 🔴 و`single_approver_acknowledged` **لا تُرسَل ضمناً أبداً**: يرفضها الخادمُ متى وُجد
   * معتمِدٌ آخر، وإرسالُها بلا أن يقرأ صاحبُها نصَّها ليس إقراراً بل نقرة.
   */
  async approveRun(
    runId: number,
    payload: {
      single_approver_acknowledged?: boolean;
      acknowledgement_text?: string;
      // 🔴 حقلان منفصلان عن سابقيهما: إقرارُ المشمول غيرُ إقرار المُعِدّ، وقد يلزمان معاً.
      subject_approver_acknowledged?: boolean;
      subject_acknowledgement_text?: string;
    } = {}
  ): Promise<{ data: PayrollApproveResult; message: string | null }> {
    return postWithCode<PayrollApproveResult>(R.runApprove(runId), payload);
  },

  // ═════════ S5 — قسائمي: ما يراه صاحبُ الأجر عن نفسه ═════════
  //
  // 🔴 بلا بارامترِ ملفٍّ في المسار إطلاقاً: الخادمُ يلتقط الملفَّ بـ`auth()->id()`،
  // وقسيمةُ زميلٍ تُردّ **٤٠٤**. وأيُّ معرّفٍ يُرسَل من هنا يفتح البابَ الذي أُغلق هناك.

  /** سردُ قسائمي المعتمَدة — الأحدثُ أوّلاً، والمسوّدةُ ليست قسيمتي بعد. */
  async listMyPayslips(): Promise<MyPayslipRow[]> {
    const res = await apiClient.get<ApiResponse<MyPayslipRow[]>>(R.myPayslips);

    if (res.success && res.data) return res.data;

    throw new Error(res.message || 'تعذّر جلبُ قسائمي');
  },

  /**
   * قسيمتي بتفصيلها — **من مؤلِّف الورقة نفسِه**، فما أقرؤه هنا هو ما في ملفّي المطبوع.
   */
  async getMyPayslip(lineId: number): Promise<PayslipDocument> {
    const res = await apiClient.get<ApiResponse<PayslipDocument>>(R.myPayslip(lineId));

    if (res.success && res.data) return res.data;

    throw new Error(res.message || 'تعذّر جلبُ القسيمة');
  },
  // ═══════════════════ S6 — الدفعُ والفشلُ والجرفُ الاستثنائيّ (D17) ═══════════════════
  //
  // 🔑 **سلسلةُ `payable` في الدفتر تنقص عند تأكيد الدفع لا عند الاعتماد**، والسطرُ الفاشل
  // **يبقى مستحقّاً**. ولذلك لا دالّةَ هنا اسمُها «ألغِ الدفعة»: الواقعةُ وقعت، والبديلُ
  // الصادق استردادٌ أو مسيرٌ تصحيحيّ.

  /** لوحُ الدفع: لكلّ سطرٍ صافيه وآيبانُه **مقنَّعاً من الخادم** وحالةُ تحويله وسببُ فشله. */
  async getPayments(runId: number): Promise<{ data: PayrollPaymentBoard; meta: PayrollPaymentMeta }> {
    const res = (await apiClient.get(R.runPayments(runId))) as ApiResponse<PayrollPaymentBoard> & {
      meta?: PayrollPaymentMeta;
    };

    if (res.success && res.data && res.meta) return { data: res.data, meta: res.meta };

    throw new Error(res.message || 'فشل في جلب لوح الدفع');
  },

  /** أُرسل الملفُّ للبنك — **وسمٌ لا صرف**: لا ينقص الدفترُ بهذا النداء. */
  async markPaymentsSent(
    runId: number,
    payload: { method?: string; reference?: string } = {}
  ): Promise<PayrollMarkSentResult> {
    const res = await apiClient.post<ApiResponse<PayrollMarkSentResult>>(R.runPaySent(runId), payload);

    if (res.success && res.data) return res.data;

    throw new Error(res.message || 'تعذّر وسمُ التحويلات مرسَلة');
  },

  /** 🔑 تأكيدُ الصرف — وهنا وحدَها ينقص الدفتر. والدفعُ الجزئيّ حالةٌ عاديةٌ لا استثناء. */
  async confirmPayments(
    runId: number,
    payload: { line_ids: number[]; reference: string; paid_on: string }
  ): Promise<PayrollConfirmResult> {
    const res = await apiClient.post<ApiResponse<PayrollConfirmResult>>(R.runPayConfirm(runId), payload);

    if (res.success && res.data) return res.data;

    throw new Error(res.message || 'تعذّر تأكيدُ الصرف');
  },

  /** 🔴 فشلُ التحويل — السطرُ يبقى مستحقّاً، والسببُ يُعرَض ولا يختفي. */
  async failPayment(runId: number, payload: { line_id: number; reason: string }): Promise<void> {
    const res = await apiClient.post<ApiResponse<unknown>>(R.runPayFail(runId), payload);

    if (res.success) return;

    throw new Error(res.message || 'تعذّر تسجيلُ فشل التحويل');
  },

  /** الجرفُ الاستثنائيّ — مسيرُ `off_cycle` يحمل كلَّ مستحقٍّ لم يصل. */
  async sweepUnpaid(runId: number, payload: { pay_date?: string } = {}): Promise<PayrollSweepResult> {
    const res = await apiClient.post<ApiResponse<PayrollSweepResult>>(R.runPaySweep(runId), payload);

    if (res.success && res.data) return res.data;

    throw new Error(res.message || 'تعذّر فتحُ المسير الاستثنائيّ');
  },

  // ═══════════════ كشفُ الرواتب المسلَّم للبنك — معاينةٌ ثمّ تنزيل ═══════════════
  //
  // 🔴 **المفرداتُ ملزِمة**: ما يُنزَّل **ملفُّ إدخالٍ يُسلَّم لبنك المكتب**، وصيغتُه باتفاق
  // البنك والمنشأة فيُطابَق بقالب البنك أوّلَ مرّة. أمّا ملفُّ حماية الأجور الموقَّع رقمياً
  // فيصدره البنكُ بعد تنفيذ التحويلات ويوقّعه بمفتاحه الخاصّ — ورفعُه فعلٌ تقوم به المنشأة.
  // ولا دالّةَ هنا اسمُها «ارفع» ولا «طابِق»: ما لا نستطيعه لا يُبنى له زرّ.

  /** معاينةُ الكشف قبل تنزيله — الصفوفُ والإجماليُّ ومن خرج منه ولماذا. **صفرُ كتابة**. */
  async getBankInputPreview(
    runId: number,
    draft = false
  ): Promise<{ data: BankInputFilePreview; meta: BankInputFileMeta }> {
    const res = (await apiClient.get(
      `${R.runBankFilePreview(runId)}${qs({ draft: draft ? 1 : undefined })}`
    )) as ApiResponse<BankInputFilePreview> & { meta?: BankInputFileMeta };

    if (res.success && res.data && res.meta) return { data: res.data, meta: res.meta };

    throw new Error(res.message || 'تعذّر جلبُ معاينة كشف البنك');
  },

  /**
   * تنزيلُ الكشف — **`fetch` خامٌّ على سابقة `openLetterPdf` حرفاً**: `apiClient` يفكّ الردَّ
   * JSON دائماً ولا يعرف `blob`.
   *
   * 🔴 والرفضُ يصل JSON بـ٤٢٢: تُقرأ رسالتُه **قبل** الرمي فيرى المستخدمُ اسمَ من يمنع
   * التصدير («فلانٌ بلا آيبان») لا «تعذّر التنزيل».
   */
  async downloadBankInputFile(runId: number, fileName: string, draft = false): Promise<void> {
    const token = localStorage.getItem('authToken');

    const res = await fetch(`${API_BASE_URL}${R.runBankFile(runId)}${qs({ draft: draft ? 1 : undefined })}`, {
      method: 'GET',
      headers: {
        Accept: 'text/csv',
        'ngrok-skip-browser-warning': '69420',
        ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
      },
    });

    if (!res.ok) {
      let message = 'تعذّر تنزيلُ كشف البنك';

      try {
        const body = (await res.clone().json()) as { message?: string };
        if (body?.message) message = String(body.message);
      } catch {
        /* الردُّ ليس JSON — تبقى الرسالةُ الاحتياطية */
      }

      throw new Error(message);
    }

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    // الإبطالُ الفوريُّ يقطع التنزيلَ في بعض المتصفّحات — دقيقةٌ تكفي وتُحرّر الذاكرة.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  },

  // ═══════════════ S7 — السلفُ والجزاءاتُ وصندوقُ العمال (م.٧٣) ═══════════════
  //
  // 🔴 **ولا دالّةَ هنا تخصم ريالاً**: منحُ السلفة يُخرج مالاً، وتوقيعُ الجزاء يُنشئ مستنداً —
  // وكلاهما يولّد **مقترحاً** في طابور القرارات، ولا يصير خصماً إلا ببتٍّ باسم إنسان (D10).

  /** سردُ السلف — و`outstanding` في كلّ صفٍّ **مشتقٌّ من الدفتر** لا من عمودٍ محفوظ. */
  async getAdvances(
    filters: { status?: AdvanceStatus; employee_profile_id?: number; per_page?: number } = {}
  ): Promise<{ page: PayrollSimplePage<AdvanceRow>; meta: AdvanceListMeta }> {
    const res = (await apiClient.get(
      `${R.advances}${qs({
        status: filters.status,
        employee_profile_id: filters.employee_profile_id,
        per_page: filters.per_page,
      })}`
    )) as ApiResponse<PayrollSimplePage<AdvanceRow>> & { meta?: AdvanceListMeta };

    if (res.success && res.data && res.meta) return { page: res.data, meta: res.meta };

    throw new Error(res.message || 'فشل في جلب السلف');
  },

  /** سلفةٌ واحدةٌ بسرد دفترها — «لماذا رصيدي كذا؟» يُجاب بأسبابٍ تُقرأ لا بمعادلة. */
  async getAdvance(id: number): Promise<AdvanceDetail> {
    const res = await apiClient.get<ApiResponse<AdvanceDetail>>(R.advance(id));

    if (res.success && res.data) return res.data;

    throw new Error(res.message || 'فشل في جلب السلفة');
  },

  /** 🔑 منحُ سلفة — مالٌ يخرج بسببٍ مكتوبٍ وباسمِ من اعتمده. */
  async grantAdvance(payload: AdvancePayload): Promise<{ id: number; advance_number: string; status: AdvanceStatus; outstanding: string }> {
    const res = await apiClient.post<ApiResponse<{ id: number; advance_number: string; status: AdvanceStatus; outstanding: string }>>(
      R.advances,
      payload
    );

    if (res.success && res.data) return res.data;

    throw new Error(res.message || 'تعذّر منحُ السلفة');
  },

  /** إيقافُ الأقساط أو استئنافُها — والدَّينُ يبقى كما هو في الدفتر. */
  async setAdvancePaused(id: number, paused: boolean, reason: string): Promise<void> {
    const res = await apiClient.post<ApiResponse<unknown>>(R.advancePause(id), { paused, reason });

    if (res.success) return;

    throw new Error(res.message || 'تعذّر تغييرُ حالة السلفة');
  },

  /** صرفُ سلفةٍ مُنحت ولم تُصرف — الفعلُ الذي يُنشئ الدَّين وتبدأ به الأقساط. */
  async disburseAdvance(id: number, method: 'bank' | 'cash' = 'bank'): Promise<void> {
    const res = await apiClient.post<ApiResponse<unknown>>(R.advanceDisburse(id), { method });

    if (res.success) return;

    throw new Error(res.message || 'تعذّر تسجيلُ صرف السلفة');
  },

  /** سردُ الجزاءات — بالأيام، والمبلغُ معاينةٌ محسوبةٌ من أجر اليوم النظاميّ اليومَ. */
  async getPenalties(
    filters: { state?: PenaltyState; employee_profile_id?: number; per_page?: number } = {}
  ): Promise<{ page: PayrollSimplePage<PenaltyRow>; meta: PenaltyListMeta }> {
    const res = (await apiClient.get(
      `${R.penalties}${qs({
        state: filters.state,
        employee_profile_id: filters.employee_profile_id,
        per_page: filters.per_page,
      })}`
    )) as ApiResponse<PayrollSimplePage<PenaltyRow>> & { meta?: PenaltyListMeta };

    if (res.success && res.data && res.meta) return { page: res.data, meta: res.meta };

    throw new Error(res.message || 'فشل في جلب الجزاءات');
  },

  /** توقيعُ جزاء — بعد الاستجواب (م.٧١)، وبحارسِ الثلاثين يوماً (م.٦٩) على الخادم. */
  async issuePenalty(payload: PenaltyPayload): Promise<{ id: number; penalty_number: string; state: PenaltyState }> {
    const res = await apiClient.post<ApiResponse<{ id: number; penalty_number: string; state: PenaltyState }>>(
      R.penalties,
      payload
    );

    if (res.success && res.data) return res.data;

    throw new Error(res.message || 'تعذّر توقيعُ الجزاء');
  },

  /** التبليغُ — **يبدأ عدَّ ١٥ يوماً** (م.٧٢)، والمهلةُ تُكتب على الصفّ ولا تُخمَّن. */
  async notifyPenalty(id: number, notifiedOn?: string): Promise<void> {
    const res = await apiClient.post<ApiResponse<unknown>>(R.penaltyNotify(id), { notified_on: notifiedOn });

    if (res.success) return;

    throw new Error(res.message || 'تعذّر تسجيلُ التبليغ');
  },

  /** النفاذ — بانقضاء المهلة، أو بإقرارِ العامل صراحةً ويُسجَّل أنه إقرار. */
  async finalisePenalty(id: number, waived = false): Promise<void> {
    const res = await apiClient.post<ApiResponse<unknown>>(R.penaltyFinalise(id), { waived });

    if (res.success) return;

    throw new Error(res.message || 'تعذّر إنفاذُ الجزاء');
  },

  /** الإبطالُ — وما حُصِّل يُردّ خلال سبعة أيام (م.٩١). */
  async overturnPenalty(id: number, reason: string): Promise<void> {
    const res = await apiClient.post<ApiResponse<unknown>>(R.penaltyOverturn(id), { reason });

    if (res.success) return;

    throw new Error(res.message || 'تعذّر إبطالُ الجزاء');
  },

  /** 🔑 سجلُّ الغرامات الذي توجبه م.٧٣ ورصيدُ الصندوق. */
  async getPenaltyFund(): Promise<{ data: PenaltyFundPayload; meta: PenaltyFundMeta }> {
    const res = (await apiClient.get(R.penaltyFund)) as ApiResponse<PenaltyFundPayload> & { meta?: PenaltyFundMeta };

    if (res.success && res.data && res.meta) return { data: res.data, meta: res.meta };

    throw new Error(res.message || 'فشل في جلب سجلّ الغرامات');
  },
};
