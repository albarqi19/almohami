// أنواع وحدة الموارد البشرية (المرحلة 1). تطابق استجابة الباك (snake_case).

export type SbaStatus =
  | 'pending'
  | 'verified_same_firm'
  | 'verified_other_firm'
  | 'expired'
  | 'not_found'
  | 'needs_national_id'
  | 'unavailable';

export type EmploymentType = 'full_time' | 'part_time' | 'contractor' | 'intern';
export type EmployeeStatus = 'active' | 'on_leave' | 'suspended' | 'terminated';

export interface EmployeeUserRef {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string;
  avatar?: string | null;
  is_active?: boolean;
  national_id?: string | null;
  created_at?: string;
}

export interface EmployeeCompensation {
  id?: number;
  basic_salary?: string | number | null;
  housing_allowance?: string | number | null;
  transport_allowance?: string | number | null;
  other_allowances?: string | number | null;
  total_salary?: string | number | null;
  currency?: string;
  pay_frequency?: string;
  iban?: string | null;
  bank_name?: string | null;
  account_holder_name?: string | null;
  gosi_number?: string | null;
  change_reason?: string | null;
  effective_from?: string | null;
}

export interface EmployeeDocument {
  id: number;
  doc_type: string;
  title: string;
  document_number?: string | null;
  issue_date_gregorian?: string | null;
  expiry_date_gregorian?: string | null;
  expiry_date_hijri_raw?: string | null;
  file_name?: string;
  is_sensitive?: boolean;
  is_current?: boolean;
  status?: string;
  created_at?: string;
}

export interface EmployeeProfile {
  id: number;
  tenant_id: number;
  user_id: number;
  employee_number?: string | null;
  job_title?: string | null;
  department?: string | null;
  employment_type?: EmploymentType | null;
  hire_date?: string | null;
  manager_id?: number | null;
  birth_date?: string | null;
  nationality?: string | null;
  national_id_expiry_gregorian?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  sba_verification_status: SbaStatus;
  sba_firm_id?: string | null;
  sba_license_number?: string | null;
  sba_license_expiry_raw?: string | null;
  sba_license_expiry_gregorian?: string | null;
  sba_last_checked_at?: string | null;
  status: EmployeeStatus;
  termination_date?: string | null;
  termination_reason?: string | null;
  annual_leave_entitlement?: number | null;
  annual_leave_balance?: string | number | null;
  /** الحضور: العَلَمُ افتراضُه `false` بلا استثناء، والمرساةُ تُكتب مرّةً ولا تُحرَّك. */
  attendance_tracked?: boolean;
  attendance_start_date?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  // علاقات (تُحمَّل حسب الصلاحية)
  user?: EmployeeUserRef;
  manager?: { id: number; name: string } | null;
  terminated_by?: { id: number; name: string } | null;
  current_compensation?: EmployeeCompensation | null;
  documents?: EmployeeDocument[];
}

export interface HrOfficeInfo {
  name?: string;
  email?: string | null;
  phone?: string | null;
  verified?: boolean;
  sba_license_number?: string | null;
  sba_license_status?: string | null;
  national_address?: string | null;
}

export interface HrStats {
  total: number;
  active: number;
  lawyers: number;
  verified: number;
  expiring_soon: number;
  office?: HrOfficeInfo | null;
}

export interface EmployeeFilters {
  search?: string;
  department?: string;
  status?: EmployeeStatus | '';
  employment_type?: EmploymentType | '';
  sba_status?: SbaStatus | '';
  page?: number;
  per_page?: number;
}

// تسميات عربية للعرض
export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: 'دوام كامل',
  part_time: 'دوام جزئي',
  contractor: 'متعاون',
  intern: 'متدرّب',
};

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: 'نشط',
  on_leave: 'في إجازة',
  suspended: 'موقوف',
  terminated: 'منتهٍ',
};

// ───────────── عقود العمل (A1) ─────────────

export type EmploymentContractType = 'permanent' | 'fixed_term' | 'part_time' | 'remote' | 'training';
export type EmploymentContractStatus = 'draft' | 'active' | 'expired' | 'terminated' | 'superseded';

export interface EmploymentContractAddendum {
  id: number;
  employment_contract_id: number;
  addendum_number: number;
  effective_date?: string | null;
  title?: string | null;
  change_summary?: string | null;
  content?: string | null;
  created_at?: string;
}

export interface EmploymentContract {
  id: number;
  employee_profile_id: number;
  contract_number?: string | null;
  contract_type: EmploymentContractType;
  start_date: string;
  end_date?: string | null;
  probation_end_date?: string | null;
  // لقطات الراتب — تظهر فقط لمن يملك hr.compensation.view (مخفية بالباك خلاف ذلك).
  basic_salary_snapshot?: string | number | null;
  total_salary_snapshot?: string | number | null;
  job_title_snapshot?: string | null;
  renewal_mode?: 'manual' | 'auto';
  auto_renew_notice_days?: number | null;
  status: EmploymentContractStatus;
  signed_at?: string | null;
  notes?: string | null;
  addendums_count?: number;
  addendums?: EmploymentContractAddendum[];
  created_at?: string;
}

export const CONTRACT_TYPE_LABELS: Record<EmploymentContractType, string> = {
  permanent: 'دائم',
  fixed_term: 'محدّد المدة',
  part_time: 'دوام جزئي',
  remote: 'عن بُعد',
  training: 'تدريب',
};

export const CONTRACT_STATUS_LABELS: Record<EmploymentContractStatus, string> = {
  draft: 'مسودّة',
  active: 'ساري',
  expired: 'منتهٍ',
  terminated: 'مفسوخ',
  superseded: 'مُستبدل',
};

// ───────────── مستندات الموظف (A2) ─────────────

export type EmployeeDocType = 'national_id' | 'iqama' | 'employment_contract' | 'qualification' | 'bar_license' | 'cv' | 'other';

export const DOC_TYPE_LABELS: Record<EmployeeDocType, string> = {
  national_id: 'الهوية الوطنية',
  iqama: 'الإقامة',
  employment_contract: 'عقد العمل',
  qualification: 'المؤهل العلمي',
  bar_license: 'رخصة المحاماة',
  cv: 'السيرة الذاتية',
  other: 'مستند آخر',
};

// ───────────── المباشرة/المغادرة (A3) ─────────────

export type ChecklistKind = 'onboarding' | 'offboarding';

export interface HrChecklistItem {
  id: number;
  employee_profile_id: number;
  kind: ChecklistKind;
  label: string;
  is_done: boolean;
  done_at?: string | null;
  done_by?: number | null;
  sort: number;
  meta?: Record<string, unknown> | null;
  created_at?: string;
}

export const CHECKLIST_KIND_LABELS: Record<ChecklistKind, string> = {
  onboarding: 'المباشرة (الالتحاق)',
  offboarding: 'المغادرة (إخلاء الطرف)',
};

// ───────────── التقويم الرسمي (B1) ─────────────

export type HolidayType = 'eid_fitr' | 'eid_adha' | 'national_day' | 'founding_day' | 'custom';
export type HolidayStatus = 'pending' | 'confirmed';

export interface HrHoliday {
  id: number;
  name: string;
  date_gregorian: string;
  date_hijri_raw?: string | null;
  type: HolidayType;
  is_recurring: boolean;
  source: 'generated' | 'manual';
  confirmation_status: HolidayStatus;
}

export const HOLIDAY_TYPE_LABELS: Record<HolidayType, string> = {
  eid_fitr: 'عيد الفطر',
  eid_adha: 'عيد الأضحى',
  national_day: 'اليوم الوطني',
  founding_day: 'يوم التأسيس',
  custom: 'مخصّصة',
};

// ───────────── الإجازات والغياب (B2) ─────────────
//
// كل ما تحت هذا الخط منسوخٌ حرفياً من عقد الباك؛ لا تخمين ولا اشتقاق في الفرونت:
//   · الرموز والحالات من ثوابت الموديلات (HrLeaveType / HrLeave / HrLeaveRule /
//     HrLeaveLedgerEntry) لا من نصوص عربية في JSX.
//   · أعمدة decimal:2 في الباك (duration_days · days · balance_after) تُسلسَل **نصّاً**
//     في JSON، فنوعُها هنا `string | number` بصدق — لا تُجمع بلا Number().
//   · حقول `date` على الموديل تخرج بصيغة ISO كاملة، وحقولُ المتحكّمات المشتقّة
//     (calendar/on-leave-now/…) تخرج `YYYY-MM-DD`. النوعُ `string` في الحالتين.

// ── الرموز والدلالات ──

/** الرموز النظامية الستةَ عشرَ. وما يضيفه المكتب رمزُه `custom_{n}` — ولذلك `code: string`. */
export type LeaveTypeCode =
  | 'annual'
  | 'sick'
  | 'unpaid'
  | 'unauthorized_absence'
  | 'marriage'
  | 'bereavement_direct'
  | 'bereavement_sibling'
  | 'paternity'
  | 'maternity'
  | 'maternity_extension_unpaid'
  | 'newborn_care'
  | 'newborn_care_extension_unpaid'
  | 'iddah'
  | 'iddah_non_muslim'
  | 'hajj'
  | 'exam';

/** `entitled` وحدها لها سلسلة قيود في الدفتر. */
export type LeaveCategory = 'entitled' | 'statutory' | 'unpaid' | 'absence';

export type LeaveEntitlementWindow = 'per_year' | 'per_window' | 'per_event' | 'per_lifetime' | 'none';

export type LeaveDurationBasis = 'working_days' | 'calendar_days';

/** مفاتيح اللون السبعة — يترجمها الستايل إلى `var(--hrl-k)`. لا hex في JSX ولا في CSS. */
export type LeaveColorKey = 'annual' | 'sick' | 'unpaid' | 'absence' | 'family' | 'maternity' | 'other';

/** يُخزَّن ويُعرض ولا يُفرض (لا عمود جنس على employee_profiles). */
export type LeaveGenderRestriction = 'male' | 'female';

