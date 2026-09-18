// [INV-P2] نافذة إصدار الفاتورة: تخرج من المسودة إلى فاتورة صادرة مقفلة.
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { CheckCircle } from 'lucide-react';
import { Modal } from '../erp';
import { invoiceService } from '../../services/invoiceService';
import { invalidateFinance } from '../../utils/financeCache';
import { useBillingSettings } from '../../hooks/useBillingSettings';
import { toDateInputValue } from '../../utils/dateAr';
import type { CaseInvoice } from '../../types/billing';

interface Props {
  open: boolean;
  invoice: CaseInvoice;
  onClose: () => void;
  onIssued?: (invoice: CaseInvoice) => void;
}

const IssueInvoiceModal: React.FC<Props> = ({ open, invoice, onClose, onIssued }) => {
  const queryClient = useQueryClient();
  const { isVatRegistered } = useBillingSettings(open);
  const [status, setStatus] = useState<'pending' | 'sent'>('pending');
  const [supplyDate, setSupplyDate] = useState<string>(
    (invoice.supply_date ?? invoice.invoice_date ?? '').split('T')[0] || toDateInputValue(new Date()),
  );

  const mutation = useMutation({
    mutationFn: () => invoiceService.issueInvoice(invoice.id, { status, supply_date: supplyDate || undefined }),
    onSuccess: (res) => {
      toast.success(res.message || 'تم إصدار الفاتورة');
      (res.warnings ?? []).forEach((w) => toast.warning(w, { autoClose: 12000 }));
      invalidateFinance(queryClient);
      onIssued?.(res.data);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || 'تعذّر إصدار الفاتورة'),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`إصدار الفاتورة ${invoice.invoice_number}`}
      icon={CheckCircle}
      size="narrow"
      footer={(
        <>
          <button type="button" className="fin-btn" onClick={onClose}>تراجع</button>
          <button type="button" className="fin-btn fin-btn--primary" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'جارٍ الإصدار...' : 'إصدار الفاتورة'}
          </button>
        </>
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.7 }}>
          بعد الإصدار تُقفل بيانات الفاتورة المالية وطرفاها وتواريخها. إن أردت تحصيل المبلغ قبل الإصدار فاطبع «مطالبة بالدفع» من المسودة وأصدر الفاتورة بعد السداد.
          {isVatRegistered
            ? ' تاريخ الفاتورة الضريبية سيكون اليوم، وأي تصحيح لاحق يكون بإشعار دائن أو مدين.'
            : ' للتصحيح لاحقاً: أصدر إشعاراً أو ألغِ الفاتورة وأصدر غيرها.'}
        </p>

        <div className="fin-field">
          <label className="fin-field__label">الحالة بعد الإصدار</label>
          <select className="fin-select" value={status} onChange={(e) => setStatus(e.target.value as 'pending' | 'sent')}>
            <option value="pending">بانتظار الدفع</option>
            <option value="sent">مُرسلة للعميل</option>
          </select>
        </div>

        {isVatRegistered && (
          <div className="fin-field">
            <label className="fin-field__label">تاريخ التوريد (تاريخ تقديم الخدمة)</label>
            <input type="date" className="fin-input" value={supplyDate} max={toDateInputValue(new Date())} onChange={(e) => setSupplyDate(e.target.value)} />
            <span style={{ fontSize: 11.5, color: 'var(--color-text-secondary)' }}>يُطبع على الفاتورة الضريبية حين يختلف عن تاريخ الإصدار.</span>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default IssueInvoiceModal;
