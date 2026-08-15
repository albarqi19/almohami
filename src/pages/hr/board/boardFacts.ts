import { EMPTY_MARK, fmtCount } from '../leave/leaveFormat';
import { URGENT_DAYS, empName, isLawyer, remainingDays } from '../dossier/dossierFormat';
import type { EmployeeProfile, HrOfficeInfo, LeaveStats, SbaStatus } from '../../../types/hr';

/**
 * **حساباتُ اللوحة — موضعٌ واحدٌ، ومن الحسابات المشترَكة نفسِها التي يقرؤها الجدار.**
 *
 * `remainingDays` و`isLawyer` و`URGENT_DAYS` و`empName` تأتي كلُّها من
 * `dossier/dossierFormat` — لا نسخةٌ رابعةٌ منها هنا. سببُه أنّ اللوحةَ والجدارَ يقولان
 * عن التاريخ نفسِه الشيءَ نفسَه: عتبةُ ٦٠ يوماً واحدةٌ، ومعنى «منتهية» واحد.
 */

/** الحالتان اللتان تعنيان «تحقَّقت الهيئةُ من هذا المحامي» — والباقي انتظارٌ أو عطل. */
const VERIFIED_SBA: SbaStatus[] = ['verified_same_firm', 'verified_other_firm'];

/**
 * سببٌ واحدٌ يستحقّ فتحَ الملفّ.
 *
 * · `rank` شدّةٌ **نازلة** (١ أشدّ): يُختار الأشدُّ حين اجتمعت أسبابٌ لمنسوبٍ واحد.
 * · `days` أيامٌ متبقّية (سالبةٌ = مضت)، و`null` حين لا موعدَ خلف السبب.
 */
interface Reason {
  rank: number;
  text: string;
  days: number | null;
  /** المرساةُ داخل الجدار — `null` يعني «افتح الملفَّ من رأسه». */
  anchored: boolean;
}

export interface ActionRow {
  empId: number;
  name: string;
  /** المسمّى · القسم — سطرٌ ثانويٌّ تحت الاسم، وفراغٌ حين لا يُعرف أيٌّ منهما. */
  meta: string;
  reason: string;
  /** عددُ الأسباب الأخرى للمنسوب نفسِه — يُلحَق «+N». */
  extra: number;
  /** نصُّ عمود المدّة، جاهزاً. */
  duration: string;
  /**
   * **موعدٌ مضى فعلاً** ⇒ نصُّ المدّة يُقرأ أحمرَ متراصّاً. ولا يُصبغ به صفٌّ بلا موعد:
   * شرطةٌ حمراء تقول «منتهية» عن حقلٍ لا تاريخَ فيه أصلاً.
   */
  negative: boolean;
  /** أشدُّ من «يستحقّ النظر» — يصبغ عدَّ الترويسة برتقاليّ (`hrl-rule--warn`). */
  severe: boolean;
  anchored: boolean;
  /** مفتاحُ الترتيب: الأشدُّ أعلى ثمّ الأقربُ فالأبعد. */
  sortKey: number;
}

/** «منتهية منذ ١٢ يوماً» · «تنتهي اليوم» · «بعد ١٨ يوماً» — وشرطةٌ حين لا موعد. */
function durationText(days: number | null): string {
  if (days === null) return EMPTY_MARK;
  if (days < 0) return `منتهية منذ ${fmtCount(-days)} يوماً`;
  if (days === 0) return 'تنتهي اليوم';
  return `بعد ${fmtCount(days)} يوماً`;
}

