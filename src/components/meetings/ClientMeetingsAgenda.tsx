import React, { useMemo } from 'react';
import {
  AlertTriangle, Briefcase, CheckCircle, FileText, Link2, MapPin, PanelLeftOpen,
  Pencil, User, Video, VideoOff, XCircle,
} from 'lucide-react';
import ActionMenu, { type ActionMenuItem } from '../erp/ActionMenu';
import type { ClientMeeting } from '../../services/meetingService';
import { fmtDayMonthAr, fmtTimeAr, relativeDayAr, riyadhDayKey } from '../../utils/dateAr';
import { toHijri } from '../../utils/hijriDate';
import { formatPhoneDisplay } from '../../utils/phone';
import {
  CLIENT_MEETING_STATUS,
  clientDisplayName,
  clientDisplayPhone,
  clientMeetingActions,
  isMissingLink,
} from './clientMeetingHelpers';

type Handler = (meeting: ClientMeeting) => void;

interface Props {
  /** مرشَّحة ومرتّبة — الأيام تُعرض بترتيبها هنا */
  meetings: ClientMeeting[];
  /** عمود المحامي لمن يرى مواعيد أكثر من محامٍ */
  showLawyer: boolean;
  onOpen: Handler;
  onApprove: Handler;
  onEdit: Handler;
  onOutcome: Handler;
  onNoShow: Handler;
  onCancel: Handler;
  onLinkCase: Handler;
}

const NEAR_DAYS = ['اليوم', 'غداً', 'أمس'];

/** «موعد واحد / موعدان / ٣ مواعيد / ١١ موعداً» */
const countLabel = (n: number): string => {
  if (n === 1) return 'موعد واحد';
  if (n === 2) return 'موعدان';
  if (n >= 3 && n <= 10) return `${n} مواعيد`;
  return `${n} موعداً`;
};

const statusKey = (m: ClientMeeting): string =>
  m.status === 'cancelled_by_client' || m.status === 'cancelled_by_lawyer' ? 'cancelled' : m.status;

/**
 * المواعيد مجمّعةً بأيامها — بديل الجدول المسطّح.
 *
 * الجدول كان يكرّر التاريخ الهجري في كل صفّ ويضع «ربط بقضية» زرّاً في كل سطر،
 * والموعد يُقرأ بيومه أولاً: «ماذا عندي اليوم وغداً». الترويسة تحمل اليوم مرّة،
 * والصفّ يحمل الوقت والعميل وما يلزم فعله الآن.
 */
