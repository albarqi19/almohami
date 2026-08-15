/**
 * أنواعُ وحدة الرواتب — **S1: سجلُّ الأجور** وحدَه.
 *
 * 🔴 كلُّ مبلغٍ `string` لا `number`: أعمدةُ `decimal(12,2)` تصل نصّاً من الخادم
 * (`"11900.00"`)، وتحويلُها إلى `number` للعرض يُعيد فتحَ بابِ الفاصلة العائمة الذي أُغلق
 * بـ`Money` على الخادم. والعرضُ تنسيقٌ **نصّيّ** في `payrollFormat.money`.
 *
 * 🔴 والمبالغُ **اختياريةٌ بالنوع** لأنّ الخادم **يحذف مفاتيحَها** لمن لا يملك
 * `hr.compensation.view` — لا يُصفّرها ولا يُنجّمها. فالشاشةُ تُميّز «لا صلاحية» عن «لا قيمة»
 * بـ`meta.can_view_amounts`، ولا تخمّن من غياب المفتاح.
 */

/** نظامُ التأمينات — مُصرَّحٌ به دائماً، ولا يُشتقّ من الجنسية أبداً (D15). */
export type GosiScheme = 'saudi' | 'non_saudi' | 'exempt';

export type WageFileStatus = 'active' | 'held' | 'closed';

export type IbanState = 'none' | 'valid' | 'invalid';

/** م.٢: «الشهر ثلاثون يوماً» هو الافتراض — والبديلُ أيامُ الشهر الفعلية. */
export type ProrationBasis = 'statutory_thirty' | 'actual_month_days';

export type WageComposition = 'itemised' | 'lump_sum';

/** م.٩٠ لا تعرف `biweekly` بحالتيها. */
export type PayFrequency = 'monthly' | 'weekly';

export type BasicWageDefinition = 'basic_only' | 'basic_plus_periodic' | 'contract_defined';

export type PaymentMethod = 'bank_transfer' | 'cash' | 'cheque';

/** شرائحُ لوح الجاهزية — مفاتيحُها هي مفاتيحُ عدّادات الخادم نفسُها. */
export type WageRegisterFilter = 'all' | 'missing_wage' | 'missing_iban' | 'missing_scheme' | 'ready';

export type WageRegisterCounts = Record<WageRegisterFilter, number>;

export interface WageRegisterMeta {
  /** 🔴 «لماذا لا أرى أرقاماً» — بلا هذا العلَم تظنّ الشاشةُ أنّ المكتبَ بلا رواتب. */
  can_view_amounts: boolean;
  can_manage: boolean;
  proration_default: ProrationBasis;
  counts?: WageRegisterCounts;
  filter?: WageRegisterFilter;
}

/** صفُّ السجلّ: الحالاتُ للجميع، والأرقامُ لمن يملكها. */
export interface WageRegisterRow {
  profile_id: number;
  name?: string | null;
  employee_number?: string | null;
  job_title?: string | null;
  department?: string | null;
  employment_status?: string | null;
  has_wage_file: boolean;
  wage_file_status?: WageFileStatus | null;
  hold_reason?: string | null;
  has_wage: boolean;
  effective_from?: string | null;
  iban_state: IbanState;
  gosi_scheme?: GosiScheme | null;
  proration_basis: ProrationBasis;
  /** يصل فقط لحاملِ `hr.compensation.view`. */
  total_salary?: string;
  basic_salary?: string;
  currency?: string;
}

export interface WageFile {
  id: number;
  employee_profile_id: number;
  opened_at?: string | null;
  opened_reason?: string | null;
  gosi_scheme: GosiScheme;
  gosi_cohort?: string | null;
  gosi_registered_on?: string | null;
  basic_wage_definition: BasicWageDefinition;
  daily_wage_divisor: number;
  monthly_hours_divisor: number;
  proration_basis: ProrationBasis;
  payment_method: PaymentMethod;
  non_bank_reason?: string | null;
  iban_state: IbanState;
  bank_name?: string | null;
  status: WageFileStatus;
  hold_reason?: string | null;
  closed_reason?: string | null;
  /** حسّاسة — تصل فقط لحاملِ `hr.compensation.view`. */
  iban?: string | null;
  gosi_number?: string | null;
  account_holder_name?: string | null;
}

/** نسخةُ أجرٍ مؤرَّخة — **لا تُحرَّر**؛ التغييرُ نسخةٌ جديدة، والخطأُ يُلغى ويبقى ظاهراً. */
export interface WageRecord {
  id: number;
  effective_from?: string | null;
  /** **غيرُ شاملة**: تساوي `effective_from` للنسخة التالية. */
  effective_to?: string | null;
  is_current: boolean;
  wage_composition?: WageComposition | null;
  pay_frequency?: PayFrequency | null;
  currency?: string | null;
  change_reason?: string | null;
  voided_at?: string | null;
  voided_by_name?: string | null;
  recorded_by_name?: string | null;
  created_at?: string | null;
  basic_salary?: string;
  housing_allowance?: string;
  transport_allowance?: string;
  other_allowances?: string;
  total_salary?: string;
  iban?: string | null;
  bank_name?: string | null;
}

