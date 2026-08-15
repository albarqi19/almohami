import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, Info, ShieldAlert } from 'lucide-react';

import {
  evidenceText,
  fixHref,
  flagLabel,
  FLAG_HINTS,
  NBSP,
  PROPOSAL_TYPE_LABELS,
  SEVERITY_LABELS,
  severityRank,
} from './payrollFormat';
import ProposalDecideBar from './ProposalDecideBar';
import type { PayrollPreflight, PayrollProposal } from '../../../types/hrPayroll';

/**
 * **المرحلةُ ٢ — الفحصُ القبْليّ**: ما الذي يمنع، وما الذي يجب أن يُقرأ.
 *
 * ══════ ثلاثُ درجاتٍ لا اثنتان ══════
 * **مانعٌ** يمنع الاعتماد · **تنبيهٌ** يمرّ بإقرارٍ مسجَّلٍ باسم المُقرّ · **معلومةٌ** تُعرَض
 * ولا تعترض. ودمجُها في «تنبيهات» يجعل المانعَ يُغلَق بنقرةٍ مع غيره.
 *
 * ══════ 🔴 وحين لا مانع: البلوكُ يقول ذلك صراحةً ══════
 * «فُحص ٢٣ بنداً، ولا مانع» — بلوكٌ لا سطر. شاشةٌ فارغةٌ عند النجاح تُقرأ عطلاً في الفحص لا
 * نتيجةً له، فيعيد المستخدمُ التحميلَ باحثاً عمّا لم يظهر.
 *
 * ══════ والمقترحاتُ تُعرَض ولا تُبَتّ هنا بعد ══════
 * بتُّ المقترح يكتب بنداً ماليّاً، والبندُ لا يُكتب قبل أن يوجد جدولُه وحارسُه في القاعدة
 * (`CHECK (kind <> 'deduction' OR decided_by IS NOT NULL)`). فالزرُّ غائبٌ **وسببُه مكتوب** —
 * لا زرَّ يَعِد بما لا يقع.
 */

interface Props {
  preflight: PayrollPreflight;
  proposals: PayrollProposal[];
  proposalsLoading: boolean;
  decideAvailable: boolean;
  runId: number;
  /** يُعاد جلبُ الطابور والمسير بعد البتّ — القرارُ يغيّر ما يمنع الاعتماد. */
  onDecided: () => void;
}

const TONE_ICON = {
  block: ShieldAlert,
  warn: AlertTriangle,
  info: Info,
} as const;

