import {
  ATTENDANCE_RULE_LABELS,
  ATTENDANCE_SIGNAL_LABELS,
  ATTENDANCE_STATUS_LABELS,
} from '../../../types/hr';
import type {
  AttendanceDayRow,
  AttendanceRuleHit,
  AttendanceSignal,
  AttendanceStatus,
} from '../../../types/hr';

/**
 * دوالُّ العرض المشتركة لوحدة «الحضور والانصراف» — **مصدرٌ واحدٌ** لكلّ تاريخٍ ووقتٍ ورقمٍ
 * في الوحدة، فلا تتكرّر أربعَ نسخٍ كما تكرّر `fmtDate` في `HrModule`.
 *
 * ══════ 🔴 عقدُ الوقت مع الخادم — ساعةُ جدارِ الرياض في كلّ حقل ══════
 * كلُّ `*_at` يصل من وحدة الحضور بالشكل `Y-m-d H:i:s` **بلا `T` وبلا `Z` وبلا إزاحة**، وقيمتُه
 * ساعةُ الجدار بتوقيت الرياض. يُنفِذ العقدَ على الخادم `App\Models\Traits\SerializesRiyadhWallClock`
 * (بصمات · أيامٌ محتسَبة · ادّعاءات · قرارات) وترويستُه تحمل نصَّه كاملاً.
 *
 * وقد كُسر هذا العقدُ مرّةً بصمت: `first_in_at` كان جدارَ الرياض و`punched_at` زولو في **الردّ
 * نفسِه**، فطُبعت البصمةُ الواحدة «٠٨:٢٢» في صفّ الطابور و«٠٥:٢٢» في خطّ التفاصيل. فمَن رأى
 * ساعةً واحدةً تختلف بثلاثٍ فليفحص المُسلسِلَ على الخادم — **لا يُضاف تحويلُ منطقةٍ هنا**.
 *
 * ══════ لماذا لا يمرّ الوقتُ على `new Date` ══════
 * `new Date('2026-08-05 08:22:00')` يفسّره المتصفّحُ بمنطقته هو، فبصمةُ ٠٨:٣٠ رياض تُقرأ ٠٥:٣٠
 * لمن جهازُه UTC — وهو حرفياً عطلُ «ثلاث ساعاتٍ تُزوّر كلَّ رسالة». فالوقتُ يُقتطع من السلسلة
 * نصّاً، والتاريخُ يُبنى بـ`new Date(y, m-1, d)` **محلّياً** لا من السلسلة (الشكلُ `YYYY-MM-DD`
 * يُفسَّر UTC فينزاح يوماً كاملاً لمن جهازُه خلف غرينتش).
 *
 * ══════ 🔴 قاعدةُ `dir="ltr"` — لا تُلبَس نصّاً فيه اسمُ شهرٍ عربيّ ══════
 * `dir="ltr"` **للمحتوى اللاتينيِّ/الرقميِّ الصِّرف وحدَه** (عدّاد · نسبة · وقتٌ مجرّد). ونطاقٌ
 * يخلط اسمَ شهرٍ عربيّاً برقمٍ يُصاب بإعادةِ ترتيبٍ ثنائيةِ الاتجاه تنتزع رقمَ اليوم من شهره
 * وتُلصقه بجارِه: «05 أغسطس · 05:22» تُرسم **«05 05:22 · أغسطس»** — رقمان متجاوران بلا معنى
 * (مقيسٌ في كروم). فيُفصَل النطاقان: التاريخُ في اتجاه الصفحة، والوقتُ وحدَه في `dir="ltr"`
 * — انظر `stampParts` أدناه. 🚫 **ولا حشوَ محارفِ تحكّمٍ** (‏‎/‪) علاجاً للعرَض.
 *
 * ══════ الرقمُ المجمَّع واحد ══════
 * `late_minutes` مكوّنٌ تفسيريّ و`undertime_minutes` هو المجموع — **ولا تجمعهما دالّةٌ هنا
 * ولا في أيّ رسم**: من تأخّر ٣٠ دقيقةً وخرج في وقته يُحسب عليه ٦٠ في أوّل جمعٍ للعمودين.
 */

// إعادةُ تصدير ما تملكه وحدةُ الإجازات سلفاً — موضعٌ واحدٌ للدالّة لا نسختان.
export { errorText, fmtCount, makeClientKey, todayISO } from '../leave/leaveFormat';

/** ميلاديٌّ بأرقامٍ لاتينية وأشهرٍ عربيةٍ بالاسم — نفسُ تحكيم وحدة الإجازات. */
export const ATT_DATE_LOCALE = 'ar-SA-u-ca-gregory-nu-latn';

