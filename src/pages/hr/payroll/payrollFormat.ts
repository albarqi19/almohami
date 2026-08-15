import type {
  AdvanceKind,
  AdvanceStatus,
  BasicWageDefinition,
  CapCode,
  ExclusionReason,
  FlagSeverity,
  GosiScheme,
  IbanState,
  ItemKind,
  PayFrequency,
  PaymentMethod,
  PayrollDiff,
  PayrollItem,
  PayrollStatutoryWindow,
  PenaltyKind,
  PenaltyState,
  PostingState,
  ProposalType,
  ProrationBasis,
  RunStage,
  WageComposition,
  WageFileStatus,
  WageRegisterFilter,
  WageRegisterRow,
} from '../../../types/hrPayroll';

/**
 * دوالُّ العرض وخرائطُ الأسماء لوحدة الرواتب — **مصدرٌ واحدٌ** لكلّ مبلغٍ ووسمٍ في الوحدة.
 *
 * ══════ 🔴 المالُ لا يمرّ بـ`Number` قطّ ══════
 * أعمدةُ `decimal(12,2)` تصل نصّاً (`"11900.00"`) لأنّ الخادم بناها بـ`Money` (bcmath) وصفرِ
 * عائم. وتمريرُها على `Number(...)` هنا يُعيد فتحَ البابِ نفسِه من الطرف الآخر: راتبٌ من
 * تسع خاناتٍ يفقد الدقّة، و`0.1 + 0.2` تعود. فالتنسيقُ **نصّيّ**: تُشقّ السلسلةُ عند
 * النقطة، ويُفصَل الجزءُ الصحيح بفواصلَ آلافٍ حرفاً حرفاً، ويُحفظ الكسرُ كما وصل.
 *
 * ══════ 🔴 `dir="ltr"` على الرقم وحدَه ══════
 * العطلُ المسجَّل في `AttendanceDayDetail`: `dir="ltr"` جامعٌ على نطاقٍ يخلط اسمَ شهرٍ عربيّاً
 * برقمٍ انتزع رقمَ اليوم من شهره. فالعملةُ **خارج** نطاق الرقم، والوسمُ في اتجاه الصفحة.
 *
 * ══════ 🚫 لا أقواسَ للسالب ══════
 * عرفٌ محاسبيٌّ يُقرأ خطأً في RTL ولا يفهمه غيرُ المحاسب. الإشارةُ **رمزٌ ولونٌ معاً** فلا
 * تُحمَل المعلومةُ على اللون وحده.
 */

export { EMPTY_MARK, errorText, fmtLeaveDate, fmtLeaveDateTime, todayISO } from '../leave/leaveFormat';

// ⚠️ `export … from` **لا يُدخل الرمز إلى نطاق هذا الملفّ** — يمرّره فحسب. ودوالُّ هذا
// الملفّ تستعمل `EMPTY_MARK` بنفسها، فتُستورَد صراحةً بجانب التمرير.
import { EMPTY_MARK } from '../leave/leaveFormat';

/**
 * 🩸 **المسافةُ الملتصقة** — سهمُ الوصلة كان يتيتّم سطراً وحدَه تحت جملته (قِيس في
 * `_zoom-readiness.png`): «افتح له ملفَّ أجرٍ وصرّح بنظام تأميناته.» ثمّ «←» في سطرٍ
 * مستقلّ — رمزٌ بلا نصٍّ يبدو زخرفةً مقطوعة.
 *
 * والسببُ أنّ المسافةَ العاديةَ بين النصّ والأيقونة **فرصةُ كسرٍ للسطر**، والأيقونةُ
 * `inline-block` يجوز الكسرُ حولها بذاتها. والملتصقةُ (U+00A0) تمنع الكسرَ قبلها
 * وبعدها معاً — وهي أسبقُ في ترتيب قواعد UAX#14 من قاعدةِ الكسر حول الأجسام المُدمَجة.
 *
 * وثابتٌ مسمّى لا حرفٌ حرفيٌّ في JSX: المسافةُ الملتصقةُ **لا تُرى في المُحرِّر**، فتُنسَخ
 * سهواً أو تُنظَّف بأوّل إعادةِ تنسيق، ويعود العطلُ بلا أن يلمسها أحد.
 */
export const NBSP = ' ';

/**
 * مبلغٌ للعرض — **تنسيقٌ نصّيّ بلا `Number`**.
 *
 * `undefined` تعني «محجوبٌ بالصلاحية أو غيرُ مسجَّل» ⇒ `null` لتتولّاه الشاشةُ بشرطة، ولا
 * تُطبع `0.00` مكانَه: صفرٌ مكتوبٌ يُقرأ حقيقةً.
 */
export function money(value?: string | null): string | null {
  if (value === null || value === undefined || value === '') return null;

  const raw = String(value).trim();
  const negative = raw.startsWith('-');
  const body = negative ? raw.slice(1) : raw;

  if (!/^\d+(\.\d+)?$/.test(body)) return raw;

  const [whole, fraction = '00'] = body.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const cents = (fraction + '00').slice(0, 2);

  return `${negative ? '−' : ''}${grouped}.${cents}`;
}

/** مجموعُ سلاسلَ عشريةٍ **بالهللات صحيحةً** — للمعاينة الحيّة قبل الحفظ، بلا عائم. */
export function sumMoney(values: Array<string | null | undefined>): string {
  let cents = 0n;

  for (const value of values) {
    const raw = String(value ?? '').trim();
    if (raw === '') continue;
    if (!/^\d+(\.\d+)?$/.test(raw)) continue;

    const [whole, fraction = ''] = raw.split('.');
    const pad = (fraction + '00').slice(0, 2);
    cents += BigInt(whole) * 100n + BigInt(pad);
  }

  const sign = cents < 0n ? '−' : '';
  const abs = cents < 0n ? -cents : cents;

  return `${sign}${(abs / 100n).toString()}.${(abs % 100n).toString().padStart(2, '0')}`;
}

/** «هل هذا المبلغُ موجب؟» — نصّاً لا بـ`Number`، فلا يكذب `"0.00"` على أيّ اختبارٍ ضمنيّ. */
export function isPositiveMoney(value?: string | null): boolean {
  const raw = String(value ?? '').trim();
  if (!/^\d+(\.\d+)?$/.test(raw)) return false;

  return /[1-9]/.test(raw.replace('.', ''));
}

// ══════════════ خرائطُ الأسماء — صفرُ نصٍّ عربيٍّ متناثرٍ في JSX ══════════════

export const GOSI_SCHEME_LABELS: Record<GosiScheme, string> = {
  saudi: 'سعوديّ',
  non_saudi: 'غيرُ سعوديّ',
  exempt: 'معفىً',
};

/** شرحُ كلّ نظامٍ — يُعرَض تحت الاختيار لأنّ الفرقَ بينها **مالٌ حقيقيّ** لا تسمية. */
export const GOSI_SCHEME_HINTS: Record<GosiScheme, string> = {
  saudi: 'اشتراكُ معاشاتٍ وساند على الطرفين.',
  non_saudi: 'حصّةُ الموظف صفر — الأخطارُ المهنية على المكتب وحدَه.',
  exempt: 'خارجَ نطاق التأمينات — يُصرَّح به ولا يُفترض.',
};

export const WAGE_FILE_STATUS_LABELS: Record<WageFileStatus, string> = {
  active: 'نشط',
  held: 'معلَّق',
  closed: 'مغلق',
};

export const IBAN_STATE_LABELS: Record<IbanState, string> = {
  none: 'بلا آيبان',
  valid: 'آيبانٌ صالح',
  invalid: 'آيبانٌ فاسد',
};

export const PRORATION_LABELS: Record<ProrationBasis, string> = {
  statutory_thirty: 'الشهر ثلاثون يوماً (م.٢)',
  actual_month_days: 'أيامُ الشهر الفعلية',
};

export const PRORATION_HINTS: Record<ProrationBasis, string> = {
  statutory_thirty: 'المقامُ ٣٠ دائماً مهما كان عددُ أيام الشهر — وهو نصُّ المادة الثانية.',
  actual_month_days: 'المقامُ ٢٨ أو ٢٩ أو ٣٠ أو ٣١ — يومُ الغياب في فبراير يكلّف أكثرَ من مثله في يناير.',
};

export const COMPOSITION_LABELS: Record<WageComposition, string> = {
  itemised: 'مفصَّل',
  lump_sum: 'مبلغٌ واحد',
};

export const PAY_FREQUENCY_LABELS: Record<PayFrequency, string> = {
  monthly: 'شهريّ',
  weekly: 'أسبوعيّ',
};

export const BASIC_DEFINITION_LABELS: Record<BasicWageDefinition, string> = {
  basic_only: 'الأساسيُّ وحدَه',
  basic_plus_periodic: 'الأساسيُّ + العلاواتُ الدورية',
  contract_defined: 'كما نصَّ العقدُ أو اللائحة',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: 'تحويلٌ بنكيّ',
  cash: 'نقداً',
  cheque: 'شيك',
};

export const FILTER_LABELS: Record<WageRegisterFilter, string> = {
  all: 'الكل',
  missing_wage: 'بلا أجر',
  missing_iban: 'بلا آيبان',
  missing_scheme: 'بلا نظام تأمينات',
  ready: 'جاهز',
};

