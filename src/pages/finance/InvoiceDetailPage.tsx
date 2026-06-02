// [P4·UX-04] صفحة فاتورة واحدة كثيفة (ERP) — النمط الضريبي (ملحق أ) + فصل «تفعيل» عن «إرسال» (INV-2.4)
// + أزرار حسب الحالة المسموحة بالباك (INV-2.5) + ZATCA شرطي عند التفعيل فقط.
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  ArrowRight, Receipt, Download, Send, XCircle, CreditCard, CheckCircle, FileText, User, Calendar, X,
} from 'lucide-react';
import { invoiceService } from '../../services/invoiceService';
import { paymentService } from '../../services/paymentService';
import { Modal, StatusBadge } from '../../components/erp';
import { LoadingState, ErrorState } from '../../components/erp/States';
import PaymentModal from '../../components/billing/PaymentModal';
import { formatSAR, formatPercent, toNumber } from '../../utils/money';
import { formatDueLabel } from '../../utils/dueDays';
import { invalidateFinance } from '../../utils/financeCache';
import { ToneBadge } from '../../components/erp/StatusBadge';
import { invoiceActions, PAYMENT_METHOD_LABELS } from '../../config/financeStatusConfig';
import { usePermissionContext } from '../../contexts/PermissionContext';
import { FINANCE_PERMISSIONS } from '../../config/financeModule';
import { useZatcaFeature } from '../../contexts/ZatcaStatusContext';
import ZatcaStatusBadge from '../../components/zatca/ZatcaStatusBadge';
import ZatcaInvoiceActions from '../../components/zatca/ZatcaInvoiceActions';
import { ZatcaResponsePanel } from '../../components/zatca/ZatcaResponsePanel';
import type { CreatePaymentData } from '../../types/billing';

// صف قائمة تعريفات مضغوط (label ↔ value) للعمود الجانبي.
const Def: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="fin-defrow"><span className="fin-defrow__label">{label}</span><span className="fin-defrow__value">{children}</span></div>
);

