import React, { useEffect, useState } from 'react';
import {
  AlertTriangle, Briefcase, CalendarDays, CheckCircle, Clock, Copy, FileText, Link2,
  Mail, MapPin, MessageCircle, Pencil, Phone, User, Video, X, XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ClientMeeting } from '../../services/meetingService';
import { fmtDualAr, fmtTimeAr, relativeDayAr } from '../../utils/dateAr';
import { toWhatsappLink } from '../../utils/phone';
import {
  CLIENT_MEETING_STATUS,
  clientDisplayEmail,
  clientDisplayName,
  clientDisplayPhone,
  clientMeetingActions,
  isMissingLink,
} from './clientMeetingHelpers';

interface Props {
  meeting: ClientMeeting;
  onClose: () => void;
  onApprove: (meeting: ClientMeeting) => void;
  onEdit: (meeting: ClientMeeting) => void;
  onOutcome: (meeting: ClientMeeting) => void;
  onNoShow: (meeting: ClientMeeting) => void;
  onCancel: (meeting: ClientMeeting) => void;
  onLinkCase: (meeting: ClientMeeting) => void;
}

/**
 * لوحة تفاصيل موعد العميل — تنزلق من اليسار بنمط لوحة «يومي» (mdp-*).
 *
 * الجدول لا يعرض الملاحظات ولا البريد ولا رابط الاجتماع، ولم يكن للموعد ما يُفتح:
 * رابطُ «انضمام» غائب، ورابطُ إشعار «حجز موعد جديد» (/meetings/client/{id}) يسقط
 * على «الصفحة غير موجودة». هذه اللوحة موضع الموعد الكامل وإجراءاته.
 */