/** آلة حالات مغلقة: pending → approved|rejected|cancelled · approved → cancelled|superseded. */
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'superseded';

export type LeaveSource = 'manager' | 'employee_request' | 'import';

/** `mixed` حين تعبر الواقعة شريحة أجر في `pay_breakdown`. */
export type PayTreatment = 'full' | 'three_quarters' | 'unpaid' | 'mixed';

export type HalfDayPeriod = 'morning' | 'evening';

export type LedgerEntryType = 'opening' | 'accrual' | 'consumption' | 'reversal' | 'adjustment' | 'settlement';

export type LeaveRuleCode =
  | 'ksa.labor.art109.annual'
  | 'ksa.labor.art117.sick'
  | 'ksa.labor.art113.marriage'
  | 'ksa.labor.art113.bereavement'
  | 'ksa.labor.art113.paternity'
  | 'ksa.labor.art151.maternity'
  | 'ksa.labor.art151.maternity_extension'
  | 'ksa.labor.art151.newborn_care'
  | 'ksa.labor.art151.newborn_care_extension'
  | 'ksa.labor.art160.iddah'
  | 'ksa.labor.art160.iddah_non_muslim'
  | 'ksa.labor.art114.hajj'
  | 'ksa.labor.art115.exam'
  | 'ksa.labor.art116.unpaid'
  | 'ksa.labor.art80.absence'
  | 'ksa.labor.art111.settlement';

export type LeaveRuleKind =
  | 'annual_entitlement'
  | 'tiered_paid'
  | 'fixed_cap'
  | 'calendar_cap'
  | 'contract_suspension'
  | 'absconding'
  | 'termination_settlement';

/** أساس «سنة العقد» في عدّادَي م.١١٦ وم.٨٠ — سلَّم ثلاثيّ يُعلَن للمستخدم. */
export type ContractYearBasis = 'hire_date' | 'accrual_anchor' | 'calendar_fallback';

// ── الحواجز والتحذيرات ──

/** حواجز `preview` التسعة — تُردّ داخل `data.blockers` بـ200، ومع 422 عند الكتابة. */
export type LeaveBlockerCode =
  | 'invalid_range'
  | 'overlap'
  | 'half_day_on_range'
  | 'half_day_not_allowed'
  | 'half_day_calendar_basis'
  | 'type_inactive'
  | 'after_termination'
  | 'sick_window_edge'
  | 'sick_window_backdated';

/** رموز إخفاق الكتابة التي يردّها المتحكّم في `code` أعلى الاستجابة (لا في `blockers`). */
export type LeaveWriteFailureCode =
  | 'terminal_status'
  | 'invalid_transition'
  | 'idempotency_mismatch'
  | 'profile_trashed'
  | 'type_not_entitled'
  | 'opening_exists'
  | 'anchor_locked'
  | 'anchor_backdated';

export type LeaveWarningCode =
  | 'no_working_days'
  | 'pending_holiday_in_range'
  | 'exceeds_max_days_per_event'
  | 'outside_claim_window'
  | 'min_service_not_met'
  | 'no_hire_date'
  | 'probation'
  | 'missing_attachment'
  | 'missing_event_date'
  | 'floor_applied'
  | 'art151_min_postnatal'
  | 'art117_cap_exceeded'
  | 'art116_threshold'
  | 'art80_threshold'
  | 'not_initialized'
  | 'accrual_drift'
  | 'chain_settled'
  | 'profile_autocreated';

/** `{code,message,data}` — الرسالة العربية من الخادم حرفياً، لا تُركَّب في JSX. */
export interface LeaveBlocker {
  code: LeaveBlockerCode | string;
  message: string;
  data: Record<string, unknown>;
}

/** نفس شكل الحاجز — يُعرض ولا يمنع. */
export interface LeaveWarning {
  code: LeaveWarningCode | string;
  message: string;
  data: Record<string, unknown>;
}

// ── الكتالوج ──

export interface HrLeaveType {
  id: number;
  /** رمز نظاميّ من `LeaveTypeCode` أو `custom_{n}` لأنواع المكتب. */
  code: string;
  name: string;
  category: LeaveCategory;
  entitlement_window: LeaveEntitlementWindow;
  duration_basis: LeaveDurationBasis;
  pay_ratio: number;
  default_entitlement_days: number | null;
  legal_reference: string | null;
  rule_code: LeaveRuleCode | null;
  color_key: LeaveColorKey;
  requires_attachment: boolean;
  requires_reason: boolean;
  requires_event_date: boolean;
  allows_half_day: boolean;
  max_days_per_event: number | null;
  claim_window_days: number | null;
  min_service_months: number | null;
  gender_restriction: LeaveGenderRestriction | null;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
}

/**
 * صفّ قاعدة نظامية سارية في تاريخٍ ما. **بلا `id`** — المتحكّم لا يُخرجه.
 * `payload` بنيةٌ حرّة يقرؤها الخادم بمسارٍ منقّط؛ الفرونت يعرض أرقامها كما وصلت.
 */
export interface HrLeaveRule {
  code: LeaveRuleCode;
  article_ref: string;
  title_ar: string;
  rule_kind: LeaveRuleKind;
  basis: LeaveDurationBasis;
  payload: Record<string, unknown>;
  effective_from: string | null;
  effective_to: string | null;
  source_note: string | null;
}

// ── الاحتساب والحصانة ──

/** تفصيل المدّة كما ترجعه `LeaveDurationService::compute` داخل المعاينة. */
export interface LeaveDurationBreakdown {
  duration_days: number;
  calendar_days: number;
  working_days: number;
  excluded_weekend_days: number;
  excluded_holiday_days: number;
  weekend_dates: string[];
  /** خريطة `تاريخ ⇒ اسم العطلة` — المستثنى يُسمّى بالاسم لا بالعدد. */
  holiday_dates: Record<string, string>;
  /** عطلٌ غير معتمَدة داخل المدى — **لم تُستثنَ** من الاحتساب. */
  pending_holiday_dates: Record<string, string>;
  weekend_days: string[];
  basis: LeaveDurationBasis;
  half_day_ignored: boolean;
}

/** مغلَّف `hr_leaves.computation_meta` — دليل الاحتساب يوم الاعتماد، يُلحَق ولا يُستبدَل. */
export interface LeaveComputationMeta {
  basis: LeaveDurationBasis;
  computed_at: string;
  weekend_days: string[];
  weekend_dates: string[];
  holiday_dates: Record<string, string>;
  pending_holiday_dates: Record<string, string>;
  calendar_days: number;
  working_days: number;
  duration_days: number;
  half_day_ignored: boolean;
  calc_version: string | number;
  recomputed: LeaveRecomputeLogEntry[];
}

export interface LeaveRecomputeLogEntry {
  at: string;
  delta_days: number;
  holiday_id: number | null;
  reason: string;
  actor_id: number;
  calendar_days: number;
  working_days: number;
  duration_days: number;
  weekend_dates: string[];
  holiday_dates: Record<string, string>;
  pending_holiday_dates: Record<string, string>;
  weekend_days: string[];
  calc_version: string | number;
}

/** لقطة القانون بنسخته يوم الواقعة — لا تُعاد كتابتها أبداً. */
export interface LeaveStatuteSnapshot {
  rule_id: number;
  code: LeaveRuleCode | string;
  article_ref: string;
  effective_from: string | null;
  resolved: Record<string, unknown>;
  floor_applied: boolean;
}

export interface LeavePaySlice {
  days: number;
  pay_ratio: number;
}

// ── الواقعة ──

export interface HrLeave {
  id: number;
  tenant_id?: number;
  employee_profile_id: number;
  leave_type_id: number;
  /** اللقطات الثلاث — حصانة الماضي على الصفّ نفسه؛ تُعرض بدل قراءة النوع الحيّ. */
  type_code_snapshot: string;
  type_name_snapshot: string;
  duration_basis_snapshot: LeaveDurationBasis;
  start_date: string;
  end_date: string;
  half_day: boolean;
  half_day_period?: HalfDayPeriod | null;
  event_date?: string | null;
  /** decimal:2 ⇒ نصّ في JSON. ما حُسب يوم الاعتماد، ولا يُعاد كتابته. */
  duration_days: string | number;
  calendar_days: number;
  excluded_weekend_days: number;
  excluded_holiday_days: number;
  pay_treatment: PayTreatment;
  pay_breakdown?: LeavePaySlice[] | null;
  sick_window_start?: string | null;
  status: LeaveStatus;
  source: LeaveSource;
  self_approved: boolean;
  reason?: string | null;
  employee_document_id?: number | null;
  approved_by?: number | null;
  approved_at?: string | null;
  rejected_by?: number | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  cancelled_by?: number | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  supersedes_leave_id?: number | null;
  idempotency_key?: string | null;
  legacy_admin_request_id?: number | null;
  notes?: string | null;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
  /** مغلّفا الحصانة — مخفيّان في القوائم، يُكشفان في مسار التفصيل/المعاينة. */
  computation_meta?: LeaveComputationMeta | null;
  statute_snapshot?: LeaveStatuteSnapshot | null;
  /** المخصوم الفعليّ من الدفتر — **لا** `duration_days`. يُلحقه المتحكّم لكل صفّ. */
  charged_days?: number;
  /** المُدفتَر: المخصوم؛ وغيرُ المُدفتَر: مدّته إن كانت معتمَدة وصفرٌ سواها. */
  effective_days?: number;
  /** المدّة لو حُسبت اليوم − المجمَّدة. لا يصل إلا بـ`drift=1` وبسقفٍ ٢٠٠ صفّ. */
  duration_drift?: number | null;
  // علاقات (snake_case بحكم Model::$snakeAttributes)
  employee_profile?: {
    id: number;
    user_id: number;
    department?: string | null;
    user?: { id: number; name: string } | null;
  } | null;
  leave_type?: Pick<
    HrLeaveType,
    'id' | 'code' | 'name' | 'category' | 'color_key' | 'legal_reference' | 'duration_basis' | 'allows_half_day'
  > | null;
}

