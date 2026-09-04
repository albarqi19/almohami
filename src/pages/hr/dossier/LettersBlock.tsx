import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { AlertTriangle, FileBadge, Plus, RefreshCw } from 'lucide-react';

import { usePermission } from '../../../hooks/usePermission';
import { EMPTY_MARK, errorText, fmtLeaveDate } from '../leave/leaveFormat';
import { openLetterPdf } from '../letters/letterPdf';
import IssueLetterModal from './IssueLetterModal';
import { useDossierInvalidate, useEmployeeLetters } from './useDossierData';
import { HR_LETTER_TYPE_LABELS } from '../../../types/hr';
import type { EmployeeProfile, HrLetter } from '../../../types/hr';

/**
 * **الخطاباتُ الصادرةُ باسم المنسوب — سجلٌّ غيرُ مطويّ.**
 *
 * ══════ ولا يُحذف البلوكُ بلا صلاحية ══════
 * خلافاً لـ`PayBlock` الذي **يسقط من الشجرة** بلا `hr.compensation.view`: وجودُ
 * خطاباتٍ ليس سرّاً عن صاحبها — وهي أوراقٌ صدرت باسمه وبيده نسخةٌ منها — وحذفُ البلوك
 * يُخفي مستنداتٍ يملكها. والقراءةُ هنا محروسةٌ بـ`hr.view` كبقية الجدار
 * (`api.php:1799`)، والإصدارُ وحدَه خلف `hr.letters.issue`.
 *
 * ومطويّاً كان سيكون خطأً مضاعفاً: لا رقمَ حسّاساً في السرد أصلاً (الأرقامُ الماليةُ
 * لا تُرسَل في الحمولة ولا تُعرض في الجدول — هي في الورقة وحدَها)، والطيُّ يُخفي
 * ما وُجد البلوكُ ليُقرأ.
 *
 * ══════ الحدُّ الوحيدُ على الأداة ══════
 * `GET …/letters/{id}/pdf` يردّ **403 صريحاً** لتعريف الراتب لمن لا يملك
 * `hr.compensation.view` — فيُعطَّل زرُّه بسببه منطوقاً في `title` بدل زرٍّ يُنتج 403
 * (عرفُ §٩-٩). والصفُّ نفسُه يبقى: إخفاؤه يجعل ترقيمَ الخطابات يبدو مثقوباً.
 */

/** نصٌّ احتياطيٌّ واحدٌ لفرع الخطأ — عرفُ `LeaveTabPanel`. */
const CONNECTION_FALLBACK = 'انقطع الاتصال بالخادم.';

/** التسميةُ **حرفيةٌ** من `app/Enums/Permission.php:393` — لا صياغةَ فرونتيةً للصلاحية. */
const ISSUE_LABEL = 'إصدار خطابات الموارد البشرية';

const SALARY_GUARD_HINT = 'فتح تعريف الراتب يتطلب صلاحية عرض الرواتب';

interface Props {
  /** مرساةُ القسم — من `SEC` في وحدة القفز، فلا يفترق عنوانٌ عن مرساته. */
  id: string;
  empId: number;
  emp: EmployeeProfile;
  /** تُقرأ مرّةً في الجدار وتُمرَّر — فلا تُقرأ الصلاحيةُ ذاتُها في موضعين. */
  canIssue: boolean;
}

