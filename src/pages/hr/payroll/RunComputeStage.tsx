import React from 'react';
import { AlertTriangle, Calculator, Lock, RefreshCw } from 'lucide-react';

import { daysFraction, EMPTY_MARK, lineFlagLabel, money, outOf } from './payrollFormat';
import type { PayrollComputedLine, PayrollLinesMeta, PayrollLinesPayload } from '../../../types/hrPayroll';

/**
 * **المرحلةُ ٣ — الاحتساب**: أرقامٌ كاملةٌ قابلةٌ للفحص، **بلا اعتماد**.
 *
 * ══════ 🔴 سبعةُ أعمدةٍ لا عشرون ══════
 * جدولُ العشرين عموداً بتمريرٍ أفقيٍّ يُفقد عمودَ الاسم، فيقرأ المستخدمُ رقماً بلا صاحب.
 * فالأعمدةُ هنا سبعةٌ وعمودُ الاسم **لاصق**، والتفصيلُ كلُّه في القسيمة الجانبية — تُفتح
 * بنقرِ أيّ رقمٍ في الصفّ ولا تُفتح في مودالٍ يحجب الجدول.
 *
 * ══════ 🔴 والمبالغُ عزلٌ على مستوى الاستعلام ══════
 * بلا `hr.compensation.view` لا يصل صفٌّ واحدٌ من الخادم — لا صفوفٌ مصفَّرة. والشاشةُ تقول
 * ذلك صراحةً بدل أن تعرض فراغاً يُقرأ «لا أحدَ في المسير».
 *
 * ══════ والاحتسابُ فعلٌ متكرّر ══════
 * يُعاد بلا حدٍّ ما دام المسيرُ مسوّدةً أو محتسَباً: البنودُ المشتقّةُ تُجرَف وتُعاد بناؤها،
 * **وقرارُ الإنسان يبقى**. ولذلك الزرُّ «أعد الاحتساب» لا «احسب» بعد أوّل مرّة.
 */

interface Props {
  data: PayrollLinesPayload;
  meta: PayrollLinesMeta;
  selectedLineId: number | null;
  computing: boolean;
  onSelect: (lineId: number) => void;
  onCompute: () => void;
}

export const RunComputeStage: React.FC<Props> = ({
  data,
  meta,
  selectedLineId,
  computing,
  onSelect,
  onCompute,
}) => {
  const totals = data.run.totals;
  const canPrepare = meta.can_prepare === true && meta.editable === true;

  if (! meta.can_view_amounts) {
    return (
      <section className="hrl-block" aria-labelledby="compute-locked-h">
        <header className="hrl-block__h">
          <h2 className="hrl-block__t" id="compute-locked-h">
            <Lock size={14} /> أرقامُ الأفراد محجوبة
          </h2>
        </header>

        <div className="hrl-block__b">
          <p className="hrl-hint">
            أجرُ الفرد حقلٌ حسّاسٌ خلف صلاحيةٍ مستقلّة — ولا تصلك صفوفُ المسير أصلاً، لا مصفَّرةً
            ولا محجوبةَ الحقول. وعددُ المشمولين {meta.lines_count}.
          </p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="hrl-block" aria-labelledby="compute-h">
        <header className="hrl-block__h">
          <h2 className="hrl-block__t" id="compute-h">
            <Calculator size={14} /> الاحتساب
          </h2>
          <span className="hrl-badge hrl-badge--flat">{outOf(data.lines.length, data.run.headcount_total)}</span>
          {canPrepare && (
            <button type="button" className="hrl-block__a" disabled={computing} onClick={onCompute}>
              <RefreshCw size={12} /> {totals === null ? 'احتسب' : 'أعد الاحتساب'}
            </button>
          )}
        </header>

        {totals !== null && (
          <div className="hrl-block__b">
            <div className="hrl-formula">
              <span className="hrl-formula__term hrl-formula__term--static">
                <span className="hrl-formula__k">المستحقات</span>
                <span className="hrl-formula__v" dir="ltr">
                  {money(totals.gross_amount)}
                </span>
              </span>
              <span className="hrl-formula__k">−</span>
              <span className="hrl-formula__term hrl-formula__term--static">
                <span className="hrl-formula__k">الاستقطاعات</span>
                <span className="hrl-formula__v" dir="ltr">
                  {money(totals.deductions_amount)}
                </span>
              </span>
              <span className="hrl-formula__k">=</span>
              <span className="hrl-formula__term hrl-formula__term--sum">
                <span className="hrl-formula__k">الصافي</span>
                <span className="hrl-formula__v" dir="ltr">
                  {money(totals.net_amount)}
                </span>
              </span>
            </div>

            <p className="hrl-hint">
              وتكلفةُ المكتب فوق ذلك {money(totals.employer_cost_amount)} ر.س — حصّةُ صاحب العمل
              لا تُخصَم من أحدٍ ولا تدخل صافياً.
              {totals.cutoff_at === null
                ? ''
                : ' · مبنيٌّ على دفتر الإجازات والحضور حتى لحظة القطع المسجَّلة في المسير.'}
            </p>
          </div>
        )}

        <div className="hrl-block__b hrl-block__b--flush">
          {data.lines.length === 0 ? (
            <p className="hrl-hint">لا سطرَ في هذا المسير — أعد بناءَ النطاق أوّلاً.</p>
          ) : (
            <table className="hrl-table hrp-roster">
              <thead>
                <tr>
                  <th scope="col">المنسوب</th>
                  <th scope="col">أيامٌ مدفوعة</th>
                  <th scope="col">المستحقات</th>
                  <th scope="col">التأمينات</th>
                  <th scope="col">الاستقطاعات</th>
                  <th scope="col">الصافي</th>
                  <th scope="col">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {data.lines.map((line) => (
                  <Row
                    line={line}
                    key={line.line_id}
                    selected={line.line_id === selectedLineId}
                    onSelect={() => onSelect(line.line_id)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {data.lines.length > 0 && (
          <div className="hrl-block__b">
            <p className="hrl-hint">
              انقر أيَّ رقمٍ ليُفتح تفصيلُه في القسيمة الجانبية: كلُّ بندٍ بوعائه ومعامله ومرجع
              مادّته ومن قرّره.
            </p>
          </div>
        )}
      </section>
    </>
  );
};

const Row: React.FC<{ line: PayrollComputedLine; selected: boolean; onSelect: () => void }> = ({
  line,
  selected,
  onSelect,
}) => {
  const blockers = line.blocking_flags ?? [];
  const computed = line.net_amount !== null;

  return (
    <tr className={selected ? 'hrl-row--ok' : undefined} onClick={onSelect}>
      <th scope="row">
        <button type="button" className="hrl-link" onClick={onSelect}>
          {line.name}
        </button>
        {blockers.length > 0 && (
          <span className="hrl-row__meta">
            <AlertTriangle size={11} /> {lineFlagLabel(blockers[0].code)}
          </span>
        )}
      </th>
      <td>{computed ? daysFraction(line.paid_calendar_days, line.period_calendar_days) : EMPTY_MARK}</td>
      <td dir="ltr">{money(line.earnings_amount) ?? EMPTY_MARK}</td>
      <td dir="ltr">{money(line.gosi_ee_amount) ?? EMPTY_MARK}</td>
      <td dir="ltr">{money(line.deductions_amount) ?? EMPTY_MARK}</td>
      <td dir="ltr">{money(line.net_amount) ?? EMPTY_MARK}</td>
      <td>{computed ? (blockers.length > 0 ? 'به مانع' : 'محتسَب') : 'لم يُحتسب'}</td>
    </tr>
  );
};

export default RunComputeStage;