// ── الدفتر ──

export interface LeaveLedgerEntry {
  id: number;
  tenant_id?: number;
  employee_profile_id: number;
  leave_type_id: number;
  entry_type: LedgerEntryType;
  /** decimal:2 ⇒ نصّ. موجبٌ للإضافة وسالبٌ للخصم — الإشارة جزءٌ من القيد. */
  days: string | number;
  effective_date: string;
  balance_after: string | number;
  leave_id?: number | null;
  reverses_entry_id?: number | null;
  idempotency_key?: string | null;
  /** الجملة العربية مخزَّنة يوم الكتابة — تُقرأ ولا تُركَّب في JSX. */
  description: string | null;
  meta?: Record<string, unknown> | null;
  created_by?: number | null;
  created_at?: string;
  /** يُلحقه المتحكّم للصفحة باستعلامٍ واحد — لا join في السرد. */
  created_by_name?: string | null;
}

/** ملخّص السلسلة بجانب السرد. `consumed` و`settlement` موجبان عرضاً. */
export interface LeaveLedgerSummary {
  opening: number;
  accrued: number;
  consumed: number;
  adjustments: number;
  reversals: number;
  settlement: number;
  current_balance: number;
}

// ── الرصيد ──

export interface SickTier {
  days: number;
  pay_ratio: number;
}

/** نافذة م.١١٧ في لقطة الرصيد — `null` حين لم تُفتح نافذةٌ مرضية. */
export interface SickWindow {
  anchor: string;
  ends_on: string;
  used: number;
  total: number;
  remaining_total: number;
  remaining_full: number;
  remaining_three_quarters: number;
  remaining_unpaid: number;
  /** أوزان الخانات تُقرأ من هنا لا من أرقامٍ في JSX. */
  tiers: SickTier[];
}

/** م.١١٦ — عدّادٌ يَصِف ولا يحكم. العتبة من الخادم لا من ثابتٍ في الواجهة. */
export interface Art116 {
  unpaid_days: number;
  threshold: number;
  excess: number;
  contract_year_start: string;
  contract_year_end: string;
  contract_year_basis: ContractYearBasis;
}

/** م.٨٠ — متفرّق ومتتالٍ بعتبتين من الخادم، و`note` يُعرض حرفياً. */
export interface Art80 {
  scattered_days: number;
  max_consecutive: number;
  thresholds: { scattered: number; consecutive: number };
  note: string;
  contract_year_start: string;
  contract_year_end: string;
  contract_year_basis: ContractYearBasis;
}

/** حدود معادلة الرصيد لنوعٍ مُدفتَر: افتتاحيّ + مستحقّ − مخصوم ± تسويات = المتاح. */
export interface LeaveBalanceTypeRow {
  leave_type_id: number;
  code: string;
  name: string;
  color_key: LeaveColorKey;
  balance: number;
  opening: number;
  accrued: number;
  /** موجبٌ عرضاً (الخادم يقلب إشارته). */
  consumed: number;
  adjustments: number;
  settlement: number;
  future_committed_days: number;
  has_opening: boolean;
  chain_settled: boolean;
  next_accrual_at: string | null;
  accrual_drift: number;
}

/** إجازات الوقائع (م.١١٣/١٥١/١٦٠/١١٤) — عدُّ وقائعَ لا سلسلةُ قيود. */
export interface LeavePerEventRow {
  leave_type_id: number;
  code: string;
  name: string;
  color_key: LeaveColorKey;
  legal_reference: string | null;
  window: LeaveEntitlementWindow;
  entitlement: number;
  used: number;
  remaining: number;
  events_count: number;
  last_used_at: string | null;
}

/**
 * لقطة الرصيد — مصدرها ذيل الدفتر. `annual_leave_balance` و`annual_leave_entitlement`
 * عمودان متقاعدان لا يُقرآن ولا يُذكران.
 */
export interface LeaveBalanceSnapshot {
  as_of: string;
  historical: boolean;
  /** «الرصيد بعد كلِّ ما سُجّل» — يأتي من الخادم، ولا يُكتب عنوانٌ بتاريخ اليوم فوق الرقم. */
  balance_label: string;
  is_initialized: boolean;
  accrual_anchor: string | null;
  hire_date: string | null;
  termination_date: string | null;
  chain_settled_at: string | null;
  future_committed_days: number;
  types: LeaveBalanceTypeRow[];
  sick_window: SickWindow | null;
  per_event: LeavePerEventRow[];
  art116: Art116;
  art80: Art80;
  warnings: LeaveWarning[];
}

/** صفّ من `snapshotMany` لصفحة القائمة — عدّاداته بنافذة ٣٦٥ يوماً موسومةً باسمها. */
export interface LeaveRosterBalance {
  employee_profile_id: number;
  user_id: number;
  status: EmployeeStatus;
  is_initialized: boolean;
  accrual_anchor: string | null;
  hire_date: string | null;
  termination_date: string | null;
  chain_settled: boolean;
  balance: number;
  types: Record<number, LeaveRosterTypeBalance>;
  counters: {
    window: 'trailing_365';
    unpaid_days: number;
    absence_days: number;
  };
}

export interface LeaveRosterTypeBalance {
  leave_type_id: number;
  balance: number;
  has_opening: boolean;
  chain_settled: boolean;
  used_days: number;
  used_count: number;
  last_used_at: string | null;
}

/**
 * صفّ العمود الأيمن: ملفُّ الموظف + رصيدُه إن وصل.
 * `leave_balance` **اختياريّ عمداً** — فشلُ دفعة الأرصدة يُسقط الرقم لا القائمة،
 * والصفّ يعرض الاسم بلا رقم (لا شرطةً تُقرأ رقماً).
 */
export interface LeaveRosterRow extends EmployeeProfile {
  leave_balance?: LeaveRosterBalance;
}

/**
 * عدّاداتُ شرائح العمود — **من الخادم على المكتب كلِّه** لا عدٌّ في المتصفّح على صفحةٍ واحدة.
 * والمفاتيحُ هي مفاتيحُ `filter` نفسُها في الطلب، فلا تُترجَم أسماءٌ بين الردّ وقارئه.
 */
export interface LeaveRosterCounts {
  all: number;
  on_leave: number;
  low: number;
  uninitialized: number;
}

/** شريحةُ العمود المطلوبة — نفسُ مفاتيح `LeaveRosterCounts` بالبناء. */
export type LeaveRosterFilter = keyof LeaveRosterCounts;

/** مرشِّحاتُ العمود: نطاقُ `EmployeeFilters` + الشريحةُ وعتبتُها. */
export interface LeaveRosterFilters extends Omit<EmployeeFilters, 'employment_type' | 'sba_status'> {
  filter?: LeaveRosterFilter;
  /** عتبةُ «رصيدٌ منخفض» — قرارُ عرضٍ تُرسله الشاشةُ ويعيده الردُّ صريحاً. */
  low_threshold?: number;
}

// ── المعاينة ──

/** نافذة م.١١٧ داخل المعاينة — شكلٌ آخرُ غير `SickWindow` (لا تخلطهما). */
export interface LeavePreviewSickWindow {
  anchor: string;
  ends_on: string;
  used: number;
  is_new: boolean;
  /** تاريخ ذكرى بدء النافذة إن عبره المدى — وإلا `null`. */
  crosses_edge: string | null;
  split_proposal: Array<{ start: string; end: string }>;
  tiers: SickTier[];
  backdated_leave_id: number | null;
  backdated_anchor: string | null;
}

/** عدّادا المعاينة — نفس اشتقاق لوح الرصيد بعقدٍ أضيق (`contract_year_end` مُسقَط). */
export interface LeavePreviewCounters {
  art116: Omit<Art116, 'contract_year_end'>;
  art80: Omit<Art80, 'contract_year_end'>;
}

/**
 * مُخرَج `POST /hr/leaves/preview` — يُردّ في `data` **بـ200 حتى مع الحواجز**،
 * والحواجز داخل `data.blockers`. لا تُقرأ حالةُ HTTP دليلاً على الصلاحية.
 */
export interface LeavePreview {
  employee: {
    profile_id: number;
    user_id: number;
    name: string;
    is_initialized: boolean | null;
    has_anchor: boolean | null;
    hire_date: string | null;
    termination_date: string | null;
    chain_settled: boolean | null;
  };
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
    breakdown: LeavePaySlice[];
  };
  sick_window: LeavePreviewSickWindow | null;
  statute: LeaveStatuteSnapshot | null;
  counters: LeavePreviewCounters;
  computation_meta: LeaveComputationMeta;
  blockers: LeaveBlocker[];
  warnings: LeaveWarning[];
}

// ── مُخرَجات الكتابة ──

export interface LeaveBalanceDelta {
  before: number | null;
  after: number | null;
}

/** استجابة التسجيل — **الواقعة في `data.leave` لا في `data` نفسها**. */
export interface LeaveRecordResult {
  leave: HrLeave;
  computation: LeaveComputationMeta | null;
  balance: LeaveBalanceDelta;
  status: LeaveStatus;
  self_approved: boolean;
  ledger_entry_id: number | null;
  warnings: LeaveWarning[];
  /** مسار `for-user` وحده. */
  profile_created?: boolean;
  employee_profile_id?: number;
}

export interface LeaveApproveResult {
  leave: HrLeave;
  ledger_entry_id: number | null;
  balance: LeaveBalanceDelta;
}

export interface LeaveCancelResult {
  leave: HrLeave;
  reversal_entry_id: number | null;
  days_restored: number;
  balance: LeaveBalanceDelta;
}

/** «عاد مبكّراً» = إخلافٌ لا تعديلٌ في المكان: الأصل `superseded` وصفٌّ جديد خَلَفُه. */
export interface LeaveShortenResult {
  leave: HrLeave;
  superseded_id: number;
  entries: LeaveLedgerEntry[];
  balance: LeaveBalanceDelta;
}

