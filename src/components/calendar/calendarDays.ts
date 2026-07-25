import { riyadhDayKey } from '../../utils/dateAr';

export interface CalendarCell {
  date: Date;
  key: string;
  /** يوم من الشهر المجاور — يُعرض باهتاً لا فارغاً */
  outside: boolean;
  today: boolean;
}

/**
 * شبكة الشهر: **42 خلية دائماً** (ستة أسابيع)، تبدأ بالأحد.
 *
 * قراران يستحقّان التوضيح:
 *
 * 1) عدد ثابت لا متغيّر: شهرٌ يبدأ يوم سبت يحتاج ستة أسابيع وآخر يكتفي بخمسة،
 *    فالشبكة المتغيّرة تجعل ارتفاع الصفحة يقفز مع كل تبديل شهر — وهو أكثر ما
 *    يجعل تقويماً يبدو «غير مصقول».
 *
 * 2) أيام الشهر المجاور تُعرض باهتة لا فارغة: الخلية الفارغة تقول «لا شيء
 *    هنا» وهي كذبة — قد يكون فيها اجتماع فعلاً، ونطاق الجلب يغطّيها.
 */
export function buildMonthGrid(cursor: Date): CalendarCell[] {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  // الأحد أول الأسبوع (اتفاقية التقويم السعودي)
  const start = new Date(year, month, 1 - firstOfMonth.getDay());

  const todayKey = riyadhDayKey(new Date());

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = riyadhDayKey(date);

    return {
      date,
      key,
      outside: date.getMonth() !== month,
      today: key === todayKey,
    };
  });
}

/** الشهر السابق/التالي بلا انزلاق عند الأشهر ذات 31 يوماً. */
export function shiftMonth(cursor: Date, delta: number): Date {
  return new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1);
}

/** «YYYY-MM» — ما يطلبه مسار /calendar. */
export function monthParam(cursor: Date): string {
  return `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
}
