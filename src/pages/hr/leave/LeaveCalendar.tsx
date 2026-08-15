import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CalendarX, RefreshCw } from 'lucide-react';

import { hrLeaveService } from '../../../services/hrLeaveService';
import { useIsDesktop } from '../../../hooks/useIsDesktop';
import { LEAVE_DATE_LOCALE, WEEKDAY_AR, colorClass, errorText, fmtLeaveDate, todayISO } from './leaveFormat';
import { HALF_DAY_PERIOD_LABELS, LEAVE_STATUS_LABELS } from '../../../types/hr';
import type { LeaveCalendarCell, LeaveCalendarRow } from '../../../types/hr';

/**
 * تبويبُ «التقويم الشهريّ» — صفٌّ لكلّ منسوبٍ وعمودٌ لكلّ يوم.
 *
 * 🔴 **C-31**: المصدرُ `GET /hr/leaves/calendar` (المحروسُ بـ`hr.view`) — نداءٌ واحدٌ
 * يحمل الوقائعَ والعطلَ وأيامَ نهاية الأسبوع معاً. ولا يُقرأ `hr/holidays` هنا
 * إطلاقاً: حارسُه `hr.manage`، فيَعمى التقويمُ على الدور المقصود بالقراءة.
 *
 * **قاعدةُ صدقٍ صريحة**: إن غاب `weekend_days` لا تُفترض «الجمعة والسبت» ولا تُظلَّل
 * أعمدة — ويُعلَن ذلك نصّاً. افتراضُ نهاية الأسبوع أسرعُ طريقٍ إلى شبكةٍ تكذب.
 */

/** ترتيبُ `Date#getDay()` — يُطابَق به `weekend_days` القادمُ من الخادم. */
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

interface Props {
  /** الشهرُ المعروض بصيغة `YYYY-MM` — من الرابط لا من الذاكرة. */
  month: string;
  /** حين يُختار منسوبٌ تُقصَر الشبكةُ عليه. */
  employeeId: number | null;
  canManage: boolean;
  /** خليةٌ خالية ⇒ مودالُ تسجيلٍ معبّأٌ باليوم والمنسوب. */
  onPick: (employee: { profileId: number; name: string }, date: string) => void;
  /**
   * خليةٌ مشغولة ⇒ سجلُّ ذلك المنسوب.
   * الشبكةُ تحمل `leave_id` ولا تحمل صفَّ الواقعة كاملاً، ولوحُ التفاصيل يشترط الصفَّ —
   * فالانتقالُ إلى السجلّ وعدٌ يُنجَز، وفتحُ لوحٍ بنصف بيانات وعدٌ يُخلَف.
   */
  onOpenEmployee: (employeeId: number) => void;
}