export interface LeaveRecomputeResult {
  delta_days: number;
  adjustment_entry_id: number | null;
  before: number | null;
  after: number | null;
  balance: LeaveBalanceDelta;
}

export interface LeaveBulkRecomputeResult {
  examined: number;
  adjusted: number;
  unchanged: number;
  skipped_settled: number;
  failed: Array<{ leave_id: number; code: string; message: string }>;
  has_more: boolean;
  next_from_id: number | null;
}

export interface LeaveOpeningResult {
  entry_id: number;
  balance_after: number;
  is_initialized: true;
  accrual_anchor: string | null;
}

export interface LeaveBulkOpeningResult {
  created: number;
  skipped: number;
  failed: Array<{ employee_profile_id: number; code: string; message: string }>;
}

// ── حقائق الترويسة والتقويم ──

export interface LeaveStats {
  year: number;
  on_leave_today: number;
  ongoing: number;
  pending_count: number;
  consumed_this_month: number;
  unpaid_this_year: number;
  unconfirmed_holidays: number;
  uninitialized_balances: number;
  /** أيام نهاية الأسبوع للمكتب. إن غابت لا تُفترض «الجمعة والسبت» ولا تُظلَّل أعمدة. */
  weekend_days: string[];
}

export interface OnLeaveNowRow {
  leave_id: number;
  employee_profile_id: number;
  user_id: number;
  user_name: string;
  department: string | null;
  type_code: string;
  type_name: string;
  color_key: LeaveColorKey;
  start_date: string;
  end_date: string;
  returns_on: string;
  half_day: boolean;
}

export interface LeaveCalendarCell {
  date: string;
  leave_id: number;
  status: LeaveStatus;
  type_code: string;
  type_name: string;
  color_key: LeaveColorKey;
  half_day: boolean;
  half_day_period: HalfDayPeriod | null;
}

export interface LeaveCalendarRow {
  employee_profile_id: number;
  user_id: number;
  user_name: string;
  cells: LeaveCalendarCell[];
}

export interface LeaveCalendarHoliday {
  id: number;
  date: string;
  name: string;
  confirmation_status: HolidayStatus;
}

export interface LeaveCalendarPayload {
  month: string;
  from: string;
  to: string;
  weekend_days: string[];
  holidays: LeaveCalendarHoliday[];
  unconfirmed_holidays: number;
  rows: LeaveCalendarRow[];
}

// ── سياق التعارض (مفاتيحه مطابقة لـ AdminRequestController::context) ──

export interface LeaveConflictSession {
  id: number;
  case_id: number | null;
  session_type?: string | null;
  session_date?: string | null;
  session_date_gregorian?: string | null;
  session_time?: string | null;
  court?: string | null;
  status?: string | null;
  case?: { id: number; title?: string | null; file_number?: string | null } | null;
}

export interface LeaveConflictTask {
  id: number;
  title: string;
  due_date: string | null;
  status: string;
  case_id: number | null;
  priority?: string | null;
}

export interface LeaveOverlappingRow {
  id: number;
  employee_name: string | null;
  type_name: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  status_arabic: string;
  source: 'hr_leave' | 'admin_request';
}

export interface LeaveConflictContext {
  request_window: { start_date: string; end_date: string; duration_days: number };
  employee: { id: number; name: string | null; role: string | null };
  previous_leaves: {
    same_type_count: number;
    same_type_days: number;
    this_year_count: number;
    this_year_days: number;
    /** عددٌ صحيح لا bool. */
    all_approved: number;
    recent_same_type: Array<{ id: number; start_date: string | null; end_date: string | null; reason: string | null }>;
  };
  pending_tasks: LeaveConflictTask[];
  scheduled_sessions: LeaveConflictSession[];
  overlapping_leaves: LeaveOverlappingRow[];
  has_conflicts: boolean;
}

// ── التعايش مع «الطلبات الإدارية» (قراءة فقط) ──

export type LegacyRequestStatus = 'pending' | 'approved' | 'rejected';

export interface LegacyLeaveRow {
  id: number;
  /** اسم النوع كما ورد — لا يُستنتَج منه صنفٌ ولا أيقونة. */
  type_name: string | null;
  start_date: string | null;
  end_date: string | null;
  status: LegacyRequestStatus | string;
  status_arabic: string;
  /** تقويميّة — بلا استثناء عطلٍ ولا نهاية أسبوع. */
  calendar_duration_days: number | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  source: 'admin_request';
  counted_in_balance: false;

  // ── حالةُ التحويل (D-LGC) — يَسِمها الخادم باستعلامٍ واحدٍ للصفحة كلِّها ──
  /** معرّفُ الإجازة التي نتجت عن تحويله، أو `null` إن لم يُحوَّل بعد. */
  converted_leave_id: number | null;
  is_converted: boolean;
  /** معتمَدٌ وغيرُ محوَّل — وما عداه يُعرَض بسبب المنع لا بزرٍّ مطفأ بلا تفسير. */
  convertible: boolean;
  not_convertible_reason: string | null;
}

/** أساسُ الرصيد الافتتاحيّ — يُخزَّن مع قيده لا في إعدادٍ عامّ يقلب معناه لاحقاً. */
export type OpeningBasis = 'full_entitlement' | 'remaining_today';

export const OPENING_BASIS_LABELS: Record<OpeningBasis, string> = {
  full_entitlement: 'الاستحقاق الكامل — والإجازاتُ السابقةُ تُخصم منه',
  remaining_today: 'المتبقّي اليوم — والسابقةُ تُسجَّل ولا تُخصم',
};

/** ما سجّله قيدُ الافتتاح. `recorded=false` ⇒ قيدٌ كُتب قبل وجود الاختيار، والقراءةُ مستنتَجة. */
export interface OpeningBasisFacts {
  initialized: boolean;
  basis: OpeningBasis;
  recorded: boolean;
  opening_days: number | null;
  opening_date: string | null;
  entry_id: number | null;
  balance: number;
}

/**
 * صفٌّ من إخبار شاشة التهيئة — الجملةُ جاهزةٌ من الخادم فلا تُصاغ مرّتين.
 *
 * 🔴 **بلا `projected_balance` وبلا `negative` وبلا `total_days`**: كلُّها كانت تفترض أنّ كلَّ
 * طلبٍ إداريٍّ سابقٍ إجازةٌ ستُحوَّل وتُخصم — وبينها في البيانات الحقيقية «عمل عن بُعد».
 * التحويلُ قرارُ إنسانٍ لكلّ طلب، والخصمُ يقع هناك؛ فهذا عدّادٌ ووقائع لا حساب.
 */
export interface OpeningPreviewRow {
  employee_profile_id: number;
  basis: OpeningBasis;
  days: number;
  legacy: {
    count: number;
    rows: Array<{
      admin_request_id: number;
      type_name: string | null;
      start_date: string;
      end_date: string;
      reason: string | null;
    }>;
  };
  /** هل يخصم التحويلُ **حين يقع** — لا كم سيبقى بعده. */
  will_deduct: boolean;
  sentence: string;
}

/** معاينةُ تحويلِ طلبٍ بعينه — نفسُ أرقام الحفظ حرفياً (دماغُ التحقّق واحد). */
export interface LegacyConvertPreview {
  admin_request: {
    id: number;
    type_name: string | null;
    status: LegacyRequestStatus | string;
    status_arabic: string;
    start_date: string;
    end_date: string;
    reason: string | null;
    reviewed_by_name: string | null;
    reviewed_at: string | null;
  };
  leave_type: { id: number; name: string; duration_basis: LeaveDurationBasis; has_ledger_chain: boolean };
  duration: LeaveDurationBreakdown;
  duration_days: number;
  opening: OpeningBasisFacts;
  will_deduct: boolean;
  balance: { before: number; after: number };
  negative: boolean;
  converted_leave_id: number | null;
  /** «سيُخصم ٥ أيامٍ من رصيد منصور (١٦ ⇐ ١١)» أو «سيُسجَّل بلا خصم …» — نصُّ الزرّ. */
  effect_sentence: string;
  blockers: LeaveBlocker[];
  warnings: LeaveWarning[];
}

export interface LegacyConvertResult {
  leave: HrLeave;
  balance: { before: number | null; after: number | null };
  will_deduct: boolean;
  opening_basis: OpeningBasis;
  opening_basis_recorded: boolean;
  ledger_entry_id: number | null;
  admin_request_id: number;
}

export interface LegacyLeaveSummary {
  approved_count: number;
  pending_count: number;
  total_calendar_days: number;
  first_date: string | null;
  last_date: string | null;
  note: string;
}

// ── رصيد المستخدم لنفسه ──

export interface MyLeaveSummary {
  employee_profile_id: number;
  is_initialized: boolean;
  balance_label: string;
  future_committed_days: number;
  types: Array<{ code: string; name: string; color_key: LeaveColorKey; balance: number }>;
  sick: { remaining_full: number; window_ends_on: string } | null;
  upcoming: HrLeave[];
  recent_entries: LeaveLedgerEntry[];
}

// ── المرشِّحات ──

export interface LeaveListFilters {
  from?: string;
  to?: string;
  status?: LeaveStatus | '';
  category?: LeaveCategory | '';
  leave_type_id?: number;
  employee_profile_id?: number;
  source?: LeaveSource | '';
  department?: string;
  /** إعادة حساب المدّة لكل صفّ — بطلبٍ صريحٍ وحده. */
  drift?: boolean;
  page?: number;
  per_page?: number;
}

export interface LeaveLedgerFilters {
  leave_type_id?: number;
  entry_type?: LedgerEntryType | '';
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}

export interface LegacyLeaveFilters {
  status?: LegacyRequestStatus | '';
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}

/** حمولة التسجيل. `client_key` إلزاميّ (≤٣٢) — الخادم يشتقّ منه المفتاح المخزَّن بالموظف. */
export interface LeaveRecordPayload {
  client_key: string;
  leave_type_id: number;
  start_date: string;
  end_date: string;
  half_day?: boolean;
  half_day_period?: HalfDayPeriod;
  event_date?: string;
  reason?: string;
  notes?: string;
  employee_document_id?: number;
}