export const FILTER_HINTS: Record<WageRegisterFilter, string> = {
  all: 'كلُّ منسوبي المكتب ضمن هذا البحث',
  missing_wage: 'لا نسخةَ أجرٍ ساريةٌ اليوم بأساسيٍّ أكبرَ من صفر',
  missing_iban: 'لا آيبانَ صالحاً — سطرٌ واحدٌ فاسدٌ قد يُفشل كشفَ الرواتب المسلَّم للبنك كلَّه',
  missing_scheme: 'لم يُصرَّح بنظام التأمينات — ولا يُشتقّ من الجنسية',
  ready: 'أجرٌ سارٍ وآيبانٌ صالحٌ ونظامُ تأميناتٍ مُصرَّحٌ به',
};

/**
 * سببُ خروج المنسوب من الجاهزية — **رمزٌ واحدٌ حاكم** بترتيب الأولوية.
 *
 * أوّلُ ناقصٍ هو ما يُعرَض: من لا أجرَ له لا يُقال له «أضف آيباناً» — يُقال له ما يبدأ به.
 */
export function gapCode(row: WageRegisterRow): WageRegisterFilter | null {
  if (!row.has_wage) return 'missing_wage';
  if (!row.gosi_scheme) return 'missing_scheme';
  if (row.iban_state !== 'valid') return 'missing_iban';

  return null;
}

/** نصُّ الفعل التالي لهذا المنسوب — يُقرأ من `gapCode` فلا يتباعد الوسمُ عن سببه. */
export function gapAction(code: WageRegisterFilter | null): string {
  switch (code) {
    case 'missing_wage':
      return 'سجّل راتبه';
    case 'missing_scheme':
      return 'صرّح بنظام التأمينات';
    case 'missing_iban':
      return 'أضف آيباناً صالحاً';
    default:
      return 'حدّث الأجر';
  }
}

/**
 * أثرُ نسخةٍ جديدةٍ **قبل** الحفظ — الجملةُ التي تجعل الفعلَ مقروءاً لا مفاجئاً.
 *
 * وهي الجزءُ الذي تُهمله الأنظمة: من يكتب تاريخَ سريانٍ لا يعرف ماذا يقع للنسخة السابقة
 * ولا للقسائم المصروفة. فيُقال له قبل النقر لا بعده.
 */
export function effectImpact(effectiveFrom: string, previousFrom?: string | null): string[] {
  const lines: string[] = [];
  const pretty = fmtDateHuman(effectiveFrom);

  lines.push(`تسري النسخةُ الجديدة من ${pretty}.`);

  if (previousFrom) {
    lines.push(`تُغلَق النسخةُ السارية (من ${fmtDateHuman(previousFrom)}) في ${pretty} — بلا يومٍ مكرَّرٍ ولا يومٍ ساقط.`);
  }

  lines.push('والقسائمُ السابقةُ لا تتغيّر: الماضي لا يُعاد كتابتُه.');

  return lines;
}

/** `YYYY-MM-DD` ⇒ «١ سبتمبر ٢٠٢٦» بأرقامٍ لاتينيةٍ واسمِ شهرٍ عربيّ. */
export function fmtDateHuman(iso?: string | null): string {
  if (!iso) return '—';

  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return iso;

  return new Date(y, m - 1, d).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** مدى سريان النسخة — والذيلُ المفتوح يُقال صراحةً «سارية». */
export function fmtSpan(from?: string | null, to?: string | null): string {
  if (!from) return '—';
  if (!to) return `من ${fmtDateHuman(from)} — سارية`;

  return `${fmtDateHuman(from)} ← ${fmtDateHuman(to)}`;
}

// ══════════════ S2 — المرجعُ النظاميُّ والكتالوج ══════════════

/**
 * نقاطُ الأساس ⇒ نسبةً مقروءة — **نصّاً بلا `Number`** كبقيّة هذا الملفّ.
 *
 * ٩٠٠ ⇒ «٩٪» · ٧٥ ⇒ «٠٫٧٥٪» · ٥٠٠٠ ⇒ «٥٠٪». والنسبُ تصل أعداداً صحيحةً من الخادم
 * لأنّ `0.0975` عائماً ليست `0.0975` — فلا يجوز أن نُعيدها عائمةً هنا لنعرضها.
 */
export function bp(points?: number | null): string {
  if (points === null || points === undefined || !Number.isFinite(points)) return EMPTY_MARK;

  const whole = Math.trunc(points / 100);
  const cents = Math.abs(points % 100);

  if (cents === 0) return `${whole}%`;

  return `${whole}.${String(cents).padStart(2, '0').replace(/0$/, '')}%`;
}

export const RULE_KIND_LABELS: Record<string, string> = {
  wage_basis: 'تعريفُ الأجر',
  deduction_cap: 'سقفُ حسم',
  deduction_priority: 'ترتيبُ الحسم',
  contribution: 'اشتراكُ تأمينات',
  overtime: 'العملُ الإضافيّ',
  eos: 'نهايةُ الخدمة',
  settlement_deadline: 'مهلةُ التصفية',
  proration: 'تجزئةُ الأجر',
  pay_cycle: 'دوريةُ الصرف',
  fund_disposition: 'وجهةُ الحصيلة',
};

export const COMPONENT_KIND_LABELS: Record<string, string> = {
  earning: 'استحقاق',
  deduction: 'استقطاع',
  employer_cost: 'تكلفةُ المكتب',
  informational: 'لا يجوز',
};

/** إلى أين يذهب المال — البُعدُ الذي يفرّق غرامةَ م.٧٣ عن حسمٍ يعود للمكتب. */
export const COUNTERPARTY_LABELS: Record<string, string> = {
  employee: 'الموظف',
  gosi: 'التأمينات',
  court: 'المحكمة',
  worker_fund: 'صندوق العمال',
  employer: 'المكتب',
  third_party: 'طرفٌ ثالث',
};

export const BEARER_LABELS: Record<string, string> = {
  employee: 'الموظف',
  employer: 'المكتب',
};

export const RUN_TYPE_LABELS: Record<string, string> = {
  monthly: 'الشهريّ',
  off_cycle: 'الاستثنائيّ',
  correction: 'التصحيحيّ',
  final_settlement: 'التصفية',
  leave_advance: 'سلفةُ الإجازة',
};

/**
 * حالةُ إنفاذ القاعدة — **ثلاثُ درجاتٍ لا اثنتان**، وهي جوهرُ الصدق في هذه الشاشة.
 *
 * دمجُ «مُلزِمةٌ تُنفَّذ» بـ«مُلزِمةٌ قارئُها لم يُشحن» يشتري ثقةً بلا مقابل: يقرأ المديرُ
 * سقفَ م.٩٣ فيظنّ أنّ شيئاً يمنع تجاوزَه اليوم.
 */
export type RuleEnforcement = 'enforced' | 'pending_reader' | 'reference';

export function ruleEnforcement(rule: { informational: boolean; reader: { shipped: boolean } | null }): RuleEnforcement {
  if (rule.informational) return 'reference';

  return rule.reader?.shipped ? 'enforced' : 'pending_reader';
}

export const ENFORCEMENT_LABELS: Record<RuleEnforcement, string> = {
  enforced: 'تُنفَّذ الآن',
  pending_reader: 'لم تُنفَّذ بعد',
  reference: 'للاطّلاع فقط',
};

export const ENFORCEMENT_HINTS: Record<RuleEnforcement, string> = {
  enforced: 'قارئُها مشحونٌ ويقرؤها في كلّ احتساب.',
  pending_reader: 'مبذورةٌ وموثَّقة، ولا يقرؤها شيءٌ بعدُ — تُنفَّذ حين تُشحن خطوتُها.',
  reference: 'معروضةٌ للاطّلاع، ولا يُدَّعى إنفاذُها إطلاقاً.',
};

/**
 * حمولةُ القاعدة مسطَّحةً للعرض — **عرضٌ لا حساب**.
 *
 * الواجهةُ لا تحسب من هذه الأرقام شيئاً؛ القارئُ على الخادم يفعل. وتسطيحُها هنا كي تُقرأ
 * سطراً سطراً بدل كتلةِ JSON: المرجعُ النظاميُّ يُقرأ بالمادّة لا بالكود.
 */
export function flattenPayload(payload: Record<string, unknown>, prefix = ''): Array<{ key: string; value: string }> {
  const rows: Array<{ key: string; value: string }> = [];

  Object.entries(payload ?? {}).forEach(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      rows.push({ key: path, value: EMPTY_MARK });

      return;
    }

    if (Array.isArray(value)) {
      rows.push({ key: path, value: value.map((item) => (typeof item === 'object' ? JSON.stringify(item) : String(item))).join(' · ') });

      return;
    }

    if (typeof value === 'object') {
      rows.push(...flattenPayload(value as Record<string, unknown>, path));

      return;
    }

    if (typeof value === 'boolean') {
      rows.push({ key: path, value: value ? 'نعم' : 'لا' });

      return;
    }

    rows.push({ key: path, value: String(value) });
  });

  return rows;
}

// ══════════════════════════════════════════════════════════════════════════
// S3 — المسير والطابور والفحصُ القبْليّ
//
// 🔴 الخادمُ يرسل **رموزاً** والواجهةُ تبني النصّ: الرمزُ المخزَّن في `excluded_json`
// يبقى مفهوماً بعد سنتين، والجملةُ تتحسّن وتُترجَم بلا أن تُعاد كتابةُ صفٍّ مجمَّد.
// ══════════════════════════════════════════════════════════════════════════