const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { has } = usePermissionContext();
  const { enabled: zatcaEnabled } = useZatcaFeature();
  const canManage = has(FINANCE_PERMISSIONS.invoicesManage);

  const [showPayment, setShowPayment] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const invoiceId = Number(id);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['finance', 'invoice', id],
    queryFn: () => invoiceService.getInvoice(invoiceId),
    enabled: !!id,
    // تحديث دوري أثناء معالجة ZATCA.
    refetchInterval: (q) => {
      const st = (q.state.data as { data?: { zatca_status?: string } } | undefined)?.data?.zatca_status;
      return st && ['queued', 'submitting', 'pending'].includes(st) ? 5000 : false;
    },
  });

  const invoice = data?.data;
  const invalidate = () => invalidateFinance(queryClient);

  const activateMutation = useMutation({
    mutationFn: () => invoiceService.updateInvoice(invoiceId, { status: 'pending' }),
    onSuccess: () => { toast.success('تم اعتماد الفاتورة — يمكنك الآن تسجيل المدفوعات'); invalidate(); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر اعتماد الفاتورة'),
  });
  const sendMutation = useMutation({
    mutationFn: (method: 'email' | 'whatsapp') => invoiceService.sendInvoice(invoiceId, method),
    onSuccess: (res) => { toast.success(res.message || 'تم إرسال الفاتورة'); invalidate(); setShowSend(false); },
    onError: (e: Error) => { toast.info(e.message || 'ميزة الإرسال قيد التطوير'); setShowSend(false); },
  });
  const cancelMutation = useMutation({
    mutationFn: () => invoiceService.cancelInvoice(invoiceId, cancelReason),
    onSuccess: () => { toast.success('تم إلغاء الفاتورة'); invalidate(); setShowCancel(false); setCancelReason(''); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر إلغاء الفاتورة'),
  });

  const handleSubmitPayment = async (payload: CreatePaymentData, receiptFile?: File) => {
    try {
      const res = await paymentService.createPayment(payload);
      if (receiptFile && res.data?.id) {
        await paymentService.uploadReceipt(res.data.id, receiptFile).catch(() => toast.error('تعذّر رفع الإيصال'));
      }
      toast.success('تم تسجيل الدفعة');
      invalidate();
      setShowPayment(false);
    } catch (e) {
      toast.error((e as Error).message || 'تعذّر تسجيل الدفعة');
      throw e; // أبقِ المودال مفتوحاً ليصحّح المستخدم
    }
  };

  if (isLoading) return <LoadingState />;
  if (isError || !invoice) return <ErrorState onRetry={() => refetch()} title="تعذّر تحميل الفاتورة" />;

  const a = invoiceActions(invoice.status);
  // النمط الضريبي (ملحق أ): العنوان حسب is_tax_invoice (الطبيعة الضريبية المُجمَّدة)، لا مثبّت.
  const docTitle = invoice.is_tax_invoice ? 'فاتورة ضريبية' : 'فاتورة';
  const dueLabel = formatDueLabel(invoice.due_date);
  const hasVat = toNumber(invoice.vat_amount) > 0;

  return (
    <div className="fin-detail">
      <div className="fin-detail-header">
        <div className="fin-detail-header__main">
          <button type="button" className="fin-btn fin-btn--ghost fin-btn--icon" onClick={() => navigate('/finance/invoices')} aria-label="رجوع"><ArrowRight size={18} /></button>
          <Receipt size={20} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="fin-docnum">{invoice.invoice_number}</span>
              <StatusBadge kind="invoice" status={invoice.status} size="lg" />
              {zatcaEnabled && invoice.zatca_status && <ZatcaStatusBadge status={invoice.zatca_status} />}
            </div>
            <div className="fin-cell-muted" style={{ marginTop: 2 }}>{docTitle}</div>
          </div>
        </div>
        <div className="fin-detail-header__actions">
          <button type="button" className="fin-btn fin-btn--sm" onClick={() => invoiceService.downloadPdf(invoice.id, invoice.invoice_number).catch(() => toast.error('تعذّر تحميل PDF'))}><Download size={14} /> PDF</button>
          {canManage && a.canActivate && (
            <button type="button" className="fin-btn fin-btn--sm" disabled={activateMutation.isPending} onClick={() => activateMutation.mutate()}><CheckCircle size={14} /> تفعيل/اعتماد</button>
          )}
          {canManage && a.canSend && (
            <button type="button" className="fin-btn fin-btn--sm" onClick={() => setShowSend(true)}><Send size={14} /> إرسال</button>
          )}
          {canManage && a.canRecordPayment && (
            <button type="button" className="fin-btn fin-btn--primary fin-btn--sm" onClick={() => setShowPayment(true)}><CreditCard size={14} /> تسجيل دفعة</button>
          )}
          {canManage && a.canCancel && (
            <button type="button" className="fin-btn fin-btn--danger fin-btn--sm" onClick={() => setShowCancel(true)}><XCircle size={14} /> إلغاء</button>
          )}
        </div>
      </div>

      {/* بطاقات مالية */}
      <div className="fin-cards">
        <div className="fin-card"><div className="fin-card__icon fin-card__icon--neutral"><Receipt size={18} /></div><div className="fin-card__body"><div className="fin-card__value">{formatSAR(invoice.total_amount)}</div><div className="fin-card__label">الإجمالي</div></div></div>
        <div className="fin-card"><div className="fin-card__icon fin-card__icon--success"><CheckCircle size={18} /></div><div className="fin-card__body"><div className="fin-card__value fin-card__value--success">{formatSAR(invoice.paid_amount)}</div><div className="fin-card__label">المدفوع</div></div></div>
        <div className="fin-card"><div className="fin-card__icon fin-card__icon--warning"><CreditCard size={18} /></div><div className="fin-card__body"><div className="fin-card__value fin-card__value--warning">{formatSAR(invoice.remaining_amount)}</div><div className="fin-card__label">المتبقّي</div></div></div>
        {hasVat && <div className="fin-card"><div className="fin-card__icon fin-card__icon--info"><FileText size={18} /></div><div className="fin-card__body"><div className="fin-card__value fin-card__value--info">{formatSAR(invoice.vat_amount)}</div><div className="fin-card__label">الضريبة ({formatPercent(invoice.vat_rate)})</div></div></div>}
      </div>

      {/* تخطيط عمودين: رئيسي (الدفعات + ZATCA) + جانبي (معلومات الفاتورة) */}
      <div className="fin-detail-grid">
        <div className="fin-detail-main">
          {/* الدفعات */}
          <div className="fin-section">
            <div className="fin-section__head"><span className="fin-section__title"><CreditCard size={15} /> الدفعات ({invoice.payments?.length ?? 0})</span></div>
            <div className="fin-section__body">
              {invoice.payments && invoice.payments.length > 0 ? invoice.payments.map((p) => (
                <div key={p.id} className="fin-line">
                  <div className="fin-line__main">
                    <span className="fin-docnum">{p.payment_number}</span>
                    <span className="fin-line__sub">{PAYMENT_METHOD_LABELS[p.payment_method] ?? p.payment_method} · {p.payment_date?.split('T')[0]}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <StatusBadge kind="payment" status={p.status} />
                    <span className="fin-line__amount">{formatSAR(p.amount)}</span>
                  </div>
                </div>
              )) : <div className="fin-cell-muted">لا توجد دفعات مسجّلة.</div>}
            </div>
          </div>

          {/* ZATCA — يظهر فقط عند تفعيل الميزة (لا يغيّر الطبيعة الضريبية) */}
          {zatcaEnabled && invoice.zatca_status && (
            <div className="fin-section">
              <div className="fin-section__head">
                <span className="fin-section__title"><FileText size={15} /> الفوترة الإلكترونية (ZATCA)</span>
                <ZatcaInvoiceActions invoice={invoice} allowSubmit />
              </div>
              <div className="fin-section__body">
                <ZatcaResponsePanel response={invoice.zatca_response} warnings={invoice.zatca_warnings} />
              </div>
            </div>
          )}
        </div>

        <div className="fin-detail-side">
          {/* معلومات الفاتورة — قائمة تعريفات مضغوطة */}
          <div className="fin-section">
            <div className="fin-section__head"><span className="fin-section__title"><FileText size={15} /> معلومات الفاتورة</span></div>
            <div className="fin-section__body">
              <div className="fin-deflist">
                <Def label="العنوان">{invoice.title}</Def>
                <Def label="العميل"><span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><User size={13} /> {invoice.client?.name ?? '—'}</span></Def>
                {invoice.contract && (
                  <Def label="العقد">
                    <button type="button" className="fin-btn fin-btn--ghost fin-btn--sm" style={{ padding: '2px 6px' }} onClick={() => navigate(`/finance/contracts/${invoice.contract?.id}`)}>
                      {invoice.contract.contract_number}
                    </button>
                  </Def>
                )}
                <Def label="تاريخ الإصدار">{invoice.invoice_date?.split('T')[0] ?? '—'}</Def>
                <Def label="الاستحقاق">
                  <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    {invoice.due_date?.split('T')[0]} {dueLabel && <ToneBadge tone={dueLabel.tone}>{dueLabel.text}</ToneBadge>}
                  </span>
                </Def>
                {invoice.reference && <Def label="المرجع">{invoice.reference}</Def>}
                <Def label="قبل الضريبة">{formatSAR(invoice.subtotal)}</Def>
                {toNumber(invoice.discount) > 0 && <Def label="الخصم">{formatSAR(invoice.discount)}</Def>}
              </div>
              {invoice.notes && <div style={{ marginTop: 10, fontSize: 13, color: 'var(--color-text-secondary)' }}>{invoice.notes}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* مودال تسجيل دفعة */}
      {showPayment && (
        <PaymentModal isOpen={showPayment} invoice={invoice} onClose={() => setShowPayment(false)} onSubmit={handleSubmitPayment} />
      )}

      {/* مودال الإرسال */}
      <Modal
        open={showSend}
        onClose={() => setShowSend(false)}
        title="إرسال الفاتورة"
        icon={Send}
        size="narrow"
        footer={(
          <>
            <button type="button" className="fin-btn" onClick={() => setShowSend(false)}>إلغاء</button>
            <button type="button" className="fin-btn fin-btn--primary" disabled={sendMutation.isPending} onClick={() => sendMutation.mutate('email')}><Send size={14} /> بريد إلكتروني</button>
            <button type="button" className="fin-btn" disabled={sendMutation.isPending} onClick={() => sendMutation.mutate('whatsapp')}>واتساب</button>
          </>
        )}
      >
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>اختر قناة إرسال الفاتورة للعميل.</p>
      </Modal>

      {/* مودال الإلغاء */}
      <Modal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        title="إلغاء الفاتورة"
        icon={XCircle}
        size="narrow"
        footer={(
          <>
            <button type="button" className="fin-btn" onClick={() => setShowCancel(false)}>تراجع</button>
            <button type="button" className="fin-btn fin-btn--danger" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate()}>
              {cancelMutation.isPending ? 'جارٍ الإلغاء...' : 'تأكيد الإلغاء'}
            </button>
          </>
        )}
      >
        <div className="fin-field">
          <label className="fin-field__label">سبب الإلغاء (اختياري)</label>
          <textarea className="fin-textarea" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} />
        </div>
      </Modal>
    </div>
  );
};

export default InvoiceDetailPage;