/** حمولة المعاينة — بلا `client_key`، وتقبل استثناء صفٍّ قائم عند التصحيح. */
export interface LeavePreviewPayload {
  employee_profile_id: number;
  leave_type_id: number;
  start_date: string;
  end_date: string;
  half_day?: boolean;
  half_day_period?: HalfDayPeriod;
  event_date?: string;
  employee_document_id?: number;
  exclude_leave_id?: number;
  split_on_window_edge?: boolean;
  reanchor_sick_window?: boolean;
}

// ── التسميات العربية (خريطة واحدة لكلّ اتحاد — لا نصوص مبعثرة في JSX) ──

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: 'قيد الاعتماد',
  approved: 'معتمَدة',
  rejected: 'مرفوضة',
  cancelled: 'ملغاة',
  superseded: 'مُخلَفة',
};

export const LEAVE_SOURCE_LABELS: Record<LeaveSource, string> = {
  manager: 'تسجيل المدير',
  employee_request: 'طلب الموظف',
  import: 'استيراد',
};

export const LEAVE_CATEGORY_LABELS: Record<LeaveCategory, string> = {
  entitled: 'مستحقّة برصيد',
  statutory: 'نظامية',
  unpaid: 'بلا أجر',
  absence: 'غياب',
};

export const PAY_TREATMENT_LABELS: Record<PayTreatment, string> = {
  full: 'بأجر كامل',
  three_quarters: 'بثلاثة أرباع الأجر',
  unpaid: 'بلا أجر',
  mixed: 'شرائح أجر',
};

export const HALF_DAY_PERIOD_LABELS: Record<HalfDayPeriod, string> = {
  morning: 'صباحاً',
  evening: 'مساءً',
};

export const LEAVE_DURATION_BASIS_LABELS: Record<LeaveDurationBasis, string> = {
  working_days: 'أيام عمل',
  calendar_days: 'أيام تقويمية',
};

export const LEAVE_ENTITLEMENT_WINDOW_LABELS: Record<LeaveEntitlementWindow, string> = {
  per_year: 'سنوياً',
  per_window: 'لكل نافذة',
  per_event: 'لكل واقعة',
  per_lifetime: 'مرّة في العمر',
  none: 'بلا استحقاق',
};

export const LEDGER_ENTRY_TYPE_LABELS: Record<LedgerEntryType, string> = {
  opening: 'رصيد افتتاحيّ',
  accrual: 'استحقاق',
  consumption: 'استهلاك',
  reversal: 'قيد عاكس',
  adjustment: 'تسوية',
  settlement: 'تصفية',
};

/** تسميات احتياطية للرموز النظامية — والمعروضُ أوّلاً `name`/`type_name_snapshot` من الخادم. */
export const LEAVE_TYPE_CODE_LABELS: Record<LeaveTypeCode, string> = {
  annual: 'إجازة سنوية',
  sick: 'إجازة مرضية',
  unpaid: 'إجازة بلا أجر',
  unauthorized_absence: 'انقطاع عن العمل',
  marriage: 'إجازة زواج',
  bereavement_direct: 'إجازة وفاة',
  bereavement_sibling: 'إجازة وفاة أخ أو أخت',
  paternity: 'إجازة أبوّة',
  maternity: 'إجازة وضع',
  maternity_extension_unpaid: 'تمديد إجازة الوضع (شهر بلا أجر)',
  newborn_care: 'رعاية المولود المريض أو ذي الاحتياجات الخاصة',
  newborn_care_extension_unpaid: 'تمديد رعاية المولود (شهر بلا أجر)',
  iddah: 'إجازة عدّة',
  iddah_non_muslim: 'وفاة الزوج (عاملة غير مسلمة)',
  hajj: 'إجازة حج',
  exam: 'إجازة اختبارات',
};

export const CONTRACT_YEAR_BASIS_LABELS: Record<ContractYearBasis, string> = {
  hire_date: 'من تاريخ التعيين',
  accrual_anchor: 'من مرساة الاستحقاق',
  calendar_fallback: 'سنة ميلادية',
};

export const LEGACY_REQUEST_STATUS_LABELS: Record<LegacyRequestStatus, string> = {
  pending: 'قيد الانتظار',
  approved: 'مقبول',
  rejected: 'مرفوض',
};

// ───────────── خطابات الموارد البشرية (C) ─────────────
//
// الأنواعُ الأربعة نسخةٌ حرفيةٌ من `HrLetter::TYPES` (`app/Models/HrLetter.php:24-28`).
// وكلُّ نصٍّ عربيٍّ لنوعٍ أو حالةٍ يعيش هنا وحدَه — **صفرُ نصٍّ داخل JSX** (عرفُ §٦
// الملزم، وخطأُ `HrModule` رقم ٣ حيث كُتب «قيد الانتظار» و«انتظار» لحالةٍ واحدة).

export type HrLetterType = 'salary_certificate' | 'employment_certificate' | 'experience_certificate' | 'clearance';

export const HR_LETTER_TYPE_LABELS: Record<HrLetterType, string> = {
  salary_certificate: 'تعريف بالعمل والراتب',
  employment_certificate: 'تعريف بالعمل',
  experience_certificate: 'شهادة خبرة',
  clearance: 'إخلاء طرف',
};

/** سطرُ الشرط تحت اسم النوع في المنتقي — يُعرض دائماً، لا عند المنع فقط. */
export const HR_LETTER_TYPE_HINTS: Record<HrLetterType, string> = {
  salary_certificate: 'يذكر الأجر وتفصيلَ بدلاته — يلزمه سجلُّ تعويضٍ حاليّ',
  employment_certificate: 'يذكر المسمّى وتاريخ المباشرة — بلا أيّ رقمٍ ماليّ',
  experience_certificate: 'مدّةُ الخدمة كاملةً — بعد انتهاء الخدمة',
  clearance: 'إخلاءُ العهدة — بعد انتهاء الخدمة وبإقرارِ المُصدِر',
};

/**
 * صفُّ الخطاب كما يصل من الخادم — **بلا أيّ حقلِ أجر**: لقطاتُ الراتب مخفيّةٌ افتراضياً
 * في الموديل (`HrLetter::$hidden`) وتُكشَف بـ`makeVisible` لمن يملك `hr.compensation.view`
 * وحدَه، ولا سطحَ في الواجهة يعرضها — الأرقامُ في الورقة لا في الجدول.
 */
export interface HrLetter { id: number; letter_number: string; letter_type: HrLetterType;
  recipient_name: string | null; purpose: string | null; employee_name_snapshot: string;
  job_title_snapshot: string | null; hire_date_snapshot: string | null;
  termination_date_snapshot: string | null; include_salary: boolean;
  dues_settled_confirmed: boolean; issued_by_self: boolean; issued_at: string;
  issuer?: { id: number; name: string } | null; }

/** حمولةُ الإصدار — `dues_settled_confirmed` إلزاميّ لإخلاء الطرف وحدَه (إقرارٌ بشريّ). */
export interface IssueLetterPayload { letter_type: HrLetterType; recipient_name?: string;
  purpose?: string; extra_paragraph?: string; notes?: string; dues_settled_confirmed?: boolean; }

// ───────────── الحضور والانصراف (C) ─────────────
//
// كلُّ اتحادٍ أدناه نسخةٌ حرفيةٌ من ثوابت الموديلات (`HrAttendanceDay::STATUSES` ·
// `HrAttendancePunch::SOURCES` · `HrAttendanceClaim::KINDS` · `HrAttendanceResolution::DECISIONS`
// · `AttendanceDayResolver::SIGNALS` · `AttendanceSuggestionBuilder::KINDS`)، ومعه خريطةُ
// `Record<T,string>` عربيةٌ **مصدَّرة** — صفرُ نصٍّ عربيٍّ داخل JSX (عرفُ §٦ الملزم).
//
// 🚫 **ولا قيمةَ اسمُها «غياب» في مخرَج المحرّك**: `no_record` واقعةٌ تقنيةٌ لا تهمة، و
// `absence_recorded` وصفٌ ليومٍ سُجِّل غيابُه في `hr_leaves` بفعلِ إنسانٍ مسمّى — الغيابُ
// يعيش في وحدة الإجازات وحدَها ويلتقطه عدّادُ م.٨٠ هناك.

export type AttendanceStatus =
  | 'not_tracked'
  | 'weekend'
  | 'holiday'
  | 'on_leave'
  | 'absence_recorded'
  | 'offsite'
  | 'present'
  | 'incomplete'
  | 'field_work_suspected'
  | 'no_record';

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  not_tracked: 'غيرُ مُتتبَّع',
  weekend: 'نهايةُ أسبوع',
  holiday: 'عطلةٌ رسمية',
  on_leave: 'في إجازة',
  absence_recorded: 'غيابٌ مسجَّل',
  offsite: 'عن بُعد أو ميدانيّ',
  present: 'حاضر',
  incomplete: 'بصمةٌ ناقصة',
  field_work_suspected: 'يُرجَّح عملٌ ميدانيّ',
  no_record: 'بلا سجلّ',
};

/** سطرٌ يشرح الحالةَ حين تُعرض وحدَها — يمنع قراءةَ «بلا سجلّ» تهمةً. */
export const ATTENDANCE_STATUS_HINTS: Record<AttendanceStatus, string> = {
  not_tracked: 'الحضورُ غيرُ مُفعَّلٍ على هذا الملفّ في هذا اليوم.',
  weekend: 'يومُ راحةٍ في جدول الدوام المُسنَد.',
  holiday: 'عطلةٌ معتمَدةٌ في التقويم الرسميّ للمكتب.',
  on_leave: 'يغطّيه سجلُّ إجازةٍ في «الإجازات والغياب».',
  absence_recorded: 'سُجِّل غيابُه في دفتر الإجازات بفعلِ إنسانٍ مسمّى.',
  offsite: 'يغطّيه ادّعاءٌ معتمَدٌ أو نمطُ يومٍ عن بُعد.',
  present: 'دخولٌ وخروجٌ مكتملان.',
  incomplete: 'طرفٌ واحدٌ من اليوم مُسجَّل — والناقصُ ليس غياباً.',
  field_work_suspected: 'له جلسةٌ أو ارتباطٌ خارجيٌّ في هذا اليوم بلا بصمة.',
  no_record: 'لم تصل بصمةٌ ولم يُوجد ما يغطّيه — واقعةٌ تقنيةٌ تنتظر تفسيراً.',
};