export const RUN_STAGE_LABELS: Record<RunStage, string> = {
  draft: 'مسوّدة',
  calculated: 'محتسَب',
  approved: 'معتمَد',
  paying: 'قيد الصرف',
  paid: 'مصروف',
  published: 'منشور',
  voided: 'ملغى',
};

export const POSTING_STATE_LABELS: Record<PostingState, string> = {
  not_posted: 'لم يُقيَّد بعد',
  posted: 'مُقيَّد محاسبياً',
  reversed: 'قيدٌ معكوس',
  accounting_off: 'لم يُقيَّد محاسبياً',
};

/**
 * 🔴 نصُّ سببِ الاستبعاد — **جملةٌ تُقرأ لا رمزٌ تقنيّ**.
 *
 * وهي أهمُّ خريطةٍ في هذه الشاشة: أخطرُ عطلٍ في الرواتب ليس رقماً خاطئاً بل موظفاً لم
 * يظهر أصلاً — والفرقُ بين «١٦ منسوباً» و«١٦ من ١٨، والمستبعَدان أحمدُ الغامديّ (بلا
 * أجرٍ مسجَّل) وسارةُ القحطانيّ (انفكّت ٠٧-١٢)» هو الفرقُ بين نظامٍ يصمت ونظامٍ يقول.
 */
export const EXCLUSION_LABELS: Record<ExclusionReason, string> = {
  terminated_before: 'انفكّت علاقتُه قبل الفترة',
  joined_after: 'التحق بعد الفترة',
  already_claimed: 'له سطرٌ في مسيرٍ آخرَ لنفس الفترة',
  no_wage_file: 'لم يُفتح له ملفُّ أجر',
  wage_file_closed: 'ملفُّ أجره مُغلَق',
  wage_file_held: 'ملفُّ أجره معلَّق',
  no_gosi_scheme: 'بلا نظام تأمينات',
  no_wage_row: 'بلا أجرٍ مسجَّل',
  zero_wage: 'أجرُه الأساسيُّ صفر',
  manual: 'استُبعد بقرار',
};

/** «ما العمل» — أمرٌ للمستقبل لا حكمٌ على الماضي، ولا كلمةَ لومٍ في الخريطة كلِّها. */
export const EXCLUSION_ACTIONS: Record<ExclusionReason, string> = {
  terminated_before: 'واقعةٌ لا نقص — لا يُصرف عن فترةٍ سبقت انفكاكه.',
  joined_after: 'واقعةٌ لا نقص — يدخل مسيرَ الشهر الذي التحق فيه.',
  already_claimed: 'افتح المسيرَ الذي يطالب به، أو ألغِه إن فُتح خطأً.',
  no_wage_file: 'افتح له ملفَّ أجرٍ وصرّح بنظام تأميناته.',
  wage_file_closed: 'أعِد فتحَ ملفّ الأجر إن كانت العلاقةُ قائمة.',
  wage_file_held: 'ارفع التعليقَ بعد استكمال سببه.',
  no_gosi_scheme: 'صرّح بنظام التأمينات — ولا يُشتقّ من الجنسية.',
  no_wage_row: 'سجّل له راتباً من تاريخِ سريان.',
  // لا تُكرّر السببَ في الفعل: السببُ مكتوبٌ في العمود الذي قبله، والتكرارُ ضجيجٌ يُقرأ
  // مرّتين ويُفهم مرّة.
  zero_wage: 'سجّل نسخةً بالمبلغ الصحيح.',
  manual: 'راجع قرارَ الاستبعاد.',
};

/**
 * وجهةُ العلاج ⇒ مسارُ الواجهة. الخادمُ يقول **ماذا يُصلَح** لا **أين تُبنى الوصلة**،
 * فمسارُ الفرونت يبقى ملكَ الفرونت ولا ينكسر بتغييرِ سلسلةٍ في PHP.
 */
export function fixHref(target?: string | null, runId?: number, profileId?: number): string | null {
  if (target === null || target === undefined || target === 'none') return null;
  if (target === 'payroll_rules') return '/hr/payroll/rules';
  // الملفُّ المبدئيُّ يُستكمل في ملفّ الموظف نفسِه لا في سجلّ الأجور: الناقصُ تاريخُ
  // التحاقٍ لا مبلغ، ووصلةٌ تقود إلى سجلّ الأجور تطلب راتباً لمن لم يُقَل إنّه وُظِّف.
  if (target === 'employee_profile' && profileId !== undefined) return `/hr/employees/${profileId}`;
  if (target === 'run_roster' && runId !== undefined) return `/hr/payroll/runs/${runId}?stage=roster`;
  if (target === 'run_proposals' && runId !== undefined) return `/hr/payroll/runs/${runId}?stage=preflight`;

  if (target.startsWith('wage_register:')) {
    const filter = target.slice('wage_register:'.length);

    return filter === 'all' ? '/hr/payroll/wages' : `/hr/payroll/wages?filter=${filter}`;
  }

  return null;
}

/** نصُّ العلَم في الفحص القبْليّ — وما لا نعرف له نصّاً يُعرَض برمزه لا بجملةٍ مخترَعة. */
export const FLAG_LABELS: Record<string, string> = {
  no_eligible_employee: 'لا منسوبَ مؤهّلٌ لهذا المسير',
  gosi_rates_unconfirmed: 'نسبُ التأمينات لم تُؤكَّد بعد',
  missing_iban: 'منسوبون بلا آيبانٍ صالحٍ وطريقةُ صرفهم تحويلٌ بنكيّ',
  fixable_exclusions: 'مستبعَدون بنقصٍ يمكن استكمالُه',
  roster_excluded: 'مستبعَدون من هذا المسير',
  'open_proposal:unpaid_leave': 'إجازاتٌ بلا أجرٍ تنتظر قراراً',
  'open_proposal:sick_tier': 'إجازاتٌ بنسبٍ متدرّجةٍ تنتظر قراراً',
  'open_proposal:undertime': 'نقصُ دقائقَ في الحضور ينتظر قراراً',
  'open_proposal:unclassified_day': 'أيامٌ لم تُصنَّف',
};

export const FLAG_HINTS: Record<string, string> = {
  no_eligible_employee: 'سجّل راتباً واحداً ساري المفعول على الأقلّ ليُفتح المسير.',
  gosi_rates_unconfirmed: 'الاعتمادُ محجوبٌ حتى يؤكّد المكتبُ النسبَ باسمه — والفتحُ والاحتسابُ يمرّان.',
  missing_iban: 'أضف آيباناً صالحاً، أو غيّر طريقةَ الصرف مع ذكر سببها.',
  fixable_exclusions: 'كلُّ سببٍ أدناه له طريقُ علاجٍ واحد — والنقصُ بيانٌ يُدخَل لا عطلٌ يُصلَح.',
  roster_excluded: 'أسماؤهم وأسبابُهم في مرحلة النطاق — ولا يُكتب العددُ وحدَه.',
  'open_proposal:unpaid_leave': 'صرفُ راتبٍ كاملٍ عن أيامٍ بلا أجرٍ خطأٌ صامت — القرارُ فعلُ إنسانٍ مسمّى.',
  'open_proposal:sick_tier': 'النسبُ متدرّجةٌ ولا يخمّنها محرّك.',
  'open_proposal:undertime': 'تنبيهٌ يمرّ بإقرارٍ مسجَّلٍ باسم المُقرّ.',
  'open_proposal:unclassified_day': 'معلومةٌ تُعرَض ولا تقترح خصماً — محرّكُ الحضور لا يحكم بالغياب.',
};

export function flagLabel(code: string): string {
  return FLAG_LABELS[code] ?? code;
}

export const PROPOSAL_TYPE_LABELS: Record<ProposalType, string> = {
  unpaid_leave: 'إجازةٌ بلا أجر',
  sick_tier: 'إجازةٌ بنسبةٍ متدرّجة',
  undertime: 'نقصُ دقائق',
  unclassified_day: 'يومٌ لم يُصنَّف',
  advance_installment: 'قسطُ سلفة',
  penalty_due: 'جزاءٌ نافذ',
  deferred_from_cap: 'مرحَّلٌ بالسقف',
  retro_after_payroll: 'أثرٌ رجعيٌّ بعد الصرف',
  overpayment: 'صرفٌ زائد',
};

export const SEVERITY_LABELS: Record<FlagSeverity, string> = {
  block: 'مانع',
  warn: 'تنبيه',
  info: 'معلومة',
};

/** ترتيبُ العرض: المانعُ أوّلاً دائماً — نظيرُ `HrPayrollProposal::severityRank`. */
export function severityRank(severity: FlagSeverity): number {
  return severity === 'block' ? 0 : severity === 'warn' ? 1 : 2;
}

