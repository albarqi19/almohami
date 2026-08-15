import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Users } from 'lucide-react';

import {
  EXCLUSION_ACTIONS,
  EXCLUSION_LABELS,
  fixHref,
  GOSI_SCHEME_LABELS,
  NBSP,
  outOf,
  PRORATION_LABELS,
} from './payrollFormat';
import type { PayrollRunDetail, PayrollRunDetailMeta } from '../../../types/hrPayroll';

/**
 * **المرحلةُ ١ — النطاق**: من يدخل هذا المسير، ومن لا يدخل، ولماذا.
 *
 * ══════ 🔴 لا يُكتب العددُ وحدَه في أيّ موضع (D22) ══════
 * الرأسُ «١٦ من ١٨»، والمستبعَدان **باسميهما وسببيهما ووصلةِ علاجِ كلٍّ منهما**. وشاشةٌ تقول
 * «١٦ منسوباً» تُقرأ سلامةً في مكتبٍ فيه ثمانيةَ عشر — وهو العطلُ الذي لا يصرخ.
 *
 * ══════ وجدولُ المشمولين بلا عمود مال ══════
 * لم يُحتسب شيءٌ بعد. الأعمدةُ هنا **أهليةٌ وسياسة**: نظامُ التأمينات، وأساسُ التجزئة
 * المجمَّد، ووجودُ آيبان. والمالُ يصل في المرحلة الثالثة.
 */

interface Props {
  detail: PayrollRunDetail;
  meta: PayrollRunDetailMeta;
  rebuilding: boolean;
  onRebuild: () => void;
}

export const RunRosterStage: React.FC<Props> = ({ detail, meta, rebuilding, onRebuild }) => {
  const roster = detail.roster;
  const runId = detail.run.id;

  return (
    <>
      <section className="hrl-block" aria-labelledby="roster-h">
        <header className="hrl-block__h">
          <h2 className="hrl-block__t" id="roster-h">
            <Users size={14} /> يدخل المسير
          </h2>
          <span className="hrl-badge hrl-badge--flat">{outOf(roster.included_count, roster.total)}</span>
          {meta.can_prepare && meta.roster_editable && (
            <button type="button" className="hrl-block__a" disabled={rebuilding} onClick={onRebuild}>
              <RefreshCw size={12} /> أعد بناءَ النطاق
            </button>
          )}
        </header>

        <div className="hrl-block__b hrl-block__b--flush">
          {roster.included.length === 0 ? (
            <p className="hrl-hint">لا منسوبَ في نطاق هذا المسير.</p>
          ) : (
            <table className="hrl-table hrp-roster">
              <thead>
                <tr>
                  <th scope="col">المنسوب</th>
                  <th scope="col">القسم</th>
                  <th scope="col">نظامُ التأمينات</th>
                  <th scope="col">أساسُ التجزئة</th>
                  <th scope="col">الآيبان</th>
                </tr>
              </thead>
              <tbody>
                {roster.included.map((line) => (
                  <tr key={line.line_id}>
                    <th scope="row">
                      <span className="hrl-row__name">{line.name}</span>
                      {line.employee_number !== null && (
                        <span className="hrl-row__meta">{line.employee_number}</span>
                      )}
                    </th>
                    <td>{line.department ?? line.job_title}</td>
                    <td>{line.gosi_scheme === null ? '—' : GOSI_SCHEME_LABELS[line.gosi_scheme]}</td>
                    <td>{line.proration_basis === null ? '—' : PRORATION_LABELS[line.proration_basis]}</td>
                    <td>{line.has_iban ? 'مسجَّل' : 'غيرُ مسجَّل'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {roster.included.length > 0 && (
          <div className="hrl-block__b">
            <p className="hrl-hint">
              أعمدةُ هذه المرحلة أهليةٌ وسياسةٌ لا مال: لم يُحتسب ريالٌ بعد، وأساسُ التجزئة
              مجمَّدٌ على كلّ سطرٍ فتبديلُه لاحقاً لا يعيد كتابةَ هذا الشهر.
            </p>
          </div>
        )}
      </section>

      {/* 🔴 المستبعَدون كتلةٌ مستقلّةٌ ظاهرةٌ لا سطرٌ مطويّ. */}
      <section className="hrl-block" aria-labelledby="excluded-h">
        <header className="hrl-block__h">
          <h2 className="hrl-block__t" id="excluded-h">
            لا يدخل المسير
          </h2>
          <span className="hrl-badge hrl-badge--flat">{roster.excluded_count}</span>
        </header>

        <div className="hrl-block__b">
          {roster.excluded.length === 0 ? (
            <p className="hrl-hint">لا مستبعَد — كلُّ منسوبٍ في المكتب داخلٌ في هذا المسير.</p>
          ) : (
            <ul className="hrp-excluded">
              {roster.excluded.map((row) => {
                const href = fixHref(row.fix_target, runId);

                return (
                  <li className="hrp-excluded__i" key={row.profile_id}>
                    <span className="hrp-excluded__n">{row.name_snapshot ?? `#${row.profile_id}`}</span>
                    <span className="hrp-excluded__r">
                      {EXCLUSION_LABELS[row.reason_code] ?? row.reason_code}
                      {row.reason_detail !== null && row.reason_detail !== '' && (
                        <span className="hrp-excluded__d"> — {row.reason_detail}</span>
                      )}
                    </span>
                    <span className="hrp-excluded__a">
                      {href === null ? (
                        EXCLUSION_ACTIONS[row.reason_code]
                      ) : (
                        <Link className="hrl-link" to={href}>
                          {EXCLUSION_ACTIONS[row.reason_code]}{NBSP}<ArrowLeft size={11} />
                        </Link>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="hrl-hint">
            هذه القائمةُ مجمَّدةٌ في المسير بأسمائها ورموزِ أسبابها: من يقرأ مسيرَ هذا الشهر
            بعد سنةٍ يرى من استُبعد ولماذا، لا عدداً مجرَّداً.
          </p>
        </div>
      </section>
    </>
  );
};

export default RunRosterStage;
