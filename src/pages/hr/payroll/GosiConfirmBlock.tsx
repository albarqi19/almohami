import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';

import { bp, EMPTY_MARK, fmtDateHuman, GOSI_SCHEME_LABELS, GOSI_SCHEME_HINTS } from './payrollFormat';
import type { GosiConfirmation, GosiScheme } from '../../../types/hrPayroll';

/**
 * 🔴 **تأكيدُ نسب التأمينات** — الفعلُ الذي يرفع حاجزَ الاعتماد، ويُسجَّل باسم صاحبه.
 *
 * ══════ لماذا هذه الكتلةُ موجودةٌ أصلاً ══════
 * النسبةُ الخاطئةُ المثبَّتةُ في الكود لا تُكتشَف عند وقوعها بل عند التقاعد أو التفتيش:
 * الوافدُ حصّتُه **صفر**، وخصمُ تسعةٍ منه احتجازٌ بلا سند؛ والسعوديُّ تسعةٌ وثلاثةُ أرباعٍ
 * ساندٍ لا تسعةٌ وحدَها. فالنسبُ تصل من الخادم **مقترَحةً غيرَ مؤكَّدة**، والاعتمادُ محجوبٌ
 * حتى يقرأها إنسانٌ ويؤكّدها باسمه.
 *
 * ══════ والنسبُ تُعرَض **قبل** الزرّ لا خلفه ══════
 * زرُّ تأكيدٍ بلا رقمٍ مقروءٍ فوقه ليس توقيعاً بل نقرةً. فالجدولُ كاملٌ ظاهر: كلُّ نظامٍ
 * وحصّتاه، وما لم يُنمذَج بعدُ **مكتوبٌ صراحةً** لا مسكوتٌ عنه.
 */

const SCHEME_ORDER: GosiScheme[] = ['saudi', 'non_saudi', 'exempt'];

interface Props {
  gosi: GosiConfirmation;
  canConfirm: boolean;
  submitting: boolean;
  error: string | null;
  onConfirm: (note?: string) => void;
}

export const GosiConfirmBlock: React.FC<Props> = ({ gosi, canConfirm, submitting, error, onConfirm }) => {
  const [note, setNote] = useState('');
  const schemes = SCHEME_ORDER.filter((scheme) => gosi.schemes[scheme] !== undefined);

  return (
    <section className="hrl-block" aria-labelledby="gosi-confirm-h">
      <header className="hrl-block__h">
        <h2 className="hrl-block__t" id="gosi-confirm-h">
          <ShieldCheck size={14} /> نسبُ التأمينات الاجتماعية
        </h2>
        <span className={`hrl-badge hrl-badge--flat${gosi.confirmed ? '' : ' hrl-chip--warn'}`}>
          {gosi.confirmed ? 'مؤكَّدة' : 'بانتظار التأكيد'}
        </span>
      </header>

      <div className="hrl-block__b hrl-block__b--flush">
        <table className="hrl-table">
          <caption className="hrl-sr">النسب المقترحة لكل نظام تأمينات بنقاط الأساس</caption>
          <thead>
            <tr>
              <th scope="col">النظام</th>
              <th scope="col">معاشاتُ الموظف</th>
              <th scope="col">ساندُ الموظف</th>
              <th scope="col">معاشاتُ المكتب</th>
              <th scope="col">ساندُ المكتب</th>
              <th scope="col">الأخطارُ المهنية</th>
            </tr>
          </thead>
          <tbody>
            {schemes.map((scheme) => {
              const rates = gosi.schemes[scheme];

              return (
                <tr key={scheme}>
                  <th scope="row">
                    <span className="hrl-row__name">{GOSI_SCHEME_LABELS[scheme]}</span>
                    <span className="hrl-row__meta">{GOSI_SCHEME_HINTS[scheme]}</span>
                  </th>
                  <td>
                    <span className="hrl-ledger__num" dir="ltr">{bp(rates?.ee_pension_bp)}</span>
                  </td>
                  <td>
                    <span className="hrl-ledger__num" dir="ltr">{bp(rates?.ee_saned_bp)}</span>
                  </td>
                  <td>
                    <span className="hrl-ledger__num" dir="ltr">{bp(rates?.er_pension_bp)}</span>
                  </td>
                  <td>
                    <span className="hrl-ledger__num" dir="ltr">{bp(rates?.er_saned_bp)}</span>
                  </td>
                  <td>
                    <span className="hrl-ledger__num" dir="ltr">{bp(rates?.er_hazards_bp)}</span>
                  </td>
                </tr>
              );
            })}
            {schemes.length === 0 && (
              <tr>
                <td colSpan={6}>{EMPTY_MARK} لم تصل نسبٌ مقترحةٌ من الخادم.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ما لم يُنمذَج بعدُ يُقال — لا يُترك ليُكتشَف بعد أوّل قسيمة. */}
      {!gosi.cohorts_modelled && (
        <div className="hrl-flag hrl-flag--info">
          <p className="hrl-flag__t">
            <AlertTriangle size={13} /> شرائحُ الالتحاق غيرُ مُنمذَجةٍ في هذه النسخة
          </p>
          <p className="hrl-flag__hint">
            النسبُ أعلاه واحدةٌ لمن التحق قبل التعديل ولمن التحق بعده. حقلُ الشريحة موجودٌ على
            ملفّ الأجر ولا يقرؤه شيءٌ بعد — فإن كان في مكتبك من تختلف نسبتُه، راجعه يدوياً قبل
            أن تؤكّد.
          </p>
        </div>
      )}

      {gosi.confirmed ? (
        <div className="hrl-block__b">
          <p className="hrl-note">
            <CheckCircle2 size={13} /> أكّدها {gosi.confirmed_by ?? 'مستخدمٌ محذوف'} في{' '}
            {fmtDateHuman(gosi.confirmed_at)}. وتغييرُ النسب لاحقاً يُعيد الحاجزَ حتى تُؤكَّد
            النسخةُ الجديدة.
          </p>
        </div>
      ) : (
        <div className="hrl-block__b">
          <p className="hrl-hint">
            هذه بياناتٌ تُراجَع قانونياً: قارئها من مصدرها الرسميّ قبل التأكيد. والتأكيدُ
            يُسجَّل باسمك وتاريخِه، ويرفع الحاجزَ عن اعتماد المسيرات.
          </p>

          <label className="hrl-fset" htmlFor="gosi-note">
            <span className="hrl-fset__t">مرجعُ المراجعة (اختياريّ)</span>
            <input
              id="gosi-note"
              className="hrl-search"
              type="text"
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="مثال: طُوبقت مع كشف الاشتراك الصادر عن المؤسسة"
            />
          </label>

          {error !== null && (
            <p className="hrl-flag hrl-flag--block" role="alert">
              {error}
            </p>
          )}

          {/* الزرُّ ظاهرٌ معطَّلاً وتحته سببُه — إخفاؤه يصنع سؤالاً، وإظهارُه يقتله. */}
          <button
            type="button"
            className="hr-btn hr-btn--primary hr-btn--sm"
            disabled={!canConfirm || submitting}
            onClick={() => onConfirm(note.trim() === '' ? undefined : note.trim())}
          >
            {submitting ? 'يُسجَّل…' : 'أؤكّد هذه النسب باسمي'}
          </button>

          {!canConfirm && (
            <p className="hrl-hint">
              التأكيدُ بيد من يملك اعتمادَ المسيرات — فمن يرفع الحاجزَ هو من يوقّع على الصرف.
            </p>
          )}
        </div>
      )}
    </section>
  );
};

export default GosiConfirmBlock;
