import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, UserCog, UserX } from 'lucide-react';

import { meterVars } from '../leave/leaveFormat';
import {
  counted,
  DRAFT_PROFILE_FORMS,
  EXCLUSION_ACTIONS,
  EXCLUSION_LABELS,
  fixHref,
  NBSP,
  outOf,
} from './payrollFormat';
import type { ExclusionReason, PayrollReadiness } from '../../../types/hrPayroll';

/**
 * 🔴 **لوحُ الجاهزية** — «من يدخل المسير، ومن لا يدخل، ولماذا» — قبل أن يُحسب ريال.
 *
 * ══════ ما يرفضه هذا اللوحُ صراحةً ══════
 * ① **نسبةً مجرَّدة**: «الجاهزيةُ ٨٩٪» رقمٌ لا يُعمَل به. الرقمُ الحاكمُ هنا «٨ من ١١»،
 *    وتحته **الأسماء**.
 * ② **«غير جاهز» بلا تفسير**: كلُّ نقصٍ له سببٌ مسمّىً وطريقُ علاجٍ منقور.
 * ③ **عدداً بلا قائمته**: «٣ مستبعَدون» وحدَها تجعل المديرَ يفتح ملفّاً ملفّاً ليعرف من هم.
 *    فالقائمةُ ظاهرةٌ لا مطويّة، وكلُّ سطرٍ يحمل اسماً وسبباً و«ما العمل».
 *
 * ══════ ولماذا الأسبابُ مجموعةٌ لا مسرودةٌ سطراً سطراً ══════
 * مكتبٌ بخمسين منسوباً بلا أجرٍ يُنتج خمسين سطراً متطابقةً تدفن الحالةَ الشاذّة. فالتجميعُ
 * بالسبب أوّلاً (رقاقةٌ لكلّ سببٍ بعددها ووصلتها)، والأسماءُ تحتها مطويّةً في السبب نفسه.
 *
 * ══════ والحقيقةُ لا تُحمَل على اللون ══════
 * كلُّ حالةٍ نصٌّ + أيقونة. من يقرأ بالأبيض والأسود يقرأ الشيءَ نفسَه.
 *
 * ══════ 🔴 ثالثٌ بين المشمول والمستبعَد: **الملفُّ المبدئيّ** ══════
 * الخادمُ يُنشئ صفَّ مواردَ بشريةٍ لكلّ مستخدمٍ داخليٍّ يُضاف (الإجازاتُ والحضورُ يعتمدان
 * عليه)، فكان كلُّ حسابٍ جديدٍ يهبط في هذا اللوح **مستبعَداً بـ«لم يُفتح له ملفُّ أجر»** —
 * نقصٌ ليس نقصَه، ومقامٌ يكبر بلا سبب. وهو الآن خارج «في المكتب» وخارج المستبعَدين،
 * **وليس مخفياً**: قائمةٌ بأسمائها تحت عنوانها، ولكلِّ اسمٍ وصلةٌ إلى ملفّه. إخفاؤه كان
 * سيصنع العطلَ المعاكس — منسوبٌ حقيقيٌّ يختفي بلا أثر.
 */

interface Props {
  readiness: PayrollReadiness;
  /** يُمرَّر متى كان اللوحُ داخل مسيرٍ مفتوحٍ فتُبنى وصلاتُ مراحله. */
  runId?: number;
  /**
   * 🔴 نطاقُ المسير **المجمَّد** — يُمرَّر داخل مسيرٍ مفتوحٍ ليُقابَل بالجاهزية الحيّة.
   *
   * رقمان متقاربان في شاشةٍ واحدة («٧ من ٨» في الرأس و«٧ من ٩» هنا) بلا حرفٍ يفرّقهما
   * يجعلان أحدَهما يبدو خطأً في الآخر — والفرقُ مشروعٌ ويقع في الإنتاج مع كلّ تعيينٍ بعد
   * بناء النطاق. فيُقال ما هو كلٌّ منهما، ويُقال متى اختلفا ولماذا.
   */
  frozen?: { included: number; total: number };
  /** رأسُ اللوح — يختلف بين الصفحة الجامعة ومرحلة النطاق. */
  title: string;
  headingId: string;
}

