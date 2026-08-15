import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CalendarDays, Lock, RefreshCw, Scale, Wallet } from 'lucide-react';

import { hrLeaveService } from '../../../services/hrLeaveService';
import EmptyLine from '../dossier/EmptyLine';
import MyLeaveRequestsCard from './MyLeaveRequestsCard';
import {
  EMPTY_MARK,
  colorClass,
  errorText,
  fmtDays,
  fmtLeaveDate,
  fmtLeaveRange,
  signClass,
  signMark,
  toNum,
} from '../leave/leaveFormat';
import { errorStatus } from './errorStatus';
import { LEAVE_STATUS_LABELS, LEDGER_ENTRY_TYPE_LABELS } from '../../../types/hr';
import type { LeaveStatus, MyLeaveSummary } from '../../../types/hr';

/**
 * **② «إجازاتي» — قسمُ الرصيد والطلب والسجلّ.**
 *
 * هذا هو جسمُ `MyHrPage` القديم كما كان حرفاً بحرف، منقولاً إلى قسمٍ مستقلٍّ حين قُسّمت
 * الصفحةُ ثلاثةَ أقسام. **ولا حرفَ منطقٍ تغيّر**: الفروعُ الستّة، وشرطُ `is_initialized`،
 * و«لا رقمَ بلا أساس»، وكونُ الفعل **رابطاً لا زرّاً** — كلُّها كما كانت وللأسباب نفسِها
 * المشروحة أدناه.
 *
 * ══════ ما تبدّل بالتقسيم — وحدَه ══════
 * · **الحقائقُ نزلت من رأس الصفحة إلى هنا**: كانت أوسمةً في `hrl-head` (رصيدٌ · مخصومٌ ·
 *   مرضيّة)، وهي حقائقُ إجازةٍ لا حقائقَ هويّة. وبقاؤها في رأسٍ يعلو ثلاثةَ أقسامٍ يعني
 *   أن يرى الموظفُ رقمَ إجازةٍ وهو في «حضوري» أو «راتبي» — ضجيجٌ في قسمٍ لا يخصّه.
 * · **والاستعلامُ صار كسولاً**: لا يُطلَق إلّا حين يُفتح القسم، فأوّلُ فتحٍ للصفحة نداءٌ
 *   واحد (الحضور) لا ثلاثة. و`react-query` يحفظ النتيجة فالعودةُ إلى القسم فورية.
 *
 * ══════ ما لا تملكه لا يُزوَّر (منقولٌ كما هو) ══════
 * · **لا `hrl-formula`**: الحدودُ الأربعة (`opening/accrued/consumed/adjustments`) ليست في
 *   `MyLeaveSummary.types[]` — فيقف الرقمُ بوسمه وحدَه ولا تُرسَم معادلةٌ بأرقامٍ مخترعة.
 * · **لا `hrl-meter` للنافذة المرضية**: الحمولةُ تعطي `remaining_full` و`window_ends_on`
 *   فقط، **لا `tiers[]`** — ومقياسٌ ثلاثيٌّ بأوزانٍ مخترعةٍ كذبٌ بصريّ.
 * · **والفعلُ صار زرّاً**: كان رابطاً مشروطاً إلى «الطلبات الإدارية» لأن
 *   `POST /hr/employees/{id}/leaves` محروسٌ بـ`hr.leave.manage` ولا يملكها الموظف — فزرٌّ
 *   يفتح مودالاً كان زرّاً يفشل. وقد صار للموظف مسارُه هو (`POST /hr/me/leaves`، بلا معرِّفٍ
 *   إطلاقاً)، فانتقل الفعلُ إلى `MyLeaveRequestsCard` زرّاً ونموذجاً ومعاينةً حيّة.
 * · **ولا ٢١ ولا ٠ ولا شرطة** لرصيدٍ غير مُهيَّأ — تُسمّى الحالةُ نصّاً.
 */

/** نصٌّ احتياطيٌّ واحدٌ لفرع الخطأ — عرفُ وحدة الإجازات. */
const CONNECTION_FALLBACK = 'انقطعَ الاتصال بالخادم.';

const STATUS_BADGE: Record<LeaveStatus, string> = {
  pending: 'hr-badge--gold',
  approved: 'hr-badge--green',
  rejected: 'hr-badge--red',
  cancelled: 'hr-badge--gray',
  superseded: 'hr-badge--gray',
};

