import { apiClient } from '../utils/api';
import type { ApiResponse, PaginatedResponse } from '../utils/api';
import type {
  SettlementBasisPayload,
  SettlementMeta,
  SettlementReadiness,
  SettlementRow,
  SettlementStatement,
} from '../types/hrSettlement';

/**
 * خدمةُ **مسير التصفية** — نمطُ `hrPayrollService` حرفاً: خريطةُ مساراتٍ أعلى الملفّ مطابقةٌ
 * لـ`routes/api.php`، ثمّ `apiClient` ← `if (res.success && res.data) return res.data` ← رمي.
 *
 * ══════ 🔴 `{id}` هنا **رقمُ المسير** لا رقمُ صفّ التصفية ══════
 * مفتاحٌ واحدٌ للمستند كلِّه، فلا يحمل المستخدمُ رقمين لشيءٍ واحدٍ ولا تُخلَط الوصلات. وهو
 * نفسُ الرقم الذي تُبنى عليه مساراتُ الدفع `‎/hr/payroll/runs/{id}/payments`.
 *
 * ══════ ولا مسارَ دفعٍ هنا ══════
 * التصفيةُ مسيرٌ في `hr_payroll_runs`، فالصرفُ يمرّ من خدمة الرواتب نفسِها بصلاحية
 * `hr.payroll.pay`. وبناءُ نداءِ دفعٍ ثانٍ يعني مسارَين متطابقَين يتباعدان بأوّل تعديل.
 */

const BASE = '/hr/payroll/settlements';
const one = (runId: number) => `${BASE}/${runId}`;

const R = {
  index: BASE, //                              GET  @index
  readiness: `${BASE}/readiness`, //           GET  @readiness
  store: BASE, //                              POST @store
  show: one, //                                GET  @show
  basis: (runId: number) => `${one(runId)}/basis`, //     POST @basis
  compute: (runId: number) => `${one(runId)}/compute`, // POST @compute
  approve: (runId: number) => `${one(runId)}/approve`, // POST @approve
} as const;

/** إسقاطُ `''`/`null`/`undefined` من الاستعلام — نسخُ عرف `hrPayrollService`. */
function qs(input: Record<string, string | number | undefined | null>): string {
  const params = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.append(key, String(value));
  });
  const out = params.toString();
  return out ? `?${out}` : '';
}

type WithMeta<T, M> = ApiResponse<T> & { meta?: M };

export interface SettlementView {
  statement: SettlementStatement;
  meta: SettlementMeta;
}

export const hrSettlementService = {
  /**
   * لوحُ الجاهزية — **قبل أن يوجد صفّ**. و`can_open` و`blockers` توأمان لا ينفصلان.
   */
  async getReadiness(employeeProfileId: number, lastWorkingDay?: string | null): Promise<SettlementReadiness> {
    const res = (await apiClient.get(
      `${R.readiness}${qs({ employee_profile_id: employeeProfileId, last_working_day: lastWorkingDay })}`
    )) as ApiResponse<SettlementReadiness>;

    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّر جلبُ جاهزية التصفية');
  },

  /** قائمةُ التصفيات — والمبالغُ تُحذف مفاتيحُها لمن لا يقرؤها (لا تُصفَّر). */
  async list(params: { stage?: string; per_page?: number } = {}): Promise<PaginatedResponse<SettlementRow>> {
    const res = (await apiClient.get(`${R.index}${qs(params)}`)) as ApiResponse<PaginatedResponse<SettlementRow>>;

    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّر جلبُ التصفيات');
  },

  /** فتحُ مسير تصفية — ونقرةٌ مزدوجةٌ تُرجع المسيرَ نفسَه لا مسيرين. */
  async open(payload: {
    employee_profile_id: number;
    last_working_day?: string | null;
    pay_date?: string | null;
  }): Promise<SettlementStatement> {
    const res = await apiClient.post<ApiResponse<SettlementStatement>>(R.store, payload);

    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّر فتحُ مسير التصفية');
  },

  /** البيانُ المفصَّل — كلُّ رقمٍ **مقروءٌ من صفٍّ مخزَّن** لا مشتقٌّ عند العرض. */
  async get(runId: number): Promise<SettlementView> {
    const res = (await apiClient.get(R.show(runId))) as WithMeta<SettlementStatement, SettlementMeta>;

    if (res.success && res.data && res.meta) return { statement: res.data, meta: res.meta };
    throw new Error(res.message || 'تعذّر جلبُ بيان التصفية');
  },

  /**
   * 🔴 تكييفُ سبب الإنهاء — أوّلُ ما يُطلَب، وتغييرُه يُعيد الحسابَ أمام العين
   * (`recompute` افتراضُه `true` في الخادم).
   */
  async saveBasis(runId: number, payload: SettlementBasisPayload): Promise<SettlementStatement> {
    const res = await apiClient.post<ApiResponse<SettlementStatement>>(R.basis(runId), payload);

    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّر حفظُ سبب الإنهاء');
  },

  /** الاحتساب — فعلٌ متكرّرٌ ما دام المسيرُ مسوّدةً أو محتسَباً، ولا يعتمد بحال. */
  async compute(runId: number): Promise<SettlementStatement> {
    const res = await apiClient.post<ApiResponse<SettlementStatement>>(R.compute(runId), {});

    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّر احتسابُ التصفية');
  },

  /** الاعتمادُ والتجميد — بعده لا يتحرّك رقمٌ ولو تغيّر الراتبُ غداً. */
  async approve(runId: number, payload: { single_approver_ack?: boolean; ack_text?: string } = {}): Promise<SettlementStatement> {
    const res = await apiClient.post<ApiResponse<SettlementStatement>>(R.approve(runId), payload);

    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّر اعتمادُ التصفية');
  },
};

export default hrSettlementService;