const ClientMeetingsAgenda: React.FC<Props> = ({
  meetings, showLawyer, onOpen, onApprove, onEdit, onOutcome, onNoShow, onCancel, onLinkCase,
}) => {
  const groups = useMemo(() => {
    const out: { key: string; items: ClientMeeting[] }[] = [];
    meetings.forEach((m) => {
      const key = riyadhDayKey(m.scheduled_at);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(m);
      else out.push({ key, items: [m] });
    });
    // داخل اليوم بترتيب الساعة دائماً — ولو كانت الأيام نفسها من الأحدث إلى الأقدم
    out.forEach((g) => g.items.sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    ));
    return out;
  }, [meetings]);

  const menuItems = (m: ClientMeeting): ActionMenuItem[] => {
    const a = clientMeetingActions(m);
    const cancelled = statusKey(m) === 'cancelled';
    return [
      { label: 'فتح التفاصيل', icon: PanelLeftOpen, onClick: () => onOpen(m) },
      { label: 'اعتماد وإبلاغ العميل', icon: CheckCircle, onClick: () => onApprove(m), hidden: !a.approve, variant: 'success' },
      { label: 'تعديل أو تأجيل', icon: Pencil, onClick: () => onEdit(m), hidden: !a.edit },
      { label: 'إنهاء وتسجيل النتيجة', icon: CheckCircle, onClick: () => onOutcome(m), hidden: !a.complete },
      { label: m.outcome ? 'تعديل النتيجة' : 'إضافة نتيجة', icon: FileText, onClick: () => onOutcome(m), hidden: !a.viewOutcome },
      { label: m.case ? 'تغيير القضية' : 'ربط بقضية', icon: Link2, onClick: () => onLinkCase(m), hidden: cancelled },
      { label: 'لم يحضر', icon: AlertTriangle, onClick: () => onNoShow(m), hidden: !a.noShow, variant: 'warning' },
      { label: 'إلغاء الموعد', icon: XCircle, onClick: () => onCancel(m), hidden: !a.cancel, variant: 'danger', divider: true },
    ];
  };

  /** إجراءٌ واحد ظاهر في الصفّ: ما يلزم الآن تحديداً، والباقي في القائمة. */
  const quickAction = (m: ClientMeeting): React.ReactNode => {
    const a = clientMeetingActions(m);
    const isToday = riyadhDayKey(m.scheduled_at) === riyadhDayKey(new Date());
    // «انضمام» لموعد اليوم ما لم ينتهِ (بمهلة نصف ساعة) — وبعده يصير الإجراءُ تسجيلَ النتيجة
    const endsAt = new Date(m.scheduled_at).getTime() + (m.duration_minutes + 30) * 60_000;
    const joinable = isToday && Date.now() <= endsAt;

    if (a.approve) {
      return (
        <button type="button" className="fin-btn fin-btn--sm fin-btn--primary" onClick={() => onApprove(m)}>
          <CheckCircle size={13} /> اعتماد
        </button>
      );
    }
    if (isMissingLink(m)) {
      return (
        <button type="button" className="fin-btn fin-btn--sm" onClick={() => onEdit(m)}>
          <Link2 size={13} /> إضافة الرابط
        </button>
      );
    }
    if (m.status === 'confirmed' && m.meeting_type === 'remote' && m.video_meeting_url && joinable) {
      return (
        <a className="fin-btn fin-btn--sm fin-btn--primary" href={m.video_meeting_url} target="_blank" rel="noopener noreferrer">
          <Video size={13} /> انضمام
        </a>
      );
    }
    if (a.complete && m.status !== 'no_show') {
      return (
        <button type="button" className="fin-btn fin-btn--sm" onClick={() => onOutcome(m)}>
          <FileText size={13} /> تسجيل النتيجة
        </button>
      );
    }
    return null;
  };

  return (
    <div className="cmo-agenda">
      {groups.map(({ key, items }) => {
        const at = items[0].scheduled_at;
        const rel = relativeDayAr(at);
        const near = NEAR_DAYS.includes(rel);
        const hijri = toHijri(at);

        return (
          <section key={key} className="cmo-day" aria-label={near ? rel : fmtDayMonthAr(at)}>
            <header className={`cmo-day__head${rel === 'اليوم' ? ' is-today' : ''}`}>
              <span className="cmo-day__label">{near ? rel : fmtDayMonthAr(at)}</span>
              <span className="cmo-day__date">
                {near ? fmtDayMonthAr(at) : ''}
                {hijri ? `${near ? ' · ' : ''}${hijri}` : ''}
              </span>
              <span className="cmo-day__count">{countLabel(items.length)}</span>
            </header>

            <div className="cmo-day__list">
              {items.map((m) => {
                const status = CLIENT_MEETING_STATUS[m.status] ?? CLIENT_MEETING_STATUS.pending;
                const name = clientDisplayName(m);
                const phone = clientDisplayPhone(m);
                const showTitle = Boolean(m.title && !m.title.includes(name));
                const remote = m.meeting_type === 'remote';

                return (
                  <div
                    key={m.id}
                    className={`cmo-appt cmo-appt--${statusKey(m)}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpen(m)}
                    onKeyDown={(e) => { if (e.key === 'Enter') onOpen(m); }}
                    aria-label={`${fmtTimeAr(m.scheduled_at)} — ${name}`}
                  >
                    <div className="cmo-appt__time">
                      <strong>{fmtTimeAr(m.scheduled_at)}</strong>
                      <span>{m.duration_minutes} دقيقة</span>
                    </div>

                    <div className="cmo-appt__who">
                      <span className="cmo-avatar" aria-hidden="true">{name.trim().charAt(0) || '؟'}</span>
                      <div className="cmo-appt__id">
                        <span className="cmo-appt__name">{name}</span>
                        <span className="cmo-appt__sub">
                          {showTitle && <span>{m.title}</span>}
                          {showTitle && phone && <span aria-hidden="true"> · </span>}
                          {phone && <span dir="ltr">{formatPhoneDisplay(phone)}</span>}
                        </span>
                      </div>
                    </div>

                    <div className="cmo-appt__tags">
                      <span className={`cmo-tag cmo-tag--${remote ? 'remote' : 'inperson'}`}>
                        {remote ? <Video size={12} /> : <MapPin size={12} />}
                        {remote ? 'عن بُعد' : 'حضوري'}
                      </span>
                      {isMissingLink(m) && (
                        <span className="cmo-tag cmo-tag--warn" title="العميل وُعد برابطٍ قبل الموعد">
                          <VideoOff size={12} /> بلا رابط
                        </span>
                      )}
                      {m.case && (
                        <span className="cmo-tag cmo-tag--case" title={m.case.file_number || undefined}>
                          <Briefcase size={12} /> <span className="cmo-tag__text">{m.case.title}</span>
                        </span>
                      )}
                      {showLawyer && m.lawyer?.name && (
                        <span className="cmo-tag" title="المحامي">
                          <User size={12} /> <span className="cmo-tag__text">{m.lawyer.name}</span>
                        </span>
                      )}
                    </div>

                    <div className="cmo-appt__end" onClick={(e) => e.stopPropagation()}>
                      <span className={`fin-badge fin-badge--${status.tone}`}>{status.label}</span>
                      {quickAction(m)}
                      <span className="cmo-appt__menu">
                        <ActionMenu items={menuItems(m)} label="إجراءات الموعد" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default ClientMeetingsAgenda;
