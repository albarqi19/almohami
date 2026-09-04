import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, Lock, ShieldAlert, ShieldCheck } from 'lucide-react';

import { hrPayrollService, PayrollActionError } from '../../../services/hrPayrollService';
import {
  APPROVAL_DENIAL_HINTS,
  approvalFixHref,
  errorText,
  fmtDateHuman,
  money,
  NBSP,
  outOf,
  POSTING_STATE_LABELS,
  RUN_STAGE_LABELS,
  SINGLE_APPROVER_ACK_TEXT,
  SUBJECT_APPROVER_ACK_EFFECT,
  SUBJECT_APPROVER_ACK_TEXT,
} from './payrollFormat';
import type { PayrollRunHead, PayrollRunTotals } from '../../../types/hrPayroll';

/**
 * **المرحلةُ ٥ — الاعتماد**: الفعلُ الذي يحوّل أرقاماً مراجَعةً إلى مستندٍ لا يتحوّر.
 *
 * ══════ 🔴 لماذا خطوةٌ قائمةٌ بذاتها لا زرٌّ في ذيل المراجعة ══════
 * خلطُ «احسب» بـ«اعتمد» أشيعُ عطلٍ تصميميٍّ في هذا الصنف: يجعل الفعلَ الذي لا رجعةَ فيه
 * يقع بنقرةٍ ظنّها صاحبُها إعادةَ حساب. فالاعتمادُ خطوةٌ يُدخَل إليها قصداً، وتحتها
 * **تأكيدٌ يسمّي ما سيُجمَّد بالعدد والمبلغ** قبل النقر لا بعده.
 *
 * ══════ 🔴 أربعةُ أبوابٍ لأربعة ردود — ولذلك يلزم رمزُ الخادم لا رسالتُه ══════
 * · `approver_is_subject` — **بابُ إقرارٍ يُطبَع أثرُه على القسيمة**: من له قسيمةٌ في المسير
 *   يعتمده بإقرارٍ صريحٍ يُسجَّل بنصّه واسم مُقرّه، وتُطبَع عبارتُه على كلّ قسيمةٍ فيه. وكان
 *   قفلاً تامّاً حتى شلَّ الواقعَ الأشيعَ: المديرُ هو المالكُ وهو على كشف الرواتب. وشرطُ فتحه
 *   بلفظ المالك: «الغرضُ من القاعدة ليس المنع، بل أن يعلم من يقرأ القسيمة أنّ من اعتمدها هو
 *   من صُرف له».
 * · `single_approver_ack_required` — **بابُ إقرارٍ ظاهرٌ موسوم**: مكتبٌ بمعتمِدٍ واحدٍ لا
 *   يُشلّ، لكنّ الاستثناءَ يُوقَّع باسمه ويُسجَّل نصُّه.
 * · `preparer_cannot_approve` — **بابٌ إلى شخصٍ آخر**: في المكتب معتمِدٌ سواه، فلا إقرارَ
 *   يُغني عن الإحالة إليه.
 * · `gosi_rates_unconfirmed` — **بابٌ إلى شاشةٍ أخرى**: نقصُ بيانٍ لا نقصُ صفة، وعلاجُه
 *   شاشةُ القواعد لا شخصٌ آخر.
 *
 * ══════ 🔴 والإقراران قد يجتمعان في شخصٍ واحدٍ — فيُعرَضان في لوحٍ واحد ══════
 * «لا معتمِدَ آخرَ في المكتب» و«يُصرف لي في هذا المسير» حالتان مختلفتان بنصّين متمايزين.
 * والخادمُ يردّ `acks_required` فتُعرَض الوثيقتان معاً؛ ولولاها لوقّع المستخدمُ الأولى ثمّ
 * رُدَّ ثانيةً، فقرأ الردَّ الثانيَ على أنّ توقيعَه لم يصل.
 *
 * ══════ والحالاتُ الأربع متمايزة ══════
 * محتسَبٌ ينتظر التوقيع · معتمَدٌ يعرض ما جُمِّد (فلا يُظنّ أنّه لم يُعتمد) · مقفلٌ بلا
 * صلاحية · وخطأٌ برسالة الخادم وسطرِ «ما العمل» تحتها.
 */

interface Props {
  run: PayrollRunHead;
  totals: PayrollRunTotals | null;
  canViewAmounts: boolean;
  canApprove: boolean;
  /** عددُ الأسطر كما وصل من جدول الاحتساب — لا `headcount_included` وحدَه. */
  linesCount: number;
  onApproved: () => void;
}

