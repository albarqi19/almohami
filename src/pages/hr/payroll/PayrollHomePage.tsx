import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CalendarClock, Lock, PlayCircle, RefreshCw, Wallet } from 'lucide-react';

import { hrPayrollService } from '../../../services/hrPayrollService';
import ReadinessBoard from './ReadinessBoard';
import RunList from './RunList';
import {
  counted,
  DRAFT_PROFILE_FORMS,
  errorText,
  fmtDateHuman,
  HEADCOUNT_FORMS,
  outOf,
  payCountdown,
  SEVERITY_LABELS,
  WINDOW_TONE_CLASS,
  windowCountdown,
} from './payrollFormat';

/**
 * **الرواتب — الصفحةُ الجامعة** · `/hr/payroll`.
 *
 * ══════ السؤالُ الذي تجيبه ══════
 * «ما حالُ الرواتب اليوم، وبم أبدأ؟». رقمٌ حاكمٌ واحدٌ في الرأس («الصرفُ بعد ٤ أيام · ٣
 * قراراتٍ تنتظر»)، ثمّ لوحُ جاهزيةٍ **بالأسماء**، ثمّ قائمةُ المسيرات.
 *
 * ══════ 🔴 المكتبُ الفارغ: دعوةُ تهيئةٍ لا جدولُ أصفار ══════
 * `employee_compensations` صفرُ صفٍّ في الإنتاج كلِّه — فالحالةُ الافتراضيةُ لكلّ مكتبٍ اليوم
 * هي «لم يُسجَّل راتبٌ بعد». وهذه الشاشةُ حينها **لا تعرض جدولاً بصفوفٍ صفرية** ولا رقماً
 * ديمو واحداً: تعرض ما ينقص بالاسم والعدد، وزرَّ «سجّل أوّل راتب».
 *
 * ══════ ولماذا زرُّ الفتح يظهر معطَّلاً لا مخفيّاً ══════
 * «عرضُ السبب قبل المحاولة أصدقُ من زرٍّ يُنقَر ثمّ يُردّ». والإخفاءُ يصنع سؤالاً («أين
 * الزرّ؟») يُغلَق بمكالمةِ دعم؛ والتعطيلُ مع السبب تحته يقتل السؤال في مكانه.
 *
 * ══════ الحالاتُ الأربع ══════
 * تحميلٌ (هيكل) · فارغٌ (دعوةُ تهيئة) · مقفلٌ (الوحدةُ مطفأة **أو** لا صلاحية — بنصَّين لا
 * واحد) · خطأٌ (بنصّه وزرِّ إعادة). ولا استطلاعَ دوريّ: الرواتبُ حالةٌ يغيّرها إنسان.
 */