/** نطاقُ حكم القرار البشريّ — نسخةُ `HrAttendanceDay::AMBIGUOUS_STATUSES`. */
export const ATTENDANCE_AMBIGUOUS_STATUSES: AttendanceStatus[] = [
  'no_record',
  'incomplete',
  'field_work_suspected',
];

export type AttendanceRuleHit =
  | 'schedule'
  | 'weekend'
  | 'holiday'
  | 'leave'
  | 'legacy_request'
  | 'claim'
  | 'pattern'
  | 'punches'
  | 'session'
  | 'none';

/** أيُّ درجةٍ في السلّم حسمت اليوم — تُقرأ «حسمه: …». */
export const ATTENDANCE_RULE_LABELS: Record<AttendanceRuleHit, string> = {
  schedule: 'الجدولُ المُسنَد',
  weekend: 'نهايةُ الأسبوع',
  holiday: 'التقويمُ الرسميّ',
  leave: 'سجلُّ إجازة',
  legacy_request: 'طلبٌ إداريٌّ معتمَد',
  claim: 'ادّعاءٌ معتمَد',
  pattern: 'نمطُ اليوم في الجدول',
  punches: 'البصمات',
  session: 'جلسةٌ مجدولة',
  none: 'لا دليل',
};

export type AttendanceFlag =
  | 'resolution_conflict'
  | 'half_day_leave'
  | 'pending_holiday_in_range'
  | 'crosses_cutoff'
  | 'duplicate_direction'
  | 'impossible_pairing'
  | 'over_12h'
  | 'over_10h'
  | 'suspect_punch';

export const ATTENDANCE_FLAG_LABELS: Record<AttendanceFlag, string> = {
  resolution_conflict: 'قرارٌ بشريٌّ على يومٍ لم يعد ملتبساً',
  half_day_leave: 'نصفُ يومِ إجازة',
  pending_holiday_in_range: 'عطلةٌ غيرُ معتمَدةٍ في المدى',
  crosses_cutoff: 'يعبر ساعةَ فصل اليوم',
  duplicate_direction: 'بصمتان بالاتجاه نفسِه',
  impossible_pairing: 'خروجٌ قبل دخول',
  over_12h: 'حضورٌ يتجاوز ١٢ ساعة',
  over_10h: 'حضورٌ يتجاوز ١٠ ساعات',
  suspect_punch: 'بصمةٌ موسومةٌ للمراجعة',
};

/** الأدلّةُ التي رآها المحرّك — الفائزُ في `rule` والباقي في `skipped`. */
export type AttendanceSignal =
  | 'leave'
  | 'legacy_request'
  | 'claim'
  | 'pattern'
  | 'punches'
  | 'sessions'
  | 'pending_holiday';

export const ATTENDANCE_SIGNAL_LABELS: Record<AttendanceSignal, string> = {
  leave: 'سجلُّ إجازة',
  legacy_request: 'طلبٌ إداريٌّ معتمَد',
  claim: 'ادّعاءٌ معتمَد',
  pattern: 'نمطُ يومٍ في الجدول',
  punches: 'بصمات',
  sessions: 'جلسةٌ مجدولة',
  pending_holiday: 'عطلةٌ غيرُ معتمَدة',
};

export type PunchDirection = 'in' | 'out';

export const PUNCH_DIRECTION_LABELS: Record<PunchDirection, string> = {
  in: 'دخول',
  out: 'خروج',
};

export type PunchSource = 'web' | 'mobile' | 'qr' | 'wifi' | 'device' | 'import' | 'manual';

export const ATTENDANCE_SOURCE_LABELS: Record<PunchSource, string> = {
  web: 'من المتصفّح',
  mobile: 'من التطبيق',
  qr: 'رمز QR',
  wifi: 'شبكةُ المكتب',
  device: 'جهازُ بصمة',
  import: 'استيراد',
  manual: 'إدخالٌ يدويّ',
};

export type PunchTrust = 'verified' | 'attested' | 'asserted' | 'disputed';

export const ATTENDANCE_TRUST_LABELS: Record<PunchTrust, string> = {
  verified: 'موثَّقة',
  attested: 'بشهادةِ مسؤول',
  asserted: 'بإقرارِ الموظف',
  disputed: 'محلُّ نزاع',
};

export type PunchSuspectReason =
  | 'mock'
  | 'low_accuracy'
  | 'impossible_travel'
  | 'shared_device'
  | 'clock_skew'
  | 'stale_qr';

export const PUNCH_SUSPECT_LABELS: Record<PunchSuspectReason, string> = {
  mock: 'موقعٌ مُصطنَع',
  low_accuracy: 'دقّةٌ رديئة',
  impossible_travel: 'انتقالٌ مستحيل',
  shared_device: 'جهازٌ مشترَك',
  clock_skew: 'انحرافُ ساعةِ الجهاز',
  stale_qr: 'رمزٌ منتهٍ',
};

export type ClaimKind = 'remote' | 'field_work' | 'mission' | 'training' | 'missing_punch';

export const CLAIM_KIND_LABELS: Record<ClaimKind, string> = {
  remote: 'عملٌ عن بُعد',
  field_work: 'عملٌ ميدانيّ',
  mission: 'مأمورية',
  training: 'تدريب',
  missing_punch: 'بصمةٌ منسيّة',
};

/** سطرُ الشرط تحت اسم النوع في المنتقي — يُعرض دائماً لا عند المنع فقط. */
export const CLAIM_KIND_HINTS: Record<ClaimKind, string> = {
  remote: 'يومُ عملٍ من خارج المكتب باتفاق',
  field_work: 'محكمةٌ أو جهةٌ أو زيارةُ عميل',
  mission: 'انتدابٌ أو سفرُ عمل',
  training: 'دورةٌ أو ورشةٌ باعتماد المكتب',
  missing_punch: 'حضرَ ونسي تسجيلَ الدخول أو الخروج',
};

export type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  pending: 'قيد الاعتماد',
  approved: 'معتمَد',
  rejected: 'مرفوض',
  cancelled: 'مسحوب',
};

export type ClaimLinkType = 'case_session' | 'task' | 'meeting';

export const CLAIM_LINK_TYPE_LABELS: Record<ClaimLinkType, string> = {
  case_session: 'جلسة',
  task: 'مهمّة',
  meeting: 'اجتماع',
};

/**
 * ثلاثُ قيمٍ لا رابع. 🚫 **ولا قيمةَ اسمُها غياب**: قيمةٌ كهذه تفتح دفترَ غيابٍ ثانياً لا
 * يقرؤه `LeaveBalanceService`، فتقول الشاشةُ ١٢ ويقول العدّادُ النظاميُّ صفراً.
 */
export type ResolutionDecision = 'present_confirmed' | 'unclassified_closed' | 'void';

export const RESOLUTION_DECISION_LABELS: Record<ResolutionDecision, string> = {
  present_confirmed: 'حضرَ بلا سجلّ',
  unclassified_closed: 'أُغلق بلا تصنيف',
  void: 'منقوض',
};

/** الاقتراحُ المُسبَّق — نصُّ الزرّ الأوّل، ومصدرُه `label_key` من الخادم. */
export type SuggestionKind = 'field_work' | 'leave' | 'missing_punch' | 'remote' | 'present_confirmed';

export const SUGGESTION_LABELS: Record<SuggestionKind, string> = {
  field_work: 'سجّله عملاً ميدانياً',
  leave: 'سجّل إجازةً على هذا اليوم',
  missing_punch: 'أكمِل البصمةَ الناقصة',
  remote: 'سجّله عملاً عن بُعد',
  present_confirmed: 'أكّد أنه حضر بلا سجلّ',
};

/** لماذا اقتُرح هذا — يُعرض تحت الزرّ فلا يبدو الاقتراحُ حكماً بلا سبب. */
export const SUGGESTION_HINTS: Record<SuggestionKind, string> = {
  field_work: 'له جلسةٌ مجدولةٌ في هذا اليوم',
  leave: 'له طلبٌ إداريٌّ معتمَدٌ يتداخل مع اليوم',
  missing_punch: 'طرفٌ واحدٌ من اليوم مُسجَّل والآخرُ ناقص',
  remote: 'نمطُ هذا اليوم في جدوله «عن بُعد»',
  present_confirmed: 'لا دليلَ آخر — والشهادةُ شهادتُك',
};

export type SuggestionAction = 'claim' | 'leave' | 'resolution';

export type ScheduleDayMode = 'office' | 'remote' | 'field';

export const DAY_MODE_LABELS: Record<ScheduleDayMode, string> = {
  office: 'من المكتب',
  remote: 'عن بُعد',
  field: 'ميدانيّ',
};

export type WorkScheduleType = 'fixed' | 'flexible';

export const SCHEDULE_TYPE_LABELS: Record<WorkScheduleType, string> = {
  fixed: 'دوامٌ ثابت',
  flexible: 'دوامٌ مرن',
};

/** سببُ تعذُّر البصمة كما يرسله الخادم — الرسالةُ عربيةٌ جاهزةٌ ولا تُترجَم هنا. */
export type PunchBlockedCode = 'attendance_disabled' | 'source_closed' | 'not_tracked';

export interface PunchBlockedReason {
  code: PunchBlockedCode | string;
  message: string;
  status: number;
}

export interface AttendanceEmployeeRef {
  id: number;
  name: string | null;
  job_title?: string | null;
}

