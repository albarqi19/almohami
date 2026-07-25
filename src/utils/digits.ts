// أرقام عربية-هندية (٠١٢…) ↔ لاتينية (012…).
//
// نحتاج الاتجاهين لأن Intl بلغة عربية يُخرج أرقاماً عربية-هندية، بينما كل
// حساب ومقارنة وإرسال للسيرفر يجب أن يكون بأرقام لاتينية. الخلط بينهما هو
// سبب «تاريخ يبدو صحيحاً ويُرفض عند الحفظ».

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const EXTENDED_ARABIC_INDIC = '۰۱۲۳۴۵۶۷۸۹'; // الفارسية/الأردية — تصل من لصق المستخدم

/** يحوّل كل الأرقام غير اللاتينية في النص إلى لاتينية. */
export function toLatinDigits(value: string): string {
  let out = '';
  for (const ch of value) {
    const ai = ARABIC_INDIC.indexOf(ch);
    if (ai !== -1) { out += String(ai); continue; }
    const ei = EXTENDED_ARABIC_INDIC.indexOf(ch);
    if (ei !== -1) { out += String(ei); continue; }
    out += ch;
  }
  return out;
}

/** يحوّل الأرقام اللاتينية إلى عربية-هندية — للعرض وحده لا للتخزين. */
export function toArabicIndicDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => ARABIC_INDIC[Number(d)]);
}