/** القيمةُ الغائبة تُكتب شرطةً ولا تُقرأ رقماً ولا صفراً. */
export const EMPTY_MARK = '—';

export const RANGE_ARROW = '←';

/** أسماءُ الأيام — تُقرأ من `work_date` لا من نصٍّ مخزَّن. */
const WEEKDAY_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/** `YYYY-MM-DD` ⇒ تاريخٌ **محلّيٌّ** بلا إزاحة. `null` لأيّ شكلٍ آخر. */
function localDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** «13 أغسطس 2026». */
export function fmtDate(iso?: string | null): string {
  const d = localDate(iso);
  if (d === null) return iso ? String(iso) : EMPTY_MARK;
  return d.toLocaleDateString(ATT_DATE_LOCALE, { year: 'numeric', month: 'long', day: '2-digit' });
}

/** «13 أغسطس» — بلا سنةٍ حين تكون معلومةً من السياق. */
export function fmtDayMonth(iso?: string | null): string {
  const d = localDate(iso);
  if (d === null) return iso ? String(iso) : EMPTY_MARK;
  return d.toLocaleDateString(ATT_DATE_LOCALE, { month: 'long', day: '2-digit' });
}

/** «الخميس» — اسمُ اليوم وحدَه، وهو ما يجعل «نهايةَ أسبوع» مفهومةً بلا شرح. */
export function fmtWeekday(iso?: string | null): string {
  const d = localDate(iso);
  return d === null ? EMPTY_MARK : (WEEKDAY_AR[d.getDay()] ?? EMPTY_MARK);
}

/** «الخميس 13 أغسطس» — سطرُ صفِّ اليوم في الطابور. */
export function fmtDayLine(iso?: string | null): string {
  const d = localDate(iso);
  if (d === null) return iso ? String(iso) : EMPTY_MARK;
  return `${fmtWeekday(iso)} ${fmtDayMonth(iso)}`;
}

/** المدى بسهمٍ عربيّ، ويومٌ واحدٌ يُكتب مرّةً لا مرّتين. */
export function fmtRange(from?: string | null, to?: string | null): string {
  if (!from && !to) return EMPTY_MARK;
  if (!to || from === to) return fmtDate(from);
  return `${fmtDayMonth(from)} ${RANGE_ARROW} ${fmtDate(to)}`;
}

/**
 * «08:30» — **يُقتطع من السلسلة نصّاً**، فلا يُعاد تفسيرُ جدارِ ساعة الرياض بمنطقة الجهاز.
 * ويقبل `Y-m-d H:i:s` و`Y-m-dTH:i:s` معاً.
 */
export function fmtTime(value?: string | null): string {
  if (!value) return EMPTY_MARK;
  const m = /[T ](\d{2}):(\d{2})/.exec(value);
  return m ? `${m[1]}:${m[2]}` : EMPTY_MARK;
}

/**
 * «13 أغسطس · 08:30» — للتوقيعات في **سياق الصفحة (RTL)** حيث يتّسق الترتيبُ من نفسه.
 *
 * 🚫 لا تُلبِس مخرَجَه `dir="ltr"`: فيه اسمُ شهرٍ عربيّ (انظر قاعدةَ الاتجاه في الترويسة).
 * ولنطاقٍ يلزمه عزلُ الوقت رقمياً استعمل `stampParts`.
 */
export function fmtDateTime(value?: string | null): string {
  if (!value) return EMPTY_MARK;
  const time = fmtTime(value);
  return time === EMPTY_MARK ? fmtDate(value) : `${fmtDayMonth(value)} · ${time}`;
}

/** جزآ الطابع مفصولين — `time = null` حين لا وقتَ في القيمة. */
export interface StampParts {
  date: string;
  time: string | null;
}

/**
 * 🔑 **الطابعُ نطاقين لا نطاقاً** — «13 أغسطس» + «08:30» منفصلين.
 *
 * هذه هي الوسيلةُ الصحيحة لعرض طابعٍ داخل صفٍّ يلزمه عزلُ الوقت رقمياً (`tabular-nums`
 * وعمودٌ متراصّ): يُرسم `date` في اتجاه الصفحة، ويُلبَس `time` وحدَه `dir="ltr"` — فلا يقع
 * اسمُ شهرٍ عربيٍّ داخل نطاقٍ لاتينيٍّ مفروض، ولا يُحشى محرفُ تحكّمٍ في السلسلة.
 */