/** `explain` مؤشّراتٌ لا نثر — العربيةُ تُركَّب في الواجهة من الخرائط أعلاه. */
export interface AttendanceExplain {
  rule?: AttendanceRuleHit;
  skipped?: AttendanceSignal[];
  punch_ids?: number[];
  leave_id?: number | null;
  legacy_request_id?: number | null;
  claim_id?: number | null;
  session_ids?: number[];
}

export interface AttendanceSuggestion {
  kind: SuggestionKind;
  action: SuggestionAction;
  label_key: SuggestionKind;
  payload: Record<string, unknown>;
}

export interface AttendanceDayRow {
  id: number;
  work_date: string | null;
  status: AttendanceStatus;
  rule_hit: AttendanceRuleHit;
  decided_status: string | null;
  resolution_id: number | null;
  schedule_id: number | null;
  first_in_at: string | null;
  last_out_at: string | null;
  punch_count: number;
  presence_minutes: number | null;
  worked_minutes: number | null;
  required_minutes: number | null;
  /** مكوّنٌ تفسيريّ — 🚫 لا يُجمع مع `undertime_minutes` في أيّ مجموعٍ أو رسم. */
  late_minutes: number | null;
  early_leave_minutes: number | null;
  /** الرقمُ المجمَّع الوحيد. */
  undertime_minutes: number | null;
  leave_id: number | null;
  legacy_admin_request_id: number | null;
  claim_id: number | null;
  holiday_id: number | null;
  holiday_name: string | null;
  flags: AttendanceFlag[];
  explain: AttendanceExplain;
  computed_at: string | null;
  diverged_after_lock: boolean;
  /** يصل في صفوف شاشة اليوم وحدَها. */
  employee?: AttendanceEmployeeRef | null;
  /** يصل في صفوف الطابور وحدَها. */
  suggestion?: AttendanceSuggestion;
}

export interface AttendancePunchRow {
  id: number;
  employee_profile_id: number;
  punched_at: string;
  work_date: string;
  direction: PunchDirection;
  source: PunchSource;
  trust_level: PunchTrust;
  location_state: string | null;
  is_suspect: boolean;
  suspect_reasons: PunchSuspectReason[] | null;
  claim_id: number | null;
  reason: string | null;
  created_by: number | null;
  created_at: string | null;
  ip_address?: string | null;
  device_reported_at?: string | null;
  clock_skew_seconds?: number | null;
}

/**
 * 🔑 **بصمةٌ لم يُحتسب يومُها بعد** — واقعةٌ خامٌّ تصل في مفتاحها المنفصل `uncomputed_punches`
 * من `GET /hr/attendance/day`، ولا تُخلط بـ`rows` إطلاقاً.
 *
 * الفرقُ بينها وبين `AttendanceDayRow` هو الفرقُ الذي تقوم عليه الوحدةُ كلُّها: **هذه واقعةٌ
 * وقعت، وتلك حكمٌ صدر**. ولذلك لا حقلَ محسوباً فيها — لا حالةَ يومٍ ولا دقيقةَ تأخيرٍ ولا
 * مدّةَ عمل — و`employee` وحدَه يُضاف إليها في المتحكّم لتُعرض باسم صاحبها.
 *
 * 🚫 **ولا تُشتقّ منها أرقامٌ في الواجهة ولو سهُلت** (فارقُ الدخول والخروج مثلاً): للمحرّك
 * قواعدُ عطلةٍ وإجازةٍ وجدولٍ لا تراها الشاشة، ورقمٌ تخترعه الواجهةُ يخالف رقمَ الصباح.
 */
export interface AttendanceUncomputedPunch extends AttendancePunchRow {
  employee: AttendanceEmployeeRef | null;
}

export interface AttendanceClaim {
  id: number;
  employee_profile_id: number;
  claim_type: ClaimKind;
  start_date: string;
  end_date: string;
  proposed_in_at: string | null;
  proposed_out_at: string | null;
  linked_type: ClaimLinkType | null;
  linked_id: number | null;
  status: ClaimStatus;
  reason: string;
  self_approved: boolean;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  notes: string | null;
  created_at: string | null;
}

export interface AttendanceResolution {
  id: number;
  employee_profile_id: number;
  work_date: string;
  decision: ResolutionDecision;
  supersedes_resolution_id: number | null;
  reason: string;
  decided_by: number | null;
  decided_at: string;
}

/** عدٌّ صادقٌ لا مؤشّرُ إنجاز — `needs_decision` هو الرقمُ الوحيدُ القابل للفعل. */
export type AttendanceFacts = Record<AttendanceStatus, number> & { needs_decision: number };

export interface AttendanceDayPayload {
  date: string;
  facts: AttendanceFacts;
  /** **الأحكامُ المشتقّة** كما كتبها المحرّك. */
  rows: AttendanceDayRow[];
  /**
   * **الوقائعُ الخام** التي لم يقابلها حكمٌ بعد — مفتاحٌ منفصلٌ عمداً، وفارغٌ بعد كلّ تشغيلة.
   */
  uncomputed_punches: AttendanceUncomputedPunch[];
  /** قُصّت القائمةُ عند سقف الخادم (٥٠٠) — يُقال ولا يقع صامتاً. */
  uncomputed_truncated: boolean;
  /** `Y-m-d H:i` بتوقيت الرياض — متى يصير ما فوق حكماً. */
  engine_runs_at: string;
}

export interface AttendanceWindowSummary {
  days_computed: number;
  expected_work_days: number;
  by_status: Record<AttendanceStatus, number>;
  /** نسبةُ «بلا سجلّ» — **مؤشّرُ إعداداتٍ لا مؤشّرُ انضباط**. `null` قبل أوّل احتساب. */
  no_record_ratio: number | null;
}

export interface AttendanceQueueGroup {
  employee: AttendanceEmployeeRef;
  pending_days: number;
  days: AttendanceDayRow[];
}

export interface AttendanceQueuePayload {
  from: string;
  to: string;
  silence_hours: number;
  silence_cutoff: string;
  truncated: boolean;
  summary: AttendanceWindowSummary;
  employees: AttendanceQueueGroup[];
}

/** سجلُّ موظفٍ — **الباني واحدٌ للمدير وللموظف عن نفسه، حقلاً بحقل**. */
export interface AttendanceRecord {
  from: string;
  to: string;
  employee: {
    id: number;
    name: string | null;
    attendance_tracked: boolean;
    attendance_start_date: string | null;
  };
  facts: AttendanceFacts;
  days: AttendanceDayRow[];
  punches: AttendancePunchRow[];
  claims: AttendanceClaim[];
  resolutions: AttendanceResolution[];
}

/** بوّابةُ الموظف: نفسُ السجلّ + حالةُ زرِّ البصمة. */
export interface MyAttendanceRecord extends AttendanceRecord {
  punch_enabled: boolean;
  punch_blocked_reason: PunchBlockedReason | null;
}

export interface PunchResult {
  punch: AttendancePunchRow;
  work_date: string;
  /** `null` قبل أوّل تشغيلٍ للمحرّك — اليومُ مشتقٌّ لا يُكتب من مسار البصمة. */
  day_status?: AttendanceStatus | null;
}

/** يومٌ رُفض في قرارٍ جماعيّ — الرسالةُ عربيةٌ من الخادم وتُعرض كما هي. */
export interface AttendanceDecisionSkip {
  work_date: string;
  code: string;
  message: string;
}

/** مخرَجُ `AttendanceResolutionService::decide` حرفاً بحرف. */
export interface AttendanceDecisionResult {
  written: number;
  skipped: AttendanceDecisionSkip[];
  resolution_ids: number[];
}

/** سقفُ التواريخ في القرار الواحد — نسخةُ `AttendanceResolutionService::MAX_DATES`. */
export const ATTENDANCE_MAX_DECISION_DATES = 62;

export interface ClaimApproveResult {
  claim: AttendanceClaim;
  punch_ids: number[];
  marked_days: number;
}

export interface CreateClaimPayload {
  claim_type: ClaimKind;
  start_date: string;
  end_date?: string | null;
  proposed_in_at?: string | null;
  proposed_out_at?: string | null;
  linked_type?: ClaimLinkType | null;
  linked_id?: number | null;
  reason: string;
  notes?: string | null;
  idempotency_key: string;
}

export interface ClaimListFilters {
  status?: ClaimStatus | '';
  claim_type?: ClaimKind | '';
  employee_profile_id?: number | null;
  from?: string;
  to?: string;
  per_page?: number;
}

export interface ManualPunchPayload {
  employee_profile_id: number;
  direction: PunchDirection;
  punched_at: string;
  reason: string;
}

// ───────────── تهيئةُ الحضور · تشخيصُها · جداولُ الدوام (D) ─────────────
//
// كلُّ شكلٍ أدناه مطابقٌ حرفياً لمخرَج متحكّمٍ **قائمٍ في `route:list --path=hr`**:
//   POST /hr/attendance/setup ............ HrAttendanceSetupController@setup
//   GET  /hr/attendance/setup-health ..... HrAttendanceSetupController@health
//   POST /hr/attendance/recompute ........ HrAttendanceSetupController@recompute
//   GET  /hr/work-schedules .............. HrWorkScheduleController@index
//   POST /hr/work-schedules/{id}/new-version · /assign · /activate · /deactivate
//
// 🔴 **مفاتيحُ الأيام لا تُترجَم أبداً**: إنجليزيةٌ صغيرةٌ بترتيب Carbon، وهي مفرداتُ
// `WorkingDaysCalculator` نفسِها التي تقرؤها وحدتا الحضور والإجازات معاً. التسميةُ العربية
// للعرض وحدَه — ومفتاحٌ مخترَعٌ يجعل يوماً عطلةً صامتةً ويُصفّر أيامَ عملٍ بلا سطرٍ يفسّر.

export const WEEK_DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export type WeekDayKey = (typeof WEEK_DAY_KEYS)[number];