type Phase = 'idle' | 'confirm' | 'ack';

/** المراحلُ التي وقع فيها الاعتمادُ فعلاً — بعدها لا تُعرَض دعوةٌ إلى توقيعٍ وقع. */
const APPROVED_STAGES = ['approved', 'paying', 'paid', 'published'];

/** رمزا الإقرارين كما يردّهما الخادمُ في `acks_required` — الرمزُ عقدٌ لا نصٌّ يتحسّن. */
const ACK_SUBJECT = 'subject_approver_ack';

const ACK_SINGLE = 'single_approver_ack';

/**
 * ما يطلبه الخادمُ من إقرارات — **من الحمولة أوّلاً**، ومن الرمز احتياطاً.
 *
 * 🔴 والاحتياطُ ضرورةٌ لا تجمّل: خادمٌ أقدمُ (أو ردٌّ عَبَر وسيطاً جرّده من `data`) يترك
 * اللوحَ بلا مربّعٍ واحد، فيرى المستخدمُ رسالةَ رفضٍ وزرّاً يُعيد الرفضَ نفسَه بلا مخرج.
 */
function acksRequired(caught: unknown, code: string | null): string[] {
  const raw = caught instanceof PayrollActionError ? caught.data?.acks_required : undefined;

  if (Array.isArray(raw)) {
    const codes = raw.filter((entry): entry is string => typeof entry === 'string');

    if (codes.length > 0) return codes;
  }

  if (code === 'approver_is_subject') return [ACK_SUBJECT];
  if (code === 'single_approver_ack_required') return [ACK_SINGLE];

  return [];
}

