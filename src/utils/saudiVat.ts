/**
 * [INV-P1] الرقم الضريبي السعودي — تطبيع وفحص مطابقان للباك (App\Support\Tax\SaudiVatNumber).
 *
 * الصيغة النظامية: 15 رقماً يبدأ وينتهي بالرقم 3. وأرقام العيّنة المنشورة في أدلّة
 * الهيئة تجتاز الصيغة وليست تسجيلاً.
 */

const VAT_PATTERN = /^3\d{13}3$/;

const SAMPLE_VAT_NUMBERS = ['399999999900003', '310122393500003', '300000000000003'];

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const EASTERN_ARABIC = '۰۱۲۳۴۵۶۷۸۹';

const cc = (code: number) => String.fromCharCode(code);

/**
 * ما يُحذف قبل الفحص: NBSP، الشرطات المطبعية (2010–2015)، الفراغ الصفري وعلامات الاتجاه
 * (200B–200F، 202A–202E، 2066–2069)، والشرطة العادية. تُبنى من رموز الحروف كي لا يحمل
 * الملف محارف غير مرئية.
 */
const INVISIBLE_OR_DASH = new RegExp(
  '[' + cc(0x00a0) + cc(0x2010) + '-' + cc(0x2015) + cc(0x200b) + '-' + cc(0x200f)
    + cc(0x202a) + '-' + cc(0x202e) + cc(0x2066) + '-' + cc(0x2069) + '-]+',
  'g',
);

/** يحوّل الأرقام العربية إلى لاتينية ويحذف الفراغات والشرطات وعلامات الاتجاه. */
export function normalizeDigits(raw: string | null | undefined): string {
  return (raw || '')
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(EASTERN_ARABIC.indexOf(d)))
    .replace(/\s+/g, '')
    .replace(INVISIBLE_OR_DASH, '')
    .trim();
}

export function normalizeVatNumber(raw: string | null | undefined): string {
  return normalizeDigits(raw);
}

export function isValidVatNumber(raw: string | null | undefined): boolean {
  return VAT_PATTERN.test(normalizeVatNumber(raw));
}

export function isSampleVatNumber(raw: string | null | undefined): boolean {
  return SAMPLE_VAT_NUMBERS.includes(normalizeVatNumber(raw));
}

/** يصلح للطباعة على فاتورة ضريبية: صيغة صحيحة وليس رقم عيّنة. */
export function isUsableVatNumber(raw: string | null | undefined): boolean {
  return isValidVatNumber(raw) && !isSampleVatNumber(raw);
}

export const COMMERCIAL_REGISTRATION_PATTERN = /^\d{10}$/;

export function isValidCommercialRegistration(raw: string | null | undefined): boolean {
  return COMMERCIAL_REGISTRATION_PATTERN.test(normalizeDigits(raw));
}