function reasonsFor(emp: EmployeeProfile): Reason[] {
  const out: Reason[] = [];

  // ١) تاريخُ المباشرة — يُصفّر الاستحقاقَ إلى الأبد **صامتاً**، فهو أشدُّ ما في القائمة.
  if (!emp.hire_date) {
    out.push({ rank: 1, text: 'تاريخُ المباشرة غير مسجَّل', days: null, anchored: false });
  }

  const lawyer = isLawyer(emp);
  const licenseDays = lawyer ? remainingDays(emp.sba_license_expiry_gregorian) : null;
  const nationalIdDays = remainingDays(emp.national_id_expiry_gregorian);

  if (licenseDays !== null && licenseDays <= 0) {
    out.push({ rank: 2, text: 'الرخصة منتهية', days: licenseDays, anchored: true });
  }

  if (nationalIdDays !== null && nationalIdDays <= 0) {
    out.push({ rank: 3, text: 'الهوية منتهية', days: nationalIdDays, anchored: true });
  }

  if (licenseDays !== null && licenseDays > 0 && licenseDays < URGENT_DAYS) {
    out.push({ rank: 4, text: 'الرخصة تنتهي قريباً', days: licenseDays, anchored: true });
  }

  if (nationalIdDays !== null && nationalIdDays > 0 && nationalIdDays < URGENT_DAYS) {
    out.push({ rank: 4, text: 'الهوية تنتهي قريباً', days: nationalIdDays, anchored: true });
  }

  // ٥) محامٍ لم تُقرأ رخصتُه من الهيئة بعد — فعلُه زرُّ [تحقّق من الهيئة] في «الهوية والتوثيق».
  if (lawyer && !VERIFIED_SBA.includes(emp.sba_verification_status)) {
    out.push({ rank: 5, text: 'محامٍ لم يُتحقَّق من الهيئة', days: null, anchored: true });
  }

  return out;
}

/**
 * **صفٌّ واحدٌ لكلّ منسوبٍ لا صفٌّ لكلّ سبب** — صفّان لشخصٍ واحدٍ يضاعفان العملَ في عين
 * القارئ. يُعرض أشدُّ الأسباب ويُلحَق «+n» حين تعدّدت.
 *
 * والمرشِّحُ الحاكم `status !== 'terminated'`: رخصةٌ منتهيةٌ لمنتهي الخدمة **ليست قراراً**.
 *
 * 🩸 **لا يُقارَن طولُ هذه القائمة بـ`stats.expiring_soon` أبداً**: الخادمُ هناك يستعمل
 * `whereBetween([today, +60])` فيُسقط **المنتهيَ فعلاً** ولا يستثني منتهيَ الخدمة. رقمان
 * بمعنيين، وجمعُهما في سطرٍ واحدٍ يلد رقماً كاذباً.
 */
export function buildActionRows(employees: EmployeeProfile[]): ActionRow[] {
  const rows: ActionRow[] = [];

  employees.forEach((emp) => {
    if (emp.status === 'terminated') return;

    const reasons = reasonsFor(emp);
    if (reasons.length === 0) return;

    reasons.sort((a, b) => a.rank - b.rank || (a.days ?? 0) - (b.days ?? 0));
    const top = reasons[0];

    // خطُّ الزمن مقروءاً عمودياً: الأشدُّ بلا موعدٍ أوّلاً، ثمّ المنتهي فالأقرب، وما لا
    // موعدَ له ولا شدّةَ عليا في الذيل — فيصير العمودُ الأوّلُ قابلاً للمسح في نظرة.
    const sortKey = top.days ?? (top.rank === 1 ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY);

    rows.push({
      empId: emp.id,
      name: empName(emp, emp.id),
      meta: [emp.job_title, emp.department].filter(Boolean).join(' · '),
      reason: top.text,
      extra: reasons.length - 1,
      duration: durationText(top.days),
      negative: top.days !== null && top.days <= 0,
      severe: top.rank === 1 || (top.days !== null && top.days <= 0),
      anchored: top.anchored,
      sortKey,
    });
  });

  rows.sort((a, b) => a.sortKey - b.sortKey);
  return rows;
}

export interface DecisionItem {
  key: 'holidays' | 'uninitialized' | 'pending';
  label: string;
  count: number;
  /** يُقرأ أحمرَ متراصّاً — للبند الذي يُعطّل حساباً قائماً لا الذي ينتظر نظرة. */
  negative?: boolean;
}

/**
 * **بنودُ «قرارات المكتب» — بترتيبٍ ثابتٍ لا يتبدّل، ولا يُرسَم بندٌ عدُّه صفر.**
 *
 * الترتيبُ هو ترتيبُ الاعتماد الحقيقيّ في الوحدة: العطلُ غيرُ المعتمَدة لا تُستثنى من
 * الاحتساب، ثمّ الرصيدُ الافتتاحيُّ الذي بدونه يبقى الاستحقاقُ صفراً، ثمّ ما ينتظر توقيعاً.
 */
