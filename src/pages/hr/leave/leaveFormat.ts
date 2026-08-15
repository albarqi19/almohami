import type { CSSProperties } from 'react';
import type {
  HrLeave,
  LeaveBlocker,
  LeaveComputationMeta,
  LeaveDurationBreakdown,
  LeavePaySlice,
  LeaveWarning,
  SickTier,
  SickWindow,
} from '../../../types/hr';

/**
 * دوالُّ العرض المشتركة لوحدة «الإجازات والغياب» — **مصدرٌ واحدٌ** لكلّ تاريخٍ ومدّةٍ
 * ورقمٍ في الوحدة، فلا تتكرّر أربعَ نسخٍ كما تكرّر `fmtDate` في `HrModule`.
 *
 * ══════ تحكيمٌ مسجَّل في التقويم والأرقام ══════
 * العرفُ القائم `toLocaleDateString('ar-SA')` يُخرج **هجرياً** في كروم، والباكُ يحسب
 * النوافذَ النظامية (م.١١٧ · سنةُ العقد في م.١١٦ و٨٠) على تواريخَ **ميلادية**. فعرضُ
 * هجريٍّ فوق حسابٍ ميلاديٍّ يجعل «النافذة تبدأ ١٤ فبراير» غيرَ قابلةٍ للمطابقة بالعين.
 * ولأنّ `ar-SA` يُخرج أرقاماً هندية تكسر تراصَّ `tabular-nums` مع أعمدة الأيام،
 * يُثبَّت التقويمُ والأرقامُ معاً في سلسلةِ لغةٍ واحدة. الأشهرُ تبقى عربيةً بالاسم.
 *
 * ══════ قاعدةُ الحواجز ══════
 * نصُّ الحاجز/التحذير يأتي من الخادم حرفياً (`message`) ولا يُترجَم هنا. ما تضيفه
 * `blockerHint`/`warningHint` هو **سطرُ «ما العمل»** فقط: جملةٌ ترشد ولا تلوم، ولا
 * تكرّر ما قاله الخادم ولا تناقضه. الشيفرةُ `code` تختار النبرةَ والأيقونة لا الكلام.
 */

// ══════════ ثوابت العرض ══════════

/** ميلاديٌّ بأرقامٍ لاتينية وأشهرٍ عربيةٍ بالاسم — انظر التحكيم أعلاه. */
export const LEAVE_DATE_LOCALE = 'ar-SA-u-ca-gregory-nu-latn';

/**
 * 🩸 **أرقامُ `<input type="date">` خارجَ سلطة الصفحة — نتيجةٌ مقيسةٌ لا ظنّ.**
 *
 * رصد المالكُ نظامَي ترقيمٍ متجاورين في نافذةٍ واحدة: التواريخُ في الحقول هندية
 * («١٥/٠٨/٢٠٢٦») وكلُّ محسوبٍ في الصفحة لاتينيّ («5.0» · «30.0») — لأنّ `LEAVE_DATE_LOCALE`
 * يثبّت `nu-latn` عمداً (انظر التحكيم أعلاه).
 *
 * وجُرّبت مصادرُ الضبط كلُّها على الحقل: `lang="en-GB"` · `lang="en"` ·
 * `lang="en-GB-u-nu-latn"` · `lang="ar-SA-u-nu-latn"` · `style="-webkit-locale:'en-GB'"` ·
 * وبلا شيء — **ستُّ صيغٍ، وكلُّها ترسم هندياً**؛ ثمّ أُعيدت التجربةُ بسياقَي `ar-SA` و`en-US`
 * فلم يتغيّر شيء. وحين شُغّل المتصفّحُ نفسُه بـ`--lang=en-GB` انقلبت **كلُّها** لاتينيةً
 * دفعةً واحدة — بما فيها الحقلُ الذي لا `lang` له.
 *
 * ⇒ الأرقامُ يرسمها **زِيُّ المتصفّح بلغة واجهته**، لا الصفحةُ ولا سِمةٌ فيها. فلا سبيلَ
 * للتوحيد إلّا بأحد بابين، وكلاهما قرارُ مالك: (١) استبدالُ المنتقي الأصليّ بمنتقٍ مكتوب،
 * أو (٢) قلبُ أرقام الوحدة كلِّها هنديةً — وهو نقضٌ للتحكيم الموثَّق أعلاه ويكسر تراصَّ
 * `tabular-nums` في أعمدة الأيام.
 *
 * ولذلك **لا تُضَف `lang` إلى حقول التاريخ هنا**: سِمةٌ لا تفعل شيئاً تُقرأ حارساً قائماً.
 * والمتاحُ فُعِل: كلُّ تاريخٍ **تكتبه الصفحةُ بنفسها** يمرّ بـ`LEAVE_DATE_LOCALE`، ومدى
 * الطلب يُعاد بخطّها في رأس لوح المعاينة ليقرأه المستخدمُ بأرقام الوحدة نفسِها.
 */