/**
 * 🔤 **تمييزُ العدد** — «١٧ أيام» عطلٌ نحويٌّ يُقرأ في وجه المستخدم، والصوابُ «١٧ يوماً».
 *
 * القاعدةُ العربيةُ أربعُ حالاتٍ لا حالتان: الواحدُ مفردٌ، والاثنان مثنّى، ومن ثلاثةٍ إلى
 * عشرةٍ **جمعٌ**، ومن أحدَ عشرَ فصاعداً **مفردٌ منصوب**. وهي في موضعٍ واحدٍ هنا كي لا
 * يُعاد اختراعُها بثلاثيّةٍ ناقصةٍ في كلّ شاشة.
 *
 * ولا يقرّر هذا الحقلُ **شكلَ الرقم**: منظومةُ الوحدة لاتينيةٌ في كلّ رقمٍ يخرج من بيانات
 * (مبلغٌ · تاريخٌ · عدد) — والهنديّةُ لا تدخل إلا في نصٍّ ثابتٍ لا رقمَ بجانبه، وخلطُهما
 * في جملةٍ واحدةٍ («8 منسوباً · ٠ منهم») هو ما تمنعه هذه الدالّة بتوحيد المصدر.
 */
export function counted(
  n: number,
  forms: { one: string; two: string; few: string; many: string }
): string {
  const abs = Math.abs(n);

  if (abs === 1) return `${n} ${forms.one}`;
  if (abs === 2) return `${n} ${forms.two}`;

  return `${n} ${abs >= 3 && abs <= 10 ? forms.few : forms.many}`;
}

/** تمييزُ «يوم» — الصيغُ الأربع في موضعٍ واحد. */
export const DAY_FORMS = { one: 'يوم', two: 'يومين', few: 'أيام', many: 'يوماً' } as const;

/** تمييزُ «منسوب» — «٢ منسوبين» · «٩ منسوبين» · «١٧ منسوباً». */
export const HEADCOUNT_FORMS = {
  one: 'منسوب',
  two: 'منسوبين',
  few: 'منسوبين',
  many: 'منسوباً',
} as const;

/**
 * تمييزُ «الملفّ المبدئيّ» — والوصفُ **داخل** الصيغة لا بعدها.
 *
 * «3 ملفات مبدئيّ» عطلٌ نحويٌّ يقع حتماً متى وُضع النعتُ خارج الدالّة، لأنّ إعرابَه يتبع
 * المعدودَ الذي تختاره هي. فيُحمل معها في الصيغ الأربع.
 */
export const DRAFT_PROFILE_FORMS = {
  one: 'ملفٌّ مبدئيّ',
  two: 'ملفّان مبدئيّان',
  few: 'ملفّاتٍ مبدئية',
  many: 'ملفّاً مبدئياً',
} as const;

/** «الصرفُ بعد 4 أيام» · «الصرفُ بعد 17 يوماً» · «تأخّر الصرفُ 3 أيام» — ولا رقمٌ سالبٌ عارٍ. */
export function payCountdown(days: number): string {
  if (days === 0) return 'الصرفُ اليوم';
  if (days > 0) return `الصرفُ بعد ${counted(days, DAY_FORMS)}`;

  // المتأخّرُ منصوبٌ في الحالين («تأخّر الصرفُ يوماً») ولا يُقال «تأخّر الصرفُ يوم».
  return `تأخّر الصرفُ ${counted(Math.abs(days), { ...DAY_FORMS, one: 'يوماً' })}`;
}

/** «١٦ من ١٨» — الصيغةُ في موضعٍ واحدٍ، فلا يُكتب العددُ الأولُ وحدَه في أيّ شاشة (D22). */
export function outOf(part: number, whole: number): string {
  return `${part} من ${whole}`;
}

// ══════════════════════════════════════════════════════════════════════════
// ⏳ مهلةُ الثلاثين يوماً — عنوانُ الشارة ونبرتُها
//
// 🔴 **النبرةُ تصل من الخادم** (`statutory_window.tone`) ولا تُشتقّ هنا من عدد الأيام: حدُّ
// «أسبوع» مكتوبٌ في كتالوج المدقّق، ونسخةٌ ثانيةٌ منه في TypeScript تتباعد عنه بأوّل تعديل
// فتقول الشاشةُ «متّسع» والمدقّقُ في الشاشة نفسِها يقول «بقي أسبوع».
//
// 🔴 **ولا نسبةَ التزامٍ في أيّ نصٍّ هنا**: مقامُها عددُ المسجَّلين في التأمينات لدى المنشأة،
// ولا يملكه هذا النظام — ورقمٌ يُعرض تطمينٌ كاذبٌ لمكتبٍ قد يكون مخالفاً.
// ══════════════════════════════════════════════════════════════════════════

/** صنفُ الشارة لكلّ نبرة — والمعطَّلُ (`settled`) بلا لونٍ: لا فعلَ متبقٍّ عليه. */
export const WINDOW_TONE_CLASS: Record<PayrollStatutoryWindow['tone'], string> = {
  elapsed: 'hrl-fact hrl-fact--danger',
  urgent: 'hrl-fact hrl-fact--danger',
  tight: 'hrl-fact hrl-fact--gold',
  ample: 'hrl-fact',
  settled: 'hrl-fact',
  unknown: 'hrl-fact',
};

/**
 * عنوانُ عدّاد المهلة — **بنبرةٍ تتدرّج مع الاقتراب**، ولا رقمٌ سالبٌ عارٍ.
 *
 * وكلمةُ «المهلة» لا تُترك مبهمة: هي مهلةُ **رفع ملفّ الأجور الذي يصدره البنك** إلى المنصّة
 * الحكومية، ورفعُه فعلُ المنشأة لا فعلُنا. والعنوانُ قصيرٌ لأنّ الشارةَ ضيّقة، والشرحُ الكاملُ
 * في لوح «دورةُ الرواتب والبنك».
 */
export function windowCountdown(window: PayrollStatutoryWindow): string {
  if (window.days_left === null) return 'مهلةُ الرفع';
  if (window.tone === 'settled') return 'مهلةُ الرفع';
  if (window.days_left < 0) return `انقضت المهلةُ منذ ${counted(Math.abs(window.days_left), { ...DAY_FORMS, one: 'يوماً' })}`;
  if (window.days_left === 0) return 'المهلةُ تنقضي اليوم';

  return `يبقى على انقضاء المهلة ${counted(window.days_left, DAY_FORMS)}`;
}

/**
 * 🔴 دليلُ المقترح جملةً عربيةً — **لا مفاتيحَ لاتينيةً في وجه المستخدم**.
 *
 * `calendar_days: 7 · ledger_days: 9.00 · from: 2026-08-25` لغةُ مطوِّرٍ لا لغةُ مديرِ مكتبِ
 * محاماة. وهي من النمط الذي رفضناه صراحةً: «رموزُ القواعد في وجه المستخدم».
 *
 * ══════ D01: الرقمان يُطبعان معاً ══════
 * أيامُ الأجر **تقويمية** (مقامُ الشهر تقويميّ)، وأيامُ دفتر الإجازات غالباً **أيامُ عمل**.
 * فإجازةٌ واحدةٌ لها عددان مختلفان مشروعان — وإخفاءُ أحدهما يصنع نزاعاً لا يُحلّ: يقرأ
 * الموظفُ «١٠» في رصيده و«١٢» في قسيمته فيظنّ أحدَهما خطأً. فيُكتبان معاً وبمسمّاهما.
 */
export function evidenceText(type: ProposalType, evidence: Record<string, unknown> | null): string {
  if (evidence === null) return EMPTY_MARK;

  const get = (key: string): string | null => {
    const value = evidence[key];

    return value === undefined || value === null ? null : String(value);
  };

  const parts: string[] = [];

  if (type === 'unpaid_leave' || type === 'sick_tier') {
    const calendar = get('calendar_days');
    const ledger = get('ledger_days');

    if (calendar !== null) {
      parts.push(`${calendar} يوماً تقويمياً`);
    }

    if (ledger !== null) {
      // الرقمُ الثاني بمسمّاه لا مجرَّداً: «ودفترُ الإجازات ٩» تقول أيَّ عدٍّ هو.
      parts.push(`ودفترُ الإجازات ${ledger}`);
    }

    const from = get('from');
    const to = get('to');

    if (from !== null && to !== null) {
      parts.push(`${fmtDateHuman(from)} ← ${fmtDateHuman(to)}`);
    }

    return parts.length === 0 ? EMPTY_MARK : parts.join(' · ');
  }

  if (type === 'undertime') {
    const minutes = get('minutes');
    const days = get('days');

    if (minutes !== null) parts.push(`${minutes} دقيقة`);
    if (days !== null) parts.push(`في ${days} يوماً`);

    return parts.length === 0 ? EMPTY_MARK : parts.join(' · ');
  }

  if (type === 'unclassified_day') {
    const days = get('days');

    return days === null ? EMPTY_MARK : `${days} يوماً لم تُصنَّف`;
  }

  const days = get('days');
  const from = get('from');

  if (days !== null) parts.push(`${days} يوماً`);
  if (from !== null) parts.push(fmtDateHuman(from));

  return parts.length === 0 ? EMPTY_MARK : parts.join(' · ');
}

// ══════════════════════════════════════════════════════════════════════════
// S4 — لغةُ القسيمة: من رمزٍ إلى جملةٍ يفهمها محاسبٌ غيرُ تقنيّ
//
// 🔴 القاعدةُ الحاكمة: **الخادمُ يرسل مؤشّراتٍ والواجهةُ تبني الجملة**. الرمزُ المخزَّن في
// صفٍّ مجمَّدٍ يبقى مفهوماً بعد سنتين، والجملةُ تتحسّن وتُترجَم بلا مسِّ ذلك الصفّ. ولذلك
// لا نصَّ عربيَّ في القاعدة، ولا رمزَ لاتينيَّ في وجه المستخدم.
// ══════════════════════════════════════════════════════════════════════════

