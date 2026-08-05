// تنسيق التواريخ بالعربية — بتقويم ومنطقة زمنية **مصرَّح بهما دائماً**.
//
// ── قاعدتان تحكمان هذا الملف ─────────────────────────────────────────
//
// 1) لا نعتمد على تقويم اللغة الافتراضي أبداً. سلوك 'ar-SA' المجرّدة يتباين
//    بين إصدارات ICU ومحرّكات المتصفحات، فما يظهر ميلادياً على جهاز قد يظهر
//    هجرياً على آخر — والمستخدم لا يملك ما يميّز. نمرّر '-u-ca-gregory'
//    للميلادي و'-u-ca-islamic-umalqura' للهجري صراحةً.
//
// 2) timeZone: 'Asia/Riyadh' صريحاً. الخادم يخزّن ويحسب بتوقيت الرياض، فبلا
//    تصريح يتبع العرضُ منطقةَ جهاز المستخدم: اجتماع 00:30 يظهر في يومٍ سابق
//    لمن جهازه على توقيت مختلف، وقائمة «اليوم» تكذب.
//
// 3) ما يكتبه المستخدم في <input type="date|datetime-local"> ساعةُ حائط لا
//    لحظةٌ كونية. تمريرُه على toISOString() يزيحه إلى UTC فيصل الخادمَ ناقصاً
//    ثلاث ساعات — وهي شكوى العملاء المتكرّرة في المهام والاجتماعات. النقل في
//    الاتجاهين يجري بصيغةٍ ساذجة بلا لاحقة Z: ما كُتب هو ما يُخزَّن ويُعرَض.

import { toHijri } from './hijriDate';

const TZ = 'Asia/Riyadh';
const AR = 'ar-SA-u-ca-gregory';

// المُنسّقات على نطاق الوحدة: إنشاء Intl.DateTimeFormat يكلّف ~1.5ms،
// وشبكة تقويم واحدة 42 خلية ⇒ عشرات المللي لكل رسم لو أُنشئت داخل الحلقة.
const timeFmt = new Intl.DateTimeFormat(AR, { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const dayMonthFmt = new Intl.DateTimeFormat(AR, { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
const shortDateFmt = new Intl.DateTimeFormat(AR, { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' });
const dayKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

/** أشهر ميلادية عربية مثبّتة — لا تتبع لغة الجهاز ولا تقويمه. */
export const GREGORIAN_MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
] as const;

export const WEEKDAYS_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'] as const;

const asDate = (input: string | Date): Date => (input instanceof Date ? input : new Date(input));

/** الساعة والدقيقة بتوقيت الرياض. */
export const fmtTimeAr = (input: string | Date): string => timeFmt.format(asDate(input));

/** «الخميس ١٢ يونيو» */
export const fmtDayMonthAr = (input: string | Date): string => dayMonthFmt.format(asDate(input));

/** «١٢ يونيو ٢٠٢٦» */
export const fmtShortDateAr = (input: string | Date): string => shortDateFmt.format(asDate(input));

/** «١٢ يونيو ٢٠٢٦ (٢١ ذو القعدة ١٤٤٧ هـ)» — التأكيد البصري المزدوج. */
export function fmtDualAr(input: string | Date): string {
  const gregorian = fmtShortDateAr(input);
  const hijri = toHijri(input);
  return hijri ? `${gregorian} (${hijri})` : gregorian;
}

/** عنوان شهر ميلادي: «يوليو ٢٠٢٦» من مصفوفة مثبّتة. */
export function fmtMonthTitleAr(date: Date): string {
  return `${GREGORIAN_MONTHS_AR[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * مفتاح اليوم «YYYY-MM-DD» **بتوقيت الرياض**.
 *
 * تجميع اجتماعات التقويم بمنطقة الجهاز يضع اجتماع 00:30 في اليوم السابق
 * لمستخدم خارج المملكة. en-CA يُخرج الصيغة ISO مباشرةً بأرقام لاتينية.
 */
export function riyadhDayKey(input: string | Date): string {
  return dayKeyFmt.format(asDate(input));
}

// ── ساعة الحائط: حقولُ الإدخال والإرسالُ إلى الخادم (القاعدة 3) ──────

const pad = (n: number): string => String(n).padStart(2, '0');

/** «YYYY-MM-DD» لقيمة <input type="date"> — من حقول الوقت المحلّية لا عبر toISOString. */
export function toDateInputValue(input?: string | Date | null): string {
  if (!input) return '';
  const d = asDate(input);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** «YYYY-MM-DDTHH:mm» لقيمة <input type="datetime-local">. */
export function toDatetimeInputValue(input?: string | Date | null): string {
  if (!input) return '';
  const d = asDate(input);
  if (Number.isNaN(d.getTime())) return '';
  return `${toDateInputValue(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * عكس toDateInputValue: «YYYY-MM-DD» ⇐ منتصفُ ليلها **محلياً**. الضرورة أنّ
 * new Date('2026-08-06') يقرؤها المحرّك منتصفَ ليل UTC لا المحلي، فتنزلق إلى
 * اليوم السابق لمن جهازه غربَ غرينتش.
 */
export function fromDateInputValue(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

/**
 * «YYYY-MM-DD HH:mm:ss» كما يتوقّعها الخادم (منطقته Asia/Riyadh): بلا لاحقة Z
 * فتُخزَّن الساعة كما كتبها المستخدم. تُعيد undefined للقيم الفارغة أو الفاسدة
 * كي يسقط المفتاح من حمولة الطلب بدل إرسال قيمة كاذبة.
 */
export function toApiDatetime(input?: string | Date | null): string | undefined {
  if (!input) return undefined;
  const d = asDate(input);
  if (Number.isNaN(d.getTime())) return undefined;
  return `${toDateInputValue(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** «اليوم» / «غداً» / «الخميس ١٢ يونيو» — نسبةً إلى يوم الرياض لا الجهاز. */
export function relativeDayAr(input: string | Date): string {
  const target = riyadhDayKey(input);
  const today = riyadhDayKey(new Date());

  if (target === today) return 'اليوم';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (target === riyadhDayKey(tomorrow)) return 'غداً';

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (target === riyadhDayKey(yesterday)) return 'أمس';

  return fmtDayMonthAr(input);
}