/** أوعيةُ الأجر الساري — ثلاثةُ أوعيةٍ لا رقمٌ واحد (م.٢). */
export interface WageVesselsPayload {
  compensation_id: number;
  effective_from: string;
  effective_to: string | null;
  composition: WageComposition;
  currency: string;
  basic_amount: string;
  housing_amount: string;
  transport_amount: string;
  other_amount: string;
  /** م.٢ «الأجر» — أساسُ م.٩٣ و٨٤ و«أجر خمسة أيام». */
  wage_actual: string;
  /** م.٢ «الأجر الأساسيّ» — أساسُ زيادة م.١٠٧ وحدَها. */
  wage_basic: string;
  /** الأساسيُّ + السكن — **قبل الحدَّين**؛ انظر `gosi_caps_evaluated`. */
  wage_gosi: string;
  gosi_scheme: GosiScheme | null;
  /** `false` في S1: قواعدُ الحدَّين تصل في S2 — ولا يُدَّعى تسقيفٌ لم يقع. */
  gosi_caps_evaluated: boolean;
  basic_wage_definition: BasicWageDefinition;
  proration_basis: ProrationBasis;
  daily_wage_divisor: number;
  monthly_hours_divisor: number;
  statutory_daily_wage: string;
}

export interface WageProfileHeader {
  id: number;
  name?: string | null;
  employee_number?: string | null;
  job_title?: string | null;
  department?: string | null;
  status?: string | null;
}

export interface WageRegisterDetail {
  profile: WageProfileHeader;
  wage_file: WageFile | null;
  in_force: WageVesselsPayload | null;
  records: WageRecord[];
}

export interface WageFilePayload {
  opened_reason?: string;
  gosi_scheme?: GosiScheme;
  gosi_cohort?: string | null;
  gosi_number?: string | null;
  gosi_registered_on?: string | null;
  basic_wage_definition?: BasicWageDefinition;
  daily_wage_divisor?: number;
  monthly_hours_divisor?: number;
  proration_basis?: ProrationBasis;
  payment_method?: PaymentMethod;
  non_bank_reason?: string | null;
  iban?: string | null;
  bank_name?: string | null;
  account_holder_name?: string | null;
  status?: WageFileStatus;
  hold_reason?: string | null;
  closed_reason?: string | null;
}

export interface WageRecordPayload {
  /** **إلزاميٌّ وصريح** — لا يُفترض «اليوم»: تاريخُ السريان هو المعلومةَ كلَّها. */
  effective_from: string;
  change_reason: string;
  basic_salary: string;
  housing_allowance?: string;
  transport_allowance?: string;
  other_allowances?: string;
  wage_composition?: WageComposition;
  pay_frequency?: PayFrequency;
  currency?: string;
  /** تُقبل من جدار الملفّ حين لا ملفَّ أجرٍ بعد؛ ومتى وُجد فهو المصدر. */
  iban?: string | null;
  bank_name?: string | null;
  account_holder_name?: string | null;
  gosi_number?: string | null;
  gosi_scheme?: GosiScheme | null;
}

// ═══════════════════════════════════════════════════════════════════════════
//  S2 — القواعدُ المؤرَّخة والكتالوجُ والمرجعُ النظاميّ
//
//  🔴 `payload` هنا `unknown` عمداً: حمولةُ كلّ قاعدةٍ شكلٌ مختلفٌ يقرؤه قارئُها على
//  الخادم، والواجهةُ **تعرضها ولا تحسب منها**. تنميطُها بواجهةٍ موحَّدة يُغري بحسابٍ
//  فرونتيٍّ فوق أرقامٍ نظامية — وهو بابُ رقمين مختلفين للحقيقة الواحدة.
// ═══════════════════════════════════════════════════════════════════════════

export type RuleVerificationState = 'unverified' | 'confirmed';

/** وصفُ قارئ القاعدة — و`shipped` **مقيسةٌ** على الخادم لا مُدَّعاة. */
export interface PayrollRuleReader {
  class: string;
  method: string;
  /** ما يُقرأ من الحمولة فعلاً — لا ترجمةٌ لاسم القاعدة. */
  what: string;
  /** خطوةُ الشحن (S2…S9) — تُعرَض حين لا يكون القارئُ مشحوناً. */
  step: string;
  shipped: boolean;
}

export interface PayrollRule {
  code: string;
  article_ref: string;
  title_ar: string;
  rule_kind: string;
  basis: string;
  payload: Record<string, unknown>;
  effective_from: string;
  effective_to: string | null;
  informational: boolean;
  verification_state: RuleVerificationState;
  confirmed_at: string | null;
  /** `null` مع `confirmed_at` ⇒ «مؤكَّدةٌ نظاماً» (نصٌّ منشور) لا «أكّدها فلان». */
  confirmed_by: number | null;
  source_note: string | null;
  reader: PayrollRuleReader | null;
}

export interface PayrollComponent {
  code: string;
  name_ar: string;
  kind: 'earning' | 'deduction' | 'employer_cost' | 'informational';
  category: string;
  sign: number;
  bearer: 'employee' | 'employer';
  counterparty: 'employee' | 'gosi' | 'court' | 'worker_fund' | 'employer' | 'third_party';
  basis_vessel: string | null;
  cap_rule_code: string | null;
  priority_key: string | null;
  requires_reason: boolean;
  requires_document: boolean;
  requires_decision: boolean;
  allowed_run_types: string[];
  is_active: boolean;
}

/** نسبُ نظامٍ واحدٍ **بنقاط الأساس** — ٩٪ = 900. لا عائمَ في وعاء المال. */
export interface GosiSchemeRates {
  ee_pension_bp: number;
  ee_saned_bp: number;
  er_pension_bp: number;
  er_saned_bp: number;
  er_hazards_bp: number;
}

export interface GosiConfirmation {
  confirmed: boolean;
  confirmed_at: string | null;
  confirmed_by: string | null;
  codes: string[];
  schemes: Partial<Record<GosiScheme, GosiSchemeRates>>;
  /** شرائحُ الالتحاق غيرُ مُنمذَجة — يُقال صراحةً ولا يُخفى. */
  cohorts_modelled: boolean;
}

export interface PayrollRuleBlocker {
  code: string;
  title_ar: string;
  article_ref: string;
}