export const RunApproveStage: React.FC<Props> = ({
  run,
  totals,
  canViewAmounts,
  canApprove,
  linesCount,
  onApproved,
}) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [busy, setBusy] = useState(false);
  const [singleAck, setSingleAck] = useState(false);
  const [subjectAck, setSubjectAck] = useState(false);
  const [asked, setAsked] = useState<string[]>([]);
  const [denial, setDenial] = useState<{ code: string | null; message: string } | null>(null);
  const [doneText, setDoneText] = useState<string | null>(null);

  const approved = APPROVED_STAGES.includes(run.stage);

  const reset = () => {
    setSingleAck(false);
    setSubjectAck(false);
    setAsked([]);
  };

  /**
   * 🔴 يُرسَل من الإقرارات ما طُلب فقط — ولا يُرسَل ما لم يُطلَب.
   *
   * إرسالُ الاثنين دائماً «احتياطاً» يكتب في سجلّ المسير إقراراً لم يقرأه أحدٌ ولم يلزم،
   * ويُطبَع أثرُه على قسائم لا تخصّه. ومن لا يلزمه إقرارٌ يعتمد **بلا احتكاكٍ أصلاً**.
   */
  const submit = async (acks: string[]) => {
    setBusy(true);
    setDenial(null);

    try {
      const result = await hrPayrollService.approveRun(run.id, {
        ...(acks.includes(ACK_SINGLE)
          ? { single_approver_acknowledged: true, acknowledgement_text: SINGLE_APPROVER_ACK_TEXT }
          : {}),
        ...(acks.includes(ACK_SUBJECT)
          ? {
              subject_approver_acknowledged: true,
              subject_acknowledgement_text: SUBJECT_APPROVER_ACK_TEXT,
            }
          : {}),
      });

      setDoneText(result.message);
      setPhase('idle');
      reset();
      onApproved();
    } catch (caught) {
      const code = caught instanceof PayrollActionError ? caught.code : null;
      const required = acksRequired(caught, code);

      setDenial({ code, message: errorText(caught, 'تعذر الاعتماد.') });
      setAsked(required);
      setPhase(required.length > 0 ? 'ack' : 'idle');
    } finally {
      setBusy(false);
    }
  };

  /** الزرُّ معطَّلٌ حتى يُؤشَّر **كلُّ** ما طُلب — والتأشيرُ إقرارٌ يُقرأ لا خطوةٌ تُتخطّى. */
  const ackReady =
    asked.length > 0 &&
    asked.every((code) => {
      if (code === ACK_SUBJECT) return subjectAck;
      if (code === ACK_SINGLE) return singleAck;

      return false;
    });

  // ── ① معتمَدٌ سلفاً: الشاشةُ تقول ما جُمِّد، ولا تدعو إلى توقيعٍ وقع ──
  if (approved) {
    return (
      <section className="hrl-block" aria-labelledby="approve-done-h">
        <header className="hrl-block__h">
          <h2 className="hrl-block__t" id="approve-done-h">
            <ShieldCheck size={14} /> هذا المسير معتمَد
          </h2>
          <span className="hrl-badge hrl-badge--flat">{RUN_STAGE_LABELS[run.stage]}</span>
        </header>

        <div className="hrl-block__b">
          {doneText !== null && (
            <div className="hrl-state hrl-state--clear">
              <CheckCircle2 size={22} />
              <p className="hrl-state__t">{doneText}</p>
            </div>
          )}

          <dl className="hrl-kv">
            <dt>رقم المسير</dt>
            <dd dir="ltr">{run.run_number ?? '—'}</dd>
            <dt>تاريخ الاعتماد</dt>
            <dd>{run.approved_at === null ? '—' : fmtDateHuman(run.approved_at.slice(0, 10))}</dd>
            <dt>القسائم المقفلة</dt>
            <dd>{outOf(run.headcount_included, run.headcount_total)}</dd>
            <dt>القيد المحاسبي</dt>
            <dd>{POSTING_STATE_LABELS[run.posting_state]}</dd>
          </dl>

          {run.self_approved && (
            <p className="hrl-flag hrl-flag--warn" role="status">
              <span className="hrl-flag__t">
                <AlertTriangle size={13} /> اعتمدها من أعدها
              </span>
              <span className="hrl-flag__hint">
                لم يكن في المكتب من يملك صلاحية الاعتماد سواه، فتم اعتماد المسير بإقرار صريح مسجل باسمه.
              </span>
            </p>
          )}

          {/* 🔴 وسمٌ ثانٍ مستقلٌّ يظهر بجوار الأوّل متى اجتمعا — لا يبتلع أحدُهما الآخر. */}
          {run.approver_was_subject && (
            <p className="hrl-flag hrl-flag--warn" role="status">
              <span className="hrl-flag__t">
                <AlertTriangle size={13} /> اعتمدها من صرف له فيها
              </span>
              <span className="hrl-flag__hint">
                لمن اعتمد هذا المسير{run.approver_name === null ? '' : ` (${run.approver_name})`}{' '}
                قسيمة فيه، وقد أكد ذلك صراحة. وتطبع العبارة على كل قسيمة في المسير.
              </span>
            </p>
          )}

          <p className="hrl-hint">
            القسائم والبنود مقفلة الآن: لا يمكن إضافة بند ولا حذفه ولا إعادة الاحتساب فوق هذا
            المسير. والتصحيح بعد الاعتماد يتم باستبداله بمسير تصحيحي، ويبقى الأصل كما صرف.
          </p>
        </div>
      </section>
    );
  }

  // ── ② مقفل: لا صلاحيةَ اعتماد ──
  if (! canApprove) {
    return (
      <section className="hrl-block" aria-labelledby="approve-locked-h">
        <header className="hrl-block__h">
          <h2 className="hrl-block__t" id="approve-locked-h">
            <Lock size={14} /> الاعتماد ليس من صلاحياتك
          </h2>
        </header>

        <div className="hrl-block__b">
          <p className="hrl-hint">
            الاعتماد صلاحية مستقلة عن إعداد المسير وعن قراءته. والمسير الآن{' '}
            {RUN_STAGE_LABELS[run.stage]}. ويعتمده من يملك هذه الصلاحية في المكتب.
          </p>
        </div>
      </section>
    );
  }

  // ── ③ لم يُحتسب بعد: لا تُعرَض دعوةٌ إلى توقيعٍ على أرقامٍ لا توجد ──
  if (run.stage !== 'calculated') {
    return (
      <section className="hrl-block" aria-labelledby="approve-early-h">
        <header className="hrl-block__h">
          <h2 className="hrl-block__t" id="approve-early-h">
            <ShieldAlert size={14} /> لا يمكن اعتماد مسير قبل احتسابه
          </h2>
          <span className="hrl-badge hrl-badge--flat">{RUN_STAGE_LABELS[run.stage]}</span>
        </header>

        <div className="hrl-block__b">
          <p className="hrl-hint">
            احتسب المسير، ثم راجع فروقه، ثم ارجع إلى هذه الخطوة.
          </p>

          <Link className="hrl-link" to={`/hr/payroll/runs/${run.id}?stage=compute`}>
            اذهب إلى الاحتساب{NBSP}<ArrowLeft size={11} />
          </Link>
        </div>
      </section>
    );
  }

  // ── ④ فارغ: مسيرٌ محتسَبٌ بلا سطرٍ واحد ──
  if (linesCount === 0 && canViewAmounts) {
    return (
      <section className="hrl-block" aria-labelledby="approve-empty-h">
        <header className="hrl-block__h">
          <h2 className="hrl-block__t" id="approve-empty-h">
            <ShieldAlert size={14} /> لا يوجد سطر في هذا المسير
          </h2>
        </header>

        <div className="hrl-block__b">
          <p className="hrl-hint">
            لا يمكن اعتماد مسير بلا قسيمة واحدة. أعد بناء قائمة المشمولين، ثم احتسب قبل الاعتماد.
          </p>

          <Link className="hrl-link" to={`/hr/payroll/runs/${run.id}?stage=roster`}>
            اذهب إلى المشمولين{NBSP}<ArrowLeft size={11} />
          </Link>
        </div>
      </section>
    );
  }

  const fixHref = denial === null ? null : approvalFixHref(denial.code, run.id);
  const hint = denial === null || denial.code === null ? null : APPROVAL_DENIAL_HINTS[denial.code];

  return (
    <section className="hrl-block" aria-labelledby="approve-h">
      <header className="hrl-block__h">
        <h2 className="hrl-block__t" id="approve-h">
          <ShieldCheck size={14} /> الاعتماد
        </h2>
        <span className="hrl-badge hrl-badge--flat">{outOf(linesCount, run.headcount_total)}</span>
      </header>

      <div className="hrl-block__b">
        <p className="hrl-hint">
          الاعتماد فعل واحد لا رجعة فيه: يسند رقم المسير وأرقام القسائم، ويقفل كل سطر وكل بند،
          ويكتب مطالبات الأيام التي تمنع دفع يوم مرتين، ويقيد المحاسبة. وتتم كلها معا أو لا يتم
          شيء منها.
        </p>

        {canViewAmounts && totals !== null && (
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
        )}

        {! canViewAmounts && (
          <p className="hrl-hint">
            ومبالغ الأفراد محجوبة عنك بصلاحية مستقلة. يظهر لك عدد القسائم دون المبالغ، وأنت
            توقع على مجاميع لا تراها.
          </p>
        )}
      </div>

      {/* 🔴 التأكيدُ يسمّي ما سيُجمَّد بالعدد والتاريخ — لا «هل أنت متأكّد؟». */}
      {phase === 'confirm' && (
        <div className="hrl-block__b hrp-approve">
          <p className="hrl-note">
            <ShieldAlert size={13} /> ما الذي سيتم إقفاله الآن
          </p>

          <ol className="hrp-approve__list">
            <li className="hrp-approve__i">
              <span className="hrp-approve__s" dir="ltr">
                1
              </span>
              <span className="hrp-approve__k">
                {outOf(linesCount, run.headcount_total)} قسيمة عن المدة{' '}
                {fmtDateHuman(run.period_start)} — {fmtDateHuman(run.period_end)}: يسند لكل
                قسيمة رقمها، وتقفل بنودها فلا يمكن تعديلها ولا حذفها.
              </span>
            </li>
            <li className="hrp-approve__i">
              <span className="hrp-approve__s" dir="ltr">
                2
              </span>
              <span className="hrp-approve__k">
                تسجل أيام المدة باسم كل موظف، فلا يتكرر دفع اليوم نفسه أو خصمه في مسير آخر.
              </span>
            </li>
            <li className="hrp-approve__i">
              <span className="hrp-approve__s" dir="ltr">
                3
              </span>
              <span className="hrp-approve__k">
                يكتب القيد المحاسبي، أو تظهر على المسير حالة «غير مقيد محاسبيا» إذا كانت
                المحاسبة معطلة في المكتب. وحالته الآن:{' '}
                {POSTING_STATE_LABELS[run.posting_state]}.
              </span>
            </li>
            <li className="hrp-approve__i">
              <span className="hrp-approve__s" dir="ltr">
                4
              </span>
              <span className="hrp-approve__k">
                تاريخ الصرف {fmtDateHuman(run.pay_date)}. والتصحيح بعد الاعتماد يتم باستبداله
                بمسير تصحيحي، لا بتعديل هذا المستند.
              </span>
            </li>
          </ol>
        </div>
      )}

      {/* 🔴 بابُ الإقرار — ظاهرٌ موسومٌ لا صامت، ولا يُرسَل إلا بعد قراءة نصّه. ومن اجتمعت
          فيه الحالتان يقرأ الوثيقتين المتمايزتين في اللوح نفسِه ويؤشّرهما معاً. */}
      {phase === 'ack' && (
        <div className="hrl-block__b hrp-approve">
          {asked.includes(ACK_SUBJECT) && (
            <>
              <label className="hrp-approve__ack" htmlFor="subject-approver-ack">
                <input
                  id="subject-approver-ack"
                  type="checkbox"
                  checked={subjectAck}
                  onChange={(event) => setSubjectAck(event.target.checked)}
                />
                <span className="hrp-approve__ackt">{SUBJECT_APPROVER_ACK_TEXT}</span>
              </label>

              {/* 🔴 ما سيقع — قبل التأشير لا بعده. */}
              <p className="hrl-hint">
                {SUBJECT_APPROVER_ACK_EFFECT} ويسجل نص الإقرار باسمك وتاريخه ورقم قسيمتك
                في سجل المسير.
              </p>
            </>
          )}

          {asked.includes(ACK_SINGLE) && (
            <>
              <label className="hrp-approve__ack" htmlFor="single-approver-ack">
                <input
                  id="single-approver-ack"
                  type="checkbox"
                  checked={singleAck}
                  onChange={(event) => setSingleAck(event.target.checked)}
                />
                <span className="hrp-approve__ackt">{SINGLE_APPROVER_ACK_TEXT}</span>
              </label>

              <p className="hrl-hint">
                يسجل نص هذا الإقرار باسمك وتاريخه في سجل المسير، وتظهر على المسير حالة
                «اعتمدها من أعدها».
              </p>
            </>
          )}
        </div>
      )}

      {denial !== null && (
        <div className={`hrl-flag hrl-flag--${denial.code === 'gosi_rates_unconfirmed' ? 'warn' : 'block'}`} role="alert">
          <p className="hrl-flag__t">
            <ShieldAlert size={13} /> {denial.message}
          </p>

          {hint !== undefined && hint !== null && <p className="hrl-flag__hint">{hint}</p>}

          {fixHref !== null && (
            <Link className="hrl-link" to={fixHref}>
              اذهب إلى موضع الإصلاح{NBSP}<ArrowLeft size={11} />
            </Link>
          )}
        </div>
      )}

      {/* 🔴 شريطُ الأزرار **لا يُنزَع** بعد اليوم: لكلّ ردٍّ بابُه، ونزعُ الشريط كلِّه يترك
          رسالةَ رفضٍ بلا فعلٍ يليها. */}
      <div className="hrl-block__b">
        <div className="hrp-approve__act">
          {phase === 'idle' && (
              <button
                type="button"
                className="hr-btn hr-btn--primary hr-btn--sm"
                disabled={busy}
                onClick={() => {
                  setDenial(null);
                  setPhase('confirm');
                }}
              >
                <ShieldCheck size={13} /> اعتمد المسير
              </button>
            )}

            {phase === 'confirm' && (
              <>
                <button
                  type="button"
                  className="hr-btn hr-btn--primary hr-btn--sm"
                  disabled={busy}
                  onClick={() => void submit([])}
                >
                  {busy ? 'جارٍ الاعتماد…' : 'أعتمد الآن ولا رجعة'}
                </button>
                <button
                  type="button"
                  className="hr-btn hr-btn--sm"
                  disabled={busy}
                  onClick={() => setPhase('idle')}
                >
                  رجوع
                </button>
              </>
            )}

            {phase === 'ack' && (
              <>
                <button
                  type="button"
                  className="hr-btn hr-btn--primary hr-btn--sm"
                  disabled={busy || ! ackReady}
                  onClick={() => void submit(asked)}
                >
                  {busy
                    ? 'جارٍ الاعتماد…'
                    : asked.length > 1
                      ? 'أعتمد بالإقرارين المسجلين'
                      : 'أعتمد بالإقرار المسجل'}
                </button>
                <button
                  type="button"
                  className="hr-btn hr-btn--sm"
                  disabled={busy}
                  onClick={() => {
                    setPhase('idle');
                    reset();
                    setDenial(null);
                  }}
                >
                  رجوع
                </button>
              </>
            )}
        </div>
      </div>
    </section>
  );
};

export default RunApproveStage;
