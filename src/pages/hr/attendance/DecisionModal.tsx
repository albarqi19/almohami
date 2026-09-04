import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { X } from 'lucide-react';

import { ATTENDANCE_MAX_DECISION_DATES } from '../../../types/hr';
import type { AttendanceDecisionSkip } from '../../../types/hr';
import { useDecideDays } from './useAttendanceQueue';
import { daysWord, errorText, fmtDayLine } from './attendanceFormat';

/**
 * **القرارُ الجماعيّ** — موظفٌ واحدٌ، أيامٌ متعدّدة، **سببٌ واحدٌ يُكتب مرّة**.
 *
 * القيمةُ المكتوبةُ من هذه الشاشة **واحدةٌ لا غير**: `present_confirmed` — شهادةُ إنسانٍ بأنه
 * حضر. 🚫 **ولا قيمةَ اسمُها غياب**: الغيابُ يُسجَّل في `hr_leaves` بفعلِ إنسانٍ مسمّى فيلتقطه
 * عدّادُ المادة ٨٠، وقيمةٌ هنا تفتح دفتراً ثانياً تقول فيه الشاشةُ ١٢ ويقول العدّادُ صفراً.
 *
 * والسببُ **يُقرأ بعد سنةٍ في نزاع** — فحدُّه عشرةُ أحرفٍ يفرضه الخادم، ويُقال هنا قبل
 * المحاولة لا بعد الرفض. والأيامُ التي يرفضها الخادمُ تُعرض **مفصَّلةً برسالتها** ولا تُبتلع.
 */

interface Props {
  employee: { id: number; name: string | null };
  dates: string[];
  /** نصٌّ مقترَحٌ من دليل الاقتراح — يُملأ ويبقى قابلاً للتحرير، ولا يُرسَل بلا قراءة. */
  defaultReason?: string;
  onClose: () => void;
  onDone: () => void;
}

/** حدُّ السبب في الخادم (`HrAttendanceController::MIN_REASON`). */
const MIN_REASON = 10;

export const DecisionModal: React.FC<Props> = ({
  employee,
  dates,
  defaultReason = '',
  onClose,
  onDone,
}) => {
  const [reason, setReason] = useState(defaultReason);
  const [skipped, setSkipped] = useState<AttendanceDecisionSkip[]>([]);
  const decide = useDecideDays();

  const tooMany = dates.length > ATTENDANCE_MAX_DECISION_DATES;

  const submit = async () => {
    const clean = reason.trim();

    if (clean.length < MIN_REASON) {
      toast.error(`اكتب سببا لا يقل عن ${MIN_REASON} أحرف. يحفظ في سجل اليوم للرجوع إليه.`);
      return;
    }

    if (tooMany) {
      toast.error(`الحد الأقصى ${ATTENDANCE_MAX_DECISION_DATES} يوما في القرار الواحد.`);
      return;
    }

    try {
      const result = await decide.mutateAsync({
        employee_profile_id: employee.id,
        dates,
        decision: 'present_confirmed',
        reason: clean,
      });

      if (result.written > 0) {
        toast.success(`تم تسجيل تأكيد الحضور على ${daysWord(result.written)}`);
      }

      // نجاحٌ جزئيّ: يُفرَغ التحديدُ **ويبقى المودالُ مفتوحاً** بقائمة ما لم يُقبل — إغلاقُه
      // صامتاً يجعل المديرَ يظنّ أنّ الأربعة بُتَّت وقد بُتَّ اثنان.
      if (result.skipped.length > 0) {
        setSkipped(result.skipped);
        onDone();
        return;
      }

      onDone();
      onClose();
    } catch (e) {
      toast.error(errorText(e, 'فشل في حفظ القرار'));
    }
  };

  return (
    <div className="hr-modal-overlay" onClick={onClose}>
      <div className="hr-modal hra-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hr-modal__h">
          <h3>تأكيد حضور — {employee.name ?? 'موظف'}</h3>
          <button type="button" className="hr-icon-btn" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <div className="hr-modal__b">
          <p className="hra-hint">
            تشهد بأن هذا الموظف كان حاضرا في {daysWord(dates.length)} أدناه رغم أن بصمته
            لم تصل.
            يبقى القرار في السجل، ويمكن إلغاؤه لاحقا بقرار آخر.
          </p>

          <div className="hra-secb">
            <span className="hra-flags">
              {dates.map((date) => (
                <span className="hra-flag" key={date}>{fmtDayLine(date)}</span>
              ))}
            </span>
          </div>

          <div className="hr-field">
            <label htmlFor="hra-reason">السبب *</label>
            <textarea
              id="hra-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: كان في المحكمة صباحا ولم يمر بالمكتب"
            />
            <span className="hra-count" dir="ltr">
              {reason.trim().length} / {MIN_REASON}
            </span>
          </div>

          {skipped.length > 0 && (
            <div className="hra-secb">
              <p className="hra-hint">أيام لم يتم قبولها، ولكل يوم سببه:</p>
              <dl className="hra-kv">
                {skipped.map((row) => (
                  <React.Fragment key={row.work_date}>
                    <dt>{fmtDayLine(row.work_date)}</dt>
                    <dd>{row.message}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </div>
          )}
        </div>

        <div className="hr-modal__f">
          <button type="button" className="hr-btn" onClick={onClose}>
            {skipped.length > 0 ? 'إغلاق' : 'إلغاء'}
          </button>
          <button
            type="button"
            className="hr-btn hr-btn--primary"
            onClick={() => { void submit(); }}
            disabled={decide.isPending}
          >
            {decide.isPending ? 'جارٍ الحفظ…' : 'أكد الحضور'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DecisionModal;
