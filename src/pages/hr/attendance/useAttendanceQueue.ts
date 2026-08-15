import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hrAttendanceService } from '../../../services/hrAttendanceService';
import type { DecidePayload } from '../../../services/hrAttendanceService';
import type { AttendanceDayRow, AttendanceQueueGroup, SuggestionKind } from '../../../types/hr';

/**
 * حالةُ الطابور وأفعالُه — **التحديدُ المتعدّد بقرارٍ واحدٍ وسببٍ واحد**.
 *
 * ══════ لماذا هذا الملفّ موجودٌ أصلاً ══════
 * عند المؤشّر الصحّيّ نفسِه (٥٪) على ٤٦٢ موظفاً = ~٤٦٠ قراراً شهرياً. تصنيفُ أربعين يوماً
 * في أربعين نقرةً يجعل المديرَ يغلق التبويبَ في الأسبوع الأول، **والوحدةُ المهجورة تُنتج
 * أسوأ رقمٍ ممكن: لا رقمَ إطلاقاً**. فالتحديدُ المتعدّد ليس راحةً بل شرطُ بقاء.
 *
 * ══════ التحديدُ مقصورٌ على موظفٍ واحد — وهو قيدُ الخادم لا اختيارُ ذوق ══════
 * `POST /hr/attendance/resolutions` يأخذ `employee_profile_id` **واحداً** و`dates[]`. فتحديدُ
 * يومٍ لموظفٍ آخر **يُبدّل** المُحدَّد بدل أن يضيف إليه — وإلّا لَبدت للمستخدم إمكانيةٌ
 * يرفضها الخادمُ عند الإرسال، وهو أسوأُ من منعٍ واضح.
 *
 * 🔴 **صفرُ `refetchInterval` وصفرُ `setInterval`**: التحديثُ بفعل المستخدم أو بعد كلّ قرار.
 */

/** مفتاحُ الكاش — مصفوفةٌ تبدأ بـ`'hr'` (عرفُ الوحدة)، والإبطالُ يمسّ `['hr','attendance']`. */
export const ATT_KEYS = {
  all: ['hr', 'attendance'] as const,
  day: (date: string) => ['hr', 'attendance', 'day', date] as const,
  queue: (from: string, to: string) => ['hr', 'attendance', 'queue', from, to] as const,
  employee: (id: number, from: string, to: string) =>
    ['hr', 'attendance', 'employee', id, from, to] as const,
  claims: (status: string) => ['hr', 'attendance', 'claims', status] as const,
  mine: (from: string, to: string) => ['hr', 'attendance', 'mine', from, to] as const,
  health: ['hr', 'attendance', 'setup-health'] as const,
  schedules: ['hr', 'attendance', 'schedules'] as const,
};

/** دقيقةٌ واحدةٌ من الطزاجة: يمنع نداءً ثانياً عند التنقّل بين الأعمدة، ولا يُخفي قراراً. */
const STALE = 60_000;

export function useAttendanceDay(date: string) {
  return useQuery({
    queryKey: ATT_KEYS.day(date),
    queryFn: () => hrAttendanceService.getDay(date),
    staleTime: STALE,
    retry: false,
  });
}

export function useAttendanceQueue(from: string, to: string) {
  return useQuery({
    queryKey: ATT_KEYS.queue(from, to),
    queryFn: () => hrAttendanceService.getQueue({ from, to }),
    staleTime: STALE,
    retry: false,
  });
}

export function useAttendanceEmployee(profileId: number | null, from: string, to: string) {
  return useQuery({
    queryKey: ATT_KEYS.employee(profileId ?? 0, from, to),
    queryFn: () => hrAttendanceService.getEmployee(profileId as number, { from, to }),
    enabled: profileId !== null,
    staleTime: STALE,
    retry: false,
  });
}

// ══════════ التحديد ══════════

export interface QueueSelection {
  profileId: number;
  dates: string[];
}

export interface SelectionApi {
  selection: QueueSelection | null;
  count: number;
  isOn: (profileId: number, date: string) => boolean;
  toggle: (profileId: number, date: string) => void;
  setGroup: (profileId: number, dates: string[]) => void;
  clear: () => void;
}

