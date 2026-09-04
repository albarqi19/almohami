import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { AlertTriangle, Fingerprint, RefreshCw } from 'lucide-react';

import { hrAttendanceService } from '../../../services/hrAttendanceService';
import { PUNCH_DIRECTION_LABELS } from '../../../types/hr';
import type { AttendanceDayRow, PunchDirection } from '../../../types/hr';
import ClaimModal from '../attendance/ClaimModal';
import { ATT_KEYS, usePunch } from '../attendance/useAttendanceQueue';
import {
  errorText,
  fmtDayLine,
  fmtTime,
  makeClientKey,
  monthStartISO,
  statusClass,
  statusLabel,
  todayISO,
} from '../attendance/attendanceFormat';
import { errorStatus } from './errorStatus';

/**
 * **بوّابةُ الموظف — «إثباتُ حضورك بيدك» لا «مراقبةُ الدوام».**
 *
 * أوّلُ ما يراه الموظفُ **سجلُّه هو**، ومعه زرُّ بصمةٍ واحدٌ كبير، وزرُّ «هذا غير صحيح» ينشئ
 * طلبَ تصحيح. وهو الطريقُ الوحيد الذي يملكه لتصحيح يومه — إغلاقُه يترك مكالمةً مع المدير
 * سبيلاً وحيداً، وهذا بعينه ما يُعلِّم الفريقَ أن النظام ضدَّهم.
 *
 * ══════ الحقلُ الذي يحسم شكلَ البطاقة ══════
 * `punch_enabled` و`punch_blocked_reason` يصلان **٢٠٠ داخل `data`** لا في مسار الخطأ — فمن
 * ليس ضمن المُتتبَّعين **لا يُرسَم له زرٌّ أصلاً** ويُكتب سببُ الخادم كما هو: زرٌّ يرمي ٤٢٢
 * في وجه من لا شأنَ له أسوأُ من غيابه.
 *
 * ══════ مفتاحُ التكرار ══════
 * `client_key` يُولَّد لكلّ نقرة، والنقرةُ المكرّرة تُرجع الصفَّ القائم بـ٢٠٠ لا خطأً يبدو
 * عطلاً. و`punched_at` **لا يُرسَل إطلاقاً**: وقتُ الخادم هو الحُجّة.
 *
 * 🔴 **صفرُ استطلاعٍ دوريّ** — التحديثُ بعد النقرة وحدَها.
 */

/** آخرُ اتجاهٍ سُجّل اليومَ ⇒ الزرُّ التالي عكسُه. لا بصمةَ اليومَ ⇒ دخول. */
function nextDirection(today: AttendanceDayRow | null, lastDirection: PunchDirection | null): PunchDirection {
  if (lastDirection !== null) return lastDirection === 'in' ? 'out' : 'in';
  return today?.first_in_at && !today.last_out_at ? 'out' : 'in';
}

