import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { AlertTriangle, FileBadge, Lock, RefreshCw } from 'lucide-react';

import { hrLetterService } from '../../../services/hrLetterService';
import { EMPTY_MARK, errorText, fmtLeaveDate } from '../leave/leaveFormat';
import { openLetterPdf } from '../letters/letterPdf';
import { errorStatus } from './errorStatus';
import { HR_LETTER_TYPE_HINTS, HR_LETTER_TYPE_LABELS } from '../../../types/hr';
import type { HrLetter, HrLetterType } from '../../../types/hr';

/**
 * **خطاباتي — ما يصدره الموظفُ لنفسه، وما يشهد به المكتبُ عنه.**
 *
 * ══════ ثلاثةُ صفوفٍ معطَّلةٍ بنصٍّ لا بزرٍّ يُنتج 403 (عرفُ §٩-٩) ══════
 * `POST /hr/me/letters` يقبل **«تعريف بالعمل» وحدَه** (`HrLetter::SELF_ISSUABLE_TYPES`)،
 * وأيَّ نوعٍ آخر يردّه الخادمُ 422 من التحقّق. فلا يُرسَم زرٌّ لثلاثةٍ محكومةٍ بالرفض:
 * يُقال من يصدرها ولماذا. والتعليل الذي يقوله السطرُ الثابت: «تعريف بالعمل» يذكر
 * وقائعَ يعرفها الموظفُ عن نفسه، أمّا تعريفُ الراتب فشهادةٌ ماليةٌ يمنحها المكتبُ لبنك،
 * وشهادةُ الخبرة قولُ صاحب العمل، وإخلاءُ الطرف أبطلُ ما يكون لو أصدره صاحبُ الشأن.
 *
 * ══════ ولا رقمَ ماليّاً في السرد ══════
 * `meIndex` **لا يكشف لقطةَ أجرٍ إطلاقاً** (لا `makeVisible`)، والجدولُ هنا أربعةُ
 * أعمدةٍ بلا عمودِ راتب: الأرقامُ في الورقة وحدَها، وتنزيلُها مُدقَّقٌ في الخادم.
 *
 * ══════ وحالتا `retry:false` ══════
 * 404 (لا ملفَّ) و403 (الوحدةُ مطفأة) نتيجتان نهائيّتان لا أعطالٌ عابرة — تُميَّزان
 * بـ`errorStatus` **المشتركةِ في `errorStatus.ts`** لا بنسخةٍ ثانيةٍ منها هنا.
 */

/** ما يصدره الموظفُ لنفسه — نسخةُ `HrLetter::SELF_ISSUABLE_TYPES`. */
const SELF_ISSUABLE: HrLetterType = 'employment_certificate';

/** ترتيبُ الصفوف = ترتيبُ خريطة التسميات — مصدرٌ واحدٌ فلا تفترق قائمتان. */
const LETTER_TYPES = Object.keys(HR_LETTER_TYPE_LABELS) as HrLetterType[];

/** نصٌّ احتياطيٌّ واحدٌ لفرع الخطأ — عرفُ وحدة الإجازات. */
const CONNECTION_FALLBACK = 'انقطع الاتصال بالخادم.';

