import React, { useMemo } from 'react';
import { CalendarCheck, CalendarDays, Hourglass, VideoOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ClientMeeting } from '../../services/meetingService';
import { riyadhDayKey } from '../../utils/dateAr';
import { isMissingLink } from './clientMeetingHelpers';

export type QuickFilter = 'today' | 'pending' | 'missing_link' | 'week';

interface Props {
  meetings: ClientMeeting[];
  active: QuickFilter | null;
  onPick: (filter: QuickFilter) => void;
}

const riyadhDayAfter = (days: number): string => riyadhDayKey(new Date(Date.now() + days * 86_400_000));

interface Card {
  key: QuickFilter;
  label: string;
  hint: string;
  icon: LucideIcon;
  count: number;
  /** بطاقة تنبيه: تُلوَّن حين يوجد ما يستدعي تصرّفاً، وتهدأ عند الصفر */
  alert?: boolean;
}

/**
 * شريط «ما يحتاج انتباهك» فوق القائمة — أرقامٌ تُنقر فتصير مرشِّحاً.
 *
 * الصفحة كانت تبدأ بالجدول مباشرةً: لا يعرف المحامي كم طلباً ينتظر اعتماده ولا
 * كم موعداً «عن بُعد» بلا رابط إلا بتمرير القائمة صفاً صفاً.
 */
const ClientMeetingsSummary: React.FC<Props> = ({ meetings, active, onPick }) => {
  const cards = useMemo<Card[]>(() => {
    const today = riyadhDayKey(new Date());
    const weekEnd = riyadhDayAfter(6);
    const now = Date.now();
    const open = (m: ClientMeeting) => m.status === 'pending' || m.status === 'confirmed';

    let todayCount = 0;
    let pending = 0;
    let missing = 0;
    let week = 0;

    meetings.forEach((m) => {
      const day = riyadhDayKey(m.scheduled_at);
      const isCancelled = m.status === 'cancelled_by_client' || m.status === 'cancelled_by_lawyer';
      if (day === today && !isCancelled) todayCount++;
      if (m.status === 'pending' && new Date(m.scheduled_at).getTime() > now) pending++;
      if (isMissingLink(m) && day >= today) missing++;
      if (open(m) && day >= today && day <= weekEnd) week++;
    });

    return [
      { key: 'today', label: 'مواعيد اليوم', hint: 'غير الملغاة', icon: CalendarCheck, count: todayCount },
      { key: 'pending', label: 'بانتظار اعتمادك', hint: 'طلبات من بوابة العميل', icon: Hourglass, count: pending, alert: true },
      { key: 'missing_link', label: 'عن بُعد بلا رابط', hint: 'العميل وُعد برابط', icon: VideoOff, count: missing, alert: true },
      { key: 'week', label: 'الأيام السبعة القادمة', hint: 'مؤكدة ومعلّقة', icon: CalendarDays, count: week },
    ];
  }, [meetings]);

  return (
    <div className="cmo-kpis" role="group" aria-label="ملخّص المواعيد">
      {cards.map(({ key, label, hint, icon: Icon, count, alert }) => (
        <button
          key={key}
          type="button"
          className={[
            'cmo-kpi',
            `cmo-kpi--${key}`,
            alert && count > 0 ? 'is-alert' : '',
            active === key ? 'is-active' : '',
          ].filter(Boolean).join(' ')}
          onClick={() => onPick(key)}
          aria-pressed={active === key}
        >
          <span className="cmo-kpi__icon" aria-hidden="true"><Icon size={18} /></span>
          <span className="cmo-kpi__body">
            <span className="cmo-kpi__value">{count}</span>
            <span className="cmo-kpi__label">{label}</span>
            <span className="cmo-kpi__hint">{hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
};

export default ClientMeetingsSummary;