export const LettersBlock: React.FC<Props> = ({ id, empId, emp, canIssue }) => {
  const canComp = usePermission('hr.compensation.view');

  const [showIssue, setShowIssue] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const lettersQuery = useEmployeeLetters(empId);
  const letters = lettersQuery.data;
  const { letters: invalidate } = useDossierInvalidate(empId);

  const openPdf = async (letter: HrLetter) => {
    setBusyId(letter.id);
    try {
      await openLetterPdf(
        `/hr/employees/${empId}/letters/${letter.id}/pdf`,
        `hr-letter-${letter.letter_number}.pdf`
      );
    } catch (error) {
      toast.error(errorText(error, 'تعذر فتح الخطاب'));
    } finally {
      setBusyId(null);
    }
  };

  /**
   * **أربعُ حالاتٍ متمايزةٌ شكلاً ونصّاً**: هياكلُ للتحميل · مثلثٌ أحمرُ بنصِّ الخادم
   * وزرِّ إعادةٍ للخطأ · حالةٌ فارغةٌ **بلا صفٍّ وهميٍّ ولا بياناتِ ديمو** · جدولٌ للبيانات.
   */
  const body = (() => {
    if (lettersQuery.isPending) {
      return (
        <div className="hrl-state hrl-state--loading" aria-busy="true" aria-label="جارٍ تحميل الخطابات">
          {Array.from({ length: 4 }, (_, i) => (
            <span className="hrl-skel" key={i} />
          ))}
        </div>
      );
    }

    if (lettersQuery.isError) {
      return (
        <div className="hrl-state hrl-state--error">
          <AlertTriangle size={20} />
          <p className="hrl-state__t">تعذر تحميل الخطابات</p>
          <p className="hrl-state__d">{errorText(lettersQuery.error, CONNECTION_FALLBACK)}</p>
          <button type="button" className="hr-btn hr-btn--sm" onClick={() => void lettersQuery.refetch()}>
            <RefreshCw size={13} /> إعادة المحاولة
          </button>
        </div>
      );
    }

    const rows = letters ?? [];

    if (rows.length === 0) {
      return (
        <div className="hrl-state hrl-state--empty">
          <FileBadge size={20} />
          <p className="hrl-state__t">لم يصدر خطاب لهذا الموظف بعد</p>
          <p className="hrl-state__d">تظهر هنا الخطابات المرقمة الصادرة باسمه.</p>
        </div>
      );
    }

    return (
      <table className="hrl-table hrl-table--single">
        <caption className="hrl-sr">الخطابات الصادرة باسم الموظف مرتبة من الأحدث</caption>
        <thead>
          <tr>
            <th scope="col">النوع</th>
            <th scope="col">الرقم</th>
            <th scope="col">التاريخ</th>
            <th scope="col">الجهة</th>
            <th scope="col">من أصدره</th>
            <th scope="col"><span className="hrl-sr">أدوات</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((letter) => {
            const guarded = letter.letter_type === 'salary_certificate' && !canComp;

            return (
              <tr key={letter.id}>
                <td>
                  <span className="hrl-type__n">{HR_LETTER_TYPE_LABELS[letter.letter_type]}</span>
                  {letter.issued_by_self && (
                    <span className="hrl-cellsub">
                      <span className="hr-badge hr-badge--gold">إصدار ذاتي</span>
                    </span>
                  )}
                </td>
                {/* الرقمُ لاتينيٌّ مركّب (`HRL-1448-0001`) — و`dir="ltr"` عليه إلزاميّ */}
                <td>
                  <span className="hrl-cellnum" dir="ltr">{letter.letter_number}</span>
                </td>
                <td>{fmtLeaveDate(letter.issued_at)}</td>
                <td>{letter.recipient_name || EMPTY_MARK}</td>
                <td>{letter.issuer?.name || EMPTY_MARK}</td>
                <td>
                  <span className="hrl-tools">
                    <button
                      type="button"
                      className="hrl-cellbtn"
                      title={guarded ? SALARY_GUARD_HINT : undefined}
                      disabled={guarded || busyId === letter.id}
                      onClick={() => void openPdf(letter)}
                    >
                      فتح PDF
                    </button>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  })();

  return (
    <section className="hrl-block" id={id}>
      <div className="hrl-block__h">
        <h2 className="hrl-block__t hrl-h2">
          <FileBadge size={14} /> الخطابات
        </h2>
        {canIssue && (
          <div className="hrl-block__a">
            <button
              type="button"
              className="hr-btn hr-btn--sm hr-btn--primary"
              onClick={() => setShowIssue(true)}
            >
              <Plus size={14} /> إصدار خطاب
            </button>
          </div>
        )}
      </div>

      {/* غيابُ الزرّ يُفسَّر بسطرٍ واحدٍ باسم الصلاحية حرفياً — موضعُه تحت الرأس مباشرةً
          حيث كان الزرُّ ليكون، لا في الذيل حيث يُقرأ خبراً عن غيره. ولا زرَّ يُنتج 403. */}
      {!canIssue && (
        <div className="hrl-block__b">
          <p className="hrl-hint">إصدار الخطابات يتطلب صلاحية «{ISSUE_LABEL}».</p>
        </div>
      )}

      <div className="hrl-block__b hrl-block__b--flush">{body}</div>

      <p className="hrl-note">
        الخطاب الصادر لا يعدل ولا يلغى، والتصحيح يكون بإصدار خطاب جديد برقم جديد. وقراءة
        تعريف الراتب مسجلة في سجل التدقيق.
      </p>

      {showIssue && (
        <IssueLetterModal
          empId={empId}
          emp={emp}
          onClose={() => setShowIssue(false)}
          onIssued={invalidate}
        />
      )}
    </section>
  );
};

export default LettersBlock;
