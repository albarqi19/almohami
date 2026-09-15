// [INV-P2] إشعار دائن/مدين على فاتورة صادرة — لكل المكاتب (المربوط بالهيئة يمر بمسارها تلقائياً).
import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { FileMinus, FilePlus } from 'lucide-react';
import { Modal } from '../erp';
import { invoiceService } from '../../services/invoiceService';
import { invalidateFinance } from '../../utils/financeCache';
import { formatSAR, toNumber } from '../../utils/money';
import type { CaseInvoice, IssueNotePayload } from '../../types/billing';

interface Props {
  open: boolean;
  invoice: CaseInvoice;
  kind: 'credit' | 'debit';
  onClose: () => void;
  onIssued?: (note: CaseInvoice) => void;
}

const InvoiceNoteModal: React.FC<Props> = ({ open, invoice, kind, onClose, onIssued }) => {
  const queryClient = useQueryClient();
  const isCredit = kind === 'credit';
  const title = isCredit ? 'إشعار دائن' : 'إشعار مدين';

  const [mode, setMode] = useState<'full' | 'amount'>(isCredit ? 'full' : 'amount');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [touched, setTouched] = useState(false);

  const vatRate = toNumber(invoice.vat_rate);
  const total = toNumber(invoice.total_amount);
  const credited = toNumber(invoice.credited_amount ?? 0);
  const creditable = Math.max(0, total - credited);

  const base = mode === 'full' ? (vatRate > 0 ? creditable / (1 + vatRate / 100) : creditable) : (Number(amount) || 0);
  const vat = base * vatRate / 100;
  const noteTotal = mode === 'full' ? creditable : base + vat;

  const reasonError = useMemo(() => {
    const len = reason.trim().length;
    if (len === 0) return 'السبب مطلوب';
    if (len < 3) return 'السبب 3 أحرف على الأقل';
    if (len > 500) return 'السبب 500 حرف كحد أقصى';
    return null;
  }, [reason]);
  const amountError = useMemo(() => {
    if (mode === 'full') return null;
    if (!(Number(amount) > 0)) return 'أدخل المبلغ قبل الضريبة';
    if (isCredit && noteTotal > creditable + 0.005) return `أكبر مما بقي من الفاتورة (${formatSAR(creditable)})`;
    return null;
  }, [mode, amount, isCredit, noteTotal, creditable]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload: IssueNotePayload = { reason: reason.trim(), mode: mode === 'full' ? 'full' : (isCredit ? 'amount' : 'items') };
      if (mode === 'amount') {
        if (isCredit) payload.amount = Number(amount);
        else payload.line_items = [{ description: description.trim() || `إضافة على الفاتورة ${invoice.invoice_number}`, quantity: 1, unit_price: Number(amount) }];
      }
      return invoiceService.issueNote(invoice.id, kind, payload);
    },
    onSuccess: (res) => {
      toast.success(res.message || `تم إصدار ${title}`);
      invalidateFinance(queryClient);
      queryClient.invalidateQueries({ queryKey: ['zatca-invoices'] });
      onIssued?.(res.data);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || `تعذّر إصدار ${title}`),
  });

  const submit = () => {
    setTouched(true);
    if (reasonError || amountError) return;
    mutation.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${title} على الفاتورة ${invoice.invoice_number}`}
      icon={isCredit ? FileMinus : FilePlus}
      size="narrow"
      footer={(
        <>
          <button type="button" className="fin-btn" onClick={onClose}>تراجع</button>
          <button type="button" className={`fin-btn ${isCredit ? 'fin-btn--danger' : 'fin-btn--primary'}`} disabled={mutation.isPending} onClick={submit}>
            {mutation.isPending ? 'جارٍ الإصدار...' : `إصدار ${title}`}
          </button>
        </>
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.7 }}>
          {isCredit
            ? 'الإشعار الدائن يخفض ما على العميل من هذه الفاتورة ويصدر مستنداً برقمه الخاص. الفاتورة نفسها لا تتغير.'
            : 'الإشعار المدين يضيف مبلغاً على العميل مرتبطاً بهذه الفاتورة ويُحصَّل كفاتورة.'}
        </p>

        {isCredit && (
          <div className="fin-field">
            <label className="fin-field__label">قيمة الإشعار</label>
            <select className="fin-select" value={mode} onChange={(e) => setMode(e.target.value as 'full' | 'amount')}>
              <option value="full">كل ما بقي من الفاتورة ({formatSAR(creditable)})</option>
              <option value="amount">مبلغ محدد قبل الضريبة</option>
            </select>
          </div>
        )}

        {mode === 'amount' && (
          <>
            {!isCredit && (
              <div className="fin-field">
                <label className="fin-field__label">البيان</label>
                <input type="text" className="fin-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="مثلاً: أتعاب جلسة إضافية" maxLength={500} />
              </div>
            )}
            <div className="fin-field">
              <label className="fin-field__label">المبلغ قبل الضريبة (ر.س)</label>
              <input type="number" className="fin-input" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              {touched && amountError && <span className="fin-field__error">{amountError}</span>}
            </div>
          </>
        )}

        <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <span>قبل الضريبة: <b>{formatSAR(base)}</b></span>
          {vatRate > 0 && <span>الضريبة ({vatRate}%): <b>{formatSAR(vat)}</b></span>}
          <span>الإجمالي: <b>{formatSAR(noteTotal)}</b></span>
        </div>

        <div className="fin-field">
          <label className="fin-field__label">سبب الإشعار</label>
          <textarea className="fin-textarea" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} onBlur={() => setTouched(true)} placeholder="يُطبع على الإشعار ويُرسل للهيئة إن كان المكتب مربوطاً" maxLength={600} />
          {touched && reasonError && <span className="fin-field__error">{reasonError}</span>}
        </div>
      </div>
    </Modal>
  );
};

export default InvoiceNoteModal;
