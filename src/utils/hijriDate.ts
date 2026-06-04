// تنسيق التاريخ الهجري الخام القادم من ناجز.
// ناجز يصل بصيغة مطبّعة YYYY-MM-DD (مثل 1445-08-15). الميلادي يبقى الأساس،
// وهذا للعرض فقط بجانب التاريخ الميلادي.

const HIJRI_MONTHS = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الآخر',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة',
];

/**
 * يحوّل النص الهجري الخام (1445-08-15) إلى صيغة مقروءة "15 شعبان 1445 هـ".
 * إن لم يطابق الصيغة المتوقّعة، يُرجع النص الخام كما هو (مع لاحقة هـ إن كان رقمياً).
 * يُرجع null إذا كانت القيمة فارغة.
 */
export function formatHijriRaw(raw?: string | null): string | null {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;

  // الصيغة المطبّعة من ناجز: YYYY-MM-DD أو YYYY/MM/DD
  const m = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const year = m[1];
    const monthIdx = parseInt(m[2], 10) - 1;
    const day = parseInt(m[3], 10);
    const monthName = HIJRI_MONTHS[monthIdx] ?? m[2];
    return `${day} ${monthName} ${year} هـ`;
  }

  // نص هجري وصفي مسبقاً (مثل "15 شعبان") — أعرضه كما هو
  return value;
}