export function buildDecisions(stats: LeaveStats): DecisionItem[] {
  const items: DecisionItem[] = [];

  if (stats.unconfirmed_holidays > 0) {
    items.push({
      key: 'holidays',
      label: 'عطلٌ رسميّةٌ لم تُعتمد — لا تُستثنى من احتساب الإجازات',
      count: stats.unconfirmed_holidays,
    });
  }

  if (stats.uninitialized_balances > 0) {
    items.push({
      key: 'uninitialized',
      label: 'منسوبون بلا رصيدٍ افتتاحيّ — لا يُحتسب لهم استحقاق',
      count: stats.uninitialized_balances,
      negative: true,
    });
  }

  if (stats.pending_count > 0) {
    items.push({
      key: 'pending',
      label: 'إجازاتٌ قيد الاعتماد',
      count: stats.pending_count,
    });
  }

  return items;
}

/**
 * **توثيقُ المنشأة — جملةٌ واحدةٌ لموضعٍ واحد.**
 *
 * كانت تُكتب مرّتين في الشاشة نفسِها: شارةً في الرأس («منشأة غير موثّقة») وسطراً في
 * بطاقة المكتب («التوثيق — غير موثَّقة»). والخبرُ الواحدُ مكتوباً مرّتين يُقرأ خبرين،
 * ويجعل القارئَ يبحث عن الفرق بينهما ولا فرق. فبقيت في الرأس (تُرى بلا تمرير، وهي
 * حقيقةُ الرأس الوحيدة) وسقطت من البطاقة — **ورقمُ الترخيص هاجر معها** فلم يضِع.
 */
export function officeVerificationLabel(office: HrOfficeInfo): string {
  if (!office.verified) return 'منشأة غير موثّقة';
  return office.sba_license_number
    ? `منشأة موثّقة · ترخيص ${office.sba_license_number}`
    : 'منشأة موثّقة';
}

/** بندٌ فُحص فلم يُخرج عملاً — نصُّه نفيُ سببٍ من أسباب `reasonsFor`/`buildDecisions`. */
export interface ClearCheck {
  key: string;
  text: string;
}

export interface ClearScan {
  /** الملفّاتُ التي مرّت بالفحص فعلاً — منتهو الخدمة خارجَه (`buildActionRows` يستثنيهم). */
  checked: number;
  checks: ClearCheck[];
}

/**
 * **بنودُ السلامة — انعكاسُ الفحص الذي أنتج الفراغ، لا زخرفةٌ تملؤه.**
 *
 * لا يُخترع هنا رقمٌ ولا حالة: كلُّ بندٍ **نفيُ سببٍ** من الأسباب الخمسة في `reasonsFor`
 * أو من بنود `buildDecisions` الثلاثة، وقد صحّ نفيُه بالضبط لأنّ القائمتين خرجتا صفراً.
 * والعددُ `checked` هو عددُ الملفّات التي دارت عليها الحلقةُ نفسُها بالمرشِّح نفسِه.
 *
 * 🔑 **وبندٌ لم يجرِ فحصُه لا يُكتب**: في مكتبٍ بلا محامين لا تُرسَم «لا رخصةَ منتهية»
 * ولا «كلُّ محامٍ متحقَّق» — صدقٌ فارغٌ يُقرأ خبراً، وهو أوّلُ ما يجعل سطحَ التطمين يكذب.
 */
export function buildClearScan(employees: EmployeeProfile[], stats: LeaveStats): ClearScan {
  const scanned = employees.filter((emp) => emp.status !== 'terminated');
  const lawyers = scanned.filter(isLawyer).length;

  const checks: ClearCheck[] = [
    { key: 'hire', text: 'تاريخُ المباشرة مسجَّلٌ في كلّ ملفّ' },
    { key: 'nid', text: `لا هويّةَ منتهيةً ولا تنتهي خلال ${fmtCount(URGENT_DAYS)} يوماً` },
  ];

  if (lawyers > 0) {
    checks.push({
      key: 'license',
      text: `لا رخصةَ محاماةٍ منتهيةً ولا تنتهي خلال ${fmtCount(URGENT_DAYS)} يوماً`,
    });
    checks.push({ key: 'sba', text: 'كلُّ محامٍ متحقَّقٌ من الهيئة' });
  }

  checks.push({ key: 'holidays', text: `العطلُ الرسميّةُ معتمَدةٌ في تقويم ${stats.year}` });
  checks.push({ key: 'balances', text: 'كلُّ منسوبٍ له رصيدٌ افتتاحيّ' });
  checks.push({ key: 'pending', text: 'لا إجازةَ تنتظر اعتماداً' });

  return { checked: scanned.length, checks };
}