/** إشارةُ البند — **رمزٌ ولونٌ معاً**، فلا تُحمَل المعلومةُ على اللون وحدَه. */
export function signMark(kind: ItemKind): string {
  if (kind === 'deduction') return '−';
  if (kind === 'employer_cost') return '=';

  return '+';
}

export const ITEM_KIND_CLASS: Record<ItemKind, string> = {
  earning: 'hrp-item--earn',
  deduction: 'hrp-item--deduct',
  employer_cost: 'hrp-item--cost',
  informational: 'hrp-item--info',
};

/** الوعاءُ الذي حُسب عليه البند — «على أيّ أساس» من السؤال الثلاثيّ. */
export const VESSEL_LABELS: Record<string, string> = {
  actual: 'الأجر (الأساسي + البدلات)',
  basic: 'الأجر الأساسي',
  gosi: 'وعاء التأمينات (الأساسي + السكن)',
  daily: 'أجر اليوم النظامي',
  hourly: 'أجر الساعة',
  flat: 'مبلغ مقطوع',
};

/**
 * 🔑 **سطرُ «من أين جاء الرقم»** — الوعاءُ × المعامل، نصّاً يُعاد حسابُه باليد.
 *
 * «١٢٬٠٠٠٫٠٠ × ٩٫٧٥٪» · «١٢٬٠٠٠٫٠٠ × ٢٨ ÷ ٣٠» — ورقمٌ لا يستطيع إنسانٌ التحقّقَ منه
 * بالضرب ليس رقماً بل ادّعاء.
 *
 * ══════ 🔴 ولماذا «× ٢٨ ÷ ٣٠» لا «× ٢٩ يوماً» ══════
 * البندُ يخزّن `factor_value = 29` (أيامَ الدفع التقويمية) ومبلغَه `11,200.00`. وطباعةُ
 * «١٢٬٠٠٠ × ٢٩» تدعو القارئَ إلى ضربٍ يُخرج ٣٤٨٬٠٠٠ فيظنّ القسيمةَ كاذبة. والبسطُ
 * والمقامُ **مجمَّدان** في `explain` (`paid_fraction` و`divisor`) وقتَ الاحتساب، فتُعرَض
 * المعادلةُ التي **تُغلق فعلاً**. وهذا نظيرُ `PayslipComposer::basis()` حرفاً — فما يراه
 * المراجعُ على شاشته هو ما يقرؤه الموظفُ على ورقته.
 */
export function basisLine(item: PayrollItem): string | null {
  if (item.basis_amount === null) return null;

  const base = money(item.basis_amount);

  if (base === null) return null;

  const factor = item.factor_value === null ? null : String(item.factor_value).replace(/\.0+$/, '');
  const explain = (item.explain ?? {}) as Record<string, unknown>;

  if (item.factor_kind === 'pct_bp' && factor !== null) {
    return `${base} × ${bp(Number.parseInt(factor, 10))}`;
  }

  if (item.factor_kind === 'hours' && factor !== null) {
    return `${base} × ${factor}`;
  }

  if (item.factor_kind !== 'days' || factor === null) return base;

  // شهرٌ كاملٌ **لا يمرّ بقسمةٍ إطلاقاً** — و«× ٣٠ ÷ ٣٠» توحي بقسمةٍ لم تقع.
  if (explain.whole_period === true) return base;

  const ratio =
    typeof explain.ratio_bp === 'number' && explain.ratio_bp !== 10000
      ? ` × ${bp(explain.ratio_bp)}`
      : '';

  const fraction = splitFrozenFraction(explain.paid_fraction) ?? splitFrozenFraction(explain.fraction);

  if (fraction !== null) return `${base} × ${fraction[0]} ÷ ${fraction[1]}${ratio}`;

  if (typeof explain.divisor === 'number') return `${base} × ${factor} ÷ ${explain.divisor}${ratio}`;

  return `${base} × ${factor}`;
}

/**
 * 🩸 **الوحدةُ العربيةُ خارجَ نطاق الأرقام** — و`basisLine` لاتينيٌّ محضٌ بناءً.
 *
 * العطلُ المسجَّل: `dir="ltr"` على نطاقٍ يخلط عربيةً برقمٍ يمزّق النصّ. فتُعاد الوحدةُ
 * منفصلةً لتُطبَع **خارج** النطاق الموسوم، ولا تُعاد أصلاً متى أغلقت المعادلةُ بمقامها
 * («× ٢٨ ÷ ٣٠» لا يليها «يوماً»: العددُ فيها كسرٌ لا عدُّ أيام).
 */
export function basisUnit(item: PayrollItem): string | null {
  if (item.factor_kind === 'hours') return 'ساعة';
  if (item.factor_kind !== 'days') return null;

  const explain = (item.explain ?? {}) as Record<string, unknown>;

  if (explain.whole_period === true) return null;
  if (typeof explain.paid_fraction === 'string' || typeof explain.fraction === 'string') return null;
  if (typeof explain.divisor === 'number') return null;

  return 'يوماً';
}

/** «٢٨ من ٣٠» ⇒ `['28','30']` — والصيغةُ يبنيها `ProrationResult` فلا تُخمَّن. */
function splitFrozenFraction(value: unknown): [string, string] | null {
  if (typeof value !== 'string') return null;

  const match = /^(\S+)\s+من\s+(\S+)$/.exec(value.trim());

  return match === null ? null : [match[1], match[2]];
}

/** «إلى أين يذهب» — البُعدُ الذي يفرّق غرامةَ م.٧٣ عن حسمٍ يعود للمكتب. */
export function counterpartyNote(item: PayrollItem): string | null {
  if (item.kind !== 'deduction') return null;
  if (item.counterparty === 'employee' || item.counterparty === 'employer') return null;

  return `تذهب إلى ${COUNTERPARTY_LABELS[item.counterparty] ?? item.counterparty}`;
}

export const CAP_LABELS: Record<CapCode, string> = {
  art70_fine: 'سقفُ الجزاء: أجرُ خمسة أيام',
  art91_damage: 'سقفُ الإتلاف: أجرُ خمسة أيام',
  art92_category: 'سقفُ الفئة',
  art93_total: 'السقفُ الكلّيّ: نصفُ المستحقّ',
  art40_forbidden: 'خصمٌ باطل يتحمّله المكتب',
  payable_ceiling: 'حدُّ المستحقّ: لا يُخصَم ما لم يُستحقّ',
};

/**
 * 🔴 نصُّ القصّ — **بالمادّة وبالمبلغين وبالمرحَّل**، لا كلمةُ «قُصَّ» وحدَها.
 *
 * سطرُ استقطاعٍ يقلّ عن المطلوب بلا سببٍ مطبوعٍ يجعل الموظفَ يظنّ خطأً، ويجعل المحاسبَ
 * يعيد إدخالَه في الشهر التالي مرّةً ثانية.
 */
export function capNote(item: PayrollItem): string | null {
  if (item.cap_applied === null) return null;

  const label = CAP_LABELS[item.cap_applied] ?? item.cap_applied;
  const from = money(item.capped_from_amount);
  const deferred = money(item.deferred_amount);
  const parts: string[] = [label];

  if (from !== null) parts.push(`طُلب ${from}`);
  if (deferred !== null && isPositiveMoney(item.deferred_amount)) {
    parts.push(`ورُحِّل ${deferred} إلى الفترة التالية`);
  }

  return parts.join(' · ');
}

/** مصدرُ البند — «من أين جاء» بلغةِ إنسانٍ لا بأسماء جداول. */
export const SOURCE_LABELS: Record<string, string> = {
  hr_payroll_line: 'محسوبٌ من بيانات المدّة',
  manual: 'أُدخل بقرارٍ يدويّ',
  hr_leave: 'من دفتر الإجازات',
  hr_attendance_day: 'من سجلّ الحضور',
  hr_advance: 'من سجلّ السلف',
  hr_penalty: 'من سجلّ الجزاءات',
};

/** أسماءُ القواعد النظامية كما تُعرَض بجانب البند — بالمادّة لا بالكود. */
export const RULE_TITLES: Record<string, string> = {
  'payroll.proration_basis': 'أساسُ تجزئة الأجر',
  'ksa.labor.art116.unpaid_suspension': 'الإجازةُ بلا أجر',
  'ksa.labor.art107.overtime': 'الأجرُ الإضافيّ',
  'ksa.labor.art92.deduction_caps': 'سقوفُ الحسم لكلّ فئة',
  'ksa.labor.art93.total_cap': 'السقفُ الكلّيّ للحسم',
  'ksa.labor.art70.fine_cap': 'سقفُ الجزاء التأديبيّ',
  'ksa.labor.art91.damage_cap': 'سقفُ حسم الإتلاف',
  'ksa.labor.art40.forbidden_deductions': 'ما لا يجوز خصمُه',
  'gosi.contribution': 'نسبُ اشتراك التأمينات',
  'gosi.wage_basis': 'وعاءُ أجر الاشتراك وحدّاه',
};

export function ruleTitle(code: string | null): string | null {
  if (code === null) return null;

  return RULE_TITLES[code] ?? code;
}

