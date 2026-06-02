// [P4·UX-05] تبويب المدفوعات — جدول مالي على DataTable + عرض تفصيلي لدفعة + تأكيد/رفض/استرداد.
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Eye, CheckCircle, XCircle, RefreshCw, ExternalLink, CreditCard, Banknote, Wallet, Timer } from 'lucide-react';
import { paymentService } from '../../../services/paymentService';
import { DataTable, StatusBadge, FilterBar, ActionMenu, Pagination, Modal } from '../../../components/erp';
import type { Column } from '../../../components/erp';
import StatCard, { StatCardGrid } from '../../../components/erp/StatCard';
import PaymentDetailModal from '../../../components/finance/PaymentDetailModal';
import { formatSAR, toNumber } from '../../../utils/money';
import { paymentActions, PAYMENT_STATUS, PAYMENT_METHOD_LABELS } from '../../../config/financeStatusConfig';
import { invalidateFinance } from '../../../utils/financeCache';
import type { Payment, PaymentStatus, PaymentMethod } from '../../../types/billing';

const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  ...Object.entries(PAYMENT_STATUS).map(([value, meta]) => ({ value, label: meta.label })),
];
const METHOD_OPTIONS = [
  { value: '', label: 'كل الطرق' },
  ...Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label })),
];

const PaymentsTab: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['finance', 'payments', { search, status, method, page }],
    queryFn: () => paymentService.getPayments({
      search: search || undefined,
      status: (status || undefined) as PaymentStatus | undefined,
      payment_method: (method || undefined) as PaymentMethod | undefined,
      page,
      per_page: 15,
    }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['finance', 'paymentStats'],
    queryFn: () => paymentService.getStats(),
  });

  const payments = data?.data?.data ?? [];
  const total = data?.data?.total ?? 0;
  const lastPage = data?.data?.last_page ?? 1;
  const stats = statsData?.data;

  const invalidate = () => invalidateFinance(queryClient);

  const confirmMutation = useMutation({
    mutationFn: (id: number) => paymentService.confirmPayment(id),
    onSuccess: () => { toast.success('تم تأكيد الدفعة'); invalidate(); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر تأكيد الدفعة'),
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => paymentService.rejectPayment(id, reason),
    onSuccess: () => { toast.success('تم رفض الدفعة'); invalidate(); setRejectTarget(null); setRejectReason(''); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر رفض الدفعة'),
  });
  const refundMutation = useMutation({
    mutationFn: ({ id, reason, amount }: { id: number; reason?: string; amount?: number }) => paymentService.refundPayment(id, reason, amount),
    onSuccess: () => { toast.success('تم استرداد الدفعة'); invalidate(); setRefundTarget(null); setRefundReason(''); setRefundAmount(''); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر استرداد الدفعة'),
  });

  const columns = useMemo<Column<Payment>[]>(() => [
    { key: 'number', header: 'الدفعة', render: (p) => <span className="fin-docnum">{p.payment_number}</span> },
    {
      key: 'invoice',
      header: 'الفاتورة',
      render: (p) => (p.invoice ? (
        <button
          type="button"
          className="fin-btn fin-btn--ghost fin-btn--sm"
          onClick={(e) => { e.stopPropagation(); navigate(`/finance/invoices/${p.invoice?.id}`); }}
        >
          {p.invoice.invoice_number} <ExternalLink size={12} />
        </button>
      ) : <span className="fin-cell-muted">—</span>),
    },
    { key: 'client', header: 'العميل', render: (p) => p.client?.name ?? '—' },
    { key: 'amount', header: 'المبلغ', numeric: true, align: 'end', render: (p) => <span className="fin-cell-strong">{formatSAR(p.amount)}</span> },
    {
      key: 'method',
      header: 'الطريقة',
      render: (p) => (
        <div>
          {PAYMENT_METHOD_LABELS[p.payment_method] ?? p.payment_method}
          {p.bank_name && <div className="fin-cell-muted">{p.bank_name}</div>}
        </div>
      ),
    },
    { key: 'date', header: 'التاريخ', render: (p) => <span className="fin-cell-muted">{p.payment_date?.split('T')[0]}</span> },
    { key: 'status', header: 'الحالة', align: 'center', render: (p) => <StatusBadge kind="payment" status={p.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'center',
      render: (p) => {
        const a = paymentActions(p.status);
        return (
          <ActionMenu
            items={[
              { label: 'عرض التفاصيل', icon: Eye, onClick: () => setDetailId(p.id) },
              { label: 'تأكيد', icon: CheckCircle, variant: 'success', onClick: () => confirmMutation.mutate(p.id), hidden: !a.canConfirm },
              { label: 'رفض', icon: XCircle, variant: 'danger', onClick: () => setRejectTarget(p), hidden: !a.canReject },
              { label: 'استرداد', icon: RefreshCw, variant: 'warning', onClick: () => { setRefundTarget(p); setRefundAmount(String(toNumber(p.amount))); }, hidden: !a.canRefund },
              ...(p.receipt_url ? [{ label: 'عرض الإيصال', icon: ExternalLink, onClick: () => window.open(p.receipt_url, '_blank') }] : []),
            ]}
          />
        );
      },
    },
  ], [navigate, confirmMutation]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* كروت إحصائية علوية سريعة للمدفوعات */}
      {stats && (
        <StatCardGrid>
          <StatCard icon={CreditCard} tone="neutral" value={`${stats.total_count} دفعات`} label="إجمالي الدفعات المسجلة" />
          <StatCard icon={Banknote} tone="success" value={formatSAR(stats.total_confirmed)} label="المبالغ المؤكدة" />
          <StatCard icon={CheckCircle} tone="info" value={`${stats.confirmed_count} دفعة`} label="دفعات تم تأكيدها" />
          <StatCard icon={Timer} tone="warning" value={`${stats.pending_count} دفعات`} label="دفعات معلّقة للمراجعة" />
        </StatCardGrid>
      )}

      <div>

      <FilterBar
        search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: 'بحث برقم الدفعة أو المرجع...' }}
        selects={[
          { value: status, onChange: (v) => { setStatus(v); setPage(1); }, options: STATUS_OPTIONS, ariaLabel: 'فلترة الحالة' },
          { value: method, onChange: (v) => { setMethod(v); setPage(1); }, options: METHOD_OPTIONS, ariaLabel: 'فلترة الطريقة' },
        ]}
      />

      <DataTable<Payment>
        columns={columns}
        data={payments}
        rowKey={(p) => p.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        onRowClick={(p) => setDetailId(p.id)}
        emptyIcon={CreditCard}
        emptyTitle="لا توجد مدفوعات"
        emptyDesc="لم يُعثر على مدفوعات مطابقة."
        footer={<Pagination page={page} lastPage={lastPage} total={total} onChange={setPage} />}
      />

      <PaymentDetailModal paymentId={detailId} onClose={() => setDetailId(null)} />

      {/* مودال الرفض */}
      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="رفض الدفعة"
        icon={XCircle}
        size="narrow"
        footer={(
          <>
            <button type="button" className="fin-btn" onClick={() => setRejectTarget(null)}>تراجع</button>
            <button
              type="button"
              className="fin-btn fin-btn--danger"
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              onClick={() => rejectTarget && rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason })}
            >
              {rejectMutation.isPending ? 'جارٍ الرفض...' : 'تأكيد الرفض'}
            </button>
          </>
        )}
      >
        <div className="fin-field">
          <label className="fin-field__label">سبب الرفض<span className="req">*</span></label>
          <textarea className="fin-textarea" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
        </div>
      </Modal>

      {/* مودال الاسترداد (جزئي/كامل) */}
      <Modal
        open={!!refundTarget}
        onClose={() => setRefundTarget(null)}
        title="استرداد الدفعة"
        icon={RefreshCw}
        size="narrow"
        footer={(
          <>
            <button type="button" className="fin-btn" onClick={() => setRefundTarget(null)}>تراجع</button>
            <button
              type="button"
              className="fin-btn fin-btn--danger"
              disabled={refundMutation.isPending}
              onClick={() => refundTarget && refundMutation.mutate({ id: refundTarget.id, reason: refundReason || undefined, amount: refundAmount ? toNumber(refundAmount) : undefined })}
            >
              {refundMutation.isPending ? 'جارٍ الاسترداد...' : 'تأكيد الاسترداد'}
            </button>
          </>
        )}
      >
        <div className="fin-grid fin-grid--2">
          <div className="fin-field">
            <label className="fin-field__label">المبلغ المسترد (فارغ = كامل الدفعة)</label>
            <input
              className="fin-input"
              type="number"
              step="0.01"
              min="0.01"
              max={refundTarget ? toNumber(refundTarget.amount) : undefined}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
            />
          </div>
          <div className="fin-field fin-grid__full">
            <label className="fin-field__label">سبب الاسترداد</label>
            <textarea className="fin-textarea" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} rows={3} />
          </div>
        </div>
      </Modal>
      </div>
    </div>
  );
};

export default PaymentsTab;
