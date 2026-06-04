// تحويل التاريخ الميلادي إلى هجري (أم القرى) — client-side بالكامل عبر Intl.
// ناجز يرسل تاريخ الجلسة ميلادياً فقط (sessionDate ISO)، ويعرض الهجري في واجهته
// بنفس هذه الطريقة (islamic-umalqura). فالنتيجة مطابقة لما يظهر في ناجز.
// الميلادي يبقى الأساس للترتيب والحسابات، وهذا للعرض فقط.

/**
 * يحوّل تاريخاً ميلادياً (ISO مثل "2026-06-07" أو "2026-06-07T11:40:00")
 * إلى نص هجري مقروء "21 ذو القعدة 1447 هـ" بأرقام عربية.
 * يُرجع null إذا كانت القيمة فارغة أو غير صالحة.
 */
export function toHijri(input?: string | Date | null): string | null {
  if (!input) return null;
  const date = input instanceof Date ? input : new Date(input);
  if (isNaN(date.getTime())) return null;

  try {
    const parts = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).formatToParts(date);

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