/**
 * 🔑 **«لماذا يختلف عن الشهر الماضي؟»** — أهمُّ ما في القسيمة وأكثرُ ما تُهمله الأنظمة.
 *
 * تُبنى من المؤشّرات لا من نصٍّ مخزَّن، ولكلّ سطرٍ علامتُه ومقدارُه.
 */
export function whyRows(diff: PayrollDiff[]): Array<{ mark: 'up' | 'down' | 'flat'; text: string }> {
  return diff.map((row) => {
    const delta = row.delta ?? null;
    const mark: 'up' | 'down' | 'flat' = delta === null ? 'flat' : String(delta).startsWith('-') ? 'down' : 'up';

    if (row.code === 'wage_changed') {
      return {
        mark,
        text: `الراتبُ تغيّر: من ${money(row.from ?? null) ?? EMPTY_MARK} إلى ${money(row.to ?? null) ?? EMPTY_MARK}`,
      };
    }

    if (row.code === 'unpaid_days') {
      const days = String(row.days ?? '').replace(/\.00$/, '');
      const ranges = (row.ranges ?? [])
        .map((range) =>
          range.from === range.to ? fmtDateHuman(range.from) : `${fmtDateHuman(range.from)} ← ${fmtDateHuman(range.to)}`
        )
        .join(' · ');

      // 🔴 D01: الرقمان معاً — التقويميُّ مقامُ الأجر، والدفتريُّ ما احتسبه دفترُ الإجازات.
      const ledger = row.ledger_days ?? null;
      const ledgerText =
        ledger === null || ledger === '0.00' ? '' : ` · وفي دفتر الإجازات ${String(ledger).replace(/\.00$/, '')}`;

      return { mark: 'down', text: `${days} يوماً تقويمياً بلا أجر${ranges === '' ? '' : ` (${ranges})`}${ledgerText}` };
    }

    if (row.code === 'gosi_changed') {
      return { mark, text: `حصّةُ التأمينات تغيّرت بمقدار ${money(delta) ?? EMPTY_MARK}` };
    }

    if (row.code === 'deductions_changed') {
      return { mark, text: `الاستقطاعاتُ تغيّرت بمقدار ${money(delta) ?? EMPTY_MARK}` };
    }

    if (row.code === 'capped_and_deferred') {
      return {
        mark: 'flat',
        text: `قُصَّ حسمٌ بالسقف ورُحِّل ${money(row.amount ?? null) ?? EMPTY_MARK} إلى الفترة التالية`,
      };
    }

    return { mark: 'flat', text: row.code };
  });
}

// ══════════════════════════════════════════════════════════════════════════
// مراحلُ المسير السبع — **تعريفٌ واحدٌ** يقرؤه الشريطُ والصفحةُ معاً
//
// 🔴 ولماذا هنا لا في `RunStageBar.tsx`: ملفُّ مكوّنٍ يصدّر ثوابتَ يكسر إعادةَ التحميل
// السريع (`react-refresh/only-export-components`)، والقائمةُ نفسُها **خريطةُ أسماء** —
// وهذا ملفُّ خرائط الأسماء في الوحدة كلِّها.
// ══════════════════════════════════════════════════════════════════════════

export type StageKey = 'roster' | 'preflight' | 'compute' | 'review' | 'approve' | 'pay' | 'publish';

export interface StageDef {
  key: StageKey;
  n: number;
  title: string;
  /** `null` ⇒ مشحونةٌ وقابلةٌ للنقر. وإلا فالنصُّ هو سببُ التعطيل. */
  disabledReason: string | null;
}

/** 🔴 المشحونُ ستُّ مراحل — والباقيةُ تُعرَض معطَّلةً بسببها لا تُخفى. */
export const STAGES: StageDef[] = [
  { key: 'roster', n: 1, title: 'النطاق', disabledReason: null },
  { key: 'preflight', n: 2, title: 'الفحصُ القبْليّ', disabledReason: null },
  { key: 'compute', n: 3, title: 'الاحتساب', disabledReason: null },
  { key: 'review', n: 4, title: 'المراجعة', disabledReason: null },
  { key: 'approve', n: 5, title: 'الاعتماد', disabledReason: null },
  { key: 'pay', n: 6, title: 'الدفع', disabledReason: null },
  { key: 'publish', n: 7, title: 'النشر', disabledReason: 'النشرُ يُظهر القسيمةَ للموظف بعد صرفها.' },
];

/** آخرُ مرحلةٍ **مشحونة** — إليها يُردُّ أيُّ اشتقاقٍ يقع على مرحلةٍ لم تُبنَ بعد. */
const LAST_SHIPPED_STAGE: StageKey =
  [...STAGES].reverse().find((stage) => stage.disabledReason === null)?.key ?? 'roster';

/** مرحلةُ الخادم ⇒ الخطوةُ التي تُفتح عليها الشاشة. */
const STAGE_OF_RUN: Record<RunStage, StageKey> = {
  draft: 'roster',
  calculated: 'review',
  approved: 'approve',
  paying: 'pay',
  paid: 'pay',
  published: 'publish',
  voided: 'roster',
};

/**
 * 🔴 **الشاشةُ تُفتح على مرحلة المسير الفعلية لا على أوّلها.**
 *
 * مسيرٌ معتمَدٌ يُفتح على «النطاق» يجعل صاحبَه يظنّ أنّه لم يعتمد بعد فيعتمد ثانيةً — وهذا
 * لبسٌ خطيرٌ في شاشةٍ ذاتِ اتجاهٍ واحد. و`?stage=` في الرابط يتجاوز هذا الاشتقاق دائماً
 * لمن يشارك رابطاً بعينه.
 */
export function stageOfRun(stage?: RunStage | null): StageKey {
  if (stage === undefined || stage === null) return 'roster';

  const target = STAGE_OF_RUN[stage] ?? 'roster';
  const def = STAGES.find((row) => row.key === target);

  // مرحلةٌ لم تُشحن بعد (الدفعُ والنشر) ⇒ آخرُ ما يُفتح فعلاً، لا خطوةٌ مقفلةٌ تُعرَض فارغة.
  return def === undefined || def.disabledReason !== null ? LAST_SHIPPED_STAGE : target;
}

/**
 * رقمُ آخرِ خطوةٍ **انقضت فعلاً** — ما دونها منقضٍ يُوسَم، وما فوقها لم يقع.
 *
 * ولا يُوسَم شيءٌ لمسيرٍ ملغى: الإلغاءُ لا يُبقي خطوةً قائمة.
 */
export function stageDoneThrough(stage?: RunStage | null): number {
  switch (stage) {
    case 'draft':
      return 1;
    case 'calculated':
      return 3;
    case 'approved':
    case 'paying':
    case 'paid':
    case 'published':
      return 5;
    default:
      return 0;
  }
}

export const STAGE_DONE_LABEL = 'خطوةٌ منقضية';

export const STAGE_LOCKED_LABEL = 'خطوةٌ لم تُشحن بعد';

// ══════════════════════════════════════════════════════════════════════════
// S5 — الاعتماد: نصُّ الإقرار، وما يفعله المستخدمُ بعد كلّ ردِّ رفض
//
// 🔴 الرسالةُ العربيةُ تأتي من الخادم وتُعرَض كما هي — وهذه الخريطةُ **سطرُ ما العمل**
// تحتها لا بديلٌ عنها: الخادمُ يقول ماذا وقع، والواجهةُ تقول ما التالي وأين.
// ══════════════════════════════════════════════════════════════════════════

/** نصُّ الإقرار الذي يُقرأ ويُرسَل ويُسجَّل — **واحدٌ**، فلا يُوقَّع على غير ما قُرئ. */
export const SINGLE_APPROVER_ACK_TEXT =
  'أنا المعتمِدُ الوحيدُ في المكتب ومُعِدُّ هذا المسير، وأقرُّ بذلك.';

/**
 * 🔴 نصُّ إقرار **المشمول** — مستقلٌّ عن سابقه لا نسخةٌ منه.
 *
 * حالتان مختلفتان قد تجتمعان في شخصٍ واحد: «لا معتمِدَ آخرَ في المكتب» نقصُ نصاب، و«يُصرف
 * لي في هذا المسير» تضاربُ مصلحة. ونصٌّ واحدٌ يُغطّيهما يجعل توقيعةً واحدةً تُنسَب إلى
 * إقرارين لم يُقرأ أحدُهما — والمخزَّنُ حرفياً هو المستند.
 */
export const SUBJECT_APPROVER_ACK_TEXT =
  'لي قسيمةٌ في هذا المسير، وأقرُّ باعتمادي مسيراً يُصرف لي فيه.';

/**
 * 🔴 **ما سيقع** — يُقرأ قبل التأشير لا بعده.
 *
 * الإقرارُ الذي لا يقول أثرَه توقيعٌ على المجهول. وهذا الأثرُ بالذات هو شرطُ فتح الباب:
 * «الغرضُ من القاعدة ليس المنع، بل أن يعلم من يقرأ القسيمة أنّ من اعتمدها هو من صُرف له».
 */
export const SUBJECT_APPROVER_ACK_EFFECT =
  'سيُطبَع على قسائم هذا المسير — على الشاشة وفي الورقة — أنّ من اعتمدها هو من صُرف له فيها، باسمك.';