export const MyAttendanceCard: React.FC = () => {
  const [claimFor, setClaimFor] = useState<string | null>(null);

  const record = useQuery({
    queryKey: ATT_KEYS.mine(monthStartISO(), todayISO()),
    queryFn: () => hrAttendanceService.getMine({ from: monthStartISO(), to: todayISO() }),
    retry: false,
  });

  const punch = usePunch();
  const status = errorStatus(record.error);

  // ٤٠٤ (لا ملفَّ) و٤٠٣ (الميزةُ مطفأة) حالتان طبيعيتان في مكتبٍ لم يفتح الوحدة —
  // ولا تُعرضان شاشةَ عطلٍ حمراء، بل **لا تُعرض البطاقةُ إطلاقاً**: لا شأنَ له بها.
  if (status === 404 || status === 403) return null;

  const data = record.data;

  // 🔴 **يومُ العمل ليس اليومَ التقويميّ.** الخادمُ يُجمّد `work_date` بـ`day_cutoff_hour`
  // من نسخة الجدول (افتراضُه الرابعة فجراً)، فبصمةٌ في ١٢:٤٦ ليلاً تُنسَب **لليوم السابق**
  // — وهو الصوابُ لأجل الورديات الليلية.
  //
  // وكانت المقارنةُ هنا بـ`todayISO()` التقويميّ، فلا تجد بصماتِ الليلة ⇒ `last = null`
  // ⇒ الزرُّ يبقى «دخول» أبداً، فيسجّل من ضغط ثلاثاً **ثلاثةَ دخولات**.
  //
  // فالمرجعُ الصحيح: **`work_date` لآخر بصمةٍ وصلت** — هو يومُ العمل المفتوح فعلاً.
  // وبلا بصمةٍ إطلاقاً نرجع إلى التقويميّ (أوّلُ بصمةٍ في عمر الموظّف).
  const punches = data?.punches ?? [];
  const lastAny = punches.length > 0 ? punches[punches.length - 1] : null;
  const workDay = lastAny?.work_date ?? todayISO();

  const todayRow = data?.days.find((d) => d.work_date === workDay) ?? null;
  const todayPunches = punches.filter((p) => p.work_date === workDay);
  const last = todayPunches.length > 0 ? todayPunches[todayPunches.length - 1] : null;
  const direction = nextDirection(todayRow, last?.direction ?? null);

  const doPunch = async () => {
    try {
      await punch.mutateAsync({ direction, clientKey: makeClientKey() });
      toast.success(`تم تسجيل ${PUNCH_DIRECTION_LABELS[direction]}ك`);
    } catch (e) {
      toast.error(errorText(e, 'تعذر تسجيل البصمة'));
    }
  };

  return (
    <>
      {claimFor !== null && (
        <ClaimModal
          defaultDate={claimFor}
          onClose={() => setClaimFor(null)}
          onDone={() => { void record.refetch(); }}
        />
      )}

      <section className="hrl-block">
        <div className="hrl-block__h">
          <h2 className="hrl-block__t hrl-h2">
            <Fingerprint size={14} aria-hidden="true" /> تسجيل الحضور
          </h2>
        </div>

        {record.isPending ? (
          <div className="hra-state hra-state--loading" aria-busy="true" aria-label="جارٍ تحميل سجل حضورك">
            {Array.from({ length: 3 }, (_, i) => <span className="hra-skel" key={i} />)}
          </div>
        ) : record.isError || !data ? (
          <div className="hra-state hra-state--error">
            <AlertTriangle size={18} aria-hidden="true" />
            <p className="hra-state__t">تعذر تحميل سجل حضورك</p>
            <p className="hra-state__d">{errorText(record.error, 'انقطع الاتصال بالخادم.')}</p>
            <button type="button" className="hr-btn hr-btn--sm" onClick={() => { void record.refetch(); }}>
              <RefreshCw size={13} /> إعادة المحاولة
            </button>
          </div>
        ) : (
          <>
            <div className="hra-punch">
              {data.punch_enabled ? (
                <button
                  type="button"
                  className={direction === 'in' ? 'hra-punch__b' : 'hra-punch__b hra-punch__b--out'}
                  onClick={() => { void doPunch(); }}
                  disabled={punch.isPending}
                >
                  <Fingerprint size={17} aria-hidden="true" />
                  {punch.isPending ? 'جارٍ التسجيل…' : `تسجيل ${PUNCH_DIRECTION_LABELS[direction]}`}
                </button>
              ) : null}

              <span className="hra-punch__s">
                {data.punch_enabled ? (
                  <>
                    <span>
                      {last === null
                        ? 'لم تسجل حضورك اليوم بعد.'
                        : `آخر بصمة اليوم: ${PUNCH_DIRECTION_LABELS[last.direction]} ${fmtTime(last.punched_at)}`}
                    </span>
                    <span className="hra-punch__note">
                      يسجل النظام الوقت من الخادم، <strong>ولا يخزن موقعك</strong>.
                    </span>
                  </>
                ) : (
                  <>
                    <span>{data.punch_blocked_reason?.message ?? 'الحضور غير مفعل على ملفك.'}</span>
                    <span className="hra-punch__note">
                      لا شيء مطلوب منك، والحضور غير المفعل لا يحتسب عليك.
                    </span>
                  </>
                )}
              </span>
            </div>

            {data.days.length === 0 ? (
              <p className="hra-line">لا توجد أيام محتسبة بعد في هذا الشهر</p>
            ) : (
              <div className="hrl-block__b hrl-block__b--flush">
                {/* `--rec`: صفُّ سجلٍّ في صفحةٍ عريضة — يجاور فعلُه محتواه بدل أن
                    يُشَدَّ إلى الحافة المقابلة (انظر `hr-attendance.css`). */}
                {[...data.days].reverse().slice(0, 10).map((day) => (
                  <div className="hra-day hra-day--rec" key={day.id}>
                    <div className="hra-day__main">
                      <div className="hra-day__d">
                        <span>{fmtDayLine(day.work_date)}</span>
                        <span className={statusClass(day.status)}>{statusLabel(day.status)}</span>
                      </div>
                      <p className="hra-day__sub">
                        <span dir="ltr">{fmtTime(day.first_in_at)}</span>
                        {' ← '}
                        <span dir="ltr">{fmtTime(day.last_out_at)}</span>
                      </p>
                    </div>
                    <div className="hra-day__end">
                      <button
                        type="button"
                        className="hr-btn hr-btn--sm"
                        onClick={() => setClaimFor(day.work_date)}
                      >
                        هذا غير صحيح
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
};

export default MyAttendanceCard;