export function stampParts(value?: string | null): StampParts {
  if (!value) return { date: EMPTY_MARK, time: null };
  const time = fmtTime(value);
  return time === EMPTY_MARK
    ? { date: fmtDate(value), time: null }
    : { date: fmtDayMonth(value), time };
}

/** «7س 30د» · «45د» · شرطةٌ للفراغ — والصفرُ رقمٌ صادقٌ يُكتب «0د» لا شرطة. */
export function fmtMinutes(minutes?: number | null): string {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return EMPTY_MARK;
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}د`;
  if (m === 0) return `${h}س`;
  return `${h}س ${m}د`;
}

/** نسبةٌ مئويةٌ للعرض — `null` تبقى شرطةً ولا تصير صفراً. */
export function fmtRatio(ratio?: number | null): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return EMPTY_MARK;
  return `${Math.round(ratio * 1000) / 10}٪`;
}

/**
 * نبرةُ الحالة صنفاً — **موضعٌ واحدٌ للّون وصفرُ لونٍ في JSX**.
 * 🚫 ولا تدرّجَ انضباطٍ هنا: `no_record` **محايدة** لا حمراء — واقعةٌ تقنيةٌ لا تهمة.
 */
export function statusClass(status: AttendanceStatus): string {
  return `hra-st hra-st--${status}`;
}

export function statusLabel(status: AttendanceStatus): string {
  return ATTENDANCE_STATUS_LABELS[status] ?? status;
}

/** سطرٌ واحدٌ في سرد «لماذا» — `ok` يختار العلامةَ والنبرة، والنصُّ مُركَّبٌ من الخرائط. */
export interface WhyRow {
  key: string;
  ok: boolean;
  text: string;
}

/**
 * **سردُ «لماذا»** — مركَّبٌ في الواجهة من `explain` (مؤشّراتٌ + رمزُ قاعدة) ومن خرائط
 * التسمية، **ولا نصَّ عربيَّ مخزَّنٌ في القاعدة**: تصحيحُ صياغةٍ لا يلمس صفّاً ولا مسار API.
 *
 * الترتيب: ما حسم اليومَ أوّلاً، ثمّ ما رُئي ولم يُرجَّح، ثمّ البصمات والمؤشّرات.
 */
export function whyRows(day: AttendanceDayRow): WhyRow[] {
  const rows: WhyRow[] = [];
  const explain = day.explain ?? {};
  const rule = (explain.rule ?? day.rule_hit) as AttendanceRuleHit;

  rows.push({
    key: 'rule',
    ok: rule !== 'none',
    text: rule === 'none'
      ? 'لا دليل يحدد حالة هذا اليوم'
      : `استند إلى: ${ATTENDANCE_RULE_LABELS[rule] ?? rule}`,
  });

  (explain.skipped ?? []).forEach((signal: AttendanceSignal) => {
    rows.push({
      key: `skip-${signal}`,
      ok: false,
      text: `ظهر ولم يعتمد: ${ATTENDANCE_SIGNAL_LABELS[signal] ?? signal}`,
    });
  });

  rows.push({
    key: 'punches',
    ok: day.punch_count > 0,
    text: day.punch_count > 0 ? `${day.punch_count} بصمة في هذا اليوم` : 'لا بصمات',
  });

  const sessions = explain.session_ids ?? [];
  if (sessions.length > 0) {
    rows.push({ key: 'sessions', ok: true, text: `${sessions.length} جلسة مجدولة في هذا اليوم` });
  }

  if (day.holiday_name) {
    rows.push({ key: 'holiday', ok: true, text: `عطلة: ${day.holiday_name}` });
  }

  if (day.leave_id !== null) {
    rows.push({ key: 'leave', ok: true, text: 'يغطيه قيد في سجل الإجازات' });
  }

  if (day.legacy_admin_request_id !== null) {
    rows.push({ key: 'legacy', ok: true, text: 'يغطيه طلب إداري معتمَد في النظام السابق' });
  }

  if (day.claim_id !== null) {
    rows.push({ key: 'claim', ok: true, text: 'يغطيه طلب تصحيح معتمَد' });
  }

  if (day.schedule_id === null) {
    rows.push({ key: 'schedule', ok: false, text: 'لا يوجد جدول دوام مسنَد لهذا اليوم' });
  }

  return rows;
}

/** هل اليومُ محلُّ حكمٍ بشريّ — نسخةُ `HrAttendanceDay::AMBIGUOUS_STATUSES` سلوكاً. */
export function isAmbiguous(day: AttendanceDayRow): boolean {
  return day.status === 'no_record'
    || day.status === 'incomplete'
    || day.status === 'field_work_suspected';
}

/** تصريفٌ عربيٌّ صحيح لعدد الأيام — «يوم واحد · يومان · ٣ أيام · ١٢ يوماً». */
export function daysWord(count: number): string {
  const n = Math.abs(Math.round(count));
  if (n === 0) return 'بلا أيام';
  if (n === 1) return 'يوم واحد';
  if (n === 2) return 'يومان';
  if (n <= 10) return `${n} أيام`;
  return `${n} يوماً`;
}

/** تصريفٌ عربيٌّ لعدد المنسوبين — يُستعمل في صفّ الحقائق وشريط الإجراء. */
export function peopleWord(count: number): string {
  const n = Math.abs(Math.round(count));
  if (n === 0) return 'لا أحد';
  if (n === 1) return 'موظف واحد';
  if (n === 2) return 'موظفان';
  if (n <= 10) return `${n} موظفين`;
  return `${n} موظفاً`;
}

/** أوّلُ يومٍ في الشهر الجاري بصيغة `YYYY-MM-DD` — بتقويم الجهاز لا بـ`toISOString`. */
export function monthStartISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/** إزاحةُ تاريخٍ بأيامٍ تقويمية — بتقويم الجهاز، ولا `toISOString` (تُزيح يوماً). */
export function addDaysISO(iso: string, days: number): string {
  const d = localDate(iso);
  if (d === null) return iso;
  d.setDate(d.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dd}`;
}