/** القيمةُ الغائبة تُكتب شرطةً ولا تُقرأ رقماً. */
export const EMPTY_MARK = '—';

/** سهمُ المدى — عرفُ `HrModule` (من ← إلى). */
export const RANGE_ARROW = '←';

/** أسماءُ الأيام كما يرسلها الخادم (`hr_weekend_days` بأحرفٍ صغيرة). */
export const WEEKDAY_AR: Record<string, string> = {
  sunday: 'الأحد',
  monday: 'الإثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة',
  saturday: 'السبت',
};

// ══════════ أرقام ══════════

/**
 * أعمدةُ `decimal:2` تُسلسَل **نصّاً** في JSON (`"5.00"`) — فكلُّ قراءةٍ تمرّ من هنا.
 * وغيرُ الرقميّ يعود صفراً بدل `NaN` الذي يتسرّب إلى الشاشة كـ«NaN يوماً».
 */
export function toNum(value?: string | number | null): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** منزلةٌ عشريةٌ **دائماً** (`5.0` لا `5`) ليتراصَّ عمودُ الأيام تحت `tabular-nums`. */
export function fmtDays(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return EMPTY_MARK;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n.toFixed(1) : EMPTY_MARK;
}

/** الإشارةُ جزءٌ من القيد: `+5.0` · `−5.0` · `0.0`. (السالبُ بعلامةٍ عربيةٍ لا بشرطة.) */
export function fmtSignedDays(value?: string | number | null): string {
  const n = toNum(value);
  if (n > 0) return `+${n.toFixed(1)}`;
  if (n < 0) return `−${Math.abs(n).toFixed(1)}`;
  return '0.0';
}

/** إشارةُ القيد رمزاً — تُقرن باللون ولا تُترك للّون وحده. */
export function signMark(value?: string | number | null): '+' | '−' | '=' {
  const n = toNum(value);
  if (n > 0) return '+';
  if (n < 0) return '−';
  return '=';
}

export function signClass(value?: string | number | null): 'is-pos' | 'is-neg' | 'is-zero' {
  const n = toNum(value);
  if (n > 0) return 'is-pos';
  if (n < 0) return 'is-neg';
  return 'is-zero';
}

/** عددٌ صحيحٌ بأرقامٍ لاتينيةٍ متراصّة. */
export function fmtCount(value?: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY_MARK;
  return String(Math.round(value));
}

/**
 * وحدةُ المدّة المحتسَبة بعد الرقم الكبير — **مصرَّفةٌ لا مُلصَقة**.
 *
 * كانت الوحدةُ نصّاً ثابتاً («يومَ عملٍ يُخصم») فتُقرأ «1.0 يومَ عملٍ يُخصم من 1 يوماً
 * تقويمياً»: عددٌ مفردٌ بتمييزِ جمعٍ، ونحوٌ مكسورٌ في أوّل ما يراه المستخدم. والتصريفُ هنا
 * لا في JSX كي يبقى نصُّ الوحدة في خريطةٍ واحدة.
 *
 * الكسرُ (٠٫٥ · ١٫٥) يأخذ صيغةَ المفرد المنصوب — «نصف يومِ عملٍ» لا تُصرَّف بالعدد.
 */
export function fmtDurationUnit(value: string | number | null | undefined, calendarBasis: boolean): string {
  const n = Math.abs(toNum(value));

  if (!Number.isInteger(n)) return calendarBasis ? 'يومٍ تقويميٍّ تُحتسب' : 'يومِ عملٍ يُخصم';

  if (calendarBasis) {
    if (n === 1) return 'يومٌ تقويميٌّ واحد يُحتسب';
    if (n === 2) return 'يومان تقويميان يُحتسبان';
    if (n <= 10) return 'أيامٍ تقويميةٍ تُحتسب';
    return 'يوماً تقويمياً يُحتسب';
  }

  if (n === 1) return 'يومُ عملٍ واحد يُخصم';
  if (n === 2) return 'يوما عملٍ يُخصمان';
  if (n <= 10) return 'أيامِ عملٍ تُخصم';
  return 'يومَ عملٍ يُخصم';
}

