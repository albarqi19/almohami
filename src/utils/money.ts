// [P4·UX-08] توحيد عرض المبالغ بالريال السعودي.
// النظام أحادي العملة (SAR) — هذه وحدة عرض فقط، لا منطق عملات (تعدّد العملات خارج النطاق).
// الحقول المالية تصل من الباك كسلاسل نصية (decimal:2)، لذا نلفّ كل قيمة بـ toNumber أولاً.

/** تحويل قيمة (نص أو رقم أو فارغ) إلى رقم آمن. */
export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(n) ? n : 0;
}

/**
 * تنسيق مبلغ بالريال السعودي بصيغة موحّدة عبر كل شاشات الوحدة.
 * مثال: 50000 → "50,000 ر.س" · 1234.5 → "1,234.5 ر.س".
 */
export function formatSAR(value: number | string | null | undefined): string {
  const safe = toNumber(value);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safe);
  return `${formatted} ر.س`;
}

/** نسبة مئوية موحّدة بلا أصفار زائدة. مثال: 15 → "15%" · 15.5 → "15.5%". */
export function formatPercent(value: number | string | null | undefined): string {
  const safe = toNumber(value);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safe);
  return `${formatted}%`;
}
