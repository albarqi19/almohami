import type { LucideIcon } from 'lucide-react';

/**
 * **مراسي الجدار والقفزُ إليها — وحدةُ بياناتٍ لا مكوّن.**
 *
 * يقرؤها الجدارُ (فيلبسها أقسامَه) وشريطُ القفز وشريطُ «ما يستحقّ الفعل» معاً. وسلسلةُ
 * مرساةٍ مكتوبةٌ يدوياً في مكوّنٍ ثانٍ هي عينُ ما يجعل بنداً يقفز إلى العدم بعد إعادة
 * تسميةٍ صامتة.
 *
 * وسببُ كونها ملفّاً مستقلّاً لا تصديراً من `DossierJumpBar`: ملفُّ مكوّنٍ يصدّر ثوابتَ
 * ودوالَّ يُسقِط التحديثَ السريع (`react-refresh/only-export-components`) — فيصير كلُّ
 * تعديلٍ في شريط القفز إعادةَ تحميلٍ كاملةً تُفقِد حالةَ الشاشة.
 */
export const SEC = {
  card: 'hrl-sec-card',
  leave: 'hrl-sec-leave',
  contracts: 'hrl-sec-contracts',
  docs: 'hrl-sec-docs',
  letters: 'hrl-sec-letters',
  onboarding: 'hrl-sec-onboarding',
  identity: 'hrl-sec-identity',
  pay: 'hrl-sec-pay',
} as const;

export interface JumpSection {
  /** مرساةُ القسم — **المصدرُ نفسُه** الذي يلبسه العنصر في الجدار. */
  id: string;
  label: string;
  icon: LucideIcon;
  /** يُعرض حين > 0 فقط — لا صفرَ ولا شرطةَ في شريطِ قفز. */
  count?: number;
}

/**
 * **القفزُ إلى مرساةٍ — تنفيذٌ واحدٌ يستعمله الشريطان.**
 *
 * يكتب المرساةَ بـ`history.replaceState` لا بالراوتر: فلا تُعاد تهيئةُ الشجرة، ويبقى
 * الرابطُ قابلاً للنسخ، وتحمله `HrModule` عند تبديل الموظف (`select`) فيهبط القارئُ في
 * القسم نفسِه من الملفّ التالي.
 *
 * يُرجع `false` حين لا مرساةَ بذلك المعرّف (قسمٌ لم يُركَّب لصلاحيةٍ ناقصة مثلاً)،
 * فلا يُكتب في العنوان مرساةٌ لا تُوجد.
 */
export function scrollToSection(id: string): boolean {
  const el = document.getElementById(id);
  if (!el) return false;

  el.scrollIntoView({ block: 'start' });
  window.history.replaceState(null, '', `${window.location.pathname}#${id}`);
  return true;
}
