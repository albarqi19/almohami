import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Landmark, Clock, MapPin, Video, FileDown, Building, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  ClientSessionService,
  formatSessionTime,
  relativeDays,
  sessionDateParts,
  type ClientSession,
} from '../services/clientSessionService';
// الستايل: client-sessions.css عبر appStyles.ts (بدائيّات cs-*)

/**
 * صفٌّ واحد لجلسةٍ في بوابة العميل — تستعمله صفحة «جلساتي» وصفحة القضية (قائمة مدمجة).
 * كتلةُ التاريخ ثم العنوان والبيانات ثم رقاقةُ الحالة وزرُّ التقرير إن أُرسل.
 */
const ClientSessionRow: React.FC<{ session: ClientSession; showCase?: boolean }> = ({ session, showCase = true }) => {
  const [downloading, setDownloading] = useState(false);
  const parts = sessionDateParts(session);
  const time = formatSessionTime(session.time);
  const relative = session.status === 'upcoming' || session.status === 'today' ? relativeDays(session.days_remaining) : null;
  // ناجز يكتب في «المكان» المحكمةَ والدائرةَ نفسيهما («المحكمة التجارية بجدة - الدائرة الثالثة») — لا نكرّرهما.
  const location = session.location && !(session.court && session.location.includes(session.court)) ? session.location : null;

  const download = async () => {
    try {
      setDownloading(true);
      await ClientSessionService.downloadReport(session);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'تعذّر تنزيل التقرير');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <li className={`cs-row cs-row--${session.status}`}>
      {parts ? (
        <div className="cs-row__date" aria-label={session.date ?? undefined}>
          <span className="cs-row__day">{parts.day}</span>
          <span className="cs-row__month">{parts.month}</span>
          <span className="cs-row__weekday">{parts.weekday}</span>
        </div>
      ) : (
        <div className="cs-row__date cs-row__date--unknown">
          {session.date_hijri ? <>{session.date_hijri}<br />هـ</> : 'التاريخ غير محدد'}
        </div>
      )}

      <div className="cs-row__main">
        <div className="cs-row__title">
          <span>{session.session_type || 'جلسة'}</span>
          {showCase && session.case && (
            <>
              <span aria-hidden="true">·</span>
              <Link to={`/my-cases/${session.case.id}`}>{session.case.title}</Link>
              {session.case.file_number && <span className="cs-row__file">#{session.case.file_number}</span>}
            </>
          )}
        </div>
        <div className="cs-row__meta">
          {time && <span><Clock size={13} /> {time}</span>}
          {session.court && <span><Landmark size={13} /> {session.court}</span>}
          {session.department && <span><Building size={13} /> {session.department}</span>}
          {session.is_video_conference ? (
            <span><Video size={13} /> جلسة مرئية</span>
          ) : location ? (
            <span><MapPin size={13} /> {location}</span>
          ) : null}
          {session.date_hijri && parts && <span>{session.date_hijri} هـ</span>}
        </div>
      </div>

      <div className="cs-row__side">
        <span className={`cs-chip cs-chip--${session.status}`}>{session.status_label}</span>
        {relative && relative !== 'اليوم' && <span className="cs-row__relative">{relative}</span>}
        {session.report.has_file ? (
          <button type="button" className="cs-btn" onClick={download} disabled={downloading} title="تقرير الجلسة كما أرسله المكتب">
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
            تقرير الجلسة
          </button>
        ) : session.report.sent ? (
          <span className="cs-chip cs-chip--muted">أُرسل تقرير الجلسة</span>
        ) : null}
      </div>
    </li>
  );
};

export default ClientSessionRow;
