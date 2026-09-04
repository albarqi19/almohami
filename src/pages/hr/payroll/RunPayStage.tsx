import React, { useMemo, useState } from 'react';
import { AlertTriangle, Banknote, CheckCircle2, Loader2, Lock, RefreshCw, Send, XCircle } from 'lucide-react';

import { errorText, money } from './payrollFormat';
import { hrPayrollService } from '../../../services/hrPayrollService';
import type {
  PaymentState,
  PayrollPaymentBoard,
  PayrollPaymentLine,
  PayrollPaymentMeta,
} from '../../../types/hrPayroll';

/**
 * **المرحلةُ ٦ — الدفع** (S6 · D17).
 *
 * ══════ 🔑 الجملةُ التي بُنيت الشاشةُ لأجلها ══════
 * **الفاشلُ يظهر بسببه وبزرِّ إعادة، ولا يختفي.** تحويلٌ بنكيٌّ يُرفض واقعةٌ يومية، وشاشةٌ
 * تعرض «مدفوع/غير مدفوع» للمسير كلِّه تجعل ثلاثةَ مستحقّين يختفون خلف كلمةٍ واحدة.
 *
 * ══════ الكتلةُ الفاشلةُ **أعلى الشاشة** لا في ذيل الجدول ══════
 * لأنها العملُ المتبقّي: خمسةٌ نجحت لا تحتاج قارئاً، وثلاثةٌ فشلت تحتاج قراراً اليوم. ولكلٍّ
 * «لماذا» (نصُّ رفضِ البنك كما سُجِّل) و«ما التالي» (أعد المحاولة، أو اجرفها إلى مسيرٍ استثنائيّ).
 *
 * ══════ 🚨 ولا زرَّ «ألغِ الدفعة» في أيّ موضع ══════
 * دفعةٌ مؤكَّدةٌ واقعةٌ وقعت. والبدائلُ الصادقةُ وحدَها: **سجّل استرداداً** أو **أنشئ مسيراً
 * تصحيحياً**. والخادمُ يردّ ٤٢٢ على محاولة «تفشيل» سطرٍ مؤكَّد، والشاشةُ لا تعرض الزرَّ أصلاً.
 *
 * ══════ الحالاتُ الأربع ══════
 * تحميلٌ (هيكل) · محجوبٌ (بلا `hr.compensation.view` لا يصل صفٌّ واحد) · خطأٌ بزرِّ إعادة ·
 * ومكتملٌ («صُرف الجميع») — ولا حالةَ فارغةٍ: مسيرٌ معتمَدٌ له سطورٌ بالضرورة.
 */

const STATE_LABELS: Record<PaymentState, string> = {
  pending: 'غير مرسل',
  sent: 'مرسل للبنك',
  confirmed: 'وصل',
  failed: 'لم يصل',
  held: 'موقوف',
};

const SKIP_REASONS: Record<string, string> = {
  no_iban: 'بلا آيبان. أضفه في سجل الأجور',
  already_confirmed: 'مؤكد بالفعل. لا يصرف مرتين',
  not_computed: 'بلا احتساب',
  held: 'موقوف بقرار. لا يصرف ضمن الدفعة',
};

const todayInRiyadh = (): string => {
  const now = new Date();
  const riyadh = new Date(now.getTime() + (now.getTimezoneOffset() + 180) * 60_000);

  return `${riyadh.getFullYear()}-${String(riyadh.getMonth() + 1).padStart(2, '0')}-${String(riyadh.getDate()).padStart(2, '0')}`;
};

interface Props {
  data: PayrollPaymentBoard;
  meta: PayrollPaymentMeta;
  selectedLineId: number | null;
  onSelect: (lineId: number) => void;
  onChanged: () => void;
}