/**
 * **أهمُّ سطرٍ في القسم** — يمنع أخطرَ سوءِ فهمٍ فيه: متى يُخصم الطلبُ من الرقم أعلاه.
 *
 * كان يقول إن الطلبَ يُقدَّم في «الطلبات الإدارية» ولا يُخصم حتى يسجّله مديرُ الموارد البشرية،
 * وقد صار للموظف مسارُه هو (`POST /hr/me/leaves`). والحقيقةُ الباقية أدقُّ: الطلبُ يُنشأ
 * **معلَّقاً** و**لا يُكتب في الدفتر إطلاقاً** حتى يُعتمد — فالخصمُ لحظةَ الاعتماد لا لحظةَ الطلب.
 */
const requestsNote = (
  <p className="hrl-note">
    طلبُك يبقى معلَّقاً حتى يعتمده من يملك ذلك في مكتبك،{' '}
    <strong>ولا يُخصم من الرصيد أعلاه قبل الاعتماد</strong>.
  </p>
);

/** الرصيدُ المعروضُ أوّلاً: السنويُّ إن وُجد، وإلّا أوّلُ نوعٍ أرسله الخادم. */
function mainTypeOf(summary: MyLeaveSummary): MyLeaveSummary['types'][number] | null {
  const types = summary.types ?? [];
  if (types.length === 0) return null;
  return types.find((t) => t.code === 'annual') ?? types[0];
}

