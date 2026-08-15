import React from 'react';
import { AlertTriangle, Fingerprint, ListTree, RefreshCw } from 'lucide-react';

import {
  ATTENDANCE_SOURCE_LABELS,
  ATTENDANCE_TRUST_LABELS,
  PUNCH_DIRECTION_LABELS,
  PUNCH_SUSPECT_LABELS,
  RESOLUTION_DECISION_LABELS,
} from '../../../types/hr';
import type { AttendanceDayRow } from '../../../types/hr';
import { useAttendanceEmployee } from './useAttendanceQueue';
import {
  EMPTY_MARK,
  errorText,
  fmtDate,
  fmtDateTime,
  fmtMinutes,
  stampParts,
  statusClass,
  statusLabel,
  whyRows,
} from './attendanceFormat';

/**
 * العمودُ الأيسر — **سردُ «لماذا»** وخطُّ البصمات ليومٍ واحد.
 *
 * السردُ **مركَّبٌ في الواجهة** من `explain` (مؤشّراتٌ + رمزُ قاعدة) ومن خرائط التسمية في
 * `types/hr.ts` — **ولا نصَّ عربيَّ مخزَّنٌ في القاعدة**: تصحيحُ صياغةٍ لا يلمس صفّاً، ونثرٌ
 * لكلّ يومٍ يعني ميجابايتاتٍ لا تُبحث ولا تُترجَم.
 *
 * البصماتُ تُجلب من `GET /hr/attendance/employees/{id}` بمدىً = **يومٌ واحد** (نداءٌ واحدٌ
 * خفيف)، فحمولةُ الطابور لا تحمل بصماتٍ ولا يجوز أن تحملها: خمسُ بصماتٍ × ٥٠٠ صفٍّ حمولةٌ
 * لا تُقرأ.
 *
 * 🚫 **ولا خريطةَ ولا «أين فريقي الآن»** — ولا إحداثيٌّ مخزَّنٌ أصلاً كي يُعرض.
 */

interface Props {
  profileId: number | null;
  day: AttendanceDayRow | null;
  canManage: boolean;
  /** يفتح مودالَ البصمة اليدوية على هذا اليوم — مسارٌ حقيقيّ (`POST …/punches`). */
  onAddPunch: (profileId: number, date: string) => void;
  /** ينقض القرارَ النافذ على اليوم — `POST …/resolutions/{id}/void`. */
  onVoid: (resolutionId: number) => void;
  /** يُغلق العمود — الطريقُ الوحيد للعودة دون 1024 حيث يُكدَّس تحت الطابور. */
  onClose: () => void;
}