export const PayrollHomePage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openError, setOpenError] = useState<string | null>(null);

  const periodParam = params.get('period');
  const period = periodParam !== null && /^\d{4}-\d{2}$/.test(periodParam) ? periodParam : undefined;

  const overviewQuery = useQuery({
    queryKey: ['hr', 'payroll', 'overview', period ?? 'current'],
    queryFn: () => hrPayrollService.getOverview(period),
    staleTime: 30_000,
  });

  const runsQuery = useQuery({
    queryKey: ['hr', 'payroll', 'runs'],
    queryFn: () => hrPayrollService.getRuns({ per_page: 12 }),
    staleTime: 30_000,
  });

  const openMutation = useMutation({
    mutationFn: (value: string) => hrPayrollService.openRun(value),
    onSuccess: (run) => {
      setOpenError(null);
      void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'overview'] });
      void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'runs'] });
      navigate(`/hr/payroll/runs/${run.id}?stage=roster`);
    },
    // 🔴 رسالةُ الخادم تُعرَض كما هي: هي التي تسمّي الناقصَ بالرقم، ونصٌّ عامٌّ مكانَها
    // يجعل المستخدمَ يبحث عن العطل في الزرّ.
    onError: (error) => setOpenError(errorText(error, 'تعذر فتح المسير.')),
  });

  const setPeriod = (value: string) => {
    const next = new URLSearchParams(params);
    if (value === '') next.delete('period');
    else next.set('period', value);
    setParams(next, { replace: true });
  };

  // ─────────── مقفلة: الوحدةُ مطفأةٌ أو الصلاحيةُ ناقصة — بنصَّين لا واحد ───────────
  const queryError = overviewQuery.error;
  const lockedMessage =
    queryError instanceof Error && /غير مفعّل|غير مصرح|صلاحية|Unauthorized|Forbidden/i.test(queryError.message)
      ? queryError.message
      : null;

  if (lockedMessage !== null) {
    return (
      <div className="hrl-page">
        <div className="hrl-state hrl-state--locked">
          <Lock size={22} />
          <p className="hrl-state__t">وحدة الرواتب غير متاحة لك</p>
          <p className="hrl-state__d">{lockedMessage}</p>
        </div>
      </div>
    );
  }

  if (overviewQuery.isLoading) {
    return (
      <div className="hrl-page">
        <div className="hrl-state hrl-state--loading">
          <span className="hrl-skel hrl-skel--line" />
          <span className="hrl-skel hrl-skel--line" />
          <span className="hrl-skel hrl-skel--line" />
        </div>
      </div>
    );
  }

  if (overviewQuery.isError) {
    return (
      <div className="hrl-page">
        <div className="hrl-state hrl-state--error">
          <AlertTriangle size={22} />
          <p className="hrl-state__t">تعذر تحميل حالة الرواتب</p>
          <p className="hrl-state__d">{errorText(overviewQuery.error, 'خطأ غير متوقع.')}</p>
          <button type="button" className="hr-btn hr-btn--sm" onClick={() => void overviewQuery.refetch()}>
            <RefreshCw size={13} /> أعد المحاولة
          </button>
        </div>
      </div>
    );
  }

  const data = overviewQuery.data?.data;
  const meta = overviewQuery.data?.meta;

  if (data === undefined || meta === undefined) {
    return (
      <div className="hrl-page">
        <div className="hrl-state hrl-state--empty">
          <Wallet size={22} />
          <p className="hrl-state__t">وحدة الرواتب غير جاهزة لهذا المكتب بعد</p>
          <p className="hrl-state__d">يتم إعدادها مع تفعيل الوحدة. أعد تحميل الصفحة.</p>
        </div>
      </div>
    );
  }

  const readiness = data.readiness;
  const runs = runsQuery.data?.data ?? [];
  const decisions = data.pending_decisions;
  const decisionTotal = decisions.block + decisions.warn + decisions.info;

  /**
   * 🔴 «لم يُسجَّل راتبٌ بعد» — الحالةُ الافتراضيةُ لكلّ مكتبٍ اليوم، ولها شاشتُها الخاصّة:
   * دعوةُ تهيئةٍ تسمّي الناقص، لا جدولُ أصفارٍ ولا صفرٌ كبيرٌ في المنتصف.
   *
   * ══════ 🩸 والشرطُ كان `included_count === 0` — فكذبت الشاشةُ على المستخدم ══════
   * «كم يدخل المسير» و«كم له أجرٌ مسجَّل» سؤالان مختلفان: مكتبٌ بسبعة أجورٍ مسجَّلةٍ
   * وملفّاتُ أجرِها معلَّقةٌ (أو بلا نظام تأمينات، أو مطالَبٌ بها في مسيرٍ آخر) له
   * `included_count = 0` وأجورُه سبعة. فكانت هذه اللوحةُ تعلن «٠ منهم له أجرٌ مسجَّل»
   * ولوحُ الجاهزية بجانبها في السطر نفسِه يسمّي المانعَ الحقيقيّ — رسالتان متناقضتان،
   * والكاذبةُ هي الكبيرةُ في المنتصف.
   *
   * والحكمُ الآن على `wage_recorded_count` المقيسِ على الخادم: فمتى وُجد أجرٌ واحدٌ مسجَّلٌ
   * لم تظهر هذه الدعوةُ أصلاً، ويبقى **الحاجزُ بنصِّه** في لوح الجاهزية وتحت زرِّ الفتح
   * هو الجوابَ الوحيد. ورقمُ الجملة أدناه مقروءٌ من المصدر نفسِه، فلا ينفصل عنه أبداً.
   */
  const isVirgin =
    readiness.wage_recorded_count === 0 && runs.length === 0 && data.open_run === null;

  return (
    <div className="hrl-page">
      <header className="hrl-head">
        <div className="hrl-head__id">
          <h1 className="hrl-h1">
            <Wallet size={16} /> الرواتب
          </h1>
          <p className="hrl-sub">
            من يدخل مسير {fmtDateHuman(data.period_start)}، ومن لا يدخل، ولماذا، قبل احتساب
            أي مبلغ.
          </p>
        </div>

        <div className="hrl-head__badges">
          {/* 🩸 `dir="ltr"` على الأرقام الصِرفة **وحدَها**: العطلُ المسجَّل أنّ نطاقاً
              جامعاً يخلط اسمَ شهرٍ عربيّاً برقمٍ يقلب ترتيبَهما بصرياً — «١ سبتمبر ٢٠٢٦»
              تُقرأ «٢٠٢٦ سبتمبر ١»، و«٤٨ من ٥٠» تُقرأ «٥٠ من ٤٨». والرقمُ الخاطئ الذي
              يبدو صحيحاً أسوأُ من الغياب. */}
          <span className="hrl-fact hrl-fact--gold">
            {payCountdown(data.days_to_pay)}
            <span className="hrl-fact__n">{fmtDateHuman(data.pay_date)}</span>
          </span>
          {/* ⏳ **مهلةُ الثلاثين يوماً** — بجوار «يومِ الصرف» لا بدلاً منه: ذاك موعدُ المكتب،
              وهذه مهلةٌ نظاميةٌ تُقاس من الاستحقاق (أوّلِ يومٍ بعد نهاية الفترة). ومكتبٌ يصرف
              في موعده وقد تنقضي عليه المهلةُ لأنّ تحويلَه تأخّر أو ملفَّ بنكه لم يُطلَب.
              🔴 ولا نسبةَ التزامٍ في هذا الرأس: مقامُها عددُ المسجَّلين في التأمينات ولا نملكه. */}
          {data.statutory_window.deadline_on !== null && (
            <span className={WINDOW_TONE_CLASS[data.statutory_window.tone]}>
              {windowCountdown(data.statutory_window)}
              <span className="hrl-fact__n">{fmtDateHuman(data.statutory_window.deadline_on)}</span>
            </span>
          )}
          <span className="hrl-fact">
            قرارات تنتظر
            <span className="hrl-fact__n" dir="ltr">
              {decisionTotal}
            </span>
          </span>
          <span className="hrl-fact">
            يدخل المسير
            <span className="hrl-fact__n">
              {outOf(readiness.included_count, readiness.headcount_total)}
            </span>
          </span>
        </div>
      </header>

      {isVirgin && (
        <div className="hrl-state hrl-state--empty">
          <Wallet size={22} />
          <p className="hrl-state__t">لم يتم تسجيل أي راتب بعد</p>
          {/* 🔤 منظومةُ رقمٍ واحدةٌ في الجملة الواحدة: «8 منسوباً · ٠ منهم» تخلط اللاتينيةَ
              الآتيةَ من البيانات بالهنديّة المكتوبة يدوياً — وتمييزُ العدد من `counted`.
              🔴 والعددان كلاهما من الخادم: أوّلُ رقمٍ يُكتب هنا بيدِ مبرمجٍ يصير رقماً لا
              يتغيّر حين تتغيّر القاعدة — وهو بالضبط الصفرُ الذي كان يكذب. */}
          <p className="hrl-state__d">
            {counted(readiness.headcount_total, HEADCOUNT_FORMS)} في المكتب ·{' '}
            {readiness.wage_recorded_count} منهم له أجر مسجل. ولا يفتح المسير قبل تسجيل
            الرواتب.
          </p>

          {/* 🔴 الملفّاتُ المبدئيةُ تُقال ولا تُطوى: هي التي كانت تُضخّم «في المكتب» بحساباتٍ
              أُنشئت مع مستخدميها ولم يقل أحدٌ إنّها وظائف. */}
          {readiness.draft_count > 0 && (
            <p className="hrl-state__d">
              وخارج العد {counted(readiness.draft_count, DRAFT_PROFILE_FORMS)}: حساب تم إنشاء
              ملفه مع المستخدم ولم يتم تسجيل تاريخ التحاقه. يدخل الرواتب متى اكتمل ملفه.
            </p>
          )}

          <Link className="hr-btn hr-btn--sm" to="/hr/payroll/wages">
            <PlayCircle size={13} /> سجل أول راتب
          </Link>
        </div>
      )}

      {openError !== null && (
        <div className="hrl-flag hrl-flag--block" role="status">
          <p className="hrl-flag__t">
            <AlertTriangle size={13} /> {openError}
          </p>
          <p className="hrl-flag__hint">
            لوحة الجاهزية بجانبك تعرض كل نقص مع رابط لإصلاحه.
          </p>
        </div>
      )}

      <div className="hrl-cols">
        <div className="hrl-cols__main">
          <div className="hrl-wall">
            <section className="hrl-block" aria-labelledby="open-h">
              <header className="hrl-block__h">
                <h2 className="hrl-block__t" id="open-h">
                  <CalendarClock size={14} /> فترة {data.period}
                </h2>
                <span className="hrl-badge hrl-badge--flat">
                  {fmtDateHuman(data.period_start)} — {fmtDateHuman(data.period_end)}
                </span>
              </header>

              <div className="hrl-block__b">
                {data.open_run !== null ? (
                  <p className="hrl-hint">
                    لهذه الفترة مسير مفتوح، والمشمولون فيه {outOf(data.open_run.headcount_included, data.open_run.headcount_total)}.{' '}
                    <Link className="hrl-link" to={`/hr/payroll/runs/${data.open_run.id}?stage=roster`}>افتحه</Link>.
                  </p>
                ) : (
                  <>
                    {/* 🔴 الزرُّ **ظاهرٌ معطَّلٌ وتحته سببُه** — لا مخفيّ (D23). */}
                    <button
                      type="button"
                      className="hr-btn hr-btn--sm"
                      disabled={
                        readiness.can_open_run === false ||
                        meta.can_prepare === false ||
                        openMutation.isPending
                      }
                      onClick={() => openMutation.mutate(data.period)}
                    >
                      <PlayCircle size={13} /> افتح مسير {data.period}
                    </button>

                    {readiness.can_open_run === false && (
                      <p className="hrl-hint">{readiness.blocked_reason}</p>
                    )}

                    {readiness.can_open_run && meta.can_prepare === false && (
                      <p className="hrl-hint">فتح المسير يحتاج صلاحية إعداد الرواتب.</p>
                    )}
                  </>
                )}

                {decisionTotal > 0 && (
                  <div className="hrl-chips">
                    {(['block', 'warn', 'info'] as const).map((severity) =>
                      decisions[severity] > 0 ? (
                        <span
                          className={severity === 'block' ? 'hrl-chip hrl-chip--danger' : severity === 'warn' ? 'hrl-chip hrl-chip--warn' : 'hrl-chip'}
                          key={severity}
                        >
                          {SEVERITY_LABELS[severity]}
                          <span className="hrl-chip__n" dir="ltr">
                            {decisions[severity]}
                          </span>
                        </span>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            </section>

            <section className="hrl-block" aria-labelledby="runs-h">
              <header className="hrl-block__h">
                <h2 className="hrl-block__t" id="runs-h">
                  المسيرات
                </h2>
                <span className="hrl-badge hrl-badge--flat">{runs.length}</span>
              </header>

              <div className="hrl-block__b hrl-block__b--flush">
                {runsQuery.isLoading ? (
                  <div className="hrl-state hrl-state--loading">
                    <span className="hrl-skel hrl-skel--line" />
                    <span className="hrl-skel hrl-skel--line" />
                  </div>
                ) : (
                  <RunList
                    runs={runs}
                    emptyText="لا يوجد مسير بعد. ولا يفتح المسير قبل تسجيل الرواتب."
                  />
                )}
              </div>
            </section>
          </div>
        </div>

        <aside className="hrl-cols__side">
          <ReadinessBoard
            readiness={readiness}
            title="من يدخل المسير"
            headingId="readiness-h"
          />

          <section className="hrl-block" aria-labelledby="period-h">
            <header className="hrl-block__h">
              <h2 className="hrl-block__t" id="period-h">
                فترة أخرى
              </h2>
            </header>

            <div className="hrl-block__b">
              <label className="hrl-fset" htmlFor="payroll-period">
                <span className="hrl-fset__t">شهر الاستحقاق</span>
                <input
                  id="payroll-period"
                  className="hrl-search"
                  type="month"
                  value={data.period}
                  onChange={(event) => setPeriod(event.target.value)}
                />
              </label>

              <p className="hrl-hint">
                يوم الصرف عند المكتب {data.settings.pay_day_of_month} من الشهر التالي. ونظام
                العمل يحدد الدورة (مرة في الشهر للرواتب الشهرية) لا اليوم.
              </p>

              {/* 🔴 وصلةٌ إلى الدورة الحقيقية: المكتبُ يُصدّر ← يرفع لبنكه فيحوّل ← يطلب من
                  البنك ملفَّ الأجور الموقَّع ← يرفعه بنفسه خلال ثلاثين يوماً. وموضعُها تحت
                  عدّاد المهلة مباشرةً: من يقرأ «بقي ٩ أيام» يسأل «تسعةُ أيامٍ لأيّ شيء؟». */}
              <p className="hrl-hint">
                والمهلة أعلاه لرفع <strong>ملف الأجور الذي يصدره بنكك</strong> بعد التحويل.
                يرفعه المكتب بنفسه.{' '}
                <Link className="hrl-link" to="/hr/payroll/bank-cycle">
                  الدورة في أربع خطوات
                </Link>
              </p>

              {periodParam !== null && (
                <button type="button" className="hrl-link" onClick={() => setPeriod('')}>
                  ارجع إلى الشهر الجاري
                </button>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default PayrollHomePage;
