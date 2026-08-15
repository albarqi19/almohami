import React from 'react';
import { CalendarDays, CheckCircle2, Gavel, ListTodo, Users } from 'lucide-react';

import type { LeaveConflictContext } from '../../../types/hr';
import { EMPTY_MARK, fmtDays, fmtLeaveDate } from '../leave/leaveFormat';

/**
 * **لوحُ التعارض أمام المعتمِد** — ما قد يغيب عنه قبل أن يضغط «موافقة».
 *
 * ══════ المبدأُ الحاكم: يُعلِم ولا يمنع ══════
 * 🔴 لا شيءَ في هذا المكوّن يعطّل زرّاً ولا يرفع حاجزاً. جلسةٌ مجدولةٌ في نافذة الإجازة
 * **لا تُبطل الطلب** — تُعرَض ليقرّر المديرُ هو. لا حكمَ آليٌّ حيث يقرّر إنسان؛ والنظامُ
 * يريه ما قد يغيب عنه لا ما يجب أن يفعله.
 *
 * ══════ ولماذا الجلساتُ أوّلاً ══════
 * جلسةٌ فائتةٌ قد تُسقط حقّاً — وهي وحدَها من بين الثلاثة لا تُعوَّض بتأجيل. ولذلك تتصدّر
 * اللوحَ **مفتوحةً بلا طيّ** بينما تُطوى المهامُّ والغيابات: ما يُخفيه `<details>` قد لا
 * يُفتح، والأخطرُ لا يُترك لنقرةٍ قد لا تقع. وكلُّ صفٍّ يحمل ما يُميّز الجلسة: **تاريخُها
 * ونوعُها والمحكمةُ ورقمُ القضية** — لا عنوانَ قضيةٍ وحدَه لا يُبحَث به في ناجز.
 *
 * ══════ والسكوتُ يُقرأ عطلاً لا سلامة ══════
 * 🔴 اللوحُ **لا يُخفى حين لا تعارض**: تُكتب الجملةُ صراحةً («لا جلساتِ ولا مهامّ…»).
 * وغيابُ بانرٍ يقرؤه المعتمِدُ «لم يُفحَص» بحقّ — وقد يكون فُحص فسَلِم.
 *
 * 🩸 **والتاريخُ يُرشَّح بـ`session_date_gregorian`** في الخادم (`session_date` عمودٌ نصّيٌّ
 * حرٌّ قد يكون هجريّاً). ويُعرَض هنا الميلاديُّ أوّلاً لأنه ما رُشِّح به — وعرضُ الهجريّ فوق
 * ترشيحٍ ميلاديٍّ يجعل المطابقةَ بالعين مستحيلة. والنصُّ الحرُّ يبقى احتياطاً لا أصلاً.
 *
 * ⚠️ `dir="ltr"` **لا يوضع على عنصرٍ فيه عربيةٌ ورقم** — يمزّق النصّ. الأرقامُ وحدَها
 * (رقمُ القضية · الوقت) تُلفّ في `<span dir="ltr">` مستقلّ.
 */

interface Props {
  context: LeaveConflictContext;
  /** أثرُ الاعتماد في الرصيد — يُعرض داخل اللوح فيقرأ المعتمِدُ الحقائقَ كلَّها في موضع. */
  impact?: {
    charges_ledger: boolean;
    days: number;
    balance_before: number | null;
    balance_after: number | null;
    will_go_negative: boolean;
  };
}

/** ما يُميّز الجلسةَ في سطر: التاريخُ الميلاديُّ هو المُرشَّح به، والنصُّ الحرُّ احتياطٌ. */
function sessionDate(session: { session_date_gregorian?: string | null; session_date?: string | null }): string {
  if (session.session_date_gregorian) return fmtLeaveDate(session.session_date_gregorian);
  if (session.session_date) return String(session.session_date);
  return EMPTY_MARK;
}