export const MyLeaveSection: React.FC = () => {
  const summaryQuery = useQuery({
    queryKey: ['hr', 'me', 'leave-summary'],
    queryFn: () => hrLeaveService.getMySummary(),
    // 404 (لا ملفّ) و403 (الميزةُ مطفأة) **نتيجتان نهائيّتان لا أعطالٌ عابرة** —
    // وإعادةُ المحاولة ثلاثاً تُبطئ الشاشةَ بلا أملِ اختلاف.
    retry: false,
  });

  const summary = summaryQuery.data;
  const status = errorStatus(summaryQuery.error);

  /**
   * **ستُّ حالاتٍ متمايزة، وصفرُ أيقونةِ قفلٍ واحدةٍ لأربع**: القفلُ للمحميّ حصراً (٤٠٤
   * و٤٠٣)، والمحفظةُ لغير المهيَّأ، والمثلثُ الأحمرُ للعطل، والهياكلُ للتحميل.
   */
  if (summaryQuery.isPending) {
    return (
      <div className="hrl-state hrl-state--loading" aria-busy="true" aria-label="جارٍ تحميل رصيدك">
        {Array.from({ length: 4 }, (_, i) => (
          <span className="hrl-skel" key={i} />
        ))}
      </div>
    );
  }

  // ٤٠٤ — لا ملفَّ موارد بشرية لحسابه. **ليست عطلاً** فلا تُفتح لها تذكرةُ دعم،
  // وبلا زرٍّ لأنّه لا يملك فعلاً: إنشاءُ الملفّ بيد إدارة المكتب.
  if (status === 404) {
    return (
      <div className="hrl-state hrl-state--locked">
        <Lock size={22} />
        <p className="hrl-state__t">ملفُّك الوظيفيّ لم يُنشأ بعد</p>
        <p className="hrl-state__d">{errorText(summaryQuery.error, 'لا ملفَّ موارد بشرية لحسابك.')}</p>
      </div>
    );
  }

  // ٤٠٣ — الميزةُ مطفأةٌ للمكتب (لا يُبلَغ هذا الفرعُ إلا برابطٍ مباشر: بندُ القائمة
  // خلف `featureGate: 'hr'`). ونصُّ الخادم **كما وصل** بلا ترجمةٍ فرونتيةٍ ولا تخمين.
  if (status === 403) {
    return (
      <div className="hrl-state hrl-state--locked">
        <Lock size={22} />
        <p className="hrl-state__t">هذه الشاشة غير متاحة لمكتبك</p>
        <p className="hrl-state__d">{errorText(summaryQuery.error, 'غير متاح.')}</p>
      </div>
    );
  }

  if (summaryQuery.isError || !summary) {
    return (
      <div className="hrl-state hrl-state--error">
        <AlertTriangle size={22} />
        <p className="hrl-state__t">تعذّر جلبُ رصيدك</p>
        <p className="hrl-state__d">{errorText(summaryQuery.error, CONNECTION_FALLBACK)}</p>
        <button type="button" className="hr-btn hr-btn--sm" onClick={() => void summaryQuery.refetch()}>
          <RefreshCw size={13} /> إعادة المحاولة
        </button>
      </div>
    );
  }

  // رصيدٌ غير مُهيَّأ: **محفظةٌ لا قفل** — ليست حمايةً بل حالةً لم تُهيّأ بعد.
  // ولا رقمَ إطلاقاً (لا ٢١ ولا ٠ ولا شرطة): الاستحقاقُ يبدأ من مرساةٍ صريحة.
  //
  // والطلبُ يبقى متاحاً هنا: **مشروطٌ بوجود ملفٍّ لا بتهيئة رصيده** — من لم يُهيَّأ رصيدُه
  // يقدّم طلباً كما يقدّمه غيرُه، والخادمُ يحسم ما يُخصم ومتى.
  if (!summary.is_initialized) {
    return (
      <>
        <section className="hrl-block">
          <div className="hrl-block__h">
            <h2 className="hrl-block__t hrl-h2">
              <Wallet size={14} aria-hidden="true" /> رصيدي
            </h2>
          </div>

          <div className="hrl-state hrl-state--empty">
            <Wallet size={22} />
            <p className="hrl-state__t">رصيدُك غير مُهيَّأ</p>
            <p className="hrl-state__d">لم يُسجَّل رصيدٌ افتتاحيٌّ لملفّك بعد — راجع إدارةَ المكتب.</p>
          </div>

          {requestsNote}
        </section>

        <MyLeaveRequestsCard />
      </>
    );
  }

  const main = mainTypeOf(summary);

  /**
   * الرصيفُ — **جوابُ السؤال الذي فُتح القسمُ لأجله، فيسبق السجلَّ في الشجرة**: يُقرأ
   * أوّلاً بالمحرّك الصوتيّ، ويقع أوّلَ ما يُرى حين تصير الشبكةُ عموداً واحداً على
   * الجوّال. وسطحُ المكتب يعيده رصيفاً على المسار الثاني بإسنادٍ صريحٍ في `my-hr.css`
   * لا بترتيب الشجرة — وهو **بلا كلفةِ تركيز**: كلُّ ما فيه نصٌّ ساكن.
   */
  const balanceRail = (
    <aside className="myhr-cols__side">
      <section className="hrl-block">
        <div className="hrl-block__h">
          <h2 className="hrl-block__t hrl-h2">
            <Wallet size={14} aria-hidden="true" /> رصيدي
          </h2>
        </div>

        {main === null ? (
          <EmptyLine text="لا أنواعَ إجازةٍ مفعّلة" />
        ) : (
          <>
            <div className="hrl-num">
              <span className={`hrl-num__v${toNum(main.balance) < 0 ? ' is-neg' : ''}`} dir="ltr">
                {fmtDays(main.balance)}
              </span>
              <span className="hrl-num__u">يوماً متاحاً — {main.name}</span>
            </div>
            {/* وسمُ الرصيد **من الخادم حرفياً** — لا يُكتب فوقه تاريخُ اليوم:
                الذيلُ قد يشمل إجازةً تبدأ بعد ثلاثة أسابيع. */}
            <p className="hrl-num__label">{summary.balance_label}</p>

            <div className="hrl-block__b hrl-block__b--flush">
              {summary.types.map((t) => (
                <p className="hrl-row hrl-row--static" key={t.code}>
                  <span className={`hrl-type ${colorClass(t.color_key)}`}>
                    <span className="hrl-dot" aria-hidden="true" />
                    <span className="hrl-type__n">{t.name}</span>
                  </span>
                  <span className={`hrl-mini${toNum(t.balance) < 0 ? ' is-neg' : ''}`} dir="ltr">
                    {fmtDays(t.balance)}
                  </span>
                </p>
              ))}
            </div>

            {/* الحقيقةُ التي كانت وسماً في رأس الصفحة: يومٌ مخصومٌ لإجازةٍ لم تبدأ بعد.
                تُعرض **متى كانت أكبر من صفر** فقط — لا صفرَ يُطمئن كذباً. */}
            {summary.future_committed_days > 0 && (
              <p className="hrl-hint">
                منها <span dir="ltr">{fmtDays(summary.future_committed_days)}</span> مخصومةٌ لإجازةٍ
                قادمةٍ اعتُمدت ولم تبدأ بعد.
              </p>
            )}
          </>
        )}
      </section>

      {summary.sick && (
        <section className="hrl-block">
          <div className="hrl-block__h">
            <h2 className="hrl-block__t hrl-h2">
              <Scale size={14} aria-hidden="true" /> النافذة المرضية
            </h2>
          </div>
          <div className="hrl-block__b">
            <dl className="hrl-kv">
              <dt>بأجرٍ كامل</dt>
              <dd dir="ltr">{fmtDays(summary.sick.remaining_full)}</dd>

              <dt>تنتهي النافذة</dt>
              <dd>{fmtLeaveDate(summary.sick.window_ends_on)}</dd>
            </dl>
          </div>
          <p className="hrl-legal">
            <Scale size={13} />
            <span>
              الأجرُ في الإجازة المرضية يتدرّج بشرائحَ خلال نافذةٍ سنوية —{' '}
              <span className="hrl-legal__ref" dir="ltr">م.117</span>
            </span>
          </p>
        </section>
      )}
    </aside>
  );

  return (
    <div className="myhr-cols">
      {balanceRail}

      <div className="myhr-cols__main">
        <section className="hrl-block">
          <div className="hrl-block__h">
            <h2 className="hrl-block__t hrl-h2">
              <CalendarDays size={14} aria-hidden="true" /> إجازاتي القادمة
            </h2>
          </div>
          <div className="hrl-block__b hrl-block__b--flush myhr-tablewrap">
            {summary.upcoming.length === 0 ? (
              <EmptyLine text="لا إجازاتٍ قادمة" />
            ) : (
              <table className="hrl-table hrl-table--single">
                <caption className="hrl-sr">إجازاتي التي لم تنتهِ بعد</caption>
                <thead>
                  <tr>
                    <th scope="col">النوع</th>
                    <th scope="col">المدى</th>
                    <th scope="col">الأيام</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.upcoming.map((leave) => (
                    <tr key={leave.id}>
                      <td>
                        <span className="hrl-type__n">{leave.type_name_snapshot || EMPTY_MARK}</span>
                        <span className="hrl-cellsub">
                          <span className={`hr-badge ${STATUS_BADGE[leave.status]}`}>
                            {LEAVE_STATUS_LABELS[leave.status]}
                          </span>
                        </span>
                      </td>
                      <td>{fmtLeaveRange(leave.start_date, leave.end_date)}</td>
                      <td>
                        <span className="hrl-cellnum" dir="ltr">{fmtDays(leave.duration_days)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {requestsNote}
        </section>

        {/* الطلبُ وسجلُّه — يليان «القادمة» مباشرةً: مَن فتح القسمَ ليطلب يجد الزرَّ قبل
            دفتر الحركات، والحركاتُ سجلٌّ يُراجَع لا فعلٌ يُنقر. */}
        <MyLeaveRequestsCard />

        <section className="hrl-block">
          <div className="hrl-block__h">
            <h2 className="hrl-block__t hrl-h2">
              <Wallet size={14} aria-hidden="true" /> آخر الحركات
            </h2>
          </div>
          <div className="hrl-block__b hrl-block__b--flush myhr-tablewrap">
            {summary.recent_entries.length === 0 ? (
              <EmptyLine text="لا حركاتٍ بعد" />
            ) : (
              <table className="hrl-ledger">
                <caption className="hrl-sr">آخر حركات رصيدي مرتَّبةً من الأحدث</caption>
                <thead>
                  <tr>
                    <th scope="col">التاريخ</th>
                    <th scope="col">النوع</th>
                    <th scope="col">الأيام</th>
                    <th scope="col">الرصيد بعد</th>
                    <th scope="col">الوصف</th>
                    <th scope="col">مَن</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recent_entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="hrl-ledger__num">{fmtLeaveDate(entry.effective_date)}</td>
                      <td>
                        <span className="hrl-badge hrl-badge--flat">
                          {LEDGER_ENTRY_TYPE_LABELS[entry.entry_type] ?? entry.entry_type}
                        </span>
                      </td>
                      <td dir="ltr" className={`hrl-ledger__num ${signClass(entry.days)}`}>
                        <span aria-hidden="true">{signMark(entry.days)}</span> {fmtDays(Math.abs(toNum(entry.days)))}
                      </td>
                      <td dir="ltr" className="hrl-ledger__num">{fmtDays(entry.balance_after)}</td>
                      <td className="hrl-ledger__desc">{entry.description || EMPTY_MARK}</td>
                      {/* **يُعرَض خلافاً لعرفِ إخفاء المسجِّل**: الإشعارُ يسمّيه أصلاً
                          حين تُسجَّل الواقعة، فإخفاؤه بعده تناقضٌ يهدم الثقة. */}
                      <td className="hrl-ledger__who">{entry.created_by_name || 'النظام'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default MyLeaveSection;
