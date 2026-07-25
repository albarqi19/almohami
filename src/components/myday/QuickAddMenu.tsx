import React, { useEffect, useRef } from 'react';
import { Users, CalendarClock, Bell } from 'lucide-react';
import { fmtDualAr } from '../../utils/dateAr';

export type QuickAddChoice = 'meeting' | 'appointment' | 'reminder';

interface Props {
  /** «YYYY-MM-DD» */
  day: string;
  /** «HH:mm» */
  time: string;
  onTimeChange: (time: string) => void;
  anchor: { x: number; y: number };
  onChoose: (choice: QuickAddChoice) => void;
  onClose: () => void;
  canCreateMeeting: boolean;
}

const OPTIONS: { key: QuickAddChoice; label: string; hint: string; Icon: typeof Users }[] = [
  { key: 'meeting', label: 'اجتماع', hint: 'مع الفريق أو عميل أو طرف خارجي', Icon: Users },
  { key: 'appointment', label: 'موعد شخصي', hint: 'يحجب وقتك فلا يُحجز عليك', Icon: CalendarClock },
  { key: 'reminder', label: 'تذكير', hint: 'لحظة تنبيه بلا مدّة', Icon: Bell },
];

/**
 * قائمة الإنشاء السريع — تُفتح عند النقر على فراغ خلية اليوم.
 *
 * الوقت حاضرٌ وقابل للتعديل هنا لا في الخطوة التالية: خلية الشهر تعطي تاريخاً
 * لا ساعة، وفتح نموذج كامل بوقت مخمَّن يجعل أول ما يفعله المستخدم تصحيحَه.
 * فنسأل عن الساعة مرّةً في السطر الأول، ثم يُفتح النموذج معبّأً بالاثنين.
 */
const QuickAddMenu: React.FC<Props> = ({
  day, time, onTimeChange, anchor, onChoose, onClose, canCreateMeeting,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };

    // تأخير إطار واحد: النقرة التي فتحت القائمة كانت ستغلقها فوراً
    const id = window.setTimeout(() => document.addEventListener('mousedown', onDown), 0);
    window.addEventListener('keydown', onKey);

    return () => {
      window.clearTimeout(id);
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // القياس لا التخمين: قرب حافة الشاشة تنقلب القائمة بدل أن تُقصّ
  const style: React.CSSProperties = {
    top: Math.min(anchor.y, window.innerHeight - 250),
    left: Math.min(Math.max(anchor.x - 120, 8), window.innerWidth - 250),
  };

  const visible = OPTIONS.filter(o => o.key !== 'meeting' || canCreateMeeting);

  return (
    <div className="qam" ref={ref} style={style} role="menu">
      <div className="qam__head">
        <span>{fmtDualAr(day)}</span>
        <input
          type="time"
          value={time}
          onChange={e => onTimeChange(e.target.value)}
          aria-label="الوقت"
          className="qam__time"
        />
      </div>

      {visible.map(({ key, label, hint, Icon }) => (
        <button key={key} type="button" role="menuitem" className="qam__item" onClick={() => onChoose(key)}>
          <Icon size={15} />
          <span>
            <b>{label}</b>
            <em>{hint}</em>
          </span>
        </button>
      ))}
    </div>
  );
};

export default QuickAddMenu;
