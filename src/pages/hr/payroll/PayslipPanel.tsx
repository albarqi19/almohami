import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { AlertTriangle, ChevronLeft, FileText, Info, Printer, Scale, User } from 'lucide-react';

import {
  basisLine,
  basisUnit,
  capNote,
  counterpartyNote,
  daysFraction,
  divisorNote,
  EMPTY_MARK,
  errorText,
  fmtDateHuman,
  fractionSentence,
  ITEM_KIND_CLASS,
  lineFlagLabel,
  money,
  netPathRows,
  prorationOf,
  ruleTitle,
  signMark,
  SOURCE_LABELS,
  VESSEL_LABELS,
  whyRows,
} from './payrollFormat';
import { openLetterPdf } from '../letters/letterPdf';
import { payslipPdfPath } from '../../../services/hrPayrollService';
import type { PayrollItem, PayrollPayslip } from '../../../types/hrPayroll';

/**
 * 🔑 **القسيمةُ بخمس طبقات** — «كم؟ متى؟ ولماذا يختلف عن الشهر الماضي؟» بهذا الترتيب حصراً.
 *
 * ══════ لماذا هذا الترتيبُ لا غيرُه ══════
 * الموظفُ يفتح القسيمةَ لسؤالٍ واحد: **كم أُودع؟** فيُجاب عنه أوّلاً برقمٍ واحدٍ كبيرٍ لا
 * يزاحمه شيء. ثمّ ثلاثةُ حدودٍ تشرح تركيبَه (`مستحقات − استقطاعات = صافٍ`). ثمّ التفصيلُ
 * **سرداً لا جدولاً**، وكلُّ بندٍ معه معادلتُه ومرجعُه. ثمّ سؤالُ النزاع الحقيقيّ: «لماذا
 * يختلف عن الشهر الماضي؟». والجدولُ ذو العشرين عموداً يجيب عن آخرِ سؤالٍ أولاً ولا يجيب
 * عن أوّلها أبداً.
 *
 * ══════ 🔴 حصّةُ صاحب العمل خارجَ الاستقطاعات كلياً (D13) ══════
 * تُنقَل إلى لوح «تكلفة المكتب» بلوحٍ مستقلّ. عرضُها داخل الاستقطاعات هو الالتباسُ الأشيعُ
 * في القسائم الرديئة: يقرأ الموظفُ أنه دفع ١٬١٧٠ وهو لم يدفعها.
 *
 * ══════ 🔴 وكلُّ رقمٍ يفتح على «من أين جاء» ══════
 * الوعاءُ ومعامِلُه ومرجعُ المادّة ونسختُها ومن قرّره. محاسبٌ غيرُ تقنيٍّ يفهمها، وموظفٌ
 * يعترض يجد جوابَه مكتوباً — لا في ذاكرة أحد.
 *
 * ══════ ولا يُخفى ما لم يُحتسب ══════
 * `null` تعني «لم يُحتسب بعد» فتُعرَض شرطةً وجملةً صريحة، ولا تُطبَع `0.00` مكانَها: صفرٌ
 * مكتوبٌ يُقرأ حقيقةً.
 */

interface Props {
  payslip: PayrollPayslip;
  /** مسوّدةٌ أم مجمَّدة — يغيّر نصَّ الذيل لا الأرقام. */
  editable: boolean;
}

type Layer = 'earnings' | 'deductions' | 'none';

