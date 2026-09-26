import React, { useMemo } from 'react';
import { Hourglass, VideoOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ClientMeeting } from '../../services/meetingService';
import { riyadhDayKey } from '../../utils/dateAr';
import { isMissingLink } from './clientMeetingHelpers';

export type QuickFilter = 'today' | 'pending' | 'missing_link' | 'week';

export interface ClientMeetingCounts {
  /** مواعيد اليوم غير الملغاة */
  today: number;
  /** طلبات بوابة العميل القادمة التي تنتظر الاعتماد */
  pending: number;
  /** مواعيد «عن بُعد» من اليوم فصاعداً وُعد العميل فيها برابطٍ لم يُضف */
  missing: number;
  /** المؤكدة والمعلّقة في الأيام السبعة القادمة */
  week: number;
}

const riyadhDayAfter = (days: number): string => riyadhDayKey(new Date(Date.now() + days * 86_400_000));

/**
 * أعداد الملخّص — من النافذة المحمّلة كاملةً لا من القائمة المرشَّحة، فلا تتغيّر مع التصفية.
 * «اليوم» و«٧ أيام» تُعرض عدّاداتٍ على زرَّي الفترة، والباقيان شرائحَ تنبيه (أدناه).
 */
export const useClientMeetingCounts = (meetings: ClientMeeting[]): ClientMeetingCounts =>
  useMemo(() => {
    const today = riyadhDayKey(new Date());
    const weekEnd = riyadhDayAfter(6);
    const now = Date.now();
    const open = (m: ClientMeeting) => m.status === 'pending' || m.status === 'confirmed';
    const counts: ClientMeetingCounts = { today: 0, pending: 0, missing: 0, week: 0 };

    meetings.forEach((m) => {
      const day = riyadhDayKey(m.scheduled_at);
      const isCancelled = m.status === 'cancelled_by_client' || m.status === 'cancelled_by_lawyer';
      if (day === today && !isCancelled) counts.today++;
      if (m.status === 'pending' && new Date(m.scheduled_at).getTime() > now) counts.pending++;
      if (isMissingLink(m) && day >= today) counts.missing++;
      if (open(m) && day >= today && day <= weekEnd) counts.week++;
    });

    return counts;
  }, [meetings]);

interface Props {
  counts: ClientMeetingCounts;
  active: QuickFilter | null;
  onPick: (filter: QuickFilter) => void;
}

interface Chip {
  key: QuickFilter;
  label: string;
  hint: string;
  icon: LucideIcon;
  count: number;
}

/**
 * «ما يحتاج انتباهك» — شريحتان في شريط الأدوات تُنقران فتصيران مرشِّحاً.
 *
 * كانت أربع بطاقات كبيرة فوق الشريط؛ بطاقتا «اليوم» و«الأيام السبعة» تفعلان ما يفعله زرّا
 * الفترة نفسهما، فانتقل عدداهما إلى الزرّين. وتختفي الشريحة عند الصفر: لا شيء ينتظرك.
 */
const ClientMeetingsSummary: React.FC<Props> = ({ counts, active, onPick }) => {
  const chips: Chip[] = [
    { key: 'pending', label: 'بانتظار اعتمادك', hint: 'طلبات من بوابة العميل', icon: Hourglass, count: counts.pending },
    { key: 'missing_link', label: 'بلا رابط', hint: 'مواعيد عن بُعد وُعد العميل فيها برابط', icon: VideoOff, count: counts.missing },
  ];
  // المفعّلة تبقى ولو صار عددها صفراً — هي الزرّ الذي يرفع مرشّحها
  const visible = chips.filter((c) => c.count > 0 || active === c.key);
  if (visible.length === 0) return null;

  return (
    <div className="cmo-attn" role="group" aria-label="ما يحتاج انتباهك">
      {visible.map(({ key, label, hint, icon: Icon, count }) => (
        <button
          key={key}
          type="button"
          className={`cmo-attn__chip cmo-attn__chip--${key}${active === key ? ' is-active' : ''}`}
          onClick={() => onPick(key)}
          aria-pressed={active === key}
          title={`${label} — ${hint}`}
        >
          <Icon size={14} aria-hidden="true" />
          <span className="cmo-attn__label">{label}</span>
          <span className="cmo-attn__count">{count}</span>
        </button>
      ))}
    </div>
  );
};

export default ClientMeetingsSummary;
