/**
 * أدوات أرقام الجوال الموحّدة (دولية) — المصدر الوحيد للتطبيع/العرض/التحقق في الواجهة.
 *
 * الصيغة القانونية المتبادلة مع الـ API = E.164 مع علامة + (مثل +966501234567).
 * الدولة الافتراضية = السعودية (SA): أي رقم وطني (05XXXXXXXX) يُفسَّر سعودياً
 * حفاظاً على التوافق مع البيانات القديمة.
 */
import {
  parsePhoneNumber,
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  type CountryCode,
} from 'libphonenumber-js';

export const DEFAULT_COUNTRY: CountryCode = 'SA';

export interface CountryOption {
  code: CountryCode;
  dial: string;
  name: string;
  flag: string;
}

export interface PhoneParts {
  country: CountryCode;
  national: string;
}

/** الدول المعروضة أولاً (الخليج + الأكثر شيوعاً) قبل بقية الدول أبجدياً. */
const PRIORITY: CountryCode[] = [
  'SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'EG', 'JO', 'YE', 'SD',
  'SY', 'IQ', 'LB', 'PS', 'TR', 'US', 'GB',
];

/** خريطة الأرقام العربية-الهندية والفارسية إلى ASCII. */
const ARABIC_DIGIT_MAP: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

/** تحويل الأرقام العربية-الهندية/الفارسية في نص ما إلى ASCII (لوحات المفاتيح العربية). */
export function toAsciiDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (d) => ARABIC_DIGIT_MAP[d] ?? d);
}

/** علم الدولة كرمز تعبيري من رمز ISO (حرفان). */
function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

let regionNames: Intl.DisplayNames | null = null;
try {
  regionNames = new Intl.DisplayNames(['ar'], { type: 'region' });
} catch {
  regionNames = null;
}

/** قائمة كل الدول مرتّبة (الأولوية ثم أبجدياً بالعربية). تُحسب مرة واحدة. */
export const COUNTRIES: CountryOption[] = (() => {
  const list: CountryOption[] = getCountries().map((code) => ({
    code,
    dial: getCountryCallingCode(code),
    name: regionNames?.of(code) || code,
    flag: flagEmoji(code),
  }));

  const priorityIndex = new Map<string, number>(PRIORITY.map((c, i) => [c, i]));

  return list.sort((a, b) => {
    const pa = priorityIndex.has(a.code) ? (priorityIndex.get(a.code) as number) : Infinity;
    const pb = priorityIndex.has(b.code) ? (priorityIndex.get(b.code) as number) : Infinity;
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name, 'ar');
  });
})();

function toCandidate(value: string): string {
  const v = toAsciiDigits(value.trim());
  if (v.startsWith('+')) return v;
  const digits = v.replace(/\D/g, '');
  if (digits.startsWith('00')) return '+' + digits.slice(2);
  return v;
}

/** تفكيك أي قيمة (E.164/05.../+966...) إلى دولة + رقم وطني لتهيئة المكوّن. */
export function parsePhone(value: string | null | undefined): PhoneParts {
  if (!value || !value.trim()) {
    return { country: DEFAULT_COUNTRY, national: '' };
  }

  try {
    const parsed = parsePhoneNumber(toCandidate(value), DEFAULT_COUNTRY);
    // نشترط الصلاحية حتى لا يُفسَّر رقم دولي قديم (971…) سعودياً بالخطأ.
    if (parsed && parsed.country && parsed.isValid()) {
      return { country: parsed.country, national: parsed.nationalNumber };
    }
  } catch {
    /* نتابع للاحتياطي */
  }

  // احتياطي: رقم بصيغة دولية بلا + (مثل 966501234567)
  const digits = toAsciiDigits(value).replace(/\D/g, '');
  if (!value.trim().startsWith('+') && digits) {
    try {
      const parsed2 = parsePhoneNumber('+' + digits);
      if (parsed2 && parsed2.country) {
        return { country: parsed2.country, national: parsed2.nationalNumber };
      }
    } catch {
      /* تجاهل */
    }
  }

  return { country: DEFAULT_COUNTRY, national: digits.replace(/^0+/, '') || digits };
}

/** تركيب E.164 (+<code><digits>) من دولة + رقم وطني. تُرجع '' إن كان الرقم فارغاً. */
export function composeE164(country: CountryCode, national: string): string {
  const digits = toAsciiDigits(national || '').replace(/\D/g, '');
  if (!digits) return '';
  try {
    return '+' + getCountryCallingCode(country) + digits;
  } catch {
    return '+' + digits;
  }
}

/** هل الرقم صالح دولياً (للتحقق قبل الإرسال)؟ */
export function isValidPhone(value: string | null | undefined): boolean {
  if (!value || !value.trim()) return false;
  try {
    return isValidPhoneNumber(toCandidate(value), DEFAULT_COUNTRY);
  } catch {
    return false;
  }
}

/** صيغة عرض ودّية: وطنية لأرقام دولة العارض (05XXXXXXXX) ودولية لغيرها (+971 50 …). */
export function formatPhoneDisplay(
  value: string | null | undefined,
  viewer: CountryCode = DEFAULT_COUNTRY
): string {
  if (!value) return '';
  try {
    const parsed = parsePhoneNumber(toCandidate(value), DEFAULT_COUNTRY);
    if (parsed) {
      return parsed.country === viewer ? parsed.formatNational() : parsed.formatInternational();
    }
  } catch {
    /* تجاهل */
  }
  return value;
}

/** رابط واتساب صحيح (wa.me/<digits>) لأي رقم دولي. */
export function toWhatsappLink(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = parsePhoneNumber(toCandidate(value), DEFAULT_COUNTRY);
    // نشترط الصلاحية حتى لا يُفتح رابط واتساب لرقم مُفسَّر خطأً.
    if (parsed && parsed.isValid()) return 'https://wa.me/' + parsed.number.replace('+', '');
  } catch {
    /* تجاهل */
  }
  const digits = toAsciiDigits(value).replace(/\D/g, '');
  return digits ? 'https://wa.me/' + digits : null;
}