export const ApprovalConflictPanel: React.FC<Props> = ({ context, impact }) => {
  const sessions = context.scheduled_sessions ?? [];
  const tasks = context.pending_tasks ?? [];
  const overlaps = context.overlapping_leaves ?? [];
  const previous = context.previous_leaves;

  const clear = sessions.length === 0 && tasks.length === 0 && overlaps.length === 0;

  return (
    <section className="hrla-panel" aria-label="ما يقع في مدّة الإجازة">
      <h4 className="hrla-panel__t">
        <CalendarDays size={13} aria-hidden="true" />
        ما يقع في هذه المدّة
      </h4>

      {/* ═══ السلامةُ تُنطَق ولا تُترك للسكوت ═══ */}
      {clear && (
        <p className="hrla-clear">
          <CheckCircle2 size={13} aria-hidden="true" />
          <span>
            لا جلساتِ ولا مهامَّ ولا غياباتٍ متداخلةً في هذه المدّة — فُحصت المدّةُ ولم يُوجد
            ما يتعارض.
          </span>
        </p>
      )}

      {/* ═══ الجلسات — أخطرُها، فمفتوحةٌ بلا طيّ ═══ */}
      {sessions.length > 0 && (
        <div className="hrla-group hrla-group--grave">
          <h5 className="hrla-group__t">
            <Gavel size={12} aria-hidden="true" />
            جلساتٌ مجدولةٌ للموظف
            <span className="hrla-group__n" dir="ltr">{sessions.length}</span>
          </h5>
          <p className="hrla-group__why">
            جلسةٌ فائتةٌ قد تُسقط حقّاً. اعتمادُ الإجازة لا يُلغيها — يلزم من يحضرها أو تأجيلُها.
          </p>
          <ul className="hrla-list">
            {sessions.map((session) => (
              <li key={session.id} className="hrla-row">
                <span className="hrla-row__d">{sessionDate(session)}</span>
                <span className="hrla-row__m">
                  {session.case?.title || 'قضيةٌ بلا عنوان'}
                  {/* «رقم» ورقمُها لا ينفصلان بكسر سطر: كلمةٌ معلَّقةٌ في آخر سطرٍ ورقمٌ
                      وحدَه في التالي يُقرأ نصّاً مكسوراً — وهذا الرقمُ ما يُبحَث به في ناجز. */}
                  {session.case?.file_number ? (
                    <span className="hrla-nb">
                      {' — رقم '}
                      <span dir="ltr">{session.case.file_number}</span>
                    </span>
                  ) : null}
                </span>
                <span className="hrla-row__f">
                  {session.session_type ? <span className="hrla-chip">{session.session_type}</span> : null}
                  {session.court ? <span className="hrla-chip">{session.court}</span> : null}
                  {session.session_time ? (
                    <span className="hrla-chip" dir="ltr">{session.session_time}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ═══ المهامُّ المستحقّةُ في النافذة ═══ */}
      {tasks.length > 0 && (
        <div className="hrla-group">
          <h5 className="hrla-group__t">
            <ListTodo size={12} aria-hidden="true" />
            مهامُّ مستحقّةٌ في المدّة
            <span className="hrla-group__n" dir="ltr">{tasks.length}</span>
          </h5>
          <ul className="hrla-list">
            {tasks.map((task) => (
              <li key={task.id} className="hrla-row">
                <span className="hrla-row__d">
                  {task.due_date ? fmtLeaveDate(task.due_date) : 'بلا موعد'}
                </span>
                <span className="hrla-row__m">{task.title}</span>
                <span className="hrla-row__f">
                  {task.case_id !== null ? (
                    <span className="hrla-chip">
                      {'قضية '}
                      <span dir="ltr">{task.case_id}</span>
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ═══ زملاءُ غائبون في المدّة نفسِها ═══ */}
      {overlaps.length > 0 && (
        <div className="hrla-group">
          <h5 className="hrla-group__t">
            <Users size={12} aria-hidden="true" />
            غائبون في المدّة نفسِها
            <span className="hrla-group__n" dir="ltr">{overlaps.length}</span>
          </h5>
          <ul className="hrla-list">
            {overlaps.map((row) => (
              <li key={`${row.source}-${row.id}`} className="hrla-row">
                <span className="hrla-row__d">
                  {fmtLeaveDate(row.start_date)} {'←'} {fmtLeaveDate(row.end_date)}
                </span>
                <span className="hrla-row__m">{row.employee_name || EMPTY_MARK}</span>
                <span className="hrla-row__f">
                  {row.type_name ? <span className="hrla-chip">{row.type_name}</span> : null}
                  <span className="hrla-chip">{row.status_arabic}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ═══ سابقُ إجازاته — سياقٌ لا تهمة ═══ */}
      <p className="hrla-prev">
        سابقُ إجازاته المعتمَدة: <span dir="ltr">{previous.all_approved}</span>
        {' · من نفس النوع '}
        <span dir="ltr">{previous.same_type_count}</span>
        {' بمجموع '}
        <span dir="ltr">{fmtDays(previous.same_type_days)}</span>
        {' يوم · وهذا العام '}
        <span dir="ltr">{fmtDays(previous.this_year_days)}</span>
        {' يوم'}
      </p>

      {/* ═══ الرصيدُ قبل وبعد — رقمٌ لا وعد ═══ */}
      {impact !== undefined && (
        <p className={`hrla-impact${impact.will_go_negative ? ' hrla-impact--negative' : ''}`}>
          {impact.charges_ledger ? (
            <>
              {'الاعتمادُ يخصم '}
              <span dir="ltr">{fmtDays(impact.days)}</span>
              {' يوماً من رصيده: '}
              <span dir="ltr">{fmtDays(impact.balance_before)}</span>
              {' ⇐ '}
              <span dir="ltr">{fmtDays(impact.balance_after)}</span>
              {impact.will_go_negative ? ' — ويصير الرصيدُ سالباً.' : ''}
            </>
          ) : (
            'هذا النوعُ لا يُخصم من رصيدٍ — الاعتمادُ يسجّل الواقعةَ ولا يحرّك رقماً.'
          )}
        </p>
      )}
    </section>
  );
};
