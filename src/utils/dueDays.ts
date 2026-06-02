// [P4·UX-08] حساب أيام الاستحقاق/التأخّر بتوقيت الرياض (Asia/Riyadh) لا توقيت المتصفّح.
// يعالج INV-4.4 (getDueDays كان بتوقيت المتصفّح فيختلف عن الخادم في حساب التأخّر).

import type { StatusTone } from '../config/financeStatusConfig';

/** يُرجع تاريخ اليوم بصيغة YYYY-MM-DD حسب توقيت الرياض. */
function todayInRiyadh(): string {
  // en-CA ينتج الصيغة YYYY-MM-DD مباشرةً.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** يستخرج جزء التاريخ (YYYY-MM-DD) من سلسلة ISO أو تاريخ. */
function dateOnly(value: string): string {
  return value.split('T')[0];
}

/**
 * عدد الأيام حتى الاستحقاق (موجب = متبقٍّ، صفر = اليوم، سالب = متأخّر بعدد الأيام).
 * يُرجع null إذا لا تاريخ.
 */
export function getDueDays(dueDate?: string | null): number | null {
  if (!dueDate) return null;
  const today = Date.parse(`${todayInRiyadh()}T00:00:00Z`);
  const due = Date.parse(`${dateOnly(dueDate)}T00:00:00Z`);
  if (Number.isNaN(due) || Number.isNaN(today)) return null;
  return Math.round((due - today) / 86_400_000);
}

export interface DueLabel {
  text: string;
  tone: StatusTone;
}

/** وصف عربي لأيام الاستحقاق + لون token مناسب. */
export function formatDueLabel(dueDate?: string | null): DueLabel | null {
  const days = getDueDays(dueDate);
  if (days === null) return null;
  if (days < 0) return { text: `متأخرة ${Math.abs(days)} يوم`, tone: 'danger' };
  if (days === 0) return { text: 'تستحقّ اليوم', tone: 'warning' };
  if (days <= 7) return { text: `بعد ${days} يوم`, tone: 'warning' };
  return { text: `بعد ${days} يوم`, tone: 'neutral' };
}

/** عدد أيام التأخّر (موجب فقط) — للفواتير المتأخّرة. صفر إن لم تتأخّر. */
export function getOverdueDays(dueDate?: string | null): number {
  const days = getDueDays(dueDate);
  if (days === null || days >= 0) return 0;
  return Math.abs(days);
}