export interface PayrollRulesPayload {
  on: string;
  binding: PayrollRule[];
  informational: PayrollRule[];
  components: PayrollComponent[];
  gosi: GosiConfirmation;
  approval_blocked: boolean;
  approval_blockers: PayrollRuleBlocker[];
}

export interface PayrollRulesMeta {
  can_confirm: boolean;
  seeded_now: boolean;
  counts: {
    binding: number;
    informational: number;
    readers_shipped: number;
    readers_pending: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// S3 — المسير والطابور والفحصُ القبْليّ
//
// 🔴 حمولةُ هذه الخطوة **بلا مالٍ أصلاً**: أسماءٌ ورموزُ أسبابٍ وعددُ أيام. الاحتسابُ في
// S4، ولذلك لا يوجد في الأنواع أدناه حقلُ مبلغٍ واحد — وغيابُه مقصودٌ لا نقص.
// ═══════════════════════════════════════════════════════════════════════════

export type RunStage = 'draft' | 'calculated' | 'approved' | 'paying' | 'paid' | 'published' | 'voided';

export type RunType = 'monthly' | 'off_cycle' | 'correction' | 'final_settlement' | 'leave_advance';

export type PostingState = 'not_posted' | 'posted' | 'reversed' | 'accounting_off';

export type FlagSeverity = 'block' | 'warn' | 'info';

/** رموزُ الاستبعاد — نظيرتُها على الخادم `App\Support\Hr\PayrollExclusionReason`. */
export type ExclusionReason =
  | 'terminated_before'
  | 'joined_after'
  | 'already_claimed'
  | 'no_wage_file'
  | 'wage_file_closed'
  | 'wage_file_held'
  | 'no_gosi_scheme'
  | 'no_wage_row'
  | 'zero_wage'
  | 'manual';

/** مشمولٌ في الطابور — أهليةٌ وسياسةٌ، بلا ريال. */
export interface ReadinessIncluded {
  profile_id: number;
  name: string | null;
  employee_number: string | null;
  job_title: string | null;
  department: string | null;
  gosi_scheme: GosiScheme | null;
  iban_state: IbanState;
  payment_method: PaymentMethod;
  proration_basis: ProrationBasis;
  compensation_id: number;
  wage_effective_from: string;
  needs_iban: boolean;
}

/** 🔴 مستبعَدٌ **باسمه وسببه** — ولا يُعرَض عددٌ مجرَّدٌ في أيّ موضع. */
export interface ReadinessExcluded {
  profile_id: number;
  name: string | null;
  employee_number: string | null;
  job_title: string | null;
  department: string | null;
  reason_code: ExclusionReason;
  reason_detail: string | null;
  fix_target: string;
  fixable: boolean;
  claimed_by_run_id: number | null;
}

export interface PayrollFlag {
  code: string;
  severity: FlagSeverity;
  count: number;
  fix_target?: string;
  blocks?: string;
  subjects?: Array<{ profile_id?: number; name?: string | null; reason_code?: string; code?: string; title_ar?: string; article_ref?: string }>;
}

/**
 * 🔴 **ملفٌّ مبدئيّ** — صفُّ موارد بشرية أنشأه الخادمُ مع الحساب ولم يُستكمل بعد.
 *
 * لا هو مشمولٌ ولا مستبعَد: ثالثٌ بينهما. ولا يُعدّ في «في المكتب» — عدُّه يجعل كلَّ حسابٍ
 * جديدٍ يرفع مقامَ الكسر فيبدو المكتبُ أنقصَ جاهزيةً كلّما أُضيف مستخدم.
 */
export interface ReadinessDraft {
  profile_id: number;
  name: string | null;
  employee_number: string | null;
  job_title: string | null;
  department: string | null;
  fix_target: string;
}

export interface PayrollReadiness {
  period_start: string;
  period_end: string;
  headcount_total: number;
  included_count: number;
  excluded_count: number;
  /**
   * 🔴 كم منسوباً له أجرٌ مسجَّلٌ في السجلّ — **مقيسٌ على الخادم لا مشتقٌّ من
   * `included_count`**. الرقمان يفترقان كلّما كان المانعُ غيرَ الأجر (ملفٌّ معلَّقٌ، بلا
   * نظام تأمينات، مطالَبٌ به في مسيرٍ آخر): سبعةُ أجورٍ قائمةٍ و`included_count = 0`.
   * وكتابةُ الثاني مكانَ الأوّل تنفي مالاً موجوداً في شاشةٍ يقول لوحُها المجاورُ خلافَه.
   */
  wage_recorded_count: number;
  draft_count: number;
  drafts: ReadinessDraft[];
  included: ReadinessIncluded[];
  excluded: ReadinessExcluded[];
  reason_counts: Partial<Record<ExclusionReason, number>>;
  blockers: PayrollFlag[];
  warnings: PayrollFlag[];
  gosi_confirmed: boolean;
  /** 🔴 توأمان لا ينفصلان: زرٌّ معطَّلٌ بلا سببٍ يصنع سؤالاً، وبسببه يقتله. */
  can_open_run: boolean;
  blocked_reason: string | null;
}

export interface PayrollRunHead {
  id: number;
  run_number: string | null;
  run_type: RunType;
  period_key: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  stage: RunStage;
  headcount_included: number;
  headcount_excluded: number;
  headcount_total: number;
  posting_state: PostingState;
  self_approved: boolean;
  /**
   * 🔴 وسمٌ **مستقلٌّ** عن `self_approved` لا مرادفٌ له: ذاك «لا معتمِدَ آخرَ في المكتب»،
   * وهذا «لمن اعتمده قسيمةٌ فيه». ويجتمعان في مكتبٍ مديرُه الوحيدُ على كشف الرواتب.
   */
  approver_was_subject: boolean;
  /** اسمُ المعتمِد **لقطةً** وقتَ الاعتماد — لا انضمامٌ حيٌّ يتحوّر بتعديل الاسم (D20). */
  approver_name: string | null;
  blocking_flags: PayrollFlag[] | null;
  warning_flags: PayrollFlag[] | null;
  prepared_at: string | null;
  approved_at: string | null;
  created_at: string | null;
  computed: boolean;
  /** ⏳ مهلةُ الثلاثين يوماً — تُحسب في الخادم بتوقيت الرياض، ولا تُشتقّ في المتصفّح. */
  statutory_window: PayrollStatutoryWindow;
}

/**
 * ⏳ **مهلةُ الثلاثين يوماً من الاستحقاق** — والاستحقاقُ أوّلُ يومٍ بعد نهاية فترة المسير.
 *
 * 🔴 و`tone` تصل **من الخادم** ولا تُشتقّ هنا من `days_left`: حدُّ «أسبوع» مكتوبٌ في كتالوج
 * المدقّق، ونسخةٌ ثانيةٌ منه في TypeScript تتباعد عنه بأوّل تعديل فتقول الشاشةُ «متّسع»
 * والمدقّقُ يقول «بقي أسبوع».
 *
 * 🔴 **ولا حقلَ لنسبة الالتزام هنا ولا في أيّ نوعٍ آخر**: مقامُها عددُ المسجَّلين في
 * التأمينات لدى المنشأة، ولا يملكه هذا النظام — وعرضُها تطمينٌ كاذبٌ لمكتبٍ قد يكون مخالفاً.
 */
export interface PayrollStatutoryWindow {
  /** تاريخُ الاستحقاق — أوّلُ يومٍ بعد نهاية الفترة. */
  due_on: string | null;
  /** آخرُ يومٍ في المهلة. */
  deadline_on: string | null;
  /** المتبقّي بالأيام — سالبٌ إذا انقضت، و`null` لمسيرٍ بلا فترة. */
  days_left: number | null;
  days_total: number;
  tone: 'elapsed' | 'urgent' | 'tight' | 'ample' | 'settled' | 'unknown';
  basis: string | null;
}

/**
 * 🔴 **كشفُ الرواتب المسلَّم للبنك** (ملفُّ إدخال) — معاينتُه قبل تنزيله.
 *
 * وما يصل هنا **ليس ملفَّ حماية الأجور**: ذاك يصدره البنكُ بعد تنفيذ التحويلات ويوقّعه
 * رقمياً بمفتاحه الخاصّ، ورفعُه فعلٌ تقوم به المنشأة. ولذلك `notices` تصل من الخادم ولا
 * تُكتب في الواجهة: نصُّ الشاشة ونصُّ رأس الملفّ **واحدٌ من مصدرٍ واحد**، فلا يُصحَّح أحدُهما
 * ويبقى الآخرُ يكذب.
 */
export interface BankInputFilePreview {
  run: {
    id: number;
    run_number: string | null;
    run_type: RunType;
    stage: RunStage;
    period_start: string | null;
    period_end: string | null;
    pay_date: string | null;
    currency: string;
  };
  document_name: string;
  notices: string[];
  /** مفتاحُ العمود ⇦ عنوانُه العربيّ — الترتيبُ ترتيبُ الملفّ حرفاً. */
  columns: Record<string, string>;
  money_columns: string[];
  rows: Record<string, string>[];
  row_count: number;
  /** الإجماليُّ مطويٌّ بـbcmath فوق صوافي السطور نفسِها — سلسلةٌ لا رقمٌ عائم. */
  total: string;
  excluded: { name: string; reason: string }[];
  refusal: { code: string; message: string; subjects: string[] } | null;
  draft: boolean;
  draft_reasons: string[];
  statutory_window: PayrollStatutoryWindow;
  establishment: {
    mol_establishment_id: string | null;
    bank_label: string | null;
    bank_name: string | null;
    dest_id: string | null;
    estb_id: string | null;
    bank_account: string | null;
  };
  warnings: BankFileFinding[];
  disclaimers: { code: string; text: string }[];
}

/** نتيجةُ المدقّق الاستباقيّ — بأصحابها بالأسماء لا بعددٍ مجرَّد. */
export interface BankFileFinding {
  code: string;
  severity: 'block' | 'warn';
  scope: 'establishment' | 'employee' | 'run';
  headline: boolean;
  label: string;
  impact: string;
  fix_target: string;
  count: number;
  detail: string | null;
  subjects: { line_id: number; profile_id: number | null; name: string; employee_number: string | null; detail: string | null }[];
}

export interface BankInputFileMeta {
  can_export: boolean;
  file_name: string;
}

/** سطرُ الطابور — هويةٌ بلا مال (S3). */
export interface PayrollRosterLine {
  line_id: number;
  profile_id: number;
  name: string;
  employee_number: string | null;
  job_title: string | null;
  department: string | null;
  gosi_scheme: GosiScheme | null;
  proration_basis: ProrationBasis | null;
  has_iban: boolean;
  status: string;
  payment_state: string;
  period_calendar_days: number | null;
}

export interface PayrollOverview {
  period: string;
  period_key: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  days_to_pay: number;
  /**
   * ⏳ مهلةُ الثلاثين يوماً لهذه الفترة — **سؤالٌ غيرُ «متى يومُ الصرف»**: ذاك موعدُ المكتب،
   * وهذه مهلةٌ نظاميةٌ من الاستحقاق. ومكتبٌ يصرف في موعده وقد تنقضي عليه المهلةُ لأنّ
   * التحويلَ تأخّر أو ملفَّ بنكه لم يُطلَب.
   */
  statutory_window: PayrollStatutoryWindow;
  readiness: PayrollReadiness;
  pending_decisions: Record<FlagSeverity, number>;
  open_run: PayrollRunHead | null;
  settings: {
    pay_day_of_month: number;
    cutoff_day_of_month: number;
    configured: boolean;
  };
}

export interface PayrollOverviewMeta {
  can_prepare: boolean;
  can_approve: boolean;
  can_audit: boolean;
  exclusion_reasons: ExclusionReason[];
}

export interface PayrollRunDetail {
  run: PayrollRunHead;
  roster: {
    included_count: number;
    excluded_count: number;
    total: number;
    included: PayrollRosterLine[];
    excluded: Array<{
      profile_id: number;
      name_snapshot: string | null;
      employee_number: string | null;
      reason_code: ExclusionReason;
      reason_detail: string | null;
      fix_target: string;
    }>;
  };
}

export interface PayrollRunDetailMeta {
  can_prepare: boolean;
  can_approve: boolean;
  roster_editable: boolean;
  exclusion_reasons: ExclusionReason[];
}

export interface PayrollPreflight {
  run_id: number;
  stage: RunStage;
  flags: PayrollFlag[];
  checked_count: number;
  blocking_count: number;
  all_clear: boolean;
  readiness: PayrollReadiness;
}

export type ProposalType =
  | 'unpaid_leave'
  | 'sick_tier'
  | 'undertime'
  | 'unclassified_day'
  | 'advance_installment'
  | 'penalty_due'
  | 'deferred_from_cap'
  | 'retro_after_payroll'
  | 'overpayment';

export interface PayrollProposal {
  id: number;
  profile_id: number;
  name: string | null;
  proposal_type: ProposalType;
  severity: FlagSeverity;
  state: 'open' | 'accepted' | 'dismissed' | 'expired';
  source_type: string | null;
  evidence: Record<string, unknown> | null;
}

export interface PayrollProposalsMeta {
  counts: Record<FlagSeverity, number>;
  /** 🔴 بتُّ المقترحات يصل في S4 مع جدول البنود وحارسِ `decided_by` في القاعدة. */
  decide_available: boolean;
}

// ══════════════════════════════════════════════════════════════════════════
// S4 — الاحتسابُ والمراجعةُ والقسيمة
//
// 🔴 كلُّ مبلغٍ **سلسلةُ decimal** لا `number`: الخادمُ بناه بـ`Money` (bcmath) بصفر عائم،
// وتحويلُه إلى `number` هنا يُعيد فتحَ البابِ نفسِه من الطرف الآخر. و`null` تعني «لم يُحتسب
// بعد» — لا صفراً: صفرٌ مكتوبٌ يُقرأ حقيقةً («صافيه صفر») عن سطرٍ لم يُحسب أصلاً.
// ══════════════════════════════════════════════════════════════════════════

export type ItemKind = 'earning' | 'deduction' | 'employer_cost' | 'informational';

export type Bearer = 'employee' | 'employer';

export type Counterparty = 'employee' | 'gosi' | 'court' | 'worker_fund' | 'employer' | 'third_party';

export type BasisVessel = 'actual' | 'basic' | 'gosi' | 'daily' | 'hourly' | 'flat';

export type FactorKind = 'days' | 'hours' | 'pct_bp' | 'count' | 'flat';

/** رمزُ السقف الذي اشتعل — ولكلٍّ مادّتُه في `article_ref`. */
export type CapCode =
  | 'art70_fine'
  | 'art91_damage'
  | 'art92_category'
  | 'art93_total'
  | 'art40_forbidden'
  | 'payable_ceiling';

/** مجاميعُ المسير — `null` قبل الاحتساب، ولا تُرسَل أصفارٌ تُقرأ نتيجةً. */
export interface PayrollRunTotals {
  gross_amount: string;
  deductions_amount: string;
  net_amount: string;
  employer_cost_amount: string;
  gosi_ee_amount: string;
  gosi_er_amount: string;
  deferred_amount: string;
  fines_to_fund_amount: string;
  cutoff_at: string | null;
  attendance_locked_through: string | null;
}

export type PayrollRunHeadWithTotals = PayrollRunHead & { totals: PayrollRunTotals | null };

/**
 * 🔑 حصيلةُ الاعتماد — **ما وقع بالعدد** لا «تمّ بنجاح».
 *
 * `day_claims` مطالباتُ الأيام المكتوبة (هي التي تمنع دفعَ يومٍ مرّتين)، و`self_approved`
 * وسمُ «اعتمدها معدُّها»، و`posting_state` يقول أقُيِّد المسيرُ محاسبياً أم اعتُمد ووُسِم
 * بأنّه لم يُقيَّد — والصمتُ عن ذلك يكذب.
 */
export interface PayrollApproveResult {
  run: PayrollRunHeadWithTotals;
  day_claims: number;
  posting_state: PostingState;
  journal_entry_id: number | null;
  self_approved: boolean;
  /** «اعتمدها من صُرف له فيها» — وسمٌ يُطبَع على كلّ قسيمةٍ في المسير، لا علَمٌ داخليّ. */
  approver_was_subject: boolean;
}

/** صفُّ جدول الاحتساب — سبعةُ أعمدةٍ لا عشرون. */
export interface PayrollComputedLine extends PayrollRosterLine {
  paid_calendar_days: string | null;
  unpaid_calendar_days: string | null;
  employed_calendar_days: number | null;
  leave_ledger_days: string | null;
  earnings_amount: string | null;
  deductions_amount: string | null;
  gosi_ee_amount: string | null;
  net_amount: string | null;
  employer_cost_amount: string | null;
  deferred_amount: string | null;
  blocking_flags: PayrollFlag[] | null;
  warning_flags: PayrollFlag[] | null;
}

export interface PayrollLinesPayload {
  run: PayrollRunHeadWithTotals;
  lines: PayrollComputedLine[];
}

export interface PayrollLinesMeta {
  can_view_amounts: boolean;
  can_prepare?: boolean;
  editable?: boolean;
  lines_count: number;
  withheld_reason?: string;
}

/** 🔑 بندُ القسيمة — **المعادلةُ مع الرقم**: وعاءٌ × معامل × قاعدةٌ بنسختها. */
export interface PayrollItem {
  id: number;
  code: string;
  name: string;
  kind: ItemKind;
  category: string;
  sign: number;
  bearer: Bearer;
  counterparty: Counterparty;
  amount: string;
  accrual_period: string;
  basis_vessel: BasisVessel | null;
  basis_amount: string | null;
  factor_kind: FactorKind | null;
  factor_value: string | null;
  rule_code: string | null;
  rule_effective_from: string | null;
  article_ref: string | null;
  cap_applied: CapCode | null;
  capped_from_amount: string | null;
  deferred_amount: string | null;
  source_type: string | null;
  decided_by_name: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  explain: Record<string, unknown> | null;
}

/** شريحةُ أجرٍ — «من كذا إلى كذا بهذا الأجر ونصيبُها كذا». */
export interface PayrollSegment {
  id: number;
  from: string;
  to: string;
  calendar_days: number;
  paid_calendar_days: string;
  wage_actual: string;
  amount: string;
  is_whole_period: boolean;
  absorbs_remainder: boolean;
  formula: {
    monthly: string;
    line_monthly: string;
    divisor: number;
    basis: ProrationBasis;
    frame: string;
    mode: string;
    segment_days: number;
    paid_days: number;
    rounding: string;
    remainder: string;
    fraction: string;
    clamped: boolean;
    uncapped_amount: string;
  } | null;
}

/** رأسُ القسيمة — كلُّ رقمٍ يُطبَع مقروءٌ من صفِّه لا مشتقٌّ عند العرض. */
export interface PayrollLineDetail extends PayrollComputedLine {
  /** يُسنَد عند الاعتماد وحدَه — و`null` قبله تقول «لم تصر مستنداً بعد» بلا تأويل. */
  payslip_number: string | null;
  wage_actual: string | null;
  wage_basic: string | null;
  wage_gosi: string | null;
  statutory_daily_wage: string | null;
  statutory_hourly_wage: string | null;
  basic_hourly_wage: string | null;
  daily_wage_divisor: number | null;
  monthly_hours_divisor: number | null;
  gosi_floor_applied: boolean;
  gosi_ceiling_applied: boolean;
  partial_pay_calendar_days: string | null;
  period_calendar_days: number | null;
  iban_last4: string | null;
  bank_name: string | null;
  is_frozen: boolean;
  explain: Record<string, unknown> | null;
}

/** مؤشّرُ فرقٍ — **رمزٌ لا نثر**: الجملةُ تُبنى في الواجهة فتتحسّن بلا مسِّ صفٍّ مجمَّد. */
export interface PayrollDiff {
  code: string;
  from?: string;
  to?: string;
  delta?: string;
  days?: string;
  amount?: string;
  ledger_days?: string | null;
  ranges?: Array<{ from: string; to: string }>;
}

export interface PayrollPayslip {
  run: PayrollRunHead | null;
  line: PayrollLineDetail;
  items: PayrollItem[];
  segments: PayrollSegment[];
  previous: {
    line_id: number;
    run_id: number;
    net_amount: string | null;
    earnings_amount: string | null;
    deductions_amount: string | null;
    wage_actual: string | null;
    paid_calendar_days: string | null;
  } | null;
  diff: PayrollDiff[];
}

export interface PayrollPayslipMeta {
  can_prepare: boolean;
  editable: boolean;
}

/** صفُّ المراجعة — الفرقُ **ومعه سببُه**، لا رقمٌ عارٍ. */
export interface PayrollDriftRow {
  line_id: number;
  profile_id: number;
  name: string;
  net_amount: string | null;
  previous_net_amount: string | null;
  delta: string;
  earnings_delta: string | null;
  deductions_delta: string | null;
  reasons: PayrollDiff[];
}

export interface PayrollDrift {
  previous_run: { id: number; run_number: string | null; period_start: string; net_amount: string | null } | null;
  compared: number;
  changed: number;
  rows: PayrollDriftRow[];
  joined: Array<{ line_id?: number; profile_id?: number; name: string; net_amount: string | null }>;
  left: Array<{ profile_id: number; name: string; previous_net_amount: string | null }>;
}

export interface PayrollDriftMeta {
  can_view_amounts: boolean;
  first_run?: boolean;
  withheld_reason?: string;
}

/** أثرُ القرار الجامع **بالريال قبل النقر** — لا عدُّ الوقائع وحدَه (D11). */
export interface ProposalDecisionPreview {
  count: number;
  action: 'accepted' | 'dismissed';
  money_effect: string;
  writes_money: boolean;
  by_type: Record<string, number>;
}

// ══════════════════════════════════════════════════════════════════════════
// S5 — القسيمةُ مستنداً: ما يراه صاحبُها في `/my-hr` وما يُطبَع على ورقته
//
// 🔴 هذه الحمولةُ يبنيها `PayslipComposer` على الخادم، **وهي نفسُها التي تُبنى منها
// الورقة**. فما يقرؤه الموظفُ على الشاشة هو حرفياً ما في ملفّه المطبوع — ولو بُني
// أحدُهما من حمولةٍ والآخرُ من أخرى لافترقا بأوّل تحسين، فيقرأ صاحبُ الأجر رقمين
// لشيءٍ واحد. ولذلك **لا تُشتقّ الجملُ هنا**: تصل مبنيّةً كما تُطبَع.
// ══════════════════════════════════════════════════════════════════════════

/** صفُّ سردِ قسائمي — الصافي معه لأن السؤال «كم أُودع في يوليو؟» لا «كم قسيمةً لي». */
export interface MyPayslipRow {
  line_id: number;
  payslip_number: string | null;
  period_start: string | null;
  period_end: string | null;
  pay_date: string | null;
  net_amount: string | null;
  payment_state: string;
  first_viewed_at: string | null;
}

/** بندُ قسيمةٍ كما يصل مبنيّاً — المعادلةُ مشقوقةً: لاتينيٌّ محضٌ ووحدةٌ عربية. */
export interface PayslipDocItem {
  id: number;
  code: string | null;
  name: string | null;
  kind: ItemKind;
  sign_mark: string;
  amount: string | null;
  raw_amount: string | null;
  accrual_period: string | null;
  /** 🩸 لاتينيٌّ محضٌ بناءً — وهو وحدَه ما يجوز أن يُوسَم `dir="ltr"`. */
  basis_math: string | null;
  basis_unit: string | null;
  basis_vessel_label: string | null;
  rule_title: string | null;
  article_ref: string | null;
  rule_version: string | null;
  source_label: string | null;
  counterparty_note: string | null;
  cap_note: string | null;
  decided_by: string | null;
  decision_reason: string | null;
  outstanding_after: string | null;
}

/** محطّةٌ في طريق «لماذا هذا الصافي» — أربعٌ بالترتيب، وكلُّ مبلغٍ عمودٌ مخزَّن. */
export interface PayslipPathStep {
  key: 'monthly_wage' | 'entitlement' | 'deductions' | 'net';
  label: string;
  amount: string | null;
  raw: string | null;
  note: string | null;
}

export interface PayslipDocument {
  document: {
    line_id: number;
    payslip_number: string | null;
    run_number: string | null;
    run_type_label: string | null;
    period_label: string | null;
    pay_date: string | null;
    pay_date_label: string | null;
    approved_at: string | null;
    posting_state: PostingState | null;
    self_approved: boolean;
    approver_was_subject: boolean;
    approver_name: string | null;
    payment_state: string;
    is_frozen: boolean;
  };
  employee: {
    name: string | null;
    number: string | null;
    job_title: string | null;
    department: string | null;
    hire_date: string | null;
    gosi_scheme_label: string | null;
    iban_last4: string | null;
    bank_name: string | null;
  };
  wage: {
    actual: string | null;
    basic: string | null;
    statutory_daily: string | null;
  };
  period: {
    calendar_days: number | null;
    paid_days: string | null;
    unpaid_days: string | null;
    ledger_days: string | null;
    basis_label: string | null;
    whole_period: boolean;
    paid_fraction: string | null;
    unpaid_fraction: string | null;
    /** 🔴 الكسرُ صريحاً بأمر المالك — «٢ من ٣٠» ليتحقّق منه إنسانٌ بالقسمة. */
    fraction_sentence: string | null;
    unpaid_ranges: Array<{ from: string; to: string; label: string | null }>;
  };
  earnings: PayslipDocItem[];
  deductions: PayslipDocItem[];
  employer_cost: PayslipDocItem[];
  totals: {
    earnings: string | null;
    deductions: string | null;
    gosi_employee: string | null;
    net: string | null;
    employer_cost: string | null;
    deferred: string | null;
  };
  path: PayslipPathStep[];
  segments: Array<{
    range_label: string | null;
    monthly: string | null;
    fraction: string | null;
    is_whole_period: boolean;
    amount: string | null;
  }>;
  notices: string[];
}

// ═══════════════════════════ S6 — الدفعُ والفشلُ والجرف (D17) ═══════════════════════════

/**
 * حالةُ تحويلِ **السطر** لا المسير (D17).
 *
 * بنكٌ يرفض ثلاثةَ تحويلاتٍ من ثمانية واقعةٌ يومية، ومسيرٌ بحالةٍ واحدةٍ يجعل الخمسةَ
 * الناجحةَ «غيرَ مدفوعة» أو الثلاثةَ الفاشلة «مدفوعة». و`failed` **يبقى مستحقّاً**.
 */
export type PaymentState = 'pending' | 'sent' | 'confirmed' | 'failed' | 'held';

/** صفٌّ في لوح الدفع — والآيبانُ يصل **مقنَّعاً من الخادم** لا من الواجهة. */
export interface PayrollPaymentLine {
  line_id: number;
  profile_id: number;
  name: string;
  payslip_number: string | null;
  net_amount: string | null;
  iban_masked: string | null;
  bank_name: string | null;
  payment_state: PaymentState;
  payment_failed_reason: string | null;
  payment_confirmed_at: string | null;
  /** رصيدُ سلسلة `payable` في الدفتر — يبقى موجباً حتى يُؤكَّد الصرف. */
  payable_balance: string;
  sweep_of_line_id: number | null;
  sweep_of_run_id: number | null;
}

/** رأسُ المسير في شاشة الدفع — مختصرٌ بما تحتاجه المرحلةُ السادسة وحدَها. */
export interface PayrollPaymentRunHead {
  id: number;
  run_number: string | null;
  run_type: RunType;
  stage: RunStage;
  pay_date: string;
  net_amount: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  posting_state: PostingState;
}

export interface PayrollPaymentBoard {
  run: PayrollPaymentRunHead;
  lines: PayrollPaymentLine[];
  counts: Record<PaymentState, number>;
  totals: { paid_amount: string; outstanding_amount: string } | null;
}

export interface PayrollPaymentMeta {
  can_view_amounts: boolean;
  withheld_reason?: string;
  /** 🔴 توأمان لا ينفصلان: الزرُّ يظهر معطَّلاً وتحته سببُه، لا مخفيّاً. */
  can_pay: boolean;
  payable?: boolean;
}

/** مَن لم يُرسَل تحويلُه ولماذا — **بأسمائهم** لا بعددهم. */
export interface PayrollPaymentSkip {
  line_id: number;
  name: string;
  reason: string;
}

export interface PayrollMarkSentResult {
  run: PayrollPaymentRunHead;
  sent: number;
  skipped: PayrollPaymentSkip[];
}

export interface PayrollConfirmResult {
  run: PayrollPaymentRunHead;
  confirmed: Array<{ line_id: number; name: string; net_amount: string }>;
  skipped: PayrollPaymentSkip[];
  total: string;
}

export interface PayrollSweepCarried {
  line_id: number;
  origin_line_id: number;
  name: string;
  net_amount: string;
  reason: string;
}

export interface PayrollSweepResult {
  run: PayrollPaymentRunHead;
  carried: PayrollSweepCarried[];
}

// ══════════════════════════════════════════════════════════════════════════
// S7 — السلفُ والجزاءاتُ وصندوقُ م.٧٣
//
// 🔴 المتبقّي من السلفة يصل **مشتقّاً من الدفتر** (`outstanding`) ولا عمودَ له في القاعدة.
// وما يُطبَع على قسيمةٍ مضت شيءٌ آخر: رقمٌ مجمَّدٌ في صفّها (`explain.outstanding_after`).
// الخلطُ بينهما يجعل المستندَ يتحوّر كلّما فُتح — وهو ما يمنعه D20.
// ══════════════════════════════════════════════════════════════════════════

export type AdvanceKind = 'salary_advance' | 'loan';

export type AdvanceStatus = 'pending' | 'active' | 'paused' | 'settled' | 'written_off' | 'cancelled';

export type PenaltyKind =
  | 'warning'
  | 'fine'
  | 'suspension_unpaid'
  | 'damage_recovery'
  | 'deferred_raise'
  | 'deferred_promotion';

export type PenaltyState =
  | 'draft'
  | 'notified'
  | 'final'
  | 'objected'
  | 'overturned'
  | 'charged'
  | 'refunded'
  | 'void';

/** صفحةٌ خفيفةٌ كما يردّها متحكّما S7 — بلا `from`/`to`. */
export interface PayrollSimplePage<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface AdvanceRow {
  id: number;
  advance_number: string;
  employee_profile_id: number;
  employee_name: string;
  kind: AdvanceKind;
  principal_amount: string;
  installments_count: number;
  installment_amount: string;
  first_installment_period: string;
  status: AdvanceStatus;
  paused_reason: string | null;
  granted_on: string;
  reason: string;
  /** 🔴 ذيلُ سلسلة `advance` في الدفتر — لا عمودَ رصيدٍ محفوظ. */
  outstanding: string;
  paid_so_far: string;
  installments_charged: number;
  next_installment: string;
  /** استُهلكت الأقساطُ المجدولةُ وبقي رصيد ⇒ سقفُ ١٠٪ مدّد الجدول. */
  schedule_extended: boolean;
}

export interface AdvanceListMeta {
  can_manage: boolean;
  article_ref: string;
  cap_note: string;
}

export interface AdvanceLedgerRow {
  id: number;
  entry_type: string;
  amount: string;
  balance_after: string;
  effective_date: string;
  description: string;
  run_id: number | null;
}

export interface AdvanceDetail {
  id: number;
  advance_number: string;
  status: AdvanceStatus;
  principal_amount: string;
  installment_amount: string;
  installments_count: number;
  installments_charged: number;
  paid_so_far: string;
  outstanding: string;
  next_installment: string;
  ledger: AdvanceLedgerRow[];
}

export interface AdvancePayload {
  employee_profile_id: number;
  kind?: AdvanceKind;
  principal_amount: string;
  granted_on: string;
  first_installment_period: string;
  installments_count: number;
  reason: string;
  disburse?: boolean;
  method?: 'bank' | 'cash';
}

export interface PenaltyRow {
  id: number;
  penalty_number: string;
  employee_profile_id: number;
  employee_name: string;
  kind: PenaltyKind;
  state: PenaltyState;
  offence_summary: string;
  offence_detected_on: string;
  /** 🔴 النظامُ يقيس بالأيام — والريالُ مشتقٌّ من أجر اليوم النظاميّ (م.٧٠/م.٢). */
  amount_days: string | null;
  amount_override: string | null;
  daily_wage: string | null;
  amount_preview: string | null;
  investigation_ref: string | null;
  notified_at: string | null;
  objection_deadline: string | null;
  objection_days_left: number | null;
  charged_run_id: number | null;
  refund_due_by: string | null;
  to_worker_fund: boolean;
}

export interface PenaltyListMeta {
  objection_days: number;
  detection_window_days: number;
  max_days_per_offence: number;
  article_refs: Record<string, string>;
}

export interface PenaltyPayload {
  employee_profile_id: number;
  kind: PenaltyKind;
  offence_summary: string;
  offence_detected_on: string;
  amount_days?: string;
  amount_override?: string;
  investigation_ref?: string;
}

/** سجلُّ الغرامات الذي **توجبه م.٧٣**: الاسمُ والأجرُ والمبلغُ والسببُ والتاريخ. */
export interface PenaltyFundRow {
  item_id: number;
  employee_name: string;
  wage_actual: string | null;
  amount: string;
  days: string | null;
  daily_wage: string | null;
  penalty_number: string | null;
  offence: string | null;
  state: PenaltyState | null;
  accrual_period: string;
  run_number: string | null;
  payslip_number: string | null;
  charged_at: string;
}

export interface PenaltyFundPayload {
  balance: string;
  register: PenaltyFundRow[];
}

export interface PenaltyFundMeta {
  article_ref: string;
  notice: string;
  account_hint: string;
}
