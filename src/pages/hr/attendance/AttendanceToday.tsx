import React from 'react';
import { AlertTriangle, CalendarDays, RefreshCw } from 'lucide-react';

import { ATTENDANCE_FLAG_LABELS } from '../../../types/hr';
import type { AttendanceDayRow } from '../../../types/hr';
import {
  dayStatusClass,
  dayStatusLabel,
  dayStatusTitle,
  errorText,
  fmtDate,
  fmtMinutes,
  fmtTime,
} from './attendanceFormat';

/**
 * شاشةُ اليوم — صفوفُ المكتب في تاريخٍ واحدٍ كما احتسبها المحرّك.
 *
 * 🔴 **صفرُ استطلاعٍ دوريّ**: تُحمَّل مرّةً وتتحدّث بزرّ. البصمةُ حدثٌ يقع مرّتين في اليوم،
 * ولا شيءَ فيها يبرّر استطلاعاً كلَّ نصف دقيقة.
 *
 * 🚫 **ولا ترتيبَ بالتأخير ولا لوحةَ صدارة**: الترتيبُ كما يرسله الخادم (بمعرّف الملفّ).
 */

interface Props {
  date: string;
  rows: AttendanceDayRow[];
  loading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  onOpenDay: (profileId: number, day: AttendanceDayRow) => void;
  openDayId: number | null;
}

export const AttendanceToday: React.FC<Props> = ({
  date,
  rows,
  loading,
  isError,
  error,
  onRetry,
  onOpenDay,
  openDayId,
}) => {
  if (loading) {
    return (
      <div className="hra-state hra-state--loading" aria-busy="true" aria-label="جارٍ تحميل اليوم">
        {Array.from({ length: 6 }, (_, i) => <span className="hra-skel" key={i} />)}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="hra-state hra-state--error">
        <AlertTriangle size={20} aria-hidden="true" />
        <p className="hra-state__t">تعذر تحميل حضور اليوم</p>
        <p className="hra-state__d">{errorText(error, 'انقطع الاتصال بالخادم.')}</p>
        <button type="button" className="ssp2-btn" onClick={onRetry}>
          <RefreshCw size={13} /> إعادة المحاولة
        </button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="hra-state">
        <CalendarDays size={22} aria-hidden="true" />
        <p className="hra-state__t">لا يوجد سجل محتسب في {fmtDate(date)}</p>
        <p className="hra-state__d">
          يحتسب المحرك أيام المكتب ليلا بعد ساعة فصل اليوم، فاليوم الجاري يظهر هنا صباح غد.
          واختيار تاريخ سابق يعرض ما تم احتسابه فعلا.
        </p>
      </div>
    );
  }

  return (
    <>
      {rows.map((row) => (
        <div className="hra-day" key={row.id}>
          <div className="hra-day__main">
            <div className="hra-day__d">
              <span>{row.employee?.name ?? 'موظف'}</span>
              <span className={dayStatusClass(row)} title={dayStatusTitle(row)}>
                {dayStatusLabel(row)}
              </span>
              {row.flags.length > 0 && (
                <span className="hra-flags">
                  {row.flags.map((flag) => (
                    <span
                      key={flag}
                      className={flag === 'resolution_conflict' ? 'hra-flag hra-flag--danger' : 'hra-flag'}
                    >
                      {ATTENDANCE_FLAG_LABELS[flag] ?? flag}
                    </span>
                  ))}
                </span>
              )}
            </div>
            <p className="hra-day__sub">
              <span dir="ltr">{fmtTime(row.first_in_at)}</span>
              {' ← '}
              <span dir="ltr">{fmtTime(row.last_out_at)}</span>
              {row.worked_minutes !== null && ` · مدة العمل ${fmtMinutes(row.worked_minutes)}`}
              {row.employee?.job_title ? ` · ${row.employee.job_title}` : ''}
            </p>
          </div>

          <div className="hra-day__end">
            <button
              type="button"
              className="ssp2-btn"
              aria-pressed={openDayId === row.id}
              onClick={() => row.employee && onOpenDay(row.employee.id, row)}
            >
              لماذا؟
            </button>
          </div>
        </div>
      ))}
    </>
  );
};

export default AttendanceToday;
