import React, { useState } from 'react';
import { CheckCheck, Loader2, XCircle } from 'lucide-react';

import { errorText, money, PROPOSAL_TYPE_LABELS } from './payrollFormat';
import { hrPayrollService } from '../../../services/hrPayrollService';
import type { PayrollProposal, ProposalDecisionPreview, ProposalType } from '../../../types/hrPayroll';

/**
 * 🔴 **القرارُ الجامع** (D11) — نقرةٌ واحدةٌ تبتّ مقترحاتِ نوعٍ واحدٍ بسببٍ واحدٍ وفاعلٍ مسمّى.
 *
 * ══════ لماذا جامعٌ لا فرديّ ══════
 * القرارُ لم ينقص، **النقرُ نقص**: عشرون منسوباً × ثلاثُ وقائع = ستّون نقرةً شهرياً تجعل
 * الطابورَ يُهجَر، وطابورٌ مهجورٌ يعني مسيراً يُعتمَد فوق أسئلةٍ لم تُقرأ.
 *
 * ══════ 🔴 والأثرُ بالريال يُعرَض **قبل** النقر ══════
 * مسؤوليةُ نقرةٍ تغطّي عشرةَ أرقامٍ تقتضي أن يُرى المبلغُ قبلها لا بعدها. و«فارقُ صفر»
 * يُقال صراحةً كذلك: قبولُ إجازةٍ بلا أجرٍ **لا يكتب مالاً** — اليومُ غيرُ المدفوع لا
 * يُنتج بندَ خصمٍ إطلاقاً (D02)، والقبولُ إقرارٌ بصحّة ما احتسبه المحرّك يرفع المانع.
 *
 * ══════ والسببُ إلزاميّ ══════
 * نقرةٌ بلا سببٍ مسجَّلٍ ليست قراراً — وهي بالضبط ما يُطلَب أمام مفتّشٍ أو محكمة.
 */

interface Props {
  runId: number;
  proposals: PayrollProposal[];
  onDecided: () => void;
}

export const ProposalDecideBar: React.FC<Props> = ({ runId, proposals, onDecided }) => {
  const [type, setType] = useState<ProposalType | ''>('');
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState<ProposalDecisionPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = proposals.filter((row) => row.state === 'open');
  const types = Array.from(new Set(open.map((row) => row.proposal_type)));
  const selected = type === '' ? [] : open.filter((row) => row.proposal_type === type);
  const ids = selected.map((row) => row.id);

  const run = async (action: 'accepted' | 'dismissed', asPreview: boolean) => {
    setBusy(true);
    setError(null);

    try {
      const result = await hrPayrollService.decideProposals(runId, {
        proposal_ids: ids,
        action,
        reason,
        preview: asPreview,
      });

      if (asPreview) {
        setPreview(result);
      } else {
        setPreview(null);
        setReason('');
        setType('');
        onDecided();
      }
    } catch (caught) {
      setError(errorText(caught, 'تعذر تنفيذ القرار على المقترحات.'));
    } finally {
      setBusy(false);
    }
  };

  if (open.length === 0) {
    return null;
  }

  return (
    <div className="hrp-decide">
      <div className="hrp-decide__row">
        <label className="hrp-decide__l" htmlFor="decide-type">
          القرار على نوع كامل
        </label>
        <select
          id="decide-type"
          className="hrl-ctrl"
          value={type}
          onChange={(event) => {
            setType(event.target.value as ProposalType | '');
            setPreview(null);
          }}
        >
          <option value="">اختر نوع المقترح…</option>
          {types.map((key) => (
            <option value={key} key={key}>
              {PROPOSAL_TYPE_LABELS[key] ?? key} ({open.filter((row) => row.proposal_type === key).length})
            </option>
          ))}
        </select>
      </div>

      <div className="hrp-decide__row">
        <label className="hrp-decide__l" htmlFor="decide-reason">
          السبب
        </label>
        <input
          id="decide-reason"
          className="hrl-ctrl"
          value={reason}
          maxLength={500}
          placeholder="يسجل باسمك مع القرار"
          onChange={(event) => setReason(event.target.value)}
        />
      </div>

      {preview !== null && (
        <p className="hrl-hint">
          {preview.writes_money
            ? `الأثر قبل النقر: ${money(preview.money_effect)} ر.س على ${preview.count} مقترحاً.`
            : `${preview.count} مقترحاً بلا أثر مالي. اليوم غير المدفوع لا ينتج بند خصم، والقبول إقرار يرفع المانع.`}
        </p>
      )}

      {error !== null && (
        <p className="hrl-flag__t">
          <XCircle size={13} /> {error}
        </p>
      )}

      <div className="hrp-decide__row">
        <button
          type="button"
          className="hr-btn hr-btn--sm"
          disabled={busy || ids.length === 0}
          onClick={() => void run('accepted', true)}
        >
          {busy ? <Loader2 size={13} /> : <CheckCheck size={13} />} اعرض الأثر أولاً
        </button>

        <button
          type="button"
          className="hr-btn hr-btn--sm"
          disabled={busy || ids.length === 0 || reason.trim().length < 5 || preview === null}
          onClick={() => void run('accepted', false)}
        >
          اقبل {ids.length === 0 ? '' : `(${ids.length})`}
        </button>

        <button
          type="button"
          className="hr-btn hr-btn--sm"
          disabled={busy || ids.length === 0 || reason.trim().length < 5}
          onClick={() => void run('dismissed', false)}
        >
          <XCircle size={13} /> اصرف النظر
        </button>
      </div>

      <p className="hrl-hint">
        القبول لا ينشئ بنداً مالياً بنفسه. كل بند مالي يسجل باسم من قرره وسببه.
      </p>
    </div>
  );
};

export default ProposalDecideBar;
