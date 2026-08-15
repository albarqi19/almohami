import React from 'react';
import { Link } from 'react-router-dom';
import { FileSpreadsheet } from 'lucide-react';

import { fmtDateHuman, outOf, POSTING_STATE_LABELS, RUN_STAGE_LABELS, RUN_TYPE_LABELS } from './payrollFormat';
import type { PayrollRunHead } from '../../../types/hrPayroll';

/**
 * قائمةُ المسيرات — **الرقمُ والمدّةُ والحالةُ والمشمولون وتاريخُ الصرف**.
 *
 * ══════ 🔴 «١٦ من ١٨» في كلّ صفّ ══════
 * عمودُ المشمولين يحمل العددين معاً دائماً (D22). و«١٦» وحدَها تُقرأ سلامةً في مكتبٍ فيه
 * ثمانيةَ عشرَ منسوباً — وهو أخطرُ عطلٍ في هذا الصنف لأنه لا يصرخ.
 *
 * ══════ ولا عمودَ صافٍ في S3 ══════
 * لم يُحتسب شيءٌ بعد، وعمودٌ يعرض `0.00` يقول «الصافي صفر» عن مسيرٍ لم يُحسب. العمودُ
 * يصل في S4 مع الأرقام — وغيابُه الآن صدقٌ لا نقص.
 */

interface Props {
  runs: PayrollRunHead[];
  emptyText: string;
}

export const RunList: React.FC<Props> = ({ runs, emptyText }) => {
  if (runs.length === 0) {
    return <p className="hrl-hint">{emptyText}</p>;
  }

  return (
    <table className="hrl-table">
      <thead>
        <tr>
          <th scope="col">المسير</th>
          <th scope="col">المدّة</th>
          <th scope="col">الحالة</th>
          <th scope="col">المشمولون</th>
          <th scope="col">تاريخُ الصرف</th>
          <th scope="col">المحاسبة</th>
        </tr>
      </thead>
      <tbody>
        {runs.map((run) => (
          <tr key={run.id}>
            <th scope="row">
              <Link className="hrl-link" to={`/hr/payroll/runs/${run.id}`}>
                <FileSpreadsheet size={12} /> {run.run_number ?? `مسوّدة #${run.id}`}
              </Link>
              <span className="hrl-row__meta">{RUN_TYPE_LABELS[run.run_type] ?? run.run_type}</span>
            </th>
            <td>
              {fmtDateHuman(run.period_start)} — {fmtDateHuman(run.period_end)}
            </td>
            <td>
              <span className="hrl-badge hrl-badge--flat">{RUN_STAGE_LABELS[run.stage]}</span>
              {run.self_approved && <span className="hrl-row__meta">اعتمدها معدُّها</span>}
              {run.approver_was_subject && (
                <span className="hrl-row__meta">اعتمدها من صُرف له فيها</span>
              )}
            </td>
            <td>{outOf(run.headcount_included, run.headcount_total)}</td>
            <td>{fmtDateHuman(run.pay_date)}</td>
            <td>{POSTING_STATE_LABELS[run.posting_state]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default RunList;
