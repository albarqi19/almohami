import React from 'react';
import { CalendarX2, Info, Settings2, UserX, Users2, Wrench } from 'lucide-react';

import type {
  AttendanceHealthReason,
  AttendanceHealthReasonCode,
  AttendanceSetupHealthReport,
  AttendanceWindowSummary,
} from '../../../types/hr';
import { daysWord, fmtCount, fmtRatio } from './attendanceFormat';

/**
 * الشريطُ الثابت فوق الطابور — **يقرأ مؤشّرَ الـ٥٪ بالكلمات ويحصر السببَ بالاسم**.
 *
 * ══════ الفرقُ الذي يصنعه ══════
 * مؤشّرٌ يراقبه المطوّر مقابل **تدخّلٍ يوجّه المكتب**. ونسبةُ «بلا سجلّ» فوق ٥٪ **مؤشّرُ
 * إعداداتٍ لا مؤشّرُ انضباط**: الخللُ في التهيئة لا في الموظفين، وأيُّ تشديدٍ قبل هبوطها
 * يهدم النظام. و«٧٪ بلا سجلّ» وحدها لا تُصلِح شيئاً، بينما «٣ موظفين بلا جدولِ دوامٍ مُسنَد»
 * تُصلِح — ولذلك صار الحصرُ الحقيقيُّ يحلّ محلّ النسبة المجرّدة.
 *
 * ══════ ولا سببٌ يركّبه العميل ══════
 * الجملُ تصل جاهزةً من `GET /hr/attendance/setup-health` لأن الخادمَ يجمعها من أرقامٍ لا
 * يملكها العميل (عيّناتٌ بالأسماء · عطلٌ بتواريخها · فجوةُ العَلَم عن الحقيقة). تركيبُها هنا
 * يعني إرسالَ ستّةِ أرقامٍ ليُعاد تركيبُ الجملة نفسِها — وتقعان في نصّين يفترقان أوّلَ تعديل.
 * الواجهةُ تختار **الأيقونةَ والترتيبَ** لا الكلمات.
 */

interface Props {
  /** ملخّصُ نافذة الطابور — مصدرُ النسبة والمقام. */
  summary: AttendanceWindowSummary | null;
  /** تشخيصُ التهيئة — مصدرُ حصر الأسباب. `null` قبل وصوله فتُعرض النسبةُ وحدَها. */
  health: AttendanceSetupHealthReport | null;
  /** نافذةُ الصمت بالساعات كما يفرضها الخادم — تُقال كي لا يُظنّ الطابورُ ناقصاً. */
  silenceHours: number | null;
  /** بلغ الطابورُ سقفَ الصفوف — يُقال صراحةً لا يُبتلع. */
  truncated: boolean;
  /** يفتح مودالَ الجدول — الفعلُ الذي يُصلِح أقوى سببين، ولا يُرسَم لمن لا يملك البتّ. */
  onFixSchedule: (() => void) | null;
}

/** العتبةُ الصحّية المكتوبة في الخطة — فوقها فالتهيئةُ ناقصة. */
const HEALTHY_RATIO = 0.05;

/** أيقونةُ كلّ سبب — الواجهةُ تختارها، والنصُّ يبقى نصَّ الخادم. */
const REASON_ICON: Record<AttendanceHealthReasonCode, React.ElementType> = {
  without_schedule: Wrench,
  pending_holidays: CalendarX2,
  session_days: Users2,
  weekend_schism: Settings2,
  ghost_profiles: UserX,
};

/** الأسبابُ التي يُصلِحها مودالُ الجدول — لها زرٌّ، وما سواها يُقرأ ويُصلَح في موضعه. */
const SCHEDULE_FIXABLE: AttendanceHealthReasonCode[] = ['without_schedule', 'weekend_schism'];

export const AttendanceSetupBanner: React.FC<Props> = ({
  summary,
  health,
  silenceHours,
  truncated,
  onFixSchedule,
}) => {
  const ratio = summary?.no_record_ratio ?? null;
  const noRecord = summary?.by_status.no_record ?? 0;
  const notTracked = summary?.by_status.not_tracked ?? 0;
  const unhealthy = ratio !== null && ratio > HEALTHY_RATIO;
  const reasons: AttendanceHealthReason[] = health?.reasons ?? [];

  // نسبةٌ صحّيةٌ وأسبابٌ قائمة: الأسبابُ تُعرض وحدَها — عطلةٌ لم تُعتمد تستحقّ نقرةً ولو كان
  // المؤشّرُ العامُّ سليماً، ولا تنتظر أن يسوء الرقمُ حتى تُقال.
  if (summary === null && reasons.length === 0) return null;

  if (unhealthy || reasons.length > 0) {
    return (
      <div className={`hra-banner${unhealthy ? ' hra-banner--warn' : ''}`} role="status">
        <Settings2 size={14} aria-hidden="true" />
        <div className="hra-banner__body">
          {unhealthy && summary !== null ? (
            <>
              <p className="hra-banner__t">
                <span dir="ltr">{fmtRatio(ratio)}</span> من أيام العمل المحتسَبة بلا سجلّ —
                الخللُ غالباً في الإعدادات لا في الموظفين.
              </p>
              <p className="hra-banner__d">
                {daysWord(noRecord)} بلا سجلّ من {fmtCount(summary.expected_work_days)} يومَ عملٍ
                محتسَب
                {notTracked > 0 ? ` · و${daysWord(notTracked)} على ملفّاتٍ خارجَ التتبّع` : ''}.
                {reasons.length === 0
                  ? ' راجِع جدولَ الدوام وإسنادَه، والتقويمَ الرسميّ، وقائمةَ مَن يبصم — قبل أيّ تشديد.'
                  : ''}
              </p>
            </>
          ) : (
            <p className="hra-banner__t">أمورٌ في التهيئة تستحقّ نظرةً — ولا شيءَ منها يمنع العمل.</p>
          )}

          {reasons.length > 0 && (
            <ul className="hra-reasons">
              {reasons.map((reason) => {
                const Icon = REASON_ICON[reason.code] ?? Info;
                const names = (reason.data.sample ?? [])
                  .map((one) => one.name ?? one.date ?? null)
                  .filter((one): one is string => one !== null && one !== '');

                return (
                  <li className="hra-reason" key={reason.code}>
                    <Icon size={13} aria-hidden="true" />
                    <span className="hra-reason__b">
                      <span className="hra-reason__t">{reason.message}</span>
                      {names.length > 0 && (
                        <span className="hra-reason__s">{names.join(' · ')}</span>
                      )}
                    </span>
                    {onFixSchedule !== null && SCHEDULE_FIXABLE.includes(reason.code) && (
                      <button type="button" className="ssp2-btn" onClick={onFixSchedule}>
                        افتح الجدول
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  }

  if (truncated || silenceHours !== null) {
    return (
      <div className="hra-banner" role="status">
        <Info size={14} aria-hidden="true" />
        <div className="hra-banner__body">
          <p className="hra-banner__t">
            {truncated
              ? 'الطابورُ أطولُ مما تعرضه الشاشة — ضيّق المدى لتراه كاملاً.'
              : 'أيامُ آخر ' + (silenceHours ?? 0) + ' ساعةً لا تظهر هنا بعد.'}
          </p>
          <p className="hra-banner__d">
            نافذةُ صمتٍ مقصودة: التقريرُ الطبيُّ يصل بعد يومين، والإجازةُ تُسجَّل بأثرٍ رجعيّ —
            فلا يظهر اليومُ حتى يكتمل بيانُه.
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default AttendanceSetupBanner;
