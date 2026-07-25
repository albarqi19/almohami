import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { internalMeetingService, type InternalMeeting, type MeetingCategory } from '../../services/meetingService';
import { riyadhDayKey } from '../../utils/dateAr';
import { monthParam } from '../calendar/calendarDays';
import SideMonthCalendar from '../calendar/SideMonthCalendar';

interface Props {
  categories: MeetingCategory[];
  categoryFilter: number | null;
  onCategoryFilter: (id: number | null) => void;
  selectedDay: string | null;
  onSelectDay: (key: string | null) => void;
}

/**
 * تقويم تبويب «القائمة» — غلافٌ رقيق حول SideMonthCalendar العامّ.
 *
 * هذا المكوّن يعرف الاجتماعات وحدها (الجلب والتصنيفات)، والشبكة والملاحة
 * والمفتاح كلّها في المكوّن العامّ الذي يخدم تبويب التقويم أيضاً.
 */
const MeetingsSideCalendar: React.FC<Props> = ({
  categories, categoryFilter, onCategoryFilter, selectedDay, onSelectDay,
}) => {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [meetings, setMeetings] = useState<InternalMeeting[]>([]);
  const [loading, setLoading] = useState(false);

  // الأشهر المزارة تُحفظ: التنقّل ذهاباً وإياباً بين شهرين كان سيُنتج طلباً
  // في كل مرة.
  const cache = useRef(new Map<string, InternalMeeting[]>());

  const load = useCallback(async (target: Date) => {
    const key = monthParam(target);
    const cached = cache.current.get(key);
    if (cached) { setMeetings(cached); return; }

    try {
      setLoading(true);
      const data = await internalMeetingService.getCalendar(key);
      cache.current.set(key, data);
      setMeetings(data);
    } catch {
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(cursor); }, [cursor, load]);

  // التجميع بمفتاح يوم الرياض لا منطقة الجهاز: اجتماع 00:30 يقع في اليوم
  // السابق لمن جهازه خارج المملكة فيظهر في خلية خاطئة.
  const dotsByDay = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const m of meetings) {
      if (categoryFilter && m.meeting_category_id !== categoryFilter) continue;
      const key = riyadhDayKey(m.scheduled_at);
      const color = m.category?.color ?? 'none';
      const list = map.get(key);
      if (list) list.push(color);
      else map.set(key, [color]);
    }
    return map;
  }, [meetings, categoryFilter]);

  return (
    <SideMonthCalendar
      cursor={cursor}
      onCursorChange={setCursor}
      dotsByDay={dotsByDay}
      selectedDay={selectedDay}
      onSelectDay={onSelectDay}
      loading={loading}
      legendTitle="التصنيفات"
      legend={categories.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        active: categoryFilter === c.id,
      }))}
      onToggleLegend={id => onCategoryFilter(categoryFilter === id ? null : (id as number))}
      dayHint={n => `${n} اجتماع`}
    />
  );
};

export default MeetingsSideCalendar;