/**
 * طولُ مدىً تقويميٍّ **شاملاً الطرفين** — نفسُ ما يقيسه الخادم (`diffInDays + 1`).
 *
 * يمرّ بـ`localDate` كبقيّة الملفّ: `new Date('2026-08-13')` يُفسَّر UTC فينزاح يوماً كاملاً
 * لمن جهازُه خلف غرينتش، ويصير مدىً من ٣١ يوماً ٣٢ فيُردّ ٤٢٢ بلا سببٍ ظاهر.
 * `null` لأيّ طرفٍ غير صالحٍ أو لمدىً مقلوب.
 */
export function daysBetweenISO(from?: string | null, to?: string | null): number | null {
  const a = localDate(from);
  const b = localDate(to);
  if (a === null || b === null || a.getTime() > b.getTime()) return null;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
}

/** ترتيبٌ أبجديٌّ بالاسم — 🚫 **ولا ترتيبَ بالتأخير ولا لوحةَ صدارة**. */
export function byName<T extends { name: string | null }>(a: T, b: T): number {
  return (a.name ?? '').localeCompare(b.name ?? '', 'ar');
}

/**
 * 🔴 **ساعةُ المحرّك — مِرآةُ `HrAttendanceSetupController::ENGINE_HOUR/ENGINE_MINUTE`**
 * و`routes/console.php` معاً: `hr:attendance-recompute` عند ٠٤:٥٠ بتوقيت الرياض (٥٠ دقيقةً
 * بعد ساعة فصل اليوم ٠٤:٠٠ فلا يُحتسب يومٌ يمكن أن تصله بصمةٌ بعد).
 *
 * تُعرَض قبل الضغط — والردُّ نفسُه يحمل `engine_runs_at` فيُعرَض بعده. وبلا هذه الجملة يقف
 * المديرُ أمام زرٍّ ضغَطه ورقمٍ لم يتغيّر أمامه، فيظنّ العطلَ ويعيد الضغطَ مرّاتٍ.
 */
export const ENGINE_RUN_CLOCK = '04:50';

/** جملةٌ واحدةٌ تُقال في كلّ موضعٍ يَعِد بأثرٍ ليليّ — نصٌّ واحدٌ لا أربع صياغات. */
export const ENGINE_RUN_SENTENCE =
  `الاحتساب يجري ليلاً (${ENGINE_RUN_CLOCK} بتوقيت الرياض) لا فوراً. ولن يتغير أي رقم على الشاشة الآن.`;

/**
 * سقفُ تاريخ البدء المسموح — **متحفّظٌ عمداً**: الخادمُ يقبل شهراً من اليوم
 * (`Carbon::addMonth`)، وحسابُ الشهر في جافاسكربت يتجاوزه في نهايات الأشهر (٣١ أغسطس +
 * شهرٌ = ١ أكتوبر). فثمانيةٌ وعشرون يوماً تقع **دائماً** داخل ما يقبله الخادم، والفارقُ
 * أيامٌ لا يحتاجها أحدٌ في تاريخ بدءٍ يُكتب مرّة.
 */
export const SETUP_START_MAX_DAYS = 28;

