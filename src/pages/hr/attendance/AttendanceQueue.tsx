import React, { useState } from 'react';
import { AlertTriangle, CheckCheck, ChevronDown, ChevronLeft, RefreshCw } from 'lucide-react';

import {
  ATTENDANCE_FLAG_LABELS,
  PUNCH_DIRECTION_LABELS,
  SUGGESTION_HINTS,
  SUGGESTION_LABELS,
} from '../../../types/hr';
import type { AttendanceDayRow, AttendanceQueueGroup, SuggestionKind } from '../../../types/hr';
import type { SelectionApi } from './useAttendanceQueue';
import { groupDates } from './useAttendanceQueue';
import {
  daysWord,
  errorText,
  fmtCount,
  fmtDayLine,
  fmtTime,
  statusClass,
  statusLabel,
} from './attendanceFormat';

/**
 * 🔑 **الطابورُ الأسبوعيُّ المجموعُ تحت الموظف** — لا قائمةَ أيامٍ مسطّحة.
 *
 * أربعةُ أيامٍ لمحامٍ = **سطرٌ واحدٌ قابلٌ للفرد**، وعلى كلّ يومٍ مربّعُ تحديد، وشريطُ إجراءٍ
 * واحدٌ في الأسفل يبتّ المُحدَّدَ كلَّه **بقرارٍ واحدٍ وسببٍ واحدٍ يُكتب مرّة**. بلا ذلك يصير
 * تصنيفُ أربعين يوماً أربعين نقرةً، فتُهجر الشاشةُ في الشهر الثاني — **والوحدةُ المهجورة تُنتج
 * أسوأ رقمٍ ممكن: لا رقمَ إطلاقاً**.
 *
 * 🔴 **الزرُّ الأوّل هو الاقتراحُ المُسبَّقُ من الدليل الأقوى** (`suggestion.label_key` من
 * `AttendanceSuggestionBuilder`) — فالمديرُ ينقر تأكيداً ولا يبحث عن قرار. ولا يظهر إلّا حين
 * تتّفق الأيامُ المُحدَّدة كلُّها على اقتراحٍ واحد.
 *
 * 🚫 **ولا كلمةَ «غياب» في أيّ زرٍّ أو عنوانٍ هنا**: المفردةُ «تصنيف» و«تأكيد حضور». الغيابُ
 * يُسجَّل في دفتر الإجازات بفعلِ إنسانٍ مسمّى — وزرُّه يفتح مودالَ الإجازة القائم بحذافيره.
 */

export type QueueAction = 'suggestion' | 'leave' | 'present';

interface Props {
  groups: AttendanceQueueGroup[];
  selection: SelectionApi;
  /** الاقتراحُ المشترَك للمُحدَّد — `null` حين تختلف الأيام، فيختفي الزرُّ الأول. */
  sharedKind: SuggestionKind | null;
  onAct: (action: QueueAction, kind: SuggestionKind | null) => void;
  /** يفتح سردَ «لماذا» في العمود الأيسر. */
  onOpenDay: (profileId: number, day: AttendanceDayRow) => void;
  openDayId: number | null;
  canManage: boolean;
  /** `hr.leave.manage` — صلاحيةٌ مستقلّة: بدونها **يُحذف** زرُّ الإجازة لا يُعطَّل. */
  canLeave: boolean;
  loading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
}

/** فوق هذا العدد من المجموعات تُطوى كلُّها افتراضياً — قائمةٌ تُمسح بالعين لا تُمرَّر. */
const AUTO_OPEN_MAX = 3;

/** وقتا اليوم في سطرٍ واحد — والطرفُ الناقصُ يُسمّى ولا يُترك فراغاً. */
function timesLine(day: AttendanceDayRow): string {
  const parts: string[] = [];

  parts.push(
    day.first_in_at
      ? `${PUNCH_DIRECTION_LABELS.in} ${fmtTime(day.first_in_at)}`
      : `بلا ${PUNCH_DIRECTION_LABELS.in}`
  );
  parts.push(
    day.last_out_at
      ? `${PUNCH_DIRECTION_LABELS.out} ${fmtTime(day.last_out_at)}`
      : `بلا ${PUNCH_DIRECTION_LABELS.out}`
  );

  return parts.join(' · ');
}

