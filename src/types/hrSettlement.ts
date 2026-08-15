/**
 * أنواعُ **مسير التصفية** — عقدُ `HrFinalSettlementController` حرفاً.
 *
 * ══════ 🔴 المالُ سلاسلُ لا أرقام ══════
 * أعمدةُ `decimal(12,2)` تصل نصّاً (`"10000.00"`) لأنّ الخادمَ بناها بـ`Money` (bcmath) وصفرِ
 * عائم. وتحويلُها إلى `number` هنا يُعيد فتحَ البابِ نفسِه من الطرف الآخر. والتنسيقُ يمرّ من
 * `money()` في `payrollFormat` نصّياً.
 *
 * ══════ 🔴 و`null` تعني «لم يُحتسب» لا «صفر» ══════
 * `eos_amount: null` ليست مكافأةً صفرية: صفرُ المكافأة حكمُ م.٨٠ ويصل `"0.00"`. ولذلك كلُّ
 * حقلٍ ماليٍّ هنا `string | null` ولا يُعطى افتراضاً `'0.00'` في أيّ موضع.
 */

/** الاثنا عشرَ سبباً — قائمةٌ مغلقةٌ يُدخلها إنسانٌ مسمّى ولا تُشتقّ. */
export type TerminationBasisCode =
  | 'art74_expiry'
  | 'art74_mutual'
  | 'employer_terminated'
  | 'art77_unlawful'
  | 'art85_resignation'
  | 'art81_worker_left_for_cause'
  | 'art87_force_majeure'
  | 'art87_marriage'
  | 'art87_delivery'
  | 'art80_dismissal'
  | 'death'
  | 'retirement';

/** مَن أنهى العقد — **لمهلة م.٨٨ وحدَها**، لا للكسر. */
export type EndedBy = 'employer' | 'worker' | 'neither';

export type AwardShape = 'full' | 'art85_tiers' | 'none';

export interface TerminationBasisOption {
  basis: TerminationBasisCode;
  label_ar: string;
  article_ref: string;
  ended_by: EndedBy;
  award: AwardShape;
  /** م.٨١ · م.٨٧ قوّةٌ قاهرة · م.٨٠ — ثلاثةٌ لا تُنتقى بنقرةٍ مجرَّدة. */
  document_required: boolean;
}

export interface SettlementReadiness {
  can_open: boolean;
  /** يُعرَض قبل المحاولة لا بعدها: الزرُّ يُعطَّل وتحته سببُه، ولا يُخفى. */
  blockers: string[];
  warnings: string[];
  facts: {
    employee_profile_id?: number;
    employee_name?: string;
    hire_date?: string | null;
    termination_date?: string | null;
    last_working_day?: string | null;
    wage_actual?: string | null;
    leave_balance_days?: string | null;
    open_settlement_run_id?: number | null;
    termination_basis_required?: boolean;
    termination_basis_options?: TerminationBasisOption[];
  };
}

/** كتلةٌ من كتل الحساب — ولكلٍّ سطرُ «لماذا هذا المبلغ». */
export interface SettlementBlock {
  article_ref?: string;
  state?: string;
  amount?: string | null;
  why?: string;
  [key: string]: unknown;
}

export interface SettlementDisclosure {
  code: string;
  severity: 'blocking' | 'opinion' | 'notice';
  article_ref: string | null;
  text_ar: string;
  /** 🔴 رأيٌ راجحٌ لا نصّ — يُقرأ بوسمه ولا يُخبَّأ خلف رقمٍ يبدو محسوماً. */
  opinion_not_text: boolean;
}

export interface SettlementItem {
  id: number;
  code: string;
  name: string;
  kind: 'earning' | 'deduction' | 'employer_cost' | 'informational';
  sign: number;
  amount: string;
  basis_vessel: string | null;
  basis_amount: string | null;
  factor_kind: string | null;
  factor_value: string | null;
  article_ref: string | null;
  rule_code: string | null;
  rule_effective_from: string | null;
  source_type: string | null;
  decided_by: number | null;
  decision_reason: string | null;
  is_frozen: boolean;
  why: string;
}

export interface SettlementStatement {
  id: number;
  run_id: number;
  line_id: number | null;

