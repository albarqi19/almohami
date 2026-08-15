import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hrLeaveApprovalService } from '../../../services/hrLeaveApprovalService';
import { hrLeaveService } from '../../../services/hrLeaveService';

/**
 * **خطّافاتُ سطح الاعتماد** — الطابورُ وسياقُ القرار قراءةً، والقرارُ طفرةً.
 *
 * ══════ المفاتيحُ تحت `['hr','leave']` عمداً ══════
 * كلُّ كاتبٍ في الوحدة يبطل `['hr','leave']` (عرفُ `RecordLeaveModal` و`LeaveCorrectionModal`
 * و`ConvertLegacyModal`)، فوضعُ مفاتيحي تحته يجعل الطابورَ يتحدّث حين يسجّل زميلٌ إجازةً من
 * شاشةٍ أخرى — بلا سطرٍ واحدٍ في تلك الشاشات، وبلا استطلاعٍ دوريّ.
 *
 * 🔴 **وصفرُ استطلاعٍ دوريّ**: الإبطالُ بعد القرار وحدَه. طابورُ اعتمادٍ ينبض كلَّ ثوانٍ يحرق
 * سبعةَ استعلاماتٍ لكلّ صفٍّ في كلّ نبضة (الكاشفُ يُستدعى لكلّ صفّ).
 *
 * ══════ القرارُ يبطل الرصيدَ لا القائمةَ وحدَها ══════
 * الاعتمادُ يكتب في `hr_leave_ledger` ويُنقص الرصيد، فبقاءُ الرقم القديم على الشاشة يجعل
 * المعتمِدَ يقرأ رصيداً لم يعد قائماً — ولذلك `['hr','employee']` تُبطَل معه.
 */

export const APPROVAL_KEYS = {
  queue: (limit: number) => ['hr', 'leave', 'approval-queue', limit] as const,
  decision: (leaveId: number | null) => ['hr', 'leave', 'decision', leaveId ?? 0] as const,
};

/** طابورُ المعلَّق. `retry: false` — عطلُ صلاحيةٍ أو مكتبٍ نتيجةٌ نهائيةٌ لا خللٌ عابر. */
export function useApprovalQueue(limit = 25) {
  return useQuery({
    queryKey: APPROVAL_KEYS.queue(limit),
    queryFn: () => hrLeaveApprovalService.getQueue({ limit }),
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/** سياقُ قرارٍ واحد — يُفعَّل بفتح المودال وحدَه (`leaveId !== null`). */
export function useLeaveDecision(leaveId: number | null) {
  return useQuery({
    queryKey: APPROVAL_KEYS.decision(leaveId),
    queryFn: () => hrLeaveApprovalService.getDecision(leaveId as number),
    enabled: leaveId !== null,
    retry: false,
    refetchOnWindowFocus: false,
    // يُعاد جلبُه عند كلّ فتحة: الرصيدُ والجلساتُ تتغيّران، وقرارٌ على لقطةٍ قديمةٍ قرارٌ أعمى.
    staleTime: 0,
  });
}

/**
 * الاعتماد — ينادي المسارَ القائم (`HrLeaveController@approve`) بلا نسخةٍ ثانية.
 *
 * ولا فحصَ تعارضٍ قبل الإرسال: **اللوحُ يُعلِم ولا يمنع**، والقرارُ للمدير.
 */
export function useApproveLeave() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (vars: { employeeProfileId: number; leaveId: number; notes?: string }) =>
      hrLeaveService.approve(vars.employeeProfileId, vars.leaveId, vars.notes),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['hr', 'leave'] });
      void client.invalidateQueries({ queryKey: ['hr', 'employee'] });
    },
  });
}

/** الرفض — السببُ إلزاميٌّ في الخادم، والمودالُ يمنع نداءً محكوماً بالرفض. */
export function useRejectLeave() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (vars: { employeeProfileId: number; leaveId: number; reason: string }) =>
      hrLeaveService.reject(vars.employeeProfileId, vars.leaveId, vars.reason),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['hr', 'leave'] });
      void client.invalidateQueries({ queryKey: ['hr', 'employee'] });
    },
  });
}