export function useQueueSelection(): SelectionApi {
  const [selection, setSelection] = useState<QueueSelection | null>(null);

  const isOn = useCallback(
    (profileId: number, date: string) =>
      selection !== null && selection.profileId === profileId && selection.dates.includes(date),
    [selection]
  );

  const toggle = useCallback((profileId: number, date: string) => {
    setSelection((current) => {
      // موظفٌ آخر ⇒ تحديدٌ جديدٌ لا إضافة: القرارُ الجماعيّ لموظفٍ واحدٍ بحكم المسار.
      if (current === null || current.profileId !== profileId) {
        return { profileId, dates: [date] };
      }

      const dates = current.dates.includes(date)
        ? current.dates.filter((d) => d !== date)
        : [...current.dates, date];

      return dates.length === 0 ? null : { profileId, dates };
    });
  }, []);

  const setGroup = useCallback((profileId: number, dates: string[]) => {
    setSelection(dates.length === 0 ? null : { profileId, dates: [...dates] });
  }, []);

  const clear = useCallback(() => setSelection(null), []);

  return {
    selection,
    count: selection?.dates.length ?? 0,
    isOn,
    toggle,
    setGroup,
    clear,
  };
}

/**
 * الاقتراحُ المشترَك للمُحدَّد — **الزرُّ الأوّل لا يظهر إلّا حين تتّفق الأيامُ كلُّها عليه**.
 *
 * زرٌّ يقول «سجّله عملاً ميدانياً» فوق تحديدٍ نصفُه بصماتٌ ناقصة يَعِد بما لا يفعل؛ وحين
 * تختلف الأيامُ يبقى «حضرَ بلا سجلّ» وحدَه — وهو الصالحُ لكلّ يومٍ ملتبسٍ بلا استثناء.
 */
export function sharedSuggestion(
  group: AttendanceQueueGroup | null,
  dates: string[]
): SuggestionKind | null {
  if (group === null || dates.length === 0) return null;

  const kinds = new Set<SuggestionKind>();

  group.days.forEach((day: AttendanceDayRow) => {
    if (day.work_date !== null && dates.includes(day.work_date) && day.suggestion) {
      kinds.add(day.suggestion.label_key);
    }
  });

  return kinds.size === 1 ? Array.from(kinds)[0] : null;
}

/** أيامُ مجموعةٍ بترتيب الخادم (الأقدمُ أوّلاً) — تواريخُ نظيفةٌ بلا فراغات. */
export function groupDates(group: AttendanceQueueGroup): string[] {
  return group.days
    .map((day) => day.work_date)
    .filter((date): date is string => typeof date === 'string' && date !== '');
}

// ══════════ الكتابة ══════════

/**
 * القرارُ الجماعيّ. **يُبطل `['hr','attendance']` كلَّه** بعد النجاح: القرارُ يغيّر الطابورَ
 * وشاشةَ اليوم وسجلَّ الموظف معاً، فالإبطالُ الدقيقُ هنا يترك عمودين يكذبان.
 */
export function useDecideDays() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: DecidePayload) => hrAttendanceService.decide(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ATT_KEYS.all });
    },
  });
}

/** اعتمادُ ادّعاءٍ — يُنشئ بصماتٍ لـ`missing_punch` ويوسم الأيامَ لإعادة الاحتساب. */
export function useApproveClaim() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (claimId: number) => hrAttendanceService.approveClaim(claimId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ATT_KEYS.all });
    },
  });
}

export function useRejectClaim() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (vars: { claimId: number; reason: string }) =>
      hrAttendanceService.rejectClaim(vars.claimId, vars.reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ATT_KEYS.all });
    },
  });
}

/** إنشاءُ ادّعاءٍ من المدير عن موظف — نفسُ المسار الذي يستعمله الموظفُ عن نفسه غيرُ متاح،
 *  فالمدير يكتبه من بوّابته هو؛ وهذه تُستعمل في بوّابة الموظف حصراً. */
export function useCreateMyClaim() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: hrAttendanceService.createMyClaim,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ATT_KEYS.all });
    },
  });
}

/** بصمةُ الموظف — تُبطل سجلَّه فيظهر أثرُ النقرة فوراً بلا استطلاع. */
export function usePunch() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (vars: { direction: 'in' | 'out'; clientKey: string }) =>
      hrAttendanceService.punch(vars.direction, vars.clientKey),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ATT_KEYS.all });
    },
  });
}

/**
 * مجموعةُ الموظف المُحدَّد من حمولة الطابور — بحثٌ واحدٌ مُذكَّرٌ بدل بحثٍ في كلّ تصيير.
 */
export function useSelectedGroup(
  groups: AttendanceQueueGroup[] | undefined,
  profileId: number | null
): AttendanceQueueGroup | null {
  return useMemo(() => {
    if (!groups || profileId === null) return null;
    return groups.find((g) => g.employee.id === profileId) ?? null;
  }, [groups, profileId]);
}
