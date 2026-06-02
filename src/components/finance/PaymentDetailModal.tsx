// [P4·UX-05] عرض تفصيلي لدفعة — يجلب من GET /payments/{id} (لا يكتفي ببيانات الصف) + ربط الفاتورة.
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ExternalLink } from 'lucide-react';
import { paymentService } from '../../services/paymentService';
import { Modal, StatusBadge } from '../erp';
import { LoadingState, ErrorState } from '../erp/States';
import { formatSAR } from '../../utils/money';
import { PAYMENT_METHOD_LABELS } from '../../config/financeStatusConfig';

interface PaymentDetailModalProps {
  paymentId: number | null;
  onClose: () => void;
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="fin-kv">
    <span className="fin-kv__label">{label}</span>
    <span className="fin-kv__value">{children}</span>
  </div>
);

const PaymentDetailModal: React.FC<PaymentDetailModalProps> = ({ paymentId, onClose }) => {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['finance', 'payment', paymentId],
    queryFn: () => paymentService.getPayment(paymentId as number),
    enabled: !!paymentId,
  });

  const p = data?.data;

  return (
    <Modal open={!!paymentId} onClose={onClose} title="تفاصيل الدفعة" icon={CreditCard} size="wide">
      {isLoading && <LoadingState />}
      {!isLoading && isError && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !isError && p && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <span className="fin-docnum">{p.payment_number}</span>
            <StatusBadge kind="payment" status={p.status} size="lg" />
          </div>

          <div className="fin-kv-grid">
            <Field label="المبلغ">{formatSAR(p.amount)}</Field>
            <Field label="طريقة الدفع">{PAYMENT_METHOD_LABELS[p.payment_method] ?? p.payment_method}</Field>
            <Field label="تاريخ الدفع">{p.payment_date?.split('T')[0] ?? '—'}</Field>
            <Field label="العميل">{p.client?.name ?? '—'}</Field>
            {p.bank_name && <Field label="البنك">{p.bank_name}</Field>}
            {p.reference && <Field label="المرجع">{p.reference}</Field>}
            {p.check_number && <Field label="رقم الشيك">{p.check_number}</Field>}
            {p.transaction_id && <Field label="رقم العملية">{p.transaction_id}</Field>}
          </div>

          {p.invoice && (
            <div className="fin-section">
              <div className="fin-section__head">
                <span className="fin-section__title">الفاتورة المرتبطة</span>
                <button
                  type="button"
                  className="fin-btn fin-btn--sm"
                  onClick={() => { onClose(); navigate(`/finance/invoices/${p.invoice?.id}`); }}
                >
                  <ExternalLink size={14} /> فتح الفاتورة
                </button>
              </div>
              <div className="fin-section__body">
                <div className="fin-kv-grid">
                  <Field label="رقم الفاتورة"><span className="fin-docnum">{p.invoice.invoice_number}</span></Field>
                  <Field label="إجمالي الفاتورة">{formatSAR(p.invoice.total_amount)}</Field>
                  <Field label="المتبقّي">{formatSAR(p.invoice.remaining_amount)}</Field>
                </div>
              </div>
            </div>
          )}

          {(p.refund_amount ?? 0) > 0 && (
            <div className="fin-section">
              <div className="fin-section__head"><span className="fin-section__title">سجل الاسترداد</span></div>
              <div className="fin-section__body">
                <div className="fin-kv-grid">
                  <Field label="المبلغ المسترد">{formatSAR(p.refund_amount)}</Field>
                  {p.refunded_at && <Field label="تاريخ الاسترداد">{p.refunded_at.split('T')[0]}</Field>}
                  {p.refund_reason && <Field label="السبب">{p.refund_reason}</Field>}
                </div>
              </div>
            </div>
          )}

          {p.status === 'rejected' && p.rejection_reason && (
            <div className="fin-section">
              <div className="fin-section__head"><span className="fin-section__title">سبب الرفض</span></div>
              <div className="fin-section__body" style={{ fontSize: 13, color: 'var(--color-text)' }}>{p.rejection_reason}</div>
            </div>
          )}

          {(p.receipt_url || p.receipt_path) && (
            <a
              href={p.receipt_url ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="fin-btn fin-btn--sm"
              style={{ alignSelf: 'flex-start' }}
            >
              <ExternalLink size={14} /> عرض الإيصال
            </a>
          )}
        </div>
      )}
    </Modal>
  );
};

export default PaymentDetailModal;