/**
 * ذيلُ «من … تقويمياً» بعد أيام العمل — **جملةٌ كاملةٌ بعددها** لا رقمٌ يُحقَن في نصّ.
 *
 * والرقمُ داخلَ النصّ عمداً: `dir="ltr"` على نطاقٍ يخلط عربيةً بأرقامٍ يمزّق ترتيبَ العرض،
 * ورقمٌ لاتينيٌّ مفردٌ داخل نصٍّ عربيٍّ يرسمه محرّكُ الاتجاه صحيحاً بلا أيّ وسم.
 */
export function fmtCalendarSpan(value?: string | number | null): string {
  const n = Math.abs(toNum(value));

  if (!Number.isInteger(n)) return `من ${n.toFixed(1)} يومٍ تقويميّ`;
  if (n === 1) return 'من يومٍ تقويميٍّ واحد';
  if (n === 2) return 'من يومين تقويميّين';
  if (n <= 10) return `من ${n} أيامٍ تقويمية`;
  return `من ${n} يوماً تقويمياً`;
}

/** تصريفٌ عربيٌّ صحيح: نصف يوم · يوم واحد · يومان · ٣-١٠ أيام · ما فوق يوماً. */
export function fmtDaysWord(value?: string | number | null): string {
  const n = toNum(value);
  const abs = Math.abs(n);

  if (abs === 0) return 'بلا أيام';
  if (abs === 0.5) return 'نصف يوم';
  if (!Number.isInteger(abs)) return `${abs.toFixed(1)} يوم`;
  if (abs === 1) return 'يوم واحد';
  if (abs === 2) return 'يومان';
  if (abs <= 10) return `${abs} أيام`;
  return `${abs} يوماً`;
}

// ══════════ تواريخ ══════════

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** «05 أغسطس 2026» — ميلاديٌّ بأرقامٍ لاتينية. */
export function fmtLeaveDate(value?: string | null): string {
  const d = parseDate(value);
  if (d === null) return value ? String(value) : EMPTY_MARK;

  return d.toLocaleDateString(LEAVE_DATE_LOCALE, { year: 'numeric', month: 'long', day: '2-digit' });
}

/** «05 أغسطس» — بلا سنةٍ حين تكون معلومةً من السياق. */
export function fmtLeaveDayMonth(value?: string | null): string {
  const d = parseDate(value);
  if (d === null) return value ? String(value) : EMPTY_MARK;

  return d.toLocaleDateString(LEAVE_DATE_LOCALE, { month: 'long', day: '2-digit' });
}