const ClientMeetingDrawer: React.FC<Props> = ({
  meeting, onClose, onApprove, onEdit, onOutcome, onNoShow, onCancel, onLinkCase,
}) => {
  const [copied, setCopied] = useState(false);

  // Esc يغلق — اللوحة طبقة فوق المحتوى فتتبع اتفاقية الطبقات
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => setCopied(false), [meeting.id]);

  const status = CLIENT_MEETING_STATUS[meeting.status] ?? CLIENT_MEETING_STATUS.pending;
  const actions = clientMeetingActions(meeting);
  const end = new Date(new Date(meeting.scheduled_at).getTime() + meeting.duration_minutes * 60_000);
  const phone = clientDisplayPhone(meeting);
  const email = clientDisplayEmail(meeting);
  const whatsapp = toWhatsappLink(phone);
  const isOpen = meeting.status === 'pending' || meeting.status === 'confirmed';

  const copyLink = async () => {
    if (!meeting.video_meeting_url) return;
    try {
      await navigator.clipboard.writeText(meeting.video_meeting_url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* الحافظة محجوبة (سياق غير آمن) — الرابط ظاهرٌ نصاً للنسخ اليدوي */
    }
  };

  return (
    <>
      <div className="mdp-scrim" onClick={onClose} aria-hidden="true" />

      <aside className="mdp" role="dialog" aria-modal="true" aria-label={meeting.title || clientDisplayName(meeting)}>
        <header className="mdp__head">
          <span className={`fin-badge fin-badge--${status.tone}`}>{status.label}</span>
          <button type="button" className="mdp__close" onClick={onClose} aria-label="إغلاق">
            <X size={16} />
          </button>
        </header>

        <div className="mdp__body">
          <h3 className="mdp__title">{meeting.title || `موعد مع ${clientDisplayName(meeting)}`}</h3>
          <p className="mdp__sub">{clientDisplayName(meeting)}</p>

          {meeting.status === 'pending' && (
            <p className="mdp__hint">
              <AlertTriangle size={13} /> طلبٌ من العميل بانتظار اعتمادك — لم يصله تأكيدٌ بعد.
            </p>
          )}

          {isMissingLink(meeting) && (
            <p className="mdp__hint">
              <AlertTriangle size={13} /> الموعد عن بُعد ولم يُضف رابطه بعد — العميل وُعد به قبل الموعد.
            </p>
          )}

          <dl className="mdp__facts">
            <div>
              <dt><CalendarDays size={13} /> التاريخ</dt>
              <dd>{relativeDayAr(meeting.scheduled_at)} — {fmtDualAr(meeting.scheduled_at)}</dd>
            </div>

            <div>
              <dt><Clock size={13} /> الوقت</dt>
              <dd>{fmtTimeAr(meeting.scheduled_at)} – {fmtTimeAr(end)} · {meeting.duration_minutes} دقيقة</dd>
            </div>

            {meeting.meeting_type === 'remote' ? (
              <div>
                <dt><Video size={13} /> عن بُعد</dt>
                <dd>
                  {meeting.video_meeting_url ? (
                    <>
                      <span className="cmo-url">{meeting.video_meeting_url}</span>
                      <span className="cmo-fact-actions">
                        <button type="button" className="fin-btn fin-btn--sm" onClick={copyLink}>
                          {copied ? <CheckCircle size={12} /> : <Copy size={12} />} {copied ? 'نُسخ' : 'نسخ الرابط'}
                        </button>
                      </span>
                    </>
                  ) : (
                    'لم يُضف رابط بعد'
                  )}
                </dd>
              </div>
            ) : (
              <div>
                <dt><MapPin size={13} /> حضوري</dt>
                <dd>{meeting.location || 'لم يُحدَّد المكان'}</dd>
              </div>
            )}

            <div>
              <dt><User size={13} /> العميل</dt>
              <dd>
                {clientDisplayName(meeting)}
                {(phone || email) && (
                  <span className="cmo-fact-actions">
                    {phone && (
                      <a className="fin-btn fin-btn--sm" href={`tel:${phone}`}>
                        <Phone size={12} /> <span dir="ltr">{phone}</span>
                      </a>
                    )}
                    {whatsapp && (
                      <a className="fin-btn fin-btn--sm" href={whatsapp} target="_blank" rel="noopener noreferrer">
                        <MessageCircle size={12} /> واتساب
                      </a>
                    )}
                    {email && (
                      <a className="fin-btn fin-btn--sm" href={`mailto:${email}`}>
                        <Mail size={12} /> بريد
                      </a>
                    )}
                  </span>
                )}
              </dd>
            </div>

            {meeting.lawyer?.name && (
              <div>
                <dt>المحامي</dt>
                <dd>{meeting.lawyer.name}</dd>
              </div>
            )}

            <div>
              <dt><Briefcase size={13} /> القضية</dt>
              <dd>
                {meeting.case ? (
                  <Link to={`/cases/${meeting.case.id}`}>
                    {meeting.case.title}{meeting.case.file_number ? ` (${meeting.case.file_number})` : ''}
                  </Link>
                ) : (
                  'غير مرتبط بقضية'
                )}
                {meeting.status !== 'cancelled_by_client' && meeting.status !== 'cancelled_by_lawyer' && (
                  <span className="cmo-fact-actions">
                    <button type="button" className="fin-btn fin-btn--sm" onClick={() => onLinkCase(meeting)}>
                      <Link2 size={12} /> {meeting.case ? 'تغيير أو فكّ الربط' : 'ربط بقضية'}
                    </button>
                  </span>
                )}
              </dd>
            </div>

            {meeting.notes && (
              <div>
                <dt>ملاحظات</dt>
                <dd className="mdp__notes">{meeting.notes}</dd>
              </div>
            )}

            {meeting.status === 'completed' && (
              <div>
                <dt><FileText size={13} /> نتيجة الاجتماع</dt>
                <dd className="mdp__notes">{meeting.outcome || 'لم تُسجَّل نتيجة'}</dd>
              </div>
            )}

            {meeting.cancellation_reason && !isOpen && (
              <div>
                <dt>سبب الإلغاء</dt>
                <dd className="mdp__notes">{meeting.cancellation_reason}</dd>
              </div>
            )}
          </dl>

          {isOpen && meeting.meeting_type === 'remote' && meeting.video_meeting_url && (
            <a
              className="fin-btn fin-btn--primary mdp__join"
              href={meeting.video_meeting_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Video size={14} /> انضمام
            </a>
          )}

          <div className="mdp__actions">
            {actions.approve && (
              <button type="button" className="fin-btn fin-btn--primary" onClick={() => onApprove(meeting)}>
                <CheckCircle size={13} /> اعتماد وإبلاغ العميل
              </button>
            )}
            {actions.edit && (
              <button type="button" className="fin-btn" onClick={() => onEdit(meeting)}>
                <Pencil size={13} /> {isMissingLink(meeting) ? 'إضافة الرابط أو التعديل' : 'تعديل أو تأجيل'}
              </button>
            )}
            {actions.complete && (
              <button type="button" className="fin-btn" onClick={() => onOutcome(meeting)}>
                <CheckCircle size={13} /> إنهاء وتسجيل النتيجة
              </button>
            )}
            {actions.viewOutcome && (
              <button type="button" className="fin-btn" onClick={() => onOutcome(meeting)}>
                <FileText size={13} /> {meeting.outcome ? 'تعديل النتيجة' : 'إضافة نتيجة'}
              </button>
            )}
            {actions.noShow && (
              <button type="button" className="fin-btn" onClick={() => onNoShow(meeting)}>
                <AlertTriangle size={13} /> لم يحضر
              </button>
            )}
            {actions.cancel && (
              <button type="button" className="fin-btn fin-btn--danger" onClick={() => onCancel(meeting)}>
                <XCircle size={13} /> إلغاء الموعد
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default ClientMeetingDrawer;