export const AttendanceQueue: React.FC<Props> = ({
  groups,
  selection,
  sharedKind,
  onAct,
  onOpenDay,
  openDayId,
  canManage,
  canLeave,
  loading,
  isError,
  error,
  onRetry,
}) => {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const autoOpen = groups.length <= AUTO_OPEN_MAX;
  const isOpen = (id: number) => open[id] ?? autoOpen;

  if (loading) {
    return (
      <div className="hra-state hra-state--loading" aria-busy="true" aria-label="جارٍ تحميل القائمة">
        {Array.from({ length: 6 }, (_, i) => <span className="hra-skel" key={i} />)}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="hra-state hra-state--error">
        <AlertTriangle size={20} aria-hidden="true" />
        <p className="hra-state__t">تعذر فتح قائمة المراجعة</p>
        <p className="hra-state__d">{errorText(error, 'انقطع الاتصال بالخادم.')}</p>
        <button type="button" className="ssp2-btn" onClick={onRetry}>
          <RefreshCw size={13} /> إعادة المحاولة
        </button>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="hra-state">
        <CheckCheck size={22} aria-hidden="true" />
        <p className="hra-state__t">لا شيء يحتاج قراراً</p>
        <p className="hra-state__d">
          كل يوم في هذه المدة إما فسره النظام بدليل أو صدر فيه قرار. وأيام الساعات الأخيرة
          لا تظهر هنا حتى تنتهي مهلة الانتظار.
        </p>
      </div>
    );
  }

  return (
    <>
      {groups.map((group) => {
        const dates = groupDates(group);
        const allOn = dates.length > 0 && dates.every((d) => selection.isOn(group.employee.id, d));

        return (
          <section className="hra-group" key={group.employee.id}>
            <h3>
              <button
                type="button"
                className="hra-group__h"
                aria-expanded={isOpen(group.employee.id)}
                onClick={() =>
                  setOpen((prev) => ({
                    ...prev,
                    [group.employee.id]: !isOpen(group.employee.id),
                  }))
                }
              >
                {isOpen(group.employee.id)
                  ? <ChevronDown size={14} aria-hidden="true" />
                  : <ChevronLeft size={14} aria-hidden="true" />}
                <span className="hra-group__t">{group.employee.name ?? 'موظف بلا اسم'}</span>
                <span className="hra-group__n" dir="ltr">{fmtCount(group.pending_days)}</span>
              </button>
            </h3>

            {isOpen(group.employee.id) && (
              <div className="hra-group__b">
                {canManage && dates.length > 1 && (
                  <p className="hra-line">
                    <span>{daysWord(dates.length)} في هذا الأسبوع</span>
                    <button
                      type="button"
                      className="ssp2-btn"
                      onClick={() =>
                        allOn
                          ? selection.clear()
                          : selection.setGroup(group.employee.id, dates)
                      }
                    >
                      {allOn ? 'إلغاء التحديد' : 'حدد كل أيامه'}
                    </button>
                  </p>
                )}

                {group.days.map((day) => {
                  const date = day.work_date ?? '';
                  const on = selection.isOn(group.employee.id, date);
                  const inputId = `hra-d-${day.id}`;

                  return (
                    <div className={`hra-day${on ? ' is-on' : ''}`} key={day.id}>
                      {canManage && (
                        <input
                          id={inputId}
                          type="checkbox"
                          className="hra-day__chk"
                          checked={on}
                          onChange={() => selection.toggle(group.employee.id, date)}
                        />
                      )}

                      <div className="hra-day__main">
                        <div className="hra-day__d">
                          {canManage
                            ? <label htmlFor={inputId}>{fmtDayLine(date)}</label>
                            : <span>{fmtDayLine(date)}</span>}
                          <span className={statusClass(day.status)}>{statusLabel(day.status)}</span>
                          {day.flags.length > 0 && (
                            <span className="hra-flags">
                              {day.flags.map((flag) => (
                                <span
                                  key={flag}
                                  className={
                                    flag === 'resolution_conflict'
                                      ? 'hra-flag hra-flag--danger'
                                      : 'hra-flag'
                                  }
                                >
                                  {ATTENDANCE_FLAG_LABELS[flag] ?? flag}
                                </span>
                              ))}
                            </span>
                          )}
                        </div>

                        <p className="hra-day__sub">
                          {timesLine(day)}
                          {day.suggestion ? ` · ${SUGGESTION_HINTS[day.suggestion.label_key]}` : ''}
                        </p>
                      </div>

                      <div className="hra-day__end">
                        <button
                          type="button"
                          className="ssp2-btn"
                          aria-pressed={openDayId === day.id}
                          onClick={() => onOpenDay(group.employee.id, day)}
                        >
                          لماذا؟
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {/* شريطُ الإجراء — يظهر مع التحديد وحدَه، وثلاثةُ أزرارٍ لا أكثر. */}
      {canManage && selection.selection !== null && (
        <div className="hra-bar">
          <span className="hra-bar__t">
            {daysWord(selection.count)} محددة
            <span className="hra-bar__hint">
              {sharedKind === null
                ? 'اختلفت أدلة الأيام. يبقى تأكيد الحضور صالحاً لكلها'
                : SUGGESTION_HINTS[sharedKind]}
            </span>
          </span>

          {sharedKind !== null && sharedKind !== 'present_confirmed' && (
            <button
              type="button"
              className="ssp2-btn ssp2-btn--primary"
              onClick={() => onAct('suggestion', sharedKind)}
            >
              {SUGGESTION_LABELS[sharedKind]}
            </button>
          )}

          {canLeave && (
            <button type="button" className="ssp2-btn" onClick={() => onAct('leave', null)}>
              سجل إجازة على هذه الأيام
            </button>
          )}

          <button
            type="button"
            className={
              sharedKind === null || sharedKind === 'present_confirmed'
                ? 'ssp2-btn ssp2-btn--primary'
                : 'ssp2-btn'
            }
            onClick={() => onAct('present', null)}
          >
            أكد أنه حضر
          </button>

          <button type="button" className="ssp2-btn" onClick={selection.clear}>
            إلغاء التحديد
          </button>
        </div>
      )}
    </>
  );
};

export default AttendanceQueue;
