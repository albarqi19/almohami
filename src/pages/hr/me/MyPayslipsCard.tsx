import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { AlertTriangle, Info, Lock, Printer, RefreshCw, Scale, Wallet } from 'lucide-react';

import { hrPayrollService, payslipPdfPath } from '../../../services/hrPayrollService';
import { EMPTY_MARK, errorText, fmtLeaveDate } from '../leave/leaveFormat';
import { money } from '../payroll/payrollFormat';
import { openLetterPdf } from '../letters/letterPdf';
import { errorStatus } from './errorStatus';
import type { MyPayslipRow, PayslipDocItem, PayslipDocument } from '../../../types/hrPayroll';

/**
 * 🔑 **قسائمي — «كم أُودع، ولماذا هذا الرقم بالذات».**
 *
 * ══════ 🔴 كلُّ حرفٍ هنا يصل مبنيّاً من الخادم ══════
 * الحمولةُ يبنيها `PayslipComposer`، **وهي عينُها التي تُبنى منها الورقة**. فلا جملةَ
 * تُركَّب هنا ولا رقمَ يُنسَّق: ما يقرؤه الموظفُ على الشاشة هو حرفياً ما في ملفّه المطبوع.
 * ولو بُني أحدُهما من حمولةٍ والآخرُ من أخرى لافترقا بأوّل تحسين — فيقرأ صاحبُ الأجر
 * رقمين لشيءٍ واحد، وهو أسوأُ ما يقع لمستندِ راتب.
 *
 * وخلافاً لبقيّة أسطح الوحدة، **لا `payrollFormat` هنا إلا `money`** لسردِ القائمة وحدَه:
 * تفصيلُ القسيمة يصل منسَّقاً، وإعادةُ تنسيقه في المتصفّح بابُ رقمين للحقيقة الواحدة.
 *
 * ══════ ولا يرى إلا المجمَّد ══════
 * الخادمُ يرشّح `is_frozen` — فمسوّدةٌ محتسَبةٌ لا تظهر هنا أصلاً. ورقمٌ يتغيّر بإعادة
 * الاحتساب لو عُرض لجعل الموظفَ يقرأ مبلغاً ثمّ يُودَع غيرُه.
 *
 * ══════ وحالتان نهائيّتان لا عطلان عابران ══════
 * ٤٠٤ (لا ملفَّ لحسابه) و٤٠٣ (وحدةُ الرواتب غيرُ مفعَّلةٍ للمكتب) ⇒ `retry:false` و**قفلٌ
 * لا مثلثٌ أحمر**، بـ`errorStatus` المشتركةِ في `errorStatus.ts` لا بنسخةٍ ثانيةٍ منها.
 */

/** نصٌّ احتياطيٌّ واحدٌ لفرع الخطأ — عرفُ وحدة الإجازات. */
const CONNECTION_FALLBACK = 'انقطع الاتصال بالخادم.';

const PAYMENT_LABELS: Record<string, string> = {
  pending: 'بانتظار التحويل',
  sent: 'التحويل مرسل',
  confirmed: 'وصل الحساب',
  failed: 'فشل التحويل',
  held: 'موقوف مؤقتاً',
};