function daysBetween(from: string, to: string): string[] {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const out: string[] = [];
  const cursor = new Date(start);

  while (cursor.getTime() <= end.getTime() && out.length < 62) {
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    out.push(`${cursor.getFullYear()}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }

  return out;
}

function dayKeyOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '' : DAY_KEYS[d.getDay()];
}

function dayNumber(iso: string): string {
  return iso.slice(8, 10);
}

/** حرفُ اليوم فوق رقمِه — «أح» «إث» … من نفس خريطة الأسماء العربية. */
function dayLetter(iso: string): string {
  const key = dayKeyOf(iso);
  const name = WEEKDAY_AR[key] ?? '';
  return name.replace(/^ال/, '').slice(0, 2);
}

export const LeaveCalendar: React.FC<Props> = ({ month, employeeId, canManage, onPick, onOpenEmployee }) => {
  const isDesktop = useIsDesktop(1024);
  const today = todayISO();
  const gridRef = useRef<HTMLTableSectionElement | null>(null);

  // roving tabindex: خليةٌ واحدةٌ في تسلسل Tab، والأسهمُ تنقل التركيز داخل الشبكة.
  const [focused, setFocused] = useState<{ row: number; col: number }>({ row: 0, col: 0 });

  const calendarQuery = useQuery({
    queryKey: ['hr', 'leave', 'calendar', month, employeeId],
    queryFn: () =>
      hrLeaveService.getCalendar(month, employeeId === null ? {} : { employee_profile_id: employeeId }),
    staleTime: 30_000,
  });

  const payload = calendarQuery.data;

  const days = useMemo(() => {
    if (!payload) return [];
    return daysBetween(payload.from, payload.to);
  }, [payload]);

  const weekendKeys = useMemo(
    () => new Set((payload?.weekend_days ?? []).map((d) => String(d).toLowerCase())),
    [payload]
  );

  const holidayByDate = useMemo(() => {
    const map = new Map<string, { name: string; confirmed: boolean }>();
    (payload?.holidays ?? []).forEach((h) => {
      map.set(h.date, { name: h.name, confirmed: h.confirmation_status === 'confirmed' });
    });
    return map;
  }, [payload]);

  const rows = useMemo<LeaveCalendarRow[]>(() => payload?.rows ?? [], [payload]);

  const cellIndex = useMemo(() => {
    const map = new Map<string, LeaveCalendarCell>();
    rows.forEach((row) => {
      row.cells.forEach((cell) => map.set(`${row.employee_profile_id}:${cell.date}`, cell));
    });
    return map;
  }, [rows]);

  const moveFocus = useCallback(
    (rowIndex: number, colIndex: number) => {
      const row = Math.max(0, Math.min(rows.length - 1, rowIndex));
      const col = Math.max(0, Math.min(days.length - 1, colIndex));
      setFocused({ row, col });

      const node = gridRef.current?.querySelector<HTMLButtonElement>(
        `button[data-r="${row}"][data-c="${col}"]`
      );
      node?.focus({ preventScroll: false });
    },
    [rows.length, days.length]
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLTableSectionElement>) => {
    const target = event.target as HTMLElement;
    const r = Number(target.dataset?.r);
    const c = Number(target.dataset?.c);
    if (Number.isNaN(r) || Number.isNaN(c)) return;

    // الأسهمُ الأفقية منطقية: في RTL «اليمين» يعني اليومَ الأسبق.
    const step = (delta: number) => {
      event.preventDefault();
      moveFocus(r, c + delta);
    };

    if (event.key === 'ArrowLeft') step(1);
    else if (event.key === 'ArrowRight') step(-1);
    else if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveFocus(r + 1, c);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveFocus(r - 1, c);
    } else if (event.key === 'Home') {
      event.preventDefault();
      moveFocus(r, 0);
    } else if (event.key === 'End') {
      event.preventDefault();
      moveFocus(r, days.length - 1);
    }
  };

  if (calendarQuery.isPending) {
    return (
      <div className="hrl-state hrl-state--loading" aria-busy="true" aria-label="جارٍ تحميل التقويم">
        {Array.from({ length: 8 }, (_, i) => (
          <span className="hrl-skel" key={i} />
        ))}
      </div>
    );
  }

  if (calendarQuery.isError || !payload) {
    return (
      <div className="hrl-state hrl-state--error">
        <AlertTriangle size={22} />
        <p className="hrl-state__t">تعذّر جلب التقويم</p>
        <p className="hrl-state__d">{errorText(calendarQuery.error, 'انقطعَ الاتصال بالخادم.')}</p>
        <button type="button" className="hr-btn hr-btn--sm" onClick={() => void calendarQuery.refetch()}>
          <RefreshCw size={13} /> إعادة المحاولة
        </button>
      </div>
    );
  }

  const weekendUnknown = weekendKeys.size === 0;
  const anyCell = cellIndex.size > 0;

  const monthTitle = new Date(`${payload.from}T00:00:00`).toLocaleDateString(LEAVE_DATE_LOCALE, {
    year: 'numeric',
    month: 'long',
  });

  // الأنواعُ الحاضرةُ في الشهر — تُشتقّ من الخلايا لا من قائمةٍ مكتوبة.
  const legendMap = new Map<string, { code: string; name: string; colorKey: string }>();
  Array.from(cellIndex.values()).forEach((cell) => {
    if (!legendMap.has(cell.type_code)) {
      legendMap.set(cell.type_code, { code: cell.type_code, name: cell.type_name, colorKey: cell.color_key });
    }
  });
  const legendTypes = Array.from(legendMap.values());

  return (
    <>
      {weekendUnknown && (
        <p className="hrl-note">تعذّر معرفةُ أيام نهاية الأسبوع لهذا المكتب — الأعمدةُ غيرُ مميَّزة.</p>
      )}

      {payload.unconfirmed_holidays > 0 && (
        <p className="hrl-note">
          {payload.unconfirmed_holidays} عطلةً في هذا الشهر غيرُ معتمَدة — تُعلَّم بخطٍّ منقّطٍ ولا تُستثنى من
          الاحتساب.
        </p>
      )}

      {rows.length === 0 ? (
        <div className="hrl-state hrl-state--empty">
          <CalendarX size={22} />
          <p className="hrl-state__t">لا منسوبين في هذا الشهر</p>
          <p className="hrl-state__d">لم يُرجع الخادمُ صفوفاً لهذه المدة.</p>
        </div>
      ) : (
        <div className="hrl-calwrap">
          <table className="hrl-cal">
            <caption className="hrl-sr">
              تقويم الغياب الشهريّ — صفٌّ لكلّ منسوبٍ وعمودٌ لكلّ يوم
            </caption>
            <thead>
              <tr>
                <th scope="col" className="hrl-cal__name">
                  المنسوب
                </th>
                {days.map((date) => {
                  const holiday = holidayByDate.get(date);
                  const isWeekend = weekendKeys.has(dayKeyOf(date));
                  const classes = [
                    holiday?.confirmed ? 'is-holiday' : '',
                    !holiday?.confirmed && isWeekend ? 'is-weekend' : '',
                    holiday && !holiday.confirmed ? 'is-holiday-pending' : '',
                    date === today ? 'is-today' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  const title = holiday
                    ? holiday.confirmed
                      ? holiday.name
                      : `${holiday.name} — غير معتمَدة، لا تُستثنى من الاحتساب`
                    : undefined;

                  return (
                    <th scope="col" key={date} className={classes || undefined} title={title}>
                      <span className="hrl-cal__d">{dayLetter(date)}</span>
                      <span className="hrl-cal__n">{dayNumber(date)}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody ref={gridRef} onKeyDown={onKeyDown}>
              {rows.map((row, rowIndex) => (
                <tr key={row.employee_profile_id}>
                  <th scope="row" className="hrl-cal__name">
                    {row.user_name}
                  </th>

                  {days.map((date, colIndex) => {
                    const cell = cellIndex.get(`${row.employee_profile_id}:${date}`);
                    const holiday = holidayByDate.get(date);
                    const isWeekend = weekendKeys.has(dayKeyOf(date));
                    const tdClasses = [
                      holiday?.confirmed ? 'is-holiday' : '',
                      !holiday?.confirmed && isWeekend ? 'is-weekend' : '',
                      date === today ? 'is-today' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');

                    const half = cell?.half_day
                      ? cell.half_day_period === 'morning'
                        ? ' hrl-cell--half hrl-cell--morning'
                        : ' hrl-cell--half hrl-cell--evening'
                      : '';

                    const label = cell
                      ? `${row.user_name} — ${cell.type_name} — ${fmtLeaveDate(date)}${
                          cell.half_day && cell.half_day_period
                            ? ` — نصف يوم ${HALF_DAY_PERIOD_LABELS[cell.half_day_period]}`
                            : ''
                        } — ${LEAVE_STATUS_LABELS[cell.status]} — افتح سجلَّه`
                      : `${row.user_name} — بلا غياب — ${fmtLeaveDate(date)}`;

                    const interactive = cell !== undefined || canManage;

                    return (
                      <td key={date} className={tdClasses || undefined}>
                        <button
                          type="button"
                          data-r={rowIndex}
                          data-c={colIndex}
                          tabIndex={focused.row === rowIndex && focused.col === colIndex ? 0 : -1}
                          className={
                            cell
                              ? `hrl-cell ${colorClass(cell.color_key)}${half}${
                                  cell.status === 'pending' ? ' hrl-cell--pending' : ''
                                }`
                              : 'hrl-cell'
                          }
                          aria-label={label}
                          title={label}
                          disabled={!interactive}
                          onFocus={() => setFocused({ row: rowIndex, col: colIndex })}
                          onClick={() => {
                            if (cell) onOpenEmployee(row.employee_profile_id);
                            else onPick({ profileId: row.employee_profile_id, name: row.user_name }, date);
                          }}
                        >
                          {cell && <span className="hrl-cell__f" aria-hidden="true" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!anyCell && rows.length > 0 && (
        <p className="hrl-note">
          لا غياباتٍ مسجّلةٌ في {monthTitle}.
        </p>
      )}

      {/* وسيلةُ إيضاحٍ من الأنواع الحاضرة فعلاً — لا قائمةَ ألوانٍ ثابتةٍ في JSX */}
      {legendTypes.length > 0 && (
        <div className="hrl-legend">
          {legendTypes.map((item) => (
            <span className={`hrl-legend__i ${colorClass(item.colorKey)}`} key={item.code}>
              <span className="hrl-legend__s" aria-hidden="true" />
              {item.name}
            </span>
          ))}
        </div>
      )}

      {canManage && (
        <p className="hrl-hint">
          {isDesktop
            ? 'نقرةٌ على يومٍ خالٍ تفتح تسجيلاً معبّأً به · نقرةٌ على مدّةٍ تفتح سجلَّ صاحبها · الأسهمُ تنقل بين الأيام.'
            : 'انقر يوماً خالياً لتسجيل غيابٍ فيه، أو مدّةً لفتح سجلّ صاحبها.'}
        </p>
      )}
    </>
  );
};

export default LeaveCalendar;