export const MyLettersCard: React.FC = () => {
  const qc = useQueryClient();
  const [issuing, setIssuing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const lettersQuery = useQuery({
    queryKey: ['hr', 'me', 'letters'],
    queryFn: hrLetterService.myList,
    retry: false,
  });

  const status = errorStatus(lettersQuery.error);

  const issueSelf = async () => {
    setIssuing(true);
    try {
      const letter = await hrLetterService.myIssue({ letter_type: SELF_ISSUABLE });
      toast.success('تم إصدار الخطاب برقم ' + letter.letter_number);

      // الإبطالُ **قبل** فتح الـPDF: الورقةُ صدرت وحُجز رقمُها، فسقوطُ الفتح لا يجوز
      // أن يترك السردَ بلا صفٍّ لها.
      void qc.invalidateQueries({ queryKey: ['hr', 'me', 'letters'] });

      try {
        await openLetterPdf(`/hr/me/letters/${letter.id}/pdf`, `hr-letter-${letter.letter_number}.pdf`);
      } catch (pdfError) {
        toast.error(errorText(pdfError, 'تعذر فتح الخطاب'));
      }
    } catch (error) {
      toast.error(errorText(error, 'تعذر إصدار الخطاب'));
    } finally {
      setIssuing(false);
    }
  };

  const openPdf = async (letter: HrLetter) => {
    setBusyId(letter.id);
    try {
      await openLetterPdf(`/hr/me/letters/${letter.id}/pdf`, `hr-letter-${letter.letter_number}.pdf`);
    } catch (error) {
      toast.error(errorText(error, 'تعذر فتح الخطاب'));
    } finally {
      setBusyId(null);
    }
  };

  const list = (() => {
    if (lettersQuery.isPending) {
      return (
        <div className="hrl-state hrl-state--loading" aria-busy="true" aria-label="جارٍ تحميل خطاباتك">
          {Array.from({ length: 4 }, (_, i) => (
            <span className="hrl-skel" key={i} />
          ))}
        </div>
      );
    }

    // ٤٠٤ (لا ملفَّ) و٤٠٣ (الوحدةُ مطفأة) — **قفلٌ لا مثلثٌ أحمر**: حالةٌ لا عطل.
    if (status === 404 || status === 403) {
      return (
        <div className="hrl-state hrl-state--locked">
          <Lock size={20} />
          <p className="hrl-state__t">سجل خطاباتك غير متاح</p>
          <p className="hrl-state__d">{errorText(lettersQuery.error, 'غير متاح.')}</p>
        </div>
      );
    }

    if (lettersQuery.isError) {
      return (
        <div className="hrl-state hrl-state--error">
          <AlertTriangle size={20} />
          <p className="hrl-state__t">تعذر تحميل خطاباتك</p>
          <p className="hrl-state__d">{errorText(lettersQuery.error, CONNECTION_FALLBACK)}</p>
          <button type="button" className="hr-btn hr-btn--sm" onClick={() => void lettersQuery.refetch()}>
            <RefreshCw size={13} /> إعادة المحاولة
          </button>
        </div>
      );
    }

    const rows = lettersQuery.data ?? [];

    if (rows.length === 0) {
      return (
        <div className="hrl-state hrl-state--empty">
          <FileBadge size={20} />
          <p className="hrl-state__t">لم يصدر خطاب باسمك بعد</p>
          <p className="hrl-state__d">تظهر هنا الخطابات المرقمة الصادرة باسمك.</p>
        </div>
      );
    }

    return (
      <table className="hrl-table hrl-table--single">
        <caption className="hrl-sr">خطاباتي الصادرة مرتبة من الأحدث</caption>
        <thead>
          <tr>
            <th scope="col">النوع</th>
            <th scope="col">الرقم</th>
            <th scope="col">التاريخ</th>
            <th scope="col"><span className="hrl-sr">أدوات</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((letter) => (
            <tr key={letter.id}>
              <td>
                <span className="hrl-type__n">
                  {HR_LETTER_TYPE_LABELS[letter.letter_type] ?? EMPTY_MARK}
                </span>
              </td>
              {/* الرقمُ لاتينيٌّ مركّب — و`dir="ltr"` عليه إلزاميّ */}
              <td>
                <span className="hrl-cellnum" dir="ltr">{letter.letter_number}</span>
              </td>
              <td>{fmtLeaveDate(letter.issued_at)}</td>
              <td>
                <span className="hrl-tools">
                  <button
                    type="button"
                    className="hrl-cellbtn"
                    disabled={busyId === letter.id}
                    onClick={() => void openPdf(letter)}
                  >
                    فتح PDF
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  })();

  return (
    <section className="hrl-block">
      <div className="hrl-block__h">
        <h2 className="hrl-block__t hrl-h2">
          <FileBadge size={14} /> خطاباتي
        </h2>
      </div>

      <div className="hrl-block__b hrl-block__b--flush">
        {LETTER_TYPES.map((type) => (
          <p className="hrl-row hrl-row--static" key={type}>
            <span className="hrl-row__main">
              <span className="hrl-row__name">{HR_LETTER_TYPE_LABELS[type]}</span>
              <span className="hrl-row__meta">{HR_LETTER_TYPE_HINTS[type]}</span>
            </span>

            {type === SELF_ISSUABLE ? (
              <button
                type="button"
                className="hr-btn hr-btn--sm hr-btn--primary"
                disabled={issuing}
                onClick={() => void issueSelf()}
              >
                {issuing ? 'جارٍ الإصدار…' : 'إصدار'}
              </button>
            ) : (
              <span className="hrl-badge hrl-badge--flat">
                <Lock size={11} /> يصدره المكتب
              </span>
            )}
          </p>
        ))}
      </div>

      <p className="hrl-note">
        تعريف الراتب وشهادة الخبرة وإخلاء الطرف يشهد بها المكتب عنك، ويصدرها مسؤول الموارد
        البشرية. تواصل معه لطلبها.
      </p>

      <div className="hrl-block__b hrl-block__b--flush">{list}</div>
    </section>
  );
};

export default MyLettersCard;
