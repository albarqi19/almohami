// التقويم الهجري (أم القرى) — عرضاً وإدخالاً، عبر Intl وحدها بلا أي حزمة.
//
// ناجز يرسل تاريخ الجلسة ميلادياً فقط (sessionDate ISO)، ويعرض الهجري في
// واجهته بنفس هذه الطريقة (islamic-umalqura). فالنتيجة مطابقة لما يظهر فيه.
// الميلادي يبقى الأساس للترتيب والحسابات والتخزين، وهذا للعرض والإدخال.
//
// ── لماذا التحويل هنا لا على السيرفر ─────────────────────────────────
// الإدخال الهجري منتقٍ يتغيّر مع كل ضغطة سهم. إرساله للسيرفر يعني طلباً لكل
// ضغطة، والأسوأ: مصدرين للحقيقة قد يختلفان (ICU المتصفح مقابل ICU الخادم).
// نعكس **نفس الدالة** التي تعرض الهجري، فيستحيل أن يتناقض المعروض والمُدخل.

import { toLatinDigits } from './digits';

const DAY_MS = 86_400_000;

/**
 * هل يدعم هذا المتصفح تقويم أم القرى فعلاً؟
 *
 * ⚠️ المصيدة: ICU المقلَّص (بعض بناءات Node و WebView) **لا يرمي** على تقويم
 * غير مدعوم، بل يسقط بصمت إلى gregory. فـ try/catch وحده يعطي أرقاماً ميلادية
 * موسومة كأنها هجرية — انحرافٌ يقارب 580 سنة بلا أي خطأ ظاهر. الفحص الوحيد
 * الصادق هو سؤال المُنسّق عمّا استقرّ عليه فعلاً.
 */
export const HIJRI_OK: boolean = (() => {
  try {
    return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura')
      .resolvedOptions().calendar === 'islamic-umalqura';
  } catch {
    return false;
  }
})();

/** أشهر أم القرى بالعربية — مصفوفة مثبّتة لا تتبع لغة الجهاز. */
export const HIJRI_MONTHS_AR = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
] as const;

/**
 * حدود نافذة أم القرى في ICU — خارجها تُرجع الدوال null بدل أرقام مخترَعة.
 * (مُتحقَّق: 1317 و1501 يتحوّلان فعلاً، فالحدّ هنا أوسع من أي استعمال واقعي
 * ولا يرفض تاريخاً مشروعاً.)
 */
export const HIJRI_MIN_YEAR = 1300;
export const HIJRI_MAX_YEAR = 1600;

// المُنسّقات تُنشأ مرة واحدة: إنشاء Intl.DateTimeFormat يكلّف ~1.5ms،
// وشبكة تقويم واحدة 42 خلية ⇒ 63ms لكل رسم شهر لو أُنشئت داخل الحلقة.
const partsFormatter: Intl.DateTimeFormat | null = HIJRI_OK
  ? new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura-nu-latn', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    })
  : null;

const displayFormatter: Intl.DateTimeFormat | null = HIJRI_OK
  ? new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      timeZone: 'Asia/Riyadh',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  : null;

export interface HijriParts {
  hy: number;
  hm: number; // 1..12
  hd: number; // 1..30
}

/**
 * أجزاء التاريخ الهجري لِلحظة معطاة (بتوقيت UTC ظهراً — انظر toUtcNoon).
 */
function partsFromUtcMs(ms: number): HijriParts | null {
  if (!partsFormatter) return null;

  const parts = partsFormatter.formatToParts(new Date(ms));
  const get = (type: string) => toLatinDigits(parts.find((p) => p.type === type)?.value ?? '');

  const hy = Number(get('year'));
  const hm = Number(get('month'));
  const hd = Number(get('day'));

  if (!Number.isFinite(hy) || !Number.isFinite(hm) || !Number.isFinite(hd)) return null;
  return { hy, hm, hd };
}

/**
 * منتصف اليوم بتوقيت UTC.
 *
 * الحساب عند منتصف اليوم لا منتصف الليل: أي إزاحة منطقة أو توقيت صيفي تُحرّك
 * اللحظة بساعات، وعند منتصف الليل تكفي ساعةٌ لتقلب اليوم كله.
 */
function toUtcNoon(y: number, m: number, d: number): number {
  return Date.UTC(y, m - 1, d, 12, 0, 0);
}

/** مفتاح مقارنة رتيب: yyyymmdd هجري. */
function hijriKey(parts: HijriParts): number {
  return parts.hy * 10000 + parts.hm * 100 + parts.hd;
}

