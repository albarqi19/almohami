import React from 'react';
import { Fingerprint } from 'lucide-react';

import { ATTENDANCE_SOURCE_LABELS, PUNCH_DIRECTION_LABELS } from '../../../types/hr';
import type { AttendanceUncomputedPunch } from '../../../types/hr';
import { ENGINE_RUN_CLOCK, fmtCount, fmtTime, stampParts } from './attendanceFormat';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔑 **بصماتُ اليوم التي لم يُحتسب يومُها بعد** — قسمٌ مفصولٌ فوق الصفوف المحسوبة.
 *
 * ══════ العطلُ الذي يسدّه ══════
 * المالكُ يبصم فيقرأ «تم التسجيل»، ثم يفتح `/hr/attendance` فلا يجد شيئاً: الشاشةُ كانت تعرض
 * `hr_attendance_days` وحدَه — **أحكاماً مشتقّة** يشتقّها المحرّكُ ليلاً (٠٤:٥٠ الرياض) من طابور
 * الأيام المتّسخة. فكان الموظفُ يرى بصمتَه في `/my-hr` فوراً **ومديرُه لا يراها** — انعكاسٌ
 * يجعل الأداةَ تبدو معطّلةً وهي سليمة.
 *
 * ══════ 🔴 الانضباطُ الذي يحكم هذا الملفّ ══════
 * الوحدةُ كلُّها قائمةٌ على تمييزٍ واحد: **البصمةُ واقعةٌ خامٌّ لا تُمَسّ · واليومُ حكمٌ مشتقٌّ
 * يُعاد اشتقاقه**. وعرضُ الخامِّ بهيئة المحسوب ينقض هذا الانضباطَ **من الشاشة** بعد أن حُفظ في
 * القاعدة. ولذلك في هذا الملفّ:
 *
 * · **صفرُ رقمٍ محسوب**: لا دقائقَ تأخيرٍ ولا ساعاتِ عملٍ ولا حالةَ يومٍ ولا كلمةَ «حاضر».
 *   الواقعةُ وحدَها: **مَن · متى · دخولٌ أم خروج · ومصدرُ البصمة**.
 * · **ولا حسابَ في الواجهة ولو سهُل** — فارقُ الدخول والخروج مثلاً: ذلك حكمٌ يملكه المحرّكُ
 *   وحدَه، وله قواعدُ عطلةٍ وإجازةٍ وجدولِ دوامٍ لا تراها هذه الشاشة. ورقمٌ تخترعه الواجهةُ
 *   الليلةَ يخالف رقمَ الصباح، فيصير المصدرُ الواحدُ مصدرين.
 * · **تمييزٌ بصريٌّ ودلاليٌّ صريح**: قسمٌ مستقلٌّ بعنوانه وسطحه وحدوده المتقطّعة (المتقطّعُ =
 *   لم يُبَتّ)، ووسمٌ على كلّ صفّ. ولا يختلط بصفوف الأحكام في جدولٍ واحدٍ بلا فاصل.
 * · **ويُقال متى تُحتسب** بنصٍّ صريحٍ ولحظةٍ يرسلها الخادمُ (`engine_runs_at`) لا حسابٍ محلّيّ —
 *   فالانتظارُ المفهومُ ليس عطلاً، والانتظارُ المجهولُ هو العطل.
 *
 * ══════ الحالاتُ الأربع — ثلاثٌ منها **لا تُرسَم** عن قصد ══════
 * تحميلٌ · خطأٌ · فراغٌ ⇒ `null`. هذا قسمٌ **ملحقٌ** بحمولةِ شاشةٍ يرسم أبوها هيكلَ التحميل
 * وصندوقَ الخطأ سلفاً؛ فهيكلٌ ثانٍ وصندوقُ خطأٍ ثانٍ ضجيجٌ يقول الشيءَ مرّتين. وصندوقٌ فارغٌ
 * يقول «لا بصماتٍ غيرَ محتسَبة» هو الحالةُ **الطبيعية** بعد كلّ تشغيلةٍ ليلية — فعرضُه يجعل
 * السلامةَ تبدو نقصاً. والحالةُ الرابعة (محتوى) هي وحدَها ما يُرسَم.
 *
 * 🚫 وصفرُ استطلاعٍ دوريّ: لا مؤقّتَ هنا ولا في أبيه — التحديثُ بزرٍّ أو بعد فعل.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * كلُّ نصٍّ عربيٍّ في هذا الملفّ — **خارطةٌ واحدةٌ لا نصٌّ منثورٌ في JSX**، فتصحيحُ صياغةٍ
 * موضعٌ واحدٌ ولا يلمس بنيةً.
 */
