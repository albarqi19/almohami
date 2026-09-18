import { normalizeDigits } from './saudiVat';

/**
 * [INV-P3] الآيبان السعودي في الواجهة — تطبيع وفحص بنيوي (mod-97) وتقسيم للعرض.
 * مطابق للباك (App\Support\Hr\SaudiIban + IbanText). الفحص بنيوي لا وجودي.
 */

export const SAUDI_IBAN_LENGTH = 24;

/** بلا مسافات ولا شرطات، بأرقام لاتينية وحروف كبيرة. */
export function normalizeIban(raw: string | null | undefined): string {
  return normalizeDigits(raw).toUpperCase();
}

function mod97(numeric: string): number {
  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 1) {
    remainder = (remainder * 10 + Number(numeric[i])) % 97;
  }
  return remainder;
}

export type IbanProblem = 'empty' | 'country' | 'length' | 'charset' | 'checksum' | null;

/** سبب الرفض مسمّى — كي تقول الواجهة للمستخدم ماذا يصحّح. */
export function ibanProblem(raw: string | null | undefined): IbanProblem {
  const iban = normalizeIban(raw);
  if (iban === '') return 'empty';
  if (!iban.startsWith('SA')) return 'country';
  if (iban.length !== SAUDI_IBAN_LENGTH) return 'length';
  if (!/^SA\d{22}$/.test(iban)) return 'charset';
  // ننقل البادئة وخانتي التحقق إلى النهاية ونحوّل الحروف إلى أرقام (S=28, A=10)
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
  return mod97(numeric) === 1 ? null : 'checksum';
}

export function isValidIban(raw: string | null | undefined): boolean {
  return ibanProblem(raw) === null;
}

export const IBAN_PROBLEM_MESSAGES: Record<Exclude<IbanProblem, null>, string> = {
  empty: 'أدخل رقم الآيبان.',
  country: 'الآيبان يجب أن يبدأ بـ SA (حساب في بنك سعودي).',
  length: 'الآيبان السعودي 24 خانة: SA ثم 22 رقماً. تأكد أن الرقم لم يُقصّ عند النسخ.',
  charset: 'بعد SA تأتي أرقام فقط.',
  checksum: 'رقم الآيبان غير صحيح. غالباً انقلب رقمان عند الكتابة. راجعه مع كشف الحساب.',
};

/** SA12 3456 7890 1234 5678 9012 */
export function groupIban(raw: string | null | undefined): string {
  const iban = normalizeIban(raw);
  return iban.replace(/(.{4})/g, '$1 ').trim();
}

/** رمز البنك: الخانتان بعد SA وخانتي التحقق. */
export function ibanBankCode(raw: string | null | undefined): string | null {
  const iban = normalizeIban(raw);
  return iban.length >= 6 ? iban.slice(4, 6) : null;
}

export function bankNameFromIban(raw: string | null | undefined, codes: Record<string, string>): string | null {
  const code = ibanBankCode(raw);
  return code ? codes[code] ?? null : null;
}