/** ميلادي → أجزاء هجرية. يقبل Date أو نص ISO. */
export function gregorianToHijriParts(input: string | Date): HijriParts | null {
  if (!HIJRI_OK) return null;

  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return null;

  // نعيد بناء اللحظة عند ظهر UTC من مكوّنات التاريخ المحلية، فلا تُزيح
  // منطقةُ الجهاز اليومَ عند الأطراف.
  return partsFromUtcMs(toUtcNoon(date.getFullYear(), date.getMonth() + 1, date.getDate()));
}

/**
 * هجري → ميلادي، بالبحث الثنائي على الأيام الميلادية.
 *
 * لماذا بحث ثنائي لا معادلة تقريبية: المتوسط 354.367 يوماً للسنة تقريبٌ
 * يتراكم خطؤه، ويحتاج مسحاً تصحيحياً بثوابت مضبوطة يدوياً. الترتيب الهجري
 * رتيبٌ مع الميلادي، فالبحث الثنائي يعطي الجواب **الدقيق** في ~16 نداءً بلا
 * ثابت واحد مخترَع — والدقة هنا ليست ترفاً: يومٌ واحد خطأ = موعد جلسة خاطئ.
 *
 * @returns مِلي ثانية UTC ظهراً، أو null إن لم يوجد اليوم (خارج النافذة).
 */
function findUtcMs(hy: number, hm: number, hd: number): number | null {
  if (!HIJRI_OK) return null;

  const target = hy * 10000 + hm * 100 + hd;

  // نافذة ميلادية تحيط بمدى أم القرى في ICU بهامش وافر
  let lo = toUtcNoon(1882, 1, 1);
  let hi = toUtcNoon(2078, 1, 1);

  // lower_bound: أصغر يوم مفتاحُه الهجري ≥ الهدف.
  // ⚠️ بلا حارس «mid === lo ⇒ اخرج»: النافذة الأخيرة (يوم واحد) تحتاج
  // اختباراً فعلياً — والخروج قبله يُرجع lo دائماً فيُخطئ في نصف الحالات
  // بالضبط (يومٌ صحيح ويومٌ فاشل بالتناوب). الحلقة تنتهي بذاتها: أيّ فرع
  // يُنفَّذ يجعل lo === hi.
  while (lo < hi) {
    const days = Math.floor((hi - lo) / DAY_MS / 2);
    const mid = lo + days * DAY_MS;

    const parts = partsFromUtcMs(mid);
    if (!parts) return null;

    if (hijriKey(parts) < target) {
      lo = mid + DAY_MS;
    } else {
      hi = mid;
    }
  }

  const found = partsFromUtcMs(lo);
  return found && hijriKey(found) === target ? lo : null;
}

/**
 * طول الشهر الهجري: 29 أو 30 يوماً (أو null خارج النافذة).
 *
 * يُستعمل لقصّ اليوم في المنتقي: من اختار 30 ثم بدّل إلى شهر من 29 يوماً
 * يُقصّ اختياره بهدوء بدل أن يُرفض إدخاله.
 */
export function hijriMonthLength(hy: number, hm: number): 29 | 30 | null {
  const first = findUtcMs(hy, hm, 1);
  if (first === null) return null;

  const after29 = partsFromUtcMs(first + 29 * DAY_MS);
  return after29 && after29.hy === hy && after29.hm === hm ? 30 : 29;
}

/**
 * هجري → نص ميلادي "YYYY-MM-DD".
 *
 * القيمة الخارجة **دائماً ميلادية**: لا نُدخل صيغةً ثانية إلى بقية التطبيق،
 * فالحقل الهجري مجرّد طريقة إدخال لا نوع بيانات.
 */
export function hijriToGregorian(hy: number, hm: number, hd: number): string | null {
  if (!HIJRI_OK) return null;
  if (hy < HIJRI_MIN_YEAR || hy > HIJRI_MAX_YEAR) return null;
  if (hm < 1 || hm > 12) return null;

  const length = hijriMonthLength(hy, hm);
  if (length === null) return null;

  // قصّ لا رفض: 30 في شهر من 29 يوماً يصير 29
  const day = Math.min(Math.max(hd, 1), length);

  const ms = findUtcMs(hy, hm, day);
  if (ms === null) return null;

  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');

  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/**
 * يحوّل تاريخاً ميلادياً إلى نص هجري مقروء "٢١ ذو القعدة ١٤٤٧ هـ".
 * يُرجع null إذا كانت القيمة فارغة أو غير صالحة أو التقويم غير مدعوم.
 */
export function toHijri(input?: string | Date | null): string | null {
  if (!input || !displayFormatter) return null;

  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return null;

  try {
    const parts = displayFormatter.formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';

    const day = get('day');
    const month = get('month');
    const year = get('year');
    if (!day || !year) return null;

    return `${day} ${month} ${year} هـ`;
  } catch {
    return null;
  }
}