export const AttendanceDayDetail: React.FC<Props> = ({
  profileId,
  day,
  canManage,
  onAddPunch,
  onVoid,
  onClose,
}) => {
  const date = day?.work_date ?? '';
  const record = useAttendanceEmployee(profileId !== null && date !== '' ? profileId : null, date, date);

  if (day === null || profileId === null) {
    return (
      <>
        <div className="hra-sech">
          <h2 className="hra-sech__t">
            <ListTree size={14} aria-hidden="true" /> تفاصيلُ اليوم
          </h2>
        </div>
        <div className="hra-scroll">
          <p className="hra-line">اختر يوماً من الطابور ليُشرح هنا</p>
        </div>
      </>
    );
  }

  const punches = (record.data?.punches ?? []).filter((p) => p.work_date === date);
  const resolution = (record.data?.resolutions ?? [])
    .filter((r) => r.work_date === date)
    .slice(-1)[0] ?? null;

  return (
    <>
      <div className="hra-sech">
        <h2 className="hra-sech__t">
          <ListTree size={14} aria-hidden="true" /> {fmtDate(date)}
        </h2>
        <span className="hra-day__end">
          <span className={statusClass(day.status)}>{statusLabel(day.status)}</span>
          <button type="button" className="ssp2-btn" onClick={onClose}>إغلاق</button>
        </span>
      </div>

      <div className="hra-scroll">
        <ul className="hra-why">
          {whyRows(day).map((row) => (
            <li className={`hra-why__i${row.ok ? '' : ' is-no'}`} key={row.key}>
              <span className="hra-why__m" aria-hidden="true">{row.ok ? '✔' : '✖'}</span>
              <span>{row.text}</span>
            </li>
          ))}
        </ul>

        <div className="hra-secb">
          <dl className="hra-kv">
            <dt>المطلوب</dt>
            <dd dir="ltr">{fmtMinutes(day.required_minutes)}</dd>

            <dt>المُنجَز</dt>
            <dd dir="ltr">{fmtMinutes(day.worked_minutes)}</dd>

            {/* 🚫 لا يُجمع `late_minutes` مع `undertime_minutes` في أيّ مجموعٍ أو رسم:
                الأوّلُ مكوّنٌ تفسيريّ والثاني هو الرقمُ المجمَّع الوحيد. */}
            <dt>العجز</dt>
            <dd dir="ltr">{fmtMinutes(day.undertime_minutes)}</dd>

            <dt>آخرُ احتساب</dt>
            <dd>{day.computed_at ? fmtDateTime(day.computed_at) : EMPTY_MARK}</dd>
          </dl>
        </div>

        {resolution !== null && (
          <>
            <div className="hra-sech">
              <h3 className="hra-sech__t">القرارُ النافذ</h3>
            </div>
            <div className="hra-secb">
              <p>
                {RESOLUTION_DECISION_LABELS[resolution.decision] ?? resolution.decision}
                {' — '}
                {resolution.reason}
              </p>
              <p className="hra-sub">{fmtDateTime(resolution.decided_at)}</p>
              {canManage && resolution.decision !== 'void' && (
                <p>
                  <button
                    type="button"
                    className="ssp2-btn"
                    onClick={() => onVoid(resolution.id)}
                  >
                    انقض هذا القرار
                  </button>
                </p>
              )}
            </div>
          </>
        )}

        <div className="hra-sech">
          <h3 className="hra-sech__t">
            <Fingerprint size={14} aria-hidden="true" /> البصمات
          </h3>
          {canManage && (
            <button type="button" className="ssp2-btn" onClick={() => onAddPunch(profileId, date)}>
              أضِف بصمة
            </button>
          )}
        </div>

        {record.isPending ? (
          <div className="hra-state hra-state--loading" aria-busy="true" aria-label="جارٍ تحميل البصمات">
            {Array.from({ length: 3 }, (_, i) => <span className="hra-skel" key={i} />)}
          </div>
        ) : record.isError ? (
          <div className="hra-state hra-state--error">
            <AlertTriangle size={18} aria-hidden="true" />
            <p className="hra-state__t">تعذّر جلبُ البصمات</p>
            <p className="hra-state__d">{errorText(record.error, 'انقطعَ الاتصال بالخادم.')}</p>
            <button type="button" className="ssp2-btn" onClick={() => { void record.refetch(); }}>
              <RefreshCw size={13} /> إعادة المحاولة
            </button>
          </div>
        ) : punches.length === 0 ? (
          <p className="hra-line">صفرُ بصماتٍ في هذا اليوم</p>
        ) : (
          <ul className="hra-tl">
            {punches.map((punch) => {
              /* 🔴 نطاقان لا نطاقاً واحداً: `dir="ltr"` على النطاق الجامع كان ينتزع رقمَ اليوم
                 من شهره العربيّ ويُلصقه بالساعة («05 أغسطس · 05:22» ⇒ «05 05:22 · أغسطس»).
                 فالتاريخُ يُرسم في اتجاه الصفحة، والوقتُ وحدَه معزولٌ لاتينياً. */
              const stamp = stampParts(punch.punched_at);

              return (
                <li className="hra-tl__i" key={punch.id}>
                  <span className="hra-tl__t">
                    {stamp.date}
                    {stamp.time !== null && (
                      <>
                        {' · '}
                        <span className="hra-tl__c" dir="ltr">{stamp.time}</span>
                      </>
                    )}
                  </span>
                  <span className="hra-tl__m">
                    <span>
                      {PUNCH_DIRECTION_LABELS[punch.direction]} ·{' '}
                      {ATTENDANCE_SOURCE_LABELS[punch.source] ?? punch.source} ·{' '}
                      {ATTENDANCE_TRUST_LABELS[punch.trust_level] ?? punch.trust_level}
                    </span>
                    {punch.reason && <span>{punch.reason}</span>}
                    {punch.is_suspect && (
                      <span className="hra-flags">
                        {(punch.suspect_reasons ?? []).map((reason) => (
                          <span className="hra-flag" key={reason}>
                            {PUNCH_SUSPECT_LABELS[reason] ?? reason}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
};

export default AttendanceDayDetail;