export const ReadinessBoard: React.FC<Props> = ({ readiness, runId, frozen, title, headingId }) => {
  const total = readiness.headcount_total;
  const included = readiness.included_count;
  const excluded = readiness.excluded;
  const drifted =
    frozen !== undefined && (frozen.included !== included || frozen.total !== total);

  const reasons = Object.entries(readiness.reason_counts) as Array<[ExclusionReason, number]>;

  return (
    <section className="hrl-block hrp-ready" aria-labelledby={headingId}>
      <header className="hrl-block__h">
        <h2 className="hrl-block__t" id={headingId}>
          <CheckCircle2 size={14} /> {title}
        </h2>
        {/* 🔴 «٨ من ١١» لا «٨ منسوباً»: العددان معاً في كلّ موضع. */}
        <span className="hrl-badge hrl-badge--flat">{outOf(included, total)}</span>
      </header>

      <div className="hrl-block__b">
        <div
          className="hrl-meter"
          role="img"
          aria-label={`يدخل المسير ${outOf(included, total)} موظفاً`}
        >
          <span className="hrl-meter__seg" style={meterVars(1, total === 0 ? 0 : included / total)}>
            <span className="hrl-meter__fill" />
          </span>
        </div>

        <div className="hrl-meter__legend">
          <span>يدخل: {included}</span>
          <span>مستبعَد: {readiness.excluded_count}</span>
          <span>في المكتب: {total}</span>
        </div>

        {/* 🔴 «له أجرٌ مسجَّل» ≠ «يدخل المسير» — ويُقالان معاً **حين يفترقان وحدَه**.
            مكتبٌ سجّل سبعةَ رواتبَ ثمّ عُلّقت ملفّاتُها له «يدخل: 0» و«له أجر: 7»؛ وكتمانُ
            الثاني يجعل الصفرَ يُقرأ «لا رواتبَ عندنا» فيُعاد إدخالُ ما هو مُدخَل. وحين
            يتساويان لا يُكتب شيء: رقمٌ يكرّر رقماً فوقه ضجيجٌ يُقرأ مرّتين. */}
        {readiness.wage_recorded_count > included && (
          <p className="hrl-hint">
            و{outOf(readiness.wage_recorded_count, total)} له أجر مسجل في السجل. والفرق عن
            «يدخل» ليس نقص راتب بل ما تسميه الأسباب أدناه.
          </p>
        )}

        {frozen !== undefined && (
          <p className="hrl-hint">
            {drifted ? (
              <>
                هذا قياس لموظفي المكتب <strong>اليوم</strong>، والمشمولون وقت البناء{' '}
                {outOf(frozen.included, frozen.total)}. والفرق يعني تغييراً وقع بعد البناء، فأعد
                بناء قائمة المشمولين من مرحلة المشمولين ليدخل من استجد.
              </>
            ) : (
              <>
                هذا قياس لموظفي المكتب <strong>اليوم</strong>، وهو مطابق للمشمولين وقت
                البناء {outOf(frozen.included, frozen.total)}. ولم يستجد شيء بعده.
              </>
            )}
          </p>
        )}

        {reasons.length > 0 && (
          <div className="hrl-chips">
            {reasons.map(([code, count]) => {
              const href = fixHref(
                excluded.find((row) => row.reason_code === code)?.fix_target,
                runId
              );

              // رقاقةٌ منقورةٌ متى كان للسبب علاج، ونصٌّ ساكنٌ متى كان واقعةً لا نقصاً
              // (انفكاكٌ/التحاق): زرٌّ يعِد بعلاجٍ لا يوجد كذبةُ واجهة.
              return href === null ? (
                <span className="hrl-chip" key={code}>
                  {EXCLUSION_LABELS[code]}
                  <span className="hrl-chip__n" dir="ltr">
                    {count}
                  </span>
                </span>
              ) : (
                <Link className="hrl-chip hrl-chip--warn" to={href} key={code}>
                  {EXCLUSION_LABELS[code]}
                  <span className="hrl-chip__n" dir="ltr">
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        {excluded.length > 0 && (
          <ul className="hrp-excluded">
            {excluded.map((row) => {
              const href = fixHref(row.fix_target, runId);

              return (
                <li className="hrp-excluded__i" key={row.profile_id}>
                  <span className="hrp-excluded__n">
                    <UserX size={12} /> {row.name ?? `#${row.profile_id}`}
                  </span>
                  <span className="hrp-excluded__r">
                    {EXCLUSION_LABELS[row.reason_code]}
                    {row.reason_detail !== null && row.reason_detail !== '' && (
                      <span className="hrp-excluded__d"> — {row.reason_detail}</span>
                    )}
                  </span>
                  <span className="hrp-excluded__a">
                    {href === null ? (
                      EXCLUSION_ACTIONS[row.reason_code]
                    ) : (
                      /* 🩸 مسافةٌ **غيرُ فاصلة** قبل السهم: المسافةُ العاديةُ فرصةُ كسرٍ
                         للسطر، فينزل «←» وحدَه سطراً تحت جملته فيبدو رمزاً يتيماً بلا
                         معنى. والملتصقةُ تمنع الكسرَ قبلها وبعدها معاً (UAX#14 · GL). */
                      <Link className="hrl-link" to={href}>
                        {EXCLUSION_ACTIONS[row.reason_code]}
                        {NBSP}
                        <ArrowLeft size={11} />
                      </Link>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {readiness.drafts.length > 0 && (
          <div className="hrp-drafts">
            {/* عنوانٌ دلاليٌّ لا فقرةٌ مكبَّرة: هذا دلوٌ ثالثٌ في اللوح، ومن يتنقّل
                بالعناوين يجب أن يجده. */}
            <h3 className="hrp-drafts__t">
              <UserCog size={12} /> {counted(readiness.drafts.length, DRAFT_PROFILE_FORMS)} خارج
              العد
            </h3>
            <ul className="hrp-drafts__l">
              {readiness.drafts.map((row) => (
                <li className="hrp-drafts__i" key={row.profile_id}>
                  <span className="hrp-drafts__n">{row.name ?? `#${row.profile_id}`}</span>
                  <Link
                    className="hrl-link"
                    to={fixHref(row.fix_target, runId, row.profile_id) ?? '/hr'}
                  >
                    اكتب تاريخ الالتحاق
                    {NBSP}
                    <ArrowLeft size={11} />
                  </Link>
                </li>
              ))}
            </ul>
            <p className="hrl-hint">
              ملف تم إنشاؤه مع حساب صاحبه، وبلا تاريخ التحاق وبلا ملف أجر. فلا يحسب عليه
              نقص ولا يدخل في إجمالي «يدخل المسير».
            </p>
          </div>
        )}

        {/* 🔴 الحاجزُ يُعرَض قبل المحاولة لا بعد ردٍّ ٤٢٢ — عرفٌ مكتوب. */}
        {readiness.can_open_run === false && readiness.blocked_reason !== null && (
          <p className="hrl-flag hrl-flag--block" role="status">
            <span className="hrl-flag__t">
              <AlertTriangle size={13} /> {readiness.blocked_reason}
            </span>
          </p>
        )}

        {readiness.gosi_confirmed === false && (
          <p className="hrl-hint">
            نسب التأمينات غير مؤكدة بعد: الفتح والاحتساب يمران، و<strong>الاعتماد</strong> محجوب
            حتى يؤكدها موظف باسمه من <Link className="hrl-link" to="/hr/payroll/rules">المرجع النظامي</Link>.
          </p>
        )}
      </div>
    </section>
  );
};

export default ReadinessBoard;