export const APPROVAL_DENIAL_HINTS: Record<string, string> = {
  approver_is_subject:
    'بابٌ ظاهرٌ موسومٌ لا تجاوزٌ صامت: الأثرُ يبقى مطبوعاً على القسيمة، فيعلم قارئُها بعد سنتين مَن وقّع.',
  preparer_cannot_approve:
    'مبدأٌ لا يُلغى: مَن أعدّ لا يعتمد. أحِل المسيرَ إلى معتمِدٍ آخرَ في المكتب.',
  single_approver_ack_required:
    'لا معتمِدَ آخرَ في المكتب — فالبابُ ظاهرٌ موسوم: أقرّ بذلك صراحةً ليُسجَّل نصُّ إقرارك باسمك ويُوسَم المسيرُ «اعتمدها معدُّها».',
  gosi_rates_unconfirmed:
    'نقصُ بيانٍ لا نقصُ صفة: أكّد النسبَ باسمك في المرجع النظاميّ ثمّ عُد — ولا حاجةَ إلى شخصٍ آخر.',
  run_has_blocking_flags: 'عالِج الموانعَ ثمّ أعد الاحتساب قبل الاعتماد.',
  lines_not_computed: 'احتسب المسيرَ قبل اعتماده — لا يُعتمَد سطرٌ بلا رقم.',
  lines_with_blockers: 'عالِج موانعَ الأسطر ثمّ أعد الاحتساب.',
  open_blocking_proposals: 'بُتَّ القراراتِ المنتظرةَ في طابور القرارات ثمّ أعد الاحتساب.',
  open_proposals: 'بُتَّ القراراتِ المنتظرةَ في طابور القرارات ثمّ أعد الاحتساب.',
  day_already_claimed:
    'لا يُدفَع يومٌ مرّتين ولا يُخصم مرّتين: اسحب اعتمادَ المسير المطالِب أو صحّحه بمسيرٍ تصحيحيّ.',
  day_map_missing: 'أعد الاحتساب قبل الاعتماد ليُقتطَع من خريطة الأيام ما يُطالَب به.',
  proration_divisor_missing: 'أعد الاحتساب قبل الاعتماد.',
  repayment_balance_unknown: 'أعد الاحتساب ليُثبَّت المتبقّي بعد القسط على الصفّ.',
  run_has_no_lines: 'أعد بناءَ النطاق ثمّ احتسب قبل الاعتماد.',
  run_not_approvable: 'لا يُعتمَد إلا مسيرٌ محتسَب — احتسبه أوّلاً.',
};

/**
 * 🔴 لا وصلةَ علاجٍ لتضارب المصالح ولا لـ«مَن أعدّ لا يعتمد»: علاجُ الأوّل **مربّعُ إقرارٍ
 * في مكانه** لا شاشةٌ أخرى، وعلاجُ الثاني **شخصٌ آخر** لا زرّ. ووصلةٌ تَعِد بمخرجٍ لا يوجد
 * أسوأُ من غيابها.
 */
const APPROVAL_FIX_STAGE: Record<string, StageKey> = {
  run_has_blocking_flags: 'compute',
  lines_not_computed: 'compute',
  lines_with_blockers: 'compute',
  day_map_missing: 'compute',
  proration_divisor_missing: 'compute',
  repayment_balance_unknown: 'compute',
  run_not_approvable: 'compute',
  open_blocking_proposals: 'preflight',
  open_proposals: 'preflight',
  run_has_no_lines: 'roster',
};

/** وجهةُ العلاج — والمسارُ ملكُ الفرونت، فلا ينكسر بتغييرِ سلسلةٍ في PHP. */
export function approvalFixHref(code: string | null, runId: number): string | null {
  if (code === null) return null;
  if (code === 'gosi_rates_unconfirmed') return '/hr/payroll/rules';

  const stage = APPROVAL_FIX_STAGE[code];

  return stage === undefined ? null : `/hr/payroll/runs/${runId}?stage=${stage}`;
}

/** «٢٧ من ٢٨» — الكسرُ صريحٌ ليتحقّق منه إنسانٌ بالقسمة. */
export function daysFraction(paid: string | null, total: number | null): string {
  if (paid === null || total === null) return EMPTY_MARK;

  return `${String(paid).replace(/\.00$/, '')} من ${total}`;
}

/** نصُّ علَمِ السطر — وما لا نعرف له نصّاً يُعرَض برمزه لا بجملةٍ مخترَعة. */
export const LINE_FLAG_LABELS: Record<string, string> = {
  pay_breakdown_missing: 'إجازةٌ بشرائحَ ناقصةٍ — لا يمكن تقييمُ أيامها',
  pay_breakdown_mismatch: 'شرائحُ الإجازة لا تساوي أيامَها التقويمية',
  pay_breakdown_fractional: 'شريحةُ إجازةٍ بكسرِ يوم',
  overlapping_leaves: 'إجازتان على تاريخٍ واحد',
  entitlement_clamped_to_monthly_wage: 'حُصر الاستحقاقُ عند أجر الشهر',
  deduction_exceeds_entitlement: 'حسمٌ يتجاوز المستحقّ — قُصَّ ورُحِّل',
  gosi_rates_unconfirmed: 'نسبُ التأمينات لم تُؤكَّد بعد',
  lines_with_blockers: 'أسطرٌ عليها موانع',
};

export function lineFlagLabel(code: string): string {
  return LINE_FLAG_LABELS[code] ?? FLAG_LABELS[code] ?? code;
}

// ══════════════════════════════════════════════════════════════════════════
// S5 — «لماذا هذا الصافي»: الطريقُ من الأجر إلى المدفوع
//
// 🔴 **نظيرٌ حرفيٌّ لـ`PayslipComposer::path()` على الخادم** — نفسُ المحطّات ونفسُ
// الوسوم ونفسُ الجمل. والسببُ أنّ الورقة تُبنى هناك والشاشةَ المكتبية هنا، ولو
// افترق النصّان لقرأ المراجعُ على شاشته غيرَ ما سلّمه للموظف. وأيُّ تعديلٍ في
// أحدهما تعديلٌ في الآخر — وهذا مكتوبٌ في الملفّين معاً.
//
// 🔴 وصفرُ حسابٍ هنا كما هناك: كلُّ مبلغٍ **عمودٌ مخزَّنٌ في الصفّ المجمَّد**، لا طرحَ
// ولا جمعَ ولا نسبةٌ تُعاد قسمتُها عند العرض. القارئُ يطرح بنفسه ويتحقّق.
// ══════════════════════════════════════════════════════════════════════════

/** حمولةُ التجزئة المجمَّدة على السطر — `explain.proration` بلا تخمينٍ لشكلها. */
type FrozenProration = {
  mode?: string;
  basis?: string;
  divisor?: number;
  fraction?: string;
  paid_fraction?: string;
};

/** قراءةُ `explain.proration` بأمان — و`null` حين لا لقطةَ تجزئةٍ في الصفّ. */
export function prorationOf(explain: Record<string, unknown> | null): FrozenProration | null {
  if (explain === null || typeof explain !== 'object') return null;

  const raw = (explain as Record<string, unknown>).proration;

  return raw !== null && typeof raw === 'object' ? (raw as FrozenProration) : null;
}

/**
 * 🔑 **الجملةُ التي تجعل الكسرَ قابلاً للتحقّق باليد** — نظيرُ `fractionSentence` في الخادم.
 *
 * وشهرٌ كاملٌ **لا يمرّ بقسمةٍ إطلاقاً** فيُقال ذلك صراحةً: «٣٠ من ٣٠» وحدَها توحي بقسمةٍ
 * وقعت، والقسمةُ لم تقع — المبلغُ هو الأجرُ الشهريُّ حرفياً.
 */
export function fractionSentence(proration: FrozenProration | null): string | null {
  if (proration === null) return null;

  const paid = proration.paid_fraction ?? null;
  const unpaid = proration.fraction ?? null;

  if (proration.mode === 'whole_period') {
    return paid === null
      ? 'مدّةٌ كاملةٌ بلا يومٍ غيرِ مدفوع — الأجرُ الشهريُّ حرفياً بلا قسمة.'
      : `مدّةٌ كاملة (${paid} يوماً) — الأجرُ الشهريُّ حرفياً بلا قسمة.`;
  }

  const parts: string[] = [];

  if (paid !== null) parts.push(`الأجرُ عن ${paid} يوماً`);
  if (unpaid !== null) parts.push(`وحُسم ${unpaid} يوماً بلا أجر`);

  return parts.length === 0 ? null : `${parts.join('، ')}.`;
}

/**
 * ⚠️ **الرقمان المتجاوران يُربكان** — عطلٌ قِيس على الورقة لا استُنتج: «الأجرُ عن 31 من 31
 * يوماً تقويمياً» يليها «مدّةٌ كاملة (30 من 30 يوماً)». والقيمتان **صحيحتان**، لكنّ من لا
 * يعرف مقسومَ المادّة الثانية (÷٣٠) يقرأ رقمين متناقضين في سطرين متلاصقين فيظنّ أحدَهما
 * خطأً — وهو أخطرُ ما يقع في مستندٍ ماليّ: شكٌّ في رقمٍ سليم.
 *
 * فتُقال العلاقةُ صراحةً بين السطرين: أحدُهما **مدّةٌ** والآخرُ **مقام**. والجملةُ تُبنى من
 * المقام المجمَّد في الصفّ (`explain.proration.divisor`) لا من ثابتٍ مكتوب — فإن كان
 * أساسُ التجزئة «أيامَ الشهر الفعلية» تساوى العددان ولم تُطبَع الجملةُ أصلاً.
 */
