import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, CalendarDays } from 'lucide-react';
import { usePermissionContext } from '../../contexts/PermissionContext';
import {
  myDayService,
  AGENDA_SOURCES,
  type AgendaItem,
  type AgendaSource,
} from '../../services/myDayService';
import type { PersonalEvent } from '../../services/personalEventService';
import { buildMonthGrid, shiftMonth } from '../../components/calendar/calendarDays';
import CreateInternalMeetingModal from '../../components/meetings/CreateInternalMeetingModal';
import PersonalEventModal from '../../components/myday/PersonalEventModal';
import AgendaDetailsPanel from '../../components/myday/AgendaDetailsPanel';
import QuickAddMenu, { type QuickAddChoice } from '../../components/myday/QuickAddMenu';
import {
  WEEKDAYS_AR, fmtMonthTitleAr, fmtTimeAr, relativeDayAr, riyadhDayKey,
} from '../../utils/dateAr';
import { toHijri } from '../../utils/hijriDate';

const HIDDEN_KEY = 'myday.hiddenSources';
const CHIPS_PER_CELL = 3;

const pad = (n: number) => String(n).padStart(2, '0');
const dayKeyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** أقرب نصف ساعة قادمة — نقطة بداية معقولة لموعد يُنشأ الآن. */
function nextHalfHour(): string {
  const now = new Date();
  const m = now.getMinutes();
  now.setMinutes(m < 30 ? 30 : 60, 0, 0);
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

interface QuickAdd {
  day: string;
  time: string;
  anchor: { x: number; y: number };
}

/**
 * تبويب «التقويم» — كل ما يشغل وقتي في شبكة شهرية واحدة.
 *
 * ثلاثة قرارات تصميمية تستحقّ التوضيح:
 *
 * 1) **اللون بالمصدر لا بالتصنيف.** في شاشة تجمع ستة مصادر يجيب اللون سؤال
 *    «ما نوع هذا؟». لو لوّنّا الاجتماع بلون تصنيفه لصارت النقطة الحمراء إمّا
 *    جلسة محكمة وإمّا اجتماع «تحضير جلسة» — ومفتاح الألوان يكذب. لون التصنيف
 *    يبقى في تبويب القائمة حيث كل البنود اجتماعات.
 *
 * 2) **الشبكة لا تُقصّ بصمت.** خلية بستة بنود تعرض ثلاثة و«+٣» بعدد صريح،
 *    والنقر عليها يفتح يومها في الأجندة كاملاً. القصّ الصامت يجعل الشبكة
 *    تُقرأ كأنها كاملة وهي ليست كذلك.
 *
 * 3) **الأجندة هي البطل.** يوم مكتب محاماة فيه أربع جلسات وتسع مهام ومهلة؛
 *    الشبكة تعطي الشكل العامّ، والقراءة الفعلية في العمود الجانبي.
 */
const MyDayCalendar: React.FC = () => {
  const { has } = usePermissionContext();

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [truncated, setTruncated] = useState<AgendaSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(() => riyadhDayKey(new Date()));

  const [hidden, setHidden] = useState<Set<AgendaSource>>(() => {
    try {
      const raw = localStorage.getItem(HIDDEN_KEY);
      return new Set(raw ? (JSON.parse(raw) as AgendaSource[]) : []);
    } catch {
      return new Set();
    }
  });

  const [detail, setDetail] = useState<AgendaItem | null>(null);
  const [quickAdd, setQuickAdd] = useState<QuickAdd | null>(null);
  const [meetingDraft, setMeetingDraft] = useState<{ date: string; time: string } | null>(null);
  const [personalDraft, setPersonalDraft] = useState<
    { date: string; time: string; kind: 'appointment' | 'reminder'; event?: PersonalEvent | null } | null
  >(null);

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) setCurrentUserId(JSON.parse(raw)?.id ?? null);
    } catch {
      setCurrentUserId(null);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden]));
  }, [hidden]);

  // حارس مرجع تصاعدي: التنقّل السريع بين الأشهر يُطلق طلبات متداخلة، ورد
  // الطلب الأقدم قد يصل أخيراً فيرسم شهراً غادرناه.
  const reqRef = useRef(0);

  const load = useCallback(async (target: Date) => {
    const grid = buildMonthGrid(target);
    // حدود الشبكة لا حدود الشهر: الصفّان الأول والأخير يحملان أياماً من
    // الشهرين المجاورين، وبلا تغطيتها تظهر خلاياهما فارغة كذباً.
    const from = grid[0].key;
    const to = grid[grid.length - 1].key;

    const token = ++reqRef.current;
    setLoading(true);
    setError(null);

    try {
      const result = await myDayService.range(from, to);
      if (token !== reqRef.current) return;
      setItems(result.items);
      setTruncated(result.truncated);
    } catch {
      if (token !== reqRef.current) return;
      setItems([]);
      setError('تعذّر تحميل التقويم.');
    } finally {
      if (token === reqRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => { load(cursor); }, [cursor, load]);

  const refresh = useCallback(() => { load(cursor); }, [cursor, load]);

  const visible = useMemo(
    () => items.filter(i => !hidden.has(i.source)),
    [items, hidden],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    for (const item of visible) {
      const list = map.get(item.day);
      if (list) list.push(item);
      else map.set(item.day, [item]);
    }
    return map;
  }, [visible]);

  const cells = useMemo(() => buildMonthGrid(cursor), [cursor]);

  const monthTitle = fmtMonthTitleAr(cursor);
  const hijriLine = toHijri(new Date(cursor.getFullYear(), cursor.getMonth(), 15));

  const toggleSource = (source: AgendaSource) => {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return next;
    });
  };

  /** أيام الأجندة: اليوم المختار وحده، أو الأيام القادمة إن لم يُختر شيء. */
  const agendaDays = useMemo(() => {
    if (selectedDay) {
      return [{ day: selectedDay, items: byDay.get(selectedDay) ?? [] }];
    }

    const todayKey = riyadhDayKey(new Date());
    return [...byDay.entries()]
      .filter(([day]) => day >= todayKey)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 14)
      .map(([day, dayItems]) => ({ day, items: dayItems }));
  }, [selectedDay, byDay]);

  const openQuickAdd = (day: string, e: React.MouseEvent) => {
    setQuickAdd({ day, time: nextHalfHour(), anchor: { x: e.clientX, y: e.clientY } });
  };

  const chooseQuickAdd = (choice: QuickAddChoice) => {
    if (!quickAdd) return;
    const { day, time } = quickAdd;
    setQuickAdd(null);

    if (choice === 'meeting') setMeetingDraft({ date: day, time });
    else setPersonalDraft({ date: day, time, kind: choice === 'reminder' ? 'reminder' : 'appointment' });
  };

  const totalToday = byDay.get(riyadhDayKey(new Date()))?.length ?? 0;

  return (
    <div className="mdc">
      {/* ─── العمود الجانبي: المفتاح ثم الأجندة ─── */}
      <aside className="mdc-side">
        <div className="mdc-side__filters">
          <span className="mdc-side__label">اعرض</span>
          <div className="mdc-sources">
            {AGENDA_SOURCES.map(s => {
              const off = hidden.has(s.key);
              return (
                <button
                  key={s.key}
                  type="button"
                  className={`cat-chip cat-${s.color}${off ? ' is-off' : ''}`}
                  onClick={() => toggleSource(s.key)}
                  aria-pressed={!off}
                >
                  <span className="cat-dot" aria-hidden="true" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mdc-agenda">
          <div className="mdc-agenda__head">
            <b>{selectedDay ? relativeDayAr(selectedDay) : 'القادم'}</b>
            {selectedDay && (
              <button type="button" className="mdc-agenda__clear" onClick={() => setSelectedDay(null)}>
                عرض القادم
              </button>
            )}
          </div>

          {loading ? (
            <div className="mdc-skel">
              {Array.from({ length: 4 }, (_, i) => <span key={i} />)}
            </div>
          ) : agendaDays.every(d => d.items.length === 0) ? (
            <p className="mdc-agenda__empty">
              {selectedDay ? 'لا شيء في هذا اليوم.' : 'لا شيء قادم في هذا الشهر.'}
            </p>
          ) : (
            agendaDays.map(({ day, items: dayItems }) => (
              <section key={day} className="mdc-agenda__day">
                {!selectedDay && <h4>{relativeDayAr(day)}</h4>}

                {dayItems.length === 0 ? (
                  <p className="mdc-agenda__empty">لا شيء في هذا اليوم.</p>
                ) : (
                  <ul>
                    {dayItems.map(item => (
                      <li key={item.key}>
                        <button
                          type="button"
                          className={`mdc-arow cat-${item.color}`}
                          onClick={() => setDetail(item)}
                        >
                          <span className="mdc-arow__time">
                            {item.at ? fmtTimeAr(item.at) : (item.time_text ?? '—')}
                          </span>
                          <span className="mdc-arow__body">
                            <b>{item.title}</b>
                            {/* اسم المصدر نصّاً: اللون وحده لا يكفي لمن لا يميّزه */}
                            <em>{item.source_label}{item.subtitle ? ` · ${item.subtitle}` : ''}</em>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))
          )}
        </div>
      </aside>

      {/* ─── الشبكة الشهرية ─── */}
      <div className="mdc-main">
        <div className="mdc-bar">
          <div className="mdc-bar__title">
            <b>{monthTitle}</b>
            {hijriLine && <span>{hijriLine}</span>}
          </div>

          <div className="mdc-bar__mid">
            {totalToday > 0 && (
              <span className="mdc-bar__fact">
                <CalendarDays size={12} /> اليوم: <b>{totalToday}</b>
              </span>
            )}
            {truncated.length > 0 && (
              <span className="mdc-bar__fact mdc-bar__fact--warn" title="بعض المصادر تجاوزت سقف العرض في هذا النطاق">
                <AlertTriangle size={12} /> عرض جزئي
              </span>
            )}
          </div>

          <div className="mdc-bar__nav">
            <button type="button" onClick={refresh} aria-label="تحديث" disabled={loading}>
              <RefreshCw size={14} className={loading ? 'is-spin' : ''} />
            </button>
            {/* في RTL: السهم المتّجه يميناً يعني «السابق» */}
            <button type="button" aria-label="الشهر السابق" onClick={() => setCursor(shiftMonth(cursor, -1))}>
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              className="mdc-bar__today"
              onClick={() => {
                const now = new Date();
                setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
                setSelectedDay(riyadhDayKey(now));
              }}
            >
              اليوم
            </button>
            <button type="button" aria-label="الشهر التالي" onClick={() => setCursor(shiftMonth(cursor, 1))}>
              <ChevronLeft size={14} />
            </button>
          </div>
        </div>

        {error && (
          <p className="mdc-error">
            <AlertTriangle size={13} /> {error}{' '}
            <button type="button" onClick={refresh}>إعادة المحاولة</button>
          </p>
        )}

        <div className="mdc-weekdays" aria-hidden="true">
          {WEEKDAYS_AR.map(w => <span key={w}>{w}</span>)}
        </div>

        <div className={`mdc-grid${loading ? ' is-loading' : ''}`} role="grid" aria-label={`تقويم ${monthTitle}`}>
          {cells.map(cell => {
            const dayItems = byDay.get(cell.key) ?? [];
            const isSelected = cell.key === selectedDay;
            const overflow = dayItems.length - CHIPS_PER_CELL;

            return (
              <div
                key={cell.key}
                role="gridcell"
                className={[
                  'mdc-cell',
                  cell.outside ? 'is-outside' : '',
                  cell.today ? 'is-today' : '',
                  isSelected ? 'is-selected' : '',
                ].filter(Boolean).join(' ')}
              >
                <button
                  type="button"
                  className="mdc-cell__num"
                  onClick={() => setSelectedDay(isSelected ? null : cell.key)}
                  aria-pressed={isSelected}
                  aria-label={`${cell.key}${dayItems.length ? ` — ${dayItems.length} بنداً` : ''}`}
                >
                  {cell.date.getDate()}
                </button>

                <div className="mdc-cell__chips">
                  {dayItems.slice(0, CHIPS_PER_CELL).map(item => (
                    <button
                      key={item.key}
                      type="button"
                      className={`mdc-chip cat-${item.color}${item.is_done ? ' is-done' : ''}`}
                      onClick={() => setDetail(item)}
                      title={`${item.source_label}: ${item.title}`}
                    >
                      <span className="cat-dot" aria-hidden="true" />
                      {item.at && <span className="mdc-chip__t">{fmtTimeAr(item.at)}</span>}
                      <span className="mdc-chip__x">{item.title}</span>
                    </button>
                  ))}

                  {overflow > 0 && (
                    <button
                      type="button"
                      className="mdc-more"
                      onClick={() => setSelectedDay(cell.key)}
                    >
                      +{overflow} أخرى
                    </button>
                  )}
                </div>

                {/* فراغ الخلية زرّ إنشاء — يملأ ما تبقّى مهما كان عدد الرقائق */}
                <button
                  type="button"
                  className="mdc-cell__add"
                  onClick={e => openQuickAdd(cell.key, e)}
                  aria-label={`إضافة في ${cell.key}`}
                  title="إضافة"
                />
              </div>
            );
          })}
        </div>
      </div>

      {quickAdd && (
        <QuickAddMenu
          day={quickAdd.day}
          time={quickAdd.time}
          onTimeChange={time => setQuickAdd(prev => (prev ? { ...prev, time } : prev))}
          anchor={quickAdd.anchor}
          onChoose={chooseQuickAdd}
          onClose={() => setQuickAdd(null)}
          canCreateMeeting={has('meetings.create')}
        />
      )}

      <AgendaDetailsPanel
        item={detail}
        currentUserId={currentUserId}
        onClose={() => setDetail(null)}
        onEditPersonal={item => {
          const start = new Date(item.at ?? `${item.day}T09:00:00`);
          setPersonalDraft({
            date: item.day,
            time: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
            kind: (item.extra?.kind as 'appointment' | 'reminder') ?? 'appointment',
            event: {
              id: item.id,
              kind: (item.extra?.kind as 'appointment' | 'reminder') ?? 'appointment',
              title: item.title,
              notes: (item.extra?.notes as string) ?? null,
              // بلا منطقة زمنية في السلسلة: new Date('…T00:00:00') يُقرأ محلياً،
              // وإضافة Z تُدخل إزاحة ثلاث ساعات في مسار التعديل.
              starts_at: item.at ?? `${item.day}T00:00:00`,
              ends_at: item.end_at,
              all_day: Boolean(item.extra?.all_day),
              color: item.color,
              blocks_availability: item.extra?.blocks_availability !== false,
              reminder_minutes: null,
            },
          });
          setDetail(null);
        }}
        onChanged={refresh}
      />

      {meetingDraft && (
        <CreateInternalMeetingModal
          initialDate={meetingDraft.date}
          initialTime={meetingDraft.time}
          onClose={() => setMeetingDraft(null)}
          onSuccess={() => { setMeetingDraft(null); refresh(); }}
        />
      )}

      <PersonalEventModal
        open={Boolean(personalDraft)}
        onClose={() => setPersonalDraft(null)}
        onSaved={refresh}
        initialDate={personalDraft?.date}
        initialTime={personalDraft?.time}
        initialKind={personalDraft?.kind}
        event={personalDraft?.event ?? null}
      />
    </div>
  );
};

export default MyDayCalendar;