export const WEEK_DAY_LABELS: Record<WeekDayKey, string> = {
  sunday: 'الأحد',
  monday: 'الإثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة',
  saturday: 'السبت',
};

/** الحرفُ الواحد في مفاتيح الأيام المضغوطة — للشارات لا للنماذج. */
export const WEEK_DAY_SHORT: Record<WeekDayKey, string> = {
  sunday: 'ح',
  monday: 'ن',
  tuesday: 'ث',
  wednesday: 'ر',
  thursday: 'خ',
  friday: 'ج',
  saturday: 'س',
};

// `ScheduleDayMode`/`DAY_MODE_LABELS` و`WorkScheduleType`/`SCHEDULE_TYPE_LABELS` معرَّفةٌ
// أعلاه في كتلة الحضور (C) — ولا تُكرَّر هنا: تعريفان لاتحادٍ واحدٍ يفترقان أوّلَ تعديل.

/** قيمةُ يومٍ في نمط الأسبوع: السلسلةُ `"off"` أو كائنُ ساعاتٍ — نسخةُ عقد الخادم حرفاً. */
export type ScheduleDayValue =
  | 'off'
  | { mode: ScheduleDayMode; start: string; end: string; required_minutes?: number };

export type WeekPattern = Partial<Record<WeekDayKey, ScheduleDayValue>>;

export type HoursStandard = 'daily' | 'weekly';

export const HOURS_STANDARD_LABELS: Record<HoursStandard, string> = {
  daily: 'ساعاتٌ يومية',
  weekly: 'ساعاتٌ أسبوعية',
};

export type GraceMode = 'forgive' | 'threshold';

export const GRACE_MODE_LABELS: Record<GraceMode, string> = {
  forgive: 'يُتسامَح عن التأخّر داخل المهلة',
  threshold: 'المهلةُ عتبةٌ — يُحسب التأخّرُ كاملاً بعدها',
};

/** استعمالُ نسخةٍ — «مستعمَلة» = لها إسنادٌ أو يومٌ محتسَبٌ يُشير إليها. */
export interface WorkScheduleUsage {
  assignments: number;
  employees: number;
  live_assignments: number;
  live_employees: number;
  computed_days?: number;
}

/** نسخةُ جدولِ دوام — **ثابتةٌ لا تُحرَّر متى استُعملت**؛ التغييرُ نسخةٌ جديدة بإسنادٍ من تاريخ. */
export interface WorkSchedule {
  id: number;
  name: string;
  version: number;
  schedule_type: WorkScheduleType;
  hours_standard: HoursStandard;
  week_pattern: WeekPattern | null;
  ramadan_week_pattern: WeekPattern | null;
  off_days: WeekDayKey[];
  required_weekly_minutes: number | null;
  grace_in_minutes: number;
  grace_out_minutes: number;
  grace_mode: GraceMode;
  break_minutes: number;
  min_minutes_full_day: number | null;
  day_cutoff_hour: number;
  supersedes_schedule_id: number | null;
  default_site_id: number | null;
  is_default: boolean;
  is_active: boolean;
  notes: string | null;
  created_at: string | null;
  usage: WorkScheduleUsage;
  /** يصل مع الصفّ كي لا تكتشف الواجهةُ المنعَ **بعد** أن يملأ المستخدمُ نموذجاً. */
  editable: boolean;
}

export interface WorkSchedulePage {
  schedules: WorkSchedule[];
  weekend_setting: string[];
  default_schedule_id: number | null;
  day_keys: WeekDayKey[];
}

/** تحذيرٌ يُبلَّغ ولا يمنع — يصل في `data.warnings` مع ردٍّ ناجح. */
export interface AttendanceSetupWarning {
  code: string;
  message: string;
  data?: Record<string, unknown>;
}

export type AttendanceHealthReasonCode =
  | 'without_schedule'
  | 'pending_holidays'
  | 'session_days'
  | 'weekend_schism'
  | 'ghost_profiles';

/**
 * سببٌ مرجَّحٌ لارتفاع «بلا سجلّ» — **كلُّ سببٍ فعلٌ قابلٌ للتنفيذ**.
 *
 * الجملةُ العربيةُ يركّبها الخادمُ من أرقامٍ لا يملكها العميل (خلافاً لـ`explain`) فتُعرض
 * كما وصلت: «٧٪ بلا سجلّ» وحدها لا تُصلِح شيئاً، و«٣ موظفين بلا جدولِ دوام» تُصلِح.
 */
export interface AttendanceHealthReason {
  code: AttendanceHealthReasonCode;
  message: string;
  count: number;
  data: {
    sample?: Array<{ id: number; name?: string | null; date?: string }>;
    schedule_off_days?: WeekDayKey[];
    setting_weekend_days?: string[];
  };
}

/** مخرَجُ `AttendanceSetupHealth::report` — قراءةٌ محضةٌ بصفر كتابة. */
export interface AttendanceSetupHealthReport {
  hr_enabled: boolean;
  attendance_enabled: boolean;
  ready: boolean;

  profiles_total: number;
  eligible_count: number;
  tracked_count: number;
  tracked_flagged: number;
  /** ملفٌّ مؤشَّرٌ للتتبّع وصاحبُه معطَّل — لا يُنتج صفّاً أبداً ويُنتظر منه صفّ. */
  ghost_count: number;

  schedules_count: number;
  default_schedule: { id: number; name: string; version: number } | null;
  sites_count: number;
  without_schedule: { count: number; sample: Array<{ id: number; name: string | null }> };

  weekend: {
    schism: boolean;
    schedule_off_days: WeekDayKey[] | null;
    setting_weekend_days: string[];
    reason: 'no_default_schedule' | null;
  };
  default_schedule_matches_setting: boolean;

  window: { from: string; to: string };
  days_computed: number;
  expected_work_days: number;
  by_status: Record<AttendanceStatus, number>;
  no_record_ratio: number | null;
  needs_decision: number;
  session_days: number;
  pending_holidays: { count: number; sample: Array<{ id: number; name: string; date: string }> };
  first_punch_at: string | null;

  setup_suspect: boolean;
  reasons: AttendanceHealthReason[];
}

/** حمولةُ التهيئة — الأيامُ السبعةُ إلزاميةٌ بأسمائها، والباقي يسقط إلى افتراضِ الخادم. */
export interface AttendanceSetupPayload {
  attendance_start_date: string;
  employee_profile_ids?: number[];
  track_all?: boolean;
  schedule: {
    name?: string;
    schedule_type?: WorkScheduleType;
    hours_standard?: HoursStandard;
    work_days: Record<WeekDayKey, boolean>;
    start?: string;
    end?: string;
    break_minutes?: number;
    grace_in_minutes?: number;
    grace_out_minutes?: number;
    grace_mode?: GraceMode;
    day_cutoff_hour?: number;
  };
}

/** مخرَجُ `AttendanceSetupService::setup` + `engine_runs_at` الذي يضيفه المتحكّم. */
export interface AttendanceSetupResult {
  created: boolean;
  schedule_id: number;
  schedule_name: string;
  schedule_version: number;
  schedule_created: boolean;
  attendance_start_date: string;
  selected: number;
  assigned: number;
  assignments_existing: number;
  tracked: number;
  attendance_enabled: boolean;
  dirty_marked: number;
  dirty_from: string | null;
  dirty_to: string | null;
  warnings: AttendanceSetupWarning[];
  engine_runs_at: string;
}

/** سقفُ ما يُهيَّأ دفعةً واحدة — نسخةُ `AttendanceSetupService::MAX_PROFILES`. */
export const ATTENDANCE_SETUP_MAX_PROFILES = 500;

/** سقفُ مدى إعادة الاحتساب من الشاشة — نسخةُ `HrAttendanceSetupController::MAX_RECOMPUTE_DAYS`. */
export const ATTENDANCE_RECOMPUTE_MAX_DAYS = 31;

export interface AttendanceRecomputePayload {
  from: string;
  to?: string;
  employee_profile_id?: number | null;
}

/**
 * مخرَجُ إعادة الاحتساب — **وسمٌ فقط**: الطلبُ يكتب في طابور الاتّساخ ثم ينصرف،
 * والمحرّكُ يصرفه في `engine_runs_at`. ولا رقمٌ يتغيّر أمام المدير فوراً.
 */
export interface AttendanceRecomputeResult {
  from: string;
  to: string;
  days: number;
  employees: number;
  days_marked: number;
  engine_runs_at: string;
  message: string;
}

/** حمولةُ «نسخةٌ جديدة» — جزئيةٌ فوق الأساس: ما لم يُرسَل يُنسخ من النسخة القديمة. */
export interface WorkSchedulePayload {
  name?: string;
  schedule_type?: WorkScheduleType;
  hours_standard?: HoursStandard;
  week_pattern?: WeekPattern;
  grace_in_minutes?: number;
  grace_out_minutes?: number;
  grace_mode?: GraceMode;
  break_minutes?: number;
  day_cutoff_hour?: number;
  notes?: string | null;
  is_default?: boolean;
}

export interface WorkScheduleResult {
  created?: boolean;
  schedule: WorkSchedule;
  warnings: AttendanceSetupWarning[];
}

export interface ScheduleAssignPayload {
  employee_profile_ids: number[];
  effective_from?: string;
  reason?: string;
}

/** مخرَجُ الإسناد — `days_affected` يُعرض **قبل** الضغط لا بعده. */
export interface ScheduleAssignResult {
  schedule_id: number;
  schedule_name: string;
  schedule_version: number;
  effective_from: string;
  retroactive: boolean;
  selected: number;
  assigned: number;
  assignments_existing: number;
  closed: number;
  days_affected: number;
  dirty_marked: number;
  dirty_from: string | null;
  dirty_to: string | null;
  warnings: AttendanceSetupWarning[];
}

/** أدنى طولٍ لسببِ الإسناد الرجعيّ — نسخةُ `WorkScheduleService::MIN_REASON`. */
export const SCHEDULE_RETRO_MIN_REASON = 10;