const RAW_TEXT = {
  title: 'بصماتٌ لم تُحتسب بعد',
  countLabel: 'عددُ البصمات غير المحتسَبة',
  lead: 'وقائعُ مسجَّلةٌ كما وقعت — ولم يصدر عليها حكمُ يومٍ بعد.',
  engineBefore: 'تُحتسب في التشغيلة الليلية',
  engineTz: 'بتوقيت الرياض',
  engineNext: 'التشغيلةُ القادمة',
  tag: 'لم تُحتسب بعد',
  anon: 'منسوب',
  truncated: 'القائمةُ أطولُ مما تعرضه الشاشة — وتكتمل بعد التشغيلة.',
} as const;

interface Props {
  /** البصماتُ كما وصلت في مفتاحها المنفصل — **لا تُشتقّ من `rows` ولا تُخلط بها**. */
  punches: AttendanceUncomputedPunch[];
  /** `Y-m-d H:i` من الخادم — لحظةُ التشغيلة القادمة، ولا تُحسب هنا. */
  engineRunsAt: string | null;
  /** بلغت القائمةُ سقفَ الخادم — يُقال ولا يُبتلع. */
  truncated: boolean;
  /** يرسمه الأبُ سلفاً ⇒ `null` (انظر «الحالاتُ الأربع» في الترويسة). */
  loading: boolean;
  /** يرسمه الأبُ سلفاً ⇒ `null`. */
  isError: boolean;
}

export const AttendanceRawPunches: React.FC<Props> = ({
  punches,
  engineRunsAt,
  truncated,
  loading,
  isError,
}) => {
  // تحميلٌ وخطأ: هيكلُ الأب وصندوقُه يقولان هذا سلفاً — وقولُه مرّتين ضجيج.
  if (loading || isError) return null;

  // فراغ: **الحالةُ الطبيعية** بعد كلّ تشغيلة — وصندوقٌ يعلنها يجعل السلامةَ تبدو نقصاً.
  if (punches.length === 0) return null;

  const nextRun = stampParts(engineRunsAt);

  return (
    <section className="hra-raw" aria-labelledby="hra-raw-h">
      <div className="hra-raw__h">
        <h3 className="hra-raw__t" id="hra-raw-h">
          <Fingerprint size={13} aria-hidden="true" />
          {RAW_TEXT.title}
          <span className="hra-raw__n" dir="ltr" aria-label={RAW_TEXT.countLabel}>
            {fmtCount(punches.length)}
          </span>
        </h3>

        <p className="hra-raw__d">
          {RAW_TEXT.lead}
          {' '}
          {RAW_TEXT.engineBefore}
          {' ('}
          <span dir="ltr">{ENGINE_RUN_CLOCK}</span>
          {` ${RAW_TEXT.engineTz})`}
          {engineRunsAt !== null && (
            <>
              {` · ${RAW_TEXT.engineNext}: ${nextRun.date}`}
              {nextRun.time !== null && (
                <>
                  {' · '}
                  <span dir="ltr">{nextRun.time}</span>
                </>
              )}
            </>
          )}
        </p>

        {truncated && <p className="hra-raw__d">{RAW_TEXT.truncated}</p>}
      </div>

      <ul className="hra-raw__l">
        {punches.map((punch) => (
          <li className="hra-raw__i" key={punch.id}>
            {/* الوقتُ وحدَه في نطاقٍ لاتينيّ — ولا اسمَ شهرٍ عربيٍّ داخله (قاعدةُ الاتجاه). */}
            <span className="hra-raw__c" dir="ltr">{fmtTime(punch.punched_at)}</span>

            <span className="hra-raw__m">
              <span className="hra-raw__nm">{punch.employee?.name ?? RAW_TEXT.anon}</span>
              <span className="hra-raw__s">
                {PUNCH_DIRECTION_LABELS[punch.direction]}
                {' · '}
                {ATTENDANCE_SOURCE_LABELS[punch.source]}
              </span>
            </span>

            <span className="hra-raw__tag">{RAW_TEXT.tag}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default AttendanceRawPunches;
