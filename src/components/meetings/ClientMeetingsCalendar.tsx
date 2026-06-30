import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft, Video, MapPin, Clock, User } from 'lucide-react';
import type { ClientMeeting } from '../../services/meetingService';

interface Props {
  meetings: ClientMeeting[];
  onSelectMeeting?: (meeting: ClientMeeting) => void;
}

const WEEKDAYS = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

const STATUS_COLOR: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#10B981',
  completed: '#3B82F6',
  cancelled_by_client: '#EF4444',
  cancelled_by_lawyer: '#EF4444',
  no_show: '#9CA3AF',
};

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * تقويم شهري لمواعيد العملاء — يعرض المواعيد كنقاط ملوّنة على الأيام،
 * واختيار يوم يكشف قائمة مواعيده. تصميم فلات بهوية النظام.
 */
const ClientMeetingsCalendar: React.FC<Props> = ({ meetings, onSelectMeeting }) => {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(dayKey(new Date()));

  // تجميع المواعيد حسب اليوم
  const byDay = useMemo(() => {
    const map: Record<string, ClientMeeting[]> = {};
    for (const m of meetings) {
      const k = dayKey(new Date(m.scheduled_at));
      (map[k] ||= []).push(m);
    }
    // ترتيب مواعيد كل يوم زمنياً
    Object.values(map).forEach(list =>
      list.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    );
    return map;
  }, [meetings]);

  // شبكة الأيام (مع حشو بداية الشهر)
  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: (Date | null)[] = [];
    for (let i = 0; i < firstDow; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(year, month, d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [cursor]);

  const todayKey = dayKey(new Date());
  const monthLabel = cursor.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });

  const selectedMeetings = selectedDay ? (byDay[selectedDay] || []) : [];

  const formatTime = (s: string) =>
    new Date(s).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  const formatDayLabel = (k: string) =>
    new Date(k).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="cmc">
      <div className="cmc__grid-wrap">
        {/* Toolbar */}
        <div className="cmc__toolbar">
          <span className="cmc__month">{monthLabel}</span>
          <div className="cmc__nav">
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronRight size={16} /></button>
            <button className="cmc__today" onClick={() => { const n = new Date(); setCursor(new Date(n.getFullYear(), n.getMonth(), 1)); setSelectedDay(todayKey); }}>اليوم</button>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronLeft size={16} /></button>
          </div>
        </div>

        {/* Weekday header */}
        <div className="cmc__week">
          {WEEKDAYS.map(w => <div key={w} className="cmc__wday">{w}</div>)}
        </div>

        {/* Days grid */}
        <div className="cmc__days">
          {cells.map((date, i) => {
            if (!date) return <div key={i} className="cmc__cell cmc__cell--empty" />;
            const k = dayKey(date);
            const dayMeetings = byDay[k] || [];
            const isToday = k === todayKey;
            const isSelected = k === selectedDay;
            return (
              <button
                key={i}
                className={`cmc__cell ${isToday ? 'cmc__cell--today' : ''} ${isSelected ? 'cmc__cell--selected' : ''}`}
                onClick={() => setSelectedDay(k)}
              >
                <span className="cmc__daynum">{date.getDate()}</span>
                {dayMeetings.length > 0 && (
                  <span className="cmc__dots">
                    {dayMeetings.slice(0, 4).map((m, j) => (
                      <span key={j} className="cmc__dot" style={{ background: STATUS_COLOR[m.status] || '#9CA3AF' }} />
                    ))}
                    {dayMeetings.length > 4 && <span className="cmc__more">+{dayMeetings.length - 4}</span>}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day detail panel */}
      <div className="cmc__panel">
        <div className="cmc__panel-head">
          {selectedDay ? formatDayLabel(selectedDay) : 'اختر يوماً'}
          {selectedMeetings.length > 0 && <span className="cmc__panel-count">{selectedMeetings.length}</span>}
        </div>

        {selectedMeetings.length === 0 ? (
          <div className="cmc__empty">لا توجد مواعيد في هذا اليوم</div>
        ) : (
          <div className="cmc__list">
            {selectedMeetings.map(m => {
              const isRemote = m.meeting_type === 'remote';
              return (
                <button key={m.id} className="cmc__item" onClick={() => onSelectMeeting?.(m)}>
                  <span className="cmc__item-bar" style={{ background: STATUS_COLOR[m.status] || '#9CA3AF' }} />
                  <span className="cmc__item-time"><Clock size={12} /> {formatTime(m.scheduled_at)}</span>
                  <span className="cmc__item-main">
                    <span className="cmc__item-client"><User size={12} /> {m.client_name || m.client?.name || 'عميل'}</span>
                    <span className="cmc__item-type">
                      {isRemote ? <Video size={11} /> : <MapPin size={11} />}
                      {isRemote ? 'عن بعد' : 'حضوري'} · {m.duration_minutes} د
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .cmc { display: grid; grid-template-columns: 1fr 320px; gap: 16px; padding: 16px 24px; align-items: start; }
        @media (max-width: 900px) { .cmc { grid-template-columns: 1fr; } }

        .cmc__grid-wrap { background: var(--color-surface, #fff); border: 1px solid var(--color-border, #e5e7eb); border-radius: 12px; padding: 14px; }
        .cmc__toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .cmc__month { font-size: 15px; font-weight: 700; color: var(--color-text); }
        .cmc__nav { display: flex; align-items: center; gap: 4px; }
        .cmc__nav button { width: 30px; height: 30px; border: 1px solid var(--color-border, #e5e7eb); background: var(--color-surface, #fff); border-radius: 6px; cursor: pointer; color: var(--color-text-secondary); display: flex; align-items: center; justify-content: center; }
        .cmc__nav button:hover { background: var(--color-surface-subtle, #f3f4f6); }
        .cmc__today { width: auto !important; padding: 0 10px; font-size: 12px; font-weight: 600; }

        .cmc__week { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 6px; }
        .cmc__wday { text-align: center; font-size: 11px; font-weight: 600; color: var(--color-text-secondary); padding: 4px 0; }

        .cmc__days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
        .cmc__cell { aspect-ratio: 1 / 1; border: 1px solid transparent; border-radius: 8px; background: var(--color-surface-subtle, #f9fafb); cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 6px 0 0; gap: 3px; transition: all 0.12s; position: relative; }
        .cmc__cell:hover { border-color: var(--law-navy, #1E3A5F); }
        .cmc__cell--empty { background: transparent; cursor: default; border: none; }
        .cmc__cell--today { background: #FEF9EC; }
        .cmc__cell--selected { background: var(--law-navy, #1E3A5F); border-color: var(--law-navy, #1E3A5F); }
        .cmc__daynum { font-size: 13px; font-weight: 600; color: var(--color-text); }
        .cmc__cell--today .cmc__daynum { color: #B45309; }
        .cmc__cell--selected .cmc__daynum { color: #fff; }
        .cmc__dots { display: flex; align-items: center; gap: 2px; flex-wrap: wrap; justify-content: center; padding: 0 2px; }
        .cmc__dot { width: 5px; height: 5px; border-radius: 50%; }
        .cmc__more { font-size: 9px; color: var(--color-text-secondary); }
        .cmc__cell--selected .cmc__more { color: rgba(255,255,255,0.8); }

        .cmc__panel { background: var(--color-surface, #fff); border: 1px solid var(--color-border, #e5e7eb); border-radius: 12px; overflow: hidden; }
        .cmc__panel-head { display: flex; align-items: center; gap: 8px; padding: 14px 16px; font-size: 14px; font-weight: 700; color: var(--color-text); border-bottom: 1px solid var(--color-border, #e5e7eb); }
        .cmc__panel-count { background: var(--law-navy, #1E3A5F); color: #fff; font-size: 11px; padding: 1px 8px; border-radius: 10px; }
        .cmc__empty { padding: 28px 16px; text-align: center; font-size: 13px; color: var(--color-text-secondary); }
        .cmc__list { display: flex; flex-direction: column; max-height: 420px; overflow-y: auto; }
        .cmc__item { display: flex; align-items: center; gap: 10px; padding: 11px 14px; border: none; border-bottom: 1px solid var(--color-border, #f1f1f1); background: transparent; cursor: pointer; text-align: right; transition: background 0.12s; position: relative; }
        .cmc__item:hover { background: var(--color-surface-subtle, #f9fafb); }
        .cmc__item-bar { position: absolute; right: 0; top: 0; bottom: 0; width: 3px; }
        .cmc__item-time { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: var(--color-text); white-space: nowrap; }
        .cmc__item-main { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .cmc__item-client { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cmc__item-type { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--color-text-secondary); }
      `}</style>
    </div>
  );
};

export default ClientMeetingsCalendar;
