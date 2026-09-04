import React from 'react';
import { GitCompare, Lock, UserMinus, UserPlus } from 'lucide-react';

import { EMPTY_MARK, fmtDateHuman, money, whyRows } from './payrollFormat';
import type { PayrollDrift, PayrollDriftMeta, PayrollDriftRow } from '../../../types/hrPayroll';

/**
 * **المرحلةُ ٤ — المراجعة**: ما تغيّر عن المسير السابق، **ومعه سببُ كلّ فرق**.
 *
 * ══════ لماذا الفرقُ لا الأرقام ══════
 * مراجعةُ عشرين سطراً رقماً رقماً لا تقع في الواقع؛ يمرّ المديرُ على الجدول ويعتمد. والمراجعةُ
 * التي تُجدي تجيب سؤالاً واحداً: **ما الذي تغيّر عن الشهر الماضي ولماذا؟** — فالفروقُ مرتَّبةٌ
 * بالمقدار المطلق، ولكلٍّ سببُه مبنيّاً من المؤشّرات.
 *
 * ══════ 🔴 ومَن غاب عن المسير أخطرُ ممّن تغيّر رقمُه ══════
 * موظفٌ كان في مسير الشهر الماضي وليس في هذا **لا يصرخ**: لا سطرَ له ليُقرأ. فله كتلةٌ
 * مستقلّةٌ ظاهرةٌ باسمه — وهو أخطرُ فرقٍ وأقلُّه ظهوراً في الأنظمة كلِّها.
 *
 * ══════ وحين لا فرق: الشاشةُ تقول ذلك صراحةً ══════
 * جدولٌ فارغٌ بلا جملةٍ يُقرأ عطلاً في الجلب لا نتيجةً له.
 */

interface Props {
  data: PayrollDrift;
  meta: PayrollDriftMeta;
  selectedLineId: number | null;
  onSelect: (lineId: number) => void;
}

export const RunReviewStage: React.FC<Props> = ({ data, meta, selectedLineId, onSelect }) => {
  if (! meta.can_view_amounts) {
    return (
      <section className="hrl-block" aria-labelledby="review-locked-h">
        <header className="hrl-block__h">
          <h2 className="hrl-block__t" id="review-locked-h">
            <Lock size={14} /> فروق الأفراد محجوبة
          </h2>
        </header>
        <div className="hrl-block__b">
          <p className="hrl-hint">مقارنة الأجور تكشف مبالغ الأفراد، وهي خلف صلاحية مستقلة.</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="hrl-block" aria-labelledby="review-h">
        <header className="hrl-block__h">
          <h2 className="hrl-block__t" id="review-h">
            <GitCompare size={14} /> ما تغير عن المسير السابق
          </h2>
          {data.previous_run !== null && (
            <span className="hrl-badge hrl-badge--flat">
              مقابل {data.previous_run.run_number ?? fmtDateHuman(data.previous_run.period_start)}
            </span>
          )}
        </header>

        <div className="hrl-block__b">
          {data.previous_run === null ? (
            <p className="hrl-hint">
              لا يوجد مسير سابق لهذا المكتب، فلا فرق للمقارنة. ويراجع أول مسير بأرقامه لا بفروقه.
            </p>
          ) : data.rows.length === 0 ? (
            <p className="hrl-hint">
              لا فرق في أي سطر: {data.compared} سطراً صافيها مطابق للمسير السابق تماماً.
            </p>
          ) : (
            <p className="hrl-hint">
              تغير {data.changed} من {data.compared} سطراً، مرتبة بالمقدار المطلق، ولكل سطر سببه.
            </p>
          )}
        </div>

        {data.rows.length > 0 && (
          <div className="hrl-block__b hrl-block__b--flush">
            <ul className="hrl-drift">
              {data.rows.map((row) => (
                <DriftRow
                  row={row}
                  key={row.line_id}
                  selected={row.line_id === selectedLineId}
                  onSelect={() => onSelect(row.line_id)}
                />
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 🔴 مَن دخل ومَن خرج — أخطرُ فرقٍ وأقلُّه ظهوراً. */}
      {(data.joined.length > 0 || data.left.length > 0) && (
        <section className="hrl-block" aria-labelledby="review-moves-h">
          <header className="hrl-block__h">
            <h2 className="hrl-block__t" id="review-moves-h">
              من دخل ومن خرج
            </h2>
          </header>

          <div className="hrl-block__b">
            {data.joined.length > 0 && (
              <ul className="hrp-excluded">
                {data.joined.map((row) => (
                  <li className="hrp-excluded__i" key={`joined-${row.profile_id ?? row.name}`}>
                    <span className="hrp-excluded__n">
                      <UserPlus size={12} /> {row.name}
                    </span>
                    <span className="hrp-excluded__r">
                      دخل المسير لأول مرة · صافيه <span dir="ltr">{money(row.net_amount) ?? EMPTY_MARK}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {data.left.length > 0 && (
              <ul className="hrp-excluded">
                {data.left.map((row) => (
                  <li className="hrp-excluded__i" key={`left-${row.profile_id}`}>
                    <span className="hrp-excluded__n">
                      <UserMinus size={12} /> {row.name}
                    </span>
                    <span className="hrp-excluded__r">
                      كان في المسير السابق وصافيه{' '}
                      <span dir="ltr">{money(row.previous_net_amount) ?? EMPTY_MARK}</span> وليس في هذا
                    </span>
                    <span className="hrp-excluded__a">
                      راجع أسباب الاستبعاد في مرحلة المشمولين. الغياب لا يظهر تلقائياً.
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </>
  );
};

const DriftRow: React.FC<{ row: PayrollDriftRow; selected: boolean; onSelect: () => void }> = ({
  row,
  selected,
  onSelect,
}) => {
  const down = String(row.delta).startsWith('-');
  const reasons = whyRows(row.reasons);

  return (
    <li className={`hrl-drift__i${down ? ' hrl-drift--danger' : ''}${selected ? ' hrl-row--ok' : ''}`}>
      <button type="button" className="hrp-drift__hit" onClick={onSelect}>
        <span className="hrl-row__name">{row.name}</span>
        <span className="hrl-drift__n" dir="ltr">
          {money(row.delta)}
        </span>
      </button>

      <span className="hrp-drift__from">
        من <span dir="ltr">{money(row.previous_net_amount) ?? EMPTY_MARK}</span> إلى{' '}
        <span dir="ltr">{money(row.net_amount) ?? EMPTY_MARK}</span>
      </span>

      {reasons.length === 0 ? (
        <span className="hrp-drift__why">فرق بلا سبب مسجل. افتح القسيمة لتفصيل بنودها.</span>
      ) : (
        <ul className="hra-why">
          {reasons.map((reason, index) => (
            <li className="hra-why__i" key={`${row.line_id}-${index}`}>
              <span className="hra-why__m">{reason.mark === 'down' ? '✖' : reason.mark === 'up' ? '✔' : '•'}</span>
              {reason.text}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};

export default RunReviewStage;
