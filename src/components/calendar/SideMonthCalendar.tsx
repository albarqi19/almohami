import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WEEKDAYS_AR, fmtMonthTitleAr, riyadhDayKey } from '../../utils/dateAr';
import { toHijri } from '../../utils/hijriDate';
import { buildMonthGrid, shiftMonth } from './calendarDays';

export interface LegendEntry {
  id: string | number;
  name: string;
  color: string;
  active: boolean;
}

interface Props {
  cursor: Date;
  onCursorChange: (next: Date) => void;
  /** مفتاح اليوم (YYYY-MM-DD) ⇒ مفاتيح ألوان النقاط، بترتيب العرض */
  dotsByDay: Map<string, string[]>;
  selectedDay: string | null;
  onSelectDay: (key: string | null) => void;
  loading?: boolean;
  legendTitle?: string;
  legend?: LegendEntry[];
  onToggleLegend?: (id: string | number) => void;
  /** نصّ التلميح على خلية فيها بنود — يستقبل العدد */
  dayHint?: (count: number) => string;
}

/**
 * تقويم العمود الجانبي — **ملاحٌ لا عارض**، عامٌّ لا يعرف الاجتماعات.
 *
 * استُخرج من MeetingsSideCalendar ليخدم تبويبَي الاجتماعات والتقويم معاً:
 * الأول يمرّر نقاط تصنيفات الاجتماعات، والثاني نقاط مصادر «يومي». وبقي
 * القرار الأصلي كما هو — الخلية تعرض نقاطاً لا عناوين، لأن ما بجانبها
 * (القائمة أو الأجندة) هو من يعرض التفاصيل؛ ولو كرّرنا العناوين في العمودين
 * لصار البند الواحد مكتوباً مرّتين في شاشة واحدة.
 *
 * نقر اليوم يُصفّي، ونقره ثانيةً يُلغي التصفية. فلا تبويب ولا انتقال.
 */
const SideMonthCalendar: React.FC<Props> = ({
  cursor, onCursorChange, dotsByDay, selectedDay, onSelectDay,
  loading = false, legendTitle = 'التصنيفات', legend = [], onToggleLegend, dayHint,
}) => {
  const cells = useMemo(() => buildMonthGrid(cursor), [cursor]);

  const monthTitle = fmtMonthTitleAr(cursor);
  const hijriLine = toHijri(new Date(cursor.getFullYear(), cursor.getMonth(), 15));

  return (
    <div className="im2-cal">
      <div className="im2-cal__bar">
        <div className="im2-cal__title">
          <b>{monthTitle}</b>
          {/* سطر هجري تحت العنوان الميلادي — لا عنوان هجري فوق شبكة ميلادية */}
          {hijriLine && <span>{hijriLine}</span>}
        </div>
        <div className="im2-cal__nav">
          {/* في RTL: السهم المتّجه يميناً يعني «السابق» */}
          <button type="button" aria-label="الشهر السابق" onClick={() => onCursorChange(shiftMonth(cursor, -1))}>
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            className="im2-cal__today"
            onClick={() => {
              const now = new Date();
              onCursorChange(new Date(now.getFullYear(), now.getMonth(), 1));
              onSelectDay(riyadhDayKey(now));
            }}
          >
            اليوم
          </button>
          <button type="button" aria-label="الشهر التالي" onClick={() => onCursorChange(shiftMonth(cursor, 1))}>
            <ChevronLeft size={14} />
          </button>
        </div>
      </div>

      <div className="im2-cal__weekdays" aria-hidden="true">
        {WEEKDAYS_AR.map(w => <span key={w}>{w.slice(0, 3)}</span>)}
      </div>

      <div className={`im2-cal__grid${loading ? ' is-loading' : ''}`} role="grid" aria-label={`تقويم ${monthTitle}`}>
        {cells.map(cell => {
          const dots = dotsByDay.get(cell.key) ?? [];
          const isSelected = cell.key === selectedDay;

          return (
            <button
              key={cell.key}
              type="button"
              role="gridcell"
              aria-pressed={isSelected}
              className={[
                'im2-cal__day',
                cell.outside ? 'is-outside' : '',
                cell.today ? 'is-today' : '',
                isSelected ? 'is-selected' : '',
              ].filter(Boolean).join(' ')}
              // النقر الثاني على اليوم نفسه يُلغي التصفية — بلا زر إضافي
              onClick={() => onSelectDay(isSelected ? null : cell.key)}
              title={dots.length ? (dayHint ? dayHint(dots.length) : `${dots.length}`) : undefined}
            >
              <span className="im2-cal__num">{cell.date.getDate()}</span>
              {dots.length > 0 && (
                <span className="im2-cal__dots">
                  {dots.slice(0, 3).map((color, i) => (
                    <span key={i} className={`cat-dot cat-${color}`} />
                  ))}
                  {dots.length > 3 && <span className="im2-cal__plus">+</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* مفتاح الألوان = أداة تصفية، لا وسيلة إيضاح ساكنة */}
      {legend.length > 0 && (
        <div className="im2-legend">
          <span className="im2-legend__head">{legendTitle}</span>
          {legend.map(entry => (
            <button
              key={entry.id}
              type="button"
              className={`cat-chip cat-${entry.color}${entry.active ? ' is-selected' : ''}`}
              onClick={() => onToggleLegend?.(entry.id)}
              aria-pressed={entry.active}
            >
              <span className="cat-dot" aria-hidden="true" />
              {entry.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SideMonthCalendar;