/** «05 أغسطس 2026 · 14:30» — للتوقيعات (مَن سجّل ومتى). */
export function fmtLeaveDateTime(value?: string | null): string {
  const d = parseDate(value);
  if (d === null) return value ? String(value) : EMPTY_MARK;

  const time = d.toLocaleTimeString(LEAVE_DATE_LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${fmtLeaveDate(value)} · ${time}`;
}

/**
 * المدى بسهمٍ عربيّ، مطويٌّ حين يشترك الطرفان في الشهر أو السنة:
 * «05 ← 09 أغسطس 2026» · «28 يوليو ← 03 أغسطس 2026» · «29 ديسمبر 2026 ← 04 يناير 2027».
 */
export function fmtLeaveRange(from?: string | null, to?: string | null): string {
  const a = parseDate(from);
  const b = parseDate(to);

  if (a === null || b === null) return `${fmtLeaveDate(from)} ${RANGE_ARROW} ${fmtLeaveDate(to)}`;
  if (a.getTime() === b.getTime()) return fmtLeaveDate(from);

  const sameYear = a.getFullYear() === b.getFullYear();
  const sameMonth = sameYear && a.getMonth() === b.getMonth();

  if (sameMonth) {
    const day = a.toLocaleDateString(LEAVE_DATE_LOCALE, { day: '2-digit' });
    return `${day} ${RANGE_ARROW} ${fmtLeaveDate(to)}`;
  }

  if (sameYear) {
    return `${fmtLeaveDayMonth(from)} ${RANGE_ARROW} ${fmtLeaveDate(to)}`;
  }

  return `${fmtLeaveDate(from)} ${RANGE_ARROW} ${fmtLeaveDate(to)}`;
}

/** تاريخُ اليوم بصيغة `YYYY-MM-DD` **بتوقيت الجهاز** — لا `toISOString` (تُزيح يوماً). */
export function todayISO(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

/** إزاحةُ تاريخٍ بعددِ أيامٍ تقويميةٍ — لأزرار «يوم · أسبوع · شهر» في المودال. */
export function shiftISO(iso: string, days: number): string {
  const d = parseDate(iso);
  if (d === null) return iso;
  d.setDate(d.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dd}`;
}

// ══════════ المستثنى — يُسمّى بالاسم لا بالعدد ══════════

type ExclusionSource = Pick<
  LeaveDurationBreakdown | LeaveComputationMeta,
  'weekend_days' | 'weekend_dates' | 'holiday_dates'
>;

/**
 * «الجمعة والسبت · اليوم الوطني» — أسماءُ ما استُبعد لا عددُه.
 * أيامُ نهاية الأسبوع تُسمّى **فقط إن وقع منها يومٌ فعلاً** داخل المدى (`weekend_dates`)،
 * فلا يُقال «استُبعدت الجمعة» في مدىً لا جمعةَ فيه.
 */
export function excludedNames(source?: ExclusionSource | null): string[] {
  if (!source) return [];

  const names: string[] = [];
  const weekendDates = Array.isArray(source.weekend_dates) ? source.weekend_dates : [];

  if (weekendDates.length > 0) {
    const days = Array.isArray(source.weekend_days) ? source.weekend_days : [];
    const labels = days.map((d) => WEEKDAY_AR[String(d).toLowerCase()] ?? String(d)).filter(Boolean);
    if (labels.length > 0) names.push(labels.join(' و'));
  }

  const holidays = source.holiday_dates ?? {};
  const holidayNames = Array.from(new Set(Object.values(holidays).map((v) => String(v)).filter(Boolean)));
  names.push(...holidayNames);

  return names;
}

/** السطرُ الجاهز: «استُبعد: الجمعة والسبت · اليوم الوطني» أو سلسلةٌ فارغةٌ حين لا استثناء. */
export function excludedLabel(source?: ExclusionSource | null): string {
  const names = excludedNames(source);
  return names.length === 0 ? '' : `استُبعد: ${names.join(' · ')}`;
}

/** العطلُ **غير المعتمَدة** داخل المدى — لم تُستثنَ، وتُسمّى كي يُتّخذ قرارٌ باعتمادها. */
export function pendingHolidayNames(source?: Pick<LeaveComputationMeta, 'pending_holiday_dates'> | null): string[] {
  if (!source?.pending_holiday_dates) return [];
  return Array.from(new Set(Object.values(source.pending_holiday_dates).map((v) => String(v)).filter(Boolean)));
}

// ══════════ شرائح الأجر ══════════

/** «5.0 يوم بأجر كامل» · «10.0 يوم بثلاثة أرباع الأجر» · «3.0 يوم بلا أجر». */
export function paySliceLabel(slice: LeavePaySlice): string {
  const ratio = toNum(slice.pay_ratio);
  const word = ratio >= 1 ? 'بأجر كامل' : ratio <= 0 ? 'بلا أجر' : `بنسبة ${Math.round(ratio * 100)}٪ من الأجر`;
  return `${fmtDays(slice.days)} يوم ${word}`;
}

// ══════════ نافذة م.١١٧ — الأوزان والامتلاء من الخادم ══════════

export interface SickTierUsage {
  tier: SickTier;
  /** وزنُ الخانة في الشريط = أيامُها. */
  weight: number;
  used: number;
  remaining: number;
  /** نسبةُ امتلاء الخانة (0..1). */
  fill: number;
  label: string;
}

function tierRemainingFromServer(window: SickWindow, ratio: number): number | null {
  if (ratio >= 1) return toNum(window.remaining_full);
  if (ratio <= 0) return toNum(window.remaining_unpaid);
  if (Math.abs(ratio - 0.75) < 0.001) return toNum(window.remaining_three_quarters);
  return null;
}

/**
 * توزيعُ المستهلَك على خانات م.١١٧ — **من أرقام الخادم أوّلاً**
 * (`remaining_full`/`remaining_three_quarters`/`remaining_unpaid`)، ولا يُلجأ إلى
 * التوزيع التسلسليّ إلّا حين لا تطابق نسبةُ الخانة أيَّ حقلٍ مُرسَل (نوعُ مكتبٍ
 * بشرائحَ غيرِ الثلاث). الأوزانُ من `tiers` لا من أرقامٍ مكتوبةٍ في JSX.
 */
export function sickTierUsage(window: SickWindow): SickTierUsage[] {
  const tiers = Array.isArray(window.tiers) ? window.tiers : [];
  let carry = toNum(window.used);

  return tiers.map((tier) => {
    const days = toNum(tier.days);
    const ratio = toNum(tier.pay_ratio);
    const fromServer = tierRemainingFromServer(window, ratio);

    let remaining: number;
    if (fromServer !== null) {
      remaining = Math.min(Math.max(fromServer, 0), days);
    } else {
      remaining = Math.max(days - Math.min(carry, days), 0);
    }

    const used = Math.max(days - remaining, 0);
    carry = Math.max(carry - Math.min(carry, days), 0);

    const label = ratio >= 1 ? 'بأجر كامل' : ratio <= 0 ? 'بلا أجر' : `${Math.round(ratio * 100)}٪ من الأجر`;

    return {
      tier,
      weight: days > 0 ? days : 1,
      used,
      remaining,
      fill: days > 0 ? Math.min(used / days, 1) : 0,
      label,
    };
  });
}

/**
 * متغيّرا الشريط (`--hrl-w` وزناً و`--hrl-f` امتلاءً) — قيمتان **من بيانات الخادم**،
 * وهما السبيلُ الوحيد لتمرير رقمٍ متغيّرٍ إلى ورقة الأنماط. لا قاعدةَ تخطيطٍ هنا:
 * العرضُ والحدودُ والألوانُ كلُّها في `hr-leave.css`، وهذا يمرّر الرقمَ وحدَه.
 */
export function meterVars(weight: number, fill: number): CSSProperties {
  const w = Number.isFinite(weight) && weight > 0 ? weight : 1;
  const f = Number.isFinite(fill) ? Math.min(Math.max(fill, 0), 1) : 0;

  return { '--hrl-w': w, '--hrl-f': `${(f * 100).toFixed(2)}%` } as CSSProperties;
}

// ══════════ الحواجز والتحذيرات — نبرةٌ وأيقونةٌ وسطرُ «ما العمل» ══════════

export type FlagTone = 'block' | 'warn' | 'info';

/**
 * سطرُ الإرشاد لكلّ حاجز — **يُعرض تحت رسالة الخادم لا بدلاً منها**.
 * صيغتُه أمرٌ للمستقبل لا حكمٌ على الماضي: «سجّل…» «اختر…» «اعتمد…» — ولا كلمةَ
 * لومٍ ولا «خطأ» ولا «غير مسموح»؛ المستخدمُ هنا يوثّق واقعةً حدثت فعلاً.
 */
const BLOCKER_HINTS: Record<string, string> = {
  invalid_range: 'اضبط تاريخ النهاية ليكون في يوم البداية أو بعده.',
  overlap: 'للموظف واقعةٌ مسجَّلةٌ في هذه الأيام — عدّل المدى، أو صحّح الواقعة القائمة من سجلّها.',
  half_day_on_range: 'سجّل نصفَ اليوم الأول صفّاً، والأيامَ الكاملة صفّاً، ونصفَ اليوم الأخير صفّاً.',
  half_day_not_allowed: 'أزِل علامةَ نصف اليوم، أو اختر نوعاً يقبل أنصاف الأيام.',
  half_day_calendar_basis: 'هذا النوع يُحسب بأيام التقويم — أزِل علامةَ نصف اليوم.',
  type_inactive: 'اختر نوعاً مفعَّلاً؛ والنوعُ المعطَّل يبقى في السجلّات القديمة كما هو.',
  after_termination: 'إن كانت الواقعة قبل إنهاء الخدمة فاضبط المدى عليها، وإلّا فلا تُسجَّل على عقدٍ منتهٍ.',
  sick_window_edge: 'اضبط النهاية على آخر يومٍ قبل ذكرى النافذة، ثم سجّل الباقي صفّاً ثانياً.',
  sick_window_backdated: 'سجّل اليومَ المرضيَّ الأقدم قبل الأحدث كي تُحسب الشرائح بترتيب وقوعها.',
  // ── تحويلُ الطلبات الإدارية (D-LGC) ──
  legacy_pending: 'اذهب إلى «الطلبات الإدارية» واعتمِد الطلبَ أو ارفضه، ثم عُد لتحويله.',
  legacy_rejected: 'المرفوضُ ليس واقعةً وقعت — لا يُسجَّل في دفتر الإجازات.',
  legacy_no_dates: 'أضِف تاريخ البداية في «الطلبات الإدارية»، أو سجّل الواقعة يدوياً من «تسجيل غياب».',
  legacy_already_converted: 'افتح سجلَّ الإجازة الناتج من عمود «السجلّ» — ولا يُحوَّل الطلبُ مرّتين.',
  balance_not_initialized: 'اضغط «تهيئة الأرصدة» أوّلاً واختر معنى الرقم (استحقاقٌ كامل أم متبقٍّ)، ثمّ حوّل.',
  negative_balance_unacknowledged: 'إن كان سجلُّك يقول إنّه أخذ أكثرَ من استحقاقه فأقِرَّ بذلك؛ وإلّا فراجع الرصيدَ الافتتاحيّ.',
};

/**
 * سطرُ الإرشاد للتحذيرات — تُعرض ولا تمنع. الصمتُ هنا مقصود: تحذيرٌ لا فعلَ بعده
 * (كـ`floor_applied`) لا يُلحَق به سطرٌ يخترع فعلاً.
 */
const WARNING_HINTS: Record<string, string> = {
  pending_holiday_in_range: 'اعتمد العطلة من «التقويم الرسمي» ثم أعِد الاحتساب كي تُستثنى.',
  missing_attachment: 'أرفِق المستند من مستندات الموظف — أو سجّل الآن وأرفِقه لاحقاً.',
  missing_event_date: 'أدخِل تاريخ الواقعة كي يُحلّ النظامُ بنسخته يومَها.',
  not_initialized: 'هيّئ رصيد الإجازات كي يبدأ الاستحقاق؛ والتسجيلُ مسموحٌ قبل التهيئة.',
  no_hire_date: 'أضِف تاريخ المباشرة في ملفّ الموظف كي تُحسب سنةُ العقد على أساسه.',
  no_working_days: 'المدى كلُّه عطلٌ ونهايةُ أسبوع — راجع التواريخ إن لم يكن ذلك مقصوداً.',
  accrual_drift: 'شغّل مطابقةَ الاستحقاق أو راجع المرساة؛ والرقمُ المعروض هو رقمُ الدفتر.',
  art116_threshold: 'راجع عقد الموظف قبل تجاوز عتبة المادة ١١٦.',
  art80_threshold: 'وثّق الإنذارات خارج المنصّة؛ لا يُسجَّل هنا إنذارٌ ولا يُحتسب.',
  art117_cap_exceeded: 'ما يتجاوز سقفَ النافذة يُسجَّل بلا أجر — راجع الشرائح قبل الحفظ.',
  exceeds_max_days_per_event: 'قصِّر المدى إلى الحدّ النظاميّ، أو سجّل الزائد نوعاً آخر.',
  outside_claim_window: 'الواقعة خارج نافذة المطالبة — سجّلها إن كانت موثّقةً، ودوّن السبب.',
  min_service_not_met: 'راجع تاريخ المباشرة؛ الاستحقاق يبدأ بعد اكتمال مدّة الخدمة.',
  probation: 'الموظف في فترة التجربة — راجع سياسة المكتب قبل الاعتماد.',
  chain_settled: 'صُفّيت سلسلةُ هذا النوع — لا يُخصم بعدها رصيدٌ ولا يُضاف.',
  profile_autocreated: 'أُنشئ ملفُّ موارد بشرية لهذا المنسوب — أكمِل بياناته من صفحته.',
  art151_min_postnatal: 'راجع الحدّ الأدنى لإجازة ما بعد الوضع قبل التقصير.',
  floor_applied: '',
};

export function blockerHint(code?: string | null): string {
  return (code && BLOCKER_HINTS[code]) || '';
}

export function warningHint(code?: string | null): string {
  return (code && WARNING_HINTS[code]) || '';
}

/** الشيفرةُ تختار النبرةَ وحدَها — والنصُّ من الخادم دائماً. */
export function warningTone(code?: string | null): FlagTone {
  const loud = ['art117_cap_exceeded', 'art116_threshold', 'art80_threshold', 'accrual_drift', 'chain_settled'];
  return code && loud.includes(code) ? 'warn' : 'info';
}

/** عنوانٌ قصيرٌ فوق رسالة الخادم — لا يستبدلها. */
export function flagTitle(tone: FlagTone): string {
  if (tone === 'block') return 'يمنع الحفظ';
  if (tone === 'warn') return 'انتبه';
  return 'للعلم';
}

/** مقترحُ القسمة القادم مع `sick_window_edge` — يُقرأ من `data` ولا يُخترع. */
export function splitProposalOf(blocker: LeaveBlocker): Array<{ start: string; end: string }> {
  const raw = blocker.data?.split_proposal;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((row) => (row && typeof row === 'object' ? (row as { start?: unknown; end?: unknown }) : null))
    .filter((row): row is { start?: unknown; end?: unknown } => row !== null)
    .map((row) => ({ start: String(row.start ?? ''), end: String(row.end ?? '') }))
    .filter((row) => row.start !== '' && row.end !== '');
}

/** مفتاحُ لونِ النوع ⇒ صنفٌ يضبط `--hrl-k` — موضعٌ واحدٌ للّون، وصفرُ لونٍ في JSX. */
export function colorClass(colorKey?: string | null): string {
  return `hrl-k--${colorKey ?? 'other'}`;
}

/** ما يُعرض اسماً للنوع: لقطةُ الصفّ أوّلاً (حصانةُ الماضي) ثم النوعُ الحيّ. */
export function leaveTypeName(leave: Pick<HrLeave, 'type_name_snapshot' | 'leave_type'>): string {
  return leave.type_name_snapshot || leave.leave_type?.name || EMPTY_MARK;
}

/** ما يُعرض مرجعاً نظامياً: لقطةُ المادة يوم الواقعة ثم مرجعُ النوع الحيّ. */
export function leaveArticleRef(leave: Pick<HrLeave, 'statute_snapshot' | 'leave_type'>): string {
  return leave.statute_snapshot?.article_ref || leave.leave_type?.legal_reference || '';
}

/** رسالةُ خطأٍ صالحةٌ للعرض — الخادمُ يرسل عربيةً، والاحتياطيُّ لا يترك الشاشة صامتة. */
export function errorText(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error !== '') return error;
  return fallback;
}