export function divisorNote(
  periodCalendarDays: number | null,
  proration: FrozenProration | null
): string | null {
  if (proration === null || periodCalendarDays === null) return null;

  const divisor = proration.divisor ?? null;

  if (divisor === null || divisor === periodCalendarDays) return null;

  return `والعددان لا يتناقضان: ${periodCalendarDays} عددُ أيام الشهر، و${divisor} مقامُ القسمة الذي يُقسَم عليه الأجرُ مهما بلغت أيامُ الشهر.`;
}

/** محطّةٌ في الطريق — الوسمُ والمبلغُ ومعهما «من أين». */
export interface NetPathStep {
  key: 'monthly_wage' | 'entitlement' | 'deductions' | 'net';
  label: string;
  amount: string | null;
  note: string | null;
}

/**
 * 🔑 **«لماذا هذا الصافي»** — أربعُ محطّاتٍ من الأجر المتّفق عليه إلى ما أُودع.
 *
 * وهي أهمُّ سطرٍ في القسيمة لموظفٍ غيرِ محاسب: الجدولُ يقول «كم بندٌ»، وهذا يقول
 * **«كيف صار راتبي هذا الرقم»** — وهو السؤالُ الذي يُفتح لأجله المستند.
 */
export function netPathRows(line: {
  wage_actual: string | null;
  wage_basic: string | null;
  earnings_amount: string | null;
  deductions_amount: string | null;
  gosi_ee_amount: string | null;
  net_amount: string | null;
  iban_last4: string | null;
  explain: Record<string, unknown> | null;
}): NetPathStep[] {
  const proration = prorationOf(line.explain);

  // «منه أساسيٌّ كذا» — والمقارنةُ نصّيةٌ بعد تسويةِ الكسر: `"9000.00" === "9000"` كاذبة.
  const cents = (value: string | null): string | null => {
    if (value === null) return null;
    const [whole, fraction = ''] = String(value).split('.');
    return `${whole}.${(fraction + '00').slice(0, 2)}`;
  };

  const wageNote =
    line.wage_basic === null || line.wage_actual === null
      ? null
      : cents(line.wage_basic) === cents(line.wage_actual)
        ? 'أساسيٌّ بلا بدلات.'
        : `منه أساسيٌّ ${money(line.wage_basic) ?? EMPTY_MARK} والباقي بدلات.`;

  // 🔴 `"0.00"` سلسلةٌ صادقةٌ تمرّ من `!value` — الفحصُ بـ`isPositiveMoney` وحدَه.
  const deductionNote =
    line.deductions_amount === null
      ? null
      : !isPositiveMoney(line.deductions_amount)
        ? 'لا استقطاعَ في هذه القسيمة.'
        : isPositiveMoney(line.gosi_ee_amount)
          ? `منها حصّةُ التأمينات ${money(line.gosi_ee_amount) ?? EMPTY_MARK} — تذهب إلى التأمينات لا إلى المكتب.`
          : 'تفصيلُها في بنود الاستقطاع، ولكلّ خصمٍ قرارُ إنسانٍ مسمّى.';

  return [
    {
      key: 'monthly_wage',
      label: 'الأجرُ الشهريُّ المتّفق عليه',
      amount: money(line.wage_actual),
      note: wageNote,
    },
    {
      key: 'entitlement',
      label: 'مستحقُّ هذه المدّة',
      amount: money(line.earnings_amount),
      note: fractionSentence(proration),
    },
    {
      key: 'deductions',
      label: 'يُحسم منه',
      amount: money(line.deductions_amount),
      note: deductionNote,
    },
    {
      key: 'net',
      label: 'الصافي المُودَع',
      amount: money(line.net_amount),
      note: line.iban_last4 === null ? null : `إلى حسابٍ منتهٍ بـ${line.iban_last4}.`,
    },
  ];
}

// ══════════════════════════════════════════════════════════════════════════
// S7 — السلفُ والجزاءات: خرائطُ الأسماء ونصوصُ المواد
//
// 🔴 والقاعدةُ نفسُها: الخادمُ يرسل رمزاً والواجهةُ تبني الجملة. ورمزُ الحالة يبقى مفهوماً
// بعد سنتين، والجملةُ تتحسّن بلا مسِّ صفٍّ مجمَّد.
// ══════════════════════════════════════════════════════════════════════════

export const ADVANCE_KIND_LABELS: Record<AdvanceKind, string> = {
  salary_advance: 'سلفةٌ على الراتب',
  loan: 'قرض',
};

export const ADVANCE_STATUS_LABELS: Record<AdvanceStatus, string> = {
  pending: 'مُنحت ولم تُصرف',
  active: 'نشطة',
  paused: 'موقوفة',
  settled: 'سُدّدت',
  written_off: 'مشطوبة',
  cancelled: 'ملغاة',
};

/** ما يعنيه كلُّ حالٍ **للقسط** — وهو السؤالُ الذي يسأله من يفتح الشاشة. */
export const ADVANCE_STATUS_HINTS: Record<AdvanceStatus, string> = {
  pending: 'لا يُقترَح قسطٌ حتى يُسجَّل صرفُها — ولا يُخصَم ما لم يصل.',
  active: 'يُقترَح قسطٌ كلَّ شهرٍ في طابور القرارات، ولا يُخصَم بلا بتٍّ باسم إنسان.',
  paused: 'لا قسطَ حتى تُستأنف — والدَّينُ باقٍ كما هو في الدفتر.',
  settled: 'بلغ الرصيدُ صفراً — والحالةُ نتيجةُ الدفتر لا يدٌ كتبتها.',
  written_off: 'شُطب ما تبقّى بقرارٍ مسجَّل.',
  cancelled: 'أُلغيت قبل صرفها.',
};

export const PENALTY_KIND_LABELS: Record<PenaltyKind, string> = {
  warning: 'إنذار',
  fine: 'غرامة (م.٧٠)',
  suspension_unpaid: 'إيقافٌ بلا أجر',
  damage_recovery: 'حسمُ إتلاف (م.٩١)',
  deferred_raise: 'تأجيلُ علاوة',
  deferred_promotion: 'تأجيلُ ترقية',
};

export const PENALTY_STATE_LABELS: Record<PenaltyState, string> = {
  draft: 'مسوّدة',
  notified: 'بُلّغ به',
  final: 'نافذ',
  objected: 'مُعترَضٌ عليه',
  overturned: 'مُبطَل',
  charged: 'حُصِّل',
  refunded: 'رُدَّ',
  void: 'ملغى',
};

/** الفعلُ التالي في دورة م.٦٦–٧٣ — واحدٌ لكلّ حال، فلا يُعرَض زرّان متنافسان. */
export const PENALTY_NEXT_STEP: Record<PenaltyState, string | null> = {
  draft: 'بلّغ العاملَ ليبدأ عدُّ مهلة الاعتراض (١٥ يوماً — م.٧٢).',
  notified: 'يَنفُذ بانقضاء المهلة، أو بإقرارِ العامل صراحةً.',
  final: 'يظهر مقترحَ خصمٍ في مسير الشهر — ولا يُخصَم بلا بتٍّ باسم إنسان.',
  objected: 'ابتّ الاعتراضَ: يُبطَل أو يَنفُذ.',
  overturned: 'يُردُّ ما حُصِّل خلال سبعة أيام (م.٩١).',
  charged: null,
  refunded: null,
  void: null,
};

/** «الغرامةُ إلى صندوق العمال» — البُعدُ الذي يفرّق م.٧٣ عن حسمٍ يعود للمكتب (D14). */
export function penaltyDestination(row: { to_worker_fund: boolean; kind: PenaltyKind }): string {
  if (row.to_worker_fund) return 'حصيلتُها إلى صندوق العمال (م.٧٣) — لا إلى إيراد المكتب.';
  if (row.kind === 'damage_recovery') return 'استردادٌ للمكتب عن إتلافٍ مقدَّرٍ (م.٩١).';

  return 'جزاءٌ بلا حصيلةٍ مالية.';
}

/** عدّادُ مهلة الاعتراض — «تنتهي بعد ٤ أيام» · «انقضت قبل يومين». */
export function objectionCountdown(daysLeft: number | null): string | null {
  if (daysLeft === null) return null;
  if (daysLeft === 0) return 'مهلةُ الاعتراض تنتهي اليوم';
  if (daysLeft > 0) return `مهلةُ الاعتراض تنتهي بعد ${counted(daysLeft, DAY_FORMS)}`;

  return `انقضت مهلةُ الاعتراض قبل ${counted(Math.abs(daysLeft), { ...DAY_FORMS, one: 'يوم' })}`;
}

/** `YYYY-MM` ⇒ «سبتمبر ٢٠٢٦» — شهرُ الأثر يُقرأ لا يُحلّل. */
export function fmtMonthHuman(period?: string | null): string {
  if (!period) return EMPTY_MARK;

  const [y, m] = period.slice(0, 7).split('-').map(Number);
  if (!y || !m) return period;

  return new Date(y, m - 1, 1).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', {
    month: 'long',
    year: 'numeric',
  });
}