export const RunPayStage: React.FC<Props> = ({ data, meta, selectedLineId, onSelect, onChanged }) => {
  const [reference, setReference] = useState('');
  const [paidOn, setPaidOn] = useState(todayInRiyadh());
  const [picked, setPicked] = useState<number[]>([]);
  const [failFor, setFailFor] = useState<number | null>(null);
  const [failReason, setFailReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const failed = useMemo(() => data.lines.filter((row) => row.payment_state === 'failed'), [data.lines]);
  const open = useMemo(() => data.lines.filter((row) => row.payment_state !== 'confirmed'), [data.lines]);
  const canPay = meta.can_pay === true && meta.payable === true;

  if (! meta.can_view_amounts) {
    return (
      <section className="hrl-block" aria-labelledby="pay-locked-h">
        <header className="hrl-block__h">
          <h2 className="hrl-block__t" id="pay-locked-h">
            <Lock size={14} /> مبالغ الصرف محجوبة
          </h2>
        </header>

        <div className="hrl-block__b">
          <p className="hrl-hint">
            شاشة الدفع تعرض صافي كل موظف وحسابه البنكي، وهي تحتاج صلاحية عرض أجور الموظفين.
            لا يظهر لك أي سجل منها.
          </p>
        </div>
      </section>
    );
  }

  const act = async (fn: () => Promise<string>) => {
    setBusy(true);
    setError(null);
    setNote(null);

    try {
      setNote(await fn());
      onChanged();
    } catch (caught) {
      setError(errorText(caught, 'تعذر تنفيذ الإجراء.'));
    } finally {
      setBusy(false);
    }
  };

  const confirmPicked = (ids: number[]) =>
    act(async () => {
      const result = await hrPayrollService.confirmPayments(data.run.id, {
        line_ids: ids,
        reference: reference.trim(),
        paid_on: paidOn,
      });

      setPicked([]);

      return `تم تأكيد صرف ${result.confirmed.length} من التحويلات بمجموع ${money(result.total) ?? '—'} ر.س.`;
    });

  return (
    <>
      {/* ══ الفاشلُ أوّلاً: هو العملُ المتبقّي، لا ذيلُ جدولٍ يُمرَّر إليه ══ */}
      {failed.length > 0 && (
        <section className="hrl-block" aria-labelledby="pay-failed-h">
          <header className="hrl-block__h">
            <h2 className="hrl-block__t" id="pay-failed-h">
              <AlertTriangle size={14} /> لم يصل {failed.length} من التحويلات، والمبالغ ما زالت مستحقة
            </h2>
            {canPay && (
              <button
                type="button"
                className="hrl-block__a"
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    const result = await hrPayrollService.sweepUnpaid(data.run.id, {});

                    return `تم فتح المسير الاستثنائي ${result.run.run_number ?? ''} بـ${result.carried.length} من المستحقات.`;
                  })
                }
              >
                <RefreshCw size={12} /> انقلها إلى مسير استثنائي
              </button>
            )}
          </header>

          <div className="hrl-block__b">
            <ul className="hrp-pay__list">
              {failed.map((row) => (
                <li className="hrp-pay__f" key={row.line_id}>
                  <div className="hrp-pay__f-head">
                    <button type="button" className="hrl-link" onClick={() => onSelect(row.line_id)}>
                      {row.name}
                    </button>
                    <span className="hrp-pay__f-n" dir="ltr">
                      {money(row.net_amount) ?? '—'}
                    </span>
                  </div>

                  <p className="hrp-pay__why">{row.payment_failed_reason ?? 'لم يتم تسجيل سبب للرفض.'}</p>

                  <div className="hrp-pay__f-act">
                    <span className="hrl-row__meta">
                      المستحق في السجل <span dir="ltr">{money(row.payable_balance) ?? '—'}</span> ر.س
                    </span>
                    {canPay && (
                      <button
                        type="button"
                        className="hr-btn hr-btn--sm"
                        disabled={busy || reference.trim().length < 2}
                        onClick={() => void confirmPicked([row.line_id])}
                      >
                        <RefreshCw size={12} /> أكد وصوله بمرجع جديد
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <p className="hrl-hint">
              لا يوجد زر «إلغاء الدفعة» في هذه الشاشة. الدفعة المؤكدة لا تلغى، والبديل تسجيل
              استرداد أو فتح مسير تصحيحي.
            </p>
          </div>
        </section>
      )}

      <section className="hrl-block" aria-labelledby="pay-h">
        <header className="hrl-block__h">
          <h2 className="hrl-block__t" id="pay-h">
            <Banknote size={14} /> الصرف
          </h2>
          <span className="hrl-badge hrl-badge--flat">
            وصل {data.counts.confirmed} من {data.lines.length}
          </span>
          {canPay && (
            <button
              type="button"
              className="hrl-block__a"
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  const result = await hrPayrollService.markPaymentsSent(data.run.id, {
                    method: 'bank_transfer',
                    reference: reference.trim() === '' ? undefined : reference.trim(),
                  });

                  return result.skipped.length === 0
                    ? `تم تسجيل إرسال ${result.sent} من التحويلات للبنك. ولم يتم صرف أي مبلغ بعد.`
                    : `تم إرسال ${result.sent}، ولم يتم إرسال ${result.skipped
                        .map((row) => `${row.name} (${SKIP_REASONS[row.reason] ?? row.reason})`)
                        .join('، ')}.`;
                })
              }
            >
              <Send size={12} /> سجل إرسال الملف للبنك
            </button>
          )}
        </header>

        {data.totals !== null && (
          <div className="hrl-block__b">
            <div className="hrl-formula">
              <span className="hrl-formula__term hrl-formula__term--static">
                <span className="hrl-formula__k">المصروف</span>
                <span className="hrl-formula__v" dir="ltr">
                  {money(data.totals.paid_amount)}
                </span>
              </span>
              <span className="hrl-formula__k">+</span>
              <span className="hrl-formula__term hrl-formula__term--static">
                <span className="hrl-formula__k">لم يصل بعد</span>
                <span className="hrl-formula__v" dir="ltr">
                  {money(data.totals.outstanding_amount)}
                </span>
              </span>
              <span className="hrl-formula__k">=</span>
              <span className="hrl-formula__term hrl-formula__term--sum">
                <span className="hrl-formula__k">صافي المسير</span>
                <span className="hrl-formula__v" dir="ltr">
                  {money(data.run.net_amount)}
                </span>
              </span>
            </div>

            <p className="hrl-hint">
              ينقص الرصيد في السجل عند تأكيد الصرف لا عند الاعتماد. ما لم يصل يبقى في ذمة
              المكتب ضمن سلسلة المستحقات، فلا يضيع أي مستحق بسبب فشل التحويل.
            </p>
          </div>
        )}

        {canPay && (
          <div className="hrl-block__b">
            <div className="hrp-pay__form">
              <label className="hrp-pay__l" htmlFor="pay-ref">
                مرجع الحوالة
              </label>
              <input
                id="pay-ref"
                className="hrl-ctrl"
                value={reference}
                maxLength={120}
                placeholder="رقم العملية في كشف البنك"
                onChange={(event) => setReference(event.target.value)}
              />

              <label className="hrp-pay__l" htmlFor="pay-on">
                تاريخ الصرف
              </label>
              <input
                id="pay-on"
                className="hrl-ctrl"
                type="date"
                value={paidOn}
                onChange={(event) => setPaidOn(event.target.value)}
              />

              <button
                type="button"
                className="hr-btn hr-btn--sm"
                disabled={busy || picked.length === 0 || reference.trim().length < 2}
                onClick={() => void confirmPicked(picked)}
              >
                {busy ? <Loader2 size={13} /> : <CheckCircle2 size={13} />} أكد وصول المحدد
                {picked.length === 0 ? '' : ` (${picked.length})`}
              </button>

              <button
                type="button"
                className="hr-btn hr-btn--sm"
                disabled={busy || open.length === 0 || reference.trim().length < 2}
                onClick={() => void confirmPicked(open.map((row) => row.line_id))}
              >
                أكد وصول الجميع
              </button>
            </div>

            <p className="hrl-hint">
              المرجع إلزامي ويسجل باسمك. الصرف بلا مرجع بنكي لا يمكن مطابقته بكشف الحساب.
            </p>
          </div>
        )}

        {error !== null && (
          <div className="hrl-block__b">
            <p className="hrl-flag__t">
              <XCircle size={13} /> {error}
            </p>
          </div>
        )}

        {note !== null && (
          <div className="hrl-block__b">
            <p className="hrl-hint">{note}</p>
          </div>
        )}

        <div className="hrl-block__b hrl-block__b--flush">
          <table className="hrl-table hrp-roster">
            <thead>
              <tr>
                <th scope="col">الموظف</th>
                <th scope="col">الصافي</th>
                <th scope="col">الحساب</th>
                <th scope="col">حالة التحويل</th>
                <th scope="col">المستحق في السجل</th>
                <th scope="col">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((row) => (
                <Row
                  key={row.line_id}
                  row={row}
                  selected={row.line_id === selectedLineId}
                  canPay={canPay}
                  busy={busy}
                  picked={picked.includes(row.line_id)}
                  onPick={() =>
                    setPicked((prev) =>
                      prev.includes(row.line_id) ? prev.filter((id) => id !== row.line_id) : [...prev, row.line_id]
                    )
                  }
                  onSelect={() => onSelect(row.line_id)}
                  onFail={() => {
                    setFailFor(row.line_id);
                    setFailReason('');
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>

        {failFor !== null && (
          <div className="hrl-block__b">
            <div className="hrp-pay__form">
              <label className="hrp-pay__l" htmlFor="fail-why">
                لماذا لم يصل؟
              </label>
              <input
                id="fail-why"
                className="hrl-ctrl"
                value={failReason}
                maxLength={255}
                placeholder="انسخ نص رفض البنك كما ورد"
                onChange={(event) => setFailReason(event.target.value)}
              />

              <button
                type="button"
                className="hr-btn hr-btn--sm"
                disabled={busy || failReason.trim().length < 5}
                onClick={() =>
                  void act(async () => {
                    await hrPayrollService.failPayment(data.run.id, {
                      line_id: failFor,
                      reason: failReason.trim(),
                    });
                    setFailFor(null);
                    setFailReason('');

                    return 'تم تسجيل الفشل. يبقى المبلغ ضمن المستحقات ويظهر ضمن التحويلات التي لم تصل أعلى الشاشة.';
                  })
                }
              >
                سجل الفشل
              </button>

              <button type="button" className="hr-btn hr-btn--sm" disabled={busy} onClick={() => setFailFor(null)}>
                تراجع
              </button>
            </div>
          </div>
        )}

        {data.run.posting_state === 'accounting_off' && (
          <div className="hrl-block__b">
            <p className="hrl-hint">لم يتم قيد هذا المسير في المحاسبة. محاسبة المكتب غير مفعلة.</p>
          </div>
        )}
      </section>
    </>
  );
};

const Row: React.FC<{
  row: PayrollPaymentLine;
  selected: boolean;
  canPay: boolean;
  busy: boolean;
  picked: boolean;
  onPick: () => void;
  onSelect: () => void;
  onFail: () => void;
}> = ({ row, selected, canPay, busy, picked, onPick, onSelect, onFail }) => {
  const confirmed = row.payment_state === 'confirmed';

  return (
    <tr className={selected ? 'hrl-row--ok' : undefined}>
      <th scope="row">
        <button type="button" className="hrl-link" onClick={onSelect}>
          {row.name}
        </button>
        {row.sweep_of_line_id !== null && (
          <span className="hrl-row__meta">محمول من مسير سابق لم يصل فيه تحويله</span>
        )}
      </th>
      <td dir="ltr">{money(row.net_amount) ?? '—'}</td>
      <td>
        {/* 🔴 الآيبانُ يصل مقنَّعاً من الخادم — والقناعُ ليس تنسيقَ عرضٍ يُكشَف بأدوات المطوّر. */}
        <span dir="ltr">{row.iban_masked ?? '—'}</span>
        {row.bank_name !== null && <span className="hrl-row__meta">{row.bank_name}</span>}
      </td>
      <td>
        {STATE_LABELS[row.payment_state]}
        {row.payment_state === 'failed' && row.payment_failed_reason !== null && (
          <span className="hrl-row__meta">{row.payment_failed_reason}</span>
        )}
      </td>
      <td dir="ltr">{money(row.payable_balance) ?? '—'}</td>
      <td>
        {canPay && ! confirmed && (
          <span className="hrp-pay__acts">
            <label className="hrp-pay__pick">
              <input type="checkbox" checked={picked} disabled={busy} onChange={onPick} />
              للتأكيد
            </label>
            <button type="button" className="hrl-link" disabled={busy} onClick={onFail}>
              لم يصل
            </button>
          </span>
        )}
        {confirmed && <span className="hrl-row__meta">مصروف ولا يلغى</span>}
      </td>
    </tr>
  );
};

export default RunPayStage;