export const PayslipPanel: React.FC<Props> = ({ payslip, editable }) => {
  const [open, setOpen] = useState<Layer>('earnings');
  const [printing, setPrinting] = useState(false);
  const line = payslip.line;
  const run = payslip.run;

  const earnings = payslip.items.filter((item) => item.bearer === 'employee' && item.kind === 'earning');
  const deductions = payslip.items.filter((item) => item.bearer === 'employee' && item.kind === 'deduction');
  const employerCost = payslip.items.filter((item) => item.bearer === 'employer');
  const why = whyRows(payslip.diff);

  const computed = line.net_amount !== null;

  // 🔴 الطريقُ من الأجر إلى المدفوع — **من أعمدة الصفّ وحدَها**، وهي عينُها التي تُطبَع
  //    على الورقة (`PayslipComposer::path`). فما يراه المراجعُ هنا هو ما يسلّمه للموظف.
  const path = netPathRows(line);
  const proration = prorationOf(line.explain);
  const fraction = fractionSentence(proration);
  const divisor = divisorNote(line.period_calendar_days, proration);

  /**
   * إصدارُ الورقة — `openLetterPdf` نفسُها التي تفتح الخطابات: `fetch` خام لأنّ `apiClient`
   * يفكّ الردَّ JSON ولا يعرف `blob`. ونسخُ كتلة التنزيل هنا يُعيد العطلَ الذي وُجدت
   * تلك الدالّةُ لإصلاحه.
   */
  const openPdf = async () => {
    setPrinting(true);
    try {
      await openLetterPdf(
        payslipPdfPath.office(line.line_id),
        `payslip-${line.payslip_number ?? line.line_id}.pdf`,
        'القسيمة'
      );
    } catch (error) {
      toast.error(errorText(error, 'تعذّر فتحُ القسيمة'));
    } finally {
      setPrinting(false);
    }
  };

  return (
    <section className="hrl-block hrp-slip" aria-labelledby="slip-h">
      {/* 🩸 الاسمُ في سطره والأدواتُ في سطرها متى ضاق العمود — لا اسمٌ مسحوقٌ في ثلاثة
          أسطرٍ بجوار ثلاث رقاقات. والقياسُ في `hr-payroll.css` §٩. */}
      <header className="hrl-block__h hrp-slip__h">
        <h2 className="hrl-block__t hrp-slip__who" id="slip-h">
          <User size={14} /> {line.name}
        </h2>

        <span className="hrp-slip__meta">
          {line.payslip_number !== null && (
            <span className="hrl-badge hrl-badge--flat" dir="ltr">
              {line.payslip_number}
            </span>
          )}
          {line.is_frozen && <span className="hrl-badge hrl-badge--flat">مجمَّدة</span>}

          {/* الزرُّ يظهر متى وُجد رقمٌ يُطبَع — ولا يُرسَم لسطرٍ لم يُحتسب: الخادمُ يردّه ٤٢٢. */}
          {computed && (
            <button type="button" className="hr-btn hr-btn--sm" disabled={printing} onClick={() => void openPdf()}>
              <Printer size={13} /> {printing ? 'جارٍ الفتح…' : 'قسيمة PDF'}
            </button>
          )}
        </span>
      </header>

      {/* ── الطبقةُ ١: رقمٌ واحدٌ كبيرٌ ولا شيءَ غيره ── */}
      <div className="hrl-block__b hrp-slip__hero">
        {computed ? (
          <>
            <p className="hrl-num">
              <span className="hrl-num__v" dir="ltr">
                {money(line.net_amount)}
              </span>
              <span className="hrl-num__u">ر.س</span>
            </p>
            <p className="hrl-num__label">
              الصافي المُودَع{run === null ? '' : ` · ${fmtDateHuman(run.pay_date)}`}
              {line.iban_last4 === null ? '' : ` · حسابٌ منتهٍ بـ${line.iban_last4}`}
            </p>
          </>
        ) : (
          <>
            <p className="hrl-num">
              <span className="hrl-num__v" dir="ltr">
                {EMPTY_MARK}
              </span>
            </p>
            <p className="hrl-num__label">لم يُحتسب بعد — والصفرُ المكتوبُ يُقرأ حقيقةً فلا يُكتب.</p>
          </>
        )}
      </div>

      {/* ── الطبقةُ ٢: ثلاثةُ حدودٍ لا جدول ── */}
      {computed && (
        <div className="hrl-block__b">
          <div className="hrl-formula">
            <button
              type="button"
              className={`hrl-formula__term${open === 'earnings' ? ' hrl-formula__term--sum' : ''}`}
              onClick={() => setOpen(open === 'earnings' ? 'none' : 'earnings')}
              aria-expanded={open === 'earnings'}
            >
              <span className="hrl-formula__k">المستحقات</span>
              <span className="hrl-formula__v" dir="ltr">
                {money(line.earnings_amount)}
              </span>
            </button>
            <span className="hrl-formula__k">−</span>
            <button
              type="button"
              className={`hrl-formula__term${open === 'deductions' ? ' hrl-formula__term--sum' : ''}`}
              onClick={() => setOpen(open === 'deductions' ? 'none' : 'deductions')}
              aria-expanded={open === 'deductions'}
            >
              <span className="hrl-formula__k">الاستقطاعات</span>
              <span className="hrl-formula__v" dir="ltr">
                {money(line.deductions_amount)}
              </span>
            </button>
            <span className="hrl-formula__k">=</span>
            <span className="hrl-formula__term hrl-formula__term--static">
              <span className="hrl-formula__k">الصافي</span>
              <span className="hrl-formula__v" dir="ltr">
                {money(line.net_amount)}
              </span>
            </span>
          </div>

          {/* 🔴 D01: العددان معاً — التقويميُّ مقامُ الأجر، والدفتريُّ ما احتسبه دفترُ الإجازات. */}
          <p className="hrl-hint">
            الأجرُ عن {daysFraction(line.paid_calendar_days, line.period_calendar_days)} يوماً تقويمياً
            {line.leave_ledger_days === null || line.leave_ledger_days === '0.00'
              ? ''
              : ` · وفي دفتر الإجازات ${String(line.leave_ledger_days).replace(/\.00$/, '')} يوماً بأساسه`}
          </p>

          {/* 🔴 الكسرُ صريحاً بأمر المالك: «٢ من ٣٠» تُطبَع ليتحقّق منها إنسانٌ بالقسمة —
              ورقمٌ لا يستطيع قارئُه التحقّقَ منه ليس رقماً بل ادّعاء. */}
          {fraction !== null && <p className="hrl-hint">{fraction}</p>}

          {/* ⚠️ ويُقال ما الفرقُ بين العددين متى اختلفا — «٣١ من ٣١» ثمّ «٣٠ من ٣٠» بلا
              حرفٍ بينهما تجعل قارئاً غيرَ محاسبٍ يظنّ أحدَهما خطأً. */}
          {divisor !== null && <p className="hrl-hint">{divisor}</p>}
        </div>
      )}

      {/* ── 🔑 «لماذا هذا الصافي» — الطريقُ من الأجر إلى المدفوع في أربع محطّات ──
          وهو ما يجعل القسيمةَ مفهومةً لغير المحاسب: الجدولُ يقول «كم بنداً»، وهذا يقول
          «كيف صار راتبي هذا الرقم». وكلُّ مبلغٍ عمودٌ مخزَّنٌ لا حاصلُ طرحٍ عند العرض. */}
      {computed && (
        <div className="hrl-block__b">
          <h3 className="hrl-h2">لماذا هذا الصافي</h3>

          <ol className="hrp-path">
            {path.map((step, index) => (
              <li className={`hrp-path__i${step.key === 'net' ? ' hrp-path__i--sum' : ''}`} key={step.key}>
                <span className="hrp-path__s" aria-hidden="true" dir="ltr">
                  {index + 1}
                </span>
                <span className="hrp-path__k">
                  {step.label}
                  {step.note !== null && <span className="hrp-path__w">{step.note}</span>}
                </span>
                <span className="hrp-path__v" dir="ltr">
                  {step.amount ?? EMPTY_MARK}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── الطبقةُ ٣: التفصيلُ سرداً لا جدولاً ── */}
      {computed && open === 'earnings' && <ItemList items={earnings} emptyText="لا مستحقَّ في هذه القسيمة." />}
      {computed && open === 'deductions' && (
        <ItemList
          items={deductions}
          emptyText="لا استقطاعَ في هذه القسيمة — ولا خصمَ يقع بلا قرارِ إنسانٍ مسمّى."
        />
      )}

      {/* ── الطبقةُ ٤: لماذا يختلف عن الشهر الماضي؟ ── */}
      {computed && (
        <div className="hrl-block__b">
          <h3 className="hrl-h2">لماذا يختلف عن الشهر الماضي؟</h3>

          {payslip.previous === null ? (
            <p className="hrl-hint">لا قسيمةَ سابقةً لهذا المنسوب — هذه أوّلُ قسيمةٍ تُحتسب له.</p>
          ) : why.length === 0 ? (
            <p className="hrl-hint">
              لا فرقَ عن الشهر الماضي: الصافي {money(payslip.previous.net_amount)} كما هو.
            </p>
          ) : (
            <ul className="hra-why">
              {why.map((row, index) => (
                <li className="hra-why__i" key={`${row.text}-${index}`}>
                  <span className="hra-why__m">{row.mark === 'down' ? '✖' : row.mark === 'up' ? '✔' : '•'}</span>
                  {row.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── الطبقةُ ٥: كيف قُسِّم الأجر · وتكلفةُ المكتب · والحالة ── */}
      {computed && payslip.segments.length > 0 && (
        <div className="hrl-block__b">
          <h3 className="hrl-h2">كيف قُسِّم الأجر</h3>

          <ul className="hrp-seg">
            {payslip.segments.map((segment) => (
              <li className="hrp-seg__i" key={segment.id}>
                <span className="hrp-seg__d">
                  {fmtDateHuman(segment.from)} ← {fmtDateHuman(segment.to)}
                </span>
                <span className="hrp-seg__f">
                  {segment.is_whole_period
                    ? 'مدّةٌ كاملةٌ بلا يومٍ غيرِ مدفوع — الأجرُ حرفياً بلا قسمة'
                    : `${money(segment.formula?.monthly ?? segment.wage_actual)} · ${segment.formula?.fraction ?? EMPTY_MARK}`}
                  {segment.absorbs_remainder && segment.formula !== null && segment.formula.remainder !== '0.00'
                    ? ` · ابتلعت كسرَ التوزيع (${segment.formula.remainder})`
                    : ''}
                </span>
                <span className="hrp-seg__n" dir="ltr">
                  {money(segment.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {computed && employerCost.length > 0 && (
        <div className="hrl-block__b hrp-cost">
          <h3 className="hrl-h2">تكلفةُ المكتب</h3>
          <p className="hrl-hint">
            هذه لا تُخصَم من الموظف ولا تدخل صافيه — يتحمّلها المكتبُ فوق الأجر.
          </p>

          <ul className="hrp-item__list">
            {employerCost.map((item) => (
              <ItemRow item={item} key={item.id} />
            ))}
          </ul>

          <dl className="hrl-kv">
            <dt>مجموعُ التكلفة</dt>
            <dd dir="ltr">{money(line.employer_cost_amount) ?? EMPTY_MARK}</dd>
          </dl>
        </div>
      )}

      {(line.blocking_flags ?? []).length > 0 && (
        <div className="hrl-block__b">
          <div className="hrl-flags">
            {(line.blocking_flags ?? []).map((flag, index) => (
              <div className="hrl-flag hrl-flag--block" key={`${flag.code}-${index}`}>
                <p className="hrl-flag__t">
                  <AlertTriangle size={13} /> {lineFlagLabel(flag.code)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="hrl-block__b">
        <p className="hrl-hint">
          {editable
            ? 'هذه القسيمةُ مسوّدةٌ قابلةٌ لإعادة الاحتساب — ولا تصير مستنداً إلا بالاعتماد.'
            : 'قسيمةٌ مجمَّدةٌ: كلُّ رقمٍ فيها مخزَّنٌ في صفِّه، وتُعاد طباعتُها بعد سنواتٍ حرفاً بحرف.'}
          {run !== null && run.posting_state === 'accounting_off' ? ' · لم تُقيَّد محاسبياً.' : ''}
          {run !== null && run.self_approved ? ' · اعتمدها معدُّها بإقرارٍ مسجَّل.' : ''}
          {/* 🔴 شرطُ فتح باب الإقرار: أن يبقى الأثرُ ظاهراً على القسيمة — لا في سجلٍّ يُفتَح
              بقصد. والاسمُ من اللقطة المجمَّدة لا من انضمامٍ حيّ. */}
          {run !== null && run.approver_was_subject
            ? ` · اعتمدها من صُرف له فيها${run.approver_name === null ? '' : ` (${run.approver_name})`} بإقرارٍ مسجَّل.`
            : ''}
        </p>
      </div>
    </section>
  );
};

/** قائمةُ بنودٍ — سردٌ لا جدول، ولكلّ بندٍ تفسيرُه تحته لا في تلميحٍ يختفي. */
const ItemList: React.FC<{ items: PayrollItem[]; emptyText: string }> = ({ items, emptyText }) => (
  <div className="hrl-block__b">
    {items.length === 0 ? (
      <p className="hrl-hint">{emptyText}</p>
    ) : (
      <ul className="hrp-item__list">
        {items.map((item) => (
          <ItemRow item={item} key={item.id} />
        ))}
      </ul>
    )}
  </div>
);

/**
 * 🔑 سطرُ البند — **الرقمُ ومعه برهانُه**: من أين جاء · على أيّ أساس · وأيّ قاعدةٍ نظامية.
 */
const ItemRow: React.FC<{ item: PayrollItem }> = ({ item }) => {
  const basis = basisLine(item);
  const unit = basisUnit(item);
  const cap = capNote(item);
  const where = counterpartyNote(item);
  const rule = ruleTitle(item.rule_code);

  return (
    <li className={`hrp-item ${ITEM_KIND_CLASS[item.kind]}`}>
      <div className="hrp-item__head">
        <span className="hrp-item__n">{item.name}</span>
        <span className="hrp-item__a" dir="ltr">
          {signMark(item.kind)}
          {money(item.amount)}
        </span>
      </div>

      <div className="hrp-item__why">
        {/* 🩸 `dir="ltr"` على المعادلة **وحدَها**: هي لاتينيةٌ محضةٌ بناءً، والوحدةُ العربيةُ
            تخرج منها في `basisUnit` — ونطاقٌ جامعٌ يمزّق «١٢٬٠٠٠ × ٢٩ يوماً». */}
        {basis !== null && (
          <span className="hrp-item__w">
            <span dir="ltr">{basis}</span>
            {unit === null ? '' : ` ${unit}`}
            {item.basis_vessel === null ? '' : ` — ${VESSEL_LABELS[item.basis_vessel] ?? item.basis_vessel}`}
          </span>
        )}

        {rule !== null && (
          <span className="hrp-item__w">
            <Scale size={11} /> {rule}
            {item.article_ref === null ? '' : <span className="hrl-legal__ref"> {item.article_ref}</span>}
            {item.rule_effective_from === null ? '' : ` · نسخةُ ${fmtDateHuman(item.rule_effective_from)}`}
          </span>
        )}

        {item.source_type !== null && (
          <span className="hrp-item__w">
            <FileText size={11} /> {SOURCE_LABELS[item.source_type] ?? item.source_type}
          </span>
        )}

        {item.decided_by_name !== null && (
          <span className="hrp-item__w">
            <User size={11} /> قرّرها {item.decided_by_name}
            {item.decision_reason === null ? '' : ` — ${item.decision_reason}`}
          </span>
        )}

        {where !== null && <span className="hrp-item__w">{where}</span>}

        {cap !== null && (
          <span className="hrp-cap">
            <Info size={11} /> {cap}
          </span>
        )}

        {item.accrual_period !== '' && item.explain !== null && 'prior_period' in item.explain && (
          <span className="hrp-item__w">
            <ChevronLeft size={11} /> تسويةٌ عن {item.accrual_period}
          </span>
        )}
      </div>
    </li>
  );
};

export default PayslipPanel;