  employee: {
    employee_profile_id: number;
    name: string;
    joined_on: string | null;
    last_working_day: string | null;
  };

  /** ① السببُ أوّلَ ما يُعرَض كما هو أوّلُ ما يُطلَب. */
  basis: {
    termination_basis: TerminationBasisCode | null;
    label_ar: string | null;
    article_ref: string | null;
    document_path: string | null;
    document_required: boolean;
    objection_opportunity_given: boolean | null;
    anchor_date: string | null;
    note: string | null;
    decided_by: number | null;
    decided_by_name: string | null;
    decided_at: string | null;
    is_set: boolean;
    human_entered_only: boolean;
    /** رسالةُ **طلبٍ** لا خطأ — تُعرَض مكانَ سطر المكافأة لا بجانبه. */
    request_message: string | null;
    options: TerminationBasisOption[];
  };

  service: {
    whole_years: number | null;
    remainder_days: number | null;
    total_days: number | null;
    unpaid_suspension_days: number;
    year_fraction_divisor: number | null;
    divisor_is_convention_not_text: boolean;
  };

  vessel: {
    gross: string | null;
    excluded: string | null;
    net: string | null;
    name_ar: string;
    basic_wage_never_read: boolean;
  };

  blocks: {
    eos?: SettlementBlock;
    leave_cash?: SettlementBlock;
    final_period?: SettlementBlock;
    dues?: SettlementBlock & {
      rows?: Array<{
        kind: 'advance' | 'penalty';
        source_type: string;
        source_id: number;
        reference: string;
        outstanding: string;
        settled_on_line: boolean;
        article_ref: string;
        why: string;
      }>;
      unsettled_count?: number;
    };
    deadline?: SettlementBlock;
  };

  /** ④ مهلةُ م.٨٨ — يحكمها **من أنهى العقد** لا الكسر. */
  deadline: {
    article_ref: string;
    ended_by: EndedBy | null;
    ended_by_label: string;
    days: number | null;
    date: string | null;
    governed_by: string;
    not_governed_by: string;
    why: string;
  };

  totals: {
    eos_full_award: string | null;
    eos_amount: string | null;
    eos_fraction: string | null;
    eos_fraction_article_ref: string | null;
    eos_fraction_clause: string | null;
    leave_balance_days: string | null;
    leave_cash_amount: string | null;
    final_period_amount: string | null;
    other_earnings_amount: string | null;
    gross_amount: string | null;
    deductions_amount: string | null;
    net_amount: string | null;
  };

  items: SettlementItem[];
  disclosures: SettlementDisclosure[];
  blockers: string[];
  rules_snapshot: Record<string, unknown>;
  computed_at: string | null;
  is_computed: boolean;
  is_frozen: boolean;
  frozen_at: string | null;
}

export interface SettlementMeta {
  run: {
    id: number;
    run_number: string | null;
    stage: string;
    period_start: string | null;
    period_end: string | null;
    pay_date: string | null;
    statutory_deadline: string | null;
    blocking_flags: Array<Record<string, unknown>>;
    warning_flags: Array<Record<string, unknown>>;
  };
  can_prepare: boolean;
  can_approve: boolean;
  can_pay: boolean;
  editable: boolean;
  payments_path: string;
}

export interface SettlementRow {
  id: number;
  run_id: number;
  run_number: string | null;
  stage: string;
  employee_profile_id: number;
  employee_name: string;
  last_working_day: string | null;
  termination_basis: TerminationBasisCode | null;
  basis_label: string | null;
  basis_article_ref: string | null;
  /** 🔴 العلَمُ الذي تبني عليه الشاشةُ نداءَها الأول. */
  basis_missing: boolean;
  settlement_deadline: string | null;
  is_computed: boolean;
  is_frozen: boolean;
  /** يصل فقط لحاملِ `hr.compensation.view` — والغيابُ حذفُ مفتاحٍ لا تصفير. */
  net_amount?: string | null;
  eos_amount?: string | null;
}

export interface SettlementBasisPayload {
  termination_basis: TerminationBasisCode;
  basis_document_path?: string | null;
  objection_opportunity_given?: boolean | null;
  anchor_date?: string | null;
  basis_note?: string | null;
  recompute?: boolean;
}