export const MyPayslipsCard: React.FC = () => {
  const [openId, setOpenId] = useState<number | null>(null);
  const [printingId, setPrintingId] = useState<number | null>(null);

  const listQuery = useQuery({
    queryKey: ['hr', 'me', 'payslips'],
    queryFn: hrPayrollService.listMyPayslips,
    retry: false,
  });

  const slipQuery = useQuery({
    queryKey: ['hr', 'me', 'payslip', openId],
    queryFn: () => hrPayrollService.getMyPayslip(openId as number),
    enabled: openId !== null,
    retry: false,
  });

  const status = errorStatus(listQuery.error);

  const openPdf = async (row: MyPayslipRow) => {
    setPrintingId(row.line_id);
    try {
      await openLetterPdf(
        payslipPdfPath.mine(row.line_id),
        `payslip-${row.payslip_number ?? row.line_id}.pdf`,
        'القسيمة'
      );
    } catch (error) {
      toast.error(errorText(error, 'تعذر فتح القسيمة'));
    } finally {
      setPrintingId(null);
    }
  };

  const list = (() => {
    if (listQuery.isPending) {
      return (
        <div className="hrl-state hrl-state--loading" aria-busy="true" aria-label="جارٍ تحميل قسائمك">
          {Array.from({ length: 3 }, (_, i) => (
            <span className="hrl-skel" key={i} />
          ))}
        </div>
      );
    }

    // ٤٠٤ (لا ملفَّ) و٤٠٣ (الوحدةُ غيرُ مفعَّلة) — **قفلٌ لا مثلثٌ أحمر**: حالةٌ لا عطل.
    if (status === 404 || status === 403) {
      return (
        <div className="hrl-state hrl-state--locked">
          <Lock size={20} />
          <p className="hrl-state__t">قسائم راتبك غير متاحة</p>
          <p className="hrl-state__d">{errorText(listQuery.error, 'غير متاح.')}</p>
        </div>
      );
    }

    if (listQuery.isError) {
      return (
        <div className="hrl-state hrl-state--error">
          <AlertTriangle size={20} />
          <p className="hrl-state__t">تعذر تحميل قسائمك</p>
          <p className="hrl-state__d">{errorText(listQuery.error, CONNECTION_FALLBACK)}</p>
          <button type="button" className="hr-btn hr-btn--sm" onClick={() => void listQuery.refetch()}>
            <RefreshCw size={13} /> إعادة المحاولة
          </button>
        </div>
      );
    }

    const rows = listQuery.data ?? [];

    if (rows.length === 0) {
      return (
        <div className="hrl-state hrl-state--empty">
          <Wallet size={20} />
          <p className="hrl-state__t">لم تصدر قسيمة باسمك بعد</p>
          <p className="hrl-state__d">تظهر هنا قسائمك بعد اعتماد مسير الرواتب، ولا تظهر المسودات.</p>
        </div>
      );
    }

    return (
      <table className="hrl-table hrl-table--single">
        <caption className="hrl-sr">قسائمي المعتمَدة مرتبة من الأحدث</caption>
        <thead>
          <tr>
            <th scope="col">المدة</th>
            <th scope="col">الرقم</th>
            <th scope="col">الصافي</th>
            <th scope="col">الصرف</th>
            <th scope="col">
              <span className="hrl-sr">أدوات</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.line_id}>
              <td>{fmtLeaveDate(row.period_start)}</td>
              <td>
                <span className="hrl-cellnum" dir="ltr">
                  {row.payslip_number ?? EMPTY_MARK}
                </span>
              </td>
              <td>
                <span className="hrl-cellnum" dir="ltr">
                  {money(row.net_amount) ?? EMPTY_MARK}
                </span>
              </td>
              <td>
                <span className="hrl-badge hrl-badge--flat">
                  {PAYMENT_LABELS[row.payment_state] ?? row.payment_state}
                </span>
                <span className="hrl-cellsub">{fmtLeaveDate(row.pay_date)}</span>
              </td>
              <td>
                <span className="hrl-tools">
                  <button
                    type="button"
                    className="hrl-cellbtn"
                    onClick={() => setOpenId(row.line_id === openId ? null : row.line_id)}
                  >
                    {row.line_id === openId ? 'إغلاق' : 'التفصيل'}
                  </button>
                  <button
                    type="button"
                    className="hrl-cellbtn"
                    disabled={printingId === row.line_id}
                    onClick={() => void openPdf(row)}
                  >
                    <Printer size={11} /> PDF
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
          <Wallet size={14} /> قسائم راتبي
        </h2>
      </div>

      <div className="hrl-block__b hrl-block__b--flush">{list}</div>

      {openId !== null && slipQuery.isPending && (
        <div className="hrl-state hrl-state--loading" aria-busy="true" aria-label="جارٍ فتح القسيمة">
          <span className="hrl-skel hrl-skel--line" />
          <span className="hrl-skel hrl-skel--line" />
        </div>
      )}

      {openId !== null && slipQuery.isError && (
        <div className="hrl-state hrl-state--error">
          <AlertTriangle size={20} />
          <p className="hrl-state__t">تعذر فتح القسيمة</p>
          <p className="hrl-state__d">{errorText(slipQuery.error, CONNECTION_FALLBACK)}</p>
        </div>
      )}

      {openId !== null && slipQuery.data !== undefined && <MySlipDetail slip={slipQuery.data} />}
    </section>
  );
};

/**
 * تفصيلُ القسيمة — **بالترتيب الذي يقرأ به إنسان**: كم أُودع، ثمّ لماذا هذا الرقم، ثمّ
 * البنودُ بأساسها، ثمّ ما لا يجوز أن تصمت عنه الورقة.
 */
const MySlipDetail: React.FC<{ slip: PayslipDocument }> = ({ slip }) => (
  <>
    <div className="hrl-block__b hrp-slip__hero">
      <p className="hrl-num">
        <span className="hrl-num__v" dir="ltr">
          {slip.totals.net ?? EMPTY_MARK}
        </span>
        <span className="hrl-num__u">ر.س</span>
      </p>
      <p className="hrl-num__label">
        {slip.document.period_label ?? EMPTY_MARK}
        {slip.document.pay_date_label === null ? '' : ` · صرفها ${slip.document.pay_date_label}`}
        {slip.employee.iban_last4 === null ? '' : ` · حساب منتهٍ بـ${slip.employee.iban_last4}`}
      </p>
    </div>

    <div className="hrl-block__b">
      <h3 className="hrl-h2">لماذا هذا الصافي</h3>

      <ol className="hrp-path">
        {slip.path.map((step, index) => (
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

    {/* 🔴 الكسرُ صريحاً: «٢ من ٣٠» — ليتحقّق منه صاحبُ الأجر بالقسمة، لا ليصدّق. */}
    {slip.period.fraction_sentence !== null && (
      <div className="hrl-block__b">
        <p className="hrl-hint">{slip.period.fraction_sentence}</p>
        {slip.period.unpaid_ranges.map((range) => (
          <p className="hrl-hint" key={`${range.from}-${range.to}`}>
            يوم بلا أجر: {range.label ?? EMPTY_MARK}
          </p>
        ))}
      </div>
    )}

    <SlipItems title="المستحقات" items={slip.earnings} empty="لا مستحقات في هذه القسيمة." />
    <SlipItems
      title="الاستقطاعات"
      items={slip.deductions}
      empty="لا استقطاع في هذه القسيمة."
    />

    {slip.employer_cost.length > 0 && (
      <div className="hrl-block__b hrp-cost">
        <h3 className="hrl-h2">تكلفة المكتب</h3>
        <p className="hrl-hint">يتحملها المكتب فوق أجرك، ولا تدخل في صافيك.</p>

        <ul className="hrp-item__list">
          {slip.employer_cost.map((item) => (
            <SlipItemRow item={item} key={item.id} />
          ))}
        </ul>
      </div>
    )}

    <div className="hrl-block__b">
      {slip.notices.map((notice) => (
        <p className="hrl-hint" key={notice}>
          <Info size={11} /> {notice}
        </p>
      ))}
    </div>
  </>
);

const SlipItems: React.FC<{ title: string; items: PayslipDocItem[]; empty: string }> = ({ title, items, empty }) => (
  <div className="hrl-block__b">
    <h3 className="hrl-h2">{title}</h3>

    {items.length === 0 ? (
      <p className="hrl-hint">{empty}</p>
    ) : (
      <ul className="hrp-item__list">
        {items.map((item) => (
          <SlipItemRow item={item} key={item.id} />
        ))}
      </ul>
    )}
  </div>
);

/**
 * سطرُ البند — **الرقمُ ومعه برهانُه**، والحقولُ كلُّها مبنيّةٌ في الخادم.
 *
 * 🩸 `dir="ltr"` على `basis_math` وحدَه: هو لاتينيٌّ محضٌ بناءً، والوحدةُ العربية تخرج
 * منه في `basis_unit`. ووسمُ النطاق الجامع يمزّق «١٢٬٠٠٠٫٠٠ × ٢٨ ÷ ٣٠ يوماً».
 */
const SlipItemRow: React.FC<{ item: PayslipDocItem }> = ({ item }) => (
  <li className={`hrp-item hrp-item--${item.kind === 'deduction' ? 'deduct' : item.kind === 'employer_cost' ? 'cost' : 'earn'}`}>
    <div className="hrp-item__head">
      <span className="hrp-item__n">{item.name ?? EMPTY_MARK}</span>
      <span className="hrp-item__a" dir="ltr">
        {item.sign_mark}
        {item.amount ?? EMPTY_MARK}
      </span>
    </div>

    <div className="hrp-item__why">
      {item.basis_math !== null && (
        <span className="hrp-item__w">
          <span dir="ltr">{item.basis_math}</span>
          {item.basis_unit === null ? '' : ` ${item.basis_unit}`}
          {item.basis_vessel_label === null ? '' : ` — ${item.basis_vessel_label}`}
        </span>
      )}

      {item.rule_title !== null && (
        <span className="hrp-item__w">
          <Scale size={11} /> {item.rule_title}
          {item.article_ref === null ? '' : <span className="hrl-legal__ref"> {item.article_ref}</span>}
        </span>
      )}

      {item.decided_by !== null && (
        <span className="hrp-item__w">
          قررها {item.decided_by}
          {item.decision_reason === null ? '' : ` — ${item.decision_reason}`}
        </span>
      )}

      {item.counterparty_note !== null && <span className="hrp-item__w">{item.counterparty_note}</span>}

      {item.cap_note !== null && (
        <span className="hrp-cap">
          <Info size={11} /> {item.cap_note}
        </span>
      )}

      {item.outstanding_after !== null && (
        <span className="hrp-item__w">
          المتبقي بعد هذا القسط: <span dir="ltr">{item.outstanding_after}</span>
        </span>
      )}
    </div>
  </li>
);

export default MyPayslipsCard;