export const RunPreflightStage: React.FC<Props> = ({
  preflight,
  proposals,
  proposalsLoading,
  decideAvailable,
  runId,
  onDecided,
}) => {
  const flags = [...preflight.flags].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  return (
    <>
      <section className="hrl-block" aria-labelledby="preflight-h">
        <header className="hrl-block__h">
          <h2 className="hrl-block__t" id="preflight-h">
            <CheckCircle2 size={14} /> الفحصُ القبْليّ
          </h2>
          <span className="hrl-badge hrl-badge--flat">
            {preflight.blocking_count > 0 ? `مانعٌ ${preflight.blocking_count}` : 'لا مانع'}
          </span>
        </header>

        <div className="hrl-block__b">
          {preflight.all_clear && flags.length === 0 ? (
            <div className="hrl-state hrl-state--clear">
              <CheckCircle2 size={22} />
              <p className="hrl-state__t">فُحص {preflight.checked_count} بنداً، ولا مانع</p>
              <p className="hrl-state__d">
                لا نقصَ في النطاق، ولا قرارَ معلَّقٌ يمنع. والخطوةُ التالية الاحتساب.
              </p>
            </div>
          ) : (
            <div className="hrl-flags">
              {flags.map((flag) => {
                const Icon = TONE_ICON[flag.severity];
                const href = fixHref(flag.fix_target, runId);

                return (
                  <div className={`hrl-flag hrl-flag--${flag.severity}`} key={`${flag.code}-${flag.severity}`}>
                    {/* 🩸 العددُ في نطاقٍ مستقلٍّ بحاشيةٍ خاصّةٍ به (`hrp-flag__n`): JSX يبتلع
                        المسافةَ التي يفصلها سطرٌ جديد، و`hrl-flag__t` كتلةٌ بلا `gap` —
                        فكان يُطبَع «مستبعَدون من هذا المسير2» ويُقرأ رقماً ملتصقاً بالنصّ. */}
                    <p className="hrl-flag__t">
                      <Icon size={13} /> {flagLabel(flag.code)}
                      <span className="hrp-flag__n" dir="ltr">
                        {flag.count}
                      </span>
                    </p>

                    {FLAG_HINTS[flag.code] !== undefined && (
                      <p className="hrl-flag__hint">{FLAG_HINTS[flag.code]}</p>
                    )}

                    {flag.blocks === 'approval' && (
                      <p className="hrl-flag__hint">يمنع الاعتمادَ وحدَه — الفتحُ والاحتسابُ يمرّان.</p>
                    )}

                    {flag.subjects !== undefined && flag.subjects.length > 0 && (
                      <p className="hrl-flag__hint">
                        {flag.subjects
                          .slice(0, 8)
                          .map((subject) => subject.name ?? subject.title_ar ?? subject.code ?? '')
                          .filter((text) => text !== '')
                          .join(' · ')}
                        {flag.subjects.length > 8 ? ` … +${flag.subjects.length - 8}` : ''}
                      </p>
                    )}

                    {href !== null && (
                      <Link className="hrl-link" to={href}>
                        اذهب إلى موضع العلاج{NBSP}<ArrowLeft size={11} />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <p className="hrl-hint">
            {SEVERITY_LABELS.block}: يمنع الاعتماد · {SEVERITY_LABELS.warn}: يمرّ بإقرارٍ يُسجَّل
            باسم المُقرّ · {SEVERITY_LABELS.info}: يُعرَض ولا يعترض.
          </p>
        </div>
      </section>

      <section className="hrl-block" aria-labelledby="proposals-h">
        <header className="hrl-block__h">
          <h2 className="hrl-block__t" id="proposals-h">
            طابورُ القرارات
          </h2>
          <span className="hrl-badge hrl-badge--flat">{proposals.length}</span>
        </header>

        <div className="hrl-block__b hrl-block__b--flush">
          {proposalsLoading ? (
            <div className="hrl-state hrl-state--loading">
              <span className="hrl-skel hrl-skel--line" />
              <span className="hrl-skel hrl-skel--line" />
            </div>
          ) : proposals.length === 0 ? (
            <p className="hrl-hint">
              لا قرارَ ينتظر — شهرٌ نظيفٌ لا يُنتج مقترحاً واحداً، والصفرُ هنا صامتٌ عن عمد.
            </p>
          ) : (
            <table className="hrl-table">
              <thead>
                <tr>
                  <th scope="col">المنسوب</th>
                  <th scope="col">الواقعة</th>
                  <th scope="col">الدرجة</th>
                  <th scope="col">الدليل</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((proposal) => (
                  <tr key={proposal.id}>
                    <th scope="row">{proposal.name ?? `#${proposal.profile_id}`}</th>
                    <td>{PROPOSAL_TYPE_LABELS[proposal.proposal_type] ?? proposal.proposal_type}</td>
                    <td>
                      <span className="hrl-badge hrl-badge--flat">{SEVERITY_LABELS[proposal.severity]}</span>
                    </td>
                    {/* 🔴 جملةٌ عربيةٌ لا مفاتيحُ لاتينية: «رموزُ القواعد في وجه المستخدم»
                        نمطٌ مرفوضٌ صراحةً — ولغةُ المطوِّر في وجه مديرِ مكتبِ محاماة. */}
                    <td>{evidenceText(proposal.proposal_type, proposal.evidence)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="hrl-block__b">
          <p className="hrl-hint">
            الحضورُ والإجازةُ يقترحان ولا يخصمان: لا يصير المقترحُ مالاً إلا ببندٍ يحمل اسمَ من
            قرّره وتاريخَه وسببَه.
          </p>

          {decideAvailable === false && (
            <p className="hrl-hint">
              ولا يظهر لك زرُّ البتّ: إمّا لأنّ المسيرَ جُمِّد، وإمّا لأنّ الإعدادَ ليس من
              صلاحياتك — ولا يُعرَض زرٌّ يَعِد بما لا يقع.
            </p>
          )}
        </div>

        {/* 🔴 القرارُ الجامع (D11) — وأثرُه بالريال يُعرَض قبل النقر لا بعده. */}
        {decideAvailable && (
          <ProposalDecideBar runId={runId} proposals={proposals} onDecided={onDecided} />
        )}
      </section>
    </>
  );
};

export default RunPreflightStage;