/** فرزٌ ثابت: الحواجز قبل التحذيرات، وترتيبُ الخادم محفوظٌ داخل كلٍّ. */
export function orderedFlags(
  blockers: LeaveBlocker[] | undefined,
  warnings: LeaveWarning[] | undefined
): Array<{ tone: FlagTone; code: string; message: string; hint: string; data: Record<string, unknown> }> {
  const rows: Array<{ tone: FlagTone; code: string; message: string; hint: string; data: Record<string, unknown> }> = [];

  (blockers ?? []).forEach((b) => {
    rows.push({ tone: 'block', code: String(b.code), message: b.message, hint: blockerHint(String(b.code)), data: b.data ?? {} });
  });

  (warnings ?? []).forEach((w) => {
    rows.push({
      tone: warningTone(String(w.code)),
      code: String(w.code),
      message: w.message,
      hint: warningHint(String(w.code)),
      data: w.data ?? {},
    });
  });

  return rows;
}

/**
 * مفتاحُ التكرار (C-19): ٣٢ حرفاً بلا شرطات — حدُّ التحقّق في الباك `max:32` بينما
 * `crypto.randomUUID()` ٣٦ حرفاً. والاحتياطيُّ ليس ترفاً: `randomUUID` **غيرُ معرَّفٍ
 * خارج السياق الآمن** (http على شبكةٍ محلية)، وغيابُه بلا بديلٍ يُسقط حجرَ الزاوية.
 */
export function makeClientKey(): string {
  const g = typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto | undefined) : undefined;

  if (g && typeof g.randomUUID === 'function') {
    return g.randomUUID().replace(/-/g, '').slice(0, 32);
  }

  if (g && typeof g.getRandomValues === 'function') {
    const bytes = g.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  }

  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`.padEnd(32, '0').slice(0, 32);
}
